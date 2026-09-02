/* =========================
   MOBILE UI / TOUCH INPUT
   ========================= */

const MOBILE_TOUCH = {
    pointers: new Map(),
    gesture: null,
    sheetOpen: false,
    sheetDragging: false,
    sheetStartY: 0,
    sheetStartTranslate: 0
};

const MOBILE_PAN_THRESHOLD = 7;
const MOBILE_POINT_HIT_RADIUS = 30;

function isMobileApp() {
    return document.body.classList.contains('mobile-app');
}

function mobileCanvasPoint(event) {
    const rect = c.getBoundingClientRect();

    return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
    };
}

function mobileWorldPoint(event) {
    const point = mobileCanvasPoint(event);
    return toWorld(point.x, point.y);
}

function mobilePointerDistance(a, b) {
    return Math.hypot(
        a.x - b.x,
        a.y - b.y
    );
}

function mobilePointerMidpoint(a, b) {
    return {
        x: (a.x + b.x) / 2,
        y: (a.y + b.y) / 2
    };
}

function getMobileUserMarkerAt(x, y) {
    /*
     * Any drawn gun is grabbable, not just the selected one, so tapping a
     * neighbour picks that gun up rather than teleporting the current one
     * onto it.
     */
    const gunPicking =
        typeof gunAtScreen === 'function';

    const hitGun =
        gunPicking
            ? gunAtScreen(
                x,
                y,
                MOBILE_POINT_HIT_RADIUS
            )
            : null;

    const originPoint =
        gunPicking
            ? hitGun?.position || null
            : S.origin;

    const target = toScreen(S.target.x, S.target.y);

    const origin = originPoint
        ? toScreen(
            originPoint.x,
            originPoint.y
        )
        : null;

    const originDistance = origin
        ? Math.hypot(
            x - origin.x,
            y - origin.y
        )
        : Infinity;

    const targetDistance = Math.hypot(
        x - target.x,
        y - target.y
    );

    const nearest = Math.min(
        originDistance,
        targetDistance
    );

    if (nearest > MOBILE_POINT_HIT_RADIUS) {
        return null;
    }

    if (originDistance <= targetDistance) {
        /*
         * Select before returning: S.origin resolves through the active
         * gun, so the drag that follows has to be pointed at the gun that
         * was actually tapped.
         */
        if (
            hitGun &&
            hitGun.id !== S.activeGunId
        ) {
            selectGun(hitGun.id);
        }

        return 'origin';
    }

    return 'target';
}

function setMobileMode(type) {
    S.mode = type;

    $('originMode')?.classList.toggle(
        'active',
        type === 'origin'
    );

    $('targetMode')?.classList.toggle(
        'active',
        type === 'target'
    );
}

function startMobilePinch() {
    const pointers = Array.from(
        MOBILE_TOUCH.pointers.values()
    );

    if (pointers.length < 2) {
        return;
    }

    if (
        typeof MAP_TOOL_STATE !== 'undefined' &&
        (
            MAP_TOOL_STATE.rulerDragging ||
            MAP_TOOL_STATE.pencilDragging
        )
    ) {
        handleMapToolMouseUp();
    }

    const a = pointers[0];
    const b = pointers[1];
    const midpoint = mobilePointerMidpoint(a, b);

    MOBILE_TOUCH.gesture = {
        type: 'pinch',
        startDistance: Math.max(
            1,
            mobilePointerDistance(a, b)
        ),
        startZoom: S.zoom,
        anchorWorld: toWorld(
            midpoint.x,
            midpoint.y
        )
    };

    setPresetMarkerHover(null);
}

function updateMobilePinch() {
    const pointers = Array.from(
        MOBILE_TOUCH.pointers.values()
    );

    if (pointers.length < 2) {
        return;
    }

    if (MOBILE_TOUCH.gesture?.type !== 'pinch') {
        startMobilePinch();
    }

    const gesture = MOBILE_TOUCH.gesture;

    if (!gesture || gesture.type !== 'pinch') {
        return;
    }

    const a = pointers[0];
    const b = pointers[1];
    const midpoint = mobilePointerMidpoint(a, b);
    const distance = Math.max(
        1,
        mobilePointerDistance(a, b)
    );

    S.zoom = Math.max(
        MIN_ZOOM,
        Math.min(
            getMaxCameraZoom(),
            gesture.startZoom *
            distance /
            gesture.startDistance
        )
    );

    const after = toWorld(
        midpoint.x,
        midpoint.y
    );

    const scale = view().scale;

    S.panX +=
        (
            after.x -
            gesture.anchorWorld.x
        ) *
        scale;

    S.panY -=
        (
            after.y -
            gesture.anchorWorld.y
        ) *
        scale;

    draw();
}

