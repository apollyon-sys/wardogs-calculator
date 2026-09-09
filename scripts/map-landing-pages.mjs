export const MAP_LANDING_PAGES = [
    {
        id: 'bakurani',
        name: 'Bakurani',
        title: 'WARDOGS Bakurani Map | Interactive Artillery Planner',
        description: 'Open the WARDOGS Bakurani interactive map for L81 Mortar and SPH-2 planning, calibrated coordinates, Terrain3D, contours, map tools and team lobbies.',
        imagePath: 'assets/map-pages/bakurani.webp',
        imageAlt: 'Bakurani landscape in WARDOGS with a church and sunflower field',
        heading: 'WARDOGS Bakurani Interactive Map',
        lead: 'Plan artillery positions, targets and squad annotations on the calibrated Bakurani map in WARDOGS Artillery Calculator. The map, firing solution and tactical tools stay in one browser workspace.',
        highlights: [
            'Calibrated Bakurani game-coordinate mapping',
            'L81 Mortar and SPH-2 firing solutions',
            'Optional Terrain3D context and terrain contours',
            'Live lobby planning with separate player firing solutions'
        ],
        facts: [
            { label: 'Published setting', value: 'Eastern European mountains' },
            { label: 'Known district', value: 'Factory district' },
            { label: 'Battlefield size', value: '256 km²' },
            { label: 'Core objective', value: 'Randomised 2 × 2 km Control Zone' }
        ],
        sections: [
            {
                id: 'bakurani-map-profile',
                heading: 'Bakurani: Mountains, Industry and a Moving Objective',
                paragraphs: [
                    'Published WARDOGS map coverage identifies Bakurani by a factory district surrounded by Eastern European mountains. Those two features distinguish the battlefield more clearly than a generic tactical-map label: industrial structures occupy part of a much wider mountain setting.',
                    'Team17 describes a WARDOGS match as up to 100 players divided between three teams. The full battlefield covers 256 km², but the scoring objective is a randomised 2 × 2 km Control Zone; the team with the most players inside earns points, and the first team to 100 wins.',
                    'The calculator aligns its Bakurani tiles, coordinate search, artillery point, target and annotations to one game-coordinate reference. The landing page does not load those tiles or the canvas engine until you open the interactive map.'
                ]
            },
            {
                id: 'bakurani-artillery-planning',
                heading: 'Artillery Planning on Bakurani',
                paragraphs: [
                    'Place an artillery position and a target by clicking the map or by entering coordinates. The calculator reports distance and azimuth, then shows the firing-table result for the selected weapon. Range status helps identify whether the current target is supported by that weapon.',
                    'Saved targets can retain firing information for later use. The ruler and coordinate search provide separate ways to check a position before committing a marker or firing solution.'
                ]
            },
            {
                id: 'bakurani-weapons',
                heading: 'L81 Mortar and SPH-2',
                paragraphs: [
                    'For L81 Mortar, the calculator uses the configured firing table to return a MIL value with distance, azimuth and range status. For SPH-2, it evaluates the available LOW and HIGH firing solutions independently.',
                    'Weapon selection, the active artillery point, target and range circle remain personal in a lobby. This lets several players work on Bakurani without replacing one another\'s active firing solution.'
                ]
            },
            {
                id: 'bakurani-terrain3d',
                heading: 'Terrain3D on Bakurani',
                paragraphs: [
                    'Bakurani includes terrain contour data and Terrain3D elevation coverage. Experimental Terrain3D correction for SPH-2 is opt-in and off by default. The normal firing-table value remains visible for comparison.',
                    'A Terrain3D candidate is applied only when the resolver classifies it as SAFE. Uncertain, unsupported or unreachable cases fall back to the normal firing table, and platform or chassis tilt is not corrected.'
                ]
            },
            {
                id: 'bakurani-live-map',
                heading: 'Live Team Map and Lobbies',
                paragraphs: [
                    'Create a lobby, share its invite link or code, and plan on the same Bakurani room map. Drawings, zones, polygons and user markers synchronise between connected participants.',
                    'Each participant keeps a separate weapon, artillery point, target and range circle. Teammates see labelled player positions without duplicate range circles. “Live” here means room collaboration inside the calculator; it does not represent live game-server data.'
                ]
            },
            {
                id: 'bakurani-map-tools',
                heading: 'Bakurani Map Tools',
                paragraphs: [
                    'Use the ruler for measurements, Pencil for freehand notes, Zone and Polygon for areas, Markers for tactical symbols, and Eraser plus Undo or Redo to revise the shared plan. Persistent Map Tools data can also be imported or exported.',
                    'These tools are part of the main calculator rather than a second map application, so the same controls work on desktop and mobile.'
                ]
            }
        ],
        faq: [
            {
                question: 'How do I open Bakurani directly in the calculator?',
                answer: 'Use the Open Bakurani Interactive Map button. It passes a validated map selection to the existing calculator, which opens with Bakurani selected.'
            },
            {
                question: 'Does the Bakurani map support L81 Mortar and SPH-2?',
                answer: 'Yes. The same Bakurani workspace supports L81 Mortar firing-table results and SPH-2 LOW and HIGH solutions.'
            },
            {
                question: 'Can a squad plan together on Bakurani?',
                answer: 'Yes. Lobby participants share drawings, zones, polygons and tactical markers while keeping their active weapon, artillery point, target and range circle separate.'
            },
            {
                question: 'Is Terrain3D required for Bakurani calculations?',
                answer: 'No. Terrain3D correction is experimental, optional and off by default. The standard firing table remains available and is used as the fallback.'
            }
        ],
        sources: [
            {
                label: 'Official WARDOGS game and match overview — Team17',
                url: 'https://www.team17.com/games/wardogs'
            },
            {
                label: 'WARDOGS maps overview — GameWatcher',
                url: 'https://www.gamewatcher.com/wardogs/maps'
            }
        ]
    },
    {
        id: 'ozeti',
        name: 'Ozeti',
        title: 'WARDOGS Ozeti Map | Tactical Artillery Calculator',
        description: 'Use the WARDOGS Ozeti interactive map for calibrated L81 Mortar and SPH-2 planning, coordinate search, Terrain3D, tactical tools and live team lobbies.',
        imagePath: 'assets/map-pages/ozeti.webp',
        imageAlt: 'Ozeti stadium and surrounding landscape in WARDOGS',
        heading: 'WARDOGS Ozeti Interactive Map',
        lead: 'Work from Ozeti\'s calibrated coordinate alignment, calculate L81 Mortar or SPH-2 solutions, and keep tactical annotations connected to the same map reference.',
        highlights: [
            'Corrected Ozeti playable-area alignment',
            'Coordinate search, ruler and saved targets',
            'Terrain contours and opt-in Terrain3D support',
            'Shared annotations in live team lobbies'
        ],
        facts: [
            { label: 'Published setting', value: 'Western Europe' },
            { label: 'Known landmark', value: 'Football stadium' },
            { label: 'Battlefield size', value: '256 km²' },
            { label: 'Core objective', value: 'Randomised 2 × 2 km Control Zone' }
        ],
        sections: [
            {
                id: 'ozeti-map-profile',
                heading: 'Ozeti: Western Europe and the Stadium',
                paragraphs: [
                    'Published coverage places Ozeti in Western Europe and identifies a football stadium as its defining landmark. That gives players a concrete visual reference without this guide inventing unofficial location names or claiming fixed tactical value for individual positions.',
                    'Ozeti follows the wider WARDOGS match structure: up to 100 players fight across three teams, while a randomised 2 × 2 km Control Zone selects the part of the 256 km² battlefield that matters for scoring in that match. The first team to reach 100 points wins.',
                    'Inside the calculator, Ozeti uses calibrated coordinates and corrected playable-area alignment. The image, grid, coordinate search and point placement therefore operate in one reference system, while this landing page remains a lightweight HTML guide.'
                ]
            },
            {
                id: 'ozeti-artillery-planning',
                heading: 'Coordinate-Based Artillery Planning on Ozeti',
                paragraphs: [
                    'Enter known coordinates or place the artillery and target visually. The result panel calculates distance, azimuth, coordinate deltas and the relevant MIL solution. You can lock a point while adjusting the other, then save useful targets with their firing summary.',
                    'Coordinate search can move the view to a specific location without changing the firing solution. The ruler is available when you want a map measurement that is independent of the active artillery and target pair.'
                ]
            },
            {
                id: 'ozeti-weapons',
                heading: 'Ozeti L81 Mortar and SPH-2 Solutions',
                paragraphs: [
                    'Select L81 Mortar for its configured firing-table MIL value and range status. Select SPH-2 to see the supported LOW and HIGH arcs alongside distance and azimuth.',
                    'The calculator does not turn the Ozeti landing page into a weapon database. It opens the same maintained firing workflow used by every supported map, avoiding duplicated ballistic logic.'
                ]
            },
            {
                id: 'ozeti-terrain3d',
                heading: 'Ozeti Terrain Contours and Terrain3D',
                paragraphs: [
                    'Ozeti has a toggleable contour layer and Terrain3D elevation data for supported SPH-2 previews. Terrain3D correction must be enabled manually and the ordinary firing table remains the default.',
                    'LOW and HIGH candidates are checked separately. Only a SAFE candidate can replace its displayed table result; otherwise the application retains the normal value. Vehicle and platform tilt remain outside the correction model.'
                ]
            },
            {
                id: 'ozeti-live-map',
                heading: 'A Shared Ozeti Map for Team Planning',
                paragraphs: [
                    'A lobby fixes the room to Ozeti and synchronises completed drawings, zones, polygons and user markers. Participants join with an invite link or code and can see labelled artillery-to-target overlays for teammates.',
                    'Active firing work remains individual: weapon choice, artillery position, target and range circle are not merged. The room is a collaborative planning layer, not a feed from a live WARDOGS match.'
                ]
            },
            {
                id: 'ozeti-map-tools',
                heading: 'Map Tools for an Ozeti Plan',
                paragraphs: [
                    'Sketch routes with Pencil, outline an area with Zone or Polygon, place configured tactical markers, measure with the ruler and remove annotations with Eraser. Undo and Redo are available for map-tool changes.',
                    'Map-tool data can be exported for a recovery or handoff workflow. Saved firing targets use their own import and export controls, keeping calculation records distinct from drawing geometry.'
                ]
            }
        ],
        faq: [
            {
                question: 'Is this a standalone Ozeti calculator?',
                answer: 'No. It is a lightweight Ozeti guide and direct entry point to the existing WARDOGS Artillery Calculator, so calculations are maintained in one application.'
            },
            {
                question: 'Can I search Ozeti by coordinates?',
                answer: 'Yes. The calculator includes coordinate search as well as direct artillery and target coordinate inputs on the calibrated Ozeti map.'
            },
            {
                question: 'What does an Ozeti lobby share?',
                answer: 'It shares drawings, zones, polygons and user markers. Each player keeps a private active weapon, artillery point, target and range circle, while labelled teammate positions remain visible.'
            },
            {
                question: 'Does Ozeti include terrain elevation support?',
                answer: 'Yes. Ozeti provides terrain contours and Terrain3D coverage, but experimental SPH-2 correction is opt-in and falls back to the normal firing table unless a candidate is SAFE.'
            }
        ],
        sources: [
            {
                label: 'Official WARDOGS game and match overview — Team17',
                url: 'https://www.team17.com/games/wardogs'
            },
            {
                label: 'WARDOGS maps overview — GameWatcher',
                url: 'https://www.gamewatcher.com/wardogs/maps'
            }
        ]
    },
    {
        id: 'zestafona',
        name: 'Zestafona',
        title: 'WARDOGS Zestafona Map | Live Tactical Map Planner',
        description: 'Open the WARDOGS Zestafona interactive map with calibrated artillery planning, L81 Mortar and SPH-2 solutions, Terrain3D, map tools and team lobbies.',
        imagePath: 'assets/map-pages/zestafona.webp',
        imageAlt: 'Zestafona industrial area and container yard in WARDOGS',
        heading: 'WARDOGS Zestafona Interactive Map',
        lead: 'Start a Zestafona artillery plan from a direct URL, then combine calibrated point placement, firing calculations and collaborative map tools in the main WARDOGS calculator.',
        highlights: [
            'Multi-resolution Zestafona map tiles',
            'Calibrated artillery and target placement',
            'SPH-2 Terrain3D preview with safe fallback',
            'Labelled teammate positions in shared lobbies'
        ],
        facts: [
            { label: 'Map status', value: 'Third map revealed ahead of Early Access' },
            { label: 'Visual focus', value: 'Factory, cranes and container yard' },
            { label: 'Battlefield size', value: '256 km²' },
            { label: 'Core objective', value: 'Randomised 2 × 2 km Control Zone' }
        ],
        sections: [
            {
                id: 'zestafona-map-profile',
                heading: 'Zestafona: The Industrial Map Reveal',
                paragraphs: [
                    'Zestafona was revealed as the third WARDOGS map ahead of Early Access. The reveal footage focuses on a derelict industrial complex with factory buildings, overhead cranes and stacks of shipping containers rather than presenting it as an unnamed generic battlefield.',
                    'A detailed authoritative list of Zestafona points of interest was not published with the reveal. This guide therefore avoids inventing location names, permanent objectives or tactical claims and limits the map profile to visible and published information.',
                    'Published coverage describes the launch battlefields as 256 km² maps using a randomised 2 × 2 km Control Zone. The calculator adds a calibrated Zestafona coordinate reference and multi-resolution tiles, but loads neither the tiles nor the map engine on this guide page.'
                ]
            },
            {
                id: 'zestafona-artillery-planning',
                heading: 'Build a Zestafona Firing Plan',
                paragraphs: [
                    'Set the artillery point, choose a target and read distance, azimuth, MIL and coordinate deltas from the result panel. Positions may be placed on the map or entered directly, and locks let one point stay fixed while the other is changed.',
                    'Saved targets preserve useful firing summaries for later restoration. They can include the associated artillery position when needed, and can be imported or exported separately from tactical drawings.'
                ]
            },
            {
                id: 'zestafona-weapons',
                heading: 'L81 Mortar and SPH-2 on Zestafona',
                paragraphs: [
                    'The L81 Mortar workflow reports the configured firing-table MIL value and whether the current target is within its supported range. SPH-2 planning exposes available LOW and HIGH solutions rather than collapsing them into one result.',
                    'Changing to Zestafona affects the map reference, not the calculator\'s ballistic implementation. The direct landing URL therefore adds a useful map entry point without cloning calculation code.'
                ]
            },
            {
                id: 'zestafona-terrain3d',
                heading: 'Terrain3D Context for Zestafona',
                paragraphs: [
                    'The Zestafona workspace includes a terrain contour overlay and Terrain3D elevation coverage. Experimental SPH-2 correction is disabled by default and is designed to be compared with the standard firing-table output.',
                    'The resolver applies only candidates marked SAFE and evaluates LOW and HIGH arcs independently. Missing, uncertain, unsupported or unreachable terrain results use the normal table, while chassis or platform tilt is not modelled.'
                ]
            },
            {
                id: 'zestafona-live-map',
                heading: 'Zestafona Live Team Map',
                paragraphs: [
                    'Start a lobby from Zestafona to give the room one fixed map. Connected players receive shared drawings, zones, polygons and tactical markers, and can identify teammate positions by their labels.',
                    'Every player still controls a separate weapon, artillery point, target and range circle. This is live browser-to-browser planning through the lobby service, not automatic tracking of players or events inside the game.'
                ]
            },
            {
                id: 'zestafona-map-tools',
                heading: 'Draw, Measure and Mark Zestafona',
                paragraphs: [
                    'The tool palette includes Ruler, Pencil, Zone, Polygon, Markers and Eraser, with Undo and Redo for map changes. These tools support both a quick personal sketch and a shared lobby plan.',
                    'Layer controls can show terrain contours and other available overlays. Import and export options provide a portable copy of map-tool data without embedding those annotations into this landing page.'
                ]
            }
        ],
        faq: [
            {
                question: 'How can I launch the Zestafona map directly?',
                answer: 'Select Open Zestafona Interactive Map. The link opens the main calculator with a validated Zestafona map parameter and then stores the selected preset normally.'
            },
            {
                question: 'Which artillery weapons are available on Zestafona?',
                answer: 'The calculator supports L81 Mortar firing-table results and SPH-2 LOW and HIGH solutions on Zestafona.'
            },
            {
                question: 'Can I draw zones and polygons on Zestafona?',
                answer: 'Yes. Zone and Polygon are available with Pencil, Ruler, Markers, Eraser, Undo and Redo in the main map-tool palette.'
            },
            {
                question: 'Is the Zestafona live map connected to a game server?',
                answer: 'No. “Live” describes synchronisation between calculator lobby participants. The application does not claim to receive live match or game-server telemetry.'
            }
        ],
        sources: [
            {
                label: 'Official WARDOGS game and match overview — Team17',
                url: 'https://www.team17.com/games/wardogs'
            },
            {
                label: 'WARDOGS maps overview — GameWatcher',
                url: 'https://www.gamewatcher.com/wardogs/maps'
            },
            {
                label: 'Zestafona map reveal — WARDOGS video',
                url: 'https://www.youtube.com/watch?v=8sgSjweihnw'
            }
        ]
    }
];

