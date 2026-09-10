import { settings } from './config.mjs';
import { normalizeDocument } from '../../js/collab/protocol.mjs';
import { validateCatalogDocument } from './catalog.mjs';
import { normalizeFeedback, deliverFeedback } from './feedback.mjs';
import { validateTurnstile, usesRestrictedChinaAdmission } from './admission.mjs';
import {
    randomKey, hash, mintInvite, verifyInvite, mintAdmission, verifyAdmission
} from './tokens.mjs';
export { LobbyRoom, LobbyBudget } from './rooms.mjs';
function headers(origin) {
    return {
        'Content-Type': 'application/json', 'Cache-Control': 'no-store',
        'Access-Control-Allow-Origin': origin, Vary: 'Origin',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '86400',
        'Referrer-Policy': 'no-referrer',
        'X-Content-Type-Options': 'nosniff',
        'Cross-Origin-Resource-Policy': 'same-site',
        'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
        'Permissions-Policy': 'camera=(), geolocation=(), microphone=()'
    };
}
const json = (body, status, origin) => new Response(JSON.stringify(body), { status, headers: headers(origin) });

function binding(env, name, config) {
    const value = env[name];
    if (!value && !config.development) throw new Error('missing-security-binding');
    return value;
}

async function allowedBy(rateLimit, key) {
    return !rateLimit || (await rateLimit.limit({ key })).success;
}

async function limitedBody(request, maximum) {
    const reader = request.body?.getReader();
    if (!reader) throw new Error('bad-json');
    const chunks = [];
    let size = 0;
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > maximum) { await reader.cancel(); throw new Error('room-too-large'); }
        chunks.push(value);
    }
    const combined = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { combined.set(chunk, offset); offset += chunk.length; }
    try { return JSON.parse(new TextDecoder().decode(combined)); }
    catch { throw new Error('bad-json'); }
}
export default {
    async fetch(request, env) {
        const config = settings(env);
        const origin = request.headers.get('Origin') || '';
        // Browser-origin restriction is defence in depth, not authentication.
        if (!config.allowedOrigins.includes(origin)) return json({ error: 'forbidden-origin' }, 403, 'null');

        const url = new URL(request.url);
        const feedbackRoute = url.pathname === '/feedback';

        if (request.method === 'OPTIONS') {
            return new Response(null, { status: 204, headers: headers(origin) });
        }

        const ip = request.headers.get('CF-Connecting-IP') || 'local';

        try {
            if (feedbackRoute) {
                if (request.method !== 'POST') return json({ error: 'not-found' }, 404, origin);
                if (env.FEEDBACK_DISABLED === 'true') {
                    return json({ error: 'feedback-disabled' }, 503, origin);
                }
                if (!await allowedBy(binding(env, 'FEEDBACK_RATE', config), ip)) {
                    return json({ error: 'rate-limited' }, 429, origin);
                }

                const raw = await limitedBody(request, 20 * 1024);

                // Honeypot submissions get a fake success and are never forwarded.
                if (String(raw?.website || '').trim()) {
                    return json({ ok: true }, 201, origin);
                }

                const feedback = normalizeFeedback(raw);

                if (!await deliverFeedback(env, config, feedback)) {
                    return json({ error: 'feedback-not-configured' }, 503, origin);
                }

                return json({ ok: true }, 201, origin);
            }

            if (!config.enabled) return json({ error: 'disabled' }, 503, origin);
            if (typeof env.ROOM_SECRET !== 'string' || env.ROOM_SECRET.length < 32) {
                return json({ error: 'not-configured' }, 503, origin);
            }

            const restrictedChinaAdmission = usesRestrictedChinaAdmission(config, request.cf?.country);

            if (!await allowedBy(binding(env, 'ENTRY_RATE', config), ip)) {
                return json({ error: 'rate-limited' }, 429, origin);
            }
            if (url.pathname === '/admission' && request.method === 'POST') {
                if (!config.turnstileRequired) return json({ error: 'not-found' }, 404, origin);
                if (!await allowedBy(binding(env, 'ADMISSION_RATE', config), ip)) {
                    return json({ error: 'rate-limited' }, 429, origin);
                }
                const raw = await limitedBody(request, 4 * 1024);
                if (!restrictedChinaAdmission) {
                    const challenge = await validateTurnstile(env, config, raw.token, ip);
                    if (!challenge.ok) return json({ error: challenge.error }, challenge.status, origin);
                }
                const expiresAt = Date.now() + config.admissionLifetimeMinutes * 60000;
                const admissionSubject = await hash(`admission:${ip}`);
                return json({
                    admission: await mintAdmission(env.ROOM_SECRET, expiresAt, admissionSubject),
                    expiresAt,
                    mode: restrictedChinaAdmission ? 'restricted' : 'turnstile'
                }, 201, origin);
            }
            if (url.pathname === '/rooms' && request.method === 'POST') {
                if (!await allowedBy(binding(env, 'CREATE_RATE', config), ip)) {
                    return json({ error: 'rate-limited' }, 429, origin);
                }
                const raw = await limitedBody(request, 128 * 1024);
                const doc = validateCatalogDocument(normalizeDocument(raw.doc));
                const admissionSubject = await hash(`admission:${ip}`);
                const admission = config.turnstileRequired
                    ? await verifyAdmission(env.ROOM_SECRET, raw.admission, Date.now(), admissionSubject)
                    : { id: admissionSubject.slice(0, 22) };
                if (!admission) return json({ error: 'invalid-admission' }, 403, origin);
                const budgetActor = restrictedChinaAdmission
                    ? (await hash(`china-admission:${ip}`)).slice(0, 22)
                    : admission.id;
                const budget = await env.BUDGET.getByName('daily-budget').grant(
                    'create',
                    budgetActor,
                    restrictedChinaAdmission ? config.maxRoomsPerChinaIpPerDay : undefined
                );
                if (!budget.amount) return json({
                    error: budget.reason === 'admission-limit'
                        ? 'admission-room-limit'
                        : 'daily-room-limit'
                }, 429, origin);
                const expiresAt = Date.now() + config.roomLifetimeHours * 3600000;
                const code = await mintInvite(env.ROOM_SECRET, expiresAt);
                const ownerKey = randomKey();
                const created = await env.ROOMS.getByName(code).create(doc, expiresAt, await hash(ownerKey));
                if (!created) return json({ error: 'create-failed' }, 503, origin);
                return json({ code, ownerKey, expiresAt, maxParticipants: config.maxParticipants }, 201, origin);
            }
            const match = url.pathname.match(/^\/rooms\/([^/]+)$/);
            if (match && request.method === 'GET') {
                if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') return json({ error: 'websocket-required' }, 426, origin);
                // Random scanners never instantiate DOs: invites are signed before lookup.
                if (!await verifyInvite(env.ROOM_SECRET, match[1])) return json({ error: 'invalid-invite' }, 404, origin);
                const joinKey = await hash(`${ip}:${match[1]}`);
                if (!await allowedBy(binding(env, 'JOIN_RATE', config), joinKey)) {
                    return json({ error: 'rate-limited' }, 429, origin);
                }
                return env.ROOMS.getByName(match[1]).fetch(request);
            }
            return json({ error: 'not-found' }, 404, origin);
        } catch (error) {
            const clientErrors = /^(bad-|too-|wrong-|duplicate-|outside-|room-too-large|unsupported-)/;
            return json({ error: clientErrors.test(error.message) ? error.message : 'unavailable' }, clientErrors.test(error.message) ? 400 : 503, origin);
        }
    }
};
