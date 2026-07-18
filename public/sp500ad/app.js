const chartEl = document.getElementById("chart");
const yAxisEl = document.getElementById("yAxis");
const asOfEl = document.getElementById("asOf");
const cacheEl = document.getElementById("cache");
const notesEl = document.getElementById("notes");
const refreshBtn = document.getElementById("refresh");
const tooltipEl = document.getElementById("tooltip");
const capToggle = document.getElementById("capToggle");
const metricToggle = document.getElementById("metricToggle");
const metricSubhead = document.getElementById("metricSubhead");
const backBtn = document.getElementById("backBtn");
const filterButtons = document.querySelectorAll(".filter-btn");
const controlsEl = document.querySelector(".controls");
const tickerSearchForm = document.getElementById("tickerSearch");
const tickerSearchInput = document.getElementById("tickerSearchInput");
const tickerOptions = document.getElementById("tickerOptions");
const tickerSearchStatus = document.getElementById("tickerSearchStatus");
const replayPlayBtn = document.getElementById("replayPlay");
const replayPlayIcon = document.getElementById("replayPlayIcon");
const replayPlayLabel = document.getElementById("replayPlayLabel");
const replayScrubber = document.getElementById("replayScrubber");
const replaySpeed = document.getElementById("replaySpeed");
const replayTimestamp = document.getElementById("replayTimestamp");
const replayStatus = document.getElementById("replayStatus");
const replayTransport = document.getElementById("replayTransport");
const liveModeBtn = document.getElementById("liveModeBtn");
const replay1dModeBtn = document.getElementById("replay1dModeBtn");
const replay2dModeBtn = document.getElementById("replay2dModeBtn");
const replay1wModeBtn = document.getElementById("replay1wModeBtn");
const replay2wModeBtn = document.getElementById("replay2wModeBtn");
const replayModeBtn = document.getElementById("replayModeBtn");
const replay2mModeBtn = document.getElementById("replay2mModeBtn");
const replay3mModeBtn = document.getElementById("replay3mModeBtn");
const replay6mModeBtn = document.getElementById("replay6mModeBtn");
const backLiveBtn = document.getElementById("backLiveBtn");

let lastStocks = [];
let lastBenchmarks = [];
let selectedMetric = "changePercent";
let viewMode = "sector"; // sector | subindustry
let selectedSector = null;
const pinnedSymbols = new Set();
let activeFilter = "all";
let replayFrames = [];
let replayFrameIndex = 0;
let replayTimer = null;
let replayActive = false;
let replayValueRange = null;
let chartProjection = null;
let replayPeriod = "1m";

const REPLAY_PERIODS = {
  "1d": { field: "replayDay15m", label: "1-day", cadence: "15-minute", sessions: 1 },
  "2d": { field: "replayDay15m", label: "2-day", cadence: "15-minute" },
  "1w": { field: "replayWeekHourly", label: "1-week", cadence: "hourly", sessions: 5 },
  "2w": { field: "replayWeekHourly", label: "2-week", cadence: "hourly", sessions: 10 },
  "1m": { field: "replayDaily", days: 31, label: "1-month", cadence: "daily" },
  "2m": { field: "replayDaily", days: 62, label: "2-month", cadence: "daily" },
  "3m": { field: "replayDaily", days: 93, label: "3-month", cadence: "daily" },
  "6m": { field: "replayDaily", days: 186, label: "6-month", cadence: "daily" },
};

const METRICS = {
  changePercent: {
    label: "1D",
    subhead: "Daily percent change by stock, grouped by sector.",
  },
  perf1w: {
    label: "1W",
    subhead: "1-week performance by stock, grouped by sector.",
  },
  perf1m: {
    label: "1M",
    subhead: "1-month performance by stock, grouped by sector.",
  },
  perf3m: {
    label: "3M",
    subhead: "3-month performance by stock, grouped by sector.",
  },
  pctFrom12wHigh: {
    label: "12W High",
    subhead: "% from 12-week high by stock, grouped by sector.",
  },
  pctFrom52wHigh: {
    label: "52W High",
    subhead: "% from 52-week high by stock, grouped by sector.",
  },
};

const SECTORS = [
  { gics: "Materials", label: "XLB" },
  { gics: "Communication Services", label: "XLC" },
  { gics: "Information Technology", label: "XLK" },
  { gics: "Consumer Discretionary", label: "XLY" },
  { gics: "Consumer Staples", label: "XLP" },
  { gics: "Energy", label: "XLE" },
  { gics: "Financials", label: "XLF" },
  { gics: "Health Care", label: "XLV" },
  { gics: "Industrials", label: "XLI" },
  { gics: "Real Estate", label: "XLRE" },
  { gics: "Utilities", label: "XLU" },
];

const SECTOR_COLORS = {
  "Materials": "#f7b267",
  "Communication Services": "#f79d65",
  "Information Technology": "#5c7cfa",
  "Consumer Discretionary": "#8bc34a",
  "Consumer Staples": "#7ed957",
  "Energy": "#4dd0e1",
  "Financials": "#64b5f6",
  "Health Care": "#81d4fa",
  "Industrials": "#9575cd",
  "Real Estate": "#b39ddb",
  "Utilities": "#ce93d8",
};

