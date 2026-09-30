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
    regionalFallback: false
};

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
        source.origin !==
            getAssetGatewayOrigin() ||
        !shouldUseDirectAssetOrigin()
    ) {
        return source.href;
    }

    const directOrigin =
        getAssetDirectOrigin();

    if (!directOrigin) {
        return source.href;
    }

    const target =
        new URL(
            source.pathname +
                source.search +
                source.hash,
            directOrigin
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
                    8000
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

    callback(value);
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

    if (!document.getElementById(
        'assetAccessTurnstile'
    )) {
        const holder =
            document.createElement('div');

        holder.id =
            'assetAccessTurnstile';
        holder.setAttribute(
            'aria-hidden',
            'true'
        );
        document.body.appendChild(holder);
    }

    if (
        ASSET_ACCESS_STATE.turnstileWidget === null
    ) {
        ASSET_ACCESS_STATE.turnstileWidget =
            window.turnstile.render(
                '#assetAccessTurnstile',
                {
                    sitekey:
                        challenge.siteKey,
                    action:
                        challenge.action ||
                        'asset-session',
                    execution: 'execute',
                    retry: 'never',
                    'refresh-expired': 'manual',
                    callback: token =>
                        settleAssetChallenge(
                            'resolve',
                            token
                        ),
                    'error-callback': () =>
                        settleAssetChallenge(
                            'reject',
                            new Error(
                                'turnstile-unavailable'
                            )
                        ),
                    'expired-callback': () =>
                        settleAssetChallenge(
                            'reject',
                            new Error(
                                'turnstile-expired'
                            )
                        )
                }
            );
    } else if (window.turnstile.reset) {
        window.turnstile.reset(
            ASSET_ACCESS_STATE.turnstileWidget
        );
    }

    return new Promise((resolve, reject) => {
        ASSET_ACCESS_STATE.challengeResolve =
            resolve;
        ASSET_ACCESS_STATE.challengeReject =
            reject;
        ASSET_ACCESS_STATE.challengeTimer =
            window.setTimeout(
                () =>
                    settleAssetChallenge(
                        'reject',
                        new Error(
                            'turnstile-timeout'
                        )
                    ),
                12000
            );

        window.turnstile.execute(
            ASSET_ACCESS_STATE.turnstileWidget
        );
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
        throw new Error(
            data.error ||
            `asset-session-http-${response.status}`
        );
    }

    rememberAssetSession(data);
    return true;
}

async function probeAssetSession() {
    const response =
        await fetch(
            assetSessionURL(),
            {
                method: 'GET',
                credentials: 'include',
                cache: 'no-store',
                referrerPolicy: 'no-referrer',
                signal:
                    AbortSignal.timeout(8000)
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
                    AbortSignal.timeout(10000)
            }
        );

    return parseAssetSessionResponse(
        response
    );
}

async function ensureAssetAccess({
    force = false
} = {}) {
    if (!isAssetGatewayEnabled()) {
        return true;
    }

    if (!force && hasValidAssetAccess()) {
        return true;
    }

    if (ASSET_ACCESS_STATE.pending) {
        return ASSET_ACCESS_STATE.pending;
    }

    ASSET_ACCESS_STATE.pending =
        (async () => {
            if (!force) {
                try {
                    const reused =
                        await probeAssetSession();

                    if (
                        reused &&
                        (
                            !usesPreclearanceAssetDelivery() ||
                            ASSET_ACCESS_STATE.mode ===
                                'restricted'
                        )
                    ) {
                        return true;
                    }
                } catch (error) {
                    if (
                        !/^asset-session-http-5/.test(
                            error?.message || ''
                        )
                    ) {
                        console.info(
                            '[asset-access] Existing session could not be reused.',
                            error
                        );
                    }
                }
            }

            return createAssetSession();
        })()
            .catch(error => {
                ASSET_ACCESS_STATE.expiresAt = 0;
                ASSET_ACCESS_STATE.mode = '';

                console.warn(
                    '[asset-access] Protected map assets are unavailable.',
                    error
                );

                return false;
            })
            .finally(() => {
                ASSET_ACCESS_STATE.pending = null;
            });

    return ASSET_ACCESS_STATE.pending;
}

function refreshAssetAccess() {
    return ensureAssetAccess({
        force: true
    });
}

async function recoverAssetAccessAfterFailure() {
    if (!isAssetGatewayEnabled()) {
        return false;
    }

    const now = Date.now();

    if (
        now -
            ASSET_ACCESS_STATE.lastFailureRefresh <
        30000
    ) {
        return false;
    }

    ASSET_ACCESS_STATE.lastFailureRefresh = now;
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

    await ensureAssetAccess();

    const requestOptions = {
        ...options,
        credentials: 'include',
        referrerPolicy: 'no-referrer'
    };

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
        if (!await refreshAssetAccess()) {
            throw error;
        }

        requestUrl =
            resolveProtectedAssetURL(
                sourceUrl
            );

        return fetch(
            requestUrl,
            requestOptions
        );
    }

    if (
        response.status === 401 ||
        response.status === 403
    ) {
        if (await refreshAssetAccess()) {
            requestUrl =
                resolveProtectedAssetURL(
                    sourceUrl
                );

            response =
                await fetch(
                    requestUrl,
                    requestOptions
                );
        }
    }

    return response;
}

async function initializeAssetAccess() {
    showLocalAssetWarning();
    return ensureAssetAccess();
}
