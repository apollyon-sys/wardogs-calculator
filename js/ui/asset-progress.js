/* =========================
   MAP ASSET LOADING PROGRESS
   ========================= */

const ASSET_LOADING_PROGRESS = {
    resources: new Map(),
    timer: null,
    hideTimer: null,
    panel: null,
    context: '',
    wasBusy: false,
    showUntil: 0,
    completed: false
};

// Observe existing loads only. This UI must never fetch or prefetch assets.
function beginAssetLoadingProgress(key, { mapId = null, kind = 'assets' } = {}) {
    // Once startup finishes, later loads must never restart this indicator.
    if (ASSET_LOADING_PROGRESS.completed) return () => {};
    const task = { mapId, kind, state: 'loading' };
    ASSET_LOADING_PROGRESS.resources.set(key, task);
    queueAssetLoadingProgressUpdate();
    return (success = true) => {
        if (ASSET_LOADING_PROGRESS.completed ||
            ASSET_LOADING_PROGRESS.resources.get(key) !== task) return;
        task.state = success ? 'loaded' : 'failed';
        queueAssetLoadingProgressUpdate();
    };
}

async function trackAssetLoadingProgress(key, operation, options) {
    const finish = beginAssetLoadingProgress(key, options);
    try {
        const value = await operation();
        finish();
        return value;
    } catch (error) {
        finish(false);
        throw error;
    }
}

