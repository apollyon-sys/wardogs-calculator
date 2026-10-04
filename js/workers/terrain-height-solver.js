/* SPH-2 / 155 HE numerical terrain estimates.
 * Effective LOW/HIGH families frozen on 2026-08-28; not native game constants.
 * Table-relative anchoring preserves the public zero-height reference.
 * This solver makes no network requests; it has no fixed DeltaZ window or chassis model.
 */
(() => {
    'use strict';
    const FAMILIES = {
        high: [
            {
                id: 'full', speed: 9389.43881652221, gravity: 147.2063947858103,
                drag: 0.0008516971618643472, offset: -960.0413878819479
            },
            {
                id: 'cv0', speed: 9849.20362952773, gravity: 150.86543234319186,
                drag: 0.0008557959979161821, offset: -985.1206130285715
            },
            {
                id: 'cv1', speed: 9538.83646613938, gravity: 148.641633460151,
                drag: 0.0008527226093807684, offset: -968.4137716340553
            },
            {
                id: 'cv2', speed: 9382.501472445045, gravity: 148.5944458354111,
                drag: 0.0008496679095904272, offset: -960.0394378351399
            },
            {
                id: 'cv3', speed: 9357.938150456344, gravity: 150.47135225076096,
                drag: 0.0008467547170072617, offset: -958.5760116042985
            },
            {
                id: 'cv4', speed: 9434.587865435868, gravity: 147.3517620197302,
                drag: 0.0008527036302749736, offset: -959.7586038157854
            }
        ],
        low: [
            {
                id: 'full', speed: 300, gravity: 8.85397505384648,
                drag: 0.0007351626163587786, offset: 95.03019643400405
            },
            {
                id: 'cv0', speed: 300, gravity: 8.855984443192355,
                drag: 0.0007350661856769885, offset: 95.09033125524101
            },
            {
                id: 'cv1', speed: 300, gravity: 8.85460617869732,
                drag: 0.0007351378032591812, offset: 95.04909745846172
            },
            {
                id: 'cv2', speed: 300, gravity: 8.85634575638418,
                drag: 0.000735050816746845, offset: 95.07216670372487
            },
            {
                id: 'cv3', speed: 300, gravity: 8.852773782663528,
                drag: 0.0007351990161210038, offset: 94.99348250194096
            },
            {
                id: 'cv4', speed: 300, gravity: 8.85228338555638,
                drag: 0.0007352570328084649, offset: 94.97988436225965
            },
            {
                id: 'rho1p2_fit_g_h', speed: 300, gravity: 9.774639751933924,
                drag: 0.0006836064277465947, offset: 107.38706982639987
            },
            {
                id: 'gstd_fit_rho_h', speed: 300, gravity: 9.80665,
                drag: 0.0006827669131158775, offset: 108.27014958304952
            },
            {
                id: 'rho1p2_gstd_fit_h', speed: 300, gravity: 9.80665,
                drag: 0.0006836064277465947, offset: 108.7138149309282
            }
        ]
    };

    const GC_X = [0,30,61,91,122,150,183,213,244,274,300,335,366,396,427,450,488,518,549,579,600];
    const GC_Y = [.71,.69,.66,.64,.65,.66,.68,.72,.80,.92,1.10,1.25,1.33,1.39,1.44,1.48,1.50,1.54,1.57,1.58,1.60];
    const MODEL_ID = 'sph2-exact-gc-differential-estimate-v1';
    const referenceCache = new Map();

    function dragCoefficient(speed) {
        if (speed <= GC_X[0]) return GC_Y[0];
        if (speed >= GC_X.at(-1)) return GC_Y.at(-1);
        let lo = 0, hi = GC_X.length - 1;
        while (lo + 1 < hi) {
            const mid = (lo + hi) >> 1;
            if (GC_X[mid] <= speed) lo = mid; else hi = mid;
        }
        const fraction = (speed - GC_X[lo]) / (GC_X[hi] - GC_X[lo]);
        return GC_Y[lo] + (GC_Y[hi] - GC_Y[lo]) * fraction;
    }

    function factor(vx, vz, model) {
        const speed = Math.hypot(vx, vz);
        return model.drag * dragCoefficient(speed) * speed;
    }

    function heightAtDistance(angle, distance, model, dt = .02) {
        if (!Number.isFinite(angle) || angle <= 0 || angle >= Math.PI / 2 ||
            !Number.isFinite(distance) || distance <= 0 ||
            !Number.isFinite(dt) || dt <= 0 || dt > .02) return null;
        let x = 0, z = 0, vx = model.speed * Math.cos(angle), vz = model.speed * Math.sin(angle);
        const g = model.gravity;
        for (let i = 0; i < Math.ceil(120 / dt); i++) {
            const q1 = factor(vx, vz, model);
            const a1x = -q1 * vx, a1z = -g - q1 * vz;
            const v2x = vx + a1x * dt / 2, v2z = vz + a1z * dt / 2;
            const q2 = factor(v2x, v2z, model);
            const a2x = -q2 * v2x, a2z = -g - q2 * v2z;
            const v3x = vx + a2x * dt / 2, v3z = vz + a2z * dt / 2;
            const q3 = factor(v3x, v3z, model);
            const a3x = -q3 * v3x, a3z = -g - q3 * v3z;
            const v4x = vx + a3x * dt, v4z = vz + a3z * dt;
            const q4 = factor(v4x, v4z, model);
            const nextX = x + dt * (vx + 2 * v2x + 2 * v3x + v4x) / 6;
            const nextZ = z + dt * (vz + 2 * v2z + 2 * v3z + v4z) / 6;
            if (!Number.isFinite(nextX) || !Number.isFinite(nextZ) ||
                !Number.isFinite(v4x) || !Number.isFinite(v4z)) return null;
            if (nextX >= distance) {
                return z + (nextZ - z) * (distance - x) / (nextX - x) + model.offset;
            }
            vx += dt * (a1x + 2 * a2x + 2 * a3x - q4 * v4x) / 6;
            vz += dt * (a1z + 2 * a2z + 2 * a3z - g - q4 * v4z) / 6;
            x = nextX; z = nextZ;
            if (vx <= 1e-7) return null;
        }
        return null;
    }

    function bisect(fn, left, right, tolerance) {
        let fl = fn(left), fr = fn(right);
        if (fl === null || fr === null || fl * fr > 0) return null;
        if (Math.abs(fl) < 1e-8) return left;
        if (Math.abs(fr) < 1e-8) return right;
        for (let i = 0; i < 40 && right - left > tolerance; i++) {
            const mid = (left + right) / 2, fm = fn(mid);
            if (fm === null) return null;
            if (Math.abs(fm) < 1e-8) return mid;
            if (fl * fm <= 0) { right = mid; fr = fm; } else { left = mid; fl = fm; }
        }
        return (left + right) / 2;
    }

    function onArc(arc, fn, root, step) {
        const center = fn(root), left = fn(root - step), right = fn(root + step);
        if (center === null) return false;
        const slope = left !== null && right !== null ? right - left :
            left !== null ? center - left : right !== null ? right - center : null;
        // Never substitute a root on the opposite side of the height/angle turning point.
        return Number.isFinite(slope) && (arc === 'low' ? slope > 0 : slope < 0);
    }

    function referenceAngle(arc, distance, flat, model) {
        const center = flat / 1000;
        const minimum = arc === 'low' ? .0001 : .3;
        const maximum = arc === 'low' ? .61 : 1.55;
        const fn = angle => heightAtDistance(angle, distance, model);
        const f0 = fn(center);
        if (f0 !== null && Math.abs(f0) < 1e-8 && onArc(arc, fn, center, 1e-5)) return center;
        for (const span of [.002,.005,.01,.02,.04,.08,.12,.2,.3]) {
            const left = Math.max(minimum, center - span), right = Math.min(maximum, center + span);
            const candidates = [];
            if (f0 !== null) {
                for (const edge of [left, right]) {
                    const value = fn(edge);
                    if (value !== null && value * f0 <= 0) {
                        const root = bisect(fn, Math.min(edge, center), Math.max(edge, center), 1e-7);
                        if (root !== null && onArc(arc, fn, root, 1e-5)) candidates.push(root);
                    }
                }
            }
            if (candidates.length) return candidates.sort((a,b) => Math.abs(a-center) - Math.abs(b-center))[0];
        }
        // A flat root can approach the turning point near maximum range.
        let previous = null, best = null;
        for (let i = 0; i <= 100; i++) {
            const angle = minimum + (maximum - minimum) * i / 100, value = fn(angle);
            if (value !== null && previous && previous.value * value <= 0) {
                const root = bisect(fn, previous.angle, angle, 1e-7);
                if (root !== null && onArc(arc, fn, root, 1e-5) &&
                    (best === null || Math.abs(root-center) < Math.abs(best-center))) best = root;
            }
            previous = value === null ? null : { angle, value };
        }
        return best;
    }

    function referenceAngles(arc, distance, flat) {
        const key = arc + '|' + distance + '|' + flat;
        if (referenceCache.has(key)) return referenceCache.get(key);
        const references = FAMILIES[arc].map(model => referenceAngle(arc, distance, flat, model));
        if (referenceCache.size >= 32) referenceCache.delete(referenceCache.keys().next().value);
        referenceCache.set(key, references);
        return references;
    }

    function commandForHeight(arc, distance, flat, deltaZ, model, reference) {
        if (reference === null) return { command: null, reason: 'flat-reference-unavailable' };
        if (deltaZ === 0) return { command: flat, reason: null };
        const minimum = arc === 'low' ? 20 : 610, maximum = arc === 'low' ? 600 : 1390;
        const fn = command => {
            const height = heightAtDistance(reference + (command - flat) / 1000, distance, model);
            return height === null ? null : height - deltaZ;
        };
        const samples = new Set([minimum, maximum, flat]);
        // A full arc scan finds the closest supported root, including non-monotone tail cases.
        for (let command = minimum; command < maximum; command += 10) samples.add(command);
        let previous = null, best = null;
        for (const command of [...samples].sort((a,b) => a-b)) {
            const value = fn(command);
            if (value !== null && Math.abs(value) < 1e-8 && onArc(arc, fn, command, .05)) {
                return { command, reason: null };
            }
            if (value !== null && previous && previous.value * value <= 0) {
                const root = bisect(fn, previous.command, command, .025);
                if (root !== null && onArc(arc, fn, root, .05) &&
                    (best === null || Math.abs(root-flat) < Math.abs(best-flat))) best = root;
            }
            previous = value === null ? null : { command, value };
        }
        return { command: best, reason: best === null ? 'no-model-trajectory-in-command-range' : null };
    }

    function solve(input) {
        const { arc, distanceMeters: distance, flatMrad: flat, deltaZMeters: deltaZ } = input || {};
        const base = { model: MODEL_ID, certified: false, estimated: true };
        if (!['low','high'].includes(arc) || ![distance,flat,deltaZ].every(Number.isFinite) ||
            distance < 780 || distance > 2629 ||
            flat < (arc === 'low' ? 20 : 610) || flat > (arc === 'low' ? 600 : 1390)) {
            return { ...base, status: 'MODEL_UNAVAILABLE', reason: 'invalid-model-input', commandMrad: null };
        }
        const family = FAMILIES[arc], references = referenceAngles(arc, distance, flat);
        const members = family.map((model, i) => ({
            id: model.id, ...commandForHeight(arc, distance, flat, deltaZ, model, references[i])
        }));
        const commands = members.filter(m => Number.isFinite(m.command)).map(m => m.command).sort((a,b) => a-b);
        const metadata = { ...base, modelCount: family.length, reachableModels: commands.length, members };
        if (commands.length !== family.length) {
            return { ...metadata,
                status: commands.length ? 'MODEL_DISAGREEMENT' :
                    members.some(m => m.reason === 'flat-reference-unavailable') ? 'MODEL_UNAVAILABLE' : 'TERRAIN_ADJUSTED_UNREACHABLE',
                reason: commands.length ? 'model-reachability-disagreement' : 'no-model-trajectory',
                commandMrad: null
            };
        }
        const middle = Math.floor(commands.length / 2);
        const command = commands.length % 2 ? commands[middle] : (commands[middle-1] + commands[middle]) / 2;
        return { ...metadata, status: 'MODEL_ESTIMATE', reason: 'extended-height-estimate',
            commandMrad: command, minCommandMrad: commands[0], maxCommandMrad: commands.at(-1),
            uncertaintyMil: commands.at(-1) - commands[0], numericalToleranceMil: .025 };
    }

    globalThis.WardogsTerrainHeightSolver = Object.freeze({ solve, heightAtDistance, families: FAMILIES });
    if (typeof globalThis.postMessage === 'function' && typeof globalThis.document === 'undefined') {
        globalThis.onmessage = event => {
            const { id, input } = event.data || {};
            try { globalThis.postMessage({ id, result: solve(input) }); }
            catch { globalThis.postMessage({ id, result: { status: 'MODEL_UNAVAILABLE', reason: 'model-computation-failed', commandMrad: null } }); }
        };
    }
})();
