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

let lastStocks = [];
let selectedMetric = "changePercent";
let viewMode = "sector"; // sector | subindustry
let selectedSector = null;
const pinnedSymbols = new Set();
let activeFilter = "all";

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

function symLog(value, constant = 0.5) {
  const sign = Math.sign(value);
  const magnitude = Math.log1p(Math.abs(value) / constant);
  return sign * magnitude;
}

function buildTicks(min, max) {
  const base = [0, 0.5, 1, 2, 5, 10];
  const maxAbs = Math.max(Math.abs(min), Math.abs(max));
  const ticks = new Set([0]);
  base.forEach((t) => {
    if (t <= maxAbs) {
      ticks.add(t);
      ticks.add(-t);
    }
  });

  if (maxAbs > 10) {
    const extra = Math.ceil(maxAbs / 5) * 5;
    ticks.add(extra);
    ticks.add(-extra);
  }

  return Array.from(ticks).sort((a, b) => b - a);
}

function radiusScale(cap, minCap, maxCap, scaleFactor = 1) {
  if (!Number.isFinite(cap) || !Number.isFinite(minCap) || !Number.isFinite(maxCap)) {
    return 4.0 * scaleFactor;
  }
  const minR = 3 * scaleFactor;
  const maxR = 14 * scaleFactor;
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

function getGroups(stocks) {
  if (viewMode === "sector") {
    return {
      groups: SECTORS.map((sector) => ({ key: sector.gics, label: sector.label })),
      keyFn: (stock) => stock.sector,
      interactive: true,
    };
  }

  const filtered = stocks.filter((stock) => stock.sector === selectedSector && stock.subIndustry);
  const subIndustries = Array.from(new Set(filtered.map((s) => s.subIndustry))).sort();
  return {
    groups: subIndustries.map((name) => ({ key: name, label: name })),
    keyFn: (stock) => stock.subIndustry,
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

  let working = applyFilter(stocks);
  if (viewMode === "subindustry" && selectedSector) {
    working = working.filter((stock) => stock.sector === selectedSector);
  }

  const filtered = working.filter((stock) => Number.isFinite(stock[selectedMetric]));
  if (!filtered.length) {
    chartEl.innerHTML = "<div class=\"notes\">No stock data to render.</div>";
    return;
  }

  const minChange = Math.min(...filtered.map((s) => s[selectedMetric]));
  const maxChange = Math.max(...filtered.map((s) => s[selectedMetric]));
  const range = niceRange(minChange, maxChange);
  const minLog = symLog(range.min);
  const maxLog = symLog(range.max);
  const ticks = buildTicks(range.min, range.max);

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
        viewMode = "subindustry";
        selectedSector = group.key;
        if (backBtn) backBtn.classList.add("visible");
        updateSubhead();
        buildChart(lastStocks);
      });
    }
    svg.appendChild(label);
  });

  if (selectedMetric === "pctFrom52wHigh" || selectedMetric === "pctFrom12wHigh") {
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

    const jitter = jitterForSymbol(stock.symbol, sectorWidth);
    const x =
      padding.left + sectorWidth * sectorIndex + sectorWidth / 2 + jitter;
    const y =
      padding.top +
      ((maxLog - symLog(stock[selectedMetric])) / (maxLog - minLog)) *
        innerHeight +
      verticalJitter(stock.symbol);

    const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    dot.setAttribute("cx", x);
    dot.setAttribute("cy", y);
    const radius = useMarketCap
      ? radiusScale(stock.marketCap, minCap, maxCap, scaleFactor)
      : 3.0;
    dot.setAttribute("r", radius);
    dot.setAttribute("fill", SECTOR_COLORS[stock.sector] || "#7aa5ff");
    dot.setAttribute("class", "dot");

    const label = `
      <div><strong>${stock.symbol}</strong> • ${stock.security}</div>
      <div>Sector ${stock.sector}${stock.subIndustry ? ` • ${stock.subIndustry}` : ""}</div>
      <div>1W ${formatPerf(stock.perf1w)} · 1M ${formatPerf(stock.perf1m)} · 3M ${formatPerf(stock.perf3m)}</div>
      <div>From 12W High ${formatPerf(stock.pctFrom12wHigh)}</div>
      <div>From 52W High ${formatPerf(stock.pctFrom52wHigh)}</div>
      <div>Today ${formatPerf(stock.changePercent)}</div>
    `;
    dot.addEventListener("mouseenter", (event) => {
      showTooltip(event, label);
    });
    dot.addEventListener("mousemove", (event) => {
      showTooltip(event, label);
    });
    dot.addEventListener("mouseleave", hideTooltip);
    dot.addEventListener("click", (event) => {
      event.stopPropagation();
      if (pinnedSymbols.has(stock.symbol)) {
        pinnedSymbols.delete(stock.symbol);
      } else {
        pinnedSymbols.add(stock.symbol);
      }
      buildChart(lastStocks);
    });

    svg.appendChild(dot);

    if (pinnedSymbols.has(stock.symbol)) {
      const metricValue = stock[selectedMetric];
      const metricLabel = Number.isFinite(metricValue) ? `${metricValue.toFixed(2)}%` : "--";
      const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      text.setAttribute("x", x + 8);
      text.setAttribute("y", y - 8);
      text.setAttribute("class", "pinned-label");
      text.textContent = `${stock.symbol} ${metricLabel}`;
      pinnedLabels.push(text);
    }
  });

  pinnedLabels.forEach((label) => svg.appendChild(label));
  chartEl.appendChild(svg);
}

function setMetric(metric) {
  if (!METRICS[metric]) return;
  selectedMetric = metric;
  updateSubhead();
  if (metricToggle) {
    metricToggle.querySelectorAll(".toggle-btn").forEach((button) => {
      button.classList.toggle("active", button.dataset.metric === metric);
    });
  }
  buildChart(lastStocks);
}

async function loadData() {
  chartEl.innerHTML = "";
  notesEl.textContent = "";

  try {
    const res = await fetch("./data/sector-ad.json");
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Failed to load data");
    }

    const data = await res.json();
    asOfEl.textContent = formatDate(data.asOf);
    cacheEl.textContent = data.cacheFresh ? "Fresh" : "Stale";

    lastStocks = data.stocks || [];
    buildChart(lastStocks);

    if (data.failures && data.failures.length) {
      notesEl.textContent = `${data.failures.length} symbols missing quotes.`;
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
  loadData();
});

chartEl.addEventListener("click", () => {
  pinnedSymbols.clear();
  buildChart(lastStocks);
});

if (capToggle) {
  capToggle.addEventListener("change", () => {
    buildChart(lastStocks);
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
    buildChart(lastStocks);
  });
});

if (backBtn) {
  backBtn.addEventListener("click", () => {
    viewMode = "sector";
    selectedSector = null;
    backBtn.classList.remove("visible");
    updateSubhead();
    buildChart(lastStocks);
  });
}

window.addEventListener("resize", () => {
  buildChart(lastStocks);
});

updateSubhead();
setMetric("changePercent");
loadData();
