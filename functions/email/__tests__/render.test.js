/**
 * Unit tests for the email render pipeline.
 *
 * These tests do NOT call Resend — they only verify that templates compile,
 * subjects interpolate correctly, conditional blocks render, and plaintext
 * fallbacks contain the same CTA URLs as the HTML version.
 *
 * Run with: npx jest functions/email/__tests__/render.test.js
 */

const path = require('path');

// Load templates directly so we don't drag in client.js (which requires firebase-admin).
const t01 = require('../templates/01-scan-welcome');
const t04 = require('../templates/04-listing-published');
const t05 = require('../templates/05-order-confirmation-buyer');
const t06 = require('../templates/06-new-order-seller');

describe('email templates — P0', () => {
  describe('01-scan-welcome', () => {
    const vars = {
      toolName: 'Stanley No. 4 Smoothing Plane',
      maker: 'Stanley',
      model: 'No. 4',
      era: '1948-1961',
      condition: 'Good',
      valueLow: '$45',
      valueHigh: '$75',
      confidence: 'High',
      scanPageUrl: 'https://benchlot.com/scan',
      setPasswordUrl: 'https://benchlot.com/auth/reset?oobCode=abc',
    };

    test('renders subject with tool name', () => {
      expect(t01.subject(vars)).toBe('Your Stanley No. 4 Smoothing Plane has been identified');
    });

    test('falls back to generic subject when toolName missing', () => {
      expect(t01.subject({})).toBe("Your tool has been identified — here's what it's worth");
    });

    test('renders html and text', () => {
      const out = t01.render(vars);
      expect(out.html).toContain('Stanley No. 4 Smoothing Plane');
      expect(out.html).toContain('$45 – $75');
      expect(out.html).toContain(vars.scanPageUrl);
      expect(out.text).toContain('Stanley No. 4 Smoothing Plane');
      expect(out.text).toContain(vars.scanPageUrl);
    });
  });

  describe('04-listing-published', () => {
    const baseVars = {
      sellerName: 'Rob',
      toolTitle: 'Stanley No. 5 Jack Plane',
      toolPrice: '$85.00',
      toolUrl: 'https://benchlot.com/tools/abc123',
      toolImageUrl: 'https://benchlot.com/img/abc.jpg',
    };

    test('subject includes tool title', () => {
      expect(t04.subject(baseVars)).toBe('Your listing is live: Stanley No. 5 Jack Plane');
    });

    test('does NOT render Stripe warning when stripeStatus is complete', () => {
      const out = t04.render({ ...baseVars, stripeStatus: 'complete' });
      expect(out.html).not.toContain('One more step to get paid');
      expect(out.html).not.toContain('Set Up Payouts');
    });

    test('DOES render Stripe warning when stripeStatus is incomplete', () => {
      const out = t04.render({
        ...baseVars,
        stripeStatus: 'incomplete',
        stripeOnboardUrl: 'https://benchlot.com/seller/onboarding',
      });
      expect(out.html).toContain('One more step to get paid');
      expect(out.html).toContain('Set Up Payouts');
      expect(out.html).toContain('https://benchlot.com/seller/onboarding');
    });

    test('renders the primary CTA pointing at toolUrl in both HTML and text', () => {
      const out = t04.render(baseVars);
      expect(out.html).toContain('View Your Listing');
      expect(out.html).toContain(baseVars.toolUrl);
      expect(out.text).toContain(baseVars.toolUrl);
    });

    test('includes the woodworker tips', () => {
      const out = t04.render(baseVars);
      expect(out.html).toMatch(/sole, sides, and any maker/);
    });
  });

  describe('05-order-confirmation-buyer', () => {
    const vars = {
      buyerName: 'Sam',
      toolTitle: 'Lie-Nielsen No. 4 Smoothing Plane',
      toolImageUrl: 'https://benchlot.com/img/lie-nielsen.jpg',
      orderTotal: '$285.00',
      shippingAddress: '123 Main St\nBoston, MA 02116',
      orderUrl: 'https://benchlot.com/orders/o1',
      sellerName: 'Rob',
      messageSellerUrl: 'https://benchlot.com/messages/conv1',
    };

    test('subject includes tool title', () => {
      expect(t05.subject(vars)).toBe('Order confirmed: Lie-Nielsen No. 4 Smoothing Plane');
    });

    test('renders multi-line shipping address as <br>-separated lines', () => {
      const out = t05.render(vars);
      expect(out.html).toContain('123 Main St<br>Boston, MA 02116');
    });

    test('CTA URL appears in both html and text', () => {
      const out = t05.render(vars);
      expect(out.html).toContain(vars.orderUrl);
      expect(out.text).toContain(vars.orderUrl);
      expect(out.text).toContain(vars.messageSellerUrl);
    });
  });

  describe('06-new-order-seller', () => {
    const vars = {
      sellerName: 'Rob',
      toolTitle: 'Stanley No. 5 Jack Plane',
      toolImageUrl: 'https://benchlot.com/img/stanley.jpg',
      salePrice: '$85.00',
      yourPayout: '$74.80',
      buyerName: 'Sam',
      shippingAddress: '456 Oak Ave\nCambridge, MA 02139',
      orderUrl: 'https://benchlot.com/seller/orders/o1',
      messageBuyerUrl: 'https://benchlot.com/messages/conv1',
    };

    test('celebratory subject', () => {
      expect(t06.subject(vars)).toBe('You made a sale! Stanley No. 5 Jack Plane');
    });

    test('renders both sale price and payout', () => {
      const out = t06.render(vars);
      expect(out.html).toContain('$85.00');
      expect(out.html).toContain('$74.80');
      expect(out.html).toMatch(/12% marketplace fee/);
    });

    test('explicit 3-business-day shipping expectation', () => {
      const out = t06.render(vars);
      expect(out.html).toMatch(/3 business days/);
    });

    test('CTA links resolve in both formats', () => {
      const out = t06.render(vars);
      expect(out.html).toContain(vars.orderUrl);
      expect(out.text).toContain(vars.orderUrl);
    });
  });
});
