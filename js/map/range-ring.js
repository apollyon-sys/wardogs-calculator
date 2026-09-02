/* =========================
   RANGE RING
   ========================= */

/*
 * The terrain-aware max range ring.
 *
 * How far a shell reaches on a bearing depends on the height of the ground
 * where it lands, which depends on how far it reached. So each bearing is a
 * fixed point, solved by marching outward until the model's max range stops
 * exceeding the distance already travelled.
 *
 * The result is always a DIFFERENCE added to the weapon's declared max
 * range, never the model's own absolute number. At deltaZ 0 that difference
 * is exactly zero and the ring is pixel-identical to the circle this
 * replaced.
 */

const RANGE_RING_BEARINGS = 360;
const RANGE_RING_MARCH_METRES = 25;
const RANGE_RING_BISECTIONS = 14;
const RANGE_RING_GRAVITY = 9.81;
const METRES_PER_GAME_UNIT_RING = 100;

/*
 * Metres the gun may move before its ring is resolved again.
 *
 * 8 m, not the grid's own 32 m, because z_gun enters every bearing: on steep
 * ground two points in one 32 m cell differ by ~20 m of height, which is
 * ~20 m of range — an order of magnitude above the 2.6 m p90 the grid
 * spacing itself contributes. The memo must not become the dominant error.
 */
const RANGE_RING_MEMO_METRES = 8;

const RANGE_RING_CACHE = new Map();

let PROJECTILE_MODEL = null;

function loadProjectileModel() {
    return fetch('data/ballistics/projectile-model.json')
        .then(response => response.ok ? response.json() : null)
        .then(model => {
            PROJECTILE_MODEL =
                model?.schema === 'wardogs-projectile-model-v1'
                    ? model
                    : null;
        })
        .catch(error => {
            console.warn(
                '[range-ring] No projectile model; ' +
                'range rings will stay circular.',
                error
            );

            PROJECTILE_MODEL = null;
        });
}

/*
 * Max range is reached at the arc crossover, so either arc's fit is valid.
 * Take the highest: that branch's own table extends furthest, so its fit is
 * the one anchored by the max-range end of the data.
 */
function weaponMuzzleVelocity(weaponId) {
    const arcs = PROJECTILE_MODEL?.weapons?.[weaponId];

    if (!arcs) {
        return null;
    }

    let best = null;

    for (const arc of Object.values(arcs)) {
        const v = Number(arc?.muzzleVelocity);

        if (Number.isFinite(v) && v > 0 && (best === null || v > best)) {
            best = v;
        }
    }

    return best;
}

/*
 * solveTan's discriminant solved for R:
 * R = (v/g) * sqrt(v^2 - 2 g deltaZ). Mirrors maxRangeMeters in
 * scripts/lib/ballistics.mjs, which is where it is unit-tested.
 */
function modelMaxRange(muzzleVelocity, deltaZMeters) {
    const inner =
        muzzleVelocity * muzzleVelocity -
        2 * RANGE_RING_GRAVITY * deltaZMeters;

    if (inner <= 0) {
        return null;
    }

    return muzzleVelocity * Math.sqrt(inner) / RANGE_RING_GRAVITY;
}

/*
 * The march can leave the map before a bearing converges: a gun 1.6 km from
 * the north edge outreaches it on a third of its bearings. Beyond the
 * playable bounds there is no data, so the ray is sampled at the nearest
 * point on the boundary — terrain is treated as continuing outward at the
 * edge height.
 *
 * Stopping the march there instead would chop the outline off square along
 * the map edge, which draws as a range limit the gun does not have.
 * heightfieldSample itself keeps returning null out there, because it
 * mirrors sampleGrid in scripts/lib/heightfield.mjs and that contract is
 * what the generator is tested against.
 */
function rangeRingSample(field, gameX, gameY) {
    const maxX =
        field.originX + (field.width - 1) * field.stepGameUnits;

    const maxY =
        field.originY + (field.height - 1) * field.stepGameUnits;

    return heightfieldSample(
        field,
        Math.min(maxX, Math.max(field.originX, gameX)),
        Math.min(maxY, Math.max(field.originY, gameY))
    );
}

function rangeRingMemoKey(gun, mapId) {
    const cell = RANGE_RING_MEMO_METRES / METRES_PER_GAME_UNIT_RING;

    return [
        mapId,
        gun.weapon,
        Math.round(gun.position.x / cell),
        Math.round(gun.position.y / cell)
    ].join('|');
}

/*
 * Dragging a gun mints one entry per 8 m of travel, 2.9 KB each, so the
 * cache is bounded rather than cleared. Insertion order is iteration order
 * for a Map, which makes the oldest key the first one out.
 */
const RANGE_RING_CACHE_LIMIT = 256;

function rememberRangeRing(key, ring) {
    if (RANGE_RING_CACHE.size >= RANGE_RING_CACHE_LIMIT) {
        RANGE_RING_CACHE.delete(
            RANGE_RING_CACHE.keys().next().value
        );
    }

    RANGE_RING_CACHE.set(key, ring);
}

