import { cp, mkdir, readFile, rm, writeFile, readdir, stat } from 'node:fs/promises';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
    MAP_LANDING_PAGES,
    hasMapLandingLanguage,
    mapLandingPagesForLanguage,
    mapLandingUrl,
    renderMapLandingPage
} from './map-landing-pages.mjs';
import { SEO_ALTERNATE_NAMES, SEO_PAGE_CONTENT } from './seo-content.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const dist = join(root, 'dist');
const localTilesDirectory = join(root, 'maps', 'tiles');
const localTerrainPrefix = join(root, 'data', 'terrain') + sep;

function includeSharedSource(sourcePath) {
    if (sourcePath === localTilesDirectory) return false;
    if (!sourcePath.startsWith(localTerrainPrefix)) return true;

    const terrainParts = sourcePath
        .slice(localTerrainPrefix.length)
        .split(sep)
        .filter(Boolean);

    /*
     * Keep map directories traversable and publish only the precomputed,
     * lightweight contour overlay. Terrain manifests and binary chunks are
     * loaded from R2 and must not enter the Pages artifact.
     */
    return terrainParts.length === 1 || (
        terrainParts.length === 2 &&
        terrainParts[1] === 'contours.json'
    );
}

const NON_INDEXABLE_PAGE_LANGUAGES =
    new Set(['cat']);

const sourceDirs = [
    'assets',
    'config',
    'data',
    'js',
    'locales',
    'maps'
];

const commonSourceFiles = [
    'robots.txt',
    'LICENSE'
];

const desktopStyleFiles = [
    'styles/desktop/base.css',
    'styles/desktop/layout.css',
    'styles/desktop/controls.css',
    'styles/desktop/map.css',
    'styles/desktop/saved-targets.css',
    'styles/desktop/chrome.css',
    'styles/desktop/map-tools.css',
    'styles/desktop/motd.css',
    'styles/desktop/lobby.css',
    'styles/desktop/feedback.css',
    'styles/desktop/seo.css'
];

const mobileStyleFiles = [
    'styles/mobile/shell.css',
    'styles/mobile/map.css',
    'styles/mobile/tools.css',
    'styles/mobile/sheet.css',
    'styles/mobile/responsive.css'
];

const desktopScriptFiles = [
    'js/core/core.js',
    'js/core/resources.js',
    'js/core/config.js',
    'js/core/analytics.js',
    'js/core/file-transfer.js',
    'js/ui/i18n.js',
    'js/ui/theme.js',
    'js/ui/footer.js',
    'js/ui/layout.js',
    'js/features/saved-targets.js',
    'js/features/motd.js',
    'js/features/weapons.js',
    'js/map/assets.js',
    'js/map/maps.js',
    'js/map/map-view.js',
    'js/map/camera-keys.js',
    'js/map/tiles.js',
    'js/map/contours.js',
    'js/map/overlays.js',
    'js/map/map-tools.js',
    'js/map/grid.js',
    'js/map/renderer.js',
    'js/features/coordinates.js',
    'js/features/point-locks.js',
    'js/features/results.js',
    'js/ui/inputs.js',
    'js/ui/cursor.js',
    'js/events.js',
    'js/main.js'
];

const mobileScriptFiles = [
    'js/core/core.js',
    'js/core/resources.js',
    'js/core/config.js',
    'js/core/analytics.js',
    'js/core/file-transfer.js',
    'js/ui/i18n.js',
    'js/ui/theme.js',
    'js/ui/footer.js',
    'js/ui/layout.js',
    'js/features/saved-targets.js',
    'js/features/motd.js',
    'js/features/weapons.js',
    'js/map/assets.js',
    'js/map/maps.js',
    'js/map/map-view.js',
    'js/map/tiles.js',
    'js/map/contours.js',
    'js/map/overlays.js',
    'js/map/map-tools.js',
    'js/map/grid.js',
    'js/map/renderer.js',
    'js/features/coordinates.js',
    'js/features/point-locks.js',
    'js/features/results.js',
    'js/ui/inputs.js',
    'js/ui/cursor.js',
    'js/events.js',
    'js/mobile/mobile.js',
    'js/main.js'
];

