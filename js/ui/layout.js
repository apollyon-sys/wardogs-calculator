/* =========================
   LAYOUT
   ========================= */

const SIDEBAR_COLLAPSED_KEY =
    'wardogs-sidebar-collapsed';

const SAVED_TARGETS_PANEL_COLLAPSED_KEY =
    'wardogs-saved-targets-panel-collapsed';

let mapResizeObserver =
    null;

let mobileSideMenuOpen =
    false;

let mobileSphWarningObserver =
    null;

function isSidebarCollapsed() {

    return document
        .querySelector('main')
        ?.classList
        .contains('sidebar-collapsed') ||
        false;
}

function saveSidebarState(
    collapsed
) {

    try {

        localStorage.setItem(
            SIDEBAR_COLLAPSED_KEY,
            collapsed
                ? 'true'
                : 'false'
        );

    } catch (error) {

        console.warn(
            'Failed to save sidebar state:',
            error
        );
    }
}

function loadSidebarState() {

    try {

        return (
            localStorage.getItem(
                SIDEBAR_COLLAPSED_KEY
            ) === 'true'
        );

    } catch (error) {

        return false;
    }
}

function updateSidebarToggle() {

    const button =
        $('sidebarToggle');

    if (!button) {
        return;
    }

    const collapsed =
        isSidebarCollapsed();

    const label =
        collapsed
            ? tr('sidebarShow')
            : tr('sidebarHide');

    button.title =
        label;

    button.setAttribute(
        'aria-label',
        label
    );

    button.setAttribute(
        'aria-expanded',
        collapsed
            ? 'false'
            : 'true'
    );

    const icon =
        button.querySelector(
            '.sidebar-toggle-icon'
        );

    if (icon) {

        icon.textContent =
            collapsed
                ? '›'
                : '‹';
    }
}

function setSidebarCollapsed(
    collapsed,
    persist = true
) {

    const main =
        document.querySelector(
            'main'
        );

    if (!main) {
        return;
    }

    main.classList.toggle(
        'sidebar-collapsed',
        Boolean(
            collapsed
        )
    );

    if (persist) {

        saveSidebarState(
            Boolean(
                collapsed
            )
        );
    }

    updateSidebarToggle();

    /*
     * ResizeObserver handles the canvas
     * throughout the slide animation.
     * The fallback is useful in browsers
     * without ResizeObserver.
     */
    if (
        typeof ResizeObserver ===
        'undefined'
    ) {

        window.setTimeout(
            () => {
                if (
                    typeof resize ===
                    'function'
                ) {
                    resize();
                }
            },
            280
        );
    }
}

function toggleSidebar() {

    setSidebarCollapsed(
        !isSidebarCollapsed()
    );
}

/* =========================
   MOBILE RIGHT-SIDE MENU
   ========================= */

const MOBILE_MENU_TEXT = {
    en: {
        menu: 'Menu',
        appearance: 'Appearance',
        light: 'Light',
        dark: 'Dark',
        language: 'Language',
        links: 'Links',
        support: 'Support',
        credits: 'Credits',
        legal: 'Legal'
    },
    ru: {
        menu: 'Меню',
        appearance: 'Тема',
        light: 'Светлая',
        dark: 'Тёмная',
        language: 'Язык',
        links: 'Ссылки',
        support: 'Поддержать',
        credits: 'Авторы',
        legal: 'Дисклеймер'
    },
    uk: {
        menu: 'Меню',
        appearance: 'Тема',
        light: 'Світла',
        dark: 'Темна',
        language: 'Мова',
        links: 'Посилання',
        support: 'Підтримати',
        credits: 'Автори',
        legal: 'Дисклеймер'
    },
    de: {
        menu: 'Menü',
        appearance: 'Darstellung',
        light: 'Hell',
        dark: 'Dunkel',
        language: 'Sprache',
        links: 'Links',
        support: 'Unterstützen',
        credits: 'Credits',
        legal: 'Hinweis'
    },
    fr: {
        menu: 'Menu',
        appearance: 'Apparence',
        light: 'Clair',
        dark: 'Sombre',
        language: 'Langue',
        links: 'Liens',
        support: 'Soutenir',
        credits: 'Crédits',
        legal: 'Mentions'
    },
    es: {
        menu: 'Menú',
        appearance: 'Apariencia',
        light: 'Claro',
        dark: 'Oscuro',
        language: 'Idioma',
        links: 'Enlaces',
        support: 'Apoyar',
        credits: 'Créditos',
        legal: 'Aviso'
    },
    pl: {
        menu: 'Menu',
        appearance: 'Wygląd',
        light: 'Jasny',
        dark: 'Ciemny',
        language: 'Język',
        links: 'Linki',
        support: 'Wesprzyj',
        credits: 'Autorzy',
        legal: 'Informacja'
    },
       ko: {
        menu: '메뉴',
        appearance: '테마',
        light: '라이트',
        dark: '다크',
        language: '언어',
        links: '링크',
        support: '후원',
        credits: '제작진',
        legal: '법적 고지'
    },
    pt: {
        menu: 'Menu',
        appearance: 'Aparência',
        light: 'Claro',
        dark: 'Escuro',
        language: 'Idioma',
        links: 'Links',
        support: 'Apoiar',
        credits: 'Créditos',
        legal: 'Aviso'
    },
    'zh-cn': {
        menu: '菜单',
        appearance: '外观',
        light: '浅色',
        dark: '深色',
        language: '语言',
        links: '链接',
        support: '支持',
        credits: '致谢',
        legal: '法律信息'
    },
    cat: {
        menu: 'MEOWNU',
        appearance: 'MEOWDE',
        light: 'SUN CAT',
        dark: 'NIGHT CAT',
        language: 'MEOWGUAGE',
        links: 'CAT LINKS',
        support: 'SUPPORT CAT',
        credits: 'CAT CREDITS',
        legal: 'LEGAL MEOW'
    }
};

