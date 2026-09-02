/*
 * Grid geometry and sampling for the baked heightfield. The runtime mirrors
 * sampleGrid in js/map/heightfield.js; if these two drift, the range ring and
 * the generator describe different ground.
 *
 * Run with: npm run test:scripts
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
    METRES_PER_GAME_UNIT,
    dequantise,
    gridGeometry,
    quantise,
    sampleGrid
} from './heightfield.mjs';

const BAKURANI = { minX: 23.35, maxX: 133.6, minY: 19.34, maxY: 129.65 };

function close(actual, expected, tolerance) {
    assert.ok(
        Math.abs(actual - expected) <= tolerance,
        `${actual} should be within ${tolerance} of ${expected}`
    );
}

test('gridGeometry covers the bounds at the requested spacing', () => {
    const g = gridGeometry(BAKURANI, 32);

    assert.equal(g.width, 346);
    assert.equal(g.height, 346);
    assert.equal(g.originX, BAKURANI.minX);
    assert.equal(g.originY, BAKURANI.minY);
    close(g.stepGameUnits, 32 / METRES_PER_GAME_UNIT, 1e-12);

    /* The last node must sit on or past the far edge, never short of it. */
    assert.ok(g.originX + (g.width - 1) * g.stepGameUnits >= BAKURANI.maxX);
    assert.ok(g.originY + (g.height - 1) * g.stepGameUnits >= BAKURANI.maxY);
});

test('quantise round-trips inside one step of the range', () => {
    const minZ = -1006.55;
    const maxZ = 74.85;
    const step = (maxZ - minZ) / 65535;

    for (const z of [minZ, -800, -500.25, 0, 74.85]) {
        close(dequantise(quantise(z, minZ, maxZ), minZ, maxZ), z, step);
    }
});

test('quantise clamps out-of-range input to the endpoints', () => {
    assert.equal(quantise(-2000, -1000, 0), 0);
    assert.equal(quantise(500, -1000, 0), 65535);
});

test('sampleGrid returns node values exactly', () => {
    const field = {
        heights: [0, 10, 20, 30],
        width: 2,
        height: 2,
        originX: 0,
        originY: 0,
        stepGameUnits: 1
    };

    close(sampleGrid(field, 0, 0), 0, 1e-12);
    close(sampleGrid(field, 1, 0), 10, 1e-12);
    close(sampleGrid(field, 0, 1), 20, 1e-12);
    close(sampleGrid(field, 1, 1), 30, 1e-12);
});

test('sampleGrid interpolates bilinearly between nodes', () => {
    const field = {
        heights: [0, 10, 20, 30],
        width: 2,
        height: 2,
        originX: 0,
        originY: 0,
        stepGameUnits: 1
    };

    close(sampleGrid(field, 0.5, 0), 5, 1e-12);
    close(sampleGrid(field, 0, 0.5), 10, 1e-12);
    close(sampleGrid(field, 0.5, 0.5), 15, 1e-12);
});

test('sampleGrid returns null outside the grid', () => {
    const field = {
        heights: [0, 10, 20, 30],
        width: 2,
        height: 2,
        originX: 0,
        originY: 0,
        stepGameUnits: 1
    };

    assert.equal(sampleGrid(field, -0.001, 0), null);
    assert.equal(sampleGrid(field, 0, 1.001), null);
    assert.equal(sampleGrid(field, NaN, 0), null);
});
