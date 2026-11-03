// UI smoke test with synthetic quote fixtures; never used by the live API.
import {chromium,expect} from '@playwright/test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
const seed=JSON.parse(await readFile(new URL('../public/qqq/data/universe.json',import.meta.url)));
const now=Math.floor(Date.now()/1000);
const series=(i,count,step)=>Array.from({length:count},(_,n)=>[now-(count-1-n)*step,100+i+(n/10)*(i%3===0?-1:1)]);
const stocks=seed.stocks.map((s,i)=>({...s,marketCap:s.marketCap||1e10,currentPrice:110+i,lastClose:109+i,changePercent:i%3===0?-1:1,perf1w:2,perf1m:4,perf3m:7,pctFrom12wHigh:-3,pctFrom52wHigh:-5,replayDaily:series(i,190,86400),replayDay15m:series(i,96,900),replayWeekHourly:series(i,80,3600)}));
const payload={asOf:new Date().toISOString(),cacheFresh:true,stocks,benchmarks:[{...stocks[0],symbol:'QQQ',security:'Invesco QQQ Trust',sector:'Nasdaq-100',isBenchmark:true}],failures:[]};
const server=spawn('python3',['-m','http.server','5195','--directory','public'],{cwd:new URL('../',import.meta.url),stdio:'ignore'});let browser;
try{
 for(let i=0;i<40;i++){try{await fetch('http://localhost:5195/qqq/');break;}catch{await new Promise(r=>setTimeout(r,100));}}
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/api/**',route=>{const url=new URL(route.request().url());return route.fulfill({json:url.pathname==='/api/qqq'?payload:{sessions:[],rows:[],regimes:[],marketContexts:[],stocks:[]}});});
 await page.goto('http://localhost:5195/qqq/');await page.waitForSelector('.dot[data-symbol="ARM"]');assert.equal(await page.title(),'QQQ / Nasdaq-100 Sector Bubble Map');assert.equal(await page.locator('.dot[data-symbol="JPM"]').count(),0);
 await page.getByRole('button',{name:'1M',exact:true}).click();await page.getByRole('button',{name:'1M Replay',exact:true}).click();await page.getByRole('button',{name:'Play one month replay'}).click();await page.waitForTimeout(900);assert(Number(await page.locator('#replayScrubber').inputValue())>0);await page.getByRole('button',{name:'Back to Live'}).click();
 await page.locator('#tickerSearchInput').fill('ARM');await page.getByRole('button',{name:'☆ Watch',exact:true}).click();await page.getByRole('button',{name:/Watchlist/}).click();await expect(page.locator('#watchlistList')).toContainText('ARM',{timeout:15000});assert(await page.evaluate(()=>localStorage.getItem('qqq-watchlist-v1')));assert.equal(await page.evaluate(()=>localStorage.getItem('sp500-watchlist-v1')),null);
 await page.getByRole('button',{name:'Action Board',exact:true}).click();await page.waitForTimeout(700);await page.getByRole('button',{name:'Bearish',exact:true}).first().click();await page.getByRole('button',{name:'Signal History',exact:true}).click();await page.getByRole('button',{name:'Market Replay',exact:true}).click();await page.screenshot({path:'/tmp/qqq-desktop.png',fullPage:true});
 await page.reload();await page.waitForSelector('.dot[data-symbol="ARM"]');assert(await page.evaluate(()=>JSON.parse(localStorage.getItem('qqq-watchlist-v1')).includes('ARM')));
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'/tmp/qqq-mobile.png',fullPage:true});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Mobile page must fit viewport');assert.equal(errors.length,0,errors.join('\n'));console.log('QQQ browser smoke passed: 101-stock chart, replay play/live, watchlist persistence/isolation, Action Board, history, refresh, desktop/mobile; no page errors. Synthetic quotes used for UI checks.');
}finally{await browser?.close();server.kill();}
