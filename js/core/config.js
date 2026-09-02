/* =========================
   APPLICATION CONFIG
   ========================= */

const DEFAULT_APP_CONFIG = {
    map: {
        camera: {
            maxZoom: 100,
            panSpeed: 800
        },

        /*
         * PLACEHOLDER SIZES — these are not measured in-game values.
         * Both are in metres and exist so the shapes render at a sane
         * size until someone confirms the real numbers; replace them in
         * config/app.json rather than here.
         *
         * A FOB build area is a square, so it is measured by `halfSide`:
         * the distance from the FOB to an edge, and the buildable side is
         * twice it. There is no circle involved and no radius to name.
         *
         * The main zone is a circle and `radius` means what it says —
         * a fallback only. Real maps record their own centre and radius in
         * maps/*.json, taken from the game's own control-zone values.
         */
        rings: {
            fob: {
                halfSide: 60,
                color: '#5fa8d3'
            },
            mainZone: {
                radius: 500,
                color: '#82c596'
            }
        }
    },

    site: {
        footer: {
            disclaimer:
                'Unofficial community project. Not affiliated with or endorsed by BULKHEAD or the WARDOGS development team.',
            productName:
                'WARDOGS Artillery Calculator',
            authorLabel:
                'by',
            authorName:
                'Apollyon',
            authorUrl:
                'https://discord.com/users/202109460238434304',
            version:
                '1.0'
        }
    },

    mapTools: {
        shortcuts: {
            ruler: 'r',
            pencil: 'p',
            eraser: 'e',
            marker: 'm',
            coordinateSearch: 'f',
            layers: 'l',
            clearTool: 'escape',
            undo: 'ctrl+z',
            redo: 'ctrl+y',
            redoAlt: 'ctrl+shift+z'
        }
    }
};

function mergeAppConfig(base, override) {
    return {
        ...base,
        ...(override || {}),

        map: {
            ...base.map,
            ...(override?.map || {}),
            camera: {
                ...base.map.camera,
                ...(override?.map?.camera || {})
            },
            rings: {
                ...base.map.rings,
                ...(override?.map?.rings || {}),
                fob: {
                    ...base.map.rings.fob,
                    ...(override?.map?.rings?.fob || {})
                },
                mainZone: {
                    ...base.map.rings.mainZone,
                    ...(override?.map?.rings?.mainZone || {})
                }
            }
        },

        site: {
            ...base.site,
            ...(override?.site || {}),
            footer: {
                ...base.site.footer,
                ...(override?.site?.footer || {})
            }
        },

        mapTools: {
            ...base.mapTools,
            ...(override?.mapTools || {}),
            shortcuts: {
                ...base.mapTools.shortcuts,
                ...(override?.mapTools?.shortcuts || {})
            }
        }
    };
}

async function loadAppConfig() {
    try {
        const loaded =
            await fetchJSON(
                'config/app.json'
            );

        APP_CONFIG =
            mergeAppConfig(
                DEFAULT_APP_CONFIG,
                loaded
            );
    } catch (error) {
        console.warn(
            'Failed to load config/app.json, using defaults:',
            error
        );

        APP_CONFIG =
            mergeAppConfig(
                DEFAULT_APP_CONFIG,
                {}
            );
    }
}

function getMapToolShortcut(action) {
    return String(
        APP_CONFIG
            ?.mapTools
            ?.shortcuts
            ?.[action] || ''
    )
        .trim()
        .toLowerCase();
}

/*
 * The two ring kinds do not measure the same thing — a FOB build area has a
 * `halfSide`, the main zone has a `radius` — so each names its own key in
 * config/app.json rather than sharing one that is only honest about half of
 * them. The measurement comes back as `size`, so the drawing code does not
 * have to know which kind it was handed.
 */
const RING_SIZE_KEYS = {
    fob: 'halfSide',
    mainZone: 'radius'
};

function getRingConfig(kind) {

    const fallback =
        DEFAULT_APP_CONFIG.map.rings[kind];

    if (!fallback) {
        return null;
    }

    const sizeKey =
        RING_SIZE_KEYS[kind];

    const configured =
        APP_CONFIG
            ?.map
            ?.rings
            ?.[kind];

    const size =
        Number(
            configured?.[sizeKey]
        );

    const color =
        typeof configured?.color === 'string' &&
        /^#[0-9a-fA-F]{6}$/.test(configured.color)
            ? configured.color
            : fallback.color;

    return {
        size:
            Number.isFinite(size) &&
            size > 0
                ? size
                : fallback[sizeKey],
        color
    };
}

function getCameraPanSpeed() {
    const configured =
        Number(
            APP_CONFIG
                ?.map
                ?.camera
                ?.panSpeed
        );

    return (
        Number.isFinite(configured) &&
        configured > 0
            ? configured
            : DEFAULT_APP_CONFIG.map.camera.panSpeed
    );
}

function getMaxCameraZoom() {
    const configured =
        Number(
            APP_CONFIG
                ?.map
                ?.camera
                ?.maxZoom
        );

    return (
        Number.isFinite(configured) &&
        configured > 0
            ? configured
            : DEFAULT_APP_CONFIG.map.camera.maxZoom
    );
}
