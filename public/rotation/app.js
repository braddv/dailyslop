import { buildRotationData } from './model.js';

const COLORS = { leaders:'#36d58b', fading:'#f6a623', laggards:'#ff5964', recovering:'#ff7b2f' };
const RANGE_SESSIONS = { '1m':22, '3m':66, '6m':132, '1y':252 };
const state = { data:null, range:'3m', frameIndex:0, playing:true, speed:700, timer:null, view:'sectors', selectedSectors:new Set(), selectedSubIndustries:new Set(), selectedId:null, pointMap:new Map() };
const el = Object.fromEntries(['frameDate','universeLabel','chartTitle','chartDescription','viewToggle','rangeToggle','sectorFilter','subIndustryFilter','transport','playButton','scrubber','speed','readoutDate','readoutState','rotationChart','detailTitle','detailSubtitle','detailStats','constituents','refreshButton','statusText'].map((id)=>[id,document.getElementById(id)]));

function finite(value){ return Number.isFinite(Number(value)); }
function pct(value){ return finite(value)?`${value>=0?'+':''}${Number(value).toFixed(2)}%`:'--'; }
function dateLabel(value){ const date=new Date(`${value}T16:00:00Z`); return new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',year:'numeric'}).format(date); }
function escapeHtml(value){ return String(value??'').replace(/[&<>'"]/g,(char)=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char])); }
function visibleFrames(){ return (state.data?.frames||[]).slice(-RANGE_SESSIONS[state.range]); }
function currentFrame(){ return visibleFrames()[state.frameIndex]||null; }
function visiblePoints(frame=currentFrame()){
  if(!frame) return [];
  const points=state.view==='sectors'?frame.sectors:frame.subIndustries;
  return points.filter((point)=>{
    if(state.selectedSectors.size&& !state.selectedSectors.has(point.sector))return false;
    return state.view!=='subIndustries'||!state.selectedSubIndustries.size||state.selectedSubIndustries.has(point.id);
  });
}
function allVisiblePoints(){
  if(!state.data) return [];
  return visibleFrames().flatMap((frame)=>{
    const points=state.view==='sectors'?frame.sectors:frame.subIndustries;
    return points.filter((point)=>{
      if(state.selectedSectors.size&&!state.selectedSectors.has(point.sector))return false;
      return state.view!=='subIndustries'||!state.selectedSubIndustries.size||state.selectedSubIndustries.has(point.id);
    });
  });
}
function axisLimit(){
  const values=allVisiblePoints().flatMap((point)=>[Math.abs(point.x),Math.abs(point.y)]).filter(finite).sort((a,b)=>a-b);
  if(!values.length) return 5;
  const percentile=values[Math.min(values.length-1,Math.floor(values.length*.97))];
  return Math.max(2,Math.ceil(percentile));
}
function radiusScale(points){
  const values=points.map((point)=>Math.sqrt(Math.max(1,point.marketCap||1)));
  const min=Math.min(...values),max=Math.max(...values);
  return (point)=>{ const value=Math.sqrt(Math.max(1,point.marketCap||1)); return max===min?16:9+((value-min)/(max-min))*23; };
}
function clearTimer(){ if(state.timer) clearTimeout(state.timer); state.timer=null; }
function updateControls(){
  const count=visibleFrames().length;
  el.scrubber.max=Math.max(0,count-1); el.scrubber.value=state.frameIndex;
  el.playButton.innerHTML=state.playing?'<span aria-hidden="true">Ⅱ</span><span>Pause</span>':'<span aria-hidden="true">▶</span><span>Play</span>';
  el.readoutState.textContent=state.playing?'Playing':'Paused';
}
function schedule(delay=state.speed){
  clearTimer(); const count=visibleFrames().length;if(!state.playing||!count||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  state.timer=setTimeout(()=>{ state.frameIndex=state.frameIndex>=count-1?0:state.frameIndex+1; renderFrame(); schedule(state.frameIndex===0?1200:state.speed); },delay);
}
function setPlaying(value){ state.playing=value; updateControls(); if(value)schedule();else clearTimer(); }
function setFrame(index){ state.frameIndex=Math.max(0,Math.min((visibleFrames().length||1)-1,index)); renderFrame(); }

function trailMarkup(points,x,y){
  const ids=new Set(points.map((point)=>point.id));
  const history=visibleFrames().slice(0,state.frameIndex+1);
  const trailLength=state.view==='sectors'?30:16;
  return [...ids].map((id)=>{
    const path=history.slice(-trailLength).map((frame)=>{
      const source=state.view==='sectors'?frame.sectors:frame.subIndustries;
      return source.find((point)=>point.id===id);
    }).filter(Boolean);
    if(path.length<2)return '';
    const selected=state.selectedId===id;
    const coordinates=path.map((point)=>`${x(point.x)},${y(point.y)}`).join(' ');
    return `<polyline class="bubble-trail ${selected?'selected':''}" points="${coordinates}" stroke="${COLORS[path.at(-1).quadrant]}"/>`;
  }).join('');
}

function chartMarkup(points){
  const limit=axisLimit(); const left=75,right=850,top=48,bottom=580,midX=(left+right)/2,midY=(top+bottom)/2;
  const x=(value)=>left+((Math.max(-limit,Math.min(limit,value))+limit)/(limit*2))*(right-left);
  const y=(value)=>bottom-((Math.max(-limit,Math.min(limit,value))+limit)/(limit*2))*(bottom-top);
  const ticks=[-limit,-limit/2,0,limit/2,limit]; const radius=radiusScale(points);
  state.pointMap=new Map(points.map((point)=>[point.id,point]));
  const backgrounds=`<rect x="${left}" y="${top}" width="${midX-left}" height="${midY-top}" fill="rgba(246,166,35,.055)"/><rect x="${midX}" y="${top}" width="${right-midX}" height="${midY-top}" fill="rgba(54,213,139,.055)"/><rect x="${left}" y="${midY}" width="${midX-left}" height="${bottom-midY}" fill="rgba(255,89,100,.055)"/><rect x="${midX}" y="${midY}" width="${right-midX}" height="${bottom-midY}" fill="rgba(255,123,47,.055)"/>`;
  const grid=ticks.map((tick)=>`<line x1="${x(tick)}" y1="${top}" x2="${x(tick)}" y2="${bottom}" stroke="rgba(255,255,255,${tick===0?'.26':'.08'})"/><line x1="${left}" y1="${y(tick)}" x2="${right}" y2="${y(tick)}" stroke="rgba(255,255,255,${tick===0?'.26':'.08'})"/><text class="tick-label" x="${x(tick)}" y="${bottom+22}" text-anchor="middle">${tick>0?'+':''}${tick.toFixed(tick%1?1:0)}%</text><text class="tick-label" x="${left-12}" y="${y(tick)+4}" text-anchor="end">${tick>0?'+':''}${tick.toFixed(tick%1?1:0)}%</text>`).join('');
  const trails=trailMarkup(points,x,y);
  const bubbles=[...points].sort((a,b)=>(b.marketCap||0)-(a.marketCap||0)).map((point)=>{
    const r=radius(point); const selected=state.selectedId===point.id; const showLabel=state.view==='sectors'||selected||r>=20;
    const label=state.view==='sectors'?point.symbol:(point.label.length>17?`${point.label.slice(0,15)}…`:point.label);
    return `<g data-point-id="${escapeHtml(point.id)}" tabindex="0" role="button" aria-label="${escapeHtml(point.label)} ${point.quadrant}"><circle class="bubble ${selected?'selected':''}" cx="${x(point.x)}" cy="${y(point.y)}" r="${r}" fill="${COLORS[point.quadrant]}" opacity=".9" stroke="rgba(0,0,0,.35)"/><title>${escapeHtml(point.label)} · 5D ${pct(point.x)} vs SPY · 20D ${pct(point.y)} vs SPY</title>${showLabel?`<text class="bubble-label" x="${x(point.x)}" y="${y(point.y)}">${escapeHtml(label)}</text>`:''}</g>`;
  }).join('');
  return `${backgrounds}<g>${grid}</g><g class="quadrant-title"><text x="${left+18}" y="${top+27}" fill="${COLORS.fading}">FADING</text><text x="${right-18}" y="${top+27}" fill="${COLORS.leaders}" text-anchor="end">LEADERS</text><text x="${left+18}" y="${bottom-18}" fill="${COLORS.laggards}">LAGGARDS</text><text x="${right-18}" y="${bottom-18}" fill="${COLORS.recovering}" text-anchor="end">RECOVERING</text></g><text class="axis-label" x="${(left+right)/2}" y="632" text-anchor="middle">5-session outperformance vs SPY (percentage points) →</text><text class="axis-label" transform="translate(20 ${(top+bottom)/2}) rotate(-90)" text-anchor="middle">20-session outperformance vs SPY (percentage points) →</text><g class="bubble-trails">${trails}</g>${bubbles}`;
}

function stat(label,value,detail){ return `<div class="stat"><span>${label}</span><strong>${value}</strong><small>${detail}</small></div>`; }
function renderDetail(){
  const point=state.pointMap.get(state.selectedId); if(!point){ el.detailTitle.textContent=state.view==='sectors'?'Choose a sector':'Choose a subsector'; el.detailSubtitle.textContent='Tap a bubble to highlight its trail and inspect its relative returns.'; el.detailStats.innerHTML='';el.constituents.innerHTML='';return; }
  el.detailTitle.textContent=point.label; el.detailSubtitle.textContent=`${point.sector}${point.symbol?` · ${point.symbol}`:''} · ${point.count} constituent${point.count===1?'':'s'} · ${point.quadrant}${point.leadershipQuality?` · ${point.leadershipQuality.classification} leadership`:''}`;
  el.detailStats.innerHTML=stat('5D vs SPY',pct(point.x),`group ${pct(point.return5)}`)+stat('20D vs SPY',pct(point.y),`group ${pct(point.return20)}`)+stat('SPY 5D',pct(currentFrame().spy5),'benchmark')+stat('SPY 20D',pct(currentFrame().spy20),'benchmark');
  el.constituents.innerHTML=point.constituents.slice().sort((a,b)=>a.symbol.localeCompare(b.symbol)).map((item)=>`<span title="${escapeHtml(item.security)}">${escapeHtml(item.symbol)}${item.subIndustry?` · ${escapeHtml(item.subIndustry)}`:''}</span>`).join('');
}
function renderFilters(){
  el.sectorFilter.hidden=false;
  el.subIndustryFilter.hidden=state.view!=='subIndustries';
  const sectors=state.data.sectors;
  el.sectorFilter.innerHTML=`<span>Sector</span><button class="${state.selectedSectors.size?'':'active'}" data-all-sectors aria-pressed="${!state.selectedSectors.size}">All sectors</button>${sectors.map(({sector,symbol})=>`<button class="${state.selectedSectors.has(sector)?'active':''}" data-sector="${escapeHtml(sector)}" aria-pressed="${state.selectedSectors.has(sector)}">${escapeHtml(symbol)} ${escapeHtml(sector)}</button>`).join('')}`;
  if(state.view!=='subIndustries')return;
  const groups=state.data.subIndustries.filter((item)=>!state.selectedSectors.size||state.selectedSectors.has(item.sector));
  el.subIndustryFilter.innerHTML=`<span>Subsector</span><button class="${state.selectedSubIndustries.size?'':'active'}" data-all-sub-industries aria-pressed="${!state.selectedSubIndustries.size}">All selected sectors</button>${groups.map((group)=>`<button class="${state.selectedSubIndustries.has(group.id)?'active':''}" data-sub-industry="${escapeHtml(group.id)}" aria-pressed="${state.selectedSubIndustries.has(group.id)}">${escapeHtml(group.label)}</button>`).join('')}`;
}
function renderFrame(){
  const frame=currentFrame(); if(!frame)return;
  const points=visiblePoints(frame); el.frameDate.textContent=dateLabel(frame.date);el.readoutDate.textContent=dateLabel(frame.date);
  el.universeLabel.textContent=state.view==='sectors'?`${points.length} sectors`:`${points.length} subsectors`;
  const sectorNames=[...state.selectedSectors];
  el.chartTitle.textContent=state.view==='sectors'?'S&P sector ETFs':sectorNames.length===1?`${sectorNames[0]} subsectors`:'Selected subsectors';
  el.chartDescription.textContent=state.view==='sectors'?'Toggle sector chips to compare paths; tap a bubble to highlight its trail. Use Subsectors and the chips to drill down.':'Toggle subsector chips to compare only the paths you want to follow.';
  el.rotationChart.innerHTML=chartMarkup(points); updateControls(); renderFilters(); renderDetail();
}
function setView(view,sector=null){ state.view=view;if(sector)state.selectedSectors=new Set([sector]);else if(view==='subIndustries'&&!state.selectedSectors.size)state.selectedSectors=new Set([state.data.sectors[0]?.sector].filter(Boolean));state.selectedSubIndustries.clear();state.selectedId=null;el.viewToggle.querySelectorAll('[data-view]').forEach((button)=>button.classList.toggle('active',button.dataset.view===view));renderFrame(); }

el.rotationChart.addEventListener('click',(event)=>{const group=event.target.closest('[data-point-id]');if(!group)return;const point=state.pointMap.get(group.dataset.pointId);if(!point)return;state.selectedId=point.id;renderFrame();});
el.rotationChart.addEventListener('keydown',(event)=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();event.target.closest('[data-point-id]')?.dispatchEvent(new MouseEvent('click',{bubbles:true}));}});
el.viewToggle.addEventListener('click',(event)=>{const button=event.target.closest('[data-view]');if(button)setView(button.dataset.view);});
el.rangeToggle.addEventListener('click',(event)=>{const button=event.target.closest('[data-range]');if(!button)return;state.range=button.dataset.range;state.frameIndex=0;state.selectedId=null;el.rangeToggle.querySelectorAll('[data-range]').forEach((item)=>item.classList.toggle('active',item===button));renderFrame();if(state.playing)schedule();});
el.sectorFilter.addEventListener('click',(event)=>{const button=event.target.closest('button');if(!button)return;if(button.hasAttribute('data-all-sectors'))state.selectedSectors.clear();else{const sector=button.dataset.sector;if(state.selectedSectors.has(sector))state.selectedSectors.delete(sector);else{if(!state.selectedSectors.size)state.selectedSectors=new Set([sector]);else state.selectedSectors.add(sector);}}state.selectedSubIndustries.clear();state.selectedId=null;renderFrame();});
el.subIndustryFilter.addEventListener('click',(event)=>{const button=event.target.closest('button');if(!button)return;if(button.hasAttribute('data-all-sub-industries'))state.selectedSubIndustries.clear();else{const id=button.dataset.subIndustry;if(state.selectedSubIndustries.has(id))state.selectedSubIndustries.delete(id);else{if(!state.selectedSubIndustries.size)state.selectedSubIndustries=new Set([id]);else state.selectedSubIndustries.add(id);}}state.selectedId=null;renderFrame();});
el.playButton.addEventListener('click',()=>setPlaying(!state.playing));
el.speed.addEventListener('change',()=>{state.speed=Number(el.speed.value);if(state.playing)schedule();});
el.scrubber.addEventListener('input',()=>{setPlaying(false);setFrame(Number(el.scrubber.value));});
let scrubPointer=null;
function scrubAt(clientX){const bounds=el.scrubber.getBoundingClientRect();const max=Number(el.scrubber.max);if(!bounds.width||!max)return;setPlaying(false);setFrame(Math.round(Math.max(0,Math.min(1,(clientX-bounds.left)/bounds.width))*max));}
el.scrubber.addEventListener('pointerdown',(event)=>{scrubPointer=event.pointerId;el.scrubber.setPointerCapture?.(event.pointerId);scrubAt(event.clientX);event.preventDefault();});
el.scrubber.addEventListener('pointermove',(event)=>{if(event.pointerId===scrubPointer){scrubAt(event.clientX);event.preventDefault();}});
el.scrubber.addEventListener('pointerup',(event)=>{if(event.pointerId===scrubPointer){scrubAt(event.clientX);el.scrubber.releasePointerCapture?.(event.pointerId);scrubPointer=null;}});

async function loadData(refresh=false){
  el.refreshButton.disabled=true;el.refreshButton.textContent='Loading…';clearTimer();
  try{const response=await fetch(`/api/sector-ad${refresh?'?refresh=true':''}`,{cache:'no-store'});const payload=await response.json();if(!response.ok||!Array.isArray(payload.stocks))throw new Error(payload.error||`HTTP ${response.status}`);state.data=buildRotationData(payload,252);if(!state.data.frames.length)throw new Error('Not enough daily history to calculate rotation.');state.frameIndex=0;state.playing=!matchMedia('(prefers-reduced-motion: reduce)').matches;el.statusText.textContent=`${state.data.frames.length} daily frames available · ${state.data.methodology}`;renderFrame();schedule();}
  catch(error){el.statusText.textContent=`Rotation unavailable: ${error.message}`;}
  finally{el.refreshButton.disabled=false;el.refreshButton.textContent='Refresh';}
}
el.refreshButton.addEventListener('click',()=>loadData(true));
loadData();
