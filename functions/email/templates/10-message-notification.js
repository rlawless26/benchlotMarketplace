/**
 * Template 10: Message Notification
 *
 * Sent when a recipient gets a new message in a conversation. Throttled
 * (60min per conversation per recipient) — but the throttle lives in the
 * Cloud Function trigger, not here.
 *
 * Variables:
 *   recipientName, senderName, toolTitle, messagePreview, conversationUrl
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
  id: '10-message-notification',

  subject(vars) {
    return `New message from ${vars.senderName || 'a buyer'} about ${vars.toolTitle || 'your listing'}`;
  },

  render(vars) {
    const {
      recipientName = '',
      senderName = 'A buyer',
      toolTitle = '',
      messagePreview = '',
      conversationUrl = url('/messages'),
    } = vars;

    const greeting = recipientName ? `${recipientName},` : 'Hi there,';

    // Quoted message preview card
    const previewCard = `
      <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%" style="margin: 16px 0; background-color: ${tokens.bone}; border-left: 3px solid ${tokens.honey}; border-radius: 0 ${tokens.cardRadius} ${tokens.cardRadius} 0;">
        <tr>
          <td style="padding: 16px 20px;">
            <p style="margin: 0; font-family: ${tokens.bodyFont}; font-size: 16px; line-height: 1.5; color: ${tokens.bodyText}; font-style: italic;">"${escapeHtml(messagePreview)}"</p>
          </td>
        </tr>
      </table>
    `.trim();

    const bodyHtml = `
      ${paragraph(greeting)}
      ${paragraph(`<strong>${escapeHtml(senderName)}</strong> sent you a message about <strong>${escapeHtml(toolTitle)}</strong>:`)}
      ${previewCard}
      ${primaryButton({ label: 'View Conversation', href: conversationUrl })}
      ${paragraph('— Benchlot')}
    `.trim();

    const html = renderShell({
      preheader: `${senderName}: ${messagePreview}`,
      bodyHtml,
    });

    return { html, text: htmlToText(html) };
  },
};
