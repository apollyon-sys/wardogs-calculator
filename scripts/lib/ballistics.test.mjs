import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const weaponsSource = await readFile(
    new URL('../../js/features/weapons.js', import.meta.url),
    'utf8'
);

const platformSource = await readFile(
    new URL(
        '../../js/features/experimental-sph-platform-correction.js',
        import.meta.url
    ),
    'utf8'
);

const resultsSource = await readFile(
    new URL('../../js/features/results.js', import.meta.url),
    'utf8'
);

function weaponsContext() {
    const context = vm.createContext({ console });
    vm.runInContext(weaponsSource, context);
    return context;
}

function interpolate(context, table, distance) {
    context.table = table;
    context.distance = distance;
    return vm.runInContext(
        'interpolateBallisticTable(table, distance)',
        context
    );
}

test('ballistic interpolation handles exact, linear and unsupported distances', () => {
    const context = weaponsContext();
    const table = [[100, 800], [200, 700], [300, 600]];

    assert.equal(interpolate(context, table, 200).mil, 700);
    assert.equal(interpolate(context, table, 250).mil, 650);
    assert.equal(interpolate(context, table, 99), null);
    assert.equal(interpolate(context, table, 301), null);
});

test('duplicate ballistic distances remain a bounded MIL range', () => {
    const context = weaponsContext();
    const result = interpolate(
        context,
        [[100, 800], [200, 610], [200, 620]],
        200
    );

    assert.equal(result.mil, null);
    assert.equal(result.minMil, 610);
    assert.equal(result.maxMil, 620);
});

function platformContext() {
    const context = vm.createContext({
        console,
        S: {
            weapon: 'spg',
            origin: { x: 0, y: 0 },
            target: { x: 1, y: 0 }
        },
        WEAPONS: { spg: { id: 'spg' } }
    });
    vm.runInContext(platformSource, context);
    return context;
}

test('SPH arc selection does not depend on hull correction', () => {
    const context = platformContext();
    context.solutions = {
        inRange: true,
        low: { mil: 400, minMil: 400, maxMil: 400 },
        high: { mil: 700, minMil: 700, maxMil: 700 }
    };

    const result = vm.runInContext(
        'sphPlatformHullHeadingDeg = null; sphPlatformSelectArcSolutions(solutions)',
        context
    );

    assert.equal(result.low, null);
    assert.equal(result.high.mil, 700);

    const low = vm.runInContext(
        'sphPlatformSelectedArc = "low"; sphPlatformSelectArcSolutions(solutions)',
        context
    );

    assert.equal(low.low.mil, 400);
    assert.equal(low.high, null);
});

test('platform correction keeps the reference heading stable', () => {
    const context = platformContext();
    const reference = vm.runInContext(
        'sphPlatformHullHeadingDeg = 90; sphPlatformCorrectAim(700, 90)',
        context
    );
    const perpendicular = vm.runInContext(
        'sphPlatformHullHeadingDeg = 0; sphPlatformCorrectAim(700, 90)',
        context
    );

    assert.ok(Math.abs(reference.milDelta) < 1e-9);
    assert.ok(Math.abs(perpendicular.correctedMil - 783.4541998092665) < 1e-9);
});

test('platform runtime does not monkey-patch result globals', () => {
    assert.doesNotMatch(
        platformSource,
        /\bresolveElevationSolutions\s*=\s*function\b/
    );
    assert.doesNotMatch(
        platformSource,
        /\bresult\s*=\s*function\b/
    );
    assert.match(platformSource, /registerElevationSolutionTransform/);
    assert.match(platformSource, /registerResultRenderHook/);
});

test('platform azimuth can resolve non-current saved-target points', () => {
    const context = platformContext();
    context.origin = { x: 10, y: 10 };
    context.target = { x: 11, y: 10 };

    const azimuth = vm.runInContext(
        'sphPlatformGetTargetAzimuth(origin, target)',
        context
    );

    assert.equal(azimuth, 90);
});

test('post-transform validation rejects unreachable MIL commands', () => {
    const context = vm.createContext({ console });
    vm.runInContext(resultsSource, context);
    context.weapon = {
        minElevationMil: 20,
        maxElevationMil: 1390
    };
    context.solutions = {
        inRange: true,
        single: null,
        low: {
            mil: 400,
            minMil: 400,
            maxMil: 400
        },
        high: {
            mil: 1403,
            minMil: 1403,
            maxMil: 1403
        }
    };

    const result = vm.runInContext(
        'validateElevationSolutions(weapon, solutions)',
        context
    );

    assert.equal(result.low.mil, 400);
    assert.equal(result.high, null);
});
