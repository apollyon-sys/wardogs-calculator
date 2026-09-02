/*
 * Clicking a gun on the map picks that gun up.
 *
 *   PORT=8123 npm run dev    # in one shell
 *   node test/guns-pick.mjs  # in another
 */
import { launch, counter } from './helpers.mjs';

const PORT = process.env.PORT || '8123';
const state = counter();
const check = state.check;

const browser = await launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 950 } });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.evaluate(() => document.querySelector('.motd')?.remove());

/* Two guns well apart, gun 1 selected, target off to one side. */
async function setup() {
    return page.evaluate(() => {
        while (S.guns.length > 1) removeGun(S.guns[S.guns.length - 1].id);
        S.origin = { x: 40, y: 40 };
        S.target = { x: 100, y: 100 };
        const second = addGun();
        second.position.x = 70;
        second.position.y = 70;
        second.visible = true;
        selectGun(S.guns[0].id);
        inputs();
        draw();
        return true;
    });
}

/* Screen position of a gun, in page coordinates. */
async function screenOf(index) {
    return page.evaluate(i => {
        const gun = S.guns[i];
        const at = toScreen(gun.position.x, gun.position.y);
        const rect = c.getBoundingClientRect();
        return { x: rect.left + at.x, y: rect.top + at.y };
    }, index);
}

await setup();

const secondAt = await screenOf(1);
await page.mouse.click(secondAt.x, secondAt.y);
await page.waitForTimeout(300);

check('clicking gun 2 selects gun 2',
    await page.evaluate(() => S.activeGunId === S.guns[1].id));

check('clicking gun 2 did not move gun 1',
    await page.evaluate(
        () => `${S.guns[0].position.x},${S.guns[0].position.y}`
    ) === '40,40');

check('gun 2 stayed within a hit radius of where it was clicked',
    await page.evaluate(() => {
        const gun = S.guns[1];
        return Math.hypot(gun.position.x - 70, gun.position.y - 70)
            <= metersToWorldDistance(300);
    }));

/* --- dragging the newly picked gun moves it, not the old one --- */

await setup();

const dragFrom = await screenOf(1);
await page.mouse.move(dragFrom.x, dragFrom.y);
await page.mouse.down();
await page.mouse.move(dragFrom.x + 90, dragFrom.y, { steps: 8 });
await page.mouse.up();
await page.waitForTimeout(300);

check('dragging gun 2 moved gun 2',
    await page.evaluate(() => S.guns[1].position.x > 71));

check('dragging gun 2 left gun 1 alone',
    await page.evaluate(
        () => `${S.guns[0].position.x},${S.guns[0].position.y}`
    ) === '40,40');

/* --- a hidden gun is not grabbable --- */

await setup();
await page.evaluate(() => { setGunVisible(S.guns[1].id, false); draw(); });

const hiddenAt = await screenOf(1);
await page.mouse.click(hiddenAt.x, hiddenAt.y);
await page.waitForTimeout(300);

check('clicking where a hidden gun sits does not select it',
    await page.evaluate(() => S.activeGunId === S.guns[0].id));

check('clicking there moved the active gun instead, as before',
    await page.evaluate(() => S.guns[0].position.x > 60));

/* --- the target still wins when it is the nearer point --- */

await page.evaluate(() => {
    while (S.guns.length > 1) removeGun(S.guns[S.guns.length - 1].id);
    S.origin = { x: 40, y: 40 };
    S.target = { x: 90, y: 90 };
    inputs();
    draw();
});

const targetAt = await page.evaluate(() => {
    const at = toScreen(S.target.x, S.target.y);
    const rect = c.getBoundingClientRect();
    return { x: rect.left + at.x, y: rect.top + at.y };
});

await page.mouse.click(targetAt.x, targetAt.y);
await page.waitForTimeout(300);

check('clicking the target still grabs the target',
    await page.evaluate(
        () => `${S.guns[0].position.x},${S.guns[0].position.y}`
    ) === '40,40');

check('no page errors', errors.length === 0, errors.join('; '));

console.log(`\n${state.pass} passed, ${state.fail} failed`);
await browser.close();
process.exit(state.fail ? 1 : 0);
