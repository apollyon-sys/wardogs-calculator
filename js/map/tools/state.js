/* =========================
   MAP TOOLS
   ========================= */

const MAP_TOOLS_STORAGE_KEY =
    'wardogs-map-tools';

const MAP_TOOLS_EXPORT_TYPE =
    'wardogs-map-changes';

const MAP_TOOLS_EXPORT_VERSION = 2;

const MAP_TOOLS_IMPORT_LIMITS = {
    drawings: 2000,
    zones: 1000,
    polygons: 1000,
    markers: 5000,
    pointsPerDrawing: 10000
};

const MAP_TOOL_COLORS = [
    { id: 'danger', color: '#d86666', titleKey: 'mapToolColorDanger' },
    { id: 'warning', color: '#d98b5f', titleKey: 'mapToolColorWarning' },
    { id: 'objective', color: '#d7a452', titleKey: 'mapToolColorObjective' },
    { id: 'friendly', color: '#82c596', titleKey: 'mapToolColorFriendly' },
    { id: 'base', color: '#5fa8d3', titleKey: 'mapToolColorBase' },
    { id: 'utility', color: '#67b7b0', titleKey: 'mapToolColorUtility' },
    { id: 'special', color: '#a889c9', titleKey: 'mapToolColorSpecial' },
    { id: 'neutral', color: '#aeb8bf', titleKey: 'mapToolColorNeutral' },
    { id: 'inactive', color: '#59636b', titleKey: 'mapToolColorInactive' }
];

const MAP_TOOL_STATE = {
    tool: null,
    pencilColor: '#d7a452',
    selectedMarkerIcon: null,

    rulerStart: null,
    rulerEnd: null,
    rulerDragging: false,

    pencilDragging: false,
    activePath: null,

    zoneStart: null,
    zoneEnd: null,
    zoneDragging: false,

    polygonDraft: null,
    polygonHover: null,

    drawings: [],
    zones: [],
    polygons: [],
    markers: [],

    hoverPathId: null,
    hoverDeletePoint: null,
    hoverShapeType: null,
    hoverShapeId: null,
    hoverMarkerId: null,

    searchPoint: null,

    undoStack: [],
    redoStack: [],

    layers: {
        tiles: true,
        /*
         * Off by default: the contour lines are a separate few-hundred-KB
         * download, only made when somebody actually asks for them.
         */
        contours: false,
        grid: true,
        zones: true,
        polygons: true,
        presetMarkers: true,
        drawings: true,
        userMarkers: true,
        artillery: true,
        cursorCoords: true
    }
};

function mapToolId() {
    return (
        Date.now().toString(36) +
        '-' +
        Math.random().toString(36).slice(2, 9)
    );
}

function currentMapToolMapId() {
    return S.map || 'custom';
}

function snapshotMapToolContent() {
    return {
        mapId: currentMapToolMapId(),
        drawings: structuredClone(MAP_TOOL_STATE.drawings),
        zones: structuredClone(MAP_TOOL_STATE.zones),
        polygons: structuredClone(MAP_TOOL_STATE.polygons),
        markers: structuredClone(MAP_TOOL_STATE.markers),
        origin: structuredClone(S.origin),
        target: structuredClone(S.target),
        mode: S.mode
    };
}

function updateMapToolHistoryUI() {
    if (lobby?.active) { lobby.updateHistoryUI(); return; }
    const undoButton =
        $('mapToolUndoButton');

    const redoButton =
        $('mapToolRedoButton');

    if (undoButton) {
        undoButton.disabled =
            MAP_TOOL_STATE.undoStack.length === 0;
    }

    if (redoButton) {
        redoButton.disabled =
            MAP_TOOL_STATE.redoStack.length === 0;
    }
}

function restoreMapToolContent(snapshot) {
    if (!snapshot) {
        return;
    }

    MAP_TOOL_STATE.drawings =
        structuredClone(snapshot.drawings || []);

    MAP_TOOL_STATE.zones =
        structuredClone(snapshot.zones || []);

    MAP_TOOL_STATE.polygons =
        structuredClone(snapshot.polygons || []);

    MAP_TOOL_STATE.markers =
        structuredClone(snapshot.markers || []);

    if (
        snapshot.origin &&
        Number.isFinite(snapshot.origin.x) &&
        Number.isFinite(snapshot.origin.y)
    ) {
        S.origin = structuredClone(snapshot.origin);
        clamp(S.origin);
    }

    if (
        snapshot.target &&
        Number.isFinite(snapshot.target.x) &&
        Number.isFinite(snapshot.target.y)
    ) {
        S.target = structuredClone(snapshot.target);
        clamp(S.target);
    }

    if (
        snapshot.mode === 'origin' ||
        snapshot.mode === 'target'
    ) {
        S.mode = snapshot.mode;
    }

    $('originMode')?.classList.toggle(
        'active',
        S.mode === 'origin'
    );

    $('targetMode')?.classList.toggle(
        'active',
        S.mode === 'target'
    );

    MAP_TOOL_STATE.hoverPathId = null;
    MAP_TOOL_STATE.hoverDeletePoint = null;
    MAP_TOOL_STATE.hoverShapeType = null;
    MAP_TOOL_STATE.hoverShapeId = null;
    MAP_TOOL_STATE.hoverMarkerId = null;

    saveMapToolState();
    inputs();
    renderSavedTargets();
    updateMapToolHistoryUI();
}

