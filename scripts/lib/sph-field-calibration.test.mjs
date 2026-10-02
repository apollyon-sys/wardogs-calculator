import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
import test from 'node:test';
import vm from 'node:vm';

const root = new URL('../../', import.meta.url);
const files = [
    'js/features/weapons.js', 'js/features/results.js',
    'js/features/experimental-sph-platform-correction.js',
    'js/features/experimental-terrain-correction.js',
    'data/weapons.json', 'config/app.json', 'data/ballistics/terrain-context.json',
    'data/ballistics/terrain-correction/low-main.json',
    'data/ballistics/terrain-correction/low-tail-apex.json',
    'data/ballistics/terrain-correction/high-v2.json'
];
const source = new Map(await Promise.all(files.map(async path => [
    path, await readFile(new URL(path, root), 'utf8')
])));
const field = JSON.parse(await readFile(
    new URL('../fixtures/sph-field-2026-10-02.json', import.meta.url), 'utf8'
));
const rawWeapon = JSON.parse(source.get('data/weapons.json')).weapons.find(w => w.id === 'spg');
const weapon = { ...rawWeapon, minRange: rawWeapon.minRangeKm, maxRange: rawWeapon.maxRangeKm };
const settings = JSON.parse(source.get('config/app.json'));

async function runtime({ enabled = true } = {}) {
    const config = structuredClone(settings);
    config.features.sphPlatformCorrection.highArcCalibration.enabled = enabled;
    const context = vm.createContext({
        console, crypto: webcrypto, TextEncoder,
        APP_CONFIG: config, weapon, WEAPONS: { spg: weapon },
        S: { map: 'bakurani', weapon: 'spg', origin: {}, target: {} },
        deltaZ: -39,
        document: { documentElement: { lang: 'en' }, querySelector: () => null },
        $: id => id === 'sphPlatformCorrectionStyles' ? {} : null,
        localStorage: { getItem: () => null, removeItem() {}, setItem() {} },
        requestAnimationFrame() {},
        worldDistanceToMeters: value => value * 100,
        formatTerrainBallisticsStatus: () => '',
        fetchAssetResource: async path => {
            assert.ok(source.has(path), `Unexpected asset request: ${path}`);
            return { ok: true, json: async () => JSON.parse(source.get(path)), text: async () => source.get(path) };
        }
    });
    context.window = context;
    // Only the measured terrain height context is stubbed. The original
    // ballistic table, SHA-verified payloads, resolver and transform are real.
    context.getTerrainBallisticSolutions = ({ solutions, mapId }) => ({
        solutions, meta: { available: true, pendingTerrain: false, mapId, deltaZ: context.deltaZ }
    });
    for (const path of files.slice(0, 4)) vm.runInContext(source.get(path), context, { filename: path });
    vm.runInContext('initSphPlatformCorrection()', context);
    assert.equal(await context.initExperimentalTerrainCorrection(), true);
    vm.runInContext('getResolvedWeaponElevationSolutions(weapon, 1057)', context);
    const deadline = Date.now() + 2000;
    while (!context.getExperimentalTerrainCorrectionState().ready && Date.now() < deadline) await delay(1);
    assert.equal(context.getExperimentalTerrainCorrectionState().ready, true);
    return context;
}

function resolve(context, sample, hull = sample.hull, arc = 'high') {
    context.S.origin = { x: sample.origin[0], y: sample.origin[1] };
    context.S.target = { x: sample.target[0], y: sample.target[1] };
    context.deltaZ = sample.deltaZ;
    context.distance = sample.distance;
    context.hull = hull;
    context.arc = arc;
    vm.runInContext('sphPlatformHullHeadingDeg = hull; sphPlatformSelectedArc = arc', context);
    return vm.runInContext('getResolvedWeaponElevationSolutions(weapon, distance)', context);
}

test('real HIGH resolver reproduces public measurements before calibration', async () => {
    const context = await runtime({ enabled: false });
    for (const id of ['short-815', 'A-original', 'B-original', 'reference-1461']) {
        const sample = field.series.find(s => s.id === id);
        const resolved = resolve(context, sample);
        assert.equal(Math.round(resolved.solutions.high.mil), sample.displayedMil, id);
        assert.equal(resolved.terrainMeta.experimentalTerrainCorrection.arcs.high.applied, true);
    }
});

