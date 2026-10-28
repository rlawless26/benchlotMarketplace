// Shared bootstrap for the repo-root scripts the ingest workflow runs.
//
// CI installs only functions/node_modules (ingest.yml "Install worker
// dependencies"), so a bare require('dotenv') or web/node_modules/pg crashes
// there with "Cannot find module". Resolve both from functions/ first and fall
// back to the normal lookup for local runs. Missing .env files are fine:
// dotenv ignores them, and CI passes everything through the environment.
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');

function fromFunctions(name) {
  try { return require(path.join(ROOT, 'functions', 'node_modules', name)); }
  catch { return require(name); }
}

function loadEnv(...files) {
  let dotenv;
  try { dotenv = fromFunctions('dotenv'); } catch { return; }
  for (const f of files) dotenv.config({ path: path.join(ROOT, f), quiet: true });
}

module.exports = { ROOT, fromFunctions, loadEnv };
