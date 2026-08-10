import { neon } from "@neondatabase/serverless";
import { buildSignalSnapshot, historicalCutoffs } from "./_lib/signals.js";
import {
  buildHistoricalRegimeBackfill,
  buildRegimeRecords,
  REGIME_VERSION,
} from "./_lib/regimes.js";
import {
  attachPointInTimeRegimes,
  buildBullishRegimeBacktest,
  regimeCoverage,
} from "./_lib/backtests.js";

const sql = process.env.DATABASE_URL ? neon(process.env.DATABASE_URL) : null;
const OUTCOME_RESULT_LIMIT = 5000;
const OUTCOME_MATERIALIZATION_VERSION = 4;
let schemaPromise = null;

async function ensureSchema() {
  await sql`
    CREATE TABLE IF NOT EXISTS signal_runs (
      snapshot_at TIMESTAMPTZ PRIMARY KEY,
      source_as_of TIMESTAMPTZ,
      run_kind TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS signal_snapshots (
      snapshot_at TIMESTAMPTZ NOT NULL REFERENCES signal_runs(snapshot_at) ON DELETE CASCADE,
      symbol TEXT NOT NULL,
      security TEXT,
      sector TEXT,
      sub_industry TEXT,
      market_cap BIGINT,
      is_sector BOOLEAN NOT NULL DEFAULT FALSE,
      positive_short DOUBLE PRECISION NOT NULL,
      positive_long DOUBLE PRECISION NOT NULL,
      negative_short DOUBLE PRECISION NOT NULL,
      negative_long DOUBLE PRECISION NOT NULL DEFAULT 0,
      buckets JSONB NOT NULL DEFAULT '[]'::jsonb,
      current_price DOUBLE PRECISION,
      return_1d DOUBLE PRECISION,
      return_1w DOUBLE PRECISION,
      return_1m DOUBLE PRECISION,
      distance_5d DOUBLE PRECISION,
      distance_20d DOUBLE PRECISION,
      PRIMARY KEY (snapshot_at, symbol)
    )
  `;
  await sql`
    ALTER TABLE signal_snapshots
    ADD COLUMN IF NOT EXISTS negative_long DOUBLE PRECISION NOT NULL DEFAULT 0
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS signal_snapshots_symbol_time_idx
    ON signal_snapshots (symbol, snapshot_at DESC)
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS signal_snapshots_sector_time_idx
    ON signal_snapshots (sector, snapshot_at DESC)
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS signal_outcomes (
      snapshot_at TIMESTAMPTZ NOT NULL,
      symbol TEXT NOT NULL,
      signal_type TEXT NOT NULL,
      security TEXT,
      sector TEXT,
      sub_industry TEXT,
      is_sector BOOLEAN NOT NULL DEFAULT FALSE,
      entry_price DOUBLE PRECISION,
      outcome_1_at TIMESTAMPTZ,
      outcome_1_price DOUBLE PRECISION,
      one_session_return DOUBLE PRECISION,
      outcome_3_at TIMESTAMPTZ,
      outcome_3_price DOUBLE PRECISION,
      three_session_return DOUBLE PRECISION,
      outcome_5_at TIMESTAMPTZ,
      outcome_5_price DOUBLE PRECISION,
      five_session_return DOUBLE PRECISION,
      outcome_10_at TIMESTAMPTZ,
      outcome_10_price DOUBLE PRECISION,
      ten_session_return DOUBLE PRECISION,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (snapshot_at, symbol, signal_type)
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS signal_outcomes_type_time_idx
    ON signal_outcomes (signal_type, snapshot_at DESC)
  `;
  await sql`
    ALTER TABLE signal_outcomes
    ADD COLUMN IF NOT EXISTS outcome_10_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS outcome_10_price DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS ten_session_return DOUBLE PRECISION
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS signal_outcome_state (
      id BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id),
      last_snapshot_at TIMESTAMPTZ,
      materialization_version INTEGER NOT NULL DEFAULT 0,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    ALTER TABLE signal_outcome_state
    ADD COLUMN IF NOT EXISTS materialization_version INTEGER NOT NULL DEFAULT 0
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS signal_regimes (
      snapshot_at TIMESTAMPTZ NOT NULL REFERENCES signal_runs(snapshot_at) ON DELETE CASCADE,
      scope_key TEXT NOT NULL,
      sector TEXT,
      regime TEXT NOT NULL,
      candidate_regime TEXT NOT NULL,
      pending_label TEXT,
      pending_streak INTEGER NOT NULL DEFAULT 0,
      direction_score DOUBLE PRECISION,
      confidence TEXT NOT NULL,
      evidence_through TIMESTAMPTZ,
      sample_size INTEGER NOT NULL DEFAULT 0,
      details JSONB NOT NULL DEFAULT '{}'::jsonb,
      materialization_version INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (snapshot_at, scope_key)
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS signal_regimes_scope_time_idx
    ON signal_regimes (scope_key, snapshot_at DESC)
  `;
  await sql`
    DELETE FROM signal_runs r
    WHERE NOT EXISTS (
      SELECT 1 FROM signal_snapshots s WHERE s.snapshot_at = r.snapshot_at
    )
  `;
}

