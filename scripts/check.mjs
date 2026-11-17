import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { buildings,inside,walkable,world,roadLines,tourIds,campusAxis,gateScale,colonnadeLayout,colonnadePoint } from '../src/campus-data.js';
import { southGateSolids } from '../src/south-gate.js';
import { mainBuildingSolids } from '../src/main-axis.js';
import { normalizeWeather, atmosphereFor, advanceTime, formatTime, weatherTypes } from '../src/weather-state.js';
const ids=new Set();
for(const b of buildings){assert(!ids.has(b.id),'Duplicate building '+b.id);ids.add(b.id);if(b.kind!=='gate')assert(inside(b.x,b.z),'Building outside campus: '+b.id);assert(b.w>0&&b.d>0,'Invalid footprint '+b.id);}
for(const id of tourIds)assert(ids.has(id),'Unknown tour stop '+id);
for(const r of roadLines)for(const point of r.points)assert(point.length===2&&point.every(Number.isFinite),'Invalid road '+r.name);
const main=buildings.find(b=>b.id==='main'),library=buildings.find(b=>b.id==='library'),stadium=buildings.find(b=>b.id==='stadium');
assert(library.z<main.z&&stadium.x<main.x&&stadium.z>main.z,'Reference-map spatial relationships changed');
assert(inside(world(841,1484).x,world(841,1484).z),'Walk spawn outside campus');
const gate=buildings.find(b=>b.id==='doorSouth');
const end=campusAxis.at(campusAxis.length);
assert(Math.hypot(end.x-gate.x,end.z-gate.z)<1e-8,'Main axis must terminate at south gate');
assert(Math.abs(campusAxis.project(main.x,main.z).lateral)<1e-8,'Main building off axis');
assert(campusAxis.colonnade>22&&campusAxis.motto>campusAxis.colonnade&&campusAxis.motto<campusAxis.length,'Axis landmark order');
for(const distance of [campusAxis.colonnade,campusAxis.motto,campusAxis.length]) {
  const p=campusAxis.at(distance);assert(Math.abs(campusAxis.project(p.x,p.z).lateral)<1e-8,'Axis alignment');
  assert(walkable(p.x,p.z),'Axis outside campus');
}
assert(mainBuildingSolids.filter(s=>Math.abs(s.x)>20).every(s=>s.z>0),'Main side wings must face south gate');
const mainWidth=Math.max(...mainBuildingSolids.map(s=>s.x+s.w/2))-Math.min(...mainBuildingSolids.map(s=>s.x-s.w/2));
const columnWidth=2*colonnadeLayout.radius*Math.sin(colonnadeLayout.halfAngle);
assert(columnWidth/mainWidth>.4&&columnWidth/mainWidth<.6,'Colonnade should be narrower than main forecourt');
assert(43.2*gateScale/mainWidth<.35,'South gate is oversized relative to main building');
assert(colonnadeLayout.pairs%2===0,'Central colonnade opening must fall between paired columns');
for(let i=0;i<colonnadeLayout.pairs;i++)for(const row of [-1,1]) {
  const angle=-colonnadeLayout.halfAngle+2*colonnadeLayout.halfAngle*i/(colonnadeLayout.pairs-1),p=colonnadePoint(angle,row*colonnadeLayout.rowOffset);
  assert(Math.abs(p.x)>.515+.35,'Paired column blocks central pedestrian passage');
}
for(let distance=23;distance<=50;distance++)assert(!mainBuildingSolids.some(s=>Math.abs(s.x)<s.w/2+.35&&Math.abs(distance-s.z)<s.d/2+.35),'Main forecourt blocks axial approach');
for(let t=-11;t<=28;t++) {
  const z=t*gateScale;
  assert(walkable(gate.x,gate.z+z),'South gate approach is not walkable');
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
