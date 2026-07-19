const fs = require('fs');
const os = require('os');
const path = require('path');
const zlib = require('zlib');

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

async function getRuntimeCache() {
  const { getCache } = await import('@vercel/functions');
  return getCache({ namespace: 'dailyslop' });
}

async function readSharedCache(key, maxAgeMs) {
  if (!process.env.VERCEL) return readCache(key, maxAgeMs);

  try {
    const envelope = await (await getRuntimeCache()).get(key);
    if (
      envelope &&
      Number.isFinite(envelope.cachedAt) &&
      Date.now() - envelope.cachedAt <= maxAgeMs
    ) {
      if (envelope.encoding === 'gzip-base64' && typeof envelope.value === 'string') {
        return JSON.parse(
          zlib.gunzipSync(Buffer.from(envelope.value, 'base64')).toString('utf8')
        );
      }
      return envelope.value;
    }
  } catch {
    // Fall through to the per-instance cache if Runtime Cache is unavailable.
  }

  return readCache(key, maxAgeMs);
}

async function writeSharedCache(key, value, retentionMs) {
  if (!process.env.VERCEL) {
    writeCache(key, value);
    return;
  }

  try {
    const compressed = zlib
      .gzipSync(JSON.stringify(value))
      .toString('base64');
    await (await getRuntimeCache()).set(
      key,
      {
        cachedAt: Date.now(),
        encoding: 'gzip-base64',
        value: compressed,
      },
      {
        name: key,
        ttl: Math.max(1, Math.ceil(retentionMs / 1000)),
      }
    );
    return;
  } catch {
    // Retain best-effort caching if Runtime Cache is temporarily unavailable.
  }

  writeCache(key, value);
}

module.exports = {
  readCache,
  writeCache,
  readSharedCache,
  writeSharedCache,
};
