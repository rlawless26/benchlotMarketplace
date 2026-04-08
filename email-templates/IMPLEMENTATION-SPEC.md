# Benchlot Email System — Implementation Spec

**Audience:** Claude Code, working in `github.com/rlawless3/benchlot-app`
**Companion:** The copy for every template lives in `email-templates/templates/*.md`. Read the copy file for each template before implementing it. Read `email-templates/shared/email-design-system.md` before building the HTML shell.
**Out of scope for this spec:** Template 2 (Waitlist Reactivation) — Rob builds that directly in HubSpot using `email-templates/hubspot/02-waitlist-reactivation.md`. Do not build it in code.

---

## 1. Problem

Benchlot has no transactional email infrastructure. Users who scan a tool, publish a listing, place an order, make an offer, or message another user get no email notification. This breaks three critical flows:

1. **Scan-to-save funnel** — users who scan a tool on `/scan` enter an email but never get their result, breaking the acquisition loop.
2. **Seller activation** — sellers publish listings with incomplete Stripe Connect onboarding and silently fail to get paid.
3. **Transactional trust** — buyers and sellers have no receipts, shipping updates, or offer notifications, which kills marketplace trust on day one.

The controlled launch cannot ship without this.

## 2. Goals

1. Every Resend-owned template (1, 3–10) in the copy folder is implemented as a Cloud Function-triggered email, firing on the documented event.
2. All emails use a single shared HTML shell matching `shared/email-design-system.md` (brand tokens, typography, CTA styles).
3. Template 1 (Scan Welcome) and Template 4 (Listing Published with Stripe warning) are live and tested end-to-end — these are the P0 controlled-launch gates.
4. Email sending is observable: every send is logged, failures are retried, and opens/clicks are tracked where Resend supports it.
5. Local development can send test emails without hitting real users.

## 3. Non-goals

- **Template 2 (Waitlist Reactivation).** Built in HubSpot by Rob. Do not wire into Resend.
- **Marketing broadcasts, digests, newsletters.** Resend is for transactional only. Marketing lives in HubSpot.
- **Full i18n.** English only for v1.
- **Inbox rendering QA across every email client.** Test against Gmail, Apple Mail, and Outlook web. Dark mode nice-to-have, not blocking.
- **Custom tracking domain / DKIM setup beyond what Resend requires.** Use Resend defaults on the verified `benchlot.com` domain.
- **In-app notification system.** Email only. In-app notifications are a separate workstream driven by the existing `useNotifications` hook.

## 4. Architecture

### 4.1 Provider

**Resend.** Not SendGrid. Install `resend` in `/functions/package.json`.

Environment variables (Firebase Functions config):
- `RESEND_API_KEY` — Resend API key
- `RESEND_FROM_ADDRESS` — default `hello@benchlot.com`
- `RESEND_REPLY_TO` — default `rob@benchlot.com`
- `BENCHLOT_BASE_URL` — `https://benchlot.com` in prod, localhost in dev
- `EMAIL_DRY_RUN` — if `true`, log the email payload instead of sending (local dev + CI)

Set via `firebase functions:config:set resend.api_key=...` or env file, whichever pattern the repo already uses. Check `/functions/index.js` for the existing config convention and match it.

### 4.2 Directory layout

Create a new `email/` module inside `/functions`:

```
/functions/
├── index.js
├── email/
│   ├── index.js               ← entry: sendEmail(templateId, to, vars)
│   ├── client.js              ← Resend client singleton, dry-run support, retry/logging
│   ├── render.js              ← Handlebars compile + render helpers
│   ├── shell.js               ← shared HTML shell (header, footer, container)
│   ├── tokens.js              ← brand tokens (spruce, bone, honey, etc.) as JS constants
│   ├── templates/
│   │   ├── 01-scan-welcome.js
│   │   ├── 03-welcome-full-account.js
│   │   ├── 04-listing-published.js
│   │   ├── 05-order-confirmation-buyer.js
│   │   ├── 06-new-order-seller.js
│   │   ├── 07-shipping-confirmation.js
│   │   ├── 08-offer-notification.js
│   │   ├── 09-offer-status-update.js
│   │   └── 10-message-notification.js
│   └── __tests__/
│       └── render.test.js
```

