import {
    allowsLocalDevelopment,
    settings
} from './config.mjs';
import {
    mintSession,
    sessionSubject,
    verifySession
} from './tokens.mjs';
import { DEVELOPER_PATH, DEVELOPER_MODULE_PATH, handleDeveloperRequest } from './developer-access.mjs';
import {
    validateTurnstile
} from './turnstile.mjs';
import {
    assetBudgetDescriptor,
    hasBrowserRequestContext,
    holdClient,
    isAddressHeldAtAdmission,
    isClientHeld,
    isCoverageBoundaryPath,
    requestLogId,
    sequenceRateKeys
} from './request-policy.mjs';

export {
    AssetRequestGuard
} from './asset-request-guard.mjs';

const SESSION_PATH = '/__session';
const SESSION_COOKIE =
    '__Host-wardogs_asset_session';

function securityHeaders() {
    return {
        'Referrer-Policy': 'no-referrer',
        'X-Content-Type-Options': 'nosniff',
        'Cross-Origin-Resource-Policy':
            'cross-origin',
        'Content-Security-Policy':
            "default-src 'none'; frame-ancestors 'none'",
        'Permissions-Policy':
            'camera=(), geolocation=(), microphone=()'
    };
}

function corsHeaders(origin) {
    return {
        ...securityHeaders(),
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Allow-Methods':
            'GET, HEAD, POST, OPTIONS',
        'Access-Control-Allow-Headers':
            'Content-Type',
        'Access-Control-Expose-Headers':
            'Content-Length, Content-Type, ETag, Retry-After, CF-Ray, CF-Mitigated, X-Wardogs-Asset-Access, X-Wardogs-Asset-Fallback',
        'Access-Control-Max-Age': '86400',
        Vary: 'Origin'
    };
}

function json(body, status, origin, extra = {}) {
    return new Response(
        JSON.stringify(body),
        {
            status,
            headers: {
                ...corsHeaders(origin),
                'Content-Type':
                    'application/json; charset=utf-8',
                'Cache-Control': 'no-store',
                ...extra
            }
        }
    );
}

function plain(message, status, origin, extra = {}) {
    return new Response(
        message,
        {
            status,
            headers: {
                ...corsHeaders(origin),
                'Content-Type':
                    'text/plain; charset=utf-8',
                'Cache-Control': 'no-store',
                ...extra
            }
        }
    );
}

function blocked(origin, seconds) {
    return json(
        {
            error: 'rate-limited'
        },
        429,
        origin,
        {
            'Retry-After':
                String(seconds)
        }
    );
}

function cookieValue(request, name) {
    const header =
        request.headers.get('Cookie') ||
        '';

    for (const part of header.split(';')) {
        const separator =
            part.indexOf('=');

        if (separator < 1) {
            continue;
        }

        if (
            part
                .slice(0, separator)
                .trim() === name
        ) {
            return part
                .slice(separator + 1)
                .trim();
        }
    }

    return '';
}

function sessionCookie(token, lifetimeSeconds) {
    return [
        `${SESSION_COOKIE}=${token}`,
        'Path=/',
        `Max-Age=${lifetimeSeconds}`,
        'HttpOnly',
        'Secure',
        'SameSite=None',
        'Partitioned'
    ].join('; ');
}

async function allowedBy(rateLimit, key, exempt = false) {
    return (
        exempt ||
        !rateLimit ||
        (
            await rateLimit.limit({
                key
            })
        ).success
    );
}

function requireBinding(env, name, development) {
    const binding = env[name];

    if (!binding && !development) {
        throw new Error(
            `missing-binding:${name}`
        );
    }

    return binding;
}