const ASSET_CDN_ORIGIN =
    'https://assets.wardogs-artillery.com';

async function exists(path) {
    try {
        await stat(path);
        return true;
    } catch {
        return false;
    }
}

async function getLanguageDefinitions() {
    const index = JSON.parse(
        await readFile(join(root, 'locales', 'index.json'), 'utf8')
    );
    const languages = Array.isArray(index.languages)
        ? index.languages
        : [];

    return languages
        .filter(item => item?.id && item?.file)
        .map(item => ({
            ...item,
            id: String(item.id).toLowerCase(),
            hreflang: item.hreflang || item.id,
            ogLocale: item.ogLocale || null,
            indexable: item.indexable !== false
        }));
}

function addProductionSecurityMeta(html, appConfig) {
    const collab = appConfig.collab || {};
    const turnstileEnabled = collab.turnstile?.enabled === true;
    const connectSources = new Set([
        "'self'",
        'https://assets.wardogs-artillery.com',
        'https://cloud.umami.is',
        'https://gateway.umami.is'
    ]);

    if (collab.serverUrl) {
        const server = new URL(collab.serverUrl);
        connectSources.add(server.origin);
        if (server.protocol === 'https:') connectSources.add(`wss://${server.host}`);
    }
    if (turnstileEnabled) connectSources.add('https://challenges.cloudflare.com');

    const scriptSources = ["'self'", 'https://cloud.umami.is'];
    if (turnstileEnabled) scriptSources.push('https://challenges.cloudflare.com');

    const imageSources = [
        "'self'",
        'data:',
        'blob:',
        'https://assets.wardogs-artillery.com'
    ];
    if (turnstileEnabled) imageSources.push('https://challenges.cloudflare.com');

    const policy = [
        "default-src 'self'",
        `script-src ${scriptSources.join(' ')}`,
        "script-src-attr 'none'",
        "style-src 'self' 'unsafe-inline'",
        `img-src ${imageSources.join(' ')}`,
        `connect-src ${[...connectSources].join(' ')}`,
        `frame-src ${turnstileEnabled ? 'https://challenges.cloudflare.com' : "'none'"}`,
        "font-src 'self' data:",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "worker-src 'self' blob:",
        'upgrade-insecure-requests'
    ].join('; ');

    const metadata = [
        `<meta content="${policy}" http-equiv="Content-Security-Policy"/>`,
        '<meta content="no-referrer" name="referrer"/>'
    ].join('\n');

    return html.replace(
        /(<meta\b[^>]*\bcharset\s*=\s*["'][^"']+["'][^>]*>)/i,
        `$1\n${metadata}`
    );
}

async function copyIfExists(source, target) {
    if (!(await exists(source))) return;
    await cp(source, target, {
        recursive: true,
        filter: includeSharedSource
    });
}

async function bundleStyleFiles(files, outputName) {
    let css = '';

    for (const file of files) {
        css += await readFile(
            join(root, file),
            'utf8'
        );
    }

    await writeFile(
        join(dist, outputName),
        css,
        'utf8'
    );
}

async function bundleStyles() {
    await bundleStyleFiles(
        desktopStyleFiles,
        'style.css'
    );

    await bundleStyleFiles(
        mobileStyleFiles,
        'mobile.css'
    );

    await mkdir(
        join(dist, 'styles'),
        { recursive: true }
    );

    await copyIfExists(
        join(root, 'styles', 'map-landing.css'),
        join(dist, 'styles', 'map-landing.css')
    );
}

async function bundleScriptFiles(
    files,
    outputName
) {
    let javascript = '';

    for (const file of files) {
        javascript +=
            `\n/* ${file} */\n`;

        javascript +=
            await readFile(
                join(root, file),
                'utf8'
            );

        /*
         * Keep a hard statement boundary between source files so the
         * production bundle cannot be affected by automatic semicolon
         * insertion at a file boundary.
         */
        javascript += '\n;\n';
    }

    await mkdir(
        join(dist, 'js'),
        { recursive: true }
    );

    await writeFile(
        join(
            dist,
            'js',
            outputName
        ),
        javascript,
        'utf8'
    );
}

