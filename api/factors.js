const { readSharedCache, writeSharedCache } = require('./_lib/cache');

const BASE_URL = 'https://www.factorstoday.com/api';
const ONE_HOUR = 60 * 60 * 1000;
const TWELVE_HOURS = 12 * ONE_HOUR;
const ONE_DAY = 24 * ONE_HOUR;

function headers() {
  const output = { accept: 'application/json' };
  if (process.env.FACTORSTODAY_API_KEY) {
    output.authorization = `Bearer ${process.env.FACTORSTODAY_API_KEY}`;
    output['x-api-key'] = process.env.FACTORSTODAY_API_KEY;
  }
  return output;
}

async function fetchJson(path) {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: headers(),
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) throw new Error(`FactorsToday HTTP ${response.status}`);
  return response.json();
}

function normalizeResidualPayload(payload) {
  const stocks = Array.isArray(payload?.stocks) ? payload.stocks : [];
  const rows = stocks.length
    ? stocks
    : [...(Array.isArray(payload?.top) ? payload.top : []), ...(Array.isArray(payload?.bottom) ? payload.bottom : [])];
  const byTicker = {};
  rows.forEach((row) => {
    const ticker = String(row?.ticker || row?.symbol || '').toUpperCase();
    if (!ticker || byTicker[ticker]) return;
    byTicker[ticker] = {
      ticker,
      fullName: row.full_name || row.name || null,
      sector: row.sector || null,
      marketCap: Number.isFinite(Number(row.market_cap)) ? Number(row.market_cap) : null,
      close: Number.isFinite(Number(row.close)) ? Number(row.close) : null,
      cumulative21d: Number.isFinite(Number(row.cum_21d)) ? Number(row.cum_21d) : null,
      cumulative63d: Number.isFinite(Number(row.cum_63d)) ? Number(row.cum_63d) : null,
      cumulative126d: Number.isFinite(Number(row.cum_126d)) ? Number(row.cum_126d) : null,
      cumulative252d: Number.isFinite(Number(row.cum_252d)) ? Number(row.cum_252d) : null,
      trendTstat126d: Number.isFinite(Number(row.trend_tstat_126d)) ? Number(row.trend_tstat_126d) : null,
      momentumScore: Number.isFinite(Number(row.momentum_score)) ? Number(row.momentum_score) : null,
      decile: Number.isFinite(Number(row.decile)) ? Number(row.decile) : null,
      isTrending: Boolean(row.is_trending),
      trendDirection: Number.isFinite(Number(row.trend_direction)) ? Number(row.trend_direction) : null,
      hasResearch: Boolean(row.has_research),
      researchDate: row.research_date || null,
    };
  });
  return {
    asOfDate: payload?.as_of_date || null,
    model: payload?.model || 'Base + Sector',
    universeCount: Number(payload?.universe_count) || Object.keys(byTicker).length,
    byTicker,
  };
}

function normalizeLoadingsPayload(payload) {
  const rows = Array.isArray(payload) ? payload : Array.isArray(payload?.loadings) ? payload.loadings : [];
  const baseSector = rows.filter((row) => row.model_name === 'Base + Sector');
  const latestDate = baseSector.map((row) => row.date).filter(Boolean).sort().at(-1);
  return baseSector.filter((row) => !latestDate || row.date === latestDate).map((row) => ({
    factorName: row.factor_name || row.factor || row.name,
    beta: Number.isFinite(Number(row.beta)) ? Number(row.beta) : null,
    modelName: row.model_name || 'Base + Sector',
    date: row.date || null,
    rSquared: Number.isFinite(Number(row.r_squared ?? row.model_stats?.r_squared))
      ? Number(row.r_squared ?? row.model_stats?.r_squared) : null,
    adjustedRSquared: Number.isFinite(Number(row.adjusted_r_squared ?? row.model_stats?.adjusted_r_squared))
      ? Number(row.adjusted_r_squared ?? row.model_stats?.adjusted_r_squared) : null,
  })).filter((row) => row.factorName && row.beta !== null);
}

