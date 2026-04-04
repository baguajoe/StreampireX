import React, { useState, useRef, useEffect } from 'react';
import { Eye, EyeOff, Trash2, Sparkles, Sun, Layers, Palette, Move, RotateCw, ZoomIn, Minimize2, ChevronDown, ChevronUp, Wand2 } from 'lucide-react';

const T = {
  bg0:'#04040c', bg1:'#07070f', bg2:'#0c0c18', bg3:'#111120',
  border:'rgba(255,255,255,0.06)', border2:'rgba(255,255,255,0.1)',
  teal:'#00ffc8', tealDim:'rgba(0,255,200,0.08)',
  orange:'#ff6b35', purple:'#a78bfa',
  text:'#f0f4f8', dim:'rgba(255,255,255,0.4)', dim2:'rgba(255,255,255,0.2)',
  red:'#f85149', font:"'JetBrains Mono', monospace",
};

const COLOR_PRESETS = [
  {name:'Cinematic',   sat:85,  con:110, temp:-10, tint:0},
  {name:'Vivid',       sat:130, con:105, temp:5,   tint:0},
  {name:'Matte',       sat:90,  con:85,  temp:0,   tint:5},
  {name:'B&W',         sat:0,   con:110, temp:0,   tint:0},
  {name:'Warm',        sat:105, con:100, temp:20,  tint:5},
  {name:'Cool',        sat:100, con:100, temp:-20, tint:-5},
  {name:'Golden Hour', sat:115, con:105, temp:30,  tint:10},
  {name:'Teal/Orange', sat:110, con:108, temp:-5,  tint:0},
];

const LUT_PRESETS = [
  {name:'Kodak 2383',     cat:'film',    sat:90,  con:112, temp:8,   tint:3},
  {name:'Kodak 5218',     cat:'film',    sat:85,  con:108, temp:12,  tint:2},
  {name:'Fuji 3513',      cat:'film',    sat:95,  con:105, temp:-5,  tint:2},
  {name:'Fuji Velvia',    cat:'film',    sat:140, con:115, temp:0,   tint:0},
  {name:'Ilford HP5 B&W', cat:'film',    sat:0,   con:118, temp:0,   tint:0},
  {name:'Teal & Orange',  cat:'cinema',  sat:110, con:108, temp:-5,  tint:0},
  {name:'Bleach Bypass',  cat:'cinema',  sat:55,  con:130, temp:0,   tint:0},
  {name:'Day for Night',  cat:'cinema',  sat:70,  con:95,  temp:-30, tint:-5},
  {name:'Anamorphic Blue',cat:'cinema',  sat:95,  con:105, temp:-15, tint:-8},
  {name:'Blockbuster',    cat:'cinema',  sat:120, con:115, temp:5,   tint:2},
  {name:'Instagram Warm', cat:'social',  sat:108, con:105, temp:18,  tint:5},
  {name:'TikTok Vivid',   cat:'social',  sat:135, con:112, temp:5,   tint:0},
  {name:'YouTube Clean',  cat:'social',  sat:105, con:105, temp:3,   tint:1},
  {name:'Music Video',    cat:'social',  sat:125, con:115, temp:-8,  tint:-5},
  {name:'70s Fade',       cat:'vintage', sat:75,  con:90,  temp:20,  tint:8},
  {name:'80s VHS',        cat:'vintage', sat:110, con:95,  temp:10,  tint:-5},
  {name:'Super 8',        cat:'vintage', sat:85,  con:105, temp:25,  tint:10},
  {name:'Golden Hour',    cat:'nature',  sat:115, con:105, temp:30,  tint:10},
  {name:'Blue Hour',      cat:'nature',  sat:90,  con:108, temp:-25, tint:-5},
  {name:'Forest Green',   cat:'nature',  sat:120, con:108, temp:-8,  tint:-5},
  {name:'Rec.709',        cat:'tech',    sat:100, con:100, temp:0,   tint:0},
  {name:'LOG to Rec709',  cat:'tech',    sat:100, con:115, temp:0,   tint:0},
  {name:'SLOG2 Correct',  cat:'tech',    sat:100, con:118, temp:0,   tint:0},
];

