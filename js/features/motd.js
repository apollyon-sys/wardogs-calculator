const MOTD_DISMISSED_PREFIX =
    'wardogs-motd-dismissed:';

const MOTD_READ_PREFIX =
    'wardogs-motd-read:';

let currentMobileMotd =
    null;

let currentDesktopMotd =
    null;

function getLocalizedMotdValue(value) {
    if (typeof value === 'string') {
        return value;
    }

    if (!value || typeof value !== 'object') {
        return '';
    }

    return (
        value[LANG] ??
        value[DEFAULT_LANG] ??
        value.en ??
        Object.values(value).find(
            item => typeof item === 'string'
        ) ??
        ''
    );
}

function formatMotdMessage(message) {
    return String(message ?? '')
        .replace(/\\n/g, '\n');
}

function renderMotdMessage(container, message) {
    const text =
        formatMotdMessage(message);

    const linkPattern =
        /\[([^\]\n]+)\]\((https:\/\/[^)\s]+)\)/g;

    let cursor = 0;
    let match;

    while ((match = linkPattern.exec(text)) !== null) {
        if (match.index > cursor) {
            container.appendChild(
                document.createTextNode(
                    text.slice(cursor, match.index)
                )
            );
        }

        const link =
            document.createElement('a');

        link.textContent =
            match[1];

        link.href =
            match[2];

        link.target =
            '_blank';

        link.rel =
            'noopener noreferrer';

        container.appendChild(link);

        cursor =
            linkPattern.lastIndex;
    }

    if (cursor < text.length) {
        container.appendChild(
            document.createTextNode(
                text.slice(cursor)
            )
        );
    }
}

function isMotdActive(motd) {
    if (!motd || motd.enabled !== true) {
        return false;
    }

    const now = Date.now();

    if (motd.startsAt) {
        const startsAt = Date.parse(motd.startsAt);

        if (
            !Number.isNaN(startsAt) &&
            now < startsAt
        ) {
            return false;
        }
    }

    if (motd.endsAt) {
        const endsAt = Date.parse(motd.endsAt);

        if (
            !Number.isNaN(endsAt) &&
            now >= endsAt
        ) {
            return false;
        }
    }

    return true;
}

function getMotdStorageKey(id) {
    return `${MOTD_DISMISSED_PREFIX}${id}`;
}

function getMotdReadStorageKey(id) {
    return `${MOTD_READ_PREFIX}${id}`;
}

function isMotdDismissed(id) {
    if (!id) {
        return false;
    }

    try {
        return (
            localStorage.getItem(
                getMotdStorageKey(id)
            ) === 'true'
        );
    } catch (error) {
        console.warn(
            'Failed to read MOTD state:',
            error
        );

        return false;
    }
}

function dismissMotd(id) {
    if (!id) {
        return;
    }

    try {
        localStorage.setItem(
            getMotdStorageKey(id),
            'true'
        );
    } catch (error) {
        console.warn(
            'Failed to save MOTD state:',
            error
        );
    }
}

function isMotdRead(id) {
    if (!id) {
        return true;
    }

    try {
        return (
            localStorage.getItem(
                getMotdReadStorageKey(id)
            ) === 'true'
        );
    } catch (error) {
        console.warn(
            'Failed to read MOTD read state:',
            error
        );

        return false;
    }
}

function markMotdRead(id) {
    if (!id) {
        return;
    }

    try {
        localStorage.setItem(
            getMotdReadStorageKey(id),
            'true'
        );
    } catch (error) {
        console.warn(
            'Failed to save MOTD read state:',
            error
        );
    }
}

function isMobileMotdUI() {
    return document.body.classList.contains(
        'mobile-app'
    );
}

function removeExistingMotd() {
    document
        .querySelectorAll('.motd')
        .forEach(
            element => {
                element.remove();
            }
        );

    syncMobileMotdButton();
    syncDesktopMotdButton();
}

