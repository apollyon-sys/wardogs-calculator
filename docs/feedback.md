# Anonymous feedback

The website feedback form submits a small, bounded report to the existing Cloudflare Worker at `/feedback`. The Worker forwards accepted reports to a Discord webhook.

## Privacy

The report contains:

- report type (`bug` or `feature`);
- the text entered by the user;
- optional contact text, only when the user fills it in;
- page path, language, map, weapon and app version;
- UI type, browser family, OS family and a viewport rounded to the nearest 100 px.

It does **not** send saved targets, artillery/target coordinates, drawing geometry, lobby codes, localStorage contents, raw user-agent strings or the visitor IP to Discord or Umami.

Cloudflare necessarily sees the source IP while serving the request. The Worker uses it only as the key for the `FEEDBACK_RATE` rate-limit binding and does not persist it in application storage.

Umami receives only coarse lifecycle events:

- `feedback-opened`;
- `feedback-sent` with `type`;
- `feedback-failed` with `type` and a bounded reason.

The feedback message and optional contact are never sent to Umami.

## Production setup

Create a Discord webhook in the channel where reports should arrive, then store its URL as a Worker secret:

```powershell
cd sync
npx wrangler login
npx wrangler secret put FEEDBACK_DISCORD_WEBHOOK_URL
```

Paste the complete Discord webhook URL when Wrangler prompts. Never put the webhook URL in `wrangler.jsonc`, `.dev.vars.example`, `config/app.json` or any committed file.

Then verify and deploy:

```powershell
npm ci
npm test
npx wrangler deploy --dry-run
npm run deploy
```

The feedback endpoint deliberately works independently of `ROOM_SECRET` and `LOBBIES_DISABLED`. The site-side switch is `feedback.enabled` in `config/app.json`.

For an emergency backend-only stop, set:

```powershell
npx wrangler secret put FEEDBACK_DISABLED
```

and enter `true`. Remove the variable in the Cloudflare dashboard (or with the corresponding Wrangler secret delete command) to re-enable the endpoint.

If `FEEDBACK_DISCORD_WEBHOOK_URL` is missing or invalid, `/feedback` returns `503 feedback-not-configured`.

## Local development

`sync/.dev.vars.example` enables `FEEDBACK_DEV_SINK=true`, so local submissions return success without contacting Discord.

Run:

```powershell
# terminal 1
npm run dev

# terminal 2
cd sync
npm ci
npm run dev
```

The production Worker has a separate `FEEDBACK_RATE` binding, currently limited to five submissions per minute per Cloudflare rate-limit key. This prevents feedback spam from consuming the lobby `ENTRY_RATE` budget.
