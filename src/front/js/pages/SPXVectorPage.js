// src/front/js/pages/SPXVectorPage.js
// SPX Vector — Illustrator-rival vector editor with full bezier pen tool

import { saveToCloud, listCloudProjects, loadFromCloud, deleteCloudProject } from "../utils/cloudSave";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { anchorsToBezierPath, createAnchor, moveAnchor, updateInHandle, updateOutHandle } from "../utils/spxvector/bezierMath";
import { booleanUnion, booleanSubtract, booleanIntersect, booleanExclude } from "../utils/spxvector/booleanOps";
import { exportFullSVG } from "../utils/spxvector/svgExport";
import "../../styles/SPXVector.css";

const uid = () => `${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
const clamp = (n,a,b) => Math.max(a,Math.min(b,n));

// ─── Tool Definitions ─────────────────────────────────────────────────────────
const TOOLS = [
  { id:'select',    icon:'↖',  label:'Selection Tool',    shortcut:'V', group:'select' },
  { id:'direct',    icon:'↗',  label:'Direct Selection',  shortcut:'A', group:'select' },
  { id:'pen',       icon:'✒',  label:'Pen Tool',          shortcut:'P', group:'pen' },
  { id:'add_point', icon:'✒+', label:'Add Anchor Point',  shortcut:'+', group:'pen' },
  { id:'del_point', icon:'✒−', label:'Del Anchor Point',  shortcut:'−', group:'pen' },
  { id:'curvature', icon:'∿',  label:'Curvature Tool',    shortcut:'~', group:'pen' },
  { id:'type',      icon:'T',  label:'Type Tool',         shortcut:'T', group:'type' },
  { id:'rect',      icon:'▭',  label:'Rectangle Tool',    shortcut:'M', group:'shape' },
  { id:'ellipse',   icon:'⬭',  label:'Ellipse Tool',      shortcut:'L', group:'shape' },
  { id:'polygon',   icon:'⬡',  label:'Polygon Tool',      shortcut:'',  group:'shape' },
  { id:'star',      icon:'★',  label:'Star Tool',         shortcut:'',  group:'shape' },
  { id:'line',      icon:'╱',  label:'Line Segment',      shortcut:'\\',group:'shape' },
  { id:'spiral',    icon:'@',  label:'Spiral Tool',       shortcut:'',  group:'shape' },
  { id:'brush',     icon:'🖌', label:'Paintbrush',        shortcut:'B', group:'paint' },
  { id:'blob',      icon:'◉',  label:'Blob Brush',        shortcut:'',  group:'paint' },
  { id:'eraser',    icon:'◻',  label:'Eraser Tool',       shortcut:'E', group:'paint' },
  { id:'rotate',    icon:'↺',  label:'Rotate Tool',       shortcut:'R', group:'transform' },
  { id:'scale',     icon:'⤢',  label:'Scale Tool',        shortcut:'S', group:'transform' },
  { id:'shear',     icon:'⬡',  label:'Shear Tool',        shortcut:'',  group:'transform' },
  { id:'gradient',  icon:'◑',  label:'Gradient Tool',     shortcut:'G', group:'fill' },
  { id:'eyedropper',icon:'💉', label:'Eyedropper',        shortcut:'I', group:'fill' },
  { id:'zoom',      icon:'🔍', label:'Zoom Tool',         shortcut:'Z', group:'view' },
  { id:'hand',      icon:'✋', label:'Hand Tool',         shortcut:'H', group:'view' },
];

const BLEND_MODES = ['normal','multiply','screen','overlay','darken','lighten','color-dodge','color-burn','difference','exclusion'];

const STROKE_CAPS   = ['butt','round','square'];
const STROKE_JOINS  = ['miter','round','bevel'];
const DASH_PRESETS  = [ [], [8,4], [2,4], [8,4,2,4], [16,4] ];

const DEFAULT_PROJECT = {
  name:'Untitled Vector', width:1920, height:1080, background:'#ffffff',
  layers:[], version:'1.0',
};

const DEFAULT_LAYER = (type,extras={}) => ({
  id:uid(), type, name:type.charAt(0).toUpperCase()+type.slice(1),
  visible:true, locked:false, opacity:1, blendMode:'normal',
  x:100, y:100, width:200, height:150,
  fill:'#000000', stroke:'none', strokeWidth:1,
  strokeCap:'butt', strokeJoin:'miter', dashArray:[],
  rotation:0, scaleX:1, scaleY:1,
  anchors:[], closed:false,
  effects:[],
  ...extras,
});

function SVXMenuDropdown({label,items}){
  const [open,setOpen]=React.useState(false);
  return(
    <div className="spx-menu-item" onMouseLeave={()=>setOpen(false)}>
      <button className="spx-menu-btn" onMouseEnter={()=>setOpen(true)} onClick={()=>setOpen(o=>!o)}>{label}</button>
      {open&&(<div className="spx-menu-dropdown">{items.map(i=>(<button key={i.label} className="spx-menu-dropdown-item" onClick={()=>{i.action();setOpen(false);}}>{i.label}</button>))}</div>)}
    </div>
  );
}

export default function SPXVectorPage() {
  const svgRef = useRef(null);

  const [project,      setProject]      = useState(DEFAULT_PROJECT);
  const [activeTool,   setActiveTool]   = useState('select');
  const [selectedIds,  setSelectedIds]  = useState([]);
  const [selectedPt,   setSelectedPt]   = useState(null); // {layerId, ptIdx, handleType}
  const [penPath,      setPenPath]      = useState(null); // pending pen anchors
  const [zoom,         setZoom]         = useState(1);
  const [pan,          setPan]          = useState({x:0,y:0});
  const [history,      setHistory]      = useState([]);
  const [future,       setFuture]       = useState([]);
  const [status,       setStatus]       = useState('Ready');
  const [activeTab,    setActiveTab]    = useState('layers');
  const [fillColor,    setFillColor]    = useState('#000000');
  const [strokeColor,  setStrokeColor]  = useState('none');
  const [strokeWidth,  setStrokeWidth]  = useState(1);
  const [showGrid,     setShowGrid]     = useState(false);
  const [snapToGrid,   setSnapToGrid]   = useState(false);
  const [gridSize,     setGridSize]     = useState(20);
  const [showHandles,  setShowHandles]  = useState(true);
  const [dragState,    setDragState]    = useState(null);
  const [showTracePanel, setShowTracePanel] = useState(false);
  const [traceThreshold, setTraceThreshold] = useState(128);
  const [traceMode,      setTraceMode]      = useState('bw'); // bw, color, gray
  const [tracing,        setTracing]        = useState(false);
  const [showPatterns,   setShowPatterns]   = useState(false);
  const [showSymbols,    setShowSymbols]    = useState(false);
  const [symbols,        setSymbols]        = useState([]);
  const [artboards,      setArtboards]      = useState([{id:'ab1',name:'Artboard 1',x:0,y:0,width:1920,height:1080}]);
  const [activeArtboard, setActiveArtboard] = useState('ab1');
  const traceInputRef = useRef(null);

  const selectedId = selectedIds[0] || null;
  const selectedLayer = useMemo(()=>project.layers.find(l=>l.id===selectedId)||null,[project.layers,selectedId]);

  // ─── History ──────────────────────────────────────────────────────────────
  const snapshot = useCallback(()=>{
    setHistory(h=>[...h.slice(-49),JSON.stringify(project)]);
    setFuture([]);
  },[project]);

  const undo = ()=>{ if(!history.length)return; setFuture(f=>[JSON.stringify(project),...f.slice(0,49)]); setProject(JSON.parse(history[history.length-1])); setHistory(h=>h.slice(0,-1)); };
  const redo = ()=>{ if(!future.length)return; setHistory(h=>[...h.slice(-49),JSON.stringify(project)]); setProject(JSON.parse(future[0])); setFuture(f=>f.slice(1)); };

  // ─── Layer Ops ────────────────────────────────────────────────────────────
  const addLayer = useCallback((type,extras={})=>{
    snapshot();
    const l = DEFAULT_LAYER(type,{fill:fillColor,stroke:strokeColor,strokeWidth,...extras});
    setProject(p=>({...p,layers:[...p.layers,l]}));
    setSelectedIds([l.id]);
    setStatus(`Added ${type}`);
    return l.id;
  },[snapshot,fillColor,strokeColor,strokeWidth]);

  const updateLayer = useCallback((id,patch)=>{
    setProject(p=>({...p,layers:p.layers.map(l=>l.id===id?{...l,...patch}:l)}));
  },[]);

  const removeLayer = useCallback((id)=>{
    snapshot();
    setProject(p=>({...p,layers:p.layers.filter(l=>l.id!==id)}));
    setSelectedIds(ids=>ids.filter(i=>i!==id));
  },[snapshot]);

  const duplicateLayer = useCallback(()=>{
    if(!selectedLayer)return;
    snapshot();
    const c={...JSON.parse(JSON.stringify(selectedLayer)),id:uid(),name:selectedLayer.name+' Copy',x:(selectedLayer.x||0)+20,y:(selectedLayer.y||0)+20};
    setProject(p=>({...p,layers:[...p.layers,c]}));
    setSelectedIds([c.id]);
  },[selectedLayer,snapshot]);

  const moveLayerZ = useCallback((id,dir)=>{
    setProject(p=>{
      const arr=[...p.layers],idx=arr.findIndex(l=>l.id===id);
      const swap=dir==='up'?idx+1:idx-1;
      if(swap<0||swap>=arr.length)return p;
      [arr[idx],arr[swap]]=[arr[swap],arr[idx]];
      return{...p,layers:arr};
    });
  },[]);

  const groupSelected = ()=>{
    if(selectedIds.length<2)return;
    snapshot();
    const group = DEFAULT_LAYER('group',{name:'Group',children:selectedIds});
    const remaining = project.layers.filter(l=>!selectedIds.includes(l.id));
    setProject(p=>({...p,layers:[...remaining,group]}));
    setSelectedIds([group.id]);
  };

  // ─── Boolean Ops ──────────────────────────────────────────────────────────
  const applyBoolean = useCallback((op)=>{
    if(selectedIds.length<2)return;
    const [a,b] = selectedIds.map(id=>project.layers.find(l=>l.id===id)).filter(Boolean);
    if(!a||!b)return;
    snapshot();
    let result;
    if(op==='union')    result=booleanUnion(a,b);
    if(op==='subtract') result=booleanSubtract(a,b);
    if(op==='intersect')result=booleanIntersect(a,b);
    if(op==='exclude')  result=booleanExclude(a,b);
    if(!result)return;
    const layers=project.layers.filter(l=>!selectedIds.includes(l.id));
    setProject(p=>({...p,layers:[...layers,result]}));
    setSelectedIds([result.id]);
    setStatus(`Boolean ${op}`);
  },[selectedIds,project.layers,snapshot]);

  // ─── Align & Distribute ───────────────────────────────────────────────────
  const alignLayers = useCallback((align)=>{
    if(selectedIds.length<2)return;
    snapshot();
    const sel=project.layers.filter(l=>selectedIds.includes(l.id));
    const xs=sel.map(l=>l.x||0), ys=sel.map(l=>l.y||0);
    const x2s=sel.map(l=>(l.x||0)+(l.width||0)), y2s=sel.map(l=>(l.y||0)+(l.height||0));
    setProject(p=>({...p,layers:p.layers.map(l=>{
      if(!selectedIds.includes(l.id))return l;
      if(align==='left')    return{...l,x:Math.min(...xs)};
      if(align==='right')   return{...l,x:Math.max(...x2s)-(l.width||0)};
      if(align==='top')     return{...l,y:Math.min(...ys)};
      if(align==='bottom')  return{...l,y:Math.max(...y2s)-(l.height||0)};
      if(align==='centerH') return{...l,x:(Math.min(...xs)+Math.max(...x2s))/2-(l.width||0)/2};
      if(align==='centerV') return{...l,y:(Math.min(...ys)+Math.max(...y2s))/2-(l.height||0)/2};
      return l;
    })}));
  },[selectedIds,project.layers,snapshot]);

  // ─── Auto Trace (Bitmap → Vector) ──────────────────────────────────────────
  const handleTraceImage = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setTracing(true);
    setStatus('Tracing image...');
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx2 = canvas.getContext('2d');
        ctx2.drawImage(img, 0, 0);
        const imageData = ctx2.getImageData(0, 0, img.width, img.height);
        const data = imageData.data;
        // Convert to grayscale bitmap for tracing
        const bmp = [];
        for (let y = 0; y < img.height; y++) {
          bmp.push([]);
          for (let x = 0; x < img.width; x++) {
            const i = (y * img.width + x) * 4;
            const gray = 0.299 * data[i] + 0.587 * data[i+1] + 0.114 * data[i+2];
            bmp[y].push(gray < traceThreshold ? 1 : 0);
          }
        }
        // Simple contour tracing — march squares algorithm
        const paths = traceContours(bmp, img.width, img.height);
        snapshot();
        const scaleX = project.width / img.width;
        const scaleY = project.height / img.height;
        paths.forEach((anchors, i) => {
          const scaled = anchors.map(a => ({
            ...a,
            x: a.x * scaleX, y: a.y * scaleY,
            inX: a.inX * scaleX, inY: a.inY * scaleY,
            outX: a.outX * scaleX, outY: a.outY * scaleY,
          }));
          const layer = DEFAULT_LAYER('path', {
            anchors: scaled, closed: true,
            name: `Trace ${i+1}`,
            fill: traceMode === 'bw' ? '#000000' : fillColor,
            stroke: 'none',
          });
          setProject(p => ({...p, layers: [...p.layers, layer]}));
        });
        setTracing(false);
        setShowTracePanel(false);
        setStatus(`Traced ${paths.length} paths from image`);
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  }, [traceThreshold, traceMode, snapshot, project.width, project.height, fillColor]);

  // March squares contour tracer
  function traceContours(bmp, w, h) {
    const visited = Array.from({length: h}, () => new Uint8Array(w));
    const paths = [];
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        if (bmp[y][x] === 1 && !visited[y][x]) {
          const path = [];
          let cx = x, cy = y;
          let dir = 0; // 0=right,1=down,2=left,3=up
          let steps = 0;
          do {
            visited[cy][cx] = 1;
            path.push({x: cx, y: cy, inX: cx-2, inY: cy, outX: cx+2, outY: cy});
            const nx = [1,-1,0,0][dir]+cx, ny = [0,0,1,-1][dir]+cy;
            if (nx>=0&&nx<w&&ny>=0&&ny<h&&bmp[ny][nx]===1&&!visited[ny][nx]) { cx=nx; cy=ny; }
            else dir=(dir+1)%4;
            steps++;
          } while ((cx!==x||cy!==y) && steps < 2000);
          if (path.length >= 4) paths.push(path);
        }
      }
    }
    return paths.slice(0, 50); // max 50 paths
  }

  // ─── Pattern Fills ────────────────────────────────────────────────────────
  const PATTERN_PRESETS = [
    { id:'dots',    name:'Dots',    svg:'<circle cx="4" cy="4" r="2" fill="currentColor"/>' },
    { id:'lines',   name:'Lines',   svg:'<line x1="0" y1="4" x2="8" y2="4" stroke="currentColor" strokeWidth="1"/>' },
    { id:'grid',    name:'Grid',    svg:'<path d="M8 0V8M0 8H8" stroke="currentColor" strokeWidth="0.5" fill="none"/>' },
    { id:'checker', name:'Checker', svg:'<rect width="4" height="4" fill="currentColor"/><rect x="4" y="4" width="4" height="4" fill="currentColor"/>' },
    { id:'diagonal',name:'Diagonal',svg:'<line x1="0" y1="8" x2="8" y2="0" stroke="currentColor" strokeWidth="1"/>' },
    { id:'cross',   name:'Cross',   svg:'<path d="M4 0V8M0 4H8" stroke="currentColor" strokeWidth="1"/>' },
  ];

  const applyPattern = useCallback((patternId) => {
    if (!selectedId) return;
    updateLayer(selectedId, { fill: { type: 'pattern', patternId, color: fillColor } });
    setStatus(`Applied pattern: ${patternId}`);
  }, [selectedId, fillColor, updateLayer]);

  // ─── Symbols ─────────────────────────────────────────────────────────────
  const defineSymbol = useCallback(() => {
    if (!selectedLayer) return;
    snapshot();
    const sym = { id: uid(), name: selectedLayer.name + ' Symbol', layer: JSON.parse(JSON.stringify(selectedLayer)) };
    setSymbols(prev => [...prev, sym]);
    setStatus(`Symbol defined: ${sym.name}`);
  }, [selectedLayer, snapshot]);

  const placeSymbol = useCallback((sym) => {
    snapshot();
    const instance = { ...JSON.parse(JSON.stringify(sym.layer)), id: uid(), name: sym.name + ' Instance', x: 200, y: 200, symbolId: sym.id };
    setProject(p => ({...p, layers: [...p.layers, instance]}));
    setSelectedIds([instance.id]);
    setStatus(`Placed symbol: ${sym.name}`);
  }, [snapshot]);

  // ─── Artboards ────────────────────────────────────────────────────────────
  const addArtboard = useCallback(() => {
    const ab = { id: uid(), name: `Artboard ${artboards.length + 1}`, x: artboards.length * (project.width + 100), y: 0, width: project.width, height: project.height };
    setArtboards(prev => [...prev, ab]);
    setActiveArtboard(ab.id);
    setStatus(`Added ${ab.name}`);
  }, [artboards, project.width, project.height]);

  // ─── SVG Point Helpers ────────────────────────────────────────────────────
  const getSVGPoint = useCallback((e)=>{
    const svg=svgRef.current; if(!svg)return{x:0,y:0};
    const pt=svg.createSVGPoint();
    pt.x=e.clientX; pt.y=e.clientY;
    const m=svg.getScreenCTM()?.inverse();
    if(!m)return{x:0,y:0};
    const transformed=pt.matrixTransform(m);
    return{x:transformed.x/zoom,y:transformed.y/zoom};
  },[zoom]);

  // ─── Mouse Handlers ───────────────────────────────────────────────────────
  const onSVGMouseDown = useCallback((e)=>{
    const pt=getSVGPoint(e);
    const snapped=snapToGrid?{x:Math.round(pt.x/gridSize)*gridSize,y:Math.round(pt.y/gridSize)*gridSize}:pt;

    if(activeTool==='pen') {
      if(!penPath) {
        setPenPath([createAnchor(snapped.x,snapped.y,0)]);
      } else {
        setPenPath(prev=>[...prev,createAnchor(snapped.x,snapped.y,0)]);
      }
      setStatus(`Pen: ${(penPath?.length||0)+1} points`);
    }

    if(activeTool==='rect')    addLayer('rect',   {x:snapped.x,y:snapped.y,width:100,height:80});
    if(activeTool==='ellipse') addLayer('ellipse',{x:snapped.x,y:snapped.y,width:100,height:80});
    if(activeTool==='polygon') addLayer('polygon',{x:snapped.x,y:snapped.y,width:100,height:100,sides:6});
    if(activeTool==='star')    addLayer('star',   {x:snapped.x,y:snapped.y,width:100,height:100,points:5});
    if(activeTool==='line')    addLayer('line',   {x:snapped.x,y:snapped.y,width:150,height:0,anchors:[{x:snapped.x,y:snapped.y},{x:snapped.x+150,y:snapped.y}]});
    if(activeTool==='type')    addLayer('text',   {x:snapped.x,y:snapped.y,text:'Click to edit',fontSize:24,fill:fillColor});

    if(activeTool==='select') {
      setDragState({kind:'marquee',startX:pt.x,startY:pt.y});
    }

    if(activeTool==='zoom') setZoom(z=>e.altKey?Math.max(0.1,z/1.25):Math.min(16,z*1.25));
  },[activeTool,penPath,getSVGPoint,addLayer,snapToGrid,gridSize,fillColor]);

  const onSVGMouseMove = useCallback((e)=>{
    if(!dragState)return;
    const pt=getSVGPoint(e);
    if(dragState.kind==='move'&&selectedLayer) {
      updateLayer(selectedId,{x:dragState.ox+(pt.x-dragState.startX),y:dragState.oy+(pt.y-dragState.startY)});
    }
    if(dragState.kind==='resize'&&selectedLayer) {
      updateLayer(selectedId,{
        width:Math.max(4,dragState.ow+(pt.x-dragState.startX)),
        height:Math.max(4,dragState.oh+(pt.y-dragState.startY)),
      });
    }
    if(dragState.kind==='handle'&&selectedLayer) {
      const {ptIdx,handleType}=dragState;
      const anchors=[...(selectedLayer.anchors||[])];
      if(handleType==='anchor') {
        const dx=pt.x-anchors[ptIdx].x, dy=pt.y-anchors[ptIdx].y;
        anchors[ptIdx]=moveAnchor(anchors[ptIdx],dx,dy);
      } else if(handleType==='in') {
        anchors[ptIdx]=updateInHandle(anchors[ptIdx],pt.x,pt.y);
      } else if(handleType==='out') {
        anchors[ptIdx]=updateOutHandle(anchors[ptIdx],pt.x,pt.y);
      }
      updateLayer(selectedId,{anchors});
    }
  },[dragState,getSVGPoint,selectedLayer,selectedId,updateLayer]);

  const onSVGMouseUp = useCallback(()=>{
    setDragState(null);
  },[]);

  // ─── Commit Pen Path ─────────────────────────────────────────────────────
  const commitPen = useCallback((closed=false)=>{
    if(!penPath||penPath.length<2)return;
    const id=addLayer('path',{anchors:penPath,closed,name:'Path'});
    setPenPath(null);
    setSelectedIds([id]);
    setStatus('Path committed');
  },[penPath,addLayer]);

  // ─── Keyboard ────────────────────────────────────────────────────────────
  useEffect(()=>{
    const onKey=(e)=>{
      if(e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA')return;
      if(e.ctrlKey||e.metaKey){
        if(e.key==='z'){e.preventDefault();e.shiftKey?redo():undo();}
        if(e.key==='d'){e.preventDefault();duplicateLayer();}
        if(e.key==='g'){e.preventDefault();groupSelected();}
        if(e.key==='='){e.preventDefault();setZoom(z=>Math.min(16,z*1.25));}
        if(e.key==='-'){e.preventDefault();setZoom(z=>Math.max(0.05,z/1.25));}
        if(e.key==='0'){e.preventDefault();setZoom(1);}
        if(e.key==='s'){e.preventDefault();exportFullSVG(project,project.name);}
        if(e.key==='a'){e.preventDefault();setSelectedIds(project.layers.map(l=>l.id));}
      }
      if(e.key==='Delete'||e.key==='Backspace'){if(selectedId&&!penPath)removeLayer(selectedId);}
      if(e.key==='Escape'){if(penPath){commitPen(false);}else{setSelectedIds([]);}}
      if(e.key==='Enter'&&penPath)commitPen(true);
      if(!e.ctrlKey&&!e.metaKey){
        const map={v:'select',a:'direct',p:'pen',t:'type',m:'rect',l:'ellipse',b:'brush',e:'eraser',r:'rotate',s:'scale',g:'gradient',i:'eyedropper',z:'zoom',h:'hand'};
        if(map[e.key.toLowerCase()])setActiveTool(map[e.key.toLowerCase()]);
      }
      if(e.key==='[')setStrokeWidth(w=>Math.max(0.5,w-0.5));
      if(e.key===']')setStrokeWidth(w=>w+0.5);
    };
    window.addEventListener('keydown',onKey);
    return()=>window.removeEventListener('keydown',onKey);
  },[selectedId,penPath,commitPen,removeLayer,duplicateLayer,project,undo,redo]);

  // ─── Styles ───────────────────────────────────────────────────────────────
  const S={
    app:{display:'flex',flexDirection:'column',height:'100vh',background:'#1e1e1e',color:'#dde6ef',fontFamily:"'JetBrains Mono',monospace",fontSize:12},
    topbar:{display:'flex',alignItems:'center',gap:6,padding:'4px 12px',background:'#2c2c2c',borderBottom:'1px solid #111',height:36,flexWrap:'wrap'},
    body:{display:'flex',flex:1,overflow:'hidden'},
    toolbar:{display:'flex',flexDirection:'column',width:44,background:'#252525',borderRight:'1px solid #111',alignItems:'center',padding:'6px 0',gap:2,overflowY:'auto'},
    center:{flex:1,display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden',background:'#3a3a3a',position:'relative'},
    right:{width:260,background:'#252525',borderLeft:'1px solid #111',display:'flex',flexDirection:'column',overflowY:'auto'},
    toolBtn:(id)=>({width:34,height:34,border:'none',borderRadius:4,cursor:'pointer',fontSize:13,display:'flex',alignItems:'center',justifyContent:'center',
      background:activeTool===id?'#ff6600':'transparent',
      color:activeTool===id?'#fff':'#aaa',
    }),
    btn:(active)=>({padding:'3px 8px',borderRadius:3,cursor:'pointer',fontSize:10,fontWeight:700,
      background:active?'#ff6600':'#333',color:active?'#fff':'#aaa',border:'none',
    }),
    input:{width:'100%',background:'#1a1a1a',border:'1px solid #333',color:'#dde6ef',borderRadius:3,padding:'3px 6px',fontSize:11},
    label:{color:'#888',fontSize:10,marginBottom:4,textTransform:'uppercase',letterSpacing:1},
    panel:{padding:'8px 10px',borderBottom:'1px solid #333'},
    layerRow:(id)=>({display:'flex',alignItems:'center',gap:6,padding:'5px 8px',cursor:'pointer',borderRadius:4,
      background:selectedId===id?'rgba(255,102,0,0.12)':'transparent',
      borderLeft:selectedId===id?'2px solid #ff6600':'2px solid transparent',
    }),
  };

  // ─── SVG Layer Rendering ──────────────────────────────────────────────────
  function renderSVGLayer(layer) {
    let fill = layer.fill || 'none';
    if (fill && typeof fill === 'object' && fill.type === 'pattern') {
      fill = `url(#pat_${fill.patternId})`;
    } else if (fill && typeof fill === 'object' && fill.type === 'linear') {
      fill = `url(#grad_${layer.id})`;
    }
    const stroke=layer.stroke||'none';
    const sw=layer.strokeWidth||1;
    const opacity=layer.opacity??1;
    const transform=`rotate(${layer.rotation||0} ${(layer.x||0)+(layer.width||0)/2} ${(layer.y||0)+(layer.height||0)/2})`;
    const isSelected=selectedIds.includes(layer.id);
    const common={fill,stroke:stroke==='none'?'none':stroke,strokeWidth:sw,opacity,
      style:{cursor:activeTool==='select'?'move':'default'},
      onMouseDown:(e)=>{
        e.stopPropagation();
        if(activeTool==='select'||activeTool==='direct'){
          setSelectedIds(e.shiftKey?[...selectedIds,layer.id]:[layer.id]);
          const pt=getSVGPoint(e);
          setDragState({kind:'move',startX:pt.x,startY:pt.y,ox:layer.x||0,oy:layer.y||0});
        }
      }
    };

    let el=null;
    if(layer.type==='rect')    el=<rect key={layer.id} x={layer.x} y={layer.y} width={layer.width} height={layer.height} rx={layer.borderRadius||0} {...common} transform={transform}/>;
    else if(layer.type==='ellipse') el=<ellipse key={layer.id} cx={(layer.x||0)+(layer.width||100)/2} cy={(layer.y||0)+(layer.height||100)/2} rx={(layer.width||100)/2} ry={(layer.height||100)/2} {...common} transform={transform}/>;
    else if(layer.type==='path'&&layer.anchors?.length) {
      const d=anchorsToBezierPath(layer.anchors,layer.closed);
      el=<path key={layer.id} d={d} {...common} transform={transform}/>;
    } else if(layer.type==='text') {
      const lines=String(layer.text||'').split('\n');
      el=<text key={layer.id} x={layer.x} y={(layer.y||0)+(layer.fontSize||24)} fontSize={layer.fontSize||24} fontWeight={layer.fontWeight||400} fill={fill} opacity={opacity} transform={transform}>
        {lines.map((l,i)=><tspan key={i} x={layer.x} dy={i===0?0:(layer.fontSize||24)*1.4}>{l}</tspan>)}
      </text>;
    } else if(layer.type==='polygon') {
      const cx=(layer.x||0)+(layer.width||100)/2, cy=(layer.y||0)+(layer.height||100)/2, r=Math.min(layer.width||100,layer.height||100)/2;
      const sides=layer.sides||6;
      const pts=Array.from({length:sides},(_,i)=>{
        const a=(i*2*Math.PI/sides)-Math.PI/2;
        return `${cx+r*Math.cos(a)},${cy+r*Math.sin(a)}`;
      }).join(' ');
      el=<polygon key={layer.id} points={pts} {...common} transform={transform}/>;
    } else if(layer.type==='star') {
      const cx=(layer.x||0)+(layer.width||100)/2, cy=(layer.y||0)+(layer.height||100)/2;
      const outer=Math.min(layer.width||100,layer.height||100)/2, inner=outer*0.4;
      const pts2=Array.from({length:(layer.points||5)*2},(_,i)=>{
        const a=(i*Math.PI/(layer.points||5))-Math.PI/2;
        const r2=i%2===0?outer:inner;
        return `${cx+r2*Math.cos(a)},${cy+r2*Math.sin(a)}`;
      }).join(' ');
      el=<polygon key={layer.id} points={pts2} {...common} transform={transform}/>;
    }

    if(!el)return null;

    return (
      <g key={layer.id}>
        {el}
        {/* Selection outline */}
        {isSelected&&layer.type!=='path'&&<rect x={(layer.x||0)-2} y={(layer.y||0)-2} width={(layer.width||100)+4} height={(layer.height||100)+4}
          fill="none" stroke="#ff6600" strokeWidth={1} strokeDasharray="4 3" pointerEvents="none"/>}
        {/* Resize handle */}
        {isSelected&&activeTool==='select'&&<rect
          x={(layer.x||0)+(layer.width||100)-6} y={(layer.y||0)+(layer.height||100)-6}
          width={10} height={10} fill="#fff" stroke="#ff6600" strokeWidth={1}
          style={{cursor:'se-resize'}}
          onMouseDown={e=>{e.stopPropagation();const pt=getSVGPoint(e);setDragState({kind:'resize',startX:pt.x,startY:pt.y,ow:layer.width||100,oh:layer.height||100});}}
        />}
        {/* Bezier handles for path layers */}
        {isSelected&&(activeTool==='direct'||activeTool==='pen')&&layer.anchors?.map((anchor,i)=>(
          <g key={i}>
            {showHandles&&<>
              <line x1={anchor.inX} y1={anchor.inY} x2={anchor.x} y2={anchor.y} stroke="#888" strokeWidth={0.75} pointerEvents="none"/>
              <line x1={anchor.x} y1={anchor.y} x2={anchor.outX} y2={anchor.outY} stroke="#888" strokeWidth={0.75} pointerEvents="none"/>
              <circle cx={anchor.inX} cy={anchor.inY} r={4} fill="#fff" stroke="#ff6600" strokeWidth={1}
                style={{cursor:'move'}}
                onMouseDown={e=>{e.stopPropagation();setDragState({kind:'handle',ptIdx:i,handleType:'in'});}}/>
              <circle cx={anchor.outX} cy={anchor.outY} r={4} fill="#fff" stroke="#ff6600" strokeWidth={1}
                style={{cursor:'move'}}
                onMouseDown={e=>{e.stopPropagation();setDragState({kind:'handle',ptIdx:i,handleType:'out'});}}/>
            </>}
            <rect x={anchor.x-5} y={anchor.y-5} width={10} height={10}
              fill={i===0?'#ff6600':'#fff'} stroke="#ff6600" strokeWidth={1}
              style={{cursor:'move'}}
              onMouseDown={e=>{e.stopPropagation();setDragState({kind:'handle',ptIdx:i,handleType:'anchor'});}}/>
          </g>
        ))}
      </g>
    );
  }

  return (
    <div style={S.app}>
      {/* ── Top Bar ── */}
      <div style={S.topbar}>
        <span style={{color:'#ff6600',fontWeight:700,marginRight:8}}>✒ SPX Vector</span>
        <button style={S.btn()} onClick={undo}>↩</button>
        <button style={S.btn()} onClick={redo}>↪</button>
        <div style={{width:1,height:20,background:'#444',margin:'0 4px'}}/>
        {/* Boolean ops */}
        <span style={{color:'#888',fontSize:10}}>Boolean:</span>
        {['union','subtract','intersect','exclude'].map(op=>(
          <button key={op} style={S.btn()} onClick={()=>applyBoolean(op)} title={op}
            disabled={selectedIds.length<2}>{op==='union'?'⊕':op==='subtract'?'⊖':op==='intersect'?'⊗':'⊙'}</button>
        ))}
        <div style={{width:1,height:20,background:'#444',margin:'0 4px'}}/>
        {/* Align */}
        <span style={{color:'#888',fontSize:10}}>Align:</span>
        {[['left','⫷'],['centerH','⊟'],['right','⫸'],['top','⫸'],['centerV','⊠'],['bottom','⫸']].map(([a,icon])=>(
          <button key={a} style={S.btn()} onClick={()=>alignLayers(a)} title={a}>{icon}</button>
        ))}
        <div style={{width:1,height:20,background:'#444',margin:'0 4px'}}/>
        {/* Pen controls */}
        {activeTool==='pen'&&penPath&&(
          <>
            <span style={{color:'#ff6600',fontSize:10}}>Pen: {penPath.length} pts</span>
            <button style={{...S.btn(true)}} onClick={()=>commitPen(false)}>Open Path</button>
            <button style={{...S.btn(true)}} onClick={()=>commitPen(true)}>Close Path (Enter)</button>
            <button style={S.btn()} onClick={()=>setPenPath(null)}>Cancel (Esc)</button>
          </>
        )}
        <div style={{flex:1}}/>
        <button style={S.btn(showTracePanel)} onClick={()=>setShowTracePanel(v=>!v)} title="Image Trace — convert bitmap to vector">🔍 Trace</button>
        <button style={S.btn(showSymbols)} onClick={()=>setShowSymbols(v=>!v)} title="Symbols library">⊛ Symbols</button>
        <button style={S.btn(showPatterns)} onClick={()=>setShowPatterns(v=>!v)} title="Pattern fills">⊞ Patterns</button>
        <button style={S.btn()} onClick={addArtboard} title="Add artboard">＋ Board</button>
        <div style={{width:1,height:20,background:'#444',margin:'0 4px'}}/>
        <button style={S.btn()} onClick={()=>exportFullSVG(project,project.name)}>💾 SVG</button>
        <button style={S.btn()} onClick={()=>{ const s=JSON.stringify(project); const b=new Blob([s],{type:'application/json'}); const u=URL.createObjectURL(b); const a=document.createElement('a');a.href=u;a.download=project.name+'.spxv';a.click(); }}>💾 .spxv</button>
        <span style={{color:'#888',fontSize:10}}>Zoom:</span>
        <button style={S.btn()} onClick={()=>setZoom(z=>Math.max(0.05,z/1.25))}>−</button>
        <span style={{color:'#ff6600',width:40,textAlign:'center'}}>{Math.round(zoom*100)}%</span>
        <button style={S.btn()} onClick={()=>setZoom(z=>Math.min(16,z*1.25))}>+</button>
      </div>

      {/* ── Image Trace Panel ── */}
      {showTracePanel && (
        <div style={{display:'flex',alignItems:'center',gap:12,padding:'6px 16px',background:'#1a1a2e',borderBottom:'1px solid #333',flexWrap:'wrap'}}>
          <span style={{color:'#00ffc8',fontWeight:700,fontSize:11}}>IMAGE TRACE</span>
          <select value={traceMode} onChange={e=>setTraceMode(e.target.value)}
            style={{background:'#333',color:'#dde6ef',border:'1px solid #444',borderRadius:3,padding:'2px 6px',fontSize:11}}>
            <option value="bw">Black & White</option>
            <option value="color">Color</option>
            <option value="gray">Grayscale</option>
          </select>
          <label style={{fontSize:11,color:'#888',display:'flex',alignItems:'center',gap:6}}>
            Threshold
            <input type="range" min={0} max={255} value={traceThreshold} onChange={e=>setTraceThreshold(Number(e.target.value))} style={{width:80,accentColor:'#00ffc8'}}/>
            <span style={{color:'#00ffc8',minWidth:28}}>{traceThreshold}</span>
          </label>
          <button style={{...S.btn(true),background:'#00ffc8',color:'#000'}}
            onClick={()=>traceInputRef.current?.click()} disabled={tracing}>
            {tracing ? '⏳ Tracing...' : '🔍 Choose Image'}
          </button>
          <input ref={traceInputRef} type="file" accept="image/*" style={{display:'none'}} onChange={handleTraceImage}/>
          <button style={S.btn()} onClick={()=>setShowTracePanel(false)}>✕</button>
        </div>
      )}

      {/* ── Symbols Panel ── */}
      {showSymbols && (
        <div style={{display:'flex',alignItems:'center',gap:8,padding:'6px 16px',background:'#1a1a2e',borderBottom:'1px solid #333',flexWrap:'wrap'}}>
          <span style={{color:'#ff9500',fontWeight:700,fontSize:11}}>SYMBOLS</span>
          <button style={{...S.btn(false),background:'#333'}} onClick={defineSymbol} disabled={!selectedLayer}>
            ⊛ Define from Selection
          </button>
          {symbols.length === 0 && <span style={{color:'#555',fontSize:10}}>No symbols yet — select a layer and click Define</span>}
          {symbols.map(sym => (
            <button key={sym.id} style={{...S.btn(false),background:'#2a2a3e',border:'1px solid #444'}}
              onClick={()=>placeSymbol(sym)} title={`Place ${sym.name}`}>
              ⊛ {sym.name}
            </button>
          ))}
          <button style={S.btn()} onClick={()=>setShowSymbols(false)}>✕</button>
        </div>
      )}

      {/* ── Patterns Panel ── */}
      {showPatterns && (
        <div style={{display:'flex',alignItems:'center',gap:8,padding:'6px 16px',background:'#1a1a2e',borderBottom:'1px solid #333',flexWrap:'wrap'}}>
          <span style={{color:'#ff6600',fontWeight:700,fontSize:11}}>PATTERN FILLS</span>
          {PATTERN_PRESETS.map(p => (
            <button key={p.id} style={{...S.btn(false),background:'#2a2a3e',border:'1px solid #444',display:'flex',alignItems:'center',gap:4}}
              onClick={()=>applyPattern(p.id)} title={`Apply ${p.name} pattern`} disabled={!selectedId}>
              <svg width={16} height={16} style={{border:'1px solid #333'}}>
                <rect width={16} height={16} fill={`url(#pat_${p.id})`}/>
              </svg>
              {p.name}
            </button>
          ))}
          <button style={S.btn()} onClick={()=>setShowPatterns(false)}>✕</button>
        </div>
      )}

      {/* ── Artboards Panel ── */}
      <div style={{display:'flex',alignItems:'center',gap:6,padding:'3px 16px',background:'#1e1e1e',borderBottom:'1px solid #2a2a2a',overflowX:'auto'}}>
        <span style={{color:'#555',fontSize:10,whiteSpace:'nowrap'}}>BOARDS:</span>
        {artboards.map(ab => (
          <button key={ab.id} style={{...S.btn(activeArtboard===ab.id),whiteSpace:'nowrap',fontSize:10}}
            onClick={()=>setActiveArtboard(ab.id)}>{ab.name}</button>
        ))}
        <button style={{...S.btn(false),fontSize:10}} onClick={addArtboard}>＋</button>
      </div>

      <div style={S.body}>
        {/* ── Illustrator-style Toolbar ── */}
        <div style={S.toolbar}>
          {['select','pen','type','shape','paint','transform','fill','view'].map(group=>(
            <React.Fragment key={group}>
              {TOOLS.filter(t=>t.group===group).map(tool=>(
                <button key={tool.id} style={S.toolBtn(tool.id)} title={`${tool.label}${tool.shortcut?' ('+tool.shortcut+')':''}`}
                  onClick={()=>setActiveTool(tool.id)}>
                  {tool.icon}
                </button>
              ))}
              <div style={{width:28,height:1,background:'#333',margin:'4px 0'}}/>
            </React.Fragment>
          ))}
          {/* Fill/Stroke swatches */}
          <div style={{position:'relative',width:34,height:34,marginTop:4}}>
            <div style={{width:22,height:22,background:fillColor,border:'2px solid #888',borderRadius:2,position:'absolute',top:2,left:2}}/>
            <div style={{width:22,height:22,background:strokeColor==='none'?'transparent':strokeColor,border:'2px solid #555',borderRadius:2,position:'absolute',top:10,left:10,
              backgroundImage:strokeColor==='none'?'linear-gradient(to top right,transparent calc(50% - 1px),red,transparent calc(50% + 1px))':'none'}}/>
          </div>
          <input type="color" value={fillColor} onChange={e=>setFillColor(e.target.value)} style={{width:28,height:20,border:'none',background:'none',cursor:'pointer',padding:0}}/>
        </div>

        {/* ── SVG Canvas ── */}
        <div style={S.center}>
          <svg ref={svgRef}
            width={project.width*zoom} height={project.height*zoom}
            viewBox={`0 0 ${project.width} ${project.height}`}
            style={{display:'block',background:project.background,cursor:activeTool==='pen'?'crosshair':activeTool==='zoom'?'zoom-in':'default'}}
            onMouseDown={onSVGMouseDown}
            onMouseMove={onSVGMouseMove}
            onMouseUp={onSVGMouseUp}
          >
            {/* Pattern Defs */}
            <defs>
              {PATTERN_PRESETS.map(p => (
                <pattern key={p.id} id={`pat_${p.id}`} width="8" height="8" patternUnits="userSpaceOnUse">
                  <g dangerouslySetInnerHTML={{__html: p.svg.replace(/currentColor/g, fillColor)}}/>
                </pattern>
              ))}
            </defs>
            {/* Artboard outlines */}
            {artboards.map(ab => (
              <g key={ab.id}>
                <rect x={ab.x} y={ab.y} width={ab.width} height={ab.height}
                  fill="none" stroke={activeArtboard===ab.id?'#ff6600':'#444'} strokeWidth={1} pointerEvents="none"/>
                <text x={ab.x} y={ab.y-4} fontSize={11} fill={activeArtboard===ab.id?'#ff6600':'#666'}
                  fontFamily="monospace" pointerEvents="none">{ab.name}</text>
              </g>
            ))}
            {/* Grid */}
            {showGrid&&Array.from({length:Math.floor(project.width/gridSize)+1},(_,i)=>(
              <line key={`gx${i}`} x1={i*gridSize} y1={0} x2={i*gridSize} y2={project.height} stroke="rgba(255,255,255,0.05)" strokeWidth={0.5}/>
            ))}
            {showGrid&&Array.from({length:Math.floor(project.height/gridSize)+1},(_,i)=>(
              <line key={`gy${i}`} x1={0} y1={i*gridSize} x2={project.width} y2={i*gridSize} stroke="rgba(255,255,255,0.05)" strokeWidth={0.5}/>
            ))}

            {/* Layers */}
            {[...project.layers].reverse().map(l=>renderSVGLayer(l))}

            {/* Pending pen path preview */}
            {penPath&&penPath.length>0&&(
              <g>
                <path d={anchorsToBezierPath(penPath,false)} fill="none" stroke="#ff6600" strokeWidth={1} strokeDasharray="4 3" pointerEvents="none"/>
                {penPath.map((anchor,i)=>(
                  <rect key={i} x={anchor.x-5} y={anchor.y-5} width={10} height={10}
                    fill={i===0?'#ff6600':'#fff'} stroke="#ff6600" strokeWidth={1} pointerEvents="none"/>
                ))}
              </g>
            )}
          </svg>

          {/* Status bar */}
          <div style={{position:'absolute',bottom:0,left:0,right:0,background:'#1a1a1a',padding:'2px 12px',
            fontSize:10,color:'#666',display:'flex',gap:20}}>
            <span>{status}</span>
            <span>{project.width}×{project.height}px</span>
            <span>Zoom: {Math.round(zoom*100)}%</span>
            <span>Tool: {activeTool}</span>
            <span>Layers: {project.layers.length}</span>
            {penPath&&<span style={{color:'#ff6600'}}>Pen: {penPath.length} anchors — Enter=close, Esc=cancel</span>}
          </div>
        </div>

        {/* ── Right Panel ── */}
        <div style={S.right}>
          <div style={{display:'flex',borderBottom:'1px solid #333'}}>
            {['layers','props','stroke','effects'].map(tab=>(
              <button key={tab} onClick={()=>setActiveTab(tab)} style={{
                flex:1,padding:'7px 4px',border:'none',cursor:'pointer',fontSize:10,fontWeight:700,textTransform:'uppercase',
                background:activeTab===tab?'#2c2c2c':'transparent',
                color:activeTab===tab?'#ff6600':'#666',
                borderBottom:activeTab===tab?'2px solid #ff6600':'2px solid transparent',
              }}>{tab}</button>
            ))}
          </div>

          {activeTab==='layers'&&(
            <div style={{flex:1,overflowY:'auto'}}>
              <div style={{display:'flex',gap:4,padding:'6px 8px',borderBottom:'1px solid #333',flexWrap:'wrap'}}>
                {[['rect','▭'],['ellipse','⬭'],['polygon','⬡'],['star','★'],['type','T'],['pen','✒']].map(([type,icon])=>(
                  <button key={type} title={type} onClick={()=>type==='pen'?setActiveTool('pen'):addLayer(type)}
                    style={{...S.btn(false),padding:'4px 6px',fontSize:13}}>{icon}</button>
                ))}
              </div>
              <div style={{padding:'4px 0'}}>
                {[...project.layers].reverse().map(layer=>(
                  <div key={layer.id} style={S.layerRow(layer.id)}
                    onClick={()=>setSelectedIds(e=>[layer.id])}>
                    <span style={{fontSize:11,opacity:0.5}}>{layer.type==='text'?'T':layer.type==='path'?'✒':'▭'}</span>
                    <span style={{flex:1,fontSize:11,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{layer.name}</span>
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
                <button style={S.btn(false)} onClick={groupSelected} disabled={selectedIds.length<2}>⊞ Group</button>
                <button style={{...S.btn(false),color:'#ff4757'}} onClick={()=>selectedId&&removeLayer(selectedId)}>🗑</button>
              </div>
            </div>
          )}

          {activeTab==='props'&&selectedLayer&&(
            <div style={{padding:10,display:'flex',flexDirection:'column',gap:8}}>
              <div style={S.label}>Fill</div>
              <div style={{display:'flex',gap:6,alignItems:'center'}}>
                <input type="color" value={selectedLayer.fill&&selectedLayer.fill!=='none'?selectedLayer.fill:'#000000'}
                  onChange={e=>updateLayer(selectedId,{fill:e.target.value})}
                  style={{width:40,height:28,border:'none',borderRadius:4,cursor:'pointer'}}/>
                <button style={S.btn(selectedLayer.fill==='none')} onClick={()=>updateLayer(selectedId,{fill:'none'})}>None</button>
                <button style={S.btn(false)} onClick={()=>updateLayer(selectedId,{fill:{type:'linear',stops:[{offset:0,color:'#000'},{offset:1,color:'#fff'}]}})}>Gradient</button>
              </div>

              <div style={S.label}>Transform</div>
              {[['X','x'],['Y','y'],['W','width'],['H','height']].map(([lbl,key])=>(
                <div key={key} style={{display:'flex',alignItems:'center',gap:8}}>
                  <span style={{color:'#888',width:16}}>{lbl}</span>
                  <input type="number" style={S.input} value={Math.round(selectedLayer[key]||0)}
                    onChange={e=>updateLayer(selectedId,{[key]:Number(e.target.value)})}/>
                </div>
              ))}
              <div style={{display:'flex',gap:8,alignItems:'center'}}>
                <span style={{color:'#888',width:60,fontSize:10}}>Rotation</span>
                <input type="range" min={-180} max={180} value={selectedLayer.rotation||0}
                  onChange={e=>updateLayer(selectedId,{rotation:Number(e.target.value)})} style={{flex:1}}/>
                <span style={{color:'#ff6600',fontSize:10}}>{selectedLayer.rotation||0}°</span>
              </div>
              <div style={{display:'flex',gap:8,alignItems:'center'}}>
                <span style={{color:'#888',width:60,fontSize:10}}>Opacity</span>
                <input type="range" min={0} max={1} step={0.01} value={selectedLayer.opacity??1}
                  onChange={e=>updateLayer(selectedId,{opacity:Number(e.target.value)})} style={{flex:1}}/>
                <span style={{color:'#ff6600',fontSize:10}}>{Math.round((selectedLayer.opacity??1)*100)}%</span>
              </div>

              <div style={S.label}>Blend Mode</div>
              <select style={S.input} value={selectedLayer.blendMode||'normal'}
                onChange={e=>updateLayer(selectedId,{blendMode:e.target.value})}>
                {BLEND_MODES.map(m=><option key={m}>{m}</option>)}
              </select>

              {selectedLayer.type==='text'&&(
                <>
                  <div style={S.label}>Text Content</div>
                  <textarea style={{...S.input,height:60,resize:'vertical'}} value={selectedLayer.text||''}
                    onChange={e=>updateLayer(selectedId,{text:e.target.value})}/>
                  <div style={{display:'flex',gap:6}}>
                    <input type="number" style={{...S.input,width:60}} value={selectedLayer.fontSize||24}
                      onChange={e=>updateLayer(selectedId,{fontSize:Number(e.target.value)})} placeholder="Size"/>
                    <select style={S.input} value={selectedLayer.textAlign||'left'}
                      onChange={e=>updateLayer(selectedId,{textAlign:e.target.value})}>
                      {['left','center','right'].map(a=><option key={a}>{a}</option>)}
                    </select>
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab==='stroke'&&selectedLayer&&(
            <div style={{padding:10,display:'flex',flexDirection:'column',gap:8}}>
              <div style={S.label}>Stroke Color</div>
              <div style={{display:'flex',gap:6,alignItems:'center'}}>
                <input type="color" value={selectedLayer.stroke&&selectedLayer.stroke!=='none'?selectedLayer.stroke:'#000000'}
                  onChange={e=>updateLayer(selectedId,{stroke:e.target.value})}
                  style={{width:40,height:28,border:'none',borderRadius:4,cursor:'pointer'}}/>
                <button style={S.btn(selectedLayer.stroke==='none')} onClick={()=>updateLayer(selectedId,{stroke:'none'})}>None</button>
              </div>
              <div style={S.label}>Stroke Width</div>
              <input type="range" min={0} max={50} step={0.5} value={selectedLayer.strokeWidth||0}
                onChange={e=>updateLayer(selectedId,{strokeWidth:Number(e.target.value)})} style={{width:'100%'}}/>
              <span style={{color:'#ff6600',fontSize:10}}>{selectedLayer.strokeWidth||0}px</span>

              <div style={S.label}>Line Cap</div>
              <div style={{display:'flex',gap:4}}>
                {STROKE_CAPS.map(c=>(
                  <button key={c} style={S.btn(selectedLayer.strokeCap===c)} onClick={()=>updateLayer(selectedId,{strokeCap:c})}>{c}</button>
                ))}
              </div>

              <div style={S.label}>Line Join</div>
              <div style={{display:'flex',gap:4}}>
                {STROKE_JOINS.map(j=>(
                  <button key={j} style={S.btn(selectedLayer.strokeJoin===j)} onClick={()=>updateLayer(selectedId,{strokeJoin:j})}>{j}</button>
                ))}
              </div>

              <div style={S.label}>Dash Pattern</div>
              {DASH_PRESETS.map((dash,i)=>(
                <button key={i} style={{...S.btn(JSON.stringify(selectedLayer.dashArray)===JSON.stringify(dash)),marginBottom:4,display:'flex',alignItems:'center',gap:8}}
                  onClick={()=>updateLayer(selectedId,{dashArray:dash})}>
                  <svg width={60} height={8}>
                    <line x1={0} y1={4} x2={60} y2={4} stroke="#ff6600" strokeWidth={2} strokeDasharray={dash.join(',')||'none'}/>
                  </svg>
                  <span>{dash.length?`[${dash.join(',')}]`:'Solid'}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