function getMobileMenuText() {

    const language =
        typeof LANG === 'string' &&
        LANG
            ? LANG
            : document.documentElement
                .lang ||
                'en';

    return (
        MOBILE_MENU_TEXT[language] ||
        MOBILE_MENU_TEXT.en
    );
}

function syncMobileThemeButtons() {

    const isLight =
        document.documentElement
            .dataset.theme === 'light';

    const lightButton =
        $('mobileThemeLight');

    const darkButton =
        $('mobileThemeDark');

    lightButton?.classList.toggle(
        'active',
        isLight
    );

    darkButton?.classList.toggle(
        'active',
        !isLight
    );

    lightButton?.setAttribute(
        'aria-pressed',
        isLight
            ? 'true'
            : 'false'
    );

    darkButton?.setAttribute(
        'aria-pressed',
        isLight
            ? 'false'
            : 'true'
    );
}

function syncMobileSideMenuLocalization() {

    const menu =
        $('mobileSideMenu');

    if (!menu) {
        return;
    }

    const text =
        getMobileMenuText();

    const setText =
        (
            id,
            value
        ) => {

            const element =
                $(id);

            if (element) {
                element.textContent =
                    value;
            }
        };

    setText(
        'mobileSideMenuTitle',
        text.menu
    );

    setText(
        'mobileAppearanceLabel',
        text.appearance
    );

    setText(
        'mobileThemeLightLabel',
        text.light
    );

    setText(
        'mobileThemeDarkLabel',
        text.dark
    );

    setText(
        'mobileLanguageLabel',
        text.language
    );

    setText(
        'mobileLinksLabel',
        text.links
    );

    setText(
        'mobileSupportLabel',
        text.support ||
            MOBILE_MENU_TEXT.en.support
    );

    setText(
        'mobileCreditsLabel',
        text.credits
    );

    setText(
        'mobileLegalLabel',
        text.legal
    );

    const close =
        menu.querySelector(
            '.mobile-side-menu-close'
        );

    if (close) {
        const label =
            typeof tr === 'function'
                ? tr('motdClose')
                : 'Close';

        close.title =
            label;

        close.setAttribute(
            'aria-label',
            label
        );
    }
}

