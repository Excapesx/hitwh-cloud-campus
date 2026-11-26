import { terrainOutline, coastLine, height, roadLines, paths, buildings, lakes } from './campus-data.js';
import { sitePoint } from './footprint.js';
import { buildSouthGate } from './south-gate.js';
import { buildMainAxis } from './main-axis.js';
import { createPhotoBuildingKit, photoBuildings } from './photo-buildings.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export function buildTerrain({T,mesh,box,m}) {
  const outline=terrainOutline;
  const shape=new T.Shape(outline.map(p=>new T.Vector2(p.x,-p.z)));
  const slab=new T.ExtrudeGeometry(shape,{depth:5,bevelEnabled:false});
  slab.rotateX(-Math.PI/2);
  mesh(slab,m.deepGrass,0,-5.15,0,false);
  const minX=Math.min(...outline.map(p=>p.x)),maxX=Math.max(...outline.map(p=>p.x));
  const minZ=Math.min(...outline.map(p=>p.z)),maxZ=Math.max(...outline.map(p=>p.z));
  const w=maxX-minX,d=maxZ-minZ;
  const geo=new T.PlaneGeometry(w,d,Math.ceil(w/3.8),Math.ceil(d/3.8));
  geo.rotateX(-Math.PI/2).translate((minX+maxX)/2,0,(minZ+maxZ)/2);
  const p=geo.attributes.position, colors=new Float32Array(p.count*3), color=new T.Color();
  const lowGrass=new T.Color(0xfffdf4), slopeGrass=new T.Color(0xdce6d8);
  for(let i=0;i<p.count;i++) {
    const x=p.getX(i),z=p.getZ(i),y=height(x,z); p.setY(i,y);
    color.copy(lowGrass).lerp(slopeGrass,T.MathUtils.smoothstep(y,2,28)).toArray(colors,i*3);
  }
  const indices=[];
  const original=geo.index.array;
  const included=new Uint8Array(p.count);
  for(let k=0;k<p.count;k++){
    const x=p.getX(k),z=p.getZ(k);
    let inside=false;
    for(let i=0,j=outline.length-1;i<outline.length;j=i++){
      const a=outline[i],b=outline[j];
      if((a.z>z)!==(b.z>z)&&x<(b.x-a.x)*(z-a.z)/(b.z-a.z)+a.x)inside=!inside;
    }
    included[k]=inside;
  }
  for(let i=0;i<original.length;i+=3) {
    const ids=[original[i],original[i+1],original[i+2]];
    if(ids.every(j=>included[j])) indices.push(...ids);
  }
  geo.setIndex(indices); geo.setAttribute('color',new T.BufferAttribute(colors,3)); geo.computeVertexNormals();
  mesh(geo,m.terrain,0,.02,0,false);
  // 轮廓边缘补一圈连续的地形立面，低机位不会看到绿色地形板悬在底面上。
  const skirtBottom=-6.15,skirtPositions=[],skirtIndices=[];
  for(let i=0;i<outline.length;i++) {
    const a=outline[i],b=outline[(i+1)%outline.length],ai=skirtPositions.length/3;
    skirtPositions.push(a.x,height(a.x,a.z)+.015,a.z,b.x,height(b.x,b.z)+.015,b.z,
      b.x,skirtBottom,b.z,a.x,skirtBottom,a.z);
    skirtIndices.push(ai,ai+1,ai+2,ai,ai+2,ai+3);
  }
  const skirtGeo=new T.BufferGeometry();
  skirtGeo.setAttribute('position',new T.Float32BufferAttribute(skirtPositions,3));
  skirtGeo.setIndex(skirtIndices);skirtGeo.computeVertexNormals();
  mesh(skirtGeo,m.deepGrass,0,0,0,false);
  // 海面在图面西侧；没有经纬度与测绘基准，不用场景尺寸推算距离。
  const outside=new T.PlaneGeometry(3000,3000);outside.rotateX(-Math.PI/2);
  mesh(outside,new T.MeshStandardMaterial({color:0xc8d0b9,roughness:1}),0,skirtBottom-.02,0,false);
  const curve=new T.SplineCurve(coastLine.map(p=>new T.Vector2(p.x,-p.z)));
  const coast=curve.getPoints(160),sea=new T.Shape();
  sea.moveTo(-1600,1200);sea.lineTo(coast[0].x,coast[0].y);coast.forEach(p=>sea.lineTo(p.x,p.y));sea.lineTo(-1600,-1400);sea.closePath();
  const seaGeo=new T.ShapeGeometry(sea);seaGeo.rotateX(-Math.PI/2);mesh(seaGeo,m.water,0,-5.2,0,false);
}

