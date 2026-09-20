/* =========================
   MAP TOOL INTERACTIONS
   ========================= */

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
