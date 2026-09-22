/* =========================
   ACCESSIBILITY
   ========================= */

const ACCESSIBILITY_STORAGE_KEY =
    'wardogs-accessibility-v1';

const ACCESSIBILITY_DEFAULTS = {
    textSize: 'normal',
    largerControls: false,
    highContrast: false
};

const ACCESSIBILITY_TEXT_SIZES =
    new Set([
        'normal',
        'large',
        'xl'
    ]);

let accessibilitySettings = {
    ...ACCESSIBILITY_DEFAULTS
};

let accessibilityResultTimer =
    null;

function normalizeAccessibilitySettings(
    value
) {
    const input =
        value &&
        typeof value === 'object'
            ? value
            : {};

    return {
        textSize:
            ACCESSIBILITY_TEXT_SIZES.has(
                input.textSize
            )
                ? input.textSize
                : ACCESSIBILITY_DEFAULTS.textSize,

        largerControls:
            input.largerControls === true,

        highContrast:
            input.highContrast === true
    };
}

function loadAccessibilitySettings() {
    try {
        const raw =
            localStorage.getItem(
                ACCESSIBILITY_STORAGE_KEY
            );

        if (!raw) {
            return {
                ...ACCESSIBILITY_DEFAULTS
            };
        }

        return normalizeAccessibilitySettings(
            JSON.parse(raw)
        );
    } catch (error) {
        console.warn(
            'Failed to load accessibility settings:',
            error
        );

        return {
            ...ACCESSIBILITY_DEFAULTS
        };
    }
}

function persistAccessibilitySettings() {
    try {
        localStorage.setItem(
            ACCESSIBILITY_STORAGE_KEY,
            JSON.stringify(
                accessibilitySettings
            )
        );
    } catch (error) {
        console.warn(
            'Failed to save accessibility settings:',
            error
        );
    }
}

function syncAccessibilityControls() {
    const textSize =
        $('accessibilityTextSize');

    const largerControls =
        $('accessibilityLargerControls');

    const highContrast =
        $('accessibilityHighContrast');

    if (textSize) {
        textSize.value =
            accessibilitySettings.textSize;
    }

    if (largerControls) {
        largerControls.checked =
            accessibilitySettings.largerControls;
    }

    if (highContrast) {
        highContrast.checked =
            accessibilitySettings.highContrast;
    }
}

function applyAccessibilitySettings(
    value,
    persist = false
) {
    accessibilitySettings =
        normalizeAccessibilitySettings(
            value
        );

    const root =
        document.documentElement;

    root.dataset.a11yTextSize =
        accessibilitySettings.textSize;

    root.dataset.a11yLargeControls =
        accessibilitySettings.largerControls
            ? 'true'
            : 'false';

    root.dataset.a11yHighContrast =
        accessibilitySettings.highContrast
            ? 'true'
            : 'false';

    syncAccessibilityControls();

    if (persist) {
        persistAccessibilitySettings();
    }

    if (
        typeof resize === 'function'
    ) {
        window.requestAnimationFrame(
            () => resize()
        );
    }
}

function initializeAccessibilityPreferences() {
    applyAccessibilitySettings(
        loadAccessibilitySettings(),
        false
    );
}

function getAccessibilityDiagnostics() {
    return {
        textSize:
            accessibilitySettings.textSize,
        largerControls:
            accessibilitySettings.largerControls,
        highContrast:
            accessibilitySettings.highContrast
    };
}

function createAccessibilityLauncher(
    className = ''
) {
    const button =
        document.createElement(
            'button'
        );

    button.type =
        'button';

    button.className =
        `accessibility-launcher ${className}`
            .trim();

    button.innerHTML = `
        <span class="accessibility-launcher-icon" aria-hidden="true">Aa</span>
        <span class="accessibility-launcher-label"></span>
    `;

    button.addEventListener(
        'click',
        () => {
            openAccessibilityDialog();
        }
    );

    return button;
}

