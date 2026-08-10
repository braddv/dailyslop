import test from "node:test";
import assert from "node:assert/strict";
import { buildSignalSnapshot } from "../api/_lib/signals.js";

function points(count, end, spacing, slope, staleSeconds = 0) {
  return Array.from({ length: count }, (_, index) => [
    end - staleSeconds - (count - 1 - index) * spacing,
    100 + slope * index,
  ]);
}

function stock(symbol, index, cutoff, staleSeconds = 0) {
  const slope = (index - 5) * 0.08 || 0.03;
  return {
    symbol,
    security: symbol,
    sector: "Information Technology",
    subIndustry: "Software",
    marketCap: 1000 + index,
    replayDay15m: points(52, cutoff, 15 * 60, slope, staleSeconds),
    replayWeekHourly: points(100, cutoff, 60 * 60, slope, staleSeconds),
    replayDaily: points(190, cutoff, 24 * 60 * 60, slope, staleSeconds),
  };
}

test("one stale security cannot zero the active stock universe", () => {
  const cutoff = Date.parse("2026-08-10T18:00:00.000Z") / 1000;
  const active = Array.from({ length: 12 }, (_, index) =>
    stock(`S${index}`, index, cutoff)
  );
  const stale = stock("EA", 12, cutoff, 6 * 24 * 60 * 60);

  const result = buildSignalSnapshot({ stocks: [...active, stale], benchmarks: [] }, cutoff, []);

  assert.equal(result.rows.length, active.length);
  assert.ok(!result.rows.some((row) => row.symbol === "EA"));
  assert.ok(result.rows.every((row) =>
    row.positiveShort > 0 ||
    row.positiveLong > 0 ||
    row.negativeShort > 0 ||
    row.negativeLong > 0
  ));
});

test("one irregular timestamp series cannot expand the shared frame requirement", () => {
  const cutoff = Date.parse("2026-08-10T18:00:00.000Z") / 1000;
  const active = Array.from({ length: 12 }, (_, index) =>
    stock(`S${index}`, index, cutoff)
  );
  const irregular = stock("ODD", 12, cutoff);
  irregular.replayDay15m = [
    ...irregular.replayDay15m.slice(0, -1).map(([timestamp, price]) => [
      timestamp - 6 * 24 * 60 * 60,
      price,
    ]),
    irregular.replayDay15m.at(-1),
  ];

  const result = buildSignalSnapshot(
    { stocks: [...active, irregular], benchmarks: [] }, cutoff, []
  );

  assert.equal(result.rows.length, active.length + 1);
  assert.ok(result.rows.every((row) =>
    row.positiveShort > 0 ||
    row.positiveLong > 0 ||
    row.negativeShort > 0 ||
    row.negativeLong > 0
  ));
});

test("historical signal reconstruction ignores prices after its cutoff", () => {
  const cutoff = Date.parse("2026-08-10T18:00:00.000Z") / 1000;
  const baseStocks = Array.from({ length: 12 }, (_, index) =>
    stock(`S${index}`, index, cutoff)
  );
  const futureStocks = baseStocks.map((row) => ({
    ...row,
    replayDay15m: [...row.replayDay15m, [cutoff + 15 * 60, 10000]],
    replayWeekHourly: [...row.replayWeekHourly, [cutoff + 60 * 60, 10000]],
    replayDaily: [...row.replayDaily, [cutoff + 24 * 60 * 60, 10000]],
  }));

  const base = buildSignalSnapshot({ stocks: baseStocks, benchmarks: [] }, cutoff, []);
  const withFuture = buildSignalSnapshot({ stocks: futureStocks, benchmarks: [] }, cutoff, []);

  assert.deepEqual(withFuture.rows, base.rows);
});
