import { boundary, coast, siteLayouts, wingPlans, familySites, streets, footpaths, lakePlans } from './campus-plan.js';

export const gateScale = .44;
export const mainScale = {x:1.19, y:.82, z:.64};
export const colonnadeLayout = {radius:22,halfAngle:.68,pairs:12,rowOffset:.72,pedestal:.74,columnTop:5.35,roofTop:6.28};
export function colonnadePoint(angle, offset=0) {
  const radius=colonnadeLayout.radius+offset;
  return {x:Math.sin(angle)*radius,z:campusAxis.colonnade-colonnadeLayout.radius+Math.cos(angle)*radius};
}

const axisX = siteLayouts.main[0], mainZ = siteLayouts.main[1], gateZ = siteLayouts.doorSouth[1];
export const campusAxis = {
  origin:{x:axisX,z:mainZ}, end:{x:axisX,z:gateZ}, length:gateZ-mainZ,
  front:{x:0,z:1}, right:{x:1,z:0}, yaw:0, colonnade:53, motto:105,
  at(distance,lateral=0) {return {x:axisX+lateral,z:mainZ+distance};},
  project(x,z) {return {distance:z-mainZ,lateral:x-axisX};}
};
export const gatePoint = (x,z) => campusAxis.at(campusAxis.length+z,x);
export const axisLayout = {promenadeWidth:5.8,avenueWidth:8.5,plazaX:9.5,plazaZ:7.1,treeRows:[8.6,16.8]};
// The installation was photographed more recently than the plan imagery.
export const displayLayout = {distance:113.8,width:11.2,depth:3,plazaWidth:18,plazaEnd:118.5};
export const axisTreeSites = [83,91,99,130,138,146,154,162,170].flatMap(distance=>
  axisLayout.treeRows.flatMap(lateral=>[-1,1].map(side=>({distance,lateral:lateral*side}))));

const point = ([x,z]) => ({x,z});
export const outline = boundary.map(point);
export const coastLine = coast.map(point);
// Give the public road along the east boundary a ground shoulder of its own.
const easternRoad = streets.find(([name])=>name==='福山路')[2];
export const terrainOutline = outline.map(p=>{
  if(p.x<130||p.z<easternRoad[0][1]||p.z>309)return p;
  const end=easternRoad.findIndex(([,z])=>z>=p.z);
  if(end<1)return p;
  const [ax,az]=easternRoad[end-1],[bx,bz]=easternRoad[end];
  const roadsideX=ax+(bx-ax)*(p.z-az)/(bz-az);
  return {x:Math.max(p.x,roadsideX+9),z:p.z};
});
export const campusBounds = {
  minX:Math.min(...outline.map(p=>p.x))-3, maxX:Math.max(...outline.map(p=>p.x))+3,
  minZ:Math.min(...outline.map(p=>p.z))-3, maxZ:Math.max(...outline.map(p=>p.z))+12,
};

export function inside(x,z) {
  let hit=false;
  for(let i=0,j=outline.length-1;i<outline.length;j=i++) {
    const a=outline[i],b=outline[j];
    if(((a.z>z)!==(b.z>z)) && x<(b.x-a.x)*(z-a.z)/(b.z-a.z)+a.x) hit=!hit;
  }
  return hit;
}
export function walkable(x,z) {
  const p=campusAxis.project(x,z),zGate=p.distance-campusAxis.length;
  return (inside(x,z)&&!lakes.some(lake=>lakeEdge(x,z,lake)<0))||
    (Math.abs(p.lateral)<16*gateScale && zGate>-13*gateScale && zGate<29.5*gateScale);
}

function taper(t) {
  const u=Math.min(1,Math.max(0,t));
  return u*u*(3-2*u);
}
function naturalHeight(x,z) {
  const coastalRise=taper((x+283)/144);
  const rearSlope=29.5*taper((116-z)/292)*coastalRise;
  const hillMask=taper((x+24)/40)*Math.exp(-(((x-32)/58)**2+((z-28)/48)**2));
  const centralHill=hillMask*(6.5+2.7*Math.sin((x-11)*.095)*Math.cos((z-28)*.085));
  const dormRidge=14.2*taper((x-66)/42)*taper((16-z)/44)*taper((z+198)/55);
  const northHill=52*Math.exp(-(((x-80)/85)**2+((z+274)/63)**2))*taper((-z-192)/60);
  return Math.max(0,rearSlope+centralHill+dormRidge,northHill);
}

