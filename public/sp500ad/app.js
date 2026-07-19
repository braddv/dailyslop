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
const sectorFilterButtons = document.querySelectorAll(".sector-filter-btn");
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
const momentumScanner = document.getElementById("momentumScanner");
const momentumList = document.getElementById("momentumList");
const momentumDescription = document.getElementById("momentumDescription");
const momentumModeButtons = document.querySelectorAll(".momentum-mode-btn");
const weaknessScanner = document.getElementById("weaknessScanner");
const weaknessList = document.getElementById("weaknessList");
const weaknessDescription = document.getElementById("weaknessDescription");
const weaknessModeButtons = document.querySelectorAll(".weakness-mode-btn");
const confluenceScanner = document.getElementById("confluenceScanner");
const shortConfluenceList = document.getElementById("shortConfluenceList");
const longConfluenceList = document.getElementById("longConfluenceList");
const negativeConfluenceScanner = document.getElementById("negativeConfluenceScanner");
const shortNegativeConfluenceList = document.getElementById("shortNegativeConfluenceList");
const longNegativeConfluenceList = document.getElementById("longNegativeConfluenceList");
const workspaceNavButtons = document.querySelectorAll(".workspace-nav-btn");
const marketReplayView = document.getElementById("marketReplayView");
const actionBoardView = document.getElementById("actionBoardView");
const newAccelerationList = document.getElementById("newAccelerationList");
const confirmedLeadersList = document.getElementById("confirmedLeadersList");
const pullbackTrendList = document.getElementById("pullbackTrendList");
const breakdownWarningList = document.getElementById("breakdownWarningList");
const actionHistoryNote = document.getElementById("actionHistoryNote");
const actionSideButtons = document.querySelectorAll(".action-side-btn");
const actionBucketTitles = [1, 2, 3, 4].map((index) =>
  document.getElementById(`actionBucketTitle${index}`)
);
const actionBucketDescriptions = [1, 2, 3, 4].map((index) =>
  document.getElementById(`actionBucketDescription${index}`)
);
const actionBucketIcons = [1, 2, 3, 4].map((index) =>
  document.getElementById(`actionBucketIcon${index}`)
);
const signalHistoryView = document.getElementById("signalHistoryView");
const signalHistoryStatus = document.getElementById("signalHistoryStatus");
const signalSessionPicker = document.getElementById("signalSessionPicker");
const signalHistorySummary = document.getElementById("signalHistorySummary");
const signalChangeList = document.getElementById("signalChangeList");
const signalPersistenceList = document.getElementById("signalPersistenceList");
const historySideButtons = document.querySelectorAll(".history-side-btn");
const signalResultsView = document.getElementById("signalResultsView");
const resultsSideButtons = document.querySelectorAll(".results-side-btn");
const resultsSetupButtons = document.querySelectorAll(".results-setup-btn");
const resultsSetupPrimary = document.getElementById("resultsSetupPrimary");
const resultsSetupSecondary = document.getElementById("resultsSetupSecondary");
const signalOutcomeTitle = document.getElementById("signalOutcomeTitle");
const signalOutcomeDescription = document.getElementById("signalOutcomeDescription");
const signalOutcome1Summary = document.getElementById("signalOutcome1Summary");
const signalOutcome3Summary = document.getElementById("signalOutcome3Summary");
const signalOutcome5Summary = document.getElementById("signalOutcome5Summary");
const signalOutcomeList = document.getElementById("signalOutcomeList");
const actionDrawer = document.getElementById("actionDrawer");
const actionDrawerBackdrop = document.getElementById("actionDrawerBackdrop");
const actionDrawerClose = document.getElementById("actionDrawerClose");
const actionDrawerBucket = document.getElementById("actionDrawerBucket");
const actionDrawerTitle = document.getElementById("actionDrawerTitle");
const actionDrawerCompany = document.getElementById("actionDrawerCompany");
const actionDrawerBody = document.getElementById("actionDrawerBody");
const actionDrawerPin = document.getElementById("actionDrawerPin");

let lastStocks = [];
let lastBenchmarks = [];
let lastAsOf = null;
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
let momentumMode = "persistent";
let weaknessMode = "persistent";
let appView = "replay";
const actionDetailRows = new Map();
let activeActionDetail = null;
let actionBoardSide = "bullish";
let signalHistoryData = null;
let selectedHistorySession = null;
let signalHistorySide = "bullish";
let signalResultsSide = "bullish";
let signalResultsSetup = "pullback";

