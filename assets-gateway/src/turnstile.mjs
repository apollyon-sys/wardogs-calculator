const SITEVERIFY =
    'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export async function validateTurnstile(
    env,
    config,
    token,
    remoteip
) {
    if (config.development) {
        return {
            ok: true
        };
    }

    if (
        typeof env.TURNSTILE_SECRET !== 'string' ||
        env.TURNSTILE_SECRET.length < 16 ||
        !/^[a-z0-9.-]+$/i.test(
            config.turnstileHostname
        ) ||
        !/^[a-z0-9_-]{1,32}$/i.test(
            config.turnstileAction
        )
    ) {
        return {
            ok: false,
            error: 'turnstile-not-configured',
            status: 503
        };
    }

    if (
        typeof token !== 'string' ||
        !token ||
        token.length > 2048
    ) {
        return {
            ok: false,
            error: 'challenge-required',
            status: 403
        };
    }

    try {
        const response =
            await fetch(
                SITEVERIFY,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type':
                            'application/json'
                    },
                    body: JSON.stringify({
                        secret:
                            env.TURNSTILE_SECRET,
                        response: token,
                        remoteip
                    }),
                    signal:
                        AbortSignal.timeout(5000)
                }
            );

        if (!response.ok) {
            return {
                ok: false,
                error: 'challenge-unavailable',
                status: 503
            };
        }

        const result =
            await response.json();

        const hostnameMatches =
            result.hostname ===
                config.turnstileHostname;

        const actionMatches =
            result.action ===
                config.turnstileAction;

        if (
            result.success !== true ||
            !hostnameMatches ||
            !actionMatches
        ) {
            return {
                ok: false,
                error: 'challenge-failed',
                status: 403
            };
        }

        return {
            ok: true
        };
    } catch {
        return {
            ok: false,
            error: 'challenge-unavailable',
            status: 503
        };
    }
}
