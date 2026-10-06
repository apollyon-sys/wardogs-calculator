import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import vm from 'node:vm';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const readJSON = path => JSON.parse(readFileSync(resolve(root, path), 'utf8'));
const maps = Object.fromEntries(['bakurani', 'ozeti', 'zestafona'].map(id => [id, readJSON(`maps/${id}.json`)]));

function runtime(saved = null) {
    const storage = new Map(saved === null ? [] : [['wardogs-control-zones-v1', saved]]);
    const calls = [];
    const context = vm.createContext({
        MAPS: structuredClone(maps),
        S: { map: 'bakurani' },
        MAP_TOOL_STATE: { layers: { controlZones: true, zones: false } },
        document: { documentElement: { dataset: {} } },
        localStorage: {
            getItem: key => storage.get(key) ?? null,
            setItem: (key, value) => storage.set(key, value)
        },
        $: () => null,
        saveMapToolState() {},
        draw() {},
        tr: key => key,
        view: () => ({ scale: 10, left: 0, top: 0 }),
        worldToLocalScreen: (x, y) => ({ x: x * 10, y: y * 10 }),
        wrap: { clientWidth: 3000, clientHeight: 3000 },
        ctx: new Proxy({}, {
            get: (target, key) => Object.hasOwn(target, key) ? target[key] : key === 'measureText'
                ? () => ({ width: 100 })
                : (...args) => calls.push([key, ...args])
        })
    });
    context.getCurrentMap = () => context.MAPS[context.S.map];
    context.isMapLayerVisible = layer => context.MAP_TOOL_STATE.layers[layer] !== false;
    context.metersToWorldDistance = meters => meters / context.getCurrentMap().coordinateMetersPerUnit;
    vm.runInContext(readFileSync(resolve(root, 'js/map/control-zones.js'), 'utf8'), context);
    return { context, storage, calls, run: code => vm.runInContext(code, context) };
}

test('configured control zones use calibrated coordinates and physical radii on all maps', () => {
    const expected = {
        bakurani: { ids: ['default', 'farmland', 'lumberyard'], x: 79.593275, y: 71.53121, radius: 500 },
        ozeti: { ids: ['default', 'farmland', 'church', 'river'], x: 99.617344, y: 63.267094, radius: 550 },
        zestafona: { ids: ['default', 'smallFactory', 'waterTreatment', 'houses'], x: 70.327249, y: 102.723694, radius: 500 }
    };
    for (const [id, reference] of Object.entries(expected)) {
        const map = maps[id];
        assert.deepEqual(map.controlZones.map(zone => zone.id), reference.ids);
        assert.equal(map.controlZones[0].x, reference.x);
        assert.equal(map.controlZones[0].y, reference.y);
        for (const zone of map.controlZones) {
            assert.equal(zone.radiusMeters, reference.radius);
            assert.ok(zone.x >= map.bounds.minX && zone.x <= map.bounds.maxX);
            assert.ok(zone.y >= map.bounds.minY && zone.y <= map.bounds.maxY);
        }
    }
    assert.equal(maps.ozeti.controlZones[1].selectionWeight, 0);
    assert.equal(maps.zestafona.controlZones[1].selectionWeight, 0);
});

test('selection is initially hidden, independent per map, and recoverable after reload', () => {
    const first = runtime();
    assert.equal(first.run('getSelectedControlZone()'), null);
    assert.equal(first.run("selectControlZone('farmland')"), true);
    first.context.S.map = 'zestafona';
    assert.equal(first.run('getSelectedControlZone()'), null);
    assert.equal(first.run("selectControlZone('houses')"), true);
    assert.equal(first.run("selectControlZone('invalid')"), false);
    const second = runtime(first.storage.get('wardogs-control-zones-v1'));
    second.run('loadControlZoneSelections()');
    assert.equal(second.run('getSelectedControlZone().id'), 'farmland');
    second.context.S.map = 'zestafona';
    assert.equal(second.run('getSelectedControlZone().id'), 'houses');
    assert.equal(second.run("selectControlZone('')"), true);
    assert.equal(second.run('getSelectedControlZone()'), null);
    second.context.S.map = 'bakurani';
    assert.equal(second.run('getSelectedControlZone().id'), 'farmland');
});

