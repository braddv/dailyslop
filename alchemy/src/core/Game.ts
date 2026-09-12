import { CUSTOMERS } from '../data/customers';
import { getPlant, PLANTS } from '../data/plants';
import type { CustomerDefinition, GameState, NightLayout, NightPlantInstance, PlantPartId, PotionInstance, SaveData } from '../data/types';
import { ExtractionController } from '../extraction/ExtractionController';
import { PathEditor } from '../extraction/PathEditor';
import type { ExtractionScores } from '../extraction/PathTypes';
import { ForestScene, type ForestProximity } from '../scenes/ForestScene';
import { PortalHubScene } from '../scenes/PortalHubScene';
import { ThreeStage } from '../scenes/ThreeStage';
import { CustomerEvaluationSystem, type Evaluation } from '../systems/CustomerEvaluationSystem';
import { EconomySystem } from '../systems/EconomySystem';
import { InventorySystem } from '../systems/InventorySystem';
import { NightSystem } from '../systems/NightSystem';
import { PotionSystem } from '../systems/PotionSystem';
import { TraitSystem } from '../systems/TraitSystem';
import { qualityBand, traitsHTML } from '../utils/format';
import { GameStateManager } from './GameStateManager';
import { InputManager } from './InputManager';
import { SaveSystem } from './SaveSystem';

export class Game {
  private state=new GameStateManager();
  private input=new InputManager();
  private saves=new SaveSystem();
  private data:SaveData;
  private inventory:InventorySystem;
  private stage?:ThreeStage;
  private forestScene?:ForestScene;
  private extraction?:ExtractionController;
  private selectedPlant='glowlily';
  private selectedInstance?:NightPlantInstance;
  private editorPart:PlantPartId='stem';
  private night?:NightLayout;
  private moonlight=100;
  private lastMoonlightPaint=100;
  private promptLockUntil=0;
  private shopQueue:CustomerDefinition[]=[];
  private shopIndex=0;
  private dayEvaluations:Evaluation[]=[];

  constructor(private root:HTMLElement){
    this.data=this.saves.load();
    this.inventory=new InventorySystem(this.data,()=>this.persist());
    this.state.addEventListener('change',(event)=>this.render((event as CustomEvent).detail.next));
    this.render('HUB');
  }

  private persist():void{this.saves.save(this.data);this.updateHud();}
  private render(state:GameState):void{
    this.extraction?.destroy();this.extraction=undefined;this.stage?.destroy();this.stage=undefined;this.forestScene=undefined;
    this.root.innerHTML=`<section class="game-shell"><div class="ambient-grain"></div><header class="hud"><div><span class="eyebrow">Moonroot Apothecary</span><strong>Night ${this.data.day}</strong></div><div class="hud__stats"><span>◉ ${this.data.gold}</span><span>✦ ${this.data.reputation}</span><span>⚗ ${this.data.potions.length}</span></div></header><div class="scene" id="scene"></div></section>`;
    const views:Record<GameState,()=>void>={HUB:()=>this.hub(),FOREST:()=>this.forest(),EXTRACTION:()=>this.extractionView(),LAB:()=>this.lab(),SHOP:()=>this.shop(),RESULTS:()=>this.results(),EDITOR:()=>this.editor()};views[state]();
  }
  private updateHud():void{const stats=this.root.querySelector('.hud__stats');if(stats)stats.innerHTML=`<span>◉ ${this.data.gold}</span><span>✦ ${this.data.reputation}</span><span>⚗ ${this.data.potions.length}</span>`;}
  private makeStage():ThreeStage{this.stage=new ThreeStage(this.q('#three-stage'));return this.stage;}

