/* =========================
   EXPERIMENTAL SPH-2 HULL / PLATFORM CORRECTION
   ========================= */

/*
 * Research-only / test implementation.
 *
 * The field data currently supports a repeatable ~1 degree fore/aft
 * heading-dependent component on visually level SPH-2 placements. The
 * correction below deliberately normalizes to the forward-hull reference
 * (relative gun yaw = 0 degrees) instead of treating +1 degree as an
 * absolute world-level correction. This keeps hull == gun unchanged and
 * only compensates the validated heading-dependent part of the error.
 *
 * Roll is intentionally left at zero for this test patch. The longitudinal
 * component is much better constrained than the small roll/yaw component.
 *
 * Field validation on 2026-09-18 showed that applying the inverse-transform
 * yaw as a user-facing AZIMUTH correction produced almost exactly the observed
 * lateral miss. AZIMUTH therefore remains the normal geometric world azimuth;
 * the experimental hull/platform model adjusts MIL only.
 */

const SPH_PLATFORM_CORRECTION_STORAGE_KEY =
    'wardogs-sph-platform-correction-hull-heading';

const SPH_PLATFORM_ARC_STORAGE_KEY =
    'wardogs-sph-platform-correction-arc';

const SPH_PLATFORM_MANUAL_MIL_STORAGE_KEY =
    'wardogs-sph-platform-manual-mil-adjustment';

const SPH_PLATFORM_CORRECTION = Object.freeze({
    weaponId: 'spg',
    baselinePitchDeg: 1.0,
    baselineRollDeg: 0.0
});

let sphPlatformHullHeadingDeg = null;
let sphPlatformSelectedArc = 'high';
let sphPlatformManualMilAdjustment = 0;
let sphPlatformLastAimMeta = null;
let sphPlatformCorrectionInitialized = false;

function sphPlatformNormalizeDegrees(value) {
    const degrees = Number(value);

    if (!Number.isFinite(degrees)) {
        return null;
    }

    return ((degrees % 360) + 360) % 360;
}

function sphPlatformNormalizeDegreesSigned(value) {
    const degrees = Number(value);

    if (!Number.isFinite(degrees)) {
        return 0;
    }

    return ((degrees + 180) % 360 + 360) % 360 - 180;
}

function sphPlatformLabels() {
    const baselinePitch =
        SPH_PLATFORM_CORRECTION.baselinePitchDeg
            .toFixed(1);

    return {
        hullDirection:
            tr('sphHullDirection'),
        hullHelp:
            tr('sphHullDirectionHelp'),
        arc:
            tr('sphArc'),
        placeholder:
            tr('sphHullDirectionPlaceholder'),
        inactive:
            tr('sphHullCorrectionInactive'),
        active:
            tr('sphHullCorrectionActive')
                .replace(
                    '{pitch}',
                    baselinePitch
                ),
        correction:
            tr('sphHullCorrectionShort'),
        manualMil:
            tr('sphPlatformMilAdjustment'),
        manualMilShort:
            tr('sphPlatformMilAdjustmentShort'),
        lowHigh:
            `${tr('lowArc')} / ${tr('highArc')}`
    };
}

function sphPlatformLoadHullHeading() {
    try {
        const raw = localStorage.getItem(
            SPH_PLATFORM_CORRECTION_STORAGE_KEY
        );

        if (raw === null || raw === '') {
            sphPlatformHullHeadingDeg = null;
            return;
        }

        sphPlatformHullHeadingDeg =
            sphPlatformNormalizeDegrees(raw);
    } catch (error) {
        sphPlatformHullHeadingDeg = null;
    }
}

function sphPlatformPersistHullHeading() {
    try {
        if (sphPlatformHullHeadingDeg === null) {
            localStorage.removeItem(
                SPH_PLATFORM_CORRECTION_STORAGE_KEY
            );
            return;
        }

        localStorage.setItem(
            SPH_PLATFORM_CORRECTION_STORAGE_KEY,
            String(sphPlatformHullHeadingDeg)
        );
    } catch (error) {
        /* Local persistence is optional for the test correction. */
    }
}

function sphPlatformNormalizeArc(value) {
    return value === 'low'
        ? 'low'
        : 'high';
}

