import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const root = new URL('../../', import.meta.url);
const sources = new Map(await Promise.all([
    'js/core/asset-access.js', 'js/map/tiles.js',
    'js/features/terrain-ballistics.js', 'config/app.json',
    'data/ballistics/terrain-context.json', 'data/terrain/bakurani/manifest.json'
].map(async path => [path, await readFile(new URL(path, root), 'utf8')])));
const gateway = 'https://assets.wardogs-artillery.com';
const direct = 'https://assets-v2.wardogs-artillery.com';
const asset = `${gateway}/releases/assets-v1/maps/test.webp`;
const flush = () => new Promise(resolve => setImmediate(resolve));

class Element {
    constructor(tag) {
        this.tag = tag;
        this.children = [];
        this.attributes = {};
        this.events = {};
        this.dataset = {};
        this.classList = { contains: () => false };
    }
    append(...children) {
        for (const child of children) {
            child.parent = this;
            this.children.push(child);
        }
    }
    appendChild(child) { this.append(child); }
    setAttribute(key, value) { this.attributes[key] = value; }
    addEventListener(name, callback) { this.events[name] = callback; }
    remove() { this.parent?.children.splice(this.parent.children.indexOf(this), 1); }
    find(predicate) {
        for (const child of this.children) {
            if (predicate(child)) return child;
            const match = child.find(predicate);
            if (match) return match;
        }
        return null;
    }
    querySelector(selector) { return this.find(node => node.tag === selector); }
}

function runtime(handler, { restricted = false, challengeGate } = {}) {
    let now = Date.parse('2026-10-03T12:00:00Z');
    let timerId = 0;
    let challenges = 0;
    let challengeCallback;
    const timers = new Map();
    const requests = [];
    const revoked = [];
    const images = [];
    const mapElement = new Element('map');
    const body = new Element('body');
    const head = new Element('head');
    body.append(mapElement);
    const document = {
        baseURI: 'https://wardogs-artillery.com/',
        documentElement: { lang: 'en' }, body, head,
        createElement: tag => new Element(tag),
        getElementById: id => body.find(node => node.id === id),
        querySelector: selector => selector === '.map' ? mapElement
            : selector === 'script[data-wardogs-turnstile]'
                ? head.find(node => node.tag === 'script') : null
    };
    class ClockDate extends Date {
        static now() { return now; }
    }
    class BlobURL extends URL {
        static createObjectURL() { return `blob:test-${images.length}`; }
        static revokeObjectURL(url) { revoked.push(url); }
    }
    class TestImage {
        constructor() { images.push(this); }
        set src(value) {
            this.url = value;
            queueMicrotask(() => this.onload?.());
        }
    }
    const context = vm.createContext({
        Date: ClockDate, URL: BlobURL, Image: TestImage, AbortSignal,
        console: { info() {}, warn() {} }, document,
        location: { hostname: 'wardogs-artillery.com' },
        sessionStorage: { getItem: () => null },
        APP_CONFIG: JSON.parse(sources.get('config/app.json')),
        normalizeConfiguredHttpUrl: value => value,
        resourceURL: value => new URL(value, document.baseURI).href,
        requestAnimationFrame: callback => queueMicrotask(callback),
        setTimeout: (callback, delay = 0) => {
            const id = ++timerId;
            timers.set(id, { callback, at: now + delay });
            return id;
        },
        clearTimeout: id => timers.delete(id),
        fetch: async (url, options = {}) => {
            requests.push({ url, options, time: now });
            if (url === `${gateway}/__session`) {
                if (options.method === 'GET') {
                    return new Response('{}', {
                        status: 401,
                        headers: restricted ? { 'X-Wardogs-Asset-Fallback': 'restricted' } : {}
                    });
                }
                return Response.json({
                    expiresAt: now + 3600000,
                    mode: restricted ? 'restricted' : 'standard'
                }, { status: 201 });
            }
            return handler(url, options);
        },
        turnstile: {
            render(_selector, options) { challengeCallback = options.callback; return 'widget'; },
            reset() {},
            async execute() {
                challenges++;
                if (challengeGate) await challengeGate;
                queueMicrotask(() => challengeCallback('test-token'));
            }
        },
        S: { map: 'bakurani', weapon: 'mortar', mapStyle: 'grayscale' },
        TILE_CACHE: new Map(),
        isValidBounds: bounds => Boolean(bounds),
        isValidTileConfig: tiles => Boolean(tiles?.path),
        isMapLayerVisible: () => true,
        getCurrentMap: () => context.currentMap,
        draw() {}, result() {}
    });
    context.window = context;
    vm.runInContext(sources.get('js/core/asset-access.js'), context);
    return {
        context, requests, images, revoked,
        challenges: () => challenges,
        now: () => now,
        assetRequests: () => requests.filter(request => !request.url.endsWith('/__session')),
        load(path) { vm.runInContext(sources.get(path), context, { filename: path }); },
        async advance(milliseconds) {
            const until = now + milliseconds;
            for (;;) {
                const next = [...timers].filter(([, timer]) => timer.at <= until)
                    .sort((a, b) => a[1].at - b[1].at)[0];
                if (!next) break;
                const [id, timer] = next;
                now = timer.at;
                timers.delete(id);
                timer.callback();
                await flush();
            }
            now = until;
            await flush();
        }
    };
}

