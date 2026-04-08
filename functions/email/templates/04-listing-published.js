/**
 * Template 4: Listing Published (Seller Confirmation)
 *
 * Sent when a tool's status flips to 'active' (first photo uploaded after publish).
 * Critical for seller confidence — includes a Stripe payout warning if onboarding
 * is incomplete, mirroring the in-app StripeStatusBanner.
 *
 * Variables (per email-templates/templates/04-listing-published.md):
 *   sellerName, toolTitle, toolPrice, toolUrl, toolImageUrl, stripeStatus,
 *   stripeOnboardUrl
 */

const { renderShell } = require('../shell');
const {
  paragraph,
  primaryButton,
  contentCard,
  stripeWarningBlock,
  bulletList,
  htmlToText,
  url,
} = require('../render');

module.exports = {
  id: '04-listing-published',

  subject(vars) {
    return `Your listing is live: ${vars.toolTitle || 'your tool'}`;
  },

  render(vars) {
    const {
      sellerName = '',
      toolTitle = '',
      toolPrice = '',
      toolUrl = url('/'),
      toolImageUrl = '',
      stripeStatus = 'complete',
      stripeOnboardUrl = url('/seller/onboarding'),
    } = vars;

    const greeting = sellerName ? `${sellerName},` : 'Hi there,';

    const stripeBlock = stripeStatus === 'incomplete'
      ? stripeWarningBlock({ stripeOnboardUrl })
      : '';

    const tipsList = bulletList([
      'Make sure your photos are well-lit and show the sole, sides, and any maker\'s marks',
      'Respond to messages quickly — buyers in this community move fast',
      'Price competitively — check similar listings and recent sold prices',
    ]);

    const bodyHtml = `
      ${paragraph(greeting)}
      ${paragraph('Your listing is live on Benchlot:')}
      ${contentCard({ imageUrl: toolImageUrl, title: toolTitle, price: toolPrice })}
      ${primaryButton({ label: 'View Your Listing', href: toolUrl })}
      ${stripeBlock}
      ${paragraph('<strong>Tips for a quick sale:</strong>')}
      ${tipsList}
      ${paragraph('— Rob, Benchlot')}
    `.trim();

    const html = renderShell({
      preheader: stripeStatus === 'incomplete'
        ? `Your ${toolTitle} is live — but you still need to set up payouts to get paid.`
        : `Your ${toolTitle} is live on Benchlot.`,
      bodyHtml,
    });

    return { html, text: htmlToText(html) };
  },
};
