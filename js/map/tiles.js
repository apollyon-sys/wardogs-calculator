/* =========================
   TILE MAP
   ========================= */

function getMapTileStyleId(map) {
    const styles =
        map?.tiles?.styles || {};

    const selected =
        String(
            S.mapStyle ||
            ''
        );

    if (styles[selected]) {
        return selected;
    }

    const configuredDefault =
        String(
            map?.tiles?.defaultStyle ||
            ''
        );

    if (styles[configuredDefault]) {
        return configuredDefault;
    }

    return (
        Object.keys(styles)[0] ||
        'grayscale'
    );
}

function getTileConfig(
    map,
    styleId = getMapTileStyleId(map)
) {

    if (
        !map ||
        !map.tiles ||
        !isValidBounds(map.bounds)
    ) {
        return null;
    }

    const style =
        map.tiles.styles?.[styleId];

    const tiles =
        style
            ? {
                ...map.tiles,
                ...style
            }
            : map.tiles;

    if (!isValidTileConfig(tiles)) {
        return null;
    }

    return tiles;
}


/* =========================
   TILE WORLD BOUNDS
   ========================= */

/*
 * map.bounds
 *     Actual playable/searchable map bounds.
 *
 * map.tileBounds
 *     World-coordinate extent covered by the complete
 *     tile pyramid.
 *
 * Most maps can omit tileBounds. In that case tiles
 * continue to use map.bounds exactly as before.
 */
function getTileBounds(map) {

    if (
        map &&
        isValidBounds(
            map.tileBounds
        )
    ) {
        return map.tileBounds;
    }

    return map?.bounds || null;
}


/* =========================
   TILE ZOOM
   ========================= */

function getTileZoom(map) {

    const tiles =
        getTileConfig(map);

    const tileBounds =
        getTileBounds(map);

    if (
        !tiles ||
        !tileBounds
    ) {
        return null;
    }

    /*
     * zoom_0 contains one tile covering the complete
     * tileBounds extent. Therefore tile resolution has
     * to be calculated from tileBounds, not map.bounds.
     */
    const tileWorldWidth =
        tileBounds.maxX -
        tileBounds.minX;

    if (
        !Number.isFinite(
            tileWorldWidth
        ) ||
        tileWorldWidth <= 0
    ) {
        return null;
    }

    const basePixelsPerWorldUnit =
        tiles.tileSize /
        tileWorldWidth;

    const desiredPixelsPerWorldUnit =
        view().scale;

    const raw =
        Math.log2(
            desiredPixelsPerWorldUnit /
            basePixelsPerWorldUnit
        );

    /*
     * Prefer the coarser of the two suitable pyramid levels. Rounding up
     * quadruples the number of 256 px tiles before the extra detail is
     * actually visible, which is especially expensive now that every tile
     * passes through the authenticated asset gateway.
     */
    return Math.max(
        tiles.minZoom,
        Math.min(
            tiles.maxZoom,
            Math.floor(raw)
        )
    );
}


/* =========================
   CACHE / URL
   ========================= */

function tileKey(
    mapId,
    zoom,
    x,
    y
) {

    return `${mapId}:${zoom}:${x}:${y}`;
}

function getTileURL(
    map,
    zoom,
    x,
    y,
    styleId = getMapTileStyleId(map)
) {

    const tiles =
        getTileConfig(
            map,
            styleId
        );

    if (!tiles) {
        return null;
    }

    return resourceURL(
        `${tiles.path}/zoom_${zoom}/${x}_${y}.${tiles.extension}`
    );
}

const TILE_REQUEST_CONCURRENCY = 4;
const TILE_REQUEST_ATTEMPTS = 2;
const TILE_RETRY_DELAY_MS = 450;
const TILE_VIEWPORT_MARGIN = 0;

const TILE_LOAD_QUEUE = [];

let TILE_ACTIVE_REQUESTS = 0;
let TILE_QUEUE_EPOCH = 0;

function sortTileLoadQueue() {
    TILE_LOAD_QUEUE.sort(
        (a, b) =>
            a.priority -
            b.priority
    );
}

function releaseTileRequestSlot(tile) {
    tile.loading = false;

    TILE_ACTIVE_REQUESTS =
        Math.max(
            0,
            TILE_ACTIVE_REQUESTS - 1
        );

    pumpTileLoadQueue();
}

function finishTileRequest(
    tile,
    failed
) {
    releaseTileRequestSlot(
        tile
    );

    tile.loaded = !failed;
    tile.failed = failed;
    tile.retryPending = false;

    draw();
}

