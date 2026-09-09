import { DurableObject } from 'cloudflare:workers';
import { settings } from './config.mjs';
import { hash } from './tokens.mjs';
import { documentBounds, validateCatalogDocument } from './catalog.mjs';
import {
    LIMITS, byteLength, normalizeDocument, normalizeOperations, applyOperations,
    normalizePlayerName, normalizePresence, same
} from '../../js/collab/protocol.mjs';

const today = () => new Date().toISOString().slice(0, 10);
const publicChangeError = value => (
    /^(bad-|too-|wrong-|duplicate-|unsupported-|outside-|room-too-large|conflict$|no-change$|expired$|room-budget$|daily-budget$)/.test(value)
        ? value
        : 'invalid-change'
);

/* A single small row for global admission and write-credit allocation. No polling. */
export class LobbyBudget extends DurableObject {
    async grant(kind, actor = '', actorLimit = null) {
        return this.ctx.blockConcurrencyWhile(async () => {
            const config = settings(this.env);
            const day = today();
            if (!config.enabled) return { amount: 0, day };
            let row = await this.ctx.storage.get('budget');
            if (!row || row.day !== day) {
                const oldActorKeys = [...(await this.ctx.storage.list({ prefix: 'actor:' })).keys()];
                if (oldActorKeys.length) await this.ctx.storage.delete(oldActorKeys);
                row = { day, rooms: 0, batches: 0 };
            }
            let amount = 0;
            let reason = '';
            if (kind === 'create') {
                const actorKey = `actor:${day}:${actor}`;
                const actorRooms = Number(await this.ctx.storage.get(actorKey)) || 0;
                const effectiveActorLimit = Number.isSafeInteger(actorLimit)
                    ? Math.max(1, Math.min(config.maxRoomsPerDay, actorLimit))
                    : config.maxRoomsPerAdmission;
                if (!actor || actorRooms >= effectiveActorLimit) {
                    reason = 'admission-limit';
                } else if (row.rooms >= config.maxRoomsPerDay) {
                    reason = 'daily-limit';
                } else {
                    amount = 1;
                    row.rooms++;
                    await this.ctx.storage.put(actorKey, actorRooms + 1);
                }
            } else if (kind === 'changes') {
                amount = Math.max(0, Math.min(32, config.maxChangeBatchesPerDay - row.batches));
                row.batches += amount;
            }
            if (amount) await this.ctx.storage.put('budget', row);
            return { amount, day, reason };
        });
    }
}

