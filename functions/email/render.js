/**
 * Render helpers for email templates.
 *
 * Templates compose their body HTML using these helpers and pass it to
 * shell.renderShell(). All output is HTML-safe by default — anything that
 * comes from user input must go through escapeHtml().
 */

const tokens = require('./tokens');

/**
 * Escape unsafe HTML characters. Use for any string that originated from
 * user input (tool name, seller name, message text, etc.).
 */
function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Format a numeric price as USD ($85.00). Accepts numbers OR pre-formatted
 * strings (returns the string unchanged if it already starts with '$').
 */
function formatPrice(value) {
  if (value === null || value === undefined || value === '') return '';
  if (typeof value === 'string' && value.trim().startsWith('$')) return value.trim();
  const num = typeof value === 'number' ? value : parseFloat(value);
  if (Number.isNaN(num)) return '';
  return `$${num.toFixed(2)}`;
}

/**
 * Format a JS Date or Firestore Timestamp as a human-readable date.
 * e.g. "April 7, 2026"
 */
function formatDate(input) {
  if (!input) return '';
  let date;
  if (input.toDate && typeof input.toDate === 'function') {
    date = input.toDate();
  } else if (input instanceof Date) {
    date = input;
  } else {
    date = new Date(input);
  }
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

/**
 * Build an absolute Benchlot URL from a relative path.
 * Uses BENCHLOT_BASE_URL env var, defaults to https://benchlot.com.
 */
function url(path) {
  const base = (process.env.BENCHLOT_BASE_URL || 'https://benchlot.com').replace(/\/$/, '');
  if (!path) return base;
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

/**
 * Render a primary CTA button (Honey bg, Dark Teal text).
 * Always full-width on mobile via inline styles.
 */
function primaryButton({ label, href }) {
  return `
    <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%" style="margin: 24px 0;">
      <tr>
        <td align="center" bgcolor="${tokens.honey}" style="border-radius: ${tokens.ctaRadius}; background-color: ${tokens.honey};">
          <a href="${escapeHtml(href)}"
             style="display: inline-block; padding: 14px 32px; font-family: ${tokens.bodyFont}; font-size: 16px; font-weight: 700; color: ${tokens.darkTeal}; text-decoration: none; border-radius: ${tokens.ctaRadius}; min-height: ${tokens.ctaHeight}; line-height: 20px;">
            ${escapeHtml(label)}
          </a>
        </td>
      </tr>
    </table>
  `.trim();
}

/**
 * Render a secondary text-link CTA.
 */
function secondaryLink({ label, href }) {
  return `
    <p style="margin: 16px 0; font-family: ${tokens.bodyFont}; font-size: 16px;">
      <a href="${escapeHtml(href)}" style="color: ${tokens.spruce}; text-decoration: underline;">
        ${escapeHtml(label)} →
      </a>
    </p>
  `.trim();
}

/**
 * Render an inline content card (tool/listing/order summary).
 * Uses Bone background per design system.
 */
function contentCard({ imageUrl, title, subtitle, price }) {
  return `
    <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%" style="margin: 16px 0; background-color: ${tokens.bone}; border: 1px solid ${tokens.cardBorder}; border-radius: ${tokens.cardRadius};">
      ${imageUrl ? `
      <tr>
        <td style="padding: 0;">
          <img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(title || 'Tool')}" width="100%" style="display: block; width: 100%; max-width: 100%; height: auto; border-radius: 4px 4px 0 0;" />
        </td>
      </tr>
      ` : ''}
      <tr>
        <td style="padding: 20px;">
          ${title ? `<p style="margin: 0 0 4px 0; font-family: ${tokens.displayFont}; font-size: 20px; font-weight: 700; color: ${tokens.spruce};">${escapeHtml(title)}</p>` : ''}
          ${subtitle ? `<p style="margin: 0 0 8px 0; font-family: ${tokens.bodyFont}; font-size: 14px; color: ${tokens.mutedText};">${escapeHtml(subtitle)}</p>` : ''}
          ${price ? `<p style="margin: 0; font-family: ${tokens.bodyFont}; font-size: 18px; font-weight: 700; color: ${tokens.honey};">${escapeHtml(price)}</p>` : ''}
        </td>
      </tr>
    </table>
  `.trim();
}

/**
 * Render the Stripe-incomplete warning block used in Template 4.
 */
function stripeWarningBlock({ stripeOnboardUrl }) {
  return `
    <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%" style="margin: 16px 0; background-color: ${tokens.warningBg}; border: 1px solid ${tokens.warningBorder}; border-radius: ${tokens.cardRadius};">
      <tr>
        <td style="padding: 20px;">
          <p style="margin: 0 0 8px 0; font-family: ${tokens.bodyFont}; font-size: 16px; font-weight: 700; color: ${tokens.warningText};">
            ⚠️ One more step to get paid
          </p>
          <p style="margin: 0 0 12px 0; font-family: ${tokens.bodyFont}; font-size: 14px; color: ${tokens.bodyText}; line-height: 1.5;">
            You'll need to connect your bank account before you can receive payouts. This only takes a minute.
          </p>
          <p style="margin: 0;">
            <a href="${escapeHtml(stripeOnboardUrl)}" style="font-family: ${tokens.bodyFont}; font-size: 14px; font-weight: 700; color: ${tokens.spruce}; text-decoration: underline;">
              Set Up Payouts →
            </a>
          </p>
        </td>
      </tr>
    </table>
  `.trim();
}

/**
 * Render a paragraph of body copy.
 */
function paragraph(text) {
  return `<p style="margin: 0 0 16px 0; font-family: ${tokens.bodyFont}; font-size: 16px; line-height: 1.6; color: ${tokens.bodyText};">${text}</p>`;
}

/**
 * Render an unordered bullet list.
 */
function bulletList(items) {
  const lis = items.map(
    item => `<li style="margin: 0 0 8px 0; font-family: ${tokens.bodyFont}; font-size: 16px; line-height: 1.6; color: ${tokens.bodyText};">${item}</li>`
  ).join('');
  return `<ul style="margin: 0 0 16px 20px; padding: 0;">${lis}</ul>`;
}

/**
 * Convert an HTML string to plaintext for the multipart text/plain body.
 * This is a deliberately simple converter — strip tags, preserve hrefs as
 * "label (href)", collapse whitespace. For richer content templates can
 * override by providing their own text() function.
 */
function htmlToText(html) {
  return String(html)
    // Pull <a href="X">label</a> into "label (X)"
    .replace(/<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, '$2 ($1)')
    // <br> and block elements → newlines
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|tr|h[1-6])>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    // Strip remaining tags
    .replace(/<[^>]+>/g, '')
    // Decode common HTML entities we produced via escapeHtml
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    // Collapse whitespace
    .replace(/\n[ \t]+/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

module.exports = {
  escapeHtml,
  formatPrice,
  formatDate,
  url,
  primaryButton,
  secondaryLink,
  contentCard,
  stripeWarningBlock,
  paragraph,
  bulletList,
  htmlToText,
};
