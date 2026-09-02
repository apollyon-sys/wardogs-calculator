/*
 * Model-level checks for the gun list, driven against the running dev server.
 *
 *   PORT=8123 npm run dev      # in one shell
 *   node test/guns-model.mjs   # in another
 */
import { launch, counter } from './helpers.mjs';

const PORT = process.env.PORT || '8123';
const state = counter();
const check = state.check;

const browser = await launch();
const page = await browser.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));
await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);

check('starts with exactly one gun',
    await page.evaluate(() => S.guns.length) === 1);

check('the first gun is active',
    await page.evaluate(() => S.activeGunId === S.guns[0].id));

check('S.origin reads through to the active gun',
    await page.evaluate(() => {
        S.guns[0].position.x = 42.5;
        return S.origin.x;
    }) === 42.5);

check('S.origin writes through to the active gun',
    await page.evaluate(() => {
        S.origin = { x: 11, y: 12 };
        return `${S.guns[0].position.x},${S.guns[0].position.y}`;
    }) === '11,12');

check('assigning S.origin keeps the gun identity',
    await page.evaluate(() => {
        const before = S.guns[0].id;
        S.origin = { x: 1, y: 2 };
        return S.guns[0].id === before && S.guns[0].name.length > 0;
    }));

check('clamp mutates the live gun position',
    await page.evaluate(() => {
        S.origin = { x: -9999, y: -9999 };
        clamp(S.origin);
        return S.guns[0].position.x > -9999;
    }));

check('S.weapon reads through to the active gun',
    await page.evaluate(() => {
        S.guns[0].weapon = 'mortar';
        return S.weapon;
    }) === 'mortar');

check('S.weapon writes through to the active gun',
    await page.evaluate(() => {
        S.weapon = 'spg';
        return S.guns[0].weapon;
    }) === 'spg');

check('addGun appends and selects',
    await page.evaluate(() => {
        const gun = addGun();
        return S.guns.length === 2 && S.activeGunId === gun.id;
    }));

check('each gun keeps its own weapon',
    await page.evaluate(() => {
        S.guns[0].weapon = 'mortar';
        S.guns[1].weapon = 'spg';
        selectGun(S.guns[0].id);
        const first = S.weapon;
        selectGun(S.guns[1].id);
        return first === 'mortar' && S.weapon === 'spg';
    }));

check('removeGun refuses the last gun',
    await page.evaluate(() => {
        while (S.guns.length > 1) removeGun(S.guns[S.guns.length - 1].id);
        return removeGun(S.guns[0].id) === false && S.guns.length === 1;
    }));

check('addGun stops at the cap',
    await page.evaluate(() => {
        while (S.guns.length < GUN_LIMIT) addGun();
        const overflow = addGun();
        return overflow === null && S.guns.length === GUN_LIMIT;
    }));

check('removing the active gun selects a survivor',
    await page.evaluate(() => {
        selectGun(S.guns[2].id);
        removeGun(S.guns[2].id);
        return Boolean(gunById(S.activeGunId));
    }));

check('gun ids match the server id pattern',
    await page.evaluate(
        () => S.guns.every(g => /^[a-z0-9][a-z0-9_-]{0,63}$/i.test(g.id))
    ));

/*
 * The aliasing hazard. Before the fix, Swap left both points on the target
 * AND made S.target the gun's own position object.
 */
check('swap exchanges the two points',
    await page.evaluate(() => {
        while (S.guns.length > 1) removeGun(S.guns[S.guns.length - 1].id);
        S.origin = { x: 30, y: 40 };
        S.target = { x: 60, y: 70 };
        document.getElementById('swap').click();
        return `${S.origin.x},${S.origin.y},${S.target.x},${S.target.y}`;
    }) === '60,70,30,40');

check('swap leaves target unaliased from the gun',
    await page.evaluate(() => {
        S.origin = { x: 30, y: 40 };
        S.target = { x: 60, y: 70 };
        document.getElementById('swap').click();
        S.guns[0].position.x = 99;
        return S.target.x !== 99;
    }));

check('no page errors', errors.length === 0, errors.join('; '));

console.log(`\n${state.pass} passed, ${state.fail} failed`);
await browser.close();
process.exit(state.fail ? 1 : 0);
