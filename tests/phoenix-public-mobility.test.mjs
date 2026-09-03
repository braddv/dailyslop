import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { calculatePeakScenario, calculateScenario, calculateTransitComparisons } from "../public/phoenix-public-mobility/model.js";

const html = await readFile(new URL("../public/phoenix-public-mobility/index.html", import.meta.url), "utf8");
const jobGuaranteeHtml = await readFile(new URL("../public/job-guarantee/index.html", import.meta.url), "utf8");
const jobAtlasHtml = await readFile(new URL("../public/job-bank-atlas/index.html", import.meta.url), "utf8");
const vercel = JSON.parse(await readFile(new URL("../vercel.json", import.meta.url), "utf8"));

test("public Phoenix mobility page presents the concise network, commute story, costs, and sources", () => {
  assert.doesNotMatch(html, /subway/i);
  assert.match(html, /Waymo[\s\S]*for/);
  assert.match(html, /35\.3 miles of light rail/);
  assert.match(html, /35th\/Van Buren/);
  assert.match(html, /Camelback\/24th/);
  assert.match(html, /Thomas\/44th/);
  assert.match(html, /Mesa home[\s\S]*Tempe job/);
  assert.match(html, /Gilbert Road station/);
  assert.match(html, /≈261K/);
  assert.match(html, /≈80K/);
  assert.match(html, /≈18K/);
  assert.match(html, /\$102\.0–102\.7B/);
  assert.match(html, /\$13\.5B/);
  assert.match(html, /Concept model · pooling required · not a procurement estimate/);
  assert.match(html, /azmag\.gov/);
});

test("peak simulation makes the larger daily or peak fleet requirement govern", () => {
  const scenario = calculateScenario();
  const defaultPeak = calculatePeakScenario(scenario);
  const concentratedPeak = calculatePeakScenario(scenario, { peakHourShare: 0.18 });
  assert.equal(defaultPeak.governingFleetOwned, Math.max(defaultPeak.dailyFleetOwned, defaultPeak.peakFleetOwned));
  assert.equal(concentratedPeak.governingFleetOwned, concentratedPeak.peakFleetOwned);
  assert.ok(concentratedPeak.peakFleetOwned > defaultPeak.peakFleetOwned);
  assert.ok(defaultPeak.directionalImbalance > 0);
  assert.ok(defaultPeak.peakAdjustedCapital >= scenario.initialCapital);
});

test("transit comparison converts the same capital into transparent route-mile ranges", () => {
  const capital = 100_000_000_000;
  const comparisons = calculateTransitComparisons(capital);
  assert.equal(comparisons.length, 3);
  assert.ok(comparisons.every((item) => item.routeMilesMin > 0 && item.routeMilesMax >= item.routeMilesMin));
  const brt = comparisons.find((item) => item.id === "brt");
  const lightRail = comparisons.find((item) => item.id === "lightRail");
  const subway = comparisons.find((item) => item.id === "subway");
  assert.ok(brt.routeMilesMin > lightRail.routeMilesMax);
  assert.ok(lightRail.routeMilesMin > subway.routeMilesMax);
});

test("pooling lowers the peak fleet requirement", () => {
  const mixed = calculatePeakScenario(calculateScenario());
  const carsOnly = calculatePeakScenario(calculateScenario({ shares: { car: 1, van: 0, bus: 0 } }));
  assert.ok(mixed.peakFleetOwned < carsOnly.peakFleetOwned);
});

test("default 80 percent public-fleet scenario separates passenger demand from fleet VMT", () => {
  const scenario = calculateScenario();
  assert.equal(scenario.replacementRate, 0.8);
  assert.ok(scenario.shiftedPassengerMiles > scenario.displacedDailyVmt);
  assert.ok(scenario.dailyFleetMiles < scenario.displacedDailyVmt);
  assert.ok(scenario.regionalVmtChange < 0);
  assert.ok(scenario.initialCapital > 50_000_000_000);
  assert.ok(scenario.annualOperatingCost > 10_000_000_000);
  assert.equal(scenario.fleet.length, 3);
});

test("unpooled robotaxis increase regional VMT while the pooled default reduces it", () => {
  const scenario = calculateScenario();
  assert.ok(scenario.trafficCases.unpooled > 0);
  assert.ok(scenario.trafficCases.modeled < 0);
  assert.ok(scenario.trafficCases.highPooling < scenario.trafficCases.modeled);
});

test("vehicle shares are normalized and incomplete outcomes are never implied", () => {
  const scenario = calculateScenario({ shares: { car: 0.6, van: 0.6, bus: 0.3 } });
  const sum = scenario.fleet.reduce((total, vehicle) => total + vehicle.share, 0);
  assert.ok(Math.abs(sum - 1) < Number.EPSILON * 10);
  assert.ok(scenario.fleet.every((vehicle) => Number.isFinite(vehicle.vehiclesOwned) && vehicle.vehiclesOwned > 0));
});

test("vercel exposes the Phoenix public mobility page and assets", () => {
  const rewrites = vercel.rewrites.map(({ source, destination }) => `${source} -> ${destination}`);
  assert.ok(rewrites.includes("/phoenix-public-mobility -> /public/phoenix-public-mobility/index.html"));
  assert.ok(rewrites.includes("/phoenix-public-mobility/:path* -> /public/phoenix-public-mobility/:path*"));
  assert.match(jobGuaranteeHtml, /href="\/phoenix-public-mobility"/);
  assert.match(jobAtlasHtml, /href="\/phoenix-public-mobility"/);
});
