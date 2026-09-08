import { buildRotationData } from './model.js';

const COLORS = { leaders:'#36d58b', fading:'#f6a623', laggards:'#ff5964', recovering:'#ff7b2f' };
const state = { data:null, frameIndex:0, playing:true, speed:700, timer:null, view:'sectors', selectedSector:null, selectedId:null, pointMap:new Map() };
const el = Object.fromEntries(['frameDate','universeLabel','chartTitle','chartDescription','viewToggle','sectorFilter','transport','playButton','scrubber','speed','readoutDate','readoutState','rotationChart','detailTitle','detailSubtitle','detailStats','constituents','refreshButton','statusText'].map((id)=>[id,document.getElementById(id)]));

function finite(value){ return Number.isFinite(Number(value)); }
function pct(value){ return finite(value)?`${value>=0?'+':''}${Number(value).toFixed(2)}%`:'--'; }
function dateLabel(value){ const date=new Date(`${value}T16:00:00Z`); return new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',year:'numeric'}).format(date); }
function escapeHtml(value){ return String(value??'').replace(/[&<>'"]/g,(char)=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char])); }
function currentFrame(){ return state.data?.frames?.[state.frameIndex]||null; }
function visiblePoints(frame=currentFrame()){
  if(!frame) return [];
  const points=state.view==='sectors'?frame.sectors:frame.subIndustries;
  return state.view==='subIndustries'&&state.selectedSector?points.filter((point)=>point.sector===state.selectedSector):points;
}
function allVisiblePoints(){
  if(!state.data) return [];
  return state.data.frames.flatMap((frame)=>{
    const points=state.view==='sectors'?frame.sectors:frame.subIndustries;
    return state.view==='subIndustries'&&state.selectedSector?points.filter((point)=>point.sector===state.selectedSector):points;
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
  const count=state.data?.frames?.length||0;
  el.scrubber.max=Math.max(0,count-1); el.scrubber.value=state.frameIndex;
  el.playButton.innerHTML=state.playing?'<span aria-hidden="true">Ⅱ</span><span>Pause</span>':'<span aria-hidden="true">▶</span><span>Play</span>';
  el.readoutState.textContent=state.playing?'Playing':'Paused';
}
function schedule(delay=state.speed){
  clearTimer(); if(!state.playing||!state.data?.frames?.length||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  state.timer=setTimeout(()=>{ state.frameIndex=state.frameIndex>=state.data.frames.length-1?0:state.frameIndex+1; renderFrame(); schedule(state.frameIndex===0?1200:state.speed); },delay);
}
function setPlaying(value){ state.playing=value; updateControls(); if(value)schedule();else clearTimer(); }
function setFrame(index){ state.frameIndex=Math.max(0,Math.min((state.data?.frames?.length||1)-1,index)); renderFrame(); }

function chartMarkup(points){
  const limit=axisLimit(); const left=75,right=850,top=48,bottom=580,midX=(left+right)/2,midY=(top+bottom)/2;
  const x=(value)=>left+((Math.max(-limit,Math.min(limit,value))+limit)/(limit*2))*(right-left);
  const y=(value)=>bottom-((Math.max(-limit,Math.min(limit,value))+limit)/(limit*2))*(bottom-top);
  const ticks=[-limit,-limit/2,0,limit/2,limit]; const radius=radiusScale(points);
  state.pointMap=new Map(points.map((point)=>[point.id,point]));
  const backgrounds=`<rect x="${left}" y="${top}" width="${midX-left}" height="${midY-top}" fill="rgba(246,166,35,.055)"/><rect x="${midX}" y="${top}" width="${right-midX}" height="${midY-top}" fill="rgba(54,213,139,.055)"/><rect x="${left}" y="${midY}" width="${midX-left}" height="${bottom-midY}" fill="rgba(255,89,100,.055)"/><rect x="${midX}" y="${midY}" width="${right-midX}" height="${bottom-midY}" fill="rgba(255,123,47,.055)"/>`;
  const grid=ticks.map((tick)=>`<line x1="${x(tick)}" y1="${top}" x2="${x(tick)}" y2="${bottom}" stroke="rgba(255,255,255,${tick===0?'.26':'.08'})"/><line x1="${left}" y1="${y(tick)}" x2="${right}" y2="${y(tick)}" stroke="rgba(255,255,255,${tick===0?'.26':'.08'})"/><text class="tick-label" x="${x(tick)}" y="${bottom+22}" text-anchor="middle">${tick>0?'+':''}${tick.toFixed(tick%1?1:0)}%</text><text class="tick-label" x="${left-12}" y="${y(tick)+4}" text-anchor="end">${tick>0?'+':''}${tick.toFixed(tick%1?1:0)}%</text>`).join('');
  const bubbles=[...points].sort((a,b)=>(b.marketCap||0)-(a.marketCap||0)).map((point)=>{
    const r=radius(point); const selected=state.selectedId===point.id; const showLabel=state.view==='sectors'||selected||r>=20;
    const label=state.view==='sectors'?point.symbol:(point.label.length>17?`${point.label.slice(0,15)}…`:point.label);
    return `<g data-point-id="${escapeHtml(point.id)}" tabindex="0" role="button" aria-label="${escapeHtml(point.label)} ${point.quadrant}"><circle class="bubble ${selected?'selected':''}" cx="${x(point.x)}" cy="${y(point.y)}" r="${r}" fill="${COLORS[point.quadrant]}" opacity=".9" stroke="rgba(0,0,0,.35)"/><title>${escapeHtml(point.label)} · 5D ${pct(point.x)} vs SPY · 20D ${pct(point.y)} vs SPY</title>${showLabel?`<text class="bubble-label" x="${x(point.x)}" y="${y(point.y)}">${escapeHtml(label)}</text>`:''}</g>`;
  }).join('');
  return `${backgrounds}<g>${grid}</g><g class="quadrant-title"><text x="${left+18}" y="${top+27}" fill="${COLORS.fading}">FADING</text><text x="${right-18}" y="${top+27}" fill="${COLORS.leaders}" text-anchor="end">LEADERS</text><text x="${left+18}" y="${bottom-18}" fill="${COLORS.laggards}">LAGGARDS</text><text x="${right-18}" y="${bottom-18}" fill="${COLORS.recovering}" text-anchor="end">RECOVERING</text></g><text class="axis-label" x="${(left+right)/2}" y="632" text-anchor="middle">5-session return relative to SPY →</text><text class="axis-label" transform="translate(20 ${(top+bottom)/2}) rotate(-90)" text-anchor="middle">20-session return relative to SPY →</text>${bubbles}`;
}

function stat(label,value,detail){ return `<div class="stat"><span>${label}</span><strong>${value}</strong><small>${detail}</small></div>`; }
function renderDetail(){
  const point=state.pointMap.get(state.selectedId); if(!point){ el.detailTitle.textContent=state.view==='sectors'?'Choose a sector':'Choose a subsector'; el.detailSubtitle.textContent=state.view==='sectors'?'Tap a bubble to drill into its sub-industries.':'Tap a bubble to see relative returns and constituents.'; el.detailStats.innerHTML='';el.constituents.innerHTML='';return; }
  el.detailTitle.textContent=point.label; el.detailSubtitle.textContent=`${point.sector}${point.symbol?` · ${point.symbol}`:''} · ${point.count} constituent${point.count===1?'':'s'} · ${point.quadrant}`;
  el.detailStats.innerHTML=stat('5D vs SPY',pct(point.x),`group ${pct(point.return5)}`)+stat('20D vs SPY',pct(point.y),`group ${pct(point.return20)}`)+stat('SPY 5D',pct(currentFrame().spy5),'benchmark')+stat('SPY 20D',pct(currentFrame().spy20),'benchmark');
  el.constituents.innerHTML=point.constituents.slice().sort((a,b)=>a.symbol.localeCompare(b.symbol)).map((item)=>`<span title="${escapeHtml(item.security)}">${escapeHtml(item.symbol)}${item.subIndustry?` · ${escapeHtml(item.subIndustry)}`:''}</span>`).join('');
}
function renderFilters(){
  const visible=state.view==='subIndustries'; el.sectorFilter.hidden=!visible;
  if(!visible)return;
  const sectors=state.data.sectors.map((item)=>item.sector);
  el.sectorFilter.innerHTML=`<button class="${state.selectedSector?'':'active'}" data-sector="">All subsectors</button>${sectors.map((sector)=>`<button class="${state.selectedSector===sector?'active':''}" data-sector="${escapeHtml(sector)}">${escapeHtml(sector)}</button>`).join('')}`;
}
function renderFrame(){
  const frame=currentFrame(); if(!frame)return;
  const points=visiblePoints(frame); el.frameDate.textContent=dateLabel(frame.date);el.readoutDate.textContent=dateLabel(frame.date);
  el.universeLabel.textContent=state.view==='sectors'?`${points.length} sectors`:`${points.length} subsectors`;
  el.chartTitle.textContent=state.view==='sectors'?'S&P sector ETFs':state.selectedSector?`${state.selectedSector} subsectors`:'S&P 500 subsectors';
  el.chartDescription.textContent=state.view==='sectors'?'Click a sector to drill into its sub-industries.':state.selectedSector?'Select a group to see its constituents.':'Filter by sector or watch rotation across every sub-industry.';
  el.rotationChart.innerHTML=chartMarkup(points); updateControls(); renderFilters(); renderDetail();
}
function setView(view,sector=null){ state.view=view;state.selectedSector=sector;state.selectedId=null;el.viewToggle.querySelectorAll('[data-view]').forEach((button)=>button.classList.toggle('active',button.dataset.view===view));renderFrame(); }

el.rotationChart.addEventListener('click',(event)=>{ const group=event.target.closest('[data-point-id]');if(!group)return;const point=state.pointMap.get(group.dataset.pointId);if(!point)return;if(state.view==='sectors')setView('subIndustries',point.sector);else{state.selectedId=point.id;renderFrame();} });
el.rotationChart.addEventListener('keydown',(event)=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();event.target.closest('[data-point-id]')?.dispatchEvent(new MouseEvent('click',{bubbles:true}));}});
el.viewToggle.addEventListener('click',(event)=>{const button=event.target.closest('[data-view]');if(button)setView(button.dataset.view);});
el.sectorFilter.addEventListener('click',(event)=>{const button=event.target.closest('[data-sector]');if(!button)return;state.selectedSector=button.dataset.sector||null;state.selectedId=null;renderFrame();});
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
  try{const response=await fetch(`/api/sector-ad${refresh?'?refresh=true':''}`,{cache:'no-store'});const payload=await response.json();if(!response.ok||!Array.isArray(payload.stocks))throw new Error(payload.error||`HTTP ${response.status}`);state.data=buildRotationData(payload);if(!state.data.frames.length)throw new Error('Not enough daily history to calculate rotation.');state.frameIndex=0;state.playing=!matchMedia('(prefers-reduced-motion: reduce)').matches;el.statusText.textContent=`${state.data.frames.length} daily frames · ${state.data.methodology}`;renderFrame();schedule();}
  catch(error){el.statusText.textContent=`Rotation unavailable: ${error.message}`;}
  finally{el.refreshButton.disabled=false;el.refreshButton.textContent='Refresh';}
}
el.refreshButton.addEventListener('click',()=>loadData(true));
loadData();