function lakeEdge(x,z,{points,minX,maxX,minZ,maxZ}) {
  if(x<minX-6||x>maxX+6||z<minZ-6||z>maxZ+6)return Infinity;
  let nearest=Infinity,wet=false;
  for(let i=0,j=points.length-1;i<points.length;j=i++) {
    const a=points[j],b=points[i],dx=b.x-a.x,dz=b.z-a.z;
    if((a.z>z)!==(b.z>z)&&x<a.x+dx*(z-a.z)/dz)wet=!wet;
    const t=Math.min(1,Math.max(0,((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz)));
    nearest=Math.min(nearest,Math.hypot(x-a.x-t*dx,z-a.z-t*dz));
  }
  return wet?-nearest:nearest;
}

export function height(x,z) {
  let y=naturalHeight(x,z);
  for(const lake of lakes) {
    const edge=lakeEdge(x,z,lake);
    if(edge<6)y=Math.min(y,lake.level-.6+(y-lake.level+.6)*taper(edge/6));
  }
  return y;
}

export const roadLines = streets.map(([name,width,points]) => ({name,width,points:points.map(point)}));
roadLines.push({name:'南门中轴路',width:axisLayout.avenueWidth,
  points:[displayLayout.plazaEnd,145,campusAxis.length-16*gateScale].map(distance=>campusAxis.at(distance))});
export const paths = footpaths.map(line=>line.map(point));
export const lakes = lakePlans.map(([name,path])=>{
  const points=path.map(point);
  return {name,points,level:Math.min(...points.map(p=>naturalHeight(p.x,p.z)))+.37,
    minX:Math.min(...points.map(p=>p.x)),maxX:Math.max(...points.map(p=>p.x)),
    minZ:Math.min(...points.map(p=>p.z)),maxZ:Math.max(...points.map(p=>p.z))};
});

// Location metadata keeps the original ids so existing bookmarks stay valid.
const catalog = [
  ['main','主楼（H楼）','study',7,'main'],
  ['ming','明学楼（M楼）','study',5],
  ['gong','功学楼（G楼）','study',5],
  ['ning','宁学楼（N楼）','study',5,'ning'],
  ['library','图书馆','study',5,'library'],
  ['wanghai','望海楼','study',5],
  ['boB','博学楼B','study',5],
  ['zhi','大学生创新创业基地','study',2],
  ['activity','大学生活动中心','study',3],
  ['gym','综合球类馆','sport',2],
  ['stadium','体育场','sport',1,'stadium'],
  ['basketball','篮球场','sport',1,'court'],
  ['volleyball','排球场','sport',1,'court'],
  ['tennis','网球场','sport',1,'court'],
  ['football','足球场','sport',1,'court'],
  ['racing','赛车训练场','sport',1,'court'],
  ['training','拓展训练场','sport',1,'court'],
  ['xuezi','学子餐厅','life',4],
  ['xueyuan','学苑餐厅','life',3],
  ['d1','1公寓（紫荆楼）','life',6],
  ['d2','2公寓（紫薇楼）','life',6],
  ['d3','3公寓（松山楼）','life',6],
  ['d4','4公寓（紫藤楼）','life',6],
  ['d5A','5公寓（海澜楼）','life',6],
  ['d6A','6公寓','life',6],
  ['d6B','6公寓北楼','life',6],
  ['d7','7公寓（不期楼）','life',6,'courtyard'],
  ['d8','8公寓（抱海楼）','life',6],
  ['d9','9公寓（聚海楼）','life',6],
  ['d10','10公寓（拾海楼）','life',6],
  ['d11','11公寓（瞰海楼）','life',6],
  ['d12','12公寓（渤海楼）','life',6,'courtyard'],
  ['d13A','13A公寓','life',13],
  ['d13B','13B公寓','life',13],
  ['d14A','14A公寓','life',12],
  ['d14B','14B公寓','life',12],
  ['d14C','14C公寓','life',12],
  ['international','留学生公寓','life',5],
  ['tianyayuan','天雅苑','life',3],
  ['tianyaxuan','天雅轩','life',3],
  ['store','大学生服务中心','life',3],
  ['research1','研学楼1号','study',5,'research'],
  ['research2','研学楼2号','study',5],
  ['anA','安学楼A','study',4],
  ['tanT','探学楼T','study',4],
  ['guanD','观展楼D','study',3],
  ['chongC','崇学楼C','study',4],
  ['yiE','怡学楼E','study',4],
  ['zheF','哲学楼F','study',4],
  ['test','车辆实验室','study',3],
  ['water','综合拖曳水池','study',2],
  ['printing','打印厂','life',2],
  ['incubator','创新创业园','study',3,'courtyard'],
  ['doorSouth','南门','gate',1,'gate'],
  ['doorEast','东门','gate',1,'gate'],
  ['doorWest','西门','gate',1,'gate'],
  ['doorNorth','西北侧门','gate',1,'gate']
];
export const buildings = catalog.map(([id,name,kind,floors,shape='block'])=>{
  const [x,z,w,d,heading]=siteLayouts[id];
  return {id,name,kind,x,z,w,d,yaw:heading*Math.PI/180,floors,shape,wings:wingPlans[id]};
});
for(const [i,x,z,w,d] of familySites) {
  buildings.push({id:'family'+i,name:'林苑家属区 '+i+'号楼',kind:'life',x,z,w,d,yaw:.06,
    floors:4,shape:'block',minor:true});
}
export const categoryNames={study:'教学科研',life:'生活服务',sport:'运动场地',gate:'校园出入口'};
export const tourIds=['doorSouth','main','stadium','xuezi','library','ning'];