const DOW_SYMBOLS = new Set([
  "AAPL", "AMGN", "AMZN", "AXP", "BA", "CAT", "CRM", "CSCO", "CVX", "DIS",
  "DOW", "GS", "HD", "HON", "IBM", "INTC", "JNJ", "JPM", "KO", "MCD",
  "MMM", "MRK", "MSFT", "NKE", "PG", "TRV", "UNH", "V", "VZ", "WMT"
]);

const XMAG_EXCLUDES = new Set([
  "GOOG", "GOOGL", "META", "MSFT", "AMZN", "TSLA", "AAPL", "NVDA"
]);

function formatDate(value) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleString();
}

function niceRange(min, max) {
  if (min === max) return { min: min - 1, max: max + 1 };
  const padding = (max - min) * 0.15;
  return { min: min - padding, max: max + padding };
}

function symLog(value, constant = 5) {
  const sign = Math.sign(value);
  const magnitude = Math.log1p(Math.abs(value) / constant);
  return sign * magnitude;
}

function buildTicks(min, max) {
  const base = [0, 0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500, 1000];
  const ticks = new Set();
  base.forEach((t) => {
    if (t >= min && t <= max) ticks.add(t);
    if (-t >= min && -t <= max) ticks.add(-t);
  });

  return Array.from(ticks).sort((a, b) => b - a);
}

function filterTicksBySpacing(ticks, height, padding, minLog, maxLog) {
  const innerHeight = height - padding.top - padding.bottom;
  const positioned = ticks.map((value) => ({
    value,
    y:
      padding.top +
      ((maxLog - symLog(value)) / (maxLog - minLog)) * innerHeight,
  }));
  const prioritized = [...positioned].sort((a, b) => {
    if (a.value === 0) return -1;
    if (b.value === 0) return 1;
    return Math.abs(symLog(b.value)) - Math.abs(symLog(a.value));
  });
  const selected = [];
  prioritized.forEach((candidate) => {
    if (selected.every((tick) => Math.abs(tick.y - candidate.y) >= 30)) {
      selected.push(candidate);
    }
  });
  return selected.map((tick) => tick.value).sort((a, b) => b - a);
}

function radiusScale(
  cap,
  minCap,
  maxCap,
  scaleFactor = 1,
  minRadius = 3,
  maxRadius = 14
) {
  if (!Number.isFinite(cap) || !Number.isFinite(minCap) || !Number.isFinite(maxCap)) {
    return 4.0 * scaleFactor;
  }
  const minR = minRadius * scaleFactor;
  const maxR = maxRadius * scaleFactor;
  if (maxCap === minCap) return (minR + maxR) / 2;
  const t =
    (Math.sqrt(cap) - Math.sqrt(minCap)) /
    (Math.sqrt(maxCap) - Math.sqrt(minCap));
  return minR + t * (maxR - minR);
}

function hashString(value) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function jitterForSymbol(symbol, width) {
  const seed = hashString(symbol);
  const rand = (seed % 1000) / 1000;
  return (rand - 0.5) * width * 0.9;
}

function verticalJitter(symbol) {
  const seed = hashString(`${symbol}-y`);
  const rand = (seed % 1000) / 1000;
  return (rand - 0.5) * 8;
}

function buildYAxis(ticks, height, padding, minLog, maxLog) {
  yAxisEl.innerHTML = "";
  yAxisEl.style.height = `${height}px`;
  ticks.forEach((value) => {
    const y =
      padding.top +
      ((maxLog - symLog(value)) / (maxLog - minLog)) *
        (height - padding.top - padding.bottom);
    const label = document.createElement("div");
    label.className = "y-tick";
    label.textContent = `${value.toFixed(1)}%`;
    label.style.top = `${y}px`;
    yAxisEl.appendChild(label);
  });
}

