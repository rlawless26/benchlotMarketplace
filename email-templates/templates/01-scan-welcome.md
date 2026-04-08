# Template 1: Scan Welcome

**ID:** `01-scan-welcome`
**Provider:** Resend
**Priority:** P0 — highest. Anchors the scan-to-save acquisition funnel.

## Trigger

User enters email on `/scan` results page → pending account created → tool auto-saved to Tool Chest.

## Subject lines

- **Primary:** `Your {{toolName}} has been identified`
- **Fallback:** `Your tool has been identified — here's what it's worth`

## Variables

| Variable | Type | Example |
|---|---|---|
| `{{toolName}}` | string | `Stanley No. 4 Smoothing Plane` |
| `{{maker}}` | string | `Stanley` |
| `{{model}}` | string | `No. 4` |
| `{{era}}` | string | `1948-1961` |
| `{{condition}}` | string | `Good` |
| `{{valueLow}}` | string (formatted) | `$45` |
| `{{valueHigh}}` | string (formatted) | `$75` |
| `{{confidence}}` | string | `High` |
| `{{scanPageUrl}}` | url | `https://benchlot.com/scan` |
| `{{setPasswordUrl}}` | url | Firebase password reset link |

## Body copy

```
Hi there,

We identified your tool:

[TOOL SUMMARY CARD — Bone background, bordered]
{{toolName}}
{{maker}} · {{model}} · {{era}}
Condition: {{condition}}
Estimated value: {{valueLow}} – {{valueHigh}}
Confidence: {{confidence}}

It's saved in your Tool Chest on Benchlot.

[PRIMARY CTA: "Scan Another Tool" → {{scanPageUrl}}]

When Benchlot's marketplace goes live, you'll be able to list this tool for sale with one click. We'll let you know when it's time.

In the meantime, you can set up your account password anytime:
[SECONDARY LINK: "Set Your Password" → {{setPasswordUrl}}]

— Rob, Benchlot

P.S. Got more tools? The scanner works on bench planes, chisels, hand saws, spokeshaves, and more. The more you scan, the more your Tool Chest is worth.
```

## Notes

- This email does triple duty: scan result delivery, account activation, waitlist confirmation.
- The P.S. is the multi-scan behavioral lever — critical for estate sellers with whole collections.
- "— Rob, Benchlot" is intentional. Founder-direct.
- Tool summary card should render as a Bone-background card inside the main white content card.
