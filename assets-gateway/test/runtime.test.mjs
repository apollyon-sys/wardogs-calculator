import assert from 'node:assert/strict';
import test from 'node:test';

import {
    handleRequest
} from '../src/index.mjs';
import { mintSession, sessionSubject } from '../src/tokens.mjs';
import { evaluateAssetBudget } from '../src/asset-request-guard.mjs';

const origin =
    'https://wardogs-artillery.com';

const userAgent =
    'WARDOGS gateway test';

const ip = '192.0.2.10';

function env() {
    return {
        ASSETS_DEV: 'true',
        SESSION_SECRET:
            'test-secret-with-at-least-thirty-two-characters',
        ASSETS: {
            async get(key) {
                if (
                    key !==
                    'releases/assets-v1/maps/test.webp'
                ) {
                    return null;
                }

                const body =
                    new TextEncoder().encode(
                        'tile'
                    );

                return {
                    body,
                    size: body.byteLength,
                    httpEtag: '"test-etag"',
                    writeHttpMetadata(headers) {
                        headers.set(
                            'Content-Type',
                            'image/webp'
                        );
                    }
                };
            },
            async head() {
                return null;
            }
        }
    };
}

function memoryKv() {
    const values = new Map();

    return {
        async get(key) {
            return values.get(key) || null;
        },
        async put(key, value) {
            values.set(key, value);
        }
    };
}

async function admittedCookie(environment) {
    const response =
        await handleRequest(
            request(
                '/__session',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type':
                            'application/json'
                    },
                    body: '{}'
                }
            ),
            environment
        );

    assert.equal(response.status, 201);

    return response.headers
        .get('Set-Cookie')
        .split(';', 1)[0];
}

function request(path, options = {}) {
    return new Request(
        `https://assets.wardogs-artillery.com${path}`,
        {
            ...options,
            headers: {
                Origin: origin,
                'User-Agent': userAgent,
                'CF-Connecting-IP': ip,
                ...(options.headers || {})
            }
        }
    );
}

test('gateway requires a signed session before reading R2', async () => {
    const environment = env();

    const denied =
        await handleRequest(
            request(
                '/releases/assets-v1/maps/test.webp'
            ),
            environment
        );

    assert.equal(denied.status, 401);

    const admitted =
        await handleRequest(
            request(
                '/__session',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type':
                            'application/json'
                    },
                    body: '{}'
                }
            ),
            environment
        );

    assert.equal(admitted.status, 201);

    const cookie =
        admitted.headers
            .get('Set-Cookie')
            .split(';', 1)[0];

    assert.match(
        cookie,
        /^__Host-wardogs_asset_session=/
    );

    const allowed =
        await handleRequest(
            request(
                '/releases/assets-v1/maps/test.webp',
                {
                    headers: {
                        Cookie: cookie
                    }
                }
            ),
            environment
        );

    assert.equal(allowed.status, 200);
    assert.equal(
        allowed.headers.get(
            'Access-Control-Allow-Credentials'
        ),
        'true'
    );
    assert.equal(
        await allowed.text(),
        'tile'
    );
});

test('gateway rejects forged origins, modified cookies and query strings', async () => {
    const environment = env();

    const wrongOrigin =
        await handleRequest(
            new Request(
                'https://assets.wardogs-artillery.com/__session',
                {
                    method: 'POST',
                    headers: {
                        Origin:
                            'https://fork.example',
                        'Content-Type':
                            'application/json'
                    },
                    body: '{}'
                }
            ),
            environment
        );

    assert.equal(wrongOrigin.status, 403);

    const forgedCookie =
        await handleRequest(
            request(
                '/releases/assets-v1/maps/test.webp',
                {
                    headers: {
                        Cookie:
                            '__Host-wardogs_asset_session=forged'
                    }
                }
            ),
            environment
        );

    assert.equal(forgedCookie.status, 401);

    const query =
        await handleRequest(
            request(
                '/releases/assets-v1/maps/test.webp?v=1'
            ),
            environment
        );

    assert.equal(query.status, 400);
});

