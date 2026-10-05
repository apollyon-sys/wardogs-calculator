/* =========================
   PROTECTED ASSET ACCESS
   ========================= */

const ASSET_ACCESS_STATE = {
    expiresAt: 0,
    mode: '',
    pending: null,
    refreshTimer: null,
    turnstileLoader: null,
    turnstileWidget: null,
    challengeResolve: null,
    challengeReject: null,
    challengeTimer: null,
    lastFailureRefresh: 0,
    regionalFallback: false,
    stage: 'idle',
    retryAt: 0,
    retryTimer: null,
    noticeTimer: null,
    automaticRetries: 0,
    awaitingRetry: false,
    lastError: null,
    failureGeneration: 0,
    retryListeners: new Set(),
    environmentListenersAdded: false,
    lastEnvironmentRetry: 0,
    failureTelemetryKey: ''
};

const ASSET_RETRY_DELAY_MS = 10000;
const ASSET_AUTOMATIC_RETRIES = 2;
const ASSET_SESSION_TIMEOUT_MS = 30000;
const ASSET_TURNSTILE_SCRIPT_TIMEOUT_MS = 30000;
const ASSET_CHALLENGE_TIMEOUT_MS = 60000;

function assetAccessText(key, fallback) {
    const translated = typeof tr === 'function' ? tr(key) : '';
    return translated && translated !== key ? translated : fallback;
}

function assetFailureCode(error) {
    const message = String(error?.message || '');
    if (/^(turnstile-(?:unavailable|not-configured|expired|timeout|unsupported|\d{3,8})|asset-session-(?:invalid|http-\d{3})|asset-http-\d{3}|session-cookie-unavailable|session-required|gateway-not-configured|challenge-(?:required|unavailable|failed)|rate-limited|forbidden-origin|unavailable)$/.test(message)) {
        return message;
    }
    if (error?.name === 'TimeoutError') return 'timeout';
    if (error?.name === 'TypeError') return 'network-or-cors';
    return 'unavailable';
}

function assetFailureContext(error, stage, url = '') {
    error.stage = stage;
    if (url) {
        try { error.requestHost = new URL(url).hostname; } catch { /* No URL data in diagnostics. */ }
    }
    return error;
}

function invalidateAssetSession() {
    ASSET_ACCESS_STATE.expiresAt = 0;
    clearAssetRefreshTimer();
}

/* Explicit allowlist: never expose cookies, tokens or the response body. */
function getAssetAccessDiagnostics() {
    const state = ASSET_ACCESS_STATE;
    const error = state.lastError;
    const response = error?.response;
    return {
        enabled: isAssetGatewayEnabled(),
        configuredMode: getAssetGatewayMode(),
        stage: state.stage,
        sessionMode: state.mode || null,
        deliveryOrigin: shouldUseDirectAssetOrigin()
            ? getAssetDirectOrigin() : getAssetGatewayOrigin(),
        sessionValid: hasValidAssetAccess(),
        expiresAt: state.expiresAt || null,
        pending: Boolean(state.pending),
        regionalFallback: state.regionalFallback,
        paused: isAssetAccessPaused(),
        awaitingManualRetry: state.awaitingRetry,
        retryAt: state.retryAt || null,
        automaticRetries: state.automaticRetries,
        lastFailure: error ? {
            stage: error.stage || state.stage,
            code: assetFailureCode(error),
            requestHost: error.requestHost || null,
            status: error.status || response?.status || null,
            name: error.name || 'Error',
            cfRay: response?.headers?.get('CF-Ray') || null,
            mitigation: response?.headers?.get('CF-Mitigated') || null,
            retryAfter: response?.headers?.get('Retry-After') || null
        } : null
    };
}

function assetRetryAfter(response, fallbackMs = ASSET_RETRY_DELAY_MS) {
    const value = response?.headers?.get('Retry-After')?.trim();
    const seconds = value && /^\d+(?:\.\d+)?$/.test(value)
        ? Number(value)
        : NaN;
    const date = value && !Number.isFinite(seconds)
        ? Date.parse(value)
        : NaN;

    return Math.max(
        Date.now() + fallbackMs,
        Number.isFinite(seconds)
            ? Date.now() + seconds * 1000
            : Number.isFinite(date) ? date : 0
    );
}

function getAssetAccessRetryAt() {
    return ASSET_ACCESS_STATE.awaitingRetry
        ? Infinity
        : ASSET_ACCESS_STATE.retryAt;
}

function isAssetAccessPaused() {
    return getAssetAccessRetryAt() > Date.now();
}