test('field calibration is applied once AFTER actual Terrain3D and hull correction', async () => {
    const context = await runtime();
    for (const [id, delta, expected] of [
        ['short-815', 16, null], ['A-original', 8, 1345],
        ['B-original', 2, 1293], ['reference-1461', 13, 1240]
    ]) {
        const sample = field.series.find(s => s.id === id);
        const resolved = resolve(context, sample);
        assert.equal(resolved.platformHeadingCorrection.fieldCalibrationMilAdjustment, delta, id);
        if (expected === null) {
            assert.equal(resolved.solutions.high, null, 'do not clamp an unreachable command to 1390');
            assert.equal(resolved.solutions.low, null, 'do not invent a LOW solution below its table coverage');
        } else {
            assert.equal(Math.round(resolved.solutions.high.mil), expected, id);
            const repeated = resolve(context, sample);
            assert.equal(repeated.solutions.high.mil, resolved.solutions.high.mil);
        }
    }
    assert.equal(vm.runInContext('ELEVATION_SOLUTION_TRANSFORMS.length', context), 1);
});

test('reported far hull deltas match 242, not 196; they are not calibration knots', async () => {
    const context = await runtime();
    for (const sample of field.series.filter(s => s.excludedFromDistanceCalibration)) {
        const reportedHull = resolve(context, sample);
        const oldHull = resolve(context, sample, 242);
        const delta196 = reportedHull.platformHeadingCorrection.aim.high.center.milDelta;
        const delta242 = oldHull.platformHeadingCorrection.aim.high.center.milDelta;
        assert.ok(Math.abs(delta242 - sample.hullCorrection) < 0.11, sample.id);
        assert.ok(Math.abs(delta196 - sample.hullCorrection) > 10, sample.id);
        assert.equal(Math.round(oldHull.solutions.high.mil), sample.displayedMil);
        assert.equal(oldHull.platformHeadingCorrection.fieldCalibrationMilAdjustment, 0);
    }
});

test('calibration is absent for LOW, other maps, no hull and terrain fallback', async () => {
    const context = await runtime();
    const sample = field.series.find(s => s.id === 'B-original');
    assert.equal(resolve(context, sample, null).platformHeadingCorrection.fieldCalibrationMilAdjustment, 0);
    const low = resolve(context, sample, 242, 'low');
    const original = await runtime({ enabled: false });
    assert.equal(low.solutions.low.mil, resolve(original, sample, 242, 'low').solutions.low.mil);
    assert.equal(low.platformHeadingCorrection.fieldCalibrationMilAdjustment, 0);
    context.S.map = 'ozeti';
    assert.equal(resolve(context, sample).platformHeadingCorrection.fieldCalibrationMilAdjustment, 0);
    context.S.map = 'bakurani';
    const terrainMeta = resolve(context, sample).terrainMeta;
    context.staleTerrain = { ...terrainMeta, mapId: 'ozeti' };
    assert.equal(vm.runInContext(`sphPlatformResolveHighArcCalibration({
        weapon, distanceMeters: 1057, mapId: 'bakurani',
        terrainMeta: staleTerrain, targetAzimuthDeg: 212.6
    }).reason`, context), 'terrain-not-applied');
    context.setExperimentalTerrainCorrectionEnabled(false);
    assert.equal(resolve(context, sample).platformHeadingCorrection.fieldCalibrationMilAdjustment, 0);
});

test('calibration profile has continuous distance and geometry fades with no extrapolation', async () => {
    const context = await runtime();
    const calibration = context.APP_CONFIG.features.sphPlatformCorrection.highArcCalibration;
    context.profile = calibration.profile;
    const at = distance => {
        context.distance = distance;
        return vm.runInContext('sphPlatformInterpolateCalibration(profile, distance)', context);
    };
    for (const row of calibration.profile) {
        assert.ok(Math.abs(at(row[0]).milDelta - row[1]) < 1e-8);
        if (row[0] > 780 && row[0] < 1650) {
            assert.ok(Math.abs(at(row[0] - 1e-6).milDelta - at(row[0] + 1e-6).milDelta) < 1e-5);
        }
    }
    assert.equal(at(779), null);
    assert.equal(at(1651), null);
    assert.equal(at(2629), null);
    assert.equal(at(1650).milDelta, 0);
    const sample = field.series.find(s => s.id === 'A-original');
    assert.equal(resolve(context, { ...sample, deltaZ: 0 }).platformHeadingCorrection.fieldCalibrationMilAdjustment, 0);
    assert.equal(resolve(context, sample, 212.5).platformHeadingCorrection.fieldCalibrationMilAdjustment, 0);
    const partial = resolve(context, { ...sample, deltaZ: -29 });
    assert.ok(partial.platformHeadingCorrection.fieldCalibrationMilAdjustment > 0);
    assert.ok(partial.platformHeadingCorrection.fieldCalibrationMilAdjustment < 8);

    for (const profile of [[], [[815, 16, -15, -26]], [[815, 16, -15, -26], [815, 8, -39, -29]], [[815, NaN, -15, -26], [1057, 8, -39, -29]]]) {
        context.profile = profile;
        assert.equal(at(900), null);
    }
});

