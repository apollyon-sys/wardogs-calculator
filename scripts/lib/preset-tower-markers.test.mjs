import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import vm from 'node:vm';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const readJSON = path => JSON.parse(readFileSync(resolve(root, path), 'utf8'));
const maps = Object.fromEntries(['bakurani', 'ozeti', 'zestafona'].map(id => [id, readJSON(`maps/${id}.json`)]));
const assets = readJSON('maps/assets.json').markerIcons;
const source = readFileSync(resolve(root, 'js/map/overlays.js'), 'utf8');

function runtime({ loaded = true, missingAsset = false, dataset = {}, FontFace, fonts } = {}) {
    const calls = [];
    const saved = [];
    const stateKeys = ['font', 'filter', 'textAlign', 'textBaseline', 'lineJoin', 'lineWidth',
        'fillStyle', 'strokeStyle', 'shadowColor', 'shadowOffsetX', 'shadowOffsetY'];
    const ctx = {
        font: '10px sans-serif', filter: 'none', textAlign: 'start', textBaseline: 'alphabetic',
        lineWidth: 1, shadowColor: 'transparent', shadowOffsetX: 0, shadowOffsetY: 0,
        save() { saved.push(Object.fromEntries(stateKeys.map(key => [key, this[key]]))); },
        restore() { Object.assign(this, saved.pop()); },
        measureText(text) { return { width: text.length * 7 }; }
    };
    for (const name of ['beginPath', 'moveTo', 'lineTo', 'closePath', 'fill', 'stroke', 'arc',
        'fillRect', 'strokeRect', 'drawImage', 'fillText', 'strokeText']) {
        ctx[name] = (...args) => calls.push({ name, args, font: ctx.font,
            strokeStyle: ctx.strokeStyle, lineWidth: ctx.lineWidth });
    }
    const context = vm.createContext({
        ctx, document: { documentElement: { dataset }, fonts }, FontFace,
        S: { map: 'zestafona', zoom: 1, target: { x: 0, y: 0 } },
        performance: { now: () => 1000 },
        $: () => null, pushMapToolHistory() {}, inputs() {}, renderSavedTargets() {},
        requestAnimationFrame: () => 1, cancelAnimationFrame() {},
        draw() { context.redraws++; }, redraws: 0,
        resourceURL: path => `https://example.com/calculator/${path}`,
        getMarkerAsset: id => missingAsset ? null : assets[id] || null,
        loadMarkerImage: () => ({ loaded, failed: false }),
        getMarkerImageSource: () => ({}), getMapIconCanvasFilter: () => 'none',
        getComputedStyle: () => ({ getPropertyValue: () => '#d7a452' }),
        getCurrentMap: () => context.map,
        getCoordinateMetersPerUnit: () => 100,
        storedMetersToWorldCoordinate: meters => meters / 100,
        worldToLocalScreen: (x, y) => ({ x: x * 10, y: y * 10 }),
        toScreen: (x, y) => ({ x: x * 10, y: y * 10 }),
        view: () => ({ scale: 10 }),
        isMapLayerVisible: () => context.visible,
        clamp(point) { point.x = Math.round(point.x * 100) / 100; point.y = Math.round(point.y * 100) / 100; },
        visible: true, map: structuredClone(maps.zestafona)
    });
    vm.runInContext(source, context);
    return { context, ctx, calls, run: code => vm.runInContext(code, context) };
}

test('all maps explicitly number towers independently of marker array order', () => {
    const expected = { bakurani: [4, 3, 2, 1, 5], ozeti: [4, 3, 2, 1], zestafona: [3, 1, 2] };
    for (const [id, map] of Object.entries(maps)) {
        const towers = map.markers.filter(marker => marker.icon === 'tower');
        assert.deepEqual(towers.map(marker => marker.towerNumber), expected[id]);
        assert.equal(new Set(towers.map(marker => marker.towerNumber)).size, towers.length);
        for (const tower of towers) assert.equal(tower.label, `Tower ${tower.towerNumber}`);
    }
    const fixture = runtime();
    fixture.context.item = { icon: 'tower', towerNumber: 8, label: 'Tower 2' };
    assert.equal(fixture.run('getPresetTowerNumber(item)'), '8');
    fixture.context.item = { icon: 'tower', label: 'Вышка 12' };
    assert.equal(fixture.run('getPresetTowerNumber(item)'), '12');
    fixture.context.item = { icon: 'fob', label: 'FOB 2' };
    assert.equal(fixture.run('getPresetTowerNumber(item)'), null);
    fixture.context.item = { icon: 'tower', towerNumber: 0, label: 'Unknown' };
    assert.equal(fixture.run('getPresetTowerNumber(item)'), null);
});

