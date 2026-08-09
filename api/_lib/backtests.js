export const BULLISH_SIGNAL_TYPES = ["acceleration", "leader", "pullback", "breakout"];
export const TRENDING_BULLISH_REGIMES = ["Bull trend", "Transitioning bullish"];
export const BACKTEST_METHODOLOGY_VERSION = 1;

const MIN_RECOMMENDATION_EPISODES = 20;
const MIN_RECOMMENDATION_TICKERS = 10;
const SPLIT_RATIOS = [0.1, 0.2, 0.25, 1 / 3, 0.5, 2 / 3, 1.5, 2, 3, 4, 5, 10];

function finiteNumber(value) {
  const number = Number(value);
  return value !== null && value !== undefined && Number.isFinite(number) ? number : null;
}

function iso(value) {
  if (!value) return null;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null;
}

function pointInTimeKey(snapshotAt, sector) {
  return `${iso(snapshotAt) || "invalid"}\u0000${sector || ""}`;
}

function suspectedSplitDiscontinuity(row) {
  const prices = [
    row.entry_price,
    row.outcome_1_price,
    row.outcome_3_price,
    row.outcome_5_price,
    row.outcome_10_price,
  ].map(finiteNumber).filter((value) => value !== null && value > 0);
  for (let index = 1; index < prices.length; index += 1) {
    const ratio = prices[index] / prices[index - 1];
    const looksLikeSplit = SPLIT_RATIOS.some((candidate) =>
      Math.abs(ratio - candidate) / candidate <= 0.04
    );
    if (looksLikeSplit && Math.abs(ratio - 1) >= 0.2) return true;
  }
  return false;
}

function outcomeDataQuality(row) {
  if (!(finiteNumber(row.entry_price) > 0)) return "invalid_entry_price";
  if (suspectedSplitDiscontinuity(row)) return "suspected_corporate_action";
  if (finiteNumber(row.five_session_return) === null || finiteNumber(row.ten_session_return) === null) {
    return "incomplete_or_security_unavailable";
  }
  return "eligible";
}

export function attachPointInTimeRegimes(outcomes, regimes) {
  const bySnapshotAndSector = new Map();
  regimes.forEach((regime) => {
    if (!regime?.sector) return;
    bySnapshotAndSector.set(pointInTimeKey(regime.snapshot_at, regime.sector), regime);
  });
  return outcomes.map((outcome) => {
    const signalAt = iso(outcome.snapshot_at);
    const regime = bySnapshotAndSector.get(pointInTimeKey(signalAt, outcome.sector));
    const regimeSnapshotAt = iso(regime?.snapshot_at);
    const evidenceThrough = iso(regime?.evidence_through);
    let availability = "available";
    if (!regime || !signalAt || regimeSnapshotAt !== signalAt) availability = "unavailable";
    else if (evidenceThrough && new Date(evidenceThrough) > new Date(signalAt)) {
      availability = "invalid_future_evidence";
    }
    const available = availability === "available";
    return {
      ...outcome,
      sector_regime_at_signal: available ? regime.regime : null,
      sector_regime_confidence_at_signal: available ? regime.confidence : null,
      sector_regime_evidence_through: available ? evidenceThrough : null,
      sector_regime_snapshot_at: available ? regimeSnapshotAt : null,
      sector_regime_materialization_version_at_signal: available
        ? finiteNumber(regime.materialization_version)
        : null,
      sector_regime_availability: availability,
      asset_class: outcome.is_sector ? "sector_etf" : "individual_stock",
      price_adjustment_basis: "yahoo_point_in_time_close",
      outcome_data_quality: outcomeDataQuality(outcome),
    };
  });
}

function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function returnStats(rows, field) {
  const returns = rows.map((row) => finiteNumber(row[field])).filter((value) => value !== null);
  if (!returns.length) {
    return {
      observations: 0, winRate: null, averageReturn: null, medianReturn: null,
      standardDeviation: null, worstReturn: null, bestReturn: null,
      percentGainingMoreThan5: null, percentLosingMoreThan5: null,
      outlierDominated: null,
    };
  }
  const observations = returns.length;
  const averageReturn = returns.reduce((sum, value) => sum + value, 0) / observations;
  const variance = observations > 1
    ? returns.reduce((sum, value) => sum + ((value - averageReturn) ** 2), 0) / (observations - 1)
    : 0;
  const absoluteTotal = returns.reduce((sum, value) => sum + Math.abs(value), 0);
  const largestShare = absoluteTotal
    ? Math.max(...returns.map((value) => Math.abs(value))) / absoluteTotal
    : 0;
  const trimmed = returns.length >= 10
    ? [...returns].sort((a, b) => a - b).slice(1, -1)
    : returns;
  const trimmedAverage = trimmed.reduce((sum, value) => sum + value, 0) / trimmed.length;
  return {
    observations,
    winRate: returns.filter((value) => value > 0).length / observations * 100,
    averageReturn,
    medianReturn: median(returns),
    standardDeviation: Math.sqrt(variance),
    worstReturn: Math.min(...returns),
    bestReturn: Math.max(...returns),
    percentGainingMoreThan5: returns.filter((value) => value > 5).length / observations * 100,
    percentLosingMoreThan5: returns.filter((value) => value < -5).length / observations * 100,
    outlierDominated: observations >= 5 && (
      largestShare > 0.35 || (averageReturn > 0) !== (trimmedAverage > 0)
    ),
  };
}

