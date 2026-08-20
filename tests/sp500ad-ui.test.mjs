import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("market data completion re-renders the Action Board scanner", async () => {
  const source = await readFile(
    new URL("../public/sp500ad/app.js", import.meta.url),
    "utf8"
  );

  assert.match(
    source,
    /if \(appView === "action"\) renderConfluenceScanner\(\);\s*else if \(appView === "watchlist"\) renderWatchlist\(\);\s*else buildChart\(lastStocks\);/,
    "loadData must re-render the scanner after populating the live stock universe"
  );
});
