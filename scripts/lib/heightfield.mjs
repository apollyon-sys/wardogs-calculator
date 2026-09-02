/*
 * Geometry and quantisation for the baked terrain heightfield.
 *
 * The grid is a regular lattice over a map's playable bounds, stored as
 * uint16 because only height *differences* are ever used: at Bakurani's
 * 1081 m relief one step is 1.7 cm, far below anything the range ring can
 * resolve.
 *
 * Rows run south to north, so originY is the minimum and sampling is a
 * plain add.
 */

export const METRES_PER_GAME_UNIT = 100;

const U16_MAX = 65535;

export function gridGeometry(bounds, spacingMeters) {
    const stepGameUnits = spacingMeters / METRES_PER_GAME_UNIT;

    return {
        width: Math.ceil((bounds.maxX - bounds.minX) / stepGameUnits) + 1,
        height: Math.ceil((bounds.maxY - bounds.minY) / stepGameUnits) + 1,
        originX: bounds.minX,
        originY: bounds.minY,
        stepGameUnits
    };
}

export function quantise(z, minZ, maxZ) {
    const span = maxZ - minZ;

    if (!(span > 0)) {
        return 0;
    }

    const scaled = Math.round(((z - minZ) / span) * U16_MAX);

    return Math.min(U16_MAX, Math.max(0, scaled));
}

export function dequantise(value, minZ, maxZ) {
    return minZ + (value / U16_MAX) * (maxZ - minZ);
}

export function sampleGrid(field, gameX, gameY) {
    if (!Number.isFinite(gameX) || !Number.isFinite(gameY)) {
        return null;
    }

    const fi = (gameX - field.originX) / field.stepGameUnits;
    const fj = (gameY - field.originY) / field.stepGameUnits;

    if (
        fi < 0 ||
        fj < 0 ||
        fi > field.width - 1 ||
        fj > field.height - 1
    ) {
        return null;
    }

    const i0 = Math.floor(fi);
    const j0 = Math.floor(fj);
    const i1 = Math.min(i0 + 1, field.width - 1);
    const j1 = Math.min(j0 + 1, field.height - 1);

    const tx = fi - i0;
    const ty = fj - j0;

    const z00 = field.heights[j0 * field.width + i0];
    const z10 = field.heights[j0 * field.width + i1];
    const z01 = field.heights[j1 * field.width + i0];
    const z11 = field.heights[j1 * field.width + i1];

    const bottom = z00 + (z10 - z00) * tx;
    const top = z01 + (z11 - z01) * tx;

    return bottom + (top - bottom) * ty;
}
