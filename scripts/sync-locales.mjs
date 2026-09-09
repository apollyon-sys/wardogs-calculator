import { readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
    MAP_LANDING_PAGES,
    mapLandingUrl
} from './map-landing-pages.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const dist = join(root, 'dist');
const SITE_ORIGIN = 'https://wardogs-artillery.com';
const DEFAULT_LANGUAGE = 'en';

function escapeHtml(value) {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

function escapeXml(value) {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&apos;');
}

async function exists(path) {
    try {
        await stat(path);
        return true;
    } catch {
        return false;
    }
}

async function readLocaleRegistry() {
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

function desktopUrl(definition) {
    return definition.id === DEFAULT_LANGUAGE
        ? `${SITE_ORIGIN}/`
        : `${SITE_ORIGIN}/${definition.id}/`;
}

function replaceCanonical(html, url) {
    const link = `<link href="${escapeHtml(url)}" rel="canonical"/>`;
    if (/<link\b[^>]*\brel="canonical"[^>]*>/i.test(html)) {
        return html.replace(/<link\b[^>]*\brel="canonical"[^>]*>/i, link);
    }
    return html.replace(/<\/head>/i, `${link}\n</head>`);
}

function replaceOrInsertMeta(html, attribute, key, content) {
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(
        `<meta\\b[^>]*\\b${attribute}="${escapedKey}"[^>]*>`,
        'i'
    );
    const replacement = `<meta ${attribute}="${escapeHtml(key)}" content="${escapeHtml(content)}"/>`;

    if (pattern.test(html)) {
        return html.replace(pattern, replacement);
    }

    return html.replace(/<\/head>/i, `${replacement}\n</head>`);
}

function removeHreflangLinks(head) {
    return head.replace(
        /<link\b[^>]*>\s*/gi,
        tag => (
            /\brel="alternate"/i.test(tag) &&
            /\bhreflang="/i.test(tag)
                ? ''
                : tag
        )
    );
}

function syncHreflang(html, indexableLanguages) {
    return html.replace(
        /<head>[\s\S]*?<\/head>/i,
        head => {
            const cleaned = removeHreflangLinks(head);
            const links = indexableLanguages
                .map(definition => (
                    `<link href="${escapeHtml(desktopUrl(definition))}" hreflang="${escapeHtml(definition.hreflang)}" rel="alternate"/>`
                ))
                .concat(
                    `<link href="${SITE_ORIGIN}/" hreflang="x-default" rel="alternate"/>`
                )
                .join('\n');

            return cleaned.replace(
                /(<link\b[^>]*\brel="canonical"[^>]*>)/i,
                `$1\n${links}`
            );
        }
    );
}

function syncOgLocales(html, current, indexableLanguages) {
    if (!current?.ogLocale) return html;

    return html.replace(
        /<head>[\s\S]*?<\/head>/i,
        head => {
            const cleaned = head.replace(
                /<meta\b[^>]*\bproperty="og:locale(?::alternate)?"[^>]*>\s*/gi,
                ''
            );

            const locales = [
                `<meta content="${escapeHtml(current.ogLocale)}" property="og:locale"/>`,
                ...indexableLanguages
                    .filter(item => item.id !== current.id && item.ogLocale)
                    .map(item => (
                        `<meta content="${escapeHtml(item.ogLocale)}" property="og:locale:alternate"/>`
                    ))
            ].join('\n');

            if (/<meta\b[^>]*\bproperty="og:site_name"[^>]*>/i.test(cleaned)) {
                return cleaned.replace(
                    /(<meta\b[^>]*\bproperty="og:site_name"[^>]*>)/i,
                    `$1\n${locales}`
                );
            }

            return cleaned.replace(/<\/head>/i, `${locales}\n</head>`);
        }
    );
}

function syncHtmlLanguage(html, definition) {
    return html.replace(
        /<html\b[^>]*>/i,
        tag => {
            let next = tag;
            if (/\blang="[^"]*"/i.test(next)) {
                next = next.replace(/\blang="[^"]*"/i, `lang="${escapeHtml(definition.hreflang)}"`);
            } else {
                next = next.replace(/>$/, ` lang="${escapeHtml(definition.hreflang)}">`);
            }
            if (/\bdata-page-language="[^"]*"/i.test(next)) {
                next = next.replace(/\bdata-page-language="[^"]*"/i, `data-page-language="${escapeHtml(definition.id)}"`);
            }
            return next;
        }
    );
}

async function buildSitemap(indexableLanguages, lastModified) {
    const alternateLinks = indexableLanguages
        .map(definition => (
            `    <xhtml:link rel="alternate" hreflang="${escapeXml(definition.hreflang)}" href="${escapeXml(desktopUrl(definition))}" />`
        ))
        .concat(
            `    <xhtml:link rel="alternate" hreflang="x-default" href="${SITE_ORIGIN}/" />`
        )
        .join('\n');

    const localeUrls = indexableLanguages
        .map(definition => [
            '  <url>',
            `    <loc>${escapeXml(desktopUrl(definition))}</loc>`,
            alternateLinks,
            '    <changefreq>weekly</changefreq>',
            `    <lastmod>${escapeXml(lastModified)}</lastmod>`,
            '  </url>'
        ].join('\n'))
        .join('\n');

    const mapUrls = MAP_LANDING_PAGES.flatMap(page => {
        const mapAlternates = indexableLanguages
            .map(definition => (
                `    <xhtml:link rel="alternate" hreflang="${escapeXml(definition.hreflang)}" href="${escapeXml(mapLandingUrl(page.id, definition.id))}" />`
            ))
            .concat(
                `    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(mapLandingUrl(page.id))}" />`
            )
            .join('\n');

        return indexableLanguages.map(definition => [
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

    await writeFile(join(dist, 'sitemap.xml'), sitemap, 'utf8');
}

const registry = await readLocaleRegistry();
const indexableLanguages = registry.filter(item => item.indexable);
const appConfig = JSON.parse(
    await readFile(join(root, 'config', 'app.json'), 'utf8')
);

for (const definition of registry) {
    const desktopPath = definition.id === DEFAULT_LANGUAGE
        ? join(dist, 'index.html')
        : join(dist, definition.id, 'index.html');

    if (definition.indexable && !(await exists(desktopPath))) {
        throw new Error(
            `Indexable locale ${definition.id} has no desktop page. Add src/pages/locales/${definition.id}.html or mark it non-indexable.`
        );
    }

    if (await exists(desktopPath)) {
        let html = await readFile(desktopPath, 'utf8');
        html = syncHtmlLanguage(html, definition);
        html = replaceCanonical(html, desktopUrl(definition));
        html = replaceOrInsertMeta(html, 'property', 'og:url', desktopUrl(definition));
        if (definition.indexable) {
            html = syncHreflang(html, indexableLanguages);
            html = syncOgLocales(html, definition, indexableLanguages);
        }
        await writeFile(desktopPath, html, 'utf8');
    }

    const mobilePath = definition.id === DEFAULT_LANGUAGE
        ? join(dist, 'mobile', 'index.html')
        : join(dist, 'mobile', definition.id, 'index.html');

    if (await exists(mobilePath)) {
        let html = await readFile(mobilePath, 'utf8');
        html = syncHtmlLanguage(html, definition);
        html = replaceCanonical(html, desktopUrl(definition));
        await writeFile(mobilePath, html, 'utf8');
    }
}

await buildSitemap(
    indexableLanguages,
    appConfig?.site?.lastModified || new Date().toISOString().slice(0, 10)
);

console.log(
    `Synchronized ${registry.length} locale routes with the shared localization pipeline.`
);
