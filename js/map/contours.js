/* =========================
   CONTOURS
   ========================= */

/*
 * Terrain contour lines, precomputed by scripts/build-contours.mjs.
 *
 * The heightfield itself is 129 MB per map and js/features/terrain-ballistics.js
 * only ever streams the two chunks a firing solution touches. A contour layer
 * needs the whole map, so the lines are baked at build time into one file per
 * map — a few hundred KB — and fetched here the first time somebody turns the
 * layer on. Nobody who leaves it off ever downloads anything.
 *
 * Lines carry no altitude labels. The heightfield sits on an offset datum
 * (see docs/terrain.md), so an absolute label would be wrong by roughly
 * 900 m; the shape of the ground is what the layer is for.
 */

const CONTOURS_FORMAT = 'wardogs-contours-v1';

/*
 * Maps known to ship a contours.json. Listed rather than probed so the
 * Layers popover can decide whether to offer the toggle without a fetch.
 */
const CONTOUR_MAP_IDS = [
    'bakurani',
    'ozeti'
];

/*
 * Every line is stroked twice: a dark casing, then the line itself. Map
 * tiles are photographic, so a single thin stroke disappears into snow on
 * one ridge and into shadow on the next. The casing is what makes the
 * colour legible over all of it.
 */
const CONTOUR_STYLE = {
    casing: 'rgba(0, 0, 0, 0.55)',
    minorWidth: 1,
    majorWidth: 2.2,
    casingExtra: 1.6,
    minorAlpha: 0.75,
    majorAlpha: 1
};

/*
 * Hypsometric ramp, low ground to high. Without it every line is the same
 * colour and a contour map is just a wall of squiggles — you cannot tell a
 * basin from a summit without tracing a line by eye. Colour carries the
 * height so the shape of the ground reads at a glance.
 */
const CONTOUR_RAMP = [
    [0.00, [79, 127, 168]],
    [0.20, [95, 168, 127]],
    [0.42, [176, 189, 92]],
    [0.60, [215, 194, 95]],
    [0.76, [217, 139, 74]],
    [0.90, [201, 96, 63]],
    [1.00, [242, 228, 216]]
];

function contourRampColor(fraction) {
    const t = Math.min(1, Math.max(0, fraction));

    let lower = CONTOUR_RAMP[0];
    let upper = CONTOUR_RAMP[CONTOUR_RAMP.length - 1];

    for (let i = 0; i < CONTOUR_RAMP.length - 1; i += 1) {
        if (t >= CONTOUR_RAMP[i][0] && t <= CONTOUR_RAMP[i + 1][0]) {
            lower = CONTOUR_RAMP[i];
            upper = CONTOUR_RAMP[i + 1];
            break;
        }
    }

    const span = upper[0] - lower[0];

    const local = span > 0
        ? (t - lower[0]) / span
        : 0;

    const channel = index => Math.round(
        lower[1][index] +
        (upper[1][index] - lower[1][index]) * local
    );

    return `rgb(${channel(0)}, ${channel(1)}, ${channel(2)})`;
}

const CONTOUR_CACHE = new Map();

function mapHasContours(mapId) {
    return CONTOUR_MAP_IDS.includes(mapId);
}

function contoursUrl(mapId) {
    return `data/terrain/${mapId}/contours.json`;
}

/*
 * Turns the delta-encoded payload into absolute game coordinates once, so
 * every later frame is a straight coordinate transform.
 *
 * Grid rows run north to south, which is why y is subtracted.
 */
