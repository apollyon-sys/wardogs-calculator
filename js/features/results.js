/* =========================
   RESULT
   ========================= */

function formatMilSolution(solution) {
    if (!solution) {
        return null;
    }

    const minMil = Math.round(solution.minMil);
    const maxMil = Math.round(solution.maxMil);

    if (minMil !== maxMil) {
        return `${minMil}–${maxMil}`;
    }

    return `${Math.round(solution.mil ?? minMil)}`;
}

function resolveElevationSolutions(
    weapon,
    distanceMeters,
    solutions
) {
    if (
        typeof getTerrainBallisticSolutions !==
        'function'
    ) {
        return {
            solutions,
            terrainMeta: null
        };
    }

    try {
        const resolved =
            getTerrainBallisticSolutions({
                weapon,
                distanceMeters,
                solutions,
                mapId: S.map,
                origin: S.origin,
                target: S.target
            });

        return {
            solutions:
                resolved?.solutions ??
                solutions,
            terrainMeta:
                resolved?.meta ??
                null
        };
    } catch (error) {
        console.warn(
            '[terrain-ballistics] Failed to resolve terrain firing solution; using flat-table fallback.',
            error
        );

        return {
            solutions,
            terrainMeta: null
        };
    }
}

function formatTerrainBallisticDetail(meta) {
    if (
        typeof formatTerrainBallisticsStatus !==
        'function'
    ) {
        return '';
    }

    return formatTerrainBallisticsStatus(meta);
}

/*
 * One badge per arc, below the metric grid rather than inside the MIL card:
 * at the sub-line's 8 px the seconds were unreadable, and this is a value in
 * its own right rather than a footnote to the MIL.
 *
 * Built with the DOM rather than innerHTML — the arc labels are translated
 * strings and the numbers are computed, but the row is rebuilt on every
 * pointer move, so there is no reason to parse markup that often either.
 */
function renderFlightTime(weapon, solutions, terrainMeta) {
    const row = $('flightTimes');
    const host = $('flightTimeBadges');

    if (!row || !host) {
        return;
    }

    const badges =
        typeof flightTimeBadges === 'function'
            ? flightTimeBadges(
                weapon,
                solutions,
                Number(terrainMeta?.deltaZ) || 0
            )
            : [];

    row.hidden = !badges.length;
    host.textContent = '';

    badges.forEach(badge => {
        const pill = document.createElement('span');
        pill.className = 'flight-badge';

        if (badge.labelKey) {
            const label = document.createElement('span');
            label.className = 'flight-badge-arc';
            label.textContent = tr(badge.labelKey);
            pill.appendChild(label);
        }

        const value = document.createElement('strong');
        value.className = 'flight-badge-value';
        value.textContent = formatFlightTime(badge.seconds);
        pill.appendChild(value);

        host.appendChild(pill);
    });
}

function renderElevationResult(weapon, distanceMeters) {
    const value = $('mil');
    const detail = $('milAlt');

    if (!value) {
        return;
    }

    const flatSolutions =
        getWeaponElevationSolutions(
            weapon,
            distanceMeters
        );

    const resolved =
        resolveElevationSolutions(
            weapon,
            distanceMeters,
            flatSolutions
        );

    const solutions =
        resolved.solutions;

    const terrainDetail =
        formatTerrainBallisticDetail(
            resolved.terrainMeta
        );

    let primary = '—';
    let secondary = '';

    if (solutions.single) {
        primary = formatMilSolution(solutions.single);
    } else if (solutions.low && solutions.high) {
        primary =
            `${formatMilSolution(solutions.low)} / ` +
            `${formatMilSolution(solutions.high)}`;
        secondary = `${tr('lowArc')} / ${tr('highArc')}`;
    } else if (solutions.low) {
        primary = formatMilSolution(solutions.low);
        secondary = tr('lowArc');
    } else if (solutions.high) {
        primary = formatMilSolution(solutions.high);
        secondary = tr('highArc');
    } else if (solutions.inRange) {
        secondary = tr('noFiringSolution');
    }

    if (terrainDetail) {
        secondary = secondary
            ? `${secondary} · ${terrainDetail}`
            : terrainDetail;
    }

    renderFlightTime(
        weapon,
        solutions,
        resolved.terrainMeta
    );

    setText(
        value,
        primary
    );

    if (detail) {
        setText(
            detail,
            secondary
        );
        if (detail.hidden !== !secondary) {
            detail.hidden = !secondary;
        }
    }
}

