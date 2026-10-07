/* =========================
   ANALYTICS
   ========================= */

/* GoatCounter receives fixed event paths, never arbitrary event properties. */
const ANALYTICS_QUEUE = [];
const ANALYTICS_MAX_QUEUE = 16;
const ANALYTICS_FLUSH_INTERVAL = 750;
const ANALYTICS_FLUSH_ATTEMPTS = 40;
const ANALYTICS_CALCULATION_DELAY = 900;
const ANALYTICS_CALCULATION_SAMPLE_RATE = 0.2;
const ANALYTICS_MAX_SESSION_KEYS = 128;
const ANALYTICS_SESSION_DEDUPE_KEY = 'wardogs-goatcounter-session-v1';
const ANALYTICS_SESSION_SAMPLE_KEY = 'wardogs-goatcounter-sample-v1';

const ANALYTICS_ALLOWED_EVENTS = new Set([
    'calculation', 'map-style-changed', 'target-saved', 'target-restored',
    'target-exported', 'targets-exported', 'targets-imported',
    'coordinate-search', 'fire-adjusted', 'terrain3d-toggle', 'contours-toggle',
    'ruler-used', 'drawing-created', 'zone-created', 'polygon-created',
    'user-marker-placed', 'map-changes-exported', 'map-changes-imported',
    'partner-click', 'donation-click', 'donation-dialog-opened',
    'feedback-opened', 'feedback-sent', 'feedback-failed', 'desktop-version',
    'lobby-opened', 'lobby-connected', 'lobby-failed', 'lobby-disconnected',
    'lobby-left', 'lobby-invite-copied', 'lobby-recovery-exported',
    'lobby-admission-fallback', 'client-error', 'map-load-failed',
    'asset-load-failed', 'terrain-load-failed', 'asset-access-failed',
    'asset-access-recovered', 'map-first-tiles-ready'
]);
const ANALYTICS_REPEATABLE_EVENTS = new Set([
    'donation-click', 'partner-click', 'feedback-sent',
    'lobby-connected', 'lobby-left'
]);
const ANALYTICS_ACTION_TIMES = new Map();

let analyticsLastSentAt = -Infinity;
let analyticsFlushTimer = null;
let analyticsFlushAttempts = 0;
let analyticsCalculationTimer = null;
let analyticsCalculationInitialized = false;
let analyticsLastCalculationFingerprint = null;
let analyticsSessionKeys = loadAnalyticsSessionKeys();
let analyticsSessionSampleBucket = loadAnalyticsSessionSampleBucket();
let analyticsMapLayerHooksInstalled = false;

function getGoatCounterEventPath(name, data) {
    if (!ANALYTICS_ALLOWED_EVENTS.has(name)) return null;
    const parts = [name];
    const append = (value, allowed) => {
        if (allowed.includes(value)) parts.push(value);
    };
    append(data?.map, ['bakurani', 'ozeti', 'zestafona']);

    if (name === 'calculation') append(data?.weapon, ['mortar', 'spg']);
    if (name === 'map-style-changed') append(data?.style, ['grayscale', 'color']);
    if (name === 'donation-click') append(data?.service, ['ko-fi', 'boosty', 'buymeacoffee']);
    if (name === 'partner-click') append(data?.partner, ['wardogs-hub']);
    if (name === 'feedback-sent' || name === 'feedback-failed') {
        append(data?.type, ['bug', 'feature', 'general']);
    }
    if (name === 'lobby-connected') append(data?.method, ['create', 'join', 'reconnect']);
    if (name === 'lobby-failed') {
        append(data?.reason, ['invalid-invite', 'admission-limit', 'daily-limit',
            'rate-limited', 'security', 'connection']);
    }
    if (name === 'terrain3d-toggle' || name === 'contours-toggle') {
        if (typeof data?.enabled === 'boolean') parts.push(data.enabled ? 'on' : 'off');
    }
    if (name === 'asset-access-failed') {
        const status = Number(data?.status);
        if ([401, 403, 408, 425, 429, 500, 502, 503, 504].includes(status)) {
            parts.push(String(status));
        }
    }
    return parts.join('/');
}