function handleMobilePointerDown(event) {
    if (event.pointerType !== 'touch') {
        return;
    }

    event.preventDefault();

    try {
        c.setPointerCapture(event.pointerId);
    } catch (_) {
        // Pointer capture is optional on older mobile browsers.
    }

    const point = mobileCanvasPoint(event);

    MOBILE_TOUCH.pointers.set(
        event.pointerId,
        {
            id: event.pointerId,
            x: point.x,
            y: point.y,
            startX: point.x,
            startY: point.y
        }
    );

    if (MOBILE_TOUCH.pointers.size >= 2) {
        startMobilePinch();
        return;
    }

    closeMapToolMenus();

    const world = toWorld(point.x, point.y);

    if (
        typeof MAP_TOOL_STATE !== 'undefined' &&
        ['ruler', 'pencil', 'eraser', 'marker'].includes(
            MAP_TOOL_STATE.tool
        )
    ) {
        const handled = handleMapToolMouseDown(
            event,
            world
        );

        if (handled) {
            MOBILE_TOUCH.gesture = {
                type: 'tool',
                pointerId: event.pointerId
            };
            return;
        }
    }

    const markerType = getMobileUserMarkerAt(
        point.x,
        point.y
    );

    if (markerType) {
        if (
            isPointMapLocked(
                markerType
            )
        ) {
            MOBILE_TOUCH.gesture = {
                type: 'locked-point',
                pointerId: event.pointerId,
                startX: point.x,
                startY: point.y,
                moved: false
            };
            return;
        }

        pushMapToolHistory();

        MOBILE_TOUCH.gesture = {
            type: 'point',
            pointerId: event.pointerId,
            pointType: markerType,
            startX: point.x,
            startY: point.y,
            moved: false
        };

        setMobileMode(markerType);
        return;
    }

    MOBILE_TOUCH.gesture = {
        type: 'pending',
        pointerId: event.pointerId,
        startX: point.x,
        startY: point.y,
        startPanX: S.panX,
        startPanY: S.panY,
        moved: false
    };
}

function handleMobilePointerMove(event) {
    if (event.pointerType !== 'touch') {
        return;
    }

    const existing = MOBILE_TOUCH.pointers.get(
        event.pointerId
    );

    if (!existing) {
        return;
    }

    event.preventDefault();

    const point = mobileCanvasPoint(event);

    existing.x = point.x;
    existing.y = point.y;

    if (MOBILE_TOUCH.pointers.size >= 2) {
        updateMobilePinch();
        return;
    }

    const gesture = MOBILE_TOUCH.gesture;

    if (!gesture || gesture.pointerId !== event.pointerId) {
        return;
    }

    const moved = Math.hypot(
        point.x - gesture.startX,
        point.y - gesture.startY
    );

    if (gesture.type === 'tool') {
        handleMapToolMouseMove(
            event,
            toWorld(point.x, point.y)
        );
        return;
    }

    if (gesture.type === 'point') {
        if (moved >= 3) {
            gesture.moved = true;
        }

        const world = toWorld(
            point.x,
            point.y
        );

        S[gesture.pointType] = world;
        clamp(S[gesture.pointType]);
        inputs();
        return;
    }

    if (gesture.type === 'pan') {
        S.panX =
            gesture.startPanX +
            (
                point.x -
                gesture.startX
            );

        S.panY =
            gesture.startPanY +
            (
                point.y -
                gesture.startY
            );

        draw();
        return;
    }

    if (gesture.type !== 'pending') {
        return;
    }

    if (
        !gesture.moved &&
        moved < MOBILE_PAN_THRESHOLD
    ) {
        return;
    }

    gesture.moved = true;
    gesture.type = 'pan';

    S.panX =
        gesture.startPanX +
        (
            point.x -
            gesture.startX
        );

    S.panY =
        gesture.startPanY +
        (
            point.y -
            gesture.startY
        );

    setPresetMarkerHover(null);
    draw();
}

function finishMobileTap(event, gesture) {
    const point = mobileCanvasPoint(event);

    if (
        typeof MAP_TOOL_STATE === 'undefined' ||
        !['ruler', 'pencil', 'eraser', 'marker'].includes(
            MAP_TOOL_STATE.tool
        )
    ) {
        const markerInfo =
            findPresetMarkerAtCanvasPoint(
                point.x,
                point.y
            );

        if (markerInfo) {
            if (
                isPointMapLocked(
                    'target'
                )
            ) {
                return;
            }

            selectPresetMarkerAsTarget(
                markerInfo.item,
                markerInfo.index
            );
            return;
        }
    }

    const world = toWorld(
        point.x,
        point.y
    );

    if (!isWorldPointInsideMap(world)) {
        return;
    }

    const pointType =
        S.mode;

    if (
        isPointMapLocked(
            pointType
        )
    ) {
        return;
    }

    pushMapToolHistory();

    S[pointType] = {
        x: world.x,
        y: world.y
    };

    clamp(S[pointType]);

    if (
        typeof trackAnalytics ===
        'function'
    ) {
        trackAnalytics(
            `${pointType}-placed`,
            {
                map: S.map
            }
        );
    }

    inputs();
    renderSavedTargets();
}

