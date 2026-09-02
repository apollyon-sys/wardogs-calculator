const DEAD_GROUND_CLEARANCE_METRES = 0;
const DEAD_GROUND_CACHE_LIMIT = 256;

const DEAD_GROUND_CACHE = new Map();

function deadGroundMuzzleVelocity(weaponId) {
    const arcs = PROJECTILE_MODEL?.weapons?.[weaponId];

    if (!arcs) {
        return null;
    }

    let best = null;

    for (const arc of Object.values(arcs)) {
        const v = Number(arc?.muzzleVelocity);

        if (!Number.isFinite(v) || v <= 0) {
            continue;
        }

        if (best === null) {
            best = arc;

            continue;
        }

        const flatter =
            arc.branch === 'low' && best.branch !== 'low'
                ? true
                : arc.branch === best.branch &&
                    v > Number(best.muzzleVelocity);

        if (flatter) {
            best = arc;
        }
    }

    return best === null ? null : Number(best.muzzleVelocity);
}

function deadGroundLaunchTan(muzzleVelocity, rangeMeters, deltaZMeters) {
    if (!(rangeMeters > 0)) {
        return null;
    }

    const vSquared = muzzleVelocity * muzzleVelocity;

    const discriminant =
        vSquared * vSquared -
        RANGE_RING_GRAVITY *
        (
            RANGE_RING_GRAVITY * rangeMeters * rangeMeters +
            2 * deltaZMeters * vSquared
        );

    if (discriminant < 0) {
        return null;
    }

    return (
        (vSquared - Math.sqrt(discriminant)) /
        (RANGE_RING_GRAVITY * rangeMeters)
    );
}

function deadGroundGrazingTan(muzzleVelocity, xMeters, zMeters) {
    const tanTheta = deadGroundLaunchTan(
        muzzleVelocity,
        xMeters,
        zMeters - DEAD_GROUND_CLEARANCE_METRES
    );

    return tanTheta === null ? Infinity : tanTheta;
}

function deadGroundBearingIntervals(
    muzzleVelocity,
    ranges,
    deltas,
    count
) {
    const intervals = [];

    if (count < 2) {
        return intervals;
    }

    const edgeBefore = index =>
        index === 0
            ? ranges[0]
            : (ranges[index - 1] + ranges[index]) / 2;

    const edgeAfter = index =>
        index === count - 1
            ? ranges[index]
            : (ranges[index] + ranges[index + 1]) / 2;

    let required = -Infinity;
    let runStart = -1;

    for (let i = 0; i < count; i += 1) {
        const tanTheta = deadGroundLaunchTan(
            muzzleVelocity,
            ranges[i],
            deltas[i]
        );

        const dead = tanTheta !== null && tanTheta < required;

        if (dead && runStart < 0) {
            runStart = i;
        }

        if (!dead && runStart >= 0) {
            intervals.push(edgeBefore(runStart), edgeAfter(i - 1));
            runStart = -1;
        }

        const graze = deadGroundGrazingTan(
            muzzleVelocity,
            ranges[i],
            deltas[i]
        );

        if (graze > required) {
            required = graze;
        }
    }

    if (runStart >= 0) {
        intervals.push(edgeBefore(runStart), edgeAfter(count - 1));
    }

    return intervals;
}

function rememberDeadGround(key, solved) {
    if (DEAD_GROUND_CACHE.size >= DEAD_GROUND_CACHE_LIMIT) {
        DEAD_GROUND_CACHE.delete(
            DEAD_GROUND_CACHE.keys().next().value
        );
    }

    DEAD_GROUND_CACHE.set(key, solved);
}

