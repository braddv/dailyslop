const defaults = [
  ['VOO', 600000], ['VXUS', 200000], ['XOM', 120000], ['VALE', 5259], ['KMTUY', 5444.07],
  ['CX', 5733], ['PBR', 5681.40], ['TS', 4880.70], ['TIC', 4725], ['ETN', 4482.36],
  ['OBE', 4849], ['DVN', 5327.50], ['DE', 4988.88], ['HAP', 24058.79], ['XLE', 22762.79], ['FCG', 6775.45],
].map(([ticker, marketValue]) => ({ ticker, marketValue }));

let holdings = [];
let state = {};
let fetchedClassByTicker = {};
let classificationWarnings = [];

const manualClass = {
  VOO: { region: 'US', sector: 'Broad US Equity', factor: 'US Beta' },
  VXUS: { region: 'ex-US', sector: 'Broad ex-US Equity', factor: 'International Beta' },
  XLE: { region: 'US', sector: 'Energy', factor: 'Energy/Cyclicals' },
  HAP: { region: 'Global', sector: 'Natural Resources', factor: 'Commodities Tilt' },
  FCG: { region: 'US', sector: 'Energy', factor: 'Energy/Cyclicals' },
  XOM: { region: 'US', sector: 'Energy', factor: 'Energy/Cyclicals' },
};

function ensureClassifications() {
  holdings.forEach((h) => {
    const t = (h.ticker || '').toUpperCase();
    if (!manualClass[t]) {
      manualClass[t] = { region: 'Unknown', sector: 'Unknown', factor: 'Unassigned' };
    }
    if (!manualClass[t].factor) manualClass[t].factor = 'Unassigned';
  });
}

function asFactorBucket(sectorName) {
  const sector = String(sectorName || '').trim();
  if (!sector) return 'Unassigned';
  if (sector === 'Information Technology' || sector === 'Communication Services') return 'Tech/Growth';
  if (sector === 'Energy' || sector === 'Materials' || sector === 'Industrials') return 'Cyclicals/Real Assets';
  if (sector === 'Utilities' || sector === 'Consumer Staples' || sector === 'Health Care') return 'Defensive/Quality';
  if (sector === 'Financials') return 'Financials';
  if (sector === 'Real Estate') return 'Rate Sensitive';
  return sector;
}

function mergeFetchedClassifications() {
  Object.entries(fetchedClassByTicker).forEach(([ticker, cls]) => {
    const existing = manualClass[ticker] || { region: 'Unknown', sector: 'Unknown', factor: 'Unassigned' };
    const merged = { ...existing };
    if (!merged.region || merged.region === 'Unknown') merged.region = cls.region || 'Unknown';
    if (!merged.sector || merged.sector === 'Unknown') merged.sector = cls.sector || 'Unknown';
    if (!merged.factor || merged.factor === 'Unassigned') merged.factor = cls.factor || asFactorBucket(cls.sector);
    manualClass[ticker] = merged;
  });
}

async function loadTickerClassifications(tickers) {
  const targets = (tickers || []).map((t) => String(t || '').toUpperCase().trim()).filter(Boolean);
  const missing = targets.filter((t) => !fetchedClassByTicker[t]);
  if (!missing.length) {
    classificationWarnings = [...new Set(classificationWarnings)];
    mergeFetchedClassifications();
    return;
  }

  try {
    const resp = await fetch(`/api/portfolio-classifications?tickers=${missing.join(',')}`);
    const payload = await resp.json();
    const classifications = payload?.classifications || {};
    const remoteWarnings = Array.isArray(payload?.warnings) ? payload.warnings : [];
    const finnhubConfigured = payload?.diagnostics?.finnhubConfigured;
    classificationWarnings = [...classificationWarnings, ...remoteWarnings];
    if (finnhubConfigured === false) {
      classificationWarnings.push('Ticker classification fallback: Finnhub key not configured (FINNHUB_KEY or FINNHUB_API_KEY).');
    }
    Object.entries(classifications).forEach(([ticker, cls]) => {
      fetchedClassByTicker[ticker] = {
        region: cls.region || 'Unknown',
        sector: cls.sector || 'Unknown',
        factor: cls.factor || asFactorBucket(cls.sector),
      };
    });
    mergeFetchedClassifications();
  } catch {
    // Keep manual-only classifications when lookup fails.
  }
}

