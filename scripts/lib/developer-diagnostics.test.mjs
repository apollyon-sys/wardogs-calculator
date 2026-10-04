import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const root = new URL('../../', import.meta.url);
const privateMenu = await readFile(new URL('assets-gateway/private/developer-menu.txt', root), 'utf8');
const sources = new Map(await Promise.all([
    'js/ui/developer-access.js', 'js/core/asset-access.js', 'js/map/tiles.js'
].map(async path => [path, await readFile(new URL(path, root), 'utf8')])));

function runtime(extra = {}) {
    const context = vm.createContext({ URL, URLSearchParams, Headers, console, ...extra });
    const source = privateMenu;
    // Test the pure helpers without mounting the authorized dialog.
    const body = source.slice(source.indexOf('{') + 1, source.lastIndexOf('}'))
        .replace('if (!window.WardogsDeveloperAccess?.isAuthorized()) return;', '');
    vm.runInContext(body.slice(0, body.lastIndexOf('window.WardogsDeveloperMenu =')), context);
    return context;
}

const firing = {
    schema: 'wardogs-sph-firing-diagnostics-v1', version: '1.10.2',
    mapId: 'bakurani', weaponId: 'spg', origin: { x: 94.45, y: 108.74 },
    target: { x: 89.60, y: 101.16 }, distanceMeters: 899.8827701428673,
    selectedArc: 'high', hullHeadingDeg: 243, azimuthDeg: 212.61280775341615,
    displayedMil: '1380', terrainMeta: { deltaZ: -7.454, applied: true },
    platformCorrection: { aim: { high: { center: { milDelta: 7.170 } } } }
};

test('developer preference does not grant access and ordinary visits never touch DOM or network', async () => {
    const context = vm.createContext({ URL, URLSearchParams, window: { location: { search: '' } } });
    vm.runInContext(sources.get('js/ui/developer-access.js'), context);
    for (const [search, saved, expected] of [
        ['', null, false], ['?dev=1', null, true], ['?dev=0', '1', false],
        ['', '1', true], ['?dev=false', '0', false], ['?preview=1', null, false]
    ]) {
        assert.equal(context.developerModePreference(search, saved), expected);
    }
    context.localStorage = { getItem() { throw new Error('disabled'); } };
    context.document = new Proxy({}, { get() { throw new Error('disabled mode touched DOM'); } });
    context.fetch = () => { throw new Error('ordinary visit touched network'); };
    await context.initDeveloperMode();
    assert.equal(context.window.WardogsDeveloperAccess.isAuthorized(), false);
});

test('captured firing series detaches positions and nested correction stages', () => {
    const live = structuredClone(firing);
    const context = runtime({
        WEAPONS: { spg: { id: 'spg' } }, S: { weapon: 'spg', origin: live.origin, target: live.target },
        getSphFiringDiagnostics: () => live
    });
    const snapshot = context.captureDeveloperFiringDiagnostics();
    live.origin.x = 0;
    live.platformCorrection.aim.high.center.milDelta = 99;
    assert.equal(snapshot.origin.x, 94.45);
    assert.equal(snapshot.platformCorrection.aim.high.center.milDelta, 7.170);
    const report = context.createDeveloperFiringReport(snapshot, {
        mil: '1378', azimuth: '212.7', hull: '243', shots: '2',
        milUncertainty: '2', azimuthUncertainty: '0.2', impacts: 'x89.36, y100.74\n89.37; 100.90'
    });
    assert.equal(report.calculator.displayedMil, '1380');
    assert.equal(report.actual.mil, 1378);
    assert.equal(report.impacts.length, 2);
    assert.equal(report.measurementUncertainty.azimuthDegrees, .2);
    const text = context.developerReportText(report);
    assert.match(text, /Calculator MIL: 1380\nActual MIL: 1378/);
    assert.match(text, /x89.36, y100.74/);
    assert.equal(JSON.parse(text.split('Diagnostics JSON:\n')[1]).actual.mil, 1378);
});

test('unknown actual commands stay null rather than being replaced with calculator guesses', () => {
    const context = runtime();
    const report = context.createDeveloperFiringReport(firing);
    assert.deepEqual(JSON.parse(JSON.stringify(report.actual)), {
        mil: null, azimuthDeg: null, hullHeadingDeg: null, shotsFired: null
    });
    assert.match(context.developerReportText(report), /Actual MIL: not recorded/);
    assert.throws(() => context.createDeveloperFiringReport(null), /developerCaptureFirst/);
});

test('firing export rejects malformed, excessive and contradictory shot records', () => {
    const context = runtime();
    for (const input of [
        { mil: '-1' }, { mil: 'Infinity' }, { azimuth: '360' }, { hull: 'NaN' },
        { shots: '1.5' }, { shots: '101' }, { milUncertainty: '-2' },
        { impacts: '<script>alert(1)</script>' }, { impacts: '88.8, 99.8, 100' },
        { impacts: '88.8, 99.8\n'.repeat(101) }, { impacts: 'x'.repeat(10001) },
        { shots: '1', impacts: '88.8, 99.8\n88.7, 99.7' }
    ]) assert.throws(() => context.createDeveloperFiringReport(firing, input), /developerInvalid/);
    assert.equal(context.parseDeveloperImpacts('88.80 99.81\n\n x88.64,y99.81').length, 2);
});

