/**
 * Contact sheet: one scroll through a batch, in posting order, with the
 * rendered card, the time in ET, the caption and the first comment.
 */
const fs = require('node:fs');
const path = require('node:path');
const config = require('../config');
const { formatET } = require('../lib/text');

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function writeContactSheet(batch, posts, outDir) {
  const counts = {};
  for (const p of posts) counts[p.post_type] = (counts[p.post_type] ?? 0) + 1;
  const items = posts.map((p) => {
    const imgs = (p.images ?? []).map((f) => `<img src="${esc(path.relative(outDir, f))}" alt="">`).join('');
    const notes = (p.payload?.notes ?? []).map((n) => `<li>${esc(n)}</li>`).join('');
    return `
    <article class="post">
      <div class="cards">${imgs || '<div class="missing">not rendered</div>'}</div>
      <div class="meta">
        <div class="when">${esc(formatET(new Date(p.scheduled_for), config.timezone))} ET</div>
        <div class="type">${esc(p.payload?.label ?? p.post_type)} <span class="id">#${p.id}</span> <span class="status ${esc(p.status)}">${esc(p.status)}</span></div>
        <pre class="caption">${esc(p.caption)}</pre>
        <pre class="comment">${esc(p.first_comment)}</pre>
        ${p.payload?.source_url ? `<a class="src" href="${esc(p.payload.source_url)}" target="_blank" rel="noopener">source listing ↗</a>` : ''}
        ${p.payload?.guide_path ? `<a class="src" href="${esc(config.siteUrl + p.payload.guide_path)}" target="_blank" rel="noopener">guide page ↗</a>` : ''}
        ${notes ? `<ul class="notes">${notes}</ul>` : ''}
      </div>
    </article>`;
  }).join('\n');

  const summary = Object.entries(counts).map(([t, n]) => `${n} × ${t}`).join(' · ');
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Benchlot social · batch ${esc(batch.name)}</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  :root { color-scheme: light; }
  body { margin: 0; background: #f2f0eb; color: #0c1c1e; font: 15px/1.5 -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
  header { padding: 28px 32px 12px; border-bottom: 1px solid #e8e6e0; background: #f8f6f2; position: sticky; top: 0; z-index: 2; }
  h1 { margin: 0; font: 700 22px Georgia, serif; color: #1a3030; }
  header p { margin: 6px 0 0; color: #2a4a48; }
  main { max-width: 1180px; margin: 0 auto; padding: 24px 32px 80px; }
  .post { display: grid; grid-template-columns: 360px 1fr; gap: 28px; padding: 28px 0; border-bottom: 1px solid #e8e6e0; align-items: start; }
  .cards { display: flex; flex-direction: column; gap: 10px; }
  .cards img { width: 360px; height: 450px; display: block; border-radius: 8px; box-shadow: 0 2px 12px rgba(12,28,30,0.12); }
  .missing { width: 360px; height: 450px; border-radius: 8px; background: #e8e6e0; display: grid; place-items: center; color: #4a5a54; }
  .when { font-weight: 600; color: #1a3030; }
  .type { color: #2a4a48; margin-top: 2px; }
  .id { color: #8a948f; font-size: 13px; }
  .status { font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; padding: 2px 7px; border-radius: 4px; background: #e8e6e0; color: #4a5a54; margin-left: 6px; }
  .status.published { background: #d6ece4; color: #1a3030; }
  .status.failed { background: #f3d9d4; color: #a83a2a; }
  pre { white-space: pre-wrap; font: inherit; margin: 14px 0 0; padding: 14px 16px; background: #f8f6f2; border: 1px solid #e8e6e0; border-radius: 8px; }
  .comment { color: #2a5a6a; font-size: 13px; }
  .src { display: inline-block; margin: 12px 16px 0 0; color: #b08a40; }
  .notes { margin: 12px 0 0; padding-left: 18px; color: #4a5a54; font-size: 13px; }
  @media (max-width: 800px) { .post { grid-template-columns: 1fr; } .cards img, .missing { width: 100%; height: auto; aspect-ratio: 4/5; } }
</style></head>
<body>
<header>
  <h1>Benchlot on Instagram · batch ${esc(batch.name)}</h1>
  <p>${posts.length} posts from ${esc(batch.window_start instanceof Date ? batch.window_start.toISOString().slice(0, 10) : batch.window_start)} for ${esc(batch.window_days)} days · ${esc(summary)} · batch status: <strong>${esc(batch.status)}</strong></p>
</header>
<main>${items}</main>
</body></html>`;
  const file = path.join(outDir, 'preview.html');
  fs.writeFileSync(file, html);
  return file;
}

module.exports = { writeContactSheet };