function renderHoldings() {
  const t = document.getElementById('holdingsTable');
  t.innerHTML = '<tr><th>Ticker/Label</th><th>Type</th><th>Underlying (options)</th><th>Delta (options)</th><th>Expiration (options)</th><th>Market Value</th><th>Delete</th></tr>' + holdings.map((h, i) => {
    const kind = h.kind || 'equity';
    const isOption = kind === 'option';
    const underlying = h.underlying || '';
    const delta = Number.isFinite(Number(h.delta)) ? Number(h.delta) : 1;
    const expiration = h.expiration || '';
    return `<tr>
      <td><input data-i="${i}" data-k="ticker" value="${h.ticker || ''}"></td>
      <td>
        <select data-i="${i}" data-k="kind">
          <option value="equity" ${kind === 'equity' ? 'selected' : ''}>equity/ETF</option>
          <option value="option" ${kind === 'option' ? 'selected' : ''}>option</option>
        </select>
      </td>
      <td><input data-i="${i}" data-k="underlying" value="${underlying}" ${isOption ? '' : 'disabled'} placeholder="e.g. XLE"></td>
      <td><input data-i="${i}" data-k="delta" type="number" step="0.01" min="-1" max="1" value="${delta}" ${isOption ? '' : 'disabled'}></td>
      <td><input data-i="${i}" data-k="expiration" type="date" value="${expiration}" ${isOption ? '' : 'disabled'}></td>
      <td><input data-i="${i}" data-k="marketValue" type="number" step="0.01" value="${h.marketValue}"></td>
      <td><button data-del="${i}">X</button></td>
    </tr>`;
  }).join('');
  ensureClassifications();
  renderClassificationTable();
}

function renderClassificationTable() {
  const t = document.getElementById('classificationTable');
  const rows = holdings.map((h) => {
    const ticker = (h.ticker || '').toUpperCase();
    const cls = manualClass[ticker] || { region: 'Unknown', sector: 'Unknown', factor: 'Unassigned' };
    return { ticker, cls };
  });

  t.innerHTML = '<tr><th>Ticker</th><th>Region</th><th>Sector</th><th>Factor bucket</th></tr>' + rows.map((r) =>
    `<tr>
      <td>${r.ticker || '-'}</td>
      <td><input data-class-ticker="${r.ticker}" data-class-k="region" value="${r.cls.region || ''}"></td>
      <td><input data-class-ticker="${r.ticker}" data-class-k="sector" value="${r.cls.sector || ''}"></td>
      <td><input data-class-ticker="${r.ticker}" data-class-k="factor" value="${r.cls.factor || ''}"></td>
    </tr>`
  ).join('');
}

function parseCsv(text) {
  const rows = text.trim().split(/\r?\n/).map((r) => r.split(',').map((x) => x.trim()));
  const head = rows[0].map((h) => h.toLowerCase());
  const ti = head.indexOf('ticker');
  const mvi = head.indexOf('market_value');
  const si = head.indexOf('shares');
  const pi = head.indexOf('price');
  const ki = head.indexOf('kind');
  const ui = head.indexOf('underlying');
  const di = head.indexOf('delta');
  const ei = head.indexOf('expiration');
  return rows.slice(1).map((r) => {
    const ticker = r[ti]?.toUpperCase();
    const marketValue = mvi >= 0 ? Number(r[mvi]) : Number(r[si]) * Number(r[pi] || 0);
    const kind = (r[ki] || 'equity').toLowerCase() === 'option' ? 'option' : 'equity';
    const underlying = (r[ui] || '').toUpperCase();
    const delta = Number(r[di]);
    const expiration = (r[ei] || '').trim();
    return {
      ticker,
      marketValue,
      expiration,
      kind,
      underlying,
      delta: Number.isFinite(delta) ? delta : 1,
      expiration,
    };
  }).filter((x) => x.ticker && Number.isFinite(x.marketValue) && x.marketValue > 0);
}

