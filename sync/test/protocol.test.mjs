import test from 'node:test';
import assert from 'node:assert/strict';
import * as P from '../../js/collab/protocol.mjs';
import { createReplicaClass } from '../../js/collab/replica.mjs';
const Replica = createReplicaClass(P);
import { mintInvite, verifyInvite, mintAdmission, verifyAdmission } from '../src/tokens.mjs';

const document = () => P.normalizeDocument({
    mapId: 'bakurani', w: 16, h: 16,
    drawings: [], markers: [], zones: [], polygons: [], savedTargets: []
});
const marker = (id, x = 4, y = 3) => ({ id, mapId: 'bakurani', icon: 'infantry', x, y });
const markerChange = (id, value, before = null) => ({ key: 'markers', id, before, value });

test('canonical room state strips personal firing solutions and unrelated fields', () => {
    const doc = P.normalizeDocument({
        ...document(),
        origin: { x: 5, y: 5 }, target: { x: 6, y: 6 }, weapon: 'mortar', camera: { zoom: 100 }
    });
    assert.equal('origin' in doc, false);
    assert.equal('target' in doc, false);
    assert.equal('weapon' in doc, false);
    assert.equal('camera' in doc, false);
    assert.throws(() => P.normalizeDocument({ ...document(), mapId: '__proto__' }), /bad-id/);
});

test('player presence and roster are bounded, sanitised and kept outside room state', () => {
    assert.deepEqual(P.normalizePresence({ origin: { x: 5, y: 5 }, target: { x: 6, y: 6 } }), {
        origin: { x: 5, y: 5 }, target: { x: 6, y: 6 }
    });
    assert.equal(P.normalizePlayerName('  Gunner\u0001 One  '), 'Gunner One');
    assert.equal(P.normalizePlayerName('Ａl\u202Epha\u200b'), 'Alpha');
    const roster = P.normalizeRoster([{ id: 'peer-1', name: 'Gunner', origin: { x: 1, y: 2 }, target: { x: 3, y: 4 } }]);
    assert.equal(roster[0].name, 'Gunner');
    assert.throws(() => P.normalizePresence({ origin: { x: Infinity, y: 1 }, target: { x: 2, y: 2 } }), /bad-coordinate/);
    assert.throws(() => P.normalizePresence({ origin: { x: 17, y: 1 }, target: { x: 2, y: 2 } }, { w: 16, h: 16 }), /bad-coordinate/);
    assert.throws(() => P.normalizeRoster([{ id: 'same' }, { id: 'same' }]), /duplicate-participant/);
    assert.throws(() => P.normalizeRoster(Array.from({ length: 33 }, (_, i) => ({ id: `p${i}` }))), /too-many-participants/);
});

test('collection, geometry, duplicate and byte limits', () => {
    assert.throws(() => P.normalizeDocument({ ...document(), markers: Array.from({ length: 129 }, (_, i) => marker(`m${i}`)) }), /too-many/);
    assert.throws(() => P.normalizeDocument({ ...document(), markers: [marker('a'), marker('a')] }), /duplicate-id/);
    assert.throws(() => P.normalizeDocument({ ...document(), zones: [{ id: 'z', mapId: 'bakurani', color: '#d7a452', x: 1, y: 2, radius: -1 }] }), /bad-coordinate/);
    assert.throws(() => P.normalizeDocument({ ...document(), savedTargets: [{ id: 't', name: '\u0001', x: 1, y: 2 }] }), /bad-name/);
    assert.throws(() => P.normalizeDocument({ ...document(), markers: [{ ...marker('a'), mapId: 'custom' }] }), /wrong-map/);
    assert.deepEqual(
        P.normalizeDocument({
            ...document(),
            markers: [{ ...marker('blue'), color: '#5FA8D3' }]
        }).markers[0],
        { ...marker('blue'), color: '#5fa8d3' }
    );
    assert.throws(
        () => P.normalizeDocument({
            ...document(),
            markers: [{ ...marker('bad-color'), color: '#ffffff' }]
        }),
        /bad-marker-color/
    );
    const drawing = i => ({ id: `d${i}`, mapId: 'bakurani', color: '#d7a452', points: Array.from({ length: 2048 }, () => ({ x: 123.123456, y: 456.123456 })) });
    assert.throws(() => P.normalizeDocument({ ...document(), drawings: [drawing(1), drawing(2)] }), /room-too-large/);
});

