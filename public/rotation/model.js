export const ROTATION_SESSIONS = 66;

const SECTOR_SYMBOLS = {
  Materials: 'XLB',
  'Communication Services': 'XLC',
  'Consumer Discretionary': 'XLY',
  'Consumer Staples': 'XLP',
  Energy: 'XLE',
  Financials: 'XLF',
  'Health Care': 'XLV',
  Industrials: 'XLI',
  'Information Technology': 'XLK',
  'Real Estate': 'XLRE',
  Utilities: 'XLU',
};

function finite(value) {
  return value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value));
}

function dateKey(timestamp) {
  return new Date(Number(timestamp) * 1000).toISOString().slice(0, 10);
}

function priceMap(instrument) {
  return new Map((instrument?.replayDaily || [])
    .filter((point) => finite(point?.[0]) && finite(point?.[1]) && Number(point[1]) > 0)
    .map((point) => [dateKey(point[0]), Number(point[1])]));
}

function trailingReturn(prices, dates, index, sessions) {
  if (index < sessions) return null;
  const current = prices.get(dates[index]);
  const base = prices.get(dates[index - sessions]);
  return finite(current) && finite(base) && base > 0 ? (current / base - 1) * 100 : null;
}

function weightedReturn(members, dates, index, sessions) {
  let weighted = 0;
  let weight = 0;
  members.forEach((member) => {
    const value = trailingReturn(member.prices, dates, index, sessions);
    if (!finite(value)) return;
    const memberWeight = Math.max(1, Number(member.marketCap) || 1);
    weighted += value * memberWeight;
    weight += memberWeight;
  });
  return weight ? weighted / weight : null;
}

function quadrant(x, y) {
  if (x >= 0 && y >= 0) return 'leaders';
  if (x < 0 && y >= 0) return 'fading';
  if (x < 0 && y < 0) return 'laggards';
  return 'recovering';
}

function point({ id, label, sector, symbol = null, return5, return20, spy5, spy20, marketCap, count, constituents = [] }) {
  if (![return5, return20, spy5, spy20].every(finite)) return null;
  const x = return5 - spy5;
  const y = return20 - spy20;
  return {
    id, label, sector, symbol, x, y, return5, return20, marketCap,
    count, constituents, quadrant: quadrant(x, y),
  };
}

export function buildRotationData(payload, sessionCount = ROTATION_SESSIONS) {
  const stocks = (payload?.stocks || []).filter((stock) => stock?.symbol && stock?.sector && stock?.subIndustry);
  const benchmarks = payload?.benchmarks || [];
  const spy = benchmarks.find((item) => item.symbol === 'SPY');
  if (!spy) return { frames: [], sectors: [], subIndustries: [], asOf: payload?.asOf || null };
  const spyPrices = priceMap(spy);
  const allDates = [...spyPrices.keys()].sort();
  const visibleDates = allDates.slice(-sessionCount);
  const firstVisibleIndex = Math.max(20, allDates.length - visibleDates.length);
  const sectorCaps = new Map();
  const members = stocks.map((stock) => ({
    symbol: stock.symbol,
    security: stock.security,
    sector: stock.sector,
    subIndustry: stock.subIndustry,
    marketCap: Number(stock.marketCap) || 0,
    prices: priceMap(stock),
  }));
  members.forEach((member) => sectorCaps.set(member.sector, (sectorCaps.get(member.sector) || 0) + member.marketCap));

  const sectorDefinitions = Object.entries(SECTOR_SYMBOLS).map(([sector, symbol]) => {
    const instrument = benchmarks.find((item) => item.symbol === symbol);
    const constituents = members.filter((member) => member.sector === sector);
    return {
      id: symbol, label: sector, sector, symbol, prices: priceMap(instrument),
      marketCap: sectorCaps.get(sector) || 0,
      count: constituents.length,
      constituents: constituents.map(({ symbol: ticker, security, subIndustry }) => ({ symbol: ticker, security, subIndustry })),
    };
  }).filter((item) => item.prices.size);

  const bySubIndustry = new Map();
  members.forEach((member) => {
    const key = `${member.sector}\u0000${member.subIndustry}`;
    if (!bySubIndustry.has(key)) bySubIndustry.set(key, []);
    bySubIndustry.get(key).push(member);
  });
  const subIndustryDefinitions = [...bySubIndustry.entries()].map(([key, group]) => {
    const [sector, label] = key.split('\u0000');
    return {
      id: `${sector}:${label}`, label, sector, members: group,
      marketCap: group.reduce((sum, member) => sum + member.marketCap, 0),
      count: group.length,
      constituents: group.map(({ symbol, security }) => ({ symbol, security })),
    };
  }).sort((a, b) => a.sector.localeCompare(b.sector) || b.marketCap - a.marketCap);

  const frames = allDates.slice(firstVisibleIndex).map((date, offset) => {
    const index = firstVisibleIndex + offset;
    const spy5 = trailingReturn(spyPrices, allDates, index, 5);
    const spy20 = trailingReturn(spyPrices, allDates, index, 20);
    const sectors = sectorDefinitions.map((item) => point({
      ...item,
      return5: trailingReturn(item.prices, allDates, index, 5),
      return20: trailingReturn(item.prices, allDates, index, 20),
      spy5, spy20,
    })).filter(Boolean);
    const subIndustries = subIndustryDefinitions.map((item) => point({
      ...item,
      return5: weightedReturn(item.members, allDates, index, 5),
      return20: weightedReturn(item.members, allDates, index, 20),
      spy5, spy20,
    })).filter(Boolean);
    return { date, spy5, spy20, sectors, subIndustries };
  }).slice(-sessionCount);

  return {
    asOf: payload?.asOf || null,
    frames,
    sectors: sectorDefinitions.map(({ prices, ...item }) => item),
    subIndustries: subIndustryDefinitions.map(({ members: ignored, ...item }) => item),
    methodology: 'Sector coordinates use sector ETF closes. Sub-industry coordinates are current-market-cap-weighted constituent returns. Both axes subtract the matching SPY return.',
  };
}
