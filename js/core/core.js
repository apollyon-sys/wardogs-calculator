let WEAPONS = {};
let APP_CONFIG = {};

const S = {
    w: 16,
    h: 16,

    zoom: 1,

    mode: 'origin',

    map: 'bakurani',

    weapon: null,

    origin: {
        x: 5,
        y: 5
    },

    target: {
        x: 5.5,
        y: 5.5
    },

    panX: 0,
    panY: 0
};

let LANG = 'en';
let DEFAULT_LANG = 'en';

let LANGUAGES = [];
let I18N = {};
let MAPS = {};
let MAP_ASSETS = {};

let drag = null;
let pan = null;

let savedTargets = [];

const SAVED_TARGETS_KEY =
    'wardogs-saved-targets';

const SAVE_ARTILLERY_KEY =
    'wardogs-save-artillery-position';


/* =========================
   ZOOM
   ========================= */

const MIN_ZOOM = 0.4;

const ZOOM_BUTTON_FACTOR = 1.25;
const ZOOM_WHEEL_IN = 1.15;
const ZOOM_WHEEL_OUT = 0.87;


/* =========================
   TILE DEFAULTS
   ========================= */

/*
 * These are only fallback values.
 *
 * Real map-specific values belong
 * inside the map JSON.
 */
const DEFAULT_TILE_SIZE = 256;
const DEFAULT_TILE_MIN_ZOOM = 0;
const DEFAULT_TILE_MAX_ZOOM = 5;
const DEFAULT_TILE_EXTENSION = 'webp';

const TILE_CACHE =
    new Map();

const TILE_CACHE_LIMIT = 256;

let TILE_FRAME = 0;

const MARKER_IMAGE_CACHE =
    new Map();

function beginTileFrame() {

    TILE_FRAME++;
}

function closeTileImage(image) {

    if (
        typeof ImageBitmap !== 'undefined' &&
        image instanceof ImageBitmap
    ) {
        image.close();
    }
}

function getCachedTile(key) {

    if (!TILE_CACHE.has(key)) {
        return null;
    }

    const tile =
        TILE_CACHE.get(key);

    TILE_CACHE.delete(key);
    TILE_CACHE.set(
        key,
        tile
    );

    tile.frame = TILE_FRAME;

    return tile;
}

function setCachedTile(
    key,
    tile
) {

    tile.frame = TILE_FRAME;

    TILE_CACHE.delete(key);
    TILE_CACHE.set(
        key,
        tile
    );

    if (TILE_CACHE.size <= TILE_CACHE_LIMIT) {
        return;
    }

    for (const [evictKey, evicted] of TILE_CACHE) {

        if (TILE_CACHE.size <= TILE_CACHE_LIMIT) {
            break;
        }

        if (evicted.frame === TILE_FRAME) {
            continue;
        }

        TILE_CACHE.delete(evictKey);
        closeTileImage(evicted.image);
    }
}

const CSS_VAR_CACHE =
    new Map();

function cssVar(
    name,
    fallback
) {

    if (CSS_VAR_CACHE.has(name)) {
        return CSS_VAR_CACHE.get(name);
    }

    const value =
        getComputedStyle(
            document.documentElement
        )
            .getPropertyValue(name)
            .trim() ||
        fallback;

    CSS_VAR_CACHE.set(
        name,
        value
    );

    return value;
}

function invalidateCssVarCache() {

    CSS_VAR_CACHE.clear();
}

const MAX_RENDER_SCALE = 2;

function renderScale() {

    return Math.min(
        MAX_RENDER_SCALE,
        window.devicePixelRatio ||
        1
    );
}


/* =========================
   DOM
   ========================= */

const $ = id =>
    document.getElementById(id);

/*
 * Writing the same string back still dirties layout, and the readouts are
 * rewritten on every pointer move while barely changing between frames.
 */
const setText = (el, value) => {
    if (el && el.textContent !== value) {
        el.textContent = value;
    }
};

const setStyle = (el, prop, value) => {
    if (el && el.style[prop] !== value) {
        el.style[prop] = value;
    }
};

const c =
    $('canvas');

const wrap =
    document.querySelector('.map');

const ctx =
    c.getContext('2d');

const BASE_PATH =
    new URL(
        '.',
        document.baseURI
    );