async function bundleScripts() {
    await bundleScriptFiles(
        desktopScriptFiles,
        'app.bundle.js'
    );

    await bundleScriptFiles(
        mobileScriptFiles,
        'mobile.bundle.js'
    );
}

function replaceApplicationScripts(
    html,
    scriptFiles,
    bundleFile
) {
    let output = html;
    let bundleInserted = false;

    for (const file of scriptFiles) {
        const escapedFile =
            file.replace(
                /[.*+?^${}()|[\]\\]/g,
                '\\$&'
            );

        const pattern =
            new RegExp(
                `<script\\s+src="${escapedFile}"></script>\\s*`,
                'i'
            );

        if (!pattern.test(output)) {
            throw new Error(
                `Missing expected application script ${file}`
            );
        }

        output = output.replace(
            pattern,
            bundleInserted
                ? ''
                : `<script src="${bundleFile}"></script>\n`
        );

        bundleInserted = true;
    }

    return output;
}

function addAssetConnectionHints(html) {
    if (
        html.includes(
            `href="${ASSET_CDN_ORIGIN}" rel="preconnect"`
        )
    ) {
        return html;
    }

    const hints = [
        `<link crossorigin href="${ASSET_CDN_ORIGIN}" rel="preconnect"/>`,
        '<link href="//assets.wardogs-artillery.com" rel="dns-prefetch"/>'
    ].join('\n');

    return html.replace(
        /(<meta\b[^>]*\bcharset\s*=\s*["'][^"']+["'][^>]*>)/i,
        `$1\n${hints}`
    );
}

async function copySharedStatic() {
    for (const dir of sourceDirs) {
        await copyIfExists(
            join(root, dir),
            join(dist, dir)
        );
    }

    for (const file of commonSourceFiles) {
        await copyIfExists(
            join(root, file),
            join(dist, file)
        );
    }

    for (const file of ['CNAME']) {
        await copyIfExists(
            join(root, file),
            join(dist, file)
        );
    }
}

function replaceElementTextById(html, id, value) {
    const escapedId = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(
        `(<([a-z0-9]+)\\b[^>]*\\bid="${escapedId}"[^>]*>)[\\s\\S]*?(</\\2>)`,
        'i'
    );

    return html.replace(pattern, `$1${value}$3`);
}

function normalizeDesktopRuntimePlaceholders(html) {
    const runtimeValueIds = [
        'range',
        'rangeStatus',
        'distm',
        'dist',
        'angle',
        'dx',
        'dy'
    ];

    let output = html;

    for (const id of runtimeValueIds) {
        output = replaceElementTextById(
            output,
            id,
            '—'
        );
    }

    return output;
}

function refreshSeoMetadata(html, appConfig) {
    const version = appConfig?.site?.footer?.version;

    let output = html.replace(
        /<head>[\s\S]*?<\/head>/i,
        head => head
            .replace(/\bSPG\b/g, 'SPH-2')
            .replace(/mortar and SPH-2 solutions/gi, 'L81 Mortar and SPH-2 firing solutions')
    );

    output = output.replace(
        /<script type="application\/ld\+json">([\s\S]*?)<\/script>/i,
        (match, jsonText) => {
            try {
                const data = JSON.parse(jsonText.trim());

                data.alternateName = 'WARDOGS Artillery Calculator & Tactical Map';

                if (version) {
                    data.softwareVersion = version;
                }

                if (typeof data.description === 'string') {
                    data.description = data.description
                        .replace(/\bSPG\b/g, 'SPH-2')
                        .replace(/mortar and SPH-2 solutions/gi, 'L81 Mortar and SPH-2 firing solutions');
                }

                return `<script type="application/ld+json">${JSON.stringify(data, null, 2)}</script>`;
            } catch {
                return match;
            }
        }
    );

    return output;
}

