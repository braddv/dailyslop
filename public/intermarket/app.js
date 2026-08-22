const GROUP_COLORS = {
  Equities: '#5bbcff',
  'Risk & Credit': '#c18cff',
  Rates: '#f1b667',
  Currencies: '#6ed8c4',
  Commodities: '#ef7aa9',
};
const GROUP_CLASS = {
  Equities: 'group-equities',
  'Risk & Credit': 'group-risk-credit',
  Rates: 'group-rates',
  Currencies: 'group-currencies',
  Commodities: 'group-commodities',
};
const METRIC_LABELS = {
  changePercent: '1D',
  perf1w: '1W',
  perf1m: '1M',
  perf3m: '3M',
};
const SECTOR_ORDER = [
  'Information Technology', 'Communication Services', 'Consumer Discretionary',
  'Consumer Staples', 'Energy', 'Financials', 'Health Care', 'Industrials',
  'Materials', 'Real Estate', 'Utilities',
];
const SECTOR_SHORT_NAMES = {
  'Information Technology': 'Technology',
  'Communication Services': 'Communication',
  'Consumer Discretionary': 'Discretionary',
  'Consumer Staples': 'Staples',
};

const state = {
  data: null,
  breadthData: null,
  metric: 'changePercent',
  rankingMode: 'return',
  mode: 'live',
  frames: [],
  frameIndex: 0,
  timer: null,
  pinnedSymbol: null,
};

const elements = {
  asOf: document.getElementById('asOf'),
  cacheState: document.getElementById('cacheState'),
  macroSummary: document.getElementById('macroSummary'),
  stateGrid: document.getElementById('stateGrid'),
  regimePanel: document.getElementById('regimePanel'),
  breadthSummary: document.getElementById('breadthSummary'),
  breadthOverview: document.getElementById('breadthOverview'),
  breadthAsOf: document.getElementById('breadthAsOf'),
  sectorBreadthGrid: document.getElementById('sectorBreadthGrid'),
  chart: document.getElementById('chart'),
  chartScroll: document.getElementById('chartScroll'),
  chartDescription: document.getElementById('chartDescription'),
  metricToggle: document.getElementById('metricToggle'),
  replayModes: document.getElementById('replayModes'),
  replayTransport: document.getElementById('replayTransport'),
  playButton: document.getElementById('playButton'),
  scrubber: document.getElementById('scrubber'),
  replayTimestamp: document.getElementById('replayTimestamp'),
  speedSelect: document.getElementById('speedSelect'),
  groupLegend: document.getElementById('groupLegend'),
  relationshipGrid: document.getElementById('relationshipGrid'),
  rankingGrid: document.getElementById('rankingGrid'),
  rankingLabel: document.getElementById('rankingLabel'),
  rankingToggle: document.getElementById('rankingToggle'),
  refreshButton: document.getElementById('refreshButton'),
  statusText: document.getElementById('statusText'),
  drawer: document.getElementById('instrumentDrawer'),
  drawerBackdrop: document.getElementById('drawerBackdrop'),
  drawerClose: document.getElementById('drawerClose'),
  drawerContent: document.getElementById('drawerContent'),
};

function finite(value) {
  return Number.isFinite(value);
}

function formatPercent(value, digits = 2) {
  if (!finite(value)) return '--';
  return `${value >= 0 ? '+' : ''}${value.toFixed(digits)}%`;
}

function formatPrice(row) {
  if (!finite(row.currentPrice)) return '--';
  if (row.format === 'yield') return `${row.currentPrice.toFixed(3)}%`;
  if (row.currentPrice >= 1000) return row.currentPrice.toLocaleString(undefined, { maximumFractionDigits: 1 });
  if (row.currentPrice < 10) return row.currentPrice.toFixed(3);
  return row.currentPrice.toFixed(2);
}

function formatTrendValue(value, unit, digits = 1) {
  if (!finite(value)) return '--';
  return `${value >= 0 ? '+' : ''}${value.toFixed(digits)} ${unit}`;
}

function formatTrendLevel(row, value) {
  if (!finite(value)) return '--';
  if (row.format === 'yield') return `${value.toFixed(3)}%`;
  if (value >= 1000) return value.toLocaleString(undefined, { maximumFractionDigits: 1 });
  if (value < 10) return value.toFixed(3);
  return value.toFixed(2);
}

function formatDate(value, includeTime = true) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '--';
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    month: 'short', day: 'numeric',
    ...(includeTime ? { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' } : {}),
  }).format(date);
}

function toneFor(value) {
  if (!finite(value) || Math.abs(value) < 0.0001) return '';
  return value > 0 ? 'return-positive' : 'return-negative';
}

