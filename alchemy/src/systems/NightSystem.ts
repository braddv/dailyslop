import { PLANTS } from '../data/plants';
import type { CustomerDefinition, NightLayout, NightPlantInstance, PlantDefinition, TraitId } from '../data/types';

const CLEARING_SLOTS = [
  [-7,-5],[-4,-7],[1,-7],[6,-6],[8,-2],[6,3],[3,7],[-2,8],[-7,6],[-8,1],[-3,-2],[3,1],
] as const;
const CONDITIONS = [
  { title:'Firefly Tide', condition:'Fireflies gather near living specimens.', tint:0x87dcca, fog:0x172838 },
  { title:'Violet Mist', condition:'Rare plants hum louder, but the mist lies.', tint:0xb9a0ef, fog:0x251d38 },
  { title:'Falling Stars', condition:'Warm starfall wakes energetic herbs.', tint:0xffca82, fog:0x17202f },
  { title:'Silver Rain', condition:'Dew reveals calm and restorative growth.', tint:0xbde5ed, fog:0x162a34 },
];

const rngFor = (seed:number):(()=>number) => { let value=seed>>>0; return()=>{value=(value*1664525+1013904223)>>>0;return value/4294967296;}; };

export class NightSystem {
  create(day:number,customers:CustomerDefinition[]=[]):NightLayout {
    const seed=day*7919+1337,rng=rngFor(seed),condition=CONDITIONS[(day-1)%CONDITIONS.length];
    const slots=[...CLEARING_SLOTS].sort(()=>rng()-.5).slice(0,7);
    const common=PLANTS.filter(p=>p.rarity==='common'),uncommon=PLANTS.filter(p=>p.rarity==='uncommon'),rare=PLANTS.filter(p=>p.rarity==='rare');
    const choose=()=>{const roll=rng(),pool=roll>.87?rare:roll>.55?uncommon:common;return pool[Math.floor(rng()*pool.length)]??PLANTS[0];};
    const strongest=(customer:CustomerDefinition):TraitId=>Object.entries(customer.desiredTraits).sort((a,b)=>(b[1]??0)-(a[1]??0))[0]?.[0] as TraitId ?? 'healing';
    const helpful=(trait:TraitId):PlantDefinition=>[...PLANTS].sort((a,b)=>Math.max(...Object.values(b.parts).map(part=>part.traits[trait]))-Math.max(...Object.values(a.parts).map(part=>part.traits[trait])))[0];
    const guaranteed=customers.map(customer=>helpful(strongest(customer)));
    const selected=slots.map((_,index)=>guaranteed[index]??choose()).sort(()=>rng()-.5);selected[5]=rare[Math.floor(rng()*rare.length)]??choose();selected[6]=rare[Math.floor(rng()*rare.length)]??choose();
    const plants:NightPlantInstance[]=slots.map(([x,z],index)=>({instanceId:`${seed}-${index}`,plantId:selected[index].id,x:x+(rng()-.5)*1.4,z:z+(rng()-.5)*1.4,harvested:false,discovered:false}));
    const nodeSeeds=[
      {id:'gate',title:'Moon Gate',description:'The safe path home waits behind you.',x:50,y:88,links:['lantern','bramble']},
      {id:'lantern',title:'Lantern Path',description:'Fireflies gather over a damp hollow.',x:27,y:69,links:['hush','crossroads']},
      {id:'bramble',title:'Bramble Path',description:'Warm wind moves through hooked thorns.',x:73,y:69,links:['crossroads','stones']},
      {id:'hush',title:'Hushwater',description:'Still water reflects a second, stranger moon.',x:17,y:44,links:['heart']},
      {id:'crossroads',title:'Crooked Clearing',description:'Three old trails knot beneath a dead oak.',x:50,y:46,links:['heart','crown']},
      {id:'stones',title:'Standing Stones',description:'The stones hum when the clouds pass.',x:83,y:44,links:['crown']},
      {id:'heart',title:'Forest Heart',description:'Rare roots drink from silver soil here.',x:30,y:19,links:[]},
      {id:'crown',title:'Starfall Crown',description:'A high clearing opens to the falling stars.',x:70,y:19,links:[]},
    ];
    const encounters=['none','whisper','thorns','moonwell','whisper','thorns','moonwell'] as const;
    const routeNodes=nodeSeeds.map((node,index)=>({...node,plant:index?plants[index-1]:undefined,encounter:index?encounters[index-1]:'none' as const,visited:index===0,revealed:index===0}));
    return {seed,title:condition.title,condition:condition.condition,tint:condition.tint,fog:condition.fog,plants,landmarks:[
      {type:'pool',x:slots[2]?.[0]??3,z:slots[2]?.[1]??2},
      {type:'fallen-log',x:slots[5]?.[0]??-3,z:slots[5]?.[1]??4},
      {type:'stones',x:slots[7]?.[0]??5,z:slots[7]?.[1]??-4},
    ],routeNodes,currentNodeId:'gate',stepsLeft:5,maxSteps:5};
  }
}
