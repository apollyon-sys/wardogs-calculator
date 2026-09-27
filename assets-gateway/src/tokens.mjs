const encoder = new TextEncoder();

const TOKEN =
    /^([A-Za-z0-9_-]{22})\.([a-z0-9]{8,12})\.([sr])\.([A-Za-z0-9_-]{43})$/;

function base64url(bytes) {
    return btoa(
        String.fromCharCode(...bytes)
    )
        .replaceAll('+', '-')
        .replaceAll('/', '_')
        .replace(/=+$/, '');
}

function decodeBase64url(value) {
    const normalized =
        value
            .replaceAll('-', '+')
            .replaceAll('_', '/');

    const padding =
        '='.repeat(
            (4 - normalized.length % 4) % 4
        );

    return Uint8Array.from(
        atob(normalized + padding),
        character => character.charCodeAt(0)
    );
}

function randomId() {
    return base64url(
        crypto.getRandomValues(
            new Uint8Array(16)
        )
    );
}

async function signingKey(secret) {
    return crypto.subtle.importKey(
        'raw',
        encoder.encode(secret),
        {
            name: 'HMAC',
            hash: 'SHA-256'
        },
        false,
        ['sign', 'verify']
    );
}

function signedMessage(payload, subject) {
    return `wardogs-assets:${payload}:${subject}`;
}

export function sessionSubject(request) {
    const ip =
        request.headers.get('CF-Connecting-IP') ||
        'local';

    const userAgent =
        request.headers.get('User-Agent') ||
        '';

    return `${ip}\n${userAgent}`;
}

export async function mintSession(
    secret,
    expiresAt,
    mode,
    subject
) {
    const marker =
        mode === 'restricted'
            ? 'r'
            : 's';

    const payload =
        `${randomId()}.${expiresAt.toString(36)}.${marker}`;

    const signature =
        await crypto.subtle.sign(
            'HMAC',
            await signingKey(secret),
            encoder.encode(
                signedMessage(
                    payload,
                    subject
                )
            )
        );

    return `${payload}.${base64url(
        new Uint8Array(signature)
    )}`;
}

export async function verifySession(
    secret,
    token,
    subject,
    now = Date.now()
) {
    const match =
        typeof token === 'string'
            ? TOKEN.exec(token)
            : null;

    if (!match) {
        return null;
    }

    const expiresAt =
        parseInt(match[2], 36);

    if (
        !Number.isSafeInteger(expiresAt) ||
        expiresAt <= now
    ) {
        return null;
    }

    const payload =
        `${match[1]}.${match[2]}.${match[3]}`;

    const valid =
        await crypto.subtle.verify(
            'HMAC',
            await signingKey(secret),
            decodeBase64url(match[4]),
            encoder.encode(
                signedMessage(
                    payload,
                    subject
                )
            )
        );

    if (!valid) {
        return null;
    }

    return {
        id: match[1],
        expiresAt,
        mode:
            match[3] === 'r'
                ? 'restricted'
                : 'standard'
    };
}
