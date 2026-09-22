/* =========================
   MAP
   ========================= */

function getCurrentMap() {
    return (
        MAPS[S.map] ||
        null
    );
}


/* =========================
   WORLD / VIEW BOUNDS
   ========================= */

function getViewBounds() {

    const map =
        getCurrentMap();

    if (
        map &&
        isValidBounds(
            map.bounds
        )
    ) {

        return {
            minX:
            map.bounds.minX,

            maxX:
            map.bounds.maxX,

            minY:
            map.bounds.minY,

            maxY:
            map.bounds.maxY
        };
    }

    return {
        minX: 0,
        maxX: S.w,

        minY: 0,
        maxY: S.h
    };
}


/* =========================
   VIEW
   ========================= */

/*
 * view() is called nine times or more per draw — every layer wants it —
 * and each call reads clientWidth, which forces a layout whenever anything
 * has written to the DOM since. The result is pure given the camera and
 * the viewport, so it is memoised for the rest of the current task: a
 * microtask clears it, which cannot run part-way through a draw.
 */
let viewCache = null;

function viewCacheKey() {
    return (
        S.zoom + '|' +
        S.panX + '|' +
        S.panY + '|' +
        S.map + '|' +
        S.w + '|' +
        S.h
    );
}

function view() {

    const key = viewCacheKey();

    if (viewCache && viewCache.key === key) {
        return viewCache.value;
    }

    const W =
        wrap.clientWidth;

    const H =
        wrap.clientHeight;

    const padding =
        document.body.classList.contains(
            'mobile-app'
        )
            ? 12
            : 34;

    const bounds =
        getViewBounds();

    const worldWidth =
        bounds.maxX -
        bounds.minX;

    const worldHeight =
        bounds.maxY -
        bounds.minY;

    const availableWidth =
        Math.max(
            1,
            W -
            padding * 2
        );

    const availableHeight =
        Math.max(
            1,
            H -
            padding * 2
        );

    const scale =
        Math.min(
            availableWidth /
            worldWidth,

            availableHeight /
            worldHeight
        ) *
        S.zoom;

    const mw =
        worldWidth *
        scale;

    const mh =
        worldHeight *
        scale;

    const value = {
        scale,

        bounds,

        worldWidth,
        worldHeight,

        left:
            (
                W -
                mw
            ) /
            2 +
            S.panX,

        top:
            (
                H -
                mh
            ) /
            2 +
            S.panY,

        mw,
        mh
    };

    viewCache = {
        key,
        value
    };

    queueMicrotask(
        () => {
            viewCache = null;
        }
    );

    return value;
}


/* =========================
   WORLD -> SCREEN
   ========================= */

function worldToLocalScreen(
    x,
    y
) {

    const v =
        view();

    return {
        x:
            (
                x -
                v.bounds.minX
            ) *
            v.scale,

        y:
            (
                v.bounds.maxY -
                y
            ) *
            v.scale
    };
}

function toScreen(
    x,
    y
) {

    const v =
        view();

    const local =
        worldToLocalScreen(
            x,
            y
        );

    return {
        x:
            v.left +
            local.x,

        y:
            v.top +
            local.y
    };
}


/* =========================
   SCREEN -> WORLD
   ========================= */

function toWorld(
    x,
    y
) {

    const v =
        view();

    return {
        x:
            v.bounds.minX +
            (
                x -
                v.left
            ) /
            v.scale,

        y:
            v.bounds.maxY -
            (
                y -
                v.top
            ) /
            v.scale
    };
}


/* =========================
   CLAMP
   ========================= */

function clamp(p) {

    const bounds =
        getViewBounds();

    const precision =
        getCoordinateMetersPerUnit() === 100
            ? 100
            : 1000;

    p.x =
        Math.max(
            bounds.minX,
            Math.min(
                bounds.maxX,
                Math.round(
                    p.x *
                    precision
                ) /
                precision
            )
        );

    p.y =
        Math.max(
            bounds.minY,
            Math.min(
                bounds.maxY,
                Math.round(
                    p.y *
                    precision
                ) /
                precision
            )
        );
}