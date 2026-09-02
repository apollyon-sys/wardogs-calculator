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
         * A FOB build area is a square, so it is measured by `halfSide`:
         * the distance from the FOB to an edge, and the buildable side is
         * twice it. There is no circle involved and no radius to name.
         *
         * The 60 m half-side is confirmed from the game data — the build
         * area is a 120 x 120 m square. Override it in config/app.json
         * rather than here.
         */
        rings: {
            fob: {
                halfSide: 60,
                color: '#5fa8d3'
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
 * A ring kind names its own measurement key in config/app.json rather than
 * sharing one that would only be honest about some of them: a FOB build area
 * has a `halfSide`. The measurement comes back as `size`, so the drawing code
 * does not have to know which kind it was handed.
 */
const RING_SIZE_KEYS = {
    fob: 'halfSide'
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
