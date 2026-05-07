/**
 * Single-item eBay fetch + URL parser for the unified check flow.
 *
 * Wraps the Browse API "Get Item by Legacy ID" endpoint so we can
 * resolve a pasted eBay URL into a normalizer-ready listing payload
 * without re-running the bulk scraper.
 *
 * Reuses OAuth + the canonical record-shaping helpers from
 * functions/ingest/ebay.js — single source of truth for the eBay record
 * shape stays in the bulk ingest module.
 */

const axios = require('axios');

const ebayIngest = require('../ingest/ebay');

const API_ORIGIN = 'https://api.ebay.com';
const GET_BY_LEGACY_URL = `${API_ORIGIN}/buy/browse/v1/item/get_item_by_legacy_id`;
const MARKETPLACE = 'EBAY_US';
const REQUEST_TIMEOUT_MS = 30000;

/**
 * Parse an eBay listing URL → { legacyItemId } | null.
 *
 * Handles canonical formats:
 *   https://www.ebay.com/itm/123456789012
 *   https://www.ebay.com/itm/some-slug/123456789012
 *   https://www.ebay.com/itm/123456789012?epid=...
 *   https://ebay.com/itm/123456789012
 *
 * Locale subdomains (ebay.de etc.) parse fine but the downstream US-only
 * country guard in `toRecord` will drop non-US listings before they hit
 * the comp engine.
 */
function parseEbayUrl(url) {
  if (typeof url !== 'string') return null;
  const m = url.match(/ebay\.[a-z.]+\/itm\/(?:[^/?#]+\/)?(\d{6,})/i);
  if (!m) return null;
  return { legacyItemId: m[1] };
}

/**
 * Fetch a single eBay item by its legacy id. Returns the same envelope
 * shape (`{ listing, raw, raw_format }`) the bulk scraper produces, so
 * the downstream normalizer + comp lookup runs the same code path
 * regardless of whether the listing came from cache or live fetch.
 *
 * Errors:
 *   - invalid id format → throws synchronously (caller validates)
 *   - eBay 404 → axios throws; caller surfaces as "listing not found"
 *   - non-US listing → toRecord returns null; we throw a recognizable error
 */
async function fetchEbayItemById(legacyItemId) {
  if (!legacyItemId || !/^\d+$/.test(String(legacyItemId))) {
    throw new Error(`fetchEbayItemById: invalid legacyItemId "${legacyItemId}"`);
  }

  const token = await ebayIngest.getAppToken();
  const url = `${GET_BY_LEGACY_URL}?legacy_item_id=${encodeURIComponent(legacyItemId)}`;
  const resp = await axios.get(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      'X-EBAY-C-MARKETPLACE-ID': MARKETPLACE,
    },
    timeout: REQUEST_TIMEOUT_MS,
  });

  const item = resp.data;
  if (!item) {
    throw new Error(`fetchEbayItemById: empty response for ${legacyItemId}`);
  }

  // Get-Item-by-Legacy-ID returns a richer payload than item_summary, but
  // the fields toRecord uses (legacyItemId, title, itemLocation, price,
  // itemCreationDate, condition, image fields, leafCategoryIds) are all
  // present in both shapes. Pass it straight through.
  const record = ebayIngest.toRecord(item);
  if (!record) {
    // Most common cause: non-US listing or empty title. Distinguish for
    // the caller so they can show specific copy.
    const country = item.itemLocation && item.itemLocation.country;
    if (country && country !== 'US') {
      const err = new Error(`Non-US listing (${country}) — Benchlot indexes US inventory only.`);
      err.code = 'non_us_listing';
      throw err;
    }
    throw new Error(`fetchEbayItemById: toRecord returned null for ${legacyItemId}`);
  }

  // Get-Item-by-Legacy-ID exposes a description string; bulk scraper item_summary
  // doesn't. Patch it onto the listing so the normalizer has more signal.
  if (item.description || item.shortDescription) {
    const desc = String(item.description || item.shortDescription || '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (desc) record.listing.description_raw = desc;
  }

  return record;
}

module.exports = {
  parseEbayUrl,
  fetchEbayItemById,
};
