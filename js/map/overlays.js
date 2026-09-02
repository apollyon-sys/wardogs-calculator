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
   RADIUS RINGS
   ========================= */

/*
 * One dashed circle of a given in-game radius, drawn in screen space.
 */
function drawRadiusRing(
    worldX,
    worldY,
    radiusMeters,
    color,
    label,
    {
        fill = true,
        dash = [7, 5]
    } = {}
) {

    const v =
        view();

    const pos =
        worldToLocalScreen(
            worldX,
            worldY
        );

    const radius =
        metersToWorldDistance(
            radiusMeters
        ) *
        v.scale;

    if (
        !Number.isFinite(radius) ||
        radius <= 0
    ) {
        return;
    }

    const stroke =
        color ||
        '#d7a452';

    ctx.beginPath();

    ctx.arc(
        pos.x,
        pos.y,
        radius,
        0,
        Math.PI * 2
    );

    if (fill) {

        ctx.fillStyle =
            hexToRgba(
                stroke,
                0.12
            );

        ctx.fill();
    }

    ctx.strokeStyle =
        stroke;

    ctx.lineWidth =
        2;

    ctx.setLineDash(
        dash
    );

    ctx.stroke();

    ctx.setLineDash([]);

    if (!label) {
        return;
    }

    /*
     * The label rides the top edge rather than the centre, where the
     * marker icon sits and where overlapping shapes would stack their
     * text on top of each other.
     */
    ctx.save();

    ctx.font =
        '600 12px system-ui, sans-serif';

    ctx.textAlign =
        'center';

    ctx.textBaseline =
        'bottom';

    ctx.lineWidth =
        3;

    ctx.strokeStyle =
        'rgba(0, 0, 0, 0.75)';

    ctx.strokeText(
        label,
        pos.x,
        pos.y - radius - 4
    );

    ctx.fillStyle =
        stroke;

    ctx.fillText(
        label,
        pos.x,
        pos.y - radius - 4
    );

    ctx.restore();
}


/*
 * A FOB's build area is a square, not a circle, so it gets its own
 * primitive. `halfExtent` is the in-game distance from the centre to an
 * edge — the full side is twice that. `rotationDegrees` turns the square
 * about its centre, because a FOB dropped in-game rarely lands square
 * with the world grid.
 */
function drawRadiusSquare(
    worldX,
    worldY,
    halfExtentMeters,
    color,
    rotationDegrees = 0
) {

    const v =
        view();

    const pos =
        worldToLocalScreen(
            worldX,
            worldY
        );

    const half =
        metersToWorldDistance(
            halfExtentMeters
        ) *
        v.scale;

    if (
        !Number.isFinite(half) ||
        half <= 0
    ) {
        return;
    }

    const stroke =
        color ||
        '#d7a452';

    const side =
        half * 2;

    const angle =
        (
            Number(rotationDegrees) || 0
        ) *
        Math.PI /
        180;

    ctx.save();

    ctx.translate(
        pos.x,
        pos.y
    );

    ctx.rotate(angle);

    ctx.fillStyle =
        hexToRgba(
            stroke,
            0.12
        );

    ctx.fillRect(
        -half,
        -half,
        side,
        side
    );

    ctx.strokeStyle =
        stroke;

    ctx.lineWidth =
        2;

    ctx.setLineDash([
        7,
        5
    ]);

    ctx.strokeRect(
        -half,
        -half,
        side,
        side
    );

    ctx.setLineDash([]);

    ctx.restore();
}

/* =========================
   MAIN ZONE
   ========================= */

/*
 * The scoring area — one circle per map, showing where people have to be
 * to earn points. Not one per spawn and not one per tower: there is a
 * single contested area.
 *
 * Its real centre is not recorded anywhere in the map data, so a map may
 * carry a `mainZone: { x, y, radius }` block (stored metres, like every
 * other coordinate in maps/*.json) and otherwise falls back to the
 * middle of the map's own bounds at the configured default radius. The
 * fallback is a guess that puts the circle on screen — it is not a
 * measured position.
 */
function getMainZone(map) {

    const config =
        getRingConfig('mainZone');

    if (!config) {
        return null;
    }

    const stored =
        map?.mainZone;

    if (
        stored &&
        Number.isFinite(Number(stored.x)) &&
        Number.isFinite(Number(stored.y))
    ) {

        const radius =
            Number(stored.radius);

        return {
            x: storedMetersToWorldCoordinate(
                Number(stored.x)
            ),
            y: storedMetersToWorldCoordinate(
                Number(stored.y)
            ),
            radius:
                Number.isFinite(radius) &&
                radius > 0
                    ? radius
                    : config.size,
            color: config.color,
            placed: true
        };
    }

    const bounds =
        getViewBounds();

    return {
        x: (bounds.minX + bounds.maxX) / 2,
        y: (bounds.minY + bounds.maxY) / 2,
        radius: config.size,
        color: config.color,
        placed: false
    };
}

function drawMainZone(map) {

    const zone =
        getMainZone(map);

    if (!zone) {
        return;
    }

    /*
     * Outline only, solid: the scoring area covers a large part of the
     * map, so a fill would tint everything under it, and a dashed line
     * would read as one more of the dashed circles already on screen.
     */
    drawRadiusRing(
        zone.x,
        zone.y,
        zone.radius,
        zone.color,
        tr('mapLayerMainZone'),
        {
            fill: false,
            dash: []
        }
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
        typeof item.icon === 'string'
            ? getMarkerAsset(
                item.icon
            )
            : null;

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

    if (
        typeof trackAnalytics ===
        'function'
    ) {
        trackAnalytics(
            'preset-marker-selected',
            {
                map: S.map
            }
        );
    }

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

    const targetMatches =
        Math.abs(
            S.target.x -
            storedMetersToWorldCoordinate(item.x)
        ) <
        0.0005 &&
        Math.abs(
            S.target.y -
            storedMetersToWorldCoordinate(item.y)
        ) <
        0.0005;

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

    ctx.drawImage(
        imageEntry.image,
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

    const labelSize =
        Math.max(
            10,
            Math.min(
                14,
                v.scale * 0.15
            )
        );

    ctx.font =
        `${labelSize}px system-ui, sans-serif`;

    const metrics =
        ctx.measureText(
            item.label
        );

    const paddingX =
        6;

    const paddingY =
        3;

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
                typeof item.icon === 'string'
                    ? getMarkerAsset(
                        item.icon
                    )
                    : null;

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
