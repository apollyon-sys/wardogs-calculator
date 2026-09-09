/* =========================
   RESOURCES
   ========================= */

function resourceURL(path) {
    return new URL(
        path,
        BASE_PATH
    ).href;
}

async function fetchJSON(path) {

    const url =
        resourceURL(path);

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
                    cache: 'no-cache'
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
