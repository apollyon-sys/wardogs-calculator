import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(
    dirname(fileURLToPath(import.meta.url)),
    '../..'
);

const tileSource = await readFile(
    resolve(root, 'js/map/tiles.js'),
    'utf8'
);

function tileRuntime() {
    let scale = 1;
    let currentMap = null;
    let imageRequests = 0;
    let viewportLeft = 0;
    let viewportTop = 100;
    const drawnImages = [];

    class TestImage {
        constructor() {
            imageRequests++;
            this.naturalWidth = 256;
            this.naturalHeight = 256;
        }

        set src(value) {
            this.url = value;
            queueMicrotask(() => this.onload?.());
        }
    }

    const context = vm.createContext({
        console,
        Image: TestImage,
        S: {
            mapStyle: 'grayscale'
        },
        getCurrentMap: () => currentMap,
        isMapLayerVisible: () => true,
        isValidBounds: bounds => Boolean(bounds),
        isValidTileConfig: tiles => Boolean(tiles?.path),
        resourceURL: value => value,
        TILE_CACHE: new Map(),
        draw() {},
        view: () => ({ scale, mw: 100 * scale, mh: 100 * scale }),
        wrap: { clientWidth: 100, clientHeight: 100 },
        toWorld: (x, y) => ({
            x: viewportLeft + x / scale,
            y: viewportTop - y / scale
        }),
        worldToLocalScreen: (x, y) => ({
            x: (x - viewportLeft) * scale,
            y: (viewportTop - y) * scale
        }),
        ctx: {
            save() {}, restore() {}, beginPath() {}, rect() {}, clip() {},
            fillRect() {},
            drawImage(...args) { drawnImages.push(args); }
        },
        window: {
            setTimeout: () => 0
        }
    });

    new vm.Script(`${tileSource}\n;globalThis.__tiles = {
        getTileZoom,
        getTileConfig,
        getTileURL,
        getTileSourceKey,
        loadTile,
        findCachedTileAncestor,
        drawTileMap,
        isTileRequestRelevant,
        enqueue(tile) { TILE_LOAD_QUEUE.push(tile); },
        pump: pumpTileLoadQueue,
        queueLength() { return TILE_LOAD_QUEUE.length; },
        setEpoch(value) { TILE_QUEUE_EPOCH = value; }
    };`).runInContext(context);

    return {
        api: context.__tiles,
        imageRequests: () => imageRequests,
        drawnImages,
        setStyle: value => { context.S.mapStyle = value; },
        setViewport: (left, top) => {
            viewportLeft = left;
            viewportTop = top;
        },
        setCurrentMap: value => {
            currentMap = value;
        },
        setScale: value => {
            scale = value;
        }
    };
}

const map = {
    id: 'bakurani',
    bounds: {
        minX: 0,
        maxX: 100,
        minY: 0,
        maxY: 100
    },
    tiles: {
        path: 'https://assets.example.test/tiles',
        tileSize: 256,
        minZoom: 0,
        maxZoom: 7,
        extension: 'webp',
        defaultStyle: 'grayscale',
        styles: {
            grayscale: {
                path: 'https://assets.example.test/tiles'
            }
        }
    }
};

test('tile zoom stays on the coarser level until it is actually required', () => {
    const runtime = tileRuntime();
    const baseScale = 256 / 100;

    runtime.setScale(baseScale * (2 ** 2.75));

    assert.equal(
        runtime.api.getTileZoom(map),
        2
    );
});

test('stale queued tiles are discarded before creating an image request', () => {
    const runtime = tileRuntime();
    const tile = {
        loaded: false,
        failed: false,
        loading: false,
        queued: true,
        retryPending: false,
        lastSeenEpoch: 4,
        request: {
            map,
            styleId: 'grayscale',
            zoom: 2,
            x: 0,
            y: 0
        }
    };

    runtime.setCurrentMap(map);
    runtime.api.setEpoch(5);
    runtime.api.enqueue(tile);
    runtime.api.pump();

    assert.equal(runtime.api.queueLength(), 0);
    assert.equal(tile.queued, false);
    assert.equal(runtime.imageRequests(), 0);
});

function revisedMap(revision) {
    return {
        ...map,
        tiles: {
            ...map.tiles,
            styles: {
                grayscale: { path: `${map.tiles.path}/revisions/${revision}` },
                color: { path: `${map.tiles.path}-color/revisions/${revision}` }
            }
        }
    };
}

const flush = () => new Promise(resolve => setImmediate(resolve));

test('cached previews crop decoded pixels for both styles on all three maps', async () => {
    for (const mapId of ['bakurani', 'ozeti', 'zestafona']) {
        const current = JSON.parse(await readFile(resolve(root, `maps/${mapId}.json`), 'utf8'));
        for (const style of ['grayscale', 'color']) {
            const runtime = tileRuntime();
            runtime.setCurrentMap(current);
            runtime.setStyle(style);
            const config = runtime.api.getTileConfig(current);
            const preview = runtime.api.loadTile(current, config.minZoom, 0, 0);
            await flush();
            assert.equal(preview.loaded, true);

            const crop = runtime.api.findCachedTileAncestor(current, config, config.minZoom + 2, 2, 1);
            assert.deepEqual(
                [crop.sourceX, crop.sourceY, crop.sourceWidth, crop.sourceHeight],
                [128, 64, 64, 64],
                `${mapId}/${style}: a decoded 256 px preview must use its own pixel coordinates`
            );
            assert.equal(crop.image, preview.image);
        }
    }
});

