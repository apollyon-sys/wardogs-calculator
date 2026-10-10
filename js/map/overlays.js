/* =========================
   USER MARKERS
   ========================= */

function marker(
    p,
    text
) {

    const pos =
        worldToLocalScreen(
            p.x,
            p.y
        );

    ctx.beginPath();

    ctx.arc(
        pos.x,
        pos.y,
        8,
        0,
        Math.PI * 2
    );

    ctx.fillStyle =
        text === 'O'
            ? '#5fa8d3'
            : '#d86666';

    ctx.fill();

    ctx.strokeStyle =
        '#fff';

    ctx.lineWidth =
        2;

    ctx.stroke();

    ctx.fillStyle =
        '#fff';

    ctx.font =
        'bold 10px system-ui';

    ctx.textAlign =
        'center';

    ctx.textBaseline =
        'alphabetic';

    ctx.fillText(
        text,
        pos.x,
        pos.y + 4
    );
}


/* =========================
   PRESET ZONES
   ========================= */

function drawPresetZones(map) {

    if (
        !map ||
        !Array.isArray(
            map.zones
        )
    ) {
        return;
    }

    const v =
        view();

    map.zones.forEach(
        zone => {

            if (
                typeof zone.x !== 'number' ||
                typeof zone.y !== 'number' ||
                typeof zone.radius !== 'number'
            ) {
                return;
            }

            const pos =
                worldToLocalScreen(
                    storedMetersToWorldCoordinate(zone.x),

                    storedMetersToWorldCoordinate(zone.y)
                );

            const radius =
                (
                    metersToWorldDistance(zone.radius)
                ) *
                v.scale;

            ctx.beginPath();

            ctx.arc(
                pos.x,
                pos.y,
                radius,
                0,
                Math.PI * 2
            );

            ctx.fillStyle =
                hexToRgba(
                    zone.color,
                    0.12
                );

            ctx.fill();

            ctx.strokeStyle =
                zone.color ||
                '#d7a452';

            ctx.lineWidth =
                2;

            ctx.setLineDash([
                7,
                5
            ]);

            ctx.stroke();

            ctx.setLineDash([]);
        }
    );
}


/* =========================
   PRESET POLYGONS
   ========================= */

function getPolygonCenter(points) {

    if (
        !Array.isArray(points) ||
        points.length === 0
    ) {
        return null;
    }

    let signedArea =
        0;

    let centroidX =
        0;

    let centroidY =
        0;

    for (
        let i = 0;
        i < points.length;
        i++
    ) {

        const current =
            points[i];

        const next =
            points[
            (
                i + 1
            ) %
            points.length
                ];

        const cross =
            current.x *
            next.y -
            next.x *
            current.y;

        signedArea +=
            cross;

        centroidX +=
            (
                current.x +
                next.x
            ) *
            cross;

        centroidY +=
            (
                current.y +
                next.y
            ) *
            cross;
    }

    signedArea *=
        0.5;

    if (
        Math.abs(
            signedArea
        ) <
        1e-9
    ) {

        const sum =
            points.reduce(
                (
                    result,
                    point
                ) => {

                    result.x +=
                        point.x;

                    result.y +=
                        point.y;

                    return result;
                },
                {
                    x: 0,
                    y: 0
                }
            );

        return {
            x:
                sum.x /
                points.length,

            y:
                sum.y /
                points.length
        };
    }

    centroidX /=
        6 *
        signedArea;

    centroidY /=
        6 *
        signedArea;

    return {
        x:
        centroidX,

        y:
        centroidY
    };
}

function drawPolygonLabel(
    polygon,
    validPoints
) {

    if (
        !polygon.label
    ) {
        return;
    }

    const center =
        getPolygonCenter(
            validPoints
        );

    if (!center) {
        return;
    }

    const screen =
        worldToLocalScreen(
            storedMetersToWorldCoordinate(center.x),

            storedMetersToWorldCoordinate(center.y)
        );

    ctx.save();

    ctx.font =
        'bold 11px system-ui, sans-serif';

    ctx.textAlign =
        'center';

    ctx.textBaseline =
        'middle';

    const metrics =
        ctx.measureText(
            polygon.label
        );

    const paddingX =
        7;

    const paddingY =
        4;

    const labelWidth =
        metrics.width +
        paddingX *
        2;

    const labelHeight =
        11 +
        paddingY *
        2;

    ctx.fillStyle =
        polygon.labelBackground ||
        'rgba(16, 19, 22, .85)';

    ctx.fillRect(
        screen.x -
        labelWidth /
        2,

        screen.y -
        labelHeight /
        2,

        labelWidth,
        labelHeight
    );

    ctx.strokeStyle =
        polygon.labelBorder ||
        'rgba(255,255,255,.15)';

    ctx.lineWidth =
        1;

    ctx.strokeRect(
        screen.x -
        labelWidth /
        2,

        screen.y -
        labelHeight /
        2,

        labelWidth,
        labelHeight
    );

    ctx.fillStyle =
        polygon.labelColor ||
        '#ffffff';

    ctx.fillText(
        polygon.label,
        screen.x,
        screen.y
    );

    ctx.restore();
}

