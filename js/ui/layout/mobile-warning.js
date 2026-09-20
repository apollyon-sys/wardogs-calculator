/* =========================
   MOBILE SPH-2 LEVEL WARNING
   ========================= */

function setMobileSphWarningExpanded(
    warning,
    expanded
) {

    if (!warning) {
        return;
    }

    const toggle =
        warning.querySelector(
            '.sph-level-warning-toggle'
        );

    const body =
        warning.querySelector(
            '.sph-level-warning-body'
        );

    if (
        !toggle ||
        !body
    ) {
        return;
    }

    const next =
        Boolean(expanded);

    toggle.setAttribute(
        'aria-expanded',
        next
            ? 'true'
            : 'false'
    );

    body.hidden =
        !next;

    warning.classList.toggle(
        'expanded',
        next
    );
}

function prepareMobileSphLevelWarning() {

    const mobileApp =
        document.body.classList.contains(
            'mobile-app'
        );

    if (!mobileApp) {
        return false;
    }

    const warning =
        $('sphLevelWarning');

    const solutionHud =
        document.querySelector(
            '.mobile-solution-hud'
        );

    const rangeStatus =
        $('rangeStatus');

    if (
        !warning ||
        !solutionHud
    ) {
        return false;
    }

    /*
     * Put the SPH-2 leveling warning into the compact
     * firing-solution HUD shown above the map, directly
     * under the range-status row.
     */
    if (
        warning.parentElement !==
        solutionHud
    ) {

        if (
            rangeStatus &&
            rangeStatus.parentElement ===
                solutionHud
        ) {
            rangeStatus.insertAdjacentElement(
                'afterend',
                warning
            );
        } else {
            solutionHud.appendChild(
                warning
            );
        }
    }

    if (
        warning.dataset
            .mobileCollapsible ===
        'true'
    ) {
        return true;
    }

    const title =
        warning.querySelector(
            '.sph-level-warning-title'
        );

    const body =
        warning.querySelector(
            '.sph-level-warning-body'
        );

    if (
        !title ||
        !body
    ) {
        return false;
    }

    const toggle =
        document.createElement(
            'button'
        );

    toggle.type =
        'button';

    toggle.className =
        'sph-level-warning-toggle';

    /*
     * Reuse the existing icon/title nodes so the
     * Terrain3D runtime keeps updating localized text.
     */
    while (title.firstChild) {

        toggle.appendChild(
            title.firstChild
        );
    }

    const chevron =
        document.createElement(
            'span'
        );

    chevron.className =
        'sph-level-warning-chevron';

    chevron.textContent =
        '▾';

    chevron.setAttribute(
        'aria-hidden',
        'true'
    );

    toggle.appendChild(
        chevron
    );

    title.replaceWith(
        toggle
    );

    body.id =
        'sphLevelWarningBody';

    toggle.setAttribute(
        'aria-controls',
        body.id
    );

    toggle.addEventListener(
        'click',
        event => {

            event.preventDefault();
            event.stopPropagation();

            const expanded =
                toggle.getAttribute(
                    'aria-expanded'
                ) === 'true';

            setMobileSphWarningExpanded(
                warning,
                !expanded
            );
        }
    );

    warning.dataset
        .mobileCollapsible =
        'true';

    warning.classList.add(
        'sph-level-warning-mobile-hud'
    );

    /*
     * Keep the HUD compact until the user explicitly
     * asks for the full leveling explanation.
     */
    setMobileSphWarningExpanded(
        warning,
        false
    );

    return true;
}

function initMobileSphLevelWarning() {

    const mobileApp =
        document.body.classList.contains(
            'mobile-app'
        );

    if (!mobileApp) {
        return;
    }

    if (
        prepareMobileSphLevelWarning()
    ) {
        return;
    }

    /*
     * Terrain3D normally creates the warning before
     * initLayout(), but this keeps the UI robust if
     * runtime loading order changes.
     */
    if (
        mobileSphWarningObserver ||
        typeof MutationObserver ===
            'undefined'
    ) {
        return;
    }

    mobileSphWarningObserver =
        new MutationObserver(
            () => {

                if (
                    prepareMobileSphLevelWarning()
                ) {

                    mobileSphWarningObserver
                        .disconnect();

                    mobileSphWarningObserver =
                        null;
                }
            }
        );

    mobileSphWarningObserver.observe(
        document.body,
        {
            childList: true,
            subtree: true
        }
    );
}


