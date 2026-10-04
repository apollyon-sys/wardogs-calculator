import assert from 'node:assert/strict';
import test from 'node:test';

import { handleRequest } from '../src/index.mjs';
import { mintSession, sessionSubject } from '../src/tokens.mjs';

const ownerIp = '203.0.113.10';
const localOrigin = 'http://127.0.0.1:8000';
const assetPath =
    '/releases/assets-v1/maps/tiles-color/bakurani/zoom_4/4_4.webp';

function environment() {
    const state = { reads: 0, budgetChecks: 0 };
    const allow = { async limit() { return { success: true }; } };
    const values = new Map();

    return {
        state,
        LOCAL_DEVELOPMENT_IPS: ownerIp,
        DEVELOPMENT_ORIGINS:
            `${localOrigin},http://localhost:8000`,
        SESSION_SECRET:
            'test-secret-with-at-least-thirty-two-characters',
        SESSION_RATE: allow,
        ASSET_SESSION_RATE: allow,
        ASSET_RESTRICTED_RATE: allow,
        ASSET_IP_RATE: allow,
        ASSET_WINDOW_RATE: allow,
        ASSET_SEQUENCE_RATE: allow,
        // A real local browser reports cross-site. It should still be
        // admitted by its trusted IP without relaxing the other controls.
        ASSET_CONTEXT_RATE: {
            async limit() { return { success: false }; }
        },
        REQUEST_STATE: {
            async get(key) { return values.get(key) || null; },
            async put(key, value) { values.set(key, value); }
        },
        ASSET_REQUEST_GUARD: {
            idFromName(actor) { return actor; },
            get() {
                return {
                    async fetch() {
                        state.budgetChecks += 1;
                        return Response.json({ allowed: true });
                    }
                };
            }
        },
        ASSETS: {
            async get() {
                state.reads += 1;
                const body = new TextEncoder().encode('tile');
                return {
                    body,
                    size: body.byteLength,
                    httpEtag: '"test-etag"',
                    writeHttpMetadata(headers) {
                        headers.set('Content-Type', 'image/webp');
                    }
                };
            }
        }
    };
}

function request(path, { origin = localOrigin, ip = ownerIp, ...options } = {}) {
    const headers = new Headers({
        Origin: origin,
        'User-Agent': 'owner-local-browser-test',
        'Sec-Fetch-Site': 'cross-site',
        'Sec-Fetch-Mode': 'cors',
        ...(options.headers || {})
    });
    if (ip !== null) headers.set('CF-Connecting-IP', ip);

    return new Request(`https://assets.wardogs-artillery.com${path}`, {
        ...options,
        headers
    });
}

async function sessionCookie(env, options = {}) {
    const response = await handleRequest(request('/__session', {
        ...options,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}'
    }), env);
    assert.equal(response.status, 201);
    assert.equal((await response.json()).mode, 'restricted');
    assert.match(response.headers.get('Set-Cookie'), /SameSite=None; Partitioned/);
    return response.headers.get('Set-Cookie').split(';', 1)[0];
}

test('owner local origins receive signed access through the existing client fallback', async () => {
    for (const origin of [localOrigin, 'http://localhost:8000']) {
        const env = environment();
        const preflight = await handleRequest(request('/__session', {
            origin, method: 'OPTIONS'
        }), env);
        assert.equal(preflight.status, 204);
        assert.equal(preflight.headers.get('Access-Control-Allow-Origin'), origin);

        const probe = await handleRequest(request('/__session', { origin }), env);
        assert.equal(probe.status, 401);
        assert.equal(probe.headers.get('X-Wardogs-Asset-Fallback'), 'restricted');

        const cookie = await sessionCookie(env, { origin });
        const reused = await handleRequest(request('/__session', {
            origin, headers: { Cookie: cookie }
        }), env);
        assert.equal(reused.status, 200);
        assert.equal((await reused.json()).mode, 'restricted');

        const asset = await handleRequest(request(assetPath, {
            origin, headers: { Cookie: cookie }
        }), env);
        assert.equal(asset.status, 200);
        assert.equal(asset.headers.get('Access-Control-Allow-Origin'), origin);
        assert.equal(asset.headers.get('X-Wardogs-Asset-Access'), 'restricted');
        assert.equal(await asset.text(), 'tile');
        assert.equal(env.state.reads, 1);
        assert.equal(env.state.budgetChecks, 0);

        // The client refreshes by POST; this must also work without Turnstile.
        await sessionCookie(env, { origin });
    }
});

