import { defaultWeather, normalizeWeather, atmosphereFor, advanceTime, formatTime, weatherTypes } from './weather-state.js';
import { height, campusAxis, gateScale, gatePoint } from './campus-data.js';

const storageKey='hitwh-weather-v1';
export function createWeatherSystem(T,scene,rendering,{landmarks,unlock,onOpen}) {
  const el=id=>document.getElementById(id),motion=matchMedia('(prefers-reduced-motion: reduce)');
  let state={...defaultWeather},lastSave=0,lastUI='',lastLit=-1,particleMode='',anchor=null,resetAnchor=null;
  try {state=normalizeWeather(JSON.parse(localStorage.getItem(storageKey))||{});state.playing=false;}catch{}
  const wet={value:0},snow={value:0},materials=new Set(),windows=[],lamps=[],outlines=[],facades=[];
  scene.traverse(object=>{for(const material of (Array.isArray(object.material)?object.material:[object.material])) {
    if(!material?.isMeshStandardMaterial||materials.has(material))continue;
    materials.add(material);
    if(material.userData.nightWindow)windows.push(material);
    if(material.userData.nightLamp)lamps.push(material);
    if(material.userData.nightOutline)outlines.push(material);
    if(material.userData.nightFacade)facades.push(material);
    const compile=material.onBeforeCompile.bind(material),cacheKey=material.customProgramCacheKey();
    material.onBeforeCompile=shader=>{
      compile(shader);shader.uniforms.uWeatherWet=wet;shader.uniforms.uWeatherSnow=snow;
      shader.fragmentShader=shader.fragmentShader.replace('#include <common>',
        '#include <common>\nuniform float uWeatherWet;\nuniform float uWeatherSnow;');
      shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
        float weatherUp=smoothstep(.45,.9,inverseTransformDirection(normalize(vNormal),viewMatrix).y);
        diffuseColor.rgb*=1.-uWeatherWet*.23;
        diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.84,.89,.94),uWeatherSnow*weatherUp*.85);`);
      shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',
        '#include <roughnessmap_fragment>\nroughnessFactor=mix(roughnessFactor,max(.17,roughnessFactor*.38),uWeatherWet);');
    };
    material.customProgramCacheKey=()=>`${cacheKey}-weather-v1`;material.needsUpdate=true;
  }});

  // 有限数量的真实灯具，窗格采用共享自发光材质；不为每扇窗新增灯光。
  const nightLights=[];
  for(const side of [-1,1]) {
    for(const wash of [false,true]) {
      const light=new T.SpotLight(wash?0xffcd88:0xffe6b5,0,(wash?34:48)*gateScale,wash?.92:1.02,.75,2);
      const p=gatePoint(side*(wash?9:14.5)*gateScale,(wash?5:12)*gateScale),target=gatePoint(side*(wash?6:9)*gateScale,(wash?0:22)*gateScale);
      light.position.set(p.x,(wash?1.5:10.4)*gateScale,p.z);
      light.target.position.set(target.x,(wash?9:0)*gateScale,target.z);
      scene.add(light,light.target);nightLights.push({light,power:(wash?210:360)*gateScale**2});
    }
  }
  for(const side of [-1,1]) {
    const p=campusAxis.at(12,side*18),target=campusAxis.at(1,side*15);
    const light=new T.SpotLight(0xffd093,0,38,.98,.8,2);light.position.set(p.x,2.2,p.z);light.target.position.set(target.x,11,target.z);
    scene.add(light,light.target);nightLights.push({light,power:290});
  }
  const maxParticles=1800,positions=new Float32Array(maxParticles*3),floor=new Float32Array(maxParticles);
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(positions,3).setUsage(T.DynamicDrawUsage));
  const particleUniforms={snow:{value:0},size:{value:1},tint:{value:new T.Color(0xcbdbe6)}};
  const particleMaterial=new T.ShaderMaterial({transparent:true,depthWrite:false,uniforms:particleUniforms,
    vertexShader:`uniform float snow;uniform float size;void main(){vec4 p=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*p;gl_PointSize=clamp(size*(snow>.5?400.:850.)/max(1.,-p.z),snow>.5?2.:4.,snow>.5?7.:17.);}`,
    fragmentShader:`uniform float snow;uniform vec3 tint;void main(){vec2 q=gl_PointCoord-.5;float a;if(snow>.5){a=(1.-smoothstep(.12,.5,length(q)))*.85;}else{a=(1.-smoothstep(.025,.12,abs(q.x+q.y*.12)))*(1.-smoothstep(.28,.5,abs(q.y)))*.6;}if(a<.01)discard;gl_FragColor=vec4(tint,a);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`});
  const particles=new T.Points(geometry,particleMaterial);particles.frustumCulled=false;particles.visible=false;scene.add(particles);
  const roofs=landmarks.flatMap(e=>e.faces.filter(()=>e.kind!=='sport').map(f=>({...f,top:e.top})));
  function groundAt(x,z) {
    let y=height(x,z)+.2;
    for(const roof of roofs)if(Math.abs(x-roof.x)<roof.w/2&&Math.abs(z-roof.z)<roof.d/2)y=Math.max(y,roof.top);
    return y;
  }
  function respawn(i,initial=false) {
    const k=i*3,x=anchor.x+(Math.random()-.5)*anchor.w,z=anchor.z+(Math.random()-.5)*anchor.d;
    floor[i]=groundAt(x,z);positions[k]=x;positions[k+2]=z;positions[k+1]=floor[i]+(initial?Math.random():1)*(anchor.close?65:140);
  }
  function save() {try{localStorage.setItem(storageKey,JSON.stringify(state));}catch{}lastSave=performance.now();}
  function syncUI() {
    const time=formatTime(state.minutes),key=`${time}|${state.type}|${state.intensity}|${state.playing}|${state.cycle}|${state.particles}`;
    if(key===lastUI)return;lastUI=key;
    el('timeValue').textContent=time;el('timeValue').dateTime=time;
    el('timeSlider').value=String(Math.min(1435,Math.floor(state.minutes/5)*5));el('timeSlider').setAttribute('aria-valuetext',time);
    el('weatherToggle').textContent=`天气 · ${time}`;
    el('weatherType').value=state.type;el('weatherIntensity').value=String(Math.round(state.intensity*100));
    el('intensityValue').value=`${Math.round(state.intensity*100)}%`;
    el('weatherIntensity').disabled=state.type==='clear';
    el('timePlay').textContent=state.playing?'暂停时间':'播放昼夜';el('timePlay').setAttribute('aria-pressed',String(state.playing));
    el('timeCycle').value=String(state.cycle);el('weatherParticles').checked=state.particles;
    el('weatherParticles').disabled=!['rain','snow'].includes(state.type);
    el('weatherSummary').textContent=`${time} · ${weatherTypes[state.type].name}`;
    for(const button of el('timePresets').children)button.setAttribute('aria-pressed',String(Math.abs(state.minutes-Number(button.dataset.minutes))<1));
  }
  function set(patch) {state=normalizeWeather({...state,...patch});syncUI();save();}
  function toggle(open,{focus=true}={}) {
    if(open){unlock();onOpen();}
    el('weatherPanel').hidden=!open;el('weatherToggle').setAttribute('aria-expanded',String(open));
    if(focus)(open?el('timeSlider'):el('weatherToggle')).focus();
  }
  el('weatherToggle').addEventListener('click',()=>toggle(el('weatherPanel').hidden));
  el('weatherClose').addEventListener('click',()=>toggle(false));
  el('timeSlider').addEventListener('input',event=>set({minutes:Number(event.target.value),playing:false}));
  el('weatherType').addEventListener('change',event=>set({type:event.target.value}));
  el('weatherIntensity').addEventListener('input',event=>set({intensity:Number(event.target.value)/100}));
  el('timePlay').addEventListener('click',()=>set({playing:!state.playing}));
  el('timeCycle').addEventListener('change',event=>set({cycle:Number(event.target.value)}));
  el('timePresets').addEventListener('click',event=>{const button=event.target.closest('[data-minutes]');if(button)set({minutes:Number(button.dataset.minutes),playing:false});});
  el('weatherParticles').addEventListener('change',event=>set({particles:event.target.checked}));
  el('weatherReset').addEventListener('click',()=>set({...defaultWeather}));
  el('weatherPanel').addEventListener('keydown',event=>{if(event.key==='Escape'){event.stopPropagation();toggle(false);}});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)save();});
  syncUI();
  return {
    close:()=>toggle(false,{focus:false}),
    get state(){return {...state,time:formatTime(state.minutes),...{precipitationVisible:particles.visible,particleCount:particles.visible?geometry.drawRange.count:0}};},
    update(dt,camera,close,mode,baseFog) {
      // 后台不推进时间，不补播隐藏期间的降水；减少动态偏好默认仍是静止场景。
      if(document.hidden)return;
      if(state.playing){state.minutes=advanceTime(state.minutes,dt,state.cycle);syncUI();if(performance.now()-lastSave>3000)save();}
      const a=atmosphereFor(state);rendering.setAtmosphere(a);wet.value=a.wet;snow.value=a.snow;
      scene.fog.near=baseFog.near*(1-a.haze*.88);scene.fog.far=baseFog.far*(1-a.haze*.73);
      if(Math.abs(a.night-lastLit)>.005) {
        lastLit=a.night;
        for(const material of windows){material.emissive.setHex(0xffcd85);material.emissiveIntensity=a.night*.55*(material.userData.nightBrightness??1);}
        for(const material of lamps){material.emissive.setHex(0xffe6b5);material.emissiveIntensity=a.night*2.5;}
        for(const material of outlines){material.emissive.setHex(0xffc469);material.emissiveIntensity=a.night*2.1;}
        for(const material of facades){material.emissive.setHex(0xffc77d);material.emissiveIntensity=a.night*.018;}
        for(const {light,power} of nightLights)light.intensity=power*a.night;
      }
      const falling=['rain','snow'].includes(state.type)&&state.particles&&state.intensity>0;
      particles.visible=falling;
      if(!falling){particleMode='';return;}
      const center=close==='colonnade'?campusAxis.at(campusAxis.colonnade):close==='main'?campusAxis.at(20):{x:gate.x,z:gate.z+9};
      const nextAnchor=mode==='walk'?{x:camera.position.x,z:camera.position.z,w:80,d:80,close:true}:close?{x:center.x,z:center.z,w:135,d:130,close:true}:{x:0,z:0,w:580,d:780,close:false};
      const changed=particleMode!==state.type||!resetAnchor||resetAnchor.close!==nextAnchor.close||Math.hypot(resetAnchor.x-nextAnchor.x,resetAnchor.z-nextAnchor.z)>20;
      anchor=nextAnchor;
      if(changed)resetAnchor={...anchor};
      const count=Math.round((innerWidth<700?850:maxParticles)*state.intensity);geometry.setDrawRange(0,count);
      particleUniforms.snow.value=state.type==='snow'?1:0;particleUniforms.size.value=close?1:2.3;
      particleUniforms.tint.value.setHex(state.type==='snow'?0xf1f6ff:0xaec5dc);
      for(let i=0;i<count;i++) {
        const k=i*3;
        if(changed||!positions[k+1])respawn(i,true);
        if(!motion.matches) {
          positions[k+1]-=dt*(state.type==='snow'?3.5:38);
          // 雨丝保持近竖直，落点的屋顶高度不因横移失效。
          if(positions[k+1]<floor[i])respawn(i);
        }
      }
      particleMode=state.type;geometry.attributes.position.needsUpdate=true;
    }
  };
}
