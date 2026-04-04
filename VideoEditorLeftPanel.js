import React, { useState } from 'react';
import {
  Upload, Loader, Video, AudioWaveform, Image, Plus, ChevronDown, ChevronUp,
  MousePointer, Scissors, Hand, Type, Crop, Crosshair, Aperture,
  Sun, Circle, Layers, Filter, Moon, Sparkles, Focus, Contrast,
  Palette, TrendingUp, BarChart, Target, Waves, RotateCw, Minimize2,
  Diamond, Triangle, Lightbulb, Paintbrush, Rainbow, Hash, Brush,
  Gauge, Zap, RefreshCw, Copy, Square, Star, Move, ZoomIn, ZoomOut,
  FlipHorizontal, Wind, Droplets, Camera, Headphones, Volume2, Sliders,
  ArrowLeftRight, ArrowUpDown, Maximize2, WifiOff, Mic, AreaChart, Disc, Binary, Bolt
} from 'lucide-react';

const T = {
  bg0:'#04040c', bg1:'#07070f', bg2:'#0c0c18', bg3:'#111120', bg4:'#161630',
  border:'rgba(255,255,255,0.06)', border2:'rgba(255,255,255,0.1)',
  teal:'#00ffc8', tealDim:'rgba(0,255,200,0.08)',
  purple:'#a78bfa', purpleDim:'rgba(167,139,250,0.08)',
  text:'#f0f4f8', dim:'rgba(255,255,255,0.4)', dim2:'rgba(255,255,255,0.2)',
  font:"'JetBrains Mono', monospace",
};

const TOOLS = [
  { id:'select',     icon:MousePointer, name:'Selection (V)' },
  { id:'razor',      icon:Scissors,     name:'Razor / Cut (C)' },
  { id:'hand',       icon:Hand,         name:'Hand (H)' },
  { id:'text',       icon:Type,         name:'Text Tool' },
  { id:'crop',       icon:Crop,         name:'Crop Tool' },
  { id:'mask',       icon:Crosshair,    name:'Mask Tool' },
  { id:'eyedropper', icon:Aperture,     name:'Color Picker' },
  { id:'zoom',       icon:ZoomIn,       name:'Zoom' },
];