// MI_UI_Safe_Zone parameters seed the Canvas approximation. Shader-space
// thickness values are converted to bounded screen-pixel widths.
const SPAWN_ZONE_MATERIAL = Object.freeze({
    innerOpacity: 0.192,
    innerGlowStrength: 1.85773,
    outerOpacity: 0.444,
    thickness: 0.02,
    hookThickness: 0.05
});

function drawSpawnZonePolygon(polygon, validPoints) {
    const points = validPoints.map(point => worldToLocalScreen(
        storedMetersToWorldCoordinate(point.x),
        storedMetersToWorldCoordinate(point.y)
    ));
    if (points.some(point => !Number.isFinite(point.x) || !Number.isFinite(point.y))) {
        return false;
    }

    const edges = points.map((point, index) => {
        const next = points[(index + 1) % points.length];
        const dx = next.x - point.x;
        const dy = next.y - point.y;
        return { point, next, dx, dy, length: Math.hypot(dx, dy) };
    });
    if (edges.some(edge => edge.length <= 0)) return false;
    const area = edges.reduce((sum, edge) =>
        sum + edge.point.x * edge.next.y - edge.next.x * edge.point.y, 0);
    if (!Number.isFinite(area) || Math.abs(area) < 1e-6) return false;

    const minX = Math.min(...points.map(point => point.x));
    const maxX = Math.max(...points.map(point => point.x));
    const minY = Math.min(...points.map(point => point.y));
    const maxY = Math.max(...points.map(point => point.y));
    const v = view();
    if (maxX < -v.left - 4 || maxY < -v.top - 4 ||
        minX > wrap.clientWidth - v.left + 4 ||
        minY > wrap.clientHeight - v.top + 4) return false;

    const shortestEdge = Math.min(...edges.map(edge => edge.length));
    const highContrast = document.documentElement.dataset.a11yHighContrast === 'true';
    const color = polygon.color || '#d7a452';
    const fillColor = polygon.fillColor || color;
    const opacity = Number.isFinite(polygon.fillOpacity)
        ? Math.max(0, Math.min(1, polygon.fillOpacity))
        : SPAWN_ZONE_MATERIAL.innerOpacity;
    const fillOpacity = highContrast ? Math.max(0.24, opacity) : opacity;
    const glowWidth = Math.min(shortestEdge / 3,
        Math.max(3, Math.min(18, shortestEdge * 0.06)));
    const glowOpacity = highContrast ? 0.3 : SPAWN_ZONE_MATERIAL.innerGlowStrength * 0.1;
    const lineWidth = highContrast ? 3 : Math.max(1,
        Math.min(2, shortestEdge * SPAWN_ZONE_MATERIAL.thickness));
    const hookWidth = highContrast ? 4 : Math.max(1.5,
        Math.min(4, shortestEdge * SPAWN_ZONE_MATERIAL.hookThickness));
    const hookLength = Math.min(24, shortestEdge * 0.28,
        Math.max(4, shortestEdge * 0.16));
    const traceBoundary = () => {
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        points.slice(1).forEach(point => ctx.lineTo(point.x, point.y));
        ctx.closePath();
    };

    ctx.save();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'butt';
    traceBoundary();
    ctx.fillStyle = hexToRgba(fillColor, fillOpacity);
    ctx.fill();

    // Fade inward from each real edge instead of using a circular gradient.
    // Clipping preserves the rotated outlines, including their corner points.
    ctx.save();
    ctx.clip();
    edges.forEach(edge => {
        const tx = edge.dx / edge.length;
        const ty = edge.dy / edge.length;
        const winding = area > 0 ? 1 : -1;
        const nx = -ty * winding;
        const ny = tx * winding;
        const midX = (edge.point.x + edge.next.x) / 2;
        const midY = (edge.point.y + edge.next.y) / 2;
        const gradient = ctx.createLinearGradient(midX, midY,
            midX + nx * glowWidth, midY + ny * glowWidth);
        gradient.addColorStop(0, hexToRgba(color, glowOpacity));
        gradient.addColorStop(1, hexToRgba(color, 0));
        const startX = edge.point.x - tx * glowWidth;
        const startY = edge.point.y - ty * glowWidth;
        const endX = edge.next.x + tx * glowWidth;
        const endY = edge.next.y + ty * glowWidth;
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.lineTo(endX + nx * glowWidth, endY + ny * glowWidth);
        ctx.lineTo(startX + nx * glowWidth, startY + ny * glowWidth);
        ctx.closePath();
        ctx.fillStyle = gradient;
        ctx.fill();
    });
    ctx.restore();

    traceBoundary();
    ctx.strokeStyle = '#151a1d';
    ctx.lineWidth = lineWidth + 2;
    ctx.stroke();
    ctx.strokeStyle = hexToRgba(color, highContrast ? 1 : SPAWN_ZONE_MATERIAL.outerOpacity);
    ctx.lineWidth = lineWidth;
    ctx.stroke();

    // Short corner brackets distinguish deployment areas from other polygons.
    ctx.beginPath();
    points.forEach((point, index) => {
        const previous = edges[(index + edges.length - 1) % edges.length];
        const next = edges[index];
        ctx.moveTo(point.x - previous.dx / previous.length * hookLength,
            point.y - previous.dy / previous.length * hookLength);
        ctx.lineTo(point.x, point.y);
        ctx.lineTo(point.x + next.dx / next.length * hookLength,
            point.y + next.dy / next.length * hookLength);
    });
    ctx.strokeStyle = '#151a1d';
    ctx.lineWidth = hookWidth + 2;
    ctx.stroke();
    ctx.strokeStyle = color;
    ctx.lineWidth = hookWidth;
    ctx.stroke();
    ctx.restore();
    return true;
}