function formatPerf(value) {
  if (!Number.isFinite(value)) return "--";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

function showTooltip(event, html) {
  tooltipEl.innerHTML = html;
  tooltipEl.classList.add("visible");
  const pad = 16;
  const x = Math.min(window.innerWidth - 220, event.clientX + pad);
  const y = Math.max(16, event.clientY - pad * 2);
  tooltipEl.style.left = `${x}px`;
  tooltipEl.style.top = `${y}px`;
}

function hideTooltip() {
  tooltipEl.classList.remove("visible");
}

function formatLabel(text) {
  if (!text) return "";
  if (text.length <= 12) return text;
  return `${text.slice(0, 10)}…`;
}

function splitLabel(text) {
  if (!text) return ["", ""];
  if (text.length <= 14) return [text, ""];
  const parts = text.split(" ");
  if (parts.length === 1) return [formatLabel(text), ""];
  let line1 = "";
  let line2 = "";
  parts.forEach((part) => {
    const candidate = line1 ? `${line1} ${part}` : part;
    if (candidate.length <= 14) {
      line1 = candidate;
    } else if (!line2) {
      line2 = part;
    } else {
      line2 = `${line2} ${part}`;
    }
  });
  return [line1 || formatLabel(text), line2 ? formatLabel(line2) : ""];
}
function updateSubhead() {
  if (!metricSubhead) return;
  let base = METRICS[selectedMetric]?.subhead || "";
  if (activeFilter === "top50") {
    base = `${base} (Top 50 market cap)`;
  } else if (activeFilter === "dow") {
    base = `${base} (Dow Jones)`;
  } else if (activeFilter === "sectors") {
    base = `${base} (Sector ETFs and SPY)`;
  }
  if (viewMode === "subindustry" && selectedSector) {
    base = `${base} (${selectedSector} sub-industries)`;
  }
  metricSubhead.textContent = base;
}

function applyFilter(stocks) {
  const cleaned = stocks.filter((s) => s.symbol !== "GOOGL");
  if (activeFilter === "top50") {
    return [...cleaned]
      .filter((s) => Number.isFinite(s.marketCap))
      .sort((a, b) => b.marketCap - a.marketCap)
      .slice(0, 50);
  }
  if (activeFilter === "top250") {
    return [...cleaned]
      .filter((s) => Number.isFinite(s.marketCap))
      .sort((a, b) => b.marketCap - a.marketCap)
      .slice(0, 250);
  }
  if (activeFilter === "bottom250") {
    return [...cleaned]
      .filter((s) => Number.isFinite(s.marketCap))
      .sort((a, b) => a.marketCap - b.marketCap)
      .slice(0, 250);
  }
  if (activeFilter === "xmag") {
    return cleaned.filter((s) => !XMAG_EXCLUDES.has(s.symbol));
  }
  if (activeFilter === "mag7") {
    return cleaned.filter((s) => XMAG_EXCLUDES.has(s.symbol));
  }
  if (activeFilter === "dow") {
    return cleaned.filter((s) => DOW_SYMBOLS.has(s.symbol));
  }
  return cleaned;
}

function buildSectorViewStocks() {
  const sectorCaps = new Map();
  let totalCap = 0;
  lastStocks.forEach((stock) => {
    if (!Number.isFinite(stock.marketCap) || stock.marketCap <= 0) return;
    sectorCaps.set(stock.sector, (sectorCaps.get(stock.sector) || 0) + stock.marketCap);
    totalCap += stock.marketCap;
  });
  const maxSectorCap = Math.max(0, ...sectorCaps.values());
  return lastBenchmarks.map((benchmark) => {
    const isSpy = benchmark.symbol === "SPY";
    const sectorCap = sectorCaps.get(benchmark.sector) || 0;
    const weight = isSpy ? 100 : totalCap > 0 ? (sectorCap / totalCap) * 100 : null;
    return {
      ...benchmark,
      isBenchmark: true,
      marketCap: isSpy ? maxSectorCap * 1.15 : sectorCap,
      sp500Weight: weight,
      __replayValue: replayActive
        ? getReplayValue(benchmark, replayFrames[replayFrameIndex])
        : undefined,
    };
  });
}

function getGroups(stocks) {
  if (activeFilter === "sectors") {
    return {
      groups: [
        { key: "S&P 500", label: "SPY" },
        ...SECTORS.map((sector) => ({ key: sector.gics, label: sector.label })),
      ],
      keyFn: (stock) => stock.sector,
      interactive: true,
    };
  }
  if (viewMode === "sector") {
    return {
      groups: [
        { key: "S&P 500", label: "SPY" },
        ...SECTORS.map((sector) => ({ key: sector.gics, label: sector.label })),
      ],
      keyFn: (stock) => stock.sector,
      interactive: true,
    };
  }

  const filtered = stocks.filter(
    (stock) =>
      !stock.isBenchmark &&
      stock.sector === selectedSector &&
      stock.subIndustry
  );
  const subIndustries = Array.from(new Set(filtered.map((s) => s.subIndustry))).sort();
  const sectorEtf = SECTORS.find((sector) => sector.gics === selectedSector)?.label || "ETF";
  return {
    groups: [
      { key: "__benchmark__", label: sectorEtf },
      ...subIndustries.map((name) => ({ key: name, label: name })),
    ],
    keyFn: (stock) => stock.isBenchmark ? "__benchmark__" : stock.subIndustry,
    interactive: false,
  };
}

function buildChart(stocks) {
  chartEl.innerHTML = "";

  const width = chartEl.clientWidth;
  const height = chartEl.clientHeight;
  const padding = { top: 20, right: 20, bottom: 70, left: 10 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  let working = activeFilter === "sectors"
    ? buildSectorViewStocks()
    : applyFilter(stocks);
  if (activeFilter !== "sectors") {
    const benchmarks = buildSectorViewStocks();
    const benchmark = viewMode === "sector"
      ? benchmarks.find((stock) => stock.symbol === "SPY")
      : benchmarks.find((stock) => stock.sector === selectedSector);
    if (benchmark) working = [...working, benchmark];
  }
  if (viewMode === "subindustry" && selectedSector) {
    working = working.filter((stock) => stock.sector === selectedSector);
  }

  const valueField = replayActive ? "__replayValue" : selectedMetric;
  const filtered = working.filter((stock) => Number.isFinite(stock[valueField]));
  if (!filtered.length) {
    chartEl.innerHTML = "<div class=\"notes\">No stock data to render.</div>";
    return;
  }

  const minChange = Math.min(...filtered.map((s) => s[valueField]));
  const maxChange = Math.max(...filtered.map((s) => s[valueField]));
  const range = replayActive && replayValueRange
    ? replayValueRange
    : niceRange(minChange, maxChange);
  const minLog = symLog(range.min);
  const maxLog = symLog(range.max);
  chartProjection = { padding, innerHeight, minLog, maxLog };
  const ticks = filterTicksBySpacing(
    buildTicks(range.min, range.max),
    height,
    padding,
    minLog,
    maxLog
  );

  buildYAxis(ticks, height, padding, minLog, maxLog);

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);

  ticks.forEach((value) => {
    const y =
      padding.top +
      ((maxLog - symLog(value)) / (maxLog - minLog)) * innerHeight;
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", padding.left);
    line.setAttribute("x2", width - padding.right);
    line.setAttribute("y1", y);
    line.setAttribute("y2", y);
    line.setAttribute("class", value === 0 ? "grid-line zero" : "grid-line");
    svg.appendChild(line);
  });

  const { groups, keyFn, interactive } = getGroups(filtered);
  const sectorWidth = innerWidth / Math.max(groups.length, 1);

  // Sector dividers
  for (let i = 0; i <= groups.length; i += 1) {
    const x = padding.left + sectorWidth * i;
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", x);
    line.setAttribute("x2", x);
    line.setAttribute("y1", padding.top);
    line.setAttribute("y2", height - padding.bottom);
    line.setAttribute("class", "grid-line");
    svg.appendChild(line);
  }

  // Labels
  groups.forEach((group, index) => {
    const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
    const x = padding.left + sectorWidth * index + sectorWidth / 2;
    label.setAttribute("x", x);
    label.setAttribute("y", height - 24);
    label.setAttribute("class", interactive ? "sector-label interactive" : "sector-label");
    const fullLabel = group.label || group.key;
    const [line1, line2] = splitLabel(fullLabel);
    const tspan1 = document.createElementNS("http://www.w3.org/2000/svg", "tspan");
    tspan1.setAttribute("x", x);
    tspan1.setAttribute("dy", "0");
    tspan1.textContent = line1;
    label.appendChild(tspan1);
    if (line2) {
      const tspan2 = document.createElementNS("http://www.w3.org/2000/svg", "tspan");
      tspan2.setAttribute("x", x);
      tspan2.setAttribute("dy", "12");
      tspan2.textContent = line2;
      label.appendChild(tspan2);
    }
    if (group.label && group.label.length > 12) {
      const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
      title.textContent = group.label;
      label.appendChild(title);
    }
    if (interactive) {
      label.addEventListener("click", () => {
        if (group.key === "S&P 500") return;
        if (activeFilter === "sectors") {
          activeFilter = "all";
          filterButtons.forEach((button) => {
            button.classList.toggle("active", button.dataset.filter === "all");
          });
        }
        viewMode = "subindustry";
        selectedSector = group.key;
        if (backBtn) backBtn.classList.add("visible");
        updateSubhead();
        if (replayActive) {
          calculateReplayRange();
          updateReplaySubhead();
        }
        renderCurrentChart();
      });
    }
    svg.appendChild(label);
  });

  if (
    activeFilter !== "sectors" &&
    (selectedMetric === "pctFrom52wHigh" || selectedMetric === "pctFrom12wHigh")
  ) {
    const field = selectedMetric;
    groups.forEach((group, index) => {
      const groupStocks = filtered.filter((stock) => keyFn(stock) === group.key);
      if (!groupStocks.length) return;
      const atHigh = groupStocks.filter(
        (stock) => Number.isFinite(stock[field]) && stock[field] >= -1
      ).length;
      const pct = Math.round((atHigh / groupStocks.length) * 100);
      const stat = document.createElementNS("http://www.w3.org/2000/svg", "text");
      const x = padding.left + sectorWidth * index + sectorWidth / 2;
      stat.setAttribute("x", x);
      stat.setAttribute("y", padding.top + 14);
      stat.setAttribute("class", "sector-stat");
      stat.textContent = `${pct}%`;
      svg.appendChild(stat);
    });
  }

  const useMarketCap = capToggle && capToggle.checked;
  const scaleFactor = activeFilter === "bottom250" ? 0.5 : 1;
  const caps = filtered
    .filter((stock) => !stock.isBenchmark || activeFilter === "sectors")
    .map((s) => s.marketCap)
    .filter((value) => Number.isFinite(value) && value > 0);
  const minCap = caps.length ? Math.min(...caps) : null;
  const maxCap = caps.length ? Math.max(...caps) : null;

  const pinnedLabels = [];

  // Stock dots
  filtered.forEach((stock) => {
    const groupKey = keyFn(stock);
    const sectorIndex = groups.findIndex((group) => group.key === groupKey);
    if (sectorIndex === -1) return;

    const jitter = activeFilter === "sectors" || stock.isBenchmark
      ? 0
      : jitterForSymbol(stock.symbol, sectorWidth);
    const x =
      padding.left + sectorWidth * sectorIndex + sectorWidth / 2 + jitter;
    const y =
      padding.top +
      ((maxLog - symLog(stock[valueField])) / (maxLog - minLog)) *
        innerHeight +
      verticalJitter(stock.symbol);

    const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    dot.setAttribute("cx", x);
    dot.setAttribute("cy", y);
    const radius = stock.isBenchmark && activeFilter !== "sectors"
      ? 16
      : useMarketCap
      ? activeFilter === "sectors"
        ? radiusScale(stock.marketCap, minCap, maxCap, 1, 8, 22)
        : radiusScale(stock.marketCap, minCap, maxCap, scaleFactor)
      : activeFilter === "sectors" ? 10 : 3.0;

    dot.setAttribute("r", radius);
    dot.setAttribute("fill", SECTOR_COLORS[stock.sector] || "#7aa5ff");
    dot.setAttribute("class", "dot");
    if (stock.isBenchmark) dot.classList.add("spy-benchmark");
    dot.dataset.symbol = stock.symbol;

    const tooltipLabel = () => {
      const replayLine = replayActive
        ? `<div>${REPLAY_PERIODS[replayPeriod].label} replay ${formatPerf(getReplayValue(stock, replayFrames[replayFrameIndex]))}</div>`
        : "";
      const weightLine = Number.isFinite(stock.sp500Weight)
        ? `<div>${stock.symbol === "SPY" ? "Benchmark" : "S&P 500 weight"} ${stock.symbol === "SPY" ? "100%" : `${stock.sp500Weight.toFixed(1)}%`}</div>`
        : "";
      return `
        <div><strong>${stock.symbol}</strong> • ${stock.security}</div>
        <div>Sector ${stock.sector}${stock.subIndustry ? ` • ${stock.subIndustry}` : ""}</div>
        ${replayLine}
        ${weightLine}
        <div>1W ${formatPerf(stock.perf1w)} · 1M ${formatPerf(stock.perf1m)} · 3M ${formatPerf(stock.perf3m)}</div>
        <div>From 12W High ${formatPerf(stock.pctFrom12wHigh)}</div>
        <div>From 52W High ${formatPerf(stock.pctFrom52wHigh)}</div>
        <div>Today ${formatPerf(stock.changePercent)}</div>
      `;
    };
    dot.addEventListener("mouseenter", (event) => {
      showTooltip(event, tooltipLabel());
    });
    dot.addEventListener("mousemove", (event) => {
      showTooltip(event, tooltipLabel());
    });
    dot.addEventListener("mouseleave", hideTooltip);
    dot.addEventListener("click", (event) => {
      event.stopPropagation();
      if (pinnedSymbols.has(stock.symbol)) {
        pinnedSymbols.delete(stock.symbol);
      } else {
        pinnedSymbols.add(stock.symbol);
      }
      renderCurrentChart();
    });

    svg.appendChild(dot);

    if (pinnedSymbols.has(stock.symbol)) {
      const metricValue = stock[valueField];
      const metricLabel = Number.isFinite(metricValue) ? `${metricValue.toFixed(2)}%` : "--";
      const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      text.setAttribute("x", x + 8);
      text.setAttribute("y", y - 8);
      text.setAttribute("class", "pinned-label");
      text.dataset.symbol = stock.symbol;
      text.textContent = `${stock.symbol} ${metricLabel}`;
      pinnedLabels.push(text);
    }
  });

  pinnedLabels.forEach((label) => svg.appendChild(label));
  chartEl.appendChild(svg);
}


async function readApiJson(res) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    const preview = text.slice(0, 120).replace(/\s+/g, ' ').trim();
    throw new Error(`API returned non-JSON response${preview ? `: ${preview}` : ''}`);
  }
}

