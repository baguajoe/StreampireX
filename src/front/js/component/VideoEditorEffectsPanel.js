import React, { useState } from 'react';
import { SPX_LUT_PACK } from './spxLUTPack';
import { SPX_190_PRESETS } from './spx190Presets';
import { SPX_300_PRESETS } from './spx300Presets';
import {
  Search, ChevronDown, ChevronRight, Folder, FolderOpen, Star,
  Sun, Circle, Layers, Filter, Moon, Sparkles, Focus, Contrast,
  Palette, TrendingUp, BarChart, Target, Waves, RotateCw, Minimize2,
  Diamond, Triangle, Lightbulb, Paintbrush, Rainbow, Hash,
  Gauge, Zap, Bolt, RefreshCw, Copy, Move, ZoomIn, ZoomOut,
  FlipHorizontal, Droplets, Camera, Headphones, Volume2, Sliders,
  ArrowLeftRight, ArrowUpDown, Maximize2, WifiOff, Mic, AreaChart,
  Disc, AudioWaveform, Activity, Aperture, Wand2, Video, Binary
} from 'lucide-react';

// ── Build trees from preset files ─────────────────────
const buildLUTTree = () => {
  const luts = Array.isArray(SPX_LUT_PACK) ? SPX_LUT_PACK : [];
  const cats = {};
  luts.forEach(l => {
    if (!cats[l.category]) cats[l.category] = [];
    cats[l.category].push({ id: l.id, label: l.name, type:'preset', intensity: l.intensity });
  });
  return Object.entries(cats).map(([cat, items]) => ({
    id: 'lut_'+cat.toLowerCase().replace(/\s+/g,'_'), label: cat, children: items
  }));
};

const buildPresetsTree = (presets, prefix) => {
  if (!presets) return [];
  return Object.entries(presets).map(([cat, items]) => ({
    id: prefix+'_'+cat.toLowerCase(),
    label: cat.charAt(0)+cat.slice(1).toLowerCase().replace(/_/g,' '),
    children: (Array.isArray(items) ? items : []).map(p => {
      const name = typeof p === 'string' ? p : (p.name || p.id || String(p));
      const id   = typeof p === 'string' ? p : (p.id || p.name || String(p));
      return { id: prefix+'_'+id, label: name.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase()), type:'preset' };
    })
  }));
};

