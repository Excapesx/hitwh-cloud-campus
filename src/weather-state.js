// 场景艺术时间，不是威海指定日期的日出日落或气象预报。
export const weatherTypes = {
  clear: {name:'晴天',cloud:.02,sun:1,haze:0,wet:0,snow:0},
  cloudy: {name:'多云',cloud:.48,sun:.7,haze:.1,wet:0,snow:0},
  overcast: {name:'阴天',cloud:.95,sun:.13,haze:.35,wet:0,snow:0},
  rain: {name:'雨天',cloud:1,sun:.09,haze:.5,wet:1,snow:0},
  snow: {name:'雪天',cloud:.9,sun:.2,haze:.42,wet:0,snow:1},
  fog: {name:'雾天',cloud:.68,sun:.17,haze:1,wet:0,snow:0}
};
export const defaultWeather = {minutes:14*60,type:'clear',intensity:.65,playing:false,cycle:300,particles:true};
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
export function normalizeWeather(value={}) {
  if(!value||typeof value!=='object')value={};
  const finite=(v,f)=>typeof v==='number'&&Number.isFinite(v)?v:f;
  return {
    minutes:((finite(value.minutes,defaultWeather.minutes)%1440)+1440)%1440,
    type:Object.hasOwn(weatherTypes,value.type)?value.type:defaultWeather.type,
    intensity:clamp(finite(value.intensity,defaultWeather.intensity),0,1),
    playing:typeof value.playing==='boolean'?value.playing:false,
    cycle:[60,300,900].includes(value.cycle)?value.cycle:300,
    particles:typeof value.particles==='boolean'?value.particles:true
  };
}
export function advanceTime(minutes,seconds,cycle) {return ((minutes+Math.max(0,seconds)*1440/cycle)%1440+1440)%1440;}
export function formatTime(minutes) {const m=((Math.floor(minutes)%1440)+1440)%1440;return `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;}
export function atmosphereFor(value) {
  const state=normalizeWeather(value),preset=weatherTypes[state.type],strength=state.intensity;
  const angle=(state.minutes/60-6)*Math.PI/12;
  const altitude=Math.sin(angle),day=smooth(-.14,.22,altitude),night=1-smooth(-.2,.08,altitude);
  return {...state,day,night,altitude,
    direction:[-Math.cos(angle)*.94,altitude,.34],
    cloud:['rain','snow'].includes(state.type)?.86+.14*state.intensity:Math.min(1,preset.cloud*strength),
    sun:3.6*smooth(-.04,.32,altitude)*(state.type==='clear'?1:1-(1-preset.sun)*(.4+.6*strength)),
    haze:preset.haze*strength,wet:preset.wet*strength,snow:preset.snow*strength,
    warm:day*(1-smooth(.08,.65,altitude))
  };
}
