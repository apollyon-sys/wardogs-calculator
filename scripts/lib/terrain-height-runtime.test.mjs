import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { BrowserWorker, resolve, runtime, until } from './terrain-height-runtime.mjs';

function controlledWorker() {
    const workers = [];
    class ControlledWorker {
        constructor(url) { this.url = url; this.posts = []; workers.push(this); }
        postMessage(message) { this.posts.push(message); }
        terminate() { this.terminated = true; }
        reply(message, result = { status: 'MODEL_ESTIMATE', commandMrad: message.input.flatMrad-8 }) {
            this.onmessage?.({ data: { id: message.id, result } });
        }
    }
    return { workers, WorkerClass: ControlledWorker };
}
const candidate = resolved => resolved.terrainMeta.experimentalTerrainCorrection.arcs.high;

async function pending(t, options = {}) {
    const control = controlledWorker();
    const context = await runtime({ ...options, WorkerClass: control.WorkerClass });
    t.after(() => context.setExperimentalTerrainCorrectionEnabled(false));
    resolve(context);
    await until(() => control.workers[0]?.posts.length);
    return { ...control, context, worker: control.workers[0], job: control.workers[0].posts[0] };
}

test('a real background worker applies HIGH and LOW height estimates for all three maps without extra terrain fetches', async t => {
    const context = await runtime({ WorkerClass: BrowserWorker });
    t.after(() => context.setExperimentalTerrainCorrectionEnabled(false));
    const requestCount = context.requests.length;
    for (const arc of ['high','low']) {
        const initial = resolve(context,{arc,deltaZ:188.46848331282894});
        assert.equal(initial.solutions[arc],null);
        assert.equal(initial.terrainMeta.experimentalTerrainCorrection.arcs[arc].status,'MODEL_PENDING');
        await until(() => context.getExperimentalTerrainCorrectionState().heightSolver.cached >= (arc === 'high' ? 1 : 2));
        const values = [];
        for (const map of ['bakurani','ozeti','zestafona']) {
            const result = resolve(context,{arc,deltaZ:188.46848331282894,map});
            const estimate = result.terrainMeta.experimentalTerrainCorrection.arcs[arc];
            assert.equal(estimate.status,'MODEL_ESTIMATE');
            assert.equal(estimate.certified,false);
            assert.equal(estimate.applied,true);
            assert.ok(result.solutions[arc]);
            assert.equal(result.platformHeadingCorrection.fieldCalibrationMilAdjustment,0);
            values.push(result.solutions[arc].mil);
            assert.match(context.formatTerrainBallisticsStatus(result.terrainMeta),/Terrain3D estimate/);
        }
        assert.equal(new Set(values).size,1);
    }
    assert.equal(context.requests.length,requestCount,'numerical solve must not refetch heights/payloads');
    assert.ok(context.rerenders > 0,'completed jobs refresh the firing display');
});

test('certified field snapshots and the distance-only Bakurani fallback keep their original MIL', async t => {
    const control = controlledWorker();
    const context = await runtime({WorkerClass:control.WorkerClass});
    t.after(() => context.setExperimentalTerrainCorrectionEnabled(false));
    context.S.origin = {x:70.65,y:68.47}; context.S.target = {x:75.51,y:83.43};
    assert.ok(Math.abs(resolve(context,{distance:1572.9628094777074,deltaZ:44.12709177049946,hull:48}).solutions.high.mil-1199.1975633764862)<1e-9);
    context.S.target = {x:67.28,y:83.84};
    assert.ok(Math.abs(resolve(context,{distance:1573.5113599844144,deltaZ:15.916058710874907,hull:48}).solutions.high.mil-1225.9208962527136)<1e-9);
    context.S.origin = {x:94.45,y:108.74}; context.S.target = {x:82.06,y:89.36};
    const safe = resolve(context,{map:'bakurani',distance:2300.20977304245,deltaZ:-49.78004835202569,hull:242});
    assert.ok(Math.abs(safe.solutions.high.mil-949.9152568562012)<1e-9);
    assert.equal(candidate(safe).status,'SAFE_CONSENSUS');
    context.S.target = {x:80.44,y:86.84};
    assert.equal(Math.round(resolve(context,{map:'bakurani',distance:2599.7886452556095,deltaZ:-49.5708746995881,hull:243}).solutions.high.mil),720);
    assert.equal(control.workers.length,0,'unselected extensions must not start needless jobs');
});

test('height clipping starts an estimate, while genuine family disagreement and an ambiguous apex are retained', async t => {
    const control = controlledWorker();
    const context = await runtime({WorkerClass:control.WorkerClass});
    t.after(() => context.setExperimentalTerrainCorrectionEnabled(false));
    const clipped = resolve(context,{distance:999.8049809837909,deltaZ:79.99290486774721});
    assert.equal(candidate(clipped).status,'MODEL_PENDING');
    assert.equal(clipped.solutions.high,null);
    assert.match(context.formatTerrainBallisticsStatus(clipped.terrainMeta),/Calculating Terrain3D/);
    const apex = resolve(context,{distance:2629,deltaZ:100});
    assert.equal(candidate(apex).reason,'ambiguous-flat-table-command');
    assert.equal(apex.solutions.high.mil,null);
    assert.equal(candidate(apex).extendedHeight,undefined);
    // Certified bin-boundary disagreement must not be re-labelled SAFE or bypassed.
    let seam = null;
    for (let deltaZ=-79; deltaZ<=79; deltaZ+=.1) {
        const result = resolve(context,{distance:1800,deltaZ});
        if (candidate(result).status === 'FAMILY_DISAGREEMENT') { seam = candidate(result); break; }
    }
    assert.ok(seam,'expected a real certified family boundary');
    assert.equal(seam.extendedHeight,undefined);
});