test('configured countries receive a restricted session without Turnstile', async () => {
    const environment = {
        ...env(),
        ASSETS_DEV: 'false',
        FALLBACK_COUNTRIES: 'CN,RU',
        SESSION_RATE: {
            async limit() {
                return {
                    success: true
                };
            }
        }
    };

    const regionalRequest = (
        path,
        options
    ) => {
        const value = request(
            path,
            options
        );

        Object.defineProperty(
            value,
            'cf',
            {
                value: {
                    country: 'RU'
                }
            }
        );

        return value;
    };

    const probe =
        await handleRequest(
            regionalRequest(
                '/__session',
                {
                    method: 'GET'
                }
            ),
            environment
        );

    assert.equal(probe.status, 401);
    assert.equal(
        probe.headers.get(
            'X-Wardogs-Asset-Fallback'
        ),
        'restricted'
    );

    const admitted =
        await handleRequest(
            regionalRequest(
                '/__session',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type':
                            'application/json'
                    },
                    body: '{}'
                }
            ),
            environment
        );

    assert.equal(admitted.status, 201);
    assert.equal(
        (await admitted.json()).mode,
        'restricted'
    );
});

test('regional routing is determined by server geography even when a token is supplied', async () => {
    for (const country of ['CN', 'RU']) {
        const value = request('/__session', { method: 'POST',
            headers: { 'Content-Type': 'application/json' }, body: '{"token":"old-standard-token"}' });
        Object.defineProperty(value, 'cf', { value: { country } });
        const response = await handleRequest(value, {
            ...env(), ASSETS_DEV: 'false', FALLBACK_COUNTRIES: 'CN,RU',
            SESSION_RATE: { async limit() { return { success: true }; } }
        });
        assert.equal(response.status, 201);
        assert.equal((await response.json()).mode, 'restricted');
    }
});

test('a signed cookie from the other delivery region cannot reuse a mismatched session', async () => {
    const environment = { ...env(), ASSETS_DEV: 'false', FALLBACK_COUNTRIES: 'CN,RU',
        SESSION_RATE: { async limit() { return { success: true }; } } };
    for (const [country, mode] of [['CN', 'standard'], ['US', 'restricted']]) {
        const token = await mintSession(environment.SESSION_SECRET, Date.now() + 60000,
            mode, sessionSubject(request('/__session')));
        const value = request('/__session', { headers: { Cookie: `__Host-wardogs_asset_session=${token}` } });
        Object.defineProperty(value, 'cf', { value: { country } });
        const response = await handleRequest(value, environment);
        assert.equal(response.status, 401);
        assert.equal(response.headers.get('X-Wardogs-Asset-Fallback'), country === 'CN' ? 'restricted' : null);
    }
});

test('a client-provided country header cannot grant regional admission', async () => {
    const value = request('/__session', { method: 'POST',
        headers: { 'Content-Type': 'application/json', 'CF-IPCountry': 'CN' }, body: '{}' });
    Object.defineProperty(value, 'cf', { value: { country: 'US' } });
    const response = await handleRequest(value, {
        ...env(), ASSETS_DEV: 'false', FALLBACK_COUNTRIES: 'CN,RU',
        SESSION_RATE: { async limit() { return { success: true }; } }
    });
    assert.equal(response.status, 503, 'standard admission still requires a configured challenge');
    assert.equal(response.headers.get('Set-Cookie'), null);
});

test('gateway CORS exposes diagnostic headers while retaining credentialed origin checks', async () => {
    const response = await handleRequest(request('/__session'), env());
    assert.equal(response.headers.get('Access-Control-Allow-Origin'), origin);
    assert.equal(response.headers.get('Access-Control-Allow-Credentials'), 'true');
    assert.match(response.headers.get('Access-Control-Expose-Headers'), /CF-Ray/);
    assert.match(response.headers.get('Access-Control-Expose-Headers'), /CF-Mitigated/);
});

