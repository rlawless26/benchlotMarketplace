/**
 * Template 5: Order Confirmation (Buyer)
 *
 * Sent when a buyer's payment is confirmed via Stripe.
 *
 * Variables (per email-templates/templates/05-order-confirmation-buyer.md):
 *   buyerName, toolTitle, toolImageUrl, orderTotal, shippingAddress,
 *   orderUrl, sellerName, messageSellerUrl
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
  id: '05-order-confirmation-buyer',

  subject(vars) {
    return `Order confirmed: ${vars.toolTitle || 'your tool'}`;
  },

  render(vars) {
    const {
      buyerName = '',
      toolTitle = '',
      toolImageUrl = '',
      orderTotal = '',
      shippingAddress = '',
      orderUrl = url('/account/orders'),
      sellerName = 'the seller',
      messageSellerUrl = url('/messages'),
    } = vars;

    const greeting = buyerName ? `${buyerName},` : 'Hi there,';

    // Multi-line shipping address — preserve newlines as <br>
    const formattedAddress = escapeHtml(shippingAddress).replace(/\n/g, '<br>');

    // Custom order card — has fields the generic contentCard doesn't
    const orderCard = `
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
              <tr><td style="padding: 4px 0; font-family: ${tokens.bodyFont}; font-size: 14px; color: ${tokens.bodyText};"><strong>Total:</strong> <span style="color: ${tokens.honey}; font-weight: 700;">${escapeHtml(orderTotal)}</span></td></tr>
              ${shippingAddress ? `<tr><td style="padding: 4px 0; font-family: ${tokens.bodyFont}; font-size: 14px; color: ${tokens.bodyText};"><strong>Shipping to:</strong><br>${formattedAddress}</td></tr>` : ''}
              <tr><td style="padding: 4px 0; font-family: ${tokens.bodyFont}; font-size: 14px; color: ${tokens.bodyText};"><strong>Seller:</strong> ${escapeHtml(sellerName)}</td></tr>
            </table>
          </td>
        </tr>
      </table>
    `.trim();

    const bodyHtml = `
      ${paragraph(greeting)}
      ${paragraph('Your order is confirmed.')}
      ${orderCard}
      ${primaryButton({ label: 'View Order', href: orderUrl })}
      ${paragraph('Your seller will ship your tool and provide tracking. If you have questions about the tool, you can message them directly:')}
      ${secondaryLink({ label: `Message ${sellerName}`, href: messageSellerUrl })}
      ${paragraph('— Benchlot')}
    `.trim();

    const html = renderShell({
      preheader: `Your order for ${toolTitle} is confirmed. Total: ${orderTotal}.`,
      bodyHtml,
    });

    return { html, text: htmlToText(html) };
  },
};