function sphPlatformLoadArc() {
    try {
        sphPlatformSelectedArc =
            sphPlatformNormalizeArc(
                localStorage.getItem(
                    SPH_PLATFORM_ARC_STORAGE_KEY
                )
            );
    } catch (error) {
        sphPlatformSelectedArc = 'high';
    }
}

function sphPlatformPersistArc() {
    try {
        localStorage.setItem(
            SPH_PLATFORM_ARC_STORAGE_KEY,
            sphPlatformSelectedArc
        );
    } catch (error) {
        /* Local persistence is optional. */
    }
}

function sphPlatformNormalizeManualMilAdjustment(value) {
    const mil = Number(value);

    if (!Number.isFinite(mil)) {
        return 0;
    }

    return Math.max(
        -50,
        Math.min(50, mil)
    );
}

function sphPlatformLoadManualMilAdjustment() {
    /*
     * Manual platform MIL adjustment is intentionally hidden for now.
     * Reset any value saved by earlier experimental builds so a stale,
     * invisible correction can never keep affecting the firing solution.
     */
    sphPlatformManualMilAdjustment = 0;

    try {
        localStorage.removeItem(
            SPH_PLATFORM_MANUAL_MIL_STORAGE_KEY
        );
    } catch (error) {
        /* Local persistence is optional. */
    }
}

function sphPlatformPersistManualMilAdjustment() {
    try {
        if (Math.abs(sphPlatformManualMilAdjustment) < 1e-9) {
            localStorage.removeItem(
                SPH_PLATFORM_MANUAL_MIL_STORAGE_KEY
            );
            return;
        }

        localStorage.setItem(
            SPH_PLATFORM_MANUAL_MIL_STORAGE_KEY,
            String(sphPlatformManualMilAdjustment)
        );
    } catch (error) {
        /* Local persistence is optional. */
    }
}

function sphPlatformApplyManualMilToSolution(solution) {
    if (!solution) {
        return solution;
    }

    const delta =
        Number(sphPlatformManualMilAdjustment);

    if (!Number.isFinite(delta) || Math.abs(delta) < 1e-9) {
        return solution;
    }

    const add = value =>
        Number.isFinite(Number(value))
            ? Number(value) + delta
            : value;

    return {
        ...solution,
        mil: add(solution.mil),
        minMil: add(solution.minMil),
        maxMil: add(solution.maxMil)
    };
}

function sphPlatformApplyManualMilToSolutionSet(solutions) {
    if (
        !solutions ||
        S.weapon !== SPH_PLATFORM_CORRECTION.weaponId
    ) {
        return solutions;
    }

    return {
        ...solutions,
        single:
            sphPlatformApplyManualMilToSolution(
                solutions.single
            ),
        low:
            sphPlatformApplyManualMilToSolution(
                solutions.low
            ),
        high:
            sphPlatformApplyManualMilToSolution(
                solutions.high
            )
    };
}

function sphPlatformSelectArcSolutions(solutions) {
    if (
        !solutions ||
        S.weapon !== SPH_PLATFORM_CORRECTION.weaponId
    ) {
        return solutions;
    }

    return {
        ...solutions,
        low:
            sphPlatformSelectedArc === 'low'
                ? solutions.low
                : null,
        high:
            sphPlatformSelectedArc === 'high'
                ? solutions.high
                : null
    };
}

function sphPlatformCorrectionIsActive(weapon = WEAPONS[S.weapon]) {
    return Boolean(
        weapon?.id === SPH_PLATFORM_CORRECTION.weaponId &&
        Number.isFinite(sphPlatformHullHeadingDeg)
    );
}

function sphPlatformLocalDirection(
    elevationMrad,
    relativeYawDeg
) {
    const elevation = Number(elevationMrad) / 1000;
    const yaw = Number(relativeYawDeg) * Math.PI / 180;
    const cosElevation = Math.cos(elevation);

    return {
        x: cosElevation * Math.cos(yaw),
        y: cosElevation * Math.sin(yaw),
        z: Math.sin(elevation)
    };
}

function sphPlatformBasis() {
    const pitch =
        SPH_PLATFORM_CORRECTION.baselinePitchDeg *
        Math.PI / 180;

    const roll =
        SPH_PLATFORM_CORRECTION.baselineRollDeg *
        Math.PI / 180;

    const cp = Math.cos(pitch);
    const sp = Math.sin(pitch);
    const cr = Math.cos(roll);
    const sr = Math.sin(roll);

    return {
        forward: {
            x: cp,
            y: 0,
            z: sp
        },
        right: {
            x: sr * sp,
            y: cr,
            z: -sr * cp
        },
        up: {
            x: -cr * sp,
            y: sr,
            z: cr * cp
        }
    };
}

