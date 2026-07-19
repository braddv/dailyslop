const PERIODS = {
  "1d": { field: "replayDay15m", sessions: 1 },
  "2d": { field: "replayDay15m", sessions: 2 },
  "1w": { field: "replayWeekHourly", sessions: 5 },
  "2w": { field: "replayWeekHourly", sessions: 10 },
  "1m": { field: "replayDaily", days: 31 },
  "2m": { field: "replayDaily", days: 62 },
  "3m": { field: "replayDaily", days: 93 },
  "6m": { field: "replayDaily", days: 186 },
};

const nyDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/New_York",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const nyTimeFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});
const nyPartsCache = new Map();

function nyParts(timestamp) {
  if (nyPartsCache.has(timestamp)) return nyPartsCache.get(timestamp);
  const date = new Date(timestamp * 1000);
  const dateParts = Object.fromEntries(
    nyDateFormatter.formatToParts(date).map((part) => [part.type, part.value])
  );
  const timeParts = Object.fromEntries(
    nyTimeFormatter.formatToParts(date).map((part) => [part.type, part.value])
  );
  const result = {
    date: `${dateParts.year}-${dateParts.month}-${dateParts.day}`,
    minutes: Number(timeParts.hour) * 60 + Number(timeParts.minute),
  };
  nyPartsCache.set(timestamp, result);
  return result;
}

function lastPriceBefore(points, cutoff) {
  let price = null;
  for (const point of points || []) {
    if (!Number.isFinite(point?.[0]) || !Number.isFinite(point?.[1])) continue;
    if (point[0] <= cutoff) price = point[1];
    if (point[0] > cutoff) break;
  }
  return price;
}

function dailyPointsAt(stock, cutoff) {
  const cutoffDate = nyParts(cutoff).date;
  const completed = (stock.replayDaily || []).filter((point) =>
    Number.isFinite(point?.[0]) &&
    Number.isFinite(point?.[1]) &&
    point[0] <= cutoff &&
    nyParts(point[0]).date < cutoffDate
  );
  const livePrice = lastPriceBefore(stock.replayDay15m || [], cutoff)
    ?? lastPriceBefore(stock.replayWeekHourly || [], cutoff);
  if (Number.isFinite(livePrice)) completed.push([cutoff, livePrice]);
  return completed;
}

function replayPoints(stock, period, cutoff) {
  const config = PERIODS[period];
  const source = config.field === "replayDaily"
    ? dailyPointsAt(stock, cutoff)
    : (stock[config.field] || []).filter((point) =>
      Number.isFinite(point?.[0]) && Number.isFinite(point?.[1]) && point[0] <= cutoff
    );
  if (!source.length) return [];
  if (config.sessions) {
    const sessionDates = [...new Set(source.map((point) => nyParts(point[0]).date))];
    const keep = new Set(sessionDates.slice(-config.sessions));
    return source.filter((point) => keep.has(nyParts(point[0]).date));
  }
  const start = cutoff - config.days * 86400;
  return source.filter((point) => point[0] >= start);
}

function replayValue(stock, timestamp, period, cutoff) {
  const points = replayPoints(stock, period, cutoff);
  const base = points[0]?.[1];
  const price = lastPriceBefore(points, timestamp);
  return Number.isFinite(base) && base !== 0 && Number.isFinite(price)
    ? ((price / base) - 1) * 100
    : null;
}

function percentileMap(rows, field, higherIsBetter = true) {
  const sorted = [...rows]
    .filter((row) => Number.isFinite(row[field]))
    .sort((a, b) => higherIsBetter ? a[field] - b[field] : b[field] - a[field]);
  return new Map(sorted.map((row, index) => [
    row.symbol,
    sorted.length <= 1 ? 1 : index / (sorted.length - 1),
  ]));
}

function replayValueFromPoints(points, timestamp) {
  const base = points[0]?.[1];
  const price = lastPriceBefore(points, timestamp);
  return Number.isFinite(base) && base !== 0 && Number.isFinite(price)
    ? ((price / base) - 1) * 100
    : null;
}

