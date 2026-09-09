import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { Miniflare } from 'miniflare';
const origin = 'http://localhost:8000';
const document = () => ({ mapId: 'bakurani', w: 16, h: 16, drawings: [], markers: [], zones: [], polygons: [], savedTargets: [] });
const marker = (id, x = 40, y = 30) => ({ id, mapId: 'bakurani', icon: 'assault', x, y });
const addMarker = (id = 'shared', x = 40, y = 30) => ({ key: 'markers', id, before: null, value: marker(id, x, y) });
async function runtime(t, overrides = {}, env = {}) {
    const result = await build({
        entryPoints: [fileURLToPath(new URL('../src/index.mjs', import.meta.url))], bundle: true, write: false,
        format: 'esm', platform: 'browser', external: ['cloudflare:workers'], logLevel: 'silent',
        plugins: [{ name: 'test-config', setup(b) {
            b.onLoad({ filter: /config[\\/]app\.json$/ }, async args => {
                const config = JSON.parse(await readFile(args.path, 'utf8'));
                config.collab = { ...config.collab, ...overrides };
                return { contents: JSON.stringify(config), loader: 'json' };
            });
        } }]
    });
    const mf = new Miniflare({
        modules: true, script: result.outputFiles[0].text, compatibilityDate: '2026-04-07',
        durableObjects: { ROOMS: { className: 'LobbyRoom', useSQLite: true }, BUDGET: { className: 'LobbyBudget', useSQLite: true } },
        bindings: { LOBBIES_DEV: 'true', ROOM_SECRET: 'local-test-secret-with-at-least-32-characters', ...env }
    });
    t.after(() => mf.dispose());
    return mf;
}
const create = (mf, doc = document(), headers = {}) => mf.dispatchFetch('https://lobby.test/rooms', { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', ...headers }, body: JSON.stringify({ doc }) });
async function join(mf, code) {
    const response = await mf.dispatchFetch(`https://lobby.test/rooms/${code}`, { headers: { Origin: origin, Upgrade: 'websocket' } });
    if (response.status !== 101) return { status: response.status };
    const ws = response.webSocket;
    const queue = [], waiters = [];
    ws.addEventListener('message', event => {
        const msg = event.data === 'pong' ? 'pong' : JSON.parse(event.data);
        const index = waiters.findIndex(w => w.predicate(msg));
        if (index >= 0) { const w = waiters.splice(index, 1)[0]; clearTimeout(w.timer); w.resolve(msg); }
        else queue.push(msg);
    });
    ws.accept();
    return { status: 101, ws, send: msg => ws.send(typeof msg === 'string' ? msg : JSON.stringify(msg)), next: (predicate = () => true) => {
        const index = queue.findIndex(predicate);
        if (index >= 0) return Promise.resolve(queue.splice(index, 1)[0]);
        return new Promise((resolve, reject) => {
            const w = { predicate, resolve, timer: setTimeout(() => { waiters.splice(waiters.indexOf(w), 1); reject(new Error('WebSocket message timeout')); }, 5000) };
            waiters.push(w);
        });
    } };
}
test('Worker disabled switch and origin check are enforced server-side', async t => {
    const mf = await runtime(t, { enabled: false }, { LOBBIES_DEV: 'false' });
    assert.equal((await create(mf, document(), { Origin: 'https://wardogs-artillery.com' })).status, 503);
    assert.equal((await create(mf, document(), { Origin: 'https://evil.test' })).status, 403);
});
test('environment kill switch overrides enabled site config', async t => {
    const mf = await runtime(t, { enabled: true }, { LOBBIES_DISABLED: 'true' });
    assert.equal((await create(mf)).status, 503);
});
test('room admission, ephemeral player presence, shared annotations and late joins', async t => {
    const mf = await runtime(t, { maxParticipants: 2 });
    const response = await create(mf); assert.equal(response.status, 201);
    const { code } = await response.json();
    const a = await join(mf, code), b = await join(mf, code);
    assert.equal(a.status, 101); assert.equal(b.status, 101);
    const snapshotA = await a.next(m => m.type === 'snapshot');
    assert.deepEqual(snapshotA.doc, document());
    await b.next(m => m.type === 'snapshot');
    assert.equal((await join(mf, code)).status, 409);
    a.send('ping'); assert.equal(await a.next(m => m === 'pong'), 'pong');

    a.send({ type: 'presence', name: 'Alpha', origin: { x: 50, y: 50 }, target: { x: 60, y: 60 } });
    const alphaRoster = await b.next(m => m.type === 'peers' && m.roster.some(peer => peer.name === 'Alpha'));
    assert.deepEqual(alphaRoster.roster.find(peer => peer.name === 'Alpha').target, { x: 60, y: 60 });
    b.send({ type: 'presence', name: 'Bravo', origin: { x: 70, y: 70 }, target: { x: 80, y: 80 } });
    await a.next(m => m.type === 'peers' && m.roster.some(peer => peer.name === 'Bravo'));

    const ops = [addMarker()];
    a.send({ type: 'changes', id: 'one', ops });
    const committed = await a.next(m => m.type === 'changes');
    assert.equal(committed.revision, 1);
    assert.equal(committed.remainingUpdates, 999);
    assert.equal((await b.next(m => m.type === 'changes')).revision, 1);
    b.ws.close(1000, 'left');
    await a.next(m => m.type === 'peers' && m.roster.length === 1);
    const c = await join(mf, code); assert.equal(c.status, 101);
    const snapshotC = await c.next(m => m.type === 'snapshot');
    assert.deepEqual(snapshotC.doc.markers, [marker('shared')]);
    assert.deepEqual(snapshotC.roster.find(peer => peer.name === 'Alpha').origin, { x: 50, y: 50 });
});
test('conflicts, write cap and host-only close are enforced', async t => {
    const mf = await runtime(t, { maxChangeBatchesPerRoom: 1 });
    const { code, ownerKey } = await (await create(mf)).json();
    const a = await join(mf, code); await a.next(m => m.type === 'snapshot');
    const first = addMarker();
    a.send({ type: 'changes', id: 'one', ops: [first] });
    assert.equal((await a.next(m => m.type === 'changes')).remainingUpdates, 0);
    a.send({ type: 'changes', id: 'two', ops: [addMarker('shared', 45, 35)] });
    assert.equal((await a.next(m => m.type === 'rejected')).code, 'conflict');
    a.send({ type: 'changes', id: 'three', ops: [{ key: 'markers', id: 'shared', before: first.value, value: marker('shared', 45, 35) }] });
    assert.equal((await a.next(m => m.type === 'rejected')).code, 'room-budget');
    a.send({ type: 'close', ownerKey: 'wrong' });
    assert.equal((await a.next(m => m.type === 'error')).code, 'not-owner');
    a.send({ type: 'close', ownerKey }); await a.next(m => m.type === 'closed');
    assert.equal((await join(mf, code)).status, 404);
});
test('daily creation cap and malformed input; random invitations fail before admission', async t => {
    const mf = await runtime(t, { maxRoomsPerDay: 1 });
    assert.equal((await create(mf)).status, 201);
    assert.equal((await create(mf)).status, 429);
    assert.equal((await join(mf, 'random')).status, 404);
    assert.equal((await create(mf, { ...document(), markers: [null] })).status, 400);
    const bad = await mf.dispatchFetch('https://lobby.test/rooms', { method: 'POST', headers: { Origin: origin }, body: '{' });
    assert.equal(bad.status, 400);
});
test('budget accepts a stricter explicit actor cap for restricted admission', async t => {
    const mf = await runtime(t, { maxRoomsPerAdmission: 3, maxRoomsPerDay: 20 });
    const budgetNamespace = await mf.getDurableObjectNamespace('BUDGET');
    const budget = budgetNamespace.get(budgetNamespace.idFromName('daily-budget'));
    assert.equal((await budget.grant('create', 'restricted-test-actor', 2)).amount, 1);
    assert.equal((await budget.grant('create', 'restricted-test-actor', 2)).amount, 1);
    const limited = await budget.grant('create', 'restricted-test-actor', 2);
    assert.equal(limited.amount, 0);
    assert.equal(limited.reason, 'admission-limit');
});

test('one admission has its own room cap and catalog validation happens before allocation', async t => {
    const mf = await runtime(t, { maxRoomsPerAdmission: 1, maxRoomsPerDay: 20 });
    const hiddenMarker = { ...marker('hidden'), icon: 'tower' };
    const invalid = await create(mf, { ...document(), markers: [hiddenMarker] });
    assert.equal(invalid.status, 400);
    assert.equal((await invalid.json()).error, 'unsupported-marker');
    const outside = await create(mf, { ...document(), markers: [marker('outside', 99, 1)] });
    assert.equal(outside.status, 400);
    assert.equal((await outside.json()).error, 'outside-map');
    assert.equal((await create(mf)).status, 201);
    const limited = await create(mf);
    assert.equal(limited.status, 429);
    assert.equal((await limited.json()).error, 'admission-room-limit');
});
test('duplicate acknowledgements and malformed sync requests are always small', async t => {
    const mf = await runtime(t);
    const { code } = await (await create(mf)).json();
    const a = await join(mf, code);
    await a.next(message => message.type === 'snapshot');
    const change = { type: 'changes', id: 'one', ops: [addMarker()] };
    a.send(change);
    await a.next(message => message.type === 'changes');
    a.send(change);
    const ack = await a.next(message => message.type === 'ack');
    assert.deepEqual(Object.keys(ack).sort(), ['id', 'remainingUpdates', 'revision', 'type']);
    a.send({ type: 'sync' });
    const error = await a.next(message => message.type === 'error');
    assert.deepEqual(error, { type: 'error', code: 'bad-message' });
});
test('global write credits conservatively stop new rooms after daily allowance is reserved', async t => {
    const mf = await runtime(t, { maxChangeBatchesPerDay: 32 });
    const codeA = (await (await create(mf)).json()).code;
    const codeB = (await (await create(mf)).json()).code;
    const a = await join(mf, codeA), b = await join(mf, codeB);
    await a.next(m => m.type === 'snapshot'); await b.next(m => m.type === 'snapshot');
    const msg = { type: 'changes', id: 'one', ops: [addMarker()] };
    a.send(msg); await a.next(m => m.type === 'changes');
    b.send(msg); assert.equal((await b.next(m => m.type === 'rejected')).code, 'daily-budget');
});