const VIDEO_EFFECTS = [
  { id:'low_light_restore', name:'Low-Light Restore', icon:Lightbulb, cat:'enhancement' },
  { id:'shadow_recovery',   name:'Shadow Recovery',   icon:Moon,      cat:'enhancement' },
  { id:'denoise',           name:'Denoise',            icon:Filter,    cat:'enhancement' },
  { id:'detail_boost',      name:'Detail Boost',       icon:Focus,     cat:'enhancement' },
  { id:'cinematic_relight', name:'Cinematic Relight',  icon:Sparkles,  cat:'enhancement' },
  { id:'fadeIn',        name:'Fade In (Black)',  icon:Sun,    cat:'fade' },
  { id:'fadeOut',       name:'Fade Out (Black)', icon:Circle, cat:'fade' },
  { id:'fadeInWhite',   name:'Fade In (White)',  icon:Sun,    cat:'fade' },
  { id:'fadeOutWhite',  name:'Fade Out (White)', icon:Sun,    cat:'fade' },
  { id:'crossDissolve', name:'Cross Dissolve',   icon:Layers, cat:'fade' },
  { id:'brightness', name:'Brightness',  icon:Sun,      cat:'color' },
  { id:'contrast',   name:'Contrast',    icon:Droplets, cat:'color' },
  { id:'saturation', name:'Saturation',  icon:Droplets, cat:'color' },
  { id:'hue',        name:'Hue Shift',   icon:Rainbow,  cat:'color' },
  { id:'gamma',      name:'Gamma',       icon:Gauge,    cat:'color' },
  { id:'exposure',   name:'Exposure',    icon:Camera,   cat:'color' },
  { id:'colorBalance', name:'Color Balance', icon:Palette,    cat:'grading' },
  { id:'curves',       name:'Color Curves',  icon:TrendingUp, cat:'grading' },
  { id:'levels',       name:'Levels',        icon:BarChart,   cat:'grading' },
  { id:'lut',          name:'LUT',           icon:Layers,     cat:'grading' },
  { id:'blur',       name:'Gaussian Blur', icon:Circle, cat:'blur' },
  { id:'motionBlur', name:'Motion Blur',   icon:Move,   cat:'blur' },
  { id:'sharpen',    name:'Sharpen',       icon:Zap,    cat:'blur' },
  { id:'lens',        name:'Lens Distortion', icon:Focus,    cat:'distort' },
  { id:'fisheye',     name:'Fisheye',         icon:Circle,   cat:'distort' },
  { id:'ripple',      name:'Ripple',          icon:Waves,    cat:'distort' },
  { id:'twirl',       name:'Twirl',           icon:RotateCw, cat:'distort' },
  { id:'posterize', name:'Posterize',  icon:Layers,     cat:'stylize' },
  { id:'emboss',    name:'Emboss',     icon:Triangle,   cat:'stylize' },
  { id:'glowEdges', name:'Glow Edges', icon:Lightbulb,  cat:'stylize' },
  { id:'oilPaint',  name:'Oil Paint',  icon:Paintbrush, cat:'stylize' },
  { id:'chromaKey',    name:'Chroma Key',    icon:Palette,   cat:'key' },
  { id:'colorKey',     name:'Color Key',     icon:Target,    cat:'key' },
  { id:'luminanceKey', name:'Luminance Key', icon:Sun,       cat:'key' },
  { id:'addNoise',    name:'Add Noise',       icon:Hash,   cat:'noise' },
  { id:'removeNoise', name:'Noise Reduction', icon:Filter, cat:'noise' },
  { id:'gradientRamp', name:'Gradient Ramp', icon:TrendingUp, cat:'generate' },
  { id:'fractalNoise', name:'Fractal Noise',  icon:Waves,     cat:'generate' },
];

const AUDIO_EFFECTS = [
  { id:'compressor', name:'Compressor',    icon:Minimize2,    cat:'dynamics' },
  { id:'limiter',    name:'Limiter',       icon:Maximize2,    cat:'dynamics' },
  { id:'gate',       name:'Noise Gate',    icon:Volume2,      cat:'dynamics' },
  { id:'equalizer',  name:'Parametric EQ', icon:Sliders,     cat:'eq' },
  { id:'highPass',   name:'High Pass',     icon:ChevronUp,    cat:'eq' },
  { id:'lowPass',    name:'Low Pass',      icon:ChevronDown,  cat:'eq' },
  { id:'reverb',     name:'Reverb',        icon:AudioWaveform,cat:'time' },
  { id:'delay',      name:'Delay',         icon:Copy,         cat:'time' },
  { id:'pitchShift', name:'Pitch Shift',   icon:ChevronUp,    cat:'time' },
  { id:'chorus',     name:'Chorus',        icon:Copy,         cat:'mod' },
  { id:'flanger',    name:'Flanger',       icon:Waves,        cat:'mod' },
  { id:'overdrive',  name:'Overdrive',     icon:Zap,          cat:'dist' },
  { id:'bitCrusher', name:'Bit Crusher',   icon:Binary,       cat:'dist' },
  { id:'noiseReduction',name:'Noise Reduction',icon:Filter,   cat:'restore' },
  { id:'deEsser',    name:'De-Esser',      icon:Mic,          cat:'restore' },
  { id:'stereoWiden',name:'Stereo Widener',icon:Maximize2,    cat:'spatial' },
  { id:'binaural',   name:'Binaural',      icon:Headphones,   cat:'spatial' },
];

