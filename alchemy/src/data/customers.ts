import type { CustomerDefinition } from './types';

export const CUSTOMERS: CustomerDefinition[] = [
  { id:'courier', name:'Mira Fen', role:'Exhausted courier', portrait:'✦', dialogue:"I haven't slept in three nights. The mountain pass closes by dawn.", clue:'Heavy eyelids · urgent journey', desiredTraits:{energy:3}, maxToxicity:1, reward:16 },
  { id:'squire', name:'Tovin Hale', role:'Young squire', portrait:'♞', dialogue:"My hands won't stop shaking. Tomorrow they put a lance in them.", clue:'Trembling · clear breathing', desiredTraits:{calm:3}, maxToxicity:1, reward:14 },
  { id:'ranger', name:'Ilyra Moss', role:'Marsh ranger', portrait:'❧', dialogue:"Something bit me in the reeds. The wound is hot enough to steam rain.", clue:'Swollen bite · feverish skin', desiredTraits:{healing:3}, maxToxicity:.75, reward:20 },
  { id:'miner', name:'Bram Coalhand', role:'Cavern miner', portrait:'◆', dialogue:"The cave spores painted everything green. Even my dreams taste like moss.", clue:'Dazed · shallow breathing', desiredTraits:{healing:2,calm:1}, maxToxicity:.45, reward:19 },
  { id:'bard', name:'Sable Quill', role:'Road bard', portrait:'♪', dialogue:"My voice has gone thin and my courage with it. The inn expects a song tonight.", clue:'Raw throat · nervous pulse', desiredTraits:{healing:1.5,calm:2}, maxToxicity:1, reward:17 },
  { id:'sentinel', name:'Orra Vey', role:'Night sentinel', portrait:'☾', dialogue:"The moon keeps calling my name from the wall. I need quiet inside my skull.", clue:'Restless · overstimulated', desiredTraits:{calm:3}, maxToxicity:.6, reward:22 },
];
