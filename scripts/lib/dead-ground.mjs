import { GRAVITY, solveTan } from './ballistics.mjs';

export const DEAD_GROUND_CLEARANCE_METRES = 0;

export function trajectoryHeight(muzzleVelocity, tanTheta, xMeters) {
    if (
        !Number.isFinite(muzzleVelocity) ||
        muzzleVelocity <= 0 ||
        !Number.isFinite(tanTheta) ||
        !Number.isFinite(xMeters)
    ) {
        return null;
    }

    return (
        xMeters * tanTheta -
        GRAVITY * xMeters * xMeters *
        (1 + tanTheta * tanTheta) /
        (2 * muzzleVelocity * muzzleVelocity)
    );
}

export function isDeadGround(
    muzzleVelocity,
    samples,
    index,
    clearanceMeters = DEAD_GROUND_CLEARANCE_METRES
) {
    const target = samples[index];

    if (!target) {
        return false;
    }

    const [rangeMeters, deltaZMeters] = target;

    const tanTheta = solveTan(
        muzzleVelocity,
        rangeMeters,
        deltaZMeters,
        'low'
    );

    if (tanTheta === null) {
        return false;
    }

    for (let j = 0; j < index; j += 1) {
        const [x, z] = samples[j];

        if (!(x > 0) || x >= rangeMeters) {
            continue;
        }

        const y = trajectoryHeight(muzzleVelocity, tanTheta, x);

        if (y === null) {
            continue;
        }

        if (z - y > clearanceMeters) {
            return true;
        }
    }

    return false;
}

export function grazingTan(
    muzzleVelocity,
    xMeters,
    zMeters,
    clearanceMeters = DEAD_GROUND_CLEARANCE_METRES
) {
    if (!(xMeters > 0)) {
        return null;
    }

    const tanTheta = solveTan(
        muzzleVelocity,
        xMeters,
        zMeters - clearanceMeters,
        'low'
    );

    return tanTheta === null ? Infinity : tanTheta;
}

export function deadGroundIntervals(
    muzzleVelocity,
    samples,
    clearanceMeters = DEAD_GROUND_CLEARANCE_METRES
) {
    const intervals = [];

    if (!Array.isArray(samples) || samples.length < 2) {
        return intervals;
    }

    const edgeBefore = index =>
        index === 0
            ? samples[0][0]
            : (samples[index - 1][0] + samples[index][0]) / 2;

    const edgeAfter = index =>
        index === samples.length - 1
            ? samples[index][0]
            : (samples[index][0] + samples[index + 1][0]) / 2;

    let required = -Infinity;
    let runStart = -1;

    for (let i = 0; i < samples.length; i += 1) {
        const [rangeMeters, deltaZMeters] = samples[i];

        const tanTheta = solveTan(
            muzzleVelocity,
            rangeMeters,
            deltaZMeters,
            'low'
        );

        const dead = tanTheta !== null && tanTheta < required;

        if (dead && runStart < 0) {
            runStart = i;
        }

        if (!dead && runStart >= 0) {
            intervals.push([edgeBefore(runStart), edgeAfter(i - 1)]);
            runStart = -1;
        }

        const graze = grazingTan(
            muzzleVelocity,
            rangeMeters,
            deltaZMeters,
            clearanceMeters
        );

        if (graze !== null && graze > required) {
            required = graze;
        }
    }

    if (runStart >= 0) {
        intervals.push([
            edgeBefore(runStart),
            edgeAfter(samples.length - 1)
        ]);
    }

    return intervals;
}