test('request policy holds the session and its IP before reading R2', async () => {
    let reads = 0;
    const environment = {
        ...env(),
        REQUEST_STATE: memoryKv()
    };

    environment.ASSETS = {
        async get() {
            reads += 1;
            return null;
        },
        async head() {
            reads += 1;
            return null;
        }
    };

    const cookie =
        await admittedCookie(
            environment
        );

    const rejected =
        await handleRequest(
            request(
                '/releases/assets-v1/maps/tiles/bakurani/zoom_5/31_31.webp',
                {
                    headers: {
                        Cookie: cookie
                    }
                }
            ),
            environment
        );

    assert.equal(rejected.status, 429);
    assert.match(rejected.headers.get('Access-Control-Expose-Headers'), /\bRetry-After\b/);
    assert.equal(
        rejected.headers.get('Retry-After'),
        '600'
    );
    assert.equal(reads, 0);

    const continued =
        await handleRequest(
            request(
                '/releases/assets-v1/maps/test.webp',
                {
                    headers: {
                        Cookie: cookie
                    }
                }
            ),
            environment
        );

    assert.equal(continued.status, 429);
    assert.equal(reads, 0);

    const replacementSession =
        await handleRequest(
            request(
                '/__session',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type':
                            'application/json'
                    },
                    body: '{}'
                }
            ),
            environment
        );

    assert.equal(replacementSession.status, 429);
});

test('a cumulative session penalty blocks before R2 and holds renewal without penalizing neighbours', async () => {
    let reads = 0;
    let checkedActor = '';
    let checkedBody;

    const environment = {
        ...env(),
        REQUEST_STATE: memoryKv(),
        ASSET_REQUEST_GUARD: {
            idFromName(actor) {
                checkedActor = actor;
                return actor;
            },
            get() {
                return {
                    async fetch(
                        input,
                        init
                    ) {
                        const requestValue =
                            new Request(
                                input,
                                init
                            );

                        checkedBody =
                            await requestValue.json();

                        return Response.json({
                            allowed: false,
                            holdSeconds: 21600,
                            reason: 'session-assets',
                            scope: 'session',
                            strikeLevel: 2
                        });
                    }
                };
            }
        }
    };

    environment.ASSETS = {
        async get() {
            reads += 1;
            return null;
        },
        async head() {
            reads += 1;
            return null;
        }
    };

    const cookie =
        await admittedCookie(environment);

    const rejected =
        await handleRequest(
            request(
                '/releases/assets-v1/maps/test.webp',
                {
                    headers: {
                        Cookie: cookie
                    }
                }
            ),
            environment
        );

    assert.equal(rejected.status, 429);
    assert.equal(
        rejected.headers.get('Retry-After'),
        '21600'
    );
    assert.equal(reads, 0);
    assert.equal(checkedActor.length, 16);
    assert.equal(checkedBody.category, 'other');
    assert.equal(checkedBody.weight, 4);

    const replacementSession =
        await handleRequest(
            request(
                '/__session',
                {
                    method: 'POST',
                    headers: {
                        Cookie: cookie,
                        'Content-Type':
                            'application/json'
                    },
                    body: '{}'
                }
            ),
            environment
        );

    assert.equal(replacementSession.status, 429);
    const neighbour = await handleRequest(request('/__session', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}'
    }), environment);
    assert.equal(neighbour.status, 201);
});

test('explicit context and sequence limits throttle briefly without holding a session or its IP', async () => {
    const makeLimiter = success => ({
        async limit() {
            return {
                success
            };
        }
    });

    for (const binding of [
        'ASSET_CONTEXT_RATE',
        'ASSET_SEQUENCE_RATE'
    ]) {
        const environment = {
            ...env(),
            REQUEST_STATE: memoryKv(),
            ASSET_BUDGET_ENABLED: 'false',
            ASSET_SESSION_RATE:
                makeLimiter(true),
            ASSET_IP_RATE:
                makeLimiter(true),
            ASSET_WINDOW_RATE:
                makeLimiter(true),
            ASSET_CONTEXT_RATE:
                makeLimiter(true),
            ASSET_SEQUENCE_RATE:
                makeLimiter(true)
        };

        environment.ASSETS_DEV = 'false';
        environment[binding] =
            makeLimiter(false);

        const cookie =
            await admittedCookie({
                ...environment,
                ASSETS_DEV: 'true'
            });

        const headers = {
            Cookie: cookie
        };

        if (binding === 'ASSET_SEQUENCE_RATE') {
            headers['Sec-Fetch-Site'] =
                'same-site';
            headers['Sec-Fetch-Mode'] =
                'cors';
        } else {
            headers['Sec-Fetch-Site'] = 'cross-site';
        }

        const response =
            await handleRequest(
                request(
                    '/releases/assets-v1/maps/tiles/bakurani/zoom_5/10_10.webp',
                    {
                        headers
                    }
                ),
                environment
            );

        assert.equal(
            response.status,
            429,
            binding
        );
        assert.equal(
            response.headers.get(
                'Retry-After'
            ),
            binding === 'ASSET_CONTEXT_RATE' ? '60' : '10'
        );

        const ordinary = await handleRequest(request('/releases/assets-v1/maps/test.webp', {
            headers: { Cookie: cookie, 'Sec-Fetch-Site': 'same-site', 'Sec-Fetch-Mode': 'cors' }
        }), environment);
        assert.equal(ordinary.status, 200);
    }
});

