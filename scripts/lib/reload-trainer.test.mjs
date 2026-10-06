import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const source = await readFile(new URL('../../js/features/reload-trainer.js', import.meta.url), 'utf8');
const core = await readFile(new URL('../../js/core/core.js', import.meta.url), 'utf8');

function runtime(options = {}) {
    let clock = 100;
    let sample = 0;
    const timers = new Map();
    const dialog = { open: true };
    const context = vm.createContext({
        performance: { now: () => clock },
        localStorage: { getItem: () => null, setItem: () => {} },
        URL,
        document: {
            baseURI: 'https://example.test/',
            getElementById: id => id === 'reloadTrainerDialog' ? dialog
                : id === 'canvas' ? { getContext: () => ({}) } : null,
            querySelector: () => ({}),
            querySelectorAll: () => []
        },
        requestAnimationFrame: () => 1,
        cancelAnimationFrame: () => {},
        window: {
            setTimeout: callback => { timers.set(1, () => { timers.delete(1); callback(); }); return 1; },
            clearTimeout: id => timers.delete(id)
        },
        ...options
    });
    vm.runInContext(core, context);
    vm.runInContext(source, context);
    context.options = { now: () => clock, random: () => (sample++ % 4) / 4 };
    const session = vm.runInContext('createReloadTrainerSession(options)', context);
    context.session = session;
    vm.runInContext('RELOAD_TRAINER.session = session; renderReloadTrainer = () => {};', context);
    return { context, session, timers, dialog, advance: ms => { clock += ms; } };
}

function completeCircle(subject, stepMs = 20) {
    for (let index = 0; index < 16; index++) {
        const { session } = subject;
        subject.advance(stepMs);
        session.press(session.state.sequence[session.state.inputIndex]);
    }
}

test('reload needs four ordered sequences and measures the whole circle from R', () => {
    const subject = runtime();
    const { session } = subject;
    assert.equal(session.press('w'), 'ignored');
    session.start();
    assert.deepEqual(Array.from(session.state.sequence), ['w', 'a', 's', 'd']);
    completeCircle(subject);
    assert.equal(session.state.phase, 'complete');
    assert.equal(session.state.sections, 4);
    assert.equal(session.state.elapsedMs, 320);
    assert.equal(session.state.bestTimeMs, 320);
    assert.equal(session.state.streak, 1);
    subject.advance(1000);
    assert.equal(session.elapsed(), 320);
    assert.equal(session.press('w'), 'ignored');
    session.start();
    completeCircle(subject, 40);
    assert.equal(session.state.bestTimeMs, 320);
    assert.equal(session.state.streak, 2);
    session.start();
    completeCircle(subject, 10);
    assert.equal(session.state.bestTimeMs, 160);
    assert.equal(session.state.streak, 3);
});

test('a section fills continuously and completes at 6.5 seconds without input', () => {
    const subject = runtime();
    const { session } = subject;
    session.start();
    subject.advance(3250);
    assert.equal(session.advance(), 'waiting');
    assert.equal(session.sectionProgress(), 0.5);
    assert.equal(session.state.sections, 0);
    subject.advance(3249);
    assert.equal(session.advance(), 'waiting');
    assert.equal(session.state.sections, 0);
    subject.advance(1);
    assert.equal(session.advance(), 'section');
    assert.equal(session.state.sections, 1);
    assert.equal(session.state.inputIndex, 0);
    assert.equal(session.sectionProgress(), 0);
    assert.equal(session.state.phase, 'playing');
});

test('a delayed frame catches up without drift and records a passive circle once at 26 seconds', () => {
    const subject = runtime();
    const { session } = subject;
    session.start();
    subject.advance(26037);
    assert.equal(session.advance(), 'complete');
    assert.equal(session.state.sections, 4);
    assert.equal(session.state.inputIndex, 4);
    assert.equal(session.elapsed(), 26000);
    assert.equal(session.state.bestTimeMs, 26000);
    assert.equal(session.state.streak, 1);
    subject.advance(6500);
    assert.equal(session.advance(), 'ignored');
    assert.equal(session.state.streak, 1);
    assert.equal(session.elapsed(), 26000);
});

