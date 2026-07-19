import { neon } from "@neondatabase/serverless";
import { buildSignalSnapshot, historicalCutoffs } from "./_lib/signals.js";

const sql = process.env.DATABASE_URL ? neon(process.env.DATABASE_URL) : null;

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
    DELETE FROM signal_runs r
    WHERE NOT EXISTS (
      SELECT 1 FROM signal_snapshots s WHERE s.snapshot_at = r.snapshot_at
    )
  `;
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

async function persistSnapshot(rows, sourceAsOf, kind) {
  if (!rows.length) return;
  const snapshotAt = rows[0].snapshotAt;
  await sql`
    INSERT INTO signal_runs (snapshot_at, source_as_of, run_kind)
    VALUES (${snapshotAt}, ${sourceAsOf}, ${kind})
    ON CONFLICT (snapshot_at)
    DO UPDATE SET source_as_of = EXCLUDED.source_as_of, run_kind = EXCLUDED.run_kind
  `;
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

function newYorkHour(date = new Date()) {
  const values = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(date).map((part) => [part.type, part.value])
  );
  return {
    weekday: values.weekday,
    hour: Number(values.hour),
    minute: Number(values.minute),
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

async function capture(req, mode) {
  if (!authorized(req)) return { status: 401, body: { error: "Unauthorized" } };
  if (mode === "capture") {
    const ny = newYorkHour();
    if (["Sat", "Sun"].includes(ny.weekday) || ny.hour !== 15 || ny.minute > 20) {
      return { status: 200, body: { skipped: true, reason: "Not the 3 PM New York capture window" } };
    }
  }
  const payload = await fetchMarketPayload(req, mode === "capture");
  const cutoffs = historicalCutoffs(payload, mode === "backfill" ? 5 : 1);
  if (!cutoffs.length) throw new Error("No eligible 3 PM market sessions found");
  const prior = mode === "backfill" ? [] : await priorSnapshots();
  let saved = 0;
  for (const cutoff of cutoffs) {
    const result = buildSignalSnapshot(payload, cutoff, prior);
    await persistSnapshot(result.rows, payload.asOf, mode);
    prior.push(result.snapshot);
    if (prior.length > 5) prior.shift();
    saved += result.rows.length;
  }
  return {
    status: 200,
    body: {
      success: true,
      mode,
      sessions: cutoffs.map((cutoff) => new Date(cutoff * 1000).toISOString()),
      rowsSaved: saved,
    },
  };
}

async function history(req) {
  const limit = Math.min(30, Math.max(1, Number(req.query?.limit) || 10));
  const rows = await sql`
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
  return {
    sessions: [...new Set(rows.map((row) => new Date(row.snapshot_at).toISOString()))],
    rows,
  };
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, max-age=0");
  if (!sql) {
    return res.status(503).json({ error: "DATABASE_URL is not configured" });
  }
  try {
    await ensureSchema();
    const mode = String(req.query?.mode || "").toLowerCase();
    if (mode === "capture" || mode === "backfill") {
      if (mode === "backfill" && req.method !== "POST") {
        return res.status(405).json({ error: "Backfill requires POST" });
      }
      const result = await capture(req, mode);
      return res.status(result.status).json(result.body);
    }
    if (req.method !== "GET") return res.status(405).json({ error: "Method Not Allowed" });
    return res.status(200).json(await history(req));
  } catch (error) {
    console.error("Signal history error:", error);
    return res.status(500).json({ error: error.message });
  }
}
