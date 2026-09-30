import { DurableObject } from 'cloudflare:workers';

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export const FEEDBACK_GUARD_POLICY = Object.freeze({
    cooldownMs: 30 * SECOND,
    hourlyLimit: 3,
    dailyLimit: 10,
    duplicateWindowMs: DAY,
    rejectionWindowMs: 10 * MINUTE,
    rejectionLimit: 3,
    blockMs: DAY
});

function validDigest(value) {
    return typeof value === 'string' &&
        /^[a-f0-9]{32,64}$/.test(value);
}

/* One compact record per pseudonymous sender. Raw IPs and message text are never stored. */
export class FeedbackGuard extends DurableObject {
    async admit(messageDigest, suppliedNow = Date.now()) {
        if (!validDigest(messageDigest)) {
            return { allowed: false, reason: 'invalid' };
        }

        const now = Number.isFinite(Number(suppliedNow))
            ? Number(suppliedNow)
            : Date.now();

        return this.ctx.blockConcurrencyWhile(async () => {
            const policy = FEEDBACK_GUARD_POLICY;
            const stored = await this.ctx.storage.get('feedback');
            const state = stored && typeof stored === 'object'
                ? stored
                : { accepted: [], rejected: [], blockedUntil: 0 };

            state.accepted = Array.isArray(state.accepted)
                ? state.accepted.filter(item =>
                    item &&
                    Number(item.at) > now - policy.duplicateWindowMs &&
                    validDigest(item.digest)
                )
                : [];
            state.rejected = Array.isArray(state.rejected)
                ? state.rejected
                    .map(Number)
                    .filter(at => Number.isFinite(at) && at > now - policy.rejectionWindowMs)
                : [];
            state.blockedUntil = Number(state.blockedUntil) || 0;

            if (state.blockedUntil > now) {
                return {
                    allowed: false,
                    reason: 'blocked',
                    blockedUntil: state.blockedUntil
                };
            }

            const lastAccepted = state.accepted.at(-1)?.at || 0;
            const duplicate = state.accepted.some(
                item => item.digest === messageDigest
            );
            const hourlyCount = state.accepted.filter(
                item => item.at > now - HOUR
            ).length;

            let reason = '';
            if (duplicate) reason = 'duplicate';
            else if (lastAccepted > now - policy.cooldownMs) reason = 'cooldown';
            else if (hourlyCount >= policy.hourlyLimit) reason = 'hourly-limit';
            else if (state.accepted.length >= policy.dailyLimit) reason = 'daily-limit';

            if (reason) {
                state.rejected.push(now);
                if (
                    reason === 'hourly-limit' ||
                    reason === 'daily-limit' ||
                    state.rejected.length >= policy.rejectionLimit
                ) {
                    state.blockedUntil = now + policy.blockMs;
                }

                await this.persist(state, now);
                return {
                    allowed: false,
                    reason,
                    blockedUntil: state.blockedUntil || 0
                };
            }

            state.accepted.push({
                at: now,
                digest: messageDigest
            });
            await this.persist(state, now);
            return { allowed: true, reason: '' };
        });
    }

    async persist(state, now) {
        await this.ctx.storage.put('feedback', state);
        const cleanupAt = Math.max(
            now + FEEDBACK_GUARD_POLICY.duplicateWindowMs + MINUTE,
            Number(state.blockedUntil) + MINUTE
        );
        await this.ctx.storage.setAlarm(cleanupAt);
    }

    async alarm() {
        await this.ctx.storage.deleteAll();
    }
}
