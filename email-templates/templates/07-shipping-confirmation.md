# Template 7: Shipping Confirmation (Buyer)

**ID:** `07-shipping-confirmation`
**Provider:** Resend
**Priority:** P5 — needed before scaling.

## Trigger

Seller adds tracking number to order.

## Subject line

`Your {{toolTitle}} has shipped!`

## Variables

| Variable | Type | Example |
|---|---|---|
| `{{buyerName}}` | string | `Rob` |
| `{{toolTitle}}` | string | `Stanley No. 5 Jack Plane` |
| `{{trackingNumber}}` | string | `9400111899223197428490` |
| `{{trackingUrl}}` | url (optional) | carrier tracking URL if resolvable |
| `{{carrier}}` | string | `USPS` \| `UPS` \| `FedEx` |
| `{{orderUrl}}` | url | buyer's order detail page |

## Body copy

```
{{buyerName}},

Your {{toolTitle}} is on its way.

Tracking: {{trackingNumber}} via {{carrier}}
{{#if trackingUrl}}[Track Your Package → {{trackingUrl}}]{{/if}}

[PRIMARY CTA: "View Order" → {{orderUrl}}]

— Benchlot
```

## Conditional logic

Only render the "Track Your Package" link if `{{trackingUrl}}` is present. Otherwise, the user can still find the tracking number in their order page.

## Notes

- System voice.
- Keep it short — this is a status update, not a pitch.
