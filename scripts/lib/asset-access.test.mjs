import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

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
    assert.equal(
        gateway.origin,
        'https://assets.wardogs-artillery.com'
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
    assert.match(access, /response\.status === 401/);
    assert.match(tiles, /'use-credentials'/);
    assert.match(tiles, /recoverAssetAccessAfterFailure/);
    assert.match(terrain, /fetchAssetResource/);
    assert.match(experimental, /fetchAssetResource/);
});
