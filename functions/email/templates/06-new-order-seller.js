/**
 * Template 6: New Order Notification (Seller)
 *
 * Sent when a buyer's payment creates an order. The seller's "it worked" moment.
 *
 * Variables (per email-templates/templates/06-new-order-seller.md):
 *   sellerName, toolTitle, toolImageUrl, salePrice, yourPayout, buyerName,
 *   shippingAddress, orderUrl, messageBuyerUrl
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
  id: '06-new-order-seller',

  subject(vars) {
    return `You made a sale! ${vars.toolTitle || ''}`.trim();
  },

  render(vars) {
    const {
      sellerName = '',
      toolTitle = '',
      toolImageUrl = '',
      salePrice = '',
      yourPayout = '',
      buyerName = '',
      shippingAddress = '',
      orderUrl = url('/seller/dashboard'),
      messageBuyerUrl = url('/messages'),
    } = vars;

    const greeting = sellerName ? `${sellerName},` : 'Hi there,';
    const formattedAddress = escapeHtml(shippingAddress).replace(/\n/g, '<br>');

    // Sale celebration card with payout breakdown
    const saleCard = `
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
            <p style="margin: 0 0 12px 0; font-family: ${tokens.displayFont}; font-size: 20px; font-weight: 700; color: ${tokens.spruce};">${escapeHtml(toolTitle)}</p>
            <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%">
              <tr><td style="padding: 4px 0; font-family: ${tokens.bodyFont}; font-size: 14px; color: ${tokens.bodyText};"><strong>Sale price:</strong> ${escapeHtml(salePrice)}</td></tr>
              <tr><td style="padding: 4px 0; font-family: ${tokens.bodyFont}; font-size: 16px; color: ${tokens.bodyText};"><strong>Your payout:</strong> <span style="color: ${tokens.honey}; font-weight: 700;">${escapeHtml(yourPayout)}</span> <span style="color: ${tokens.mutedText}; font-size: 13px;">(after Benchlot's 12% marketplace fee)</span></td></tr>
              ${buyerName ? `<tr><td style="padding: 4px 0; font-family: ${tokens.bodyFont}; font-size: 14px; color: ${tokens.bodyText};"><strong>Buyer:</strong> ${escapeHtml(buyerName)}</td></tr>` : ''}
              ${shippingAddress ? `<tr><td style="padding: 8px 0 4px 0; font-family: ${tokens.bodyFont}; font-size: 14px; color: ${tokens.bodyText};"><strong>Ship to:</strong><br>${formattedAddress}</td></tr>` : ''}
            </table>
          </td>
        </tr>
      </table>
    `.trim();

    const bodyHtml = `
      ${paragraph(greeting)}
      ${paragraph(`<strong>You sold your ${escapeHtml(toolTitle)} for ${escapeHtml(salePrice)}!</strong>`)}
      ${saleCard}
      ${primaryButton({ label: 'View Order & Add Tracking', href: orderUrl })}
      ${paragraph('<strong>Please ship within 3 business days.</strong> Once you add a tracking number, your buyer will be notified automatically.')}
      ${paragraph('Questions? Reply to this email.')}
      ${buyerName ? secondaryLink({ label: `Message ${buyerName}`, href: messageBuyerUrl }) : ''}
      ${paragraph('— Benchlot')}
    `.trim();

    const html = renderShell({
      preheader: `You sold ${toolTitle} for ${salePrice}. Your payout: ${yourPayout}.`,
      bodyHtml,
    });

    return { html, text: htmlToText(html) };
  },
};
