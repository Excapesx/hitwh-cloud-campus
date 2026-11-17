import { Sky } from 'three/addons/objects/Sky.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { world, height } from './campus-data.js';

// 世界坐标材质：细部尺度不随几何的 UV 展开或合批而改变；没有外部贴图请求。
const surfaceGLSL=`
varying vec3 vCampusSurface;
uniform float uCampusMode;
uniform float uCampusGrain;
uniform float uCampusRelief;
float campusHash(vec3 p) {
  p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);
}
float campusNoise(vec3 p) {
  vec3 a=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(mix(campusHash(a),campusHash(a+vec3(1,0,0)),f.x),mix(campusHash(a+vec3(0,1,0)),campusHash(a+vec3(1,1,0)),f.x),f.y),
    mix(mix(campusHash(a+vec3(0,0,1)),campusHash(a+vec3(1,0,1)),f.x),mix(campusHash(a+vec3(0,1,1)),campusHash(a+vec3(1,1,1)),f.x),f.y),f.z);
}
float campusJoint(vec3 p) {
  vec2 tile=p.xz/vec2(.72,1.25),f=fract(tile),d=min(f,1.-f);
  float edge=min(d.x,d.y);return 1.-smoothstep(.008,.025+max(fwidth(tile.x),fwidth(tile.y))*.6,edge);
}
float campusBump(vec3 p) {
  float fine=campusNoise(p*68.);
  float medium=campusNoise(p*13.);
  float joint=uCampusMode>1.5&&uCampusMode<2.5?campusJoint(p):0.;
  return uCampusRelief*(fine*.65+medium*.35-joint*.8);
}
vec3 campusPerturb(vec3 position,vec3 surfNormal,float heightValue) {
  vec3 dx=dFdx(position),dy=dFdy(position),r1=cross(dy,surfNormal),r2=cross(surfNormal,dx);
  float det=dot(dx,r1);vec3 gradient=sign(det)*(dFdx(heightValue)*r1+dFdy(heightValue)*r2);
  return normalize(abs(det)*surfNormal-gradient);
}
`;

