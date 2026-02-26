const { readCache, writeCache } = require('./_lib/cache');

const TRADING_DAYS_3Y = 756;

async function fetchTickerHistory(ticker) {
  const key = `yahoo_${ticker}`;
  const cached = readCache(key, 6 * 60 * 60 * 1000);
  if (cached) return cached;

  const now = Math.floor(Date.now() / 1000);
  const start = now - 60 * 60 * 24 * 365 * 5;
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    ticker
  )}?period1=${start}&period2=${now}&interval=1d&events=history&includeAdjustedClose=true`;

  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(`Failed ${ticker}: HTTP ${resp.status}`);
  }
  const data = await resp.json();
  const result = data?.chart?.result?.[0];
  if (!result) throw new Error(`No price data for ${ticker}`);
  const timestamps = result.timestamp || [];
  const adjclose = result.indicators?.adjclose?.[0]?.adjclose || [];

  const series = [];
  for (let i = 0; i < timestamps.length; i += 1) {
    const px = adjclose[i];
    if (px == null || Number.isNaN(px)) continue;
    const d = new Date(timestamps[i] * 1000);
    const date = d.toISOString().slice(0, 10);
    series.push({ date, close: px });
  }

  const out = { ticker, series: series.slice(-TRADING_DAYS_3Y * 2) };
  writeCache(key, out);
  return out;
}

module.exports = async function handler(req, res) {
  try {
    const q = req.query.tickers;
    if (!q) return res.status(400).json({ error: 'Provide tickers query param' });
    const tickers = [...new Set(String(q).split(',').map((t) => t.trim().toUpperCase()).filter(Boolean))];

    const results = await Promise.allSettled(tickers.map(fetchTickerHistory));
    const prices = {};
    const warnings = [];

    results.forEach((r, idx) => {
      const t = tickers[idx];
      if (r.status === 'fulfilled') {
        prices[t] = r.value.series;
        if (r.value.series.length < 200) {
          warnings.push(`${t}: insufficient history (${r.value.series.length} days)`);
        }
      } else {
        warnings.push(`${t}: ${r.reason.message}`);
      }
    });

    return res.status(200).json({ prices, warnings });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
