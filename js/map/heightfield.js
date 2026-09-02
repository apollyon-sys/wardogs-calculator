/* =========================
   HEIGHTFIELD
   ========================= */

/*
 * The coarse terrain grid the range ring solves against, baked by
 * scripts/build-heightfield.mjs.
 *
 * js/features/terrain-ballistics.js streams two chunks per firing solution,
 * which is right for two points and hopeless for a ring: a 2.6 km circle
 * sweeps about 36 chunks, roughly 19 MB. This asset is the whole map at
 * 32 m for 234 KB.
 *
 * This is not opt-in. The range ring is always drawn, and drawing it as a
 * flat circle is wrong by a median 470 m on Bakurani, so the fetch starts
 * as soon as a supported map is shown.
 *
 * Heights sit on the same offset datum as everything else in
 * docs/terrain.md — roughly 900 m below a real altitude. Only differences
 * are ever taken.
 */

const HEIGHTFIELD_FORMAT = 'wardogs-heightfield-u16-v1';

const HEIGHTFIELD_MAP_IDS = [
    'bakurani',
    'ozeti'
];

const HEIGHTFIELD_CACHE = new Map();

function mapHasHeightfield(mapId) {
    return HEIGHTFIELD_MAP_IDS.includes(mapId);
}

function heightfieldUrl(mapId, file) {
    return `data/terrain/${mapId}/${file}`;
}

/*
 * Decoded once, at load, into a Float32Array. 346 x 346 floats is 479 KB
 * resident and turns every later sample into two array reads instead of a
 * DataView call and a multiply.
 */
function decodeHeightfield(header, buffer) {
    const raw = new Uint16Array(buffer);

    const expected = header.grid.width * header.grid.height;

    if (raw.length !== expected) {
        throw new Error(
            `Heightfield has ${raw.length} samples, header says ${expected}`
        );
    }

    const span = header.maxZMeters - header.minZMeters;
    const heights = new Float32Array(expected);

    for (let i = 0; i < expected; i += 1) {
        heights[i] = header.minZMeters + (raw[i] / 65535) * span;
    }

    return {
        heights,
        width: header.grid.width,
        height: header.grid.height,
        originX: header.grid.originX,
        originY: header.grid.originY,
        stepGameUnits: header.grid.stepGameUnits,
        minZMeters: header.minZMeters
    };
}

function loadHeightfield(mapId) {
    if (!mapHasHeightfield(mapId)) {
        return Promise.resolve(null);
    }

    if (HEIGHTFIELD_CACHE.has(mapId)) {
        return Promise.resolve(HEIGHTFIELD_CACHE.get(mapId));
    }

    const pending = fetch(heightfieldUrl(mapId, 'heightfield.json'))
        .then(response => {
            if (!response.ok) {
                throw new Error(
                    `${response.status} ${response.statusText}`
                );
            }

            return response.json();
        })
        .then(header => {
            if (header?.format !== HEIGHTFIELD_FORMAT) {
                throw new Error(
                    `Unsupported heightfield format ${header?.format}`
                );
            }

            return fetch(heightfieldUrl(mapId, header.file))
                .then(response => {
                    if (!response.ok) {
                        throw new Error(
                            `${response.status} ${response.statusText}`
                        );
                    }

                    return response.arrayBuffer();
                })
                .then(buffer => decodeHeightfield(header, buffer));
        })
        .then(decoded => {
            HEIGHTFIELD_CACHE.set(mapId, decoded);

            return decoded;
        })
        .catch(error => {
            console.warn(
                `[heightfield] Could not load ${mapId}; ` +
                'range rings will stay circular.',
                error
            );

            HEIGHTFIELD_CACHE.set(mapId, null);

            return null;
        });

    HEIGHTFIELD_CACHE.set(mapId, pending);

    return pending;
}

function cachedHeightfield(mapId) {
    const cached = HEIGHTFIELD_CACHE.get(mapId);

    if (!cached || typeof cached.then === 'function') {
        return null;
    }

    return cached;
}

/*
 * Fire-and-forget. Until it lands cachedHeightfield returns null and the
 * ring falls back to the circle, exactly as it does on an unsupported map.
 */
function ensureHeightfieldLoaded(mapId) {
    if (!mapId || HEIGHTFIELD_CACHE.has(mapId)) {
        return;
    }

    loadHeightfield(mapId).then(decoded => {
        if (decoded) {
            draw();
        }
    });
}

/*
 * Bilinear, mirroring sampleGrid in scripts/lib/heightfield.mjs. Rows run
 * south to north, so the row index is a plain add.
 */
function heightfieldSample(field, gameX, gameY) {
    if (!field || !Number.isFinite(gameX) || !Number.isFinite(gameY)) {
        return null;
    }

    const fi = (gameX - field.originX) / field.stepGameUnits;
    const fj = (gameY - field.originY) / field.stepGameUnits;

    if (
        fi < 0 ||
        fj < 0 ||
        fi > field.width - 1 ||
        fj > field.height - 1
    ) {
        return null;
    }

    const i0 = Math.floor(fi);
    const j0 = Math.floor(fj);
    const i1 = Math.min(i0 + 1, field.width - 1);
    const j1 = Math.min(j0 + 1, field.height - 1);

    const tx = fi - i0;
    const ty = fj - j0;

    const z00 = field.heights[j0 * field.width + i0];
    const z10 = field.heights[j0 * field.width + i1];
    const z01 = field.heights[j1 * field.width + i0];
    const z11 = field.heights[j1 * field.width + i1];

    const bottom = z00 + (z10 - z00) * tx;
    const top = z01 + (z11 - z01) * tx;

    return bottom + (top - bottom) * ty;
}
