// SPX Vector — Live Effects Engine
export const EFFECT_DEFS = {
  drop_shadow:   { label:'Drop Shadow',   params:{ offsetX:{label:'X',min:-50,max:50,default:4,unit:'px'}, offsetY:{label:'Y',min:-50,max:50,default:4,unit:'px'}, blur:{label:'Blur',min:0,max:50,default:6,unit:'px'}, color:{label:'Color',type:'color',default:'#000000'}, opacity:{label:'Opacity',min:0,max:100,default:60,unit:'%'} } },
  outer_glow:    { label:'Outer Glow',    params:{ blur:{label:'Blur',min:0,max:80,default:12,unit:'px'}, color:{label:'Color',type:'color',default:'#00ffc8'}, opacity:{label:'Opacity',min:0,max:100,default:80,unit:'%'} } },
  inner_glow:    { label:'Inner Glow',    params:{ blur:{label:'Blur',min:0,max:40,default:8,unit:'px'}, color:{label:'Color',type:'color',default:'#ffffff'}, opacity:{label:'Opacity',min:0,max:100,default:60,unit:'%'} } },
  gaussian_blur: { label:'Gaussian Blur', params:{ radius:{label:'Radius',min:0,max:50,default:4,unit:'px'} } },
  stroke_outline:{ label:'Stroke Outline',params:{ width:{label:'Width',min:0,max:40,default:2,unit:'px'}, color:{label:'Color',type:'color',default:'#ffffff'} } },
  bevel_emboss:  { label:'Bevel & Emboss',params:{ depth:{label:'Depth',min:1,max:20,default:5,unit:'px'}, angle:{label:'Angle',min:0,max:360,default:135,unit:'°'}, highlight:{label:'Highlight',type:'color',default:'#ffffff'}, shadow:{label:'Shadow',type:'color',default:'#000000'} } },
  color_overlay: { label:'Color Overlay', params:{ color:{label:'Color',type:'color',default:'#ff6600'}, opacity:{label:'Opacity',min:0,max:100,default:100,unit:'%'} } },
};

export function buildSVGFilter(effects=[], filterId) {
  const active = effects.filter(e=>e.enabled);
  if (!active.length) return null;
  let prim = '', chain = 'SourceGraphic';
  active.forEach((fx,i) => {
    const p = fx.params, out = `r${i}`;
    if (fx.type==='drop_shadow')   { prim+=`<feDropShadow dx="${p.offsetX}" dy="${p.offsetY}" stdDeviation="${p.blur}" flood-color="${p.color}" flood-opacity="${(p.opacity/100).toFixed(2)}" result="${out}"/>`; chain=out; }
    if (fx.type==='gaussian_blur') { prim+=`<feGaussianBlur in="${chain}" stdDeviation="${p.radius}" result="${out}"/>`; chain=out; }
    if (fx.type==='outer_glow')    { prim+=`<feGaussianBlur in="SourceAlpha" stdDeviation="${p.blur}" result="gb${i}"/><feFlood flood-color="${p.color}" flood-opacity="${(p.opacity/100).toFixed(2)}" result="gc${i}"/><feComposite in="gc${i}" in2="gb${i}" operator="in" result="gd${i}"/><feMerge result="${out}"><feMergeNode in="gd${i}"/><feMergeNode in="${chain}"/></feMerge>`; chain=out; }
    if (fx.type==='inner_glow')    { prim+=`<feGaussianBlur in="SourceAlpha" stdDeviation="${p.blur}" result="ig${i}"/><feFlood flood-color="${p.color}" flood-opacity="${(p.opacity/100).toFixed(2)}" result="ic${i}"/><feComposite in="ic${i}" in2="ig${i}" operator="in" result="id${i}"/><feComposite in="${chain}" in2="id${i}" operator="over" result="${out}"/>`; chain=out; }
    if (fx.type==='color_overlay') { prim+=`<feFlood flood-color="${p.color}" flood-opacity="${(p.opacity/100).toFixed(2)}" result="oc${i}"/><feComposite in="oc${i}" in2="SourceAlpha" operator="in" result="${out}"/>`; chain=out; }
    if (fx.type==='bevel_emboss')  { prim+=`<feGaussianBlur in="SourceAlpha" stdDeviation="${p.depth*0.5}" result="bb${i}"/><feSpecularLighting in="bb${i}" surfaceScale="${p.depth}" specularConstant="1" specularExponent="20" lighting-color="${p.highlight}" result="${out}"><feDistantLight azimuth="${p.angle}" elevation="45"/></feSpecularLighting>`; chain=out; }
    if (fx.type==='stroke_outline'){ prim+=`<feMorphology in="SourceAlpha" operator="dilate" radius="${p.width}" result="so${i}"/><feFlood flood-color="${p.color}" result="sc${i}"/><feComposite in="sc${i}" in2="so${i}" operator="in" result="sd${i}"/><feMerge result="${out}"><feMergeNode in="sd${i}"/><feMergeNode in="${chain}"/></feMerge>`; chain=out; }
  });
  return `<filter id="${filterId}" x="-50%" y="-50%" width="200%" height="200%">${prim}</filter>`;
}

export function defaultEffect(type) {
  const def = EFFECT_DEFS[type];
  if (!def) return null;
  const params = {};
  Object.entries(def.params).forEach(([k,v]) => { params[k] = v.default; });
  return { id: `fx_${Date.now()}_${Math.random().toString(36).slice(2,5)}`, type, enabled: true, params };
}