function result() {

    const weapon = WEAPONS[S.weapon];

    if (!weapon) {
        return;
    }

    const dx =
        S.target.x -
        S.origin.x;

    const dy =
        S.target.y -
        S.origin.y;

    const dWorld =
        Math.hypot(
            dx,
            dy
        );

    const dMeters =
        worldDistanceToMeters(dWorld);

    const d =
        dMeters / 1000;

    let a =
        Math.atan2(
            dx,
            dy
        ) *
        180 /
        Math.PI;

    if (
        a <
        0
    ) {
        a +=
            360;
    }

    setText(
        $('angle'),
        a.toFixed(
            1
        ) +
        '°'
    );

    setText(
        $('dist'),
        d.toFixed(
            2
        ) +
        ' km'
    );

    setText(
        $('distm'),
        Math.round(
            d *
            1000
        ) +
        ' m'
    );

    setText(
        $('dx'),
        (
            dx >=
            0
                ? '+'
                : '-'
        ) +
        Math.round(
            Math.abs(
                worldDistanceToMeters(dx)
            )
        ) +
        ' m'
    );

    setText(
        $('dy'),
        (
            dy >=
            0
                ? '+'
                : '-'
        ) +
        Math.round(
            Math.abs(
                worldDistanceToMeters(dy)
            )
        ) +
        ' m'
    );

    renderElevationResult(
        weapon,
        dMeters
    );

    if (
        typeof syncSphLevelWarning ===
        'function'
    ) {
        syncSphLevelWarning();
    }

    const minRange =
        weapon.minRange ??
        0;

    const maxRange =
        weapon.maxRange ??
        weapon.range;

    const inRange =
        d + 1e-9 >= minRange &&
        d <= maxRange + 1e-9;

    setText(
        $('range'),
        minRange > 0
            ? `${Math.round(minRange * 1000)}–${Math.round(maxRange * 1000)} m`
            : `${Math.round(maxRange * 1000)} m`
    );

    setText(
        $('rangeStatus'),
        inRange
            ? tr('inRange')
            : tr('outRange')
    );

    setStyle(
        $('rangeStatus'),
        'color',
        inRange
            ? '#82c596'
            : '#d86666'
    );

    const mapName =
        S.map ===
        'custom'
            ? tr('customMap')
            : MAPS[S.map]?.name ||
            S.map;

    setText(
        $('status'),
        `${getWeaponName(weapon)} · ` +
        `${mapName} · ` +
        `${tr('artillery')}: ` +
        `${formatGameCoordinate(S.origin.x)}, ` +
        `${formatGameCoordinate(S.origin.y)} · ` +
        `${tr('target')}: ` +
        `${formatGameCoordinate(S.target.x)}, ` +
        `${formatGameCoordinate(S.target.y)}`
    );

    if (
        typeof trackCalculationState ===
        'function'
    ) {
        trackCalculationState(
            inRange
        );
    }
}


/* =========================
   SAVED TARGET FIRING INFO
   ========================= */

let savedTargetSummaryRefreshTimer = null;
let savedTargetSummaryState = '';

function getSavedTargetEffectiveOrigin(target) {
    const hasSavedOrigin =
        Boolean(
            target?.saveArtillery &&
            target?.origin &&
            Number.isFinite(
                Number(target.origin.x)
            ) &&
            Number.isFinite(
                Number(target.origin.y)
            )
        );

    if (hasSavedOrigin) {
        return {
            x: Number(target.origin.x),
            y: Number(target.origin.y)
        };
    }

    return {
        x: Number(S.origin.x),
        y: Number(S.origin.y)
    };
}

