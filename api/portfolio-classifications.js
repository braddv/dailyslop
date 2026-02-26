const { readCache, writeCache } = require('./_lib/cache');
const seedData = require('../public/sp500ad/data/sector-ad.json');

const PROFILE_TTL_MS = 24 * 60 * 60 * 1000;
const FINNHUB_TTL_MS = 3 * 24 * 60 * 60 * 1000;

const INDUSTRY_TO_SECTOR = [
  { re: /(metals|mining|steel|aluminum|copper|gold|silver|materials)/i, sector: 'Materials' },
  { re: /(oil|gas|energy|drilling|exploration|refining)/i, sector: 'Energy' },
  { re: /(bank|insurance|financial|asset management|capital markets)/i, sector: 'Financials' },
  { re: /(semiconductor|software|internet|technology|it services|hardware)/i, sector: 'Information Technology' },
  { re: /(biotech|pharma|health|medical)/i, sector: 'Health Care' },
  { re: /(industrial|aerospace|defense|machinery|transportation)/i, sector: 'Industrials' },
  { re: /(telecom|communication|media|entertainment)/i, sector: 'Communication Services' },
  { re: /(consumer staples|beverage|food|household|personal products)/i, sector: 'Consumer Staples' },
  { re: /(consumer discretionary|apparel|retail|automobile|leisure)/i, sector: 'Consumer Discretionary' },
  { re: /(utilities|power|electric|water)/i, sector: 'Utilities' },
  { re: /(real estate|reit|property)/i, sector: 'Real Estate' },
];

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

function inferSectorFromIndustry(industry) {
  const text = String(industry || '').trim();
  if (!text) return 'Unknown';
  const match = INDUSTRY_TO_SECTOR.find((row) => row.re.test(text));
  return match ? match.sector : 'Unknown';
}

function toRegion(country) {
  const c = String(country || '').trim().toLowerCase();
  if (!c) return 'Unknown';
  if (c === 'us' || c === 'usa' || c === 'united states') return 'US';
  if (c === 'canada') return 'Canada';
  if (c === 'brazil' || c === 'mexico' || c === 'chile' || c === 'argentina' || c === 'peru') return 'LatAm';
  if (c === 'uk' || c === 'united kingdom' || c === 'france' || c === 'germany' || c === 'spain' || c === 'italy' || c === 'switzerland' || c === 'netherlands') return 'Europe';
  if (c === 'japan' || c === 'china' || c === 'taiwan' || c === 'south korea' || c === 'hong kong' || c === 'singapore' || c === 'india') return 'Asia';
  return 'ex-US';
}

async function fetchFinnhubClassification(ticker) {
  const token = process.env.FINNHUB_KEY || process.env.FINNHUB_API_KEY;
  if (!token) throw new Error('Finnhub key missing (set FINNHUB_KEY or FINNHUB_API_KEY)');

  const cacheKey = `finnhub_profile_${ticker}`;
  const cached = readCache(cacheKey, FINNHUB_TTL_MS);
  if (cached) return cached;

  const url = `https://finnhub.io/api/v1/stock/profile2?symbol=${encodeURIComponent(ticker)}&token=${encodeURIComponent(token)}`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`finnhub HTTP ${resp.status}`);
  const profile = await resp.json();
  if (!profile || !Object.keys(profile).length) throw new Error('finnhub empty profile');

  const industry = profile.finnhubIndustry || '';
  const sector = inferSectorFromIndustry(industry);
  const out = {
    region: toRegion(profile.country),
    sector,
    factor: asFactorBucket(sector),
    country: profile.country || null,
    industry: industry || null,
    source: 'finnhub_profile2',
  };
  writeCache(cacheKey, out);
  return out;
}

function inferRegionFromMeta(meta = {}, ticker) {
  const name = String(meta.exchangeName || meta.fullExchangeName || '').toLowerCase();
  const market = String(meta.market || '').toLowerCase();

  if (name.includes('nasdaq') || name.includes('nyse') || name.includes('arca') || name.includes('amex') || market === 'us_market') return 'US';
  if (name.includes('toronto') || name.includes('tsx')) return 'Canada';
  if (name.includes('sao paulo') || name.includes('bovespa')) return 'LatAm';
  if (name.includes('london')) return 'Europe';
  if (name.includes('hong kong') || name.includes('tokyo') || name.includes('shanghai') || name.includes('shenzhen')) return 'Asia';

  // Common OTC ADR suffix pattern in US symbols.
  if (/^[A-Z]{5}$/.test(ticker) && ticker.endsWith('Y')) return 'ex-US';
  return 'Unknown';
}

function classifyFromSparkMeta(ticker, meta = {}) {
  const instrumentType = String(meta.instrumentType || '').toUpperCase();
  let sector = 'Unknown';
  if (instrumentType === 'ETF') sector = 'ETF';
  const factor = sector === 'ETF' ? 'Beta/Index Exposure' : 'Unassigned';
  return {
    region: inferRegionFromMeta(meta, ticker),
    sector,
    factor,
    source: 'yahoo_spark',
  };
}

async function fetchSparkClassifications(tickers) {
  if (!tickers.length) return { byTicker: {}, failures: [] };
  const url = `https://query1.finance.yahoo.com/v7/finance/spark?symbols=${encodeURIComponent(tickers.join(','))}&range=5d&interval=1d`;
  const resp = await fetch(url, {
    headers: {
      accept: 'application/json,text/plain,*/*',
      'user-agent': 'Mozilla/5.0 (compatible; dailyslop-portfolio/1.0)',
    },
  });
  if (!resp.ok) throw new Error(`spark HTTP ${resp.status}`);

  const json = await resp.json();
  const rows = Array.isArray(json?.spark?.result) ? json.spark.result : [];
  const byTicker = {};
  rows.forEach((r) => {
    const symbol = String(r?.symbol || '').toUpperCase();
    if (!symbol) return;
    const meta = r?.response?.[0]?.meta || {};
    byTicker[symbol] = classifyFromSparkMeta(symbol, meta);
  });

  const failures = tickers.filter((t) => !byTicker[t]).map((t) => `${t}: missing spark row`);
  return { byTicker, failures };
}

async function getSparkClassification(ticker) {
  const cacheKey = `profile_${ticker}`;
  const cached = readCache(cacheKey, PROFILE_TTL_MS);
  if (cached) return cached;

  const { byTicker, failures } = await fetchSparkClassifications([ticker]);
  if (!byTicker[ticker]) throw new Error(failures[0] || 'missing spark row');
  writeCache(cacheKey, byTicker[ticker]);
  return byTicker[ticker];
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
        const finnhubClass = await fetchFinnhubClassification(ticker);
        if (finnhubClass.sector !== 'Unknown' || finnhubClass.region !== 'Unknown') {
          classifications[ticker] = finnhubClass;
          continue;
        }
      } catch (err) {
        warnings.push(`${ticker}: ${err.message}`);
      }

      try {
        classifications[ticker] = await getSparkClassification(ticker);
      } catch (err) {
        classifications[ticker] = { region: 'Unknown', sector: 'Unknown', factor: 'Unassigned', source: 'none' };
        warnings.push(`${ticker}: ${err.message}`);
      }
    }

    return res.status(200).json({
      classifications,
      warnings,
      diagnostics: {
        finnhubConfigured: Boolean(process.env.FINNHUB_KEY || process.env.FINNHUB_API_KEY),
      },
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
