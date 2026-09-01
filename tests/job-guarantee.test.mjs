import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const html = await readFile(new URL("../public/job-guarantee/index.html", import.meta.url), "utf8");
const app = await readFile(new URL("../public/job-guarantee/app.js", import.meta.url), "utf8");
const vercel = JSON.parse(await readFile(new URL("../vercel.json", import.meta.url), "utf8"));

test("job guarantee page covers work, demand, VISTA, macro effects, and guardrails", () => {
  assert.match(html, /What work could people do\?/);
  assert.match(html, /How do we know these jobs are needed\?/);
  assert.match(html, /VISTA proved the architecture/);
  assert.match(html, /Economic transmission/);
  assert.match(html, /Design against the obvious risks/);
  assert.match(html, /gross-payroll illustration, not an official budget score/i);
  assert.doesNotMatch(html, /href="\/sp500ad"/);
  assert.doesNotMatch(html, /href="\/intermarket"/);
  assert.doesNotMatch(html, /href="\/sectoral-balances"/);
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
});
