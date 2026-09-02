/* =========================
   INIT
   ========================= */

const APP_ASSET_VERSION = (() => {
    const source =
        document.currentScript?.src;

    if (!source) {
        return '';
    }

    try {
        return (
            new URL(source)
                .searchParams
                .get('v') ||
            ''
        );
    } catch {
        return '';
    }
})();

function versionRuntimeAsset(url) {
    if (!APP_ASSET_VERSION) {
        return url;
    }

    try {
        const resolved =
            new URL(
                url,
                document.baseURI
            );

        resolved.searchParams.set(
            'v',
            APP_ASSET_VERSION
        );

        return resolved.href;
    } catch {
        return url;
    }
}

async function loadRuntimeScript({
    selector,
    dataAttribute,
    url,
    ready
}) {
    await new Promise((resolve, reject) => {
        const existing =
            document.querySelector(
                selector
            );

        if (existing) {
            if (
                typeof ready ===
                    'function' &&
                ready()
            ) {
                resolve();
                return;
            }

            existing.addEventListener(
                'load',
                resolve,
                {
                    once: true
                }
            );

            existing.addEventListener(
                'error',
                () => reject(
                    new Error(
                        `Failed to load runtime ${url}`
                    )
                ),
                {
                    once: true
                }
            );

            return;
        }

        const script =
            document.createElement(
                'script'
            );

        script.src =
            versionRuntimeAsset(
                url
            );

        script.async = false;

        script.dataset[
            dataAttribute
        ] = '1';

        script.onload =
            resolve;

        script.onerror =
            () => reject(
                new Error(
                    `Failed to load runtime ${url}`
                )
            );

        document.head.appendChild(
            script
        );
    });
}

async function loadTerrainBallisticsRuntime() {
    try {
        await loadRuntimeScript({
            selector:
                'script[data-terrain-ballistics]',
            dataAttribute:
                'terrainBallistics',
            url:
                'js/features/terrain-ballistics.js',
            ready:
                () =>
                    typeof initTerrainBallistics ===
                    'function'
        });

        if (
            typeof initTerrainBallistics ===
            'function'
        ) {
            await initTerrainBallistics();
        }

        /*
         * The experimental layer wraps the verified Terrain3D endpoint
         * runtime. It is safe-by-default: disabled unless the user opts in,
         * and it keeps the flat-table solution for every non-SAFE arc.
         */
        await loadRuntimeScript({
            selector:
                'script[data-experimental-terrain-correction]',
            dataAttribute:
                'experimentalTerrainCorrection',
            url:
                'js/features/experimental-terrain-correction.js',
            ready:
                () =>
                    typeof initExperimentalTerrainCorrection ===
                    'function'
        });

        if (
            typeof initExperimentalTerrainCorrection ===
            'function'
        ) {
            await initExperimentalTerrainCorrection();
        }

    } catch (error) {
        console.warn(
            '[terrain-ballistics] Runtime unavailable; flat-table fallback remains active.',
            error
        );
    }
}

async function init() {

    try {

        applyTheme(
            getTheme()
        );

        bindThemeToggle();

        loadSavedTargets();

        await loadLanguages();

        await loadAppConfig();

        renderFooter();

        await loadWeapons();

        await loadMapAssets();

        await loadMaps();

        await loadTerrainBallisticsRuntime();

        initMapTools();

        initLayout();

        /*
         * Before the clamp below, so points restored from a previous
         * visit are pulled inside the map's bounds like any other.
         */
        loadMapPoints();

        /*
         * Sync initial state with the
         * selected preset map after the
         * map JSON files are available.
         */
        if (
            S.map !== 'custom' &&
            MAPS[S.map]
        ) {

            S.w =
                MAPS[S.map].w;

            S.h =
                MAPS[S.map].h;

            clamp(S.origin);
            clamp(S.target);
        }

        bindEvents();

        if (
            typeof initMobileUI ===
            'function'
        ) {
            initMobileUI();
        }

        loadSaveArtilleryPreference();

        updatePresetLock();
        updatePointLocksUI();

        applyLanguage();

        /*
         * Load and display MOTD.
         */
        await initMotd();

        inputs();

        resize();

        renderSavedTargets();

    } catch (error) {

        console.error(
            'Failed to initialize application:',
            error
        );

        document.documentElement.dataset.appInitState =
            'failed';

        const status =
            document.getElementById('status');

        if (status) {
            status.textContent =
                'Interactive tools failed to load. Please reload the page.';
        }
    }
}

init();
