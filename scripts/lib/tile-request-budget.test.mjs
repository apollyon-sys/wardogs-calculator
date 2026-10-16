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
        view: () => ({ scale }),
        window: {
            setTimeout: () => 0
        }
    });

    new vm.Script(`${tileSource}\n;globalThis.__tiles = {
        getTileZoom,
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
