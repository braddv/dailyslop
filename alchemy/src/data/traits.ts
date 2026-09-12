import type { TraitProfile } from './types';

export const EMPTY_TRAITS = (): TraitProfile => ({ healing: 0, energy: 0, calm: 0, toxicity: 0 });
export const TRAIT_LABELS = { healing: 'Healing', energy: 'Energy', calm: 'Calm', toxicity: 'Toxicity' } as const;
