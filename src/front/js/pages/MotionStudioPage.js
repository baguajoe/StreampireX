// src/front/js/pages/MotionStudioPage.js
// SPX Motion — After Effects-style motion graphics studio

import React, { useEffect, useRef, useState, useCallback } from "react";
import "../../styles/MotionStudio.css";
import "../../styles/MotionStudioPro.css";
import { useEditorStore } from "../store/useEditorStore";
import usePlaybackEngine from "../hooks/usePlaybackEngine";
import { renderLayers } from "../utils/motionstudio/renderEngine";
import { exportFrame, exportProject, exportVideo, importProject } from "../utils/export/exportEngine";
import { saveToCloud, listCloudProjects, loadFromCloud, deleteCloudProject } from "../utils/cloudSave";
import { ANIMATABLE_PROPS } from "../utils/motionstudio/keyframeEngine";
import MotionToolbar from "../component/motionstudio/MotionToolbar";
import MotionTimelinePanel from "../component/motionstudio/MotionTimelinePanel";
import MotionLayerPanel from "../component/motionstudio/MotionLayerPanel";
import MotionPropertyInspector from "../component/motionstudio/MotionPropertyInspector";
import MotionPreviewStage from "../component/motionstudio/MotionPreviewStage";
import MotionExportPanel from "../component/motionstudio/MotionExportPanel";
import MotionCameraPanel from "../component/motionstudio/MotionCameraPanel";
import MotionKeyframePanel from "../component/motionstudio/MotionKeyframePanel";
import MotionPresetBrowser from "../component/motionstudio/MotionPresetBrowser";
import MotionTemplatePanel from "../component/motionstudio/MotionTemplatePanel";
import MotionPathPanel from "../component/motionstudio/MotionPathPanel";
import MotionMaskEffectsPanel from "../component/motionstudio/MotionMaskEffectsPanel";
import MotionGraphEditorV2 from "../component/motionstudio/MotionGraphEditorV2";
import useMotionPresets from "../component/motionstudio/engine/useMotionPresets";

// ─── Expressions Engine ───────────────────────────────────────────────────────
const EXPR_LIBRARY = [
  {id:'wiggle_pos',   name:'Wiggle Position',  prop:'x',       expr:'wiggle(2, 30)'},
  {id:'wiggle_rot',   name:'Wiggle Rotation',  prop:'rotation',expr:'wiggle(3, 15)'},
  {id:'wiggle_scale', name:'Wiggle Scale',     prop:'scaleX',  expr:'wiggle(2, 0.1) + 1'},
  {id:'loop_rot',     name:'Loop Rotation',    prop:'rotation',expr:'loopOut("cycle")'},
  {id:'bounce_y',     name:'Bounce Y',         prop:'y',       expr:'Math.abs(Math.sin(time * 3)) * -80'},
  {id:'pendulum',     name:'Pendulum',         prop:'rotation',expr:'Math.sin(time * 2) * 45'},
  {id:'heartbeat',    name:'Heartbeat Scale',  prop:'scaleX',  expr:'1 + Math.pow(Math.sin(time * 6), 12) * 0.3'},
  {id:'flicker',      name:'Flicker Opacity',  prop:'opacity', expr:'Math.random() > 0.1 ? 1 : 0.3'},
  {id:'spiral_x',     name:'Spiral X',         prop:'x',       expr:'Math.cos(time) * 100'},
  {id:'spiral_y',     name:'Spiral Y',         prop:'y',       expr:'Math.sin(time) * 100'},
  {id:'typewriter',   name:'Typewriter',       prop:'opacity', expr:'time > thisLayer.inPoint ? 1 : 0'},
  {id:'ease_in',      name:'Ease In',          prop:'x',       expr:'linear(time, 0, 2, 0, 300)'},
];

const LINKABLE_PROPS = ['x','y','rotation','scaleX','scaleY','opacity','width','height'];

const MOTION_KEY = "spx_motion_project";

// ── Shared Menu Bar Component ──
function AppMenuBar({ menus, projectName, setProjectName, rightContent }) {
  return (
    <div className="spx-menu-bar">
      {menus.map(menu => (
        <MenuDropdown key={menu.label} label={menu.label} items={menu.items} />
      ))}
      <input
        className="spx-project-name-input"
        value={projectName || ""}
        onChange={e => setProjectName(e.target.value)}
        placeholder="Untitled Project"
      />
      <div style={{flex:1}}/>
      {rightContent}
    </div>
  );
}

function MenuDropdown({ label, items }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="spx-menu-item" onMouseLeave={() => setOpen(false)}>
      <button className="spx-menu-btn" onMouseEnter={() => setOpen(true)} onClick={() => setOpen(o => !o)}>
        {label}
      </button>
      {open && (
        <div className="spx-menu-dropdown">
          {items.map((item, i) => item === "---"
            ? <div key={i} style={{height:1,background:"#21262d",margin:"3px 0"}}/>
            : <button key={item.label} className="spx-menu-dropdown-item"
                onClick={() => { item.action(); setOpen(false); }}>
                <span>{item.label}</span>
                {item.shortcut && <span style={{color:"#4e6a82",fontSize:10,marginLeft:"auto"}}>{item.shortcut}</span>}
              </button>
          )}
        </div>
      )}
    </div>
  );
}

const S = {
  app:     { display:'flex', flexDirection:'column', height:'100vh', background:'#0d1117', color:'#dde6ef', fontFamily:"'JetBrains Mono',monospace", fontSize:12, overflow:'hidden' },
  topbar:  { display:'flex', alignItems:'center', gap:6, padding:'4px 12px', background:'#161b22', borderBottom:'1px solid #21262d', height:38, flexShrink:0 },
  body:    { display:'flex', flex:1, overflow:'hidden' },
  toolbar: { width:42, background:'#161b22', borderRight:'1px solid #21262d', display:'flex', flexDirection:'column', alignItems:'center', padding:'6px 0', gap:3 },
  left:    { width:220, background:'#161b22', borderRight:'1px solid #21262d', display:'flex', flexDirection:'column', overflowY:'auto' },
  center:  { flex:1, display:'flex', flexDirection:'column', overflow:'hidden', background:'#0d1117' },
  right:   { width:240, background:'#161b22', borderLeft:'1px solid #21262d', display:'flex', flexDirection:'column', overflowY:'auto' },
  bottom:  { height:180, background:'#161b22', borderTop:'1px solid #21262d', flexShrink:0, overflow:'hidden' },
  btn:     (active) => ({ padding:'3px 8px', borderRadius:3, cursor:'pointer', fontSize:10, fontWeight:700, border:'none',
    background: active ? '#00ffc8' : '#21262d', color: active ? '#000' : '#8b949e' }),
  toolBtn: (active) => ({ width:32, height:32, border:'none', borderRadius:4, cursor:'pointer', fontSize:14,
    background: active ? '#00ffc8' : 'transparent', color: active ? '#000' : '#8b949e',
    display:'flex', alignItems:'center', justifyContent:'center' }),
  panel:   { padding:'8px 10px', borderBottom:'1px solid #21262d' },
  label:   { color:'#8b949e', fontSize:10, textTransform:'uppercase', letterSpacing:1, marginBottom:4 },
  input:   { width:'100%', background:'#0d1117', border:'1px solid #21262d', color:'#dde6ef', borderRadius:3, padding:'3px 6px', fontSize:11 },
  layerRow:(sel) => ({ display:'flex', alignItems:'center', gap:6, padding:'5px 8px', cursor:'pointer', borderRadius:4,
    background: sel ? 'rgba(0,255,200,0.1)' : 'transparent',
    borderLeft: sel ? '2px solid #00ffc8' : '2px solid transparent' }),
};

