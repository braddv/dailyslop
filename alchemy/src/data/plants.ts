import type { ExtractionPath } from '../extraction/PathTypes';
import type { PlantDefinition, PlantPartId, TraitProfile } from './types';

const zero = (): TraitProfile => ({ healing: 0, energy: 0, calm: 0, toxicity: 0 });
const path = (id: string, partId: PlantPartId, segments: [number, number][][], tolerance: number, speeds: [number, number, number], difficulty: ExtractionPath['difficulty']): ExtractionPath => ({
  id, partId, segments: segments.map((points) => ({ points: points.map(([x, y]) => ({ x, y })) })),
  tolerance, minSpeed: speeds[0], targetSpeed: speeds[1], maxSpeed: speeds[2], difficulty,
});
const parts = (overrides: Partial<Record<PlantPartId, { traits: Partial<TraitProfile>; paths: ExtractionPath[] }>>): PlantDefinition['parts'] =>
  Object.fromEntries((['flower', 'leaf', 'stem', 'root'] as PlantPartId[]).map((id) => [id, {
    name: id[0].toUpperCase() + id.slice(1),
    traits: { ...zero(), ...overrides[id]?.traits },
    paths: overrides[id]?.paths ?? [],
  }])) as PlantDefinition['parts'];

export const PLANTS: PlantDefinition[] = [
  {
    id: 'glowlily', name: 'Glowlily', image: 'assets/plants/glowlily.webp', accent: '#79e7de', forestTags: ['moonlit', 'healing'],
    parts: parts({
      flower: { traits: { calm: 3, healing: 1 }, paths: [path('glow-flower', 'flower', [[[.34,.20],[.40,.14],[.49,.12],[.58,.15],[.66,.22]], [[.66,.22],[.58,.27],[.49,.29],[.40,.26],[.34,.20]]], .055, [.12,.22,.45], 'beginner')] },
      leaf: { traits: { healing: 1, calm: 1 }, paths: [path('glow-leaf', 'leaf', [[[.49,.52],[.41,.49],[.32,.46]], [[.49,.52],[.59,.49],[.70,.45]]], .06, [.10,.20,.42], 'beginner')] },
      stem: { traits: { healing: 3, toxicity: 1 }, paths: [path('glow-stem', 'stem', [[[.50,.72],[.49,.63],[.50,.55]], [[.50,.51],[.49,.42],[.50,.32]]], .052, [.10,.19,.36], 'beginner')] },
      root: { traits: { healing: 1, toxicity: 2 }, paths: [path('glow-root', 'root', [[[.50,.73],[.45,.79],[.39,.86]], [[.51,.74],[.56,.81],[.63,.88]]], .055, [.10,.2,.4], 'beginner')] },
    }),
  },
  {
    id: 'duskbane', name: 'Duskbane', image: 'assets/plants/duskbane.webp', accent: '#b587d8', forestTags: ['moonlit', 'toxic'],
    parts: parts({
      flower: { traits: { toxicity: 4 }, paths: [path('dusk-flower', 'flower', [[[.31,.22],[.39,.13],[.48,.19]], [[.51,.18],[.58,.11],[.69,.22]], [[.67,.24],[.57,.29],[.51,.22]]], .035, [.16,.28,.48], 'controlled')] },
      leaf: { traits: { toxicity: 1 }, paths: [path('dusk-leaf', 'leaf', [[[.49,.48],[.40,.44],[.31,.48]], [[.50,.54],[.60,.48],[.68,.54]]], .04, [.15,.27,.46], 'controlled')] },
      stem: { traits: { toxicity: 2 }, paths: [path('dusk-stem', 'stem', [[[.50,.70],[.47,.62],[.51,.55]], [[.49,.51],[.52,.43],[.49,.34]]], .036, [.15,.28,.48], 'controlled')] },
      root: { traits: { toxicity: 3, energy: 1 }, paths: [path('dusk-root', 'root', [[[.49,.73],[.43,.78],[.38,.87]], [[.50,.74],[.53,.82],[.48,.91]], [[.52,.74],[.61,.81],[.66,.88]]], .035, [.14,.26,.45], 'controlled')] },
    }),
  },
  {
    id: 'sunspire', name: 'Sunspire', image: 'assets/plants/sunspire.webp', accent: '#ffc25c', forestTags: ['moonlit', 'energy'],
    parts: parts({
      flower: { traits: { energy: 4 }, paths: [path('sun-flower', 'flower', [[[.50,.24],[.43,.19],[.37,.13]], [[.50,.23],[.50,.14],[.52,.07]], [[.52,.24],[.60,.19],[.67,.12]]], .04, [.28,.48,.82], 'swift')] },
      leaf: { traits: { energy: 2 }, paths: [path('sun-leaf', 'leaf', [[[.49,.52],[.40,.47],[.31,.40]], [[.51,.56],[.60,.50],[.69,.43]]], .045, [.25,.45,.78], 'swift')] },
      stem: { traits: { energy: 3 }, paths: [path('sun-stem', 'stem', [[[.50,.70],[.50,.59],[.49,.48]], [[.49,.45],[.50,.35],[.50,.26]]], .04, [.27,.47,.80], 'swift')] },
      root: { traits: { energy: 2, toxicity: 1 }, paths: [path('sun-root', 'root', [[[.50,.72],[.43,.79],[.36,.87]], [[.51,.73],[.57,.80],[.65,.88]]], .04, [.26,.46,.8], 'swift')] },
    }),
  },
];

export const getPlant = (id: string): PlantDefinition => PLANTS.find((plant) => plant.id === id) ?? PLANTS[0];