// ── Color Wheel ───────────────────────────────────────────
function ColorWheel({ label, value, onChange, size=90 }) {
  const canvasRef = useRef(null);
  const dragging  = useRef(false);
  useEffect(() => {
    const canvas = canvasRef.current; if(!canvas) return;
    const ctx = canvas.getContext('2d');
    const cx=size/2, cy=size/2, r=size/2-3;
    ctx.clearRect(0,0,size,size);
    for (let a=0; a<360; a++) {
      const s=(a-1)*Math.PI/180, e2=(a+1)*Math.PI/180;
      const g=ctx.createRadialGradient(cx,cy,0,cx,cy,r);
      g.addColorStop(0,`hsla(${a},0%,50%,1)`); g.addColorStop(1,`hsla(${a},100%,50%,1)`);
      ctx.beginPath(); ctx.moveTo(cx,cy); ctx.arc(cx,cy,r,s,e2); ctx.fillStyle=g; ctx.fill();
    }
    const ix=cx+(value.x||0)*r*0.8, iy=cy+(value.y||0)*r*0.8;
    ctx.beginPath(); ctx.arc(ix,iy,4,0,Math.PI*2); ctx.strokeStyle='#fff'; ctx.lineWidth=2; ctx.stroke(); ctx.fillStyle='rgba(0,0,0,.5)'; ctx.fill();
  }, [value, size]);
  const onMouse = e => {
    if (!dragging.current) return;
    const rect=canvasRef.current.getBoundingClientRect(), cx=size/2, cy=size/2, r=size/2-3;
    onChange({...value, x:Math.max(-1,Math.min(1,(e.clientX-rect.left-cx)/r)), y:Math.max(-1,Math.min(1,(e.clientY-rect.top-cy)/r))});
  };
  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:4}}>
      <canvas ref={canvasRef} width={size} height={size} style={{borderRadius:'50%',cursor:'crosshair',border:'1px solid rgba(255,255,255,0.1)'}}
        onMouseDown={()=>{dragging.current=true}} onMouseMove={onMouse} onMouseUp={()=>{dragging.current=false}} onMouseLeave={()=>{dragging.current=false}}/>
      <div style={{fontSize:9,color:T.dim2,textTransform:'uppercase',letterSpacing:1,fontFamily:T.font}}>{label}</div>
      <input type="range" min={-100} max={100} value={Math.round((value.brightness||0)*100)} style={{width:size,accentColor:T.teal}} onChange={e=>onChange({...value,brightness:parseInt(e.target.value)/100})}/>
    </div>
  );
}