function escapeSeoHtml(value) {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

function escapeSeoRegExp(value) {
    return String(value)
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function replaceSeoTitle(
    html,
    title
) {
    if (!title) {
        return html;
    }

    return html.replace(
        /<title>[\s\S]*?<\/title>/i,
        `<title>${escapeSeoHtml(title)}</title>`
    );
}

function replaceSeoMetaContent(
    html,
    attribute,
    key,
    value
) {
    const pattern = new RegExp(
        `<meta\\b[^>]*\\b${escapeSeoRegExp(attribute)}="${escapeSeoRegExp(key)}"[^>]*>`,
        'i'
    );

    return html.replace(
        pattern,
        tag => {
            const content =
                escapeSeoHtml(value);

            if (/\bcontent="[^"]*"/i.test(tag)) {
                return tag.replace(
                    /\bcontent="[^"]*"/i,
                    `content="${content}"`
                );
            }

            return tag.replace(
                />$/,
                ` content="${content}">`
            );
        }
    );
}

function refreshSeoV2StructuredData(
    html,
    appConfig,
    copy,
    language
) {
    const version =
        appConfig?.site?.footer?.version;

    return html.replace(
        /<script type="application\/ld\+json">([\s\S]*?)<\/script>/i,
        (match, jsonText) => {
            try {
                const data =
                    JSON.parse(
                        jsonText.trim()
                    );

                data.description =
                    copy.description;

                data.url =
                    desktopUrlForLanguage(language);

                data.inLanguage =
                    language;

                data.alternateName =
                    [...(copy.alternateNames || SEO_ALTERNATE_NAMES)];

                data.featureList =
                    [...copy.features];

                if (version) {
                    data.softwareVersion =
                        version;
                }

                return `<script type="application/ld+json">${JSON.stringify(data, null, 2)}</script>`;
            } catch {
                return match;
            }
        }
    );
}

function injectFaqStructuredData(
    html,
    faq
) {
    if (
        !Array.isArray(faq) ||
        !faq.length ||
        html.includes('\"@type\": \"FAQPage\"')
    ) {
        return html;
    }

    const data = {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faq.map(item => ({
            '@type': 'Question',
            name: item.question,
            acceptedAnswer: {
                '@type': 'Answer',
                text: item.answer
            }
        }))
    };

    const script =
        `<script type="application/ld+json">${JSON.stringify(data, null, 2)}</script>`;

    return html.replace(
        /<\/head>/i,
        `${script}\n</head>`
    );
}

function renderSeoTopicLinks(cluster, faq, faqLabel = 'FAQ') {
    const links = [
        {
            id: 'wardogs-artillery-calculator',
            label: cluster.heading
        },
        ...cluster.sections.map(section => ({
            id: section.id,
            label: section.heading,
            href: section.href
        }))
    ];

    if (Array.isArray(faq) && faq.length) {
        links.push({
            id: 'wardogs-calculator-faq',
            label: faqLabel
        });
    }

    return links
        .map(link => (
            `<a href="${link.href ? escapeSeoHtml(link.href) : `#${escapeSeoHtml(link.id)}`}">${escapeSeoHtml(link.label)}</a>`
        ))
        .join('');
}

function renderSeoFaq(faq, heading = 'WARDOGS Artillery Calculator FAQ') {
    if (!Array.isArray(faq) || !faq.length) {
        return '';
    }

    const items = faq
        .map(item => [
            '<details class="seo-faq-item">',
            `<summary>${escapeSeoHtml(item.question)}</summary>`,
            `<p>${escapeSeoHtml(item.answer)}</p>`,
            '</details>'
        ].join('\n'))
        .join('\n');

    return [
        '<section class="seo-faq" id="wardogs-calculator-faq">',
        `<h3>${escapeSeoHtml(heading)}</h3>`,
        items,
        '</section>'
    ].join('\n');
}

