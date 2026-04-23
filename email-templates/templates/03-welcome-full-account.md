# Template 3: Welcome (Full Account Creation)

**ID:** `03-welcome-full-account`
**Provider:** Resend
**Priority:** P4 — nice to have. Existing signup flow works without it.
**Status:** Marketplace-flavored copy below is pre-pivot. M0 left the runtime JS template untouched (low send volume in aggregator mode). Full rewrite to aggregator positioning is scoped into M4 (public launch readiness).

## Trigger

User creates a full account via `/auth` (email + password signup).

## Subject line

`Welcome to Benchlot`

## Variables

| Variable | Type | Example |
|---|---|---|
| `{{displayName}}` | string | `Rob` (falls back gracefully if empty) |
| `{{homeUrl}}` | url | `https://benchlot.com/` (M4 replaces `marketplaceUrl`) |
| `{{scanUrl}}` | url | `https://benchlot.com/scan` |
| `{{listToolUrl}}` | url | Marketplace-only. Unused in aggregator mode. |

## Body copy (pre-pivot, superseded by M4 rewrite)

```
{{displayName}},

Welcome to Benchlot — the woodworker's marketplace.

Here's what you can do right now:

Browse the marketplace → See what's listed
[LINK: {{marketplaceUrl}}]

Scan a tool → Get an instant ID and value estimate from a photo
[LINK: {{scanUrl}}]

List a tool for sale → Takes about 5 minutes, no listing fees
[LINK: {{listToolUrl}}]

We're early and growing. If you have feedback, ideas, or just want to talk shop, reply to this email.

— Rob, Benchlot
```

## Notes

- If `{{displayName}}` is empty, drop the first line entirely (don't print "undefined,").
- Founder-voice sign-off.
- **M4 rewrite TODO:** drop the "List a Tool" CTA, replace with "Save your first search" CTA pointing to the aggregator home. Ship aligned with the public launch copy pass.
