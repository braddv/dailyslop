import type { PotionInstance } from '../data/types';

export type TraversalEffect = 'none' | 'speed' | 'jump' | 'calm' | 'bark';
export interface PotionTraversal { id:TraversalEffect; name:string; description:string }

export class PotionEffectSystem {
  effect(potion?:PotionInstance):PotionTraversal {
    if(!potion)return {id:'none',name:'No field potion',description:'Standard movement only'};
    const t=potion.traits;
    if(t.healing>=2&&t.toxicity>=.7)return {id:'bark',name:'Barkskin',description:'Cross moon-thorns unharmed'};
    if(t.calm>=3&&t.energy<3)return {id:'calm',name:'Stillmind',description:'Walk through disorienting spores'};
    if(t.energy>=3&&t.calm>=1.5)return {id:'jump',name:'Springstep',description:'Jump higher and reach the canopy'};
    if(t.energy>=3)return {id:'speed',name:'Fleetfoot',description:'Run faster and clear long gaps'};
    if(t.healing>=3)return {id:'bark',name:'Barkskin',description:'Cross moon-thorns unharmed'};
    return {id:'none',name:'Field tonic',description:'No traversal effect discovered'};
  }
}
