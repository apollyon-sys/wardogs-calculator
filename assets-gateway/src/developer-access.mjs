import { mintSession, sessionSubject, verifySession } from './tokens.mjs';
import developerMenuSource from '../private/developer-menu.txt';

export const DEVELOPER_PATH = '/__developer';
export const DEVELOPER_MODULE_PATH = '/__developer/module';
export const DEVELOPER_COOKIE = '__Host-wardogs_developer_session';
const LIFETIME_SECONDS = 3600;
const encoder = new TextEncoder();

function ipAddress(value) {
    if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(value)) {
        return value.split('.').every(octet => Number(octet) <= 255 && String(Number(octet)) === octet) ? value : null;
    }
    if (!value.includes(':') || !/^[a-f0-9:.]+$/i.test(value)) return null;
    try { return new URL(`http://[${value}]/`).hostname.slice(1, -1); } catch { return null; }
}

function ownerIp(request, env) {
    const ip = ipAddress(request.headers.get('CF-Connecting-IP') || '');
    const allowed = String(env.DEVELOPER_ALLOWED_IPS || '')
        .split(',').map(value => ipAddress(value.trim())).filter(Boolean);
    return ip !== null && allowed.includes(ip) ? ip : null;
}

function configured(env) {
    return typeof env.DEVELOPER_ACCESS_SECRET === 'string' &&
        /^[\x21-\x7e]{32,256}$/.test(env.DEVELOPER_ACCESS_SECRET);
}

function subject(request, origin) {
    // The developer cookie cannot act as an asset session, even if secrets match.
    return `developer:${origin}:${sessionSubject(request)}`;
}

async function matchesSecret(value, expected) {
    if (typeof value !== 'string' || value.length > 256) return false;
    const [actual, wanted] = await Promise.all([value, expected].map(text =>
        crypto.subtle.digest('SHA-256', encoder.encode(text))));
    const bytes = new Uint8Array(actual), reference = new Uint8Array(wanted);
    let difference = 0;
    for (let index = 0; index < reference.length; index++) difference |= bytes[index] ^ reference[index];
    return difference === 0;
}

function sessionCookie(token, lifetime) {
    return `${DEVELOPER_COOKIE}=${token}; Path=/; Max-Age=${lifetime}; HttpOnly; Secure; SameSite=None; Partitioned`;
}

export async function handleDeveloperRequest(request, env, { origin, corsHeaders, cookieValue, limitedJson }) {
    const url = new URL(request.url);
    const moduleRequest = url.pathname === DEVELOPER_MODULE_PATH;
    const respond = (body, status, extra = {}) => new Response(
        typeof body === 'string' ? body : JSON.stringify(body), {
            status,
            headers: {
                ...corsHeaders(origin),
                'Content-Type': 'application/json; charset=utf-8',
                'Cache-Control': 'private, no-store, max-age=0',
                'CDN-Cache-Control': 'no-store',
                'Cloudflare-CDN-Cache-Control': 'no-store',
                'X-Robots-Tag': 'noindex, noarchive',
                Vary: 'Origin, Cookie',
                ...extra
            }
        });

    if (url.search || request.headers.has('Range')) return respond({ error: 'unsupported-request' }, 400);
    const methods = moduleRequest ? ['GET'] : ['GET', 'POST'];
    if (!methods.includes(request.method)) return respond({ error: 'method-not-allowed' }, 405, { Allow: methods.join(', ') + ', OPTIONS' });
    // Fail closed for every country and ASSETS_DEV. Client headers cannot grant admission.
    const ip = ownerIp(request, env);
    if (!ip) return respond({ error: 'forbidden' }, 403);
    if (!configured(env)) return respond({ error: 'developer-not-configured' }, 503);

    if (request.method === 'POST') {
        if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get('Content-Type') || '')) return respond({ error: 'bad-content-type' }, 415);
        const body = await limitedJson(request, 1024);
        if (body?.logout === true) return respond({ ok: true }, 200, { 'Set-Cookie': sessionCookie('', 0) });
        const rate = env.DEVELOPER_LOGIN_RATE;
        if (!rate) return respond({ error: 'developer-not-configured' }, 503);
        if (!(await rate.limit({ key: ip })).success) return respond({ error: 'rate-limited' }, 429, { 'Retry-After': '60' });
        if (!await matchesSecret(body?.secret, env.DEVELOPER_ACCESS_SECRET)) return respond({ error: 'unauthorized' }, 401);
        const expiresAt = Date.now() + LIFETIME_SECONDS * 1000;
        const token = await mintSession(env.DEVELOPER_ACCESS_SECRET, expiresAt, 'restricted', subject(request, origin));
        return respond({ ok: true, expiresAt }, 201, { 'Set-Cookie': sessionCookie(token, LIFETIME_SECONDS) });
    }

    const session = await verifySession(
        env.DEVELOPER_ACCESS_SECRET, cookieValue(request, DEVELOPER_COOKIE), subject(request, origin));
    if (!session) return respond({ error: 'session-required' }, 401);
    if (moduleRequest) return respond(developerMenuSource, 200, { 'Content-Type': 'application/javascript; charset=utf-8' });
    return respond({ ok: true, expiresAt: session.expiresAt }, 200);
}
