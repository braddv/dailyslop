const DAY_MS = 24 * 60 * 60 * 1000;

const INTERMARKET_INSTRUMENTS = [
  { symbol: 'SPY', name: 'S&P 500', group: 'Equities', importance: 1.2 },
  { symbol: 'QQQ', name: 'Nasdaq 100', group: 'Equities', importance: 1.1 },
  { symbol: 'IWM', name: 'Russell 2000', group: 'Equities', importance: 1.05 },
  { symbol: 'EEM', name: 'Emerging Markets', group: 'Equities' },
  { symbol: '^VIX', name: 'CBOE Volatility Index', group: 'Risk & Credit', displaySymbol: 'VIX' },
  { symbol: 'HYG', name: 'High Yield Credit', group: 'Risk & Credit' },
  { symbol: 'LQD', name: 'Investment Grade Credit', group: 'Risk & Credit' },
  { symbol: '^IRX', name: '13-Week Treasury Yield', group: 'Rates', displaySymbol: '3M', format: 'yield' },
  { symbol: '^TNX', name: '10-Year Treasury Yield', group: 'Rates', displaySymbol: '10Y', format: 'yield', importance: 1.1 },
  { symbol: '^TYX', name: '30-Year Treasury Yield', group: 'Rates', displaySymbol: '30Y', format: 'yield' },
  { symbol: 'TLT', name: 'Long Treasury Bonds', group: 'Rates' },
  { symbol: 'DX-Y.NYB', name: 'US Dollar Index', group: 'Currencies', displaySymbol: 'DXY', importance: 1.1 },
  { symbol: 'EURUSD=X', name: 'Euro / US Dollar', group: 'Currencies', displaySymbol: 'EUR/USD' },
  { symbol: 'JPY=X', name: 'US Dollar / Japanese Yen', group: 'Currencies', displaySymbol: 'USD/JPY' },
  { symbol: 'CL=F', name: 'WTI Crude Oil', group: 'Commodities', displaySymbol: 'WTI', importance: 1.1 },
  { symbol: 'BZ=F', name: 'Brent Crude Oil', group: 'Commodities', displaySymbol: 'BRENT' },
  { symbol: 'NG=F', name: 'Natural Gas', group: 'Commodities', displaySymbol: 'NAT GAS' },
  { symbol: 'GC=F', name: 'Gold', group: 'Commodities', displaySymbol: 'GOLD', importance: 1.1 },
  { symbol: 'SI=F', name: 'Silver', group: 'Commodities', displaySymbol: 'SILVER' },
  { symbol: 'HG=F', name: 'Copper', group: 'Commodities', displaySymbol: 'COPPER' },
  { symbol: 'DBA', name: 'Agriculture Basket', group: 'Commodities' },
  { symbol: 'XLE', name: 'US Energy Equities', group: 'Commodities' },
];

function getLastFinite(values, fromEndIndex = 0) {
  let seen = 0;
  for (let index = values.length - 1; index >= 0; index -= 1) {
    if (!Number.isFinite(values[index])) continue;
    if (seen === fromEndIndex) return values[index];
    seen += 1;
  }
  return null;
}

function extractCloseSeries(series) {
  if (Array.isArray(series?.close)) return series.close;
  const nested = series?.indicators?.quote?.[0]?.close;
  return Array.isArray(nested) ? nested : [];
}

function pickLastBefore(timestamps, closes, cutoffMs) {
  let value = null;
  for (let index = 0; index < timestamps.length; index += 1) {
    const price = closes[index];
    if (!Number.isFinite(price)) continue;
    if (timestamps[index] * 1000 <= cutoffMs) value = price;
    else break;
  }
  return value;
}

function percentChange(current, base) {
  if (!Number.isFinite(current) || !Number.isFinite(base) || base === 0) return null;
  return ((current / base) - 1) * 100;
}

function performance(current, timestamps, closes, days, nowMs = Date.now()) {
  return percentChange(current, pickLastBefore(timestamps, closes, nowMs - days * DAY_MS));
}

function average(values) {
  const finite = values.filter(Number.isFinite);
  return finite.length ? finite.reduce((sum, value) => sum + value, 0) / finite.length : null;
}

function median(values) {
  const finite = values.filter(Number.isFinite).sort((left, right) => left - right);
  if (!finite.length) return null;
  const middle = Math.floor(finite.length / 2);
  return finite.length % 2 ? finite[middle] : (finite[middle - 1] + finite[middle]) / 2;
}

