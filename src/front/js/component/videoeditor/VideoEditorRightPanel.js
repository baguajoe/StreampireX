import React, { useState, useRef, useEffect } from 'react';
import { X, Eye, EyeOff, Trash2, RefreshCw, Copy, Sparkles, Wand2,
  Sun, Layers, Palette, Move, RotateCw, ZoomIn, ArrowLeftRight,
  Minimize2, ChevronDown, ChevronUp } from 'lucide-react';

// ── Quick color presets ───────────────────────────────────
const COLOR_PRESETS = [
  { name:'Cinematic',   sat:85,  con:110, temp:-10, tint:0  },
  { name:'Vivid',       sat:130, con:105, temp:5,   tint:0  },
  { name:'Matte',       sat:90,  con:85,  temp:0,   tint:5  },
  { name:'B&W',         sat:0,   con:110, temp:0,   tint:0  },
  { name:'Warm',        sat:105, con:100, temp:20,  tint:5  },
  { name:'Cool',        sat:100, con:100, temp:-20, tint:-5 },
  { name:'Golden Hour', sat:115, con:105, temp:30,  tint:10 },
  { name:'Teal/Orange', sat:110, con:108, temp:-5,  tint:0  },
];

// ── LUT presets (from archived spxLUTPack) ────────────────
const LUT_PRESETS = [
  { name:'Kodak 2383',     cat:'film',    sat:90,  con:112, temp:8,   tint:3  },
  { name:'Kodak 5218',     cat:'film',    sat:85,  con:108, temp:12,  tint:2  },
  { name:'Fuji 3513',      cat:'film',    sat:95,  con:105, temp:-5,  tint:2  },
  { name:'Fuji Velvia',    cat:'film',    sat:140, con:115, temp:0,   tint:0  },
  { name:'Ilford HP5 B&W', cat:'film',    sat:0,   con:118, temp:0,   tint:0  },
  { name:'Teal & Orange',  cat:'cinema',  sat:110, con:108, temp:-5,  tint:0  },
  { name:'Bleach Bypass',  cat:'cinema',  sat:55,  con:130, temp:0,   tint:0  },
  { name:'Day for Night',  cat:'cinema',  sat:70,  con:95,  temp:-30, tint:-5 },
  { name:'Anamorphic Blue',cat:'cinema',  sat:95,  con:105, temp:-15, tint:-8 },
  { name:'Blockbuster',    cat:'cinema',  sat:120, con:115, temp:5,   tint:2  },
  { name:'Horror Dark',    cat:'cinema',  sat:60,  con:125, temp:-10, tint:5  },
  { name:'Sci-Fi Teal',    cat:'cinema',  sat:100, con:110, temp:-20, tint:-10},
  { name:'Western Sepia',  cat:'cinema',  sat:40,  con:105, temp:25,  tint:10 },
  { name:'Neon Noir',      cat:'cinema',  sat:130, con:120, temp:-15, tint:5  },
  { name:'Kubrick Cold',   cat:'cinema',  sat:80,  con:110, temp:-20, tint:-5 },
  { name:'Instagram Warm', cat:'social',  sat:108, con:105, temp:18,  tint:5  },
  { name:'TikTok Vivid',   cat:'social',  sat:135, con:112, temp:5,   tint:0  },
  { name:'YouTube Clean',  cat:'social',  sat:105, con:105, temp:3,   tint:1  },
  { name:'Podcast Neutral',cat:'social',  sat:95,  con:102, temp:2,   tint:0  },
  { name:'Music Video',    cat:'social',  sat:125, con:115, temp:-8,  tint:-5 },
  { name:'70s Fade',       cat:'vintage', sat:75,  con:90,  temp:20,  tint:8  },
  { name:'80s VHS',        cat:'vintage', sat:110, con:95,  temp:10,  tint:-5 },
  { name:'Super 8',        cat:'vintage', sat:85,  con:105, temp:25,  tint:10 },
  { name:'Golden Hour',    cat:'nature',  sat:115, con:105, temp:30,  tint:10 },
  { name:'Blue Hour',      cat:'nature',  sat:90,  con:108, temp:-25, tint:-5 },
  { name:'Forest Green',   cat:'nature',  sat:120, con:108, temp:-8,  tint:-5 },
  { name:'Arctic Cold',    cat:'nature',  sat:80,  con:105, temp:-35, tint:-10},
  { name:'Rec.709',        cat:'tech',    sat:100, con:100, temp:0,   tint:0  },
  { name:'LOG to Rec709',  cat:'tech',    sat:100, con:115, temp:0,   tint:0  },
  { name:'SLOG2 Correct',  cat:'tech',    sat:100, con:118, temp:0,   tint:0  },
];

