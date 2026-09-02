/*
 * Bakes a coarse terrain heightfield for the range-ring solver.
 *
 *     node scripts/build-heightfield.mjs            # every map with terrain
 *     node scripts/build-heightfield.mjs bakurani   # one map
 *
 * Writes data/terrain/<map>/heightfield.{json,bin}, both committed.
 *
 * Why this is a build step: js/features/terrain-ballistics.js streams two
 * chunks per firing solution, but a 2.6 km range ring sweeps about 36 of
 * them — roughly 19 MB. At 32 m spacing the whole map is 234 KB and
 * reproduces the ring to 0.7 m median error against the full 2 m data.
 *
 * Options:
 *   --spacing <m>   sample spacing, metres   (default 32)
 */

import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
    METRES_PER_GAME_UNIT,
    gridGeometry,
    quantise
} from './lib/heightfield.mjs';

import {
    createTerrainSampler,
    loadTerrainChunks
} from './lib/terrain-source.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const HEIGHTFIELD_FORMAT = 'wardogs-heightfield-u16-v1';
const DEFAULT_SPACING_METRES = 32;
const TERRAIN_MAP_IDS = ['bakurani', 'ozeti'];

async function readJson(path) {
    return JSON.parse(await readFile(path, 'utf8'));
}

function parseOptions(argv) {
    const mapIds = [];
    let spacingMeters = DEFAULT_SPACING_METRES;

    for (let i = 0; i < argv.length; i += 1) {
        if (argv[i] === '--spacing') {
            spacingMeters = Number(argv[i + 1]);
            i += 1;
            continue;
        }

        mapIds.push(argv[i]);
    }

    if (!Number.isFinite(spacingMeters) || spacingMeters <= 0) {
        throw new Error(`Unusable spacing ${spacingMeters}`);
    }

    return {
        mapIds: mapIds.length ? mapIds : TERRAIN_MAP_IDS,
        spacingMeters
    };
}

async function buildMap(mapId, spacingMeters) {
    const terrainDir = join(root, 'data', 'terrain', mapId);
    const manifestPath = join(terrainDir, 'manifest.json');
    const mapPath = join(root, 'maps', `${mapId}.json`);

    if (!existsSync(manifestPath) || !existsSync(mapPath)) {
        return null;
    }

    const manifest = await readJson(manifestPath);
    const mapDefinition = await readJson(mapPath);
    const bounds = mapDefinition.bounds;

    if (!bounds) {
        throw new Error(`${mapId} has no bounds to sample`);
    }

    const chunks = await loadTerrainChunks(manifest, terrainDir, bounds);
    const sample = createTerrainSampler(manifest, chunks);
    const grid = gridGeometry(bounds, spacingMeters);

    /*
     * Two passes. The first finds the map's own extremes so the uint16
     * range is spent entirely on relief that exists; the second quantises
     * against them. Holding the floats between passes costs 480 KB.
     */
    const heights = new Float64Array(grid.width * grid.height);

    let minZ = Infinity;
    let maxZ = -Infinity;
    let missing = 0;

    for (let j = 0; j < grid.height; j += 1) {
        for (let i = 0; i < grid.width; i += 1) {
            const z = sample(
                grid.originX + i * grid.stepGameUnits,
                grid.originY + j * grid.stepGameUnits
            );

            if (z === null || !Number.isFinite(z)) {
                missing += 1;
                heights[j * grid.width + i] = NaN;
                continue;
            }

            heights[j * grid.width + i] = z;
            minZ = Math.min(minZ, z);
            maxZ = Math.max(maxZ, z);
        }
    }

    if (missing) {
        throw new Error(
            `${mapId}: ${missing} of ${heights.length} samples fell outside ` +
            'chunk coverage; the playable bounds and the manifest disagree'
        );
    }

    const values = new Uint16Array(heights.length);

    for (let n = 0; n < heights.length; n += 1) {
        values[n] = quantise(heights[n], minZ, maxZ);
    }

    const binary = Buffer.from(values.buffer, 0, values.byteLength);

    await writeFile(join(terrainDir, 'heightfield.bin'), binary);

    const header = {
        format: HEIGHTFIELD_FORMAT,
        mapId,
        generatedFrom: `data/terrain/${mapId}/manifest.json`,
        generatedAt: new Date().toISOString().slice(0, 10),
        spacingMeters,
        grid,
        minZMeters: minZ,
        maxZMeters: maxZ,
        file: 'heightfield.bin',
        bytes: binary.byteLength,
        sha256: createHash('sha256').update(binary).digest('hex')
    };

    await writeFile(
        join(terrainDir, 'heightfield.json'),
        `${JSON.stringify(header, null, 4)}\n`
    );

    return header;
}

const { mapIds, spacingMeters } = parseOptions(process.argv.slice(2));

for (const mapId of mapIds) {
    const header = await buildMap(mapId, spacingMeters);

    if (!header) {
        console.log(`${mapId}: no terrain data, skipped`);
        continue;
    }

    const relief = header.maxZMeters - header.minZMeters;

    console.log(
        `${mapId}: ${header.grid.width}x${header.grid.height} at ` +
        `${spacingMeters} m, ${(header.bytes / 1024).toFixed(0)} KB, ` +
        `${relief.toFixed(0)} m relief`
    );
}
