import assert from 'node:assert/strict';
import test from 'node:test';
import '../public/shared/leadership-quality.js';

const { calculateLeadershipQuality } = globalThis.DailySlopLeadershipQuality;

test('leadership quality identifies broad participation', () => {
  const result = calculateLeadershipQuality({
    benchmarkReturn: 2,
    groupReturn: 4,
    members: Array.from({ length: 12 }, (_, index) => ({
      returnValue: 3 + (index % 3),
      marketCap: 100,
    })),
  });
  assert.equal(result.classification, 'Broad');
  assert.equal(result.participation, 100);
  assert.equal(result.relativeReturn, 2);
  assert.equal(result.weightingGap, 0);
});

test('leadership quality detects concentrated cap-weighted leadership', () => {
  const result = calculateLeadershipQuality({
    benchmarkReturn: 1,
    groupReturn: 5,
    members: [
      { returnValue: 10, marketCap: 1000 },
      { returnValue: 0, marketCap: 20 },
      { returnValue: -1, marketCap: 20 },
      { returnValue: 0, marketCap: 20 },
      { returnValue: -1, marketCap: 20 },
      { returnValue: 0, marketCap: 20 },
    ],
  });
  assert.equal(result.classification, 'Concentrated');
  assert.ok(result.participation < 45);
  assert.ok(result.weightingGap > 2);
});

test('leadership quality requires a benchmark and at least two usable constituents', () => {
  assert.equal(calculateLeadershipQuality({ benchmarkReturn: null, members: [] }), null);
  assert.equal(calculateLeadershipQuality({ benchmarkReturn: 1, members: [{ returnValue: 2, marketCap: 10 }] }), null);
});
