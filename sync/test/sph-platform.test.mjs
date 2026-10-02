import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';
import { Window } from 'happy-dom';

const root = new URL('../../', import.meta.url);
const source = await readFile(new URL(
    'js/features/experimental-sph-platform-correction.js', root
), 'utf8');
const locale = JSON.parse(await readFile(new URL('locales/en.json', root), 'utf8'));

test('hull input immediately replaces persisted heading and clearing it disables correction', t => {
    const window = new Window({ url: 'http://localhost:8000/' });
    t.after(() => window.happyDOM.close());
    window.document.body.innerHTML = `<div class="control-dock">
        <div class="coordinate-point" data-point="target"></div>
    </div><select id="weapon"><option value="spg">SPH-2</option></select>`;
    const storageKey = 'wardogs-sph-platform-correction-hull-heading';
    window.localStorage.setItem(storageKey, '242');
    const weapon = { id: 'spg' };
    const renderedHulls = [];
    const context = vm.createContext({
        console, window, document: window.document,
        localStorage: window.localStorage, WEAPONS: { spg: weapon },
        S: { weapon: 'spg' },
        $: id => window.document.getElementById(id),
        tr: key => locale[key] ?? key,
        registerElevationSolutionTransform() {}, registerResultRenderHook() {},
        result: () => renderedHulls.push(vm.runInContext('sphPlatformHullHeadingDeg', context))
    });
    vm.runInContext(source, context);
    vm.runInContext('initSphPlatformCorrection()', context);
    const input = window.document.getElementById('sphHullHeading');
    assert.equal(input.value, '242');

    input.focus();
    input.value = '196';
    input.dispatchEvent(new window.Event('input', { bubbles: true }));
    assert.equal(vm.runInContext('sphPlatformHullHeadingDeg', context), 196);
    assert.equal(window.localStorage.getItem(storageKey), '196');
    assert.deepEqual(renderedHulls, [196]);
    const actual = vm.runInContext('sphPlatformCorrectAim(1170, 207.9)', context);
    assert.ok(actual.milDelta > 1 && actual.milDelta < 2);

    input.value = '';
    input.dispatchEvent(new window.Event('input', { bubbles: true }));
    assert.equal(vm.runInContext('sphPlatformHullHeadingDeg', context), null);
    assert.equal(vm.runInContext('sphPlatformCorrectionIsActive()', context), false);
    assert.equal(window.localStorage.getItem(storageKey), null);
    assert.deepEqual(renderedHulls, [196, null]);
});