function drawPresetPolygons(map) {

    if (
        !map ||
        !Array.isArray(
            map.polygons
        )
    ) {
        return;
    }

    map.polygons.forEach(
        polygon => {

            if (
                !polygon ||
                !Array.isArray(
                    polygon.points
                )
            ) {
                return;
            }

            const validPoints =
                polygon.points.filter(
                    point =>
                        point &&
                        typeof point.x === 'number' &&
                        typeof point.y === 'number'
                );

            if (
                validPoints.length <
                3
            ) {
                return;
            }

            if (polygon.renderStyle === 'spawn') {
                if (drawSpawnZonePolygon(polygon, validPoints)) {
                    drawPolygonLabel(polygon, validPoints);
                }
                return;
            }

            const first =
                worldToLocalScreen(
                    storedMetersToWorldCoordinate(validPoints[0].x),

                    storedMetersToWorldCoordinate(validPoints[0].y)
                );

            ctx.save();

            ctx.beginPath();

            ctx.moveTo(
                first.x,
                first.y
            );

            for (
                let i = 1;
                i < validPoints.length;
                i++
            ) {

                const point =
                    validPoints[i];

                const screen =
                    worldToLocalScreen(
                        storedMetersToWorldCoordinate(point.x),

                        storedMetersToWorldCoordinate(point.y)
                    );

                ctx.lineTo(
                    screen.x,
                    screen.y
                );
            }

            ctx.closePath();

            const color =
                polygon.color ||
                '#d7a452';

            const fillOpacity =
                typeof polygon.fillOpacity ===
                'number'
                    ? Math.max(
                        0,
                        Math.min(
                            1,
                            polygon.fillOpacity
                        )
                    )
                    : 0.15;

            if (
                polygon.fillColor
            ) {

                ctx.fillStyle =
                    hexToRgba(
                        polygon.fillColor,
                        fillOpacity
                    );

            } else {

                ctx.fillStyle =
                    hexToRgba(
                        color,
                        fillOpacity
                    );
            }

            ctx.fill();

            ctx.strokeStyle =
                color;

            ctx.lineWidth =
                typeof polygon.strokeWidth ===
                'number'
                    ? Math.max(
                        0.5,
                        polygon.strokeWidth
                    )
                    : 2;

            if (
                polygon.dashed
            ) {

                ctx.setLineDash(
                    Array.isArray(
                        polygon.dash
                    )
                        ? polygon.dash
                        : [
                            8,
                            6
                        ]
                );

            } else {

                ctx.setLineDash([]);
            }

            ctx.lineJoin =
                'round';

            ctx.lineCap =
                'round';

            ctx.stroke();

            ctx.setLineDash([]);

            ctx.restore();

            drawPolygonLabel(
                polygon,
                validPoints
            );
        }
    );
}


/* =========================
   PRESET MARKER TARGETING
   ========================= */

let SELECTED_PRESET_TARGET_KEY =
    null;

let PRESET_TARGET_SELECTED_AT =
    0;

let PRESET_TARGET_ANIMATION_FRAME =
    null;

