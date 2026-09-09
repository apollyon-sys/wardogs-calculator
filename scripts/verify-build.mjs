import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import {
    MAP_LANDING_PAGES,
    mapCalculatorRoute,
    mapLandingPagesForLanguage,
    mapLandingRoute,
    mapLandingUrl
} from './map-landing-pages.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');

async function files(directory) {
    const output = [];
    for (const entry of await readdir(directory, { withFileTypes: true })) {
        const path = join(directory, entry.name);
        if (entry.isDirectory()) output.push(...await files(path));
        else output.push(path);
    }
    return output;
}

const artifactFiles = await files(dist);
const htmlFiles = artifactFiles.filter(path => path.endsWith('.html'));
assert.ok(htmlFiles.length > 1, 'expected desktop and mobile HTML routes');

for (const path of htmlFiles) {
    const page = relative(dist, path);
    const html = await readFile(path, 'utf8');
    assert.match(html, /http-equiv="Content-Security-Policy"/i, `${page}: missing CSP`);
    assert.match(html, /script-src-attr 'none'/, `${page}: inline handlers are not blocked`);
    assert.match(html, /https:\/\/lobby\.wardogs-artillery\.com/, `${page}: lobby is not allowed by CSP`);
    assert.match(html, /https:\/\/challenges\.cloudflare\.com/, `${page}: Turnstile is not allowed by CSP`);
    assert.match(html, /https:\/\/gateway\.umami\.is/, `${page}: Umami gateway is not allowed by CSP`);
    assert.doesNotMatch(html, /Content-Security-Policy[^>]+localhost/i, `${page}: development origin leaked into CSP`);
}

assert.equal(artifactFiles.some(path => path.endsWith('.bin')), false, 'terrain binaries entered the Pages artifact');
assert.equal(artifactFiles.some(path => path.includes(`${join('maps', 'tiles')}`)), false, 'map tiles entered the Pages artifact');

for (const mapId of ['bakurani', 'ozeti', 'zestafona']) {
    const contourPath = join(dist, 'data', 'terrain', mapId, 'contours.json');
    assert.ok(artifactFiles.includes(contourPath), `${mapId} contours are missing from the Pages artifact`);

    const contours = JSON.parse(await readFile(contourPath, 'utf8'));
    assert.equal(contours.format, 'wardogs-contours-v1', `${mapId} contours have an unsupported format`);
    assert.equal(contours.mapId, mapId, `${mapId} contours have the wrong map id`);
}

const sitemap = await readFile(join(dist, 'sitemap.xml'), 'utf8');
const robots = await readFile(join(dist, 'robots.txt'), 'utf8');
const homepage = await readFile(join(dist, 'index.html'), 'utf8');
const landingStyle = join(dist, 'styles', 'map-landing.css');
const localeIndex = JSON.parse(
    await readFile(join(root, 'locales', 'index.json'), 'utf8')
);
const languageDefinitions = localeIndex.languages.map(item => ({
    ...item,
    id: String(item.id).toLowerCase(),
    hreflang: item.hreflang || item.id,
    ogLocale: item.ogLocale || null,
    indexable: item.indexable !== false
}));
const indexableLanguages = languageDefinitions.filter(item => item.indexable);
const titles = new Set();
const descriptions = new Set();
const headings = new Set();

assert.ok(artifactFiles.includes(landingStyle), 'map landing stylesheet is missing');
assert.match(robots, /^Allow:\s*\/$/mi, 'robots.txt does not allow crawling');
assert.doesNotMatch(robots, /Disallow:\s*\/maps/i, 'robots.txt blocks map pages');
assert.match(robots, /Sitemap:\s*https:\/\/wardogs-artillery\.com\/sitemap\.xml/i, 'production sitemap is not advertised');

function occurrences(text, value) {
    return text.split(value).length - 1;
}