  private hub():void{
    const forecast=new NightSystem().create(this.data.day);
    this.sceneHTML(`<div id="three-stage" class="three-stage"></div><div class="scene-copy scene-copy--hub"><p class="eyebrow">Tonight · ${forecast.title}</p><h1>The Whisperwood</h1><p>${forecast.condition} Plants move with the moon; nothing waits where it grew yesterday.</p><button class="primary" id="enter">Enter the Moon Gate <span>→</span></button><button class="ghost" id="editor">Path workshop</button></div><div class="field-journal"><span class="eyebrow">Field journal · ${this.data.discoveredPlants.length}/${PLANTS.length} known</span><div>${PLANTS.map(p=>`<figure class="journal-plant ${this.data.discoveredPlants.includes(p.id)?'is-known':''}"><img src="${p.image}" alt="${p.name}"><figcaption>${this.data.discoveredPlants.includes(p.id)?p.name:'Unknown'}</figcaption></figure>`).join('')}</div></div>`);
    new PortalHubScene(this.makeStage()).enter();
    this.on('#enter','click',()=>{this.night=new NightSystem().create(this.data.day);this.moonlight=100;this.lastMoonlightPaint=100;this.shopQueue=[];this.shopIndex=0;this.dayEvaluations=[];this.state.set('FOREST');});
    this.on('#editor','click',()=>this.state.set('EDITOR'));
  }

  private forest():void{
    this.night??=new NightSystem().create(this.data.day);
    const harvested=this.night.plants.filter(p=>p.harvested).length;
    this.sceneHTML(`<div id="three-stage" class="three-stage"></div><div class="forest-title"><span class="eyebrow">${this.night.title}</span><h2>The Whisperwood</h2><small>${this.night.condition}</small></div><div id="prompt" class="world-prompt">Listen. The forest hides what matters.</div><div class="moon-budget"><span>Moonlight</span><div><i id="moon-fill" style="width:${this.moonlight}%"></i></div><b id="moon-value">${Math.ceil(this.moonlight)}</b></div><div id="discovery" class="discovery-card" hidden></div><div id="joystick" class="joystick" aria-label="Movement control"><i></i></div><button id="listen" class="ghost listen">✦ Listen</button><button id="interact" class="primary interact" hidden>Extract specimen</button><button id="return" class="secondary return" hidden>Return with harvest</button><div class="harvest-count">Gathered <strong>${harvested}/${this.night.plants.length}</strong></div>`);
    this.forestScene=new ForestScene(this.makeStage(),this.input);
    this.forestScene.enter(this.night,(proximity)=>this.updateForest(proximity));
    this.input.bindJoystick(this.q('#joystick'));
    this.on('#listen','click',()=>{if(this.moonlight>=3){this.moonlight-=3;this.forestScene?.listen();this.promptLockUntil=performance.now()+1400;this.q('#prompt').textContent='The forest answers. Follow the rising lights.';}});
    this.on('#interact','click',()=>{if(this.selectedInstance){this.selectedPlant=this.selectedInstance.plantId;this.moonlight=Math.max(0,this.moonlight-8);this.state.set('EXTRACTION');}});
    this.on('#return','click',()=>{if(this.data.ingredients.length<2)this.q('#prompt').textContent='Your satchel needs at least two usable extracts.';else this.state.set('LAB');});
  }
  private updateForest(proximity:ForestProximity):void{
    if(proximity.moving)this.moonlight=Math.max(0,this.moonlight-proximity.delta*1.05);
    if(Math.abs(this.lastMoonlightPaint-this.moonlight)>.5){this.lastMoonlightPaint=this.moonlight;this.q<HTMLElement>('#moon-fill').style.width=`${this.moonlight}%`;this.q('#moon-value').textContent=String(Math.ceil(this.moonlight));}
    const discovery=this.q<HTMLDivElement>('#discovery'),button=this.q<HTMLButtonElement>('#interact'),back=this.q<HTMLButtonElement>('#return'),listen=this.q<HTMLButtonElement>('#listen');
    this.selectedInstance=proximity.plant;
    button.hidden=!proximity.plant||this.moonlight<=0;back.hidden=!proximity.atPortal;listen.hidden=!!proximity.plant||proximity.atPortal||this.moonlight<3;
    const discovered=this.night?.plants.filter(p=>p.discovered).length??0,harvested=this.night?.plants.filter(p=>p.harvested).length??0;this.q('.harvest-count').innerHTML=`Seen <strong>${discovered}</strong> · Gathered <strong>${harvested}</strong>`;
    if(proximity.plant){const plant=getPlant(proximity.plant.plantId);discovery.hidden=false;discovery.innerHTML=`<img src="${plant.image}" alt="${plant.name}"><div><span class="eyebrow">${plant.rarity} specimen</span><strong>${plant.name}</strong><small>Choose its anatomy carefully.</small></div>`;this.q('#prompt').textContent=`${plant.name} is within reach.`;}
    else{discovery.hidden=true;if(performance.now()>=this.promptLockUntil){const clue=proximity.clue?getPlant(proximity.clue.plantId):undefined;this.q('#prompt').textContent=this.moonlight<=0?'Moonset. Follow the pale gate home.':proximity.atPortal?'The Moon Gate leads home.':clue?.clue??'Only wind. Search another clearing.';}}
  }