const REPLAY_PERIODS = {
  "1d": { field: "replayDay15m", label: "1-day", cadence: "15-minute", sessions: 1 },
  "2d": { field: "replayDay15m", label: "2-day", cadence: "15-minute", sessions: 2 },
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

function syncSectorFilterButtons() {
  sectorFilterButtons.forEach((button) => {
    button.classList.toggle(
      "active",
      viewMode === "subindustry" && button.dataset.sector === selectedSector
    );
  });
}

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
  if (appView === "action") {
    metricSubhead.textContent = "Multi-timeframe leadership and weakness across the selected universe.";
    return;
  }
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
        syncSectorFilterButtons();
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

function getReplayValueForPeriod(
  stock,
  timestamp,
  period = replayPeriod,
  cutoffTimestamp = null
) {
  const points = getReplayPoints(stock, period, cutoffTimestamp);
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

function getReplayValue(stock, timestamp) {
  return getReplayValueForPeriod(stock, timestamp, replayPeriod);
}

function getReplayPoints(stock, period = replayPeriod, cutoffTimestamp = null) {
  const config = REPLAY_PERIODS[period];
  const sourcePoints = stock[config.field];
  if (!Array.isArray(sourcePoints) || !sourcePoints.length) return [];
  let points;
  if (Number.isFinite(cutoffTimestamp) && config.field === "replayDaily") {
    const cutoffDate = new Date(cutoffTimestamp * 1000).toLocaleDateString("en-CA", {
      timeZone: "America/New_York",
    });
    points = sourcePoints.filter((point) =>
      Number.isFinite(point?.[0]) &&
      point[0] <= cutoffTimestamp &&
      new Date(point[0] * 1000).toLocaleDateString("en-CA", {
        timeZone: "America/New_York",
      }) < cutoffDate
    );
    const intradaySources = [stock.replayDay15m || [], stock.replayWeekHourly || []];
    let livePrice = null;
    let liveTimestamp = -Infinity;
    intradaySources.forEach((source) => {
      source.forEach((point) => {
        if (
          Number.isFinite(point?.[0]) &&
          point[0] <= cutoffTimestamp &&
          point[0] > liveTimestamp &&
          Number.isFinite(point?.[1])
        ) {
          livePrice = point[1];
          liveTimestamp = point[0];
        }
      });
    });
    if (Number.isFinite(livePrice)) points = [...points, [cutoffTimestamp, livePrice]];
  } else {
    points = Number.isFinite(cutoffTimestamp)
      ? sourcePoints.filter((point) => Number.isFinite(point?.[0]) && point[0] <= cutoffTimestamp)
      : sourcePoints;
  }
  if (!points.length) return [];
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

function getMomentumUniverse() {
  return getBaseScanUniverse().filter((stock) => {
    const points = getReplayPoints(stock);
    return points.length >= Math.max(8, replayFrames.length * 0.7);
  });
}

function getBaseScanUniverse() {
  let stocks = activeFilter === "sectors"
    ? lastBenchmarks.filter((stock) => stock.symbol !== "SPY")
    : applyFilter(lastStocks);
  if (viewMode === "subindustry" && selectedSector) {
    stocks = stocks.filter((stock) => stock.sector === selectedSector);
  }
  return stocks;
}

function percentileMap(rows, field, higherIsBetter = true) {
  const sorted = [...rows]
    .filter((row) => Number.isFinite(row[field]))
    .sort((a, b) => higherIsBetter ? a[field] - b[field] : b[field] - a[field]);
  const scores = new Map();
  sorted.forEach((row, index) => {
    scores.set(row.symbol, sorted.length <= 1 ? 1 : index / (sorted.length - 1));
  });
  return scores;
}

function calculateReplayScores(
  universe,
  frames,
  period = replayPeriod,
  cutoffTimestamp = null
) {
  if (universe.length < 2 || frames.length < 8) return [];

  const frameValues = frames.map((timestamp) => {
    const values = universe
      .map((stock) => ({
        symbol: stock.symbol,
        value: getReplayValueForPeriod(stock, timestamp, period, cutoffTimestamp),
      }))
      .filter((row) => Number.isFinite(row.value))
      .sort((a, b) => b.value - a.value);
    const topCount = Math.max(1, Math.ceil(values.length * 0.2));
    return {
      values: new Map(values.map((row) => [row.symbol, row.value])),
      top: new Set(values.slice(0, topCount).map((row) => row.symbol)),
      bottom: new Set(values.slice(-topCount).map((row) => row.symbol)),
      ranks: new Map(values.map((row, index) => [
        row.symbol,
        values.length <= 1 ? 1 : 1 - index / (values.length - 1),
      ])),
    };
  });

  const scoredFrames = frameValues.slice(1);
  const midpoint = Math.floor(frameValues.length / 2);
  const recentStart = Math.max(midpoint, Math.floor(frameValues.length * 0.66));
  const rows = universe.map((stock) => {
    const values = frameValues
      .map((frame) => frame.values.get(stock.symbol))
      .filter(Number.isFinite);
    const finalReturn = values.at(-1);
    const midpointReturn = frameValues[midpoint]?.values.get(stock.symbol);
    const recentReturn = Number.isFinite(midpointReturn)
      ? finalReturn - midpointReturn
      : null;
    let positiveMoves = 0;
    let peakGrowth = 1;
    let maxDrawdown = 0;
    for (let i = 0; i < values.length; i += 1) {
      const growth = 1 + values[i] / 100;
      peakGrowth = Math.max(peakGrowth, growth);
      if (peakGrowth > 0) {
        maxDrawdown = Math.max(maxDrawdown, ((peakGrowth - growth) / peakGrowth) * 100);
      }
      if (i > 0 && values[i] > values[i - 1]) positiveMoves += 1;
    }
    const top20Pct = scoredFrames.length
      ? scoredFrames.filter((frame) => frame.top.has(stock.symbol)).length / scoredFrames.length
      : 0;
    const recentFrames = frameValues.slice(recentStart);
    const recentTop20Pct = recentFrames.length
      ? recentFrames.filter((frame) => frame.top.has(stock.symbol)).length / recentFrames.length
      : 0;
    const bottom20Pct = scoredFrames.length
      ? scoredFrames.filter((frame) => frame.bottom.has(stock.symbol)).length / scoredFrames.length
      : 0;
    const recentBottom20Pct = recentFrames.length
      ? recentFrames.filter((frame) => frame.bottom.has(stock.symbol)).length / recentFrames.length
      : 0;
    const startRank = frameValues[midpoint]?.ranks.get(stock.symbol);
    const endRank = frameValues.at(-1)?.ranks.get(stock.symbol);
    return {
      stock,
      symbol: stock.symbol,
      finalReturn,
      recentReturn,
      top20Pct,
      recentTop20Pct,
      consistency: values.length > 1 ? positiveMoves / (values.length - 1) : 0,
      negativeConsistency: values.length > 1
        ? (values.length - 1 - positiveMoves) / (values.length - 1)
        : 0,
      bottom20Pct,
      recentBottom20Pct,
      maxDrawdown,
      rankImprovement: Number.isFinite(startRank) && Number.isFinite(endRank)
        ? endRank - startRank
        : null,
    };
  }).filter((row) => Number.isFinite(row.finalReturn));

  const returnRank = percentileMap(rows, "finalReturn");
  const recentRank = percentileMap(rows, "recentReturn");
  const resilienceRank = percentileMap(rows, "maxDrawdown", false);
  const improvementRank = percentileMap(rows, "rankImprovement");
  const weaknessReturnRank = percentileMap(rows, "finalReturn", false);
  const recentWeaknessRank = percentileMap(rows, "recentReturn", false);
  const drawdownSeverityRank = percentileMap(rows, "maxDrawdown");
  const deteriorationRank = percentileMap(rows, "rankImprovement", false);

  rows.forEach((row) => {
    row.persistentScore = 100 * (
      0.35 * (returnRank.get(row.symbol) || 0) +
      0.30 * row.top20Pct +
      0.15 * row.consistency +
      0.10 * (recentRank.get(row.symbol) || 0) +
      0.10 * (resilienceRank.get(row.symbol) || 0)
    );
    row.emergingScore = 100 * (
      0.35 * (improvementRank.get(row.symbol) || 0) +
      0.30 * (recentRank.get(row.symbol) || 0) +
      0.20 * row.recentTop20Pct +
      0.15 * row.consistency
    );
    row.persistentWeaknessScore = 100 * (
      0.35 * (weaknessReturnRank.get(row.symbol) || 0) +
      0.30 * row.bottom20Pct +
      0.15 * row.negativeConsistency +
      0.10 * (recentWeaknessRank.get(row.symbol) || 0) +
      0.10 * (drawdownSeverityRank.get(row.symbol) || 0)
    );
    row.emergingWeaknessScore = 100 * (
      0.35 * (deteriorationRank.get(row.symbol) || 0) +
      0.30 * (recentWeaknessRank.get(row.symbol) || 0) +
      0.20 * row.recentBottom20Pct +
      0.15 * row.negativeConsistency
    );
  });

  return rows;
}

function calculateMomentumScores() {
  const scoreField = momentumMode === "emerging" ? "emergingScore" : "persistentScore";
  return calculateReplayScores(getMomentumUniverse(), replayFrames)
    .sort((a, b) => b[scoreField] - a[scoreField]);
}

function renderMomentumScanner() {
  if (!momentumScanner || !momentumList) return;
  const available = replayActive;
  momentumScanner.hidden = !available;
  if (!available) return;

  const rows = calculateMomentumScores().slice(0, 10);
  const subject = activeFilter === "sectors" ? "Sector ETFs" : "Stocks";
  momentumDescription.textContent = momentumMode === "persistent"
    ? `${subject} that stayed near the top throughout this replay window.`
    : `${subject} whose relative strength improved most during the second half.`;
  momentumModeButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.momentumMode === momentumMode);
  });

  if (!rows.length) {
    momentumList.innerHTML = "<p class=\"momentum-empty\">Not enough replay data for this scan.</p>";
    return;
  }

  const scoreField = momentumMode === "emerging" ? "emergingScore" : "persistentScore";
  momentumList.innerHTML = rows.map((row, index) => `
    <button class="momentum-result" type="button" data-symbol="${row.symbol}">
      <span class="momentum-rank">${index + 1}</span>
      <span class="momentum-symbol">
        <strong>${row.symbol}</strong>
        <small>${viewMode === "subindustry"
          ? row.stock.subIndustry || row.stock.sector
          : row.stock.sector}</small>
      </span>
      <span class="momentum-stat">
        <small>Score</small>
        <strong>${Math.round(row[scoreField])}</strong>
      </span>
      <span class="momentum-stat">
        <small>Return</small>
        <strong class="${row.finalReturn >= 0 ? "positive" : "negative"}">${formatPerf(row.finalReturn)}</strong>
      </span>
      <span class="momentum-stat">
        <small>Top 20%</small>
        <strong>${Math.round(row.top20Pct * 100)}%</strong>
      </span>
      <span class="momentum-stat">
        <small>Drawdown</small>
        <strong>-${row.maxDrawdown.toFixed(1)}%</strong>
      </span>
    </button>
  `).join("");
}

function renderWeaknessScanner() {
  if (!weaknessScanner || !weaknessList) return;
  weaknessScanner.hidden = !replayActive;
  if (!replayActive) return;

  const scoreField = weaknessMode === "emerging"
    ? "emergingWeaknessScore"
    : "persistentWeaknessScore";
  const rows = calculateMomentumScores()
    .sort((a, b) => b[scoreField] - a[scoreField])
    .slice(0, 10);
  const subject = activeFilter === "sectors" ? "Sector ETFs" : "Stocks";
  weaknessDescription.textContent = weaknessMode === "persistent"
    ? `${subject} that stayed near the bottom throughout this replay window.`
    : `${subject} whose relative strength deteriorated most during the second half.`;
  weaknessModeButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.weaknessMode === weaknessMode);
  });

  if (!rows.length) {
    weaknessList.innerHTML = "<p class=\"momentum-empty\">Not enough replay data for this scan.</p>";
    return;
  }

  weaknessList.innerHTML = rows.map((row, index) => `
    <button class="momentum-result weakness-result" type="button" data-symbol="${row.symbol}">
      <span class="momentum-rank">${index + 1}</span>
      <span class="momentum-symbol">
        <strong>${row.symbol}</strong>
        <small>${viewMode === "subindustry"
          ? row.stock.subIndustry || row.stock.sector
          : row.stock.sector}</small>
      </span>
      <span class="momentum-stat">
        <small>Score</small>
        <strong>${Math.round(row[scoreField])}</strong>
      </span>
      <span class="momentum-stat">
        <small>Return</small>
        <strong class="${row.finalReturn >= 0 ? "positive" : "negative"}">${formatPerf(row.finalReturn)}</strong>
      </span>
      <span class="momentum-stat">
        <small>Bottom 20%</small>
        <strong>${Math.round(row.bottom20Pct * 100)}%</strong>
      </span>
      <span class="momentum-stat">
        <small>Drawdown</small>
        <strong>-${row.maxDrawdown.toFixed(1)}%</strong>
      </span>
    </button>
  `).join("");
}

function calculatePeriodScores(period, cutoffTimestamp = null, universeOverride = null) {
  let universe = universeOverride
    ? [...universeOverride]
    : getBaseScanUniverse();
  let frames = Array.from(new Set(
    universe.flatMap((stock) =>
      getReplayPoints(stock, period, cutoffTimestamp).map((point) => point[0])
    )
  )).filter(Number.isFinite).sort((a, b) => a - b);
  universe = universe.filter((stock) =>
    getReplayPoints(stock, period, cutoffTimestamp).length >= Math.max(8, frames.length * 0.7)
  );
  frames = Array.from(new Set(
    universe.flatMap((stock) =>
      getReplayPoints(stock, period, cutoffTimestamp).map((point) => point[0])
    )
  )).filter(Number.isFinite).sort((a, b) => a - b);
  return calculateReplayScores(universe, frames, period, cutoffTimestamp);
}

