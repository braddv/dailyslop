const { readCache, writeCache } = require('./_lib/cache');
const FACTORSTODAY_URL = 'https://www.factorstoday.com/api/factors';
const FACTORSTODAY_LOADINGS_BASE = 'https://www.factorstoday.com/api/stock-loadings';

function normalizeFactorsTodayPayload(payload, tickers) {
  const ensureArray = (x) => (Array.isArray(x) ? x : []);
  const asRows = (x) => ensureArray(x).map((r) => ({ ...r }));

  if (Array.isArray(payload) && payload.length && !payload[0]?.symbol && !payload[0]?.ticker && tickers.length === 1) {
    return { [tickers[0]]: asRows(payload) };
  }

  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    const symbolFactorsPayload = payload.symbolFactors && typeof payload.symbolFactors === 'object'
      ? payload.symbolFactors
      : null;
    if (symbolFactorsPayload) {
      const nested = {};
      Object.keys(symbolFactorsPayload).forEach((k) => {
        if (Array.isArray(symbolFactorsPayload[k])) nested[String(k).toUpperCase()] = asRows(symbolFactorsPayload[k]);
      });
      if (Object.keys(nested).length) return nested;
    }

    const keyed = {};
    tickers.forEach((t) => {
      const candidate = payload[t] || payload[t.toLowerCase()];
      if (Array.isArray(candidate)) keyed[t] = asRows(candidate);
    });
    if (Object.keys(keyed).length) return keyed;
  }

  const rows = Array.isArray(payload) ? payload
    : Array.isArray(payload?.data) ? payload.data
      : Array.isArray(payload?.factors) ? payload.factors
        : [];
  const out = {};
  rows.forEach((r) => {
    const symbol = String(r?.symbol || r?.ticker || '').toUpperCase();
    if (!symbol) return;
    if (!out[symbol]) out[symbol] = [];
    out[symbol].push({ ...r, symbol });
  });
  const filtered = {};
  tickers.forEach((t) => {
    if (out[t]) filtered[t] = out[t];
  });
  return filtered;
}

async function fetchFactorsToday(tickers) {
  const key = process.env.FACTORSTODAY_API_KEY;
  if (!tickers.length) return { symbolFactors: {}, warning: null };

  const cacheKey = `factorstoday_${tickers.join('_')}`;
  const cached = readCache(cacheKey, 6 * 60 * 60 * 1000);
  if (cached) return { symbolFactors: cached, warning: null };

  const headers = {
    accept: 'application/json,text/plain,*/*',
  };
  if (key) {
    headers.authorization = `Bearer ${key}`;
    headers['x-api-key'] = key;
  }
  const symbolFactors = {};
  const failures = [];
  await Promise.all(tickers.map(async (ticker) => {
    try {
      const resp = await fetch(`${FACTORSTODAY_LOADINGS_BASE}/${encodeURIComponent(ticker)}`, { headers });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const payload = await resp.json();
      const normalized = normalizeFactorsTodayPayload(payload, [ticker]);
      symbolFactors[ticker] = normalized[ticker] || [];
    } catch (err) {
      failures.push(`${ticker}: ${err.message}`);
      symbolFactors[ticker] = [];
    }
  }));
  writeCache(cacheKey, symbolFactors);
  return { symbolFactors, warning: failures.length ? `FactorsToday loadings unavailable for ${failures.join(', ')}` : null };
}


async function fetchFactorsTodayCatalog() {
  const key = process.env.FACTORSTODAY_API_KEY;

  const cacheKey = 'factorstoday_catalog';
  const cached = readCache(cacheKey, 24 * 60 * 60 * 1000);
  if (cached) return { catalog: cached, warning: null };

  const url = `${FACTORSTODAY_URL.replace(/\/+$/, '')}/catalog`;
  const headers = {
    accept: 'application/json,text/plain,*/*',
  };
  if (key) {
    headers.authorization = `Bearer ${key}`;
    headers['x-api-key'] = key;
  }
  const resp = await fetch(url, {
    headers,
  });
  if (!resp.ok) throw new Error(`FactorsToday catalog HTTP ${resp.status}`);
  const payload = await resp.json();
  const rows = Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : Array.isArray(payload?.catalog) ? payload.catalog : [];
  writeCache(cacheKey, rows);
  return { catalog: rows, warning: null };
}

module.exports = async function handler(req, res) {
  try {
    const tickers = [...new Set(String(req.query?.tickers || '').split(',').map((t) => t.trim().toUpperCase()).filter(Boolean))];
    let symbolFactors = {};
    let factorsCatalog = [];
    const warnings = [];
    try {
      const ft = await fetchFactorsToday(tickers);
      symbolFactors = ft.symbolFactors || {};
      if (ft.warning) warnings.push(ft.warning);
    } catch (err) {
      warnings.push(`FactorsToday unavailable: ${err.message}`);
    }
    try {
      const cat = await fetchFactorsTodayCatalog();
      factorsCatalog = cat.catalog || [];
      if (cat.warning) warnings.push(cat.warning);
    } catch (err) {
      warnings.push(`FactorsToday catalog unavailable: ${err.message}`);
    }

    const hasSymbolFactors = Object.values(symbolFactors).some((rows) => Array.isArray(rows) && rows.length);
    return res.status(200).json({
      factors: [],
      hasMomentum: false,
      symbolFactors,
      factorsCatalog,
      warnings,
      factorPriority: hasSymbolFactors ? 'factorstoday' : 'factorstoday_unavailable',
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