test('a 128 px preview still covers the correct quadrant when nominal tiles are 256 px', async () => {
    const runtime = tileRuntime();
    runtime.setCurrentMap(map);
    const preview = runtime.api.loadTile(map, 0, 0, 0);
    await flush();
    preview.image.naturalWidth = 128;
    preview.image.naturalHeight = 128;

    const crop = runtime.api.findCachedTileAncestor(map, runtime.api.getTileConfig(map), 2, 3, 2);
    assert.deepEqual(
        [crop.sourceX, crop.sourceY, crop.sourceWidth, crop.sourceHeight],
        [96, 64, 32, 32]
    );
});

test('the renderer draws the matching part of a preview while detailed tiles are pending', async () => {
    const runtime = tileRuntime();
    const current = { ...map, tiles: { ...map.tiles, tileSize: 128 } };
    runtime.setCurrentMap(current);
    runtime.setScale(128 / 100 * 4);
    runtime.setViewport(50, 75);
    const preview = runtime.api.loadTile(current, 0, 0, 0);
    await flush();
    preview.image.naturalWidth = 512;
    preview.image.naturalHeight = 256;

    runtime.api.drawTileMap(current);

    assert.equal(runtime.drawnImages.length, 1);
    const [image, ...coordinates] = runtime.drawnImages[0];
    assert.equal(image, preview.image);
    assert.deepEqual(coordinates.slice(0, 4), [256, 64, 128, 64]);
    assert.deepEqual(coordinates.slice(4), [0, 0, 128.5, 128.5]);
    await flush();
});

test('a new pyramid never reuses a previous preview or detailed tile for the same map and style', async () => {
    const runtime = tileRuntime();
    const previous = revisedMap('previous');
    runtime.setCurrentMap(previous);
    const oldPreview = runtime.api.loadTile(previous, 0, 0, 0);
    const oldDetail = runtime.api.loadTile(previous, 3, 2, 2);
    await flush();
    assert.equal(oldPreview.loaded, true);
    assert.equal(oldDetail.loaded, true);

    const current = revisedMap('current');
    runtime.setCurrentMap(current);
    const config = runtime.api.getTileConfig(current);
    assert.equal(runtime.api.isTileRequestRelevant(oldPreview), false);
    assert.equal(runtime.api.findCachedTileAncestor(current, config, 3, 2, 2), null);

    const newDetail = runtime.api.loadTile(current, 3, 2, 2);
    const newPreview = runtime.api.loadTile(current, 0, 0, 0);
    await flush();
    assert.notEqual(newDetail, oldDetail);
    assert.notEqual(newPreview, oldPreview);
    assert.match(newDetail.image.url, /\/revisions\/current\/zoom_3\/2_2\.webp$/);
    assert.equal(runtime.api.findCachedTileAncestor(current, config, 3, 2, 2).image, newPreview.image);
    assert.equal(runtime.api.loadTile(current, 3, 2, 2), newDetail);
    assert.equal(runtime.imageRequests(), 4);
});

test('queued requests become irrelevant when the source changes in place', () => {
    const runtime = tileRuntime();
    const current = revisedMap('previous');
    runtime.setCurrentMap(current);
    const tile = runtime.api.loadTile(current, 0, 0, 0);
    current.tiles.styles.grayscale.path = `${map.tiles.path}/revisions/current`;
    assert.equal(runtime.api.isTileRequestRelevant(tile), false);
    assert.equal(runtime.api.findCachedTileAncestor(current, runtime.api.getTileConfig(current), 1, 0, 0), null);
});

test('Bakurani style revisions remain independent and the admission probe follows its default preview', async () => {
    const current = JSON.parse(await readFile(resolve(root, 'maps/bakurani.json'), 'utf8'));
    const config = JSON.parse(await readFile(resolve(root, 'config/app.json'), 'utf8'));
    const runtime = tileRuntime();
    assert.equal(current.tiles.path, current.tiles.styles[current.tiles.defaultStyle].path);
    for (const style of ['grayscale', 'color']) {
        const tiles = runtime.api.getTileConfig(current, style);
        const revision = new URL(tiles.path).pathname.match(/\/revisions\/([a-z0-9][a-z0-9-]{0,47})$/)?.[1];
        assert.ok(revision, `the published ${style} pyramid must have a revision`);
        for (const [zoom, x, y] of [[0, 0, 0], [6, 27, 31]]) {
            const url = new URL(runtime.api.getTileURL(current, zoom, x, y, style));
            assert.equal(url.search, '');
            assert.equal(url.hash, '');
            assert.ok(url.pathname.endsWith(`/bakurani/revisions/${revision}/zoom_${zoom}/${x}_${y}.webp`));
        }
    }
    assert.equal(config.assetGateway.probePath,
        new URL(runtime.api.getTileURL(current, 0, 0, 0, current.tiles.defaultStyle)).pathname);
});
