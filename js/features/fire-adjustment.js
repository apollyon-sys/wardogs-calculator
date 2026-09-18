/* =========================
   FIRE ADJUSTMENT
   ========================= */

/*
 * Closes the observe -> correct loop. A miss is entered either as a
 * correction relative to the artillery -> target line ("add 50, right 20",
 * as seen from the artillery position) or as the observed impact point.
 * Either way the aim point moves by the inverse of the miss, through the
 * same snapshot -> mutate -> clamp -> inputs() path as every other target
 * writer, so undo, persistence, locks and lobby presence need no extra work.
 */

const FIRE_ADJUSTMENT_FEEDBACK_DELAY = 1100;

const FIRE_ADJUSTMENT_STATE = {
    /* One-shot map pick armed by "Mark impact on map". */
    picking: false,

    /*
     * Last applied correction, kept for the map overlay and the status line.
     * Cleared as soon as the target moves by any other means.
     */
    last: null
};

/*
 * Unit vectors of the artillery -> target line in world units.
 * `along` points from the artillery towards the target, `right` is the
 * clockwise perpendicular, i.e. to the right when looking from the artillery
 * at the target. With +X east and +Y north that is (dy, -dx).
 * A zero-length line falls back to north/east, which matches the 0° azimuth
 * the result panel shows for that case.
 */
function fireAdjustmentAxes() {
    const dx =
        S.target.x -
        S.origin.x;

    const dy =
        S.target.y -
        S.origin.y;

    const length =
        Math.hypot(dx, dy);

    if (length === 0) {
        return {
            along: { x: 0, y: 1 },
            right: { x: 1, y: 0 }
        };
    }

    return {
        along: {
            x: dx / length,
            y: dy / length
        },
        right: {
            x: dy / length,
            y: -dx / length
        }
    };
}

function fireAdjustmentNumberInput(id) {
    const input = $(id);

    if (!input) {
        return 0;
    }

    const value =
        Number(
            String(input.value)
                .replace(',', '.')
        );

    return Number.isFinite(value)
        ? Math.abs(value)
        : 0;
}

/*
 * Reads the correction panel as signed meters:
 * positive range = add (farther), positive deflection = right.
 */
function readFireAdjustmentCorrection() {
    const range =
        fireAdjustmentNumberInput('fireAdjustmentRange');

    const deflection =
        fireAdjustmentNumberInput('fireAdjustmentDeflection');

    const rangeSign =
        $('fireAdjustmentRangeDirection')?.value === 'drop'
            ? -1
            : 1;

    const deflectionSign =
        $('fireAdjustmentDeflectionDirection')?.value === 'left'
            ? -1
            : 1;

    return {
        rangeMeters: range * rangeSign,
        deflectionMeters: deflection * deflectionSign
    };
}

/*
 * Moves the target by a world-unit delta. Returns false when nothing
 * changed so callers can skip feedback and history.
 * The status line is derived from the delta that was actually applied,
 * so a correction truncated by the map bounds is reported truthfully.
 */
function shiftFireAdjustmentTarget(delta, mode, impact) {
    if (
        !Number.isFinite(delta.x) ||
        !Number.isFinite(delta.y) ||
        (delta.x === 0 && delta.y === 0)
    ) {
        return false;
    }

    const axes =
        fireAdjustmentAxes();

    const previousTarget = {
        x: S.target.x,
        y: S.target.y
    };

    pushMapToolHistory();

    S.target = {
        x: previousTarget.x + delta.x,
        y: previousTarget.y + delta.y
    };

    clamp(S.target);

    const appliedX =
        S.target.x - previousTarget.x;

    const appliedY =
        S.target.y - previousTarget.y;

    FIRE_ADJUSTMENT_STATE.last = {
        mode,
        impact,
        rangeMeters:
            worldDistanceToMeters(
                appliedX * axes.along.x +
                appliedY * axes.along.y
            ),
        deflectionMeters:
            worldDistanceToMeters(
                appliedX * axes.right.x +
                appliedY * axes.right.y
            ),
        mapId: S.map,
        previousTarget,
        appliedTarget: {
            x: S.target.x,
            y: S.target.y
        }
    };

    if (
        typeof requestTerrainBallisticsForCurrentState ===
            'function'
    ) {
        requestTerrainBallisticsForCurrentState();
    }

    inputs();

    renderSavedTargets();

    if (
        typeof trackAnalytics ===
        'function'
    ) {
        trackAnalytics(
            'fire-adjusted',
            {
                map: S.map,
                weapon: S.weapon,
                mode
            }
        );
    }

    return true;
}

