import type { IngredientInstance, PlantDefinition, PlantPartId, TraitProfile } from '../data/types';

export const QUALITY_WEIGHTS = { potencyFloor: .28, toxicityCleanReduction: .2, toxicityDamageGain: 1.15 };
export class TraitSystem {
  ingredient(plant: PlantDefinition, partId: PlantPartId, quality: number, day: number): IngredientInstance {
    const q = Math.max(0, Math.min(100, quality));
    const potency = QUALITY_WEIGHTS.potencyFloor + (1 - QUALITY_WEIGHTS.potencyFloor) * q / 100;
    const traits = Object.fromEntries(Object.entries(plant.parts[partId].traits).map(([key, value]) => [key, key === 'toxicity'
      ? Math.max(0, value * (1 - QUALITY_WEIGHTS.toxicityCleanReduction * q / 100) + QUALITY_WEIGHTS.toxicityDamageGain * (1 - q / 100))
      : value * potency])) as TraitProfile;
    return { id: crypto.randomUUID(), sourcePlantId: plant.id, plantName: plant.name, partId, quality: q, traits, contamination: Math.max(0, 100 - q), day };
  }
}