function buildTrendContext({ currentPrice, previousClose, replayDaily = [], format }) {
  const closes = replayDaily.map((point) => point[1]).filter(Number.isFinite);
  if (!Number.isFinite(currentPrice) || closes.length < 50) return null;

  const average20 = average(closes.slice(-20));
  const average50 = average(closes.slice(-50));
  const yieldInstrument = format === 'yield';
  const distance = (movingAverage) => yieldInstrument
    ? (currentPrice - movingAverage) * 100
    : percentChange(currentPrice, movingAverage);
  const distance20 = distance(average20);
  const distance50 = distance(average50);
  const above20 = currentPrice > average20;
  const above50 = currentPrice > average50;
  let label = 'Mixed trend';
  let direction = 'mixed';
  if (above20 && average20 > average50) {
    label = 'Trending higher';
    direction = 'higher';
  } else if (!above20 && average20 < average50) {
    label = 'Trending lower';
    direction = 'lower';
  } else if (above20 && above50) {
    label = 'Turning higher';
    direction = 'higher';
  } else if (!above20 && !above50) {
    label = 'Turning lower';
    direction = 'lower';
  }

  const dailyMoves = [];
  for (let index = Math.max(1, closes.length - 60); index < closes.length; index += 1) {
    const move = yieldInstrument
      ? (closes[index] - closes[index - 1]) * 100
      : percentChange(closes[index], closes[index - 1]);
    if (Number.isFinite(move)) dailyMoves.push(Math.abs(move));
  }
  const averageDailyMove = average(dailyMoves);
  const medianDailyMove = median(dailyMoves);
  const todayMove = yieldInstrument
    ? Number.isFinite(previousClose) ? (currentPrice - previousClose) * 100 : null
    : percentChange(currentPrice, previousClose);
  const typicalMove = Number.isFinite(medianDailyMove) && medianDailyMove > 0
    ? medianDailyMove
    : averageDailyMove;
  const moveRatio = Number.isFinite(todayMove) && Number.isFinite(typicalMove) && typicalMove > 0
    ? Math.abs(todayMove) / typicalMove
    : null;
  const moveLabel = !Number.isFinite(moveRatio)
    ? 'Unavailable'
    : moveRatio < 0.5 ? 'Quiet'
      : moveRatio < 1.5 ? 'Typical'
        : moveRatio < 2.5 ? 'Large' : 'Outsized';

  return {
    label,
    direction,
    average20,
    average50,
    distance20,
    distance50,
    todayMove,
    averageDailyMove,
    medianDailyMove,
    moveLabel,
    moveUnit: yieldInstrument ? 'bp' : '%',
  };
}

function replayPoints(timestamps, closes, cutoffMs = 0, bucketSeconds = null, offsetSeconds = 0) {
  const points = new Map();
  for (let index = 0; index < timestamps.length; index += 1) {
    const timestamp = timestamps[index];
    const price = closes[index];
    if (!Number.isFinite(timestamp) || !Number.isFinite(price) || timestamp * 1000 < cutoffMs) continue;
    const key = Number.isFinite(bucketSeconds)
      ? Math.floor((timestamp - offsetSeconds) / bucketSeconds) * bucketSeconds + offsetSeconds
      : timestamp;
    points.set(key, price);
  }
  return [...points.entries()].sort((left, right) => left[0] - right[0]);
}

function buildDailyInstrument(definition, spark, nowMs = Date.now()) {
  const series = spark?.response?.[0];
  if (!series) return null;
  const meta = series.meta || {};
  const timestamps = Array.isArray(series.timestamp) ? series.timestamp : [];
  const closes = extractCloseSeries(series);
  const currentPrice = Number.isFinite(meta.regularMarketPrice)
    ? meta.regularMarketPrice
    : getLastFinite(closes, 0);
  const previousClose = Number.isFinite(meta.regularMarketPreviousClose)
    ? meta.regularMarketPreviousClose
    : Number.isFinite(meta.previousClose)
      ? meta.previousClose
      : getLastFinite(closes, 1);
  if (!Number.isFinite(currentPrice)) return null;
  const change = Number.isFinite(previousClose) ? currentPrice - previousClose : null;
  const replayDaily = replayPoints(timestamps, closes, nowMs - 190 * DAY_MS);
  const instrument = {
    ...definition,
    currentPrice,
    previousClose,
    change,
    changePercent: percentChange(currentPrice, previousClose),
    perf1w: performance(currentPrice, timestamps, closes, 7, nowMs),
    perf1m: performance(currentPrice, timestamps, closes, 30, nowMs),
    perf3m: performance(currentPrice, timestamps, closes, 90, nowMs),
    replayDaily,
  };
  return {
    ...instrument,
    trend: buildTrendContext(instrument),
  };
}

