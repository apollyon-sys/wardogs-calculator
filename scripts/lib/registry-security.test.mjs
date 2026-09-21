import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const coreSource = await readFile(
    new URL('../../js/core/core.js', import.meta.url),
    'utf8'
);

function createContext() {
    const canvas = { getContext: () => ({}) };
    const context = vm.createContext({
        console,
        URL,
        document: {
            baseURI: 'https://wardogs-artillery.com/',
            getElementById: id => id === 'canvas' ? canvas : null,
            querySelector: () => ({})
        }
    });
    vm.runInContext(coreSource, context);
    return context;
}

test('application registries have no inherited keys', () => {
    const context = createContext();

    assert.equal(
        vm.runInContext('Object.getPrototypeOf(WEAPONS)', context),
        null
    );
    assert.equal(
        vm.runInContext('Object.getPrototypeOf(MAPS)', context),
        null
    );
    assert.equal(
        vm.runInContext("hasRegistryEntry(MAPS, 'constructor')", context),
        false
    );
});

test('registry ids accept project ids and reject prototype or path keys', () => {
    const context = createContext();

    for (const id of ['spg', 'bakurani', 'spawn_board', 'map-2']) {
        context.id = id;
        assert.equal(
            vm.runInContext('isValidRegistryId(id)', context),
            true,
            id
        );
    }

    for (const id of ['__proto__', '../map', 'two words', '', 'x'.repeat(65)]) {
        context.id = id;
        assert.equal(
            vm.runInContext('isValidRegistryId(id)', context),
            false,
            id
        );
    }
});
