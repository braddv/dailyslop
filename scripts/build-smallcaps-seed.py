#!/usr/bin/env python3
"""Build the checked-in S&P SmallCap 600 fallback from a downloaded table."""

import html
import json
import re
import sys
from pathlib import Path


def text(cell):
    value = re.sub(r"<[^>]+>", "", cell)
    return html.unescape(value).replace("\xa0", " ").strip()


source = Path(sys.argv[1] if len(sys.argv) > 1 else "/tmp/sp600.html")
target = Path(sys.argv[2] if len(sys.argv) > 2 else "public/smallcaps/data/universe.json")
page = source.read_text(encoding="utf-8")
table = re.search(r'<table[^>]+id="constituents".*?</table>', page, re.S)
if not table:
    raise SystemExit("S&P 600 constituents table not found")

stocks = []
for row in re.findall(r"<tr[^>]*>(.*?)</tr>", table.group(0), re.S)[1:]:
    cells = re.findall(r"<td[^>]*>(.*?)</td>", row, re.S)
    if len(cells) < 4:
        continue
    symbol_links = re.findall(r">([^<>]+)</a>", cells[0])
    symbol = html.unescape(symbol_links[-1]).strip() if symbol_links else text(cells[0])
    security, sector, sub_industry = map(text, cells[1:4])
    if not symbol or not security:
        continue
    stocks.append({
        "symbol": symbol.replace(".", "-"),
        "security": security,
        "sector": sector,
        "subIndustry": sub_industry,
        "marketCap": None,
        "portfolioWeight": None,
    })

payload = {
    "asOf": None,
    "source": {
        "name": "S&P SmallCap 600 constituent fallback",
        "url": "https://en.wikipedia.org/wiki/List_of_S%26P_600_companies",
        "note": "Regenerate only when the official SPSM holdings export is unavailable.",
    },
    "stocks": stocks,
}
target.parent.mkdir(parents=True, exist_ok=True)
target.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
print(f"wrote {len(stocks)} stocks to {target}")
