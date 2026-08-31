import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { SERIES, buildPayload, parseFredCsv } = require('../api/_lib/sectoral-balances');

const entries = await Promise.all(SERIES.map(async (definition) => {
  const url = `https://fred.stlouisfed.org/graph/fredgraph.csv?id=${encodeURIComponent(definition.id)}`;
  const response = await fetch(url, { headers: { 'user-agent': 'DailySlop seed builder/1.0' } });
  if (!response.ok) throw new Error(`${definition.id}: HTTP ${response.status}`);
  return [definition.key, parseFredCsv(await response.text(), definition.id)];
}));

const payload = buildPayload(Object.fromEntries(entries));
const output = path.resolve('public/sectoral-balances/data/sectoral-balances.json');
await fs.mkdir(path.dirname(output), { recursive: true });
await fs.writeFile(output, `${JSON.stringify(payload, null, 2)}\n`);
console.log(`Wrote ${payload.observations.length} complete quarters through ${payload.latestCompleteQuarter}`);
