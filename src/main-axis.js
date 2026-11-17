import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { campusAxis } from './campus-data.js';
import { surfaceMaterial } from './realism.js';

// 本地 +Z 是朝向南门的正面；两翼向 +Z 围合前庭，不再向背面伸出。
export const mainBuildingSolids=[
  {x:0,z:-5,w:52.75,d:9,h:18.4},
  {x:0,z:-2.5,w:11.5,d:10,h:20.3},
  ...[-1,1].map(side=>({x:side*26.3,z:7.7,w:8.2,d:26,h:16.1}))
];

export function buildMainAxis({T,mesh,registerMesh,addCollider,m},entry) {
  const stone=surfaceMaterial(T,'stone',{color:0xe1e5dc,roughness:.78});
  const trim=surfaceMaterial(T,'stone',{color:0xf0eee0,roughness:.66});
  const recess=surfaceMaterial(T,'stone',{color:0xb8c4bd,roughness:.84});
  const glass=new T.MeshStandardMaterial({color:0x365b50,roughness:.28,metalness:.14});glass.userData.nightWindow=true;
  const glow=new T.MeshStandardMaterial({color:0xe4dcc2,roughness:.7});glow.userData.nightOutline=true;
  stone.userData.nightFacade=true;trim.userData.nightFacade=true;
  const granite=surfaceMaterial(T,'paving',{color:0xbcbfb3,roughness:.87});
  const rock=surfaceMaterial(T,'stone',{color:0xc4ad7e,roughness:.97});
  const metal=surfaceMaterial(T,'metal',{color:0x6b776e,metalness:.7,roughness:.4});
  const buckets=new Map(),yaw=campusAxis.yaw;
  function emit(geometry,material,cast=true,selectable=true) {
    const geo=geometry.index?geometry.toNonIndexed():geometry;
    const key=`${material.uuid}-${cast}-${selectable}`;
    if(!buckets.has(key))buckets.set(key,{material,cast,selectable,parts:[]});
    buckets.get(key).parts.push(geo);
    if(geo!==geometry)geometry.dispose();
  }
  function block(x,y,z,w,h,d,material=stone,cast=true,selectable=true,bevel=0) {
    const geo=bevel?new RoundedBoxGeometry(w,h,d,1,Math.min(bevel,w*.1,h*.2,d*.1)):new T.BoxGeometry(w,h,d);
    geo.translate(x,y+h/2,z);emit(geo,material,cast,selectable);
  }
  function cylinder(x,y,z,r,h,material=trim,rTop=r,segments=20,selectable=true) {
    const geo=new T.CylinderGeometry(rTop,r,h,segments);geo.translate(x,y+h/2,z);emit(geo,material,true,selectable);
  }
  function worldSolid(x,y,z,w,h,d) {
    const p=campusAxis.at(z,x),cos=Math.cos(yaw),sin=Math.abs(Math.sin(yaw));
    addCollider(p.x,y,p.z,Math.abs(cos)*w+sin*d,h,Math.abs(cos)*d+sin*w);
  }
  function cornice(x,y,z,w,d,selectable=true) {
    for(const [lift,expand,thick] of [[0,.25,.16],[.16,.65,.18],[.34,.9,.12]])block(x,y+lift,z,w+expand,thick,d+expand,trim,true,selectable);
    block(x,y+.44,z,w+.95,.07,d+.95,glow,false,selectable);
  }
  function window(x,y,z,w,h,side=0) {
    // side 0: 正反面；side ±1: 侧立面。窗框与窗格分材质合批。
    if(side===0) {block(x,y,z,w+.18,h+.16,.16,recess);block(x,y+.07,z+.09,w,h-.02,.07,glass);}
    else {block(x,y,z,.16,h+.16,w+.18,recess);block(x+side*.09,y+.07,z,.07,h-.02,w,glass);}
  }
  function facade(x,z,w,rows,cols,h) {
    for(let row=0;row<rows;row++)for(let c=0;c<cols;c++)window(x+(c-(cols-1)/2)*(w/cols),.75+row*h/rows,z,Math.min(1.18,w/cols*.56),h/rows*.58);
  }
  function pediment(x,y,z,w,rise,selectable=true) {
    const shape=new T.Shape();shape.moveTo(-w/2,0);shape.lineTo(0,rise);shape.lineTo(w/2,0);shape.closePath();
    const geo=new T.ExtrudeGeometry(shape,{depth:.28,bevelEnabled:false});geo.translate(x,y,z);emit(geo,trim,true,selectable);
    block(x,y-.12,z+.12,w+.45,.19,.58,trim,true,selectable);
  }
  function lunette(x,y,z,w,rise) {
    const shape=new T.Shape();shape.moveTo(w/2,0);shape.absellipse(0,0,w/2,rise,0,Math.PI,false);shape.closePath();
    const geo=new T.ShapeGeometry(shape,18);geo.translate(x,y,z);emit(geo,glass);
    const points=Array.from({length:25},(_,i)=>{const a=i/24*Math.PI;return new T.Vector3(x+Math.cos(a)*w/2,y+Math.sin(a)*rise,z+.045);});
    emit(new T.TubeGeometry(new T.CatmullRomCurve3(points),24,.055,5,false),trim);
    block(x,y,z+.07,.075,rise,.08,trim);
  }
  function column(x,y,z,h,r=.25,selectable=true) {
    block(x,y,z,r*3.1,.18,r*3.1,trim,true,selectable);
    cylinder(x,y+.18,z,r*1.35,.2,trim,r*1.16,20,selectable);
    const shaft=new T.CylinderGeometry(r*.85,r,h-.85,32,1);
    const p=shaft.attributes.position;
    for(let i=0;i<p.count;i++){const a=Math.atan2(p.getZ(i),p.getX(i)),f=1+.045*Math.cos(a*16);p.setX(i,p.getX(i)*f);p.setZ(i,p.getZ(i)*f);}
    shaft.computeVertexNormals();shaft.translate(x,y+.38+(h-.85)/2,z);emit(shaft,trim,true,selectable);
    cylinder(x,y+h-.47,z,r*1.12,.23,trim,r*1.4,20,selectable);
    block(x,y+h-.24,z,r*3.2,.24,r*3.2,trim,true,selectable);
  }
  function sign(text,w,h,color='#6e5540',background=null) {
    const canvas=document.createElement('canvas');canvas.width=2048;canvas.height=Math.round(2048*h/w);
    const ctx=canvas.getContext('2d');if(background){ctx.fillStyle=background;ctx.fillRect(0,0,canvas.width,canvas.height);}
    ctx.fillStyle=color;ctx.font=`700 ${Math.round(canvas.height*.73)}px "KaiTi","STKaiti","楷体",serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,1024,canvas.height*.53,1920);
    const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=4;
    return new T.MeshStandardMaterial({map:texture,transparent:!background,alphaTest:.02,roughness:.88,polygonOffset:true,polygonOffsetFactor:-1});
  }

  // 主体：浅色平屋面，横向主翼在后、两侧翼向南延伸。
  for(const s of mainBuildingSolids) {
    block(s.x,0,s.z,s.w,s.h,s.d,stone);worldSolid(s.x,0,s.z,s.w,s.h,s.d);
    const p=campusAxis.at(s.z,s.x),c=Math.cos(yaw),sin=Math.abs(Math.sin(yaw));
    entry.faces.push({x:p.x,z:p.z,w:Math.abs(c)*s.w+sin*s.d,d:Math.abs(c)*s.d+sin*s.w});
    cornice(s.x,s.h,s.z,s.w,s.d);
  }
  for(const side of [-1,1]) {
    const x=side*26.3;
    facade(x,20.78,7,6,4,15.5);facade(side*15,-.43,16.8,6,8,16.2);
    for(const sx of [-1,1])for(let row=0;row<6;row++)for(let col=0;col<11;col++)window(x+sx*4.15,.75+row*2.56,-3.5+col*2.25,1.15,1.5,sx);
    for(let i=0;i<4;i++)column(x+(i-1.5)*1.7,8.2,21,7,.19);
    pediment(x,16.65,20.95,8.1,1.35);
    for(let i=0;i<5;i++)lunette(side*7.8+side*i*3.05,16.12,-.35,2.6,1.05);
    // 一层拱窗与顶层分段饰面，正面长翼不再使用坡屋顶。
    for(let i=0;i<8;i++)lunette(side*7.2+side*i*2.0,.85,-.31,1.5,1.4);
    for(let i=0;i<9;i++)block(side*(7.1+i*2.17),16,-.21,.13,2.4,.24,trim);
  }
  facade(0,2.57,10.1,7,5,19.5);
  facade(0,-9.58,50,7,24,17.5);
  // 主楼中央巨柱、三角山花、入口雨棚与校名。
  for(const x of [-3.25,-1.1,1.1,3.25])column(x,10.15,2.96,8.9,.23);
  block(0,9.7,3.15,9.5,.42,1.08,trim);pediment(0,20.05,2.94,11.2,1.65);
  block(0,.25,3.05,6.8,3.6,.22,glass);
  block(0,4.3,5.05,15.7,.42,5.8,trim);block(0,4.65,5.05,16.1,.18,6.1,glow,false);
  for(const x of [-6.9,-4.5,4.5,6.9])column(x,.45,7.2,3.85,.23);
  block(0,4.76,7.96,7.8,1.04,.13,trim);
  const name=new T.PlaneGeometry(7.55,.92);name.translate(0,5.26,8.04);emit(name,sign('哈尔滨工业大学',7.55,.92),false);
  // 台阶保持真实层次，另留两侧可平面漫游的通道。
  for(let i=0;i<9;i++)block(0,.025*i,10.8-i*.35,43-i*.3,.12,1.1,granite,false);

  // 逐层收分的塔楼、角部尖饰、镂空灯笼冠与细长天线。
  block(0,20.76,-2.7,11.6,.74,10.8,stone);
  for(const [y,w,d,h,rows,cols] of [[21.5,10.6,9.8,5.6,3,5],[27.8,7.25,7.3,5.35,3,3]]) {
    block(0,y,-2.7,w,h,d,stone);
    for(let row=0;row<rows;row++)for(let col=0;col<cols;col++) {
      const xx=(col-(cols-1)/2)*(w-1.4)/cols;
      window(xx,y+.65+row*(h-1)/rows,-2.7+d/2+.08,.85,1.15);
      window(xx,y+.65+row*(h-1)/rows,-2.7-d/2-.1,.85,1.15);
    }
    for(const side of [-1,1])for(let row=0;row<rows;row++)for(let col=0;col<3;col++)window(side*(w/2+.05),y+.65+row*(h-1)/rows,-2.7+(col-1)*(d-1.5)/3,.85,1.15,side);
    cornice(0,y+h,-2.7,w,d);
    for(const xx of [-1,1])for(const zz of [-1,1]) {
      const px=xx*(w/2-.12),pz=-2.7+zz*(d/2-.1);
      cylinder(px,y+h+.45,pz,.22,.6,trim,.18,12);cylinder(px,y+h+1.05,pz,.25,.8,trim,0,12);
    }
  }
  cylinder(0,33.65,-2.7,1.55,.5,trim,1.65,12);
  cylinder(0,34.15,-2.7,1.25,2.7,recess,.65,8);
  for(let i=0;i<8;i++){const a=i*Math.PI/4;column(Math.cos(a)*.9,34.35,-2.7+Math.sin(a)*.9,2.4,.1);}
  cylinder(0,36.85,-2.7,1.38,.25,trim,1.3,16);cylinder(0,37.1,-2.7,1.0,.75,metal,.15,16);
  cylinder(0,37.85,-2.7,.09,6.1,metal,.025,10);
  for(const y of [38.1,39.3,40.8,42.4])cylinder(0,y,-2.7,.18,.13,glow,.18,12);
  entry.top=44;

  // 前庭铺装、两侧种植带。整条轴线统一局部坐标，入口、廊、石、门共线。
  block(0,.035,26,63,.13,42,granite,false,false);
  for(const side of [-1,1]) {
    block(side*21,.18,28,11,.18,18,trim,false,false);
    block(side*21,.37,28,10.3,.16,17.4,m.grass,false,false);
    for(const z of [20,35])block(side*21,.55,z,9.7,.72,1.2,m.needles,false,false);
  }
  // 弧形柱廊：正中留两柱之间的开口，保留从南门望向塔楼的视线。
  const radius=23,arc=1.18,count=12;
  const arcPoint=a=>({x:Math.sin(a)*radius,z:campusAxis.colonnade+radius*(Math.cos(a)-1)});
  for(let i=0;i<count;i++) {
    const a=-arc+2*arc*i/(count-1),p=arcPoint(a);
    column(p.x,.28,p.z,8.15,.37,false);worldSolid(p.x,.28,p.z,1.2,8.15,1.2);
  }
  function arcBand(y,h,halfWidth,material) {
    const shape=new T.Shape(),n=72;
    for(let i=0;i<=n;i++){const a=-arc+2*arc*i/n,r=radius+halfWidth,x=Math.sin(a)*r,z=campusAxis.colonnade-radius+Math.cos(a)*r;i?shape.lineTo(x,-z):shape.moveTo(x,-z);}
    for(let i=n;i>=0;i--){const a=-arc+2*arc*i/n,r=radius-halfWidth,z=campusAxis.colonnade-radius+Math.cos(a)*r;shape.lineTo(Math.sin(a)*r,-z);}
    shape.closePath();const geo=new T.ExtrudeGeometry(shape,{depth:h,bevelEnabled:false});geo.rotateX(-Math.PI/2);geo.translate(0,y,0);emit(geo,material,true,false);
  }
  arcBand(.13,.15,1.2,granite);arcBand(8.43,.88,.9,stone);arcBand(9.31,.18,1.05,trim);arcBand(9.48,.075,1.1,glow);
  for(const side of [-1,1]) {
    const p=arcPoint(side*arc);block(p.x,.25,p.z,2.5,.3,3,trim,false,false);
  }
  // 廊下中轴步道与南门大道相接；校训石位于加宽的分流岛上。
  block(0,.19,53.8,6.4,.08,22,granite,false,false);
  const island=new T.CylinderGeometry(1,1,.13,64);island.scale(9,.9,6.8);island.translate(0,.18,campusAxis.motto);emit(island,m.asphalt,false,false);
  block(0,.28,campusAxis.motto,10.5,.17,3.6,trim,false,false,.12);
  const profile=new T.Shape();profile.moveTo(-4.7,.1);profile.bezierCurveTo(-5.15,.7,-4.6,1.48,-3.55,1.67);profile.bezierCurveTo(-1.4,2.05,2.9,1.95,4.45,1.48);profile.bezierCurveTo(4.9,1.05,4.7,.4,4.3,.1);profile.closePath();
  const stoneGeo=new T.ExtrudeGeometry(profile,{depth:1.35,bevelEnabled:true,bevelSize:.18,bevelThickness:.17,bevelSegments:3,curveSegments:24});
  stoneGeo.translate(0,.47,campusAxis.motto-.65);emit(stoneGeo,rock,true,false);worldSolid(0,.43,campusAxis.motto,10,2.15,2.3);
  const motto=new T.PlaneGeometry(8.3,1.13);motto.translate(0,1.42,campusAxis.motto+.895);emit(motto,sign('规格严格  功夫到家',8.3,1.13,'#963e26'),false,false);

  for(const {material,cast,selectable,parts} of buckets.values()) {
    const merged=mergeGeometries(parts,false);merged.rotateY(yaw);
    const object=mesh(merged,material,entry.x,0,entry.z,cast);
    if(selectable)registerMesh(object,entry);else object.userData.axisLandscape=true;
    parts.forEach(g=>g.dispose());
  }
}
