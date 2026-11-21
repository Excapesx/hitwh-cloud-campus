// 人工描图坐标：以用户地图的 1334 × 1888 显示尺寸为基准。
// 场景单位仅用于展示，不代表实际米数；楼高、立面均为示意。
export const MAP = { width:1334, height:1888, scale:.45, originX:720, originY:850 };
export const world = (x,y) => ({x:(x-MAP.originX)*MAP.scale,z:(y-MAP.originY)*MAP.scale});
// 总览照片校准建筑之间的相对尺度；南门保留细部原模型，仅统一场景比例。
export const gateScale=.44;
export const mainScale={x:1.1,y:.82,z:1};
export const colonnadeLayout={radius:24,halfAngle:.7,pairs:12,rowOffset:.72,pedestal:.74,columnTop:5.35,roofTop:6.28};
export function colonnadePoint(angle,offset=0) {const r=colonnadeLayout.radius+offset;return {x:Math.sin(angle)*r,z:campusAxis.colonnade-colonnadeLayout.radius+Math.cos(angle)*r};}
// 照片与用户纠正：主楼正面朝向南门。沿两者连线组织前庭、柱廊和校训石。
export const campusAxis=(()=>{
  const origin=world(879,1141),end=world(841,1510),length=Math.hypot(end.x-origin.x,end.z-origin.z);
  const front={x:(end.x-origin.x)/length,z:(end.z-origin.z)/length},right={x:front.z,z:-front.x};
  // 参考正面航拍图重新校准中轴线节点。主楼前场、柱廊、校训石、纪念立牌和南门
  // 按现场由北向南的视觉节奏排列，避免校训石与纪念立牌挤在同一段中。
  return {origin,end,length,front,right,yaw:Math.atan2(front.x,front.z),colonnade:52,motto:88,
    at(distance,lateral=0){return {x:origin.x+front.x*distance+right.x*lateral,z:origin.z+front.z*distance+right.z*lateral};},
    project(x,z){const dx=x-origin.x,dz=z-origin.z;return {distance:dx*front.x+dz*front.z,lateral:dx*right.x+dz*right.z};}
  };
})();
// 门体、灯具与临街铺装共用中轴朝向，避免主楼共线而南门仍沿世界 Z 轴。
export const gatePoint=(x,z)=>campusAxis.at(campusAxis.length+z,x);
const axisPixel=(distance,lateral=0)=>{const p=campusAxis.at(distance,lateral);return [p.x/MAP.scale+MAP.originX,p.z/MAP.scale+MAP.originY];};
export const axisLayout={promenadeWidth:7.2,avenueWidth:8,plazaX:10,plazaZ:8,treeRows:[8.6,16.8]};
// 新照片：纪念立牌位于校训石南侧的独立展示区，面朝南门。
export const displayLayout={distance:126,width:11.2,depth:3,plazaWidth:18,plazaEnd:130};
export const axisTreeSites=[97,105,113,121,137,145,153].flatMap(distance=>axisLayout.treeRows.flatMap(lateral=>
  lateral<10&&Math.abs(distance-campusAxis.motto)<12?[]:[-1,1].map(side=>({distance,lateral:side*lateral}))));
