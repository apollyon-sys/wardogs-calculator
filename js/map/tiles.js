/* =========================
   TILE MAP
   ========================= */

function getTileConfig(map) {

    if (
        !map ||
        !map.tiles ||
        !isValidTileConfig(map.tiles) ||
        !isValidBounds(map.bounds)
    ) {
        return null;
    }

    return map.tiles;
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

    return Math.max(
        tiles.minZoom,
        Math.min(
            tiles.maxZoom,
            Math.round(raw)
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
    y
) {

    const tiles =
        getTileConfig(map);

    if (!tiles) {
        return null;
    }

    return resourceURL(
        `${tiles.path}/zoom_${zoom}/${x}_${y}.${tiles.extension}`
    );
}

function decodeTileElement(url) {

    return new Promise(
        (
            resolve,
            reject
        ) => {

            const image =
                new Image();

            image.decoding =
                'async';

            image.onload =
                () => {

                    if (
                        typeof image.decode !== 'function'
                    ) {

                        resolve(image);

                        return;
                    }

                    image
                        .decode()
                        .then(
                            () => resolve(image),
                            () => resolve(image)
                        );
                };

            image.onerror =
                () => reject(
                    new Error(url)
                );

            image.src =
                url;
        }
    );
}

function tileIsSameOrigin(url) {

    try {

        return new URL(
            url,
            location.href
        ).origin === location.origin;

    } catch (error) {

        return false;
    }
}


async function decodeTile(url) {

    if (
        typeof createImageBitmap !== 'function' ||
        typeof fetch !== 'function' ||
        !tileIsSameOrigin(url)
    ) {
        return decodeTileElement(url);
    }

    let response =
        null;

    try {

        response =
            await fetch(url);

    } catch (error) {

        return decodeTileElement(url);
    }

    if (!response.ok) {
        throw new Error(
            `${url}: ${response.status}`
        );
    }

    try {

        return await createImageBitmap(
            await response.blob()
        );

    } catch (error) {

        return decodeTileElement(url);
    }
}

function loadTile(
    map,
    zoom,
    x,
    y
) {

    const key =
        tileKey(
            map.id,
            zoom,
            x,
            y
        );

    const cached =
        getCachedTile(key);

    if (cached) {
        return cached;
    }

    const url =
        getTileURL(
            map,
            zoom,
            x,
            y
        );

    const tile = {
        image: null,
        loaded: false,
        failed: false
    };

    setCachedTile(
        key,
        tile
    );

    decodeTile(url)
        .then(
            image => {

                if (
                    TILE_CACHE.get(key) !== tile
                ) {

                    closeTileImage(image);

                    return;
                }

                tile.image =
                    image;

                tile.loaded =
                    true;

                draw();
            },
            () => {

                tile.failed =
                    true;

                console.warn(
                    `Failed to load tile: ${url}`
                );

                draw();
            }
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
            getCachedTile(
                tileKey(
                    map.id,
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
            ) - 1
        );

    const maxTileX =
        Math.min(
            tileCount - 1,
            Math.floor(
                (
                    worldRight -
                    tileBounds.minX
                ) /
                tileWorldWidth
            ) + 1
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
            ) - 1
        );

    const maxTileY =
        Math.min(
            tileCount - 1,
            Math.floor(
                (
                    tileBounds.maxY -
                    worldBottom
                ) /
                tileWorldHeight
            ) + 1
        );

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

            const tile =
                loadTile(
                    map,
                    zoom,
                    tileX,
                    tileY
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