function tileMap() {
    return {
        id: 'bakurani', bounds: { minX: 0, maxX: 100, minY: 0, maxY: 100 },
        tiles: { path: `${gateway}/releases/assets-v1/maps/tiles/bakurani`,
            tileSize: 256, minZoom: 0, maxZoom: 7, extension: 'webp' }
    };
}

test('denied authorization sends no asset requests and is shared by all callers', async () => {
    const r = runtime(() => { throw new Error('Assets must not be fetched'); });
    r.context.turnstile.execute = () => { throw new Error('challenge-denied'); };
    const outcomes = await Promise.allSettled(Array.from({ length: 10 }, () =>
        r.context.fetchAssetResource(asset)));
    assert.ok(outcomes.every(outcome => outcome.status === 'rejected'));
    assert.equal(r.assetRequests().length, 0);
    assert.equal(r.requests.length, 1); // One session probe, no POST or tiles.
    assert.equal(await r.context.ensureAssetAccess(), false);
    assert.equal(r.requests.length, 1);
    assert.ok(r.context.getAssetAccessRetryAt() > r.now());
});

test('standard and regional sessions select the correct host with credentials', async () => {
    for (const restricted of [false, true]) {
        const r = runtime(() => new Response('tile'), { restricted });
        assert.equal((await r.context.fetchAssetResource(asset)).status, 200);
        const request = r.assetRequests()[0];
        assert.equal(new URL(request.url).origin, restricted ? gateway : direct);
        assert.equal(request.options.credentials, 'include');
        assert.equal(request.options.referrerPolicy, 'no-referrer');
        assert.equal(r.challenges(), restricted ? 0 : 1);
        assert.equal(new URL(r.context.resolveProtectedAssetURL(
            `${direct}/releases/assets-v1/maps/test.webp`
        )).origin, restricted ? gateway : direct);
    }
});

test('tiles wait for authorization and discard a viewport replaced while waiting', async () => {
    let allowChallenge;
    const gate = new Promise(resolve => { allowChallenge = resolve; });
    const r = runtime(() => new Response('tile'), { challengeGate: gate });
    r.context.currentMap = tileMap();
    r.load('js/map/tiles.js');
    const tile = r.context.loadTile(r.context.currentMap, 0, 0, 0);
    await flush();
    assert.equal(r.assetRequests().length, 0);
    assert.equal(r.images.length, 0);
    r.context.currentMap = { id: 'ozeti' };
    allowChallenge();
    await flush();
    assert.equal(r.assetRequests().length, 0);
    assert.equal(tile.loading, false);
    assert.equal(tile.failed, false);
});

test('protected tiles use fetch and release their blob URLs after decoding', async () => {
    const r = runtime(() => new Response('tile'));
    r.context.currentMap = tileMap();
    r.load('js/map/tiles.js');
    const tile = r.context.loadTile(r.context.currentMap, 0, 0, 0);
    await flush();
    assert.equal(tile.loaded, true);
    assert.equal(r.assetRequests().length, 1);
    assert.equal(new URL(r.assetRequests()[0].url).origin, direct);
    assert.match(r.images[0].url, /^blob:/);
    assert.deepEqual(r.revoked, [r.images[0].url]);
});

test('the protected tile queue keeps at most four requests in flight', async () => {
    let release;
    const gate = new Promise(resolve => { release = resolve; });
    let active = 0;
    let maximum = 0;
    const r = runtime(async () => {
        maximum = Math.max(maximum, ++active);
        await gate;
        active--;
        return new Response('tile');
    });
    r.context.currentMap = tileMap();
    r.load('js/map/tiles.js');
    const tiles = Array.from({ length: 10 }, (_, i) =>
        r.context.loadTile(r.context.currentMap, 3, i % 8, Math.floor(i / 8)));
    await flush();
    assert.equal(r.assetRequests().length, 4);
    release();
    await flush();
    assert.ok(tiles.every(tile => tile.loaded));
    assert.equal(r.assetRequests().length, 10);
    assert.equal(maximum, 4);
    assert.equal(r.challenges(), 1);
});

