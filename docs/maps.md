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

The tile loader requests images through the protected asset client. The
production service authorizes the official application origin; merely running
the repository on `localhost`, a LAN address, or another domain does not grant
access. A contributor origin may be enabled temporarily by the maintainer, but
forks and self-hosted deployments must use their own asset host and update the
map configuration accordingly. See
[Forks and self-hosted deployments](cdn.md#forks-and-self-hosted-deployments).

`maps/tiles/` is local working data: Git ignores new files there and the build
excludes the entire directory from `dist/`, even when a local tile copy exists.
Already tracked tiles must be removed from Git's index separately after checking
the CDN upload and the application. Ignoring files does not remove Git history.

To update imagery, publish a complete immutable tile revision inside the existing
`releases/assets-v1/` prefix, then change the map JSON URLs. Keep published
revision objects unchanged so long-lived caches cannot mix old and new tiles.
The example map's relative path can be used for local tile development; give any
registered production map a published tile URL before deployment.

### Versioned tile updates

Each map and style can use its own published revision, for example:

```text
releases/assets-v1/maps/tiles/bakurani/revisions/s2-20261015/zoom_0/0_0.webp
releases/assets-v1/maps/tiles-color/bakurani/revisions/s2-20261015/zoom_0/0_0.webp
```

Set `tiles.path` and the relevant `tiles.styles.<style>.path` to the directory
immediately above `zoom_0`. Revisions use 1–48 lowercase letters, digits or
hyphens, starting with a letter or digit. The release label changes when the
imagery changes, independently of the application version. Existing unversioned
paths remain supported; other maps do not require a tile upload for this change.

The loader uses the same source for its initial low-resolution preview and
detailed tiles. Its memory cache and pending-request checks include that source,
so an older revision cannot supply a preview for a newer one. The protected
client retains the complete revision path when selecting the delivery host.

Publish in this order:

1. Deploy the updated asset gateway before enabling versioned paths.
2. Upload every zoom level of each changed style from a verified current build
   to a new revision directory. For server-side copies, copy each `zoom_N/`
   prefix separately: for example, `bakurani-dev/zoom_3/` to
   `bakurani/revisions/<new-revision>/zoom_3/`. Never recursively copy the parent
   map prefix into its own `revisions/` subtree: this can also copy older zoom
   levels and nested revisions. Do not use `sync --delete` on the parent map
   directory.
3. Verify that the new preview and all required detailed tiles exist. A new URL
   does not repair an incomplete pyramid or an outdated low-resolution source.
4. Update all changed style paths in the map JSON. If the admission probe uses
   that map, update `assetGateway.probePath` in `config/app.json` to a published
   `zoom_0/0_0.webp` from the same revision. Run `npm run check`, then deploy Pages.
5. Keep previous revisions available for cached clients and rollback. If a
   published revision needs correcting, publish another revision instead of
   overwriting its objects. New revision URLs do not need a purge unless they
   were requested and cached before the upload finished.

Styles can publish independently: a grayscale update does not require copying
an unchanged color pyramid. The default `tiles.path` and admission probe must
follow the default style's published revision. Set a style's `tileSize` when its
decoded tile dimensions differ from the shared nominal size. For Bakurani's
current grayscale pyramid, the inspected preview and `zoom_3` tile are 256 px.

Revision URLs use real R2 object keys under the existing protected prefix. They
require the same access checks as unversioned tiles and need no query string,
redirect, fallback to old imagery, or additional Worker hop for direct delivery.
Existing prefix-based WAF rules continue to apply. CDN purging does not clear
copies already stored in browser caches; changing the object path avoids those
old copies on the next application load.

These URLs are browser-visible, but they are not a general-purpose public asset
API. Moving tiles out of Git reduces the checkout and build size, while CORS
alone cannot prevent copying. Use of the project-funded CDN is nevertheless
limited by the [CDN & hosted assets policy](cdn.md). Forks and independent
deployments must host any assets they are entitled to use themselves and must
not hotlink, proxy, scrape, mirror, or bulk-download the official CDN.

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

Terrain3D correction is enabled by default and applies only to a verified `SAFE_CONSENSUS` arc. If a manifest, chunk, candidate payload or terrain sample is unavailable, the calculator keeps the normal firing solution instead of treating terrain as a hard dependency.

See [Terrain Elevation & SPH-2 Setup](terrain.md) for runtime and validation details.

---

## Spawn area overlays

The faction spawn polygons use `renderStyle: "spawn"`: a translucent faction
color, an inward edge glow, a thin solid outline, and stronger corner brackets.
The glow follows each edge of the rotated polygon. The style is a procedural
Canvas approximation based on `MI_UI_Safe_Zone`; it requires no extra textures,
asset requests, or animation. High-contrast mode strengthens the fill and frame,
and stroke/glow widths are bounded in screen pixels as the map zoom changes.

This style is selected explicitly in each map's `polygons` array. It is not
inferred from labels or colors. `color` determines the faction tint and
`fillOpacity` controls the base fill; polygons without this style use the
ordinary renderer. Spawn polygons remain in the existing **Layers → Polygons**
layer, with their labels and map coordinates. User-drawn polygons keep their
own appearance.

## Marker assets and user placement

Marker assets are defined in:

```text
maps/assets.json
```

Each marker asset supports a `placeable` flag:

```json
{
    "tower": {
        "path": "assets/map-markers/tower-map.png",
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

### Numbered tower markers

Preset towers use `assets/map-markers/tower-map.png` and a separate white
number with Barlow Semi Bold, a dark outline, and a drop shadow. The number is
inset into the upper-right of the icon; it replaces the long `Tower N` label.
The exported artwork and text settings are used for a static map marker;
live ownership, capture progress, and game-material animations are not shown.

Set `towerNumber` explicitly in the map marker:

```json
{
    "icon": "tower",
    "x": 8361,
    "y": 7284,
    "label": "Tower 4",
    "towerNumber": 4,
    "minZoom": 0.4,
    "maxZoom": 100
}
```

`towerNumber` is an integer from 1 to 99. Older configurations can still obtain
the number from a trailing number in `label`; the marker's array position is
never used for numbering. Other marker labels retain their normal rendering.
Zoom visibility, coordinates, and click-to-target selection remain unchanged.

The numeral-only font is hosted locally at
`assets/fonts/barlow/tower-numbers-semibold.woff` (about 6 KB), with its SIL Open
Font License alongside it. It is derived from
[Barlow Semi Bold](https://github.com/google/fonts/tree/main/ofl/barlow).
The map draws a system-font number if the font is unavailable, and a numbered
diamond if the icon is pending or unavailable. Large-text and high-contrast
accessibility settings also apply to the number in both interfaces.

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

## Control zone presets

Choose the variant used in your match in **Setup → Control zone**. On mobile,
this field is in the **Map** tab next to the map settings. The overlay uses a
white boundary, a faint white fill, a center mark, and a label with the radius.
A soft inner glow and a short outer fade follow the appearance of the game's
circular zone material. A dark backing keeps the boundary and label readable
in both color themes; high-contrast mode uses a stronger fill and thicker line.

The overlay is drawn procedurally in Canvas without extra asset requests or
animation. Its opacity and glow strength are based on `MI_UI_Zone_Circle`
and its parent `MI_UI_Zone`; the gradient is an approximation of the game
material, not a copy of its shader. Line and glow widths stay bounded in screen
pixels, while the boundary stays at the preset's physical radius.

**Hidden** removes the zone from the current map. The separate
**Layers → Control zone** checkbox hides the overlay without forgetting the
selected variant. The selection is saved separately for Bakurani, Ozeti, and
Zestafona in this browser. No zone is selected on a first visit.

The field uses a labelled native select, follows the current language and
accessibility settings, and supports normal keyboard and touch input. This is
a personal map overlay; choosing a preset does not change other lobby
participants' views, user-drawn zones, or the active map tool.

Each map JSON accepts a `controlZones` array:

```json
{
  "controlZones": [
    {
      "id": "default",
      "labelKey": "controlZoneDefault",
      "x": 79.593275,
      "y": 71.53121,
      "radiusMeters": 500,
      "selectionWeight": 2
    }
  ]
}
```

Unlike the legacy `zones` and `markers` arrays, `controlZones.x/y` are game
coordinates, not stored meter coordinates. One game coordinate unit is 100 m
on the three current maps. `radiusMeters` is a physical radius, independent
of map bounds, zoom, and screen size. `labelKey` comes from the locale catalog.
A zero `selectionWeight` is labelled as an inactive variant but remains
selectable for reference; it is not used to randomize the selected zone.

The bundled presets were converted from the supplied FModel exports of
`DA_ControlZoneConfig_Bakurani`, `DA_ControlZone_Config_Europe`, and
`DA_ControlZone_Config_NorthAmerica`. Those exports enable the alternator,
so the presets use `AlternatorZoneData`, rather than only the fallback
`ZoneData`. Equal horizontal `ZoneScaledExtents.X/Y` produce circular outlines,
including the Zestafona variants whose shape enum is `Ellipse`.

The horizontal extents are interpreted as radii/semi-axes in Unreal centimeters:
50000 cm → 500 m and 55000 cm → 550 m. This interpretation should be checked
against an in-game zone boundary before treating the outlines as verified.
The planar coordinate conversions are:

| Map | Game X | Game Y |
| --- | --- | --- |
| Bakurani | `(WorldX_cm + 1632000) / 10000` | `(-408000 - WorldY_cm) / 10000` |
| Ozeti | `(WorldX_cm + 1616000) / 10000` | `(16000 - WorldY_cm) / 10000` |
| Zestafona | `(WorldX_cm + 816000) / 10000` | `(816000 - WorldY_cm) / 10000` |

Zestafona's conversion uses the exported NorthAmerica landscape root at
`(-816000, -816000)` cm, its 200 cm horizontal vertex spacing, and the existing
Terrain3D game-coordinate mapping (50 landscape quads per game unit, inverted Y).

The moving hot zone is deliberately omitted: these configuration exports do
not supply its current position during a match. The feature makes no additional
CDN requests and does not read live game memory.
