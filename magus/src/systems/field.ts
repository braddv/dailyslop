import { specimenById } from '../data/specimens';
import type { FieldNode } from '../world/geography';
import { type State, day, isNight, weather, addItem, addObservation } from './state';
export function available(s:State,node:FieldNode){const p=specimenById[node.specimen];return (!p.night||isNight(s))&&(!p.rain||weather(s)==='rain')&&(s.collected[node.id]??0)!==day(s);}
export function examineNode(s:State,node:FieldNode){const p=specimenById[node.specimen];if(!s.seen.includes(p.id))s.seen.push(p.id);addObservation(s,p.name+': '+p.note);if(node.note)addObservation(s,node.note);return p;}
export function collectNode(s:State,node:FieldNode):string {if(!available(s,node))return 'This study patch has already supplied today’s samples, or conditions are unsuitable. Other patches remain available.';examineNode(s,node);addItem(s,node.specimen,pCount(node.specimen));s.collected[node.id]=day(s);return `${pCount(node.specimen)} samples of ${specimenById[node.specimen].name} labelled and packed. Leave the remaining patch undisturbed.`;}
function pCount(id:string){return ['wildflower','water','moonwort','crystal','root','limestone'].includes(id)?6:3;}
