/* =========================
   INPUTS
   ========================= */

function inputs() {

    $('mapSelect').value =
        S.map;

    $('weapon').value =
        S.weapon;

    $('ox').value = formatGameCoordinate(S.origin.x);

    $('oy').value = formatGameCoordinate(S.origin.y);

    $('tx').value = formatGameCoordinate(S.target.x);

    $('ty').value = formatGameCoordinate(S.target.y);

    const coordinateSummary = $('coordinateSectionSummary');

    if (coordinateSummary) {
        coordinateSummary.textContent =
            `${formatGameCoordinate(S.origin.x)}, ${formatGameCoordinate(S.origin.y)} → ` +
            `${formatGameCoordinate(S.target.x)}, ${formatGameCoordinate(S.target.y)}`;
    }

    /*
     * Origin and target are written from six different places (map drags,
     * the coordinate inputs, saved-target restore, undo, coordinate
     * search). They all land here, so one throttled write covers them all
     * instead of a hook at each site.
     */
    if (
        typeof persistMapPoints ===
        'function'
    ) {
        persistMapPoints();
    }

    /*
     * The saved-target highlight is derived from where the target sits,
     * so every writer of S.target refreshes it by arriving here.
     */
    if (
        typeof refreshSavedTargetHighlight ===
        'function'
    ) {
        refreshSavedTargetHighlight();
    }

    /*
     * The last-correction line and ghost overlay only describe the target
     * while it still sits where the correction put it.
     */
    if (
        typeof updateFireAdjustmentUI ===
        'function'
    ) {
        updateFireAdjustmentUI();
    }

    result();
    draw();
}

function inputPoint(type) {

    if (
        typeof requestTerrainBallisticsForCurrentState ===
            'function'
    ) {
        requestTerrainBallisticsForCurrentState();
    }

    const p =
        S[type];

    const xInput =
        type === 'origin'
            ? $('ox')
            : $('tx');

    const yInput =
        type === 'origin'
            ? $('oy')
            : $('ty');

    const coordinateScale =
        getCoordinateMetersPerUnit();

    const nextX =
        coordinateScale === 100
            ? (Number(xInput.value) || 0)
            : (Number(xInput.value) || 0) / 1000;

    const nextY =
        coordinateScale === 100
            ? (Number(yInput.value) || 0)
            : (Number(yInput.value) || 0) / 1000;

    if (
        nextX !== p.x ||
        nextY !== p.y
    ) {
        pushMapToolHistory();
    }

    p.x = nextX;
    p.y = nextY;

    clamp(
        p
    );

    inputs();
}
