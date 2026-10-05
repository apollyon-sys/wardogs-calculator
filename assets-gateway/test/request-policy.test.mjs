import assert from 'node:assert/strict';
import {
    readFile
} from 'node:fs/promises';
import test from 'node:test';

import {
    assetBudgetDescriptor,
    hasBrowserRequestContext,
    isCoverageBoundaryPath,
    sequenceRateKeys
} from '../src/request-policy.mjs';

const prefix =
    '/releases/assets-v1/';

const maps = [
    'bakurani',
    'ozeti',
    'zestafona'
];

test('older browsers may omit Fetch Metadata, while explicit contradictory values remain reduced-context', () => {
    const request = headers => new Request('https://assets.wardogs-artillery.com/', { headers });
    assert.equal(hasBrowserRequestContext(request({ Origin: 'https://wardogs-artillery.com' })), true);
    assert.equal(hasBrowserRequestContext(request({ 'Sec-Fetch-Site': 'same-site' })), true);
    assert.equal(hasBrowserRequestContext(request({ 'Sec-Fetch-Mode': 'cors' })), true);
    assert.equal(hasBrowserRequestContext(request({ 'Sec-Fetch-Site': 'cross-site' })), false);
    assert.equal(hasBrowserRequestContext(request({ 'Sec-Fetch-Mode': 'navigate' })), false);
});

function officialTileRange(map, zoom) {
    const count = 2 ** zoom;
    const tileWidth =
        (
            map.tileBounds.maxX -
            map.tileBounds.minX
        ) / count;
    const tileHeight =
        (
            map.tileBounds.maxY -
            map.tileBounds.minY
        ) / count;

    return {
        minX: Math.max(
            0,
            Math.floor(
                (
                    map.bounds.minX -
                    map.tileBounds.minX
                ) / tileWidth
            ) - 1
        ),
        maxX: Math.min(
            count - 1,
            Math.floor(
                (
                    map.bounds.maxX -
                    map.tileBounds.minX
                ) / tileWidth
            ) + 1
        ),
        minY: Math.max(
            0,
            Math.floor(
                (
                    map.tileBounds.maxY -
                    map.bounds.maxY
                ) / tileHeight
            ) - 1
        ),
        maxY: Math.min(
            count - 1,
            Math.floor(
                (
                    map.tileBounds.maxY -
                    map.bounds.minY
                ) / tileHeight
            ) + 1
        )
    };
}

test('coverage boundary paths stay outside every official render range', async () => {
    for (const mapId of maps) {
        const map = JSON.parse(
            await readFile(
                new URL(
                    `../../maps/${mapId}.json`,
                    import.meta.url
                ),
                'utf8'
            )
        );

        for (let zoom = 4; zoom <= 7; zoom++) {
            const maximum = 2 ** zoom - 1;
            const range =
                officialTileRange(
                    map,
                    zoom
                );

            for (const [x, y] of [
                [0, 0],
                [0, maximum],
                [maximum, 0],
                [maximum, maximum]
            ]) {
                const reachable =
                    x >= range.minX &&
                    x <= range.maxX &&
                    y >= range.minY &&
                    y <= range.maxY;

                assert.equal(
                    reachable,
                    false,
                    `${mapId} zoom_${zoom}/${x}_${y} entered the official render range`
                );
                assert.equal(
                    isCoverageBoundaryPath(
                        `${prefix}maps/tiles/${mapId}/zoom_${zoom}/${x}_${y}.webp`,
                        prefix
                    ),
                    true
                );
            }
        }
    }
});

test('terrain boundaries and tile sequence keys are recognized', () => {
    assert.equal(
        isCoverageBoundaryPath(
            `${prefix}data/terrain/bakurani/chunks/15_12.bin`,
            prefix
        ),
        true
    );
    assert.equal(
        isCoverageBoundaryPath(
            `${prefix}data/terrain/bakurani/chunks/16_12.bin`,
            prefix
        ),
        false
    );
    assert.equal(
        isCoverageBoundaryPath(
            `${prefix}data/terrain/ozeti/chunks/-1_0.bin`,
            prefix
        ),
        true
    );

    assert.deepEqual(
        sequenceRateKeys(
            `${prefix}maps/tiles-color/ozeti/zoom_5/12_14.webp`,
            prefix,
            'session'
        ),
        [
            'session:tiles-color:ozeti:5:row:14',
            'session:tiles-color:ozeti:5:column:12'
        ]
    );
});

test('all protected assets receive stable weighted budget descriptors', async () => {
    const tile =
        await assetBudgetDescriptor(
            `${prefix}maps/tiles-color/bakurani/zoom_7/116_94.webp`,
            prefix
        );

    const terrain =
        await assetBudgetDescriptor(
            `${prefix}data/terrain/bakurani/chunks/10_10.bin`,
            prefix
        );

    const manifest =
        await assetBudgetDescriptor(
            `${prefix}data/terrain/bakurani/manifest.json`,
            prefix
        );

    assert.equal(tile.category, 'tile');
    assert.equal(tile.weight, 1);
    assert.equal(terrain.category, 'terrain');
    assert.equal(terrain.weight, 16);
    assert.equal(manifest.category, 'other');
    assert.equal(manifest.weight, 4);
    assert.equal(tile.key.length, 24);
    assert.notEqual(tile.key, terrain.key);
    assert.deepEqual(
        await assetBudgetDescriptor(
            `${prefix}maps/tiles-color/bakurani/zoom_7/116_94.webp`,
            prefix
        ),
        tile
    );
});
