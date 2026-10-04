import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
import vm from 'node:vm';
import { Worker as ThreadWorker } from 'node:worker_threads';

const root = new URL('../../', import.meta.url);
const paths = [
    'js/features/weapons.js', 'js/features/results.js',
    'js/features/experimental-sph-platform-correction.js',
    'js/features/experimental-terrain-correction.js',
    'data/weapons.json', 'config/app.json', 'data/ballistics/terrain-context.json',
    'data/ballistics/terrain-correction/low-main.json',
    'data/ballistics/terrain-correction/low-tail-apex.json',
    'data/ballistics/terrain-correction/high-v2.json'
];
const sources = new Map(await Promise.all(paths.map(async path => [
    path, await readFile(new URL(path, root), 'utf8')
])));
const rawWeapon = JSON.parse(sources.get('data/weapons.json')).weapons.find(w => w.id === 'spg');
const weapon = { ...rawWeapon, minRange: rawWeapon.minRangeKm, maxRange: rawWeapon.maxRangeKm };

export class BrowserWorker {
    constructor(url) {
        assert.match(url, /^https:\/\/wardogs-artillery\.com\/js\/workers\/terrain-height-solver\.js\?v=test-build$/);
        this.thread = new ThreadWorker(`
            const { parentPort, workerData } = require('node:worker_threads');
            globalThis.postMessage = data => parentPort.postMessage(data);
            require(workerData.source);
            parentPort.on('message', data => globalThis.onmessage({ data }));
        `, { eval: true, workerData: { source: new URL('js/workers/terrain-height-solver.js', root).pathname } });
        this.thread.on('message', data => this.onmessage?.({ data }));
        this.thread.on('error', error => this.onerror?.(error));
    }
    postMessage(data) { this.thread.postMessage(data); }
    terminate() { this.thread.terminate(); }
}

export async function until(predicate) {
    const deadline = Date.now() + 5000;
    while (!predicate() && Date.now() < deadline) await delay(5);
    assert.ok(predicate(), 'condition did not complete');
}

export async function runtime({ WorkerClass, extensionEnabled = true, timers = {}, corrupt = false } = {}) {
    const terrain = JSON.parse(sources.get('data/ballistics/terrain-context.json'));
    terrain.experimentalCorrection.extendedHeightCorrection.enabled = extensionEnabled;
    const context = vm.createContext({
        console, crypto: webcrypto, TextEncoder, setTimeout, clearTimeout, ...timers,
        APP_CONFIG: JSON.parse(sources.get('config/app.json')), weapon, WEAPONS: { spg: weapon },
        S: { map: 'zestafona', weapon: 'spg', origin: { x: 70.65, y: 68.47 }, target: { x: 88.26, y: 72.21 } },
        deltaZ: 0, requests: [], rerenders: 0,
        document: { documentElement: { lang: 'en' }, querySelector: () => null },
        $: id => id === 'sphPlatformCorrectionStyles' ? {} : null,
        localStorage: { getItem: () => null, removeItem() {}, setItem() {} },
        requestAnimationFrame: callback => queueMicrotask(callback),
        worldDistanceToMeters: value => value * 100,
        formatTerrainBallisticsStatus: () => '',
        resourceURL: path => new URL(path, 'https://wardogs-artillery.com/').href,
        versionStaticResource: url => ({ url: url + '?v=test-build' }),
        fetchAssetResource: async path => {
            assert.ok(sources.has(path), `unexpected resource: ${path}`);
            context.requests.push(path);
            const body = path.endsWith('terrain-context.json') ? JSON.stringify(terrain) : sources.get(path);
            return { ok: true, json: async () => JSON.parse(body), text: async () => body + (corrupt ? ' ' : '') };
        }
    });
    if (WorkerClass) context.Worker = WorkerClass;
    context.window = context;
    context.getTerrainBallisticSolutions = ({ solutions, mapId }) => ({ solutions,
        meta: { available: true, pendingTerrain: false, mapId, deltaZ: context.deltaZ } });
    for (const path of paths.slice(0, 4)) vm.runInContext(sources.get(path), context, { filename: path });
    context.result = () => context.rerenders++;
    context.refreshSavedTargetFiringInfo = () => {};
    vm.runInContext('initSphPlatformCorrection()', context);
    assert.equal(await context.initExperimentalTerrainCorrection(), true);
    vm.runInContext('getResolvedWeaponElevationSolutions(weapon, 1800)', context);
    if (corrupt) await until(() => context.getExperimentalTerrainCorrectionState().lastError);
    else await until(() => context.getExperimentalTerrainCorrectionState().ready);
    context.result = () => context.rerenders++;
    return context;
}

export function resolve(context, { distance = 1800, deltaZ = 188, hull = null, arc = 'high', map = 'zestafona', display = true } = {}) {
    context.distance = distance; context.deltaZ = deltaZ; context.hull = hull; context.arc = arc;
    context.S.map = map; context.display = display;
    vm.runInContext('sphPlatformHullHeadingDeg = hull; sphPlatformSelectedArc = arc', context);
    return vm.runInContext('getResolvedWeaponElevationSolutions(weapon, distance, { display })', context);
}
