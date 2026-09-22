/* =========================
   LAYOUT COORDINATOR
   ========================= */

const GUIDE_FAQ_HASH_IDS = new Set([
    'guide-getting-started',
    'guide-weapons',
    'guide-maps',
    'guide-tools',
    'wardogs-calculator-faq'
]);

function getGuideFaqHashTarget(hash = window.location.hash) {
    let id;

    try {
        id = decodeURIComponent(
            String(hash || '').replace(/^#/, '')
        );
    } catch {
        return null;
    }

    if (!GUIDE_FAQ_HASH_IDS.has(id)) return null;

    const drawer = $('guideFaqDrawer');
    const target = document.getElementById(id);

    return drawer?.contains(target) ? target : null;
}

function scrollGuideFaqTarget(target, behavior = 'auto') {
    const scroller = target?.closest('.guide-faq-scroll');

    if (!scroller) return;

    const top = Math.max(
        0,
        scroller.scrollTop +
        target.getBoundingClientRect().top -
        scroller.getBoundingClientRect().top -
        8
    );

    if (typeof scroller.scrollTo === 'function') {
        scroller.scrollTo({ top, behavior });
    } else {
        scroller.scrollTop = top;
    }
}

function openGuideFaqHashTarget(
    hash,
    {
        behavior = 'auto',
        restoreWorkspace = false
    } = {}
) {
    const target = getGuideFaqHashTarget(hash);

    if (!target) return false;

    if (restoreWorkspace) {
        window.scrollTo(0, 0);

        const dock = document.querySelector('.control-dock');
        const map = document.querySelector('.map');

        if (dock) dock.scrollTop = 0;
        if (map) {
            map.scrollTop = 0;
            map.scrollLeft = 0;
        }
    }

    setGuideFaqOpen(true);

    window.requestAnimationFrame(
        () => window.requestAnimationFrame(
            () => scrollGuideFaqTarget(target, behavior)
        )
    );

    return true;
}

function clearGuideFaqHash() {
    if (!getGuideFaqHashTarget()) return;

    window.history.replaceState(
        window.history.state,
        '',
        `${window.location.pathname}${window.location.search}`
    );
}

function setGuideFaqOpen(open, restoreFocus = false) {
    const button = $('guideFaqButton');
    const drawer = $('guideFaqDrawer');

    if (!button || !drawer) return;

    const isOpen = Boolean(open);

    drawer.classList.toggle('is-open', isOpen);
    drawer.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
    button.setAttribute('aria-expanded', isOpen ? 'true' : 'false');

    if (isOpen) {
        drawer.removeAttribute('inert');
        window.requestAnimationFrame(() => $('guideFaqClose')?.focus());
    } else {
        drawer.setAttribute('inert', '');
        if (restoreFocus) button.focus();
    }
}

function initGuideFaq() {
    const button = $('guideFaqButton');
    const close = $('guideFaqClose');
    const drawer = $('guideFaqDrawer');

    if (!button || !close || !drawer || button.dataset.guideBound === 'true') {
        return;
    }

    button.dataset.guideBound = 'true';
    const closeDrawer = restoreFocus => {
        setGuideFaqOpen(false, restoreFocus);
        clearGuideFaqHash();
    };

    button.addEventListener(
        'click',
        () => {
            if (drawer.classList.contains('is-open')) {
                closeDrawer(false);
            } else {
                setGuideFaqOpen(true);
            }
        }
    );
    close.addEventListener('click', () => closeDrawer(true));
    drawer.addEventListener(
        'click',
        event => {
            const link = event.target.closest('a[href^="#"]');
            const target = link
                ? getGuideFaqHashTarget(link.hash)
                : null;

            if (!link || !target) return;

            event.preventDefault();

            window.history.pushState(
                window.history.state,
                '',
                `${window.location.pathname}${window.location.search}${link.hash}`
            );

            openGuideFaqHashTarget(
                link.hash,
                { behavior: 'smooth' }
            );
        }
    );
    document.addEventListener(
        'keydown',
        event => {
            if (event.key === 'Escape' && drawer.classList.contains('is-open')) {
                closeDrawer(true);
            }
        }
    );
    window.addEventListener(
        'hashchange',
        () => openGuideFaqHashTarget(
            window.location.hash,
            { restoreWorkspace: true }
        )
    );

    /*
     * Keep the drawer display:none while the initial document fragment is
     * resolved. Otherwise the browser can scroll the whole map to a target
     * that lives inside the off-canvas guide before application startup.
     */
    const openedFromHash = document.readyState === 'complete'
        ? openGuideFaqHashTarget(
            window.location.hash,
            { restoreWorkspace: true }
        )
        : false;

    if (!openedFromHash) setGuideFaqOpen(false);

    window.addEventListener(
        'load',
        () => openGuideFaqHashTarget(
            window.location.hash,
            { restoreWorkspace: true }
        ),
        { once: true }
    );
}

function updateLayoutLocalization() {

    const setAriaLabel = (id, key) => {
        const element = $(id);
        if (element && typeof tr === 'function') {
            element.setAttribute('aria-label', tr(key));
            element.setAttribute('title', tr(key));
        }
    };

    setAriaLabel('zoomOut', 'zoomOutLabel');
    setAriaLabel('zoomIn', 'zoomInLabel');
    setAriaLabel('fit', 'fit');
    setAriaLabel('guideFaqClose', 'accessibilityClose');
    setAriaLabel('coordinateOriginCopy', 'copyCoordinates');
    setAriaLabel('coordinateTargetCopy', 'copyCoordinates');
    setAriaLabel('coordinateOriginPaste', 'pasteCoordinates');
    setAriaLabel('coordinateTargetPaste', 'pasteCoordinates');

    if (typeof tr === 'function') {
        const pointMode =
            document.querySelector(
                '.point-mode'
            );

        pointMode?.setAttribute(
            'aria-label',
            tr('pointSelection')
        );

        [
            ['ox', 'artillery', 'X'],
            ['oy', 'artillery', 'Y'],
            ['tx', 'target', 'X'],
            ['ty', 'target', 'Y']
        ].forEach(([id, key, axis]) => {
            $(id)?.setAttribute(
                'aria-label',
                `${tr(key)} ${axis}`
            );
        });
    }

    if (
        document.body.classList.contains(
            'mobile-app'
        )
    ) {
        syncMobileThemeButtons();
        syncMobileSideMenuLocalization();

        setAriaLabel('mobileSheetHandle', 'mobileOpenCalculator');
        setAriaLabel('mobileSideMenu', 'mobileMenu');
        setAriaLabel('mobileSideMenuToggle', 'mobileMenu');
        setAriaLabel('mobileSideMenuBackdrop', 'mobileCloseMenu');

        const tabs = document.querySelector('.mobile-tabs');
        if (tabs && typeof tr === 'function') {
            tabs.setAttribute('aria-label', tr('mobileCalculatorSections'));
        }
    }
}

function initLayout() {

    initAccessibility();

    const mobileApp =
        document.body.classList.contains(
            'mobile-app'
        );

    if (!mobileApp) {
        initDesktopSavedTargetsCollapse();
        initGuideFaq();

    } else {
        initMobileSideMenu();
        initMobileSphLevelWarning();
    }

    const map =
        document.querySelector(
            '.map'
        );

    if (
        map &&
        typeof ResizeObserver !==
        'undefined'
    ) {

        mapResizeObserver =
            new ResizeObserver(
                () => {

                    if (
                        typeof resize ===
                        'function'
                    ) {
                        resize();
                    }
                }
            );

        mapResizeObserver.observe(
            map
        );
    }

    updateLayoutLocalization();
}
