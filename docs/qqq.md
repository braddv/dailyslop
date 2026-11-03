# QQQ sector bubble map

`/qqq` reuses `/sp500ad/styles.css` and `/sp500ad/app.js` with a QQQ universe configuration. It retains chart metrics, sector/subsector drill-down, replay, ticker pinning, bullish/bearish Action Board, signal history and browser-local watchlists. S&P-only Dow/Top250/Bottom250 filters are omitted. The homepage links to QQQ.

## Data and state

`/api/qqq` is a Vercel alias to `/api/sector-ad?universe=qqq`, which selects the QQQ universe in the existing Yahoo quote/replay pipeline. It requests every constituent, including those outside the S&P 500, and uses QQQ as broad benchmark. Daily/intraday cache keys are independent; quote-coverage validation scales to the smaller universe. Standard sector ETFs provide broader reference comparisons, not QQQ sector baskets. Bubble cap shares represent the displayed universe's market caps, not actual modified QQQ holdings weights.

The checked-in seed has 101 Nasdaq-100 equity listings, sourced from the membership table linked in its source metadata on 2026-11-02. It is an index membership proxy, not a full ETF holdings export: fund cash and derivatives are excluded. It contains no invented fallback quotes. Sector classification reuses existing GICS assignments where available and maps ICB industries otherwise. Refresh membership periodically:

```sh
curl -L https://en.wikipedia.org/wiki/List_of_NASDAQ-100_companies -o /tmp/nasdaq100.html
python3 scripts/build-qqq-seed.py /tmp/nasdaq100.html
```

`/api/qqq-signal-history` aliases the existing history function with `universe=qqq`, dispatching to `api/_lib/qqq-signal-history.js`. This keeps the existing 12-function deployment footprint. It uses separate `qqq_signal_*` tables, the existing DATABASE_URL, and the same CRON_SECRET capture authorization. History begins with successful QQQ captures; existing S&P history is not substituted. Broad QQQ itself is excluded from sector signals. The capture workflow includes QQQ and uses two UTC candidates with a 2 PM America/New_York gate to accommodate DST. Deployment must retain the existing database and capture secret. Browser watchlist and Action Board keys are prefixed `qqq-`; SP500 state remains separate.

## Checks

```sh
npm test
npm run build
node scripts/test-qqq-browser.mjs
```

Browser smoke uses Chromium (`/usr/bin/chromium`, or CHROMIUM_PATH), an ephemeral local static server, and synthetic API fixtures **only for testing**. It exercises chart membership, replay play/live, watchlist persistence/isolation, Action Board directions, history, reload, and desktop/mobile screenshots at `/tmp/qqq-{desktop,mobile}.png`. API tests cover below-101 cached coverage, full refresh requests, benchmark and membership exclusion, and separate endpoints/storage.

Database-backed capture/outcomes require deployed credentials and are not proven by mocked UI tests. Yahoo availability and membership changes are external dependencies; unavailable live quotes are reported rather than fabricated. Existing Vercel deployment uses the repository's normal build and `/qqq` rewrites.
