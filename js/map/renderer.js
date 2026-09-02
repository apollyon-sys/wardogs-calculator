/* =========================
   CANVAS RESIZE
   ========================= */

function resize() {

    const d =
        window.devicePixelRatio ||
        1;

    c.width =
        wrap.clientWidth *
        d;

    c.height =
        wrap.clientHeight *
        d;

    ctx.setTransform(
        d,
        0,
        0,
        d,
        0,
        0
    );

    draw();
}


/* =========================
   DRAW
   ========================= */

function draw() {

    if (!wrap) {
        return;
    }

    const W =
        wrap.clientWidth;

    const H =
        wrap.clientHeight;

    const v =
        view();

    ctx.clearRect(
        0,
        0,
        W,
        H
    );

    const styles =
        getComputedStyle(
            document.documentElement
        );

    ctx.fillStyle =
        styles
            .getPropertyValue(
                '--map-bg'
            )
            .trim() ||
        '#0d1012';

    ctx.fillRect(
        0,
        0,
        W,
        H
    );

    ctx.save();

    ctx.translate(
        v.left,
        v.top
    );

    ctx.fillStyle =
        styles
            .getPropertyValue(
                '--panel-bg'
            )
            .trim() ||
        '#151a1d';

    ctx.fillRect(
        0,
        0,
        v.mw,
        v.mh
    );

    const currentMap =
        getCurrentMap();

    const currentWeapon =
        WEAPONS[S.weapon] || null;

    /*
     * Layer 1:
     * base map tiles.
     */
    if (
        currentMap?.tiles &&
        isMapLayerVisible('tiles')
    ) {

        drawTileMap(
            currentMap
        );
    }

    /*
     * Layer 2:
     * terrain contours, above the tiles they describe and below
     * everything drawn on top of the ground.
     */
    if (isMapLayerVisible('contours')) {
        drawContours(currentMap);
    }

    /*
     * Layer 3:
     * coordinate grid.
     */
    if (isMapLayerVisible('grid')) {
        drawGrid();
        drawCoordinateLabels();
    }

    /*
     * Layer 4:
     * circular zones.
     */
    if (isMapLayerVisible('zones')) {
        drawPresetZones(currentMap);
    }

    /*
     * Layer 5:
     * arbitrary polygons.
     */
    if (isMapLayerVisible('polygons')) {
        drawPresetPolygons(currentMap);
    }

    if (isMapLayerVisible('mainZone')) {
        drawMainZone(currentMap);
    }

    /*
     * Build areas sit under the drawings and markers, so the FOB icon
     * they belong to stays legible on top of its own square.
     */
    if (isMapLayerVisible('fobAreas')) {
        drawFobBuildAreas();
    }

    /*
     * User pencil drawings are persistent
     * map annotations and live below the
     * artillery solution overlays.
     */
    if (isMapLayerVisible('drawings')) {
        drawMapToolDrawings();
    }

    /*
     * Layers 6-8:
     * every gun's range rings and target line, then the markers.
     * The per-gun loop lives in js/map/guns-overlay.js.
     */
    if (
        isMapLayerVisible('artillery') &&
        currentWeapon
    ) {
        drawGuns();
    }

    /*
     * Layer 9:
     * preset icons are ALWAYS drawn last.
     *
     * This prevents tiles, grid, zones,
     * polygons and artillery overlays from
     * covering map icons.
     */
    if (isMapLayerVisible('presetMarkers')) {
        drawPresetMarkers(currentMap);
    }

    /*
     * User-placed markers and transient
     * tool UI are rendered on top.
     */
    if (isMapLayerVisible('userMarkers')) {
        drawMapToolMarkers();
    }
    drawMapToolTransient();

    ctx.restore();

    result();
}