function calculateConfluence(
  trendPeriods,
  accelerationPeriods,
  negative = false,
  periodRows = null,
  universeOverride = null
) {
  const scoreRows = periodRows || new Map(
    [...trendPeriods, ...accelerationPeriods].map((period) => [
      period,
      new Map(calculatePeriodScores(period).map((row) => [row.symbol, row])),
    ])
  );

  const universe = universeOverride || getBaseScanUniverse();
  return universe.map((stock) => {
    const trendScores = trendPeriods.map((period) =>
      scoreRows.get(period)?.get(stock.symbol)?.[
        negative ? "persistentWeaknessScore" : "persistentScore"
      ]
    );
    const accelerationScores = accelerationPeriods.map((period) =>
      scoreRows.get(period)?.get(stock.symbol)?.[
        negative ? "emergingWeaknessScore" : "emergingScore"
      ]
    );
    const allScores = [...trendScores, ...accelerationScores];
    if (allScores.some((score) => !Number.isFinite(score))) return null;
    const trendAverage = trendScores.reduce((sum, score) => sum + score, 0) / trendScores.length;
    const accelerationAverage = accelerationScores.reduce((sum, score) => sum + score, 0)
      / accelerationScores.length;
    const confirmations = allScores.filter((score) => score >= 65).length;
    return {
      stock,
      symbol: stock.symbol,
      trendPeriods,
      accelerationPeriods,
      trendScores,
      accelerationScores,
      confirmations,
      negative,
      score: Math.min(
        100,
        0.55 * trendAverage +
          0.45 * accelerationAverage +
          Math.max(0, confirmations - 2) * 2
      ),
    };
  }).filter(Boolean).sort((a, b) => b.score - a.score);
}

function confluenceBadges(periods, scores, label, negative = false) {
  return `
    <span class="confluence-evidence">
      <small>${label}</small>
      <span>${periods.map((period, index) => `
        <span class="period-badge ${negative ? "negative-badge" : ""} ${scores[index] >= 65 ? "confirmed" : ""}">
          ${period.toUpperCase()}${scores[index] >= 65 ? " ✓" : ""}
        </span>
      `).join("")}</span>
    </span>
  `;
}

function renderConfluenceRows(target, rows, negative = false) {
  if (!target) return;
  if (!rows.length) {
    target.innerHTML = "<p class=\"momentum-empty\">Not enough data for this confluence scan.</p>";
    return;
  }
  target.innerHTML = rows.slice(0, 10).map((row, index) => `
    <button class="confluence-result ${negative ? "negative-confluence-result" : ""}" type="button" data-symbol="${row.symbol}">
      <span class="momentum-rank">${index + 1}</span>
      <span class="momentum-symbol">
        <strong>${row.symbol}</strong>
        <small>${viewMode === "subindustry"
          ? row.stock.subIndustry || row.stock.sector
          : row.stock.sector}</small>
      </span>
      <span class="confluence-score">
        <small>Confluence</small>
        <strong>${Math.round(row.score)}</strong>
      </span>
      ${confluenceBadges(
        row.trendPeriods,
        row.trendScores,
        negative ? "Weak trend" : "Trend",
        negative
      )}
      ${confluenceBadges(
        row.accelerationPeriods,
        row.accelerationScores,
        negative ? "Deterioration" : "Acceleration",
        negative
      )}
    </button>
  `).join("");
}

const ACTION_HISTORY_KEY = "sp500ad-action-history-v2";

function actionUniverseKey() {
  return [
    activeFilter,
    viewMode,
    selectedSector || "all-sectors",
  ].join("|");
}

function readActionHistory() {
  try {
    return JSON.parse(localStorage.getItem(ACTION_HISTORY_KEY) || "{}");
  } catch {
    return {};
  }
}

function writeActionHistory(history) {
  try {
    localStorage.setItem(ACTION_HISTORY_KEY, JSON.stringify(history));
  } catch {
    // Signal history is helpful but should never block the live application.
  }
}

function scoreSnapshot(rows) {
  return Object.fromEntries(rows.map((row) => [row.symbol, Math.round(row.score * 10) / 10]));
}

function newYorkDateKey(value) {
  return new Date(value).toLocaleDateString("en-CA", {
    timeZone: "America/New_York",
  });
}

function serverActionSnapshots() {
  if (!signalHistoryData?.sessions?.length || !signalHistoryData?.rows?.length) return [];
  const currentAsOf = currentSignalAsOf();
  const currentDate = currentAsOf ? newYorkDateKey(currentAsOf) : null;
  const sessions = signalHistoryData.sessions
    .filter((asOf) => !currentDate || newYorkDateKey(asOf) < currentDate)
    .sort((a, b) => new Date(a) - new Date(b))
    .slice(-5);
  const sectorMode = activeFilter === "sectors";
  return sessions.map((asOf) => {
    const snapshot = {
      asOf,
      positiveShort: {},
      positiveLong: {},
      negativeShort: {},
      negativeLong: {},
    };
    signalHistoryData.rows.forEach((row) => {
      if (
        Boolean(row.is_sector) !== sectorMode ||
        new Date(row.snapshot_at).toISOString() !== asOf
      ) return;
      snapshot.positiveShort[row.symbol] = Number(row.positive_short) || 0;
      snapshot.positiveLong[row.symbol] = Number(row.positive_long) || 0;
      snapshot.negativeShort[row.symbol] = Number(row.negative_short) || 0;
      snapshot.negativeLong[row.symbol] = Number(row.negative_long) || 0;
    });
    return snapshot;
  });
}

function currentSignalAsOf() {
  const timestamps = getBaseScanUniverse()
    .flatMap((stock) => stock.replayDay15m || [])
    .map((point) => point?.[0])
    .filter(Number.isFinite);
  const latest = timestamps.length ? Math.max(...timestamps) : null;
  return Number.isFinite(latest)
    ? new Date(latest * 1000).toISOString()
    : lastAsOf;
}

function storeActionSnapshot(key, snapshot, asOf = currentSignalAsOf()) {
  if (!asOf) return;
  const history = readActionHistory();
  const entries = Array.isArray(history[key]) ? history[key] : [];
  if (!entries.some((entry) => entry.asOf === asOf)) {
    entries.push({ asOf, ...snapshot });
  }
  history[key] = entries.slice(-20);
  writeActionHistory(history);
}

function buildConfluenceSnapshot(cutoffTimestamp) {
  const periodRows = new Map(
    Object.keys(REPLAY_PERIODS).map((period) => [
      period,
      new Map(
        calculatePeriodScores(period, cutoffTimestamp)
          .map((row) => [row.symbol, row])
      ),
    ])
  );
  const positiveShort = calculateConfluence(
    ["1m", "2m"], ["1d", "2d"], false, periodRows
  );
  const positiveLong = calculateConfluence(
    ["3m", "6m"], ["1w", "2w"], false, periodRows
  );
  const negativeShort = calculateConfluence(
    ["1m", "2m"], ["1d", "2d"], true, periodRows
  );
  const negativeLong = calculateConfluence(
    ["3m", "6m"], ["1w", "2w"], true, periodRows
  );
  return {
    positiveShort: scoreSnapshot(positiveShort),
    positiveLong: scoreSnapshot(positiveLong),
    negativeShort: scoreSnapshot(negativeShort),
    negativeLong: scoreSnapshot(negativeLong),
  };
}

function seedHistoricalActionHistory(key) {
  const history = readActionHistory();
  if (Array.isArray(history[key]) && history[key].length) return;
  const source = getBaseScanUniverse()
    .map((stock) => stock.replayDay15m || [])
    .sort((a, b) => b.length - a.length)[0] || [];
  const sessions = new Map();
  source.forEach((point) => {
    if (!Number.isFinite(point?.[0])) return;
    const dateKey = new Date(point[0] * 1000).toLocaleDateString("en-CA", {
      timeZone: "America/New_York",
    });
    sessions.set(dateKey, Math.max(sessions.get(dateKey) || 0, point[0]));
  });
  const cutoffs = [...sessions.values()].sort((a, b) => a - b).slice(-3);
  if (cutoffs.length < 2) return;
  history[key] = cutoffs.map((cutoffTimestamp) => ({
    asOf: new Date(cutoffTimestamp * 1000).toISOString(),
    ...buildConfluenceSnapshot(cutoffTimestamp),
  }));
  writeActionHistory(history);
}

function periodReturn(stock, period) {
  const points = getReplayPoints(stock, period);
  const first = points[0]?.[1];
  const last = points.at(-1)?.[1];
  return Number.isFinite(first) && first !== 0 && Number.isFinite(last)
    ? ((last / first) - 1) * 100
    : null;
}

function relativeStrengthContext(stock, period, sectorSignals) {
  const spy = lastBenchmarks.find((benchmark) => benchmark.symbol === "SPY");
  const sectorEtf = lastBenchmarks.find((benchmark) =>
    benchmark.symbol !== "SPY" && benchmark.sector === stock.sector
  );
  const stockReturn = periodReturn(stock, period);
  const spyReturn = periodReturn(spy || {}, period);
  const sectorReturn = periodReturn(sectorEtf || {}, period);
  return {
    period,
    sectorSymbol: sectorEtf?.symbol || "Sector",
    stockReturn,
    spyReturn,
    sectorReturn,
    vsSpy: Number.isFinite(stockReturn) && Number.isFinite(spyReturn)
      ? stockReturn - spyReturn
      : null,
    vsSector: Number.isFinite(stockReturn) && Number.isFinite(sectorReturn)
      ? stockReturn - sectorReturn
      : null,
    sectorSignals: sectorSignals.get(stock.sector) || {},
  };
}

