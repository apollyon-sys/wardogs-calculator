import assert from 'node:assert/strict';
import test from 'node:test';

import {
    evaluateAssetBudget
} from '../src/asset-request-guard.mjs';

const limits = {
    windowSeconds: 3600,
    sessionPoints: 3,
    ipPoints: 6,
    sessionTerrain: 2,
    ipTerrain: 4,
    strikeMemorySeconds: 604800
};

function request(
    sessionId,
    number,
    options = {}
) {
    return {
        sessionId,
        assetKey:
            number.toString(16)
                .padStart(24, '0'),
        category: options.category || 'tile',
        weight: options.weight || 1
    };
}

test('duplicate asset requests do not consume the unique budget twice', () => {
    const first = evaluateAssetBudget(
        null,
        request('session-a', 1),
        limits,
        1000
    );

    const repeated = evaluateAssetBudget(
        first.state,
        request('session-a', 1),
        limits,
        2000
    );

    assert.equal(repeated.decision.allowed, true);
    assert.equal(repeated.changed, false);
    assert.equal(repeated.state.ipPoints, 1);
    assert.equal(
        repeated.state.sessions['session-a'].points,
        1
    );
});

test('all asset classes share a session budget', () => {
    let state = null;
    let result;

    for (let number = 1; number <= 4; number++) {
        result = evaluateAssetBudget(
            state,
            request('session-a', number),
            limits,
            number * 1000
        );
        state = result.state;
    }

    assert.equal(result.decision.allowed, false);
    assert.equal(
        result.decision.reason,
        'session-assets'
    );
    assert.equal(result.decision.holdSeconds, 600);
    assert.equal(result.decision.scope, 'session');
    assert.equal(result.decision.strikeLevel, 1);
});

test('terrain has a stricter unique-file ceiling', () => {
    let state = null;
    let result;

    for (let number = 1; number <= 3; number++) {
        result = evaluateAssetBudget(
            state,
            request(
                'session-a',
                number,
                {
                    category: 'terrain',
                    weight: 1
                }
            ),
            limits,
            number * 1000
        );
        state = result.state;
    }

    assert.equal(result.decision.allowed, false);
    assert.equal(
        result.decision.reason,
        'session-terrain'
    );
});

test('IP budget aggregates unique assets across replacement sessions', () => {
    let state = null;
    let result;

    for (let number = 1; number <= 7; number++) {
        result = evaluateAssetBudget(
            state,
            request(
                `session-${number}`,
                number
            ),
            limits,
            number * 1000
        );
        state = result.state;
    }

    assert.equal(result.decision.allowed, false);
    assert.equal(
        result.decision.reason,
        'ip-assets'
    );
});

test('repeat violations escalate without extending an active hold', () => {
    let state = null;
    const sessionLimits = { ...limits, ipPoints: 100 };

    for (let number = 1; number <= 4; number++) {
        state = evaluateAssetBudget(
            state,
            request('session-a', number),
            sessionLimits,
            number * 1000
        ).state;
    }

    const held = evaluateAssetBudget(
        state,
        request('session-a', 5),
        sessionLimits,
        5000
    );

    assert.equal(held.decision.reason, 'held');
    assert.equal(held.decision.strikeLevel, 1);

    let afterExpiry;
    state = held.state;

    for (let number = 6; number <= 9; number++) {
        afterExpiry = evaluateAssetBudget(
            state,
            request('session-a', number),
            sessionLimits,
            605000 + number
        );
        state = afterExpiry.state;
    }

    assert.equal(afterExpiry.decision.allowed, false);
    assert.equal(afterExpiry.decision.holdSeconds, 21600);
    assert.equal(afterExpiry.decision.strikeLevel, 2);
});

test('one excessive session does not hold a neighbour sharing the address', () => {
    let state = null;
    for (let number = 1; number <= 4; number++) {
        state = evaluateAssetBudget(state, request('session-a', number), limits, 1000 + number).state;
    }
    const neighbour = evaluateAssetBudget(state, request('session-b', 1), limits, 2000);
    assert.equal(neighbour.decision.allowed, true);
    const held = evaluateAssetBudget(state, request('session-a', 1), limits, 2000);
    assert.equal(held.decision.allowed, false);
    assert.equal(held.decision.scope, 'session');
    assert.equal(state.ipPoints, 4, 'session penalties do not erase the address budget');
});

test('address exhaustion waits for the window without escalating day or week bans', () => {
    let state = null;
    let result;
    for (let number = 1; number <= 7; number++) {
        result = evaluateAssetBudget(state, request(`session-${number}`, number), limits, 1000 + number);
        state = result.state;
    }
    assert.equal(result.decision.scope, 'address');
    assert.equal(result.decision.strikeLevel, 0);
    const held = evaluateAssetBudget(state, request('neighbour', 1), limits, 2000);
    assert.equal(held.decision.allowed, false);
    assert.equal(held.decision.strikeLevel, 0);
    const resumed = evaluateAssetBudget(state, request('neighbour', 1), limits, 3601001);
    assert.equal(resumed.decision.allowed, true);
});

test('policy migration retains usage and retires the old address-wide escalating hold', () => {
    const initial = evaluateAssetBudget(null, request('session-a', 1), limits, 1000).state;
    delete initial.policyVersion;
    initial.blockedUntil = 604800000;
    initial.strikeLevel = 3;
    const migrated = evaluateAssetBudget(initial, request('session-a', 2), limits, 2000);
    assert.equal(migrated.decision.allowed, true);
    assert.equal(migrated.state.ipPoints, 2);
    assert.equal(migrated.state.sessions['session-a'].points, 2);
    assert.equal(migrated.state.policyVersion, 2);
});
