import * as THREE from 'three';
import type { InputManager } from '../core/InputManager';
import { getPlant } from '../data/plants';
import type { NightLayout, NightPlantInstance } from '../data/types';
import { createClueWisps, createLandmark, createPlantMarker, createPortal, createTree } from '../world/WorldFactory';
import type { ThreeStage } from './ThreeStage';

export interface ForestProximity { plant?: NightPlantInstance; clue?: NightPlantInstance; atPortal: boolean; moving: boolean; delta: number }
interface Marker { instance:NightPlantInstance; plant:THREE.Group; wisps:THREE.Group }

export class ForestScene {
  private player=new THREE.Group();
  private markers:Marker[]=[];
  private portal=new THREE.Group();
  private listeningUntil=0;
  private pulseRing?:THREE.Mesh;
  private onNearby:(state:ForestProximity)=>void=()=>{};
  constructor(private stage:ThreeStage,private input:InputManager){}
  enter(layout:NightLayout,onNearby:(state:ForestProximity)=>void):void{
    this.onNearby=onNearby;const s=this.stage.scene;this.stage.clear();this.markers=[];s.background=new THREE.Color(layout.fog);s.fog=new THREE.FogExp2(layout.fog,.035);
    const ground=new THREE.Mesh(new THREE.PlaneGeometry(42,42),new THREE.MeshStandardMaterial({color:0x1b352c,roughness:1}));ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;s.add(ground);
    const seeded=(index:number)=>Math.abs(Math.sin(layout.seed*12.9898+index*78.233))%1;
    const trailMaterial=new THREE.MeshStandardMaterial({color:0x40503b,roughness:1});
    const trailPoints=[new THREE.Vector2(0,-9),...layout.landmarks.map(item=>new THREE.Vector2(item.x,item.z)),new THREE.Vector2(0,1)];
    for(let leg=1;leg<trailPoints.length;leg++)for(let step=0;step<12;step++){const t=step/12,p=trailPoints[leg-1].clone().lerp(trailPoints[leg],t),patch=new THREE.Mesh(new THREE.CircleGeometry(.65+seeded(leg*30+step)*.35,10),trailMaterial);patch.rotation.x=-Math.PI/2;patch.scale.y=.55;patch.position.set(p.x,.012,p.y);s.add(patch);}
    for(let i=0;i<52;i++){const a=seeded(i)*Math.PI*2,r=8+seeded(i+90)*11;s.add(createTree(Math.cos(a)*r,Math.sin(a)*r,.62+seeded(i+40)*.72));}
    for(let i=0;i<18;i++){const a=seeded(i+180)*Math.PI*2,r=4.5+seeded(i+210)*6.5;const x=Math.cos(a)*r,z=Math.sin(a)*r;if(Math.hypot(x,z+9)>2.4)s.add(createTree(x,z,.38+seeded(i+250)*.45));}
    const grassGeometry=new THREE.ConeGeometry(.045,.36,4),grassMaterial=new THREE.MeshStandardMaterial({color:0x416c4c,roughness:1}),grass=new THREE.InstancedMesh(grassGeometry,grassMaterial,240),dummy=new THREE.Object3D();
    for(let i=0;i<240;i++){dummy.position.set((seeded(i+300)-.5)*21,.16,(seeded(i+600)-.5)*21);dummy.rotation.y=seeded(i+900)*Math.PI;dummy.scale.setScalar(.65+seeded(i+1200)*.85);dummy.updateMatrix();grass.setMatrixAt(i,dummy.matrix);}grass.receiveShadow=true;s.add(grass);
    const bushMaterial=new THREE.MeshStandardMaterial({color:0x315640,roughness:1});for(let i=0;i<26;i++){const bush=new THREE.Group();for(let j=0;j<3;j++){const leaf=new THREE.Mesh(new THREE.DodecahedronGeometry(.25+seeded(i*4+j+1400)*.25,0),bushMaterial);leaf.position.set((j-1)*.28,.2+seeded(i+j+1500)*.25,(seeded(i+j+1550)-.5)*.3);bush.add(leaf);}bush.position.set((seeded(i+1600)-.5)*19,0,(seeded(i+1700)-.5)*19);s.add(bush);}
    const capMaterial=new THREE.MeshStandardMaterial({color:layout.tint,emissive:layout.tint,emissiveIntensity:.65,roughness:.55}),stemMaterial=new THREE.MeshStandardMaterial({color:0xd5ccb0,roughness:1});for(let i=0;i<24;i++){const mushroom=new THREE.Group(),stem=new THREE.Mesh(new THREE.CylinderGeometry(.018,.025,.16,5),stemMaterial),cap=new THREE.Mesh(new THREE.SphereGeometry(.085,7,5),capMaterial);stem.position.y=.08;cap.scale.y=.4;cap.position.y=.18;mushroom.add(stem,cap);mushroom.position.set((seeded(i+1800)-.5)*18,0,(seeded(i+1900)-.5)*18);s.add(mushroom);}
    const motePositions=new Float32Array(75*3);for(let i=0;i<75;i++){motePositions[i*3]=(seeded(i+2000)-.5)*20;motePositions[i*3+1]=.25+seeded(i+2100)*3.8;motePositions[i*3+2]=(seeded(i+2200)-.5)*20;}const moteGeometry=new THREE.BufferGeometry();moteGeometry.setAttribute('position',new THREE.BufferAttribute(motePositions,3));const motes=new THREE.Points(moteGeometry,new THREE.PointsMaterial({color:layout.tint,size:.055,transparent:true,opacity:.7}));motes.name='forest-motes';s.add(motes);
    layout.landmarks.forEach((item)=>{const landmark=createLandmark(item.type);landmark.position.set(item.x,0,item.z);landmark.rotation.y=seeded(item.x*20+item.z)*Math.PI;s.add(landmark);});
    layout.plants.forEach((instance)=>{const definition=getPlant(instance.plantId),color=Number.parseInt(definition.accent.slice(1),16),plant=createPlantMarker(color),wisps=createClueWisps(color);plant.position.set(instance.x,0,instance.z);wisps.position.copy(plant.position);plant.visible=false;wisps.visible=false;s.add(plant,wisps);this.markers.push({instance,plant,wisps});});
    this.portal=createPortal();this.portal.scale.setScalar(.55);this.portal.position.set(0,0,-9);this.portal.rotation.y=Math.PI;s.add(this.portal);
    const body=new THREE.Mesh(new THREE.CapsuleGeometry(.25,.65,5,8),new THREE.MeshStandardMaterial({color:0x593b72,roughness:.8}));body.position.y=.72;body.castShadow=true;const hat=new THREE.Mesh(new THREE.ConeGeometry(.48,.85,12),new THREE.MeshStandardMaterial({color:0x2e234a}));hat.position.y=1.55;hat.rotation.z=-.16;this.player=new THREE.Group();this.player.add(body,hat);s.add(this.player);
    this.pulseRing=new THREE.Mesh(new THREE.RingGeometry(.85,1,48),new THREE.MeshBasicMaterial({color:layout.tint,transparent:true,opacity:.7,side:THREE.DoubleSide}));this.pulseRing.rotation.x=-Math.PI/2;this.pulseRing.visible=false;s.add(this.pulseRing);
    s.add(new THREE.HemisphereLight(layout.tint,0x102319,2.15));const moon=new THREE.DirectionalLight(layout.tint,2.5);moon.position.set(-4,10,5);moon.castShadow=true;s.add(moon);
    this.stage.camera.position.set(0,5.6,7.2);this.stage.camera.lookAt(0,.3,0);this.stage.setUpdater((dt,t)=>this.update(dt,t));
  }
  markHarvested(instanceId:string):void{const marker=this.markers.find(item=>item.instance.instanceId===instanceId);if(marker){marker.instance.harvested=true;marker.plant.visible=false;marker.wisps.visible=false;}}
  listen():void{this.listeningUntil=performance.now()+1400;if(this.pulseRing){this.pulseRing.visible=true;this.pulseRing.scale.setScalar(.2);}}
  private update(dt:number,t:number):void{
    const m=this.input.update(),magnitude=Math.hypot(m.x,m.y),length=magnitude||1;this.player.position.x+=m.x/length*dt*4;this.player.position.z-=m.y/length*dt*4;this.player.position.x=THREE.MathUtils.clamp(this.player.position.x,-10,10);this.player.position.z=THREE.MathUtils.clamp(this.player.position.z,-10,10);this.player.position.y=Math.abs(Math.sin(t*5))*.03;
    let near:NightPlantInstance|undefined,clue:NightPlantInstance|undefined,nearDistance=Infinity,clueDistance=Infinity;
    const listening=performance.now()<this.listeningUntil;this.markers.forEach(({instance,plant,wisps},i)=>{if(instance.harvested)return;const distance=plant.position.distanceTo(this.player.position);if(distance<5.2||listening){wisps.visible=true;wisps.children.forEach((child,j)=>{child.position.y=.35+j*.16+Math.sin(t*2+j+i)*.12;child.rotation.y=t;});}else wisps.visible=false;if(distance<2.4){plant.visible=true;instance.discovered=true;}else plant.visible=false;if(distance<1.35&&distance<nearDistance){near=instance;nearDistance=distance;}if(distance<5.2&&distance<clueDistance){clue=instance;clueDistance=distance;}plant.rotation.y=t*.3+i;plant.position.y=Math.sin(t*1.8+i)*.05;});
    if(this.pulseRing){this.pulseRing.position.set(this.player.position.x,.035,this.player.position.z);if(listening){const scale=this.pulseRing.scale.x+dt*5.5;this.pulseRing.scale.setScalar(scale);}else this.pulseRing.visible=false;}
    const portalDistance=this.portal.position.distanceTo(this.player.position);this.onNearby({plant:near,clue,atPortal:portalDistance<1.8,moving:magnitude>.12,delta:dt});const motes=this.stage.scene.getObjectByName('forest-motes');if(motes)motes.rotation.y=t*.018;
    this.stage.camera.position.x+=(this.player.position.x-this.stage.camera.position.x)*.045;this.stage.camera.position.z+=(this.player.position.z+7.2-this.stage.camera.position.z)*.045;this.stage.camera.lookAt(this.player.position.x,.3,this.player.position.z);
  }
}
