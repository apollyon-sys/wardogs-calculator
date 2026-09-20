import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import test from 'node:test';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
    DESKTOP_SCRIPT_FILES,
    LAYOUT_SCRIPT_FILES,
    MAP_TOOL_SCRIPT_FILES,
    MOBILE_SCRIPT_FILES
} from './application-assets.mjs';

const root = resolve(
    dirname(fileURLToPath(import.meta.url)),
    '../..'
);

function localScripts(html) {
    return [...html.matchAll(/<script\s+src="(js\/[^"]+)"\s*><\/script>/g)]
        .map(match => match[1]);
}

test('application script manifests contain existing files without duplicates', async () => {
    for (const files of [DESKTOP_SCRIPT_FILES, MOBILE_SCRIPT_FILES]) {
        assert.equal(new Set(files).size, files.length);

        for (const file of files) {
            await access(resolve(root, file));
        }
    }
});

test('desktop and mobile templates follow the canonical script order', async () => {
    const desktop = await readFile(
        resolve(root, 'src/pages/index.html'),
        'utf8'
    );
    const mobile = await readFile(
        resolve(root, 'src/pages/mobile/index.html'),
        'utf8'
    );

    assert.deepEqual(localScripts(desktop), [
        'js/core/mobile-redirect.js',
        ...DESKTOP_SCRIPT_FILES
    ]);
    assert.deepEqual(localScripts(mobile), MOBILE_SCRIPT_FILES);
});

test('platform-specific scripts stay isolated', () => {
    assert.ok(DESKTOP_SCRIPT_FILES.includes('js/map/camera-keys.js'));
    assert.ok(!DESKTOP_SCRIPT_FILES.includes('js/mobile/mobile.js'));
    assert.ok(MOBILE_SCRIPT_FILES.includes('js/mobile/mobile.js'));
    assert.ok(!MOBILE_SCRIPT_FILES.includes('js/map/camera-keys.js'));

    for (const file of [...LAYOUT_SCRIPT_FILES, ...MAP_TOOL_SCRIPT_FILES]) {
        assert.ok(DESKTOP_SCRIPT_FILES.includes(file));
        assert.ok(MOBILE_SCRIPT_FILES.includes(file));
    }
});
