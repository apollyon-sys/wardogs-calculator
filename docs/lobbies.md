# Collaborative lobbies

Collaborative lobbies synchronise pencil drawings, zones, polygons and user markers. A room can optionally start with the creator's saved targets. The map is fixed for the room, while every participant keeps a personal artillery point, target and selected weapon. Teammates see each other's labelled artillery-to-target overlays, but only the owner sees their weapon range circles. Camera position, zoom, active tool, layer visibility, point locks, theme and language remain local.

The feature can be disabled without removing code. When disabled, its browser runtime is not loaded, no lobby menu is rendered and no request is sent to the sync service. Production room creation fails closed until both Cloudflare Turnstile keys are configured; joining an existing signed invitation does not require a challenge.

The implementation was informed by the prototype in [Crecket's `feat/collab-rooms` branch](https://github.com/Crecket/wardogs-calculator/tree/feat/collab-rooms). This version uses an independent operation-based protocol, conflict checks, hibernating WebSockets and explicit resource limits.

## Configuration

All product limits live in `config/app.json` under `collab`:

| Setting | Default | Effect |
| --- | ---: | --- |
| `enabled` | `true` | Master switch used by both the site and Worker |
| `serverUrl` | custom lobby domain | Deployed Worker URL; an empty value also prevents browser loading |
| `maxParticipants` | `8` | Concurrent WebSockets allowed in one room, server-enforced (1–32) |
| `roomLifetimeHours` | `6` | Fixed room lifetime (1–24); activity does not extend it |
| `maxRoomsPerDay` | `250` | Global UTC-day room creation budget |
| `maxChangeBatchesPerDay` | `20000` | Global UTC-day accepted change batches |
| `maxChangeBatchesPerRoom` | `1000` | Accepted change batches in one room |
| `batchDelayMs` | `300` | Browser batching and presence delay (clamped to 0.25–5 seconds) |
| `allowedOrigins` | canonical site | Exact production browser origins allowed by the Worker |
| `developmentOrigins` | local port 8000 | Origins added only when the Worker runs with `LOBBIES_DEV=true` |
| `maxRoomsPerAdmission` | `3` | Rooms that one validated Turnstile admission may create |
| `admissionLifetimeMinutes` | `30` | Lifetime of an IP-bound signed admission token (5–120 minutes) |
| `maxInvalidMessages` | `5` | Invalid WebSocket messages before the server closes the client |
| `turnstile.enabled` | `true` | Require a server-validated challenge for production room creation |
| `turnstile.siteKey` | empty | Public Turnstile site key used by the browser |
| `turnstile.hostname` | canonical host | Exact hostname required in the verified Turnstile result |
| `turnstile.action` | `create-lobby` | Exact action required in the verified Turnstile result |

The Worker imports this file at build time. After changing a server-enforced limit or `enabled`, deploy the Worker again. Rebuild and deploy the static site after changing browser settings.

For an emergency stop, set the Worker environment variable `LOBBIES_DISABLED` to `true` in the Cloudflare dashboard. This overrides `enabled: true`. Also set `enabled` to `false` in the repository and deploy both parts when the incident is over.

## First deployment

Prerequisites: a Cloudflare account, Node.js 22 or newer and the existing static-site deployment.

1. In Cloudflare, create a **Turnstile / Managed** widget. Allow only `wardogs-artillery.com` (and any other hostname that really serves the app). Copy its public **site key** to `collab.turnstile.siteKey`; keep its **secret key** out of the repository.
2. Keep only real production origins in `allowedOrigins`. Origins contain the scheme and host, but no path or trailing slash. Localhost belongs only in `developmentOrigins`.
3. Confirm that `collab.serverUrl` is `https://lobby.wardogs-artillery.com`, `collab.enabled` is `true`, and the custom domain in `sync/wrangler.jsonc` matches it.
4. Open a terminal in `sync` and install the pinned dependencies:

   ```powershell
   npm ci
   npx wrangler login
   ```

5. On the first deployment only, generate the room-signing secret locally. Do not post it, commit it or reuse a password:

   ```powershell
   $roomSecret = node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   $roomSecret | npx wrangler secret put ROOM_SECRET
   Remove-Variable roomSecret
   ```

   If the Worker is already deployed, keep its existing `ROOM_SECRET`. Rotating it immediately invalidates every current invitation.

6. Store the Turnstile secret. Wrangler prompts for the value; paste the secret from the widget:

   ```powershell
   npx wrangler secret put TURNSTILE_SECRET
   ```

7. Run verification and deploy the Worker:

   ```powershell
   npm test
   npm audit --audit-level=high
   npx wrangler deploy --dry-run
   npm run deploy
   ```

8. From the repository root, run `npm ci`, `npm run build`, `npm run test:build`, then deploy the generated `dist` site.

This update changes both the browser protocol and Worker admission flow. For a controlled rollout, temporarily set the already supported `LOBBIES_DISABLED=true` kill switch, deploy the Worker and site, then remove the kill switch. Existing participants must reload and create or join a new room. No new Durable Object class or `ROOM_SECRET` rotation is required.

The first deployment creates two SQLite-backed Durable Object classes via the migration in `sync/wrangler.jsonc`. The four rate-limit namespace numbers (`73101`–`73104`) only need to be unique within the Cloudflare account; change them if another Worker already uses one. Production fails closed if a binding is missing. `workers.dev` and preview URLs are disabled; the intended public endpoint is the custom domain only.

## Local test

Create `sync/.dev.vars` from `.dev.vars.example` and replace its placeholder secret. Keep this file local. Set the site config temporarily to:

```json
"enabled": true,
"serverUrl": "http://localhost:8799"
```

Then run the two processes:

```powershell
# terminal 1, repository root
npm run dev

# terminal 2
cd sync
npm ci
npm run dev
```

Open `http://localhost:8000`. Restore the production URL (or disable the feature) before committing.

`npm run dev` starts Wrangler with `LOBBIES_DEV=true`. Only in that mode are `developmentOrigins` accepted, Turnstile is bypassed and missing rate-limit bindings tolerated. Never set `LOBBIES_DEV=true` in a deployed Worker.

## Cost controls and 4,000 daily visitors

Page views do not create lobby traffic. A visitor contacts the Worker only after pressing Create or Join. Changes are sent after a gesture finishes and are coalesced for the configured delay; cursors, pointer movement, camera movement and layer changes are never synchronised. Personal artillery and target positions are ephemeral WebSocket presence data: they disappear when a participant disconnects and do not consume the durable room-change quota. WebSockets use Durable Object hibernation and their one-minute ping/pong is configured as an automatic response.

The defaults are deliberately conservative:

- At most 250 new rooms and 20,000 accepted edit batches can be created per UTC day.
- Each room stores one current document, has a six-hour fixed lifetime and writes one row per accepted batch.
- Daily write credits are reserved in groups of 32. This saves global budget writes but can leave some reserved credits unused; therefore the cap may stop slightly below 20,000 actual edits.
- A room document is limited to 96 KiB, with separate limits for drawings and other objects. Messages, operations and coordinates are validated server-side.
- Signed, expiring invitation codes are checked before a room object is opened. Production creation additionally requires a Turnstile result verified by the Worker; the resulting short-lived admission is bound to the requesting IP and can create only the configured number of rooms.
- Per-IP entry/create/challenge/join rate limits, per-admission caps and per-socket message limits reduce cheap abuse. Global application budgets remain a final cost ceiling.
- Duplicate, stale and invalid edits receive small acknowledgement/rejection messages. A full room snapshot is sent only on connection, so malformed messages cannot be used as a snapshot-amplification primitive.

With 4,000 visits/day, cost depends on lobby adoption rather than page views. For example, 10% adoption with 30 edit batches per participant is about 12,000 edit batches/day and fits the application cap. If every visitor uses a lobby for 10 batches, demand is about 40,000 and the application will stop accepting edits at 20,000. These are planning examples, not a billing guarantee; inspect Cloudflare usage during the beta before raising limits.

Cloudflare's current Free-plan limits and billing model can change. Before launch, verify the official [Durable Objects pricing](https://developers.cloudflare.com/durable-objects/platform/pricing/), [WebSocket hibernation guidance](https://developers.cloudflare.com/durable-objects/best-practices/websockets/) and [Workers rate-limit binding documentation](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/).

## Behaviour and recovery

- Anyone holding an invitation can edit; this is a shared secret, not account authentication.
- Artillery position, active target and selected weapon are personal. Other connected participants receive only the two labelled positions; their range circles are never rendered.
- Player positions live only in WebSocket attachments. They are not stored in the room document or recovery export and disappear when that player disconnects.
- Only the creating browser receives the owner key that can close the room for everyone. It is held in memory and is lost on reload.
- The URL fragment `#room=...` prefills the menu but never auto-joins. This keeps navigation, reloads and analytics from silently opening connections.
- There is no automatic reconnect. After a disconnect, editing is frozen until the user explicitly reconnects or leaves.
- Rejected/unconfirmed local work can be downloaded from the menu as `wardogs-lobby-recovery.json`.
- Entering a room takes an in-memory backup of the personal workspace. Leaving restores the original map, weapon, points, drawings, saved targets, camera and history. Room data is not written to personal `localStorage`.

## Analytics and privacy

The site records only low-volume lobby lifecycle events: first panel open, successful create/join/reconnect, coarse connection failures, unexpected disconnects, explicit leave, successful invite copy and recovery export. Events contain only a fixed event name and, where applicable, an allowlisted map id, connection method or failure category. These are short event-path suffixes; no separate event-property payload is uploaded.

Nicknames, invitation codes, owner keys, participant rosters, artillery or target coordinates, room documents, shared drawings, presence messages, recovery contents, WebSocket heartbeats and edit batches are never sent to GoatCounter. See [Analytics](analytics.md#v18-lobby-telemetry) for the exact event and payload contract.

## Verification

From `sync`:

```powershell
npm ci
npm test
npx wrangler deploy --dry-run
```

From the repository root:

```powershell
npm run build
npm run test:build
npm run test:scripts
```

The suite covers validation limits, signed invitations, create/join/cap/close flows in a local Workers runtime, ephemeral player presence, labelled no-range peer rendering, concurrent annotation edits, safe undo, browser batching, disconnect behaviour and personal-state restoration.

See [Security hardening](security.md) for the public-source threat model, Cloudflare response headers, repository settings, secret rotation and remaining limitations.