function calculateReplayScores(universe, frames, pointsBySymbol) {
  if (universe.length < 2 || frames.length < 8) return [];
  const frameValues = frames.map((timestamp) => {
    const values = universe
      .map((stock) => ({
        symbol: stock.symbol,
        value: replayValueFromPoints(pointsBySymbol.get(stock.symbol) || [], timestamp),
      }))
      .filter((row) => Number.isFinite(row.value))
      .sort((a, b) => b.value - a.value);
    const topCount = Math.max(1, Math.ceil(values.length * 0.2));
    return {
      values: new Map(values.map((row) => [row.symbol, row.value])),
      top: new Set(values.slice(0, topCount).map((row) => row.symbol)),
      bottom: new Set(values.slice(-topCount).map((row) => row.symbol)),
      ranks: new Map(values.map((row, index) => [
        row.symbol,
        values.length <= 1 ? 1 : 1 - index / (values.length - 1),
      ])),
    };
  });
  const scoredFrames = frameValues.slice(1);
  const midpoint = Math.floor(frameValues.length / 2);
  const recentStart = Math.max(midpoint, Math.floor(frameValues.length * 0.66));
  const rows = universe.map((stock) => {
    const values = frameValues.map((frame) => frame.values.get(stock.symbol)).filter(Number.isFinite);
    const finalReturn = values.at(-1);
    const midpointReturn = frameValues[midpoint]?.values.get(stock.symbol);
    let positiveMoves = 0;
    let peakGrowth = 1;
    let maxDrawdown = 0;
    values.forEach((value, index) => {
      const growth = 1 + value / 100;
      peakGrowth = Math.max(peakGrowth, growth);
      if (peakGrowth > 0) maxDrawdown = Math.max(maxDrawdown, ((peakGrowth - growth) / peakGrowth) * 100);
      if (index > 0 && value > values[index - 1]) positiveMoves += 1;
    });
    const recentFrames = frameValues.slice(recentStart);
    const startRank = frameValues[midpoint]?.ranks.get(stock.symbol);
    const endRank = frameValues.at(-1)?.ranks.get(stock.symbol);
    return {
      stock,
      symbol: stock.symbol,
      finalReturn,
      recentReturn: Number.isFinite(midpointReturn) ? finalReturn - midpointReturn : null,
      top20Pct: scoredFrames.length
        ? scoredFrames.filter((frame) => frame.top.has(stock.symbol)).length / scoredFrames.length
        : 0,
      recentTop20Pct: recentFrames.length
        ? recentFrames.filter((frame) => frame.top.has(stock.symbol)).length / recentFrames.length
        : 0,
      consistency: values.length > 1 ? positiveMoves / (values.length - 1) : 0,
      negativeConsistency: values.length > 1
        ? (values.length - 1 - positiveMoves) / (values.length - 1)
        : 0,
      bottom20Pct: scoredFrames.length
        ? scoredFrames.filter((frame) => frame.bottom.has(stock.symbol)).length / scoredFrames.length
        : 0,
      recentBottom20Pct: recentFrames.length
        ? recentFrames.filter((frame) => frame.bottom.has(stock.symbol)).length / recentFrames.length
        : 0,
      maxDrawdown,
      rankImprovement: Number.isFinite(startRank) && Number.isFinite(endRank)
        ? endRank - startRank
        : null,
    };
  }).filter((row) => Number.isFinite(row.finalReturn));

  const ranks = {
    return: percentileMap(rows, "finalReturn"),
    recent: percentileMap(rows, "recentReturn"),
    resilience: percentileMap(rows, "maxDrawdown", false),
    improvement: percentileMap(rows, "rankImprovement"),
    weakReturn: percentileMap(rows, "finalReturn", false),
    recentWeak: percentileMap(rows, "recentReturn", false),
    drawdown: percentileMap(rows, "maxDrawdown"),
    deterioration: percentileMap(rows, "rankImprovement", false),
  };
  rows.forEach((row) => {
    row.persistentScore = 100 * (
      0.35 * (ranks.return.get(row.symbol) || 0) +
      0.30 * row.top20Pct +
      0.15 * row.consistency +
      0.10 * (ranks.recent.get(row.symbol) || 0) +
      0.10 * (ranks.resilience.get(row.symbol) || 0)
    );
    row.emergingScore = 100 * (
      0.35 * (ranks.improvement.get(row.symbol) || 0) +
      0.30 * (ranks.recent.get(row.symbol) || 0) +
      0.20 * row.recentTop20Pct +
      0.15 * row.consistency
    );
    row.persistentWeaknessScore = 100 * (
      0.35 * (ranks.weakReturn.get(row.symbol) || 0) +
      0.30 * row.bottom20Pct +
      0.15 * row.negativeConsistency +
      0.10 * (ranks.recentWeak.get(row.symbol) || 0) +
      0.10 * (ranks.drawdown.get(row.symbol) || 0)
    );
    row.emergingWeaknessScore = 100 * (
      0.35 * (ranks.deterioration.get(row.symbol) || 0) +
      0.30 * (ranks.recentWeak.get(row.symbol) || 0) +
      0.20 * row.recentBottom20Pct +
      0.15 * row.negativeConsistency
    );
  });
  return rows;
}