function setMetric(metric) {
  if (!METRICS[metric]) return;
  if (replayActive) return;
  stopReplay();
  selectedMetric = metric;
  updateSubhead();
  if (metricToggle) {
    metricToggle.querySelectorAll(".toggle-btn").forEach((button) => {
      button.classList.toggle("active", button.dataset.metric === metric);
    });
  }
  buildChart(lastStocks);
}

function getReplayValue(stock, timestamp) {
  const points = getReplayPoints(stock);
  if (!Array.isArray(points) || !points.length || !Number.isFinite(timestamp)) return null;
  let price = null;
  for (let i = points.length - 1; i >= 0; i -= 1) {
    if (points[i][0] <= timestamp) {
      price = points[i][1];
      break;
    }
  }
  const base = points[0] && points[0][1];
  if (!Number.isFinite(price) || !Number.isFinite(base) || base === 0) return null;
  return ((price / base) - 1) * 100;
}

function getReplayPoints(stock) {
  const config = REPLAY_PERIODS[replayPeriod];
  const points = stock[config.field];
  if (!Array.isArray(points) || !points.length) return [];
  if (config.sessions) {
    const sessionStarts = [0];
    for (let i = 1; i < points.length; i += 1) {
      if (points[i][0] - points[i - 1][0] > 6 * 60 * 60) {
        sessionStarts.push(i);
      }
    }
    const startIndex = sessionStarts[
      Math.max(0, sessionStarts.length - config.sessions)
    ];
    return points.slice(startIndex);
  }
  if (!config.days) return points;
  const windowDays = config.days;
  const latestTimestamp = points[points.length - 1]?.[0];
  if (!Number.isFinite(latestTimestamp)) return [];
  const cutoff = latestTimestamp - windowDays * 86400;
  return points.filter((point) => Number.isFinite(point?.[0]) && point[0] >= cutoff);
}

