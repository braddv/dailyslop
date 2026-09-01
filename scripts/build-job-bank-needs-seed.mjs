import { writeFile } from "node:fs/promises";

const YEAR = 2024;
const BASE = `https://www2.census.gov/programs-surveys/acs/summary_file/${YEAR}/table-based-SF/data/1YRData`;
const OUTPUT = new URL("../public/job-bank-atlas/needs-data.js", import.meta.url);

const stateNames = {
  "01":"Alabama", "02":"Alaska", "04":"Arizona", "05":"Arkansas", "06":"California",
  "08":"Colorado", "09":"Connecticut", "10":"Delaware", "11":"District of Columbia",
  "12":"Florida", "13":"Georgia", "15":"Hawaii", "16":"Idaho", "17":"Illinois",
  "18":"Indiana", "19":"Iowa", "20":"Kansas", "21":"Kentucky", "22":"Louisiana",
  "23":"Maine", "24":"Maryland", "25":"Massachusetts", "26":"Michigan", "27":"Minnesota",
  "28":"Mississippi", "29":"Missouri", "30":"Montana", "31":"Nebraska", "32":"Nevada",
  "33":"New Hampshire", "34":"New Jersey", "35":"New Mexico", "36":"New York",
  "37":"North Carolina", "38":"North Dakota", "39":"Ohio", "40":"Oklahoma", "41":"Oregon",
  "42":"Pennsylvania", "44":"Rhode Island", "45":"South Carolina", "46":"South Dakota",
  "47":"Tennessee", "48":"Texas", "49":"Utah", "50":"Vermont", "51":"Virginia",
  "53":"Washington", "54":"West Virginia", "55":"Wisconsin", "56":"Wyoming"
};

async function loadTable(id) {
  const url = `${BASE}/acsdt1y${YEAR}-${id.toLowerCase()}.dat`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${id} download failed with ${response.status}`);
  const lines = (await response.text()).trim().split(/\r?\n/);
  const header = lines.shift().split("|");
  const rows = new Map();

  for (const line of lines) {
    const values = line.split("|");
    const geo = values[0];
    if (geo === "0100000US" || /^0400000US\d{2}$/.test(geo)) {
      rows.set(geo === "0100000US" ? "US" : geo.slice(-2), Object.fromEntries(header.map((field, index) => [field, values[index]])));
    }
  }

  return rows;
}

function numeric(row, field) {
  const value = Number(row?.[field]);
  return Number.isFinite(value) && value >= 0 ? value : 0;
}

function sum(row, fields) {
  return fields.reduce((total, field) => total + numeric(row, field), 0);
}

function percent(numerator, denominator) {
  return denominator > 0 ? Math.round((numerator / denominator) * 1000) / 10 : null;
}

const [age, poverty, insurance, rent] = await Promise.all([
  loadTable("B01001"),
  loadTable("B17001"),
  loadTable("B27010"),
  loadTable("B25070")
]);

const olderFields = [20,21,22,23,24,25,44,45,46,47,48,49].map((number) => `B01001_E${String(number).padStart(3,"0")}`);
const childBelowFields = [4,5,6,7,8,9,18,19,20,21,22,23].map((number) => `B17001_E${String(number).padStart(3,"0")}`);
const childAboveFields = [33,34,35,36,37,38,47,48,49,50,51,52].map((number) => `B17001_E${String(number).padStart(3,"0")}`);
const uninsuredFields = [17,33,50,66].map((number) => `B27010_E${String(number).padStart(3,"0")}`);
const burdenFields = [7,8,9,10].map((number) => `B25070_E${String(number).padStart(3,"0")}`);

const needs = {};
for (const id of ["US", ...Object.keys(stateNames)]) {
  const ageRow = age.get(id);
  const povertyRow = poverty.get(id);
  const insuranceRow = insurance.get(id);
  const rentRow = rent.get(id);
  const childrenBelow = sum(povertyRow, childBelowFields);
  const childrenAbove = sum(povertyRow, childAboveFields);
  const rentComputed = numeric(rentRow, "B25070_E001") - numeric(rentRow, "B25070_E011");

  needs[id] = {
    name: id === "US" ? "United States" : stateNames[id],
    olderAdults: percent(sum(ageRow, olderFields), numeric(ageRow, "B01001_E001")),
    childPoverty: percent(childrenBelow, childrenBelow + childrenAbove),
    rentBurden: percent(sum(rentRow, burdenFields), rentComputed),
    uninsured: percent(sum(insuranceRow, uninsuredFields), numeric(insuranceRow, "B27010_E001"))
  };
}

const payload = {
  vintage: "2024 ACS 1-year estimates",
  generatedAt: new Date().toISOString(),
  source: "https://www.census.gov/programs-surveys/acs/data/summary-file.html",
  values: needs
};

await writeFile(OUTPUT, `globalThis.JOB_BANK_NEEDS = ${JSON.stringify(payload, null, 2)};\n`, "utf8");
console.log(`Wrote ${Object.keys(needs).length} geographies to ${OUTPUT.pathname}`);
