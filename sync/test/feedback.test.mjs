import test from 'node:test';
import assert from 'node:assert/strict';
import {
    normalizeFeedback,
    validDiscordWebhook,
    discordFeedbackPayload,
    deliverFeedback
} from '../src/feedback.mjs';

test('feedback normalization keeps only bounded safe metadata', () => {
    const result = normalizeFeedback({
        type: 'bug',
        message: '  map does not load\nplease check  ',
        contact: ' user@example.test ',
        page: '/ru/?secret=not-sent',
        language: 'ru',
        device: 'desktop-ui',
        viewport: '1920x1080',
        browser: 'Firefox',
        os: 'Windows',
        map: 'bakurani',
        weapon: 'sph-2',
        textSize: 'xl',
        largerControls: 'true',
        highContrast: 'false',
        version: '1.8.0'
    });
    assert.equal(result.message, 'map does not load\nplease check');
    assert.equal(result.contact, 'user@example.test');
    assert.equal(result.page, '/ru/');
    assert.equal(result.map, 'bakurani');
    assert.equal(result.browser, 'Firefox');
    assert.equal(result.os, 'Windows');
    assert.equal(result.textSize, 'xl');
    assert.equal(result.largerControls, 'true');
    assert.equal(result.highContrast, 'false');
    assert.equal(result.rating, null);
});

test('feedback rejects invalid types, empty messages, invalid ratings and honeypot submissions', () => {
    assert.throws(() => normalizeFeedback({ type: 'other', message: 'hello' }), /bad-feedback-type/);
    assert.throws(() => normalizeFeedback({ type: 'bug', message: 'x' }), /bad-feedback-message/);
    assert.throws(() => normalizeFeedback({ type: 'general', message: 'valid message' }), /bad-feedback-rating/);
    assert.throws(() => normalizeFeedback({ type: 'general', rating: 6, message: 'valid message' }), /bad-feedback-rating/);
    assert.throws(() => normalizeFeedback({ type: 'bug', message: 'valid message', website: 'spam.test' }), /spam/);
});

test('general feedback accepts a 1-5 rating and adds it to the Discord payload', () => {
    const feedback = normalizeFeedback({
        type: 'general',
        rating: 4,
        message: 'Really useful, but the mobile layout could be clearer.',
        page: '/mobile/',
        language: 'en'
    });

    assert.equal(feedback.rating, 4);

    const payload = discordFeedbackPayload(feedback);
    assert.equal(payload.embeds[0].title, '⭐ General feedback');
    assert.deepEqual(
        payload.embeds[0].fields.find(field => field.name === 'Rating'),
        { name: 'Rating', value: '★★★★☆ 4/5', inline: true }
    );
});

test('Discord webhook validation is strict and payload disables mentions', () => {
    assert.equal(validDiscordWebhook('https://discord.com/api/webhooks/123/token'), true);
    assert.equal(validDiscordWebhook('https://evil.test/api/webhooks/123/token'), false);
    assert.equal(validDiscordWebhook('http://discord.com/api/webhooks/123/token'), false);

    const payload = discordFeedbackPayload(normalizeFeedback({
        type: 'feature',
        message: '@everyone add a range preset',
        page: '/',
        language: 'en'
    }), 'a91f37c2b104');
    assert.deepEqual(payload.allowed_mentions, { parse: [] });
    assert.equal(payload.embeds[0].title, '💡 Feature request');
    assert.equal(payload.embeds[0].description, '@everyone add a range preset');
    assert.match(payload.embeds[0].footer.text, /sender a91f37c2b104$/);
});

test('development sink does not require a real Discord webhook', async () => {
    const feedback = normalizeFeedback({ type: 'bug', message: 'valid message' });
    assert.equal(
        await deliverFeedback({ FEEDBACK_DEV_SINK: 'true' }, { development: true }, feedback),
        true
    );
});

