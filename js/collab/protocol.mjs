/* Shared validation and conflict handling. No DOM, storage or network side effects. */
export const LIMITS = Object.freeze({
    documentBytes: 96 * 1024,
    messageBytes: 256 * 1024,
    operations: 512,
    points: 2048,
    drawings: 64,
    markers: 128,
    zones: 32,
    polygons: 32,
    savedTargets: 64,
    participants: 32
});
export const COLLECTIONS = ['drawings', 'markers', 'zones', 'polygons', 'savedTargets'];
const SLUG = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/;
const encoder = new TextEncoder();
export const byteLength = value => encoder.encode(typeof value === 'string' ? value : JSON.stringify(value)).length;
export const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
export function fail(code) { throw new Error(code); }
const object = value => value && typeof value === 'object' && !Array.isArray(value);
export function slug(value) {
    if (typeof value !== 'string' || !SLUG.test(value)) fail('bad-id');
    return value;
}
function number(value, min = -1e6, max = 1e6) {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) fail('bad-coordinate');
    return value;
}
function point(value) {
    if (!object(value)) fail('bad-point');
    return { x: number(value.x), y: number(value.y) };
}
function coordinateBounds(value) {
    if (!object(value)) fail('bad-bounds');
    const minX = Number.isFinite(value.minX) ? value.minX : 0;
    const minY = Number.isFinite(value.minY) ? value.minY : 0;
    const maxX = Number.isFinite(value.maxX) ? value.maxX : value.w;
    const maxY = Number.isFinite(value.maxY) ? value.maxY : value.h;
    if (![minX, minY, maxX, maxY].every(Number.isFinite) || maxX < minX || maxY < minY) {
        fail('bad-bounds');
    }
    return { minX, minY, maxX, maxY };
}
function plainText(value, maximum) {
    if (typeof value !== 'string') return '';
    return [...value.normalize('NFKC')
        .replace(/[\p{Cc}\p{Cf}\p{Cs}]/gu, '')
        .replace(/\s+/g, ' ')
        .trim()]
        .slice(0, maximum)
        .join('');
}
export function normalizePlayerName(value) {
    return plainText(value, 24);
}
function presencePoint(value, bounds) {
    if (!bounds) return point(value);
    if (!object(value)) fail('bad-point');
    const range = coordinateBounds(bounds);
    return {
        x: number(value.x, range.minX, range.maxX),
        y: number(value.y, range.minY, range.maxY)
    };
}
export function normalizePresence(raw, bounds = null) {
    if (!object(raw)) fail('bad-presence');
    return {
        origin: presencePoint(raw.origin, bounds),
        target: presencePoint(raw.target, bounds)
    };
}
export function normalizeRoster(raw, bounds = null) {
    if (!Array.isArray(raw) || raw.length > LIMITS.participants) fail('too-many-participants');
    const roster = raw.map(value => {
        if (!object(value)) fail('bad-participant');
        return {
            id: slug(value.id),
            name: normalizePlayerName(value.name),
            origin: value.origin == null ? null : presencePoint(value.origin, bounds),
            target: value.target == null ? null : presencePoint(value.target, bounds)
        };
    });
    if (new Set(roster.map(peer => peer.id)).size !== roster.length) fail('duplicate-participant');
    return roster;
}
function color(value) {
    if (typeof value !== 'string' || !/^#[\da-f]{6}$/i.test(value)) fail('bad-color');
    return value.toLowerCase();
}
const MARKER_COLORS = new Set([
    '#5fa8d3',
    '#d86666',
    '#82c596'
]);
function markerColor(value) {
    if (value == null) return null;
    const normalized = color(value);
    if (!MARKER_COLORS.has(normalized)) fail('bad-marker-color');
    return normalized;
}
function points(value, minimum) {
    if (!Array.isArray(value) || value.length < minimum || value.length > LIMITS.points) fail('too-many-points');
    return value.map(point);
}
export function normalizeItem(collection, value, mapId) {
    if (!object(value)) fail('bad-item');
    const id = slug(value.id);
    if (collection !== 'savedTargets' && value.mapId !== mapId) fail('wrong-map');
    switch (collection) {
        case 'drawings':
        case 'polygons':
            return { id, mapId, color: color(value.color), points: points(value.points, collection === 'drawings' ? 2 : 3) };
        case 'zones':
            return { id, mapId, color: color(value.color), ...point(value), radius: number(value.radius, 0.000001) };
        case 'markers': {
            const tint = markerColor(value.color);
            return {
                id,
                mapId,
                icon: slug(value.icon),
                ...point(value),
                ...(tint ? { color: tint } : {})
            };
        }
        case 'savedTargets': {
            if (typeof value.name !== 'string' || [...value.name].length > 120) fail('bad-name');
            const name = plainText(value.name, 120);
            if (!name) fail('bad-name');
            const origin = value.saveArtillery && value.origin ? point(value.origin) : null;
            return { id, name, ...point(value), saveArtillery: Boolean(origin), origin };
        }
        default: fail('bad-collection');
    }
}
export function normalizeDocument(raw) {
    if (!object(raw)) fail('bad-document');
    const mapId = slug(raw.mapId);
    const doc = {
        mapId, w: number(raw.w, 1, 1000), h: number(raw.h, 1, 1000)
    };
    for (const key of COLLECTIONS) {
        if (!Array.isArray(raw[key]) || raw[key].length > LIMITS[key]) fail('too-many-items');
        const items = raw[key].map(value => normalizeItem(key, value, mapId));
        if (new Set(items.map(item => item.id)).size !== items.length) fail('duplicate-id');
        doc[key] = items;
    }
    if (byteLength(doc) > LIMITS.documentBytes) fail('room-too-large');
    return doc;
}
export const operationKey = op => `${op.key}:${op.id || ''}`;
export function diffDocuments(before, after) {
    const ops = [];
    for (const key of COLLECTIONS) {
        const a = new Map(before[key].map(item => [item.id, item]));
        const b = new Map(after[key].map(item => [item.id, item]));
        for (const id of new Set([...a.keys(), ...b.keys()])) {
            const old = a.get(id) ?? null;
            const value = b.get(id) ?? null;
            if (!same(old, value)) ops.push({ key, id, before: old, value });
        }
    }
    return structuredClone(ops);
}
export function normalizeOperations(raw, mapId) {
    if (!Array.isArray(raw) || !raw.length || raw.length > LIMITS.operations) fail('too-many-operations');
    const seen = new Set();
    return raw.map(op => {
        if (!object(op)) fail('bad-operation');
        if (!COLLECTIONS.includes(op.key)) fail('bad-collection');
        const id = slug(op.id);
        const item = value => {
            if (value === null) return null;
            const normalized = normalizeItem(op.key, value, mapId);
            if (normalized.id !== id) fail('bad-id');
            return normalized;
        };
        const result = { key: op.key, id, before: item(op.before), value: item(op.value) };
        const identity = operationKey(result);
        if (seen.has(identity)) fail('duplicate-operation');
        seen.add(identity);
        return result;
    });
}
/* Compare-and-set is atomic: stale edits/undo never replace a teammate's newer edit. */
export function applyOperations(doc, ops, check = true) {
    const next = structuredClone(doc);
    for (const op of ops) {
        const index = next[op.key].findIndex(item => item.id === op.id);
        const current = index < 0 ? null : next[op.key][index];
        if (check && !same(current, op.before)) fail('conflict');
        if (op.value === null) {
            if (index >= 0) next[op.key].splice(index, 1);
        } else if (index < 0) {
            next[op.key].push(structuredClone(op.value));
        } else {
            next[op.key][index] = structuredClone(op.value);
        }
    }
    return check ? normalizeDocument(next) : next;
}
export const invertOperations = ops => ops.map(op => ({ ...op, before: op.value, value: op.before }));
export function coalesceOperations(existing, changes) {
    const ops = new Map(existing.map(op => [operationKey(op), structuredClone(op)]));
    for (const op of changes) {
        const key = operationKey(op);
        const old = ops.get(key);
        const merged = old ? { ...op, before: old.before } : op;
        if (same(merged.before, merged.value)) ops.delete(key);
        else ops.set(key, structuredClone(merged));
    }
    return [...ops.values()];
}
