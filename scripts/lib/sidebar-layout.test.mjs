import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SEO_PAGE_CONTENT } from '../seo-content.mjs';
import { renderSeoGuideContent } from './seo-guide-render.mjs';

const root = resolve(
    dirname(fileURLToPath(import.meta.url)),
    '..',
    '..'
);

const requiredCopy = [
    'sidebarSetup',
    'sidebarCoordinates',
    'firingSolution',
    'solutionSupportPrompt',
    'placingOnMap',
    'clickToPlace',
    'guideAndFaq',
    'guideAndFaqDescription'
];

const removedCopy = [
    'customMap',
    'customMapStatus',
    'width',
    'height',
    'apply',
    'mapToolFullscreen'
];

test('the redesigned desktop shell is present in every localized template', async () => {
    const localePages = (
        await readdir(
            join(root, 'src', 'pages', 'locales')
        )
    )
        .filter(name => name.endsWith('.html'))
        .map(name => join(root, 'src', 'pages', 'locales', name));

    const pages = [
        join(root, 'src', 'pages', 'index.html'),
        ...localePages
    ];

    for (const page of pages) {
        const html =
            await readFile(page, 'utf8');

        assert.match(html, /class="control-dock"/);
        assert.match(html, /class="sidebar-section"/);
        assert.match(html, /class="[^"]*\bfiring-solution-panel\b[^"]*"/);
        assert.match(html, /id="coordinateOriginPaste"/);
        assert.match(html, /id="coordinateTargetPaste"/);
        assert.match(html, /id="solutionSupport"/);
        assert.match(html, /id="mapStyleSlot"/);
        assert.match(html, /id="guideFaqDrawer"/);
        assert.match(html, /<!-- SEO_GUIDE_CONTENT -->/);
        assert.doesNotMatch(html, /id="sidebarAccessibilityButton"/);
        assert.doesNotMatch(html, /id="sidebarToggle"/);
        assert.doesNotMatch(html, /id="coordinateActivePaste"/);
        assert.doesNotMatch(html, /id="mapZoomControls"/);
        assert.doesNotMatch(html, /id="mapToolFullscreen"/);
        assert.doesNotMatch(html, /data-i18n="gridInfo"/);
        assert.doesNotMatch(html, /customMapSizing|id="(?:w|h|apply)"/);

        const dockStart = html.indexOf('<aside class="control-dock"');
        const dockEnd = html.indexOf('</aside>', dockStart);
        const solution = html.indexOf('class="sidebar-section firing-solution-panel"');

        assert.ok(dockStart >= 0 && dockEnd > dockStart);
        assert.ok(solution > dockStart && solution < dockEnd);
    }
});