function loadAnalyticsSessionSampleBucket() {
    try {
        const raw =
            window.sessionStorage.getItem(
                ANALYTICS_SESSION_SAMPLE_KEY
            );
        const stored =
            raw === null || raw === ''
                ? NaN
                : Number(raw);

        if (
            Number.isFinite(stored) &&
            stored >= 0 &&
            stored < 1
        ) {
            return stored;
        }
    } catch (_) {
        // sessionStorage is optional.
    }

    const bucket = Math.random();

    try {
        window.sessionStorage.setItem(
            ANALYTICS_SESSION_SAMPLE_KEY,
            String(bucket)
        );
    } catch (_) {
        // Keep the page-lifetime bucket in memory.
    }

    return bucket;
}

function shouldSampleAnalyticsEvent(name) {
    if (name !== 'calculation') {
        return true;
    }

    return (
        analyticsSessionSampleBucket <
        ANALYTICS_CALCULATION_SAMPLE_RATE
    );
}

function loadAnalyticsSessionKeys() {
    try {
        const raw = window.sessionStorage.getItem(
            ANALYTICS_SESSION_DEDUPE_KEY
        );

        if (!raw) {
            return new Set();
        }

        const parsed = JSON.parse(raw);

        if (!Array.isArray(parsed)) {
            return new Set();
        }

        return new Set(
            parsed.filter(
                value => typeof value === 'string' &&
                    /^[-a-z0-9/]+$/.test(value) && value.length <= 120
            ).slice(-ANALYTICS_MAX_SESSION_KEYS)
        );

    } catch (_) {
        return new Set();
    }
}

function persistAnalyticsSessionKeys() {
    try {
        window.sessionStorage.setItem(
            ANALYTICS_SESSION_DEDUPE_KEY,
            JSON.stringify(
                Array.from(
                    analyticsSessionKeys
                )
            )
        );
    } catch (_) {
        // sessionStorage is optional.
    }
}

function shouldSuppressAnalyticsEvent(name, data) {
    const key = getGoatCounterEventPath(name, data);
    if (!key) return true;

    if (ANALYTICS_REPEATABLE_EVENTS.has(name)) {
        const now = Date.now();
        const previous = ANALYTICS_ACTION_TIMES.get(key);
        if (previous !== undefined && now - previous < 2000) return true;
        ANALYTICS_ACTION_TIMES.set(key, now);
        return false;
    }

    if (analyticsSessionKeys.has(key)) return true;
    if (analyticsSessionKeys.size >= ANALYTICS_MAX_SESSION_KEYS) return true;
    analyticsSessionKeys.add(key);
    persistAnalyticsSessionKeys();
    return false;
}

function isAnalyticsDisabled() {
    if (window.__WARDOGS_ANALYTICS_DISABLED__ === true) return true;
    const host = window.location.hostname;
    const allowLocal = ['localhost', '127.0.0.1', '[::1]', '::1'].includes(host) &&
        window.__WARDOGS_ANALYTICS_ALLOW_LOCAL__ === true;
    return host !== 'wardogs-artillery.com' && !allowLocal;
}

function isAnalyticsAvailable() {
    return Boolean(
        !isAnalyticsDisabled() &&
        window.__WARDOGS_GOATCOUNTER_READY__ === true &&
        typeof window.goatcounter?.count === 'function'
    );
}

function getAnalyticsBuildId() {
    try {
        if (
            typeof getStaticResourceVersion ===
                'function'
        ) {
            const version =
                getStaticResourceVersion();

            if (version) {
                return `ea-build-${version.slice(0, 32)}`;
            }
        }
    } catch (_) {
        // Build context is optional in development.
    }

    return 'dev';
}

function hashAnalyticsDiagnostic(value) {
    const text = String(value || '');

    if (!text) {
        return '';
    }

    let hash = 2166136261;

    for (let i = 0; i < text.length; i++) {
        hash ^= text.charCodeAt(i);
        hash = Math.imul(
            hash,
            16777619
        );
    }

    return (hash >>> 0)
        .toString(16)
        .padStart(8, '0');
}

function normalizeClientErrorSource(value) {
    const raw = String(value || '').trim();

    if (!raw) {
        return '';
    }

    try {
        const url =
            new URL(
                raw,
                window.location.href
            );

        if (
            url.origin ===
                window.location.origin
        ) {
            const parts =
                url.pathname
                    .split('/')
                    .filter(Boolean);

            return parts
                .slice(-2)
                .join('/')
                .slice(0, 64);
        }

        return url.hostname
            .toLowerCase()
            .slice(0, 64);

    } catch (_) {
        return raw
            .split(/[?#]/, 1)[0]
            .slice(-64);
    }
}

function getClientErrorStackLocation(error) {
    const stack =
        String(
            error?.stack ||
            ''
        );

    if (!stack) {
        return {};
    }

    const match =
        stack.match(
            /((?:https?:\/\/|file:\/\/)[^\s)]+|[^\s()]+\.js(?:\?[^\s):]*)?):(\d+):(\d+)/i
        );

    if (!match) {
        return {};
    }

    return {
        source: match[1] || '',
        line: Number(match[2]) || 0,
        column: Number(match[3]) || 0
    };
}

