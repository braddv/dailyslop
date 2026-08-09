import test from "node:test";
import assert from "node:assert/strict";
import {
  buildHistoricalRegimeBackfill,
  buildRegimeRecords,
  outcomesAvailableAsOf,
} from "../api/_lib/regimes.js";

test("historical regimes cannot consume outcomes completed after their snapshot", () => {
  const signalAt = "2026-02-20T19:00:00.000Z";
  const rows = outcomesAvailableAsOf([
    { outcome_10_at: "2026-02-19T19:00:00.000Z", ten_session_return: 1 },
    { outcome_10_at: "2026-02-21T19:00:00.000Z", ten_session_return: 2 },
    { outcome_10_at: null, ten_session_return: null },
  ], signalAt);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].ten_session_return, 1);
});

test("regime evidence-through reflects the completed outcome timestamp, not its entry signal", () => {
  const snapshotAt = "2026-02-20T19:00:00.000Z";
  const outcomeAt = "2026-02-19T19:00:00.000Z";
  const records = buildRegimeRecords([
    {
      symbol: "XLK", sector: "Information Technology", is_sector: true,
      positive_long: 80, negative_long: 10, return_1m: 4, distance_20d: 2,
    },
    {
      symbol: "AAA", sector: "Information Technology", is_sector: false,
      market_cap: 100, positive_long: 80, negative_long: 10, return_1m: 4, distance_20d: 2,
    },
  ], [
    {
      snapshot_at: "2026-02-05T19:00:00.000Z",
      outcome_10_at: outcomeAt,
      symbol: "AAA",
      sector: "Information Technology",
      is_sector: false,
      signal_type: "acceleration",
      ten_session_return: 2,
    },
  ], snapshotAt);
  assert.equal(records.find((row) => row.scopeKey === "market").evidenceThrough, outcomeAt);
  assert.equal(records.find((row) => row.scopeKey === "sector:Information Technology").evidenceThrough, outcomeAt);
});

test("historical regime backfill is chronological and uses only point-in-time inputs", () => {
  const first = "2026-02-20T19:00:00.000Z";
  const second = "2026-02-21T19:00:00.000Z";
  const rows = [first, second].flatMap((snapshotAt) => [
    {
      snapshot_at: snapshotAt, symbol: "XLK", sector: "Information Technology",
      is_sector: true, positive_long: 80, negative_long: 10, return_1m: 4,
      distance_20d: 2,
    },
    {
      snapshot_at: snapshotAt, symbol: "AAA", sector: "Information Technology",
      is_sector: false, market_cap: 100, positive_long: 80, negative_long: 10,
      return_1m: 4, distance_20d: 2,
    },
  ]);
  const records = buildHistoricalRegimeBackfill({
    missingSnapshotAts: [first, second],
    snapshotRows: rows,
    outcomeRows: [{
      snapshot_at: first,
      outcome_10_at: "2026-02-22T19:00:00.000Z",
      symbol: "AAA",
      sector: "Information Technology",
      is_sector: false,
      signal_type: "acceleration",
      ten_session_return: 9,
    }],
  });
  assert.equal(records.length, 4);
  assert.ok(records.every((record) => record.evidenceThrough === null));
  assert.deepEqual([...new Set(records.map((record) => record.snapshotAt))], [first, second]);
});
