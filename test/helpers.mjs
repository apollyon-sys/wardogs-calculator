/*
 * Shared plumbing for the browser-driven suites in this directory.
 *
 * Matches sync/test/browser.mjs: playwright-core plus whatever Chromium
 * `npx playwright install chromium` dropped in the cache, so the repo never
 * carries a full playwright download as a dependency.
 *
 *   npm install --no-save playwright-core
 *   npx playwright install chromium
 * Override the binary with CHROME_PATH= if it lives somewhere unusual.
 */

import { chromium } from 'playwright-core';
import { readdir } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

export async function findChrome() {
    if (process.env.CHROME_PATH) {
        return process.env.CHROME_PATH;
    }

    const cache = join(homedir(), '.cache/ms-playwright');
    const entries = await readdir(cache).catch(() => []);

    const build = entries
        .filter(name => name.startsWith('chromium-'))
        .sort()
        .pop();

    if (!build) {
        throw new Error(
            'No Chromium found. Run: npx playwright install chromium'
        );
    }

    return join(cache, build, 'chrome-linux64/chrome');
}

export async function launch() {
    return chromium.launch({
        executablePath: await findChrome(),
        args: ['--no-sandbox']
    });
}

export function counter() {
    const state = { pass: 0, fail: 0 };

    state.check = (label, ok, detail = '') => {
        if (ok) {
            state.pass++;
            console.log(`  ok   ${label}`);
        } else {
            state.fail++;
            console.log(`  FAIL ${label} ${detail}`);
        }
    };

    return state;
}
