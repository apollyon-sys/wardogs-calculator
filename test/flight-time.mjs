/*
 * Time of flight, derived rather than measured.
 *
 * The expected seconds were computed by hand from the same vacuum fit this
 * reads. They are a regression fence on the derivation, not evidence
 * about the game —
 * nobody has held a stopwatch to a real shell yet.
 *
 *   PORT=8123 npm run dev       # in one shell
 *   node test/flight-time.mjs   # in another
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

/* --- the derivation itself --- */

const derived = await page.evaluate(() => ({
    low: flightTimeSeconds('spg', 'low', 1800),
    high: flightTimeSeconds('spg', 'high', 1800),
    mortar: flightTimeSeconds('mortar', 'single', 400)
}));

check(
    'SPG low arc at 1800 m is about 12 s',
    Math.abs(derived.low - 12.1) < 1.5,
    derived.low
);

check(
    'SPG high arc at 1800 m is about 30 s',
    Math.abs(derived.high - 30.3) < 1.5,
    derived.high
);

check(
    'the mortar derives at about 17 s',
    Math.abs(derived.mortar - 16.9) < 1.5,
    derived.mortar
);

/*
 * A gun above its target keeps flying after it would have landed level.
 * Sign matters more than magnitude here: deltaZ is target minus origin,
 * so a negative one is a target below the gun.
 */
const slope = await page.evaluate(() => ({
    below: flightTimeSeconds('spg', 'low', 1800, -200),
    above: flightTimeSeconds('spg', 'low', 1800, 200),
    level: flightTimeSeconds('spg', 'low', 1800, 0)
}));

check('a lower target lengthens the flight', slope.below > slope.level);
check('a higher target shortens it', slope.above < slope.level);

/* --- what reaches the panel --- */

async function readPanel(weapon, distanceMeters) {
    return page.evaluate(([id, metres]) => {
        S.weapon = id;
        S.origin = { x: 50, y: 50 };
        S.target = { x: 50 + metres / 100, y: 50 };

        result();

        const row = document.getElementById('flightTimes');

        const badges = Array.from(
            document.querySelectorAll('#flightTimeBadges .flight-badge')
        ).map(badge => ({
            arc: badge.querySelector('.flight-badge-arc')?.textContent ?? '',
            value: badge.querySelector('.flight-badge-value')?.textContent ?? '',
            seconds: Number(
                badge
                    .querySelector('.flight-badge-value')
                    ?.textContent
                    .replace(/[^0-9.]/g, '')
            )
        }));

        return {
            hidden: row.hidden,
            badges,
            mil: document.getElementById('mil').textContent
        };
    }, [weapon, distanceMeters]);
}

/*
 * The mortar is one unlabelled badge: it has a single arc, so there is
 * nothing to tell apart, and the row's own heading says what the number is.
 * It is also the DEFAULT weapon, which is what makes this the first badge
 * most people ever see.
 */
const mortar = await readPanel('mortar', 400);
check(
    'the mortar shows a flight time',
    mortar.hidden === false && mortar.badges.length === 1,
    JSON.stringify(mortar.badges)
);
check(
    'the mortar badge carries no arc label',
    mortar.badges[0]?.arc === '',
    mortar.badges[0]?.arc
);
check(
    'and reads about 17 s',
    Math.abs(mortar.badges[0]?.seconds - 17) <= 2,
    mortar.badges[0]?.value
);

/*
 * Nearly flat across the envelope — that is the weapon, not a stuck value.
 * Both ends must still be real numbers rather than a cached one.
 */
const mortarNear = await readPanel('mortar', 150);
const mortarFar = await readPanel('mortar', 660);
check(
    'the mortar reads across its whole envelope',
    mortarNear.badges.length === 1 && mortarFar.badges.length === 1,
    `${mortarNear.badges[0]?.value} / ${mortarFar.badges[0]?.value}`
);

const mortarOut = await readPanel('mortar', 900);
check(
    'and shows nothing past its range',
    mortarOut.hidden && !mortarOut.badges.length
);

const spg = await readPanel('spg', 1800);
check('the SPG row is visible', spg.hidden === false);
check('one badge per arc', spg.badges.length === 2, JSON.stringify(spg.badges));

check(
    'each badge carries its arc label and an approximate value',
    spg.badges.every(b => b.arc.length > 0 && b.value.startsWith('≈')),
    JSON.stringify(spg.badges)
);

check(
    'the low arc is first and is the faster one',
    spg.badges[0].seconds < spg.badges[1].seconds,
    spg.badges.map(b => b.value).join(' / ')
);

/*
 * Below 1181 m the low table has no coverage, so the high arc is the only
 * option and the row must not print a phantom second badge.
 */
const highOnly = await readPanel('spg', 1000);
check(
    'a single arc prints a single badge',
    highOnly.hidden === false && highOnly.badges.length === 1,
    JSON.stringify(highOnly.badges)
);
check(
    'and it agrees with the single MIL shown',
    !highOnly.mil.includes('/'),
    highOnly.mil
);

const outOfRange = await readPanel('spg', 4000);
check(
    'out of range shows nothing',
    outOfRange.hidden && !outOfRange.badges.length
);

/* --- the badge is big enough to read --- */

const size = await page.evaluate(() => {
    S.weapon = 'spg';
    S.origin = { x: 50, y: 50 };
    S.target = { x: 68, y: 50 };

    result();

    const value = document.querySelector('.flight-badge-value');
    const rect = value.getBoundingClientRect();

    return {
        fontPx: parseFloat(getComputedStyle(value).fontSize),
        clipped: value.scrollWidth > value.clientWidth + 1,
        width: rect.width
    };
});

check('the value is set at a readable size', size.fontPx >= 12, size.fontPx);
check('and is not truncated', size.clipped === false, size.width);

/*
 * --- the arc labels follow the language ---
 *
 * Switching language navigates to that locale's own page, so this is also
 * the check that the badge markup made it into every shell rather than
 * only the English one.
 */

await page.goto(`${URL}es/`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);

const translated = await page.evaluate(() => {
    S.weapon = 'spg';
    S.origin = { x: 50, y: 50 };
    S.target = { x: 68, y: 50 };

    result();

    return {
        arcs: Array.from(
            document.querySelectorAll('#flightTimeBadges .flight-badge-arc')
        ).map(node => node.textContent),

        label: document
            .querySelector('.solution-flight-label')
            .textContent,

        clipped: Array.from(
            document.querySelectorAll('#flightTimeBadges .flight-badge-value')
        ).some(node => node.scrollWidth > node.clientWidth + 1)
    };
});

check(
    'the badges speak the page language',
    translated.arcs[0].toLowerCase().includes('trayectoria'),
    translated.arcs.join(' / ')
);

check(
    'and so does the row label',
    translated.label.toLowerCase().includes('vuelo'),
    translated.label
);

check(
    'a long arc name does not truncate the seconds',
    translated.clipped === false
);

check('no page errors', errors.length === 0, errors.join('; '));

console.log(`\n${state.pass} passed, ${state.fail} failed`);
await browser.close();
process.exit(state.fail ? 1 : 0);
