/**
 * Template 7: Shipping Confirmation (Buyer)
 *
 * Sent when a seller adds a tracking number to an order. The trackingUrl
 * link is conditional — only rendered if the carrier URL was resolvable.
 *
 * Variables:
 *   buyerName, toolTitle, trackingNumber, trackingUrl, carrier, orderUrl
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

module.exports = {
  id: '07-shipping-confirmation',

  subject(vars) {
    return `Your ${vars.toolTitle || 'tool'} has shipped!`;
  },

  render(vars) {
    const {
      buyerName = '',
      toolTitle = '',
      trackingNumber = '',
      trackingUrl = '',
      carrier = '',
      orderUrl = url('/account/orders'),
    } = vars;

    const greeting = buyerName ? `${buyerName},` : 'Hi there,';

    // Tracking info card
    const trackingCard = `
      <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%" style="margin: 16px 0; background-color: ${tokens.bone}; border: 1px solid ${tokens.cardBorder}; border-radius: ${tokens.cardRadius};">
        <tr>
          <td style="padding: 20px;">
            <p style="margin: 0 0 4px 0; font-family: ${tokens.bodyFont}; font-size: 14px; color: ${tokens.mutedText};">Tracking number${carrier ? ` (${escapeHtml(carrier)})` : ''}</p>
            <p style="margin: 0; font-family: ${tokens.bodyFont}; font-size: 18px; font-weight: 700; color: ${tokens.spruce};">${escapeHtml(trackingNumber)}</p>
          </td>
        </tr>
      </table>
    `.trim();

    const bodyHtml = `
      ${paragraph(greeting)}
      ${paragraph(`Your <strong>${escapeHtml(toolTitle)}</strong> is on its way.`)}
      ${trackingCard}
      ${trackingUrl ? secondaryLink({ label: 'Track Your Package', href: trackingUrl }) : ''}
      ${primaryButton({ label: 'View Order', href: orderUrl })}
      ${paragraph('— Benchlot')}
    `.trim();

    const html = renderShell({
      preheader: `${toolTitle} shipped via ${carrier || 'carrier'}. Tracking: ${trackingNumber}`,
      bodyHtml,
    });

    return { html, text: htmlToText(html) };
  },
};