function simpleReturns(series) {
  const ret = [];
  for (let i = 1; i < series.length; i++) ret.push({ date: series[i].date, r: series[i].close / series[i - 1].close - 1 });
  return ret;
}

function mean(a) { return a.reduce((x, y) => x + y, 0) / a.length; }
function stdev(a) { const m = mean(a); return Math.sqrt(mean(a.map((x) => (x - m) ** 2))); }
function percentileNeg(a) { const neg = a.filter((x) => x < 0); return neg.length ? stdev(neg) : 0; }
function fmt(x) { return Number.isFinite(x) ? (x * 100).toFixed(2) + '%' : 'n/a'; }

function portfolioReturns(prices, weights) {
  const byDate = {};
  Object.entries(prices).forEach(([t, s]) => {
    const ret = simpleReturns(s);
    ret.forEach((r) => { if (!byDate[r.date]) byDate[r.date] = {}; byDate[r.date][t] = r.r; });
  });
  const tickers = Object.keys(weights);
  const dates = Object.keys(byDate).sort();
  const missingThreshold = Math.max(1, Math.floor(tickers.length * 0.3));
  const pr = [];
  dates.forEach((d) => {
    const row = byDate[d];
    const missing = tickers.filter((t) => row[t] == null).length;
    if (missing > missingThreshold) return;
    let r = 0;
    tickers.forEach((t) => { r += (row[t] || 0) * weights[t]; });
    pr.push({ date: d, r, row });
  });
  return pr;
}

function statsFromReturns(ret, rf = 0) {
  const rs = ret.map((x) => x.r);
  const avg = mean(rs);
  const vol = stdev(rs) * Math.sqrt(252);
  const cum = rs.reduce((a, r) => a * (1 + r), 1) - 1;
  const sharpe = vol ? ((avg - rf / 252) * 252) / vol : NaN;
  const sortinoDen = percentileNeg(rs) * Math.sqrt(252);
  const sortino = sortinoDen ? ((avg - rf / 252) * 252) / sortinoDen : NaN;
  let peak = 1; let path = 1; let mdd = 0;
  rs.forEach((r) => { path *= (1 + r); peak = Math.max(peak, path); mdd = Math.min(mdd, path / peak - 1); });
  return { cum, vol, sharpe, sortino, mdd };
}

function corr(x, y) {
  const mx = mean(x); const my = mean(y);
  const cov = mean(x.map((v, i) => (v - mx) * (y[i] - my)));
  return cov / (stdev(x) * stdev(y));
}

function corrMatrix(portRet, tickers, window) {
  const sliced = portRet.slice(-window);
  const data = {};
  tickers.forEach((t) => { data[t] = sliced.map((r) => r.row[t] || 0); });
  const m = {};
  tickers.forEach((a) => { m[a] = {}; tickers.forEach((b) => { m[a][b] = corr(data[a], data[b]); }); });
  return m;
}

function matrixToTable(m) {
  const tickers = Object.keys(m);
  return `<table class="heat"><tr><th></th>${tickers.map((t) => `<th>${t}</th>`).join('')}</tr>${tickers.map((a) =>
    `<tr><th>${a}</th>${tickers.map((b) => {
      const v = m[a][b];
      const color = Number.isFinite(v) ? `hsl(${(1 - (v + 1) / 2) * 240},70%,85%)` : '#eee';
      return `<td style="background:${color}">${Number.isFinite(v) ? v.toFixed(2) : 'n/a'}</td>`;
    }).join('')}</tr>`).join('')}</table>`;
}

function topPairs(m) {
  const t = Object.keys(m); const out = [];
  for (let i = 0; i < t.length; i++) for (let j = i + 1; j < t.length; j++) out.push({ pair: `${t[i]}-${t[j]}`, v: m[t[i]][t[j]] });
  out.sort((a, b) => Math.abs(b.v) - Math.abs(a.v));
  return out.slice(0, 10);
}

