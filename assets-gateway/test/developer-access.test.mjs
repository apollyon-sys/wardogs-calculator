import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { handleRequest } from '../src/index.mjs';
import { DEVELOPER_COOKIE } from '../src/developer-access.mjs';
import { mintSession, sessionSubject } from '../src/tokens.mjs';

const origin = 'https://wardogs-artillery.com';
const ip = '192.0.2.10';
const secret = 'a-test-developer-key-with-64-randomish-characters-do-not-use-real';
function environment(overrides = {}) {
    return {
        ASSETS_DEV: 'true',
        SESSION_SECRET: 'a-different-asset-secret-with-at-least-32-characters',
        DEVELOPER_ACCESS_SECRET: secret,
        DEVELOPER_ALLOWED_IPS: ip,
        DEVELOPER_LOGIN_RATE: { async limit() { return { success: true }; } },
        ...overrides
    };
}
function request(path = '/__developer', options = {}) {
    return new Request(`https://assets.wardogs-artillery.com${path}`, {
        ...options,
        headers: { Origin: origin, 'CF-Connecting-IP': ip, 'User-Agent': 'Developer test browser', ...(options.headers || {}) }
    });
}
function login(options = {}) {
    return request('/__developer', { method: 'POST', body: JSON.stringify({ secret }), headers: { 'Content-Type': 'application/json' }, ...options });
}
async function cookie(env) {
    const response = await handleRequest(login(), env);
    assert.equal(response.status, 201);
    return response.headers.get('Set-Cookie').split(';')[0];
}

test('developer admission requires an exact private IP even with the correct secret or development flags', async () => {
    for (const env of [environment({ DEVELOPER_ALLOWED_IPS: '' }), environment({ DEVELOPER_ALLOWED_IPS: '192.0.2.0/24,*' }), environment({ ENFORCE_SESSIONS: 'false', DEVELOPER_ALLOWED_IPS: '192.0.2.11' })]) {
        assert.equal((await handleRequest(login(), env)).status, 403);
    }
    const untrusted = login({ headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '198.51.100.1', 'X-Forwarded-For': ip, 'X-Real-IP': ip } });
    Object.defineProperty(untrusted, 'cf', { value: { country: 'RU' } });
    assert.equal((await handleRequest(untrusted, environment())).status, 403);
});

test('missing or weak developer secrets fail closed independently of asset-session configuration', async () => {
    for (const value of [undefined, '', 'short', 'a'.repeat(257), ' '.repeat(32)]) {
        assert.equal((await handleRequest(login(), environment({ DEVELOPER_ACCESS_SECRET: value }))).status, 503);
    }
    assert.equal((await handleRequest(login(), environment({ SESSION_SECRET: undefined }))).status, 201);
    const production = environment({ ASSETS_DEV: undefined, SESSION_SECRET: undefined });
    assert.equal((await handleRequest(login(), production)).status, 201);
});

test('developer status and module deny absent, fake and ordinary asset cookies', async () => {
    const env = environment();
    const assetToken = await mintSession(env.SESSION_SECRET, Date.now() + 60000, 'restricted', sessionSubject(request()));
    for (const path of ['/__developer', '/__developer/module']) {
        for (const value of ['', `${DEVELOPER_COOKIE}=fake`, `__Host-wardogs_asset_session=${assetToken}`]) {
            const response = await handleRequest(request(path, { headers: { Cookie: value } }), env);
            assert.equal(response.status, 401);
            assert.doesNotMatch(await response.text(), /installDeveloperMenu|captureDeveloperFiringDiagnostics/);
        }
    }
});

test('wrong credentials are rejected and missing/exhausted login rate bindings fail closed', async () => {
    assert.equal((await handleRequest(login({ body: JSON.stringify({ secret: 'wrong' }) }), environment())).status, 401);
    assert.equal((await handleRequest(login(), environment({ DEVELOPER_LOGIN_RATE: undefined }))).status, 503);
    const response = await handleRequest(login(), environment({ DEVELOPER_LOGIN_RATE: { async limit() { return { success: false }; } } }));
    assert.equal(response.status, 429);
    assert.equal(response.headers.get('Retry-After'), '60');
});