function escapeHtml(value) {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

function webpDimensions(image) {
    assert.equal(image.subarray(0, 4).toString('ascii'), 'RIFF', 'invalid WebP RIFF header');
    assert.equal(image.subarray(8, 12).toString('ascii'), 'WEBP', 'invalid WebP signature');

    const chunk = image.subarray(12, 16).toString('ascii');

    if (chunk === 'VP8 ') {
        assert.equal(image.subarray(23, 26).toString('hex'), '9d012a', 'invalid lossy WebP frame');
        return {
            width: image.readUInt16LE(26) & 0x3fff,
            height: image.readUInt16LE(28) & 0x3fff
        };
    }

    if (chunk === 'VP8L') {
        assert.equal(image[20], 0x2f, 'invalid lossless WebP frame');
        const bits = image.readUInt32LE(21);
        return {
            width: (bits & 0x3fff) + 1,
            height: ((bits >>> 14) & 0x3fff) + 1
        };
    }

    if (chunk === 'VP8X') {
        return {
            width: image.readUIntLE(24, 3) + 1,
            height: image.readUIntLE(27, 3) + 1
        };
    }

    assert.fail(`unsupported WebP chunk: ${chunk}`);
}

for (const definition of languageDefinitions) {
    const pages = mapLandingPagesForLanguage(definition.id);

    for (const page of pages) {
        const route = mapLandingRoute(page.id, definition.id);
        const path = join(dist, ...route.split('/').filter(Boolean), 'index.html');
        const url = mapLandingUrl(page.id, definition.id);
        const html = await readFile(path, 'utf8');
        const imageUrl = `https://wardogs-artillery.com/${page.imagePath}`;
        const image = await readFile(join(dist, ...page.imagePath.split('/')));
        const dimensions = webpDimensions(image);
        const expectedBase = definition.id === 'en' ? '../../' : '../../../';
        const calculatorRoute = definition.id === 'en' ? './' : `${definition.id}/`;

        assert.match(html, new RegExp(`<html\\b[^>]*\\blang="${definition.hreflang}"`, 'i'), `${route}: incorrect language`);
        assert.ok(html.includes(`<base href="${expectedBase}"/>`), `${route}: missing project-safe base URL`);
        if (definition.indexable) {
            assert.match(html, /content="index, follow, max-image-preview:large"[^>]*name="robots"/i, `${route}: page is not indexable`);
            assert.doesNotMatch(html, /\bnoindex\b/i, `${route}: accidental noindex`);
        } else {
            assert.match(html, /content="noindex, follow"[^>]*name="robots"/i, `${route}: non-indexable locale is indexable`);
        }
        assert.equal(occurrences(html, '<title>'), 1, `${route}: expected one title`);
        assert.ok(html.includes(`<title>${escapeHtml(page.title)}</title>`), `${route}: incorrect title`);
        assert.ok(html.includes(`<meta content="${escapeHtml(page.description)}" name="description"/>`), `${route}: incorrect description`);
        assert.equal(occurrences(html, 'rel="canonical"'), 1, `${route}: expected one canonical`);
        assert.ok(html.includes(`<link href="${url}" rel="canonical"/>`), `${route}: incorrect canonical`);
        assert.ok(html.includes(`<meta content="${url}" property="og:url"/>`), `${route}: incorrect Open Graph URL`);
        assert.ok(html.includes(`<meta content="${escapeHtml(page.title)}" property="og:title"/>`), `${route}: incorrect Open Graph title`);
        assert.ok(html.includes(`<meta content="${escapeHtml(page.title)}" name="twitter:title"/>`), `${route}: incorrect Twitter title`);
        assert.ok(html.includes(`<meta content="${imageUrl}" property="og:image"/>`), `${route}: incorrect Open Graph image`);
        assert.ok(html.includes(`<meta content="${imageUrl}" name="twitter:image"/>`), `${route}: incorrect Twitter image`);
        assert.ok(html.includes(`<h1>${escapeHtml(page.heading)}</h1>`), `${route}: incorrect H1`);
        assert.ok(html.includes(`alt="${escapeHtml(page.imageAlt)}"`), `${route}: map image alt text is missing`);
        assert.ok(html.includes(`height="720" src="${page.imagePath}?v=`), `${route}: map image is not sized or fingerprinted`);
        assert.ok(html.includes('width="1280"'), `${route}: map image width is missing`);
        assert.ok(html.includes(`href="${mapCalculatorRoute(page.id, definition.id)}"`), `${route}: CTA does not select its map`);
        assert.ok(html.includes(`href="${calculatorRoute}"`), `${route}: calculator backlink is missing`);
        assert.match(html, /<select\b[^>]*data-map-language-select/i, `${route}: language selector is missing`);
        assert.equal(occurrences(html, '<option data-language='), languageDefinitions.length, `${route}: language list is incomplete`);
        assert.match(html, new RegExp(`<option data-language="${definition.id}"[^>]* selected>`), `${route}: current language is not selected`);
        assert.doesNotMatch(html, />\s*Map guide\s*</i, `${route}: Map guide button remains`);
        assert.doesNotMatch(html, /Read the map guide/i, `${route}: secondary Map guide button remains`);

        for (const fact of page.facts) {
            assert.ok(html.includes(`<dt>${escapeHtml(fact.label)}</dt>`), `${route}: missing ${fact.label} fact label`);
            assert.ok(html.includes(`<dd>${escapeHtml(fact.value)}</dd>`), `${route}: missing ${fact.label} fact value`);
        }

        for (const source of page.sources) {
            assert.ok(html.includes(`href="${source.url}" rel="external"`), `${route}: missing crawlable source link`);
        }

        for (const related of pages.filter(item => item.id !== page.id)) {
            assert.ok(html.includes(`href="${mapLandingRoute(related.id, definition.id)}"`), `${route}: missing ${related.id} link`);
        }

        if (definition.indexable) {
            for (const alternate of indexableLanguages) {
                const link = `<link href="${mapLandingUrl(page.id, alternate.id)}" hreflang="${alternate.hreflang}" rel="alternate"/>`;
                assert.ok(html.includes(link), `${route}: missing ${alternate.hreflang} alternate`);
            }
            assert.ok(html.includes(`<link href="${mapLandingUrl(page.id)}" hreflang="x-default" rel="alternate"/>`), `${route}: missing x-default`);
        } else {
            assert.doesNotMatch(html, /hreflang=/i, `${route}: noindex page advertises hreflang`);
        }
        assert.doesNotMatch(html, /hreflang="cat"/i, `${route}: non-indexable locale leaked into hreflang`);

        const structured = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/i);
        assert.ok(structured, `${route}: structured data is missing`);
        const schema = JSON.parse(structured[1]);
        assert.equal(schema['@context'], 'https://schema.org', `${route}: incorrect schema context`);
        const webPage = schema['@graph'].find(item => item['@type'] === 'WebPage' && item.url === url);
        assert.ok(webPage, `${route}: WebPage schema is missing`);
        assert.equal(webPage.inLanguage, definition.hreflang, `${route}: schema language is incorrect`);
        assert.deepEqual(webPage.citation, page.sources.map(source => source.url), `${route}: schema citations are incorrect`);
        assert.equal(webPage.primaryImageOfPage?.url, imageUrl, `${route}: schema image URL is incorrect`);
        assert.equal(webPage.primaryImageOfPage?.width, 1280, `${route}: schema image width is incorrect`);
        assert.equal(webPage.primaryImageOfPage?.height, 720, `${route}: schema image height is incorrect`);
        assert.ok(schema['@graph'].some(item => item['@type'] === 'BreadcrumbList'), `${route}: BreadcrumbList schema is missing`);

        const localScripts = [...html.matchAll(/\bsrc="(js\/[^"]+)"/gi)].map(match => match[1]);
        assert.equal(localScripts.length, 1, `${route}: unexpected application JS loaded`);
        assert.match(localScripts[0] || '', /^js\/map-landing-language\.js\?v=[a-f0-9]{12}$/i, `${route}: language switcher is not fingerprinted`);
        assert.doesNotMatch(html, /(?:\.bin|maps\/tiles|lobby\.js|<canvas\b)/i, `${route}: heavy resource leaked into landing HTML`);
        assert.match(html, /href="styles\/map-landing\.css\?v=[a-f0-9]{12}"/i, `${route}: CSS is not fingerprinted`);
        assert.deepEqual(dimensions, { width: 1280, height: 720 }, `${route}: map image must be 1280x720`);
        assert.ok(image.length <= 250 * 1024, `${route}: map image exceeds the 250 KiB budget`);
        const textLength = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').length;
        assert.ok(textLength > (definition.id === 'en' ? 2500 : 700), `${route}: body copy is too thin`);

        if (definition.indexable) {
            assert.equal(occurrences(sitemap, `<loc>${url}</loc>`), 1, `${route}: sitemap entry missing or duplicated`);
        } else {
            assert.equal(occurrences(sitemap, `<loc>${url}</loc>`), 0, `${route}: noindex URL entered sitemap`);
        }

        titles.add(page.title);
        descriptions.add(page.description);
        headings.add(page.heading);
    }
}

