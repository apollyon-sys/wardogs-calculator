/* =========================
   FOOTER
   ========================= */

const FOOTER_PARTNERS = [
    {
        id: 'wardogs-hub',
        label: 'Community partner',
        name: 'WARDOGSHUB',
        url: 'https://wardogshub.net/?utm_source=wardogs-artillery&utm_medium=partner&utm_campaign=footer'
    }
];

const DONATION_LINKS = [
    {
        id: 'ko-fi',
        labelKey: 'supportViaKoFi',
        url: 'https://ko-fi.com/D3J32528AD',
        icon: `
            <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
            >
                <path d="M4 7h13v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V7Z"></path>
                <path d="M17 9h1.25a2.75 2.75 0 0 1 0 5.5H17"></path>
                <path d="M8 10.2c.8-.9 2.1-.4 2.5.4.4-.8 1.7-1.3 2.5-.4 1.2 1.3-.4 2.7-2.5 4.1-2.1-1.4-3.7-2.8-2.5-4.1Z"></path>
            </svg>
        `
    },
    {
        id: 'boosty',
        labelKey: 'supportViaBoosty',
        url: 'https://boosty.to/apollyonsys/donate',
        icon: `
            <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
            >
                <path d="M13.5 2 5 13h6l-1 9 9-12h-6l.5-8Z"></path>
            </svg>
        `
    }
];

const DONATION_PARAGRAPH_KEYS = [
    'supportStatementGrowth',
    'supportStatementFree',
    'supportStatementInvite',
    'supportStatementCosts',
    'supportStatementContinuity'
];

let donationDialog = null;

function appendDonationRichText(
    element,
    value
) {
    const parts =
        String(value || '')
            .split(/(\*\*[^*]+\*\*)/g)
            .filter(Boolean);

    parts.forEach(part => {
        if (
            part.startsWith('**') &&
            part.endsWith('**')
        ) {
            const strong =
                document.createElement(
                    'strong'
                );

            strong.textContent =
                part.slice(2, -2);

            element.appendChild(
                strong
            );
            return;
        }

        element.appendChild(
            document.createTextNode(
                part
            )
        );
    });
}

function createDonationLink(
    donation,
    placement
) {
    const link =
        document.createElement(
            'a'
        );

    const label =
        typeof tr === 'function'
            ? tr(donation.labelKey)
            : donation.id;

    link.className =
        `donation-provider-link donation-provider-link-${donation.id}`;

    link.href =
        donation.url;

    link.target =
        '_blank';

    link.rel =
        'noopener noreferrer';

    link.setAttribute(
        'aria-label',
        label
    );

    const icon =
        document.createElement(
            'span'
        );

    icon.className =
        'donation-provider-icon';

    icon.innerHTML =
        donation.icon;

    const labelElement =
        document.createElement(
            'span'
        );

    labelElement.className =
        'donation-provider-label';

    labelElement.textContent =
        label;

    link.append(
        icon,
        labelElement
    );

    link.addEventListener(
        'click',
        () => {
            if (
                typeof trackAnalytics ===
                'function'
            ) {
                const currentPlacement =
                    link
                        .closest(
                            '.donation-dialog'
                        )
                        ?.dataset
                        .donationPlacement ||
                    placement;

                trackAnalytics(
                    'donation-click',
                    {
                        service:
                            donation.id,

                        placement:
                            currentPlacement
                    }
                );
            }
        }
    );

    return link;
}

