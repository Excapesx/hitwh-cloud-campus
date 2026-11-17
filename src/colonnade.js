import { campusAxis, colonnadeLayout as L, colonnadePoint } from './campus-data.js';
import { surfaceMaterial } from './realism.js';

// 双排柱、独立石砌台座和连续曲面檐口。与主楼共用局部轴坐标。
export function buildColonnade({T,emit,block,worldSolid,trim,glow,granite}) {
  const e=(g,m,cast=true)=>emit(g,m,cast,false);
  const b=(x,y,z,w,h,d,m=trim,cast=true,bevel=.015)=>block(x,y,z,w,h,d,m,cast,false,bevel);
  const stoneColors=[0x9da397,0xa6aba1,0x989f95,0xadb2a7];
  const ashlar=stoneColors.map(color=>surfaceMaterial(T,'stone',{color,roughness:.96}));
  const frieze=surfaceMaterial(T,'stone',{color:0x65716a,roughness:.76});
  const ceiling=surfaceMaterial(T,'plaster',{color:0xdedfd3,roughness:.94});
  const bronze=surfaceMaterial(T,'metal',{color:0x67756c,roughness:.62,metalness:.35});
  const cylinder=(x,y,z,r,h,mat=trim,top=r,segments=32)=>{
    const g=new T.CylinderGeometry(top,r,h,segments);g.translate(x,y+h/2,z);e(g,mat);
  };
  const ring=(x,y,z,r,tube)=>{const g=new T.TorusGeometry(r,tube,8,48);g.rotateX(Math.PI/2);g.translate(x,y,z);e(g,trim);};
  function band(y,h,inner,outer,mat,cast=true) {
    const shape=new T.Shape(),n=128;
    for(let i=0;i<=n;i++){const a=-L.halfAngle+2*L.halfAngle*i/n,p=colonnadePoint(a,outer);i?shape.lineTo(p.x,-p.z):shape.moveTo(p.x,-p.z);}
    for(let i=n;i>=0;i--){const p=colonnadePoint(-L.halfAngle+2*L.halfAngle*i/n,inner);shape.lineTo(p.x,-p.z);}
    shape.closePath();const g=new T.ExtrudeGeometry(shape,{depth:h,bevelEnabled:false});g.rotateX(-Math.PI/2);g.translate(0,y,0);e(g,mat,cast);
  }
  function leaf(x,y,z,angle,radius,h=.3) {
    const shape=new T.Shape();shape.moveTo(0,0);shape.lineTo(-.08,.06);shape.lineTo(-.12,.13);shape.lineTo(-.07,.17);shape.lineTo(-.09,.23);shape.lineTo(0,.33);shape.lineTo(.09,.23);shape.lineTo(.07,.17);shape.lineTo(.12,.13);shape.lineTo(.08,.06);shape.closePath();
    const g=new T.ExtrudeGeometry(shape,{depth:.028,bevelEnabled:true,bevelThickness:.005,bevelSize:.005,bevelSegments:1});
    g.scale(1,h/.33,1);g.rotateX(-.33);g.translate(0,0,radius);g.rotateY(angle);g.translate(x,y,z);e(g,trim);
  }
  function capital(x,y,z) {
    cylinder(x,y,z,.225,.13,trim,.27);
    cylinder(x,y+.13,z,.255,.3,trim,.33,40);
    for(let i=0;i<8;i++)leaf(x,y+.04,z,i*Math.PI/4,.23,.32);
    for(let i=0;i<8;i++)leaf(x,y+.2,z,(i+.5)*Math.PI/4,.26,.31);
    for(let i=0;i<4;i++) {
      const angle=Math.PI/4+i*Math.PI/2,points=[];
      for(let k=0;k<=24;k++){const t=k/24,a=t*Math.PI*3.1,r=.1*(1-t)+.018;points.push(new T.Vector3(.29+Math.cos(a)*r,.35+Math.sin(a)*r,0));}
      const g=new T.TubeGeometry(new T.CatmullRomCurve3(points),24,.018,6,false);g.rotateY(angle);g.translate(x,y,z);e(g,trim);
    }
    b(x,y+.49,z,.74,.12,.74,trim);b(x,y+.61,z,.82,.1,.82,trim);
  }
  function column(x,z,index) {
    // 基座的石块是真实几何，灰缝、错缝和边角在斜光下仍能读出。
    b(x,.13,z,.89,.67,.89,ashlar[0]);
    for(let row=0;row<3;row++)for(let face=0;face<4;face++)for(let k=0;k<3;k++) {
      const along=(k-1)*.3+(row%2?.09:0),a=face*Math.PI/2;
      const g=new T.BoxGeometry(.285,.195,.07);g.translate(along,.25+row*.208,.45);g.rotateY(a);g.translate(x,0,z);e(g,ashlar[(index+row+k+face)%4]);
    }
    b(x,.8,z,1.04,.1,1.04,ashlar[1]);b(x,.9,z,.98,.07,.98,trim);
    cylinder(x,.97,z,.31,.12,trim,.285);ring(x,1.1,z,.265,.043);cylinder(x,1.13,z,.237,.12,trim,.22);
    const shaftHeight=3.39,radial=192,vertical=10;
    const shaft=new T.CylinderGeometry(.184,.215,shaftHeight,radial,vertical),p=shaft.attributes.position;
    for(let i=0;i<p.count;i++) {
      const yy=p.getY(i),t=yy/shaftHeight+.5,a=Math.atan2(p.getZ(i),p.getX(i));
      const flute=1-.056*(.5+.5*Math.cos(a*24)),entasis=1+.026*Math.sin(t*Math.PI);
      p.setX(i,p.getX(i)*flute*entasis);p.setZ(i,p.getZ(i)*flute*entasis);
    }
    shaft.computeVertexNormals();shaft.translate(x,1.25+shaftHeight/2,z);e(shaft,trim);
    ring(x,4.66,z,.19,.025);capital(x,4.64,z);
    worldSolid(x,.13,z,1.03,L.columnTop,1.03);
  }
  band(.03,.1,-1.8,1.8,granite,false);band(.13,.08,-1.55,1.55,trim,false);
  for(let i=0;i<L.pairs;i++) {
    const angle=-L.halfAngle+2*L.halfAngle*i/(L.pairs-1);
    for(const side of [-1,1]){const p=colonnadePoint(angle,side*L.rowOffset);column(p.x,p.z,i);}
    // 横向枋梁连接两排柱，梁底保留小筒灯。
    const p=colonnadePoint(angle),rib=new T.BoxGeometry(.57,.13,2.05);rib.rotateY(angle);rib.translate(p.x,L.columnTop-.03,p.z);e(rib,trim);
    const lamp=new T.CylinderGeometry(.065,.065,.025,16);lamp.translate(p.x,L.columnTop-.11,p.z);e(lamp,glow,false);
  }
  band(5.35,.12,-1.38,1.38,trim);band(5.47,.53,-1.3,1.3,ceiling);
  band(5.48,.09,-1.35,1.35,trim);band(5.99,.12,-1.4,1.4,trim);
  band(6.11,.1,-1.52,1.52,trim);band(6.21,.07,-1.55,1.55,bronze);
  band(6.285,.035,-1.55,-1.43,glow,false);band(6.285,.035,1.43,1.55,glow,false);
  // 正反面深色矩形饰板及五瓣花饰，与白色外檐形成实体凹凸层次。
  for(let bay=0;bay<L.pairs-1;bay++)for(const side of [-1,1]) {
    const a=-L.halfAngle+2*L.halfAngle*(bay+.5)/(L.pairs-1),p=colonnadePoint(a,side*1.312),w=2.2;
    const panel=new T.BoxGeometry(w,.255,.035);panel.rotateY(a);panel.translate(p.x,5.775,p.z);e(panel,frieze);
    for(let n=0;n<4;n++) {
      const xx=(n-1.5)*.43,g=new T.SphereGeometry(.038,8,6);g.scale(1,1,.38);g.translate(xx,0,side*.03);g.rotateY(a);g.translate(p.x,5.775,p.z);e(g,trim);
    }
  }
  // 顶部横向接缝、暗色泛水边及端部收口。
  for(let i=0;i<L.pairs;i++) {
    const a=-L.halfAngle+2*L.halfAngle*i/(L.pairs-1),p=colonnadePoint(a),g=new T.BoxGeometry(.035,.018,2.75);g.rotateY(a);g.translate(p.x,6.286,p.z);e(g,frieze,false);
  }
  for(const side of [-1,1]) {
    const a=side*L.halfAngle,p=colonnadePoint(a),g=new T.BoxGeometry(.22,.16,3.22);g.rotateY(a);g.translate(p.x,6.3,p.z);e(g,trim);
  }
  // 正中拱形饰冠：照片没有可读铭文，保留空白浮雕而不杜撰文字。
  const z=campusAxis.colonnade+1.38;
  const crest=new T.Shape();crest.moveTo(-1.4,0);crest.bezierCurveTo(-1.24,.3,-.85,.03,-.68,.3);crest.bezierCurveTo(-.65,.94,.65,.94,.68,.3);crest.bezierCurveTo(.85,.03,1.24,.3,1.4,0);crest.closePath();
  const crestGeo=new T.ExtrudeGeometry(crest,{depth:.15,bevelEnabled:true,bevelSize:.035,bevelThickness:.035,bevelSegments:2});crestGeo.translate(0,6.28,z);e(crestGeo,trim);
  const rimPoints=crest.getPoints(64).map(p=>new T.Vector3(p.x,6.28+p.y,z+.19));e(new T.TubeGeometry(new T.CatmullRomCurve3(rimPoints),64,.035,6,false),bronze);
}
