/* Public bootstrap; the menu is delivered by the owner-authenticated Worker. */
const DEVELOPER_MODE_STORAGE_KEY = 'wardogs-developer-mode-v1';
const DEVELOPER_ACCESS = { active: false, expiresAt: 0, timer: null, script: null, pending: null, generation: 0, controllers: new Set() };
const DEVELOPER_ACCESS_TEXT = {
    developerMode: 'Developer mode', developerClose: 'Close',
    developerLogin: 'Owner sign-in', developerSecret: 'Access key',
    developerLoginHint: 'Use your private developer key. It is sent to the gateway once and is not stored in the browser.',
    developerSignIn: 'Sign in', developerSigningIn: 'Signing in…',
    developerAccessDenied: 'Access denied. Check your key and allowed IP addresses.',
    developerAccessUnavailable: 'Developer access is unavailable. Check the gateway and security rules.'
};

function developerAccessText(key) {
    const value = typeof tr === 'function' ? tr(key) : key;
    return value === key ? DEVELOPER_ACCESS_TEXT[key] || key : value;
}

function developerModePreference(search, saved) {
    const option = new URLSearchParams(search).get('dev');
    return option === '1' || (option !== '0' && saved === '1');
}

function syncDeveloperLocalization() {
    const dialog = document.getElementById('developerAuthDialog');
    for (const element of dialog?.querySelectorAll('[data-developer-auth-text]') || []) {
        element.textContent = developerAccessText(element.dataset.developerAuthText);
    }
    window.WardogsDeveloperMenu?.localize();
}

function developerAccessEndpoint(path = '/__developer') {
    return new URL(path, getAssetGatewayOrigin()).href;
}

async function developerAccessRequest(options = {}) {
    const controller = new AbortController();
    DEVELOPER_ACCESS.controllers.add(controller);
    const timeout = window.setTimeout(() => controller.abort(), 15000);
    try {
        return await fetch(developerAccessEndpoint(), {
            ...options, credentials: 'include', cache: 'no-store',
            redirect: 'error', signal: controller.signal
        });
    } finally {
        window.clearTimeout(timeout);
        DEVELOPER_ACCESS.controllers.delete(controller);
    }
}

function clearDeveloperAccess() {
    DEVELOPER_ACCESS.active = false;
    DEVELOPER_ACCESS.expiresAt = 0;
    DEVELOPER_ACCESS.generation++;
    for (const controller of DEVELOPER_ACCESS.controllers) controller.abort();
    DEVELOPER_ACCESS.controllers.clear();
    window.clearTimeout(DEVELOPER_ACCESS.timer);
    DEVELOPER_ACCESS.timer = null;
    window.WardogsDeveloperMenu?.disable();
    DEVELOPER_ACCESS.script?.remove();
    DEVELOPER_ACCESS.script = null;
}