function invert(mat) {
  const n = mat.length;
  const a = mat.map((r, i) => [...r, ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))]);
  for (let i = 0; i < n; i++) {
    let p = i;
    for (let r = i + 1; r < n; r++) if (Math.abs(a[r][i]) > Math.abs(a[p][i])) p = r;
    [a[i], a[p]] = [a[p], a[i]];
    const div = a[i][i]; if (!div) throw new Error('Singular matrix');
    for (let c = 0; c < 2 * n; c++) a[i][c] /= div;
    for (let r = 0; r < n; r++) if (r !== i) {
      const f = a[r][i];
      for (let c = 0; c < 2 * n; c++) a[r][c] -= f * a[i][c];
    }
  }
  return a.map((r) => r.slice(n));
}

function ols(y, x, colNames) {
  const n = y.length; const k = x[0].length;
  const xtx = Array.from({ length: k }, () => Array(k).fill(0));
  const xty = Array(k).fill(0);
  for (let i = 0; i < n; i++) {
    for (let a = 0; a < k; a++) {
      xty[a] += x[i][a] * y[i];
      for (let b = 0; b < k; b++) xtx[a][b] += x[i][a] * x[i][b];
    }
  }
  const inv = invert(xtx);
  const beta = inv.map((row) => row.reduce((s, v, i) => s + v * xty[i], 0));
  const yhat = x.map((r) => r.reduce((s, v, i) => s + v * beta[i], 0));
  const resid = y.map((v, i) => v - yhat[i]);
  const sse = resid.reduce((s, v) => s + v * v, 0);
  const sst = y.reduce((s, v) => s + (v - mean(y)) ** 2, 0);
  const r2 = 1 - sse / sst;
  const sigma2 = sse / (n - k);
  const se = inv.map((row, i) => Math.sqrt(Math.abs(row[i] * sigma2)));
  const t = beta.map((b, i) => b / se[i]);
  return { beta, se, t, r2, alphaAnnual: (Math.pow(1 + beta[0], 252) - 1), names: colNames };
}

function aggregateBy(items, keyName, total) {
  const out = {};
  items.forEach((item) => {
    const k = item[keyName] || 'Unknown';
    out[k] = (out[k] || 0) + item.marketValue / total;
  });
  return out;
}

function asWeightTable(mapObj, keyHeader) {
  const rows = Object.entries(mapObj).sort((a, b) => b[1] - a[1]);
  return `<table><tr><th>${keyHeader}</th><th>Weight</th></tr>${rows.map(([k, v]) => `<tr><td>${k}</td><td>${fmt(v)}</td></tr>`).join('')}</table>`;
}

function normalizeHoldings(rawHoldings) {
  return rawHoldings.map((h) => {
    const kind = (h.kind || 'equity') === 'option' ? 'option' : 'equity';
    const ticker = String(h.ticker || '').toUpperCase().trim();
    const underlying = String(h.underlying || '').toUpperCase().trim();
    const marketValue = Number(h.marketValue);
    const expiration = String(h.expiration || '').trim();
    const rawDelta = Number(h.delta);
    const delta = Number.isFinite(rawDelta) ? Math.max(-1, Math.min(1, rawDelta)) : 1;
    const effectiveTicker = kind === 'option' ? (underlying || ticker) : ticker;
    const exposureValue = kind === 'option' ? marketValue * delta : marketValue;
    return {
      ...h,
      ticker,
      underlying,
      kind,
      delta,
      marketValue,
      effectiveTicker,
      exposureValue,
    };
  }).filter((h) => h.effectiveTicker && Number.isFinite(h.marketValue) && h.marketValue > 0 && Number.isFinite(h.exposureValue));
}

function aggregateExposureWeights(clean) {
  const byTicker = {};
  clean.forEach((h) => {
    byTicker[h.effectiveTicker] = (byTicker[h.effectiveTicker] || 0) + h.exposureValue;
  });
  const gross = Object.values(byTicker).reduce((s, v) => s + Math.abs(v), 0);
  const weights = {};
  Object.entries(byTicker).forEach(([t, v]) => {
    weights[t] = gross ? (v / gross) : 0;
  });
  return { weights, tickers: Object.keys(weights), grossExposure: gross };
}

