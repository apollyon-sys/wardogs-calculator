/*
 * Gun panel behaviour, driven against the running dev server.
 *
 *   PORT=8123 npm run dev   # in one shell
 *   node test/guns-ui.mjs   # in another
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

const rows = () => page.locator('#gunsList .gun-row');

check('the panel renders one row at startup', await rows().count() === 1);

check('the only row is marked active',
    await page.locator('#gunsList .gun-row.active').count() === 1);

await page.click('#addGun');
await page.waitForTimeout(200);

check('Add appends a row', await rows().count() === 2);

check('the new row becomes the active one',
    await page.evaluate(
        () => document.querySelectorAll('#gunsList .gun-row')[1]
            .classList.contains('active')
    ));

await rows().nth(0).click();
await page.waitForTimeout(200);

check('clicking a row selects that gun',
    await page.evaluate(() => S.activeGunId === S.guns[0].id));

check('selection moves the active class',
    await page.evaluate(
        () => document.querySelectorAll('#gunsList .gun-row')[0]
            .classList.contains('active')
    ));

check('the ox/oy inputs follow the selection',
    await page.evaluate(() => {
        S.guns[0].position.x = 77.25;
        selectGun(S.guns[0].id);
        return document.getElementById('ox').value;
    }).then(v => Number(v) === 77.25));

check('the weapon dropdown follows the selection',
    await page.evaluate(() => {
        S.guns[0].weapon = 'mortar';
        S.guns[1].weapon = 'spg';
        selectGun(S.guns[1].id);
        const spg = document.getElementById('weapon').value;
        selectGun(S.guns[0].id);
        return `${spg}|${document.getElementById('weapon').value}`;
    }) === 'spg|mortar');

check('the row shows its own coordinates',
    await page.evaluate(() => {
        S.guns[0].position.x = 12.5;
        S.guns[0].position.y = 34.5;
        renderGuns();
        const text = document.querySelectorAll(
            '#gunsList .gun-row'
        )[0].textContent;
        return text.includes('12.5') && text.includes('34.5');
    }));

check('the eye button toggles visible',
    await page.evaluate(() => {
        const before = S.guns[1].visible;
        document.querySelectorAll(
            '#gunsList .gun-visibility'
        )[1].click();
        return S.guns[1].visible === !before;
    }));

check('the eye button reflects state with aria-pressed',
    await page.evaluate(() => {
        setGunVisible(S.guns[1].id, false);
        return document.querySelectorAll(
            '#gunsList .gun-visibility'
        )[1].getAttribute('aria-pressed') === 'false';
    }));

check('remove drops the row',
    await page.evaluate(() => {
        document.querySelectorAll('#gunsList .gun-remove')[1].click();
        return S.guns.length === 1
            && document.querySelectorAll('#gunsList .gun-row').length === 1;
    }));

check('the last gun has no remove button',
    await page.locator('#gunsList .gun-remove').count() === 0);

check('Add is disabled at the cap',
    await page.evaluate(() => {
        while (S.guns.length < GUN_LIMIT) addGun();
        return document.getElementById('addGun').disabled === true;
    }));

check('Add re-enables below the cap',
    await page.evaluate(() => {
        removeGun(S.guns[S.guns.length - 1].id);
        return document.getElementById('addGun').disabled === false;
    }));

check('the count badge tracks the list',
    await page.evaluate(
        () => document.getElementById('gunsCount').textContent.trim()
            === String(S.guns.length)
    ));

check('no page errors', errors.length === 0, errors.join('; '));

console.log(`\n${state.pass} passed, ${state.fail} failed`);
await browser.close();
process.exit(state.fail ? 1 : 0);