function classifyRelativeStrength(context) {
  const sectorPositive = Math.max(
    context.sectorSignals.positiveShort || 0,
    context.sectorSignals.positiveLong || 0
  );
  const sectorNegative = context.sectorSignals.negativeShort || 0;
  if (activeFilter === "sectors") {
    if ((context.vsSpy || 0) > 0 && sectorPositive >= 60) return "Sector leader";
    if ((context.vsSpy || 0) < 0 && sectorNegative >= 60) return "Sector breakdown";
    return "Mixed sector";
  }
  if ((context.vsSpy || 0) > 0 && (context.vsSector || 0) > 0 && sectorNegative >= 60) {
    return "Fighting its sector";
  }
  if ((context.vsSpy || 0) > 0 && (context.vsSector || 0) > 0 && sectorPositive >= 60) {
    return "Broadly confirmed";
  }
  if ((context.vsSpy || 0) > 0 && (context.vsSector || 0) > 0) {
    return "Stock-specific leader";
  }
  if ((context.vsSpy || 0) > 0 && (context.vsSector || 0) <= 0 && sectorPositive >= 60) {
    return "Sector carried";
  }
  if ((context.vsSpy || 0) < 0 && (context.vsSector || 0) < 0 && sectorNegative >= 60) {
    return "Broad breakdown";
  }
  return "Mixed confirmation";
}

function classifyRelativeWeakness(context) {
  const sectorNegative = context.sectorSignals.negativeShort || 0;
  if (activeFilter === "sectors") {
    if ((context.vsSpy || 0) < 0 && sectorNegative >= 60) return "Sector laggard";
    if ((context.vsSpy || 0) > 0) return "Sector rebound";
    return "Mixed sector";
  }
  if ((context.vsSpy || 0) < 0 && (context.vsSector || 0) < 0 && sectorNegative >= 60) {
    return "Broad weakness";
  }
  if ((context.vsSpy || 0) < 0 && (context.vsSector || 0) < 0) {
    return "Stock-specific laggard";
  }
  if ((context.vsSpy || 0) > 0 && (context.vsSector || 0) > 0 && sectorNegative >= 60) {
    return "Fighting downtrend";
  }
  return "Mixed confirmation";
}

function addRelativeStrength(rows, periods, sectorSignals, negative = false) {
  rows.forEach((row) => {
    row.relativeStrength = periods.map((period) =>
      relativeStrengthContext(row.stock, period, sectorSignals)
    );
    row.relativeClassification = negative
      ? classifyRelativeWeakness(row.relativeStrength[0])
      : classifyRelativeStrength(row.relativeStrength[0]);
  });
}

function renderActionBucket(target, rows, scoreLabel, bucketKey) {
  if (!target) return;
  if (!rows.length) {
    target.innerHTML = "<p class=\"action-bucket-empty\">No current matches.</p>";
    return;
  }
  target.innerHTML = rows.slice(0, 5).map((row) => `
    <button class="action-bucket-result" type="button" data-symbol="${row.symbol}" data-bucket="${bucketKey}">
      <span class="momentum-symbol">
        <strong>${row.symbol}</strong>
        <small>${viewMode === "subindustry"
          ? row.stock.subIndustry || row.stock.sector
          : row.stock.sector}</small>
        <small class="relative-classification">${row.relativeClassification || ""}</small>
      </span>
          <span class="action-relative-strength">
            ${(row.relativeStrength || []).map((context) => `
              <small>
                <b>${context.period === "1d" ? "OPEN" : context.period.toUpperCase()}</b>
                <span class="${Number.isFinite(context.stockReturn) && context.stockReturn >= 0 ? "positive" : "negative"}">
                  ${row.symbol} ${formatPerf(context.stockReturn)}
                </span>
                <span class="${Number.isFinite(context.spyReturn) && context.spyReturn >= 0 ? "positive" : "negative"}">
                  SPY ${formatPerf(context.spyReturn)}
                </span>
                ${activeFilter === "sectors" ? "" : `
                  <span class="${Number.isFinite(context.sectorReturn) && context.sectorReturn >= 0 ? "positive" : "negative"}">
                    ${context.sectorSymbol} ${formatPerf(context.sectorReturn)}
                  </span>
                `}
              </small>
        `).join("")}
      </span>
      ${row.status ? `<span class="action-status ${row.status.toLowerCase()}">${row.status}</span>` : ""}
      <span class="action-bucket-score">
        <small>${scoreLabel}</small>
        <strong>${Math.round(row.bucketScore)}</strong>
      </span>
    </button>
  `).join("");
}