function decodeContours(payload) {
    const quantisation =
        Number(payload.quantisation) || 10;

    const grid = payload.grid || {};

    const originX = Number(grid.originX);
    const originY = Number(grid.originY);
    const stepX = Number(grid.stepX);
    const stepY = Number(grid.stepY);

    if (
        ![originX, originY, stepX, stepY].every(Number.isFinite)
    ) {
        throw new Error('Contour payload has an unusable grid');
    }

    const levels = [];

    /*
     * Heights are relative to the lowest sample in the map's own bounds, so
     * the ramp is stretched across whatever relief this map actually has —
     * Bakurani's 1082 m and Ozeti's 388 m both use the full range.
     */
    const relief =
        Number(payload.reliefMeters) ||
        Math.max(
            1,
            ...(payload.levels || []).map(
                level => Number(level.relativeMeters) || 0
            )
        );

    for (const level of payload.levels || []) {
        const lines = [];

        for (const flat of level.lines || []) {
            const points = new Float32Array(flat.length);

            let x = 0;
            let y = 0;

            let minPointX = Infinity;
            let maxPointX = -Infinity;
            let minPointY = Infinity;
            let maxPointY = -Infinity;

            for (let i = 0; i < flat.length; i += 2) {
                x += flat[i];
                y += flat[i + 1];

                const pointX = originX + (x / quantisation) * stepX;
                const pointY = originY - (y / quantisation) * stepY;

                points[i] = pointX;
                points[i + 1] = pointY;

                if (pointX < minPointX) {
                    minPointX = pointX;
                }

                if (pointX > maxPointX) {
                    maxPointX = pointX;
                }

                if (pointY < minPointY) {
                    minPointY = pointY;
                }

                if (pointY > maxPointY) {
                    maxPointY = pointY;
                }
            }

            lines.push({
                points,
                minX: minPointX,
                maxX: maxPointX,
                minY: minPointY,
                maxY: maxPointY
            });
        }

        levels.push({
            major: Boolean(level.major),
            relativeMeters: Number(level.relativeMeters),
            color: contourRampColor(
                Number(level.relativeMeters) / relief
            ),
            lines
        });
    }

    return {
        mapId: payload.mapId,
        intervalMeters: Number(payload.intervalMeters),
        reliefMeters: relief,
        levels,
        paths: null,
        /*
         * Offscreen raster of the drawn layer, created on first draw and
         * reused until the zoom changes or a pan runs off its margin.
         */
        raster: null
    };
}

/*
 * Resolves to the decoded contours for a map, or null if the map has none.
 * Concurrent callers share one fetch, and a failure is cached as null so a
 * missing file does not re-request on every redraw.
 */
function loadContours(mapId) {
    if (!mapHasContours(mapId)) {
        return Promise.resolve(null);
    }

    if (CONTOUR_CACHE.has(mapId)) {
        return Promise.resolve(CONTOUR_CACHE.get(mapId));
    }

    const pending = fetch(contoursUrl(mapId))
        .then(response => {
            if (!response.ok) {
                throw new Error(
                    `${response.status} ${response.statusText}`
                );
            }

            return response.json();
        })
        .then(payload => {
            if (payload?.format !== CONTOURS_FORMAT) {
                throw new Error(
                    `Unsupported contour format ${payload?.format}`
                );
            }

            const decoded = decodeContours(payload);

            CONTOUR_CACHE.set(mapId, decoded);

            return decoded;
        })
        .catch(error => {
            console.warn(
                `[contours] Could not load ${mapId} contours; ` +
                'the layer will stay empty.',
                error
            );

            CONTOUR_CACHE.set(mapId, null);

            return null;
        });

    CONTOUR_CACHE.set(mapId, pending);

    return pending;
}

function cachedContours(mapId) {
    const cached = CONTOUR_CACHE.get(mapId);

    if (!cached || typeof cached.then === 'function') {
        return null;
    }

    return cached;
}

/*
 * Called when the layer is switched on, and on map change while it is on.
 * The fetch is fire-and-forget: draw() renders nothing until it lands, then
 * redraws.
 */
function ensureContoursLoaded(mapId) {
    if (!mapId || CONTOUR_CACHE.has(mapId)) {
        return;
    }

    loadContours(mapId).then(decoded => {
        if (decoded) {
            draw();
        }
    });
}

/*
 * Bakurani is 54 levels of a few hundred polylines each. Stroking that on
 * every frame — twice, once for the casing — makes a drag visibly stutter,
 * and a drag redraws on every pointer move.
 *
 * So the layer is rasterised once into an offscreen canvas covering the
 * viewport plus a margin, and every frame after that is one drawImage. The
 * raster is rebuilt only when the zoom changes or a pan reaches the edge of
 * the margin, which is what makes the cost independent of how many lines
 * the map has.
 */
const CONTOUR_RASTER_MARGIN = 320;

/*
 * Path2D per polyline, in game coordinates. Building a path is the
 * expensive part — Bakurani is 79,615 points across 861 polylines — so it
 * is done once per map and never again. The raster transform carries the
 * scale and the pan instead, which is what makes a zoom step cost nothing
 * to prepare.
 *
 * Each polyline keeps the bounding box computed at decode time so the
 * renderer can skip whatever is nowhere near the raster.
 */
