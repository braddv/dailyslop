const NATIONAL_RATE = 4.1;

const stateRates = {
  "01": ["Alabama", 3.4], "02": ["Alaska", 4.3], "04": ["Arizona", 4.9],
  "05": ["Arkansas", 4.0], "06": ["California", 5.1], "08": ["Colorado", 3.9],
  "09": ["Connecticut", 5.2], "10": ["Delaware", 4.8], "11": ["District of Columbia", 5.9],
  "12": ["Florida", 4.6], "13": ["Georgia", 3.3], "15": ["Hawaii", 2.7],
  "16": ["Idaho", 3.6], "17": ["Illinois", 4.9], "18": ["Indiana", 3.3],
  "19": ["Iowa", 3.2], "20": ["Kansas", 3.8], "21": ["Kentucky", 4.7],
  "22": ["Louisiana", 4.4], "23": ["Maine", 3.1], "24": ["Maryland", 4.2],
  "25": ["Massachusetts", 4.4], "26": ["Michigan", 4.9], "27": ["Minnesota", 4.3],
  "28": ["Mississippi", 3.6], "29": ["Missouri", 3.6], "30": ["Montana", 3.2],
  "31": ["Nebraska", 2.9], "32": ["Nevada", 5.0], "33": ["New Hampshire", 2.8],
  "34": ["New Jersey", 4.4], "35": ["New Mexico", 4.8], "36": ["New York", 4.4],
  "37": ["North Carolina", 3.6], "38": ["North Dakota", 2.2], "39": ["Ohio", 3.4],
  "40": ["Oklahoma", 4.3], "41": ["Oregon", 5.2], "42": ["Pennsylvania", 3.9],
  "44": ["Rhode Island", 3.9], "45": ["South Carolina", 4.2], "46": ["South Dakota", 2.0],
  "47": ["Tennessee", 3.4], "48": ["Texas", 4.5], "49": ["Utah", 3.6],
  "50": ["Vermont", 2.6], "51": ["Virginia", 3.7], "53": ["Washington", 5.0],
  "54": ["West Virginia", 4.1], "55": ["Wisconsin", 3.3], "56": ["Wyoming", 3.0]
};

const needs = globalThis.JOB_BANK_NEEDS?.values || {};
const stateIds = Object.keys(stateRates);

const layers = {
  unemployment: {
    label: "Unemployment",
    metric: "Unemployment rate",
    vintage: "BLS LAUS · July 2026 (preliminary)",
    sourceLabel: "U.S. Bureau of Labor Statistics, Local Area Unemployment Statistics ↗",
    source: "https://www.bls.gov/web/laus/laumstrk.htm",
    national: NATIONAL_RATE,
    value: (id) => stateRates[id]?.[1],
    description: "Seasonally adjusted unemployment rate. This is the labor-slack layer, not a measure of community service needs.",
    projects: "Local project planning across all approved categories",
    caveat: "This rate locates broad labor-market pressure. It cannot describe the circumstances, skills or preferences of any individual worker."
  },
  olderAdults: {
    label: "Older adults",
    metric: "Population age 65+",
    vintage: "U.S. Census ACS · 2024 1-year",
    sourceLabel: "U.S. Census Bureau, ACS table B01001 ↗",
    source: "https://data.census.gov/table/ACSDT1Y2024.B01001",
    national: needs.US?.olderAdults,
    value: (id) => needs[id]?.olderAdults,
    description: "Residents age 65 and over as a share of population—a screening proxy for potential elder-support demand, not a measured care-worker shortage.",
    projects: "Senior outreach · home accessibility · meal support · transportation",
    caveat: "Age structure indicates where care needs may be concentrated. Actual positions require service-gap evidence, qualified supervision and appropriate screening."
  },
  childPoverty: {
    label: "Child poverty",
    metric: "Children below poverty",
    vintage: "U.S. Census ACS · 2024 1-year",
    sourceLabel: "U.S. Census Bureau, ACS table B17001 ↗",
    source: "https://data.census.gov/table/ACSDT1Y2024.B17001",
    national: needs.US?.childPoverty,
    value: (id) => needs[id]?.childPoverty,
    description: "People under 18 below the poverty threshold as a share of children whose poverty status is determined.",
    projects: "Tutoring · after-school support · food access · family-resource navigation",
    caveat: "Poverty is a material hardship indicator, not a finding that a particular child or family needs a specific service. Local institutions must validate the service gap."
  },
  rentBurden: {
    label: "Rent burden",
    metric: "Renters paying 30%+",
    vintage: "U.S. Census ACS · 2024 1-year",
    sourceLabel: "U.S. Census Bureau, ACS table B25070 ↗",
    source: "https://data.census.gov/table/ACSDT1Y2024.B25070",
    national: needs.US?.rentBurden,
    value: (id) => needs[id]?.rentBurden,
    description: "Cash-renter households spending at least 30% of income on gross rent, excluding households for which the ratio cannot be computed.",
    projects: "Weatherization · housing rehabilitation · tenant navigation · energy outreach",
    caveat: "Cost burden demonstrates housing pressure. It does not by itself identify a repair backlog or authorize construction work."
  },
  uninsured: {
    label: "Uninsured",
    metric: "Residents uninsured",
    vintage: "U.S. Census ACS · 2024 1-year",
    sourceLabel: "U.S. Census Bureau, ACS table B27010 ↗",
    source: "https://data.census.gov/table/ACSDT1Y2024.B27010",
    national: needs.US?.uninsured,
    value: (id) => needs[id]?.uninsured,
    description: "Civilian noninstitutionalized residents without health-insurance coverage as a share of that population.",
    projects: "Coverage outreach · enrollment navigation · appointment support · health education",
    caveat: "Insurance status supports outreach planning. It is not a substitute for health-outcome data and does not estimate demand for licensed clinical work."
  }
};

