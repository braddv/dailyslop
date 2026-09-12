import { ExtractionScoringSystem, nearestOnSegment, type TraceSample, type TraceStats } from './ExtractionScoringSystem';
import type { ExtractionPath, ExtractionScores, PathPoint } from './PathTypes';

export class ExtractionController {
  private context: CanvasRenderingContext2D;
  private samples: TraceSample[] = [];
  private reached: number[] = [];
  private activeSegment = 0;
  private tracing = false;
  private violations = 0;
  private correctLifts = 0;
  private wrongStarts = 0;
  private dpr = 1;
  private raf = 0;
  constructor(private canvas: HTMLCanvasElement, private image: HTMLImageElement, private path: ExtractionPath, private onComplete: (scores: ExtractionScores) => void) {
    this.context = canvas.getContext('2d')!;
    this.canvas.style.touchAction = 'none';
    this.image.addEventListener('load', () => this.resize());
    new ResizeObserver(() => this.resize()).observe(canvas);
    canvas.addEventListener('pointerdown', this.pointerDown);
    canvas.addEventListener('pointermove', this.pointerMove);
    canvas.addEventListener('pointerup', this.pointerUp);
    canvas.addEventListener('pointercancel', this.pointerUp);
    this.resize(); this.draw();
  }
  destroy(): void { cancelAnimationFrame(this.raf); this.canvas.replaceWith(this.canvas.cloneNode() as HTMLCanvasElement); }
  private point(event: PointerEvent): PathPoint { const r=this.canvas.getBoundingClientRect(); return {x:(event.clientX-r.left)/r.width,y:(event.clientY-r.top)/r.height}; }
  private pointerDown = (event: PointerEvent): void => {
    if (this.activeSegment >= this.path.segments.length) return;
    const point=this.point(event), start=this.path.segments[this.activeSegment].points[0];
    if (Math.hypot(point.x-start.x,point.y-start.y) > this.path.tolerance*1.7) { this.wrongStarts++; this.flash('warn'); return; }
    this.tracing=true; this.canvas.setPointerCapture(event.pointerId); this.sample(point,event.timeStamp);
  };
  private pointerMove = (event: PointerEvent): void => { if (this.tracing) { this.sample(this.point(event),event.timeStamp); event.preventDefault(); } };
  private pointerUp = (event: PointerEvent): void => {
    if (!this.tracing) return; this.sample(this.point(event),event.timeStamp); this.tracing=false;
    const progress=this.reached[this.activeSegment] ?? 0;
    if (progress >= .9) {
      if (this.activeSegment < this.path.segments.length-1) { this.correctLifts++; this.activeSegment++; this.flash('lift'); }
      else this.finish();
    } else { this.violations += 2; this.flash('warn'); }
  };
  private sample(point: PathPoint,time:number): void {
    const points=this.path.segments[this.activeSegment].points;
    const distance=nearestOnSegment(point,points), onPath=distance<=this.path.tolerance;
    if (!onPath) this.violations++;
    const nearestIndex=points.reduce((best,p,i)=>Math.hypot(point.x-p.x,point.y-p.y)<Math.hypot(point.x-points[best].x,point.y-points[best].y)?i:best,0);
    this.reached[this.activeSegment]=Math.max(this.reached[this.activeSegment]??0,nearestIndex/(points.length-1));
    this.samples.push({...point,time,onPath,segment:this.activeSegment}); this.canvas.dataset.feedback=onPath?'good':'warn';
  }
  private finish(): void { const stats:TraceStats={samples:this.samples,reached:this.reached,violations:this.violations,correctLifts:this.correctLifts,wrongStarts:this.wrongStarts}; this.onComplete(new ExtractionScoringSystem().score(this.path,stats)); }
  private flash(value:string):void { this.canvas.dataset.feedback=value; window.setTimeout(()=>{this.canvas.dataset.feedback='';},260); }
  private resize():void { const r=this.canvas.getBoundingClientRect(); this.dpr=Math.min(2,window.devicePixelRatio||1); this.canvas.width=Math.max(1,r.width*this.dpr);this.canvas.height=Math.max(1,r.height*this.dpr); }
  private draw = ():void => {
    const c=this.context,w=this.canvas.width,h=this.canvas.height,d=this.dpr;c.clearRect(0,0,w,h);c.lineCap='round';c.lineJoin='round';
    this.path.segments.forEach((segment,index)=>{
      c.beginPath();segment.points.forEach((p,i)=>(i?c.lineTo(p.x*w,p.y*h):c.moveTo(p.x*w,p.y*h)));c.strokeStyle=index<this.activeSegment?'rgba(121,231,222,.28)':index===this.activeSegment?'rgba(255,239,174,.72)':'rgba(255,255,255,.22)';c.lineWidth=Math.max(4,this.path.tolerance*Math.min(w,h)*1.35);c.setLineDash([10*d,10*d]);c.stroke();c.setLineDash([]);
      const start=segment.points[0],end=segment.points.at(-1)!;c.fillStyle=index===this.activeSegment?'#ffeaa0':'rgba(255,255,255,.5)';c.beginPath();c.arc(start.x*w,start.y*h,8*d,0,Math.PI*2);c.fill();c.strokeStyle='#302343';c.lineWidth=2*d;c.stroke();c.fillStyle='#fff1a7';c.beginPath();c.arc(end.x*w,end.y*h,5*d,0,Math.PI*2);c.fill();
      if(index<this.path.segments.length-1){c.fillStyle='rgba(255,244,198,.9)';c.font=`${10*d}px sans-serif`;c.textAlign='center';c.fillText('LIFT',end.x*w,end.y*h-13*d);}
    });
    c.setLineDash([]);c.lineWidth=4*d;c.strokeStyle='#77f2df';c.shadowColor='#77f2df';c.shadowBlur=10*d;this.samples.forEach((sample,i)=>{if(!i||this.samples[i-1].segment!==sample.segment){c.beginPath();c.moveTo(sample.x*w,sample.y*h);}else{c.lineTo(sample.x*w,sample.y*h);c.stroke();}});c.shadowBlur=0;
    this.raf=requestAnimationFrame(this.draw);
  };
}