// ═══════════════════════════════════════════════════════════
// COLOR GRADING PANEL (floating right side)
// ═══════════════════════════════════════════════════════════
function ColorWheel({ label, value, onChange, size=100 }) {
  const canvasRef = useRef(null);
  const dragging  = useRef(false);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const cx = size/2, cy = size/2, r = size/2 - 3;
    for (let a = 0; a < 360; a++) {
      const s = (a-1)*Math.PI/180, e = (a+1)*Math.PI/180;
      const g = ctx.createRadialGradient(cx,cy,0,cx,cy,r);
      g.addColorStop(0,  `hsla(${a},0%,50%,1)`);
      g.addColorStop(1,  `hsla(${a},100%,50%,1)`);
      ctx.beginPath(); ctx.moveTo(cx,cy); ctx.arc(cx,cy,r,s,e);
      ctx.fillStyle = g; ctx.fill();
    }
    const ix = cx + (value.x||0)*r*0.8;
    const iy = cy + (value.y||0)*r*0.8;
    ctx.beginPath(); ctx.arc(ix,iy,4,0,Math.PI*2);
    ctx.strokeStyle='#fff'; ctx.lineWidth=2; ctx.stroke();
    ctx.fillStyle='rgba(0,0,0,.5)'; ctx.fill();
  }, [value, size]);
  const onMouse = (e) => {
    if (!dragging.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const cx=size/2, cy=size/2, r=size/2-3;
    const x = Math.max(-1,Math.min(1,(e.clientX-rect.left-cx)/r));
    const y = Math.max(-1,Math.min(1,(e.clientY-rect.top-cy)/r));
    onChange({...value,x,y});
  };
  return (
    <div className="spx-color-wheel-wrap">
      <canvas ref={canvasRef} width={size} height={size}
        style={{ borderRadius:'50%', cursor:'crosshair', border:'1px solid #21262d' }}
        onMouseDown={()=>{dragging.current=true}}
        onMouseMove={onMouse}
        onMouseUp={()=>{dragging.current=false}}
        onMouseLeave={()=>{dragging.current=false}} />
      <div className="spx-color-wheel-label">{label}</div>
      <input type="range" min={-100} max={100} value={Math.round((value.brightness||0)*100)}
        style={{ width:size, accentColor:'#00ffc8' }}
        onChange={e=>onChange({...value,brightness:parseInt(e.target.value)/100})} />
    </div>
  );
}