function injectSeoContentCluster(
    html,
    copy
) {
    const cluster = copy.cluster;

    if (
        !cluster ||
        !Array.isArray(cluster.sections) ||
        !cluster.sections.length ||
        html.includes('class="seo-content-cluster"')
    ) {
        return html;
    }

    const sections = cluster.sections
        .map(section => {
            const heading = section.href
                ? `<a href="${escapeSeoHtml(section.href)}">${escapeSeoHtml(section.heading)}</a>`
                : escapeSeoHtml(section.heading);

            return [
                `<section class="seo-topic" id="${escapeSeoHtml(section.id)}">`,
                `<h3>${heading}</h3>`,
                `<p>${escapeSeoHtml(section.body)}</p>`,
                '</section>'
            ].join('\n');
        })
        .join('\n');

    const block = [
        '<div class="section seo-content-cluster">',
        `<h2 id="wardogs-artillery-calculator">${escapeSeoHtml(cluster.heading)}</h2>`,
        `<p class="seo-content-lead">${escapeSeoHtml(cluster.intro)}</p>`,
        `<nav aria-label="${escapeSeoHtml(cluster.navLabel)}" class="seo-topic-nav">`,
        renderSeoTopicLinks(
            cluster,
            copy.faq,
            copy.faqLabel || 'FAQ'
        ),
        '</nav>',
        '<div class="seo-topic-list">',
        sections,
        '</div>',
        renderSeoFaq(
            copy.faq,
            copy.faqHeading || 'WARDOGS Artillery Calculator FAQ'
        ),
        '</div>'
    ].join('\n');

    return html.replace(
        /<\/aside>/i,
        `${block}\n</aside>`
    );
}

function injectSeoAbout(
    html,
    copy
) {
    if (
        html.includes(
            'class="seo-about"'
        )
    ) {
        return html;
    }

    const block = [
        '<div class="section seo-about-section">',
        '<details class="seo-about">',
        `<summary>${escapeSeoHtml(copy.heading)}</summary>`,
        '<div class="seo-about-copy">',
        `<p>${escapeSeoHtml(copy.intro)}</p>`,
        `<p>${escapeSeoHtml(copy.usage)}</p>`,
        '</div>',
        '</details>',
        '</div>'
    ].join('\n');

    return html.replace(
        /<\/aside>/i,
        `${block}\n</aside>`
    );
}

function applySeoV2(
    html,
    appConfig,
    language
) {
    const copy =
        SEO_PAGE_CONTENT[language] ||
        SEO_PAGE_CONTENT.en;

    let output =
        replaceSeoMetaContent(
            html,
            'name',
            'description',
            copy.description
        );

    if (copy.title) {
        output =
            replaceSeoTitle(
                output,
                copy.title
            );

        output =
            replaceSeoMetaContent(
                output,
                'property',
                'og:title',
                copy.title
            );

        output =
            replaceSeoMetaContent(
                output,
                'name',
                'twitter:title',
                copy.title
            );
    }

    output =
        replaceSeoMetaContent(
            output,
            'property',
            'og:description',
            copy.description
        );

    output =
        replaceSeoMetaContent(
            output,
            'name',
            'twitter:description',
            copy.description
        );

    if (copy.imageAlt) {
        output =
            replaceSeoMetaContent(
                output,
                'property',
                'og:image:alt',
                copy.imageAlt
            );
    }

    output =
        refreshSeoV2StructuredData(
            output,
            appConfig,
            copy,
            language
        );

    if (copy.cluster) {
        output =
            injectSeoContentCluster(
                output,
                copy
            );

        output =
            injectFaqStructuredData(
                output,
                copy.faq
            );
    } else {
        output =
            injectSeoAbout(
                output,
                copy
            );
    }

    return output;
}

function mobileUrlForLanguage(language) {
    return language === 'en'
        ? 'https://wardogs-artillery.com/mobile/'
        : `https://wardogs-artillery.com/mobile/${language}/`;
}

function addMobileAlternate(html, language) {
    const mobileUrl = mobileUrlForLanguage(language);
    const mobileAlternate = `<link href="${mobileUrl}" media="only screen and (max-width: 900px)" rel="alternate"/>`;

    if (html.includes(mobileAlternate)) {
        return html;
    }

    return html.replace(
        /(<link\b[^>]*\brel="canonical"[^>]*\/?>)/i,
        `$1\n${mobileAlternate}`
    );
}

