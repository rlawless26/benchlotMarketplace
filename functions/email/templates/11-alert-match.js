/**
 * Template 11: Alert Match Digest
 *
 * Sent when one or more of the recipient's saved searches matched newly-
 * indexed listings since the last matcher run. The email is a digest —
 * across all of the user's alerts, up to N listings shown per alert, with
 * a link back to the aggregator results page for each alert.
 *
 * Variables:
 *   displayName         — user's first name; falls back to no greeting
 *   matches             — [{ alertSummary, alertUrl, listings: [{title, price,
 *                           sourceName, sourceUrl, imageUrl, maker}] }]
 *   totalMatchCount     — total new matches across all alerts (number)
 *   manageAlertsUrl     — link to /alerts page
 *   unsubscribeUrl      — link to /settings#notifications (one-click later)
 */

const { renderShell } = require('../shell');
const tokens = require('../tokens');
const {
  escapeHtml,
  paragraph,
  primaryButton,
  secondaryLink,
  htmlToText,
  url,
} = require('../render');

function renderListingRow(listing) {
  const {
    title = '',
    price = '',
    sourceName = '',
    sourceUrl = '#',
    imageUrl = '',
    maker = '',
  } = listing;

  const imgCell = imageUrl
    ? `<td valign="top" width="80" style="padding: 0 16px 0 0;">
         <a href="${escapeHtml(sourceUrl)}" target="_blank" rel="noopener">
           <img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(title)}" width="80" height="60" style="display: block; width: 80px; height: 60px; object-fit: cover; border-radius: 6px; border: 1px solid ${tokens.cardBorder};" />
         </a>
       </td>`
    : '';

  return `
    <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%" style="margin: 0 0 12px 0;">
      <tr>
        ${imgCell}
        <td valign="top" style="padding: 0;">
          ${maker ? `<p style="margin: 0 0 2px 0; font-family: ${tokens.bodyFont}; font-size: 10px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: ${tokens.mutedText};">${escapeHtml(maker)}</p>` : ''}
          <p style="margin: 0 0 4px 0; font-family: ${tokens.bodyFont}; font-size: 15px; font-weight: 600; color: ${tokens.darkTeal}; line-height: 1.3;">
            <a href="${escapeHtml(sourceUrl)}" target="_blank" rel="noopener" style="color: ${tokens.darkTeal}; text-decoration: none;">${escapeHtml(title)}</a>
          </p>
          <p style="margin: 0; font-family: ${tokens.bodyFont}; font-size: 13px; color: ${tokens.mutedText};">
            <span style="color: ${tokens.honey}; font-weight: 700;">${escapeHtml(price)}</span>
            ${sourceName ? ` · at ${escapeHtml(sourceName)}` : ''}
          </p>
        </td>
      </tr>
    </table>
  `.trim();
}

function renderAlertBlock(match) {
  const { alertSummary = 'Your alert', alertUrl = url('/'), listings = [] } = match;
  const shown = listings.slice(0, 4);
  const more = listings.length - shown.length;

  return `
    <div style="margin: 0 0 24px 0; padding: 18px 20px; background-color: ${tokens.bone}; border: 1px solid ${tokens.cardBorder}; border-radius: ${tokens.cardRadius};">
      <p style="margin: 0 0 14px 0; font-family: ${tokens.bodyFont}; font-size: 11px; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase; color: ${tokens.mutedText};">
        ${listings.length} new match${listings.length === 1 ? '' : 'es'} for
      </p>
      <p style="margin: 0 0 16px 0; font-family: ${tokens.displayFont}; font-size: 18px; font-weight: 700; color: ${tokens.darkTeal};">
        ${escapeHtml(alertSummary)}
      </p>
      ${shown.map(renderListingRow).join('')}
      ${more > 0 ? `<p style="margin: 4px 0 0 0; font-family: ${tokens.bodyFont}; font-size: 13px; color: ${tokens.mutedText};">+ ${more} more</p>` : ''}
      <p style="margin: 14px 0 0 0;">
        <a href="${escapeHtml(alertUrl)}" style="font-family: ${tokens.bodyFont}; font-size: 13px; font-weight: 600; color: ${tokens.spruce};">View all matches →</a>
      </p>
    </div>
  `.trim();
}

module.exports = {
  id: '11-alert-match',

  subject(vars) {
    const n = Number(vars.totalMatchCount) || 0;
    if (n === 1) return '1 new match for your Benchlot alert';
    return `${n} new matches for your Benchlot alerts`;
  },

  render(vars) {
    const {
      displayName = '',
      matches = [],
      totalMatchCount = 0,
      manageAlertsUrl = url('/alerts'),
      unsubscribeUrl = url('/settings'),
    } = vars;

    const greeting = displayName ? paragraph(`${displayName},`) : '';
    const intro = paragraph(
      `${totalMatchCount} new tool${totalMatchCount === 1 ? '' : 's'} showed up ` +
      `in the index since we last checked your alert${matches.length === 1 ? '' : 's'}. ` +
      `Click any listing to open it at its original source.`
    );

    const blocks = matches.map(renderAlertBlock).join('');

    const bodyHtml = `
      ${greeting}
      ${intro}
      ${blocks}
      ${secondaryLink({ label: 'Manage your alerts', href: manageAlertsUrl })}
      ${paragraph('— Benchlot')}
      <p style="margin: 24px 0 0 0; font-family: ${tokens.bodyFont}; font-size: 11px; color: ${tokens.mutedText};">
        You're getting this because you saved search alerts on Benchlot.
        <a href="${escapeHtml(unsubscribeUrl)}" style="color: ${tokens.mutedText}; text-decoration: underline;">Manage email preferences</a>.
      </p>
    `.trim();

    const html = renderShell({
      preheader: `${totalMatchCount} new match${totalMatchCount === 1 ? '' : 'es'} across your Benchlot alerts.`,
      bodyHtml,
    });

    return { html, text: htmlToText(html) };
  },
};