let PRESET_MARKER_HOVER_KEY =
    null;

/* =========================
   PRESET MARKER ZOOM VISIBILITY
   ========================= */

/*
 * Marker minZoom / maxZoom values use the actual camera
 * zoom multiplier (S.zoom). Both limits are inclusive.
 * Missing limits mean unbounded.
 *
 * Example:
 *   minZoom: 2   -> hidden below 2x camera zoom
 *   maxZoom: 10  -> hidden above 10x camera zoom
 */
function getPresetMarkerZoomLevel() {

    const zoom =
        Number(S.zoom);

    return Number.isFinite(zoom)
        ? zoom
        : 1;
}

function isPresetMarkerVisibleAtZoom(
    item
) {

    if (!item) {
        return false;
    }

    const zoom =
        getPresetMarkerZoomLevel();

    const minZoom =
        Number(item.minZoom);

    const maxZoom =
        Number(item.maxZoom);

    if (
        Number.isFinite(minZoom) &&
        zoom < minZoom
    ) {
        return false;
    }

    if (
        Number.isFinite(maxZoom) &&
        zoom > maxZoom
    ) {
        return false;
    }

    return true;
}

function getPresetMarkerKey(
    item,
    index,
    mapId = S.map
) {

    return [
        mapId,
        index,
        item.icon || item.emoji || 'marker',
        item.x,
        item.y
    ].join(':');
}

function getPresetMarkerScreenGeometry(
    item
) {

    if (
        !item ||
        typeof item.x !== 'number' ||
        typeof item.y !== 'number'
    ) {
        return null;
    }

    const center =
        toScreen(
            storedMetersToWorldCoordinate(item.x),
            storedMetersToWorldCoordinate(item.y)
        );

    const asset =
        getPresetMarkerAsset(item);

    if (asset) {

        const layout =
            getMarkerImageLayout(
                item,
                asset
            );

        return {
            center,
            width:
                layout.width,
            height:
                layout.height,
            left:
                center.x -
                layout.width *
                layout.anchorX,
            top:
                center.y -
                layout.height *
                layout.anchorY,
            right:
                center.x +
                layout.width *
                (
                    1 -
                    layout.anchorX
                ),
            bottom:
                center.y +
                layout.height *
                (
                    1 -
                    layout.anchorY
                )
        };
    }

    const size =
        getMarkerEmojiSize(
            view()
        );

    return {
        center,
        width: size,
        height: size,
        left:
            center.x -
            size / 2,
        top:
            center.y -
            size / 2,
        right:
            center.x +
            size / 2,
        bottom:
            center.y +
            size / 2
    };
}

function findPresetMarkerAtCanvasPoint(
    x,
    y
) {

    const map =
        getCurrentMap();

    if (
        typeof isMapLayerVisible ===
        'function' &&
        !isMapLayerVisible(
            'presetMarkers'
        )
    ) {
        return null;
    }

    if (
        !map ||
        !Array.isArray(
            map.markers
        )
    ) {
        return null;
    }

    let best =
        null;

    map.markers.forEach(
        (
            item,
            index
        ) => {

            if (
                !isPresetMarkerVisibleAtZoom(
                    item
                )
            ) {
                return;
            }

            const geometry =
                getPresetMarkerScreenGeometry(
                    item
                );

            if (!geometry) {
                return;
            }

            const padding =
                7;

            if (
                x <
                geometry.left -
                padding ||
                x >
                geometry.right +
                padding ||
                y <
                geometry.top -
                padding ||
                y >
                geometry.bottom +
                padding
            ) {
                return;
            }

            const distance =
                Math.hypot(
                    x -
                    geometry.center.x,
                    y -
                    geometry.center.y
                );

            if (
                !best ||
                distance <
                best.distance
            ) {

                best = {
                    item,
                    index,
                    geometry,
                    distance
                };
            }
        }
    );

    return best;
}

function setPresetMarkerHover(
    markerInfo
) {

    const nextKey =
        markerInfo
            ? getPresetMarkerKey(
                markerInfo.item,
                markerInfo.index
            )
            : null;

    if (
        nextKey ===
        PRESET_MARKER_HOVER_KEY
    ) {
        return;
    }

    PRESET_MARKER_HOVER_KEY =
        nextKey;

    c.classList.toggle(
        'preset-marker-hover',
        Boolean(
            nextKey
        )
    );
}

function updatePresetMarkerHover(
    event
) {

    if (
        typeof MAP_TOOL_STATE !==
        'undefined' &&
        [
            'ruler',
            'pencil',
            'eraser',
            'marker'
        ].includes(
            MAP_TOOL_STATE.tool
        )
    ) {

        setPresetMarkerHover(
            null
        );

        return;
    }

    const rect =
        c.getBoundingClientRect();

    setPresetMarkerHover(
        findPresetMarkerAtCanvasPoint(
            event.clientX -
            rect.left,
            event.clientY -
            rect.top
        )
    );
}

