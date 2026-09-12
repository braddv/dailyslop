import * as THREE from 'three';
import { createPortal } from '../world/WorldFactory';
import type { ThreeStage } from './ThreeStage';

export class PortalHubScene {
  constructor(private stage:ThreeStage){ }
  enter():void{const{s,camera}= {s:this.stage.scene,camera:this.stage.camera};this.stage.clear();s.background=new THREE.Color(0x151329);s.fog=new THREE.FogExp2(0x151329,.055);camera.position.set(0,1.7,7);camera.lookAt(0,1.5,0);const floor=new THREE.Mesh(new THREE.CircleGeometry(8,48),new THREE.MeshStandardMaterial({color:0x27223a,roughness:1}));floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;s.add(floor);const portal=createPortal();portal.position.y=.25;s.add(portal);s.add(new THREE.HemisphereLight(0x9dbbe7,0x23172d,2.3));const moon=new THREE.DirectionalLight(0xc4d8ff,2.2);moon.position.set(-4,7,4);moon.castShadow=true;s.add(moon);for(let i=0;i<34;i++){const star=new THREE.Mesh(new THREE.SphereGeometry(.018+Math.random()*.018,5,5),new THREE.MeshBasicMaterial({color:i%3?0xd7efff:0xffd59e}));star.position.set((Math.random()-.5)*13,1+Math.random()*6,-2-Math.random()*4);s.add(star);}this.stage.setUpdater((_dt,t)=>{portal.rotation.y=Math.sin(t*.4)*.08;(portal.children.at(-2) as THREE.Mesh).scale.setScalar(1+Math.sin(t*2)*.018);});}
}
