const config = require('../config');
const { slug } = require('./text');

/** First-comment hashtags for a tool type and maker. */
function hashtagsFor(type, brand) {
  const tags = [...config.hashtags.base];
  const t = String(type || '').toLowerCase();
  for (const [kw, extra] of Object.entries(config.hashtags.byTypeKeyword)) {
    if (t.includes(kw)) for (const tag of extra) if (!tags.includes(tag)) tags.push(tag);
  }
  const b = slug(brand).replace(/-/g, '');
  if (b && b !== '_' && /^[a-z][a-z0-9]{2,19}$/.test(b) && !tags.includes(`#${b}`)) tags.push(`#${b}`);
  return tags.slice(0, config.hashtags.max).join(' ');
}

module.exports = { hashtagsFor };
