# Reddit integration setup

Reddit is the 7th aggregator source on Benchlot. Pulls public sale posts from
woodworking-tool subreddits via Reddit's App-Only OAuth (Application-Only
Client Credentials grant) — no personal Reddit account credentials, just an
app registered on a developer account.

## Subreddits indexed

| Subreddit | Detection mode | Notes |
|---|---|---|
| **r/handtools** (~186k subs) | Title keywords | Sellers post one consolidated `WTS` post per the sub's rules. ~5–10 sales/week. |
| **r/AntiqueToolBroker** (~820 subs) | `link_flair_text === 'For Sale'` | Tiny but pure-signal. Pro / dealer sellers redirected here from r/handtools. |

Skipped in v1: r/woodworking (sales banned in big general subs), r/galoots / r/Tools_For_Sale / r/handplanes (don't exist as subreddits), r/workbenches (build-focused).

## What you need to do once (Reddit-side)

1. **Get API access**. Reddit added a Responsible Builder Policy gate in 2023. Submit the API access request at [https://support.reddithelp.com/hc/en-us/requests/new](https://support.reddithelp.com/hc/en-us/requests/new) (form linked from the API wiki) — pick "I'm a developer and want to build a Reddit App that does not work in the Devvit ecosystem." Honest answer: non-commercial / personal hobby aggregator that drives traffic *to* Reddit (every clickthrough lands on the original Reddit thread). Approval is usually same-day.

2. **Create an app** at [https://www.reddit.com/prefs/apps](https://www.reddit.com/prefs/apps) once approved:

| Field | Value |
|---|---|
| **name** | `Benchlot` |
| **type** | `web app` (NOT `script` — script type's canonical OAuth flow uses your Reddit username + password; web app uses the cleaner Client Credentials grant we want) |
| **description** | Aggregator that indexes used woodworking tool listings. |
| **about url** | `https://benchlot.com` |
| **redirect uri** | `https://benchlot.com/reddit-callback` (required field but App-Only flow never uses it; any valid URL works) |

After creating, Reddit shows two values you need:
- 14-character ID just under the app name → `REDDIT_CLIENT_ID`
- Longer string labeled "secret" → `REDDIT_CLIENT_SECRET`

## Where to paste them

Open `functions/.env` (gitignored — safe for secrets) and fill the three slots already in place:

```env
REDDIT_CLIENT_ID=<14-char id from the app>
REDDIT_CLIENT_SECRET=<longer secret string>
REDDIT_USERNAME=<your Reddit username, no /u/ prefix>
```

`REDDIT_USERNAME` goes into the User-Agent string per Reddit API rules: `Benchlot/1.0 by /u/<username>`. Reddit will throttle or block any client that doesn't include a descriptive UA with developer attribution.

Then redeploy:

```bash
firebase deploy --only functions
```

## Verifying the credentials

Smoke test the OAuth token mint without writing anything to Firestore:

```bash
cd functions
set -a; source .env; set +a
curl -X POST https://www.reddit.com/api/v1/access_token \
  -H "Authorization: Basic $(printf '%s' "$REDDIT_CLIENT_ID:$REDDIT_CLIENT_SECRET" | base64)" \
  -H "User-Agent: Benchlot/1.0 by /u/$REDDIT_USERNAME" \
  -d "grant_type=client_credentials"
```

Expected output:

```json
{"access_token":"<long-bearer-token>","token_type":"bearer","expires_in":86400,"scope":"*"}
```

If you get `{"error":"invalid_client"}`, the client_id / client_secret pair is wrong (mistyped or app type is wrong). If you get an HTML response with a captcha challenge, your User-Agent is missing or generic — Reddit aggressively serves HTML to bot-like requests.

## What the scraper does once wired

1. Mints an App-Only Bearer token via Client Credentials grant (24h TTL, in-memory cache, never persisted).
2. Walks `/r/<sub>/new.json` paginated for each bucket (1-second delay between pages, capped per bucket: 12 pages for r/handtools, 5 for r/AntiqueToolBroker).
3. Filters posts by sale-detection rules — title-keyword regex for r/handtools, flair-based for r/AntiqueToolBroker. Skip patterns (`WTB`, `ISO`, `[SOLD]`, etc.) take precedence.
4. For posts new to our index, fetches full thread JSON (`/r/<sub>/comments/<id>.json`) for the canonical untruncated selftext + media gallery.
5. Maps each post into the `externalListings` schema (see `functions/ingest/SCHEMA.md`).
6. Standard upsert + touch-known + markExpired sweep, identical to the Sawmill Creek / Woodnet adapters.

Cron slot: `35 3 * * *` UTC nightly, in the chain between Woodnet (03:30) and Hyperkitten (03:45).

## PII hygiene

We do **not** persist Reddit user-identifiable fields:

- `author`, `author_fullname`, `author_flair_text`, `author_premium`
- `subreddit_subscribers`, `subreddit_id`

Source attribution on the UI surfaces "via r/handtools" — never an author handle. Rationale: Reddit accounts are user-deletable, and we have no clean way to track and clean up listings if a user deletes. Defensive posture mirrors the eBay Marketplace Account Deletion exemption commitment, even though Reddit doesn't have an equivalent compliance framework.

`run-reddit.js` includes a `piiCheck()` assertion that fails the scraper run if any of those fields appear in the serialized listing or raw payload.

## ToS notes

- Reddit's [Data API Terms](https://www.redditinc.com/policies/data-api-terms) cover this use case. Free tier is 60 requests/min OAuth — our nightly runs use ~30 calls total, well under quota.
- We attribute every listing back to its Reddit permalink — clickthroughs always land on the original Reddit thread. No re-hosting of post content; images use Reddit's CDN URLs (`i.redd.it`, `preview.redd.it`).
- Reddit's API rules require a descriptive User-Agent with developer attribution. The `REDDIT_USERNAME` env var feeds the UA string `Benchlot/1.0 by /u/<username>`.
- We don't post, vote, comment, or moderate. Read-only consumption only.

## Local development reference

```bash
# Smoke-test creds + dry-run on a small slice
cd functions
set -a; source .env; set +a
node ingest/run-reddit.js --dry-run --bucket handtools --max-pages 2
node ingest/run-reddit.js --dry-run --bucket AntiqueToolBroker

# Small live write (writes to Firestore, no expiry sweep)
node ingest/run-reddit.js --max-new 5

# Full nightly equivalent
node ingest/run-reddit.js
```

The `run-reddit.js` `--dry-run` flag prints per-bucket stats (pages walked, posts scanned, candidates surviving filter), heuristic brand/type distribution, null-price / zero-image counts, and the PII audit.
