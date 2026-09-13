import * as THREE from 'three';
import type { InputManager } from '../core/InputManager';
import { getPlant } from '../data/plants';
import type { NightLayout, NightPlantInstance } from '../data/types';
import type { TraversalEffect } from '../systems/PotionEffectSystem';
import { WHISPERWOOD_MAP } from '../world/WhisperwoodMap';
import type { ThreeStage } from './ThreeStage';

export interface SideScrollState { plant?:NightPlantInstance; atPortal:boolean; hint:string; progress:number; grounded:boolean }

export class SideScrollerScene {
  private player=new THREE.Group();
  private velocityY=0;
  private grounded=false;
  private jumpQueued=false;
  private jumpHeld=false;
  private nearby?:NightPlantInstance;
  private effect:TraversalEffect='none';
  private onState:(state:SideScrollState)=>void=()=>{};
  constructor(private stage:ThreeStage,private input:InputManager){}

  enter(layout:NightLayout,effect:TraversalEffect,onState:(state:SideScrollState)=>void):void {
    this.effect=effect;this.onState=onState;const scene=this.stage.scene;this.stage.clear();scene.background=new THREE.Color(layout.fog);scene.fog=new THREE.Fog(layout.fog,16,32);
    const back=new THREE.Mesh(new THREE.PlaneGeometry(78,18),new THREE.MeshBasicMaterial({color:0x172a2d}));back.position.set(32,5,-4);scene.add(back);
    const moon=new THREE.Mesh(new THREE.CircleGeometry(1.15,28),new THREE.MeshBasicMaterial({color:layout.tint,transparent:true,opacity:.72}));moon.position.set(39,8,-3.7);scene.add(moon);
    for(let i=0;i<42;i++){const x=(i*11.7)%68-2,height=3+(i%5)*.9,trunk=new THREE.Mesh(new THREE.BoxGeometry(.35,height,.5),new THREE.MeshBasicMaterial({color:i%2?0x263b39:0x213430}));trunk.position.set(x,height/2,-2.5);scene.add(trunk);const crown=new THREE.Mesh(new THREE.ConeGeometry(1.3+(i%3)*.25,3.3,7),new THREE.MeshBasicMaterial({color:i%2?0x284a3b:0x315340}));crown.position.set(x,height+1,-2.45);scene.add(crown);}
    WHISPERWOOD_MAP.platforms.forEach(platform=>{const color=platform.kind==='ground'?0x273b33:platform.kind==='branch'?0x5b4638:0x52635b,mesh=new THREE.Mesh(new THREE.BoxGeometry(platform.width,platform.height,1.6),new THREE.MeshStandardMaterial({color,roughness:1}));mesh.position.set(platform.x,platform.y,0);mesh.receiveShadow=true;scene.add(mesh);});
    for(let i=0;i<80;i++){const blade=new THREE.Mesh(new THREE.ConeGeometry(.035,.35,4),new THREE.MeshBasicMaterial({color:0x57935d}));blade.position.set((i*.83)%66,.18,-.7+(i%3)*.15);scene.add(blade);}
    const instanceById=new Map(layout.plants.map(instance=>[instance.instanceId,instance]));WHISPERWOOD_MAP.plants.forEach(item=>{const definition=getPlant(item.plantId),instance=instanceById.get(item.id);if(!instance||instance.harvested)return;const color=Number.parseInt(definition.accent.slice(1),16),plant=new THREE.Group(),stem=new THREE.Mesh(new THREE.BoxGeometry(.1,.7,.12),new THREE.MeshBasicMaterial({color:0x69a06a})),bloom=new THREE.Mesh(new THREE.CircleGeometry(.28,8),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.95}));stem.position.y=.35;bloom.position.y=.8;bloom.position.z=.05;plant.add(stem,bloom);plant.position.set(item.x,item.y,0);plant.userData.instance=instance;plant.name='plant';scene.add(plant);});
    const portal=new THREE.Group(),outer=new THREE.Mesh(new THREE.TorusGeometry(.72,.13,10,30),new THREE.MeshBasicMaterial({color:layout.tint})),inside=new THREE.Mesh(new THREE.CircleGeometry(.59,28),new THREE.MeshBasicMaterial({color:layout.tint,transparent:true,opacity:.18}));portal.add(outer,inside);portal.position.set(WHISPERWOOD_MAP.portal.x,1.15,.1);portal.name='exit-portal';scene.add(portal);
    WHISPERWOOD_MAP.gates.forEach(gate=>{const group=new THREE.Group();for(let i=0;i<6;i++){const thorn=new THREE.Mesh(new THREE.ConeGeometry(.14,.65,5),new THREE.MeshBasicMaterial({color:gate.requires==='bark'?0x9b668d:0x9bb8a8,transparent:true,opacity:.65}));thorn.rotation.z=(i%2?1:-1)*.75;thorn.position.set(0,.45+i*.65,0);group.add(thorn);}group.position.set(gate.x,gate.minY,0);scene.add(group);});
    const body=new THREE.Mesh(new THREE.BoxGeometry(.58,1.05,.5),new THREE.MeshStandardMaterial({color:0x7b4e91,roughness:.8})),hat=new THREE.Mesh(new THREE.ConeGeometry(.52,.8,10),new THREE.MeshStandardMaterial({color:0x33254f}));body.position.y=.52;hat.position.y=1.35;hat.rotation.z=-.14;this.player=new THREE.Group();this.player.add(body,hat);this.player.position.set(WHISPERWOOD_MAP.spawn.x,WHISPERWOOD_MAP.spawn.y,0);scene.add(this.player);
    scene.add(new THREE.HemisphereLight(layout.tint,0x18241f,2.4));const key=new THREE.DirectionalLight(layout.tint,2.1);key.position.set(4,10,8);scene.add(key);
    this.stage.camera.position.set(7,4.3,14);this.stage.camera.lookAt(7,3.2,0);this.stage.setUpdater((dt,time)=>this.update(dt,time));
  }
  requestJump():void{this.jumpQueued=true;}
  private update(dt:number,time:number):void {
    const movement=this.input.update(),speed=this.effect==='speed'?7.2:4.7,jump=this.effect==='jump'?8.5:5.6,previousX=this.player.position.x,previousBottom=this.player.position.y-.52;if(movement.y>.45&&!this.jumpHeld)this.jumpQueued=true;this.jumpHeld=movement.y>.45;
    if(this.jumpQueued&&this.grounded){this.velocityY=jump;this.grounded=false;}this.jumpQueued=false;this.player.position.x+=movement.x*speed*dt;this.velocityY-=14*dt;this.player.position.y+=this.velocityY*dt;this.player.position.x=THREE.MathUtils.clamp(this.player.position.x,.5,WHISPERWOOD_MAP.width-.5);
    let hint='Follow the lantern grass. The Moon Gate waits beyond the creek.';
    WHISPERWOOD_MAP.gates.forEach(gate=>{const crossing=(previousX<gate.x&&this.player.position.x>=gate.x)||(previousX>gate.x&&this.player.position.x<=gate.x);if(crossing&&this.player.position.y>=gate.minY&&this.player.position.y<=gate.maxY&&this.effect!==gate.requires){this.player.position.x=previousX;hint=gate.hint;this.velocityY=Math.min(0,this.velocityY);}});
    this.grounded=false;const bottom=this.player.position.y-.52;WHISPERWOOD_MAP.platforms.forEach(platform=>{const top=platform.y+platform.height/2,insideX=Math.abs(this.player.position.x-platform.x)<=platform.width/2+.22;if(insideX&&this.velocityY<=0&&previousBottom>=top-.08&&bottom<=top+.05){this.player.position.y=top+.52;this.velocityY=0;this.grounded=true;}});
    if(this.player.position.y<-3){this.player.position.set(Math.max(.8,this.player.position.x-2),1,0);this.velocityY=0;hint='The roots catch you and return you to the path.';}
    let nearby:NightPlantInstance|undefined,nearest=1.2;this.stage.scene.children.filter(object=>object.name==='plant').forEach(object=>{const distance=Math.hypot(object.position.x-this.player.position.x,object.position.y-this.player.position.y);if(distance<nearest){nearest=distance;nearby=object.userData.instance as NightPlantInstance;}});this.nearby=nearby;
    if(nearby)hint=`${getPlant(nearby.plantId).name} is close enough to examine.`;const portalDistance=Math.hypot(this.player.position.x-WHISPERWOOD_MAP.portal.x,this.player.position.y-1.15),atPortal=portalDistance<1.35;if(atPortal)hint='The return gate is open. Leave with what you found?';
    this.player.rotation.z=movement.x*.035;this.player.position.z=Math.sin(time*5)*.015;const targetX=THREE.MathUtils.clamp(this.player.position.x+movement.x*1.4,7,WHISPERWOOD_MAP.width-7);this.stage.camera.position.x+=(targetX-this.stage.camera.position.x)*.08;this.stage.camera.lookAt(this.stage.camera.position.x,3.2,0);
    this.onState({plant:this.nearby,atPortal,hint,progress:this.player.position.x/WHISPERWOOD_MAP.width,grounded:this.grounded});
  }
}