  private extractionView():void{
    const plant=getPlant(this.selectedPlant),available=(Object.entries(plant.parts) as [PlantPartId,typeof plant.parts[PlantPartId]][]).filter(([,part])=>part.paths.length);
    this.sceneHTML(`<div class="extraction"><aside class="extraction__brief"><button class="back" id="cancel">← Forest</button><p class="eyebrow">Botanical extraction</p><h2>${plant.name}</h2><p>Trace from the gold point. Lift wherever the path breaks.</p><div class="part-list">${available.map(([id,part],i)=>`<button class="part ${i===0?'is-active':''}" data-part="${id}"><span>${part.name}</span>${traitsHTML(part.traits)}</button>`).join('')}</div><div class="speed-key"><span>Accuracy</span><i></i><span>Ideal pace</span></div></aside><div class="specimen"><img id="plant-image" src="${plant.image}" alt="Botanical plate of ${plant.name}"/><canvas id="trace-canvas"></canvas><div class="trace-hint">Trace · lift · trace</div></div></div>`);
    let activePart=available[0][0];
    const start=()=>{this.extraction?.destroy();this.extraction=new ExtractionController(this.q('#trace-canvas'),this.q('#plant-image'),plant.parts[activePart].paths[0],scores=>this.extractionResult(activePart,scores));};
    this.root.querySelectorAll<HTMLButtonElement>('[data-part]').forEach(button=>button.addEventListener('click',()=>{activePart=button.dataset.part as PlantPartId;this.root.querySelectorAll('.part').forEach(el=>el.classList.toggle('is-active',el===button));const replacement=document.createElement('canvas');replacement.id='trace-canvas';this.q('.specimen').querySelector('canvas')?.replaceWith(replacement);start();}));
    start();this.on('#cancel','click',()=>this.state.set('FOREST'));
  }
  private extractionResult(partId:PlantPartId,scores:ExtractionScores):void{
    this.extraction?.destroy();const plant=getPlant(this.selectedPlant),doses=Math.max(1,Math.min(3,1+Math.floor(scores.finalQuality/45))),traitSystem=new TraitSystem();
    const ingredients=Array.from({length:doses},(_,i)=>traitSystem.ingredient(plant,partId,Math.max(1,scores.finalQuality-i*2),this.data.day));ingredients.forEach(item=>this.inventory.addIngredient(item));
    if(this.selectedInstance){this.selectedInstance.harvested=true;this.forestScene?.markHarvested(this.selectedInstance.instanceId);}
    if(!this.data.discoveredPlants.includes(plant.id))this.data.discoveredPlants.push(plant.id);this.persist();
    this.q('.specimen').insertAdjacentHTML('beforeend',`<div class="result-card"><p class="eyebrow">${qualityBand(scores.finalQuality)} ${partId} extraction</p><div class="quality-ring" style="--quality:${scores.finalQuality*3.6}deg"><strong>${scores.finalQuality}</strong><small>quality</small></div><div class="score-grid"><span>Accuracy <b>${scores.accuracyScore}%</b></span><span>Speed <b>${scores.speedScore}%</b></span><span>Continuity <b>${scores.continuityScore}%</b></span><span>Completion <b>${scores.completionScore}%</b></span></div><p class="dose-yield">Yielded <b>${doses} usable dose${doses===1?'':'s'}</b></p><div class="retained">${traitsHTML(ingredients[0].traits)}</div><button class="primary" id="keep">Keep searching</button></div>`);
    this.on('#keep','click',()=>this.state.set('FOREST'));
  }