async function writeDesktopPage(source, target, appConfig, language) {
    const html = await readFile(source, 'utf8');
    const prepared =
        replaceApplicationScripts(
            addProductionSecurityMeta(
                addAssetConnectionHints(
                    addMobileAlternate(
                        applySeoV2(
                            refreshSeoMetadata(
                                normalizeDesktopRuntimePlaceholders(html),
                                appConfig
                            ),
                            appConfig,
                            language
                        ),
                        language
                    )
                ),
                appConfig
            ),
            desktopScriptFiles,
            'js/app.bundle.js'
        );

    await writeFile(target, prepared, 'utf8');
}

async function buildDesktopPages() {
    const appConfig = await readAppConfig();

    await writeDesktopPage(
        join(root, 'src', 'pages', 'index.html'),
        join(dist, 'index.html'),
        appConfig,
        'en'
    );

    const localizedDir = join(
        root,
        'src',
        'pages',
        'locales'
    );

    if (!(await exists(localizedDir))) {
        return;
    }

    const files = await readdir(localizedDir);

    for (const file of files) {
        if (!file.endsWith('.html')) continue;

        const lang = file.slice(0, -5);
        const targetDir = join(dist, lang);

        await mkdir(targetDir, { recursive: true });
        await writeDesktopPage(
            join(localizedDir, file),
            join(targetDir, 'index.html'),
            appConfig,
            lang
        );
    }
}

async function buildMapLandingPages() {
    const template = await readFile(
        join(root, 'src', 'pages', 'maps', 'template.html'),
        'utf8'
    );
    const appConfig = await readAppConfig();
    const languages = await getLanguageDefinitions();

    for (const language of languages) {
        if (!hasMapLandingLanguage(language.id)) {
            throw new Error(
                `Missing map landing localization for ${language.id}`
            );
        }

        for (const page of mapLandingPagesForLanguage(language.id)) {
            const targetDir = language.id === 'en'
                ? join(dist, 'maps', page.id)
                : join(dist, language.id, 'maps', page.id);
            const html = addProductionSecurityMeta(
                renderMapLandingPage(template, page, {
                    languageDefinition: language,
                    languages
                }),
                appConfig
            );

            await mkdir(targetDir, { recursive: true });
            await writeFile(join(targetDir, 'index.html'), html, 'utf8');
        }
    }
}

async function readAppConfig() {
    const path = join(root, 'config', 'app.json');
    return JSON.parse(await readFile(path, 'utf8'));
}

function escapeXml(value) {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&apos;');
}

function desktopUrlForLanguage(language) {
    return language === 'en'
        ? 'https://wardogs-artillery.com/'
        : `https://wardogs-artillery.com/${language}/`;
}

async function buildSitemap() {
    const appConfig = await readAppConfig();
    const definitions = (await getLanguageDefinitions())
        .filter(definition => definition.indexable);
    const lastModified = appConfig?.site?.lastModified
        || new Date().toISOString().slice(0, 10);

    const alternateLinks = definitions
        .map(definition => (
            `    <xhtml:link rel="alternate" hreflang="${escapeXml(definition.hreflang)}" href="${escapeXml(desktopUrlForLanguage(definition.id))}" />`
        ))
        .concat(
            '    <xhtml:link rel="alternate" hreflang="x-default" href="https://wardogs-artillery.com/" />'
        )
        .join('\n');

    const localeUrls = definitions
        .map(definition => [
            '  <url>',
            `    <loc>${escapeXml(desktopUrlForLanguage(definition.id))}</loc>`,
            alternateLinks,
            '    <changefreq>weekly</changefreq>',
            `    <lastmod>${escapeXml(lastModified)}</lastmod>`,
            '  </url>'
        ].join('\n'))
        .join('\n');

    const mapUrls = MAP_LANDING_PAGES.flatMap(page => {
        const mapAlternates = definitions
            .map(definition => (
                `    <xhtml:link rel="alternate" hreflang="${escapeXml(definition.hreflang)}" href="${escapeXml(mapLandingUrl(page.id, definition.id))}" />`
            ))
            .concat(
                `    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(mapLandingUrl(page.id))}" />`
            )
            .join('\n');

        return definitions.map(definition => [
            '  <url>',
            `    <loc>${escapeXml(mapLandingUrl(page.id, definition.id))}</loc>`,
            mapAlternates,
            '    <changefreq>weekly</changefreq>',
            `    <lastmod>${escapeXml(lastModified)}</lastmod>`,
            '  </url>'
        ].join('\n'));
    })
        .join('\n');

    const urls = [localeUrls, mapUrls]
        .filter(Boolean)
        .join('\n');

    const sitemap = [
        '<?xml version="1.0" encoding="utf-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
        urls,
        '</urlset>',
        ''
    ].join('\n');

    await writeFile(
        join(dist, 'sitemap.xml'),
        sitemap,
        'utf8'
    );
}

