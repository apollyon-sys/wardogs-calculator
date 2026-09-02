/* =========================
   TIME OF FLIGHT
   ========================= */

/*
 * How long the shell is in the air, for the SPG-2's two arcs.
 *
 * Nothing is stored: the time falls out of the same vacuum fit the range
 * ring reads (data/ballistics/projectile-model.json), so data/weapons.json
 * needs no third column. The fit gives the launch angle for a MIL —
 * theta = angleOffsetDeg + anglePerMilDeg * mil — and in vacuum
 *
 *     t = (v sin(theta) + sqrt((v sin(theta))^2 - 2 g dz)) / g
 *
 * where dz is target height minus gun height, matching the sign convention
 * of the terrain correction. At dz = 0 that is the familiar 2 v sin(theta) / g.
 *
 * The angle comes from the MIL actually on screen rather than from the
 * distance, so the printed time always belongs to the number above it —
 * including when the terrain correction has moved that number.
 *
 * Every weapon with a fitted arc gets one, the mortar included. It earns
 * less there — the whole 132–684 m envelope flies 14.9–17.5 s, because a
 * shorter shot is a steeper one and the extra climb cancels the shorter
 * reach — but "about 17 seconds" is still the answer to a question a player
 * asks, and printing it beats making them wonder. On the SPG-2 the two arcs
 * differ by a factor of two to three at the same range, which is a real
 * choice the panel can inform.
 *
 * These are DERIVED seconds and are printed with a ≈. The fit has never
 * been checked against the game, and the high-branch assumption underneath
 * it is an inference.
 */

const FLIGHT_TIME_GRAVITY = 9.81;

/*
 * A distance that lands on a table row carrying several mils has no single
 * angle, so the band's midpoint stands in for it. The spread is a few mils
 * and the answer is printed to the second with a ≈ in front of it.
 */
function flightTimeMil(solution) {
    if (!solution) {
        return null;
    }

    const mil = Number(solution.mil);

    if (Number.isFinite(mil)) {
        return mil;
    }

    const min = Number(solution.minMil);
    const max = Number(solution.maxMil);

    return Number.isFinite(min) && Number.isFinite(max)
        ? (min + max) / 2
        : null;
}

/*
 * Seconds for one arc at one MIL. Exposed on its own so the derivation can
 * be tested without going through the panel.
 */
function flightTimeSecondsForMil(weaponId, arc, mil, deltaZMeters = 0) {
    const fit =
        typeof projectileModelArc === 'function'
            ? projectileModelArc(weaponId, arc)
            : null;

    if (!fit || !Number.isFinite(mil)) {
        return null;
    }

    const degrees =
        Number(fit.angleOffsetDeg) +
        Number(fit.anglePerMilDeg) * mil;

    if (!Number.isFinite(degrees)) {
        return null;
    }

    const vertical =
        Number(fit.muzzleVelocity) *
        Math.sin(degrees * Math.PI / 180);

    const dz = Number.isFinite(deltaZMeters) ? deltaZMeters : 0;

    const inner =
        vertical * vertical -
        2 * FLIGHT_TIME_GRAVITY * dz;

    if (!Number.isFinite(inner) || inner < 0) {
        return null;
    }

    const seconds =
        (vertical + Math.sqrt(inner)) /
        FLIGHT_TIME_GRAVITY;

    return seconds > 0 ? seconds : null;
}

/*
 * Seconds for an arc at a distance, taking the MIL from the flat table.
 * The panel does not use this — it already holds the solutions, corrected
 * or not — but it is what makes the derivation checkable on its own.
 */
function flightTimeSeconds(weaponId, arc, distanceMeters, deltaZMeters = 0) {
    const weapon = WEAPONS?.[weaponId];

    if (!weapon) {
        return null;
    }

    const solutions =
        getWeaponElevationSolutions(weapon, distanceMeters);

    return flightTimeSecondsForMil(
        weaponId,
        arc,
        flightTimeMil(solutions?.[arc]),
        deltaZMeters
    );
}

function formatFlightTime(seconds) {
    return `≈ ${Math.round(seconds)} s`;
}

/*
 * Which label an arc wears on its badge. `single` has none — there is no
 * other arc to tell it apart from, so the mortar shows one unlabelled
 * badge under the row's own heading.
 */
const FLIGHT_TIME_ARC_LABELS = {
    low: 'lowArc',
    high: 'highArc',
    single: null
};

/*
 * One badge per arc the panel is showing, in the order it shows them.
 * An empty list means nothing to say — the mortar, an out-of-range target,
 * or a model that failed to load — and the row is hidden rather than blank.
 */
function flightTimeBadges(weapon, solutions, deltaZMeters = 0) {
    if (!weapon || !solutions) {
        return [];
    }

    const badges = ['low', 'high', 'single']
        .filter(arc => solutions[arc])
        .map(arc => ({
            arc,
            labelKey: FLIGHT_TIME_ARC_LABELS[arc],
            seconds: flightTimeSecondsForMil(
                weapon.id,
                arc,
                flightTimeMil(solutions[arc]),
                deltaZMeters
            )
        }));

    return badges.some(badge => badge.seconds === null)
        ? []
        : badges;
}