export function VideoEditorColorPanel({ selectedClip, applyEffectToClip, onClose }) {
  const [lift,   setLift]   = useState({x:0,y:0,brightness:0});
  const [gamma,  setGamma]  = useState({x:0,y:0,brightness:0});
  const [gain,   setGain]   = useState({x:0,y:0,brightness:0});
  const [sat,    setSat]    = useState(100);
  const [con,    setCon]    = useState(100);
  const [temp,   setTemp]   = useState(0);
  const [tint,   setTint]   = useState(0);
  const [activeLUT, setActiveLUT] = useState(null);
  const lutCats = [...new Set(LUT_PRESETS.map(l=>l.cat))];

  const applyGrade = () => {
    if (!selectedClip) { console.warn('Select a clip first'); return; }
    applyEffectToClip(selectedClip.id, 'brightness',  Math.round(50 + (gain.brightness||0)*50));
    applyEffectToClip(selectedClip.id, 'contrast',    Math.round(con/2));
    applyEffectToClip(selectedClip.id, 'saturation',  Math.round(sat/2));
    applyEffectToClip(selectedClip.id, 'hue',         Math.round((temp+50)));
  };

  const applyLUT = (lut) => {
    if (!selectedClip) { console.warn('Select a clip first'); return; }
    setSat(lut.sat); setCon(lut.con); setTemp(lut.temp); setTint(lut.tint);
    setActiveLUT(lut.name);
    applyEffectToClip(selectedClip.id, 'saturation', Math.round(lut.sat/2));
    applyEffectToClip(selectedClip.id, 'contrast',   Math.round(lut.con/2));
    applyEffectToClip(selectedClip.id, 'hue',        Math.round(lut.temp+50));
  };

  const reset = () => {
    setLift({x:0,y:0,brightness:0}); setGamma({x:0,y:0,brightness:0}); setGain({x:0,y:0,brightness:0});
    setSat(100); setCon(100); setTemp(0); setTint(0); setActiveLUT(null);
  };

  const sliders = [
    ['Saturation', sat, setSat, 0,   200, '#bf5af2'],
    ['Contrast',   con, setCon, 50,  150, '#FF6600'],
    ['Temperature',temp,setTemp,-50, 50,  '#ffd60a'],
    ['Tint',       tint,setTint,-50, 50,  '#30d158'],
  ];

  return (
    <div className="spx-color-panel">
      <div className="spx-panel-header">
        <span className="spx-panel-title">🎨 Lumetri Color</span>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          {selectedClip && <span style={{fontSize:10,color:'#4e6a82'}}>{selectedClip.title}</span>}
          <button className="spx-panel-close" onClick={onClose}>✕</button>
        </div>
      </div>
      <div className="spx-panel-body">

        {/* Quick presets */}
        <div className="spx-section-title">Quick Presets</div>
        <div style={{display:'flex',flexWrap:'wrap',gap:4,marginBottom:10}}>
          {COLOR_PRESETS.map(p=>(
            <button key={p.name} className={`spx-lut-btn ${activeLUT===p.name?'active':''}`}
              onClick={()=>applyLUT(p)}>{p.name}</button>
          ))}
        </div>

        {/* LUT packs by category */}
        {lutCats.map(cat=>(
          <div key={cat} style={{marginBottom:8}}>
            <div style={{fontSize:9,fontWeight:700,color:'#4e6a82',textTransform:'uppercase',letterSpacing:.5,marginBottom:4}}>
              {cat.charAt(0).toUpperCase()+cat.slice(1)}
            </div>
            <div className="spx-lut-grid">
              {LUT_PRESETS.filter(l=>l.cat===cat).map(lut=>(
                <button key={lut.name} className={`spx-lut-btn ${activeLUT===lut.name?'active':''}`}
                  onClick={()=>applyLUT(lut)} title={`Sat:${lut.sat} Con:${lut.con} Temp:${lut.temp}`}>
                  {lut.name}
                </button>
              ))}
            </div>
          </div>
        ))}

        <div className="spx-divider" />

        {/* Color wheels */}
        <div className="spx-section-title">Color Wheels</div>
        <div className="spx-color-wheels">
          <ColorWheel label="Lift (Shadows)"    value={lift}  onChange={setLift}  size={90} />
          <ColorWheel label="Gamma (Mids)"      value={gamma} onChange={setGamma} size={90} />
          <ColorWheel label="Gain (Highlights)" value={gain}  onChange={setGain}  size={90} />
        </div>

        {/* Sliders */}
        <div className="spx-divider" />
        <div className="spx-section-title">Adjustments</div>
        {sliders.map(([lbl,val,setter,mn,mx,col])=>(
          <div key={lbl} className="spx-color-slider-row">
            <div className="spx-color-slider-label">
              <span>{lbl}</span>
              <span style={{color:col,fontFamily:'monospace'}}>{val}</span>
            </div>
            <input type="range" min={mn} max={mx} value={val}
              style={{width:'100%',accentColor:col}}
              onChange={e=>setter(parseInt(e.target.value))} />
          </div>
        ))}

        {/* Vignette */}
        <div className="spx-section-title" style={{marginTop:8}}>Vignette</div>
        {[['Amount',-100,0,'#8b949e'],['Feather',0,100,'#8b949e']].map(([lbl,mn,mx,col])=>(
          <div key={lbl} className="spx-color-slider-row">
            <div className="spx-color-slider-label"><span>{lbl}</span></div>
            <input type="range" min={mn} max={mx} defaultValue={mn===0?50:0}
              style={{width:'100%',accentColor:col}} />
          </div>
        ))}

        {/* Actions */}
        <div style={{display:'flex',gap:6,marginTop:12}}>
          <button className="spx-tbtn active" onClick={applyGrade} style={{flex:1}}>Apply Grade</button>
          <button className="spx-tbtn" onClick={reset}>Reset</button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// AUDIO MIXER PANEL (floating bottom)
// ═══════════════════════════════════════════════════════════
export function VideoEditorAudioMixer({ tracks, onClose }) {
  const audioTracks = tracks.filter(t => t.type==='audio' || t.clips.some(c=>c.type==='audio'));
  const [levels, setLevels] = useState({});

  const setLevel = (id, val) => setLevels(prev=>({...prev,[id]:val}));
  const getLevel = (id) => levels[id] ?? 0;

  return (
    <div className="spx-mixer-panel">
      <div className="spx-mixer-header">
        <span style={{fontSize:12,fontWeight:700,color:'#e6edf3'}}>🎚 Audio Mixer</span>
        <button className="spx-panel-close" onClick={onClose}>✕</button>
      </div>
      <div className="spx-mixer-channels">

        {/* Master channel */}
        <div className="spx-mixer-channel">
          <div className="spx-channel-name" style={{color:'#00ffc8'}}>MASTER</div>
          <input type="range" min={-100} max={100} defaultValue={0} className="spx-channel-pan"
            title="Pan" style={{width:60,accentColor:'#00ffc8'}} />
          <div style={{display:'flex',gap:4,alignItems:'flex-end',height:80}}>
            <div className="spx-vu-meter">
              {Array.from({length:16},(_,i)=>(
                <div key={i} className={`spx-vu-bar ${i<10?'active-green':i<13?'active-yellow':'active-red'}`} />
              ))}
            </div>
            <div className="spx-fader-wrap">
              <input type="range" min={-60} max={12} defaultValue={0} className="spx-fader" title="Fader (dB)" />
              <span className="spx-fader-db">0dB</span>
            </div>
          </div>
          <div className="spx-channel-btns">
            <button className="spx-channel-btn">M</button>
            <button className="spx-channel-btn">S</button>
          </div>
        </div>

        {/* Per-track channels */}
        {audioTracks.map(track=>(
          <div key={track.id} className="spx-mixer-channel"
            style={{borderLeft:`2px solid ${track.color||'#21262d'}`}}>
            <div className="spx-channel-name" style={{color:track.color||'#e6edf3'}}>{track.name}</div>
            <input type="range" min={-100} max={100} defaultValue={0} className="spx-channel-pan"
              title="Pan" style={{width:60,accentColor:track.color||'#00ffc8'}} />
            <div style={{display:'flex',gap:4,alignItems:'flex-end',height:80}}>
              <div className="spx-vu-meter">
                {Array.from({length:16},(_,i)=>(
                  <div key={i} className={`spx-vu-bar ${i<10?'active-green':i<13?'active-yellow':'active-red'}`}
                    style={{opacity:Math.random()>.4?1:.2}} />
                ))}
              </div>
              <div className="spx-fader-wrap">
                <input type="range" min={-60} max={12}
                  value={getLevel(track.id)}
                  onChange={e=>setLevel(track.id,parseInt(e.target.value))}
                  className="spx-fader" title="Fader (dB)" />
                <span className="spx-fader-db">{getLevel(track.id)}dB</span>
              </div>
            </div>
            <div className="spx-channel-btns">
              <button className={`spx-channel-btn ${track.muted?'mute':''}`}>M</button>
              <button className="spx-channel-btn solo">S</button>
            </div>
          </div>
        ))}

        {audioTracks.length === 0 && (
          <div style={{padding:'20px 16px',color:'#4e6a82',fontSize:11}}>
            No audio tracks. Add an audio track or drop audio clips on the timeline.
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// RIGHT PANEL — Effects stack + Compositing
// ═══════════════════════════════════════════════════════════
export default function VideoEditorRightPanel({
  selectedClip, selectedTransition,
  applyEffectToClip, removeEffectFromClip, toggleEffect, updateEffectValue, updateCompositing,
  setSelectedTransition, tracks, setTracks,
}) {
  const [tab, setTab] = useState('effects');

  if (!selectedClip && !selectedTransition) {
    return (
      <div className="spx-right">
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
          height:'100%',color:'#4e6a82',textAlign:'center',padding:20,gap:10}}>
          <Layers size={32} style={{opacity:.3}} />
          <p style={{fontSize:11}}>Select a clip or transition<br />to edit its properties</p>
        </div>
      </div>
    );
  }

  // Transition properties
  if (selectedTransition && !selectedClip) {
    return (
      <div className="spx-right">
        <div className="spx-right-tabs">
          <button className="spx-right-tab active">Transition</button>
        </div>
        <div className="spx-right-content">
          <div className="spx-section-title">Properties</div>
          <div className="spx-compositing-row">
            <div className="spx-compositing-label">
              <span>Duration</span><span>{selectedTransition.duration}s</span>
            </div>
            <input type="range" min={0.1} max={5} step={0.1}
              className="spx-compositing-slider"
              value={selectedTransition.duration}
              onChange={e=>{
                const dur = parseFloat(e.target.value);
                setTracks(prev=>prev.map(tr=>({
                  ...tr,
                  transitions:(tr.transitions||[]).map(t=>t.id===selectedTransition.id?{...t,duration:dur}:t)
                })));
              }} />
          </div>
          {[['Ease In',50],['Ease Out',50]].map(([lbl,def])=>(
            <div key={lbl} className="spx-compositing-row">
              <div className="spx-compositing-label"><span>{lbl}</span></div>
              <input type="range" min={0} max={100} defaultValue={def} className="spx-compositing-slider" />
            </div>
          ))}
          <div className="spx-compositing-row">
            <div className="spx-compositing-label"><span>Alignment</span></div>
            <select className="spx-compositing-select">
              <option>Center at Cut</option>
              <option>Start at Cut</option>
              <option>End at Cut</option>
            </select>
          </div>
          <button className="spx-tbtn danger" style={{marginTop:10,width:'100%'}}
            onClick={()=>{
              setTracks(prev=>prev.map(tr=>({...tr,transitions:(tr.transitions||[]).filter(t=>t.id!==selectedTransition.id)})));
              setSelectedTransition(null);
            }}>
            <Trash2 size={12} /> Remove Transition
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="spx-right">
      <div className="spx-right-tabs">
        {[['effects','Effects'],['compositing','Transform'],['presets','Presets']].map(([id,lbl])=>(
          <button key={id} className={`spx-right-tab ${tab===id?'active':''}`} onClick={()=>setTab(id)}>{lbl}</button>
        ))}
      </div>
      <div className="spx-right-content">

        {/* ── EFFECTS TAB ─────────────────────────────────── */}
        {tab==='effects' && (
          <>
            <div style={{fontSize:11,fontWeight:700,color:'#e6edf3',marginBottom:8}}>
              Effects Stack
              <span style={{color:'#4e6a82',fontWeight:400,marginLeft:6}}>
                ({selectedClip.effects?.length||0})
              </span>
            </div>

            {(!selectedClip.effects || selectedClip.effects.length===0) ? (
              <div className="spx-fx-stack-empty">
                <Wand2 size={24} style={{opacity:.3}} />
                <p>No effects applied</p>
                <p style={{fontSize:10}}>Click effects in the left panel or drag them onto clips</p>
              </div>
            ) : (
              selectedClip.effects.map(eff=>(
                <div key={eff.id} className="spx-applied-fx">
                  <div className="spx-applied-fx-header">
                    <button className={`spx-fx-toggle ${eff.enabled?'on':''}`}
                      onClick={()=>toggleEffect(selectedClip.id,eff.id)}
                      title={eff.enabled?'Disable':'Enable'}>
                      {eff.enabled?<Eye size={12}/>:<EyeOff size={12}/>}
                    </button>
                    <span className="spx-applied-fx-name">{eff.id}</span>
                    <span className="spx-applied-fx-val">{eff.value}%</span>
                    <button className="spx-fx-remove"
                      onClick={()=>removeEffectFromClip(selectedClip.id,eff.id)}
                      title="Remove">
                      <Trash2 size={11}/>
                    </button>
                  </div>
                  <div className="spx-fx-slider-row">
                    <div className="spx-fx-slider-label">
                      <span>Intensity</span><span>{eff.value}%</span>
                    </div>
                    <input type="range" min={0} max={100} value={eff.value}
                      className="spx-fx-slider"
                      disabled={!eff.enabled}
                      onChange={e=>updateEffectValue(selectedClip.id,eff.id,parseInt(e.target.value))} />
                  </div>
                  {/* Extra params by category */}
                  {['chromaKey','colorKey','luminanceKey'].includes(eff.id) && (
                    <>
                      <div className="spx-param-row">
                        <div className="spx-param-label">Key Color</div>
                        <input type="color" defaultValue="#00ff00" className="spx-param-color" />
                      </div>
                      <div className="spx-param-row">
                        <div className="spx-param-label">Tolerance</div>
                        <input type="range" min={0} max={100} defaultValue={20} className="spx-param-slider" />
                      </div>
                      <div className="spx-param-row">
                        <div className="spx-param-label">Edge Feather</div>
                        <input type="range" min={0} max={50} defaultValue={5} className="spx-param-slider" />
                      </div>
                    </>
                  )}
                  {['blur','motionBlur','radialBlur'].includes(eff.id) && (
                    <div className="spx-param-row">
                      <div className="spx-param-label">Quality</div>
                      <select className="spx-param-select">
                        <option>Low</option><option selected>Medium</option><option>High</option>
                      </select>
                    </div>
                  )}
                </div>
              ))
            )}

            {/* Quick apply */}
            <div className="spx-section-title" style={{marginTop:10}}>Quick Apply</div>
            <div className="spx-quick-fx-grid">
              {[
                ['Fade In','fadeIn'],['Fade Out','fadeOut'],
                ['Bright','brightness'],['Contrast','contrast'],
                ['B&W','grayscale'],['Warm','hue'],
                ['Cinematic','cinematic_relight'],['Denoise','denoise'],
              ].map(([lbl,id])=>(
                <button key={id} className="spx-quick-fx-btn"
                  onClick={()=>applyEffectToClip(selectedClip.id,id,50)}>
                  <Sparkles size={11}/>{lbl}
                </button>
              ))}
            </div>
          </>
        )}

        {/* ── COMPOSITING TAB ─────────────────────────────── */}
        {tab==='compositing' && selectedClip.type==='video' && (
          <>
            <div className="spx-section-title">Position</div>
            <div className="spx-dual-input">
              {[['X','position','x'],['Y','position','y']].map(([lbl,prop,axis])=>(
                <div key={lbl} className="spx-dual-input-item">
                  <span>{lbl}</span>
                  <input type="number" className="spx-num-input"
                    value={selectedClip.compositing?.[prop]?.[axis]||0}
                    onChange={e=>updateCompositing(selectedClip.id,prop,{[axis]:parseInt(e.target.value)||0})} />
                </div>
              ))}
            </div>

            <div className="spx-section-title">Scale</div>
            <div className="spx-dual-input">
              {[['W','scale','x'],['H','scale','y']].map(([lbl,prop,axis])=>(
                <div key={lbl} className="spx-dual-input-item">
                  <span>{lbl}</span>
                  <input type="number" className="spx-num-input"
                    value={selectedClip.compositing?.[prop]?.[axis]||100}
                    onChange={e=>updateCompositing(selectedClip.id,prop,{[axis]:parseInt(e.target.value)||100})} />
                </div>
              ))}
            </div>

            <div className="spx-section-title">Rotation</div>
            <input type="number" className="spx-num-input" style={{width:'100%'}}
              value={selectedClip.compositing?.rotation||0}
              onChange={e=>updateCompositing(selectedClip.id,'rotation',parseInt(e.target.value)||0)} />

            <div className="spx-divider" />

            <div className="spx-section-title">Opacity & Blend</div>
            <div className="spx-compositing-row">
              <div className="spx-compositing-label">
                <span>Opacity</span><span>{selectedClip.compositing?.opacity||100}%</span>
              </div>
              <input type="range" min={0} max={100}
                value={selectedClip.compositing?.opacity||100}
                className="spx-compositing-slider"
                onChange={e=>updateCompositing(selectedClip.id,'opacity',parseInt(e.target.value))} />
            </div>
            <div className="spx-compositing-row">
              <div className="spx-compositing-label"><span>Blend Mode</span></div>
              <select className="spx-compositing-select"
                value={selectedClip.compositing?.blendMode||'normal'}
                onChange={e=>updateCompositing(selectedClip.id,'blendMode',e.target.value)}>
                {['normal','dissolve','darken','multiply','color-burn','lighten','screen','color-dodge',
                  'overlay','soft-light','hard-light','difference','exclusion','hue','saturation','color','luminosity'
                ].map(m=><option key={m} value={m}>{m.charAt(0).toUpperCase()+m.slice(1)}</option>)}
              </select>
            </div>

            <div className="spx-divider" />
            <div className="spx-section-title">Transform Presets</div>
            <div className="spx-transform-presets">
              {[
                ['PiP',         ()=>{ updateCompositing(selectedClip.id,'scale',{x:25,y:25}); updateCompositing(selectedClip.id,'position',{x:600,y:-300}); }],
                ['Zoom In',     ()=>{ updateCompositing(selectedClip.id,'scale',{x:150,y:150}); updateCompositing(selectedClip.id,'position',{x:0,y:0}); }],
                ['Split L',     ()=>  updateCompositing(selectedClip.id,'position',{x:-480,y:0})],
                ['Split R',     ()=>  updateCompositing(selectedClip.id,'position',{x:480,y:0})],
                ['Reset',       ()=>{ updateCompositing(selectedClip.id,'scale',{x:100,y:100}); updateCompositing(selectedClip.id,'position',{x:0,y:0}); updateCompositing(selectedClip.id,'rotation',0); updateCompositing(selectedClip.id,'opacity',100); }],
                ['Full Screen', ()=>{ updateCompositing(selectedClip.id,'scale',{x:100,y:100}); updateCompositing(selectedClip.id,'position',{x:0,y:0}); }],
              ].map(([lbl,fn])=>(
                <button key={lbl} className="spx-transform-preset-btn" onClick={fn}>{lbl}</button>
              ))}
            </div>
          </>
        )}

        {tab==='compositing' && selectedClip.type!=='video' && (
          <div style={{color:'#4e6a82',fontSize:11,padding:'20px 0',textAlign:'center'}}>
            Transform controls are only available for video clips.
          </div>
        )}

        {/* ── PRESETS TAB ──────────────────────────────────── */}
        {tab==='presets' && (
          <>
            <div className="spx-section-title">Color Presets</div>
            {COLOR_PRESETS.map(p=>(
              <button key={p.name} className="spx-preset-btn"
                onClick={()=>{
                  applyEffectToClip(selectedClip.id,'saturation',Math.round(p.sat/2));
                  applyEffectToClip(selectedClip.id,'contrast',  Math.round(p.con/2));
                }}>
                <Palette size={12}/>{p.name}
              </button>
            ))}
            <div className="spx-section-title" style={{marginTop:10}}>LUT Presets</div>
            {LUT_PRESETS.slice(0,10).map(lut=>(
              <button key={lut.name} className="spx-preset-btn"
                onClick={()=>{
                  applyEffectToClip(selectedClip.id,'saturation',Math.round(lut.sat/2));
                  applyEffectToClip(selectedClip.id,'contrast',  Math.round(lut.con/2));
                  applyEffectToClip(selectedClip.id,'hue',       Math.round(lut.temp+50));
                }}>
                <Layers size={12}/>{lut.name}
                <span style={{marginLeft:'auto',fontSize:9,color:'#4e6a82'}}>{lut.cat}</span>
              </button>
            ))}
          </>
        )}

      </div>
    </div>
  );
}
