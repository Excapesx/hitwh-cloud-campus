import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { surfaceMaterial } from './realism.js';

// The front directions follow the traced roads and entrances. Photo proportions
// are approximate and are kept within each site's existing map envelope.
export const photoBuildings = {
  library: { yaw:-Math.PI/2, detail:'外倾椭圆窗墙、宽台阶、屋顶放射状玻璃天窗和蓝绿檐口灯' },
  research1: { yaw:Math.PI, detail:'浅色中央穹顶、环窗鼓座、立柱与两翼顶层拱窗' },
  gong: { yaw:0, detail:'红色圆顶与小塔、三角山花、绿色玻璃和柱廊阳台' },
  ning: { yaw:Math.PI/2, detail:'门式外框、蓝色采光顶、内院及内退玻璃幕墙' },
  zhi: { yaw:Math.PI/2, detail:'宁学楼下的暖红色外挑体量和玻璃入口' },
  incubator: { yaw:Math.PI/2, detail:'浅黄色多翼立面、白色竖饰与山花、灰石拱券基座' },
  activity: { yaw:0, detail:'红褐色大门框、外侧斜墙和内院弧形玻璃门厅' },
  gym: { yaw:0, detail:'玫砖红色顶部横梁、分格饰板、白色玻璃门厅和竖向窄窗' },
  ming: { yaw:Math.PI, detail:'红色双翼、中央弧形玻璃门厅、白色横向腰线和入口顶棚桁架' },
  xuezi: { yaw:-Math.PI/2, detail:'蓝玻璃楼梯塔、通高门厅、多级宽台阶、便民文创亭、米黄侧翼与砖红基座' },
  xueyuan: { yaw:0, detail:'双侧阶梯、深挑门廊、圆柱和青绿色楼梯雨棚' },
  store: { yaw:0, detail:'低层石材立面、拱形展窗、叠层檐口和玻璃门' },
  d5A: { yaw:0, detail:'浅色端墙、四列拱顶窗、中央阳台和门廊' },
  d6A: { yaw:0, detail:'暖黄色立面、粗凿石基座、通高壁柱网格、深色窗格、三角山花与修剪绿篱' },
  d6B: { yaw:0, detail:'暖黄色立面、粗凿石基座、通高壁柱网格与深色窗格' },
  d8: { yaw:Math.PI/2, detail:'橙色端墙、白色横带、连续窗格和内凹连接翼' },
  d10: { yaw:-Math.PI/2, detail:'红色双翼、通高玻璃竖带和朝海弧形门厅' },
  d11: { yaw:Math.PI/2, detail:'红色双翼、通高玻璃竖带和与 10 公寓相向的弧形门厅' },
  d12: { yaw:-Math.PI/2, detail:'浅黄色双翼、深红基座、顶层拱窗和竹贤书院门厅' },
  d13A: { yaw:0, detail:'13 层条形宿舍楼、米白色通高竖肋和灰色窗带' },
  d13B: { yaw:0, detail:'13 层条形宿舍楼、米白色通高竖肋和灰色窗带' },
  d14A: { yaw:0, detail:'白色竖向格栅、深灰基座和抬高的平台' },
  d14B: { yaw:0, detail:'白色竖向格栅、深灰基座和抬高的平台' },
  d14C: { yaw:0, detail:'白色竖向格栅、深灰基座和抬高的平台' },
  international: { yaw:-Math.PI/2, detail:'淡黄色宿舍翼楼、红棕色石材基座、顶层拱窗和侧边低楼' },
  water: { yaw:Math.PI, detail:'灰色低层实验厂房、浅色山墙、水平腰线和细框窗洞' },
};

