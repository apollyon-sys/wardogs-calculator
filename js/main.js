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
    ready,
    attempts = 1,
    retryDelay = 500
}) {
    const loadOnce = () =>
        new Promise((resolve, reject) => {
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
                    () => {
                        existing.remove();
                        reject(
                            new Error(
                                `Failed to load runtime ${url}`
                            )
                        );
                    },
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
                () => {
                    script.remove();
                    reject(
                        new Error(
                            `Failed to load runtime ${url}`
                        )
                    );
                };

            document.head.appendChild(
                script
            );
        });

    let lastError = null;

    for (
        let attempt = 1;
        attempt <= attempts;
        attempt++
    ) {
        try {
            await loadOnce();
            return;
        } catch (error) {
            lastError = error;

            if (attempt >= attempts) {
                throw error;
            }

            await new Promise(
                resolve =>
                    window.setTimeout(
                        resolve,
                        retryDelay
                    )
            );
        }
    }

    throw lastError;
}

let terrainRuntimePromise = null;

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
                    'function',
            attempts: 2,
            retryDelay: 500
        });

        if (
            typeof initTerrainBallistics ===
            'function'
        ) {
            await initTerrainBallistics();
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

function requestTerrainBallisticsRuntime() {
    if (!terrainRuntimePromise) {
        terrainRuntimePromise =
            loadTerrainBallisticsRuntime();
    }

    return terrainRuntimePromise;
}

function requestTerrainBallisticsForCurrentState() {
    if (
        typeof S !== 'object' ||
        !S ||
        S.weapon !== 'spg'
    ) {
        return null;
    }

    return requestTerrainBallisticsRuntime();
}

async function loadSphPlatformCorrectionRuntime() {
    if (
        typeof isSphPlatformCorrectionEnabled !== 'function' ||
        !isSphPlatformCorrectionEnabled()
    ) {
        return false;
    }

    try {
        await loadRuntimeScript({
            selector: 'script[data-sph-platform-correction]',
            dataAttribute: 'sphPlatformCorrection',
            url: 'js/features/experimental-sph-platform-correction.js',
            ready: () =>
                typeof initSphPlatformCorrection ===
                'function'
        });

        return true;
    } catch (error) {
        console.warn(
            '[sph-platform] Experimental hull correction runtime unavailable; base calculator remains active.',
            error
        );

        return false;
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
            const diagnostics =
                typeof createClientErrorDiagnosticData ===
                    'function'
                    ? createClientErrorDiagnosticData(
                        error,
                        {
                            phase: 'lobby-runtime'
                        }
                    )
                    : {};

            trackOperationalFailure(
                'client-error',
                {
                    area: 'lobby',
                    type: 'runtime',
                    code: 'load',
                    ...diagnostics
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

        if (
            typeof initializeAccessibilityPreferences ===
                'function'
        ) {
            initializeAccessibilityPreferences();
        }

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

        /*
         * These registries are independent. Loading them in parallel removes
         * two avoidable request waterfalls on high-latency connections.
         */
        await Promise.all([
            loadWeapons(),
            loadMapAssets(),
            loadMaps()
        ]);

        const sphPlatformRuntimeLoaded =
            await loadSphPlatformCorrectionRuntime();

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
            hasRegistryEntry(MAPS, S.map)
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
            sphPlatformRuntimeLoaded &&
            typeof initSphPlatformCorrection ===
                'function'
        ) {
            initSphPlatformCorrection();
        }

        if (
            typeof initMobileUI ===
            'function'
        ) {
            initMobileUI();
        }

        loadSaveArtilleryPreference();

        syncMapStyleSelect();
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
        /*
         * Terrain3D is intentionally not scheduled here. It is loaded on the
         * first SPH-2 interaction instead, so mortar-only and browse-only
         * sessions never pay for the runtime, config or terrain manifests.
         */
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
            const diagnostics =
                typeof createClientErrorDiagnosticData ===
                    'function'
                    ? createClientErrorDiagnosticData(
                        error,
                        {
                            phase: 'app-init'
                        }
                    )
                    : {};

            trackOperationalFailure(
                'client-error',
                {
                    area: 'app',
                    type: 'init',
                    code: 'failed',
                    ...diagnostics
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
