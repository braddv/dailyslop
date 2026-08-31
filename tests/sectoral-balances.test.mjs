import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { buildPayload, mergeSeries, parseFredCsv, percentOfGdp, quarterLabel } = require('../api/_lib/sectoral-balances');

function map(values) { return new Map(Object.entries(values)); }

test('parseFredCsv reads dates and ignores missing observations', () => {
  const values = parseFredCsv('observation_date,TEST\n2025-01-01,10.5\n2025-04-01,.\n2025-07-01,-2\n', 'TEST');
  assert.deepEqual([...values], [['2025-01-01', 10.5], ['2025-07-01', -2]]);
});

test('mergeSeries normalizes balances and preserves both identities', () => {
  const input = {
    private: map({ '2025-01-01': 200 }),
    government: map({ '2025-01-01': -300 }),
    currentAccount: map({ '2025-01-01': -100 }),
    household: map({ '2025-01-01': 125 }),
    business: map({ '2025-01-01': 75 }),
    gdp: map({ '2025-01-01': 10000 }),
  };
  const [row] = mergeSeries(input);
  assert.equal(row.privatePct, 2);
  assert.equal(row.governmentPct, -3);
  assert.equal(row.foreignPct, 1);
  assert.equal(row.identityResidualPct, 0);
  assert.equal(row.householdPct + row.businessPct, row.privatePct);
});

test('mergeSeries excludes a newer quarter until every point-in-time input exists', () => {
  const input = {
    private: map({ '2025-01-01': 200 }), government: map({ '2025-01-01': -300 }),
    currentAccount: map({ '2025-01-01': -100, '2025-04-01': -120 }),
    household: map({ '2025-01-01': 125 }), business: map({ '2025-01-01': 75 }),
    gdp: map({ '2025-01-01': 10000, '2025-04-01': 10100 }),
  };
  const payload = buildPayload(input, { asOf: '2025-08-01T00:00:00.000Z' });
  assert.equal(payload.latestCompleteQuarter, '2025-01-01');
  assert.equal(payload.observations.length, 1);
});

test('format helpers produce GDP percentages and quarter labels', () => {
  assert.equal(percentOfGdp(-250, 10000), -2.5);
  assert.equal(quarterLabel('2026-04-01'), 'Q2 2026');
});