test('loading diagnostics are allowlisted, bounded and excluded from legacy reports', () => {
    const result = normalizeFeedback({ type: 'bug', message: 'The map will not load.',
        assetDiagnostics: { stage: 'asset-fetch', enabled: true, configuredMode: 'preclearance',
            sessionMode: 'standard', deliveryHost: 'assets-v2.wardogs-artillery.com', paused: true,
            automaticRetries: 2, token: 'PRIVATE_TOKEN', cookie: 'PRIVATE_COOKIE', ip: 'PRIVATE_IP',
            lastFailure: { stage: 'asset-fetch', code: 'network-or-cors', status: 403,
                cfRay: 'a456457d3a8f5535-LAX', mitigation: 'challenge',
                requestHost: 'assets-v2.wardogs-artillery.com', body: 'PRIVATE_BODY' } },
        tileDiagnostics: { cached: 20, loaded: 5, failed: 0, queued: 15, retrying: -5,
            activeRequests: 1e20, target: 'PRIVATE_COORDINATES' }
    });
    assert.equal(result.assetDiagnostics.lastFailure.cfRay, 'a456457d3a8f5535-LAX');
    assert.equal(result.tileDiagnostics.loaded, 5);
    assert.equal(result.tileDiagnostics.retrying, null);
    assert.equal(result.tileDiagnostics.activeRequests, null);
    assert.doesNotMatch(JSON.stringify(result), /PRIVATE_/);
    const payload = discordFeedbackPayload(result);
    assert.match(payload.embeds[0].fields.find(field => field.name === 'Asset access').value, /network-or-cors/);
    assert.match(payload.embeds[0].fields.find(field => field.name === 'Map loading').value, /loaded: 5/);
    const legacy = discordFeedbackPayload(normalizeFeedback({ type: 'bug', message: 'Legacy browser report' }));
    assert.ok(legacy.embeds[0].fields.every(field => !['Asset access', 'Map loading'].includes(field.name)));
});

test('invalid diagnostics cannot inject arbitrary hosts, codes, headers or Discord fields', () => {
    const result = normalizeFeedback({ type: 'bug', message: 'The map will not load.',
        assetDiagnostics: { stage: 'arbitrary-stage', deliveryHost: 'https://evil.test/?token=PRIVATE',
            automaticRetries: '9', lastFailure: { code: 'PRIVATE', cfRay: 'PRIVATE',
                status: 999, requestHost: 'PRIVATE', mitigation: 'PRIVATE' } },
        tileDiagnostics: ['PRIVATE']
    });
    assert.equal(result.assetDiagnostics.stage, '');
    assert.equal(result.assetDiagnostics.deliveryHost, '');
    assert.equal(result.assetDiagnostics.lastFailure.code, '');
    assert.equal(result.assetDiagnostics.lastFailure.cfRay, '');
    assert.equal(result.assetDiagnostics.lastFailure.status, null);
    assert.equal(result.tileDiagnostics, null);
    assert.doesNotMatch(JSON.stringify(discordFeedbackPayload(result)), /PRIVATE|evil\.test/);
});

test('a maximum length report with loading diagnostics fits Discord embed limits', () => {
    const raw = { type: 'general', rating: 5, message: 'x'.repeat(3800),
        assetDiagnostics: { stage: 'turnstile-challenge', configuredMode: 'preclearance',
            sessionMode: 'standard', deliveryHost: 'assets-v2.wardogs-artillery.com',
            automaticRetries: 1000000, lastFailure: { stage: 'turnstile-challenge',
                code: 'session-cookie-unavailable', status: 503,
                requestHost: 'assets-v2.wardogs-artillery.com', cfRay: 'a'.repeat(32) + '-LAX', mitigation: 'challenge' } },
        tileDiagnostics: Object.fromEntries(['cached', 'loaded', 'failed', 'queued', 'retrying', 'activeRequests']
            .map(key => [key, 1000000])) };
    for (const key of ['contact', 'language', 'device', 'viewport', 'browser', 'os', 'map',
        'mapStyle', 'weapon', 'textSize', 'largerControls', 'highContrast', 'version']) raw[key] = 'x'.repeat(200);
    raw.page = '/' + 'x'.repeat(200);
    const embed = discordFeedbackPayload(normalizeFeedback(raw), 'a'.repeat(12)).embeds[0];
    assert.ok(embed.fields.length <= 25);
    assert.ok(embed.fields.every(field => field.value.length <= 1024));
    const length = embed.title.length + embed.description.length + embed.footer.text.length +
        embed.fields.reduce((total, field) => total + field.name.length + field.value.length, 0);
    assert.ok(length <= 6000, `embed length ${length}`);
});