function ensureSchemaReady() {
  if (!schemaPromise) {
    schemaPromise = ensureSchema().catch((error) => {
      schemaPromise = null;
      throw error;
    });
  }
  return schemaPromise;
}

async function refreshSignalOutcomes(force = false) {
  const [latest] = await sql`
    SELECT MAX(snapshot_at) AS snapshot_at
    FROM signal_snapshots
  `;
  if (!latest?.snapshot_at) return { refreshed: false, snapshotAt: null };
  const [state] = await sql`
    SELECT last_snapshot_at, materialization_version
    FROM signal_outcome_state
    WHERE id = TRUE
  `;
  if (
    !force &&
    state?.last_snapshot_at &&
    Number(state.materialization_version) === OUTCOME_MATERIALIZATION_VERSION &&
    new Date(state.last_snapshot_at).getTime() === new Date(latest.snapshot_at).getTime()
  ) {
    return { refreshed: false, snapshotAt: latest.snapshot_at };
  }
  await sql`
    INSERT INTO signal_outcomes (
      snapshot_at, symbol, signal_type, security, sector, sub_industry, is_sector,
      entry_price, outcome_1_at, outcome_1_price, one_session_return,
      outcome_3_at, outcome_3_price, three_session_return,
      outcome_5_at, outcome_5_price, five_session_return,
      outcome_10_at, outcome_10_price, ten_session_return, updated_at
    )
    WITH session_targets AS (
      SELECT
        snapshot_at,
        LEAD(snapshot_at, 1) OVER (ORDER BY snapshot_at) AS outcome_1_at,
        LEAD(snapshot_at, 3) OVER (ORDER BY snapshot_at) AS outcome_3_at,
        LEAD(snapshot_at, 5) OVER (ORDER BY snapshot_at) AS outcome_5_at,
        LEAD(snapshot_at, 10) OVER (ORDER BY snapshot_at) AS outcome_10_at
      FROM signal_runs
    ),
    ordered_base AS (
      SELECT
        s.snapshot_at,
        s.symbol,
        s.security,
        s.sector,
        s.sub_industry,
        s.is_sector,
        s.buckets,
        s.current_price,
        LAG(s.buckets) OVER (
          PARTITION BY s.symbol
          ORDER BY s.snapshot_at
        ) AS previous_buckets,
        t.outcome_1_at,
        t.outcome_3_at,
        t.outcome_5_at,
        t.outcome_10_at
      FROM signal_snapshots s
      JOIN session_targets t USING (snapshot_at)
    ),
    ordered AS (
      SELECT
        b.*,
        p1.current_price AS outcome_1_price,
        p3.current_price AS outcome_3_price,
        p5.current_price AS outcome_5_price,
        p10.current_price AS outcome_10_price
      FROM ordered_base b
      LEFT JOIN signal_snapshots p1
        ON p1.snapshot_at = b.outcome_1_at AND p1.symbol = b.symbol
      LEFT JOIN signal_snapshots p3
        ON p3.snapshot_at = b.outcome_3_at AND p3.symbol = b.symbol
      LEFT JOIN signal_snapshots p5
        ON p5.snapshot_at = b.outcome_5_at AND p5.symbol = b.symbol
      LEFT JOIN signal_snapshots p10
        ON p10.snapshot_at = b.outcome_10_at AND p10.symbol = b.symbol
    ),
    events AS (
      SELECT
        o.*,
        signal.signal_type
      FROM ordered o
      CROSS JOIN LATERAL (
        VALUES
          ('pullback'),
          ('acceleration'),
          ('leader'),
          ('breakdown'),
          ('bounce'),
          ('weakness'),
          ('laggard'),
          ('breakout')
      ) AS signal(signal_type)
      WHERE
        o.previous_buckets IS NOT NULL
        AND o.buckets ? signal.signal_type
        AND NOT (o.previous_buckets ? signal.signal_type)
    )
    SELECT
      e.snapshot_at,
      e.symbol,
      e.signal_type,
      e.security,
      e.sector,
      e.sub_industry,
      e.is_sector,
      e.current_price,
      e.outcome_1_at,
      e.outcome_1_price,
      CASE
        WHEN e.current_price > 0 AND e.outcome_1_price IS NOT NULL
        THEN ((e.outcome_1_price / e.current_price) - 1) * 100
        ELSE NULL
      END,
      e.outcome_3_at,
      e.outcome_3_price,
      CASE
        WHEN e.current_price > 0 AND e.outcome_3_price IS NOT NULL
        THEN ((e.outcome_3_price / e.current_price) - 1) * 100
        ELSE NULL
      END,
      e.outcome_5_at,
      e.outcome_5_price,
      CASE
        WHEN e.current_price > 0 AND e.outcome_5_price IS NOT NULL
        THEN ((e.outcome_5_price / e.current_price) - 1) * 100
        ELSE NULL
      END,
      e.outcome_10_at,
      e.outcome_10_price,
      CASE
        WHEN e.current_price > 0 AND e.outcome_10_price IS NOT NULL
        THEN ((e.outcome_10_price / e.current_price) - 1) * 100
        ELSE NULL
      END,
      NOW()
    FROM events e
    ON CONFLICT (snapshot_at, symbol, signal_type)
    DO UPDATE SET
      security = EXCLUDED.security,
      sector = EXCLUDED.sector,
      sub_industry = EXCLUDED.sub_industry,
      is_sector = EXCLUDED.is_sector,
      entry_price = EXCLUDED.entry_price,
      outcome_1_at = EXCLUDED.outcome_1_at,
      outcome_1_price = EXCLUDED.outcome_1_price,
      one_session_return = EXCLUDED.one_session_return,
      outcome_3_at = EXCLUDED.outcome_3_at,
      outcome_3_price = EXCLUDED.outcome_3_price,
      three_session_return = EXCLUDED.three_session_return,
      outcome_5_at = EXCLUDED.outcome_5_at,
      outcome_5_price = EXCLUDED.outcome_5_price,
      five_session_return = EXCLUDED.five_session_return,
      outcome_10_at = EXCLUDED.outcome_10_at,
      outcome_10_price = EXCLUDED.outcome_10_price,
      ten_session_return = EXCLUDED.ten_session_return,
      updated_at = NOW()
  `;
  await sql`
    INSERT INTO signal_outcome_state (
      id, last_snapshot_at, materialization_version, updated_at
    )
    VALUES (
      TRUE, ${latest.snapshot_at}, ${OUTCOME_MATERIALIZATION_VERSION}, NOW()
    )
    ON CONFLICT (id)
    DO UPDATE SET
      last_snapshot_at = EXCLUDED.last_snapshot_at,
      materialization_version = EXCLUDED.materialization_version,
      updated_at = NOW()
  `;
  return { refreshed: true, snapshotAt: latest.snapshot_at };
}

