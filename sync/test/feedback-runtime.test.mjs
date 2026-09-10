import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { Miniflare } from 'miniflare';

const origin = 'http://localhost:8000';

async function runtime(t, env = {}) {
    const result = await build({
        entryPoints: [fileURLToPath(new URL('../src/index.mjs', import.meta.url))],
        bundle: true,
        write: false,
        format: 'esm',
        platform: 'browser',
        external: ['cloudflare:workers'],
        logLevel: 'silent',
        plugins: [{
            name: 'test-config',
            setup(builder) {
                builder.onLoad({ filter: /config[\\/]app\.json$/ }, async args => ({
                    contents: await readFile(args.path, 'utf8'),
                    loader: 'json'
                }));
            }
        }]
    });

    const mf = new Miniflare({
        modules: true,
        script: result.outputFiles[0].text,
        compatibilityDate: '2026-04-07',
        durableObjects: {
            ROOMS: { className: 'LobbyRoom', useSQLite: true },
            BUDGET: { className: 'LobbyBudget', useSQLite: true }
        },
        bindings: {
            LOBBIES_DEV: 'true',
            FEEDBACK_DEV_SINK: 'true',
            ...env
        }
    });
    t.after(() => mf.dispose());
    return mf;
}

const send = (mf, body, headers = {}) => mf.dispatchFetch('https://lobby.test/feedback', {
    method: 'POST',
    headers: {
        Origin: origin,
        'Content-Type': 'application/json',
        ...headers
    },
    body: JSON.stringify(body)
});

test('anonymous feedback works without ROOM_SECRET', async t => {
    const mf = await runtime(t);
    const response = await send(mf, {
        type: 'bug',
        message: 'The map selector is stuck',
        page: '/',
        language: 'en',
        device: 'desktop-ui',
        viewport: '1300x700'
    });

    assert.equal(response.status, 201);
    assert.deepEqual(await response.json(), { ok: true });
});

test('feedback keeps origin checks, kill switch and honeypot behavior', async t => {
    const mf = await runtime(t);

    const forbidden = await send(
        mf,
        { type: 'bug', message: 'valid message' },
        { Origin: 'https://evil.test' }
    );
    assert.equal(forbidden.status, 403);

    const bot = await send(
        mf,
        { type: 'bug', message: 'valid message', website: 'spam.test' }
    );
    assert.equal(bot.status, 201);

    const disabledMf = await runtime(t, { FEEDBACK_DISABLED: 'true' });
    const disabled = await send(
        disabledMf,
        { type: 'bug', message: 'valid message' }
    );
    assert.equal(disabled.status, 503);
});
