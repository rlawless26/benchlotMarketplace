/**
 * What this browser remembers about email asks. localStorage only, so it is
 * per device and can be empty or throw (private windows, blocked storage);
 * every helper swallows that and behaves as if nothing were stored.
 *
 * Two facts: the address that signed up once (so no page asks it to be typed
 * again), and which self-appearing prompts were dismissed (30 days).
 */
const EMAIL_KEY = 'bl_alert_email';
const DISMISS_PREFIX = 'bl_prompt_dismissed:';
const DISMISS_DAYS = 30;

function storage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

export function getAlertEmail(): string | null {
  try {
    return storage()?.getItem(EMAIL_KEY) || null;
  } catch {
    return null;
  }
}

const CHANGE_EVENT = 'benchlot:alert-email';

export function rememberAlertEmail(email: string): void {
  try {
    storage()?.setItem(EMAIL_KEY, email);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch {
    /* ignore */
  }
}

/**
 * For useSyncExternalStore: re-read after a signup in this tab (custom
 * event) or another tab (storage event), so every ask on the page switches
 * to one-tap together.
 */
export function subscribeAlertEmail(cb: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(CHANGE_EVENT, cb);
  window.addEventListener('storage', cb);
  return () => {
    window.removeEventListener(CHANGE_EVENT, cb);
    window.removeEventListener('storage', cb);
  };
}

export function isDismissed(key: string): boolean {
  try {
    const until = Number(storage()?.getItem(DISMISS_PREFIX + key) || 0);
    return until > Date.now();
  } catch {
    return false;
  }
}

export function dismiss(key: string, days = DISMISS_DAYS): void {
  try {
    storage()?.setItem(DISMISS_PREFIX + key, String(Date.now() + days * 86_400_000));
  } catch {
    /* ignore */
  }
}
