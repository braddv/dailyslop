import type { PlantPartId } from '../data/types';

export interface PathPoint { x: number; y: number }
export interface ExtractionSegment { points: PathPoint[] }
export interface ExtractionPath {
  id: string;
  partId: PlantPartId;
  segments: ExtractionSegment[];
  tolerance: number;
  minSpeed: number;
  targetSpeed: number;
  maxSpeed: number;
  difficulty: 'beginner' | 'controlled' | 'swift';
}
export interface ExtractionScores {
  accuracyScore: number;
  speedScore: number;
  continuityScore: number;
  completionScore: number;
  finalQuality: number;
}
