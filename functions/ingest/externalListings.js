/**
 * Ingest write layer — backend-agnostic entry point.
 *
 * Kept at this path so the ~13 scrapers that import it need no changes. The
 * implementation moved to ./store/, selected at runtime by BENCHLOT_STORE
 * (see ./store/index.js). Firestore remains the default.
 *
 * See ./SCHEMA.md for field definitions and lifecycle rules.
 */
module.exports = require('./store');
