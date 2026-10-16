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

    class TestImage {
        constructor() {
            imageRequests++;
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
        view: () => ({ scale }),
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
        isTileRequestRelevant,
        enqueue(tile) { TILE_LOAD_QUEUE.push(tile); },
        pump: pumpTileLoadQueue,
        queueLength() { return TILE_LOAD_QUEUE.length; },
        setEpoch(value) { TILE_QUEUE_EPOCH = value; }
    };`).runInContext(context);

    return {
        api: context.__tiles,
        imageRequests: () => imageRequests,
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

test('both Bakurani styles and the admission probe select the same published revision without query strings', async () => {
    const current = JSON.parse(await readFile(resolve(root, 'maps/bakurani.json'), 'utf8'));
    const config = JSON.parse(await readFile(resolve(root, 'config/app.json'), 'utf8'));
    const runtime = tileRuntime();
    const revision = new URL(current.tiles.path).pathname.match(/\/revisions\/([a-z0-9][a-z0-9-]{0,47})$/)?.[1];
    assert.ok(revision, 'the published Bakurani pyramid must have a revision');
    for (const style of ['grayscale', 'color']) {
        for (const [zoom, x, y] of [[0, 0, 0], [6, 27, 31]]) {
            const url = new URL(runtime.api.getTileURL(current, zoom, x, y, style));
            assert.equal(url.search, '');
            assert.equal(url.hash, '');
            assert.ok(url.pathname.endsWith(`/bakurani/revisions/${revision}/zoom_${zoom}/${x}_${y}.webp`));
        }
    }
    assert.equal(config.assetGateway.probePath,
        new URL(runtime.api.getTileURL(current, 0, 0, 0, 'grayscale')).pathname);
});
