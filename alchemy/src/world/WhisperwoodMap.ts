import type { TraversalEffect } from '../systems/PotionEffectSystem';

export interface MapPlatform { x:number; y:number; width:number; height:number; kind:'ground'|'stone'|'branch' }
export interface MapPlant { id:string; plantId:string; x:number; y:number; requires:TraversalEffect }
export interface MapGate { x:number; minY:number; maxY:number; requires:TraversalEffect; hint:string }

export const WHISPERWOOD_MAP = {
  width: 66,
  spawn: { x:2, y:1 },
  portal: { x:44, y:1 },
  platforms: [
    {x:22,y:-.5,width:48,height:1,kind:'ground'},
    {x:55,y:-.5,width:20,height:1,kind:'ground'},
    {x:12,y:1.25,width:3.2,height:.45,kind:'stone'},
    {x:15.5,y:2.4,width:3,height:.45,kind:'stone'},
    {x:19,y:4.15,width:5,height:.55,kind:'branch'},
    {x:24,y:1.15,width:2.2,height:.4,kind:'stone'},
    {x:27,y:2.1,width:4,height:.5,kind:'branch'},
    {x:35,y:2.1,width:5,height:.5,kind:'branch'},
    {x:40.5,y:3.35,width:5.5,height:.5,kind:'branch'},
    {x:51,y:1.6,width:3,height:.45,kind:'stone'},
    {x:55,y:2.75,width:4,height:.5,kind:'branch'},
    {x:60,y:1.35,width:3.5,height:.45,kind:'stone'},
  ] as MapPlatform[],
  plants: [
    {id:'map-glowlily',plantId:'glowlily',x:7,y:.75,requires:'none'},
    {id:'map-mossbell',plantId:'mossbell',x:14,y:3.15,requires:'none'},
    {id:'map-duskbane',plantId:'duskbane',x:26.5,y:3,requires:'none'},
    {id:'map-sunspire',plantId:'sunspire',x:19,y:5.1,requires:'jump'},
    {id:'map-emberreed',plantId:'emberreed',x:35.5,y:3,requires:'speed'},
    {id:'map-ghostfern',plantId:'ghostfern',x:41,y:4.25,requires:'calm'},
    {id:'map-bloodberry',plantId:'bloodberry',x:60,y:2.15,requires:'bark'},
  ] as MapPlant[],
  gates: [
    {x:38.3,minY:2.5,maxY:6,requires:'calm',hint:'The spore wind turns you back. Stillmind would quiet it.'},
    {x:47,minY:0,maxY:6,requires:'bark',hint:'Moon-thorns seal the deep grove. Barkskin could carry you through.'},
  ] as MapGate[],
};
