const DEFAULT_PRODUCTION_ORIGIN =
    'https://wardogs-artillery.com';

function strings(value) {
    return String(value || '')
        .split(',')
        .map(item => item.trim())
        .filter(Boolean);
}

function integer(value, fallback, min, max) {
    const parsed = Number(value);

    return (
        Number.isSafeInteger(parsed) &&
        parsed >= min &&
        parsed <= max
    )
        ? parsed
        : fallback;
}

function origins(value, fallback = []) {
    return strings(value)
        .map(item => {
            try {
                const url = new URL(item);

                if (
                    !['https:', 'http:'].includes(url.protocol) ||
                    url.username ||
                    url.password ||
                    url.pathname !== '/' ||
                    url.search ||
                    url.hash
                ) {
                    return null;
                }

                return url.origin;
            } catch {
                return null;
            }
        })
        .filter(Boolean)
        .concat(fallback);
}

function isLoopbackOrigin(origin) {
    try {
        return [
            'localhost',
            '127.0.0.1',
            '[::1]'
        ].includes(new URL(origin).hostname);
    } catch {
        return false;
    }
}

function ipAddress(value) {
    if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(value)) {
        return value.split('.').every(octet =>
            Number(octet) <= 255 &&
            String(Number(octet)) === octet
        ) ? value : null;
    }

    if (!value.includes(':') || !/^[a-f0-9:.]+$/i.test(value)) {
        return null;
    }

    try {
        return new URL(`http://[${value}]/`)
            .hostname.slice(1, -1);
    } catch {
        return null;
    }
}

export function allowsLocalDevelopment(request, config, origin) {
    const ip = ipAddress(
        request.headers.get('CF-Connecting-IP') || ''
    );

    return (
        ip !== null &&
        config.localDevelopmentIps.has(ip) &&
        config.localDevelopmentOrigins.includes(origin)
    );
}

export function settings(env = {}) {
    const development =
        env.ASSETS_DEV === 'true';

    const productionOrigins =
        origins(
            env.ALLOWED_ORIGINS,
            [DEFAULT_PRODUCTION_ORIGIN]
        ).filter(origin => !isLoopbackOrigin(origin));

    const configuredDevelopmentOrigins =
        origins(env.DEVELOPMENT_ORIGINS);

    const developmentOrigins =
        development
            ? configuredDevelopmentOrigins
            : [];

    const prefix =
        String(
            env.PROTECTED_PREFIX ||
            '/releases/assets-v1/'
        );

    if (
        !prefix.startsWith('/') ||
        !prefix.endsWith('/') ||
        prefix.includes('..')
    ) {
        throw new Error('invalid-protected-prefix');
    }

    return {
        development,
        localDevelopmentOrigins:
            configuredDevelopmentOrigins.filter(isLoopbackOrigin),
        localDevelopmentIps: new Set(
            strings(env.LOCAL_DEVELOPMENT_IPS)
                .map(ipAddress)
                .filter(Boolean)
        ),
        allowedOrigins: [
            ...new Set([
                ...productionOrigins,
                ...developmentOrigins
            ])
        ],
        protectedPrefix: prefix,
        enforceSessions:
            env.ENFORCE_SESSIONS !== 'false',
        sessionLifetimeSeconds:
            integer(
                env.SESSION_LIFETIME_SECONDS,
                1200,
                300,
                3600
            ),
        edgeCacheSeconds:
            integer(
                env.EDGE_CACHE_SECONDS,
                2592000,
                60,
                31536000
            ),
        requestPolicyEnabled:
            env.REQUEST_POLICY_ENABLED !== 'false',
        requestHoldSeconds:
            integer(
                env.REQUEST_HOLD_SECONDS,
                600,
                60,
                3600
            ),
        assetBudgetEnabled:
            env.ASSET_BUDGET_ENABLED !== 'false',
        assetBudgetWindowSeconds:
            integer(
                env.ASSET_BUDGET_WINDOW_SECONDS,
                3600,
                300,
                86400
            ),
        assetBudgetSessionPoints:
            integer(
                env.ASSET_BUDGET_SESSION_POINTS,
                2000,
                100,
                10000
            ),
        assetBudgetIpPoints:
            integer(
                env.ASSET_BUDGET_IP_POINTS,
                6000,
                200,
                50000
            ),
        assetBudgetSessionTerrain:
            integer(
                env.ASSET_BUDGET_SESSION_TERRAIN,
                64,
                4,
                1000
            ),
        assetBudgetIpTerrain:
            integer(
                env.ASSET_BUDGET_IP_TERRAIN,
                256,
                8,
                5000
            ),
        assetBudgetStrikeMemorySeconds:
            integer(
                env.ASSET_BUDGET_STRIKE_MEMORY_SECONDS,
                604800,
                3600,
                2592000
            ),
        turnstileHostname:
            String(
                env.TURNSTILE_HOSTNAME ||
                'wardogs-artillery.com'
            ),
        turnstileAction:
            String(
                env.TURNSTILE_ACTION ||
                'asset-session'
            ),
        fallbackCountries:
            new Set(
                strings(env.FALLBACK_COUNTRIES)
                    .map(country =>
                        country.toUpperCase()
                    )
                    .filter(country =>
                        /^[A-Z]{2}$/.test(country)
                    )
            )
    };
}