function disableDeveloperMode() {
    clearDeveloperAccess();
    const dialog = document.getElementById('developerAuthDialog');
    if (dialog?.open) dialog.close();
    dialog?.remove();
    try { localStorage.setItem(DEVELOPER_MODE_STORAGE_KEY, '0'); } catch (_) {}
    const url = new URL(window.location.href);
    url.searchParams.delete('dev');
    window.history.replaceState(window.history.state, '', url);
    // Clear only the developer cookie; asset sessions are independent.
    void developerAccessRequest({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"logout":true}' }).catch(() => {});
}

async function loadDeveloperMenu(grant, generation) {
    if (generation !== DEVELOPER_ACCESS.generation) return;
    const expiresAt = Number(grant.expiresAt);
    if (grant.ok !== true || !Number.isFinite(expiresAt) || expiresAt <= Date.now()) throw new Error('invalid-grant');
    DEVELOPER_ACCESS.active = true;
    DEVELOPER_ACCESS.expiresAt = expiresAt;
    window.clearTimeout(DEVELOPER_ACCESS.timer);
    DEVELOPER_ACCESS.timer = window.setTimeout(clearDeveloperAccess, Math.min(expiresAt - Date.now(), 2147483647));
    const script = document.createElement('script');
    script.src = developerAccessEndpoint('/__developer/module');
    script.crossOrigin = 'use-credentials';
    script.referrerPolicy = 'no-referrer';
    DEVELOPER_ACCESS.script = script;
    await new Promise((resolve, reject) => {
        const timeout = window.setTimeout(() => reject(new Error('module-timeout')), 15000);
        script.onload = () => { window.clearTimeout(timeout); resolve(); };
        script.onerror = () => { window.clearTimeout(timeout); reject(new Error('module-unavailable')); };
        document.head.append(script);
    });
    if (generation !== DEVELOPER_ACCESS.generation) return;
    if (!window.WardogsDeveloperMenu) throw new Error('module-not-installed');
    try { localStorage.setItem(DEVELOPER_MODE_STORAGE_KEY, '1'); } catch (_) {}
}

function showDeveloperSignIn(message = '') {
    let dialog = document.getElementById('developerAuthDialog');
    if (!dialog) {
        dialog = document.createElement('dialog');
        dialog.id = 'developerAuthDialog';
        dialog.className = 'developer-dialog developer-auth-dialog';
        dialog.setAttribute('aria-labelledby', 'developerAuthTitle');
        dialog.innerHTML = `<div class="developer-heading"><h2 id="developerAuthTitle" data-developer-auth-text="developerLogin"></h2>
            <button id="developerAuthClose" type="button" data-developer-auth-text="developerClose"></button></div>
            <form id="developerAuthForm" class="developer-body">
                <p class="developer-hint" data-developer-auth-text="developerLoginHint"></p>
                <label class="developer-auth-field"><span data-developer-auth-text="developerSecret"></span>
                    <input id="developerAuthSecret" type="password" maxlength="256" autocomplete="off" spellcheck="false" required/></label>
                <p id="developerAuthStatus" role="status" aria-live="polite"></p>
                <button id="developerAuthSubmit" type="submit" data-developer-auth-text="developerSignIn"></button>
            </form>`;
        document.body.append(dialog);
        document.getElementById('developerAuthClose').addEventListener('click', disableDeveloperMode);
        dialog.addEventListener('cancel', disableDeveloperMode);
        dialog.addEventListener('keydown', event => event.stopPropagation());
        dialog.addEventListener('keyup', event => event.stopPropagation());
        document.getElementById('developerAuthForm').addEventListener('submit', async event => {
            event.preventDefault();
            const field = document.getElementById('developerAuthSecret');
            const button = document.getElementById('developerAuthSubmit');
            const status = document.getElementById('developerAuthStatus');
            if (button.disabled) return;
            const generation = DEVELOPER_ACCESS.generation;
            let body = JSON.stringify({ secret: field.value });
            field.value = '';
            button.disabled = true;
            status.textContent = developerAccessText('developerSigningIn');
            try {
                const response = await developerAccessRequest({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
                body = null;
                if (generation !== DEVELOPER_ACCESS.generation) return;
                if (!response.ok) throw new Error(response.status === 401 || response.status === 403 ? 'denied' : 'unavailable');
                await loadDeveloperMenu(await response.json(), generation);
                if (generation !== DEVELOPER_ACCESS.generation) return;
                dialog.close();
                dialog.remove();
            } catch (error) {
                if (generation !== DEVELOPER_ACCESS.generation) return;
                clearDeveloperAccess();
                status.textContent = developerAccessText(error.message === 'denied' ? 'developerAccessDenied' : 'developerAccessUnavailable');
                field.focus();
            } finally { body = null; button.disabled = false; }
        });
    }
    syncDeveloperLocalization();
    document.getElementById('developerAuthStatus').textContent = message;
    if (!dialog.open) dialog.showModal();
    document.getElementById('developerAuthSecret').focus();
}

async function verifyDeveloperAccess() {
    if (!DEVELOPER_ACCESS.active || Date.now() >= DEVELOPER_ACCESS.expiresAt) {
        clearDeveloperAccess();
        showDeveloperSignIn();
        return false;
    }
    if (DEVELOPER_ACCESS.pending) return DEVELOPER_ACCESS.pending;
    const generation = DEVELOPER_ACCESS.generation;
    DEVELOPER_ACCESS.pending = (async () => {
        try {
            const response = await developerAccessRequest();
            if (generation !== DEVELOPER_ACCESS.generation) return false;
            if (response.ok) return true;
            clearDeveloperAccess();
            if (response.status === 401) showDeveloperSignIn();
        } catch (_) {
            if (generation !== DEVELOPER_ACCESS.generation) return false;
            clearDeveloperAccess();
            showDeveloperSignIn(developerAccessText('developerAccessUnavailable'));
        }
        return false;
    })();
    try { return await DEVELOPER_ACCESS.pending; } finally { DEVELOPER_ACCESS.pending = null; }
}

window.WardogsDeveloperAccess = Object.freeze({
    verify: verifyDeveloperAccess,
    disable: disableDeveloperMode,
    isAuthorized: () => DEVELOPER_ACCESS.active && Date.now() < DEVELOPER_ACCESS.expiresAt
});

async function initDeveloperMode() {
    let saved = null;
    try { saved = localStorage.getItem(DEVELOPER_MODE_STORAGE_KEY); } catch (_) {}
    if (new URLSearchParams(window.location.search).get('dev') === '0') {
        disableDeveloperMode();
        return;
    }
    if (!developerModePreference(window.location.search, saved)) return;
    const generation = DEVELOPER_ACCESS.generation;
    try {
        const response = await developerAccessRequest();
        if (generation !== DEVELOPER_ACCESS.generation) return;
        if (response.status === 401) return showDeveloperSignIn();
        if (response.status === 403) { clearDeveloperAccess(); return; }
        if (!response.ok) throw new Error('unavailable');
        await loadDeveloperMenu(await response.json(), generation);
    } catch (_) {
        if (generation !== DEVELOPER_ACCESS.generation) return;
        clearDeveloperAccess();
        showDeveloperSignIn(developerAccessText('developerAccessUnavailable'));
    }
}
