import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { runInNewContext } from 'node:vm';

const runtimeSource = await readFile(new URL('../../js/core/analytics.js', import.meta.url), 'utf8');
const loaderSource = await readFile(new URL('../../js/core/analytics-loader.js', import.meta.url), 'utf8');
const endpoint = 'https://wardogs-artillery.goatcounter.com/count';

function environment({ host = 'wardogs-artillery.com', ready = true, sample = 0.1,
    store = new Map(), allowLocal = false, disabled = false } = {}) {
    let now = 100000;
    let nextTimer = 1;
    const timers = new Map();
    const counts = [];
    const windowListeners = new Map();
    const documentListeners = new Map();
    const math = Object.create(Math);
    math.random = () => sample;
    class Clock extends Date {
        static now() { return now; }
    }
    const document = {
        addEventListener: (name, callback) => documentListeners.set(name, callback)
    };
    const window = {
        location: { hostname: host, href: `https://${host}/`, origin: `https://${host}` },
        __WARDOGS_ANALYTICS_ALLOW_LOCAL__: allowLocal,
        __WARDOGS_ANALYTICS_DISABLED__: disabled,
        __WARDOGS_GOATCOUNTER_READY__: ready,
        goatcounter: ready ? { count: value => counts.push(JSON.parse(JSON.stringify(value))) } : undefined,
        sessionStorage: {
            getItem: key => store.get(key) ?? null,
            setItem: (key, value) => store.set(key, value)
        },
        setInterval: (fn, delay) => {
            const id = nextTimer++;
            timers.set(id, { fn, delay, interval: true, at: now + delay });
            return id;
        },
        clearInterval: id => timers.delete(id),
        setTimeout: (fn, delay) => {
            const id = nextTimer++;
            timers.set(id, { fn, delay, interval: false, at: now + delay });
            return id;
        },
        clearTimeout: id => timers.delete(id),
        addEventListener: (name, callback) => windowListeners.set(name, callback)
    };
    const context = { window, document, URL, Date: Clock, Math: math, console };
    runInNewContext(runtimeSource, context);
    function advance(ms) {
        const end = now + ms;
        while (true) {
            const due = [...timers.entries()].filter(([, timer]) => timer.at <= end)
                .sort((a, b) => a[1].at - b[1].at)[0];
            if (!due) break;
            const [id, timer] = due;
            now = timer.at;
            if (timer.interval) timer.at += timer.delay;
            else timers.delete(id);
            timer.fn();
        }
        now = end;
    }
    return { context, window, counts, timers, advance, store, windowListeners, documentListeners };
}

function loader({ host = 'wardogs-artillery.com', pathname = '/mobile/ru/',
    state = 'complete', allowLocal = false, disabled = false } = {}) {
    const scripts = [];
    const pageviews = [];
    const notifications = [];
    const documentListeners = new Map();
    const window = {
        location: { hostname: host, pathname, search: '?room=private', hash: '#secret' },
        __WARDOGS_ANALYTICS_ALLOW_LOCAL__: allowLocal,
        __WARDOGS_ANALYTICS_DISABLED__: disabled,
        dispatchEvent: event => notifications.push(event.type)
    };
    const document = {
        currentScript: { dataset: { goatcounter: endpoint } },
        title: 'WARDOGS Calculator',
        referrer: 'https://example.org/guide?contact=private#secret',
        readyState: state,
        head: { appendChild: script => scripts.push(script) },
        createElement: tag => ({
            tag, dataset: {}, listeners: {},
            addEventListener(name, fn) { this.listeners[name] = fn; }
        }),
        addEventListener: (name, fn) => documentListeners.set(name, fn)
    };
    class Event {
        constructor(type) { this.type = type; }
    }
    const context = { window, document, URL, Event };
    runInNewContext(loaderSource, context);
    function load() {
        window.goatcounter.url = vars => {
            const url = new URL(endpoint);
            url.searchParams.set('p', vars.path);
            url.searchParams.set('q', window.location.search);
            return url.href;
        };
        window.goatcounter.count = payload => pageviews.push(JSON.parse(JSON.stringify(payload)));
        scripts[0].listeners.load();
    }
    return { window, scripts, pageviews, notifications, documentListeners, context, load };
}

