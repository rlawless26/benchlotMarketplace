/**
 * Post type registry. Each module exports:
 *   type        -- the post_type string stored on the row
 *   label       -- human name for the contact sheet
 *   candidates()-- ordered list of things this type could post about
 *   prepare(c)  -- optional async check that returns the candidate (possibly
 *                  enriched) or null to skip it (e.g. a photo that won't load)
 *   build(c)    -- the post: caption, first_comment, cards[], subject_*
 *
 * To add a type: write posts/<name>.js with that shape, a template in
 * render/templates/<name>.html, and put the name into config.rotation.
 */
const types = [
  require('./price-guide'),
  require('./just-listed'),
];

const byType = Object.fromEntries(types.map((t) => [t.type, t]));

module.exports = { types, byType };