const TOOLS = [
  { id:'select',    icon:'↖', label:'Select (V)' },
  { id:'move',      icon:'✥', label:'Move (W)' },
  { id:'rotate',    icon:'↺', label:'Rotate (R)' },
  { id:'scale',     icon:'⤢', label:'Scale (S)' },
  { id:'text',      icon:'T', label:'Text (T)' },
  { id:'shape',     icon:'▭', label:'Shape (U)' },
  { id:'pen',       icon:'✒', label:'Pen (P)' },
  { id:'camera',    icon:'🎥', label:'Camera (C)' },
  { id:'hand',      icon:'✋', label:'Hand (H)' },
  { id:'zoom',      icon:'🔍', label:'Zoom (Z)' },
];

const LAYER_TYPES = [
  { type:'text',      icon:'T',  label:'Text' },
  { type:'shape',     icon:'▭', label:'Shape' },
  { type:'image',     icon:'🖼', label:'Image' },
  { type:'video',     icon:'🎬', label:'Video' },
  { type:'particles', icon:'✨', label:'Particles' },
  { type:'gradient',  icon:'◑',  label:'Gradient' },
];

const BLEND_MODES = ['source-over','multiply','screen','overlay','darken','lighten','color-dodge','color-burn','difference','exclusion'];

// Expression-aware property row component
function ExprPropRow({label, prop, layer, onOpenExpr, children}) {
  const hasExpr = !!(layer?.expressions?.[prop]);
  return (
    <div style={{display:'flex',flexDirection:'column',gap:2,marginBottom:6}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <span style={{color:'#888',fontSize:10,textTransform:'uppercase',letterSpacing:0.5}}>{label}</span>
        <button
          title={hasExpr ? `Expression: ${layer.expressions[prop]}` : 'Add Expression'}
          onClick={()=>onOpenExpr(layer.id, prop, layer?.expressions?.[prop]||'')}
          style={{background:'none',border:'none',cursor:'pointer',fontSize:11,
            color:hasExpr?'#00ffc8':'#444',padding:'0 2px'}}>
          ƒ
        </button>
      </div>
      {children}
      {hasExpr && (
        <div style={{color:'#00ffc8',fontSize:9,fontFamily:'JetBrains Mono',opacity:0.7,
          whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
          ƒ {layer.expressions[prop]}
        </div>
      )}
    </div>
  );
}

export default function MotionStudioPage() {
  const canvasRef    = useRef(null);
  const timelineRef  = useRef(null);
  const rafRef       = useRef(null);
  const fileInputRef = useRef(null);

  const timeline    = useEditorStore(s => s.timeline);
  const layers      = useEditorStore(s => s.layers);
  const camera      = useEditorStore(s => s.camera);
  const setTime     = useEditorStore(s => s.setTime);
  const togglePlay  = useEditorStore(s => s.togglePlay);
  const addLayer    = useEditorStore(s => s.addLayer);
  const setLayers   = useEditorStore(s => s.setLayers);
  const updateLayer = useEditorStore(s => s.updateLayer);
  const removeLayer = useEditorStore(s => s.removeLayer);
  const loadProject = useEditorStore(s => s.loadProject);
  const undo        = useEditorStore(s => s.undo);
  const redo        = useEditorStore(s => s.redo);
  const setDuration = useEditorStore(s => s.setDuration);
  const setFPS      = useEditorStore(s => s.setFPS);

  const [selectedId,   setSelectedId]   = useState(null);
  const [projectName,  setProjectName]  = useState("Untitled Project");
  const [activeTool,   setActiveTool]   = useState('select');
  const [activeTab,    setActiveTab]    = useState('layers');
  const [activeRTab,   setActiveRTab]   = useState('props');
  const [zoom,         setZoom]         = useState(1);
  const [showGrid,     setShowGrid]     = useState(false);
  const [exporting,    setExporting]    = useState(false);
  const [exprPanelOpen,  setExprPanelOpen]  = useState(false);
  const [exprTarget,     setExprTarget]     = useState(null);
  const [exprText,       setExprText]       = useState('');
  const [exprError,      setExprError]      = useState('');
  const [exprLibOpen,    setExprLibOpen]    = useState(false);
  const [linkMode,       setLinkMode]       = useState(false);
  const [linkSource,     setLinkSource]     = useState(null);
  const [propertyLinks,  setPropertyLinks]  = useState([]);
  const [status,         setStatus]         = useState('');
  const [showShortcuts,  setShowShortcuts]  = useState(false);
  const [cloudProjects,  setCloudProjects]  = useState([]);
  const [showCloudLoad,  setShowCloudLoad]  = useState(false);
  const [showPresets,    setShowPresets]    = useState(false);
  const [showTemplates,  setShowTemplates]  = useState(false);
  const [showKeyframes,  setShowKeyframes]  = useState(false);
  const [showCamera,     setShowCamera]     = useState(false);
  const [showExportPnl,  setShowExportPnl]  = useState(false);
  const [showGraphEditor,setShowGraphEditor]= useState(false);
  const [showMaskFX,     setShowMaskFX]     = useState(false);
  const [showPathPanel,  setShowPathPanel]  = useState(false);
  const [showPreviewStg, setShowPreviewStg] = useState(false);
  const [selectedTextPreset, setSelectedTextPreset] = useState('fade_in');
  const [selectedLowerThird, setSelectedLowerThird] = useState('minimal');
  const [cameraPreset,   setCameraPreset]   = useState('default');
  const [loopRegion,     setLoopRegion]     = useState(null);
  const [timelineZoom,   setTimelineZoom]   = useState(1);
  const [exportSettings, setExportSettings] = useState({ name: 'export', format: 'webm', fps: 30 });
  const selectedKeyframeRef = { current: null };
  const CAMERA_PRESETS = [
    { id:'default', name:'Default' }, { id:'dolly', name:'Dolly In' },
    { id:'pan',     name:'Pan Right' }, { id:'tilt', name:'Tilt Up' },
    { id:'zoom',    name:'Zoom Out' }, { id:'orbit', name:'Orbit' },
  ];

  const { scrubTo } = usePlaybackEngine();

  const selectedLayer = layers.find(l => l.id === selectedId) || null;

  // Auto-clear status
  useEffect(() => {
    if (!status) return;
    const t = setTimeout(() => setStatus(''), 4000);
    return () => clearTimeout(t);
  }, [status]);

  // Auto-save
  React.useEffect(() => {
    if (layers.length > 0) {
      try {
        localStorage.setItem(MOTION_KEY, JSON.stringify({ layers, timeline, name: projectName, savedAt: Date.now(), userSaved: false }));
      } catch(e) {}
    }
  }, [layers, projectName]);

  // Load on mount — only restore if user explicitly saved
  React.useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(MOTION_KEY) || "null");
      if (saved?.layers?.length > 0 && saved?.userSaved === true) {
        setLayers(saved.layers);
        if (saved.name) setProjectName(saved.name);
      }
    } catch(e) {}
  }, []);

  // ── Expression eval sandbox ──
  const evalExpression = (expr, time, layer, allLayers) => {
    try {
      const wiggle = (freq, amp) => {
        const seed = (layer.id||'').charCodeAt(0) || 1;
        return (Math.sin(time * freq * Math.PI * 2 + seed) * amp);
      };
      const loopOut = (type='cycle') => time;
      const loopIn  = (type='cycle') => time;
      const linear  = (t, t1, t2, v1, v2) => {
        if (t <= t1) return v1;
        if (t >= t2) return v2;
        return v1 + (v2 - v1) * ((t - t1) / (t2 - t1));
      };
      const ease = (t, t1, t2, v1, v2) => {
        if (t <= t1) return v1;
        if (t >= t2) return v2;
        const p = (t - t1) / (t2 - t1);
        const ep = p < 0.5 ? 2*p*p : -1+(4-2*p)*p;
        return v1 + (v2 - v1) * ep;
      };
      const random = (min=0, max=1) => min + Math.random() * (max - min);
      const thisLayer = layer;
      const comp = { layers: allLayers, duration: 10 };
      // eslint-disable-next-line no-new-func
      const fn = new Function('time','thisLayer','wiggle','loopOut','loopIn','linear','ease','random','comp','Math',
        `"use strict"; return (${expr});`);
      return fn(time, thisLayer, wiggle, loopOut, loopIn, linear, ease, random, comp, Math);
    } catch(e) {
      return null;
    }
  };

  const getLayerPropAtTime = (layer, prop, time, allLayers) => {
    const link = propertyLinks.find(l => l.dstId === layer.id && l.dstProp === prop);
    if (link) {
      const srcLayer = allLayers.find(l => l.id === link.srcId);
      if (srcLayer) {
        if (link.expr) return evalExpression(link.expr, time, srcLayer, allLayers);
        return srcLayer[link.srcProp] ?? layer[prop];
      }
    }
    const expr = layer.expressions?.[prop];
    if (expr) {
      const result = evalExpression(expr, time, layer, allLayers);
      if (result !== null) return result;
    }
    return layer[prop];
  };

  const openExprPanel = (layerId, prop, currentExpr='') => {
    setExprTarget({layerId, prop});
    setExprText(currentExpr);
    setExprError('');
    setExprPanelOpen(true);
  };

  const saveExpression = () => {
    if (!exprTarget) return;
    const allLayers = layers;
    const layer = allLayers.find(l => l.id === exprTarget.layerId);
    if (layer) {
      const result = evalExpression(exprText, 0, layer, allLayers);
      if (result === null && exprText.trim()) {
        setExprError('Expression error — check syntax');
        return;
      }
    }
    setExprError('');
    setLayers(layers.map(l => l.id === exprTarget.layerId
      ? {...l, expressions: {...(l.expressions||{}), [exprTarget.prop]: exprText || undefined}}
      : l
    ));
    setExprPanelOpen(false);
  };

  const removeExpression = (layerId, prop) => {
    setLayers(layers.map(l => {
      if (l.id !== layerId) return l;
      const expressions = {...(l.expressions||{})};
      delete expressions[prop];
      return {...l, expressions};
    }));
  };

  const addPropertyLink = (srcId, srcProp, dstId, dstProp, expr='') => {
    setPropertyLinks(pl => [
      ...pl.filter(l => !(l.dstId===dstId && l.dstProp===dstProp)),
      {srcId, srcProp, dstId, dstProp, expr}
    ]);
  };

  const removePropertyLink = (dstId, dstProp) => {
    setPropertyLinks(pl => pl.filter(l => !(l.dstId===dstId && l.dstProp===dstProp)));
  };

  // ─── Seed default layers ────────────────────────────────────────────────────
  useEffect(() => {
    // Start with empty canvas
  }, []);

  // ─── Render Loop ────────────────────────────────────────────────────────────
  useEffect(() => {
    const draw = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        renderLayers(canvas.getContext('2d'), layers, timeline.currentTime, camera);
        if (showGrid) drawGrid(canvas.getContext('2d'), canvas.width, canvas.height);
      }
      rafRef.current = requestAnimationFrame(draw);
    };
    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [layers, timeline.currentTime, camera, showGrid]);

  function drawGrid(ctx, W, H) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 0.5;
    for (let x=0; x<W; x+=40) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
    for (let y=0; y<H; y+=40) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(0,255,200,0.15)';
    ctx.beginPath(); ctx.moveTo(W/2,0); ctx.lineTo(W/2,H); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0,H/2); ctx.lineTo(W,H/2); ctx.stroke();
    ctx.restore();
  }

  // ─── Keyboard Shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); }
        if (e.key === 's') { e.preventDefault(); handleExportProject(); }
        if (e.key === 'd') { e.preventDefault(); handleDuplicate(); }
      }
      if (e.key === ' ')  { e.preventDefault(); togglePlay(); }
      if (e.key === 'Delete' || e.key === 'Backspace') { if (selectedId) removeLayer(selectedId); setSelectedId(null); }
      if (e.key === 'v' || e.key === 'V') setActiveTool('select');
      if (e.key === 'w' || e.key === 'W') setActiveTool('move');
      if (e.key === 't' || e.key === 'T') setActiveTool('text');
      if (e.key === 'u' || e.key === 'U') setActiveTool('shape');
      if (e.key === 'r' || e.key === 'R') setActiveTool('rotate');
      if (e.key === 'h' || e.key === 'H') setActiveTool('hand');
      if (e.key === '[') setZoom(z => Math.max(0.1, z - 0.1));
      if (e.key === ']') setZoom(z => Math.min(4, z + 0.1));
      if (e.key === 'Home') setTime(0);
      if (e.key === 'End')  setTime(timeline.duration);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedId, timeline.duration]);

  // ─── Actions ────────────────────────────────────────────────────────────────
  const handleAddLayer = (type) => {
    const id = addLayer({ type, name: type.charAt(0).toUpperCase()+type.slice(1),
      x: 100 + Math.random()*200, y: 100 + Math.random()*200,
      ...(type==='text' ? { text:'New Text', fontSize:40, color:'#ffffff', fontWeight:700 } : {}),
      ...(type==='shape' ? { width:120, height:80, color:'#00ffc8', shape:'rect' } : {}),
      ...(type==='particles' ? { width:200, height:200, color:'#00ffc8', emitRate:3, speed:2, gravity:0.05 } : {}),
      ...(type==='gradient' ? { width:300, height:200, gradientType:'linear', gradientAngle:135,
        stops:[{offset:0,color:'#00ffc8'},{offset:1,color:'#ff6600'}] } : {}),
    });
    setSelectedId(id);
  };

  const handleDuplicate = () => {
    if (!selectedLayer) return;
    const id = addLayer({ ...selectedLayer, name: selectedLayer.name + ' Copy', x:(selectedLayer.x||0)+20, y:(selectedLayer.y||0)+20 });
    setSelectedId(id);
  };

  // ── Keyframe helpers ────────────────────────────────────────────────────
  const addKeyframeToSelected = (prop, value) => {
    if (!selectedId) return;
    const layer = layers.find(l => l.id === selectedId);
    if (!layer) return;
    const kfs = { ...(layer.keyframes || {}), [prop]: [...(layer.keyframes?.[prop] || []), { time: timeline.currentTime, value }] };
    updateLayer(selectedId, { keyframes: kfs });
    setStatus(`Keyframe added: ${prop} = ${value} at ${timeline.currentTime.toFixed(2)}s`);
  };
  const removeKeyframeFromSelected = (prop, time) => {
    if (!selectedId) return;
    const layer = layers.find(l => l.id === selectedId);
    if (!layer) return;
    const kfs = { ...(layer.keyframes || {}), [prop]: (layer.keyframes?.[prop] || []).filter(k => k.time !== time) };
    updateLayer(selectedId, { keyframes: kfs });
  };
  const addLowerThirdLayer = () => handleAddLayer("lower_third");

  const handleExportFrame = () => {
    if (canvasRef.current) exportFrame(canvasRef.current, projectName);
  };

  const handleExportVideo = async () => {
    if (!canvasRef.current) return;
    setExporting(true);
    await exportVideo(canvasRef.current, timeline, (t) => {
      setTime(t);
      renderLayers(canvasRef.current.getContext('2d'), layers, t, camera);
    }, { fps: timeline.fps });
    setExporting(false);
  };

  const handleExportProject = () => {
    exportProject({ timeline, layers, camera }, projectName);
  };

  const handleImport = (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    importProject((data) => {
      loadProject(data);
      setProjectName(data.name || 'Imported Project');
    });
  };

  const formatTime = (t) => {
    const m = Math.floor(t / 60), s = Math.floor(t % 60), f = Math.floor((t % 1) * timeline.fps);
    return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}:${String(f).padStart(2,'0')}`;
  };

  const timelineWidth = 600;
  const scrubX = (timeline.duration > 0) ? (timeline.currentTime / timeline.duration) * timelineWidth : 0;

  return (
    <>
      <div style={S.app}>
        <AppMenuBar
          projectName={projectName}
          setProjectName={setProjectName}
          rightContent={
            <span style={{fontSize:10,color:"#4e6a82"}}>{layers.length} layers · {timeline.fps}fps</span>
          }
          menus={[
            { label: "File", items: [
              { label: "New Project", shortcut: "Ctrl+N", action: () => { if(window.confirm("Clear project?")) { setLayers([]); setProjectName("Untitled Project"); localStorage.removeItem(MOTION_KEY); } } },
              { label: "Save to Cloud ☁", shortcut: "Ctrl+Shift+S", action: async () => {
                try {
                  const r = await saveToCloud("motion", projectName, {layers, timeline, name: projectName});
                  setStatus("✅ Saved to cloud: " + r.name);
                } catch(e) { setStatus("Cloud save failed: " + e.message); }
              } },
              { label: "Open from Cloud ☁", action: async () => {
                try {
                  const projects = await listCloudProjects("motion");
                  if (!projects.length) { setStatus("No saved projects found."); return; }
                  setCloudProjects(projects);
                  setShowCloudLoad(true);
                } catch(e) { setStatus("Load failed: " + e.message); }
              } },
              { label: "Save", shortcut: "Ctrl+S", action: () => { try { localStorage.setItem(MOTION_KEY, JSON.stringify({layers,timeline,name:projectName,savedAt:Date.now(),userSaved:true})); setStatus("✅ Project saved locally"); } catch(e){ setStatus("Save failed"); } } },
              "---",
              { label: "Export Frame", action: handleExportFrame },
              { label: "Export Video (WebM)", action: handleExportVideo },
              { label: "Export Project (.spx)", action: handleExportProject },
              "---",
              { label: "Open Project (.spx)", action: () => fileInputRef.current?.click() },
            ]},
            { label: "Edit", items: [
              { label: "Undo", shortcut: "Ctrl+Z", action: undo },
              { label: "Redo", shortcut: "Ctrl+Shift+Z", action: redo },
              "---",
              { label: "Duplicate Layer", shortcut: "Ctrl+D", action: handleDuplicate },
              { label: "Delete Layer", shortcut: "Del", action: () => selectedId && removeLayer(selectedId) },
              { label: "Select All", shortcut: "Ctrl+A", action: () => {} },
            ]},
            { label: "View", items: [
              { label: "Zoom In",  shortcut: "]", action: () => setZoom(z => Math.min(4, z+0.25)) },
              { label: "Zoom Out", shortcut: "[", action: () => setZoom(z => Math.max(0.1, z-0.25)) },
              { label: "Zoom 100%", shortcut: "1", action: () => setZoom(1) },
              { label: "Zoom Fit",  shortcut: "0", action: () => setZoom(1) },
              "---",
              { label: showGrid ? "Hide Grid" : "Show Grid", action: () => setShowGrid(g => !g) },
            ]},
            { label: "Layer", items: [
              { label: "Add Text",      action: () => handleAddLayer("text") },
              { label: "Add Shape",     action: () => handleAddLayer("shape") },
              { label: "Add Image",     action: () => handleAddLayer("image") },
              { label: "Add Video",     action: () => handleAddLayer("video") },
              { label: "Add Particles", action: () => handleAddLayer("particles") },
              { label: "Add Gradient",  action: () => handleAddLayer("gradient") },
              "---",
              { label: "Move Up",   action: () => {} },
              { label: "Move Down", action: () => {} },
            ]},
            { label: "Animation", items: [
              { label: "Play/Pause",   shortcut: "Space", action: togglePlay },
              { label: "Go to Start",  shortcut: "Home",  action: () => setTime(0) },
              { label: "Go to End",    shortcut: "End",   action: () => setTime(timeline.duration) },
              "---",
              { label: "Add Keyframe", shortcut: "K", action: () => {} },
              { label: "Ease In Out",  action: () => {} },
              { label: "Ease Bounce",  action: () => {} },
            ]},
            { label: "Help", items: [
              { label: "Keyboard Shortcuts", action: () => setShowShortcuts(true) },
              { label: "About SPX Motion",   action: () => {} },
            ]},
          ]}
        />

        {/* ── Top Bar ── */}
        <div style={S.topbar}>
          <span style={{color:'#00ffc8',fontWeight:700,marginRight:8,fontSize:13}}>✨ SPX Motion</span>
          <input value={projectName} onChange={e=>setProjectName(e.target.value)}
            style={{...S.input, width:160, background:'transparent', border:'none', color:'#dde6ef', fontWeight:700}} />
          <div style={{width:1,height:20,background:'#21262d',margin:'0 4px'}}/>
          <button style={S.btn(false)} onClick={undo} title="Ctrl+Z">↩</button>
          <button style={S.btn(false)} onClick={redo} title="Ctrl+Shift+Z">↪</button>
          <div style={{width:1,height:20,background:'#21262d',margin:'0 4px'}}/>
          <button style={S.btn(timeline.playing)} onClick={togglePlay} title="Space">
            {timeline.playing ? '⏸ Pause' : '▶ Play'}
          </button>
          <button style={S.btn(false)} onClick={()=>setTime(0)}>⏮</button>
          <button style={S.btn(false)} onClick={()=>setTime(timeline.duration)}>⏭</button>
          <span style={{color:'#00ffc8',fontFamily:'monospace',fontSize:12,margin:'0 8px'}}>
            {formatTime(timeline.currentTime)}
          </span>
          <span style={{color:'#8b949e',fontSize:10}}>/ {formatTime(timeline.duration)}</span>
          <div style={{width:1,height:20,background:'#21262d',margin:'0 4px'}}/>
          <button style={S.btn(showGrid)} onClick={()=>setShowGrid(g=>!g)}>⊞ Grid</button>
          <span style={{color:'#8b949e',fontSize:10}}>Zoom:</span>
          <button style={S.btn(false)} onClick={()=>setZoom(z=>Math.max(0.1,z-0.25))}>−</button>
          <span style={{color:'#00ffc8',width:36,textAlign:'center',fontSize:11}}>{Math.round(zoom*100)}%</span>
          <button style={S.btn(false)} onClick={()=>setZoom(z=>Math.min(4,z+0.25))}>+</button>
          <button style={S.btn(false)} onClick={()=>setZoom(1)}>1:1</button>
          <div style={{flex:1}}/>
          <button style={S.btn(false)} onClick={handleExportFrame}>📷 Frame</button>
          <button style={{...S.btn(false), background:exporting?'#21262d':'#ff6600', color:exporting?'#8b949e':'#fff'}}
            onClick={handleExportVideo} disabled={exporting}>
            {exporting ? '⏳ Exporting...' : '🎬 Export Video'}
          </button>
          <button style={S.btn(false)} onClick={handleExportProject}>💾 Save</button>
          <button style={S.btn(false)} onClick={()=>fileInputRef.current?.click()}>📂 Open</button>
          <input ref={fileInputRef} type="file" accept=".spx,.json" style={{display:'none'}} onChange={handleImport}/>
        </div>

        <div style={S.body}>
          {/* ── Left Toolbar (AE-style) ── */}
          <div style={S.toolbar}>
            {TOOLS.map(tool => (
              <button key={tool.id} style={S.toolBtn(activeTool===tool.id)} title={tool.label}
                onClick={()=>setActiveTool(tool.id)}>{tool.icon}</button>
            ))}
            <div style={{flex:1}}/>
            <div style={{width:28,height:1,background:'#21262d',margin:'4px 0'}}/>
            <div style={{width:22,height:22,background:'#00ffc8',borderRadius:3,cursor:'pointer'}} title="Foreground color"/>
          </div>

          {/* ── Left Panel ── */}
          <div style={S.left}>
            <div style={S.panel}>
              <div style={S.label}>Add Layer</div>
              <div style={{display:'flex',flexWrap:'wrap',gap:4}}>
                {LAYER_TYPES.map(lt => (
                  <button key={lt.type} title={lt.label} onClick={()=>handleAddLayer(lt.type)}
                    style={{...S.btn(false),padding:'4px 6px',fontSize:13}}>{lt.icon}</button>
                ))}
              </div>
            </div>

            <div style={{...S.panel, flex:1, overflowY:'auto'}}>
              <div style={S.label}>Layers ({layers.length})</div>
              {[...layers].reverse().map(layer => (
                <div key={layer.id} style={S.layerRow(selectedId===layer.id)}
                  onClick={()=>setSelectedId(layer.id)}>
                  <span style={{fontSize:11,opacity:0.5}}>
                    {layer.type==='text'?'T':layer.type==='shape'?'▭':layer.type==='particles'?'✨':'🖼'}
                  </span>
                  <span style={{flex:1,fontSize:11,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',
                    color: selectedId===layer.id ? '#00ffc8' : '#dde6ef'}}>
                    {layer.name || layer.type}
                  </span>
                  <button onClick={e=>{e.stopPropagation();updateLayer(layer.id,{visible:!layer.visible})}}
                    style={{...S.btn(false),padding:'1px 3px',opacity:layer.visible?1:0.3,fontSize:11}}>👁</button>
                  <button onClick={e=>{e.stopPropagation();removeLayer(layer.id);if(selectedId===layer.id)setSelectedId(null)}}
                    style={{...S.btn(false),padding:'1px 3px',color:'#f85149',fontSize:11}}>✕</button>
                </div>
              ))}
            </div>

            {selectedId && (
              <div style={{display:'flex',gap:4,padding:'6px 8px',borderTop:'1px solid #21262d'}}>
                <button style={S.btn(false)} onClick={handleDuplicate}>⊕ Dupe</button>
                <button style={S.btn(false)} onClick={()=>removeLayer(selectedId)||setSelectedId(null)}>🗑</button>
              </div>
            )}
          </div>

          {/* ── Canvas Center ── */}
          <div style={S.center}>
            <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden',padding:16}}>
              <div style={{transform:`scale(${zoom})`,transformOrigin:'center center',display:'inline-block',
                boxShadow:'0 0 40px rgba(0,0,0,0.8)'}}>
                <canvas ref={canvasRef} width={1280} height={720}
                  style={{display:'block',background:'#000'}}/>
              </div>
            </div>

            <div style={{background:'#161b22',borderTop:'1px solid #21262d',padding:'2px 12px',
              display:'flex',gap:20,fontSize:10,color:'#8b949e',flexShrink:0}}>
              <span>1280×720</span>
              <span>{timeline.fps} fps</span>
              <span>Tool: {activeTool}</span>
              <span>Layers: {layers.length}</span>
              <span>{timeline.playing ? '▶ Playing' : '⏸ Paused'}</span>
              {selectedLayer && <span style={{color:'#00ffc8'}}>Selected: {selectedLayer.name}</span>}
              {status && <span style={{color:'#00ffc8',marginLeft:'auto'}}>{status}</span>}
            </div>
          </div>

          {/* ── Right Panel ── */}
          <div style={S.right}>
            <div style={{display:'flex',borderBottom:'1px solid #21262d'}}>
              {['props','effects','keyframes'].map(tab => (
                <button key={tab} onClick={()=>setActiveRTab(tab)} style={{
                  flex:1,padding:'6px 4px',border:'none',cursor:'pointer',fontSize:9,fontWeight:700,textTransform:'uppercase',
                  background:activeRTab===tab?'#0d1117':'transparent',
                  color:activeRTab===tab?'#00ffc8':'#8b949e',
                  borderBottom:activeRTab===tab?'2px solid #00ffc8':'2px solid transparent',
                }}>{tab}</button>
              ))}
            </div>

            {activeRTab==='props' && selectedLayer && (
              <div style={{padding:10,display:'flex',flexDirection:'column',gap:6}}>
                <div style={S.label}>Transform</div>
                {[['X','x'],['Y','y'],['W','width'],['H','height']].map(([lbl,key]) => (
                  selectedLayer[key] !== undefined && (
                    <div key={key} style={{display:'flex',alignItems:'center',gap:6}}>
                      <span style={{color:'#8b949e',width:16,fontSize:10}}>{lbl}</span>
                      <input type="number" style={S.input} value={Math.round(selectedLayer[key]||0)}
                        onChange={e=>updateLayer(selectedId,{[key]:Number(e.target.value)})}/>
                    </div>
                  )
                ))}
                <div style={{display:'flex',alignItems:'center',gap:6}}>
                  <span style={{color:'#8b949e',width:16,fontSize:10}}>°</span>
                  <input type="range" min={-180} max={180} value={selectedLayer.rotation||0}
                    onChange={e=>updateLayer(selectedId,{rotation:Number(e.target.value)})} style={{flex:1}}/>
                  <span style={{color:'#00ffc8',fontSize:10,width:30}}>{selectedLayer.rotation||0}°</span>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:6}}>
                  <span style={{color:'#8b949e',width:16,fontSize:10}}>α</span>
                  <input type="range" min={0} max={1} step={0.01} value={selectedLayer.opacity??1}
                    onChange={e=>updateLayer(selectedId,{opacity:Number(e.target.value)})} style={{flex:1}}/>
                  <span style={{color:'#00ffc8',fontSize:10,width:30}}>{Math.round((selectedLayer.opacity??1)*100)}%</span>
                </div>

                <div style={S.label}>Blend Mode</div>
                <select style={S.input} value={selectedLayer.blendMode||'source-over'}
                  onChange={e=>updateLayer(selectedId,{blendMode:e.target.value})}>
                  {BLEND_MODES.map(m=><option key={m}>{m}</option>)}
                </select>

                <div style={S.label}>Color</div>
                <div style={{display:'flex',gap:6,alignItems:'center'}}>
                  <input type="color" value={selectedLayer.color||'#00ffc8'}
                    onChange={e=>updateLayer(selectedId,{color:e.target.value})}
                    style={{width:36,height:26,border:'none',borderRadius:3,cursor:'pointer'}}/>
                  <input style={{...S.input,flex:1}} value={selectedLayer.color||'#00ffc8'}
                    onChange={e=>updateLayer(selectedId,{color:e.target.value})}/>
                </div>

                {selectedLayer.type==='text' && (
                  <>
                    <div style={S.label}>Text</div>
                    <textarea style={{...S.input,height:50,resize:'vertical'}} value={selectedLayer.text||''}
                      onChange={e=>updateLayer(selectedId,{text:e.target.value})}/>
                    <div style={{display:'flex',gap:6}}>
                      <input type="number" style={{...S.input,width:55}} value={selectedLayer.fontSize||42}
                        onChange={e=>updateLayer(selectedId,{fontSize:Number(e.target.value)})} placeholder="Size"/>
                      <select style={S.input} value={selectedLayer.textAlign||'left'}
                        onChange={e=>updateLayer(selectedId,{textAlign:e.target.value})}>
                        {['left','center','right'].map(a=><option key={a}>{a}</option>)}
                      </select>
                    </div>
                    <div style={{display:'flex',alignItems:'center',gap:6}}>
                      <input type="checkbox" checked={selectedLayer.glow||false}
                        onChange={e=>updateLayer(selectedId,{glow:e.target.checked})}/>
                      <span style={{color:'#8b949e',fontSize:10}}>Glow</span>
                      {selectedLayer.glow && (
                        <input type="range" min={0} max={1} step={0.05} value={selectedLayer.glowStrength||0.5}
                          onChange={e=>updateLayer(selectedId,{glowStrength:Number(e.target.value)})} style={{flex:1}}/>
                      )}
                    </div>
                  </>
                )}

                {selectedLayer.type==='shape' && (
                  <>
                    <div style={S.label}>Shape</div>
                    <select style={S.input} value={selectedLayer.shape||'rect'}
                      onChange={e=>updateLayer(selectedId,{shape:e.target.value})}>
                      {['rect','circle','triangle','star','polygon','line'].map(s=><option key={s}>{s}</option>)}
                    </select>
                    <div style={{display:'flex',alignItems:'center',gap:6}}>
                      <input type="checkbox" checked={selectedLayer.animate||false}
                        onChange={e=>updateLayer(selectedId,{animate:e.target.checked})}/>
                      <span style={{color:'#8b949e',fontSize:10}}>Animate</span>
                    </div>
                  </>
                )}

                {selectedLayer.type==='particles' && (
                  <>
                    <div style={S.label}>Particles</div>
                    {[['Rate','emitRate',1,20],['Speed','speed',0.1,10,0.1],['Gravity','gravity',0,1,0.01],['Size','particleSize',1,30]].map(([lbl,key,mn,mx,st=1])=>(
                      <div key={key} style={{display:'flex',alignItems:'center',gap:6}}>
                        <span style={{color:'#8b949e',fontSize:10,width:50}}>{lbl}</span>
                        <input type="range" min={mn} max={mx} step={st} value={selectedLayer[key]??mn}
                          onChange={e=>updateLayer(selectedId,{[key]:Number(e.target.value)})} style={{flex:1}}/>
                        <span style={{color:'#00ffc8',fontSize:10,width:25}}>{selectedLayer[key]??mn}</span>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}

            {activeRTab==='effects' && selectedLayer && (
              <div style={{padding:10,display:'flex',flexDirection:'column',gap:6}}>
                <div style={S.label}>Effects</div>
                {[
                  {type:'blur',label:'Blur',min:0,max:50,default:4},
                  {type:'brightness',label:'Brightness',min:0,max:3,step:0.05,default:1},
                  {type:'contrast',label:'Contrast',min:0,max:3,step:0.05,default:1},
                  {type:'saturate',label:'Saturation',min:0,max:3,step:0.05,default:1},
                  {type:'hue',label:'Hue Rotate',min:-180,max:180,default:0},
                  {type:'grayscale',label:'Grayscale',min:0,max:1,step:0.01,default:0},
                ].map(fx => {
                  const existing = (selectedLayer.effects||[]).find(e=>e.type===fx.type);
                  return (
                    <div key={fx.type} style={{display:'flex',alignItems:'center',gap:6}}>
                      <input type="checkbox" checked={!!existing&&existing.enabled!==false}
                        onChange={e=>{
                          const effects=[...(selectedLayer.effects||[])].filter(ef=>ef.type!==fx.type);
                          if(e.target.checked) effects.push({type:fx.type,value:fx.default,enabled:true});
                          updateLayer(selectedId,{effects});
                        }}/>
                      <span style={{color:'#8b949e',width:70,fontSize:10}}>{fx.label}</span>
                      {existing&&(
                        <input type="range" min={fx.min} max={fx.max} step={fx.step||1}
                          value={existing.value||fx.default}
                          onChange={e=>{
                            const effects=(selectedLayer.effects||[]).map(ef=>ef.type===fx.type?{...ef,value:Number(e.target.value)}:ef);
                            updateLayer(selectedId,{effects});
                          }} style={{flex:1}}/>
                      )}
                      {existing&&<span style={{color:'#00ffc8',fontSize:10,width:28}}>{Number(existing.value||fx.default).toFixed(1)}</span>}
                    </div>
                  );
                })}
              </div>
            )}

            {activeRTab==='keyframes' && selectedLayer && (
              <div style={{padding:10,display:'flex',flexDirection:'column',gap:6}}>
                <div style={S.label}>Keyframes at {timeline.currentTime.toFixed(2)}s</div>
                {Object.entries(ANIMATABLE_PROPS).slice(0,8).map(([prop,meta]) => {
                  const kfs = selectedLayer.keyframes?.[prop] || [];
                  const hasKf = kfs.some(k=>Math.abs(k.time-timeline.currentTime)<0.05);
                  return (
                    <div key={prop} style={{display:'flex',alignItems:'center',gap:6}}>
                      <button onClick={()=>{
                        if(hasKf) {
                          const newKfs={...selectedLayer.keyframes};
                          newKfs[prop]=(newKfs[prop]||[]).filter(k=>Math.abs(k.time-timeline.currentTime)>=0.05);
                          updateLayer(selectedId,{keyframes:newKfs});
                        } else {
                          const val=selectedLayer[prop]??meta.default;
                          const newKfs={...selectedLayer.keyframes};
                          newKfs[prop]=[...(newKfs[prop]||[]),{time:timeline.currentTime,value:val,easing:'easeInOut'}];
                          newKfs[prop].sort((a,b)=>a.time-b.time);
                          updateLayer(selectedId,{keyframes:newKfs});
                        }
                      }} style={{...S.btn(hasKf),padding:'2px 5px',fontSize:11}}>◆</button>
                      <span style={{color:'#8b949e',fontSize:10,flex:1}}>{meta.label}</span>
                      <span style={{color:'#00ffc8',fontSize:10,width:20}}>{kfs.length}</span>
                    </div>
                  );
                })}
              </div>
            )}

            <div style={{...S.panel,borderTop:'1px solid #21262d',marginTop:'auto'}}>
              <div style={S.label}>Timeline</div>
              <div style={{display:'flex',gap:6,alignItems:'center',marginBottom:4}}>
                <span style={{color:'#8b949e',fontSize:10,width:50}}>Duration</span>
                <input type="number" style={{...S.input,width:60}} value={timeline.duration}
                  onChange={e=>setDuration(Number(e.target.value))} min={1} max={300}/>
                <span style={{color:'#8b949e',fontSize:10}}>s</span>
              </div>
              <div style={{display:'flex',gap:6,alignItems:'center'}}>
                <span style={{color:'#8b949e',fontSize:10,width:50}}>FPS</span>
                <select style={S.input} value={timeline.fps} onChange={e=>setFPS(Number(e.target.value))}>
                  {[12,24,25,30,48,60].map(f=><option key={f}>{f}</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* ── Bottom Timeline ── */}
        <div style={S.bottom}>
          <div style={{display:'flex',alignItems:'center',gap:8,padding:'4px 12px',borderBottom:'1px solid #21262d',height:28}}>
            <span style={{color:'#8b949e',fontSize:10}}>Timeline</span>
            <span style={{color:'#00ffc8',fontFamily:'monospace',fontSize:11}}>{formatTime(timeline.currentTime)}</span>
            <div style={{flex:1}}/>
            <button style={S.btn(false)} onClick={()=>setTime(0)}>⏮</button>
            <button style={S.btn(timeline.playing)} onClick={togglePlay}>{timeline.playing?'⏸':'▶'}</button>
            <button style={S.btn(false)} onClick={()=>setTime(timeline.duration)}>⏭</button>
          </div>

          <div style={{padding:'8px 12px'}}>
            <div style={{position:'relative',height:16,marginBottom:4}}>
              <div style={{position:'absolute',left:0,right:0,top:8,height:1,background:'#21262d'}}/>
              {Array.from({length:Math.ceil(timeline.duration)+1},(_,i)=>(
                <div key={i} style={{position:'absolute',left:`${(i/timeline.duration)*100}%`,top:0,
                  display:'flex',flexDirection:'column',alignItems:'center',transform:'translateX(-50%)'}}>
                  <div style={{width:1,height:6,background:'#30363d'}}/>
                  <span style={{fontSize:8,color:'#8b949e',whiteSpace:'nowrap'}}>{i}s</span>
                </div>
              ))}
              <div style={{position:'absolute',left:`${(timeline.currentTime/timeline.duration)*100}%`,
                top:-4,width:2,height:24,background:'#00ffc8',transform:'translateX(-50%)',
                cursor:'ew-resize',zIndex:10}}/>
            </div>

            <div style={{display:'flex',flexDirection:'column',gap:2,maxHeight:100,overflowY:'auto'}}>
              {[...layers].reverse().map(layer => (
                <div key={layer.id} style={{display:'flex',alignItems:'center',gap:6,height:18}}>
                  <span style={{fontSize:9,color:'#8b949e',width:80,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                    {layer.name||layer.type}
                  </span>
                  <div style={{flex:1,position:'relative',height:12,background:'#21262d',borderRadius:2}}>
                    <div style={{position:'absolute',left:`${((layer.inPoint||0)/timeline.duration)*100}%`,
                      width:`${(((layer.outPoint||timeline.duration)-(layer.inPoint||0))/timeline.duration)*100}%`,
                      height:'100%',background:selectedId===layer.id?'#00ffc8':'#1f6feb',borderRadius:2,opacity:0.7}}/>
                    {Object.values(layer.keyframes||{}).flat().map((kf,i)=>(
                      <div key={i} style={{position:'absolute',left:`${(kf.time/timeline.duration)*100}%`,
                        top:'50%',transform:'translate(-50%,-50%) rotate(45deg)',
                        width:6,height:6,background:'#ffd700',border:'1px solid #000'}}/>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <input type="range" min={0} max={timeline.duration} step={1/timeline.fps}
              value={timeline.currentTime}
              onChange={e=>scrubTo(Number(e.target.value))}
              style={{width:'100%',marginTop:4,accentColor:'#00ffc8'}}/>
          </div>
        </div>
      </div>

      {/* ── Expression Editor Panel ── */}
      {exprPanelOpen && exprTarget && (
        <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.88)',zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center'}}>
          <div style={{background:'#0d1117',border:'1px solid #21262d',borderRadius:8,padding:20,width:580,display:'flex',flexDirection:'column',gap:12}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span style={{color:'#00ffc8',fontFamily:'JetBrains Mono',fontSize:13,fontWeight:700}}>
                ƒ Expression — {exprTarget.prop}
              </span>
              <div style={{display:'flex',gap:8}}>
                <button onClick={()=>setExprLibOpen(true)}
                  style={{background:'#1a1f2e',border:'1px solid #333',color:'#FF6600',borderRadius:4,padding:'3px 10px',cursor:'pointer',fontSize:11}}>
                  Library
                </button>
                <button onClick={()=>setExprPanelOpen(false)}
                  style={{background:'none',border:'none',color:'#888',cursor:'pointer',fontSize:18}}>✕</button>
              </div>
            </div>

            <div style={{fontSize:10,color:'#555',fontFamily:'JetBrains Mono'}}>
              Available: time · thisLayer · wiggle(freq,amp) · loopOut(type) · linear(t,t1,t2,v1,v2) · ease() · random(min,max) · Math
            </div>

            <textarea
              value={exprText}
              onChange={e=>{setExprText(e.target.value); setExprError('');}}
              placeholder={'e.g. wiggle(2, 30)\ne.g. Math.sin(time * 3) * 100\ne.g. loopOut("cycle")'}
              rows={6}
              style={{background:'#06060f',border:`1px solid ${exprError?'#ff4444':'#333'}`,borderRadius:4,
                padding:'10px',color:'#00ffc8',fontSize:12,fontFamily:'JetBrains Mono',
                resize:'vertical',outline:'none',width:'100%',boxSizing:'border-box'}}
            />

            {exprError && <div style={{color:'#ff4444',fontSize:11,fontFamily:'JetBrains Mono'}}>{exprError}</div>}

            <div style={{display:'flex',gap:8,alignItems:'center'}}>
              <span style={{color:'#888',fontSize:11}}>Test at t=1:</span>
              <span style={{color:'#00ffc8',fontSize:11,fontFamily:'JetBrains Mono'}}>
                {(() => {
                  const layer = layers.find(l=>l.id===exprTarget.layerId)||{};
                  const r = evalExpression(exprText, 1, layer, layers);
                  return r===null ? '⚠️ error' : String(typeof r==='number'?r.toFixed(3):r);
                })()}
              </span>
            </div>

            <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
              {exprText && (
                <button onClick={()=>{removeExpression(exprTarget.layerId,exprTarget.prop);setExprPanelOpen(false);}}
                  style={{background:'#1a1f2e',border:'1px solid #444',color:'#ff4444',borderRadius:4,padding:'6px 14px',cursor:'pointer',fontSize:12}}>
                  Remove
                </button>
              )}
              <button onClick={saveExpression}
                style={{background:'#FF6600',color:'#fff',border:'none',borderRadius:4,padding:'6px 18px',cursor:'pointer',fontWeight:700,fontSize:12}}>
                ƒ Apply Expression
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Expression Library ── */}
      {exprLibOpen && (
        <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.88)',zIndex:10000,display:'flex',alignItems:'center',justifyContent:'center'}}>
          <div style={{background:'#0d1117',border:'1px solid #21262d',borderRadius:8,padding:20,width:520,maxHeight:'80vh',overflowY:'auto',display:'flex',flexDirection:'column',gap:10}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span style={{color:'#00ffc8',fontFamily:'JetBrains Mono',fontSize:13,fontWeight:700}}>Expression Library</span>
              <button onClick={()=>setExprLibOpen(false)} style={{background:'none',border:'none',color:'#888',cursor:'pointer',fontSize:18}}>✕</button>
            </div>
            <div style={{fontSize:10,color:'#555'}}>Click to load into editor. Double-click to apply directly.</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
              {EXPR_LIBRARY.map(ex=>(
                <div key={ex.id}
                  style={{background:'#1a1f2e',border:'1px solid #21262d',borderRadius:6,padding:10,cursor:'pointer'}}
                  onClick={()=>{setExprText(ex.expr); setExprLibOpen(false);}}
                  onDoubleClick={()=>{
                    if (exprTarget) {
                      setExprText(ex.expr);
                      setExprLibOpen(false);
                    }
                  }}>
                  <div style={{color:'#dde6ef',fontSize:11,fontWeight:600,marginBottom:4}}>{ex.name}</div>
                  <div style={{color:'#00ffc8',fontSize:10,fontFamily:'JetBrains Mono',opacity:0.8}}>{ex.expr}</div>
                  <div style={{color:'#555',fontSize:9,marginTop:4}}>prop: {ex.prop}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Cloud Load Modal ── */}
      {showCloudLoad && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',zIndex:9999,
          display:'flex',alignItems:'center',justifyContent:'center'}}
          onClick={e => e.target===e.currentTarget && setShowCloudLoad(false)}>
          <div style={{background:'#1a1f2e',border:'1px solid #30363d',borderRadius:8,
            padding:24,minWidth:360,maxHeight:'70vh',overflowY:'auto'}}>
            <div style={{fontSize:13,fontWeight:700,color:'#00ffc8',marginBottom:16,
              fontFamily:'Share Tech Mono,monospace'}}>OPEN FROM CLOUD ☁</div>
            {cloudProjects.map((p, i) => (
              <div key={i}
                onClick={async () => {
                  try {
                    const payload = await loadFromCloud(p.key);
                    if (payload) {
                      if (payload.layers) setLayers(payload.layers);
                      if (payload.name) setProjectName(payload.name);
                      setStatus('✅ Loaded: ' + p.name);
                    }
                  } catch(e) { setStatus('Load failed: ' + e.message); }
                  setShowCloudLoad(false);
                }}
                style={{padding:'10px 14px',margin:'4px 0',background:'#0d1117',
                  border:'1px solid #21262d',borderRadius:4,cursor:'pointer',
                  color:'#cdd9e5',fontSize:12,display:'flex',justifyContent:'space-between'}}>
                <span>{p.name}</span>
                <span style={{color:'#4e6a82',fontSize:10}}>
                  {new Date(p.modified).toLocaleDateString()}
                </span>
              </div>
            ))}
            <button onClick={() => setShowCloudLoad(false)}
              style={{marginTop:12,width:'100%',padding:'8px',background:'transparent',
                border:'1px solid #30363d',borderRadius:4,color:'#8b949e',cursor:'pointer',fontSize:12}}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Keyboard Shortcuts Modal ── */}
      {showShortcuts && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',zIndex:9999,
          display:'flex',alignItems:'center',justifyContent:'center'}}
          onClick={e => e.target===e.currentTarget && setShowShortcuts(false)}>
          <div style={{background:'#1a1f2e',border:'1px solid #30363d',borderRadius:8,
            padding:24,minWidth:320,color:'#cdd9e5'}}>
            <div style={{fontSize:13,fontWeight:700,color:'#00ffc8',marginBottom:16,
              fontFamily:'Share Tech Mono,monospace'}}>KEYBOARD SHORTCUTS</div>
            {[
              ['Space',      'Play / Pause'],
              ['V',          'Select tool'],
              ['T',          'Text tool'],
              ['U',          'Shape tool'],
              ['R',          'Rotate'],
              ['[ / ]',      'Zoom out / in'],
              ['Ctrl+Z',     'Undo'],
              ['Ctrl+D',     'Duplicate layer'],
              ['Del',        'Delete layer'],
              ['Home / End', 'Go to start / end'],
            ].map(([key, desc]) => (
              <div key={key} style={{display:'flex',justifyContent:'space-between',
                padding:'5px 0',borderBottom:'1px solid #21262d',fontSize:12}}>
                <span style={{fontFamily:'Share Tech Mono,monospace',color:'#00ffc8'}}>{key}</span>
                <span style={{color:'#8b949e'}}>{desc}</span>
              </div>
            ))}
            <button onClick={() => setShowShortcuts(false)}
              style={{marginTop:16,width:'100%',padding:'8px',background:'transparent',
                border:'1px solid #30363d',borderRadius:4,color:'#8b949e',cursor:'pointer',fontSize:12}}>
              Close
            </button>
          </div>
        </div>
      )}

      {/* ── Property Links Panel (floating button) ── */}
      <button title="Expressions & Links" onClick={()=>setExprLibOpen(true)}
        style={{position:'fixed',bottom:80,right:24,zIndex:1000,width:44,height:44,borderRadius:'50%',
          background:'#1a1f2e',border:'2px solid #00ffc8',color:'#00ffc8',
          fontSize:16,cursor:'pointer',boxShadow:'0 4px 16px rgba(0,255,200,0.2)'}}>ƒ</button>
    </>
  );
}