function calculatePeriodScores(universe, period, cutoff) {
  const pointsBySymbol = new Map(universe.map((stock) => [
    stock.symbol,
    replayPoints(stock, period, cutoff),
  ]));
  let frames = [...new Set(
    universe.flatMap((stock) => (pointsBySymbol.get(stock.symbol) || []).map((point) => point[0]))
  )].sort((a, b) => a - b);
  const eligible = universe.filter((stock) =>
    (pointsBySymbol.get(stock.symbol) || []).length >= Math.max(8, frames.length * 0.7)
  );
  frames = [...new Set(
    eligible.flatMap((stock) => (pointsBySymbol.get(stock.symbol) || []).map((point) => point[0]))
  )].sort((a, b) => a - b);
  return calculateReplayScores(eligible, frames, pointsBySymbol);
}

function calculateConfluence(universe, trendPeriods, accelerationPeriods, negative, periodRows) {
  return universe.map((stock) => {
    const trendScores = trendPeriods.map((period) =>
      periodRows.get(period)?.get(stock.symbol)?.[
        negative ? "persistentWeaknessScore" : "persistentScore"
      ]
    );
    const accelerationScores = accelerationPeriods.map((period) =>
      periodRows.get(period)?.get(stock.symbol)?.[
        negative ? "emergingWeaknessScore" : "emergingScore"
      ]
    );
    const allScores = [...trendScores, ...accelerationScores];
    if (allScores.some((score) => !Number.isFinite(score))) return null;
    const trendAverage = trendScores.reduce((sum, score) => sum + score, 0) / trendScores.length;
    const accelerationAverage = accelerationScores.reduce((sum, score) => sum + score, 0)
      / accelerationScores.length;
    return {
      stock,
      symbol: stock.symbol,
      score: Math.min(
        100,
        0.55 * trendAverage +
          0.45 * accelerationAverage +
          Math.max(0, allScores.filter((score) => score >= 65).length - 2) * 2
      ),
    };
  }).filter(Boolean);
}

function signalMaps(universe, cutoff) {
  const periodRows = new Map(Object.keys(PERIODS).map((period) => [
    period,
    new Map(calculatePeriodScores(universe, period, cutoff).map((row) => [row.symbol, row])),
  ]));
  const map = (rows) => new Map(rows.map((row) => [row.symbol, row.score]));
  return {
    positiveShort: map(calculateConfluence(universe, ["1m", "2m"], ["1d", "2d"], false, periodRows)),
    positiveLong: map(calculateConfluence(universe, ["3m", "6m"], ["1w", "2w"], false, periodRows)),
    negativeShort: map(calculateConfluence(universe, ["1m", "2m"], ["1d", "2d"], true, periodRows)),
    negativeLong: map(calculateConfluence(universe, ["3m", "6m"], ["1w", "2w"], true, periodRows)),
  };
}

function averageDistance(stock, cutoff, days) {
  const points = dailyPointsAt(stock, cutoff).slice(-days);
  const closes = points.map((point) => point[1]).filter(Number.isFinite);
  const current = lastPriceBefore(stock.replayDay15m || [], cutoff)
    ?? lastPriceBefore(stock.replayWeekHourly || [], cutoff);
  if (!closes.length || !Number.isFinite(current)) return null;
  const average = closes.reduce((sum, value) => sum + value, 0) / closes.length;
  return average > 0 ? ((current / average) - 1) * 100 : null;
}

function previousValue(snapshot, symbol, field) {
  return snapshot?.get(symbol)?.[field] || 0;
}

