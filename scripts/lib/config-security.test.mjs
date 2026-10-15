import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const source = await readFile(
    new URL('../../js/core/config.js', import.meta.url),
    'utf8'
);

const deployedConfig = JSON.parse(
    await readFile(
        new URL('../../config/app.json', import.meta.url),
        'utf8'
    )
);

function createContext(baseURI = 'https://wardogs-artillery.com/') {
    const context = vm.createContext({
        console,
        URL,
        APP_CONFIG: {},
        document: {
            baseURI,
            body: { classList: { contains: () => false } }
        }
    });
    vm.runInContext(source, context);
    return context;
}

test('SPH platform correction is fail-safe unless explicitly enabled', () => {
    const context = createContext();

    assert.equal(
        vm.runInContext('isSphPlatformCorrectionEnabled()', context),
        false
    );

    vm.runInContext(
        `APP_CONFIG = mergeAppConfig(DEFAULT_APP_CONFIG, {
            features: { sphPlatformCorrection: { enabled: true } }
        })`,
        context
    );

    assert.equal(
        vm.runInContext('isSphPlatformCorrectionEnabled()', context),
        true
    );
});

test('configured URLs allow HTTPS and explicit local development only', () => {
    const context = createContext('http://localhost:8000/');

    context.value = 'https://example.com/path';
    assert.equal(
        vm.runInContext('normalizeConfiguredHttpUrl(value)', context),
        'https://example.com/path'
    );

    for (const value of [
        'javascript:alert(1)',
        'data:text/html,unsafe',
        'http://example.com/',
        'https://user:secret@example.com/'
    ]) {
        context.value = value;
        assert.equal(
            vm.runInContext('normalizeConfiguredHttpUrl(value)', context),
            null,
            value
        );
    }

    context.value = 'http://localhost:8799/';
    assert.equal(
        vm.runInContext(
            `normalizeConfiguredHttpUrl(value, {
                allowLocalhost: true,
                allowSearchAndHash: false
            })`,
            context
        ),
        'http://localhost:8799/'
    );

    context.value = 'https://example.com/?token=unsafe';
    assert.equal(
        vm.runInContext(
            'normalizeConfiguredHttpUrl(value, { allowSearchAndHash: false })',
            context
        ),
        null
    );
});

test('fallback and deployed application versions stay synchronized', () => {
    const fallbackVersion = source.match(
        /version:\s*\n?\s*'([^']+)'/
    )?.[1];

    assert.equal(
        fallbackVersion,
        deployedConfig.site.footer.version
    );
});

test('failed configuration requests preserve the configuration embedded in the same production build', async () => {
    const context = createContext();
    context.BUILT_APP_CONFIG = structuredClone(deployedConfig);
    context.fetchJSON = async () => { throw new TypeError('simulated network failure'); };
    context.console = { warn() {} };
    assert.equal(await vm.runInContext('loadAppConfig()', context), true);
    assert.deepEqual(JSON.parse(JSON.stringify(context.APP_CONFIG.assetGateway)), deployedConfig.assetGateway);
    assert.deepEqual(JSON.parse(JSON.stringify(context.APP_CONFIG.features)), deployedConfig.features);
    assert.deepEqual(JSON.parse(JSON.stringify(context.APP_CONFIG.collab)), deployedConfig.collab);
});

test('incomplete JSON cannot silently disable production asset admission', async () => {
    for (const loaded of [null, [], {}, { site: {} }]) {
        const context = createContext();
        context.console = { warn() {} };
        context.BUILT_APP_CONFIG = structuredClone(deployedConfig);
        context.fetchJSON = async () => loaded;
        assert.equal(await vm.runInContext('loadAppConfig()', context), true);
        assert.deepEqual(JSON.parse(JSON.stringify(context.APP_CONFIG.assetGateway)), deployedConfig.assetGateway);
    }
});