function onAssetAccessRetry(listener) {
    ASSET_ACCESS_STATE.retryListeners.add(listener);
}

function resumeAssetLoads() {
    for (const listener of ASSET_ACCESS_STATE.retryListeners) {
        listener();
    }
}

function assetAccessBlockedError() {
    const error = new Error('asset-access-paused');
    error.status = ASSET_ACCESS_STATE.lastError?.status || 0;
    error.retryAt = getAssetAccessRetryAt();
    error.retryable = true;
    return error;
}

function assetResponseError(response, message = `asset-http-${response.status}`) {
    const error = new Error(message);
    error.status = response.status;
    error.response = response;
    error.retryable = response.status === 401 || response.status === 403 ||
        response.status === 408 || response.status === 425 ||
        response.status === 429 || response.status >= 500;
    return error;
}

function reportAssetAccessFailure(error) {
    if (typeof trackAnalytics !== 'function') return;
    const code = assetFailureCode(error);
    const key = `${error.stage}:${code}:${error.requestHost || ''}:${error.status || 0}`;
    if (ASSET_ACCESS_STATE.failureTelemetryKey === key) return;
    ASSET_ACCESS_STATE.failureTelemetryKey = key;
    try {
        trackAnalytics('asset-access-failed', {
            build: typeof getAnalyticsBuildId === 'function' ? getAnalyticsBuildId() : '',
            area: 'asset-access',
            type: error.stage === 'asset-fetch' ? 'delivery' : 'session',
            phase: error.stage,
            code,
            resource: error.requestHost || '',
            map: typeof S === 'object' ? S?.map : '',
            status: error.status,
            attempts: ASSET_ACCESS_STATE.automaticRetries + 1
        });
    } catch {
        // Diagnostics must not interrupt map recovery.
    }
}

function pauseAssetAccess(error, response = null) {
    if (!error.stage) error.stage = ASSET_ACCESS_STATE.stage;
    const delay = Math.min(
        60000,
        ASSET_RETRY_DELAY_MS * 2 ** ASSET_ACCESS_STATE.automaticRetries
    );
    const retryAt = assetRetryAfter(response, Math.max(
        delay,
        error.status === 401 || error.status === 403 ? 30000 : 0
    ));

    // Concurrent failures share a deadline and one recovery attempt.
    ASSET_ACCESS_STATE.retryAt = Math.max(ASSET_ACCESS_STATE.retryAt, retryAt);
    ASSET_ACCESS_STATE.lastError = error;
    reportAssetAccessFailure(error);
    ASSET_ACCESS_STATE.failureGeneration++;
    ASSET_ACCESS_STATE.awaitingRetry =
        ASSET_ACCESS_STATE.automaticRetries >= ASSET_AUTOMATIC_RETRIES;
    error.retryable = true;
    error.retryAt = getAssetAccessRetryAt();

    window.clearTimeout(ASSET_ACCESS_STATE.retryTimer);
    ASSET_ACCESS_STATE.retryTimer = window.setTimeout(() => {
        ASSET_ACCESS_STATE.retryTimer = null;
        if (ASSET_ACCESS_STATE.retryAt > Date.now()) {
            return;
        }
        updateAssetAccessNotice();
        if (window.navigator?.onLine === false || document.visibilityState === 'hidden') {
            return;
        }
        if (!ASSET_ACCESS_STATE.awaitingRetry) {
            ASSET_ACCESS_STATE.automaticRetries++;
            resumeAssetLoads();
        }
    }, Math.min(2147483647, ASSET_ACCESS_STATE.retryAt - Date.now()));

    updateAssetAccessNotice();
    return error;
}

function clearAssetAccessFailure() {
    if (isAssetAccessPaused()) {
        return;
    }
    if (ASSET_ACCESS_STATE.lastError && typeof trackAnalytics === 'function') {
        try {
            trackAnalytics('asset-access-recovered', {
                mode: ASSET_ACCESS_STATE.mode,
                map: typeof S === 'object' ? S?.map : ''
            });
        } catch {
            // Loading must work even when analytics is unavailable.
        }
    }
    ASSET_ACCESS_STATE.lastError = null;
    ASSET_ACCESS_STATE.failureTelemetryKey = '';
    ASSET_ACCESS_STATE.retryAt = 0;
    ASSET_ACCESS_STATE.automaticRetries = 0;
    window.clearTimeout(ASSET_ACCESS_STATE.retryTimer);
    window.clearTimeout(ASSET_ACCESS_STATE.noticeTimer);
    ASSET_ACCESS_STATE.retryTimer = null;
    ASSET_ACCESS_STATE.noticeTimer = null;
    updateAssetAccessNotice();
}