test('concurrent expired sessions trigger one refresh and one retry per resource', async () => {
    let initial = true;
    const r = runtime(() => new Response('tile', { status: initial ? 401 : 200 }));
    await r.context.ensureAssetAccess();
    const initialChallenges = r.challenges();
    // Switch to successful data responses once the shared refresh completes.
    const execute = r.context.turnstile.execute;
    r.context.turnstile.execute = async () => { initial = false; await execute(); };
    const responses = await Promise.all(Array.from({ length: 4 }, () =>
        r.context.fetchAssetResource(asset)));
    assert.ok(responses.every(response => response.ok));
    assert.equal(r.challenges() - initialChallenges, 1);
    assert.equal(r.assetRequests().length, 8);
});

test('a session refresh does not retry assets if another request has triggered a pause', async () => {
    let releaseRefresh;
    const gate = new Promise(resolve => { releaseRefresh = resolve; });
    const r = runtime(url => new Response('', {
        status: url.endsWith('limited.webp') ? 429 : 401
    }));
    await r.context.ensureAssetAccess();
    const execute = r.context.turnstile.execute;
    r.context.turnstile.execute = async () => { await gate; await execute(); };
    const stale = r.context.fetchAssetResource(asset);
    const limited = r.context.fetchAssetResource(
        `${gateway}/releases/assets-v1/maps/limited.webp`
    );
    const outcomes = Promise.allSettled([stale, limited]);
    await flush();
    assert.equal(r.context.isAssetAccessPaused(), true);
    releaseRefresh();
    assert.ok((await outcomes).every(outcome => outcome.status === 'rejected'));
    assert.equal(r.assetRequests().length, 2);
});

test('429 honors Retry-After and blocks all protected requests until recovery', async () => {
    let blocked = true;
    const r = runtime(() => new Response('tile', {
        status: blocked ? 429 : 200, headers: { 'Retry-After': '25' }
    }));
    let recoveries = 0;
    r.context.onAssetAccessRetry(() => { recoveries++; });
    await assert.rejects(r.context.fetchAssetResource(asset), error =>
        error.status === 429 && error.retryAt === r.now() + 25000);
    const count = r.requests.length;
    for (let i = 0; i < 15; i++) {
        await assert.rejects(r.context.fetchAssetResource(asset));
    }
    assert.equal(r.requests.length, count);
    assert.equal(await r.context.retryAssetAccess(), false);
    await r.advance(24000);
    assert.equal(recoveries, 0);
    blocked = false;
    await r.advance(1000);
    assert.equal(recoveries, 1);
    assert.ok((await r.context.fetchAssetResource(asset)).ok);
    assert.equal(r.challenges(), 1); // Rate limiting never renews a valid session.
    const notice = r.context.document.getElementById('assetAccessNotice');
    assert.equal(notice.hidden, true);
});

test('HTTP-date Retry-After and late successful requests do not shorten a cooldown', async () => {
    let finishLate;
    const late = new Promise(resolve => { finishLate = resolve; });
    const r = runtime(url => url.endsWith('late.webp') ? late : new Response('', {
        status: 429, headers: { 'Retry-After': new Date(r.now() + 30000).toUTCString() }
    }));
    await r.context.ensureAssetAccess();
    const earlier = r.context.fetchAssetResource(`${gateway}/releases/assets-v1/maps/late.webp`);
    await flush();
    await assert.rejects(r.context.fetchAssetResource(asset), error => error.retryAt === r.now() + 30000);
    finishLate(new Response('tile'));
    await earlier;
    assert.equal(r.context.isAssetAccessPaused(), true);
});