function sphPlatformRotateLocalToWorld(direction) {
    const basis = sphPlatformBasis();

    return {
        x:
            direction.x * basis.forward.x +
            direction.y * basis.right.x +
            direction.z * basis.up.x,
        y:
            direction.x * basis.forward.y +
            direction.y * basis.right.y +
            direction.z * basis.up.y,
        z:
            direction.x * basis.forward.z +
            direction.y * basis.right.z +
            direction.z * basis.up.z
    };
}

function sphPlatformRotateWorldToLocal(direction) {
    const basis = sphPlatformBasis();

    return {
        x:
            direction.x * basis.forward.x +
            direction.y * basis.forward.y +
            direction.z * basis.forward.z,
        y:
            direction.x * basis.right.x +
            direction.y * basis.right.y +
            direction.z * basis.right.z,
        z:
            direction.x * basis.up.x +
            direction.y * basis.up.y +
            direction.z * basis.up.z
    };
}

function sphPlatformElevationRadians(direction) {
    return Math.atan2(
        direction.z,
        Math.hypot(direction.x, direction.y)
    );
}

function sphPlatformAzimuthRadians(direction) {
    return Math.atan2(
        direction.y,
        direction.x
    );
}

/*
 * Convert the flat/terrain MIL solution into the command that should preserve
 * the same effective bore direction when the hull is rotated away from the
 * gun direction.
 *
 * Reference state:
 *   hull heading == target / gun azimuth (relative yaw 0 degrees)
 *
 * This is intentional. The controlled field tests show that the public table
 * is already close to the correct command in that reference orientation. The
 * patch therefore compensates only the repeatable heading-dependent delta.
 */
function sphPlatformCorrectAim(
    baselineMil,
    targetAzimuthDeg
) {
    const mil = Number(baselineMil);
    const targetAzimuth =
        sphPlatformNormalizeDegrees(targetAzimuthDeg);
    const hullHeading =
        sphPlatformNormalizeDegrees(
            sphPlatformHullHeadingDeg
        );

    if (
        !Number.isFinite(mil) ||
        targetAzimuth === null ||
        hullHeading === null
    ) {
        return null;
    }

    const referenceLocalBore =
        sphPlatformLocalDirection(
            mil,
            0
        );

    const referenceWorldBore =
        sphPlatformRotateLocalToWorld(
            referenceLocalBore
        );

    const desiredElevation =
        sphPlatformElevationRadians(
            referenceWorldBore
        );

    const desiredRelativeYawDeg =
        sphPlatformNormalizeDegreesSigned(
            targetAzimuth - hullHeading
        );

    const desiredRelativeYaw =
        desiredRelativeYawDeg *
        Math.PI / 180;

    const cosElevation =
        Math.cos(desiredElevation);

    const desiredWorldDirection = {
        x:
            cosElevation *
            Math.cos(desiredRelativeYaw),
        y:
            cosElevation *
            Math.sin(desiredRelativeYaw),
        z:
            Math.sin(desiredElevation)
    };

    const correctedLocalDirection =
        sphPlatformRotateWorldToLocal(
            desiredWorldDirection
        );

    const correctedMil =
        sphPlatformElevationRadians(
            correctedLocalDirection
        ) * 1000;

    return {
        baselineMil: mil,
        correctedMil,
        milDelta:
            correctedMil - mil,
        targetAzimuthDeg:
            targetAzimuth,
        hullHeadingDeg:
            hullHeading,
        relativeYawDeg:
            desiredRelativeYawDeg
    };
}

