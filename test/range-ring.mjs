/*
 * The terrain-aware max range ring.
 *
 *   PORT=8123 npm run dev      # in one shell
 *   node test/range-ring.mjs   # in another
 */
import { launch, counter } from './helpers.mjs';

const PORT = process.env.PORT || '8123';
const URL = `http://127.0.0.1:${PORT}/`;
const state = counter();
const check = state.check;

const browser = await launch();
const context = await browser.newContext();
const page = await context.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));

await page.goto(URL, { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);

/* --- the heightfield loads and decodes --- */

const field = await page.evaluate(async () => {
    ensureHeightfieldLoaded('bakurani');

    for (let i = 0; i < 40 && !cachedHeightfield('bakurani'); i += 1) {
        await new Promise(r => setTimeout(r, 250));
    }

    const f = cachedHeightfield('bakurani');

    return f && { width: f.width, height: f.height };
});

check('bakurani heightfield decodes', field?.width === 346 && field?.height === 346);

/* --- an elevated gun outreaches the flat circle everywhere --- */

const summit = await page.evaluate(() => {
    const ring = terrainRangeRing(
        { position: { x: 51.67, y: 113.74 }, weapon: 'spg' },
        'bakurani'
    );

    const r = Array.from(ring.radii);

    return { min: Math.min(...r), max: Math.max(...r), cap: ring.maxRangeMeters };
});

check('summit ring clears the flat circle on every bearing', summit.min > summit.cap);
check('summit ring is not a circle', summit.max - summit.min > 300);

/* --- a valley gun falls short of it everywhere --- */

const valley = await page.evaluate(() => {
    const ring = terrainRangeRing(
        { position: { x: 29.83, y: 45.34 }, weapon: 'spg' },
        'bakurani'
    );

    const r = Array.from(ring.radii);

    return { min: Math.min(...r), max: Math.max(...r), cap: ring.maxRangeMeters };
});

check('valley ring never exceeds the flat circle', valley.max <= valley.cap + 1);
check('valley ring falls short somewhere', valley.cap - valley.min > 300);

/*
 * --- coverage edges do not truncate the ring ---
 *
 * A gun within its own range of the map edge outreaches the heightfield on
 * a third of its bearings. Those bearings sample the nearest point on the
 * boundary rather than stopping there; stopping would chop the outline off
 * square along the edge and draw a range limit the gun does not have.
 */

const edge = await page.evaluate(() => {
    const f = cachedHeightfield('bakurani');
    const northEdge = f.originY + (f.height - 1) * f.stepGameUnits;

    const ring = terrainRangeRing(
        { position: { x: 51.67, y: northEdge - 5 }, weapon: 'spg' },
        'bakurani'
    );

    const r = Array.from(ring.radii);

    /* Bearing 90 points due north, straight off the grid 500 m out. */
    return { north: r[90], min: Math.min(...r), cap: ring.maxRangeMeters };
});

check('a bearing running off the grid is not cut short', edge.north > 500);
check('no bearing collapses to the coverage boundary', edge.min > 500);

/*
 * --- the safety property ---
 *
 * Level ground must return the declared max range on every bearing, or the
 * ring has stopped being a differential and the circle it replaced is gone.
 */

const level = await page.evaluate(() => {
    const f = cachedHeightfield('bakurani');
    const flatHeights = new Float32Array(f.heights.length).fill(-800);
    const saved = f.heights;

    f.heights = flatHeights;

    const ring = terrainRangeRing(
        { position: { x: 78.5, y: 74.5 }, weapon: 'spg' },
        'bakurani'
    );

    f.heights = saved;

    const r = Array.from(ring.radii);

    return {
        worst: Math.max(...r.map(v => Math.abs(v - ring.maxRangeMeters))),
        cap: ring.maxRangeMeters
    };
});

check('level ground reproduces the declared max range', level.worst < 1);
check('the declared max range is the weapon table value', Math.abs(level.cap - 2629) < 1);

/* --- an unsupported map falls back to the circle --- */

const custom = await page.evaluate(() =>
    terrainRangeRing({ position: { x: 5, y: 5 }, weapon: 'spg' }, 'custom')
);

check('an unsupported map has no terrain ring', custom === null);

check('no page errors', errors.length === 0, errors.join('; '));

console.log(`\n${state.pass} passed, ${state.fail} failed`);
await browser.close();
process.exit(state.fail ? 1 : 0);