  private lab():void{
    let selected=new Set<string>(),stir=0,brewing=false,lastAngle=0;
    this.sceneHTML(`<div class="lab"><div class="lab__intro"><p class="eyebrow">Daybreak · ${this.data.potions.length} bottles on shelf</p><h2>Brew a working selection.</h2><p>Make several potions before opening. Ingredients and finished bottles carry over to tomorrow.</p><div id="ingredients" class="inventory-grid">${this.data.ingredients.map(item=>`<button class="inventory-card" data-ingredient="${item.id}"><b>${item.plantName} ${item.partId}</b><small>${qualityBand(item.quality)} · ${Math.round(item.quality)}%</small><span>${traitsHTML(item.traits)}</span></button>`).join('')||'<p>Your satchel is empty.</p>'}</div><button class="ghost open-shop-early" id="open-shop">Open shop with ${this.data.potions.length} potion${this.data.potions.length===1?'':'s'}</button></div><div class="brew-station"><div class="shelf"><span>✦</span><span>◌</span><span>☽</span></div><div class="cauldron" id="cauldron"><div class="brew-liquid"></div><div class="brew-prompt" id="brew-prompt">Select 2–3 extracts</div></div><div class="stir-meter"><i id="stir-fill"></i></div><button class="primary" id="brew" disabled>Begin brewing</button></div></div>`);
    const refresh=()=>{this.root.querySelectorAll<HTMLButtonElement>('[data-ingredient]').forEach(el=>el.classList.toggle('is-selected',selected.has(el.dataset.ingredient!)));const button=this.q<HTMLButtonElement>('#brew');button.disabled=selected.size<2||selected.size>3;this.q('#brew-prompt').textContent=selected.size?`${selected.size} extracts ready`:'Select 2–3 extracts';};
    this.root.querySelectorAll<HTMLButtonElement>('[data-ingredient]').forEach(el=>el.addEventListener('click',()=>{const id=el.dataset.ingredient!;if(selected.has(id))selected.delete(id);else if(selected.size<3)selected.add(id);refresh();}));
    this.on('#open-shop','click',()=>this.state.set('SHOP'));
    this.on('#brew','click',()=>{brewing=true;this.q<HTMLButtonElement>('#brew').hidden=true;this.q('#brew-prompt').textContent='Stir in smooth circles';this.q('#cauldron').classList.add('is-brewing');});
    const cauldron=this.q('#cauldron');cauldron.addEventListener('pointerdown',(event)=>cauldron.setPointerCapture((event as PointerEvent).pointerId));cauldron.addEventListener('pointermove',(event)=>{const e=event as PointerEvent;if(!brewing||(!e.buttons&&e.pointerType==='mouse'))return;const r=cauldron.getBoundingClientRect(),angle=Math.atan2(e.clientY-r.top-r.height/2,e.clientX-r.left-r.width/2);let delta=Math.abs(angle-lastAngle);if(delta>Math.PI)delta=Math.PI*2-delta;stir=Math.min(1,stir+delta*.025);lastAngle=angle;this.q<HTMLElement>('#stir-fill').style.width=`${stir*100}%`;if(stir>=1){brewing=false;const ingredients=this.data.ingredients.filter(item=>selected.has(item.id)),potion=new PotionSystem().brew(ingredients,.94);this.inventory.removeIngredients([...selected]);this.inventory.addPotion(potion);this.brewResult(potion);}});
  }
  private brewResult(potion:PotionInstance):void{
    const canBrewAgain=this.data.ingredients.length>=2;
    this.q('.brew-station').insertAdjacentHTML('beforeend',`<div class="result-card result-card--brew"><div class="bottle">◒</div><p class="eyebrow">Bottle ${this.data.potions.length} ready</p><h2>${potion.name}</h2><div>${traitsHTML(potion.traits)}</div><div class="brew-actions">${canBrewAgain?'<button class="secondary" id="brew-another">Brew another</button>':''}<button class="primary" id="to-shop">Open shop</button></div></div>`);
    if(canBrewAgain)this.on('#brew-another','click',()=>this.state.set('LAB'));this.on('#to-shop','click',()=>this.state.set('SHOP'));
  }

