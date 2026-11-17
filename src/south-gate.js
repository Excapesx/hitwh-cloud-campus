import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { surfaceMaterial } from './realism.js';
import { gateScale, campusAxis, gatePoint } from './campus-data.js';

// 尺寸为依据三张照片估计的场景比例，不作为实测尺寸。
// 将通道与实心部分分开登记，拱顶的拾取包围盒不会堵住地面通行。
export const southGateSolids = [
  ...[-13.2,-6.4,6.4,13.2].map(x=>({x,y:0,z:0,w:1.7,h:7.1,d:4.9})),
  ...[-17.8,17.8].map(x=>({x,y:0,z:-.3,w:7.6,h:6.2,d:6.4})),
  {x:0,y:7.05,z:0,w:12.4,h:5.9,d:5.1},
  ...[-9.8,9.8].map(x=>({x,y:5.95,z:0,w:6.8,h:6.7,d:5.1}))
].map(s=>Object.fromEntries(Object.entries(s).map(([key,value])=>[key,value*gateScale])));

export function buildSouthGate({T,mesh,registerMesh,addCollider},entry) {
  const materials={
    wall:surfaceMaterial(T,'plaster',{color:0xd1b786,roughness:.91}),
    trim:surfaceMaterial(T,'stone',{color:0xe5dfca,roughness:.68}),
    shade:surfaceMaterial(T,'stone',{color:0xb49b74,roughness:.89}),
    column:surfaceMaterial(T,'stone',{color:0xc9b58d,roughness:.73}),
    iron:surfaceMaterial(T,'metal',{color:0x263331,roughness:.35,metalness:.7}),
    glass:new T.MeshPhysicalMaterial({color:0x587781,roughness:.12,metalness:0,clearcoat:1,clearcoatRoughness:.08,ior:1.5}),
    road:surfaceMaterial(T,'asphalt',{color:0x434947,roughness:.93}),
    paving:surfaceMaterial(T,'paving',{color:0xd4cfbb,roughness:.83}),
    white:new T.MeshStandardMaterial({color:0xf1eee1,roughness:.8}),
    lamp:new T.MeshStandardMaterial({color:0xf1eee1,roughness:.55}),
    yellow:new T.MeshStandardMaterial({color:0xd8b759,roughness:.85}),
    red:new T.MeshStandardMaterial({color:0xaf5541,roughness:.8}),
    hedge:new T.MeshStandardMaterial({color:0x536e43,roughness:1}),
    steel:surfaceMaterial(T,'metal',{color:0xc6cecc,roughness:.26,metalness:.78})
  };
  materials.lamp.userData.nightLamp=true;
  const buckets=new Map();
  function emit(geometry,material,transform,cast=true) {
    const geo=geometry.index?geometry.toNonIndexed():geometry;
    if(transform)geo.applyMatrix4(transform);
    const key=material.uuid+cast;
    if(!buckets.has(key))buckets.set(key,{material,cast,parts:[]});
    buckets.get(key).parts.push(geo);
  }
  function block(x,y,z,w,h,d,material,cast=true) {
    const radius=Math.min(.045,h*.16,d*.08,w*.08);
    const geo=cast?new RoundedBoxGeometry(w,h,d,1,radius):new T.BoxGeometry(w,h,d);geo.translate(x,y+h/2,z);emit(geo,material,null,cast);
  }
  function cylinder(x,y,z,lower,upper,h,material,segments=28) {
    const geo=new T.CylinderGeometry(upper,lower,h,segments);geo.translate(x,y+h/2,z);emit(geo,material);
  }
  function rod(a,b,r,material,transform) {
    const start=new T.Vector3(...a),end=new T.Vector3(...b),delta=end.clone().sub(start);
    const geo=new T.CylinderGeometry(r,r,delta.length(),8);
    geo.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize()));
    geo.translate(...start.add(end).multiplyScalar(.5).toArray());emit(geo,material,transform);
  }
  function curve(points,r,material,transform) {
    const line=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)));
    emit(new T.TubeGeometry(line,Math.max(16,points.length*3),r,8,false),material,transform);
  }
  function arch(cx,half,spring,rise,top,depth,material) {
    const shape=new T.Shape();shape.moveTo(cx-half,spring);
    shape.quadraticCurveTo(cx,spring+rise*2,cx+half,spring);
    shape.lineTo(cx+half,top);shape.lineTo(cx-half,top);shape.closePath();
    const geo=new T.ExtrudeGeometry(shape,{depth,steps:1,curveSegments:28,bevelEnabled:false});
    geo.translate(0,0,-depth/2);emit(geo,material);
  }
  function archRim(cx,half,spring,rise,z,r,material) {
    const pts=[];
    for(let i=0;i<=40;i++){const t=i/40;pts.push([cx-half+2*half*t,spring+4*rise*t*(1-t),z]);}
    curve(pts,r,material);
  }
  // 左右门卫翼房、下部门廊与上部连续立面。
  for(const side of [-1,1]) {
    const x=side*17.8;
    block(x,0,-.3,7.6,5.8,6.4,materials.wall);
    block(x,.2,-.3,7.85,.42,6.65,materials.trim);
    block(x,4.35,-.3,7.85,.18,6.65,materials.trim);
    block(x,5.65,-.3,8.05,.28,6.9,materials.trim);
    block(x,5.93,-.3,8.25,.16,7.1,materials.trim);
    for(const band of [4.75,5.15])block(x,band,2.94,7.55,.07,.08,materials.shade,false);
    for(const wx of [x-1.65,x+1.65]) {
      block(wx,1.3,2.94,1.22,2.1,.16,materials.trim);
      block(wx,1.45,3.04,.86,1.78,.04,materials.glass);
      block(wx,2.36,3.08,.88,.08,.05,materials.trim);
      block(wx,.99,3.02,1.42,.16,.3,materials.trim);
      const cap=new T.SphereGeometry(.64,18,8,0,Math.PI*2,0,Math.PI/2);cap.scale(1,.38,.12);cap.translate(wx,3.42,3.02);emit(cap,materials.trim);
    }
    arch(side*9.8,3.4,4.65,1.4,7.1,5.1,materials.wall);
    for(const z of [-2.61,2.61])archRim(side*9.8,3.35,4.66,1.4,z,.13,materials.trim);
    block(side*9.8,7.06,0,8.3,.28,5.7,materials.trim);
    block(side*9.8,7.34,0,8.7,.19,6.05,materials.trim);
    block(side*9.8,7.53,0,8.35,.12,5.7,materials.shade);
    block(side*10,7.6,0,8,4.5,4.8,materials.wall);
    // 照片上的三联竖向装饰框和上方方形浮雕，不当作玻璃窗。
    for(const px of [side*8.5,side*10,side*11.5]) {
      block(px,10.85,2.46,.87,.75,.13,materials.trim);
      block(px,8.15,2.46,.87,2.32,.13,materials.trim);
      block(px,8.32,2.55,.55,1.98,.03,materials.shade);
    }
  }
  arch(0,6.4,7.05,2.05,12.1,4.8,materials.wall);
  for(const z of [-2.48,2.48]) {
    archRim(0,6.42,7.03,2.08,z,.18,materials.trim);
    archRim(0,6.58,7.16,2.18,z,.07,materials.shade);
  }
  // 槽纹下柱、柱础与叠层柱头。
  for(const x of [-13.2,-6.4,6.4,13.2]) {
    for(const z of [-2.07,2.07]) {
      block(x,.08,z,1.65,.24,1.65,materials.trim);
      cylinder(x,.32,z,.76,.72,.25,materials.column);
      cylinder(x,.57,z,.66,.59,.3,materials.trim);
      const shaft=new T.CylinderGeometry(.47,.61,5.35,64,12),p=shaft.attributes.position;
      for(let i=0;i<p.count;i++) {
        const px=p.getX(i),pz=p.getZ(i),angle=Math.atan2(pz,px),factor=1+.047*Math.cos(angle*16);
        p.setX(i,px*factor);p.setZ(i,pz*factor);
      }
      shaft.computeVertexNormals();shaft.translate(x,3.545,z);emit(shaft,materials.column);
      cylinder(x,6.22,z,.5,.64,.23,materials.trim);
      cylinder(x,6.45,z,.65,.76,.25,materials.trim);
      block(x,6.7,z,1.65,.27,1.65,materials.trim);
    }
    // 上层细柱，与下层四条柱轴对应。
    const z=2.61;
    cylinder(x,7.63,z,.51,.45,.19,materials.trim);
    cylinder(x,7.82,z,.4,.32,3.84,materials.trim);
    cylinder(x,11.66,z,.35,.51,.2,materials.trim);
    block(x,11.86,z,1.06,.19,1.04,materials.trim);
  }
  for(const [y,w,h,d] of [[12.08,28.4,.18,5.35],[12.26,28.9,.26,5.65],[12.52,29.4,.18,5.95],[12.7,29.7,.12,6.2]])block(0,y,0,w,h,d,materials.trim);
  for(const x of [-12,-8,-4,0,4,8,12])cylinder(x,12.82,-1.55,.025,.02,1.55,materials.steel,6);

  // 程序化校名牌匾。没有把照片中的人物、广告字或水印贴到建筑上。
  const signCanvas=document.createElement('canvas');signCanvas.width=2048;signCanvas.height=288;
  const ctx=signCanvas.getContext('2d');ctx.fillStyle='#d5dbd7';ctx.fillRect(0,0,2048,288);
  ctx.strokeStyle='#a28e6d';ctx.lineWidth=12;ctx.strokeRect(7,7,2034,274);
  ctx.font='700 205px "KaiTi","STKaiti","楷体",serif';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.shadowColor='#f4e5bd';ctx.shadowOffsetX=-2;ctx.shadowOffsetY=-3;ctx.shadowBlur=1;ctx.fillStyle='#725733';ctx.fillText('哈尔滨工业大学',1024,153,1840);
  const texture=new T.CanvasTexture(signCanvas);texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=4;
  const signMat=new T.MeshStandardMaterial({map:texture,bumpMap:texture,bumpScale:.018,roughness:.5,metalness:.12});
  block(0,10.13,2.48,11.7,1.73,.15,materials.shade);
  const sign=new T.PlaneGeometry(11.45,1.54);sign.translate(0,10.995,2.568);emit(sign,signMat);

  // 两扇铁艺门向校园内敞开，保留可步行穿越的中央通道。
  for(const side of [-1,1]) {
    const transform=new T.Matrix4().makeTranslation(side*5.7,0,-.1).multiply(new T.Matrix4().makeRotationY(-side*Math.PI*.43));
    const local=u=>-side*u,top=u=>2.85+1.45*Math.sin(u/5.5*Math.PI/2);
    for(const y of [.45,1.25,2.45])rod([0,y,0],[local(5.5),y,0],.065,materials.iron,transform);
    for(let u=0;u<=5.51;u+=.34)rod([local(u),.35,0],[local(u),top(u),0],.035,materials.iron,transform);
    for(const offset of [0,-.36])curve(Array.from({length:20},(_,i)=>{const u=i/19*5.5;return [local(u),top(u)+offset,0];}),.075,materials.iron,transform);
    for(let u=.45;u<5.5;u+=.7) {
      const ring=new T.TorusGeometry(.16,.025,6,16);ring.translate(local(u),top(u)+.13,0);emit(ring,materials.iron,transform);
    }
  }
  // 南门前的车行铺装、双黄线、斜纹分流区及人行道。
  block(0,-5.5/gateScale,7,33,5.5/gateScale+.15,46,materials.shade,false);
  block(0,.15,7,24,.12,46,materials.road,false);
  for(const side of [-1,1]) {
    block(side*14,.15,7,4,.15,46,materials.paving,false);
    block(side*12,.16,7,.22,.32,46,materials.trim,false);
    block(side*10.8,.287,7,.13,.018,45,materials.white,false);
    block(side*.18,.287,7,.1,.018,45,materials.yellow,false);
    for(let z=8;z<29;z+=2.2) {
      const stripe=new T.BoxGeometry(3.8,.02,.13);stripe.rotateY(side*.48);stripe.translate(side*8.3,.29,z);emit(stripe,materials.white,null,false);
    }
    // 双臂路灯，参考日间照片的银白灯杆。
    const lx=side*14.5,lz=12;
    cylinder(lx,.31,lz,.2,.12,10.2,materials.steel,12);
    rod([lx,9.8,lz],[lx-side*1.9,10.5,lz],.09,materials.steel);
    rod([lx,7.8,lz],[lx+side*1.45,8.35,lz],.08,materials.steel);
    block(lx-side*2.12,10.43,lz,1.35,.17,.48,materials.lamp);
    block(lx+side*1.6,8.28,lz,1.15,.15,.42,materials.lamp);
    for(const z of [16,23]) {
      block(side*7.25,.3,z,.72,.1,.72,materials.iron,false);
      cylinder(side*7.25,.4,z,.29,.065,.85,materials.red,16);
      cylinder(side*7.25,.73,z,.2,.145,.18,materials.white,16);
    }
    block(side*20.5,.2,10,2.4,.42,16,materials.trim,false);
    block(side*20.5,.62,10,2.05,.8,15.5,materials.hedge);
  }
  // 让临街铺装渐降接回周边地面，近景中不出现展示底座的垂直断面。
  function apronRamp(left,right,material,lift) {
    const geo=new T.PlaneGeometry(right-left,55,1,36);geo.rotateX(-Math.PI/2);
    const p=geo.attributes.position;
    for(let i=0;i<p.count;i++) {
      const z=p.getZ(i)+57.5,t=(z-30)/55,s=t*t*(3-2*t);
      p.setXYZ(i,p.getX(i)+(left+right)/2,.27-(.27+5.5/gateScale)*s+lift,z);
    }
    geo.computeVertexNormals();emit(geo,material,null,false);
  }
  apronRamp(-16.5,16.5,materials.paving,0);
  apronRamp(-12,12,materials.road,.015);
  const c=Math.cos(campusAxis.yaw),s=Math.abs(Math.sin(campusAxis.yaw));
  for(const solid of southGateSolids) {
    const p=gatePoint(solid.x,solid.z);
    addCollider(p.x,solid.y,p.z,c*solid.w+s*solid.d,solid.h,c*solid.d+s*solid.w);
  }
  entry.faces.push({x:entry.x,z:entry.z,w:(c*43.2+s*6.4)*gateScale,d:(c*6.4+s*43.2)*gateScale});entry.top=14.37*gateScale;
  for(const {material,cast,parts} of buckets.values()) {
    const merged=mergeGeometries(parts,false);
    merged.scale(gateScale,gateScale,gateScale);
    merged.rotateY(campusAxis.yaw);
    registerMesh(mesh(merged,material,entry.x,0,entry.z,cast),entry);
    parts.forEach(p=>p.dispose());
  }
}
