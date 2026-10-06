/* =========================
   ACTIVE RELOAD TRAINER
   ========================= */

const RELOAD_TRAINER_KEYS = ['w', 'a', 's', 'd'];
const RELOAD_TRAINER_SECTIONS = 4;
const RELOAD_TRAINER_SEQUENCE_LENGTH = 4;
const RELOAD_TRAINER_SECTION_MS = 6500;
const RELOAD_TRAINER_STORAGE_KEY = 'wardogs-reload-trainer-best-v1';
const RELOAD_TRAINER_FAILURE_DELAY = 450;

function createReloadTrainerSession({
    now = () => performance.now(),
    random = Math.random,
    bestTimeMs = null
} = {}) {
    const state = {
        phase: 'idle', sequence: [], inputIndex: 0, sections: 0,
        startedAt: null, sectionStartedAt: null, elapsedMs: 0, bestTimeMs, streak: 0
    };

    function nextSequence() {
        state.inputIndex = 0;
        state.sequence = Array.from({ length: RELOAD_TRAINER_SEQUENCE_LENGTH },
            () => RELOAD_TRAINER_KEYS[Math.floor(random() * RELOAD_TRAINER_KEYS.length)]);
    }

    function elapsed() {
        return state.phase === 'playing'
            ? Math.max(0, now() - state.startedAt) : state.elapsedMs;
    }

    function sectionProgress() {
        return state.phase === 'playing'
            ? Math.max(0, Math.min(1, (now() - state.sectionStartedAt) / RELOAD_TRAINER_SECTION_MS))
            : 0;
    }

    function start() {
        if (state.phase === 'playing') state.streak = 0;
        state.phase = 'playing';
        state.sections = 0;
        state.startedAt = now();
        state.sectionStartedAt = state.startedAt;
        state.elapsedMs = 0;
        nextSequence();
    }

    function finishSection(completedAt) {
        state.elapsedMs = Math.max(0, completedAt - state.startedAt);
        state.sections++;
        state.sectionStartedAt = completedAt;
        if (state.sections < RELOAD_TRAINER_SECTIONS) {
            nextSequence();
            return 'section';
        }
        state.inputIndex = RELOAD_TRAINER_SEQUENCE_LENGTH;
        state.phase = 'complete';
        state.streak++;
        if (state.bestTimeMs === null || state.elapsedMs < state.bestTimeMs) {
            state.bestTimeMs = state.elapsedMs;
        }
        return 'complete';
    }

    function advance() {
        if (state.phase !== 'playing') return 'ignored';
        const timestamp = now();
        let result = 'waiting';
        while (state.phase === 'playing'
            && timestamp - state.sectionStartedAt >= RELOAD_TRAINER_SECTION_MS) {
            // Keep the exact deadline when a frame arrives late; do not accumulate frame drift.
            result = finishSection(state.sectionStartedAt + RELOAD_TRAINER_SECTION_MS);
        }
        return result;
    }

    function press(key) {
        if (state.phase !== 'playing' || !RELOAD_TRAINER_KEYS.includes(key)) return 'ignored';
        const transition = advance();
        // Do not judge a key against a replacement sequence that has not been displayed yet.
        if (transition !== 'waiting') return transition;
        state.elapsedMs = elapsed();
        if (key !== state.sequence[state.inputIndex]) {
            state.phase = 'failed';
            state.sections = 0;
            state.streak = 0;
            return 'failed';
        }
        state.inputIndex++;
        return state.inputIndex < RELOAD_TRAINER_SEQUENCE_LENGTH
            ? 'correct' : finishSection(now());
    }

    function interrupt() {
        if (!['playing', 'failed'].includes(state.phase)) return;
        state.elapsedMs = elapsed();
        state.phase = 'interrupted';
        state.sections = 0;
        state.inputIndex = 0;
        state.streak = 0;
    }

    return { state, start, press, elapsed, sectionProgress, advance, interrupt };
}

const RELOAD_TRAINER = {
    session: null, initialized: false, frame: null, retryTimer: null,
    returnFocus: null
};

function readReloadTrainerBest() {
    try {
        const raw = localStorage.getItem(RELOAD_TRAINER_STORAGE_KEY);
        const value = raw === null ? NaN : Number(raw);
        return Number.isFinite(value) && value > 0 ? value : null;
    } catch (_) {
        return null;
    }
}

function saveReloadTrainerBest() {
    try {
        localStorage.setItem(RELOAD_TRAINER_STORAGE_KEY,
            String(RELOAD_TRAINER.session.state.bestTimeMs));
    } catch (_) { /* Training also works when browser storage is unavailable. */ }
}