function handleMobilePointerUp(event) {
    if (event.pointerType !== 'touch') {
        return;
    }

    const gesture = MOBILE_TOUCH.gesture;

    if (!MOBILE_TOUCH.pointers.has(event.pointerId)) {
        return;
    }

    event.preventDefault();

    MOBILE_TOUCH.pointers.delete(
        event.pointerId
    );

    try {
        c.releasePointerCapture(event.pointerId);
    } catch (_) {
        // Ignore unsupported releasePointerCapture.
    }

    if (gesture?.type === 'tool') {
        handleMapToolMouseUp();
        MOBILE_TOUCH.gesture = null;
        return;
    }

    if (
        gesture?.type === 'point' &&
        gesture.pointerId === event.pointerId &&
        typeof trackAnalytics ===
        'function'
    ) {
        trackAnalytics(
            `${gesture.pointType}-placed`,
            {
                map: S.map
            }
        );
    }

    if (gesture?.type === 'pinch') {
        if (MOBILE_TOUCH.pointers.size === 1) {
            const remaining = Array.from(
                MOBILE_TOUCH.pointers.values()
            )[0];

            MOBILE_TOUCH.gesture = {
                type: 'pending',
                pointerId: remaining.id,
                startX: remaining.x,
                startY: remaining.y,
                startPanX: S.panX,
                startPanY: S.panY,
                moved: true
            };
        } else {
            MOBILE_TOUCH.gesture = null;
        }

        return;
    }

    if (
        gesture &&
        gesture.pointerId === event.pointerId &&
        gesture.type === 'pending' &&
        !gesture.moved
    ) {
        finishMobileTap(
            event,
            gesture
        );
    }

    MOBILE_TOUCH.gesture = null;
}

function handleMobilePointerCancel(event) {
    if (event.pointerType !== 'touch') {
        return;
    }

    MOBILE_TOUCH.pointers.delete(
        event.pointerId
    );

    if (
        MOBILE_TOUCH.gesture?.type === 'tool'
    ) {
        handleMapToolMouseUp();
    }

    if (MOBILE_TOUCH.pointers.size < 2) {
        MOBILE_TOUCH.gesture = null;
    }
}

/* =========================
   BOTTOM SHEET
   ========================= */

function setMobileSheetOpen(open) {
    const sheet = $('mobileSheet');

    if (!sheet) {
        return;
    }

    MOBILE_TOUCH.sheetOpen = Boolean(open);

    sheet.classList.toggle(
        'open',
        MOBILE_TOUCH.sheetOpen
    );

    sheet.classList.remove('dragging');
    sheet.style.transform = '';

    sheet.setAttribute(
        'aria-expanded',
        MOBILE_TOUCH.sheetOpen
            ? 'true'
            : 'false'
    );

    document.body.classList.toggle(
        'mobile-sheet-open',
        MOBILE_TOUCH.sheetOpen
    );

    if (typeof resize === 'function') {
        window.requestAnimationFrame(resize);
    }
}

function selectMobileTab(name) {
    document
        .querySelectorAll('[data-mobile-tab]')
        .forEach(button => {
            button.classList.toggle(
                'active',
                button.dataset.mobileTab === name
            );
        });

    document
        .querySelectorAll('[data-mobile-panel]')
        .forEach(panel => {
            panel.classList.toggle(
                'active',
                panel.dataset.mobilePanel === name
            );
        });

    setMobileSheetOpen(true);
}

function getMobileSheetClosedTranslate() {
    const sheet = $('mobileSheet');

    if (!sheet) {
        return 0;
    }

    const styles = getComputedStyle(
        document.body
    );

    const peek = parseFloat(
        styles.getPropertyValue(
            '--mobile-sheet-peek'
        )
    ) || 92;

    return Math.max(
        0,
        sheet.getBoundingClientRect().height - peek
    );
}