async function run() {
  document.getElementById('warnings').textContent = '';
  classificationWarnings = [];
  ensureClassifications();

  const clean = normalizeHoldings(holdings);
  await loadTickerClassifications(clean.map((h) => h.effectiveTicker));
  renderClassificationTable();
  const total = clean.reduce((s, h) => s + h.marketValue, 0);
  const { weights, tickers, grossExposure } = aggregateExposureWeights(clean);

  const priceResp = await fetch(`/api/portfolio-prices?tickers=${tickers.join(',')}`);
  const { prices, warnings } = await priceResp.json();
  const portRet = portfolioReturns(prices, weights);
  const stat = statsFromReturns(portRet);
  state = { prices, weights, portRet, tickers, clean, total };

  document.getElementById('stats').innerHTML = `Cumulative: ${fmt(stat.cum)}<br>Vol (ann): ${fmt(stat.vol)}<br>Max Drawdown: ${fmt(stat.mdd)}<br>Sharpe: ${stat.sharpe.toFixed(2)}<br>Sortino: ${stat.sortino.toFixed(2)}`;

  const hhi = clean.reduce((s, h) => s + (h.marketValue / total) ** 2, 0);
  const top5 = [...clean].sort((a, b) => b.marketValue - a.marketValue).slice(0, 5).reduce((s, h) => s + h.marketValue, 0) / total;
  document.getElementById('risk').innerHTML = `Top 5 weight: ${fmt(top5)}<br>HHI: ${hhi.toFixed(3)}<br>Gross delta-adjusted exposure: $${grossExposure.toFixed(0)}<br>${[...clean].sort((a, b) => b.marketValue - a.marketValue).slice(0, 5).map((h) => `${h.ticker}: ${fmt(h.marketValue / total)}`).join('<br>')}`;

  const classRows = clean.map((h) => {
    const cls = manualClass[h.effectiveTicker] || { region: 'Unknown', sector: 'Unknown', factor: 'Unassigned' };
    return { ...h, ticker: h.effectiveTicker, region: cls.region || 'Unknown', sector: cls.sector || 'Unknown', factor: cls.factor || 'Unassigned' };
  });

  const bySector = aggregateBy(classRows, 'sector', total);
  const byRegion = aggregateBy(classRows, 'region', total);
  const byFactor = aggregateBy(classRows, 'factor', total);

  document.getElementById('sectorDiversity').innerHTML = `${asWeightTable(bySector, 'Sector')}<div class="small">Sector HHI: ${Object.values(bySector).reduce((s, w) => s + w * w, 0).toFixed(3)}</div>`;
  document.getElementById('factorDiversity').innerHTML = `${asWeightTable(byFactor, 'Factor bucket')}<div class="small">Factor-bucket HHI: ${Object.values(byFactor).reduce((s, w) => s + w * w, 0).toFixed(3)}</div>`;

  const c1 = corrMatrix(portRet, tickers, 21); const c3 = corrMatrix(portRet, tickers, 63); const c6 = corrMatrix(portRet, tickers, 126);
  state.corr = { c1, c3, c6 };
  state.groups = { bySector, byRegion, byFactor };
  document.getElementById('corr').innerHTML = `<h4>1 month</h4>${matrixToTable(c1)}<h4>3 months</h4>${matrixToTable(c3)}<h4>6 months</h4>${matrixToTable(c6)}<h4>Top pairs (6m)</h4><table><tr><th>Pair</th><th>Corr</th></tr>${topPairs(c6).map((p) => `<tr><td>${p.pair}</td><td>${p.v.toFixed(2)}</td></tr>`).join('')}</table>`;

  const rolling = [30, 90, 180].map((w) => {
    const rows = tickers.map((t) => {
      const pr = portRet.slice(-w).map((r) => r.r);
      const ar = portRet.slice(-w).map((r) => r.row[t] || 0);
      return { t, c: corr(pr, ar) };
    }).sort((a, b) => a.c - b.c);
    return `<h4>${w}d</h4><div>Diversifiers: ${rows.slice(0, 3).map((x) => `${x.t} (${x.c.toFixed(2)})`).join(', ')}</div><table><tr><th>Ticker</th><th>Corr vs Portfolio</th></tr>${rows.map((r) => `<tr><td>${r.t}</td><td>${r.c.toFixed(2)}</td></tr>`).join('')}</table>`;
  }).join('');
  document.getElementById('rolling').innerHTML = rolling;

  const oilShock = -0.2 * ((weights.XLE || 0) + (weights.XOM || 0));
  const equityShock = -0.1 * (weights.VOO || 0.6);
  document.getElementById('notThinking').innerHTML = `
    <b>Sector proxy weights</b><br>${Object.entries(bySector).map(([k, v]) => `${k}: ${fmt(v)}`).join('<br>')}<br><br>
    <b>Region proxy weights</b><br>${Object.entries(byRegion).map(([k, v]) => `${k}: ${fmt(v)}`).join('<br>')}<br><br>
    <b>Factor-bucket weights</b><br>${Object.entries(byFactor).map(([k, v]) => `${k}: ${fmt(v)}`).join('<br>')}<br><br>
    <b>Scenario shocks (rough)</b><br>Oil -20% day proxy impact: ${fmt(oilShock)}<br>Equity -10% proxy impact: ${fmt(equityShock)}
  `;

  const structureWarnings = [
    ...clean.filter((h) => h.kind === 'option' && !h.underlying).map((h) => `${h.ticker}: option missing underlying (using ticker as proxy)`),
    ...clean.filter((h) => h.kind === 'option' && !h.expiration).map((h) => `${h.ticker}: option missing expiration date`),
  ];
  const allWarnings = [...(warnings || []), ...classificationWarnings, ...structureWarnings];
  if (allWarnings.length) document.getElementById('warnings').textContent = [...new Set(allWarnings)].join(' | ');
  await runFactors();

  const htmlBlob = new Blob([`<html><body><h1>Portfolio Report Snapshot</h1>${document.body.innerHTML}</body></html>`], { type: 'text/html' });
  document.getElementById('reportLink').href = URL.createObjectURL(htmlBlob);
}

