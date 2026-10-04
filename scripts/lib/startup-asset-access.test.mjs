import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const source = await readFile(new URL('../../js/main.js', import.meta.url), 'utf8');
const flush = () => new Promise(resolve => setImmediate(resolve));

function startup(admission) {
    const calls = [];
    const paints = [];
    const context = vm.createContext({
        document: { documentElement: { dataset: {} }, getElementById: () => null },
        console: { warn: () => calls.push('warning'), error: () => calls.push('error') },
        S: { map: 'bakurani' }, MAPS: {}, APP_CONFIG: { collab: { enabled: false } },
        getTheme: () => 'dark', hasRegistryEntry: () => false,
        initializeAssetAccess: () => { calls.push('admission'); return admission; },
        requestAnimationFrame: callback => paints.push(callback),
        setTimeout: callback => callback()
    });
    context.window = context;
    for (const name of [
        'applyTheme', 'bindThemeToggle', 'loadSavedTargets', 'loadAppConfig', 'loadLanguages',
        'applyStaticLanguage', 'initDeveloperMode', 'renderFooter', 'loadAppSelections',
        'loadWeapons', 'loadMapAssets', 'loadMaps', 'applyMapQuerySelection', 'initMapTools',
        'initLayout', 'loadMapPoints', 'persistAppSelections', 'bindEvents',
        'loadSaveArtilleryPreference', 'syncMapStyleSelect', 'updatePointLocksUI',
        'applyLanguage', 'inputs', 'resize', 'renderSavedTargets', 'initMotd'
    ]) context[name] = () => calls.push(name);
    vm.runInContext(source, context);
    return { context, calls, paints };
}

test('menus and calculator become ready while map admission remains pending', async () => {
    let finish;
    const pending = new Promise(resolve => { finish = resolve; });
    const r = startup(pending);
    await flush();
    assert.equal(r.context.document.documentElement.dataset.appInitState, 'ready');
    for (const name of ['initLayout', 'bindEvents', 'inputs', 'resize']) assert.ok(r.calls.includes(name));
    assert.equal(r.calls.filter(name => name === 'admission').length, 1);
    for (const paint of r.paints) paint();
    await flush();
    assert.ok(!r.calls.includes('initMotd'), 'a modal cannot cover pending verification');
    finish(true);
    await flush();
    assert.ok(r.calls.includes('initMotd'));
    assert.equal(r.calls.filter(name => name === 'bindEvents').length, 1);
});

test('failed admission cannot break the calculator or leave an unhandled rejection', async () => {
    let fail;
    const pending = new Promise((_resolve, reject) => { fail = reject; });
    const r = startup(pending);
    await flush();
    fail(new Error('asset gateway unavailable'));
    await flush();
    assert.equal(r.context.document.documentElement.dataset.appInitState, 'ready');
    assert.ok(r.calls.includes('warning'));
    assert.ok(!r.calls.includes('error'));
});