async function limitedJson(request, maximum = 4096) {
    const length =
        Number(
            request.headers.get(
                'Content-Length'
            ) || 0
        );

    if (
        Number.isFinite(length) &&
        length > maximum
    ) {
        throw new Error('body-too-large');
    }

    const text =
        await request.text();

    if (new TextEncoder().encode(text).length > maximum) {
        throw new Error('body-too-large');
    }

    try {
        return JSON.parse(text || '{}');
    } catch {
        throw new Error('bad-json');
    }
}

function validAssetPath(pathname, prefix) {
    return (
        pathname.startsWith(prefix) &&
        pathname.length > prefix.length &&
        !pathname.includes('\\') &&
        !/%(?:2f|5c|00)/i.test(pathname) &&
        /^\/[A-Za-z0-9._/-]+$/.test(pathname)
    );
}

async function currentSession(
    request,
    env,
    now = Date.now()
) {
    if (
        typeof env.SESSION_SECRET !== 'string' ||
        env.SESSION_SECRET.length < 32
    ) {
        throw new Error('invalid-session-secret');
    }

    return verifySession(
        env.SESSION_SECRET,
        cookieValue(
            request,
            SESSION_COOKIE
        ),
        sessionSubject(request),
        now
    );
}

async function handleSession(
    request,
    env,
    config,
    origin
) {
    const ip =
        request.headers.get(
            'CF-Connecting-IP'
        ) || 'local';

    const country =
        String(
            request.cf?.country ||
            ''
        ).toUpperCase();

    const regionalAccess = config.localDevelopmentAccess ||
        (!config.development && config.fallbackCountries.has(country));

    if (
        !config.localDevelopmentAccess &&
        await isAddressHeldAtAdmission(
            env,
            ip
        )
    ) {
        return blocked(
            origin,
            config.requestHoldSeconds
        );
    }

    if (
        !['GET', 'POST'].includes(
            request.method
        )
    ) {
        return json(
            {
                error: 'method-not-allowed'
            },
            405,
            origin,
            {
                Allow: 'GET, POST, OPTIONS'
            }
        );
    }

    if (
        !await allowedBy(
            requireBinding(
                env,
                'SESSION_RATE',
                config.development
            ),
            ip
        )
    ) {
        return json(
            {
                error: 'rate-limited'
            },
            429,
            origin,
            {
                'Retry-After': '60'
            }
        );
    }

    if (request.method === 'GET') {
        const session =
            await currentSession(
                request,
                env
            );

        if (
            !session ||
            (session.mode !== (regionalAccess ? 'restricted' : 'standard'))
        ) {
            return json(
                {
                    error: 'session-required'
                },
                401,
                origin,
                regionalAccess
                    ? {
                        'X-Wardogs-Asset-Fallback':
                            'restricted'
                    }
                    : {}
            );
        }

        return json(
            {
                ok: true,
                expiresAt: session.expiresAt,
                mode: session.mode
            },
            200,
            origin
        );
    }

    const body =
        await limitedJson(request);

    // Geography is server metadata, never a client language or route hint.
    // A submitted token must not send a regional visitor to the other host.
    const fallback = regionalAccess;

    if (!fallback) {
        const challenge =
            await validateTurnstile(
                env,
                config,
                body.token,
                ip
            );

        if (!challenge.ok) {
            return json(
                {
                    error: challenge.error
                },
                challenge.status,
                origin
            );
        }
    }

    if (
        typeof env.SESSION_SECRET !== 'string' ||
        env.SESSION_SECRET.length < 32
    ) {
        return json(
            {
                error: 'gateway-not-configured'
            },
            503,
            origin
        );
    }

    const expiresAt =
        Date.now() +
        config.sessionLifetimeSeconds * 1000;

    const mode =
        fallback
            ? 'restricted'
            : 'standard';

    const token =
        await mintSession(
            env.SESSION_SECRET,
            expiresAt,
            mode,
            sessionSubject(request)
        );

    return json(
        {
            ok: true,
            expiresAt,
            mode
        },
        201,
        origin,
        {
            'Set-Cookie':
                sessionCookie(
                    token,
                    config.sessionLifetimeSeconds
                )
        }
    );
}

