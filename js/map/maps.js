/* =========================
   MAP HELPERS
   ========================= */

function formatCoord(value) {

    return Math.round(value)
        .toString()
        .padStart(4, '0');
}


function getCoordinateMetersPerUnit() {
    const map = getCurrentMap?.();

    const configured =
        Number(map?.coordinateMetersPerUnit);

    return (
        Number.isFinite(configured) &&
        configured > 0
            ? configured
            : 1000
    );
}

function worldDistanceToMeters(distance) {
    return distance * getCoordinateMetersPerUnit();
}

function metersToWorldDistance(meters) {
    return meters / getCoordinateMetersPerUnit();
}

function kilometersToWorldDistance(kilometers) {
    return metersToWorldDistance(kilometers * 1000);
}

function storedMetersToWorldCoordinate(meters) {
    return meters / getCoordinateMetersPerUnit();
}

function formatGameCoordinate(value) {
    const precision =
        getCoordinateMetersPerUnit() === 100
            ? 2
            : 0;

    return Number(value).toFixed(precision);
}

function isValidBounds(bounds) {

    return Boolean(
        bounds &&
        typeof bounds.minX === 'number' &&
        typeof bounds.maxX === 'number' &&
        typeof bounds.minY === 'number' &&
        typeof bounds.maxY === 'number' &&
        bounds.maxX > bounds.minX &&
        bounds.maxY > bounds.minY
    );
}

function isValidTileConfig(tiles) {

    return Boolean(
        tiles &&
        typeof tiles.path === 'string' &&
        tiles.path.trim()
    );
}

function normalizeMap(map) {

    const normalized = {
        ...map
    };

    /*
     * Width / height describe the
     * complete game coordinate space.
     */
    normalized.w =
        typeof map.w === 'number' &&
        map.w > 0
            ? map.w
            : 10;

    normalized.h =
        typeof map.h === 'number' &&
        map.h > 0
            ? map.h
            : 10;

    /*
     * Optional calibrated image bounds.
     *
     * If no bounds are supplied,
     * the full map coordinate space
     * is used.
     */
    if (
        !isValidBounds(
            normalized.bounds
        )
    ) {

        normalized.bounds = {
            minX: 0,
            maxX: normalized.w,
            minY: 0,
            maxY: normalized.h
        };
    }

    /*
     * Normalize tile configuration.
     */
    if (
        isValidTileConfig(
            normalized.tiles
        )
    ) {

        normalized.tiles = {
            path:
                normalized.tiles.path
                    .replace(
                        /\/+$/,
                        ''
                    ),

            tileSize:
                typeof normalized.tiles.tileSize ===
                'number'
                    ? normalized.tiles.tileSize
                    : DEFAULT_TILE_SIZE,

            minZoom:
                typeof normalized.tiles.minZoom ===
                'number'
                    ? normalized.tiles.minZoom
                    : DEFAULT_TILE_MIN_ZOOM,

            maxZoom:
                typeof normalized.tiles.maxZoom ===
                'number'
                    ? normalized.tiles.maxZoom
                    : DEFAULT_TILE_MAX_ZOOM,

            extension:
                typeof normalized.tiles.extension ===
                'string' &&
                normalized.tiles.extension.trim()
                    ? normalized.tiles.extension
                        .replace(
                            /^\./,
                            ''
                        )
                    : DEFAULT_TILE_EXTENSION
        };

        const tileStyles = {};

        Object.entries(
            map.tiles.styles || {}
        ).forEach(
            ([styleId, style]) => {
                if (
                    !styleId ||
                    !isValidTileConfig(style)
                ) {
                    return;
                }

                tileStyles[styleId] = {
                    path:
                        style.path
                            .replace(/\/+$/, ''),
                    tileSize:
                        typeof style.tileSize === 'number'
                            ? style.tileSize
                            : normalized.tiles.tileSize,
                    minZoom:
                        typeof style.minZoom === 'number'
                            ? style.minZoom
                            : normalized.tiles.minZoom,
                    maxZoom:
                        typeof style.maxZoom === 'number'
                            ? style.maxZoom
                            : normalized.tiles.maxZoom,
                    extension:
                        typeof style.extension === 'string' &&
                        style.extension.trim()
                            ? style.extension.replace(/^\./, '')
                            : normalized.tiles.extension
                };
            }
        );

        if (!Object.keys(tileStyles).length) {
            tileStyles.grayscale = {
                path: normalized.tiles.path,
                tileSize: normalized.tiles.tileSize,
                minZoom: normalized.tiles.minZoom,
                maxZoom: normalized.tiles.maxZoom,
                extension: normalized.tiles.extension
            };
        }

        const requestedDefaultStyle =
            String(
                map.tiles.defaultStyle ||
                ''
            ).trim();

        normalized.tiles.styles =
            tileStyles;

        normalized.tiles.defaultStyle =
            tileStyles[requestedDefaultStyle]
                ? requestedDefaultStyle
                : Object.keys(tileStyles)[0];

    } else {

        normalized.tiles =
            null;
    }

    normalized.markers =
        Array.isArray(map.markers)
            ? map.markers
            : [];

    normalized.zones =
        Array.isArray(map.zones)
            ? map.zones
            : [];

    normalized.polygons =
        Array.isArray(map.polygons)
            ? map.polygons
            : [];

    return normalized;
}


