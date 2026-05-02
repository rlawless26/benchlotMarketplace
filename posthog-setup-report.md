<wizard-report>
# PostHog post-wizard report

The wizard has completed a deep integration of your project. PostHog analytics now spans both the React frontend (posthog-js, already initialized) and the Firebase Cloud Functions backend (posthog-node, newly added). New client-side events cover the core aggregator flows: search, listing click-throughs, alert creation/deletion, wishlist actions, and user sign-up/sign-in across all auth methods (email, Google, Facebook, Apple, email link). New server-side events in `functions/index.js` capture authoritative order completion, payment failures, and refund initiation — using the Firebase UID as `distinctId` so server events are automatically linked to the same person profiles as frontend events. The `REACT_APP_POSTHOG_KEY`, `REACT_APP_POSTHOG_HOST`, `POSTHOG_API_KEY`, and `POSTHOG_HOST` environment variables have been written to `.env.local` and `functions/.env` respectively.

| Event | Description | File |
|---|---|---|
| `search_performed` | User applies a search query or changes type/source/sort filters | `src/Pages/MarketplacePage.js` |
| `listing_click` | User clicks through to an external source listing (core aggregator conversion) | `src/components/ToolListingCard.js` |
| `alert_created` | User saves a search as an email alert | `src/firebase/models/savedSearchModel.js` |
| `alert_deleted` | User deletes a saved alert | `src/firebase/models/savedSearchModel.js` |
| `tool_watched` | User adds a tool to their wishlist | `src/components/SaveToolButton.js` |
| `tool_unwatched` | User removes a tool from their wishlist | `src/components/SaveToolButton.js` |
| `user_signed_up` | New user created (email, Google, Facebook, Apple, email link) | `src/firebase/hooks/useAuth.js` |
| `user_signed_in` | Existing user signs in (all methods) | `src/firebase/hooks/useAuth.js` |
| `order_completed` | Payment confirmed and order created — server-side authoritative event | `functions/index.js` |
| `payment_failed` | Payment attempt failed (Stripe error or unconfirmed intent) | `functions/index.js` |
| `refund_initiated` | Refund created for an order | `functions/index.js` |

Previously instrumented events (unchanged): `listing_viewed`, `checkout_started`, `tool_listed`, `offer_created`, `offer_accepted`, `offer_countered`, `offer_declined`, `message_sent`.

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

- **Dashboard**: [Analytics basics](https://us.posthog.com/project/369967/dashboard/1535530)
- **Listing click-through rate (search → click)**: [K1RNveb5](https://us.posthog.com/project/369967/insights/K1RNveb5) — Core aggregator conversion funnel (30-minute window)
- **Daily listing clicks**: [hgbNVTNE](https://us.posthog.com/project/369967/insights/hgbNVTNE) — How much traffic Benchlot sends to source dealers each day
- **New user sign-ups per day**: [tDBna1fO](https://us.posthog.com/project/369967/insights/tDBna1fO) — Broken down by sign-up method
- **Search-to-alert conversion funnel**: [hJrMUvu7](https://us.posthog.com/project/369967/insights/hJrMUvu7) — Users who search and then save an alert (7-day window)
- **Checkout-to-order completion funnel**: [l1UwQIKC](https://us.posthog.com/project/369967/insights/l1UwQIKC) — Purchase completion rate with 1-hour window

### Agent skill

We've left an agent skill folder in your project. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>
