import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { buildings,inside,walkable,height,roadLines,tourIds,campusAxis,gateScale,gatePoint,axisTreeSites,lakes,axisLayout,colonnadeLayout,colonnadePoint,displayLayout } from '../src/campus-data.js';
import { southGateSolids } from '../src/south-gate.js';
import { mainBuildingSolids } from '../src/main-axis.js';
import { normalizeWeather, atmosphereFor, advanceTime, formatTime, weatherTypes } from '../src/weather-state.js';
const ids=new Set();
for(const b of buildings){assert(!ids.has(b.id),'Duplicate building '+b.id);ids.add(b.id);if(b.kind!=='gate')assert(inside(b.x,b.z),'Building outside campus: '+b.id);assert(b.w>0&&b.d>0,'Invalid footprint '+b.id);}
for(const id of tourIds)assert(ids.has(id),'Unknown tour stop '+id);
for(const r of roadLines)for(const {x,z} of r.points)assert(Number.isFinite(x)&&Number.isFinite(z),'Invalid road '+r.name);
const main=buildings.find(b=>b.id==='main'),library=buildings.find(b=>b.id==='library'),stadium=buildings.find(b=>b.id==='stadium');
assert(library.z<main.z&&stadium.x<main.x&&stadium.z>main.z,'Reference-map spatial relationships changed');
const spawn=campusAxis.at(campusAxis.length-12);
assert(walkable(spawn.x,spawn.z),'Walk spawn outside campus');
const groundAt=b=>height(b.x,b.z);
const stadiumGround=groundAt(stadium),mainGround=groundAt(main),libraryGround=groundAt(library);
assert(stadiumGround<.2&&mainGround<.6,'Stadium and main forecourt should stay on the low southern terrace');
assert(libraryGround>mainGround+10,'The route to the library must climb behind the main building');
for(const id of ['d12','d13A','d13B','d14A','d14B','d14C']) {
  const b=buildings.find(item=>item.id===id);
  assert(groundAt(b)>mainGround+3,'High dormitory is missing the rear hillside: '+id);
}
let previous=-Infinity;
for(let i=0;i<=24;i++) {
  const t=i/24,x=stadium.x+(library.x-stadium.x)*t,z=stadium.z+(library.z-stadium.z)*t;
  const current=height(x,z);
  assert(Number.isFinite(current),'Terrain height is not finite along stadium-library route');
  assert(current>=previous-.55,'Stadium-library route has an unexpected downhill break');
  previous=current;
}
const gate=buildings.find(b=>b.id==='doorSouth');
const end=campusAxis.at(campusAxis.length);
assert(Math.hypot(end.x-gate.x,end.z-gate.z)<1e-8,'Main axis must terminate at south gate');
// Check the delivered plan rather than just the landmark centres: gate frame,
// avenue vertices, reflected planting and lake contours must share one basis.
for(const z of [-12,0,12]) {
  const p=gatePoint(0,z),a=campusAxis.project(p.x,p.z);
  assert(Math.abs(a.lateral)<1e-8&&Math.abs(a.distance-campusAxis.length-z)<1e-8,'Gate approach bends off axis');
}
const avenue=roadLines.find(r=>r.name==='南门中轴路');
for(const {x,z} of avenue.points)assert(Math.abs(campusAxis.project(x,z).lateral)<1e-8,'Avenue bends off axis');
assert.equal(avenue.width,axisLayout.avenueWidth);
assert(campusAxis.motto<displayLayout.distance&&displayLayout.distance+displayLayout.depth/2<displayLayout.plazaEnd&&displayLayout.plazaEnd<campusAxis.length,'Display must stand on its own forecourt in front of the motto stone');
assert(displayLayout.plazaWidth-displayLayout.width>4,'Display must leave pedestrian space on both sides');
const avenueStart=avenue.points[0];
assert(Math.abs(campusAxis.project(avenueStart.x,avenueStart.z).distance-displayLayout.plazaEnd)<1e-8,'Avenue must stop before the display forecourt');
for(const a of axisTreeSites)assert(axisTreeSites.some(b=>b.distance===a.distance&&b.lateral===-a.lateral),'Missing mirrored avenue tree');
for(const [name,side] of [['日湖',1],['月湖',-1]]) {
  const lake=lakes.find(l=>l.name===name);
  assert(lake.points.every(p=>campusAxis.project(p.x,p.z).lateral*side>0),'Lake crosses the central walk');
  assert(lake.points.every(p=>height(p.x,p.z)<lake.level),'Shoreline buried by terrain');
}
assert(Math.abs(campusAxis.project(main.x,main.z).lateral)<1e-8,'Main building off axis');
assert(campusAxis.colonnade>22&&campusAxis.motto>campusAxis.colonnade&&campusAxis.motto<campusAxis.length,'Axis landmark order');
for(const distance of [campusAxis.colonnade,campusAxis.motto,campusAxis.length]) {
  const p=campusAxis.at(distance);assert(Math.abs(campusAxis.project(p.x,p.z).lateral)<1e-8,'Axis alignment');
  assert(walkable(p.x,p.z),'Axis outside campus');
}
for(const side of [-1,1])assert(mainBuildingSolids.some(s=>s.x*side>20&&s.z>0),'Main forecourt missing a wing');
assert(mainBuildingSolids.some(s=>s.z<-12&&Math.abs(s.x)<12),'Main building missing its rear wing');
const mainWidth=Math.max(...mainBuildingSolids.map(s=>s.x+s.w/2))-Math.min(...mainBuildingSolids.map(s=>s.x-s.w/2));
const columnWidth=2*colonnadeLayout.radius*Math.sin(colonnadeLayout.halfAngle);
assert(columnWidth/mainWidth>.32&&columnWidth/mainWidth<.49,'Colonnade width outside the satellite-derived range');
assert(43.2*gateScale/mainWidth<.35,'South gate is oversized relative to main building');
assert(colonnadeLayout.pairs%2===0,'Central colonnade opening must fall between paired columns');
for(let i=0;i<colonnadeLayout.pairs;i++)for(const row of [-1,1]) {
  const angle=-colonnadeLayout.halfAngle+2*colonnadeLayout.halfAngle*i/(colonnadeLayout.pairs-1),p=colonnadePoint(angle,row*colonnadeLayout.rowOffset);
  assert(Math.abs(p.x)>.515+.35,'Paired column blocks central pedestrian passage');
}
for(let distance=23;distance<=50;distance++)assert(!mainBuildingSolids.some(s=>Math.abs(s.x)<s.w/2+.35&&Math.abs(distance-s.z)<s.d/2+.35),'Main forecourt blocks axial approach');
for(let t=-11;t<=28;t++) {
  const z=t*gateScale;
  const p=gatePoint(0,z);assert(walkable(p.x,p.z),'South gate approach is not walkable');
  assert(!southGateSolids.some(s=>Math.abs(s.x)<s.w/2+.35&&Math.abs(z-s.z)<s.d/2+.35&&s.y<1.7&&s.y+s.h>.08),'South gate arch blocks central passage');
}
const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
assert(!html.includes('__CAMPUS_MAP__')&&!html.includes('<!--APP-->'),'Unresolved build placeholder');
assert(!/<script[^>]+src=|<link[^>]+href=|https:\/\/cdn\./i.test(html),'Delivery depends on external resources');
assert(html.includes('data:image/png;base64,'),'Missing embedded reference map');
assert.equal(formatTime(1440),'00:00');assert.equal(formatTime(1435),'23:55');
assert.equal(advanceTime(1430,10,60),230,'Clock must wrap at midnight');
assert.equal(advanceTime(0,300,300),0,'Full cycle should return to midnight');
assert.equal(normalizeWeather(null).type,'clear');
assert.deepEqual(normalizeWeather({minutes:-5,type:'invalid',intensity:10,cycle:0,playing:'yes',particles:false}),{minutes:1435,type:'clear',intensity:1,cycle:300,playing:false,particles:false});
assert.equal(atmosphereFor({minutes:0}).night,1);assert.equal(atmosphereFor({minutes:720}).night,0);
assert.equal(atmosphereFor({type:'rain',intensity:0}).wet,0);assert.equal(atmosphereFor({type:'snow',intensity:0}).snow,0);assert.equal(atmosphereFor({type:'fog',intensity:0}).haze,0);
for(const type of Object.keys(weatherTypes))for(const minutes of [0,360,390,720,1050,1080,1435]) {
  const a=atmosphereFor({type,minutes});
  assert(a.direction.every(Number.isFinite)&&a.sun>=0&&a.day>=0&&a.day<=1&&a.haze>=0&&a.haze<=1,'Invalid atmosphere');
  assert.equal(a.wet>0,type==='rain');assert.equal(a.snow>0,type==='snow');
}
console.log(`Checks passed: ${buildings.length} places, ${roadLines.length} roads, layout, offline HTML, weather validation and midnight/cycle boundaries.`);
