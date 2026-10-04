import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const source = await readFile(new URL('../../js/ui/developer-access.js', import.meta.url), 'utf8');
const privateMenu = await readFile(new URL('../../assets-gateway/private/developer-menu.txt', import.meta.url), 'utf8');

function runtime(overrides = {}) {
    const timers = new Map();
    let nextTimer = 0;
    const storage = new Map();
    const window = {
        location: { search: '?dev=1', href: 'https://wardogs-artillery.com/?dev=1' },
        history: { state: null, replaceState() {} },
        setTimeout(callback) { timers.set(++nextTimer, callback); return nextTimer; },
        clearTimeout(id) { timers.delete(id); }
    };
    const context = vm.createContext({
        URL, URLSearchParams, AbortController, Response, window,
        localStorage: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value) },
        getAssetGatewayOrigin: () => 'https://assets.wardogs-artillery.com',
        document: { getElementById: () => null },
        ...overrides
    });
    vm.runInContext(source, context);
    return { context, timers, storage, window };
}

test('forbidden developer admission never creates the launcher or loads protected code', async () => {
    let requests = 0;
    const r = runtime({
        fetch: async () => { requests++; return new Response('{"error":"forbidden"}', { status: 403 }); },
        document: { createElement() { throw new Error('unauthorized DOM'); } }
    });
    await r.context.initDeveloperMode();
    assert.equal(requests, 1);
    assert.equal(r.window.WardogsDeveloperAccess.isAuthorized(), false);
    assert.equal(r.timers.size, 0);
    assert.equal(r.storage.size, 0);
});

test('unauthorized private module execution cannot create any UI', () => {
    for (const window of [{}, { WardogsDeveloperAccess: { isAuthorized: () => false } }]) {
        vm.runInNewContext(privateMenu, {
            window,
            document: { createElement() { throw new Error('unauthorized DOM'); } }
        });
        assert.equal(window.WardogsDeveloperMenu, undefined);
    }
});

test('request timeout/cancellation uses credentialed no-store requests without query tokens', async () => {
    let seen;
    const r = runtime({ fetch: async (url, options) => { seen = { url, options }; return new Response('{}'); } });
    await r.context.developerAccessRequest();
    assert.equal(seen.url, 'https://assets.wardogs-artillery.com/__developer');
    assert.equal(seen.options.credentials, 'include');
    assert.equal(seen.options.cache, 'no-store');
    assert.equal(seen.options.redirect, 'error');
    assert.ok(seen.options.signal instanceof AbortSignal);
    assert.equal(r.timers.size, 0);
});

test('disabling during admission aborts the pending request and cannot install a late grant', async () => {
    let release, signal, scriptLoaded = false;
    const r = runtime({
        fetch: (_url, options) => { signal = options.signal; return new Promise(resolve => { release = resolve; }); },
        document: { createElement() { scriptLoaded = true; throw new Error('late module'); } }
    });
    const pending = r.context.initDeveloperMode();
    r.context.clearDeveloperAccess();
    assert.equal(signal.aborted, true);
    release(new Response(JSON.stringify({ ok: true, expiresAt: Date.now() + 60000 })));
    await pending;
    assert.equal(scriptLoaded, false);
    assert.equal(r.window.WardogsDeveloperAccess.isAuthorized(), false);
});

test('module loading failure revokes local authorization and does not persist enabled preference', async () => {
    const r = runtime({ document: {
        createElement: () => ({ remove() {} }),
        head: { append(script) { script.onerror(); } }
    } });
    await assert.rejects(r.context.loadDeveloperMenu({ ok: true, expiresAt: Date.now() + 60000 }, 0), /module-unavailable/);
    r.context.clearDeveloperAccess();
    assert.equal(r.window.WardogsDeveloperAccess.isAuthorized(), false);
    assert.equal(r.storage.size, 0);
    assert.equal(r.timers.size, 0);
});

test('both protected menu and owner sign-in keys exist in all locales', async () => {
    const r = runtime();
    const keys = vm.runInContext('Object.keys(DEVELOPER_ACCESS_TEXT)', r.context);
    const { languages } = JSON.parse(await readFile(new URL('../../locales/index.json', import.meta.url), 'utf8'));
    for (const { id, file } of languages) {
        const locale = JSON.parse(await readFile(new URL(`../../locales/${file}`, import.meta.url), 'utf8'));
        for (const key of keys) assert.ok(locale[key]?.trim(), `${id}: ${key}`);
    }
});
