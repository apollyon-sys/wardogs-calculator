/* =========================
   LANGUAGES
   ========================= */

const LANGUAGE_STORAGE_KEY =
    'wardogs-language';

let languagePickerBound =
    false;

async function loadLanguages() {

    const index =
        await fetchJSON(
            'locales/index.json'
        );

    DEFAULT_LANG =
        index.default || 'en';

    LANGUAGES =
        Array.isArray(index.languages)
            ? index.languages
            : [];

    if (!LANGUAGES.length) {
        throw new Error(
            'No languages found in locales/index.json'
        );
    }

    await Promise.all(
        LANGUAGES.map(
            async language => {

                if (
                    !language.id ||
                    !language.file
                ) {
                    return;
                }

                I18N[language.id] =
                    await fetchJSON(
                        `locales/${language.file}`
                    );
            }
        )
    );

    populateLanguageSelect();

    LANG =
        detectLanguage();

    $('language').value =
        LANG;

    buildLanguagePicker();
}

function populateLanguageSelect() {

    const select =
        $('language');

    select.innerHTML = '';

    LANGUAGES.forEach(
        language => {

            const option =
                document.createElement(
                    'option'
                );

            option.value =
                language.id;

            /*
             * Keep the native fallback free of flag emoji.
             * Windows/Chrome does not reliably render
             * regional-indicator flag glyphs.
             */
            option.textContent =
                language.nativeName ||
                language.name ||
                language.id;

            select.appendChild(
                option
            );
        }
    );
}

function getSavedLanguage(
    available
) {

    try {

        const saved =
            localStorage.getItem(
                LANGUAGE_STORAGE_KEY
            );

        return (
            saved &&
            available.has(saved)
        )
            ? saved
            : null;

    } catch (error) {

        return null;
    }
}

function getBrowserLanguage(
    available
) {

    const browserLanguages =
        navigator.languages &&
        navigator.languages.length
            ? navigator.languages
            : [navigator.language];

    for (
        const language
        of browserLanguages
    ) {

        if (!language) {
            continue;
        }

        const normalized =
            String(language)
                .toLowerCase();

        if (
            available.has(
                normalized
            )
        ) {
            return normalized;
        }

        const base =
            normalized.split('-')[0];

        if (
            available.has(base)
        ) {
            return base;
        }
    }

    return null;
}

function detectLanguage() {

    const available =
        new Set(
            LANGUAGES.map(
                language =>
                    language.id
            )
        );

    /*
     * A language explicitly selected by the user
     * always wins and persists between sessions.
     */
    const saved =
        getSavedLanguage(
            available
        );

    if (saved) {
        return saved;
    }

    const pageLanguage =
        document.documentElement
            .dataset.pageLanguage;

    /*
     * On the root entry page use the browser /
     * operating-system locale automatically.
     *
     * Dedicated SEO language URLs (/ru/, /de/, ...)
     * keep their declared language when opened
     * directly, unless the user has already saved
     * another preference.
     */
    const isDefaultEntryPage =
        !pageLanguage ||
        pageLanguage ===
        DEFAULT_LANG;

    if (isDefaultEntryPage) {

        const browserLanguage =
            getBrowserLanguage(
                available
            );

        if (browserLanguage) {
            return browserLanguage;
        }
    }

    if (
        pageLanguage &&
        available.has(
            pageLanguage
        )
    ) {
        return pageLanguage;
    }

    const browserLanguage =
        getBrowserLanguage(
            available
        );

    if (browserLanguage) {
        return browserLanguage;
    }

    return available.has(DEFAULT_LANG)
        ? DEFAULT_LANG
        : LANGUAGES[0].id;
}

function getLanguageDefinition(
    languageId
) {

    return LANGUAGES.find(
        language =>
            language.id ===
            languageId
    ) || null;
}

function createLanguageFlag(
    language
) {

    if (!language) {
        return null;
    }

    if (language.flagAsset) {

        const image =
            document.createElement(
                'img'
            );

        image.className =
            'language-flag';

        image.src =
            resourceURL(
                language.flagAsset
            );

        image.alt =
            '';

        image.width =
            20;

        image.height =
            14;

        image.setAttribute(
            'aria-hidden',
            'true'
        );

        return image;
    }

    const fallback =
        document.createElement(
            'span'
        );

    fallback.className =
        'language-flag language-flag-text';

    fallback.textContent =
        language.shortLabel ||
        language.id.toUpperCase();

    fallback.setAttribute(
        'aria-hidden',
        'true'
    );

    return fallback;
}

function updateLanguagePicker() {

    const button =
        $('languagePickerButton');

    if (!button) {
        return;
    }

    const language =
        getLanguageDefinition(
            LANG
        );

    if (!language) {
        return;
    }

    button.innerHTML = '';

    const flag =
        createLanguageFlag(
            language
        );

    if (flag) {
        button.appendChild(flag);
    }

    const name =
        document.createElement(
            'span'
        );

    name.className =
        'language-picker-current-name';

    name.textContent =
        language.nativeName ||
        language.name ||
        language.id;

    button.appendChild(name);

    const arrow =
        document.createElement(
            'span'
        );

    arrow.className =
        'language-picker-arrow';

    arrow.textContent =
        '▾';

    arrow.setAttribute(
        'aria-hidden',
        'true'
    );

    button.appendChild(arrow);

    button.setAttribute(
        'aria-label',
        language.name ||
        language.nativeName ||
        language.id
    );

    document
        .querySelectorAll(
            '.language-picker-option'
        )
        .forEach(option => {

            option.classList.toggle(
                'active',
                option.dataset.language ===
                LANG
            );

            option.setAttribute(
                'aria-selected',
                option.dataset.language === LANG
                    ? 'true'
                    : 'false'
            );
        });
}

