/**
 * Benchlot marketplace fee constants.
 *
 * 10% all-in = ~7% marketplace commission + ~3% Stripe processing.
 * The seller sees one number ("10% marketplace fee") and receives 90%.
 *
 * Centralized here so every backend calculation, email template, and
 * frontend display references the same source of truth.
 */
const MARKETPLACE_FEE_PERCENT = 10;
const MARKETPLACE_FEE_RATE = 0.10;
const SELLER_PAYOUT_RATE = 0.90;
const MARKETPLACE_FEE_LABEL = '10% marketplace fee';

module.exports = {
  MARKETPLACE_FEE_PERCENT,
  MARKETPLACE_FEE_RATE,
  SELLER_PAYOUT_RATE,
  MARKETPLACE_FEE_LABEL,
};
