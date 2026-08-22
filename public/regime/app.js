const RANGE_SESSIONS = { '1m': 22, '3m': 66, '6m': 132, '1y': 260 };
const COLORS = {
  goldilocks: '#64d9b1', reflation: '#f1b667', stagflation: '#ff7f96',
  'disinflationary-slowdown': '#8f9db5', 'mixed-transitioning': '#c18cff',
};
const LABELS = {
  goldilocks: 'Goldilocks', reflation: 'Reflation', stagflation: 'Stagflation',
  'disinflationary-slowdown': 'Disinflationary slowdown', 'mixed-transitioning': 'Mixed / transitioning',
};
const state = { data: null, range: '1y', selectedIndex: null };
const elements = {
  asOf: document.getElementById('asOf'), historyCount: document.getElementById('historyCount'),
  currentTitle: document.getElementById('currentTitle'), currentDescription: document.getElementById('currentDescription'),
  currentStats: document.getElementById('currentStats'), rangeToggle: document.getElementById('rangeToggle'),
  quadrant: document.getElementById('quadrant'), detailTitle: document.getElementById('detailTitle'),
  detailMeta: document.getElementById('detailMeta'), detailScores: document.getElementById('detailScores'),
  supportingEvidence: document.getElementById('supportingEvidence'), contradictingEvidence: document.getElementById('contradictingEvidence'),
  timeline: document.getElementById('timeline'), timelineSummary: document.getElementById('timelineSummary'),
  transitionList: document.getElementById('transitionList'), refreshButton: document.getElementById('refreshButton'),
  statusText: document.getElementById('statusText'),
};

function finite(value) { return Number.isFinite(value); }
function signed(value) { return finite(value) ? `${value >= 0 ? '+' : ''}${Math.round(value)}` : '--'; }
function formatDate(value, includeYear = false) {
  const date = new Date(value);
  if (!finite(date.getTime())) return '--';
  return new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric', ...(includeYear ? { year: 'numeric' } : {}) }).format(date);
}
function visibleHistory() { return (state.data?.regimeHistory || []).slice(-RANGE_SESSIONS[state.range]); }
function stat(label, value, detail) { return `<div class="stat"><span>${label}</span><strong>${value}</strong><small>${detail}</small></div>`; }
function pointX(score) { return 50 + ((Math.max(-100, Math.min(100, score || 0)) + 100) / 200) * 700; }
function pointY(score) { return 470 - ((Math.max(-100, Math.min(100, score || 0)) + 100) / 200) * 420; }

function renderCurrent() {
  const regime = state.data.macroRegime;
  const completed = state.data.regimeHistory?.at(-1);
  elements.currentTitle.textContent = regime.label;
  elements.currentDescription.textContent = `${regime.status} · ${regime.confidence} confidence. ${regime.note}`;
  const persistence = completed?.key === regime.key ? `${completed.sessionsInRegime} sessions` : 'Intraday transition';
  elements.currentStats.innerHTML = [
    stat('Growth pulse', signed(regime.growthScore), regime.growthDirection),
    stat('Inflation pressure', signed(regime.inflationScore), regime.inflationDirection),
    stat('Persistence', persistence, completed?.key === regime.key ? `since ${formatDate(completed.transitionTimestamp * 1000)}` : `prior close: ${completed?.label || '--'}`),
    stat('Evidence coverage', `${regime.coveragePercent}%`, `method v${regime.methodologyVersion}`),
  ].join('');
}

function renderQuadrant() {
  const rows = visibleHistory();
  if (!rows.length) return;
  if (state.selectedIndex == null || state.selectedIndex >= rows.length) state.selectedIndex = rows.length - 1;
  const selected = rows[state.selectedIndex];
  const path = rows.map((row) => `${pointX(row.growthScore)},${pointY(row.inflationScore)}`).join(' ');
  const markerStep = ['6m', '1y'].includes(state.range) ? 5 : state.range === '3m' ? 2 : 1;
  const markers = rows.map((row, index) => {
    if (index % markerStep && index !== rows.length - 1 && index !== state.selectedIndex) return '';
    const selectedClass = index === state.selectedIndex ? ' selected' : '';
    return `<circle class="history-point${selectedClass}" data-index="${index}" cx="${pointX(row.growthScore)}" cy="${pointY(row.inflationScore)}" r="${index === state.selectedIndex ? 8 : 4.5}" fill="${COLORS[row.key]}" tabindex="0"><title>${formatDate(row.snapshotAt, true)} · ${row.label}</title></circle>`;
  }).join('');
  elements.quadrant.innerHTML = `
    <rect x="50" y="50" width="350" height="210" fill="rgba(255,127,150,.055)"/><rect x="400" y="50" width="350" height="210" fill="rgba(241,182,103,.055)"/>
    <rect x="50" y="260" width="350" height="210" fill="rgba(143,157,181,.055)"/><rect x="400" y="260" width="350" height="210" fill="rgba(100,217,177,.055)"/>
    <rect x="347.5" y="50" width="105" height="420" fill="rgba(193,140,255,.035)"/><rect x="50" y="228.5" width="700" height="63" fill="rgba(193,140,255,.035)"/>
    <g stroke="rgba(255,255,255,.14)" stroke-width="1"><line x1="400" y1="50" x2="400" y2="470"/><line x1="50" y1="260" x2="750" y2="260"/></g>
    <g class="quadrant-labels" fill="#9aa6b9" font-size="13"><text x="70" y="80">STAGFLATION</text><text x="730" y="80" text-anchor="end">REFLATION</text><text x="70" y="445">DISINFLATIONARY SLOWDOWN</text><text x="730" y="445" text-anchor="end">GOLDILOCKS</text></g>
    <text x="746" y="282" text-anchor="end" fill="#748197" font-size="11">GROWTH PULSE →</text><text x="414" y="67" fill="#748197" font-size="11">INFLATION PRESSURE ↑</text>
    <polyline points="${path}" fill="none" stroke="rgba(233,237,246,.48)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
    ${markers}
    <g transform="translate(${Math.min(650, pointX(selected.growthScore) + 14)} ${Math.max(72, pointY(selected.inflationScore) - 13)})"><rect width="${Math.min(150, selected.label.length * 7 + 24)}" height="28" rx="8" fill="rgba(5,9,15,.9)" stroke="${COLORS[selected.key]}"/><text x="10" y="18" fill="#e9edf6" font-size="11">${selected.label}</text></g>`;
  elements.quadrant.querySelectorAll('[data-index]').forEach((marker) => marker.addEventListener('click', () => {
    state.selectedIndex = Number(marker.dataset.index); renderHistory();
  }));
}