function renderActionBuckets(
  positiveShort,
  positiveLong,
  negativeShort,
  negativeLong,
  sectorSignals = new Map()
) {
  const key = actionUniverseKey();
  const serverSnapshots = serverActionSnapshots();
  const usingServerHistory = serverSnapshots.length > 0;
  let priorSnapshots = serverSnapshots;
  if (!usingServerHistory) {
    seedHistoricalActionHistory(key);
    const history = readActionHistory();
    const signalAsOf = currentSignalAsOf();
    priorSnapshots = (Array.isArray(history[key]) ? history[key] : [])
      .filter((entry) => entry.asOf !== signalAsOf)
      .slice(-5);
  }
  const previous = priorSnapshots.at(-1);
  const positiveShortBySymbol = new Map(positiveShort.map((row) => [row.symbol, row]));
  const positiveLongBySymbol = new Map(positiveLong.map((row) => [row.symbol, row]));
  const negativeShortBySymbol = new Map(negativeShort.map((row) => [row.symbol, row]));
  const negativeLongBySymbol = new Map(negativeLong.map((row) => [row.symbol, row]));
  const sectorBoard = activeFilter === "sectors";
  const thresholds = sectorBoard
    ? {
        acceleration: 60,
        confirmedShort: 55,
        confirmedLong: 45,
        pullbackSignalLong: 60,
        pullbackSignalWeakness: 50,
        pullbackDevelopingLong: 50,
        pullbackDevelopingWeakness: 40,
        breakdownSignal: 60,
        breakdownDeveloping: 55,
        priorStrong: 60,
        priorPositive: 55,
      }
    : {
        acceleration: 65,
        confirmedShort: 60,
        confirmedLong: 50,
        pullbackSignalLong: 65,
        pullbackSignalWeakness: 55,
        pullbackDevelopingLong: 55,
        pullbackDevelopingWeakness: 45,
        breakdownSignal: 65,
        breakdownDeveloping: 55,
        priorStrong: 65,
        priorPositive: 60,
      };
  const sectorTotals = new Map();
  const sectorLeaders = new Map();
  positiveShort.forEach((row) => {
    const sector = row.stock.sector;
    sectorTotals.set(sector, (sectorTotals.get(sector) || 0) + 1);
    if (row.score >= 60) sectorLeaders.set(sector, (sectorLeaders.get(sector) || 0) + 1);
  });

  const newAcceleration = positiveShort
    .filter((row) =>
      row.score >= thresholds.acceleration &&
      previous &&
      (previous.positiveShort?.[row.symbol] || 0) < thresholds.acceleration
    )
    .map((row) => {
      const supportingScore = positiveLongBySymbol.get(row.symbol)?.score || 0;
      return {
        ...row,
        status: supportingScore >= thresholds.acceleration
          ? "Confirmed"
          : supportingScore >= thresholds.confirmedLong
            ? "Building"
            : "Early",
        bucketScore: row.score,
      };
    });

  const confirmedLeaders = positiveShort
    .filter((row) => {
      const longScore = positiveLongBySymbol.get(row.symbol)?.score || 0;
      const recent = priorSnapshots.slice(-2);
      const sessionScores = [
        ...recent.map((snapshot) => snapshot.positiveShort?.[row.symbol] || 0),
        row.score,
      ];
      return row.score >= thresholds.confirmedShort &&
        longScore >= thresholds.confirmedLong &&
        recent.length >= 2 &&
        sessionScores.filter((score) => score >= thresholds.confirmedShort).length >= 2;
    })
    .map((row) => ({
      ...row,
      bucketScore: (row.score + (positiveLongBySymbol.get(row.symbol)?.score || 0)) / 2,
    }))
    .sort((a, b) => b.bucketScore - a.bucketScore);

  const pullbackTrend = positiveLong
    .map((row) => {
      const shortPositive = positiveShortBySymbol.get(row.symbol)?.score || 0;
      const shortNegative = negativeShortBySymbol.get(row.symbol)?.score || 0;
      const fullSignal =
        row.score >= thresholds.pullbackSignalLong &&
        shortPositive < thresholds.acceleration &&
        shortNegative >= thresholds.pullbackSignalWeakness;
      const developing =
        row.score >= thresholds.pullbackDevelopingLong &&
        shortPositive < thresholds.acceleration + 5 &&
        shortNegative >= thresholds.pullbackDevelopingWeakness;
      if (!fullSignal && !developing) return null;
      return {
        ...row,
        status: fullSignal ? "Signal" : "Developing",
        bucketScore: (row.score + shortNegative) / 2,
      };
    })
    .filter(Boolean)
    .sort((a, b) =>
      (a.status === b.status ? b.bucketScore - a.bucketScore : a.status === "Signal" ? -1 : 1)
    );

  const breakdownWarning = negativeShort
    .map((row) => {
      const wasStronglyPositive = priorSnapshots.some((snapshot) =>
        (snapshot.positiveShort?.[row.symbol] || 0) >= thresholds.priorStrong ||
        (snapshot.positiveLong?.[row.symbol] || 0) >= thresholds.priorStrong
      );
      const wasPositive = priorSnapshots.some((snapshot) =>
        (snapshot.positiveShort?.[row.symbol] || 0) >= thresholds.priorPositive ||
        (snapshot.positiveLong?.[row.symbol] || 0) >= thresholds.priorPositive
      );
      const fullSignal = row.score >= thresholds.breakdownSignal && wasStronglyPositive;
      const developing = row.score >= thresholds.breakdownDeveloping && wasPositive;
      if (!fullSignal && !developing) return null;
      return {
        ...row,
        status: fullSignal ? "Signal" : "Developing",
        bucketScore: row.score,
      };
    })
    .filter(Boolean)
    .sort((a, b) =>
      (a.status === b.status ? b.bucketScore - a.bucketScore : a.status === "Signal" ? -1 : 1)
    );

  const newWeakness = negativeShort
    .filter((row) =>
      row.score >= thresholds.acceleration &&
      previous &&
      (previous.negativeShort?.[row.symbol] || 0) < thresholds.acceleration
    )
    .map((row) => {
      const supportingScore = negativeLongBySymbol.get(row.symbol)?.score || 0;
      return {
        ...row,
        status: supportingScore >= thresholds.acceleration
          ? "Confirmed"
          : supportingScore >= thresholds.confirmedLong
            ? "Building"
            : "Early",
        bucketScore: row.score,
      };
    });

  const confirmedLaggards = negativeShort
    .filter((row) => {
      const longScore = negativeLongBySymbol.get(row.symbol)?.score || 0;
      const recent = priorSnapshots.slice(-2);
      const sessionScores = [
        ...recent.map((snapshot) => snapshot.negativeShort?.[row.symbol] || 0),
        row.score,
      ];
      return row.score >= thresholds.confirmedShort &&
        longScore >= thresholds.confirmedLong &&
        recent.length >= 2 &&
        sessionScores.filter((score) => score >= thresholds.confirmedShort).length >= 2;
    })
    .map((row) => ({
      ...row,
      bucketScore: (row.score + (negativeLongBySymbol.get(row.symbol)?.score || 0)) / 2,
    }))
    .sort((a, b) => b.bucketScore - a.bucketScore);

  const bounceInDowntrend = negativeLong
    .map((row) => {
      const shortNegative = negativeShortBySymbol.get(row.symbol)?.score || 0;
      const shortPositive = positiveShortBySymbol.get(row.symbol)?.score || 0;
      const fullSignal =
        row.score >= thresholds.pullbackSignalLong &&
        shortNegative < thresholds.acceleration &&
        shortPositive >= thresholds.pullbackSignalWeakness;
      const developing =
        row.score >= thresholds.pullbackDevelopingLong &&
        shortNegative < thresholds.acceleration + 5 &&
        shortPositive >= thresholds.pullbackDevelopingWeakness;
      if (!fullSignal && !developing) return null;
      return {
        ...row,
        status: fullSignal ? "Signal" : "Developing",
        bucketScore: (row.score + shortPositive) / 2,
      };
    })
    .filter(Boolean)
    .sort((a, b) =>
      (a.status === b.status ? b.bucketScore - a.bucketScore : a.status === "Signal" ? -1 : 1)
    );

  const breakoutWarning = positiveShort
    .map((row) => {
      const wasStronglyNegative = priorSnapshots.some((snapshot) =>
        (snapshot.negativeShort?.[row.symbol] || 0) >= thresholds.priorStrong ||
        (snapshot.negativeLong?.[row.symbol] || 0) >= thresholds.priorStrong
      );
      const wasNegative = priorSnapshots.some((snapshot) =>
        (snapshot.negativeShort?.[row.symbol] || 0) >= thresholds.priorPositive ||
        (snapshot.negativeLong?.[row.symbol] || 0) >= thresholds.priorPositive
      );
      const fullSignal = row.score >= thresholds.breakdownSignal && wasStronglyNegative;
      const developing = row.score >= thresholds.breakdownDeveloping && wasNegative;
      if (!fullSignal && !developing) return null;
      return {
        ...row,
        status: fullSignal ? "Signal" : "Developing",
        bucketScore: row.score,
      };
    })
    .filter(Boolean)
    .sort((a, b) =>
      (a.status === b.status ? b.bucketScore - a.bucketScore : a.status === "Signal" ? -1 : 1)
    );

  const bullish = [
    ["acceleration", "New acceleration", newAcceleration, ["1d", "1w", "1m"], "Confluence"],
    ["leaders", "Confirmed leaders", confirmedLeaders, ["1m", "3m"], "Combined"],
    ["pullback", "Pullback in trend", pullbackTrend, ["1d", "1w", "1m"], "Setup"],
    ["breakdown", "Breakdown warning", breakdownWarning, ["1w", "1m"], "Warning"],
  ];
  const bearish = [
    ["weakness", "New weakness", newWeakness, ["1d", "1w", "1m"], "Confluence"],
    ["laggards", "Confirmed laggards", confirmedLaggards, ["1m", "3m"], "Combined"],
    ["bounce", "Bounce in downtrend", bounceInDowntrend, ["1d", "1w", "1m"], "Setup"],
    ["breakout", "Breakout warning", breakoutWarning, ["1w", "1m"], "Warning"],
  ];
  bullish.forEach(([, , rows, periods]) => addRelativeStrength(rows, periods, sectorSignals));
  bearish.forEach(([, , rows, periods]) => addRelativeStrength(rows, periods, sectorSignals, true));
  const activeBuckets = actionBoardSide === "bearish" ? bearish : bullish;
  const descriptions = actionBoardSide === "bearish"
    ? [
        "Entered negative short-term confluence since the prior shared snapshot.",
        "Held negative confluence across several shared snapshots.",
        "Long-term weakness remains intact while 1D/2D momentum rebounds.",
        "Prior negative confluence is giving way to positive acceleration.",
      ]
    : [
        "Entered positive short-term confluence since the prior shared snapshot.",
        "Held positive confluence across several shared snapshots.",
        "Long-term leadership remains strong while 1D/2D momentum weakens.",
        "Prior positive confluence is giving way to emerging short-term weakness.",
      ];
  activeBuckets.forEach(([, label], index) => {
    if (actionBucketTitles[index]) actionBucketTitles[index].textContent = label;
    if (actionBucketDescriptions[index]) {
      actionBucketDescriptions[index].textContent = descriptions[index];
    }
  });
  const icons = actionBoardSide === "bearish" ? ["↘", "✓", "↗", "!"] : ["↗", "✓", "↘", "!"];
  actionBucketIcons.forEach((icon, index) => {
    if (icon) icon.textContent = icons[index];
  });
  actionBoardView.classList.toggle("bearish-board", actionBoardSide === "bearish");
  actionSideButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.actionSide === actionBoardSide);
  });

  actionDetailRows.clear();
  activeBuckets.forEach(([keyName, label, rows]) => {
    rows.forEach((row) => {
      const snapshots = priorSnapshots.filter((snapshot) =>
        (snapshot.positiveShort?.[row.symbol] || 0) >= 60 ||
        (snapshot.positiveLong?.[row.symbol] || 0) >= 60 ||
        (snapshot.negativeShort?.[row.symbol] || 0) >= 60
      ).length;
      const sectorTotal = sectorTotals.get(row.stock.sector) || 0;
      actionDetailRows.set(`${keyName}:${row.symbol}`, {
        ...row,
        bucketLabel: label,
        signalSnapshots: snapshots,
        sectorBreadth: sectorTotal
          ? ((sectorLeaders.get(row.stock.sector) || 0) / sectorTotal) * 100
          : null,
      });
    });
  });

  const bucketTargets = [
    newAccelerationList,
    confirmedLeadersList,
    pullbackTrendList,
    breakdownWarningList,
  ];
  activeBuckets.forEach(([keyName, , rows, , scoreLabel], index) => {
    renderActionBucket(bucketTargets[index], rows, scoreLabel, keyName);
  });
  if (actionHistoryNote) {
    actionHistoryNote.textContent = usingServerHistory
      ? `Live signals compared with ${priorSnapshots.length} shared server snapshots through ${historyDateLabel(priorSnapshots.at(-1).asOf)}.`
      : priorSnapshots.length
        ? `${priorSnapshots.length + 1} browser snapshots available as a temporary fallback.`
      : "Signal history starts with this data snapshot; change-based buckets will populate after future refreshes.";
  }

  if (!usingServerHistory) {
    storeActionSnapshot(key, {
      positiveShort: scoreSnapshot(positiveShort),
      positiveLong: scoreSnapshot(positiveLong),
      negativeShort: scoreSnapshot(negativeShort),
      negativeLong: scoreSnapshot(negativeLong),
    });
  }
}