/* =========================
   LOAD MAPS
   ========================= */

async function loadMaps() {

    const index =
        await fetchJSON(
            'maps/index.json'
        );

    const files =
        Array.isArray(index)
            ? index
            : Array.isArray(index.maps)
                ? index.maps
                : [];

    if (!files.length) {

        throw new Error(
            'No maps found in maps/index.json'
        );
    }

    const settled =
        await Promise.allSettled(
            files.map(
                async item => {

                    const file =
                        typeof item === 'string'
                            ? item
                            : item.file;

                    if (!file) {
                        return null;
                    }

                    const map =
                        await fetchJSON(
                            `maps/${file}`
                        );

                    if (!map.id) {

                        throw new Error(
                            `Map ${file} has no id`
                        );
                    }

                    if (!map.name) {

                        throw new Error(
                            `Map ${file} has no name`
                        );
                    }

                    return normalizeMap(
                        map
                    );
                }
            )
        );

    const loaded =
        settled
            .filter(
                result =>
                    result.status ===
                        'fulfilled' &&
                    result.value
            )
            .map(
                result =>
                    result.value
            );

    settled
        .filter(
            result =>
                result.status ===
                'rejected'
        )
        .forEach(
            result => {
                console.warn(
                    'A map definition could not be loaded; continuing with the remaining maps.',
                    result.reason
                );
            }
        );

    if (!loaded.length) {
        throw new Error(
            'No map definitions could be loaded'
        );
    }

    MAPS = {};

    loaded
        .forEach(
            map => {

                MAPS[map.id] =
                    map;
            }
        );

    populateMapSelect();
}


/* =========================
   MAP STYLE SELECT
   ========================= */

const MAP_STYLE_COPY = {
    en: { label: 'Map style', grayscale: 'Black & white', color: 'Color' },
    ru: { label: 'Стиль карты', grayscale: 'Чёрно-белая', color: 'Цветная' },
    uk: { label: 'Стиль карти', grayscale: 'Чорно-біла', color: 'Кольорова' },
    de: { label: 'Kartenstil', grayscale: 'Schwarzweiß', color: 'Farbig' },
    fr: { label: 'Style de carte', grayscale: 'Noir et blanc', color: 'Couleur' },
    es: { label: 'Estilo del mapa', grayscale: 'Blanco y negro', color: 'Color' },
    pl: { label: 'Styl mapy', grayscale: 'Czarno-biała', color: 'Kolorowa' },
    pt: { label: 'Estilo do mapa', grayscale: 'Preto e branco', color: 'A cores' },
    'zh-cn': { label: '地图样式', grayscale: '黑白', color: '彩色' },
    ko: { label: '지도 스타일', grayscale: '흑백', color: '컬러' },
    ja: { label: 'マップスタイル', grayscale: '白黒', color: 'カラー' },
    cs: { label: 'Styl mapy', grayscale: 'Černobílá', color: 'Barevná' },
    cat: { label: 'MEOWP STYLE', grayscale: 'BLACK & WHITE PAWS', color: 'COLORFUL PAWS' }
};

