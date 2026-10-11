import Phaser from 'phaser';
import { studies } from './studies';
import { npcs } from '../data/research';
import { npcSchedule } from '../systems/schedules';
import { type State } from '../systems/state';
import { places, placeById, dist, type Point } from './geography';
export interface Interaction extends Point {id:string;name:string;kind:'cabin'|'sky'|'sign'|'npc'|'marker'|'future'|'lab'|'shelf'|'storage'|'bed'|'exit'|'water'|'study';npc?:string;text?:string}
export const shops=[{id:'carpenter',x:-240,y:-95},{id:'glassmaker',x:-70,y:-185},{id:'smith',x:120,y:-170},{id:'farmer',x:225,y:70},{id:'bookseller',x:-170,y:145}];
export const interactions:Interaction[]=[
...studies.map(s=>({...s,kind:'study' as const})),
{x:12000,y:15995,id:'cabin-door',name:'Enter your cabin',kind:'cabin'},
{x:12125,y:16010,id:'cabin-sky',name:'Observe the sky',kind:'sky'},
{x:11870,y:16020,id:'cistern',name:'Refill field water vials',kind:'water'},
{x:6500,y:1830,id:'ridge-sky',name:'Observe the ridge sky',kind:'sky'},
{x:15800,y:3210,id:'survey-marker',name:'Read the survey marker',kind:'marker'},
...shops.map(s=>({x:27000+s.x,y:10500+s.y,id:s.id,name:s.id[0].toUpperCase()+s.id.slice(1)+'’s workshop',kind:'npc' as const,npc:s.id})),
...places.map(p=>({x:p.x-35,y:p.y+45,id:'sign-'+p.id,name:p.name+' trail sign',kind:'sign' as const,text:p.subtitle})),
{x:13225,y:25085,id:'quarry',name:'Quarry cartway',kind:'future',text:'A washed-out stone culvert blocks the quarry cartway. The smith speaks of rebuilding it in a later season.'},
{x:6570,y:1660,id:'upper-forest',name:'Upper forest stair',kind:'future',text:'Storm-felled trunks close the upper stair. New habitats lie beyond; this chapter ends at the lower ridge.'},
{x:19600,y:23630,id:'marsh',name:'Marsh causeway',kind:'future',text:'The old reed causeway has collapsed into deep water. Survey stakes show where a future crossing will begin.'},
{x:24540,y:1760,id:'observatory-gate',name:'Old observatory stair',kind:'future',text:'The observatory’s stone stair is broken above the approach. A brass plate carries the Swan emblem. There will be another chapter here.'}
];
export const interiorInteractions:Interaction[]=[{x:90,y:68,id:'lab',name:'Laboratory workbench',kind:'lab'},{x:-98,y:70,id:'shelf',name:'Research bookshelf',kind:'shelf'},{x:-92,y:144,id:'storage',name:'Specimen storage',kind:'storage'},{x:100,y:156,id:'bed',name:'Sleep and advance time',kind:'bed'},{x:0,y:218,id:'exit',name:'Return to the clearing',kind:'exit'}];
export class Landmarks {
 images:Phaser.GameObjects.GameObject[]=[];
 private citizens:{id:string;image:Phaser.GameObjects.Image;work:Point;home:Point}[]=[];
 constructor(private scene:Phaser.Scene){}
 render(p:Point,interior:boolean){this.clear();if(interior){this.interior();return;}for(const study of studies.filter(s=>dist(p,s)<850)){this.add(study.x,study.y,'sign');if(study.type==='windthrow'){this.add(study.x+10,study.y-25,'log');this.add(study.x+24,study.y-35,'log');this.add(study.x+5,study.y-50,'log');this.add(study.x-28,study.y-22,'spec-fern');}if(study.type==='cairn'){this.add(study.x+12,study.y-23,'marker');this.add(study.x-20,study.y-8,'rock');this.add(study.x+23,study.y-7,'rock');}if(study.type==='hearth'){for(let i=0;i<6;i++)this.add(study.x+Math.cos(i)*26,study.y-28+Math.sin(i)*14,'rock');this.add(study.x-5,study.y-28,'log');}if(study.type==='glade'){for(let i=0;i<7;i++)this.add(study.x+Math.cos(i)*30,study.y-25+Math.sin(i)*25,'spec-'+(i%2?'fern':'wildflower'));}}for(const place of places.filter(c=>dist(c,p)<1100)){
  this.add(place.x-35,place.y+45,'sign');
  if(place.id==='cabin'){this.add(place.x,place.y-18,'cabin');this.add(place.x+125,place.y+10,'scope');this.add(place.x-130,place.y+20,'chest');}
  if(place.id==='marker')this.add(place.x,place.y,'marker');
  if(place.id==='ridge')this.add(place.x,place.y+30,'scope');
  if(place.id==='town'){
 this.add(place.x+65,place.y+75,'well');this.add(place.x-65,place.y-25,'lantern');this.add(place.x+130,place.y+145,'lantern');
 shops.forEach((s,i)=>{this.add(place.x+s.x,place.y+s.y-20,'shop'+i);const work={x:place.x+s.x,y:place.y+s.y},home={x:place.x-60+i*32,y:place.y+310};const image=this.scene.add.image(work.x,work.y,'npc'+i).setOrigin(.5,.92).setDepth(work.y);this.images.push(image);this.citizens.push({id:s.id,image,work,home});
 const label=this.scene.add.text(work.x,work.y-70,npcs[i].name+' · '+npcs[i].trade,{fontFamily:'Georgia',fontSize:'7px',color:'#efe1b8',backgroundColor:'#4b4937',padding:{x:3,y:2}}).setOrigin(.5).setDepth(work.y+1);this.images.push(label);
 if(i===0){this.add(work.x-65,work.y+10,'tools');this.add(work.x-59,work.y+38,'log');this.add(work.x+62,work.y-5,'bench');}
 if(i===1){this.add(work.x-55,work.y+5,'kiln');this.add(work.x+55,work.y+8,'bench');}
 if(i===2){this.add(work.x+55,work.y+10,'kiln');this.add(work.x-55,work.y+8,'tools');}
 if(i===3){this.add(work.x-58,work.y+4,'basket');this.add(work.x-61,work.y+30,'basket');for(let j=0;j<3;j++)this.add(work.x+45,work.y+15+j*26,'fence');}
 if(i===4){this.add(work.x-61,work.y+8,'bench');this.add(work.x-61,work.y+2,'papers');this.add(work.x+57,work.y+10,'stool');}
 });for(let i=0;i<3;i++){this.add(place.x-95+i*80,place.y+350,'shop0');this.add(place.x-90+i*80,place.y+280,'bush');}for(let i=0;i<4;i++)this.add(place.x-130+i*64,place.y+270,'fence');}

  if(place.id==='observatory'){const g=this.scene.add.graphics().setDepth(place.y);g.fillStyle(0x697866);for(let i=0;i<6;i++)g.fillRect(place.x-30+i*2,place.y-80-i*12,80-i*8,9);this.images.push(g);this.add(place.x+40,place.y-40,'marker');}
  if(place.id==='creek')this.add(place.x+225,place.y+85,'sign');if(place.id==='pool')this.add(place.x+200,place.y+130,'sign');
 }}
 update(s:State){for(const citizen of this.citizens){const {position,activity}=npcSchedule(s,citizen.id,citizen.work,citizen.home);citizen.image.setPosition(position.x,position.y).setDepth(position.y).setVisible(activity!=='At home');}}
 private add(x:number,y:number,key:string){const obj=this.scene.add.image(x,y,key).setOrigin(.5,.92).setDepth(y);this.images.push(obj);}
 private interior(){const g=this.scene.add.graphics().setDepth(-80);g.fillStyle(0x142a24);g.fillRect(-400,-200,800,650);g.fillStyle(0x443b30);g.fillRect(-160,0,320,240);g.fillStyle(0x937a53);g.fillRect(-150,15,300,215);for(let y=20;y<230;y+=12){g.fillStyle(y%24?0x806a48:0x9b8158);g.fillRect(-146,y,292,10);g.fillStyle(0x64543b);g.fillRect(-145,y+10,290,1);for(let x=-140;x<140;x+=48)g.fillRect(x+(y%24?24:0),y,1,10);}g.fillStyle(0x594731);g.fillRect(-160,-20,320,43);g.fillStyle(0xb6a179);g.fillRect(-150,-16,300,25);g.fillStyle(0x685536);g.fillRect(-155,10,310,8);g.fillStyle(0x4d4937);g.fillRect(-153,15,8,215);g.fillRect(145,15,8,215);g.fillStyle(0xd0c29b);g.fillRect(-15,222,30,15);g.fillStyle(0x354d43);g.fillRect(-30,82,60,96);g.fillStyle(0x667d63);g.fillRect(-26,86,52,88);g.lineStyle(1,0xbaa878,.6);g.strokeRect(-21,91,42,78);this.images.push(g);this.add(90,68,'bench');this.add(-98,70,'shelf');this.add(-92,144,'chest');this.add(100,156,'bed');this.add(88,62,'papers');this.add(87,96,'stool');this.add(-93,196,'basket');this.add(-48,30,'herbs');this.add(132,74,'lantern');this.add(119,40,'kiln');this.add(-35,195,'papers');const window=this.scene.add.graphics().setDepth(30);window.fillStyle(0x536652);window.fillRect(-18,-13,36,26);window.fillStyle(0xd5d4a5);window.fillRect(-15,-10,30,20);window.fillStyle(0x696c49);window.fillRect(-1,-10,2,20);window.fillRect(-15,-1,30,2);this.images.push(window);}
 clear(){this.images.forEach(i=>i.destroy());this.images=[];this.citizens=[];}
 collision(p:Point,interior:boolean){if(interior){if(p.x<-137||p.x>137||p.y<32||p.y>228)return true;return [{x:90,y:55,w:48,h:27},{x:-98,y:44,w:48,h:36},{x:-92,y:132,w:40,h:18},{x:100,y:134,w:44,h:46}].some(r=>Math.abs(p.x-r.x)<r.w/2+4&&Math.abs(p.y-r.y)<r.h/2+4);}const cabin=placeById.cabin;if(Math.abs(p.x-cabin.x)<46&&p.y>cabin.y-80&&p.y<cabin.y-15)return true;const town=placeById.town;if(dist(p,{x:town.x+65,y:town.y+75})<21)return true;return shops.some(s=>Math.abs(p.x-town.x-s.x)<42&&p.y>town.y+s.y-83&&p.y<town.y+s.y-24);}
}