function stateTone(card) {
  const text = `${card.value}`.toLowerCase();
  if (card.id === 'rates') {
    if (text.includes('easing') || text.includes('lower')) return 'positive';
    if (text.includes('rising') || text.includes('higher')) return 'negative';
  }
  if (card.id === 'dollar') {
    if (text.includes('weaker') || text.includes('lower')) return 'positive';
    if (text.includes('stronger') || text.includes('higher')) return 'negative';
  }
  if (card.id === 'commodities') {
    if (text.includes('bid') || text.includes('higher')) return 'positive';
    if (text.includes('pressure') || text.includes('lower')) return 'negative';
  }
  if (text.includes('risk-on')) return 'positive';
  if (text.includes('risk-off')) return 'negative';
  return 'neutral';
}

function renderMacroState() {
  elements.macroSummary.textContent = state.data.macroState?.summary || 'Macro state unavailable.';
  elements.stateGrid.innerHTML = (state.data.macroState?.cards || []).map((card) => `
    <article class="state-card" data-tone="${stateTone(card)}">
      <span>${card.label}</span>
      <strong>${card.value}</strong>
      <p>${card.detail}</p>
    </article>
  `).join('');
  renderMacroRegime();
}

function renderMacroRegime() {
  const regime = state.data.macroRegime;
  if (!regime) {
    elements.regimePanel.hidden = true;
    return;
  }
  const growthPosition = finite(regime.growthScore) ? 50 + regime.growthScore * 0.45 : 50;
  const inflationPosition = finite(regime.inflationScore) ? 50 - regime.inflationScore * 0.45 : 50;
  const evidenceList = (rows, emptyText) => rows?.length
    ? `<ul>${rows.map((row) => `<li><strong>${row.axis === 'growth' ? 'Growth' : 'Inflation'}</strong><span>${row.detail}</span></li>`).join('')}</ul>`
    : `<p class="regime-empty">${emptyText}</p>`;
  elements.regimePanel.hidden = false;
  elements.regimePanel.innerHTML = `
    <div class="regime-copy">
      <p class="section-kicker">Growth × inflation map</p>
      <div class="regime-title-row">
        <h3>${regime.label}</h3>
        <span class="regime-status">${regime.status} · ${regime.confidence} confidence</span>
      </div>
      <p>${regime.note}</p>
      <div class="regime-score-grid">
        <div><span>Growth pulse</span><strong>${trendScore(regime.growthScore)}</strong><small>${regime.growthDirection}</small></div>
        <div><span>Inflation pressure</span><strong>${trendScore(regime.inflationScore)}</strong><small>${regime.inflationDirection}</small></div>
        <div><span>Input coverage</span><strong>${regime.coveragePercent}%</strong><small>available evidence</small></div>
      </div>
    </div>
    <div class="regime-quadrant" style="--regime-x:${growthPosition}%;--regime-y:${inflationPosition}%" aria-label="Growth and inflation regime quadrant">
      <div class="quadrant-label top-left"><strong>Stagflation</strong><span>Growth ↓ · Inflation ↑</span></div>
      <div class="quadrant-label top-right"><strong>Reflation</strong><span>Growth ↑ · Inflation ↑</span></div>
      <div class="quadrant-label bottom-left"><strong>Disinflationary slowdown</strong><span>Growth ↓ · Inflation ↓</span></div>
      <div class="quadrant-label bottom-right"><strong>Goldilocks</strong><span>Growth ↑ · Inflation ↓</span></div>
      <span class="axis-label axis-growth">Growth pulse →</span>
      <span class="axis-label axis-inflation">Inflation pressure →</span>
      <span class="regime-marker"><i></i><b>${regime.label}</b></span>
    </div>
    <div class="regime-evidence">
      <div><h4>Supporting evidence</h4>${evidenceList(regime.supportingEvidence, 'No decisive supporting evidence.')}</div>
      <div><h4>Contradicting evidence</h4>${evidenceList(regime.contradictingEvidence, 'No material contradictions in the available inputs.')}</div>
    </div>
  `;
}

function trendScore(value) {
  if (!finite(value)) return '--';
  return `${value >= 0 ? '+' : ''}${Math.round(value)}`;
}

function trendDirectionClass(value) {
  if (!finite(value) || Math.abs(value) < 20) return '';
  return value > 0 ? 'return-positive' : 'return-negative';
}

function breadthCounts(rows) {
  return rows.reduce((counts, row) => {
    if (!finite(row.breadthReturn)) return counts;
    counts.total += 1;
    if (row.breadthReturn > 0) counts.advancers += 1;
    else if (row.breadthReturn < 0) counts.decliners += 1;
    else counts.unchanged += 1;
    return counts;
  }, { advancers: 0, decliners: 0, unchanged: 0, total: 0 });
}

