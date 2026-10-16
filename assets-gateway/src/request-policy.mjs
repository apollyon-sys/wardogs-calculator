const encoder = new TextEncoder();

const PROTECTED_MAPS = new Set([
    'bakurani',
    'ozeti',
    'zestafona'
]);

const TILE_PATTERN =
    /^maps\/(tiles(?:-color)?)\/([a-z0-9-]+)\/zoom_(\d+)\/(\d+)_(\d+)\.webp$/;

const TERRAIN_CHUNK_PATTERN =
    /^data\/terrain\/([a-z0-9-]+)\/chunks\/(-?\d+)_(-?\d+)\.bin$/;

const TERRAIN_BOUNDARY_PATHS = new Set([
    'data/terrain/bakurani/chunks/15_12.bin',
    'data/terrain/bakurani/chunks/32_27.bin',
    'data/terrain/ozeti/chunks/-1_0.bin',
    'data/terrain/ozeti/chunks/16_15.bin',
    'data/terrain/zestafona/chunks/-1_0.bin',
    'data/terrain/zestafona/chunks/16_15.bin'
]);

function relativeAssetPath(pathname, prefix) {
    return pathname.startsWith(prefix)
        ? pathname.slice(prefix.length)
        : '';
}

export function tileRequest(pathname, prefix) {
    const match =
        TILE_PATTERN.exec(
            relativeAssetPath(
                pathname,
                prefix
            )
        );

    if (!match) {
        return null;
    }

    const zoom = Number(match[3]);
    const x = Number(match[4]);
    const y = Number(match[5]);
    const maximum = 2 ** zoom - 1;

    if (
        !PROTECTED_MAPS.has(match[2]) ||
        !Number.isSafeInteger(zoom) ||
        zoom < 0 ||
        zoom > 7 ||
        !Number.isSafeInteger(x) ||
        !Number.isSafeInteger(y) ||
        x < 0 ||
        y < 0 ||
        x > maximum ||
        y > maximum
    ) {
        return null;
    }

    return {
        style: match[1],
        map: match[2],
        zoom,
        x,
        y,
        maximum
    };
}

export function isCoverageBoundaryPath(
    pathname,
    prefix
) {
    const relative =
        relativeAssetPath(
            pathname,
            prefix
        );

    if (
        TERRAIN_BOUNDARY_PATHS.has(relative)
    ) {
        return true;
    }

    const tile =
        tileRequest(
            pathname,
            prefix
        );

    if (
        !tile ||
        tile.zoom < 4
    ) {
        return false;
    }

    const cornerX =
        tile.x === 0 ||
        tile.x === tile.maximum;

    const cornerY =
        tile.y === 0 ||
        tile.y === tile.maximum;

    return cornerX && cornerY;
}

export function sequenceRateKeys(
    pathname,
    prefix,
    sessionId
) {
    const tile =
        tileRequest(
            pathname,
            prefix
        );

    if (!tile || tile.zoom < 5) {
        return [];
    }

    const base = [
        sessionId,
        tile.style,
        tile.map,
        tile.zoom
    ].join(':');

    return [
        `${base}:row:${tile.y}`,
        `${base}:column:${tile.x}`
    ];
}

export function hasBrowserRequestContext(
    request,
    development = false
) {
    if (development) {
        return true;
    }

    const site =
        String(
            request.headers.get(
                'Sec-Fetch-Site'
            ) ||
            ''
        ).toLowerCase();

    const mode =
        String(
            request.headers.get(
                'Sec-Fetch-Mode'
            ) ||
            ''
        ).toLowerCase();

    return (
        (!site || ['same-site', 'same-origin'].includes(site)) &&
        (!mode || ['cors', 'same-origin'].includes(mode))
    );
}

async function digest(value) {
    const bytes =
        await crypto.subtle.digest(
            'SHA-256',
            encoder.encode(value)
        );

    return Array.from(
        new Uint8Array(bytes),
        byte => byte
            .toString(16)
            .padStart(2, '0')
    ).join('');
}

