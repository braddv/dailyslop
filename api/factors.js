const { readCache, writeCache } = require('./_lib/cache');
const { extractFirstFileFromZip } = require('./_lib/zip');

const FF5_URL = 'https://mba.tuck.dartmouth.edu/pages/faculty/ken.french/ftp/F-F_Research_Data_5_Factors_2x3_daily_CSV.zip';
const MOM_URL = 'https://mba.tuck.dartmouth.edu/pages/faculty/ken.french/ftp/F-F_Momentum_Factor_daily_CSV.zip';
const FACTORSTODAY_URL = process.env.FACTORSTODAY_API_URL || 'https://www.factorstoday.com/api/factors';

function parseFrenchCsv(text, expectedHeaders) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const headerIndex = lines.findIndex((l) => expectedHeaders.every((h) => l.includes(h)));
  if (headerIndex === -1) throw new Error('Could not find factor CSV header');
  const headers = lines[headerIndex].split(',').map((h) => h.trim());
  const rows = [];

  for (let i = headerIndex + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (!/^\d{8},/.test(line)) break;
    const cols = line.split(',').map((c) => c.trim());
    const dateRaw = cols[0];
    const date = `${dateRaw.slice(0, 4)}-${dateRaw.slice(4, 6)}-${dateRaw.slice(6, 8)}`;
    const row = { date };
    for (let j = 1; j < headers.length && j < cols.length; j += 1) {
      row[headers[j]] = Number(cols[j]) / 100;
    }
    rows.push(row);
  }
  return rows;
}

async function fetchFrench(url, cacheKey, expectedHeaders) {
  const cached = readCache(cacheKey, 24 * 60 * 60 * 1000);
  if (cached) return cached;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Factor fetch failed: ${resp.status}`);
  const arr = Buffer.from(await resp.arrayBuffer());
  const csv = extractFirstFileFromZip(arr);
  const parsed = parseFrenchCsv(csv, expectedHeaders);
  writeCache(cacheKey, parsed);
  return parsed;
}

function normalizeFactorsTodayPayload(payload, tickers) {
  const rows = Array.isArray(payload) ? payload
    : Array.isArray(payload?.data) ? payload.data
      : Array.isArray(payload?.factors) ? payload.factors
        : [];
  const out = {};
  rows.forEach((r) => {
    const symbol = String(r?.symbol || r?.ticker || '').toUpperCase();
    if (!symbol) return;
    out[symbol] = {
      ...r,
      symbol,
    };
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

  const url = `${FACTORSTODAY_URL}?symbols=${encodeURIComponent(tickers.join(','))}`;
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
  if (!resp.ok) throw new Error(`FactorsToday HTTP ${resp.status}`);
  const payload = await resp.json();
  const normalized = normalizeFactorsTodayPayload(payload, tickers);
  writeCache(cacheKey, normalized);
  return { symbolFactors: normalized, warning: null };
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
    const ff5 = await fetchFrench(FF5_URL, 'ff5_daily', ['Mkt-RF', 'SMB', 'HML', 'RMW', 'CMA', 'RF']);
    let mom = null;
    let hasMomentum = false;
    try {
      mom = await fetchFrench(MOM_URL, 'ff_mom_daily', ['Mom']);
      hasMomentum = true;
    } catch {
      hasMomentum = false;
    }

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

    const momByDate = new Map((mom || []).map((r) => [r.date, r]));
    const merged = ff5.map((r) => ({
      date: r.date,
      'Mkt-RF': r['Mkt-RF'],
      SMB: r.SMB,
      HML: r.HML,
      RMW: r.RMW,
      CMA: r.CMA,
      RF: r.RF,
      MOM: hasMomentum && momByDate.get(r.date) ? momByDate.get(r.date).Mom : null,
    }));

    const hasSymbolFactors = Object.keys(symbolFactors).length > 0;
    return res.status(200).json({ factors: merged, hasMomentum, symbolFactors, factorsCatalog, warnings, factorPriority: hasSymbolFactors ? 'factorstoday' : 'ff_regression' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
