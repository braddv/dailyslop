import { initialState, type State } from './state';
export const SAVE_KEY='magus:chapter-one';
export function serialize(s:State){return JSON.stringify({...s,version:2});}
export function deserialize(raw:string):State {const p=JSON.parse(raw);if(!p||typeof p!=='object'||p.version>2)throw new Error('This save requires a newer edition of MAGUS.');const s={...initialState(),...p,settings:{...initialState().settings,...p.settings},version:2};if(!Number.isFinite(s.x)||!Number.isFinite(s.y)||!Number.isFinite(s.minutes)||!Array.isArray(s.logs)||!Array.isArray(s.evidence)||!s.inventory||typeof s.inventory!=='object')throw new Error('The notebook could not be read.');return s;}
export function load():State|null {try{const raw=localStorage.getItem(SAVE_KEY);return raw?deserialize(raw):null;}catch{try{const backup=localStorage.getItem(SAVE_KEY+':backup');return backup?deserialize(backup):null;}catch{return null;}}}
export function save(s:State):boolean{try{const old=localStorage.getItem(SAVE_KEY);if(old)localStorage.setItem(SAVE_KEY+':backup',old);localStorage.setItem(SAVE_KEY,serialize(s));return true;}catch{return false;}}