const mapRoot = document.querySelector("#stateMap");
const detail = document.querySelector("#stateDetail");
const controls = document.querySelector("#layerControls");
const description = document.querySelector("#layerDescription");
const datasetLabel = document.querySelector("#mapDatasetLabel");
const sourceLink = document.querySelector("#mapSourceLink");
const legendLow = document.querySelector("#legendLow");
const legendHigh = document.querySelector("#legendHigh");
const legendBar = document.querySelector("#mapLegend i");

let activeLayerKey = "unemployment";
let selectedStateId = null;
let svg;

function interpolateHex(start, end, amount) {
  const channels = [1, 3, 5].map((offset) => {
    const from = Number.parseInt(start.slice(offset, offset + 2), 16);
    const to = Number.parseInt(end.slice(offset, offset + 2), 16);
    return Math.round(from + ((to - from) * amount)).toString(16).padStart(2, "0");
  });
  return `#${channels.join("")}`;
}

function colorForValue(value, minimum, midpoint, maximum) {
  if (value <= midpoint) {
    const range = midpoint - minimum || 1;
    return interpolateHex("#f2e4d2", "#e69b68", Math.max(0, Math.min(1, (value - minimum) / range)));
  }
  const range = maximum - midpoint || 1;
  return interpolateHex("#e69b68", "#c4462d", Math.max(0, Math.min(1, (value - midpoint) / range)));
}

function formatPercent(value) {
  return `${Number(value).toFixed(1)}%`;
}

function comparisonText(value, national) {
  const delta = value - national;
  if (Math.abs(delta) < 0.05) return `equal to the ${formatPercent(national)} national value`;
  return `${Math.abs(delta).toFixed(1)} point${Math.abs(delta) === 1 ? "" : "s"} ${delta > 0 ? "above" : "below"} the ${formatPercent(national)} national value`;
}

function relativeReading(value, national) {
  const delta = value - national;
  if (delta >= 1) return "Above the national screening value";
  if (delta <= -1) return "Below the national screening value";
  return "Near the national screening value";
}

function layerRange(layer) {
  const values = stateIds.map((id) => layer.value(id)).filter(Number.isFinite);
  return [Math.min(...values), Math.max(...values)];
}