function createClientErrorDiagnosticData(
    error,
    overrides = {}
) {
    const stackLocation =
        getClientErrorStackLocation(
            error
        );

    const message =
        overrides.message ??
        error?.message ??
        error?.reason?.message ??
        (
            typeof error === 'string'
                ? error
                : ''
        );

    const errorType =
        overrides.errorType ??
        error?.name ??
        error?.reason?.name ??
        (
            error == null
                ? 'unknown'
                : typeof error
        );

    const line =
        Number(
            overrides.line ??
            stackLocation.line
        );
    const column =
        Number(
            overrides.column ??
            stackLocation.column
        );

    return {
        phase:
            String(
                overrides.phase ||
                'runtime'
            ).slice(0, 32),
        errorType:
            String(
                errorType ||
                'unknown'
            ).slice(0, 32),
        source:
            normalizeClientErrorSource(
                overrides.source ||
                stackLocation.source ||
                ''
            ),
        line:
            Number.isFinite(line) && line > 0
                ? Math.round(line)
                : 0,
        column:
            Number.isFinite(column) && column > 0
                ? Math.round(column)
                : 0,
        messageHash:
            hashAnalyticsDiagnostic(
                message
            )
    };
}

function normalizeAnalyticsData(data) {
    const normalized = {};

    if (!data || typeof data !== 'object') {
        return undefined;
    }

    Object.entries(data)
        .forEach(([key, value]) => {
            if (
                value === null ||
                value === undefined
            ) {
                return;
            }

            if (
                typeof value === 'string' ||
                typeof value === 'number' ||
                typeof value === 'boolean'
            ) {
                normalized[key] =
                    typeof value === 'string'
                        ? value.slice(0, 64)
                        : value;
            }
        });

    return Object.keys(normalized).length
        ? normalized
        : undefined;
}

function sendAnalyticsEvent(path) {
    if (!isAnalyticsAvailable() || Date.now() - analyticsLastSentAt < ANALYTICS_FLUSH_INTERVAL) {
        return false;
    }
    try {
        window.goatcounter.count({
            path,
            title: path,
            event: true,
            referrer: '',
            no_session: ANALYTICS_REPEATABLE_EVENTS.has(path.split('/')[0])
        });
        analyticsLastSentAt = Date.now();
        return true;
    } catch (_) {
        // A broken or blocked tracker cannot interrupt application features.
        window.__WARDOGS_ANALYTICS_DISABLED__ = true;
        return false;
    }
}

function stopAnalyticsFlush() {
    if (analyticsFlushTimer !== null) window.clearInterval(analyticsFlushTimer);
    analyticsFlushTimer = null;
}

function flushAnalyticsQueue() {
    if (isAnalyticsDisabled()) {
        ANALYTICS_QUEUE.length = 0;
        stopAnalyticsFlush();
        return;
    }
    if (!ANALYTICS_QUEUE.length) {
        stopAnalyticsFlush();
        return;
    }
    if (isAnalyticsAvailable()) {
        if (sendAnalyticsEvent(ANALYTICS_QUEUE[0])) ANALYTICS_QUEUE.shift();
        if (!ANALYTICS_QUEUE.length) stopAnalyticsFlush();
        return;
    }
    if (++analyticsFlushAttempts >= ANALYTICS_FLUSH_ATTEMPTS) {
        ANALYTICS_QUEUE.length = 0;
        stopAnalyticsFlush();
    }
}

function scheduleAnalyticsFlush() {
    if (analyticsFlushTimer !== null || isAnalyticsDisabled()) return;
    analyticsFlushAttempts = 0;
    analyticsFlushTimer = window.setInterval(flushAnalyticsQueue, ANALYTICS_FLUSH_INTERVAL);
}

