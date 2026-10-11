/**
 * Pure formatting helpers with no imports, safe in client components.
 * price-guide.ts re-exports them for server code.
 */

export const money = (v: string | number | null | undefined) => {
  if (v === null || v === undefined) return null;
  const n = typeof v === 'string' ? parseFloat(v) : v;
  if (Number.isNaN(n)) return null;
  return n >= 1000
    ? `$${Math.round(n).toLocaleString('en-US')}`
    : `$${n % 1 === 0 ? n.toFixed(0) : n.toFixed(2)}`;
};

export const centsToMoney = (c: number | null) => (c === null ? null : money(c / 100));

/**
 * Strips dealer stock numbers and "AS OF <date>" suffixes from a listing
 * title: "Rare PRESTON No. 13935 Beader - 119406" -> "Rare PRESTON No. 13935
 * Beader". Model numbers inside the title ("No. 13935") are untouched because
 * the suffix has to trail a dash, equals or asterisk at the very end.
 */
export function cleanTitle(title: string): string {
  let s = title.replace(/\s+/g, ' ').trim();
  for (let i = 0; i < 3; i++) {
    const before = s;
    s = s
      .replace(/\s*[-–—=*]+\s*AS OF [A-Z]{3,9}\.?\s*\d{1,2}\s*$/i, '')
      .replace(/\s*[-–—=*]+\s*(EXCELSIOR\s+)?#?\d{4,6}[A-Z]{0,2}\s*$/, '')
      .replace(/\s*[-–—=*]+\s*$/, '')
      .trim();
    if (s === before) break;
  }
  return s || title;
}
