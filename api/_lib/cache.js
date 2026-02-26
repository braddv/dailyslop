const fs = require('fs');
const os = require('os');
const path = require('path');

function getCandidateDirs() {
  const out = [];

  if (process.env.PORTFOLIO_CACHE_DIR) out.push(process.env.PORTFOLIO_CACHE_DIR);

  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    out.push(path.join(os.tmpdir(), 'dailyslop-cache'));
  }

  out.push(path.join(process.cwd(), '.cache'));
  out.push(path.join(os.tmpdir(), 'dailyslop-cache'));

  return [...new Set(out)];
}

let resolvedDir = null;
let cacheEnabled = true;

function ensureCacheDir() {
  if (resolvedDir || !cacheEnabled) return resolvedDir;

  const candidates = getCandidateDirs();
  for (const dir of candidates) {
    try {
      fs.mkdirSync(dir, { recursive: true });
      resolvedDir = dir;
      return resolvedDir;
    } catch {
      // try next candidate
    }
  }

  cacheEnabled = false;
  return null;
}

function readCache(key, maxAgeMs) {
  const dir = ensureCacheDir();
  if (!dir) return null;

  const file = path.join(dir, `${key}.json`);
  try {
    if (!fs.existsSync(file)) return null;
    const stat = fs.statSync(file);
    if (Date.now() - stat.mtimeMs > maxAgeMs) return null;
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function writeCache(key, value) {
  const dir = ensureCacheDir();
  if (!dir) return;

  const file = path.join(dir, `${key}.json`);
  try {
    fs.writeFileSync(file, JSON.stringify(value), 'utf8');
  } catch {
    // Best-effort cache; ignore write errors so API still works.
  }
}

module.exports = { readCache, writeCache };
