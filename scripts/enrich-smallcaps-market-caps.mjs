import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const seedPath = path.resolve("public/smallcaps/data/universe.json");
const concurrency = Math.max(1, Number(process.env.CONCURRENCY || 4));
const limit = Number(process.env.LIMIT || 0);
const period2 = Math.floor(Date.now() / 1000);
const period1 = period2 - (550 * 24 * 60 * 60);

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function fetchMarketCap(symbol, attempt = 1) {
  const yahooSymbol = symbol.replaceAll(".", "-");
  const url = new URL(
    `https://query1.finance.yahoo.com/ws/fundamentals-timeseries/v1/finance/timeseries/${encodeURIComponent(yahooSymbol)}`
  );
  url.searchParams.set("symbol", yahooSymbol);
  url.searchParams.set("type", "quarterlyMarketCap");
  url.searchParams.set("period1", String(period1));
  url.searchParams.set("period2", String(period2));
  try {
    const response = await fetch(url, {
      headers: { "user-agent": "Mozilla/5.0 dailyslop-market-cap-refresh" },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    const values = data?.timeseries?.result?.[0]?.quarterlyMarketCap || [];
    const latest = values
      .map((row) => ({ timestamp: row.asOfDate || "", value: row.reportedValue?.raw }))
      .filter((row) => Number.isFinite(row.value) && row.value > 0)
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
      .at(-1);
    return latest?.value || null;
  } catch (error) {
    if (attempt >= 3) throw error;
    await sleep(500 * attempt);
    return fetchMarketCap(symbol, attempt + 1);
  }
}

const seed = JSON.parse(await fs.readFile(seedPath, "utf8"));
const stocks = limit > 0 ? seed.stocks.slice(0, limit) : seed.stocks;
let cursor = 0;
let completed = 0;
let populated = 0;
const failures = [];

async function worker() {
  while (cursor < stocks.length) {
    const stock = stocks[cursor];
    cursor += 1;
    try {
      const marketCap = await fetchMarketCap(stock.symbol);
      if (Number.isFinite(marketCap)) {
        stock.marketCap = marketCap;
        populated += 1;
      } else {
        failures.push(`${stock.symbol}: no quarterly market cap`);
      }
    } catch (error) {
      failures.push(`${stock.symbol}: ${error.message}`);
    }
    completed += 1;
    if (completed % 25 === 0 || completed === stocks.length) {
      process.stdout.write(`Fetched ${completed}/${stocks.length}; populated ${populated}\n`);
    }
    await sleep(80);
  }
}

await Promise.all(Array.from({ length: concurrency }, () => worker()));
await fs.writeFile(seedPath, `${JSON.stringify(seed, null, 2)}\n`);

process.stdout.write(`Saved ${populated} market caps to ${seedPath}\n`);
if (failures.length) {
  process.stdout.write(`Missing ${failures.length}: ${failures.slice(0, 20).join(" | ")}\n`);
}