async function regimeInputs(snapshotAt) {
  const currentRows = await sql`
    SELECT
      snapshot_at, symbol, sector, market_cap, is_sector, positive_long, negative_long,
      return_1m, distance_20d
    FROM signal_snapshots
    WHERE snapshot_at = ${snapshotAt}
  `;
  const maturedOutcomes = await sql`
    WITH recent_dates AS (
      SELECT DISTINCT snapshot_at
      FROM signal_outcomes
      WHERE ten_session_return IS NOT NULL
        AND outcome_10_at <= ${snapshotAt}
      ORDER BY snapshot_at DESC
      LIMIT 20
    )
    SELECT
      o.snapshot_at, o.outcome_10_at, o.symbol, o.sector, o.is_sector,
      o.signal_type, o.ten_session_return
    FROM signal_outcomes o
    JOIN recent_dates d USING (snapshot_at)
    WHERE o.ten_session_return IS NOT NULL
      AND o.outcome_10_at <= ${snapshotAt}
  `;
  const previousRows = await sql`
    SELECT scope_key, regime, pending_label, pending_streak
    FROM signal_regimes
    WHERE snapshot_at = (
      SELECT MAX(snapshot_at)
      FROM signal_regimes
      WHERE snapshot_at < ${snapshotAt}
    )
  `;
  return { currentRows, maturedOutcomes, previousRows };
}