function isReloadTrainerOpen() {
    return $('reloadTrainerDialog')?.open === true;
}

function reloadTrainerTime(milliseconds) {
    return `${(milliseconds / 1000).toFixed(2)} ${tr('reloadTrainerSeconds')}`;
}

function stopReloadTrainerTimers() {
    if (RELOAD_TRAINER.frame !== null) cancelAnimationFrame(RELOAD_TRAINER.frame);
    if (RELOAD_TRAINER.retryTimer !== null) window.clearTimeout(RELOAD_TRAINER.retryTimer);
    RELOAD_TRAINER.frame = null;
    RELOAD_TRAINER.retryTimer = null;
}

function updateReloadTrainerClock() {
    const output = $('reloadTrainerTime');
    if (output) output.textContent = reloadTrainerTime(RELOAD_TRAINER.session.elapsed());
}

function updateReloadTrainerRing() {
    const session = RELOAD_TRAINER.session;
    const state = session.state;
    document.querySelectorAll('[data-reload-section]').forEach((section, index) => {
        section.classList.toggle('is-complete', index < state.sections);
        section.classList.toggle('is-current', index === state.sections && state.phase === 'playing');
        const fill = index < state.sections ? 1
            : index === state.sections ? session.sectionProgress() : 0;
        section.setAttribute('stroke-dasharray', `${fill * 100} 100`);
    });
}

function tickReloadTrainer() {
    RELOAD_TRAINER.frame = null;
    if (!isReloadTrainerOpen() || RELOAD_TRAINER.session.state.phase !== 'playing') return;
    const result = RELOAD_TRAINER.session.advance();
    if (result === 'complete') saveReloadTrainerBest();
    if (result === 'section' || result === 'complete') renderReloadTrainer();
    else {
        updateReloadTrainerClock();
        updateReloadTrainerRing();
    }
    if (RELOAD_TRAINER.session.state.phase === 'playing') {
        RELOAD_TRAINER.frame = requestAnimationFrame(tickReloadTrainer);
    }
}

function renderReloadTrainer() {
    const session = RELOAD_TRAINER.session;
    if (!session || !$('reloadTrainerDialog')) return;
    const state = session.state;
    $('reloadTrainerDialog').dataset.phase = state.phase;
    updateReloadTrainerClock();
    $('reloadTrainerBest').textContent = state.bestTimeMs === null
        ? '—' : reloadTrainerTime(state.bestTimeMs);
    $('reloadTrainerStreak').textContent = String(state.streak);
    $('reloadTrainerProgress').textContent = `${state.sections} / ${RELOAD_TRAINER_SECTIONS}`;
    $('reloadTrainerProgress').setAttribute('aria-valuenow', String(state.sections));
    updateReloadTrainerRing();

    const arrow = '<svg viewBox="0 0 64 64" width="40" height="40" aria-hidden="true"><path d="M16 62V38H2L32 2l30 36H48v24Z"/></svg>';
    const sequence = $('reloadTrainerSequence');
    sequence.replaceChildren();
    state.sequence.forEach((key, index) => {
        const failed = state.phase === 'failed';
        const correct = !failed && index < state.inputIndex;
        const item = document.createElement('li');
        item.className = `reload-trainer-arrow${failed ? ' is-failed' : correct ? ' is-correct' : ''}`;
        item.dataset.direction = key;
        if (state.phase === 'playing' && index === state.inputIndex) item.setAttribute('aria-current', 'step');
        const result = failed ? tr('reloadTrainerWrong') : correct ? tr('reloadTrainerCorrect') : '';
        item.setAttribute('aria-label', `${index + 1}. ${key.toUpperCase()}${result ? ` · ${result}` : ''}`);
        item.innerHTML = arrow;
        sequence.append(item);
    });

    const statusKeys = {
        idle: 'reloadTrainerReady', playing: 'reloadTrainerPlaying',
        failed: 'reloadTrainerFailed', complete: 'reloadTrainerComplete',
        interrupted: 'reloadTrainerInterrupted'
    };
    const status = $('reloadTrainerStatus');
    status.textContent = tr(statusKeys[state.phase]);
    status.dataset.phase = state.phase;
    $('reloadTrainerStart').textContent = `R · ${tr(state.phase === 'playing'
        ? 'reloadTrainerRestart' : 'reloadTrainerStart')}`;
    document.querySelectorAll('[data-reload-key]').forEach(button => {
        button.disabled = state.phase !== 'playing';
    });
}