function closeLanguagePicker() {

    const picker =
        $('languagePicker');

    const button =
        $('languagePickerButton');

    if (!picker) {
        return;
    }

    picker.classList.remove(
        'open'
    );

    button?.setAttribute(
        'aria-expanded',
        'false'
    );
}

function buildLanguagePicker() {

    const select =
        $('language');

    if (!select) {
        return;
    }

    let picker =
        $('languagePicker');

    if (!picker) {

        picker =
            document.createElement(
                'div'
            );

        picker.id =
            'languagePicker';

        picker.className =
            'language-picker';

        const button =
            document.createElement(
                'button'
            );

        button.id =
            'languagePickerButton';

        button.type =
            'button';

        button.className =
            'language-picker-button';

        button.setAttribute(
            'aria-haspopup',
            'listbox'
        );

        button.setAttribute(
            'aria-expanded',
            'false'
        );

        const menu =
            document.createElement(
                'div'
            );

        menu.id =
            'languagePickerMenu';

        menu.className =
            'language-picker-menu';

        menu.setAttribute(
            'role',
            'listbox'
        );

        picker.append(
            button,
            menu
        );

        select.insertAdjacentElement(
            'beforebegin',
            picker
        );
    }

    const menu =
        $('languagePickerMenu');

    menu.innerHTML = '';

    LANGUAGES.forEach(
        language => {

            const option =
                document.createElement(
                    'button'
                );

            option.type =
                'button';

            option.className =
                'language-picker-option';

            option.dataset.language =
                language.id;

            option.setAttribute(
                'role',
                'option'
            );

            const flag =
                createLanguageFlag(
                    language
                );

            if (flag) {
                option.appendChild(flag);
            }

            const name =
                document.createElement(
                    'span'
                );

            name.textContent =
                language.nativeName ||
                language.name ||
                language.id;

            option.appendChild(name);

            option.addEventListener(
                'click',
                event => {

                    event.preventDefault();
                    event.stopPropagation();

                    select.value =
                        language.id;

                    closeLanguagePicker();

                    select.dispatchEvent(
                        new Event(
                            'change',
                            {
                                bubbles:
                                    true
                            }
                        )
                    );
                }
            );

            menu.appendChild(
                option
            );
        }
    );

    /*
     * Keep the native select as a functional,
     * accessible fallback without displaying it.
     */
    select.classList.add(
        'language-select-native'
    );

    if (!languagePickerBound) {

        $('languagePickerButton')
            ?.addEventListener(
                'click',
                event => {

                    event.preventDefault();
                    event.stopPropagation();

                    const isOpen =
                        picker.classList
                            .toggle(
                                'open'
                            );

                    $('languagePickerButton')
                        ?.setAttribute(
                            'aria-expanded',
                            isOpen
                                ? 'true'
                                : 'false'
                        );
                }
            );

        document.addEventListener(
            'click',
            event => {

                if (
                    !picker.contains(
                        event.target
                    )
                ) {
                    closeLanguagePicker();
                }
            }
        );

        document.addEventListener(
            'keydown',
            event => {

                if (
                    event.key ===
                    'Escape'
                ) {
                    closeLanguagePicker();
                }
            }
        );

        languagePickerBound =
            true;
    }

    updateLanguagePicker();
}

function tr(key) {

    const language =
        I18N[LANG];

    const fallback =
        I18N[DEFAULT_LANG];

    return (
        language?.[key] ??
        fallback?.[key] ??
        key
    );
}

function getLanguagePageURL(languageId) {

    const siteRoot =
        new URL(
            './',
            document.baseURI
        );

    const mobileApp =
        document.body.classList.contains(
            'mobile-app'
        );

    const interfaceRoot =
        mobileApp
            ? new URL(
                'mobile/',
                siteRoot
            )
            : siteRoot;

    if (languageId === DEFAULT_LANG) {
        return interfaceRoot.href;
    }

    return new URL(
        `${languageId}/`,
        interfaceRoot
    ).href;
}

function switchLanguage(languageId) {

    try {

        localStorage.setItem(
            LANGUAGE_STORAGE_KEY,
            languageId
        );

    } catch (error) {

        console.warn(
            'Failed to save language preference:',
            error
        );
    }

    window.location.href =
        getLanguagePageURL(
            languageId
        );
}

function applyLanguage() {

    document.documentElement.lang =
        LANG;

    document
        .querySelectorAll('[data-i18n]')
        .forEach(element => {

            element.textContent =
                tr(
                    element.dataset.i18n
                );
        });

    $('language').value =
        LANG;

    updateLanguagePicker();

    updatePresetLock();
    updateThemeButton();

    if (
        typeof populateWeaponSelect ===
            'function' &&
        Object.keys(WEAPONS).length
    ) {
        populateWeaponSelect();
    }

    renderSavedTargets();

    if (
        typeof updateMapToolsLocalization ===
        'function'
    ) {
        updateMapToolsLocalization();
    }

    if (
        typeof updatePointLocksUI ===
        'function'
    ) {
        updatePointLocksUI();
    }

    if (
        typeof updateForcePlacementUI ===
        'function'
    ) {
        updateForcePlacementUI();
    }

    if (
        typeof updateLayoutLocalization ===
        'function'
    ) {
        updateLayoutLocalization();
    }

    if (
        typeof updateMotdLocalization ===
        'function'
    ) {
        updateMotdLocalization();
    }

    if (
        typeof updateMobileDesktopLink ===
        'function'
    ) {
        updateMobileDesktopLink();
    }

    result();
    draw();
}
