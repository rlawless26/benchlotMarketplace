/**
 * Template 3: Welcome (Full Account Creation)
 *
 * Sent on users/{uid} onCreate when source !== 'scan' (scan welcome is T1).
 *
 * Variables:
 *   displayName, marketplaceUrl, scanUrl, listToolUrl
 */

const { renderShell } = require('../shell');
const {
  paragraph,
  primaryButton,
  secondaryLink,
  htmlToText,
  url,
} = require('../render');

module.exports = {
  id: '03-welcome-full-account',

  subject() {
    return 'Welcome to Benchlot';
  },

  render(vars) {
    const {
      displayName = '',
      marketplaceUrl = url('/marketplace'),
      scanUrl = url('/scan'),
      listToolUrl = url('/seller/onboard-and-list'),
    } = vars;

    const greeting = displayName ? paragraph(`${displayName},`) : '';

    const bodyHtml = `
      ${greeting}
      ${paragraph("Welcome to Benchlot — the woodworker's marketplace.")}
      ${paragraph("Here's what you can do right now:")}
      ${primaryButton({ label: 'Browse the Marketplace', href: marketplaceUrl })}
      ${secondaryLink({ label: 'Scan a tool — get an instant ID and value estimate from a photo', href: scanUrl })}
      ${secondaryLink({ label: 'List a tool for sale — about 5 minutes, no listing fees', href: listToolUrl })}
      ${paragraph("We're early and growing. If you have feedback, ideas, or just want to talk shop, reply to this email.")}
      ${paragraph('— Rob, Benchlot')}
    `.trim();

    const html = renderShell({
      preheader: 'Welcome to Benchlot — the woodworker\'s marketplace.',
      bodyHtml,
    });

    return { html, text: htmlToText(html) };
  },
};