test('one pageview preserves the mobile/locale route and excludes private URL parameters', () => {
    const r = loader();
    assert.equal(r.scripts.length, 1);
    assert.equal(r.scripts[0].src, 'https://gc.zgo.at/count.js');
    assert.equal(r.scripts[0].dataset.goatcounter, endpoint);
    assert.equal(r.window.goatcounter.no_onload, true);
    assert.equal(r.window.goatcounter.no_events, true);
    r.load();
    r.scripts[0].listeners.load();
    assert.deepEqual(r.pageviews, [{ path: '/mobile/ru/', title: 'WARDOGS Calculator',
        referrer: 'https://example.org/guide' }]);
    assert.deepEqual(r.notifications, ['wardogs-analytics-ready']);
    runInNewContext(loaderSource, r.context);
    assert.equal(r.scripts.length, 1, 'duplicate loader execution fetched another tracker');
});

test('fast tracker loading waits for the document before counting', () => {
    const r = loader({ state: 'loading', pathname: '/zh-cn/maps/zestafona/' });
    r.load();
    assert.equal(r.pageviews.length, 0);
    r.documentListeners.get('DOMContentLoaded')();
    assert.equal(r.pageviews.length, 1);
    assert.equal(r.pageviews[0].path, '/zh-cn/maps/zestafona/');
});

test('the tracker URL excludes its automatic query payload for pageviews and events', () => {
    const r = loader();
    r.load();
    for (const path of ['/mobile/ru/', 'donation-click/boosty']) {
        const url = new URL(r.window.goatcounter.url({ path }));
        assert.equal(url.searchParams.get('p'), path);
        assert.equal(url.searchParams.has('q'), false);
        assert.equal(url.href.includes('private'), false);
    }
});

test('local copies and lookalike domains neither load nor submit hosted analytics', () => {
    for (const host of ['localhost', '127.0.0.1', 'apollyon-sys.github.io', 'fork.example',
        'wardogs-artillery.com.example']) {
        assert.equal(loader({ host }).scripts.length, 0);
        const r = environment({ host });
        r.context.trackAnalytics('donation-click', { service: 'boosty' });
        assert.equal(r.counts.length, 0);
        assert.equal(r.timers.size, 0);
    }
});

test('explicit development opt-in works only on loopback and respects the disabled flag', () => {
    const local = loader({ host: '127.0.0.1', allowLocal: true });
    assert.equal(local.scripts.length, 1);
    assert.equal(local.window.goatcounter.allow_local, true);
    assert.equal(loader({ host: 'fork.example', allowLocal: true }).scripts.length, 0);
    assert.equal(loader({ allowLocal: true, disabled: true }).scripts.length, 0);
    const r = environment({ host: 'localhost', allowLocal: true });
    r.context.trackAnalytics('feedback-opened');
    assert.equal(r.counts.length, 1);
});

test('donation events retain provider identity without uploading arbitrary event properties', () => {
    const r = environment();
    r.context.trackAnalytics('donation-click', { service: 'boosty', contact: 'private@example.org',
        x: 94.32, room: 'private-room', build: 'private-build' });
    assert.deepEqual(r.counts, [{ path: 'donation-click/boosty', title: 'donation-click/boosty',
        event: true, referrer: '', no_session: true }]);
    r.context.trackAnalytics('donation-click', { service: 'boosty' });
    r.advance(2000);
    r.context.trackAnalytics('donation-click', { service: 'ko-fi' });
    r.advance(2000);
    r.context.trackAnalytics('donation-click', { service: 'boosty' });
    assert.deepEqual(r.counts.map(item => item.path), [
        'donation-click/boosty', 'donation-click/ko-fi', 'donation-click/boosty'
    ]);
});

