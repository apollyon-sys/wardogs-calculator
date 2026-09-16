/* =========================
   ANALYTICS
   ========================= */

/*
 * Thin wrapper around the Umami tracker already loaded by
 * the page shell.
 *
 * Goals:
 * - keep tracking calls out of feature code;
 * - avoid losing very early events while the deferred Umami
 *   script is still loading;
 * - keep event data intentionally small and non-sensitive;
 * - debounce calculator changes so marker dragging does not
 *   generate an event for every animation frame.
 */

const ANALYTICS_QUEUE = [];
const ANALYTICS_MAX_QUEUE = 32;
const ANALYTICS_FLUSH_INTERVAL = 500;
const ANALYTICS_FLUSH_ATTEMPTS = 30;
const ANALYTICS_CALCULATION_DELAY = 900;
const ANALYTICS_CALCULATION_SAMPLE_RATE = 0.2;
const ANALYTICS_SESSION_DEDUPE_KEY =
    'wardogs-analytics-session-v2';
const ANALYTICS_SESSION_SAMPLE_KEY =
    'wardogs-analytics-sample-v1';

const ANALYTICS_CONTEXT_DEDUPED_EVENTS =
    new Set([
        'calculation',
        'client-error',
        'map-load-failed',
        'asset-load-failed',
        'terrain-load-failed'
    ]);

let analyticsFlushTimer = null;
let analyticsFlushAttempts = 0;
let analyticsCalculationTimer = null;
let analyticsCalculationInitialized = false;
let analyticsLastCalculationFingerprint = null;
let analyticsSessionKeys =
    loadAnalyticsSessionKeys();
let analyticsSessionSampleBucket =
    loadAnalyticsSessionSampleBucket();

let analyticsMapLayerHooksInstalled =
    false;


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
                value =>
                    typeof value === 'string'
            )
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

function getAnalyticsContextKey(
    name,
    data
) {
    if (
        !ANALYTICS_CONTEXT_DEDUPED_EVENTS.has(
            name
        )
    ) {
        return null;
    }

    const map =
        typeof data?.map === 'string'
            ? data.map
            : '';

    if (name === 'calculation') {
        const weapon =
            typeof data?.weapon === 'string'
                ? data.weapon
                : '';

        return [
            name,
            map,
            weapon
        ].join('|');
    }

    if (
        name === 'client-error' ||
        name === 'map-load-failed' ||
        name === 'asset-load-failed' ||
        name === 'terrain-load-failed'
    ) {
        const area =
            typeof data?.area === 'string'
                ? data.area
                : '';
        const type =
            typeof data?.type === 'string'
                ? data.type
                : '';
        const code =
            typeof data?.code === 'string'
                ? data.code
                : '';
        const resource =
            typeof data?.resource === 'string'
                ? data.resource
                : '';
        const origin =
            typeof data?.origin === 'string'
                ? data.origin
                : '';

        const parts = [
            name,
            map,
            area,
            type,
            code,
            resource,
            origin
        ];

        if (name === 'client-error') {
            parts.push(
                typeof data?.phase === 'string'
                    ? data.phase
                    : '',
                typeof data?.errorType === 'string'
                    ? data.errorType
                    : '',
                typeof data?.source === 'string'
                    ? data.source
                    : '',
                typeof data?.messageHash === 'string'
                    ? data.messageHash
                    : ''
            );
        }

        return parts.join('|');
    }

    return [
        name,
        map
    ].join('|');
}

function shouldSuppressAnalyticsEvent(
    name,
    data
) {
    const key =
        getAnalyticsContextKey(
            name,
            data
        );

    if (!key) {
        return false;
    }

    if (
        analyticsSessionKeys.has(
            key
        )
    ) {
        return true;
    }

    analyticsSessionKeys.add(
        key
    );

    persistAnalyticsSessionKeys();

    return false;
}

function isAnalyticsDisabled() {
    return (
        window.__WARDOGS_ANALYTICS_DISABLED__ ===
        true
    );
}

function isAnalyticsAvailable() {
    return Boolean(
        !isAnalyticsDisabled() &&
        window.umami &&
        typeof window.umami.track === 'function'
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

function sendAnalyticsEvent(name, data) {
    if (!isAnalyticsAvailable()) {
        return false;
    }

    try {
        window.umami.track(
            name,
            normalizeAnalyticsData(data)
        );

        return true;

    } catch (error) {
        console.warn(
            'Failed to send analytics event:',
            error
        );

        return false;
    }
}

function flushAnalyticsQueue() {
    if (isAnalyticsDisabled()) {
        ANALYTICS_QUEUE.length = 0;

        if (analyticsFlushTimer) {
            window.clearInterval(
                analyticsFlushTimer
            );
            analyticsFlushTimer = null;
        }

        return;
    }

    if (isAnalyticsAvailable()) {
        while (ANALYTICS_QUEUE.length) {
            const event = ANALYTICS_QUEUE.shift();

            sendAnalyticsEvent(
                event.name,
                event.data
            );
        }

        if (analyticsFlushTimer) {
            window.clearInterval(
                analyticsFlushTimer
            );

            analyticsFlushTimer = null;
        }

        return;
    }

    analyticsFlushAttempts++;

    if (
        analyticsFlushAttempts >=
        ANALYTICS_FLUSH_ATTEMPTS
    ) {
        ANALYTICS_QUEUE.length = 0;

        if (analyticsFlushTimer) {
            window.clearInterval(
                analyticsFlushTimer
            );

            analyticsFlushTimer = null;
        }
    }
}

function scheduleAnalyticsFlush() {
    if (
        analyticsFlushTimer ||
        isAnalyticsAvailable()
    ) {
        return;
    }

    analyticsFlushAttempts = 0;

    analyticsFlushTimer =
        window.setInterval(
            flushAnalyticsQueue,
            ANALYTICS_FLUSH_INTERVAL
        );
}

function trackAnalytics(name, data = undefined) {
    if (isAnalyticsDisabled()) {
        return;
    }

    if (
        typeof name !== 'string' ||
        !name.trim()
    ) {
        return;
    }

    const normalizedName =
        name.trim().slice(0, 64);

    const normalizedData =
        normalizeAnalyticsData(data);

    if (!shouldSampleAnalyticsEvent(normalizedName)) {
        return;
    }

    if (
        shouldSuppressAnalyticsEvent(
            normalizedName,
            normalizedData
        )
    ) {
        return;
    }

    if (
        sendAnalyticsEvent(
            normalizedName,
            normalizedData
        )
    ) {
        return;
    }

    if (
        ANALYTICS_QUEUE.length >=
        ANALYTICS_MAX_QUEUE
    ) {
        ANALYTICS_QUEUE.shift();
    }

    ANALYTICS_QUEUE.push({
        name: normalizedName,
        data: normalizedData
    });

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
            host.includes('umami')
        ) {
            origin = 'umami';
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
                origin === 'umami'
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
        'umami'
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
 * Core Web Vitals are collected by Umami's built-in
 * data-performance tracker. Keep custom analytics focused on
 * product usage and actionable application failures.
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
 * Keep the new feature telemetry here instead of coupling Umami calls to
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
