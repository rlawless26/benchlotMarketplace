/**
 * Transactional email, via Resend.
 *
 * Every send is recorded in `email_sends` — the Postgres equivalent of the
 * Firestore `email_log`. That table was the only reason we could answer "did
 * an alert email ever actually go out?" during the migration, so the new path
 * keeps the same discipline.
 *
 * Honours EMAIL_DRY_RUN like the Cloud Functions client: log the attempt,
 * never call Resend. Useful for local work and for a first deploy.
 */
import { Resend } from 'resend';
import { sql } from './db';

const FROM = process.env.RESEND_FROM_ADDRESS || 'Benchlot <notifications@benchlot.com>';
const REPLY_TO = process.env.RESEND_REPLY_TO || 'rob@benchlot.com';

function dryRun(): boolean {
  const v = process.env.EMAIL_DRY_RUN;
  return v === '1' || String(v).toLowerCase() === 'true';
}

export async function sendEmail(opts: {
  templateId: string;
  to: string;
  subject: string;
  html: string;
  vars?: Record<string, unknown>;
}): Promise<{ sent: boolean; dryRun?: boolean; id?: string; error?: string }> {
  const base = [opts.templateId, opts.to, opts.subject, JSON.stringify(opts.vars ?? {})];

  if (dryRun()) {
    await sql(
      `INSERT INTO email_sends (template_id, to_address, subject, vars, status, attempts, created_at)
       VALUES ($1,$2,$3,$4::jsonb,'dry-run',0,now())`, base);
    // Distinct from a failure: nothing was sent, but nothing is broken either.
    // Collapsing the two makes a dry run look like an outage to every caller.
    return { sent: false, dryRun: true };
  }

  const key = process.env.RESEND_API_KEY;
  if (!key) {
    await sql(
      `INSERT INTO email_sends (template_id, to_address, subject, vars, status, attempts, error_message, created_at)
       VALUES ($1,$2,$3,$4::jsonb,'error',0,'RESEND_API_KEY is not set',now())`, base);
    return { sent: false, error: 'RESEND_API_KEY is not set' };
  }

  try {
    const resend = new Resend(key);
    const res = await resend.emails.send({
      from: FROM,
      to: opts.to,
      replyTo: REPLY_TO,
      subject: opts.subject,
      html: opts.html,
    });
    if (res.error) throw new Error(res.error.message);
    await sql(
      `INSERT INTO email_sends (template_id, to_address, subject, vars, status, attempts,
                                resend_message_id, created_at, sent_at)
       VALUES ($1,$2,$3,$4::jsonb,'sent',1,$5,now(),now())`, [...base, res.data?.id ?? null]);
    return { sent: true, id: res.data?.id };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await sql(
      `INSERT INTO email_sends (template_id, to_address, subject, vars, status, attempts, error_message, created_at)
       VALUES ($1,$2,$3,$4::jsonb,'error',1,$5,now())`, [...base, msg]);
    return { sent: false, error: msg };
  }
}

/** Benchlot-branded shell. Inline styles — email clients ignore stylesheets. */
export function emailShell(bodyHtml: string, footerHtml = ''): string {
  return `<!doctype html><html><body style="margin:0;padding:0;background:#f2f0eb;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f2f0eb;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
             style="max-width:520px;background:#f8f6f2;border:1px solid #e8e6e0;border-radius:8px;">
        <tr><td style="padding:28px 28px 8px;">
          <div style="font-family:Georgia,'Times New Roman',serif;font-size:20px;font-weight:600;color:#1a3030;">Benchlot</div>
        </td></tr>
        <tr><td style="padding:0 28px 28px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;
                       font-size:15px;line-height:1.55;color:#0c1c1e;">${bodyHtml}</td></tr>
      </table>
      <div style="max-width:520px;margin-top:16px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;
                  font-size:12px;line-height:1.5;color:#2a4a48;text-align:left;">
        ${footerHtml}
        <p style="margin:8px 0 0;">Benchlot indexes public listings and links back to the source.
        We don't broker sales, take a cut, or use affiliate links.</p>
      </div>
    </td></tr>
  </table></body></html>`;
}

export function confirmEmail(summary: string, confirmUrl: string) {
  return {
    subject: `Confirm your Benchlot alert for ${summary}`,
    html: emailShell(
      `<p style="margin:0 0 16px;">You asked to be told when a <strong>${summary}</strong> is listed.</p>
       <p style="margin:0 0 20px;">Confirm that this is your address and we'll start watching:</p>
       <p style="margin:0 0 20px;">
         <a href="${confirmUrl}" style="display:inline-block;background:#d4aa60;color:#0c1c1e;
            text-decoration:none;padding:11px 20px;border-radius:6px;font-weight:600;">Confirm this alert</a>
       </p>
       <p style="margin:0;color:#2a4a48;font-size:13px;">No account, no password. One email when something matches.</p>`,
      `<p style="margin:0;">If you didn't request this, ignore it — nothing was created and we won't email you again.</p>`
    ),
  };
}