async function runFactors() {
  if (!state.portRet) return;
  const window = Number(document.getElementById('factorWindow').value);
  const includeAssets = document.getElementById('assetFactors').checked;
  const factorResp = await fetch('/api/factors');
  const factorData = await factorResp.json();
  if (factorData.error) {
    document.getElementById('factors').textContent = `Factor load failed: ${factorData.error}`;
    return;
  }

  const facMap = new Map(factorData.factors.map((f) => [f.date, f]));
  const modelCols = factorData.hasMomentum ? ['alpha', 'Mkt-RF', 'SMB', 'HML', 'RMW', 'CMA', 'MOM'] : ['alpha', 'Mkt-RF', 'SMB', 'HML', 'RMW', 'CMA'];
  const rows = [];

  function doReg(name, retSeries) {
    const joint = retSeries.slice(-window).map((r) => ({ r: r.r, f: facMap.get(r.date) })).filter((x) => x.f);
    const y = joint.map((x) => x.r - x.f.RF);
    const x = joint.map((xj) => modelCols.map((c, i) => (i === 0 ? 1 : (xj.f[c] ?? 0))));
    if (x.length < modelCols.length + 5) return null;
    const reg = ols(y, x, modelCols);
    return { name, reg };
  }

  const p = doReg('Portfolio', state.portRet);
  if (p) rows.push(p);
  if (includeAssets) {
    state.tickers.forEach((t) => {
      const ret = simpleReturns(state.prices[t]).map((r) => ({ date: r.date, r: r.r }));
      const rr = doReg(t, ret);
      if (rr) rows.push(rr);
    });
  }

  state.factorRows = rows;
  const table = `<div>Model: ${factorData.hasMomentum ? 'FF5 + MOM' : 'FF5 only (momentum unavailable)'}</div><table><tr><th>Name</th>${modelCols.map((c) => `<th>${c} β</th><th>${c} t</th>`).join('')}<th>R²</th><th>Annualized α</th></tr>${rows.map((r) => `<tr><td>${r.name}</td>${r.reg.beta.map((b, i) => `<td>${b.toFixed(3)}</td><td>${r.reg.t[i].toFixed(2)}</td>`).join('')}<td>${r.reg.r2.toFixed(2)}</td><td>${fmt(r.reg.alphaAnnual)}</td></tr>`).join('')}</table>`;
  document.getElementById('factors').innerHTML = table;
}

