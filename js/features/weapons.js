/* =========================
   WEAPONS
   ========================= */

let DEFAULT_WEAPON = null;

function normalizeBallisticTable(table) {
    if (!Array.isArray(table)) {
        return [];
    }

    return table
        .map(entry => {
            if (!Array.isArray(entry) || entry.length < 2) {
                return null;
            }

            const distance = Number(entry[0]);
            const mil = Number(entry[1]);

            return (
                Number.isFinite(distance) &&
                Number.isFinite(mil)
            )
                ? [distance, mil]
                : null;
        })
        .filter(Boolean);
}

function normalizeBallistics(ballistics) {
    if (!ballistics || typeof ballistics !== 'object') {
        return null;
    }

    const normalized = {
        single: normalizeBallisticTable(ballistics.single),
        low: normalizeBallisticTable(ballistics.low),
        high: normalizeBallisticTable(ballistics.high)
    };

    return (
        normalized.single.length ||
        normalized.low.length ||
        normalized.high.length
    )
        ? normalized
        : null;
}

function normalizeWeapon(item) {
    if (!item || !isValidRegistryId(item.id?.trim())) {
        return null;
    }

    const maxRangeKm = Number(
        item.maxRangeKm ??
        item.rangeKm ??
        item.range
    );

    const minRangeKm = Number(
        item.minRangeKm ??
        0
    );

    if (
        !Number.isFinite(maxRangeKm) ||
        maxRangeKm <= 0 ||
        !Number.isFinite(minRangeKm) ||
        minRangeKm < 0 ||
        minRangeKm > maxRangeKm
    ) {
        return null;
    }

    const names =
        item.names && typeof item.names === 'object'
            ? { ...item.names }
            : {};

    return {
        id: item.id.trim(),
        names,
        minRange: minRangeKm,
        maxRange: maxRangeKm,
        range: maxRangeKm,
        minElevationMil: Number.isFinite(Number(item.minElevationMil))
            ? Number(item.minElevationMil)
            : null,
        maxElevationMil: Number.isFinite(Number(item.maxElevationMil))
            ? Number(item.maxElevationMil)
            : null,
        ballistics: normalizeBallistics(item.ballistics)
    };
}

function groupBallisticTable(table) {
    const grouped = [];

    [...table]
        .sort((a, b) => (
            a[0] - b[0] ||
            a[1] - b[1]
        ))
        .forEach(([distance, mil]) => {
            const previous = grouped[grouped.length - 1];

            if (previous && previous.distance === distance) {
                previous.mils.push(mil);
                return;
            }

            grouped.push({
                distance,
                mils: [mil]
            });
        });

    return grouped;
}

function closestMil(values, target) {
    return values.reduce(
        (best, value) => (
            Math.abs(value - target) <
            Math.abs(best - target)
                ? value
                : best
        ),
        values[0]
    );
}

function interpolateBallisticTable(table, distanceMeters) {
    if (
        !Array.isArray(table) ||
        !table.length ||
        !Number.isFinite(distanceMeters)
    ) {
        return null;
    }

    const groups = groupBallisticTable(table);
    const epsilon = 1e-6;

    const exact = groups.find(
        group =>
            Math.abs(group.distance - distanceMeters) <= epsilon
    );

    if (exact) {
        const minMil = Math.min(...exact.mils);
        const maxMil = Math.max(...exact.mils);

        return {
            mil: exact.mils.length === 1
                ? exact.mils[0]
                : null,
            minMil,
            maxMil
        };
    }

    let left = null;
    let right = null;

    for (let i = 0; i < groups.length - 1; i++) {
        if (
            distanceMeters > groups[i].distance &&
            distanceMeters < groups[i + 1].distance
        ) {
            left = groups[i];
            right = groups[i + 1];
            break;
        }
    }

    if (!left || !right) {
        return null;
    }

    const rightAverage =
        right.mils.reduce((sum, value) => sum + value, 0) /
        right.mils.length;

    const leftMil = closestMil(left.mils, rightAverage);
    const rightMil = closestMil(right.mils, leftMil);

    const factor =
        (distanceMeters - left.distance) /
        (right.distance - left.distance);

    const mil = leftMil + factor * (rightMil - leftMil);

    return {
        mil,
        minMil: mil,
        maxMil: mil
    };
}

function getWeaponElevationSolutions(weapon, distanceMeters) {
    if (!weapon || !Number.isFinite(distanceMeters)) {
        return {
            inRange: false,
            single: null,
            low: null,
            high: null
        };
    }

    const minMeters = (weapon.minRange ?? 0) * 1000;
    const maxMeters =
        (weapon.maxRange ?? weapon.range ?? 0) * 1000;

    const inRange =
        distanceMeters + 1e-6 >= minMeters &&
        distanceMeters <= maxMeters + 1e-6;

    if (!inRange || !weapon.ballistics) {
        return {
            inRange,
            single: null,
            low: null,
            high: null
        };
    }

    return {
        inRange,
        single: interpolateBallisticTable(
            weapon.ballistics.single,
            distanceMeters
        ),
        low: interpolateBallisticTable(
            weapon.ballistics.low,
            distanceMeters
        ),
        high: interpolateBallisticTable(
            weapon.ballistics.high,
            distanceMeters
        )
    };
}

function getWeaponName(weapon) {
    if (!weapon) {
        return '';
    }

    return (
        weapon.names?.[LANG] ??
        weapon.names?.[DEFAULT_LANG] ??
        weapon.names?.en ??
        weapon.id
    );
}

async function loadWeapons() {
    const data = await fetchJSON('data/weapons.json');
    const source = Array.isArray(data) ? data : data?.weapons;

    if (!Array.isArray(source) || !source.length) {
        throw new Error('No weapons found in data/weapons.json');
    }

    WEAPONS = createSafeRegistry();

    source
        .map(normalizeWeapon)
        .filter(Boolean)
        .forEach(weapon => {
            WEAPONS[weapon.id] = weapon;
        });

    const ids = Object.keys(WEAPONS);

    if (!ids.length) {
        throw new Error('No valid weapons found in data/weapons.json');
    }

    DEFAULT_WEAPON =
        typeof data?.default === 'string' &&
        hasRegistryEntry(WEAPONS, data.default)
            ? data.default
            : ids[0];

    if (!S.weapon || !hasRegistryEntry(WEAPONS, S.weapon)) {
        S.weapon = DEFAULT_WEAPON;
    }

    populateWeaponSelect();
}

function populateWeaponSelect() {
    const select = $('weapon');

    if (!select) {
        return;
    }

    select.innerHTML = '';

    Object.values(WEAPONS).forEach(weapon => {
        const option = document.createElement('option');
        option.value = weapon.id;
        option.textContent = getWeaponName(weapon);
        select.appendChild(option);
    });

    select.value = S.weapon;
}
