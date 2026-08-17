import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  buildDailyInstrument,
  buildMacroState,
  buildRelationships,
  buildTrendContext,
  percentChange,
  replayPoints,
} = require('../api/_lib/intermarket.js');

function spark(symbol, currentPrice, previousClose, closes = [90, 95, 100]) {
  return {
    symbol,
    response: [{
      meta: { regularMarketPrice: currentPrice, regularMarketPreviousClose: previousClose },
      timestamp: [1_760_000_000, 1_770_000_000, 1_780_000_000],
      close: closes,
    }],
  };
}

test('daily instrument preserves the instrument definition and calculates normalized returns', () => {
  const row = buildDailyInstrument(
    { symbol: 'SPY', name: 'S&P 500', group: 'Equities' },
    spark('SPY', 110, 100),
    1_780_000_000 * 1000
  );
  assert.equal(row.symbol, 'SPY');
  assert.ok(Math.abs(row.changePercent - 10) < 1e-9);
  assert.ok(Array.isArray(row.replayDaily));
  assert.equal(row.replayDaily.at(-1)[1], 100);
});

test('trend context separates daily move size from 20D and 50D structure', () => {
  const replayDaily = Array.from({ length: 60 }, (_, index) => [index, 4 + index * 0.01]);
  const trend = buildTrendContext({
    currentPrice: 4.62,
    previousClose: 4.60,
    replayDaily,
    format: 'yield',
  });
  assert.equal(trend.label, 'Trending higher');
  assert.equal(trend.direction, 'higher');
  assert.equal(trend.moveUnit, 'bp');
  assert.ok(Math.abs(trend.todayMove - 2) < 1e-9);
  assert.ok(trend.distance20 > 0);
  assert.ok(trend.distance50 > trend.distance20);
  assert.equal(trend.moveLabel, 'Large');
});

test('trend context uses percentage distances for non-yield assets', () => {
  const replayDaily = Array.from({ length: 60 }, (_, index) => [index, 160 - index]);
  const trend = buildTrendContext({
    currentPrice: 99,
    previousClose: 100,
    replayDaily,
  });
  assert.equal(trend.label, 'Trending lower');
  assert.equal(trend.direction, 'lower');
  assert.equal(trend.moveUnit, '%');
  assert.ok(trend.distance20 < 0);
  assert.ok(trend.distance50 < 0);
});

test('relationship returns compare matched percentage horizons', () => {
  const rows = [
    { symbol: 'IWM', currentPrice: 220, changePercent: 2, perf1w: 5, perf1m: 8, perf3m: 10 },
    { symbol: 'SPY', currentPrice: 550, changePercent: 1, perf1w: 2, perf1m: 4, perf3m: 5 },
    { symbol: 'QQQ', currentPrice: 500, changePercent: 1, perf1w: 2, perf1m: 4, perf3m: 5 },
    { symbol: 'HYG', currentPrice: 80, changePercent: 0, perf1w: 1, perf1m: 1, perf3m: 1 },
    { symbol: 'LQD', currentPrice: 100, changePercent: 0, perf1w: 0, perf1m: 0, perf3m: 0 },
    { symbol: 'HG=F', currentPrice: 4, changePercent: 0, perf1w: 1, perf1m: 1, perf3m: 1 },
    { symbol: 'GC=F', currentPrice: 2000, changePercent: 0, perf1w: 0, perf1m: 0, perf3m: 0 },
    { symbol: '^TNX', currentPrice: 4.2 },
    { symbol: '^IRX', currentPrice: 3.8 },
  ];
  const relationships = buildRelationships(rows);
  const smallCaps = relationships.find((row) => row.id === 'small-cap-risk');
  assert.ok(smallCaps.changePercent > 0.98 && smallCaps.changePercent < 1);
  assert.equal(Math.round(relationships.find((row) => row.id === 'yield-curve').currentSpreadBps), 40);
});

test('macro state uses equity, volatility, yield, dollar, and commodity inputs without forecasting', () => {
  const rows = [
    { symbol: 'SPY', changePercent: 1 },
    { symbol: 'QQQ', changePercent: 1.2 },
    { symbol: 'IWM', changePercent: 1.4 },
    { symbol: 'EEM', changePercent: 0.8 },
    { symbol: '^VIX', changePercent: -4 },
    { symbol: '^TNX', change: 0.05 },
    { symbol: 'DX-Y.NYB', changePercent: -0.3 },
    { symbol: 'CL=F', changePercent: 1 },
    { symbol: 'HG=F', changePercent: 0.8 },
    { symbol: 'GC=F', changePercent: -0.1 },
  ];
  const result = buildMacroState(rows);
  assert.match(result.summary, /Risk-on/);
  assert.match(result.summary, /Yields rising/);
  assert.match(result.summary, /Dollar weaker/);
  assert.match(result.summary, /Commodity bid/);
});

test('macro state exposes structural dollar and aggregate commodity trend context', () => {
  const trend = (direction, distance20, distance50, todayMove = 1, medianDailyMove = 1) => ({
    label: `Trending ${direction}`,
    direction,
    distance20,
    distance50,
    todayMove,
    medianDailyMove,
    moveLabel: 'Typical',
    moveUnit: '%',
  });
  const rows = [
    { symbol: 'SPY', changePercent: 0 },
    { symbol: 'QQQ', changePercent: 0 },
    { symbol: 'IWM', changePercent: 0 },
    { symbol: 'EEM', changePercent: 0 },
    { symbol: '^VIX', changePercent: 0 },
    { symbol: '^TNX', change: 0.02 },
    { symbol: 'DX-Y.NYB', changePercent: -0.2, trend: trend('lower', -1.2, -2.4, -0.2, 0.2) },
    { symbol: 'CL=F', changePercent: 1, trend: trend('higher', 3, 5) },
    { symbol: 'HG=F', changePercent: 0.5, trend: trend('higher', 2, 4) },
    { symbol: 'GC=F', changePercent: -0.2, trend: trend('mixed', -1, 0) },
  ];
  const result = buildMacroState(rows);
  const dollar = result.cards.find((card) => card.id === 'dollar');
  const commodities = result.cards.find((card) => card.id === 'commodities');
  assert.equal(dollar.value, 'Dollar trending lower');
  assert.match(dollar.detail, /typical/);
  assert.match(dollar.detail, /vs 20D/);
  assert.equal(commodities.value, 'Commodities trending higher');
  assert.match(commodities.detail, /moves typical/);
  assert.match(commodities.detail, /avg \+1\.3% vs 20D/);
  assert.match(commodities.detail, /avg \+3\.0% vs 50D/);
});

test('replay points deduplicate timestamps and percent change rejects invalid bases', () => {
  assert.deepEqual(replayPoints([100, 100, 200], [1, 2, 3]), [[100, 2], [200, 3]]);
  assert.equal(percentChange(2, 0), null);
  assert.ok(Math.abs(percentChange(110, 100) - 10) < 1e-9);
});
