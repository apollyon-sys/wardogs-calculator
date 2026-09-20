/* =========================
   TERRAIN BALLISTICS
   ========================= */

(() => {
    'use strict';

    const CONFIG_URL =
        'data/ballistics/terrain-context.json';

    const state = {
        initialized: false,
        enabled: false,
        config: null,
        terrainDefinitions: new Map(),
        terrains: new Map(),
        terrainPending: new Map(),
        terrainFailures: new Set(),
        rerenderQueued: false,
        lastWarning: null,
        confirmedOrigin: null,
        levelControl: null
    };

    function terrainLog(...args) {
        console.info('[terrain-ballistics]', ...args);
    }

    function terrainWarn(message, error = null) {
        const signature = `${message}:${error?.message || ''}`;

        if (state.lastWarning === signature) {
            return;
        }

        state.lastWarning = signature;

        if (error) {
            console.warn('[terrain-ballistics]', message, error);
        } else {
            console.warn('[terrain-ballistics]', message);
        }
    }

    const TERRAIN_TEXT_KEYS = Object.freeze({
        terrainLoading: 'terrainLoading',
        terrainStatus: 'terrainStatus',
        warningTitle: 'sphLevelWarningTitle',
        warningBody: 'sphLevelWarningBody'
    });

    const TERRAIN_TEXT_FALLBACK = Object.freeze({
        terrainLoading: 'terrain loading',
        terrainStatus: 'ΔZ {dz} m · MIL not auto-corrected',
        warningTitle: 'LEVEL THE SPH-2 BEFORE FIRING',
        warningBody:
            'Vehicle tilt changes the actual range. Park the SPH-2 on the flattest ground available. In the gunner HUD, find the vehicle silhouette below STABILIZED / ASL: the two small side markers show lateral tilt. Reposition the vehicle until the markers are as centered and aligned as possible. Front/back slope also affects range, so avoid parking uphill or downhill.'
    });

    let cachedTextLanguage = null;
    let cachedTextTranslator = null;
    let cachedText = null;

    function currentLanguage() {
        return (
            typeof LANG === 'string' && LANG
                ? LANG
                : document.documentElement.lang || 'en'
        );
    }

    function uiText() {
        const language = currentLanguage();
        const translator =
            typeof tr === 'function'
                ? tr
                : null;

        if (
            cachedText &&
            cachedTextLanguage === language &&
            cachedTextTranslator === translator
        ) {
            return cachedText;
        }

        cachedTextLanguage = language;
        cachedTextTranslator = translator;
        cachedText = Object.fromEntries(
            Object.entries(TERRAIN_TEXT_KEYS)
                .map(([property, key]) => {
                    const translated =
                        translator?.(key);

                    return [
                        property,
                        translated && translated !== key
                            ? translated
                            : TERRAIN_TEXT_FALLBACK[property]
                    ];
                })
        );

        return cachedText;
    }

    function installWarningStyle() {
        if (document.getElementById('sphLevelWarningStyle')) {
            return;
        }

        const style = document.createElement('style');
        style.id = 'sphLevelWarningStyle';
        style.textContent = `
            .sph-level-warning {
                margin-top: 9px;
                padding: 10px 11px;
                border: 1px solid color-mix(in srgb, #f0b24a 72%, var(--border-light, #424a50));
                border-left: 4px solid #f0b24a;
                border-radius: 7px;
                background:
                    linear-gradient(
                        135deg,
                        color-mix(in srgb, #f0b24a 16%, var(--panel-bg, #171b1f)),
                        color-mix(in srgb, #f0b24a 6%, var(--panel-bg, #171b1f))
                    );
                box-shadow: 0 0 0 1px color-mix(in srgb, #f0b24a 8%, transparent);
            }

            .sph-level-warning[hidden] {
                display: none !important;
            }

            .sph-level-warning-title {
                display: flex;
                align-items: center;
                gap: 7px;
                color: #f0b24a;
                font-size: 11px;
                font-weight: 900;
                line-height: 1.25;
                letter-spacing: .035em;
                text-transform: uppercase;
            }

            .sph-level-warning-icon {
                flex: 0 0 auto;
                font-size: 15px;
                line-height: 1;
            }

            .sph-level-warning-body {
                margin-top: 6px;
                color: var(--text, #e6e9eb);
                font-size: 10px;
                line-height: 1.45;
            }
        `;
        document.head.appendChild(style);
    }

    function ensureSphLevelWarning() {
        let root = document.getElementById('sphLevelWarning');

        if (root) {
            return root;
        }

        const isMobile =
            document.body.classList.contains(
                'mobile-app'
            );

        const resultCard =
            isMobile
                ? document.querySelector(
                    '.mobile-result-details'
                )
                : document.querySelector(
                    '.solution-result'
                );

        const fallbackCard =
            resultCard ||
            document.querySelector(
                '.mobile-result-details'
            ) ||
            document.querySelector(
                '.solution-result'
            );

        if (!fallbackCard) {
            return null;
        }

        installWarningStyle();

        root = document.createElement('div');
        root.id = 'sphLevelWarning';
        root.className = 'sph-level-warning';
        root.setAttribute('role', 'note');

        const title = document.createElement('div');
        title.className = 'sph-level-warning-title';

        const icon = document.createElement('span');
        icon.className = 'sph-level-warning-icon';
        icon.setAttribute('aria-hidden', 'true');
        icon.textContent = '⚠';

        const titleText = document.createElement('span');
        titleText.className = 'sph-level-warning-title-text';

        const body = document.createElement('div');
        body.className = 'sph-level-warning-body';

        title.append(icon, titleText);
        root.append(title, body);

        fallbackCard.insertAdjacentElement('afterend', root);

        return root;
    }

    function syncSphLevelWarning() {
        const root = ensureSphLevelWarning();

        if (!root) {
            return;
        }

        const isSph =
            typeof S === 'object' &&
            S &&
            S.weapon === 'spg';

        root.hidden = !isSph;

        if (!isSph) {
            return;
        }

        const text = uiText();
        const title = root.querySelector('.sph-level-warning-title-text');
        const body = root.querySelector('.sph-level-warning-body');

        if (title) {
            title.textContent = text.warningTitle;
        }

        if (body) {
            body.textContent = text.warningBody;
        }
    }

    function formatTerrainBallisticsStatus(meta) {
        if (!meta?.available) {
            return '';
        }

        const text = uiText();

        if (meta.pendingTerrain) {
            return text.terrainLoading;
        }

        if (!Number.isFinite(meta.deltaZ)) {
            return '';
        }

        const dz =
            `${meta.deltaZ >= 0 ? '+' : ''}${meta.deltaZ.toFixed(1)}`;

        return text.terrainStatus.replace('{dz}', dz);
    }

    const TERRAIN_FETCH_ATTEMPTS = 2;
    const TERRAIN_RETRY_DELAY_MS = 500;

    function waitForTerrainRetry() {
        return new Promise(
            resolve =>
                window.setTimeout(
                    resolve,
                    TERRAIN_RETRY_DELAY_MS
                )
        );
    }

    function isRetryableTerrainStatus(status) {
        return (
            status === 408 ||
            status === 425 ||
            status === 429 ||
            status >= 500
        );
    }

    async function fetchTerrainResource(
        url,
        options = undefined
    ) {
        let lastError = null;

        for (
            let attempt = 1;
            attempt <= TERRAIN_FETCH_ATTEMPTS;
            attempt++
        ) {
            try {
                const response =
                    await fetch(
                        url,
                        options
                    );

                if (response.ok) {
                    return response;
                }

                const error = new Error(
                    `${response.status} ${response.statusText} for ${url}`
                );

                if (
                    !isRetryableTerrainStatus(
                        response.status
                    )
                ) {
                    error.retryable = false;
                    throw error;
                }

                if (
                    attempt >= TERRAIN_FETCH_ATTEMPTS
                ) {
                    throw error;
                }

                lastError = error;

            } catch (error) {
                lastError = error;

                if (
                    error?.retryable === false ||
                    attempt >= TERRAIN_FETCH_ATTEMPTS
                ) {
                    throw error;
                }
            }

            await waitForTerrainRetry();
        }

        throw lastError ||
            new Error(
                `Failed to load terrain resource ${url}`
            );
    }

    async function fetchJson(url) {
        const response =
            await fetchTerrainResource(
                url
            );

        return response.json();
    }

    function validateConfig(config) {
        if (!config || typeof config !== 'object') {
            throw new Error('Invalid terrain ballistic config');
        }

        if (config.schema !== 'wardogs-terrain-ballistics-v1') {
            throw new Error(
                `Unsupported terrain config schema: ${config.schema}`
            );
        }

        const hasRegistry =
            config.terrainMaps &&
            typeof config.terrainMaps === 'object' &&
            Object.keys(config.terrainMaps).length > 0;

        const hasLegacySingleMap =
            Boolean(config.mapId && config.terrainManifest);

        if (!hasRegistry && !hasLegacySingleMap) {
            throw new Error('Terrain config has no supported map manifests');
        }
    }

    function normalizeTerrainMaps(config) {
        const maps = new Map();

        if (
            config.terrainMaps &&
            typeof config.terrainMaps === 'object'
        ) {
            for (const [mapId, definition] of Object.entries(config.terrainMaps)) {
                const manifest =
                    typeof definition === 'string'
                        ? definition
                        : definition?.terrainManifest;

                if (mapId && manifest) {
                    maps.set(mapId, {
                        mapId,
                        terrainManifest: manifest
                    });
                }
            }
        }

        /*
         * Backward compatibility with the original single-map v1 config.
         * It also keeps Bakurani functional if terrainMaps is accidentally
         * stripped by an older deployment step.
         */
        if (
            config.mapId &&
            config.terrainManifest &&
            !maps.has(config.mapId)
        ) {
            maps.set(config.mapId, {
                mapId: config.mapId,
                terrainManifest: config.terrainManifest
            });
        }

        return maps;
    }

    function validateTerrainManifest(manifest, expectedMapId) {
        if (
            !manifest ||
            manifest.format !== 'wardogs-landscape-collision-u16-v1' ||
            manifest.verticesPerSide !== 511 ||
            manifest.chunkQuads !== 510 ||
            !manifest.chunks
        ) {
            throw new Error('Unsupported or incomplete Terrain3D manifest');
        }

        if (
            manifest.mapId &&
            expectedMapId &&
            manifest.mapId !== expectedMapId
        ) {
            throw new Error(
                `Terrain manifest mapId ${manifest.mapId} != ${expectedMapId}`
            );
        }

        const mappingValues = [
            Number(manifest.globalQuadOffsetX),
            Number(manifest.globalQuadOffsetY),
            landscapeQuadsPerGameUnit(manifest, 'X'),
            landscapeQuadsPerGameUnit(manifest, 'Y')
        ];

        if (
            !mappingValues.every(Number.isFinite) ||
            mappingValues[2] === 0 ||
            mappingValues[3] === 0
        ) {
            throw new Error('Terrain manifest has invalid coordinate mapping');
        }
    }

    async function loadTerrainDefinition(definition) {
        const manifestUrl = new URL(
            definition.terrainManifest,
            document.baseURI
        ).href;

        const manifest = await fetchJson(manifestUrl);
        validateTerrainManifest(manifest, definition.mapId);

        return {
            mapId: definition.mapId,
            manifest,
            manifestUrl,
            chunkCache: new Map(),
            chunkPending: new Map()
        };
    }

    async function ensureTerrainBallisticsMap(mapId) {
        if (
            !state.config ||
            !mapId ||
            mapId === 'custom'
        ) {
            return false;
        }

        if (state.terrains.has(mapId)) {
            return true;
        }

        if (state.terrainFailures.has(mapId)) {
            return false;
        }

        if (state.terrainPending.has(mapId)) {
            return state.terrainPending.get(mapId);
        }

        const definition =
            state.terrainDefinitions.get(mapId);

        if (!definition) {
            return false;
        }

        const pending =
            loadTerrainDefinition(definition)
                .then(terrain => {
                    state.terrains.set(
                        terrain.mapId,
                        terrain
                    );

                    terrainLog(
                        'loaded',
                        `map=${terrain.mapId}`,
                        `chunks=${Object.keys(terrain.manifest.chunks).length}`
                    );

                    queueResultRerender();
                    return true;
                })
                .catch(error => {
                    state.terrainFailures.add(
                        definition.mapId
                    );

                    if (
                        typeof trackOperationalFailure ===
                            'function'
                    ) {
                        trackOperationalFailure(
                            'terrain-load-failed',
                            {
                                area: 'terrain',
                                type: 'manifest',
                                map: definition.mapId,
                                code: 'load'
                            }
                        );
                    }

                    terrainWarn(
                        `Failed to initialize Terrain3D for map ${definition.mapId}; that map will use flat-table fallback.`,
                        error
                    );

                    return false;
                })
                .finally(() => {
                    state.terrainPending.delete(
                        definition.mapId
                    );
                });

        state.terrainPending.set(
            definition.mapId,
            pending
        );

        return pending;
    }

    async function initTerrainBallistics() {
        if (state.initialized) {
            return state.enabled;
        }

        state.initialized = true;

        try {
            const config = await fetchJson(CONFIG_URL);
            validateConfig(config);

            state.config = config;
            state.terrainDefinitions =
                normalizeTerrainMaps(config);
            state.enabled =
                state.terrainDefinitions.size > 0;

            if (!state.enabled) {
                throw new Error('Terrain3D config has no supported maps');
            }

            const currentMapId =
                typeof S === 'object' && S
                    ? S.map
                    : '';

            if (
                currentMapId &&
                currentMapId !== 'custom'
            ) {
                await ensureTerrainBallisticsMap(
                    currentMapId
                );
            }

            if (!config.calibration?.ready) {
                terrainWarn(
                    'Runtime hook is installed but calibration.ready=false; flat-table fallback remains authoritative.'
                );
            }

            /*
             * Safe release: Terrain3D is informational only.
             * Never modify the firing solution automatically.
             */
            syncSphLevelWarning();
            queueResultRerender();

            return true;
        } catch (error) {
            state.enabled = false;

            if (
                typeof trackOperationalFailure ===
                    'function'
            ) {
                trackOperationalFailure(
                    'terrain-load-failed',
                    {
                        area: 'terrain',
                        type: 'runtime',
                        code: 'init'
                    }
                );
            }

            terrainWarn(
                'Failed to initialize terrain ballistics; using flat-table fallback.',
                error
            );
            return false;
        }
    }

    function isFinitePoint(point) {
        return Boolean(
            point &&
            Number.isFinite(Number(point.x)) &&
            Number.isFinite(Number(point.y))
        );
    }

    function landscapeQuadsPerGameUnit(manifest, axis) {
        const specific = Number(
            manifest?.[`gameUnitsToLandscapeQuads${axis}`]
        );

        if (Number.isFinite(specific) && specific !== 0) {
            return specific;
        }

        const legacy = Number(
            manifest?.gameUnitsToLandscapeQuads
        );

        return legacy;
    }

    function withinCoverage(gameX, gameY, manifest) {
        const coverage = manifest.coverage;

        if (!coverage) {
            return true;
        }

        const epsilon = 1e-7;

        return (
            gameX >= coverage.gameXMin - epsilon &&
            gameX <= coverage.gameXMax + epsilon &&
            gameY >= coverage.gameYMin - epsilon &&
            gameY <= coverage.gameYMax + epsilon
        );
    }

    function clamp(value, min, max) {
        return Math.min(max, Math.max(min, value));
    }

    function locateTerrainPoint(terrain, point) {
        const manifest = terrain.manifest;
        const gameX = Number(point.x);
        const gameY = Number(point.y);

        if (!withinCoverage(gameX, gameY, manifest)) {
            return null;
        }

        const quadX =
            Number(manifest.globalQuadOffsetX) +
            gameX * landscapeQuadsPerGameUnit(manifest, 'X');

        const quadY =
            Number(manifest.globalQuadOffsetY) +
            gameY * landscapeQuadsPerGameUnit(manifest, 'Y');

        const chunkQuads = Number(manifest.chunkQuads);

        let chunkX = Math.floor(quadX / chunkQuads);
        let chunkY = Math.floor(quadY / chunkQuads);

        chunkX = clamp(
            chunkX,
            Number(manifest.chunkXMin),
            Number(manifest.chunkXMax)
        );

        chunkY = clamp(
            chunkY,
            Number(manifest.chunkYMin),
            Number(manifest.chunkYMax)
        );

        const localX = clamp(
            quadX - chunkX * chunkQuads,
            0,
            chunkQuads
        );

        const localY = clamp(
            quadY - chunkY * chunkQuads,
            0,
            chunkQuads
        );

        return {
            chunkX,
            chunkY,
            localX,
            localY,
            key: `${chunkX},${chunkY}`
        };
    }

    function getChunkEntry(terrain, key) {
        return terrain.manifest?.chunks?.[key] || null;
    }

    function resolveChunkUrl(terrain, entry) {
        return new URL(
            entry.file,
            terrain.manifestUrl
        ).href;
    }

    async function loadChunk(terrain, key) {
        if (terrain.chunkCache.has(key)) {
            return terrain.chunkCache.get(key);
        }

        if (terrain.chunkPending.has(key)) {
            return terrain.chunkPending.get(key);
        }

        const entry = getChunkEntry(terrain, key);

        if (!entry) {
            throw new Error(
                `Terrain chunk ${terrain.mapId}:${key} is missing from manifest`
            );
        }

        const promise = (async () => {
            const response =
                await fetchTerrainResource(
                    resolveChunkUrl(
                        terrain,
                        entry
                    )
                );

            const buffer = await response.arrayBuffer();
            const expectedBytes = Number(entry.bytes || 0);

            if (
                expectedBytes > 0 &&
                buffer.byteLength !== expectedBytes
            ) {
                throw new Error(
                    `Terrain chunk ${terrain.mapId}:${key} byte length ${buffer.byteLength} != ${expectedBytes}`
                );
            }

            const chunk = {
                entry,
                view: new DataView(buffer)
            };

            terrain.chunkCache.set(key, chunk);
            return chunk;
        })();

        terrain.chunkPending.set(key, promise);

        try {
            return await promise;
        } finally {
            terrain.chunkPending.delete(key);
        }
    }

    function queueResultRerender() {
        if (state.rerenderQueued) {
            return;
        }

        state.rerenderQueued = true;

        requestAnimationFrame(() => {
            state.rerenderQueued = false;

            if (typeof result === 'function') {
                result();
            }
        });
    }

    function primeTerrainForPoints(terrain, points) {
        const keys = new Set();

        for (const point of points) {
            const located = locateTerrainPoint(terrain, point);

            if (located) {
                keys.add(located.key);
            }
        }

        const missing = [...keys].filter(
            key => !terrain.chunkCache.has(key)
        );

        if (!missing.length) {
            return;
        }

        Promise.all(missing.map(key => loadChunk(terrain, key)))
            .then(queueResultRerender)
            .catch(error => {
                if (
                    typeof trackOperationalFailure ===
                        'function'
                ) {
                    trackOperationalFailure(
                        'terrain-load-failed',
                        {
                            area: 'terrain',
                            type: 'chunk',
                            map: terrain.mapId,
                            code: 'load'
                        }
                    );
                }

                terrainWarn(
                    `Could not load required ${terrain.mapId} terrain payload; using flat-table fallback.`,
                    error
                );
            });
    }

    function rawHeightAt(terrain, chunk, x, y) {
        const side = Number(terrain.manifest.verticesPerSide);
        const index = y * side + x;
        return chunk.view.getUint16(index * 2, true);
    }

    function decodeRawHeight(terrain, raw, entry) {
        const minLocalZ = Number(entry.minLocalZ);
        const maxLocalZ = Number(entry.maxLocalZ);

        if (
            !Number.isFinite(minLocalZ) ||
            !Number.isFinite(maxLocalZ)
        ) {
            return null;
        }

        const localZ =
            minLocalZ +
            (raw / 65535) * (maxLocalZ - minLocalZ);

        return (
            Number(terrain.manifest.worldZOffsetMeters) +
            localZ * Number(terrain.manifest.worldZScaleMetersPerLocalUnit)
        );
    }

    function terrainHeightAtPointSync(terrain, point) {
        const located = locateTerrainPoint(terrain, point);

        if (!located) {
            return null;
        }

        const chunk = terrain.chunkCache.get(located.key);

        if (!chunk) {
            return null;
        }

        const maxVertex =
            Number(terrain.manifest.verticesPerSide) - 1;

        const x0 = clamp(Math.floor(located.localX), 0, maxVertex);
        const y0 = clamp(Math.floor(located.localY), 0, maxVertex);
        const x1 = clamp(x0 + 1, 0, maxVertex);
        const y1 = clamp(y0 + 1, 0, maxVertex);

        const fx = located.localX - x0;
        const fy = located.localY - y0;

        const z00 = decodeRawHeight(
            terrain,
            rawHeightAt(terrain, chunk, x0, y0),
            chunk.entry
        );

        const z10 = decodeRawHeight(
            terrain,
            rawHeightAt(terrain, chunk, x1, y0),
            chunk.entry
        );

        const z01 = decodeRawHeight(
            terrain,
            rawHeightAt(terrain, chunk, x0, y1),
            chunk.entry
        );

        const z11 = decodeRawHeight(
            terrain,
            rawHeightAt(terrain, chunk, x1, y1),
            chunk.entry
        );

        if (
            ![z00, z10, z01, z11].every(Number.isFinite)
        ) {
            return null;
        }

        const top = z00 + (z10 - z00) * fx;
        const bottom = z01 + (z11 - z01) * fx;

        return top + (bottom - top) * fy;
    }

    function interpolateSeries(points, x) {
        if (!Array.isArray(points) || !points.length) {
            return null;
        }

        const sorted = points
            .map(item => [Number(item[0]), Number(item[1])])
            .filter(item => item.every(Number.isFinite))
            .sort((a, b) => a[0] - b[0]);

        if (!sorted.length) {
            return null;
        }

        const epsilon = 1e-9;

        for (const [pointX, pointY] of sorted) {
            if (Math.abs(pointX - x) <= epsilon) {
                return pointY;
            }
        }

        if (
            x < sorted[0][0] ||
            x > sorted[sorted.length - 1][0]
        ) {
            return null;
        }

        for (let i = 0; i < sorted.length - 1; i++) {
            const left = sorted[i];
            const right = sorted[i + 1];

            if (x > left[0] && x < right[0]) {
                const t = (x - left[0]) / (right[0] - left[0]);
                return left[1] + (right[1] - left[1]) * t;
            }
        }

        return null;
    }

    function bracket(values, x) {
        if (!Array.isArray(values) || values.length < 2) {
            return null;
        }

        const nums = values.map(Number);

        if (!nums.every(Number.isFinite)) {
            return null;
        }

        if (x < nums[0] || x > nums[nums.length - 1]) {
            return null;
        }

        for (let i = 0; i < nums.length; i++) {
            if (Math.abs(nums[i] - x) <= 1e-9) {
                return {
                    i0: i,
                    i1: i,
                    t: 0
                };
            }
        }

        for (let i = 0; i < nums.length - 1; i++) {
            if (x > nums[i] && x < nums[i + 1]) {
                return {
                    i0: i,
                    i1: i + 1,
                    t: (x - nums[i]) / (nums[i + 1] - nums[i])
                };
            }
        }

        return null;
    }

    function interpolateHeightCorrection(grid, distanceMeters, deltaZMeters) {
        const distances = grid?.distancesMeters;
        const deltaZValues = grid?.deltaZMeters;
        const values = grid?.milCorrections;

        if (
            !Array.isArray(distances) ||
            !Array.isArray(deltaZValues) ||
            !Array.isArray(values)
        ) {
            return null;
        }

        const bx = bracket(distances, distanceMeters);
        const bz = bracket(deltaZValues, deltaZMeters);

        if (!bx || !bz) {
            return null;
        }

        const row0 = values[bz.i0];
        const row1 = values[bz.i1];

        if (!Array.isArray(row0) || !Array.isArray(row1)) {
            return null;
        }

        const q00 = Number(row0[bx.i0]);
        const q10 = Number(row0[bx.i1]);
        const q01 = Number(row1[bx.i0]);
        const q11 = Number(row1[bx.i1]);

        if (![q00, q10, q01, q11].every(Number.isFinite)) {
            return null;
        }

        const top = q00 + (q10 - q00) * bx.t;
        const bottom = q01 + (q11 - q01) * bx.t;

        return top + (bottom - top) * bz.t;
    }

    function cloneSolutions(solutions) {
        return {
            inRange: Boolean(solutions?.inRange),
            single: solutions?.single
                ? { ...solutions.single }
                : null,
            low: solutions?.low
                ? { ...solutions.low }
                : null,
            high: solutions?.high
                ? { ...solutions.high }
                : null
        };
    }

    function getTerrainBallisticSolutions(context) {
        const fallback = {
            solutions: context?.solutions,
            meta: null
        };

        if (
            !context?.solutions ||
            !state.enabled ||
            !state.config ||
            !isFinitePoint(context.origin) ||
            !isFinitePoint(context.target)
        ) {
            return fallback;
        }

        if (
            !state.terrains.has(context.mapId) &&
            state.terrainDefinitions.has(context.mapId) &&
            !state.terrainFailures.has(context.mapId)
        ) {
            ensureTerrainBallisticsMap(
                context.mapId
            );

            return {
                solutions: context.solutions,
                meta: {
                    available: true,
                    pendingTerrain: true,
                    applied: false,
                    reason: 'terrain-manifest-pending',
                    mapId: context.mapId
                }
            };
        }

        const terrain = state.terrains.get(context.mapId);

        if (!terrain) {
            return fallback;
        }

        const originLocation =
            locateTerrainPoint(terrain, context.origin);

        const targetLocation =
            locateTerrainPoint(terrain, context.target);

        /*
         * Outside verified coverage is a normal safe-fallback condition.
         * Do not label it as "terrain loading" and never clamp an unsupported
         * coordinate to the final recovered edge chunk.
         */
        if (!originLocation || !targetLocation) {
            return fallback;
        }

        primeTerrainForPoints(
            terrain,
            [context.origin, context.target]
        );

        const originZ =
            terrainHeightAtPointSync(terrain, context.origin);

        const targetZ =
            terrainHeightAtPointSync(terrain, context.target);

        if (
            !Number.isFinite(originZ) ||
            !Number.isFinite(targetZ)
        ) {
            return {
                solutions: context.solutions,
                meta: {
                    available: true,
                    pendingTerrain: true,
                    applied: false,
                    reason: 'terrain-pending',
                    mapId: terrain.mapId
                }
            };
        }

        return {
            /*
             * RELEASE SAFETY INVARIANT:
             * Terrain3D never changes MIL in this build.
             */
            solutions: context.solutions,
            meta: {
                available: true,
                pendingTerrain: false,
                applied: false,
                reason: 'information-only',
                mapId: terrain.mapId,
                originZ,
                targetZ,
                deltaZ: targetZ - originZ
            }
        };
    }

    function getTerrainBallisticsState() {
        let cachedChunks = 0;

        for (const terrain of state.terrains.values()) {
            cachedChunks += terrain.chunkCache.size;
        }

        return {
            initialized: state.initialized,
            enabled: state.enabled,
            ready: state.terrains.size > 0,
            calibrated: false,
            autoCorrectionEnabled: false,
            mode: 'terrain-information-only',
            supportedMaps: [
                ...state.terrainDefinitions.keys()
            ],
            loadedMaps: [...state.terrains.keys()],
            cachedChunks
        };
    }

    window.initTerrainBallistics =
        initTerrainBallistics;

    window.getTerrainBallisticSolutions =
        getTerrainBallisticSolutions;

    window.ensureTerrainBallisticsMap =
        ensureTerrainBallisticsMap;

    window.getTerrainBallisticsState =
        getTerrainBallisticsState;

    window.formatTerrainBallisticsStatus =
        formatTerrainBallisticsStatus;

    window.syncSphLevelWarning =
        syncSphLevelWarning;
})();