export async function assetBudgetDescriptor(
    pathname,
    prefix
) {
    const relative =
        relativeAssetPath(
            pathname,
            prefix
        );

    if (!relative) {
        return null;
    }

    const terrain =
        TERRAIN_CHUNK_PATTERN.exec(relative);

    const tile =
        tileRequest(pathname, prefix);

    const category = terrain
        ? 'terrain'
        : tile
            ? 'tile'
            : 'other';

    const weight = category === 'terrain'
        ? 16
        : category === 'tile'
            ? 1
            : 4;

    return {
        key: (
            await digest(
                `wardogs-asset:${relative}`
            )
        ).slice(0, 24),
        category,
        weight
    };
}

async function clientStateKeys(sessionId, ip) {
    return {
        session:
            `hold-v2:session:${sessionId}`,
        ip:
            `hold-v2:ip:${await digest(
                `wardogs-assets:${ip}`
            )}`
    };
}

function stateRequest(key) {
    return new Request(
        `https://assets.wardogs-artillery.com/__state/${key}`,
        {
            method: 'GET'
        }
    );
}

async function cacheHas(keys) {
    const cache =
        globalThis.caches?.default;

    if (!cache) {
        return null;
    }

    const matches =
        await Promise.all(
            keys.map(key =>
                cache.match(
                    stateRequest(key)
                )
            )
        );

    return matches.some(Boolean);
}

async function kvHas(kv, keys) {
    if (!kv) {
        return false;
    }

    const values =
        await Promise.all(
            keys.map(key =>
                kv.get(key)
            )
        );

    return values.some(Boolean);
}

async function storeClientState(
    env,
    keys,
    seconds
) {
    const cache =
        globalThis.caches?.default;

    const cacheWrites = cache
        ? keys.map(key =>
            cache.put(
                stateRequest(key),
                new Response(
                    'blocked',
                    {
                        headers: {
                            'Cache-Control':
                                `max-age=${seconds}`
                        }
                    }
                )
            )
        )
        : [];

    const kvWrites = env.REQUEST_STATE
        ? keys.map(key =>
            env.REQUEST_STATE.put(
                key,
                '1',
                {
                    expirationTtl:
                        seconds
                }
            )
        )
        : [];

    const results =
        await Promise.allSettled([
            ...cacheWrites,
            ...kvWrites
        ]);

    for (const result of results) {
        if (result.status === 'rejected') {
            console.error(
                '[assets-gateway-state]',
                result.reason
            );
        }
    }
}

export async function isClientHeld(
    env,
    sessionId,
    ip
) {
    const keys =
        Object.values(
            await clientStateKeys(
                sessionId,
                ip
            )
        );

    const cached =
        await cacheHas(keys);

    /*
     * Production checks KV only on a cache-less runtime. This keeps KV reads
     * off the hot asset path. A newly created session is checked globally by
     * isClientHeldAtAdmission() before it can reach this function.
     */
    return cached === null
        ? kvHas(env.REQUEST_STATE, keys)
        : cached;
}

export async function isClientHeldAtAdmission(
    env,
    sessionId,
    ip
) {
    const keys =
        await clientStateKeys(sessionId || '', ip);
    const admissionKeys = sessionId ? Object.values(keys) : [keys.ip];

    const cached =
        await cacheHas(admissionKeys);

    if (cached) {
        return true;
    }

    return kvHas(
        env.REQUEST_STATE,
        admissionKeys
    );
}

export async function holdClient(
    env,
    sessionId,
    ip,
    seconds,
    { address = true } = {}
) {
    const stateKeys = await clientStateKeys(sessionId, ip);
    const keys = address ? Object.values(stateKeys) : [stateKeys.session];

    await storeClientState(
        env,
        keys,
        seconds
    );
}

export async function requestLogId(ip) {
    return (
        await digest(
            `wardogs-assets-log:${ip}`
        )
    ).slice(0, 16);
}