function getMapStyleCopy(key) {
    const copy =
        MAP_STYLE_COPY[LANG] ||
        MAP_STYLE_COPY.en;

    return (
        copy[key] ||
        MAP_STYLE_COPY.en[key] ||
        key
    );
}

function getAvailableMapTileStyleIds(map) {
    return Object.keys(
        map?.tiles?.styles || {}
    );
}

function getMapStyleLabel(styleId) {
    return getMapStyleCopy(
        styleId
    );
}

function ensureMapStyleControl() {
    let control =
        $('mapStyleControl');

    if (control) {
        return control;
    }

    const mapSelect =
        $('mapSelect');

    if (!mapSelect) {
        return null;
    }

    control =
        document.createElement('div');

    control.id =
        'mapStyleControl';

    control.className =
        'map-style-control';

    const label =
        document.createElement('label');

    label.htmlFor =
        'mapStyleSelect';

    const select =
        document.createElement('select');

    select.id =
        'mapStyleSelect';

    control.append(
        label,
        select
    );

    mapSelect.insertAdjacentElement(
        'afterend',
        control
    );

    return control;
}

function syncMapStyleSelect() {
    const control =
        ensureMapStyleControl();

    const select =
        $('mapStyleSelect');

    if (
        !control ||
        !select
    ) {
        return;
    }

    const map =
        S.map !== 'custom'
            ? MAPS[S.map]
            : null;

    const styles =
        getAvailableMapTileStyleIds(
            map
        );

    if (!styles.length) {
        control.hidden = true;
        return;
    }

    control.hidden = false;

    const label =
        control.querySelector('label');

    if (label) {
        label.textContent =
            getMapStyleCopy('label');
    }

    const fallback =
        map.tiles.defaultStyle &&
        styles.includes(
            map.tiles.defaultStyle
        )
            ? map.tiles.defaultStyle
            : styles[0];

    if (
        !styles.includes(
            S.mapStyle
        )
    ) {
        S.mapStyle =
            fallback;
    }

    select.innerHTML = '';

    styles.forEach(
        styleId => {
            const option =
                document.createElement(
                    'option'
                );

            option.value =
                styleId;

            option.textContent =
                getMapStyleLabel(
                    styleId
                );

            select.appendChild(
                option
            );
        }
    );

    select.value =
        S.mapStyle;

    select.disabled =
        styles.length < 2;
}

/* =========================
   DIRECT MAP ENTRY
   ========================= */

function applyMapQuerySelection() {
    const url =
        new URL(
            window.location.href
        );

    const requested =
        url.searchParams
            .get('map')
            ?.trim()
            .toLowerCase();

    if (
        !requested ||
        !Object.hasOwn(
            MAPS,
            requested
        )
    ) {
        return false;
    }

    const map =
        MAPS[requested];

    S.map = map.id;
    S.w = map.w;
    S.h = map.h;

    const select =
        $('mapSelect');

    if (select) {
        select.value = map.id;
    }

    /* Consume the validated deep link once; normal startup persists it. */
    url.searchParams.delete('map');

    const cleanUrl =
        `${url.pathname}${url.search}${url.hash}`;

    window.history.replaceState(
        window.history.state,
        '',
        cleanUrl
    );

    return true;
}


/* =========================
   MAP SELECT
   ========================= */

function populateMapSelect() {

    const select =
        $('mapSelect');

    select.innerHTML = '';

    /*
     * Preset maps first.
     */
    Object.values(MAPS)
        .forEach(
            map => {

                const option =
                    document.createElement(
                        'option'
                    );

                option.value =
                    map.id;

                option.textContent =
                    map.name;

                select.appendChild(
                    option
                );
            }
        );

    /*
     * Custom map always last.
     */
    const custom =
        document.createElement(
            'option'
        );

    custom.value =
        'custom';

    custom.textContent =
        tr('customMap');

    select.appendChild(
        custom
    );

    /*
     * If configured default map doesn't
     * exist for some reason, fall back
     * to the first available map.
     */
    if (
        S.map !== 'custom' &&
        !MAPS[S.map]
    ) {

        const firstMap =
            Object.values(
                MAPS
            )[0];

        S.map =
            firstMap
                ? firstMap.id
                : 'custom';
    }

    select.value =
        S.map;

    syncMapStyleSelect();
}