function download(name, content) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([content], { type: 'text/csv' }));
  a.download = name;
  a.click();
}

function matrixCsv(m) {
  const t = Object.keys(m);
  return [',' + t.join(','), ...t.map((r) => [r, ...t.map((c) => m[r][c])].join(','))].join('\n');
}

function mapToCsv(mapObj, header) {
  return [
    `${header},weight_percent`,
    ...Object.entries(mapObj).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k},${(v * 100).toFixed(4)}`),
  ].join('\n');
}

document.getElementById('loadDefault').onclick = () => { holdings = JSON.parse(JSON.stringify(defaults)); renderHoldings(); };
document.getElementById('addRow').onclick = () => { holdings.push({ ticker: '', marketValue: 0, kind: 'equity', underlying: '', delta: 1, expiration: '' }); renderHoldings(); };
document.getElementById('run').onclick = run;
document.getElementById('rerunFactors').onclick = runFactors;
document.getElementById('exportCorr').onclick = () => download('correlation_6m.csv', matrixCsv(state.corr.c6));
document.getElementById('exportFactors').onclick = () => {
  const rows = state.factorRows || [];
  const header = 'name,coef,tstat,r2,alpha_annual';
  const csv = [header, ...rows.map((r) => `${r.name},"${r.reg.beta.map((x) => x.toFixed(4)).join('|')}","${r.reg.t.map((x) => x.toFixed(2)).join('|')}",${r.reg.r2.toFixed(3)},${r.reg.alphaAnnual.toFixed(4)}`)].join('\n');
  download('factor_summary.csv', csv);
};
document.getElementById('exportGroups').onclick = () => {
  if (!state.groups) return;
  const csv = [
    '# Sector groups',
    mapToCsv(state.groups.bySector, 'sector'),
    '',
    '# Region groups',
    mapToCsv(state.groups.byRegion, 'region'),
    '',
    '# Factor bucket groups',
    mapToCsv(state.groups.byFactor, 'factor_bucket'),
  ].join('\n');
  download('sector_factor_groups.csv', csv);
};

document.getElementById('holdingsTable').addEventListener('input', (e) => {
  const i = Number(e.target.dataset.i); const k = e.target.dataset.k;
  if (Number.isInteger(i) && k) holdings[i][k] = (k === 'marketValue' || k === 'delta') ? Number(e.target.value) : e.target.value;
  ensureClassifications();
  renderClassificationTable();
});
document.getElementById('holdingsTable').addEventListener('change', (e) => {
  const i = Number(e.target.dataset.i); const k = e.target.dataset.k;
  if (!Number.isInteger(i) || !k) return;
  holdings[i][k] = (k === 'marketValue' || k === 'delta') ? Number(e.target.value) : e.target.value;
  if (k === 'kind') renderHoldings();
});
document.getElementById('holdingsTable').addEventListener('click', (e) => {
  const i = Number(e.target.dataset.del);
  if (Number.isInteger(i)) { holdings.splice(i, 1); renderHoldings(); }
});
document.getElementById('classificationTable').addEventListener('input', (e) => {
  const ticker = (e.target.dataset.classTicker || '').toUpperCase();
  const k = e.target.dataset.classK;
  if (!ticker || !k) return;
  if (!manualClass[ticker]) manualClass[ticker] = { region: 'Unknown', sector: 'Unknown', factor: 'Unassigned' };
  manualClass[ticker][k] = e.target.value || (k === 'factor' ? 'Unassigned' : 'Unknown');
});
document.getElementById('csvFile').addEventListener('change', async (e) => {
  const file = e.target.files[0]; if (!file) return;
  holdings = parseCsv(await file.text()); renderHoldings();
});

holdings = JSON.parse(JSON.stringify(defaults));
loadTickerClassifications(holdings.map((h) => h.ticker)).then(() => renderHoldings());
renderHoldings();