async function persistRegimeRecords(records) {
  if (!records.length) return;
  const stored = JSON.stringify(records.map((record) => ({
    snapshot_at: record.snapshotAt,
    scope_key: record.scopeKey,
    sector: record.sector,
    regime: record.regime,
    candidate_regime: record.candidateRegime,
    pending_label: record.pendingLabel,
    pending_streak: record.pendingStreak,
    direction_score: record.directionScore,
    confidence: record.confidence,
    evidence_through: record.evidenceThrough,
    sample_size: record.sampleSize,
    details: record.details,
    materialization_version: record.version,
  })));
  await sql`
    INSERT INTO signal_regimes (
      snapshot_at, scope_key, sector, regime, candidate_regime, pending_label,
      pending_streak, direction_score, confidence, evidence_through, sample_size,
      details, materialization_version
    )
    SELECT
      x.snapshot_at, x.scope_key, x.sector, x.regime, x.candidate_regime,
      x.pending_label, x.pending_streak, x.direction_score, x.confidence,
      x.evidence_through, x.sample_size, x.details, x.materialization_version
    FROM jsonb_to_recordset(${stored}::jsonb) AS x(
      snapshot_at TIMESTAMPTZ,
      scope_key TEXT,
      sector TEXT,
      regime TEXT,
      candidate_regime TEXT,
      pending_label TEXT,
      pending_streak INTEGER,
      direction_score DOUBLE PRECISION,
      confidence TEXT,
      evidence_through TIMESTAMPTZ,
      sample_size INTEGER,
      details JSONB,
      materialization_version INTEGER
    )
    ON CONFLICT (snapshot_at, scope_key)
    DO UPDATE SET
      sector = EXCLUDED.sector,
      regime = EXCLUDED.regime,
      candidate_regime = EXCLUDED.candidate_regime,
      pending_label = EXCLUDED.pending_label,
      pending_streak = EXCLUDED.pending_streak,
      direction_score = EXCLUDED.direction_score,
      confidence = EXCLUDED.confidence,
      evidence_through = EXCLUDED.evidence_through,
      sample_size = EXCLUDED.sample_size,
      details = EXCLUDED.details,
      materialization_version = EXCLUDED.materialization_version,
      updated_at = NOW()
  `;
}

async function materializeRegimeSnapshot(snapshotAt) {
  const { currentRows, maturedOutcomes, previousRows } = await regimeInputs(snapshotAt);
  const records = buildRegimeRecords(
    currentRows,
    maturedOutcomes,
    new Date(snapshotAt).toISOString(),
    previousRows
  );
  await persistRegimeRecords(records);
  return records;
}

async function backfillMissingRegimes() {
  const missing = await sql`
    SELECT r.snapshot_at
    FROM signal_runs r
    LEFT JOIN signal_regimes g
      ON g.snapshot_at = r.snapshot_at AND g.scope_key = 'market'
    WHERE g.snapshot_at IS NULL
    ORDER BY r.snapshot_at ASC
  `;
  if (!missing.length) return { snapshotsBackfilled: 0, recordsSaved: 0 };
  const [snapshotRows, outcomeRows, existingRegimes] = await Promise.all([
    sql`
      SELECT
        snapshot_at, symbol, sector, market_cap, is_sector, positive_long, negative_long,
        return_1m, distance_20d
      FROM signal_snapshots
      ORDER BY snapshot_at ASC
    `,
    sql`
      SELECT
        snapshot_at, outcome_10_at, symbol, sector, is_sector, signal_type,
        ten_session_return
      FROM signal_outcomes
      WHERE ten_session_return IS NOT NULL AND outcome_10_at IS NOT NULL
      ORDER BY snapshot_at ASC
    `,
    sql`
      SELECT snapshot_at, scope_key, regime, pending_label, pending_streak
      FROM signal_regimes
      ORDER BY snapshot_at ASC
    `,
  ]);
  const recordsToSave = buildHistoricalRegimeBackfill({
    missingSnapshotAts: missing.map((row) => row.snapshot_at),
    snapshotRows,
    outcomeRows,
    existingRegimes,
  });
  await persistRegimeRecords(recordsToSave);
  return {
    snapshotsBackfilled: missing.length,
    recordsSaved: recordsToSave.length,
  };
}

