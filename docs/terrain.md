## Terrain Elevation & SPH-2 Setup

Terrain elevation is optional map data used to provide vertical context for artillery calculations. It is separate from the visible tile map and from the weapon firing tables.

Supported Terrain3D datasets:

- **Bakurani**
- **Ozeti**

---

## What the Terrain3D feature does

When a supported map is selected and valid terrain data is available, the calculator samples terrain elevation at:

- the current **Artillery** coordinate
- the current **Target** coordinate

It then displays the height difference:

```text
ΔZ = target elevation - artillery elevation
```

Examples:

```text
ΔZ +24.0 m  -> target is 24 m above the artillery position
ΔZ -18.5 m  -> target is 18.5 m below the artillery position
```

The value is shown as secondary firing-solution context.

### Current release behavior

Terrain3D is informational only.

```text
Distance -> normal coordinate calculation
Azimuth  -> normal coordinate calculation
MIL      -> existing weapon firing table
ΔZ       -> Terrain3D elevation context
```

Automatic terrain, ΔZ, or vehicle-attitude MIL correction is **not enabled**.

### The elevation datum is offset

Decoded heights are not altitudes. Sampled across its playable bounds,
Bakurani runs about -1007 m to +75 m and Ozeti about -1008 m to -620 m, so
the height field sits roughly 900 m below anything a player would recognise
as an altitude.

The field is internally consistent — chunk seams agree to 0.21 m — so every
**difference** is trustworthy, which is all the ΔZ readout and the contour
layer use. No absolute height should ever be displayed. `worldZOffsetMeters`
is 0.5 on Bakurani and 0.04 on Ozeti and does not encode this correction;
nothing in the repository currently records where the datum went.

Calibrating it needs one known in-game altitude readout per map. Until then,
contour lines are drawn unlabelled and coloured by height *relative to the
map's own lowest sample*.

---

## Data layout

Each supported map keeps a local working copy of its elevation dataset under
its own directory:

```text
data/terrain/<map-id>/
├── manifest.json
├── contours.json
└── chunks/
    ├── ...
    └── *.bin
```

Current datasets:

```text
data/terrain/bakurani/
data/terrain/ozeti/
data/terrain/zestafona/
```

`manifest.json` describes the terrain grid, verified coordinate coverage, coordinate-to-Landscape mapping, elevation conversion, and integrity metadata used by the runtime.

The binary terrain chunks contain only elevation samples. They are not map-image tiles and should not be placed under `maps/tiles/`.

### Terrain3D hosting

The application loads published manifests and chunks from Cloudflare R2 under:

```text
https://assets.wardogs-artillery.com/releases/assets-v1/data/terrain/<map-id>/
```

Upload each map's `manifest.json` and every referenced `.bin`, retaining the
relative `chunks/...` paths. Set both the multi-map registry entries and the
legacy top-level `terrainManifest` field to full HTTPS manifest URLs. The
existing loader resolves chunk filenames relative to the manifest URL;
coordinate mapping, height decoding, memory caching and correction policy are
unchanged.

The current R2 release contains Bakurani, Ozeti and Zestafona. The build excludes
`data/terrain/**/*.bin` even when binaries are present locally. Git ignores new
binaries there; removing already tracked binaries requires a separate index
change after upload and runtime verification. Local manifests remain tracked
for the toolchain, and `contours.json` stays on the application host. Keep the
`data/terrain/` directory.

Allow the application origin and local development origins in R2 CORS for
`GET` and `HEAD`, as with map tiles. The `/releases/` cache rule must cover JSON
and BIN objects too. Chunk requests use the browser's normal HTTP cache and the
runtime's per-map memory cache. The existing manifest/config loader uses
`cache: 'no-store'`; this migration does not change that behavior.

