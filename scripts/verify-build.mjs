import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import {
    MAP_LANDING_PAGES,
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

for (const page of MAP_LANDING_PAGES) {
    const path = join(dist, 'maps', page.id, 'index.html');
    const route = `maps/${page.id}/`;
    const url = mapLandingUrl(page.id);
    const html = await readFile(path, 'utf8');
    const imageUrl = `https://wardogs-artillery.com/${page.imagePath}`;
    const image = await readFile(join(dist, ...page.imagePath.split('/')));
    const dimensions = webpDimensions(image);

    assert.match(html, /<html\b[^>]*\blang="en"/i, `${route}: incorrect language`);
    assert.match(html, /<base href="\.\.\/\.\.\/"\/>/i, `${route}: missing project-safe base URL`);
    assert.match(html, /content="index, follow, max-image-preview:large"[^>]*name="robots"/i, `${route}: page is not indexable`);
    assert.doesNotMatch(html, /\bnoindex\b/i, `${route}: accidental noindex`);
    assert.equal(occurrences(html, '<title>'), 1, `${route}: expected one title`);
    assert.ok(html.includes(`<title>${page.title}</title>`), `${route}: incorrect title`);
    assert.ok(html.includes(`<meta content="${page.description}" name="description"/>`), `${route}: incorrect description`);
    assert.equal(occurrences(html, 'rel="canonical"'), 1, `${route}: expected one canonical`);
    assert.ok(html.includes(`<link href="${url}" rel="canonical"/>`), `${route}: incorrect canonical`);
    assert.ok(html.includes(`<meta content="${url}" property="og:url"/>`), `${route}: incorrect Open Graph URL`);
    assert.ok(html.includes(`<meta content="${page.title}" property="og:title"/>`), `${route}: incorrect Open Graph title`);
    assert.ok(html.includes(`<meta content="${page.title}" name="twitter:title"/>`), `${route}: incorrect Twitter title`);
    assert.ok(html.includes(`<meta content="${imageUrl}" property="og:image"/>`), `${route}: incorrect Open Graph image`);
    assert.ok(html.includes(`<meta content="${imageUrl}" name="twitter:image"/>`), `${route}: incorrect Twitter image`);
    assert.ok(html.includes(`<h1>${page.heading}</h1>`), `${route}: incorrect H1`);
    assert.ok(html.includes(`alt="${page.imageAlt}"`), `${route}: map image alt text is missing`);
    assert.ok(html.includes(`height="720" src="${page.imagePath}?v=`), `${route}: map image is not sized or fingerprinted`);
    assert.ok(html.includes('width="1280"'), `${route}: map image width is missing`);
    assert.ok(html.includes(`href="?map=${page.id}"`), `${route}: CTA does not select its map`);
    assert.ok(html.includes(`Open ${page.name} Interactive Map`), `${route}: primary CTA is missing`);
    assert.ok(html.includes('href="./"'), `${route}: calculator backlink is missing`);
    assert.ok(html.includes(`<h2 id="map-facts-heading">${page.name} battlefield facts</h2>`), `${route}: factual map summary is missing`);

    for (const fact of page.facts) {
        assert.ok(html.includes(`<dt>${fact.label}</dt>`), `${route}: missing ${fact.label} fact label`);
        assert.ok(html.includes(`<dd>${fact.value}</dd>`), `${route}: missing ${fact.label} fact value`);
    }

    for (const source of page.sources) {
        assert.ok(html.includes(`href="${source.url}" rel="external"`), `${route}: missing crawlable source link`);
    }

    for (const related of MAP_LANDING_PAGES.filter(item => item.id !== page.id)) {
        assert.ok(html.includes(`href="maps/${related.id}/"`), `${route}: missing ${related.id} link`);
    }

    const structured = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/i);
    assert.ok(structured, `${route}: structured data is missing`);
    const schema = JSON.parse(structured[1]);
    assert.equal(schema['@context'], 'https://schema.org', `${route}: incorrect schema context`);
    const webPage = schema['@graph'].find(item => item['@type'] === 'WebPage' && item.url === url);
    assert.ok(webPage, `${route}: WebPage schema is missing`);
    assert.deepEqual(webPage.citation, page.sources.map(source => source.url), `${route}: schema citations are incorrect`);
    assert.equal(webPage.primaryImageOfPage?.url, imageUrl, `${route}: schema image URL is incorrect`);
    assert.equal(webPage.primaryImageOfPage?.width, 1280, `${route}: schema image width is incorrect`);
    assert.equal(webPage.primaryImageOfPage?.height, 720, `${route}: schema image height is incorrect`);
    assert.ok(schema['@graph'].some(item => item['@type'] === 'BreadcrumbList'), `${route}: BreadcrumbList schema is missing`);

    assert.doesNotMatch(html, /\bsrc="(?:\.\.\/)*js\//i, `${route}: application JS loaded eagerly`);
    assert.doesNotMatch(html, /(?:\.bin|maps\/tiles|lobby\.js|<canvas\b)/i, `${route}: heavy resource leaked into landing HTML`);
    assert.match(html, /href="styles\/map-landing\.css\?v=[a-f0-9]{12}"/i, `${route}: CSS is not fingerprinted`);
    assert.deepEqual(dimensions, { width: 1280, height: 720 }, `${route}: map image must be 1280x720`);
    assert.ok(image.length <= 250 * 1024, `${route}: map image exceeds the 250 KiB budget`);
    assert.ok(html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').length > 2500, `${route}: body copy is too thin`);
    assert.equal(occurrences(sitemap, `<loc>${url}</loc>`), 1, `${route}: sitemap entry missing or duplicated`);
    assert.ok(homepage.includes(`href="maps/${page.id}/"`), `${route}: homepage link is missing`);

    titles.add(page.title);
    descriptions.add(page.description);
    headings.add(page.heading);
}

assert.equal(titles.size, MAP_LANDING_PAGES.length, 'map titles are not unique');
assert.equal(descriptions.size, MAP_LANDING_PAGES.length, 'map descriptions are not unique');
assert.equal(headings.size, MAP_LANDING_PAGES.length, 'map H1 values are not unique');

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

runtimeContext.window.location.href = 'https://wardogs-artillery.com/?map=constructor';
runtimeContext.S.map = 'bakurani';
replacedUrl = '';
assert.equal(runtimeContext.applyMapQuerySelection(), false, 'unknown map CTA parameter was accepted');
assert.equal(runtimeContext.S.map, 'bakurani', 'unknown map CTA changed application state');
assert.equal(replacedUrl, '', 'unknown map CTA rewrote the URL');

console.log('Production artifact security and map SEO checks passed.');