export const outlinePixels = [[185,740],[224,685],[333,613],[436,590],[490,500],[515,352],[517,235],[535,187],[606,146],[662,147],[711,183],[760,207],[846,196],[904,228],[972,274],[1009,325],[1031,410],[1081,493],[1128,568],[1157,652],[1160,726],[1132,799],[1099,866],[1087,962],[1103,1090],[1135,1230],[1153,1394],[1187,1558],[1094,1558],[997,1540],[892,1524],[858,1507],[825,1507],[786,1533],[672,1525],[572,1516],[478,1508],[478,1467],[407,1459],[319,1469],[332,1331],[286,1261],[312,1210],[383,1149],[441,1092],[475,1005],[466,929],[448,894],[405,889],[363,925],[331,920],[280,884],[270,834],[277,783]];
export const outline = outlinePixels.map(([x,y])=>world(x,y));
export function inside(x,z) {
  let hit=false;
  for(let i=0,j=outline.length-1;i<outline.length;j=i++) {
    const a=outline[i],b=outline[j];
    if(((a.z>z)!==(b.z>z)) && x<(b.x-a.x)*(z-a.z)/(b.z-a.z)+a.x) hit=!hit;
  }
  return hit;
}
// 南门临街侧增加与门前铺装一致的步行范围，其余边界沿用校园地图。
export function walkable(x,z) {
  const p=campusAxis.project(x,z),zGate=p.distance-campusAxis.length;
  return inside(x,z)||(Math.abs(p.lateral)<16*gateScale && zGate>-13*gateScale && zGate<29.5*gateScale);
}
export function height(x,z) {
  // 运动场所在的南侧台地保持水平，主楼后方开始向图书馆方向连续抬升。
  // 这条缓坡是校园照片中从运动场、主楼后侧到图书馆的共同地形基线。
  const rearSlope=29.5*Taper((116-z)/292);

  // 学子餐厅背后的草坡形成多道柔和起伏与浅谷；将其限制在主坡东侧，
  // 既能在食堂后方与红砖步道处看到明显丘陵变化，又不破坏运动场→图书馆的连续上坡。
  const eastMask=Taper((x-4)/38);
  const xueziHill=9.5*eastMask*Math.exp(-(((x-44)/58)**2+((z+44)/46)**2));
  const hillRidges=4.6*eastMask*Math.sin((x-16)*.095)*Math.cos((z+34)*.085)
    *Math.exp(-(((x-42)/56)**2+((z+44)/48)**2));
  const hillSwale=3.8*eastMask*Math.sin((z+40)*.13+Math.sin(x*.05))
    *Math.exp(-(((x-38)/52)**2+((z+40)/44)**2));

  // 12–14 号公寓坐落在东侧山肩高地上，整组宿舍明显高于学子餐厅与中区球场。
  const dormRidge=14.2*Taper((x-66)/42)*Taper((52-z)/44)*Taper((z+185)/55);

  // 场地最北侧仍保留照片所示的自然山体，与连续缓坡平顺衔接。
  const northPoint=world(828,306);
  const northHill=62*Math.exp(-(((x-northPoint.x)/81)**2+((z-northPoint.z)/62)**2));
  const northEdge=Taper((-z-205)/32);
  return Math.max(0,rearSlope+xueziHill+hillRidges+hillSwale+dormRidge,northHill*northEdge);
}
function Taper(t) { t=Math.min(1,Math.max(0,t)); return t*t*(3-2*t); }
export const roadLines = [
  {name:'环山路',width:5.8,points:[[185,740],[248,681],[337,621],[426,596],[477,539],[505,424],[519,324],[518,233],[532,190],[608,145],[664,148],[721,192],[778,211],[848,196],[915,235],[983,289],[1019,363],[1038,427],[1092,513],[1138,603],[1161,686],[1153,755],[1106,845],[1086,928],[1094,1034],[1114,1149],[1136,1270],[1154,1405],[1187,1557]]},
  {name:'西侧道路',width:5.5,points:[[428,596],[352,568],[348,474],[334,350],[343,266],[373,218],[421,190],[472,198],[520,194]]},
  {name:'学子路',width:5.2,points:[[635,324],[627,414],[618,513],[609,632],[603,753],[592,876],[580,1009],[568,1168]]},
  {name:'学子林北路',width:4.8,points:[[428,599],[530,633],[623,646],[717,642],[816,636],[929,596]]},
  {name:'生活区道路',width:4.7,points:[[317,707],[409,716],[507,729],[601,740]]},
  {name:'东侧道路',width:5.3,points:[[930,600],[944,663],[938,736],[914,830],[886,911],[890,1010],[879,1101]]},
  {name:'中区道路',width:4.4,points:[[604,742],[716,753],[831,758],[939,737],[1039,773],[1096,809]]},
  {name:'教学区道路',width:4.8,points:[[444,1167],[552,1172],[659,1182],axisPixel(29,-42),axisPixel(29,-24),axisPixel(29),axisPixel(29,24),axisPixel(29,42),[1111,1233]]},
  {name:'主楼东路',width:4.7,points:[[997,1088],[993,1176],[985,1280],[979,1387],[935,1413],[876,1430],[869,1507]]},
  {name:'体育场西路',width:4.5,points:[[446,1166],[439,1255],[432,1355]]},
  {name:'体育场东路',width:5,points:[[776,1197],[752,1292],[738,1403],[730,1483]]},
  {name:'体育场南路',width:5.3,points:[[339,1359],[445,1368],[563,1380],[680,1388],[738,1403],axisPixel(129,-34),axisPixel(129,-17),axisPixel(129),axisPixel(129,17),axisPixel(129,34),[971,1448],[1115,1471]]},
  {name:'南门道路',width:5.8,points:[[475,1457],[591,1468],[730,1483],axisPixel(campusAxis.length-7,-12),axisPixel(campusAxis.length-7)]},
  {name:'西门道路',width:4.8,points:[[292,1235],[341,1276],[438,1255]]},
  {name:'主楼前路',width:3.5,points:[[776,1197],[791,1132],[803,1086],[877,1090],[997,1117]]}
];
roadLines.push({name:'南门中轴路',width:axisLayout.avenueWidth,points:[displayLayout.plazaEnd,139,campusAxis.length-16*gateScale].map(s=>axisPixel(s))});
export const paths = [
 [[642,331],[732,336],[797,321],[856,336],[921,382],[985,443],[1012,489]],
 [[646,345],[707,358],[755,351],[807,369],[819,414],[800,465],[820,524]],
 [[637,401],[716,407],[761,435],[756,498],[727,534],[651,531]],
 [[606,653],[553,660],[535,705],[591,718]],[[620,650],[662,690],[719,655],[752,704],[800,729]],
 [[608,764],[748,797],[785,849],[798,908],[856,1005],[882,1092]],
 [[602,890],[656,870],[698,934],[749,992],[784,1078]],
 [[391,743],[371,860],[482,884],[514,939]],
 [[453,1206],[507,1196],[526,1231],[506,1267],[452,1262]]
];

