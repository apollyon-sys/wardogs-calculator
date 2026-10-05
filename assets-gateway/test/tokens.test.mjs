import assert from 'node:assert/strict';
import test from 'node:test';

import {
    mintSession,
    sessionSubject,
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

test('recoverable cookies require admission to rebind an address and keep their budget identity', async () => {
    const now = Date.now();
    const subject = '192.0.2.10\nTest Browser';
    const moved = '198.51.100.20\nTest Browser';
    const budgetActor = '0123456789abcdef';
    const token = await mintSession(secret, now + 60000, 'restricted', subject, { budgetActor });
    const verify = (value, requestSubject, when = now, options = {}) =>
        verifySession(secret, value, requestSubject, when, { ...options, assetSession: true });
    assert.equal(await verifySession(secret, token, subject, now), null,
        'asset cookies are not valid for other session purposes');
    const initial = await verify(token, subject);

    assert.equal(initial.addressMatches, true);
    assert.equal(await verify(token, moved), null);
    const admitted = await verify(token, moved, now, { allowAddressChange: true });
    assert.equal(admitted.addressMatches, false);
    assert.equal(admitted.id, initial.id);
    assert.equal(admitted.budgetActor, budgetActor);

    const rebound = await mintSession(secret, now + 60000, 'restricted', moved, admitted);
    const continued = await verify(rebound, moved);
    assert.equal(continued.addressMatches, true);
    assert.equal(continued.id, initial.id);
    assert.equal(continued.budgetActor, budgetActor);
    assert.equal(await verify(rebound, subject), null);

    assert.equal(await verify(token, '198.51.100.20\nOther Browser', now,
        { allowAddressChange: true }), null);
    assert.equal(await verify(token, moved, now + 60001,
        { allowAddressChange: true }), null);
    assert.equal(await verify(token.replace(budgetActor, 'fedcba9876543210'), moved, now,
        { allowAddressChange: true }), null);
});

test('recoverable identities cannot be supplied with unsigned or malformed actor data', async () => {
    const subject = sessionSubject(new Request('https://assets.example', {
        headers: { 'CF-Connecting-IP': '192.0.2.10', 'User-Agent': 'Test Browser' }
    }));
    await assert.rejects(mintSession(secret, Date.now() + 60000, 'restricted', subject,
        { budgetActor: 'forged-actor' }), /invalid-session-identity/);
    await assert.rejects(mintSession(secret, Date.now() + 60000, 'restricted', subject,
        { budgetActor: '0123456789abcdef', id: 'forged-id' }), /invalid-session-identity/);
});