function startPresetTargetSelectionAnimation() {

    if (
        PRESET_TARGET_ANIMATION_FRAME
    ) {

        cancelAnimationFrame(
            PRESET_TARGET_ANIMATION_FRAME
        );
    }

    const tick =
        () => {

            draw();

            if (
                performance.now() -
                PRESET_TARGET_SELECTED_AT <
                900
            ) {

                PRESET_TARGET_ANIMATION_FRAME =
                    requestAnimationFrame(
                        tick
                    );

            } else {

                PRESET_TARGET_ANIMATION_FRAME =
                    null;

                draw();
            }
        };

    PRESET_TARGET_ANIMATION_FRAME =
        requestAnimationFrame(
            tick
        );
}

function selectPresetMarkerAsTarget(
    item,
    index
) {

    if (
        !item ||
        typeof item.x !== 'number' ||
        typeof item.y !== 'number'
    ) {
        return false;
    }

    SELECTED_PRESET_TARGET_KEY =
        getPresetMarkerKey(
            item,
            index
        );

    PRESET_TARGET_SELECTED_AT =
        performance.now();

    pushMapToolHistory();

    S.target = {
        x:
            storedMetersToWorldCoordinate(item.x),
        y:
            storedMetersToWorldCoordinate(item.y)
    };

    clamp(
        S.target
    );

    S.mode =
        'target';

    $('targetMode')
        ?.classList
        .add(
            'active'
        );

    $('originMode')
        ?.classList
        .remove(
            'active'
        );

    inputs();

    renderSavedTargets();

    startPresetTargetSelectionAnimation();

    return true;
}

function handlePresetMarkerTargetMouseDown(
    event
) {

    if (
        event.button !==
        0
    ) {
        return false;
    }

    if (
        typeof MAP_TOOL_STATE !==
        'undefined' &&
        [
            'ruler',
            'pencil',
            'eraser',
            'marker'
        ].includes(
            MAP_TOOL_STATE.tool
        )
    ) {
        return false;
    }

    const rect =
        c.getBoundingClientRect();

    const markerInfo =
        findPresetMarkerAtCanvasPoint(
            event.clientX -
            rect.left,
            event.clientY -
            rect.top
        );

    if (!markerInfo) {
        return false;
    }

    if (
        isPointMapLocked('target')
    ) {
        return true;
    }

    return selectPresetMarkerAsTarget(
        markerInfo.item,
        markerInfo.index
    );
}

function getPresetTargetCoordinateTolerance() {
    const coordinatePrecision =
        getCoordinateMetersPerUnit() === 100
            ? 100
            : 1000;

    return (
        0.5 / coordinatePrecision +
        1e-9
    );
}

function getPresetMarkerSelectionProgress(
    item,
    index
) {

    const key =
        getPresetMarkerKey(
            item,
            index
        );

    if (
        key !==
        SELECTED_PRESET_TARGET_KEY
    ) {
        return null;
    }

    /*
     * clamp() stores coordinates at the precision exposed by the current
     * map. Zestafona tower coordinates contain additional source decimals,
     * so compare within half one editable coordinate step instead of using
     * a fixed tolerance that only works for already-rounded map data.
     */
    const targetTolerance =
        getPresetTargetCoordinateTolerance();

    const targetMatches =
        Math.abs(
            S.target.x -
            storedMetersToWorldCoordinate(item.x)
        ) <=
        targetTolerance &&
        Math.abs(
            S.target.y -
            storedMetersToWorldCoordinate(item.y)
        ) <=
        targetTolerance;

    if (!targetMatches) {

        SELECTED_PRESET_TARGET_KEY =
            null;

        return null;
    }

    return Math.min(
        1,
        Math.max(
            0,
            (
                performance.now() -
                PRESET_TARGET_SELECTED_AT
            ) /
            900
        )
    );
}

function getPresetMarkerSelectionScale(
    item,
    index
) {

    const progress =
        getPresetMarkerSelectionProgress(
            item,
            index
        );

    if (progress === null) {
        return 1;
    }

    if (
        progress >=
        0.6
    ) {
        return 1;
    }

    return (
        1 +
        Math.sin(
            (
                progress /
                0.6
            ) *
            Math.PI
        ) *
        0.18
    );
}