function setMobileSideMenuOpen(
    open
) {

    const menu =
        $('mobileSideMenu');

    const toggle =
        $('mobileSideMenuToggle');

    const backdrop =
        $('mobileSideMenuBackdrop');

    if (
        !menu ||
        !toggle ||
        !backdrop
    ) {
        return;
    }

    mobileSideMenuOpen =
        Boolean(open);

    document.body.classList.toggle(
        'mobile-side-menu-open',
        mobileSideMenuOpen
    );

    toggle.classList.toggle(
        'active',
        mobileSideMenuOpen
    );

    toggle.setAttribute(
        'aria-expanded',
        mobileSideMenuOpen
            ? 'true'
            : 'false'
    );

    menu.setAttribute(
        'aria-hidden',
        mobileSideMenuOpen
            ? 'false'
            : 'true'
    );

    backdrop.setAttribute(
        'aria-hidden',
        mobileSideMenuOpen
            ? 'false'
            : 'true'
    );

    if (mobileSideMenuOpen) {

        syncMobileThemeButtons();
        syncMobileSideMenuLocalization();

        /*
         * Keep the calculator bottom sheet closed
         * while the global mobile menu is open.
         */
        if (
            typeof setMobileSheetOpen ===
            'function'
        ) {
            setMobileSheetOpen(
                false
            );
        }

        if (
            typeof closeLanguagePicker ===
            'function'
        ) {
            closeLanguagePicker();
        }
    }
}

function createMobileSideMenuToggle() {

    const button =
        document.createElement(
            'button'
        );

    button.id =
        'mobileSideMenuToggle';

    button.type =
        'button';

    button.className =
        'mobile-side-menu-toggle';

    button.title =
        'Menu';

    button.setAttribute(
        'aria-label',
        'Menu'
    );

    button.setAttribute(
        'aria-controls',
        'mobileSideMenu'
    );

    button.setAttribute(
        'aria-expanded',
        'false'
    );

    button.innerHTML = `
        <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            width="20"
            height="20"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
        >
            <path d="M5 7h14"></path>
            <path d="M5 12h14"></path>
            <path d="M5 17h14"></path>
        </svg>
    `;

    return button;
}

function createMobileMenuSection(
    labelId,
    className
) {

    const section =
        document.createElement(
            'section'
        );

    section.className =
        `mobile-side-menu-section ${className}`;

    const label =
        document.createElement(
            'div'
        );

    label.id =
        labelId;

    label.className =
        'mobile-side-menu-section-label';

    section.appendChild(
        label
    );

    return section;
}

function createMobileThemeButton(
    theme,
    id,
    labelId
) {

    const button =
        document.createElement(
            'button'
        );

    button.id =
        id;

    button.type =
        'button';

    button.className =
        'mobile-theme-choice-button';

    button.dataset.theme =
        theme;

    button.setAttribute(
        'aria-pressed',
        'false'
    );

    const icon =
        document.createElement(
            'span'
        );

    icon.className =
        'mobile-theme-choice-icon';

    icon.setAttribute(
        'aria-hidden',
        'true'
    );

    icon.innerHTML =
        theme === 'light'
            ? `
                <svg
                    viewBox="0 0 24 24"
                    width="19"
                    height="19"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.8"
                    stroke-linecap="round"
                >
                    <circle cx="12" cy="12" r="4"></circle>
                    <path d="M12 2v2"></path>
                    <path d="M12 20v2"></path>
                    <path d="m4.93 4.93 1.41 1.41"></path>
                    <path d="m17.66 17.66 1.41 1.41"></path>
                    <path d="M2 12h2"></path>
                    <path d="M20 12h2"></path>
                    <path d="m6.34 17.66-1.41 1.41"></path>
                    <path d="m19.07 4.93-1.41 1.41"></path>
                </svg>
            `
            : `
                <svg
                    viewBox="0 0 24 24"
                    width="19"
                    height="19"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.8"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                >
                    <path d="M21 12.7A8 8 0 1 1 11.3 3 6.2 6.2 0 0 0 21 12.7Z"></path>
                </svg>
            `;

    const label =
        document.createElement(
            'span'
        );

    label.id =
        labelId;

    label.className =
        'mobile-theme-choice-label';

    button.append(
        icon,
        label
    );

    button.addEventListener(
        'click',
        () => {

            if (
                typeof applyTheme ===
                'function'
            ) {
                applyTheme(
                    theme
                );
            }

            syncMobileThemeButtons();
        }
    );

    return button;
}