async function refreshRegimes(force = false) {
  const [latest] = await sql`
    SELECT MAX(snapshot_at) AS snapshot_at
    FROM signal_snapshots
  `;
  if (!latest?.snapshot_at) return { refreshed: false, snapshotAt: null, records: [] };
  const [existing] = await sql`
    SELECT COUNT(*)::int AS total, MIN(materialization_version)::int AS version
    FROM signal_regimes
    WHERE snapshot_at = ${latest.snapshot_at}
  `;
  if (
    !force &&
    Number(existing?.total) > 0 &&
    Number(existing?.version) === REGIME_VERSION
  ) {
    return { refreshed: false, snapshotAt: latest.snapshot_at, records: [] };
  }
  const records = await materializeRegimeSnapshot(latest.snapshot_at);
  return { refreshed: records.length > 0, snapshotAt: latest.snapshot_at, records };
}

function storedRows(rows) {
  return rows.map((row) => ({
    snapshot_at: row.snapshotAt,
    symbol: row.symbol,
    security: row.security || null,
    sector: row.sector || null,
    sub_industry: row.subIndustry || null,
    market_cap: Number.isFinite(Number(row.marketCap)) ? Math.round(Number(row.marketCap)) : null,
    is_sector: row.isSector,
    positive_short: row.positiveShort,
    positive_long: row.positiveLong,
    negative_short: row.negativeShort,
    negative_long: row.negativeLong,
    buckets: row.buckets,
    current_price: row.currentPrice,
    return_1d: row.return1d,
    return_1w: row.return1w,
    return_1m: row.return1m,
    distance_5d: row.distance5d,
    distance_20d: row.distance20d,
  }));
}

async function persistSnapshotRows(rows) {
  if (!rows.length) return;
  const records = JSON.stringify(storedRows(rows));
  await sql`
    INSERT INTO signal_snapshots (
      snapshot_at, symbol, security, sector, sub_industry, market_cap, is_sector,
      positive_short, positive_long, negative_short, negative_long, buckets, current_price,
      return_1d, return_1w, return_1m, distance_5d, distance_20d
    )
    SELECT
      x.snapshot_at, x.symbol, x.security, x.sector, x.sub_industry, x.market_cap,
      x.is_sector, x.positive_short, x.positive_long, x.negative_short, x.negative_long, x.buckets,
      x.current_price, x.return_1d, x.return_1w, x.return_1m, x.distance_5d,
      x.distance_20d
    FROM jsonb_to_recordset(${records}::jsonb) AS x(
      snapshot_at TIMESTAMPTZ,
      symbol TEXT,
      security TEXT,
      sector TEXT,
      sub_industry TEXT,
      market_cap BIGINT,
      is_sector BOOLEAN,
      positive_short DOUBLE PRECISION,
      positive_long DOUBLE PRECISION,
      negative_short DOUBLE PRECISION,
      negative_long DOUBLE PRECISION,
      buckets JSONB,
      current_price DOUBLE PRECISION,
      return_1d DOUBLE PRECISION,
      return_1w DOUBLE PRECISION,
      return_1m DOUBLE PRECISION,
      distance_5d DOUBLE PRECISION,
      distance_20d DOUBLE PRECISION
    )
    ON CONFLICT (snapshot_at, symbol)
    DO UPDATE SET
      positive_short = EXCLUDED.positive_short,
      positive_long = EXCLUDED.positive_long,
      negative_short = EXCLUDED.negative_short,
      negative_long = EXCLUDED.negative_long,
      buckets = EXCLUDED.buckets,
      current_price = EXCLUDED.current_price,
      return_1d = EXCLUDED.return_1d,
      return_1w = EXCLUDED.return_1w,
      return_1m = EXCLUDED.return_1m,
      distance_5d = EXCLUDED.distance_5d,
      distance_20d = EXCLUDED.distance_20d
  `;
}

