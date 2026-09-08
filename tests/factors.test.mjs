import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const require = createRequire(import.meta.url);
const factorsApi = require('../api/factors.js');

test('FactorsToday residual momentum is normalized into a ticker lookup', () => {
  const result = factorsApi.normalizeResidualPayload({
    as_of_date: '2026-09-04',
    universe_count: 2,
    model: 'Base + Sector',
    stocks: [{
      ticker: 'XYZ', full_name: 'Example Corp', sector: 'Technology',
      market_cap: 12000000000, close: 84.12, cum_21d: 0.042,
      cum_63d: 0.11, cum_126d: 0.21, cum_252d: 0.33,
      trend_tstat_126d: 3.4, momentum_score: 0.19, decile: 1,
      is_trending: true, trend_direction: 1,
    }],
  });
  assert.equal(result.asOfDate, '2026-09-04');
  assert.equal(result.model, 'Base + Sector');
  assert.equal(result.byTicker.XYZ.decile, 1);
  assert.equal(result.byTicker.XYZ.momentumScore, 0.19);
  assert.equal(result.byTicker.XYZ.isTrending, true);
});

test('normalizer falls back to ranked lists when full stocks are absent', () => {
  const result = factorsApi.normalizeResidualPayload({
    top: [{ ticker: 'AAA', momentum_score: 0.1, decile: 1 }],
    bottom: [{ ticker: 'BBB', momentum_score: -0.1, decile: 10 }],
  });
  assert.deepEqual(Object.keys(result.byTicker).sort(), ['AAA', 'BBB']);
});

test('stock loadings keep only the latest Base + Sector model rows', () => {
  const rows = factorsApi.normalizeLoadingsPayload([
    { model_name: 'All Factors', date: '2026-09-04', factor_name: 'Market', beta: 1.3 },
    { model_name: 'Base + Sector', date: '2026-09-03', factor_name: 'Market', beta: 1.2 },
    { model_name: 'Base + Sector', date: '2026-09-04', factor_name: 'Market', beta: 1.1, r_squared: 0.47 },
    { model_name: 'Base + Sector', date: '2026-09-04', factor_name: 'Momentum', beta: -0.2, r_squared: 0.47 },
  ]);
  assert.deepEqual(rows.map((row) => row.factorName), ['Market', 'Momentum']);
  assert.equal(rows[0].rSquared, 0.47);
});

test('specific-volatility normalization omits the large return history', () => {
  const result = factorsApi.normalizeSpecificVolatility({
    ticker: 'AAPL', window: 252, specific_vol_annual: 0.24,
    specific_vol_daily: 0.015, r_squared: 0.61,
    adjusted_r_squared: 0.6, returns: Array(252).fill({ date: '2026-01-01', value: 0.01 }),
  });
  assert.equal(result.specific_vol_annual, 0.24);
  assert.equal(result.r_squared, 0.61);
  assert.equal('returns' in result, false);
});

test('S&P Action Board and ticker drawer request factor context', async () => {
  const app = await readFile(new URL('../public/sp500ad/app.js', import.meta.url), 'utf8');
  assert.match(app, /Factor confirmed/);
  assert.match(app, /Factor context/);
  assert.match(app, /\/api\/factors\?tickers=/);
  assert.match(app, /query\.set\('symbols', symbols\.join\(','\)\)/);
});