test('finishing a sequence early starts a fresh 6.5-second deadline for the next section', () => {
    const subject = runtime();
    const { session } = subject;
    session.start();
    subject.advance(1000);
    for (let index = 0; index < 4; index++) session.press(session.state.sequence[session.state.inputIndex]);
    assert.equal(session.state.sections, 1);
    assert.equal(session.sectionProgress(), 0);
    subject.advance(6499);
    assert.equal(session.advance(), 'waiting');
    assert.equal(session.state.sections, 1);
    subject.advance(1);
    assert.equal(session.advance(), 'section');
    subject.advance(13000);
    assert.equal(session.advance(), 'complete');
    assert.equal(session.elapsed(), 20500);
});

test('partial input does not delay automatic completion or leak into the next sequence', () => {
    const subject = runtime();
    const { session } = subject;
    session.start();
    subject.advance(2000);
    session.press('w');
    session.press('a');
    assert.equal(session.state.inputIndex, 2);
    assert.equal(session.sectionProgress(), 2000 / 6500);
    subject.advance(4500);
    assert.equal(session.advance(), 'section');
    assert.equal(session.state.sections, 1);
    assert.equal(session.state.inputIndex, 0);
});

test('a key arriving at a deadline cannot fail an undisplayed replacement sequence', () => {
    const subject = runtime();
    const { session } = subject;
    session.start();
    subject.advance(6500);
    assert.equal(session.press('d'), 'section');
    assert.equal(session.state.sections, 1);
    assert.equal(session.state.inputIndex, 0);
    assert.equal(session.state.phase, 'playing');
    subject.advance(19500);
    assert.equal(session.press('d'), 'complete');
    assert.equal(session.state.streak, 1);
});

test('automatic completion persists the record and stops the animation loop', () => {
    const records = [];
    const subject = runtime({ localStorage: { getItem: () => null, setItem: (_key, value) => records.push(value) } });
    subject.context.startReloadTrainerCircle();
    subject.advance(3250);
    subject.context.tickReloadTrainer();
    assert.equal(subject.session.state.sections, 0);
    subject.advance(22781);
    subject.context.tickReloadTrainer();
    assert.equal(subject.session.state.phase, 'complete');
    assert.deepEqual(records, ['26000']);
    assert.equal(vm.runInContext('RELOAD_TRAINER.frame', subject.context), null);
    subject.context.tickReloadTrainer();
    assert.deepEqual(records, ['26000']);
});

test('R at an expired circle preserves its completion even before the next animation frame', () => {
    const records = [];
    const subject = runtime({ localStorage: { getItem: () => null, setItem: (_key, value) => records.push(value) } });
    subject.context.startReloadTrainerCircle();
    subject.advance(26037);
    subject.context.startReloadTrainerCircle();
    assert.equal(subject.session.state.phase, 'playing');
    assert.equal(subject.session.state.sections, 0);
    assert.equal(subject.session.state.streak, 1);
    assert.equal(subject.session.elapsed(), 0);
    assert.deepEqual(records, ['26000']);
});

test('failed or interrupted circles cannot finish automatically while stopped', () => {
    const subject = runtime();
    const { session } = subject;
    session.start();
    subject.advance(6400);
    assert.equal(session.press('d'), 'failed');
    subject.advance(26000);
    assert.equal(session.advance(), 'ignored');
    assert.equal(session.state.sections, 0);
    assert.equal(session.state.bestTimeMs, null);
    session.start();
    subject.advance(2000);
    session.interrupt();
    subject.advance(26000);
    assert.equal(session.advance(), 'ignored');
    assert.equal(session.state.phase, 'interrupted');
    assert.equal(session.sectionProgress(), 0);
});

