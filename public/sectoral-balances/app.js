const COLORS = { private: '#57c3ff', government: '#f1a65a', foreign: '#c18cff', household: '#64d9b1', business: '#ef7aa9' };
const RANGE_QUARTERS = { '5y': 20, '10y': 40, '20y': 80, max: Infinity };
const state = { data: null, range: '20y', selectedDate: null };

const elements = {
  latestQuarter: document.getElementById('latestQuarter'), dataSource: document.getElementById('dataSource'),
  snapshotSummary: document.getElementById('snapshotSummary'), snapshotGrid: document.getElementById('snapshotGrid'),
  balanceRead: document.getElementById('balanceRead'), rangeToggle: document.getElementById('rangeToggle'),
  balanceChart: document.getElementById('balanceChart'), privateChart: document.getElementById('privateChart'),
  selectedQuarter: document.getElementById('selectedQuarter'), refreshButton: document.getElementById('refreshButton'),
  downloadButton: document.getElementById('downloadButton'), statusText: document.getElementById('statusText'),
};

function finite(value) { return Number.isFinite(Number(value)); }
function pct(value, digits = 1) { return finite(value) ? `${Number(value) >= 0 ? '+' : ''}${Number(value).toFixed(digits)}%` : '--'; }
function delta(value) { return finite(value) ? `${Number(value) >= 0 ? '+' : ''}${Number(value).toFixed(1)} pp vs year ago` : 'Year comparison unavailable'; }
function tone(value) { return Number(value) > .02 ? 'positive' : Number(value) < -.02 ? 'negative' : ''; }
function svg(tag, attrs = {}) {
  const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
  Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value));
  return node;
}
function append(parent, tag, attrs = {}, text = '') { const node = svg(tag, attrs); node.textContent = text; parent.appendChild(node); return node; }

function visibleRows() {
  const count = RANGE_QUARTERS[state.range];
  return Number.isFinite(count) ? state.data.observations.slice(-count) : state.data.observations;
}

function renderSnapshot() {
  const { latest, yearChanges, fiscalDirection, privateDirection } = state.data.summary;
  elements.latestQuarter.textContent = latest.quarter;
  elements.dataSource.textContent = state.data.cacheFresh ? 'Live FRED / BEA' : 'Cached FRED / BEA';
  elements.snapshotSummary.textContent = `${privateDirection}. ${fiscalDirection}.`;
  const cards = [
    ['Private domestic', latest.privatePct, yearChanges.privatePct],
    ['Government', latest.governmentPct, yearChanges.governmentPct],
    ['Foreign', latest.foreignPct, yearChanges.foreignPct],
    ['Identity residual', latest.identityResidualPct, null],
  ];
  elements.snapshotGrid.innerHTML = cards.map(([label, value, change]) => `<article class="snapshot-card ${tone(value)}"><span>${label}</span><strong>${pct(value)}</strong><small>${change === null ? 'Rounding / statistical discrepancy' : delta(change)}</small></article>`).join('');

  const fiscalRead = yearChanges.governmentPct < -.35
    ? 'The government deficit is wider than a year ago, increasing the flow of financial assets into nongovernment sectors.'
    : yearChanges.governmentPct > .35
      ? 'The government deficit is narrower than a year ago, reducing fiscal support at the margin.'
      : 'The government balance has changed little versus a year ago.';
  const privateRead = latest.privatePct > 0
    ? `The private sector is a net lender by ${pct(latest.privatePct)}, leaving an aggregate financial buffer.`
    : `The private sector is borrowing by ${pct(Math.abs(latest.privatePct))} of GDP, a more leveraged configuration.`;
  const externalRead = latest.foreignPct > 0
    ? `The foreign sector is accumulating ${pct(latest.foreignPct)} of U.S. GDP—the domestic mirror of the current-account deficit.`
    : `The U.S. is running a current-account surplus, making the foreign sector a net borrower from the United States.`;
  elements.balanceRead.innerHTML = [
    ['Fiscal flow', fiscalRead], ['Private buffer', privateRead], ['External balance', externalRead],
  ].map(([title, text]) => `<article class="read-card"><strong>${title}</strong><span>${text}</span></article>`).join('');
}