function contentTypeForKey(key) {
    const extension =
        key
            .split('.')
            .pop()
            ?.toLowerCase();

    return ({
        webp: 'image/webp',
        json: 'application/json; charset=utf-8',
        bin: 'application/octet-stream'
    })[extension] ||
        'application/octet-stream';
}

function assetHeaders(object, config, key) {
    const headers =
        new Headers();

    object.writeHttpMetadata?.(headers);

    if (!headers.has('Content-Type')) {
        headers.set(
            'Content-Type',
            contentTypeForKey(
                key
            )
        );
    }

    headers.set(
        'Cache-Control',
        `public, max-age=86400, s-maxage=${config.edgeCacheSeconds}, immutable`
    );
    headers.set(
        'ETag',
        object.httpEtag ||
        object.etag ||
        ''
    );
    headers.set(
        'Content-Length',
        String(object.size)
    );
    headers.set('Accept-Ranges', 'none');
    headers.set(
        'X-Content-Type-Options',
        'nosniff'
    );
    headers.set(
        'Cross-Origin-Resource-Policy',
        'cross-origin'
    );

    return headers;
}

function withCors(
    response,
    origin,
    accessMode = ''
) {
    const headers =
        new Headers(response.headers);

    for (
        const [name, value]
        of Object.entries(
            corsHeaders(origin)
        )
    ) {
        headers.set(name, value);
    }

    if (accessMode) {
        headers.set(
            'X-Wardogs-Asset-Access',
            accessMode
        );
    }

    return new Response(
        response.body,
        {
            status: response.status,
            statusText: response.statusText,
            headers
        }
    );
}

function cacheRequest(url) {
    const clean =
        new URL(url);

    clean.search = '';
    clean.hash = '';

    return new Request(
        clean.href,
        {
            method: 'GET'
        }
    );
}

