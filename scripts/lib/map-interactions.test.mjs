import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const interactionsSource = await readFile(
    new URL('../../js/map/tools/interactions.js', import.meta.url),
    'utf8'
);

const controlsSource = await readFile(
    new URL('../../js/map/tools/controls.js', import.meta.url),
    'utf8'
);

const eventsSource = await readFile(
    new URL('../../js/events.js', import.meta.url),
    'utf8'
);

const overlaysSource = await readFile(
    new URL('../../js/map/overlays.js', import.meta.url),
    'utf8'
);

test('Shift constrains the ruler to the dominant map axis', () => {
    const context = vm.createContext({ Math });
    vm.runInContext(interactionsSource, context);

    context.start = { x: 10, y: 20 };
    context.horizontal = { x: 18, y: 23 };
    context.vertical = { x: 12, y: 31 };

    const horizontal = vm.runInContext(
        'constrainRulerEnd(start, horizontal, true)',
        context
    );

    const vertical = vm.runInContext(
        'constrainRulerEnd(start, vertical, true)',
        context
    );

    assert.deepEqual(
        structuredClone(horizontal),
        { x: 18, y: 20 }
    );

    assert.deepEqual(
        structuredClone(vertical),
        { x: 10, y: 31 }
    );

    assert.equal(
        vm.runInContext(
            'constrainRulerEnd(start, horizontal, false) === horizontal',
            context
        ),
        true
    );
});

test('mouse pan inertia ignores slow releases and caps fast ones', () => {
    const context = vm.createContext({ Math, Number });
    vm.runInContext(eventsSource, context);

    assert.equal(
        vm.runInContext(
            'normalizeMapPanInertiaVelocity(0.1, 0.1)',
            context
        ),
        null
    );

    const fast = vm.runInContext(
        'normalizeMapPanInertiaVelocity(5, 0)',
        context
    );

    assert.ok(
        Math.abs(fast.x - 2.4) < 1e-9
    );
    assert.equal(fast.y, 0);
});

test('preset target tolerance follows the editable map precision', () => {
    const context = vm.createContext({
        getCoordinateMetersPerUnit: () => 100
    });

    vm.runInContext(overlaysSource, context);

    const fineGridTolerance =
        vm.runInContext(
            'getPresetTargetCoordinateTolerance()',
            context
        );

    assert.ok(fineGridTolerance > 0.005);
    assert.ok(fineGridTolerance < 0.005001);

    context.getCoordinateMetersPerUnit = () => 1000;

    const kilometerGridTolerance =
        vm.runInContext(
            'getPresetTargetCoordinateTolerance()',
            context
        );

    assert.ok(kilometerGridTolerance > 0.0005);
    assert.ok(kilometerGridTolerance < 0.000501);
});

function controlsContext() {
    const context = vm.createContext({
        MAP_TOOL_STATE: {
            tool: null,
            rulerStart: null,
            rulerEnd: null,
            rulerDragging: false,
            pencilDragging: false,
            activePath: null,
            zoneStart: null,
            zoneEnd: null,
            zoneDragging: false,
            polygonDraft: null,
            polygonHover: null,
            hoverPathId: null,
            hoverDeletePoint: null,
            hoverShapeType: null,
            hoverShapeId: null,
            hoverMarkerId: null,
            layers: {}
        },
        draw: () => {},
        saveMapToolState: () => {},
        setFireAdjustmentPick: () => {},
        document: {
            querySelectorAll: () => []
        },
        c: null
    });

    vm.runInContext(controlsSource, context);
    context.updateMapToolsUI = () => {};
    context.toggleMapToolMenu = id => {
        context.openedMenu = id;
    };
    context.setFireAdjustmentPick = active => {
        context.fireAdjustmentPicking = active;
    };

    return context;
}

test('switching away from Adjust fire disarms impact picking', () => {
    const context = controlsContext();

    vm.runInContext(
        `MAP_TOOL_STATE.tool = 'fireAdjust';
         setMapTool('ruler');`,
        context
    );

    assert.equal(context.MAP_TOOL_STATE.tool, 'ruler');
    assert.equal(context.fireAdjustmentPicking, false);
});

test('opening Markers clears the previous interactive tool', () => {
    const context = controlsContext();

    vm.runInContext(
        `MAP_TOOL_STATE.tool = 'pencil';
         activateMarkerPicker();`,
        context
    );

    assert.equal(context.MAP_TOOL_STATE.tool, null);
    assert.equal(context.openedMenu, 'markerPicker');
});