function breadthReturn(row) {
  if (!row) return null;
  if (state.mode === 'live') return row?.[state.metric];
  const timestamp = state.frames[state.frameIndex]?.timestamp;
  const baselineTimestamp = state.frames[0]?.timestamp;
  if (!finite(timestamp) || !finite(baselineTimestamp)) return null;
  const points = sourceForMode(row, state.mode);
  const base = lowerBoundPoint(points, baselineTimestamp)?.[1];
  const current = lowerBoundPoint(points, timestamp)?.[1];
  if (!finite(base) || !finite(current) || base === 0) return null;
  return ((current / base) - 1) * 100;
}

function breadthContextLabel() {
  return state.mode === 'live' ? METRIC_LABELS[state.metric] : `${state.mode.toUpperCase()} replay`;
}

function breadthInterpretation(percentAdvancing, spyReturn) {
  if (!finite(percentAdvancing)) return { label: 'Breadth unavailable', tone: 'neutral', detail: 'No valid constituent changes.' };
  if (percentAdvancing >= 60) {
    if (finite(spyReturn) && spyReturn < -0.2) {
      return { label: 'Positive divergence', tone: 'positive', detail: 'Most stocks are advancing despite a lower index.' };
    }
    return { label: 'Broad participation', tone: 'positive', detail: 'Gains are supported by most S&P 500 stocks.' };
  }
  if (percentAdvancing <= 40) {
    const label = finite(spyReturn) && spyReturn > 0.2 ? 'Narrow rally' : 'Broad selling';
    const detail = label === 'Narrow rally'
      ? 'The index is up despite weak participation beneath the surface.'
      : 'Decliners dominate across the S&P 500.';
    return { label, tone: 'negative', detail };
  }
  if (finite(spyReturn) && spyReturn > 0.2 && percentAdvancing < 50) {
    return { label: 'Narrow rally', tone: 'negative', detail: 'Index gains are concentrated in fewer stocks.' };
  }
  return { label: 'Mixed breadth', tone: 'neutral', detail: 'Participation is balanced without a decisive internal trend.' };
}

function renderBreadth() {
  const rows = (state.breadthData?.stocks || []).map((row) => ({
    ...row,
    breadthReturn: breadthReturn(row),
  }));
  if (!rows.length) {
    elements.breadthSummary.textContent = 'S&P 500 breadth is temporarily unavailable.';
    elements.breadthOverview.innerHTML = '<div class="breadth-error">Macro prices are still available; breadth will retry on the next refresh.</div>';
    elements.sectorBreadthGrid.innerHTML = '';
    elements.breadthAsOf.textContent = '';
    return;
  }

  const counts = breadthCounts(rows);
  const percentAdvancing = counts.total ? (counts.advancers / counts.total) * 100 : null;
  const netBreadth = counts.advancers - counts.decliners;
  const adRatio = counts.decliners ? counts.advancers / counts.decliners : null;
  const spy = (state.breadthData.benchmarks || []).find((row) => row.symbol === 'SPY');
  const spyReturn = breadthReturn(spy);
  const interpretation = state.mode !== 'live' && state.frameIndex === 0
    ? { label: 'Replay baseline', tone: 'neutral', detail: 'All stocks are measured from this shared starting frame.' }
    : breadthInterpretation(percentAdvancing, spyReturn);
  const contextLabel = breadthContextLabel();

  elements.breadthSummary.innerHTML = `<strong class="breadth-callout ${interpretation.tone}">${interpretation.label} · ${contextLabel}</strong><span>${interpretation.detail}</span>`;
  elements.breadthOverview.innerHTML = `
    <article class="breadth-stat advancing"><span>Advancers</span><strong>${counts.advancers}</strong></article>
    <article class="breadth-stat declining"><span>Decliners</span><strong>${counts.decliners}</strong></article>
    <article class="breadth-stat"><span>Stocks advancing</span><strong>${finite(percentAdvancing) ? `${percentAdvancing.toFixed(0)}%` : '--'}</strong></article>
    <article class="breadth-stat"><span>Net breadth</span><strong class="${toneFor(netBreadth)}">${netBreadth > 0 ? '+' : ''}${netBreadth}</strong></article>
    <article class="breadth-stat"><span>A/D ratio</span><strong>${finite(adRatio) ? adRatio.toFixed(2) : '--'}</strong></article>
  `;

  const bySector = new Map();
  rows.forEach((row) => {
    if (!row.sector) return;
    if (!bySector.has(row.sector)) bySector.set(row.sector, []);
    bySector.get(row.sector).push(row);
  });
  const sectors = [...bySector.entries()].map(([sector, sectorRows]) => {
    const sectorCounts = breadthCounts(sectorRows);
    return {
      sector,
      ...sectorCounts,
      percentAdvancing: sectorCounts.total ? (sectorCounts.advancers / sectorCounts.total) * 100 : null,
    };
  }).sort((left, right) => {
    const leftIndex = SECTOR_ORDER.indexOf(left.sector);
    const rightIndex = SECTOR_ORDER.indexOf(right.sector);
    return (leftIndex < 0 ? 99 : leftIndex) - (rightIndex < 0 ? 99 : rightIndex);
  });

  const breadthTimestamp = state.mode === 'live'
    ? state.breadthData.asOf
    : state.frames[state.frameIndex]?.timestamp * 1000;
  elements.breadthAsOf.textContent = `${contextLabel} · ${formatDate(breadthTimestamp)}`;
  elements.sectorBreadthGrid.innerHTML = sectors.map((sector) => {
    const percent = finite(sector.percentAdvancing) ? sector.percentAdvancing : 0;
    const tone = sector.advancers === 0 && sector.decliners === 0
      ? 'neutral'
      : percent >= 55 ? 'positive' : percent <= 45 ? 'negative' : 'neutral';
    return `
      <article class="sector-breadth-card" data-tone="${tone}">
        <div><strong>${SECTOR_SHORT_NAMES[sector.sector] || sector.sector}</strong><span>${sector.advancers} up · ${sector.decliners} down</span></div>
        <b>${percent.toFixed(0)}%</b>
        <div class="breadth-bar" aria-label="${percent.toFixed(0)} percent of ${sector.sector} stocks advancing"><i style="width:${percent}%"></i></div>
      </article>
    `;
  }).join('');
}