test('SPH-2 controls use a separate third coordinate card on desktop', async () => {
    const source = await readFile(
        join(root, 'js', 'features', 'experimental-sph-platform-correction.js'),
        'utf8'
    );

    assert.match(
        source,
        /\.control-dock \.coordinate-point\[data-point="target"\]/
    );
    assert.match(
        source,
        /coordinate-point sph-platform-card/
    );
    assert.match(
        source,
        /anchor\.insertAdjacentElement\(\s*'afterend'/s
    );
});

test('every language has a useful guide and FAQ', () => {
    for (const [language, copy] of Object.entries(SEO_PAGE_CONTENT)) {
        assert.ok(copy.guide, `${language}: missing guide`);
        assert.ok(copy.guide.intro.trim(), `${language}: empty guide intro`);
        assert.ok(copy.guide.steps.length >= 4, `${language}: guide is too short`);
        assert.ok(copy.guide.tips.length >= 2, `${language}: missing guide tips`);
        assert.ok(copy.faq.length >= 3, `${language}: missing FAQ`);
        assert.equal(
            Object.keys(copy.guide.categories).length,
            5,
            `${language}: missing guide categories`
        );

        const rendered = renderSeoGuideContent(copy);
        assert.match(rendered, /class="seo-guide-hub"/);
        assert.match(rendered, /class="seo-category-nav"/);
        assert.match(rendered, /id="guide-getting-started"/);
        assert.match(rendered, /id="guide-weapons"/);
        assert.match(rendered, /id="guide-maps"/);
        assert.match(rendered, /id="guide-tools"/);
        assert.match(rendered, /id="wardogs-calculator-faq"/);
        assert.match(rendered, /href="maps\/bakurani\/"/i);
        assert.match(rendered, /<svg\b/);
        assert.doesNotMatch(rendered, /SEO_GUIDE_CONTENT/);
    }
});

test('the removed Terrain3D opt-in panel is not loaded', async () => {
    const source = await readFile(
        join(root, 'js', 'main.js'),
        'utf8'
    );

    assert.doesNotMatch(
        source,
        /data-experimental-terrain-correction|initExperimentalTerrainCorrection/
    );
});

test('all locale catalogs cover the new shell and omit custom-map copy', async () => {
    const registry = JSON.parse(
        await readFile(
            join(root, 'locales', 'index.json'),
            'utf8'
        )
    );

    for (const language of registry.languages) {
        const catalog = JSON.parse(
            await readFile(
                join(root, 'locales', language.file),
                'utf8'
            )
        );

        for (const key of requiredCopy) {
            assert.equal(
                typeof catalog[key],
                'string',
                `${language.id}: missing ${key}`
            );
            assert.ok(
                catalog[key].trim(),
                `${language.id}: empty ${key}`
            );
        }

        assert.doesNotMatch(
            catalog.solutionSupportPrompt,
            /WARDOGS|WARCATS/i,
            `${language.id}: support prompt still names the product`
        );

        for (const key of removedCopy) {
            assert.equal(
                Object.hasOwn(catalog, key),
                false,
                `${language.id}: obsolete ${key}`
            );
        }
    }
});

test('the map workspace fills the available desktop height', async () => {
    const css = await readFile(
        join(root, 'styles', 'desktop', 'map.css'),
        'utf8'
    );

    assert.match(
        css,
        /\.workspace\s*\{[^}]*\bheight:\s*100%;/s
    );
    assert.match(
        css,
        /\.map\s*\{[^}]*\bisolation:\s*isolate;/s
    );
    assert.match(
        css,
        /\.map\s*>\s*canvas\s*\{[^}]*\bposition:\s*absolute;[^}]*\bz-index:\s*0;/s
    );
    assert.match(
        css,
        /\.map\s*>\s*\.control-dock\s*\{[^}]*\bdisplay:\s*flex;[^}]*\bvisibility:\s*visible;[^}]*\bopacity:\s*1;/s
    );

    const layoutCss = await readFile(
        join(root, 'styles', 'desktop', 'layout.css'),
        'utf8'
    );

    assert.match(
        layoutCss,
        /\.control-dock\s*\{[^}]*\bleft:\s*12px;[^}]*\bwidth:\s*min\(292px, calc\(100% - 24px\)\);/s
    );
    assert.match(
        layoutCss,
        /\.control-dock\s*\{[^}]*\bbottom:\s*12px;/s
    );
});

test('lobby and guide navigation cannot hide the calculator dock', async () => {
    const [layoutCss, lobbyCss, coordinator] = await Promise.all([
        readFile(join(root, 'styles', 'desktop', 'layout.css'), 'utf8'),
        readFile(join(root, 'styles', 'desktop', 'lobby.css'), 'utf8'),
        readFile(join(root, 'js', 'ui', 'layout', 'coordinator.js'), 'utf8')
    ]);

    const dockLayer = Number(
        layoutCss.match(/\.control-dock\s*\{[^}]*\bz-index:\s*(\d+);/s)?.[1]
    );
    const lobbyLayer = Number(
        lobbyCss.match(/\.lobby-controls\s*\{[^}]*\bz-index:\s*(\d+);/s)?.[1]
    );

    assert.ok(lobbyLayer > dockLayer, 'open lobby must be above the dock');
    assert.match(
        layoutCss,
        /\.guide-faq-drawer\s*\{[^}]*\bdisplay:\s*none;/s
    );
    assert.match(
        layoutCss,
        /\.guide-faq-drawer\.is-open\s*\{[^}]*\bdisplay:\s*flex;/s
    );
    assert.match(coordinator, /wardogs-calculator-faq/);
    assert.match(coordinator, /document\.readyState === 'complete'/);
    assert.match(coordinator, /restoreWorkspace:\s*true/);
    assert.match(coordinator, /addEventListener\(\s*'load'/s);
});

test('release MOTD is concise user-facing copy in every language', async () => {
    const motd = JSON.parse(
        await readFile(
            join(root, 'data', 'motd.json'),
            'utf8'
        )
    );

    assert.equal(motd.id, 'release-1-10-0-2026-09-22');
    assert.equal(Object.keys(motd.title).length, 13);
    assert.equal(Object.keys(motd.message).length, 13);

    for (const [language, message] of Object.entries(motd.message)) {
        assert.ok(message.length < 1300, `${language}: MOTD is too long`);
        assert.match(message, /Apollyon/i, `${language}: missing signature`);
    }

    assert.doesNotMatch(
        motd.message.en,
        /monolithic|indexable|SEO|component|implementation/i
    );
});