assert.equal(titles.size, languageDefinitions.length * MAP_LANDING_PAGES.length, 'map titles are not unique');
assert.equal(descriptions.size, languageDefinitions.length * MAP_LANDING_PAGES.length, 'map descriptions are not unique');
assert.equal(headings.size, languageDefinitions.length * MAP_LANDING_PAGES.length, 'map H1 values are not unique');

for (const page of MAP_LANDING_PAGES) {
    assert.ok(homepage.includes(`href="maps/${page.id}/"`), `${page.id}: homepage link is missing`);
}

const languageSwitcher = await readFile(
    join(root, 'js', 'map-landing-language.js'),
    'utf8'
);
let languageChange = null;
let storedLanguage = null;
let assignedLanguageUrl = null;
runInNewContext(languageSwitcher, {
    URL,
    document: {
        baseURI: 'https://wardogs-artillery.com/',
        querySelector: () => ({
            selectedOptions: [{
                value: 'ru/maps/bakurani/',
                dataset: { language: 'ru' }
            }],
            addEventListener: (type, listener) => {
                if (type === 'change') languageChange = listener;
            }
        })
    },
    localStorage: {
        setItem: (key, value) => {
            if (key === 'wardogs-language') storedLanguage = value;
        }
    },
    window: {
        location: {
            assign: value => { assignedLanguageUrl = value; }
        }
    }
});
assert.equal(typeof languageChange, 'function', 'map language selector has no change handler');
languageChange();
assert.equal(storedLanguage, 'ru', 'map language selector did not save the shared preference');
assert.equal(assignedLanguageUrl, 'https://wardogs-artillery.com/ru/maps/bakurani/', 'map language selector did not navigate to the localized route');