// ── Color Panel ───────────────────────────────────────────
export function VideoEditorColorPanel({ selectedClip, applyEffectToClip, onClose }) {
  const [lift,  setLift]  = useState({x:0,y:0,brightness:0});
  const [gamma, setGamma] = useState({x:0,y:0,brightness:0});
  const [gain,  setGain]  = useState({x:0,y:0,brightness:0});
  const [sat,   setSat]   = useState(100);
  const [con,   setCon]   = useState(100);
  const [temp,  setTemp]  = useState(0);
  const [tint,  setTint]  = useState(0);
  const [activeLUT, setActiveLUT] = useState(null);
  const lutCats = [...new Set(LUT_PRESETS.map(l=>l.cat))];

  const applyLUT = (lut) => {
    if (!selectedClip) return;
    setSat(lut.sat); setCon(lut.con); setTemp(lut.temp); setTint(lut.tint); setActiveLUT(lut.name);
    applyEffectToClip(selectedClip.id,'saturation',Math.round(lut.sat/2));
    applyEffectToClip(selectedClip.id,'contrast',Math.round(lut.con/2));
    applyEffectToClip(selectedClip.id,'hue',Math.round(lut.temp+50));
  };

  const panelStyle = { position:'fixed', right:0, top:72, width:320, height:'calc(100vh - 72px)', background:'#0e0e1e', borderLeft:'1px solid rgba(255,255,255,0.1)', zIndex:200, display:'flex', flexDirection:'column', overflow:'hidden', boxShadow:'-16px 0 48px rgba(0,0,0,0.7)' };
  const sliders = [['Saturation',sat,setSat,0,200,'#bf5af2'],['Contrast',con,setCon,50,150,T.orange],['Temperature',temp,setTemp,-50,50,'#ffd60a'],['Tint',tint,setTint,-50,50,'#30d158']];

  return (
    <div style={panelStyle}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 16px',background:'rgba(255,255,255,0.03)',borderBottom:'1px solid rgba(255,255,255,0.07)',flexShrink:0}}>
        <span style={{fontSize:12,fontWeight:700,color:T.text,fontFamily:T.font}}>🎨 Lumetri Color</span>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          {selectedClip&&<span style={{fontSize:10,color:T.dim,fontFamily:T.font}}>{selectedClip.title}</span>}
          <button onClick={onClose} style={{background:'transparent',border:'none',color:T.dim,cursor:'pointer',fontSize:16}}>✕</button>
        </div>
      </div>
      <div style={{flex:1,overflowY:'auto',padding:12}}>
        {/* Quick presets */}
        <div style={{fontSize:10,fontWeight:700,color:T.dim2,textTransform:'uppercase',letterSpacing:.5,marginBottom:6,fontFamily:T.font}}>Quick Presets</div>
        <div style={{display:'flex',flexWrap:'wrap',gap:4,marginBottom:12}}>
          {COLOR_PRESETS.map(p=>(
            <button key={p.name} onClick={()=>applyLUT(p)} style={{padding:'3px 8px',background:activeLUT===p.name?T.tealDim:'rgba(255,255,255,0.04)',border:`1px solid ${activeLUT===p.name?'rgba(0,255,200,0.3)':'rgba(255,255,255,0.08)'}`,borderRadius:5,color:activeLUT===p.name?T.teal:'rgba(255,255,255,0.5)',fontSize:10,cursor:'pointer',fontFamily:T.font}}>{p.name}</button>
          ))}
        </div>
        {/* LUT packs */}
        {lutCats.map(cat=>(
          <div key={cat} style={{marginBottom:8}}>
            <div style={{fontSize:9,fontWeight:700,color:T.dim2,textTransform:'uppercase',letterSpacing:.5,marginBottom:4,fontFamily:T.font}}>{cat.charAt(0).toUpperCase()+cat.slice(1)}</div>
            <div style={{display:'flex',flexWrap:'wrap',gap:3}}>
              {LUT_PRESETS.filter(l=>l.cat===cat).map(lut=>(
                <button key={lut.name} onClick={()=>applyLUT(lut)} title={`Sat:${lut.sat} Con:${lut.con} Temp:${lut.temp}`} style={{padding:'3px 7px',background:activeLUT===lut.name?T.tealDim:'rgba(255,255,255,0.03)',border:`1px solid ${activeLUT===lut.name?'rgba(0,255,200,0.3)':'rgba(255,255,255,0.07)'}`,borderRadius:5,color:activeLUT===lut.name?T.teal:'rgba(255,255,255,0.45)',fontSize:9,cursor:'pointer',fontFamily:T.font}}>{lut.name}</button>
              ))}
            </div>
          </div>
        ))}
        <div style={{height:1,background:T.border,margin:'10px 0'}}/>
        {/* Color wheels */}
        <div style={{fontSize:10,fontWeight:700,color:T.dim2,textTransform:'uppercase',letterSpacing:.5,marginBottom:8,fontFamily:T.font}}>Color Wheels</div>
        <div style={{display:'flex',gap:10,justifyContent:'center',flexWrap:'wrap',marginBottom:12}}>
          <ColorWheel label="Lift" value={lift} onChange={setLift} size={85}/>
          <ColorWheel label="Gamma" value={gamma} onChange={setGamma} size={85}/>
          <ColorWheel label="Gain" value={gain} onChange={setGain} size={85}/>
        </div>
        <div style={{height:1,background:T.border,margin:'10px 0'}}/>
        {/* Sliders */}
        <div style={{fontSize:10,fontWeight:700,color:T.dim2,textTransform:'uppercase',letterSpacing:.5,marginBottom:8,fontFamily:T.font}}>Adjustments</div>
        {sliders.map(([lbl,val,setter,mn,mx,col])=>(
          <div key={lbl} style={{marginBottom:10}}>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:10,color:T.dim,marginBottom:4,fontFamily:T.font}}>
              <span>{lbl}</span><span style={{color:col,fontFamily:'monospace'}}>{val}</span>
            </div>
            <input type="range" min={mn} max={mx} value={val} style={{width:'100%',accentColor:col}} onChange={e=>setter(parseInt(e.target.value))}/>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Audio Mixer ───────────────────────────────────────────
export function VideoEditorAudioMixer({ tracks, onClose }) {
  const audioTracks = tracks.filter(t => t.type==='audio'||t.type==='video');
  return (
    <div style={{position:'fixed',bottom:0,left:0,right:0,height:220,background:'#0e0e1e',borderTop:'1px solid rgba(255,255,255,0.1)',zIndex:200,display:'flex',flexDirection:'column',boxShadow:'0 -16px 48px rgba(0,0,0,0.7)'}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'6px 16px',background:'rgba(255,255,255,0.03)',borderBottom:'1px solid rgba(255,255,255,0.07)',flexShrink:0}}>
        <span style={{fontSize:12,fontWeight:700,color:T.text,fontFamily:T.font}}>🎚 Audio Mixer</span>
        <button onClick={onClose} style={{background:'transparent',border:'none',color:T.dim,cursor:'pointer',fontSize:16}}>✕</button>
      </div>
      <div style={{display:'flex',flex:1,overflowX:'auto'}}>
        {audioTracks.map(track=>(
          <div key={track.id} style={{display:'flex',flexDirection:'column',alignItems:'center',padding:'8px 12px',borderRight:'1px solid rgba(255,255,255,0.06)',minWidth:80,gap:4}}>
            <div style={{fontSize:9,fontWeight:700,textTransform:'uppercase',color:T.dim2,fontFamily:T.font,marginBottom:2}}>{track.name}</div>
            <input type="range" min={-100} max={100} defaultValue={0} style={{width:60,accentColor:T.teal}}/>
            <div style={{display:'flex',flexDirection:'column-reverse',gap:1,flex:1,width:16}}>
              {[...Array(20)].map((_,i)=>(
                <div key={i} style={{height:3,borderRadius:1,background:i<3?'rgba(248,81,73,0.6)':i<6?'rgba(255,214,10,0.6)':'rgba(0,255,200,0.35)'}}/>
              ))}
            </div>
            <div style={{display:'flex',gap:3}}>
              <button style={{padding:'2px 5px',background:'transparent',border:'1px solid rgba(248,81,73,0.3)',borderRadius:3,color:'#f85149',fontSize:9,fontWeight:700,cursor:'pointer',fontFamily:T.font}}>M</button>
              <button style={{padding:'2px 5px',background:'transparent',border:'1px solid rgba(255,214,10,0.3)',borderRadius:3,color:'#ffd60a',fontSize:9,fontWeight:700,cursor:'pointer',fontFamily:T.font}}>S</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Right Panel ───────────────────────────────────────────
export default function VideoEditorRightPanel({
  selectedClip, selectedTransition,
  applyEffectToClip, removeEffectFromClip, toggleEffect,
  updateEffectValue, updateCompositing, setSelectedTransition,
  tracks, setTracks,
}) {
  const [tab, setTab] = useState('effects');

  const tabs = [['effects','Effects'],['transform','Transform'],['comp','Compositing']];

  const tabStyle = (id) => ({
    flex:1, minWidth:48, padding:'8px 4px',
    background:'transparent', border:'none',
    borderBottom:`2px solid ${tab===id?T.teal:'transparent'}`,
    color:tab===id?T.teal:T.dim, fontSize:10, fontWeight:700,
    textTransform:'uppercase', letterSpacing:.5,
    cursor:'pointer', whiteSpace:'nowrap', fontFamily:T.font, transition:'all .15s',
  });

  const label = (text, val, color=T.teal) => (
    <div style={{display:'flex',justifyContent:'space-between',fontSize:10,color:T.dim,marginBottom:4,fontFamily:T.font}}>
      <span>{text}</span><span style={{color,fontFamily:'monospace'}}>{val}</span>
    </div>
  );

  const slider = (val, onChange, min=0, max=100, accent=T.teal) => (
    <input type="range" min={min} max={max} value={val} onChange={e=>onChange(Number(e.target.value))} style={{width:'100%',accentColor:accent,marginBottom:8}}/>
  );

  const comp = selectedClip?.compositing || {opacity:100,blendMode:'normal',position:{x:0,y:0},scale:{x:100,y:100},rotation:0};

  const BLEND_MODES = ['normal','multiply','screen','overlay','darken','lighten','color-dodge','color-burn','hard-light','soft-light','difference','exclusion','hue','saturation','color','luminosity'];

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%',overflow:'hidden'}}>
      {/* Tab bar */}
      <div style={{display:'flex',flexShrink:0,borderBottom:`1px solid ${T.border}`,background:T.bg0,overflowX:'auto'}}>
        {tabs.map(([id,lbl])=><button key={id} style={tabStyle(id)} onClick={()=>setTab(id)}>{lbl}</button>)}
      </div>

      {/* Content */}
      <div style={{flex:1,overflowY:'auto',padding:10}}>

        {!selectedClip && !selectedTransition && (
          <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:12,padding:'32px 16px',color:T.dim2,textAlign:'center',height:'80%'}}>
            <Sparkles size={32} style={{opacity:.3}}/>
            <p style={{fontSize:11,lineHeight:1.5,fontFamily:T.font}}>Select a clip or transition<br/>to edit its properties.</p>
          </div>
        )}

        {/* ── EFFECTS TAB ─────────────────────────── */}
        {tab==='effects' && selectedClip && (
          <>
            <div style={{fontSize:10,fontWeight:700,color:T.dim2,textTransform:'uppercase',letterSpacing:.5,marginBottom:8,fontFamily:T.font}}>Effects Stack — {selectedClip.title}</div>
            {(!selectedClip.effects||selectedClip.effects.length===0) ? (
              <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:8,padding:'24px 12px',color:T.dim2,textAlign:'center'}}>
                <Wand2 size={24} style={{opacity:.4}}/>
                <p style={{fontSize:11,fontFamily:T.font}}>No effects applied.<br/>Drag from left panel or select a clip then click an effect.</p>
              </div>
            ) : (
              (selectedClip.effects||[]).map((fx,i)=>(
                <div key={i} style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:8,marginBottom:6,overflow:'hidden'}}>
                  <div style={{display:'flex',alignItems:'center',gap:6,padding:'7px 10px',borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
                    <button onClick={()=>toggleEffect&&toggleEffect(selectedClip.id,fx.id)} style={{background:'transparent',border:'none',color:fx.enabled!==false?T.teal:T.dim2,display:'flex',alignItems:'center',cursor:'pointer'}}>
                      {fx.enabled!==false?<Eye size={12}/>:<EyeOff size={12}/>}
                    </button>
                    <span style={{flex:1,fontSize:11,fontWeight:600,color:T.text,fontFamily:T.font}}>{fx.id}</span>
                    <span style={{fontSize:10,color:T.teal,minWidth:32,textAlign:'right',fontFamily:'monospace'}}>{fx.value||50}</span>
                    <button onClick={()=>removeEffectFromClip&&removeEffectFromClip(selectedClip.id,fx.id)} style={{background:'transparent',border:'none',color:T.dim2,display:'flex',alignItems:'center',cursor:'pointer'}}>
                      <Trash2 size={11}/>
                    </button>
                  </div>
                  <div style={{padding:'6px 10px 8px'}}>
                    {label('Value', fx.value||50)}
                    {slider(fx.value||50, v=>updateEffectValue&&updateEffectValue(selectedClip.id,fx.id,v))}
                  </div>
                </div>
              ))
            )}
            {/* Quick apply buttons */}
            <div style={{fontSize:10,fontWeight:700,color:T.dim2,textTransform:'uppercase',letterSpacing:.5,margin:'12px 0 6px',fontFamily:T.font}}>Quick Apply</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:4}}>
              {[['fadeIn','Fade In'],['fadeOut','Fade Out'],['brightness','Brightness'],['contrast','Contrast'],['saturation','Saturation'],['blur','Blur']].map(([id,name])=>(
                <button key={id} onClick={()=>applyEffectToClip&&applyEffectToClip(selectedClip.id,id,50)}
                  style={{display:'flex',alignItems:'center',gap:4,padding:'5px 8px',background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:5,color:T.dim,fontSize:10,cursor:'pointer',fontFamily:T.font,transition:'all .12s'}}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor='rgba(0,255,200,0.25)';e.currentTarget.style.color=T.teal;}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor='rgba(255,255,255,0.07)';e.currentTarget.style.color=T.dim;}}>
                  + {name}
                </button>
              ))}
            </div>
          </>
        )}

        {/* ── TRANSFORM TAB ───────────────────────── */}
        {tab==='transform' && selectedClip && (
          <>
            <div style={{fontSize:10,fontWeight:700,color:T.dim2,textTransform:'uppercase',letterSpacing:.5,marginBottom:12,fontFamily:T.font}}>Transform</div>
            {/* Position */}
            <div style={{marginBottom:12}}>
              <div style={{fontSize:10,color:T.dim,marginBottom:6,fontFamily:T.font}}>Position</div>
              <div style={{display:'flex',gap:6}}>
                {['x','y'].map(axis=>(
                  <div key={axis} style={{flex:1,display:'flex',alignItems:'center',gap:4}}>
                    <span style={{fontSize:10,color:T.dim2,minWidth:12,fontFamily:T.font}}>{axis.toUpperCase()}</span>
                    <input type="number" value={comp.position?.[axis]||0} onChange={e=>updateCompositing&&updateCompositing(selectedClip.id,{position:{...comp.position,[axis]:Number(e.target.value)}})}
                      style={{flex:1,background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:5,color:T.text,fontSize:10,padding:'4px 7px',fontFamily:T.font,width:'100%'}}/>
                  </div>
                ))}
              </div>
            </div>
            {/* Scale */}
            <div style={{marginBottom:12}}>
              <div style={{fontSize:10,color:T.dim,marginBottom:6,fontFamily:T.font}}>Scale</div>
              <div style={{display:'flex',gap:6}}>
                {['x','y'].map(axis=>(
                  <div key={axis} style={{flex:1,display:'flex',alignItems:'center',gap:4}}>
                    <span style={{fontSize:10,color:T.dim2,minWidth:12,fontFamily:T.font}}>{axis.toUpperCase()}</span>
                    <input type="number" value={comp.scale?.[axis]||100} onChange={e=>updateCompositing&&updateCompositing(selectedClip.id,{scale:{...comp.scale,[axis]:Number(e.target.value)}})}
                      style={{flex:1,background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:5,color:T.text,fontSize:10,padding:'4px 7px',fontFamily:T.font,width:'100%'}}/>
                  </div>
                ))}
              </div>
            </div>
            {/* Rotation */}
            <div style={{marginBottom:12}}>
              {label('Rotation', `${comp.rotation||0}°`)}
              {slider(comp.rotation||0, v=>updateCompositing&&updateCompositing(selectedClip.id,{rotation:v}), -180, 180)}
            </div>
            {/* Opacity */}
            <div style={{marginBottom:12}}>
              {label('Opacity', `${comp.opacity||100}%`)}
              {slider(comp.opacity||100, v=>updateCompositing&&updateCompositing(selectedClip.id,{opacity:v}))}
            </div>
            {/* Presets */}
            <div style={{fontSize:10,fontWeight:700,color:T.dim2,textTransform:'uppercase',letterSpacing:.5,marginBottom:6,fontFamily:T.font}}>Presets</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:4}}>
              {[['Full','Reset to full'],['PiP','Picture in picture'],['Lower Third','Lower third'],['Side by Side','Side by side']].map(([name,tip])=>(
                <button key={name} title={tip}
                  style={{padding:'5px 8px',background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:5,color:T.dim,fontSize:10,cursor:'pointer',fontFamily:T.font}}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor='rgba(255,107,53,0.3)';e.currentTarget.style.color=T.orange;}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor='rgba(255,255,255,0.07)';e.currentTarget.style.color=T.dim;}}>
                  {name}
                </button>
              ))}
            </div>
          </>
        )}

        {/* ── COMPOSITING TAB ─────────────────────── */}
        {tab==='comp' && selectedClip && (
          <>
            <div style={{fontSize:10,fontWeight:700,color:T.dim2,textTransform:'uppercase',letterSpacing:.5,marginBottom:12,fontFamily:T.font}}>Compositing</div>
            {/* Blend mode */}
            <div style={{marginBottom:12}}>
              <div style={{fontSize:10,color:T.dim,marginBottom:5,fontFamily:T.font}}>Blend Mode</div>
              <select value={comp.blendMode||'normal'} onChange={e=>updateCompositing&&updateCompositing(selectedClip.id,{blendMode:e.target.value})}
                style={{width:'100%',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:6,color:T.text,fontSize:10,padding:'6px 8px',fontFamily:T.font}}>
                {BLEND_MODES.map(m=><option key={m} value={m}>{m.charAt(0).toUpperCase()+m.slice(1)}</option>)}
              </select>
            </div>
            {/* Opacity */}
            <div style={{marginBottom:12}}>
              {label('Opacity', `${comp.opacity||100}%`)}
              {slider(comp.opacity||100, v=>updateCompositing&&updateCompositing(selectedClip.id,{opacity:v}))}
            </div>
          </>
        )}

        {/* Transition properties */}
        {selectedTransition && (
          <div>
            <div style={{fontSize:10,fontWeight:700,color:T.purple,textTransform:'uppercase',letterSpacing:.5,marginBottom:8,fontFamily:T.font}}>Transition — {selectedTransition.type}</div>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:10,color:T.dim,marginBottom:4,fontFamily:T.font}}>
              <span>Duration</span><span style={{color:T.text}}>{selectedTransition.duration}s</span>
            </div>
            <input type="range" min={0.1} max={3} step={0.1} value={selectedTransition.duration||1} style={{width:'100%',accentColor:T.purple}} onChange={()=>{}}/>
            <button onClick={()=>setSelectedTransition(null)} style={{marginTop:12,width:'100%',padding:'7px',background:'rgba(248,81,73,0.08)',border:'1px solid rgba(248,81,73,0.2)',borderRadius:6,color:'#f85149',fontSize:10,cursor:'pointer',fontFamily:T.font}}>Remove Transition</button>
          </div>
        )}
      </div>
    </div>
  );
}
