/**
 * Environment for the social pipeline.
 *
 * In CI the variables come from repo secrets. Locally they come from the
 * same `web/.env.local` the Next app uses (gitignored), so there is one
 * place to keep DATABASE_URL and the Blob token. Nothing here overrides a
 * variable that is already set.
 */
const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');

function loadDotenv(file) {
  if (!fs.existsSync(file)) return;
  for (const raw of fs.readFileSync(file, 'utf8').split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq < 0) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

loadDotenv(path.join(REPO_ROOT, 'social', '.env.local'));
loadDotenv(path.join(REPO_ROOT, 'web', '.env.local'));

module.exports = { REPO_ROOT };