test('ambiguous SPH apex remains a 610–620 range, not a false zero command', async () => {
    const context = await runtime();
    const sample = field.series.find(s => s.id === 'A-original');
    const resolved = resolve(context, { ...sample, distance: 2629, deltaZ: 0 }, 212.5);
    const candidate = resolved.terrainMeta.experimentalTerrainCorrection.arcs.high;
    assert.equal(candidate.reason, 'ambiguous-flat-table-command');
    assert.equal(candidate.tableMrad, null);
    assert.equal(candidate.tableDisplay, '610–620');
    assert.equal(resolved.solutions.high.mil, null);
    assert.equal(Math.round(resolved.solutions.high.minMil), 610);
    assert.equal(Math.round(resolved.solutions.high.maxMil), 620);
});

test('diagnostics report actual hull, intermediate stages and final command without display side effects', async () => {
    const context = await runtime();
    const sample = field.series.find(s => s.id === 'A-original');
    resolve(context, sample);
    context.$ = id => id === 'sphHullHeading' ? { value: '196' } : null;
    const snapshot = vm.runInContext('getSphFiringDiagnostics()', context);
    assert.equal(snapshot.hullHeadingDeg, 242);
    assert.equal(snapshot.hullInputDeg, 196);
    assert.equal(snapshot.hullInputMatchesState, false);
    // Rounded coordinates and the reported UI distance differ by about 1 m.
    assert.ok(Math.abs(snapshot.platformCorrection.fieldCalibrationMilAdjustment - 8) < 0.05);
    assert.equal(Math.round(snapshot.finalSolutions.high.mil), 1345);
    assert.equal(snapshot.terrainMeta.experimentalTerrainCorrection.arcs.high.commandMrad, 1330);
    assert.equal(snapshot.dispersionRadiusMeters, 25);
    const before = vm.runInContext('sphPlatformLastAimMeta', context);
    context.S.target = { x: 89.55, y: 102.06 };
    vm.runInContext('getSphFiringDiagnostics()', context);
    assert.equal(vm.runInContext('sphPlatformLastAimMeta', context), before);
});

test('all measured HIGH groups fit inside 25 m about their own mean, not necessarily the target', () => {
    for (const sample of field.series) {
        const impacts = sample.impacts;
        const n = impacts.length;
        const mean = impacts.reduce((p, [x, y]) => [p[0] + x / n, p[1] + y / n], [0, 0]);
        const radius = Math.max(...impacts.map(([x, y]) => Math.hypot(x - mean[0], y - mean[1]) * 100));
        assert.ok(radius < 25, `${sample.id}: ${radius}`);
    }
});

test('mortar solution and geometric azimuth are unaffected by the SPH calibration', async () => {
    const context = await runtime();
    const raw = JSON.parse(source.get('data/weapons.json')).weapons.find(w => w.id === 'mortar');
    context.otherWeapon = { ...raw, minRange: raw.minRangeKm, maxRange: raw.maxRangeKm ?? raw.rangeKm };
    const baseline = vm.runInContext('getWeaponElevationSolutions(otherWeapon, 500)', context);
    const resolved = vm.runInContext('getResolvedWeaponElevationSolutions(otherWeapon, 500)', context);
    assert.equal(JSON.stringify(resolved.solutions), JSON.stringify(baseline));
    assert.equal(resolved.platformHeadingCorrection.fieldCalibrationMilAdjustment, 0);
    const sample = field.series.find(s => s.id === 'A-original');
    resolve(context, sample);
    const azimuth = vm.runInContext('sphPlatformGetTargetAzimuth()', context);
    assert.ok(Math.abs(azimuth - 212.53349286018397) < 1e-9);
});

test('saved-target resolution uses its own geometry without overwriting current display calibration', async () => {
    const context = await runtime();
    const sample = field.series.find(s => s.id === 'A-original');
    resolve(context, sample);
    const current = vm.runInContext('sphPlatformLastFieldCalibration', context);
    context.savedOrigin = { x: 94.37, y: 108.71 };
    context.savedTarget = { x: 87.74, y: 95.69 };
    context.deltaZ = -46;
    vm.runInContext('sphPlatformHullHeadingDeg = 233', context);
    const resolved = vm.runInContext(`getResolvedWeaponElevationSolutions(weapon, 1461.1, {
        origin: savedOrigin, target: savedTarget, display: false
    })`, context);
    assert.equal(Math.round(resolved.solutions.high.mil), 1240);
    assert.equal(vm.runInContext('sphPlatformLastFieldCalibration', context), current);
});

test('every locale labels the estimated spread and field correction', async () => {
    const registry = JSON.parse(await readFile(new URL('locales/index.json', root), 'utf8'));
    for (const language of registry.languages) {
        const locale = JSON.parse(await readFile(new URL(`locales/${language.file}`, root), 'utf8'));
        assert.ok(locale.sphDistanceCorrection?.trim(), language.id);
        assert.ok(locale.sphDispersionRadius?.includes('{radius}'), language.id);
    }
});
