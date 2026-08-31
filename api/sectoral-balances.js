const seed = require('../public/sectoral-balances/data/sectoral-balances.json');
const { readSharedCache, writeSharedCache } = require('./_lib/cache');
const { SERIES, buildPayload, parseFredCsv } = require('./_lib/sectoral-balances');

const CACHE_KEY = 'fred_sectoral_balances_v1';
const DAY_MS = 24 * 60 * 60 * 1000;
const FRESH_TTL_MS = 12 * 60 * 60 * 1000;
const STALE_TTL_MS = 30 * DAY_MS;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchSeries(definition) {
  const waits = [0, 350, 1000];
  let lastError;
  for (const wait of waits) {
    if (wait) await sleep(wait);
    try {
      const url = `https://fred.stlouisfed.org/graph/fredgraph.csv?id=${encodeURIComponent(definition.id)}`;
      const response = await fetch(url, {
        headers: {
          accept: 'text/csv,text/plain,*/*',
          'user-agent': 'DailySlop sectoral balances/1.0',
        },
      });
      if (!response.ok) throw new Error(`FRED ${definition.id} HTTP ${response.status}`);
      const values = parseFredCsv(await response.text(), definition.id);
      if (values.size < 20) throw new Error(`FRED ${definition.id} returned insufficient history`);
      return [definition.key, values];
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error(`FRED ${definition.id} failed`);
}

async function fetchFreshPayload() {
  const entries = await Promise.all(SERIES.map(fetchSeries));
  return buildPayload(Object.fromEntries(entries));
}

function validPayload(value) {
  return value?.success && Array.isArray(value.observations) && value.observations.length >= 100;
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=21600, stale-while-revalidate=86400');
  const refresh = String(req.query?.refresh || '').toLowerCase() === 'true';
  let payload = refresh ? null : await readSharedCache(CACHE_KEY, FRESH_TTL_MS);
  let cacheFresh = validPayload(payload);
  let refreshError = null;

  if (!cacheFresh) {
    try {
      payload = await fetchFreshPayload();
      cacheFresh = true;
      await writeSharedCache(CACHE_KEY, payload, STALE_TTL_MS);
    } catch (error) {
      refreshError = error;
      payload = await readSharedCache(CACHE_KEY, STALE_TTL_MS);
    }
  }

  if (!validPayload(payload)) payload = seed;
  if (!validPayload(payload)) {
    return res.status(502).json({ success: false, error: refreshError?.message || 'Sectoral-balance data unavailable' });
  }

  return res.status(200).json({
    ...payload,
    cacheFresh,
    source: cacheFresh ? payload.source : `${payload.source} · bundled fallback`,
    failures: refreshError ? [...(payload.failures || []), refreshError.message] : (payload.failures || []),
  });
};
