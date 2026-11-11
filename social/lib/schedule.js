/**
 * Posting slots in the configured time zone.
 *
 * JavaScript has no zoned date type, so a wall-clock time in ET is turned
 * into an instant by guessing "same wall time in UTC" and correcting by the
 * zone's offset at that instant (twice, to land correctly on DST boundaries).
 */
const config = require('../config');

function tzOffsetMs(instantMs, timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(new Date(instantMs));
  const get = (t) => Number(parts.find((p) => p.type === t).value);
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
  return asUtc - Math.floor(instantMs / 1000) * 1000;
}

function zonedToUtc(y, m, d, hh, mm, timeZone = config.timezone) {
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  let t = guess - tzOffsetMs(guess, timeZone);
  const off2 = tzOffsetMs(t, timeZone);
  if (guess - off2 !== t) t = guess - off2;
  return new Date(t);
}

/** Calendar fields of an instant in the zone. */
function zonedParts(date, timeZone = config.timezone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short',
  }).formatToParts(date);
  const get = (t) => parts.find((p) => p.type === t).value;
  const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
  return { y: Number(get('year')), m: Number(get('month')), d: Number(get('day')), weekday };
}

/** ISO-ish week parity so "every other Sunday" is stable across batches. */
function weekParity(y, m, d) {
  const dayIndex = Math.floor(Date.UTC(y, m - 1, d) / 86_400_000);
  return Math.floor((dayIndex + 3) / 7) % 2; // +3 aligns the week to start on Sunday
}

/**
 * Slots from `start` (a local calendar date, inclusive) for `days` days.
 * Returns ascending Date instants.
 */
function slotsFrom(start, days = config.schedule.defaultDays) {
  const { weekdays, alternateWeekday, times } = config.schedule;
  const out = [];
  let idx = 0;
  const base = zonedParts(start);
  for (let i = 0; i < days; i++) {
    // Walk calendar days in the zone by adding days to a noon UTC anchor.
    const anchor = new Date(Date.UTC(base.y, base.m - 1, base.d + i, 12));
    const { y, m, d, weekday } = zonedParts(anchor);
    const isSlot = weekdays.includes(weekday) || (weekday === alternateWeekday && weekParity(y, m, d) === 0);
    if (!isSlot) continue;
    const [hh, mm] = times[idx % times.length].split(':').map(Number);
    out.push(zonedToUtc(y, m, d, hh, mm));
    idx++;
  }
  return out;
}

/** Local calendar date string YYYY-MM-DD of an instant in the zone. */
function localDateString(date) {
  const { y, m, d } = zonedParts(date);
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** Midday instant of a YYYY-MM-DD local date, for use as a `start`. */
function parseLocalDate(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) throw new Error(`Bad date "${s}", want YYYY-MM-DD`);
  return zonedToUtc(Number(m[1]), Number(m[2]), Number(m[3]), 12, 0);
}

module.exports = { slotsFrom, zonedToUtc, zonedParts, localDateString, parseLocalDate };
