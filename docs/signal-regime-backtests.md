# Point-in-time sector-regime backtests

`GET /api/signal-history?limit=30&includeOutcomes=true` enriches every returned
signal outcome with the sector regime recorded for the exact same production
snapshot and mapped S&P sector. It never falls back to the latest regime.

## Historical materialization

Older signal snapshots that predate stored regime rows can be reconstructed by an
authorized one-time request to:

`GET /api/signal-history?mode=backfill-regimes`

The endpoint uses the same `CRON_SECRET` bearer authorization as daily capture.
For each missing snapshot, it uses only:

- signal structure stored at that snapshot;
- 10-session outcomes whose `outcome_10_at` is not later than that snapshot;
- the most recent previously materialized regime state.

It does not use current labels or outcomes completed later. Existing historical
regime rows are preserved. The response reports how many missing snapshot and
regime rows were written. The normal daily capture continues to materialize the
current regime and does not repeat the historical backfill.

## Outcome contract

Each outcome includes:

- `sector_regime_at_signal`;
- `sector_regime_confidence_at_signal`;
- `sector_regime_evidence_through`;
- `sector_regime_snapshot_at`;
- `sector_regime_materialization_version_at_signal`;
- `sector_regime_availability`;
- `asset_class` (`individual_stock` or `sector_etf`);
- `price_adjustment_basis` and `outcome_data_quality`.

Missing exact joins remain null and are counted in `outcomeRegimeCoverage`.
Regimes whose evidence timestamp is later than the signal are rejected as
`invalid_future_evidence`.

## Cohorts and episodes

`bullishRegimeBacktest` reports acceleration, leader, pullback, and breakout
signals for Bull trend, Transitioning bullish, and their combined cohort. Each is
split into individual stocks, ordinary unleveraged sector ETFs, and a clearly
labeled combined view.

Direct 5-versus-10 comparisons use a matched cohort: both returns must be
complete. Missing prices remain null. A ticker-session is deduplicated by ticker
plus signal timestamp within each signal/regime/asset group. A trading episode
starts at the first qualifying signal and remains active through that signal's
10-session outcome timestamp; overlapping signals of the same strategy group on
that ticker are grouped into the active episode.

Recommendation statistics use non-overlapping episodes. A horizon is supported
only with at least 20 episodes and 10 tickers, positive average and median return,
win rate above 50%, and no obvious single-outlier or sign-sensitive trimmed-mean
domination. Otherwise the status is `insufficient_evidence`.

## Example API shape

```json
{
  "outcomes": [{
    "snapshot_at": "2026-07-01T19:00:00.000Z",
    "symbol": "NVDA",
    "sector": "Information Technology",
    "signal_type": "breakout",
    "entry_price": 100.0,
    "five_session_return": 3.2,
    "ten_session_return": 7.1,
    "sector_regime_at_signal": "Bull trend",
    "sector_regime_confidence_at_signal": "medium",
    "sector_regime_evidence_through": "2026-07-01T19:00:00.000Z",
    "sector_regime_snapshot_at": "2026-07-01T19:00:00.000Z",
    "asset_class": "individual_stock",
    "outcome_data_quality": "eligible"
  }],
  "outcomeRegimeCoverage": {
    "totalOutcomes": 3827,
    "contemporaneousRegimeAvailable": 3827,
    "contemporaneousRegimeUnavailable": 0
  },
  "holdingRecommendations": [{
    "signalType": "breakout",
    "sectorRegime": "Bull trend",
    "assetClass": "individual_stock",
    "preferredHoldingSessions": 10,
    "sampleSize": 24,
    "uniqueEpisodeCount": 24,
    "recommendationStatus": "supported",
    "backtestCutoffTimestamp": "2026-08-07T18:00:00.000Z",
    "methodologyVersion": 1
  }]
}
```

Values above illustrate the contract; production values are calculated from the
stored matched cohort on each request.

## Missing securities and corporate actions

Outcome targets use the global production session calendar. If a ticker is absent
on the target session (including an unavailable or delisted security), its price
and return remain null rather than shifting to a later observation or becoming
zero. Yahoo point-in-time close prices are used consistently. Split-like price
discontinuities are conservatively marked `suspected_corporate_action` and
excluded from comparisons instead of applying a guessed adjustment factor.
