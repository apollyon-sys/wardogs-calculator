# Anonymous feedback

The website feedback form submits a small, bounded report to the existing Cloudflare Worker at `/feedback`. The Worker forwards accepted reports to a Discord webhook.

## Privacy

The report contains:

- report type (`bug`, `feature` or `general`);
- a 1–5 star rating for `general` feedback;
- the text entered by the user;
- optional contact text, only when the user fills it in;
- page path, language, map, weapon and app version;
- UI type, browser family, OS family and a viewport rounded to the nearest 100 px.

It does **not** send saved targets, artillery/target coordinates, drawing geometry, lobby codes, localStorage contents, raw user-agent strings or the visitor IP in application payloads sent to Discord or GoatCounter.

Cloudflare necessarily sees the source IP while serving the request. The Worker uses it only as the key for the `FEEDBACK_RATE` rate-limit binding and does not persist it in application storage.

GoatCounter receives only coarse lifecycle events:

- `feedback-opened`;
- `feedback-sent/<type>`;
- `feedback-failed/<type>`.

The feedback message, rating and optional contact are never sent to GoatCounter.

## Production setup

Create a Discord webhook in the channel where reports should arrive, then store its URL as a Worker secret:

```powershell
cd sync
npx wrangler login
npx wrangler secret put FEEDBACK_DISCORD_WEBHOOK_URL
npx wrangler secret put FEEDBACK_ABUSE_SECRET
```

Paste the complete Discord webhook URL for the first command. For
`FEEDBACK_ABUSE_SECRET`, enter a random value of at least 32 characters. It is
used only to derive non-reversible sender and message identifiers; never commit
the production value. Never put either secret in `wrangler.jsonc`,
`.dev.vars.example`, `config/app.json` or another committed file.

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

The production Worker has a separate `FEEDBACK_RATE` binding limited to two
submissions per minute per Cloudflare rate-limit key. A dedicated
`FeedbackGuard` then applies a privacy-preserving rolling policy per derived
sender:

- at least 30 seconds between accepted reports;
- no more than three accepted reports per hour and ten per 24 hours;
- duplicate message text is suppressed for 24 hours;
- repeated rejections or a rolling-limit violation mute the sender for 24 hours.

Filtered submissions receive the same success response as accepted feedback,
so an abusive client cannot probe the thresholds. Discord messages include a
12-character anonymous sender ID, but neither Discord nor Durable Object
storage receives the raw IP. Durable Object storage contains only timestamps
and keyed message digests and is removed after the retention window.

To block a sender ID shown in Discord manually, store a comma-separated list:

```powershell
npx wrangler secret put FEEDBACK_BLOCKED_SENDERS
```

Run the command again with the updated complete list when adding or removing an
ID. Delete the secret when the list is empty.
