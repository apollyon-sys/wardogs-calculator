/*
 * Exercises the vacuum trajectory solver on values checked by hand, so a
 * regression here can be told apart from a regression in the fit that
 * supplies its parameters.
 *
 * Run with: npm run test:scripts
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
    GRAVITY,
    maxRangeMeters,
    milCorrection,
    milFromTan,
    missMeters,
    rangeForTan,
    solveTan
} from './ballistics.mjs';

/* Fitted from data/weapons.json; see the design doc section 4. */
const SPG_HIGH = {
    branch: 'high',
    muzzleVelocity: 160.4,
    angleOffsetDeg: 14.5,
    anglePerMilDeg: 0.048
};

const MORTAR = {
    branch: 'high',
    muzzleVelocity: 86.7,
    angleOffsetDeg: 52.5,
    anglePerMilDeg: 0.0375
};

const SPG_LOW = {
    branch: 'low',
    muzzleVelocity: 160.1,
    angleOffsetDeg: 12.75,
    anglePerMilDeg: 0.058
};

const close = (actual, expected, tolerance = 1e-6) =>
    assert.ok(
        Math.abs(actual - expected) <= tolerance,
        `${actual} is not within ${tolerance} of ${expected}`
    );

test('gravity is 9.81', () => {
    assert.equal(GRAVITY, 9.81);
});

test('45 degrees gives the vacuum maximum range', () => {
    close(rangeForTan(100, 1), 10000 / 9.81, 1e-9);
});

test('both branches converge at the 45 degree apex', () => {
    const apex = rangeForTan(100, 1);

    close(solveTan(100, apex, 0, 'high'), 1, 1e-9);
    close(solveTan(100, apex, 0, 'low'), 1, 1e-9);
});

test('solveTan round-trips through rangeForTan', () => {
    const t = solveTan(160.4, 1800, 0, 'high');

    close(rangeForTan(160.4, t), 1800, 1e-6);
});

test('a target above the trajectory ceiling is unreachable', () => {
    assert.equal(solveTan(100, rangeForTan(100, 1), 5000, 'high'), null);
});

test('milFromTan inverts the affine mil mapping', () => {
    const t = Math.tan((14.5 + 0.048 * 700) * Math.PI / 180);

    close(milFromTan(SPG_HIGH, t), 700, 1e-6);
});

test('flat ground needs exactly zero correction', () => {
    assert.equal(milCorrection(SPG_HIGH, 1800, 0), 0);
    assert.equal(milCorrection(MORTAR, 400, 0), 0);
});

test('uphill lowers mil on a high-branch arc', () => {
    close(milCorrection(SPG_HIGH, 1800, 100), -13.277571, 1e-5);
    close(milCorrection(MORTAR, 400, 100), -39.962229, 1e-5);
});

test('downhill raises mil on a high-branch arc', () => {
    close(milCorrection(SPG_HIGH, 1800, -100), 11.717212, 1e-5);
});

/*
 * These two reproduce the research doc's miss table, which was computed
 * independently with the dZ/tan(theta) approximation.
 */
test('miss distance matches the researched figures', () => {
    close(missMeters(SPG_HIGH, 1800, 100), 40.652596, 1e-5);
    close(missMeters(MORTAR, 400, 100), 30.498268, 1e-5);
});

test('short-range mortar miss falls under the suppression threshold', () => {
    assert.ok(missMeters(MORTAR, 200, 25) < 10);
});

/*
 * The low arc at 1181 m peaks 71 m above the muzzle, so a target 100 m
 * higher is not on the trajectory at any range.
 */
test('a low arc cannot reach above its own apex', () => {
    assert.equal(missMeters(SPG_LOW, 1181, 100), null);
});

import { fitArc } from './ballistics.mjs';

/*
 * A table generated FROM the model must fit back to the model's own
 * parameters. This is the only test of fitArc that does not depend on the
 * shipped tables, so it isolates the search from the data.
 */
test('fitArc recovers parameters from a synthetic table', () => {
    const truth = {
        muzzleVelocity: 160,
        angleOffsetDeg: 14.5,
        anglePerMilDeg: 0.048
    };

    const rows = [];

    for (let mil = 700; mil <= 1300; mil += 10) {
        const deg = truth.angleOffsetDeg + truth.anglePerMilDeg * mil;
        const t = Math.tan(deg * Math.PI / 180);

        rows.push([Math.round(rangeForTan(truth.muzzleVelocity, t)), mil]);
    }

    const fit = fitArc(rows, 'high');

    assert.ok(fit.rmsMeters < 1, `RMS ${fit.rmsMeters} should be under 1 m`);
    close(fit.angleOffsetDeg, truth.angleOffsetDeg, 0.3);
    close(fit.anglePerMilDeg, truth.anglePerMilDeg, 0.001);
    close(fit.muzzleVelocity, truth.muzzleVelocity, 1);
});

test('fitArc reports the branch it was given', () => {
    const rows = [[1181, 20], [1232, 30], [1283, 40]];

    assert.equal(fitArc(rows, 'low').branch, 'low');
});

test('maxRangeMeters on the level is v squared over g', () => {
    close(
        maxRangeMeters(SPG_HIGH.muzzleVelocity, 0),
        SPG_HIGH.muzzleVelocity ** 2 / GRAVITY,
        1e-9
    );
});

test('maxRangeMeters lengthens downhill and shortens uphill', () => {
    const level = maxRangeMeters(SPG_HIGH.muzzleVelocity, 0);

    assert.ok(maxRangeMeters(SPG_HIGH.muzzleVelocity, -200) > level);
    assert.ok(maxRangeMeters(SPG_HIGH.muzzleVelocity, 200) < level);
});

/*
 * The whole design rests on these being the same boundary: solveTan returns
 * null exactly where maxRangeMeters says the range ran out.
 */
test('maxRangeMeters is the boundary solveTan refuses to cross', () => {
    for (const deltaZ of [-400, -100, 0, 100, 300]) {
        const limit = maxRangeMeters(SPG_HIGH.muzzleVelocity, deltaZ);

        assert.ok(
            solveTan(SPG_HIGH.muzzleVelocity, limit * 0.999, deltaZ, 'high') !== null,
            `inside the limit at deltaZ ${deltaZ} should solve`
        );

        assert.equal(
            solveTan(SPG_HIGH.muzzleVelocity, limit * 1.001, deltaZ, 'high'),
            null,
            `outside the limit at deltaZ ${deltaZ} should not solve`
        );
    }
});

test('maxRangeMeters returns null above the ballistic ceiling', () => {
    const ceiling = SPG_HIGH.muzzleVelocity ** 2 / (2 * GRAVITY);

    assert.equal(maxRangeMeters(SPG_HIGH.muzzleVelocity, ceiling + 1), null);
});

test('maxRangeMeters rejects unusable input', () => {
    assert.equal(maxRangeMeters(0, 0), null);
    assert.equal(maxRangeMeters(160, NaN), null);
});
