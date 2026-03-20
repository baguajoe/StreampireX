// src/front/js/utils/motionstudio/easing.js
// SPX Motion — Complete easing library

export const EASING_FUNCTIONS = {
  linear:       t => t,
  easeIn:       t => t * t,
  easeOut:      t => t * (2 - t),
  easeInOut:    t => t < 0.5 ? 2*t*t : -1+(4-2*t)*t,
  easeInCubic:  t => t * t * t,
  easeOutCubic: t => (--t) * t * t + 1,
  easeInOutCubic: t => t < 0.5 ? 4*t*t*t : (t-1)*(2*t-2)*(2*t-2)+1,
  easeInQuart:  t => t * t * t * t,
  easeOutQuart: t => 1-(--t)*t*t*t,
  easeInOutQuart: t => t<0.5 ? 8*t*t*t*t : 1-8*(--t)*t*t*t,
  easeInQuint:  t => t*t*t*t*t,
  easeOutQuint: t => 1+(--t)*t*t*t*t,
  easeInSine:   t => 1 - Math.cos(t * Math.PI / 2),
  easeOutSine:  t => Math.sin(t * Math.PI / 2),
  easeInOutSine: t => -(Math.cos(Math.PI*t)-1)/2,
  easeInExpo:   t => t === 0 ? 0 : Math.pow(2, 10*t - 10),
  easeOutExpo:  t => t === 1 ? 1 : 1 - Math.pow(2, -10*t),
  easeInOutExpo: t => t===0?0:t===1?1:t<0.5?Math.pow(2,20*t-10)/2:(2-Math.pow(2,-20*t+10))/2,
  easeInCirc:   t => 1 - Math.sqrt(1 - t*t),
  easeOutCirc:  t => Math.sqrt(1-(--t)*t),
  easeInBack:   t => { const c = 1.70158; return t*t*((c+1)*t-c); },
  easeOutBack:  t => { const c = 1.70158; return 1+((--t)*t*((c+1)*t+c)); },
  easeInOutBack: t => { const c=1.70158*1.525; return t<0.5?(Math.pow(2*t,2)*((c+1)*2*t-c))/2:(Math.pow(2*t-2,2)*((c+1)*(t*2-2)+c)+2)/2; },
  easeInElastic: t => { if(t===0||t===1)return t; return -Math.pow(2,10*t-10)*Math.sin((t*10-10.75)*(2*Math.PI)/3); },
  easeOutElastic: t => { if(t===0||t===1)return t; return Math.pow(2,-10*t)*Math.sin((t*10-0.75)*(2*Math.PI)/3)+1; },
  easeInBounce: t => 1 - easeOutBounce(1-t),
  easeOutBounce: t => easeOutBounce(t),
  easeInOutBounce: t => t<0.5?(1-easeOutBounce(1-2*t))/2:(1+easeOutBounce(2*t-1))/2,
  step:         t => t < 0.5 ? 0 : 1,
  steps3:       t => Math.floor(t * 3) / 3,
  steps5:       t => Math.floor(t * 5) / 5,
};

function easeOutBounce(t) {
  const n=7.5625, d=2.75;
  if(t<1/d) return n*t*t;
  if(t<2/d) return n*(t-=1.5/d)*t+0.75;
  if(t<2.5/d) return n*(t-=2.25/d)*t+0.9375;
  return n*(t-=2.625/d)*t+0.984375;
}

export function applyEasing(name, t) {
  const fn = EASING_FUNCTIONS[name] || EASING_FUNCTIONS.linear;
  return Math.max(0, Math.min(1, fn(Math.max(0, Math.min(1, t)))));
}

export const EASING_CATEGORIES = {
  basic:   ['linear','easeIn','easeOut','easeInOut'],
  cubic:   ['easeInCubic','easeOutCubic','easeInOutCubic'],
  power:   ['easeInQuart','easeOutQuart','easeInOutQuart','easeInQuint','easeOutQuint'],
  sine:    ['easeInSine','easeOutSine','easeInOutSine'],
  expo:    ['easeInExpo','easeOutExpo','easeInOutExpo'],
  circ:    ['easeInCirc','easeOutCirc'],
  back:    ['easeInBack','easeOutBack','easeInOutBack'],
  elastic: ['easeInElastic','easeOutElastic'],
  bounce:  ['easeInBounce','easeOutBounce','easeInOutBounce'],
  step:    ['step','steps3','steps5'],
};

export default { EASING_FUNCTIONS, applyEasing, EASING_CATEGORIES };
