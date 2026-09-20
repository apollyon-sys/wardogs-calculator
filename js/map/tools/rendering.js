/* =========================
   MAP TOOL RENDERING
   ========================= */

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
