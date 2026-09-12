import type { ExtractionPath, ExtractionScores, PathPoint } from './PathTypes';

export interface TraceSample extends PathPoint { time: number; onPath: boolean; segment: number }
export interface TraceStats { samples: TraceSample[]; reached: number[]; violations: number; correctLifts: number; wrongStarts: number }
export const SCORING_WEIGHTS = { accuracy: .4, speed: .25, continuity: .2, completion: .15 };

const distance = (a: PathPoint, b: PathPoint): number => Math.hypot(a.x - b.x, a.y - b.y);
export const pointSegmentDistance = (p: PathPoint, a: PathPoint, b: PathPoint): number => {
  const dx = b.x-a.x, dy = b.y-a.y;
  if (!dx && !dy) return distance(p,a);
  const t = Math.max(0, Math.min(1, ((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy)));
  return distance(p,{x:a.x+t*dx,y:a.y+t*dy});
};
export const nearestOnSegment = (point: PathPoint, points: PathPoint[]): number => Math.min(...points.slice(1).map((p,i) => pointSegmentDistance(point, points[i], p)));
const segmentLength = (points: PathPoint[]): number => points.slice(1).reduce((sum,p,i) => sum+distance(points[i],p),0);

export class ExtractionScoringSystem {
  score(path: ExtractionPath, stats: TraceStats): ExtractionScores {
    const accuracyScore = stats.samples.length ? 100 * stats.samples.filter((sample) => sample.onPath).length / stats.samples.length : 0;
    let traveled = 0, elapsed = 0;
    for (let i=1;i<stats.samples.length;i++) if (stats.samples[i].segment === stats.samples[i-1].segment) { traveled += distance(stats.samples[i],stats.samples[i-1]); elapsed += Math.max(0,stats.samples[i].time-stats.samples[i-1].time)/1000; }
    const speed = elapsed ? traveled/elapsed : 0;
    const delta = speed < path.targetSpeed ? path.targetSpeed-speed : speed-path.targetSpeed;
    const range = speed < path.targetSpeed ? path.targetSpeed-path.minSpeed : path.maxSpeed-path.targetSpeed;
    const speedScore = Math.max(0, Math.min(100, 100-(delta/Math.max(.01,range))*65));
    const expectedLifts = Math.max(0,path.segments.length-1);
    const continuityScore = Math.max(0,100-stats.violations*5-stats.wrongStarts*18-(expectedLifts-stats.correctLifts)*22);
    const totalLength = path.segments.reduce((sum,s) => sum+segmentLength(s.points),0);
    const reachedLength = path.segments.reduce((sum,s,i) => sum+segmentLength(s.points)*Math.min(1,stats.reached[i] ?? 0),0);
    const completionScore = totalLength ? 100*reachedLength/totalLength : 0;
    const finalQuality = Math.round(accuracyScore*SCORING_WEIGHTS.accuracy+speedScore*SCORING_WEIGHTS.speed+continuityScore*SCORING_WEIGHTS.continuity+completionScore*SCORING_WEIGHTS.completion);
    return { accuracyScore:Math.round(accuracyScore), speedScore:Math.round(speedScore), continuityScore:Math.round(continuityScore), completionScore:Math.round(completionScore), finalQuality };
  }
}
