# Protected Asset Gateway

The optional asset gateway puts the map tile and Terrain3D bucket behind a
Cloudflare Worker. Direct R2 access can then be disabled. The official browser
receives a short-lived, signed, `HttpOnly` session cookie after a Turnstile
check; map and terrain requests are authenticated and rate-limited by that
session before the Worker reads R2.

This design is intended to stop direct hotlinking and inexpensive bulk scripts.
It does not make browser-visible game assets confidential and cannot prevent an
admitted user from saving responses that their browser is allowed to display.

## Request flow

1. The application requests `POST https://assets.wardogs-artillery.com/__session`.
2. The Worker validates the Turnstile token, hostname, action and request
   origin.
3. The Worker sets a signed `__Host-wardogs_asset_session` cookie. The cookie is
   bound to the requesting IP address and User-Agent and expires after 20
   minutes by default.
4. Tile and Terrain3D requests use credentialed CORS. The Worker verifies the
   cookie, applies session and IP rate limits, and serves the object from cache
   or the private R2 binding.
5. The cookie is removed from the edge cache key, so all admitted users share
   the same cached object instead of creating one cache entry per session.

Turnstile is attempted before creating every new standard session. Countries
listed in `FALLBACK_COUNTRIES` may receive a more tightly rate-limited
restricted session if Turnstile is unavailable. The repository default is
`CN,RU`; the initial session probe lets their clients skip the blocked
Turnstile script instead of waiting for a network timeout. Use an empty value
to fail closed everywhere.

## Cost model

The gateway requires the Workers Paid plan. At the time this integration was
written, the plan had a USD 5 monthly minimum, included 10 million Worker
requests per month, and charged USD 0.30 per additional million requests.
Worker requests served from the Worker cache are still counted, while cache
hits avoid R2 `GetObject` operations.

Estimate the request volume from Cloudflare HTTP traffic for
`assets.wardogs-artillery.com`, not from the R2 operation chart. The latter
normally contains only requests that reached the bucket after caching.

## Files

```text
assets-gateway/
├── src/
│   ├── config.mjs
│   ├── index.mjs
│   ├── tokens.mjs
│   └── turnstile.mjs
├── test/
├── .dev.vars.example
├── package.json
└── wrangler.jsonc
```

The browser adapter is `js/core/asset-access.js`. Gateway configuration is in
`config/app.json`.

## 1. Enable Workers Paid

In the Cloudflare dashboard, open **Workers & Pages**, select the Workers Paid
plan and confirm the USD 5 monthly subscription. R2 billing remains separate.

Before continuing, create billing notifications for at least two thresholds,
for example USD 10 and USD 20. A paid Worker has usage-based overage billing;
the subscription price is not a hard spending cap.

## 2. Create an invisible Turnstile widget

Open **Turnstile** in the Cloudflare dashboard and create a widget with:

```text
Name:       WARDOGS Asset Gateway
Hostname:   wardogs-artillery.com
Mode:       Invisible
```

Copy both values:

- the public site key goes into `config/app.json`;
- the secret key is stored only as a Worker secret.

Use a separate widget from the lobby widget. The asset client renders this
widget invisibly with the action `asset-session`. Turnstile tokens are always
validated server-side and cannot be reused as asset-session cookies.

## 3. Review Worker configuration

Open `assets-gateway/wrangler.jsonc` and verify:

```jsonc
"bucket_name": "wardogs-assets"
```

It must exactly match the existing R2 bucket name.

Review these variables:

```jsonc
"ALLOWED_ORIGINS": "https://wardogs-artillery.com",
"DEVELOPMENT_ORIGINS": "http://localhost:8000,http://127.0.0.1:8000",
"PROTECTED_PREFIX": "/releases/assets-v1/",
"ENFORCE_SESSIONS": "false",
"SESSION_LIFETIME_SECONDS": "1200",
"TURNSTILE_HOSTNAME": "wardogs-artillery.com",
"TURNSTILE_ACTION": "asset-session",
"FALLBACK_COUNTRIES": "CN,RU",
"EDGE_CACHE_SECONDS": "2592000"
```

`ENFORCE_SESSIONS` intentionally starts as `false`. This temporary migration
mode allows requests from the configured official origin while the new browser
client is being deployed. Do not leave migration mode enabled after validation.

The default limits are:

| Binding | Limit | Purpose |
| --- | ---: | --- |
| `SESSION_RATE` | 60/minute/IP | Session probing and creation |
| `ASSET_SESSION_RATE` | 1000/minute/session | Normal browser session |
| `ASSET_RESTRICTED_RATE` | 240/minute/session | Regional fallback session |
| `ASSET_IP_RATE` | 3000/minute/IP | High emergency backstop across sessions |

