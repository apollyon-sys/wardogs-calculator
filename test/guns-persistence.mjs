/*
 * Reload persistence and the single-origin migration.
 *
 *   PORT=8123 npm run dev           # in one shell
 *   node test/guns-persistence.mjs  # in another
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

/* --- a stored singular origin migrates to gun 1 --- */

await page.evaluate(() => {
    localStorage.setItem('wardogs-map-points', JSON.stringify({
        map: S.map,
        origin: { x: 44.5, y: 55.5 },
        target: { x: 66.5, y: 77.5 }
    }));
});

await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(1200);

check('a legacy record yields exactly one gun',
    await page.evaluate(() => S.guns.length) === 1);

check('the legacy origin becomes gun 1',
    await page.evaluate(
        () => `${S.guns[0].position.x},${S.guns[0].position.y}`
    ) === '44.5,55.5');

check('the legacy target still restores',
    await page.evaluate(() => `${S.target.x},${S.target.y}`) === '66.5,77.5');

/* --- a battery round-trips --- */

await page.evaluate(() => {
    const ids = Object.keys(WEAPONS);
    S.origin = { x: 20, y: 21 };
    const second = addGun();
    second.position.x = 30;
    second.position.y = 31;
    second.weapon = ids[ids.length - 1];
    renameGun(second.id, 'Left flank');
    inputs();
});
await page.waitForTimeout(600);

const storedWeapon = await page.evaluate(
    () => JSON.parse(localStorage.getItem('wardogs-map-points')).guns[1].weapon
);

await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(1200);

check('both guns come back', await page.evaluate(() => S.guns.length) === 2);

check('positions come back',
    await page.evaluate(
        () => `${S.guns[1].position.x},${S.guns[1].position.y}`
    ) === '30,31');

check('names come back',
    await page.evaluate(() => S.guns[1].name) === 'Left flank');

check('per-gun weapons come back',
    await page.evaluate(() => S.guns[1].weapon) === storedWeapon);

check('gun 1 is selected after a reload',
    await page.evaluate(() => S.activeGunId === S.guns[0].id));

check('restored guns are all visible',
    await page.evaluate(() => S.guns.every(g => g.visible === true)));

check('legacy origin is still written for older builds',
    await page.evaluate(() => {
        const stored = JSON.parse(localStorage.getItem('wardogs-map-points'));
        return stored.origin.x === S.guns[0].position.x
            && stored.origin.y === S.guns[0].position.y;
    }));

check('a stored record for another map is ignored',
    await page.evaluate(() => {
        localStorage.setItem('wardogs-map-points', JSON.stringify({
            map: 'not-a-map',
            guns: [{ id: 'gun-x', name: 'X', x: 1, y: 2, weapon: null }],
            target: { x: 3, y: 4 }
        }));
        return true;
    }));

await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(1200);

check('the mismatched record left one default gun',
    await page.evaluate(() => S.guns.length === 1 && S.guns[0].id !== 'gun-x'));

check('a corrupt record does not throw',
    await page.evaluate(() => {
        localStorage.setItem('wardogs-map-points', '{ not json');
        return true;
    }));

await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(1200);

check('the app booted past the corrupt record',
    await page.evaluate(() => S.guns.length >= 1));

/* --- saved targets follow the active gun --- */

await page.evaluate(() => {
    localStorage.removeItem('wardogs-saved-targets');
    localStorage.removeItem('wardogs-map-points');
});
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(1200);

const exported = await page.evaluate(() => {
    const second = addGun();
    second.position.x = 88;
    second.position.y = 89;
    selectGun(second.id);
    S.target = { x: 90, y: 91 };
    document.getElementById('saveArtilleryPosition').checked = true;
    saveCurrentTarget();
    return savedTargetForExport(savedTargets[savedTargets.length - 1]);
});

check('a saved target still carries one flat origin',
    exported.origin
        && typeof exported.origin.x === 'number'
        && !('guns' in exported));

check('saving captured the active gun, not gun 1',
    exported.origin.x === 88 && exported.origin.y === 89);

check('restoring applies to the active gun',
    await page.evaluate(() => {
        selectGun(S.guns[0].id);
        S.guns[0].position.x = 1;
        S.guns[0].position.y = 1;
        restoreTarget(savedTargets[savedTargets.length - 1]);
        return `${S.guns[0].position.x},${S.guns[0].position.y}`;
    }) === '88,89');

check('restoring left the other gun alone',
    await page.evaluate(() => S.guns.length === 2 && S.guns[1].position.x === 88));

/*
 * In-bounds coordinates on purpose: restoreTarget() clamps to the map, so
 * anything outside Bakurani's 23.35-133.6 x 19.34-129.65 would land on the
 * corner and prove nothing about the import path.
 */
check('an old export with an origin still imports',
    await page.evaluate(() => {
        const legacy = {
            id: 'legacy-1',
            name: 'Legacy',
            x: 42, y: 43,
            saveArtillery: true,
            origin: { x: 44, y: 45 }
        };
        restoreTarget(legacy);
        return `${S.origin.x},${S.origin.y},${S.target.x},${S.target.y}`;
    }) === '44,45,42,43');

check('no page errors', errors.length === 0, errors.join('; '));

console.log(`\n${state.pass} passed, ${state.fail} failed`);
await browser.close();
process.exit(state.fail ? 1 : 0);