async function retryAssetAccess() {
    if (Date.now() < ASSET_ACCESS_STATE.retryAt) {
        return false;
    }
    ASSET_ACCESS_STATE.awaitingRetry = false;
    ASSET_ACCESS_STATE.retryAt = 0;
    ASSET_ACCESS_STATE.automaticRetries = 0;
    ASSET_ACCESS_STATE.expiresAt = 0;
    const pending = ensureAssetAccess();
    updateAssetAccessNotice();
    const allowed = await pending;
    if (allowed) {
        resumeAssetLoads();
    }
    updateAssetAccessNotice();
    return allowed;
}

function retryAssetAccessAfterEnvironmentChange() {
    const now = Date.now();
    if (!ASSET_ACCESS_STATE.lastError || ASSET_ACCESS_STATE.pending ||
        window.navigator?.onLine === false || document.visibilityState === 'hidden' ||
        now < ASSET_ACCESS_STATE.retryAt ||
        now - ASSET_ACCESS_STATE.lastEnvironmentRetry < 60000) {
        return;
    }
    ASSET_ACCESS_STATE.lastEnvironmentRetry = now;
    void retryAssetAccess();
}

function initializeAssetAccessRecovery() {
    if (ASSET_ACCESS_STATE.environmentListenersAdded) return;
    ASSET_ACCESS_STATE.environmentListenersAdded = true;
    window.addEventListener?.('online', retryAssetAccessAfterEnvironmentChange);
    window.addEventListener?.('focus', retryAssetAccessAfterEnvironmentChange);
    document.addEventListener?.('visibilitychange', retryAssetAccessAfterEnvironmentChange);
}

function updateAssetAccessNotice() {
    window.clearTimeout(ASSET_ACCESS_STATE.noticeTimer);
    ASSET_ACCESS_STATE.noticeTimer = null;
    let notice = document.getElementById('assetAccessNotice');

    const pending = Boolean(ASSET_ACCESS_STATE.pending);
    if (!ASSET_ACCESS_STATE.lastError && !pending) {
        if (notice) notice.hidden = true;
        return;
    }
    // The existing local-copy warning already explains this case.
    if (shouldShowLocalAssetWarning()) {
        return;
    }
    if (!notice) {
        const map = document.querySelector('.map');
        if (!map) return;
        notice = document.createElement('aside');
        notice.id = 'assetAccessNotice';
        notice.className = 'local-asset-warning asset-access-notice';
        const content = document.createElement('div');
        content.className = 'local-asset-warning-content';
        const title = document.createElement('strong');
        title.setAttribute('role', 'status');
        title.setAttribute('aria-live', 'polite');
        const message = document.createElement('p');
        const retry = document.createElement('button');
        retry.type = 'button';
        retry.addEventListener('click', () => { void retryAssetAccess(); });
        content.append(title, message, retry);
        notice.append(content);
        map.append(notice);
    }

    const text = assetAccessText;
    const seconds = Math.max(0, Math.ceil(
        (ASSET_ACCESS_STATE.retryAt - Date.now()) / 1000
    ));
    notice.hidden = false;
    const title = notice.querySelector('strong');
    const titleText = pending
        ? text('assetAccessLoading', 'Loading the map…')
        : text('assetAccessUnavailable', 'Map loading is temporarily unavailable');
    // Keep the live-region text stable while the silent countdown updates.
    if (title.textContent !== titleText) title.textContent = titleText;
    notice.querySelector('p').textContent = pending
        ? text('assetAccessLoadingHint', 'Please wait. You can continue using the calculator.')
        : seconds
            ? text('assetAccessWaiting', 'Try again in {seconds} s.').replace('{seconds}', seconds)
            : text('assetAccessRetryHint', 'Retry loading the map and terrain data.');
    const retry = notice.querySelector('button');
    retry.hidden = pending;
    retry.disabled = seconds > 0 || Boolean(ASSET_ACCESS_STATE.pending);
    retry.textContent = text('assetAccessRetry', 'Retry loading');
    if (seconds > 0 || ASSET_ACCESS_STATE.pending) {
        ASSET_ACCESS_STATE.noticeTimer = window.setTimeout(updateAssetAccessNotice, 1000);
    }
}

