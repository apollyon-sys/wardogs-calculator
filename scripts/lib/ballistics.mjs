/*
 * A vacuum trajectory model for the shipped firing tables.
 *
 * The elevation angle is affine in mil, theta = a + b * mil, and range
 * follows R = v^2 sin(2 theta) / g. Both are approximations: fitting the
 * SPG's two arcs jointly is four times worse than fitting them apart, which
 * is the vacuum model absorbing real drag differently on each branch. See
 * the design doc section 4.
 *
 * Nothing here is used to produce a MIL directly. Callers take the
 * DIFFERENCE between two points on the same model curve, so most of that
 * absolute error cancels and flat ground is corrected by exactly zero.
 */

export const GRAVITY = 9.81;

const DEG = 180 / Math.PI;

export function rangeForTan(muzzleVelocity, tanTheta) {
    const sin2Theta = 2 * tanTheta / (1 + tanTheta * tanTheta);

    return muzzleVelocity * muzzleVelocity * sin2Theta / GRAVITY;
}

/*
 * Launch angle whose trajectory passes through (rangeMeters, deltaZMeters).
 *
 * With t = tan(theta) and k = g R^2 / 2 v^2 the trajectory equation becomes
 * k t^2 - R t + (dZ + k) = 0. The high branch takes the larger root.
 */
export function solveTan(
    muzzleVelocity,
    rangeMeters,
    deltaZMeters,
    branch
) {
    if (
        !Number.isFinite(muzzleVelocity) ||
        !Number.isFinite(rangeMeters) ||
        !Number.isFinite(deltaZMeters) ||
        rangeMeters <= 0
    ) {
        return null;
    }

    const k =
        GRAVITY * rangeMeters * rangeMeters /
        (2 * muzzleVelocity * muzzleVelocity);

    const discriminant =
        rangeMeters * rangeMeters -
        4 * k * (deltaZMeters + k);

    if (discriminant < 0) {
        return null;
    }

    const root = Math.sqrt(discriminant);

    return branch === 'high'
        ? (rangeMeters + root) / (2 * k)
        : (rangeMeters - root) / (2 * k);
}

/*
 * Furthest horizontal distance reachable at any launch angle, for a target
 * deltaZMeters above the muzzle.
 *
 * This is solveTan's discriminant solved for R. Setting
 * R^2 - 4k(dZ + k) = 0 with k = g R^2 / 2 v^2 gives
 * R = (v/g) * sqrt(v^2 - 2 g dZ), so the two agree by construction: inside
 * this distance solveTan finds an angle, outside it returns null.
 *
 * Null means no angle reaches that height at all — the target sits above the
 * ballistic ceiling v^2 / 2g.
 */
export function maxRangeMeters(muzzleVelocity, deltaZMeters) {
    if (
        !Number.isFinite(muzzleVelocity) ||
        muzzleVelocity <= 0 ||
        !Number.isFinite(deltaZMeters)
    ) {
        return null;
    }

    const inner =
        muzzleVelocity * muzzleVelocity -
        2 * GRAVITY * deltaZMeters;

    if (inner <= 0) {
        return null;
    }

    return muzzleVelocity * Math.sqrt(inner) / GRAVITY;
}

export function milFromTan(arcModel, tanTheta) {
    return (
        Math.atan(tanTheta) * DEG - arcModel.angleOffsetDeg
    ) / arcModel.anglePerMilDeg;
}

/*
 * Mil to ADD to the flat-table value. Zero on flat ground by construction.
 */
export function milCorrection(arcModel, rangeMeters, deltaZMeters) {
    const aimed = solveTan(
        arcModel.muzzleVelocity,
        rangeMeters,
        deltaZMeters,
        arcModel.branch
    );

    const flat = solveTan(
        arcModel.muzzleVelocity,
        rangeMeters,
        0,
        arcModel.branch
    );

    if (aimed === null || flat === null) {
        return null;
    }

    return milFromTan(arcModel, aimed) - milFromTan(arcModel, flat);
}