function trackAnalytics(name, data = undefined) {
    if (isAnalyticsDisabled() || typeof name !== 'string') return;
    const normalizedName = name.trim();
    const normalizedData = normalizeAnalyticsData(data);
    const path = getGoatCounterEventPath(normalizedName, normalizedData);
    if (!path || !shouldSampleAnalyticsEvent(normalizedName) ||
        shouldSuppressAnalyticsEvent(normalizedName, normalizedData)) return;

    if (sendAnalyticsEvent(path)) return;
    if (isAnalyticsDisabled()) return;
    if (ANALYTICS_QUEUE.length >= ANALYTICS_MAX_QUEUE) ANALYTICS_QUEUE.shift();
    ANALYTICS_QUEUE.push(path);
    scheduleAnalyticsFlush();
}

const ANALYTICS_OPERATIONAL_EVENTS =
    new Set([
        'client-error',
        'map-load-failed',
        'asset-load-failed',
        'terrain-load-failed'
    ]);

function trackOperationalFailure(
    name,
    data = {}
) {
    if (
        !ANALYTICS_OPERATIONAL_EVENTS.has(
            name
        )
    ) {
        return;
    }

    const payload = {
        build: getAnalyticsBuildId()
    };

    [
        'area',
        'type',
        'map',
        'code',
        'resource',
        'origin',
        'phase',
        'errorType',
        'source',
        'messageHash'
    ].forEach(key => {
        if (
            typeof data?.[key] === 'string' &&
            data[key]
        ) {
            payload[key] = data[key];
        }
    });

    [
        'line',
        'column',
        'attempts'
    ].forEach(key => {
        const value = Number(data?.[key]);

        if (Number.isFinite(value) && value > 0) {
            payload[key] = Math.round(value);
        }
    });

    trackAnalytics(name, payload);
}

function classifyOperationalResource(target) {
    const tag =
        String(target?.tagName || '')
            .toLowerCase();
    const rawUrl =
        typeof target?.src === 'string' &&
        target.src
            ? target.src
            : typeof target?.href === 'string'
                ? target.href
                : '';

    if (!rawUrl) {
        return {
            resource:
                tag || 'unknown-resource',
            origin: 'unknown'
        };
    }

    try {
        const url =
            new URL(
                rawUrl,
                window.location.href
            );
        const host =
            url.hostname.toLowerCase();
        const path =
            url.pathname.toLowerCase();
        const sameOrigin =
            url.origin ===
            window.location.origin;
        const cloudflareHost =
            host === 'cloudflare.com' ||
            host.endsWith('.cloudflare.com') ||
            host === 'cloudflareinsights.com' ||
            host.endsWith('.cloudflareinsights.com');
        const turnstileResource =
            host === 'challenges.cloudflare.com' &&
            path.includes('/turnstile/');
        const cloudflareInsightsResource =
            host === 'static.cloudflareinsights.com' ||
            host.endsWith('.cloudflareinsights.com');
        const cloudflareChallengeResource =
            !turnstileResource &&
            (
                host === 'challenges.cloudflare.com' ||
                path.includes(
                    '/cdn-cgi/challenge-platform/'
                )
            );

        let origin = 'external';
        if (
            turnstileResource ||
            cloudflareInsightsResource ||
            cloudflareChallengeResource ||
            cloudflareHost
        ) {
            origin = 'cloudflare';
        } else if (sameOrigin) {
            origin = 'site';
        } else if (
            host ===
            'assets.wardogs-artillery.com'
        ) {
            origin = 'assets-cdn';
        } else if (
            host === 'gc.zgo.at' || host.endsWith('.goatcounter.com')
        ) {
            origin = 'analytics';
        }

        let resource =
            `${tag || 'unknown'}-resource`;

        if (tag === 'script') {
            if (
                path.includes(
                    '/js/features/terrain-ballistics.js'
                )
            ) {
                resource = 'terrain-runtime';
            } else if (
                sameOrigin &&
                path.includes('/js/')
            ) {
                resource = 'app-script';
            } else if (
                origin === 'analytics'
            ) {
                resource = 'analytics';
            } else if (turnstileResource) {
                resource = 'turnstile';
            } else if (cloudflareInsightsResource) {
                resource = 'cloudflare-insights';
            } else if (cloudflareChallengeResource) {
                resource = 'cloudflare-challenge';
            } else if (origin === 'cloudflare') {
                resource = 'cloudflare-other';
            } else {
                resource = 'external-script';
            }
        } else if (tag === 'link') {
            resource =
                path.endsWith('.css')
                    ? 'stylesheet'
                    : 'document-link';
        } else if (tag === 'img') {
            if (
                path.includes('/maps/tiles/')
            ) {
                resource = 'map-tile';
            } else if (
                path.includes(
                    '/assets/map-markers/'
                )
            ) {
                resource = 'map-marker';
            } else {
                resource = 'image';
            }
        }

        return {
            resource,
            origin
        };
    } catch {
        return {
            resource:
                `${tag || 'unknown'}-resource`,
            origin: 'unknown'
        };
    }
}

