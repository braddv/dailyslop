const { readCache, writeCache } = require('./_lib/cache');
const seedData = require('../public/sp500ad/data/sector-ad.json');

const CACHE_KEY = 'sector_ad_yahoo';
const CACHE_TTL_MS = 12 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const CHUNK_SIZE = 10;
const MAX_CONCURRENCY = 4;

function toYahooSymbol(symbol) {
  return String(symbol).replace(/\./g, '-').toUpperCase();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJsonWithRetry(url, label) {
  const attempts = [0, 250, 800];
  let lastErr = null;

  for (let i = 0; i < attempts.length; i += 1) {
    if (attempts[i]) await sleep(attempts[i]);
    try {
      const resp = await fetch(url, {
        headers: {
          accept: 'application/json,text/plain,*/*',
          'user-agent': 'Mozilla/5.0 (compatible; dailyslop-sectorad/1.0)',
        },
      });
      if (!resp.ok) {
        const text = await resp.text();
        const preview = text.slice(0, 120).replace(/\s+/g, ' ').trim();
        throw new Error(`${label} HTTP ${resp.status}${preview ? `: ${preview}` : ''}`);
      }
      return resp.json();
    } catch (err) {
      lastErr = err;
    }
  }

  throw lastErr || new Error(`${label} failed`);
}

function hasValidStocks(payload) {
  return Array.isArray(payload?.stocks) && payload.stocks.length > 100;
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function pickLastBefore(timestamps, closes, cutoff) {
  let value = null;
  for (let i = 0; i < timestamps.length; i += 1) {
    const ts = timestamps[i] * 1000;
    const close = closes[i];
    if (!Number.isFinite(close)) continue;
    if (ts <= cutoff) value = close;
    if (ts > cutoff) break;
  }
  return value;
}

function calcPerf(currentPrice, timestamps, closes, days) {
  if (!Number.isFinite(currentPrice)) return null;
  const base = pickLastBefore(timestamps, closes, Date.now() - days * DAY_MS);
  if (!Number.isFinite(base) || base <= 0) return null;
  return ((currentPrice / base) - 1) * 100;
}

function calc12wHigh(timestamps, closes) {
  const cutoff = Date.now() - 84 * DAY_MS;
  let high = null;
  for (let i = 0; i < timestamps.length; i += 1) {
    const ts = timestamps[i] * 1000;
    const close = closes[i];
    if (ts < cutoff || !Number.isFinite(close)) continue;
    high = high == null ? close : Math.max(high, close);
  }
  return high;
}


function extractCloseSeries(series) {
  const direct = Array.isArray(series?.close) ? series.close : null;
  if (direct) return direct;

  const nested = series?.indicators?.quote?.[0]?.close;
  return Array.isArray(nested) ? nested : [];
}

function calc52wHigh(timestamps, closes) {
  const cutoff = Date.now() - 365 * DAY_MS;
  let high = null;
  for (let i = 0; i < timestamps.length; i += 1) {
    const ts = timestamps[i] * 1000;
    const close = closes[i];
    if (ts < cutoff || !Number.isFinite(close)) continue;
    high = high == null ? close : Math.max(high, close);
  }
  return high;
}

async function fetchSparkChunk(symbols) {
  const url = `https://query1.finance.yahoo.com/v7/finance/spark?symbols=${encodeURIComponent(symbols.join(','))}&range=1y&interval=1d`;
  const json = await fetchJsonWithRetry(url, 'spark');
  return json?.spark?.result || [];
}

async function processChunk(set) {
  const failures = [];
  const sparkMap = new Map();

  try {
    const rows = await fetchSparkChunk(set);
    rows.forEach((row) => {
      if (row?.symbol) sparkMap.set(String(row.symbol).toUpperCase(), row);
    });
  } catch (err) {
    failures.push(`chunk(${set.length}) ${set[0]}..${set[set.length - 1]}: ${err.message}`);
  }

  return { sparkMap, failures };
}

async function fetchYahooData(symbols) {
  const sets = chunk(symbols, CHUNK_SIZE);
  const sparkMap = new Map();
  const failures = [];

  for (let i = 0; i < sets.length; i += MAX_CONCURRENCY) {
    const batch = sets.slice(i, i + MAX_CONCURRENCY);
    const results = await Promise.all(batch.map(processChunk));
    results.forEach((result) => {
      result.sparkMap.forEach((v, k) => sparkMap.set(k, v));
      failures.push(...result.failures);
    });
  }

  return { sparkMap, failures };
}

function buildSectorSummary(stocks) {
  const bySector = new Map();
  stocks.forEach((stock) => {
    const key = stock.sector || 'Unknown';
    if (!bySector.has(key)) {
      bySector.set(key, { sector: key, advancers: 0, decliners: 0, unchanged: 0, total: 0 });
    }
    const row = bySector.get(key);
    row.total += 1;
    if (stock.changePercent > 0) row.advancers += 1;
    else if (stock.changePercent < 0) row.decliners += 1;
    else row.unchanged += 1;
  });
  return Array.from(bySector.values()).sort((a, b) => a.sector.localeCompare(b.sector));
}

function buildResponseFromYahoo() {
  const universe = seedData.stocks.map((stock) => ({
    symbol: stock.symbol,
    yahooSymbol: toYahooSymbol(stock.symbol),
    security: stock.security,
    sector: stock.sector,
    subIndustry: stock.subIndustry,
    seedMarketCap: stock.marketCap,
  }));

  const symbols = [...new Set(universe.map((stock) => stock.yahooSymbol))];
  return fetchYahooData(symbols).then(({ sparkMap, failures }) => {
    const stocks = [];

    universe.forEach((stock) => {
      const spark = sparkMap.get(stock.yahooSymbol);
      if (!spark) {
        failures.push(`${stock.symbol}/${stock.yahooSymbol}: missing spark`);
        return;
      }

      const series = spark.response?.[0] || {};
      const meta = series.meta || {};
      const timestamps = series.timestamp || [];
      const closes = extractCloseSeries(series);

      const priceFromMeta = meta.regularMarketPrice;
      const fallbackPrice = closes.findLast((value) => Number.isFinite(value));
      const currentPrice = Number.isFinite(priceFromMeta) ? priceFromMeta : fallbackPrice;

      const prevClose = Number.isFinite(meta.previousClose)
        ? meta.previousClose
        : Number.isFinite(meta.chartPreviousClose)
          ? meta.chartPreviousClose
          : pickLastBefore(timestamps, closes, Date.now() - DAY_MS);

      const change = Number.isFinite(currentPrice) && Number.isFinite(prevClose)
        ? currentPrice - prevClose
        : null;
      const changePercent = Number.isFinite(change) && Number.isFinite(prevClose) && prevClose !== 0
        ? (change / prevClose) * 100
        : null;

      const high12w = calc12wHigh(timestamps, closes);
      const high52w = Number.isFinite(meta.fiftyTwoWeekHigh)
        ? meta.fiftyTwoWeekHigh
        : calc52wHigh(timestamps, closes);

      const pctFrom52wHigh = Number.isFinite(currentPrice) && Number.isFinite(high52w) && high52w > 0
        ? ((currentPrice / high52w) - 1) * 100
        : null;
      const pctFrom12wHigh = Number.isFinite(currentPrice) && Number.isFinite(high12w) && high12w > 0
        ? ((currentPrice / high12w) - 1) * 100
        : null;

      stocks.push({
        symbol: stock.symbol,
        security: stock.security,
        sector: stock.sector,
        subIndustry: stock.subIndustry,
        change,
        changePercent,
        marketCap: Number.isFinite(meta.marketCap) ? meta.marketCap : stock.seedMarketCap,
        perf1w: calcPerf(currentPrice, timestamps, closes, 7),
        perf1m: calcPerf(currentPrice, timestamps, closes, 30),
        perf3m: calcPerf(currentPrice, timestamps, closes, 90),
        pctFrom52wHigh,
        high52w: Number.isFinite(high52w) ? high52w : null,
        lastClose: Number.isFinite(prevClose) ? prevClose : null,
        currentPrice: Number.isFinite(currentPrice) ? currentPrice : null,
        high12w: Number.isFinite(high12w) ? high12w : null,
        pctFrom12wHigh,
      });
    });

    if (!stocks.length) {
      throw new Error(`Yahoo spark returned no stock rows (${failures.slice(0, 3).join(' | ')})`);
    }

    return {
      asOf: new Date().toISOString(),
      source: {
        constituents: 'seed:/public/sp500ad/data/sector-ad.json',
        quotes: 'Yahoo Finance spark',
      },
      failures,
      sectors: buildSectorSummary(stocks),
      stocks,
      cacheFresh: true,
    };
  });
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  try {
    const refresh = String(req.query?.refresh || '').toLowerCase() === 'true';
    if (!refresh) {
      const cached = readCache(CACHE_KEY, CACHE_TTL_MS);
      if (hasValidStocks(cached)) return res.status(200).json({ ...cached, cacheFresh: true });
    }

    const payload = await buildResponseFromYahoo();
    writeCache(CACHE_KEY, payload);
    return res.status(200).json({ ...payload, cacheFresh: true });
  } catch (err) {
    const cached = readCache(CACHE_KEY, 7 * DAY_MS);
    if (hasValidStocks(cached)) {
      return res.status(200).json({
        ...cached,
        cacheFresh: false,
        failures: [...(cached.failures || []), `live refresh failed: ${err.message}`],
      });
    }

    return res.status(200).json({
      ...seedData,
      cacheFresh: false,
      failures: [...(seedData.failures || []), `live refresh failed: ${err.message}`],
    });
  }
};