function closeMotd(
    container,
    motd,
    dontShowAgain
) {
    const dismiss =
        Boolean(
            dontShowAgain?.checked &&
            motd.id
        );

    if (dismiss) {
        dismissMotd(
            motd.id
        );
    }

    container.classList.add(
        'motd--closing'
    );

    window.setTimeout(
        () => {
            container.remove();

            if (
                dismiss &&
                isMobileMotdUI() &&
                currentMobileMotd?.id ===
                    motd.id
            ) {
                currentMobileMotd =
                    null;
            }

            syncMobileMotdButton();
            syncDesktopMotdButton();
        },
        150
    );
}

function createMotd(motd) {
    removeExistingMotd();

    const container =
        document.createElement(
            'aside'
        );

    container.className =
        'motd';

    container.setAttribute(
        'role',
        'status'
    );

    container.setAttribute(
        'aria-live',
        'polite'
    );

    const header =
        document.createElement(
            'div'
        );

    header.className =
        'motd-header';

    const title =
        document.createElement(
            'div'
        );

    title.className =
        'motd-title';

    title.textContent =
        getLocalizedMotdValue(
            motd.title
        ) ||
        'Message';

    const closeButton =
        document.createElement(
            'button'
        );

    closeButton.className =
        'motd-close';

    closeButton.type =
        'button';

    closeButton.textContent =
        '×';

    closeButton.setAttribute(
        'aria-label',
        tr('motdClose')
    );

    closeButton.title =
        tr('motdClose');

    header.append(
        title,
        closeButton
    );

    const message =
        document.createElement(
            'div'
        );

    message.className =
        'motd-message';

    renderMotdMessage(
        message,
        getLocalizedMotdValue(
            motd.message
        )
    );

    container.append(
        header,
        message
    );

    closeButton.addEventListener(
        'click',
        () => {

            closeMotd(
                container,
                motd,
                null
            );
        }
    );

    document.body.appendChild(
        container
    );

    requestAnimationFrame(
        () => {

            container.classList.add(
                'motd--visible'
            );

            syncMobileMotdButton();
            syncDesktopMotdButton();
        }
    );

    return container;
}

function createDesktopMotdButton() {
    let button =
        document.getElementById(
            'desktopMotdButton'
        );

    if (button) {
        return button;
    }

    button =
        document.createElement(
            'button'
        );

    button.id =
        'desktopMotdButton';

    button.type =
        'button';

    button.className =
        'desktop-motd-button';

    button.hidden = true;

    button.innerHTML = `
        <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            width="18"
            height="18"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
        >
            <path
                d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"
            ></path>
            <path d="M10 21h4"></path>
        </svg>
        <span class="desktop-motd-dot"></span>
    `;

    button.addEventListener(
        'click',
        event => {
            event.preventDefault();
            event.stopPropagation();

            if (!currentDesktopMotd) {
                return;
            }

            markMotdRead(
                currentDesktopMotd.id
            );

            button.hidden = true;

            createMotd(
                currentDesktopMotd
            );
        }
    );

    const controls =
        document.querySelector(
            'header .header-controls'
        );

    if (!controls) {
        return null;
    }

    const themeToggle =
        controls.querySelector(
            '#themeToggle'
        );

    if (themeToggle) {
        controls.insertBefore(
            button,
            themeToggle
        );
    } else {
        controls.appendChild(
            button
        );
    }

    return button;
}

function syncDesktopMotdButton() {
    if (isMobileMotdUI()) {
        return;
    }

    const button =
        createDesktopMotdButton();

    if (!button) {
        return;
    }

    const hasMotd =
        Boolean(
            currentDesktopMotd?.id
        );

    const fullMotdOpen =
        Boolean(
            document.querySelector(
                '.motd'
            )
        );

    button.hidden =
        !hasMotd ||
        fullMotdOpen;

    button.classList.toggle(
        'has-unread',
        hasMotd &&
        !isMotdRead(
            currentDesktopMotd.id
        )
    );

    const label =
        tr('motdTitle');

    button.setAttribute(
        'aria-label',
        label
    );

    button.title =
        label;
}