function assetLoadingMapId(url) {
    try {
        return new URL(url, document.baseURI).pathname
            .match(/\/data\/terrain\/([^/]+)\//)?.[1] || null;
    } catch {
        return null;
    }
}

function getAssetLoadingProgress() {
    const mapId = typeof S === 'object' ? S.map : null;
    const style = typeof S === 'object' ? S.mapStyle : '';
    const tiles = typeof getVisibleTileLoadingProgress === 'function'
        ? getVisibleTileLoadingProgress() : { total: 0, loaded: 0, failed: 0 };
    const tasks = [...ASSET_LOADING_PROGRESS.resources.values()]
        .filter(task => !task.mapId || task.mapId === mapId);
    const pending = tasks.filter(task => task.state === 'loading');
    const total = tiles.total + tasks.length;
    const loaded = tiles.loaded + tasks.filter(task => task.state === 'loaded').length;
    const failed = tiles.failed + tasks.filter(task => task.state === 'failed').length;
    const waiting = total - loaded - failed;
    const access = typeof ASSET_ACCESS_STATE === 'object' ? ASSET_ACCESS_STATE : null;
    const initializing = document.documentElement.dataset.appInitState === 'loading';
    const preparing = Boolean(access?.pending);
    const busy = preparing || initializing || waiting > 0;
    const blocked = Boolean(access?.lastError);
    const percent = total > 0 ? Math.floor(loaded / total * 100) : 0;
    return {
        context: `${mapId || ''}:${style || ''}`,
        total, loaded, failed, waiting, busy, blocked,
        indeterminate: preparing || (busy && total === 0),
        percent: busy ? Math.min(99, percent) : percent,
        terrainOnly: waiting > 0 && tiles.total === tiles.loaded + tiles.failed &&
            pending.length > 0 && pending.every(task => task.kind === 'terrain')
    };
}

function queueAssetLoadingProgressUpdate() {
    if (ASSET_LOADING_PROGRESS.completed) return false;
    if (ASSET_LOADING_PROGRESS.timer !== null) return true;
    ASSET_LOADING_PROGRESS.timer = window.setTimeout(() => {
        ASSET_LOADING_PROGRESS.timer = null;
        updateAssetLoadingProgress();
    }, 100);
    return true;
}

function createAssetLoadingProgress() {
    const map = document.querySelector('.map');
    if (!map) return null;
    const panel = document.createElement('aside');
    panel.id = 'assetLoadingProgress';
    panel.className = 'asset-loading-progress';
    panel.hidden = true;

    const heading = document.createElement('div');
    heading.className = 'asset-loading-progress-heading';
    const title = document.createElement('strong');
    title.id = 'assetLoadingProgressTitle';
    title.setAttribute('role', 'status');
    title.setAttribute('aria-live', 'polite');
    title.setAttribute('aria-atomic', 'true');
    const percentage = document.createElement('span');
    percentage.className = 'asset-loading-progress-percentage';
    percentage.setAttribute('aria-hidden', 'true');
    heading.append(title, percentage);

    const bar = document.createElement('div');
    bar.className = 'asset-loading-progress-bar';
    bar.setAttribute('role', 'progressbar');
    bar.setAttribute('aria-labelledby', title.id);
    bar.setAttribute('aria-valuemin', '0');
    bar.setAttribute('aria-valuemax', '100');
    for (const [name, className] of [
        ['ProgressBar_Background.svg', 'asset-loading-progress-background'],
        ['ProgressBar_Fill.svg', 'asset-loading-progress-fill']
    ]) {
        const image = document.createElement('img');
        image.src = resourceURL(`assets/ui/${name}`);
        image.className = className;
        image.alt = '';
        image.setAttribute('aria-hidden', 'true');
        image.draggable = false;
        bar.append(image);
    }
    const detail = document.createElement('small');
    detail.className = 'asset-loading-progress-detail';
    // Per-file updates stay outside the live region.
    detail.setAttribute('aria-hidden', 'true');
    panel.append(heading, bar, detail);
    map.append(panel);
    return { panel, title, percentage, bar, detail };
}

function updateAssetLoadingProgress() {
    const state = ASSET_LOADING_PROGRESS;
    const now = Date.now();
    if (state.completed) {
        if (now >= state.showUntil) {
            if (state.panel) state.panel.panel.hidden = true;
            state.resources.clear();
        }
        return;
    }
    const progress = getAssetLoadingProgress();
    if (progress.context !== state.context) {
        state.context = progress.context;
        state.wasBusy = false;
        state.showUntil = 0;
        window.clearTimeout(state.hideTimer);
    }
    // Admission errors already have a countdown and accessible retry button.
    if (progress.blocked) {
        if (state.panel) state.panel.panel.hidden = true;
        state.wasBusy = false;
        state.showUntil = 0;
        state.completed = true;
        state.resources.clear();
        window.clearTimeout(state.hideTimer);
        return;
    }
    if (progress.busy) {
        state.wasBusy = true;
        state.showUntil = 0;
        window.clearTimeout(state.hideTimer);
    } else if (state.wasBusy) {
        state.wasBusy = false;
        state.completed = true;
        const duration = progress.failed ? 3500 : 900;
        state.showUntil = now + duration;
        state.hideTimer = window.setTimeout(updateAssetLoadingProgress, duration);
    } else if (now >= state.showUntil) {
        state.completed = true;
        if (state.panel) state.panel.panel.hidden = true;
        state.resources.clear();
        return;
    }

    if (!state.panel) state.panel = createAssetLoadingProgress();
    if (!state.panel) return;
    const { panel, title, percentage, bar, detail } = state.panel;
    const text = typeof assetAccessText === 'function' ? assetAccessText : (_key, fallback) => fallback;
    const titleText = progress.indeterminate
        ? text('assetLoadingPreparing', 'Preparing the map…')
        : progress.busy
            ? progress.terrainOnly
                ? text('assetLoadingTerrain', 'Loading terrain data')
                : text('assetLoadingTitle', 'Loading map assets')
            : progress.failed
                ? text('assetLoadingPartial', 'Some assets could not be loaded')
                : text('assetLoadingReady', 'Map assets ready');
    if (title.textContent !== titleText) title.textContent = titleText;
    const percent = !progress.busy && !progress.failed ? 100 : progress.percent;
    percentage.textContent = progress.indeterminate ? '…' : `${percent}%`;
    panel.style.setProperty('--asset-loading-progress', `${percent}%`);
    panel.classList.toggle('is-indeterminate', progress.indeterminate);
    panel.classList.toggle('is-partial', !progress.busy && progress.failed > 0);
    const detailText = text('assetLoadingScope', 'Current view · {loaded}/{total} assets ready')
        .replace('{loaded}', String(progress.loaded)).replace('{total}', String(progress.total));
    detail.textContent = detailText;
    detail.hidden = progress.indeterminate || progress.total === 0;
    bar.setAttribute('aria-valuetext', progress.indeterminate ? titleText : `${percent}% · ${detailText}`);
    if (progress.indeterminate) bar.removeAttribute('aria-valuenow');
    else bar.setAttribute('aria-valuenow', String(percent));
    panel.hidden = false;
}
