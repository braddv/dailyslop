const BULLISH_CONTINUATION = new Set(["acceleration", "leader", "pullback"]);
const BEARISH_CONTINUATION = new Set(["weakness", "laggard", "bounce"]);
const BULLISH_REVERSAL = new Set(["breakout"]);
const BEARISH_REVERSAL = new Set(["breakdown"]);
const BEARISH_SIGNALS = new Set([
  ...BEARISH_CONTINUATION,
  ...BEARISH_REVERSAL,
]);

const REGIME_VERSION = 2;

function finiteNumber(value) {
  const number = Number(value);
  return value !== null && value !== undefined && Number.isFinite(number) ? number : null;
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

function structureScore(row) {
  const parts = [];
  const return1m = finiteNumber(row.return_1m);
  const distance20d = finiteNumber(row.distance_20d);
  const positiveLong = finiteNumber(row.positive_long);
  const negativeLong = finiteNumber(row.negative_long);
  if (return1m !== null) parts.push({ value: clamp(return1m / 5, -1, 1), weight: 40 });
  if (distance20d !== null) parts.push({ value: clamp(distance20d / 3, -1, 1), weight: 25 });
  if (positiveLong !== null && negativeLong !== null) {
    parts.push({ value: clamp((positiveLong - negativeLong) / 30, -1, 1), weight: 35 });
  }
  const totalWeight = parts.reduce((sum, part) => sum + part.weight, 0);
  if (!totalWeight) return null;
  return parts.reduce((sum, part) => sum + part.value * part.weight, 0) * (100 / totalWeight);
}

function marketStructure(rows) {
  const scored = rows
    .filter((row) => !row.is_sector)
    .map((row) => ({
      score: structureScore(row),
      weight: Math.max(1, finiteNumber(row.market_cap) || 1),
    }))
    .filter((row) => row.score !== null);
  const totalWeight = scored.reduce((sum, row) => sum + row.weight, 0);
  if (!totalWeight) return null;
  return scored.reduce((sum, row) => sum + row.score * row.weight, 0) / totalWeight;
}

function outcomeSummary(outcomes, signalTypes) {
  const returns = outcomes
    .filter((row) => signalTypes.has(row.signal_type))
    .map((row) => {
      const rawReturn = finiteNumber(row.ten_session_return);
      if (rawReturn === null) return null;
      return BEARISH_SIGNALS.has(row.signal_type) ? -rawReturn : rawReturn;
    })
    .filter((value) => value !== null);
  const sampleSize = returns.length;
  if (!sampleSize) {
    return { average: null, median: null, winRate: null, sampleSize: 0, status: "insufficient" };
  }
  const average = returns.reduce((sum, value) => sum + value, 0) / sampleSize;
  const winRate = returns.filter((value) => value > 0).length / sampleSize * 100;
  let status = "unclear";
  if (sampleSize >= 15 && average > 1 && winRate > 55) status = "working";
  else if (sampleSize >= 15 && average < -1 && winRate < 45) status = "failing";
  else if (sampleSize < 15 && sampleSize >= 5 && average > 1 && winRate > 55) status = "provisional";
  return { average, median: median(returns), winRate, sampleSize, status };
}

function betterEvidence(first, second) {
  if (!first.sampleSize) return second;
  if (!second.sampleSize) return first;
  return (first.average ?? -Infinity) >= (second.average ?? -Infinity) ? first : second;
}

function classifyCandidate(directionScore, families) {
  const bullishDirection = directionScore >= 20;
  const bearishDirection = directionScore <= -20;
  const bullishContinuationWorking = families.bullishContinuation.status === "working";
  const bearishContinuationWorking = families.bearishContinuation.status === "working";
  const bullishReversalWorking = families.bullishReversal.status === "working";
  const bearishReversalWorking = families.bearishReversal.status === "working";
  const selectedContinuation = bullishDirection
    ? families.bullishContinuation
    : bearishDirection
      ? families.bearishContinuation
      : betterEvidence(families.bullishContinuation, families.bearishContinuation);
  const selectedReversal = bullishDirection
    ? families.bullishReversal
    : bearishDirection
      ? families.bearishReversal
      : betterEvidence(families.bullishReversal, families.bearishReversal);
  const reversalClearlyLeads = ["working", "provisional"].includes(selectedReversal.status) && (
    selectedContinuation.status === "failing" ||
    (selectedReversal.average ?? -Infinity) > (selectedContinuation.average ?? -Infinity) + 1
  );

  if (bullishDirection && bullishContinuationWorking) return "Bull trend";
  if (bearishDirection && bearishContinuationWorking) return "Bear trend";
  if (bullishDirection && bullishReversalWorking) return "Transitioning bullish";
  if (bearishDirection && bearishReversalWorking) return "Transitioning bearish";
  if (reversalClearlyLeads) return "Reversal-led / choppy";
  if (!bullishDirection && !bearishDirection && (bullishContinuationWorking || bearishContinuationWorking)) {
    return "Rotational";
  }
  return "Unclear";
}

function confidenceFor(families, directionScore) {
  const samples = Object.values(families).reduce((sum, family) => sum + family.sampleSize, 0);
  if (!Number.isFinite(directionScore) || samples < 20) return "low";
  if (samples >= 75) return "high";
  return "medium";
}

function applyHysteresis(candidate, previous) {
  if (!previous?.regime) {
    return { regime: candidate, pendingLabel: null, pendingStreak: 0 };
  }
  if (candidate === previous.regime) {
    return { regime: candidate, pendingLabel: null, pendingStreak: 0 };
  }
  const pendingStreak = previous.pending_label === candidate
    ? Number(previous.pending_streak || 0) + 1
    : 1;
  if (pendingStreak >= 2) {
    return { regime: candidate, pendingLabel: null, pendingStreak: 0 };
  }
  return { regime: previous.regime, pendingLabel: candidate, pendingStreak };
}

function evidenceCutoff(outcomes) {
  const timestamps = outcomes
    .filter((row) => finiteNumber(row.ten_session_return) !== null)
    .map((row) => new Date(row.outcome_10_at).getTime())
    .filter(Number.isFinite);
  return timestamps.length ? new Date(Math.max(...timestamps)).toISOString() : null;
}

export function outcomesAvailableAsOf(outcomes, snapshotAt) {
  const cutoff = new Date(snapshotAt).getTime();
  return outcomes.filter((row) => {
    const completedAt = new Date(row.outcome_10_at).getTime();
    return finiteNumber(row.ten_session_return) !== null &&
      Number.isFinite(completedAt) && completedAt <= cutoff;
  });
}

function buildScopeRecord({ scopeKey, sector, currentRows, outcomes, snapshotAt, previous }) {
  const directionScore = sector
    ? structureScore(currentRows.find((row) => row.is_sector && row.sector === sector) || {})
    : marketStructure(currentRows);
  const families = {
    bullishContinuation: outcomeSummary(outcomes, BULLISH_CONTINUATION),
    bearishContinuation: outcomeSummary(outcomes, BEARISH_CONTINUATION),
    bullishReversal: outcomeSummary(outcomes, BULLISH_REVERSAL),
    bearishReversal: outcomeSummary(outcomes, BEARISH_REVERSAL),
  };
  const candidate = classifyCandidate(directionScore ?? 0, families);
  const stabilized = applyHysteresis(candidate, previous);
  return {
    snapshotAt,
    scopeKey,
    sector,
    regime: stabilized.regime,
    candidateRegime: candidate,
    pendingLabel: stabilized.pendingLabel,
    pendingStreak: stabilized.pendingStreak,
    directionScore,
    confidence: confidenceFor(families, directionScore),
    evidenceThrough: evidenceCutoff(outcomes),
    sampleSize: Object.values(families).reduce((sum, family) => sum + family.sampleSize, 0),
    details: { families },
    version: REGIME_VERSION,
  };
}

export function buildRegimeRecords(currentRows, maturedOutcomes, snapshotAt, previousRows = []) {
  const availableOutcomes = outcomesAvailableAsOf(maturedOutcomes, snapshotAt);
  const previousByScope = new Map(previousRows.map((row) => [row.scope_key, row]));
  const stockOutcomes = availableOutcomes.filter((row) => !row.is_sector);
  const sectors = [...new Set(
    currentRows.filter((row) => row.is_sector && row.sector).map((row) => row.sector)
  )].sort();
  const records = [buildScopeRecord({
    scopeKey: "market",
    sector: null,
    currentRows,
    outcomes: stockOutcomes,
    snapshotAt,
    previous: previousByScope.get("market"),
  })];
  sectors.forEach((sector) => {
    records.push(buildScopeRecord({
      scopeKey: `sector:${sector}`,
      sector,
      currentRows,
      outcomes: stockOutcomes.filter((row) => row.sector === sector),
      snapshotAt,
      previous: previousByScope.get(`sector:${sector}`),
    }));
  });
  return records;
}

export function buildHistoricalRegimeBackfill({
  missingSnapshotAts,
  snapshotRows,
  outcomeRows,
  existingRegimes = [],
}) {
  const rowsBySnapshot = new Map();
  snapshotRows.forEach((row) => {
    const key = new Date(row.snapshot_at).toISOString();
    if (!rowsBySnapshot.has(key)) rowsBySnapshot.set(key, []);
    rowsBySnapshot.get(key).push(row);
  });
  const regimesBySnapshot = new Map();
  existingRegimes.forEach((row) => {
    const key = new Date(row.snapshot_at).toISOString();
    if (!regimesBySnapshot.has(key)) regimesBySnapshot.set(key, []);
    regimesBySnapshot.get(key).push(row);
  });
  const recordsToSave = [];
  [...missingSnapshotAts]
    .map((value) => new Date(value).toISOString())
    .sort()
    .forEach((snapshotAt) => {
      const cutoff = new Date(snapshotAt).getTime();
      const availableOutcomes = outcomesAvailableAsOf(outcomeRows, snapshotAt);
      const recentSignalDates = new Set([...new Set(
        availableOutcomes.map((outcome) => new Date(outcome.snapshot_at).toISOString())
      )].sort().reverse().slice(0, 20));
      const maturedOutcomes = availableOutcomes.filter((outcome) =>
        recentSignalDates.has(new Date(outcome.snapshot_at).toISOString())
      );
      const previousSnapshot = [...regimesBySnapshot.keys()]
        .filter((candidate) => new Date(candidate).getTime() < cutoff)
        .sort()
        .at(-1);
      const previousRows = previousSnapshot ? regimesBySnapshot.get(previousSnapshot) : [];
      const records = buildRegimeRecords(
        rowsBySnapshot.get(snapshotAt) || [], maturedOutcomes, snapshotAt, previousRows
      );
      recordsToSave.push(...records);
      regimesBySnapshot.set(snapshotAt, records.map((record) => ({
        snapshot_at: record.snapshotAt,
        scope_key: record.scopeKey,
        regime: record.regime,
        pending_label: record.pendingLabel,
        pending_streak: record.pendingStreak,
      })));
    });
  return recordsToSave;
}

export { REGIME_VERSION };
