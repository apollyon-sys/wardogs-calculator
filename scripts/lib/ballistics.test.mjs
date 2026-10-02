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

const deployedConfig = JSON.parse(await readFile(
    new URL('../../config/app.json', import.meta.url), 'utf8'
));

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
        APP_CONFIG: deployedConfig,
        S: {
            weapon: 'spg',
            origin: { x: 0, y: 0 },
            target: { x: 1, y: 0 }
        },
        WEAPONS: { spg: { id: 'spg' } }
    });
    vm.runInContext(weaponsSource, context);
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

test('SPH measured impact group is distinct from systematic range error', () => {
    const origin = { x: 94.37, y: 108.71 };
    const target = { x: 87.74, y: 95.69 };
    const impacts = [
        [87.58, 95.26],
        [87.40, 95.34],
        [87.50, 95.30],
        [87.49, 95.26],
        [87.65, 95.27],
        [87.41, 95.25]
    ];

    const mean = impacts.reduce(
        (sum, point) => ({
            x: sum.x + point[0] / impacts.length,
            y: sum.y + point[1] / impacts.length
        }),
        { x: 0, y: 0 }
    );

    const shotX = target.x - origin.x;
    const shotY = target.y - origin.y;
    const shotLength = Math.hypot(shotX, shotY);
    const alongX = shotX / shotLength;
    const alongY = shotY / shotLength;
    const errorX = (mean.x - target.x) * 100;
    const errorY = (mean.y - target.y) * 100;
    const rangeBias =
        errorX * alongX +
        errorY * alongY;
    const maximumRadius = Math.max(
        ...impacts.map(point => Math.hypot(
            (point[0] - mean.x) * 100,
            (point[1] - mean.y) * 100
        ))
    );

    assert.ok(Math.abs(rangeBias - 47.2) < 0.01);
    assert.ok(maximumRadius < 15);

    const context = platformContext();
    assert.equal(
        vm.runInContext(
            'sphPlatformDispersionRadiusMeters()',
            context
        ),
        25
    );
});

test('SPH dispersion overlay uses an approximate world-scaled 25 m radius', () => {
    const context = platformContext();
    const arcs = [];
    const labels = [];

    context.ctx = {
        save() {},
        restore() {},
        beginPath() {},
        arc(...args) { arcs.push(args); },
        fill() {},
        stroke() {},
        setLineDash() {},
        fillText(...args) { labels.push(args); }
    };
    context.worldToLocalScreen = () => ({ x: 40, y: 50 });
    context.metersToWorldDistance = meters => meters / 100;
    context.view = () => ({ scale: 100 });

    vm.runInContext(
        'sphPlatformLastHasHighSolution = true; drawSphDispersionOverlay()',
        context
    );

    assert.equal(arcs.length, 1);
    assert.equal(arcs[0][0], 40);
    assert.equal(arcs[0][1], 50);
    assert.equal(arcs[0][2], 25);
    assert.equal(labels[0][0], '≈25 m');

    vm.runInContext('sphPlatformSelectedArc = "low"; drawSphDispersionOverlay()', context);
    assert.equal(arcs.length, 1, 'LOW has no measured spread calibration');
    vm.runInContext(
        'sphPlatformSelectedArc = "high"; sphPlatformLastHasHighSolution = false; drawSphDispersionOverlay()',
        context
    );
    assert.equal(arcs.length, 1, 'unreachable HIGH has no landing circle');
});

test('MIL ranges preserve an ambiguous centre through additive correction and validation', () => {
    const context = platformContext();
    vm.runInContext(resultsSource, context);
    context.weapon = { minElevationMil: 20, maxElevationMil: 1390 };
    context.solution = { mil: null, minMil: 610, maxMil: 620 };
    const result = vm.runInContext(
        'sphPlatformAddMilDelta(solution, 2)', context
    );
    assert.equal(result.mil, null);
    assert.equal(result.minMil, 612);
    assert.equal(result.maxMil, 622);
    assert.equal(vm.runInContext('isElevationSolutionWithinWeaponLimits(weapon, solution)', context), true);

    context.solution.mil = NaN;
    assert.equal(vm.runInContext('isElevationSolutionWithinWeaponLimits(weapon, solution)', context), false);
    assert.equal(vm.runInContext('sphPlatformNormalizeDegrees(null)', context), null);
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
