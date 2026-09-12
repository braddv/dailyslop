import { EMPTY_TRAITS } from '../data/traits';
import type { IngredientInstance, PotionInstance, TraitProfile } from '../data/types';

export interface PotionRule { name: string; test: (traits: TraitProfile) => boolean }
export const POTION_RULES: PotionRule[] = [
  { name: 'Restorative Draught', test: (t) => t.healing >= 3 && t.toxicity < 2 },
  { name: 'Soothing Elixir', test: (t) => t.calm >= 3 && t.calm >= t.energy },
  { name: 'Vigor Tonic', test: (t) => t.energy >= 3 && t.energy >= t.healing },
  { name: 'Venomous Decoction', test: (t) => t.toxicity >= 3 },
  { name: 'Prismatic Remedy', test: (t) => [t.healing,t.energy,t.calm].filter((value) => value >= 2).length >= 2 },
];
export class PotionSystem {
  brew(ingredients: IngredientInstance[], stirQuality: number): PotionInstance {
    const multiplier = .82 + Math.max(0, Math.min(1, stirQuality)) * .23;
    const traits = ingredients.reduce((sum, item) => {
      (Object.keys(sum) as (keyof TraitProfile)[]).forEach((key) => { sum[key] += item.traits[key] * multiplier; }); return sum;
    }, EMPTY_TRAITS());
    const name = POTION_RULES.find((rule) => rule.test(traits))?.name ?? 'Uncatalogued Infusion';
    return { id: crypto.randomUUID(), name, quality: Math.round(stirQuality * 100), traits, ingredientIds: ingredients.map((item) => item.id) };
  }
}