function startReloadTrainerCircle() {
    if (!isReloadTrainerOpen()) return;
    if (RELOAD_TRAINER.session.advance() === 'complete') saveReloadTrainerBest();
    stopReloadTrainerTimers();
    RELOAD_TRAINER.session.start();
    renderReloadTrainer();
    RELOAD_TRAINER.frame = requestAnimationFrame(tickReloadTrainer);
}

function inputReloadTrainerKey(key) {
    if (!isReloadTrainerOpen()) return;
    const result = RELOAD_TRAINER.session.press(key);
    if (result === 'ignored') return;
    if (result === 'failed' || result === 'complete') stopReloadTrainerTimers();
    if (result === 'complete') saveReloadTrainerBest();
    renderReloadTrainer();
    if (result === 'failed') {
        RELOAD_TRAINER.retryTimer = window.setTimeout(() => {
            RELOAD_TRAINER.retryTimer = null;
            if (isReloadTrainerOpen() && RELOAD_TRAINER.session.state.phase === 'failed') {
                startReloadTrainerCircle();
            }
        }, RELOAD_TRAINER_FAILURE_DELAY);
    }
}

function handleReloadTrainerKeyDown(event) {
    if (!isReloadTrainerOpen() || event.ctrlKey || event.metaKey || event.altKey || event.isComposing) return false;
    const key = getKeyboardShortcutKey(event);
    if (key === 'escape') {
        closeReloadTrainer();
        return true;
    }
    if (key !== 'r' && !RELOAD_TRAINER_KEYS.includes(key)) return false;
    // Every arrow needs a fresh key press; holding a key never completes a sequence.
    if (!event.repeat) {
        if (key === 'r') startReloadTrainerCircle();
        else inputReloadTrainerKey(key);
    }
    return true;
}

function interruptReloadTrainer() {
    if (!isReloadTrainerOpen()) return;
    stopReloadTrainerTimers();
    RELOAD_TRAINER.session.interrupt();
    renderReloadTrainer();
}

function finishReloadTrainerClose() {
    if (isReloadTrainerOpen()) return;
    stopReloadTrainerTimers();
    RELOAD_TRAINER.session?.interrupt();
    const button = $('mapToolReloadTrainer');
    button?.classList.remove('active');
    button?.setAttribute('aria-expanded', 'false');
    RELOAD_TRAINER.returnFocus?.focus({ preventScroll: true });
    RELOAD_TRAINER.returnFocus = null;
}

function closeReloadTrainer() {
    if (isReloadTrainerOpen()) $('reloadTrainerDialog').close();
    finishReloadTrainerClose();
}

function openReloadTrainer() {
    const dialog = $('reloadTrainerDialog');
    if (!dialog || dialog.open) return;
    closeMapToolMenus();
    setMapTool(null);
    if (typeof stopCameraPan === 'function') stopCameraPan();
    if (typeof stopMapPanInertia === 'function') stopMapPanInertia();
    RELOAD_TRAINER.returnFocus = document.activeElement;
    RELOAD_TRAINER.session = createReloadTrainerSession({ bestTimeMs: readReloadTrainerBest() });
    renderReloadTrainer();
    dialog.showModal();
    $('mapToolReloadTrainer').classList.add('active');
    $('mapToolReloadTrainer').setAttribute('aria-expanded', 'true');
    $('reloadTrainerStart').focus({ preventScroll: true });
}

function updateReloadTrainerLocalization() {
    const button = $('mapToolReloadTrainer');
    if (button) {
        button.title = tr('reloadTrainerTitle');
        button.setAttribute('aria-label', tr('reloadTrainerTitle'));
    }
    $('reloadTrainerDialog')?.querySelectorAll('[data-reload-text]').forEach(element => {
        element.textContent = tr(element.dataset.reloadText);
    });
    $('reloadTrainerClose')?.setAttribute('aria-label', tr('reloadTrainerClose'));
    $('reloadTrainerSequence')?.setAttribute('aria-label', tr('reloadTrainerSequence'));
    $('reloadTrainerProgress')?.setAttribute('aria-label', tr('reloadTrainerSections'));
    renderReloadTrainer();
}

