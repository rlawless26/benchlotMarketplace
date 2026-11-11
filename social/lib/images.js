/**
 * Remote listing photos, fetched once per process and handed to the renderer
 * as data URIs so the card never depends on a dealer's server at screenshot
 * time. A photo that cannot be fetched disqualifies the listing at pick time.
 */
const cache = new Map();

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36 Benchlot-social/1.0';
const MAX_BYTES = 12 * 1024 * 1024;

async function fetchImageDataUri(url) {
  if (!url) return null;
  if (cache.has(url)) return cache.get(url);
  let out = null;
  try {
    const res = await fetch(url, { headers: { 'user-agent': UA, accept: 'image/*,*/*;q=0.8' }, signal: AbortSignal.timeout(20_000), redirect: 'follow' });
    const type = (res.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
    if (res.ok && type.startsWith('image/')) {
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length > 0 && buf.length <= MAX_BYTES) out = `data:${type};base64,${buf.toString('base64')}`;
    }
  } catch (e) {
    console.warn(`[images] ${url}: ${e.message}`);
  }
  cache.set(url, out);
  return out;
}

module.exports = { fetchImageDataUri };
