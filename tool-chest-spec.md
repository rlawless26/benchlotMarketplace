# Tool Chest — Feature Spec

## Overview

Tool Chest is a personal tool inventory system within Benchlot. Every user gets a digital representation of the tools they own. Tools enter the chest via ToolScan, manual add, or purchase on Benchlot. Tools leave the chest when sold or manually removed. Any tool in the chest can be listed for sale with one click.

Tool Chest is the connective tissue between ToolScan (identification), the marketplace (transaction), and long-term user value (collection management). It turns Benchlot from a place you visit when you want to buy/sell into a place you keep coming back to because your collection lives there.

---

## Data Model

### Unified Tool Record

There is ONE tool document type. A tool's lifecycle is managed via a `status` field, not separate collections. This avoids data duplication and keeps history clean.

**Collection:** `tools`

**New/modified fields for Tool Chest:**

```
status: string
  // Existing statuses: 'draft', 'active', 'sold', 'archived'
  // New status: 'chest'
  // Lifecycle: chest → draft → active → sold
  //            chest → (removed by user)
  //            (purchased) → chest

ownerId: string
  // The current owner's userId. This is the person whose Tool Chest contains this tool.
  // Distinct from sellerId, which is set when the tool is listed for sale.
  // For a purchased tool, ownerId = buyerId. sellerId remains the original seller.

source: string
  // How this tool entered the system:
  // 'toolscan' — created via ToolScan
  // 'manual' — manually added by user
  // 'purchase' — auto-added after buying on Benchlot
  // 'listing' — created directly as a listing (existing flow, no chest step)

toolscanData: object | null
  // Preserved ToolScan output (if source === 'toolscan'):
  // { identification, condition, valueEstimate, confidence, scannedAt }
  // Immutable after scan — this is the raw AI output for reference.

purchaseData: object | null
  // Populated when source === 'purchase':
  // { orderId, pricePaid, purchasedFrom (sellerId), purchasedAt, originalListingId }

chestAddedAt: timestamp
  // When this tool was added to the owner's chest. Null if never in chest.

chestRemovedAt: timestamp | null
  // When removed from chest (if applicable).
```

**Existing fields used as-is:**
- `title`, `description`, `category`, `subcategory`, `condition` — populated by ToolScan, manual entry, or copied from listing on purchase
- `images[]` — photos from ToolScan, manual upload, or original listing
- `price` / `current_price` — for chest items, this is the estimated value (from ToolScan or user-set). Becomes asking price when listed.
- `sellerId`, `sellerName` — set when tool transitions from chest → draft/active
- `createdAt`, `updatedAt` — standard timestamps

**Index requirements:**
- `ownerId` + `status` + `chestAddedAt` (query: "all tools in my chest, newest first")
- `ownerId` + `source` + `chestAddedAt` (query: "all my scanned tools" / "all my purchases")

### Firestore Security Rules Additions

```
// Tool Chest: owner can read/write their own chest items
match /tools/{toolId} {
  // Existing rules for public read on active listings stay the same

  // Owner can read their own chest/draft items
  allow read: if resource.data.ownerId == request.auth.uid;

  // Owner can update their own chest items (edit, list, remove)
  allow update: if resource.data.ownerId == request.auth.uid
                && request.auth.uid != null;

  // Owner can create chest items
  allow create: if request.resource.data.ownerId == request.auth.uid
                && request.auth.uid != null;
}
```

---

## Phase 1: Scan → Save → View Chest

### 1.1 ToolScan → Tool Chest Save Path

**Current flow:** ToolScan → Review → "Save as Draft Listing"

**New flow:** ToolScan → Review → Choice: "Save to Tool Chest" or "List for Sale"

#### ToolScan Results Screen Changes

After ToolScan returns results, the review screen shows two primary CTAs:

```
┌─────────────────────────────────────┐
│  ToolScan Result                    │
│                                     │
│  [Photo]                            │
│                                     │
│  Stanley No. 5 Jack Plane           │
│  Type 11, c. 1910-1918              │
│  Condition: Good                    │
│  Estimated Value: $85 - $120        │
│  Confidence: High (92%)             │
│                                     │
│  ┌─────────────────────────────┐    │
│  │   Save to Tool Chest  📦   │    │  ← Primary CTA (Honey)
│  └─────────────────────────────┘    │
│  ┌─────────────────────────────┐    │
│  │   List for Sale        🏷️   │    │  ← Secondary CTA (Spruce)
│  └─────────────────────────────┘    │
│                                     │
│  Keep it or sell it — your call.    │
└─────────────────────────────────────┘
```