async function persistSnapshot(rows, sourceAsOf, kind) {
  if (!rows.length) return;
  const snapshotAt = rows[0].snapshotAt;
  await sql`
    INSERT INTO signal_runs (snapshot_at, source_as_of, run_kind)
    VALUES (${snapshotAt}, ${sourceAsOf}, ${kind})
    ON CONFLICT (snapshot_at)
    DO UPDATE SET source_as_of = EXCLUDED.source_as_of, run_kind = EXCLUDED.run_kind
  `;
  await persistSnapshotRows(rows);
}

function requestOrigin(req) {
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const protocol = req.headers["x-forwarded-proto"] || (String(host).includes("localhost") ? "http" : "https");
  return `${protocol}://${host}`;
}

async function fetchMarketPayload(req, refresh) {
  const response = await fetch(`${requestOrigin(req)}/api/sector-ad${refresh ? "?refresh=true" : ""}`, {
    headers: { accept: "application/json" },
  });
  if (!response.ok) throw new Error(`Market data refresh failed with ${response.status}`);
  return response.json();
}

function authorized(req) {
  if (!process.env.VERCEL || process.env.VERCEL_ENV === "development") return true;
  return Boolean(process.env.CRON_SECRET) &&
    req.headers.authorization === `Bearer ${process.env.CRON_SECRET}`;
}

function newYorkTime(date = new Date()) {
  const values = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      weekday: "short",
      hour: "2-digit",
      hourCycle: "h23",
    }).formatToParts(date).map((part) => [part.type, part.value])
  );
  return {
    weekday: values.weekday,
    hour: Number(values.hour),
  };
}

async function priorSnapshots(limit = 5) {
  const rows = await sql`
    WITH recent AS (
      SELECT snapshot_at
      FROM signal_runs
      ORDER BY snapshot_at DESC
      LIMIT ${limit}
    )
    SELECT s.snapshot_at, s.symbol, s.positive_short, s.positive_long, s.negative_short, s.negative_long
    FROM signal_snapshots s
    JOIN recent r USING (snapshot_at)
    ORDER BY s.snapshot_at ASC
  `;
  const grouped = new Map();
  rows.forEach((row) => {
    const key = new Date(row.snapshot_at).toISOString();
    if (!grouped.has(key)) grouped.set(key, new Map());
    grouped.get(key).set(row.symbol, {
      positiveShort: Number(row.positive_short),
      positiveLong: Number(row.positive_long),
      negativeShort: Number(row.negative_short),
      negativeLong: Number(row.negative_long),
    });
  });
  return [...grouped.values()];
}

async function priorSnapshotsBefore(snapshotAt, limit = 5) {
  const rows = await sql`
    WITH recent AS (
      SELECT snapshot_at
      FROM signal_runs
      WHERE snapshot_at < ${snapshotAt}
      ORDER BY snapshot_at DESC
      LIMIT ${limit}
    )
    SELECT
      s.snapshot_at, s.symbol, s.positive_short, s.positive_long,
      s.negative_short, s.negative_long
    FROM signal_snapshots s
    JOIN recent r USING (snapshot_at)
    ORDER BY s.snapshot_at ASC
  `;
  const grouped = new Map();
  rows.forEach((row) => {
    const key = new Date(row.snapshot_at).toISOString();
    if (!grouped.has(key)) grouped.set(key, new Map());
    grouped.get(key).set(row.symbol, {
      positiveShort: Number(row.positive_short),
      positiveLong: Number(row.positive_long),
      negativeShort: Number(row.negative_short),
      negativeLong: Number(row.negative_long),
    });
  });
  return [...grouped.values()];
}

async function corruptedStockSnapshots() {
  return sql`
    SELECT s.snapshot_at
    FROM signal_snapshots s
    GROUP BY s.snapshot_at
    HAVING
      COUNT(*) FILTER (WHERE s.is_sector = FALSE) >= 100
      AND COUNT(*) FILTER (
        WHERE s.is_sector = FALSE AND (
          s.positive_short <> 0 OR s.negative_short <> 0
        )
      ) = 0
    ORDER BY s.snapshot_at ASC
  `;
}

