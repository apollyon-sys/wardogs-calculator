import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

await import('../../js/workers/terrain-height-solver.js');
const solver = globalThis.WardogsTerrainHeightSolver;
const weapon = JSON.parse(await readFile(new URL('../../data/weapons.json', import.meta.url), 'utf8')).weapons.find(w => w.id === 'spg');
function flat(arc, distance) {
    const rows = weapon.ballistics[arc].slice().sort((a,b) => a[0]-b[0]);
    const i = rows.findIndex(row => row[0] >= distance);
    if (rows[i][0] === distance) return rows[i][1];
    return rows[i-1][1] + (rows[i][1]-rows[i-1][1]) * (distance-rows[i-1][0]) / (rows[i][0]-rows[i-1][0]);
}
function solve(arc, distance, deltaZ) {
    return solver.solve({ arc, distanceMeters: distance, flatMrad: flat(arc,distance), deltaZMeters: deltaZ });
}

test('RK4 height integration agrees with an independent no-drag analytic trajectory', () => {
    const model = { speed: 300, gravity: 9.80665, drag: 0, offset: 12 };
    for (const [angle, distance] of [[.3,1200],[.8,1800],[1.2,1000]]) {
        const expected = distance*Math.tan(angle) - model.gravity*distance**2/(2*model.speed**2*Math.cos(angle)**2) + model.offset;
        for (const dt of [.02,.01]) assert.ok(Math.abs(solver.heightAtDistance(angle,distance,model,dt)-expected) < .002);
    }
    assert.equal(solver.heightAtDistance(.8,1800,model,0), null);
});

test('zero height preserves the scalar flat command exactly for both model families', () => {
    for (const arc of ['low','high']) {
        const result = solve(arc,1800,0);
        assert.equal(result.status,'MODEL_ESTIMATE');
        assert.equal(result.commandMrad,flat(arc,1800));
        assert.equal(result.minCommandMrad,result.maxCommandMrad);
        assert.equal(result.certified,false);
    }
});

test('LOW and HIGH have reachable estimates above and below the old 40/80m windows', () => {
    for (const arc of ['low','high']) for (const deltaZ of [161.20626867740032,188.46848331282894,300,-100]) {
        const result = solve(arc,1800,deltaZ);
        assert.equal(result.status,'MODEL_ESTIMATE',`${arc} ${deltaZ}`);
        assert.equal(result.reachableModels,result.modelCount);
        assert.ok(Number.isFinite(result.commandMrad));
        assert.equal(result.certified,false);
        assert.ok(result.uncertaintyMil >= 0);
    }
    assert.equal(solve('high',1800,-1000).status,'MODEL_ESTIMATE');
    assert.equal(solve('high',780,1000).status,'MODEL_ESTIMATE');
});

test('the numerical HIGH estimate matches the independently generated frozen differential probe', () => {
    const result = solve('high',999.8049809837909,79.99290486774721);
    const delta = result.commandMrad-flat('high',999.8049809837909);
    assert.equal(result.status,'MODEL_ESTIMATE');
    assert.ok(delta > -1.14 && delta < -1.08,`delta ${delta}`);
});

test('unreachable heights are not clipped, clamped or replaced by the opposite arc', () => {
    for (const arc of ['low','high']) for (const deltaZ of [1e6,-1e6,1e308,-1e308]) {
        const result = solve(arc,1800,deltaZ);
        assert.equal(result.status,'TERRAIN_ADJUSTED_UNREACHABLE');
        assert.equal(result.commandMrad,null);
    }
    // The ascending root around MIL 830 is not a HIGH solution at 780m.
    const result = solve('high',780,-100);
    assert.equal(result.status,'TERRAIN_ADJUSTED_UNREACHABLE');
    assert.equal(result.commandMrad,null);
});

test('missing apex reference and invalid inputs remain unavailable, never certified', () => {
    assert.equal(solve('high',2628,-100).status,'MODEL_UNAVAILABLE');
    for (const input of [null, {}, {arc:'single',distanceMeters:1800,flatMrad:1124,deltaZMeters:100},
        {arc:'high',distanceMeters:1800,flatMrad:null,deltaZMeters:100},
        {arc:'high',distanceMeters:1800,flatMrad:1124,deltaZMeters:Infinity},
        {arc:'high',distanceMeters:1e308,flatMrad:1124,deltaZMeters:100}]) {
        const result = solver.solve(input);
        assert.equal(result.status,'MODEL_UNAVAILABLE');
        assert.equal(result.commandMrad,null);
    }
});
