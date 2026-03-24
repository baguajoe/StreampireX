import React, { useState } from 'react';
import {
  Upload, Loader, Video, AudioWaveform, Image, Plus, ChevronDown, ChevronUp,
  MousePointer, Scissors, Hand, Type, Crop, Crosshair, Aperture,
  Sun, Circle, Layers, Filter, Moon, Sparkles, Focus, Contrast,
  Palette, TrendingUp, BarChart, Target, Waves, RotateCw, Minimize2,
  Diamond, Triangle, Lightbulb, Paintbrush, Rainbow, Hash, Brush,
  Gauge, Zap, Bolt, RefreshCw, PlayCircle, Copy, Square, Star,
  Move, ZoomIn, ZoomOut, FlipHorizontal, Wind, Droplets, Camera,
  Headphones, Volume2, Sliders, ArrowLeftRight, ArrowUpDown,
  Maximize2, WifiOff, Mic, AreaChart, Disc, Binary
} from 'lucide-react';

// ── Tool definitions ──────────────────────────────────────
const TOOLS = [
  { id: 'select',     icon: MousePointer, name: 'Selection (V)' },
  { id: 'razor',      icon: Scissors,     name: 'Razor / Cut (C)' },
  { id: 'hand',       icon: Hand,         name: 'Hand (H)' },
  { id: 'text',       icon: Type,         name: 'Text Tool' },
  { id: 'crop',       icon: Crop,         name: 'Crop Tool' },
  { id: 'mask',       icon: Crosshair,    name: 'Mask Tool' },
  { id: 'eyedropper', icon: Aperture,     name: 'Color Picker' },
];

// ── Video effects catalog ─────────────────────────────────
const VIDEO_EFFECTS = [
  // Enhancement / AI
  { id: 'low_light_restore', name: 'Low-Light Restore', icon: Lightbulb, cat: 'enhancement' },
  { id: 'shadow_recovery',   name: 'Shadow Recovery',   icon: Moon,      cat: 'enhancement' },
  { id: 'denoise',           name: 'Denoise',            icon: Filter,    cat: 'enhancement' },
  { id: 'detail_boost',      name: 'Detail Boost',       icon: Focus,     cat: 'enhancement' },
  { id: 'cinematic_relight', name: 'Cinematic Relight',  icon: Sparkles,  cat: 'enhancement' },
  // Fades
  { id: 'fadeIn',        name: 'Fade In (Black)',  icon: Sun,    cat: 'fade' },
  { id: 'fadeOut',       name: 'Fade Out (Black)', icon: Circle, cat: 'fade' },
  { id: 'fadeInWhite',   name: 'Fade In (White)',  icon: Sun,    cat: 'fade' },
  { id: 'fadeOutWhite',  name: 'Fade Out (White)', icon: Sun,    cat: 'fade' },
  { id: 'crossDissolve', name: 'Cross Dissolve',   icon: Layers, cat: 'fade' },
  // Color correction
  { id: 'brightness', name: 'Brightness',  icon: Sun,      cat: 'color' },
  { id: 'contrast',   name: 'Contrast',    icon: Contrast, cat: 'color' },
  { id: 'saturation', name: 'Saturation',  icon: Droplets, cat: 'color' },
  { id: 'hue',        name: 'Hue Shift',   icon: Rainbow,  cat: 'color' },
  { id: 'gamma',      name: 'Gamma',       icon: Gauge,    cat: 'color' },
  { id: 'exposure',   name: 'Exposure',    icon: Camera,   cat: 'color' },
  // Color grading
  { id: 'colorBalance', name: 'Color Balance', icon: Palette,    cat: 'grading' },
  { id: 'curves',       name: 'Color Curves',  icon: TrendingUp, cat: 'grading' },
  { id: 'levels',       name: 'Levels',        icon: BarChart,   cat: 'grading' },
  { id: 'lut',          name: 'LUT',           icon: Layers,     cat: 'grading' },
  // Blur & sharpen
  { id: 'blur',       name: 'Gaussian Blur', icon: Circle, cat: 'blur' },
  { id: 'motionBlur', name: 'Motion Blur',   icon: Move,   cat: 'blur' },
  { id: 'sharpen',    name: 'Sharpen',       icon: Zap,    cat: 'blur' },
  // Distortion
  { id: 'lens',        name: 'Lens Distortion', icon: Focus,     cat: 'distort' },
  { id: 'fisheye',     name: 'Fisheye',         icon: Circle,    cat: 'distort' },
  { id: 'ripple',      name: 'Ripple',          icon: Waves,     cat: 'distort' },
  { id: 'twirl',       name: 'Twirl',           icon: RotateCw,  cat: 'distort' },
  { id: 'perspective', name: 'Perspective',     icon: Diamond,   cat: 'distort' },
  // Stylize
  { id: 'posterize', name: 'Posterize',     icon: Layers,     cat: 'stylize' },
  { id: 'emboss',    name: 'Emboss',        icon: Triangle,   cat: 'stylize' },
  { id: 'findEdges', name: 'Find Edges',    icon: Crosshair,  cat: 'stylize' },
  { id: 'glowEdges', name: 'Glow Edges',    icon: Lightbulb,  cat: 'stylize' },
  { id: 'oilPaint',  name: 'Oil Paint',     icon: Paintbrush, cat: 'stylize' },
  // Keying
  { id: 'chromaKey',     name: 'Chroma Key',     icon: Palette,   cat: 'key' },
  { id: 'colorKey',      name: 'Color Key',      icon: Target,    cat: 'key' },
  { id: 'luminanceKey',  name: 'Luminance Key',  icon: Sun,       cat: 'key' },
  { id: 'mask',          name: 'Alpha Mask',      icon: Crosshair, cat: 'key' },
  // Noise
  { id: 'addNoise',    name: 'Add Noise',       icon: Hash,   cat: 'noise' },
  { id: 'removeNoise', name: 'Noise Reduction', icon: Filter, cat: 'noise' },
  // Generate
  { id: 'gradientRamp', name: 'Gradient Ramp',  icon: TrendingUp, cat: 'generate' },
  { id: 'fractalNoise', name: 'Fractal Noise',   icon: Waves,      cat: 'generate' },
];