export const MAP_LANDING_PAGES_BY_ID =
    Object.fromEntries(
        MAP_LANDING_PAGES.map(page => [page.id, page])
    );

export const SITE_ORIGIN =
    'https://wardogs-artillery.com';

export function mapLandingUrl(id) {
    return `${SITE_ORIGIN}/maps/${id}/`;
}

function escapeHtml(value) {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

function renderParagraphs(paragraphs) {
    return paragraphs
        .map(paragraph => `<p>${escapeHtml(paragraph)}</p>`)
        .join('\n');
}

function renderSections(sections) {
    return sections
        .map(section => [
            `<section aria-labelledby="${escapeHtml(section.id)}" class="map-guide-section">`,
            `<h2 id="${escapeHtml(section.id)}">${escapeHtml(section.heading)}</h2>`,
            renderParagraphs(section.paragraphs),
            '</section>'
        ].join('\n'))
        .join('\n');
}

function renderHighlights(items) {
    return items
        .map(item => `<li>${escapeHtml(item)}</li>`)
        .join('\n');
}

function renderFacts(items) {
    return items
        .map(item => [
            '<div>',
            `<dt>${escapeHtml(item.label)}</dt>`,
            `<dd>${escapeHtml(item.value)}</dd>`,
            '</div>'
        ].join('\n'))
        .join('\n');
}

function renderSources(items) {
    return items
        .map(source => (
            `<li><a href="${escapeHtml(source.url)}" rel="external">${escapeHtml(source.label)}</a></li>`
        ))
        .join('\n');
}

function renderFaq(items) {
    return items
        .map(item => [
            '<details class="map-faq-item">',
            `<summary>${escapeHtml(item.question)}</summary>`,
            `<p>${escapeHtml(item.answer)}</p>`,
            '</details>'
        ].join('\n'))
        .join('\n');
}

function renderRelatedMaps(currentId) {
    return MAP_LANDING_PAGES
        .filter(page => page.id !== currentId)
        .map(page => (
            `<a href="maps/${escapeHtml(page.id)}/">${escapeHtml(page.name)} Interactive Map</a>`
        ))
        .join('\n');
}

function structuredData(page) {
    const url = mapLandingUrl(page.id);

    return JSON.stringify({
        '@context': 'https://schema.org',
        '@graph': [
            {
                '@type': 'WebPage',
                '@id': `${url}#webpage`,
                url,
                name: page.title,
                description: page.description,
                inLanguage: 'en',
                citation: page.sources.map(source => source.url),
                primaryImageOfPage: {
                    '@type': 'ImageObject',
                    url: `${SITE_ORIGIN}/${page.imagePath}`,
                    width: 1280,
                    height: 720,
                    caption: page.imageAlt
                },
                isPartOf: {
                    '@type': 'WebApplication',
                    name: 'WARDOGS Artillery Calculator',
                    url: `${SITE_ORIGIN}/`,
                    applicationCategory: 'GameApplication',
                    operatingSystem: 'Any'
                }
            },
            {
                '@type': 'BreadcrumbList',
                itemListElement: [
                    {
                        '@type': 'ListItem',
                        position: 1,
                        name: 'WARDOGS Artillery Calculator',
                        item: `${SITE_ORIGIN}/`
                    },
                    {
                        '@type': 'ListItem',
                        position: 2,
                        name: `${page.name} Interactive Map`,
                        item: url
                    }
                ]
            }
        ]
    }, null, 2).replaceAll('<', '\\u003c');
}

export function renderMapLandingPage(template, page) {
    const replacements = {
        '{{TITLE}}': escapeHtml(page.title),
        '{{DESCRIPTION}}': escapeHtml(page.description),
        '{{CANONICAL}}': escapeHtml(mapLandingUrl(page.id)),
        '{{IMAGE_PATH}}': escapeHtml(page.imagePath),
        '{{IMAGE_URL}}': escapeHtml(`${SITE_ORIGIN}/${page.imagePath}`),
        '{{IMAGE_ALT}}': escapeHtml(page.imageAlt),
        '{{MAP_NAME}}': escapeHtml(page.name),
        '{{MAP_ID}}': escapeHtml(page.id),
        '{{H1}}': escapeHtml(page.heading),
        '{{LEAD}}': escapeHtml(page.lead),
        '{{HIGHLIGHTS}}': renderHighlights(page.highlights),
        '{{FACTS}}': renderFacts(page.facts),
        '{{SECTIONS}}': renderSections(page.sections),
        '{{FAQ}}': renderFaq(page.faq),
        '{{SOURCES}}': renderSources(page.sources),
        '{{RELATED_MAPS}}': renderRelatedMaps(page.id),
        '{{JSON_LD}}': structuredData(page)
    };

    let html = template;

    for (const [placeholder, value] of Object.entries(replacements)) {
        html = html.replaceAll(placeholder, value);
    }

    return html;
}
