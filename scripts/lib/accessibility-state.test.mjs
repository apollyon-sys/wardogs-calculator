import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const source = await readFile(
    new URL('../../js/ui/layout/accessibility.js', import.meta.url),
    'utf8'
);

function normalize(value) {
    const context = vm.createContext({ value });
    vm.runInContext(source, context);
    return vm.runInContext(
        'normalizeAccessibilitySettings(value)',
        context
    );
}

test('accessibility settings accept only supported values', () => {
    assert.deepEqual(
        structuredClone(normalize({
            textSize: 'xl',
            largerControls: true,
            highContrast: true
        })),
        {
            textSize: 'xl',
            largerControls: true,
            highContrast: true
        }
    );

    assert.deepEqual(
        structuredClone(normalize({
            textSize: 'huge',
            largerControls: 1,
            highContrast: 'yes'
        })),
        {
            textSize: 'normal',
            largerControls: false,
            highContrast: false
        }
    );
});
