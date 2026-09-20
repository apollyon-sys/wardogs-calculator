/* =========================
   LAYOUT COORDINATOR
   ========================= */

function updateLayoutLocalization() {

    updateSidebarToggle();

    if (
        document.body.classList.contains(
            'mobile-app'
        )
    ) {
        syncMobileThemeButtons();
        syncMobileSideMenuLocalization();

        const setAriaLabel = (id, key) => {
            const element = $(id);
            if (element && typeof tr === 'function') {
                element.setAttribute('aria-label', tr(key));
            }
        };

        setAriaLabel('mobileSheetHandle', 'mobileOpenCalculator');
        setAriaLabel('zoomOut', 'zoomOutLabel');
        setAriaLabel('zoomIn', 'zoomInLabel');
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

    const button =
        $('sidebarToggle');

    button?.addEventListener(
        'click',
        event => {

            event.preventDefault();
            event.stopPropagation();

            toggleSidebar();
        }
    );

    if (!mobileApp) {
        setSidebarCollapsed(
            loadSidebarState(),
            false
        );

        initDesktopSavedTargetsCollapse();

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