function evidenceHtml(rows, emptyText, supporting) {
  return rows?.length ? rows.map((row) => `<div class="evidence-item"><b>${row.axis}</b><span>${row.label} ${supporting ? 'supports' : 'contradicts'} this axis (${signed(row.score)})</span></div>`).join('') : `<p class="empty">${emptyText}</p>`;
}
function renderDetail() {
  const rows = visibleHistory(); const point = rows[state.selectedIndex]; if (!point) return;
  elements.detailTitle.textContent = point.label;
  elements.detailMeta.textContent = `${formatDate(point.snapshotAt, true)} · ${point.status} · ${point.confidence} confidence · ${point.sessionsInRegime} consecutive session${point.sessionsInRegime === 1 ? '' : 's'}`;
  elements.detailScores.innerHTML = stat('Growth', signed(point.growthScore), point.growthDirection) + stat('Inflation', signed(point.inflationScore), point.inflationDirection);
  elements.supportingEvidence.innerHTML = evidenceHtml(point.supportingEvidence, 'No decisive supporting evidence.', true);
  elements.contradictingEvidence.innerHTML = evidenceHtml(point.contradictingEvidence, 'No material contradictions.', false);
}
function renderTimeline() {
  const rows = visibleHistory(); if (!rows.length) return;
  elements.timeline.innerHTML = rows.map((row, index) => `<button type="button" class="${index === state.selectedIndex ? 'selected' : ''}" data-timeline-index="${index}" style="background:${COLORS[row.key]}" aria-label="${formatDate(row.snapshotAt, true)} ${row.label}"></button>`).join('');
  elements.timeline.querySelectorAll('[data-timeline-index]').forEach((button) => button.addEventListener('click', () => { state.selectedIndex = Number(button.dataset.timelineIndex); renderHistory(); }));
  const transitions = rows.filter((row, index) => index && row.key !== rows[index - 1].key);
  const latest = rows.at(-1);
  elements.timelineSummary.textContent = `${rows.length} completed sessions · ${transitions.length} transition${transitions.length === 1 ? '' : 's'} · current close: ${latest.label}`;
  elements.transitionList.innerHTML = transitions.slice(-6).reverse().map((row) => `<div class="transition"><span>${formatDate(row.snapshotAt, true)}</span><strong style="color:${COLORS[row.key]}">${LABELS[row.key]}</strong></div>`).join('') || '<p class="empty">No regime transitions in this window.</p>';
}
function renderHistory() { renderQuadrant(); renderDetail(); renderTimeline(); }
function renderAll() {
  elements.asOf.textContent = formatDate(state.data.asOf, true);
  elements.historyCount.textContent = `${state.data.regimeHistory.length} sessions`;
  elements.statusText.textContent = `${state.data.regimeHistory.length} completed daily snapshots · ${state.data.source}`;
  renderCurrent(); renderHistory();
}
async function loadData(refresh = false) {
  elements.refreshButton.disabled = true; elements.refreshButton.textContent = 'Loading…';
  try {
    const response = await fetch(`/api/intermarket?includeRegimeHistory=true${refresh ? '&refresh=true' : ''}`, { cache: 'no-store' });
    const payload = await response.json();
    if (!response.ok || payload.success !== true || !Array.isArray(payload.regimeHistory)) throw new Error(payload.error || `HTTP ${response.status}`);
    state.data = payload; state.selectedIndex = null; renderAll();
  } catch (error) {
    elements.currentTitle.textContent = 'Regime history unavailable'; elements.currentDescription.textContent = error.message; elements.statusText.textContent = 'Data unavailable';
  } finally { elements.refreshButton.disabled = false; elements.refreshButton.textContent = 'Refresh'; }
}
elements.rangeToggle.addEventListener('click', (event) => {
  const button = event.target.closest('[data-range]'); if (!button) return;
  state.range = button.dataset.range; state.selectedIndex = null;
  elements.rangeToggle.querySelectorAll('button').forEach((item) => item.classList.toggle('active', item === button)); renderHistory();
});
elements.refreshButton.addEventListener('click', () => loadData(true));
loadData();
