/* =========================
   EXPERIMENTAL TERRAIN CORRECTION
   ========================= */

(() => {
    'use strict';

    const CONFIG_URL =
        'data/ballistics/terrain-context.json';

    const DEFAULT_STORAGE_KEY =
        'wardogs-experimental-terrain-correction';

    const state = {
        initialized: false,
        available: false,
        enabled: false,
        ready: false,
        loading: false,
        config: null,
        payloads: {
            lowMain: null,
            lowExtension: null,
            highV2: null
        },
        loadPromise: null,
        baseResolver: null,
        baseFormatter: null,
        lastDisplayMeta: null,
        lastError: null,
        rerenderQueued: false
    };

    const TERRAIN_TEXT_KEYS = Object.freeze({
        title: 'experimentalTerrainCorrectionTitle',
        toggle: 'experimentalTerrainCorrectionToggle',
        note: 'experimentalTerrainCorrectionNote',
        table: 'experimentalTerrainCorrectionTable',
        terrain: 'experimentalTerrainCorrectionTerrain',
        low: 'experimentalTerrainCorrectionLow',
        high: 'experimentalTerrainCorrectionHigh',
        safe: 'experimentalTerrainCorrectionSafe',
        fallback: 'experimentalTerrainCorrectionFallback',
        unreachable: 'experimentalTerrainCorrectionUnreachable',
        loading: 'experimentalTerrainCorrectionLoading',
        unavailable: 'experimentalTerrainCorrectionUnavailable',
        unsupported: 'experimentalTerrainCorrectionUnsupported',
        enabled: 'experimentalTerrainCorrectionEnabled',
        disabled: 'experimentalTerrainCorrectionDisabled',
        applied: 'experimentalTerrainCorrectionApplied',
        preview: 'experimentalTerrainCorrectionPreview',
        statusOn: 'experimentalTerrainCorrectionStatusOn',
        statusOff: 'experimentalTerrainCorrectionStatusOff',
        statusFallback: 'experimentalTerrainCorrectionStatusFallback',
        candidateLoading: 'experimentalTerrainCorrectionCandidateLoading'
    });

    const TERRAIN_TEXT_FALLBACK = Object.freeze({
        title: 'Experimental Terrain3D correction',
        toggle: 'Use experimental Terrain3D correction',
        note: 'Opt-in only. Platform/chassis tilt is not corrected. The flat table is used automatically whenever a candidate is not SAFE.',
        table: 'Table',
        terrain: 'Terrain3D',
        low: 'LOW',
        high: 'HIGH',
        safe: 'SAFE',
        fallback: 'TABLE FALLBACK',
        unreachable: 'UNREACHABLE',
        loading: 'Loading candidate data…',
        unavailable: 'Terrain3D correction is unavailable for this firing solution.',
        unsupported: 'No certified Terrain3D candidate for this arc.',
        enabled: 'ON',
        disabled: 'OFF',
        applied: 'applied',
        preview: 'preview',
        statusOn: 'Experimental Terrain3D ON',
        statusOff: 'Experimental Terrain3D OFF',
        statusFallback: 'Table fallback',
        candidateLoading: 'candidate loading'
    });

    let cachedTextLanguage = null;
    let cachedTextTranslator = null;
    let cachedText = null;

    function currentLanguage() {
        return (
            typeof LANG === 'string' &&
            LANG
                ? LANG
                : document.documentElement.lang ||
                'en'
        );
    }

    function text() {
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

    function finite(value) {
        return Number.isFinite(
            Number(value)
        );
    }

    function storageKey() {
        return (
            state.config?.storageKey ||
            DEFAULT_STORAGE_KEY
        );
    }

    function readStoredEnabled() {
        try {
            const value =
                localStorage.getItem(
                    storageKey()
                );

            if (value === null) {
                return Boolean(
                    state.config?.defaultEnabled
                );
            }

            return (
                value === '1' ||
                value === 'true'
            );
        } catch {
            return false;
        }
    }

    function writeStoredEnabled(enabled) {
        try {
            localStorage.setItem(
                storageKey(),
                enabled ? '1' : '0'
            );
        } catch {
            /* Optional preference only. */
        }
    }

    async function sha256Hex(value) {
        if (
            !globalThis.crypto?.subtle ||
            typeof TextEncoder === 'undefined'
        ) {
            return null;
        }

        const digest =
            await crypto.subtle.digest(
                'SHA-256',
                new TextEncoder().encode(
                    value
                )
            );

        return [...new Uint8Array(digest)]
            .map(
                byte =>
                    byte
                        .toString(16)
                        .padStart(2, '0')
            )
            .join('');
    }

    async function fetchJson(url) {
        const response =
            await fetch(
                url
            );

        if (!response.ok) {
            throw new Error(
                `${response.status} ${response.statusText} for ${url}`
            );
        }

        return response.json();
    }

    async function fetchVerifiedPayload(
        definition,
        label
    ) {
        const url =
            typeof definition === 'string'
                ? definition
                : definition?.url;

        const expectedSha =
            typeof definition === 'object'
                ? definition?.sha256
                : null;

        if (!url) {
            throw new Error(
                `Missing ${label} payload URL`
            );
        }

        const response =
            await fetch(
                url
            );

        if (!response.ok) {
            throw new Error(
                `${response.status} ${response.statusText} loading ${label}`
            );
        }

        const raw =
            await response.text();

        if (!/^[0-9a-f]{64}$/i.test(String(expectedSha || ''))) {
            throw new Error(
                `Missing or invalid ${label} SHA256`
            );
        }

        const actualSha =
            await sha256Hex(raw);

        if (!actualSha) {
            throw new Error(
                `${label} SHA256 verification is unavailable`
            );
        }

        if (
            actualSha.toLowerCase() !==
            String(expectedSha).toLowerCase()
        ) {
            throw new Error(
                `${label} SHA256 mismatch: ${actualSha}`
            );
        }

        return JSON.parse(raw);
    }

    function lowMainInterval(
        nodes,
        distance
    ) {
        if (
            !Array.isArray(nodes) ||
            nodes.length < 2
        ) {
            return -1;
        }

        if (
            distance < nodes[0] ||
            distance >
                nodes[
                    nodes.length - 1
                ]
        ) {
            return -1;
        }

        if (
            distance ===
            Number(
                nodes[
                    nodes.length - 1
                ]
            )
        ) {
            return (
                nodes.length -
                2
            );
        }

        let lo = 0;
        let hi =
            nodes.length - 1;

        while (lo + 1 < hi) {
            const mid =
                (lo + hi) >> 1;

            if (
                Number(nodes[mid]) <=
                distance
            ) {
                lo = mid;
            } else {
                hi = mid;
            }
        }

        return lo;
    }

    function lowMainEnvelope(
        payload,
        boundaryIndex,
        distance
    ) {
        const representation =
            payload.representation;

        const nodes =
            representation.distanceNodes;

        const mins =
            representation
                .minDeltaZMetersByBoundary[
                    boundaryIndex
                ];

        const maxs =
            representation
                .maxDeltaZMetersByBoundary[
                    boundaryIndex
                ];

        const interval =
            lowMainInterval(
                nodes,
                distance
            );

        if (interval < 0) {
            return null;
        }

        const d0 =
            Number(nodes[interval]);

        const d1 =
            Number(
                nodes[
                    interval + 1
                ]
            );

        const factor =
            d1 === d0
                ? 0
                : (
                    distance -
                    d0
                ) / (
                    d1 -
                    d0
                );

        return {
            minDeltaZM:
                Number(mins[interval]) +
                (
                    Number(
                        mins[
                            interval + 1
                        ]
                    ) -
                    Number(
                        mins[
                            interval
                        ]
                    )
                ) *
                factor,
            maxDeltaZM:
                Number(maxs[interval]) +
                (
                    Number(
                        maxs[
                            interval + 1
                        ]
                    ) -
                    Number(
                        maxs[
                            interval
                        ]
                    )
                ) *
                factor
        };
    }

    function validateLowMain(payload) {
        if (
            !payload ||
            payload.schema !==
                'wardogs-current-155he-low-command-surface-candidate-v2'
        ) {
            throw new Error(
                'Unsupported LOW main candidate schema'
            );
        }

        const representation =
            payload.representation;

        if (
            !Array.isArray(
                representation?.distanceNodes
            ) ||
            representation
                .distanceNodes
                .length !==
                345 ||
            !Array.isArray(
                representation?.boundariesMrad
            ) ||
            representation
                .boundariesMrad
                .length !==
                45 ||
            !finite(
                representation?.guardMeters
            )
        ) {
            throw new Error(
                'Invalid LOW main candidate payload'
            );
        }

        return true;
    }

    function resolveLowMain(
        payload,
        distanceM,
        flatMrad,
        deltaZM
    ) {
        const distance =
            Number(distanceM);

        const flat =
            Number(flatMrad);

        const dz =
            Number(deltaZM);

        if (
            ![
                distance,
                flat,
                dz
            ].every(
                Number.isFinite
            )
        ) {
            return {
                status: 'fallback',
                reason:
                    'non-finite-input'
            };
        }

        const domain =
            payload?.domain;

        const selectable =
            payload
                ?.selectableCommandMrad;

        const representation =
            payload?.representation;

        if (
            !domain ||
            !representation ||
            !Array.isArray(selectable) ||
            selectable.length !== 2
        ) {
            return {
                status: 'fallback',
                reason:
                    'invalid-payload'
            };
        }

        if (
            distance <
                domain
                    .distanceMinMeters ||
            distance >
                domain
                    .distanceMaxMeters ||
            flat <
                domain.flatMilMin ||
            flat >
                domain.flatMilMax ||
            dz <
                domain
                    .deltaZMinMeters ||
            dz >
                domain
                    .deltaZMaxMeters
        ) {
            return {
                status: 'fallback',
                reason:
                    'outside-supported-domain'
            };
        }

        const boundaries =
            representation
                .boundariesMrad;

        const guard =
            Number(
                representation
                    .guardMeters
            );

        const first =
            lowMainEnvelope(
                payload,
                0,
                distance
            );

        if (
            !first ||
            !finite(guard)
        ) {
            return {
                status: 'fallback',
                reason:
                    'invalid-payload'
            };
        }

        if (
            dz <=
            first.maxDeltaZM +
                guard
        ) {
            return {
                status: 'fallback',
                reason:
                    'below-minimum-selectable-command'
            };
        }

        let lastCrossed = null;

        for (
            let i = 0;
            i < boundaries.length;
            i++
        ) {
            const envelope =
                lowMainEnvelope(
                    payload,
                    i,
                    distance
                );

            if (!envelope) {
                return {
                    status: 'fallback',
                    reason:
                        'missing-boundary-envelope'
                };
            }

            const guardedMin =
                envelope.minDeltaZM -
                guard;

            const guardedMax =
                envelope.maxDeltaZM +
                guard;

            if (
                dz >= guardedMin &&
                dz <= guardedMax
            ) {
                return {
                    status: 'fallback',
                    reason:
                        'family-boundary-envelope',
                    boundaryMrad:
                        boundaries[i]
                };
            }

            if (dz > guardedMax) {
                lastCrossed =
                    boundaries[i];
                continue;
            }

            if (dz < guardedMin) {
                break;
            }
        }

        if (
            lastCrossed === null
        ) {
            return {
                status: 'fallback',
                reason:
                    'no-supported-command-bin'
            };
        }

        const commandMrad =
            Number(lastCrossed) +
            5;

        if (
            commandMrad <
                selectable[0] ||
            commandMrad >
                selectable[1]
        ) {
            return {
                status: 'fallback',
                reason:
                    'outside-selectable-command-range'
            };
        }

        return {
            status: 'ok',
            commandMrad
        };
    }

    function sparseInterval(
        nodes,
        value
    ) {
        if (
            !Array.isArray(nodes) ||
            nodes.length < 2 ||
            value <
                Number(nodes[0]) ||
            value >
                Number(
                    nodes[
                        nodes.length - 1
                    ]
                )
        ) {
            return -1;
        }

        if (
            value ===
            Number(
                nodes[
                    nodes.length - 1
                ]
            )
        ) {
            return (
                nodes.length -
                2
            );
        }

        let lo = 0;
        let hi =
            nodes.length - 1;

        while (lo + 1 < hi) {
            const mid =
                (lo + hi) >> 1;

            if (
                Number(nodes[mid]) <=
                value
            ) {
                lo = mid;
            } else {
                hi = mid;
            }
        }

        return lo;
    }

    function interpolateSeries(
        nodes,
        values,
        x
    ) {
        const index =
            sparseInterval(
                nodes,
                x
            );

        if (
            index < 0 ||
            !Array.isArray(values) ||
            values.length !==
                nodes.length
        ) {
            return null;
        }

        const x0 =
            Number(nodes[index]);

        const x1 =
            Number(
                nodes[
                    index + 1
                ]
            );

        const factor =
            x1 === x0
                ? 0
                : (
                    x -
                    x0
                ) /
                (
                    x1 -
                    x0
                );

        return (
            Number(values[index]) +
            (
                Number(
                    values[
                        index + 1
                    ]
                ) -
                Number(
                    values[index]
                )
            ) *
            factor
        );
    }

    function interpolateSparseSegment(
        segment,
        distance
    ) {
        const nodes =
            segment
                ?.distanceNodes;

        const mins =
            segment
                ?.minDeltaZMeters;

        const maxs =
            segment
                ?.maxDeltaZMeters;

        const index =
            sparseInterval(
                nodes,
                distance
            );

        if (index < 0) {
            return null;
        }

        const d0 =
            Number(nodes[index]);

        const d1 =
            Number(
                nodes[
                    index + 1
                ]
            );

        const factor =
            d1 === d0
                ? 0
                : (
                    distance -
                    d0
                ) /
                (
                    d1 -
                    d0
                );

        return {
            minDeltaZM:
                Number(mins[index]) +
                (
                    Number(
                        mins[
                            index + 1
                        ]
                    ) -
                    Number(
                        mins[index]
                    )
                ) *
                factor,
            maxDeltaZM:
                Number(maxs[index]) +
                (
                    Number(
                        maxs[
                            index + 1
                        ]
                    ) -
                    Number(
                        maxs[index]
                    )
                ) *
                factor
        };
    }

    function lowExtensionEnvelope(
        region,
        boundary,
        distance,
        flatMrad
    ) {
        for (
            const segment of
            boundary.segments || []
        ) {
            const value =
                interpolateSparseSegment(
                    segment,
                    distance
                );

            if (value) {
                return value;
            }
        }

        const clip =
            Number(
                region.clipMeters
            );

        if (
            !finite(clip) ||
            !(clip > 0)
        ) {
            return null;
        }

        if (
            boundary.boundaryMrad <
            flatMrad
        ) {
            return {
                minDeltaZM:
                    -clip,
                maxDeltaZM:
                    -clip
            };
        }

        if (
            boundary.boundaryMrad >
            flatMrad
        ) {
            return {
                minDeltaZM:
                    clip,
                maxDeltaZM:
                    clip
            };
        }

        return null;
    }

    function validateLowExtension(
        payload
    ) {
        if (
            !payload ||
            payload.schema !==
                'wardogs-current-155he-low-tail-apex-candidate-v1'
        ) {
            throw new Error(
                'Unsupported LOW tail/apex candidate schema'
            );
        }

        const reachability =
            payload.reachability;

        if (
            !reachability ||
            !finite(
                reachability.guardMeters
            ) ||
            !Array.isArray(
                reachability.distanceNodes
            ) ||
            !Array.isArray(
                reachability
                    .maxPositiveDeltaZMeters
            ) ||
            reachability
                .distanceNodes
                .length !==
                reachability
                    .maxPositiveDeltaZMeters
                    .length
        ) {
            throw new Error(
                'Invalid LOW tail/apex reachability payload'
            );
        }

        for (
            const key of
            ['tail', 'apex']
        ) {
            const region =
                payload.regions?.[key];

            if (
                !region ||
                region.orientation !==
                    'increasing-command-vs-positive-deltaZ' ||
                !finite(
                    region.guardMeters
                ) ||
                !finite(
                    region.clipMeters
                ) ||
                !Array.isArray(
                    region.boundaries
                ) ||
                region
                    .boundaries
                    .length !==
                    58
            ) {
                throw new Error(
                    `Invalid LOW ${key} region`
                );
            }
        }

        return true;
    }

    function chooseLowExtensionRegion(
        payload,
        distance
    ) {
        const tail =
            payload.regions?.tail;

        const apex =
            payload.regions?.apex;

        if (
            tail &&
            distance >=
                Number(
                    tail
                        .distanceMinMeters
                ) &&
            distance <=
                Number(
                    tail
                        .distanceMaxMeters
                )
        ) {
            return tail;
        }

        if (
            apex &&
            distance >=
                Number(
                    apex
                        .distanceMinMeters
                ) &&
            distance <=
                Number(
                    apex
                        .distanceMaxMeters
                )
        ) {
            return apex;
        }

        return null;
    }

    function resolveLowExtension(
        payload,
        distanceM,
        flatMrad,
        deltaZM
    ) {
        const distance =
            Number(distanceM);

        const flat =
            Number(flatMrad);

        const dz =
            Number(deltaZM);

        if (
            ![
                distance,
                flat,
                dz
            ].every(
                Number.isFinite
            )
        ) {
            return {
                status: 'fallback',
                reason:
                    'non-finite-input'
            };
        }

        const domain =
            payload?.domain;

        const selectable =
            payload
                ?.selectableCommandMrad;

        if (
            !domain ||
            !Array.isArray(selectable) ||
            selectable.length !== 2
        ) {
            return {
                status: 'fallback',
                reason:
                    'invalid-payload'
            };
        }

        if (
            distance <
                domain
                    .distanceMinMeters ||
            distance >
                domain
                    .distanceMaxMeters ||
            dz <
                domain
                    .deltaZMinMeters ||
            dz >
                domain
                    .deltaZMaxMeters
        ) {
            return {
                status: 'fallback',
                reason:
                    'outside-supported-domain'
            };
        }

        const reachability =
            interpolateSeries(
                payload
                    .reachability
                    .distanceNodes,
                payload
                    .reachability
                    .maxPositiveDeltaZMeters,
                distance
            );

        const reachabilityGuard =
            Number(
                payload
                    .reachability
                    .guardMeters
            );

        if (
            !finite(reachability) ||
            !finite(
                reachabilityGuard
            )
        ) {
            return {
                status: 'fallback',
                reason:
                    'missing-reachability'
            };
        }

        if (
            dz >
            reachability +
                reachabilityGuard
        ) {
            return {
                status:
                    'unreachable',
                reason:
                    'terrain-adjusted-low-unreachable',
                reachabilityDeltaZM:
                    reachability
            };
        }

        if (
            dz >=
            reachability -
                reachabilityGuard
        ) {
            return {
                status: 'fallback',
                reason:
                    'reachability-boundary',
                reachabilityDeltaZM:
                    reachability
            };
        }

        const region =
            chooseLowExtensionRegion(
                payload,
                distance
            );

        if (!region) {
            return {
                status: 'fallback',
                reason:
                    'outside-supported-domain'
            };
        }

        const guard =
            Number(
                region.guardMeters
            );

        let lastCrossed = null;

        for (
            const boundary of
            region.boundaries
        ) {
            const envelope =
                lowExtensionEnvelope(
                    region,
                    boundary,
                    distance,
                    flat
                );

            if (!envelope) {
                return {
                    status: 'fallback',
                    reason:
                        'missing-boundary-envelope'
                };
            }

            const guardedMin =
                envelope.minDeltaZM -
                guard;

            const guardedMax =
                envelope.maxDeltaZM +
                guard;

            if (
                dz >= guardedMin &&
                dz <= guardedMax
            ) {
                return {
                    status: 'fallback',
                    reason:
                        'family-boundary-envelope',
                    boundaryMrad:
                        boundary
                            .boundaryMrad
                };
            }

            if (dz > guardedMax) {
                lastCrossed =
                    Number(
                        boundary
                            .boundaryMrad
                    );

                continue;
            }

            if (dz < guardedMin) {
                break;
            }
        }

        if (
            lastCrossed === null
        ) {
            return {
                status: 'fallback',
                reason:
                    'below-minimum-selectable-command'
            };
        }

        const commandMrad =
            lastCrossed +
            5;

        if (
            commandMrad <
                selectable[0] ||
            commandMrad >
                selectable[1]
        ) {
            return {
                status: 'fallback',
                reason:
                    'outside-selectable-command-range'
            };
        }

        return {
            status: 'ok',
            commandMrad,
            region:
                distance <=
                Number(
                    payload
                        .regions
                        .tail
                        .distanceMaxMeters
                )
                    ? 'tail'
                    : 'apex'
        };
    }

    function highEnvelope(
        payload,
        boundary,
        distance,
        flatMrad
    ) {
        for (
            const segment of
            boundary.segments || []
        ) {
            const value =
                interpolateSparseSegment(
                    segment,
                    distance
                );

            if (value) {
                return value;
            }
        }

        const clip =
            Number(
                payload
                    .representation
                    .clipMeters
            );

        if (
            !finite(clip) ||
            !(clip > 0)
        ) {
            return null;
        }

        if (
            boundary.boundaryMrad <
            flatMrad
        ) {
            return {
                minDeltaZM:
                    clip,
                maxDeltaZM:
                    clip
            };
        }

        if (
            boundary.boundaryMrad >
            flatMrad
        ) {
            return {
                minDeltaZM:
                    -clip,
                maxDeltaZM:
                    -clip
            };
        }

        return null;
    }

    function validateHigh(
        payload
    ) {
        if (
            !payload ||
            payload.schema !==
                'wardogs-current-155he-high-v2-command-surface-candidate-v1'
        ) {
            throw new Error(
                'Unsupported HIGH candidate schema'
            );
        }

        const representation =
            payload.representation;

        if (
            !representation ||
            representation.orientation !==
                'decreasing-command-vs-positive-deltaZ' ||
            !finite(
                representation.guardMeters
            ) ||
            !finite(
                representation.clipMeters
            ) ||
            !Array.isArray(
                representation.boundaries
            ) ||
            representation
                .boundaries
                .length !==
                80
        ) {
            throw new Error(
                'Invalid HIGH candidate payload'
            );
        }

        return true;
    }

    function resolveHigh(
        payload,
        distanceM,
        flatMrad,
        deltaZM
    ) {
        const distance =
            Number(distanceM);

        const flat =
            Number(flatMrad);

        const dz =
            Number(deltaZM);

        if (
            ![
                distance,
                flat,
                dz
            ].every(
                Number.isFinite
            )
        ) {
            return {
                status: 'fallback',
                reason:
                    'non-finite-input'
            };
        }

        const domain =
            payload?.domain;

        const representation =
            payload?.representation;

        const selectable =
            payload
                ?.selectableCommandMrad;

        if (
            !domain ||
            !representation ||
            !Array.isArray(selectable) ||
            selectable.length !== 2
        ) {
            return {
                status: 'fallback',
                reason:
                    'invalid-payload'
            };
        }

        if (
            distance <
                domain
                    .distanceMinMeters ||
            distance >
                domain
                    .distanceMaxMeters ||
            dz <
                domain
                    .deltaZMinMeters ||
            dz >
                domain
                    .deltaZMaxMeters
        ) {
            return {
                status: 'fallback',
                reason:
                    'outside-supported-domain'
            };
        }

        const guard =
            Number(
                representation
                    .guardMeters
            );

        for (
            const boundary of
            representation.boundaries
        ) {
            const envelope =
                highEnvelope(
                    payload,
                    boundary,
                    distance,
                    flat
                );

            if (!envelope) {
                return {
                    status: 'fallback',
                    reason:
                        'missing-boundary-envelope'
                };
            }

            const guardedMin =
                envelope.minDeltaZM -
                guard;

            const guardedMax =
                envelope.maxDeltaZM +
                guard;

            if (
                dz >= guardedMin &&
                dz <= guardedMax
            ) {
                return {
                    status: 'fallback',
                    reason:
                        'family-boundary-envelope',
                    boundaryMrad:
                        boundary
                            .boundaryMrad
                };
            }

            if (dz > guardedMax) {
                const commandMrad =
                    Number(
                        boundary
                            .boundaryMrad
                    ) -
                    5;

                if (
                    commandMrad <
                        selectable[0] ||
                    commandMrad >
                        selectable[1]
                ) {
                    return {
                        status:
                            'fallback',
                        reason:
                            'outside-selectable-command-range'
                    };
                }

                return {
                    status: 'ok',
                    commandMrad
                };
            }
        }

        return {
            status: 'fallback',
            reason:
                'above-maximum-selectable-command'
        };
    }

    function flatCommand(
        solution
    ) {
        if (!solution) {
            return null;
        }

        const direct =
            Number(solution.mil);

        if (finite(direct)) {
            return direct;
        }

        const min =
            Number(solution.minMil);

        const max =
            Number(solution.maxMil);

        if (
            finite(min) &&
            finite(max) &&
            Math.abs(min - max) <=
                1e-9
        ) {
            return min;
        }

        return null;
    }

    function formatTableCommand(
        solution
    ) {
        if (!solution) {
            return '—';
        }

        const direct =
            flatCommand(solution);

        if (finite(direct)) {
            return `${Math.round(direct)}`;
        }

        const min =
            Number(solution.minMil);

        const max =
            Number(solution.maxMil);

        if (
            finite(min) &&
            finite(max)
        ) {
            return (
                `${Math.round(min)}` +
                '–' +
                `${Math.round(max)}`
            );
        }

        return '—';
    }

    function normalizeCandidate(
        result,
        tableSolution
    ) {
        const tableMrad =
            flatCommand(
                tableSolution
            );

        if (!tableSolution) {
            return null;
        }

        if (!finite(tableMrad)) {
            return {
                status:
                    'OUTSIDE_CERTIFIED_DOMAIN',
                reason:
                    'ambiguous-flat-table-command',
                tableMrad: null,
                tableDisplay:
                    formatTableCommand(
                        tableSolution
                    ),
                commandMrad: null,
                deltaMrad: null,
                applied: false
            };
        }

        if (
            result?.status ===
                'ok' &&
            finite(
                result.commandMrad
            )
        ) {
            const commandMrad =
                Number(
                    result.commandMrad
                );

            return {
                status:
                    'SAFE_CONSENSUS',
                reason:
                    result.reason ??
                    null,
                tableMrad,
                tableDisplay:
                    formatTableCommand(
                        tableSolution
                    ),
                commandMrad,
                deltaMrad:
                    commandMrad -
                    tableMrad,
                boundaryMrad:
                    result.boundaryMrad ??
                    null,
                region:
                    result.region ??
                    null,
                applied: false
            };
        }

        if (
            result?.status ===
            'unreachable'
        ) {
            return {
                status:
                    'TERRAIN_ADJUSTED_UNREACHABLE',
                reason:
                    result.reason ??
                    'terrain-adjusted-unreachable',
                tableMrad,
                tableDisplay:
                    formatTableCommand(
                        tableSolution
                    ),
                commandMrad: null,
                deltaMrad: null,
                reachabilityDeltaZM:
                    result
                        .reachabilityDeltaZM ??
                    null,
                applied: false
            };
        }

        return {
            status:
                result?.reason ===
                    'family-boundary-envelope'
                    ? 'FAMILY_DISAGREEMENT'
                    : 'OUTSIDE_CERTIFIED_DOMAIN',
            reason:
                result?.reason ??
                'no-safe-candidate',
            tableMrad,
            tableDisplay:
                formatTableCommand(
                    tableSolution
                ),
            commandMrad: null,
            deltaMrad: null,
            boundaryMrad:
                result?.boundaryMrad ??
                null,
            reachabilityDeltaZM:
                result
                    ?.reachabilityDeltaZM ??
                null,
            applied: false
        };
    }

    function resolveArcCandidates(
        context,
        resolved
    ) {
        const distance =
            Number(
                context?.distanceMeters
            );

        const deltaZ =
            Number(
                resolved?.meta?.deltaZ
            );

        if (
            context?.weapon?.id !==
                (
                    state.config
                        ?.weaponId ||
                    'spg'
                ) ||
            !finite(distance) ||
            !finite(deltaZ)
        ) {
            return null;
        }

        const tableSolutions =
            context.solutions;

        let low = null;
        let high = null;

        if (
            tableSolutions?.low
        ) {
            const flat =
                flatCommand(
                    tableSolutions.low
                );

            if (!finite(flat)) {
                low =
                    normalizeCandidate(
                        null,
                        tableSolutions.low
                    );
            } else if (
                distance <= 2439
            ) {
                low =
                    normalizeCandidate(
                        resolveLowMain(
                            state
                                .payloads
                                .lowMain,
                            distance,
                            flat,
                            deltaZ
                        ),
                        tableSolutions.low
                    );
            } else {
                low =
                    normalizeCandidate(
                        resolveLowExtension(
                            state
                                .payloads
                                .lowExtension,
                            distance,
                            flat,
                            deltaZ
                        ),
                        tableSolutions.low
                    );
            }
        }

        if (
            tableSolutions?.high
        ) {
            const flat =
                flatCommand(
                    tableSolutions.high
                );

            high =
                finite(flat)
                    ? normalizeCandidate(
                        resolveHigh(
                            state
                                .payloads
                                .highV2,
                            distance,
                            flat,
                            deltaZ
                        ),
                        tableSolutions.high
                    )
                    : normalizeCandidate(
                        null,
                        tableSolutions.high
                    );
        }

        if (!low && !high) {
            return null;
        }

        return {
            low,
            high
        };
    }

    function cloneSolutions(
        solutions
    ) {
        return {
            inRange:
                Boolean(
                    solutions?.inRange
                ),
            single:
                solutions?.single
                    ? {
                        ...solutions.single
                    }
                    : null,
            low:
                solutions?.low
                    ? {
                        ...solutions.low
                    }
                    : null,
            high:
                solutions?.high
                    ? {
                        ...solutions.high
                    }
                    : null
        };
    }

    function applySafeCandidates(
        solutions,
        arcs
    ) {
        if (
            !state.enabled ||
            !solutions ||
            !arcs
        ) {
            return {
                solutions,
                applied: false
            };
        }

        const safeArcs =
            ['low', 'high']
                .filter(
                    arc =>
                        solutions?.[arc] &&
                        arcs?.[arc]
                            ?.status ===
                            'SAFE_CONSENSUS' &&
                        finite(
                            arcs[arc]
                                .commandMrad
                        )
                );

        if (!safeArcs.length) {
            return {
                solutions,
                applied: false
            };
        }

        const next =
            cloneSolutions(
                solutions
            );

        for (
            const arc of
            safeArcs
        ) {
            const command =
                Number(
                    arcs[arc]
                        .commandMrad
                );

            next[arc] = {
                ...next[arc],
                mil: command,
                minMil: command,
                maxMil: command
            };

            arcs[arc].applied =
                true;
        }

        return {
            solutions: next,
            applied: true
        };
    }

    function queueRerender() {
        if (
            state.rerenderQueued
        ) {
            return;
        }

        state.rerenderQueued =
            true;

        requestAnimationFrame(
            () => {
                state.rerenderQueued =
                    false;

                if (
                    typeof result ===
                    'function'
                ) {
                    result();
                }

                if (
                    typeof refreshSavedTargetFiringInfo ===
                    'function'
                ) {
                    refreshSavedTargetFiringInfo();
                }
            }
        );
    }

    async function ensurePayloads() {
        if (state.ready) {
            return true;
        }

        if (state.loadPromise) {
            return state.loadPromise;
        }

        const payloads =
            state.config?.payloads;

        if (!payloads) {
            return false;
        }

        state.loading = true;
        syncPanel();

        state.loadPromise =
            Promise.all([
                fetchVerifiedPayload(
                    payloads.lowMain,
                    'LOW main'
                ),
                fetchVerifiedPayload(
                    payloads.lowExtension,
                    'LOW tail/apex'
                ),
                fetchVerifiedPayload(
                    payloads.highV2,
                    'HIGH v2'
                )
            ])
                .then(
                    ([
                        lowMain,
                        lowExtension,
                        highV2
                    ]) => {
                        validateLowMain(
                            lowMain
                        );

                        validateLowExtension(
                            lowExtension
                        );

                        validateHigh(
                            highV2
                        );

                        state.payloads = {
                            lowMain,
                            lowExtension,
                            highV2
                        };

                        state.ready = true;
                        state.lastError =
                            null;

                        return true;
                    }
                )
                .catch(
                    error => {
                        state.ready =
                            false;

                        state.lastError =
                            error;

                        console.warn(
                            '[experimental-terrain-correction] Candidate payloads unavailable; flat-table fallback remains active.',
                            error
                        );

                        return false;
                    }
                )
                .finally(
                    () => {
                        state.loading =
                            false;

                        state.loadPromise =
                            null;

                        syncPanel();
                        queueRerender();
                    }
                );

        return state.loadPromise;
    }

    function wrapResolver() {
        if (
            typeof window
                .getTerrainBallisticSolutions !==
            'function'
        ) {
            throw new Error(
                'Terrain ballistics resolver is unavailable'
            );
        }

        if (
            state.baseResolver
        ) {
            return;
        }

        state.baseResolver =
            window
                .getTerrainBallisticSolutions;

        window
            .getTerrainBallisticSolutions =
            function experimentalTerrainResolver(
                context
            ) {
                const resolved =
                    state.baseResolver(
                        context
                    );

                const baseMeta =
                    resolved?.meta;

                const isSupportedWeapon =
                    context?.weapon?.id ===
                    (
                        state.config
                            ?.weaponId ||
                        'spg'
                    );

                const canPreview =
                    state.available &&
                    isSupportedWeapon &&
                    finite(
                        baseMeta?.deltaZ
                    );

                if (
                    canPreview &&
                    !state.ready &&
                    !state.loading &&
                    !state.lastError
                ) {
                    ensurePayloads();
                }

                if (
                    !canPreview ||
                    !state.ready
                ) {
                    return {
                        ...resolved,
                        solutions:
                            resolved
                                ?.solutions,
                        meta:
                            baseMeta
                                ? {
                                    ...baseMeta,
                                    experimentalTerrainCorrection: {
                                        available:
                                            state.available &&
                                            isSupportedWeapon,
                                        enabled:
                                            state.enabled,
                                        ready:
                                            state.ready,
                                        loading:
                                            state.loading,
                                        applied:
                                            false,
                                        arcs: null,
                                        error:
                                            state.lastError
                                                ?.message ??
                                            null
                                    }
                                }
                                : baseMeta
                    };
                }

                const arcs =
                    resolveArcCandidates(
                        context,
                        resolved
                    );

                const applied =
                    applySafeCandidates(
                        resolved?.solutions,
                        arcs
                    );

                return {
                    ...resolved,
                    solutions:
                        applied.solutions,
                    meta: {
                        ...baseMeta,
                        experimentalTerrainCorrection: {
                            available: true,
                            enabled:
                                state.enabled,
                            ready: true,
                            loading: false,
                            applied:
                                applied.applied,
                            arcs,
                            error: null
                        }
                    }
                };
            };
    }

    function installFormatter() {
        if (
            typeof window
                .formatTerrainBallisticsStatus !==
            'function'
        ) {
            return;
        }

        if (
            state.baseFormatter
        ) {
            return;
        }

        state.baseFormatter =
            window
                .formatTerrainBallisticsStatus;

        window
            .formatTerrainBallisticsStatus =
            function experimentalTerrainStatus(
                meta
            ) {
                state.lastDisplayMeta =
                    meta || null;

                syncPanel();

                const experimental =
                    meta
                        ?.experimentalTerrainCorrection;

                if (
                    !experimental ||
                    !experimental.available
                ) {
                    return (
                        state.baseFormatter(
                            meta
                        )
                    );
                }

                if (
                    meta?.pendingTerrain
                ) {
                    return (
                        state.baseFormatter(
                            meta
                        )
                    );
                }

                const deltaZ =
                    finite(meta?.deltaZ)
                        ? (
                            `${Number(meta.deltaZ) >= 0 ? '+' : ''}` +
                            `${Number(meta.deltaZ).toFixed(1)}`
                        )
                        : null;

                let status =
                    text().statusOff;

                if (
                    experimental.loading
                ) {
                    status =
                        text()
                            .candidateLoading;
                } else if (
                    state.enabled &&
                    experimental.applied
                ) {
                    status =
                        text()
                            .statusOn;
                } else if (
                    state.enabled
                ) {
                    status =
                        text()
                            .statusFallback;
                }

                return deltaZ === null
                    ? status
                    : `ΔZ ${deltaZ} m · ${status}`;
            };
    }

    function installStyle() {
        if (
            document.getElementById(
                'experimentalTerrainCorrectionStyle'
            )
        ) {
            return;
        }

        const style =
            document.createElement(
                'style'
            );

        style.id =
            'experimentalTerrainCorrectionStyle';

        style.textContent = `
            .experimental-terrain-correction {
                margin-top: 9px;
                padding: 10px 11px;
                border: 1px solid color-mix(in srgb, #d7a452 48%, var(--border-light, #424a50));
                border-radius: 7px;
                background: color-mix(in srgb, #d7a452 6%, var(--panel-bg, #171b1f));
            }

            .experimental-terrain-correction[hidden] {
                display: none !important;
            }

            .experimental-terrain-correction-header {
                display: flex;
                align-items: flex-start;
                justify-content: space-between;
                gap: 10px;
            }

            .experimental-terrain-correction-title {
                color: var(--text, #e6e9eb);
                font-size: 10px;
                font-weight: 800;
                line-height: 1.25;
                letter-spacing: .035em;
                text-transform: uppercase;
            }

            .experimental-terrain-correction-badge {
                flex: 0 0 auto;
                padding: 2px 5px;
                border: 1px solid color-mix(in srgb, #d7a452 55%, transparent);
                border-radius: 4px;
                color: #d7a452;
                font-size: 8px;
                font-weight: 800;
                line-height: 1.2;
            }

            .experimental-terrain-correction-toggle {
                margin-top: 8px;
                display: flex;
                align-items: flex-start;
                gap: 7px;
                color: var(--text, #e6e9eb);
                font-size: 10px;
                line-height: 1.35;
                cursor: pointer;
            }

            .experimental-terrain-correction-toggle input {
                width: 15px;
                min-width: 15px;
                height: 15px;
                min-height: 15px;
                margin: 0;
                accent-color: var(--accent, #d7a452);
            }

            .experimental-terrain-correction-note {
                margin-top: 7px;
                color: var(--muted, #9aa4ab);
                font-size: 9px;
                line-height: 1.4;
            }

            .experimental-terrain-correction-arcs {
                margin-top: 8px;
                display: grid;
                gap: 5px;
            }

            .experimental-terrain-arc {
                display: grid;
                grid-template-columns: 38px minmax(0, 1fr) minmax(0, 1fr);
                gap: 6px;
                align-items: center;
                padding: 6px 7px;
                border: 1px solid var(--border-light, #424a50);
                border-radius: 5px;
                background: color-mix(in srgb, var(--header-bg, #101316) 58%, transparent);
            }

            .experimental-terrain-arc-name {
                color: var(--muted, #9aa4ab);
                font-size: 9px;
                font-weight: 800;
            }

            .experimental-terrain-value {
                min-width: 0;
                display: flex;
                flex-direction: column;
                gap: 1px;
            }

            .experimental-terrain-value-label {
                color: var(--muted, #9aa4ab);
                font-size: 8px;
                line-height: 1;
                text-transform: uppercase;
            }

            .experimental-terrain-value strong {
                overflow: hidden;
                color: var(--text, #e6e9eb);
                font: 600 11px ui-monospace, SFMono-Regular, Consolas, monospace;
                line-height: 1.2;
                text-overflow: ellipsis;
                white-space: nowrap;
            }

            .experimental-terrain-value small {
                overflow: hidden;
                color: var(--muted, #9aa4ab);
                font-size: 8px;
                line-height: 1.15;
                text-overflow: ellipsis;
                white-space: nowrap;
            }

            .experimental-terrain-value.is-safe strong {
                color: #82c596;
            }

            .experimental-terrain-value.is-unreachable strong {
                color: #d86666;
            }

            .experimental-terrain-value.is-fallback strong {
                color: #d7a452;
            }

            .experimental-terrain-correction-state {
                margin-top: 7px;
                color: var(--muted, #9aa4ab);
                font-size: 9px;
                line-height: 1.35;
            }
        `;

        document.head.appendChild(
            style
        );
    }

    function ensurePanel() {
        let root =
            document.getElementById(
                'experimentalTerrainCorrection'
            );

        if (root) {
            return root;
        }

        const resultCard =
            document.querySelector(
                '.solution-result'
            ) ||
            document.querySelector(
                '.mobile-result-details'
            );

        if (!resultCard) {
            return null;
        }

        installStyle();

        root =
            document.createElement(
                'div'
            );

        root.id =
            'experimentalTerrainCorrection';

        root.className =
            'experimental-terrain-correction';

        root.innerHTML = `
            <div class="experimental-terrain-correction-header">
                <div class="experimental-terrain-correction-title"></div>
                <span class="experimental-terrain-correction-badge">EXPERIMENTAL</span>
            </div>
            <label class="experimental-terrain-correction-toggle">
                <input id="experimentalTerrainCorrectionToggle" type="checkbox">
                <span class="experimental-terrain-correction-toggle-text"></span>
            </label>
            <div class="experimental-terrain-correction-note"></div>
            <div class="experimental-terrain-correction-arcs"></div>
            <div class="experimental-terrain-correction-state"></div>
        `;

        const warning =
            document.getElementById(
                'sphLevelWarning'
            );

        if (
            warning &&
            warning.parentElement ===
                resultCard.parentElement
        ) {
            warning.insertAdjacentElement(
                'beforebegin',
                root
            );
        } else {
            resultCard.insertAdjacentElement(
                'afterend',
                root
            );
        }

        root
            .querySelector(
                '#experimentalTerrainCorrectionToggle'
            )
            ?.addEventListener(
                'change',
                event => {
                    setEnabled(
                        event.target.checked
                    );
                }
            );

        return root;
    }

    function candidateLabel(
        arc
    ) {
        const copy =
            text();

        if (!arc) {
            return {
                value: '—',
                detail:
                    copy.unsupported,
                className:
                    'is-fallback'
            };
        }

        if (
            arc.status ===
            'SAFE_CONSENSUS' &&
            finite(
                arc.commandMrad
            )
        ) {
            const delta =
                Number(
                    arc.deltaMrad
                );

            const signedDelta =
                finite(delta)
                    ? (
                        `${delta >= 0 ? '+' : ''}` +
                        `${Math.round(delta)}`
                    )
                    : '';

            return {
                value:
                    `${Math.round(arc.commandMrad)}`,
                detail:
                    `${signedDelta ? `${signedDelta} · ` : ''}` +
                    `${copy.safe} · ` +
                    `${
                        arc.applied
                            ? copy.applied
                            : copy.preview
                    }`,
                className:
                    'is-safe'
            };
        }

        if (
            arc.status ===
            'TERRAIN_ADJUSTED_UNREACHABLE'
        ) {
            return {
                value:
                    copy.unreachable,
                detail:
                    copy.fallback,
                className:
                    'is-unreachable'
            };
        }

        return {
            value: '—',
            detail:
                `${copy.fallback} · ${arc.status || 'OUTSIDE_CERTIFIED_DOMAIN'}`,
            className:
                'is-fallback'
        };
    }

    function renderArc(
        name,
        arc
    ) {
        const copy =
            text();

        const candidate =
            candidateLabel(
                arc
            );

        const tableDisplay =
            arc?.tableDisplay ||
            (
                finite(
                    arc?.tableMrad
                )
                    ? `${Math.round(arc.tableMrad)}`
                    : '—'
            );

        const row = document.createElement('div');
        row.className = 'experimental-terrain-arc';

        const arcName = document.createElement('span');
        arcName.className = 'experimental-terrain-arc-name';
        arcName.textContent = name;

        const value = (label, primary, detail, stateClass = '') => {
            const item = document.createElement('span');
            item.className = 'experimental-terrain-value';

            if (/^is-[a-z-]+$/.test(stateClass)) {
                item.classList.add(stateClass);
            }

            const labelElement = document.createElement('span');
            labelElement.className = 'experimental-terrain-value-label';
            labelElement.textContent = label;

            const primaryElement = document.createElement('strong');
            primaryElement.textContent = primary;

            const detailElement = document.createElement('small');
            detailElement.textContent = detail;

            item.append(labelElement, primaryElement, detailElement);
            return item;
        };

        row.append(
            arcName,
            value(copy.table, tableDisplay, 'mrad'),
            value(
                copy.terrain,
                candidate.value,
                candidate.detail,
                candidate.className
            )
        );

        return row;
    }

    function syncPanel() {
        const root =
            ensurePanel();

        if (!root) {
            return;
        }

        const copy =
            text();

        const isSph =
            typeof S === 'object' &&
            S &&
            S.weapon ===
                (
                    state.config
                        ?.weaponId ||
                    'spg'
                );

        root.hidden =
            !state.available ||
            !isSph;

        if (root.hidden) {
            return;
        }

        const title =
            root.querySelector(
                '.experimental-terrain-correction-title'
            );

        const toggleText =
            root.querySelector(
                '.experimental-terrain-correction-toggle-text'
            );

        const note =
            root.querySelector(
                '.experimental-terrain-correction-note'
            );

        const toggle =
            root.querySelector(
                '#experimentalTerrainCorrectionToggle'
            );

        const arcs =
            root.querySelector(
                '.experimental-terrain-correction-arcs'
            );

        const status =
            root.querySelector(
                '.experimental-terrain-correction-state'
            );

        if (title) {
            title.textContent =
                copy.title;
        }

        if (toggleText) {
            toggleText.textContent =
                copy.toggle;
        }

        if (note) {
            note.textContent =
                copy.note;
        }

        if (toggle) {
            toggle.checked =
                state.enabled;

            toggle.disabled =
                Boolean(
                    state.lastError
                );
        }

        const experimental =
            state
                .lastDisplayMeta
                ?.experimentalTerrainCorrection;

        if (
            state.loading ||
            experimental?.loading
        ) {
            if (arcs) {
                arcs.innerHTML = '';
            }

            if (status) {
                status.textContent =
                    copy.loading;
            }

            return;
        }

        if (
            state.lastError ||
            experimental?.error
        ) {
            if (arcs) {
                arcs.innerHTML = '';
            }

            if (status) {
                status.textContent =
                    copy.unavailable;
            }

            return;
        }

        const arcData =
            experimental?.arcs;

        if (!arcData) {
            if (arcs) {
                arcs.innerHTML = '';
            }

            if (status) {
                status.textContent =
                    copy.unavailable;
            }

            return;
        }

        if (arcs) {
            const rows = [];

            if (arcData.low) {
                rows.push(
                    renderArc(copy.low, arcData.low)
                );
            }

            if (arcData.high) {
                rows.push(
                    renderArc(copy.high, arcData.high)
                );
            }

            arcs.replaceChildren(...rows);
        }

        if (status) {
            status.textContent =
                state.enabled
                    ? (
                        experimental.applied
                            ? `${copy.enabled} · ${copy.safe}`
                            : `${copy.enabled} · ${copy.statusFallback}`
                    )
                    : `${copy.disabled} · ${copy.preview}`;
        }
    }

    function setEnabled(
        enabled
    ) {
        state.enabled =
            Boolean(enabled);

        writeStoredEnabled(
            state.enabled
        );

        syncPanel();
        queueRerender();
    }

    async function initExperimentalTerrainCorrection() {
        if (
            state.initialized
        ) {
            return state.available;
        }

        state.initialized =
            true;

        try {
            const config =
                await fetchJson(
                    CONFIG_URL
                );

            const experimental =
                config
                    ?.experimentalCorrection;

            state.available =
                Boolean(
                    experimental
                        ?.available
                );

            state.config =
                experimental ||
                null;

            if (!state.available) {
                return false;
            }

            state.enabled =
                readStoredEnabled();

            wrapResolver();
            installFormatter();
            ensurePanel();
            syncPanel();

            return true;

        } catch (error) {
            state.available =
                false;

            state.enabled =
                false;

            state.lastError =
                error;

            console.warn(
                '[experimental-terrain-correction] Disabled; flat-table firing solutions remain authoritative.',
                error
            );

            return false;
        }
    }

    function getState() {
        return {
            initialized:
                state.initialized,
            available:
                state.available,
            enabled:
                state.enabled,
            ready:
                state.ready,
            loading:
                state.loading,
            appliesCorrections:
                Boolean(
                    state.enabled &&
                    state.ready
                ),
            safeOnly: true,
            platformCorrection:
                false,
            payloads: {
                lowMain:
                    Boolean(
                        state
                            .payloads
                            .lowMain
                    ),
                lowExtension:
                    Boolean(
                        state
                            .payloads
                            .lowExtension
                    ),
                highV2:
                    Boolean(
                        state
                            .payloads
                            .highV2
                    )
            },
            lastError:
                state.lastError
                    ?.message ??
                null
        };
    }

    window
        .initExperimentalTerrainCorrection =
        initExperimentalTerrainCorrection;

    window
        .setExperimentalTerrainCorrectionEnabled =
        setEnabled;

    window
        .getExperimentalTerrainCorrectionState =
        getState;

    window
        .syncExperimentalTerrainCorrectionUI =
        syncPanel;
})();
