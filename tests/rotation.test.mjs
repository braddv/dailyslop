import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { buildRotationData } from '../public/rotation/model.js';

const html = await readFile(new URL('../public/rotation/index.html', import.meta.url), 'utf8');
const vercel = JSON.parse(await readFile(new URL('../vercel.json', import.meta.url), 'utf8'));

function series(multiplier, count = 30) {
  return Array.from({ length: count }, (_, index) => [
    Date.UTC(2026, 0, index + 1, 21) / 1000,
    100 + index * multiplier,
  ]);
}

test('rotation model calculates sector and subsector returns relative to SPY', () => {
  const result = buildRotationData({
    asOf: '2026-01-30T21:00:00.000Z',
    benchmarks: [
      { symbol: 'SPY', replayDaily: series(1) },
      { symbol: 'XLB', replayDaily: series(2) },
    ],
    stocks: [
      { symbol: 'AAA', security: 'Alpha', sector: 'Materials', subIndustry: 'Chemicals', marketCap: 200, replayDaily: series(3) },
      { symbol: 'BBB', security: 'Beta', sector: 'Materials', subIndustry: 'Chemicals', marketCap: 100, replayDaily: series(2) },
    ],
  }, 5);
  assert.equal(result.frames.length, 5);
  const latest = result.frames.at(-1);
  const sector = latest.sectors.find((point) => point.symbol === 'XLB');
  const subsector = latest.subIndustries.find((point) => point.label === 'Chemicals');
  assert.ok(sector.x > 0 && sector.y > 0);
  assert.ok(subsector.x > sector.x);
  assert.equal(subsector.count, 2);
  assert.equal(subsector.quadrant, 'leaders');
});

test('rotation page exposes selectable replay ranges, trails, and subsector drill-down', async () => {
  assert.match(html, /Sector Rotation/);
  assert.match(html, /5D × 20D relative to SPY/);
  assert.match(html, /data-view="subIndustries"/);
  assert.match(html, /id="subIndustryFilter"/);
  assert.match(html, /id="sectorFilter"/);
  assert.match(html, /data-range="1m"/);
  assert.match(html, /data-range="3m"/);
  assert.match(html, /data-range="6m"/);
  assert.match(html, /data-range="1y"/);
  assert.match(html, /Sector rotation timeline/);
  assert.match(html, /Leaders/);
  assert.match(html, /Fading/);
  assert.match(html, /Laggards/);
  assert.match(html, /Recovering/);
  const app = await readFile(new URL('../public/rotation/app.js', import.meta.url), 'utf8');
  assert.match(app, /bubble-trail/);
  assert.match(app, /state\.selectedId=point\.id;renderFrame\(\)/);
  assert.doesNotMatch(app, /if\(state\.view==='sectors'\)setView/);
  const rewrites = vercel.rewrites.map(({ source, destination }) => `${source} -> ${destination}`);
  assert.ok(rewrites.includes('/rotation -> /public/rotation/index.html'));
  assert.ok(rewrites.includes('/rotation/:path* -> /public/rotation/:path*'));
});