function terrainDeadGround(gun, mapId) {
    const ring = terrainRangeRing(gun, mapId);

    if (!ring) {
        return null;
    }

    const field = cachedHeightfield(mapId);
    const muzzleVelocity = deadGroundMuzzleVelocity(gun.weapon);

    if (!field || !muzzleVelocity) {
        return null;
    }

    const key = rangeRingMemoKey(gun, mapId);
    const memo = DEAD_GROUND_CACHE.get(key);

    if (memo) {
        return memo;
    }

    const zGun = heightfieldSample(
        field,
        gun.position.x,
        gun.position.y
    );

    if (zGun === null) {
        return null;
    }

    const bearings = ring.radii.length;
    const wedges = new Array(bearings);

    const capacity = Math.max(
        2,
        Math.ceil(
            Math.max(...ring.radii) / RANGE_RING_MARCH_METRES
        ) + 1
    );

    const ranges = new Float64Array(capacity);
    const deltas = new Float64Array(capacity);

    let any = false;

    for (let b = 0; b < bearings; b += 1) {
        const angle = b * 2 * Math.PI / bearings;

        const stepX =
            Math.cos(angle) / METRES_PER_GAME_UNIT_RING;

        const stepY =
            Math.sin(angle) / METRES_PER_GAME_UNIT_RING;

        const limit = ring.radii[b];

        let count = 0;

        for (
            let r = RANGE_RING_MARCH_METRES;
            r <= limit && count < capacity;
            r += RANGE_RING_MARCH_METRES
        ) {
            const z = rangeRingSample(
                field,
                gun.position.x + stepX * r,
                gun.position.y + stepY * r
            );

            if (z === null) {
                break;
            }

            ranges[count] = r;
            deltas[count] = z - zGun;
            count += 1;
        }

        const intervals = deadGroundBearingIntervals(
            muzzleVelocity,
            ranges,
            deltas,
            count
        );

        if (intervals.length) {
            any = true;
        }

        wedges[b] = intervals;
    }

    const solved = {
        bearings: wedges,
        any
    };

    rememberDeadGround(key, solved);

    return solved;
}

function traceDeadGroundWedge(at, scale, angle, half, startMetres, endMetres) {
    const inner = metersToWorldDistance(startMetres) * scale;
    const outer = metersToWorldDistance(endMetres) * scale;

    const a0 = angle - half;
    const a1 = angle + half;

    ctx.moveTo(
        at.x + Math.cos(a0) * inner,
        at.y - Math.sin(a0) * inner
    );

    ctx.lineTo(
        at.x + Math.cos(a0) * outer,
        at.y - Math.sin(a0) * outer
    );

    ctx.lineTo(
        at.x + Math.cos(a1) * outer,
        at.y - Math.sin(a1) * outer
    );

    ctx.lineTo(
        at.x + Math.cos(a1) * inner,
        at.y - Math.sin(a1) * inner
    );

    ctx.closePath();
}

function traceDeadGroundEdge(at, scale, angle, half, metres) {
    const r = metersToWorldDistance(metres) * scale;

    const a0 = angle - half;
    const a1 = angle + half;

    ctx.moveTo(
        at.x + Math.cos(a0) * r,
        at.y - Math.sin(a0) * r
    );

    ctx.lineTo(
        at.x + Math.cos(a1) * r,
        at.y - Math.sin(a1) * r
    );
}

function drawDeadGround(at, scale) {
    const solved = terrainDeadGround(
        {
            weapon: S.weapon,
            position: S.origin
        },
        S.map
    );

    if (!solved || !solved.any) {
        return;
    }

    const bearings = solved.bearings.length;
    const half = Math.PI / bearings;

    ctx.beginPath();

    for (let b = 0; b < bearings; b += 1) {
        const intervals = solved.bearings[b];
        const angle = b * 2 * Math.PI / bearings;

        for (let i = 0; i < intervals.length; i += 2) {
            traceDeadGroundWedge(
                at,
                scale,
                angle,
                half,
                intervals[i],
                intervals[i + 1]
            );
        }
    }

    ctx.fillStyle = 'rgba(18,22,26,.42)';
    ctx.fill();

    ctx.beginPath();

    for (let b = 0; b < bearings; b += 1) {
        const intervals = solved.bearings[b];
        const angle = b * 2 * Math.PI / bearings;

        for (let i = 0; i < intervals.length; i += 2) {
            traceDeadGroundEdge(at, scale, angle, half, intervals[i]);
            traceDeadGroundEdge(at, scale, angle, half, intervals[i + 1]);
        }
    }

    ctx.strokeStyle = 'rgba(196,92,92,.5)';
    ctx.lineWidth = 1;
    ctx.stroke();
}
