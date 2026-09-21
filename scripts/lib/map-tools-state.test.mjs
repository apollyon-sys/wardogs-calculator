import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const source = await readFile(
    new URL('../../js/map/tools/state.js', import.meta.url),
    'utf8'
);

function createContext() {
    const quietConsole = {
        ...console,
        warn: () => {}
    };
    const context = vm.createContext({
        console: quietConsole,
        Date,
        Math,
        structuredClone,
        lobby: null,
        localStorage: {
            getItem: () => null,
            setItem: () => {}
        },
        S: { map: 'bakurani' },
        getMarkerAsset: icon => icon === 'valid' ? { placeable: true } : null
    });

    vm.runInContext(source, context);
    return context;
}

function normalize(context, payload) {
    context.payload = payload;
    return vm.runInContext(
        'normalizeImportedMapToolPayload(payload)',
        context
    );
}

test('map tool import normalization sanitizes every supported collection', () => {
    const context = createContext();
    const result = normalize(context, {
        type: 'wardogs-map-changes',
        data: {
            drawings: [{
                mapId: ' ozeti ',
                color: 'invalid',
                points: [{ x: '1', y: 2 }, { x: 3, y: '4' }]
            }],
            zones: [{ x: 1, y: 2, radius: 3, color: '#abcdef' }],
            polygons: [{
                points: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }]
            }],
            markers: [
                { icon: 'valid', x: 5, y: 6 },
                { icon: 'blocked', x: 7, y: 8 }
            ],
            layers: { grid: false, drawings: true, unknown: false }
        }
    });

    assert.equal(result.drawings.length, 1);
    assert.equal(result.drawings[0].mapId, 'ozeti');
    assert.equal(result.drawings[0].color, '#d7a452');
    assert.deepEqual(
        structuredClone(result.drawings[0].points),
        [{ x: 1, y: 2 }, { x: 3, y: 4 }]
    );
    assert.equal(result.zones.length, 1);
    assert.equal(result.polygons.length, 1);
    assert.equal(result.markers.length, 1);
    assert.deepEqual(
        structuredClone(result.layers),
        { grid: false, drawings: true }
    );
});

test('map tool import normalization rejects empty and malformed payloads', () => {
    const context = createContext();

    assert.throws(
        () => normalize(context, null),
        /Invalid map changes payload/
    );
    assert.throws(
        () => normalize(context, {
            drawings: [{ points: [{ x: 1, y: 2 }] }],
            zones: [{ x: 1, y: 2, radius: 0 }],
            markers: [{ icon: 'blocked', x: 1, y: 2 }]
        }),
        /No supported map changes found/
    );
});

test('map tool imports enforce cumulative collection limits', () => {
    const context = createContext();
    vm.runInContext(
        `MAP_TOOL_STATE.drawings = Array.from(
            { length: MAP_TOOLS_IMPORT_LIMITS.drawings },
            (_, index) => ({ id: String(index), mapId: 'bakurani', points: [] })
        )`,
        context
    );

    context.imported = {
        drawings: [{ id: 'extra', mapId: 'bakurani', points: [] }],
        zones: [],
        polygons: [],
        markers: [],
        layers: null
    };

    assert.throws(
        () => vm.runInContext('applyImportedMapToolChanges(imported)', context),
        /drawings limit exceeded/
    );
    assert.equal(
        vm.runInContext('MAP_TOOL_STATE.drawings.length', context),
        2000
    );
});

test('failed map tool persistence does not partially apply an import', () => {
    const context = createContext();
    context.localStorage.setItem = () => {
        throw new Error('quota');
    };
    context.imported = {
        drawings: [{ id: 'extra', mapId: 'bakurani', points: [] }],
        zones: [],
        polygons: [],
        markers: [],
        layers: null
    };

    assert.throws(
        () => vm.runInContext('applyImportedMapToolChanges(imported)', context),
        /could not be persisted/
    );
    assert.equal(
        vm.runInContext('MAP_TOOL_STATE.drawings.length', context),
        0
    );
});