function scheduleTileRetry(tile) {
    releaseTileRequestSlot(
        tile
    );

    tile.retryPending = true;
    tile.image = null;

    /*
     * Redraw immediately so a cached lower-resolution ancestor remains
     * visible while the retry waits. The redraw also refreshes
     * lastSeenEpoch for tiles that are still in the current viewport.
     */
    draw();

    window.setTimeout(
        () => {
            tile.retryPending = false;

            if (
                tile.loaded ||
                tile.failed
            ) {
                return;
            }

            const stillNeeded =
                tile.lastSeenEpoch >=
                    TILE_QUEUE_EPOCH - 1;

            if (stillNeeded) {
                queueTileLoad(
                    tile
                );
            }
        },
        TILE_RETRY_DELAY_MS
    );
}

function startTileRequest(tile) {
    const {
        map,
        styleId,
        zoom,
        x,
        y
    } = tile.request;

    const image =
        new Image();

    const tileUrl =
        getTileURL(
            map,
            zoom,
            x,
            y,
            styleId
        );

    // Keep the canvas readable when tiles come from the asset CDN.
    image.crossOrigin =
        isProtectedAssetURL(tileUrl)
            ? 'use-credentials'
            : 'anonymous';

    image.decoding =
        'async';

    if (
        'fetchPriority' in image
    ) {
        image.fetchPriority =
            tile.priority < 0
                ? 'high'
                : 'auto';
    }

    tile.image = image;
    tile.loading = true;
    tile.queued = false;
    tile.retryPending = false;
    tile.attempts =
        (tile.attempts || 0) + 1;

    TILE_ACTIVE_REQUESTS++;

    image.onload =
        () => {
            finishTileRequest(
                tile,
                false
            );
        };

    image.onerror =
        async () => {
            if (
                tile.attempts <
                    TILE_REQUEST_ATTEMPTS
            ) {
                if (
                    isProtectedAssetURL(tileUrl)
                ) {
                    await recoverAssetAccessAfterFailure();
                }

                scheduleTileRetry(
                    tile
                );
                return;
            }

            console.warn(
                `Failed to load tile after retry: ${getTileURL(
                    map,
                    zoom,
                    x,
                    y,
                    styleId
                )}`
            );

            if (
                typeof trackOperationalFailure ===
                    'function'
            ) {
                trackOperationalFailure(
                    'asset-load-failed',
                    {
                        area: 'map',
                        type: 'tile',
                        map: map.id,
                        resource: `tile-${styleId}`,
                        code: 'image-load-after-retry'
                    }
                );
            }

            finishTileRequest(
                tile,
                true
            );
        };

    image.src = tileUrl;
}

function pumpTileLoadQueue() {
    while (
        TILE_ACTIVE_REQUESTS <
            TILE_REQUEST_CONCURRENCY &&
        TILE_LOAD_QUEUE.length
    ) {
        const tile =
            TILE_LOAD_QUEUE.shift();

        if (
            !tile ||
            tile.loaded ||
            tile.failed ||
            tile.loading ||
            tile.retryPending
        ) {
            continue;
        }

        /*
         * A fast pan, zoom, map switch or style switch can leave hundreds of
         * no-longer-visible tiles in the priority queue. They used to drain
         * after the interaction ended, creating real network requests for
         * imagery the user would never see. Drop them before assigning a
         * request slot; loadTile() will enqueue the tile again if a later
         * viewport needs it.
         */
        const currentMap =
            typeof getCurrentMap === 'function'
                ? getCurrentMap()
                : null;

        const layerVisible =
            typeof isMapLayerVisible !== 'function' ||
            isMapLayerVisible('tiles');

        const stillRelevant =
            currentMap?.id ===
                tile.request.map.id &&
            getMapTileStyleId(currentMap) ===
                tile.request.styleId &&
            layerVisible &&
            tile.lastSeenEpoch ===
                TILE_QUEUE_EPOCH;

        if (!stillRelevant) {
            tile.queued = false;
            continue;
        }

        startTileRequest(
            tile
        );
    }
}

function queueTileLoad(tile) {
    if (
        tile.loaded ||
        tile.failed ||
        tile.loading ||
        tile.queued ||
        tile.retryPending
    ) {
        return;
    }

    tile.queued = true;

    TILE_LOAD_QUEUE.push(
        tile
    );

    sortTileLoadQueue();
    pumpTileLoadQueue();
}

