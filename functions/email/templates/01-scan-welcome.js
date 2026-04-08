/**
 * Template 1: Scan Welcome
 *
 * Sent when a user enters their email on /scan after a successful tool ID.
 * Anchors the scan-to-save acquisition funnel.
 *
 * Variables (per email-templates/templates/01-scan-welcome.md):
 *   toolName, maker, model, era, condition, valueLow, valueHigh, confidence,
 *   scanPageUrl, setPasswordUrl
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
  id: '01-scan-welcome',

  subject(vars) {
    const name = vars.toolName ? vars.toolName.trim() : '';
    return name
      ? `Your ${name} has been identified`
      : 'Your tool has been identified — here\'s what it\'s worth';
  },

  render(vars) {
    const {
      toolName = '',
      maker = '',
      model = '',
      era = '',
      condition = '',
      valueLow = '',
      valueHigh = '',
      confidence = '',
      scanPageUrl,
      setPasswordUrl,
    } = vars;

    const subtitleParts = [maker, model, era].filter(Boolean);
    const subtitle = subtitleParts.join(' · ');
    const valueRange = valueLow && valueHigh ? `${valueLow} – ${valueHigh}` : (valueLow || valueHigh || '');

    // Custom card for scan results — has more fields than the generic contentCard
    const card = `
      <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%" style="margin: 16px 0; background-color: ${tokens.bone}; border: 1px solid ${tokens.cardBorder}; border-radius: ${tokens.cardRadius};">
        <tr>
          <td style="padding: 20px;">
            <p style="margin: 0 0 4px 0; font-family: ${tokens.displayFont}; font-size: 22px; font-weight: 700; color: ${tokens.spruce};">${escapeHtml(toolName)}</p>
            ${subtitle ? `<p style="margin: 0 0 12px 0; font-family: ${tokens.bodyFont}; font-size: 14px; color: ${tokens.mutedText};">${escapeHtml(subtitle)}</p>` : ''}
            <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%">
              ${condition ? `<tr><td style="padding: 4px 0; font-family: ${tokens.bodyFont}; font-size: 14px; color: ${tokens.bodyText};"><strong>Condition:</strong> ${escapeHtml(condition)}</td></tr>` : ''}
              ${valueRange ? `<tr><td style="padding: 4px 0; font-family: ${tokens.bodyFont}; font-size: 14px; color: ${tokens.bodyText};"><strong>Estimated value:</strong> <span style="color: ${tokens.honey}; font-weight: 700;">${escapeHtml(valueRange)}</span></td></tr>` : ''}
              ${confidence ? `<tr><td style="padding: 4px 0; font-family: ${tokens.bodyFont}; font-size: 14px; color: ${tokens.bodyText};"><strong>Confidence:</strong> ${escapeHtml(confidence)}</td></tr>` : ''}
            </table>
          </td>
        </tr>
      </table>
    `.trim();

    const bodyHtml = `
      ${paragraph('Hi there,')}
      ${paragraph('We identified your tool:')}
      ${card}
      ${paragraph('It\'s saved in your Tool Chest on Benchlot.')}
      ${primaryButton({ label: 'Scan Another Tool', href: scanPageUrl || url('/scan') })}
      ${paragraph('When Benchlot\'s marketplace goes live, you\'ll be able to list this tool for sale with one click. We\'ll let you know when it\'s time.')}
      ${paragraph('In the meantime, you can set up your account password anytime:')}
      ${setPasswordUrl ? secondaryLink({ label: 'Set Your Password', href: setPasswordUrl }) : ''}
      ${paragraph('— Rob, Benchlot')}
      ${paragraph(`<em style="color: ${tokens.mutedText};">P.S. Got more tools? The scanner works on bench planes, chisels, hand saws, spokeshaves, and more. The more you scan, the more your Tool Chest is worth.</em>`)}
    `.trim();

    const html = renderShell({
      preheader: toolName
        ? `Your ${toolName} has been identified and saved to your Tool Chest.`
        : 'Your tool has been identified and saved to your Tool Chest.',
      bodyHtml,
    });

    return { html, text: htmlToText(html) };
  },
};
