import { npcs } from '../data/research';
import { type State, hour, addEvidence, addItem, takeItems, addObservation } from './state';
export const isOpen=(s:State,id:string)=>{const n=npcs.find(n=>n.id===id)!;return hour(s)>=n.hours[0]&&hour(s)<n.hours[1];};
export function collaborate(s:State,id:string,action:string):string {
 if(!isOpen(s,id))return 'The workshop is closed. The sign lists its opening hours; return tomorrow or sleep until morning.';
 const trust=()=>{s.trust[id]=(s.trust[id]??0)+1;};
 if(action==='talk'){const key=`talk-${id}`;if(!s.evidence.includes(key)){trust();addEvidence(s,key);addObservation(s,npcs.find(n=>n.id===id)!.dialogue);}return npcs.find(n=>n.id===id)!.dialogue;}
 if(action==='accept'){if(s.commission!=='none')return 'The pale-field investigation is already in your journal.';s.commission='accepted';addItem(s,'fieldsoil',6);addItem(s,'soil',3);addEvidence(s,'commission-accepted');trust();return 'Elin provides six field samples and three meadow controls. Compare their response to bellflower indicator and report your evidence. Reward: 24 crowns.';}
 if(action==='report'){if(s.commission==='complete')return 'Elin has already paid for your report. Her comparison beds will test the recommendation.';if(!s.discoveries.includes('soil'))return 'Elin needs a controlled comparison: establish the pigment indicator, then test field and meadow soil. See Research Questions for evidence.';s.commission='complete';s.money+=24;trust();return 'Elin pays 24 crowns and plans a small leaf-mould trial with an untreated control strip. “A test we can repeat. That is useful work.”';}
 if(action==='optics-report'){if(s.evidence.includes('optics-paid'))return 'The optical comparison has already been rewarded.';if(!s.discoveries.includes('optics'))return 'Ivo asks for clear quartz, gently heated resin, and a pyrite comparison under magnification.';s.money+=12;trust();addEvidence(s,'optics-paid');return 'Ivo pays 12 crowns for the optical comparison. “Now we know why a bright stone is not always a useful one.”';}
 if(action==='mineral-report'){if(s.evidence.includes('mineral-paid'))return 'Beren has already paid for that report.';if(!s.logs.some(l=>l.materials[0]?.startsWith('ironstone')&&l.procedure==='Heat')||!s.logs.some(l=>l.materials[0]?.startsWith('pyrite')&&l.procedure==='Magnify'))return 'Beren requests a heated ironstone sample and a magnified pyrite comparison. He wants observations rather than a promise of gold.';s.money+=10;trust();addEvidence(s,'mineral-paid');return 'Beren pays 10 crowns for distinguishing the ores.';}
 if(action==='journal-report'){if(s.evidence.includes('journal-paid'))return 'Seda has already paid for permission to copy these notes.';if(s.seen.length<8||s.logs.length<6)return 'Seda would copy a field catalogue of eight species with six recorded experiments for 8 crowns.';s.money+=8;trust();addEvidence(s,'journal-paid');return 'Seda pays 8 crowns for a copy of your carefully dated observations.';}
 if(action==='book'){if(s.manuscript)return 'The surveyor’s manuscript is already in your journal.';if(s.money<6)return 'The manuscript costs 6 crowns.';s.money-=6;s.manuscript=true;trust();addObservation(s,'The surveyor’s manuscript: “At the fourth notch, watch the wanderer beside the Swan. Measure the same hour on three nights; a regular advance makes a prediction.”');return 'You purchase the surveyor’s manuscript. The old marker’s symbols can now be read in the field.';}
 const recipes:Record<string,{npc:string;cost:number;materials:string[];name:string;duration:number}>={
 'staff-ash':{npc:'carpenter',cost:8,materials:['ash:dry'],name:'Fitted ash walking staff',duration:180},
 'staff-oak':{npc:'carpenter',cost:8,materials:['oak:dry'],name:'Fitted oak walking staff',duration:180},
 'staff-rowan':{npc:'carpenter',cost:12,materials:['ridgewood:dry'],name:'Spiral rowan walking staff',duration:240},
 lens:{npc:'glassmaker',cost:12,materials:['quartz','resin:clarified'],name:'Quartz measuring lens',duration:180},
 arc:{npc:'smith',cost:10,materials:[],name:'Graduated observing arc',duration:180}
 };
 if(action.startsWith('collect:')){const order=s.orders.find(o=>o.id===action.slice(8));if(!order||order.delivered)return 'There is no outstanding order.';if(s.minutes<order.due)return 'The artisan is still working. The due time is in your commission ledger.';order.delivered=true;if(order.id.startsWith('staff')){s.staff=order.id==='staff-rowan'?'rowan':'fitted';addEvidence(s,'staff-delivered');}if(order.id==='lens')s.lens=true;if(order.id==='arc')s.arc=true;if(s.lens&&s.arc)addEvidence(s,'instrument');trust();return `Collected: ${order.name}. Your collaborator explains how to use and care for it.`;}
 const r=recipes[action];if(!r||r.npc!==id)return 'This artisan does not make that equipment.';
 if(s.orders.some(o=>o.id===action))return 'That equipment has already been commissioned.';
 if(action==='lens'&&!s.discoveries.includes('optics'))return 'First establish the optical comparison in your laboratory.';
 if(action==='staff-rowan'&&!s.discoveries.includes('staff'))return 'Mara wants you to understand the ordinary fitted staff before working the spiral rowan.';
 if(s.money<r.cost)return `You need ${r.cost} crowns. Research reports can earn more.`;
 if(!takeItems(s,r.materials))return 'Missing material: '+r.materials.join(', ')+'. Prepare it at your workbench.';
 s.money-=r.cost;s.orders.push({id:action,npc:id,due:s.minutes+r.duration,delivered:false,name:r.name});trust();return `Commissioned ${r.name}. Ready in ${r.duration/60} in-game hours. Return during opening hours to collect it.`;
}
