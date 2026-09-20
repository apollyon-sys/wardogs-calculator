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

function saveMapToolState() {
    if (lobby?.active) { lobby.capture(); return; }
    try {
        localStorage.setItem(
            MAP_TOOLS_STORAGE_KEY,
            JSON.stringify({
                drawings: MAP_TOOL_STATE.drawings,
                zones: MAP_TOOL_STATE.zones,
                polygons: MAP_TOOL_STATE.polygons,
                markers: MAP_TOOL_STATE.markers,
                layers: MAP_TOOL_STATE.layers
            })
        );
    } catch (error) {
        console.warn(
            'Failed to save map tools state:',
            error
        );
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

        const parsed =
            JSON.parse(raw);

        MAP_TOOL_STATE.drawings =
            Array.isArray(parsed?.drawings)
                ? parsed.drawings
                : [];

        MAP_TOOL_STATE.zones =
            Array.isArray(parsed?.zones)
                ? parsed.zones
                : [];

        MAP_TOOL_STATE.polygons =
            Array.isArray(parsed?.polygons)
                ? parsed.polygons
                : [];

        MAP_TOOL_STATE.markers =
            Array.isArray(parsed?.markers)
                ? parsed.markers
                : [];

        if (parsed?.layers && typeof parsed.layers === 'object') {
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
    if (
        imported.drawings.length ||
        imported.zones.length ||
        imported.polygons.length ||
        imported.markers.length
    ) {
        pushMapToolHistory();
    }

    MAP_TOOL_STATE.drawings.push(...imported.drawings);
    MAP_TOOL_STATE.zones.push(...imported.zones);
    MAP_TOOL_STATE.polygons.push(...imported.polygons);
    MAP_TOOL_STATE.markers.push(...imported.markers);

    if (imported.layers) {
        MAP_TOOL_STATE.layers = {
            ...MAP_TOOL_STATE.layers,
            ...imported.layers
        };
    }

    MAP_TOOL_STATE.hoverPathId = null;
    MAP_TOOL_STATE.hoverDeletePoint = null;
    MAP_TOOL_STATE.hoverShapeType = null;
    MAP_TOOL_STATE.hoverShapeId = null;
    MAP_TOOL_STATE.hoverMarkerId = null;

    saveMapToolState();
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

function setMapTool(tool) {
    MAP_TOOL_STATE.tool =
        MAP_TOOL_STATE.tool === tool
            ? null
            : tool;

    MAP_TOOL_STATE.rulerStart = null;
    MAP_TOOL_STATE.rulerEnd = null;
    MAP_TOOL_STATE.rulerDragging = false;
    MAP_TOOL_STATE.pencilDragging = false;
    MAP_TOOL_STATE.activePath = null;
    MAP_TOOL_STATE.zoneStart = null;
    MAP_TOOL_STATE.zoneEnd = null;
    MAP_TOOL_STATE.zoneDragging = false;
    MAP_TOOL_STATE.polygonDraft = null;
    MAP_TOOL_STATE.polygonHover = null;
    MAP_TOOL_STATE.hoverPathId = null;
    MAP_TOOL_STATE.hoverDeletePoint = null;
    MAP_TOOL_STATE.hoverShapeType = null;
    MAP_TOOL_STATE.hoverShapeId = null;
    MAP_TOOL_STATE.hoverMarkerId = null;

    if (MAP_TOOL_STATE.tool === 'zone') {
        MAP_TOOL_STATE.layers.zones = true;
        saveMapToolState();
    }

    if (MAP_TOOL_STATE.tool === 'polygon') {
        MAP_TOOL_STATE.layers.polygons = true;
        saveMapToolState();
    }

    updateMapToolsUI();
    draw();
}

function activateColorMapTool(tool) {
    const changed =
        MAP_TOOL_STATE.tool !== tool;

    if (changed) {
        setMapTool(tool);
        closeMapToolMenus(
            'pencilPalette'
        );
        $('pencilPalette')
            ?.classList.add('open');
        updateMapToolsUI();
        return;
    }

    toggleMapToolMenu(
        'pencilPalette'
    );
}

function ensureEraserPopover() {
    const bar =
        document.querySelector(
            '.map-tools-bar'
        );

    if (!bar) {
        return null;
    }

    let popover =
        $('eraserPopover');

    if (!popover) {
        popover =
            document.createElement(
                'div'
            );

        popover.id =
            'eraserPopover';

        /*
         * Reuse the coordinate-search popover shell and primary action styles
         * so the eraser menu follows the same layout, responsive sizing and
         * accessibility behavior as the existing Map Tools windows.
         */
        popover.className =
            'map-tool-popover map-tool-coordinate-search';

        bar.before(popover);
    }

    return popover;
}

function buildEraserPopover() {
    const container =
        ensureEraserPopover();

    if (!container) {
        return;
    }

    container.innerHTML = '';

    const title =
        document.createElement(
            'div'
        );

    title.className =
        'map-tool-popover-title';

    title.textContent =
        tr('mapToolEraser');

    const clearButton =
        document.createElement(
            'button'
        );

    clearButton.type = 'button';
    clearButton.className =
        'map-tool-search-go';

    const clearLabel =
        tr('mapToolEraseAll');

    clearButton.textContent =
        clearLabel;

    clearButton.setAttribute(
        'aria-label',
        clearLabel
    );

    clearButton.addEventListener(
        'click',
        event => {
            event.stopPropagation();
            clearCurrentMapToolContent();
        }
    );

    container.append(
        title,
        clearButton
    );
}

function activateEraserTool() {
    buildEraserPopover();

    const changed =
        MAP_TOOL_STATE.tool !==
        'eraser';

    if (changed) {
        setMapTool('eraser');
        closeMapToolMenus(
            'eraserPopover'
        );
        $('eraserPopover')
            ?.classList.add('open');
        updateMapToolsUI();
        return;
    }

    toggleMapToolMenu(
        'eraserPopover'
    );
}

function closeMapToolMenus(except = null) {
    ['pencilPalette', 'eraserPopover', 'markerPicker', 'coordinateSearchPopover', 'mapLayersPopover', 'mapDataTransferPopover', 'fireAdjustmentPopover'].forEach(
        id => {
            if (id === except) {
                return;
            }

            const element = $(id);

            if (element) {
                element.classList.remove('open');
            }
        }
    );

    /*
     * Keep toolbar highlight state synchronized
     * when menus are closed by outside clicks,
     * Escape, fullscreen, or another tool.
     */
    if (
        typeof updateMapToolsUI ===
        'function'
    ) {
        updateMapToolsUI();
    }
}

function toggleMapToolMenu(id) {
    const element = $(id);

    if (!element) {
        return;
    }

    const shouldOpen =
        !element.classList.contains('open');

    closeMapToolMenus(
        shouldOpen ? id : null
    );

    element.classList.toggle(
        'open',
        shouldOpen
    );

    updateMapToolsUI();
}

function isMapToolMenuOpen(id) {

    return Boolean(
        $(id)?.classList.contains(
            'open'
        )
    );
}

function setMobileMapToolsOpen(open) {
    const tools = $('mapTools');
    const toggle = $('mobileMapToolsToggle');

    if (!tools || !toggle) {
        return;
    }

    const expanded = Boolean(open);

    tools.classList.toggle(
        'mobile-map-tools-open',
        expanded
    );

    toggle.classList.toggle(
        'active',
        expanded
    );

    toggle.setAttribute(
        'aria-expanded',
        expanded ? 'true' : 'false'
    );

    if (!expanded) {
        closeMapToolMenus();
    }
}

function toggleMobileMapTools() {
    const tools = $('mapTools');

    if (!tools) {
        return;
    }

    setMobileMapToolsOpen(
        !tools.classList.contains(
            'mobile-map-tools-open'
        )
    );
}

function updateMapToolsUI() {
    document
        .querySelectorAll('.map-tool-button[data-tool]')
        .forEach(button => {

            const tool =
                button.dataset.tool;

            let active =
                tool ===
                MAP_TOOL_STATE.tool;

            /*
             * Menu-only tools should only look active
             * while their popover is actually open.
             * Their internal tool state can remain set
             * without leaving a permanently highlighted
             * toolbar icon.
             */
            if (tool === 'marker') {
                active =
                    isMapToolMenuOpen(
                        'markerPicker'
                    );
            }

            if (
                tool ===
                'coordinateSearch'
            ) {
                active =
                    isMapToolMenuOpen(
                        'coordinateSearchPopover'
                    );
            }

            if (tool === 'layers') {
                active =
                    isMapToolMenuOpen(
                        'mapLayersPopover'
                    );
            }

            if (tool === 'dataTransfer') {
                active =
                    isMapToolMenuOpen(
                        'mapDataTransferPopover'
                    );
            }

            if (tool === 'fireAdjust') {
                active =
                    isMapToolMenuOpen(
                        'fireAdjustmentPopover'
                    );
            }

            button.classList.toggle(
                'active',
                active
            );
        });

    document
        .querySelectorAll('.map-tool-color')
        .forEach(button => {
            button.classList.toggle(
                'active',
                button.dataset.color ===
                MAP_TOOL_STATE.pencilColor
            );
        });

    document
        .querySelectorAll('.map-tool-marker-option')
        .forEach(button => {
            button.classList.toggle(
                'active',
                button.dataset.icon ===
                MAP_TOOL_STATE.selectedMarkerIcon
            );
        });

    const interactionHint =
        $('mapToolInteractionHint');

    const interactionHintKey =
        MAP_TOOL_STATE.tool === 'zone'
            ? 'mapToolZoneHint'
            : MAP_TOOL_STATE.tool === 'polygon'
                ? 'mapToolPolygonHint'
                : null;

    if (interactionHint) {
        interactionHint.hidden =
            !interactionHintKey;

        interactionHint.textContent =
            interactionHintKey
                ? tr(interactionHintKey)
                : '';
    }

    if (c) {
        c.classList.toggle(
            'map-tool-active',
            [
                'ruler',
                'pencil',
                'zone',
                'polygon',
                'eraser',
                'marker'
            ].includes(MAP_TOOL_STATE.tool)
        );

        c.classList.toggle(
            'map-tool-pencil-active',
            MAP_TOOL_STATE.tool === 'pencil'
        );

        c.classList.toggle(
            'map-tool-eraser-active',
            MAP_TOOL_STATE.tool === 'eraser'
        );
    }
}

function buildPencilPalette() {
    const container =
        $('pencilPalette');

    if (!container) {
        return;
    }

    container.innerHTML = '';

    MAP_TOOL_COLORS.forEach(item => {
        const button =
            document.createElement('button');

        button.type = 'button';
        button.className =
            'map-tool-color';
        button.dataset.color =
            item.color;
        const title =
            tr(item.titleKey);

        button.title =
            title;
        button.setAttribute(
            'aria-label',
            title
        );
        button.style.setProperty(
            '--tool-color',
            item.color
        );

        button.addEventListener(
            'click',
            event => {
                event.stopPropagation();

                MAP_TOOL_STATE.pencilColor =
                    item.color;

                if (
                    ![
                        'pencil',
                        'zone',
                        'polygon'
                    ].includes(
                        MAP_TOOL_STATE.tool
                    )
                ) {
                    MAP_TOOL_STATE.tool =
                        'pencil';
                }

                updateMapToolsUI();
            }
        );

        container.appendChild(button);
    });
}

function buildMarkerPicker() {
    const container =
        $('markerPicker');

    if (!container) {
        return;
    }

    container.innerHTML = '';

    const assets =
        Object.values(MAP_ASSETS)
            .filter(
                asset =>
                    asset.placeable
            );

    if (!assets.length) {
        const empty =
            document.createElement('div');

        empty.className =
            'map-tool-picker-empty';
        empty.textContent =
            tr('mapToolNoMarkerAssets');

        container.appendChild(empty);
        return;
    }

    assets.forEach(asset => {
        const button =
            document.createElement('button');

        button.type = 'button';
        button.className =
            'map-tool-marker-option';
        const label =
            getMarkerAssetLabel(asset);

        button.dataset.icon =
            asset.id;
        button.title =
            label;
        button.setAttribute(
            'aria-label',
            label
        );

        const image =
            document.createElement('img');

        image.src =
            resourceURL(asset.path);
        image.alt = '';
        image.draggable = false;

        const fallback =
            document.createElement('span');

        fallback.className =
            'map-tool-marker-fallback';
        fallback.textContent =
            asset.id.slice(0, 2).toUpperCase();

        image.addEventListener(
            'error',
            () => {
                image.style.display = 'none';
                fallback.style.display = 'grid';
            }
        );

        button.appendChild(image);
        button.appendChild(fallback);

        button.addEventListener(
            'click',
            event => {
                event.stopPropagation();

                MAP_TOOL_STATE.selectedMarkerIcon =
                    asset.id;
                MAP_TOOL_STATE.tool =
                    'marker';

                updateMapToolsUI();
                closeMapToolMenus();
            }
        );

        container.appendChild(button);
    });
}

function formatShortcut(action) {
    const shortcut = getMapToolShortcut(action);

    if (!shortcut) {
        return '';
    }

    if (shortcut === 'escape') {
        return 'Esc';
    }

    return shortcut.length === 1
        ? shortcut.toUpperCase()
        : shortcut;
}

function setToolButtonLabel(button, key, shortcutAction = null) {
    if (!button) {
        return;
    }

    const label = tr(key);
    const shortcut = shortcutAction
        ? formatShortcut(shortcutAction)
        : '';
    const fullLabel = shortcut
        ? `${label} (${shortcut})`
        : label;

    button.title = fullLabel;
    button.setAttribute('aria-label', fullLabel);
}

function isMapLayerVisible(layer) {
    return MAP_TOOL_STATE.layers[layer] !== false;
}

function setMapLayerVisible(layer, visible) {
    if (!(layer in MAP_TOOL_STATE.layers)) {
        return;
    }

    MAP_TOOL_STATE.layers[layer] = Boolean(visible);
    saveMapToolState();

    /*
     * Start the download the moment the layer is asked for rather than
     * waiting for the redraw, so the lines appear as soon as they can.
     */
    if (
        layer === 'contours' &&
        visible &&
        typeof ensureContoursLoaded === 'function'
    ) {
        ensureContoursLoaded(currentMapToolMapId());
    }

    if (
        layer === 'cursorCoords' &&
        !MAP_TOOL_STATE.layers.cursorCoords
    ) {
        const cursor = $('cursorCoords');

        if (cursor) {
            cursor.style.display = 'none';
        }
    }

    draw();
}


function setMapLayerGroupVisible(layerIds, visible) {
    const nextVisible = Boolean(visible);

    layerIds.forEach(layer => {
        if (layer in MAP_TOOL_STATE.layers) {
            MAP_TOOL_STATE.layers[layer] =
                nextVisible;
        }
    });

    saveMapToolState();

    if (
        nextVisible &&
        layerIds.includes('contours') &&
        typeof ensureContoursLoaded === 'function'
    ) {
        ensureContoursLoaded(
            currentMapToolMapId()
        );
    }

    if (
        !nextVisible &&
        layerIds.includes('cursorCoords')
    ) {
        const cursor = $('cursorCoords');

        if (cursor) {
            cursor.style.display = 'none';
        }
    }

    draw();
}

function buildMapLayers() {
    const container = $('mapLayersPopover');

    if (!container) {
        return;
    }

    const contourLayer = (
        typeof mapHasContours === 'function' &&
        mapHasContours(
            currentMapToolMapId()
        )
    )
        ? [['contours', 'mapLayerContours']]
        : [];

    const groups = [
        {
            id: 'base',
            titleKey: 'map',
            items: [
                ['tiles', 'mapLayerMap'],
                ...contourLayer,
                ['grid', 'mapLayerGrid']
            ]
        },
        {
            id: 'tactical',
            titleKey: 'mapToolMarkers',
            items: [
                ['zones', 'mapLayerZones'],
                ['polygons', 'mapLayerPolygons'],
                ['presetMarkers', 'mapLayerPresetMarkers'],
                ['artillery', 'mapLayerArtillery']
            ]
        },
        {
            id: 'personal',
            titleKey: 'mapToolsToggle',
            items: [
                ['drawings', 'mapLayerDrawings'],
                ['userMarkers', 'mapLayerUserMarkers'],
                ['cursorCoords', 'mapLayerCursorCoordinates']
            ]
        }
    ];

    const icons = {
        tiles: `
            <path d="M4 5h7v6H4zM13 5h7v6h-7zM4 13h7v6H4zM13 13h7v6h-7z"/>
        `,
        contours: `
            <path d="M3 7c3-2 5 2 8 0s5-2 10 0"/>
            <path d="M3 12c3-2 5 2 8 0s5-2 10 0"/>
            <path d="M3 17c3-2 5 2 8 0s5-2 10 0"/>
        `,
        grid: `
            <path d="M4 4h16v16H4z"/>
            <path d="M9.3 4v16M14.7 4v16M4 9.3h16M4 14.7h16"/>
        `,
        zones: `
            <circle cx="12" cy="12" r="7"/>
            <path d="M12 5v14M5 12h14"/>
        `,
        polygons: `
            <path d="m5 17 2-10 9-3 4 8-5 8Z"/>
        `,
        presetMarkers: `
            <path d="M12 21s6-5.1 6-11a6 6 0 1 0-12 0c0 5.9 6 11 6 11Z"/>
            <circle cx="12" cy="10" r="2"/>
        `,
        drawings: `
            <path d="M4 18.5 5.5 14 15 4.5l4.5 4.5-9.5 9.5Z"/>
            <path d="m13.5 6 4.5 4.5"/>
        `,
        userMarkers: `
            <path d="M12 21s6-5.1 6-11a6 6 0 1 0-12 0c0 5.9 6 11 6 11Z"/>
            <path d="m12 7 .9 1.8 2 .3-1.45 1.4.35 2-1.8-.95-1.8.95.35-2-1.45-1.4 2-.3Z"/>
        `,
        artillery: `
            <circle cx="12" cy="12" r="6"/>
            <circle cx="12" cy="12" r="2"/>
            <path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>
        `,
        cursorCoords: `
            <path d="m5 3 13 9-6 1.5L9.5 19Z"/>
        `
    };

    const createLayerIcon = id => {
        const icon =
            document.createElement('span');

        icon.className =
            'map-layer-icon';

        icon.setAttribute(
            'aria-hidden',
            'true'
        );

        icon.innerHTML = `
            <svg
                viewBox="0 0 24 24"
                width="17"
                height="17"
                fill="none"
                stroke="currentColor"
                stroke-width="1.7"
                stroke-linecap="round"
                stroke-linejoin="round"
            >
                ${icons[id] || ''}
            </svg>
        `;

        return icon;
    };

    container.innerHTML = '';

    const title =
        document.createElement('div');

    title.className =
        'map-tool-popover-title';

    title.textContent =
        tr('mapToolLayers');

    container.appendChild(title);

    groups.forEach(group => {
        const section =
            document.createElement('section');

        section.className =
            'map-layer-group';

        section.dataset.layerGroup =
            group.id;

        const groupToggle =
            document.createElement('label');

        groupToggle.className =
            'map-layer-group-toggle';

        const groupTitle =
            document.createElement('span');

        groupTitle.className =
            'map-layer-group-title';

        groupTitle.textContent =
            tr(group.titleKey);

        const groupCheckbox =
            document.createElement('input');

        groupCheckbox.type =
            'checkbox';

        const visibility =
            group.items.map(
                ([id]) =>
                    isMapLayerVisible(id)
            );

        const allVisible =
            visibility.every(Boolean);

        const anyVisible =
            visibility.some(Boolean);

        groupCheckbox.checked =
            allVisible;

        groupCheckbox.indeterminate =
            anyVisible &&
            !allVisible;

        groupCheckbox.addEventListener(
            'change',
            event => {
                event.stopPropagation();

                setMapLayerGroupVisible(
                    group.items.map(
                        ([id]) => id
                    ),
                    groupCheckbox.checked
                );

                buildMapLayers();
            }
        );

        groupToggle.append(
            groupTitle,
            groupCheckbox
        );

        section.appendChild(
            groupToggle
        );

        const items =
            document.createElement('div');

        items.className =
            'map-layer-group-items';

        group.items.forEach(
            ([id, key]) => {
                const label =
                    document.createElement('label');

                label.className =
                    'map-layer-toggle';

                const icon =
                    createLayerIcon(id);

                const text =
                    document.createElement('span');

                text.className =
                    'map-layer-label';

                text.textContent =
                    tr(key);

                const checkbox =
                    document.createElement('input');

                checkbox.type =
                    'checkbox';

                checkbox.checked =
                    isMapLayerVisible(id);

                checkbox.addEventListener(
                    'change',
                    () => {
                        setMapLayerVisible(
                            id,
                            checkbox.checked
                        );

                        buildMapLayers();
                    }
                );

                label.append(
                    icon,
                    text,
                    checkbox
                );

                items.appendChild(label);
            }
        );

        section.appendChild(items);
        container.appendChild(section);
    });

    updateMapToolHistoryUI();
}

function buildMapDataTransfer() {
    const container = $('mapDataTransferPopover');

    if (!container) {
        return;
    }

    container.innerHTML = '';

    const title = document.createElement('div');
    title.className = 'map-tool-popover-title';
    title.textContent = tr('mapToolDataTransfer');

    const hint = document.createElement('div');
    hint.className = 'map-tool-data-transfer-hint';
    hint.textContent = tr('mapToolDataTransferHint');

    const actions = document.createElement('div');
    actions.className = 'map-tool-data-transfer-actions';

    const exportButton = document.createElement('button');
    exportButton.type = 'button';
    exportButton.textContent = tr('mapToolExportChanges');
    exportButton.addEventListener('click', event => {
        event.stopPropagation();
        exportMapToolChanges();
    });

    const importButton = document.createElement('button');
    importButton.type = 'button';
    importButton.textContent = tr('mapToolImportChanges');
    importButton.addEventListener('click', async event => {
        event.stopPropagation();
        await importMapToolChanges();
    });

    actions.append(exportButton, importButton);

    const status = document.createElement('div');
    status.id = 'mapDataTransferStatus';
    status.className = 'map-tool-data-transfer-status';

    container.append(title, hint, actions, status);
}

function centerMapOnWorldPoint(point) {
    if (!isWorldPointInsideMap(point)) {
        return false;
    }

    const rect = c.getBoundingClientRect();
    const current = toScreen(point.x, point.y);

    S.panX += rect.width / 2 - current.x;
    S.panY += rect.height / 2 - current.y;

    MAP_TOOL_STATE.searchPoint = {
        x: point.x,
        y: point.y
    };

    draw();
    return true;
}

function submitCoordinateSearch() {
    const xInput = $('coordinateSearchX');
    const yInput = $('coordinateSearchY');
    const error = $('coordinateSearchError');

    const xMeters = Number(xInput?.value);
    const yMeters = Number(yInput?.value);

    if (!Number.isFinite(xMeters) || !Number.isFinite(yMeters)) {
        if (error) error.textContent = tr('mapToolSearchInvalid');
        return;
    }

    const point =
        getCoordinateMetersPerUnit() === 100
            ? {
                x: xMeters,
                y: yMeters
            }
            : {
                x: xMeters / 1000,
                y: yMeters / 1000
            };

    if (!centerMapOnWorldPoint(point)) {
        if (error) error.textContent = tr('mapToolSearchOutOfBounds');
        return;
    }

    if (error) error.textContent = '';

    if (
        typeof trackAnalytics ===
        'function'
    ) {
        trackAnalytics(
            'coordinate-search',
            {
                map: S.map
            }
        );
    }

    closeMapToolMenus();
}

function updateCoordinateSearchDefaults() {
    const xInput = $('coordinateSearchX');
    const yInput = $('coordinateSearchY');

    if (!xInput || !yInput) {
        return;
    }

    const bounds = getViewBounds();
    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2;

    if (!xInput.value) xInput.value = formatGameCoordinate(centerX);
    if (!yInput.value) yInput.value = formatGameCoordinate(centerY);
}

function handleMapToolShortcut(event) {
    const target = event.target;

    if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        target?.isContentEditable
    ) {
        return false;
    }

    const key =
        getKeyboardShortcutKey(
            event
        );

    if (
        MAP_TOOL_STATE.tool === 'polygon' &&
        key === 'enter'
    ) {
        return finishPolygonDraft();
    }

    if (
        MAP_TOOL_STATE.tool === 'polygon' &&
        ['backspace', 'delete'].includes(key) &&
        MAP_TOOL_STATE.polygonDraft?.points?.length
    ) {
        MAP_TOOL_STATE.polygonDraft.points.pop();

        if (!MAP_TOOL_STATE.polygonDraft.points.length) {
            MAP_TOOL_STATE.polygonDraft = null;
            MAP_TOOL_STATE.polygonHover = null;
        }

        draw();
        return true;
    }

    const undoShortcut = getMapToolShortcut('undo') || 'ctrl+z';
    const redoShortcut = getMapToolShortcut('redo') || 'ctrl+y';
    const redoAltShortcut = getMapToolShortcut('redoAlt') || 'ctrl+shift+z';

    if (matchesConfiguredCombo(event, undoShortcut)) return undoMapToolAction();
    if (matchesConfiguredCombo(event, redoShortcut) || matchesConfiguredCombo(event, redoAltShortcut)) {
        return redoMapToolAction();
    }

    if (event.ctrlKey || event.metaKey || event.altKey) {
        return false;
    }

    const shortcuts = {
        ruler: getMapToolShortcut('ruler'),
        pencil: getMapToolShortcut('pencil'),
        zone: getMapToolShortcut('zone'),
        polygon: getMapToolShortcut('polygon'),
        eraser: getMapToolShortcut('eraser'),
        marker: getMapToolShortcut('marker'),
        coordinateSearch: getMapToolShortcut('coordinateSearch'),
        layers: getMapToolShortcut('layers'),
        fireAdjust: getMapToolShortcut('fireAdjust'),
        clearTool: getMapToolShortcut('clearTool')
    };

    if (key === shortcuts.clearTool) {
        MAP_TOOL_STATE.searchPoint = null;
        closeMapToolMenus();
        setMapTool(null);
        return true;
    }

    if (key === shortcuts.ruler) {
        closeMapToolMenus();
        setMapTool('ruler');
        return true;
    }

    if (key === shortcuts.pencil) {
        activateColorMapTool('pencil');
        return true;
    }

    if (key === shortcuts.zone) {
        activateColorMapTool('zone');
        return true;
    }

    if (key === shortcuts.polygon) {
        activateColorMapTool('polygon');
        return true;
    }

    if (key === shortcuts.eraser) {
        activateEraserTool();
        return true;
    }

    if (key === shortcuts.marker) {
        /*
         * Opening the picker is not the same as activating the marker tool.
         * The tool becomes active only after the user chooses an icon.
         */
        toggleMapToolMenu('markerPicker');
        return true;
    }

    if (key === shortcuts.coordinateSearch) {
        MAP_TOOL_STATE.tool = 'coordinateSearch';
        updateMapToolsUI();
        updateCoordinateSearchDefaults();
        toggleMapToolMenu('coordinateSearchPopover');
        $('coordinateSearchX')?.focus();
        return true;
    }

    if (key === shortcuts.layers) {
        MAP_TOOL_STATE.tool = 'layers';
        updateMapToolsUI();
        buildMapLayers();
        toggleMapToolMenu('mapLayersPopover');
        return true;
    }

    if (
        shortcuts.fireAdjust &&
        key === shortcuts.fireAdjust &&
        typeof toggleFireAdjustmentTool === 'function'
    ) {
        toggleFireAdjustmentTool();
        return true;
    }

    return false;
}

/* =========================
   FULLSCREEN
   ========================= */

function getMapFullscreenElement() {

    /*
     * Fullscreen the whole calculator layout instead
     * of only the map so the sidebar/calculator
     * controls remain available in fullscreen mode.
     */
    return document.querySelector(
        'main'
    );
}

function isMapFullscreen() {

    const map =
        getMapFullscreenElement();

    return Boolean(
        map &&
        (
            document.fullscreenElement ===
            map ||
            document.webkitFullscreenElement ===
            map
        )
    );
}

function updateMapFullscreenButton() {

    const button =
        $('mapToolFullscreen');

    if (!button) {
        return;
    }

    const active =
        isMapFullscreen();

    const label =
        active
            ? tr('mapToolExitFullscreen')
            : tr('mapToolFullscreen');

    button.title =
        label;

    button.setAttribute(
        'aria-label',
        label
    );

    button.classList.toggle(
        'active',
        active
    );
}

async function toggleMapFullscreen() {

    const map =
        getMapFullscreenElement();

    if (!map) {
        return;
    }

    try {

        if (isMapFullscreen()) {

            if (
                document.exitFullscreen
            ) {

                await document
                    .exitFullscreen();

            } else if (
                document.webkitExitFullscreen
            ) {

                document
                    .webkitExitFullscreen();
            }

        } else if (
            map.requestFullscreen
        ) {

            await map
                .requestFullscreen();

        } else if (
            map.webkitRequestFullscreen
        ) {

            map
                .webkitRequestFullscreen();
        }

    } catch (error) {

        console.warn(
            'Failed to toggle map fullscreen:',
            error
        );
    }
}

function ensureMapShapeTools() {
    const bar =
        document.querySelector(
            '.map-tools-bar'
        );

    if (!bar) {
        return;
    }

    if (!$('mapToolInteractionHint')) {
        const hint =
            document.createElement(
                'div'
            );

        hint.id =
            'mapToolInteractionHint';

        hint.className =
            'map-tool-interaction-hint';

        hint.hidden = true;
        hint.setAttribute(
            'role',
            'status'
        );

        bar.before(hint);
    }

    const definitions = [
        {
            id: 'mapToolZone',
            tool: 'zone',
            icon: `
                <circle cx="12" cy="12" r="7"/>
                <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/>
                <path d="M12 5v3M12 16v3M5 12h3M16 12h3"/>
            `
        },
        {
            id: 'mapToolPolygon',
            tool: 'polygon',
            icon: `
                <path d="m5 17 2-10 9-3 4 8-5 8Z"/>
                <circle cx="7" cy="7" r="1.2" fill="currentColor" stroke="none"/>
                <circle cx="16" cy="4" r="1.2" fill="currentColor" stroke="none"/>
                <circle cx="20" cy="12" r="1.2" fill="currentColor" stroke="none"/>
                <circle cx="15" cy="20" r="1.2" fill="currentColor" stroke="none"/>
                <circle cx="5" cy="17" r="1.2" fill="currentColor" stroke="none"/>
            `
        }
    ];

    const insertBefore =
        $('mapToolEraser') ||
        $('mapToolMarker') ||
        null;

    definitions.forEach(definition => {
        if ($(definition.id)) {
            return;
        }

        const button =
            document.createElement(
                'button'
            );

        button.type = 'button';
        button.id = definition.id;
        button.className = 'map-tool-button';
        button.dataset.tool = definition.tool;
        button.innerHTML = `
            <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                width="18"
                height="18"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
            >
                ${definition.icon}
            </svg>
        `;

        bar.insertBefore(
            button,
            insertBefore
        );
    });
}

function ensureMapHistoryTools() {
    const bar =
        document.querySelector(
            '.map-tools-bar'
        );

    if (!bar) {
        return;
    }

    const createButton =
        (id, direction) => {
            const button =
                document.createElement(
                    'button'
                );

            button.type = 'button';
            button.id = id;
            button.className =
                `map-tool-button map-tool-history-button map-tool-history-${direction}`;

            button.innerHTML =
                direction === 'undo'
                    ? `
                        <svg
                            aria-hidden="true"
                            viewBox="0 0 24 24"
                            width="18"
                            height="18"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="1.8"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                        >
                            <path d="M9 8 5 12l4 4"/>
                            <path d="M5 12h7.5a5.5 5.5 0 0 1 5.5 5.5"/>
                        </svg>
                    `
                    : `
                        <svg
                            aria-hidden="true"
                            viewBox="0 0 24 24"
                            width="18"
                            height="18"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="1.8"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                        >
                            <path d="m15 8 4 4-4 4"/>
                            <path d="M19 12h-7.5A5.5 5.5 0 0 0 6 17.5"/>
                        </svg>
                    `;

            button.addEventListener(
                'click',
                event => {
                    event.stopPropagation();

                    if (
                        direction ===
                        'undo'
                    ) {
                        undoMapToolAction();
                    } else {
                        redoMapToolAction();
                    }
                }
            );

            return button;
        };

    let undoButton =
        $('mapToolUndoButton');

    let redoButton =
        $('mapToolRedoButton');

    if (!undoButton) {
        undoButton =
            createButton(
                'mapToolUndoButton',
                'undo'
            );
    }

    if (!redoButton) {
        redoButton =
            createButton(
                'mapToolRedoButton',
                'redo'
            );
    }

    const layersButton =
        $('mapToolLayers');

    if (layersButton) {
        if (!undoButton.isConnected) {
            bar.insertBefore(
                undoButton,
                layersButton
            );
        }

        if (!redoButton.isConnected) {
            bar.insertBefore(
                redoButton,
                layersButton
            );
        }
    } else {
        if (!undoButton.isConnected) {
            bar.appendChild(
                undoButton
            );
        }

        if (!redoButton.isConnected) {
            bar.appendChild(
                redoButton
            );
        }
    }

    updateMapToolHistoryUI();
}

function updateMapToolsLocalization() {
    ensureMapShapeTools();
    ensureMapHistoryTools();
    buildEraserPopover();

    const undoButton =
        $('mapToolUndoButton');

    const redoButton =
        $('mapToolRedoButton');

    const rulerButton = $('mapToolRuler');
    const pencilButton = $('mapToolPencil');
    const zoneButton = $('mapToolZone');
    const polygonButton = $('mapToolPolygon');
    const eraserButton = $('mapToolEraser');
    const markerButton = $('mapToolMarker');
    const searchButton = $('mapToolCoordinateSearch');
    const layersButton = $('mapToolLayers');
    const dataTransferButton = $('mapToolDataTransfer');
    const fullscreenButton = $('mapToolFullscreen');
    const mobileToolsToggle = $('mobileMapToolsToggle');

    setToolButtonLabel(
        undoButton,
        'mapToolUndo',
        'undo'
    );

    setToolButtonLabel(
        redoButton,
        'mapToolRedo',
        'redo'
    );

    setToolButtonLabel(rulerButton, 'mapToolRuler', 'ruler');
    setToolButtonLabel(pencilButton, 'mapToolPencil', 'pencil');
    setToolButtonLabel(zoneButton, 'mapLayerZones', 'zone');
    setToolButtonLabel(polygonButton, 'mapLayerPolygons', 'polygon');
    setToolButtonLabel(eraserButton, 'mapToolEraser', 'eraser');
    setToolButtonLabel(markerButton, 'mapToolMarkers', 'marker');
    setToolButtonLabel(searchButton, 'mapToolCoordinateSearch', 'coordinateSearch');
    setToolButtonLabel(layersButton, 'mapToolLayers', 'layers');
    setToolButtonLabel(dataTransferButton, 'mapToolDataTransfer');
    setToolButtonLabel(mobileToolsToggle, 'mapToolsToggle');

    if (fullscreenButton) {
        updateMapFullscreenButton();
    }

    buildPencilPalette();
    buildMarkerPicker();
    buildMapLayers();
    buildMapDataTransfer();

    /*
     * Fire adjustment is an optional runtime feature; it injects its own
     * toolbar button and popover when the script is loaded.
     */
    if (
        typeof buildFireAdjustmentPopover ===
        'function'
    ) {
        buildFireAdjustmentPopover();

        setToolButtonLabel(
            $('mapToolFireAdjustment'),
            'fireAdjustment',
            'fireAdjust'
        );
    }

    const goButton = $('coordinateSearchGo');
    if (goButton) goButton.textContent = tr('mapToolSearchGo');
    const searchTitle = $('coordinateSearchTitle');
    if (searchTitle) searchTitle.textContent = tr('mapToolCoordinateSearch');

    updateMapToolsUI();
}

function initMapTools() {
    loadMapToolState();
    updateMapToolsLocalization();

    const rulerButton =
        $('mapToolRuler');
    const pencilButton =
        $('mapToolPencil');
    const zoneButton =
        $('mapToolZone');
    const polygonButton =
        $('mapToolPolygon');
    const eraserButton =
        $('mapToolEraser');
    const markerButton =
        $('mapToolMarker');
    const searchButton =
        $('mapToolCoordinateSearch');
    const layersButton =
        $('mapToolLayers');
    const dataTransferButton =
        $('mapToolDataTransfer');
    const fullscreenButton =
        $('mapToolFullscreen');
    const mobileToolsToggle =
        $('mobileMapToolsToggle');

    mobileToolsToggle?.addEventListener(
        'click',
        event => {
            event.stopPropagation();
            toggleMobileMapTools();
        }
    );

    rulerButton?.addEventListener(
        'click',
        event => {
            event.stopPropagation();
            closeMapToolMenus();
            setMapTool('ruler');
        }
    );

    pencilButton?.addEventListener(
        'click',
        event => {
            event.stopPropagation();

            activateColorMapTool(
                'pencil'
            );
        }
    );

    zoneButton?.addEventListener(
        'click',
        event => {
            event.stopPropagation();

            activateColorMapTool(
                'zone'
            );
        }
    );

    polygonButton?.addEventListener(
        'click',
        event => {
            event.stopPropagation();

            activateColorMapTool(
                'polygon'
            );
        }
    );

    eraserButton?.addEventListener(
        'click',
        event => {
            event.stopPropagation();
            activateEraserTool();
        }
    );

    markerButton?.addEventListener(
        'click',
        event => {
            event.stopPropagation();

            /*
             * Keep the previously active tool while browsing marker icons.
             * Selecting an icon commits marker mode in buildMarkerPicker().
             */
            toggleMapToolMenu(
                'markerPicker'
            );
        }
    );

    searchButton?.addEventListener(
        'click',
        event => {
            event.stopPropagation();
            MAP_TOOL_STATE.tool = 'coordinateSearch';
            updateMapToolsUI();
            updateCoordinateSearchDefaults();
            toggleMapToolMenu('coordinateSearchPopover');
            $('coordinateSearchX')?.focus();
        }
    );

    layersButton?.addEventListener(
        'click',
        event => {
            event.stopPropagation();
            MAP_TOOL_STATE.tool = 'layers';
            updateMapToolsUI();
            buildMapLayers();
            toggleMapToolMenu('mapLayersPopover');
        }
    );

    dataTransferButton?.addEventListener(
        'click',
        event => {
            event.stopPropagation();
            MAP_TOOL_STATE.tool = 'dataTransfer';
            updateMapToolsUI();
            buildMapDataTransfer();
            toggleMapToolMenu('mapDataTransferPopover');
        }
    );

    fullscreenButton?.addEventListener(
        'click',
        event => {
            event.stopPropagation();
            closeMapToolMenus();
            toggleMapFullscreen();
        }
    );

    document.addEventListener(
        'fullscreenchange',
        () => {
            updateMapFullscreenButton();
            if (
                typeof resize ===
                'function'
            ) {
                resize();
            }
        }
    );

    document.addEventListener(
        'webkitfullscreenchange',
        () => {
            updateMapFullscreenButton();
            if (
                typeof resize ===
                'function'
            ) {
                resize();
            }
        }
    );

    $('coordinateSearchGo')?.addEventListener(
        'click',
        event => {
            event.stopPropagation();
            submitCoordinateSearch();
        }
    );

    ['coordinateSearchX', 'coordinateSearchY'].forEach(id => {
        $(id)?.addEventListener('keydown', event => {
            if (event.key === 'Enter') {
                event.preventDefault();
                submitCoordinateSearch();
            }
        });
    });

    c?.addEventListener(
        'dblclick',
        event => {
            if (
                MAP_TOOL_STATE.tool !==
                'polygon'
            ) {
                return;
            }

            event.preventDefault();
            finishPolygonDraft();
        }
    );

    document.addEventListener(
        'click',
        event => {
            if (
                !event.target.closest(
                    '.map-tools'
                )
            ) {
                closeMapToolMenus();
            }
        }
    );

    updateMapToolsUI();
}

function isWorldPointInsideMap(point) {
    const bounds =
        getViewBounds();

    return (
        point.x >= bounds.minX &&
        point.x <= bounds.maxX &&
        point.y >= bounds.minY &&
        point.y <= bounds.maxY
    );
}

function addPencilPoint(point) {
    const path =
        MAP_TOOL_STATE.activePath;

    if (!path) {
        return;
    }

    const last =
        path.points[
            path.points.length - 1
        ];

    if (!last) {
        path.points.push({
            x: point.x,
            y: point.y
        });
        return;
    }

    const screenA =
        toScreen(last.x, last.y);
    const screenB =
        toScreen(point.x, point.y);

    if (
        Math.hypot(
            screenB.x - screenA.x,
            screenB.y - screenA.y
        ) < 3
    ) {
        return;
    }

    path.points.push({
        x: point.x,
        y: point.y
    });
}

function finishZoneDraft() {
    if (
        !MAP_TOOL_STATE.zoneDragging ||
        !MAP_TOOL_STATE.zoneStart ||
        !MAP_TOOL_STATE.zoneEnd
    ) {
        return false;
    }

    const start =
        MAP_TOOL_STATE.zoneStart;

    const end =
        MAP_TOOL_STATE.zoneEnd;

    const radius =
        Math.hypot(
            end.x - start.x,
            end.y - start.y
        );

    MAP_TOOL_STATE.zoneDragging = false;
    MAP_TOOL_STATE.zoneStart = null;
    MAP_TOOL_STATE.zoneEnd = null;

    if (
        radius * view().scale < 4
    ) {
        draw();
        return true;
    }

    pushMapToolHistory();

    MAP_TOOL_STATE.zones.push({
        id: mapToolId(),
        mapId: currentMapToolMapId(),
        color: MAP_TOOL_STATE.pencilColor,
        x: start.x,
        y: start.y,
        radius
    });

    saveMapToolState();

    if (
        typeof trackAnalytics ===
            'function'
    ) {
        trackAnalytics(
            'zone-created',
            {
                map: S.map
            }
        );
    }

    draw();
    return true;
}

function addPolygonPoint(point) {
    if (!MAP_TOOL_STATE.polygonDraft) {
        MAP_TOOL_STATE.polygonDraft = {
            id: mapToolId(),
            mapId: currentMapToolMapId(),
            color: MAP_TOOL_STATE.pencilColor,
            points: [
                {
                    x: point.x,
                    y: point.y
                }
            ]
        };

        MAP_TOOL_STATE.polygonHover = {
            x: point.x,
            y: point.y
        };

        draw();
        return true;
    }

    const draft =
        MAP_TOOL_STATE.polygonDraft;

    const first =
        draft.points[0];

    if (
        draft.points.length >= 3 &&
        first
    ) {
        const firstScreen =
            toScreen(
                first.x,
                first.y
            );

        const pointScreen =
            toScreen(
                point.x,
                point.y
            );

        if (
            Math.hypot(
                pointScreen.x - firstScreen.x,
                pointScreen.y - firstScreen.y
            ) <= 14
        ) {
            return finishPolygonDraft();
        }
    }

    const last =
        draft.points[
            draft.points.length - 1
        ];

    const lastScreen =
        toScreen(
            last.x,
            last.y
        );

    const pointScreen =
        toScreen(
            point.x,
            point.y
        );

    if (
        Math.hypot(
            pointScreen.x - lastScreen.x,
            pointScreen.y - lastScreen.y
        ) < 3
    ) {
        return true;
    }

    draft.points.push({
        x: point.x,
        y: point.y
    });

    MAP_TOOL_STATE.polygonHover = {
        x: point.x,
        y: point.y
    };

    draw();
    return true;
}

function finishPolygonDraft() {
    const draft =
        MAP_TOOL_STATE.polygonDraft;

    if (
        !draft ||
        !Array.isArray(draft.points) ||
        draft.points.length < 3
    ) {
        return false;
    }

    pushMapToolHistory();

    MAP_TOOL_STATE.polygons.push({
        ...draft,
        points: structuredClone(
            draft.points
        )
    });

    MAP_TOOL_STATE.polygonDraft = null;
    MAP_TOOL_STATE.polygonHover = null;

    saveMapToolState();

    if (
        typeof trackAnalytics ===
            'function'
    ) {
        trackAnalytics(
            'polygon-created',
            {
                map: S.map
            }
        );
    }

    draw();
    return true;
}

function placeMapToolMarker(point) {
    const asset =
        getMarkerAsset(
            MAP_TOOL_STATE.selectedMarkerIcon
        );

    if (
        !asset ||
        !asset.placeable
    ) {
        MAP_TOOL_STATE.selectedMarkerIcon = null;
        toggleMapToolMenu(
            'markerPicker'
        );
        updateMapToolsUI();
        return;
    }

    pushMapToolHistory();

    MAP_TOOL_STATE.markers.push({
        id: mapToolId(),
        mapId: currentMapToolMapId(),
        icon: MAP_TOOL_STATE.selectedMarkerIcon,
        x: point.x,
        y: point.y
    });

    saveMapToolState();

    if (
        typeof trackAnalytics ===
        'function'
    ) {
        trackAnalytics(
            'user-marker-placed',
            {
                map: S.map
            }
        );
    }

    draw();
}

function findPencilPathAtCanvasPoint(
    canvasX,
    canvasY
) {
    let best = null;

    MAP_TOOL_STATE.drawings
        .filter(
            path =>
                path.mapId ===
                currentMapToolMapId()
        )
        .forEach(path => {
            for (
                let i = 1;
                i < path.points.length;
                i++
            ) {
                const aWorld =
                    path.points[i - 1];

                const bWorld =
                    path.points[i];

                const a =
                    toScreen(
                        aWorld.x,
                        aWorld.y
                    );

                const b =
                    toScreen(
                        bWorld.x,
                        bWorld.y
                    );

                const hit =
                    pointToSegmentDistance(
                        canvasX,
                        canvasY,
                        a.x,
                        a.y,
                        b.x,
                        b.y
                    );

                if (
                    hit.distance <= 12 &&
                    (
                        !best ||
                        hit.distance <
                        best.distance
                    )
                ) {
                    best = {
                        id: path.id,
                        distance: hit.distance,
                        point: {
                            x:
                                aWorld.x +
                                (
                                    bWorld.x -
                                    aWorld.x
                                ) * hit.t,
                            y:
                                aWorld.y +
                                (
                                    bWorld.y -
                                    aWorld.y
                                ) * hit.t
                        }
                    };
                }
            }
        });

    return best;
}

function isCanvasPointInsidePolygon(
    canvasX,
    canvasY,
    points
) {
    let inside = false;

    for (
        let current = 0,
            previous = points.length - 1;
        current < points.length;
        previous = current++
    ) {
        const a = points[current];
        const b = points[previous];

        const crosses =
            (a.y > canvasY) !==
                (b.y > canvasY) &&
            canvasX <
                (
                    (b.x - a.x) *
                    (canvasY - a.y)
                ) /
                (
                    b.y - a.y ||
                    Number.EPSILON
                ) +
                a.x;

        if (crosses) {
            inside = !inside;
        }
    }

    return inside;
}

function findMapToolShapeAtCanvasPoint(
    canvasX,
    canvasY
) {
    let best = null;

    if (isMapLayerVisible('zones')) {
        MAP_TOOL_STATE.zones
            .filter(
                zone =>
                    zone.mapId ===
                        currentMapToolMapId() &&
                    Number.isFinite(zone.x) &&
                    Number.isFinite(zone.y) &&
                    Number.isFinite(zone.radius) &&
                    zone.radius > 0
            )
            .forEach(zone => {
                const center =
                    toScreen(
                        zone.x,
                        zone.y
                    );

                const radius =
                    zone.radius *
                    view().scale;

                const centerDistance =
                    Math.hypot(
                        canvasX - center.x,
                        canvasY - center.y
                    );

                if (
                    centerDistance >
                    radius + 10
                ) {
                    return;
                }

                const distance =
                    Math.abs(
                        centerDistance -
                        radius
                    );

                if (
                    !best ||
                    distance < best.distance
                ) {
                    best = {
                        type: 'zone',
                        id: zone.id,
                        distance
                    };
                }
            });
    }

    if (isMapLayerVisible('polygons')) {
        MAP_TOOL_STATE.polygons
            .filter(
                polygon =>
                    polygon.mapId ===
                        currentMapToolMapId() &&
                    Array.isArray(
                        polygon.points
                    ) &&
                    polygon.points.length >= 3
            )
            .forEach(polygon => {
                const points =
                    polygon.points.map(
                        point =>
                            toScreen(
                                point.x,
                                point.y
                            )
                    );

                let edgeDistance =
                    Infinity;

                for (
                    let index = 0;
                    index < points.length;
                    index++
                ) {
                    const a = points[index];
                    const b =
                        points[
                            (index + 1) %
                            points.length
                        ];

                    edgeDistance =
                        Math.min(
                            edgeDistance,
                            pointToSegmentDistance(
                                canvasX,
                                canvasY,
                                a.x,
                                a.y,
                                b.x,
                                b.y
                            ).distance
                        );
                }

                if (
                    edgeDistance > 10 &&
                    !isCanvasPointInsidePolygon(
                        canvasX,
                        canvasY,
                        points
                    )
                ) {
                    return;
                }

                if (
                    !best ||
                    edgeDistance < best.distance
                ) {
                    best = {
                        type: 'polygon',
                        id: polygon.id,
                        distance: edgeDistance
                    };
                }
            });
    }

    return best;
}

function setMapToolShapeHover(hit) {
    const nextType =
        hit?.type || null;

    const nextId =
        hit?.id || null;

    const changed =
        nextType !==
            MAP_TOOL_STATE.hoverShapeType ||
        nextId !==
            MAP_TOOL_STATE.hoverShapeId;

    MAP_TOOL_STATE.hoverShapeType =
        nextType;

    MAP_TOOL_STATE.hoverShapeId =
        nextId;

    return changed;
}

function setPencilPathHover(hit) {
    MAP_TOOL_STATE.hoverPathId =
        hit?.id || null;

    MAP_TOOL_STATE.hoverDeletePoint =
        hit?.point || null;
}

function eraseMapToolItemAtCanvasPoint(
    canvasX,
    canvasY
) {
    /*
     * User markers sit visually above pencil strokes, so the eraser
     * checks them first. This also makes touch deletion predictable
     * when a marker happens to overlap a drawing.
     */
    const markerHit =
        findMapToolMarkerAtCanvasPoint(
            canvasX,
            canvasY
        );

    setMapToolMarkerHover(markerHit);

    if (markerHit) {
        setPencilPathHover(null);
        setMapToolShapeHover(null);
        return deleteHoveredMapToolMarker();
    }

    const pathHit =
        findPencilPathAtCanvasPoint(
            canvasX,
            canvasY
        );

    setPencilPathHover(pathHit);

    if (pathHit) {
        setMapToolShapeHover(null);
        return deleteHoveredPencilPath();
    }

    const shapeHit =
        findMapToolShapeAtCanvasPoint(
            canvasX,
            canvasY
        );

    setMapToolShapeHover(shapeHit);

    if (shapeHit) {
        return deleteHoveredMapToolShape();
    }

    draw();
    return false;
}

function deleteHoveredPencilPath() {
    if (!MAP_TOOL_STATE.hoverPathId) {
        return false;
    }

    const before =
        MAP_TOOL_STATE.drawings.length;

    pushMapToolHistory();

    MAP_TOOL_STATE.drawings =
        MAP_TOOL_STATE.drawings.filter(
            item =>
                item.id !==
                MAP_TOOL_STATE.hoverPathId
        );

    MAP_TOOL_STATE.hoverPathId = null;
    MAP_TOOL_STATE.hoverDeletePoint = null;

    if (
        MAP_TOOL_STATE.drawings.length !==
        before
    ) {
        saveMapToolState();
        draw();
        return true;
    }

    return false;
}

function deleteHoveredMapToolShape() {
    const type =
        MAP_TOOL_STATE.hoverShapeType;

    const id =
        MAP_TOOL_STATE.hoverShapeId;

    const collectionName =
        type === 'zone'
            ? 'zones'
            : type === 'polygon'
                ? 'polygons'
                : null;

    if (!collectionName || !id) {
        return false;
    }

    const collection =
        MAP_TOOL_STATE[collectionName];

    if (
        !collection.some(
            item =>
                item.id === id
        )
    ) {
        return false;
    }

    pushMapToolHistory();

    MAP_TOOL_STATE[collectionName] =
        collection.filter(
            item =>
                item.id !== id
        );

    setMapToolShapeHover(null);
    saveMapToolState();
    draw();
    return true;
}

function getHoveredMapToolMarker() {
    if (!MAP_TOOL_STATE.hoverMarkerId) {
        return null;
    }

    return (
        MAP_TOOL_STATE.markers.find(
            item =>
                item.id ===
                MAP_TOOL_STATE.hoverMarkerId
        ) || null
    );
}

function deleteHoveredMapToolMarker() {
    if (!MAP_TOOL_STATE.hoverMarkerId) {
        return false;
    }

    const before =
        MAP_TOOL_STATE.markers.length;

    pushMapToolHistory();

    MAP_TOOL_STATE.markers =
        MAP_TOOL_STATE.markers.filter(
            item =>
                item.id !==
                MAP_TOOL_STATE.hoverMarkerId
        );

    MAP_TOOL_STATE.hoverMarkerId = null;

    if (
        MAP_TOOL_STATE.markers.length !==
        before
    ) {
        saveMapToolState();
        draw();
        return true;
    }

    return false;
}

function getMapToolMarkerScreenGeometry(item) {
    const asset =
        getMarkerAsset(item.icon);

    if (!asset) {
        return null;
    }

    const center =
        toScreen(
            item.x,
            item.y
        );

    const width = asset.width;
    const height = asset.height;

    const left =
        center.x -
        width * asset.anchorX;

    const top =
        center.y -
        height * asset.anchorY;

    return {
        center,
        width,
        height,
        left,
        top,
        right: left + width,
        bottom: top + height,
        deleteX: left + width + 3,
        deleteY: top - 3
    };
}

function findMapToolMarkerAtCanvasPoint(
    canvasX,
    canvasY
) {
    let best = null;

    MAP_TOOL_STATE.markers
        .filter(
            item =>
                item.mapId ===
                currentMapToolMapId()
        )
        .forEach(item => {
            const geometry =
                getMapToolMarkerScreenGeometry(item);

            if (!geometry) {
                return;
            }

            const padding = 8;

            if (
                canvasX >= geometry.left - padding &&
                canvasX <= geometry.right + padding &&
                canvasY >= geometry.top - padding &&
                canvasY <= geometry.bottom + padding
            ) {
                const distance =
                    Math.hypot(
                        canvasX - geometry.center.x,
                        canvasY - geometry.center.y
                    );

                if (
                    !best ||
                    distance < best.distance
                ) {
                    best = {
                        id: item.id,
                        distance
                    };
                }
            }
        });

    return best;
}

function setMapToolMarkerHover(hit) {
    const nextId =
        hit?.id || null;

    if (
        nextId ===
        MAP_TOOL_STATE.hoverMarkerId
    ) {
        return false;
    }

    MAP_TOOL_STATE.hoverMarkerId =
        nextId;

    return true;
}

function updateMapToolMarkerHover(event) {
    const rect =
        c.getBoundingClientRect();

    const hit =
        findMapToolMarkerAtCanvasPoint(
            event.clientX - rect.left,
            event.clientY - rect.top
        );

    if (setMapToolMarkerHover(hit)) {
        draw();
    }
}

function handleMapToolMouseDown(
    event,
    world
) {
    if (
        event.button !== 0 ||
        !MAP_TOOL_STATE.tool
    ) {
        return false;
    }

    if (
        MAP_TOOL_STATE.tool === 'eraser'
    ) {
        const rect =
            c.getBoundingClientRect();

        eraseMapToolItemAtCanvasPoint(
            event.clientX - rect.left,
            event.clientY - rect.top
        );

        return true;
    }

    if (
        MAP_TOOL_STATE.tool === 'marker' &&
        MAP_TOOL_STATE.hoverMarkerId
    ) {
        const item =
            getHoveredMapToolMarker();

        const geometry =
            item
                ? getMapToolMarkerScreenGeometry(item)
                : null;

        if (geometry) {
            const rect =
                c.getBoundingClientRect();

            const mouseX =
                event.clientX - rect.left;

            const mouseY =
                event.clientY - rect.top;

            if (
                Math.hypot(
                    mouseX - geometry.deleteX,
                    mouseY - geometry.deleteY
                ) <= 12
            ) {
                deleteHoveredMapToolMarker();
                return true;
            }
        }
    }

    if (!isWorldPointInsideMap(world)) {
        return true;
    }

    if (
        MAP_TOOL_STATE.tool === 'ruler'
    ) {
        MAP_TOOL_STATE.rulerStart = {
            x: world.x,
            y: world.y
        };
        MAP_TOOL_STATE.rulerEnd = {
            x: world.x,
            y: world.y
        };
        MAP_TOOL_STATE.rulerDragging = true;
        draw();
        return true;
    }

    if (
        MAP_TOOL_STATE.tool === 'pencil'
    ) {
        const path = {
            id: mapToolId(),
            mapId: currentMapToolMapId(),
            color: MAP_TOOL_STATE.pencilColor,
            points: []
        };

        MAP_TOOL_STATE.activePath =
            path;
        MAP_TOOL_STATE.pencilDragging =
            true;

        addPencilPoint(world);
        draw();
        return true;
    }

    if (
        MAP_TOOL_STATE.tool === 'zone'
    ) {
        MAP_TOOL_STATE.zoneStart = {
            x: world.x,
            y: world.y
        };

        MAP_TOOL_STATE.zoneEnd = {
            x: world.x,
            y: world.y
        };

        MAP_TOOL_STATE.zoneDragging = true;
        draw();
        return true;
    }

    if (
        MAP_TOOL_STATE.tool === 'polygon'
    ) {
        return addPolygonPoint(
            world
        );
    }

    if (
        MAP_TOOL_STATE.tool === 'marker'
    ) {
        placeMapToolMarker(world);
        return true;
    }

    return false;
}

function handleMapToolMouseMove(
    event,
    world
) {
    if (!MAP_TOOL_STATE.tool) {
        return false;
    }

    if (
        MAP_TOOL_STATE.tool === 'ruler' &&
        MAP_TOOL_STATE.rulerDragging
    ) {
        MAP_TOOL_STATE.rulerEnd = {
            x: world.x,
            y: world.y
        };
        draw();
        return true;
    }

    if (
        MAP_TOOL_STATE.tool === 'pencil'
    ) {
        if (
            MAP_TOOL_STATE.pencilDragging
        ) {
            if (
                isWorldPointInsideMap(world)
            ) {
                addPencilPoint(world);
            }

            draw();
            return true;
        }

        return false;
    }

    if (
        MAP_TOOL_STATE.tool === 'zone' &&
        MAP_TOOL_STATE.zoneDragging
    ) {
        if (
            isWorldPointInsideMap(world)
        ) {
            MAP_TOOL_STATE.zoneEnd = {
                x: world.x,
                y: world.y
            };
        }

        draw();
        return true;
    }

    if (
        MAP_TOOL_STATE.tool === 'polygon' &&
        MAP_TOOL_STATE.polygonDraft
    ) {
        MAP_TOOL_STATE.polygonHover =
            isWorldPointInsideMap(world)
                ? {
                    x: world.x,
                    y: world.y
                }
                : null;

        draw();
        return true;
    }

    if (
        MAP_TOOL_STATE.tool === 'eraser'
    ) {
        const rect =
            c.getBoundingClientRect();

        const canvasX =
            event.clientX - rect.left;

        const canvasY =
            event.clientY - rect.top;

        const markerHit =
            findMapToolMarkerAtCanvasPoint(
                canvasX,
                canvasY
            );

        const markerChanged =
            setMapToolMarkerHover(
                markerHit
            );

        const pathHit =
            markerHit
                ? null
                : findPencilPathAtCanvasPoint(
                    canvasX,
                    canvasY
                );

        const previousPathId =
            MAP_TOOL_STATE.hoverPathId;

        setPencilPathHover(pathHit);

        const shapeHit =
            markerHit || pathHit
                ? null
                : findMapToolShapeAtCanvasPoint(
                    canvasX,
                    canvasY
                );

        const shapeChanged =
            setMapToolShapeHover(
                shapeHit
            );

        if (
            markerChanged ||
            shapeChanged ||
            previousPathId !==
            MAP_TOOL_STATE.hoverPathId
        ) {
            draw();
        }

        return false;
    }

    if (
        MAP_TOOL_STATE.tool === 'marker'
    ) {
        updateMapToolMarkerHover(event);
        return false;
    }

    return false;
}

function handleMapToolMouseUp() {
    if (
        MAP_TOOL_STATE.rulerDragging
    ) {
        const start =
            MAP_TOOL_STATE.rulerStart;

        const end =
            MAP_TOOL_STATE.rulerEnd;

        MAP_TOOL_STATE.rulerDragging =
            false;
        MAP_TOOL_STATE.rulerStart =
            null;
        MAP_TOOL_STATE.rulerEnd =
            null;

        if (
            start &&
            end &&
            Math.hypot(
                end.x - start.x,
                end.y - start.y
            ) > 0
        ) {
            if (
                typeof trackAnalytics ===
                'function'
            ) {
                trackAnalytics(
                    'ruler-used',
                    {
                        map: S.map
                    }
                );
            }
        }

        draw();
        return true;
    }

    if (
        MAP_TOOL_STATE.pencilDragging
    ) {
        MAP_TOOL_STATE.pencilDragging =
            false;

        const path =
            MAP_TOOL_STATE.activePath;

        if (
            path &&
            path.points.length >= 2
        ) {
            pushMapToolHistory();
            MAP_TOOL_STATE.drawings.push(
                path
            );
            saveMapToolState();

            if (
                typeof trackAnalytics ===
                'function'
            ) {
                trackAnalytics(
                    'drawing-created',
                    {
                        map: S.map
                    }
                );
            }
        }

        MAP_TOOL_STATE.activePath =
            null;
        draw();
        return true;
    }

    if (
        MAP_TOOL_STATE.zoneDragging
    ) {
        return finishZoneDraft();
    }

    return false;
}

function pointToSegmentDistance(
    px,
    py,
    ax,
    ay,
    bx,
    by
) {
    const dx = bx - ax;
    const dy = by - ay;

    if (
        dx === 0 &&
        dy === 0
    ) {
        return {
            distance:
                Math.hypot(
                    px - ax,
                    py - ay
                ),
            t: 0
        };
    }

    const t =
        Math.max(
            0,
            Math.min(
                1,
                (
                    (px - ax) * dx +
                    (py - ay) * dy
                ) /
                (
                    dx * dx +
                    dy * dy
                )
            )
        );

    const x = ax + t * dx;
    const y = ay + t * dy;

    return {
        distance:
            Math.hypot(
                px - x,
                py - y
            ),
        t
    };
}

function updatePencilHover(event) {
    const rect =
        c.getBoundingClientRect();

    const hit =
        findPencilPathAtCanvasPoint(
            event.clientX - rect.left,
            event.clientY - rect.top
        );

    setPencilPathHover(hit);
    draw();
}

function drawMapToolZone(zone, preview = false) {
    if (
        !zone ||
        !Number.isFinite(zone.x) ||
        !Number.isFinite(zone.y) ||
        !Number.isFinite(zone.radius) ||
        zone.radius <= 0
    ) {
        return;
    }

    const center =
        worldToLocalScreen(
            zone.x,
            zone.y
        );

    const radius =
        zone.radius *
        view().scale;

    const hovered =
        MAP_TOOL_STATE.tool === 'eraser' &&
        MAP_TOOL_STATE.hoverShapeType === 'zone' &&
        MAP_TOOL_STATE.hoverShapeId === zone.id;

    const color =
        hovered
            ? '#d86666'
            : zone.color || '#d7a452';

    ctx.save();
    ctx.beginPath();
    ctx.arc(
        center.x,
        center.y,
        radius,
        0,
        Math.PI * 2
    );
    ctx.fillStyle =
        hexToRgba(
            color,
            preview ? 0.08 : 0.14
        );
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = hovered ? 3 : 2;
    ctx.setLineDash(
        preview
            ? [5, 4]
            : [7, 5]
    );
    ctx.stroke();
    ctx.setLineDash([]);

    if (preview) {
        ctx.beginPath();
        ctx.arc(
            center.x,
            center.y,
            3,
            0,
            Math.PI * 2
        );
        ctx.fillStyle = color;
        ctx.fill();
    }

    ctx.restore();
}

function drawMapToolZones() {
    MAP_TOOL_STATE.zones
        .filter(
            zone =>
                zone.mapId ===
                currentMapToolMapId()
        )
        .forEach(
            zone =>
                drawMapToolZone(zone)
        );

    if (
        MAP_TOOL_STATE.zoneDragging &&
        MAP_TOOL_STATE.zoneStart &&
        MAP_TOOL_STATE.zoneEnd
    ) {
        drawMapToolZone(
            {
                id: 'active-zone',
                mapId: currentMapToolMapId(),
                color: MAP_TOOL_STATE.pencilColor,
                x: MAP_TOOL_STATE.zoneStart.x,
                y: MAP_TOOL_STATE.zoneStart.y,
                radius: Math.hypot(
                    MAP_TOOL_STATE.zoneEnd.x -
                        MAP_TOOL_STATE.zoneStart.x,
                    MAP_TOOL_STATE.zoneEnd.y -
                        MAP_TOOL_STATE.zoneStart.y
                )
            },
            true
        );
    }
}

function drawMapToolPolygon(
    polygon,
    {
        draft = false,
        hoverPoint = null
    } = {}
) {
    if (
        !polygon ||
        !Array.isArray(polygon.points) ||
        !polygon.points.length
    ) {
        return;
    }

    const points = [
        ...polygon.points
    ];

    if (draft && hoverPoint) {
        points.push(
            hoverPoint
        );
    }

    const screenPoints =
        points.map(
            point =>
                worldToLocalScreen(
                    point.x,
                    point.y
                )
        );

    const hovered =
        MAP_TOOL_STATE.tool === 'eraser' &&
        MAP_TOOL_STATE.hoverShapeType === 'polygon' &&
        MAP_TOOL_STATE.hoverShapeId === polygon.id;

    const color =
        hovered
            ? '#d86666'
            : polygon.color || '#d7a452';

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(
        screenPoints[0].x,
        screenPoints[0].y
    );

    for (
        let index = 1;
        index < screenPoints.length;
        index++
    ) {
        ctx.lineTo(
            screenPoints[index].x,
            screenPoints[index].y
        );
    }

    if (!draft && polygon.points.length >= 3) {
        ctx.closePath();
        ctx.fillStyle =
            hexToRgba(
                color,
                0.15
            );
        ctx.fill();
    } else if (
        draft &&
        polygon.points.length >= 3
    ) {
        ctx.lineTo(
            screenPoints[0].x,
            screenPoints[0].y
        );
        ctx.fillStyle =
            hexToRgba(
                color,
                0.08
            );
        ctx.fill();
    }

    ctx.strokeStyle = color;
    ctx.lineWidth = hovered ? 3 : 2;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.setLineDash(
        draft
            ? [5, 4]
            : []
    );
    ctx.stroke();
    ctx.setLineDash([]);

    if (draft) {
        polygon.points.forEach(
            (point, index) => {
                const screen =
                    worldToLocalScreen(
                        point.x,
                        point.y
                    );

                ctx.beginPath();
                ctx.arc(
                    screen.x,
                    screen.y,
                    index === 0 ? 5 : 3.5,
                    0,
                    Math.PI * 2
                );
                ctx.fillStyle =
                    index === 0
                        ? '#ffffff'
                        : color;
                ctx.fill();
                ctx.strokeStyle = color;
                ctx.lineWidth = 1.5;
                ctx.stroke();
            }
        );
    }

    ctx.restore();
}

function drawMapToolPolygons() {
    MAP_TOOL_STATE.polygons
        .filter(
            polygon =>
                polygon.mapId ===
                currentMapToolMapId()
        )
        .forEach(
            polygon =>
                drawMapToolPolygon(
                    polygon
                )
        );

    if (
        MAP_TOOL_STATE.polygonDraft &&
        MAP_TOOL_STATE.polygonDraft.mapId ===
            currentMapToolMapId()
    ) {
        drawMapToolPolygon(
            MAP_TOOL_STATE.polygonDraft,
            {
                draft: true,
                hoverPoint:
                    MAP_TOOL_STATE.polygonHover
            }
        );
    }
}

function drawMapToolPath(path) {
    if (
        !path ||
        !Array.isArray(path.points) ||
        path.points.length < 2
    ) {
        return;
    }

    ctx.save();
    ctx.beginPath();

    path.points.forEach(
        (point, index) => {
            const screen =
                worldToLocalScreen(
                    point.x,
                    point.y
                );

            if (index === 0) {
                ctx.moveTo(
                    screen.x,
                    screen.y
                );
            } else {
                ctx.lineTo(
                    screen.x,
                    screen.y
                );
            }
        }
    );

    ctx.strokeStyle =
        path.color || '#d7a452';
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.restore();
}

function drawMapToolDrawings() {
    MAP_TOOL_STATE.drawings
        .filter(
            path =>
                path.mapId ===
                currentMapToolMapId()
        )
        .forEach(drawMapToolPath);

    if (
        MAP_TOOL_STATE.activePath &&
        MAP_TOOL_STATE.activePath.mapId ===
        currentMapToolMapId()
    ) {
        drawMapToolPath(
            MAP_TOOL_STATE.activePath
        );
    }
}

function drawMapToolMarker(item) {
    const asset =
        getMarkerAsset(item.icon);

    if (!asset) {
        return;
    }

    const entry =
        loadMarkerImage(asset);

    if (
        !entry ||
        !entry.loaded ||
        entry.failed
    ) {
        return;
    }

    const pos =
        worldToLocalScreen(
            item.x,
            item.y
        );

    const width =
        asset.width;
    const height =
        asset.height;

    ctx.save();

    ctx.filter =
        getMapIconCanvasFilter();

    ctx.drawImage(
        entry.image,
        pos.x - width * asset.anchorX,
        pos.y - height * asset.anchorY,
        width,
        height
    );

    ctx.restore();
}

function drawMapToolMarkers() {
    MAP_TOOL_STATE.markers
        .filter(
            marker =>
                marker.mapId ===
                currentMapToolMapId()
        )
        .forEach(drawMapToolMarker);
}

function formatRulerDistance(distanceWorld) {
    const meters =
        worldDistanceToMeters(distanceWorld);

    const distanceKm =
        meters / 1000;

    if (meters < 1000) {
        return `${Math.round(meters)} m`;
    }

    return `${distanceKm.toFixed(2)} km · ${Math.round(meters)} m`;
}

function getRulerBearing(start, end) {
    const dx =
        end.x - start.x;

    const dy =
        end.y - start.y;

    let angle =
        Math.atan2(
            dx,
            dy
        ) *
        180 /
        Math.PI;

    if (angle < 0) {
        angle += 360;
    }

    return angle;
}

function drawRulerOverlay() {
    if (
        !MAP_TOOL_STATE.rulerDragging ||
        !MAP_TOOL_STATE.rulerStart ||
        !MAP_TOOL_STATE.rulerEnd
    ) {
        return;
    }

    const start =
        worldToLocalScreen(
            MAP_TOOL_STATE.rulerStart.x,
            MAP_TOOL_STATE.rulerStart.y
        );
    const end =
        worldToLocalScreen(
            MAP_TOOL_STATE.rulerEnd.x,
            MAP_TOOL_STATE.rulerEnd.y
        );

    const distance =
        Math.hypot(
            MAP_TOOL_STATE.rulerEnd.x -
            MAP_TOOL_STATE.rulerStart.x,
            MAP_TOOL_STATE.rulerEnd.y -
            MAP_TOOL_STATE.rulerStart.y
        );

    ctx.save();
    ctx.strokeStyle = '#d7a452';
    ctx.fillStyle = '#d7a452';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 5]);

    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
    ctx.setLineDash([]);

    [start, end].forEach(point => {
        ctx.beginPath();
        ctx.arc(
            point.x,
            point.y,
            4,
            0,
            Math.PI * 2
        );
        ctx.fill();
    });

    const bearing =
        getRulerBearing(
            MAP_TOOL_STATE.rulerStart,
            MAP_TOOL_STATE.rulerEnd
        );

    const label =
        `${formatRulerDistance(distance)} · ${bearing.toFixed(1)}°`;

    const midX =
        (start.x + end.x) / 2;
    const midY =
        (start.y + end.y) / 2;

    ctx.font =
        'bold 12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const metrics =
        ctx.measureText(label);
    const width =
        metrics.width + 16;
    const height = 26;

    ctx.fillStyle =
        'rgba(16, 19, 22, .92)';
    ctx.fillRect(
        midX - width / 2,
        midY - height / 2 - 12,
        width,
        height
    );

    ctx.strokeStyle =
        'rgba(255,255,255,.14)';
    ctx.strokeRect(
        midX - width / 2,
        midY - height / 2 - 12,
        width,
        height
    );

    ctx.fillStyle = '#e7edf2';
    ctx.fillText(
        label,
        midX,
        midY - 12
    );

    ctx.restore();
}

