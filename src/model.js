import { world, outline, inside, height, roadLines, paths, buildings, lakes } from './campus-data.js';

export function buildTerrain({T,mesh,box,m}) {
  const shape=new T.Shape(outline.map(p=>new T.Vector2(p.x,-p.z)));
  const slab=new T.ExtrudeGeometry(shape,{depth:5,bevelEnabled:false});
  slab.rotateX(-Math.PI/2);
  mesh(slab,m.deepGrass,0,-5,0,false);
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
  function ribbon(points,width,material,lift=.24) {
    const raw=points.map(([x,y])=>world(x,y));
    const curve=new T.CatmullRomCurve3(raw.map(p=>new T.Vector3(p.x,0,p.z)),false,'centripetal');
    const count=Math.max(8,Math.ceil(curve.getLength()/2.5)), positions=[];
    for(let i=0;i<=count;i++) {
      const p=curve.getPoint(i/count),tan=curve.getTangent(i/count),nx=-tan.z,nz=tan.x;
      for(const side of [-1,1]) {const x=p.x+nx*width*side/2,z=p.z+nz*width*side/2;positions.push(x,height(x,z)+lift,z);}
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
    for(let i=1;i<raw.length;i++) roads.push({a:raw[i-1],b:raw[i],width:line.width});
  }
  for(const p of paths) ribbon(p,1.45,m.path,.34);
  function lake(points) {
    const shape=new T.Shape(points.map(([x,y])=>{const p=world(x,y);return new T.Vector2(p.x,-p.z);}));
    const geo=new T.ShapeGeometry(shape,20);geo.rotateX(-Math.PI/2);mesh(geo,m.water,0,.35,0,false);
  }
  lakes.forEach(l=>lake(l.points));
  const plaza=world(873,1232); paving(plaza.x,plaza.z,74,35,m.stone,.12);
  const fieldEntries=[];
  for(const spec of buildings) {
    const {name,id,x,z,w,d,floors,kind,shape,minor}=spec;
    const desc=kind==='gate'?'地图标注的校园出入口。门头体量为示意，请以现场开放情况为准。':
      name+'的位置依据所提供的校园地图描绘，建筑层数、外立面与高度为程序化示意。';
    const entry=landmark(name,id,desc,x,z,kind,['main','library','stadium','doorSouth'].includes(id)?0:minor?3:1);
    Object.assign(entry,{id,spec});
    const y=height(x,z), material=kind==='life'?m.dorm:kind==='sport'?m.blue:m.light;
    const h=floors*2.9;
    if(shape==='main') {
      block(entry,x,y,z+6,w,8,h,7,m.wall,1.4);
      for(const offset of [-w*.39,0,w*.39]) block(entry,x+offset,y,z-5,10,d*.86,h,7,m.light,1.3);
      piece(entry,x,y+h,z-5,10,12,9,m.wall);
      piece(entry,x,y+h+12,z-5,11,.8,10,m.light,{solid:false});
      hip(entry,x,y+h+12.8,z-5,10,9,4);
      piece(entry,x,y+h+16.8,z-5,.28,3,.28,m.brass,{solid:false});
    } else if(shape==='library') {
      const geo=new T.CylinderGeometry(1,1,1,56),obj=registerMesh(mesh(geo,m.blue,x,y+h/2,z),entry);obj.scale.set(w/2,h,d/2);
      for(let floor=0;floor<=floors;floor++){const rim=registerMesh(mesh(geo,m.light,x,y+floor*h/floors+.1,z),entry);rim.scale.set(w/2+.5,.4,d/2+.5);}
      const roof=registerMesh(mesh(geo,m.roof,x,y+h+.6,z),entry);roof.scale.set(w/2+.7,.9,d/2+.7);
      entry.faces.push({x,z,w,d});entry.top=y+h+1.1;addCollider(x,y,z,w,h,d);
      block(entry,x-w*.55,y,z+3,9,d*.6,h*.7,3,m.wall);
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
      oval(w*.55,d*.54,m.stone,.13);oval(w/2,d/2,m.track,.2);
      for(let i=0;i<7;i++) {
        const pts=[];for(let j=0;j<=100;j++){const a=j/100*Math.PI*2;pts.push(new T.Vector3(x+Math.cos(a)*(w/2-i*.65),.24,z+Math.sin(a)*(d/2-i*.7)));}
        mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts),100,.045,3,false),m.line,0,0,0,false);
      }
      oval(w/2-5,d/2-7,m.deepGrass,.27);
      registerMesh(paving(x,z,w*.64,d*.66,m.grass,.3),entry);
      for(const xx of [-1,1]) paving(x+xx*w*.32,z,.2,d*.66,m.line,.35);
      for(const zz of [-1,0,1]) paving(x,z+zz*d*.33,w*.64,.2,m.line,.35);
      const ring=new T.RingGeometry(3.8,3.96,40);ring.rotateX(-Math.PI/2);mesh(ring,m.line,x,.37,z,false);
      for(const zz of [-1,1]) {const postZ=z+zz*d*.33;for(const xx of [-1,1])box(x+xx*2,.35,postZ,.15,2.2,.15,m.line);box(x,2.55,postZ,4.2,.15,.15,m.line);}
      for(let i=0;i<3;i++)box(x-w*.53,.15,z,w*.045,1+i*.7,d*.52,m.stone);
      entry.faces.push({x,z,w,d});entry.top=3;fieldEntries.push(entry);
    } else if(shape==='court') {
      registerMesh(paving(x,z,w,d,id==='racing'?m.stone:m.blue,.18),entry);
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