const ANALYTICS_IGNORED_RESOURCE_ORIGINS =
    new Set([
        'external',
        'cloudflare',
        'analytics'
    ]);

function isBrowserExtensionErrorSource(value) {
    const text = String(value || '');

    return /(?:chrome|moz|safari-web|ms-browser)-extension:\/\//i
        .test(text);
}

function shouldIgnoreWindowClientError(event) {
    const message =
        String(event?.message || '').trim();
    const source =
        String(event?.filename || '');
    const stack =
        String(event?.error?.stack || '');

    if (/^ResizeObserver loop/i.test(message)) {
        return true;
    }

    if (
        /^Script error\.?$/i.test(message) &&
        !source
    ) {
        return true;
    }

    return (
        isBrowserExtensionErrorSource(source) ||
        isBrowserExtensionErrorSource(stack)
    );
}

function shouldIgnoreUnhandledRejection(reason) {
    return isBrowserExtensionErrorSource(
        reason?.stack ||
        reason?.sourceURL ||
        ''
    );
}

function installOperationalErrorTelemetry() {
    window.addEventListener(
        'error',
        event => {
            const target =
                event?.target;

            if (
                target &&
                target !== window &&
                target.tagName
            ) {
                const classification =
                    classifyOperationalResource(
                        target
                    );

                if (
                    ANALYTICS_IGNORED_RESOURCE_ORIGINS.has(
                        classification.origin
                    )
                ) {
                    return;
                }

                trackOperationalFailure(
                    'asset-load-failed',
                    {
                        area: 'document',
                        type: String(
                            target.tagName
                        ).toLowerCase(),
                        code: 'resource-error',
                        resource:
                            classification.resource,
                        origin:
                            classification.origin
                    }
                );
                return;
            }

            if (shouldIgnoreWindowClientError(event)) {
                return;
            }

            const diagnostics =
                createClientErrorDiagnosticData(
                    event?.error,
                    {
                        phase: 'runtime',
                        source: event?.filename,
                        line: event?.lineno,
                        column: event?.colno,
                        message: event?.message
                    }
                );

            trackOperationalFailure(
                'client-error',
                {
                    area: 'window',
                    type: 'runtime',
                    code: 'uncaught-error',
                    ...diagnostics
                }
            );
        },
        true
    );

    window.addEventListener(
        'unhandledrejection',
        event => {
            const reason =
                event?.reason;

            if (shouldIgnoreUnhandledRejection(reason)) {
                return;
            }

            const diagnostics =
                createClientErrorDiagnosticData(
                    reason,
                    {
                        phase: 'promise',
                        message:
                            reason?.message ??
                            (
                                typeof reason === 'string'
                                    ? reason
                                    : ''
                            )
                    }
                );

            trackOperationalFailure(
                'client-error',
                {
                    area: 'window',
                    type: 'promise',
                    code: 'unhandled-rejection',
                    ...diagnostics
                }
            );
        }
    );
}

installOperationalErrorTelemetry();

/*
 * Keep analytics focused on bounded product usage and application failures.
 * Detailed performance and firing diagnostics stay in the local developer menu.
 */


function getCalculationFingerprint() {
    if (
        typeof S === 'undefined' ||
        !S.weapon
    ) {
        return null;
    }

    return [
        S.map,
        S.weapon,
        Number(S.origin.x).toFixed(4),
        Number(S.origin.y).toFixed(4),
        Number(S.target.x).toFixed(4),
        Number(S.target.y).toFixed(4)
    ].join('|');
}