test('one wrong key loses every completed section and the success streak', () => {
    const subject = runtime();
    const { session } = subject;
    session.start();
    completeCircle(subject);
    session.start();
    for (let index = 0; index < 12; index++) session.press(session.state.sequence[session.state.inputIndex]);
    assert.equal(session.state.sections, 3);
    assert.equal(session.press('d'), 'failed');
    assert.equal(session.state.sections, 0);
    assert.equal(session.state.streak, 0);
    assert.equal(session.state.bestTimeMs, 320);
    assert.equal(session.press('w'), 'ignored');
    subject.advance(450);
    session.start();
    assert.equal(session.elapsed(), 0);
    assert.equal(session.state.inputIndex, 0);
});

test('restarting or leaving an unfinished attempt cannot preserve a streak or earn a record', () => {
    const subject = runtime();
    const { session } = subject;
    session.start();
    completeCircle(subject);
    session.start();
    assert.equal(session.state.streak, 1);
    subject.advance(500);
    session.start();
    assert.equal(session.state.streak, 0);
    subject.advance(200);
    session.interrupt();
    assert.equal(session.state.phase, 'interrupted');
    assert.equal(session.state.sections, 0);
    assert.equal(session.elapsed(), 200);
    assert.equal(session.state.bestTimeMs, 320);
    assert.equal(session.press('w'), 'ignored');
});

test('physical WASD works with another layout and key repeat never advances input', () => {
    const subject = runtime();
    const { context, session } = subject;
    const handle = event => context.handleReloadTrainerKeyDown(event);
    handle({ code: 'KeyR', key: 'к', repeat: false });
    assert.equal(session.state.phase, 'playing');
    handle({ code: 'KeyW', key: 'ц', repeat: true });
    assert.equal(session.state.inputIndex, 0);
    handle({ code: 'KeyW', key: 'ц', repeat: false });
    assert.equal(session.state.inputIndex, 1);
    assert.equal(handle({ code: 'KeyA', key: 'ф', ctrlKey: true }), false);
    assert.equal(handle({ code: 'KeyA', key: 'ф', isComposing: true }), false);
    assert.equal(session.state.inputIndex, 1);
    subject.dialog.open = false;
    assert.equal(handle({ code: 'KeyA', key: 'ф' }), false);
    assert.equal(session.state.inputIndex, 1);
});

test('a failure retries once and losing focus cancels its pending retry', () => {
    const subject = runtime();
    const { context, session, timers } = subject;
    context.startReloadTrainerCircle();
    context.inputReloadTrainerKey('d');
    assert.equal(session.state.phase, 'failed');
    assert.equal(timers.size, 1);
    timers.get(1)();
    assert.equal(session.state.phase, 'playing');
    assert.equal(session.state.sections, 0);
    context.inputReloadTrainerKey('d');
    context.interruptReloadTrainer();
    assert.equal(timers.size, 0);
    assert.equal(session.state.phase, 'interrupted');
});

test('a blocked or corrupt browser store does not prevent training', () => {
    const subject = runtime({ localStorage: {
        getItem: () => 'Infinity', setItem: () => { throw new Error('blocked'); }
    } });
    assert.equal(subject.context.readReloadTrainerBest(), null);
    subject.session.start();
    completeCircle(subject);
    assert.doesNotThrow(() => subject.context.saveReloadTrainerBest());
    subject.context.localStorage.getItem = () => { throw new Error('blocked'); };
    assert.equal(subject.context.readReloadTrainerBest(), null);
});

test('all supported languages describe training, results and keyboard isolation', async () => {
    const index = JSON.parse(await readFile(new URL('../../locales/index.json', import.meta.url), 'utf8'));
    const english = JSON.parse(await readFile(new URL('../../locales/en.json', import.meta.url), 'utf8'));
    const keys = Object.keys(english).filter(key => key.startsWith('reloadTrainer'));
    assert.ok(keys.length >= 19);
    for (const language of index.languages) {
        const locale = JSON.parse(await readFile(new URL(`../../locales/${language.file}`, import.meta.url), 'utf8'));
        for (const key of keys) assert.ok(locale[key]?.trim(), `${language.id}: ${key}`);
    }
});