function symlog(value) {
  return Math.sign(value) * Math.log1p(Math.abs(value) * 1.6);
}

function chartTicks(maxAbs) {
  const candidates = [0.25, 0.5, 1, 2, 3, 5, 10, 15, 20, 30, 50];
  const positive = candidates.filter((value) => value <= maxAbs * 1.12);
  if (!positive.length) positive.push(Math.max(0.1, maxAbs));
  const selected = positive.length > 7
    ? positive.filter((_, index) => index % 2 === 0 || index === positive.length - 1)
    : positive;
  return [...selected.map((value) => -value).reverse(), 0, ...selected];
}

function displayRows() {
  if (state.mode === 'live') {
    return state.data.instruments.map((row) => ({ ...row, displayReturn: row[state.metric] }));
  }
  const frame = state.frames[state.frameIndex];
  return state.data.instruments.map((row) => ({
    ...row,
    displayReturn: frame?.returns?.[row.symbol] ?? null,
  }));
}

function renderChart() {
  const rows = displayRows();
  const values = rows.map((row) => Math.abs(row.displayReturn)).filter(finite);
  const maxAbs = Math.max(1, ...values) * 1.08;
  const maxLog = symlog(maxAbs);
  const width = Math.max(elements.chartScroll.clientWidth - 2, rows.length * 62);
  const height = elements.chart.clientHeight || 610;
  const top = 32;
  const bottom = 78;
  const plotHeight = height - top - bottom;
  elements.chart.style.width = `${width}px`;
  elements.chart.innerHTML = '';

  chartTicks(maxAbs).forEach((tick) => {
    const y = top + (1 - ((symlog(tick) + maxLog) / (2 * maxLog))) * plotHeight;
    const line = document.createElement('div');
    line.className = `axis-line${tick === 0 ? ' zero' : ''}`;
    line.style.top = `${y}px`;
    line.innerHTML = `<span>${tick === 0 ? '0%' : `${tick > 0 ? '+' : ''}${tick}%`}</span>`;
    elements.chart.appendChild(line);
  });

  rows.forEach((row, index) => {
    const x = ((index + 0.5) / rows.length) * width;
    const value = finite(row.displayReturn) ? row.displayReturn : 0;
    const y = top + (1 - ((symlog(value) + maxLog) / (2 * maxLog))) * plotHeight;
    const size = Math.round(48 * (row.importance || 1));

    const column = document.createElement('div');
    column.className = 'column-line';
    column.style.left = `${x}px`;
    elements.chart.appendChild(column);

    const bubble = document.createElement('button');
    bubble.type = 'button';
    bubble.className = `macro-bubble ${GROUP_CLASS[row.group] || ''}${state.pinnedSymbol === row.symbol ? ' pinned' : ''}`;
    bubble.style.left = `${x}px`;
    bubble.style.top = `${y}px`;
    bubble.style.width = `${size}px`;
    bubble.style.height = `${size}px`;
    bubble.title = `${row.name}: ${formatPercent(row.displayReturn)} · ${row.trend?.label || 'Trend unavailable'}`;
    bubble.innerHTML = `<span class="bubble-content"><strong>${row.displaySymbol || row.symbol}</strong><span>${formatPercent(row.displayReturn, 1)}</span></span>`;
    bubble.addEventListener('click', () => openDrawer(row.symbol));
    elements.chart.appendChild(bubble);

    const label = document.createElement('div');
    label.className = 'ticker-label';
    label.style.left = `${x}px`;
    label.innerHTML = `<strong>${row.displaySymbol || row.symbol}</strong>${row.group}`;
    elements.chart.appendChild(label);
  });
}

