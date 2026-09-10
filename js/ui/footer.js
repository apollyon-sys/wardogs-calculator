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
        label: 'Support me on Ko-fi',
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
        label: 'Donate via Boosty',
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

function createDonationLink(
    donation,
    placement
) {

    const link =
        document.createElement(
            'a'
        );

    link.className =
        `donation-link donation-link-${donation.id}`;

    link.href =
        donation.url;

    link.target =
        '_blank';

    link.rel =
        'noopener noreferrer';

    link.setAttribute(
        'aria-label',
        donation.label
    );

    const icon =
        document.createElement(
            'span'
        );

    icon.className =
        'donation-link-icon';

    icon.innerHTML =
        donation.icon;

    const label =
        document.createElement(
            'span'
        );

    label.className =
        'donation-link-label';

    label.textContent =
        donation.label;

    link.append(
        icon,
        label
    );

    link.addEventListener(
        'click',
        () => {
            if (
                typeof trackAnalytics ===
                'function'
            ) {
                trackAnalytics(
                    'donation-click',
                    {
                        service:
                            donation.id,

                        placement
                    }
                );
            }
        }
    );

    return link;
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

    DONATION_LINKS.forEach(
        donation => {
            links.appendChild(
                createDonationLink(
                    donation,
                    placement
                )
            );
        }
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
    cat: 'Meowback'
};

let feedbackRuntimePromise = null;

function feedbackFeatureEnabled() {
    return APP_CONFIG?.feedback?.enabled === true &&
        Boolean(String(APP_CONFIG?.feedback?.serverUrl || '').trim());
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
        config.authorUrl || '#';

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
}