test('local access fails closed for other IPs and unconfigured origins', async () => {
    const env = environment();
    for (const options of [
        { ip: '203.0.113.11' },
        { ip: null },
        { ip: '203.0.113.11', headers: { 'X-Forwarded-For': ownerIp, 'X-Real-IP': ownerIp } },
        { origin: 'http://127.0.0.1:8001' },
        { origin: 'http://localhost.attacker.example:8000' },
        { origin: 'http://192.168.1.5:8000' },
        { origin: 'null' }
    ]) {
        for (const path of ['/__session', assetPath]) {
            const response = await handleRequest(request(path, options), env);
            assert.equal(response.status, 403, JSON.stringify(options));
        }
    }
    assert.equal(env.state.reads, 0);
});

test('local access still requires a valid cookie and rechecks the allowlist on each read', async () => {
    const env = environment();
    for (const headers of [{}, { Cookie: '__Host-wardogs_asset_session=forged' }]) {
        const denied = await handleRequest(request(assetPath, { headers }), env);
        assert.equal(denied.status, 401);
    }

    const cookie = await sessionCookie(env);
    const changedIp = await handleRequest(request(assetPath, {
        ip: '203.0.113.11', headers: { Cookie: cookie }
    }), env);
    assert.equal(changedIp.status, 403);

    delete env.LOCAL_DEVELOPMENT_IPS;
    const revoked = await handleRequest(request(assetPath, {
        headers: { Cookie: cookie }
    }), env);
    assert.equal(revoked.status, 403);
    assert.equal(env.state.reads, 0);
});

test('an owner IP on the official origin does not bypass Turnstile', async () => {
    const env = environment();
    const response = await handleRequest(request('/__session', {
        origin: 'https://wardogs-artillery.com',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}'
    }), env);
    assert.equal(response.status, 503);
    assert.equal((await response.json()).error, 'turnstile-not-configured');
    assert.equal(response.headers.has('Set-Cookie'), false);
});

test('an existing standard cookie is replaced with the local delivery mode', async () => {
    const env = environment();
    const token = await mintSession(
        env.SESSION_SECRET, Date.now() + 60000, 'standard',
        sessionSubject(request('/__session'))
    );
    const probe = await handleRequest(request('/__session', {
        headers: { Cookie: `__Host-wardogs_asset_session=${token}` }
    }), env);
    assert.equal(probe.status, 401);
    assert.equal(probe.headers.get('X-Wardogs-Asset-Fallback'), 'restricted');
});

test('owner local asset access skips budgets, rate limits and existing holds', async () => {
    const env = environment();
    env.REQUEST_STATE.get = async () => '1';
    let limitCalls = 0;
    const limiter = {
        async limit() {
            limitCalls += 1;
            return { success: false };
        }
    };
    for (const name of [
        'ASSET_SESSION_RATE', 'ASSET_RESTRICTED_RATE', 'ASSET_IP_RATE',
        'ASSET_WINDOW_RATE', 'ASSET_CONTEXT_RATE', 'ASSET_SEQUENCE_RATE'
    ]) env[name] = limiter;
    env.ASSET_REQUEST_GUARD.get = () => ({
        async fetch() {
            env.state.budgetChecks += 1;
            return Response.json({
                allowed: false, reason: 'session-assets', holdSeconds: 600
            });
        }
    });

    const cookie = await sessionCookie(env);
    for (const path of [
        assetPath,
        '/releases/assets-v1/maps/tiles/bakurani/zoom_5/31_31.webp'
    ]) {
        const allowed = await handleRequest(request(path, {
            headers: { Cookie: cookie }
        }), env);
        assert.equal(allowed.status, 200);
    }
    const admission = await handleRequest(request('/__session', {
        headers: { Cookie: cookie }
    }), env);
    assert.equal(admission.status, 200);
    assert.equal(limitCalls, 0);
    assert.equal(env.state.budgetChecks, 0);
    assert.equal(env.state.reads, 2);

    // The same IP and cookie do not grant exemptions on the official origin.
    const held = await handleRequest(request(assetPath, {
        origin: 'https://wardogs-artillery.com',
        headers: { Cookie: cookie }
    }), env);
    assert.equal(held.status, 429);
    assert.equal(env.state.reads, 2);
});

