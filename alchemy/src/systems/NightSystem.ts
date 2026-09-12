import { PLANTS } from '../data/plants';
import type { NightLayout, NightPlantInstance } from '../data/types';

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
  create(day:number):NightLayout {
    const seed=day*7919+1337,rng=rngFor(seed),condition=CONDITIONS[(day-1)%CONDITIONS.length];
    const slots=[...CLEARING_SLOTS].sort(()=>rng()-.5).slice(0,9+Math.min(2,Math.floor(day/3)));
    const common=PLANTS.filter(p=>p.rarity==='common'),uncommon=PLANTS.filter(p=>p.rarity==='uncommon'),rare=PLANTS.filter(p=>p.rarity==='rare');
    const choose=()=>{const roll=rng(),pool=roll>.87?rare:roll>.55?uncommon:common;return pool[Math.floor(rng()*pool.length)]??PLANTS[0];};
    const plants:NightPlantInstance[]=slots.map(([x,z],index)=>({instanceId:`${seed}-${index}`,plantId:choose().id,x:x+(rng()-.5)*1.4,z:z+(rng()-.5)*1.4,harvested:false,discovered:false}));
    return {seed,title:condition.title,condition:condition.condition,tint:condition.tint,fog:condition.fog,plants,landmarks:[
      {type:'pool',x:slots[2]?.[0]??3,z:slots[2]?.[1]??2},
      {type:'fallen-log',x:slots[5]?.[0]??-3,z:slots[5]?.[1]??4},
      {type:'stones',x:slots[7]?.[0]??5,z:slots[7]?.[1]??-4},
    ]};
  }
}
