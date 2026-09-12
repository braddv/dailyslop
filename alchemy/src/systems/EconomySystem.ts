import type { SaveData } from '../data/types';
export class EconomySystem { constructor(private data: SaveData) {} apply(gold: number, reputation: number): void { this.data.gold = Math.max(0, this.data.gold + gold); this.data.reputation += reputation; } }