const LOCAL_ASSET_DOCUMENTATION_URL =
    'https://github.com/apollyon-sys/wardogs-calculator/blob/main/docs/cdn.md#forks-and-self-hosted-deployments';

const LOCAL_ASSET_WARNING_SESSION_KEY =
    'wardogs-local-asset-warning-dismissed';

function isLocalAssetWarningDismissed() {
    try {
        return sessionStorage.getItem(
            LOCAL_ASSET_WARNING_SESSION_KEY
        ) === 'true';
    } catch {
        return false;
    }
}

function dismissLocalAssetWarning(warning) {
    try {
        sessionStorage.setItem(
            LOCAL_ASSET_WARNING_SESSION_KEY,
            'true'
        );
    } catch {
        /* Closing must still work when session storage is unavailable. */
    }

    warning.remove();
}

function isLocalAssetCopyHost(value = window.location.hostname) {
    const hostname = String(value || '')
        .trim()
        .toLowerCase()
        .replace(/^\[|\]$/g, '');

    if (
        hostname === 'localhost' ||
        hostname === '::1' ||
        hostname.endsWith('.localhost') ||
        hostname.endsWith('.local')
    ) {
        return true;
    }

    const match = hostname.match(
        /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/
    );

    if (!match) {
        return false;
    }

    const octets = match.slice(1).map(Number);
    if (octets.some(octet => octet > 255)) {
        return false;
    }

    return (
        octets[0] === 10 ||
        octets[0] === 127 ||
        (
            octets[0] === 172 &&
            octets[1] >= 16 &&
            octets[1] <= 31
        ) ||
        (
            octets[0] === 192 &&
            octets[1] === 168
        )
    );
}

function shouldShowLocalAssetWarning() {
    if (!isLocalAssetCopyHost()) {
        return false;
    }

    return [
        getAssetGatewayOrigin(),
        getAssetDirectOrigin()
    ].some(origin =>
        origin ===
            'https://assets.wardogs-artillery.com' ||
        origin ===
            'https://assets-v2.wardogs-artillery.com'
    );
}

function showLocalAssetWarning() {
    if (
        !shouldShowLocalAssetWarning() ||
        isLocalAssetWarningDismissed() ||
        document.getElementById(
            'localAssetWarning'
        )
    ) {
        return;
    }

    const map =
        document.querySelector('.map');

    if (!map) {
        return;
    }

    const warning =
        document.createElement('aside');
    warning.id = 'localAssetWarning';
    warning.className = 'local-asset-warning';
    warning.setAttribute('role', 'alert');
    warning.setAttribute('aria-live', 'polite');

    const icon =
        document.createElement('span');
    icon.className = 'local-asset-warning-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = '⚠';

    const content =
        document.createElement('div');
    content.className = 'local-asset-warning-content';

    const title =
        document.createElement('strong');
    title.textContent =
        tr('localAssetWarningTitle');

    const body =
        document.createElement('p');
    body.textContent =
        tr('localAssetWarningBody');

    const link =
        document.createElement('a');
    link.href = LOCAL_ASSET_DOCUMENTATION_URL;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent =
        tr('localAssetWarningLink');

    const close =
        document.createElement('button');
    const closeLabel =
        tr('localAssetWarningClose');
    close.type = 'button';
    close.className =
        'local-asset-warning-close';
    close.title = closeLabel;
    close.setAttribute(
        'aria-label',
        closeLabel
    );
    close.textContent = '×';
    close.addEventListener(
        'click',
        () => dismissLocalAssetWarning(
            warning
        )
    );

    content.append(title, body, link);
    warning.append(icon, content, close);
    map.appendChild(warning);
}

function getAssetGatewayConfig() {
    return (
        APP_CONFIG?.assetGateway ||
        DEFAULT_APP_CONFIG.assetGateway
    );
}

function getAssetGatewayMode() {
    const mode =
        String(
            getAssetGatewayConfig()
                ?.mode ||
            'session-cookie'
        )
            .trim()
            .toLowerCase();

    return (
        mode === 'preclearance'
            ? 'preclearance'
            : 'session-cookie'
    );
}

function normalizeAssetOrigin(value) {
    const normalized =
        normalizeConfiguredHttpUrl(
            value,
            {
                allowLocalhost: true,
                allowSearchAndHash: false
            }
        );

    if (!normalized) {
        return '';
    }

    try {
        return new URL(
            normalized
        ).origin;
    } catch {
        return '';
    }
}

function getAssetGatewayOrigin() {
    return normalizeAssetOrigin(
        getAssetGatewayConfig()
            ?.origin
    );
}