const TRANSITIONS = [
  { id:'crossDissolve', name:'Cross Dissolve', icon:Layers,          dur:1,   cat:'basic' },
  { id:'fade',          name:'Fade to Black',  icon:Circle,          dur:0.5, cat:'basic' },
  { id:'fadeWhite',     name:'Fade to White',  icon:Sun,             dur:0.5, cat:'basic' },
  { id:'dip',           name:'Dip to Color',   icon:Palette,         dur:1,   cat:'basic' },
  { id:'wipeLeft',      name:'Wipe Left',      icon:Move,            dur:1,   cat:'wipe' },
  { id:'wipeRight',     name:'Wipe Right',     icon:Move,            dur:1,   cat:'wipe' },
  { id:'wipeUp',        name:'Wipe Up',        icon:ChevronUp,       dur:1,   cat:'wipe' },
  { id:'wipeDown',      name:'Wipe Down',      icon:ChevronDown,     dur:1,   cat:'wipe' },
  { id:'irisRound',     name:'Iris Round',     icon:Circle,          dur:1,   cat:'wipe' },
  { id:'slideLeft',     name:'Slide Left',     icon:ArrowLeftRight,  dur:1,   cat:'slide' },
  { id:'slideRight',    name:'Slide Right',    icon:ArrowLeftRight,  dur:1,   cat:'slide' },
  { id:'pushLeft',      name:'Push Left',      icon:ArrowLeftRight,  dur:1,   cat:'slide' },
  { id:'zoomIn',        name:'Zoom In',        icon:ZoomIn,          dur:1,   cat:'3d' },
  { id:'zoomOut',       name:'Zoom Out',       icon:ZoomOut,         dur:1,   cat:'3d' },
  { id:'spin',          name:'Spin',           icon:RotateCw,        dur:1.5, cat:'3d' },
  { id:'flip',          name:'Flip',           icon:FlipHorizontal,  dur:0.75,cat:'3d' },
  { id:'flash',         name:'Flash',          icon:Bolt,            dur:0.3, cat:'light' },
  { id:'lensFlare',     name:'Lens Flare',     icon:Star,            dur:1.5, cat:'light' },
];

export { VIDEO_EFFECTS, AUDIO_EFFECTS, TRANSITIONS };

const CAT_LABELS = {
  enhancement:'Enhancement (AI)', fade:'Fades', color:'Color Correction',
  grading:'Color Grading', blur:'Blur & Sharpen', distort:'Distortion',
  stylize:'Stylize', key:'Keying & Masking', noise:'Noise & Grain',
  generate:'Generate', dynamics:'Dynamics', eq:'EQ & Filter',
  time:'Time-Based', mod:'Modulation', dist:'Distortion',
  restore:'Restoration', spatial:'Spatial',
  basic:'Basic', wipe:'Wipes', slide:'Slides', '3d':'3D Motion', light:'Light',
};

function Section({ title, children }) {
  const [open, setOpen] = useState(true);
  return (
    <div style={{ marginBottom:2 }}>
      <div onClick={() => setOpen(o=>!o)} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'5px 6px', color:T.dim, fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:0.5, cursor:'pointer', borderRadius:4, background:'rgba(255,255,255,0.02)' }}>
        <span>{title}</span>
        {open ? <ChevronUp size={11}/> : <ChevronDown size={11}/>}
      </div>
      {open && children}
    </div>
  );
}

