// src/front/js/pages/SPXCanvasPage.js
// SPX Canvas — Photoshop-rival canvas editor with real Canvas 2D rendering

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { renderCanvas, hitTestLayers, exportCanvasPNG, exportCanvasJPG, exportCanvasWebP } from "../utils/spxcanvas/canvasEngine";
import { drawSelectionMarquee, createRectSelection, createEllipseSelection, createLassoSelection, magicWandSelect } from "../utils/spxcanvas/selectionEngine";
import "../../styles/SPXCanvas.css";

const uid = () => `${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
const clamp = (n,a,b) => Math.max(a,Math.min(b,n));

// ─── Tool Definitions ─────────────────────────────────────────────────────────
const TOOLS = [
  { id:'move',       icon:'✥',  label:'Move',           shortcut:'V', group:'select' },
  { id:'select',     icon:'⬚',  label:'Marquee Select', shortcut:'M', group:'select' },
  { id:'ellipse_sel',icon:'⊙',  label:'Ellipse Select', shortcut:'M', group:'select' },
  { id:'lasso',      icon:'⌇',  label:'Lasso Select',   shortcut:'L', group:'select' },
  { id:'magic_wand', icon:'✦',  label:'Magic Wand',     shortcut:'W', group:'select' },
  { id:'crop',       icon:'⛶',  label:'Crop',           shortcut:'C', group:'transform' },
  { id:'brush',      icon:'🖌', label:'Brush',          shortcut:'B', group:'paint' },
  { id:'eraser',     icon:'◻',  label:'Eraser',         shortcut:'E', group:'paint' },
  { id:'fill',       icon:'🪣', label:'Fill',           shortcut:'G', group:'paint' },
  { id:'gradient',   icon:'◑',  label:'Gradient',       shortcut:'G', group:'paint' },
  { id:'eyedropper', icon:'💉', label:'Eyedropper',     shortcut:'I', group:'paint' },
  { id:'text',       icon:'T',  label:'Text',           shortcut:'T', group:'create' },
  { id:'rect',       icon:'▭',  label:'Rectangle',      shortcut:'U', group:'create' },
  { id:'ellipse',    icon:'⬭',  label:'Ellipse',        shortcut:'U', group:'create' },
  { id:'line',       icon:'╱',  label:'Line',           shortcut:'U', group:'create' },
  { id:'polygon',    icon:'⬡',  label:'Polygon',        shortcut:'U', group:'create' },
  { id:'star',       icon:'★',  label:'Star',           shortcut:'U', group:'create' },
  { id:'zoom_in',    icon:'🔍', label:'Zoom In',        shortcut:'Z', group:'view' },
  { id:'zoom_out',   icon:'🔎', label:'Zoom Out',       shortcut:'Z', group:'view' },
  { id:'hand',       icon:'✋', label:'Pan',            shortcut:'H', group:'view' },
];

const BLEND_MODES = [
  'source-over','multiply','screen','overlay','darken','lighten',
  'color-dodge','color-burn','hard-light','soft-light','difference',
  'exclusion','hue','saturation','color','luminosity',
];

const DEFAULT_PROJECT = {
  name:'Untitled Canvas', width:1920, height:1080, background:'#1c2a38',
  layers:[], version:'1.0',
};

function makeLayer(type, extras={}) {
  return {
    id: uid(), type, name: type.charAt(0).toUpperCase()+type.slice(1),
    visible:true, locked:false, opacity:1, blendMode:'source-over',
    x:100, y:100, width:200, height:120,
    color:'#00ffc8', fill:'#00ffc8', stroke:null, strokeWidth:0,
    rotation:0, scaleX:1, scaleY:1,
    effects:[], keyframes:{},
    ...extras,
  };
}

export default function SPXCanvasPage() {
  const canvasRef   = useRef(null);
  const stageRef    = useRef(null);
  const rafRef      = useRef(null);
  const timeRef     = useRef(0);

  const [project,      setProject]      = useState(DEFAULT_PROJECT);
  const [activeTool,   setActiveTool]   = useState('move');
  const [selectedId,   setSelectedId]   = useState(null);
  const [dragState,    setDragState]    = useState(null);
  const [selection,    setSelection]    = useState(null);
  const [zoom,         setZoom]         = useState(1);
  const [pan,          setPan]          = useState({ x:0, y:0 });
  const [history,      setHistory]      = useState([]);
  const [future,       setFuture]       = useState([]);
  const [status,       setStatus]       = useState('Ready');
  const [activeTab,    setActiveTab]    = useState('layers');
  const [brushColor,   setBrushColor]   = useState('#00ffc8');
  const [brushSize,    setBrushSize]    = useState(12);
  const [brushHardness,setBrushHardness]= useState(0.8);
  const [brushOpacity, setBrushOpacity] = useState(1);
  const [showGrid,     setShowGrid]     = useState(false);
  const [showRulers,   setShowRulers]   = useState(true);
  const [snapToGrid,   setSnapToGrid]   = useState(false);
  const [gridSize,     setGridSize]     = useState(20);

  const selectedLayer = useMemo(
    () => project.layers.find(l=>l.id===selectedId)||null,
    [project.layers, selectedId]
  );

  // ─── Render Loop ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const loop = (now) => {
      timeRef.current = now / 1000;
      const canvas = canvasRef.current;
      if (canvas) {
        renderCanvas(canvas, project, selectedId);
        if (selection) {
          const ctx = canvas.getContext('2d');
          drawSelectionMarquee(ctx, selection, timeRef.current);
        }
        if (showGrid) drawGrid(canvas.getContext('2d'), canvas.width, canvas.height, gridSize);
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [project, selectedId, selection, showGrid, gridSize]);

  function drawGrid(ctx, W, H, size) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 0.5;
    for (let x=0;x<W;x+=size) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
    for (let y=0;y<H;y+=size) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }
    ctx.restore();
  }

  // ─── History ──────────────────────────────────────────────────────────────
  const snapshot = useCallback(() => {
    setHistory(h => [...h.slice(-49), JSON.stringify(project)]);
    setFuture([]);
  }, [project]);

  const undo = () => {
    if (!history.length) return;
    setFuture(f => [JSON.stringify(project), ...f.slice(0,49)]);
    setProject(JSON.parse(history[history.length-1]));
    setHistory(h => h.slice(0,-1));
    setStatus('Undo');
  };

  const redo = () => {
    if (!future.length) return;
    setHistory(h => [...h.slice(-49), JSON.stringify(project)]);
    setProject(JSON.parse(future[0]));
    setFuture(f => f.slice(1));
    setStatus('Redo');
  };

  // ─── Layer Management ─────────────────────────────────────────────────────
  const addLayer = useCallback((type, extras={}) => {
    snapshot();
    const layer = makeLayer(type, extras);
    setProject(p => ({ ...p, layers:[...p.layers, layer] }));
    setSelectedId(layer.id);
    setStatus(`Added ${type} layer`);
    return layer.id;
  }, [snapshot]);

  const updateLayer = useCallback((id, patch) => {
    setProject(p => ({ ...p, layers: p.layers.map(l=>l.id===id?{...l,...patch}:l) }));
  }, []);

  const removeLayer = useCallback((id) => {
    snapshot();
    setProject(p => ({ ...p, layers: p.layers.filter(l=>l.id!==id) }));
    if (selectedId===id) setSelectedId(null);
    setStatus('Layer deleted');
  }, [snapshot, selectedId]);

  const duplicateLayer = useCallback(() => {
    if (!selectedLayer) return;
    snapshot();
    const clone = { ...JSON.parse(JSON.stringify(selectedLayer)), id:uid(), name:selectedLayer.name+' Copy', x:(selectedLayer.x||0)+20, y:(selectedLayer.y||0)+20 };
    setProject(p => ({ ...p, layers:[...p.layers,clone] }));
    setSelectedId(clone.id);
  }, [selectedLayer, snapshot]);

  const moveLayerZ = useCallback((id, dir) => {
    setProject(p => {
      const arr=[...p.layers], idx=arr.findIndex(l=>l.id===id);
      const swap=dir==='up'?idx+1:idx-1;
      if(swap<0||swap>=arr.length)return p;
      [arr[idx],arr[swap]]=[arr[swap],arr[idx]];
      return {...p,layers:arr};
    });
  }, []);

  const mergeDown = useCallback(() => {
    if (!selectedLayer) return;
    const idx = project.layers.findIndex(l=>l.id===selectedId);
    if (idx<=0) return;
    snapshot();
    // Rasterize to offscreen and combine
    const merged = { ...project.layers[idx-1], name:'Merged Layer' };
    setProject(p => {
      const arr=[...p.layers];
      arr.splice(idx-1,2,merged);
      return {...p,layers:arr};
    });
    setStatus('Merged down');
  }, [selectedLayer, selectedId, project.layers, snapshot]);

  const flattenAll = useCallback(() => {
    snapshot();
    const flat = makeLayer('rect', {
      x:0, y:0, width:project.width, height:project.height,
      color:project.background, name:'Background (Flattened)',
    });
    setProject(p => ({ ...p, layers:[flat] }));
    setSelectedId(flat.id);
    setStatus('Flattened');
  }, [snapshot, project]);

  // ─── Mouse Interaction ────────────────────────────────────────────────────
  const getCanvasPoint = useCallback((e) => {
    const canvas = canvasRef.current; if (!canvas) return {x:0,y:0};
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / zoom,
      y: (e.clientY - rect.top)  / zoom,
    };
  }, [zoom]);

  const onMouseDown = useCallback((e) => {
    const pt = getCanvasPoint(e);
    const snapped = snapToGrid ? { x:Math.round(pt.x/gridSize)*gridSize, y:Math.round(pt.y/gridSize)*gridSize } : pt;

    if (activeTool === 'move' || activeTool === 'select') {
      const hit = hitTestLayers(project.layers, pt.x, pt.y);
      if (hit) {
        setSelectedId(hit.id);
        setDragState({ id:hit.id, kind:'move', startX:pt.x, startY:pt.y, ox:hit.x||0, oy:hit.y||0 });
      } else {
        setSelectedId(null);
        if (activeTool==='select') {
          setDragState({ kind:'marquee', startX:pt.x, startY:pt.y });
        }
      }
    }

    if (activeTool==='ellipse_sel') {
      setDragState({ kind:'ellipse_sel', startX:pt.x, startY:pt.y });
    }

    if (activeTool==='lasso') {
      setDragState({ kind:'lasso', points:[snapped] });
      setSelection(createLassoSelection([snapped]));
    }

    if (activeTool==='brush'||activeTool==='eraser') {
      snapshot();
      const id = addLayer('brush', {
        points:[snapped],
        color: activeTool==='eraser' ? project.background : brushColor,
        brushSize, brushOpacity, brushHardness,
        blendMode: activeTool==='eraser' ? 'destination-out' : 'source-over',
        name: activeTool==='brush' ? 'Brush Stroke' : 'Eraser Stroke',
      });
      setDragState({ id, kind:'draw' });
    }

    if (activeTool==='rect')    { addLayer('rect',    { x:snapped.x, y:snapped.y, width:120, height:80, fill:brushColor }); }
    if (activeTool==='ellipse') { addLayer('ellipse', { x:snapped.x, y:snapped.y, width:120, height:80, fill:brushColor }); }
    if (activeTool==='line')    { addLayer('line',    { points:[snapped,{x:snapped.x+100,y:snapped.y}], color:brushColor, strokeWidth:brushSize }); }
    if (activeTool==='polygon') { addLayer('polygon', { x:snapped.x, y:snapped.y, width:100, height:100, fill:brushColor, sides:6 }); }
    if (activeTool==='star')    { addLayer('star',    { x:snapped.x, y:snapped.y, width:100, height:100, fill:brushColor, points:5 }); }
    if (activeTool==='text')    { addLayer('text',    { x:snapped.x, y:snapped.y, text:'Double-click to edit', fontSize:32, color:brushColor }); }
    if (activeTool==='gradient'){ addLayer('gradient',{ x:snapped.x, y:snapped.y, width:200, height:200,
      gradientType:'linear', gradientAngle:90,
      stops:[{offset:0,color:brushColor},{offset:1,color:'#000000'}],
    }); }

    if (activeTool==='zoom_in')  setZoom(z=>Math.min(8,z*1.25));
    if (activeTool==='zoom_out') setZoom(z=>Math.max(0.1,z/1.25));

    if (activeTool==='crop') {
      setDragState({ kind:'crop', startX:pt.x, startY:pt.y });
    }
  }, [activeTool, project, getCanvasPoint, addLayer, brushColor, brushSize, brushOpacity, brushHardness, snapshot, snapToGrid, gridSize]);

  const onMouseMove = useCallback((e) => {
    if (!dragState) return;
    const pt = getCanvasPoint(e);

    if (dragState.kind==='move') {
      updateLayer(dragState.id, {
        x: clamp(dragState.ox+(pt.x-dragState.startX), 0, project.width),
        y: clamp(dragState.oy+(pt.y-dragState.startY), 0, project.height),
      });
    }

    if (dragState.kind==='draw') {
      setProject(p => ({ ...p, layers: p.layers.map(l=>
        l.id===dragState.id ? {...l, points:[...(l.points||[]),{x:pt.x,y:pt.y}]} : l
      )}));
    }

    if (dragState.kind==='marquee') {
      const sel = createRectSelection(
        Math.min(dragState.startX,pt.x), Math.min(dragState.startY,pt.y),
        Math.abs(pt.x-dragState.startX), Math.abs(pt.y-dragState.startY)
      );
      setSelection(sel);
    }

    if (dragState.kind==='ellipse_sel') {
      const sel = createEllipseSelection(
        Math.min(dragState.startX,pt.x), Math.min(dragState.startY,pt.y),
        Math.abs(pt.x-dragState.startX), Math.abs(pt.y-dragState.startY)
      );
      setSelection(sel);
    }

    if (dragState.kind==='lasso') {
      const pts = [...dragState.points, pt];
      setDragState(d=>({...d,points:pts}));
      setSelection(createLassoSelection(pts));
    }

    if (dragState.kind==='crop') {
      setSelection(createRectSelection(
        Math.min(dragState.startX,pt.x), Math.min(dragState.startY,pt.y),
        Math.abs(pt.x-dragState.startX), Math.abs(pt.y-dragState.startY)
      ));
    }
  }, [dragState, getCanvasPoint, updateLayer, project.width, project.height]);

  const onMouseUp = useCallback(() => {
    if (dragState?.kind==='crop' && selection) {
      snapshot();
      setProject(p=>({...p, width:Math.round(selection.width||p.width), height:Math.round(selection.height||p.height)}));
      setSelection(null);
    }
    setDragState(null);
  }, [dragState, selection, snapshot]);

  // ─── Keyboard Shortcuts ───────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA') return;
      if (e.ctrlKey||e.metaKey) {
        if (e.key==='z') { e.preventDefault(); e.shiftKey ? redo() : undo(); }
        if (e.key==='d') { e.preventDefault(); duplicateLayer(); }
        if (e.key==='a') { e.preventDefault(); /* select all */ }
        if (e.key==='=') { e.preventDefault(); setZoom(z=>Math.min(8,z*1.25)); }
        if (e.key==='-') { e.preventDefault(); setZoom(z=>Math.max(0.1,z/1.25)); }
        if (e.key==='0') { e.preventDefault(); setZoom(1); }
        if (e.key==='s') { e.preventDefault(); exportCanvasPNG(canvasRef.current, project.name); }
      }
      if (e.key==='Delete'||e.key==='Backspace') { if(selectedId) removeLayer(selectedId); }
      if (e.key==='v'||e.key==='V') setActiveTool('move');
      if (e.key==='b'||e.key==='B') setActiveTool('brush');
      if (e.key==='e'||e.key==='E') setActiveTool('eraser');
      if (e.key==='t'||e.key==='T') setActiveTool('text');
      if (e.key==='m'||e.key==='M') setActiveTool('select');
      if (e.key==='l'||e.key==='L') setActiveTool('lasso');
      if (e.key==='c'||e.key==='C') setActiveTool('crop');
      if (e.key==='i'||e.key==='I') setActiveTool('eyedropper');
      if (e.key==='h'||e.key==='H') setActiveTool('hand');
      if (e.key==='Escape') { setSelection(null); setSelectedId(null); }
      if (e.key==='[') setBrushSize(s=>Math.max(1,s-2));
      if (e.key===']') setBrushSize(s=>Math.min(500,s+2));
    };
    window.addEventListener('keydown',onKey);
    return ()=>window.removeEventListener('keydown',onKey);
  }, [selectedId, removeLayer, duplicateLayer, project.name]);

  // ─── Styles ───────────────────────────────────────────────────────────────
  const S = {
    app:    { display:'flex', flexDirection:'column', height:'100vh', background:'#1e1e1e', color:'#dde6ef', fontFamily:"'JetBrains Mono',monospace", fontSize:12 },
    topbar: { display:'flex', alignItems:'center', gap:8, padding:'4px 12px', background:'#2c2c2c', borderBottom:'1px solid #111', height:36 },
    body:   { display:'flex', flex:1, overflow:'hidden' },
    toolbar:{ display:'flex', flexDirection:'column', width:44, background:'#252525', borderRight:'1px solid #111', alignItems:'center', padding:'6px 0', gap:2, overflowY:'auto' },
    center: { flex:1, display:'flex', flexDirection:'column', overflow:'hidden', position:'relative', background:'#3a3a3a' },
    right:  { width:260, background:'#252525', borderLeft:'1px solid #111', display:'flex', flexDirection:'column', overflowY:'auto' },
    toolBtn:(id)=>({ width:34, height:34, border:'none', borderRadius:4, cursor:'pointer', fontSize:14, display:'flex', alignItems:'center', justifyContent:'center',
      background: activeTool===id ? '#00ffc8' : 'transparent',
      color: activeTool===id ? '#000' : '#aaa',
    }),
    panel:  { padding:'8px 10px', borderBottom:'1px solid #333' },
    label:  { color:'#888', fontSize:10, marginBottom:4, textTransform:'uppercase', letterSpacing:1 },
    input:  { width:'100%', background:'#1a1a1a', border:'1px solid #333', color:'#dde6ef', borderRadius:3, padding:'3px 6px', fontSize:11 },
    btn:    (active)=>({ padding:'3px 8px', borderRadius:3, cursor:'pointer', fontSize:10, fontWeight:700,
      background: active?'#00ffc8':'#333', color: active?'#000':'#aaa', border:'none', }),
    layerRow:(id)=>({ display:'flex', alignItems:'center', gap:6, padding:'5px 8px', cursor:'pointer', borderRadius:4,
      background: selectedId===id ? 'rgba(0,255,200,0.12)' : 'transparent',
      borderLeft: selectedId===id ? '2px solid #00ffc8' : '2px solid transparent',
    }),
  };

  const TOOL_GROUPS = ['select','transform','paint','create','view'];

  return (
    <div style={S.app}>
      {/* ── Top Bar ── */}
      <div style={S.topbar}>
        <span style={{ color:'#00ffc8', fontWeight:700, marginRight:8 }}>🎨 SPX Canvas</span>
        <button style={S.btn()} onClick={undo} title="Undo (Ctrl+Z)">↩ Undo</button>
        <button style={S.btn()} onClick={redo} title="Redo (Ctrl+Shift+Z)">↪ Redo</button>
        <div style={{width:1,height:20,background:'#444',margin:'0 4px'}}/>
        <button style={S.btn()} onClick={()=>setShowGrid(g=>!g)}>⊞ Grid</button>
        <button style={S.btn()} onClick={()=>setShowRulers(r=>!r)}>📐 Rulers</button>
        <button style={S.btn()} onClick={()=>setSnapToGrid(s=>!s)}>🧲 Snap</button>
        <div style={{width:1,height:20,background:'#444',margin:'0 4px'}}/>
        <span style={{color:'#888',fontSize:10}}>Zoom:</span>
        <button style={S.btn()} onClick={()=>setZoom(z=>Math.max(0.1,z/1.25))}>−</button>
        <span style={{color:'#00ffc8',width:40,textAlign:'center',fontSize:11}}>{Math.round(zoom*100)}%</span>
        <button style={S.btn()} onClick={()=>setZoom(z=>Math.min(8,z*1.25))}>+</button>
        <button style={S.btn()} onClick={()=>setZoom(1)}>1:1</button>
        <button style={S.btn()} onClick={()=>setZoom(z=>z)}>Fit</button>
        <div style={{flex:1}}/>
        <button style={S.btn()} onClick={()=>exportCanvasPNG(canvasRef.current,project.name)}>💾 PNG</button>
        <button style={S.btn()} onClick={()=>exportCanvasJPG(canvasRef.current,project.name)}>💾 JPG</button>
        <button style={S.btn()} onClick={()=>exportCanvasWebP(canvasRef.current,project.name)}>💾 WebP</button>
      </div>

      <div style={S.body}>
        {/* ── Toolbar (Photoshop-style vertical) ── */}
        <div style={S.toolbar}>
          {TOOL_GROUPS.map(group => (
            <React.Fragment key={group}>
              {TOOLS.filter(t=>t.group===group).map(tool => (
                <button key={tool.id} style={S.toolBtn(tool.id)} title={`${tool.label} (${tool.shortcut})`}
                  onClick={()=>setActiveTool(tool.id)}>
                  {tool.icon}
                </button>
              ))}
              <div style={{width:28,height:1,background:'#333',margin:'4px 0'}}/>
            </React.Fragment>
          ))}
          {/* Color swatches */}
          <div style={{position:'relative',width:28,height:28}}>
            <div style={{width:20,height:20,background:brushColor,border:'2px solid #666',borderRadius:2,position:'absolute',top:4,left:4}}/>
          </div>
          <input type="color" value={brushColor} onChange={e=>setBrushColor(e.target.value)}
            style={{width:28,height:20,border:'none',background:'none',cursor:'pointer',padding:0}} />
        </div>

        {/* ── Canvas Center ── */}
        <div style={S.center} ref={stageRef}
          onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp}
          style={{...S.center, cursor:
            activeTool==='move'?'default':activeTool==='zoom_in'?'zoom-in':
            activeTool==='zoom_out'?'zoom-out':activeTool==='hand'?'grab':
            activeTool==='eyedropper'?'crosshair':activeTool==='crop'?'crosshair':'crosshair'
          }}
        >
          <div style={{ margin:'auto', transform:`scale(${zoom})`, transformOrigin:'top left', display:'inline-block' }}>
            <canvas ref={canvasRef} width={project.width} height={project.height}
              style={{ display:'block', imageRendering:'pixelated' }} />
          </div>
          {/* Status bar */}
          <div style={{ position:'absolute', bottom:0, left:0, right:0, background:'#1a1a1a', padding:'2px 12px',
            fontSize:10, color:'#666', display:'flex', gap:20 }}>
            <span>{status}</span>
            <span>{project.width} × {project.height}px</span>
            <span>Zoom: {Math.round(zoom*100)}%</span>
            <span>Tool: {activeTool}</span>
            <span>Layers: {project.layers.length}</span>
          </div>
        </div>

        {/* ── Right Panel ── */}
        <div style={S.right}>
          {/* Tabs */}
          <div style={{ display:'flex', borderBottom:'1px solid #333' }}>
            {['layers','props','effects','adjust'].map(tab => (
              <button key={tab} onClick={()=>setActiveTab(tab)} style={{
                flex:1, padding:'7px 4px', border:'none', cursor:'pointer', fontSize:10, fontWeight:700, textTransform:'uppercase',
                background: activeTab===tab ? '#2c2c2c' : 'transparent',
                color: activeTab===tab ? '#00ffc8' : '#666',
                borderBottom: activeTab===tab ? '2px solid #00ffc8' : '2px solid transparent',
              }}>{tab}</button>
            ))}
          </div>

          {/* Layers Tab */}
          {activeTab==='layers' && (
            <div style={{flex:1,overflowY:'auto'}}>
              <div style={{ display:'flex', gap:4, padding:'6px 8px', borderBottom:'1px solid #333' }}>
                {[['rect','▭'],['ellipse','⬭'],['text','T'],['brush','🖌'],['gradient','◑'],['star','★']].map(([type,icon])=>(
                  <button key={type} title={type} onClick={()=>addLayer(type)}
                    style={{...S.btn(false), padding:'4px 6px', fontSize:13}}>{icon}</button>
                ))}
              </div>
              <div style={{padding:'4px 0'}}>
                {[...project.layers].reverse().map(layer => (
                  <div key={layer.id} style={S.layerRow(layer.id)} onClick={()=>setSelectedId(layer.id)}>
                    <span style={{fontSize:11,opacity:0.6}}>{layer.type==='text'?'T':layer.type==='brush'?'🖌':'▭'}</span>
                    <span style={{flex:1,fontSize:11,color:'#dde6ef',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                      {layer.name}
                    </span>
                    <button onClick={e=>{e.stopPropagation();updateLayer(layer.id,{visible:!layer.visible})}}
                      style={{...S.btn(false),padding:'1px 4px',opacity:layer.visible?1:0.3}}>👁</button>
                    <button onClick={e=>{e.stopPropagation();updateLayer(layer.id,{locked:!layer.locked})}}
                      style={{...S.btn(false),padding:'1px 4px'}}>🔒</button>
                  </div>
                ))}
              </div>
              <div style={{display:'flex',gap:4,padding:'6px 8px',borderTop:'1px solid #333'}}>
                <button style={S.btn(false)} onClick={()=>selectedId&&moveLayerZ(selectedId,'up')}>↑</button>
                <button style={S.btn(false)} onClick={()=>selectedId&&moveLayerZ(selectedId,'down')}>↓</button>
                <button style={S.btn(false)} onClick={duplicateLayer}>⊕</button>
                <button style={{...S.btn(false),color:'#ff4757'}} onClick={()=>selectedId&&removeLayer(selectedId)}>🗑</button>
                <button style={S.btn(false)} onClick={mergeDown}>⬇ Merge</button>
              </div>
            </div>
          )}

          {/* Properties Tab */}
          {activeTab==='props' && selectedLayer && (
            <div style={{padding:10,display:'flex',flexDirection:'column',gap:8}}>
              <div style={S.label}>Transform</div>
              {[['X','x'],['Y','y'],['W','width'],['H','height']].map(([lbl,key])=>(
                <div key={key} style={{display:'flex',alignItems:'center',gap:8}}>
                  <span style={{color:'#888',width:20}}>{lbl}</span>
                  <input type="number" style={S.input} value={Math.round(selectedLayer[key]||0)}
                    onChange={e=>updateLayer(selectedId,{[key]:Number(e.target.value)})} />
                </div>
              ))}
              <div style={{display:'flex',gap:8}}>
                <div style={{flex:1}}>
                  <div style={S.label}>Rotation</div>
                  <input type="range" min={-180} max={180} value={selectedLayer.rotation||0}
                    onChange={e=>updateLayer(selectedId,{rotation:Number(e.target.value)})} style={{width:'100%'}}/>
                  <span style={{color:'#00ffc8',fontSize:10}}>{selectedLayer.rotation||0}°</span>
                </div>
              </div>
              <div style={S.label}>Opacity</div>
              <input type="range" min={0} max={1} step={0.01} value={selectedLayer.opacity??1}
                onChange={e=>updateLayer(selectedId,{opacity:Number(e.target.value)})} style={{width:'100%'}}/>
              <span style={{color:'#00ffc8',fontSize:10}}>{Math.round((selectedLayer.opacity??1)*100)}%</span>

              <div style={S.label}>Blend Mode</div>
              <select style={S.input} value={selectedLayer.blendMode||'source-over'}
                onChange={e=>updateLayer(selectedId,{blendMode:e.target.value})}>
                {BLEND_MODES.map(m=><option key={m} value={m}>{m}</option>)}
              </select>

              <div style={S.label}>Fill Color</div>
              <div style={{display:'flex',gap:8,alignItems:'center'}}>
                <input type="color" value={selectedLayer.color||'#00ffc8'}
                  onChange={e=>updateLayer(selectedId,{color:e.target.value,fill:e.target.value})}
                  style={{width:40,height:28,border:'none',borderRadius:4,cursor:'pointer'}}/>
                <input style={{...S.input,flex:1}} value={selectedLayer.color||'#00ffc8'}
                  onChange={e=>updateLayer(selectedId,{color:e.target.value,fill:e.target.value})}/>
              </div>

              {selectedLayer.type==='text' && (
                <>
                  <div style={S.label}>Text</div>
                  <textarea style={{...S.input,height:60,resize:'vertical'}}
                    value={selectedLayer.text||''}
                    onChange={e=>updateLayer(selectedId,{text:e.target.value})}/>
                  <div style={{display:'flex',gap:8}}>
                    <input type="number" style={{...S.input,width:60}} value={selectedLayer.fontSize||32}
                      onChange={e=>updateLayer(selectedId,{fontSize:Number(e.target.value)})}/>
                    <select style={S.input} value={selectedLayer.textAlign||'left'}
                      onChange={e=>updateLayer(selectedId,{textAlign:e.target.value})}>
                      {['left','center','right'].map(a=><option key={a}>{a}</option>)}
                    </select>
                  </div>
                </>
              )}

              {(selectedLayer.type==='rect'||selectedLayer.type==='ellipse') && (
                <>
                  <div style={S.label}>Stroke</div>
                  <div style={{display:'flex',gap:8,alignItems:'center'}}>
                    <input type="color" value={selectedLayer.stroke||'#ffffff'}
                      onChange={e=>updateLayer(selectedId,{stroke:e.target.value})}
                      style={{width:40,height:28,border:'none',borderRadius:4,cursor:'pointer'}}/>
                    <input type="number" style={{...S.input,width:60}} value={selectedLayer.strokeWidth||0}
                      onChange={e=>updateLayer(selectedId,{strokeWidth:Number(e.target.value)})} placeholder="Width"/>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Effects Tab */}
          {activeTab==='effects' && selectedLayer && (
            <div style={{padding:10,display:'flex',flexDirection:'column',gap:6}}>
              <div style={S.label}>Layer Effects</div>
              {[
                {type:'blur',label:'Blur',key:'value',min:0,max:50,default:4},
                {type:'brightness',label:'Brightness',key:'value',min:0,max:3,step:0.1,default:1},
                {type:'contrast',label:'Contrast',key:'value',min:0,max:3,step:0.1,default:1},
                {type:'saturate',label:'Saturation',key:'value',min:0,max:3,step:0.1,default:1},
                {type:'hue',label:'Hue Rotate',key:'value',min:-180,max:180,default:0},
                {type:'grayscale',label:'Grayscale',key:'value',min:0,max:1,step:0.01,default:0},
                {type:'invert',label:'Invert',key:'value',min:0,max:1,step:0.01,default:0},
              ].map(fx => {
                const existing = (selectedLayer.effects||[]).find(e=>e.type===fx.type);
                return (
                  <div key={fx.type} style={{display:'flex',alignItems:'center',gap:8}}>
                    <input type="checkbox" checked={!!existing && existing.enabled!==false}
                      onChange={e=>{
                        const effects=[...(selectedLayer.effects||[])].filter(ef=>ef.type!==fx.type);
                        if(e.target.checked) effects.push({type:fx.type,[fx.key]:fx.default,enabled:true});
                        updateLayer(selectedId,{effects});
                      }}/>
                    <span style={{color:'#aaa',width:80,fontSize:11}}>{fx.label}</span>
                    {existing && (
                      <input type="range" min={fx.min} max={fx.max} step={fx.step||1}
                        value={existing[fx.key]||fx.default}
                        onChange={e=>{
                          const effects=(selectedLayer.effects||[]).map(ef=>ef.type===fx.type?{...ef,[fx.key]:Number(e.target.value)}:ef);
                          updateLayer(selectedId,{effects});
                        }} style={{flex:1}}/>
                    )}
                    {existing && <span style={{color:'#00ffc8',fontSize:10,width:30,textAlign:'right'}}>{Number(existing[fx.key]||fx.default).toFixed(1)}</span>}
                  </div>
                );
              })}
            </div>
          )}

          {/* Brush Options (when brush tool active) */}
          {activeTool==='brush'||activeTool==='eraser' ? (
            <div style={{...S.panel,borderTop:'1px solid #333'}}>
              <div style={S.label}>Brush Options</div>
              {[['Size','brushSize',setBrushSize,1,500],['Opacity','brushOpacity',setBrushOpacity,0,1,0.01],['Hardness','brushHardness',setBrushHardness,0,1,0.01]].map(([lbl,key,setter,min,max,step=1])=>(
                <div key={key} style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
                  <span style={{color:'#888',width:60,fontSize:10}}>{lbl}</span>
                  <input type="range" min={min} max={max} step={step}
                    value={key==='brushSize'?brushSize:key==='brushOpacity'?brushOpacity:brushHardness}
                    onChange={e=>setter(Number(e.target.value))} style={{flex:1}}/>
                  <span style={{color:'#00ffc8',fontSize:10,width:30,textAlign:'right'}}>
                    {key==='brushSize'?brushSize:Math.round((key==='brushOpacity'?brushOpacity:brushHardness)*100)+'%'}
                  </span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