function distanceFromDayAverage(stock, days) {
  const closes = (stock.replayDaily || [])
    .map((point) => point[1])
    .filter(Number.isFinite)
    .slice(-days);
  if (!closes.length || !Number.isFinite(stock.currentPrice)) return null;
  const average = closes.reduce((sum, value) => sum + value, 0) / closes.length;
  return average > 0 ? ((stock.currentPrice / average) - 1) * 100 : null;
}

function closeActionDrawer() {
  if (!actionDrawer) return;
  actionDrawer.hidden = true;
  actionDrawerBackdrop.hidden = true;
  document.body.classList.remove("drawer-open");
  activeActionDetail = null;
}

function openActionDrawer(bucket, symbol) {
  const row = actionDetailRows.get(`${bucket}:${symbol}`);
  if (!row || !actionDrawer) return;
  activeActionDetail = row;
  const distance5d = distanceFromDayAverage(row.stock, 5);
  const distance20d = distanceFromDayAverage(row.stock, 20);
  actionDrawerBucket.textContent = row.bucketLabel;
  actionDrawerTitle.textContent = row.symbol;
  actionDrawerCompany.textContent = `${row.stock.security} · ${row.stock.subIndustry || row.stock.sector}`;
  actionDrawerBody.innerHTML = `
    <div class="action-detail-summary">
      <span>${row.relativeClassification || "Mixed confirmation"}</span>
      ${row.status ? `<span>${row.status}</span>` : ""}
    </div>
    <div class="action-detail-grid">
      <div><small>From 5D average</small><strong class="${(distance5d || 0) >= 0 ? "positive" : "negative"}">${formatPerf(distance5d)}</strong></div>
      <div><small>From 20D average</small><strong class="${(distance20d || 0) >= 0 ? "positive" : "negative"}">${formatPerf(distance20d)}</strong></div>
      <div><small>Sector breadth</small><strong>${Number.isFinite(row.sectorBreadth) ? `${Math.round(row.sectorBreadth)}%` : "--"}</strong></div>
      <div><small>Prior signal snapshots</small><strong>${row.signalSnapshots}</strong></div>
    </div>
  `;
  actionDrawer.hidden = false;
  actionDrawerBackdrop.hidden = false;
  document.body.classList.add("drawer-open");
}

const HISTORY_BUCKETS = {
  acceleration: { label: "New acceleration", className: "acceleration" },
  leader: { label: "Confirmed leader", className: "leader" },
  pullback: { label: "Pullback", className: "pullback" },
  breakdown: { label: "Breakdown", className: "breakdown" },
  weakness: { label: "New weakness", className: "weakness" },
  laggard: { label: "Confirmed laggard", className: "laggard" },
  bounce: { label: "Downtrend bounce", className: "bounce" },
  breakout: { label: "Breakout warning", className: "breakout" },
};
const HISTORY_BUCKET_GROUPS = {
  bullish: ["acceleration", "leader", "pullback", "breakdown"],
  bearish: ["weakness", "laggard", "bounce", "breakout"],
};

function historyDateLabel(value, includeTime = false) {
  const date = new Date(value);
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    month: "short",
    day: "numeric",
    ...(includeTime ? { hour: "numeric", minute: "2-digit" } : {}),
  }).format(date);
}

function historyAllowedSymbols() {
  return new Set(getBaseScanUniverse().map((stock) => stock.symbol));
}

function filteredHistoryRows() {
  if (!signalHistoryData?.rows) return [];
  const allowed = historyAllowedSymbols();
  const sectorMode = activeFilter === "sectors";
  return signalHistoryData.rows.filter((row) =>
    Boolean(row.is_sector) === sectorMode && allowed.has(row.symbol)
  );
}

function bucketBadges(buckets, allowedBuckets = Object.keys(HISTORY_BUCKETS)) {
  return (Array.isArray(buckets) ? buckets : [])
    .filter((bucket) => allowedBuckets.includes(bucket))
    .map((bucket) => {
      const config = HISTORY_BUCKETS[bucket] || { label: bucket, className: "" };
      return `<span class="history-bucket ${config.className}">${config.label}</span>`;
    }).join("");
}

function renderSignalOutcomes() {
  if (!signalOutcome1Summary || !signalOutcome3Summary || !signalOutcome5Summary || !signalOutcomeList) return;
  const bearish = signalResultsSide === "bearish";
  const allowedSetups = bearish ? ["bounce", "weakness"] : ["pullback", "acceleration"];
  if (!allowedSetups.includes(signalResultsSetup)) {
    signalResultsSetup = allowedSetups[0];
  }
  const signalType = signalResultsSetup;
  if (resultsSetupPrimary && resultsSetupSecondary) {
    resultsSetupPrimary.dataset.resultsSetup = allowedSetups[0];
    resultsSetupPrimary.textContent = bearish ? "Bounce in downtrend" : "Pullback in trend";
    resultsSetupSecondary.dataset.resultsSetup = allowedSetups[1];
    resultsSetupSecondary.textContent = bearish ? "New weakness" : "New acceleration";
  }
  resultsSideButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.resultsSide === signalResultsSide);
  });
  resultsSetupButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.resultsSetup === signalType);
  });
  signalResultsView?.classList.toggle("bearish-history", signalResultsSide === "bearish");
  const expectedDirection = bearish ? -1 : 1;
  const allowed = historyAllowedSymbols();
  const sectorMode = activeFilter === "sectors";
  const outcomes = (signalHistoryData?.outcomes || []).filter((row) =>
    row.signal_type === signalType &&
    Boolean(row.is_sector) === sectorMode &&
    allowed.has(row.symbol)
  );
  const hasOutcome = (row, field) =>
    row[field] !== null &&
    row[field] !== undefined &&
    Number.isFinite(Number(row[field]));
  const renderSummary = (element, field, horizon) => {
    const matured = outcomes.filter((row) => hasOutcome(row, field));
    const pending = outcomes.length - matured.length;
    const successes = matured.filter((row) =>
      Number(row[field]) * expectedDirection > 0
    ).length;
    const averageReturn = matured.length
      ? matured.reduce((sum, row) => sum + Number(row[field]), 0) / matured.length
      : null;
    element.innerHTML = `
      <div><small>Signals</small><strong>${outcomes.length}</strong></div>
      <div><small>Matured</small><strong>${matured.length}</strong></div>
      <div><small>Success rate</small><strong>${matured.length ? `${Math.round((successes / matured.length) * 100)}%` : "--"}</strong></div>
      <div><small>Average return</small><strong class="${(averageReturn || 0) >= 0 ? "positive" : "negative"}">${formatPerf(averageReturn)}</strong></div>
      ${pending ? `<p>${pending} signal${pending === 1 ? "" : "s"} pending ${horizon} later snapshot${horizon === 1 ? "" : "s"}.</p>` : ""}
    `;
  };
  const setupCopy = {
    pullback: {
      title: "Pullback in trend outcomes",
      description: "First 3 PM pullback signal measured at the next, third, and fifth 3 PM trading-session snapshots · positive return counts as success.",
    },
    acceleration: {
      title: "New acceleration outcomes",
      description: "First new-acceleration signal firing at 3 PM measured at the next, third, and fifth 3 PM trading-session snapshots · positive return counts as success.",
    },
    bounce: {
      title: "Bounce in downtrend outcomes",
      description: "First 3 PM downtrend-bounce signal measured at the next, third, and fifth 3 PM trading-session snapshots · negative return counts as success.",
    },
    weakness: {
      title: "New weakness outcomes",
      description: "First new-weakness signal firing at 3 PM measured at the next, third, and fifth 3 PM trading-session snapshots · negative return counts as success.",
    },
  };
  signalOutcomeTitle.textContent = setupCopy[signalType].title;
  const truncationNote = signalHistoryData?.outcomesTruncated
    ? ` Showing the newest ${signalHistoryData.outcomes.length.toLocaleString()} of ${Number(signalHistoryData.outcomeTotal).toLocaleString()} stored events.`
    : "";
  signalOutcomeDescription.textContent = `${setupCopy[signalType].description}${truncationNote}`;
  renderSummary(signalOutcome1Summary, "one_session_return", 1);
  renderSummary(signalOutcome3Summary, "three_session_return", 3);
  renderSummary(signalOutcome5Summary, "five_session_return", 5);
  signalOutcomeList.innerHTML = outcomes.length ? outcomes.slice(0, 30).map((row) => {
    const oneValue = Number(row.one_session_return);
    const threeValue = Number(row.three_session_return);
    const fiveValue = Number(row.five_session_return);
    const oneComplete = hasOutcome(row, "one_session_return");
    const threeComplete = hasOutcome(row, "three_session_return");
    const fiveComplete = hasOutcome(row, "five_session_return");
    const oneSuccess = oneComplete && oneValue * expectedDirection > 0;
    const threeSuccess = threeComplete && threeValue * expectedDirection > 0;
    const fiveSuccess = fiveComplete && fiveValue * expectedDirection > 0;
    return `
      <button class="signal-outcome-row" type="button" data-symbol="${row.symbol}">
        <span class="signal-history-symbol">
          <strong>${row.symbol}</strong>
          <small>${viewMode === "subindustry" ? row.sub_industry || row.sector : row.sector}</small>
        </span>
        <span>
          <small>Signal</small>
          <strong>${historyDateLabel(row.snapshot_at)}</strong>
        </span>
        <span>
          <small>Entry</small>
          <strong>${Number.isFinite(Number(row.entry_price)) ? `$${Number(row.entry_price).toFixed(2)}` : "--"}</strong>
        </span>
        <span class="${oneComplete ? oneSuccess ? "positive" : "negative" : "pending"}">
          <small>1 session</small>
          <strong>${oneComplete ? formatPerf(oneValue) : "Pending"}</strong>
        </span>
        <span class="${threeComplete ? threeSuccess ? "positive" : "negative" : "pending"}">
          <small>3 sessions</small>
          <strong>${threeComplete ? formatPerf(threeValue) : "Pending"}</strong>
        </span>
        <span class="${fiveComplete ? fiveSuccess ? "positive" : "negative" : "pending"}">
          <small>5 sessions</small>
          <strong>${fiveComplete ? formatPerf(fiveValue) : "Pending"}</strong>
        </span>
      </button>
    `;
  }).join("") : "<p class=\"signal-history-empty\">No first-entry signals recorded for this setup yet.</p>";
}