function bindMobileSheet() {
    const sheet = $('mobileSheet');
    const handle = $('mobileSheetHandle');

    if (!sheet || !handle) {
        return;
    }

    document
        .querySelectorAll('[data-mobile-tab]')
        .forEach(button => {
            button.addEventListener(
                'click',
                () => {
                    selectMobileTab(
                        button.dataset.mobileTab
                    );
                }
            );
        });

    handle.addEventListener(
        'click',
        () => {
            if (!MOBILE_TOUCH.sheetDragging) {
                setMobileSheetOpen(
                    !MOBILE_TOUCH.sheetOpen
                );
            }
        }
    );

    handle.addEventListener(
        'pointerdown',
        event => {
            if (event.pointerType !== 'touch') {
                return;
            }

            event.preventDefault();

            MOBILE_TOUCH.sheetDragging = false;
            MOBILE_TOUCH.sheetStartY = event.clientY;
            MOBILE_TOUCH.sheetStartTranslate =
                MOBILE_TOUCH.sheetOpen
                    ? 0
                    : getMobileSheetClosedTranslate();

            sheet.classList.add('dragging');

            try {
                handle.setPointerCapture(event.pointerId);
            } catch (_) {}
        }
    );

    handle.addEventListener(
        'pointermove',
        event => {
            if (
                event.pointerType !== 'touch' ||
                !sheet.classList.contains('dragging')
            ) {
                return;
            }

            const delta =
                event.clientY -
                MOBILE_TOUCH.sheetStartY;

            if (Math.abs(delta) > 4) {
                MOBILE_TOUCH.sheetDragging = true;
            }

            const closed =
                getMobileSheetClosedTranslate();

            const next = Math.max(
                0,
                Math.min(
                    closed,
                    MOBILE_TOUCH.sheetStartTranslate +
                    delta
                )
            );

            sheet.style.transform =
                `translateY(${next}px)`;
        }
    );

    const finishSheetDrag = event => {
        if (event.pointerType !== 'touch') {
            return;
        }

        if (!sheet.classList.contains('dragging')) {
            return;
        }

        const delta =
            event.clientY -
            MOBILE_TOUCH.sheetStartY;

        const shouldOpen =
            MOBILE_TOUCH.sheetDragging
                ? (
                    Math.abs(delta) >= 34
                        ? delta < 0
                        : MOBILE_TOUCH.sheetOpen
                )
                : MOBILE_TOUCH.sheetOpen;

        sheet.classList.remove('dragging');
        sheet.style.transform = '';

        if (MOBILE_TOUCH.sheetDragging) {
            setMobileSheetOpen(shouldOpen);
        }

        window.setTimeout(
            () => {
                MOBILE_TOUCH.sheetDragging = false;
            },
            0
        );
    };

    handle.addEventListener(
        'pointerup',
        finishSheetDrag
    );

    handle.addEventListener(
        'pointercancel',
        finishSheetDrag
    );
}

function bindMobileCanvas() {
    c.addEventListener(
        'pointerdown',
        handleMobilePointerDown,
        { passive: false }
    );

    c.addEventListener(
        'pointermove',
        handleMobilePointerMove,
        { passive: false }
    );

    c.addEventListener(
        'pointerup',
        handleMobilePointerUp,
        { passive: false }
    );

    c.addEventListener(
        'pointercancel',
        handleMobilePointerCancel,
        { passive: false }
    );
}

function updateMobileDesktopLink() {
    const link =
        $('mobileDesktopVersion');

    if (!link) {
        return;
    }

    const siteRoot =
        new URL(
            './',
            document.baseURI
        );

    const languagePath =
        LANG &&
        LANG !== DEFAULT_LANG
            ? `${LANG}/`
            : '';

    const target =
        new URL(
            languagePath,
            siteRoot
        );

    target.searchParams.set(
        'desktop',
        '1'
    );

    link.href =
        target.href;
}

function initMobileUI() {
    if (!isMobileApp()) {
        return;
    }

    /*
     * Visiting the mobile route explicitly restores
     * automatic device routing for future desktop visits.
     */
    try {
        sessionStorage.removeItem(
            'wardogs-force-desktop'
        );
    } catch (_) {
        // Storage access is optional.
    }

    updateMobileDesktopLink();

    $('mobileDesktopVersion')
        ?.addEventListener(
            'click',
            () => {
                if (
                    typeof trackAnalytics ===
                    'function'
                ) {
                    trackAnalytics(
                        'desktop-version'
                    );
                }
            }
        );

    bindMobileCanvas();
    bindMobileSheet();
    setMobileSheetOpen(false);
    selectMobileTab('solution');
    setMobileSheetOpen(false);

    if (window.visualViewport) {
        window.visualViewport.addEventListener(
            'resize',
            () => {
                if (typeof resize === 'function') {
                    resize();
                }
            }
        );
    }
}