function createMobileMotdButton() {
    let button =
        document.getElementById(
            'mobileMotdButton'
        );

    if (button) {
        return button;
    }

    const controls =
        document.querySelector(
            '.mobile-header-controls'
        );

    if (!controls) {
        return null;
    }

    button =
        document.createElement(
            'button'
        );

    button.id =
        'mobileMotdButton';

    button.type =
        'button';

    button.className =
        'mobile-motd-button';

    button.hidden =
        true;

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
            stroke-linejoin="round"
        >
            <path
                d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"
            ></path>
            <path d="M10 21h4"></path>
        </svg>
    `;

    button.addEventListener(
        'click',
        event => {

            event.preventDefault();
            event.stopPropagation();

            if (!currentMobileMotd) {
                return;
            }

            const existing =
                document.querySelector(
                    '.motd'
                );

            if (existing) {
                existing.remove();
                syncMobileMotdButton();
                return;
            }

            /*
             * Reading is separate from "Don't show again":
             * opening the bell clears only the unread highlight,
             * while the same message can still be reopened later.
             */
            markMotdRead(
                currentMobileMotd.id
            );

            syncMobileMotdButton();

            createMotd(
                currentMobileMotd
            );
        }
    );

    const menuToggle =
        document.getElementById(
            'mobileSideMenuToggle'
        );

    if (
        menuToggle &&
        menuToggle.parentElement ===
            controls
    ) {
        controls.insertBefore(
            button,
            menuToggle
        );
    } else {
        controls.appendChild(
            button
        );
    }

    updateMotdLocalization();

    return button;
}

function syncMobileMotdButton() {
    if (!isMobileMotdUI()) {
        return;
    }

    const button =
        createMobileMotdButton();

    if (!button) {
        return;
    }

    const hasMotd =
        Boolean(
            currentMobileMotd?.id
        );

    button.hidden =
        !hasMotd;

    if (!hasMotd) {
        button.classList.remove(
            'has-unread'
        );

        button.setAttribute(
            'aria-expanded',
            'false'
        );

        return;
    }

    const unread =
        !isMotdRead(
            currentMobileMotd.id
        );

    button.classList.toggle(
        'has-unread',
        unread
    );

    button.setAttribute(
        'aria-expanded',
        document.querySelector(
            '.motd'
        )
            ? 'true'
            : 'false'
    );
}

function updateMotdLocalization() {
    const button =
        document.getElementById(
            'mobileMotdButton'
        );

    if (!button) {
        return;
    }

    const label =
        tr('motdTitle');

    button.setAttribute(
        'aria-label',
        label
    );

    button.title =
        label;
}

async function loadMotd() {
    try {
        const resource =
            versionStaticResource(
                resourceURL(
                    'data/motd.json'
                )
            );

        const response =
            await fetch(
                resource.url,
                {
                    cache:
                        resource.versioned
                            ? 'force-cache'
                            : 'no-cache'
                }
            );

        if (!response.ok) {
            if (
                response.status !== 404
            ) {
                console.warn(
                    `Failed to load MOTD: ${response.status}`
                );
            }

            return null;
        }

        const motd =
            await response.json();

        if (
            !isMotdActive(
                motd
            )
        ) {
            return null;
        }

        if (!motd.id) {
            console.warn(
                'MOTD is enabled but has no id.'
            );

            return null;
        }

        if (
            isMotdDismissed(
                motd.id
            )
        ) {
            return null;
        }

        return motd;

    } catch (error) {

        console.warn(
            'Failed to load MOTD:',
            error
        );

        return null;
    }
}

async function initMotd() {
    const motd =
        await loadMotd();

    /*
     * Never inject the full announcement automatically. A late async text
     * card can become the page's LCP long after the calculator is usable.
     * Mobile and desktop both expose a lightweight notification control; the
     * full MOTD is painted only after an explicit user interaction.
     */
    if (isMobileMotdUI()) {

        currentMobileMotd =
            motd;

        createMobileMotdButton();
        syncMobileMotdButton();

        return;
    }

    currentDesktopMotd =
        motd;

    createDesktopMotdButton();
    syncDesktopMotdButton();
}
