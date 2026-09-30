const STATE_KEY = 'asset-budget';

const MINUTE_MS = 60_000;
const CLEANUP_MS = 8 * 24 * 60 * MINUTE_MS;
const MAX_TRACKED_SESSIONS = 64;

const HOLD_SECONDS = [
    600,
    21_600,
    86_400,
    604_800
];

function emptyState(now) {
    return {
        windowStartedAt: now,
        ipAssets: [],
        ipPoints: 0,
        ipTerrain: 0,
        sessions: {},
        strikeLevel: -1,
        lastStrikeAt: 0,
        blockedUntil: 0
    };
}

function validInput(input) {
    return (
        typeof input?.sessionId === 'string' &&
        /^[A-Za-z0-9:_-]{1,128}$/.test(
            input.sessionId
        ) &&
        typeof input?.assetKey === 'string' &&
        /^[a-f0-9]{24}$/.test(
            input.assetKey
        ) &&
        Number.isSafeInteger(input?.weight) &&
        input.weight >= 1 &&
        input.weight <= 64 &&
        ['tile', 'terrain', 'other'].includes(
            input?.category
        )
    );
}

function validLimits(limits) {
    return [
        limits?.windowSeconds,
        limits?.sessionPoints,
        limits?.ipPoints,
        limits?.sessionTerrain,
        limits?.ipTerrain,
        limits?.strikeMemorySeconds
    ].every(value =>
        Number.isSafeInteger(value) &&
        value > 0
    );
}

function sessionState(state, sessionId) {
    if (!state.sessions[sessionId]) {
        const sessions =
            Object.keys(state.sessions);

        if (
            sessions.length >=
                MAX_TRACKED_SESSIONS
        ) {
            delete state.sessions[sessions[0]];
        }

        state.sessions[sessionId] = {
            assets: [],
            points: 0,
            terrain: 0
        };
    }

    return state.sessions[sessionId];
}

function resetBudgetWindow(state, now) {
    state.windowStartedAt = now;
    state.ipAssets = [];
    state.ipPoints = 0;
    state.ipTerrain = 0;
    state.sessions = {};
}

function violationReason(
    state,
    session,
    limits
) {
    if (
        session.terrain >
            limits.sessionTerrain
    ) {
        return 'session-terrain';
    }

    if (
        state.ipTerrain >
            limits.ipTerrain
    ) {
        return 'ip-terrain';
    }

    if (
        session.points >
            limits.sessionPoints
    ) {
        return 'session-assets';
    }

    if (
        state.ipPoints > limits.ipPoints
    ) {
        return 'ip-assets';
    }

    return '';
}

function strike(state, now, limits) {
    const remainsRecent =
        state.lastStrikeAt > 0 &&
        now - state.lastStrikeAt <=
            limits.strikeMemorySeconds * 1000;

    state.strikeLevel = remainsRecent
        ? Math.min(
            state.strikeLevel + 1,
            HOLD_SECONDS.length - 1
        )
        : 0;

    const holdSeconds =
        HOLD_SECONDS[state.strikeLevel];

    state.lastStrikeAt = now;
    state.blockedUntil =
        now + holdSeconds * 1000;

    return holdSeconds;
}

export function evaluateAssetBudget(
    previous,
    input,
    limits,
    now = Date.now()
) {
    if (
        !validInput(input) ||
        !validLimits(limits) ||
        !Number.isSafeInteger(now) ||
        now < 0
    ) {
        throw new Error('invalid-asset-budget-input');
    }

    const state = previous || emptyState(now);
    let changed = !previous;

    if (state.blockedUntil > now) {
        return {
            state,
            changed,
            decision: {
                allowed: false,
                holdSeconds: Math.max(
                    1,
                    Math.ceil(
                        (
                            state.blockedUntil -
                            now
                        ) / 1000
                    )
                ),
                reason: 'held',
                strikeLevel:
                    state.strikeLevel + 1
            }
        };
    }

    const windowMilliseconds =
        limits.windowSeconds * 1000;

    if (
        !Number.isSafeInteger(
            state.windowStartedAt
        ) ||
        now - state.windowStartedAt >=
            windowMilliseconds
    ) {
        resetBudgetWindow(state, now);
        changed = true;
    }

    const session =
        sessionState(
            state,
            input.sessionId
        );

    if (!session.assets.includes(input.assetKey)) {
        session.assets.push(input.assetKey);
        session.points += input.weight;

        if (input.category === 'terrain') {
            session.terrain += 1;
        }

        changed = true;
    }

    if (!state.ipAssets.includes(input.assetKey)) {
        state.ipAssets.push(input.assetKey);
        state.ipPoints += input.weight;

        if (input.category === 'terrain') {
            state.ipTerrain += 1;
        }

        changed = true;
    }

    const reason =
        violationReason(
            state,
            session,
            limits
        );

    if (!reason) {
        return {
            state,
            changed,
            decision: {
                allowed: true,
                holdSeconds: 0,
                reason: '',
                strikeLevel: Math.max(
                    0,
                    state.strikeLevel + 1
                )
            }
        };
    }

    const holdSeconds =
        strike(state, now, limits);

    /*
     * The asset that crossed the limit is rejected before R2 is read. Start a
     * fresh budget after the hold so one violation does not immediately cause
     * another strike when the client is allowed back.
     */
    resetBudgetWindow(state, now);

    return {
        state,
        changed: true,
        decision: {
            allowed: false,
            holdSeconds,
            reason,
            strikeLevel:
                state.strikeLevel + 1
        }
    };
}

export class AssetRequestGuard {
    constructor(context) {
        this.context = context;
    }

    async fetch(request) {
        if (request.method !== 'POST') {
            return new Response(
                'Method not allowed',
                {
                    status: 405,
                    headers: {
                        Allow: 'POST'
                    }
                }
            );
        }

        let body;

        try {
            body = await request.json();
        } catch {
            return Response.json(
                {
                    error: 'bad-request'
                },
                {
                    status: 400
                }
            );
        }

        const now = Date.now();

        let result;

        try {
            result =
                await this.context.storage
                    .transaction(
                        async transaction => {
                            const previous =
                                await transaction.get(
                                    STATE_KEY
                                );

                            const evaluated =
                                evaluateAssetBudget(
                                    previous,
                                    body,
                                    body.limits,
                                    now
                                );

                            if (evaluated.changed) {
                                await transaction.put(
                                    STATE_KEY,
                                    evaluated.state
                                );
                            }

                            return {
                                decision:
                                    evaluated.decision,
                                created: !previous,
                                blockedUntil:
                                    evaluated.state
                                        .blockedUntil
                            };
                        }
                    );
        } catch (error) {
            if (
                error?.message ===
                    'invalid-asset-budget-input'
            ) {
                return Response.json(
                    {
                        error: 'bad-request'
                    },
                    {
                        status: 400
                    }
                );
            }

            throw error;
        }

        if (
            result.created ||
            !result.decision.allowed
        ) {
            await this.context.storage.setAlarm(
                Math.max(
                    now,
                    result.blockedUntil
                ) + CLEANUP_MS
            );
        }

        return Response.json(result.decision);
    }

    async alarm() {
        await this.context.storage.deleteAll();
    }
}