function drawPresetMarkerSelection(
    item,
    index,
    x,
    y,
    iconSize
) {

    const progress =
        getPresetMarkerSelectionProgress(
            item,
            index
        );

    if (progress === null) {
        return;
    }

    const baseRadius =
        Math.max(
            15,
            iconSize *
            0.62
        );

    const pulse =
        progress < 1
            ? Math.sin(
                progress *
                Math.PI *
                3
            )
            : 0;

    const radius =
        baseRadius +
        (
            progress < 1
                ? 4 +
                pulse * 2
                : 2
        );

    ctx.save();

    ctx.beginPath();

    ctx.arc(
        x,
        y,
        radius,
        0,
        Math.PI * 2
    );

    ctx.fillStyle =
        document.documentElement
            .dataset.theme ===
            'light'
            ? 'rgba(168,121,36,.13)'
            : 'rgba(215,164,82,.12)';

    ctx.fill();

    ctx.strokeStyle =
        getComputedStyle(
            document.documentElement
        )
            .getPropertyValue(
                '--accent'
            )
            .trim() ||
        '#d7a452';

    ctx.lineWidth =
        2;

    ctx.stroke();

    if (
        progress <
        1
    ) {

        ctx.beginPath();

        ctx.arc(
            x,
            y,
            radius +
            7 +
            progress * 8,
            0,
            Math.PI * 2
        );

        ctx.globalAlpha =
            Math.max(
                0,
                0.55 *
                (
                    1 -
                    progress
                )
            );

        ctx.lineWidth =
            1.5;

        ctx.stroke();
    }

    ctx.restore();
}


/* =========================
   PRESET MARKERS
   ========================= */

const PRESET_TOWER_MARKER_STYLE = Object.freeze({
    width: 32,
    height: 32,
    anchorX: 0.5,
    anchorY: 0.5,
    fontFamily: 'WARDOGS Tower Numbers',
    // The exported text style uses 10 pt; Slate renders at 96 DPI.
    fontSize: 10 * 96 / 72,
    padding: 4,
    outlineOpacity: 0.4,
    shadowOpacity: 0.8,
    shadowOffset: 0.8
});

let PRESET_TOWER_FONT_STARTED = false;

function getPresetTowerNumber(item) {
    if (item?.icon !== 'tower') return null;

    const configured = item.towerNumber;
    if (Number.isInteger(configured) && configured > 0 && configured < 100) {
        return String(configured);
    }

    // Keep older map configurations usable without inferring an array order.
    const match = typeof item.label === 'string'
        ? item.label.match(/(?:^|\s)([1-9]\d?)\s*$/)
        : null;
    return match ? String(Number(match[1])) : null;
}

function getPresetMarkerAsset(item) {
    const asset = typeof item?.icon === 'string'
        ? getMarkerAsset(item.icon)
        : null;
    return asset || (getPresetTowerNumber(item) !== null
        ? PRESET_TOWER_MARKER_STYLE
        : null);
}

function loadPresetTowerNumberFont() {
    if (PRESET_TOWER_FONT_STARTED || typeof FontFace !== 'function' || !document.fonts) {
        return;
    }
    PRESET_TOWER_FONT_STARTED = true;

    try {
        const font = new FontFace(
            PRESET_TOWER_MARKER_STYLE.fontFamily,
            `url("${resourceURL('assets/fonts/barlow/tower-numbers-semibold.woff')}")`,
            { weight: '600', style: 'normal' }
        );
        font.load().then(loaded => {
            document.fonts.add(loaded);
            draw();
        }).catch(() => {}); // System-font numerals remain usable if loading fails.
    } catch {
        // Font support is optional and must never prevent map rendering.
    }
}

function drawPresetTowerMarker(item, x, y, selectionScale = 1) {
    const number = getPresetTowerNumber(item);
    if (number === null) return;

    const style = PRESET_TOWER_MARKER_STYLE;
    const layout = getMarkerImageLayout(item, getPresetMarkerAsset(item));
    const width = layout.width * selectionScale;
    const height = layout.height * selectionScale;
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
        return;
    }
    const left = x - width * layout.anchorX;
    const top = y - height * layout.anchorY;
    const scale = Math.min(width, height) / style.width;
    const image = drawMarkerImage(item, x, y, selectionScale);

    ctx.save();
    ctx.filter = 'none';

    if (!image?.drawn) {
        // Preserve the numbered marker and its hit area while artwork loads.
        ctx.beginPath();
        ctx.moveTo(left + width / 2, top);
        ctx.lineTo(left + width, top + height / 2);
        ctx.lineTo(left + width / 2, top + height);
        ctx.lineTo(left, top + height / 2);
        ctx.closePath();
        ctx.fillStyle = 'rgba(0, 0, 0, .92)';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = Math.max(1, scale);
        ctx.stroke();
    }

    loadPresetTowerNumberFont();

    const highContrast = document.documentElement?.dataset?.a11yHighContrast === 'true';
    const padding = style.padding * scale;
    const fontSize = style.fontSize * scale * getMapLabelAccessibilityScale();
    const textX = left + width - padding;
    const textY = top + padding;
    const maxWidth = Math.max(1, width - padding * 2);

    ctx.font = `600 ${fontSize}px "${style.fontFamily}", Barlow, system-ui, sans-serif`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.lineJoin = 'round';
    ctx.lineWidth = (highContrast ? 4 : 2) * scale;
    ctx.strokeStyle = `rgba(0, 0, 0, ${highContrast ? 1 : style.outlineOpacity})`;
    ctx.shadowColor = `rgba(0, 0, 0, ${style.shadowOpacity})`;
    ctx.shadowOffsetX = style.shadowOffset * scale;
    ctx.shadowOffsetY = style.shadowOffset * scale;
    ctx.strokeText(number, textX, textY, maxWidth);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(number, textX, textY, maxWidth);
    ctx.restore();
}

