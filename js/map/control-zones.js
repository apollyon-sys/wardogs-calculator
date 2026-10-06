/* =========================
   CONTROL ZONE PRESETS
   ========================= */

const CONTROL_ZONE_STORAGE_KEY =
    'wardogs-control-zones-v1';

const CONTROL_ZONE_STATE = {
    initialized: false,
    selections: Object.create(null),
    uiKey: null
};

function getMapControlZones(map = getCurrentMap()) {
    if (!Array.isArray(map?.controlZones)) {
        return [];
    }

    return map.controlZones.filter(zone =>
        typeof zone?.id === 'string' &&
        zone.id.length > 0 &&
        typeof zone.labelKey === 'string' &&
        Number.isFinite(zone.x) &&
        Number.isFinite(zone.y) &&
        Number.isFinite(zone.radiusMeters) &&
        zone.radiusMeters > 0
    );
}

function getSelectedControlZone(map = getCurrentMap()) {
    const id = CONTROL_ZONE_STATE.selections[map?.id];
    return getMapControlZones(map).find(zone => zone.id === id) || null;
}

function loadControlZoneSelections() {
    CONTROL_ZONE_STATE.selections = Object.create(null);

    try {
        const saved = JSON.parse(
            localStorage.getItem(CONTROL_ZONE_STORAGE_KEY)
        );

        if (!saved?.selections || typeof saved.selections !== 'object') {
            return;
        }

        Object.entries(MAPS).forEach(([mapId, map]) => {
            const id = saved.selections[mapId];
            if (getMapControlZones(map).some(zone => zone.id === id)) {
                CONTROL_ZONE_STATE.selections[mapId] = id;
            }
        });
    } catch {
        // A disabled or damaged browser store must not prevent map loading.
    }
}

function selectControlZone(id) {
    const map = getCurrentMap();
    if (!map?.id || (id !== '' && !getMapControlZones(map).some(zone => zone.id === id))) {
        return false;
    }

    if (id === '') {
        delete CONTROL_ZONE_STATE.selections[map.id];
    } else {
        CONTROL_ZONE_STATE.selections[map.id] = id;
        MAP_TOOL_STATE.layers.controlZones = true;
        saveMapToolState();
    }

    try {
        localStorage.setItem(CONTROL_ZONE_STORAGE_KEY, JSON.stringify({
            selections: CONTROL_ZONE_STATE.selections
        }));
    } catch {
        // Keep the selection available for this session without persistence.
    }

    updateControlZoneSelect();
    draw();
    return true;
}

function updateControlZoneSelect() {
    const select = $('controlZoneSelect');
    if (!select) return;

    const map = getCurrentMap();
    const zones = getMapControlZones(map);
    const selected = getSelectedControlZone(map);
    const visible = isMapLayerVisible('controlZones');
    const catalogKey = `${map?.id || ''}:${LANG}`;

    // Keep the native select and its options stable while using arrow keys.
    if (select.dataset.controlZoneCatalog !== catalogKey) {
        const off = document.createElement('option');
        off.value = '';
        off.textContent = tr('controlZoneOff');
        const options = zones.map(zone => {
            const option = document.createElement('option');
            option.value = zone.id;
            option.textContent = `${tr(zone.labelKey)} · ${zone.radiusMeters} m`;
            if (zone.selectionWeight === 0) {
                option.textContent += ` · ${tr('controlZoneInactive')}`;
            }
            return option;
        });
        select.replaceChildren(off, ...options);
        select.dataset.controlZoneCatalog = catalogKey;
    }

    select.disabled = zones.length === 0;
    select.value = selected && visible ? selected.id : '';
    select.title = tr(selected && !visible ? 'controlZoneLayerHidden' : 'controlZoneHint');
    CONTROL_ZONE_STATE.uiKey = `${map?.id || ''}:${visible}`;
}

function initControlZones() {
    const select = $('controlZoneSelect');
    if (!select) return;

    if (!CONTROL_ZONE_STATE.initialized) {
        loadControlZoneSelections();
        select.addEventListener('change', () => selectControlZone(select.value));
        CONTROL_ZONE_STATE.initialized = true;
    }

    updateControlZoneSelect();
}

function drawSelectedControlZone(map, styles) {
    const visible = isMapLayerVisible('controlZones');
    const uiKey = `${map?.id || ''}:${visible}`;
    if (CONTROL_ZONE_STATE.initialized && CONTROL_ZONE_STATE.uiKey !== uiKey) {
        updateControlZoneSelect();
    }

    const zone = getSelectedControlZone(map);
    if (!visible || !zone) return;

    const v = view();
    const center = worldToLocalScreen(zone.x, zone.y);
    const radius = metersToWorldDistance(zone.radiusMeters) * v.scale;
    if (!Number.isFinite(radius) || radius <= 0 ||
        !Number.isFinite(center.x) || !Number.isFinite(center.y)) return;
    if (center.x + radius < -v.left || center.y + radius < -v.top ||
        center.x - radius > wrap.clientWidth - v.left ||
        center.y - radius > wrap.clientHeight - v.top) return;

    const accent = '#ffffff';
    // A dark backing keeps the white boundary and label readable in both themes.
    const panel = '#151a1d';
    const highContrast = document.documentElement.dataset.a11yHighContrast === 'true';
    ctx.save();
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = accent;
    ctx.globalAlpha = highContrast ? 0.12 : 0.07;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = panel;
    ctx.lineWidth = highContrast ? 6 : 4;
    ctx.stroke();
    ctx.strokeStyle = accent;
    ctx.lineWidth = highContrast ? 3 : 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(center.x - 5, center.y);
    ctx.lineTo(center.x + 5, center.y);
    ctx.moveTo(center.x, center.y - 5);
    ctx.lineTo(center.x, center.y + 5);
    ctx.stroke();

    if (radius >= 30) {
        const label = `${tr(zone.labelKey)} · ${zone.radiusMeters} m`;
        const textSize = document.documentElement.dataset.a11yTextSize;
        const fontSize = textSize === 'xl' ? 16 : textSize === 'large' ? 14 : 12;
        ctx.font = `600 ${fontSize}px system-ui`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const width = ctx.measureText(label).width + 14;
        const labelY = center.y - radius + fontSize + 3;
        ctx.fillStyle = panel;
        ctx.fillRect(center.x - width / 2, labelY - fontSize / 2 - 4, width, fontSize + 8);
        ctx.fillStyle = accent;
        ctx.fillText(label, center.x, labelY);
    }

    ctx.restore();
}