The `namespace_id` values `73201` through `73204` are intentionally different
from the lobby Worker namespaces in this repository. If those numbers are
already used by another Worker in the same Cloudflare account, replace them
with four other unique positive integers before deployment.

The main limit is keyed by a random signed session, not only by IP. This avoids
blocking several ordinary players behind the same NAT. The IP limit is
deliberately much higher and exists only to contain session churn.

Worker rate-limit counters are local to the Cloudflare location handling the
request and are intentionally eventually consistent. Treat them as abuse
containment rather than exact accounting.

If normal browsers receive `429`, increase `ASSET_SESSION_RATE` first. Do not
reduce limits based only on a single short traffic spike.

## 4. Install and test locally

From the repository root:

```powershell
cd .\assets-gateway
npm ci
npm test
npx wrangler login
```

For local Worker development, copy the example environment file:

```powershell
Copy-Item .dev.vars.example .dev.vars
```

`.dev.vars` is ignored by Git. `ASSETS_DEV=true`, supplied by the `npm run dev`
script, disables the Turnstile requirement and permits the configured local
origins. Never deploy a production Worker with `ASSETS_DEV=true`.

Run:

```powershell
npm run dev
```

The unit tests use an in-memory R2 mock. Testing real R2 reads locally requires
a Wrangler development binding with access to the bucket; it is not necessary
for the deployment sequence below.

## 5. Prepare Worker secrets

Generate at least 48 random bytes for the session signing secret. In Windows
PowerShell:

```powershell
$bytes = New-Object byte[] 48
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$rng.GetBytes($bytes)
[Convert]::ToBase64String($bytes)
$rng.Dispose()
```

Create `assets-gateway/.env.production` locally with these two lines:

```dotenv
SESSION_SECRET=PASTE_THE_GENERATED_VALUE
TURNSTILE_SECRET=PASTE_THE_ASSET_WIDGET_SECRET
```

The repository already ignores `.env.production`. Keep a secure copy of both
values in your password manager. The file is used once during cutover so the
Worker code and both secrets are deployed together; this avoids an intermediate
deployment that is missing one of the secrets.

Do not place either secret in `wrangler.jsonc`, `config/app.json`, `.dev.vars.example`,
GitHub Actions output, screenshots or Git history. The Turnstile site key is
public and belongs in application configuration; the secret key does not.

## 6. Prepare the browser configuration

Edit `config/app.json` but do not deploy the site yet:

```json
"assetGateway": {
  "enabled": true,
  "origin": "https://assets.wardogs-artillery.com",
  "sessionPath": "/__session",
  "turnstile": {
    "enabled": true,
    "siteKey": "PASTE_THE_PUBLIC_ASSET_WIDGET_SITE_KEY",
    "action": "asset-session"
  }
}
```

The client will:

- reuse an existing valid cookie after reload;
- execute the invisible challenge only when a new session is needed;
- refresh the session shortly before expiration;
- retry Terrain3D once after an authentication failure;
- use `crossOrigin="use-credentials"` for protected map images.

Keep `enabled` set to `false` until the Worker serves the CDN hostname.

## 7. Cut over the CDN hostname

The R2 bucket and Worker cannot both own the same Custom Domain. Minimize the
transition by preparing the terminal and Worker configuration first.

1. Confirm `ENFORCE_SESSIONS` is still `false`.
2. In **R2 Object Storage → wardogs-assets → Settings**, locate **Custom
   Domains** and remove `assets.wardogs-artillery.com` from the bucket.
3. Keep the `r2.dev` development URL disabled.
4. Immediately deploy the Worker:

```powershell
cd .\assets-gateway
npx wrangler deploy --secrets-file .env.production
```

The `custom_domain` route in `wrangler.jsonc` attaches
`assets.wardogs-artillery.com` to the Worker. The Worker reads the same bucket
through its `ASSETS` R2 binding; no public bucket URL is required.

After the deploy succeeds, delete the temporary file:

```powershell
Remove-Item .env.production
```

While migration mode is active, verify an existing tile:

```powershell
$url = "https://assets.wardogs-artillery.com/releases/assets-v1/maps/tiles-color/bakurani/zoom_7/116_94.webp"

curl.exe -sS -D - -o NUL `
  -H "Origin: https://wardogs-artillery.com" `
  $url
```

Expected output includes:

```text
HTTP/2 200
X-Wardogs-Asset-Access: migration
```

A missing or foreign Origin should still be blocked by the WAF or Worker.

## 8. Deploy the authenticated browser client

