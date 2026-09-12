export interface ForestDefinition { id: string; name: string; subtitle: string; plants: string[]; fog: number; ground: number }
export interface PortalDefinition { id: string; name: string; forestId: string; unlocked: boolean; theme: string; availablePlants: string[]; rarityModifier: number; riskModifier: number }

export const FORESTS: ForestDefinition[] = [{ id: 'whisperwood', name: 'The Whisperwood', subtitle: 'A different path wakes under every moon', plants: ['glowlily', 'duskbane', 'sunspire', 'mossbell', 'bloodberry', 'emberreed', 'ghostfern'], fog: 0x17182d, ground: 0x1d372c }];
export const PORTALS: PortalDefinition[] = [{ id: 'moon-gate', name: 'Moon Gate', forestId: 'whisperwood', unlocked: true, theme: 'lunar', availablePlants: FORESTS[0].plants, rarityModifier: 1, riskModifier: .15 }];