/* Fixed lifetime, one row per commit, no timers/periodic flushes inside the DO. */
export class LobbyRoom extends DurableObject {
    constructor(ctx, env) {
        super(ctx, env);
        this.record = null;
        this.ctx.blockConcurrencyWhile(async () => { this.record = await ctx.storage.get('room') || null; });
        this.ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));
    }
    async create(doc, expiresAt, ownerHash) {
        return this.ctx.blockConcurrencyWhile(async () => {
            if (this.record || !settings(this.env).enabled) return false;
            this.record = { doc: normalizeDocument(doc), expiresAt, ownerHash, revision: 0, updates: 0, credits: 0, creditDay: '' };
            await this.ctx.storage.put('room', this.record);
            await this.ctx.storage.setAlarm(expiresAt);
            return true;
        });
    }
    alive() { return this.record && this.record.expiresAt > Date.now(); }
    peers() { return this.ctx.getWebSockets().filter(ws => ws.readyState === 1); }
    roster() {
        return this.peers().map(ws => {
            const a = ws.deserializeAttachment();
            return {
                id: a.id,
                name: a.name,
                origin: a.origin || null,
                target: a.target || null
            };
        });
    }
    send(ws, payload) { try { ws.send(JSON.stringify(payload)); } catch { /* disconnected */ } }
    broadcast(payload) { const text = JSON.stringify(payload); for (const ws of this.peers()) { try { ws.send(text); } catch {} } }
    remainingUpdates() {
        return Math.max(0, settings(this.env).maxChangeBatchesPerRoom - this.record.updates);
    }
    snapshot(ws, extra = {}) {
        this.send(ws, {
            type: 'snapshot', revision: this.record.revision, doc: this.record.doc,
            you: ws.deserializeAttachment().id, roster: this.roster(),
            maxParticipants: settings(this.env).maxParticipants, expiresAt: this.record.expiresAt,
            remainingUpdates: this.remainingUpdates(), ...extra
        });
    }
    violation(ws, code) {
        const attachment = ws.deserializeAttachment();
        attachment.invalids = (attachment.invalids || 0) + 1;
        ws.serializeAttachment(attachment);
        this.send(ws, { type: 'error', code });
        if (attachment.invalids >= settings(this.env).maxInvalidMessages) {
            ws.close(1008, 'invalid-messages');
        }
    }
    async fetch(request) {
        if (!settings(this.env).enabled) return new Response('Disabled', { status: 503 });
        if (!this.alive()) return new Response('Expired', { status: 404 });
        if (this.peers().length >= settings(this.env).maxParticipants) return new Response('Room full', { status: 409 });
        const pair = new WebSocketPair();
        const ws = pair[1];
        this.ctx.acceptWebSocket(ws);
        ws.serializeAttachment({
            id: crypto.randomUUID(), name: '', origin: null, target: null,
            tokens: 8, time: Date.now(), strikes: 0, invalids: 0,
            lastId: null, lastRevision: null
        });
        this.snapshot(ws);
        this.broadcast({ type: 'peers', roster: this.roster() });
        return new Response(null, { status: 101, webSocket: pair[0] });
    }
    allow(ws) {
        const a = ws.deserializeAttachment();
        const now = Date.now();
        // Every application message consumes a token. Attachments survive hibernation.
        const elapsed = now - a.time;
        if (elapsed >= 10000) a.strikes = 0;
        a.tokens = Math.min(8, a.tokens + elapsed / 1000);
        a.time = now;
        const ok = a.tokens >= 1;
        if (ok) a.tokens--;
        else a.strikes++;
        ws.serializeAttachment(a);
        if (a.strikes >= 3) ws.close(1008, 'rate-limited');
        return ok;
    }
    async webSocketMessage(ws, message) {
        if (!settings(this.env).enabled) { ws.close(1008, 'disabled'); return; }
        if (!this.alive()) { ws.close(1008, 'expired'); return; }
        if (!this.allow(ws)) { this.send(ws, { type: 'error', code: 'rate-limited' }); return; }
        if (typeof message !== 'string' || message.length > LIMITS.messageBytes || byteLength(message) > LIMITS.messageBytes) {
            ws.close(1009, 'message-too-large'); return;
        }
        let raw;
        try { raw = JSON.parse(message); } catch { this.violation(ws, 'bad-json'); return; }
        if (raw?.type === 'presence') {
            const a = ws.deserializeAttachment();
            let presence;
            try { presence = normalizePresence(raw, documentBounds(this.record.doc)); }
            catch { this.violation(ws, 'bad-presence'); return; }
            const next = { name: normalizePlayerName(raw.name), ...presence };
            if (a.name === next.name && same(a.origin, next.origin) && same(a.target, next.target)) return;
            Object.assign(a, next);
            a.invalids = 0;
            ws.serializeAttachment(a);
            this.broadcast({ type: 'peers', roster: this.roster() });
            return;
        }
        if (raw?.type === 'close') {
            if (typeof raw.ownerKey === 'string' && raw.ownerKey.length <= 64 && await hash(raw.ownerKey) === this.record.ownerHash) await this.destroy('closed');
            else this.send(ws, { type: 'error', code: 'not-owner' });
            return;
        }
        if (raw?.type !== 'changes' || typeof raw.id !== 'string' || !/^[\w-]{1,64}$/.test(raw.id)) {
            this.violation(ws, 'bad-message'); return;
        }
        // Serialize validation, quota allocation and commit. No await can interleave another edit.
        await this.ctx.blockConcurrencyWhile(async () => {
            const attachment = ws.deserializeAttachment();
            if (attachment.lastId === raw.id) {
                this.send(ws, {
                    type: 'ack', id: raw.id, revision: attachment.lastRevision,
                    remainingUpdates: this.remainingUpdates()
                });
                return;
            }
            try {
                if (!this.alive()) throw new Error('expired');
                const ops = normalizeOperations(raw.ops, this.record.doc.mapId);
                const next = validateCatalogDocument(
                    applyOperations(this.record.doc, ops)
                );
                if (same(next, this.record.doc)) throw new Error('no-change');
                const config = settings(this.env);
                if (this.record.updates >= config.maxChangeBatchesPerRoom) throw new Error('room-budget');
                if (this.record.creditDay !== today() || !this.record.credits) {
                    const credit = await this.env.BUDGET.getByName('daily-budget').grant('changes');
                    if (!credit.amount) throw new Error('daily-budget');
                    this.record.credits = credit.amount;
                    this.record.creditDay = credit.day;
                }
                const updated = { ...this.record, doc: next, revision: this.record.revision + 1, updates: this.record.updates + 1, credits: this.record.credits - 1 };
                // Output gate: recipients only see a revision after its durable commit succeeds.
                await this.ctx.storage.put('room', updated);
                this.record = updated;
                attachment.lastId = raw.id;
                attachment.lastRevision = updated.revision;
                attachment.invalids = 0;
                ws.serializeAttachment(attachment);
                this.broadcast({ type: 'changes', id: raw.id, from: attachment.id, revision: updated.revision, ops, remainingUpdates: config.maxChangeBatchesPerRoom - updated.updates });
            } catch (error) {
                const code = publicChangeError(
                    typeof error?.message === 'string' ? error.message : ''
                );
                this.send(ws, {
                    type: 'rejected', id: raw.id, revision: this.record.revision,
                    code, remainingUpdates: this.remainingUpdates()
                });
                if (/^(bad-|too-|wrong-|duplicate-|unsupported-|outside-|room-too-large)/.test(code)) {
                    const latest = ws.deserializeAttachment();
                    latest.invalids = (latest.invalids || 0) + 1;
                    ws.serializeAttachment(latest);
                    if (latest.invalids >= settings(this.env).maxInvalidMessages) {
                        ws.close(1008, 'invalid-messages');
                    }
                }
            }
        });
    }
    async destroy(reason) {
        for (const ws of this.peers()) { this.send(ws, { type: 'closed', reason }); ws.close(1000, reason); }
        this.record = null;
        await this.ctx.storage.deleteAlarm();
        await this.ctx.storage.deleteAll();
    }
    async alarm() { await this.destroy('expired'); }
    webSocketClose(ws, code, reason) {
        try { ws.close(code === 1005 || code === 1006 ? 1000 : code, reason); } catch {}
        this.broadcast({ type: 'peers', roster: this.roster() });
    }
    webSocketError(ws) { try { ws.close(1011, 'connection-error'); } catch {} this.broadcast({ type: 'peers', roster: this.roster() }); }
}
