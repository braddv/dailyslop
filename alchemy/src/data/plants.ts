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
    id: 'glowlily', name: 'Glowlily', image: 'assets/plants/glowlily.webp', accent: '#79e7de', forestTags: ['moonlit', 'healing'], rarity: 'common', clue: 'A glassy chime trembles beneath the ferns.',
    parts: parts({
      flower: { traits: { calm: 3, healing: 1 }, paths: [path('glow-flower', 'flower', [[[.34,.20],[.40,.14],[.49,.12],[.58,.15],[.66,.22]], [[.66,.22],[.58,.27],[.49,.29],[.40,.26],[.34,.20]]], .055, [.12,.22,.45], 'beginner')] },
      leaf: { traits: { healing: 1, calm: 1 }, paths: [path('glow-leaf', 'leaf', [[[.49,.52],[.41,.49],[.32,.46]], [[.49,.52],[.59,.49],[.70,.45]]], .06, [.10,.20,.42], 'beginner')] },
      stem: { traits: { healing: 3, toxicity: 1 }, paths: [path('glow-stem', 'stem', [[[.50,.72],[.49,.63],[.50,.55]], [[.50,.51],[.49,.42],[.50,.32]]], .052, [.10,.19,.36], 'beginner')] },
      root: { traits: { healing: 1, toxicity: 2 }, paths: [path('glow-root', 'root', [[[.50,.73],[.45,.79],[.39,.86]], [[.51,.74],[.56,.81],[.63,.88]]], .055, [.10,.2,.4], 'beginner')] },
    }),
  },
  {
    id: 'duskbane', name: 'Duskbane', image: 'assets/plants/duskbane.webp', accent: '#b587d8', forestTags: ['moonlit', 'toxic'], rarity: 'uncommon', clue: 'Purple dust hangs where the air should be still.',
    parts: parts({
      flower: { traits: { toxicity: 4 }, paths: [path('dusk-flower', 'flower', [[[.31,.22],[.39,.13],[.48,.19]], [[.51,.18],[.58,.11],[.69,.22]], [[.67,.24],[.57,.29],[.51,.22]]], .035, [.16,.28,.48], 'controlled')] },
      leaf: { traits: { toxicity: 1 }, paths: [path('dusk-leaf', 'leaf', [[[.49,.48],[.40,.44],[.31,.48]], [[.50,.54],[.60,.48],[.68,.54]]], .04, [.15,.27,.46], 'controlled')] },
      stem: { traits: { toxicity: 2 }, paths: [path('dusk-stem', 'stem', [[[.50,.70],[.47,.62],[.51,.55]], [[.49,.51],[.52,.43],[.49,.34]]], .036, [.15,.28,.48], 'controlled')] },
      root: { traits: { toxicity: 3, energy: 1 }, paths: [path('dusk-root', 'root', [[[.49,.73],[.43,.78],[.38,.87]], [[.50,.74],[.53,.82],[.48,.91]], [[.52,.74],[.61,.81],[.66,.88]]], .035, [.14,.26,.45], 'controlled')] },
    }),
  },
  {
    id: 'sunspire', name: 'Sunspire', image: 'assets/plants/sunspire.webp', accent: '#ffc25c', forestTags: ['moonlit', 'energy'], rarity: 'common', clue: 'Warm sparks skip through the wet grass.',
    parts: parts({
      flower: { traits: { energy: 4 }, paths: [path('sun-flower', 'flower', [[[.50,.24],[.43,.19],[.37,.13]], [[.50,.23],[.50,.14],[.52,.07]], [[.52,.24],[.60,.19],[.67,.12]]], .04, [.28,.48,.82], 'swift')] },
      leaf: { traits: { energy: 2 }, paths: [path('sun-leaf', 'leaf', [[[.49,.52],[.40,.47],[.31,.40]], [[.51,.56],[.60,.50],[.69,.43]]], .045, [.25,.45,.78], 'swift')] },
      stem: { traits: { energy: 3 }, paths: [path('sun-stem', 'stem', [[[.50,.70],[.50,.59],[.49,.48]], [[.49,.45],[.50,.35],[.50,.26]]], .04, [.27,.47,.80], 'swift')] },
      root: { traits: { energy: 2, toxicity: 1 }, paths: [path('sun-root', 'root', [[[.50,.72],[.43,.79],[.36,.87]], [[.51,.73],[.57,.80],[.65,.88]]], .04, [.26,.46,.8], 'swift')] },
    }),
  },
  {
    id: 'mossbell', name: 'Mossbell', image: 'assets/plants/mossbell.webp', accent: '#cbe6a3', forestTags: ['moonlit','healing','calm'], rarity: 'common', clue: 'Dew rings softly against unseen bells.',
    parts: parts({
      flower:{traits:{healing:2,calm:3},paths:[path('moss-flower','flower',[[[.43,.28],[.48,.22],[.55,.25]],[[.56,.27],[.61,.34],[.55,.38]]],.055,[.11,.2,.4],'beginner')]},
      leaf:{traits:{healing:2,calm:1},paths:[path('moss-leaf','leaf',[[[.50,.58],[.39,.54],[.27,.49]],[[.51,.62],[.62,.58],[.75,.55]]],.055,[.1,.2,.4],'beginner')]},
      stem:{traits:{calm:2,healing:1},paths:[path('moss-stem','stem',[[[.50,.72],[.48,.62],[.46,.52]],[[.46,.48],[.44,.39],[.46,.30]]],.05,[.11,.21,.41],'beginner')]},
      root:{traits:{healing:3,toxicity:.5},paths:[path('moss-root','root',[[[.50,.72],[.44,.80],[.38,.89]],[[.51,.73],[.57,.81],[.63,.89]]],.05,[.1,.2,.39],'beginner')]},
    }),
  },
  {
    id: 'bloodberry', name: 'Bloodberry', image: 'assets/plants/bloodberry.webp', accent: '#e75b66', forestTags: ['moonlit','healing','toxic'], rarity: 'rare', clue: 'Something ruby-bright gleams, then vanishes.',
    parts: parts({
      flower:{traits:{healing:3,calm:1},paths:[path('blood-flower','flower',[[[.51,.16],[.56,.12],[.62,.14]],[[.39,.25],[.34,.29],[.30,.33]]],.04,[.15,.27,.5],'controlled')]},
      leaf:{traits:{healing:2,toxicity:1},paths:[path('blood-leaf','leaf',[[[.48,.43],[.38,.39],[.27,.34]],[[.52,.47],[.63,.42],[.74,.35]]],.04,[.16,.28,.52],'controlled')]},
      stem:{traits:{healing:2,toxicity:2},paths:[path('blood-stem','stem',[[[.50,.70],[.48,.59],[.51,.50]],[[.50,.46],[.49,.35],[.51,.25]]],.038,[.16,.29,.53],'controlled')]},
      root:{traits:{toxicity:3,healing:1},paths:[path('blood-root','root',[[[.50,.72],[.43,.79],[.35,.88]],[[.51,.73],[.58,.82],[.68,.89]]],.038,[.15,.27,.5],'controlled')]},
    }),
  },
  {
    id: 'emberreed', name: 'Emberreed', image: 'assets/plants/emberreed.webp', accent: '#ff914f', forestTags: ['moonlit','energy'], rarity: 'uncommon', clue: 'A dry crackle answers each footstep.',
    parts: parts({
      flower:{traits:{energy:4,toxicity:.5},paths:[path('ember-flower','flower',[[[.50,.23],[.42,.17],[.34,.12]],[[.51,.22],[.51,.14],[.52,.07]],[[.52,.23],[.60,.17],[.68,.12]]],.04,[.27,.47,.8],'swift')]},
      leaf:{traits:{energy:3},paths:[path('ember-leaf','leaf',[[[.50,.50],[.39,.45],[.26,.38]],[[.51,.58],[.63,.51],[.76,.43]]],.043,[.26,.45,.78],'swift')]},
      stem:{traits:{energy:4,toxicity:1},paths:[path('ember-stem','stem',[[[.50,.73],[.50,.61],[.50,.50]],[[.50,.46],[.50,.35],[.50,.24]]],.038,[.28,.49,.82],'swift')]},
      root:{traits:{energy:2,toxicity:2},paths:[path('ember-root','root',[[[.50,.74],[.43,.82],[.35,.90]],[[.51,.74],[.58,.82],[.67,.90]]],.04,[.25,.45,.78],'swift')]},
    }),
  },
  {
    id: 'ghostfern', name: 'Ghostfern', image: 'assets/plants/ghostfern.webp', accent: '#b9d7e9', forestTags: ['moonlit','calm'], rarity: 'rare', clue: 'Silver fronds appear only at the edge of sight.',
    parts: parts({
      flower:{traits:{calm:4,healing:1},paths:[path('ghost-flower','flower',[[[.42,.32],[.46,.25],[.50,.20]],[[.51,.20],[.56,.25],[.60,.32]]],.04,[.13,.24,.45],'controlled')]},
      leaf:{traits:{calm:3,energy:1},paths:[path('ghost-leaf','leaf',[[[.48,.55],[.38,.45],[.25,.34]],[[.52,.56],[.63,.45],[.76,.34]]],.042,[.14,.25,.47],'controlled')]},
      stem:{traits:{calm:2,energy:1},paths:[path('ghost-stem','stem',[[[.50,.72],[.47,.62],[.43,.51]],[[.52,.72],[.57,.61],[.62,.50]]],.04,[.14,.25,.47],'controlled')]},
      root:{traits:{calm:2,toxicity:.5},paths:[path('ghost-root','root',[[[.50,.73],[.42,.80],[.34,.88]],[[.51,.74],[.58,.82],[.66,.90]]],.04,[.13,.24,.46],'controlled')]},
    }),
  },
];

export const getPlant = (id: string): PlantDefinition => PLANTS.find((plant) => plant.id === id) ?? PLANTS[0];
