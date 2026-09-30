import assert from 'node:assert/strict';
import test from 'node:test';

import {
    handleRequest
} from '../src/index.mjs';

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

test('cumulative asset guard blocks before reading R2 and holds admission', async () => {
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

test('reduced-context and sequence limits produce ten-minute holds', async () => {
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
            '600'
        );
    }
});
