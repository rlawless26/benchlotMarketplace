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
      scanUrl = url('/scan'),
      listToolUrl = url('/seller/onboard-and-list'),
    } = vars;

    const greeting = displayName ? paragraph(`${displayName},`) : '';

    const bodyHtml = `
      ${greeting}
      ${paragraph("Welcome to Benchlot — the woodworker's marketplace.")}
      ${paragraph("We're recruiting our first sellers. Got a tool sitting in the shop you'd be willing to part with? List it in about 5 minutes — no listing fees, you set the price.")}
      ${primaryButton({ label: 'List a Tool for Sale', href: listToolUrl })}
      ${paragraph("Not sure what a tool is worth? Snap a photo and our scanner will identify it and give you a value estimate:")}
      ${secondaryLink({ label: 'Scan a tool', href: scanUrl })}
      ${paragraph("We're early and growing. If you have feedback, ideas, or just want to talk shop, reply to this email.")}
      ${paragraph('— Rob, Benchlot')}
    `.trim();

    const html = renderShell({
      preheader: "Welcome to Benchlot. List a tool in about 5 minutes — no listing fees.",
      bodyHtml,
    });

    return { html, text: htmlToText(html) };
  },
};
