## Maps

Maps are registered in:

```text
maps/index.json
```

Each map has its own JSON configuration and may define:

- Coordinate bounds
- Tile configuration
- Markers
- Zones
- Polygons
- Map-specific metadata

### Indexable map landing pages

Bakurani, Ozeti and Zestafona each have a lightweight English search document:

```text
/maps/bakurani/
/maps/ozeti/
/maps/zestafona/
```

Every supported language also has a complete localized document:

```text
/<locale>/maps/<map-id>/
```

These routes are generated as real HTML files. They are useful map summaries and entry points, not duplicate calculators: they load only the shared landing stylesheet, the small language-route selector and deferred analytics, then link to the main application with a validated `?map=<map-id>` parameter. The application consumes that parameter once, selects the registered map and stores it through normal selection persistence.

Shared markup lives in `src/pages/maps/template.html`. English map-specific source material lives in `scripts/map-landing-pages.mjs`; reviewed translated copy lives in `scripts/map-landing-locales.mjs`. `scripts/build-pages.mjs` creates the routes, both sitemap stages include every indexable translation, and `scripts/verify-build.mjs` enforces the SEO, localization and lightweight-loading contract.

English pages use `<base href="../../">`; localized pages use `<base href="../../../">`. Production canonical and sitemap URLs are self-referencing, absolute and consistently use a trailing slash. The Cat locale is generated for navigation but remains `noindex` and excluded from sitemap and `hreflang` clusters.

### Bakurani

Bakurani uses a multi-resolution WebP tile pyramid published to Cloudflare R2.
Object keys in the `wardogs-assets` bucket have this structure:

```text
releases/assets-v1/maps/tiles/bakurani/
├── zoom_0/
├── zoom_1/
├── zoom_2/
├── zoom_3/
├── zoom_4/
├── zoom_5/
├── zoom_6/
└── zoom_7/
```

Map configuration can define coordinate bounds:

```json
{
    "id": "bakurani",
    "name": "Bakurani",
    "w": 16,
    "h": 16,

    "bounds": {
        "minX": 23.35,
        "maxX": 133.60,
        "minY": 19.34,
        "maxY": 129.65
    },

    "tileBounds": {
        "minX": 0.0,
        "maxX": 163.84,
        "minY": 0.0,
        "maxY": 163.84
    },

    "coordinateMetersPerUnit": 100,

    "tiles": {
        "path": "https://assets.wardogs-artillery.com/releases/assets-v1/maps/tiles/bakurani",
        "tileSize": 256,
        "minZoom": 0,
        "maxZoom": 7,
        "extension": "webp"
    }
}
```

`bounds` defines the playable/searchable in-game coordinate extent. It is used for coordinate search, point clamping, the visible grid, and camera fit.

`tileBounds` is independent from `bounds` and defines the world-coordinate extent covered by the complete tile pyramid. This separation allows the source render to contain terrain outside the playable coordinate rectangle without shifting the in-game grid.

`coordinateMetersPerUnit` converts map-coordinate deltas into physical meters. For Bakurani, `100` means one coordinate unit equals 100 meters, so `0.01` coordinate equals 1 meter.

Map calibration is based on available in-game reference data and may be refined as more accurate information becomes available.

### Tile hosting