function replayStocksAt(index) {
  const timestamp = replayFrames[index];
  return lastStocks.map((stock) => ({
    ...stock,
    __replayValue: getReplayValue(stock, timestamp),
  }));
}

function renderCurrentChart() {
  buildChart(replayActive ? replayStocksAt(replayFrameIndex) : lastStocks);
}

function populateTickerSearch() {
  tickerOptions.innerHTML = "";
  [...lastStocks, ...lastBenchmarks]
    .sort((a, b) => a.symbol.localeCompare(b.symbol))
    .forEach((stock) => {
      const option = document.createElement("option");
      option.value = stock.symbol;
      option.label = `${stock.symbol} — ${stock.security || stock.symbol}`;
      tickerOptions.appendChild(option);
    });
}

function pinSearchedTicker() {
  const query = tickerSearchInput.value.trim();
  if (!query) {
    tickerSearchStatus.textContent = "Enter a ticker symbol.";
    return;
  }
  const universe = [...lastStocks, ...lastBenchmarks];
  const tickerQuery = query.split(/\s+|—/)[0].toUpperCase();
  const exactMatch =
    universe.find((stock) => stock.symbol.toUpperCase() === tickerQuery) ||
    universe.find((stock) => stock.security?.toLowerCase() === query.toLowerCase());
  const tickerMatches = universe.filter((stock) =>
    stock.symbol.toUpperCase().startsWith(tickerQuery)
  );
  const match = exactMatch || (tickerMatches.length === 1 ? tickerMatches[0] : null);
  if (!match) {
    tickerSearchStatus.textContent = tickerMatches.length > 1
      ? `${tickerMatches.length} tickers match “${query}”. Choose one from the list.`
      : `No S&P 500 ticker found for “${query}”.`;
    return;
  }

  const isBenchmark = lastBenchmarks.some((stock) => stock.symbol === match.symbol);
  const stayInSubindustry = viewMode === "subindustry" && match.symbol !== "SPY";
  activeFilter = stayInSubindustry
    ? "all"
    : isBenchmark && match.symbol !== "SPY"
      ? "sectors"
      : "all";
  if (stayInSubindustry) {
    viewMode = "subindustry";
    selectedSector = match.sector;
    if (backBtn) backBtn.classList.add("visible");
  } else {
    viewMode = "sector";
    selectedSector = null;
    if (backBtn) backBtn.classList.remove("visible");
  }
  filterButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.filter === activeFilter);
  });
  pinnedSymbols.add(match.symbol);
  tickerSearchInput.value = match.symbol;
  tickerSearchStatus.textContent = `Pinned ${match.symbol}.`;
  updateSubhead();
  if (replayActive) {
    calculateReplayRange();
    updateReplaySubhead();
  }
  renderCurrentChart();
}