function createMobileCreditsBlock() {

    const config =
        APP_CONFIG
            ?.site
            ?.footer ||
        {};

    const wrap =
        document.createElement(
            'div'
        );

    wrap.className =
        'mobile-side-menu-footer';

    const creditsHeading =
        document.createElement(
            'div'
        );

    creditsHeading.id =
        'mobileCreditsLabel';

    creditsHeading.className =
        'mobile-side-menu-section-label';

    const creditLine =
        document.createElement(
            'div'
        );

    creditLine.className =
        'mobile-side-menu-credit-line';

    const productName =
        String(
            config.productName ||
            'WARDOGS Artillery Calculator'
        );

    const authorLabel =
        String(
            typeof tr === 'function'
                ? tr('authorLabel')
                : (config.authorLabel || 'by')
        );

    creditLine.append(
        document.createTextNode(
            `${productName} ${authorLabel} `
        )
    );

    const authorLink =
        document.createElement(
            'a'
        );

    authorLink.href =
        config.authorUrl ||
        '#';

    authorLink.target =
        '_blank';

    authorLink.rel =
        'noopener noreferrer';

    authorLink.textContent =
        config.authorName ||
        'Apollyon';

    creditLine.appendChild(
        authorLink
    );

    if (config.version) {

        const version =
            document.createElement(
                'span'
            );

        version.className =
            'mobile-side-menu-version';

        version.textContent =
            `v${String(config.version).replace(/^v/i, '')}`;

        creditLine.appendChild(
            version
        );
    }

    const legalHeading =
        document.createElement(
            'div'
        );

    legalHeading.id =
        'mobileLegalLabel';

    legalHeading.className =
        'mobile-side-menu-section-label mobile-side-menu-legal-label';

    const disclaimer =
        document.createElement(
            'p'
        );

    disclaimer.className =
        'mobile-side-menu-disclaimer';

    disclaimer.textContent =
        typeof tr === 'function'
            ? tr('footerDisclaimer')
            : (config.disclaimer || '');

    wrap.append(
        creditsHeading,
        creditLine
    );

    if (
        disclaimer.textContent
    ) {
        wrap.append(
            legalHeading,
            disclaimer
        );
    }

    return wrap;
}