function sphPlatformCorrectSolution(
    solution,
    targetAzimuthDeg
) {
    if (!solution) {
        return {
            solution,
            aim: null
        };
    }

    const minAim =
        sphPlatformCorrectAim(
            solution.minMil,
            targetAzimuthDeg
        );

    const maxAim =
        sphPlatformCorrectAim(
            solution.maxMil,
            targetAzimuthDeg
        );

    const centerAim =
        Number.isFinite(solution.mil)
            ? sphPlatformCorrectAim(
                solution.mil,
                targetAzimuthDeg
            )
            : null;

    if (!minAim || !maxAim) {
        return {
            solution,
            aim: null
        };
    }

    const correctedMin =
        Math.min(
            minAim.correctedMil,
            maxAim.correctedMil
        );

    const correctedMax =
        Math.max(
            minAim.correctedMil,
            maxAim.correctedMil
        );

    return {
        solution: {
            ...solution,
            mil:
                centerAim?.correctedMil ??
                null,
            minMil:
                correctedMin,
            maxMil:
                correctedMax
        },
        aim: {
            center:
                centerAim,
            min:
                minAim,
            max:
                maxAim
        }
    };
}

function sphPlatformGetTargetAzimuth() {
    const dx =
        Number(S.target?.x) -
        Number(S.origin?.x);

    const dy =
        Number(S.target?.y) -
        Number(S.origin?.y);

    if (
        !Number.isFinite(dx) ||
        !Number.isFinite(dy)
    ) {
        return null;
    }

    return sphPlatformNormalizeDegrees(
        Math.atan2(dx, dy) *
        180 / Math.PI
    );
}

function sphPlatformCorrectSolutionSet(
    solutions,
    targetAzimuthDeg
) {
    if (!solutions) {
        return {
            solutions,
            aim: null
        };
    }

    const corrected = {
        ...solutions
    };

    const aim = {};

    ['single', 'low', 'high']
        .forEach(key => {
            const resolved =
                sphPlatformCorrectSolution(
                    solutions[key],
                    targetAzimuthDeg
                );

            corrected[key] =
                resolved.solution;

            aim[key] =
                resolved.aim;
        });

    return {
        solutions: corrected,
        aim
    };
}

function sphPlatformRepresentativeMilDelta(aim) {
    if (!aim) {
        return null;
    }

    if (aim.center) {
        return aim.center.milDelta;
    }

    const min = aim.min?.milDelta;
    const max = aim.max?.milDelta;

    if (
        Number.isFinite(min) &&
        Number.isFinite(max)
    ) {
        return (min + max) / 2;
    }

    return null;
}

function sphPlatformRenderCorrectedAim() {
    const details = [];

    if (
        sphPlatformCorrectionIsActive() &&
        sphPlatformLastAimMeta
    ) {
        const aim =
            sphPlatformLastAimMeta;

        const key =
            aim.single
                ? 'single'
                : aim.low
                    ? 'low'
                    : aim.high
                        ? 'high'
                        : null;

        if (key) {
            const delta =
                sphPlatformRepresentativeMilDelta(
                    aim[key]
                );

            if (Number.isFinite(delta)) {
                details.push(
                    `${sphPlatformLabels().correction} ` +
                    `${delta >= 0 ? '+' : ''}${delta.toFixed(1)} MIL`
                );
            }
        }
    }

    if (
        Number.isFinite(sphPlatformManualMilAdjustment) &&
        Math.abs(sphPlatformManualMilAdjustment) >= 0.05
    ) {
        const delta =
            sphPlatformManualMilAdjustment;

        details.push(
            `${sphPlatformLabels().manualMilShort} ` +
            `${delta >= 0 ? '+' : ''}${delta.toFixed(1)} MIL`
        );
    }

    if (!details.length) {
        return;
    }

    const detail =
        $('milAlt');

    if (!detail) {
        return;
    }

    const current =
        detail.hidden
            ? ''
            : detail.textContent.trim();

    const correctionDetail =
        details.join(' · ');

    setText(
        detail,
        current
            ? `${current} · ${correctionDetail}`
            : correctionDetail
    );

    detail.hidden = false;
}