function buildReplayTimeline() {
  const timestamps = new Set();
  lastStocks.forEach((stock) => {
    getReplayPoints(stock).forEach((point) => {
      if (Number.isFinite(point?.[0])) timestamps.add(point[0]);
    });
  });
  replayFrames = Array.from(timestamps).sort((a, b) => a - b);
  replayFrameIndex = Math.max(0, replayFrames.length - 1);
  replayScrubber.max = String(Math.max(0, replayFrames.length - 1));
  replayScrubber.value = String(replayFrameIndex);
  replayPlayBtn.disabled = replayFrames.length < 2;
  replayScrubber.disabled = replayFrames.length < 2;
  replayTimestamp.textContent = "Live snapshot";
  replayStatus.textContent = replayFrames.length
    ? "Live market view"
    : "Replay data unavailable";
  setReplayUi(false);
}

function calculateReplayRange() {
  let candidates = activeFilter === "sectors"
    ? buildSectorViewStocks()
    : applyFilter(lastStocks);
  if (activeFilter !== "sectors") {
    const benchmarks = buildSectorViewStocks();
    const benchmark = viewMode === "sector"
      ? benchmarks.find((stock) => stock.symbol === "SPY")
      : benchmarks.find((stock) => stock.sector === selectedSector);
    if (benchmark) candidates = [...candidates, benchmark];
  }
  if (viewMode === "subindustry" && selectedSector) {
    candidates = candidates.filter((stock) => stock.sector === selectedSector);
  }
  const values = [];
  replayFrames.forEach((timestamp) => {
    candidates.forEach((stock) => {
      const value = getReplayValue(stock, timestamp);
      if (Number.isFinite(value)) values.push(value);
    });
  });
  replayValueRange = values.length
    ? niceRange(Math.min(0, ...values), Math.max(0, ...values))
    : null;
}

