import type { CustomerDefinition, PotionInstance } from '../data/types';
export type CustomerOutcome = 'EXCELLENT' | 'ACCEPTABLE' | 'POOR' | 'HARMFUL' | 'REFUSED';
export interface Evaluation { outcome: CustomerOutcome; gold: number; reputation: number; reaction: string; match: number }
export class CustomerEvaluationSystem {
  evaluate(customer: CustomerDefinition, potion?: PotionInstance): Evaluation {
    if (!potion) return { outcome:'REFUSED', gold:0, reputation:-1, reaction:'Then I must try the road without it.', match:0 };
    const needs = Object.entries(customer.desiredTraits);
    const match = needs.reduce((sum,[key,value]) => sum + Math.min(1, potion.traits[key as keyof typeof potion.traits] / (value ?? 1)), 0) / Math.max(1, needs.length);
    if (potion.traits.toxicity > customer.maxToxicity * 2) return { outcome:'HARMFUL', gold:0, reputation:-4, reaction:'I feel… worse. Much worse.', match };
    if (match >= .9 && potion.traits.toxicity <= customer.maxToxicity) return { outcome:'EXCELLENT', gold:customer.reward, reputation:3, reaction:'Gods, that worked immediately.', match };
    if (match >= .55 && potion.traits.toxicity <= customer.maxToxicity * 1.5) return { outcome:'ACCEPTABLE', gold:Math.round(customer.reward*.65), reputation:1, reaction:'Not perfect, but I can face the road.', match };
    return { outcome:'POOR', gold:Math.round(customer.reward*.2), reputation:-2, reaction:'That was not what I needed.', match };
  }
}