function initReloadTrainer() {
    if (document.body.classList.contains('mobile-app')) return;
    const bar = document.querySelector('.map-tools-bar');
    if (!bar || RELOAD_TRAINER.initialized) return;
    RELOAD_TRAINER.initialized = true;
    const button = document.createElement('button');
    button.id = 'mapToolReloadTrainer';
    button.type = 'button';
    button.className = 'map-tool-button';
    button.setAttribute('aria-haspopup', 'dialog');
    button.setAttribute('aria-controls', 'reloadTrainerDialog');
    button.setAttribute('aria-expanded', 'false');
    button.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 11a8 8 0 1 0-2.3 6.7M20 4v7h-7"/></svg>';
    bar.insertBefore(button, $('mapToolLayers'));
    button.addEventListener('click', event => {
        event.stopPropagation();
        openReloadTrainer();
    });

    const segments = Array.from({ length: RELOAD_TRAINER_SECTIONS }, (_, index) => {
        const angle = (index * 90 - 88) * Math.PI / 180;
        const end = angle + 86 * Math.PI / 180;
        const point = value => `${100 + 82 * Math.cos(value)},${100 + 82 * Math.sin(value)}`;
        const path = `M${point(angle)} A82 82 0 0 1 ${point(end)}`;
        return `<path class="reload-trainer-ring-track" d="${path}"/>
            <path class="reload-trainer-ring-fill" data-reload-section="${index}" pathLength="100" stroke-dasharray="0 100" d="${path}"/>`;
    }).join('');
    const dialog = document.createElement('dialog');
    dialog.id = 'reloadTrainerDialog';
    dialog.className = 'reload-trainer-dialog';
    dialog.setAttribute('aria-labelledby', 'reloadTrainerTitle');
    dialog.setAttribute('aria-describedby', 'reloadTrainerHint');
    dialog.innerHTML = `<div class="reload-trainer-heading">
        <h2 id="reloadTrainerTitle" data-reload-text="reloadTrainerTitle"></h2>
        <button id="reloadTrainerClose" type="button" class="reload-trainer-close"><span aria-hidden="true">×</span></button>
        </div><div class="reload-trainer-body">
        <div class="reload-trainer-hud">
        <div class="reload-trainer-ring"><svg viewBox="0 0 200 200" width="160" height="160" aria-hidden="true">${segments}</svg></div>
        <span id="reloadTrainerProgress" class="sr-only" role="progressbar" aria-valuemin="0" aria-valuemax="4" aria-valuenow="0">0 / 4</span>
        <ol id="reloadTrainerSequence" class="reload-trainer-sequence"></ol></div>
        <p id="reloadTrainerStatus" class="reload-trainer-status" role="status" aria-live="polite" aria-atomic="true"></p>
        <div class="reload-trainer-stats"><div><span data-reload-text="reloadTrainerTime"></span><output id="reloadTrainerTime" aria-live="off">0.00</output></div>
        <div><span data-reload-text="reloadTrainerBest"></span><strong id="reloadTrainerBest">—</strong></div>
        <div><span data-reload-text="reloadTrainerStreak"></span><strong id="reloadTrainerStreak">0</strong></div></div>
        <button id="reloadTrainerStart" class="reload-trainer-start" type="button"></button>
        <details class="reload-trainer-controls"><summary><kbd>W A S D</kbd> · <kbd>R</kbd> · <kbd>Esc</kbd></summary>
        <p id="reloadTrainerHint" class="reload-trainer-hint" data-reload-text="reloadTrainerHint"></p>
        <div class="reload-trainer-pad" role="group" aria-label="WASD">
        <button type="button" data-reload-key="w" aria-label="W">↑ <kbd>W</kbd></button>
        <button type="button" data-reload-key="a" aria-label="A">← <kbd>A</kbd></button>
        <button type="button" data-reload-key="s" aria-label="S">↓ <kbd>S</kbd></button>
        <button type="button" data-reload-key="d" aria-label="D">→ <kbd>D</kbd></button></div>
        <p class="reload-trainer-footer" data-reload-text="reloadTrainerKeyboardHint"></p></details></div>`;
    document.body.append(dialog);
    $('reloadTrainerClose').addEventListener('click', closeReloadTrainer);
    $('reloadTrainerStart').addEventListener('click', startReloadTrainerCircle);
    dialog.addEventListener('cancel', event => { event.preventDefault(); closeReloadTrainer(); });
    dialog.addEventListener('close', finishReloadTrainerClose);
    dialog.addEventListener('keydown', event => {
        event.stopPropagation();
        if (handleReloadTrainerKeyDown(event)) event.preventDefault();
    });
    dialog.addEventListener('keyup', event => event.stopPropagation());
    dialog.querySelectorAll('[data-reload-key]').forEach(control => {
        control.addEventListener('click', () => inputReloadTrainerKey(control.dataset.reloadKey));
    });
    window.addEventListener('blur', interruptReloadTrainer);
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) interruptReloadTrainer();
    });
    updateReloadTrainerLocalization();
}