async function repairStockSignals(req) {
  if (!authorized(req)) return { status: 401, body: { error: "Unauthorized" } };
  const payload = await fetchMarketPayload(req, true);
  const targets = await corruptedStockSnapshots();
  const repaired = [];
  const skipped = [];
  for (const target of targets) {
    const snapshotAt = new Date(target.snapshot_at).toISOString();
    const cutoff = new Date(snapshotAt).getTime() / 1000;
    const prior = await priorSnapshotsBefore(snapshotAt);
    const result = buildSignalSnapshot(payload, cutoff, prior);
    const stockRows = result.rows.filter((row) => !row.isSector);
    const scoredStocks = stockRows.filter((row) =>
      row.positiveShort !== 0 || row.positiveLong !== 0 ||
      row.negativeShort !== 0 || row.negativeLong !== 0
    ).length;
    const minimumCoverage = Math.max(100, Math.floor((payload.stocks?.length || 0) * 0.7));
    if (stockRows.length < minimumCoverage || scoredStocks < minimumCoverage) {
      skipped.push({
        snapshotAt,
        reason: "Insufficient point-in-time replay coverage",
        stockRows: stockRows.length,
        scoredStocks,
        minimumCoverage,
      });
      continue;
    }
    await persistSnapshotRows(stockRows);
    repaired.push({ snapshotAt, stockRows: stockRows.length, scoredStocks });
  }
  const outcomes = repaired.length
    ? await refreshSignalOutcomes(true)
    : { refreshed: false };
  let regimeRecordsRefreshed = 0;
  for (const repair of repaired) {
    const records = await materializeRegimeSnapshot(repair.snapshotAt);
    regimeRecordsRefreshed += records.length;
  }
  return {
    status: 200,
    body: {
      success: true,
      mode: "repair-stock-signals",
      repaired,
      skipped,
      outcomesRefreshed: outcomes.refreshed,
      regimeRecordsRefreshed,
    },
  };
}

async function capture(req) {
  if (!authorized(req)) return { status: 401, body: { error: "Unauthorized" } };
  const ny = newYorkTime();
  if (["Sat", "Sun"].includes(ny.weekday) || ny.hour < 14) {
    return { status: 200, body: { skipped: true, reason: "Before the daily 2 PM snapshot window" } };
  }
  const payload = await fetchMarketPayload(req, true);
  const cutoffs = historicalCutoffs(payload, 1, 14);
  if (!cutoffs.length) throw new Error("No eligible 2 PM market sessions found");
  const prior = await priorSnapshots();
  let saved = 0;
  for (const cutoff of cutoffs) {
    const result = buildSignalSnapshot(payload, cutoff, prior);
    await persistSnapshot(result.rows, payload.asOf, "capture");
    prior.push(result.snapshot);
    if (prior.length > 5) prior.shift();
    saved += result.rows.length;
  }
  const outcomes = await refreshSignalOutcomes(true);
  const regimes = await refreshRegimes(true);
  return {
    status: 200,
    body: {
      success: true,
      mode: "capture",
      sessions: cutoffs.map((cutoff) => new Date(cutoff * 1000).toISOString()),
      rowsSaved: saved,
      outcomesRefreshed: outcomes.refreshed,
      regimesRefreshed: regimes.refreshed,
    },
  };
}

async function backfillRegimes(req) {
  if (!authorized(req)) return { status: 401, body: { error: "Unauthorized" } };
  const outcomes = await refreshSignalOutcomes(true);
  const latest = await refreshRegimes(true);
  const backfill = await backfillMissingRegimes();
  return {
    status: 200,
    body: {
      success: true,
      mode: "backfill-regimes",
      outcomesRefreshed: outcomes.refreshed,
      latestRegimeRefreshed: latest.refreshed,
      regimeSnapshotsBackfilled: backfill.snapshotsBackfilled,
      regimeRecordsBackfilled: backfill.recordsSaved,
    },
  };
}