function normalizeSpecificVolatility(payload) {
  return {
    ticker: payload?.ticker || null,
    window: Number(payload?.window) || null,
    specific_vol_annual: Number.isFinite(Number(payload?.specific_vol_annual))
      ? Number(payload.specific_vol_annual) : null,
    specific_vol_daily: Number.isFinite(Number(payload?.specific_vol_daily))
      ? Number(payload.specific_vol_daily) : null,
    r_squared: Number.isFinite(Number(payload?.r_squared)) ? Number(payload.r_squared) : null,
    adjusted_r_squared: Number.isFinite(Number(payload?.adjusted_r_squared))
      ? Number(payload.adjusted_r_squared) : null,
  };
}

async function residualMomentum() {
  const cacheKey = 'factorstoday_residual_momentum';
  const cached = await readSharedCache(cacheKey, ONE_HOUR);
  if (cached) return { ...cached, cacheFresh: true };
  const normalized = normalizeResidualPayload(await fetchJson('/residual-momentum'));
  await writeSharedCache(cacheKey, normalized);
  return { ...normalized, cacheFresh: false };
}

async function tickerDetails(ticker) {
  const cacheKey = `factorstoday_details_${ticker}`;
  const cached = await readSharedCache(cacheKey, TWELVE_HOURS);
  if (cached) return { ...cached, cacheFresh: true };
  const [loadings, specificVolatility] = await Promise.allSettled([
    fetchJson(`/stock-loadings/${encodeURIComponent(ticker)}?model=${encodeURIComponent('Base + Sector')}`),
    fetchJson(`/stock-specific-vol/${encodeURIComponent(ticker)}?window=252`),
  ]);
  if (loadings.status === 'rejected' && specificVolatility.status === 'rejected') {
    throw loadings.reason;
  }
  const value = {
    ticker,
    loadings: loadings.status === 'fulfilled' ? normalizeLoadingsPayload(loadings.value) : null,
    specificVolatility: specificVolatility.status === 'fulfilled'
      ? normalizeSpecificVolatility(specificVolatility.value) : null,
    warnings: [
      loadings.status === 'rejected' ? `Loadings unavailable: ${loadings.reason.message}` : null,
      specificVolatility.status === 'rejected' ? `Specific volatility unavailable: ${specificVolatility.reason.message}` : null,
    ].filter(Boolean),
  };
  await writeSharedCache(cacheKey, value);
  return { ...value, cacheFresh: false };
}

async function factorCatalog() {
  const cacheKey = 'factorstoday_catalog';
  const cached = await readSharedCache(cacheKey, ONE_DAY);
  if (cached) return cached;
  const payload = await fetchJson('/factors/catalog');
  await writeSharedCache(cacheKey, payload);
  return payload;
}

async function handler(req, res) {
  res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=3600, stale-while-revalidate=43200');
  try {
    if (String(req.query?.residual || '') === 'true') {
      const residual = await residualMomentum();
      const requestedSymbols = [...new Set(String(req.query?.symbols || '').split(',')
        .map((ticker) => ticker.trim().toUpperCase()).filter(Boolean))];
      const filtered = requestedSymbols.length
        ? {
            ...residual,
            byTicker: Object.fromEntries(requestedSymbols
              .filter((ticker) => residual.byTicker[ticker])
              .map((ticker) => [ticker, residual.byTicker[ticker]])),
          }
        : residual;
      return res.status(200).json({ residualMomentum: filtered, source: 'FactorsToday' });
    }
    const tickers = [...new Set(String(req.query?.tickers || '').split(',')
      .map((ticker) => ticker.trim().toUpperCase()).filter(Boolean))].slice(0, 5);
    if (tickers.length) {
      const settled = await Promise.allSettled(tickers.map(tickerDetails));
      const details = {};
      const warnings = [];
      settled.forEach((result, index) => {
        if (result.status === 'fulfilled') details[tickers[index]] = result.value;
        else warnings.push(`${tickers[index]}: ${result.reason.message}`);
      });
      return res.status(200).json({ details, warnings, source: 'FactorsToday' });
    }
    if (String(req.query?.catalog || '') === 'true') {
      return res.status(200).json({ factorsCatalog: await factorCatalog(), source: 'FactorsToday' });
    }
    return res.status(400).json({ error: 'Specify residual=true, tickers=SYMBOL, or catalog=true.' });
  } catch (error) {
    return res.status(503).json({ error: error.message, source: 'FactorsToday' });
  }
}

module.exports = handler;
module.exports.normalizeResidualPayload = normalizeResidualPayload;
module.exports.normalizeLoadingsPayload = normalizeLoadingsPayload;
module.exports.normalizeSpecificVolatility = normalizeSpecificVolatility;