function initMobileSideMenu() {

    const mobileApp =
        document.body.classList.contains(
            'mobile-app'
        );

    if (!mobileApp) {
        return;
    }

    if (
        $('mobileSideMenu')
    ) {
        return;
    }

    const headerControls =
        document.querySelector(
            '.mobile-header-controls'
        );

    if (!headerControls) {
        return;
    }

    const themeToggle =
        $('themeToggle');

    const languagePicker =
        $('languagePicker');

    const languageSelect =
        $('language');

    const desktopLink =
        $('mobileDesktopVersion');

    const partnerLink =
        document.querySelector(
            '.mobile-partner-link'
        );

    const toggle =
        createMobileSideMenuToggle();

    const backdrop =
        document.createElement(
            'button'
        );

    backdrop.id =
        'mobileSideMenuBackdrop';

    backdrop.type =
        'button';

    backdrop.className =
        'mobile-side-menu-backdrop';

    backdrop.setAttribute(
        'aria-label',
        'Close menu'
    );

    backdrop.setAttribute(
        'aria-hidden',
        'true'
    );

    const menu =
        document.createElement(
            'aside'
        );

    menu.id =
        'mobileSideMenu';

    menu.className =
        'mobile-side-menu';

    menu.setAttribute(
        'aria-label',
        'Menu'
    );

    menu.setAttribute(
        'aria-hidden',
        'true'
    );

    const menuHeader =
        document.createElement(
            'div'
        );

    menuHeader.className =
        'mobile-side-menu-header';

    const heading =
        document.createElement(
            'div'
        );

    heading.className =
        'mobile-side-menu-heading';

    const title =
        document.createElement(
            'strong'
        );

    title.id =
        'mobileSideMenuTitle';

    title.className =
        'mobile-side-menu-title';

    const subtitle =
        document.createElement(
            'span'
        );

    subtitle.className =
        'mobile-side-menu-subtitle';

    subtitle.textContent =
        APP_CONFIG
            ?.site
            ?.footer
            ?.productName ||
        'WARDOGS Artillery Calculator';

    heading.append(
        title,
        subtitle
    );

    const closeButton =
        document.createElement(
            'button'
        );

    closeButton.type =
        'button';

    closeButton.className =
        'mobile-side-menu-close';

    closeButton.textContent =
        '×';

    menuHeader.append(
        heading,
        closeButton
    );

    const appearanceSection =
        createMobileMenuSection(
            'mobileAppearanceLabel',
            'mobile-side-menu-appearance'
        );

    const themeChoices =
        document.createElement(
            'div'
        );

    themeChoices.className =
        'mobile-theme-choice';

    const lightTheme =
        createMobileThemeButton(
            'light',
            'mobileThemeLight',
            'mobileThemeLightLabel'
        );

    const darkTheme =
        createMobileThemeButton(
            'dark',
            'mobileThemeDark',
            'mobileThemeDarkLabel'
        );

    themeChoices.append(
        lightTheme,
        darkTheme
    );

    appearanceSection.appendChild(
        themeChoices
    );

    /*
     * Keep the original theme toggle connected but hidden.
     * theme.js updates #themeIcon / #themeToggle internally,
     * so preserving the element avoids changing shared
     * desktop theme logic.
     */
    if (themeToggle) {

        themeToggle.classList.add(
            'mobile-theme-toggle-legacy'
        );

        appearanceSection.appendChild(
            themeToggle
        );
    }

    const languageSection =
        createMobileMenuSection(
            'mobileLanguageLabel',
            'mobile-side-menu-language'
        );

    const languageShell =
        document.createElement(
            'div'
        );

    languageShell.className =
        'mobile-side-menu-language-shell';

    if (languagePicker) {

        languageShell.appendChild(
            languagePicker
        );
    }

    if (languageSelect) {

        languageShell.appendChild(
            languageSelect
        );
    }

    languageSection.appendChild(
        languageShell
    );

    const linksSection =
        createMobileMenuSection(
            'mobileLinksLabel',
            'mobile-side-menu-navigation'
        );

    const links =
        document.createElement(
            'div'
        );

    links.className =
        'mobile-side-menu-links';

    if (desktopLink) {

        desktopLink.classList.add(
            'mobile-side-menu-link-card'
        );

        links.appendChild(
            desktopLink
        );
    }

    if (partnerLink) {

        partnerLink.dataset
            .umamiEventPlacement =
            'mobile-menu';

        partnerLink.classList.add(
            'mobile-side-menu-link-card'
        );

        links.appendChild(
            partnerLink
        );
    }

    linksSection.appendChild(
        links
    );

    const supportSection =
        createMobileMenuSection(
            'mobileSupportLabel',
            'mobile-side-menu-support'
        );

    const donationLinks =
        createDonationLinks(
            'mobile-menu'
        );

    if (
        typeof feedbackFeatureEnabled === 'function' &&
        feedbackFeatureEnabled() &&
        typeof createFeedbackLauncher === 'function'
    ) {
        const feedbackButton =
            createFeedbackLauncher();

        feedbackButton.classList.add(
            'mobile-feedback-button'
        );

        feedbackButton.addEventListener(
            'click',
            () => {
                setMobileSideMenuOpen(
                    false
                );
            }
        );

        supportSection.appendChild(
            feedbackButton
        );
    }

    supportSection.appendChild(
        donationLinks
    );

    const footer =
        createMobileCreditsBlock();

    menu.append(
        menuHeader,
        appearanceSection,
        languageSection,
        linksSection,
        supportSection,
        footer
    );

    headerControls.appendChild(
        toggle
    );

    document.body.append(
        backdrop,
        menu
    );

    toggle.addEventListener(
        'click',
        event => {

            event.preventDefault();
            event.stopPropagation();

            setMobileSideMenuOpen(
                !mobileSideMenuOpen
            );
        }
    );

    closeButton.addEventListener(
        'click',
        () => {

            setMobileSideMenuOpen(
                false
            );
        }
    );

    backdrop.addEventListener(
        'click',
        () => {

            setMobileSideMenuOpen(
                false
            );
        }
    );

    desktopLink
        ?.addEventListener(
            'click',
            () => {

                setMobileSideMenuOpen(
                    false
                );
            }
        );

    partnerLink
        ?.addEventListener(
            'click',
            () => {

                setMobileSideMenuOpen(
                    false
                );
            }
        );

    donationLinks
        .querySelectorAll(
            '.donation-link'
        )
        .forEach(
            link => {
                link.addEventListener(
                    'click',
                    () => {
                        setMobileSideMenuOpen(
                            false
                        );
                    }
                );
            }
        );

    document.addEventListener(
        'keydown',
        event => {

            if (
                event.key ===
                    'Escape' &&
                mobileSideMenuOpen
            ) {

                setMobileSideMenuOpen(
                    false
                );
            }
        }
    );

    syncMobileThemeButtons();
    syncMobileSideMenuLocalization();

    setMobileSideMenuOpen(
        false
    );
}

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
