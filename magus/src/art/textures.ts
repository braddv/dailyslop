import Phaser from 'phaser';
import { specimens } from '../data/specimens';
import { hash } from '../world/geography';
type C=CanvasRenderingContext2D;
function texture(scene:Phaser.Scene,key:string,w:number,h:number,draw:(c:C)=>void){const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;const c=canvas.getContext('2d')!;c.imageSmoothingEnabled=false;draw(c);scene.textures.addCanvas(key,canvas);}
const rect=(c:C,color:string,x:number,y:number,w:number,h:number)=>{c.fillStyle=color;c.fillRect(x,y,w,h);};
function blob(c:C,x:number,y:number,rx:number,ry:number,color:string){c.fillStyle=color;for(let j=-ry;j<=ry;j++){const width=Math.floor(rx*Math.sqrt(1-j*j/(ry*ry)));c.fillRect(x-width,y+j,width*2+1,1);}}
function poly(c:C,color:string,pts:number[][]){c.fillStyle=color;c.beginPath();c.moveTo(...pts[0] as [number,number]);for(const p of pts.slice(1))c.lineTo(...p as [number,number]);c.closePath();c.fill();}
export function makeTextures(scene:Phaser.Scene){
 for(let variant=0;variant<5;variant++)texture(scene,'tree'+variant,80,108,c=>{
 blob(c,39,99,24,6,'#183b2a66');rect(c,'#3a3327',35,64,10,34);rect(c,'#66533b',36,67,4,28);rect(c,'#8a7048',38,70,2,21);rect(c,'#354532',31,95,18,3);
 const colors=variant===4?['#283f3a','#39584b','#4d6e57','#638764','#88a374']:['#193c2e','#24533a','#376b46','#4d8050','#78a060'];
 const crown=variant===4?[[40,22,20,20],[27,41,22,24],[52,43,22,24],[41,59,26,20]]:[[39,20,22,17],[22,38,22,21],[56,38,21,19],[38,51,31,25],[27,66,22,15],[55,63,20,15]];
 for(const [i,b]of crown.entries()){blob(c,b[0],b[1]+3,b[2]+2,b[3]+2,colors[0]);blob(c,b[0],b[1],b[2],b[3],colors[1]);blob(c,b[0]-3,b[1]-3,b[2]-3,b[3]-3,colors[2]);}
 for(let i=0;i<340;i++){const x=Math.floor(hash(i,variant,2)*72)+4,y=Math.floor(hash(i,variant,3)*77)+3;if(c.getImageData(x,y,1,1).data[3])rect(c,colors[2+Math.floor(hash(i,variant,4)*3)],x,y,2+Math.floor(hash(i,variant,5)*3),1+Math.floor(hash(i,variant,6)*2));}
 });
 texture(scene,'pine-tree',64,110,c=>{blob(c,32,101,22,6,'#183b2a66');rect(c,'#5c4f36',29,56,6,44);for(let i=0;i<5;i++){const y=14+i*14,w=12+i*5;poly(c,'#203d34',[[32,y],[32-w,y+27],[32+w,y+27]]);poly(c,'#355d46',[[32,y+2],[34-w,y+22],[30+w,y+22]]);poly(c,'#527759',[[32,y+4],[32-w/2,y+18],[35,y+15]]);}});
 texture(scene,'rock',36,24,c=>{blob(c,18,20,16,3,'#183b2a66');poly(c,'#525e56',[[3,17],[7,7],[16,2],[28,5],[33,14],[28,21],[10,22]]);poly(c,'#879084',[[5,14],[10,6],[19,4],[28,8],[22,15]]);rect(c,'#b5b9a0',12,6,7,2);rect(c,'#617d50',5,18,12,3);});
 texture(scene,'log',66,24,c=>{blob(c,34,19,31,4,'#183b2a66');rect(c,'#574532',7,8,51,11);rect(c,'#826344',9,9,46,3);rect(c,'#a58552',5,9,5,10);rect(c,'#c0a46c',5,11,3,6);rect(c,'#334e30',25,7,19,3);rect(c,'#68804c',29,6,12,2);rect(c,'#352f27',11,16,39,2);});
 texture(scene,'bush',32,25,c=>{blob(c,16,22,14,3,'#193b2a66');blob(c,11,12,10,10,'#315c3b');blob(c,22,13,8,8,'#3e7145');blob(c,12,7,7,4,'#699258');for(let i=0;i<16;i++)rect(c,i%3?'#779b5e':'#c6b58a',5+Math.floor(hash(i,1)*23),5+Math.floor(hash(i,2)*13),2,1);});
 for(let variant=0;variant<6;variant++)texture(scene,'grass'+variant,16,16,c=>{for(let i=0;i<7;i++){const x=Math.floor(hash(i,variant)*14);rect(c,variant%2?'#86a36c':'#58805a',x,8+Math.floor(hash(i,variant,3)*4),1,3);rect(c,'#a7b47a',x+1,7+Math.floor(hash(i,variant,3)*4),1,1);}if(variant===3){rect(c,'#d8d3a1',6,6,2,2);rect(c,'#aaa37a',10,11,2,1);}});
 texture(scene,'well',48,42,c=>{blob(c,24,36,22,5,'#183b2a66');blob(c,24,26,20,11,'#6f7967');blob(c,24,23,19,8,'#a7ad90');blob(c,24,23,12,4,'#354b40');rect(c,'#756346',5,4,3,26);rect(c,'#756346',39,4,3,26);rect(c,'#b79e6b',5,2,37,4);rect(c,'#a68e5d',23,5,1,20);rect(c,'#b5a98b',19,22,9,6);});
 texture(scene,'lantern',18,44,c=>{rect(c,'#5d5740',7,10,3,33);rect(c,'#4d5743',3,7,12,3);rect(c,'#4d5743',3,10,2,12);rect(c,'#4d5743',13,10,2,12);rect(c,'#4d5743',3,22,12,3);rect(c,'#e6c683',5,10,8,12);rect(c,'#f4dfab',8,12,3,9);rect(c,'#657758',5,40,7,3);});
 texture(scene,'kiln',46,54,c=>{blob(c,23,48,21,4,'#142c2555');poly(c,'#685e4c',[[3,48],[3,23],[9,13],[31,13],[42,24],[42,48]]);poly(c,'#998467',[[6,45],[6,24],[12,16],[29,16],[38,25],[38,45]]);rect(c,'#615a49',23,3,11,16);rect(c,'#c5b390',22,2,14,3);rect(c,'#443c2e',13,29,19,17);rect(c,'#d58d4b',16,35,12,7);rect(c,'#edc776',19,36,5,5);for(let j=0;j<4;j++)rect(c,'#6c6453',6,23+j*6,32,1);});
 texture(scene,'tools',40,32,c=>{rect(c,'#655038',3,4,34,3);rect(c,'#7e6745',4,7,3,25);rect(c,'#7e6745',33,7,3,25);rect(c,'#ad9368',10,9,2,18);rect(c,'#9aaba0',7,9,9,5);rect(c,'#a58b61',23,9,2,18);poly(c,'#b9c3ae',[[20,9],[29,9],[29,18],[20,15]]);});
 texture(scene,'basket',30,26,c=>{blob(c,15,22,13,3,'#203b2966');rect(c,'#a08352',3,10,24,13);rect(c,'#c8ab73',4,12,22,2);rect(c,'#c8ab73',5,18,20,1);for(let i=0;i<5;i++)blob(c,6+i*4,8+(i%2)*3,3,3,i%2?'#939e62':'#b5b27c');rect(c,'#6d7850',7,5,3,3);});
 texture(scene,'stool',20,22,c=>{rect(c,'#6f573b',3,9,3,13);rect(c,'#6f573b',14,9,3,13);blob(c,10,8,9,4,'#a58758');rect(c,'#c8ad7b',4,6,11,1);});
 texture(scene,'herbs',42,34,c=>{rect(c,'#806e4a',2,4,38,2);for(let i=0;i<4;i++){rect(c,'#bfad81',7+i*9,6,1,8);for(let j=0;j<5;j++)rect(c,j%2?'#879762':'#6a7d51',5+i*9+j%2*3,14+j*3,4,2);}});
 texture(scene,'papers',34,24,c=>{rect(c,'#c1b493',1,9,30,13);rect(c,'#f0e0b5',3,7,28,13);for(let y=10;y<17;y+=3)rect(c,'#939374',6,y,15+(y%3)*3,1);rect(c,'#ba9c69',28,3,2,12);rect(c,'#535846',28,2,2,3);});
 texture(scene,'fence',64,24,c=>{for(let i=0;i<5;i++){rect(c,'#867249',i*14+2,3,4,21);rect(c,'#b5a277',i*14+2,3,4,2);}rect(c,'#b5a277',0,8,64,3);rect(c,'#8b794f',0,17,64,3);});
 texture(scene,'cabin',112,108,c=>building(c,112,108,'#74523d','#a46a48',false));
 for(let i=0;i<5;i++)texture(scene,'shop'+i,100,98,c=>building(c,100,98,['#785b42','#657265','#665b59','#807056','#655777'][i],['#946142','#6d857d','#64737e','#aa8260','#8a697b'][i],true));
 texture(scene,'marker',30,48,c=>{blob(c,15,43,13,4,'#122e2566');poly(c,'#596558',[[5,41],[7,10],[15,3],[23,10],[25,41]]);poly(c,'#9ca490',[[7,12],[15,5],[20,12],[19,36],[8,37]]);rect(c,'#45574c',12,15,7,1);rect(c,'#45574c',14,16,1,9);for(let i=0;i<4;i++)rect(c,'#45574c',10,28+i*2,9-i,1);rect(c,'#668459',5,38,20,4);});
 texture(scene,'sign',32,34,c=>{rect(c,'#594936',14,14,4,20);rect(c,'#bfab7c',1,2,29,14);rect(c,'#816e4b',1,16,29,2);rect(c,'#6a6549',4,6,19,2);rect(c,'#6a6549',7,10,18,1);});
 texture(scene,'bench',52,36,c=>{rect(c,'#574332',5,12,42,17);rect(c,'#9d7d51',2,10,48,7);rect(c,'#c1a879',5,11,42,2);rect(c,'#72543d',7,26,4,10);rect(c,'#72543d',41,26,4,10);rect(c,'#aac7b8',8,3,7,8);rect(c,'#d2a971',10,6,3,4);rect(c,'#d5ceb0',22,6,14,4);rect(c,'#565d48',41,5,4,6);});
 texture(scene,'shelf',50,50,c=>{rect(c,'#493b30',2,2,46,46);for(let j=0;j<3;j++){rect(c,'#a3885e',2,14+j*15,46,3);for(let i=0;i<8;i++)rect(c,['#a7a581','#7d896d','#9b6951','#b9a16b'][i%4],5+i*5,4+j*15,3,10);}rect(c,'#c3aa75',0,0,50,3);});
 texture(scene,'bed',44,52,c=>{rect(c,'#65503a',3,2,38,48);rect(c,'#baaf87',6,7,32,37);rect(c,'#ded3b2',8,7,27,9);rect(c,'#809382',7,21,30,25);rect(c,'#9eae98',8,22,28,4);rect(c,'#4c4936',1,3,4,47);rect(c,'#4c4936',39,3,4,47);});
 texture(scene,'chest',36,25,c=>{rect(c,'#624b34',2,3,32,20);rect(c,'#ad8654',3,4,30,8);rect(c,'#d0b27b',4,5,28,2);rect(c,'#454940',6,3,3,20);rect(c,'#454940',27,3,3,20);rect(c,'#d1b15e',16,12,5,5);});
 texture(scene,'scope',34,34,c=>{rect(c,'#806a49',16,13,3,19);poly(c,'#bda477',[[5,6],[27,3],[28,10],[8,14]]);rect(c,'#829e96',24,4,3,6);poly(c,'#74624b',[[17,20],[7,32],[10,33],[18,24],[25,33],[28,32]]);});
 for(let dir=0;dir<4;dir++)for(let step=0;step<4;step++)texture(scene,`player-${dir}-${step}`,24,36,c=>person(c,dir,step,false));
 for(let i=0;i<5;i++)texture(scene,'npc'+i,24,36,c=>person(c,i%4,0,true,i));
 for(const p of specimens)texture(scene,'spec-'+p.id,24,24,c=>{
 const color=p.color;blob(c,12,22,7,2,'#17382955');
 if(p.shape==='flower'){rect(c,'#5d864e',11,9,2,12);rect(c,'#719254',7,14,4,2);rect(c,'#719254',13,16,4,2);for(const [x,y]of [[8,6],[13,4],[16,8],[12,11],[6,10]])rect(c,color,x,y,4,4);rect(c,'#e7d29b',11,8,3,3);}
 if(p.shape==='moss'){blob(c,12,18,10,4,'#4c6849');for(let i=0;i<25;i++)rect(c,color,3+Math.floor(hash(i,7)*19),14+Math.floor(hash(i,8)*7),2,1);}
 if(p.shape==='mushroom'){rect(c,'#d9ccaa',7,12,3,9);rect(c,'#c5b68e',16,14,2,7);blob(c,8,11,7,4,color);blob(c,17,14,5,3,color);rect(c,'#eedcaa',4,10,5,1);}
 if(p.shape==='fern'||p.shape==='reed'){for(let i=0;i<4;i++){const x=6+i*4;rect(c,'#57764a',x,6+i%2*4,1,16-i%2*4);for(let j=0;j<4;j++)rect(c,color,x-2,8+j*3,5,1);}}
 if(p.shape==='rock'){poly(c,'#657163',[[3,19],[6,10],[14,7],[21,13],[19,22],[5,22]]);poly(c,color,[[5,17],[8,11],[14,9],[19,14],[15,19]]);rect(c,'#d6d6b3',10,12,4,1);if(p.id==='crystal')rect(c,'#d2daf5',13,10,1,8);}
 if(p.shape==='wood'){rect(c,'#69523c',3,12,18,7);rect(c,color,3,12,17,4);rect(c,'#d5bd87',4,13,2,5);rect(c,'#584632',8,14,9,1);}
 if(p.shape==='water'){blob(c,12,17,9,5,color);rect(c,'#d5e8d5',6,15,7,1);rect(c,'#587e71',8,19,8,1);}
 if(p.shape==='insect'){blob(c,8,12,5,4,color);blob(c,16,12,5,4,color);rect(c,'#e0c388',5,10,3,1);rect(c,'#e0c388',16,10,3,1);rect(c,'#554c37',11,9,2,10);rect(c,'#697d53',5,20,14,1);}
 if(p.shape==='seed'){for(let i=0;i<4;i++)blob(c,6+i*4,15+(i%2)*3,3,2,color);rect(c,'#678050',11,6,2,7);}
 });
}
function person(c:C,dir:number,step:number,npc:boolean,index=0){blob(c,12,33,8,2,'#142c2566');const swing=step%2?2:0;rect(c,'#423e36',7,27,4,7-swing);rect(c,'#423e36',14,27,4,5+swing);rect(c,'#26332e',6,33-swing,5,2);rect(c,'#26332e',14,32+swing,5,2);const coat=npc?['#a58a59','#71968c','#7b8581','#a29460','#9b7f98'][index]:'#697e72';poly(c,'#394b42',[[8,12],[16,12],[21,28],[3,28]]);poly(c,coat,[[8,13],[15,13],[19,27],[5,27]]);rect(c,'#9ba68c',8,14,3,12);rect(c,'#bca473',7,25,12,2);rect(c,'#d2bc92',8,4,9,10);rect(c,'#8c755a',7,3,11,4);rect(c,'#b0ab93',6,4,4,5);rect(c,'#d6cbb0',7,9,3,5);if(dir!==1){rect(c,'#4b493b',dir===2?8:14,8,1,1);rect(c,'#d7cdb0',9,12,6,4);}rect(c,'#9e8457',21,11,2,24);rect(c,'#d8bb8a',20,19+(step%2),3,3);if(dir===1){rect(c,'#84694a',11,6,5,5);rect(c,'#b3ad98',7,7,4,5);}}
function building(c:C,w:number,h:number,wall:string,roof:string,shop:boolean){blob(c,w/2,h-4,w/2-2,6,'#142c2566');rect(c,'#473c2f',10,40,w-20,h-47);rect(c,wall,12,41,w-24,h-49);for(let y=46;y<h-11;y+=6){rect(c,'#b2966830',14,y,w-28,1);rect(c,'#3e392c',13,y+5,w-26,1);}rect(c,'#4a372b',13,40,5,h-48);rect(c,'#4a372b',w-18,40,5,h-48);poly(c,'#413b32',[[4,49],[15,13],[w-18,13],[w-3,49]]);poly(c,roof,[[7,43],[18,11],[w-21,11],[w-6,43]]);for(let y=16;y<44;y+=5){const left=16-(y-16)/4;rect(c,'#d39c6735',left,y,w-left*2-6,2);for(let x=left+3;x<w-left-6;x+=9)rect(c,'#483d3833',x,y,1,5);}rect(c,'#b19064',16,10,w-36,3);rect(c,'#695346',w-33,1,10,21);rect(c,'#b7a18a',w-34,0,12,4);rect(c,'#42392c',w/2-9,h-40,18,32);rect(c,'#8b7150',w/2-7,h-38,14,29);rect(c,'#c8ab69',w/2+3,h-24,2,2);for(const x of [24,w-34]){rect(c,'#382f29',x-2,54,17,20);rect(c,'#bfae7a',x,56,13,16);rect(c,'#dfcc89',x+2,58,9,12);rect(c,'#554c38',x+6,55,1,18);rect(c,'#554c38',x,63,13,1);rect(c,'#56704a',x-4,74,22,4);}rect(c,'#b4aa85',w/2-13,h-9,27,4);if(shop){rect(c,'#cebc8d',w/2-15,46,30,8);rect(c,'#6d654c',w/2-9,49,18,1);}}
