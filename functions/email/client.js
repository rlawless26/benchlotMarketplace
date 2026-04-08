/**
 * Resend client + delivery pipeline.
 *
 * Responsibilities:
 *  - Initialize a singleton Resend client lazily (so dry-run mode works
 *    without an API key in local dev / CI).
 *  - Send email with exponential backoff retry (3 attempts: 1s, 5s, 30s).
 *  - Write every send attempt to the `email_log` Firestore collection.
 *  - Honor EMAIL_DRY_RUN env var: log the payload, never call Resend.
 *
 * Public surface: deliver({ templateId, to, subject, html, text, vars, replyTo })
 */

const admin = require('firebase-admin');
const { Resend } = require('resend');

const FROM_ADDRESS = process.env.RESEND_FROM_ADDRESS || 'hello@benchlot.com';
const REPLY_TO = process.env.RESEND_REPLY_TO || 'rob@benchlot.com';
const RETRY_DELAYS_MS = [1000, 5000, 30000];

let _client = null;
function getClient() {
  if (_client) return _client;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    // Caller will hit this only if they actually try to send (not in dry-run).
    throw new Error('RESEND_API_KEY is not set');
  }
  _client = new Resend(apiKey);
  return _client;
}

function isDryRun() {
  const v = process.env.EMAIL_DRY_RUN;
  return v === 'true' || v === '1';
}

function db() {
  return admin.firestore();
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Write or update an email_log entry. Failures here are logged but never
 * propagated — observability shouldn't break sends.
 */
async function writeLog(logRef, fields) {
  try {
    if (logRef.exists === undefined) {
      // First write — set with initial fields
      await logRef.set({
        ...fields,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } else {
      await logRef.update(fields);
    }
  } catch (err) {
    console.error('[email] failed to write email_log:', err.message);
  }
}

/**
 * Deliver an already-rendered email. Templates handle subject + render;
 * this function only handles the send pipeline + logging.
 *
 * @param {Object} payload
 * @param {string} payload.templateId
 * @param {string|string[]} payload.to
 * @param {string} payload.subject
 * @param {string} payload.html
 * @param {string} payload.text
 * @param {Object} [payload.vars]    - Snapshotted to email_log for debugging.
 * @param {string} [payload.replyTo] - Override default reply-to.
 *
 * @returns {Promise<{status: string, messageId?: string, error?: string}>}
 */
async function deliver({ templateId, to, subject, html, text, vars, replyTo }) {
  const recipient = Array.isArray(to) ? to.join(',') : to;
  const logRef = db().collection('email_log').doc();

  const baseLog = {
    templateId,
    to: recipient,
    subject,
    vars: vars || null,
    attempts: 0,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  // Dry-run short-circuit
  if (isDryRun()) {
    console.log(`[email] DRY RUN — ${templateId} → ${recipient} :: "${subject}"`);
    await logRef.set({
      ...baseLog,
      status: 'dry-run',
      sentAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return { status: 'dry-run' };
  }

  // Initial queued log entry
  await logRef.set({ ...baseLog, status: 'queued' });

  let lastError = null;
  for (let attempt = 1; attempt <= RETRY_DELAYS_MS.length + 1; attempt++) {
    try {
      const client = getClient();
      const result = await client.emails.send({
        from: FROM_ADDRESS,
        to,
        subject,
        html,
        text,
        replyTo: replyTo || REPLY_TO,
      });

      // Resend SDK returns { data: { id }, error } shape
      if (result && result.error) {
        throw new Error(result.error.message || JSON.stringify(result.error));
      }
      const messageId = (result && result.data && result.data.id) || null;

      await writeLog(
        { update: (...args) => logRef.update(...args), exists: true },
        {
          status: 'sent',
          attempts: attempt,
          resendMessageId: messageId,
          sentAt: admin.firestore.FieldValue.serverTimestamp(),
        }
      );
      console.log(`[email] sent ${templateId} → ${recipient} (id=${messageId})`);
      return { status: 'sent', messageId };
    } catch (err) {
      lastError = err;
      console.error(`[email] attempt ${attempt} failed for ${templateId} → ${recipient}: ${err.message}`);
      if (attempt <= RETRY_DELAYS_MS.length) {
        await sleep(RETRY_DELAYS_MS[attempt - 1]);
      }
    }
  }

  await writeLog(
    { update: (...args) => logRef.update(...args), exists: true },
    {
      status: 'failed',
      attempts: RETRY_DELAYS_MS.length + 1,
      error: lastError ? lastError.message : 'unknown',
      failedAt: admin.firestore.FieldValue.serverTimestamp(),
    }
  );
  return { status: 'failed', error: lastError ? lastError.message : 'unknown' };
}

module.exports = { deliver, isDryRun, FROM_ADDRESS, REPLY_TO };