function renderSignalHistory() {
  if (!signalHistoryView || !signalHistoryData) return;
  const rows = filteredHistoryRows();
  const sessions = signalHistoryData.sessions || [];
  if (!selectedHistorySession || !sessions.includes(selectedHistorySession)) {
    selectedHistorySession = sessions[0] || null;
  }
  signalSessionPicker.innerHTML = sessions.map((session) => `
    <button class="signal-session-btn ${session === selectedHistorySession ? "active" : ""}"
      type="button" data-session="${session}">
      ${historyDateLabel(session)}
    </button>
  `).join("");
  if (!sessions.length) {
    signalHistoryStatus.textContent = "No server snapshots have been saved yet.";
    signalHistorySummary.innerHTML = "";
    signalChangeList.innerHTML = "<p class=\"signal-history-empty\">History will appear after the first saved snapshot.</p>";
    signalPersistenceList.innerHTML = "";
    return;
  }
  const selectedRows = rows.filter((row) =>
    new Date(row.snapshot_at).toISOString() === selectedHistorySession
  );
  const activeHistoryBuckets = HISTORY_BUCKET_GROUPS[signalHistorySide];
  historySideButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.historySide === signalHistorySide);
  });
  signalHistoryView.classList.toggle("bearish-history", signalHistorySide === "bearish");
  const bucketCounts = activeHistoryBuckets.map((bucket) => ({
    bucket,
    count: selectedRows.filter((row) => (row.buckets || []).includes(bucket)).length,
  }));
  signalHistoryStatus.textContent =
    `${sessions.length} server snapshots · selected ${historyDateLabel(selectedHistorySession, true)} ET`;
  signalHistorySummary.innerHTML = bucketCounts.map(({ bucket, count }) => `
    <div class="signal-summary-card ${HISTORY_BUCKETS[bucket].className}">
      <small>${HISTORY_BUCKETS[bucket].label}</small>
      <strong>${count}</strong>
    </div>
  `).join("");

  const changes = selectedRows
    .filter((row) =>
      Array.isArray(row.buckets) &&
      row.buckets.some((bucket) => activeHistoryBuckets.includes(bucket))
    )
    .sort((a, b) => {
      const aScore = signalHistorySide === "bearish"
        ? Math.max(Number(a.negative_short), Number(a.negative_long))
        : Math.max(Number(a.positive_short), Number(a.positive_long));
      const bScore = signalHistorySide === "bearish"
        ? Math.max(Number(b.negative_short), Number(b.negative_long))
        : Math.max(Number(b.positive_short), Number(b.positive_long));
      return bScore - aScore;
    })
    .slice(0, 30);
  signalChangeList.innerHTML = changes.length ? changes.map((row) => `
    <button class="signal-history-row" type="button" data-symbol="${row.symbol}">
      <span class="signal-history-symbol">
        <strong>${row.symbol}</strong>
        <small>${viewMode === "subindustry" ? row.sub_industry || row.sector : row.sector}</small>
      </span>
      <span class="signal-history-buckets">${bucketBadges(row.buckets, activeHistoryBuckets)}</span>
      <span class="signal-history-return ${Number(row.return_1m) >= 0 ? "positive" : "negative"}">
        <small>1M</small>
        <strong>${formatPerf(Number(row.return_1m))}</strong>
      </span>
    </button>
  `).join("") : "<p class=\"signal-history-empty\">No bucket changes in this filtered snapshot.</p>";

  const bySymbol = new Map();
  rows.forEach((row) => {
    if (!bySymbol.has(row.symbol)) bySymbol.set(row.symbol, []);
    bySymbol.get(row.symbol).push(row);
  });
  const persistent = [...bySymbol.entries()].map(([symbol, symbolRows]) => {
    const ordered = symbolRows.sort((a, b) => new Date(a.snapshot_at) - new Date(b.snapshot_at));
    const activeSessions = ordered.filter((row) =>
      (row.buckets || []).some((bucket) => activeHistoryBuckets.includes(bucket))
    ).length;
    const positiveSessions = ordered.filter((row) =>
      (row.buckets || []).some((bucket) => bucket === "acceleration" || bucket === "leader")
    ).length;
    const negativeSessions = ordered.filter((row) =>
      (row.buckets || []).some((bucket) => bucket === "weakness" || bucket === "laggard")
    ).length;
    return {
      symbol,
      row: ordered.at(-1),
      ordered,
      activeSessions,
      positiveSessions,
      negativeSessions,
    };
  }).filter((item) => item.activeSessions)
    .sort((a, b) =>
      (signalHistorySide === "bearish" ? b.negativeSessions - a.negativeSessions : b.positiveSessions - a.positiveSessions) ||
      b.activeSessions - a.activeSessions ||
      (signalHistorySide === "bearish"
        ? Number(b.row.negative_long) - Number(a.row.negative_long)
        : Number(b.row.positive_long) - Number(a.row.positive_long))
    )
    .slice(0, 20);
  signalPersistenceList.innerHTML = persistent.length ? persistent.map((item) => `
    <button class="signal-persistence-row" type="button" data-symbol="${item.symbol}">
      <span class="signal-history-symbol">
        <strong>${item.symbol}</strong>
        <small>${item.row.sector}</small>
      </span>
      <span class="signal-timeline">
        ${sessions.slice().reverse().map((session) => {
          const row = item.ordered.find((candidate) =>
            new Date(candidate.snapshot_at).toISOString() === session
          );
          const bucket = row?.buckets?.find((candidate) => activeHistoryBuckets.includes(candidate));
          return `<i class="${bucket || "empty"}" title="${historyDateLabel(session)}${bucket ? ` · ${HISTORY_BUCKETS[bucket]?.label || bucket}` : ""}"></i>`;
        }).join("")}
      </span>
      <span class="signal-session-count">
        <strong>${item.activeSessions}</strong>
        <small>sessions</small>
      </span>
    </button>
  `).join("") : "<p class=\"signal-history-empty\">No persistent signals in this filtered history.</p>";
}

async function loadSignalHistory() {
  if (!signalHistoryStatus) return;
  signalHistoryStatus.textContent = "Loading stored snapshots…";
  try {
    const response = await fetch("/api/signal-history?limit=20");
    const data = await readApiJson(response);
    if (!response.ok) throw new Error(data.error || `History unavailable (${response.status})`);
    signalHistoryData = data;
    if (appView === "action") renderConfluenceScanner();
    else if (appView === "results") renderSignalOutcomes();
    else renderSignalHistory();
  } catch (error) {
    signalHistoryData = { sessions: [], rows: [], outcomes: [] };
    signalHistoryStatus.textContent = error.message;
    if (appView === "action") renderConfluenceScanner();
    else if (appView === "results") renderSignalOutcomes();
    else renderSignalHistory();
  }
}

