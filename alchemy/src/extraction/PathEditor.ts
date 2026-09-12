import type { ExtractionPath, PathPoint } from './PathTypes';

export class PathEditor {
  private definition: ExtractionPath;
  private activeSegment = 0;
  private dragging?: { segment: number; point: number };
  constructor(private canvas: HTMLCanvasElement, image: HTMLImageElement, initial: ExtractionPath, private output: HTMLTextAreaElement) {
    this.definition=structuredClone(initial); this.output.value=JSON.stringify(this.definition,null,2); this.canvas.style.touchAction='none';
    image.addEventListener('load', () => this.draw());
    const resize=()=>{const r=canvas.getBoundingClientRect();canvas.width=r.width*devicePixelRatio;canvas.height=r.height*devicePixelRatio;this.draw();};new ResizeObserver(resize).observe(canvas);resize();
    canvas.addEventListener('pointerdown',(e)=>this.down(e));canvas.addEventListener('pointermove',(e)=>this.move(e));canvas.addEventListener('pointerup',()=>{this.dragging=undefined;this.sync();});
  }
  addSegment():void { this.definition.segments.push({points:[]});this.activeSegment=this.definition.segments.length-1;this.sync(); }
  import():void { try { const value=JSON.parse(this.output.value) as ExtractionPath;if(!value.segments)throw new Error();this.definition=value;this.activeSegment=0;this.draw(); } catch { this.output.setCustomValidity('Invalid path JSON');this.output.reportValidity(); } }
  download():void { const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(this.definition,null,2)],{type:'application/json'}));a.download=`${this.definition.id}.json`;a.click();URL.revokeObjectURL(a.href); }
  get value():ExtractionPath { return structuredClone(this.definition); }
  private local(e:PointerEvent):PathPoint{const r=this.canvas.getBoundingClientRect();return{x:(e.clientX-r.left)/r.width,y:(e.clientY-r.top)/r.height};}
  private down(e:PointerEvent):void {const p=this.local(e),threshold=.035;for(let s=0;s<this.definition.segments.length;s++)for(let i=0;i<this.definition.segments[s].points.length;i++)if(Math.hypot(p.x-this.definition.segments[s].points[i].x,p.y-this.definition.segments[s].points[i].y)<threshold){this.dragging={segment:s,point:i};return;}this.definition.segments[this.activeSegment].points.push(p);this.sync();}
  private move(e:PointerEvent):void{if(!this.dragging)return;this.definition.segments[this.dragging.segment].points[this.dragging.point]=this.local(e);this.sync();}
  private sync():void{this.output.value=JSON.stringify(this.definition,null,2);this.draw();}
  private draw():void{const c=this.canvas.getContext('2d')!,w=this.canvas.width,h=this.canvas.height;c.clearRect(0,0,w,h);this.definition.segments.forEach((s,si)=>{c.beginPath();s.points.forEach((p,i)=>i?c.lineTo(p.x*w,p.y*h):c.moveTo(p.x*w,p.y*h));c.strokeStyle=si===this.activeSegment?'#ffe79a':'#86d9cf';c.lineWidth=4*devicePixelRatio;c.stroke();s.points.forEach(p=>{c.fillStyle='#231931';c.beginPath();c.arc(p.x*w,p.y*h,6*devicePixelRatio,0,Math.PI*2);c.fill();});});}
}
