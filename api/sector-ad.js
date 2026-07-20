const { readSharedCache, writeSharedCache } = require('./_lib/cache');
const seedData = require('../public/sp500ad/data/sector-ad.json');

const DAILY_CACHE_KEY = 'sector_ad_yahoo_daily_v2';
const INTRADAY_CACHE_KEY = 'sector_ad_yahoo_intraday_v5';
const DAILY_CACHE_TTL_MS = 12 * 60 * 60 * 1000;
const INTRADAY_MARKET_TTL_MS = 10 * 60 * 1000;
const INTRADAY_OFF_HOURS_TTL_MS = 12 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const CHUNK_SIZE = 10;
const MAX_CONCURRENCY = 4;
const BENCHMARKS = [
  ['SPY', 'S&P 500', 'S&P 500'],
  ['XLB', 'Materials Select Sector SPDR', 'Materials'],
  ['XLC', 'Communication Services Select Sector SPDR', 'Communication Services'],
  ['XLY', 'Consumer Discretionary Select Sector SPDR', 'Consumer Discretionary'],
  ['XLP', 'Consumer Staples Select Sector SPDR', 'Consumer Staples'],
  ['XLE', 'Energy Select Sector SPDR', 'Energy'],
  ['XLF', 'Financial Select Sector SPDR', 'Financials'],
  ['XLV', 'Health Care Select Sector SPDR', 'Health Care'],
  ['XLI', 'Industrial Select Sector SPDR', 'Industrials'],
  ['XLK', 'Technology Select Sector SPDR', 'Information Technology'],
  ['XLRE', 'Real Estate Select Sector SPDR', 'Real Estate'],
  ['XLU', 'Utilities Select Sector SPDR', 'Utilities'],
];

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