function renderMobileLocale(template, language) {
    const isDefault = language === 'en';

    const desktopCanonical = isDefault
        ? 'https://wardogs-artillery.com/'
        : `https://wardogs-artillery.com/${language}/`;

    const baseHref = isDefault
        ? '../'
        : '../../';

    const indexableTemplate =
        NON_INDEXABLE_PAGE_LANGUAGES.has(
            language
        )
            ? template
            : template.replace(
                '<meta content="noindex, follow" name="robots"/>',
                '<meta content="index, follow, max-image-preview:large" name="robots"/>'
            );

    return indexableTemplate
        .replace(
            '<html data-page-language="en" lang="en">',
            `<html data-page-language="${language}" lang="${language}">`
        )
        .replace(
            '<base href="../"/>',
            `<base href="${baseHref}"/>`
        )
        .replace(
            '<link href="https://wardogs-artillery.com/" rel="canonical"/>',
            `<link href="${desktopCanonical}" rel="canonical"/>`
        )
        .replace(
            'href="../?desktop=1"',
            `href="${desktopCanonical}?desktop=1"`
        );
}

async function getMobileLanguages() {
    const indexPath = join(
        root,
        'locales',
        'index.json'
    );

    const index = JSON.parse(
        await readFile(indexPath, 'utf8')
    );

    const configured = Array.isArray(index.languages)
        ? index.languages
            .map(item => item?.id)
            .filter(Boolean)
        : [];

    return Array.from(
        new Set(['en', ...configured])
    );
}

async function buildMobilePages() {
    const mobileRoot = join(
        dist,
        'mobile'
    );

    await mkdir(
        mobileRoot,
        { recursive: true }
    );

    const template = await readFile(
        join(
            root,
            'src',
            'pages',
            'mobile',
            'index.html'
        ),
        'utf8'
    );

    const appConfig =
        await readAppConfig();

    const languages =
        await getMobileLanguages();

    for (const language of languages) {
        const html =
            replaceApplicationScripts(
                addProductionSecurityMeta(
                    addAssetConnectionHints(
                        renderMobileLocale(
                            template,
                            language
                        )
                    ),
                    appConfig
                ),
                mobileScriptFiles,
                'js/mobile.bundle.js'
            );

        if (language === 'en') {
            await writeFile(
                join(
                    mobileRoot,
                    'index.html'
                ),
                html,
                'utf8'
            );
            continue;
        }

        const targetDir = join(
            mobileRoot,
            language
        );

        await mkdir(
            targetDir,
            { recursive: true }
        );

        await writeFile(
            join(
                targetDir,
                'index.html'
            ),
            html,
            'utf8'
        );
    }
}

/*
 * One repository, one Pages artifact, one custom domain.
 * Desktop and mobile page shells share the same JS, locales,
 * maps, tiles, configuration and localStorage origin.
 */
await rm(
    dist,
    { recursive: true, force: true }
);

/* Remove the legacy standalone mobile build if it exists. */
await rm(
    join(root, 'dist-mobile'),
    { recursive: true, force: true }
);

await mkdir(
    dist,
    { recursive: true }
);

await copySharedStatic();
await bundleStyles();
await bundleScripts();
await buildDesktopPages();
await buildMapLandingPages();
await buildSitemap();
await buildMobilePages();

console.log(`Built desktop + mobile site into ${dist}`);
console.log(`Mobile entry: ${join(dist, 'mobile', 'index.html')}`);
