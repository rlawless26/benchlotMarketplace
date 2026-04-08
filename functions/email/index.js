/**
 * Public email API for Benchlot Cloud Functions.
 *
 * Single entry point: sendEmail({ templateId, to, vars, replyTo }).
 *
 * Templates live in ./templates and export { id, subject(vars), render(vars) }.
 * sendEmail loads the template by id, generates the subject + HTML + text,
 * then hands off to client.deliver() which handles Resend, retry, and the
 * email_log collection.
 *
 * Sends are fire-and-forget from the trigger's perspective — failures are
 * logged but never thrown back to the caller. Triggers should not block on
 * email delivery.
 */

const path = require('path');
const fs = require('fs');
const { deliver } = require('./client');

// Load every template file in ./templates exactly once at module load.
// Each file's `id` field is the lookup key.
const templates = {};
function loadTemplates() {
  const dir = path.join(__dirname, 'templates');
  if (!fs.existsSync(dir)) return;
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith('.js')) continue;
    const tpl = require(path.join(dir, file));
    if (!tpl || !tpl.id) {
      console.error(`[email] template ${file} missing required "id" field`);
      continue;
    }
    templates[tpl.id] = tpl;
  }
}
loadTemplates();

/**
 * Send a transactional email.
 *
 * @param {Object} opts
 * @param {string} opts.templateId - e.g. '04-listing-published'
 * @param {string|string[]} opts.to - Recipient email(s)
 * @param {Object} opts.vars - Variables consumed by the template
 * @param {string} [opts.replyTo] - Optional reply-to override
 *
 * @returns {Promise<{status: string, messageId?: string, error?: string}>}
 */
async function sendEmail({ templateId, to, vars = {}, replyTo }) {
  if (!templateId) {
    console.error('[email] sendEmail called without templateId');
    return { status: 'failed', error: 'missing templateId' };
  }
  if (!to) {
    console.error(`[email] sendEmail(${templateId}) called without recipient`);
    return { status: 'failed', error: 'missing recipient' };
  }

  const tpl = templates[templateId];
  if (!tpl) {
    console.error(`[email] unknown template id: ${templateId}`);
    return { status: 'failed', error: `unknown template: ${templateId}` };
  }

  let subject, rendered;
  try {
    subject = typeof tpl.subject === 'function' ? tpl.subject(vars) : String(tpl.subject || '');
    rendered = tpl.render(vars);
  } catch (err) {
    console.error(`[email] render error for ${templateId}: ${err.message}`);
    return { status: 'failed', error: `render error: ${err.message}` };
  }

  if (!rendered || !rendered.html || !rendered.text) {
    console.error(`[email] template ${templateId} did not return { html, text }`);
    return { status: 'failed', error: 'template returned incomplete render' };
  }

  return deliver({
    templateId,
    to,
    subject,
    html: rendered.html,
    text: rendered.text,
    vars,
    replyTo,
  });
}

module.exports = { sendEmail };