export default function VideoEditorLeftPanel({
  selectedTool, setSelectedTool,
  mediaLibrary, uploading, importFiles, fileInputRef,
  sourceMedia, setSourceMedia, setShowSourceMon,
  selectedClip, applyEffectToClip,
  draggedEffect, setDraggedEffect,
  draggedTransition, setDraggedTransition,
  selectedTransType, setSelectedTransType,
  addClipToTrack, tracks,
}) {
  const [tab, setTab] = useState('media');

  const quickAdd = (media) => {
    const tr = tracks.find(t => (media.type==='audio' ? t.type==='audio' : t.type==='video') && !t.locked);
    if (!tr) return;
    let dur = 30;
    if (media.duration) { const p=media.duration.split(':'); dur=p.length===2?parseInt(p[0])*60+parseInt(p[1]):30; }
    if (media.type==='image') dur=5;
    const lastEnd = tr.clips.reduce((mx,c)=>Math.max(mx,c.startTime+c.duration),0);
    addClipToTrack(tr.id, { id:Date.now(), title:media.name, type:media.type, startTime:lastEnd, duration:dur, mediaUrl:media.url, r2_key:media.r2_key, cloudId:media.cloudId, thumbnail:media.thumbnail, effects:[], compositing:{opacity:100,blendMode:'normal',position:{x:0,y:0},scale:{x:100,y:100},rotation:0} });
  };

  const groupBy = arr => arr.reduce((acc,e)=>{ (acc[e.cat]=acc[e.cat]||[]).push(e); return acc; },{});
  const vfxGroups = groupBy(VIDEO_EFFECTS);
  const afxGroups = groupBy(AUDIO_EFFECTS);
  const transGroups = groupBy(TRANSITIONS);

  const tabStyle = (id) => ({
    flex:1, padding:'8px 4px', background:'transparent', border:'none',
    borderBottom:`2px solid ${tab===id?T.teal:'transparent'}`,
    color:tab===id?T.teal:T.dim, fontSize:10, fontWeight:700,
    textTransform:'uppercase', letterSpacing:0.5, cursor:'pointer',
    transition:'all .15s', fontFamily:T.font,
  });

  const effItemStyle = (hasClip) => ({
    display:'flex', alignItems:'center', gap:6, padding:'5px 7px',
    borderRadius:5, cursor:'grab', color:T.dim, fontSize:10,
    transition:'all .15s', border:'1px solid transparent',
    fontFamily:T.font,
  });

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', overflow:'hidden' }}>

      {/* Tab bar */}
      <div style={{ display:'flex', flexShrink:0, borderBottom:`1px solid ${T.border}`, background:T.bg0 }}>
        {[['media','Media'],['effects','FX'],['transitions','Trans']].map(([id,label])=>(
          <button key={id} style={tabStyle(id)} onClick={()=>setTab(id)}>{label}</button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex:1, overflowY:'auto', padding:10 }}>

        {/* ── MEDIA TAB ─────────────────────────────── */}
        {tab==='media' && <>
          {/* Tools grid */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:3, marginBottom:10 }}>
            {TOOLS.map(tool => {
              const Icon = tool.icon;
              const active = selectedTool===tool.id;
              return (
                <button key={tool.id} title={tool.name} onClick={()=>setSelectedTool(tool.id)}
                  style={{ aspectRatio:'1', display:'flex', alignItems:'center', justifyContent:'center', background:active?T.tealDim:'rgba(255,255,255,0.03)', border:`1px solid ${active?T.teal+'44':T.border}`, borderRadius:6, color:active?T.teal:T.dim, cursor:'pointer', transition:'all .12s' }}>
                  <Icon size={14}/>
                </button>
              );
            })}
          </div>

          <div style={{ height:1, background:T.border, margin:'8px 0' }}/>

          {/* Import */}
          <button onClick={()=>fileInputRef.current?.click()} disabled={uploading}
            style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:6, width:'100%', padding:10, marginBottom:10, background:'linear-gradient(135deg,#00ffc8,#00b894)', border:'none', borderRadius:8, color:'#000', fontSize:12, fontWeight:700, cursor:uploading?'wait':'pointer', opacity:uploading?.7:1, fontFamily:T.font }}>
            {uploading?<Loader size={14} style={{animation:'spin .8s linear infinite'}}/>:<Upload size={14}/>}
            {uploading?'Uploading…':'Import Media'}
          </button>
          <input ref={fileInputRef} type="file" multiple accept="video/*,audio/*,image/*" style={{display:'none'}} onChange={e=>{importFiles(Array.from(e.target.files)); e.target.value='';}}/>

          {/* Media list */}
          {mediaLibrary.length===0
            ? <div style={{textAlign:'center',color:T.dim2,fontSize:11,padding:'20px 0'}}>No media yet.<br/>Click Import to add files.</div>
            : mediaLibrary.map(m => {
                const Icon = m.type==='video'?Video:m.type==='audio'?AudioWaveform:Image;
                const iconColor = m.type==='video'?'#4a9eff':m.type==='audio'?'#ff6b6b':'#00d4aa';
                return (
                  <div key={m.id}
                    draggable={!m.uploading}
                    onDragStart={e=>{ const d={...m,_drag:'media'}; e.dataTransfer.setData('text/plain',JSON.stringify(d)); e.dataTransfer.setData('application/json',JSON.stringify({type:'media',...d})); e.dataTransfer.effectAllowed='copy'; }}
                    onClick={()=>setSourceMedia(m)}
                    onDoubleClick={()=>{setSourceMedia(m);setShowSourceMon(true);}}
                    style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 8px', background:sourceMedia?.id===m.id?T.tealDim:'rgba(255,255,255,0.03)', border:`1px solid ${sourceMedia?.id===m.id?T.teal+'44':T.border}`, borderRadius:7, marginBottom:4, cursor:'grab', transition:'all .15s' }}>
                    <div style={{width:40,height:28,background:'rgba(255,255,255,0.04)',borderRadius:4,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,overflow:'hidden'}}>
                      {m.thumbnail?<img src={m.thumbnail} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>:<Icon size={16} style={{color:iconColor}}/>}
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:10,fontWeight:600,color:T.text,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{m.name}</div>
                      <div style={{fontSize:9,color:T.dim2,marginTop:1}}>{m.uploading?'Uploading…':m.failed?'⚠ Failed':m.duration||''}</div>
                    </div>
                    {!m.uploading&&!m.failed&&(
                      <button onClick={ev=>{ev.stopPropagation();quickAdd(m);}}
                        style={{width:22,height:22,background:T.teal,color:'#000',border:'none',borderRadius:4,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,cursor:'pointer'}}>
                        <Plus size={12}/>
                      </button>
                    )}
                    {m.uploading&&<Loader size={12} style={{color:T.teal}}/>}
                  </div>
                );
              })
          }
        </>}

        {/* ── EFFECTS TAB ───────────────────────────── */}
        {tab==='effects' && <>
          {selectedClip
            ? <div style={{padding:'6px 8px',background:T.tealDim,border:`1px solid ${T.teal}44`,borderRadius:6,marginBottom:8,fontSize:10,color:T.teal,fontWeight:700}}>✓ {selectedClip.title}</div>
            : <div style={{fontSize:10,color:T.dim2,marginBottom:8,padding:'4px 0'}}>Select a clip to apply effects.</div>
          }
          <Section title="🎬 Video Effects">
            {Object.entries(vfxGroups).map(([cat,effs])=>(
              <div key={cat} style={{marginBottom:4}}>
                <div style={{fontSize:9,fontWeight:700,color:T.dim2,textTransform:'uppercase',letterSpacing:.5,padding:'4px 4px 2px'}}>{CAT_LABELS[cat]||cat}</div>
                {effs.map(eff=>{
                  const Icon=eff.icon;
                  return (
                    <div key={eff.id}
                      draggable
                      onDragStart={e=>{setDraggedEffect(eff);e.dataTransfer.setData('application/json',JSON.stringify({type:'effect',...eff}));e.currentTarget.style.opacity='.5';}}
                      onDragEnd={e=>{e.currentTarget.style.opacity='1';setDraggedEffect(null);}}
                      onClick={()=>{if(selectedClip)applyEffectToClip(selectedClip.id,eff.id,50);}}
                      onMouseEnter={e=>{e.currentTarget.style.background='rgba(255,255,255,0.04)';e.currentTarget.style.color=selectedClip?T.teal:T.dim;}}
                      onMouseLeave={e=>{e.currentTarget.style.background='transparent';e.currentTarget.style.color=T.dim;}}
                      style={effItemStyle(!!selectedClip)}>
                      <Icon size={11}/>
                      <span style={{flex:1}}>{eff.name}</span>
                      {selectedClip&&<span style={{fontSize:9,color:T.teal,fontWeight:700}}>+</span>}
                    </div>
                  );
                })}
              </div>
            ))}
          </Section>
          <div style={{height:1,background:T.border,margin:'8px 0'}}/>
          <Section title="🎵 Audio Effects">
            {Object.entries(afxGroups).map(([cat,effs])=>(
              <div key={cat} style={{marginBottom:4}}>
                <div style={{fontSize:9,fontWeight:700,color:T.dim2,textTransform:'uppercase',letterSpacing:.5,padding:'4px 4px 2px'}}>{CAT_LABELS[cat]||cat}</div>
                {effs.map(eff=>{
                  const Icon=eff.icon;
                  return (
                    <div key={eff.id}
                      draggable
                      onDragStart={e=>{setDraggedEffect(eff);e.dataTransfer.setData('application/json',JSON.stringify({type:'effect',...eff}));e.currentTarget.style.opacity='.5';}}
                      onDragEnd={e=>{e.currentTarget.style.opacity='1';setDraggedEffect(null);}}
                      onClick={()=>{if(selectedClip)applyEffectToClip(selectedClip.id,eff.id,50);}}
                      onMouseEnter={e=>{e.currentTarget.style.background='rgba(255,255,255,0.04)';e.currentTarget.style.color=selectedClip?T.teal:T.dim;}}
                      onMouseLeave={e=>{e.currentTarget.style.background='transparent';e.currentTarget.style.color=T.dim;}}
                      style={effItemStyle(!!selectedClip)}>
                      <Icon size={11}/>
                      <span style={{flex:1}}>{eff.name}</span>
                      {selectedClip&&<span style={{fontSize:9,color:T.teal,fontWeight:700}}>+</span>}
                    </div>
                  );
                })}
              </div>
            ))}
          </Section>
        </>}

        {/* ── TRANSITIONS TAB ──────────────────────── */}
        {tab==='transitions' && <>
          <div style={{padding:'6px 8px',background:T.purpleDim,border:'1px solid rgba(167,139,250,0.2)',borderRadius:6,marginBottom:8,fontSize:10,color:T.purple}}>
            Active: <strong>{TRANSITIONS.find(t=>t.id===selectedTransType)?.name||'Cross Dissolve'}</strong><br/>
            <span style={{color:T.dim2}}>Click to select · drag to timeline</span>
          </div>
          {Object.entries(transGroups).map(([cat,trs])=>(
            <div key={cat} style={{marginBottom:6}}>
              <div style={{fontSize:9,fontWeight:700,color:T.dim2,textTransform:'uppercase',letterSpacing:.5,padding:'4px 4px 2px'}}>{CAT_LABELS[cat]||cat}</div>
              {trs.map(tr=>{
                const Icon=tr.icon;
                const sel=selectedTransType===tr.id;
                return (
                  <div key={tr.id}
                    draggable
                    onDragStart={e=>{setDraggedTransition(tr);e.dataTransfer.setData('application/json',JSON.stringify({type:'transition',...tr}));}}
                    onDragEnd={()=>setDraggedTransition(null)}
                    onClick={()=>setSelectedTransType(tr.id)}
                    onMouseEnter={e=>{if(!sel){e.currentTarget.style.background='rgba(255,255,255,0.04)';e.currentTarget.style.color=T.text;}}}
                    onMouseLeave={e=>{if(!sel){e.currentTarget.style.background=sel?T.purpleDim:'transparent';e.currentTarget.style.color=sel?T.purple:T.dim;}}}
                    style={{display:'flex',alignItems:'center',gap:6,padding:'5px 7px',borderRadius:5,cursor:'pointer',color:sel?T.purple:T.dim,fontSize:10,border:`1px solid ${sel?'rgba(167,139,250,0.3)':'transparent'}`,background:sel?T.purpleDim:'transparent',transition:'all .12s',fontFamily:T.font}}>
                    <Icon size={11}/>
                    <span style={{flex:1}}>{tr.name}</span>
                    <span style={{fontSize:9,color:T.dim2}}>{tr.dur}s</span>
                    {sel&&<span style={{fontSize:9,color:T.purple,fontWeight:700}}>✓</span>}
                  </div>
                );
              })}
            </div>
          ))}
        </>}
      </div>
    </div>
  );
}