function pushMapToolHistory() {
    if (lobby?.active) return;
    MAP_TOOL_STATE.undoStack.push(
        snapshotMapToolContent()
    );

    if (
        MAP_TOOL_STATE.undoStack.length > 100
    ) {
        MAP_TOOL_STATE.undoStack.shift();
    }

    MAP_TOOL_STATE.redoStack = [];
    updateMapToolHistoryUI();
}

function resetMapToolHistory() {
    MAP_TOOL_STATE.undoStack = [];
    MAP_TOOL_STATE.redoStack = [];
    updateMapToolHistoryUI();
}

function undoMapToolAction() {
    if (lobby?.active) return lobby.undo();
    if (!MAP_TOOL_STATE.undoStack.length) {
        return false;
    }

    MAP_TOOL_STATE.redoStack.push(
        snapshotMapToolContent()
    );

    restoreMapToolContent(
        MAP_TOOL_STATE.undoStack.pop()
    );

    return true;
}

function redoMapToolAction() {
    if (lobby?.active) return lobby.redo();
    if (!MAP_TOOL_STATE.redoStack.length) {
        return false;
    }

    MAP_TOOL_STATE.undoStack.push(
        snapshotMapToolContent()
    );

    restoreMapToolContent(
        MAP_TOOL_STATE.redoStack.pop()
    );

    return true;
}

function matchesConfiguredCombo(event, combo) {
    if (!combo) return false;
    const parts = String(combo).toLowerCase().split('+').map(part => part.trim());
    const key = parts.pop();
    return getKeyboardShortcutKey(event) === key &&
        event.ctrlKey === parts.includes('ctrl') &&
        event.metaKey === parts.includes('meta') &&
        event.altKey === parts.includes('alt') &&
        event.shiftKey === parts.includes('shift');
}

function saveMapToolState(state = MAP_TOOL_STATE) {
    if (lobby?.active) { lobby.capture(); return true; }
    try {
        localStorage.setItem(
            MAP_TOOLS_STORAGE_KEY,
            JSON.stringify({
                drawings: state.drawings,
                zones: state.zones,
                polygons: state.polygons,
                markers: state.markers,
                layers: state.layers
            })
        );
        return true;
    } catch (error) {
        console.warn(
            'Failed to save map tools state:',
            error
        );
        return false;
    }
}

function loadMapToolState() {
    try {
        const raw =
            localStorage.getItem(
                MAP_TOOLS_STORAGE_KEY
            );

        if (!raw) {
            return;
        }

        const parsed = normalizeImportedMapToolPayload(
            JSON.parse(raw)
        );

        MAP_TOOL_STATE.drawings = parsed.drawings;
        MAP_TOOL_STATE.zones = parsed.zones;
        MAP_TOOL_STATE.polygons = parsed.polygons;
        MAP_TOOL_STATE.markers = parsed.markers;

        if (parsed.layers) {
            MAP_TOOL_STATE.layers = {
                ...MAP_TOOL_STATE.layers,
                ...parsed.layers
            };
        }

    } catch (error) {
        console.warn(
            'Failed to load map tools state:',
            error
        );

        MAP_TOOL_STATE.drawings = [];
        MAP_TOOL_STATE.zones = [];
        MAP_TOOL_STATE.polygons = [];
        MAP_TOOL_STATE.markers = [];
    }
}

function setMapDataTransferStatus(
    key = null,
    isError = false
) {
    const status = $('mapDataTransferStatus');

    if (!status) {
        return;
    }

    status.textContent = key ? tr(key) : '';
    status.classList.toggle('error', Boolean(isError));
}

function createMapToolExportPayload() {
    return {
        type: MAP_TOOLS_EXPORT_TYPE,
        version: MAP_TOOLS_EXPORT_VERSION,
        exportedAt: new Date().toISOString(),
        data: {
            drawings: structuredClone(MAP_TOOL_STATE.drawings),
            zones: structuredClone(MAP_TOOL_STATE.zones),
            polygons: structuredClone(MAP_TOOL_STATE.polygons),
            markers: structuredClone(MAP_TOOL_STATE.markers),
            layers: structuredClone(MAP_TOOL_STATE.layers)
        }
    };
}