function relativeReturn(left, right, key) {
  const leftReturn = left?.[key];
  const rightReturn = right?.[key];
  if (!Number.isFinite(leftReturn) || !Number.isFinite(rightReturn)) return null;
  return (((1 + leftReturn / 100) / (1 + rightReturn / 100)) - 1) * 100;
}

function buildRelationships(instruments) {
  const bySymbol = new Map(instruments.map((row) => [row.symbol, row]));
  const ratio = (id, label, leftSymbol, rightSymbol, interpretation) => {
    const left = bySymbol.get(leftSymbol);
    const right = bySymbol.get(rightSymbol);
    return {
      id,
      label,
      leftSymbol,
      rightSymbol,
      interpretation,
      currentRatio: Number.isFinite(left?.currentPrice) && Number.isFinite(right?.currentPrice)
        ? left.currentPrice / right.currentPrice
        : null,
      changePercent: relativeReturn(left, right, 'changePercent'),
      perf1w: relativeReturn(left, right, 'perf1w'),
      perf1m: relativeReturn(left, right, 'perf1m'),
      perf3m: relativeReturn(left, right, 'perf3m'),
    };
  };
  const threeMonth = bySymbol.get('^IRX');
  const tenYear = bySymbol.get('^TNX');
  const curve = Number.isFinite(tenYear?.currentPrice) && Number.isFinite(threeMonth?.currentPrice)
    ? (tenYear.currentPrice - threeMonth.currentPrice) * 100
    : null;
  return [
    ratio('small-cap-risk', 'Small caps vs S&P 500', 'IWM', 'SPY', 'Rising favors broader risk appetite.'),
    ratio('growth-leadership', 'Nasdaq 100 vs S&P 500', 'QQQ', 'SPY', 'Rising favors growth leadership.'),
    ratio('credit-risk', 'High yield vs investment grade', 'HYG', 'LQD', 'Rising suggests improving credit risk appetite.'),
    ratio('copper-gold', 'Copper vs gold', 'HG=F', 'GC=F', 'Rising favors cyclical growth over defensiveness.'),
    {
      id: 'yield-curve',
      label: '10Y minus 3M yield curve',
      leftSymbol: '^TNX',
      rightSymbol: '^IRX',
      interpretation: 'A more positive spread indicates a steeper curve.',
      currentSpreadBps: curve,
      changePercent: null,
      perf1w: null,
      perf1m: null,
      perf3m: null,
    },
  ].filter((row) => row.currentRatio != null || row.currentSpreadBps != null);
}

function averageFinite(values) {
  const finite = values.filter(Number.isFinite);
  return finite.length ? finite.reduce((sum, value) => sum + value, 0) / finite.length : null;
}

function moveLabelForRatio(ratio) {
  return !Number.isFinite(ratio)
    ? 'Unavailable'
    : ratio < 0.5 ? 'Quiet'
      : ratio < 1.5 ? 'Typical'
        : ratio < 2.5 ? 'Large' : 'Outsized';
}

function trendDetail(row, prefix = 'Today') {
  if (!row?.trend) return null;
  const trend = row.trend;
  const signed = (value) => `${value >= 0 ? '+' : ''}${value.toFixed(1)}${trend.moveUnit === '%' ? '%' : ` ${trend.moveUnit}`}`;
  return [
    Number.isFinite(trend.todayMove)
      ? `${prefix} ${signed(trend.todayMove)} (${trend.moveLabel.toLowerCase()})`
      : null,
    Number.isFinite(trend.distance20) ? `${signed(trend.distance20)} vs 20D` : null,
    Number.isFinite(trend.distance50) ? `${signed(trend.distance50)} vs 50D` : null,
  ].filter(Boolean).join(' · ');
}