function renderLegend() {
  elements.groupLegend.innerHTML = Object.entries(GROUP_COLORS).map(([label, color]) => `
    <span class="legend-item"><i class="legend-dot" style="background:${color}"></i>${label}</span>
  `).join('');
}

function relationshipPrimary(row) {
  if (finite(row.currentSpreadBps)) return `${row.currentSpreadBps >= 0 ? '+' : ''}${row.currentSpreadBps.toFixed(0)} bp`;
  return formatPercent(row.changePercent);
}

function renderRelationships() {
  elements.relationshipGrid.innerHTML = (state.data.relationships || []).map((row) => `
    <article class="relationship-card">
      <h3>${row.label}</h3>
      <strong class="relationship-value ${toneFor(row.changePercent)}">${relationshipPrimary(row)}</strong>
      <p>${row.interpretation}</p>
      ${[row.perf1w, row.perf1m, row.perf3m].some(finite) ? `<div class="relationship-periods">
        <span>1W<br><b class="${toneFor(row.perf1w)}">${formatPercent(row.perf1w, 1)}</b></span>
        <span>1M<br><b class="${toneFor(row.perf1m)}">${formatPercent(row.perf1m, 1)}</b></span>
        <span>3M<br><b class="${toneFor(row.perf3m)}">${formatPercent(row.perf3m, 1)}</b></span>
      </div>` : ''}
      ${[row.corr1m, row.corr3m, row.corr6m].some(finite) ? `<div class="relationship-correlation-block">
        <small>Daily-return correlation between the pair</small>
        <div class="relationship-correlations">
          <span>1M<br><b>${finite(row.corr1m) ? row.corr1m.toFixed(2) : '--'}</b></span>
          <span>3M<br><b>${finite(row.corr3m) ? row.corr3m.toFixed(2) : '--'}</b></span>
          <span>6M<br><b>${finite(row.corr6m) ? row.corr6m.toFixed(2) : '--'}</b></span>
        </div>
      </div>` : ''}
    </article>
  `).join('');
}

function rankingMetric() {
  return state.mode === 'live' ? state.metric : 'displayReturn';
}

function renderRankings() {
  const trendMode = state.rankingMode === 'trend';
  const rows = displayRows().filter((row) => trendMode
    ? finite(row.systematicTrend?.score)
    : finite(row[rankingMetric()]));
  const metric = rankingMetric();
  const value = (row) => trendMode ? row.systematicTrend.score : row[metric];
  const leaders = [...rows]
    .filter((row) => !trendMode || value(row) > 0)
    .sort((left, right) => value(right) - value(left))
    .slice(0, 8);
  const laggards = [...rows]
    .filter((row) => !trendMode || value(row) < 0)
    .sort((left, right) => value(left) - value(right))
    .slice(0, 8);
  const horizonDots = (row) => (row.systematicTrend?.horizons || []).map((horizon) => {
    const direction = !finite(horizon.normalizedScore) ? 'missing' : horizon.normalizedScore >= 0 ? 'higher' : 'lower';
    return `<i data-direction="${direction}" title="${horizon.label} ${finite(horizon.return) ? formatTrendValue(horizon.return, row.systematicTrend.moveUnit) : 'unavailable'}"></i>`;
  }).join('');
  const column = (title, list) => `
    <div class="ranking-column">
      <h3>${title}</h3>
      ${list.map((row, index) => `
        <button class="rank-row${trendMode ? ' trend-rank-row' : ''}" type="button" data-drawer-symbol="${row.symbol}">
          <span class="rank-number">${index + 1}</span>
          <span class="rank-name"><strong>${row.displaySymbol || row.symbol}</strong><span>${row.name}</span>${trendMode
            ? `<em data-direction="${row.systematicTrend.direction}">${row.systematicTrend.label} · ${row.systematicTrend.sessionsInTrend} aligned sessions</em><span class="horizon-dots" aria-label="1, 3, 6 and 12 month trend directions">${horizonDots(row)}</span>`
            : row.trend ? `<em data-direction="${row.trend.direction}">${row.trend.label} · ${formatTrendValue(row.trend.distance20, row.trend.moveUnit)} vs 20D</em>` : ''}</span>
          <strong class="${trendMode ? trendDirectionClass(value(row)) : toneFor(value(row))}">${trendMode ? trendScore(value(row)) : formatPercent(value(row))}</strong>
        </button>
      `).join('')}
    </div>
  `;
  elements.rankingGrid.innerHTML = column(trendMode ? 'Uptrends' : 'Leaders', leaders) + column(trendMode ? 'Downtrends' : 'Laggards', laggards);
  elements.rankingLabel.textContent = trendMode
    ? 'Current volatility-adjusted 1M–12M trend score.'
    : state.mode === 'live' ? `Ranked by ${METRIC_LABELS[state.metric]} return.`
      : `Ranked at ${formatDate(state.frames[state.frameIndex]?.timestamp * 1000)}.`;
  elements.rankingGrid.querySelectorAll('[data-drawer-symbol]').forEach((button) => {
    button.addEventListener('click', () => openDrawer(button.dataset.drawerSymbol));
  });
}