/*
 * How far short (positive) or long (negative) the UNCORRECTED shot lands:
 * where the flat-aimed trajectory descends through altitude deltaZMeters.
 * This is what the suppression threshold gates on, because metres of miss
 * is the quantity a player can act on and mil-per-metre is not.
 */
export function missMeters(arcModel, rangeMeters, deltaZMeters) {
    const tanTheta = solveTan(
        arcModel.muzzleVelocity,
        rangeMeters,
        0,
        arcModel.branch
    );

    if (tanTheta === null) {
        return null;
    }

    const v = arcModel.muzzleVelocity;
    const cosSquared = 1 / (1 + tanTheta * tanTheta);
    const a = GRAVITY / (2 * v * v * cosSquared);
    const discriminant = tanTheta * tanTheta - 4 * a * deltaZMeters;

    if (discriminant < 0) {
        return null;
    }

    const root = Math.sqrt(discriminant);
    const crossings = [
        (tanTheta - root) / (2 * a),
        (tanTheta + root) / (2 * a)
    ].filter(x => x > 0);

    if (!crossings.length) {
        return null;
    }

    /* The descending crossing is the far one. */
    return rangeMeters - Math.max(...crossings);
}

/*
 * Least squares over the affine mil mapping. The two angle parameters are
 * searched on a grid; muzzle velocity is solved in closed form for each
 * candidate, because for fixed angles R = (v^2/g) sin(2 theta) is linear in
 * v^2/g and the optimum is a ratio of sums.
 */
const ANGLE_OFFSET_MIN_DEG = -90;
const ANGLE_OFFSET_MAX_DEG = 90;
const ANGLE_OFFSET_STEP_DEG = 0.25;
const ANGLE_PER_MIL_MIN_DEG = 0.0005;
const ANGLE_PER_MIL_MAX_DEG = 0.2;
const ANGLE_PER_MIL_STEP_DEG = 0.0005;

export function fitArc(rows, branch) {
    const samples = rows
        .map(([distance, mil]) => [Number(distance), Number(mil)])
        .filter(pair => pair.every(Number.isFinite));

    if (samples.length < 3) {
        throw new Error('fitArc needs at least three table rows');
    }

    let best = null;

    for (
        let offset = ANGLE_OFFSET_MIN_DEG;
        offset <= ANGLE_OFFSET_MAX_DEG;
        offset += ANGLE_OFFSET_STEP_DEG
    ) {
        for (
            let perMil = ANGLE_PER_MIL_MIN_DEG;
            perMil <= ANGLE_PER_MIL_MAX_DEG;
            perMil += ANGLE_PER_MIL_STEP_DEG
        ) {
            let numerator = 0;
            let denominator = 0;
            let usable = true;

            for (const [distance, mil] of samples) {
                const theta = (offset + perMil * mil) * Math.PI / 180;
                const sin2Theta = Math.sin(2 * theta);

                if (sin2Theta <= 1e-6) {
                    usable = false;
                    break;
                }

                numerator += distance * sin2Theta;
                denominator += sin2Theta * sin2Theta;
            }

            if (!usable || denominator <= 0) {
                continue;
            }

            /* k = v^2 / g */
            const k = numerator / denominator;

            let squared = 0;

            for (const [distance, mil] of samples) {
                const theta = (offset + perMil * mil) * Math.PI / 180;
                const predicted = k * Math.sin(2 * theta);

                squared += (distance - predicted) ** 2;
            }

            const rms = Math.sqrt(squared / samples.length);

            if (!best || rms < best.rmsMeters) {
                best = {
                    branch,
                    muzzleVelocity: Math.sqrt(k * GRAVITY),
                    angleOffsetDeg: offset,
                    anglePerMilDeg: perMil,
                    rmsMeters: rms
                };
            }
        }
    }

    if (!best) {
        throw new Error('fitArc found no usable parameters');
    }

    return best;
}
