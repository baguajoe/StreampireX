// src/front/js/pages/MotionStudioPage.js
// SPX Motion — After Effects-style motion graphics studio

import React, { useEffect, useRef, useState, useCallback } from "react";
import "../../styles/MotionStudio.css";
import "../../styles/MotionStudioPro.css";
import { useEditorStore } from "../store/useEditorStore";
import usePlaybackEngine from "../hooks/usePlaybackEngine";
import { renderLayers } from "../utils/motionstudio/renderEngine";
import { exportFrame, exportProject, exportVideo, importProject } from "../utils/export/exportEngine";
import { ANIMATABLE_PROPS } from "../utils/motionstudio/keyframeEngine";

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

  // Auto-save
  React.useEffect(() => {
    if (layers.length > 0) {
      try {
        localStorage.setItem(MOTION_KEY, JSON.stringify({ layers, timeline, name: projectName, savedAt: Date.now() }));
      } catch(e) {}
    }
  }, [layers, projectName]);

  // Load on mount
  React.useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(MOTION_KEY) || "null");
      if (saved?.layers?.length > 0) {
        setLayers(saved.layers);
        if (saved.name) setProjectName(saved.name);
      }
    } catch(e) {}
  }, []);
  const [activeTool,   setActiveTool]   = useState('select');
  const [activeTab,    setActiveTab]    = useState('layers');
  const [activeRTab,   setActiveRTab]   = useState('props');
  const [zoom,         setZoom]         = useState(1);
  const [projectName,  setProjectName]  = useState('Untitled Project');
  const [showGrid,     setShowGrid]     = useState(false);
  const [exporting,    setExporting]    = useState(false);

  const { scrubTo } = usePlaybackEngine();

  const selectedLayer = layers.find(l => l.id === selectedId) || null;

  // ─── Seed default layers ────────────────────────────────────────────────────
  useEffect(() => {
    if (!layers.length) {
      setLayers([
        { id:'title_1', type:'text', name:'Title', text:'SPX Motion', subtitle:'',
          x:240, y:200, color:'#ffffff', fontSize:56, fontWeight:800, z:1,
          opacity:1, rotation:0, scaleX:1, scaleY:1, effects:[], keyframes:{}, visible:true,
          glow:true, glowStrength:0.4 },
        { id:'shape_1', type:'shape', name:'Shape', x:240, y:310, width:200, height:80,
          color:'#00ffc8', z:0, opacity:0.9, animate:true, speed:1.25, amplitude:16,
          shape:'rect', effects:[], keyframes:{}, visible:true, rotation:0, scaleX:1, scaleY:1 },
      ]);
    }
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
    // Center cross
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
            { label: "Save", shortcut: "Ctrl+S", action: () => { try { localStorage.setItem(MOTION_KEY, JSON.stringify({layers,timeline,name:projectName,savedAt:Date.now()})); } catch(e){} alert("Saved!"); } },
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
            { label: "Keyboard Shortcuts", action: () => alert("Space=Play  V=Select  T=Text  U=Shape  R=Rotate  [/]=Zoom  Ctrl+Z=Undo  Ctrl+D=Duplicate  Del=Delete") },
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
          {/* Layer types */}
          <div style={S.panel}>
            <div style={S.label}>Add Layer</div>
            <div style={{display:'flex',flexWrap:'wrap',gap:4}}>
              {LAYER_TYPES.map(lt => (
                <button key={lt.type} title={lt.label} onClick={()=>handleAddLayer(lt.type)}
                  style={{...S.btn(false),padding:'4px 6px',fontSize:13}}>{lt.icon}</button>
              ))}
            </div>
          </div>

          {/* Layer list */}
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

          {/* Layer order controls */}
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

          {/* Status bar */}
          <div style={{background:'#161b22',borderTop:'1px solid #21262d',padding:'2px 12px',
            display:'flex',gap:20,fontSize:10,color:'#8b949e',flexShrink:0}}>
            <span>1280×720</span>
            <span>{timeline.fps} fps</span>
            <span>Tool: {activeTool}</span>
            <span>Layers: {layers.length}</span>
            <span>{timeline.playing ? '▶ Playing' : '⏸ Paused'}</span>
            {selectedLayer && <span style={{color:'#00ffc8'}}>Selected: {selectedLayer.name}</span>}
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

          {/* Props */}
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

          {/* Effects */}
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

          {/* Keyframes */}
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

          {/* Timeline settings */}
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

        {/* Scrubber */}
        <div style={{padding:'8px 12px'}}>
          {/* Time ruler */}
          <div style={{position:'relative',height:16,marginBottom:4}}>
            <div style={{position:'absolute',left:0,right:0,top:8,height:1,background:'#21262d'}}/>
            {Array.from({length:Math.ceil(timeline.duration)+1},(_,i)=>(
              <div key={i} style={{position:'absolute',left:`${(i/timeline.duration)*100}%`,top:0,
                display:'flex',flexDirection:'column',alignItems:'center',transform:'translateX(-50%)'}}>
                <div style={{width:1,height:6,background:'#30363d'}}/>
                <span style={{fontSize:8,color:'#8b949e',whiteSpace:'nowrap'}}>{i}s</span>
              </div>
            ))}
            {/* Playhead */}
            <div style={{position:'absolute',left:`${(timeline.currentTime/timeline.duration)*100}%`,
              top:-4,width:2,height:24,background:'#00ffc8',transform:'translateX(-50%)',
              cursor:'ew-resize',zIndex:10}}/>
          </div>

          {/* Layer tracks */}
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
                  {/* Keyframe diamonds */}
                  {Object.values(layer.keyframes||{}).flat().map((kf,i)=>(
                    <div key={i} style={{position:'absolute',left:`${(kf.time/timeline.duration)*100}%`,
                      top:'50%',transform:'translate(-50%,-50%) rotate(45deg)',
                      width:6,height:6,background:'#ffd700',border:'1px solid #000'}}/>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Scrub bar */}
          <input type="range" min={0} max={timeline.duration} step={1/timeline.fps}
            value={timeline.currentTime}
            onChange={e=>scrubTo(Number(e.target.value))}
            style={{width:'100%',marginTop:4,accentColor:'#00ffc8'}}/>
        </div>
      </div>
    </div>
  );
}
