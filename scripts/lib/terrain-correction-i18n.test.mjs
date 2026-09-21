import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const registry = JSON.parse(
    await readFile(new URL('../../locales/index.json', import.meta.url), 'utf8')
);
const english = JSON.parse(
    await readFile(new URL('../../locales/en.json', import.meta.url), 'utf8')
);
const keys = Object.keys(english)
    .filter(key => key.startsWith('experimentalTerrainCorrection'));
const terrainBallisticsKeys = [
    'terrainLoading',
    'terrainStatus',
    'sphLevelWarningTitle',
    'sphLevelWarningBody'
];

test('Terrain3D correction copy lives in every registered locale', async () => {
    assert.equal(keys.length, 21);

    for (const language of registry.languages) {
        const locale = JSON.parse(
            await readFile(
                new URL(`../../locales/${language.file}`, import.meta.url),
                'utf8'
            )
        );

        for (const key of [...keys, ...terrainBallisticsKeys]) {
            assert.equal(typeof locale[key], 'string', `${language.id}: ${key}`);
            assert.ok(locale[key].trim(), `${language.id}: ${key}`);
        }
    }
});

test('Terrain3D runtime uses the shared localization pipeline', async () => {
    for (const file of [
        'experimental-terrain-correction.js',
        'terrain-ballistics.js'
    ]) {
        const runtime = await readFile(
            new URL(`../../js/features/${file}`, import.meta.url),
            'utf8'
        );

        assert.doesNotMatch(runtime, /const UI_TEXT\s*=/);
        assert.match(runtime, /typeof tr === 'function'/);
    }
});

test('Terrain3D payload verification fails closed and result copy avoids HTML interpolation', async () => {
    const source = await readFile(
        new URL('../../js/features/experimental-terrain-correction.js', import.meta.url),
        'utf8'
    );

    assert.match(source, /SHA256 verification is unavailable/);
    assert.match(source, /arcs\.replaceChildren\(\.\.\.rows\)/);
    assert.doesNotMatch(source, /\$\{candidate\.(?:value|detail|className)\}/);
});

test('terrain status resolves through the active locale', async () => {
    const runtime = await readFile(
        new URL('../../js/features/terrain-ballistics.js', import.meta.url),
        'utf8'
    );
    const russian = JSON.parse(
        await readFile(new URL('../../locales/ru.json', import.meta.url), 'utf8')
    );
    const window = {};
    const context = vm.createContext({
        window,
        document: { documentElement: { lang: 'ru' } },
        LANG: 'ru',
        tr: key => russian[key] ?? key,
        console
    });

    vm.runInContext(runtime, context);

    assert.equal(
        window.formatTerrainBallisticsStatus({
            available: true,
            pendingTerrain: false,
            deltaZ: 12.34
        }),
        'ΔZ +12.3 м · MIL без автокоррекции'
    );
});
