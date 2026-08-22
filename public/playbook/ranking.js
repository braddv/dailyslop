(function exposePlaybookRanking(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.PlaybookRanking = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function buildPlaybookRanking() {
  const BULLISH_BUCKETS = ['acceleration', 'leader', 'pullback', 'breakout'];
  const BEARISH_BUCKETS = ['weakness', 'laggard', 'bounce', 'breakdown'];
  const SIGNAL_LABELS = {
    acceleration: 'New acceleration', leader: 'Confirmed leader', pullback: 'Pullback in uptrend',
    breakout: 'Bullish reversal', weakness: 'New weakness', laggard: 'Confirmed laggard',
    bounce: 'Bounce in downtrend', breakdown: 'Bearish reversal',
    bullish_watch: 'Bullish confluence watch', bearish_watch: 'Bearish confluence watch',
  };
  const BULLISH_REGIME_SCORES = {
    'Bull trend': 100, 'Transitioning bullish': 85, Rotational: 62, Unclear: 50,
    'Reversal-led / choppy': 45, 'Transitioning bearish': 25, 'Bear trend': 10,
  };
  const BEARISH_REGIME_SCORES = {
    'Bull trend': 10, 'Transitioning bullish': 25, Rotational: 55, Unclear: 50,
    'Reversal-led / choppy': 55, 'Transitioning bearish': 85, 'Bear trend': 100,
  };

  function finite(value) {
    const number = Number(value);
    return value !== null && value !== undefined && Number.isFinite(number) ? number : null;
  }

  function clamp(value, minimum = 0, maximum = 100) {
    return Math.max(minimum, Math.min(maximum, value));
  }

  function latestSessionRows(history) {
    const sessions = [...(history?.sessions || [])].sort((left, right) => new Date(right) - new Date(left));
    if (!sessions.length) return { snapshotAt: null, rows: [] };
    const snapshotAt = sessions[0];
    return {
      snapshotAt,
      rows: (history.rows || []).filter((row) =>
        new Date(row.snapshot_at).toISOString() === new Date(snapshotAt).toISOString()
      ),
    };
  }

  function bucketScore(row, bucket, side) {
    const positiveShort = finite(row.positive_short) || 0;
    const positiveLong = finite(row.positive_long) || 0;
    const negativeShort = finite(row.negative_short) || 0;
    const negativeLong = finite(row.negative_long) || 0;
    if (bucket === 'leader') return (positiveShort + positiveLong) / 2;
    if (bucket === 'pullback') return (positiveLong + negativeShort) / 2;
    if (bucket === 'laggard') return (negativeShort + negativeLong) / 2;
    if (bucket === 'bounce') return (negativeLong + positiveShort) / 2;
    return side === 'bullish' ? positiveShort : negativeShort;
  }

  function bestBucket(row, side) {
    const allowed = side === 'bullish' ? BULLISH_BUCKETS : BEARISH_BUCKETS;
    const active = (Array.isArray(row.buckets) ? row.buckets : []).filter((bucket) => allowed.includes(bucket));
    if (active.length) {
      return active.map((bucket) => ({ bucket, score: bucketScore(row, bucket, side) }))
        .sort((left, right) => right.score - left.score)[0];
    }
    const fallback = side === 'bullish'
      ? Math.max(finite(row.positive_short) || 0, finite(row.positive_long) || 0)
      : Math.max(finite(row.negative_short) || 0, finite(row.negative_long) || 0);
    return fallback >= 58
      ? { bucket: side === 'bullish' ? 'bullish_watch' : 'bearish_watch', score: fallback }
      : null;
  }

  function regimeScore(regime, side) {
    const directional = side === 'bullish'
      ? BULLISH_REGIME_SCORES[regime?.regime] ?? 50
      : BEARISH_REGIME_SCORES[regime?.regime] ?? 50;
    const confidence = String(regime?.confidence || 'low').toLowerCase();
    const confidenceWeight = confidence === 'high' ? 1 : confidence === 'medium' ? 0.82 : 0.64;
    return clamp(50 + (directional - 50) * confidenceWeight);
  }

  function directionValue(value, side) {
    const number = finite(value);
    if (number === null) return null;
    return side === 'bullish' ? number : -number;
  }

  function priceScore(row, live, side, bucket) {
    const values = [
      directionValue(live?.changePercent ?? row.return_1d, side),
      directionValue(live?.perf1w ?? row.return_1w, side),
      directionValue(live?.perf1m ?? row.return_1m, side),
      directionValue(row.distance_20d, side),
    ];
    let score = 50;
    let available = 0;
    values.forEach((value, index) => {
      if (value === null) return;
      available += 1;
      const scale = index === 0 ? 2 : index === 1 ? 4 : index === 2 ? 8 : 4;
      score += clamp(value / scale, -1, 1) * 12.5;
    });
    if (!available) return 50;
    if (['pullback', 'bounce'].includes(bucket)) {
      const today = directionValue(live?.changePercent ?? row.return_1d, side);
      if (today !== null && today < 0) score = Math.min(score, 58);
    }
    return clamp(score);
  }

  function sectorScore(sectorRow, sectorLive, side) {
    if (!sectorRow && !sectorLive) return 50;
    const confluence = sectorRow
      ? Math.max(
        finite(sectorRow[side === 'bullish' ? 'positive_short' : 'negative_short']) || 0,
        finite(sectorRow[side === 'bullish' ? 'positive_long' : 'negative_long']) || 0
      )
      : 50;
    const returns = [sectorLive?.changePercent, sectorLive?.perf1w, sectorLive?.perf1m]
      .map((value) => directionValue(value, side)).filter((value) => value !== null);
    const trend = returns.length
      ? 50 + returns.reduce((sum, value, index) => sum + clamp(value / [2, 4, 8][index], -1, 1) * 12, 0)
      : 50;
    return clamp(confluence * 0.65 + clamp(trend) * 0.35);
  }

  function confirmation(score, positive = 67, mixed = 45) {
    if (score >= positive) return { key: 'confirmed', label: 'Confirmed' };
    if (score >= mixed) return { key: 'mixed', label: 'Mixed' };
    return { key: 'against', label: 'Against' };
  }

  function percent(value, digits = 1) {
    const number = finite(value);
    return number === null ? '--' : `${number >= 0 ? '+' : ''}${number.toFixed(digits)}%`;
  }

  function candidateExplanation(candidate) {
    const sideWord = candidate.side === 'bullish' ? 'bullish' : 'bearish';
    const return1w = percent(candidate.returns.oneWeek);
    const sectorReturn = percent(candidate.sector.return1w);
    const reasons = [
      `${candidate.signal.label} scores ${Math.round(candidate.signal.score)}.`,
      `${candidate.sector.name} is ${candidate.regime.label.toLowerCase()} with ${candidate.regime.confidence} confidence.`,
      `${candidate.symbol} is ${return1w} over 1W versus ${candidate.sector.symbol} at ${sectorReturn}.`,
    ];
    const risk = candidate.extended
      ? `${candidate.symbol} is extended from its 20-session average; avoid treating the rank as an instruction to chase.`
      : candidate.priceConfirmation.key === 'against'
        ? `Price has not confirmed the ${sideWord} signal; this is an early watch rather than a confirmed setup.`
        : `The setup weakens if price and its sector lose their current ${sideWord} alignment.`;
    return { why: reasons.join(' '), risk };
  }

  function buildCandidates({ history, market, intermarket, side }) {
    const { snapshotAt, rows } = latestSessionRows(history);
    const stockRows = rows.filter((row) => !row.is_sector);
    const sectorRows = rows.filter((row) => row.is_sector);
    const liveStocks = new Map((market?.stocks || []).map((row) => [row.symbol, row]));
    const liveSectors = new Map((market?.benchmarks || []).map((row) => [row.sector, row]));
    const sectorSignals = new Map(sectorRows.map((row) => [row.sector, row]));
    const regimes = new Map((history?.regimes || []).filter((row) => row.sector).map((row) => [row.sector, row]));
    const candidates = stockRows.map((row) => {
      const selected = bestBucket(row, side);
      if (!selected) return null;
      const live = liveStocks.get(row.symbol);
      const sectorRow = sectorSignals.get(row.sector);
      const sectorLive = liveSectors.get(row.sector);
      const regime = regimes.get(row.sector);
      const regimeComponent = regimeScore(regime, side);
      const sectorComponent = sectorScore(sectorRow, sectorLive, side);
      const priceComponent = priceScore(row, live, side, selected.bucket);
      const total = selected.score * 0.45 + regimeComponent * 0.25 + sectorComponent * 0.18 + priceComponent * 0.12;
      const distance20d = finite(row.distance_20d);
      const candidate = {
        snapshotAt, side, symbol: row.symbol, security: row.security, sectorName: row.sector,
        subIndustry: row.sub_industry, currentPrice: finite(live?.currentPrice ?? row.current_price),
        score: Math.round(total),
        signal: { key: selected.bucket, label: SIGNAL_LABELS[selected.bucket], score: selected.score },
        regime: {
          label: regime?.regime || 'Unavailable', confidence: regime?.confidence || 'low',
          score: regimeComponent, confirmation: confirmation(regimeComponent),
        },
        sector: {
          name: row.sector, symbol: sectorLive?.symbol || 'Sector ETF', score: sectorComponent,
          return1d: finite(sectorLive?.changePercent), return1w: finite(sectorLive?.perf1w),
          return1m: finite(sectorLive?.perf1m), confirmation: confirmation(sectorComponent),
        },
        returns: {
          oneDay: finite(live?.changePercent ?? row.return_1d),
          oneWeek: finite(live?.perf1w ?? row.return_1w), oneMonth: finite(live?.perf1m ?? row.return_1m),
          distance20d,
        },
        priceScore: priceComponent, priceConfirmation: confirmation(priceComponent),
        extended: distance20d !== null && Math.abs(distance20d) >= 10,
        macroRegime: intermarket?.macroRegime?.label || 'Unavailable',
      };
      candidate.explanation = candidateExplanation(candidate);
      return candidate;
    }).filter(Boolean);
    return candidates.sort((left, right) =>
      right.score - left.score || right.signal.score - left.signal.score || left.symbol.localeCompare(right.symbol)
    ).slice(0, 5);
  }

  function buildPlaybook(input) {
    const latest = latestSessionRows(input.history);
    return {
      generatedAt: new Date().toISOString(),
      signalSnapshotAt: latest.snapshotAt,
      marketAsOf: input.market?.asOf || null,
      macroAsOf: input.intermarket?.asOf || null,
      macroRegime: input.intermarket?.macroRegime || null,
      macroState: input.intermarket?.macroState || null,
      bullish: buildCandidates({ ...input, side: 'bullish' }),
      bearish: buildCandidates({ ...input, side: 'bearish' }),
      methodology: 'Signal 45% · sector regime 25% · sector confirmation 18% · price confirmation 12%',
    };
  }

  return { buildPlaybook, latestSessionRows, priceScore, regimeScore, sectorScore, SIGNAL_LABELS };
}));
