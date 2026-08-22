const elements = {
  refreshButton: document.getElementById('refreshButton'), statusText: document.getElementById('statusText'),
  contextTitle: document.getElementById('contextTitle'), contextGrid: document.getElementById('contextGrid'),
  contextSummary: document.getElementById('contextSummary'), methodology: document.getElementById('methodology'),
  bullishList: document.getElementById('bullishList'), bearishList: document.getElementById('bearishList'),
  bullishCount: document.getElementById('bullishCount'), bearishCount: document.getElementById('bearishCount'),
};

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
  }[character]));
}

function finite(value) { return Number.isFinite(Number(value)); }
function percent(value, digits = 1) {
  return finite(value) ? `${Number(value) >= 0 ? '+' : ''}${Number(value).toFixed(digits)}%` : '--';
}
function price(value) {
  if (!finite(value)) return '--';
  const number = Number(value);
  return number >= 1000 ? number.toLocaleString('en-US', { maximumFractionDigits: 0 }) : number.toFixed(2);
}
function dateTime(value) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '--';
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  }).format(date) + ' ET';
}

async function json(url) {
  const response = await fetch(url, { cache: 'no-store' });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `${url} returned ${response.status}`);
  return payload;
}

function evidencePill(label, confirmation) {
  return `<span class="evidence-pill ${escapeHtml(confirmation.key)}"><small>${escapeHtml(label)}</small><strong>${escapeHtml(confirmation.label)}</strong></span>`;
}

function ideaCard(candidate, index) {
  const side = candidate.side;
  return `
    <article class="idea-card ${side}">
      <div class="idea-topline">
        <span class="rank">${index + 1}</span>
        <div class="identity"><h3>${escapeHtml(candidate.symbol)}</h3><p>${escapeHtml(candidate.security)}</p><small>${escapeHtml(candidate.subIndustry || candidate.sectorName)}</small></div>
        <div class="composite"><small>Evidence score</small><strong>${candidate.score}</strong></div>
      </div>
      <div class="signal-line"><span>${escapeHtml(candidate.signal.label)}</span><strong>${Math.round(candidate.signal.score)}</strong><i>${escapeHtml(candidate.sector.symbol)} · ${escapeHtml(candidate.sectorName)}</i></div>
      <div class="confirmation-row">
        ${evidencePill('Regime', candidate.regime.confirmation)}
        ${evidencePill('Sector', candidate.sector.confirmation)}
        ${evidencePill('Price', candidate.priceConfirmation)}
      </div>
      <dl class="performance-row">
        <div><dt>Price</dt><dd>$${price(candidate.currentPrice)}</dd></div>
        <div><dt>1D</dt><dd class="${Number(candidate.returns.oneDay) >= 0 ? 'up' : 'down'}">${percent(candidate.returns.oneDay)}</dd></div>
        <div><dt>1W</dt><dd class="${Number(candidate.returns.oneWeek) >= 0 ? 'up' : 'down'}">${percent(candidate.returns.oneWeek)}</dd></div>
        <div><dt>1M</dt><dd class="${Number(candidate.returns.oneMonth) >= 0 ? 'up' : 'down'}">${percent(candidate.returns.oneMonth)}</dd></div>
        <div><dt>vs 20D</dt><dd class="${Number(candidate.returns.distance20d) >= 0 ? 'up' : 'down'}">${percent(candidate.returns.distance20d)}</dd></div>
      </dl>
      <div class="explanation"><p><b>Why now</b>${escapeHtml(candidate.explanation.why)}</p><p class="risk"><b>Watch</b>${escapeHtml(candidate.explanation.risk)}</p></div>
      <div class="card-links"><a href="/sp500ad?pin=${encodeURIComponent(candidate.symbol)}">Open ${escapeHtml(candidate.symbol)} on S&amp;P map →</a></div>
    </article>`;
}

function renderList(target, countTarget, candidates, side) {
  countTarget.textContent = `${candidates.length} idea${candidates.length === 1 ? '' : 's'}`;
  target.innerHTML = candidates.length
    ? candidates.map(ideaCard).join('')
    : `<div class="empty-state"><strong>No qualifying ${side} ideas.</strong><p>The playbook will not fill the list with weak or incomplete evidence.</p></div>`;
}

function contextCard(label, value, detail, tone = 'neutral') {
  return `<div class="context-card ${tone}"><small>${escapeHtml(label)}</small><strong>${escapeHtml(value)}</strong><span>${escapeHtml(detail)}</span></div>`;
}

function renderContext(playbook, history) {
  const macro = playbook.macroRegime || {};
  const state = playbook.macroState || {};
  const breadth = history?.marketContexts?.[0]?.context?.breadth;
  const breadthValue = finite(breadth?.percentAdvancing) ? `${Math.round(breadth.percentAdvancing)}% advancing` : 'Unavailable';
  const marketRegime = (history?.regimes || []).find((row) => row.scope_key === 'market');
  const leader = history?.marketContexts?.[0]?.context?.leadingSectors?.[0];
  elements.contextTitle.textContent = `${macro.label || 'Macro regime unavailable'} · ${state.riskTone || state.cards?.find((card) => card.id === 'risk')?.value || 'mixed risk tone'}`;
  elements.contextGrid.innerHTML = [
    contextCard('Macro quadrant', macro.label || 'Unavailable', `${macro.confidence || 'low'} confidence`, 'macro'),
    contextCard('Trading regime', marketRegime?.regime || 'Unavailable', `${marketRegime?.confidence || 'low'} confidence`, 'regime'),
    contextCard('Breadth', breadthValue, breadth?.total ? `${breadth.total} stocks measured` : 'Saved snapshot', 'breadth'),
    contextCard('Sector leader', leader?.sector || 'Unavailable', finite(leader?.changePercent) ? percent(leader.changePercent) : 'Latest saved context', 'leader'),
  ].join('');
  elements.contextSummary.textContent = macro.note || state.summary || '';
}

async function load() {
  elements.refreshButton.disabled = true;
  elements.refreshButton.textContent = 'Loading…';
  elements.statusText.textContent = 'Combining shared signal, index, and intermarket data…';
  try {
    const [history, market, intermarket] = await Promise.all([
      json('/api/signal-history?limit=6'), json('/api/sector-ad'), json('/api/intermarket'),
    ]);
    const playbook = window.PlaybookRanking.buildPlaybook({ history, market, intermarket });
    renderContext(playbook, history);
    renderList(elements.bullishList, elements.bullishCount, playbook.bullish, 'bullish');
    renderList(elements.bearishList, elements.bearishCount, playbook.bearish, 'bearish');
    elements.methodology.textContent = playbook.methodology;
    elements.statusText.textContent = `Signals ${dateTime(playbook.signalSnapshotAt)} · prices ${dateTime(playbook.marketAsOf)} · macro ${dateTime(playbook.macroAsOf)}`;
  } catch (error) {
    elements.contextTitle.textContent = 'Playbook unavailable';
    elements.contextGrid.innerHTML = `<div class="empty-state"><strong>Could not combine the current evidence.</strong><p>${escapeHtml(error.message)}</p></div>`;
    elements.bullishList.innerHTML = elements.bearishList.innerHTML = '<div class="empty-state">No ranking available.</div>';
    elements.statusText.textContent = 'Data unavailable';
  } finally {
    elements.refreshButton.disabled = false;
    elements.refreshButton.textContent = 'Refresh';
  }
}

elements.refreshButton.addEventListener('click', load);
load();
