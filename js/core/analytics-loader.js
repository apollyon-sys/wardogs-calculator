/* Load the hosted tracker only for the official application. */
(() => {
    const host = window.location.hostname;
    const local = ['localhost', '127.0.0.1', '[::1]', '::1'].includes(host);
    const allowLocal = local && window.__WARDOGS_ANALYTICS_ALLOW_LOCAL__ === true;

    if (
        window.__WARDOGS_ANALYTICS_DISABLED__ === true ||
        (host !== 'wardogs-artillery.com' && !allowLocal) ||
        window.__WARDOGS_GOATCOUNTER_LOADING__ === true
    ) {
        return;
    }

    const loader = document.currentScript;
    const endpoint = loader?.dataset.goatcounter;
    if (endpoint !== 'https://wardogs-artillery.goatcounter.com/count') return;

    window.__WARDOGS_GOATCOUNTER_LOADING__ = true;
    window.goatcounter = {
        no_onload: true,
        no_events: true,
        allow_local: allowLocal
    };

    const tracker = document.createElement('script');
    tracker.async = true;
    tracker.src = 'https://gc.zgo.at/count.js';
    tracker.dataset.goatcounter = endpoint;

    let counted = false;
    function countPageview() {
        if (counted || window.__WARDOGS_ANALYTICS_DISABLED__ === true) return;
        counted = true;

        let referrer = '';
        try {
            if (document.referrer) {
                const url = new URL(document.referrer);
                if (url.protocol === 'https:' || url.protocol === 'http:') {
                    referrer = url.origin + url.pathname;
                }
            }
        } catch (_) {
            // A malformed referrer must not interrupt the page.
        }

        try {
            window.goatcounter.count({
                path: window.location.pathname,
                title: document.title,
                referrer
            });
            window.__WARDOGS_GOATCOUNTER_READY__ = true;
            window.dispatchEvent(new Event('wardogs-analytics-ready'));
        } catch (_) {
            window.__WARDOGS_ANALYTICS_DISABLED__ = true;
        }
    }

    tracker.addEventListener('load', () => {
        const originalUrl = window.goatcounter?.url;
        if (typeof originalUrl !== 'function') {
            window.__WARDOGS_ANALYTICS_DISABLED__ = true;
            return;
        }
        // count.js adds location.search separately from the supplied page path.
        // Remove it for both beacon requests and the tracker's image fallback.
        window.goatcounter.url = function(vars) {
            const value = originalUrl.call(this, vars);
            if (!value) return value;
            const url = new URL(value);
            url.searchParams.delete('q');
            return url.href;
        };

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', countPageview, { once: true });
        } else {
            countPageview();
        }
    }, { once: true });
    tracker.addEventListener('error', () => {
        window.__WARDOGS_ANALYTICS_DISABLED__ = true;
    }, { once: true });

    document.head.appendChild(tracker);
})();
