import { CUSTOMERS } from '../data/customers';
import { getPlant, PLANTS } from '../data/plants';
import type { CustomerDefinition, GameState, NightLayout, NightPlantInstance, PlantPartId, PotionInstance, SaveData } from '../data/types';
import { ExtractionController } from '../extraction/ExtractionController';
import { PathEditor } from '../extraction/PathEditor';
import type { ExtractionScores } from '../extraction/PathTypes';
import { PortalHubScene } from '../scenes/PortalHubScene';
import { SideScrollerScene, type SideScrollState } from '../scenes/SideScrollerScene';
import { ThreeStage } from '../scenes/ThreeStage';
import { CustomerEvaluationSystem, type Evaluation } from '../systems/CustomerEvaluationSystem';
import { EconomySystem } from '../systems/EconomySystem';
import { InventorySystem } from '../systems/InventorySystem';
import { NightSystem } from '../systems/NightSystem';
import { PotionSystem } from '../systems/PotionSystem';
import { PotionEffectSystem, type PotionTraversal } from '../systems/PotionEffectSystem';
import { TraitSystem } from '../systems/TraitSystem';
import { qualityBand, traitsHTML } from '../utils/format';
import { GameStateManager } from './GameStateManager';
import { SaveSystem } from './SaveSystem';
import { InputManager } from './InputManager';
import { WHISPERWOOD_MAP } from '../world/WhisperwoodMap';

