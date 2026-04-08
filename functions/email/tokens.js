/**
 * Benchlot brand tokens for email rendering.
 *
 * Mirrors src/index.css and email-templates/shared/email-design-system.md.
 * Email clients require inline CSS, so these are exported as JS constants
 * and consumed by shell.js + each template's render() function.
 */
module.exports = {
  // Brand colors
  spruce: '#1a3030',
  bone: '#f2f0eb',
  honey: '#d4aa60',
  darkTeal: '#0c1c1e',

  // Text + UI
  bodyText: '#333333',
  mutedText: '#666666',
  cardBorder: '#e5e3de',
  white: '#ffffff',

  // Status colors
  warningBg: '#fff8eb',
  warningBorder: '#d4aa60',
  warningText: '#0c1c1e',

  // Layout
  contentMaxWidth: '600px',
  cardPadding: '32px',
  cardRadius: '8px',
  ctaHeight: '48px',
  ctaRadius: '8px',

  // Fonts (with web-safe fallbacks — Google Fonts requested via <link> in shell)
  bodyFont: "'Outfit', Arial, Helvetica, sans-serif",
  displayFont: "'Petrona', Georgia, 'Times New Roman', serif",
};
