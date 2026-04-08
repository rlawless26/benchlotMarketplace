# Template 4: Listing Published (Seller Confirmation)

**ID:** `04-listing-published`
**Provider:** Resend
**Priority:** P1 — critical for seller confidence, especially the Stripe payout warning.

## Trigger

Tool status changes to `active` (first image uploaded after publish).

## Subject line

`Your listing is live: {{toolTitle}}`

## Variables

| Variable | Type | Example |
|---|---|---|
| `{{sellerName}}` | string | `Rob` |
| `{{toolTitle}}` | string | `Stanley No. 5 Jack Plane` |
| `{{toolPrice}}` | string (formatted) | `$85.00` |
| `{{toolUrl}}` | url | link to live listing |
| `{{toolImageUrl}}` | url | primary listing image |
| `{{stripeStatus}}` | enum | `complete` \| `incomplete` |
| `{{stripeOnboardUrl}}` | url | Stripe Connect onboarding link (if incomplete) |

## Body copy

```
{{sellerName}},

Your listing is live on Benchlot:

[LISTING CARD — {{toolImageUrl}}, {{toolTitle}}, {{toolPrice}}]

[PRIMARY CTA: "View Your Listing" → {{toolUrl}}]

{{#if stripeStatus === 'incomplete'}}
⚠️ One more step to get paid: You'll need to connect your bank account before you can receive payouts. This only takes a minute.

[SECONDARY CTA: "Set Up Payouts" → {{stripeOnboardUrl}}]
{{/if}}

Tips for a quick sale:
• Make sure your photos are well-lit and show the sole, sides, and any maker's marks
• Respond to messages quickly — buyers in this community move fast
• Price competitively — check similar listings and recent sold prices

— Rob, Benchlot
```

## Conditional logic

Only render the Stripe warning block when `stripeStatus === 'incomplete'`. This is the "sharp edge" where sellers can publish but can't get paid — do not miss this.

## Notes

- Tips are hand-tool specific (sole, sides, maker's marks), not generic marketplace advice.
- Founder-voice sign-off.