function dedupeTickerSessions(rows) {
  const unique = new Map();
  rows.forEach((row) => {
    const key = `${row.symbol}\u0000${iso(row.snapshot_at)}`;
    if (!unique.has(key)) unique.set(key, row);
  });
  return [...unique.values()];
}

export function groupTradingEpisodes(rows) {
  const byTicker = new Map();
  rows.forEach((row) => {
    if (!byTicker.has(row.symbol)) byTicker.set(row.symbol, []);
    byTicker.get(row.symbol).push(row);
  });
  const episodes = [];
  byTicker.forEach((tickerRows) => {
    const ordered = tickerRows.sort((a, b) => new Date(a.snapshot_at) - new Date(b.snapshot_at));
    let activeUntil = -Infinity;
    ordered.forEach((row) => {
      const signalTime = new Date(row.snapshot_at).getTime();
      if (signalTime <= activeUntil) return;
      episodes.push(row);
      activeUntil = new Date(row.outcome_10_at).getTime();
    });
  });
  return episodes.sort((a, b) => new Date(a.snapshot_at) - new Date(b.snapshot_at));
}

function analysisLevel(rows) {
  const fiveSession = returnStats(rows, "five_session_return");
  const tenSession = returnStats(rows, "ten_session_return");
  return {
    observationCount: rows.length,
    uniqueTickerCount: new Set(rows.map((row) => row.symbol)).size,
    fiveSession,
    tenSession,
    difference10Minus5: {
      winRate: tenSession.winRate === null ? null : tenSession.winRate - fiveSession.winRate,
      averageReturn: tenSession.averageReturn === null
        ? null
        : tenSession.averageReturn - fiveSession.averageReturn,
      medianReturn: tenSession.medianReturn === null
        ? null
        : tenSession.medianReturn - fiveSession.medianReturn,
    },
  };
}

function horizonQualifies(stats, episodeCount, tickerCount) {
  return episodeCount >= MIN_RECOMMENDATION_EPISODES &&
    tickerCount >= MIN_RECOMMENDATION_TICKERS &&
    stats.averageReturn > 0 && stats.medianReturn > 0 && stats.winRate > 50 &&
    stats.outlierDominated === false;
}

function recommendationFor({ signalType, sectorRegime, assetClass, episodes, cutoffAt }) {
  const analysis = analysisLevel(episodes);
  const fiveQualifies = horizonQualifies(
    analysis.fiveSession, analysis.observationCount, analysis.uniqueTickerCount
  );
  const tenQualifies = horizonQualifies(
    analysis.tenSession, analysis.observationCount, analysis.uniqueTickerCount
  );
  let preferredHoldingSessions = null;
  if (fiveQualifies && tenQualifies) {
    preferredHoldingSessions = analysis.tenSession.averageReturn > analysis.fiveSession.averageReturn + 0.1
      ? 10
      : 5;
  } else if (fiveQualifies) preferredHoldingSessions = 5;
  else if (tenQualifies) preferredHoldingSessions = 10;
  const recommendationStatus = preferredHoldingSessions ? "supported" : "insufficient_evidence";
  const rationale = preferredHoldingSessions
    ? `${assetClass} ${signalType} signals in ${sectorRegime} sectors favor a ${preferredHoldingSessions}-session exit on matched, non-overlapping episodes.`
    : `Insufficient stable matched-episode evidence for ${assetClass} ${signalType} signals in ${sectorRegime} sectors.`;
  return {
    signalType,
    sectorRegime,
    assetClass,
    preferredHoldingSessions,
    sampleSize: analysis.observationCount,
    uniqueEpisodeCount: analysis.observationCount,
    uniqueTickerCount: analysis.uniqueTickerCount,
    fiveSession: {
      winRate: analysis.fiveSession.winRate,
      averageReturn: analysis.fiveSession.averageReturn,
      medianReturn: analysis.fiveSession.medianReturn,
    },
    tenSession: {
      winRate: analysis.tenSession.winRate,
      averageReturn: analysis.tenSession.averageReturn,
      medianReturn: analysis.tenSession.medianReturn,
    },
    recommendationStatus,
    rationale,
    backtestCutoffTimestamp: cutoffAt,
    methodologyVersion: BACKTEST_METHODOLOGY_VERSION,
  };
}