function getLastFinite(values, fromEndIndex = 0) {
  let seen = 0;
  for (let i = values.length - 1; i >= 0; i -= 1) {
    const v = values[i];
    if (!Number.isFinite(v)) continue;
    if (seen === fromEndIndex) return v;
    seen += 1;
  }
  return null;
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

function buildDailyReplay(timestamps, closes) {
  const cutoff = Date.now() - 186 * DAY_MS;
  const points = [];
  for (let i = 0; i < timestamps.length; i += 1) {
    const timestamp = timestamps[i];
    const close = closes[i];
    if (!Number.isFinite(timestamp) || timestamp * 1000 < cutoff || !Number.isFinite(close)) {
      continue;
    }
    points.push([timestamp, close]);
  }
  return points;
}

async function fetchSparkChunk(symbols, range, interval) {
  const url = `https://query1.finance.yahoo.com/v7/finance/spark?symbols=${encodeURIComponent(symbols.join(','))}&range=${range}&interval=${interval}`;
  const json = await fetchJsonWithRetry(url, `spark ${range}/${interval}`);
  return json?.spark?.result || [];
}

async function processChunk(set, range, interval) {
  const failures = [];
  const sparkMap = new Map();

  try {
    const rows = await fetchSparkChunk(set, range, interval);
    rows.forEach((row) => {
      if (row?.symbol) sparkMap.set(String(row.symbol).toUpperCase(), row);
    });
  } catch (err) {
    failures.push(`chunk(${set.length}) ${set[0]}..${set[set.length - 1]}: ${err.message}`);
  }

  return { sparkMap, failures };
}

async function fetchYahooData(symbols, range, interval) {
  const sets = chunk(symbols, CHUNK_SIZE);
  const sparkMap = new Map();
  const failures = [];

  for (let i = 0; i < sets.length; i += MAX_CONCURRENCY) {
    const batch = sets.slice(i, i + MAX_CONCURRENCY);
    const results = await Promise.all(
      batch.map((set) => processChunk(set, range, interval))
    );
    results.forEach((result) => {
      result.sparkMap.forEach((v, k) => sparkMap.set(k, v));
      failures.push(...result.failures);
    });
  }

  return { sparkMap, failures };
}

function buildReplayPoints(series, intervalSeconds, offsetSeconds = 0) {
  const timestamps = series?.timestamp || [];
  const closes = extractCloseSeries(series);
  const pointsByTimestamp = new Map();
  for (let i = 0; i < timestamps.length; i += 1) {
    if (Number.isFinite(timestamps[i]) && Number.isFinite(closes[i])) {
      const timestamp = Number.isFinite(intervalSeconds)
        ? Math.floor((timestamps[i] - offsetSeconds) / intervalSeconds) * intervalSeconds
          + offsetSeconds
        : timestamps[i];
      pointsByTimestamp.set(timestamp, closes[i]);
    }
  }
  return [...pointsByTimestamp.entries()].sort((a, b) => a[0] - b[0]);
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

function buildUniverse() {
  return seedData.stocks.map((stock) => ({
    symbol: stock.symbol,
    yahooSymbol: toYahooSymbol(stock.symbol),
    security: stock.security,
    sector: stock.sector,
    subIndustry: stock.subIndustry,
    seedMarketCap: stock.marketCap,
  }));
}

function buildBenchmarkUniverse() {
  return BENCHMARKS.map(([symbol, security, sector]) => ({
    symbol,
    yahooSymbol: symbol,
    security,
    sector,
    subIndustry: 'Sector ETF',
  }));
}

function buildDailyBenchmark(stock, spark) {
  if (!spark) return null;
  const series = spark.response?.[0] || {};
  const meta = series.meta || {};
  const timestamps = series.timestamp || [];
  const closes = extractCloseSeries(series);
  const currentPrice = Number.isFinite(meta.regularMarketPrice)
    ? meta.regularMarketPrice
    : getLastFinite(closes, 0);
  const prevClose = Number.isFinite(meta.regularMarketPreviousClose)
    ? meta.regularMarketPreviousClose
    : getLastFinite(closes, 1);
  const change = Number.isFinite(currentPrice) && Number.isFinite(prevClose)
    ? currentPrice - prevClose
    : null;
  const high12w = calc12wHigh(timestamps, closes);
  const high52w = Number.isFinite(meta.fiftyTwoWeekHigh)
    ? meta.fiftyTwoWeekHigh
    : calc52wHigh(timestamps, closes);
  return {
    symbol: stock.symbol,
    security: stock.security,
    sector: stock.sector,
    subIndustry: stock.subIndustry,
    change,
    changePercent: Number.isFinite(change) && Number.isFinite(prevClose) && prevClose
      ? (change / prevClose) * 100
      : null,
    perf1w: calcPerf(currentPrice, timestamps, closes, 7),
    perf1m: calcPerf(currentPrice, timestamps, closes, 30),
    perf3m: calcPerf(currentPrice, timestamps, closes, 90),
    pctFrom52wHigh: Number.isFinite(currentPrice) && Number.isFinite(high52w)
      ? ((currentPrice / high52w) - 1) * 100
      : null,
    high52w,
    lastClose: prevClose,
    currentPrice,
    high12w,
    pctFrom12wHigh: Number.isFinite(currentPrice) && Number.isFinite(high12w)
      ? ((currentPrice / high12w) - 1) * 100
      : null,
    replayDaily: buildDailyReplay(timestamps, closes),
  };
}

function buildDailyResponse() {
  const universe = buildUniverse();
  const benchmarkUniverse = buildBenchmarkUniverse();

  const symbols = [...new Set(
    [...universe, ...benchmarkUniverse].map((stock) => stock.yahooSymbol)
  )];
  return fetchYahooData(symbols, '1y', '1d').then((dailyResult) => {
    const sparkMap = dailyResult.sparkMap;
    const failures = [...dailyResult.failures];
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
      const lastSeriesClose = getLastFinite(closes, 0);
      const prevSeriesClose = getLastFinite(closes, 1);
      const currentPrice = Number.isFinite(priceFromMeta) ? priceFromMeta : lastSeriesClose;

      const prevClose = Number.isFinite(meta.regularMarketPreviousClose)
        ? meta.regularMarketPreviousClose
        : Number.isFinite(meta.previousClose)
          ? meta.previousClose
          : prevSeriesClose;

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
        replayDaily: buildDailyReplay(timestamps, closes),
      });
    });

    if (!stocks.length) {
      throw new Error(`Yahoo spark returned no stock rows (${failures.slice(0, 3).join(' | ')})`);
    }
    const benchmarks = benchmarkUniverse
      .map((stock) => buildDailyBenchmark(stock, sparkMap.get(stock.yahooSymbol)))
      .filter(Boolean);

    return {
      asOf: new Date().toISOString(),
      source: {
        constituents: 'seed:/public/sp500ad/data/sector-ad.json',
        quotes: 'Yahoo Finance spark',
      },
      failures,
      sectors: buildSectorSummary(stocks),
      stocks,
      benchmarks,
      cacheFresh: true,
    };
  });
}

