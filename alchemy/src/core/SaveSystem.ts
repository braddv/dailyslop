import type { SaveData } from '../data/types';

const KEY = 'moonroot-apothecary-save-v1';
export const defaultSave = (): SaveData => ({ version: 1, day: 1, gold: 12, reputation: 0, ingredients: [], potions: [], discoveredPlants: [], unlockedPortals: ['moon-gate'] });

export class SaveSystem {
  load(): SaveData {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return defaultSave();
      const data = JSON.parse(raw) as Partial<SaveData>;
      if (data.version !== 1 || !Array.isArray(data.ingredients) || !Array.isArray(data.potions)) return defaultSave();
      return { ...defaultSave(), ...data } as SaveData;
    } catch { return defaultSave(); }
  }
  save(data: SaveData): void { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { /* private browsing */ } }
  clear(): void { localStorage.removeItem(KEY); }
}
