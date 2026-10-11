import { npcs } from '../data/research';
import { hour, type State } from './state';
import type { Point } from '../world/geography';
export function npcSchedule(s:State,id:string,work:Point,home:Point):{position:Point;activity:string}{const npc=npcs.find(n=>n.id===id)!,h=hour(s),[open,close]=npc.hours;const lerp=(a:Point,b:Point,t:number)=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});if(h>=open&&h<close)return {position:work,activity:'At the workshop'};if(h>=open-1&&h<open)return {position:lerp(home,work,h-(open-1)),activity:'Walking to work'};if(h>=close&&h<close+1)return {position:lerp(work,home,h-close),activity:'Walking home'};return {position:home,activity:h>=close+1&&h<22?'Resting in the town garden':'At home'};}