function yExtent(rows, fields, stacked = false) {
  let max = 1;
  rows.forEach((row) => {
    if (stacked) {
      const values = fields.map((field) => Number(row[field]) || 0);
      max = Math.max(max, values.filter((value) => value > 0).reduce((sum, value) => sum + value, 0));
      max = Math.max(max, Math.abs(values.filter((value) => value < 0).reduce((sum, value) => sum + value, 0)));
    } else fields.forEach((field) => { max = Math.max(max, Math.abs(Number(row[field]) || 0)); });
  });
  return Math.ceil(max / 2) * 2;
}

function drawAxes(chart, dimensions, extent, rows) {
  const { width, height, left, right, top, bottom } = dimensions;
  const plotHeight = height - top - bottom;
  const y = (value) => top + ((extent - value) / (extent * 2)) * plotHeight;
  [-extent, -extent / 2, 0, extent / 2, extent].forEach((tick) => {
    append(chart, 'line', { x1:left, x2:width-right, y1:y(tick), y2:y(tick), class:tick === 0 ? 'chart-zero' : 'chart-grid' });
    append(chart, 'text', { x:left-10, y:y(tick)+4, 'text-anchor':'end', class:'axis-text' }, `${tick.toFixed(0)}%`);
  });
  const labelEvery = Math.max(1, Math.ceil(rows.length / 8));
  rows.forEach((row, index) => {
    if (index % labelEvery !== 0 && index !== rows.length - 1) return;
    append(chart, 'text', { x:left + ((index + .5) / rows.length) * (width-left-right), y:height-15, 'text-anchor':'middle', class:'date-text' }, row.date.slice(0,4));
  });
  return y;
}

function setSelected(date) {
  state.selectedDate = date;
  renderCharts();
}

function renderBalanceChart(rows) {
  const chart = elements.balanceChart;
  chart.replaceChildren();
  const d = { width:1200, height:520, left:72, right:22, top:25, bottom:50 };
  const plotWidth = d.width - d.left - d.right;
  const extent = yExtent(rows, ['privatePct','governmentPct','foreignPct'], true);
  const y = drawAxes(chart, d, extent, rows);
  const columnWidth = plotWidth / rows.length;
  const barWidth = Math.max(1.2, columnWidth * .72);

  rows.forEach((row, index) => {
    const x = d.left + index * columnWidth + (columnWidth - barWidth) / 2;
    let positive = 0;
    let negative = 0;
    ['private','government','foreign'].forEach((key) => {
      const value = Number(row[`${key}Pct`]) || 0;
      const start = value >= 0 ? positive : negative;
      const end = start + value;
      const topY = Math.min(y(start), y(end));
      append(chart, 'rect', { x, y:topY, width:barWidth, height:Math.max(.7,Math.abs(y(end)-y(start))), fill:COLORS[key], opacity:.88, rx:Math.min(2,barWidth/4) });
      if (value >= 0) positive = end; else negative = end;
    });
    if (row.date === state.selectedDate) append(chart, 'line', { x1:x+barWidth/2, x2:x+barWidth/2, y1:d.top, y2:d.height-d.bottom, class:'selected-line' });
    const hit = append(chart, 'rect', { x:d.left+index*columnWidth, y:d.top, width:columnWidth, height:d.height-d.top-d.bottom, class:'quarter-hit', tabindex:'0', 'aria-label':`${row.quarter}: private ${pct(row.privatePct)}, government ${pct(row.governmentPct)}, foreign ${pct(row.foreignPct)}` });
    hit.addEventListener('pointerenter', () => setSelected(row.date));
    hit.addEventListener('click', () => setSelected(row.date));
    hit.addEventListener('focus', () => setSelected(row.date));
  });
}

function linePath(rows, field, x, y) {
  return rows.map((row,index) => `${index ? 'L' : 'M'} ${x(index).toFixed(2)} ${y(row[field]).toFixed(2)}`).join(' ');
}