function sphPlatformEnsureStyles() {
    if ($('sphPlatformCorrectionStyles')) {
        return;
    }

    const style =
        document.createElement('style');

    style.id =
        'sphPlatformCorrectionStyles';

    style.textContent = `
        .sph-platform-grid {
            display: grid;
            grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
            grid-template-areas:
                "hull-label arc-label"
                "hull-input arc-input";
            column-gap: 7px;
            row-gap: 4px;
            align-items: end;
        }

        .sph-hull-label-row,
        .sph-arc-label-row {
            display: grid;
            align-items: start;
            align-self: start;
            min-width: 0;
            min-height: 18px;
            margin: 0;
            padding: 0;
        }

        .sph-hull-label-row {
            grid-area: hull-label;
            grid-template-columns: minmax(0, 1fr) 18px;
            gap: 5px;
        }

        .sph-arc-label-row {
            grid-area: arc-label;
            grid-template-columns: minmax(0, 1fr);
        }

        .sph-hull-label-row > label,
        .sph-arc-label-row > label {
            display: block;
            align-self: start;
            min-width: 0;
            margin: 0 !important;
            padding: 0 !important;
            line-height: 18px;
        }

        .sph-platform-arc-label {
            min-width: 0;
        }

        .sph-platform-hull-input {
            grid-area: hull-input;
        }

        .sph-platform-arc-select {
            grid-area: arc-input;
        }

        .sph-platform-manual-label,
        .sph-platform-manual-input {
            display: none !important;
        }

        .sph-platform-hull-input,
        .sph-platform-arc-select,
        .sph-platform-manual-input {
            width: 100%;
            min-width: 0;
            box-sizing: border-box;
        }

        .sph-hull-help {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            align-self: start;
            flex: 0 0 18px;
            width: 18px;
            height: 18px;
            min-width: 18px;
            min-height: 18px;
        }

        /*
         * This is an inline help icon, not a regular form button. Keep it
         * independent from mobile/accessibility rules that enlarge buttons.
         */
        .sph-hull-help-trigger {
            display: inline-flex !important;
            align-items: center;
            justify-content: center;
            flex: 0 0 18px !important;
            box-sizing: border-box;
            width: 18px !important;
            height: 18px !important;
            min-width: 18px !important;
            min-height: 18px !important;
            max-width: 18px !important;
            max-height: 18px !important;
            margin: 0 !important;
            padding: 0 !important;
            border-radius: 50% !important;
            font-size: 11px !important;
            font-weight: 700;
            line-height: 1 !important;
            text-align: center;
            cursor: help;
        }

        /*
         * Mobile styles give every button a 42px (or accessibility 48px)
         * minimum height. The help affordance is an inline icon, not a form
         * action, so keep it compact and aligned with the label.
         */
        body.mobile-app .sph-hull-label-row > label,
        body.mobile-app .sph-arc-label-row > label {
            margin: 0 !important;
        }

        :root[data-a11y-large-controls="true"] .sph-hull-help-trigger,
        body.mobile-app .sph-hull-help-trigger {
            width: 18px !important;
            height: 18px !important;
            min-width: 18px !important;
            min-height: 18px !important;
            max-width: 18px !important;
            max-height: 18px !important;
        }

        .sph-hull-help-tooltip {
            position: fixed;
            z-index: 10000;
            left: 8px;
            top: 8px;
            width: min(310px, calc(100vw - 16px));
            max-width: calc(100vw - 16px);
            box-sizing: border-box;
            overflow-wrap: anywhere;
            padding: 8px 10px;
            border: 1px solid var(--border, #394149);
            border-radius: 6px;
            background: var(--panel, #171b1f);
            color: var(--text, #e7ecef);
            font-size: 12px;
            font-weight: 400;
            line-height: 1.35;
            box-shadow: 0 4px 18px rgba(0, 0, 0, 0.28);
            pointer-events: none;
            opacity: 0;
            visibility: hidden;
            transition: opacity 120ms ease, visibility 120ms ease;
        }

        .sph-hull-help-tooltip.is-visible {
            opacity: 1;
            visibility: visible;
        }
    `;

    document.head.appendChild(style);
}

