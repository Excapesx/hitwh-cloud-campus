import { displayLayout as L } from './campus-data.js';
import { surfaceMaterial } from './realism.js';

// 依据用户图二制作独立实体构件。年份保留参考照片中的 1985 / 2026，
// 不从截图推断活动名称、落成日期或铭文。
export function buildCommemorativeDisplay({T,emit,block,worldSolid,trim}) {
  const red=surfaceMaterial(T,'metal',{color:0xb70f20,metalness:.38,roughness:.34});
  const edge=surfaceMaterial(T,'metal',{color:0xec2431,metalness:.2,roughness:.3});
  edge.userData={nightOutline:true,nightColor:0xff1818,nightPower:.9};
  const white=surfaceMaterial(T,'stone',{color:0xf8f0d8,roughness:.5});
  white.userData={nightLamp:true,nightColor:0xffefce,nightPower:1.25};
  const blue=surfaceMaterial(T,'metal',{color:0x126a9e,metalness:.32,roughness:.33});
  const cyan=surfaceMaterial(T,'metal',{color:0x34a9cb,metalness:.25,roughness:.35});
  const soil=surfaceMaterial(T,'plaster',{color:0x49382a,roughness:1});
  const leaf=new T.MeshStandardMaterial({color:0x56782e,roughness:1});
  const fence=surfaceMaterial(T,'plaster',{color:0xe6e9d8,roughness:.8});
  const bloom=[0xe9c52e,0xd4ac1e,0xa52235,0xbe3146].map(color=>new T.MeshStandardMaterial({color,roughness:.9}));
  const e=(g,m,cast=true)=>{g.translate(0,0,L.distance);emit(g,m,cast,false);};
  const b=(x,y,z,w,h,d,m=red)=>block(x,y,L.distance+z,w,h,d,m,true,false,.025);
  const extrude=(shape,mat,depth,z=0)=>{const g=new T.ExtrudeGeometry(shape,{depth,steps:1,bevelEnabled:true,bevelSize:.018,bevelThickness:.014,bevelSegments:2,curveSegments:40});g.translate(0,0,z-depth/2);e(g,mat);};
  function poly(points) {const s=new T.Shape();points.forEach(([x,y],i)=>i?s.lineTo(x,y):s.moveTo(x,y));s.closePath();return s;}
  function contour(radius,toothHalfWidth) {
    const limits=toothHalfWidth>0?[0,...[.12,.31,.5,.69,.88].flatMap(center=>[center-toothHalfWidth,center+toothHalfWidth]),1]:[0,1];
    const points=[];
    for(let i=0;i<limits.length-1;i++) {
      const start=limits[i],end=limits[i+1],steps=Math.ceil((end-start)*96);
      const r=radius+(i%2?.34:0);
      for(let j=0;j<=steps;j++) {
        const a=(start+(end-start)*j/steps)*Math.PI;
        points.push([Math.cos(a)*r,1.05+Math.sin(a)*r]);
      }
    }
    return points;
  }
  function arch(inner,outer,mat,depth,z=0,teeth=false) {
    // 内外边缘同时抬起，齿阶保持环带结构。
    const tooth=teeth?.057:0;
    const innerTooth=teeth?tooth-(outer-inner)/(Math.PI*outer):0;
    extrude(poly([...contour(outer,tooth),...contour(inner,innerTooth).reverse()]),mat,depth,z);
  }
  // 底座、土层与低白栅栏，左右留出通行空间。
  b(0,.36,.1,L.width,.14,L.depth,trim);
  b(0,.5,.1,L.width-.18,.08,L.depth-.18,soil);
  for(const side of [-1,1]) {
    b(side*2.91,.61,0,2.18,.93,.73);
    b(side*2.91,1.54,0,2.27,.07,.8,edge);
    b(side*4.78,.58,.1,.035,.23,2.4,fence);
    for(let i=0;i<19;i++)b(side*4.78,.57,-1.02+i*.125,.06,.25,.065,fence);
  }
  for(let i=0;i<77;i++)b(-4.75+i*.125,.57,1.34,.06,.25,.065,fence);
  b(0,.65,1.34,9.6,.04,.035,fence);
  arch(3.13,3.31,red,.34,0,true);
  arch(2.7,2.88,red,.3,.025);
  // 外圈前缘与内圈红色灯带，白天保持漆面，夜间泛红。
  arch(3.265,3.31,edge,.025,.19,true);
  arch(2.7,2.735,edge,.022,.19);
  for(const fraction of [.21,.4,.6,.79]) {
    const a=fraction*Math.PI;
    const g=new T.BoxGeometry(.065,.37,.16);g.rotateZ(a-Math.PI/2);g.translate(Math.cos(a)*3,1.05+Math.sin(a)*3,-.065);e(g,red);
  }
  // 蓝色飘带置于齿轮后方，保留原图两侧不完全对称的形态。
  const flame=new T.Shape();flame.moveTo(2.44,.88);flame.bezierCurveTo(3.2,1.1,2.58,1.85,2.55,2.24);flame.bezierCurveTo(2.33,2.98,3.27,3.35,2.8,3.93);flame.bezierCurveTo(3.58,3.47,3.18,2.9,3.02,2.45);flame.bezierCurveTo(2.86,1.94,3.6,1.4,3.36,.88);flame.closePath();extrude(flame,blue,.16,-.26);
  extrude(poly([[-3.35,1.03],[-2.44,2.3],[-2.19,2.83],[-2.54,2.48],[-3.55,1.03]]),cyan,.11,-.22);

  // 方折体年份：每一笔均有厚度，避免只贴平面文字。
  const segments={a:[0,.72,.38,.085],b:[.155,.385,.075,.36],c:[.155,.06,.075,.36],d:[0,0,.38,.085],e:[-.155,.06,.075,.36],f:[-.155,.385,.075,.36],g:[0,.36,.38,.085]};
  const digits={0:'abcdef',1:'bc',2:'abged',3:'abgcd',4:'fgbc',5:'afgcd',6:'afgecd',7:'abc',8:'abcdefg',9:'abfgcd'};
  for(const [text,cx] of [['1985',-2.91],['2026',2.91]])for(let i=0;i<text.length;i++) {
    const x=cx+(i-1.5)*.49;
    for(const part of digits[text[i]]){const [dx,y,w,h]=segments[part];b(x+dx,.72+y,.405,w,h,.055,white);}
  }
  // 翻开的书：两页有真实倾角、纸层与红色封面，书脊向观众延伸。
  function bookPart(side,x,y,z,w,h,d,mat,cast=true) {
    const g=new T.BoxGeometry(w,h,d);
    g.translate(x,y,z);g.rotateZ(side*.14);g.rotateX(.38);g.translate(0,.77,.3);
    e(g,mat,cast);
  }
  for(const side of [-1,1]) {
    bookPart(side,side*.62,-.09,0,1.28,.06,1.24,red);
    bookPart(side,side*.61,0,0,1.22,.13,1.18,white);
    bookPart(side,side*.61,.074,0,1.22,.02,1.18,trim);
    for(const y of [-.045,-.012,.021])bookPart(side,side*.61,y,.594,1.16,.005,.012,trim,false);
  }
  const strokes={H:[[-.2,0,.09,.65],[.2,0,.09,.65],[0,0,.4,.09]],I:[[0,0,.1,.65], [0,.28,.35,.08],[0,-.28,.35,.08]],T:[[0,0,.1,.65],[0,.28,.47,.09]]};
  for(const [i,char] of [...'HIT'].entries())for(const [x,z,w,d] of strokes[char]) {
    const center=(i-1)*.57+x;
    // 跨过书脊的字笔分段，让每段和所在书页共用坐标变换。
    for(const side of [-1,1]) {
      const left=side<0?center-w/2:Math.max(0,center-w/2);
      const right=side<0?Math.min(0,center+w/2):center+w/2;
      if(right>left)bookPart(side,(left+right)/2,.095,-z,right-left,.022,d,red);
    }
  }
  // 花带用确定性分布，截留底座投影，花色与图二的黄/红色低矮花坛一致。
  let seed=1985;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  for(let i=0;i<190;i++) {
    const x=(random()-.5)*9.3,z=(random()-.5)*2.18+.1;
    if(Math.abs(z)<.55)continue;
    const g=new T.IcosahedronGeometry(.1+random()*.035,0);g.scale(1,.55,1);g.translate(x,.63+random()*.065,z);e(g,bloom[z>.55?Math.floor(random()*2):2+Math.floor(random()*2)]);
    const l=new T.IcosahedronGeometry(.13,0);l.scale(1,.42,1);l.translate(x,.59,z);e(l,leaf);
  }
  worldSolid(0,.36,L.distance+.1,L.width,.48,L.depth);
}
