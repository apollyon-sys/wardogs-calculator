/* =========================
   MAP TOOLS
   ========================= */

const MAP_TOOLS_STORAGE_KEY =
    'wardogs-map-tools';

const MAP_TOOLS_EXPORT_TYPE =
    'wardogs-map-changes';

const MAP_TOOLS_EXPORT_VERSION = 1;

const MAP_TOOLS_IMPORT_LIMITS = {
    drawings: 2000,
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

    drawings: [],
    markers: [],

    hoverPathId: null,
    hoverDeletePoint: null,
    hoverMarkerId: null,

    rotationDrag: null,
    wheelRotation: null,
    moveDrag: null,

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
        fobAreas: true,
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

/*
 * Marker rotation is degrees clockwise, wrapped into [0, 360). Anything
 * unusable — a missing field on an older marker, a hand-edited import —
 * becomes 0, which is the axis-aligned square markers had before.
 */
function normalizeMarkerRotation(value) {
    const degrees = Number(value);

    if (!Number.isFinite(degrees)) {
        return 0;
    }

    return (
        (degrees % 360) + 360
    ) % 360;
}

function snapshotMapToolContent() {
    return {
        mapId: currentMapToolMapId(),
        drawings: structuredClone(MAP_TOOL_STATE.drawings),
        markers: structuredClone(MAP_TOOL_STATE.markers),
        origin: structuredClone(S.origin),
        target: structuredClone(S.target),
        mode: S.mode
    };
}

function updateMapToolHistoryUI() {
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
    MAP_TOOL_STATE.hoverMarkerId = null;
    MAP_TOOL_STATE.rotationDrag = null;
    MAP_TOOL_STATE.moveDrag = null;

    saveMapToolState();
    inputs();
    renderSavedTargets();
    updateMapToolHistoryUI();
}

function pushMapToolHistory() {
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
    /*
     * A wheel burst only lands when it goes quiet, so close any burst
     * still in flight before undoing — otherwise the undo targets a
     * rotation that has not been recorded yet.
     */
    flushMarkerWheelRotation();

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
    flushMarkerWheelRotation();

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
    return String(event.key || '').toLowerCase() === key &&
        event.ctrlKey === parts.includes('ctrl') &&
        event.metaKey === parts.includes('meta') &&
        event.altKey === parts.includes('alt') &&
        event.shiftKey === parts.includes('shift');
}

function saveMapToolState() {
    try {
        localStorage.setItem(
            MAP_TOOLS_STORAGE_KEY,
            JSON.stringify({
                drawings: MAP_TOOL_STATE.drawings,
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
        y: Number(marker.y),
        rotation: normalizeMarkerRotation(marker.rotation)
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

    const markers = Array.isArray(source.markers)
        ? source.markers
            .slice(0, MAP_TOOLS_IMPORT_LIMITS.markers)
            .map(normalizeImportedMapToolMarker)
            .filter(Boolean)
        : [];

    const layers = normalizeImportedMapLayers(source.layers);

    if (!drawings.length && !markers.length && !layers) {
        throw new Error('No supported map changes found');
    }

    return { drawings, markers, layers };
}

function applyImportedMapToolChanges(imported) {
    if (imported.drawings.length || imported.markers.length) {
        pushMapToolHistory();
    }

    MAP_TOOL_STATE.drawings.push(...imported.drawings);
    MAP_TOOL_STATE.markers.push(...imported.markers);

    if (imported.layers) {
        MAP_TOOL_STATE.layers = {
            ...MAP_TOOL_STATE.layers,
            ...imported.layers
        };
    }

    MAP_TOOL_STATE.hoverPathId = null;
    MAP_TOOL_STATE.hoverDeletePoint = null;
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
                markers: imported.markers.length,
                layers: Boolean(imported.layers)
            });
        }
    } catch (error) {
        console.warn('Failed to import map changes:', error);
        setMapDataTransferStatus('mapToolImportInvalid', true);
    }
}

function setMapTool(tool) {
    /* Leaving the marker tool ends any gesture still in progress. */
    flushMarkerWheelRotation();
    finishMarkerRotationDrag();
    finishMarkerMoveDrag();

    MAP_TOOL_STATE.tool =
        MAP_TOOL_STATE.tool === tool
            ? null
            : tool;

    MAP_TOOL_STATE.rulerStart = null;
    MAP_TOOL_STATE.rulerEnd = null;
    MAP_TOOL_STATE.rulerDragging = false;
    MAP_TOOL_STATE.pencilDragging = false;
    MAP_TOOL_STATE.activePath = null;
    MAP_TOOL_STATE.hoverPathId = null;
    MAP_TOOL_STATE.hoverDeletePoint = null;
    MAP_TOOL_STATE.hoverMarkerId = null;

    updateMapToolsUI();
    draw();
}

function closeMapToolMenus(except = null) {
    ['pencilPalette', 'markerPicker', 'coordinateSearchPopover', 'mapLayersPopover', 'mapDataTransferPopover'].forEach(
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

    if (c) {
        c.classList.toggle(
            'map-tool-active',
            ['ruler', 'pencil', 'eraser', 'marker'].includes(MAP_TOOL_STATE.tool)
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

                MAP_TOOL_STATE.tool =
                    'pencil';

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
                ['fobAreas', 'mapLayerFobAreas'],
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
        fobAreas: `
            <path d="M5 19V9l7-4 7 4v10Z"/>
            <path d="M9.5 19v-5h5v5"/>
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

    const key = String(event.key || '').toLowerCase();
    const shortcuts = {
        ruler: getMapToolShortcut('ruler'),
        pencil: getMapToolShortcut('pencil'),
        eraser: getMapToolShortcut('eraser'),
        marker: getMapToolShortcut('marker'),
        coordinateSearch: getMapToolShortcut('coordinateSearch'),
        layers: getMapToolShortcut('layers'),
        clearTool: getMapToolShortcut('clearTool')
    };

    if (key === shortcuts.clearTool) {
        MAP_TOOL_STATE.tool = null;
        MAP_TOOL_STATE.searchPoint = null;
        closeMapToolMenus();
        updateMapToolsUI();
        draw();
        return true;
    }

    if (key === shortcuts.ruler) {
        closeMapToolMenus();
        setMapTool('ruler');
        return true;
    }

    if (key === shortcuts.pencil) {
        MAP_TOOL_STATE.tool = 'pencil';
        updateMapToolsUI();
        toggleMapToolMenu('pencilPalette');
        return true;
    }

    if (key === shortcuts.eraser) {
        closeMapToolMenus();
        setMapTool('eraser');
        return true;
    }

    if (key === shortcuts.marker) {
        MAP_TOOL_STATE.tool = 'marker';
        updateMapToolsUI();
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
    ensureMapHistoryTools();

    const undoButton =
        $('mapToolUndoButton');

    const redoButton =
        $('mapToolRedoButton');

    const rulerButton = $('mapToolRuler');
    const pencilButton = $('mapToolPencil');
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

            if (
                MAP_TOOL_STATE.tool !==
                'pencil'
            ) {
                MAP_TOOL_STATE.tool =
                    'pencil';
                updateMapToolsUI();
            }

            toggleMapToolMenu(
                'pencilPalette'
            );
        }
    );

    eraserButton?.addEventListener(
        'click',
        event => {
            event.stopPropagation();
            closeMapToolMenus();
            setMapTool('eraser');
        }
    );

    markerButton?.addEventListener(
        'click',
        event => {
            event.stopPropagation();

            if (
                MAP_TOOL_STATE.tool ===
                'marker' &&
                isMapToolMenuOpen(
                    'markerPicker'
                )
            ) {
                closeMapToolMenus();
                setMapTool('marker');
                return;
            }

            if (
                MAP_TOOL_STATE.tool !==
                'marker'
            ) {
                MAP_TOOL_STATE.tool =
                    'marker';
                updateMapToolsUI();
            }

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

/* =========================
   FOB BUILD AREAS
   ========================= */

/*
 * A FOB's build area is a square around the icon rather than a circle,
 * and it belongs to the marker rather than being its own object: place
 * the FOB icon and the area comes with it. Its one adjustable property,
 * `rotation`, lives on that marker too, so persistence, undo and export
 * all come for free from the marker it hangs off.
 */
function drawFobBuildAreas() {

    const config =
        getRingConfig('fob');

    if (!config) {
        return;
    }

    MAP_TOOL_STATE.markers
        .filter(
            marker =>
                marker.icon === 'fob' &&
                marker.mapId ===
                currentMapToolMapId()
        )
        .forEach(
            marker => {

                drawRadiusSquare(
                    marker.x,
                    marker.y,
                    config.size,
                    config.color,
                    normalizeMarkerRotation(
                        marker.rotation
                    )
                );
            }
        );
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
        return deleteHoveredMapToolMarker();
    }

    const pathHit =
        findPencilPathAtCanvasPoint(
            canvasX,
            canvasY
        );

    setPencilPathHover(pathHit);

    if (!pathHit) {
        draw();
        return false;
    }

    return deleteHoveredPencilPath();
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
        deleteY: top - 3,
        rotateX: left - 3,
        rotateY: top - 3
    };
}

/*
 * Only the FOB's square turns, so only a FOB gets a grip. Anything else
 * would offer a control with nothing to show for it.
 */
function markerSupportsRotation(item) {
    return Boolean(item) && item.icon === 'fob';
}

function getRotatableMarkerAtCanvasPoint(
    canvasX,
    canvasY
) {
    const hit =
        findMapToolMarkerAtCanvasPoint(
            canvasX,
            canvasY
        );

    if (!hit) {
        return null;
    }

    const item =
        MAP_TOOL_STATE.markers.find(
            marker => marker.id === hit.id
        );

    return markerSupportsRotation(item)
        ? item
        : null;
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

/* =========================
   MARKER ROTATION
   ========================= */

/*
 * Rotating is deliberately hard to trigger by accident: it only works
 * while the marker tool is active, and only on the FOB under the cursor.
 * In every other mode the wheel keeps zooming the way it always has.
 *
 * A gesture — one wheel burst, one drag of the grip — pushes history once
 * at its start and saves once at its end, so spinning a square does not
 * fill the undo stack.
 */
const MARKER_ROTATION_WHEEL_STEP = 1;
const MARKER_ROTATION_SNAP_STEP = 15;
const MARKER_ROTATION_COMMIT_DELAY_MS = 400;

function getMarkerRotation(item) {
    return normalizeMarkerRotation(item?.rotation);
}

function setMarkerRotation(item, degrees) {
    const next =
        normalizeMarkerRotation(degrees);

    if (getMarkerRotation(item) === next) {
        return false;
    }

    item.rotation = next;

    return true;
}

/*
 * `startRotation` is the angle the gesture began at: a gesture that ends
 * back where it started — a click on the grip that never moved — saves
 * nothing.
 */
function commitMarkerRotation(item, startRotation) {
    if (
        !item ||
        getMarkerRotation(item) === startRotation
    ) {
        return;
    }

    saveMapToolState();
}

/*
 * The grip sits above the icon, so a pointer straight up from the centre
 * reads as 0° — the same zero the square uses.
 */
function pointerAngleDegrees(center, canvasX, canvasY) {
    return normalizeMarkerRotation(
        Math.atan2(
            canvasY - center.y,
            canvasX - center.x
        ) *
        180 /
        Math.PI +
        90
    );
}

function snapMarkerRotation(degrees) {
    return normalizeMarkerRotation(
        Math.round(
            degrees / MARKER_ROTATION_SNAP_STEP
        ) *
        MARKER_ROTATION_SNAP_STEP
    );
}

function findMarkerRotationGripAtCanvasPoint(
    canvasX,
    canvasY
) {
    if (
        MAP_TOOL_STATE.tool !== 'marker' ||
        !MAP_TOOL_STATE.hoverMarkerId
    ) {
        return null;
    }

    const item =
        getHoveredMapToolMarker();

    if (!markerSupportsRotation(item)) {
        return null;
    }

    const geometry =
        getMapToolMarkerScreenGeometry(item);

    if (!geometry) {
        return null;
    }

    return Math.hypot(
        canvasX - geometry.rotateX,
        canvasY - geometry.rotateY
    ) <= 12
        ? { item, geometry }
        : null;
}

function findMarkerById(id) {
    return (
        MAP_TOOL_STATE.markers.find(
            marker => marker.id === id
        ) || null
    );
}

/*
 * History is taken on the first tick that actually moves the square, not
 * when the gesture opens: grabbing the grip and letting go without turning
 * anything should leave the undo stack alone.
 */
function rotateMarkerDuringGesture(gesture, item, degrees) {
    if (
        getMarkerRotation(item) ===
        normalizeMarkerRotation(degrees)
    ) {
        return;
    }

    if (!gesture.historyPushed) {
        gesture.historyPushed = true;
        pushMapToolHistory();
    }

    setMarkerRotation(item, degrees);
    draw();
}

function beginMarkerRotationDrag(hit, canvasX, canvasY) {
    MAP_TOOL_STATE.rotationDrag = {
        id: hit.item.id,
        start: getMarkerRotation(hit.item),
        historyPushed: false,
        offset:
            getMarkerRotation(hit.item) -
            pointerAngleDegrees(
                hit.geometry.center,
                canvasX,
                canvasY
            )
    };

    draw();
}

function updateMarkerRotationDrag(event) {
    const gesture =
        MAP_TOOL_STATE.rotationDrag;

    if (!gesture) {
        return false;
    }

    const item =
        findMarkerById(gesture.id);

    if (!item) {
        MAP_TOOL_STATE.rotationDrag = null;
        return false;
    }

    const geometry =
        getMapToolMarkerScreenGeometry(item);

    if (!geometry) {
        return true;
    }

    const rect =
        c.getBoundingClientRect();

    const next =
        pointerAngleDegrees(
            geometry.center,
            event.clientX - rect.left,
            event.clientY - rect.top
        ) +
        gesture.offset;

    rotateMarkerDuringGesture(
        gesture,
        item,
        event.shiftKey
            ? snapMarkerRotation(next)
            : next
    );

    return true;
}

function finishMarkerRotationDrag() {
    const gesture =
        MAP_TOOL_STATE.rotationDrag;

    if (!gesture) {
        return false;
    }

    MAP_TOOL_STATE.rotationDrag = null;

    commitMarkerRotation(
        findMarkerById(gesture.id),
        gesture.start
    );

    draw();

    return true;
}

function resetMarkerRotation(item) {
    if (getMarkerRotation(item) === 0) {
        return;
    }

    const start =
        getMarkerRotation(item);

    pushMapToolHistory();
    setMarkerRotation(item, 0);
    commitMarkerRotation(item, start);
    draw();
}

/* =========================
   MARKER MOVING
   ========================= */

/*
 * Pressing on a marker that is already on the map picks it up instead of
 * dropping a second one at the same spot. Like rotation, a move is one
 * gesture: history is taken on the first pixel that actually moves it,
 * and the save happens once on release. A press that never moves
 * therefore changes nothing at all.
 */
function beginMarkerMoveDrag(item, world) {
    MAP_TOOL_STATE.moveDrag = {
        id: item.id,
        start: {
            x: item.x,
            y: item.y
        },
        offset: {
            x: item.x - world.x,
            y: item.y - world.y
        },
        historyPushed: false
    };

    draw();
}

function updateMarkerMoveDrag(world) {
    const gesture =
        MAP_TOOL_STATE.moveDrag;

    if (!gesture) {
        return false;
    }

    const item =
        findMarkerById(gesture.id);

    if (!item) {
        MAP_TOOL_STATE.moveDrag = null;
        return false;
    }

    const next = {
        x: world.x + gesture.offset.x,
        y: world.y + gesture.offset.y
    };

    /*
     * Dragging past the edge leaves the marker at the last good spot
     * rather than following the cursor off the map.
     */
    if (
        !isWorldPointInsideMap(next) ||
        (
            next.x === item.x &&
            next.y === item.y
        )
    ) {
        return true;
    }

    if (!gesture.historyPushed) {
        gesture.historyPushed = true;
        pushMapToolHistory();
    }

    item.x = next.x;
    item.y = next.y;

    draw();

    return true;
}

function finishMarkerMoveDrag() {
    const gesture =
        MAP_TOOL_STATE.moveDrag;

    if (!gesture) {
        return false;
    }

    MAP_TOOL_STATE.moveDrag = null;

    const item =
        findMarkerById(gesture.id);

    if (
        item &&
        (
            item.x !== gesture.start.x ||
            item.y !== gesture.start.y
        )
    ) {
        saveMapToolState();
    }

    draw();

    return true;
}

/*
 * Wheel ticks arrive one at a time, so a burst is stitched into a single
 * gesture: the first tick takes the history snapshot, and a short idle
 * afterwards saves the result.
 */
function flushMarkerWheelRotation() {
    const gesture =
        MAP_TOOL_STATE.wheelRotation;

    if (!gesture) {
        return;
    }

    clearTimeout(gesture.timer);

    MAP_TOOL_STATE.wheelRotation = null;

    commitMarkerRotation(
        findMarkerById(gesture.id),
        gesture.start
    );
}

function handleMapToolWheel(event) {
    if (MAP_TOOL_STATE.tool !== 'marker') {
        return false;
    }

    const rect =
        c.getBoundingClientRect();

    const item =
        getRotatableMarkerAtCanvasPoint(
            event.clientX - rect.left,
            event.clientY - rect.top
        );

    if (!item) {
        return false;
    }

    /*
     * Moving on to a different FOB ends the previous burst rather than
     * folding two markers into one gesture.
     */
    if (
        MAP_TOOL_STATE.wheelRotation &&
        MAP_TOOL_STATE.wheelRotation.id !== item.id
    ) {
        flushMarkerWheelRotation();
    }

    const gesture =
        MAP_TOOL_STATE.wheelRotation || {
            id: item.id,
            start: getMarkerRotation(item),
            historyPushed: false,
            timer: null
        };

    const direction =
        event.deltaY < 0
            ? 1
            : -1;

    const current =
        getMarkerRotation(item);

    rotateMarkerDuringGesture(
        gesture,
        item,
        event.shiftKey
            ? snapMarkerRotation(current) +
              direction * MARKER_ROTATION_SNAP_STEP
            : current +
              direction * MARKER_ROTATION_WHEEL_STEP
    );

    clearTimeout(gesture.timer);

    gesture.timer =
        setTimeout(
            flushMarkerWheelRotation,
            MARKER_ROTATION_COMMIT_DELAY_MS
        );

    MAP_TOOL_STATE.wheelRotation = gesture;

    return true;
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

            const gripHit =
                findMarkerRotationGripAtCanvasPoint(
                    mouseX,
                    mouseY
                );

            if (gripHit) {
                /*
                 * Second click of a double-click on the grip snaps the
                 * square back to straight.
                 */
                if (event.detail >= 2) {
                    resetMarkerRotation(gripHit.item);
                } else {
                    beginMarkerRotationDrag(
                        gripHit,
                        mouseX,
                        mouseY
                    );
                }

                return true;
            }

            const bodyHit =
                findMapToolMarkerAtCanvasPoint(
                    mouseX,
                    mouseY
                );

            if (
                bodyHit &&
                bodyHit.id === item.id
            ) {
                beginMarkerMoveDrag(
                    item,
                    world
                );

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

    if (MAP_TOOL_STATE.rotationDrag) {
        return updateMarkerRotationDrag(event);
    }

    if (MAP_TOOL_STATE.moveDrag) {
        return updateMarkerMoveDrag(world);
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

        if (
            markerChanged ||
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
    if (finishMarkerRotationDrag()) {
        return true;
    }

    if (finishMarkerMoveDrag()) {
        return true;
    }

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

/*
 * The rotate grip mirrors the delete badge on the other top corner, and
 * only appears with the marker tool active — the same gate the wheel uses,
 * so what you can see is exactly what you can do.
 */
function drawMarkerRotateAffordance() {
    const dragging =
        MAP_TOOL_STATE.rotationDrag;

    const item =
        dragging
            ? findMarkerById(dragging.id)
            : MAP_TOOL_STATE.tool === 'marker'
                ? getHoveredMapToolMarker()
                : null;

    if (!markerSupportsRotation(item)) {
        return;
    }

    const geometry =
        getMapToolMarkerScreenGeometry(item);

    if (!geometry) {
        return;
    }

    const v = view();

    const point = {
        x: geometry.rotateX - v.left,
        y: geometry.rotateY - v.top
    };

    const color =
        getRingConfig('fob')?.color ||
        '#5fa8d3';

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
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.strokeStyle = color;
    ctx.lineWidth = 1.75;
    ctx.lineCap = 'round';

    /* An open circle with an arrowhead: the usual "turn this" glyph. */
    ctx.beginPath();
    ctx.arc(
        point.x,
        point.y,
        4.5,
        Math.PI * 0.35,
        Math.PI * 2
    );
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(
        point.x + 1.5,
        point.y - 6.5
    );
    ctx.lineTo(
        point.x + 4.5,
        point.y - 4.5
    );
    ctx.lineTo(
        point.x + 6.5,
        point.y - 7.5
    );
    ctx.stroke();

    ctx.restore();

    if (
        !dragging &&
        getMarkerRotation(item) === 0
    ) {
        return;
    }

    ctx.save();

    ctx.font =
        '600 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    const label =
        `${Math.round(
            getMarkerRotation(item)
        )}°`;

    ctx.lineWidth = 3;
    ctx.strokeStyle =
        'rgba(0, 0, 0, 0.75)';
    ctx.strokeText(
        label,
        point.x,
        point.y + 12
    );

    ctx.fillStyle = color;
    ctx.fillText(
        label,
        point.x,
        point.y + 12
    );

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
    drawMarkerRotateAffordance();
}