function sphPlatformPositionHullTooltip(
    trigger,
    tooltip
) {
    if (!trigger || !tooltip) {
        return;
    }

    const viewportPadding = 8;
    const gap = 7;
    const maxWidth = 310;
    const availableWidth =
        Math.max(
            0,
            window.innerWidth -
            viewportPadding * 2
        );

    const width =
        Math.min(
            maxWidth,
            availableWidth
        );

    tooltip.style.width =
        `${width}px`;

    /*
     * visibility:hidden still participates in layout, so the tooltip can be
     * measured before hover/focus makes it visible. Position it against the
     * viewport rather than the narrow sidebar to prevent clipping/overflow.
     */
    const triggerRect =
        trigger.getBoundingClientRect();

    const tooltipRect =
        tooltip.getBoundingClientRect();

    let left =
        triggerRect.left +
        triggerRect.width / 2 -
        tooltipRect.width / 2;

    left =
        Math.max(
            viewportPadding,
            Math.min(
                left,
                window.innerWidth -
                tooltipRect.width -
                viewportPadding
            )
        );

    let top =
        triggerRect.top -
        tooltipRect.height -
        gap;

    if (top < viewportPadding) {
        top =
            triggerRect.bottom +
            gap;
    }

    top =
        Math.max(
            viewportPadding,
            Math.min(
                top,
                window.innerHeight -
                tooltipRect.height -
                viewportPadding
            )
        );

    tooltip.style.left =
        `${Math.round(left)}px`;

    tooltip.style.top =
        `${Math.round(top)}px`;
}

function sphPlatformEnsureControls() {
    sphPlatformEnsureStyles();

    if ($('sphPlatformCorrectionControls')) {
        return;
    }

    const originActions =
        $('coordinateOriginLock')
            ?.closest('.point-coordinate-actions');

    const originGrid =
        $('ox')
            ?.closest('.grid2');

    const anchor =
        originActions ||
        originGrid;

    if (!anchor) {
        return;
    }

    const controls =
        document.createElement('div');

    controls.id =
        'sphPlatformCorrectionControls';

    controls.style.marginTop =
        '8px';

    const grid =
        document.createElement('div');

    grid.className =
        'sph-platform-grid';

    const hullLabelRow =
        document.createElement('div');

    hullLabelRow.className =
        'sph-hull-label-row';

    const hullLabel =
        document.createElement('label');

    hullLabel.htmlFor =
        'sphHullHeading';

    hullLabel.id =
        'sphHullHeadingLabel';

    const hullHelp =
        document.createElement('span');

    hullHelp.className =
        'sph-hull-help';

    const hullHelpTrigger =
        document.createElement('button');

    hullHelpTrigger.id =
        'sphHullHeadingHelp';

    hullHelpTrigger.type =
        'button';

    hullHelpTrigger.className =
        'sph-hull-help-trigger';

    hullHelpTrigger.textContent =
        '?';

    const hullHelpTooltip =
        document.createElement('span');

    hullHelpTooltip.id =
        'sphHullHeadingTooltip';

    hullHelpTooltip.className =
        'sph-hull-help-tooltip';

    hullHelpTooltip.setAttribute(
        'role',
        'tooltip'
    );

    hullHelpTrigger.setAttribute(
        'aria-describedby',
        hullHelpTooltip.id
    );

    const showHullHelp = () => {
        sphPlatformPositionHullTooltip(
            hullHelpTrigger,
            hullHelpTooltip
        );

        hullHelpTooltip.classList.add(
            'is-visible'
        );
    };

    const hideHullHelp = () => {
        hullHelpTooltip.classList.remove(
            'is-visible'
        );
    };

    hullHelp.addEventListener(
        'pointerenter',
        showHullHelp
    );

    hullHelp.addEventListener(
        'pointerleave',
        hideHullHelp
    );

    hullHelp.addEventListener(
        'focusin',
        showHullHelp
    );

    hullHelp.addEventListener(
        'focusout',
        hideHullHelp
    );

    hullHelpTrigger.addEventListener(
        'click',
        event => {
            event.preventDefault();

            if (
                hullHelpTooltip.classList.contains(
                    'is-visible'
                )
            ) {
                hideHullHelp();
            } else {
                showHullHelp();
            }
        }
    );

    hullHelp.append(
        hullHelpTrigger
    );

    /*
     * Render the tooltip at document level so sidebar transforms/overflow
     * cannot clip a fixed-position tooltip.
     */
    document.body.appendChild(
        hullHelpTooltip
    );

    hullLabelRow.append(
        hullLabel,
        hullHelp
    );

    const input =
        document.createElement('input');

    input.id =
        'sphHullHeading';

    input.type =
        'number';

    input.min =
        '0';

    input.max =
        '359.9';

    input.step =
        '0.1';

    input.inputMode =
        'decimal';

    input.className =
        'sph-platform-hull-input';

    const arcLabelRow =
        document.createElement('div');

    arcLabelRow.className =
        'sph-arc-label-row';

    const arcLabel =
        document.createElement('label');

    arcLabel.htmlFor =
        'sphArcSelect';

    arcLabel.id =
        'sphArcSelectLabel';

    arcLabel.className =
        'sph-platform-arc-label';

    arcLabelRow.append(
        arcLabel
    );

    const arcSelect =
        document.createElement('select');

    arcSelect.id =
        'sphArcSelect';

    arcSelect.className =
        'sph-platform-arc-select';

    const lowOption =
        document.createElement('option');

    lowOption.value = 'low';

    const highOption =
        document.createElement('option');

    highOption.value = 'high';

    arcSelect.append(
        lowOption,
        highOption
    );

    const manualMilLabel =
        document.createElement('label');

    manualMilLabel.id =
        'sphPlatformManualMilLabel';

    manualMilLabel.htmlFor =
        'sphPlatformManualMil';

    manualMilLabel.className =
        'sph-platform-manual-label';

    const manualMilInput =
        document.createElement('input');

    manualMilInput.id =
        'sphPlatformManualMil';

    manualMilInput.type =
        'number';

    manualMilInput.min =
        '-50';

    manualMilInput.max =
        '50';

    manualMilInput.step =
        '1';

    manualMilInput.inputMode =
        'decimal';

    manualMilInput.className =
        'sph-platform-manual-input';

    grid.append(
        hullLabelRow,
        arcLabelRow,
        input,
        arcSelect,
        manualMilLabel,
        manualMilInput
    );

    const hint =
        document.createElement('p');

    hint.id =
        'sphPlatformCorrectionHint';

    hint.className =
        'hint';

    hint.style.marginBottom =
        '0';

    controls.append(
        grid,
        hint
    );

    anchor.insertAdjacentElement(
        'afterend',
        controls
    );

    input.addEventListener(
        'input',
        () => {
            const raw =
                input.value.trim();

            sphPlatformHullHeadingDeg =
                raw === ''
                    ? null
                    : sphPlatformNormalizeDegrees(
                        raw
                    );

            sphPlatformPersistHullHeading();
            sphPlatformSyncControls();
            result();
        }
    );

    input.addEventListener(
        'change',
        () => {
            if (
                Number.isFinite(
                    sphPlatformHullHeadingDeg
                )
            ) {
                input.value =
                    sphPlatformHullHeadingDeg
                        .toFixed(1)
                        .replace(/\.0$/, '');
            }
        }
    );

    arcSelect.addEventListener(
        'change',
        () => {
            sphPlatformSelectedArc =
                sphPlatformNormalizeArc(
                    arcSelect.value
                );

            sphPlatformPersistArc();
            sphPlatformSyncControls();
            result();
        }
    );

    manualMilInput.addEventListener(
        'input',
        () => {
            sphPlatformManualMilAdjustment =
                sphPlatformNormalizeManualMilAdjustment(
                    manualMilInput.value
                );

            sphPlatformPersistManualMilAdjustment();
            sphPlatformSyncControls();
            result();
        }
    );

    manualMilInput.addEventListener(
        'change',
        () => {
            manualMilInput.value =
                Math.abs(sphPlatformManualMilAdjustment) < 1e-9
                    ? '0'
                    : String(sphPlatformManualMilAdjustment);
        }
    );
}