Each template file exports:

```js
module.exports = {
  id: '04-listing-published',
  subject: (vars) => `Your listing is live: ${vars.toolTitle}`,
  render: (vars) => ({ html, text }),   // returns both HTML and plaintext
};
```

`email/index.js` exposes a single public API:

```js
async function sendEmail({ templateId, to, vars, replyTo }) { ... }
```

This is the only function other parts of the codebase should call.

### 4.3 HTML shell

Build once in `email/shell.js`. It wraps every template's body content. It must match `shared/email-design-system.md` exactly:

- Background: Bone `#f2f0eb`
- Content card: `#ffffff`, `1px solid #e5e3de`, `max-width: 600px`, centered, `32px` padding
- Header: Benchlot wordmark (hosted SVG URL — TODO, paste URL once hosted), 40px height, linked to `https://benchlot.com`
- Footer: Spruce text on Bone, tagline "The woodworker's marketplace.", unsubscribe link, physical address
- Primary CTA: Honey `#d4aa60` bg, Dark Teal `#0c1c1e` text, 16px Outfit bold, 48px, radius 8px, full-width on mobile
- Secondary CTA: underlined Spruce text link
- Inline content cards (tool/listing/order): Bone bg, `1px solid #e5e3de`, 20px padding, radius 8px
- Fonts: `'Outfit', Arial, Helvetica, sans-serif` for body, `'Petrona', Georgia, serif` for display, loaded via Google Fonts with web-safe fallbacks
- All CSS **inline** on elements. Do not use `<style>` blocks or external stylesheets — email clients strip them.
- Single-column, mobile-responsive, 600px max-width.

Export a shell helper:

```js
function renderShell({ preheader, bodyHtml }) { ... }
```

Templates compose their body HTML and pass it to the shell.

### 4.4 Template variables

Every variable list in each `templates/XX-*.md` copy file is the contract. Do not add or rename variables. If a variable needs a formatter (currency, address), do it in the template file's `render` function using a helper from `email/render.js`, not at the call site.

Use Handlebars-compatible `{{variableName}}` syntax. You can either compile with Handlebars or use template literals — Handlebars is safer for conditional blocks like the Stripe warning in Template 4 and the three-branch offer status in Template 9.

### 4.5 Plaintext fallback

Every template must return both `html` and `text`. The plaintext version is a stripped-down rendering of the same content — preserve the CTA URLs as bare links. Resend sends both; clients that block HTML still get a readable message.

---

## 5. Trigger wiring

For each template, wire the trigger in the specified location. All triggers live in Cloud Functions. Use Firestore `onCreate` / `onUpdate` triggers where possible; use Express endpoints only for flows that are already HTTP-driven (e.g., Stripe webhook).

