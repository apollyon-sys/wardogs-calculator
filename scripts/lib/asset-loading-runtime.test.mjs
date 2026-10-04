import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const root = new URL('../../', import.meta.url);
const sources = new Map(await Promise.all([
    'js/core/asset-access.js', 'js/map/tiles.js',
    'js/features/terrain-ballistics.js', 'config/app.json',
    'data/ballistics/terrain-context.json', 'data/terrain/bakurani/manifest.json', 'js/ui/feedback.js'
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
        const classes = new Set();
        this.classList = {
            contains: name => classes.has(name),
            toggle: (name, enabled) => enabled ? classes.add(name) : classes.delete(name)
        };
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

function runtime(handler, { restricted = false, challengeGate, sessionHandler } = {}) {
    let now = Date.parse('2026-10-03T12:00:00Z');
    let timerId = 0;
    let challenges = 0;
    let challengeCallback;
    let challengeOptions;
    let sessionCreated = false;
    const timeouts = [];
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
        Date: ClockDate, URL: BlobURL, Image: TestImage,
        AbortSignal: { timeout: delay => { timeouts.push(delay); return AbortSignal.timeout(delay); } },
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
                if (sessionHandler) return sessionHandler(options, now);
                if (options.method === 'GET' && !sessionCreated) {
                    return new Response('{}', {
                        status: 401,
                        headers: restricted ? { 'X-Wardogs-Asset-Fallback': 'restricted' } : {}
                    });
                }
                sessionCreated = true;
                return Response.json({
                    expiresAt: now + 3600000,
                    mode: restricted ? 'restricted' : 'standard'
                }, { status: options.method === 'POST' ? 201 : 200 });
            }
            return handler(url, options);
        },
        turnstile: {
            render(_selector, options) { challengeOptions = options; challengeCallback = options.callback; return 'widget'; },
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
        challengeOptions: () => challengeOptions,
        timeouts,
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
    assert.equal(r.challenges(), 3, 'each bounded recovery rechecks admission after a network failure');
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
    r.context.S.origin = input.origin;
    r.context.S.target = input.target;
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
    assert.equal(r.context.getTerrainBallisticsState().currentPointsReady, false);
    assert.equal(chunkRequests, 1);
    for (let i = 0; i < 100; i++) r.context.result();
    await r.advance(19000);
    assert.equal(chunkRequests, 1);
    blockChunk = false;
    await r.advance(1000);
    assert.equal(chunkRequests, 2);
    assert.equal(r.context.getTerrainBallisticsState().cachedChunks, 1);
    assert.equal(r.context.getTerrainBallisticSolutions(input).meta.pendingTerrain, false);
    for (let i = 0; i < 20; i++) {
        const status = r.context.getTerrainBallisticsState();
        assert.equal(status.currentPointsReady, true);
        assert.ok(Number.isFinite(status.currentHeights.deltaZ));
    }
    assert.equal(chunkRequests, 2, 'status refresh must only inspect cached chunks');
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

test('a slow challenge can complete after 20 seconds with longer session timeouts', async () => {
    let release;
    const gate = new Promise(resolve => { release = resolve; });
    const r = runtime(() => new Response('tile'), { challengeGate: gate });
    const pending = r.context.fetchAssetResource(asset);
    await flush();
    await r.advance(20000);
    assert.equal(r.context.getAssetAccessDiagnostics().pending, true);
    const notice = r.context.document.getElementById('assetAccessNotice');
    assert.equal(notice.hidden, false);
    assert.equal(notice.querySelector('strong').textContent, 'Loading the map…');
    assert.equal(notice.querySelector('button').hidden, true);
    assert.equal(r.requests.filter(request => request.options.method === 'POST').length, 0);
    release();
    assert.ok((await pending).ok);
    assert.equal(notice.hidden, true);
    assert.ok(r.timeouts.every(delay => delay === 30000));
    assert.equal(r.context.getAssetAccessDiagnostics().stage, 'ready');
});

test('the Turnstile script can load after the old eight-second deadline', async () => {
    const r = runtime(() => new Response('tile'));
    delete r.context.turnstile;
    let settled = false;
    const pending = r.context.loadAssetTurnstile().finally(() => { settled = true; });
    await r.advance(9000);
    assert.equal(settled, false);
    r.context.document.head.children[0].events.load();
    await pending;
});

test('interactive verification is visible, accessible and hidden after success', async () => {
    let release;
    const gate = new Promise(resolve => { release = resolve; });
    const r = runtime(() => new Response('tile'), { challengeGate: gate });
    const pending = r.context.ensureAssetAccess();
    await flush();
    const panel = r.context.document.getElementById('assetAccessChallenge');
    const holder = r.context.document.getElementById('assetAccessTurnstile');
    assert.equal(holder.attributes['aria-hidden'], undefined);
    assert.equal(r.challengeOptions().appearance, 'interaction-only');
    assert.equal(panel.querySelector('strong').hidden, true);
    r.challengeOptions()['before-interactive-callback']();
    assert.equal(panel.hidden, false);
    assert.equal(panel.classList.contains('is-interactive'), true);
    assert.equal(panel.querySelector('strong').hidden, false);
    assert.equal(panel.querySelector('strong').attributes['aria-live'], 'polite');
    release();
    assert.equal(await pending, true);
    assert.equal(panel.hidden, true);
});

test('an unsolved challenge stops after one minute and records only a safe error code', async () => {
    const r = runtime(() => new Response('tile'), { challengeGate: new Promise(() => {}) });
    const pending = r.context.ensureAssetAccess();
    await flush();
    await r.advance(60000);
    assert.equal(await pending, false);
    assert.equal(r.context.document.getElementById('assetAccessChallenge').hidden, true);
    const diagnostics = r.context.getAssetAccessDiagnostics();
    assert.equal(diagnostics.lastFailure.stage, 'turnstile-challenge');
    assert.equal(diagnostics.lastFailure.code, 'turnstile-timeout');
    assert.equal(r.assetRequests().length, 0);
});

test('network recovery obtains fresh clearance once before resuming tiles', async () => {
    const r = runtime(() => {
        if (r.challenges() < 2) throw new TypeError('Failed to fetch');
        return new Response('tile');
    });
    r.context.onAssetAccessRetry(() => { void r.context.fetchAssetResource(asset).catch(() => {}); });
    await assert.rejects(r.context.fetchAssetResource(asset));
    assert.equal(r.context.getAssetAccessDiagnostics().sessionValid, false);
    assert.equal(r.context.getAssetAccessDiagnostics().lastFailure.code, 'network-or-cors');
    await r.advance(10000);
    assert.equal(r.assetRequests().length, 2);
    assert.equal(r.challenges(), 2);
    assert.equal(r.context.getAssetAccessDiagnostics().lastFailure, null);
    for (let i = 0; i < 8; i++) assert.ok((await r.context.fetchAssetResource(asset)).ok);
    assert.equal(r.challenges(), 2, 'successful tiles do not reauthorize');
});

test('forced recovery re-probes the region before choosing the asset host', async () => {
    let regional = false;
    let createdMode = '';
    const r = runtime(url => {
        if (!regional) {
            regional = true;
            return new Response('', { status: 403 });
        }
        assert.equal(new URL(url).origin, gateway);
        return new Response('tile');
    }, { sessionHandler(options, now) {
        const mode = regional ? 'restricted' : 'standard';
        if (options.method === 'GET' && createdMode !== mode) {
            return new Response('{}', { status: 401,
                headers: regional ? { 'X-Wardogs-Asset-Fallback': 'restricted' } : {} });
        }
        if (options.method === 'POST') {
            createdMode = mode;
            if (regional) assert.equal(JSON.parse(options.body).token, '');
        }
        return Response.json({ mode, expiresAt: now + 3600000 },
            { status: options.method === 'POST' ? 201 : 200 });
    } });
    assert.ok((await r.context.fetchAssetResource(asset)).ok);
    assert.equal(r.challenges(), 1, 'regional refresh does not execute Turnstile');
    assert.equal(r.context.getAssetAccessDiagnostics().sessionMode, 'restricted');
    assert.equal(r.assetRequests().length, 2);
});

test('a regional browser that cannot retain its cookie sends no tile requests', async () => {
    const r = runtime(() => { throw new Error('must not fetch tiles'); }, {
        sessionHandler(options, now) {
            return options.method === 'POST'
                ? Response.json({ mode: 'restricted', expiresAt: now + 3600000 }, { status: 201 })
                : new Response('{}', { status: 401, headers: { 'X-Wardogs-Asset-Fallback': 'restricted' } });
        }
    });
    await assert.rejects(r.context.fetchAssetResource(asset));
    assert.equal(r.assetRequests().length, 0);
    assert.equal(r.challenges(), 0);
    const failure = r.context.getAssetAccessDiagnostics().lastFailure;
    assert.equal(failure.code, 'session-cookie-unavailable');
    assert.equal(failure.stage, 'session-confirm');
});

test('caller cancellation does not pause asset delivery or invalidate admission', async () => {
    const controller = new AbortController();
    const r = runtime(() => {
        controller.abort();
        throw new DOMException('cancelled', 'AbortError');
    });
    await assert.rejects(r.context.fetchAssetResource(asset, { signal: controller.signal }));
    assert.equal(r.context.getAssetAccessDiagnostics().sessionValid, true);
    assert.equal(r.context.getAssetAccessDiagnostics().paused, false);
    assert.equal(r.challenges(), 1);
});

test('feedback adds allowlisted load status without coordinates, tokens or raw errors', () => {
    const r = runtime(() => new Response('tile'));
    r.context.getAssetAccessDiagnostics = () => ({
        enabled: true, stage: 'asset-fetch', sessionMode: 'standard', configuredMode: 'preclearance',
        deliveryOrigin: direct, sessionValid: false, regionalFallback: false, paused: true,
        pending: false, automaticRetries: 2, awaitingManualRetry: true,
        cookie: 'PRIVATE_COOKIE', token: 'PRIVATE_TOKEN', origin: { x: 1, y: 2 },
        lastFailure: { stage: 'asset-fetch', code: 'network-or-cors', status: null,
            requestHost: 'assets-v2.wardogs-artillery.com', cfRay: null,
            body: 'PRIVATE_BODY', message: 'PRIVATE_ERROR' }
    });
    r.context.getMapTileDiagnostics = () => ({ cached: 25, loaded: 5, failed: 4, queued: 16,
        retrying: 0, activeRequests: 0, origin: { x: 3, y: 4 } });
    r.load('js/ui/feedback.js');
    const context = r.context.feedbackLoadingContext();
    assert.equal(context.assetDiagnostics.lastFailure.code, 'network-or-cors');
    assert.equal(context.tileDiagnostics.loaded, 5);
    assert.doesNotMatch(JSON.stringify(context), /PRIVATE_|\"origin\"|\"token\"|\"cookie\"/);
});