Set `assetGateway.enabled` to `true`, insert the public Turnstile site key, then
run the full application checks:

```powershell
cd ..
npm ci
npm run check
```

Deploy the generated site normally. Open the production application in a clean
browser profile and inspect DevTools → Network:

1. `POST https://assets.wardogs-artillery.com/__session` returns `201`.
2. Its response contains `Set-Cookie: __Host-wardogs_asset_session=...`.
3. Tile requests contain the session cookie and return `200`.
4. Tile responses contain `X-Wardogs-Asset-Access: restricted` or `standard`.
5. Selecting SPH-2 loads the Terrain3D manifest and `.bin` chunks successfully.
6. Canvas screenshots/export continue to work; there must be no tainted-canvas
   error.

Test desktop, mobile, all three maps, both map styles and SPH-2 before enforcing
sessions.

## 9. Enable enforcement

Change this value in `assets-gateway/wrangler.jsonc`:

```jsonc
"ENFORCE_SESSIONS": "true"
```

Deploy again:

```powershell
cd .\assets-gateway
npx wrangler deploy
```

Verify that a forged Origin alone no longer grants access:

```powershell
curl.exe -sS -o NUL -w "%{http_code}`n" `
  -H "Origin: https://wardogs-artillery.com" `
  $url
```

Without the signed cookie, the result must be:

```text
401
```

The real browser session must still receive `200` responses with
`X-Wardogs-Asset-Access: standard` (or `restricted` in the configured fallback
countries).

## 10. Cloudflare WAF rules

Keep the method/query rule unchanged:

```text
(
  http.host eq "assets.wardogs-artillery.com"
  and starts_with(http.request.uri.path, "/releases/assets-v1/")
  and (
    not (http.request.method in {"GET" "HEAD"})
    or http.request.uri.query ne ""
  )
)
```

Use action **Block**.

Tighten the origin rule by removing the `Referer` exception:

```text
(
  http.host eq "assets.wardogs-artillery.com"
  and starts_with(http.request.uri.path, "/releases/assets-v1/")
  and not any(
    http.request.headers["origin"][*] eq
    "https://wardogs-artillery.com"
  )
)
```

Use action **Block**. This WAF rule is only an inexpensive pre-filter. The
signed Worker session is the authentication boundary, so spoofing `Origin`
does not grant access.

Do not apply either expression to `/__session`; that route needs `POST` and is
validated separately by the Worker.

Disable the old broad asset rate-limiting rule after Worker enforcement is
verified. The Worker limits normal and restricted sessions independently and
does not combine unrelated players behind one IP except at the high emergency
backstop.

## Monitoring

Check these views after cutover:

- **Workers & Pages → wardogs-assets-gateway → Metrics** for requests, errors
  and CPU time;
- **Workers Logs** for sampled `401`, `403`, `429` and `5xx` responses;
- **R2 → wardogs-assets → Metrics** for Class A/B operations;
- **Security → Events** for WAF blocks;
- Turnstile Analytics for challenge success, failure and top source IPs.

The Worker deliberately logs unexpected exceptions, not valid session cookies
or Turnstile tokens. Never add cookies, request bodies or secrets to production
logs.

Useful response meanings:

| Status | Meaning |
| ---: | --- |
| `200` | Authenticated asset delivered |
| `201` | New browser session created |
| `401` | Missing, expired, modified or differently bound cookie |
| `403` | Origin or Turnstile validation failed |
| `404` | Path is outside the allowlisted prefix or object is absent |
| `429` | Session, fallback or IP limit reached |
| `503` | Missing secret/binding or temporary upstream failure |

## Emergency rollback

If legitimate maps fail after enforcement:

1. Change `ENFORCE_SESSIONS` back to `false` and deploy the Worker. This is the
   fastest recovery and keeps the bucket private.
2. Investigate Worker logs, Turnstile Analytics and browser cookie/CORS errors.
3. If the Worker itself must be removed, deploy the site with
   `assetGateway.enabled=false`, detach the Worker Custom Domain, and reattach
   `assets.wardogs-artillery.com` to the R2 bucket.
4. Restore the strict Origin and method/query WAF rules after the public R2
   custom domain is reattached.

Migration mode is a temporary availability control, not permanent protection.
Return `ENFORCE_SESSIONS` to `true` after fixing the incident.

## Secret rotation

Rotate `SESSION_SECRET` if session signing material may have leaked:

```powershell
npx wrangler secret put SESSION_SECRET
npx wrangler deploy
```

All existing asset sessions become invalid and browsers automatically request
new ones. Rotate `TURNSTILE_SECRET` independently in the Turnstile dashboard
and Worker secrets if that key may have leaked.
