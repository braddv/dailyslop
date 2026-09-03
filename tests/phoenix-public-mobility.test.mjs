import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { calculateScenario } from "../public/phoenix-public-mobility/model.js";

const html = await readFile(new URL("../public/phoenix-public-mobility/index.html", import.meta.url), "utf8");
const jobGuaranteeHtml = await readFile(new URL("../public/job-guarantee/index.html", import.meta.url), "utf8");
const jobAtlasHtml = await readFile(new URL("../public/job-bank-atlas/index.html", import.meta.url), "utf8");
const vercel = JSON.parse(await readFile(new URL("../vercel.json", import.meta.url), "utf8"));

test("public Phoenix mobility page documents feasibility, congestion, logistics, and sources", () => {
  assert.match(html, /Buildable in phases/);
  assert.match(html, /Autonomy does not[\s\S]*automatically help/);
  assert.match(html, /One network[\s\S]*Three service patterns/);
  assert.match(html, /Waymo does not currently sell an off-the-shelf public bus-and-van system/);
  assert.match(html, /Concept model · not an official forecast or procurement estimate/);
  assert.match(html, /azmag\.gov/);
  assert.match(html, /fhwa\.dot\.gov/);
  assert.match(html, /waymo\.com/);
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