test('owner IP alone does not exempt official-origin asset requests from rates or budgets', async () => {
    for (const control of ['rate', 'budget']) {
        const env = environment();
        const cookie = await sessionCookie(env);
        if (control === 'rate') {
            env.ASSET_RESTRICTED_RATE = {
                async limit() { return { success: false }; }
            };
        } else {
            env.ASSET_REQUEST_GUARD.get = () => ({
                async fetch() {
                    env.state.budgetChecks += 1;
                    return Response.json({
                        allowed: false, reason: 'session-assets',
                        strikeLevel: 1, holdSeconds: 600
                    });
                }
            });
        }
        const limited = await handleRequest(request(assetPath, {
            origin: 'https://wardogs-artillery.com',
            headers: { Cookie: cookie, 'Sec-Fetch-Site': 'same-site' }
        }), env);
        assert.equal(limited.status, 429, control);
        assert.equal(env.state.reads, 0);
        assert.equal(env.state.budgetChecks, 1);
    }
});

test('owner local access retains request validation and production binding requirements', async () => {
    const env = environment();
    const cookie = await sessionCookie(env);
    for (const [path, options] of [
        [`${assetPath}?v=1`, {}],
        [assetPath, { method: 'POST' }],
        [assetPath, { headers: { Range: 'bytes=0-8' } }]
    ]) {
        const invalid = await handleRequest(request(path, {
            ...options, headers: { Cookie: cookie, ...options.headers }
        }), env);
        assert.equal(invalid.status, 400);
    }
    assert.equal(env.state.reads, 0);

    const missingBinding = environment();
    delete missingBinding.SESSION_RATE;
    const misconfigured = await handleRequest(request('/__session'), missingBinding);
    assert.equal(misconfigured.status, 503);
});

test('local access is disabled unless an exact valid IP is configured', async () => {
    for (const ips of ['', '*', '0.0.0.0/0', '203.0.113.0/24', '203.0.113.10:443', '999.0.0.1']) {
        const env = { ...environment(), LOCAL_DEVELOPMENT_IPS: ips };
        // Even accidentally adding loopback to the production origins cannot
        // enable local access without the private allowlist.
        env.ALLOWED_ORIGINS = localOrigin;
        const response = await handleRequest(request('/__session'), env);
        assert.equal(response.status, 403, ips);
    }
});

test('owner allowlist supports equivalent IPv6 forms but only configured loopback origins', async () => {
    const env = environment();
    env.LOCAL_DEVELOPMENT_IPS = `${ownerIp},2001:0db8:0000:0000:0000:0000:0000:002a`;
    env.DEVELOPMENT_ORIGINS += ',http://[::1]:8000,https://fork.example';
    const ip = '2001:db8::2a';
    const cookie = await sessionCookie(env, { ip, origin: 'http://[::1]:8000' });
    const allowed = await handleRequest(request(assetPath, {
        ip, origin: 'http://[::1]:8000', headers: { Cookie: cookie }
    }), env);
    assert.equal(allowed.status, 200);
    const denied = await handleRequest(request('/__session', {
        ip, origin: 'https://fork.example'
    }), env);
    assert.equal(denied.status, 403);
});
