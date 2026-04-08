/**
 * Shared HTML shell for all Benchlot transactional emails.
 *
 * Templates compose their body HTML and pass it to renderShell(). The shell
 * wraps the body in a Bone-background page with a white content card,
 * Benchlot wordmark header, and CAN-SPAM-compliant footer.
 *
 * All CSS is inline. Email clients strip <style> blocks.
 */

const tokens = require('./tokens');
const { escapeHtml, url } = require('./render');

// Wordmark — defaults to the same hosted PNG already used by the scan-results
// email. Override via BENCHLOT_WORDMARK_URL if you ever swap to an SVG / CDN.
const WORDMARK_URL = process.env.BENCHLOT_WORDMARK_URL || 'https://benchlot.com/images/benchlot-wordmark-spruce.png';

// TODO(rob): real physical mailing address for CAN-SPAM footer.
// Set BENCHLOT_MAILING_ADDRESS env var.
const MAILING_ADDRESS = process.env.BENCHLOT_MAILING_ADDRESS || 'Benchlot, Boston, MA';

/**
 * Render the email shell. Returns a complete HTML document string.
 *
 * @param {Object} opts
 * @param {string} opts.preheader - Hidden preview text shown in inbox lists.
 * @param {string} opts.bodyHtml  - The template's body HTML (table-based).
 * @param {string} [opts.unsubscribeUrl] - Per-recipient unsubscribe link. Falls back to a generic preferences URL.
 */
function renderShell({ preheader = '', bodyHtml = '', unsubscribeUrl }) {
  const unsubHref = unsubscribeUrl || url('/account/email-preferences');

  const header = WORDMARK_URL
    ? `<a href="${url('/')}" style="text-decoration: none;"><img src="${escapeHtml(WORDMARK_URL)}" alt="Benchlot" width="160" height="40" style="display: block; height: 40px; width: auto; border: 0;" /></a>`
    : `<a href="${url('/')}" style="font-family: ${tokens.displayFont}; font-size: 28px; font-weight: 800; color: ${tokens.spruce}; text-decoration: none; letter-spacing: -0.5px;">Benchlot</a>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="color-scheme" content="light only" />
  <meta name="supported-color-schemes" content="light only" />
  <title>Benchlot</title>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;700&family=Petrona:wght@700;800&display=swap" rel="stylesheet" />
</head>
<body style="margin: 0; padding: 0; background-color: ${tokens.bone}; font-family: ${tokens.bodyFont}; color: ${tokens.bodyText}; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">
  <!-- Preheader (hidden from rendered body, shown in inbox preview) -->
  <div style="display: none; max-height: 0; overflow: hidden; mso-hide: all; font-size: 1px; line-height: 1px; color: ${tokens.bone};">
    ${escapeHtml(preheader)}
  </div>

  <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%" bgcolor="${tokens.bone}" style="background-color: ${tokens.bone};">
    <tr>
      <td align="center" style="padding: 32px 16px;">
        <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%" style="max-width: ${tokens.contentMaxWidth};">
          <!-- Header -->
          <tr>
            <td align="center" style="padding: 0 0 24px 0;">
              ${header}
            </td>
          </tr>

          <!-- Content card -->
          <tr>
            <td bgcolor="${tokens.white}" style="background-color: ${tokens.white}; border: 1px solid ${tokens.cardBorder}; border-radius: ${tokens.cardRadius}; padding: ${tokens.cardPadding};">
              ${bodyHtml}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding: 24px 16px 0 16px; font-family: ${tokens.bodyFont}; font-size: 12px; color: ${tokens.spruce}; line-height: 1.6;">
              <p style="margin: 0 0 8px 0;">
                <a href="${url('/')}" style="color: ${tokens.spruce}; text-decoration: none; font-weight: 700;">Benchlot</a>
                — The woodworker's marketplace.
              </p>
              <p style="margin: 0 0 8px 0;">
                <a href="${escapeHtml(unsubHref)}" style="color: ${tokens.spruce}; text-decoration: underline;">Unsubscribe</a>
                ·
                <a href="${url('/account/email-preferences')}" style="color: ${tokens.spruce}; text-decoration: underline;">Email preferences</a>
              </p>
              <p style="margin: 0; color: ${tokens.mutedText};">
                ${escapeHtml(MAILING_ADDRESS)}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

module.exports = { renderShell };