function buildIntradayResponse() {
  const universe = buildUniverse();
  const benchmarkUniverse = buildBenchmarkUniverse();
  const allRows = [...universe, ...benchmarkUniverse];
  const symbols = [...new Set(allRows.map((stock) => stock.yahooSymbol))];
  return Promise.all([
    fetchYahooData(symbols, '5d', '15m'),
    fetchYahooData(symbols, '10d', '60m'),
  ]).then(([dayResult, weekResult]) => ({
    asOf: new Date().toISOString(),
    failures: [
      ...dayResult.failures.map((failure) => `15m ${failure}`),
      ...weekResult.failures.map((failure) => `60m ${failure}`),
    ],
    stocks: universe.map((stock) => ({
      symbol: stock.symbol,
      replayDay15m: buildReplayPoints(
        dayResult.sparkMap.get(stock.yahooSymbol)?.response?.[0] || null,
        15 * 60
      ),
      replayWeekHourly: buildReplayPoints(
        weekResult.sparkMap.get(stock.yahooSymbol)?.response?.[0] || null,
        60 * 60,
        30 * 60
      ),
    })),
    benchmarks: benchmarkUniverse.map((stock) => ({
      symbol: stock.symbol,
      replayDay15m: buildReplayPoints(
        dayResult.sparkMap.get(stock.yahooSymbol)?.response?.[0] || null,
        15 * 60
      ),
      replayWeekHourly: buildReplayPoints(
        weekResult.sparkMap.get(stock.yahooSymbol)?.response?.[0] || null,
        60 * 60,
        30 * 60
      ),
    })),
  }));
}

function isUsMarketHours(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  if (values.weekday === 'Sat' || values.weekday === 'Sun') return false;
  const minutes = Number(values.hour) * 60 + Number(values.minute);
  return minutes >= 9 * 60 + 30 && minutes < 16 * 60 + 15;
}

function hasValidIntraday(payload) {
  return Array.isArray(payload?.stocks) && payload.stocks.length > 100;
}

function mergeQuoteRow(stock, live = {}) {
  const latestIntraday = getLastFinite(
    (live.replayDay15m || []).map((point) => point[1]),
    0
  );
  const currentPrice = Number.isFinite(latestIntraday)
    ? latestIntraday
    : stock.currentPrice;
  const prevClose = stock.lastClose;
  const change = Number.isFinite(currentPrice) && Number.isFinite(prevClose)
    ? currentPrice - prevClose
    : stock.change;
  const changePercent = Number.isFinite(change) && Number.isFinite(prevClose) && prevClose !== 0
    ? (change / prevClose) * 100
    : stock.changePercent;
  const dailyTimestamps = (stock.replayDaily || []).map((point) => point[0]);
  const dailyCloses = (stock.replayDaily || []).map((point) => point[1]);
  return {
    ...stock,
    currentPrice,
    change,
    changePercent,
    perf1w: calcPerf(currentPrice, dailyTimestamps, dailyCloses, 7),
    perf1m: calcPerf(currentPrice, dailyTimestamps, dailyCloses, 30),
    perf3m: calcPerf(currentPrice, dailyTimestamps, dailyCloses, 90),
    pctFrom52wHigh: Number.isFinite(currentPrice) && Number.isFinite(stock.high52w)
      ? ((currentPrice / stock.high52w) - 1) * 100
      : stock.pctFrom52wHigh,
    pctFrom12wHigh: Number.isFinite(currentPrice) && Number.isFinite(stock.high12w)
      ? ((currentPrice / stock.high12w) - 1) * 100
      : stock.pctFrom12wHigh,
    replayDay15m: live.replayDay15m || [],
    replayWeekHourly: live.replayWeekHourly || [],
  };
}