test('tower numerals replace long labels without changing other marker rendering or Canvas state', () => {
    const fixture = runtime();
    fixture.context.map.markers = [fixture.context.map.markers[1],
        { icon: 'fob', x: 9000, y: 9000, label: 'FOB' }];
    fixture.run('drawPresetMarkers(map)');
    assert.deepEqual(fixture.calls.filter(call => call.name === 'fillText').map(call => call.args[0]), ['1', 'FOB']);
    assert.equal(fixture.calls.filter(call => call.name === 'drawImage').length, 2);
    assert.equal(fixture.ctx.font, '10px sans-serif');
    assert.equal(fixture.ctx.shadowColor, 'transparent');
    assert.equal(fixture.ctx.textBaseline, 'alphabetic');
    const plain = fixture.calls.find(call => call.name === 'strokeText');
    const large = runtime({ dataset: { a11yTextSize: 'xl', a11yHighContrast: 'true' } });
    large.run('drawPresetMarkers(map)');
    const accessible = large.calls.find(call => call.name === 'strokeText');
    assert.ok(parseFloat(accessible.font.split(' ')[1]) > parseFloat(plain.font.split(' ')[1]));
    assert.ok(accessible.lineWidth > plain.lineWidth);
    assert.equal(accessible.strokeStyle, 'rgba(0, 0, 0, 1)');
});

test('pending or missing artwork retains numbered towers and the same target geometry', () => {
    for (const options of [{ loaded: false }, { missingAsset: true }]) {
        const fixture = runtime(options);
        fixture.context.map.markers = [fixture.context.map.markers[1]];
        const geometry = fixture.run('getPresetMarkerScreenGeometry(map.markers[0])');
        fixture.run('drawPresetMarkers(map)');
        assert.equal(geometry.width, options.missingAsset ? 32 : assets.tower.width);
        assert.equal(geometry.height, options.missingAsset ? 32 : assets.tower.height);
        assert.deepEqual(fixture.calls.filter(call => call.name === 'fillText').map(call => call.args[0]), ['1']);
        assert.ok(fixture.calls.some(call => call.name === 'closePath'));
        fixture.context.pointer = geometry.center;
        assert.equal(fixture.run('findPresetMarkerAtCanvasPoint(pointer.x, pointer.y).item.towerNumber'), 1);
        fixture.context.visible = false;
        assert.equal(fixture.run('findPresetMarkerAtCanvasPoint(pointer.x, pointer.y)'), null);
        fixture.context.S.zoom = 0.39;
        fixture.calls.length = 0;
        fixture.run('drawPresetMarkers(map)');
        assert.equal(fixture.calls.length, 0);
    }
});

test('rounded Zestafona coordinates still select and highlight the numbered tower', () => {
    const fixture = runtime();
    // Keep the fractional-coordinate regression independent of live map edits.
    fixture.context.map.markers = [{
        ...fixture.context.map.markers[1], x: 6860.1243, y: 10415.3977
    }];
    assert.equal(fixture.run('selectPresetMarkerAsTarget(map.markers[0], 0)'), true);
    assert.equal(fixture.context.S.target.x, 68.6);
    assert.equal(fixture.context.S.target.y, 104.15);
    assert.equal(fixture.run('getPresetMarkerSelectionProgress(map.markers[0], 0)'), 0);
    fixture.run('drawPresetMarkers(map)');
    assert.ok(fixture.calls.some(call => call.name === 'arc'));
    fixture.context.S.target.x += 0.01;
    assert.equal(fixture.run('getPresetMarkerSelectionProgress(map.markers[0], 0)'), null);
});

test('number font loads locally once and font errors leave map rendering usable', async () => {
    let attempts = 0;
    const registered = [];
    class FontFace {
        constructor(family, url) {
            attempts++;
            assert.equal(family, 'WARDOGS Tower Numbers');
            assert.ok(url.includes('https://example.com/calculator/assets/fonts/barlow/'));
        }
        load() { return Promise.resolve(this); }
    }
    const fixture = runtime({ FontFace, fonts: { add: face => registered.push(face) } });
    fixture.run('drawPresetMarkers(map); drawPresetMarkers(map)');
    await Promise.resolve();
    assert.equal(attempts, 1);
    assert.equal(registered.length, 1);
    assert.equal(fixture.context.redraws, 1);

    const failed = runtime({ FontFace: class { load() { return Promise.reject(new Error('font unavailable')); } }, fonts: { add() {} } });
    assert.doesNotThrow(() => failed.run('drawPresetMarkers(map)'));
    await Promise.resolve();
    await Promise.resolve();
    assert.equal(failed.calls.filter(call => call.name === 'fillText').length, 3);
});
