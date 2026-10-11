import Phaser from 'phaser';
import { studies } from './studies';
import { habitatAt, hash, trailDistance, places, dist, fieldNodes, nearestPlace, type Point } from './geography';
import { available } from '../systems/field';
import type { State } from '../systems/state';
export interface Obstacle {x:number;y:number;r:number}
interface Chunk {images:Phaser.GameObjects.Image[];texture:string;obstacles:Obstacle[];specimens:{image:Phaser.GameObjects.Image;node:typeof fieldNodes[number]}[]}
export const CHUNK_SIZE=256;
export function waterAt(p:Point){const creek=places.find(p=>p.id==='creek')!,pool=places.find(p=>p.id==='pool')!;return (Math.abs(p.x-creek.x-155)<27&&Math.abs(p.y-creek.y)<310&&Math.abs(p.y-creek.y)>22)||(Math.pow((p.x-pool.x-90)/94,2)+Math.pow((p.y-pool.y-80)/58,2)<1);}
export class Chunks {
 private loaded=new Map<string,Chunk>();
 constructor(private scene:Phaser.Scene){}
 update(camera:Phaser.Cameras.Scene2D.Camera,s:State){const v=camera.worldView,margin=180;const needed=new Set<string>();for(let cy=Math.floor((v.y-margin)/256);cy<=Math.floor((v.bottom+margin)/256);cy++)for(let cx=Math.floor((v.x-margin)/256);cx<=Math.floor((v.right+margin)/256);cx++){const key=`${cx},${cy}`;needed.add(key);if(!this.loaded.has(key))this.loaded.set(key,this.create(cx,cy));}for(const [key,chunk]of this.loaded){if(!needed.has(key)){for(const image of chunk.images)image.destroy();this.scene.textures.remove(chunk.texture);this.loaded.delete(key);}else for(const {image,node}of chunk.specimens)image.setVisible(available(s,node));}}
 obstacles():Obstacle[]{return [...this.loaded.values()].flatMap(c=>c.obstacles);}
 clear(){for(const c of this.loaded.values()){c.images.forEach(i=>i.destroy());this.scene.textures.remove(c.texture);}this.loaded.clear();}
 private create(cx:number,cy:number):Chunk{const x0=cx*256,y0=cy*256,key=`ground-${cx}-${cy}`;const canvas=document.createElement('canvas');canvas.width=256;canvas.height=256;const c=canvas.getContext('2d')!;
 const chunk:Chunk={images:[],texture:key,obstacles:[],specimens:[]};
 for(let ty=0;ty<16;ty++)for(let tx=0;tx<16;tx++){const x=x0+tx*16,y=y0+ty*16,p={x:x+8,y:y+8},habitat=habitatAt(p),d=trailDistance(p),place=nearestPlace(p),clearing=dist(p,place)<(place.id==='town'?360:140);const rand=hash(x,y),path=d<24||(place.id==='town'&&clearing&&((Math.abs(p.x-place.x)<42)||(Math.abs(p.y-place.y)<36)));
 const ground=habitat==='ridge'?['#6c7759','#727d60','#778266']:habitat==='meadow'||habitat==='town'?['#788a57','#7b8d59','#81915e']:habitat==='hollow'?['#3b6246','#40684b','#466c4e']:['#506f43','#537549','#58794a'];
 let color=ground[Math.floor(rand*3)];if(path)color=['#a49972','#b1a47c','#b7ac83'][Math.floor(rand*3)];else if(d<34)color='#82905d';else if(clearing&&place.id==='cabin')color='#6f8053';if(waterAt(p))color=['#648f82','#6b988c','#5d8c80'][Math.floor(rand*3)];
 c.fillStyle=color;c.fillRect(tx*16,ty*16,16,16);
 for(let i=0;i<9;i++){const xx=tx*16+Math.floor(hash(x+i,y,2)*16),yy=ty*16+Math.floor(hash(x,y+i,3)*16);c.fillStyle=path?(i%2?'#c0b38b':'#928762'):(i%3?'#afbd852b':'#233f2926');c.fillRect(xx,yy,i%3===0?2:1,1);}
 if(waterAt(p)){c.fillStyle='#b3ccad55';c.fillRect(tx*16+3,ty*16+5,7,1);}
 // Wooden crossing stays visibly legible across the creek.
 const creek=places.find(p=>p.id==='creek')!;if(Math.abs(p.x-creek.x-155)<38&&Math.abs(p.y-creek.y)<=24){c.fillStyle='#8e7854';c.fillRect(tx*16,ty*16,16,16);c.fillStyle='#554b35';c.fillRect(tx*16,ty*16+6,16,1);c.fillRect(tx*16,ty*16+13,16,1);}
 }
 this.scene.textures.addCanvas(key,canvas);chunk.images.push(this.scene.add.image(x0,y0,key).setOrigin(0).setDepth(-100));
 for(let gy=0;gy<8;gy++)for(let gx=0;gx<8;gx++){const x=x0+gx*32+Math.floor(hash(cx*8+gx,cy*8+gy,4)*26),y=y0+gy*32+Math.floor(hash(cx*8+gx,cy*8+gy,5)*26),p={x,y},h=habitatAt(p),d=trailDistance(p),place=nearestPlace(p),clear=dist(p,place)<(place.id==='town'?440:190)||studies.some(s=>dist(s,p)<75),n=hash(x,y,9);if(waterAt(p))continue;
 let type='';if(d>51&&!clear&&n>(h==='meadow'||h==='town'?0.94:h==='ridge'?0.75:0.45))type=(h==='ridge'&&n>0.88)?'pine-tree':'tree'+Math.floor(hash(x,y,10)*5);else if(d>36&&!clear&&n>0.34&&n<0.44)type='bush';else if(d>30&&n<0.018)type='rock';else if(d>48&&!clear&&n>0.02&&n<0.035)type='log';else if(d>25&&n>0.1&&n<0.3)type='grass'+Math.floor(n*20)%6;
 if(type&&(type.startsWith('tree')||type==='pine-tree'||type==='rock'||type==='log')&&fieldNodes.some(n=>dist(n,p)<24))type='grass2';
 if(type){chunk.images.push(this.scene.add.image(x,y,type).setOrigin(0.5,type.startsWith('tree')||type==='pine-tree'?0.93:0.9).setDepth(y));if(type.startsWith('tree')||type==='pine-tree'||type==='rock'||type==='log')chunk.obstacles.push({x,y:y-2,r:type==='log'?18:type==='rock'?12:8});}
 }
 for(const node of fieldNodes.filter(n=>n.x>=x0&&n.x<x0+256&&n.y>=y0&&n.y<y0+256)){const image=this.scene.add.image(node.x,node.y,'spec-'+node.specimen).setOrigin(0.5,0.85).setDepth(node.y);chunk.images.push(image);chunk.specimens.push({image,node});}
 return chunk;}
}