function getSavedTargetElevationSummary(
    weapon,
    distanceMeters,
    origin,
    targetPoint
) {
    const flatSolutions =
        getWeaponElevationSolutions(
            weapon,
            distanceMeters
        );

    let solutions =
        flatSolutions;

    if (
        typeof getTerrainBallisticSolutions ===
        'function'
    ) {
        try {
            const resolved =
                getTerrainBallisticSolutions({
                    weapon,
                    distanceMeters,
                    solutions:
                        flatSolutions,
                    mapId:
                        S.map,
                    origin,
                    target:
                        targetPoint
                });

            solutions =
                resolved?.solutions ??
                flatSolutions;
        } catch (error) {
            /*
             * Saved-target cards are a convenience view.
             * A terrain resolver failure must never make
             * the target list unusable; flat-table values
             * remain the fallback just like the main result.
             */
            solutions =
                flatSolutions;
        }
    }

    let primary =
        '—';

    let secondary =
        '';

    if (solutions.single) {
        primary =
            formatMilSolution(
                solutions.single
            );

    } else if (
        solutions.low &&
        solutions.high
    ) {
        primary =
            `${formatMilSolution(solutions.low)} / ` +
            `${formatMilSolution(solutions.high)}`;

        secondary =
            `${tr('lowArc')} / ${tr('highArc')}`;

    } else if (solutions.low) {
        primary =
            formatMilSolution(
                solutions.low
            );

        secondary =
            tr('lowArc');

    } else if (solutions.high) {
        primary =
            formatMilSolution(
                solutions.high
            );

        secondary =
            tr('highArc');

    } else if (solutions.inRange) {
        secondary =
            tr('noFiringSolution');

    } else {
        secondary =
            tr('outRange');
    }

    return {
        primary,
        secondary,
        inRange:
            Boolean(
                solutions.inRange
            )
    };
}

function getSavedTargetFiringInfo(target) {
    const weapon =
        WEAPONS[S.weapon];

    if (
        !weapon ||
        !target ||
        !Number.isFinite(
            Number(target.x)
        ) ||
        !Number.isFinite(
            Number(target.y)
        )
    ) {
        return null;
    }

    const origin =
        getSavedTargetEffectiveOrigin(
            target
        );

    const targetPoint = {
        x: Number(target.x),
        y: Number(target.y)
    };

    const dx =
        targetPoint.x -
        origin.x;

    const dy =
        targetPoint.y -
        origin.y;

    const distanceMeters =
        worldDistanceToMeters(
            Math.hypot(
                dx,
                dy
            )
        );

    let azimuth =
        Math.atan2(
            dx,
            dy
        ) *
        180 /
        Math.PI;

    if (azimuth < 0) {
        azimuth += 360;
    }

    const elevation =
        getSavedTargetElevationSummary(
            weapon,
            distanceMeters,
            origin,
            targetPoint
        );

    return {
        origin,
        target:
            targetPoint,
        distanceMeters,
        distanceKm:
            distanceMeters /
            1000,
        azimuth,
        dxMeters:
            worldDistanceToMeters(
                dx
            ),
        dyMeters:
            worldDistanceToMeters(
                dy
            ),
        mil:
            elevation.primary,
        milDetail:
            elevation.secondary,
        inRange:
            elevation.inRange
    };
}

function formatSavedTargetSignedMeters(value) {
    return (
        (
            value >= 0
                ? '+'
                : '-'
        ) +
        Math.round(
            Math.abs(value)
        ) +
        ' m'
    );
}

function createSavedTargetMetric(
    label,
    value,
    detail = '',
    extraClass = ''
) {
    const metric =
        document.createElement(
            'div'
        );

    metric.className =
        `saved-target-metric ${extraClass}`
            .trim();

    const labelElement =
        document.createElement(
            'span'
        );

    labelElement.className =
        'saved-target-metric-label';

    labelElement.textContent =
        label;

    const valueElement =
        document.createElement(
            'strong'
        );

    valueElement.className =
        'saved-target-metric-value';

    valueElement.textContent =
        value;

    metric.append(
        labelElement,
        valueElement
    );

    if (detail) {
        const detailElement =
            document.createElement(
                'span'
            );

        detailElement.className =
            'saved-target-metric-detail';

        detailElement.textContent =
            detail;

        metric.appendChild(
            detailElement
        );
    }

    return metric;
}