function terrainRangeRing(gun, mapId) {
    const weapon = WEAPONS[gun.weapon];

    if (!weapon) {
        return null;
    }

    ensureHeightfieldLoaded(mapId);

    const field = cachedHeightfield(mapId);
    const muzzleVelocity = weaponMuzzleVelocity(gun.weapon);

    if (!field || !muzzleVelocity) {
        return null;
    }

    const key = rangeRingMemoKey(gun, mapId);
    const memo = RANGE_RING_CACHE.get(key);

    if (memo) {
        return memo;
    }

    const zGun = heightfieldSample(
        field,
        gun.position.x,
        gun.position.y
    );

    if (zGun === null) {
        return null;
    }

    const declaredMax = (weapon.maxRange ?? weapon.range) * 1000;
    const levelMax = modelMaxRange(muzzleVelocity, 0);

    if (!levelMax) {
        return null;
    }

    /*
     * The furthest this gun could reach if the whole map were at its lowest
     * sample. An exact bound, so a bearing that never crosses still ends.
     */
    const marchLimit = Math.min(
        modelMaxRange(muzzleVelocity, field.minZMeters - zGun) ??
            declaredMax,
        declaredMax * 2
    );

    const radii = new Float64Array(RANGE_RING_BEARINGS);

    for (let b = 0; b < RANGE_RING_BEARINGS; b += 1) {
        const angle = b * 2 * Math.PI / RANGE_RING_BEARINGS;

        const stepX =
            Math.cos(angle) / METRES_PER_GAME_UNIT_RING;

        const stepY =
            Math.sin(angle) / METRES_PER_GAME_UNIT_RING;

        /*
         * True while the shell still outreaches the distance travelled.
         * Null only if the sample is unusable at all, which clamping makes
         * unreachable for a finite gun position.
         */
        const reaches = metres => {
            const z = rangeRingSample(
                field,
                gun.position.x + stepX * metres,
                gun.position.y + stepY * metres
            );

            if (z === null) {
                return null;
            }

            const modelled = modelMaxRange(muzzleVelocity, z - zGun);

            if (modelled === null) {
                return false;
            }

            return metres <= declaredMax + (modelled - levelMax);
        };

        let edge = null;
        let previous = RANGE_RING_MARCH_METRES;

        for (
            let r = RANGE_RING_MARCH_METRES;
            r <= marchLimit;
            r += RANGE_RING_MARCH_METRES
        ) {
            const ok = reaches(r);

            if (ok === null) {
                edge = declaredMax;
                break;
            }

            if (!ok) {
                let inside = previous;
                let outside = r;

                for (let i = 0; i < RANGE_RING_BISECTIONS; i += 1) {
                    const middle = (inside + outside) / 2;

                    if (reaches(middle) === true) {
                        inside = middle;
                    } else {
                        outside = middle;
                    }
                }

                edge = (inside + outside) / 2;
                break;
            }

            previous = r;
        }

        radii[b] = edge === null ? marchLimit : edge;
    }

    const ring = {
        radii,
        maxRangeMeters: declaredMax
    };

    rememberRangeRing(key, ring);

    return ring;
}


/*
 * Traces a ring whose radius varies by bearing. Bearing 0 is +x and the
 * angle increases the same way it does in the solve above; screen y is
 * inverted, which is why sin is subtracted.
 *
 * Appends a subpath rather than starting one, so two of these can be traced
 * into a single path and filled even-odd to tint the band between them.
 */
function traceRangeRing(at, radii, scale, clampMetres) {
    for (let b = 0; b < radii.length; b += 1) {
        const angle = b * 2 * Math.PI / radii.length;

        const metres = clampMetres === null
            ? radii[b]
            : Math.min(radii[b], clampMetres);

        const r = metersToWorldDistance(metres) * scale;

        const x = at.x + Math.cos(angle) * r;
        const y = at.y - Math.sin(angle) * r;

        if (b === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    }

    ctx.closePath();
}

/*
 * The max range ring, terrain-aware where the data allows it.
 *
 * Two outlines: the solid one is clamped to the weapon's declared max range,
 * because past that the shipped table cannot produce a MIL and drawing it
 * filled would promise a shot we cannot lay. The faint one is the true
 * terrain reach, drawn only where it exceeds the clamp — context in the same
 * register as the deltaZ readout, never a number to fire on.
 *
 * With no heightfield this falls back to the circle it replaced, which is
 * what fallbackRadiusPx carries.
 */
function drawMaxRangeRing(at, fallbackRadiusPx, scale) {
    const ring = terrainRangeRing(
        {
            weapon: S.weapon,
            position: S.origin
        },
        S.map
    );

    ctx.beginPath();

    if (ring) {
        traceRangeRing(at, ring.radii, scale, ring.maxRangeMeters);
    } else {
        ctx.arc(at.x, at.y, fallbackRadiusPx, 0, Math.PI * 2);
    }

    ctx.fillStyle = 'rgba(215,164,82,.08)';
    ctx.fill();

    ctx.strokeStyle = '#d7a452';
    ctx.lineWidth = 2;
    ctx.setLineDash([7, 5]);
    ctx.stroke();
    ctx.setLineDash([]);

    /*
     * Only worth drawing when the terrain actually buys range somewhere.
     * On flat ground it coincides with the solid ring exactly.
     *
     * Height buys range but the clamp above hides it: the solid ring stays
     * on the table max, so an elevated gun draws the same circle a flat one
     * does. The gain is only legible if this band is, hence the tint —
     * an outline alone reads as absent.
     */
    if (!ring || !ring.radii.some(r => r > ring.maxRangeMeters + 1)) {
        return;
    }

    ctx.beginPath();
    traceRangeRing(at, ring.radii, scale, null);
    traceRangeRing(at, ring.radii, scale, ring.maxRangeMeters);

    ctx.fillStyle = 'rgba(255,210,127,.12)';
    ctx.fill('evenodd');

    ctx.beginPath();
    traceRangeRing(at, ring.radii, scale, null);

    ctx.strokeStyle = '#ffd27f';
    ctx.lineWidth = 3;
    ctx.setLineDash([12, 7]);
    ctx.stroke();
    ctx.setLineDash([]);
}