function sourceForMode(row, mode) {
  if (mode === '1d') return row.replayDay15m || [];
  if (mode === '1w') return row.replayWeekHourly || [];
  return row.replayDaily || [];
}

function nyDateKey(timestamp) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date(timestamp * 1000));
}

function lowerBoundPoint(points, timestamp) {
  let low = 0;
  let high = points.length - 1;
  let found = null;
  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    if (points[middle][0] <= timestamp) {
      found = points[middle];
      low = middle + 1;
    } else high = middle - 1;
  }
  return found;
}

function buildReplayFrames(mode) {
  const allPoints = state.data.instruments.flatMap((row) => sourceForMode(row, mode));
  const latest = Math.max(...allPoints.map((point) => point[0]).filter(finite));
  if (!finite(latest)) return [];
  let cutoff;
  if (mode === '1d') {
    const latestDate = nyDateKey(latest);
    cutoff = Math.min(...allPoints.filter((point) => nyDateKey(point[0]) === latestDate).map((point) => point[0]));
  } else {
    const days = mode === '1w' ? 8 : mode === '1m' ? 32 : 94;
    cutoff = latest - days * 24 * 60 * 60;
  }
  const pointsBySymbol = new Map();
  state.data.instruments.forEach((row) => {
    const points = sourceForMode(row, mode).filter((point) => point[0] >= cutoff && point[0] <= latest);
    if (points.length >= 2) pointsBySymbol.set(row.symbol, points);
  });
  const sharedStart = Math.max(...[...pointsBySymbol.values()].map((points) => points[0][0]));
  const timeline = [...new Set(
    [...pointsBySymbol.values()].flatMap((points) => points.map((point) => point[0]))
  )].filter((timestamp) => timestamp >= sharedStart).sort((a, b) => a - b);
  return timeline.map((timestamp) => {
    const returns = {};
    pointsBySymbol.forEach((points, symbol) => {
      const base = lowerBoundPoint(points, sharedStart)?.[1];
      const current = lowerBoundPoint(points, timestamp)?.[1];
      if (finite(base) && finite(current) && base !== 0) returns[symbol] = ((current / base) - 1) * 100;
    });
    return { timestamp, returns };
  });
}

function stopPlayback() {
  if (state.timer) window.clearInterval(state.timer);
  state.timer = null;
  elements.playButton.innerHTML = '▶ <span>Play</span>';
}

function updateReplayUi() {
  const live = state.mode === 'live';
  elements.replayTransport.classList.toggle('is-disabled', live || state.frames.length < 2);
  elements.scrubber.max = Math.max(0, state.frames.length - 1);
  elements.scrubber.value = state.frameIndex;
  elements.replayTimestamp.textContent = live
    ? 'Live market view'
    : formatDate(state.frames[state.frameIndex]?.timestamp * 1000);
  elements.chartDescription.textContent = live
    ? `${METRIC_LABELS[state.metric]} percent change across the macro universe.`
    : `Continuous ${state.mode.toUpperCase()} return from one shared starting baseline.`;
}

