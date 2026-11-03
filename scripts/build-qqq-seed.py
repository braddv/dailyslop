#!/usr/bin/env python3
"""Build the QQQ equity universe from a downloaded Nasdaq-100 membership table.
QQQ tracks this index; fund cash/derivatives are intentionally excluded.
"""
import html
import json
import re
import sys
from pathlib import Path

source = Path(sys.argv[1])
page = source.read_text(encoding='utf-8')
table = re.search(r'<table[^>]*id="constituents".*?</table>', page, re.S)
if not table:
    raise SystemExit('Nasdaq-100 constituents table not found')
known = {s['symbol']: s for s in json.loads(Path('public/sp500ad/data/sector-ad.json').read_text())['stocks']}
sectors = {'Technology': 'Information Technology', 'Telecommunications': 'Communication Services', 'Basic Materials': 'Materials', 'Consumer Discretionary': 'Consumer Discretionary', 'Consumer Staples': 'Consumer Staples', 'Health Care': 'Health Care', 'Industrials': 'Industrials', 'Utilities': 'Utilities', 'Energy': 'Energy', 'Real Estate': 'Real Estate', 'Financials': 'Financials'}
stocks = []
for row in re.findall(r'<tr.*?</tr>', table.group(0), re.S):
    cells = [html.unescape(re.sub(r'<[^>]+>', '', c)).strip() for c in re.findall(r'<td[^>]*>(.*?)</td>', row, re.S)]
    if len(cells) < 5:
        continue
    symbol, company, _, industry, subsector = cells[:5]
    prior = known.get(symbol, {})
    sector = prior.get('sector') or sectors[industry]
    if symbol in ['PDD', 'MELI']:
        sector = 'Consumer Discretionary'
    stocks.append({'symbol': symbol, 'security': company, 'sector': sector, 'subIndustry': prior.get('subIndustry') or subsector, 'marketCap': prior.get('marketCap'), 'portfolioWeight': None})
if not 95 <= len(stocks) <= 110 or len({s['symbol'] for s in stocks}) != len(stocks):
    raise SystemExit('Unexpected membership count or duplicate symbols')
payload = {'asOf': None, 'source': {'constituents': 'https://en.wikipedia.org/wiki/List_of_NASDAQ-100_companies', 'retrievedOn': '2026-11-02', 'note': 'Nasdaq-100 equity membership proxy for QQQ; excludes fund cash and derivatives. Quotes are fetched independently; membership does not imply a current quote. GICS classifications reused where available; remaining ICB industries mapped to chart sectors.'}, 'cacheFresh': False, 'stocks': stocks, 'benchmarks': [], 'sectors': []}
target = Path('public/qqq/data/universe.json')
target.parent.mkdir(parents=True, exist_ok=True)
target.write_text(json.dumps(payload, indent=2)+'\n')
print(f'Wrote {len(stocks)} Nasdaq-100 equity listings')
