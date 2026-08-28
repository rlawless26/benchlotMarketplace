/**
 * Alerts without accounts.
 *
 * An alert is an email address, a tool cluster, and two unguessable tokens —
 * one to confirm, one to unsubscribe. There is no login, no password, and no
 * user record. Per BENCHLOT-HANDOFF.md §4, and because the r/handtools thread
 * that drove the only real traffic this product has had made a point of
 * "no signup needed".
 */
import { randomBytes } from 'crypto';
import { sql } from './db';

/** Unguessable bearer token. 32 bytes -> 64 hex chars. */
const token = () => randomBytes(32).toString('hex');

/**
 * Permissive on purpose. Strict RFC-5322 validation rejects addresses that
 * work, and the confirmation step is what actually proves an address is real —
 * this only catches typos and obvious junk.
 */
export function isPlausibleEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) && v.length <= 254;
}

export type AlertInput = {
  email: string;
  canonical_type: string;
  canonical_brand: string;
  canonical_size?: string | null;
  max_price_cents?: number | null;
};

export type CreateResult =
  | { status: 'created'; confirmToken: string }
  | { status: 'already_confirmed' }
  | { status: 'resent'; confirmToken: string }
  | { status: 'rate_limited' };

/** How many unconfirmed alerts one address may hold before we stop sending. */
const MAX_UNCONFIRMED_PER_EMAIL = 5;

export async function createAlert(input: AlertInput): Promise<CreateResult> {
  const email = input.email.trim().toLowerCase();

  // Without an account, nothing stops someone signing up a stranger's address.
  // Cap the blast radius per address.
  const [{ n }] = await sql<{ n: string }>(
    `SELECT count(*)::text AS n FROM alerts
      WHERE lower(email) = $1 AND confirmed_at IS NULL`,
    [email]
  );
  if (Number(n) >= MAX_UNCONFIRMED_PER_EMAIL) return { status: 'rate_limited' };

  const existing = await sql<{ id: string; confirmed_at: string | null; confirm_token: string | null }>(
    `SELECT id, confirmed_at, confirm_token FROM alerts
      WHERE lower(email) = $1
        AND coalesce(canonical_type,'')  = coalesce($2,'')
        AND coalesce(canonical_brand,'') = coalesce($3,'')
        AND coalesce(canonical_size,'')  = coalesce($4,'')`,
    [email, input.canonical_type, input.canonical_brand, input.canonical_size ?? '']
  );

  if (existing.length > 0) {
    const row = existing[0];
    if (row.confirmed_at) return { status: 'already_confirmed' };
    // Unconfirmed duplicate: re-issue rather than create a second row, so a
    // lost confirmation email is recoverable without piling up rows.
    const t = token();
    await sql(`UPDATE alerts SET confirm_token = $2, created_at = now() WHERE id = $1`, [row.id, t]);
    return { status: 'resent', confirmToken: t };
  }

  const confirmToken = token();
  const summary = [input.canonical_brand, input.canonical_type, input.canonical_size]
    .filter(Boolean)
    .join(' ');

  await sql(
    `INSERT INTO alerts (email, query, filters, sort, hash, email_enabled,
                         unsubscribe_token, confirm_token,
                         canonical_type, canonical_brand, canonical_size, max_price_cents)
     VALUES ($1, $2, '{}'::jsonb, 'newest', $3, true, $4, $5, $6, $7, $8, $9)`,
    [email, summary, `cluster:${summary}`.toLowerCase(), token(), confirmToken,
     input.canonical_type, input.canonical_brand, input.canonical_size ?? null,
     input.max_price_cents ?? null]
  );

  return { status: 'created', confirmToken };
}

export type Alert = {
  id: string;
  email: string;
  canonical_type: string | null;
  canonical_brand: string | null;
  canonical_size: string | null;
  max_price_cents: number | null;
  confirmed_at: string | null;
  email_enabled: boolean;
  unsubscribe_token: string;
};

/** Confirm by token. Single-use: the token is cleared on success. */
export async function confirmAlert(t: string): Promise<Alert | null> {
  const rows = await sql<Alert>(
    `UPDATE alerts
        SET confirmed_at = coalesce(confirmed_at, now()),
            confirm_token = NULL,
            email_enabled = true
      WHERE confirm_token = $1
      RETURNING id, email, canonical_type, canonical_brand, canonical_size,
                max_price_cents, confirmed_at, email_enabled, unsubscribe_token`,
    [t]
  );
  return rows[0] ?? null;
}

/**
 * Unsubscribe by token. Idempotent, and deliberately does NOT delete the row:
 * an unsubscribe must stay recorded so a later signup can't silently resurrect
 * a address someone asked to be left alone.
 */
export async function unsubscribeAlert(t: string): Promise<Alert | null> {
  const rows = await sql<Alert>(
    `UPDATE alerts SET email_enabled = false
      WHERE unsubscribe_token = $1
      RETURNING id, email, canonical_type, canonical_brand, canonical_size,
                max_price_cents, confirmed_at, email_enabled, unsubscribe_token`,
    [t]
  );
  return rows[0] ?? null;
}

export function alertSummary(a: Pick<Alert, 'canonical_brand' | 'canonical_type' | 'canonical_size'>) {
  return [a.canonical_brand, a.canonical_type, a.canonical_size].filter(Boolean).join(' ');
}