function applyFireAdjustmentCorrection() {
    const {
        rangeMeters,
        deflectionMeters
    } = readFireAdjustmentCorrection();

    if (
        rangeMeters === 0 &&
        deflectionMeters === 0
    ) {
        flashFireAdjustmentButton(
            'fireAdjustmentApply',
            'fireAdjustmentNoChange',
            'fireAdjustmentApply'
        );
        return false;
    }

    const axes =
        fireAdjustmentAxes();

    const along =
        metersToWorldDistance(rangeMeters);

    const right =
        metersToWorldDistance(deflectionMeters);

    const applied =
        shiftFireAdjustmentTarget(
            {
                x: axes.along.x * along + axes.right.x * right,
                y: axes.along.y * along + axes.right.y * right
            },
            'correction',
            null
        );

    if (applied) {
        if ($('fireAdjustmentRange')) {
            $('fireAdjustmentRange').value = '';
        }

        if ($('fireAdjustmentDeflection')) {
            $('fireAdjustmentDeflection').value = '';
        }

        flashFireAdjustmentButton(
            'fireAdjustmentApply',
            'fireAdjustmentApplied',
            'fireAdjustmentApply'
        );
    }

    return applied;
}

/*
 * The round landed at `impact` while aiming at the current target, so the
 * aim point moves by (target - impact).
 */
function applyFireAdjustmentImpact(impact) {
    return shiftFireAdjustmentTarget(
        {
            x: S.target.x - impact.x,
            y: S.target.y - impact.y
        },
        'impact',
        {
            x: impact.x,
            y: impact.y
        }
    );
}

/*
 * Shared coordinates arrive in the same units as the coordinate inputs:
 * game units on 100 m/unit maps, meters everywhere else (see inputPoint).
 */
function sharedCoordinatesToWorld(coordinates) {
    const scale =
        getCoordinateMetersPerUnit();

    return scale === 100
        ? { x: coordinates.x, y: coordinates.y }
        : {
            x: coordinates.x / 1000,
            y: coordinates.y / 1000
        };
}

async function pasteFireAdjustmentImpact() {
    const text =
        await readCoordinateClipboard();

    if (text === null) {
        return;
    }

    const coordinates =
        parseSharedCoordinates(text);

    if (!coordinates) {
        flashFireAdjustmentButton(
            'fireAdjustmentPasteImpact',
            'invalidCoordinates',
            'fireAdjustmentPasteImpact'
        );
        return;
    }

    const impact =
        sharedCoordinatesToWorld(coordinates);

    if (!isWorldPointInsideMap(impact)) {
        flashFireAdjustmentButton(
            'fireAdjustmentPasteImpact',
            'invalidCoordinates',
            'fireAdjustmentPasteImpact'
        );
        return;
    }

    if (applyFireAdjustmentImpact(impact)) {
        flashFireAdjustmentButton(
            'fireAdjustmentPasteImpact',
            'fireAdjustmentApplied',
            'fireAdjustmentPasteImpact'
        );
    }
}


/* =========================
   MAP PICK
   ========================= */

function isFireAdjustmentPickArmed() {
    return FIRE_ADJUSTMENT_STATE.picking;
}

function setFireAdjustmentPick(armed) {
    const next =
        Boolean(armed);

    if (FIRE_ADJUSTMENT_STATE.picking === next) {
        return;
    }

    FIRE_ADJUSTMENT_STATE.picking = next;

    if (
        next &&
        typeof setMobileSheetOpen === 'function'
    ) {
        /* The map has to be visible to tap on it. */
        setMobileSheetOpen(false);
    }

    updateFireAdjustmentUI();
}

