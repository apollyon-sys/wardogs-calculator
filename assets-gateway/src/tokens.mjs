const encoder = new TextEncoder();

const TOKEN =
    /^([A-Za-z0-9_-]{22})\.([a-z0-9]{8,12})\.([sr])\.([A-Za-z0-9_-]{43})$/;
const RECOVERABLE_TOKEN =
    /^v2\.([A-Za-z0-9_-]{22})\.([a-z0-9]{8,12})\.([sr])\.([a-f0-9]{16})\.([a-f0-9]{16})\.([A-Za-z0-9_-]{43})$/;

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

function browserSubject(subject) {
    return subject.slice(subject.indexOf('\n') + 1);
}

async function addressTag(subject) {
    const address = subject.split('\n', 1)[0];
    const bytes = await crypto.subtle.digest(
        'SHA-256', encoder.encode(`wardogs-assets-log:${address}`)
    );
    return Array.from(new Uint8Array(bytes), byte =>
        byte.toString(16).padStart(2, '0')
    ).join('').slice(0, 16);
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
    subject,
    { id = randomId(), budgetActor = '' } = {}
) {
    if (!/^[A-Za-z0-9_-]{22}$/.test(id) ||
        (budgetActor && !/^[a-f0-9]{16}$/.test(budgetActor))) {
        throw new Error('invalid-session-identity');
    }
    const marker =
        mode === 'restricted'
            ? 'r'
            : 's';

    const payload = budgetActor
        ? `v2.${id}.${expiresAt.toString(36)}.${marker}.${budgetActor}.${await addressTag(subject)}`
        : `${id}.${expiresAt.toString(36)}.${marker}`;

    const signature =
        await crypto.subtle.sign(
            'HMAC',
            await signingKey(secret),
            encoder.encode(
                signedMessage(
                    payload,
                    budgetActor ? browserSubject(subject) : subject
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
    now = Date.now(),
    { allowAddressChange = false, assetSession = false } = {}
) {
    const recoverable = assetSession && typeof token === 'string'
        ? RECOVERABLE_TOKEN.exec(token) : null;
    const match =
        recoverable || (typeof token === 'string'
            ? TOKEN.exec(token)
            : null);

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

    const payload = token.slice(0, token.lastIndexOf('.'));
    const signature = match[recoverable ? 6 : 4];

    const valid =
        await crypto.subtle.verify(
            'HMAC',
            await signingKey(secret),
            decodeBase64url(signature),
            encoder.encode(
                signedMessage(
                    payload,
                    recoverable ? browserSubject(subject) : subject
                )
            )
        );

    if (!valid) {
        return null;
    }

    const addressMatches = !recoverable || match[5] === await addressTag(subject);
    if (!addressMatches && !allowAddressChange) {
        return null;
    }

    return {
        id: match[1],
        expiresAt,
        mode:
            match[3] === 'r'
                ? 'restricted'
                : 'standard',
        ...(recoverable ? {
            budgetActor: match[4],
            addressActor: match[5],
            addressMatches
        } : {})
    };
}