function renderConfluenceScanner() {
  if (!confluenceScanner || !negativeConfluenceScanner) return;
  const visibleUniverse = getBaseScanUniverse();
  const available = visibleUniverse.length >= 2;
  const actionBoardBullish = appView === "action" && actionBoardSide === "bullish";
  const actionBoardBearish = appView === "action" && actionBoardSide === "bearish";
  confluenceScanner.hidden = !available || actionBoardBearish;
  negativeConfluenceScanner.hidden = !available || actionBoardBullish;
  if (!available) return;
  const sectorUniverse = lastBenchmarks.filter((benchmark) => benchmark.symbol !== "SPY");
  const scoreUniverse = appView === "action"
    ? activeFilter === "sectors"
      ? sectorUniverse
      : lastStocks
    : visibleUniverse;
  const periodRows = new Map(
    Object.keys(REPLAY_PERIODS).map((period) => [
      period,
      new Map(
        calculatePeriodScores(period, null, scoreUniverse)
          .map((row) => [row.symbol, row])
      ),
    ])
  );
  const allPositiveShort = calculateConfluence(
    ["1m", "2m"], ["1d", "2d"], false, periodRows, scoreUniverse
  );
  const allPositiveLong = calculateConfluence(
    ["3m", "6m"], ["1w", "2w"], false, periodRows, scoreUniverse
  );
  const allNegativeShort = calculateConfluence(
    ["1m", "2m"], ["1d", "2d"], true, periodRows, scoreUniverse
  );
  const allNegativeLong = calculateConfluence(
    ["3m", "6m"], ["1w", "2w"], true, periodRows, scoreUniverse
  );
  const allowedSymbols = new Set(visibleUniverse.map((stock) => stock.symbol));
  const visibleRows = (rows) => rows.filter((row) => allowedSymbols.has(row.symbol));
  const positiveShort = visibleRows(allPositiveShort);
  const positiveLong = visibleRows(allPositiveLong);
  const negativeShort = visibleRows(allNegativeShort);
  const negativeLong = visibleRows(allNegativeLong);
  const sectorPeriodRows = new Map(
    Object.keys(REPLAY_PERIODS).map((period) => [
      period,
      new Map(
        calculatePeriodScores(period, null, sectorUniverse)
          .map((row) => [row.symbol, row])
      ),
    ])
  );
  const sectorPositiveShort = calculateConfluence(
    ["1m", "2m"],
    ["1d", "2d"],
    false,
    sectorPeriodRows,
    sectorUniverse
  );
  const sectorPositiveLong = calculateConfluence(
    ["3m", "6m"],
    ["1w", "2w"],
    false,
    sectorPeriodRows,
    sectorUniverse
  );
  const sectorNegativeShort = calculateConfluence(
    ["1m", "2m"],
    ["1d", "2d"],
    true,
    sectorPeriodRows,
    sectorUniverse
  );
  const sectorSignals = new Map(sectorUniverse.map((benchmark) => [
    benchmark.sector,
    {
      positiveShort: sectorPositiveShort.find((row) => row.symbol === benchmark.symbol)?.score || 0,
      positiveLong: sectorPositiveLong.find((row) => row.symbol === benchmark.symbol)?.score || 0,
      negativeShort: sectorNegativeShort.find((row) => row.symbol === benchmark.symbol)?.score || 0,
    },
  ]));
  renderConfluenceRows(shortConfluenceList, positiveShort);
  renderConfluenceRows(longConfluenceList, positiveLong);
  renderConfluenceRows(shortNegativeConfluenceList, negativeShort, true);
  renderConfluenceRows(longNegativeConfluenceList, negativeLong, true);
  renderActionBuckets(positiveShort, positiveLong, negativeShort, negativeLong, sectorSignals);
}

function setAppView(view) {
  appView = ["action", "history", "results"].includes(view) ? view : "replay";
  const showActionBoard = appView === "action";
  const showHistory = appView === "history";
  const showResults = appView === "results";
  marketReplayView.hidden = showActionBoard || showHistory || showResults;
  actionBoardView.hidden = !showActionBoard;
  signalHistoryView.hidden = !showHistory;
  signalResultsView.hidden = !showResults;
  controlsEl.classList.toggle("action-board-active", showActionBoard || showHistory || showResults);
  workspaceNavButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.appView === appView);
  });
  if (showActionBoard) {
    stopReplay();
    updateSubhead();
    if (signalHistoryData) {
      renderConfluenceScanner();
    } else {
      if (actionHistoryNote) actionHistoryNote.textContent = "Loading shared server baseline…";
      loadSignalHistory();
    }
  } else if (showHistory) {
    stopReplay();
    updateSubhead();
    if (signalHistoryData) renderSignalHistory();
    else loadSignalHistory();
  } else if (showResults) {
    stopReplay();
    updateSubhead();
    if (signalHistoryData) renderSignalOutcomes();
    else loadSignalHistory();
  } else {
    if (replayActive) updateReplaySubhead();
    else updateSubhead();
    renderCurrentChart();
  }
}

function renderCurrentChart() {
  buildChart(replayActive ? replayStocksAt(replayFrameIndex) : lastStocks);
  if (appView === "action") {
    renderConfluenceScanner();
  } else if (appView === "history") {
    renderSignalHistory();
  } else if (appView === "results") {
    renderSignalOutcomes();
  } else {
    renderMomentumScanner();
    renderWeaknessScanner();
  }
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
    syncSectorFilterButtons();
    if (backBtn) backBtn.classList.add("visible");
  } else {
    viewMode = "sector";
    selectedSector = null;
    syncSectorFilterButtons();
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
  if (appView === "action") setAppView("replay");
  else renderCurrentChart();
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
  if (appView === "action") {
    metricSubhead.textContent = "Multi-timeframe leadership and weakness across the selected universe.";
    return;
  }
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
  if (!active) {
    if (appView === "action") {
      renderConfluenceScanner();
    } else {
      renderMomentumScanner();
      renderWeaknessScanner();
    }
  }
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
    lastAsOf = data.asOf || null;
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
    syncSectorFilterButtons();
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
    syncSectorFilterButtons();
    backBtn.classList.remove("visible");
    updateSubhead();
    if (replayActive) {
      calculateReplayRange();
      updateReplaySubhead();
    }
    renderCurrentChart();
  });
}

sectorFilterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    activeFilter = "all";
    viewMode = "subindustry";
    selectedSector = button.dataset.sector;
    filterButtons.forEach((filterButton) => {
      filterButton.classList.toggle("active", filterButton.dataset.filter === "all");
    });
    syncSectorFilterButtons();
    if (backBtn) backBtn.classList.add("visible");
    updateSubhead();
    if (replayActive) {
      calculateReplayRange();
      updateReplaySubhead();
    }
    renderCurrentChart();
  });
});

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

momentumModeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    momentumMode = button.dataset.momentumMode || "persistent";
    renderMomentumScanner();
  });
});

weaknessModeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    weaknessMode = button.dataset.weaknessMode || "persistent";
    renderWeaknessScanner();
  });
});

if (momentumList) {
  momentumList.addEventListener("click", (event) => {
    const result = event.target.closest(".momentum-result[data-symbol]");
    if (!result) return;
    pinnedSymbols.add(result.dataset.symbol);
    tickerSearchStatus.textContent = `Pinned ${result.dataset.symbol} from momentum scan.`;
    renderCurrentChart();
  });
}

if (weaknessList) {
  weaknessList.addEventListener("click", (event) => {
    const result = event.target.closest(".momentum-result[data-symbol]");
    if (!result) return;
    pinnedSymbols.add(result.dataset.symbol);
    tickerSearchStatus.textContent = `Pinned ${result.dataset.symbol} from weakness scan.`;
    renderCurrentChart();
  });
}

[shortConfluenceList, longConfluenceList, shortNegativeConfluenceList, longNegativeConfluenceList]
  .forEach((list) => {
  if (!list) return;
  list.addEventListener("click", (event) => {
    const result = event.target.closest(".confluence-result[data-symbol]");
    if (!result) return;
    pinnedSymbols.add(result.dataset.symbol);
    tickerSearchStatus.textContent = `Pinned ${result.dataset.symbol} from timeframe confluence.`;
    setAppView("replay");
  });
});

workspaceNavButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setAppView(button.dataset.appView);
  });
});

actionSideButtons.forEach((button) => {
  button.addEventListener("click", () => {
    actionBoardSide = button.dataset.actionSide === "bearish" ? "bearish" : "bullish";
    renderConfluenceScanner();
  });
});

historySideButtons.forEach((button) => {
  button.addEventListener("click", () => {
    signalHistorySide = button.dataset.historySide === "bearish" ? "bearish" : "bullish";
    renderSignalHistory();
  });
});

resultsSideButtons.forEach((button) => {
  button.addEventListener("click", () => {
    signalResultsSide = button.dataset.resultsSide === "bearish" ? "bearish" : "bullish";
    signalResultsSetup = signalResultsSide === "bearish" ? "bounce" : "pullback";
    renderSignalOutcomes();
  });
});

resultsSetupButtons.forEach((button) => {
  button.addEventListener("click", () => {
    signalResultsSetup = button.dataset.resultsSetup;
    renderSignalOutcomes();
  });
});

signalSessionPicker?.addEventListener("click", (event) => {
  const button = event.target.closest(".signal-session-btn[data-session]");
  if (!button) return;
  selectedHistorySession = button.dataset.session;
  renderSignalHistory();
});

[signalChangeList, signalPersistenceList, signalOutcomeList].forEach((list) => {
  list?.addEventListener("click", (event) => {
    const result = event.target.closest("[data-symbol]");
    if (!result) return;
    pinnedSymbols.add(result.dataset.symbol);
    tickerSearchStatus.textContent = `Pinned ${result.dataset.symbol} from ${
      list === signalOutcomeList ? "Signal Results" : "Signal History"
    }.`;
    setAppView("replay");
  });
});

[newAccelerationList, confirmedLeadersList, pullbackTrendList, breakdownWarningList]
  .forEach((list) => {
    if (!list) return;
    list.addEventListener("click", (event) => {
      const result = event.target.closest(".action-bucket-result[data-symbol]");
      if (!result) return;
      openActionDrawer(result.dataset.bucket, result.dataset.symbol);
    });
  });

actionDrawerClose?.addEventListener("click", closeActionDrawer);
actionDrawerBackdrop?.addEventListener("click", closeActionDrawer);
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !actionDrawer?.hidden) closeActionDrawer();
});
actionDrawerPin?.addEventListener("click", () => {
  if (!activeActionDetail) return;
  pinnedSymbols.add(activeActionDetail.symbol);
  tickerSearchStatus.textContent = `Pinned ${activeActionDetail.symbol} from Action Board.`;
  closeActionDrawer();
  setAppView("replay");
});

updateSubhead();
setMetric("changePercent");
loadData();