  private shop():void{
    if(!this.shopQueue.length)this.shopQueue=Array.from({length:3},(_,i)=>CUSTOMERS[(this.data.day*2+i-2)%CUSTOMERS.length]);
    const customer=this.shopQueue[this.shopIndex];
    this.sceneHTML(`<div class="shop"><div class="customer-queue"><span class="eyebrow">Today's queue</span>${this.shopQueue.map((c,i)=>`<i class="${i===this.shopIndex?'is-current':i<this.shopIndex?'is-done':''}" title="${c.name}">${c.portrait}</i>`).join('')}</div><div class="shop__backdrop"><div class="shelf-row">◒ ◓ ◐ ◒ ◓</div><div class="customer-portrait"><span>${customer.portrait}</span></div><div class="counter"></div></div><div class="case-file"><p class="eyebrow">Customer ${this.shopIndex+1} of ${this.shopQueue.length}</p><h2>${customer.name}</h2><small>${customer.role}</small><blockquote>“${customer.dialogue}”</blockquote><div class="clue"><span>Observed</span>${customer.clue}</div></div><div class="potion-tray"><p class="eyebrow">${this.data.potions.length} bottles available</p><h3>Choose carefully</h3>${this.data.potions.map(p=>`<button class="potion-choice" data-potion="${p.id}"><i>◒</i><span><b>${p.name}</b><small>${traitsHTML(p.traits)}</small></span></button>`).join('')||'<p>No potions remain. Refusal is safer than harm.</p>'}<button class="ghost danger" id="refuse">Refuse service</button></div></div>`);
    this.root.querySelectorAll<HTMLButtonElement>('[data-potion]').forEach(el=>el.addEventListener('click',()=>this.resolveCustomer(customer,this.data.potions.find(p=>p.id===el.dataset.potion))));this.on('#refuse','click',()=>this.resolveCustomer(customer));
  }
  private resolveCustomer(customer:CustomerDefinition,potion?:PotionInstance):void{
    const evaluation=new CustomerEvaluationSystem().evaluate(customer,potion);this.dayEvaluations.push(evaluation);if(potion)this.inventory.removePotion(potion.id);new EconomySystem(this.data).apply(evaluation.gold,evaluation.reputation);this.persist();const last=this.shopIndex>=this.shopQueue.length-1;
    this.q('.shop').insertAdjacentHTML('beforeend',`<div class="resolution resolution--${evaluation.outcome.toLowerCase()}"><p class="eyebrow">${evaluation.outcome}</p><h2>“${evaluation.reaction}”</h2><div><span>Gold ${evaluation.gold>=0?'+':''}${evaluation.gold}</span><span>Reputation ${evaluation.reputation>=0?'+':''}${evaluation.reputation}</span></div><button class="primary" id="next-customer">${last?'Close for the day':'Call next customer'}</button></div>`);
    this.on('#next-customer','click',()=>{if(last)this.state.set('RESULTS');else{this.shopIndex++;this.state.set('SHOP');}});
  }

  private results():void{
    const gold=this.dayEvaluations.reduce((sum,e)=>sum+e.gold,0),reputation=this.dayEvaluations.reduce((sum,e)=>sum+e.reputation,0),outcomes=this.dayEvaluations.map(e=>e.outcome);
    this.sceneHTML(`<div class="day-results"><p class="eyebrow">The ledger closes</p><h1>Day ${this.data.day}</h1><div class="moon-divider">☾ ✦ ☽</div><div class="outcome-row">${outcomes.map(value=>`<span>${value}</span>`).join('')}</div><div class="ledger"><span>Customers served <b>${this.dayEvaluations.length}</b></span><span>Gold earned <b>${gold}</b></span><span>Reputation change <b>${reputation}</b></span><span>Extracts carried over <b>${this.data.ingredients.length}</b></span><span>Potions carried over <b>${this.data.potions.length}</b></span></div><p>Tomorrow's paths, weather, specimens, and rare growth will be different.</p><button class="primary" id="next-night">Begin night ${this.data.day+1}</button></div>`);
    this.on('#next-night','click',()=>{this.data.day++;this.night=undefined;this.shopQueue=[];this.dayEvaluations=[];this.persist();this.state.set('HUB');});
  }

