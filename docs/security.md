# Security hardening

## Threat model

The repository is public. Treat every URL, protocol message, validation rule,
limit and client-side check as known to an attacker. Security must come from
server-side validation, unguessable or signed credentials, Cloudflare bindings
and strict cost ceilings—not from hidden JavaScript or undocumented paths.

The browser is untrusted. It never receives `ROOM_SECRET`, `TURNSTILE_SECRET`
or R2 write credentials. The Turnstile site key is intentionally public.

## Controls implemented in the repository

- Production room creation requires a Turnstile token verified by the Worker.
  The Worker checks success, hostname and action, then returns a short-lived,
  IP-bound HMAC admission. One admission has its own configurable room cap.
- Production and development origins are separate. Local origins are accepted
  only with the explicit local `LOBBIES_DEV=true` flag.
- Every production HTTP path requires configured rate-limit bindings. Creation,
  challenge exchange and joins have separate keys and limits in addition to the
  global application budgets.
- Signed room invitations are verified before a Durable Object is opened.
  Invalid paths therefore cannot create arbitrary room objects.
- Documents and changes are normalized and checked against the server's map and
  marker catalog. Coordinates, sizes, collection counts, operation counts,
  messages and stored documents are bounded.
- Full snapshots are sent only when a WebSocket joins. Duplicate or rejected
  edits receive small messages, preventing error-driven snapshot amplification.
- Player names use Unicode normalization and remove control/format characters.
  Duplicate visible names receive a short participant-ID suffix.
- `workers.dev` and preview endpoints are disabled; production uses only the
  custom Worker domain. Worker observability remains off so invitation-bearing
  request paths are not intentionally copied into application logs.
- Production HTML receives a restrictive CSP at build time. It allowlists only
  the site, R2 asset host, lobby endpoint, the Umami tracker at
  `https://cloud.umami.is`, its event endpoint at `https://gateway.umami.is`,
  and Turnstile. Inline event handlers, plugins, arbitrary frames and
  unexpected network destinations are blocked.
- The local development server binds to loopback by default, validates `Host`,
  serves only public application paths and rejects symlink escapes.
- JSON imports are rejected before reading files larger than 1 MiB.
- CI actions are pinned to full commits. Pull requests run tests, dependency
  audit, production build verification and a Worker dry run. Dependabot tracks
  both npm projects and GitHub Actions.

## Cloudflare response headers

The generated CSP works as a `<meta http-equiv>` policy, but `frame-ancestors`
is valid only in an HTTP response header. In the Cloudflare zone, create a
**Transform Rule → Modify Response Header** restricted to the application host
(`http.host eq "wardogs-artillery.com"`) and set:

| Header | Value |
| --- | --- |
| `Content-Security-Policy` | `frame-ancestors 'none'` |
| `X-Frame-Options` | `DENY` |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `no-referrer` |
| `Permissions-Policy` | `camera=(), geolocation=(), microphone=()` |
| `Strict-Transport-Security` | `max-age=31536000` |

Add `includeSubDomains` to HSTS only after confirming that every current and
future subdomain is HTTPS. Do not request browser preload until that condition
is permanent. Keep the rule scoped to the site host; the Worker already emits
API-specific headers and R2 needs its own CORS/cache policy.

Verify after deployment:

```powershell
curl.exe -I "https://wardogs-artillery.com/"
```

## Cloudflare and GitHub settings

1. Keep the Worker custom domain proxied and `workers_dev=false`.
2. Keep R2 API tokens scoped to the one bucket and only the operations needed
   by the upload process. Never put an R2 token in site configuration or CI
   logs. Rotate any token that has ever been committed or pasted publicly.
3. Keep R2 CORS limited to real site origins plus the exact local origin used
   for development. CORS reduces browser misuse; it is not access control.
4. In the GitHub repository, enable secret scanning and push protection where
   available. Protect `main`: require a pull request, require the Security
   checks workflow, block force pushes and block branch deletion.
5. Do not enable Cloudflare Access on the public lobby endpoint; it would block
   ordinary users. The application-level admission and room invitation are the
   relevant controls.

Test origin enforcement against the custom domain:

```powershell
$workerUrl = "https://lobby.wardogs-artillery.com"
curl.exe -i -H "Origin: https://some-fork.example" "$workerUrl/"
curl.exe -i -H "Origin: https://wardogs-artillery.com" "$workerUrl/"
```

The first request must be `403 forbidden-origin`; the second should reach the
router and return `404 not-found`. A successful CORS response alone is not proof
of authorization—the signed invitation and server admission checks provide the
actual protection.

## Secrets and incident response

- `ROOM_SECRET` signs invitations and creation admissions. Rotating it
  invalidates all current invitation/admission tokens. Do this after suspected
  disclosure, then ask participants to create new rooms.
- `TURNSTILE_SECRET` can be rotated independently in the Turnstile dashboard
  and with `npx wrangler secret put TURNSTILE_SECRET`.
- `LOBBIES_DISABLED=true` is the emergency kill switch. It overrides repository
  configuration and stops creation and connections while an incident is
  investigated.
- Revoke and replace compromised R2 tokens, review Cloudflare usage, and check
  Git history—not only the current tree—before considering a leaked credential
  removed.

## Remaining limitations

- A room invitation is a bearer credential. Anyone who receives it can join and
  edit until it expires; there are no user accounts or per-member permissions.
- Turnstile and rate limits increase abuse cost but cannot prove a human is
  benign. Global budgets intentionally prefer a temporary service stop over an
  unbounded bill.
- Files needed by a public browser—including R2 map tiles and terrain data—can
  be downloaded by users and forks. CORS, obscure paths and disabled bucket
  listing do not make public assets confidential. Preventing redistribution
  requires licensing/enforcement or an authenticated paid delivery design,
  which would add cost and still cannot stop an authorized client from copying.
  This technical limitation does not grant permission to use the CDN or hosted
  assets in another project; see [CDN & hosted assets](cdn.md).
- The [asset delivery service](assets-gateway.md) applies automated access
  controls against direct hotlinking and bulk retrieval. These controls raise
  the cost of unsophisticated automation but cannot prevent a legitimate user
  saving resources already displayed by their browser.
- Production analytics loads the remote script from `https://cloud.umami.is`
  and allows event delivery to `https://gateway.umami.is`. The script executes
  with page privileges, so a compromise remains a supply-chain risk despite
  CSP. Self-hosting a reviewed, pinned bundle or disabling analytics is the way
  to remove that dependency. See [Analytics](analytics.md) for the event payload
  and privacy policy.
