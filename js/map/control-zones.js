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

// MI_UI_Zone_Circle inherits these values from MI_UI_Zone. The Canvas
// gradient approximates its SDF glow; thickness is normalized, not pixels.
const CONTROL_ZONE_MATERIAL = Object.freeze({
    innerOpacity: 0.128,
    innerGlowStrength: 0.609177,
    outerOpacity: 1,
    thickness: 0.001
});

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

    const highContrast = document.documentElement.dataset.a11yHighContrast === 'true';
    const outerRadius = radius + (highContrast ? 4 : 3);
    if (center.x + outerRadius < -v.left || center.y + outerRadius < -v.top ||
        center.x - outerRadius > wrap.clientWidth - v.left ||
        center.y - outerRadius > wrap.clientHeight - v.top) return;

    const accent = '#ffffff';
    // A dark backing keeps the white boundary and label readable in both themes.
    const panel = '#151a1d';
    const innerOpacity = highContrast ? 0.18 : CONTROL_ZONE_MATERIAL.innerOpacity;
    const edgeOpacity = innerOpacity + CONTROL_ZONE_MATERIAL.innerGlowStrength * 0.35;
    // Bound the glow in screen pixels so zooming never washes out the map.
    const glowWidth = Math.min(radius * 0.35, Math.max(6, Math.min(24, radius * 0.08)));
    const lineWidth = highContrast ? 3 : Math.max(1.25, Math.min(2,
        radius * 2 * CONTROL_ZONE_MATERIAL.thickness));

    ctx.save();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
    const fill = ctx.createRadialGradient(
        center.x, center.y, 0,
        center.x, center.y, outerRadius
    );
    fill.addColorStop(0, `rgba(255,255,255,${innerOpacity})`);
    fill.addColorStop((radius - glowWidth) / outerRadius,
        `rgba(255,255,255,${innerOpacity})`);
    fill.addColorStop(radius / outerRadius, `rgba(255,255,255,${edgeOpacity})`);
    fill.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = fill;
    ctx.fillRect(center.x - outerRadius, center.y - outerRadius,
        outerRadius * 2, outerRadius * 2);

    // Keep the actual boundary at the configured physical radius. The glow
    // is decorative and does not change the playable zone's geometry.
    ctx.beginPath();
    ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
    ctx.strokeStyle = panel;
    ctx.lineWidth = highContrast ? 6 : lineWidth + 2;
    ctx.stroke();
    ctx.strokeStyle = accent;
    ctx.globalAlpha = CONTROL_ZONE_MATERIAL.outerOpacity;
    ctx.lineWidth = lineWidth;
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