function getMarkerEmojiSize(v) {

    return Math.max(
        14,
        Math.min(
            32,
            v.scale * 0.35
        )
    );
}

function getMarkerImageLayout(
    item,
    asset
) {

    const width =
        typeof item.width === 'number' &&
        item.width > 0
            ? item.width
            : asset.width;

    const height =
        typeof item.height === 'number' &&
        item.height > 0
            ? item.height
            : asset.height;

    const scale =
        typeof item.scale === 'number' &&
        item.scale > 0
            ? item.scale
            : 1;

    const anchorX =
        typeof item.anchorX === 'number'
            ? Math.max(
                0,
                Math.min(
                    1,
                    item.anchorX
                )
            )
            : asset.anchorX;

    const anchorY =
        typeof item.anchorY === 'number'
            ? Math.max(
                0,
                Math.min(
                    1,
                    item.anchorY
                )
            )
            : asset.anchorY;

    return {
        width:
            width * scale,

        height:
            height * scale,

        anchorX,
        anchorY
    };
}

function drawMarkerImage(
    item,
    x,
    y,
    scaleMultiplier = 1
) {

    const asset =
        getMarkerAsset(
            item.icon
        );

    if (!asset) {
        return null;
    }

    const imageEntry =
        loadMarkerImage(
            asset
        );

    if (
        !imageEntry ||
        imageEntry.failed
    ) {
        return null;
    }

    const layout =
        getMarkerImageLayout(
            item,
            asset
        );

    if (
        !imageEntry.loaded
    ) {
        return {
            drawn: false,
            height: layout.height,
            anchorY: layout.anchorY
        };
    }

    const drawWidth =
        layout.width *
        scaleMultiplier;

    const drawHeight =
        layout.height *
        scaleMultiplier;

    const left =
        x -
        drawWidth *
        layout.anchorX;

    const top =
        y -
        drawHeight *
        layout.anchorY;

    ctx.save();

    ctx.filter =
        getMapIconCanvasFilter();

    const source =
        getMarkerImageSource(
            asset,
            item.color
        );

    if (!source) {
        ctx.restore();
        return null;
    }

    ctx.drawImage(
        source,
        left,
        top,
        drawWidth,
        drawHeight
    );

    ctx.restore();

    return {
        drawn: true,
        height: drawHeight,
        anchorY: layout.anchorY
    };
}

function drawMarkerEmoji(
    item,
    x,
    y,
    v,
    scaleMultiplier = 1
) {

    const emojiSize =
        getMarkerEmojiSize(
            v
        ) *
        scaleMultiplier;

    ctx.font =
        `${emojiSize}px "Segoe UI Emoji", "Apple Color Emoji", sans-serif`;

    ctx.fillText(
        item.emoji ||
        '📍',
        x,
        y
    );

    return emojiSize;
}

function getMapLabelAccessibilityScale() {

    const size =
        document.documentElement
            ?.dataset
            ?.a11yTextSize;

    if (size === 'xl') {
        return 1.45;
    }

    if (size === 'large') {
        return 1.2;
    }

    return 1;
}

