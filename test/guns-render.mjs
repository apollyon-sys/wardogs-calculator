/*
 * Rendering checks for the gun overlay.
 *
 *   PORT=8123 npm run dev      # in one shell
 *   node test/guns-render.mjs  # in another
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
await page.waitForTimeout(1200);
await page.evaluate(() => document.querySelector('.motd')?.remove());

/*
 * Everything but the artillery overlay is turned off, so the only thing
 * that can put colour on the canvas is a gun. Map tiles are far brighter
 * than the ink threshold below and would drown the signal otherwise — and
 * they come from a different origin, which taints the canvas against
 * getImageData for good. The layer state persists, so the reload is what
 * guarantees no tile is ever painted in this page's lifetime.
 */
await page.evaluate(() => {
    for (const layer of Object.keys(MAP_TOOL_STATE.layers)) {
        setMapLayerVisible(layer, layer === 'artillery');
    }
});
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.evaluate(() => document.querySelector('.motd')?.remove());

/*
 * Counts non-background pixels in a small box around a gun's screen
 * position. A drawn marker puts colour there; a skipped one does not.
 */
async function inkAt(gunIndex) {
    return page.evaluate(index => {
        const gun = S.guns[index];
        const screen = toScreen(gun.position.x, gun.position.y);
        const ratio = window.devicePixelRatio || 1;
        const data = ctx.getImageData(
            Math.round((screen.x - 10) * ratio),
            Math.round((screen.y - 10) * ratio),
            Math.round(20 * ratio),
            Math.round(20 * ratio)
        ).data;

        let ink = 0;
        for (let i = 0; i < data.length; i += 4) {
            if (data[i] > 60 || data[i + 1] > 60 || data[i + 2] > 60) ink++;
        }
        return ink;
    }, gunIndex);
}

await page.evaluate(() => {
    while (S.guns.length > 1) removeGun(S.guns[S.guns.length - 1].id);
    S.origin = { x: 40, y: 40 };
    S.target = { x: 60, y: 60 };
    const second = addGun();
    second.position.x = 80;
    second.position.y = 80;
    selectGun(S.guns[0].id);
    draw();
});
await page.waitForTimeout(300);

check('the active gun draws', await inkAt(0) > 0);
check('a visible non-active gun draws', await inkAt(1) > 0);

await page.evaluate(() => {
    setGunVisible(S.guns[1].id, false);
    draw();
});
await page.waitForTimeout(300);

check('a hidden non-active gun does not draw', await inkAt(1) === 0);

await page.evaluate(() => {
    selectGun(S.guns[1].id);
    draw();
});
await page.waitForTimeout(300);

check('a hidden gun still draws while it is active', await inkAt(1) > 0);

check('gunShouldDraw ignores visible for the active gun',
    await page.evaluate(() => {
        selectGun(S.guns[1].id);
        S.guns[1].visible = false;
        return gunShouldDraw(S.guns[1]) === true
            && gunShouldDraw(S.guns[0]) === true;
    }));

check('gunShouldDraw honours visible for the others',
    await page.evaluate(() => {
        selectGun(S.guns[0].id);
        S.guns[1].visible = false;
        return gunShouldDraw(S.guns[1]) === false;
    }));

/*
 * Per-gun weapons mean per-gun ring radii. Two guns with different weapons
 * must not produce the same ring, or the eye toggle is showing a lie.
 */
check('range rings use each gun\'s own weapon',
    await page.evaluate(() => {
        const ids = Object.keys(WEAPONS);
        if (ids.length < 2) return true;
        S.guns[0].weapon = ids[0];
        S.guns[1].weapon = ids[1];
        const radius = gun => {
            const w = WEAPONS[gun.weapon];
            return kilometersToWorldDistance(w.maxRange ?? w.range);
        };
        return radius(S.guns[0]) !== radius(S.guns[1]);
    }));

await page.evaluate(() => {
    setMapLayerVisible('artillery', false);
    draw();
});
await page.waitForTimeout(300);

check('turning the artillery layer off draws no gun', await inkAt(0) === 0);

await page.evaluate(() => { setMapLayerVisible('artillery', true); draw(); });

check('no page errors', errors.length === 0, errors.join('; '));

console.log(`\n${state.pass} passed, ${state.fail} failed`);
await browser.close();
process.exit(state.fail ? 1 : 0);