async function handleAsset(
    request,
    env,
    context,
    config,
    origin,
    url
) {
    if (
        !['GET', 'HEAD'].includes(
            request.method
        ) ||
        url.search ||
        url.hash ||
        request.headers.has('Range')
    ) {
        return plain(
            'Unsupported asset request',
            400,
            origin,
            {
                'Accept-Ranges': 'none'
            }
        );
    }

    let session =
        await currentSession(
            request,
            env
        );

    if (
        !session &&
        !config.enforceSessions
    ) {
        session = {
            id: `migration:${
                request.headers.get(
                    'CF-Connecting-IP'
                ) || 'local'
            }`,
            mode: 'restricted',
            migration: true
        };
    }

    if (!session) {
        return json(
            {
                error: 'session-required'
            },
            401,
            origin
        );
    }

    const ip =
        request.headers.get(
            'CF-Connecting-IP'
        ) || 'local';

    if (
        !config.localDevelopmentAccess &&
        await isClientHeld(
            env,
            session.id,
            ip
        )
    ) {
        return blocked(
            origin,
            config.requestHoldSeconds
        );
    }

    if (
        !config.localDevelopmentAccess &&
        config.requestPolicyEnabled &&
        isCoverageBoundaryPath(
            url.pathname,
            config.protectedPrefix
        )
    ) {
        await holdClient(
            env,
            session.id,
            ip,
            config.requestHoldSeconds
        );

        console.warn(
            '[assets-gateway-policy]',
            JSON.stringify({
                code: 'P01',
                actor:
                    await requestLogId(ip),
                path: url.pathname,
                country:
                    request.cf?.country || '',
                colo:
                    request.cf?.colo || ''
            })
        );

        return blocked(
            origin,
            config.requestHoldSeconds
        );
    }

    if (!config.localDevelopmentAccess && config.assetBudgetEnabled) {
        const budget =
            await assetBudgetDescriptor(
                url.pathname,
                config.protectedPrefix
            );

        const namespace =
            requireBinding(
                env,
                'ASSET_REQUEST_GUARD',
                config.development
            );

        if (budget && namespace) {
            const actor =
                await requestLogId(ip);

            const object = namespace.get(
                namespace.idFromName(actor)
            );

            const response =
                await object.fetch(
                    'https://asset-request-guard/check',
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type':
                                'application/json'
                        },
                        body: JSON.stringify({
                            sessionId: session.id,
                            assetKey: budget.key,
                            category:
                                budget.category,
                            weight: budget.weight,
                            limits: {
                                windowSeconds:
                                    config.assetBudgetWindowSeconds,
                                sessionPoints:
                                    config.assetBudgetSessionPoints,
                                ipPoints:
                                    config.assetBudgetIpPoints,
                                sessionTerrain:
                                    config.assetBudgetSessionTerrain,
                                ipTerrain:
                                    config.assetBudgetIpTerrain,
                                strikeMemorySeconds:
                                    config.assetBudgetStrikeMemorySeconds
                            }
                        })
                    }
                );

            if (!response.ok) {
                throw new Error(
                    'asset-request-guard-unavailable'
                );
            }

            const decision =
                await response.json();

            if (!decision.allowed) {
                await holdClient(
                    env,
                    session.id,
                    ip,
                    decision.holdSeconds
                );

                console.warn(
                    '[assets-gateway-policy]',
                    JSON.stringify({
                        code: 'P04',
                        actor,
                        reason: decision.reason,
                        level:
                            decision.strikeLevel,
                        path: url.pathname,
                        country:
                            request.cf?.country || '',
                        colo:
                            request.cf?.colo || ''
                    })
                );

                return blocked(
                    origin,
                    decision.holdSeconds
                );
            }
        }
    }

    const sessionRate =
        session.mode === 'restricted'
            ? requireBinding(
                env,
                'ASSET_RESTRICTED_RATE',
                config.development
            )
            : requireBinding(
                env,
                'ASSET_SESSION_RATE',
                config.development
            );

    const sequenceKeys =
        sequenceRateKeys(
            url.pathname,
            config.protectedPrefix,
            session.id
        );

    const reducedContext =
        !config.localDevelopmentAccess &&
        !hasBrowserRequestContext(
            request,
            config.development
        );

    const sequenceRate =
        requireBinding(
            env,
            'ASSET_SEQUENCE_RATE',
            config.development
        );

    const checks = [
        allowedBy(
            sessionRate,
            session.id,
            config.localDevelopmentAccess
        ),
        allowedBy(
            requireBinding(
                env,
                'ASSET_IP_RATE',
                config.development
            ),
            ip,
            config.localDevelopmentAccess
        ),
        allowedBy(
            requireBinding(
                env,
                'ASSET_WINDOW_RATE',
                config.development
            ),
            session.id,
            config.localDevelopmentAccess
        ),
        reducedContext
            ? allowedBy(
                requireBinding(
                    env,
                    'ASSET_CONTEXT_RATE',
                    config.development
                ),
                session.id
            )
            : Promise.resolve(true),
        ...sequenceKeys.map(key =>
            allowedBy(
                sequenceRate,
                key,
                config.localDevelopmentAccess
            )
        )
    ];

    const [
        sessionAllowed,
        ipAllowed,
        windowAllowed,
        contextAllowed,
        ...sequenceAllowed
    ] =
        await Promise.all([
            ...checks
        ]);

    const sequenceBlocked =
        sequenceAllowed.some(
            allowed => !allowed
        );

    if (!contextAllowed || sequenceBlocked) {
        const code =
            !contextAllowed
                ? 'P02'
                : 'P03';

        await holdClient(
            env,
            session.id,
            ip,
            config.requestHoldSeconds
        );

        console.warn(
            '[assets-gateway-policy]',
            JSON.stringify({
                code,
                actor:
                    await requestLogId(ip),
                path: url.pathname,
                country:
                    request.cf?.country || '',
                colo:
                    request.cf?.colo || ''
            })
        );

        return blocked(
            origin,
            config.requestHoldSeconds
        );
    }

    if (
        !sessionAllowed ||
        !ipAllowed ||
        !windowAllowed
    ) {
        return json(
            {
                error: 'rate-limited'
            },
            429,
            origin,
            {
                'Retry-After': '60'
            }
        );
    }

    const key =
        url.pathname.slice(1);

    const bucket =
        requireBinding(
            env,
            'ASSETS',
            config.development
        );

    if (!bucket) {
        return json(
            {
                error: 'gateway-not-configured'
            },
            503,
            origin
        );
    }

    if (request.method === 'HEAD') {
        const object =
            await bucket.head(key);

        if (!object) {
            return plain(
                'Not found',
                404,
                origin
            );
        }

        return withCors(
            new Response(
                null,
                {
                    status: 200,
                    headers:
                        assetHeaders(
                            object,
                            config,
                            key
                        )
                }
            ),
            origin,
            session.migration
                ? 'migration'
                : session.mode
        );
    }

    const cache =
        globalThis.caches?.default;

    const cacheKey =
        cacheRequest(url);

    const cached =
        cache
            ? await cache.match(cacheKey)
            : null;

    if (cached) {
        return withCors(
            cached,
            origin,
            session.migration
                ? 'migration'
                : session.mode
        );
    }

    const object =
        await bucket.get(key);

    if (!object) {
        return plain(
            'Not found',
            404,
            origin
        );
    }

    const response =
        new Response(
            object.body,
            {
                status: 200,
                headers:
                    assetHeaders(
                        object,
                        config,
                        key
                    )
            }
        );

    if (cache && context?.waitUntil) {
        context.waitUntil(
            cache.put(
                cacheKey,
                response.clone()
            )
        );
    }

    return withCors(
        response,
        origin,
        session.migration
            ? 'migration'
            : session.mode
    );
}