// ── Audio effects catalog ─────────────────────────────────
const AUDIO_EFFECTS = [
  { id: 'compressor',    name: 'Compressor',     icon: Minimize2,    cat: 'dynamics' },
  { id: 'limiter',       name: 'Limiter',         icon: Maximize2,    cat: 'dynamics' },
  { id: 'gate',          name: 'Noise Gate',      icon: Volume2,      cat: 'dynamics' },
  { id: 'equalizer',     name: 'Parametric EQ',   icon: Sliders,      cat: 'eq' },
  { id: 'highPass',      name: 'High Pass',        icon: ChevronUp,    cat: 'eq' },
  { id: 'lowPass',       name: 'Low Pass',         icon: ChevronDown,  cat: 'eq' },
  { id: 'reverb',        name: 'Reverb',           icon: AudioWaveform,cat: 'time' },
  { id: 'delay',         name: 'Delay',            icon: Copy,         cat: 'time' },
  { id: 'pitchShift',    name: 'Pitch Shift',      icon: ChevronUp,    cat: 'time' },
  { id: 'chorus',        name: 'Chorus',           icon: Copy,         cat: 'mod' },
  { id: 'flanger',       name: 'Flanger',          icon: Waves,        cat: 'mod' },
  { id: 'phaser',        name: 'Phaser',           icon: Circle,       cat: 'mod' },
  { id: 'overdrive',     name: 'Overdrive',        icon: Zap,          cat: 'dist' },
  { id: 'distortion',    name: 'Distortion',       icon: Bolt,         cat: 'dist' },
  { id: 'bitCrusher',    name: 'Bit Crusher',      icon: Binary,       cat: 'dist' },
  { id: 'noiseReduction',name: 'Noise Reduction',  icon: Filter,       cat: 'restore' },
  { id: 'deEsser',       name: 'De-Esser',         icon: Mic,          cat: 'restore' },
  { id: 'deHum',         name: 'De-Hum',           icon: WifiOff,      cat: 'restore' },
  { id: 'stereoWiden',   name: 'Stereo Widener',   icon: Maximize2,    cat: 'spatial' },
  { id: 'binaural',      name: 'Binaural Panner',  icon: Headphones,   cat: 'spatial' },
  { id: 'spectrumAnalyzer',name:'Spectrum Analyzer',icon:AreaChart,    cat: 'analysis' },
];

