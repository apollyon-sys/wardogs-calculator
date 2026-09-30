import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = resolve(
    dirname(fileURLToPath(import.meta.url)),
    '../..'
);

async function source(path) {
    return readFile(resolve(root, path), 'utf8');
}

test('asset gateway production configuration is complete', async () => {
    const config = JSON.parse(await source('config/app.json'));
    const gateway = config.assetGateway;

    assert.equal(gateway.enabled, true);
    assert.equal(gateway.mode, 'preclearance');
    assert.equal(
        gateway.origin,
        'https://assets.wardogs-artillery.com'
    );
    assert.equal(
        gateway.directOrigin,
        'https://assets-v2.wardogs-artillery.com'
    );
    assert.equal(gateway.sessionPath, '/__session');
    assert.equal(gateway.turnstile.enabled, true);
    assert.match(gateway.turnstile.siteKey, /^0x[\w-]{20,}$/);
    assert.equal(gateway.turnstile.action, 'asset-session');
});

test('protected assets use credentialed requests and session recovery', async () => {
    const [access, tiles, terrain, experimental] = await Promise.all([
        source('js/core/asset-access.js'),
        source('js/map/tiles.js'),
        source('js/features/terrain-ballistics.js'),
        source('js/features/experimental-terrain-correction.js')
    ]);

    assert.match(access, /method:\s*'POST'/);
    assert.match(access, /credentials:\s*'include'/);
    assert.match(access, /getAssetDirectOrigin/);
    assert.match(access, /resolveProtectedAssetURL/);
    assert.match(access, /regionalFallback/);
    assert.match(access, /response\.status === 401/);
    assert.match(access, /isLocalAssetCopyHost/);
    assert.match(access, /localAssetWarningTitle/);
    assert.match(access, /localAssetWarningClose/);
    assert.match(access, /sessionStorage\.setItem/);
    assert.match(access, /docs\/cdn\.md#forks-and-self-hosted-deployments/);
    assert.match(tiles, /'use-credentials'/);
    assert.match(tiles, /recoverAssetAccessAfterFailure/);
    assert.match(terrain, /fetchAssetResource/);
    assert.match(experimental, /fetchAssetResource/);
});

test('local asset warning is limited to loopback and private-network copies', async () => {
    const access = await source('js/core/asset-access.js');
    const context = vm.createContext({
        URL,
        Map,
        Set,
        AbortSignal,
        console
    });
    const isLocal = vm.runInContext(
        `${access}\n;isLocalAssetCopyHost`,
        context
    );

    for (const hostname of [
        'localhost',
        'tool.localhost',
        '127.0.0.1',
        '10.1.2.3',
        '172.16.4.5',
        '172.31.4.5',
        '192.168.1.20',
        'wardogs.local',
        '[::1]'
    ]) {
        assert.equal(isLocal(hostname), true, hostname);
    }

    for (const hostname of [
        'wardogs-artillery.com',
        'example.com',
        '172.32.4.5',
        '192.169.1.20',
        'localhost.example.com'
    ]) {
        assert.equal(isLocal(hostname), false, hostname);
    }
});

test('every locale explains unavailable protected assets to local copies', async () => {
    const index = JSON.parse(await source('locales/index.json'));

    for (const language of index.languages) {
        const locale = JSON.parse(
            await source(`locales/${language.file}`)
        );

        for (const key of [
            'localAssetWarningTitle',
            'localAssetWarningBody',
            'localAssetWarningLink',
            'localAssetWarningClose'
        ]) {
            assert.equal(
                typeof locale[key],
                'string',
                `${language.id}: ${key}`
            );
            assert.ok(locale[key].trim());
        }
    }
});