function formatReplayDate(timestamp) {
  if (!Number.isFinite(timestamp)) return "Replay timeline";
  if (["1d", "2d", "1w", "2w"].includes(replayPeriod)) {
    return `${new Date(timestamp * 1000).toLocaleString([], {
      timeZone: "America/New_York",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    })} ET`;
  }
  return new Date(timestamp * 1000).toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function updateReplaySubhead() {
  if (!metricSubhead) return;
  let suffix = "";
  if (activeFilter !== "all") {
    const activeButton = document.querySelector(`.filter-btn[data-filter="${activeFilter}"]`);
    suffix = activeButton ? ` (${activeButton.textContent.trim()})` : "";
  }
  if (viewMode === "subindustry" && selectedSector) {
    suffix += ` (${selectedSector} sub-industries)`;
  }
  const config = REPLAY_PERIODS[replayPeriod];
  metricSubhead.textContent = `${config.cadence[0].toUpperCase() + config.cadence.slice(1)} movement from the first price in the ${config.label} replay.${suffix}`;
}

function replayFrameSummary(ready = false) {
  const cadence = REPLAY_PERIODS[replayPeriod].cadence;
  return `${replayFrames.length} ${cadence} frames${ready ? " · ready" : ""}`;
}

function updateReplayFrame(index, rebuild = false) {
  if (!replayFrames.length) return;
  replayFrameIndex = Math.max(0, Math.min(index, replayFrames.length - 1));
  replayScrubber.value = String(replayFrameIndex);
  replayTimestamp.textContent = formatReplayDate(replayFrames[replayFrameIndex]);

  if (rebuild || !replayActive || !chartProjection) {
    replayActive = true;
    calculateReplayRange();
    updateReplaySubhead();
    renderCurrentChart();
    return;
  }

  const { padding, innerHeight, minLog, maxLog } = chartProjection;
  chartEl.style.setProperty(
    "--replay-duration",
    `${Math.max(180, Number(replaySpeed.value) * 0.88)}ms`
  );
  const stocks = replayStocksAt(replayFrameIndex);
  const benchmarkValues = lastBenchmarks.map((stock) => ({
    symbol: stock.symbol,
    __replayValue: getReplayValue(stock, replayFrames[replayFrameIndex]),
  }));
  const values = new Map(
    [...stocks, ...benchmarkValues].map((stock) => [stock.symbol, stock.__replayValue])
  );
  chartEl.querySelectorAll(".dot[data-symbol]").forEach((dot) => {
    const value = values.get(dot.dataset.symbol);
    if (!Number.isFinite(value)) {
      dot.style.opacity = "0";
      return;
    }
    const y =
      padding.top +
      ((maxLog - symLog(value)) / (maxLog - minLog)) * innerHeight +
      verticalJitter(dot.dataset.symbol);
    dot.setAttribute("cy", y);
    dot.style.opacity = "0.9";
  });
  chartEl.querySelectorAll(".pinned-label[data-symbol]").forEach((label) => {
    const value = values.get(label.dataset.symbol);
    if (!Number.isFinite(value)) return;
    const y =
      padding.top +
      ((maxLog - symLog(value)) / (maxLog - minLog)) * innerHeight +
      verticalJitter(label.dataset.symbol);
    label.setAttribute("y", y - 8);
    label.textContent = `${label.dataset.symbol} ${formatPerf(value)}`;
  });
}

function stopReplay() {
  if (replayTimer) {
    clearInterval(replayTimer);
    replayTimer = null;
  }
  replayPlayIcon.textContent = "▶";
  replayPlayLabel.textContent = "Play";
}

function setReplayUi(active) {
  replayActive = active;
  liveModeBtn.classList.toggle("active", !active);
  replay1dModeBtn.classList.toggle("active", active && replayPeriod === "1d");
  replay2dModeBtn.classList.toggle("active", active && replayPeriod === "2d");
  replay1wModeBtn.classList.toggle("active", active && replayPeriod === "1w");
  replay2wModeBtn.classList.toggle("active", active && replayPeriod === "2w");
  replayModeBtn.classList.toggle("active", active && replayPeriod === "1m");
  replay2mModeBtn.classList.toggle("active", active && replayPeriod === "2m");
  replay3mModeBtn.classList.toggle("active", active && replayPeriod === "3m");
  replay6mModeBtn.classList.toggle("active", active && replayPeriod === "6m");
  replayTransport.classList.toggle("is-disabled", !active);
  controlsEl.classList.toggle("replay-locked", active);
  metricToggle.querySelectorAll(".toggle-btn").forEach((button) => {
    button.disabled = active;
  });
}

function enterReplayMode(period = "1m") {
  replayPeriod = period;
  buildReplayTimeline();
  if (replayFrames.length < 2) {
    replayStatus.textContent = "Replay data unavailable";
    return;
  }
  stopReplay();
  setReplayUi(true);
  updateReplayFrame(0, true);
  replayStatus.textContent = replayFrameSummary(true);
}

function exitReplayMode() {
  stopReplay();
  setReplayUi(false);
  replayFrameIndex = Math.max(0, replayFrames.length - 1);
  replayScrubber.value = String(replayFrameIndex);
  replayTimestamp.textContent = "Live snapshot";
  replayStatus.textContent = "Live market view";
  chartEl.style.removeProperty("--replay-duration");
  updateSubhead();
  buildChart(lastStocks);
}

function startReplay() {
  if (replayFrames.length < 2) return;
  if (replayFrameIndex >= replayFrames.length - 1) {
    updateReplayFrame(0, true);
  } else if (!replayActive) {
    updateReplayFrame(replayFrameIndex, true);
  }
  replayPlayIcon.textContent = "❚❚";
  replayPlayLabel.textContent = "Pause";
  replayStatus.textContent = `Playing ${REPLAY_PERIODS[replayPeriod].cadence} prices`;
  replayTimer = setInterval(() => {
    if (replayFrameIndex >= replayFrames.length - 1) {
      stopReplay();
      replayStatus.textContent = replayFrameSummary();
      return;
    }
    updateReplayFrame(replayFrameIndex + 1);
  }, Number(replaySpeed.value));
}

async function loadData(forceRefresh = false) {
  stopReplay();
  setReplayUi(false);
  updateSubhead();
  chartEl.innerHTML = "";
  notesEl.textContent = "";

  try {
    const endpoint = forceRefresh ? "/api/sector-ad?refresh=true" : "/api/sector-ad";
    const res = await fetch(endpoint);
    const data = await readApiJson(res);
    if (!res.ok) {
      throw new Error(data.error || `Failed to load data (HTTP ${res.status})`);
    }
    asOfEl.textContent = formatDate(data.asOf);
    cacheEl.textContent = data.cacheFresh ? "Fresh" : "Stale";

    lastStocks = data.stocks || [];
    lastBenchmarks = data.benchmarks || [];
    populateTickerSearch();
    buildChart(lastStocks);
    buildReplayTimeline();

    if (data.failures && data.failures.length) {
      const sample = data.failures.slice(0, 2).join(' | ');
      notesEl.textContent = data.cacheFresh
        ? `${data.failures.length} symbols missing quotes. ${sample}`
        : `Live Yahoo refresh failed; showing fallback data. ${sample}`;
    }
  } catch (err) {
    chartEl.innerHTML = `
      <div class="notes">
        Data unavailable. ${err.message}
      </div>
    `;
  }
}

refreshBtn.addEventListener("click", () => {
  loadData(true);
});

chartEl.addEventListener("click", () => {
  pinnedSymbols.clear();
  renderCurrentChart();
});

if (capToggle) {
  capToggle.addEventListener("change", () => {
    renderCurrentChart();
  });
}

if (metricToggle) {
  metricToggle.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-metric]");
    if (!button) return;
    setMetric(button.dataset.metric);
  });
}

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const filter = button.dataset.filter;
    if (!filter) return;
    activeFilter = filter;
    filterButtons.forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.filter === filter);
    });
    viewMode = "sector";
    selectedSector = null;
    if (backBtn) backBtn.classList.remove("visible");
    updateSubhead();
    if (replayActive) {
      calculateReplayRange();
      updateReplaySubhead();
    }
    renderCurrentChart();
  });
});

