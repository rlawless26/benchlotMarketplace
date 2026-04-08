# Benchlot Email Templates

Copy-only build of all Benchlot transactional and lifecycle emails for the controlled launch.

## Providers

| Provider | Type | Templates | Owner |
|---|---|---|---|
| **HubSpot** | Marketing / broadcast | Template 2 (Waitlist Reactivation) | Rob (build in HubSpot editor) |
| **Resend** | Transactional / event-triggered | Templates 1, 3–10 | Claude Code (wire into Cloud Functions) |

- From: `hello@benchlot.com`
- Reply-to: `rob@benchlot.com`
- Handlebars-style variables: `{{variableName}}`

## Structure

```
email-templates/
├── README.md                          ← This file
├── shared/
│   └── email-design-system.md         ← Design tokens, shared shell/layout
├── templates/                         ← Resend templates (copy + variables)
│   ├── 01-scan-welcome.md
│   ├── 03-welcome-full-account.md
│   ├── 04-listing-published.md
│   ├── 05-order-confirmation-buyer.md
│   ├── 06-new-order-seller.md
│   ├── 07-shipping-confirmation.md
│   ├── 08-offer-notification.md
│   ├── 09-offer-status-update.md
│   └── 10-message-notification.md
└── hubspot/
    └── 02-waitlist-reactivation.md    ← Copy + guidance for HubSpot build
```

## Priority order

**Resend (Claude Code):**
1. Template 1 — Scan Welcome (scan-to-save funnel)
2. Template 4 — Listing Published (seller confidence + Stripe warning)
3. Template 6 — New Order (Seller)
4. Template 5 — Order Confirmation (Buyer)
5. Template 3 — Welcome (Full Account)
6. Templates 7–10 — pre-scale, post-launch

**HubSpot (Rob):**
1. Template 2 — Waitlist Reactivation, send once 3–5 real listings are live

**Minimum viable controlled-launch set:** Template 2 (HubSpot) + Templates 1 and 4 (Resend).

## Tone

Direct, warm, no corporate fluff. Write like a woodworker talking to another woodworker. Never say "ToolScan" — say "our tool scanner" or "scan your tools." Signed "— Rob, Benchlot" where it's personal; "— Benchlot" for pure system notifications.