function renderSavedTargetFiringInfo(
    item,
    target
) {
    const info =
        item.querySelector(
            '.saved-target-info'
        );

    if (!info) {
        return;
    }

    info
        .querySelector(
            '.saved-target-origin'
        )
        ?.remove();

    info
        .querySelector(
            '.saved-target-solution'
        )
        ?.remove();

    const targetCoords =
        info.querySelector(
            '.saved-target-coords'
        );

    if (targetCoords) {
        targetCoords.textContent =
            `${tr('target')}: ` +
            `X ${formatGameCoordinate(target.x)} · ` +
            `Y ${formatGameCoordinate(target.y)}`;
    }

    const firingInfo =
        getSavedTargetFiringInfo(
            target
        );

    if (!firingInfo) {
        return;
    }

    const originCoords =
        document.createElement(
            'span'
        );

    originCoords.className =
        'saved-target-origin';

    originCoords.textContent =
        `${tr('artillery')}: ` +
        `X ${formatGameCoordinate(firingInfo.origin.x)} · ` +
        `Y ${formatGameCoordinate(firingInfo.origin.y)}`;

    const solution =
        document.createElement(
            'div'
        );

    solution.className =
        'saved-target-solution';

    const distanceMetric =
        createSavedTargetMetric(
            tr('distance'),
            `${Math.round(firingInfo.distanceMeters)} m`,
            `${firingInfo.distanceKm.toFixed(2)} km`
        );

    const azimuthMetric =
        createSavedTargetMetric(
            tr('azimuth'),
            `${firingInfo.azimuth.toFixed(1)}°`
        );

    const milMetric =
        createSavedTargetMetric(
            tr('mil'),
            firingInfo.mil,
            firingInfo.milDetail,
            'saved-target-metric-mil'
        );

    const delta =
        document.createElement(
            'div'
        );

    delta.className =
        'saved-target-delta';

    delta.textContent =
        `ΔX ${formatSavedTargetSignedMeters(firingInfo.dxMeters)} · ` +
        `ΔY ${formatSavedTargetSignedMeters(firingInfo.dyMeters)}`;

    solution.append(
        distanceMetric,
        azimuthMetric,
        milMetric,
        delta
    );

    info.append(
        originCoords,
        solution
    );

    item.classList.toggle(
        'out-of-range',
        !firingInfo.inRange
    );
}

function refreshSavedTargetFiringInfo() {
    const container =
        $('savedTargetsList');

    if (
        !container ||
        !Array.isArray(savedTargets)
    ) {
        return;
    }

    const rows =
        new Map();

    container
        .querySelectorAll(
            '.saved-target'
        )
        .forEach(
            item => {
                rows.set(
                    item.dataset.targetId,
                    item
                );
            }
        );

    savedTargets.forEach(
        target => {
            const item =
                rows.get(
                    String(target.id)
                );

            if (item) {
                renderSavedTargetFiringInfo(
                    item,
                    target
                );
            }
        }
    );
}

function getSavedTargetSummaryState() {
    return [
        S.map,
        S.weapon,
        S.origin?.x,
        S.origin?.y,
        LANG,
        Boolean(
            WEAPONS[S.weapon]
        )
    ].join('|');
}

function scheduleSavedTargetFiringInfoRefresh() {
    const nextState =
        getSavedTargetSummaryState();

    if (
        nextState ===
        savedTargetSummaryState
    ) {
        return;
    }

    if (
        savedTargetSummaryRefreshTimer
    ) {
        clearTimeout(
            savedTargetSummaryRefreshTimer
        );
    }

    savedTargetSummaryRefreshTimer =
        setTimeout(
            () => {
                savedTargetSummaryRefreshTimer =
                    null;

                savedTargetSummaryState =
                    getSavedTargetSummaryState();

                refreshSavedTargetFiringInfo();
            },
            80
        );
}

/*
 * saved-targets.js is loaded before results.js.
 * Wrap its two public render/update functions here
 * so the existing target-list behavior stays intact
 * while every row gains a live firing solution.
 */
if (
    typeof renderSavedTargets ===
    'function'
) {
    const renderSavedTargetsBase =
        renderSavedTargets;

    renderSavedTargets =
        function (...args) {
            const result =
                renderSavedTargetsBase.apply(
                    this,
                    args
                );

            savedTargetSummaryState =
                getSavedTargetSummaryState();

            refreshSavedTargetFiringInfo();

            return result;
        };
}

if (
    typeof refreshSavedTargetHighlight ===
    'function'
) {
    const refreshSavedTargetHighlightBase =
        refreshSavedTargetHighlight;

    refreshSavedTargetHighlight =
        function (...args) {
            const result =
                refreshSavedTargetHighlightBase.apply(
                    this,
                    args
                );

            scheduleSavedTargetFiringInfoRefresh();

            return result;
        };
}