// ── Full effects tree ─────────────────────────────────
const EFFECTS_TREE = [
  {
    id:'presets', label:'Presets', icon:Star,
    children:[
      { id:'lut_pack',  label:'LUT Pack (15)',       icon:Palette,  children: buildLUTTree() },
      { id:'spx_190',   label:'SPX 190 Presets',     icon:Sparkles, children: buildPresetsTree(SPX_190_PRESETS,'p190') },
      { id:'spx_300',   label:'SPX 300 Presets',     icon:Star,     children: buildPresetsTree(SPX_300_PRESETS,'p300') },
    ]
  },
  {
    id:'video_effects', label:'Video Effects', icon:Video,
    children:[
      { id:'fade_effects', label:'Fade Effects', icon:Sun, children:[
        { id:'fadeIn',        label:'Fade In (Black)',  icon:Sun,    type:'effect' },
        { id:'fadeOut',       label:'Fade Out (Black)', icon:Circle, type:'effect' },
        { id:'fadeInWhite',   label:'Fade In (White)',  icon:Sun,    type:'effect' },
        { id:'fadeOutWhite',  label:'Fade Out (White)', icon:Sun,    type:'effect' },
        { id:'crossDissolve', label:'Cross Dissolve',   icon:Layers, type:'effect' },
      ]},
      { id:'enhancement', label:'Enhancement (AI)', icon:Sparkles, children:[
        { id:'low_light_restore', label:'Low-Light Restore',  icon:Lightbulb, type:'effect' },
        { id:'shadow_recovery',   label:'Shadow Recovery',    icon:Moon,      type:'effect' },
        { id:'denoise',           label:'Denoise',             icon:Filter,    type:'effect' },
        { id:'detail_boost',      label:'Detail Boost',        icon:Focus,     type:'effect' },
        { id:'cinematic_relight', label:'Cinematic Relight',   icon:Sparkles,  type:'effect' },
      ]},
      { id:'color_correction', label:'Color Correction', icon:Sun, children:[
        { id:'brightness', label:'Brightness',       icon:Sun,      type:'effect' },
        { id:'contrast',   label:'Contrast',         icon:Contrast, type:'effect' },
        { id:'saturation', label:'Saturation',       icon:Droplets, type:'effect' },
        { id:'hue',        label:'Hue Shift',        icon:Rainbow,  type:'effect' },
        { id:'gamma',      label:'Gamma Correction', icon:Gauge,    type:'effect' },
        { id:'exposure',   label:'Exposure',         icon:Camera,   type:'effect' },
      ]},
      { id:'color_grading', label:'Color Grading', icon:Palette, children:[
        { id:'colorBalance', label:'Color Balance',  icon:Palette,    type:'effect' },
        { id:'curves',       label:'Color Curves',   icon:TrendingUp, type:'effect' },
        { id:'levels',       label:'Levels',         icon:BarChart,   type:'effect' },
        { id:'lut',          label:'LUT Correction', icon:Layers,     type:'effect' },
      ]},
      { id:'blur_sharpen', label:'Blur & Sharpen', icon:Circle, children:[
        { id:'blur',       label:'Gaussian Blur', icon:Circle,    type:'effect' },
        { id:'motionBlur', label:'Motion Blur',   icon:Move,      type:'effect' },
        { id:'sharpen',    label:'Sharpen',       icon:Zap,       type:'effect' },
      ]},
      { id:'distortion', label:'Distortion', icon:Waves, children:[
        { id:'lens',        label:'Lens Distortion', icon:Focus,    type:'effect' },
        { id:'ripple',      label:'Ripple',          icon:Waves,    type:'effect' },
        { id:'twirl',       label:'Twirl',           icon:RotateCw, type:'effect' },
        { id:'perspective', label:'Perspective',     icon:Diamond,  type:'effect' },
      ]},
      { id:'stylize', label:'Stylize', icon:Paintbrush, children:[
        { id:'posterize', label:'Posterize',  icon:Layers,     type:'effect' },
        { id:'emboss',    label:'Emboss',     icon:Triangle,   type:'effect' },
        { id:'findEdges', label:'Find Edges', icon:Target,     type:'effect' },
        { id:'oilPaint',  label:'Oil Paint',  icon:Paintbrush, type:'effect' },
      ]},
      { id:'keying', label:'Keying & Masking', icon:Aperture, children:[
        { id:'chromaKey',    label:'Chroma Key',    icon:Palette, type:'effect' },
        { id:'colorKey',     label:'Color Key',     icon:Target,  type:'effect' },
        { id:'luminanceKey', label:'Luminance Key', icon:Sun,     type:'effect' },
        { id:'mask',         label:'Alpha Mask',    icon:Focus,   type:'effect' },
      ]},
      { id:'noise', label:'Noise & Grain', icon:Hash, children:[
        { id:'addNoise',    label:'Add Noise',       icon:Hash,   type:'effect' },
        { id:'removeNoise', label:'Noise Reduction', icon:Filter, type:'effect' },
      ]},
      { id:'generate', label:'Generate', icon:Sparkles, children:[
        { id:'gradientRamp', label:'Gradient Ramp', icon:TrendingUp, type:'effect' },
        { id:'fractalNoise', label:'Fractal Noise', icon:Waves,      type:'effect' },
      ]},
    ]
  },
  {
    id:'video_transitions', label:'Video Transitions', icon:Layers,
    children:[
      { id:'dissolve', label:'Dissolve', icon:Circle, children:[
        { id:'crossDissolve_t', label:'Cross Dissolve', icon:Layers,  type:'transition', dur:1 },
        { id:'fade_t',          label:'Fade to Black',  icon:Circle,  type:'transition', dur:0.5 },
        { id:'fadeWhite_t',     label:'Fade to White',  icon:Sun,     type:'transition', dur:0.5 },
        { id:'dip_t',           label:'Dip to Color',   icon:Palette, type:'transition', dur:1 },
      ]},
      { id:'wipe', label:'Wipe', icon:Move, children:[
        { id:'wipeLeft_t',  label:'Wipe Left',  icon:ArrowLeftRight, type:'transition', dur:1 },
        { id:'wipeRight_t', label:'Wipe Right', icon:ArrowLeftRight, type:'transition', dur:1 },
        { id:'wipeUp_t',    label:'Wipe Up',    icon:ArrowUpDown,    type:'transition', dur:1 },
        { id:'wipeDown_t',  label:'Wipe Down',  icon:ArrowUpDown,    type:'transition', dur:1 },
        { id:'irisRound_t', label:'Iris Round', icon:Circle,         type:'transition', dur:1 },
      ]},
      { id:'slide', label:'Slide', icon:ArrowLeftRight, children:[
        { id:'slideLeft_t',  label:'Slide Left',  icon:ArrowLeftRight, type:'transition', dur:1 },
        { id:'slideRight_t', label:'Slide Right', icon:ArrowLeftRight, type:'transition', dur:1 },
        { id:'pushLeft_t',   label:'Push Left',   icon:ArrowLeftRight, type:'transition', dur:1 },
      ]},
      { id:'3d_trans', label:'3D Motion', icon:RotateCw, children:[
        { id:'zoomIn_t',  label:'Zoom In',  icon:ZoomIn,         type:'transition', dur:1 },
        { id:'zoomOut_t', label:'Zoom Out', icon:ZoomOut,        type:'transition', dur:1 },
        { id:'spin_t',    label:'Spin',     icon:RotateCw,       type:'transition', dur:1.5 },
        { id:'flip_t',    label:'Flip',     icon:FlipHorizontal, type:'transition', dur:0.75 },
      ]},
      { id:'light_trans', label:'Light', icon:Star, children:[
        { id:'flash_t',     label:'Flash',      icon:Bolt, type:'transition', dur:0.3 },
        { id:'zoomBlur_t',  label:'Zoom Blur',  icon:ZoomIn,type:'transition', dur:1 },
      ]},
    ]
  },
  {
    id:'audio_effects', label:'Audio Effects', icon:AudioWaveform,
    children:[
      { id:'dynamics', label:'Dynamics', icon:Activity, children:[
        { id:'compressor', label:'Compressor',   icon:Minimize2, type:'effect' },
        { id:'limiter',    label:'Limiter',      icon:Maximize2, type:'effect' },
        { id:'gate',       label:'Noise Gate',   icon:Volume2,   type:'effect' },
      ]},
      { id:'eq', label:'EQ & Filter', icon:Sliders, children:[
        { id:'equalizer', label:'Parametric EQ',    icon:Sliders,     type:'effect' },
        { id:'highPass',  label:'High Pass Filter', icon:ArrowUpDown, type:'effect' },
        { id:'lowPass',   label:'Low Pass Filter',  icon:ArrowUpDown, type:'effect' },
      ]},
      { id:'time_audio', label:'Time-Based', icon:RefreshCw, children:[
        { id:'reverb',     label:'Reverb',      icon:AudioWaveform, type:'effect' },
        { id:'delay',      label:'Delay',       icon:Copy,          type:'effect' },
        { id:'pitchShift', label:'Pitch Shift', icon:ArrowUpDown,   type:'effect' },
      ]},
      { id:'modulation', label:'Modulation', icon:Waves, children:[
        { id:'chorus',  label:'Chorus',  icon:Copy,   type:'effect' },
        { id:'flanger', label:'Flanger', icon:Waves,  type:'effect' },
        { id:'phaser',  label:'Phaser',  icon:Circle, type:'effect' },
      ]},
      { id:'restoration', label:'Restoration', icon:Wand2, children:[
        { id:'noiseReduction', label:'Noise Reduction', icon:Filter,  type:'effect' },
        { id:'deEsser',        label:'De-Esser',        icon:Mic,     type:'effect' },
        { id:'deHum',          label:'De-Hum',          icon:WifiOff, type:'effect' },
      ]},
      { id:'distortion_audio', label:'Distortion', icon:Zap, children:[
        { id:'overdrive',  label:'Overdrive',   icon:Zap,    type:'effect' },
        { id:'distortion', label:'Distortion',  icon:Bolt,   type:'effect' },
        { id:'bitCrusher', label:'Bit Crusher', icon:Binary, type:'effect' },
      ]},
      { id:'spatial', label:'Spatial', icon:Headphones, children:[
        { id:'stereoWiden', label:'Stereo Widener',  icon:Maximize2,  type:'effect' },
        { id:'binaural',    label:'Binaural Panner', icon:Headphones, type:'effect' },
      ]},
    ]
  },
];