function ensureDonationDialog(
    placement = 'footer'
) {
    if (donationDialog?.isConnected) {
        donationDialog.dataset
            .donationPlacement =
            placement;
        return donationDialog;
    }

    const dialog =
        document.createElement(
            'dialog'
        );

    dialog.className =
        'donation-dialog';

    dialog.dataset
        .donationPlacement =
        placement;

    dialog.setAttribute(
        'aria-labelledby',
        'donationDialogTitle'
    );

    const shell =
        document.createElement(
            'div'
        );

    shell.className =
        'donation-dialog-shell';

    const header =
        document.createElement(
            'div'
        );

    header.className =
        'donation-dialog-header';

    const title =
        document.createElement(
            'h2'
        );

    title.id =
        'donationDialogTitle';

    title.textContent =
        typeof tr === 'function'
            ? tr('supportDialogTitle')
            : 'Support the project';

    const closeButton =
        document.createElement(
            'button'
        );

    const closeLabel =
        typeof tr === 'function'
            ? tr('supportDialogClose')
            : 'Close';

    closeButton.type =
        'button';

    closeButton.className =
        'donation-dialog-close';

    closeButton.textContent =
        '×';

    closeButton.title =
        closeLabel;

    closeButton.setAttribute(
        'aria-label',
        closeLabel
    );

    header.append(
        title,
        closeButton
    );

    const body =
        document.createElement(
            'div'
        );

    body.className =
        'donation-dialog-body';

    DONATION_PARAGRAPH_KEYS.forEach(
        key => {
            const paragraph =
                document.createElement(
                    'p'
                );

            paragraph.className =
                `donation-dialog-paragraph donation-dialog-paragraph-${key.replace('supportStatement', '').toLowerCase()}`;

            appendDonationRichText(
                paragraph,
                typeof tr === 'function'
                    ? tr(key)
                    : key
            );

            body.appendChild(
                paragraph
            );
        }
    );

    const contact =
        document.createElement(
            'p'
        );

    contact.className =
        'donation-dialog-contact';

    contact.textContent =
        typeof tr === 'function'
            ? tr('supportStatementPayments')
            : 'Payments are handled by third-party payment providers. If you are unable to make a payment or have any other questions, please contact me at:';

    const email =
        document.createElement(
            'a'
        );

    email.href =
        'mailto:contact@wardogs-artillery.com';

    email.textContent =
        'contact@wardogs-artillery.com';

    contact.append(
        document.createElement('br'),
        email
    );

    const signature =
        document.createElement(
            'p'
        );

    signature.className =
        'donation-dialog-signature';

    signature.textContent =
        '— Apollyon';

    body.append(
        contact,
        signature
    );

    const actions =
        document.createElement(
            'div'
        );

    actions.className =
        'donation-dialog-actions';

    DONATION_LINKS.forEach(
        donation => {
            actions.appendChild(
                createDonationLink(
                    donation,
                    placement
                )
            );
        }
    );

    shell.append(
        header,
        body,
        actions
    );

    dialog.appendChild(
        shell
    );

    closeButton.addEventListener(
        'click',
        () => {
            dialog.close();
        }
    );

    dialog.addEventListener(
        'click',
        event => {
            if (event.target === dialog) {
                dialog.close();
            }
        }
    );

    document.body.appendChild(
        dialog
    );

    donationDialog =
        dialog;

    return dialog;
}

function openDonationDialog(
    placement = 'footer'
) {
    const dialog =
        ensureDonationDialog(
            placement
        );

    if (dialog.open) {
        return;
    }

    if (
        typeof trackAnalytics ===
        'function'
    ) {
        trackAnalytics(
            'donation-dialog-opened',
            {
                placement
            }
        );
    }

    dialog.showModal();

    dialog
        .querySelector(
            '.donation-dialog-close'
        )
        ?.focus();
}

function createDonationLinks(
    placement = 'footer'
) {
    const links =
        document.createElement(
            'span'
        );

    links.className =
        `donation-links donation-links-${placement}`;

    const button =
        document.createElement(
            'button'
        );

    button.type =
        'button';

    // Keep the legacy donation-link class so existing mobile-menu
    // close handling continues to work without duplicating listeners.
    button.className =
        'donation-link donation-support-button';

    button.textContent =
        typeof tr === 'function'
            ? tr('supportProject')
            : 'Support the project';

    button.addEventListener(
        'click',
        () => {
            openDonationDialog(
                placement
            );
        }
    );

    links.appendChild(
        button
    );

    return links;
}

function createFooterPartner(partner) {
    const item =
        document.createElement(
            'span'
        );

    item.className =
        'footer-partner';

    const label =
        document.createElement(
            'span'
        );

    label.className =
        'footer-partner-label';

    const partnerLabel =
        typeof tr === 'function' &&
        partner.id === 'wardogs-hub'
            ? tr('communityPartner')
            : partner.label;

    label.textContent =
        `${partnerLabel}:`;

    const link =
        document.createElement(
            'a'
        );

    link.className =
        'footer-partner-link';

    link.href =
        partner.url;

    link.target =
        '_blank';

    link.rel =
        'noopener noreferrer';

    link.textContent =
        partner.name;

    link.addEventListener(
        'click',
        () => {
            if (
                typeof trackAnalytics ===
                'function'
            ) {
                trackAnalytics(
                    'partner-click',
                    {
                        partner:
                            partner.id,

                        placement:
                            'footer'
                    }
                );
            }
        }
    );

    item.append(
        label,
        link
    );

    return item;
}

