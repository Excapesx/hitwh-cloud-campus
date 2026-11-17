import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { buildings,inside,world,roadLines,tourIds } from '../src/campus-data.js';
const ids=new Set();
for(const b of buildings){assert(!ids.has(b.id),'Duplicate building '+b.id);ids.add(b.id);if(b.kind!=='gate')assert(inside(b.x,b.z),'Building outside campus: '+b.id);assert(b.w>0&&b.d>0,'Invalid footprint '+b.id);}
for(const id of tourIds)assert(ids.has(id),'Unknown tour stop '+id);
for(const r of roadLines)for(const point of r.points)assert(point.length===2&&point.every(Number.isFinite),'Invalid road '+r.name);
const main=buildings.find(b=>b.id==='main'),library=buildings.find(b=>b.id==='library'),stadium=buildings.find(b=>b.id==='stadium');
assert(library.z<main.z&&stadium.x<main.x&&stadium.z>main.z,'Reference-map spatial relationships changed');
assert(inside(world(841,1484).x,world(841,1484).z),'Walk spawn outside campus');
const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
assert(!html.includes('__CAMPUS_MAP__')&&!html.includes('<!--APP-->'),'Unresolved build placeholder');
assert(!/<script[^>]+src=|<link[^>]+href=|https:\/\/cdn\./i.test(html),'Delivery depends on external resources');
assert(html.includes('data:image/png;base64,'),'Missing embedded reference map');
console.log(`Checks passed: ${buildings.length} unique in-bounds places, ${roadLines.length} roads, tour references, relative layout and offline HTML.`);
