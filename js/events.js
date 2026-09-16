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

function setPointPlacementMode(mode) {
    if (mode !== 'origin' && mode !== 'target') {
        return false;
    }

    S.mode = mode;

    $('originMode')
        ?.classList.toggle(
            'active',
            mode === 'origin'
        );

    $('targetMode')
        ?.classList.toggle(
            'active',
            mode === 'target'
        );

    return true;
}

function swapArtilleryAndTargetPoints() {
    pushMapToolHistory();

    const oldOrigin =
        S.origin;

    S.origin =
        S.target;

    S.target =
        oldOrigin;

    inputs();
}

function isAppShortcutInputTarget(target) {
    if (!target || target === document.body) {
        return false;
    }

    if (target.isContentEditable) {
        return true;
    }

    return [
        'INPUT',
        'TEXTAREA',
        'SELECT'
    ].includes(
        String(target.tagName || '')
            .toUpperCase()
    );
}

function handleAppShortcut(event) {
    if (
        event.defaultPrevented ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        event.repeat
    ) {
        return false;
    }

    const key =
        typeof getKeyboardShortcutKey === 'function'
            ? getKeyboardShortcutKey(event)
            : String(event.key || '').toLowerCase();

    /*
     * Plain Tab is an application shortcut on desktop. Handle it before the
     * editable-control guard so focused buttons/selects do not steal it for
     * focus navigation. Shift+Tab keeps the browser's normal focus behavior.
     */
    if (
        key === 'tab' &&
        !event.shiftKey &&
        !document.body.classList.contains('mobile-app') &&
        typeof toggleSidebar === 'function'
    ) {
        toggleSidebar();
        return true;
    }

    if (
        isAppShortcutInputTarget(
            event.target
        )
    ) {
        return false;
    }

    if (key === 'q') {
        setPointPlacementMode(
            S.mode === 'origin'
                ? 'target'
                : 'origin'
        );
        return true;
    }

    if (key === 'y') {
        swapArtilleryAndTargetPoints();
        return true;
    }

    if (
        key === 't' &&
        !document.body.classList.contains('mobile-app') &&
        typeof toggleDesktopSavedTargetsCollapsed === 'function'
    ) {
        toggleDesktopSavedTargetsCollapsed();
        return true;
    }

    return false;
}

function bindEvents() {

    /*
     * Persisted SPH-2 sessions do not need Terrain3D before the user actually
     * interacts with the calculator. Pointer interaction is a cheap universal
     * trigger; requestTerrainBallisticsRuntime() is idempotent.
     */
    document.addEventListener(
        'pointerdown',
        () => {
            if (
                typeof requestTerrainBallisticsForCurrentState ===
                    'function'
            ) {
                requestTerrainBallisticsForCurrentState();
            }
        },
        { passive: true }
    );

    $('mapSelect').addEventListener(
        'change',
        () => {
            if (lobby?.active) { $('mapSelect').value = S.map; return; }

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

                const customSize =
                    getSavedCustomMapSize();

                S.w =
                    customSize.w;

                S.h =
                    customSize.h;
            }

            if (
                typeof loadMapPoints ===
                'function'
            ) {
                loadMapPoints();
            }

            persistAppSelections();

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
                typeof requestTerrainBallisticsForCurrentState ===
                    'function'
            ) {
                requestTerrainBallisticsForCurrentState();
            }

            inputs();
        }
    );
    $('mapStyleSelect')
        ?.addEventListener(
            'change',
            () => {
                const map =
                    MAPS[S.map];

                const style =
                    $('mapStyleSelect')
                        .value;

                if (
                    !map ||
                    !getAvailableMapTileStyleIds(
                        map
                    ).includes(style)
                ) {
                    syncMapStyleSelect();
                    return;
                }

                S.mapStyle =
                    style;

                persistMapStylePreference();

                if (
                    typeof trackAnalytics ===
                        'function'
                ) {
                    trackAnalytics(
                        'map-style-changed',
                        {
                            map: S.map,
                            style: S.mapStyle
                        }
                    );
                }

                draw();
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

            persistAppSelections();

            if (
                typeof requestTerrainBallisticsForCurrentState ===
                    'function'
            ) {
                requestTerrainBallisticsForCurrentState();
            }

            draw();
        }
    );

    $('apply').addEventListener(
        'click',
        () => {
            if (lobby?.active) return;

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

            persistAppSelections();

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

            inputs();
        }
    );

    $('originMode').addEventListener(
        'click',
        () => setPointPlacementMode('origin')
    );

    $('targetMode').addEventListener(
        'click',
        () => setPointPlacementMode('target')
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
        swapArtilleryAndTargetPoints
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

            /*
             * Point placement always follows the explicitly selected mode.
             * The old 300 m nearest-point hit test could move the other
             * marker when the user was trying to place a new point nearby.
             * Existing points can still be repositioned by selecting their
             * mode first and dragging/placing normally.
             */
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

            handleMapToolMouseUp();

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
            if (handleAppShortcut(e)) {
                e.preventDefault();
                return;
            }

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
