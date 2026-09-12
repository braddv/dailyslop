import { TRAIT_LABELS } from '../data/traits';
import type { TraitProfile } from '../data/types';
export const traitsHTML = (traits: TraitProfile): string => (Object.entries(traits) as [keyof TraitProfile,number][]).filter(([,v]) => v > .04).map(([key,value]) => `<span class="trait trait--${key}">${TRAIT_LABELS[key]} ${value.toFixed(1)}</span>`).join('');
export const qualityBand = (quality: number): string => quality >= 95 ? 'PRISTINE' : quality >= 80 ? 'CLEAN' : quality >= 60 ? 'ROUGH' : quality >= 40 ? 'CONTAMINATED' : 'RUINED';
