import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(
    dirname(fileURLToPath(import.meta.url)),
    '../..'
);
const clientRoot = join(root, 'js');

async function javascriptFiles(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    const files = [];

    for (const entry of entries) {
        const path = join(directory, entry.name);

        if (entry.isDirectory()) {
            files.push(...await javascriptFiles(path));
        } else if (entry.isFile() && entry.name.endsWith('.js')) {
            files.push(path);
        }
    }

    return files;
}

test('every classic client script has valid JavaScript syntax', async () => {
    const files = await javascriptFiles(clientRoot);
    assert.ok(files.length > 0);

    for (const file of files) {
        const source = await readFile(file, 'utf8');
        const filename = relative(root, file).replaceAll('\\', '/');
        assert.doesNotThrow(
            () => new vm.Script(source, { filename }),
            filename
        );
    }
});