test('atomic compare-and-set merges disjoint annotations and rejects stale replacement', () => {
    const addA = markerChange('a', marker('a'));
    const addB = markerChange('b', marker('b'));
    const afterAdds = P.applyOperations(P.applyOperations(document(), [addA]), [addB]);
    assert.equal(afterAdds.markers.length, 2);
    const replaceA = markerChange('a', marker('a', 8, 9), marker('a'));
    const afterReplace = P.applyOperations(afterAdds, [replaceA]);
    assert.deepEqual(afterReplace.markers.find(item => item.id === 'a'), replaceA.value);
    assert.throws(() => P.applyOperations(afterReplace, [replaceA]), /conflict/);
});

test('coalescing sends only final annotation values and eliminates reverted edits', () => {
    const add = markerChange('a', marker('a'));
    const move = markerChange('a', marker('a', 7, 8), add.value);
    assert.deepEqual(P.coalesceOperations([add], [move]), [{ ...move, before: null }]);
    assert.deepEqual(P.coalesceOperations([add], P.invertOperations([add])), []);
});

test('replica acknowledges commits, queues further edits and protects teammate annotations', () => {
    const r = new Replica(document());
    const add = markerChange('a', marker('a'));
    r.edit([add]);
    assert.equal(r.undoStack.length, 0);
    const sent = r.take('one');
    const move = markerChange('a', marker('a', 6, 6), add.value);
    r.edit([move]);
    r.receive({ ...sent, revision: 1 });
    assert.equal(r.undoStack.length, 1);
    assert.deepEqual(r.view().markers[0], move.value);
    const second = r.take('two'); r.receive({ ...second, revision: 2 });
    const remote = markerChange('a', marker('a', 9, 9), move.value);
    r.receive({ id: 'remote', ops: [remote], revision: 3 });
    assert.throws(() => r.history('undo', 'undo'), /conflict/);
    assert.deepEqual(r.doc.markers[0], remote.value);
});

test('normal undo and redo operate on shared annotations', () => {
    const r = new Replica(document());
    r.edit([markerChange('a', marker('a'))]);
    r.receive({ ...r.take('a'), revision: 1 });
    r.receive({ ...r.history('undo', 'b'), revision: 2 });
    assert.deepEqual(r.doc, document());
    r.receive({ ...r.history('redo', 'c'), revision: 3 });
    assert.deepEqual(r.doc.markers, [marker('a')]);
});

test('rejected operation keeps shared recovery data and cannot silently replay', () => {
    const r = new Replica(document());
    r.edit([markerChange('a', marker('a'))]); r.take('x');
    const copy = r.snapshot(document(), 5, { rejected: 'x' });
    assert.deepEqual(copy.markers, [marker('a')]);
    assert.equal(r.dirty, false);
    assert.throws(() => r.receive({ revision: 7, ops: [] }), /revision-gap/);
});

test('small acknowledgements commit retries and small rejections preserve recovery', () => {
    const r = new Replica(document());
    const add = markerChange('a', marker('a'));
    r.edit([add]);
    r.take('created');
    r.confirm('created', 1);
    assert.deepEqual(r.doc.markers, [marker('a')]);
    assert.equal(r.dirty, false);

    const moved = markerChange('a', marker('a', 9, 9), marker('a'));
    r.edit([moved]);
    r.take('rejected');
    const recovery = r.reject('rejected', 1);
    assert.deepEqual(recovery.markers, [marker('a', 9, 9)]);
    assert.deepEqual(r.doc.markers, [marker('a')]);
    assert.equal(r.dirty, false);
});

test('signed invites reject mutation, random scans, expiry and wrong secret', async () => {
    const secret = 'a'.repeat(64);
    const until = Date.now() + 10000;
    const code = await mintInvite(secret, until);
    assert.equal(await verifyInvite(secret, code), true);
    assert.equal(await verifyInvite('b'.repeat(64), code), false);
    assert.equal(await verifyInvite(secret, code, until), false);
    assert.equal(await verifyInvite(secret, 'random'), false);
    assert.equal(await verifyInvite(secret, code.replace(/^./, code[0] === 'a' ? 'b' : 'a')), false);
});

test('admission tokens are expiring, IP-bound and cannot be used as invitations', async () => {
    const secret = 'c'.repeat(64);
    const until = Date.now() + 10000;
    const subject = 'hashed-client-address';
    const admission = await mintAdmission(secret, until, subject);
    const verified = await verifyAdmission(secret, admission, Date.now(), subject);
    assert.equal(verified.expiresAt, until);
    assert.equal(typeof verified.id, 'string');
    assert.equal(await verifyAdmission(secret, admission, Date.now(), 'different-address'), null);
    assert.equal(await verifyAdmission(secret, admission, until, subject), null);
    assert.equal(await verifyInvite(secret, admission), false);

    const invite = await mintInvite(secret, until);
    assert.equal(await verifyAdmission(secret, invite, Date.now(), subject), null);
});
