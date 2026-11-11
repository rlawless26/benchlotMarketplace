/**
 * HTML template → 1080×1350 PNG with Playwright.
 *
 * Templates are plain HTML files in render/templates with a very small
 * placeholder syntax ({{x}} escaped, {{{x}}} raw, {{#x}}…{{/x}} if truthy,
 * {{^x}}…{{/x}} if falsy). Fonts are the repo's static TTFs (web/assets/fonts)
 * served over file://, so the card uses exactly the faces the guide's share
 * cards use. Each card's HTML is written next to its PNG so a layout problem
 * can be opened in a browser and fixed by eye.
 */
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const config = require('../config');
const { REPO_ROOT } = require('../lib/env');
const { fetchImageDataUri } = require('../lib/images');

const TEMPLATE_DIR = path.join(__dirname, 'templates');
const FONT_DIR = path.join(REPO_ROOT, 'web', 'assets', 'fonts');

const fontCss = () => `
  @font-face { font-family: 'Petrona'; font-weight: 700; src: url('file://${path.join(FONT_DIR, 'petrona-700.ttf')}') format('truetype'); }
  @font-face { font-family: 'Outfit';  font-weight: 400; src: url('file://${path.join(FONT_DIR, 'outfit-400.ttf')}') format('truetype'); }
  @font-face { font-family: 'Outfit';  font-weight: 500; src: url('file://${path.join(FONT_DIR, 'outfit-500.ttf')}') format('truetype'); }
`;

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function renderTemplate(src, data) {
  let out = src.replace(/\{\{([#^])(\w+)\}\}([\s\S]*?)\{\{\/\2\}\}/g, (m, kind, key, body) => {
    const truthy = Boolean(data[key]);
    return (kind === '#') === truthy ? body : '';
  });
  out = out.replace(/\{\{\{(\w+)\}\}\}/g, (m, key) => String(data[key] ?? ''));
  out = out.replace(/\{\{(\w+)\}\}/g, (m, key) => esc(data[key]));
  return out;
}

const templates = {};
function template(name) {
  if (!templates[name]) templates[name] = fs.readFileSync(path.join(TEMPLATE_DIR, `${name}.html`), 'utf8');
  return templates[name];
}

/** The card's data with remote photos replaced by data URIs. */
async function resolveCardData(data) {
  const out = { ...data, fontCss: fontCss(), width: config.render.width, height: config.render.height };
  if (data.photo && /^https?:/.test(data.photo)) {
    const uri = await fetchImageDataUri(data.photo);
    if (!uri) throw new Error(`Photo failed to load: ${data.photo}`);
    out.photo = uri;
  }
  return out;
}

/**
 * Renders every card of every post. `posts` are rows from social_posts (or
 * the in-memory posts from generate, which carry `cards` directly).
 * Returns Map<postId, string[]> of PNG paths.
 */
async function renderPosts(posts, outDir, { log = console.log } = {}) {
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: config.render.width, height: config.render.height }, deviceScaleFactor: 1 });
  const result = new Map();
  try {
    for (const post of posts) {
      const cards = post.cards ?? post.payload?.cards ?? [];
      const files = [];
      for (let i = 0; i < cards.length; i++) {
        const card = cards[i];
        const base = `${String(post.id).padStart(4, '0')}-${post.post_type}${cards.length > 1 ? `-${i + 1}` : ''}`;
        const htmlPath = path.join(outDir, `${base}.html`);
        const pngPath = path.join(outDir, `${base}.png`);
        const html = renderTemplate(template(card.template), await resolveCardData(card.data));
        fs.writeFileSync(htmlPath, html);
        await page.goto(`file://${htmlPath}`, { waitUntil: 'load' });
        await page.evaluate(() => document.fonts.ready);
        await page.screenshot({ path: pngPath, clip: { x: 0, y: 0, width: config.render.width, height: config.render.height } });
        files.push(pngPath);
      }
      result.set(post.id, files);
      log(`rendered ${post.post_type} #${post.id} (${files.length} image${files.length === 1 ? '' : 's'})`);
    }
  } finally {
    await browser.close();
  }
  return result;
}

module.exports = { renderPosts, renderTemplate };
