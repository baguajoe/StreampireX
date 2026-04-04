// SPX Vector — Blend Tool
export function blendLayers(layerA, layerB, steps=5) {
  const lerp = (a,b,t) => a+(b-a)*t;
  function parseRGB(color) {
    if (!color || color==='none') return [0,0,0,0];
    const cv = document.createElement('canvas'); cv.width=cv.height=1;
    const ctx = cv.getContext('2d'); ctx.fillStyle=color; ctx.fillRect(0,0,1,1);
    const d = ctx.getImageData(0,0,1,1).data; return [d[0],d[1],d[2],d[3]];
  }
  function lerpColor(a,b,t) {
    if (!a||a==='none') return b; if (!b||b==='none') return a;
    const [r1,g1,b1,a1]=parseRGB(a), [r2,g2,b2,a2]=parseRGB(b);
    return `rgba(${Math.round(lerp(r1,r2,t))},${Math.round(lerp(g1,g2,t))},${Math.round(lerp(b1,b2,t))},${(lerp(a1,a2,t)/255).toFixed(3)})`;
  }
  return Array.from({length:steps},(_,i) => {
    const t = (i+1)/(steps+1);
    return {
      id:`blend_${Date.now()}_${i}`, type:layerA.type,
      x:lerp(layerA.x||0,layerB.x||0,t), y:lerp(layerA.y||0,layerB.y||0,t),
      width:lerp(layerA.width||100,layerB.width||100,t),
      height:lerp(layerA.height||100,layerB.height||100,t),
      rotation:lerp(layerA.rotation||0,layerB.rotation||0,t),
      opacity:lerp(layerA.opacity??1,layerB.opacity??1,t),
      fill:lerpColor(layerA.fill,layerB.fill,t),
      stroke:lerpColor(layerA.stroke,layerB.stroke,t),
      strokeWidth:lerp(layerA.strokeWidth||0,layerB.strokeWidth||0,t),
      name:`Blend ${i+1}`, visible:true, locked:false, effects:[],
    };
  });
}
