/* =========================
   GUNS
   ========================= */

/*
 * Artillery is a list. S.origin and S.weapon stay as the names the rest of
 * the code already uses, but become accessors onto whichever gun is
 * selected — which is what keeps events.js, results.js, inputs.js,
 * point-locks.js, terrain-ballistics.js and mobile.js out of this feature
 * entirely, and keeps js/core/core.js untouched so it never conflicts on an
 * upstream merge.
 */

const GUN_LIMIT = 8;

/*
 * Offset applied to a new gun so it does not land exactly under the one it
 * was copied from, in game units (1 unit = 100 m).
 */
const GUN_SPAWN_OFFSET = 0.5;

function gunId() {
    return (
        'gun-' +
        Date.now().toString(36) +
        '-' +
        Math.random().toString(36).slice(2, 8)
    );
}

function nextGunName() {
    for (let n = 1; ; n += 1) {
        const candidate = `${tr('gunDefaultName')} ${n}`;

        if (!S.guns.some(gun => gun.name === candidate)) {
            return candidate;
        }
    }
}

function createGun({ x, y, weapon, name } = {}) {
    return {
        id: gunId(),
        name: name || nextGunName(),
        position: {
            x: Number(x) || 0,
            y: Number(y) || 0
        },
        weapon: weapon || null,
        visible: true
    };
}

function gunById(id) {
    return S.guns.find(gun => gun.id === id) || null;
}

/*
 * Never returns null. Every reader of S.origin depends on this, so a
 * missing or stale activeGunId falls back to the first gun rather than
 * throwing halfway through a render.
 */
function activeGun() {
    return gunById(S.activeGunId) || S.guns[0];
}

function selectGun(id) {
    if (!gunById(id)) {
        return;
    }

    S.activeGunId = id;

    renderGuns();
    inputs();
    draw();
}

function addGun() {
    if (S.guns.length >= GUN_LIMIT) {
        return null;
    }

    const from = activeGun();

    const gun = createGun({
        x: from.position.x + GUN_SPAWN_OFFSET,
        y: from.position.y,
        weapon: from.weapon
    });

    clamp(gun.position);

    S.guns.push(gun);
    S.activeGunId = gun.id;

    renderGuns();
    inputs();
    draw();

    return gun;
}

function removeGun(id) {
    if (S.guns.length <= 1) {
        return false;
    }

    const index = S.guns.findIndex(gun => gun.id === id);

    if (index === -1) {
        return false;
    }

    S.guns.splice(index, 1);

    if (S.activeGunId === id) {
        S.activeGunId = S.guns[Math.min(index, S.guns.length - 1)].id;
    }

    renderGuns();
    inputs();
    draw();

    return true;
}

function renameGun(id, name) {
    const gun = gunById(id);

    if (!gun) {
        return;
    }

    gun.name = String(name).trim() || gun.name;

    if (typeof persistMapPoints === 'function') {
        persistMapPoints();
    }

    renderGuns();
}

function editGunName(id) {
    const gun = gunById(id);

    if (!gun) {
        return;
    }

    const name = window.prompt(
        tr('gunNamePrompt'),
        gun.name
    );

    if (name === null) {
        return;
    }

    const trimmed = name.trim();

    if (!trimmed) {
        return;
    }

    renameGun(id, trimmed);
}

function setGunVisible(id, visible) {
    const gun = gunById(id);

    if (!gun) {
        return;
    }

    gun.visible = Boolean(visible);

    renderGuns();
    draw();
}

/*
 * Converts core.js's origin/weapon literals into accessors, seeding the
 * first gun from whatever they already hold. Runs once, at load, before
 * anything else reads them.
 *
 * The getter hands back the gun's live position object rather than a copy:
 * clamp() and the map drag both mutate it in place.
 */
function installGunAccessors() {
    S.guns = [
        createGun({
            x: S.origin.x,
            y: S.origin.y,
            weapon: S.weapon,
            name: 'Gun 1'
        })
    ];

    S.activeGunId = S.guns[0].id;

    Object.defineProperty(S, 'origin', {
        configurable: true,
        enumerable: true,
        get() {
            return activeGun().position;
        },
        /*
         * Assigns onto the existing object instead of replacing it, so the
         * gun's id, name and weapon survive every `S.origin = {x, y}` in
         * the codebase.
         */
        set(value) {
            const position = activeGun().position;

            position.x = Number(value.x);
            position.y = Number(value.y);
        }
    });

    Object.defineProperty(S, 'weapon', {
        configurable: true,
        enumerable: true,
        get() {
            return activeGun().weapon;
        },
        set(value) {
            activeGun().weapon = value;
        }
    });
}

installGunAccessors();

/* =========================
   GUN LIST UI
   ========================= */