function getAssetDirectOrigin() {
    return normalizeAssetOrigin(
        getAssetGatewayConfig()
            ?.directOrigin
    );
}

function isAssetGatewayEnabled() {
    const config =
        getAssetGatewayConfig();

    if (
        config?.enabled !== true ||
        !getAssetGatewayOrigin()
    ) {
        return false;
    }

    return (
        getAssetGatewayMode() !==
            'preclearance' ||
        Boolean(
            getAssetDirectOrigin()
        )
    );
}

function usesPreclearanceAssetDelivery() {
    return (
        isAssetGatewayEnabled() &&
        getAssetGatewayMode() ===
            'preclearance'
    );
}

function isProtectedAssetURL(value) {
    try {
        const origin =
            new URL(
                value,
                document.baseURI
            ).origin;

        return [
            getAssetGatewayOrigin(),
            getAssetDirectOrigin()
        ]
            .filter(Boolean)
            .includes(origin);
    } catch {
        return false;
    }
}

function shouldUseDirectAssetOrigin() {
    return (
        usesPreclearanceAssetDelivery() &&
        ASSET_ACCESS_STATE.mode ===
            'standard' &&
        !ASSET_ACCESS_STATE.regionalFallback
    );
}

function resolveProtectedAssetURL(value) {
    let source;

    try {
        source = new URL(
            value,
            document.baseURI
        );
    } catch {
        return value;
    }

    if (
        !isProtectedAssetURL(source.href) ||
        !isAssetGatewayEnabled()
    ) {
        return source.href;
    }

    const deliveryOrigin = shouldUseDirectAssetOrigin()
        ? getAssetDirectOrigin()
        : getAssetGatewayOrigin();

    if (!deliveryOrigin) {
        return source.href;
    }

    const target =
        new URL(
            source.pathname +
                source.search +
                source.hash,
            deliveryOrigin
        );

    return target.href;
}

function hasValidAssetAccess() {
    return (
        !isAssetGatewayEnabled() ||
        ASSET_ACCESS_STATE.expiresAt >
            Date.now() + 15000
    );
}