function productionEnvironment() {
    const limiter = { async limit() { return { success: true }; } };
    const environment = { ...env(), ASSETS_DEV: 'false', FALLBACK_COUNTRIES: 'CN,RU',
        REQUEST_STATE: memoryKv(), SESSION_RATE: limiter, ASSET_RESTRICTED_RATE: limiter,
        ASSET_SESSION_RATE: limiter, ASSET_IP_RATE: limiter, ASSET_WINDOW_RATE: limiter,
        ASSET_CONTEXT_RATE: limiter, ASSET_SEQUENCE_RATE: limiter };
    const states = new Map();
    const checks = [];
    environment.ASSET_REQUEST_GUARD = {
        idFromName: actor => actor,
        get: actor => ({ async fetch(_url, init) {
            const input = JSON.parse(init.body);
            checks.push({ actor, ...input });
            const evaluated = evaluateAssetBudget(states.get(actor), input, input.limits);
            states.set(actor, evaluated.state);
            return Response.json(evaluated.decision);
        } })
    };
    return { environment, checks };
}

function regional(path, options = {}, address = ip) {
    const value = request(path, { ...options,
        headers: { ...options.headers, 'CF-Connecting-IP': address } });
    Object.defineProperty(value, 'cf', { value: { country: 'CN' } });
    return value;
}

async function regionalCookie(environment, headers = {}, address = ip) {
    const response = await handleRequest(regional('/__session', {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: '{}'
    }, address), environment);
    assert.equal(response.status, 201);
    return response.headers.get('Set-Cookie').split(';', 1)[0];
}

test('regional session recovery rebinds an address without resetting the guard or admitting unbound asset requests', async () => {
    const { environment, checks } = productionEnvironment();
    const cookie = await regionalCookie(environment);
    const path = '/releases/assets-v1/maps/test.webp';
    assert.equal((await handleRequest(regional(path, { headers: { Cookie: cookie } }), environment)).status, 200);
    const moved = '198.51.100.20';
    assert.equal((await handleRequest(regional(path, { headers: { Cookie: cookie } }, moved), environment)).status, 401);
    assert.equal(checks.length, 1, 'the old address-bound cookie must not reach the guard or R2');

    const recovered = await handleRequest(regional('/__session', { headers: { Cookie: cookie } }, moved), environment);
    assert.equal(recovered.status, 200);
    const rebound = recovered.headers.get('Set-Cookie').split(';', 1)[0];
    assert.notEqual(rebound, cookie);
    assert.equal((await handleRequest(regional(path, { headers: { Cookie: rebound } }, moved), environment)).status, 200);
    assert.equal(checks[1].actor, checks[0].actor);
    assert.equal(checks[1].sessionId, checks[0].sessionId);

    // Repeated POST renewal also retains the same ledger and session id.
    const renewed = await handleRequest(regional('/__session', { method: 'POST',
        headers: { Cookie: rebound, 'Content-Type': 'application/json' }, body: '{}' }, moved), environment);
    const renewedCookie = renewed.headers.get('Set-Cookie').split(';', 1)[0];
    assert.equal((await handleRequest(regional(path, { headers: { Cookie: renewedCookie } }, moved), environment)).status, 200);
    assert.equal(checks[2].actor, checks[0].actor);
    assert.equal(checks[2].sessionId, checks[0].sessionId);
});