const GUN_EYE_ICON = {
    on:
        '<svg aria-hidden="true" viewBox="0 0 24 24" width="14" height="14"' +
        ' fill="none" stroke="currentColor" stroke-width="1.8"' +
        ' stroke-linecap="round" stroke-linejoin="round">' +
        '<path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z"/>' +
        '<circle cx="12" cy="12" r="2.6"/>' +
        '</svg>',

    off:
        '<svg aria-hidden="true" viewBox="0 0 24 24" width="14" height="14"' +
        ' fill="none" stroke="currentColor" stroke-width="1.8"' +
        ' stroke-linecap="round" stroke-linejoin="round">' +
        '<path d="M4 4l16 16"/>' +
        '<path d="M9.6 6a10 10 0 0 1 2.4-.3c6.4 0 10 6.3 10 6.3a17 17 0 0 1-3 3.6"/>' +
        '<path d="M6.4 8A17 17 0 0 0 2 12s3.6 6.5 10 6.5a10 10 0 0 0 3.2-.5"/>' +
        '</svg>'
};

/*
 * Reuses the saved-target list classes so the panel needs no new styling
 * vocabulary; only the gun-specific hooks below are new.
 */
function renderGuns() {
    const container = $('gunsList');

    if (!container) {
        return;
    }

    container.innerHTML = '';

    const count = $('gunsCount');

    if (count) {
        count.textContent = S.guns.length;
    }

    const addButton = $('addGun');

    if (addButton) {
        addButton.disabled = S.guns.length >= GUN_LIMIT;
    }

    S.guns.forEach(gun => {
        const row = document.createElement('div');

        row.className = 'saved-target gun-row';
        row.dataset.gunId = gun.id;

        if (gun.id === S.activeGunId) {
            row.classList.add('active');
        } else if (!gun.visible) {
            /*
             * Only the non-active guns can actually be hidden — the active
             * one draws whatever its eye says — so only those dim.
             */
            row.classList.add('hidden');
        }

        row.addEventListener('click', () => {
            selectGun(gun.id);
        });

        const info = document.createElement('div');
        info.className = 'saved-target-info';

        const name = document.createElement('span');
        name.className = 'saved-target-name';
        name.textContent = gun.name;

        const details = document.createElement('span');
        details.className = 'saved-target-coords';

        const weapon = WEAPONS[gun.weapon];

        details.textContent =
            `X ${formatGameCoordinate(gun.position.x)}` +
            ` · Y ${formatGameCoordinate(gun.position.y)}` +
            (weapon ? ` · ${getWeaponName(weapon)}` : '');

        info.append(name, details);

        const actions = document.createElement('div');
        actions.className = 'saved-target-actions-inline';

        /*
         * The active gun still draws whatever this says — see drawGuns().
         */
        const visibility = document.createElement('button');

        visibility.type = 'button';
        visibility.className =
            'saved-target-icon-button gun-visibility';
        /*
         * An inline SVG rather than an emoji: the map toolbar already draws
         * its icons this way, and an eye emoji falls back to a tofu box on
         * machines without an emoji font.
         */
        visibility.innerHTML = GUN_EYE_ICON[gun.visible ? 'on' : 'off'];
        visibility.setAttribute('aria-pressed', String(gun.visible));
        visibility.title = tr(gun.visible ? 'hideGun' : 'showGun');
        visibility.setAttribute(
            'aria-label',
            tr(gun.visible ? 'hideGun' : 'showGun')
        );

        visibility.addEventListener('click', event => {
            event.stopPropagation();
            setGunVisible(gun.id, !gun.visible);
        });

        actions.appendChild(visibility);

        const edit = document.createElement('button');

        edit.type = 'button';
        edit.className = 'saved-target-icon-button gun-edit';
        edit.textContent = '\u270e';
        edit.title = tr('edit');
        edit.setAttribute('aria-label', tr('edit'));

        edit.addEventListener('click', event => {
            event.stopPropagation();
            editGunName(gun.id);
        });

        actions.appendChild(edit);

        /*
         * No remove button on the last gun rather than a disabled one:
         * S.guns.length >= 1 is an invariant, not a soft rule.
         */
        if (S.guns.length > 1) {
            const remove = document.createElement('button');

            remove.type = 'button';
            remove.className =
                'saved-target-icon-button gun-remove';
            remove.textContent = '×';
            remove.title = tr('removeGun');

            remove.addEventListener('click', event => {
                event.stopPropagation();
                removeGun(gun.id);
            });

            actions.appendChild(remove);
        }

        row.append(info, actions);
        container.appendChild(row);
    });
}

function initGunsUI() {
    $('addGun')?.addEventListener('click', () => {
        addGun();
    });

    renderGuns();
}
