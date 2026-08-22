const RANGE_SESSIONS = { '1m': 22, '3m': 66, '6m': 132, '1y': 260 };
const COLORS = {
  goldilocks: '#64d9b1', reflation: '#f1b667', stagflation: '#ff7f96',
  'disinflationary-slowdown': '#8f9db5', 'mixed-transitioning': '#c18cff',
};
const LABELS = {
  goldilocks: 'Goldilocks', reflation: 'Reflation', stagflation: 'Stagflation',
  'disinflationary-slowdown': 'Disinflationary slowdown', 'mixed-transitioning': 'Mixed / transitioning',
};
const state = {
  data: null, range: '1y', selectedIndex: null, animationTimer: null, animationGeneration: 0,
  trajectoryRows: [], trajectoryIndex: 0, trajectoryPlaying: true, trajectorySpeed: 700,
  showTrajectoryPoint: null, scheduleTrajectory: null,
};
const elements = {
  asOf: document.getElementById('asOf'), historyCount: document.getElementById('historyCount'),
  currentTitle: document.getElementById('currentTitle'), currentDescription: document.getElementById('currentDescription'),
  currentStats: document.getElementById('currentStats'), rangeToggle: document.getElementById('rangeToggle'),
  quadrant: document.getElementById('quadrant'), trajectoryReadout: document.getElementById('trajectoryReadout'),
  trajectoryTransport: document.getElementById('trajectoryTransport'), trajectoryPlay: document.getElementById('trajectoryPlay'),
  trajectoryScrubber: document.getElementById('trajectoryScrubber'), trajectorySpeed: document.getElementById('trajectorySpeed'),
  detailTitle: document.getElementById('detailTitle'),
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

function clearTrajectoryTimer() {
  if (state.animationTimer) clearTimeout(state.animationTimer);
  state.animationTimer = null;
}

function updateTrajectoryControls() {
  const hasReplay = state.trajectoryRows.length > 1;
  elements.trajectoryTransport.classList.toggle('is-disabled', !hasReplay);
  elements.trajectoryPlay.disabled = !hasReplay;
  elements.trajectoryPlay.innerHTML = state.trajectoryPlaying
    ? '<span aria-hidden="true">Ⅱ</span><span>Pause</span>'
    : '<span aria-hidden="true">▶</span><span>Play</span>';
  elements.trajectoryPlay.setAttribute('aria-label', `${state.trajectoryPlaying ? 'Pause' : 'Play'} regime trajectory`);
  elements.trajectoryPlay.setAttribute('aria-pressed', String(!state.trajectoryPlaying));
  elements.trajectoryScrubber.max = Math.max(0, state.trajectoryRows.length - 1);
  elements.trajectoryScrubber.value = state.trajectoryIndex;
}

function pauseTrajectory() {
  state.trajectoryPlaying = false;
  clearTrajectoryTimer();
  updateTrajectoryControls();
}

function playTrajectory() {
  if (state.trajectoryRows.length < 2 || !state.showTrajectoryPoint || !state.scheduleTrajectory) return;
  if (state.trajectoryIndex >= state.trajectoryRows.length - 1) state.showTrajectoryPoint(0);
  state.trajectoryPlaying = true;
  updateTrajectoryControls();
  state.scheduleTrajectory(state.trajectorySpeed);
}

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
  clearTrajectoryTimer();
  state.animationGeneration += 1;
  const animationGeneration = state.animationGeneration;
  const rows = visibleHistory();
  if (!rows.length) return;
  if (state.selectedIndex == null || state.selectedIndex >= rows.length) state.selectedIndex = rows.length - 1;
  const sampleStep = ['6m', '1y'].includes(state.range) ? 5 : state.range === '3m' ? 2 : 1;
  const pathRows = rows.map((row, index) => ({ row, index }))
    .filter(({ index }) => index % sampleStep === 0 || index === rows.length - 1);
  state.trajectoryRows = pathRows;
  const segments = pathRows.slice(1).map(({ row }, segmentIndex) => {
    const previous = pathRows[segmentIndex].row;
    return `<line data-trajectory-segment="${segmentIndex}" x1="${pointX(previous.growthScore)}" y1="${pointY(previous.inflationScore)}" x2="${pointX(row.growthScore)}" y2="${pointY(row.inflationScore)}" stroke="#e9edf6" stroke-width="1.4" stroke-linecap="round" opacity=".08"/>`;
  }).join('');
  const firstPoint = pathRows[0].row;
  elements.trajectoryReadout.innerHTML = `
    <div class="playback-status"><span class="playback-dot"></span><div><small>Trajectory replay</small><strong data-playback-date>${formatDate(firstPoint.snapshotAt, true)}</strong></div></div>
    <div class="playback-value"><small>Regime</small><strong data-playback-regime>${firstPoint.label}</strong></div>
    <div class="playback-value"><small>Growth / inflation</small><strong data-playback-scores>${signed(firstPoint.growthScore)} / ${signed(firstPoint.inflationScore)}</strong></div>
    <p data-playback-mode>Playing</p>
    <div class="playback-progress"><i data-playback-progress></i></div>`;
  elements.quadrant.innerHTML = `
    <rect x="50" y="50" width="350" height="210" fill="rgba(255,127,150,.055)"/><rect x="400" y="50" width="350" height="210" fill="rgba(241,182,103,.055)"/>
    <rect x="50" y="260" width="350" height="210" fill="rgba(143,157,181,.055)"/><rect x="400" y="260" width="350" height="210" fill="rgba(100,217,177,.055)"/>
    <rect x="347.5" y="50" width="105" height="420" fill="rgba(193,140,255,.035)"/><rect x="50" y="228.5" width="700" height="63" fill="rgba(193,140,255,.035)"/>
    <g stroke="rgba(255,255,255,.14)" stroke-width="1"><line x1="400" y1="50" x2="400" y2="470"/><line x1="50" y1="260" x2="750" y2="260"/></g>
    <g class="quadrant-labels" fill="#9aa6b9" font-size="13"><text x="70" y="80">STAGFLATION</text><text x="730" y="80" text-anchor="end">REFLATION</text><text x="70" y="445">DISINFLATIONARY SLOWDOWN</text><text x="730" y="445" text-anchor="end">GOLDILOCKS</text></g>
    <text x="746" y="282" text-anchor="end" fill="#748197" font-size="11">GROWTH PULSE →</text><text x="414" y="67" fill="#748197" font-size="11">INFLATION PRESSURE ↑</text>
    <g class="trajectory-segments">${segments}</g>
    <circle class="trajectory-cursor-halo" cx="${pointX(firstPoint.growthScore)}" cy="${pointY(firstPoint.inflationScore)}" r="14" fill="${COLORS[firstPoint.key]}" opacity=".18"/>
    <circle class="trajectory-cursor" cx="${pointX(firstPoint.growthScore)}" cy="${pointY(firstPoint.inflationScore)}" r="7" fill="${COLORS[firstPoint.key]}" stroke="#fff" stroke-width="2.5"/>`;

  const dateReadout = elements.trajectoryReadout.querySelector('[data-playback-date]');
  const regimeReadout = elements.trajectoryReadout.querySelector('[data-playback-regime]');
  const scoresReadout = elements.trajectoryReadout.querySelector('[data-playback-scores]');
  const progressReadout = elements.trajectoryReadout.querySelector('[data-playback-progress]');
  const modeReadout = elements.trajectoryReadout.querySelector('[data-playback-mode]');
  const playbackDot = elements.trajectoryReadout.querySelector('.playback-dot');
  const segmentElements = [...elements.quadrant.querySelectorAll('[data-trajectory-segment]')];
  const cursor = elements.quadrant.querySelector('.trajectory-cursor');
  const halo = elements.quadrant.querySelector('.trajectory-cursor-halo');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const showPoint = (pathIndex) => {
    if (animationGeneration !== state.animationGeneration) return;
    const safeIndex = Math.max(0, Math.min(pathRows.length - 1, pathIndex));
    const pointEntry = pathRows[safeIndex];
    const point = pointEntry.row;
    state.trajectoryIndex = safeIndex;
    state.selectedIndex = pointEntry.index;
    const progress = pathRows.length <= 1 ? 1 : safeIndex / (pathRows.length - 1);
    cursor.setAttribute('cx', pointX(point.growthScore)); cursor.setAttribute('cy', pointY(point.inflationScore)); cursor.setAttribute('fill', COLORS[point.key]);
    halo.setAttribute('cx', pointX(point.growthScore)); halo.setAttribute('cy', pointY(point.inflationScore)); halo.setAttribute('fill', COLORS[point.key]);
    dateReadout.textContent = formatDate(point.snapshotAt, true);
    regimeReadout.textContent = point.label;
    scoresReadout.textContent = `${signed(point.growthScore)} / ${signed(point.inflationScore)}`;
    progressReadout.style.width = `${Math.max(2, progress * 100)}%`;
    modeReadout.textContent = state.trajectoryPlaying ? 'Playing' : 'Paused';
    playbackDot.classList.toggle('paused', !state.trajectoryPlaying);
    segmentElements.forEach((segment, index) => {
      const complete = index < safeIndex;
      segment.setAttribute('opacity', complete ? String(0.28 + (index / Math.max(1, segmentElements.length - 1)) * 0.62) : '.06');
      segment.setAttribute('stroke-width', complete ? '2.8' : '1.2');
    });
    const scroller = elements.quadrant.closest('.quadrant-wrap');
    if (scroller && scroller.scrollWidth > scroller.clientWidth) {
      const cursorPixel = (pointX(point.growthScore) / 800) * elements.quadrant.clientWidth;
      scroller.scrollTo({ left: Math.max(0, Math.min(scroller.scrollWidth - scroller.clientWidth, cursorPixel - scroller.clientWidth / 2)), behavior: 'smooth' });
    }
    updateTrajectoryControls();
    renderDetail();
    elements.timeline.querySelectorAll('[data-timeline-index]').forEach((button) => {
      button.classList.toggle('selected', Number(button.dataset.timelineIndex) === state.selectedIndex);
    });
  };
  const schedulePoint = (delay = state.trajectorySpeed) => {
    clearTrajectoryTimer();
    if (!state.trajectoryPlaying || reducedMotion) return;
    state.animationTimer = setTimeout(() => {
      if (animationGeneration !== state.animationGeneration || !state.trajectoryPlaying) return;
      const atEnd = state.trajectoryIndex >= pathRows.length - 1;
      showPoint(atEnd ? 0 : state.trajectoryIndex + 1);
      schedulePoint(state.trajectoryIndex >= pathRows.length - 1 ? 1600 : state.trajectorySpeed);
    }, delay);
  };
  state.showTrajectoryPoint = showPoint;
  state.scheduleTrajectory = schedulePoint;
  state.trajectoryPlaying = !reducedMotion;
  showPoint(reducedMotion ? pathRows.length - 1 : 0);
  schedulePoint(state.trajectorySpeed);
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
  elements.timeline.querySelectorAll('[data-timeline-index]').forEach((button) => button.addEventListener('click', () => { state.selectedIndex = Number(button.dataset.timelineIndex); renderDetail(); renderTimeline(); }));
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
elements.trajectoryPlay.addEventListener('click', () => {
  if (state.trajectoryPlaying) pauseTrajectory(); else playTrajectory();
  state.showTrajectoryPoint?.(state.trajectoryIndex);
});
elements.trajectoryScrubber.addEventListener('input', () => {
  pauseTrajectory();
  state.showTrajectoryPoint?.(Number(elements.trajectoryScrubber.value));
});
let trajectoryScrubPointer = null;
const scrubTrajectoryAt = (clientX) => {
  const bounds = elements.trajectoryScrubber.getBoundingClientRect();
  const maximum = Number(elements.trajectoryScrubber.max);
  if (!bounds.width || !maximum) return;
  const progress = Math.max(0, Math.min(1, (clientX - bounds.left) / bounds.width));
  pauseTrajectory();
  elements.trajectoryScrubber.value = String(Math.round(progress * maximum));
  state.showTrajectoryPoint?.(Number(elements.trajectoryScrubber.value));
};
elements.trajectoryScrubber.addEventListener('pointerdown', (event) => {
  trajectoryScrubPointer = event.pointerId;
  elements.trajectoryScrubber.setPointerCapture?.(event.pointerId);
  scrubTrajectoryAt(event.clientX);
  event.preventDefault();
});
elements.trajectoryScrubber.addEventListener('pointermove', (event) => {
  if (event.pointerId !== trajectoryScrubPointer) return;
  scrubTrajectoryAt(event.clientX);
  event.preventDefault();
});
const finishTrajectoryScrub = (event) => {
  if (event.pointerId !== trajectoryScrubPointer) return;
  scrubTrajectoryAt(event.clientX);
  elements.trajectoryScrubber.releasePointerCapture?.(event.pointerId);
  trajectoryScrubPointer = null;
};
elements.trajectoryScrubber.addEventListener('pointerup', finishTrajectoryScrub);
elements.trajectoryScrubber.addEventListener('pointercancel', (event) => {
  if (event.pointerId === trajectoryScrubPointer) trajectoryScrubPointer = null;
});
elements.trajectorySpeed.addEventListener('change', () => {
  state.trajectorySpeed = Number(elements.trajectorySpeed.value);
  if (state.trajectoryPlaying) state.scheduleTrajectory?.(state.trajectorySpeed);
});
loadData();
