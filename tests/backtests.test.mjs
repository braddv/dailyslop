import test from "node:test";
import assert from "node:assert/strict";
import {
  attachPointInTimeRegimes,
  buildBullishRegimeBacktest,
  groupTradingEpisodes,
} from "../api/_lib/backtests.js";

const DAY = 24 * 60 * 60 * 1000;

function at(day) {
  return new Date(Date.UTC(2026, 0, 1) + day * DAY).toISOString();
}

function outcome({
  day = 0,
  symbol = "AAA",
  signalType = "acceleration",
  isSector = false,
  five = 2,
  ten = 3,
  outcome10Day = day + 10,
} = {}) {
  return {
    snapshot_at: at(day),
    symbol,
    security: `${symbol} Inc.`,
    sector: "Information Technology",
    signal_type: signalType,
    is_sector: isSector,
    entry_price: 100,
    outcome_1_at: at(day + 1),
    outcome_1_price: 101,
    one_session_return: 1,
    outcome_3_at: at(day + 3),
    outcome_3_price: 101.5,
    three_session_return: 1.5,
    outcome_5_at: five === null ? null : at(day + 5),
    outcome_5_price: five === null ? null : 100 * (1 + five / 100),
    five_session_return: five,
    outcome_10_at: ten === null ? null : at(outcome10Day),
    outcome_10_price: ten === null ? null : 100 * (1 + ten / 100),
    ten_session_return: ten,
  };
}

function regime(day, label = "Bull trend", evidenceDay = day) {
  return {
    snapshot_at: at(day),
    sector: "Information Technology",
    regime: label,
    confidence: "medium",
    evidence_through: at(evidenceDay),
    materialization_version: 2,
  };
}

test("attaches only the same-snapshot sector regime and exposes point-in-time fields", () => {
  const [row] = attachPointInTimeRegimes([outcome()], [regime(0)]);
  assert.equal(row.sector_regime_at_signal, "Bull trend");
  assert.equal(row.sector_regime_snapshot_at, at(0));
  assert.equal(row.sector_regime_evidence_through, at(0));
  assert.equal(row.sector_regime_availability, "available");
  assert.equal(row.asset_class, "individual_stock");
});

test("never substitutes a later regime for an earlier signal", () => {
  const [row] = attachPointInTimeRegimes([outcome()], [regime(1)]);
  assert.equal(row.sector_regime_at_signal, null);
  assert.equal(row.sector_regime_availability, "unavailable");
});

test("rejects a regime whose evidence uses data later than the signal", () => {
  const [row] = attachPointInTimeRegimes([outcome()], [regime(0, "Bull trend", 1)]);
  assert.equal(row.sector_regime_at_signal, null);
  assert.equal(row.sector_regime_availability, "invalid_future_evidence");
});

test("5-versus-10 comparisons use a matched cohort and never turn missing returns into zero", () => {
  const rows = attachPointInTimeRegimes(
    [outcome(), outcome({ symbol: "BBB", five: 4, ten: null })],
    [regime(0)]
  );
  const result = buildBullishRegimeBacktest(rows);
  const summary = result.summaries.find((row) =>
    row.signalType === "acceleration" &&
    row.sectorRegime === "Bull trend" &&
    row.assetClass === "individual_stock"
  );
  assert.equal(summary.eligibleObservationCount, 2);
  assert.equal(summary.matchedObservationCount, 1);
  assert.equal(summary.excludedIncompleteOrUnavailable, 1);
  assert.equal(summary.rawSignalObservations.fiveSession.averageReturn, 2);
  assert.equal(summary.rawSignalObservations.tenSession.averageReturn, 3);
  assert.equal(summary.rawSignalObservations.difference10Minus5.averageReturn, 1);
});

test("keeps individual stocks and ordinary sector ETFs in separate samples", () => {
  const rows = attachPointInTimeRegimes(
    [outcome({ symbol: "AAA" }), outcome({ symbol: "XLK", isSector: true })],
    [regime(0)]
  );
  const result = buildBullishRegimeBacktest(rows);
  const find = (assetClass) => result.summaries.find((row) =>
    row.signalType === "acceleration" && row.sectorRegime === "Bull trend" &&
    row.assetClass === assetClass
  );
  assert.equal(find("individual_stock").matchedObservationCount, 1);
  assert.equal(find("sector_etf").matchedObservationCount, 1);
  assert.equal(find("combined").matchedObservationCount, 2);
});

test("groups overlapping ticker signals into one active 10-session trading episode", () => {
  const rows = [
    outcome({ day: 0, outcome10Day: 10 }),
    outcome({ day: 5, outcome10Day: 15 }),
    outcome({ day: 11, outcome10Day: 21 }),
  ];
  const episodes = groupTradingEpisodes(rows);
  assert.equal(episodes.length, 2);
  assert.deepEqual(episodes.map((row) => row.snapshot_at), [at(0), at(11)]);
});

test("deduplicates ticker-session observations before episode statistics", () => {
  const rows = attachPointInTimeRegimes([outcome(), outcome()], [regime(0)]);
  const result = buildBullishRegimeBacktest(rows);
  const summary = result.summaries.find((row) =>
    row.signalType === "acceleration" && row.sectorRegime === "Bull trend" &&
    row.assetClass === "individual_stock"
  );
  assert.equal(summary.rawSignalObservations.observationCount, 2);
  assert.equal(summary.uniqueTickerSessions.observationCount, 1);
  assert.equal(summary.uniqueTradingEpisodes.observationCount, 1);
});

test("does not recommend a longer horizon merely because it is less negative", () => {
  const outcomes = Array.from({ length: 20 }, (_, index) =>
    outcome({ symbol: `T${index}`, five: -2, ten: -1 })
  );
  const rows = attachPointInTimeRegimes(outcomes, [regime(0)]);
  const result = buildBullishRegimeBacktest(rows);
  const recommendation = result.recommendations.find((row) =>
    row.signalType === "acceleration" && row.sectorRegime === "Bull trend" &&
    row.assetClass === "individual_stock"
  );
  assert.equal(recommendation.preferredHoldingSessions, null);
  assert.equal(recommendation.recommendationStatus, "insufficient_evidence");
});

test("produces a specific supported recommendation only from adequate stable episodes", () => {
  const outcomes = Array.from({ length: 20 }, (_, index) =>
    outcome({ symbol: `T${index}`, five: 1, ten: 2 })
  );
  const rows = attachPointInTimeRegimes(outcomes, [regime(0)]);
  const result = buildBullishRegimeBacktest(rows);
  const recommendation = result.recommendations.find((row) =>
    row.signalType === "acceleration" && row.sectorRegime === "Bull trend" &&
    row.assetClass === "individual_stock"
  );
  assert.equal(recommendation.preferredHoldingSessions, 10);
  assert.equal(recommendation.recommendationStatus, "supported");
  assert.match(recommendation.rationale, /individual_stock acceleration.*Bull trend.*10-session/);
});

test("excludes suspected corporate-action discontinuities from matched results", () => {
  const split = outcome();
  split.outcome_1_price = 50;
  split.one_session_return = -50;
  const [row] = attachPointInTimeRegimes([split], [regime(0)]);
  assert.equal(row.outcome_data_quality, "suspected_corporate_action");
  const result = buildBullishRegimeBacktest([row]);
  const summary = result.summaries.find((item) =>
    item.signalType === "acceleration" && item.sectorRegime === "Bull trend" &&
    item.assetClass === "individual_stock"
  );
  assert.equal(summary.matchedObservationCount, 0);
});