function classifyBuckets(symbol, scores, prior, sectorMode) {
  const thresholds = sectorMode
    ? { acceleration: 60, short: 55, long: 45, pullLong: 50, pullWeak: 40, breakWeak: 55, prior: 55 }
    : { acceleration: 65, short: 60, long: 50, pullLong: 55, pullWeak: 45, breakWeak: 55, prior: 60 };
  const positiveShort = scores.positiveShort.get(symbol) || 0;
  const positiveLong = scores.positiveLong.get(symbol) || 0;
  const negativeShort = scores.negativeShort.get(symbol) || 0;
  const negativeLong = scores.negativeLong.get(symbol) || 0;
  const previous = prior.at(-1);
  const recent = prior.slice(-2);
  const buckets = [];
  if (previous && positiveShort >= thresholds.acceleration &&
      previousValue(previous, symbol, "positiveShort") < thresholds.acceleration) {
    buckets.push("acceleration");
  }
  if (recent.length >= 2 && positiveShort >= thresholds.short && positiveLong >= thresholds.long &&
      [...recent.map((snapshot) => previousValue(snapshot, symbol, "positiveShort")), positiveShort]
        .filter((score) => score >= thresholds.short).length >= 2) {
    buckets.push("leader");
  }
  if (positiveLong >= thresholds.pullLong &&
      positiveShort < thresholds.acceleration + 5 &&
      negativeShort >= thresholds.pullWeak) {
    buckets.push("pullback");
  }
  if (negativeShort >= thresholds.breakWeak && prior.some((snapshot) =>
    previousValue(snapshot, symbol, "positiveShort") >= thresholds.prior ||
    previousValue(snapshot, symbol, "positiveLong") >= thresholds.prior
  )) {
    buckets.push("breakdown");
  }
  if (previous && negativeShort >= thresholds.acceleration &&
      previousValue(previous, symbol, "negativeShort") < thresholds.acceleration) {
    buckets.push("weakness");
  }
  if (recent.length >= 2 && negativeShort >= thresholds.short && negativeLong >= thresholds.long &&
      [...recent.map((snapshot) => previousValue(snapshot, symbol, "negativeShort")), negativeShort]
        .filter((score) => score >= thresholds.short).length >= 2) {
    buckets.push("laggard");
  }
  if (negativeLong >= thresholds.pullLong &&
      negativeShort < thresholds.acceleration + 5 &&
      positiveShort >= thresholds.pullWeak) {
    buckets.push("bounce");
  }
  if (positiveShort >= thresholds.breakWeak && prior.some((snapshot) =>
    previousValue(snapshot, symbol, "negativeShort") >= thresholds.prior ||
    previousValue(snapshot, symbol, "negativeLong") >= thresholds.prior
  )) {
    buckets.push("breakout");
  }
  return buckets;
}

function buildRows(universe, cutoff, prior, sectorMode) {
  const scores = signalMaps(universe, cutoff);
  const snapshot = new Map();
  const rows = universe.map((stock) => {
    const positiveShort = scores.positiveShort.get(stock.symbol) || 0;
    const positiveLong = scores.positiveLong.get(stock.symbol) || 0;
    const negativeShort = scores.negativeShort.get(stock.symbol) || 0;
    const negativeLong = scores.negativeLong.get(stock.symbol) || 0;
    const scoreRow = { positiveShort, positiveLong, negativeShort, negativeLong };
    snapshot.set(stock.symbol, scoreRow);
    const currentPrice = lastPriceBefore(stock.replayDay15m || [], cutoff)
      ?? lastPriceBefore(stock.replayWeekHourly || [], cutoff);
    return {
      snapshotAt: new Date(cutoff * 1000).toISOString(),
      symbol: stock.symbol,
      security: stock.security,
      sector: stock.sector,
      subIndustry: stock.subIndustry,
      marketCap: Number.isFinite(stock.marketCap) ? stock.marketCap : null,
      isSector: sectorMode,
      ...scoreRow,
      buckets: classifyBuckets(stock.symbol, scores, prior, sectorMode),
      currentPrice: Number.isFinite(currentPrice) ? currentPrice : null,
      return1d: replayValue(stock, cutoff, "1d", cutoff),
      return1w: replayValue(stock, cutoff, "1w", cutoff),
      return1m: replayValue(stock, cutoff, "1m", cutoff),
      distance5d: averageDistance(stock, cutoff, 5),
      distance20d: averageDistance(stock, cutoff, 20),
    };
  });
  return { rows, snapshot };
}

export function buildSignalSnapshot(payload, cutoff, priorSnapshots = []) {
  const stocks = buildRows(payload.stocks || [], cutoff, priorSnapshots, false);
  const sectors = buildRows(
    (payload.benchmarks || []).filter((stock) => stock.symbol !== "SPY"),
    cutoff,
    priorSnapshots,
    true
  );
  return {
    rows: [...stocks.rows, ...sectors.rows],
    snapshot: new Map([...stocks.snapshot, ...sectors.snapshot]),
  };
}

export function historicalCutoffs(payload, count = 5) {
  const source = [...(payload.stocks || [])]
    .map((stock) => stock.replayDay15m || [])
    .sort((a, b) => b.length - a.length)[0] || [];
  const byDate = new Map();
  source.forEach((point) => {
    if (!Number.isFinite(point?.[0])) return;
    const parts = nyParts(point[0]);
    if (parts.minutes < 9 * 60 + 30 || parts.minutes > 15 * 60) return;
    byDate.set(parts.date, Math.max(byDate.get(parts.date) || 0, point[0]));
  });
  return [...byDate.values()].sort((a, b) => a - b).slice(-count);
}