  private editor():void{
    const plant=getPlant(this.selectedPlant),path=plant.parts[this.editorPart].paths[0]??plant.parts.stem.paths[0];
    this.sceneHTML(`<div class="editor"><aside><button class="back" id="exit-editor">← Hub</button><p class="eyebrow">Developer tool</p><h2>Extraction path workshop</h2><label>Plant<select id="editor-plant">${PLANTS.map(p=>`<option value="${p.id}" ${p.id===plant.id?'selected':''}>${p.name}</option>`).join('')}</select></label><label>Anatomical part<select id="editor-part">${(['flower','leaf','stem','root'] as PlantPartId[]).map(id=>`<option value="${id}" ${id===this.editorPart?'selected':''}>${id}</option>`).join('')}</select></label><label>Load plant image<input id="plant-upload" type="file" accept="image/*"></label><label>Tolerance<input id="tolerance" type="range" min="0.015" max="0.1" step="0.005" value="${path.tolerance}"></label><label>Minimum speed<input id="min-speed" type="number" step=".01" value="${path.minSpeed}"></label><label>Target speed<input id="target-speed" type="number" step=".01" value="${path.targetSpeed}"></label><label>Maximum speed<input id="max-speed" type="number" step=".01" value="${path.maxSpeed}"></label><div class="editor-actions"><button class="secondary" id="new-path">New path</button><button class="secondary" id="gap">Insert gap</button><button class="secondary" id="import">Import JSON</button><button class="primary" id="export">Export JSON</button><button class="ghost" id="test">Test path</button></div></aside><div class="editor-canvas"><img id="editor-image" src="${plant.image}" alt="${plant.name}"><canvas id="editor-overlay"></canvas></div><textarea id="json" spellcheck="false" aria-label="Path JSON"></textarea></div>`);
    const editor=new PathEditor(this.q('#editor-overlay'),this.q('#editor-image'),path,this.q('#json'));
    this.on('#new-path','click',()=>{this.q<HTMLTextAreaElement>('#json').value=JSON.stringify({...path,id:`${plant.id}-${this.editorPart}-new`,partId:this.editorPart,segments:[{points:[]}]},null,2);editor.import();});this.on('#gap','click',()=>editor.addSegment());this.on('#import','click',()=>editor.import());this.on('#export','click',()=>editor.download());this.on('#test','click',()=>{getPlant(this.selectedPlant).parts[this.editorPart].paths[0]=editor.value;this.state.set('EXTRACTION');});this.on('#editor-plant','change',(e)=>{this.selectedPlant=(e.target as HTMLSelectElement).value;this.state.set('EDITOR');});this.on('#editor-part','change',(e)=>{this.editorPart=(e.target as HTMLSelectElement).value as PlantPartId;this.state.set('EDITOR');});this.on('#plant-upload','change',(e)=>{const file=(e.target as HTMLInputElement).files?.[0];if(file)this.q<HTMLImageElement>('#editor-image').src=URL.createObjectURL(file);});this.on('#exit-editor','click',()=>this.state.set('HUB'));
    (['tolerance','min-speed','target-speed','max-speed'] as const).forEach(id=>this.on(`#${id}`,'input',(e)=>{const json=this.q<HTMLTextAreaElement>('#json'),data=JSON.parse(json.value),value=Number((e.target as HTMLInputElement).value);data[id==='min-speed'?'minSpeed':id==='target-speed'?'targetSpeed':id==='max-speed'?'maxSpeed':'tolerance']=value;json.value=JSON.stringify(data,null,2);editor.import();}));
  }

  private sceneHTML(html:string):void{this.q('#scene').innerHTML=html;}
  private q<T extends Element=HTMLElement>(selector:string):T{const element=this.root.querySelector<T>(selector);if(!element)throw new Error(`Missing ${selector}`);return element;}
  private on(selector:string,type:string,handler:(event:Event)=>void):void{this.q(selector).addEventListener(type,handler);}
}
