import assert from 'node:assert/strict';
import test from 'node:test';

import {
    settings
} from '../src/config.mjs';

test('production trusts only explicitly configured application origins', () => {
    const config = settings({
        ALLOWED_ORIGINS:
            'https://wardogs-artillery.com',
        DEVELOPMENT_ORIGINS:
            'http://localhost:8000',
        FALLBACK_COUNTRIES: 'CN,RU'
    });

    assert.deepEqual(
        config.allowedOrigins,
        ['https://wardogs-artillery.com']
    );
    assert.equal(config.development, false);
    assert.equal(config.fallbackCountries.has('CN'), true);
    assert.equal(config.fallbackCountries.has('RU'), true);
});

test('local origins are added only by an explicit development flag', () => {
    const config = settings({
        ASSETS_DEV: 'true',
        DEVELOPMENT_ORIGINS:
            'http://localhost:8000,http://127.0.0.1:8000'
    });

    assert.equal(
        config.allowedOrigins.includes(
            'http://localhost:8000'
        ),
        true
    );
    assert.equal(
        config.allowedOrigins.includes(
            'http://127.0.0.1:8000'
        ),
        true
    );
});
