/**
 * Template 8: Offer Notification (Seller)
 *
 * Sent when a buyer submits a new offer on a listing.
 *
 * Variables:
 *   sellerName, toolTitle, toolImageUrl, listingPrice, offerAmount,
 *   buyerName, offerUrl
 */

const { renderShell } = require('../shell');
const tokens = require('../tokens');
const {
  escapeHtml,
  paragraph,
  primaryButton,
  htmlToText,
  url,
} = require('../render');

module.exports = {
  id: '08-offer-notification',

  subject(vars) {
    return `New offer on your ${vars.toolTitle || 'tool'}: ${vars.offerAmount || ''}`.trim();
  },

  render(vars) {
    const {
      sellerName = '',
      toolTitle = '',
      toolImageUrl = '',
      listingPrice = '',
      offerAmount = '',
      buyerName = 'A buyer',
      offerUrl = url('/messages'),
    } = vars;

    const greeting = sellerName ? `${sellerName},` : 'Hi there,';

    const offerCard = `
      <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%" style="margin: 16px 0; background-color: ${tokens.bone}; border: 1px solid ${tokens.cardBorder}; border-radius: ${tokens.cardRadius};">
        ${toolImageUrl ? `
        <tr>
          <td style="padding: 0;">
            <img src="${escapeHtml(toolImageUrl)}" alt="${escapeHtml(toolTitle)}" width="100%" style="display: block; width: 100%; max-width: 100%; height: auto; border-radius: 4px 4px 0 0;" />
          </td>
        </tr>
        ` : ''}
        <tr>
          <td style="padding: 20px;">
            <p style="margin: 0 0 8px 0; font-family: ${tokens.displayFont}; font-size: 18px; font-weight: 700; color: ${tokens.spruce};">${escapeHtml(toolTitle)}</p>
            <p style="margin: 0 0 4px 0; font-family: ${tokens.bodyFont}; font-size: 14px; color: ${tokens.mutedText};">Listed at ${escapeHtml(listingPrice)}</p>
            <p style="margin: 0; font-family: ${tokens.bodyFont}; font-size: 22px; font-weight: 700; color: ${tokens.honey};">Offer: ${escapeHtml(offerAmount)}</p>
          </td>
        </tr>
      </table>
    `.trim();

    const bodyHtml = `
      ${paragraph(greeting)}
      ${paragraph(`<strong>${escapeHtml(buyerName)}</strong> made an offer on your <strong>${escapeHtml(toolTitle)}</strong>:`)}
      ${offerCard}
      ${primaryButton({ label: 'Respond to Offer', href: offerUrl })}
      ${paragraph('You can accept, counter, or decline. Offers expire in 48 hours.')}
      ${paragraph('— Benchlot')}
    `.trim();

    const html = renderShell({
      preheader: `${buyerName} offered ${offerAmount} on your ${toolTitle}.`,
      bodyHtml,
    });

    return { html, text: htmlToText(html) };
  },
};
