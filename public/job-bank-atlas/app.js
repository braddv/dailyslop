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

const mapRoot = document.querySelector("#stateMap");
const detail = document.querySelector("#stateDetail");

function pressureLabel(rate) {
  const delta = rate - NATIONAL_RATE;
  if (delta >= 0.8) return "Elevated relative to the U.S.";
  if (delta <= -0.8) return "Low relative to the U.S.";
  return "Near the U.S. rate";
}

function renderDetail(id) {
  const [name, rate] = stateRates[id];
  const delta = rate - NATIONAL_RATE;
  const direction = delta === 0 ? "equal to" : `${Math.abs(delta).toFixed(1)} point${Math.abs(delta) === 1 ? "" : "s"} ${delta > 0 ? "above" : "below"}`;

  detail.innerHTML = `
    <p class="detail-label">SELECTED STATE</p>
    <h3>${name}</h3>
    <strong>${rate.toFixed(1)}%</strong>
    <p class="comparison">${direction} the 4.1% national rate</p>
    <dl>
      <div><dt>Pressure reading</dt><dd>${pressureLabel(rate)}</dd></div>
      <div><dt>Evidence through</dt><dd>July 2026 · preliminary</dd></div>
      <div><dt>What comes next</dt><dd>County unemployment counts, participation, public-need indicators and sponsor capacity</dd></div>
    </dl>
    <p class="detail-note">This rate locates broad labor-market pressure. It is not a job recommendation and cannot describe the circumstances, skills or preferences of any individual worker.</p>
  `;
}

async function renderMap() {
  if (!globalThis.d3 || !globalThis.topojson) {
    throw new Error("Map libraries did not load.");
  }

  const response = await fetch("https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json");
  if (!response.ok) throw new Error(`State geography returned ${response.status}.`);
  const topology = await response.json();
  const states = topojson.feature(topology, topology.objects.states);
  const features = states.features.filter((feature) => stateRates[String(feature.id).padStart(2, "0")]);
  const collection = { type: "FeatureCollection", features };
  const width = 920;
  const height = 560;
  const projection = d3.geoAlbersUsa().fitExtent([[16, 16], [width - 16, height - 16]], collection);
  const path = d3.geoPath(projection);
  const color = d3.scaleLinear().domain([2, 4.1, 5.9]).range(["#f2e4d2", "#e69b68", "#c4462d"]);

  mapRoot.innerHTML = "";
  const svg = d3.select(mapRoot)
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("role", "img")
    .attr("aria-label", "United States map colored by July 2026 state unemployment rate");

  svg.append("title").text("State unemployment rates, July 2026");
  svg.append("desc").text("Select a state to compare its preliminary seasonally adjusted unemployment rate with the national rate of 4.1 percent.");

  svg.selectAll("path")
    .data(features)
    .join("path")
    .attr("class", "state-shape")
    .attr("d", path)
    .attr("fill", (feature) => color(stateRates[String(feature.id).padStart(2, "0")][1]))
    .attr("stroke", "#fffdf8")
    .attr("stroke-width", 1.2)
    .attr("tabindex", 0)
    .attr("role", "button")
    .attr("aria-label", (feature) => {
      const [name, rate] = stateRates[String(feature.id).padStart(2, "0")];
      return `${name}, ${rate.toFixed(1)} percent unemployment`;
    })
    .on("click", selectState)
    .on("keydown", (event, feature) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        selectState.call(event.currentTarget, event, feature);
      }
    })
    .append("title")
    .text((feature) => {
      const [name, rate] = stateRates[String(feature.id).padStart(2, "0")];
      return `${name}: ${rate.toFixed(1)}%`;
    });

  function selectState(event, feature) {
    const id = String(feature.id).padStart(2, "0");
    svg.selectAll(".state-shape").classed("active", false);
    d3.select(this).classed("active", true);
    renderDetail(id);
  }
}

renderMap().catch((error) => {
  console.error(error);
  mapRoot.innerHTML = `<p class="map-loading">The map could not load. The state data and official BLS source remain available on this page.</p>`;
});
