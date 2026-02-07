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

let lastStocks = [];
let selectedMetric = "changePercent";

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
  pctFrom52wHigh: {
    label: "52W High",
    subhead: "% from 52-week high by stock, grouped by sector.",
  },
};

const SECTORS = [
  { gics: "Materials", label: "XLB" },
  { gics: "Communication Services", label: "XLC" },
  { gics: "Information Technology", label: "XLK" },
  { gics: "Consumer Discretionary", label: "XLY" }, // Consumer Cyclical
  { gics: "Consumer Staples", label: "XLP" }, // Consumer Defensive
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

function radiusScale(cap, minCap, maxCap) {
  if (!Number.isFinite(cap) || !Number.isFinite(minCap) || !Number.isFinite(maxCap)) {
    return 4.0;
  }
  const minR = 3;
  const maxR = 14;
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

function buildYAxis(ticks) {
  yAxisEl.innerHTML = "";
  ticks.forEach((value) => {
    const label = document.createElement("div");
    label.textContent = `${value.toFixed(1)}%`;
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

function buildChart(stocks) {
  chartEl.innerHTML = "";

  const width = chartEl.clientWidth;
  const height = chartEl.clientHeight;
  const padding = { top: 20, right: 20, bottom: 40, left: 10 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  const filtered = stocks.filter((stock) => Number.isFinite(stock[selectedMetric]));
  if (!filtered.length) {
    chartEl.innerHTML = "<div class=\"notes\">No stock data to render.</div>";
    return;
  }

  const minChange = Math.min(...filtered.map((s) => s[selectedMetric]));
  const maxChange = Math.max(...filtered.map((s) => s[selectedMetric]));
  const range = niceRange(minChange, maxChange);
  const ticks = buildTicks(range.min, range.max);

  buildYAxis(ticks);

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);

  // Grid lines
  const minLog = symLog(range.min);
  const maxLog = symLog(range.max);

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

  const sectorWidth = innerWidth / SECTORS.length;

  // Sector dividers
  for (let i = 0; i <= SECTORS.length; i += 1) {
    const x = padding.left + sectorWidth * i;
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", x);
    line.setAttribute("x2", x);
    line.setAttribute("y1", padding.top);
    line.setAttribute("y2", height - padding.bottom);
    line.setAttribute("class", "grid-line");
    svg.appendChild(line);
  }

  // Sector labels
  SECTORS.forEach((sector, index) => {
    const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
    const x = padding.left + sectorWidth * index + sectorWidth / 2;
    label.setAttribute("x", x);
    label.setAttribute("y", height - 10);
    label.setAttribute("class", "sector-label");
    label.textContent = sector.label || sector.gics;
    svg.appendChild(label);
  });

  const useMarketCap = capToggle && capToggle.checked;
  const caps = filtered
    .map((s) => s.marketCap)
    .filter((value) => Number.isFinite(value) && value > 0);
  const minCap = caps.length ? Math.min(...caps) : null;
  const maxCap = caps.length ? Math.max(...caps) : null;

  // Stock dots
  filtered.forEach((stock) => {
    const sectorIndex = SECTORS.findIndex((sector) => sector.gics === stock.sector);
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
    const radius = useMarketCap ? radiusScale(stock.marketCap, minCap, maxCap) : 3.0;
    dot.setAttribute("r", radius);
    dot.setAttribute("fill", SECTOR_COLORS[stock.sector] || "#7aa5ff");
    dot.setAttribute("class", "dot");

    const label = `
      <div><strong>${stock.symbol}</strong> • ${stock.security}</div>
      <div>1W ${formatPerf(stock.perf1w)} · 1M ${formatPerf(stock.perf1m)} · 3M ${formatPerf(stock.perf3m)}</div>
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

    svg.appendChild(dot);
  });

  chartEl.appendChild(svg);
}

function setMetric(metric) {
  if (!METRICS[metric]) return;
  selectedMetric = metric;
  if (metricSubhead) {
    metricSubhead.textContent = METRICS[metric].subhead;
  }
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

window.addEventListener("resize", () => {
  buildChart(lastStocks);
});

setMetric("changePercent");
loadData();