test('stale or damaged selections and blocked storage do not stop map usage', () => {
    for (const raw of ['broken', 'null', '{}', '{"selections":{"bakurani":"unknown","zestafona":"houses","other":"default"}}']) {
        const fixture = runtime(raw);
        assert.doesNotThrow(() => fixture.run('loadControlZoneSelections()'));
        assert.equal(fixture.run('getSelectedControlZone()'), null);
        if (raw.includes('houses')) {
            assert.deepEqual(JSON.parse(fixture.run('JSON.stringify(CONTROL_ZONE_STATE.selections)')), { zestafona: 'houses' });
        }
    }
    const blocked = runtime();
    blocked.context.localStorage.getItem = () => { throw new Error('disabled'); };
    blocked.context.localStorage.setItem = () => { throw new Error('disabled'); };
    assert.doesNotThrow(() => blocked.run('loadControlZoneSelections()'));
    assert.equal(blocked.run("selectControlZone('default')"), true);
    assert.equal(blocked.run('getSelectedControlZone().id'), 'default');
});

test('overlay scales in meters, stays separate from drawn zones, and draws no fictional hot zone', () => {
    const fixture = runtime();
    fixture.context.styles = { getPropertyValue: () => '' };
    fixture.run("selectControlZone('default'); drawSelectedControlZone(getCurrentMap(), styles)");
    const arcs = fixture.calls.filter(call => call[0] === 'arc');
    assert.equal(arcs.length, 1);
    assert.equal(arcs[0][1], maps.bakurani.controlZones[0].x * 10);
    assert.equal(arcs[0][2], maps.bakurani.controlZones[0].y * 10);
    assert.equal(arcs[0][3], 50); // 500 m / 100 m per coordinate unit * 10 px.
    assert.equal(fixture.calls.at(-1)[0], 'restore');
    assert.equal(fixture.context.ctx.strokeStyle, '#ffffff');
    assert.equal(fixture.context.ctx.fillStyle, '#ffffff');
    fixture.context.MAP_TOOL_STATE.layers.controlZones = false;
    fixture.calls.length = 0;
    fixture.run('drawSelectedControlZone(getCurrentMap(), styles)');
    assert.equal(fixture.calls.length, 0);
    assert.equal(fixture.run('getSelectedControlZone().id'), 'default');
    fixture.run("selectControlZone('default')");
    assert.equal(fixture.context.MAP_TOOL_STATE.layers.controlZones, true);
    fixture.context.S.map = 'ozeti';
    fixture.run("selectControlZone('default'); drawSelectedControlZone(getCurrentMap(), styles)");
    assert.equal(fixture.calls.find(call => call[0] === 'arc')[3], 55);
});

test('missing maps and invalid radii are harmless to selection and drawing', () => {
    const fixture = runtime();
    fixture.context.S.map = 'unavailable';
    assert.equal(fixture.run("selectControlZone('default')"), false);
    assert.equal(fixture.run('getMapControlZones().length'), 0);
    fixture.context.MAPS.unavailable = { id: 'unavailable', controlZones: [
        { id: 'nan', labelKey: 'x', x: 1, y: 2, radiusMeters: NaN },
        { id: 'negative', labelKey: 'x', x: 1, y: 2, radiusMeters: -1 }
    ] };
    assert.equal(fixture.run('getMapControlZones().length'), 0);
});

test('all locale catalogs explain selection, hiding, inactive variants and radius', () => {
    const keys = ['controlZone', 'controlZoneOff', 'controlZoneRadius', 'controlZoneInactive',
        'controlZoneHint', 'controlZoneLayerHidden', ...new Set(Object.values(maps).flatMap(map => map.controlZones.map(zone => zone.labelKey)))];
    for (const language of readJSON('locales/index.json').languages) {
        const catalog = readJSON(`locales/${language.file}`);
        for (const key of keys) {
            assert.equal(typeof catalog[key], 'string', `${language.id}: ${key}`);
            assert.ok(catalog[key].trim());
        }
        assert.ok(catalog.controlZoneRadius.includes('{radius}'));
    }
});