Verify the complete upload before activating the registry URLs. An unavailable
map manifest or chunk keeps the existing flat-table fallback; other maps can
still use successfully loaded terrain. For later dataset updates, publish and
verify a new versioned prefix first, then change the registry URLs. Keep
previously published release objects unchanged.

`contours.json` is generated, not extracted. `npm run build-contours` samples
the chunks on a 4 m grid across the map's playable bounds and writes 20 m
contour lines as delta-encoded vectors — a few hundred KB, against 129 MB of
chunks. It is committed, and regenerating it is the correct response to any
change in the heightfield or in a map's `bounds`.

The runtime cannot build these itself: `js/features/terrain-ballistics.js`
loads chunks lazily, two per firing solution, while a contour layer needs the
whole map at once. `js/map/contours.js` fetches the generated file only when
somebody turns the Contours layer on.

---

## Multi-map runtime registry

`data/ballistics/terrain-context.json` contains the Terrain3D map registry.

The runtime keeps the original top-level `mapId` / `terrainManifest` fields as a backward-compatible single-map fallback and uses `terrainMaps` for the current multi-map configuration.

Example shape:

```json
{
  "mapId": "bakurani",
  "terrainManifest": "https://assets.wardogs-artillery.com/releases/assets-v1/data/terrain/bakurani/manifest.json",
  "terrainMaps": {
    "bakurani": {
      "terrainManifest": "https://assets.wardogs-artillery.com/releases/assets-v1/data/terrain/bakurani/manifest.json"
    },
    "ozeti": {
      "terrainManifest": "https://assets.wardogs-artillery.com/releases/assets-v1/data/terrain/ozeti/manifest.json"
    },
    "zestafona": {
      "terrainManifest": "https://assets.wardogs-artillery.com/releases/assets-v1/data/terrain/zestafona/manifest.json"
    }
  }
}
```

Each map has an independent manifest and independent in-browser chunk cache. Failure to load one map's terrain dataset does not disable Terrain3D for other successfully loaded maps.

---

## Runtime loading

For each firing solution, the runtime:

1. Checks whether the current map has a registered Terrain3D dataset.
2. Checks whether Artillery and Target are inside that dataset's verified coverage.
3. Resolves both coordinates to terrain chunks.
4. Loads missing chunks with `fetch()`.
5. Caches loaded chunks for later samples.
6. Samples Artillery and Target elevation.
7. Computes and displays ΔZ.

Only the chunks needed by the current positions have to be decoded by the browser.

The feature runtime lives in:

```text
js/features/terrain-ballistics.js
```

---

## Coordinate-axis orientation

Terrain chunks store Landscape collision rows in native Landscape +Y order. Game/UI map coordinates use +Y toward the north/top of the tactical map, which is the opposite absolute Landscape-Y direction for the captured regions.

The runtime therefore supports independent per-axis factors:

```text
gameUnitsToLandscapeQuadsX = +50
gameUnitsToLandscapeQuadsY = -50
```

Bakurani reference mapping:

```text
WorldX(m) = GameX * 100 - 16320
WorldY(m) = -4080 - GameY * 100

GlobalQuadX = 8160 + GameX * 50
GlobalQuadY = 14280 - GameY * 50
```

The sign correction does not alter decoded height samples, chunk ordering, or seam validation. It only fixes which native Landscape Y location corresponds to a given game/UI Y coordinate.

---

## Ozeti coordinate mapping

Ozeti was reconstructed from the cooked Europe Landscape collision heightfields and aligned to the UI WorldCapture data.

Verified Landscape transform:

```text
Landscape root = (-1632200, -1632200, 4) cm
Landscape scale = (200, 200, 900)
```

Verified UI capture XY bounds from `DA_UI_Europe.uasset`:

```text
Min = (-1616000, -1616000) cm
Max = (   16000,    16000) cm
```

Therefore:

```text
WorldX(m) = GameX * 100 - 16160
WorldY(m) = 160 - GameY * 100

GlobalQuadX = 81 + GameX * 50
GlobalQuadY = 8241 - GameY * 50
```

