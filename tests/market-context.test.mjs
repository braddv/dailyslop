import assert from "node:assert/strict";
import test from "node:test";

import {
  buildMarketContextSnapshot,
  marketContextCoverage,
} from "../api/_lib/market-context.js";

const snapshotAt = "2026-08-17T18:00:00.000Z";
const cutoff = Date.parse(snapshotAt) / 1000;
const priorDay = Date.parse("2026-08-14T13:30:00.000Z") / 1000;
const monthBase = Date.parse("2026-07-16T13:30:00.000Z") / 1000;

function instrument(symbol, before = 100, future = 999, previous = 95) {
  return {
    symbol,
    name: symbol,
    group: "Test",
    replayDaily: [
      [monthBase, 80],
      [priorDay, previous],
      [Date.parse("2026-08-17T13:30:00.000Z") / 1000, future],
    ],
    replayDay15m: [
      [cutoff - 900, before],
      [cutoff + 900, future],
    ],
    replayWeekHourly: [],
  };
}

function signalRows() {
  const stocks = Array.from({ length: 100 }, (_, index) => ({
    symbol: `S${index}`,
    sector: index < 50 ? "Energy" : "Technology",
    isSector: false,
    return1d: index < 60 ? 1 : -1,
  }));
  return [
    ...stocks,
    { symbol: "XLE", sector: "Energy", isSector: true, return1d: 2.5, return1w: 4, return1m: 8 },
    { symbol: "XLK", sector: "Information Technology", isSector: true, return1d: -0.5, return1w: 1, return1m: 3 },
  ];
}

test("market context uses only prices available at the signal cutoff", () => {
  const symbols = [
    "SPY", "QQQ", "IWM", "EEM", "^VIX", "HYG", "LQD", "^IRX", "^TNX",
    "DX-Y.NYB", "CL=F", "HG=F", "GC=F",
  ];
  const context = buildMarketContextSnapshot({
    snapshotAt,
    signalRows: signalRows(),
    intermarketPayload: {
      asOf: "2026-08-17T18:30:00.000Z",
      instruments: symbols.map((symbol) => instrument(symbol)),
    },
    regime: { regime: "Bull trend", confidence: "high", evidence_through: snapshotAt },
  });

  assert.equal(context.availability, "available");
  assert.equal(context.evidenceThrough, snapshotAt);
  assert.equal(context.overallRegime, "Bull trend");
  assert.equal(context.regimeEvidenceThrough, snapshotAt);
  assert.equal(context.breadth.advancers, 60);
  assert.equal(context.breadth.decliners, 40);
  assert.equal(context.breadth.percentAdvancing, 60);
  assert.equal(context.leadingSectors[0].sector, "Energy");
  assert.equal(context.instruments.find((row) => row.symbol === "SPY").currentPrice, 100);
  assert.ok(Math.abs(
    context.instruments.find((row) => row.symbol === "SPY").changePercent - 5.2631578947
  ) < 0.0001);
  assert.equal(context.relationships.length, 5);
});

test("market context rejects a regime whose evidence is later than the signal", () => {
  assert.throws(() => buildMarketContextSnapshot({
    snapshotAt,
    signalRows: signalRows(),
    intermarketPayload: { instruments: [] },
    regime: {
      regime: "Bull trend",
      confidence: "high",
      evidence_through: "2026-08-18T18:00:00.000Z",
    },
  }), /future evidence/);
});

test("same-day daily values cannot substitute for missing point-in-time intraday data", () => {
  const context = buildMarketContextSnapshot({
    snapshotAt,
    signalRows: signalRows(),
    intermarketPayload: {
      asOf: "2026-08-17T21:00:00.000Z",
      instruments: [{
        ...instrument("SPY"),
        replayDay15m: [[cutoff + 900, 999]],
      }],
    },
  });

  assert.equal(context.availability, "partial");
  assert.equal(context.instruments.length, 0);
  assert.equal(context.riskTone, "Unavailable");
});

test("context coverage marks historical signal sessions without stored context as unavailable", () => {
  const sessions = [snapshotAt, "2026-08-14T18:00:00.000Z"];
  assert.deepEqual(
    marketContextCoverage(sessions, [{ snapshot_at: snapshotAt }]),
    { available: 1, unavailable: ["2026-08-14T18:00:00.000Z"] }
  );
});
