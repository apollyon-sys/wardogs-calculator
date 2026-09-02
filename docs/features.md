## Features

### Artillery Calculator

- Automatic azimuth calculation
- Distance in meters and kilometers
- ΔX / ΔY calculation
- Weapon minimum/maximum-range visualization
- In-range / out-of-range status
- Interactive artillery and target positioning
- Automatic recalculation when positions change
- Saved target positions
- Optional artillery-position saving with targets
- Export/import individual saved targets or the complete saved-target list as JSON
- JSON-based weapon definitions
- Bakurani Terrain3D elevation lookup for SPH-2 result context
- ΔZ display between the artillery position and target when terrain data is available
- Prominent SPH-2 leveling guidance under the firing solution

### Tactical Map

- Interactive tiled map
- Calibrated in-game coordinate system
- Cursor coordinates with a Layers toggle
- Coordinate search
- Mouse-wheel zoom on desktop
- Touch pinch zoom on mobile
- Mouse/touch map panning
- Fullscreen mode on desktop
- Preset and custom maps
- JSON-defined markers, zones, and polygons
- Configurable map layers
- Per-marker minimum and maximum camera zoom visibility

### Map Tools

The floating Map Tools toolbar provides:

- **Ruler** — measure distance and azimuth
- **Pencil** — draw directly on the map
- **Eraser** — remove pencil strokes and user-placed map markers
- **Markers** — place tactical markers
- **Coordinate Search** — jump to specific coordinates
- **Layers** — toggle map tiles, overlays, drawings, markers, and cursor coordinates
- **Import / Export** — back up or share drawings, user markers, and layer visibility settings as JSON
- **Undo / Redo** — drawings, erased strokes, user markers, and Artillery/Target position changes

Drawings and user markers are stored locally per map and are shared between desktop and mobile because both interfaces use the same site origin. The Import / Export Map Tool exports the complete persistent Map Tools state across maps (drawings, user markers, and layer visibility settings). Imports are merged with existing user content and imported drawing/marker IDs are regenerated to avoid collisions.

### Mobile Interface

The dedicated `/mobile/` UI is designed around touch input rather than being a scaled-down desktop layout.

- One-finger map panning
- Two-finger pinch zoom around the gesture midpoint
- Tap-to-place Artillery/Target
- Drag-to-move Artillery/Target
- Touch Map Tools, including Pencil, Eraser, Markers, Layers, and Import / Export; the mobile toolbar is collapsed behind a single button by default
- Touch-accessible Undo / Redo buttons inside Layers
- Tap preset marker to select it as Target
- Swipeable bottom sheet for calculator, map settings, and saved targets
- Automatic routing from narrow coarse-pointer devices
- Desktop-version escape link

See [Mobile Interface](mobile.md) for routing and deployment details.

### Default Shortcuts

Desktop Map Tool shortcuts:

| Shortcut | Action |
|---|---|
| `R` | Ruler |
| `P` | Pencil |
| `E` | Eraser |
| `M` | Markers |
| `F` | Coordinate Search |
| `L` | Layers |
| `Esc` | Leave active tool |
| `Ctrl + Z` | Undo |
| `Ctrl + Y` | Redo |
| `Ctrl + Shift + Z` | Redo |

Desktop camera controls:

| Shortcut | Action |
|---|---|
| `W` `A` `S` `D` | Pan the map |
| Arrow keys | Pan the map |
| `Shift` + pan | Pan faster |
| `+` | Zoom in |
| `-` | Zoom out |
| Right-click drag | Pan the map |
| Mouse wheel | Zoom at the cursor |

Map Tool shortcuts and the keyboard pan speed can be configured in:

```text
config/app.json
```

---

## Supported Weapons

Weapon definitions are stored separately from the application logic:

```text
data/weapons.json
```

This allows weapons and their properties to be updated without modifying the core JavaScript.

Current weapon support includes:

| Weapon | Range |
|---|---:|
| Mortar | 132–684 m |
| SPH-2 | 780–2629 m |

---

## Coordinate System

Physical distance conversion is map-specific and is configured by `coordinateMetersPerUnit`.

For the calibrated Bakurani map:

```text
1.00 coordinate = 100 m
0.10 coordinate = 10 m
0.01 coordinate = 1 m
```

For example, the distance between:

```text
X105.00 Y115.10
X105.10 Y115.10
```

is 10 meters.

Azimuth follows standard compass bearings:

```text
0°   = North
90°  = East
180° = South
270° = West
```


## MIL firing solutions

The result panel calculates elevation in MIL from the configured ballistic tables. Mortar uses a single firing solution. SPH-2 exposes low-angle and high-angle solutions when both trajectories are available for the current distance. Weapon range limits remain separate from ballistic-table coverage, so samples outside the configured playable range are not treated as valid shots.


## Terrain elevation and SPH-2 setup

Bakurani can provide terrain height at the Artillery and Target coordinates. When both samples are available, the SPH-2 result context shows:

```text
ΔZ = target elevation - artillery elevation
```

A positive value means the target is above the artillery position. A negative value means the target is below it.

Terrain elevation is currently **informational**. The v1.6.0 release does not automatically change MIL from Terrain3D or vehicle attitude. Existing firing tables remain authoritative.

SPH-2 accuracy is also affected by vehicle attitude. A visible warning is shown under the result when SPH-2 is selected. In the gunner HUD, the two small side markers around the vehicle silhouette below `STABILIZED / ASL` indicate lateral tilt. For best accuracy, reposition the vehicle until those markers are as centered and aligned as possible and avoid parking on an obvious uphill/downhill slope.

See [Terrain Elevation & SPH-2 Setup](terrain.md) for data layout, runtime behavior, fallback rules, and validation details.

### Terrain-aware max range

On maps with elevation data the max range ring is not a circle. Height
changes how far a shell carries — roughly a metre of range per metre of
height — so the ring is solved per bearing against the ground the shell
flies over.

Two outlines are drawn:

- **The solid ring** is the reachable area, never drawn past the weapon's
  table max range.
- **A tinted band with a dashed outline** appears outside it when terrain
  buys range the firing table does not cover. It is context, like the ΔZ
  readout — the app will not print a MIL for a target out there.

A bearing that outreaches the edge of the elevation data samples the nearest
point on the boundary rather than stopping there, so the outline is never cut
off square along the map edge.

On maps without elevation data, and until the heightfield finishes loading,
the ring is the plain circle it has always been.


## Coordinate copy / paste

Artillery and Target positions can be copied in the shareable `x100.05, y109.14` format and pasted back with one action. The parser accepts labeled X/Y values, plain two-number input, decimal points, and decimal commas. Clipboard APIs are used when available, with a manual prompt fallback when browser permissions prevent direct clipboard access.


## Position locks

Artillery and Target can be locked independently against direct map interaction. A locked point cannot be moved by map clicks, marker dragging, touch dragging, or preset-marker target selection. Manual coordinate input and the coordinate Paste action remain available while a point is locked, so the lock acts as protection against accidental map edits rather than disabling intentional coordinate entry. Explicit actions such as Swap, Reset, and restoring a saved target are also left available.


## Firing-solution result hierarchy

Distance, MIL, and azimuth are treated as the three primary firing-solution values and are shown together in a high-contrast metric grid. Distance keeps meters as the primary value and kilometers as secondary context; MIL shows trajectory labels only as secondary information; ΔX and ΔY are visually de-emphasized below the main solution.
