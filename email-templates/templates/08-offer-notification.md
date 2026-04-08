# Template 8: Offer Notification (Seller)

**ID:** `08-offer-notification`
**Provider:** Resend
**Priority:** P5 — needed before scaling.

## Trigger

Buyer submits an offer on a listing.

## Subject line

`New offer on your {{toolTitle}}: {{offerAmount}}`

## Variables

| Variable | Type | Example |
|---|---|---|
| `{{sellerName}}` | string | `Rob` |
| `{{toolTitle}}` | string | `Stanley No. 5 Jack Plane` |
| `{{toolImageUrl}}` | url | primary listing image |
| `{{listingPrice}}` | string (formatted) | `$85.00` |
| `{{offerAmount}}` | string (formatted) | `$70.00` |
| `{{buyerName}}` | string | display name |
| `{{offerUrl}}` | url | offer detail / conversation page |

## Body copy

```
{{sellerName}},

{{buyerName}} made an offer on your {{toolTitle}}:

Offer: {{offerAmount}} (listed at {{listingPrice}})

[PRIMARY CTA: "Respond to Offer" → {{offerUrl}}]

You can accept, counter, or decline. Offers expire in 48 hours.

— Benchlot
```

## Notes

- System voice.
- The 48-hour expiration is a hard constraint — make sure the backend enforces it so the copy stays honest.