const FEEDBACK_LAUNCHER_LABELS = {
    en: 'Feedback',
    ru: 'Обратная связь',
    uk: 'Зворотний зв’язок',
    de: 'Feedback',
    fr: 'Feedback',
    es: 'Comentarios',
    pl: 'Opinie',
    pt: 'Feedback',
    'zh-cn': '反馈',
    ko: '피드백',
    ja: 'フィードバック',
    cs: 'Zpětná vazba',
    cat: 'Meowback'
};

let feedbackRuntimePromise = null;

function feedbackFeatureEnabled() {
    return APP_CONFIG?.feedback?.enabled === true &&
        Boolean(
            normalizeConfiguredHttpUrl(
                APP_CONFIG?.feedback?.serverUrl,
                {
                    allowLocalhost: true,
                    allowSearchAndHash: false
                }
            )
        );
}

function feedbackLauncherLabel() {
    return FEEDBACK_LAUNCHER_LABELS[
        typeof LANG === 'string' ? LANG : 'en'
    ] || FEEDBACK_LAUNCHER_LABELS.en;
}

function loadFeedbackRuntime() {
    if (typeof openFeedbackDialog === 'function') {
        return Promise.resolve();
    }

    if (feedbackRuntimePromise) {
        return feedbackRuntimePromise;
    }

    feedbackRuntimePromise = new Promise((resolve, reject) => {
        const existing = document.querySelector(
            'script[data-feedback-runtime]'
        );

        if (existing) {
            existing.addEventListener('load', resolve, { once: true });
            existing.addEventListener(
                'error',
                () => reject(new Error('feedback-runtime')),
                { once: true }
            );
            return;
        }

        const script = document.createElement('script');
        const runtimeUrl = new URL(
            'js/ui/feedback.js',
            typeof BASE_PATH !== 'undefined'
                ? BASE_PATH
                : document.baseURI
        ).href;

        script.src = typeof versionRuntimeAsset === 'function'
            ? versionRuntimeAsset(runtimeUrl)
            : runtimeUrl;
        script.dataset.feedbackRuntime = '1';
        script.onload = resolve;
        script.onerror = () => reject(new Error('feedback-runtime'));
        document.head.appendChild(script);
    }).catch(error => {
        feedbackRuntimePromise = null;
        document.querySelector('script[data-feedback-runtime]')?.remove();
        throw error;
    });

    return feedbackRuntimePromise;
}

function createFeedbackLauncher() {
    const button = document.createElement('button');
    const label = feedbackLauncherLabel();

    button.type = 'button';
    button.className = 'footer-feedback-button';
    button.setAttribute('aria-label', label);
    button.title = label;
    button.innerHTML = `
        <span class="footer-feedback-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M5 5h14v10H9l-4 4V5Z"></path>
                <path d="M8 9h8"></path>
                <path d="M8 12h5"></path>
            </svg>
        </span>
        <span class="footer-feedback-label"></span>
    `;

    button.querySelector('.footer-feedback-label').textContent = label;

    button.addEventListener('click', async () => {
        if (button.disabled) return;

        button.disabled = true;

        try {
            await loadFeedbackRuntime();

            if (typeof openFeedbackDialog !== 'function') {
                throw new Error('feedback-runtime');
            }

            if (typeof trackAnalytics === 'function') {
                trackAnalytics('feedback-opened', {});
            }

            openFeedbackDialog();
        } catch (error) {
            console.warn('Feedback form could not load:', error);
        } finally {
            button.disabled = false;
        }
    });

    return button;
}

