# Analytics

The project uses hosted [GoatCounter](https://www.goatcounter.com/) for pageviews,
referrers and bounded feature-usage events. The endpoint is
`https://wardogs-artillery.goatcounter.com/count`; no API token belongs in the client.

## Production tracker scope

Desktop, mobile, localized and map landing pages load `js/core/analytics-loader.js`
asynchronously. It checks the hostname before loading `https://gc.zgo.at/count.js`.
Only `wardogs-artillery.com` is enabled by default. Local copies, GitHub Pages
mirrors and forks do not load the hosted tracker or submit data to this account.

The remote tracker uses `no_onload` and `no_events`. After the document is ready,
the loader sends exactly one pageview using the actual pathname, including
mobile and language routes. Page and referrer query strings/fragments are
excluded. Hash navigation, selecting a map, changing points and recalculating
do not generate additional pageviews. Automatic click binding is disabled to
avoid double-counting application handlers.

The loader also wraps the tracker's `url()` method to remove its automatic `q`
query payload. Supplying a clean `path` alone would still upload `location.search`.
This applies to both beacon delivery and the image fallback.

The hostname guard prevents accidental reporting by updated copies. It is not
authentication: public JavaScript can be changed by third parties. Previously
published copies of the old integration cannot be changed by this patch.

## Custom events

Features call `trackAnalytics(name, data)` in `js/core/analytics.js`. Only known
event names are accepted. The wrapper derives a short path from allowlisted
values and never uploads the original data object as event properties.
GoatCounter receives `path`, the same path as `title`, `event: true`, an empty
event referrer and the event's session-counting policy.

| Event path | Meaning |
| --- | --- |
| `calculation/bakurani/spg` | SPH-2 calculation adoption on Bakurani |
| `donation-click/boosty` | Click on the Boosty link |
| `donation-click/ko-fi` | Click on the Ko-fi link |
| `map-style-changed/ozeti/color` | Color map style selected |
| `contours-toggle/zestafona/on` | Contours enabled |
| `asset-access-failed/bakurani/403` | Asset access returned an allowlisted HTTP status |
| `lobby-connected/bakurani/create` | Successful lobby creation |
| `feedback-sent/bug` | Bug feedback accepted; the message is excluded |

Saved-target actions, coordinate search, fire adjustment, completed Map Tools
actions, map-data import/export, mobile desktop switching and lobby lifecycle
actions retain their names. Context suffixes use only public map ids, weapon
ids, styles, donation services, feedback types, toggle states, lobby methods,
bounded failure categories and selected HTTP statuses.

## Event budget and sampling

- `calculation` is sampled in **20% of browser-tab sessions**. The first rendered
  solution is a baseline. A changed solution must remain stable for 900 ms;
  each map/weapon context is counted once in a selected session.
- Most other paths are counted once per browser-tab session. `sessionStorage`
  holds at most 128 deduplication entries. Coarse loading/error signals follow
  this policy too, preventing failed tiles and changing error messages from
  generating a flood.
- `donation-click`, `partner-click`, `feedback-sent`, `lobby-connected` and
  `lobby-left` count completed actions with a two-second cooldown per path.
  These use `no_session: true`; adoption events use normal session deduplication.
- At most 16 paths wait for the tracker, for up to 30 seconds. Custom sends
  are spaced at least 750 ms apart.
- Per-frame, pointer, panning, zooming and per-shot tracking are absent.
  Former `origin-placed`, `target-placed`, `preset-marker-selected`, `map-changed`,
  `weapon-changed` and `lcp-slow-*` events are ignored.

Blocked or unavailable analytics cannot interrupt maps, calculations, lobbies
or feedback. Counts can differ from the previous provider because sampling,
deduplication and visitor/session definitions differ.

## Performance and operational telemetry

GoatCounter does not replace the old built-in Core Web Vitals dataset. Detailed
performance measurements, stack traces, source locations, build ids and firing
diagnostics are not uploaded as analytics properties. Existing developer
diagnostics and explicit copy/export actions remain available.

Resource errors from third-party scripts, Cloudflare challenges/instrumentation
and the analytics tracker are ignored. Application failures produce only bounded
event paths, without raw error messages or unique failure hashes.

## v1.8 lobby telemetry

Lobby events measure adoption and completed connection outcomes, not room
activity. Connection methods are `create`, `join` and `reconnect`. Failure
categories are `invalid-invite`, `admission-limit`, `daily-limit`, `rate-limited`,
`security` and `connection`. Presence, edits, shared-state batches and WebSocket
heartbeats are not tracked.

## Privacy

Application payloads exclude coordinates, MIL, hull headings, terrain heights,
saved-target names/content, drawing geometry, marker positions, room codes,
owner keys, player names, feedback messages/contacts, imported files, error
messages and localStorage contents. Tab storage contains bounded event paths
and a random sampling bucket; the application creates no persistent visitor id.

GoatCounter sees ordinary connection metadata, including IP and browser headers,
while serving requests. See its [privacy policy](https://www.goatcounter.com/help/privacy).
Ad blockers and network filtering may prevent collection.

## Development analytics switch

`npm run dev` removes the loader and sets
`window.__WARDOGS_ANALYTICS_DISABLED__ = true` by default. Local static builds
also remain untracked because both loader and wrapper check the hostname.

To briefly test against the production analytics account:

```powershell
$env:WARDOGS_DISABLE_ANALYTICS = "false"
npm run dev
```

The development server sets `window.__WARDOGS_ANALYTICS_ALLOW_LOCAL__ = true`;
only loopback hosts can use this explicit exception. Restore the default with:

```powershell
Remove-Item Env:WARDOGS_DISABLE_ANALYTICS
```

## Deployment and verification

1. Run `npm run check` and deploy `dist/`.
2. On the official site, check the Network panel for `gc.zgo.at/count.js` and
   `wardogs-artillery.goatcounter.com/count`. There should be no requests to the
   old analytics provider.
3. Click a donation provider link and check its event path in GoatCounter.
   Temporarily disable an analytics-blocking extension for this verification.
4. A local static copy should send no hosted analytics requests.

Generated CSP allows `https://gc.zgo.at` in `script-src` and
`https://wardogs-artillery.goatcounter.com/count` in `connect-src` and `img-src`.
The latter permits the tracker fallback when `sendBeacon` is unavailable. Update a
separate hosting/Cloudflare CSP response header too, if present: a meta policy
cannot relax a stricter HTTP header.

This patch replaces future collection. It does not import historical data or
cancel the previous paid account. Keep the exported data and manage that
subscription separately to prevent further billing.