export function createPhotoBuildingKit({T,mesh,registerMesh,addCollider}) {
  const materials = {
    cream:surfaceMaterial(T,'stone',{color:0xe6ddc8,roughness:.84}),
    ivory:surfaceMaterial(T,'stone',{color:0xf2ede3,roughness:.75}),
    gray:surfaceMaterial(T,'stone',{color:0x8c8c89,roughness:.87}),
    red:surfaceMaterial(T,'plaster',{color:0xa34037,roughness:.9}),
    terra:surfaceMaterial(T,'plaster',{color:0xc16c49,roughness:.91}),
    orange:surfaceMaterial(T,'plaster',{color:0xd1935c,roughness:.88}),
    brick:surfaceMaterial(T,'stone',{color:0x714b40,roughness:.91}),
    rose:surfaceMaterial(T,'plaster',{color:0xb5635f,roughness:.87}),
    roseJoint:new T.MeshStandardMaterial({color:0x8f4e4d,roughness:.93}),
    frameRed:surfaceMaterial(T,'plaster',{color:0x9c4b3f,roughness:.88}),
    roof:surfaceMaterial(T,'paving',{color:0x989084,roughness:.94}),
    darkRoof:surfaceMaterial(T,'paving',{color:0x414751,roughness:.92}),
    blue: new T.MeshPhysicalMaterial({color:0x28576c,roughness:.24,metalness:.12,clearcoat:.55}),
    green: new T.MeshPhysicalMaterial({color:0x305c57,roughness:.32,metalness:.06}),
    teal: new T.MeshStandardMaterial({color:0x4fa5a0,roughness:.38,metalness:.16}),
    xueziRed: surfaceMaterial(T,'stone',{color:0x8e4238,roughness:.88}),
    xueziCream: surfaceMaterial(T,'plaster',{color:0xf0e6d2,roughness:.82}),
    d6Yellow: surfaceMaterial(T,'plaster',{color:0xe5c994,roughness:.86}),
    d6Stone: surfaceMaterial(T,'stone',{color:0x9a7b6b,roughness:.89}),
    d6Dark: new T.MeshStandardMaterial({color:0x34373a,roughness:.68}),
    hedge: new T.MeshStandardMaterial({color:0x3b5f30,roughness:.92}),
    cypress: new T.MeshStandardMaterial({color:0x254224,roughness:.9}),
    booth: surfaceMaterial(T,'plaster',{color:0xded4b8,roughness:.82}),
    metal: new T.MeshStandardMaterial({color:0x727980,roughness:.6,metalness:.35}),
  };
  for(const glass of [materials.blue,materials.green]){
    glass.userData.nightWindow=true;
    glass.userData.nightBrightness=.27;
  }
  const roofGlass=materials.blue.clone();
  roofGlass.userData={nightWindow:true,nightBrightness:.57,nightColor:0x3988e5};
  const roofLamps=[0x3e6cd3,0x429caa,0x5aa986].map(color=>{
    const lamp=new T.MeshStandardMaterial({color,roughness:.52});
    lamp.userData={nightOutline:true,nightColor:color,nightPower:2.2};
    return lamp;
  });

  return function build(entry,ground) {
    const {id,x,z,spec}=entry;
    const {yaw}=photoBuildings[id];
    const crosswise=Math.abs(Math.sin(yaw))>.5;
    const w=crosswise?spec.d:spec.w,d=crosswise?spec.w:spec.d;
    const buckets=new Map();
    const worldPoint=(u,v)=>({x:x+u*Math.cos(yaw)+v*Math.sin(yaw),z:z-u*Math.sin(yaw)+v*Math.cos(yaw)});
    function emit(geometry,material) {
      if(!buckets.has(material))buckets.set(material,[]);
      const part=geometry.index?geometry.toNonIndexed():geometry;
      if(part!==geometry)geometry.dispose();
      buckets.get(material).push(part);
    }
    function bounds(u,y,v,a,h,b) {
      const p=worldPoint(u,v),width=crosswise?b:a,depth=crosswise?a:b;
      addCollider(p.x,ground+y,p.z,width,h,depth);
      entry.faces.push({x:p.x,z:p.z,w:width,d:depth,top:ground+y+h});
    }
    function box(u,y,v,a,h,b,mat=materials.ivory,solid=false,angle=0) {
      const geo=new T.BoxGeometry(a,h,b);geo.rotateY(angle);geo.translate(u,y+h/2,v);
      emit(geo,mat);
      if(solid)bounds(u,y,v,a,h,b);
      entry.top=Math.max(entry.top,ground+y+h);
    }
    function drum(u,y,v,rx,rz,h,mat,top=1) {
      const geo=new T.CylinderGeometry(top,1,h,80);
      geo.scale(rx,1,rz);geo.translate(u,y+h/2,v);emit(geo,mat);
      entry.top=Math.max(entry.top,ground+y+h);
    }
    function dome(u,y,v,r,h,mat) {
      const geo=new T.SphereGeometry(1,32,12,0,Math.PI*2,0,Math.PI/2);
      geo.scale(r,h,r);geo.translate(u,y,v);emit(geo,mat);
      entry.top=Math.max(entry.top,ground+y+h);
    }
    function panel(u,y,v,width,h,glass=materials.blue,angle=0,divisions=1) {
      box(u,y-.06,v,width+.12,h+.12,.14,materials.gray,false,angle);
      box(u+Math.sin(angle)*.085,y,v+Math.cos(angle)*.085,width,h,.035,glass,false,angle);
      for(let i=1;i<divisions;i++){
        const shift=(i/divisions-.5)*width;
        box(u+Math.cos(angle)*shift+Math.sin(angle)*.12,y,v-Math.sin(angle)*shift+Math.cos(angle)*.12,.065,h,.06,materials.ivory,false,angle);
      }
    }
    function arch(u,y,v,width,h,mat=materials.blue,angle=0) {
      const radius=width/2;
      const s=new T.Shape();
      s.moveTo(-radius,0);s.lineTo(radius,0);s.lineTo(radius,h-radius);
      s.absarc(0,h-radius,radius,0,Math.PI,false);s.closePath();
      const geo=new T.ShapeGeometry(s,16);geo.rotateY(angle);geo.translate(u,y,v);emit(geo,mat);
      box(u,y-.12,v,width+.24,.12,.17,materials.ivory,false,angle);
    }
    function mass(u,v,a,b,h,wall,{base=materials.gray,rows=4,front=true,columns=Math.max(3,Math.round(a/2.65)),arches=false,stripes=false,glass=materials.blue}={}) {
      box(u,0,v,a,h,b,wall,true);
      box(u,0,v,a+.13,.65,b+.13,base);
      box(u,h-.24,v,a+.35,.35,b+.35,materials.ivory);
      box(u,h+.12,v,a-.35,.09,b-.35,materials.roof);
      const pitch=(h-.85)/rows;
      for(let row=0;row<rows;row++){
        const y=.75+row*pitch;
        if(stripes&&row)box(u,y-.19,v,a+.1,.13,b+.1,materials.ivory);
        for(let i=0;i<columns;i++){
          const px=u+((i+.5)/columns-.5)*a*.91;
          if(front){
            if(arches&&row===rows-1)arch(px,y,v+b/2+.085,a*.55/columns,pitch*.73,glass);
            else panel(px,y,v+b/2+.04,a*.55/columns,pitch*.65,glass);
          }
          panel(px,y,v-b/2-.04,a*.53/columns,pitch*.62,glass,Math.PI);
        }
        const sideColumns=Math.max(2,Math.round(b/3.4));
        for(const side of [-1,1])for(let i=0;i<sideColumns;i++){
          panel(u+side*(a/2+.04),y,v+((i+.5)/sideColumns-.5)*b*.9,b*.54/sideColumns,pitch*.63,glass,side*Math.PI/2);
        }
      }
    }
    function stairs(u,v,width,run,rise,count) {
      for(let i=0;i<count;i++){
        const depth=run*(count-i)/count;
        box(u,0,v+depth/2,width,rise*(i+1)/count,depth,materials.gray);
      }
    }
    function pediment(u,y,v,width,rise) {
      const geo=new T.ExtrudeGeometry(new T.Shape([
        new T.Vector2(-width/2,0),new T.Vector2(width/2,0),new T.Vector2(0,rise)
      ]),{depth:.45,bevelEnabled:false});
      geo.translate(u,y,v);emit(geo,materials.ivory);
      entry.top=Math.max(entry.top,ground+y+rise);
    }
    function cornice(v,width,y) {box(0,y,v,width,.27,1.25,materials.ivory);}
    function lettering(text,u,y,v,width,h,color='#b29552',vertical=false) {
      const canvas=document.createElement('canvas');
      canvas.width=vertical?96:768;canvas.height=vertical?[...text].length*96:144;
      const ctx=canvas.getContext('2d');
      ctx.fillStyle=color;ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.font=`700 ${vertical?67:110}px "Microsoft YaHei",sans-serif`;
      if(vertical){
        [...text].forEach((char,i)=>ctx.fillText(char,48,48+i*96));
      } else {
        ctx.fillText(text,384,75,734);
      }
      const texture=new T.CanvasTexture(canvas);
      texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=4;
      const geo=new T.PlaneGeometry(width,h);geo.translate(u,y,v);
      emit(geo,new T.MeshStandardMaterial({map:texture,alphaTest:.25,roughness:.86}));
    }
    function porch(u,v,width,h,mat=materials.ivory) {
      box(u,h,v+.66,width,.35,2.7,mat);
      for(const s of [-1,1])drum(u+s*width*.39,.15,v+1.48,.3,.3,h-.15,mat);
      panel(u,.3,v+.04,width*.64,h-.48,materials.green,0,4);
      stairs(u,v+1.7,width*1.14,1.45,.35,3);
    }
    function curvedLobby(v,width,h,color) {
      drum(0,0,v,width/2,2,h,materials.blue);bounds(0,0,v,width,h,4);
      drum(0,h*.58,v,width/2+.13,2.08,h*.22,color);
      drum(0,h*.94,v,width/2+.15,2.13,.22,materials.ivory);
      for(let i=0;i<11;i++){
        const a=(i/10-.5)*Math.PI*.82;
        box(Math.sin(a)*width/2,.3,v+Math.cos(a)*2.03,.16,h*.6,.17,color,false,a);
      }
      stairs(0,v+1.9,width*.67,1.35,.37,3);
    }
    function beamBetween(a,b,width,mat) {
      const vector=b.clone().sub(a);
      const mid=a.clone().addScaledVector(vector,.5);
      const geo=new T.BoxGeometry(width,vector.length(),width);
      geo.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),vector.normalize()));
      geo.translate(mid.x,mid.y,mid.z);emit(geo,mat);
    }
    function tower(fourteen) {
      const width=w*.95,depth=d*.91,podium=fourteen?4.6:2.25;
      const wall=fourteen?M.ivory:M.cream;
      const height=spec.floors*2.5, pitch=(height-podium-.4)/(spec.floors-(fourteen?2:1));
      box(0,0,0,w*.99,podium,d*.99,fourteen?M.gray:wall,true);
      box(0,podium,0,width,height-podium,depth,fourteen?M.gray:wall,true);
      for(const angle of [0,Math.PI/2,Math.PI,-Math.PI/2]){
        const cross=Math.abs(Math.sin(angle))>.5;
        const span=cross?depth:width,face=(cross?width:depth)/2;
        const bays=cross?5:12, spacing=span/bays;
        const c=Math.cos(angle),s=Math.sin(angle);
        const pos=(u,v)=>[c*u+s*v,-s*u+c*v];
        for(let i=0;i<bays;i++){
          const u=(i+.5-bays/2)*spacing;
          const [ux,uz]=pos(u,face+.075);
          for(let y=podium+.27;y+pitch*.78<height;y+=pitch)panel(ux,y,uz,spacing*.51,pitch*.72,M.blue,angle);
          const [vx,vz]=pos(u-spacing/2,face+.08);
          box(vx,podium,vz,fourteen?.16:.24,height-podium,.37,wall,false,angle);
        }
        const [ux,uz]=pos(span/2,face+.08);
        box(ux,podium,uz,.24,height-podium,.37,wall,false,angle);
      }
      box(0,height-.15,0,width+.18,.31,depth+.18,wall);
      if(fourteen){
        box(0,.04,0,w*1.05,1.12,d*1.16,M.ivory);
        stairs(0,d*.52,w*.42,2.2,1.12,6);
        for(const s of [-1,1]){
          box(s*width*.485,height,0,.28,.91,depth,M.ivory);
          box(0,height,s*depth*.485,width,.91,.28,M.ivory);
        }
      }
      panel(0,.34,d*.496,w*.19,fourteen?2.3:1.75,M.blue,0,4);
    }

    const M=materials;
    switch(id){
      case 'library': {
        const rx=w*.49,rz=d*.46;
        drum(0,0,0,rx*.87,rz*.88,6.1,M.blue);
        for(const y of [.65,3.35,5.8])drum(0,y,0,rx*.9,rz*.9,.42,M.ivory);
        drum(0,6.1,0,rx*.91,rz*.92,7.6,M.ivory,1.1);
        drum(0,13.7,0,rx,rz,.3,M.ivory);
        drum(0,14,0,rx*.72,rz*.73,2.3,roofGlass);
        drum(0,16.3,0,rx*.73,rz*.74,.22,M.darkRoof);
        const eyeRadius=rx*.28,roofY=16.52;
        drum(0,roofY,0,eyeRadius+.13,eyeRadius+.13,.13,M.ivory);
        dome(0,roofY+.12,0,eyeRadius,1.34,roofGlass);
        for(let i=0;i<20;i++){
          const angle=i*Math.PI/10;
          for(let j=0;j<6;j++){
            const point=t=>new T.Vector3(Math.sin(angle)*eyeRadius*Math.cos(t),roofY+.145+1.34*Math.sin(t),Math.cos(angle)*eyeRadius*Math.cos(t));
            beamBetween(point(j*Math.PI/12),point((j+1)*Math.PI/12),.058,M.ivory);
          }
        }
        box(eyeRadius*.94,roofY+.025,eyeRadius*.75,eyeRadius*.91,.12,.83,roofGlass,false,-.65);
        for(let i=0;i<3;i++){
          const a=i*Math.PI*2/3,b=(i+1)*Math.PI*2/3;
          const curve=new T.CatmullRomCurve3(Array.from({length:41},(_,j)=>{
            const t=a+(b-a)*j/40;
            return new T.Vector3(Math.sin(t)*rx*.731,16.38,Math.cos(t)*rz*.741);
          }));
          emit(new T.TubeGeometry(curve,60,.052,5,false),roofLamps[i]);
        }
        for(let row=0;row<5;row++)for(let i=0;i<90;i++){
          const a=(i/90)*Math.PI*2,y=6.91+row*1.34;
          if(row===0&&Math.cos(a)>.96)continue;
          const sin=Math.sin(a),cos=Math.cos(a);
          const shellX=rx*.91,shellZ=rz*.92;
          const r=1+.1*(y-6.1)/7.6;
          const angle=Math.atan2(sin/shellX,cos/shellZ);
          const slope=.1/7.6/Math.hypot(sin/shellX,cos/shellZ);
          const geo=new T.BoxGeometry(1.03,.82,.035);
          geo.rotateX(Math.atan(slope)).rotateY(angle);
          geo.translate(sin*shellX*r+.042*Math.sin(angle),y,cos*shellZ*r+.042*Math.cos(angle));
          emit(geo,M.blue);
        }
        for(let i=0;i<70;i++){
          const a=i/70*Math.PI*2;
          box(Math.sin(a)*rx*.722,14,Math.cos(a)*rz*.734,.075,2.25,.085,M.ivory,false,a);
        }
        const entryZ=rz*.84;
        box(0,3.3,entryZ+1.04,w*.30,2.7,.48,M.blue);
        panel(0,3.37,entryZ+1.3,w*.29,2.61,M.blue,0,7);
        box(0,5.98,entryZ+1,w*.33,.35,2.4,M.ivory);
        for(const s of [-1,1])drum(s*w*.13,3.25,entryZ+1.85,.23,.23,2.8,M.ivory);
        stairs(0,entryZ+1,w*.33,9.7,3.25,19);
        for(const s of [-1,1]){
          for(let i=0;i<19;i++){
            const step=9.7*(1-i/19);
            box(s*w*.178,0,entryZ+1+step/2,.9,(i+1)*3.25/19+.15,step,M.cream);
          }
          for(let i=0;i<6;i++)box(s*w*.163,.3+i*.57,entryZ+9.7-i*1.64,.075,.94,.075,M.gray);
          const rail=new T.BoxGeometry(.085,.085,10.2);
          rail.rotateX(.32);rail.translate(s*w*.163,2.78,entryZ+5.85);emit(rail,M.gray);
        }
        // Narrow rectangles follow the oval for more faithful collision at its ends.
        for(let j=-4;j<=4;j++){
          const vz=j*rz/4.5,half=rx*.9*Math.sqrt(1-(vz/rz)**2);
          bounds(0,0,vz,2*half,6.1,rz/4.48);
        }
        break;
      }
      case 'research1': {
        const wing=w*.25,front=d*.29;
        mass(0,-d*.16,w*.95,d*.36,15,M.cream,{rows:5});
        for(const s of [-1,1])mass(s*w*.35,d*.14,wing,d*.68,14,M.cream,{rows:5,arches:true});
        mass(0,d*.05,w*.46,d*.49,17.8,M.cream,{rows:5,front:false});
        const r=w*.157;
        drum(0,17.8,d*.08,r*1.07,r*1.07,2.8,M.ivory);
        for(let i=0;i<24;i++){
          const a=i/24*Math.PI*2;
          panel(Math.sin(a)*r*1.08,18.2,d*.08+Math.cos(a)*r*1.08,.75,1.8,M.blue,a);
        }
        drum(0,20.6,d*.08,r*1.13,r*1.13,.35,M.ivory);
        dome(0,20.94,d*.08,r,5.25,M.ivory);
        drum(0,26.05,d*.08,.1,.1,1.55,M.gray);
        for(let i=-2;i<=2;i++)arch(i*w*.067,6.2,front+.63,w*.05,7.8);
        for(let i=-3;i<=3;i++)box((i+.48)*w*.067,5.6,front+.8,.25,8.6,.62,M.ivory);
        box(0,14.22,front+.63,w*.43,.26,.74,M.ivory);
        for(let i=-3;i<=3;i++)panel(i*w*.056,14.76,front+.31,.76,1.84,M.blue);
        porch(0,front+.25,w*.31,4.5);
        break;
      }
      case 'gong': {
        const face=d*.29;
        mass(0,-d*.05,w*.97,d*.68,10.6,M.ivory,{rows:3,front:false});
        for(const s of [-1,1]){
          mass(s*w*.34,d*.04,w*.28,d*.66,9.6,M.ivory,{rows:3,glass:M.green,arches:true});
          drum(s*w*.19,10.1,face-.8,.87,.87,1.35,M.ivory);
          dome(s*w*.19,11.45,face-.8,.94,1.07,M.red);
        }
        box(0,0,face,w*.3,11.35,3.9,M.ivory,true);
        for(let i=-1;i<=1;i++)panel(i*w*.083,5.15,face+2.03,w*.071,3.3,M.green);
        porch(0,face+2,w*.31,4.25);
        for(const u of [-.108,-.036,.036,.108])drum(u*w,4.59,face+2.26,.18,.18,5.81,M.ivory);
        box(0,4.58,face+2.32,w*.26,.16,1.1,M.ivory);
        box(0,5.27,face+2.9,w*.26,.1,.17,M.ivory);
        for(let i=-6;i<=6;i++)drum(i*w*.019,4.74,face+2.9,.052,.052,.53,M.ivory);
        pediment(0,10.9,face+1.85,w*.36,1.1);
        drum(0,11.6,face-1,2.0,2.0,1.55,M.ivory);
        dome(0,13.14,face-1,2.1,2.2,M.red);
        drum(0,15.32,face-1,.09,.09,.9,M.gray);
        break;
      }
      case 'ning': {
        mass(0,-d*.32,w*.97,d*.32,13.8,M.ivory,{rows:4,front:false});
        for(const s of [-1,1]){
          mass(s*w*.39,0,w*.22,d*.97,14,M.ivory,{rows:4,columns:4});
          for(let i=0;i<4;i++)box(s*(w*.18+i*w*.052),.05,d*.36,.48,13.3,.59,M.ivory,true);
        }
        const back=-d*.15;
        box(0,0,-d*.34,w*.55,.18,d*.34,M.gray);
        box(0,.25,back,w*.55,12.7,.2,M.blue,true);
        for(let i=-6;i<=6;i++)box(i*w*.043,.25,back+.13,.065,12.7,.1,M.ivory);
        for(let i=1;i<4;i++)box(0,i*3.16,back+.15,w*.55,.12,.11,M.ivory);
        const canopy=d*.3;
        box(0,13.1,canopy,w*.98,1.42,d*.32,M.ivory);
        box(0,13.08,.5,w*.56,.18,d*.45,M.blue);
        for(let i=-6;i<=6;i++)box(i*w*.043,13.26,.5,.055,.07,d*.45,M.ivory);
        for(let i=-6;i<=6;i++)box(0,13.26,.5+i*d*.033,w*.56,.07,.055,M.ivory);
        stairs(0,d*.363,w*.62,4.7,.75,6);
        break;
      }
      case 'zhi': {
        mass(0,0,w,d,5.8,M.terra,{rows:2,front:false});
        panel(0,.75,d/2+.04,w*.84,4.15,M.blue,0,5);
        box(0,5.1,d/2+.17,w*.92,.31,.4,M.ivory);
        break;
      }
      case 'incubator': {
        const h=18.9;
        mass(-w*.23,0,w*.53,d*.98,h,M.cream,{rows:6,front:false,columns:6});
        mass(w*.23,-d*.25,w*.41,d*.48,h,M.cream,{rows:6,columns:5});
        mass(w*.21,d*.24,w*.38,d*.46,h-.55,M.cream,{rows:6});
        const front=d*.49;
        box(-w*.23,0,front+.12,w*.54,3.35,.35,M.gray);
        for(let i=0;i<8;i++){
          const u=-w*.48+(i+.5)*w*.51/8;
          arch(u,.28,front+.31,w*.041,2.68);
          for(let row=0;row<6;row++)panel(u,3.7+row*2.43,front+.06,w*.033,1.58);
          box(u+w*.026,3.45,front+.14,.16,15.4,.15,M.ivory);
        }
        cornice(front+.06,w,18.1);
        pediment(-w*.23,18.65,front+.04,w*.24,1.08);
        break;
      }
      case 'activity': {
        const front=d*.415,beamY=11.05;
        mass(0,-d*.35,w*.94,d*.26,9.3,M.cream,{rows:3,base:M.frameRed});
        for(const s of [-1,1]){
          mass(s*w*.36,-d*.075,w*.27,d*.77,9.4,M.cream,{rows:3,base:M.frameRed,stripes:true});
          for(let i=0;i<8;i++)box(s*w*.221,0,(i/7-.5)*d*.68-d*.075,.44,9.6,.34,M.frameRed);
          box(s*w*.36,9.35,-d*.075,w*.28,.58,d*.78,M.frameRed);
        }
        curvedLobby(-d*.13,w*.46,4.3,M.frameRed);
        // Photo 14 shows the courtyard lobby through this separate outer frame.
        box(0,beamY,front,w*.99,1.77,1.5,M.frameRed);
        for(const f of [-.449,-.15,.145])box(w*f,.34,front,w*.065,beamY-.34,1.48,M.frameRed,true);
        const edge=new T.Shape([
          new T.Vector2(w*.355,.34),new T.Vector2(w*.492,.34),
          new T.Vector2(w*.495,beamY+1.77),new T.Vector2(w*.38,beamY+1.77)
        ]);
        const upright=new T.ExtrudeGeometry(edge,{depth:d*.31,bevelEnabled:false});
        upright.translate(0,0,front+.72-d*.31);emit(upright,M.frameRed);
        bounds(w*.425,.34,front-d*.155+.72,w*.14,beamY+1.43,d*.31);
        box(0,.05,front,w*.98,.28,2.1,M.gray);
        lettering('大学生活动中心',w*.145,3.4,front+.79,.45,2.72,'#dedbd1',true);
        entry.top=Math.max(entry.top,ground+beamY+1.77);
        break;
      }
      case 'gym': {
        mass(-w*.26,-d*.021,w*.48,d*.86,8.6,M.rose,{rows:3,columns:9});
        mass(w*.288,-d*.02,w*.42,d*.9,12.2,M.rose,{rows:3,columns:8,front:false});
        const headerX=w*.185,headerWidth=w*.63,trimZ=d*.487;
        box(headerX,10.46,d*.414,headerWidth,2.15,2.89,M.rose);
        for(let i=1;i<18;i++)box(headerX+(i/18-.5)*headerWidth,10.47,trimZ,.031,2.13,.033,M.roseJoint);
        for(let i=1;i<4;i++)box(headerX,10.46+i*.535,trimZ,headerWidth,.033,.031,M.roseJoint);
        for(let i=0;i<8;i++)for(let row=0;row<3;row++){
          panel(w*.152+i*w*.043,1.11+row*2.91,d*.433,.61,2.39,M.blue);
        }
        box(-w*.005,.05,d*.346,w*.227,10.41,1.1,M.ivory,true);
        panel(-w*.005,.35,d*.346+.59,w*.185,3.7,M.blue,0,5);
        panel(-w*.005,4.66,d*.346+.59,w*.185,4.84,M.blue,0,3);
        box(w*.115,.08,d*.496,.86,10.44,.38,M.rose);
        lettering('综合球类馆',w*.115,7.06,d*.496+.21,.62,3.53,'#e7dccf',true);
        stairs(-w*.01,d*.39,w*.33,2.7,.55,4);
        break;
      }
      case 'ming': {
        // 明学楼的照片视角能看到两侧红色楼翼、中央弧形门厅和顶部轻型雨棚。
        // 保留完整玻璃竖带，让从运动场方向看过去时建筑识别度足够高。
        const front=d*.43;
        mass(0,-d*.34,w*.94,d*.37,13.9,M.rose,{rows:4,columns:10,base:M.brick,stripes:true});
        for(const s of [-1,1]) {
          const u=s*w*.34;
          mass(u,-d*.02,w*.28,d*.86,14.65,M.rose,{rows:4,columns:4,base:M.brick,stripes:true,front:false});
          box(u-s*w*.04,.65,front+.16,w*.12,13.8,.5,M.blue);
          for(let row=1;row<5;row++)box(u-s*w*.04,row*2.86,front+.44,w*.122,.11,.1,M.ivory);
          box(u+s*w*.08,.58,front+.13,.27,14.85,.46,M.ivory);
        }
        curvedLobby(front,w*.48,5.15,M.frameRed);
        panel(0,.5,front+2.05,w*.28,4.25,M.blue,0,8);
        box(0,5.13,front+.1,w*.5,.42,3.9,M.ivory);
        box(0,5.55,front+.1,w*.56,.16,4.3,M.frameRed);
        for(const s of [-1,1]) {
          const x=s*w*.205;
          box(x,.5,front+2.04,.22,5.2,.22,M.ivory);
          box(x,5.65,front+2.04,.22,.18,.22,M.ivory);
        }
        // 顶部罩棚用薄梁和立柱构成，避免门厅上方只剩一块平板。
        box(0,7.05,front+1.18,w*.56,.14,5.1,M.ivory);
        for(let i=-4;i<=4;i++) {
          const x=i*w*.062;
          box(x,5.72,front+2.95,.11,1.45,.11,M.ivory);
          box(x,7.05,front+2.95,.11,.65,.11,M.frameRed);
        }
        box(0,7.34,front+1.18,w*.61,.08,.08,M.frameRed);
        box(0,7.28,front+2.95,.08,.08,4.55,M.frameRed);
        for(let i=-3;i<=3;i++) {
          const x=i*w*.08;
          const brace=new T.BoxGeometry(.075,.075,4.55);
          brace.rotateX(i%2?.07:-.07);brace.translate(x,7.34,front+1.18);emit(brace,M.frameRed);
        }
        stairs(0,front+2.55,w*.38,3.7,.42,5);
        lettering('明学楼',0,3.18,front+2.09,w*.24,.68,'#e6d7b8');
        break;
      }
      case 'xuezi': {
        const v=d*.43;
        mass(0,-d*.08,w*.96,d*.85,12.7,M.ivory,{rows:4,front:false,base:M.red});
        mass(w*.33,0,w*.29,d*.95,14.1,M.ivory,{rows:4,columns:3,base:M.red});
        box(-w*.34,0,v-1,w*.25,15.2,2.8,M.blue,true);
        box(-w*.034,0,v-1,w*.42,12.65,2.4,M.blue,true);
        for(let row=1;row<=5;row++){
          box(-w*.34,row*2.97,v+.45,w*.266,.16,.4,M.ivory);
          if(row<5)box(-w*.03,row*2.72,v+.22,w*.45,.15,.37,M.ivory);
        }
        for(let i=-5;i<=5;i++)box(i*w*.036-w*.032,.6,v+.24,.055,11.9,.09,M.ivory);
        porch(-w*.035,v+.19,w*.3,2.75);
        lettering('学子餐厅',-w*.035,5.15,v+.36,w*.27,1.08);
        break;
      }
      case 'xueyuan': {
        mass(0,-d*.08,w*.97,d*.78,7.5,M.ivory,{rows:2,columns:8});
        const v=d*.33;
        box(0,5.75,v+1,w*.53,2.1,3.25,M.ivory);
        box(0,3.8,v+1,w*.53,.45,3.1,M.ivory);
        for(const s of [-1,1]){
          drum(s*w*.215,.15,v+2.4,.4,.4,5.7,M.ivory);
          for(let i=0;i<13;i++)box(s*(w*.41-i*w*.015),0,v+2.5,1.22,(i+1)*.29,1.8,M.gray);
        }
        const awning=new T.BoxGeometry(2.55,.18,5.4);awning.rotateX(.46);awning.translate(w*.23,4.3,v+3.25);emit(awning,M.teal);
        panel(0,.27,v+.29,w*.24,2.5,M.blue,0,4);
        lettering('学苑餐厅',0,6.82,v+2.64,w*.41,1.1);
        break;
      }
      case 'store': {
        const v=d*.43;
        mass(0,-d*.03,w*.96,d*.91,6.65,M.ivory,{rows:2,front:false});
        cornice(v,w,6.51);
        for(let i=-4;i<=4;i++){
          const u=i*w*.104;
          if(i%2===0)arch(u,.55,v+.085,w*.075,4.25);
          else panel(u,1.02,v+.08,w*.061,3.2,M.green,0,2);
          box(u+w*.051,0,v+.17,.29,6.4,.36,M.ivory);
        }
        porch(0,v+.11,w*.26,2.8);
        lettering('大学生服务区',0,6.11,v+.73,w*.47,.69,'#30667d');
        break;
      }
      case 'd5A': {
        const v=d*.45;
        mass(0,0,w*.95,d*.91,16.6,M.cream,{rows:6,columns:4,arches:true});
        pediment(0,16.65,v,w*.86,1.02);
        for(let i=0;i<4;i++){
          box(0,3.55+2.72*i,v+.42,w*.41,.26,1.45,M.ivory);
          for(let j=-7;j<=7;j++)box(j*w*.027,3.81+2.72*i,v+1.09,.08,.48,.11,M.ivory);
        }
        porch(0,v+.13,w*.48,3.7);
        break;
      }
      case 'd8': {
        mass(0,-d*.22,w*.95,d*.5,14.9,M.cream,{rows:6,stripes:true,base:M.brick});
        for(const s of [-1,1]){
          mass(s*w*.35,d*.1,w*.27,d*.74,16.2,M.orange,{rows:6,stripes:true,base:M.brick});
          box(s*w*.42,.65,d*.482,w*.077,15.38,.14,M.orange);
        }
        porch(0,d*.04,w*.36,3.1);
        break;
      }
      case 'd10':
      case 'd11': {
        mass(0,-d*.29,w*.93,d*.4,15.9,M.red,{rows:6,stripes:true});
        for(const s of [-1,1]){
          const u=s*w*.35,zFront=d*.45;
          mass(u,0,w*.28,d*.92,16.95,M.red,{rows:6,stripes:true,front:false});
          box(u-s*w*.025,.6,zFront+.18,w*.115,16.1,.48,M.blue);
          for(let i=1;i<7;i++)box(u-s*w*.025,i*2.4,zFront+.46,w*.116,.1,.1,M.ivory);
          box(u+s*w*.075,.6,zFront+.14,.27,17.0,.48,M.ivory);
          box(u+s*w*.125,16.9,zFront-.4,.32,1.0,1.25,M.red);
        }
        curvedLobby(d*.405,w*.44,6.35,M.red);
        panel(0,.55,d*.405+2.11,w*.27,5.2,M.blue,0,8);
        box(0,6.1,d*.405+2.25,w*.52,.1,.1,M.ivory);
        for(let i=-4;i<=4;i++)box(i*w*.06,6.03,d*.405+2.25,.075,.72,.075,M.ivory);
        lettering(id==='d10'?'拾海楼':'瞰海楼',0,2.26,d*.405+2.085,w*.225,.74,'#ead6a8');
        break;
      }
      case 'd12': {
        mass(0,-d*.34,w*.95,d*.31,14.9,M.cream,{rows:5,arches:true,base:M.brick});
        for(const s of [-1,1]){
          const u=s*w*.348;
          mass(u,.015,w*.286,d*.96,16.85,M.cream,{rows:6,arches:true,base:M.brick,columns:3});
          box(u,0,0,w*.289,2.11,d*.966,M.brick);
          pediment(u,16.86,d*.48,w*.278,1.16);
          for(const end of [-1,1])box(u+end*w*.124,2.1,d*.484,.27,14.62,.28,M.ivory);
        }
        mass(0,d*.35,w*.41,d*.19,3.8,M.ivory,{rows:1,columns:5});
        box(0,0,d*.452,w*.19,5.44,1.2,M.brick);
        arch(0,1.82,d*.452+.618,w*.135,2.89);
        panel(0,.4,d*.452+.64,w*.13,1.51,M.green,0,2);
        lettering('竹贤书院',0,1.83,d*.452+.73,w*.14,.54,'#eae5d4');
        stairs(0,d*.49,w*.22,1.17,.4,4);
        break;
      }
      case 'd13A':
      case 'd13B':
        tower(false);
        break;
      case 'd14A':
      case 'd14B':
      case 'd14C':
        tower(true);
        break;
      case 'international': {
        const height=14.9;
        mass(-w*.19,-d*.21,w*.57,d*.51,height,M.cream,{rows:5,arches:true,base:M.brick});
        mass(-w*.28,d*.15,w*.38,d*.56,height,M.cream,{rows:5,arches:true,base:M.brick,columns:4});
        mass(w*.234,d*.13,w*.45,d*.63,6.95,M.cream,{rows:2,base:M.brick,columns:4});
        for(const [u,a,roofY,v] of [[-w*.28,w*.38,height,d*.435],[w*.234,w*.45,6.95,d*.45]]){
          pediment(u,roofY+.09,v,a*.93,1.26);
          box(u,.05,v+.04,a*.95,2.52,.16,M.brick);
          porch(u,v+.19,a*.65,2.66);
        }
        break;
      }
      case 'water': {
        const face=d*.265;
        box(w*.11,0,-d*.035,w*.75,7.42,d*.60,M.gray,true);
        box(-w*.36,0,-d*.07,w*.27,5.43,d*.85,M.gray,true);
        box(w*.11,7.35,-d*.035,w*.78,.3,d*.64,M.ivory);
        box(-w*.36,5.33,-d*.07,w*.29,.22,d*.88,M.ivory);
        pediment(w*.11,7.6,face,w*.75,1.48);
        for(const y of [2.91,6.62])box(w*.11,y,face+.07,w*.75,.16,.28,M.ivory);
        const inset=new T.MeshStandardMaterial({color:0xa4a4a2,roughness:.94});
        for(let i=0;i<8;i++){
          const u=(-.218+i*.093)*w;
          box(u,3.52,face+.065,1.52,2.11,.13,M.ivory);
          box(u,3.65,face+.146,1.3,1.83,.03,inset);
          pediment(u,5.68,face+.09,1.62,.29);
        }
        for(const u of [-w*.42,w*.393]){
          box(u,.14,face+.075,1.47,2.62,.13,M.ivory);
          box(u,.19,face+.151,1.25,2.37,.10,M.brick);
        }
        panel(-w*.36,3.76,d*.356,w*.175,1.0,M.blue,0,3);
        break;
      }
    }
    for(const [material,parts] of buckets){
      const merged=mergeGeometries(parts);
      merged.rotateY(yaw);
      registerMesh(mesh(merged,material,x,ground,z),entry);
      for(const part of parts)part.dispose();
    }
  };
}
