const { readSharedCache, writeSharedCache } = require('./_lib/cache');
const {
  DAY_MS,
  INTERMARKET_INSTRUMENTS,
  buildDailyInstrument,
  buildSystematicTrend,
  buildSystematicTrendSummary,
  buildTrendContext,
  buildMacroState,
  buildMacroRegime,
  buildMacroRegimeHistory,
  buildRelationships,
  extractCloseSeries,
  getLastFinite,
  percentChange,
  replayPoints,
} = require('./_lib/intermarket');

const DAILY_CACHE_KEY = 'intermarket_yahoo_daily_v3';
const INTRADAY_CACHE_KEY = 'intermarket_yahoo_intraday_v1';
const REGIME_HISTORY_CACHE_KEY = 'intermarket_regime_history_v1';
const DAILY_TTL_MS = 12 * 60 * 60 * 1000;
const INTRADAY_MARKET_TTL_MS = 10 * 60 * 1000;
const INTRADAY_OFF_HOURS_TTL_MS = 60 * 60 * 1000;
const CHUNK_SIZE = 10;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJsonWithRetry(url, label) {
  const waits = [0, 400, 1200];
  let lastError;
  for (const wait of waits) {
    if (wait) await sleep(wait);
    try {
      const response = await fetch(url, {
        headers: {
          accept: 'application/json,text/plain,*/*',
          'user-agent': 'Mozilla/5.0 (compatible; dailyslop-intermarket/1.0)',
        },
      });
      if (!response.ok) throw new Error(`${label} HTTP ${response.status}`);
      return response.json();
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error(`${label} failed`);
}

function chunks(values, size) {
  const result = [];
  for (let index = 0; index < values.length; index += size) result.push(values.slice(index, index + size));
  return result;
}

async function fetchYahoo(symbols, range, interval) {
  const sparkMap = new Map();
  const failures = [];
  const sets = chunks(symbols, CHUNK_SIZE);
  const results = await Promise.all(sets.map(async (set) => {
    try {
      const url = `https://query1.finance.yahoo.com/v7/finance/spark?symbols=${encodeURIComponent(set.join(','))}&range=${range}&interval=${interval}`;
      const json = await fetchJsonWithRetry(url, `Yahoo ${range}/${interval}`);
      return { rows: json?.spark?.result || [] };
    } catch (error) {
      return { rows: [], error: `${set.join(',')}: ${error.message}` };
    }
  }));
  results.forEach((result) => {
    if (result.error) failures.push(result.error);
    result.rows.forEach((row) => {
      if (row?.symbol) sparkMap.set(String(row.symbol).toUpperCase(), row);
    });
  });
  return { sparkMap, failures };
}

async function buildDailyResponse() {
  const symbols = INTERMARKET_INSTRUMENTS.map((row) => row.symbol);
  const result = await fetchYahoo(symbols, '2y', '1d');
  const instruments = INTERMARKET_INSTRUMENTS
    .map((definition) => buildDailyInstrument(definition, result.sparkMap.get(definition.symbol.toUpperCase())))
    .filter(Boolean);
  if (instruments.length < 12) throw new Error(`Yahoo returned only ${instruments.length} macro instruments`);
  const missing = INTERMARKET_INSTRUMENTS
    .filter((definition) => !instruments.some((row) => row.symbol === definition.symbol))
    .map((definition) => `${definition.symbol}: missing daily spark`);
  return {
    asOf: new Date().toISOString(),
    source: 'Yahoo Finance spark',
    failures: [...result.failures, ...missing],
    instruments,
  };
}

function buildIntradayInstrument(definition, daySpark, weekSpark) {
  const daySeries = daySpark?.response?.[0] || {};
  const weekSeries = weekSpark?.response?.[0] || {};
  return {
    symbol: definition.symbol,
    replayDay15m: replayPoints(
      daySeries.timestamp || [],
      extractCloseSeries(daySeries),
      0,
      15 * 60
    ),
    replayWeekHourly: replayPoints(
      weekSeries.timestamp || [],
      extractCloseSeries(weekSeries),
      0,
      60 * 60,
      30 * 60
    ),
  };
}

async function buildIntradayResponse() {
  const symbols = INTERMARKET_INSTRUMENTS.map((row) => row.symbol);
  const [day, week] = await Promise.all([
    fetchYahoo(symbols, '5d', '15m'),
    fetchYahoo(symbols, '1mo', '60m'),
  ]);
  const instruments = INTERMARKET_INSTRUMENTS.map((definition) =>
    buildIntradayInstrument(
      definition,
      day.sparkMap.get(definition.symbol.toUpperCase()),
      week.sparkMap.get(definition.symbol.toUpperCase())
    )
  );
  return {
    asOf: new Date().toISOString(),
    failures: [
      ...day.failures.map((failure) => `15m ${failure}`),
      ...week.failures.map((failure) => `60m ${failure}`),
    ],
    instruments,
  };
}

function isActiveMarketWindow(now = new Date()) {
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
  return minutes >= 7 * 60 && minutes < 18 * 60;
}

function mergeInstrument(daily, intraday = {}) {
  const latest = getLastFinite((intraday.replayDay15m || []).map((point) => point[1]), 0);
  const currentPrice = Number.isFinite(latest) ? latest : daily.currentPrice;
  const dailyTimestamps = (daily.replayDaily || []).map((point) => point[0]);
  const dailyCloses = (daily.replayDaily || []).map((point) => point[1]);
  const performance = (days) => {
    let base = null;
    const cutoff = Date.now() - days * DAY_MS;
    for (let index = 0; index < dailyTimestamps.length; index += 1) {
      if (dailyTimestamps[index] * 1000 <= cutoff && Number.isFinite(dailyCloses[index])) base = dailyCloses[index];
      else if (dailyTimestamps[index] * 1000 > cutoff) break;
    }
    return percentChange(currentPrice, base);
  };
  const instrument = {
    ...daily,
    currentPrice,
    change: Number.isFinite(daily.previousClose) ? currentPrice - daily.previousClose : daily.change,
    changePercent: percentChange(currentPrice, daily.previousClose),
    perf1w: performance(7),
    perf1m: performance(30),
    perf3m: performance(90),
    replayDay15m: intraday.replayDay15m || [],
    replayWeekHourly: intraday.replayWeekHourly || [],
  };
  return {
    ...instrument,
    trend: buildTrendContext(instrument),
    systematicTrend: buildSystematicTrend(instrument),
  };
}

function validDaily(value) {
  return Array.isArray(value?.instruments) && value.instruments.length >= 12;
}

function validIntraday(value) {
  return Array.isArray(value?.instruments) && value.instruments.length >= 12;
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  const refresh = String(req.query?.refresh || '').toLowerCase() === 'true';
  const includeRegimeHistory = String(req.query?.includeRegimeHistory || '').toLowerCase() === 'true';
  const intradayTtl = isActiveMarketWindow() ? INTRADAY_MARKET_TTL_MS : INTRADAY_OFF_HOURS_TTL_MS;
  let daily = refresh ? null : await readSharedCache(DAILY_CACHE_KEY, DAILY_TTL_MS);
  let intraday = refresh ? null : await readSharedCache(INTRADAY_CACHE_KEY, intradayTtl);
  let dailyFresh = validDaily(daily);
  let intradayFresh = validIntraday(intraday);

  const [dailyAttempt, intradayAttempt] = await Promise.all([
    dailyFresh ? Promise.resolve(null) : buildDailyResponse().then((value) => ({ value })).catch((error) => ({ error })),
    intradayFresh ? Promise.resolve(null) : buildIntradayResponse().then((value) => ({ value })).catch((error) => ({ error })),
  ]);

  if (dailyAttempt?.value) {
    daily = dailyAttempt.value;
    dailyFresh = true;
    await writeSharedCache(DAILY_CACHE_KEY, daily, 7 * DAY_MS);
  } else if (!dailyFresh) {
    daily = await readSharedCache(DAILY_CACHE_KEY, 7 * DAY_MS);
  }

  if (!validDaily(daily)) {
    return res.status(502).json({
      success: false,
      error: dailyAttempt?.error?.message || 'No cached intermarket data is available',
    });
  }

  if (intradayAttempt?.value) {
    intraday = intradayAttempt.value;
    intradayFresh = true;
    await writeSharedCache(INTRADAY_CACHE_KEY, intraday, 2 * DAY_MS);
  } else if (!intradayFresh) {
    intraday = await readSharedCache(INTRADAY_CACHE_KEY, 2 * DAY_MS);
  }
  if (!validIntraday(intraday)) intraday = { asOf: daily.asOf, failures: [], instruments: [] };

  const intradayBySymbol = new Map(intraday.instruments.map((row) => [row.symbol, row]));
  const instruments = daily.instruments.map((row) => mergeInstrument(row, intradayBySymbol.get(row.symbol)));
  const relationships = buildRelationships(instruments);
  const macroRegime = {
    ...buildMacroRegime(instruments, relationships),
    evidenceThrough: intraday.asOf || daily.asOf,
  };
  let regimeHistory;
  if (includeRegimeHistory) {
    const cachedHistory = refresh ? null : await readSharedCache(REGIME_HISTORY_CACHE_KEY, 2 * DAY_MS);
    if (cachedHistory?.dailyAsOf === daily.asOf && Array.isArray(cachedHistory.history)) {
      regimeHistory = cachedHistory.history;
    } else {
      regimeHistory = buildMacroRegimeHistory(instruments);
      await writeSharedCache(REGIME_HISTORY_CACHE_KEY, { dailyAsOf: daily.asOf, history: regimeHistory }, 7 * DAY_MS);
    }
  }
  const responseCutoff = Date.now() - 400 * DAY_MS;
  const responseInstruments = instruments.map((row) => ({
    ...row,
    replayDaily: (row.replayDaily || []).filter(([timestamp]) => timestamp * 1000 >= responseCutoff),
  }));
  return res.status(200).json({
    success: true,
    asOf: intraday.asOf || daily.asOf,
    source: daily.source,
    cacheFresh: dailyFresh && intradayFresh,
    cachePolicy: {
      dailyHours: 12,
      intradayMinutes: isActiveMarketWindow() ? 10 : 60,
      activeWindow: isActiveMarketWindow(),
    },
    failures: [...(daily.failures || []), ...(intraday.failures || [])],
    macroState: buildMacroState(instruments),
    macroRegime,
    ...(includeRegimeHistory ? { regimeHistory } : {}),
    systematicTrend: buildSystematicTrendSummary(instruments),
    relationships,
    instruments: responseInstruments,
  });
};
