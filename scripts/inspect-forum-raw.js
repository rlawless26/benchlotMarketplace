#!/usr/bin/env node
/**
 * Pull a few raw HTML samples from Sawmill Creek and Woodnet listings that
 * have no images, and print every `<img>` selector path found in the post.
 * Goal: identify where images actually live so we can fix the parsers.
 */

const path = require('path');
const admin = require(path.join(__dirname, '..', 'functions', 'node_modules', 'firebase-admin'));
const cheerio = require(path.join(__dirname, '..', 'functions', 'node_modules', 'cheerio'));

if (!admin.apps.length) {
  const saPath = path.resolve(__dirname, '..', 'functions', 'service-account.json');
  admin.initializeApp({ credential: admin.credential.cert(require(saPath)) });
}

function describePath(el, $) {
  const parts = [];
  let cur = el;
  while (cur && cur.type === 'tag' && parts.length < 6) {
    const $cur = $(cur);
    let part = cur.name;
    const id = $cur.attr('id');
    const cls = $cur.attr('class');
    if (id) part += `#${id}`;
    else if (cls) part += `.${cls.split(/\s+/).filter(Boolean).slice(0, 2).join('.')}`;
    parts.unshift(part);
    cur = cur.parent;
  }
  return parts.join(' > ');
}

(async () => {
  const db = admin.firestore();

  for (const source of ['sawmillcreek', 'woodnet']) {
    console.log(`\n========== ${source.toUpperCase()} ==========\n`);
    const listingsSnap = await db.collection('externalListings')
      .where('source', '==', source)
      .where('status', '==', 'active')
      .limit(50)
      .get();

    // Pick listings where images is empty/missing
    const noImageDocs = listingsSnap.docs.filter((d) => {
      const imgs = d.data().images;
      return !Array.isArray(imgs) || imgs.length === 0;
    });
    const withImageDocs = listingsSnap.docs.filter((d) => {
      const imgs = d.data().images;
      return Array.isArray(imgs) && imgs.length > 0;
    });

    console.log(`Found ${noImageDocs.length} image-less, ${withImageDocs.length} with-image (of ${listingsSnap.size} sampled).`);

    // Inspect 3 longer image-less posts (likely have external links / attachments)
    const longerNoImage = noImageDocs
      .filter((d) => {
        return true; // we'll fetch raw later
      })
      .slice(0, 6);

    // Also peek at 2 with-image posts to confirm what working extraction looks like
    const sample = [...longerNoImage, ...withImageDocs.slice(0, 2)];

    for (const doc of sample) {
      const rawSnap = await db.collection('externalListingsRaw').doc(doc.id).get();
      if (!rawSnap.exists) {
        console.log(`  [${doc.id}] no raw doc`);
        continue;
      }
      const raw = rawSnap.data();
      const html = raw.raw?.body_html;
      const storedImages = raw.raw?.images || [];
      if (typeof html !== 'string') {
        console.log(`  [${doc.id}] no body_html (raw_format=${raw.raw_format}, keys=${Object.keys(raw.raw || {}).join(',')})`);
        continue;
      }
      const listingImages = doc.data().images || [];
      console.log(`\n--- ${doc.id} ${listingImages.length > 0 ? '(has ' + listingImages.length + ' images)' : '(no images)'} ---`);
      console.log(`  title: ${doc.data().title_raw?.slice(0, 80)}`);
      console.log(`  source_url: ${doc.data().source_url}`);
      console.log(`  body_html length: ${html.length}`);
      // Find external image links (imgur, photobucket, postimages, etc.)
      const externalImageLinks = (html.match(/https?:\/\/[^\s"'<>)]+\.(jpg|jpeg|png|gif|webp)/gi) || []);
      const imgurLinks = (html.match(/https?:\/\/(?:i\.)?imgur\.com\/[a-zA-Z0-9]+/g) || []);
      const photobucketLinks = (html.match(/https?:\/\/[^\s"'<>)]*photobucket\.com\/[^\s"'<>)]*/g) || []);
      if (externalImageLinks.length > 0) console.log(`  external image URLs in body: ${externalImageLinks.slice(0, 3).map(s => s.slice(0,80)).join(' | ')}`);
      if (imgurLinks.length > 0) console.log(`  imgur album/post links: ${imgurLinks.slice(0, 3).join(' | ')}`);
      if (photobucketLinks.length > 0) console.log(`  photobucket: ${photobucketLinks.slice(0, 2).join(' | ')}`);

      const $ = cheerio.load(html);
      const imgs = $('img').toArray();
      console.log(`  total <img> tags in raw HTML: ${imgs.length}`);

      // First 6 images with their selector paths and src
      imgs.slice(0, 6).forEach((img, i) => {
        const $img = $(img);
        const src = $img.attr('data-src') || $img.attr('src') || '(no src)';
        const cls = $img.attr('class') || '';
        const truncSrc = src.slice(0, 80);
        const path = describePath(img, $);
        console.log(`    [${i}] ${path}`);
        console.log(`        src=${truncSrc}${cls ? ' class=' + cls : ''}`);
      });

      // Look for attachment containers
      const attachSelectors = [
        'fieldset',
        '.bbCodeBlock',
        '.bbCodeAttachment',
        '.attachmentList',
        '.attachment',
        '.attach-image',
        '.post-image-box',
        '[data-media-id]',
        '.fr-img-wrap',
        'figure',
      ];
      console.log(`  Attachment-y containers found:`);
      for (const sel of attachSelectors) {
        const n = $(sel).length;
        if (n > 0) console.log(`    ${sel}: ${n}`);
      }
    }
  }

  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
