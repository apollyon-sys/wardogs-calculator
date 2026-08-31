# Analytics

The project uses Umami for lightweight, privacy-conscious usage analytics.

The tracker is loaded by the desktop and mobile page shells. Application code sends custom events through `js/core/analytics.js` instead of calling `window.umami.track()` directly.

## Production tracker scope and performance

The final build step configures every generated Umami tracker with:

- `data-domains="wardogs-artillery.com"` — updated builds only initialize the tracker when `window.location.hostname` is the production domain;
- `data-performance="true"` — enables Umami real-user performance metrics such as Core Web Vitals.

The configuration is applied in `scripts/version-assets.mjs`, which runs after desktop, mobile and localized pages have been generated. This keeps the source page shells simple and ensures that all production HTML receives the same analytics policy.

The domain restriction prevents updated copies, local development builds, GitHub Pages mirrors and forks from reporting production analytics when they run on another hostname.

It cannot retroactively modify a stale third-party deployment that still contains an older tracker tag and the old public Umami website ID. If a stale external deployment continues reporting after this fix has shipped, rotate the Umami website ID to establish a clean production-only dataset.

## Custom events

The current event set intentionally focuses on meaningful user actions rather than high-frequency UI input:

| Event | When it is sent | Event data |
|---|---|---|
| `calculation` | First stable calculation for each map + weapon context in the current browser-tab session | `map`, `weapon`, `inRange` |
| `origin-placed` | First artillery/origin placement for each map in the current browser-tab session | `map` |
| `target-placed` | First target placement for each map in the current browser-tab session | `map` |
| `map-changed` | User changes the map preset or applies a custom map | `map` |
| `weapon-changed` | User selects a different weapon | `weapon` |
| `target-saved` | User saves the current target | `withArtillery` |
| `target-restored` | User restores a saved target | `withArtillery` |
| `target-exported` | User exports one saved target | `withArtillery` |
| `targets-exported` | User exports the complete saved-target list | `count` |
| `targets-imported` | A valid single-target or target-list JSON file is imported | `count`, `format` |
| `preset-marker-selected` | First preset-marker target selection for each map in the current browser-tab session | `map` |
| `coordinate-search` | A valid coordinate search is completed | `map` |
| `terrain3d-toggle` | User manually enables or disables experimental Terrain3D correction | `enabled`, `map` |
| `contours-toggle` | User enables or disables terrain contours directly or through the Base layer group | `enabled`, `map` |
| `ruler-used` | A non-zero ruler measurement is completed | `map` |
| `drawing-created` | A pencil path is completed | `map` |
| `user-marker-placed` | A user Map Tools marker is placed | `map` |
| `map-changes-exported` | User exports persistent Map Tools data | `drawings`, `markers` |
| `map-changes-imported` | A valid Map Tools JSON file is imported | `drawings`, `markers`, `layers` |
| `partner-click` | User opens a community partner link | `partner`, `placement` |
| `desktop-version` | Mobile user chooses the desktop interface | none |

## High-volume event budget

The analytics wrapper applies session-level deduplication to the highest-volume interaction events:

- `calculation` is emitted at most once for each map + weapon combination in the current browser-tab session;
- `origin-placed` is emitted at most once per map in the current browser-tab session;
- `target-placed` is emitted at most once per map in the current browser-tab session;
- `preset-marker-selected` is emitted at most once per map in the current browser-tab session.

The deduplication keys are stored in `sessionStorage`, so a page reload in the same tab does not immediately generate the same high-volume events again. A new tab starts a new analytics session budget. If `sessionStorage` is unavailable, the same policy still works in memory for the current page lifetime.

This intentionally changes these events from action counters into **feature-usage signals**. They are suitable for measuring how many sessions use a feature and for preserving the Origin → Target → Calculation funnel without spending analytics quota on every repeated drag or recalculation.

## Calculation event behavior

`calculation` is still debounced. Dragging a target or artillery marker therefore does not emit an event on every pointer move.

The initial solution rendered on application startup is treated as a baseline and is not counted as a user calculation. A changed solution must remain stable for 900 ms before analytics considers it, and the session-level budget then decides whether that map + weapon context has already been recorded.

## v1.7 feature telemetry

Terrain3D analytics is intentionally limited to the explicit checkbox action:

```text
terrain3d-toggle
enabled: true | false
map: <map id>
```

It does **not** include:

- firing-table MIL;
- corrected MIL;
- LOW/HIGH candidate commands;
- ΔZ;
- artillery or target coordinates;
- candidate status/reason;
- ballistic payload data.

Contour analytics records only whether the contour layer was enabled or disabled and the current map id.

The Map Tools functions are wrapped after page initialization so contour telemetry stays centralized in `js/core/analytics.js` rather than adding direct Umami calls to the map implementation.

## Privacy and event volume

Custom analytics data does **not** include:

- exact artillery or target coordinates;
- saved target names;
- saved-target JSON contents or file names;
- drawing geometry;
- user marker coordinates;
- coordinate-search values;
- any localStorage contents;
- exported/imported JSON contents or file names.

Saved-target transfer events report only counts, import format (`single` or `list`), and whether a single exported target includes an artillery position. Names and coordinates are never sent.

Map data transfer events contain only aggregate item counts and whether layer settings were included. Coordinates, drawing geometry, marker positions, and imported file contents are not sent to Umami.

This keeps event payloads small and avoids generating excessive event-data usage. High-frequency actions such as map panning, cursor movement, mouse movement, and pinch/wheel zoom are deliberately not tracked.

Repeated high-volume calculator interactions are also deduplicated before they are queued or sent to Umami. Rare actions such as saved-target transfer, drawings, ruler use, map changes, Terrain3D/contour toggles, and partner clicks continue to be recorded per completed action because their event volume is comparatively small and their action counts remain useful.

## Adding an event

Use the shared wrapper:

```js
trackAnalytics(
    'event-name',
    {
        property: 'value'
    }
);
```

Do not call `window.umami.track()` directly from feature modules.

Prefer events that represent a completed user action. Avoid events inside animation frames, pointer-move handlers, render loops, or other high-frequency paths.

If Umami has not finished loading yet, the wrapper temporarily queues a small number of events and flushes them when the tracker becomes available. If the tracker is blocked or unavailable, application functionality is unaffected.

## Development analytics switch

`npm run dev` disables production Umami analytics by default. This prevents local pageviews and custom events from contaminating production usage data.

The development server reads `WARDOGS_DISABLE_ANALYTICS`:

```bash
WARDOGS_DISABLE_ANALYTICS=true npm run dev
```

To deliberately test analytics locally:

```bash
WARDOGS_DISABLE_ANALYTICS=false npm run dev
```

PowerShell equivalent:

```powershell
$env:WARDOGS_DISABLE_ANALYTICS = "false"
npm run dev
```

When disabled, the dev server removes the Umami script from served HTML and sets `window.__WARDOGS_ANALYTICS_DISABLED__ = true`. The shared analytics wrapper checks this flag before sending or queueing events.

Production builds do not inject this flag and are not affected by the development setting.

Note that `data-domains="wardogs-artillery.com"` is a production-build restriction. If analytics is deliberately enabled through `npm run dev`, the source page shell is served before the final production post-processing step, so local tracker testing remains possible.
