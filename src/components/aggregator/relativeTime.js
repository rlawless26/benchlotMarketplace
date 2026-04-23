/**
 * Humanize a timestamp into the compact "Xm ago" / "Xh ago" / "Xd ago" form
 * the aggregator uses on result-card posted chips and live-index updates.
 * Accepts Firestore Timestamps (with toMillis()), Date instances, and
 * ISO/epoch values.
 */
export function relativeTime(value) {
  if (!value) return '';
  let ms;
  if (typeof value === 'number') ms = value;
  else if (value instanceof Date) ms = value.getTime();
  else if (typeof value.toMillis === 'function') ms = value.toMillis();
  else if (typeof value === 'string') ms = Date.parse(value);
  else if (value.seconds) ms = value.seconds * 1000;
  else return '';

  const diff = Math.max(0, Date.now() - ms);
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d ago`;
  const mo = Math.floor(day / 30);
  if (mo < 12) return `${mo}mo ago`;
  return `${Math.floor(mo / 12)}y ago`;
}
