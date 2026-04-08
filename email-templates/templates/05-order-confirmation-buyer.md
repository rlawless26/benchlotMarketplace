# Template 5: Order Confirmation (Buyer)

**ID:** `05-order-confirmation-buyer`
**Provider:** Resend
**Priority:** P3 — needed for first transactions.

## Trigger

Payment confirmed via Stripe.

## Subject line

`Order confirmed: {{toolTitle}}`

## Variables

| Variable | Type | Example |
|---|---|---|
| `{{buyerName}}` | string | `Rob` |
| `{{toolTitle}}` | string | `Stanley No. 5 Jack Plane` |
| `{{toolImageUrl}}` | url | primary listing image |
| `{{orderTotal}}` | string (formatted) | `$92.50` |
| `{{shippingAddress}}` | string (multi-line) | formatted address |
| `{{orderUrl}}` | url | buyer's order detail page |
| `{{sellerName}}` | string | display name |
| `{{messageSellerUrl}}` | url | link to message the seller |

## Body copy

```
{{buyerName}},

Your order is confirmed.

[ORDER CARD]
{{toolTitle}}
Total: {{orderTotal}}
Shipping to: {{shippingAddress}}
Seller: {{sellerName}}

[PRIMARY CTA: "View Order" → {{orderUrl}}]

Your seller will ship your tool and provide tracking. If you have questions about the tool, you can message them directly:
[SECONDARY LINK: "Message {{sellerName}}" → {{messageSellerUrl}}]

— Benchlot
```

## Notes

- System voice, not founder voice ("— Benchlot").
- Include `{{toolImageUrl}}` at the top of the order card.
