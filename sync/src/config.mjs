import appConfig from '../../config/app.json' with { type: 'json' };

function integer(value, fallback, min, max) {
    return Number.isSafeInteger(value) && value >= min && value <= max ? value : fallback;
}
export function settings(env = {}) {
    const c = appConfig.collab || {};
    const turnstile = c.turnstile || {};
    const development = env.LOBBIES_DEV === 'true';
    const productionOrigins = Array.isArray(c.allowedOrigins) ? c.allowedOrigins : [];
    const developmentOrigins = Array.isArray(c.developmentOrigins) ? c.developmentOrigins : [];
    return {
        development,
        enabled: env.LOBBIES_DISABLED !== 'true' && (c.enabled === true || development),
        maxParticipants: integer(c.maxParticipants, 8, 1, 32),
        roomLifetimeHours: integer(c.roomLifetimeHours, 6, 1, 24),
        maxRoomsPerDay: integer(c.maxRoomsPerDay, 250, 1, 10000),
        maxChangeBatchesPerDay: integer(c.maxChangeBatchesPerDay, 20000, 32, 1000000),
        maxChangeBatchesPerRoom: integer(c.maxChangeBatchesPerRoom, 1000, 1, 10000),
        maxRoomsPerAdmission: integer(c.maxRoomsPerAdmission, 3, 1, 25),
        maxRoomsPerChinaIpPerDay: integer(Number(env.CN_LOBBY_MAX_ROOMS_PER_IP_DAY), 5, 1, 25),
        admissionLifetimeMinutes: integer(c.admissionLifetimeMinutes, 30, 5, 120),
        maxInvalidMessages: integer(c.maxInvalidMessages, 5, 1, 20),
        allowedOrigins: development
            ? [...new Set([...productionOrigins, ...developmentOrigins])]
            : productionOrigins,
        turnstileRequired: !development && turnstile.enabled === true,
        turnstileMainlandChinaFallback:
            !development && turnstile.enabled === true && env.CN_LOBBY_FALLBACK_DISABLED !== 'true',
        turnstileHostname: typeof turnstile.hostname === 'string' ? turnstile.hostname : '',
        turnstileAction: typeof turnstile.action === 'string' && turnstile.action
            ? turnstile.action
            : 'create-lobby'
    };
}