// id/name/类别/图上中心/宽深/示意层数。特殊体量由 model.js 生成。
export const buildings = [
 ['main','主楼（H楼）','study',879,1141,135,69,7,'main'],
 ['ming','明学楼（M楼）','study',629,1141,76,48,5],
 ['gong','功学楼（G楼）','study',719,1149,54,45,5],
 ['ning','宁学楼（N楼）','study',540,558,116,81,5,'ning'],
 ['library','图书馆','study',710,476,82,103,5,'library'],
 ['wanghai','望海楼','study',584,377,59,53,5],
 ['boB','博学楼B','study',720,1084,67,48,5],
 ['zhi','大学生创新创业基地','study',582,575,17,22,2],
 ['activity','大学生活动中心','study',683,591,55,60,3],
 ['gym','综合球类馆','sport',760,590,66,44,2],
 ['stadium','体育场','sport',612,1280,139,187,1,'stadium'],
 ['basketball','篮球场','sport',489,1317,76,94,1,'court'],
 ['volleyball','排球场','sport',718,1290,55,92,1,'court'],
 ['tennis','网球场','sport',708,1360,51,60,1,'court'],
 ['football','足球场','sport',878,666,67,67,1,'court'],
 ['racing','赛车训练场','sport',879,705,69,53,1,'court'],
 ['training','拓展训练场','sport',978,608,59,29,1,'court'],
 ['xuezi','学子餐厅','life',666,778,70,56,4],
 ['xueyuan','学苑餐厅','life',727,936,60,54,3],
 ['d1','1公寓（紫荆楼）','life',698,996,52,22,6],
 ['d2','2公寓（紫薇楼）','life',631,1006,55,23,6],
 ['d3','3公寓（松山楼）','life',639,950,55,22,6],
 ['d4','4公寓（紫藤楼）','life',648,899,52,23,6],
 ['d5A','5公寓（海澜楼）','life',712,1044,51,26,6],
 ['d6A','6公寓','life',701,842,126,22,6],
 ['d6B','6公寓北楼','life',639,864,20,40,6],
 ['d7','7公寓（不期楼）','life',516,983,97,63,6,'courtyard'],
 ['d8','8公寓（抱海楼）','life',552,839,54,57,6],
 ['d9','9公寓（聚海楼）','life',559,773,57,50,6],
 ['d10','10公寓（拾海楼）','life',491,767,54,49,6],
 ['d11','11公寓（瞰海楼）','life',412,757,57,54,6],
 ['d12','12公寓（渤海楼）','life',965,800,67,60,6,'courtyard'],
 ['d13A','13A公寓','life',1039,839,54,25,13],
 ['d13B','13B公寓','life',1055,798,54,26,13],
 // 14号公寓的层次按基建处航拍估计，保留原图的三栋相对位置。
 ['d14A','14A公寓','life',1085,712,55,22,12],
 ['d14B','14B公寓','life',1078,655,54,23,12],
 ['d14C','14C公寓','life',1061,597,53,24,12],
 ['international','留学生公寓','life',979,651,54,25,5],
 ['tianyayuan','天雅苑','life',978,696,56,23,3],
 ['tianyaxuan','天雅轩','life',977,731,55,22,3],
 ['store','大学生服务中心','life',639,1051,69,43,3],
 ['research1','研究院1号楼','study',966,1482,84,82,5,'research'],
 ['research2','研究院2号楼','study',1066,1494,35,80,5],
 ['anA','安学楼A','study',956,1114,55,28,4],
 ['tanT','探学楼T','study',1028,1128,50,40,4],
 ['guanD','观展楼D','study',1025,1196,51,23,3],
 ['chongC','崇学楼C','study',1021,1264,49,22,4],
 ['yiE','怡学楼E','study',1013,1287,47,21,4],
 ['zheF','哲学楼F','study',1070,1306,35,48,4],
 ['test','车辆实验室','study',1070,1250,54,29,3],
 ['water','综合拖曳水池','study',1029,1370,78,32,2],
 ['printing','打印厂','life',1076,1165,38,54,2],
 ['incubator','创新创业园','study',334,779,74,71,3,'courtyard'],
 ['doorSouth','南门','gate',841,1510,96*gateScale,15*gateScale,1,'gate'],
 ['doorEast','东门','gate',1132,1226,10,30,1,'gate'],
 ['doorWest','西门','gate',292,1234,28,8,1,'gate'],
 ['doorNorth','西北侧门','gate',435,1091,26,8,1,'gate']
].map(([id,name,kind,px,py,w,d,floors,shape='block'])=>({id,name,kind,px,py,...world(px,py),w:w*MAP.scale,d:d*MAP.scale,floors,shape}));
for(const [i,x,y] of [[18,364,1383],[16,418,1389],[17,483,1395],[14,552,1402],[20,625,1409],[19,359,1427],[21,412,1432],[13,551,1437],[12,549,1466],[15,542,1502],[11,613,1496],[10,682,1502]]) {
  buildings.push({id:'family'+i,name:'林苑家属区 '+i+'号楼',kind:'life',px:x,py:y,...world(x,y),w:47*.45,d:15*.45,floors:4,shape:'block',minor:true});
}
// 地图边缘可见但未列入目录的背景楼群。它们只用于填补低角度镜头的城市界面。
export const contextBuildings=[
  [470,245,52,25,4,'cream'],[430,310,48,24,5,'gray'],[476,392,46,25,4,'red'],[408,462,44,24,4,'cream'],
  [1008,253,50,26,5,'gray'],[1080,313,46,24,5,'cream'],[1130,421,52,27,5,'red'],[1158,534,46,25,5,'cream'],
  [362,650,50,26,5,'gray'],[397,560,44,24,4,'red'],[1082,900,52,25,6,'cream'],[1132,982,48,25,6,'gray'],
  [1062,1088,44,24,5,'red'],[400,1070,45,24,5,'cream'],[350,1160,48,25,5,'gray']
].map(([px,py,w,d,floors,tone])=>({px,py,...world(px,py),w:w*MAP.scale,d:d*MAP.scale,floors,tone}));
// 校园内部的次要楼群只承担空间填充，保持低层、低对比，避免主轴前场继续显得中空。
export const interiorFillBuildings=[
  [365,676,32,20,2,'cream'],[350,868,34,21,2,'red'],[430,1022,32,20,2,'gray'],
  [470,1188,34,21,2,'cream'],[470,1282,32,20,2,'red'],[930,858,34,21,2,'gray'],
  [1087,876,34,21,2,'cream'],[1100,1038,34,20,2,'red'],[1048,1180,34,21,2,'cream']
].map(([px,py,w,d,floors,tone])=>({px,py,...world(px,py),w:w*MAP.scale,d:d*MAP.scale,floors,tone}));
export const categoryNames={study:'教学科研',life:'生活服务',sport:'运动场地',gate:'校园出入口'};
function axisLake(name,points) {return {name,smooth:true,points:points.map(([lateral,distance])=>{const p=campusAxis.at(distance,lateral);return [p.x/MAP.scale+MAP.originX,p.z/MAP.scale+MAP.originY];})};}
// 统一两侧湖区与步道的景观对景；轮廓为航拍估计，不是测绘岸线。
const axisLakeProfile=[[6.8,64],[17,62],[28,68],[31,80],[26,91],[17,95],[10,89],[11,78],[6.8,72]];
export const lakes=[{name:'天鹅湖',points:[[517,642],[532,651],[527,671],[541,695],[529,715],[504,714],[497,696],[499,669]]},
  axisLake('日湖',axisLakeProfile),axisLake('月湖',axisLakeProfile.map(([x,z])=>[-x,z]))];
export const tourIds=['doorSouth','main','stadium','xuezi','library','ning'];
