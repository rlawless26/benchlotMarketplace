/**
 * Alert matcher.
 *
 * Finds listings first seen since each alert was last notified, and sends one
 * digest per alert. In Firestore this was a paginated read-then-filter loop
 * over every saved search (functions/alerts/matcher.js); here the predicate is
 * a single indexed query per alert.
 *
 * The watermark is `last_sent_at`, falling back to `confirmed_at` — never to
 * the alert's creation time. Someone who confirms today should not receive a
 * backlog of everything indexed while they were deciding.
 */
import { sql } from './db';
import { sendEmail, emailShell } from './email';
import { SITE_URL } from './site';
import { alertSummary, type Alert } from './alerts';

const MAX_LISTINGS_PER_ALERT = 8;

type Match = {
  id: string;
  title_raw: string;
  price_cents: number | null;
  source_url: string;
  source_name: string;
  location_display: string | null;
};

type DueAlert = Alert & { last_sent_at: string | null };

async function dueAlerts(): Promise<DueAlert[]> {
  return sql<DueAlert>(
    `SELECT id, email, canonical_type, canonical_brand, canonical_size,
            max_price_cents, confirmed_at, email_enabled, unsubscribe_token, last_sent_at
       FROM alerts
      WHERE confirmed_at IS NOT NULL
        AND email_enabled
        AND canonical_type IS NOT NULL
        AND canonical_brand IS NOT NULL`
  );
}

async function matchesFor(a: DueAlert): Promise<Match[]> {
  const params: unknown[] = [a.canonical_type, a.canonical_brand, a.last_sent_at ?? a.confirmed_at];
  let extra = '';
  if (a.canonical_size) {
    params.push(a.canonical_size);
    extra += ` AND l.canonical_size = $${params.length}`;
  }
  if (a.max_price_cents != null) {
    params.push(a.max_price_cents);
    extra += ` AND l.price_cents <= $${params.length}`;
  }
  params.push(MAX_LISTINGS_PER_ALERT);

  return sql<Match>(
    `SELECT l.id::text, l.title_raw, l.price_cents, l.source_url,
            s.name AS source_name, l.location_display
       FROM listings l JOIN sources s ON s.id = l.source
      WHERE l.canonical_type = $1
        AND l.canonical_brand = $2
        AND l.status = 'active'
        AND l.first_seen_at > $3::timestamptz
        AND l.price_cents IS NOT NULL${extra}
      ORDER BY l.first_seen_at DESC
      LIMIT $${params.length}`,
    params
  );
}

const usd = (c: number | null) =>
  c == null ? '' : c >= 100000 ? `$${Math.round(c / 100).toLocaleString('en-US')}` : `$${(c / 100).toFixed(0)}`;

function digestHtml(summary: string, matches: Match[], unsubUrl: string, guideUrl: string) {
  const rows = matches
    .map(
      (m) => `<tr>
        <td style="padding:10px 0;border-top:1px solid #e8e6e0;">
          <a href="${m.source_url}" style="color:#1a3030;text-decoration:none;font-weight:500;">${m.title_raw}</a>
          <div style="color:#2a4a48;font-size:13px;margin-top:2px;">
            ${m.source_name}${m.location_display ? ` · ${m.location_display}` : ''}
          </div>
        </td>
        <td style="padding:10px 0;border-top:1px solid #e8e6e0;text-align:right;white-space:nowrap;
                   color:#b08a40;font-weight:600;">${usd(m.price_cents)}</td>
      </tr>`
    )
    .join('');

  return emailShell(
    `<p style="margin:0 0 4px;">${matches.length} new ${matches.length === 1 ? 'listing' : 'listings'} for</p>
     <p style="margin:0 0 16px;font-family:Georgia,serif;font-size:19px;color:#1a3030;font-weight:600;">${summary}</p>
     <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>
     <p style="margin:20px 0 0;">
       <a href="${guideUrl}" style="display:inline-block;background:#d4aa60;color:#0c1c1e;text-decoration:none;
          padding:10px 18px;border-radius:6px;font-weight:600;">See what these sell for</a>
     </p>`,
    `<p style="margin:0;"><a href="${unsubUrl}" style="color:#2a4a48;">Stop these emails</a></p>`
  );
}

function guidePath(a: DueAlert): string {
  const slug = (s: string | null) =>
    !s ? '_' : s.trim().toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || '_';
  const base = `/guide/${slug(a.canonical_type)}/${slug(a.canonical_brand)}`;
  return a.canonical_size ? `${base}/${slug(a.canonical_size)}` : base;
}

export async function runMatcher(): Promise<{
  alerts: number; notified: number; listings: number; errors: number; dryRun: boolean;
}> {
  const dryRun = process.env.EMAIL_DRY_RUN === '1' ||
    String(process.env.EMAIL_DRY_RUN).toLowerCase() === 'true';
  const alerts = await dueAlerts();
  let notified = 0, listings = 0, errors = 0;

  for (const a of alerts) {
    try {
      const matches = await matchesFor(a);
      if (matches.length === 0) continue;

      const summary = alertSummary(a);
      const unsubUrl = `${SITE_URL}/alerts/unsubscribe/${a.unsubscribe_token}`;
      const res = await sendEmail({
        templateId: '11-alert-match',
        to: a.email,
        subject: `${matches.length} new ${summary}${matches.length === 1 ? '' : ' listings'} on Benchlot`,
        html: digestHtml(summary, matches, unsubUrl, `${SITE_URL}${guidePath(a)}`),
        vars: { alertId: a.id, summary, count: matches.length },
      });

      // Only advance the watermark on a real send. A failed send must be
      // retried next run, not silently skipped — losing a digest is invisible
      // to us and looks like the alert simply never worked.
      //
      // A dry run is not a failure: it reports what WOULD go out and leaves the
      // watermark untouched so the same matches are still pending afterwards.
      if (res.sent) {
        await sql(`UPDATE alerts SET last_sent_at = now(), last_matched_at = now() WHERE id = $1`, [a.id]);
        notified++;
        listings += matches.length;
      } else if (res.dryRun) {
        notified++;
        listings += matches.length;
      } else {
        errors++;
      }
    } catch (e) {
      errors++;
      console.error('[matcher]', a.id, e instanceof Error ? e.message : e);
    }
  }

  return { alerts: alerts.length, notified, listings, errors, dryRun };
}