function ensureContourPaths(data) {
    if (data.paths) {
        return data.paths;
    }

    data.paths = data.levels.map(level => {
        const lines = level.lines.map(line => {
            const path = new Path2D();
            const points = line.points;

            path.moveTo(points[0], points[1]);

            for (let i = 2; i < points.length; i += 2) {
                path.lineTo(points[i], points[i + 1]);
            }

            return {
                path,
                minX: line.minX,
                maxX: line.maxX,
                minY: line.minY,
                maxY: line.maxY
            };
        });

        return {
            lines,
            major: level.major,
            color: level.color,
            width: level.major
                ? CONTOUR_STYLE.majorWidth
                : CONTOUR_STYLE.minorWidth,
            alpha: level.major
                ? CONTOUR_STYLE.majorAlpha
                : CONTOUR_STYLE.minorAlpha
        };
    });

    return data.paths;
}

const CONTOUR_MINOR_MAX_SPAN = 0.55;

function contourMinorsVisible(v) {
    const visibleSpan =
        wrap.clientWidth /
        v.scale /
        v.worldWidth;

    return visibleSpan <= CONTOUR_MINOR_MAX_SPAN;
}

/*
 * Renders the layer into `raster`, which covers the local-screen rectangle
 * starting at (originX, originY).
 *
 * Game coordinates go in and the transform does the projection, so the
 * paths never have to be rebuilt. A stroke width has to be divided by the
 * scale to come out the same thickness on screen at any zoom.
 */
function renderContourRaster(data, v, raster) {
    const target = raster.canvas.getContext('2d');
    const ratio = raster.ratio;
    const scale = v.scale;

    target.setTransform(1, 0, 0, 1, 0, 0);

    target.clearRect(
        0,
        0,
        raster.canvas.width,
        raster.canvas.height
    );

    target.setTransform(
        scale * ratio,
        0,
        0,
        -scale * ratio,
        (-v.bounds.minX * scale - raster.originX) * ratio,
        (v.bounds.maxY * scale - raster.originY) * ratio
    );

    const paths = ensureContourPaths(data);

    const pad = 4 / scale;

    const cullMinX = v.bounds.minX + raster.originX / scale - pad;
    const cullMaxX = cullMinX + raster.width / scale + pad * 2;
    const cullMaxY = v.bounds.maxY - raster.originY / scale + pad;
    const cullMinY = cullMaxY - raster.height / scale - pad * 2;

    const majorCasing = new Path2D();
    const minorCasing = new Path2D();

    const drawn = [];

    for (const level of paths) {
        if (!level.major && !raster.minors) {
            continue;
        }

        const merged = new Path2D();

        let any = false;

        for (const line of level.lines) {
            if (
                line.maxX < cullMinX ||
                line.minX > cullMaxX ||
                line.maxY < cullMinY ||
                line.minY > cullMaxY
            ) {
                continue;
            }

            merged.addPath(line.path);
            any = true;
        }

        if (!any) {
            continue;
        }

        (level.major ? majorCasing : minorCasing).addPath(merged);

        drawn.push({
            path: merged,
            color: level.color,
            width: level.width,
            alpha: level.alpha
        });
    }

    target.lineJoin = 'round';
    target.lineCap = 'round';

    /*
     * Every casing first, so one level's casing never cuts a dark notch
     * through a neighbouring line that runs alongside it. The casing is one
     * colour for the whole layer, so the levels merge into two strokes —
     * one per width — instead of one stroke each.
     */
    target.strokeStyle = CONTOUR_STYLE.casing;

    target.lineWidth =
        (CONTOUR_STYLE.minorWidth + CONTOUR_STYLE.casingExtra) / scale;

    target.stroke(minorCasing);

    target.lineWidth =
        (CONTOUR_STYLE.majorWidth + CONTOUR_STYLE.casingExtra) / scale;

    target.stroke(majorCasing);

    for (const level of drawn) {
        target.globalAlpha = level.alpha;
        target.strokeStyle = level.color;
        target.lineWidth = level.width / scale;
        target.stroke(level.path);
    }

    target.globalAlpha = 1;
}

const CONTOUR_REBUILD_DELAY = 140;

const CONTOUR_MAX_STRETCH_IN = 1.8;

const CONTOUR_MAX_STRETCH_OUT = 0.8;

let contourRebuildTimer = null;

let contourRebuildAt = 0;

/*
 * One timer that re-arms itself against a moving deadline, rather than a
 * clear and a fresh timer per zoom step. A profile of a zoom put 81 ms of
 * main-thread time in clearTimeout alone.
 */
function contourRebuildTick() {
    if (!contourRebuildAt) {
        contourRebuildTimer = null;
        return;
    }

    const remaining = contourRebuildAt - performance.now();

    if (remaining > 0) {
        contourRebuildTimer = setTimeout(contourRebuildTick, remaining);
        return;
    }

    contourRebuildTimer = null;
    contourRebuildAt = 0;

    draw();
}

