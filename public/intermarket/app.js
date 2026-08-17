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

const state = {
  data: null,
  metric: 'changePercent',
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
  if (text.includes('risk-on') || text.includes('easing') || text.includes('weaker') || text.includes('bid')) return 'positive';
  if (text.includes('risk-off') || text.includes('rising') || text.includes('stronger') || text.includes('pressure')) return 'negative';
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
    bubble.title = `${row.name}: ${formatPercent(row.displayReturn)}`;
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
    </article>
  `).join('');
}

function rankingMetric() {
  return state.mode === 'live' ? state.metric : 'displayReturn';
}

function renderRankings() {
  const rows = displayRows().filter((row) => finite(row[rankingMetric()]));
  const metric = rankingMetric();
  const leaders = [...rows].sort((left, right) => right[metric] - left[metric]).slice(0, 8);
  const laggards = [...rows].sort((left, right) => left[metric] - right[metric]).slice(0, 8);
  const column = (title, list) => `
    <div class="ranking-column">
      <h3>${title}</h3>
      ${list.map((row, index) => `
        <button class="rank-row" type="button" data-drawer-symbol="${row.symbol}">
          <span class="rank-number">${index + 1}</span>
          <span class="rank-name"><strong>${row.displaySymbol || row.symbol}</strong><span>${row.name}</span></span>
          <strong class="${toneFor(row[metric])}">${formatPercent(row[metric])}</strong>
        </button>
      `).join('')}
    </div>
  `;
  elements.rankingGrid.innerHTML = column('Leaders', leaders) + column('Laggards', laggards);
  elements.rankingLabel.textContent = state.mode === 'live'
    ? `Ranked by ${METRIC_LABELS[state.metric]} return.`
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
    const response = await fetch(`/api/intermarket${refresh ? '?refresh=true' : ''}`, { cache: 'no-store' });
    const payload = await response.json();
    if (!response.ok || payload.success !== true) throw new Error(payload.error || `HTTP ${response.status}`);
    state.data = payload;
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
  updateReplayUi();
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
});
elements.refreshButton.addEventListener('click', () => loadData(true));
elements.drawerClose.addEventListener('click', closeDrawer);
elements.drawerBackdrop.addEventListener('click', closeDrawer);
window.addEventListener('resize', () => { if (state.data) renderChart(); });
document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeDrawer(); });

loadData();
