import * as THREE from 'three';

export class ThreeStage {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(48,1,.1,100);
  readonly renderer: THREE.WebGLRenderer;
  private frame=0;
  private lastTime=performance.now();
  private elapsed=0;
  private update: (dt:number,time:number)=>void = ()=>{};
  constructor(readonly host:HTMLElement){
    this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});this.renderer.setPixelRatio(Math.min(2,devicePixelRatio));this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.shadowMap.enabled=true;host.append(this.renderer.domElement);
    new ResizeObserver(()=>this.resize()).observe(host);this.resize();this.loop();
  }
  setUpdater(update:(dt:number,time:number)=>void):void{this.update=update;}
  clear():void{while(this.scene.children.length)this.scene.remove(this.scene.children[0]);}
  destroy():void{cancelAnimationFrame(this.frame);this.renderer.dispose();}
  private resize():void{const r=this.host.getBoundingClientRect();this.camera.aspect=Math.max(.2,r.width/Math.max(1,r.height));this.camera.updateProjectionMatrix();this.renderer.setSize(r.width,r.height,false);}
  private loop=():void=>{const now=performance.now(),dt=Math.min(.05,(now-this.lastTime)/1000);this.lastTime=now;this.elapsed+=dt;this.update(dt,this.elapsed);this.renderer.render(this.scene,this.camera);this.frame=requestAnimationFrame(this.loop);};
}