function sphPlatformSyncControls() {
    const controls =
        $('sphPlatformCorrectionControls');

    const input =
        $('sphHullHeading');

    const hullLabel =
        $('sphHullHeadingLabel');

    const hullHelpTrigger =
        $('sphHullHeadingHelp');

    const hullHelpTooltip =
        $('sphHullHeadingTooltip');

    const arcSelect =
        $('sphArcSelect');

    const arcLabel =
        $('sphArcSelectLabel');

    const manualMilLabel =
        $('sphPlatformManualMilLabel');

    const manualMilInput =
        $('sphPlatformManualMil');

    const hint =
        $('sphPlatformCorrectionHint');

    if (
        !controls ||
        !input ||
        !arcSelect ||
        !manualMilInput
    ) {
        return;
    }

    const visible =
        S.weapon ===
        SPH_PLATFORM_CORRECTION.weaponId;

    controls.hidden =
        !visible;

    if (!visible) {
        return;
    }

    const labels =
        sphPlatformLabels();

    if (hullLabel) {
        hullLabel.textContent =
            labels.hullDirection;
    }

    if (hullHelpTooltip) {
        hullHelpTooltip.textContent =
            labels.hullHelp;
    }

    if (hullHelpTrigger) {
        hullHelpTrigger.setAttribute(
            'aria-label',
            labels.hullHelp
        );

        /* Avoid the browser-native title tooltip duplicating the custom one. */
        hullHelpTrigger.removeAttribute(
            'title'
        );
    }

    if (arcLabel) {
        arcLabel.textContent =
            labels.arc;
    }

    if (manualMilLabel) {
        manualMilLabel.textContent =
            labels.manualMil;
    }

    const lowOption =
        arcSelect.querySelector(
            'option[value="low"]'
        );

    const highOption =
        arcSelect.querySelector(
            'option[value="high"]'
        );

    if (lowOption) {
        lowOption.textContent =
            tr('lowArc');
    }

    if (highOption) {
        highOption.textContent =
            tr('highArc');
    }

    if (
        arcSelect.value !==
        sphPlatformSelectedArc
    ) {
        arcSelect.value =
            sphPlatformSelectedArc;
    }

    input.placeholder =
        labels.placeholder;

    const expectedValue =
        Number.isFinite(
            sphPlatformHullHeadingDeg
        )
            ? sphPlatformHullHeadingDeg
                .toFixed(1)
                .replace(/\.0$/, '')
            : '';

    if (
        document.activeElement !== input &&
        input.value !== expectedValue
    ) {
        input.value =
            expectedValue;
    }

    const expectedManualMil =
        Math.abs(sphPlatformManualMilAdjustment) < 1e-9
            ? '0'
            : String(sphPlatformManualMilAdjustment);

    if (
        document.activeElement !== manualMilInput &&
        manualMilInput.value !== expectedManualMil
    ) {
        manualMilInput.value =
            expectedManualMil;
    }

    if (hint) {
        hint.textContent =
            sphPlatformCorrectionIsActive()
                ? labels.active
                : labels.inactive;
    }
}