function setMode(mode) {
  stopPlayback();
  state.mode = mode;
  state.frames = mode === 'live' ? [] : buildReplayFrames(mode);
  state.frameIndex = 0;
  elements.replayModes.querySelectorAll('button').forEach((button) => button.classList.toggle('active', button.dataset.mode === mode));
  elements.metricToggle.querySelectorAll('button').forEach((button) => { button.disabled = mode !== 'live'; });
  updateReplayUi();
  renderChart();
  renderRankings();
  renderBreadth();
}

function togglePlayback() {
  if (state.timer) {
    stopPlayback();
    return;
  }
  if (state.frameIndex >= state.frames.length - 1) state.frameIndex = 0;
  elements.playButton.innerHTML = 'Ⅱ <span>Pause</span>';
  state.timer = window.setInterval(() => {
    state.frameIndex += 1;
    if (state.frameIndex >= state.frames.length - 1) {
      state.frameIndex = Math.max(0, state.frames.length - 1);
      stopPlayback();
    }
    updateReplayUi();
    renderChart();
    renderRankings();
    renderBreadth();
  }, Number(elements.speedSelect.value));
}

function openDrawer(symbol) {
  const row = state.data.instruments.find((instrument) => instrument.symbol === symbol);
  if (!row) return;
  state.pinnedSymbol = symbol;
  elements.drawerContent.innerHTML = `
    <p class="drawer-kicker">${row.group}</p>
    <h2>${row.displaySymbol || row.symbol}</h2>
    <p class="drawer-subhead">${row.name}</p>
    <div class="drawer-price"><span>Current level</span><strong>${formatPrice(row)}</strong></div>
    ${row.trend ? `
      <section class="drawer-trend" data-direction="${row.trend.direction}">
        <div class="drawer-trend-heading">
          <div><span>Structural trend</span><strong>${row.trend.label}</strong></div>
          <b>${row.trend.moveLabel} move today</b>
        </div>
        <p>Today ${formatTrendValue(row.trend.todayMove, row.trend.moveUnit)} · average daily move ${formatTrendValue(row.trend.averageDailyMove, row.trend.moveUnit).replace(/^\+/, '')}</p>
        <div class="drawer-trend-grid">
          <div><span>20D average</span><strong>${formatTrendLevel(row, row.trend.average20)}</strong><em data-direction="${row.trend.distance20 >= 0 ? 'higher' : 'lower'}">${formatTrendValue(row.trend.distance20, row.trend.moveUnit)} away</em></div>
          <div><span>50D average</span><strong>${formatTrendLevel(row, row.trend.average50)}</strong><em data-direction="${row.trend.distance50 >= 0 ? 'higher' : 'lower'}">${formatTrendValue(row.trend.distance50, row.trend.moveUnit)} away</em></div>
        </div>
      </section>
    ` : ''}
    ${row.systematicTrend ? `
      <section class="drawer-systematic" data-direction="${row.systematicTrend.direction}">
        <div class="drawer-systematic-heading">
          <div><span>Systematic trend quality</span><strong>${row.systematicTrend.label}</strong></div>
          <b class="${trendDirectionClass(row.systematicTrend.score)}">${trendScore(row.systematicTrend.score)}</b>
        </div>
        <div class="drawer-horizons">
          ${row.systematicTrend.horizons.map((horizon) => `
            <div data-direction="${!finite(horizon.normalizedScore) ? 'missing' : horizon.normalizedScore >= 0 ? 'higher' : 'lower'}">
              <span>${horizon.label}</span>
              <strong>${finite(horizon.return) ? formatTrendValue(horizon.return, row.systematicTrend.moveUnit) : '--'}</strong>
              <em>${finite(horizon.normalizedScore) ? `${trendScore(horizon.normalizedScore)} vol-adjusted` : 'not enough history'}</em>
            </div>
          `).join('')}
        </div>
        <div class="drawer-quality-grid">
          <div><span>Horizon agreement</span><strong>${finite(row.systematicTrend.agreementPercent) ? `${Math.round(row.systematicTrend.agreementPercent)}%` : '--'}</strong></div>
          <div><span>Trend persistence</span><strong>${finite(row.systematicTrend.persistencePercent) ? `${Math.round(row.systematicTrend.persistencePercent)}%` : '--'}</strong></div>
          <div><span>Aligned 50D streak</span><strong>${row.systematicTrend.sessionsInTrend} sessions</strong></div>
          <div><span>60-session flips</span><strong>${row.systematicTrend.flipCount}</strong></div>
          <div><span>Movement efficiency</span><strong>${finite(row.systematicTrend.efficiency) ? `${Math.round(row.systematicTrend.efficiency * 100)}%` : '--'}</strong></div>
          <div><span>Volatility percentile</span><strong>${finite(row.systematicTrend.volatilityPercentile) ? `${Math.round(row.systematicTrend.volatilityPercentile)}th` : '--'}</strong></div>
        </div>
        <p>Direction and strength come from volatility-adjusted 1M, 3M, 6M and 12M moves. Cleanliness is measured separately using persistence, flips and movement efficiency.</p>
      </section>
    ` : ''}
    <div class="drawer-metrics">
      ${Object.entries(METRIC_LABELS).map(([key, label]) => `
        <div class="drawer-metric"><span>${label} return</span><strong class="${toneFor(row[key])}">${formatPercent(row[key])}</strong></div>
      `).join('')}
    </div>
    <p class="drawer-note">Returns are normalized percentage changes so instruments with different units can be compared. Yield instruments show changes in yield level, while bond ETFs move inversely to yields.</p>
  `;
  elements.drawerBackdrop.hidden = false;
  elements.drawer.classList.add('open');
  elements.drawer.setAttribute('aria-hidden', 'false');
  renderChart();
}