function renderPrivateChart(rows) {
  const chart = elements.privateChart;
  chart.replaceChildren();
  const d = { width:1200, height:390, left:72, right:22, top:24, bottom:48 };
  const plotWidth = d.width - d.left - d.right;
  const extent = yExtent(rows, ['householdPct','businessPct']);
  const y = drawAxes(chart, d, extent, rows);
  const x = (index) => d.left + ((index + .5) / rows.length) * plotWidth;
  ['household','business'].forEach((key) => append(chart, 'path', { d:linePath(rows,`${key}Pct`,x,y), fill:'none', stroke:COLORS[key], 'stroke-width':'3', 'stroke-linejoin':'round', 'stroke-linecap':'round' }));
  const selectedIndex = rows.findIndex((row) => row.date === state.selectedDate);
  if (selectedIndex >= 0) {
    append(chart, 'line', { x1:x(selectedIndex), x2:x(selectedIndex), y1:d.top, y2:d.height-d.bottom, class:'selected-line' });
    ['household','business'].forEach((key) => append(chart, 'circle', { cx:x(selectedIndex), cy:y(rows[selectedIndex][`${key}Pct`]), r:6, fill:COLORS[key], stroke:'#fff', 'stroke-width':2 }));
  }
}

function renderSelected() {
  const row = state.data.observations.find((item) => item.date === state.selectedDate) || state.data.observations.at(-1);
  const stats = [
    [row.quarter, null], ['Private',row.privatePct], ['Government',row.governmentPct], ['Foreign',row.foreignPct], ['Households',row.householdPct], ['Business',row.businessPct],
  ];
  elements.selectedQuarter.innerHTML = stats.map(([label,value]) => `<div class="quarter-stat ${value === null ? '' : tone(value)}"><span>${value === null ? 'Selected quarter' : label}</span><strong>${value === null ? label : pct(value)}</strong></div>`).join('');
}

function renderCharts() {
  const rows = visibleRows();
  if (!rows.some((row) => row.date === state.selectedDate)) state.selectedDate = rows.at(-1).date;
  renderBalanceChart(rows);
  renderPrivateChart(rows);
  renderSelected();
}

function render() { renderSnapshot(); renderCharts(); }

async function loadData(refresh = false) {
  elements.refreshButton.disabled = true;
  elements.statusText.textContent = refresh ? 'Refreshing FRED data…' : 'Loading FRED data…';
  try {
    const response = await fetch(`/api/sectoral-balances${refresh ? '?refresh=true' : ''}`, { cache:'no-store' });
    const payload = await response.json();
    if (!response.ok || !payload.success) throw new Error(payload.error || `Request failed with ${response.status}`);
    state.data = payload;
    state.selectedDate = payload.latestCompleteQuarter;
    render();
    const warning = payload.failures?.length ? ` · ${payload.failures.length} refresh warning${payload.failures.length === 1 ? '' : 's'}` : '';
    elements.statusText.textContent = `${payload.observations.length} complete quarters · ${payload.source}${warning}`;
  } catch (error) {
    elements.statusText.textContent = `Unable to load balances: ${error.message}`;
  } finally { elements.refreshButton.disabled = false; }
}

function downloadCsv() {
  if (!state.data) return;
  const fields = ['date','privatePct','governmentPct','foreignPct','householdPct','businessPct','identityResidualPct'];
  const text = [fields.join(','), ...state.data.observations.map((row) => fields.map((field) => row[field]).join(','))].join('\n');
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([text], { type:'text/csv' }));
  link.download = `dailyslop-sectoral-balances-${state.data.latestCompleteQuarter}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

elements.rangeToggle.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-range]');
  if (!button || !state.data) return;
  state.range = button.dataset.range;
  elements.rangeToggle.querySelectorAll('button').forEach((item) => item.classList.toggle('active', item === button));
  state.selectedDate = visibleRows().at(-1).date;
  renderCharts();
});
elements.refreshButton.addEventListener('click', () => loadData(true));
elements.downloadButton.addEventListener('click', downloadCsv);
loadData();
