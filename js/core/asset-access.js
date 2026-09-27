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

function getAssetGatewayConfig() {
    return (
        APP_CONFIG?.assetGateway ||
        DEFAULT_APP_CONFIG.assetGateway
    );
}

function isAssetGatewayEnabled() {
    const config =
        getAssetGatewayConfig();

    return (
        config?.enabled === true &&
        Boolean(
            normalizeConfiguredHttpUrl(
                config.origin,
                {
                    allowLocalhost: true,
                    allowSearchAndHash: false
                }
            )
        )
    );
}

function getAssetGatewayOrigin() {
    if (!isAssetGatewayEnabled()) {
        return '';
    }

    try {
        return new URL(
            getAssetGatewayConfig().origin
        ).origin;
    } catch {
        return '';
    }
}

function isProtectedAssetURL(value) {
    const protectedOrigin =
        getAssetGatewayOrigin();

    if (!protectedOrigin) {
        return false;
    }

    try {
        return new URL(
            value,
            document.baseURI
        ).origin === protectedOrigin;
    } catch {
        return false;
    }
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
        try {
            challengeToken =
                await requestAssetChallenge();
        } catch (error) {
            console.info(
                '[asset-access] Browser challenge unavailable; requesting restricted regional fallback.',
                error
            );
        }
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
                    if (await probeAssetSession()) {
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
    const url =
        new URL(
            input,
            document.baseURI
        ).href;

    if (!isProtectedAssetURL(url)) {
        return fetch(
            url,
            options
        );
    }

    await ensureAssetAccess();

    const requestOptions = {
        ...options,
        credentials: 'include',
        referrerPolicy: 'no-referrer'
    };

    let response =
        await fetch(
            url,
            requestOptions
        );

    if (
        response.status === 401 ||
        response.status === 403
    ) {
        if (await refreshAssetAccess()) {
            response =
                await fetch(
                    url,
                    requestOptions
                );
        }
    }

    return response;
}

async function initializeAssetAccess() {
    return ensureAssetAccess();
}
