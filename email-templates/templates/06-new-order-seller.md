# Template 6: New Order Notification (Seller)

**ID:** `06-new-order-seller`
**Provider:** Resend
**Priority:** P2 — needed for first transactions. Celebration moment.

## Trigger

Order created from buyer's payment.

## Subject line

`You made a sale! {{toolTitle}}`

## Variables

| Variable | Type | Example |
|---|---|---|
| `{{sellerName}}` | string | `Rob` |
| `{{toolTitle}}` | string | `Stanley No. 5 Jack Plane` |
| `{{toolImageUrl}}` | url | primary listing image |
| `{{salePrice}}` | string (formatted) | `$85.00` |
| `{{yourPayout}}` | string (formatted) | `$74.80` (sale price minus 12% fee) |
| `{{buyerName}}` | string | display name |
| `{{shippingAddress}}` | string (multi-line) | buyer's shipping address |
| `{{orderUrl}}` | url | seller's order detail page |
| `{{messageBuyerUrl}}` | url | link to message the buyer |

## Body copy

```
{{sellerName}},

You sold your {{toolTitle}} for {{salePrice}}!

Your payout: {{yourPayout}} (after Benchlot's 12% marketplace fee)

Ship to:
{{shippingAddress}}

[PRIMARY CTA: "View Order & Add Tracking" → {{orderUrl}}]

Please ship within 3 business days. Once you add a tracking number, your buyer will be notified automatically.

Questions? Reply to this email.

— Benchlot
```

## Notes

- Celebratory subject and opening line — this is the seller's "it worked" moment.
- Shipping expectation (3 business days) is explicit to set norms early.
- Payout math should be computed upstream; template just renders the formatted string.