function ensureAccessibilityResultStatus() {
    let status =
        $('accessibilityResultStatus');

    if (!status) {
        status =
            document.createElement(
                'div'
            );

        status.id =
            'accessibilityResultStatus';

        status.className =
            'sr-only';

        status.setAttribute(
            'role',
            'status'
        );

        status.setAttribute(
            'aria-live',
            'polite'
        );

        status.setAttribute(
            'aria-atomic',
            'true'
        );

        document.body.appendChild(
            status
        );
    }

    if (c) {
        c.setAttribute(
            'role',
            'img'
        );

        c.setAttribute(
            'aria-describedby',
            status.id
        );
    }

    return status;
}

function scheduleAccessibilityResultAnnouncement({
    distanceMeters,
    azimuth,
    inRange
}) {
    if (
        accessibilityResultTimer
    ) {
        window.clearTimeout(
            accessibilityResultTimer
        );
    }

    accessibilityResultTimer =
        window.setTimeout(
            () => {
                accessibilityResultTimer =
                    null;

                const status =
                    ensureAccessibilityResultStatus();

                const weapon =
                    WEAPONS[S.weapon];

                const mapName =
                    MAPS[S.map]?.name ||
                    S.map;

                const mil =
                    $('mil')?.textContent ||
                    '—';

                const summary = [
                    weapon
                        ? getWeaponName(weapon)
                        : '',
                    mapName,
                    `${tr('artillery')}: X ${formatGameCoordinate(S.origin.x)}, Y ${formatGameCoordinate(S.origin.y)}`,
                    `${tr('target')}: X ${formatGameCoordinate(S.target.x)}, Y ${formatGameCoordinate(S.target.y)}`,
                    `${tr('distance')}: ${Math.round(distanceMeters)} m`,
                    `${tr('azimuth')}: ${Number(azimuth).toFixed(1)}°`,
                    `${tr('mil')}: ${mil}`,
                    inRange
                        ? tr('inRange')
                        : tr('outRange')
                ]
                    .filter(Boolean)
                    .join('. ');

                setText(
                    status,
                    summary
                );

                if (c) {
                    c.setAttribute(
                        'aria-label',
                        `${tr('map')}: ${mapName}. ${tr('result')}.`
                    );
                }
            },
            700
        );
}

function syncAccessibilityLocalization() {
    const dialog =
        $('accessibilityDialog');

    const translate =
        (selector, key) => {
            const element =
                document.querySelector(
                    selector
                );

            if (element) {
                element.textContent =
                    tr(key);
            }
        };

    document
        .querySelectorAll(
            '.accessibility-launcher-label'
        )
        .forEach(
            label => {
                label.textContent =
                    tr('accessibility');
            }
        );

    document
        .querySelectorAll(
            '.accessibility-launcher'
        )
        .forEach(
            button => {
                const label =
                    tr('accessibility');

                button.title =
                    label;

                button.setAttribute(
                    'aria-label',
                    label
                );
            }
        );

    if (!dialog) {
        return;
    }

    translate(
        '#mobileAccessibilityLabel',
        'accessibilitySettings'
    );

    translate(
        '#accessibilityTitle',
        'accessibilitySettings'
    );

    translate(
        '#accessibilityTextSizeLabel',
        'accessibilityTextSize'
    );

    translate(
        '#accessibilityTextNormal',
        'accessibilityTextNormal'
    );

    translate(
        '#accessibilityTextLarge',
        'accessibilityTextLarge'
    );

    translate(
        '#accessibilityTextExtraLarge',
        'accessibilityTextExtraLarge'
    );

    translate(
        '#accessibilityLargerControlsLabel',
        'accessibilityLargerControls'
    );

    translate(
        '#accessibilityHighContrastLabel',
        'accessibilityHighContrast'
    );

    translate(
        '#accessibilityReset',
        'accessibilityReset'
    );

    translate(
        '#accessibilityClose',
        'accessibilityClose'
    );

    const close =
        dialog.querySelector(
            '.accessibility-dialog-close'
        );

    if (close) {
        close.setAttribute(
            'aria-label',
            tr('accessibilityClose')
        );
    }
}