// ── Transitions catalog ───────────────────────────────────
const TRANSITIONS = [
  { id: 'crossDissolve', name: 'Cross Dissolve', icon: Layers,    dur: 1,   cat: 'basic' },
  { id: 'fade',          name: 'Fade to Black',  icon: Circle,    dur: 0.5, cat: 'basic' },
  { id: 'fadeWhite',     name: 'Fade to White',  icon: Sun,       dur: 0.5, cat: 'basic' },
  { id: 'dip',           name: 'Dip to Color',   icon: Palette,   dur: 1,   cat: 'basic' },
  { id: 'wipeLeft',      name: 'Wipe Left',       icon: Move,      dur: 1,   cat: 'wipe' },
  { id: 'wipeRight',     name: 'Wipe Right',      icon: Move,      dur: 1,   cat: 'wipe' },
  { id: 'wipeUp',        name: 'Wipe Up',         icon: ChevronUp, dur: 1,   cat: 'wipe' },
  { id: 'wipeDown',      name: 'Wipe Down',       icon: ChevronDown,dur:1,  cat: 'wipe' },
  { id: 'irisRound',     name: 'Iris Round',      icon: Circle,    dur: 1,   cat: 'wipe' },
  { id: 'slideLeft',     name: 'Slide Left',      icon: ArrowLeftRight,dur:1,cat:'slide'},
  { id: 'slideRight',    name: 'Slide Right',     icon: ArrowLeftRight,dur:1,cat:'slide'},
  { id: 'pushLeft',      name: 'Push Left',       icon: ArrowLeftRight,dur:1,cat:'slide'},
  { id: 'zoomIn',        name: 'Zoom In',         icon: ZoomIn,    dur: 1,   cat: '3d' },
  { id: 'zoomOut',       name: 'Zoom Out',        icon: ZoomOut,   dur: 1,   cat: '3d' },
  { id: 'spin',          name: 'Spin',            icon: RotateCw,  dur: 1.5, cat: '3d' },
  { id: 'flip',          name: 'Flip',            icon: FlipHorizontal,dur:.75,cat:'3d'},
  { id: 'motionBlurTrans',name:'Motion Blur',     icon: Move,      dur: 1,   cat: 'blur' },
  { id: 'zoomBlur',      name: 'Zoom Blur',       icon: ZoomIn,    dur: 1,   cat: 'blur' },
  { id: 'rippleTrans',   name: 'Ripple',          icon: Waves,     dur: 1.5, cat: 'distort' },
  { id: 'flash',         name: 'Flash',           icon: Bolt,      dur: 0.3, cat: 'light' },
  { id: 'lensFlare',     name: 'Lens Flare',      icon: Star,      dur: 1.5, cat: 'light' },
];

export { VIDEO_EFFECTS, AUDIO_EFFECTS, TRANSITIONS };