function createSourceCodeLink(placement = 'footer') {
    const link = document.createElement('a');

    link.href =
        normalizeConfiguredHttpUrl(
            APP_CONFIG
                ?.site
                ?.footer
                ?.sourceCodeUrl
        ) ||
        'https://github.com/apollyon-sys/wardogs-calculator';

    link.target = '_blank';
    link.rel = 'noopener noreferrer';

    const label =
        typeof tr === 'function'
            ? tr('sourceCode')
            : 'Source code';

    link.setAttribute('aria-label', label);
    link.title = label;
    link.innerHTML = `
        <span class="footer-feedback-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.477 2 2 6.486 2 12.021c0 4.428 2.865 8.184 6.839 9.504.5.093.682-.217.682-.483 0-.237-.009-.866-.014-1.7-2.782.605-3.369-1.343-3.369-1.343-.455-1.158-1.11-1.466-1.11-1.466-.908-.622.069-.609.069-.609 1.004.071 1.532 1.032 1.532 1.032.892 1.53 2.341 1.088 2.91.832.091-.647.35-1.088.636-1.338-2.221-.253-4.555-1.112-4.555-4.947 0-1.093.39-1.987 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.269 2.75 1.027A9.55 9.55 0 0 1 12 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.378.203 2.397.1 2.65.64.701 1.028 1.595 1.028 2.688 0 3.845-2.337 4.691-4.566 4.94.359.31.678.923.678 1.86 0 1.343-.012 2.426-.012 2.756 0 .268.18.58.688.481A10.023 10.023 0 0 0 22 12.021C22 6.486 17.523 2 12 2Z"></path>
            </svg>
        </span>
        <span class="footer-feedback-label"></span>
    `;

    link.querySelector('.footer-feedback-label').textContent = label;

    if (placement === 'mobile-menu') {
        /* Reuse the existing mobile navigation-card appearance. */
        link.className =
            'mobile-desktop-link mobile-source-code-link';
    } else {
        /* Reuse the existing footer action-button appearance. */
        link.className =
            'footer-feedback-button footer-source-code-link';
    }

    return link;
}

function renderFooter() {
    const footer =
        $('siteFooter') ||
        document.querySelector('footer');

    if (!footer) {
        return;
    }

    const config =
        APP_CONFIG
            ?.site
            ?.footer || {};

    footer.innerHTML = '';

    const disclaimer =
        document.createElement(
            'span'
        );

    disclaimer.className =
        'footer-disclaimer';

    disclaimer.textContent =
        typeof tr === 'function'
            ? tr('footerDisclaimer')
            : (config.disclaimer || '');

    const meta =
        document.createElement(
            'span'
        );

    meta.className =
        'footer-meta';

    if (FOOTER_PARTNERS.length) {
        const partners =
            document.createElement(
                'span'
            );

        partners.className =
            'footer-partners';

        FOOTER_PARTNERS.forEach(
            partner => {
                partners.appendChild(
                    createFooterPartner(
                        partner
                    )
                );
            }
        );

        meta.appendChild(
            partners
        );
    }

    if (feedbackFeatureEnabled()) {
        meta.appendChild(
            createFeedbackLauncher()
        );
    }

    meta.appendChild(
        createSourceCodeLink(
            'footer'
        )
    );

    meta.appendChild(
        createDonationLinks(
            'footer'
        )
    );

    const author =
        document.createElement(
            'span'
        );

    author.className =
        'footer-author';

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

    author.append(
        document.createTextNode(
            `${productName} ${authorLabel} `
        )
    );

    const link =
        document.createElement(
            'a'
        );

    link.href =
        normalizeConfiguredHttpUrl(
            config.authorUrl
        ) || '#';

    link.target =
        '_blank';

    link.rel =
        'noopener noreferrer';

    const strong =
        document.createElement(
            'strong'
        );

    strong.textContent =
        config.authorName ||
        'Apollyon';

    link.appendChild(
        strong
    );

    author.appendChild(
        link
    );

    if (config.version) {
        const version =
            document.createElement(
                'span'
            );

        version.className =
            'footer-version';

        version.textContent =
            `(${config.version})`;

        author.appendChild(
            version
        );
    }

    meta.appendChild(
        author
    );

    if (disclaimer.textContent) {
        footer.appendChild(
            disclaimer
        );
    }

    footer.appendChild(
        meta
    );

    const solutionSupport =
        $('solutionSupport');

    if (
        solutionSupport &&
        solutionSupport.dataset.donationBound !== 'true'
    ) {
        solutionSupport.dataset.donationBound =
            'true';

        solutionSupport.addEventListener(
            'click',
            () => openDonationDialog(
                'firing-solution'
            )
        );
    }
}
