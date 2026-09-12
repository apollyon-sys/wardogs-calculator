/* =========================
   RESOURCES
   ========================= */

function resourceURL(path) {
    return new URL(
        path,
        BASE_PATH
    ).href;
}

function getStaticResourceVersion() {
    const script =
        document.querySelector(
            'script[src*="js/app.bundle.js"], ' +
            'script[src*="js/mobile.bundle.js"], ' +
            'script[src*="js/main.js"]'
        );

    if (!script?.src) {
        return '';
    }

    try {
        return (
            new URL(script.src)
                .searchParams
                .get('v') ||
            ''
        );
    } catch {
        return '';
    }
}

function versionStaticResource(url) {
    const version =
        getStaticResourceVersion();

    if (!version) {
        return {
            url,
            versioned: false
        };
    }

    try {
        const resolved =
            new URL(url);

        resolved.searchParams.set(
            'v',
            version
        );

        return {
            url: resolved.href,
            versioned: true
        };
    } catch {
        return {
            url,
            versioned: false
        };
    }
}

async function fetchJSON(path) {

    const resource =
        versionStaticResource(
            resourceURL(path)
        );

    const url =
        resource.url;

    const normalizedPath =
        String(path || '');

    const mapMatch =
        normalizedPath.match(
            /^maps\/([^/]+)\.json(?:[?#].*)?$/i
        );

    const isMapResource =
        normalizedPath.startsWith(
            'maps/'
        );

    let failureCode =
        'network';

    try {
        const response =
            await fetch(
                url,
                {
                    /*
                     * Production JSON URLs carry the current build fingerprint,
                     * so cached data is invalidated automatically on deploy.
                     * Keep no-cache for local/dev builds with no fingerprint.
                     */
                    cache:
                        resource.versioned
                            ? 'force-cache'
                            : 'no-cache'
                }
            );

        if (!response.ok) {
            failureCode =
                `http-${response.status}`;

            throw new Error(
                `Failed to load ${url}: ${response.status} ${response.statusText}`
            );
        }

        failureCode =
            'decode';

        return await response.json();

    } catch (error) {
        if (
            typeof trackOperationalFailure ===
                'function'
        ) {
            const mapId =
                mapMatch &&
                ![
                    'index',
                    'assets'
                ].includes(
                    mapMatch[1].toLowerCase()
                )
                    ? mapMatch[1]
                    : '';

            trackOperationalFailure(
                isMapResource
                    ? 'map-load-failed'
                    : 'asset-load-failed',
                {
                    area:
                        isMapResource
                            ? 'maps'
                            : 'resources',
                    type: 'json',
                    map: mapId,
                    code: failureCode
                }
            );
        }

        throw error;
    }
}