// ── Collapsible section ───────────────────────────────────
function Section({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <div className="spx-section-header" onClick={() => setOpen(o => !o)}>
        <span>{title}</span>
        {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </div>
      {open && children}
    </div>
  );
}

// ── Main left panel ───────────────────────────────────────
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
  const [tab, setTab] = useState('media'); // media | effects | transitions

  // ── Quick-add media to timeline ───────────────────────
  const quickAdd = (media) => {
    const type = media.type;
    const tr = tracks.find(t => (type === 'audio' ? t.type === 'audio' : t.type === 'video') && !t.locked);
    if (!tr) return;
    let durSecs = 30;
    if (media.duration) {
      const p = media.duration.split(':');
      durSecs = p.length === 2 ? parseInt(p[0])*60 + parseInt(p[1]) : 30;
    }
    if (type === 'image') durSecs = 5;
    const lastEnd = tr.clips.reduce((mx, c) => Math.max(mx, c.startTime + c.duration), 0);
    addClipToTrack(tr.id, {
      id: Date.now(), title: media.name, type,
      startTime: lastEnd, duration: durSecs,
      mediaUrl: media.url, r2_key: media.r2_key, cloudId: media.cloudId,
      thumbnail: media.thumbnail, effects: [],
      compositing: { opacity:100, blendMode:'normal', position:{x:0,y:0}, scale:{x:100,y:100}, rotation:0 }
    });
  };

  // ── Group effects by category ─────────────────────────
  const groupBy = (arr) => arr.reduce((acc, e) => { (acc[e.cat] = acc[e.cat]||[]).push(e); return acc; }, {});
  const vfxGroups = groupBy(VIDEO_EFFECTS);
  const afxGroups = groupBy(AUDIO_EFFECTS);
  const transGroups = groupBy(TRANSITIONS);

  const catLabel = { enhancement:'Enhancement', fade:'Fades', color:'Color Correction', grading:'Color Grading',
    blur:'Blur & Sharpen', distort:'Distortion', stylize:'Stylize', key:'Keying & Masking',
    noise:'Noise & Grain', generate:'Generate', dynamics:'Dynamics', eq:'EQ & Filter',
    time:'Time-Based', mod:'Modulation', dist:'Distortion', restore:'Restoration',
    spatial:'Spatial', analysis:'Analysis', basic:'Basic', wipe:'Wipes',
    slide:'Slides', '3d':'3D', light:'Light', distort:'Distort' };

  return (
    <div className="spx-left">
      {/* Tab bar */}
      <div className="spx-left-tabs">
        {[['media','Media'],['effects','Effects'],['transitions','Trans']].map(([id,label]) => (
          <button key={id} className={`spx-left-tab ${tab===id?'active':''}`} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>

      <div className="spx-left-content">

        {/* ── MEDIA TAB ──────────────────────────────────── */}
        {tab === 'media' && (
          <>
            {/* Tools */}
            <Section title="Tools">
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:3, marginBottom:8 }}>
                {TOOLS.map(tool => {
                  const Icon = tool.icon;
                  return (
                    <button key={tool.id} className={`spx-tool-btn ${selectedTool===tool.id?'active':''}`}
                      title={tool.name} onClick={() => setSelectedTool(tool.id)}>
                      <Icon size={14} />
                    </button>
                  );
                })}
              </div>
            </Section>

            <div className="spx-divider" />

            {/* Import */}
            <button className="spx-import-btn" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              {uploading ? <Loader size={14} className="spin" /> : <Upload size={14} />}
              {uploading ? 'Uploading…' : 'Import Media'}
            </button>
            <input ref={fileInputRef} type="file" multiple accept="video/*,audio/*,image/*"
              style={{ display:'none' }} onChange={e => { importFiles(Array.from(e.target.files)); e.target.value=''; }} />

            {/* Media list */}
            {mediaLibrary.length === 0 ? (
              <div style={{ textAlign:'center', color:'#4e6a82', fontSize:11, padding:'20px 0' }}>
                No media yet.<br />Click Import to add files.
              </div>
            ) : (
              mediaLibrary.map(m => {
                const Icon = m.type==='video' ? Video : m.type==='audio' ? AudioWaveform : Image;
                return (
                  <div key={m.id} className={`spx-media-item ${sourceMedia?.id===m.id?'selected':''}`}
                    draggable={!m.uploading}
                    onDragStart={e => { const d = { ...m, _drag:'media' }; e.dataTransfer.setData('text/plain', JSON.stringify(d)); e.dataTransfer.setData('application/json', JSON.stringify({ type:'media', ...d })); e.dataTransfer.effectAllowed = 'copy'; }}
                    onClick={() => { setSourceMedia(m); }}
                    onDoubleClick={() => { setSourceMedia(m); setShowSourceMon(true); }}>
                    <div className="spx-media-thumb">
                      {m.thumbnail
                        ? <img src={m.thumbnail} alt="" />
                        : <Icon size={16} style={{ color: m.type==='video'?'#4a9eff':m.type==='audio'?'#ff6b6b':'#00d4aa' }} />}
                    </div>
                    <div className="spx-media-info">
                      <div className="spx-media-name">{m.name}</div>
                      <div className="spx-media-meta">
                        {m.uploading ? 'Uploading…' : m.failed ? '⚠ Failed' : m.duration || ''}
                        {m.cloudId && <span className="spx-cloud-dot"> ☁</span>}
                      </div>
                    </div>
                    {!m.uploading && !m.failed && (
                      <button className="spx-media-add" title="Add to timeline" onClick={e => { e.stopPropagation(); quickAdd(m); }}>
                        <Plus size={12} />
                      </button>
                    )}
                    {m.uploading && <Loader size={12} className="spin" style={{ color:'#00ffc8' }} />}
                  </div>
                );
              })
            )}
          </>
        )}

        {/* ── EFFECTS TAB ────────────────────────────────── */}
        {tab === 'effects' && (
          <>
            {selectedClip && (
              <div style={{ padding:'6px 8px', background:'rgba(0,255,200,.08)', borderRadius:5, marginBottom:8, fontSize:10, color:'#00ffc8', fontWeight:700 }}>
                Selected: {selectedClip.title}
              </div>
            )}
            {!selectedClip && (
              <div style={{ fontSize:10, color:'#4e6a82', marginBottom:8, padding:'4px 0' }}>
                Select a clip then click an effect to apply it.
              </div>
            )}

            <Section title="🎬 Video Effects">
              {Object.entries(vfxGroups).map(([cat, effs]) => (
                <div key={cat} style={{ marginBottom:4 }}>
                  <div style={{ fontSize:9, fontWeight:700, color:'#4e6a82', textTransform:'uppercase', letterSpacing:.5, padding:'4px 4px 2px' }}>
                    {catLabel[cat] || cat}
                  </div>
                  {effs.map(eff => {
                    const Icon = eff.icon;
                    return (
                      <div key={eff.id}
                        className={`spx-effect-item ${selectedClip?'has-clip':''}`}
                        draggable
                        onDragStart={e => { setDraggedEffect(eff); e.dataTransfer.setData('application/json', JSON.stringify({ type:'effect', ...eff })); e.currentTarget.style.opacity='.5'; }}
                        onDragEnd={e => { e.currentTarget.style.opacity='1'; setDraggedEffect(null); }}
                        onClick={() => {
                          if (selectedClip) applyEffectToClip(selectedClip.id, eff.id, 50);
                          else alert('Select a clip first');
                        }}
                        title={selectedClip ? `Apply ${eff.name} to "${selectedClip.title}"` : 'Select a clip first'}>
                        <Icon size={12} />
                        <span style={{ flex:1 }}>{eff.name}</span>
                        {selectedClip && <span className="spx-apply-hint">+</span>}
                      </div>
                    );
                  })}
                </div>
              ))}
            </Section>

            <div className="spx-divider" />

            <Section title="🎵 Audio Effects">
              {Object.entries(afxGroups).map(([cat, effs]) => (
                <div key={cat} style={{ marginBottom:4 }}>
                  <div style={{ fontSize:9, fontWeight:700, color:'#4e6a82', textTransform:'uppercase', letterSpacing:.5, padding:'4px 4px 2px' }}>
                    {catLabel[cat] || cat}
                  </div>
                  {effs.map(eff => {
                    const Icon = eff.icon;
                    return (
                      <div key={eff.id}
                        className={`spx-effect-item ${selectedClip?'has-clip':''}`}
                        draggable
                        onDragStart={e => { setDraggedEffect(eff); e.dataTransfer.setData('application/json', JSON.stringify({ type:'effect', ...eff })); e.currentTarget.style.opacity='.5'; }}
                        onDragEnd={e => { e.currentTarget.style.opacity='1'; setDraggedEffect(null); }}
                        onClick={() => {
                          if (selectedClip) applyEffectToClip(selectedClip.id, eff.id, 50);
                          else alert('Select a clip first');
                        }}>
                        <Icon size={12} />
                        <span style={{ flex:1 }}>{eff.name}</span>
                        {selectedClip && <span className="spx-apply-hint">+</span>}
                      </div>
                    );
                  })}
                </div>
              ))}
            </Section>
          </>
        )}

        {/* ── TRANSITIONS TAB ────────────────────────────── */}
        {tab === 'transitions' && (
          <>
            <div style={{ padding:'6px 8px', background:'rgba(177,128,215,.1)', borderRadius:5, marginBottom:8, fontSize:10, color:'#b180d7' }}>
              Active: <strong>{TRANSITIONS.find(t=>t.id===selectedTransType)?.name || 'Cross Dissolve'}</strong><br />
              <span style={{ color:'#4e6a82' }}>Click to select · drag to timeline · or click + between clips</span>
            </div>
            {Object.entries(transGroups).map(([cat, trs]) => (
              <div key={cat} style={{ marginBottom:6 }}>
                <div style={{ fontSize:9, fontWeight:700, color:'#4e6a82', textTransform:'uppercase', letterSpacing:.5, padding:'4px 4px 2px' }}>
                  {catLabel[cat] || cat}
                </div>
                {trs.map(tr => {
                  const Icon = tr.icon;
                  return (
                    <div key={tr.id}
                      className={`spx-transition-item ${selectedTransType===tr.id?'selected':''}`}
                      draggable
                      onDragStart={e => { setDraggedTransition(tr); e.dataTransfer.setData('application/json', JSON.stringify({ type:'transition', ...tr })); }}
                      onDragEnd={() => setDraggedTransition(null)}
                      onClick={() => setSelectedTransType(tr.id)}>
                      <Icon size={12} />
                      <span style={{ flex:1 }}>{tr.name}</span>
                      <span className="spx-transition-dur">{tr.dur}s</span>
                      {selectedTransType===tr.id && <span style={{ fontSize:9, color:'#b180d7', fontWeight:700 }}>✓</span>}
                    </div>
                  );
                })}
              </div>
            ))}
          </>
        )}

      </div>
    </div>
  );
}
