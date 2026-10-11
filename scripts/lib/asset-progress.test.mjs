import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const source = await readFile(new URL('../../js/ui/asset-progress.js', import.meta.url), 'utf8');
const tilesSource = await readFile(new URL('../../js/map/tiles.js', import.meta.url), 'utf8');
const flush = () => new Promise(resolve => setImmediate(resolve));

class Element {
    constructor(tag) {
        this.tag = tag;
        this.children = [];
        this.attributes = new Map();
        this.properties = new Map();
        this.classes = new Set();
        this.style = { setProperty: (key, value) => this.properties.set(key, value) };
        this.classList = { toggle: (key, enabled) => enabled ? this.classes.add(key) : this.classes.delete(key) };
    }
    append(...children) { this.children.push(...children); }
    setAttribute(key, value) { this.attributes.set(key, value); }
    removeAttribute(key) { this.attributes.delete(key); }
}

function runtime() {
    let now = 1000;
    let id = 0;
    let requests = 0;
    const timers = new Map();
    const map = new Element('div');
    class Clock extends Date { static now() { return now; } }
    const context = vm.createContext({
        Date: Clock, URL, console,
        S: { map: 'bakurani', mapStyle: 'grayscale' },
        ASSET_ACCESS_STATE: { pending: null, lastError: null },
        document: {
            baseURI: 'https://wardogs-artillery.com/',
            documentElement: { dataset: { appInitState: 'ready' } },
            querySelector: selector => selector === '.map' ? map : null,
            createElement: tag => new Element(tag)
        },
        fetch() { requests++; throw new Error('The progress UI must not fetch'); },
        resourceURL: path => `https://wardogs-artillery.com/${path}`,
        getVisibleTileLoadingProgress: () => context.visibleTiles,
        visibleTiles: { total: 0, loaded: 0, failed: 0 },
        setTimeout(callback, delay) { const key = ++id; timers.set(key, { callback, at: now + delay }); return key; },
        clearTimeout(key) { timers.delete(key); }
    });
    context.window = context;
    vm.runInContext(source, context);
    return {
        context, map,
        snapshot: () => context.getAssetLoadingProgress(),
        panel: () => map.children[0],
        requests: () => requests,
        async advance(milliseconds) {
            const until = now + milliseconds;
            for (;;) {
                const next = [...timers].filter(([, timer]) => timer.at <= until)
                    .sort((a, b) => a[1].at - b[1].at)[0];
                if (!next) break;
                const [key, timer] = next;
                now = timer.at;
                timers.delete(key);
                timer.callback();
                await flush();
            }
            now = until;
            await flush();
        }
    };
}

test('asset progress waits for the complete operation, shows completion, then hides', async () => {
    const r = runtime();
    let resolve;
    const body = new Promise(done => { resolve = done; });
    const pending = r.context.trackAssetLoadingProgress('chunk', () => body, { kind: 'terrain' });
    await r.advance(100);
    assert.equal(r.snapshot().loaded, 0);
    assert.equal(r.snapshot().busy, true);
    assert.equal(r.panel().hidden, false);
    assert.equal(r.panel().children[1].attributes.get('aria-valuenow'), '0');
    resolve('decoded asset');
    assert.equal(await pending, 'decoded asset');
    await r.advance(100);
    assert.equal(r.panel().children[1].attributes.get('aria-valuenow'), '100');
    await r.advance(900);
    assert.equal(r.panel().hidden, true);
    assert.equal(r.snapshot().total, 0);
    assert.equal(r.requests(), 0);
});

test('failed assets never contribute to completed progress or report 100 percent', async () => {
    const r = runtime();
    const ready = r.context.beginAssetLoadingProgress('ready');
    const failed = r.context.beginAssetLoadingProgress('failed');
    await r.advance(100);
    ready(); failed(false);
    await r.advance(100);
    assert.equal(r.snapshot().percent, 50);
    assert.equal(r.snapshot().failed, 1);
    assert.equal(r.panel().children[1].attributes.get('aria-valuenow'), '50');
    assert.ok(r.panel().classes.has('is-partial'));
    await r.advance(3500);
    assert.equal(r.panel().hidden, true);
});

test('map changes exclude another map and late completions cannot finish a newer load', async () => {
    const r = runtime();
    const oldFinish = r.context.beginAssetLoadingProgress('shared-key', { mapId: 'zestafona' });
    const newFinish = r.context.beginAssetLoadingProgress('shared-key', { mapId: 'zestafona' });
    assert.equal(r.snapshot().total, 0);
    assert.equal(r.snapshot().busy, false);
    r.context.S.map = 'zestafona';
    assert.equal(r.snapshot().waiting, 1);
    oldFinish();
    assert.equal(r.snapshot().waiting, 1);
    newFinish();
    assert.equal(r.snapshot().loaded, 1);
});

test('admission waits are indeterminate and existing errors retain the retry notice', async () => {
    const r = runtime();
    r.context.ASSET_ACCESS_STATE.pending = Promise.resolve(true);
    r.context.queueAssetLoadingProgressUpdate();
    await r.advance(100);
    const bar = r.panel().children[1];
    assert.equal(bar.attributes.has('aria-valuenow'), false);
    assert.ok(r.panel().classes.has('is-indeterminate'));
    r.context.ASSET_ACCESS_STATE.lastError = new Error('rate-limited');
    r.context.queueAssetLoadingProgressUpdate();
    await r.advance(100);
    assert.equal(r.panel().hidden, true);
    assert.equal(r.requests(), 0);
});

test('new work cancels completion hiding and rejects preserve the original error', async () => {
    const r = runtime();
    const first = r.context.beginAssetLoadingProgress('first');
    await r.advance(100);
    first();
    await r.advance(100);
    const second = r.context.beginAssetLoadingProgress('second');
    await r.advance(1000);
    assert.equal(r.panel().hidden, false);
    second();
    const error = new Error('decode failed');
    await assert.rejects(r.context.trackAssetLoadingProgress('invalid', async () => { throw error; }),
        actual => actual === error);
    assert.equal(r.snapshot().failed, 1);
});

test('tile progress counts current viewport and style only, keeping deferred loads pending', () => {
    const r = runtime();
    const map = { id: 'bakurani', tiles: { defaultStyle: 'grayscale' } };
    r.context.TILE_CACHE = new Map();
    r.context.getCurrentMap = () => map;
    r.context.layersVisible = true;
    r.context.isMapLayerVisible = () => r.context.layersVisible;
    vm.runInContext(tilesSource, r.context);
    vm.runInContext('TILE_QUEUE_EPOCH = 2', r.context);
    const tile = overrides => ({
        loaded: false, failed: false, lastSeenEpoch: 2,
        request: { map, styleId: 'grayscale' }, ...overrides
    });
    for (const [key, value] of [
        ['ready', tile({ loaded: true })],
        ['pending', tile({})],
        ['deferred', tile({ failed: true, deferred: true })],
        ['failed', tile({ failed: true })],
        ['old-view', tile({ lastSeenEpoch: 1 })],
        ['old-map', tile({ request: { map: { id: 'zestafona' }, styleId: 'grayscale' } })],
        ['old-style', tile({ request: { map, styleId: 'color' } })]
    ]) r.context.TILE_CACHE.set(key, value);
    assert.deepEqual(JSON.parse(JSON.stringify(r.context.getVisibleTileLoadingProgress())),
        { total: 4, loaded: 1, failed: 1 });
    r.context.layersVisible = false;
    assert.equal(r.context.getVisibleTileLoadingProgress().total, 0);
});
