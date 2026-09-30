const TEXT_LIMIT = 3800;
const CONTACT_LIMIT = 160;
const SMALL_LIMIT = 160;

const encoder = new TextEncoder();

async function hmacHex(secret, value) {
    const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );
    const signature = await crypto.subtle.sign(
        'HMAC',
        key,
        encoder.encode(value)
    );
    return [...new Uint8Array(signature)]
        .map(byte => byte.toString(16).padStart(2, '0'))
        .join('');
}

export async function feedbackAbuseIdentity(env, config, ip, feedback) {
    const configured = String(env.FEEDBACK_ABUSE_SECRET || '');
    const secret = configured.length >= 32
        ? configured
        : config.development
            ? 'local-feedback-abuse-secret-change-me'
            : '';

    if (!secret) throw new Error('missing-feedback-abuse-secret');

    const canonicalMessage = String(feedback?.message || '')
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim();
    const senderHash = await hmacHex(secret, `sender:${ip}`);
    const messageHash = await hmacHex(secret, `message:${canonicalMessage}`);

    return {
        senderId: senderHash.slice(0, 12),
        messageDigest: messageHash
    };
}

export function feedbackSenderBlocked(env, senderId) {
    return String(env.FEEDBACK_BLOCKED_SENDERS || '')
        .split(/[\s,]+/)
        .filter(Boolean)
        .includes(senderId);
}

function clean(value, limit) {
    return String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, limit);
}

function cleanMessage(value) {
    return String(value ?? '')
        .replace(/\r\n?/g, '\n')
        .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, ' ')
        .trim()
        .slice(0, TEXT_LIMIT + 1);
}

export function normalizeFeedback(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('bad-feedback');
    if (clean(raw.website, 64)) throw new Error('spam');

    const type = clean(raw.type, 16);
    if (!['bug', 'feature', 'general'].includes(type)) throw new Error('bad-feedback-type');

    const message = cleanMessage(raw.message);
    if (message.length < 5) throw new Error('bad-feedback-message');
    if (message.length > TEXT_LIMIT) throw new Error('too-long-feedback');

    const rawRating = Number(raw.rating);
    const rating = type === 'general' && Number.isInteger(rawRating) && rawRating >= 1 && rawRating <= 5
        ? rawRating
        : null;
    if (type === 'general' && rating === null) throw new Error('bad-feedback-rating');

    const page = clean(raw.page, SMALL_LIMIT).split(/[?#]/, 1)[0];
    return {
        type,
        rating,
        message,
        contact: clean(raw.contact, CONTACT_LIMIT),
        page: page.startsWith('/') ? page : '',
        language: clean(raw.language, 16),
        device: clean(raw.device, 32),
        viewport: clean(raw.viewport, 32),
        browser: clean(raw.browser, 32),
        os: clean(raw.os, 32),
        map: clean(raw.map, 32),
        mapStyle: clean(raw.mapStyle, 32),
        weapon: clean(raw.weapon, 64),
        textSize: clean(raw.textSize, 16),
        largerControls: clean(raw.largerControls, 8),
        highContrast: clean(raw.highContrast, 8),
        version: clean(raw.version, 32)
    };
}

export function validDiscordWebhook(value) {
    try {
        const url = new URL(String(value || ''));
        return url.protocol === 'https:' &&
            url.hostname === 'discord.com' &&
            /^\/api\/webhooks\/[^/]+\/[^/]+\/?$/.test(url.pathname);
    } catch {
        return false;
    }
}

export function discordFeedbackPayload(feedback, senderId = '') {
    const rating = Number.isInteger(feedback.rating)
        ? `${'★'.repeat(feedback.rating)}${'☆'.repeat(5 - feedback.rating)} ${feedback.rating}/5`
        : '';

    const fields = [
        ['Rating', rating],
        ['Page', feedback.page],
        ['Language', feedback.language],
        ['UI', feedback.device],
        ['Viewport', feedback.viewport],
        ['Browser', feedback.browser],
        ['OS', feedback.os],
        ['Map', feedback.map],
        ['Map style', feedback.mapStyle],
        ['Weapon', feedback.weapon],
        ['Text size', feedback.textSize],
        ['Large controls', feedback.largerControls],
        ['High contrast', feedback.highContrast],
        ['Version', feedback.version],
        ['Contact', feedback.contact]
    ]
        .filter(([, value]) => value)
        .map(([name, value]) => ({ name, value, inline: true }));

    const titles = {
        bug: '🐛 Bug report',
        feature: '💡 Feature request',
        general: '⭐ General feedback'
    };

    return {
        username: 'WARDOGS Feedback',
        allowed_mentions: { parse: [] },
        embeds: [{
            title: titles[feedback.type] || 'Feedback',
            description: feedback.message,
            fields,
            timestamp: new Date().toISOString(),
            footer: {
                text: senderId
                    ? `wardogs-artillery.com · anonymous feedback · sender ${senderId}`
                    : 'wardogs-artillery.com · anonymous website feedback'
            }
        }]
    };
}

export async function deliverFeedback(env, config, feedback, senderId = '') {
    if (config.development && env.FEEDBACK_DEV_SINK === 'true') return true;
    if (!validDiscordWebhook(env.FEEDBACK_DISCORD_WEBHOOK_URL)) return false;

    try {
        const response = await fetch(env.FEEDBACK_DISCORD_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(discordFeedbackPayload(feedback, senderId))
        });
        return response.ok;
    } catch {
        return false;
    }
}