Ozeti height conversion:

```text
worldZ(m) = 0.04 + localZ * 9
```

The recovered proxy set is `0..15 × 0..15`. The capture is offset by 81 quads from the recovered Landscape on both sides. Because game +Y runs opposite Landscape +Y, exact recovered coverage is:

```text
Game X: 0 .. 161.58
Game Y: 1.62 .. 163.20
```

The visible Ozeti map itself extends farther. Coordinates outside the verified Terrain3D coverage deliberately fall back to the normal firing table instead of clamping to the last terrain edge.

---

## Fallback behavior

Terrain elevation is not a hard dependency for the calculator.

If terrain data is missing, still loading, outside supported coverage, or otherwise unavailable:

- Distance remains available.
- Azimuth remains available.
- The configured weapon firing table remains available.
- MIL is not replaced by a guessed value.

This allows the calculator to keep working even when Terrain3D cannot provide a sample.

---

## SPH-2 vehicle leveling

SPH-2 vehicle attitude changes the real projectile range. Terrain height at the vehicle coordinate does not fully describe the final barrel angle, so the calculator shows a visible leveling warning whenever SPH-2 is selected.

### Checking lateral tilt in game

In the SPH-2 gunner HUD:

1. Find the vehicle silhouette below the `STABILIZED / ASL` area.
2. Look at the two small markers on the left and right sides of the silhouette.
3. Those side markers indicate lateral vehicle tilt.
4. Reposition the SPH-2 until the markers are as centered and aligned as possible.

Front/back slope also affects real range. There is currently no live numeric tilt value available to the calculator, so for precision fire the vehicle should be parked on the flattest ground available and obvious uphill/downhill positions should be avoided.

The visual warning is guidance, not an automatic correction input. A separate experimental hull-heading control can be enabled with `features.sphPlatformCorrection.enabled` in `config/app.json`; it remains inactive until the user explicitly enters the hull direction, and it does not infer the actual chassis tilt.

---

## Validation requirements

Before publishing a terrain-enabled build, verify every registered dataset:

- manifest exists and parses as JSON
- `format` is `wardogs-landscape-collision-u16-v1`
- `verticesPerSide = 511`
- `chunkQuads = 510`
- every manifest chunk file exists
- every chunk has the declared byte length
- every chunk SHA-256 matches the manifest
- map-specific coordinate coverage is verified
- `releasePolicy.automaticMilCorrection` remains `false`
- `releasePolicy.flatTableAuthoritative` remains `true`
- `calibration.ready` remains `false` until projectile/platform correction is independently validated

Then build normally:

```bash
npm run build
```

On Windows PowerShell systems where `npm.ps1` is blocked by Execution Policy, use:

```powershell
npm.cmd run build
```

---

## Adding terrain data to another map

Terrain elevation is optional and should stay map-specific.

A new map should add its dataset under:

```text
data/terrain/<map-id>/
```

and add one entry to `terrainMaps` in:

```text
data/ballistics/terrain-context.json
```

Publish the manifest and binaries to R2 and use the full public manifest URL in
that entry. Uploading files does not register the map by itself. Keep its local
manifest and binaries available when regenerating contours; restore binaries
from the matching R2 release if the local copy was removed.

The map dataset must define:

- supported coordinate coverage
- chunk layout and resolution
- coordinate-to-terrain mapping
- elevation decoding rules
- integrity metadata

Maps without a terrain dataset require no changes and continue to use the existing calculator behavior.

---

## Release boundary

Terrain3D extraction and display are separate from ballistic compensation.

A terrain dataset can be considered valid for elevation display without implying that an automatic firing correction is valid. Vehicle pose, suspension, chassis attitude, projectile model, and final barrel transform may affect real firing elevation independently of map terrain height.

For that reason, verified elevation context is exposed while the existing firing tables remain authoritative.