function cancelFireAdjustmentPick() {
    if (!FIRE_ADJUSTMENT_STATE.picking) {
        return false;
    }

    setFireAdjustmentPick(false);
    return true;
}

/*
 * Called from the canvas pointer handlers with the world point under the
 * pointer. Returns true when the event was consumed by the pick, so the
 * caller must not place a point or start a drag.
 */
function handleFireAdjustmentMapPick(world) {
    if (!FIRE_ADJUSTMENT_STATE.picking) {
        return false;
    }

    if (
        !world ||
        !isWorldPointInsideMap(world)
    ) {
        return true;
    }

    setFireAdjustmentPick(false);

    applyFireAdjustmentImpact(world);

    return true;
}


/* =========================
   UI
   ========================= */

function flashFireAdjustmentButton(
    buttonId,
    key,
    restoreKey
) {
    const button = $(buttonId);

    if (!button) {
        return;
    }

    button.textContent = tr(key);

    window.setTimeout(
        () => {
            if (!button.isConnected) {
                return;
            }

            button.textContent = tr(restoreKey);
        },
        FIRE_ADJUSTMENT_FEEDBACK_DELAY
    );
}

function formatFireAdjustmentSummary(last) {
    const parts = [];

    const range =
        Math.round(Math.abs(last.rangeMeters));

    const deflection =
        Math.round(Math.abs(last.deflectionMeters));

    if (range > 0) {
        parts.push(
            `${tr(
                last.rangeMeters > 0
                    ? 'fireAdjustmentAdd'
                    : 'fireAdjustmentDrop'
            )} ${range} m`
        );
    }

    if (deflection > 0) {
        parts.push(
            `${tr(
                last.deflectionMeters > 0
                    ? 'fireAdjustmentRight'
                    : 'fireAdjustmentLeft'
            )} ${deflection} m`
        );
    }

    if (!parts.length) {
        parts.push(
            `${tr('fireAdjustmentAdd')} 0 m`
        );
    }

    return parts.join(' · ');
}

/*
 * The overlay and status line describe the current target only while the
 * target is still where the correction put it.
 */
function getActiveFireAdjustment() {
    const last =
        FIRE_ADJUSTMENT_STATE.last;

    if (!last) {
        return null;
    }

    if (
        last.mapId !== S.map ||
        last.appliedTarget.x !== S.target.x ||
        last.appliedTarget.y !== S.target.y
    ) {
        FIRE_ADJUSTMENT_STATE.last = null;
        return null;
    }

    return last;
}

function ensureFireAdjustmentBanner() {
    let banner =
        $('fireAdjustmentBanner');

    if (banner) {
        return banner;
    }

    const map =
        document.querySelector('.map');

    if (!map) {
        return null;
    }

    banner =
        document.createElement('div');

    banner.id =
        'fireAdjustmentBanner';

    banner.className =
        'fire-adjustment-banner';

    banner.hidden = true;

    banner.setAttribute(
        'role',
        'status'
    );

    const text =
        document.createElement('span');

    text.className =
        'fire-adjustment-banner-text';

    const cancel =
        document.createElement('button');

    cancel.type =
        'button';

    cancel.className =
        'fire-adjustment-banner-cancel';

    cancel.addEventListener(
        'click',
        () => cancelFireAdjustmentPick()
    );

    banner.append(
        text,
        cancel
    );

    map.appendChild(banner);

    return banner;
}

