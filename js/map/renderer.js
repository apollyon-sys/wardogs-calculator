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

    /*
     * User pencil drawings are persistent
     * map annotations and live below the
     * artillery solution overlays.
     */
    if (isMapLayerVisible('drawings')) {
        drawMapToolDrawings();
    }

    if (
        isMapLayerVisible('deadGround') &&
        currentWeapon
    ) {
        drawDeadGround(
            worldToLocalScreen(
                S.origin.x,
                S.origin.y
            ),
            v.scale
        );
    }

    if (
        isMapLayerVisible('artillery') &&
        currentWeapon
    ) {
        const a =
            worldToLocalScreen(
                S.origin.x,
                S.origin.y
            );

        const b =
            worldToLocalScreen(
                S.target.x,
                S.target.y
            );

        const maxRange =
            currentWeapon.maxRange ??
            currentWeapon.range;

        const minRange =
            currentWeapon.minRange ??
            0;

        const rangePx =
            kilometersToWorldDistance(maxRange) *
            v.scale;

        const minRangePx =
            kilometersToWorldDistance(minRange) *
            v.scale;

        /*
         * Layer 6:
         * artillery range.
         */
        drawMaxRangeRing(
            a,
            rangePx,
            v.scale
        );

        if (minRangePx > 0) {
            ctx.beginPath();

            ctx.arc(
                a.x,
                a.y,
                minRangePx,
                0,
                Math.PI * 2
            );

            ctx.strokeStyle =
                '#d86666';

            ctx.lineWidth =
                1.5;

            ctx.setLineDash([
                4,
                4
            ]);

            ctx.stroke();
            ctx.setLineDash([]);
        }

        /*
         * Layer 7:
         * origin -> target line.
         */
        ctx.strokeStyle =
            '#d7a452';

        ctx.lineWidth =
            2;

        ctx.setLineDash([
            8,
            6
        ]);

        ctx.beginPath();

        ctx.moveTo(
            a.x,
            a.y
        );

        ctx.lineTo(
            b.x,
            b.y
        );

        ctx.stroke();

        ctx.setLineDash([]);

        /*
         * Layer 8:
         * artillery / target markers.
         */
        marker(
            S.origin,
            'O'
        );

        marker(
            S.target,
            'T'
        );

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