function renderDetail() {
  const layer = layers[activeLayerKey];
  const id = selectedStateId;
  const name = id ? stateRates[id][0] : "United States";
  const value = id ? layer.value(id) : layer.national;
  const [minimum, maximum] = layerRange(layer);
  const comparison = id ? comparisonText(value, layer.national) : `${layer.metric} · national value`;
  const special = !id && activeLayerKey === "unemployment"
    ? `<div><dt>Unemployed people</dt><dd>6.9 million</dd></div>`
    : "";

  detail.innerHTML = `
    <p class="detail-label">${id ? "SELECTED STATE" : "NATIONAL BASELINE"}</p>
    <h3>${name}</h3>
    <strong>${formatPercent(value)}</strong>
    <p class="comparison">${comparison}</p>
    <dl>
      ${special}
      <div><dt>Indicator reading</dt><dd>${id ? relativeReading(value, layer.national) : `State range: ${formatPercent(minimum)}–${formatPercent(maximum)}`}</dd></div>
      <div><dt>Evidence through</dt><dd>${layer.vintage.replace(" · ", " · ")}</dd></div>
      <div><dt>Candidate project families</dt><dd>${layer.projects}</dd></div>
    </dl>
    <p class="detail-note">${layer.caveat}</p>
  `;
}

function updateMap() {
  const layer = layers[activeLayerKey];
  const [minimum, maximum] = layerRange(layer);
  const midpoint = layer.national;

  description.textContent = layer.description;
  datasetLabel.textContent = layer.vintage.toUpperCase();
  sourceLink.textContent = layer.sourceLabel;
  sourceLink.href = layer.source;
  legendLow.textContent = formatPercent(minimum);
  legendHigh.textContent = formatPercent(maximum);
  legendBar.style.background = "linear-gradient(90deg,#f2e4d2,#e69b68,#c4462d)";

  controls.querySelectorAll("button").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.layer === activeLayerKey));
  });

  if (svg) {
    svg.setAttribute("aria-label", `United States map colored by ${layer.metric.toLowerCase()}`);
    svg.querySelector("title").textContent = `${layer.metric} by state`;
    svg.querySelector("desc").textContent = `Select a state to compare its ${layer.metric.toLowerCase()} with the national value of ${formatPercent(layer.national)}.`;
    svg.querySelectorAll(".state-shape").forEach((shape) => {
      const id = shape.dataset.stateId;
      shape.setAttribute("fill", colorForValue(layer.value(id), minimum, midpoint, maximum));
      shape.setAttribute("aria-label", `${stateRates[id][0]}, ${formatPercent(layer.value(id))} ${layer.metric.toLowerCase()}`);
      shape.querySelector("title").textContent = `${stateRates[id][0]}: ${formatPercent(layer.value(id))}`;
    });
  }

  renderDetail();
}

function renderControls() {
  controls.innerHTML = Object.entries(layers).map(([key, layer]) => (
    `<button type="button" data-layer="${key}" aria-pressed="${key === activeLayerKey}">${layer.label}</button>`
  )).join("");

  controls.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-layer]");
    if (!button || button.dataset.layer === activeLayerKey) return;
    activeLayerKey = button.dataset.layer;
    updateMap();
  });
}

function renderMap() {
  const map = globalThis.JOB_BANK_STATE_PATHS;
  if (!map || !globalThis.JOB_BANK_NEEDS) throw new Error("Local map or public-need data did not load.");
  const namespace = "http://www.w3.org/2000/svg";
  mapRoot.innerHTML = "";
  svg = document.createElementNS(namespace, "svg");
  svg.setAttribute("viewBox", map.viewBox);
  svg.setAttribute("role", "img");
  svg.append(document.createElementNS(namespace, "title"), document.createElementNS(namespace, "desc"));

  Object.entries(map.paths).forEach(([id, pathData]) => {
    const shape = document.createElementNS(namespace, "path");
    shape.dataset.stateId = id;
    shape.setAttribute("class", "state-shape");
    shape.setAttribute("d", pathData);
    shape.setAttribute("stroke", "#fffdf8");
    shape.setAttribute("stroke-width", "1.2");
    shape.setAttribute("tabindex", "0");
    shape.setAttribute("role", "button");
    shape.append(document.createElementNS(namespace, "title"));
    shape.addEventListener("click", selectState);
    shape.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        selectState.call(event.currentTarget);
      }
    });
    svg.append(shape);
  });
  mapRoot.append(svg);

  function selectState() {
    selectedStateId = this.dataset.stateId;
    svg.querySelectorAll(".state-shape").forEach((shape) => shape.classList.remove("active"));
    this.classList.add("active");
    renderDetail();
  }

  updateMap();
}

renderControls();
updateMap();
try {
  renderMap();
} catch (error) {
  console.error(error);
  mapRoot.innerHTML = `<p class="map-loading">The map could not load. The indicator definitions and official sources remain available on this page.</p>`;
}