function updateFireAdjustmentUI() {
    const picking =
        FIRE_ADJUSTMENT_STATE.picking;

    const pickButton =
        $('fireAdjustmentPick');

    if (pickButton) {
        pickButton.classList.toggle(
            'active',
            picking
        );

        pickButton.setAttribute(
            'aria-pressed',
            picking
                ? 'true'
                : 'false'
        );
    }

    const banner =
        ensureFireAdjustmentBanner();

    if (banner) {
        if (banner.hidden === picking) {
            banner.hidden = !picking;
        }

        if (picking) {
            setText(
                banner.querySelector('.fire-adjustment-banner-text'),
                tr('fireAdjustmentPickHint')
            );

            setText(
                banner.querySelector('.fire-adjustment-banner-cancel'),
                tr('fireAdjustmentPickCancel')
            );
        }
    }

    const status =
        $('fireAdjustmentLast');

    if (status) {
        const last =
            getActiveFireAdjustment();

        if (last) {
            setText(
                status,
                `${tr('fireAdjustmentLast')}: ${formatFireAdjustmentSummary(last)}`
            );
        }

        if (status.hidden !== !last) {
            status.hidden = !last;
        }
    }
}

function bindFireAdjustment() {
    $('fireAdjustmentApply')
        ?.addEventListener(
            'click',
            applyFireAdjustmentCorrection
        );

    [
        'fireAdjustmentRange',
        'fireAdjustmentDeflection'
    ].forEach(
        id => {
            $(id)?.addEventListener(
                'keydown',
                event => {
                    if (event.key === 'Enter') {
                        event.preventDefault();
                        applyFireAdjustmentCorrection();
                    }
                }
            );
        }
    );

    $('fireAdjustmentPick')
        ?.addEventListener(
            'click',
            () => setFireAdjustmentPick(
                !FIRE_ADJUSTMENT_STATE.picking
            )
        );

    $('fireAdjustmentPasteImpact')
        ?.addEventListener(
            'click',
            pasteFireAdjustmentImpact
        );

    updateFireAdjustmentUI();
}


/* =========================
   MAP OVERLAY
   ========================= */

/*
 * Ghost of the previous aim point, the observed impact when one was marked,
 * and the shift that the correction applied. Drawn between the artillery
 * markers and the preset icons.
 */
function drawFireAdjustmentOverlay() {
    const last =
        getActiveFireAdjustment();

    if (!last) {
        return;
    }

    const previous =
        worldToLocalScreen(
            last.previousTarget.x,
            last.previousTarget.y
        );

    const current =
        worldToLocalScreen(
            S.target.x,
            S.target.y
        );

    ctx.save();

    ctx.strokeStyle =
        'rgba(216,102,102,.85)';

    ctx.lineWidth =
        1.5;

    ctx.setLineDash([
        3,
        4
    ]);

    ctx.beginPath();

    if (last.impact) {
        const impact =
            worldToLocalScreen(
                last.impact.x,
                last.impact.y
            );

        ctx.moveTo(
            impact.x,
            impact.y
        );

        ctx.lineTo(
            previous.x,
            previous.y
        );
    }

    ctx.moveTo(
        previous.x,
        previous.y
    );

    ctx.lineTo(
        current.x,
        current.y
    );

    ctx.stroke();

    ctx.setLineDash([]);

    /* Previous aim point: hollow ring. */
    ctx.beginPath();

    ctx.arc(
        previous.x,
        previous.y,
        7,
        0,
        Math.PI * 2
    );

    ctx.stroke();

    if (last.impact) {
        const impact =
            worldToLocalScreen(
                last.impact.x,
                last.impact.y
            );

        /* Impact: cross with a label. */
        ctx.lineWidth =
            2;

        ctx.beginPath();

        ctx.moveTo(
            impact.x - 6,
            impact.y - 6
        );

        ctx.lineTo(
            impact.x + 6,
            impact.y + 6
        );

        ctx.moveTo(
            impact.x + 6,
            impact.y - 6
        );

        ctx.lineTo(
            impact.x - 6,
            impact.y + 6
        );

        ctx.stroke();

        ctx.fillStyle =
            'rgba(216,102,102,.95)';

        const labelScale =
            typeof getMapLabelAccessibilityScale === 'function'
                ? getMapLabelAccessibilityScale()
                : 1;

        ctx.font =
            `bold ${10 * labelScale}px system-ui`;

        ctx.textAlign =
            'center';

        ctx.textBaseline =
            'top';

        ctx.fillText(
            tr('fireAdjustmentImpactLabel'),
            impact.x,
            impact.y + 9
        );
    }

    ctx.restore();
}
