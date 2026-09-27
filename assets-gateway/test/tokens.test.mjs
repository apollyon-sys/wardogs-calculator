import assert from 'node:assert/strict';
import test from 'node:test';

import {
    mintSession,
    verifySession
} from '../src/tokens.mjs';

const secret =
    'test-secret-with-at-least-thirty-two-characters';

test('asset sessions are signed, expiring and subject-bound', async () => {
    const now = Date.now();
    const subject = '192.0.2.10\nTest Browser';
    const token =
        await mintSession(
            secret,
            now + 60000,
            'standard',
            subject
        );

    const session =
        await verifySession(
            secret,
            token,
            subject,
            now
        );

    assert.equal(session.mode, 'standard');
    assert.equal(session.expiresAt, now + 60000);
    assert.equal(session.id.length, 22);

    assert.equal(
        await verifySession(
            secret,
            token,
            '198.51.100.20\nTest Browser',
            now
        ),
        null
    );

    assert.equal(
        await verifySession(
            secret,
            token,
            subject,
            now + 60001
        ),
        null
    );
});

test('restricted sessions retain their lower-trust mode', async () => {
    const now = Date.now();
    const token =
        await mintSession(
            secret,
            now + 60000,
            'restricted',
            'subject'
        );

    const session =
        await verifySession(
            secret,
            token,
            'subject',
            now
        );

    assert.equal(session.mode, 'restricted');
});