function exportMapToolChanges() {
    downloadWardogsJson(
        `wardogs-map-changes-${wardogsExportTimestamp()}.json`,
        createMapToolExportPayload()
    );

    setMapDataTransferStatus();

    if (typeof trackAnalytics === 'function') {
        trackAnalytics('map-changes-exported', {
            drawings: MAP_TOOL_STATE.drawings.length,
            zones: MAP_TOOL_STATE.zones.length,
            polygons: MAP_TOOL_STATE.polygons.length,
            markers: MAP_TOOL_STATE.markers.length
        });
    }
}

function importedMapId(value) {
    if (typeof value !== 'string' || !value.trim()) {
        return currentMapToolMapId();
    }

    return value.trim().slice(0, 64);
}

function normalizeImportedMapToolDrawing(drawing) {
    if (!drawing || typeof drawing !== 'object' || !Array.isArray(drawing.points)) {
        return null;
    }

    const points = drawing.points
        .slice(0, MAP_TOOLS_IMPORT_LIMITS.pointsPerDrawing)
        .filter(point =>
            point &&
            Number.isFinite(Number(point.x)) &&
            Number.isFinite(Number(point.y))
        )
        .map(point => ({
            x: Number(point.x),
            y: Number(point.y)
        }));

    if (points.length < 2) {
        return null;
    }

    const color =
        typeof drawing.color === 'string' &&
        /^#[0-9a-f]{6}$/i.test(drawing.color)
            ? drawing.color
            : '#d7a452';

    return {
        id: mapToolId(),
        mapId: importedMapId(drawing.mapId),
        color,
        points
    };
}

function normalizeImportedMapToolZone(zone) {
    if (
        !zone ||
        typeof zone !== 'object' ||
        !Number.isFinite(Number(zone.x)) ||
        !Number.isFinite(Number(zone.y)) ||
        !Number.isFinite(Number(zone.radius)) ||
        Number(zone.radius) <= 0
    ) {
        return null;
    }

    const color =
        typeof zone.color === 'string' &&
        /^#[0-9a-f]{6}$/i.test(zone.color)
            ? zone.color
            : '#d7a452';

    return {
        id: mapToolId(),
        mapId: importedMapId(zone.mapId),
        color,
        x: Number(zone.x),
        y: Number(zone.y),
        radius: Number(zone.radius)
    };
}

function normalizeImportedMapToolPolygon(polygon) {
    if (
        !polygon ||
        typeof polygon !== 'object' ||
        !Array.isArray(polygon.points)
    ) {
        return null;
    }

    const points = polygon.points
        .slice(0, MAP_TOOLS_IMPORT_LIMITS.pointsPerDrawing)
        .filter(point =>
            point &&
            Number.isFinite(Number(point.x)) &&
            Number.isFinite(Number(point.y))
        )
        .map(point => ({
            x: Number(point.x),
            y: Number(point.y)
        }));

    if (points.length < 3) {
        return null;
    }

    const color =
        typeof polygon.color === 'string' &&
        /^#[0-9a-f]{6}$/i.test(polygon.color)
            ? polygon.color
            : '#d7a452';

    return {
        id: mapToolId(),
        mapId: importedMapId(polygon.mapId),
        color,
        points
    };
}

function normalizeImportedMapToolMarker(marker) {
    if (
        !marker ||
        typeof marker !== 'object' ||
        typeof marker.icon !== 'string' ||
        !Number.isFinite(Number(marker.x)) ||
        !Number.isFinite(Number(marker.y))
    ) {
        return null;
    }

    const asset = getMarkerAsset(marker.icon);

    if (!asset || !asset.placeable) {
        return null;
    }

    return {
        id: mapToolId(),
        mapId: importedMapId(marker.mapId),
        icon: marker.icon,
        x: Number(marker.x),
        y: Number(marker.y)
    };
}

function normalizeImportedMapLayers(layers) {
    if (!layers || typeof layers !== 'object') {
        return null;
    }

    const normalized = {};

    Object.keys(MAP_TOOL_STATE.layers).forEach(key => {
        if (typeof layers[key] === 'boolean') {
            normalized[key] = layers[key];
        }
    });

    return Object.keys(normalized).length ? normalized : null;
}

