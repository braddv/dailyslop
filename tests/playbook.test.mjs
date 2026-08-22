import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { buildPlaybook, latestSessionRows, regimeScore, macroFitScore, diversifiedCandidates } = require('../public/playbook/ranking.js');

const recent = '2026-08-21T19:00:00.000Z';
const older = '2026-08-20T19:00:00.000Z';

function stock(symbol, sector, buckets, overrides = {}) {
  return {
    snapshot_at: recent, symbol, security: `${symbol} Corp`, sector, sub_industry: 'Test industry',
    is_sector: false, buckets, positive_short: 72, positive_long: 68, negative_short: 18,
    negative_long: 20, current_price: 100, return_1d: 1, return_1w: 3, return_1m: 8,
    distance_20d: 3, ...overrides,
  };
}

function sector(symbol, name, overrides = {}) {
  return {
    snapshot_at: recent, symbol, security: `${name} ETF`, sector: name, is_sector: true,
    buckets: [], positive_short: 75, positive_long: 70, negative_short: 20, negative_long: 18,
    ...overrides,
  };
}

function fixture(rows, regimes) {
  return {
    history: {
      sessions: [older, recent],
      rows: [{ ...stock('OLD', 'Old Sector', ['leader']), snapshot_at: older }, ...rows],
      regimes,
      marketContexts: [],
    },
    market: {
      asOf: recent,
      stocks: rows.filter((row) => !row.is_sector).map((row) => ({
        symbol: row.symbol, currentPrice: 101, changePercent: row.return_1d,
        perf1w: row.return_1w, perf1m: row.return_1m,
      })),
      benchmarks: rows.filter((row) => row.is_sector).map((row) => ({
        symbol: row.symbol, sector: row.sector, changePercent: 1, perf1w: 2.5, perf1m: 6,
      })),
    },
    intermarket: {
      asOf: recent,
      macroRegime: { label: 'Goldilocks', confidence: 'medium', note: 'Growth is firm.' },
      macroState: { riskTone: 'Risk-on' },
    },
  };
}

test('latestSessionRows selects only the newest complete snapshot', () => {
  const result = latestSessionRows({
    sessions: [older, recent],
    rows: [{ snapshot_at: older, symbol: 'OLD' }, { snapshot_at: recent, symbol: 'NEW' }],
  });
  assert.equal(result.snapshotAt, recent);
  assert.deepEqual(result.rows.map((row) => row.symbol), ['NEW']);
});

test('playbook ranks stocks only and separates bullish from bearish signals', () => {
  const rows = [
    stock('BULL', 'Technology', ['acceleration']),
    stock('BEAR', 'Financials', ['weakness'], {
      positive_short: 15, positive_long: 20, negative_short: 82, negative_long: 74,
      return_1d: -2, return_1w: -5, return_1m: -9, distance_20d: -4,
    }),
    sector('XLK', 'Technology'),
    sector('XLF', 'Financials', { positive_short: 20, positive_long: 15, negative_short: 78, negative_long: 70 }),
  ];
  const regimes = [
    { sector: 'Technology', regime: 'Bull trend', confidence: 'high' },
    { sector: 'Financials', regime: 'Bear trend', confidence: 'high' },
  ];
  const playbook = buildPlaybook(fixture(rows, regimes));
  assert.deepEqual(playbook.bullish.map((row) => row.symbol), ['BULL']);
  assert.deepEqual(playbook.bearish.map((row) => row.symbol), ['BEAR']);
  assert.equal(playbook.bullish[0].regime.confirmation.key, 'confirmed');
  assert.equal(playbook.bearish[0].regime.confirmation.key, 'confirmed');
  assert.ok(!playbook.bullish.some((row) => row.symbol === 'XLK'));
});

test('opposing sector regimes penalize rather than retroactively relabel candidates', () => {
  assert.ok(regimeScore({ regime: 'Bull trend', confidence: 'high' }, 'bullish') > 90);
  assert.ok(regimeScore({ regime: 'Bear trend', confidence: 'high' }, 'bullish') < 20);
  assert.ok(regimeScore({ regime: 'Bear trend', confidence: 'high' }, 'bearish') > 90);
});

test('weak confluence is not padded into a five-name list', () => {
  const rows = [
    stock('WEAK', 'Technology', [], { positive_short: 45, positive_long: 40 }),
    sector('XLK', 'Technology'),
  ];
  const playbook = buildPlaybook(fixture(rows, [
    { sector: 'Technology', regime: 'Bull trend', confidence: 'high' },
  ]));
  assert.equal(playbook.bullish.length, 0);
  assert.equal(playbook.bearish.length, 0);
});

test('candidate output is capped at five and includes transparent explanations', () => {
  const stocks = Array.from({ length: 7 }, (_, index) => stock(`S${index}`, 'Technology', ['leader'], {
    positive_short: 80 - index, positive_long: 75 - index,
  }));
  const rows = [...stocks, sector('XLK', 'Technology')];
  const playbook = buildPlaybook(fixture(rows, [
    { sector: 'Technology', regime: 'Bull trend', confidence: 'high' },
  ]));
  assert.equal(playbook.bullish.length, 5);
  assert.equal(playbook.bullish[0].symbol, 'S0');
  assert.match(playbook.bullish[0].explanation.why, /Confirmed leader/);
  assert.match(playbook.methodology, /Signal 40%/);
});

test('macro fit modestly favors aligned sectors without becoming a hard filter', () => {
  const reflation = { label: 'Reflation', confidence: 'high' };
  assert.ok(macroFitScore(reflation, 'Energy', 'bullish') > macroFitScore(reflation, 'Health Care', 'bullish'));
  assert.ok(macroFitScore(reflation, 'Utilities', 'bullish') < macroFitScore(reflation, 'Health Care', 'bullish'));
  assert.equal(macroFitScore(reflation, 'Health Care', 'bullish'), 50);
  assert.ok(macroFitScore({ ...reflation, confidence: 'low' }, 'Energy', 'bullish') < macroFitScore(reflation, 'Energy', 'bullish'));
});

test('diversified shortlist caps each sector at two names', () => {
  const candidates = [
    ...Array.from({ length: 4 }, (_, index) => ({ symbol: `H${index}`, sectorName: 'Health Care', score: 100 - index })),
    ...Array.from({ length: 2 }, (_, index) => ({ symbol: `T${index}`, sectorName: 'Technology', score: 90 - index })),
    { symbol: 'E0', sectorName: 'Energy', score: 80 },
  ];
  const result = diversifiedCandidates(candidates);
  assert.equal(result.length, 5);
  assert.equal(result.filter((candidate) => candidate.sectorName === 'Health Care').length, 2);
});
