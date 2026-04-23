# Template 2: Waitlist Reactivation (HubSpot)

**ID:** `02-waitlist-reactivation`
**Provider:** HubSpot (marketing email — NOT Resend)
**Status:** Pre-pivot. DO NOT SEND. The 2026-04 aggregator pivot replaces this with a waitlist reset email (M4 deliverable) that frames the launch as an aggregator, not a marketplace. Leaving the copy below for reference only.
**Priority (historical):** Send once 3–5 real listings are live on the marketplace.

## Trigger

Manual broadcast from HubSpot to the 134 existing waitlist contacts. **Automation paused as part of M0.** Rob to confirm HubSpot-side that this campaign is disabled.

## HubSpot build notes

- Build directly in HubSpot's email editor using the design tokens in `shared/email-design-system.md`.
- Use HubSpot personalization tokens (`{{ contact.firstname }}`) instead of `{{firstName}}`.
- HubSpot handles unsubscribe links, CAN-SPAM footer, and delivery automatically.
- **Reply-to:** `rob@benchlot.com` so replies go to Rob directly.
- A/B test the two subject lines below using HubSpot's built-in A/B feature.
- Optional follow-up sequence: if no open after 5 days, resend with subject line B.

## Subject lines (A/B test)

- **A:** `Benchlot is live — your tools are waiting`
- **B:** `Still sharp. Benchlot is ready for your first listing.`

## Hard-coded URLs

Paste these directly into the HubSpot email — no variables needed:

- Marketplace: `https://benchlot.com/marketplace`
- Scan: `https://benchlot.com/scan`
- List a tool: `https://benchlot.com/seller/onboard-and-list`

## Body copy

```
{{ contact.firstname }},

You signed up for Benchlot about a year ago. A lot has happened since then — including a brief name change and back again — but the mission hasn't changed: a marketplace built by woodworkers, for woodworkers.

Here's what's new:

→ The marketplace is live. Real listings, real tools, real transactions.
→ You can scan any hand tool with a photo and get an ID, condition grade, and market value estimate — free.
→ Listing takes about 5 minutes. No listing fees right now.

[PRIMARY CTA: "List Your First Tool" → https://benchlot.com/seller/onboard-and-list]

Not ready to sell? Scan a tool to see what it's worth:
[SECONDARY LINK: "Scan a Tool" → https://benchlot.com/scan]

Or just browse what's on the marketplace:
[TERTIARY LINK: "Browse Tools" → https://benchlot.com/marketplace]

If you have questions or want to tell me about tools you're thinking of listing, just reply to this email. I read everything.

— Rob
Benchlot · The woodworker's marketplace.
```

## Notes

- Acknowledges the time gap and name change directly. Don't pretend it didn't happen.
- Three CTAs ranked by commitment: list > scan > browse.
- "Reply to this email" is critical — these are warm leads. Make it easy to start a conversation.
- No "Dear valued member" energy. Just Rob talking.