| # | Template | Trigger | Where to wire |
|---|---|---|---|
| 1 | Scan Welcome | `/scan` page POST creates a pending user + saves tool to Tool Chest | Cloud Function triggered by new `users/{uid}` doc with `source: 'scan'`, or called directly from the existing scan API endpoint. Pull scan result from the `tools/{toolId}` doc. |
| 3 | Welcome (Full Account) | User creates full account via `/auth` signup | `onCreate` trigger on `users/{uid}` when `source !== 'scan'`. Skip if a scan welcome already went to this email. |
| 4 | Listing Published | Tool status → `active` | `onUpdate` trigger on `tools/{toolId}` firing when `before.status !== 'active' && after.status === 'active'`. Look up the seller's Stripe Connect status from `users/{uid}.stripeConnect.status`. Pass `stripeStatus: 'incomplete'` if not `charges_enabled`. |
| 5 | Order Confirmation (Buyer) | Stripe payment succeeds, order created | Existing Stripe webhook handler. Fire after order doc is written to `orders/{orderId}`. |
| 6 | New Order (Seller) | Same trigger as #5 | Same webhook handler. Send in parallel with #5. |
| 7 | Shipping Confirmation | Seller adds tracking to order | `onUpdate` trigger on `orders/{orderId}` when `trackingNumber` goes from empty → set. |
| 8 | Offer Notification (Seller) | Buyer submits offer | `onCreate` trigger on `offers/{offerId}`. Pull seller + tool details. |
| 9 | Offer Status Update (Buyer) | Seller responds to offer | `onUpdate` trigger on `offers/{offerId}` when `status` changes. Branch on `accepted` / `countered` / `declined`. |
| 10 | Message Notification | New message in conversation | `onCreate` trigger on `conversations/{id}/messages/{mid}`. **Throttle:** before sending, check `conversations/{id}.lastEmailAt[recipientUid]`. If < 60 minutes ago, skip. On send, update that field. |

For each trigger, the code path is:
1. Read the event payload.
2. Fetch any additional data needed (user display name, tool image URL, formatted prices).
3. Build the `vars` object matching the template's variable list.
4. Call `sendEmail({ templateId, to, vars })`.
5. Log the result to `email_log/{autoId}` (see §7).

---

## 6. Requirements

### P0 — Must have for controlled launch

- [ ] Resend SDK installed and configured with env vars
- [ ] Shared HTML shell implemented and matches design system
- [ ] `sendEmail()` public API with dry-run support
- [ ] Template 1 (Scan Welcome) implemented and wired to scan flow
- [ ] Template 4 (Listing Published) implemented, wired, and the Stripe incomplete conditional renders correctly
- [ ] Template 5 (Order Confirmation Buyer) implemented and wired
- [ ] Template 6 (New Order Seller) implemented and wired
- [ ] Every P0 template tested end-to-end against a real inbox (Gmail + Apple Mail minimum)
- [ ] `email_log` collection written on every send attempt (success + failure)
- [ ] Failures retry with exponential backoff up to 3 attempts
- [ ] Dry-run mode works locally and in CI (no emails actually sent)

### P1 — Fast follow after launch

- [ ] Template 3 (Welcome Full Account)
- [ ] Template 7 (Shipping Confirmation)
- [ ] Template 8 (Offer Notification)
- [ ] Template 9 (Offer Status Update) with all three branches
- [ ] Template 10 (Message Notification) with 1-hour throttle
- [ ] Unsubscribe link is functional — maps to a `users/{uid}.emailPreferences` doc and suppresses non-critical emails (transactional receipts like order/shipping are never suppressed)
- [ ] Admin view in Firestore or a simple React admin page showing recent `email_log` entries

### P2 — Future, design to support

- [ ] Template-level open/click tracking surfaced in an admin dashboard
- [ ] Per-user email preference granularity (offers on/off, messages on/off)
- [ ] Internationalization-ready variable system (locale-keyed subject lines)
- [ ] Batched digest mode for high-frequency events (e.g., daily message summary)

---

## 7. Observability

Every `sendEmail` call writes a document to `email_log`:

```
email_log/{autoId} {
  templateId: string,
  to: string,
  subject: string,
  vars: object,            // snapshotted for debug
  status: 'queued' | 'sent' | 'failed' | 'dry-run',
  resendMessageId: string, // if sent
  error: string,           // if failed
  attempts: number,
  createdAt: timestamp,
  sentAt: timestamp,
}
```

Log the key fields to Cloud Functions logs too, so they're visible in Firebase Console without querying Firestore.

On failure: exponential backoff, 3 attempts max (1s, 5s, 30s). After the third failure, mark `status: 'failed'` and log an error. Do not block the caller — email sending is fire-and-forget from the trigger's perspective.

---

## 8. Testing

### Unit tests (`email/__tests__/render.test.js`)

