import { world, outline, inside, height, roadLines, paths, buildings, lakes } from './campus-data.js';
import { buildSouthGate } from './south-gate.js';
import { buildMainAxis } from './main-axis.js';
import { createPhotoBuildingKit, photoBuildings } from './photo-buildings.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export function buildTerrain({T,mesh,box,m}) {
  const shape=new T.Shape(outline.map(p=>new T.Vector2(p.x,-p.z)));
  const slab=new T.ExtrudeGeometry(shape,{depth:5,bevelEnabled:false});
  slab.rotateX(-Math.PI/2);
  mesh(slab,m.deepGrass,0,-5.15,0,false);
  const geo=new T.PlaneGeometry(490,680,122,170); geo.rotateX(-Math.PI/2); geo.translate(-10,0,0);
  const p=geo.attributes.position, colors=new Float32Array(p.count*3), color=new T.Color();
  for(let i=0;i<p.count;i++) {
    const x=p.getX(i),z=p.getZ(i),y=height(x,z); p.setY(i,y);
    color.setHex(y>7?0x73966b:0xa2b689).offsetHSL(0,0,.012*Math.sin(x*.21)*Math.cos(z*.2)); color.toArray(colors,i*3);
  }
  const indices=[];
  const original=geo.index.array;
  for(let i=0;i<original.length;i+=3) {
    const ids=[original[i],original[i+1],original[i+2]];
    if(ids.every(j=>inside(p.getX(j),p.getZ(j)))) indices.push(...ids);
  }
  geo.setIndex(indices); geo.setAttribute('color',new T.BufferAttribute(colors,3)); geo.computeVertexNormals();
  mesh(geo,m.terrain,0,.02,0,false);
  // 海面在图面西侧；没有经纬度与测绘基准，不用场景尺寸推算距离。
  const outside=new T.PlaneGeometry(3000,3000);outside.rotateX(-Math.PI/2);
  mesh(outside,new T.MeshStandardMaterial({color:0xc8d0b9,roughness:1}),0,-5.5,0,false);
  const coastPixels=[[56,-250],[56,143],[112,173],[173,231],[200,305],[218,372],[252,401],[230,474],[218,549],[208,640],[148,724],[80,810],[-15,936],[-300,1400],[-600,2100]];
  const curve=new T.SplineCurve(coastPixels.map(([x,y])=>{const p=world(x,y);return new T.Vector2(p.x,-p.z);}));
  const coast=curve.getPoints(160),sea=new T.Shape();
  sea.moveTo(-1600,1200);sea.lineTo(coast[0].x,coast[0].y);coast.forEach(p=>sea.lineTo(p.x,p.y));sea.lineTo(-1600,-1400);sea.closePath();
  const seaGeo=new T.ShapeGeometry(sea);seaGeo.rotateX(-Math.PI/2);mesh(seaGeo,m.water,0,-5.2,0,false);
}

