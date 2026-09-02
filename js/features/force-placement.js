/* =========================
   FORCE PLACEMENT MODE
   ========================= */

/*
 * When enabled, a map click always places the point selected
 * in Point selection instead of grabbing whichever marker
 * happens to be nearest to the click.
 *
 * The pin on each Artillery/Target button both selects that
 * point and forces it, so pinning is a single click.
 */
let FORCE_PLACEMENT = false;

function isForcePlacementEnabled() {
    return FORCE_PLACEMENT;
}

function setForcePlacement(enabled) {
    FORCE_PLACEMENT =
        Boolean(enabled);

    updateForcePlacementUI();
}

/*
 * Pinning a point selects it and forces it in one click.
 * Clicking the pin of the already-forced point releases it.
 */
function toggleForcePlacementFor(type) {

    if (
        !(type in POINT_MAP_LOCKS)
    ) {
        return;
    }

    if (
        isForcePlacementEnabled() &&
        S.mode === type
    ) {
        setForcePlacement(false);
        return;
    }

    setPointMode(type);
    setForcePlacement(true);
}

function updateForcePlacementUI() {

    [
        ['origin', 'originForcePin'],
        ['target', 'targetForcePin']
    ].forEach(
        ([type, pinId]) => {

            const pin = $(pinId);

            if (!pin) {
                return;
            }

            const pinned =
                isForcePlacementEnabled() &&
                S.mode === type;

            pin.classList.toggle(
                'active',
                pinned
            );

            pin.setAttribute(
                'aria-pressed',
                pinned
                    ? 'true'
                    : 'false'
            );

            pin.title = tr(
                pinned
                    ? 'forcePlacementHintActive'
                    : 'forcePlacementHint'
            );
        }
    );
}
