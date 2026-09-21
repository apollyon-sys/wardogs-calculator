/* =========================
   MAP ASSETS
   ========================= */

function normalizeMarkerAsset(
    id,
    asset
) {

    if (!isValidRegistryId(id)) {
        return null;
    }

    if (
        typeof asset === 'string'
    ) {

        return {
            id,
            path: asset,
            labelKey: null,
            width: 32,
            height: 32,
            anchorX: 0.5,
            anchorY: 0.5,
            placeable: true
        };
    }

    if (
        !asset ||
        typeof asset !== 'object' ||
        typeof asset.path !== 'string' ||
        !asset.path.trim()
    ) {
        return null;
    }

    return {
        id,

        path:
            asset.path.trim(),

        labelKey:
            typeof asset.labelKey === 'string' &&
            asset.labelKey.trim()
                ? asset.labelKey.trim()
                : null,

        width:
            typeof asset.width === 'number' &&
            asset.width > 0
                ? asset.width
                : 32,

        height:
            typeof asset.height === 'number' &&
            asset.height > 0
                ? asset.height
                : 32,

        anchorX:
            typeof asset.anchorX === 'number'
                ? Math.max(
                    0,
                    Math.min(
                        1,
                        asset.anchorX
                    )
                )
                : 0.5,

        anchorY:
            typeof asset.anchorY === 'number'
                ? Math.max(
                    0,
                    Math.min(
                        1,
                        asset.anchorY
                    )
                )
                : 0.5,

        placeable:
            asset.placeable !== false
    };
}

async function loadMapAssets() {

    let data = null;

    try {
        data =
            await fetchJSON(
                'maps/assets.json'
            );
    } catch (error) {
        /*
         * Marker artwork is optional. If the registry is still unavailable
         * after fetchJSON() exhausts its retry, keep the calculator usable
         * without user-placeable marker icons.
         */
        MAP_ASSETS = createSafeRegistry();

        console.warn(
            'Map marker assets unavailable; continuing without marker assets.',
            error
        );
        return;
    }

    const source =
        data &&
        typeof data === 'object' &&
        data.markerIcons &&
        typeof data.markerIcons === 'object'
            ? data.markerIcons
            : {};

    MAP_ASSETS = createSafeRegistry();

    Object.entries(source)
        .forEach(
            ([id, asset]) => {

                const normalized =
                    normalizeMarkerAsset(
                        id,
                        asset
                    );

                if (normalized) {
                    MAP_ASSETS[id] =
                        normalized;
                }
            }
        );
}

function getMarkerAsset(id) {

    if (
        typeof id !== 'string' ||
        !id
    ) {
        return null;
    }

    return (
        hasRegistryEntry(MAP_ASSETS, id)
            ? MAP_ASSETS[id]
            : null
    );
}

/*
 * Assets may name a locale key for their picker label. Without one the id
 * itself is presentable enough ("recon" -> "Recon", "spawn_board" ->
 * "Spawn board"), which keeps new icons usable before they are translated.
 */
function getMarkerAssetLabel(asset) {

    if (!asset) {
        return '';
    }

    if (asset.labelKey) {

        const translated =
            tr(asset.labelKey);

        if (
            translated &&
            translated !== asset.labelKey
        ) {
            return translated;
        }
    }

    const words =
        asset.id
            .split(/[_-]+/)
            .filter(Boolean);

    if (!words.length) {
        return asset.id;
    }

    return (
        words[0].charAt(0).toUpperCase() +
        words[0].slice(1) +
        (
            words.length > 1
                ? ' ' + words.slice(1).join(' ')
                : ''
        )
    );
}

function loadMarkerImage(asset) {

    if (!asset) {
        return null;
    }

    const key =
        asset.path;

    if (
        MARKER_IMAGE_CACHE.has(
            key
        )
    ) {
        return MARKER_IMAGE_CACHE.get(
            key
        );
    }

    const image =
        new Image();

    image.decoding =
        'async';

    const entry = {
        image,
        loaded: false,
        failed: false
    };

    image.onload =
        () => {

            entry.loaded =
                true;

            draw();
        };

    image.onerror =
        () => {

            entry.failed =
                true;

            console.warn(
                `Failed to load marker image: ${asset.path}`
            );

            draw();
        };

    image.src =
        resourceURL(
            asset.path
        );

    MARKER_IMAGE_CACHE.set(
        key,
        entry
    );

    return entry;
}


/* =========================
   MAP ICON APPEARANCE
   ========================= */

function getMapIconCanvasFilter() {

    return (
        document.documentElement
            .dataset.theme === 'light'
            ? 'brightness(0.88) saturate(0.92) contrast(1.06)'
            : 'none'
    );
}