function normalizeImportedMapToolPayload(payload) {
    if (!payload || typeof payload !== 'object') {
        throw new Error('Invalid map changes payload');
    }

    const source =
        payload.type === MAP_TOOLS_EXPORT_TYPE
            ? payload.data
            : payload.data && typeof payload.data === 'object'
                ? payload.data
                : payload;

    if (!source || typeof source !== 'object') {
        throw new Error('Invalid map changes payload');
    }

    const drawings = Array.isArray(source.drawings)
        ? source.drawings
            .slice(0, MAP_TOOLS_IMPORT_LIMITS.drawings)
            .map(normalizeImportedMapToolDrawing)
            .filter(Boolean)
        : [];

    const zones = Array.isArray(source.zones)
        ? source.zones
            .slice(0, MAP_TOOLS_IMPORT_LIMITS.zones)
            .map(normalizeImportedMapToolZone)
            .filter(Boolean)
        : [];

    const polygons = Array.isArray(source.polygons)
        ? source.polygons
            .slice(0, MAP_TOOLS_IMPORT_LIMITS.polygons)
            .map(normalizeImportedMapToolPolygon)
            .filter(Boolean)
        : [];

    const markers = Array.isArray(source.markers)
        ? source.markers
            .slice(0, MAP_TOOLS_IMPORT_LIMITS.markers)
            .map(normalizeImportedMapToolMarker)
            .filter(Boolean)
        : [];

    const layers = normalizeImportedMapLayers(source.layers);

    if (
        !drawings.length &&
        !zones.length &&
        !polygons.length &&
        !markers.length &&
        !layers
    ) {
        throw new Error('No supported map changes found');
    }

    return {
        drawings,
        zones,
        polygons,
        markers,
        layers
    };
}

function applyImportedMapToolChanges(imported) {
    const next = {
        drawings: [
            ...MAP_TOOL_STATE.drawings,
            ...imported.drawings
        ],
        zones: [
            ...MAP_TOOL_STATE.zones,
            ...imported.zones
        ],
        polygons: [
            ...MAP_TOOL_STATE.polygons,
            ...imported.polygons
        ],
        markers: [
            ...MAP_TOOL_STATE.markers,
            ...imported.markers
        ],
        layers: imported.layers
            ? {
                ...MAP_TOOL_STATE.layers,
                ...imported.layers
            }
            : MAP_TOOL_STATE.layers
    };

    for (const name of ['drawings', 'zones', 'polygons', 'markers']) {
        if (next[name].length > MAP_TOOLS_IMPORT_LIMITS[name]) {
            throw new Error(`Map tool ${name} limit exceeded`);
        }
    }

    const collaborative = lobby?.active === true;

    if (!collaborative && !saveMapToolState(next)) {
        throw new Error('Map changes could not be persisted');
    }

    if (
        imported.drawings.length ||
        imported.zones.length ||
        imported.polygons.length ||
        imported.markers.length
    ) {
        pushMapToolHistory();
    }

    MAP_TOOL_STATE.drawings = next.drawings;
    MAP_TOOL_STATE.zones = next.zones;
    MAP_TOOL_STATE.polygons = next.polygons;
    MAP_TOOL_STATE.markers = next.markers;
    MAP_TOOL_STATE.layers = next.layers;

    if (collaborative) {
        lobby.capture();
    }

    MAP_TOOL_STATE.hoverPathId = null;
    MAP_TOOL_STATE.hoverDeletePoint = null;
    MAP_TOOL_STATE.hoverShapeType = null;
    MAP_TOOL_STATE.hoverShapeId = null;
    MAP_TOOL_STATE.hoverMarkerId = null;

    buildMapLayers();
    updateMapToolsUI();
    draw();
}

async function importMapToolChanges() {
    try {
        const file = await selectWardogsJsonFile();

        if (!file) {
            return;
        }

        const payload = await readWardogsJsonFile(file);
        const imported = normalizeImportedMapToolPayload(payload);

        applyImportedMapToolChanges(imported);
        setMapDataTransferStatus('mapToolImportSuccess');

        if (typeof trackAnalytics === 'function') {
            trackAnalytics('map-changes-imported', {
                drawings: imported.drawings.length,
                zones: imported.zones.length,
                polygons: imported.polygons.length,
                markers: imported.markers.length,
                layers: Boolean(imported.layers)
            });
        }
    } catch (error) {
        console.warn('Failed to import map changes:', error);
        setMapDataTransferStatus('mapToolImportInvalid', true);
    }
}

function clearCurrentMapToolContent() {
    const mapId =
        currentMapToolMapId();

    const collections = [
        'drawings',
        'zones',
        'polygons',
        'markers'
    ];

    const hasContent =
        collections.some(
            name =>
                MAP_TOOL_STATE[name].some(
                    item =>
                        item.mapId === mapId
                )
        );

    if (!hasContent) {
        return false;
    }

    pushMapToolHistory();

    collections.forEach(name => {
        MAP_TOOL_STATE[name] =
            MAP_TOOL_STATE[name].filter(
                item =>
                    item.mapId !== mapId
            );
    });

    MAP_TOOL_STATE.hoverPathId = null;
    MAP_TOOL_STATE.hoverDeletePoint = null;
    MAP_TOOL_STATE.hoverShapeType = null;
    MAP_TOOL_STATE.hoverShapeId = null;
    MAP_TOOL_STATE.hoverMarkerId = null;

    saveMapToolState();
    updateMapToolsUI();
    draw();

    return true;
}