function closeDrawer() {
  state.pinnedSymbol = null;
  elements.drawer.classList.remove('open');
  elements.drawer.setAttribute('aria-hidden', 'true');
  elements.drawerBackdrop.hidden = true;
  renderChart();
}

function renderAll() {
  elements.asOf.textContent = formatDate(state.data.asOf);
  elements.cacheState.textContent = state.data.cacheFresh ? 'Fresh' : 'Fallback cache';
  elements.statusText.textContent = state.data.failures?.length
    ? `${state.data.failures.length} instruments or intervals unavailable`
    : `${state.data.instruments.length} instruments · ${state.data.source}`;
  renderMacroState();
  renderBreadth();
  renderLegend();
  renderRelationships();
  updateReplayUi();
  renderChart();
  renderRankings();
}

async function loadData(refresh = false) {
  stopPlayback();
  elements.refreshButton.disabled = true;
  elements.refreshButton.textContent = 'Loading…';
  try {
    const [response, breadthResult] = await Promise.all([
      fetch(`/api/intermarket${refresh ? '?refresh=true' : ''}`, { cache: 'no-store' }),
      fetch('/api/sector-ad', { cache: 'no-store' })
        .then(async (breadthResponse) => {
          const payload = await breadthResponse.json();
          if (!breadthResponse.ok || !Array.isArray(payload.stocks)) throw new Error(payload.error || `HTTP ${breadthResponse.status}`);
          return payload;
        })
        .catch(() => null),
    ]);
    const payload = await response.json();
    if (!response.ok || payload.success !== true) throw new Error(payload.error || `HTTP ${response.status}`);
    state.data = payload;
    state.breadthData = breadthResult;
    state.mode = 'live';
    state.frames = [];
    state.frameIndex = 0;
    renderAll();
  } catch (error) {
    elements.stateGrid.innerHTML = `<div class="error-card">Macro Radar could not load: ${error.message}</div>`;
    elements.statusText.textContent = 'Data unavailable';
  } finally {
    elements.refreshButton.disabled = false;
    elements.refreshButton.textContent = 'Refresh';
  }
}

elements.metricToggle.addEventListener('click', (event) => {
  const button = event.target.closest('[data-metric]');
  if (!button || state.mode !== 'live') return;
  state.metric = button.dataset.metric;
  elements.metricToggle.querySelectorAll('button').forEach((item) => item.classList.toggle('active', item === button));
  renderChart();
  renderRankings();
  renderBreadth();
  updateReplayUi();
});
elements.rankingToggle.addEventListener('click', (event) => {
  const button = event.target.closest('[data-ranking-mode]');
  if (!button) return;
  state.rankingMode = button.dataset.rankingMode;
  elements.rankingToggle.querySelectorAll('button').forEach((item) => item.classList.toggle('active', item === button));
  renderRankings();
});
elements.replayModes.addEventListener('click', (event) => {
  const button = event.target.closest('[data-mode]');
  if (button && state.data) setMode(button.dataset.mode);
});
elements.playButton.addEventListener('click', togglePlayback);
elements.scrubber.addEventListener('input', () => {
  stopPlayback();
  state.frameIndex = Number(elements.scrubber.value);
  updateReplayUi();
  renderChart();
  renderRankings();
  renderBreadth();
});
elements.refreshButton.addEventListener('click', () => loadData(true));
elements.drawerClose.addEventListener('click', closeDrawer);
elements.drawerBackdrop.addEventListener('click', closeDrawer);
window.addEventListener('resize', () => { if (state.data) renderChart(); });
document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeDrawer(); });

loadData();