function scheduleContourRebuild() {
    contourRebuildAt = performance.now() + CONTOUR_REBUILD_DELAY;

    if (contourRebuildTimer === null) {
        contourRebuildTimer = setTimeout(
            contourRebuildTick,
            CONTOUR_REBUILD_DELAY
        );
    }
}

function drawContours(currentMap) {
    const mapId = currentMap?.id;

    if (!mapId || !mapHasContours(mapId)) {
        return;
    }

    ensureContoursLoaded(mapId);

    const data = cachedContours(mapId);

    if (!data) {
        return;
    }

    const v = view();

    /*
     * draw() has already translated by (v.left, v.top), so the visible
     * region in that space starts at (-v.left, -v.top).
     */
    const visibleX = -v.left;
    const visibleY = -v.top;
    const visibleWidth = wrap.clientWidth;
    const visibleHeight = wrap.clientHeight;

    const ratio = renderScale();

    const width = visibleWidth + CONTOUR_RASTER_MARGIN * 2;
    const height = visibleHeight + CONTOUR_RASTER_MARGIN * 2;

    const minors = contourMinorsVisible(v);

    let raster = data.raster;

    /*
     * Coverage is tested in game coordinates, not in the local screen space
     * the raster was drawn in, because that space moves with the zoom and a
     * raster from a different scale still has to be placeable.
     */
    const viewMinX = v.bounds.minX + visibleX / v.scale;
    const viewMaxY = v.bounds.maxY - visibleY / v.scale;
    const viewMaxX = viewMinX + visibleWidth / v.scale;
    const viewMinY = viewMaxY - visibleHeight / v.scale;

    const covers =
        raster &&
        viewMinX >= raster.gameMinX &&
        viewMaxX <= raster.gameMaxX &&
        viewMinY >= raster.gameMinY &&
        viewMaxY <= raster.gameMaxY;

    const stretch = raster
        ? v.scale / raster.scale
        : 1;

    const zoomed =
        raster &&
        (
            raster.scale !== v.scale ||
            raster.minors !== minors
        );

    /*
     * A zoom step alone does not rebuild. The existing raster is stretched
     * to the new scale and the rebuild waits until the zoom stops, because
     * stroking the layer is GPU work that does not show up on the main
     * thread and doing it per wheel event is what makes a zoom stutter.
     * Anything the stretch cannot cover rebuilds at once: a new size, a pan
     * off the margin, a zoom in far enough that the stretch turns to mush,
     * or a zoom out far enough to pull ground in from beyond the margin.
     */
    const rebuild =
        !raster ||
        raster.ratio !== ratio ||
        raster.width !== width ||
        raster.height !== height ||
        (
            zoomed
                ? (
                    stretch > CONTOUR_MAX_STRETCH_IN ||
                    stretch < CONTOUR_MAX_STRETCH_OUT
                )
                : !covers
        );

    if (rebuild) {
        contourRebuildAt = 0;

        if (!raster) {
            raster = { canvas: document.createElement('canvas') };
            data.raster = raster;
        }

        raster.scale = v.scale;
        raster.ratio = ratio;
        raster.width = width;
        raster.height = height;
        raster.minors = minors;
        raster.originX = visibleX - CONTOUR_RASTER_MARGIN;
        raster.originY = visibleY - CONTOUR_RASTER_MARGIN;

        raster.gameMinX = v.bounds.minX + raster.originX / v.scale;
        raster.gameMaxY = v.bounds.maxY - raster.originY / v.scale;
        raster.gameMaxX = raster.gameMinX + width / v.scale;
        raster.gameMinY = raster.gameMaxY - height / v.scale;

        /*
         * Assigning to width or height reallocates and zeroes the backing
         * store, which the size almost never needs.
         */
        const pixelWidth = Math.round(width * ratio);
        const pixelHeight = Math.round(height * ratio);

        if (
            raster.canvas.width !== pixelWidth ||
            raster.canvas.height !== pixelHeight
        ) {
            raster.canvas.width = pixelWidth;
            raster.canvas.height = pixelHeight;
        }

        renderContourRaster(data, v, raster);
    } else if (zoomed) {
        scheduleContourRebuild();
    }

    /*
     * Placed from the game rectangle it was drawn for, so a raster built at
     * another scale lands where the ground it describes now sits.
     */
    ctx.drawImage(
        raster.canvas,
        (raster.gameMinX - v.bounds.minX) * v.scale,
        (v.bounds.maxY - raster.gameMaxY) * v.scale,
        (raster.gameMaxX - raster.gameMinX) * v.scale,
        (raster.gameMaxY - raster.gameMinY) * v.scale
    );
}
