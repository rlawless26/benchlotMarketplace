# eBay integration setup

eBay's Browse API is the target for the eBay aggregator source. Once your
Developer Program application is approved you get a set of credentials;
paste them into `functions/.env` (gitignored) under the exact variable names
below, then redeploy functions.

## What you got from eBay

The Developer Program portal shows **two environments** (Sandbox + Production)
and for each you have:

| eBay label | What it's for |
|---|---|
| **App ID (Client ID)** | Public identifier for your app |
| **Dev ID** | Your developer account id |
| **Cert ID (Client Secret)** | Signing secret — treat like a password |
| *(optional)* RuName / Redirect URI | Only for user-auth flows; not needed for public Browse API |

We only need the Production set — eBay's sandbox inventory is thin and
sparsely populated with real tool listings.

## Where to paste them

Open `functions/.env` (not tracked in git — safe for secrets) and append:

```env
# --- eBay Browse API ---
EBAY_APP_ID=<paste App ID / Client ID>
EBAY_DEV_ID=<paste Dev ID>
EBAY_CERT_ID=<paste Cert ID / Client Secret>

# eBay issues app-level OAuth tokens with a 2-hour TTL. We mint them on
# demand via the Client Credentials grant and cache in memory; no long-lived
# refresh token needed. Leave this blank — the scraper populates it at runtime.
EBAY_OAUTH_TOKEN=
```

Then redeploy:

```bash
firebase deploy --only functions
```

Firebase picks up `.env` automatically at deploy time (see `firebase.json` → `functions` → its env loading). The scraper will read
`process.env.EBAY_APP_ID` etc. at runtime.

## What the scraper will do (once wired)

Not built yet — just the setup surface. When implemented:

1. Use Client Credentials grant (`grant_type=client_credentials` with scope
   `https://api.ebay.com/oauth/api_scope`) to mint an app-level access token.
2. Hit `/buy/browse/v1/item_summary/search` with category filters for tools
   (category_ids `631` Tools, `12576` Hand Tools, `3247` Power Tools, etc.)
3. Normalize each item into the `externalListings` schema (see `SCHEMA.md`).
4. Upsert through the same pipeline as Jim Bode / Hyperkitten / Sawmill
   Creek / Woodnet: `externalListings/ebay__<itemId>` docs, raw payloads in
   `externalListingsRaw`, normalizer trigger fires on-write.
5. Cron slot reserved at `30 3 * * *` UTC (same slot as Woodnet — will move
   Woodnet to `45 3 * * *` once the chain expands).

## Verifying the creds once pasted

Quick smoke test you can run locally (no write to Firestore):

```bash
cd functions
node -e "
const fetch = require('node-fetch');
const id = process.env.EBAY_APP_ID;
const sec = process.env.EBAY_CERT_ID;
const basic = Buffer.from(\`\${id}:\${sec}\`).toString('base64');
fetch('https://api.ebay.com/identity/v1/oauth2/token', {
  method: 'POST',
  headers: {
    'Authorization': \`Basic \${basic}\`,
    'Content-Type': 'application/x-www-form-urlencoded',
  },
  body: 'grant_type=client_credentials&scope=https%3A%2F%2Fapi.ebay.com%2Foauth%2Fapi_scope',
}).then(r => r.json()).then(j => console.log(j.access_token ? '✓ token minted, expires in ' + j.expires_in + 's' : '✗ ' + JSON.stringify(j)));
"
```

Expected output: `✓ token minted, expires in 7200s`. If it errors with
`invalid_client`, the App ID / Cert ID pair is wrong or the app isn't
approved for Production yet.

## ToS notes (for later, once scraping starts)

- eBay's Developer Program license governs use. The key requirement: don't
  cache `price` / `availability` beyond 24h per their public APIs terms. Our
  nightly scrape + `last_seen_at`-driven expiry satisfies this naturally.
- Rate limits for the Browse API are generous at app-level (~5000 calls/day
  for most endpoints). A nightly scrape of tool categories is well under.
- Attribution: every listing links back to its eBay URL (same as our other
  sources). No re-hosting of images required — eBay CDN URLs work directly.

## Re-enabling Resend

Orthogonal note: emails are currently muted via `EMAIL_DRY_RUN=true` in
`functions/.env`. Flip to `false` (or remove the line) and redeploy when
you want Resend sends back on.