function assetSessionURL() {
    const config =
        getAssetGatewayConfig();

    const origin =
        normalizeConfiguredHttpUrl(
            config.origin,
            {
                allowLocalhost: true,
                allowSearchAndHash: false
            }
        );

    if (!origin) {
        throw new Error(
            'asset-gateway-not-configured'
        );
    }

    const path =
        String(
            config.sessionPath ||
            '/__session'
        );

    if (
        !path.startsWith('/') ||
        path.includes('..') ||
        /[?#]/.test(path)
    ) {
        throw new Error(
            'asset-session-path-invalid'
        );
    }

    return new URL(
        path,
        origin
    ).href;
}

function clearAssetRefreshTimer() {
    if (ASSET_ACCESS_STATE.refreshTimer) {
        window.clearTimeout(
            ASSET_ACCESS_STATE.refreshTimer
        );
    }

    ASSET_ACCESS_STATE.refreshTimer = null;
}

function rememberAssetSession(data) {
    const expiresAt =
        Number(data?.expiresAt || 0);

    if (
        !Number.isFinite(expiresAt) ||
        expiresAt <= Date.now()
    ) {
        throw new Error(
            'asset-session-invalid'
        );
    }

    ASSET_ACCESS_STATE.expiresAt =
        expiresAt;

    ASSET_ACCESS_STATE.mode =
        data.mode === 'restricted'
            ? 'restricted'
            : 'standard';

    ASSET_ACCESS_STATE.regionalFallback =
        ASSET_ACCESS_STATE.mode ===
            'restricted';

    clearAssetRefreshTimer();

    const delay =
        Math.max(
            30000,
            expiresAt - Date.now() - 60000
        );

    ASSET_ACCESS_STATE.refreshTimer =
        window.setTimeout(
            () => {
                refreshAssetAccess()
                    .catch(error => {
                        console.warn(
                            '[asset-access] Session refresh failed.',
                            error
                        );
                    });
            },
            delay
        );
}

function assetChallengeConfig() {
    return (
        getAssetGatewayConfig()
            ?.turnstile ||
        {}
    );
}

function loadAssetTurnstile() {
    if (window.turnstile) {
        return Promise.resolve();
    }

    if (ASSET_ACCESS_STATE.turnstileLoader) {
        return ASSET_ACCESS_STATE.turnstileLoader;
    }

    ASSET_ACCESS_STATE.turnstileLoader =
        new Promise((resolve, reject) => {
            let settled = false;

            const finish = (
                callback,
                value
            ) => {
                if (settled) {
                    return;
                }

                settled = true;
                window.clearTimeout(timer);
                callback(value);
            };

            const timer =
                window.setTimeout(
                    () => finish(
                        reject,
                        new Error(
                            'turnstile-unavailable'
                        )
                    ),
                    ASSET_TURNSTILE_SCRIPT_TIMEOUT_MS
                );

            const existing =
                document.querySelector(
                    'script[data-wardogs-turnstile]'
                );

            if (existing) {
                existing.addEventListener(
                    'load',
                    () => finish(resolve),
                    { once: true }
                );
                existing.addEventListener(
                    'error',
                    () => finish(
                        reject,
                        new Error(
                            'turnstile-unavailable'
                        )
                    ),
                    { once: true }
                );
                return;
            }

            const script =
                document.createElement(
                    'script'
                );

            script.src =
                'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
            script.async = true;
            script.defer = true;
            script.dataset.wardogsTurnstile = '1';
            script.addEventListener(
                'load',
                () => finish(resolve),
                { once: true }
            );
            script.addEventListener(
                'error',
                () => finish(
                    reject,
                    new Error(
                        'turnstile-unavailable'
                    )
                ),
                { once: true }
            );

            document.head.appendChild(
                script
            );
        }).catch(error => {
            ASSET_ACCESS_STATE.turnstileLoader = null;
            document.querySelector('script[data-wardogs-turnstile]')?.remove();
            throw error;
        });

    return ASSET_ACCESS_STATE.turnstileLoader;
}

function settleAssetChallenge(
    method,
    value
) {
    const callback =
        method === 'resolve'
            ? ASSET_ACCESS_STATE.challengeResolve
            : ASSET_ACCESS_STATE.challengeReject;

    if (!callback) {
        return;
    }

    window.clearTimeout(
        ASSET_ACCESS_STATE.challengeTimer
    );

    ASSET_ACCESS_STATE.challengeResolve = null;
    ASSET_ACCESS_STATE.challengeReject = null;
    ASSET_ACCESS_STATE.challengeTimer = null;

    const panel = document.getElementById('assetAccessChallenge');
    if (panel) panel.hidden = true;

    callback(value);
}

function assetChallengePanel() {
    let panel = document.getElementById('assetAccessChallenge');
    if (!panel) {
        panel = document.createElement('aside');
        panel.id = 'assetAccessChallenge';
        panel.className = 'asset-access-challenge';
        const title = document.createElement('strong');
        title.setAttribute('role', 'status');
        title.setAttribute('aria-live', 'polite');
        const hint = document.createElement('p');
        const holder = document.createElement('div');
        holder.id = 'assetAccessTurnstile';
        panel.append(title, hint, holder);
        (document.querySelector('.map') || document.body).appendChild(panel);
    }
    panel.querySelector('strong').textContent = assetAccessText(
        'assetAccessVerificationTitle', 'Verify to load the map'
    );
    panel.querySelector('p').textContent = assetAccessText(
        'assetAccessVerificationHint', 'Complete the check below to continue loading.'
    );
    return panel;
}

function setAssetChallengeInteractive(interactive) {
    const panel = document.getElementById('assetAccessChallenge');
    if (!panel) return;
    panel.classList.toggle('is-interactive', interactive);
    panel.querySelector('strong').hidden = !interactive;
    panel.querySelector('p').hidden = !interactive;
}

async function requestAssetChallenge() {
    const challenge =
        assetChallengeConfig();

    if (
        challenge.enabled !== true ||
        typeof challenge.siteKey !== 'string' ||
        !challenge.siteKey.trim()
    ) {
        throw new Error(
            'turnstile-not-configured'
        );
    }

    ASSET_ACCESS_STATE.stage = 'turnstile-script';
    await loadAssetTurnstile();

    if (
        !window.turnstile ||
        typeof window.turnstile.render !== 'function' ||
        typeof window.turnstile.execute !== 'function'
    ) {
        throw new Error(
            'turnstile-unavailable'
        );
    }

    ASSET_ACCESS_STATE.stage = 'turnstile-challenge';
    const panel = assetChallengePanel();
    setAssetChallengeInteractive(false);
    // Let Turnstile control its own visibility while running automatically.
    // The panel is styled and announced only if interaction is required.
    panel.hidden = false;

    return new Promise((resolve, reject) => {
        ASSET_ACCESS_STATE.challengeResolve = resolve;
        ASSET_ACCESS_STATE.challengeReject = reject;
        ASSET_ACCESS_STATE.challengeTimer = window.setTimeout(
            () => settleAssetChallenge('reject', new Error('turnstile-timeout')),
            ASSET_CHALLENGE_TIMEOUT_MS
        );
        try {
            if (ASSET_ACCESS_STATE.turnstileWidget === null) {
                ASSET_ACCESS_STATE.turnstileWidget = window.turnstile.render(
                    '#assetAccessTurnstile',
                    {
                        sitekey:
                            challenge.siteKey,
                        action:
                            challenge.action ||
                            'asset-session',
                        execution: 'execute',
                        appearance: 'interaction-only',
                        size: 'compact',
                        'response-field': false,
                        retry: 'never',
                        'refresh-expired': 'manual',
                        'refresh-timeout': 'manual',
                        callback: token =>
                            settleAssetChallenge(
                                'resolve',
                                token
                            ),
                        'error-callback': code =>
                            settleAssetChallenge(
                                'reject',
                                new Error(
                                    /^\d{3,8}$/.test(String(code))
                                        ? `turnstile-${code}` : 'turnstile-unavailable'
                                )
                            ),
                        'expired-callback': () =>
                            settleAssetChallenge(
                                'reject',
                                new Error(
                                    'turnstile-expired'
                                )
                            ),
                        'before-interactive-callback': () => {
                            if (ASSET_ACCESS_STATE.challengeResolve) setAssetChallengeInteractive(true);
                        },
                        'after-interactive-callback': () => setAssetChallengeInteractive(false),
                        'timeout-callback': () => settleAssetChallenge('reject', new Error('turnstile-timeout')),
                        'unsupported-callback': () => settleAssetChallenge('reject', new Error('turnstile-unsupported'))
                    }
                );
            } else if (window.turnstile.reset) {
                window.turnstile.reset(ASSET_ACCESS_STATE.turnstileWidget);
            }
            window.turnstile.execute(ASSET_ACCESS_STATE.turnstileWidget);
        } catch (error) {
            settleAssetChallenge('reject', error);
        }
    });
}

async function parseAssetSessionResponse(response) {
    let data = {};

    try {
        data = await response.json();
    } catch {
        data = {};
    }

    if (!response.ok) {
        throw assetResponseError(
            response,
            data.error ||
            `asset-session-http-${response.status}`
        );
    }

    rememberAssetSession(data);
    return true;
}

async function probeAssetSession(stage = 'session-probe') {
    ASSET_ACCESS_STATE.stage = stage;
    const response =
        await fetch(
            assetSessionURL(),
            {
                method: 'GET',
                credentials: 'include',
                cache: 'no-store',
                referrerPolicy: 'no-referrer',
                signal:
                    AbortSignal.timeout(ASSET_SESSION_TIMEOUT_MS)
            }
        );

    if (response.status === 401) {
        ASSET_ACCESS_STATE.regionalFallback =
            response.headers.get(
                'X-Wardogs-Asset-Fallback'
            ) === 'restricted';

        return false;
    }

    return parseAssetSessionResponse(
        response
    );
}

async function createAssetSession() {
    let challengeToken = '';

    if (!ASSET_ACCESS_STATE.regionalFallback) {
        challengeToken =
            await requestAssetChallenge();
    }

    ASSET_ACCESS_STATE.stage = 'session-create';
    const response =
        await fetch(
            assetSessionURL(),
            {
                method: 'POST',
                headers: {
                    'Content-Type':
                        'application/json'
                },
                body: JSON.stringify({
                    token: challengeToken
                }),
                credentials: 'include',
                cache: 'no-store',
                referrerPolicy: 'no-referrer',
                signal:
                    AbortSignal.timeout(ASSET_SESSION_TIMEOUT_MS)
            }
        );

    await parseAssetSessionResponse(response);
    if (ASSET_ACCESS_STATE.mode === 'restricted' &&
        !await probeAssetSession('session-confirm')) {
        const error = new Error('session-cookie-unavailable');
        error.status = 401;
        throw error;
    }
    return true;
}

async function ensureAssetAccess({
    force = false
} = {}) {
    if (!isAssetGatewayEnabled()) {
        return true;
    }

    if (isAssetAccessPaused()) {
        return false;
    }

    if (ASSET_ACCESS_STATE.pending) {
        return ASSET_ACCESS_STATE.pending;
    }

    if (!force && hasValidAssetAccess()) {
        return true;
    }

    ASSET_ACCESS_STATE.pending =
        (async () => {
            // Re-probe even on a forced refresh: the connection/region may
            // have changed, and the server decides the permitted delivery path.
            const reused = await probeAssetSession();

            if (
                reused &&
                (!usesPreclearanceAssetDelivery() ||
                    ASSET_ACCESS_STATE.mode === 'restricted')
            ) {
                ASSET_ACCESS_STATE.stage = 'ready';
                return true;
            }

            const created = await createAssetSession();
            ASSET_ACCESS_STATE.stage = 'ready';
            return created;
        })()
            .catch(error => {
                ASSET_ACCESS_STATE.expiresAt = 0;
                ASSET_ACCESS_STATE.mode = '';
                clearAssetRefreshTimer();
                pauseAssetAccess(assetFailureContext(error, ASSET_ACCESS_STATE.stage, assetSessionURL()), error.response);

                console.warn(
                    '[asset-access] Protected map assets are unavailable.',
                    error
                );

                return false;
            })
            .finally(() => {
                ASSET_ACCESS_STATE.pending = null;
                updateAssetAccessNotice();
            });

    updateAssetAccessNotice();
    return ASSET_ACCESS_STATE.pending;
}

function refreshAssetAccess() {
    return ensureAssetAccess({
        force: true
    });
}

async function recoverAssetAccessAfterFailure() {
    if (!isAssetGatewayEnabled() || isAssetAccessPaused()) {
        return false;
    }

    if (ASSET_ACCESS_STATE.pending) {
        return ASSET_ACCESS_STATE.pending;
    }

    const now = Date.now();

    if (
        now -
            ASSET_ACCESS_STATE.lastFailureRefresh <
        30000
    ) {
        return hasValidAssetAccess();
    }

    ASSET_ACCESS_STATE.lastFailureRefresh = now;
    ASSET_ACCESS_STATE.expiresAt = 0;
    return refreshAssetAccess();
}

async function fetchAssetResource(
    input,
    options = {}
) {
    const sourceUrl =
        new URL(
            input,
            document.baseURI
        ).href;

    if (!isProtectedAssetURL(sourceUrl)) {
        return fetch(
            sourceUrl,
            options
        );
    }

    if (!await ensureAssetAccess()) {
        throw assetAccessBlockedError();
    }

    if (isAssetAccessPaused()) {
        throw assetAccessBlockedError();
    }

    const requestOptions = {
        ...options,
        credentials: 'include',
        referrerPolicy: 'no-referrer'
    };
    const generation = ASSET_ACCESS_STATE.failureGeneration;

    let requestUrl =
        resolveProtectedAssetURL(
            sourceUrl
        );

    let response;

    try {
        response =
            await fetch(
                requestUrl,
                requestOptions
            );
    } catch (error) {
        if (error.name === 'AbortError' || options.signal?.aborted) {
            throw error;
        }
        // A WAF response without CORS headers also appears as a network
        // error. Do not launch new challenges or immediate request loops.
        // Re-check admission after the shared cooldown. A CORS-blocked WAF
        // response cannot be distinguished from a transport failure here.
        invalidateAssetSession();
        throw pauseAssetAccess(assetFailureContext(error, 'asset-fetch', requestUrl));
    }

    if (
        response.status === 401 ||
        response.status === 403
    ) {
        if (await recoverAssetAccessAfterFailure()) {
            if (isAssetAccessPaused()) {
                throw assetAccessBlockedError();
            }
            requestUrl =
                resolveProtectedAssetURL(
                    sourceUrl
                );

            try {
                response = await fetch(requestUrl, requestOptions);
            } catch (error) {
                if (error.name === 'AbortError' || options.signal?.aborted) {
                    throw error;
                }
                invalidateAssetSession();
                throw pauseAssetAccess(assetFailureContext(error, 'asset-fetch', requestUrl));
            }
        } else if (isAssetAccessPaused()) {
            throw assetAccessBlockedError();
        }
    }

    if (
        response.status === 401 || response.status === 403 ||
        response.status === 408 || response.status === 425 ||
        response.status === 429 || response.status >= 500
    ) {
        throw pauseAssetAccess(assetFailureContext(assetResponseError(response), 'asset-fetch', requestUrl), response);
    }

    if (response.ok && generation === ASSET_ACCESS_STATE.failureGeneration) {
        clearAssetAccessFailure();
    }

    return response;
}

async function initializeAssetAccess() {
    showLocalAssetWarning();
    initializeAssetAccessRecovery();
    return ensureAssetAccess();
}
