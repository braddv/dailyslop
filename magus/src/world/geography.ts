import type { Habitat } from '../data/specimens';
export const WALK_SPEED=64;
export const SEED=314159;
export type Point={x:number;y:number};
export interface Place extends Point { id:string; name:string; habitat:Habitat; subtitle:string }
export const places:Place[]=[
{id:'cabin',name:'Cabin Clearing',x:12000,y:16000,habitat:'woodland',subtitle:'A quiet place to bring the world indoors.'},
{id:'west',name:'West Trail',x:7600,y:13000,habitat:'woodland',subtitle:'Leaf litter, old growth, and the first questions.'},
{id:'moss',name:'Moss Hollow',x:6500,y:21000,habitat:'hollow',subtitle:'Water lingers in the shade. Return after dark or rain.'},
{id:'creek',name:'Creek Bend',x:13000,y:25000,habitat:'creek',subtitle:'The slow bank keeps what the running water carries.'},
{id:'pool',name:'Spring Pool',x:19400,y:23500,habitat:'pool',subtitle:'Still water is never quite empty.'},
{id:'meadow',name:'South Meadow',x:21000,y:16500,habitat:'meadow',subtitle:'Open sky, clover, and the work of small wings.'},
{id:'town',name:'Alderwick',x:27000,y:10500,habitat:'town',subtitle:'Knowledge has many hands.'},
{id:'ridge',name:'North Ridge',x:6500,y:1800,habitat:'ridge',subtitle:'Wind-shaped wood beneath an unobstructed sky.'},
{id:'marker',name:'Old Survey Marker',x:15800,y:3200,habitat:'ridge',subtitle:'A notch, a Swan, and a number almost worn away.'},
{id:'observatory',name:'Observatory Approach',x:24500,y:1800,habitat:'ridge',subtitle:'Beyond the broken stair, an old dome waits for another chapter.'}
];
export const placeById=Object.fromEntries(places.map(p=>[p.id,p])) as Record<string,Place>;
export interface Route {a:string;b:string;points:Point[];name:string}
const route=(a:string,b:string,via:number[][],name:string):Route=>({a,b,points:[placeById[a],...via.map(([x,y])=>({x,y})),placeById[b]],name});
export const routes:Route[]=[
route('cabin','west',[[11100,15600],[10700,14600],[9500,14800],[9000,13200]],'The Bracken Way'),
route('cabin','moss',[[11600,17400],[10000,17800],[10500,18800],[8400,19200],[8200,20700]],'The Hollow Descent'),
route('moss','creek',[[6900,22400],[8800,22000],[9000,24200],[11200,23700],[11600,25100]],'The Wetwood Loop'),
route('creek','pool',[[14400,25000],[14900,23400],[16300,23900],[17400,22700]],'The Watercourse'),
route('pool','meadow',[[20500,22800],[20000,21000],[21800,19800],[20500,18500]],'The Reed Road'),
route('cabin','meadow',[[13500,16400],[15000,17000],[16600,16200],[18500,16900]],'The Pollinator Trail'),
route('meadow','town',[[22400,15300],[23900,13900],[24700,12300],[26100,11700]],'The Market Path'),
route('west','ridge',[[6500,11900],[7000,10100],[5400,9400],[6100,7700],[4700,6500],[5800,4800],[5600,3000]],'The Rowan Ascent'),
route('ridge','marker',[[7700,1300],[8800,2600],[10300,1700],[11600,3300],[13700,2500]],'The Surveyor’s Traverse'),
route('marker','observatory',[[17000,2100],[18500,3200],[20000,1700],[21500,2800],[23200,1500]],'The Lost Meridian'),
route('west','moss',[[5900,14200],[5200,16500],[5900,17900],[5200,19500]],'The Old Forester’s Loop'),
route('marker','town',[[17700,4700],[19400,4300],[19900,6500],[22300,6400],[23000,8900],[24900,8400]],'The Cartographer’s Road')
];
export const segments=routes.flatMap(r=>r.points.slice(1).map((p,i)=>({a:r.points[i],b:p,route:r})));
export const dist=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.y-b.y);
export function distanceSegment(p:Point,a:Point,b:Point){const dx=b.x-a.x,dy=b.y-a.y;const t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy)));return dist(p,{x:a.x+t*dx,y:a.y+t*dy});}
export function trailDistance(p:Point){let min=Infinity;for(const s of segments)min=Math.min(min,distanceSegment(p,s.a,s.b));return min;}
export function nearestPlace(p:Point):Place{return places.reduce((a,b)=>dist(p,a)<dist(p,b)?a:b);}
export function habitatAt(p:Point):Habitat {const place=nearestPlace(p);if(place.id==='town'&&dist(p,place)>850)return 'meadow';return place.habitat;}
export function isWalkable(p:Point){return trailDistance(p)<112||places.some(c=>dist(p,c)<(c.id==='town'?460:230));}
export const routeLength=(r:Route)=>r.points.slice(1).reduce((sum,p,i)=>sum+dist(p,r.points[i]),0);
export function shortestRoutes(start='cabin'){const result:Record<string,number>={};for(const p of places)result[p.id]=Infinity;result[start]=0;const queue=new Set(places.map(p=>p.id));while(queue.size){const a=[...queue].sort((a,b)=>result[a]-result[b])[0];queue.delete(a);for(const r of routes.filter(r=>r.a===a||r.b===a)){const b=r.a===a?r.b:r.a;result[b]=Math.min(result[b],result[a]+routeLength(r));}}return result;}
export const hash=(x:number,y:number,salt=0)=>{let n=Math.imul(x|0,374761393)^Math.imul(y|0,668265263)^Math.imul(salt+SEED,1274126177);n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967296;};
export function alongRoute(r:Route,t:number):Point {let remaining=routeLength(r)*t;for(let i=1;i<r.points.length;i++){const d=dist(r.points[i-1],r.points[i]);if(remaining<=d)return {x:r.points[i-1].x+(r.points[i].x-r.points[i-1].x)*remaining/d,y:r.points[i-1].y+(r.points[i].y-r.points[i-1].y)*remaining/d};remaining-=d;}return r.points.at(-1)!;}
export interface FieldNode extends Point {id:string;specimen:string;note?:string}
export const fieldNodes:FieldNode[]=[];
// Authored study plots at landmarks; repeatable sampling, never an only specimen.
const plots:Record<string,string[]>={cabin:['wildflower','ash','bark','pine','resin','fern'],west:['wildflower','root','oak','moss','mushroom','resin','ash'],moss:['moonwort','moss','raincap','mushroom','fern'],creek:['water','clay','limestone','sediment','reed','willow','quartz'],pool:['springwater','algae','sediment','willow','reed','pondsnail'],meadow:['soil','wildflower','root','seeds','yarrow','ash','copperwing'],ridge:['ridgewood','crystal','quartz','ironstone','pyrite','lichen','pine'],town:['fieldsoil'],marker:['crystal','lichen'],observatory:['quartz','lichen']};
for(const p of places)for(const [i,specimen]of plots[p.id].entries()){const angle=i*2.4;fieldNodes.push({id:`plot-${p.id}-${i}`,specimen,x:p.x+Math.cos(angle)*(80+i*10),y:p.y+Math.sin(angle)*(85+i*10)});}
// New observations and study patches every ~500 pixels make the journey itself useful.
const distributions:Record<Habitat,string[]>={woodland:['wildflower','fern','moss','bark','oak','ash','pine','resin','root','mushroom'],hollow:['moss','mushroom','fern','moonwort','raincap'],creek:['water','reed','clay','limestone','sediment','willow'],pool:['springwater','algae','reed','willow','sediment'],meadow:['wildflower','soil','root','seeds','yarrow','ash','copperwing'],ridge:['quartz','ironstone','pyrite','lichen','ridgewood','pine','crystal'],town:['fieldsoil','seeds']};
export const fieldNotes=[
'The north side of fallen timber is wetter and richer in moss than the sunlit side. Aspect changes a habitat without changing its soil.',
'Pollinators visit open flower heads but pass over seed pods. The meadow changes with the life stage of a plant.',
'A windthrow exposes pale roots above a dark layer of leaf mould. Soil is a history, not a uniform substance.',
'The creek’s outside bank is cut steeply; fine sediment gathers on the quieter inside bend.',
'Lichen clings to bare rock where ordinary roots find no purchase. A boundary can be a habitat.',
'The old forester’s blaze marks a loop back toward the cabin. A route can be known without knowing what lies beside it.',
'Fungi on this trunk follow softened wood rather than the newest bark. Decay has its own geography.',
'Tiny wings gather in the sunlit gap. Openings in the canopy change the temperature of the forest floor.',
'Spiral grain in exposed wood follows years of strain. Ask a craftsperson before mistaking every pattern for an anomaly.',
'A shallow stone trough retains rain long after the trail dries. Return in different weather to compare the organisms.'
];
for(const [ri,r]of routes.entries()){const count=Math.floor(routeLength(r)/500);for(let i=1;i<count;i++){const p=alongRoute(r,i/count);const habitat=habitatAt(p),list=distributions[habitat];const dx=i%2?55:-55;fieldNodes.push({id:`trail-${ri}-${i}`,specimen:list[Math.floor(hash(ri,i)*list.length)],x:p.x+dx,y:p.y+16,note:i%3===0?fieldNotes[(i+ri)%fieldNotes.length]:undefined});}}