export function surfaceMaterial(T,kind,options) {
  const modes={plaster:[0,.065,.007],stone:[0,.035,.0035],asphalt:[1,.14,.012],paving:[2,.045,.005],metal:[3,.018,.0008]};
  const config=modes[kind]||modes.stone;
  const material=new T.MeshStandardMaterial(options);
  material.onBeforeCompile=shader=>{
    shader.uniforms.uCampusMode={value:config[0]};shader.uniforms.uCampusGrain={value:config[1]};shader.uniforms.uCampusRelief={value:config[2]};
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vCampusSurface;');
    shader.vertexShader=shader.vertexShader.replace('#include <worldpos_vertex>',`#include <worldpos_vertex>
      vec4 campusWorld=vec4(transformed,1.0);
      #ifdef USE_INSTANCING
      campusWorld=instanceMatrix*campusWorld;
      #endif
      vCampusSurface=(modelMatrix*campusWorld).xyz;`);
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\n'+surfaceGLSL);
    shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
      float campusLarge=campusNoise(vCampusSurface*.28);
      float campusMedium=campusNoise(vCampusSurface*4.5);
      float campusFine=campusNoise(vCampusSurface*68.);
      diffuseColor.rgb*=1.+(campusLarge-.5)*uCampusGrain*2.+(campusMedium-.5)*uCampusGrain+(campusFine-.5)*uCampusGrain*.5;
      if(uCampusMode<.5)diffuseColor.rgb*=1.-.11*exp(-max(vCampusSurface.y,0.)*1.8)*(.5+campusLarge);
      if(uCampusMode>1.5&&uCampusMode<2.5)diffuseColor.rgb*=1.-.22*campusJoint(vCampusSurface);
      if(uCampusMode>.5&&uCampusMode<1.5)diffuseColor.rgb+=vec3(.018)*smoothstep(.68,.85,campusFine);`);
    shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=clamp(roughnessFactor+(campusMedium-.5)*.12,.08,1.);');
    shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>','#include <normal_fragment_maps>\nnormal=campusPerturb(-vViewPosition,normal,campusBump(vCampusSurface));');
  };
  material.customProgramCacheKey=()=>`campus-surface-${kind}-v1`;
  return material;
}

export function setupRealisticRendering(T,renderer,scene) {
  renderer.toneMapping=T.AgXToneMapping;renderer.toneMappingExposure=.9;
  renderer.info.autoReset=false;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;renderer.shadowMap.autoUpdate=false;
  const direction=new T.Vector3(-.6,.77,.5).normalize();
  const sky=new Sky();sky.scale.setScalar(2400);
  const uniforms=sky.material.uniforms;
  uniforms.turbidity.value=3.2;uniforms.rayleigh.value=1.7;uniforms.mieCoefficient.value=.004;uniforms.mieDirectionalG.value=.78;
  uniforms.sunPosition.value.copy(direction);uniforms.showSunDisc.value=false;
  const envScene=new T.Scene();envScene.add(sky);
  const pmrem=new T.PMREMGenerator(renderer);const environment=pmrem.fromScene(envScene,.035,.1,5000);
  scene.environment=environment.texture;scene.environmentIntensity=.075;
  uniforms.showSunDisc.value=true;scene.add(sky);scene.background=null;pmrem.dispose();
  scene.fog.color.setHex(0xc7d6dc);
  const sun=new T.DirectionalLight(0xfff2df,3.6);sun.castShadow=true;
  sun.shadow.mapSize.set(3072,3072);sun.shadow.bias=-.000035;sun.shadow.normalBias=.025;sun.shadow.radius=2;
  sun.shadow.camera.near=10;sun.shadow.camera.far=900;
  const fill=new T.HemisphereLight(0xd1e5fb,0x716951,.35);scene.add(sun,sun.target,fill);
  const target=new T.Vector3(),gate=world(841,1510);
  let detailed=null,cssWidth=1,cssHeight=1,composer=null,ao=null,renderPass=null;
  const supportsAO=renderer.extensions.has('EXT_color_buffer_float');
  function setShadowArea(close) {
    if(detailed===close)return;detailed=close;
    target.set(close?gate.x:-12,close?4:0,close?gate.z:0);
    sun.target.position.copy(target);sun.position.copy(target).addScaledVector(direction,470);
    const span=close?66:390;
    sun.shadow.camera.left=sun.shadow.camera.bottom=-span;sun.shadow.camera.right=sun.shadow.camera.top=span;
    sun.shadow.camera.updateProjectionMatrix();sun.target.updateMatrixWorld();sun.updateMatrixWorld();renderer.shadowMap.needsUpdate=true;
  }
  function ensureComposer(camera) {
    if(composer)return;
    const target=new T.WebGLRenderTarget(1,1,{type:T.HalfFloatType,samples:2});
    composer=new EffectComposer(renderer,target);composer.setPixelRatio(1);
    renderPass=new RenderPass(scene,camera);composer.addPass(renderPass);
    ao=new GTAOPass(scene,camera,1,1,undefined,{radius:1.25,thickness:.65,scale:1,samples:16},{radius:5,samples:8});
    ao.blendIntensity=.72;composer.addPass(ao);composer.addPass(new OutputPass());resize(cssWidth,cssHeight);
  }
  function resize(w,h) {
    cssWidth=w;cssHeight=h;
    if(composer){composer.setSize(w,h);ao.setSize(Math.max(1,Math.round(w*.7)),Math.max(1,Math.round(h*.7)));}
  }
  setShadowArea(false);
  return {
    resize,
    render(camera,close) {
      renderer.info.reset();
      setShadowArea(close);
      if(close&&cssWidth>=700&&supportsAO){ensureComposer(camera);renderPass.camera=camera;ao.camera=camera;composer.render();}
      else renderer.render(scene,camera);
    },
    get quality(){return {detailShadows:detailed,contactAO:Boolean(detailed&&cssWidth>=700&&supportsAO),shadowMap:sun.shadow.mapSize.x};}
  };
}

export function addGatePlanting(T,scene) {
  const gate=world(841,1510),sites=[];
  for(const side of [-1,1])for(let n=0;n<3;n++)sites.push({x:gate.x+side*(25+n*1.5),z:gate.z-8-n*15,h:12+n*1.5});
  const foliageGeo=new T.SphereGeometry(1,12,8),p=foliageGeo.attributes.position;
  for(let i=0;i<p.count;i++) {
    const x=p.getX(i),y=p.getY(i),z=p.getZ(i),r=1+.11*Math.sin(x*13+y*17+z*11);p.setXYZ(i,x*r,y*r,z*r);
  }
  foliageGeo.computeVertexNormals();
  const leaves=new T.InstancedMesh(foliageGeo,new T.MeshStandardMaterial({color:0xffffff,roughness:1}),sites.length*42);
  const wood=new T.InstancedMesh(new T.CylinderGeometry(1,1,1,9),new T.MeshStandardMaterial({color:0x665740,roughness:1}),sites.length*37);
  const temp=new T.Object3D(),tint=new T.Color();let li=0,wi=0;
  const branch=(a,b,r)=>{const delta=b.clone().sub(a);temp.position.copy(a).add(b).multiplyScalar(.5);temp.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.clone().normalize());temp.scale.set(r,delta.length(),r);temp.updateMatrix();wood.setMatrixAt(wi++,temp.matrix);};
  sites.forEach((s,tree)=>{
    const floor=height(s.x,s.z);branch(new T.Vector3(s.x,floor,s.z),new T.Vector3(s.x,floor+s.h*.94,s.z),.26);
    for(let tier=0;tier<6;tier++) {
      const y=floor+s.h*(.34+tier*.12),radius=3.1*(1-tier*.135);
      for(let b=0;b<7;b++) {
        const a=b*Math.PI*2/7+tier*.47+tree,spread=b===6?.18:1;
        const x=s.x+Math.cos(a)*radius*spread,z=s.z+Math.sin(a)*radius*spread;
        if(b<6)branch(new T.Vector3(s.x,y+.1,s.z),new T.Vector3(x,y-.3,z),.045);
        temp.position.set(x,y,z);temp.rotation.set(.08*Math.sin(a),a,.08*Math.cos(a));temp.scale.set(2.05-tier*.17,.95-tier*.05,1.65-tier*.12);temp.updateMatrix();leaves.setMatrixAt(li,temp.matrix);
        tint.setHex([0x3c5739,0x466345,0x536f47,0x365440][(tree+tier+b)%4]);leaves.setColorAt(li++,tint);
      }
    }
  });
  for(const object of [wood,leaves]){object.castShadow=object.receiveShadow=true;object.instanceMatrix.needsUpdate=true;scene.add(object);}
  leaves.instanceColor.needsUpdate=true;
}