function drawPresetMarkerLabel(
    item,
    x,
    y,
    visualBottomOffset,
    v
) {

    if (!item.label) {
        return;
    }

    const accessibilityScale =
        getMapLabelAccessibilityScale();

    const labelSize =
        Math.max(
            10,
            Math.min(
                14,
                v.scale * 0.15
            )
        ) *
        accessibilityScale;

    ctx.font =
        `${labelSize}px system-ui, sans-serif`;

    const metrics =
        ctx.measureText(
            item.label
        );

    const paddingX =
        6 *
        accessibilityScale;

    const paddingY =
        3 *
        accessibilityScale;

    const labelWidth =
        metrics.width +
        paddingX * 2;

    const labelHeight =
        labelSize +
        paddingY * 2;

    const labelX =
        x -
        labelWidth / 2;

    const labelY =
        y +
        visualBottomOffset +
        5;

    ctx.fillStyle =
        'rgba(16, 19, 22, .88)';

    ctx.fillRect(
        labelX,
        labelY,
        labelWidth,
        labelHeight
    );

    ctx.strokeStyle =
        'rgba(255, 255, 255, .12)';

    ctx.lineWidth =
        1;

    ctx.strokeRect(
        labelX,
        labelY,
        labelWidth,
        labelHeight
    );

    ctx.fillStyle =
        '#e7edf2';

    ctx.fillText(
        item.label,
        x,
        labelY +
        labelHeight / 2
    );
}

function drawPresetMarkers(map) {

    if (
        !map ||
        !Array.isArray(
            map.markers
        )
    ) {
        return;
    }

    const v =
        view();

    map.markers.forEach(
        (
            item,
            index
        ) => {

            if (
                !isPresetMarkerVisibleAtZoom(
                    item
                )
            ) {
                return;
            }

            if (
                typeof item.x !== 'number' ||
                typeof item.y !== 'number'
            ) {
                return;
            }

            const pos =
                worldToLocalScreen(
                    storedMetersToWorldCoordinate(item.x),
                    storedMetersToWorldCoordinate(item.y)
                );

            const x =
                pos.x;

            const y =
                pos.y;

            ctx.save();

            ctx.textAlign =
                'center';

            ctx.textBaseline =
                'middle';

            let visualBottomOffset =
                0;

            let imageResult =
                null;

            const selectionScale =
                getPresetMarkerSelectionScale(
                    item,
                    index
                );

            const markerAsset =
                getPresetMarkerAsset(item);

            const baseIconSize =
                markerAsset
                    ? Math.max(
                        getMarkerImageLayout(
                            item,
                            markerAsset
                        ).width,
                        getMarkerImageLayout(
                            item,
                            markerAsset
                        ).height
                    )
                    : getMarkerEmojiSize(
                        v
                    );

            drawPresetMarkerSelection(
                item,
                index,
                x,
                y,
                baseIconSize
            );

            if (getPresetTowerNumber(item) !== null) {
                drawPresetTowerMarker(item, x, y, selectionScale);
                ctx.restore();
                return;
            }

            /*
             * If "icon" is specified, try to
             * render an image asset first.
             */
            if (
                typeof item.icon === 'string' &&
                item.icon
            ) {

                imageResult =
                    drawMarkerImage(
                        item,
                        x,
                        y,
                        selectionScale
                    );
            }

            if (
                imageResult &&
                imageResult.drawn
            ) {

                visualBottomOffset =
                    imageResult.height *
                    (
                        1 -
                        imageResult.anchorY
                    );

            } else {

                /*
                 * Emoji remains fully supported
                 * and is also used as a fallback
                 * if an image asset is missing or
                 * fails to load.
                 */
                const emojiSize =
                    drawMarkerEmoji(
                        item,
                        x,
                        y,
                        v,
                        selectionScale
                    );

                visualBottomOffset =
                    emojiSize / 2;
            }

            drawPresetMarkerLabel(
                item,
                x,
                y,
                visualBottomOffset,
                v
            );

            ctx.restore();
        }
    );
}


/* =========================
   COLORS
   ========================= */

function hexToRgba(
    color,
    alpha
) {

    if (!color) {
        return `rgba(215,164,82,${alpha})`;
    }

    if (
        color.startsWith(
            'rgba('
        )
    ) {
        return color;
    }

    if (
        color.startsWith(
            'rgb('
        )
    ) {

        return color
            .replace(
                'rgb(',
                'rgba('
            )
            .replace(
                ')',
                `,${alpha})`
            );
    }

    const hex =
        color.replace(
            '#',
            ''
        );

    if (
        hex.length !== 3 &&
        hex.length !== 6
    ) {
        return `rgba(215,164,82,${alpha})`;
    }

    const normalized =
        hex.length === 3
            ? hex
                .split('')
                .map(
                    char =>
                        char +
                        char
                )
                .join('')
            : hex;

    const r =
        parseInt(
            normalized.substring(
                0,
                2
            ),
            16
        );

    const g =
        parseInt(
            normalized.substring(
                2,
                4
            ),
            16
        );

    const b =
        parseInt(
            normalized.substring(
                4,
                6
            ),
            16
        );

    return `rgba(${r},${g},${b},${alpha})`;
}