export class Game {
  private state=new GameStateManager();
  private input=new InputManager();
  private saves=new SaveSystem();
  private data:SaveData;
  private inventory:InventorySystem;
  private stage?:ThreeStage;
  private sideScene?:SideScrollerScene;
  private extraction?:ExtractionController;
  private selectedPlant='glowlily';
  private selectedInstance?:NightPlantInstance;
  private editorPart:PlantPartId='stem';
  private night?:NightLayout;
  private selectedFieldPotion?:string;
  private traversal:PotionTraversal={id:'none',name:'No field potion',description:'Standard movement only'};
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
    this.extraction?.destroy();this.extraction=undefined;this.stage?.destroy();this.stage=undefined;this.sideScene=undefined;
    this.root.innerHTML=`<section class="game-shell"><div class="ambient-grain"></div><header class="hud"><div><span class="eyebrow">Moonroot Apothecary</span><strong>Night ${this.data.day}</strong></div><div class="hud__stats"><span>◉ ${this.data.gold}</span><span>✦ ${this.data.reputation}</span><span>⚗ ${this.data.potions.length}</span></div></header><div class="scene" id="scene"></div></section>`;
    const views:Record<GameState,()=>void>={HUB:()=>this.hub(),FOREST:()=>this.forest(),EXTRACTION:()=>this.extractionView(),LAB:()=>this.lab(),SHOP:()=>this.shop(),RESULTS:()=>this.results(),EDITOR:()=>this.editor()};views[state]();
  }
  private updateHud():void{const stats=this.root.querySelector('.hud__stats');if(stats)stats.innerHTML=`<span>◉ ${this.data.gold}</span><span>✦ ${this.data.reputation}</span><span>⚗ ${this.data.potions.length}</span>`;}
  private makeStage():ThreeStage{this.stage=new ThreeStage(this.q('#three-stage'));return this.stage;}

  private hub():void{
    this.prepareShopQueue();
    const forecast=new NightSystem().create(this.data.day,this.shopQueue);
    const effects=new PotionEffectSystem();
    this.sceneHTML(`<div id="three-stage" class="three-stage"></div><div class="scene-copy scene-copy--hub"><p class="eyebrow">Tonight · ${forecast.title}</p><h1>The Whisperwood</h1><p>Walk, jump, gather, and physically reach the return gate. Drink a bottle for traversal—or save it for tomorrow's sale.</p><button class="primary" id="enter">Enter the forest <span>→</span></button><button class="ghost" id="editor">Path workshop</button></div><div class="rumor-board"><span class="eyebrow">Tomorrow's rumors</span>${this.shopQueue.map(customer=>`<article><i>${customer.portrait}</i><div><b>${customer.role}</b><small>“${customer.dialogue}”</small></div></article>`).join('')}</div><div class="field-kit"><span class="eyebrow">Drink before departure · optional</span><div>${this.data.potions.map(potion=>{const effect=effects.effect(potion);return `<button data-field-potion="${potion.id}" class="field-potion ${this.selectedFieldPotion===potion.id?'is-selected':''}"><i>◒</i><span><b>${effect.name}</b><small>${effect.description}</small></span></button>`;}).join('')||'<p>No traversal potions yet. The creek route is always open.</p>'}</div></div>`);
    new PortalHubScene(this.makeStage()).enter();
    this.on('#enter','click',()=>{const potion=this.data.potions.find(item=>item.id===this.selectedFieldPotion);this.traversal=effects.effect(potion);if(potion)this.inventory.removePotion(potion.id);this.selectedFieldPotion=undefined;this.night=new NightSystem().create(this.data.day,this.shopQueue);this.night.plants=WHISPERWOOD_MAP.plants.map(item=>({instanceId:item.id,plantId:item.plantId,x:item.x,z:0,harvested:false,discovered:false}));this.shopIndex=0;this.dayEvaluations=[];this.state.set('FOREST');});
    this.root.querySelectorAll<HTMLButtonElement>('[data-field-potion]').forEach(button=>button.addEventListener('click',()=>{this.selectedFieldPotion=this.selectedFieldPotion===button.dataset.fieldPotion?undefined:button.dataset.fieldPotion;this.root.querySelectorAll('[data-field-potion]').forEach(item=>item.classList.toggle('is-selected',item===button&&!!this.selectedFieldPotion));}));
    this.on('#editor','click',()=>this.state.set('EDITOR'));
  }

  private forest():void{
    this.prepareShopQueue();this.night??=new NightSystem().create(this.data.day,this.shopQueue);if(!this.night.plants.some(item=>item.instanceId.startsWith('map-')))this.night.plants=WHISPERWOOD_MAP.plants.map(item=>({instanceId:item.id,plantId:item.plantId,x:item.x,z:0,harvested:false,discovered:false}));
    const harvested=this.night.plants.filter(plant=>plant.harvested).length;
    this.sceneHTML(`<div class="side-night"><div id="three-stage" class="three-stage"></div><div class="side-night__title"><span class="eyebrow">${this.night.title} · ${this.traversal.name}</span><h2>The Whisperwood</h2></div><div id="side-hint" class="side-hint">Walk right. Follow the lantern grass.</div><div class="side-progress"><i id="side-progress-fill"></i><span>Gate</span></div><div id="side-discovery" class="side-discovery" hidden></div><div class="side-controls"><button id="move-left" aria-label="Move left">←</button><button id="move-right" aria-label="Move right">→</button><button id="jump" class="jump" aria-label="Jump">↑</button></div><button id="extract" class="primary side-extract" hidden>Extract specimen</button><button id="return-home" class="secondary side-return" hidden>Return home · ${harvested} gathered</button><div class="effect-chip"><b>${this.traversal.name}</b><small>${this.traversal.description}</small></div></div>`);
    this.sideScene=new SideScrollerScene(this.makeStage(),this.input);this.sideScene.enter(this.night,this.traversal.id,state=>this.updateSideForest(state));this.input.bindSideScroller(this.q('#move-left'),this.q('#move-right'),this.q('#jump'),()=>this.sideScene?.requestJump());
    this.on('#extract','click',()=>{if(this.selectedInstance){this.selectedPlant=this.selectedInstance.plantId;this.state.set('EXTRACTION');}});this.on('#return-home','click',()=>this.state.set('LAB'));
  }
  private updateSideForest(state:SideScrollState):void {
    this.selectedInstance=state.plant;this.q('#side-hint').textContent=state.hint;this.q<HTMLElement>('#side-progress-fill').style.width=`${Math.min(100,state.progress*100)}%`;const extract=this.q<HTMLButtonElement>('#extract'),back=this.q<HTMLButtonElement>('#return-home'),card=this.q<HTMLDivElement>('#side-discovery');extract.hidden=!state.plant;back.hidden=!state.atPortal;
    if(state.plant){const plant=getPlant(state.plant.plantId);card.hidden=false;card.innerHTML=`<img src="${plant.image}" alt="${plant.name}"><div><span class="eyebrow">specimen found</span><b>${plant.name}</b><small>${plant.clue}</small></div>`;}else card.hidden=true;
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
    if(this.selectedInstance)this.selectedInstance.harvested=true;
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
    this.prepareShopQueue();
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
    this.on('#next-night','click',()=>{this.data.day++;this.night=undefined;this.shopQueue=[];this.dayEvaluations=[];this.traversal=new PotionEffectSystem().effect();this.persist();this.state.set('HUB');});
  }

  private editor():void{
    const plant=getPlant(this.selectedPlant),path=plant.parts[this.editorPart].paths[0]??plant.parts.stem.paths[0];
    this.sceneHTML(`<div class="editor"><aside><button class="back" id="exit-editor">← Hub</button><p class="eyebrow">Developer tool</p><h2>Extraction path workshop</h2><label>Plant<select id="editor-plant">${PLANTS.map(p=>`<option value="${p.id}" ${p.id===plant.id?'selected':''}>${p.name}</option>`).join('')}</select></label><label>Anatomical part<select id="editor-part">${(['flower','leaf','stem','root'] as PlantPartId[]).map(id=>`<option value="${id}" ${id===this.editorPart?'selected':''}>${id}</option>`).join('')}</select></label><label>Load plant image<input id="plant-upload" type="file" accept="image/*"></label><label>Tolerance<input id="tolerance" type="range" min="0.015" max="0.1" step="0.005" value="${path.tolerance}"></label><label>Minimum speed<input id="min-speed" type="number" step=".01" value="${path.minSpeed}"></label><label>Target speed<input id="target-speed" type="number" step=".01" value="${path.targetSpeed}"></label><label>Maximum speed<input id="max-speed" type="number" step=".01" value="${path.maxSpeed}"></label><div class="editor-actions"><button class="secondary" id="new-path">New path</button><button class="secondary" id="gap">Insert gap</button><button class="secondary" id="import">Import JSON</button><button class="primary" id="export">Export JSON</button><button class="ghost" id="test">Test path</button></div></aside><div class="editor-canvas"><img id="editor-image" src="${plant.image}" alt="${plant.name}"><canvas id="editor-overlay"></canvas></div><textarea id="json" spellcheck="false" aria-label="Path JSON"></textarea></div>`);
    const editor=new PathEditor(this.q('#editor-overlay'),this.q('#editor-image'),path,this.q('#json'));
    this.on('#new-path','click',()=>{this.q<HTMLTextAreaElement>('#json').value=JSON.stringify({...path,id:`${plant.id}-${this.editorPart}-new`,partId:this.editorPart,segments:[{points:[]}]},null,2);editor.import();});this.on('#gap','click',()=>editor.addSegment());this.on('#import','click',()=>editor.import());this.on('#export','click',()=>editor.download());this.on('#test','click',()=>{getPlant(this.selectedPlant).parts[this.editorPart].paths[0]=editor.value;this.state.set('EXTRACTION');});this.on('#editor-plant','change',(e)=>{this.selectedPlant=(e.target as HTMLSelectElement).value;this.state.set('EDITOR');});this.on('#editor-part','change',(e)=>{this.editorPart=(e.target as HTMLSelectElement).value as PlantPartId;this.state.set('EDITOR');});this.on('#plant-upload','change',(e)=>{const file=(e.target as HTMLInputElement).files?.[0];if(file)this.q<HTMLImageElement>('#editor-image').src=URL.createObjectURL(file);});this.on('#exit-editor','click',()=>this.state.set('HUB'));
    (['tolerance','min-speed','target-speed','max-speed'] as const).forEach(id=>this.on(`#${id}`,'input',(e)=>{const json=this.q<HTMLTextAreaElement>('#json'),data=JSON.parse(json.value),value=Number((e.target as HTMLInputElement).value);data[id==='min-speed'?'minSpeed':id==='target-speed'?'targetSpeed':id==='max-speed'?'maxSpeed':'tolerance']=value;json.value=JSON.stringify(data,null,2);editor.import();}));
  }

  private prepareShopQueue():void{
    if(!this.shopQueue.length)this.shopQueue=Array.from({length:3},(_,i)=>CUSTOMERS[(this.data.day*2+i-2)%CUSTOMERS.length]);
  }

  private sceneHTML(html:string):void{this.q('#scene').innerHTML=html;}
  private q<T extends Element=HTMLElement>(selector:string):T{const element=this.root.querySelector<T>(selector);if(!element)throw new Error(`Missing ${selector}`);return element;}
  private on(selector:string,type:string,handler:(event:Event)=>void):void{this.q(selector).addEventListener(type,handler);}
}