test('owner login issues a private cookie and serves the menu only after signature validation', async () => {
    const env = environment();
    const admission = await handleRequest(login(), env);
    const header = admission.headers.get('Set-Cookie');
    assert.match(header, /Max-Age=3600; HttpOnly; Secure; SameSite=None; Partitioned/);
    assert.match(header, new RegExp(`^${DEVELOPER_COOKIE}=`));
    const grant = await admission.json();
    assert.equal(grant.ok, true);
    assert.ok(grant.expiresAt > Date.now());
    const response = await handleRequest(request('/__developer/module', { headers: { Cookie: header.split(';')[0] } }), env);
    assert.equal(response.status, 200);
    assert.match(response.headers.get('Content-Type'), /^application\/javascript/);
    assert.equal(response.headers.get('Access-Control-Allow-Origin'), origin);
    assert.equal(response.headers.get('Cache-Control'), 'private, no-store, max-age=0');
    assert.equal(response.headers.get('Cloudflare-CDN-Cache-Control'), 'no-store');
    assert.equal(response.headers.get('Vary'), 'Origin, Cookie');
    const source = await response.text();
    assert.match(source, /captureDeveloperFiringDiagnostics/);
    assert.match(source, /viewBox="0 0 24 24"/);
    assert.equal(source.includes(secret), false);
    assert.doesNotThrow(() => new vm.Script(source));
    vm.runInNewContext(source, { window: { WardogsDeveloperAccess: { isAuthorized: () => false } } });
});

test('developer session binds IP, browser and Origin and is invalidated by key rotation', async () => {
    const env = environment({ DEVELOPER_ALLOWED_IPS: `${ip},192.0.2.11`, LOCAL_DEVELOPMENT_IPS: ip, DEVELOPMENT_ORIGINS: 'http://localhost:8000' });
    const value = await cookie(env);
    for (const headers of [
        { 'CF-Connecting-IP': '192.0.2.11' }, { 'User-Agent': 'Another browser' }, { Origin: 'http://localhost:8000' }
    ]) assert.equal((await handleRequest(request('/__developer/module', { headers: { Cookie: value, ...headers } }), env)).status, 401);
    assert.equal((await handleRequest(request('/__developer/module', { headers: { Cookie: value } }), { ...env, DEVELOPER_ACCESS_SECRET: 'a-completely-new-developer-secret-with-32-characters' })).status, 401);
});

test('developer cookies never authorize assets, including if both configured secrets are equal', async () => {
    const env = environment({ SESSION_SECRET: secret });
    const value = await cookie(env);
    const response = await handleRequest(request('/releases/assets-v1/maps/test.webp', {
        headers: { Cookie: value.replace(DEVELOPER_COOKIE, '__Host-wardogs_asset_session') }
    }), env);
    assert.equal(response.status, 401);
});

test('expired developer cookies are denied and logout only deletes the developer cookie', async () => {
    const env = environment();
    const token = await mintSession(secret, Date.now() - 1000, 'restricted', `developer:${origin}:${sessionSubject(request())}`);
    assert.equal((await handleRequest(request('/__developer/module', { headers: { Cookie: `${DEVELOPER_COOKIE}=${token}` } }), env)).status, 401);
    const response = await handleRequest(login({ body: '{"logout":true}' }), env);
    assert.equal(response.status, 200);
    assert.match(response.headers.get('Set-Cookie'), /wardogs_developer_session=; Path=\/; Max-Age=0/);
    assert.doesNotMatch(response.headers.get('Set-Cookie'), /asset_session/);
    const exhausted = await handleRequest(login({ body: '{"logout":true}' }), {
        ...env, DEVELOPER_LOGIN_RATE: { async limit() { return { success: false }; } }
    });
    assert.equal(exhausted.status, 200);
});

test('developer endpoints reject malformed methods, queries, Range, MIME, body and untrusted Origins', async () => {
    const env = environment();
    for (const [r, status] of [
        [request('/__developer', { method: 'PUT' }), 405],
        [request('/__developer/module', { method: 'POST' }), 405],
        [request('/__developer?v=1'), 400],
        [request('/__developer/module', { headers: { Range: 'bytes=0-100' } }), 400],
        [login({ headers: { 'Content-Type': 'text/plain' } }), 415],
        [login({ body: 'not json' }), 400],
        [login({ body: JSON.stringify({ secret: 'x'.repeat(2048) }) }), 400],
        [login({ headers: { 'Content-Type': 'application/json', Origin: 'https://untrusted.example' } }), 403]
    ]) assert.equal((await handleRequest(r, env)).status, status);
});

test('IPv6 is normalized exactly and developer status does not read R2 or asset cache', async () => {
    const env = environment({
        DEVELOPER_ALLOWED_IPS: '2001:db8::a',
        ASSETS: new Proxy({}, { get() { throw new Error('developer route touched R2'); } })
    });
    const admission = await handleRequest(login({ headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '2001:0db8:0:0:0:0:0:a' } }), env);
    assert.equal(admission.status, 201);
    const value = admission.headers.get('Set-Cookie').split(';')[0];
    const response = await handleRequest(request('/__developer', { headers: { Cookie: value, 'CF-Connecting-IP': '2001:0db8:0:0:0:0:0:a' } }), env);
    assert.equal(response.status, 200);
});