function drawEraserAffordance() {
    if (
        MAP_TOOL_STATE.tool !== 'eraser' ||
        !MAP_TOOL_STATE.hoverPathId ||
        !MAP_TOOL_STATE.hoverDeletePoint ||
        MAP_TOOL_STATE.pencilDragging
    ) {
        return;
    }

    const point =
        worldToLocalScreen(
            MAP_TOOL_STATE.hoverDeletePoint.x,
            MAP_TOOL_STATE.hoverDeletePoint.y
        );

    ctx.save();

    ctx.beginPath();
    ctx.arc(
        point.x,
        point.y,
        10,
        0,
        Math.PI * 2
    );
    ctx.fillStyle =
        'rgba(16, 19, 22, .95)';
    ctx.fill();
    ctx.strokeStyle = '#d86666';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.strokeStyle = '#d86666';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';

    ctx.beginPath();
    ctx.moveTo(
        point.x - 3.5,
        point.y - 3.5
    );
    ctx.lineTo(
        point.x + 3.5,
        point.y + 3.5
    );
    ctx.moveTo(
        point.x + 3.5,
        point.y - 3.5
    );
    ctx.lineTo(
        point.x - 3.5,
        point.y + 3.5
    );
    ctx.stroke();

    ctx.restore();
}

function drawMarkerDeleteAffordance() {
    if (
        !['marker', 'eraser'].includes(
            MAP_TOOL_STATE.tool
        ) ||
        !MAP_TOOL_STATE.hoverMarkerId
    ) {
        return;
    }

    const item =
        getHoveredMapToolMarker();

    const geometry =
        item
            ? getMapToolMarkerScreenGeometry(item)
            : null;

    if (!geometry) {
        return;
    }

    const v = view();

    const point = {
        x: geometry.deleteX - v.left,
        y: geometry.deleteY - v.top
    };

    ctx.save();

    ctx.beginPath();
    ctx.arc(
        point.x,
        point.y,
        10,
        0,
        Math.PI * 2
    );
    ctx.fillStyle =
        'rgba(16, 19, 22, .95)';
    ctx.fill();
    ctx.strokeStyle = '#d86666';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.strokeStyle = '#d86666';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';

    ctx.beginPath();
    ctx.moveTo(
        point.x - 3.5,
        point.y - 3.5
    );
    ctx.lineTo(
        point.x + 3.5,
        point.y + 3.5
    );
    ctx.moveTo(
        point.x + 3.5,
        point.y - 3.5
    );
    ctx.lineTo(
        point.x - 3.5,
        point.y + 3.5
    );
    ctx.stroke();

    ctx.restore();
}

function drawCoordinateSearchPoint() {
    const point = MAP_TOOL_STATE.searchPoint;

    if (!point || !isWorldPointInsideMap(point)) {
        return;
    }

    const pos = worldToLocalScreen(point.x, point.y);

    ctx.save();
    ctx.strokeStyle = '#d7a452';
    ctx.fillStyle = 'rgba(215,164,82,.16)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(pos.x - 18, pos.y);
    ctx.lineTo(pos.x + 18, pos.y);
    ctx.moveTo(pos.x, pos.y - 18);
    ctx.lineTo(pos.x, pos.y + 18);
    ctx.stroke();
    ctx.restore();
}

function drawMapToolTransient() {
    drawCoordinateSearchPoint();
    drawRulerOverlay();
    drawEraserAffordance();
    drawMarkerDeleteAffordance();
}
