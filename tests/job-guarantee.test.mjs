import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const html = await readFile(new URL("../public/job-guarantee/index.html", import.meta.url), "utf8");
const app = await readFile(new URL("../public/job-guarantee/app.js", import.meta.url), "utf8");
const atlasHtml = await readFile(new URL("../public/job-bank-atlas/index.html", import.meta.url), "utf8");
const atlasApp = await readFile(new URL("../public/job-bank-atlas/app.js", import.meta.url), "utf8");
const atlasNeeds = await readFile(new URL("../public/job-bank-atlas/needs-data.js", import.meta.url), "utf8");
const atlasPaths = await readFile(new URL("../public/job-bank-atlas/state-paths.js", import.meta.url), "utf8");
const vercel = JSON.parse(await readFile(new URL("../vercel.json", import.meta.url), "utf8"));

test("job guarantee page covers work, demand, VISTA, macro effects, and guardrails", () => {
  assert.match(html, /What work could people do\?/);
  assert.match(html, /How do we know these jobs are needed\?/);
  assert.match(html, /VISTA proved the architecture/);
  assert.match(html, /America has pieces of a job bank/);
  assert.match(html, /American Job Centers/);
  assert.match(html, /Senior Community Service Employment Program/);
  assert.match(html, /Public Lands Corps \+ YCC/);
  assert.match(html, /California Service Corps/);
  assert.match(html, /How the existing systems compare with a genuine guarantee/);
  assert.match(html, /Economic transmission/);
  assert.match(html, /Design against the obvious risks/);
  assert.match(html, /gross-payroll illustration, not an official budget score/i);
  assert.doesNotMatch(html, /href="\/sp500ad"/);
  assert.doesNotMatch(html, /href="\/intermarket"/);
  assert.doesNotMatch(html, /href="\/sectoral-balances"/);
  assert.match(html, /href="\/job-bank-atlas"/);
  assert.match(html, /Open Job Bank Atlas/);
});

test("job guarantee scenario labels its major categories and computes direct wages", () => {
  assert.match(app, /Education \+ care/);
  assert.match(app, /Land \+ resilience/);
  assert.match(app, /const annualIncome = wage \* hours \* 52/);
  assert.match(app, /const payroll = participants \* annualIncome/);
});

test("vercel exposes the job guarantee page and its static assets", () => {
  const rewrites = vercel.rewrites.map(({ source, destination }) => `${source} -> ${destination}`);
  assert.ok(rewrites.includes("/job-guarantee -> /public/job-guarantee/index.html"));
  assert.ok(rewrites.includes("/job-guarantee/:path* -> /public/job-guarantee/:path*"));
  assert.ok(rewrites.includes("/job-bank-atlas -> /public/job-bank-atlas/index.html"));
  assert.ok(rewrites.includes("/job-bank-atlas/:path* -> /public/job-bank-atlas/:path*"));
});

test("job bank atlas maps official state unemployment and documents the matching model", () => {
  assert.match(atlasHtml, /Where people need work/);
  assert.match(atlasHtml, /Map the opportunity—not the person/);
  assert.match(atlasHtml, /BLS LAUS · JULY 2026/);
  assert.match(atlasHtml, /Illustrative · not an estimate/);
  assert.match(atlasHtml, /Public-need indicator definitions/);
  assert.match(atlasHtml, /Rent burden/);
  assert.match(atlasHtml, /href="\/job-guarantee"/);
  assert.doesNotMatch(atlasHtml, /href="\/sp500ad"/);
  assert.doesNotMatch(atlasHtml, /href="\/intermarket"/);
  assert.match(atlasApp, /const NATIONAL_RATE = 4\.1/);
  assert.match(atlasApp, /"11": \["District of Columbia", 5\.9\]/);
  assert.match(atlasApp, /"46": \["South Dakota", 2\.0\]/);
  assert.match(atlasApp, /childPoverty/);
  assert.match(atlasApp, /rentBurden/);
  assert.match(atlasApp, /uninsured/);
  assert.match(atlasNeeds, /"olderAdults": 18/);
  assert.match(atlasNeeds, /"rentBurden": 51\.8/);
  assert.match(atlasNeeds, /"uninsured": 8\.2/);
});

test("job bank atlas loads its map locally without runtime CDN dependencies", () => {
  assert.match(atlasHtml, /src="\/job-bank-atlas\/state-paths\.js"/);
  assert.doesNotMatch(atlasHtml, /cdn\.jsdelivr\.net/);
  assert.doesNotMatch(atlasApp, /fetch\s*\(/);
  assert.doesNotMatch(atlasApp, /\bd3\b|\btopojson\b/);
  assert.match(atlasPaths, /globalThis\.JOB_BANK_STATE_PATHS/);
  assert.match(atlasPaths, /"viewBox":"0 0 920 560"/);
  assert.match(atlasPaths, /"06":"M/);
});