function initSphPlatformCorrection() {
    if (sphPlatformCorrectionInitialized) {
        return;
    }

    sphPlatformCorrectionInitialized =
        true;

    sphPlatformLoadHullHeading();
    sphPlatformLoadArc();
    sphPlatformLoadManualMilAdjustment();
    sphPlatformEnsureControls();

    const originalResolveElevationSolutions =
        resolveElevationSolutions;

    resolveElevationSolutions = function(
        weapon,
        distanceMeters,
        solutions
    ) {
        const baseResolved =
            originalResolveElevationSolutions(
                weapon,
                distanceMeters,
                solutions
            );

        let resolvedSolutions =
            sphPlatformSelectArcSolutions(
                baseResolved.solutions
            );

        sphPlatformLastAimMeta =
            null;

        const targetAzimuthDeg =
            sphPlatformGetTargetAzimuth();

        if (
            sphPlatformCorrectionIsActive(
                weapon
            ) &&
            Number.isFinite(targetAzimuthDeg)
        ) {
            const corrected =
                sphPlatformCorrectSolutionSet(
                    resolvedSolutions,
                    targetAzimuthDeg
                );

            resolvedSolutions =
                corrected.solutions;

            sphPlatformLastAimMeta =
                corrected.aim;
        }

        resolvedSolutions =
            sphPlatformApplyManualMilToSolutionSet(
                resolvedSolutions
            );

        return {
            ...baseResolved,
            solutions:
                resolvedSolutions,
            platformHeadingCorrection: {
                hullHeadingDeg:
                    sphPlatformHullHeadingDeg,
                baselinePitchDeg:
                    SPH_PLATFORM_CORRECTION.baselinePitchDeg,
                baselineRollDeg:
                    SPH_PLATFORM_CORRECTION.baselineRollDeg,
                manualMilAdjustment:
                    sphPlatformManualMilAdjustment,
                aim:
                    sphPlatformLastAimMeta
            }
        };
    };

    const originalResult =
        result;

    result = function() {
        sphPlatformLastAimMeta =
            null;

        originalResult();

        sphPlatformRenderCorrectedAim();
        sphPlatformSyncControls();
    };

    $('weapon')
        ?.addEventListener(
            'change',
            () => {
                sphPlatformSyncControls();
                result();
            }
        );

    sphPlatformSyncControls();
}
