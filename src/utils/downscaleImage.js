/**
 * Shrink a photo in the browser before it is sent to /api/toolscan.
 *
 * Two reasons: Vercel functions reject request bodies over 4.5 MB, and the
 * model downsizes anything over 1568px on its longest edge anyway, so bytes
 * beyond that only cost upload time. Everything is re-encoded as JPEG, which
 * also turns HEIC from an iPhone into something the API accepts.
 *
 * The pure helpers are exported for tests; jsdom has no canvas, so the DOM
 * path takes an injectable `decode`.
 */

export const MAX_EDGE = 1568;
export const JPEG_QUALITY = 0.8;
export const MAX_IMAGES = 5;
/** Server-side backstop on the summed base64 length; keep client under it. */
export const MAX_TOTAL_BASE64 = 4_000_000;

export function targetSize(width, height, max = MAX_EDGE) {
  if (!(width > 0) || !(height > 0)) return { width: 0, height: 0 };
  if (width <= max && height <= max) return { width, height };
  const scale = max / Math.max(width, height);
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

/** Real format from the base64 header; browsers lie in file.type. */
export function sniffMediaType(base64, fallback = 'image/jpeg') {
  if (typeof base64 !== 'string') return fallback;
  if (base64.startsWith('UklGR')) return 'image/webp';
  if (base64.startsWith('/9j/')) return 'image/jpeg';
  if (base64.startsWith('iVBOR')) return 'image/png';
  return fallback;
}

export const dataUrlToBase64 = (dataUrl) => String(dataUrl).split(',')[1] || '';

export function unreadableMessage(file) {
  const name = file && file.name ? file.name : 'that photo';
  return `We couldn't read ${name}. If it's a HEIC file, convert it to JPEG first.`;
}

async function decodeFile(file) {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch (e) {
      // Fall through to the <img> path (older Safari, unsupported formats).
    }
  }
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('decode failed')); };
    img.src = url;
  });
}

/**
 * @param {File} file
 * @returns {Promise<{ data: string, media_type: 'image/jpeg', width: number, height: number }>}
 */
export async function downscaleImage(file, { decode = decodeFile } = {}) {
  let bitmap;
  try {
    bitmap = await decode(file);
  } catch (e) {
    throw new Error(unreadableMessage(file));
  }
  const srcW = bitmap.naturalWidth || bitmap.width;
  const srcH = bitmap.naturalHeight || bitmap.height;
  const { width, height } = targetSize(srcW, srcH);
  if (!width || !height) throw new Error(unreadableMessage(file));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error(unreadableMessage(file));
  ctx.drawImage(bitmap, 0, 0, width, height);
  if (typeof bitmap.close === 'function') bitmap.close();

  const data = dataUrlToBase64(canvas.toDataURL('image/jpeg', JPEG_QUALITY));
  if (!data) throw new Error(unreadableMessage(file));
  return { data, media_type: 'image/jpeg', width, height };
}

/** Downscale several files and refuse the batch if it would still be too big. */
export async function prepareImages(files, opts) {
  const images = await Promise.all(Array.from(files).map((f) => downscaleImage(f, opts)));
  const total = images.reduce((n, i) => n + i.data.length, 0);
  if (total > MAX_TOTAL_BASE64) {
    throw new Error('Those photos are too large even after shrinking. Try fewer photos.');
  }
  return images;
}