async function history(req) {
  const limit = Math.min(30, Math.max(1, Number(req.query?.limit) || 10));
  const includeOutcomes = String(req.query?.includeOutcomes || "").toLowerCase() === "true";
  const compact = String(req.query?.compact || "").toLowerCase() === "true";
  const rows = compact
    ? await sql`
        WITH recent AS (
          SELECT snapshot_at
          FROM signal_runs
          ORDER BY snapshot_at DESC
          LIMIT ${limit}
        )
        SELECT
          s.snapshot_at, s.symbol, s.sector, s.sub_industry, s.market_cap, s.is_sector,
          s.positive_short, s.positive_long, s.negative_short, s.negative_long, s.buckets
        FROM signal_snapshots s
        JOIN recent r USING (snapshot_at)
        ORDER BY s.snapshot_at DESC, s.symbol ASC
      `
    : await sql`
        WITH recent AS (
          SELECT snapshot_at, source_as_of, run_kind
          FROM signal_runs
          ORDER BY snapshot_at DESC
          LIMIT ${limit}
        )
        SELECT
          s.snapshot_at, r.source_as_of, r.run_kind, s.symbol, s.security, s.sector,
          s.sub_industry, s.market_cap, s.is_sector, s.positive_short, s.positive_long,
          s.negative_short, s.negative_long, s.buckets, s.current_price, s.return_1d, s.return_1w,
          s.return_1m, s.distance_5d, s.distance_20d
        FROM signal_snapshots s
        JOIN recent r USING (snapshot_at)
        ORDER BY s.snapshot_at DESC, s.symbol ASC
      `;
  if (includeOutcomes) await refreshSignalOutcomes();
  await refreshRegimes();
  const regimes = await sql`
    SELECT
      snapshot_at, scope_key, sector, regime, candidate_regime, pending_label,
      pending_streak, direction_score, confidence, evidence_through, sample_size, details
    FROM signal_regimes
    WHERE snapshot_at = (SELECT MAX(snapshot_at) FROM signal_regimes)
    ORDER BY scope_key ASC
  `;
  const response = {
    sessions: [...new Set(rows.map((row) => new Date(row.snapshot_at).toISOString()))],
    rows,
    regimes,
  };
  if (!includeOutcomes) return response;
  const outcomeRows = await sql`
    SELECT
      snapshot_at, symbol, security, sector, sub_industry, is_sector, entry_price,
      outcome_1_at, outcome_1_price, one_session_return,
      outcome_3_at, outcome_3_price, three_session_return,
      outcome_5_at, outcome_5_price, five_session_return,
      outcome_10_at, outcome_10_price, ten_session_return, signal_type
    FROM signal_outcomes
    ORDER BY snapshot_at DESC, symbol ASC
  `;
  const historicalSectorRegimes = await sql`
    SELECT
      snapshot_at, sector, regime, confidence, evidence_through, materialization_version
    FROM signal_regimes
    WHERE sector IS NOT NULL
    ORDER BY snapshot_at DESC, sector ASC
  `;
  const enrichedOutcomes = attachPointInTimeRegimes(outcomeRows, historicalSectorRegimes);
  const outcomes = enrichedOutcomes.slice(0, OUTCOME_RESULT_LIMIT);
  const outcomeTotal = enrichedOutcomes.length;
  const bullishRegimeBacktest = buildBullishRegimeBacktest(enrichedOutcomes);
  return {
    ...response,
    outcomes,
    outcomeTotal,
    outcomesTruncated: outcomes.length < outcomeTotal,
    outcomeRegimeCoverage: regimeCoverage(enrichedOutcomes),
    bullishRegimeBacktest,
    holdingRecommendations: bullishRegimeBacktest.recommendations,
  };
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, max-age=0");
  if (!sql) {
    return res.status(503).json({ error: "DATABASE_URL is not configured" });
  }
  try {
    await ensureSchemaReady();
    const mode = String(req.query?.mode || "").toLowerCase();
    if (mode === "capture") {
      const result = await capture(req);
      return res.status(result.status).json(result.body);
    }
    if (mode === "backfill-regimes") {
      const result = await backfillRegimes(req);
      return res.status(result.status).json(result.body);
    }
    if (mode === "repair-stock-signals") {
      const result = await repairStockSignals(req);
      return res.status(result.status).json(result.body);
    }
    if (req.method !== "GET") return res.status(405).json({ error: "Method Not Allowed" });
    return res.status(200).json(await history(req));
  } catch (error) {
    console.error("Signal history error:", error);
    return res.status(500).json({ error: error.message });
  }
}