if (backBtn) {
  backBtn.addEventListener("click", () => {
    viewMode = "sector";
    selectedSector = null;
    backBtn.classList.remove("visible");
    updateSubhead();
    if (replayActive) {
      calculateReplayRange();
      updateReplaySubhead();
    }
    renderCurrentChart();
  });
}

window.addEventListener("resize", () => {
  renderCurrentChart();
});

replayPlayBtn.addEventListener("click", () => {
  if (replayTimer) {
    stopReplay();
    replayStatus.textContent = replayFrameSummary();
  } else {
    startReplay();
  }
});

liveModeBtn.addEventListener("click", exitReplayMode);
backLiveBtn.addEventListener("click", exitReplayMode);
replay1dModeBtn.addEventListener("click", () => enterReplayMode("1d"));
replay2dModeBtn.addEventListener("click", () => enterReplayMode("2d"));
replay1wModeBtn.addEventListener("click", () => enterReplayMode("1w"));
replay2wModeBtn.addEventListener("click", () => enterReplayMode("2w"));
replayModeBtn.addEventListener("click", () => enterReplayMode("1m"));
replay2mModeBtn.addEventListener("click", () => enterReplayMode("2m"));
replay3mModeBtn.addEventListener("click", () => enterReplayMode("3m"));
replay6mModeBtn.addEventListener("click", () => enterReplayMode("6m"));

replayScrubber.addEventListener("input", () => {
  stopReplay();
  replayStatus.textContent = `Scrubbing ${REPLAY_PERIODS[replayPeriod].cadence} prices`;
  updateReplayFrame(Number(replayScrubber.value), !replayActive);
});

replayScrubber.addEventListener("change", () => {
  replayStatus.textContent = replayFrameSummary();
});

replaySpeed.addEventListener("change", () => {
  if (!replayTimer) return;
  stopReplay();
  startReplay();
});

tickerSearchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  pinSearchedTicker();
});

updateSubhead();
setMetric("changePercent");
loadData();
