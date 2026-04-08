# Template 9: Offer Status Update (Buyer)

**ID:** `09-offer-status-update`
**Provider:** Resend
**Priority:** P5 — needed before scaling.

## Trigger

Seller responds to an offer (accepted, countered, or declined). One template, three branches keyed off `{{offerStatus}}`.

## Subject lines (by status)

| Status | Subject |
|---|---|
| `accepted` | `Your offer was accepted: {{toolTitle}}` |
| `countered` | `Counter offer on {{toolTitle}}: {{counterAmount}}` |
| `declined` | `Offer update on your {{toolTitle}}` |

## Variables

| Variable | Type | Example |
|---|---|---|
| `{{buyerName}}` | string | `Rob` |
| `{{toolTitle}}` | string | `Stanley No. 5 Jack Plane` |
| `{{offerStatus}}` | enum | `accepted` \| `countered` \| `declined` |
| `{{originalOffer}}` | string (formatted) | `$70.00` |
| `{{counterAmount}}` | string (formatted, if countered) | `$78.00` |
| `{{offerUrl}}` | url | offer detail page |
| `{{checkoutUrl}}` | url (if accepted) | direct checkout link |

## Body copy — accepted

```
{{buyerName}},

Great news — your offer of {{originalOffer}} on {{toolTitle}} was accepted!

[PRIMARY CTA: "Complete Purchase" → {{checkoutUrl}}]

Please complete payment within 72 hours to secure the tool.

— Benchlot
```

## Body copy — countered

```
{{buyerName}},

The seller countered your offer on {{toolTitle}}:

Your offer: {{originalOffer}}
Counter: {{counterAmount}}

[PRIMARY CTA: "View & Respond" → {{offerUrl}}]

— Benchlot
```

## Body copy — declined

```
{{buyerName}},

The seller declined your offer of {{originalOffer}} on {{toolTitle}}.

The tool is still available at the listed price. You can also make a new offer:

[PRIMARY CTA: "View Listing" → {{offerUrl}}]

— Benchlot
```

## Conditional logic

Pick one of three body blocks based on `{{offerStatus}}`. Subject line should match. The 72-hour window for accepted offers should be enforced in backend so the copy stays honest.

## Notes

- Accepted email is the only one with a direct checkout CTA — don't route the buyer back to the offer detail page when they can pay immediately.
- Declined copy avoids dead-end: reminds the buyer the tool is still for sale.
