
import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { outline, inside, walkable, height, world, buildings, categoryNames, tourIds, roadLines, lakes, campusAxis, gateScale, colonnadeLayout, colonnadePoint } from './campus-data.js';
import { buildTerrain, buildCampus, distanceToRoad } from './model.js';
import { setupRealisticRendering, surfaceMaterial, addGatePlanting } from './realism.js';
import { createWeatherSystem } from './weather.js';
const el=id=>document.getElementById(id);
try { init(THREE,PointerLockControls); } catch(error) {
 console.error(error);el('boot').textContent='三维场景未能启动。请用支持 WebGL 2 的 Chrome 或 Edge 打开；也可以查看原始地图。';
 el('fallbackMap').hidden=false;
 el('fallbackMap').onclick=()=>el('reference').showModal();
 el('referenceClose').onclick=()=>el('reference').close();
}

function init(T, PointerLockControls) {
  // 图面坐标转为场景坐标；单位不是测绘米数，图面上方不等于正北。
  const bounds = { minX:-246, maxX:215, minZ:-323, maxZ:340 };
  const scene = new T.Scene();
  scene.background = new T.Color(0xc8dfe4);
  scene.fog = new T.Fog(0xc8dfe4, 285, 1100);
  const walkCam = new T.PerspectiveCamera(67, 1, .12, 1250);
  const orbitCam = new T.PerspectiveCamera(42, 1, 14, 3250);
  const renderer = new T.WebGLRenderer({ antialias:true, powerPreference:'high-performance' });
  renderer.outputColorSpace = T.SRGBColorSpace;
  const canvas = renderer.domElement;
  el('world').append(canvas);
  const rendering=setupRealisticRendering(T,renderer,scene);

  // ── 材质 ── 用共享几何与材质建模，窗格按材质批量实例化。
  const mat = (color, options) => new T.MeshStandardMaterial({ color, roughness:.87, ...options });
  const m = {
    terrain:mat(0xffffff,{ vertexColors:true }), asphalt:mat(0x505c5a), curb:mat(0xa8b3a0),
    path:mat(0xe4dac2), stone:mat(0xece0c8), line:mat(0xe9ead6), grass:mat(0x799b61),
    deepGrass:mat(0x638752), water:mat(0x65a7b3,{ roughness:.53 }), wall:mat(0xe5cda8),
    light:mat(0xf2e3c4), dorm:mat(0xdcc3a8), clay:mat(0xbe896f), dark:mat(0x394b53),
    roof:mat(0x3c5054), trim:mat(0xa9b7b0), blue:mat(0x78959b),
    windows:mat(0x416873,{ roughness:.41, metalness:.12 }),
    glass:mat(0x79b9c4,{ transparent:true, opacity:.54, roughness:.23, metalness:.12, depthWrite:false }),
    track:mat(0xa65d49), brass:mat(0xe3ca8f,{ metalness:.2 }), bark:mat(0x745e48),
    needles:mat(0xffffff,{ roughness:1 })
  };
  m.wall=surfaceMaterial(T,'plaster',{color:0xe5cda8,roughness:.9});
  m.light=surfaceMaterial(T,'stone',{color:0xf2e3c4,roughness:.8});
  m.dorm=surfaceMaterial(T,'plaster',{color:0xdcc3a8,roughness:.91});
  m.asphalt=surfaceMaterial(T,'asphalt',{color:0x434947,roughness:.93});
  m.windows.userData.nightWindow=true;
  const boxGeometry = new T.BoxGeometry(1,1,1);
  const cylinderGeometry = new T.CylinderGeometry(1,1,1,48);
  const colliders = [];
  const landmarks = [];
  const rayMeshes = [];
  const windowPieces = [];
  const roads = [];
  function mesh(geometry, material, x, y, z, cast = true) {
    const obj = new T.Mesh(geometry, material);
    obj.position.set(x,y,z);
    obj.castShadow = cast;
    obj.receiveShadow = true;
    scene.add(obj);
    return obj;
  }
  function box(x,y,z,w,h,d,material,cast = true) {
    const obj = mesh(boxGeometry,material,x,y+h/2,z,cast);
    obj.scale.set(w,h,d);
    return obj;
  }
  function disc(x,y,z,r,h,material,cast = false) {
    const obj = mesh(cylinderGeometry,material,x,y+h/2,z,cast);
    obj.scale.set(r,h,r);
    return obj;
  }

  const clamp=T.MathUtils.clamp;
  buildTerrain({T,mesh,box,m});

  // 水平铺装依地形切小网格，略抬高以避免与地表深度冲突。
  function paving(x,z,w,d,material,lift=.09) {
    const geo = new T.PlaneGeometry(w,d,Math.ceil(w/3),Math.ceil(d/3));
    geo.rotateX(-Math.PI/2);
    const p = geo.attributes.position;
    for (let i=0; i<p.count; i++) p.setY(i,height(x+p.getX(i),z+p.getZ(i))+lift);
    geo.computeVertexNormals();
    return mesh(geo,material,x,0,z,false);
  }

  // ── 建筑 ── 建筑资料、轮廓拾取网格和碰撞体分别登记。
  function addCollider(x,y,z,w,h,d) {
    colliders.push({ minX:x-w/2,maxX:x+w/2,minY:y,maxY:y+h,minZ:z-d/2,maxZ:z+d/2 });
  }
  function landmark(name,code,description,x,z,kind='study',priority=2) {
    const entry={name,code,description,x,z,kind,priority,top:height(x,z),faces:[]};
    landmarks.push(entry);
    return entry;
  }
  function registerMesh(obj,entry) {
    obj.userData.landmark=entry;
    rayMeshes.push(obj);
    return obj;
  }
  function piece(entry,x,y,z,w,h,d,material,{solid=true,footprint=solid,cast=true}={}) {
    const obj=registerMesh(box(x,y,z,w,h,d,material,cast),entry);
    entry.top=Math.max(entry.top,y+h);
    if (solid) addCollider(x,y,z,w,h,d);
    if (footprint) entry.faces.push({x,z,w,d});
    return obj;
  }
  function hip(entry,x,y,z,w,d,h) {
    const geo = new T.CylinderGeometry(.74,1,1,4,1);
    geo.rotateY(Math.PI/4);
    const unitRadius=1/Math.SQRT2;
    geo.scale(unitRadius,1,unitRadius);
    const obj=registerMesh(mesh(geo,m.roof,x,y+h/2,z),entry);
    obj.scale.set(w,h,d);
    entry.top=Math.max(entry.top,y+h);
  }
  function windows(x,y,z,w,d,h,floors,columns) {
    const band=h/floors;
    for (let row=0; row<floors; row++) {
      const wy=y+(row+.52)*band, wh=Math.min(2.35,band*.54);
      for (let column=0; column<columns; column++) {
        const wx=x+((column+.5)/columns-.5)*(w-2.8);
        const ww=Math.min(2.8,(w-2.8)/columns*.56);
        windowPieces.push([wx,wy,z+d/2,ww,wh,.15],[wx,wy,z-d/2,ww,wh,.15]);
      }
      const sideCount=Math.max(2,Math.round(d/5));
      for (let column=0; column<sideCount; column++) {
        const wz=z+((column+.5)/sideCount-.5)*(d-1.8);
        windowPieces.push([x+w/2,wy,wz,.15,wh,Math.min(2.45,d/sideCount*.53)],
                          [x-w/2,wy,wz,.15,wh,Math.min(2.45,d/sideCount*.53)]);
      }
    }
  }
  function block(entry,x,y,z,w,d,h,floors,material,roofHeight=1.25) {
    piece(entry,x,y-.09,z,w,h+.09,d,material);
    windows(x,y,z,w,d,h,floors,Math.max(3,Math.round(w/5)));
    piece(entry,x,y+h-.45,z,w+.35,.45,d+.35,m.light,{solid:false});
    hip(entry,x,y+h,z,w+1.1,d+1.1,roofHeight);
  }

  const {field}=buildCampus({T,m,mesh,box,disc,paving,landmark,registerMesh,block,piece,hip,roads,addCollider});
  const temp = new T.Object3D();
  const windowMesh = new T.InstancedMesh(boxGeometry,m.windows,windowPieces.length);
  windowPieces.forEach(([x,y,z,w,h,d],i) => {
    temp.position.set(x,y,z); temp.scale.set(w,h,d);
    temp.updateMatrix(); windowMesh.setMatrixAt(i,temp.matrix);
  });
  windowMesh.instanceMatrix.needsUpdate=true;
  windowMesh.receiveShadow=true;
  scene.add(windowMesh);

  // ── 树木 ── 126 棵树，树干、下层树冠、上层树冠各用一个 InstancedMesh。
  let seed=917113;
  function random() {
    seed=(Math.imul(seed,1664525)+1013904223)>>>0;
    return seed/4294967296;
  }
  const treeSites=[];
  const treeCount=420;
  function treeAllowed(x,z) {
    if(!inside(x,z))return false;
    const axis=campusAxis.project(x,z);
    if(axis.distance>-10&&axis.distance<campusAxis.colonnade+5&&Math.abs(axis.lateral)<38)return false;
    if(axis.distance>=campusAxis.colonnade+5&&axis.distance<campusAxis.length&&Math.abs(axis.lateral)<24)return false;
    if(roads.some(r=>distanceToRoad(x,z,r)<r.width/2+2))return false;
    if(buildings.some(b=>Math.abs(x-b.x)<b.w/2+3 && Math.abs(z-b.z)<b.d/2+3))return false;
    if(lakes.some(l=>{const points=l.points.map(p=>world(...p));return x>Math.min(...points.map(p=>p.x))-2&&x<Math.max(...points.map(p=>p.x))+2&&z>Math.min(...points.map(p=>p.z))-2&&z<Math.max(...points.map(p=>p.z))+2;}))return false;
    return treeSites.every(p=>(p.x-x)**2+(p.z-z)**2>18);
  }
  function plant(x,z) { if(treeAllowed(x,z))treeSites.push({x,z,size:3.7+random()*4.1,angle:random()*Math.PI}); }
  for(let attempts=0;treeSites.length<treeCount && attempts<30000;attempts++)plant(-236+445*random(),-315+630*random());

  const trunks=new T.InstancedMesh(new T.CylinderGeometry(.69,1,1,6),m.bark,treeCount);
  const cone=new T.ConeGeometry(1,1,14,9);
  const crownPositions=cone.attributes.position;
  for(let i=0;i<crownPositions.count;i++) {
    const x=crownPositions.getX(i),y=crownPositions.getY(i),z=crownPositions.getZ(i),a=Math.atan2(z,x);
    const fringe=1+.09*Math.sin(y*55+a*7)+.045*Math.cos(a*17-y*12);
    crownPositions.setXYZ(i,x*fringe,y,z*fringe);
  }
  cone.computeVertexNormals();
  const crowns=new T.InstancedMesh(cone,m.needles,treeCount);
  const tips=new T.InstancedMesh(cone,m.needles,treeCount);
  const treeTints=[0x527e55,0x58845c,0x467453,0x709657,0x59855b].map(c=>new T.Color(c));
  function instanceTreePart(mesh,i,x,y,z,w,h,angle) {
    temp.position.set(x,y,z);
    temp.rotation.set(0,angle,0);
    temp.scale.set(w,h,w);
    temp.updateMatrix();
    mesh.setMatrixAt(i,temp.matrix);
  }
  treeSites.forEach(({x,z,size,angle},i)=>{
    const y=height(x,z);
    instanceTreePart(trunks,i,x,y+size*.19,z,.14+size*.015,size*.38,angle);
    instanceTreePart(crowns,i,x,y+size*.52,z,size*.26,size*.56,angle);
    instanceTreePart(tips,i,x,y+size*.73,z,size*.203,size*.54,angle+.32);
    const tint=treeTints[i%treeTints.length];
    crowns.setColorAt(i,tint);
    tips.setColorAt(i,tint);
  });
  for(const trees of [trunks,crowns,tips]) {
    trees.castShadow=trees.receiveShadow=true;
    trees.instanceMatrix.needsUpdate=true;
    if(trees.instanceColor) trees.instanceColor.needsUpdate=true;
    scene.add(trees);
  }

  // ── 控制 ── 漫游与俯瞰各用一台相机；只有已锁定时才让 WASD 更新玩家。
  addGatePlanting(T,scene);
  const controls=new PointerLockControls(walkCam,canvas);
  controls.minPolarAngle=.055;
  controls.maxPolarAngle=Math.PI-.055;
  const fixedStep=1/60, eyeHeight=1.7, bodyRadius=.35, speed=9;
  const held=new Set(), movementKeys=new Set(['KeyW','KeyA','KeyS','KeyD']);
  const velocity=new T.Vector3(), desired=new T.Vector3();
  const viewDirection=new T.Vector3(), forward=new T.Vector3(), right=new T.Vector3();
  const spawn=world(841,1484);
  walkCam.position.set(spawn.x,height(spawn.x,spawn.z)+eyeHeight,spawn.z);
  const mainView=world(879,1141);
  walkCam.lookAt(mainView.x,eyeHeight,mainView.z);
  let mode='orbit', started=false, accumulator=0, dragId=null, lockPending=false;
  let firstLookEvent=false;
  let dragX=0, dragY=0, azimuth=.14, elevation=.98, radius=950, targetRadius=950, dragEndedAt=-Infinity;
  const orbitTarget=new T.Vector3(-12,7,0);
  const targetGoal=orbitTarget.clone();
  let autoRotate=false,labelsVisible=true,selected=null,tourIndex=-1,tourAt=0,viewingAxis=false,detailFocus='main';
  const landing=world(841,1484);
  const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)');
  const pointerAvailable=typeof canvas.requestPointerLock==='function' && matchMedia('(any-pointer: fine)').matches;
  const weather=createWeatherSystem(T,scene,rendering,{landmarks,canvas,
    unlock(){if(document.pointerLockElement===canvas)controls.unlock();stopMoving();},
    onOpen(){el('directory').hidden=true;el('directoryToggle').setAttribute('aria-expanded','false');if(innerWidth<700)el('detail').hidden=true;}
  });
  function fitDistance() { return Math.max(1,(['doorSouth','main'].includes(selected?.id)?.98:.78)/orbitCam.aspect); }
  function locked() { return mode==='walk' && document.pointerLockElement===canvas; }
  function stopMoving() { held.clear(); velocity.set(0,0,0); accumulator=0; }
  function cancelDrag() {
    if(dragId===null) return;
    const id=dragId;
    dragId=null;
    canvas.classList.remove('dragging');
    if(canvas.hasPointerCapture(id)) canvas.releasePointerCapture(id);
    dragEndedAt=performance.now();
  }
  function showApp() {
    started=true;
    el('start').hidden=true;
    el('brand').hidden=false;
    el('mapPanel').hidden=false;
    el('hud').hidden=false;
  }
  function refreshMode() {
    const active=locked();
    el('walk').setAttribute('aria-pressed',String(mode==='walk'));
    el('orbit').setAttribute('aria-pressed',String(mode==='orbit'));
    el('crosshair').hidden=!active;
    el('labels').hidden=!started || mode!=='orbit' || !labelsVisible;
    el('zoom').hidden=mode!=='orbit';
    el('hint').textContent=mode==='orbit'
      ? '拖拽旋转 · 滚轮缩放'
      : active ? 'WASD 移动 · E 查看 · Esc 释放' : '点击画面继续漫游';
    canvas.style.cursor=mode==='orbit' ? 'grab' : active ? 'none' : 'pointer';
    if (!active) clearTarget();
  }
  function selectOrbit() {
    showApp();
    mode='orbit';
    if(document.pointerLockElement===canvas) controls.unlock();
    stopMoving();
    refreshMode();
  }
  function requestWalk() {
    if(!pointerAvailable || lockPending || locked()) return;
    weather.close();
    cancelDrag();
    showApp();
    mode='walk';
    stopMoving();
    refreshMode();
    lockPending=true;
    try {
      // 保持在按钮的同步点击事件中，满足 Pointer Lock 的用户手势要求。
      controls.lock();
    } catch {
      lockFailed();
    }
  }
  function lockFailed() {
    if (!lockPending) return;
    lockPending=false;
    if (mode==='walk') {
      selectOrbit();
      el('hint').textContent='浏览器暂未锁定鼠标，可点击第一人称重试';
    }
  }
  el('startWalk').addEventListener('click',requestWalk);
  el('walk').addEventListener('click',requestWalk);
  el('startOrbit').addEventListener('click',selectOrbit);
  el('orbit').addEventListener('click',selectOrbit);
  document.addEventListener('pointerlockchange',()=>{
    lockPending=false;
    firstLookEvent=locked();
    if(mode!=='walk' && document.pointerLockElement===canvas) controls.unlock();
    stopMoving();
    refreshMode();
  });
  document.addEventListener('pointerlockerror',lockFailed);
  // 某些浏览器在锁定时会把光标重定位记作一次大幅鼠标移动。
  // 只过滤锁定后的首个异常事件，其余移动交由 PointerLockControls。
  document.addEventListener('mousemove',event=>{
    if(!firstLookEvent || !event.isTrusted) return;
    firstLookEvent=false;
    if(Math.hypot(event.movementX,event.movementY)>200) event.stopImmediatePropagation();
  },true);
  window.addEventListener('blur',stopMoving);
  document.addEventListener('visibilitychange',()=>{ if(document.hidden) stopMoving(); });

  canvas.addEventListener('click',()=>{ if (mode==='walk' && !locked()) requestWalk(); });
  canvas.addEventListener('pointerdown',event=>{
    if(!started || mode!=='orbit' || dragId!==null || event.button!==0) return;
    dragId=event.pointerId;
    dragX=event.clientX;
    dragY=event.clientY;
    canvas.setPointerCapture(dragId);
    canvas.classList.add('dragging');
    canvas.style.cursor='';
  });
  canvas.addEventListener('pointermove',event=>{
    if(event.pointerId!==dragId) return;
    azimuth-=(event.clientX-dragX)*.006;
    elevation=clamp(elevation+(event.clientY-dragY)*.006,detailFocus==='colonnade'?-.18:.04,1.39);
    dragX=event.clientX;
    dragY=event.clientY;
  });
  for(const type of ['pointerup','pointercancel','lostpointercapture']) canvas.addEventListener(type,event=>{
    if(event.pointerId===dragId) cancelDrag();
  });
  function zoomBy(factor) { targetRadius=clamp(targetRadius*factor,selected?.id==='doorSouth'?12:detailFocus==='colonnade'?10:selected?.id==='main'?45:95,1200); }
  canvas.addEventListener('wheel',event=>{
    if(mode!=='orbit' || !started) return;
    event.preventDefault();
    const delta=event.deltaY*(event.deltaMode===1 ? 16 : event.deltaMode===2 ? innerHeight : 1);
    zoomBy(Math.exp(clamp(delta,-240,240)*.0014));
  },{passive:false});
  el('nearer').addEventListener('click',()=>zoomBy(.82));
  el('farther').addEventListener('click',()=>zoomBy(1/.82));

  function occupied(x,z) {
    if(x-bodyRadius<bounds.minX || x+bodyRadius>bounds.maxX ||
       z-bodyRadius<bounds.minZ || z+bodyRadius>bounds.maxZ || !walkable(x,z)) return true;
    const floor=height(x,z);
    return colliders.some(b=>
      x+bodyRadius>b.minX && x-bodyRadius<b.maxX &&
      z+bodyRadius>b.minZ && z-bodyRadius<b.maxZ &&
      floor+.08<b.maxY && floor+eyeHeight>b.minY
    );
  }
  function walkStep(dt) {
    walkCam.getWorldDirection(forward);
    forward.y=0;
    forward.normalize();
    right.set(-forward.z,0,forward.x);
    const ahead=Number(held.has('KeyW'))-Number(held.has('KeyS'));
    const sideways=Number(held.has('KeyD'))-Number(held.has('KeyA'));
    desired.copy(forward).multiplyScalar(ahead).addScaledVector(right,sideways);
    if (desired.lengthSq()>1) desired.normalize();
    desired.multiplyScalar(speed);
    velocity.lerp(desired,1-Math.exp(-(ahead||sideways ? 13 : 10)*dt));
    const p=walkCam.position;
    // 先试 X，再用更新后的 X 试 Z，撞墙时只清掉法向速度。
    const nx=p.x+velocity.x*dt;
    if(!occupied(nx,p.z)) p.x=nx;
    else velocity.x=0;
    const nz=p.z+velocity.z*dt;
    if(!occupied(p.x,nz)) p.z=nz;
    else velocity.z=0;
    p.y=height(p.x,p.z)+eyeHeight;
  }

  // ── 交互 ── 与建筑外形做射线检测；每次按 E 用当下视角重新检测。
  const ray=new T.Raycaster(undefined,undefined,0,16);
  const intersections=[];
  let aimed=null;
  function target() {
    walkCam.getWorldDirection(viewDirection);
    ray.set(walkCam.position,viewDirection);
    intersections.length=0;
    ray.intersectObjects(rayMeshes,false,intersections);
    const hit=intersections[0];
    if (!hit) return null;
    // 低头看时，地形可以遮住位于坡脚或地面之后的屋体。
    for(let d=.3; d<hit.distance-.2; d+=.5) {
      const x=walkCam.position.x+d*viewDirection.x;
      const z=walkCam.position.z+d*viewDirection.z;
      if(walkCam.position.y+d*viewDirection.y<height(x,z)) return null;
    }
    return hit.object.userData.landmark;
  }
  function clearTarget() {
    aimed=null;
    el('crosshair').classList.remove('hit');
    el('aim').hidden=true;
    el('card').hidden=true;
  }
  function updateTarget() {
    const next=target();
    if (next===aimed) return;
    aimed=next;
    el('crosshair').classList.toggle('hit',Boolean(aimed));
    el('aim').hidden=!aimed;
    if(aimed) el('aim').textContent='E · '+aimed.name;
  }
  const movementCode=event=>event.code||({w:'KeyW',a:'KeyA',s:'KeyS',d:'KeyD',e:'KeyE'}[event.key.toLowerCase()]||event.key);
  window.addEventListener('keydown',event=>{
    if(!locked()) return;
    const code=movementCode(event);
    if(movementKeys.has(code)) {
      event.preventDefault();
      held.add(code);
    } else if(code==='KeyE' && !event.repeat) {
      const entry=target();
      if(!entry) {
        el('card').hidden=true;
        return;
      }
      const card=el('card');
      const sameOpen=!card.hidden && card.dataset.building===entry.name;
      card.dataset.building=entry.name;
      el('cardTitle').textContent=entry.name;
      el('cardDescription').textContent=entry.description;
      card.hidden=sameOpen;
    }
  });
  window.addEventListener('keyup',event=>held.delete(movementCode(event)));

  // 俯瞰索引标注：优先显示地标，避免标牌互相覆盖。
  const labelRoot=el('labels');
  const labelItems=[...landmarks].sort((a,b)=>a.priority-b.priority).map(entry=>{
    const label=document.createElement('button');
    label.type='button';label.tabIndex=-1;
    label.addEventListener('click',()=>focusEntry(entry));
    label.className='place';
    label.dataset.kind=entry.kind;
    const code=document.createElement('i');
    code.textContent=entry.code==='main'?'H':entry.kind==='study'?'学':entry.kind==='life'?'居':entry.kind==='sport'?'体':'门';
    label.append(code,document.createTextNode(entry.name));
    labelRoot.append(label);
    return {entry,label};
  });
  const projected=new T.Vector3();
  const reserved=[];
  function updateLabels() {
    if(!started || mode!=='orbit' || !labelsVisible) return;
    const width=innerWidth, screenHeight=innerHeight;
    const compact=width<700;
    reserved.length=0;
    if(!el('directory').hidden)reserved.push([0,80,compact?innerWidth:322,compact?innerHeight:innerHeight-120]);
    reserved.push([0,0,compact?181:225,compact?66:91],
                  [width-(compact?115:210),0,width,compact?119:201],
                  [width*.5-185,screenHeight-73,width*.5+185,screenHeight]);
    for(const {entry,label} of labelItems) {
      projected.set(entry.x,entry.top+3.3,entry.z).project(orbitCam);
      const x=(projected.x+1)*width*.5;
      const y=(1-projected.y)*screenHeight*.5;
      const w=(compact?9:11)*entry.name.length+(compact?19:27);
      const inDetail=(selected?.id==='doorSouth'&&radius<150)||(selected?.id==='main'&&!viewingAxis&&radius<160);
      const canShow=(!inDetail || entry===selected) && (!compact || entry.priority<=1) && projected.z>-1 && projected.z<1 &&
        x-w/2>5 && x+w/2<width-5 && y>16 && y<screenHeight-12;
      const rect=[x-w/2-4,y-23,x+w/2+4,y+3];
      const show=canShow && !reserved.some(([l,t,r,b])=>rect[0]<r && rect[2]>l && rect[1]<b && rect[3]>t);
      label.hidden=!show;
      if (show) {
        reserved.push(rect);
        label.style.transform='translate('+Math.round(x)+'px,'+Math.round(y)+'px) translate(-50%,-100%)';
      }
    }
  }

  // 小地图的道路、轮廓和树位源自同一组场景坐标。底图只绘制一次。
  const map=el('map');
  const mapContext=map.getContext('2d');
  const mapBase=document.createElement('canvas');
  mapBase.width=map.width;
  mapBase.height=map.height;
  const base=mapBase.getContext('2d');
  const mapScale=.6;
  const mx=x=>map.width/2+(x+12)*mapScale;
  const mz=z=>map.height/2+z*mapScale;
  function mapRect(ctx,x,z,w,d) { ctx.fillRect(mx(x-w/2),mz(z-d/2),w*mapScale,d*mapScale); }
  base.fillStyle='#d2e3e3';base.fillRect(0,0,map.width,map.height);
  base.fillStyle='#a4b78e';base.beginPath();outline.forEach((p,i)=>i?base.lineTo(mx(p.x),mz(p.z)):base.moveTo(mx(p.x),mz(p.z)));base.closePath();base.fill();
  base.strokeStyle='#6e7b70';base.lineCap='round';base.lineJoin='round';
  for(const r of roadLines){base.lineWidth=r.width*mapScale;base.beginPath();r.points.forEach(([x,y],i)=>{const p=world(x,y);i?base.lineTo(mx(p.x),mz(p.z)):base.moveTo(mx(p.x),mz(p.z));});base.stroke();}
  const mapColors={study:'#46786c',life:'#b17c59',sport:'#528497',gate:'#897646'};
  for(const entry of landmarks){base.fillStyle=mapColors[entry.kind];for(const f of entry.faces)mapRect(base,f.x,f.z,f.w,f.d);}
  base.strokeStyle='#d0bc85';base.lineWidth=2;base.beginPath();
  for(let i=0;i<=24;i++){const a=-colonnadeLayout.halfAngle+2*colonnadeLayout.halfAngle*i/24,local=colonnadePoint(a),p=campusAxis.at(local.z,local.x);i?base.lineTo(mx(p.x),mz(p.z)):base.moveTo(mx(p.x),mz(p.z));}base.stroke();
  const stonePoint=campusAxis.at(campusAxis.motto);base.fillStyle='#b28552';base.beginPath();base.arc(mx(stonePoint.x),mz(stonePoint.z),2.4,0,Math.PI*2);base.fill();
  base.strokeStyle='#a65d49';base.lineWidth=4;base.beginPath();base.ellipse(mx(field.x),mz(field.z),field.spec.w/2*mapScale,field.spec.d/2*mapScale,0,0,Math.PI*2);base.stroke();

  function updateMap() {
    if(!started) return;
    const ctx=mapContext;
    ctx.drawImage(mapBase,0,0);
    const walk=mode==='walk';
    const p=walk ? walkCam.position : orbitTarget;
    const x=mx(p.x), z=mz(p.z);
    ctx.save();
    ctx.translate(x,z);
    ctx.fillStyle=walk ? '#f5cd67' : '#174e42';
    ctx.strokeStyle='#ffffee';
    ctx.lineWidth=2;
    ctx.beginPath();
    if(walk) {
      walkCam.getWorldDirection(viewDirection);
      ctx.rotate(Math.atan2(viewDirection.x,-viewDirection.z));
      ctx.moveTo(0,-8); ctx.lineTo(5,5); ctx.lineTo(0,3); ctx.lineTo(-5,5);
      ctx.closePath();
    } else {
      ctx.arc(0,0,4.5,0,Math.PI*2);
    }
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  // 目录、地标聚焦与原图对照：只做镜头定位，不提供未经测绘的导航距离。
  let filter='all',lastFocus=null,toastTimer;
  const selection=new T.Mesh(new T.RingGeometry(1,1.045,64),new T.MeshBasicMaterial({color:0xf3c46a,side:T.DoubleSide}));
  selection.rotation.x=-Math.PI/2;selection.visible=false;scene.add(selection);
  canvas.tabIndex=0;
  canvas.setAttribute('aria-label','校园三维画面，方向键旋转，Home 复位，加减号缩放；建筑也可通过目录选择。');
  function notify(text) { clearTimeout(toastTimer);el('toast').textContent=text;el('toast').hidden=false;toastTimer=setTimeout(()=>el('toast').hidden=true,3500); }
  function toggleDirectory(open) {
    if(open)weather.close();
    el('directory').hidden=!open;el('directoryToggle').setAttribute('aria-expanded',String(open));
    if(open && innerWidth<700)el('detail').hidden=true;
    if(open)el('search').focus();else el('directoryToggle').focus();
  }
  function renderList() {
    const query=el('search').value.trim().toLowerCase().replace(/\s/g,'');
    const matches=landmarks.filter(e=>(filter==='all'||e.kind===filter) && (e.name.toLowerCase().replace(/\s/g,'').includes(query)||e.id.toLowerCase().includes(query)||(query==='14公寓'&&e.id.startsWith('d14'))));
    el('buildingList').replaceChildren();
    for(const entry of matches) {
      const button=document.createElement('button'),small=document.createElement('small');button.type='button';button.dataset.id=entry.id;
      button.setAttribute('aria-pressed',String(entry===selected));button.append(document.createTextNode(entry.name));small.textContent=categoryNames[entry.kind];button.append(small);
      button.addEventListener('click',()=>{focusEntry(entry);if(innerWidth<700)toggleDirectory(false);});el('buildingList').append(button);
    }
    el('resultCount').textContent=matches.length+' 处地点';el('empty').hidden=matches.length>0;
  }
  function focusEntry(entry,fromTour=false) {
    if(innerWidth<700)weather.close();
    if(!fromTour)stopTour();
    selectOrbit();selected=entry;
    targetGoal.set(entry.x,Math.min(entry.top*.3+7,19),entry.z);
    targetRadius=Math.max(160,Math.max(entry.spec.w,entry.spec.d)*3.6);
    if(entry.id==='doorSouth') { targetGoal.set(entry.x,5.5*gateScale,entry.z);targetRadius=63*gateScale;azimuth=0;elevation=.055; }
    if(entry.id==='main') { const p=campusAxis.at(3);targetGoal.set(p.x,10.5,p.z);targetRadius=112;azimuth=campusAxis.yaw;elevation=.14; }
    detailFocus='main';el('colonnadeView').hidden=entry.id!=='main';el('colonnadeView').textContent='查看柱廊细节';
    orbitCam.near=entry.id==='doorSouth'?.35:entry.id==='main'?1.5:14;orbitCam.updateProjectionMatrix();
    viewingAxis=false;el('axisView').hidden=entry.id!=='main';el('axisView').textContent='查看完整中轴线';
    el('detailTitle').textContent=entry.name;el('detailKind').textContent=categoryNames[entry.kind];el('detailDescription').textContent=entry.description;
    el('detail').hidden=false;el('card').hidden=true;
    selection.position.set(entry.x,height(entry.x,entry.z)+.6,entry.z);
    const size=Math.max(entry.spec.w,entry.spec.d)*.65;selection.scale.set(size,size,1);selection.visible=!['doorSouth','main'].includes(entry.id);
    for(const button of el('buildingList').children)button.setAttribute('aria-pressed',String(button.dataset.id===entry.id));
  }
  function resetView() {
    detailFocus='main';orbitCam.near=14;orbitCam.updateProjectionMatrix();
    stopTour();selectOrbit();targetGoal.set(-12,7,0);azimuth=.14;elevation=.98;targetRadius=950;
    selection.visible=false;selected=null;el('detail').hidden=true;renderList();
  }
  function stopTour() { tourIndex=-1;el('tour').setAttribute('aria-pressed','false');el('tour').textContent='地标巡览';el('tourStatus').hidden=true; }
  function nextStop(now) {
    const entry=landmarks.find(e=>e.id===tourIds[tourIndex]);focusEntry(entry,true);tourAt=now;
    el('tourStatus').textContent='地标巡览 '+(tourIndex+1)+' / '+tourIds.length+' · '+entry.name;
  }
  function updateTour(now) {
    if(tourIndex<0||now-tourAt<6500)return;
    if(++tourIndex>=tourIds.length){stopTour();notify('巡览结束，可继续自由探索。');return;}nextStop(now);
  }
  el('directoryToggle').addEventListener('click',()=>toggleDirectory(el('directory').hidden));
  el('directoryClose').addEventListener('click',()=>toggleDirectory(false));
  el('search').addEventListener('input',renderList);
  el('categories').addEventListener('click',event=>{const button=event.target.closest('[data-category]');if(!button)return;filter=button.dataset.category;for(const b of el('categories').children)b.setAttribute('aria-pressed',String(b===button));renderList();});
  el('clearSearch').addEventListener('click',()=>{el('search').value='';filter='all';for(const b of el('categories').children)b.setAttribute('aria-pressed',String(b.dataset.category==='all'));renderList();el('search').focus();});
  el('reset').addEventListener('click',resetView);
  el('labelsToggle').addEventListener('click',()=>{labelsVisible=!labelsVisible;el('labelsToggle').setAttribute('aria-pressed',String(labelsVisible));refreshMode();});
  el('rotateToggle').addEventListener('click',()=>{autoRotate=!autoRotate;el('rotateToggle').setAttribute('aria-pressed',String(autoRotate));if(autoRotate&&reduceMotion.matches)notify('系统已开启减少动态效果，自转保持暂停。');});
  el('tour').addEventListener('click',()=>{if(tourIndex>=0){stopTour();return;}tourIndex=0;el('tour').setAttribute('aria-pressed','true');el('tour').textContent='停止巡览';el('tourStatus').hidden=false;nextStop(performance.now());});
  el('detailClose').addEventListener('click',()=>{el('detail').hidden=true;selection.visible=false;});
  function showAxis() {
    const entry=landmarks.find(e=>e.id==='main');focusEntry(entry);
    selectOrbit();stopTour();viewingAxis=true;detailFocus='axis';
    orbitCam.near=14;orbitCam.updateProjectionMatrix();
    const p=campusAxis.at(92);targetGoal.set(p.x,3,p.z);targetRadius=270;azimuth=campusAxis.yaw+.12;elevation=.72;
    el('axisView').textContent='查看主楼正面';
  }
  el('axisView').addEventListener('click',()=>viewingAxis?focusEntry(landmarks.find(e=>e.id==='main')):showAxis());
  function showColonnade() {
    const entry=landmarks.find(e=>e.id==='main');focusEntry(entry);detailFocus='colonnade';
    const compact=innerWidth<700,p=campusAxis.at(campusAxis.colonnade-1.5,compact?0:-3);targetGoal.set(p.x,3.7,p.z);targetRadius=27;azimuth=campusAxis.yaw+(compact?0:-.62);elevation=compact?.025:-.055;
    orbitCam.near=.35;orbitCam.updateProjectionMatrix();
    el('detailTitle').textContent='主楼前弧形柱廊';el('detailDescription').textContent='双排凹槽立柱、叶饰柱头、错缝石砌基座与弧形叠层檐口，按用户近景照片细化；拖拽可从廊下检查构件。';
    el('colonnadeView').textContent='返回主楼正面';
  }
  el('colonnadeView').addEventListener('click',()=>detailFocus==='colonnade'?focusEntry(landmarks.find(e=>e.id==='main')):showColonnade());
  el('walkHere').disabled=!pointerAvailable;
  el('walkHere').addEventListener('click',()=>{
    if(!selected)return;stopTour();const s=selected.spec;let safe=null;
    for(let r=Math.max(s.w,s.d)*.55+4;r<130&&!safe;r+=5)for(let i=0;i<24;i++){const a=i*Math.PI/12,x=s.x+Math.sin(a)*r,z=s.z+Math.cos(a)*r;if(!occupied(x,z)){safe={x,z};break;}}
    if(!safe){notify('附近没有找到可用落脚点，请从南门开始漫游。');return;}
    walkCam.position.set(safe.x,height(safe.x,safe.z)+eyeHeight,safe.z);walkCam.lookAt(s.x,height(s.x,s.z)+eyeHeight,s.z);el('detail').hidden=true;requestWalk();
  });
  function showReference() {if(document.pointerLockElement===canvas)controls.unlock();lastFocus=document.activeElement;el('reference').showModal();}
  el('referenceToggle').addEventListener('click',showReference);el('fallbackMap').addEventListener('click',showReference);
  el('referenceClose').addEventListener('click',()=>el('reference').close());
  el('reference').addEventListener('close',()=>lastFocus?.focus());
  el('reference').addEventListener('click',e=>{if(e.target===el('reference'))el('reference').close();});
  let pointerStart=null,pointerTravel=0,pinching=false,pinchDistance=0;
  const touchPoints=new Map();
  canvas.addEventListener('pointerdown',e=>{
    pointerStart={x:e.clientX,y:e.clientY};pointerTravel=0;
    if(e.pointerType==='touch'){touchPoints.set(e.pointerId,{x:e.clientX,y:e.clientY});if(touchPoints.size===2){pinching=true;cancelDrag();const [a,b]=[...touchPoints.values()];pinchDistance=Math.hypot(a.x-b.x,a.y-b.y);}}
  });
  canvas.addEventListener('pointermove',e=>{
    if(pointerStart)pointerTravel=Math.max(pointerTravel,Math.hypot(e.clientX-pointerStart.x,e.clientY-pointerStart.y));
    if(touchPoints.has(e.pointerId)){touchPoints.set(e.pointerId,{x:e.clientX,y:e.clientY});if(touchPoints.size===2 && mode==='orbit'){const [a,b]=[...touchPoints.values()],d=Math.hypot(a.x-b.x,a.y-b.y);if(d>5 && pinchDistance>5)zoomBy(pinchDistance/d);pinchDistance=d;}}
  });
  for(const type of ['pointerup','pointercancel'])canvas.addEventListener(type,e=>{touchPoints.delete(e.pointerId);if(!touchPoints.size)setTimeout(()=>pinching=false,80);});
  canvas.addEventListener('click',event=>{
    if(!started||mode!=='orbit'||pointerTravel>7||pinching)return;
    const rect=canvas.getBoundingClientRect(),point=new T.Vector2((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1),picker=new T.Raycaster();
    picker.setFromCamera(point,orbitCam);const hit=picker.intersectObjects(rayMeshes,false)[0];
    if(hit)focusEntry(hit.object.userData.landmark);
  });
  canvas.addEventListener('keydown',event=>{
    if(mode!=='orbit')return;
    if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','+','-','='].includes(event.key))event.preventDefault();
    if(event.key==='ArrowLeft')azimuth-=.1;if(event.key==='ArrowRight')azimuth+=.1;
    if(event.key==='ArrowUp')elevation=clamp(elevation+.08,detailFocus==='colonnade'?-.18:.04,1.39);if(event.key==='ArrowDown')elevation=clamp(elevation-.08,detailFocus==='colonnade'?-.18:.04,1.39);
    if(event.key==='Home')resetView();if(event.key==='+'||event.key==='=')zoomBy(.82);if(event.key==='-')zoomBy(1/.82);
  });
  // 自动巡览不能与手动漫游争用相机。
  el('walk').addEventListener('click',stopTour);el('orbit').addEventListener('click',stopTour);
  renderList();
  el('startSouthGate').addEventListener('click',()=>focusEntry(landmarks.find(e=>e.id==='doorSouth')));
  el('startMainAxis').addEventListener('click',showAxis);
  function openHash() {
    if(location.hash==='#south-gate')focusEntry(landmarks.find(e=>e.id==='doorSouth'));
    if(location.hash==='#main')focusEntry(landmarks.find(e=>e.id==='main'));
    if(location.hash==='#main-axis')showAxis();
    if(location.hash==='#colonnade')showColonnade();
  }
  window.addEventListener('hashchange',openHash);openHash();
  window.__campus={get state(){return {mode,started,count:landmarks.length,selected:selected?.id,tourIndex,autoRotate,labelsVisible,camera:orbitCam.position.toArray(),walkPosition:walkCam.position.toArray(),drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,quality:rendering.quality,weather:weather.state};},project(id){const e=landmarks.find(e=>e.id===id);if(!e)return null;const p=new T.Vector3(e.x,e.top*.55,e.z).project(orbitCam);return {x:(p.x+1)*innerWidth/2,y:(1-p.y)*innerHeight/2};}};

  // ── 主循环 ── 渲染跟随屏幕刷新率；物理累加到固定的 1/60 秒步长。
  let lastCompact=null;
  function resize() {
    const w=Math.max(1,innerWidth), h=Math.max(1,innerHeight);
    const compact=w<700;
    if(detailFocus==='colonnade'&&compact!==lastCompact) {
      const p=campusAxis.at(campusAxis.colonnade-1.5,compact?0:-3);targetGoal.set(p.x,3.7,p.z);
      azimuth=campusAxis.yaw+(compact?0:-.62);elevation=compact?.025:-.055;
    }
    lastCompact=compact;
    if(w<700&&!el('weatherPanel').hidden)el('detail').hidden=true;
    renderer.setPixelRatio(Math.min(devicePixelRatio||1,w<700?1.35:1.65));
    renderer.setSize(w,h);
    rendering.resize(w,h);
    for(const camera of [walkCam,orbitCam]) {
      camera.aspect=w/h;
      camera.updateProjectionMatrix();
    }
  }
  window.addEventListener('resize',resize);
  resize();
  refreshMode();
  el('startOrbit').disabled=false;
  el('startSouthGate').disabled=false;
  el('startMainAxis').disabled=false;
  el('startWalk').disabled=el('walk').disabled=!pointerAvailable;
  el('boot').hidden=pointerAvailable;
  if(!pointerAvailable) el('boot').textContent='当前设备可使用触摸俯瞰。第一人称需要支持鼠标锁定的桌面浏览器。';

  // 防止首次射线拾取发生在第一帧渲染前，确保所有建筑世界矩阵已经生效。
  scene.updateMatrixWorld(true);
  let previous=performance.now(), lastMap=-Infinity;
  function frame(now) {
    const elapsed=clamp((now-previous)/1000,0,.1);
    previous=now;
    if(locked()) {
      accumulator+=elapsed;
      while(accumulator>=fixedStep) {
        walkStep(fixedStep);
        accumulator-=fixedStep;
      }
      updateTarget();
    } else {
      accumulator=0;
    }
    if(mode==='orbit') {
      if(autoRotate && dragId===null && now-dragEndedAt>850 && !reduceMotion.matches) azimuth+=elapsed*(started ? .075 : .042);
      orbitTarget.lerp(targetGoal,reduceMotion.matches?1:1-Math.exp(-4*elapsed));
      radius=T.MathUtils.lerp(radius,targetRadius,reduceMotion.matches?1:1-Math.exp(-8*elapsed));
      updateTour(now);
      const fit=fitDistance();
      const r=radius*fit, flat=r*Math.cos(elevation);
      scene.fog.near=490*fit;
      scene.fog.far=1560*fit;
      orbitCam.position.set(orbitTarget.x+Math.sin(azimuth)*flat,
                            orbitTarget.y+r*Math.sin(elevation),
                            orbitTarget.z+Math.cos(azimuth)*flat);
      if(detailFocus==='colonnade')orbitCam.position.y=Math.max(1.65,orbitCam.position.y);
      orbitCam.lookAt(orbitTarget);
      orbitCam.updateMatrixWorld();
      updateLabels();
    }
    if(now-lastMap>64) {
      updateMap();
      lastMap=now;
    }
    const nearGate=mode==='orbit'?selected?.id==='doorSouth'&&radius<100:Math.hypot(walkCam.position.x-54.45,walkCam.position.z-297)<42;
    const nearMain=mode==='orbit'?selected?.id==='main'&&!viewingAxis&&radius<160:Math.hypot(walkCam.position.x-campusAxis.origin.x,walkCam.position.z-campusAxis.origin.z)<82;
    const columnCenter=campusAxis.at(campusAxis.colonnade);
    const nearColumn=mode==='orbit'?selected?.id==='main'&&detailFocus==='colonnade':Math.hypot(walkCam.position.x-columnCenter.x,walkCam.position.z-columnCenter.z)<21;
    const detailArea=nearGate?'gate':nearColumn?'colonnade':nearMain?'main':false;
    const activeCamera=mode==='orbit'?orbitCam:walkCam;
    const fit=mode==='orbit'?fitDistance():1;
    weather.update(elapsed,activeCamera,detailArea,mode,{near:mode==='orbit'?490*fit:285,far:mode==='orbit'?1560*fit:1100});
    rendering.render(activeCamera,detailArea);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
