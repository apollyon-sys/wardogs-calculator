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
        version: '1.8.0'
    });
    assert.equal(result.message, 'map does not load\nplease check');
    assert.equal(result.contact, 'user@example.test');
    assert.equal(result.page, '/ru/');
    assert.equal(result.map, 'bakurani');
    assert.equal(result.browser, 'Firefox');
    assert.equal(result.os, 'Windows');
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
    }));
    assert.deepEqual(payload.allowed_mentions, { parse: [] });
    assert.equal(payload.embeds[0].title, '💡 Feature request');
    assert.equal(payload.embeds[0].description, '@everyone add a range preset');
});

test('development sink does not require a real Discord webhook', async () => {
    const feedback = normalizeFeedback({ type: 'bug', message: 'valid message' });
    assert.equal(
        await deliverFeedback({ FEEDBACK_DEV_SINK: 'true' }, { development: true }, feedback),
        true
    );
});
