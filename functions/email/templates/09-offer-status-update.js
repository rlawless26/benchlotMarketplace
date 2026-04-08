/**
 * Template 9: Offer Status Update (Buyer)
 *
 * Sent when a seller responds to an offer. One template, three body branches
 * keyed off offerStatus = 'accepted' | 'countered' | 'declined'.
 * Each branch has its own subject line.
 *
 * Variables:
 *   buyerName, toolTitle, offerStatus, originalOffer, counterAmount,
 *   offerUrl, checkoutUrl
 */

const { renderShell } = require('../shell');
const {
  escapeHtml,
  paragraph,
  primaryButton,
  htmlToText,
  url,
} = require('../render');

module.exports = {
  id: '09-offer-status-update',

  subject(vars) {
    const { offerStatus, toolTitle = 'your tool', counterAmount = '' } = vars;
    if (offerStatus === 'accepted') {
      return `Your offer was accepted: ${toolTitle}`;
    }
    if (offerStatus === 'countered') {
      return `Counter offer on ${toolTitle}: ${counterAmount}`;
    }
    return `Offer update on your ${toolTitle}`;
  },

  render(vars) {
    const {
      buyerName = '',
      toolTitle = '',
      offerStatus = 'declined',
      originalOffer = '',
      counterAmount = '',
      offerUrl = url('/messages'),
      checkoutUrl = url('/checkout'),
    } = vars;

    const greeting = buyerName ? `${buyerName},` : 'Hi there,';

    let bodyContent;
    let preheader;

    if (offerStatus === 'accepted') {
      preheader = `Your offer of ${originalOffer} on ${toolTitle} was accepted. Complete payment within 72 hours.`;
      bodyContent = `
        ${paragraph(`<strong>Great news</strong> — your offer of ${escapeHtml(originalOffer)} on <strong>${escapeHtml(toolTitle)}</strong> was accepted!`)}
        ${primaryButton({ label: 'Complete Purchase', href: checkoutUrl })}
        ${paragraph('Please complete payment within 72 hours to secure the tool.')}
      `.trim();
    } else if (offerStatus === 'countered') {
      preheader = `The seller countered your offer with ${counterAmount}.`;
      bodyContent = `
        ${paragraph(`The seller countered your offer on <strong>${escapeHtml(toolTitle)}</strong>:`)}
        ${paragraph(`Your offer: ${escapeHtml(originalOffer)}<br>Counter: <strong style="color: #d4aa60;">${escapeHtml(counterAmount)}</strong>`)}
        ${primaryButton({ label: 'View & Respond', href: offerUrl })}
      `.trim();
    } else {
      preheader = `Your offer of ${originalOffer} on ${toolTitle} was declined. The tool is still available.`;
      bodyContent = `
        ${paragraph(`The seller declined your offer of ${escapeHtml(originalOffer)} on <strong>${escapeHtml(toolTitle)}</strong>.`)}
        ${paragraph('The tool is still available at the listed price. You can also make a new offer:')}
        ${primaryButton({ label: 'View Listing', href: offerUrl })}
      `.trim();
    }

    const bodyHtml = `
      ${paragraph(greeting)}
      ${bodyContent}
      ${paragraph('— Benchlot')}
    `.trim();

    const html = renderShell({ preheader, bodyHtml });
    return { html, text: htmlToText(html) };
  },
};
