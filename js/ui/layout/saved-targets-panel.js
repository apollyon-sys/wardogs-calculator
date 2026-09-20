/* =========================
   DESKTOP SAVED TARGETS COLLAPSE
   ========================= */

function installDesktopSavedTargetsCollapseStyle() {

    if (
        $('savedTargetsCollapseStyle')
    ) {
        return;
    }

    const style =
        document.createElement(
            'style'
        );

    style.id =
        'savedTargetsCollapseStyle';

    style.textContent = `
        body:not(.mobile-app)
        .saved-targets {
            transition:
                width .18s ease,
                padding .18s ease;
        }

        body:not(.mobile-app)
        .saved-targets-header {
            display: grid;

            grid-template-columns:
                minmax(0, 1fr)
                auto
                24px;

            align-items: center;

            gap: 7px;
        }

        body:not(.mobile-app)
        .saved-targets-collapse-toggle {
            width: 24px;
            min-width: 24px;

            height: 24px;
            min-height: 24px;

            margin: 0;
            padding: 0;

            display: grid;
            place-items: center;

            border: 1px solid
                var(--border-light);

            border-radius: 5px;

            background:
                var(--input-bg);

            color:
                var(--muted);

            font-size: 12px;
            line-height: 1;

            cursor: pointer;
        }

        body:not(.mobile-app)
        .saved-targets-collapse-toggle:hover,
        body:not(.mobile-app)
        .saved-targets-collapse-toggle:focus-visible {
            border-color:
                var(--accent-border);

            background:
                var(--input-hover-bg);

            color:
                var(--accent);
        }

        body:not(.mobile-app)
        .saved-targets.is-collapsed {
            width: 205px;

            padding:
                9px
                10px;
        }

        body:not(.mobile-app)
        .saved-targets.is-collapsed
        .saved-targets-header {
            margin-bottom: 0;
        }

        body:not(.mobile-app)
        .saved-targets.is-collapsed
        > .saved-targets-list,

        body:not(.mobile-app)
        .saved-targets.is-collapsed
        > .saved-target-options,

        body:not(.mobile-app)
        .saved-targets.is-collapsed
        > .saved-target-actions {
            display: none;
        }
    `;

    document.head.appendChild(
        style
    );
}

function loadDesktopSavedTargetsCollapsed() {

    try {

        return (
            localStorage.getItem(
                SAVED_TARGETS_PANEL_COLLAPSED_KEY
            ) === 'true'
        );

    } catch (error) {

        return false;
    }
}

function saveDesktopSavedTargetsCollapsed(
    collapsed
) {

    try {

        localStorage.setItem(
            SAVED_TARGETS_PANEL_COLLAPSED_KEY,
            collapsed
                ? 'true'
                : 'false'
        );

    } catch (error) {

        console.warn(
            'Failed to save saved-targets panel state:',
            error
        );
    }
}

function setDesktopSavedTargetsCollapsed(
    collapsed,
    persist = true
) {

    const panel =
        document.querySelector(
            '.workspace .saved-targets'
        );

    const toggle =
        $('savedTargetsCollapseToggle');

    if (
        !panel ||
        !toggle
    ) {
        return;
    }

    const next =
        Boolean(
            collapsed
        );

    panel.classList.toggle(
        'is-collapsed',
        next
    );

    toggle.setAttribute(
        'aria-expanded',
        next
            ? 'false'
            : 'true'
    );

    toggle.textContent =
        next
            ? '▾'
            : '▴';

    const label =
        typeof tr ===
            'function'
            ? tr('savedTargets')
            : 'Saved targets';

    toggle.title =
        label;

    toggle.setAttribute(
        'aria-label',
        label
    );

    if (persist) {

        saveDesktopSavedTargetsCollapsed(
            next
        );
    }
}

function toggleDesktopSavedTargetsCollapsed() {

    const panel =
        document.querySelector(
            '.workspace .saved-targets'
        );

    if (!panel) {
        return;
    }

    setDesktopSavedTargetsCollapsed(
        !panel.classList.contains(
            'is-collapsed'
        )
    );
}

function initDesktopSavedTargetsCollapse() {

    const mobileApp =
        document.body.classList.contains(
            'mobile-app'
        );

    if (mobileApp) {
        return;
    }

    const panel =
        document.querySelector(
            '.workspace .saved-targets'
        );

    const header =
        panel?.querySelector(
            '.saved-targets-header'
        );

    if (
        !panel ||
        !header
    ) {
        return;
    }

    installDesktopSavedTargetsCollapseStyle();

    let toggle =
        $('savedTargetsCollapseToggle');

    if (!toggle) {

        toggle =
            document.createElement(
                'button'
            );

        toggle.id =
            'savedTargetsCollapseToggle';

        toggle.type =
            'button';

        toggle.className =
            'saved-targets-collapse-toggle';

        header.appendChild(
            toggle
        );

        toggle.addEventListener(
            'click',
            event => {

                event.preventDefault();
                event.stopPropagation();

                setDesktopSavedTargetsCollapsed(
                    !panel.classList.contains(
                        'is-collapsed'
                    )
                );
            }
        );
    }

    setDesktopSavedTargetsCollapsed(
        loadDesktopSavedTargetsCollapsed(),
        false
    );
}

