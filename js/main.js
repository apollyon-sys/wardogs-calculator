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
        if (
            typeof trackOperationalFailure ===
                'function'
        ) {
            trackOperationalFailure(
                'terrain-load-failed',
                {
                    area: 'runtime',
                    type: 'script',
                    code: 'load'
                }
            );
        }

        console.warn(
            '[terrain-ballistics] Runtime unavailable; flat-table fallback remains active.',
            error
        );
    }
}


/*
 * Optional network runtimes must not delay the first useful calculator paint.
 * The flat firing tables are immediately usable; Terrain3D, MOTD and lobby UI
 * can arrive just after the first render. Staggering them also avoids opening
 * every optional request at once on high-RTT routes.
 */
function scheduleAfterFirstPaint(
    task,
    {
        delay = 0,
        timeout = 1500,
        label = 'deferred startup task'
    } = {}
) {
    const run = () => {
        Promise.resolve()
            .then(task)
            .catch(error => {
                console.warn(
                    `[startup] ${label} failed.`,
                    error
                );
            });
    };

    requestAnimationFrame(() => {
        window.setTimeout(() => {
            if (
                typeof window.requestIdleCallback ===
                    'function'
            ) {
                window.requestIdleCallback(
                    run,
                    { timeout }
                );
                return;
            }

            run();
        }, delay);
    });
}

async function loadLobbyRuntime() {
    if (
        APP_CONFIG.collab?.enabled !== true ||
        !APP_CONFIG.collab.serverUrl
    ) {
        return;
    }

    try {
        await loadRuntimeScript({
            selector: 'script[data-lobby-runtime]',
            dataAttribute: 'lobbyRuntime',
            url: new URL(
                'js/collab/lobby.js',
                BASE_PATH
            ).href,
            ready: () =>
                typeof initLobby === 'function'
        });

        await initLobby();
    } catch (error) {
        if (
            typeof trackOperationalFailure ===
                'function'
        ) {
            trackOperationalFailure(
                'client-error',
                {
                    area: 'lobby',
                    type: 'runtime',
                    code: 'load'
                }
            );
        }

        console.warn(
            'Optional lobby interface could not load:',
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

        /*
         * App config is independent from locale discovery, so start it in
         * parallel instead of making the visible shell wait for both requests.
         */
        const appConfigPromise =
            loadAppConfig();

        await loadLanguages();

        /*
         * Localize the static shell before slower registry and Terrain3D
         * startup work. The later applyLanguage() call still performs the full
         * component sync once those registries are ready.
         */
        applyStaticLanguage();

        await appConfigPromise;

        renderFooter();

        /*
         * Load the last selected ids before their registries are populated.
         * loadWeapons() and loadMaps() validate them and fall back safely if
         * an old selection no longer exists.
         */
        loadAppSelections();

        await loadWeapons();

        await loadMapAssets();

        await loadMaps();

        applyMapQuerySelection();


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

        /* Persist validated fallbacks as well as valid restored selections. */
        persistAppSelections();

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

        inputs();

        resize();

        renderSavedTargets();

        /*
         * The useful calculator is now interactive. Optional network work is
         * intentionally outside the critical startup path and slightly
         * staggered so slow routes do not compete with the first render.
         */
        scheduleAfterFirstPaint(
            loadTerrainBallisticsRuntime,
            {
                delay: 0,
                timeout: 1000,
                label: 'Terrain3D runtime'
            }
        );

        scheduleAfterFirstPaint(
            initMotd,
            {
                delay: 150,
                timeout: 1500,
                label: 'MOTD'
            }
        );

        scheduleAfterFirstPaint(
            loadLobbyRuntime,
            {
                delay: 750,
                timeout: 2500,
                label: 'lobby runtime'
            }
        );

    } catch (error) {

        if (
            typeof trackOperationalFailure ===
                'function'
        ) {
            trackOperationalFailure(
                'client-error',
                {
                    area: 'app',
                    type: 'init',
                    code: 'failed'
                }
            );
        }

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
