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

const FIRE_ADJUSTMENT_DEFAULT_STEP = 50;

/* A single correction is capped well beyond any in-game engagement range. */
const FIRE_ADJUSTMENT_MAX_STEP = 100000;

const FIRE_ADJUSTMENT_STATE = {
    /* One-shot map pick armed by "Mark impact on map". */
    picking: false,

    /* Distance one arrow press adds to the staged correction, in meters. */
    step: FIRE_ADJUSTMENT_DEFAULT_STEP,

    /*
     * Correction staged by the arrow pad, in meters, positive = add / right.
     * Arrow presses accumulate here so that a combined correction such as
     * "add 50, right 20" is built up before it is committed by Apply.
     */
    draft: {
        rangeMeters: 0,
        deflectionMeters: 0
    },

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

/*
 * Step distance currently typed into the centre of the arrow pad. The state
 * copy survives popover rebuilds (language switch, first open).
 */
function readFireAdjustmentStep() {
    const input =
        $('fireAdjustmentStep');

    if (!input) {
        return FIRE_ADJUSTMENT_STATE.step;
    }

    const value =
        Number(
            String(input.value)
                .replace(',', '.')
        );

    if (
        !Number.isFinite(value) ||
        value <= 0
    ) {
        return 0;
    }

    return Math.min(
        Math.abs(value),
        FIRE_ADJUSTMENT_MAX_STEP
    );
}

/*
 * Staged correction in signed meters:
 * positive range = add (farther), positive deflection = right.
 */
function readFireAdjustmentCorrection() {
    return {
        rangeMeters:
            FIRE_ADJUSTMENT_STATE.draft.rangeMeters,
        deflectionMeters:
            FIRE_ADJUSTMENT_STATE.draft.deflectionMeters
    };
}

function clearFireAdjustmentDraft() {
    FIRE_ADJUSTMENT_STATE.draft = {
        rangeMeters: 0,
        deflectionMeters: 0
    };

    updateFireAdjustmentUI();
}

/*
 * One arrow press. `axis` is 'range' (add/drop) or 'deflection'
 * (right/left), `sign` is +1 for add/right. Presses accumulate, so the
 * opposite arrow walks the staged value back and ↑↑ stages two steps.
 */
function nudgeFireAdjustment(axis, sign) {
    const step =
        readFireAdjustmentStep();

    if (!step) {
        $('fireAdjustmentStep')?.focus();
        return;
    }

    FIRE_ADJUSTMENT_STATE.step = step;

    const key =
        axis === 'range'
            ? 'rangeMeters'
            : 'deflectionMeters';

    const next =
        FIRE_ADJUSTMENT_STATE.draft[key] +
        sign * step;

    FIRE_ADJUSTMENT_STATE.draft[key] =
        Math.max(
            -FIRE_ADJUSTMENT_MAX_STEP,
            Math.min(
                FIRE_ADJUSTMENT_MAX_STEP,
                next
            )
        );

    updateFireAdjustmentUI();
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
        clearFireAdjustmentDraft();

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
 * aim point moves by (target - impact). A measured impact supersedes
 * anything staged on the arrow pad, so the staged correction is dropped.
 */
function applyFireAdjustmentImpact(impact) {
    const applied =
        shiftFireAdjustmentTarget(
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

    if (applied) {
        clearFireAdjustmentDraft();
    }

    return applied;
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

/*
 * Toolbar button and popover are injected at runtime, the way the shape and
 * history tools are, so the feature needs no markup in the page shells.
 */
function ensureFireAdjustmentTool() {
    const bar =
        document.querySelector(
            '.map-tools-bar'
        );

    if (!bar) {
        return null;
    }

    let popover =
        $('fireAdjustmentPopover');

    if (!popover) {
        popover =
            document.createElement('div');

        popover.id =
            'fireAdjustmentPopover';

        popover.className =
            'map-tool-popover map-tool-fire-adjustment';

        bar.before(popover);
    }

    if (!$('mapToolFireAdjustment')) {
        const button =
            document.createElement('button');

        button.type = 'button';

        button.id =
            'mapToolFireAdjustment';

        button.className =
            'map-tool-button';

        button.dataset.tool =
            'fireAdjust';

        button.innerHTML = `
            <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                width="18"
                height="18"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
            >
                <circle cx="10" cy="14" r="5.5"/>
                <path d="M10 6v2.5M10 19.5V17M2.5 14H5M17.5 14H15"/>
                <path d="m14.5 9.5 5-5"/>
                <path d="M15.5 4h4v4"/>
            </svg>
        `;

        button.addEventListener(
            'click',
            event => {
                event.stopPropagation();
                toggleFireAdjustmentTool();
            }
        );

        bar.insertBefore(
            button,
            $('mapToolCoordinateSearch') ||
            null
        );
    }

    return popover;
}

function createFireAdjustmentNudge(
    axis,
    sign,
    direction,
    glyph
) {
    const button =
        document.createElement('button');

    button.type = 'button';

    button.className =
        `fire-adjustment-nudge fire-adjustment-nudge-${direction}`;

    button.dataset.axis = axis;

    button.dataset.sign =
        String(sign);

    const label =
        tr(
            `fireAdjustment${
                direction.charAt(0).toUpperCase()
            }${
                direction.slice(1)
            }`
        );

    button.setAttribute(
        'aria-label',
        label
    );

    button.title = label;

    button.innerHTML = `
        <span class="fire-adjustment-nudge-glyph" aria-hidden="true">${glyph}</span>
        <span class="fire-adjustment-nudge-label"></span>
    `;

    setText(
        button.querySelector('.fire-adjustment-nudge-label'),
        label
    );

    button.addEventListener(
        'click',
        event => {
            event.stopPropagation();

            nudgeFireAdjustment(
                axis,
                sign
            );
        }
    );

    return button;
}

function createFireAdjustmentStepField() {
    const input =
        document.createElement('input');

    input.id =
        'fireAdjustmentStep';

    input.className =
        'fire-adjustment-step';

    input.type = 'number';
    input.min = '0';
    input.step = '1';
    input.inputMode = 'decimal';

    input.value =
        String(
            FIRE_ADJUSTMENT_STATE.step
        );

    const label =
        tr('fireAdjustmentStep');

    input.setAttribute(
        'aria-label',
        label
    );

    input.title = label;

    input.addEventListener(
        'input',
        () => {
            const step =
                readFireAdjustmentStep();

            if (step) {
                FIRE_ADJUSTMENT_STATE.step =
                    step;
            }
        }
    );

    input.addEventListener(
        'keydown',
        event => {
            if (event.key === 'Enter') {
                event.preventDefault();
                applyFireAdjustmentCorrection();
            }
        }
    );

    const field =
        document.createElement('div');

    field.className =
        'fire-adjustment-step-field';

    const unit =
        document.createElement('span');

    unit.className =
        'fire-adjustment-step-unit';

    unit.setAttribute(
        'aria-hidden',
        'true'
    );

    unit.textContent = 'm';

    field.append(
        input,
        unit
    );

    return field;
}

function createFireAdjustmentButton(
    id,
    key,
    className,
    handler
) {
    const button =
        document.createElement('button');

    button.type = 'button';
    button.id = id;

    if (className) {
        button.className = className;
    }

    setText(
        button,
        tr(key)
    );

    button.addEventListener(
        'click',
        event => {
            event.stopPropagation();
            handler();
        }
    );

    return button;
}

/*
 * Rebuilt on language change, like the other map-tool popovers.
 */
function buildFireAdjustmentPopover() {
    const popover =
        ensureFireAdjustmentTool();

    if (!popover) {
        return;
    }

    popover.replaceChildren();

    const title =
        document.createElement('div');

    title.className =
        'map-tool-popover-title';

    setText(
        title,
        tr('fireAdjustment')
    );

    /*
     * The pad reads like a fire order: the vertical axis is range, the
     * horizontal one deflection, and the centre holds the distance that one
     * arrow press stages.
     */
    const pad =
        document.createElement('div');

    pad.className =
        'fire-adjustment-pad';

    pad.setAttribute(
        'role',
        'group'
    );

    pad.setAttribute(
        'aria-label',
        tr('fireAdjustment')
    );

    pad.append(
        createFireAdjustmentNudge(
            'range',
            1,
            'add',
            '&#8593;'
        ),
        createFireAdjustmentNudge(
            'deflection',
            -1,
            'left',
            '&#8592;'
        ),
        createFireAdjustmentStepField(),
        createFireAdjustmentNudge(
            'deflection',
            1,
            'right',
            '&#8594;'
        ),
        createFireAdjustmentNudge(
            'range',
            -1,
            'drop',
            '&#8595;'
        )
    );

    const draft =
        document.createElement('div');

    draft.id =
        'fireAdjustmentDraft';

    draft.className =
        'fire-adjustment-draft';

    draft.hidden = true;

    const draftText =
        document.createElement('span');

    draftText.className =
        'fire-adjustment-draft-text';

    const clearLabel =
        tr('fireAdjustmentClear');

    const draftClear =
        createFireAdjustmentButton(
            'fireAdjustmentClear',
            'fireAdjustmentClear',
            'fire-adjustment-draft-clear',
            clearFireAdjustmentDraft
        );

    /* Icon-only button: the label lives in the accessible name. */
    draftClear.innerHTML =
        '<span aria-hidden="true">&#10005;</span>';

    draftClear.setAttribute(
        'aria-label',
        clearLabel
    );

    draftClear.title =
        clearLabel;

    draft.append(
        draftText,
        draftClear
    );

    const impactActions =
        document.createElement('div');

    impactActions.className =
        'fire-adjustment-impact-actions';

    const pick =
        createFireAdjustmentButton(
            'fireAdjustmentPick',
            'fireAdjustmentMarkImpact',
            '',
            () => setFireAdjustmentPick(
                !FIRE_ADJUSTMENT_STATE.picking
            )
        );

    pick.setAttribute(
        'aria-pressed',
        'false'
    );

    impactActions.append(
        pick,
        createFireAdjustmentButton(
            'fireAdjustmentPasteImpact',
            'fireAdjustmentPasteImpact',
            '',
            pasteFireAdjustmentImpact
        )
    );

    const status =
        document.createElement('div');

    status.id =
        'fireAdjustmentLast';

    status.className =
        'hint fire-adjustment-last';

    status.hidden = true;

    const hint =
        document.createElement('p');

    hint.className = 'hint';

    setText(
        hint,
        tr('fireAdjustmentHint')
    );

    popover.append(
        title,
        pad,
        draft,
        createFireAdjustmentButton(
            'fireAdjustmentApply',
            'fireAdjustmentApply',
            'fire-adjustment-apply',
            applyFireAdjustmentCorrection
        ),
        impactActions,
        status,
        hint
    );

    updateFireAdjustmentUI();
}

/*
 * Opening the tool arms the impact pick, because the usual sequence right
 * after a shot is "open, click where it landed". Closing it disarms again;
 * the pad stays usable while the pick is armed.
 */
function toggleFireAdjustmentTool() {
    MAP_TOOL_STATE.tool =
        'fireAdjust';

    buildFireAdjustmentPopover();

    toggleMapToolMenu(
        'fireAdjustmentPopover'
    );

    setFireAdjustmentPick(
        isMapToolMenuOpen(
            'fireAdjustmentPopover'
        )
    );
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

    const drafted =
        FIRE_ADJUSTMENT_STATE.draft;

    const staged =
        drafted.rangeMeters !== 0 ||
        drafted.deflectionMeters !== 0;

    const draftLine =
        $('fireAdjustmentDraft');

    if (draftLine) {
        if (staged) {
            setText(
                draftLine.querySelector('.fire-adjustment-draft-text'),
                `${tr('fireAdjustmentPending')}: ${formatFireAdjustmentSummary(drafted)}`
            );
        }

        if (draftLine.hidden !== !staged) {
            draftLine.hidden = !staged;
        }
    }

    document
        .querySelectorAll('.fire-adjustment-nudge')
        .forEach(button => {
            const value =
                button.dataset.axis === 'range'
                    ? drafted.rangeMeters
                    : drafted.deflectionMeters;

            const active =
                value !== 0 &&
                Math.sign(value) ===
                Number(button.dataset.sign);

            button.classList.toggle(
                'active',
                active
            );
        });

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
    buildFireAdjustmentPopover();
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
