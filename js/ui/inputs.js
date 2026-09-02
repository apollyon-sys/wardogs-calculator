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

    $('w').value =
        S.w;

    $('h').value =
        S.h;

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

    result();
    draw();
}

function setPointMode(type) {

    if (
        type !== 'origin' &&
        type !== 'target'
    ) {
        return;
    }

    S.mode =
        type;

    $('originMode')
        ?.classList.toggle(
            'active',
            type === 'origin'
        );

    $('targetMode')
        ?.classList.toggle(
            'active',
            type === 'target'
        );

    if (
        typeof updateForcePlacementUI ===
        'function'
    ) {
        updateForcePlacementUI();
    }
}

function inputPoint(type) {

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

function updatePresetLock() {

    const locked =
        $('mapSelect').value !==
        'custom';

    $('customMapSizing').style.display =
        locked
            ? 'none'
            : '';
}
