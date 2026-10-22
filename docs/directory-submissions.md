# Getting agents to call Benchlot: directory submissions

The MCP server at `https://benchlot.com/mcp` is the product; the two
directories below are how ChatGPT and Claude users find it without pasting a
URL. Web search already reads the guide pages and llms.txt (ChatGPT cited
them unprompted on 2026-10-21); the directories are what make an assistant
*call* the data instead of quoting a page.

Prepared 2026-10-21. Code-side prerequisites are done on branch
`directory-submissions`: explicit `readOnlyHint` / `destructiveHint` /
`openWorldHint` and an `outputSchema` on all six tools, `identify_tool` and
`create_alert` open to anonymous callers (5 scans per 15 min per IP without a
key; alerts rely on double opt-in), the `/.well-known/openai-apps-challenge`
route, and the plugin package in `chatgpt-plugin/`.

## Claude Connectors Directory (do this first: it is self-serve)

Portal: https://claude.ai/directory/manage → **Submit new** → **MCP connector**.
Any paid Claude plan can submit. Anthropic scans the submission automatically
and lists it as a *Community connector* by default; some get a human review.

Steps the portal walks through, with what to enter:

1. **Connection**: `https://benchlot.com/mcp`.
2. **Tools**: auto-synced. All six carry `title`, `readOnlyHint`,
   `destructiveHint`; the portal should flag nothing.
3. **Listing**: name "Benchlot" (≤100 chars); one-liner (≤200):
   *What used woodworking tools actually sell for: recorded sale prices,
   live listings and photo identification, from dealers, forums and
   marketplaces.* Description (≤2000): reuse `longDescription` from
   `chatgpt-plugin/plugin.json`. Categories: Shopping, Research. The slug
   is permanent.
4. **Use cases** (at least three): the three `defaultPrompt` strings in
   `plugin.json`, plus "Where does Benchlot's price data come from?"
5. **Company**: Benchlot, rob@benchlot.com, https://benchlot.com.
6. **Authentication**: *No authentication* (public data).
7. **Data handling**: privacy policy https://benchlot.com/privacy, data-use
   policy https://benchlot.com/developers/policy. Collected: route, status,
   latency, salted IP hash; photos sent to identify are stored as the scan
   feature already does; alert addresses only with the alert, confirmed by
   email. No request bodies logged.
8. **Test & launch**: no account, so no test credentials.
9. **Compliance**: seven acknowledgments. Note for the "generates images,
   video or audio" exclusion: `identify_tool` *analyses* photos, it does
   not generate media. No money moves, no ads.

Escalations: mcp-review@anthropic.com.

## ChatGPT plugin directory

Portal: https://platform.openai.com/plugins → **Upload new or existing
plugin**. Submissions are a ZIP; `scripts/build-chatgpt-plugin.sh` writes
`dist/benchlot-chatgpt-plugin.zip` from `chatgpt-plugin/`.

Before uploading:

1. **Verify the organisation** at
   https://platform.openai.com/settings/organization/general (individual or
   business). Required for any submission.
2. **Record a demo** (reviewer-accessible video URL): Developer-mode
   connector enabled, run the five positive prompts below, show the answers
   citing benchlot.com. Put the URL in `plugin.json` →
   `extensions.com.openai.review.demo_recording_url` (currently a placeholder;
   the build script warns).
3. **Build the ZIP**: `sh scripts/build-chatgpt-plugin.sh`.

In the portal:

4. **Upload**, choose the verified developer identity.
5. **MCPs** → connect `https://benchlot.com/mcp`, auth *none*. The portal
   shows a **challenge token**; set it as `OPENAI_APPS_CHALLENGE` on the
   benchlot-web Vercel project (Production), redeploy, and confirm
   `curl https://benchlot.com/.well-known/openai-apps-challenge` returns the
   exact token. Then let the portal scan the tools.
6. **Metadata & Skills**: read the automated findings. The manifest field
   nesting in `plugin.json` follows OpenAI's docs as of 2026-10-21; if the
   validator renames a field, fix it in the file and re-zip rather than in
   the portal, so the repo stays the source.
7. **Review details** → Save. **Submit for review** → policy attestations.
   Feedback arrives by email; appeal by reply. Only one version per org can
   be in review at a time.
8. After approval, **Publish plugin**.

Things reviewers reject, and why Benchlot is on the right side:
promotional tool descriptions (ours are factual and name limitations);
apps that merely relay another service (own dataset, own methodology);
tools that always fail (both write tools now work without a key).

### Test cases (also in plugin.json)

Positive (exactly five):

| Prompt | Tool | Expected |
|---|---|---|
| What does a Stanley No. 4 plane sell for? | get_price_guide | median ≈ $118 from 268 sales, high confidence, guide link, "via Benchlot" |
| Is $450 a fair price for a Lie-Nielsen No. 7 jointer plane? | get_price_guide | compares to quartiles, or says insufficient evidence and offers suggestions; never invents a median |
| Find Disston hand saws for sale right now under $60 | search_listings | rows with price, source, direct link; notes stale eBay prices |
| How much is a millers falls brace worth? | search_price_guide → get_price_guide | resolves spelling, median with count and confidence |
| Where does Benchlot's price data come from and how complete is it? | get_coverage | sources, coverage share, thresholds, "not a marketplace" |

Negative (exactly three): banana bread recipe; new-tool retail price of a
Festool Domino; value of a 1998 Honda Civic. None should call a tool.

## What to watch after listing

The PostHog "API" dashboard (id 2242870) splits requests by `surface`;
directory traffic shows up as `mcp` with a client user agent in
`api_requests.user_agent`. Expect `identify_tool` to dominate p95 latency.
If anonymous scans get abused, `ANON_SCANS_PER_WINDOW` in
`web/lib/api/services.ts` is the dial.