test('unrecognized names and private context cannot expand the event namespace', () => {
    const r = environment();
    for (const name of ['lcp-slow-image', 'origin-placed', 'map-changed', '/private/event', 'secret']) {
        r.context.trackAnalytics(name, { map: 'private-map' });
    }
    assert.equal(r.counts.length, 0);
    r.context.trackAnalytics('map-style-changed', { map: 'private-map', style: 'private-style' });
    assert.equal(r.counts[0].path, 'map-style-changed');
});

test('changing failure metadata does not create repeated tile-error events', () => {
    const r = environment();
    for (let i = 0; i < 500; i++) {
        r.context.trackOperationalFailure('asset-load-failed', {
            map: 'zestafona', source: `tile-${i}`, messageHash: String(i), code: String(i)
        });
    }
    r.advance(6000);
    assert.deepEqual(r.counts.map(item => item.path), ['asset-load-failed/zestafona']);
    const reloaded = environment({ store: r.store });
    reloaded.context.trackOperationalFailure('asset-load-failed', { map: 'zestafona' });
    assert.equal(reloaded.counts.length, 0);
});

test('calculation adoption retains the twenty-percent session sample and bounded map/weapon context', () => {
    const selected = environment({ sample: 0.1 });
    for (let i = 0; i < 30; i++) {
        selected.context.trackAnalytics('calculation', { map: 'bakurani', weapon: 'spg', x: i });
    }
    selected.advance(3000);
    assert.deepEqual(selected.counts.map(item => item.path), ['calculation/bakurani/spg']);
    const excluded = environment({ sample: 0.8 });
    excluded.context.trackAnalytics('calculation', { map: 'bakurani', weapon: 'spg' });
    assert.equal(excluded.counts.length, 0);
});

test('early custom events wait for the pageview and flush without a burst', () => {
    const r = environment({ ready: false });
    for (const name of ['feedback-opened', 'donation-dialog-opened', 'lobby-opened']) {
        r.context.trackAnalytics(name);
    }
    assert.equal(r.counts.length, 0);
    r.window.goatcounter = { count: value => r.counts.push(JSON.parse(JSON.stringify(value))) };
    r.window.__WARDOGS_GOATCOUNTER_READY__ = true;
    r.windowListeners.get('wardogs-analytics-ready')();
    assert.equal(r.counts.length, 1);
    r.advance(749);
    assert.equal(r.counts.length, 1);
    r.advance(1);
    assert.equal(r.counts.length, 2);
    r.advance(750);
    assert.equal(r.counts.length, 3);
    assert.equal(r.timers.size, 0);
});

test('a blocked tracker has a bounded queue and no permanent retry timer', () => {
    const r = environment({ ready: false });
    for (const name of ['feedback-opened', 'lobby-opened', 'target-saved', 'target-restored']) {
        r.context.trackAnalytics(name);
    }
    r.advance(31000);
    assert.equal(r.counts.length, 0);
    assert.equal(r.timers.size, 0);
    assert.equal(runInNewContext('ANALYTICS_QUEUE.length', r.context), 0);
    const failed = loader();
    failed.scripts[0].listeners.error();
    assert.equal(failed.window.__WARDOGS_ANALYTICS_DISABLED__, true);
});

test('a throwing tracker is isolated from application actions', () => {
    const r = environment();
    r.window.goatcounter.count = () => { throw new Error('blocked tracker'); };
    assert.doesNotThrow(() => r.context.trackAnalytics('donation-click', { service: 'boosty' }));
    assert.equal(r.window.__WARDOGS_ANALYTICS_DISABLED__, true);
    assert.equal(r.timers.size, 0);
});

test('static mobile partner links emit one event through the shared wrapper', () => {
    const r = environment();
    const click = r.documentListeners.get('click');
    click({ target: { closest: () => ({ dataset: {
        analyticsEvent: 'partner-click', analyticsEventPartner: 'wardogs-hub'
    } }) } });
    assert.equal(r.counts[0].path, 'partner-click/wardogs-hub');
});