test('general diagnostics expose only selected system status, not credentials or URL secrets', () => {
    const context = runtime({
        APP_CONFIG: { site: { footer: { version: '1.10.2' } }, collab: { enabled: true, token: 'secret-lobby' } },
        MAPS: { bakurani: {} }, WEAPONS: { spg: {} },
        S: { map: 'bakurani', weapon: 'spg', mapStyle: 'color', origin: { x: 1, y: 2 }, target: { x: 3, y: 4 } },
        LANG: 'ru', navigator: { onLine: true, userAgent: 'Test Browser' },
        window: { location: { origin: 'http://127.0.0.1:8000', href: 'http://127.0.0.1:8000/?invite=secret-invite' }, innerWidth: 1280, innerHeight: 800 },
        document: { documentElement: { dataset: { appInitState: 'failed' } }, getElementById: () => null },
        getExperimentalTerrainCorrectionState: () => ({ enabled: false, lastError: 'secret-error-body' }),
        getTerrainBallisticsState: () => ({ initialized: true, ready: false })
    });
    const snapshot = context.getDeveloperDiagnostics();
    assert.equal(snapshot.systems.application.state, 'failed');
    assert.equal(snapshot.systems.correction.lastError, true);
    assert.equal(snapshot.systems.assets, null);
    const text = JSON.stringify(snapshot);
    assert.doesNotMatch(text, /secret|cookie|token|invite/i);
    assert.equal(context.developerSystemState('application', snapshot.systems.application), 'developerError');
    context.getTerrainBallisticsState = () => { throw new Error('secret-failure'); };
    assert.equal(context.getDeveloperDiagnostics().systems.terrain.diagnosticError, 'Error');
});

test('asset diagnostic getter copies retry and HTTP metadata without secret headers or sessions', () => {
    const context = runtime({
        getAssetGatewayMode: () => 'preclearance',
        getAssetGatewayOrigin: () => 'https://assets.wardogs-artillery.com',
        getAssetDirectOrigin: () => 'https://assets-v2.wardogs-artillery.com'
    });
    vm.runInContext(sources.get('js/core/asset-access.js'), context);
    vm.runInContext(`
        isAssetGatewayEnabled = () => true;
        getAssetGatewayMode = () => 'preclearance';
        getAssetGatewayOrigin = () => 'https://assets.wardogs-artillery.com';
        getAssetDirectOrigin = () => 'https://assets-v2.wardogs-artillery.com';
        ASSET_ACCESS_STATE.mode = 'restricted';
        ASSET_ACCESS_STATE.expiresAt = Date.now() + 600000;
        ASSET_ACCESS_STATE.retryAt = Date.now() + 60000;
        ASSET_ACCESS_STATE.lastError = { status: 429, name: 'Error', message: 'secret-body', response: {
            status: 429, headers: new Headers({ 'CF-Ray': 'test-ray', 'Retry-After': '60', 'Set-Cookie': 'secret-cookie', 'Authorization': 'secret-auth' })
        }};
    `, context);
    const snapshot = context.getAssetAccessDiagnostics();
    assert.equal(snapshot.paused, true);
    assert.equal(snapshot.lastFailure.status, 429);
    assert.equal(snapshot.lastFailure.retryAfter, '60');
    assert.equal(snapshot.lastFailure.cfRay, 'test-ray');
    assert.doesNotMatch(JSON.stringify(snapshot), /secret|Set-Cookie|Authorization/);
});

test('clipboard denial leaves an exact, selectable copy without losing the firing report', async () => {
    let selected = false;
    const nodes = { developerOutput: { focus() {}, select() { selected = true; } }, developerOutputWrap: {}, developerStatus: {} };
    const context = runtime({ $: id => nodes[id], navigator: { clipboard: { async writeText() { throw new Error('denied'); } } } });
    const text = context.developerReportText(context.createDeveloperFiringReport(firing));
    await context.copyDeveloperData(text);
    assert.equal(nodes.developerOutput.value, text);
    assert.equal(nodes.developerOutputWrap.hidden, false);
    assert.equal(selected, true);
    assert.match(nodes.developerStatus.textContent, /manually/);
});

test('closing the developer menu stops refresh without destroying the captured series', () => {
    let cleared = false, closed = false;
    const context = runtime({
        $: () => ({ open: true, close() { closed = true; } }),
        window: { clearInterval() { cleared = true; } }
    });
    context.sample = structuredClone(firing);
    vm.runInContext('DEVELOPER_UI.firing = sample; DEVELOPER_UI.timer = 7', context);
    context.closeDeveloperMenu();
    assert.equal(cleared, true);
    assert.equal(closed, true);
    assert.equal(vm.runInContext('DEVELOPER_UI.timer', context), null);
    assert.equal(vm.runInContext('DEVELOPER_UI.firing.displayedMil', context), '1380');
});

test('Terrain3D is only shown ready when the current points have cached heights', () => {
    const context = runtime();
    assert.equal(context.developerSystemState('terrain', {
        enabled: true, ready: true, currentPointsReady: false, pendingChunks: 1
    }), 'developerLoading');
    assert.equal(context.developerSystemState('terrain', {
        enabled: true, currentPointsReady: false, failedChunks: 1
    }), 'developerError');
    assert.equal(context.developerSystemState('terrain', {
        enabled: true, currentPointsReady: true, failedChunks: 0
    }), 'developerReady');
});

test('every registered locale covers all developer menu text', async () => {
    const context = runtime();
    const keys = vm.runInContext('Object.keys(DEVELOPER_TEXT)', context);
    const { languages } = JSON.parse(await readFile(new URL('locales/index.json', root), 'utf8'));
    for (const language of languages) {
        const locale = JSON.parse(await readFile(new URL(`locales/${language.file}`, root), 'utf8'));
        for (const key of keys) assert.ok(locale[key]?.trim(), `${language.id}: ${key}`);
    }
});