function matchesRegime(row, regime) {
  return regime === "Trending bullish combined"
    ? TRENDING_BULLISH_REGIMES.includes(row.sector_regime_at_signal)
    : row.sector_regime_at_signal === regime;
}

function matchesAssetClass(row, assetClass) {
  if (assetClass === "combined") return true;
  return row.asset_class === assetClass;
}

export function buildBullishRegimeBacktest(outcomes) {
  const cutoffTimes = outcomes
    .filter((row) => finiteNumber(row.ten_session_return) !== null)
    .map((row) => iso(row.outcome_10_at))
    .filter(Boolean)
    .map((value) => new Date(value).getTime());
  const cutoffAt = cutoffTimes.length ? new Date(Math.max(...cutoffTimes)).toISOString() : null;
  const regimes = [...TRENDING_BULLISH_REGIMES, "Trending bullish combined"];
  const assetClasses = ["individual_stock", "sector_etf", "combined"];
  const summaries = [];
  const recommendations = [];
  BULLISH_SIGNAL_TYPES.forEach((signalType) => {
    regimes.forEach((sectorRegime) => {
      assetClasses.forEach((assetClass) => {
        const eligibleGroup = outcomes.filter((row) =>
          row.signal_type === signalType &&
          matchesRegime(row, sectorRegime) &&
          matchesAssetClass(row, assetClass)
        );
        const matched = eligibleGroup.filter((row) =>
          row.outcome_data_quality === "eligible" &&
          finiteNumber(row.five_session_return) !== null &&
          finiteNumber(row.ten_session_return) !== null
        );
        const tickerSessions = dedupeTickerSessions(matched);
        const episodes = groupTradingEpisodes(tickerSessions);
        summaries.push({
          signalType,
          sectorRegime,
          assetClass,
          eligibleObservationCount: eligibleGroup.length,
          observationCount: matched.length,
          uniqueTickerCount: new Set(matched.map((row) => row.symbol)).size,
          uniqueTickerSessionCount: tickerSessions.length,
          uniqueEpisodeCount: episodes.length,
          matchedObservationCount: matched.length,
          excludedIncompleteOrUnavailable: eligibleGroup.length - matched.length,
          rawSignalObservations: analysisLevel(matched),
          uniqueTickerSessions: analysisLevel(tickerSessions),
          uniqueTradingEpisodes: analysisLevel(episodes),
        });
        recommendations.push(recommendationFor({
          signalType, sectorRegime, assetClass, episodes, cutoffAt,
        }));
      });
    });
  });
  return {
    methodologyVersion: BACKTEST_METHODOLOGY_VERSION,
    backtestCutoffTimestamp: cutoffAt,
    methodology: {
      matchedCohort: "Direct 5-versus-10 comparisons include only rows with both outcomes complete.",
      tickerSessionDeduplication: "Within each signal/regime/asset group, ticker plus signal snapshot is counted once.",
      episodeGrouping: "Within each signal/regime/asset group, a ticker starts a new episode only after the initiating signal's 10-session outcome timestamp; overlapping signals are grouped into that episode.",
      regimeJoin: "Exact signal snapshot timestamp plus mapped S&P sector; later regimes are never substituted.",
      missingData: "Incomplete or unavailable future prices remain null and are excluded, never converted to zero.",
      corporateActions: "Yahoo point-in-time snapshot closes are used consistently; split-like price discontinuities are marked suspected and excluded rather than guessed or retroactively fabricated.",
      recommendationThresholds: {
        minimumUniqueEpisodes: MIN_RECOMMENDATION_EPISODES,
        minimumUniqueTickers: MIN_RECOMMENDATION_TICKERS,
        positiveAverage: true,
        positiveMedian: true,
        winRateAbovePercent: 50,
        rejectOutlierDominated: true,
      },
    },
    summaries,
    recommendations,
  };
}

export function regimeCoverage(outcomes) {
  const reasons = {};
  outcomes.forEach((row) => {
    reasons[row.sector_regime_availability] = (reasons[row.sector_regime_availability] || 0) + 1;
  });
  return {
    totalOutcomes: outcomes.length,
    contemporaneousRegimeAvailable: reasons.available || 0,
    contemporaneousRegimeUnavailable: outcomes.length - (reasons.available || 0),
    unavailableByReason: reasons,
  };
}
