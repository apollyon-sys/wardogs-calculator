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
    cs: {
        menu: 'Menu',
        appearance: 'Vzhled',
        light: 'Světlý',
        dark: 'Tmavý',
        language: 'Jazyk',
        links: 'Odkazy',
        support: 'Podpořit',
        credits: 'Autoři',
        legal: 'Právní informace'
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
        normalizeConfiguredHttpUrl(
            config.authorUrl
        ) || '#';

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

    const accessibilitySection =
        createMobileMenuSection(
            'mobileAccessibilityLabel',
            'mobile-side-menu-accessibility'
        );

    const accessibilityButton =
        createAccessibilityLauncher(
            'mobile-accessibility-button'
        );

    accessibilityButton.addEventListener(
        'click',
        () => {
            setMobileSideMenuOpen(
                false
            );
        }
    );

    accessibilitySection.appendChild(
        accessibilityButton
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

    if (
        typeof createSourceCodeLink ===
        'function'
    ) {
        links.appendChild(
            createSourceCodeLink(
                'mobile-menu'
            )
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
        languageSection,
        appearanceSection,
        accessibilitySection,
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
