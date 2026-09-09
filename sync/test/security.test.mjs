import test from 'node:test';
import assert from 'node:assert/strict';
import { settings } from '../src/config.mjs';
import { validateTurnstile, usesRestrictedChinaAdmission } from '../src/admission.mjs';

const production = {
    turnstileRequired: true,
    turnstileHostname: 'wardogs-artillery.com',
    turnstileAction: 'create-lobby',
    turnstileMainlandChinaFallback: true
};

test('production and local origins stay in separate trust sets', () => {
    const prod = settings({});
    assert.deepEqual(prod.allowedOrigins, ['https://wardogs-artillery.com']);
    assert.equal(prod.turnstileRequired, true);

    const development = settings({ LOBBIES_DEV: 'true' });
    assert.equal(development.allowedOrigins.includes('http://localhost:8000'), true);
    assert.equal(development.allowedOrigins.includes('http://127.0.0.1:8000'), true);
    assert.equal(development.turnstileRequired, false);
});

test('Mainland China fallback is explicit and never inferred from locale', () => {
    assert.equal(usesRestrictedChinaAdmission(production, 'CN'), true);
    assert.equal(usesRestrictedChinaAdmission(production, 'cn'), true);
    assert.equal(usesRestrictedChinaAdmission(production, 'HK'), false);
    assert.equal(usesRestrictedChinaAdmission(production, 'US'), false);
    assert.equal(usesRestrictedChinaAdmission(
        { ...production, turnstileMainlandChinaFallback: false },
        'CN'
    ), false);
    assert.equal(usesRestrictedChinaAdmission(
        { ...production, turnstileRequired: false },
        'CN'
    ), false);
});

test('Turnstile fails closed when the secret or response is absent', async () => {
    assert.deepEqual(
        await validateTurnstile({}, production, 'token', '192.0.2.1'),
        { ok: false, error: 'turnstile-not-configured', status: 503 }
    );
    assert.deepEqual(
        await validateTurnstile({ TURNSTILE_SECRET: 'secret' }, production, '', '192.0.2.1'),
        { ok: false, error: 'challenge-required', status: 403 }
    );
    assert.deepEqual(
        await validateTurnstile(
            { TURNSTILE_SECRET: 'secret' },
            { ...production, turnstileHostname: '' },
            'token',
            '192.0.2.1'
        ),
        { ok: false, error: 'turnstile-not-configured', status: 503 }
    );
});

test('Turnstile verifies success, hostname and action server-side', async t => {
    const originalFetch = globalThis.fetch;
    t.after(() => { globalThis.fetch = originalFetch; });
    let result = {
        success: true,
        hostname: 'wardogs-artillery.com',
        action: 'create-lobby'
    };
    globalThis.fetch = async (_url, options) => {
        const body = JSON.parse(options.body);
        assert.equal(body.secret, 'secret');
        assert.equal(body.response, 'browser-token');
        assert.equal(body.remoteip, '192.0.2.1');
        return new Response(JSON.stringify(result), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    };

    assert.deepEqual(
        await validateTurnstile({ TURNSTILE_SECRET: 'secret' }, production, 'browser-token', '192.0.2.1'),
        { ok: true }
    );

    result = { ...result, hostname: 'some-fork.example' };
    assert.deepEqual(
        await validateTurnstile({ TURNSTILE_SECRET: 'secret' }, production, 'browser-token', '192.0.2.1'),
        { ok: false, error: 'challenge-failed', status: 403 }
    );

    result = { ...result, hostname: 'wardogs-artillery.com', action: 'other-action' };
    assert.deepEqual(
        await validateTurnstile({ TURNSTILE_SECRET: 'secret' }, production, 'browser-token', '192.0.2.1'),
        { ok: false, error: 'challenge-failed', status: 403 }
    );
});