// ── Folder node ───────────────────────────────────────
function FolderNode({ node, depth, selectedClip, onApplyEffect, onSelectTransition, selectedTransType, setDraggedEffect, setDraggedTransition, searchTerm }) {
  const [open, setOpen] = useState(depth < 1);
  const hasChildren = node.children && node.children.length > 0;
  const isLeaf = node.type === 'effect' || node.type === 'transition' || node.type === 'preset';
  const Icon = node.icon;

  if (searchTerm && isLeaf) {
    if (!node.label.toLowerCase().includes(searchTerm.toLowerCase())) return null;
  }

  if (isLeaf) {
    const isTransition = node.type === 'transition';
    const isPreset     = node.type === 'preset';
    const realId       = node.id.replace(/_t$/,'').replace(/^p[0-9]+_/,'');
    return (
      <div
        className={`efx-leaf${isTransition && selectedTransType===realId?' efx-leaf-selected':''}`}
        style={{ paddingLeft: depth*14+6 }}
        draggable
        onDragStart={e => {
          if (isTransition) {
            setDraggedTransition({ id:realId, name:node.label, duration:node.dur||1 });
            e.dataTransfer.setData('application/json', JSON.stringify({ type:'transition', id:realId, name:node.label, dur:node.dur||1 }));
          } else {
            setDraggedEffect({ id:node.id, name:node.label });
            e.dataTransfer.setData('application/json', JSON.stringify({ type:'effect', id:node.id, name:node.label }));
          }
          e.dataTransfer.effectAllowed='copy';
          e.currentTarget.style.opacity='.5';
        }}
        onDragEnd={e => { e.currentTarget.style.opacity='1'; setDraggedEffect(null); setDraggedTransition(null); }}
        onClick={() => {
          if (isTransition) {
            onSelectTransition(realId);
          } else if (selectedClip) {
            onApplyEffect(selectedClip.id, isPreset ? realId : node.id, Math.round((node.intensity||0.5)*100));
          }
        }}
        title={selectedClip && !isTransition ? `Apply to "${selectedClip.title}"` : isTransition ? 'Drag to timeline or click to select' : 'Select a clip first'}
      >
        {Icon && <Icon size={11} style={{ flexShrink:0, color: isTransition?'#b180d7':isPreset?'#FF6600':'#8b949e' }} />}
        <span className="efx-leaf-label">{node.label}</span>
        {isTransition && node.dur && <span className="efx-leaf-dur">{node.dur}s</span>}
        {!isTransition && selectedClip && <span className="efx-leaf-apply">+</span>}
      </div>
    );
  }

  const FolderIcon = open ? FolderOpen : Folder;
  return (
    <div>
      <div className="efx-folder" style={{ paddingLeft: depth*14+2 }} onClick={() => setOpen(o=>!o)}>
        {open ? <ChevronDown size={11}/> : <ChevronRight size={11}/>}
        <FolderIcon size={12} style={{ color:'#00ffc8', flexShrink:0 }} />
        <span className="efx-folder-label">{node.label}</span>
        {hasChildren && <span style={{ marginLeft:'auto', fontSize:9, color:'#4e6a82' }}>{node.children.length}</span>}
      </div>
      {open && hasChildren && node.children.map(child => (
        <FolderNode key={child.id} node={child} depth={depth+1}
          selectedClip={selectedClip} onApplyEffect={onApplyEffect}
          onSelectTransition={onSelectTransition} selectedTransType={selectedTransType}
          setDraggedEffect={setDraggedEffect} setDraggedTransition={setDraggedTransition}
          searchTerm={searchTerm} />
      ))}
    </div>
  );
}