export function buildCampus(c) {
  const {T,m,mesh,box,disc,paving,landmark,registerMesh,block,piece,hip,roads,addCollider}=c;
  function ribbon(points,width,material,lift=.24,offset=0) {
    const raw=points.map(([x,y])=>world(x,y));
    const curve=new T.CatmullRomCurve3(raw.map(p=>new T.Vector3(p.x,0,p.z)),false,'centripetal');
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
    return raw;
  }
  for(const line of roadLines) {
    const raw=ribbon(line.points,line.width+1.4,m.curb,.2);ribbon(line.points,line.width,m.asphalt,.29);
    const marked=line.width>=4.8&&!line.name.includes('中轴')&&!line.name.includes('主楼前');
    if(marked) {
      ribbon(line.points,.105,m.roadYellow,.355);
      const edge=Math.max(1.55,line.width/2-.32);
      ribbon(line.points,.07,m.roadWhite,.35,edge);ribbon(line.points,.07,m.roadWhite,.35,-edge);
    }
    for(let i=1;i<raw.length;i++) roads.push({a:raw[i-1],b:raw[i],width:line.width});
  }
  // 南门照片里的主路有连续浅色人行带。把同样的窄铺装延伸到环山路、
  // 学子路和体育场周边，路缘与坡面之间形成清晰的步行尺度。
  const sidewalkRows=new Set(['环山路','学子路','学子林北路','东侧道路','主楼东路','体育场东路','体育场南路','南门道路']);
  for(const line of roadLines) {
    if(!sidewalkRows.has(line.name))continue;
    const sidewalkWidth=line.width>5?1.25:1.05;
    const offset=line.width/2+1.12;
    ribbon(line.points,sidewalkWidth,m.path,.37,offset);
    ribbon(line.points,sidewalkWidth,m.path,.37,-offset);
  }
  for(const p of paths) ribbon(p,1.45,m.path,.34);
  function lake(points,smooth=false) {
    let polygon=points.map(([x,y])=>{const p=world(x,y);return new T.Vector2(p.x,-p.z);});
    if(smooth){const curve=new T.CatmullRomCurve3(polygon.map(p=>new T.Vector3(p.x,0,-p.y)),true,'centripetal');polygon=curve.getPoints(100).map(p=>new T.Vector2(p.x,-p.z));
      mesh(new T.TubeGeometry(curve,100,.13,6,true),m.stone,0,.46,0,false);}
    const shape=new T.Shape(polygon);
    const geo=new T.ShapeGeometry(shape,20);geo.rotateX(-Math.PI/2);mesh(geo,m.water,0,.35,0,false);
  }
  lakes.forEach(l=>lake(l.points,l.smooth));

  // 学子餐厅后方的照片可见一条红砖步道和连续白栏杆。它们与坡面共用
  // height(x,z)，栏杆分段贴地，避免在起伏草坡上出现悬空的直线。
  const hillWalk=[[570,790],[612,762],[664,746],[720,748],[778,763],[838,778],[900,783]];
  ribbon(hillWalk,1.9,m.path,.32);
  const fencePoints=[[600,735],[670,715],[745,720],[820,742],[900,770]].map(([px,pz])=>world(px,pz));
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
    const {name,id,x,z,w,d,floors,kind,shape,minor}=spec;
    const photo=photoBuildings[id];
    const desc=photo?`按实景照片补充${photo.detail}。位置参照校园地图，朝向与比例为场景估计。`:id==='stadium'?'按照片补充西侧有顶看台、屋架和对侧露天看台，保留跑道与球场。':id==='main'?'依据实景与航拍照片细化：正面与两翼前庭朝向南门，塔冠、窗框、巨柱和入口雨棚采用独立构件。主楼、双排弧形柱廊、校训石与南门保持同一中轴；比例为照片估计。':id==='doorSouth'?'依据三张实景照片细化：中央大拱、两侧门廊、槽纹立柱、叠层檐口与校名牌匾。铁艺门保持敞开，可从门前走入校园；尺寸为照片估计。':kind==='gate'?'地图标注的校园出入口。门头体量为示意，请以现场开放情况为准。':
      name+'的位置依据所提供的校园地图描绘，建筑层数、外立面与高度为程序化示意。';
    const detail=id==='racing'?'按汽车训练场照片补充深色铺装、透空绿围网和侧边入口。':desc;
    const entry=landmark(name,id,detail,x,z,kind,['main','library','stadium','doorSouth'].includes(id)?0:minor?3:1);
    Object.assign(entry,{id,spec});
    const y=height(x,z), material=kind==='life'?m.dorm:kind==='sport'?m.blue:m.light;
    const h=floors*2.9;
    if(id==='doorSouth') {
      buildSouthGate(c,entry);
    } else if(shape==='main') {
      buildMainAxis(c,entry);
    } else if(photo) {
      buildPhotoBuilding(entry,y);
    } else if(shape==='ning' || shape==='courtyard' || shape==='research') {
      const wing=Math.min(8,w*.22);
      block(entry,x,y,z-d/2+wing/2,w,wing,h,floors,material);
      block(entry,x,y,z+d/2-wing/2,w,wing,h,floors,material);
      block(entry,x-w/2+wing/2,y,z,wing,d,h,floors,material);
      if(shape!=='ning') block(entry,x+w/2-wing/2,y,z,wing,d*.78,h,floors,material);
      if(shape==='research') block(entry,x,y,z,w*.4,d*.3,h*.65,3,m.blue);
    } else if(shape==='stadium') {
      function oval(rx,rz,material,lift) {
        const geo=new T.CircleGeometry(1,90);geo.rotateX(-Math.PI/2);
        const obj=registerMesh(mesh(geo,material,x,y+lift,z,false),entry);obj.scale.set(rx,1,rz);return obj;
      }
      oval(w*.56,d*.55,m.stone,.13);oval(w/2,d/2,m.track,.2);
      for(let i=0;i<7;i++) {
        const pts=[];for(let j=0;j<=100;j++){const a=j/100*Math.PI*2;pts.push(new T.Vector3(x+Math.cos(a)*(w/2-i*.65),y+.24,z+Math.sin(a)*(d/2-i*.7)));}
        mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts),100,.045,3,false),m.line,0,0,0,false);
      }
      oval(w/2-5,d/2-7,m.deepGrass,.27);
      registerMesh(paving(x,z,w*.64,d*.66,m.grass,.3),entry);
      // 绿茵场线、球门和角旗让运动场从远处也能被识别成足球场。
      for(const xx of [-1,1])paving(x+xx*w*.32,z,.16,d*.66,m.line,.35);
      for(const zz of [-1,0,1])paving(x,z+zz*d*.33,w*.64,.16,m.line,.35);
      paving(x,z-d*.22,w*.19,.12,m.line,.36);paving(x,z+d*.22,w*.19,.12,m.line,.36);
      const ring=new T.RingGeometry(3.8,3.96,40);ring.rotateX(-Math.PI/2);mesh(ring,m.line,x,y+.37,z,false);
      for(const zz of [-1,1]) {
        const postZ=z+zz*d*.33;
        for(const xx of [-1,1])box(x+xx*2,y+.35,postZ,.15,2.2,.15,m.line);
        box(x,y+2.55,postZ,4.2,.15,.15,m.line);
        box(x,y+1.55,postZ,4.2,.07,.07,m.line);
      }
      for(const [xx,zz] of [[-1,-1],[-1,1],[1,-1],[1,1]]) {
        box(x+xx*w*.32,y+.34,z+zz*d*.33,.06,.62,.06,m.brass);
        const flag=new T.ConeGeometry(.18,.26,4);flag.rotateZ(Math.PI/2);mesh(flag,m.seatRed,x+xx*w*.32+xx*.09,y+1.03,z+zz*d*.33,false);
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
      registerMesh(paving(x,z,w,d,m.asphalt,.18),entry);
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
        addCollider(x+a,y+.18,z+b,alongX?length:thickness,fenceHeight,alongX?thickness:length);
      }
      for(const s of [-1,1])fence(0,s*(d/2-.18),w-.36,true);
      fence(w/2-.18,0,d-.36,false);
      const segment=(d-.36-3.4)/2;
      for(const s of [-1,1])fence(-w/2+.18,s*(1.7+segment/2),segment,false);
      registerMesh(mesh(mergeGeometries(rails),color,x,y,z,false),entry);
      for(const rail of rails)rail.dispose();
      entry.faces.push({x,z,w,d});entry.top=y+1.6;
    } else if(shape==='court') {
      registerMesh(paving(x,z,w,d,m.blue,.18),entry);
      for(const xx of [-1,1])paving(x+xx*(w/2-1),z,.17,d-2,m.line,.25);
      for(const zz of [-1,0,1])paving(x,z+zz*(d/2-1),w-2,.17,m.line,.25);
      entry.faces.push({x,z,w,d});entry.top=1;
    } else if(shape==='gate') {
      const alongX=w>d, span=alongX?w:d;
      for(const s of [-1,1])piece(entry,x+(alongX?s*span/2:0),y,z+(alongX?0:s*span/2),1.7,5.2,1.7,m.light);
      piece(entry,x,y+4,z,alongX?span+2:2,1.2,alongX?2:span+2,m.roof,{footprint:false});
    } else block(entry,x,y,z,w,d,h,floors,material);
  }
  return {field:fieldEntries[0]};
}

export function distanceToRoad(x,z,road) {
  const {a,b}=road,dx=b.x-a.x,dz=b.z-a.z;
  const t=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz||1)));
  return Math.hypot(x-a.x-t*dx,z-a.z-t*dz);
}