export async function handleRequest(
    request,
    env,
    context = {}
) {
    let config;

    try {
        config = settings(env);
    } catch {
        return new Response(
            'Gateway configuration is invalid',
            {
                status: 503,
                headers: securityHeaders()
            }
        );
    }

    const origin =
        request.headers.get('Origin') ||
        '';

    config.localDevelopmentAccess =
        allowsLocalDevelopment(request, config, origin);

    if (
        !config.allowedOrigins.includes(origin) &&
        !config.localDevelopmentAccess
    ) {
        return json(
            {
                error: 'forbidden-origin'
            },
            403,
            'null'
        );
    }

    const url =
        new URL(request.url);

    if (request.method === 'OPTIONS') {
        return new Response(
            null,
            {
                status: 204,
                headers:
                    corsHeaders(origin)
            }
        );
    }

    try {
        if (url.pathname === DEVELOPER_PATH || url.pathname === DEVELOPER_MODULE_PATH) {
            return await handleDeveloperRequest(request, env, { origin, corsHeaders, cookieValue, limitedJson });
        }

        if (url.pathname === SESSION_PATH) {
            return await handleSession(
                request,
                env,
                config,
                origin
            );
        }

        if (
            !validAssetPath(
                url.pathname,
                config.protectedPrefix
            )
        ) {
            return plain(
                'Not found',
                404,
                origin
            );
        }

        return await handleAsset(
            request,
            env,
            context,
            config,
            origin,
            url
        );
    } catch (error) {
        const clientError =
            /^(bad-json|body-too-large)$/
                .test(error?.message || '');

        console.error(
            '[assets-gateway]',
            error
        );

        return json(
            {
                error:
                    clientError
                        ? error.message
                        : 'unavailable'
            },
            clientError
                ? 400
                : 503,
            origin
        );
    }
}

export default {
    fetch: handleRequest
};
