const DAY_MS = 24 * 60 * 60 * 1000;

export const MARKET_CONTEXT_VERSION = 1;

const nyDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/New_York",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function nyDate(timestampMs) {
  const parts = Object.fromEntries(
    nyDateFormatter.formatToParts(new Date(timestampMs)).map((part) => [part.type, part.value])
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function finite(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function percentChange(current, base) {
  return Number.isFinite(current) && Number.isFinite(base) && base !== 0
    ? ((current / base) - 1) * 100
    : null;
}

function lastPointAtOrBefore(points, cutoffSeconds) {
  let selected = null;
  for (const point of points || []) {
    const timestamp = finite(point?.[0]);
    const price = finite(point?.[1]);
    if (timestamp == null || price == null) continue;
    if (timestamp <= cutoffSeconds) selected = [timestamp, price];
    else break;
  }
  return selected;
}

function lastDailyBeforeDate(points, date) {
  let selected = null;
  for (const point of points || []) {
    const timestamp = finite(point?.[0]);
    const price = finite(point?.[1]);
    if (timestamp == null || price == null) continue;
    if (nyDate(timestamp * 1000) < date) selected = [timestamp, price];
  }
  return selected;
}

function pointInTimeInstrument(instrument, cutoffMs) {
  const cutoffSeconds = cutoffMs / 1000;
  const sessionDate = nyDate(cutoffMs);
  const currentPoint = lastPointAtOrBefore(instrument.replayDay15m, cutoffSeconds)
    || lastPointAtOrBefore(instrument.replayWeekHourly, cutoffSeconds);
  if (!currentPoint || nyDate(currentPoint[0] * 1000) !== sessionDate) return null;
  const previousPoint = lastDailyBeforeDate(instrument.replayDaily, sessionDate);
  const baseline = (days) => lastPointAtOrBefore(
    (instrument.replayDaily || []).filter((point) =>
      finite(point?.[0]) != null && nyDate(Number(point[0]) * 1000) < sessionDate
    ),
    (cutoffMs - days * DAY_MS) / 1000
  );
  const currentPrice = currentPoint[1];
  const previousClose = previousPoint?.[1] ?? null;
  return {
    symbol: instrument.symbol,
    name: instrument.name,
    group: instrument.group,
    observedAt: new Date(currentPoint[0] * 1000).toISOString(),
    currentPrice,
    previousClose,
    change: Number.isFinite(previousClose) ? currentPrice - previousClose : null,
    changePercent: percentChange(currentPrice, previousClose),
    perf1w: percentChange(currentPrice, baseline(7)?.[1]),
    perf1m: percentChange(currentPrice, baseline(30)?.[1]),
    perf3m: percentChange(currentPrice, baseline(90)?.[1]),
  };
}

function averageFinite(values) {
  const available = values.filter(Number.isFinite);
  return available.length
    ? available.reduce((total, value) => total + value, 0) / available.length
    : null;
}

function relativeReturn(left, right, key) {
  const leftReturn = left?.[key];
  const rightReturn = right?.[key];
  return Number.isFinite(leftReturn) && Number.isFinite(rightReturn)
    ? (((1 + leftReturn / 100) / (1 + rightReturn / 100)) - 1) * 100
    : null;
}

function buildPointInTimeRelationships(instruments) {
  const bySymbol = new Map(instruments.map((row) => [row.symbol, row]));
  const ratio = (id, leftSymbol, rightSymbol) => {
    const left = bySymbol.get(leftSymbol);
    const right = bySymbol.get(rightSymbol);
    if (!left || !right) return null;
    return {
      id,
      leftSymbol,
      rightSymbol,
      currentRatio: Number.isFinite(left.currentPrice) && Number.isFinite(right.currentPrice)
        ? left.currentPrice / right.currentPrice
        : null,
      changePercent: relativeReturn(left, right, "changePercent"),
      perf1w: relativeReturn(left, right, "perf1w"),
      perf1m: relativeReturn(left, right, "perf1m"),
      perf3m: relativeReturn(left, right, "perf3m"),
    };
  };
  const threeMonth = bySymbol.get("^IRX");
  const tenYear = bySymbol.get("^TNX");
  return [
    ratio("small-cap-risk", "IWM", "SPY"),
    ratio("growth-leadership", "QQQ", "SPY"),
    ratio("credit-risk", "HYG", "LQD"),
    ratio("copper-gold", "HG=F", "GC=F"),
    threeMonth && tenYear ? {
      id: "yield-curve",
      leftSymbol: "^TNX",
      rightSymbol: "^IRX",
      currentSpreadBps: (tenYear.currentPrice - threeMonth.currentPrice) * 100,
      changePercent: null,
      perf1w: null,
      perf1m: null,
      perf3m: null,
    } : null,
  ].filter(Boolean);
}

function buildPointInTimeMacroState(instruments) {
  const bySymbol = new Map(instruments.map((row) => [row.symbol, row]));
  const change = (symbol) => bySymbol.get(symbol)?.changePercent;
  const riskAverage = averageFinite(["SPY", "QQQ", "IWM", "EEM"].map(change));
  const vix = change("^VIX");
  const riskAdjusted = Number.isFinite(riskAverage) && Number.isFinite(vix)
    ? riskAverage - vix * 0.04
    : riskAverage;
  const riskTone = !Number.isFinite(riskAdjusted)
    ? "Unavailable"
    : riskAdjusted > 0.35 ? "Risk-on" : riskAdjusted < -0.35 ? "Risk-off" : "Mixed";
  const tenYear = bySymbol.get("^TNX");
  const rateMoveBps = Number.isFinite(tenYear?.change) ? tenYear.change * 100 : null;
  const ratesTone = !Number.isFinite(rateMoveBps)
    ? "Unavailable"
    : rateMoveBps > 3 ? "Yields rising" : rateMoveBps < -3 ? "Yields easing" : "Yields stable";
  const dollarMove = change("DX-Y.NYB");
  const dollarTone = !Number.isFinite(dollarMove)
    ? "Unavailable"
    : dollarMove > 0.2 ? "Dollar stronger" : dollarMove < -0.2 ? "Dollar weaker" : "Dollar steady";
  const commodityMoves = [change("CL=F"), change("HG=F"), change("GC=F")]
    .filter(Number.isFinite);
  const positiveCommodities = commodityMoves.filter((value) => value > 0.2).length;
  const negativeCommodities = commodityMoves.filter((value) => value < -0.2).length;
  const commodityTone = commodityMoves.length < 2
    ? "Unavailable"
    : positiveCommodities >= 2 ? "Commodity bid"
      : negativeCommodities >= 2 ? "Commodity pressure" : "Commodity split";
  return {
    riskTone,
    ratesTone,
    dollarTone,
    commodityTone,
    riskAverage,
    vixChangePercent: Number.isFinite(vix) ? vix : null,
    tenYearMoveBps: rateMoveBps,
    dollarChangePercent: Number.isFinite(dollarMove) ? dollarMove : null,
  };
}

function buildBreadth(signalRows) {
  const stocks = signalRows.filter((row) => !row.isSector && Number.isFinite(row.return1d));
  const advancers = stocks.filter((row) => row.return1d > 0).length;
  const decliners = stocks.filter((row) => row.return1d < 0).length;
  const unchanged = stocks.length - advancers - decliners;
  return {
    advancers,
    decliners,
    unchanged,
    total: stocks.length,
    percentAdvancing: stocks.length ? (advancers / stocks.length) * 100 : null,
  };
}

function buildSectorLeadership(signalRows) {
  const sectors = signalRows
    .filter((row) => row.isSector && Number.isFinite(row.return1d))
    .map((row) => ({
      symbol: row.symbol,
      sector: row.sector,
      changePercent: row.return1d,
      perf1w: row.return1w,
      perf1m: row.return1m,
    }))
    .sort((left, right) => right.changePercent - left.changePercent);
  return {
    sectors,
    leading: sectors.slice(0, 3),
    lagging: [...sectors].reverse().slice(0, 3),
  };
}

export function buildMarketContextSnapshot({
  snapshotAt,
  signalRows = [],
  intermarketPayload = {},
  regime = null,
}) {
  const cutoffMs = new Date(snapshotAt).getTime();
  if (!Number.isFinite(cutoffMs)) throw new Error("A valid market-context snapshot timestamp is required");
  const regimeEvidence = regime?.evidence_through || regime?.evidenceThrough || null;
  if (regimeEvidence && new Date(regimeEvidence).getTime() > cutoffMs) {
    throw new Error("Market context cannot attach a regime with future evidence");
  }
  const instruments = (intermarketPayload.instruments || [])
    .map((instrument) => pointInTimeInstrument(instrument, cutoffMs))
    .filter(Boolean);
  const macro = buildPointInTimeMacroState(instruments);
  const breadth = buildBreadth(signalRows);
  const leadership = buildSectorLeadership(signalRows);
  const relationships = buildPointInTimeRelationships(instruments);
  const availability = instruments.length >= 12 && breadth.total >= 100 ? "available" : "partial";
  const breadthLabel = Number.isFinite(breadth.percentAdvancing)
    ? `${Math.round(breadth.percentAdvancing)}% advancing`
    : "breadth unavailable";
  const leader = leadership.leading[0]?.sector || "leadership unavailable";
  return {
    snapshotAt: new Date(cutoffMs).toISOString(),
    evidenceThrough: new Date(cutoffMs).toISOString(),
    sourceAsOf: intermarketPayload.asOf || null,
    methodologyVersion: MARKET_CONTEXT_VERSION,
    availability,
    overallRegime: regime?.regime || null,
    regimeConfidence: regime?.confidence || null,
    regimeEvidenceThrough: regimeEvidence ? new Date(regimeEvidence).toISOString() : null,
    ...macro,
    breadth,
    leadingSectors: leadership.leading,
    laggingSectors: leadership.lagging,
    sectorPerformance: leadership.sectors,
    instruments,
    relationships,
    summary: `${macro.riskTone} · ${breadthLabel} · ${leader} leading · ${macro.ratesTone} · ${macro.dollarTone}`,
  };
}

export function marketContextCoverage(sessions, contexts) {
  const available = new Set(contexts.map((row) => new Date(row.snapshot_at).toISOString()));
  const normalized = sessions.map((session) => new Date(session).toISOString());
  return {
    available: normalized.filter((session) => available.has(session)).length,
    unavailable: normalized.filter((session) => !available.has(session)),
  };
}