const mapRuntime = await readFile(join(root, 'js', 'map', 'maps.js'), 'utf8');
const selected = { value: '' };
let replacedUrl = '';
const runtimeContext = {
    URL,
    MAPS: {
        bakurani: { id: 'bakurani', w: 16, h: 16 },
        ozeti: { id: 'ozeti', w: 32, h: 32 }
    },
    S: { map: 'bakurani', w: 16, h: 16 },
    $: id => id === 'mapSelect' ? selected : null,
    window: {
        location: { href: 'https://wardogs-artillery.com/?source=landing&map=ozeti#result' },
        history: {
            state: null,
            replaceState: (_state, _title, url) => { replacedUrl = url; }
        }
    }
};

runInNewContext(mapRuntime, runtimeContext);
assert.equal(runtimeContext.applyMapQuerySelection(), true, 'valid map CTA parameter was rejected');
assert.equal(runtimeContext.S.map, 'ozeti', 'valid map CTA did not select the map');
assert.equal(selected.value, 'ozeti', 'map select UI was not synchronized');
assert.equal(replacedUrl, '/?source=landing#result', 'map query was not consumed safely');

runtimeContext.window.location.href = 'https://wardogs-artillery.com/ru/?map=ozeti';
runtimeContext.S.map = 'bakurani';
replacedUrl = '';
assert.equal(runtimeContext.applyMapQuerySelection(), true, 'localized map CTA parameter was rejected');
assert.equal(runtimeContext.S.map, 'ozeti', 'localized map CTA did not select the map');
assert.equal(replacedUrl, '/ru/', 'localized map query was not consumed safely');

runtimeContext.window.location.href = 'https://wardogs-artillery.com/?map=constructor';
runtimeContext.S.map = 'bakurani';
replacedUrl = '';
assert.equal(runtimeContext.applyMapQuerySelection(), false, 'unknown map CTA parameter was accepted');
assert.equal(runtimeContext.S.map, 'bakurani', 'unknown map CTA changed application state');
assert.equal(replacedUrl, '', 'unknown map CTA rewrote the URL');

console.log('Production artifact security and map SEO checks passed.');