function loadTile(
    map,
    zoom,
    x,
    y,
    priority = 0
) {

    const styleId =
        getMapTileStyleId(
            map
        );

    const key =
        tileKey(
            `${map.id}:${styleId}`,
            zoom,
            x,
            y
        );

    if (
        TILE_CACHE.has(key)
    ) {
        const cached =
            TILE_CACHE.get(key);

        cached.lastSeenEpoch =
            TILE_QUEUE_EPOCH;

        if (
            !cached.loaded &&
            !cached.failed &&
            Number.isFinite(priority) &&
            priority <
                cached.priority
        ) {
            cached.priority =
                priority;

            sortTileLoadQueue();
        }

        if (
            !cached.loaded &&
            !cached.failed &&
            !cached.loading &&
            !cached.queued &&
            !cached.retryPending
        ) {
            queueTileLoad(
                cached
            );
        }

        return cached;
    }

    const tile = {
        image: null,
        loaded: false,
        failed: false,
        loading: false,
        queued: false,
        retryPending: false,
        attempts: 0,
        lastSeenEpoch:
            TILE_QUEUE_EPOCH,
        priority:
            Number.isFinite(priority)
                ? priority
                : 0,
        request: {
            map,
            styleId,
            zoom,
            x,
            y
        }
    };

    TILE_CACHE.set(
        key,
        tile
    );

    queueTileLoad(
        tile
    );

    return tile;
}


function findCachedTileAncestor(
    map,
    tiles,
    zoom,
    x,
    y
) {

    const styleId =
        getMapTileStyleId(
            map
        );

    for (
        let levels = 1;
        zoom - levels >= tiles.minZoom;
        levels++
    ) {

        const scale =
            Math.pow(
                2,
                levels
            );

        const sourceSize =
            tiles.tileSize /
            scale;

        if (
            sourceSize < 1
        ) {
            return null;
        }

        const ancestor =
            TILE_CACHE.get(
                tileKey(
                    `${map.id}:${styleId}`,
                    zoom - levels,
                    Math.floor(
                        x / scale
                    ),
                    Math.floor(
                        y / scale
                    )
                )
            );

        if (
            !ancestor ||
            !ancestor.loaded ||
            ancestor.failed
        ) {
            continue;
        }

        return {
            image: ancestor.image,
            sourceX:
                (
                    x % scale
                ) *
                sourceSize,
            sourceY:
                (
                    y % scale
                ) *
                sourceSize,
            sourceSize
        };
    }

    return null;
}


/* =========================
   DRAW TILE MAP
   ========================= */

