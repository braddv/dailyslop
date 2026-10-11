import { questions } from '../data/research';
export interface ExperimentRecord { id:number; time:number; materials:string[]; procedure:string; condition:string; result:string; products:string[] }
export interface SkyRecord { time:number; day:number; hour:number; site:string; angle:number; quality:number; target:string }
export interface Order { id:string; npc:string; due:number; delivered:boolean; name:string }
export interface Job { due:number; products:string[]; name:string }
export interface State { version:number; jobs:Job[]; x:number; y:number; interior:boolean; minutes:number; inventory:Record<string,number>; seen:string[]; logs:ExperimentRecord[]; observations:{time:number;text:string}[]; sky:SkyRecord[]; evidence:string[]; discoveries:string[]; money:number; trust:Record<string,number>; orders:Order[]; commission:'none'|'accepted'|'complete'; staff:string; lens:boolean; arc:boolean; manuscript:boolean; visited:string[]; collected:Record<string,number>; settings:{highlight:boolean; volume:number; dayLength:number}; hypothesis:{angle:number;day:number;hour:number}|null; intro:boolean }
export const initialState=():State=>({version:2,jobs:[],x:11886,y:16400,interior:false,minutes:8*60,inventory:{water:3},seen:[],logs:[],observations:[],sky:[],evidence:[],discoveries:[],money:18,trust:{},orders:[],commission:'none',staff:'wooden',lens:false,arc:false,manuscript:false,visited:[],collected:{},settings:{highlight:true,volume:0.25,dayLength:22},hypothesis:null,intro:false});
export const day=(s:State)=>Math.floor(s.minutes/1440)+1;
export const hour=(s:State)=>(s.minutes%1440)/60;
export const isNight=(s:State)=>hour(s)>=20||hour(s)<5;
export const stamp=(minutes:number)=>`Day ${Math.floor(minutes/1440)+1} · ${String(Math.floor(minutes%1440/60)).padStart(2,'0')}:${String(Math.floor(minutes%60)).padStart(2,'0')}`;
export type Weather='clear'|'cloudy'|'rain';
export const weather=(s:State):Weather=>{const d=day(s);return (['clear','clear','rain','clear','cloudy','clear','rain'] as Weather[])[(d-1)%7];};
export const addEvidence=(s:State,...ids:string[])=>{for(const id of ids)if(!s.evidence.includes(id))s.evidence.push(id);return resolveResearch(s);};
export function resolveResearch(s:State):string[]{const fresh:string[]=[];let changed=true;while(changed){changed=false;for(const q of questions)if(!s.discoveries.includes(q.id)&&q.evidence.every(e=>s.evidence.includes(e))){s.discoveries.push(q.id);s.evidence.push(q.id);fresh.push(q.id);changed=true;}}return fresh;}
export const addObservation=(s:State,text:string)=>{if(!s.observations.some(o=>o.text===text))s.observations.push({time:s.minutes,text});};
export const addItem=(s:State,id:string,n=1)=>{s.inventory[id]=(s.inventory[id]??0)+n;};
export function takeItems(s:State,items:string[]):boolean {const counts:Record<string,number>={};for(const id of items)counts[id]=(counts[id]??0)+1;if(Object.entries(counts).some(([id,n])=>(s.inventory[id]??0)<n))return false;for(const [id,n]of Object.entries(counts))s.inventory[id]-=n;return true;}
