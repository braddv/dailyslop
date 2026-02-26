const { readCache, writeCache } = require('./_lib/cache');
const seedData = require('../public/sp500ad/data/sector-ad.json');

const PROFILE_TTL_MS = 24 * 60 * 60 * 1000;
const COUNTRY_TO_REGION = {
  'United States': 'US',
  USA: 'US',
  US: 'US',
  Canada: 'Canada',
};

function asFactorBucket(sectorName) {
  const sector = String(sectorName || '').trim();
  if (!sector || sector === 'Unknown') return 'Unassigned';
  if (sector === 'Information Technology' || sector === 'Communication Services') return 'Tech/Growth';
  if (sector === 'Energy' || sector === 'Materials' || sector === 'Industrials') return 'Cyclicals/Real Assets';
  if (sector === 'Utilities' || sector === 'Consumer Staples' || sector === 'Health Care') return 'Defensive/Quality';
  if (sector === 'Financials') return 'Financials';
  if (sector === 'Real Estate') return 'Rate Sensitive';
  return sector;
}

function toRegion(country) {
  const c = String(country || '').trim();
  if (!c) return 'Unknown';
  if (COUNTRY_TO_REGION[c]) return COUNTRY_TO_REGION[c];
  return 'ex-US';
}

function getSp500Map() {
  const cached = readCache('sector_ad_yahoo', 7 * 24 * 60 * 60 * 1000);
  const liveStocks = Array.isArray(cached?.stocks) ? cached.stocks : [];
  const seedStocks = Array.isArray(seedData?.stocks) ? seedData.stocks : [];
  const stocks = liveStocks.length ? liveStocks : seedStocks;
  const out = {};
  stocks.forEach((s) => {
    if (!s?.symbol) return;
    const ticker = String(s.symbol).toUpperCase();
    const sector = s.sector || 'Unknown';
    out[ticker] = {
      region: 'US',
      sector,
      factor: asFactorBucket(sector),
      source: 'sp500ad',
    };
  });
  return out;
}

async function fetchYahooProfile(ticker) {
  const cacheKey = `profile_${ticker}`;
  const cached = readCache(cacheKey, PROFILE_TTL_MS);
  if (cached) return cached;

  const modules = 'assetProfile,price';
  const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(ticker)}?modules=${modules}`;
  const resp = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 (compatible; dailyslop-portfolio/1.0)' } });
  if (!resp.ok) throw new Error(`profile HTTP ${resp.status}`);
  const json = await resp.json();
  const result = json?.quoteSummary?.result?.[0];
  if (!result) throw new Error('missing profile result');

  const assetProfile = result.assetProfile || {};
  const price = result.price || {};
  const country = assetProfile.country || price.country || null;
  const sector = assetProfile.sector || 'Unknown';
  const out = {
    region: toRegion(country),
    sector,
    factor: asFactorBucket(sector),
    country: country || null,
    source: 'yahoo_profile',
  };
  writeCache(cacheKey, out);
  return out;
}

module.exports = async function handler(req, res) {
  try {
    const q = req.query.tickers;
    if (!q) return res.status(400).json({ error: 'Provide tickers query param' });
    const tickers = [...new Set(String(q).split(',').map((t) => t.trim().toUpperCase()).filter(Boolean))];

    const sp500Map = getSp500Map();
    const classifications = {};
    const warnings = [];

    for (const ticker of tickers) {
      if (sp500Map[ticker]) {
        classifications[ticker] = sp500Map[ticker];
        continue;
      }

      try {
        classifications[ticker] = await fetchYahooProfile(ticker);
      } catch (err) {
        classifications[ticker] = { region: 'Unknown', sector: 'Unknown', factor: 'Unassigned', source: 'none' };
        warnings.push(`${ticker}: ${err.message}`);
      }
    }

    return res.status(200).json({ classifications, warnings });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
