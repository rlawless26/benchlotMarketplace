# Template 3: Welcome (Full Account Creation)

**ID:** `03-welcome-full-account`
**Provider:** Resend
**Priority:** P4 — nice to have. Existing signup flow works without it.

## Trigger

User creates a full account via `/auth` (email + password signup).

## Subject line

`Welcome to Benchlot`

## Variables

| Variable | Type | Example |
|---|---|---|
| `{{displayName}}` | string | `Rob` (falls back gracefully if empty) |
| `{{marketplaceUrl}}` | url | `https://benchlot.com/marketplace` |
| `{{scanUrl}}` | url | `https://benchlot.com/scan` |
| `{{listToolUrl}}` | url | `https://benchlot.com/seller/onboard-and-list` |

## Body copy

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