function ensureAccessibilityDialog() {
    let dialog =
        $('accessibilityDialog');

    if (dialog) {
        return dialog;
    }

    dialog =
        document.createElement(
            'dialog'
        );

    dialog.id =
        'accessibilityDialog';

    dialog.className =
        'accessibility-dialog';

    dialog.setAttribute(
        'aria-labelledby',
        'accessibilityTitle'
    );

    dialog.innerHTML = `
        <form method="dialog" class="accessibility-form">
            <div class="accessibility-dialog-heading">
                <h2 id="accessibilityTitle"></h2>
                <button class="accessibility-dialog-close" type="button">×</button>
            </div>

            <label class="accessibility-field" for="accessibilityTextSize">
                <span id="accessibilityTextSizeLabel"></span>
                <select id="accessibilityTextSize">
                    <option id="accessibilityTextNormal" value="normal"></option>
                    <option id="accessibilityTextLarge" value="large"></option>
                    <option id="accessibilityTextExtraLarge" value="xl"></option>
                </select>
            </label>

            <label class="accessibility-toggle-row">
                <input id="accessibilityLargerControls" type="checkbox">
                <span id="accessibilityLargerControlsLabel"></span>
            </label>

            <label class="accessibility-toggle-row">
                <input id="accessibilityHighContrast" type="checkbox">
                <span id="accessibilityHighContrastLabel"></span>
            </label>

            <div class="accessibility-actions">
                <button id="accessibilityReset" type="button"></button>
                <button class="primary" id="accessibilityClose" type="button"></button>
            </div>
        </form>
    `;

    document.body.appendChild(
        dialog
    );

    const textSize =
        $('accessibilityTextSize');

    const largerControls =
        $('accessibilityLargerControls');

    const highContrast =
        $('accessibilityHighContrast');

    textSize?.addEventListener(
        'change',
        () => {
            applyAccessibilitySettings(
                {
                    ...accessibilitySettings,
                    textSize:
                        textSize.value
                },
                true
            );
        }
    );

    largerControls?.addEventListener(
        'change',
        () => {
            applyAccessibilitySettings(
                {
                    ...accessibilitySettings,
                    largerControls:
                        largerControls.checked
                },
                true
            );
        }
    );

    highContrast?.addEventListener(
        'change',
        () => {
            applyAccessibilitySettings(
                {
                    ...accessibilitySettings,
                    highContrast:
                        highContrast.checked
                },
                true
            );
        }
    );

    $('accessibilityReset')
        ?.addEventListener(
            'click',
            () => {
                applyAccessibilitySettings(
                    ACCESSIBILITY_DEFAULTS,
                    true
                );
            }
        );

    const close = () => {
        if (dialog.open) {
            dialog.close();
        }
    };

    dialog
        .querySelector(
            '.accessibility-dialog-close'
        )
        ?.addEventListener(
            'click',
            close
        );

    $('accessibilityClose')
        ?.addEventListener(
            'click',
            close
        );

    dialog.addEventListener(
        'click',
        event => {
            if (
                event.target === dialog
            ) {
                close();
            }
        }
    );

    syncAccessibilityControls();
    syncAccessibilityLocalization();

    return dialog;
}

function openAccessibilityDialog() {
    const dialog =
        ensureAccessibilityDialog();

    syncAccessibilityControls();
    syncAccessibilityLocalization();

    if (!dialog.open) {
        dialog.showModal();
    }

    $('accessibilityTextSize')
        ?.focus();
}

function installDesktopAccessibilityLauncher() {
    if (
        document.body.classList.contains(
            'mobile-app'
        ) ||
        document.querySelector(
            '.footer-accessibility-button'
        )
    ) {
        return;
    }

    const footerMeta =
        document.querySelector(
            '.footer-meta'
        );

    if (!footerMeta) {
        return;
    }

    const launcher =
        createAccessibilityLauncher(
            'footer-accessibility-button'
        );

    const donations =
        footerMeta.querySelector(
            '.donation-links'
        );

    footerMeta.insertBefore(
        launcher,
        donations || null
    );

    syncAccessibilityLocalization();
}

function initAccessibility() {
    ensureAccessibilityResultStatus();
    ensureAccessibilityDialog();
    installDesktopAccessibilityLauncher();
    syncAccessibilityLocalization();
}

