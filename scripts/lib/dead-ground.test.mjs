import { test } from 'node:test';
import assert from 'node:assert/strict';

import { solveTan } from './ballistics.mjs';

import {
    deadGroundIntervals,
    grazingTan,
    isDeadGround,
    trajectoryHeight
} from './dead-ground.mjs';

const SPG_LOW_VELOCITY = 160.1;
const STEP = 25;
const SAMPLES = 96;

function profile(heightAt) {
    const rows = [];

    for (let i = 1; i <= SAMPLES; i += 1) {
        const range = i * STEP;

        rows.push([range, heightAt(range)]);
    }

    return rows;
}

function deadRanges(samples, muzzleVelocity = SPG_LOW_VELOCITY) {
    return samples
        .map((row, index) =>
            isDeadGround(muzzleVelocity, samples, index) ? row[0] : null
        )
        .filter(range => range !== null);
}

test('the trajectory passes through the point it was solved for', () => {
    const range = 1500;
    const deltaZ = -40;

    const tanTheta = solveTan(
        SPG_LOW_VELOCITY,
        range,
        deltaZ,
        'low'
    );

    const y = trajectoryHeight(SPG_LOW_VELOCITY, tanTheta, range);

    assert.ok(
        Math.abs(y - deltaZ) < 1e-6,
        `${y} should land on ${deltaZ}`
    );
});

test('flat ground has no dead ground anywhere', () => {
    const samples = profile(() => 0);

    assert.deepEqual(deadRanges(samples), []);
    assert.deepEqual(deadGroundIntervals(SPG_LOW_VELOCITY, samples), []);
});

const RIDGE = profile(range => (range === 600 ? 200 : 0));

test('a ridge marks the ground behind it dead', () => {
    const dead = deadRanges(RIDGE);

    assert.ok(dead.length > 0, 'the ridge should mask something');
    assert.ok(
        dead.every(range => range > 600),
        `nothing up to the crest is dead, got ${dead.slice(0, 3)}`
    );
    assert.ok(
        dead.includes(1500),
        'the far side of the ridge is masked'
    );
});

test('the crest itself is reachable', () => {
    const index = RIDGE.findIndex(row => row[0] === 600);

    assert.equal(isDeadGround(SPG_LOW_VELOCITY, RIDGE, index), false);
});

test('a ridge produces one bounded dead interval', () => {
    const intervals = deadGroundIntervals(SPG_LOW_VELOCITY, RIDGE);

    assert.equal(intervals.length, 1);
    assert.ok(intervals[0][0] > 600);
    assert.ok(intervals[0][1] > intervals[0][0]);
    assert.ok(
        intervals[0][1] < SAMPLES * STEP,
        'a flat arc clears the crest again further out'
    );
});

test('a gun on a summit sees no dead ground below it', () => {
    const samples = profile(range => -range * 0.05);

    assert.deepEqual(deadRanges(samples), []);
});

test('a taller clearance requirement only ever removes dead ground', () => {
    const strict = deadGroundIntervals(SPG_LOW_VELOCITY, RIDGE, 0);
    const loose = deadGroundIntervals(SPG_LOW_VELOCITY, RIDGE, 50);

    assert.ok(loose[0][0] >= strict[0][0]);
});

test('the running maximum agrees with the direct test', () => {
    let seed = 20260830;

    const random = () => {
        seed = (seed * 1103515245 + 12345) % 2147483648;

        return seed / 2147483648;
    };

    for (let trial = 0; trial < 60; trial += 1) {
        let z = 0;

        const samples = profile(() => {
            z += (random() - 0.5) * 40;

            return z;
        });

        const direct = [];
        let runStart = -1;

        for (let i = 0; i < samples.length; i += 1) {
            const dead = isDeadGround(SPG_LOW_VELOCITY, samples, i);

            if (dead && runStart < 0) {
                runStart = i;
            }

            if (!dead && runStart >= 0) {
                direct.push([runStart, i - 1]);
                runStart = -1;
            }
        }

        if (runStart >= 0) {
            direct.push([runStart, samples.length - 1]);
        }

        const fast = deadGroundIntervals(SPG_LOW_VELOCITY, samples);

        assert.equal(
            fast.length,
            direct.length,
            `trial ${trial} interval count`
        );

        fast.forEach(([start, end], index) => {
            const [a, b] = direct[index];

            assert.ok(start <= samples[a][0]);
            assert.ok(end >= samples[b][0]);
        });
    }
});

test('a crest above the ballistic ceiling masks everything past it', () => {
    assert.equal(grazingTan(SPG_LOW_VELOCITY, 500, 100000), Infinity);
    assert.equal(grazingTan(SPG_LOW_VELOCITY, 0, 0), null);
});

test('unreachable ground is not dead ground', () => {
    const samples = profile(() => 5000);

    assert.deepEqual(deadRanges(samples), []);
    assert.deepEqual(deadGroundIntervals(SPG_LOW_VELOCITY, samples), []);
});

test('degenerate inputs do not throw', () => {
    assert.deepEqual(deadGroundIntervals(SPG_LOW_VELOCITY, []), []);
    assert.deepEqual(deadGroundIntervals(SPG_LOW_VELOCITY, null), []);
    assert.deepEqual(deadGroundIntervals(0, profile(() => 0)), []);
    assert.deepEqual(
        deadGroundIntervals(Number.NaN, profile(() => 0)),
        []
    );
    assert.equal(isDeadGround(SPG_LOW_VELOCITY, [], 0), false);
    assert.equal(trajectoryHeight(0, 1, 10), null);
});