function drawTileMap(map) {

    const tiles =
        getTileConfig(map);

    const tileBounds =
        getTileBounds(map);

    if (
        !tiles ||
        !tileBounds
    ) {
        return;
    }

    const v =
        view();

    /*
     * View / coordinate grid are clipped to map.bounds.
     * Tile placement itself uses tileBounds.
     */
    const mapBounds =
        map.bounds;

    const zoom =
        getTileZoom(map);

    if (
        zoom === null
    ) {
        return;
    }

    /*
     * Newer renders outrank stale queued requests from an older viewport.
     * This keeps panning responsive even on high-latency connections.
     */
    const queueEpoch =
        ++TILE_QUEUE_EPOCH;

    const tileCount =
        Math.pow(
            2,
            zoom
        );

    const tileWorldWidth =
        (
            tileBounds.maxX -
            tileBounds.minX
        ) /
        tileCount;

    const tileWorldHeight =
        (
            tileBounds.maxY -
            tileBounds.minY
        ) /
        tileCount;

    const tileScreenWidth =
        tileWorldWidth *
        v.scale;

    const tileScreenHeight =
        tileWorldHeight *
        v.scale;

    const topLeft =
        toWorld(
            0,
            0
        );

    const bottomRight =
        toWorld(
            wrap.clientWidth,
            wrap.clientHeight
        );

    const visibleLeft =
        Math.min(
            topLeft.x,
            bottomRight.x
        );

    const visibleRight =
        Math.max(
            topLeft.x,
            bottomRight.x
        );

    const visibleBottom =
        Math.min(
            topLeft.y,
            bottomRight.y
        );

    const visibleTop =
        Math.max(
            topLeft.y,
            bottomRight.y
        );

    /*
     * Only draw the intersection of:
     *   - current viewport,
     *   - actual map bounds,
     *   - available tile imagery.
     */
    const worldLeft =
        Math.max(
            mapBounds.minX,
            tileBounds.minX,
            visibleLeft
        );

    const worldRight =
        Math.min(
            mapBounds.maxX,
            tileBounds.maxX,
            visibleRight
        );

    const worldBottom =
        Math.max(
            mapBounds.minY,
            tileBounds.minY,
            visibleBottom
        );

    const worldTop =
        Math.min(
            mapBounds.maxY,
            tileBounds.maxY,
            visibleTop
        );

    if (
        worldLeft >= worldRight ||
        worldBottom >= worldTop
    ) {
        return;
    }

    const minTileX =
        Math.max(
            0,
            Math.floor(
                (
                    worldLeft -
                    tileBounds.minX
                ) /
                tileWorldWidth
            ) - TILE_VIEWPORT_MARGIN
        );

    const maxTileX =
        Math.min(
            tileCount - 1,
            Math.ceil(
                (
                    worldRight -
                    tileBounds.minX
                ) /
                tileWorldWidth
            ) - 1 + TILE_VIEWPORT_MARGIN
        );

    const minTileY =
        Math.max(
            0,
            Math.floor(
                (
                    tileBounds.maxY -
                    worldTop
                ) /
                tileWorldHeight
            ) - TILE_VIEWPORT_MARGIN
        );

    const maxTileY =
        Math.min(
            tileCount - 1,
            Math.ceil(
                (
                    tileBounds.maxY -
                    worldBottom
                ) /
                tileWorldHeight
            ) - 1 + TILE_VIEWPORT_MARGIN
        );

    const centerTileX =
        (
            minTileX +
            maxTileX
        ) / 2;

    const centerTileY =
        (
            minTileY +
            maxTileY
        ) / 2;

    /*
     * Request one cheap low-resolution ancestor first. Once it arrives,
     * findCachedTileAncestor() can immediately paint a usable map preview
     * while detailed tiles continue loading in the background.
     */
    if (
        zoom >
        tiles.minZoom
    ) {
        const levels =
            zoom -
            tiles.minZoom;

        const scale =
            Math.pow(
                2,
                levels
            );

        loadTile(
            map,
            tiles.minZoom,
            Math.floor(
                centerTileX /
                scale
            ),
            Math.floor(
                centerTileY /
                scale
            ),
            -queueEpoch * 1000000 -
                100000
        );
    }

    ctx.save();

    /*
     * Renderer is already translated by v.left/v.top.
     * This rect therefore represents the actual map
     * coordinate extent, not the entire tile pyramid.
     */
    ctx.beginPath();

    ctx.rect(
        0,
        0,
        v.mw,
        v.mh
    );

    ctx.clip();

    for (
        let tileY = minTileY;
        tileY <= maxTileY;
        tileY++
    ) {

        const tileWorldTop =
            tileBounds.maxY -
            tileY *
            tileWorldHeight;

        for (
            let tileX = minTileX;
            tileX <= maxTileX;
            tileX++
        ) {

            const tileWorldLeft =
                tileBounds.minX +
                tileX *
                tileWorldWidth;

            const screen =
                worldToLocalScreen(
                    tileWorldLeft,
                    tileWorldTop
                );

            const priority =
                -queueEpoch *
                    1000000 +
                Math.pow(
                    tileX -
                    centerTileX,
                    2
                ) +
                Math.pow(
                    tileY -
                    centerTileY,
                    2
                );

            const tile =
                loadTile(
                    map,
                    zoom,
                    tileX,
                    tileY,
                    priority
                );

            if (
                tile.loaded &&
                !tile.failed
            ) {

                ctx.drawImage(
                    tile.image,
                    screen.x,
                    screen.y,
                    tileScreenWidth + 0.5,
                    tileScreenHeight + 0.5
                );

            } else {

                const ancestor =
                    tile.failed
                        ? null
                        : findCachedTileAncestor(
                            map,
                            tiles,
                            zoom,
                            tileX,
                            tileY
                        );

                if (
                    ancestor
                ) {

                    ctx.drawImage(
                        ancestor.image,
                        ancestor.sourceX,
                        ancestor.sourceY,
                        ancestor.sourceSize,
                        ancestor.sourceSize,
                        screen.x,
                        screen.y,
                        tileScreenWidth + 0.5,
                        tileScreenHeight + 0.5
                    );

                } else {

                    ctx.fillStyle =
                        '#151a1d';

                    ctx.fillRect(
                        screen.x,
                        screen.y,
                        tileScreenWidth + 0.5,
                        tileScreenHeight + 0.5
                    );
                }
            }
        }
    }

    ctx.restore();
}