function buildMacroState(instruments) {
  const bySymbol = new Map(instruments.map((row) => [row.symbol, row]));
  const change = (symbol) => bySymbol.get(symbol)?.changePercent;
  const riskAverage = averageFinite(['SPY', 'QQQ', 'IWM', 'EEM'].map(change));
  const vix = change('^VIX');
  const riskAdjusted = Number.isFinite(riskAverage) && Number.isFinite(vix)
    ? riskAverage - vix * 0.04
    : riskAverage;
  const riskLabel = !Number.isFinite(riskAdjusted)
    ? 'Unavailable'
    : riskAdjusted > 0.35 ? 'Risk-on' : riskAdjusted < -0.35 ? 'Risk-off' : 'Mixed';

  const tenYear = bySymbol.get('^TNX');
  const rateMoveBps = Number.isFinite(tenYear?.change) ? tenYear.change * 100 : null;
  const ratesLabel = tenYear?.trend?.label && tenYear.trend.label !== 'Mixed trend'
    ? `Yields ${tenYear.trend.label.toLowerCase()}`
    : !Number.isFinite(rateMoveBps)
    ? 'Unavailable'
    : rateMoveBps > 3 ? 'Yields rising' : rateMoveBps < -3 ? 'Yields easing' : 'Yields stable';
  const ratesDetail = Number.isFinite(rateMoveBps)
    ? trendDetail(tenYear) || `10Y move ${rateMoveBps >= 0 ? '+' : ''}${rateMoveBps.toFixed(1)} bp`
    : 'Waiting for 10Y yield';

  const dollar = bySymbol.get('DX-Y.NYB');
  const dollarMove = dollar?.changePercent;
  const dollarLabel = dollar?.trend?.label && dollar.trend.label !== 'Mixed trend'
    ? `Dollar ${dollar.trend.label.toLowerCase()}`
    : !Number.isFinite(dollarMove)
    ? 'Unavailable'
    : dollarMove > 0.2 ? 'Dollar stronger' : dollarMove < -0.2 ? 'Dollar weaker' : 'Dollar steady';
  const dollarDetail = trendDetail(dollar)
    || (Number.isFinite(dollarMove) ? `DXY ${dollarMove >= 0 ? '+' : ''}${dollarMove.toFixed(2)}%` : 'Waiting for DXY');

  const commodityRows = ['CL=F', 'HG=F', 'GC=F'].map((symbol) => bySymbol.get(symbol)).filter(Boolean);
  const commodityMoves = commodityRows.map((row) => row.changePercent).filter(Number.isFinite);
  const positiveCommodities = commodityMoves.filter((value) => value > 0.2).length;
  const negativeCommodities = commodityMoves.filter((value) => value < -0.2).length;
  const commodityTrends = commodityRows.map((row) => row.trend).filter(Boolean);
  const higherCommodityTrends = commodityTrends.filter((trend) => trend.direction === 'higher').length;
  const lowerCommodityTrends = commodityTrends.filter((trend) => trend.direction === 'lower').length;
  const commodityLabel = commodityTrends.length >= 2
    ? higherCommodityTrends >= 2 ? 'Commodities trending higher'
      : lowerCommodityTrends >= 2 ? 'Commodities trending lower' : 'Commodity trends mixed'
    : commodityMoves.length < 2
    ? 'Unavailable'
    : positiveCommodities >= 2 ? 'Commodity bid' : negativeCommodities >= 2 ? 'Commodity pressure' : 'Commodity split';
  const averageCommodityMoveRatio = averageFinite(commodityTrends.map((trend) =>
    Number.isFinite(trend.todayMove) && Number.isFinite(trend.medianDailyMove) && trend.medianDailyMove > 0
      ? Math.abs(trend.todayMove) / trend.medianDailyMove
      : null
  ));
  const commodityDistance20 = averageFinite(commodityTrends.map((trend) => trend.distance20));
  const commodityDistance50 = averageFinite(commodityTrends.map((trend) => trend.distance50));
  const commodityMoveLabel = moveLabelForRatio(averageCommodityMoveRatio);
  const commodityDetail = commodityTrends.length >= 2
    ? [
      `Today's moves ${commodityMoveLabel.toLowerCase()}`,
      Number.isFinite(commodityDistance20) ? `avg ${commodityDistance20 >= 0 ? '+' : ''}${commodityDistance20.toFixed(1)}% vs 20D` : null,
      Number.isFinite(commodityDistance50) ? `avg ${commodityDistance50 >= 0 ? '+' : ''}${commodityDistance50.toFixed(1)}% vs 50D` : null,
    ].filter(Boolean).join(' · ')
    : `${positiveCommodities} rising / ${negativeCommodities} falling`;

  return {
    cards: [
      { id: 'risk', label: 'Risk tone', value: riskLabel, detail: Number.isFinite(riskAverage) ? `Equity proxy average ${riskAverage >= 0 ? '+' : ''}${riskAverage.toFixed(2)}%` : 'Waiting for equity proxies' },
      { id: 'rates', label: 'Rates', value: ratesLabel, detail: ratesDetail },
      { id: 'dollar', label: 'US dollar', value: dollarLabel, detail: dollarDetail },
      { id: 'commodities', label: 'Commodity pulse', value: commodityLabel, detail: commodityDetail },
    ],
    summary: `${riskLabel}. ${ratesLabel}. ${dollarLabel}. ${commodityLabel}.`,
  };
}

module.exports = {
  DAY_MS,
  INTERMARKET_INSTRUMENTS,
  buildDailyInstrument,
  buildTrendContext,
  buildRelationships,
  buildMacroState,
  extractCloseSeries,
  getLastFinite,
  percentChange,
  replayPoints,
};
