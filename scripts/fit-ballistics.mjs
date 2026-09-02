/*
 * Fits a vacuum trajectory to every arc in data/weapons.json and writes
 * data/ballistics/projectile-model.json, which is committed.
 *
 *     node scripts/fit-ballistics.mjs
 *
 * This exists because data/weapons.json stores [distance, mil] and nothing
 * else -- no impact angle, no muzzle velocity, no drag term. The fit
 * recovers them approximately.
 *
 * It is meant to be REPLACED, not refined. The game's paks return on
 * 2026-09-10 (docs/todo.md), at which point the projectile's real
 * parameters are a single asset read and this file should be rewritten by
 * hand with source: "pak-extract". See the design doc section 8.
 */

import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { fitArc, GRAVITY } from './lib/ballistics.mjs';

const root = resolve(
    dirname(fileURLToPath(import.meta.url)),
    '..'
);

const MODEL_SCHEMA = 'wardogs-projectile-model-v1';

/*
 * Which vacuum branch each table sits on. sin(2 theta) is symmetric about
 * 45 degrees, so range alone cannot say; this is read off the tables' own
 * naming, where the SPG "high" table carries uniformly higher mil than
 * "low", and the mortar's single table follows the same convention.
 */
const BRANCHES = {
    mortar: { single: 'high' },
    spg: { low: 'low', high: 'high' }
};

const round = (value, places) =>
    Number(value.toFixed(places));

async function main() {
    const weapons = JSON.parse(
        await readFile(join(root, 'data/weapons.json'), 'utf8')
    );

    const output = {
        schema: MODEL_SCHEMA,
        source: 'vacuum-fit',
        sourceNote:
            'Least-squares vacuum fit to data/weapons.json. Superseded by pak extraction; see docs/superpowers/specs/2026-08-26-elevation-correction-design.md section 8.',
        generatedAt: new Date().toISOString().slice(0, 10),
        gravity: GRAVITY,
        weapons: {}
    };

    for (const weapon of weapons.weapons) {
        const branches = BRANCHES[weapon.id];

        if (!branches) {
            console.warn(`skipping ${weapon.id}: no branch mapping`);
            continue;
        }

        output.weapons[weapon.id] = {};

        for (const [arc, branch] of Object.entries(branches)) {
            const rows = weapon.ballistics?.[arc];

            if (!Array.isArray(rows) || !rows.length) {
                console.warn(`skipping ${weapon.id}.${arc}: no table`);
                continue;
            }

            const fit = fitArc(rows, branch);

            output.weapons[weapon.id][arc] = {
                branch: fit.branch,
                muzzleVelocity: round(fit.muzzleVelocity, 1),
                angleOffsetDeg: round(fit.angleOffsetDeg, 2),
                anglePerMilDeg: round(fit.anglePerMilDeg, 5),
                rmsMeters: round(fit.rmsMeters, 2)
            };

            console.log(
                `${weapon.id}.${arc}: v=${round(fit.muzzleVelocity, 1)} m/s ` +
                `theta=${round(fit.angleOffsetDeg, 2)}+` +
                `${round(fit.anglePerMilDeg, 5)}*mil deg ` +
                `RMS=${round(fit.rmsMeters, 2)} m`
            );
        }
    }

    await writeFile(
        join(root, 'data/ballistics/projectile-model.json'),
        `${JSON.stringify(output, null, 4)}\n`
    );
}

await main();
