import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const seed = JSON.parse(await readFile(
  new URL('../public/sp500ad/data/sector-ad.json', import.meta.url),
  'utf8'
));

test('S&P 500 seed reflects the AVB/EQR merger and Reddit addition', () => {
  const symbols = new Set(seed.stocks.map((stock) => stock.symbol));
  assert.equal(symbols.has('AVB'), false);
  assert.equal(symbols.has('EQR'), false);
  assert.equal(symbols.has('RDDT'), true);
  assert.equal(symbols.has('VMRK'), true);

  const reddit = seed.stocks.find((stock) => stock.symbol === 'RDDT');
  const vivmark = seed.stocks.find((stock) => stock.symbol === 'VMRK');
  assert.equal(reddit.sector, 'Communication Services');
  assert.equal(vivmark.sector, 'Real Estate');
});