function trackCalculationState(inRange) {
    const fingerprint =
        getCalculationFingerprint();

    if (!fingerprint) {
        return;
    }

    /*
     * The first rendered solution is the initial application
     * state, not a user calculation. Store it as the baseline
     * without emitting an event.
     */
    if (!analyticsCalculationInitialized) {
        analyticsCalculationInitialized = true;
        analyticsLastCalculationFingerprint =
            fingerprint;
        return;
    }

    if (
        fingerprint ===
        analyticsLastCalculationFingerprint
    ) {
        return;
    }

    if (analyticsCalculationTimer) {
        window.clearTimeout(
            analyticsCalculationTimer
        );
    }

    analyticsCalculationTimer =
        window.setTimeout(
            () => {
                const currentFingerprint =
                    getCalculationFingerprint();

                if (
                    !currentFingerprint ||
                    currentFingerprint ===
                    analyticsLastCalculationFingerprint
                ) {
                    return;
                }

                analyticsLastCalculationFingerprint =
                    currentFingerprint;

                trackAnalytics(
                    'calculation',
                    {
                        map: S.map,
                        weapon: S.weapon,
                        inRange: Boolean(inRange)
                    }
                );
            },
            ANALYTICS_CALCULATION_DELAY
        );
}


/* =========================
   V1.7 FEATURE TELEMETRY
   ========================= */

/*
 * Keep the new feature telemetry here instead of coupling tracker calls to
 * Terrain3D or Map Tools implementation details.
 *
 * Only explicit user actions are recorded. No coordinates, MIL values,
 * terrain height differences, candidate commands, or ballistic payload data
 * are sent.
 */

function getAnalyticsMapId() {
    return (
        typeof S === 'object' &&
        S &&
        typeof S.map === 'string'
    )
        ? S.map
        : '';
}

function handleAnalyticsFeatureChange(event) {
    const target =
        event?.target;

    if (
        !target ||
        target.id !==
            'experimentalTerrainCorrectionToggle'
    ) {
        return;
    }

    trackAnalytics(
        'terrain3d-toggle',
        {
            enabled:
                Boolean(
                    target.checked
                ),
            map:
                getAnalyticsMapId()
        }
    );
}

function installMapLayerAnalyticsHooks() {
    if (
        analyticsMapLayerHooksInstalled
    ) {
        return true;
    }

    if (
        typeof window.setMapLayerVisible !==
            'function' ||
        typeof window.setMapLayerGroupVisible !==
            'function'
    ) {
        return false;
    }

    const originalSetMapLayerVisible =
        window.setMapLayerVisible;

    const originalSetMapLayerGroupVisible =
        window.setMapLayerGroupVisible;

    window.setMapLayerVisible =
        function analyticsSetMapLayerVisible(
            layer,
            visible
        ) {
            const result =
                originalSetMapLayerVisible.apply(
                    this,
                    arguments
                );

            if (layer === 'contours') {
                trackAnalytics(
                    'contours-toggle',
                    {
                        enabled:
                            Boolean(
                                visible
                            ),
                        map:
                            getAnalyticsMapId()
                    }
                );
            }

            return result;
        };

    window.setMapLayerGroupVisible =
        function analyticsSetMapLayerGroupVisible(
            layerIds,
            visible
        ) {
            const result =
                originalSetMapLayerGroupVisible.apply(
                    this,
                    arguments
                );

            if (
                Array.isArray(layerIds) &&
                layerIds.includes(
                    'contours'
                )
            ) {
                trackAnalytics(
                    'contours-toggle',
                    {
                        enabled:
                            Boolean(
                                visible
                            ),
                        map:
                            getAnalyticsMapId()
                    }
                );
            }

            return result;
        };

    analyticsMapLayerHooksInstalled =
        true;

    return true;
}

function initializeAnalyticsFeatureTelemetry() {
    installMapLayerAnalyticsHooks();
}

document.addEventListener(
    'change',
    handleAnalyticsFeatureChange
);

document.addEventListener(
    'DOMContentLoaded',
    initializeAnalyticsFeatureTelemetry,
    {
        once: true
    }
);

window.addEventListener(
    'load',
    initializeAnalyticsFeatureTelemetry,
    {
        once: true
    }
);

window.addEventListener(
    'load',
    flushAnalyticsQueue,
    { once: true }
);

window.addEventListener('wardogs-analytics-ready', flushAnalyticsQueue);

// Static mobile partner links use the same bounded wrapper as generated links.
document.addEventListener('click', event => {
    const link = event.target?.closest?.('[data-analytics-event]');
    if (!link) return;
    trackAnalytics(link.dataset.analyticsEvent, {
        partner: link.dataset.analyticsEventPartner
    });
});