test('identical geometry shares a cached result; saved targets defer uncached estimates', async t => {
    const {context,worker,job} = await pending(t);
    assert.equal(resolve(context,{distance:2000,deltaZ:200,display:false}).solutions.high,null);
    assert.equal(candidate(resolve(context,{distance:2000,deltaZ:200,display:false})).status,'MODEL_DEFERRED');
    worker.reply(job);
    const result = resolve(context);
    assert.equal(result.solutions.high.mil,job.input.flatMrad-8);
    const saved = resolve(context,{display:false});
    assert.equal(saved.solutions.high.mil,result.solutions.high.mil);
    assert.equal(candidate(saved).status,'MODEL_ESTIMATE');
    for (let i=0;i<20;i++) resolve(context);
    assert.equal(worker.posts.length,1);
    const before = vm.runInContext('sphPlatformLastAimMeta',context);
    context.formatTerrainBallisticsStatus(saved.terrainMeta,{display:false});
    assert.equal(vm.runInContext('sphPlatformLastAimMeta',context),before);
});

test('wrong job IDs and stale target responses cannot overwrite the current firing solution', async t => {
    const {context,worker,job} = await pending(t);
    worker.reply({...job,id:job.id+100});
    assert.equal(context.getExperimentalTerrainCorrectionState().heightSolver.cached,0);
    resolve(context,{distance:2000,deltaZ:300});
    worker.reply(job);
    assert.equal(candidate(resolve(context,{distance:2000,deltaZ:300})).status,'MODEL_PENDING');
    assert.equal(resolve(context,{distance:2000,deltaZ:300}).solutions.high,null);
    await until(() => worker.posts.length===2);
    worker.reply(worker.posts[1]);
    const latest = resolve(context,{distance:2000,deltaZ:300});
    assert.equal(latest.solutions.high.mil,worker.posts[1].input.flatMrad-8);
    assert.notEqual(latest.solutions.high.mil,job.input.flatMrad-8);
});

test('disabling correction terminates pending work; late replies are ignored', async t => {
    const {context,worker,job} = await pending(t);
    context.setExperimentalTerrainCorrectionEnabled(false);
    assert.equal(worker.terminated,true);
    worker.reply(job);
    assert.equal(context.getExperimentalTerrainCorrectionState().heightSolver.cached,0);
    const result = resolve(context);
    assert.equal(result.solutions.high.mil,job.input.flatMrad);
    assert.equal(context.getExperimentalTerrainCorrectionState().heightSolver.busy,false);
});

test('worker errors, timeouts and lack of Worker support produce an explicit table fallback', async t => {
    const {context,worker} = await pending(t);
    worker.onerror(new Error('blocked script'));
    assert.equal(context.getExperimentalTerrainCorrectionState().heightSolver.lastFailure,'worker-failed');
    const result = resolve(context);
    assert.equal(candidate(result).applied,false);
    assert.match(context.formatTerrainBallisticsStatus(result.terrainMeta),/Table fallback/);
    const callbacks = [];
    const timers = {setTimeout(fn,ms) { if(ms===8000) {callbacks.push(fn);return -1;} return setTimeout(fn,ms); },clearTimeout};
    const timed = await pending(t,{timers});
    callbacks[0]();
    assert.equal(timed.context.getExperimentalTerrainCorrectionState().heightSolver.lastFailure,'worker-timeout');
    assert.equal(timed.context.getExperimentalTerrainCorrectionState().heightSolver.busy,false);
    const noWorker = await runtime();
    assert.equal(candidate(resolve(noWorker)).heightEstimate.reason,'worker-unavailable');
});

test('unreachable, invalid or divergent model results never become firing commands', async t => {
    for (const result of [
        {status:'TERRAIN_ADJUSTED_UNREACHABLE',commandMrad:null},
        {status:'MODEL_DISAGREEMENT',commandMrad:null},
        {status:'MODEL_UNAVAILABLE',commandMrad:null},
        {status:'MODEL_ESTIMATE',commandMrad:609},
        {status:'MODEL_ESTIMATE',commandMrad:NaN}
    ]) {
        const sample = await pending(t);
        sample.worker.reply(sample.job,result);
        const resolved = resolve(sample.context);
        assert.equal(resolved.solutions.high,null);
        assert.equal(candidate(resolved).applied,false);
        assert.notEqual(candidate(resolved).status,'SAFE_CONSENSUS');
        if (result.status==='TERRAIN_ADJUSTED_UNREACHABLE') {
            assert.match(sample.context.formatTerrainBallisticsStatus(resolved.terrainMeta),/No trajectory found/);
        }
    }
});

test('configuration rollback and failed SHA verification never start height solving', async t => {
    const control = controlledWorker();
    const disabled = await runtime({WorkerClass:control.WorkerClass,extensionEnabled:false});
    t.after(() => disabled.setExperimentalTerrainCorrectionEnabled(false));
    assert.equal(candidate(resolve(disabled)).status,'OUTSIDE_CERTIFIED_DOMAIN');
    assert.equal(candidate(resolve(disabled)).applied,false);
    assert.equal(control.workers.length,0);
    const corrupted = await runtime({WorkerClass:control.WorkerClass,corrupt:true});
    t.after(() => corrupted.setExperimentalTerrainCorrectionEnabled(false));
    assert.equal(corrupted.getExperimentalTerrainCorrectionState().ready,false);
    assert.equal(control.workers.length,0);
});