// ── Main Effects Panel ────────────────────────────────
export default function VideoEditorEffectsPanel({
  selectedClip, onApplyEffect, onSelectTransition, selectedTransType,
  setDraggedEffect, setDraggedTransition,
}) {
  const [search, setSearch] = useState('');

  return (
    <div className="efx-panel">
      <div className="efx-panel-header">
        <span className="efx-panel-title">Effects</span>
        {selectedClip && (
          <span style={{ fontSize:9, color:'#00ffc8', background:'rgba(0,255,200,.1)', padding:'2px 6px', borderRadius:3, fontWeight:700, maxWidth:120, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            {selectedClip.title}
          </span>
        )}
      </div>
      <div className="efx-search-wrap">
        <Search size={12} style={{ color:'#4e6a82', flexShrink:0 }} />
        <input className="efx-search" placeholder="Search effects…" value={search} onChange={e=>setSearch(e.target.value)} />
        {search && <button className="efx-search-clear" onClick={()=>setSearch('')}>✕</button>}
      </div>
      {!selectedClip && <div className="efx-hint">Select a clip to apply effects • Drag to timeline</div>}
      <div className="efx-tree">
        {EFFECTS_TREE.map(node => (
          <FolderNode key={node.id} node={node} depth={0}
            selectedClip={selectedClip} onApplyEffect={onApplyEffect}
            onSelectTransition={onSelectTransition} selectedTransType={selectedTransType}
            setDraggedEffect={setDraggedEffect} setDraggedTransition={setDraggedTransition}
            searchTerm={search} />
        ))}
      </div>
    </div>
  );
}