export function buildCampus(c) {
  const {T,m,mesh,box,disc,paving,landmark,registerMesh,block,piece,hip,addCollider}=c;
  const roads=[];
  function footprintGround(x,z,w,d,yaw) {
    return Math.min(...[-1,1].flatMap(u=>[-1,1].map(v=>{
      const corner=sitePoint(x,z,yaw,u*w/2,v*d/2);
      return height(corner.x,corner.z);
    })));
  }
  function ribbon(points,width,material,lift=.24,offset=0) {
    const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(p.x,0,p.z)),false,'centripetal');
    const count=Math.max(8,Math.ceil(curve.getLength()/2.5)), positions=[];
    for(let i=0;i<=count;i++) {
      const p=curve.getPoint(i/count),tan=curve.getTangent(i/count),normal=new T.Vector3(-tan.z,0,tan.x).normalize();
      for(const side of [-1,1]) {
        const x=p.x+normal.x*(offset+width*side/2),z=p.z+normal.z*(offset+width*side/2);
        positions.push(x,height(x,z)+lift,z);
      }
    }
    const ids=[];
    for(let i=0;i<count;i++){const a=i*2;ids.push(a,a+1,a+2,a+1,a+3,a+2);}
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setIndex(ids);geo.computeVertexNormals();
    const mat=material.clone();mat.side=T.DoubleSide;
    mesh(geo,mat,0,0,0,false);
    return curve;
  }
  for(const line of roadLines) {
    const curve=ribbon(line.points,line.width+1.4,m.curb,.2);ribbon(line.points,line.width,m.asphalt,.29);
    const marked=line.width>=4.8&&!line.name.includes('中轴')&&!line.name.includes('主楼前');
    if(marked) {
      ribbon(line.points,.105,m.roadYellow,.355);
      const edge=Math.max(1.55,line.width/2-.32);
      ribbon(line.points,.07,m.roadWhite,.35,edge);ribbon(line.points,.07,m.roadWhite,.35,-edge);
    }
    roads.push({name:line.name,width:line.width,curve});
  }
  // 南门照片里的主路有连续浅色人行带。把同样的窄铺装延伸到环山路、
  // 学子路和体育场周边，路缘与坡面之间形成清晰的步行尺度。
  const sidewalkRows=new Set(['环山路','学子路','学子林北路','东侧道路','远遥路','学苑路','桃苑北路','桃苑南路','槐云路']);
  for(const line of roadLines) {
    if(!sidewalkRows.has(line.name))continue;
    const sidewalkWidth=line.width>5?1.25:1.05;
    const offset=line.width/2+1.12;
    ribbon(line.points,sidewalkWidth,m.path,.37,offset);
    ribbon(line.points,sidewalkWidth,m.path,.37,-offset);
  }
  const walkways=paths.map(path=>({width:1.45,curve:ribbon(path,1.45,m.path,.34)}));
  function lake({points,level}) {
    const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(p.x,0,p.z)),true,'centripetal');
    const polygon=curve.getPoints(100).slice(0,-1).map(p=>new T.Vector2(p.x,-p.z));
    mesh(new T.TubeGeometry(curve,100,.16,6,true),m.stone,0,level+.095,0,false);
    const shape=new T.Shape(polygon);
    const geo=new T.ShapeGeometry(shape,20);geo.rotateX(-Math.PI/2);mesh(geo,m.water,0,level,0,false);
  }
  lakes.forEach(lake);

  // 学子餐厅后方的照片可见一条红砖步道和连续白栏杆。它们与坡面共用
  // height(x,z)，栏杆分段贴地，避免在起伏草坡上出现悬空的直线。
  const hillWalk=[{x:-8,z:-44},{x:3,z:-41},{x:15,z:-36},{x:25,z:-30},{x:34,z:-24}];
  walkways.push({width:1.9,curve:ribbon(hillWalk,1.9,m.path,.32)});
  const fencePoints=hillWalk.map(p=>({x:p.x,z:p.z+1.2}));
  function beamBetween(a,b,width,material) {
    const start=new T.Vector3(a.x,a.y,a.z),end=new T.Vector3(b.x,b.y,b.z);
    const vector=end.clone().sub(start),mid=start.clone().add(end).multiplyScalar(.5);
    const geo=new T.BoxGeometry(width,width,vector.length());
    geo.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,0,1),vector.normalize()));
    mesh(geo,material,mid.x,mid.y,mid.z,false);
  }
  for(let i=0;i<fencePoints.length;i++) {
    const p=fencePoints[i],ground=height(p.x,p.z);
    box(p.x,ground,p.z,.14,.86,.14,m.line,false);
    if(i===0)continue;
    const previous=fencePoints[i-1],previousGround=height(previous.x,previous.z);
    for(const lift of [.35,.68]) beamBetween(
      {x:previous.x,y:previousGround+lift,z:previous.z},
      {x:p.x,y:ground+lift,z:p.z},.055,m.line
    );
  }

  const buildPhotoBuilding=createPhotoBuildingKit(c);
  const fieldEntries=[];
  for(const spec of buildings) {
    const {name,id,x,z,w,d,yaw,floors,kind,shape,minor,wings}=spec;
    const photo=photoBuildings[id];
    const desc=photo?`立面参考实景照片，包含${photo.detail}。位置和占地参考卫星图与校园总平面图。`:id==='stadium'?'跑道和球场按卫星图调整比例，西侧有顶看台和对侧露天看台参考实景照片。':id==='main'?'主楼的横向楼体、西配楼和后翼按卫星图校准。塔冠、立柱和雨棚参考实拍。主楼、弧形柱廊、校训石与南门沿同一条轴线布置。':id==='doorSouth'?'门体参考实景照片，保留中央大拱、两侧门廊、校名牌匾和敞开的铁艺门。':kind==='gate'?'校园总平面图标注的出入口。':
      name+'的位置和占地参考卫星图与校园总平面图，楼层与立面为示意。';
    const detail=id==='racing'?'按汽车训练场照片补充深色铺装、透空绿围网和侧边入口。':desc;
    const entry=landmark(name,id,detail,x,z,kind,['main','library','stadium','doorSouth'].includes(id)?0:minor?3:1);
    Object.assign(entry,{id,spec});
    const y=(shape==='main'||kind==='gate')?height(x,z):footprintGround(x,z,w,d,yaw);
    const material=kind==='life'?m.dorm:kind==='sport'?m.blue:m.light;
    const h=floors*2.9;
    if(id==='doorSouth') {
      buildSouthGate(c,entry);
    } else if(shape==='main') {
      buildMainAxis(c,entry);
    } else if(photo) {
      buildPhotoBuilding(entry,y);
    } else if(wings) {
      for(const [u,v,width,depth] of wings){
        const p=sitePoint(x,z,yaw,u,v);
        block(entry,p.x,y,p.z,width,depth,h,floors,material,.45,yaw);
      }
    } else if(shape==='stadium') {
      function circuit(radius,reach) {
        const straight=reach-radius;
        const ring=new T.Shape();
        ring.moveTo(radius,straight);
        ring.absarc(0,straight,radius,0,Math.PI,false);
        ring.lineTo(-radius,-straight);
        ring.absarc(0,-straight,radius,Math.PI,Math.PI*2,false);
        ring.closePath();
        return ring;
      }
      function trackSurface(rx,rz,material,lift) {
        const geo=new T.ShapeGeometry(circuit(rx,rz),42).rotateX(-Math.PI/2);
        registerMesh(mesh(geo,material,x,y+lift,z,false),entry);
      }
      trackSurface(w*.54,d*.535,m.stone,.13);
      trackSurface(w/2,d/2,m.track,.20);
      for(let i=0;i<7;i++) {
        const lane=circuit(w/2-.48-i*.56,d/2-.48-i*.56);
        for(const segment of lane.curves) {
          const count=segment.isEllipseCurve?32:1;
          const line=segment.getPoints(count).map(p=>new T.Vector3(x+p.x,y+.24,z-p.y));
          const curve=count>1?new T.CatmullRomCurve3(line):new T.LineCurve3(line[0],line[1]);
          mesh(new T.TubeGeometry(curve,count,.048,3,false),m.line,0,0,0,false);
        }
      }
      trackSurface(w/2-4.6,d/2-4.6,m.grass,.27);
      const halfPitchW=w*.285,halfPitchD=d*.28;
      registerMesh(paving(x,z,halfPitchW*2,halfPitchD*2,m.pitch,.3),entry);
      // 绿茵场线、球门和角旗让运动场从远处也能被识别成足球场。
      for(const xx of [-1,1])paving(x+xx*halfPitchW,z,.16,halfPitchD*2,m.line,.35);
      for(const zz of [-1,0,1])paving(x,z+zz*halfPitchD,halfPitchW*2,.16,m.line,.35);
      paving(x,z-d*.22,w*.19,.12,m.line,.36);paving(x,z+d*.22,w*.19,.12,m.line,.36);
      const ring=new T.RingGeometry(3.8,3.96,40);ring.rotateX(-Math.PI/2);mesh(ring,m.line,x,y+.37,z,false);
      for(const zz of [-1,1]) {
        const postZ=z+zz*halfPitchD;
        for(const xx of [-1,1])box(x+xx*2,y+.35,postZ,.15,2.2,.15,m.line);
        box(x,y+2.55,postZ,4.2,.15,.15,m.line);
        box(x,y+1.55,postZ,4.2,.07,.07,m.line);
      }
      for(const [xx,zz] of [[-1,-1],[-1,1],[1,-1],[1,1]]) {
        box(x+xx*halfPitchW,y+.34,z+zz*halfPitchD,.06,.62,.06,m.brass);
        const flag=new T.ConeGeometry(.18,.26,4);flag.rotateZ(Math.PI/2);mesh(flag,m.seatRed,x+xx*halfPitchW+xx*.09,y+1.03,z+zz*halfPitchD,false);
      }
      const standLength=d*.57,west=x-w*.485,east=x+w*.483;
      const seatRows=[[],[],[]];
      const seatMaterials=[m.seatRed,m.seatTeal,m.seatAmber];
      for(let i=0;i<6;i++){
        const lift=.26+i*.39;
        for(const [side,face] of [[-1,west],[1,east]]){
          const standX=face+side*(.3+i*.84);
          registerMesh(box(standX,y+.15,z,.9,lift,standLength,m.stone),entry);
          for(let n=0;n<24;n++){
            const seat=new T.BoxGeometry(.34,.18,standLength*.032);
            seat.translate(standX-x,y+.24+lift,(n-11.5)*standLength/24);
            const center=side===1&&Math.abs(n-11.5)<4;
            seatRows[center?1:side===-1?2:0].push(seat);
          }
        }
      }
      for(const [i,row] of seatRows.entries()){
        mesh(mergeGeometries(row),seatMaterials[i],x,0,z,false);
        for(const seat of row)seat.dispose();
      }
      registerMesh(box(west-2.5,y+6.55,z,8.7,.25,standLength+1.6,m.roof),entry);
      for(let n=0;n<8;n++){
        const p=z+(n/7-.5)*standLength;
        box(west-5.25,y+.15,p,.24,6.5,.24,m.light);
        addCollider(west-5.25,y+.15,p,.24,6.5,.24);
        box(west-2.5,y+5.98,p,8.5,.09,.09,m.steel);
        box(west-2.5,y+6.56,p,8.5,.11,.11,m.steel);
        const brace=new T.BoxGeometry(5.9,.075,.075);brace.rotateZ(n%2?-.18:.18);
        mesh(brace,m.steel,west-2.5,y+6.27,p,false);
      }
      // 看台顶棚沿纵向加入轻型钢桁架，补齐照片中最醒目的结构线。
      for(let n=0;n<8;n++) {
        const p=z+(n/7-.5)*standLength;
        box(west-2.5,y+6.66,p,8.7,.08,.08,m.steel);
        box(west-5.25,y+6.02,p,.11,.74,.11,m.steel);
        const diagonal=new T.BoxGeometry(5.9,.065,.065);diagonal.rotateZ(n%2?.18:-.18);
        mesh(diagonal,m.steel,west-2.5,y+6.32,p,false);
      }
      // 看台前缘的连续护栏与立柱，形成照片里可辨认的银色细线。
      for(const [side,face] of [[-1,west],[1,east]]) {
        const railX=face+side*5.05;
        box(railX,y+2.56,z,.075,.82,standLength,m.steel,false);
        for(let n=0;n<=12;n++)box(railX,y+2.42,z+(n/12-.5)*standLength,.09,.62,.09,m.steel,false);
      }
      entry.faces.push({x,z,w,d});entry.top=y+6.8;fieldEntries.push(entry);
    } else if(id==='racing') {
      registerMesh(paving(x,z,w,d,m.asphalt,.18,yaw),entry);
      const color=new T.MeshStandardMaterial({color:0x435c48,roughness:.82});
      const rails=[];
      function fence(a,b,length,alongX){
        const fenceHeight=1.42,thickness=.072,poles=Math.ceil(length/.36);
        for(let i=0;i<=poles;i++){
          const p=(i/poles-.5)*length;
          const size=i%7===0?thickness:.017;
          const pole=new T.BoxGeometry(size,fenceHeight,size);
          pole.translate(a+(alongX?p:0),.18+fenceHeight/2,b+(alongX?0:p));rails.push(pole);
        }
        for(const lift of [.08,.37,.70,1.04,1.38]){
          const rail=new T.BoxGeometry(alongX?length:.026,.027,alongX?.026:length);
          rail.translate(a,.18+lift,b);rails.push(rail);
        }
        const p=sitePoint(x,z,yaw,a,b);
        addCollider(p.x,y+.18,p.z,alongX?length:thickness,fenceHeight,alongX?thickness:length,yaw);
      }
      for(const s of [-1,1])fence(0,s*(d/2-.18),w-.36,true);
      fence(w/2-.18,0,d-.36,false);
      const segment=(d-.36-3.4)/2;
      for(const s of [-1,1])fence(-w/2+.18,s*(1.7+segment/2),segment,false);
      registerMesh(mesh(mergeGeometries(rails).rotateY(yaw),color,x,y,z,false),entry);
      for(const rail of rails)rail.dispose();
      entry.faces.push({x,z,w,d,yaw});entry.top=y+1.6;
    } else if(shape==='court') {
      registerMesh(paving(x,z,w,d,id==='football'?m.pitch:m.blue,.18,yaw),entry);
      for(const xx of [-1,1]){
        const p=sitePoint(x,z,yaw,xx*(w/2-1),0);
        paving(p.x,p.z,.17,d-2,m.line,.25,yaw);
      }
      for(const zz of [-1,0,1]){
        const p=sitePoint(x,z,yaw,0,zz*(d/2-1));
        paving(p.x,p.z,w-2,.17,m.line,.25,yaw);
      }
      entry.faces.push({x,z,w,d,yaw});entry.top=y+.25;
    } else if(shape==='gate') {
      const alongX=w>d, span=alongX?w:d;
      for(const s of [-1,1]){
        const p=sitePoint(x,z,yaw,alongX?s*span/2:0,alongX?0:s*span/2);
        piece(entry,p.x,y,p.z,1.2,3.8,1.2,m.light,{yaw});
      }
      piece(entry,x,y+3.2,z,alongX?span+1:1.5,.6,alongX?1.5:span+1,m.roof,{footprint:false,yaw});
    } else block(entry,x,y,z,w,d,h,floors,material,minor?.72:.45,yaw);
  }
  return {field:fieldEntries[0],roads,walkways};
}

export function distanceToRoad(x,z,road) {
  const {a,b}=road,dx=b.x-a.x,dz=b.z-a.z;
  const t=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz||1)));
  return Math.hypot(x-a.x-t*dx,z-a.z-t*dz);
}