Bakurani, Ozeti and Zestafona use absolute `tiles.path` URLs under
`https://assets.wardogs-artillery.com/releases/assets-v1/maps/tiles/`.
Desktop, mobile and localized pages share these URLs. Terrain3D manifests and
chunks use R2 as described in [Terrain3D hosting](terrain.md#terrain3d-hosting).
Map JSON, marker images, contours and ballistic configuration keep their
existing paths on the application host.

The tile loader requests images with `crossOrigin = 'anonymous'`. R2 must return
an `Access-Control-Allow-Origin` header matching the page origin for `GET` and
`HEAD` requests. Allow `https://wardogs-artillery.com` and, for local development,
`http://localhost:8000`. Add `http://127.0.0.1:8000` or a LAN origin if using those
addresses; the port is part of the origin.

`maps/tiles/` is local working data: Git ignores new files there and the build
excludes the entire directory from `dist/`, even when a local tile copy exists.
Already tracked tiles must be removed from Git's index separately after checking
the CDN upload and the application. Ignoring files does not remove Git history.

To update imagery, upload and verify a complete new release prefix first, then
change the map JSON URLs (for example, to `releases/assets-v2/`). Keep published
release objects unchanged so long-lived caches cannot mix old and new tiles.
The example map's relative path can be used for local tile development; give any
registered production map a published tile URL before deployment.

These URLs are public. Moving tiles out of Git reduces the checkout and build
size, but CORS does not prevent downloading or copying browser-visible assets.

---

## Terrain elevation data

Map imagery and terrain elevation are separate data sources. A local Terrain3D
working dataset is stored under its map directory, for example:

```text
data/terrain/bakurani/
├── manifest.json
└── chunks/
    └── *.bin
```

The manifest describes how map coordinates resolve into terrain chunks and how stored height values are converted to elevation. The runtime loads only the chunks needed for the current Artillery and Target positions from R2 and caches them for later samples.

Bakurani, Ozeti and Zestafona publish their manifest and chunks together under
`releases/assets-v1/data/terrain/<map-id>/`. Full manifest URLs are registered
in `data/ballistics/terrain-context.json`. Local `.bin` files are excluded from
the build; manifests and generated contours remain in the repository.

Terrain sampling is used to provide elevation context for SPH-2:

```text
artillery coordinate -> artillery elevation
 target coordinate    -> target elevation
                          ↓
              ΔZ = target - artillery
```

Terrain data is deliberately independent from the tile pyramid. Replacing or recalibrating map imagery does not change terrain samples unless the terrain coordinate mapping itself is changed.

In v1.6.0, Terrain3D does **not** automatically modify the firing-table MIL value. If a manifest, chunk, or terrain sample is unavailable, the calculator keeps the normal firing solution instead of treating terrain as a hard dependency.

See [Terrain Elevation & SPH-2 Setup](terrain.md) for runtime and validation details.

---

## Marker assets and user placement

Marker assets are defined in:

```text
maps/assets.json
```

Each marker asset supports a `placeable` flag:

```json
{
    "tower": {
        "path": "assets/map-markers/tower.webp",
        "width": 32,
        "height": 32,
        "anchorX": 0.5,
        "anchorY": 0.5,
        "placeable": true
    }
}
```

- `placeable: true` makes the asset available in the user **Markers** tool and allows it to be placed manually.
- `placeable: false` hides the asset from the picker and prevents user placement.
- Preset markers in map JSON can still use a non-placeable asset. The flag only controls user placement.
- If `placeable` is omitted, it defaults to `true` for backwards compatibility.

---

## Marker zoom visibility

Preset map markers support optional `minZoom` and `maxZoom` properties. These values use the **camera zoom multiplier** (`1` = Fit, `2` = 2× zoom, etc.). Both limits are inclusive.

```json
{
    "icon": "tower",
    "x": 8345,
    "y": 7294,
    "label": "Tower 4",
    "minZoom": 2,
    "maxZoom": 15
}
```

- `minZoom`: marker is hidden while camera zoom is below this value.
- `maxZoom`: marker is hidden while camera zoom is above this value.
- If either property is omitted, that side of the range is unrestricted.
- Hidden markers are also excluded from hover/click target detection.

---

## Adding a Map

1. Create a map configuration:

```text
maps/my-map.json
```

2. Register the map in:

```text
maps/index.json
```

3. Generate tiles locally if required:

```text
maps/tiles/my-map/
```

4. Upload the tile pyramid to R2 under a versioned release prefix and set
   `tiles.path` to its full public HTTPS URL. Local tiles are excluded from the
   production build.

5. If the map needs an indexable landing page, add a unique, fact-checked English definition to `scripts/map-landing-pages.mjs`, add reviewed translations to `scripts/map-landing-locales.mjs`, link it from the relevant English homepage SEO section, then run the build and SEO smoke test. Do not publish mechanical translations or copy another map's text with only the name changed.

5. Configure the coordinate bounds.

The map renderer is designed to be map-independent, so additional maps can be added without modifying the core rendering logic.

Terrain elevation is optional. A map without terrain data continues to use the normal coordinate, map, and firing-table behavior.

---
