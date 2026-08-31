const seed = require('../public/sectoral-balances/data/sectoral-balances.json');
const { readSharedCache, writeSharedCache } = require('./_lib/cache');
const { SERIES, buildPayload, parseFredCsvBundle } = require('./_lib/sectoral-balances');

const CACHE_KEY = 'fred_sectoral_balances_v1';
const DAY_MS = 24 * 60 * 60 * 1000;
const FRESH_TTL_MS = 12 * 60 * 60 * 1000;
const STALE_TTL_MS = 30 * DAY_MS;

async function fetchFreshPayload() {
  const ids = SERIES.map(({ id }) => encodeURIComponent(id)).join(',');
  const url = `https://fred.stlouisfed.org/graph/fredgraph.csv?id=${ids}`;
  const response = await fetch(url, {
    headers: {
      accept: 'text/csv,text/plain,*/*',
      'user-agent': 'DailySlop sectoral balances/1.0',
    },
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) throw new Error(`FRED bundle HTTP ${response.status}`);

  const seriesMaps = parseFredCsvBundle(await response.text());
  const incomplete = SERIES.filter(({ key }) => seriesMaps[key].size < 20);
  if (incomplete.length) {
    throw new Error(`FRED bundle missing history for ${incomplete.map(({ id }) => id).join(', ')}`);
  }
  return buildPayload(seriesMaps);
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

  // Ordinary page loads must never wait on six upstream FRED requests. Serve
  // the shared cache when it is warm and fall through to the bundled snapshot
  // immediately when it is not. Only an explicit refresh performs upstream
  // work and updates the shared cache for later visitors.
  if (refresh) {
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
