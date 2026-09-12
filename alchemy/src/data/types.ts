import type { ExtractionPath } from '../extraction/PathTypes';

export type TraitId = 'healing' | 'energy' | 'calm' | 'toxicity';
export type TraitProfile = Record<TraitId, number>;
export type PlantPartId = 'flower' | 'leaf' | 'stem' | 'root';
export type GameState = 'HUB' | 'FOREST' | 'EXTRACTION' | 'LAB' | 'SHOP' | 'RESULTS' | 'EDITOR';

export interface PlantPartDefinition {
  name: string;
  traits: TraitProfile;
  paths: ExtractionPath[];
}
export interface PlantDefinition {
  id: string;
  name: string;
  image: string;
  accent: string;
  forestTags: string[];
  parts: Record<PlantPartId, PlantPartDefinition>;
  rarity: 'common' | 'uncommon' | 'rare';
  clue: string;
}
export interface IngredientInstance {
  id: string;
  sourcePlantId: string;
  plantName: string;
  partId: PlantPartId;
  quality: number;
  traits: TraitProfile;
  contamination: number;
  day: number;
}
export interface PotionInstance {
  id: string;
  name: string;
  quality: number;
  traits: TraitProfile;
  ingredientIds: string[];
}
export interface CustomerDefinition {
  id: string;
  name: string;
  role: string;
  portrait: string;
  dialogue: string;
  clue: string;
  desiredTraits: Partial<TraitProfile>;
  maxToxicity: number;
  reward: number;
}
export interface SaveData {
  version: 1;
  day: number;
  gold: number;
  reputation: number;
  ingredients: IngredientInstance[];
  potions: PotionInstance[];
  discoveredPlants: string[];
  unlockedPortals: string[];
}

export interface NightPlantInstance {
  instanceId: string;
  plantId: string;
  x: number;
  z: number;
  harvested: boolean;
  discovered: boolean;
}

export interface NightLayout {
  seed: number;
  title: string;
  condition: string;
  tint: number;
  fog: number;
  plants: NightPlantInstance[];
  landmarks: Array<{ type: 'pool' | 'stones' | 'fallen-log'; x: number; z: number }>;
}
