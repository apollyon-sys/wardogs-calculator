/* =========================
   EVENTS
   ========================= */

function bindThemeToggle() {

    const toggle =
        $('themeToggle');

    if (!toggle) {
        return;
    }

    toggle.addEventListener(
        'click',
        toggleTheme
    );
}

function bindEvents() {

    $('mapSelect').addEventListener(
        'change',
        () => {

            const key =
                $('mapSelect').value;

            if (
                key !==
                'custom'
            ) {

                S.map =
                    key;

                S.w =
                    MAPS[key].w;

                S.h =
                    MAPS[key].h;

            } else {

                S.map =
                    'custom';
            }

            if (
                typeof loadMapPoints ===
                'function'
            ) {
                loadMapPoints();
            }

            clamp(
                S.origin
            );

            clamp(
                S.target
            );

            S.zoom =
                1;

            S.panX =
                0;

            S.panY =
                0;

            resetMapToolHistory();
            updatePresetLock();

            if (
                typeof trackAnalytics ===
                'function'
            ) {
                trackAnalytics(
                    'map-changed',
                    {
                        map: S.map
                    }
                );
            }

            inputs();
        }
    );

    $('language').addEventListener(
        'change',
        () => {

            const language =
                $('language').value;

            switchLanguage(
                language
            );
        }
    );

    $('weapon').addEventListener(
        'change',
        () => {

            S.weapon =
                $('weapon').value;

            if (
                typeof trackAnalytics ===
                'function'
            ) {
                trackAnalytics(
                    'weapon-changed',
                    {
                        weapon: S.weapon
                    }
                );
            }

            draw();
        }
    );

    $('apply').addEventListener(
        'click',
        () => {

            S.map =
                'custom';

            S.w =
                Math.max(
                    1,
                    Math.min(
                        100,
                        Number(
                            $('w').value
                        ) ||
                        10
                    )
                );

            S.h =
                Math.max(
                    1,
                    Math.min(
                        100,
                        Number(
                            $('h').value
                        ) ||
                        10
                    )
                );

            clamp(
                S.origin
            );

            clamp(
                S.target
            );

            S.zoom =
                1;

            S.panX =
                0;

            S.panY =
                0;

            resetMapToolHistory();
            updatePresetLock();

            if (
                typeof trackAnalytics ===
                'function'
            ) {
                trackAnalytics(
                    'map-changed',
                    {
                        map: 'custom'
                    }
                );
            }

            inputs();
        }
    );

    $('originMode').addEventListener(
        'click',
        () => {

            S.mode =
                'origin';

            $('originMode')
                .classList.add(
                'active'
            );

            $('targetMode')
                .classList.remove(
                'active'
            );
        }
    );

    $('targetMode').addEventListener(
        'click',
        () => {

            S.mode =
                'target';

            $('targetMode')
                .classList.add(
                'active'
            );

            $('originMode')
                .classList.remove(
                'active'
            );
        }
    );

    ['ox', 'oy'].forEach(
        id => {

            $(id).addEventListener(
                'change',
                () =>
                    inputPoint(
                        'origin'
                    )
            );
        }
    );

    ['tx', 'ty'].forEach(
        id => {

            $(id).addEventListener(
                'change',
                () =>
                    inputPoint(
                        'target'
                    )
            );
        }
    );

    $('coordinateOriginCopy')
        ?.addEventListener(
            'click',
            () => copyPointCoordinates('origin')
        );

    $('coordinateOriginPaste')
        ?.addEventListener(
            'click',
            () => pastePointCoordinates('origin')
        );

    $('coordinateTargetCopy')
        ?.addEventListener(
            'click',
            () => copyPointCoordinates('target')
        );

    $('coordinateTargetPaste')
        ?.addEventListener(
            'click',
            () => pastePointCoordinates('target')
        );

    $('coordinateOriginLock')
        ?.addEventListener(
            'click',
            () => togglePointMapLock('origin')
        );

    $('coordinateTargetLock')
        ?.addEventListener(
            'click',
            () => togglePointMapLock('target')
        );

    $('zoomIn').addEventListener(
        'click',
        () => {

            S.zoom =
                Math.min(
                    getMaxCameraZoom(),
                    S.zoom *
                    ZOOM_BUTTON_FACTOR
                );

            draw();
        }
    );

    $('zoomOut').addEventListener(
        'click',
        () => {

            S.zoom =
                Math.max(
                    MIN_ZOOM,
                    S.zoom /
                    ZOOM_BUTTON_FACTOR
                );

            draw();
        }
    );

    $('fit').addEventListener(
        'click',
        () => {

            S.zoom =
                1;

            S.panX =
                0;

            S.panY =
                0;

            draw();
        }
    );

    $('swap').addEventListener(
        'click',
        () => {

            pushMapToolHistory();

            const oldOrigin =
                S.origin;

            S.origin =
                S.target;

            S.target =
                oldOrigin;

            inputs();
        }
    );

    $('clear').addEventListener(
        'click',
        () => {

            pushMapToolHistory();

            const bounds =
                getViewBounds();

            S.origin = {
                x:
                bounds.minX,

                y:
                bounds.minY
            };

            S.target = {
                x:
                bounds.minX,

                y:
                bounds.minY
            };

            inputs();

            renderSavedTargets();
        }
    );


    /* =========================
       SAVED TARGETS
       ========================= */

    $('saveTarget').addEventListener(
        'click',
        saveCurrentTarget
    );

    $('saveArtilleryPosition')
        .addEventListener(
            'change',
            saveArtilleryPreference
        );

    $('exportSavedTargets')
        ?.addEventListener(
            'click',
            exportAllSavedTargets
        );

    $('importSavedTargets')
        ?.addEventListener(
            'click',
            importSavedTargets
        );


    /* =========================
       CANVAS
       ========================= */

    c.addEventListener(
        'mousedown',
        e => {

            e.preventDefault();

            const rect =
                c.getBoundingClientRect();

            const p =
                toWorld(
                    e.clientX -
                    rect.left,

                    e.clientY -
                    rect.top
                );

            if (
                e.button ===
                2
            ) {

                pan = {
                    startX:
                    e.clientX,

                    startY:
                    e.clientY,

                    originX:
                    S.panX,

                    originY:
                    S.panY
                };

                $('cursorCoords')
                    .style.display =
                    'none';

                setPresetMarkerHover(
                    null
                );

                return;
            }

            if (
                handleMapToolMouseDown(
                    e,
                    p
                )
            ) {
                drag = null;
                return;
            }

            if (
                handlePresetMarkerTargetMouseDown(
                    e
                )
            ) {
                drag = null;

                updateCursor(
                    e
                );

                return;
            }

            const d1 =
                Math.hypot(
                    p.x -
                    S.origin.x,

                    p.y -
                    S.origin.y
                );

            const d2 =
                Math.hypot(
                    p.x -
                    S.target.x,

                    p.y -
                    S.target.y
                );

            const pointHitThreshold =
                metersToWorldDistance(300);

            if (
                Math.min(d1, d2) <
                pointHitThreshold
            ) {
                const nearestPoint =
                    d1 < d2
                        ? 'origin'
                        : 'target';

                if (
                    isPointMapLocked(
                        nearestPoint
                    )
                ) {
                    drag = null;
                    updateCursor(e);
                    return;
                }

                drag = nearestPoint;

            } else {
                if (
                    isPointMapLocked(
                        S.mode
                    )
                ) {
                    drag = null;
                    updateCursor(e);
                    return;
                }

                drag = S.mode;
            }

            pushMapToolHistory();

            S[drag] = {
                x:
                p.x,

                y:
                p.y
            };

            clamp(
                S[drag]
            );

            inputs();

            updateCursor(
                e
            );
        }
    );

    window.addEventListener(
        'mousemove',
        e => {

            if (pan) {

                S.panX =
                    pan.originX +
                    (
                        e.clientX -
                        pan.startX
                    );

                S.panY =
                    pan.originY +
                    (
                        e.clientY -
                        pan.startY
                    );

                draw();

                return;
            }

            /*
             * One rect for the whole event. Reading it back after the
             * cursor readout has been written forces a layout, and this
             * handler used to read it twice.
             */
            const rect =
                c.getBoundingClientRect();

            updateCursor(
                e,
                rect
            );

            const toolWorld =
                toWorld(
                    e.clientX -
                    rect.left,
                    e.clientY -
                    rect.top
                );

            if (
                handleMapToolMouseMove(
                    e,
                    toolWorld
                )
            ) {
                drag = null;
                return;
            }

            updatePresetMarkerHover(
                e
            );

            if (!drag) {
                return;
            }

            const world =
                toWorld(
                    e.clientX -
                    rect.left,

                    e.clientY -
                    rect.top
                );

            S[drag] =
                world;

            clamp(
                S[drag]
            );

            inputs();

            updateCursor(
                e,
                rect
            );
        }
    );

    c.addEventListener(
        'contextmenu',
        e => {

            e.preventDefault();
        }
    );

    c.addEventListener(
        'mouseleave',
        () => {

            setPresetMarkerHover(
                null
            );

            if (!pan) {

                $('cursorCoords')
                    .style.display =
                    'none';
            }
        }
    );

    window.addEventListener(
        'mouseup',
        () => {

            const placedPoint =
                drag;

            handleMapToolMouseUp();

            if (
                placedPoint &&
                typeof trackAnalytics ===
                'function'
            ) {
                trackAnalytics(
                    `${placedPoint}-placed`,
                    {
                        map: S.map
                    }
                );
            }

            drag =
                null;

            pan =
                null;
        }
    );

    c.addEventListener(
        'wheel',
        e => {

            e.preventDefault();

            const rect =
                c.getBoundingClientRect();

            const mouseX =
                e.clientX -
                rect.left;

            const mouseY =
                e.clientY -
                rect.top;

            const before =
                toWorld(
                    mouseX,
                    mouseY
                );

            S.zoom =
                Math.max(
                    MIN_ZOOM,
                    Math.min(
                        getMaxCameraZoom(),
                        S.zoom *
                        (
                            e.deltaY <
                            0
                                ? ZOOM_WHEEL_IN
                                : ZOOM_WHEEL_OUT
                        )
                    )
                );

            const after =
                toWorld(
                    mouseX,
                    mouseY
                );

            S.panX +=
                (
                    after.x -
                    before.x
                ) *
                view().scale;

            S.panY -=
                (
                    after.y -
                    before.y
                ) *
                view().scale;

            draw();
        },
        {
            passive:
                false
        }
    );

    const cameraKeysLoaded =
        typeof handleCameraKeyDown ===
        'function';

    window.addEventListener(
        'keydown',
        e => {
            if (handleMapToolShortcut(e)) {
                e.preventDefault();
                return;
            }

            if (
                cameraKeysLoaded &&
                handleCameraKeyDown(e)
            ) {
                e.preventDefault();
            }
        }
    );

    if (cameraKeysLoaded) {

        window.addEventListener(
            'keyup',
            handleCameraKeyUp
        );

        /*
         * Held keys would otherwise stick when the window
         * loses focus mid-pan.
         */
        window.addEventListener(
            'blur',
            stopCameraPan
        );
    }

    window.addEventListener(
        'resize',
        resize
    );
}