test('CORS/network failures have bounded automatic retries and a usable manual retry', async () => {
    let blocked = true;
    const r = runtime(() => {
        if (blocked) throw new TypeError('Failed to fetch');
        return new Response('tile');
    });
    r.context.onAssetAccessRetry(() => { void r.context.fetchAssetResource(asset).catch(() => {}); });
    await assert.rejects(r.context.fetchAssetResource(asset));
    const notice = r.context.document.getElementById('assetAccessNotice');
    assert.equal(notice.querySelector('strong').attributes.role, 'status');
    assert.equal(notice.querySelector('button').disabled, true);
    await r.advance(120000);
    assert.equal(r.assetRequests().length, 3);
    assert.equal(r.challenges(), 1);
    assert.equal(r.context.getAssetAccessRetryAt(), Infinity);
    assert.equal(notice.querySelector('button').disabled, false);
    const count = r.requests.length;
    await assert.rejects(r.context.fetchAssetResource(asset));
    assert.equal(r.requests.length, count);
    blocked = false;
    assert.equal(await r.context.retryAssetAccess(), true);
    await flush();
    assert.equal(notice.hidden, true);
});

test('visible tiles resume after a 429 without reloading the page', async () => {
    let blocked = true;
    const r = runtime(() => new Response('tile', {
        status: blocked ? 429 : 200, headers: { 'Retry-After': '10' }
    }));
    r.context.currentMap = tileMap();
    r.load('js/map/tiles.js');
    const tile = r.context.loadTile(r.context.currentMap, 0, 0, 0);
    r.context.draw = () => r.context.loadTile(r.context.currentMap, 0, 0, 0);
    await flush();
    assert.equal(tile.deferred, true);
    for (let i = 0; i < 20; i++) r.context.draw();
    assert.equal(r.assetRequests().length, 1);
    blocked = false;
    await r.advance(10000);
    assert.equal(tile.loaded, true);
    assert.equal(tile.failed, false);
    assert.equal(r.assetRequests().length, 2);
});

test('unprotected resources still load while the official asset service is paused', async () => {
    const r = runtime(url => new Response('data', { status: url.includes('assets-v2.') ? 429 : 200 }));
    await assert.rejects(r.context.fetchAssetResource(asset));
    const options = { cache: 'no-store' };
    assert.ok((await r.context.fetchAssetResource('data/weapons.json', options)).ok);
    assert.deepEqual(r.requests.at(-1).options, options);
});

test('Terrain3D caches chunk failures and restores failed manifests after cooldown', async () => {
    const config = JSON.parse(sources.get('data/ballistics/terrain-context.json'));
    const manifest = JSON.parse(sources.get('data/terrain/bakurani/manifest.json'));
    let blockManifest = true;
    let blockChunk = true;
    let chunkRequests = 0;
    let manifestRequests = 0;
    const r = runtime(url => {
        if (url.endsWith('terrain-context.json')) return Response.json(config);
        if (url.endsWith('/manifest.json')) {
            manifestRequests++;
            return blockManifest ? new Response('', { status: 429 }) : Response.json(manifest);
        }
        if (url.endsWith('.bin')) {
            chunkRequests++;
            return blockChunk ? new Response('', { status: 429, headers: { 'Retry-After': '20' } })
                : new Response(new Uint8Array(511 * 511 * 2));
        }
        throw new Error(`Unexpected URL: ${url}`);
    });
    r.load('js/features/terrain-ballistics.js');
    const input = {
        mapId: 'bakurani', origin: { x: 94.45, y: 108.74 },
        target: { x: 94.6, y: 108.8 }, solutions: { inRange: true }
    };
    r.context.result = () => r.context.getTerrainBallisticSolutions(input);
    await r.context.initTerrainBallistics();
    for (let i = 0; i < 20; i++) r.context.result();
    await flush();
    assert.equal(manifestRequests, 1);
    assert.equal(r.context.getTerrainBallisticsState().ready, false);
    blockManifest = false;
    await r.advance(10000);
    assert.equal(manifestRequests, 2);
    assert.equal(r.context.getTerrainBallisticsState().ready, true);
    assert.equal(chunkRequests, 1);
    for (let i = 0; i < 100; i++) r.context.result();
    await r.advance(19000);
    assert.equal(chunkRequests, 1);
    blockChunk = false;
    await r.advance(1000);
    assert.equal(chunkRequests, 2);
    assert.equal(r.context.getTerrainBallisticsState().cachedChunks, 1);
    assert.equal(r.context.getTerrainBallisticSolutions(input).meta.pendingTerrain, false);
});

test('failed Turnstile script loads can be attempted again', async () => {
    const r = runtime(() => new Response('tile'));
    delete r.context.turnstile;
    const load = r.context.loadAssetTurnstile();
    r.context.document.head.children[0].events.error();
    await assert.rejects(load, /turnstile-unavailable/);
    assert.equal(r.context.document.head.children.length, 0);
    const retry = r.context.loadAssetTurnstile();
    const script = r.context.document.head.children[0];
    assert.ok(script);
    script.events.load();
    await retry;
});