test('missing Fetch Metadata does not invoke the restrictive context limiter', async () => {
    const { environment } = productionEnvironment();
    environment.ASSET_CONTEXT_RATE = { async limit() { throw new Error('ordinary legacy browser was penalized'); } };
    const cookie = await regionalCookie(environment);
    for (let i = 0; i < 30; i++) {
        const response = await handleRequest(regional('/releases/assets-v1/maps/test.webp',
            { headers: { Cookie: cookie } }), environment);
        assert.equal(response.status, 200);
    }
});

test('address recovery and POST renewal cannot replenish a spent download budget', async () => {
    const { environment, checks } = productionEnvironment();
    environment.ASSET_BUDGET_SESSION_POINTS = '100';
    let reads = 0;
    const get = environment.ASSETS.get;
    environment.ASSETS.get = async () => {
        reads++;
        return get('releases/assets-v1/maps/test.webp');
    };
    let cookie = await regionalCookie(environment);
    const load = (index, address = ip) => handleRequest(regional(
        `/releases/assets-v1/maps/budget-${index}.webp`,
        { headers: { Cookie: cookie } }, address
    ), environment);
    for (let index = 0; index < 10; index++) {
        assert.equal((await load(index)).status, 200);
    }

    const moved = '198.51.100.20';
    const rebound = await handleRequest(regional('/__session',
        { headers: { Cookie: cookie } }, moved), environment);
    assert.equal(rebound.status, 200);
    cookie = rebound.headers.get('Set-Cookie').split(';', 1)[0];
    cookie = await regionalCookie(environment, { Cookie: cookie }, moved);
    for (let index = 10; index < 25; index++) {
        assert.equal((await load(index, moved)).status, 200);
    }
    assert.equal((await load(25, moved)).status, 429);
    assert.equal(reads, 25, 'the crossing asset is rejected before R2');
    assert.equal(new Set(checks.map(check => check.actor)).size, 1);
    assert.equal(new Set(checks.map(check => check.sessionId)).size, 1);
    assert.equal((await handleRequest(regional('/__session',
        { headers: { Cookie: cookie } }, '203.0.113.30'), environment)).status, 429);

    cookie = await regionalCookie(environment);
    assert.equal((await load('neighbour')).status, 200,
        'an individual session penalty must not block its neighbours');
});

test('a held recoverable session cannot evade admission by changing its address', async () => {
    const { environment } = productionEnvironment();
    const cookie = await regionalCookie(environment);
    const rejected = await handleRequest(regional('/releases/assets-v1/maps/tiles/bakurani/zoom_5/31_31.webp',
        { headers: { Cookie: cookie } }), environment);
    assert.equal(rejected.status, 429);
    const moved = await handleRequest(regional('/__session', { headers: { Cookie: cookie } }, '198.51.100.20'), environment);
    assert.equal(moved.status, 429);
    assert.equal(moved.headers.get('Set-Cookie'), null);
});

test('legacy cookies are upgraded and sessions nearing expiry renew without a new budget', async () => {
    const { environment, checks } = productionEnvironment();
    const legacy = await mintSession(environment.SESSION_SECRET, Date.now() + 30000,
        'restricted', sessionSubject(regional('/__session')));
    const response = await handleRequest(regional('/__session', {
        headers: { Cookie: `__Host-wardogs_asset_session=${legacy}` }
    }), environment);
    assert.equal(response.status, 200);
    assert.ok((await response.json()).expiresAt > Date.now() + 1100000);
    const cookie = response.headers.get('Set-Cookie').split(';', 1)[0];
    assert.match(cookie, /^__Host-wardogs_asset_session=v2\./);
    assert.equal((await handleRequest(regional('/releases/assets-v1/maps/test.webp',
        { headers: { Cookie: cookie } }), environment)).status, 200);
    assert.equal(checks[0].sessionId, legacy.split('.')[0]);
});