- Each template renders without errors given a representative `vars` object
- Subject line includes the expected variable interpolation
- Template 4 with `stripeStatus: 'complete'` does NOT render the warning block
- Template 4 with `stripeStatus: 'incomplete'` DOES render the warning block
- Template 9 renders the correct body for each of `accepted` / `countered` / `declined`
- HTML output contains the expected CTA URLs
- Plaintext output contains the same CTA URLs as bare strings

### Integration tests

- `sendEmail()` in dry-run mode returns `{ status: 'dry-run' }` without hitting Resend
- `sendEmail()` writes an `email_log` entry in all modes
- Throttling for Template 10: two sends within 60 minutes → second is skipped and logged

### Manual QA (before shipping P0)

- Trigger each P0 email against your own inbox in a staging environment
- Verify rendering in Gmail (web), Apple Mail (macOS), Outlook (web)
- Verify all CTAs link to the correct environment (staging URLs, not prod)
- Verify the Benchlot wordmark loads
- Verify mobile rendering — viewport simulation or real device
- For Template 4: publish a listing with incomplete Stripe onboarding and confirm the warning block renders and links work

---

## 9. Open questions

| Question | Owner | Blocking? |
|---|---|---|
| Where is the Benchlot wordmark SVG hosted? Need a CDN URL to embed in the email header. | Rob | Yes — blocks shell finalization |
| Is `hello@benchlot.com` verified in Resend? If not, need to complete domain verification first. | Rob | Yes — blocks any real send |
| Does the existing Stripe webhook handler already write orders to `orders/{orderId}`? If not, where? | Eng | Yes — blocks Templates 5 and 6 |
| What's the canonical user display name field? `displayName`, `firstName`, or split? | Eng | No — can use fallback chain |
| Should offer expiration be 48 hours (Template 8) and 72 hours (accepted in Template 9)? Is that enforced in backend? | Rob | No — copy can stay as-is, enforce backend later |
| Physical address for CAN-SPAM footer? | Rob | Yes — legally required on every email |
| Do we want Resend webhooks for delivery/open/click events written back to `email_log`? | Rob | No — P2 |

---

## 10. Success metrics

**Leading (first 2 weeks post-launch):**
- ≥ 99% delivery rate (sent successfully, no Resend errors)
- Template 1 (Scan Welcome) open rate ≥ 50% — validates the scan-to-save loop
- Template 4 with `stripeStatus: 'incomplete'` → ≥ 60% of recipients click the "Set Up Payouts" CTA within 24 hours
- Zero `email_log` entries with `status: 'failed'` after 3 retries

**Lagging (first 4 weeks):**
- % of scan users who return and scan a second tool (P.S. in Template 1 is the lever)
- % of sellers with completed Stripe onboarding at time of first listing (Template 4 warning working)
- Zero support tickets about "I didn't get an email"

---

## 11. Implementation order

Build in this order. Do not start Step N+1 until Step N is tested and working.

1. Scaffold `/functions/email/` directory, install Resend, wire env config
2. Build `tokens.js`, `shell.js`, `render.js`, `client.js` with dry-run support
3. Write the unit test harness and a dummy template to validate the pipeline
4. **Template 1 (Scan Welcome)** — implement, wire, test, ship
5. **Template 4 (Listing Published)** — implement, wire, test the Stripe conditional, ship
6. **Templates 5 and 6 (Order emails)** — implement as a pair in the Stripe webhook, test, ship
7. Templates 3, 7, 8, 9, 10 in that order as P1 fast follows
8. P2 items only after P0 + P1 are shipped and stable

---

## 12. File reference

Before starting, read these files from the `email-templates/` folder accompanying this spec:

- `README.md` — overview and provider split
- `shared/email-design-system.md` — brand tokens, shell spec, CTA styles
- `templates/01-scan-welcome.md` through `templates/10-message-notification.md` — copy, variables, subject lines, conditional logic, notes

The copy files are the single source of truth for body content. This spec is the single source of truth for implementation. If they conflict, fix the conflict by asking Rob — do not guess.