function mergePayloads(daily, intraday, cacheFresh) {
  const intradayBySymbol = new Map(
    (intraday.stocks || []).map((stock) => [stock.symbol, stock])
  );
  const intradayBenchmarks = new Map(
    (intraday.benchmarks || []).map((stock) => [stock.symbol, stock])
  );
  const stocks = (daily.stocks || []).map((stock) =>
    mergeQuoteRow(stock, intradayBySymbol.get(stock.symbol))
  );
  const benchmarks = (daily.benchmarks || []).map((stock) =>
    mergeQuoteRow(stock, intradayBenchmarks.get(stock.symbol))
  );
  return {
    ...daily,
    asOf: intraday.asOf || daily.asOf,
    failures: [...(daily.failures || []), ...(intraday.failures || [])],
    sectors: buildSectorSummary(stocks),
    stocks,
    benchmarks,
    cacheFresh,
    cachePolicy: {
      dailyHours: 12,
      intradayMinutes: isUsMarketHours() ? 10 : 720,
      marketHours: isUsMarketHours(),
    },
  };
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  const refresh = String(req.query?.refresh || '').toLowerCase() === 'true';
  const intradayTtl = isUsMarketHours()
    ? INTRADAY_MARKET_TTL_MS
    : INTRADAY_OFF_HOURS_TTL_MS;
  let daily = refresh
    ? null
    : await readSharedCache(DAILY_CACHE_KEY, DAILY_CACHE_TTL_MS);
  let intraday = refresh
    ? null
    : await readSharedCache(INTRADAY_CACHE_KEY, intradayTtl);
  let dailyFresh = hasValidStocks(daily);
  let intradayFresh = hasValidIntraday(intraday);

  const [dailyAttempt, intradayAttempt] = await Promise.all([
    dailyFresh
      ? Promise.resolve(null)
      : buildDailyResponse().then((value) => ({ value })).catch((error) => ({ error })),
    intradayFresh
      ? Promise.resolve(null)
      : buildIntradayResponse().then((value) => ({ value })).catch((error) => ({ error })),
  ]);

  if (dailyAttempt?.value) {
    daily = dailyAttempt.value;
    dailyFresh = true;
    await writeSharedCache(DAILY_CACHE_KEY, daily, 7 * DAY_MS);
  } else if (!dailyFresh) {
    daily = await readSharedCache(DAILY_CACHE_KEY, 7 * DAY_MS);
    if (!hasValidStocks(daily)) daily = seedData;
    daily = {
      ...daily,
      failures: [
        ...(daily.failures || []),
        `daily refresh failed: ${dailyAttempt?.error?.message || 'unknown error'}`,
      ],
    };
  }

  if (intradayAttempt?.value) {
    intraday = intradayAttempt.value;
    intradayFresh = true;
    await writeSharedCache(INTRADAY_CACHE_KEY, intraday, 2 * DAY_MS);
  } else if (!intradayFresh) {
    intraday = await readSharedCache(INTRADAY_CACHE_KEY, 2 * DAY_MS);
    if (!hasValidIntraday(intraday)) {
      intraday = { asOf: daily.asOf, failures: [], stocks: [] };
    }
    if (intradayAttempt?.error) {
      intraday = {
        ...intraday,
        failures: [
          ...(intraday.failures || []),
          `intraday refresh failed: ${intradayAttempt.error.message}`,
        ],
      };
    }
  }

  return res.status(200).json(
    mergePayloads(daily, intraday, dailyFresh && intradayFresh)
  );
};
