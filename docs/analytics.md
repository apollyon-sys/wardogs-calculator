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

The event set is deliberately quota-conscious. High-frequency actions that can be inferred from a completed calculation are not tracked separately.

| Event | When it is sent | Event data |
|---|---|---|
| `calculation` | First stable calculation for each map + weapon context in a sampled browser-tab session | `map`, `weapon`, `inRange` |
| `map-style-changed` | User switches between grayscale and color map tiles | `map`, `style` |
| `target-saved` | User saves the current target | `withArtillery` |
| `target-restored` | User restores a saved target | `withArtillery` |
| `target-exported` | User exports one saved target | `withArtillery` |
| `targets-exported` | User exports the complete saved-target list | `count` |
| `targets-imported` | A valid single-target or target-list JSON file is imported | `count`, `format` |
| `coordinate-search` | A valid coordinate search is completed | `map` |
| `fire-adjusted` | A fire-adjustment correction or marked/pasted impact moves the target | `map`, `weapon`, `mode` (`correction` or `impact`) |
| `terrain3d-toggle` | User manually enables or disables experimental Terrain3D correction | `enabled`, `map` |
| `contours-toggle` | User enables or disables terrain contours directly or through the Base layer group | `enabled`, `map` |
| `ruler-used` | A non-zero ruler measurement is completed | `map` |
| `drawing-created` | A pencil path is completed | `map` |
| `zone-created` | A non-zero circular zone is completed | `map` |
| `polygon-created` | A polygon with at least three points is completed | `map` |
| `user-marker-placed` | A user Map Tools marker is placed | `map` |
| `map-changes-exported` | User exports persistent Map Tools data | aggregate counts only |
| `map-changes-imported` | A valid Map Tools JSON file is imported | aggregate counts only |
| `partner-click` | User opens a community partner link | `partner`, `placement` |
| `donation-click` | User opens a donation service | `service`, `placement` |
| `feedback-opened` | User opens the feedback dialog | none |
| `feedback-sent` | Feedback is accepted by the backend | coarse feedback `type` |
| `feedback-failed` | Feedback submission fails | coarse `type`, bounded `reason` |
| `desktop-version` | Mobile user chooses the desktop interface | none |
| `lobby-*` | Completed lobby lifecycle actions | bounded lifecycle fields described below |

The following former high-volume events are intentionally retired:

- `origin-placed`;
- `target-placed`;
- `preset-marker-selected`;
- `map-changed`;
- `weapon-changed`.

Their product value was low relative to their event volume. Map and weapon context remain available on the sampled `calculation` event, while map-style, Terrain3D, saved-target, map-tool, donation, feedback and lobby telemetry stay intact.

## Event budget and sampling

`calculation` is the only sampled product event. A random bucket is created once per browser-tab session and persisted in `sessionStorage`; **20% of sessions** are selected for calculation telemetry. Within a selected session, `calculation` is still emitted at most once for each map + weapon combination.

This preserves an unbiased feature-usage sample while reducing the dominant custom-event source by about 80%. The initial solution rendered on application startup is still treated as a baseline and is not counted. A changed solution must remain stable for 900 ms before analytics considers it.

Operational failures keep session-level deduplication by failure signature. Repeated copies of the same failure in one tab are not sent again after the first matching event.

Normal product events no longer receive a `build` property automatically. Build identifiers are attached only to operational failure events, where they are useful for regression diagnosis.

## Performance and operational telemetry

Umami's built-in `data-performance="true"` tracker remains enabled for Core Web Vitals. The previous custom `lcp-slow-*` events have been removed because they duplicated the built-in performance dataset and carried large payloads.

Resource-error telemetry ignores failures originating from third-party scripts, Cloudflare instrumentation/challenges, and Umami itself. Application/site resources and the WARDOGS asset CDN remain observable.

Client-error telemetry also suppresses known browser noise that is not actionable application code:

- `ResizeObserver loop ...` warnings;
- opaque `Script error.` events without a source;
- errors originating from browser-extension URLs.

Operational payloads omit empty diagnostic fields. This keeps `client-error`, `map-load-failed`, `asset-load-failed` and `terrain-load-failed` useful without spending quota on empty metadata.

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

## v1.8 lobby telemetry

Lobby analytics measures feature adoption and connection outcomes, not room activity. It uses the shared `trackAnalytics()` wrapper and emits only completed lifecycle actions:

- `lobby-opened` when the panel is opened for the first time during the current page lifetime;
- `lobby-connected` after a valid room snapshot establishes a connection;
- `lobby-failed` when creation, joining or reconnection fails;
- `lobby-disconnected` when an established connection closes unexpectedly;
- `lobby-left` after the user explicitly leaves;
- `lobby-invite-copied` only after the clipboard operation succeeds;
- `lobby-recovery-exported` after a recovery file is generated.

The allowed lobby event values are deliberately bounded:

| Property | Allowed values |
|---|---|
| `method` / `operation` | `create`, `join`, `reconnect` |
| `reason` | `invalid-invite`, `admission-limit`, `daily-limit`, `rate-limited`, `security`, `connection` |
| `map` | Current public map id |
| `withSavedTargets` | Boolean creation option; it does not report target count or contents |

Presence updates, roster changes, WebSocket heartbeats, shared-state batches, acknowledgements, drawing changes and pointer movement do not generate lobby analytics events.

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

Lobby events never include the invite or room code, owner key, player name, roster, coordinates, room contents, or recovery data. Failures are reduced to a small allowlist of categories instead of reporting raw server errors.

This keeps event payloads small and avoids generating excessive event-data usage. High-frequency actions such as point placement, preset-target selection, map/weapon switching, map panning, cursor movement, mouse movement, and pinch/wheel zoom are deliberately not tracked as standalone custom events.

The sampled calculation signal provides map/weapon usage context without recording every interaction. Lower-volume actions such as saved-target transfer, completed map drawings, zones and polygons, ruler use, map-style changes, Terrain3D/contour toggles, donation/partner clicks, feedback and lobby lifecycle actions continue to be recorded because their event volume is comparatively small and their action counts remain useful.

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