**If user is NOT authenticated:** Either CTA triggers the auth modal (signup/login). After auth completes, the action they clicked executes automatically. The ToolScan result data must persist through the auth flow — store in component state or sessionStorage, NOT localStorage (we don't want orphaned scan data).

**"Save to Tool Chest" creates a tool document:**
```javascript
{
  status: 'chest',
  ownerId: user.uid,
  source: 'toolscan',
  title: toolscanResult.identification.title,
  description: toolscanResult.identification.description,
  category: toolscanResult.identification.category,
  subcategory: toolscanResult.identification.subcategory,
  condition: toolscanResult.condition.grade,
  price: toolscanResult.valueEstimate.midpoint,  // estimated value
  images: [uploadedPhotoUrl],
  toolscanData: {
    identification: toolscanResult.identification,
    condition: toolscanResult.condition,
    valueEstimate: toolscanResult.valueEstimate,
    confidence: toolscanResult.confidence,
    scannedAt: serverTimestamp()
  },
  purchaseData: null,
  sellerId: null,
  sellerName: null,
  chestAddedAt: serverTimestamp(),
  chestRemovedAt: null,
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp()
}
```

**"List for Sale"** sets `status: 'draft'` and `sellerId: user.uid` and redirects to the listing form (existing flow, pre-populated with ToolScan data). Also sets `ownerId: user.uid` and `chestAddedAt: serverTimestamp()` so the tool appears in the chest with a "Listed" badge.

**After save, redirect to:** Tool Chest page with a success toast: "Stanley No. 5 added to your Tool Chest"

#### First-Time User Flow (Unauthenticated)

This is the primary acquisition funnel:

```
benchlot.com → "Scan a Tool" CTA → ToolScan page → Upload photo →
ToolScan results → "Save to Tool Chest" → Auth modal (signup) →
Account created → Tool saved to chest → Redirect to Tool Chest page
```

The ToolScan page should be accessible WITHOUT authentication. The auth gate only triggers when the user tries to save. This lets people experience the magic of ToolScan before committing to an account.

**Implementation note:** The ToolScan page (`/toolscan`) currently exists. It needs to work for unauthenticated users up to the save step. Store the scan result in React state. On auth completion, fire the save.

### 1.2 Tool Chest Page

**Route:** `/tool-chest`

**Nav placement:** Add "Tool Chest" to the authenticated user menu in Header.js, between "My Listings" and "Wishlist". Use a toolbox/chest icon (Lucide: `Archive`, `Box`, or `Package`).

#### Page Layout

```
┌──────────────────────────────────────────────────┐
│  Tool Chest                                      │
│  Your collection: 12 tools · Est. value: $2,340  │
│                                                  │
│  [Scan a Tool]  [Add Manually]                   │
│                                                  │
│  Filter: [All] [Scanned] [Purchased] [Manual]    │
│  Sort: [Newest] [Value ↓] [Value ↑] [Name A-Z]  │
│                                                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐         │
│  │  [Photo] │ │  [Photo] │ │  [Photo] │         │
│  │          │ │          │ │          │         │
│  │ Stanley  │ │ Veritas  │ │ Narex    │         │
│  │ No. 5    │ │ LA Jack  │ │ Chisels  │         │
│  │          │ │          │ │ (set/6)  │         │
│  │ $85-120  │ │ $289     │ │ $95      │         │
│  │          │ │ ───────  │ │          │         │
│  │ [List]   │ │ [Listed] │ │ [List]   │         │
│  └──────────┘ └──────────┘ └──────────┘         │
│                                                  │
└──────────────────────────────────────────────────┘
```

#### Tool Chest Card Component

Create `ToolChestCard.js` — similar to `ToolListingCard.js` but inventory-focused:

- **Photo** — primary image, click opens detail view
- **Title** — tool name from ToolScan or manual entry
- **Value** — estimated value (range if from ToolScan, single price if user-set)
- **Source badge** — small indicator: "Scanned" / "Purchased" / "Added"
- **Condition** — from ToolScan or manual entry
- **Status indicator:**
  - `status: 'chest'` → Show "List for Sale" button
  - `status: 'draft'` → Show "Listed (Draft)" badge with link to edit
  - `status: 'active'` → Show "Listed" badge with link to listing
  - `status: 'sold'` → Show "Sold" badge with sale price and date
- **Overflow menu (⋯):** Edit details, Remove from chest, View ToolScan report (if scanned)

#### Collection Summary Bar

Top of page, always visible:
- Total tools count
- Estimated total value (sum of `price` field for all chest items)
- Breakdown by source if useful (e.g., "8 scanned · 3 purchased · 1 added")

#### Filters & Sort

- **Source filter:** All | Scanned | Purchased | Manual
- **Status filter:** All | In Chest | Listed | Sold
- **Sort:** Newest first (default) | Value high→low | Value low→high | Name A-Z
- **Search:** Text search across title, description, category

#### Empty State

For new users with zero tools:

```
┌──────────────────────────────────────────────────┐
│                                                  │
│        📦                                        │
│                                                  │
│   Your Tool Chest is empty                       │
│                                                  │
│   Scan your first tool to start building         │
│   your digital collection.                       │
│                                                  │
│   [Scan a Tool]  [Add Manually]                  │
│                                                  │
└──────────────────────────────────────────────────┘
```

### 1.3 Tool Chest Detail View

**Route:** `/tool-chest/:toolId`

When a user clicks a tool in their chest, show a detail view with:

- All photos (carousel if multiple)
- Full identification details (title, maker, era, category, subcategory)
- Condition assessment (grade + notes)
- Value estimate (range or fixed)
- ToolScan report card (if source === 'toolscan') — show the raw AI identification data, confidence score, and scan date. This is the "appraisal" feel.
- Purchase info (if source === 'purchase') — price paid, seller, date, order link
- **Actions:** Edit details, List for Sale, Remove from Chest
- **History/timeline** (stretch for Phase 1): "Scanned on Mar 15" → "Listed on Mar 20" → "Sold on Apr 2 for $95"

### 1.4 Manual Add Flow

**Route:** Use existing `/list-tool` form OR create a simplified version.

"Add Manually" from Tool Chest opens a form with:
- Photo upload (required, at least 1)
- Title (required)
- Category / subcategory (dropdowns, use existing `toolCategories` / `toolSubcategories`)
- Condition (dropdown: Mint, Excellent, Good, Fair, Project)
- Estimated value (optional, user-entered)
- Notes / description (optional)

Saves with `status: 'chest'`, `source: 'manual'`, `ownerId: user.uid`.

This should be lightweight — NOT the full listing form. Think "inventory card" not "marketplace listing." The full listing details get filled in when they decide to sell.

### 1.5 Model Layer: toolModel.js Additions

```javascript
// New exports to add to toolModel.js:

/**
 * Get all tools in a user's Tool Chest
 * @param {string} userId
 * @param {Object} options - { source, status, sortBy, sortDir }
 * @returns {Promise<Array>}
 */
export const getToolChest = async (userId, options = {}) => { ... }

/**
 * Get Tool Chest summary stats
 * @param {string} userId
 * @returns {Promise<{ count, totalValue, bySource }>}
 */
export const getToolChestStats = async (userId) => { ... }

/**
 * Add a tool to the user's chest (from ToolScan or manual)
 * @param {Object} toolData - includes ownerId, source, etc.
 * @returns {Promise<Object>} - created tool document
 */
export const addToToolChest = async (toolData) => { ... }

/**
 * Remove a tool from the user's chest
 * Sets chestRemovedAt, status to 'archived'
 * @param {string} toolId
 * @param {string} userId - for ownership verification
 * @returns {Promise<void>}
 */
export const removeFromToolChest = async (toolId, userId) => { ... }

/**
 * Move a chest tool to draft listing
 * Sets status to 'draft', sellerId, sellerName
 * @param {string} toolId
 * @param {string} userId
 * @returns {Promise<Object>}
 */
export const listFromToolChest = async (toolId, userId) => { ... }
```

### 1.6 Hook: useToolChest.js

```javascript
// New hook: src/firebase/hooks/useToolChest.js

export const useToolChest = () => {
  // Returns:
  // tools - array of chest items (real-time listener)
  // stats - { count, totalValue, bySource }
  // loading, error
  // addTool(toolData)
  // removeTool(toolId)
  // listTool(toolId) — transitions to draft
  // filters - current filter state
  // setFilters - update filters
  // sortBy, setSortBy
}
```

Use real-time Firestore listener (`onSnapshot`) so the chest updates live when tools are scanned from another tab or purchased.

### 1.7 Navigation & Route Updates

**App.js additions:**
```javascript
<Route path="/tool-chest" element={<ToolChestPage />} />
<Route path="/tool-chest/:toolId" element={<ToolChestDetailPage />} />
```

**Header.js additions:**
- Add "Tool Chest" link in authenticated user dropdown menu
- Add Tool Chest icon in mobile nav

**New pages:**
- `src/Pages/ToolChestPage.js`
- `src/Pages/ToolChestDetailPage.js`

**New components:**
- `src/components/ToolChestCard.js`
- `src/components/ToolChestSummary.js`
- `src/components/ManualToolForm.js` (lightweight add form)

---

## Phase 2: List from Chest + Auto-Add on Purchase

### 2.1 Tool Chest → List for Sale

When user clicks "List for Sale" on a chest item:

1. Transition tool status: `chest` → `draft`
2. Set `sellerId: user.uid`, `sellerName: user.displayName`
3. Redirect to `/edit-tool/:toolId` (existing `ToolListingFormPage`)
4. Form is pre-populated with all existing data (title, description, photos, condition, price)
5. User reviews, optionally adjusts price, adds shipping details, and publishes
6. On publish, status changes: `draft` → `active` (existing flow)

**The tool remains in the Tool Chest view** with a "Listed" or "Listed (Draft)" badge. It doesn't disappear — the user can still see it in their collection. When it sells, the badge changes to "Sold" with the sale price.

**Seller onboarding check:** If the user isn't a seller yet (no Stripe Connect), the "List for Sale" action should trigger the seller onboarding flow first (`/seller/onboard-and-list` pattern). After Stripe setup completes, return them to the listing form for their tool.

### 2.2 Auto-Add Purchased Tools to Chest

When a buyer completes a purchase on Benchlot, the purchased tool(s) should automatically appear in their Tool Chest.

**Implementation — in the order confirmation / payment confirmation flow:**

After `confirm-payment` succeeds (in `functions/index.js`):

```javascript
// For each item in the order:
// 1. The existing tool document gets status: 'sold' (already happens)
// 2. Create a NEW tool document in the buyer's chest:

{
  status: 'chest',
  ownerId: buyerId,
  source: 'purchase',
  title: originalTool.title,
  description: originalTool.description,
  category: originalTool.category,
  subcategory: originalTool.subcategory,
  condition: originalTool.condition,
  price: pricePaid,  // what they actually paid, not the estimate
  images: originalTool.images,  // copy image URLs
  toolscanData: originalTool.toolscanData || null,  // preserve if exists
  purchaseData: {
    orderId: order.id,
    pricePaid: pricePaid,
    purchasedFrom: originalTool.sellerId,
    purchasedAt: serverTimestamp(),
    originalListingId: originalTool.id
  },
  sellerId: null,
  sellerName: null,
  chestAddedAt: serverTimestamp(),
  chestRemovedAt: null,
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp()
}
```

**Why a new document instead of updating the existing one?** The original tool document belongs to the seller's history — it has their sellerId, their photos, their listing edits, and the `sold` status is meaningful for their dashboard. The buyer gets a fresh document that represents *their* ownership of that tool. If they later resell it, they create a new listing from their chest item, and the chain continues.

**This also preserves provenance.** Over time, a tool could have a chain: Seller A → Buyer B (who relists) → Buyer C. Each transaction creates a new chest item linked back via `purchaseData.originalListingId`.

**Guest checkout caveat:** Guest purchases can't auto-add to a chest (no account). If the guest later creates an account, consider a reconciliation flow that matches their email to past guest orders and offers to import those tools. This is a stretch goal, not Phase 2 scope.

### 2.3 Cloud Function Updates

**`functions/index.js` — `confirm-payment` endpoint:**

Add a step after order creation that creates the buyer's chest document(s). This runs server-side so it's reliable regardless of client state.

```javascript
// After order is created successfully:
for (const item of order.items) {
  // Fetch the original tool document
  const toolDoc = await db.collection('tools').doc(item.toolId).get();
  if (toolDoc.exists) {
    const tool = toolDoc.data();
    await db.collection('tools').add({
      status: 'chest',
      ownerId: order.userId,  // buyer
      source: 'purchase',
      title: tool.title,
      description: tool.description,
      category: tool.category || null,
      subcategory: tool.subcategory || null,
      condition: tool.condition || null,
      price: item.price,
      images: tool.images || [],
      toolscanData: tool.toolscanData || null,
      purchaseData: {
        orderId: orderRef.id,
        pricePaid: item.price,
        purchasedFrom: tool.sellerId,
        purchasedAt: admin.firestore.FieldValue.serverTimestamp(),
        originalListingId: item.toolId
      },
      sellerId: null,
      sellerName: null,
      chestAddedAt: admin.firestore.FieldValue.serverTimestamp(),
      chestRemovedAt: null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
  }
}
```

### 2.4 Order Confirmation Page Update

After purchase, the order confirmation page should include:

```
✓ Order confirmed!

Your new tools have been added to your Tool Chest.
[View Tool Chest →]
```

### 2.5 Seller Dashboard Integration

On the seller's `SellerDashboardPage` / `MyListings`, tools that originated from the chest should show a "From Tool Chest" indicator. When a listed tool sells, its chest status updates to `sold` automatically (this already happens via the existing `updateToolStatus` flow — just ensure the chest badge rendering handles the `sold` status).

---

## Edge Cases & Considerations

### Duplicate Detection
- If a user scans the same tool twice, they get two chest items. Don't try to deduplicate — the user might actually have two Stanley No. 5s. Let them manage duplicates manually.

### Image Ownership
- When a purchased tool is copied to the buyer's chest, the image URLs point to the same Firebase Storage files. This is fine — don't duplicate storage. If the buyer later uploads new photos, those are new files.

### Tool Removal
- "Remove from Chest" sets `status: 'archived'` and `chestRemovedAt: timestamp`. Don't hard-delete — the user might want it back, and we want the data for analytics.
- If a tool is currently listed (`status: 'draft'` or `active`), removing from chest should warn: "This tool is currently listed for sale. Remove the listing first."

### Value Tracking Over Time (Future)
- The `price` field on chest items represents current estimated value. As pricing intelligence improves, we could periodically update these estimates and show the user "Your collection has increased in value by $X since last month." Not in scope for Phase 1 or 2, but the data model supports it.

### ToolScan Multi-Scan (Future)
- When multi-tool ToolScan ships (Phase 2 of ToolScan), a single scan session could generate multiple chest items. The data model supports this — each identified tool becomes its own document with `source: 'toolscan'`.

---

## Migration & Backward Compatibility

### Existing Tool Documents
- Existing tools (listings) don't have `ownerId`, `source`, `toolscanData`, `purchaseData`, or `chestAddedAt`. These fields should be optional/nullable throughout the codebase.
- Existing listings should NOT appear in anyone's Tool Chest unless explicitly added.
- The `ownerId` field on existing active listings could be backfilled to match `sellerId` if needed for query consistency, but this is optional and can be a migration script run once.

### Existing ToolScan Flow
- The current "Save as Draft" flow should still work. "List for Sale" from the ToolScan results screen is equivalent — it just also sets `ownerId` and `chestAddedAt` so the tool shows in the chest.

---

## Files to Create / Modify

### New Files
- `src/Pages/ToolChestPage.js` — main chest view
- `src/Pages/ToolChestDetailPage.js` — single tool detail
- `src/components/ToolChestCard.js` — inventory card component
- `src/components/ToolChestSummary.js` — collection stats bar
- `src/components/ManualToolForm.js` — lightweight add form
- `src/firebase/hooks/useToolChest.js` — chest data hook

### Modified Files
- `src/App.js` — add routes
- `src/components/Header.js` — add nav link
- `src/Pages/ToolScanPage.js` — add chest save path + unauthenticated access
- `src/firebase/models/toolModel.js` — add chest query/mutation functions
- `functions/index.js` — add chest creation on purchase confirmation
- `firestore.rules` — add ownerId-based read/write rules
- `firestore.indexes.json` — add ownerId composite indexes

---

## Success Metrics

**Phase 1:**
- % of ToolScan users who save to chest (vs. list for sale vs. abandon)
- Tool Chest adoption: % of registered users with ≥1 chest item within 30 days
- Return visits: do Tool Chest users come back more often than non-chest users?

**Phase 2:**
- Chest → listing conversion rate (what % of chest items get listed for sale?)
- Time from chest add to listing (how long do people sit on tools before selling?)
- Purchase → chest engagement (do buyers who see their purchase in the chest come back more?)
