// src/front/js/pages/SPXVectorPage.js
// SPX Vector — Illustrator-rival vector editor with full bezier pen tool

import { saveToCloud, listCloudProjects, loadFromCloud, deleteCloudProject } from "../utils/cloudSave";
import * as THREE from 'three';
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { anchorsToBezierPath, createAnchor, moveAnchor, updateInHandle, updateOutHandle } from "../utils/spxvector/bezierMath";
import { booleanUnion, booleanSubtract, booleanIntersect, booleanExclude } from "../utils/spxvector/booleanOps";
import { exportFullSVG } from "../utils/spxvector/svgExport";
import "../../styles/SPXVector.css";


// ─── SVG → 3D Extrude constants ──────────────────────────────────────────────
const EXTRUDE_MATERIALS = [
  {id:'teal_metal', label:'Teal Metal',  color:'#00ffc8', roughness:0.2, metalness:0.8},
  {id:'orange',     label:'Orange',      color:'#FF6600', roughness:0.4, metalness:0.3},
  {id:'gold',       label:'Gold',        color:'#FFD700', roughness:0.1, metalness:1.0},
  {id:'chrome',     label:'Chrome',      color:'#C0C0C0', roughness:0.05,metalness:1.0},
  {id:'white',      label:'White',       color:'#ffffff', roughness:0.8, metalness:0.0},
  {id:'black',      label:'Black',       color:'#111111', roughness:0.5, metalness:0.2},
  {id:'glass',      label:'Glass',       color:'#ffffff', roughness:0.0, metalness:0.0, transparent:true, opacity:0.2},
];
const uid = () => `${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
const clamp = (n,a,b) => Math.max(a,Math.min(b,n));


const VARI_AXES = [
  {id:'wght', label:'Weight',   min:100, max:900, step:1,   default:400},
  {id:'wdth', label:'Width',    min:50,  max:200, step:1,   default:100},
  {id:'slnt', label:'Slant',    min:-15, max:15,  step:0.5, default:0},
  {id:'opsz', label:'Opt Size', min:8,   max:144, step:1,   default:14},
];
const DEFAULT_CHAR_STYLES = [
  {id:'cs_bold_teal', name:'Bold Teal',   props:{fontWeight:700, fill:'#00ffc8', fontSize:null}},
  {id:'cs_heading',   name:'Heading',     props:{fontWeight:800, fontSize:48,    fill:null}},
  {id:'cs_caption',   name:'Caption',     props:{fontWeight:300, fontSize:11,    fill:'#888888'}},
  {id:'cs_accent',    name:'Accent',      props:{fontWeight:600, fill:'#FF6600', fontSize:null}},
  {id:'cs_code',      name:'Code',        props:{fontFamily:'Source Code Pro', fontSize:13, fill:'#00ffc8'}},
];
const GOOGLE_FONTS = [
  'Inter','Roboto','Open Sans','Lato','Montserrat','Oswald','Raleway','Poppins',
  'Playfair Display','Merriweather','Source Code Pro','JetBrains Mono','Bebas Neue',
  'Dancing Script','Pacifico','Lobster','Anton','Archivo Black','Nunito','Quicksand',
];
const PARAGRAPH_STYLES = [
  {name:'Body',      fontSize:16, fontWeight:400, lineHeight:1.6, letterSpacing:0,   textAlign:'left'},
  {name:'Heading 1', fontSize:64, fontWeight:700, lineHeight:1.1, letterSpacing:-1,  textAlign:'left'},
  {name:'Heading 2', fontSize:48, fontWeight:700, lineHeight:1.2, letterSpacing:-0.5,textAlign:'left'},
  {name:'Heading 3', fontSize:32, fontWeight:600, lineHeight:1.3, letterSpacing:0,   textAlign:'left'},
  {name:'Caption',   fontSize:12, fontWeight:400, lineHeight:1.4, letterSpacing:0.5, textAlign:'left'},
  {name:'Quote',     fontSize:24, fontWeight:300, lineHeight:1.7, letterSpacing:1,   textAlign:'center'},
];
const OPENTYPE_FEATURES = [
  {id:'liga',  label:'Ligatures'},
  {id:'kern',  label:'Kerning'},
  {id:'smcp',  label:'Small Caps'},
  {id:'onum',  label:'Old-style Nums'},
  {id:'frac',  label:'Fractions'},
  {id:'tnum',  label:'Tabular Nums'},
  {id:'c2sc',  label:'Caps to SC'},
  {id:'swsh',  label:'Swash'},
];
function injectGoogleFont(family) {
  const id = `gf-${family.replace(/\s+/g,'-')}`;
  if (document.getElementById(id)) return;
  const link = document.createElement('link');
  link.id = id; link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:ital,wght@0,300;0,400;0,600;0,700;1,400&display=swap`;
  document.head.appendChild(link);
}


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
  // ── SVG → 3D Extrude (Session 1) ─────────────────────────────────────────
  const [extrudeOpen,     setExtrudeOpen]     = useState(false);
  // ── Sessions 2+3 additions ────────────────────────────────────────────────
  const [depthMode,       setDepthMode]       = useState('flat'); // flat|midas
  const [depthMapUrl,     setDepthMapUrl]     = useState(null);
  const [depthLoading,    setDepthLoading]    = useState(false);
  const [depthStrength,   setDepthStrength]   = useState(1.0);
  const [depthSmoothing,  setDepthSmoothing]  = useState(2);
  const [exportPanel,     setExportPanel]     = useState(false);
  const [exportFormat,    setExportFormat]    = useState('glb');
  const [exportLoading,   setExportLoading]   = useState(false);
  const [motionTarget,    setMotionTarget]    = useState(false);
  const [videoTarget,     setVideoTarget]     = useState(false);

  const [extrudeDepth,    setExtrudeDepth]    = useState(0.3);
  const [extrudeBevel,    setExtrudeBevel]    = useState(0.02);
  const [extrudeMaterial, setExtrudeMaterial] = useState('teal_metal');
  const [extrudeLoading,  setExtrudeLoading]  = useState(false);
  const [extrudePreview,  setExtrudePreview]  = useState(null); // base64 PNG preview
  const extrudeCanvasRef  = useRef(null);
  const extrudeSceneRef   = useRef(null);
  const extrudeRendererRef= useRef(null);
  const extrudeCameraRef  = useRef(null);
  const extrudeRafRef     = useRef(null);
  const extrudeMeshRef    = useRef(null);
  const extrudeOrbitRef   = useRef(null);

  // ── Variable Fonts + Char Styles ────────────────────────────────────────────
  const [variAxes,       setVariAxes]       = useState({wght:400,wdth:100,slnt:0,opsz:14});
  const [charStyles,     setCharStyles]     = useState(DEFAULT_CHAR_STYLES);
  const [selRange,       setSelRange]       = useState(null); // {start,end}
  const [richText,       setRichText]       = useState([]); // [{char,style:{}}]
  const [showCharStyles, setShowCharStyles] = useState(false);
  // ── Typography Engine ─────────────────────────────────────────────────────
  const [activeTypoTab,   setActiveTypoTab]   = useState('character');
  const [fontFamily,      setFontFamily]      = useState('Inter');
  const [fontStyle,       setFontStyle]       = useState('normal');
  const [letterSpacing,   setLetterSpacing]   = useState(0);
  const [lineHeight,      setLineHeight]      = useState(1.4);
  const [textDecoration,  setTextDecoration]  = useState('none');
  const [textTransformV,  setTextTransformV]  = useState('none');
  const [otFeatures,      setOtFeatures]      = useState({liga:true,kern:true});
  const [textOnPath,      setTextOnPath]      = useState(false);
  const [textOnPathId,    setTextOnPathId]    = useState('');
  const [pathOffset,      setPathOffset]      = useState(0);
  const [aiFillOpen,    setAiFillOpen]    = useState(false);
  const [aiFillPrompt,  setAiFillPrompt]  = useState('');
  const [aiFillLoading, setAiFillLoading] = useState(false);
  const [aiFillResult,  setAiFillResult]  = useState(null);
  const maskCanvasRef = useRef(null);
  const maskPainting  = useRef(false);
  const [maskBrushSize, setMaskBrushSize] = useState(40);
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
      const otStr = Object.entries(layer.otFeatures||{}).filter(([,v])=>v).map(([k])=>`"${k}"`).join(', ') || 'normal';
      const pathLayers = project.layers.filter(pl=>pl.type==='path'&&pl.id!==layer.id);
      const onPath = layer.textOnPath && layer.textOnPathId;
      el = onPath ? (
        <text key={layer.id} fontSize={layer.fontSize||24} fontWeight={layer.fontWeight||400}
          fontFamily={layer.fontFamily||'Inter'} fontStyle={layer.fontStyle||'normal'}
          fill={fill} opacity={opacity} transform={transform}
          letterSpacing={layer.letterSpacing||0}
          textDecoration={layer.textDecoration||'none'}
          style={{textTransform:layer.textTransformV||'none',fontFeatureSettings:otStr,fontVariationSettings:layer.variSettings||'normal'}}>
          <textPath href={`#${layer.textOnPathId}`} startOffset={`${layer.pathOffset||0}%`}>
            {layer.text||''}
          </textPath>
        </text>
      ) : (
        <text key={layer.id} x={layer.x} y={(layer.y||0)+(layer.fontSize||24)} fontSize={layer.fontSize||24}
          fontWeight={layer.fontWeight||400} fontFamily={layer.fontFamily||'Inter'}
          fontStyle={layer.fontStyle||'normal'} fill={fill} opacity={opacity} transform={transform}
          letterSpacing={layer.letterSpacing||0} textDecoration={layer.textDecoration||'none'}
          style={{textTransform:layer.textTransformV||'none',fontFeatureSettings:otStr}}>
          {layer.richText && layer.richText.length
            ? renderRichSpans(layer)
            : lines.map((l,i)=><tspan key={i} x={layer.x} dy={i===0?0:(layer.fontSize||24)*(layer.lineHeight||1.4)}>{l}</tspan>)
          }
        </text>
      );
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

  const svgToBase64 = () => new Promise(resolve => {
    const svg = svgRef.current; if (!svg) return resolve('');
    const s = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([s],{type:'image/svg+xml'});
    const img = new Image(); const url = URL.createObjectURL(blob);
    img.onload = () => {
      const c = document.createElement('canvas'); c.width=project.width; c.height=project.height;
      c.getContext('2d').drawImage(img,0,0,project.width,project.height);
      URL.revokeObjectURL(url); resolve(c.toDataURL('image/png').split(',')[1]);
    }; img.src = url;
  });
  const maskToBase64Vec = () => { const m = maskCanvasRef.current; return m ? m.toDataURL('image/png').split(',')[1] : ''; };
  const clearMaskVec = () => { const m = maskCanvasRef.current; if (m) m.getContext('2d').clearRect(0,0,m.width,m.height); };
  const drawMaskVec = (e) => {
    const m = maskCanvasRef.current; if (!m) return;
    const r = m.getBoundingClientRect();
    const x = (e.clientX-r.left)*(m.width/r.width), y=(e.clientY-r.top)*(m.height/r.height);
    const ctx = m.getContext('2d'); ctx.fillStyle='white';
    ctx.beginPath(); ctx.arc(x,y,maskBrushSize/2,0,Math.PI*2); ctx.fill();
  };
  const onMaskMDV=(e)=>{maskPainting.current=true; drawMaskVec(e);};
  const onMaskMMV=(e)=>{if(maskPainting.current) drawMaskVec(e);};
  const onMaskMUV=()=>{maskPainting.current=false;};
  const runAiFillVec = async () => {
    setAiFillLoading(true); setAiFillResult(null);
    try {
      const imageB64 = await svgToBase64();
      const token = localStorage.getItem('token')||sessionStorage.getItem('token')||'';
      const res = await fetch('/api/ai-fill/inpaint', {
        method:'POST', headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},
        body: JSON.stringify({image:imageB64, mask:maskToBase64Vec(), prompt:aiFillPrompt}),
      });
      const data = await res.json();
      if (data.url) setAiFillResult(data.url);
      else alert('AI Fill: '+(data.error||'unknown'));
    } catch(err){alert('AI Fill: '+err.message);}
    setAiFillLoading(false);
  };
  const acceptAiFillVec = () => {
    if (!aiFillResult) return;
    const nl={id:`${Date.now()}_aifill`,type:'image',name:'AI Fill',visible:true,locked:false,
      opacity:1,blendMode:'normal',x:0,y:0,width:project.width,height:project.height,src:aiFillResult,effects:[]};
    setProject(p=>({...p,layers:[...p.layers,nl]}));
    setAiFillOpen(false); setAiFillResult(null); clearMaskVec();
  };

  // ── Rich text / char style helpers ───────────────────────────────────────────
  const initRichText = (text) => text.split('').map(ch => ({char:ch, style:{}}));

  const applyCharStyle = (props) => {
    if (!selectedLayer || !selRange) return;
    const rt = (selectedLayer.richText || initRichText(selectedLayer.text||''));
    const {start,end} = selRange;
    const updated = rt.map((c,i) => i>=start&&i<=end ? {...c, style:{...c.style,...props}} : c);
    updateLayer(selectedLayer.id, {richText: updated});
  };

  const clearCharStyles = () => {
    if (!selectedLayer) return;
    const rt = (selectedLayer.richText || initRichText(selectedLayer.text||''));
    updateLayer(selectedLayer.id, {richText: rt.map(c=>({...c,style:{}}))});
  };

  const buildVariSettings = (axes) => {
    return Object.entries(axes).map(([k,v])=>`"${k}" ${v}`).join(', ');
  };

  const syncRichText = (layer) => {
    if (!layer || layer.type!=='text') return [];
    const text = layer.text || '';
    const rt = layer.richText || [];
    // pad/trim richText to match text length
    const synced = text.split('').map((ch,i) => ({char:ch, style: rt[i]?.style||{}}));
    return synced;
  };

  const renderRichSpans = (layer) => {
    const rt = syncRichText(layer);
    if (!rt.length) return null;
    // group consecutive chars with identical style
    const groups = [];
    let cur = null;
    rt.forEach((c,i) => {
      const key = JSON.stringify(c.style);
      if (!cur || JSON.stringify(cur.style) !== key) {
        cur = {text:'', style:c.style}; groups.push(cur);
      }
      cur.text += c.char;
    });
    return groups.map((g,i) => (
      <tspan key={i}
        fill={g.style.fill||undefined}
        fontSize={g.style.fontSize||undefined}
        fontWeight={g.style.fontWeight||undefined}
        fontFamily={g.style.fontFamily||undefined}
        fontStyle={g.style.fontStyle||undefined}
        letterSpacing={g.style.letterSpacing||undefined}
      >{g.text}</tspan>
    ));
  };

  // ── SVG → 3D Extrude helpers ─────────────────────────────────────────────
  const initExtrudeScene = () => {
    const canvas = extrudeCanvasRef.current;
    if (!canvas || extrudeRendererRef.current) return;
    const renderer = new THREE.WebGLRenderer({canvas, antialias:true, alpha:true});
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    extrudeRendererRef.current = renderer;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0d1117');
    extrudeSceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, canvas.clientWidth/canvas.clientHeight, 0.01, 100);
    camera.position.set(0, 0, 4);
    extrudeCameraRef.current = camera;

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.4));
    const dir = new THREE.DirectionalLight(0xffffff, 1.2);
    dir.position.set(3, 5, 3); dir.castShadow = true;
    scene.add(dir);
    const fill = new THREE.DirectionalLight(0x00ffc8, 0.3);
    fill.position.set(-3, -2, -2);
    scene.add(fill);

    const animate = () => {
      extrudeRafRef.current = requestAnimationFrame(animate);
      if (extrudeMeshRef.current) extrudeMeshRef.current.rotation.y += 0.005;
      renderer.render(scene, camera);
    };
    animate();
  };

  const destroyExtrudeScene = () => {
    if (extrudeRafRef.current) cancelAnimationFrame(extrudeRafRef.current);
    if (extrudeRendererRef.current) { extrudeRendererRef.current.dispose(); extrudeRendererRef.current = null; }
    extrudeSceneRef.current = null; extrudeCameraRef.current = null; extrudeMeshRef.current = null;
  };

  // Convert SVG path string to THREE.Shape
  const svgPathToThreeShape = (pathData) => {
    const shape = new THREE.Shape();
    if (!pathData) return shape;
    const cmds = pathData.match(/[MmLlHhVvCcSsQqTtAaZz][^MmLlHhVvCcSsQqTtAaZz]*/g) || [];
    let cx = 0, cy = 0;
    cmds.forEach(cmd => {
      const type = cmd[0];
      const nums = cmd.slice(1).trim().split(/[\s,]+/).map(Number).filter(n=>!isNaN(n));
      if (type==='M') { shape.moveTo(nums[0], -nums[1]); cx=nums[0]; cy=nums[1]; }
      else if (type==='L') { shape.lineTo(nums[0], -nums[1]); cx=nums[0]; cy=nums[1]; }
      else if (type==='H') { shape.lineTo(nums[0], -cy); cx=nums[0]; }
      else if (type==='V') { shape.lineTo(cx, -nums[0]); cy=nums[0]; }
      else if (type==='C') {
        for (let i=0;i<nums.length;i+=6)
          shape.bezierCurveTo(nums[i],-nums[i+1],nums[i+2],-nums[i+3],nums[i+4],-nums[i+5]);
        cx=nums[nums.length-2]; cy=nums[nums.length-1];
      }
      else if (type==='Q') {
        for (let i=0;i<nums.length;i+=4)
          shape.quadraticCurveTo(nums[i],-nums[i+1],nums[i+2],-nums[i+3]);
        cx=nums[nums.length-2]; cy=nums[nums.length-1];
      }
      else if (type==='Z'||type==='z') shape.closePath();
    });
    return shape;
  };

  const buildExtrudeMesh = () => {
    const scene = extrudeSceneRef.current; if (!scene) return;
    // Remove old mesh
    if (extrudeMeshRef.current) { scene.remove(extrudeMeshRef.current); extrudeMeshRef.current = null; }

    const matDef = EXTRUDE_MATERIALS.find(m=>m.id===extrudeMaterial) || EXTRUDE_MATERIALS[0];
    const mat = new THREE.MeshStandardMaterial({
      color: matDef.color, roughness: matDef.roughness, metalness: matDef.metalness,
      transparent: matDef.transparent||false, opacity: matDef.opacity??1,
    });

    // Get path layers from project
    const pathLayers = project.layers.filter(l => l.type==='path' && l.anchors?.length > 0);
    const shapes = [];

    if (pathLayers.length > 0) {
      pathLayers.forEach(layer => {
        // Build SVG path string from anchors
        if (!layer.anchors || layer.anchors.length < 2) return;
        const scale = 0.003; // normalize from SVG coords
        const shape = new THREE.Shape();
        const first = layer.anchors[0];
        shape.moveTo(first.x * scale, -first.y * scale);
        for (let i=1; i<layer.anchors.length; i++) {
          const a = layer.anchors[i];
          const prev = layer.anchors[i-1];
          if (prev.out && a.in) {
            shape.bezierCurveTo(
              prev.out.x*scale, -prev.out.y*scale,
              a.in.x*scale,     -a.in.y*scale,
              a.x*scale,        -a.y*scale
            );
          } else {
            shape.lineTo(a.x*scale, -a.y*scale);
          }
        }
        if (layer.closed) shape.closePath();
        shapes.push(shape);
      });
    }

    // Fallback: create a simple star shape if no paths
    if (shapes.length === 0) {
      const star = new THREE.Shape();
      const pts = 5; const outer = 1; const inner = 0.4;
      for (let i=0; i<pts*2; i++) {
        const r = i%2===0 ? outer : inner;
        const a = (i/pts/2)*Math.PI*2 - Math.PI/2;
        if (i===0) star.moveTo(Math.cos(a)*r, Math.sin(a)*r);
        else star.lineTo(Math.cos(a)*r, Math.sin(a)*r);
      }
      star.closePath();
      shapes.push(star);
    }

    const extrudeSettings = {
      depth: extrudeDepth,
      bevelEnabled: extrudeBevel > 0,
      bevelThickness: extrudeBevel,
      bevelSize: extrudeBevel * 0.8,
      bevelSegments: 4,
      curveSegments: 16,
    };

    const group = new THREE.Group();
    shapes.forEach(shape => {
      const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
      geo.computeBoundingBox();
      const center = new THREE.Vector3();
      geo.boundingBox.getCenter(center);
      geo.translate(-center.x, -center.y, -center.z);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = true;
      group.add(mesh);
    });

    // Auto-scale to fit viewport
    const box = new THREE.Box3().setFromObject(group);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    if (maxDim > 0) group.scale.setScalar(2 / maxDim);

    scene.add(group);
    extrudeMeshRef.current = group;
  };

  const sendToCompositor = () => {
    // Serialize mesh data to localStorage for Node Compositor to pick up
    const payload = {
      source: 'spx_vector_extrude',
      timestamp: Date.now(),
      layers: project.layers.filter(l=>l.type==='path').length,
      extrudeDepth,
      extrudeBevel,
      material: EXTRUDE_MATERIALS.find(m=>m.id===extrudeMaterial),
      projectName: project.name,
    };
    localStorage.setItem('spx_vector_to_3d', JSON.stringify(payload));
    alert('3D mesh sent to Node Compositor. Open the compositor and import from Vector.');
    setExtrudeOpen(false);
  };

  const onExtrudeOrbitDown = (e) => { extrudeOrbitRef.current = {x:e.clientX,y:e.clientY}; };
  const onExtrudeOrbitMove = (e) => {
    if (!extrudeOrbitRef.current || !extrudeMeshRef.current) return;
    const dx = (e.clientX - extrudeOrbitRef.current.x) * 0.01;
    const dy = (e.clientY - extrudeOrbitRef.current.y) * 0.01;
    extrudeMeshRef.current.rotation.y += dx;
    extrudeMeshRef.current.rotation.x += dy;
    extrudeOrbitRef.current = {x:e.clientX, y:e.clientY};
  };
  const onExtrudeOrbitUp = () => { extrudeOrbitRef.current = null; };
  const onExtrudeWheel = (e) => {
    const cam = extrudeCameraRef.current; if (!cam) return;
    cam.position.z = Math.max(0.5, Math.min(10, cam.position.z + e.deltaY * 0.005));
  };


  // ── Session 2: MiDaS AI Depth ────────────────────────────────────────────
  const rasterizeSVGtoBase64 = () => {
    const svg = svgRef.current; if (!svg) return null;
    const serialized = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([serialized], {type:'image/svg+xml'});
    return new Promise(resolve => {
      const img = new Image();
      const url = URL.createObjectURL(blob);
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width  = project.width  || 1920;
        canvas.height = project.height || 1080;
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL('image/png').split(',')[1]);
      };
      img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
      img.src = url;
    });
  };

  const runMiDaS = async () => {
    setDepthLoading(true);
    setDepthMapUrl(null);
    try {
      const b64 = await rasterizeSVGtoBase64();
      if (!b64) throw new Error('Could not rasterize SVG');
      const token = localStorage.getItem('token') || sessionStorage.getItem('token') || '';
      const res = await fetch('/api/ai-fill/depth', {
        method: 'POST',
        headers: {'Content-Type':'application/json', Authorization:`Bearer ${token}`},
        body: JSON.stringify({image: b64}),
      });
      const data = await res.json();
      if (data.url) {
        setDepthMapUrl(data.url);
        // Apply depth map to extrude mesh
        await applyDepthMapToMesh(data.url);
      } else {
        alert('MiDaS error: ' + (data.error||'unknown'));
      }
    } catch(e) {
      alert('Depth error: ' + e.message);
    }
    setDepthLoading(false);
  };

  const applyDepthMapToMesh = async (depthUrl) => {
    const scene = extrudeSceneRef.current; if (!scene) return;
    // Remove old mesh
    if (extrudeMeshRef.current) { scene.remove(extrudeMeshRef.current); extrudeMeshRef.current = null; }

    // Load depth map image
    const img = await new Promise((resolve, reject) => {
      const i = new Image(); i.crossOrigin = 'anonymous';
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = depthUrl;
    });

    // Read depth pixels
    const offscreen = document.createElement('canvas');
    const dw = Math.min(img.width, 256); // downsample for performance
    const dh = Math.min(img.height, 144);
    offscreen.width = dw; offscreen.height = dh;
    const ctx = offscreen.getContext('2d');
    ctx.drawImage(img, 0, 0, dw, dh);
    const pixels = ctx.getImageData(0, 0, dw, dh).data;

    // Build displaced PlaneGeometry
    const geo = new THREE.PlaneGeometry(3, 3 * (dh/dw), dw-1, dh-1);
    const pos = geo.attributes.position.array;
    for (let i=0; i<dh; i++) {
      for (let j=0; j<dw; j++) {
        const pxIdx = (i*dw+j)*4;
        const brightness = pixels[pxIdx]/255; // R channel = depth
        const vertIdx = (i*dw+j)*3;
        pos[vertIdx+2] = brightness * depthStrength * 0.8; // displace Z
      }
    }
    geo.attributes.position.needsUpdate = true;
    geo.computeVertexNormals();

    const matDef = EXTRUDE_MATERIALS.find(m=>m.id===extrudeMaterial)||EXTRUDE_MATERIALS[0];
    const mat = new THREE.MeshStandardMaterial({
      color: matDef.color, roughness: matDef.roughness, metalness: matDef.metalness,
      side: THREE.DoubleSide,
    });

    // Optionally load the depth map as a texture too
    const loader = new THREE.TextureLoader();
    loader.crossOrigin = 'anonymous';
    const tex = await new Promise(r => loader.load(depthUrl, r, undefined, ()=>r(null)));
    if (tex) mat.map = tex;

    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    scene.add(mesh);
    extrudeMeshRef.current = mesh;
  };

  // ── Session 3: Export + Pipeline ─────────────────────────────────────────
  const exportAs = async (format) => {
    setExportLoading(true);
    try {
      if (format === 'png') {
        // Export 3D preview as PNG
        const renderer = extrudeRendererRef.current;
        const scene    = extrudeSceneRef.current;
        const camera   = extrudeCameraRef.current;
        if (!renderer||!scene||!camera) throw new Error('Scene not initialized');
        renderer.render(scene, camera);
        const canvas = extrudeCanvasRef.current;
        const link = document.createElement('a');
        link.download = `${project.name}_3d.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      } else if (format === 'svg') {
        // Export original SVG
        const svgData = exportFullSVG(project);
        const blob = new Blob([svgData], {type:'image/svg+xml'});
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `${project.name}.svg`;
        link.href = url; link.click();
        URL.revokeObjectURL(url);
      } else if (format === 'glb') {
        // GLB export via GLTFExporter
        try {
          const {GLTFExporter} = await import('three/examples/jsm/exporters/GLTFExporter.js');
          const exporter = new GLTFExporter();
          const mesh = extrudeMeshRef.current;
          if (!mesh) throw new Error('No 3D mesh — open Extrude panel first');
          exporter.parse(mesh, (gltf) => {
            const blob = new Blob([gltf], {type:'model/gltf-binary'});
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.download = `${project.name}.glb`;
            link.href = url; link.click();
            URL.revokeObjectURL(url);
          }, (err)=>{ throw err; }, {binary:true});
        } catch(e) {
          alert('GLB export: ' + e.message);
        }
      } else if (format === 'obj') {
        try {
          const {OBJExporter} = await import('three/examples/jsm/exporters/OBJExporter.js');
          const exporter = new OBJExporter();
          const mesh = extrudeMeshRef.current;
          if (!mesh) throw new Error('No 3D mesh');
          const result = exporter.parse(mesh);
          const blob = new Blob([result], {type:'text/plain'});
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.download = `${project.name}.obj`;
          link.href = url; link.click();
          URL.revokeObjectURL(url);
        } catch(e) {
          alert('OBJ export: ' + e.message);
        }
      }
    } catch(e) {
      alert('Export error: ' + e.message);
    }
    setExportLoading(false);
  };

  const sendToMotionStudio = () => {
    const payload = {
      source: 'spx_vector_3d',
      type: 'extrude',
      projectName: project.name,
      depthMode,
      depthMapUrl,
      material: EXTRUDE_MATERIALS.find(m=>m.id===extrudeMaterial),
      timestamp: Date.now(),
    };
    localStorage.setItem('spx_3d_to_motion', JSON.stringify(payload));
    setMotionTarget(true);
    setTimeout(()=>setMotionTarget(false), 3000);
  };

  const sendToVideoEditor = () => {
    const renderer = extrudeRendererRef.current;
    const scene    = extrudeSceneRef.current;
    const camera   = extrudeCameraRef.current;
    let thumbnail = '';
    if (renderer && scene && camera) {
      renderer.render(scene, camera);
      thumbnail = extrudeCanvasRef.current?.toDataURL('image/jpeg', 0.7) || '';
    }
    const payload = {
      source: 'spx_vector_3d',
      type: 'video_layer',
      projectName: project.name,
      thumbnail,
      timestamp: Date.now(),
    };
    localStorage.setItem('spx_3d_to_video', JSON.stringify(payload));
    setVideoTarget(true);
    setTimeout(()=>setVideoTarget(false), 3000);
  };


  return (<>
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


          {/* ── Typography Panel ── shows when type tool active or text layer selected ── */}
          {(activeTool==='type' || (selectedLayer&&selectedLayer.type==='text')) && (
            <div style={{borderTop:'1px solid #21262d',padding:10,display:'flex',flexDirection:'column',gap:8}}>
              <div style={{color:'#00ffc8',fontFamily:'JetBrains Mono',fontSize:11,fontWeight:700,letterSpacing:1}}>TYPOGRAPHY</div>

              {/* Sub-tabs */}
              <div style={{display:'flex',gap:2,marginBottom:4}}>
                {['character','paragraph','path','opentype'].map(t=>(
                  <button key={t} onClick={()=>setActiveTypoTab(t)}
                    style={{flex:1,padding:'3px 0',border:'none',borderRadius:3,cursor:'pointer',fontSize:9,fontWeight:700,textTransform:'uppercase',
                      background:activeTypoTab===t?'#00ffc8':'#1a1f2e',color:activeTypoTab===t?'#06060f':'#888'}}>
                    {t}
                  </button>
                ))}
              </div>

              {/* CHARACTER TAB */}
              {activeTypoTab==='character' && (
                <div style={{display:'flex',flexDirection:'column',gap:6}}>
                  <span style={{color:'#888',fontSize:10}}>Font Family</span>
                  <select value={selectedLayer?.fontFamily||fontFamily}
                    onChange={e=>{
                      injectGoogleFont(e.target.value);
                      setFontFamily(e.target.value);
                      if(selectedLayer) updateLayer(selectedIds[0]||selectedLayer.id,{fontFamily:e.target.value});
                    }}
                    style={{background:'#1a1a1a',border:'1px solid #333',color:'#dde6ef',borderRadius:3,padding:'4px 6px',fontSize:11,width:'100%'}}>
                    {GOOGLE_FONTS.map(f=><option key={f} value={f} style={{fontFamily:f}}>{f}</option>)}
                  </select>

                  <div style={{display:'flex',gap:6}}>
                    <div style={{flex:1}}>
                      <span style={{color:'#888',fontSize:10}}>Size</span>
                      <input type="number" min={1} max={999}
                        value={selectedLayer?.fontSize||24}
                        onChange={e=>{ if(selectedLayer) updateLayer(selectedLayer.id,{fontSize:Number(e.target.value)}); }}
                        style={{width:'100%',background:'#1a1a1a',border:'1px solid #333',color:'#dde6ef',borderRadius:3,padding:'3px 6px',fontSize:11}}/>
                    </div>
                    <div style={{flex:1}}>
                      <span style={{color:'#888',fontSize:10}}>Weight</span>
                      <select value={selectedLayer?.fontWeight||400}
                        onChange={e=>{ if(selectedLayer) updateLayer(selectedLayer.id,{fontWeight:Number(e.target.value)}); }}
                        style={{width:'100%',background:'#1a1a1a',border:'1px solid #333',color:'#dde6ef',borderRadius:3,padding:'3px 6px',fontSize:11}}>
                        {[100,200,300,400,500,600,700,800,900].map(w=><option key={w} value={w}>{w}</option>)}
                      </select>
                    </div>
                  </div>

                  <div style={{display:'flex',gap:4}}>
                    {['normal','italic','oblique'].map(st=>(
                      <button key={st} onClick={()=>{ setFontStyle(st); if(selectedLayer) updateLayer(selectedLayer.id,{fontStyle:st}); }}
                        style={{flex:1,padding:'3px 0',border:'none',borderRadius:3,cursor:'pointer',fontSize:10,
                          background:(selectedLayer?.fontStyle||fontStyle)===st?'#FF6600':'#1a1f2e',
                          color:(selectedLayer?.fontStyle||fontStyle)===st?'#fff':'#888',fontStyle:st}}>
                        {st}
                      </button>
                    ))}
                  </div>

                  <span style={{color:'#888',fontSize:10}}>Letter Spacing</span>
                  <div style={{display:'flex',gap:6,alignItems:'center'}}>
                    <input type="range" min={-10} max={50} step={0.5}
                      value={selectedLayer?.letterSpacing||letterSpacing}
                      onChange={e=>{ const v=Number(e.target.value); setLetterSpacing(v); if(selectedLayer) updateLayer(selectedLayer.id,{letterSpacing:v}); }}
                      style={{flex:1}}/>
                    <span style={{color:'#00ffc8',fontSize:10,width:32,textAlign:'right'}}>{selectedLayer?.letterSpacing||letterSpacing}</span>
                  </div>

                  <span style={{color:'#888',fontSize:10}}>Line Height</span>
                  <div style={{display:'flex',gap:6,alignItems:'center'}}>
                    <input type="range" min={0.8} max={4} step={0.05}
                      value={selectedLayer?.lineHeight||lineHeight}
                      onChange={e=>{ const v=Number(e.target.value); setLineHeight(v); if(selectedLayer) updateLayer(selectedLayer.id,{lineHeight:v}); }}
                      style={{flex:1}}/>
                    <span style={{color:'#00ffc8',fontSize:10,width:32,textAlign:'right'}}>{(selectedLayer?.lineHeight||lineHeight).toFixed(2)}</span>
                  </div>

                  <span style={{color:'#888',fontSize:10}}>Decoration</span>
                  <div style={{display:'flex',gap:4}}>
                    {['none','underline','line-through','overline'].map(d=>(
                      <button key={d} onClick={()=>{ setTextDecoration(d); if(selectedLayer) updateLayer(selectedLayer.id,{textDecoration:d}); }}
                        style={{flex:1,padding:'3px 0',border:'none',borderRadius:3,cursor:'pointer',fontSize:9,
                          background:(selectedLayer?.textDecoration||textDecoration)===d?'#FF6600':'#1a1f2e',
                          color:(selectedLayer?.textDecoration||textDecoration)===d?'#fff':'#888'}}>
                        {d==='none'?'—':d==='underline'?'U̲':d==='line-through'?'S̶':'Ō'}
                      </button>
                    ))}
                  </div>

                  <span style={{color:'#888',fontSize:10}}>Transform</span>
                  <div style={{display:'flex',gap:4}}>
                    {['none','uppercase','lowercase','capitalize'].map(t=>(
                      <button key={t} onClick={()=>{ setTextTransformV(t); if(selectedLayer) updateLayer(selectedLayer.id,{textTransformV:t}); }}
                        style={{flex:1,padding:'3px 0',border:'none',borderRadius:3,cursor:'pointer',fontSize:9,
                          background:(selectedLayer?.textTransformV||textTransformV)===t?'#FF6600':'#1a1f2e',
                          color:(selectedLayer?.textTransformV||textTransformV)===t?'#fff':'#888'}}>
                        {t==='none'?'Aa':t==='uppercase'?'AA':t==='lowercase'?'aa':'Aa'}
                      </button>
                    ))}
                  </div>
                </div>
              )}


              {/* VARIABLE FONT AXES */}
              <div style={{marginTop:6,borderTop:'1px solid #21262d',paddingTop:6}}>
                <div style={{color:'#888',fontSize:10,marginBottom:4}}>Variable Font Axes</div>
                {VARI_AXES.map(ax=>{
                  const val = (selectedLayer?.variAxes||variAxes)[ax.id]||ax.default;
                  return (
                    <div key={ax.id} style={{display:'flex',alignItems:'center',gap:6,marginBottom:4}}>
                      <span style={{color:'#888',fontSize:9,width:60}}>{ax.label}</span>
                      <input type="range" min={ax.min} max={ax.max} step={ax.step} value={val}
                        onChange={e=>{
                          const newAxes = {...(selectedLayer?.variAxes||variAxes), [ax.id]:Number(e.target.value)};
                          setVariAxes(newAxes);
                          if (selectedLayer) {
                            const variSettings = buildVariSettings(newAxes);
                            updateLayer(selectedLayer.id, {variAxes:newAxes, variSettings});
                          }
                        }} style={{flex:1}}/>
                      <span style={{color:'#00ffc8',fontSize:9,width:28,textAlign:'right'}}>{val}</span>
                    </div>
                  );
                })}
              </div>

              {/* CHARACTER STYLES */}
              <div style={{borderTop:'1px solid #21262d',paddingTop:6}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}}>
                  <span style={{color:'#888',fontSize:10}}>Character Styles</span>
                  <button onClick={()=>setShowCharStyles(s=>!s)}
                    style={{background:'none',border:'none',color:'#00ffc8',cursor:'pointer',fontSize:10}}>
                    {showCharStyles?'▲':'▼'}
                  </button>
                </div>

                {showCharStyles && (
                  <div style={{display:'flex',flexDirection:'column',gap:4}}>
                    <div style={{fontSize:9,color:'#555',marginBottom:2}}>
                      Select text layer, set cursor range below, then apply style.
                    </div>

                    {/* Range picker */}
                    <div style={{display:'flex',gap:4,alignItems:'center'}}>
                      <span style={{color:'#888',fontSize:9,width:32}}>From</span>
                      <input type="number" min={0}
                        max={(selectedLayer?.text||'').length-1}
                        value={selRange?.start||0}
                        onChange={e=>setSelRange(r=>({...r||{end:0},start:Number(e.target.value)}))}
                        style={{width:48,background:'#1a1a1a',border:'1px solid #333',color:'#dde6ef',borderRadius:3,padding:'2px 4px',fontSize:10}}/>
                      <span style={{color:'#888',fontSize:9,width:20}}>To</span>
                      <input type="number" min={0}
                        max={(selectedLayer?.text||'').length-1}
                        value={selRange?.end||0}
                        onChange={e=>setSelRange(r=>({...r||{start:0},end:Number(e.target.value)}))}
                        style={{width:48,background:'#1a1a1a',border:'1px solid #333',color:'#dde6ef',borderRadius:3,padding:'2px 4px',fontSize:10}}/>
                      <button onClick={clearCharStyles}
                        style={{background:'#1a1f2e',border:'1px solid #333',color:'#aaa',borderRadius:3,padding:'2px 6px',cursor:'pointer',fontSize:9}}>
                        Clear
                      </button>
                    </div>

                    {/* Style presets */}
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:4,marginTop:4}}>
                      {charStyles.map(cs=>(
                        <button key={cs.id} onClick={()=>applyCharStyle(Object.fromEntries(Object.entries(cs.props).filter(([,v])=>v!==null)))}
                          style={{padding:'4px 6px',border:'1px solid #21262d',borderRadius:3,cursor:'pointer',fontSize:10,
                            background:'#1a1f2e',color:'#dde6ef',textAlign:'left'}}>
                          {cs.name}
                        </button>
                      ))}
                    </div>

                    {/* Save current selection as new style */}
                    <button onClick={()=>{
                      if (!selectedLayer) return;
                      const name = prompt('Style name:');
                      if (!name) return;
                      const props = {
                        fontWeight: selectedLayer.fontWeight||400,
                        fontSize:   selectedLayer.fontSize||24,
                        fill:       selectedLayer.fill||'#000000',
                        fontFamily: selectedLayer.fontFamily||'Inter',
                      };
                      setCharStyles(cs=>[...cs,{id:`cs_${Date.now()}`,name,props}]);
                    }}
                      style={{marginTop:4,background:'#0d1117',border:'1px solid #00ffc8',color:'#00ffc8',borderRadius:3,
                        padding:'4px 8px',cursor:'pointer',fontSize:10}}>
                      + Save Current as Style
                    </button>
                  </div>
                )}
              </div>

              {/* PARAGRAPH TAB */}
              {activeTypoTab==='paragraph' && (
                <div style={{display:'flex',flexDirection:'column',gap:6}}>
                  <span style={{color:'#888',fontSize:10}}>Alignment</span>
                  <div style={{display:'flex',gap:4}}>
                    {['left','center','right','justify'].map(a=>(
                      <button key={a} onClick={()=>{ if(selectedLayer) updateLayer(selectedLayer.id,{textAlign:a}); }}
                        style={{flex:1,padding:'4px 0',border:'none',borderRadius:3,cursor:'pointer',fontSize:12,
                          background:(selectedLayer?.textAlign||'left')===a?'#00ffc8':'#1a1f2e',
                          color:(selectedLayer?.textAlign||'left')===a?'#06060f':'#888'}}>
                        {a==='left'?'⬅':a==='center'?'☰':a==='right'?'➡':'≡'}
                      </button>
                    ))}
                  </div>

                  <span style={{color:'#888',fontSize:10}}>Paragraph Styles</span>
                  <div style={{display:'flex',flexDirection:'column',gap:4}}>
                    {PARAGRAPH_STYLES.map(ps=>(
                      <button key={ps.name} onClick={()=>{ if(selectedLayer) updateLayer(selectedLayer.id,{
                          fontSize:ps.fontSize, fontWeight:ps.fontWeight,
                          lineHeight:ps.lineHeight, letterSpacing:ps.letterSpacing,
                          textAlign:ps.textAlign,
                        });
                      }}
                        style={{background:'#1a1f2e',border:'1px solid #21262d',color:'#dde6ef',borderRadius:4,
                          padding:'5px 10px',cursor:'pointer',textAlign:'left',fontSize:10,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                        <span style={{fontWeight:ps.fontWeight,fontSize:Math.min(ps.fontSize,14)}}>{ps.name}</span>
                        <span style={{color:'#555',fontSize:9}}>{ps.fontSize}px / {ps.fontWeight}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* PATH TAB */}
              {activeTypoTab==='path' && (
                <div style={{display:'flex',flexDirection:'column',gap:6}}>
                  <label style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer'}}>
                    <input type="checkbox"
                      checked={selectedLayer?.textOnPath||false}
                      onChange={e=>{ if(selectedLayer) updateLayer(selectedLayer.id,{textOnPath:e.target.checked}); }}/>
                    <span style={{color:'#dde6ef',fontSize:11}}>Text on Path</span>
                  </label>

                  {selectedLayer?.textOnPath && (
                    <>
                      <span style={{color:'#888',fontSize:10}}>Target Path Layer</span>
                      <select value={selectedLayer?.textOnPathId||''}
                        onChange={e=>{ if(selectedLayer) updateLayer(selectedLayer.id,{textOnPathId:e.target.value}); }}
                        style={{background:'#1a1a1a',border:'1px solid #333',color:'#dde6ef',borderRadius:3,padding:'4px 6px',fontSize:11}}>
                        <option value="">— select path —</option>
                        {project.layers.filter(l=>l.type==='path'&&l.id!==selectedLayer?.id).map(l=>(
                          <option key={l.id} value={l.id}>{l.name}</option>
                        ))}
                      </select>

                      <span style={{color:'#888',fontSize:10}}>Path Offset</span>
                      <div style={{display:'flex',gap:6,alignItems:'center'}}>
                        <input type="range" min={0} max={100} step={1}
                          value={selectedLayer?.pathOffset||0}
                          onChange={e=>{ if(selectedLayer) updateLayer(selectedLayer.id,{pathOffset:Number(e.target.value)}); }}
                          style={{flex:1}}/>
                        <span style={{color:'#00ffc8',fontSize:10,width:32}}>{selectedLayer?.pathOffset||0}%</span>
                      </div>
                    </>
                  )}

                  {!selectedLayer?.textOnPath && (
                    <div style={{color:'#555',fontSize:10,fontStyle:'italic'}}>
                      Enable "Text on Path", then select a path layer to flow text along its curve.
                    </div>
                  )}
                </div>
              )}

              {/* OPENTYPE TAB */}
              {activeTypoTab==='opentype' && (
                <div style={{display:'flex',flexDirection:'column',gap:6}}>
                  <span style={{color:'#888',fontSize:10}}>OpenType Features</span>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:4}}>
                    {OPENTYPE_FEATURES.map(f=>{
                      const active = (selectedLayer?.otFeatures||otFeatures)[f.id];
                      return (
                        <button key={f.id} onClick={()=>{
                          const cur = selectedLayer?.otFeatures||otFeatures;
                          const next = {...cur,[f.id]:!cur[f.id]};
                          setOtFeatures(next);
                          if(selectedLayer) updateLayer(selectedLayer.id,{otFeatures:next});
                        }}
                          style={{padding:'5px 6px',border:'none',borderRadius:3,cursor:'pointer',fontSize:10,
                            background:active?'#00ffc8':'#1a1f2e',color:active?'#06060f':'#888',textAlign:'left'}}>
                          {f.label}
                        </button>
                      );
                    })}
                  </div>
                  <div style={{color:'#555',fontSize:9,marginTop:4}}>
                    Features apply via CSS font-feature-settings. Requires font support.
                  </div>
                </div>
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
      <button title="AI Fill" onClick={()=>setAiFillOpen(true)} style={{position:'fixed',bottom:24,right:24,zIndex:1000,width:48,height:48,borderRadius:'50%',background:'#FF6600',border:'none',color:'#fff',fontSize:20,cursor:'pointer',boxShadow:'0 4px 16px rgba(255,102,0,0.5)'}}>✦</button>
      {aiFillOpen&&(
        <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.85)',zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center'}}>
          <div style={{background:'#0d1117',border:'1px solid #21262d',borderRadius:8,padding:20,width:540,maxHeight:'90vh',overflowY:'auto',display:'flex',flexDirection:'column',gap:12}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span style={{color:'#00ffc8',fontFamily:'JetBrains Mono',fontSize:13,fontWeight:700}}>✦ Content-Aware AI Fill</span>
              <button onClick={()=>setAiFillOpen(false)} style={{background:'none',border:'none',color:'#888',cursor:'pointer',fontSize:18}}>✕</button>
            </div>
            <div style={{fontSize:11,color:'#666'}}>Paint mask over area to fill. White=replace, black=keep.</div>
            <div style={{position:'relative',width:'100%',background:'#111',borderRadius:4,overflow:'hidden',border:'1px solid #333',aspectRatio:`${project.width}/${project.height}`}}>
              <canvas ref={maskCanvasRef} width={project.width} height={project.height}
                style={{position:'absolute',top:0,left:0,width:'100%',height:'100%',cursor:'crosshair',opacity:0.55}}
                onMouseDown={onMaskMDV} onMouseMove={onMaskMMV} onMouseUp={onMaskMUV} onMouseLeave={onMaskMUV}/>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <span style={{color:'#888',fontSize:11,width:70}}>Brush</span>
              <input type="range" min={5} max={200} value={maskBrushSize} onChange={e=>setMaskBrushSize(Number(e.target.value))} style={{flex:1}}/>
              <span style={{color:'#00ffc8',fontSize:11,width:28}}>{maskBrushSize}</span>
              <button onClick={clearMaskVec} style={{background:'#1a1f2e',border:'1px solid #333',color:'#aaa',borderRadius:4,padding:'2px 8px',cursor:'pointer',fontSize:11}}>Clear</button>
            </div>
            <input value={aiFillPrompt} onChange={e=>setAiFillPrompt(e.target.value)}
              placeholder="Prompt: seamless texture, gradient sky…"
              style={{background:'#06060f',border:'1px solid #333',borderRadius:4,padding:'7px 10px',color:'#dde6ef',fontSize:12,fontFamily:'JetBrains Mono',outline:'none'}}/>
            {aiFillResult&&<img src={aiFillResult} alt="AI Result" style={{width:'100%',borderRadius:4,border:'1px solid #333'}}/>}
            <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
              {aiFillResult&&<button onClick={acceptAiFillVec} style={{background:'#00ffc8',color:'#06060f',border:'none',borderRadius:4,padding:'7px 18px',cursor:'pointer',fontWeight:700,fontSize:12}}>✓ Accept as Layer</button>}
              <button onClick={runAiFillVec} disabled={aiFillLoading}
                style={{background:aiFillLoading?'#333':'#FF6600',color:'#fff',border:'none',borderRadius:4,padding:'7px 18px',cursor:aiFillLoading?'not-allowed':'pointer',fontWeight:700,fontSize:12}}>
                {aiFillLoading?'⏳ Generating…':'✦ Generate Fill'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── SVG → 3D Extrude button ──────────────────────────────────────── */}
      <button title="Extrude to 3D"
        onClick={()=>{ setExtrudeOpen(true); setTimeout(()=>{ initExtrudeScene(); buildExtrudeMesh(); },80); }}
        style={{position:'fixed',bottom:80,right:24,zIndex:1000,width:48,height:48,borderRadius:'50%',
          background:'#0d1117',border:'2px solid #FF6600',color:'#FF6600',
          fontSize:16,cursor:'pointer',boxShadow:'0 4px 16px rgba(255,102,0,0.3)',fontWeight:700}}>
        3D
      </button>

      {/* ── Extrude Modal ─────────────────────────────────────────────────── */}
      {extrudeOpen && (
        <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.9)',zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center'}}>
          <div style={{background:'#0d1117',border:'1px solid #21262d',borderRadius:8,width:740,maxHeight:'90vh',
            display:'flex',flexDirection:'column',overflow:'hidden'}}>

            {/* Header */}
            <div style={{height:44,background:'#0a0e1a',borderBottom:'1px solid #21262d',
              display:'flex',alignItems:'center',gap:12,padding:'0 16px',flexShrink:0}}>
              <span style={{color:'#FF6600',fontFamily:'JetBrains Mono',fontSize:13,fontWeight:700}}>⬡ SVG → 3D Extrude</span>
              <span style={{color:'#555',fontSize:11}}>{project.layers.filter(l=>l.type==='path').length} path layers</span>
              <div style={{flex:1}}/>
              <button onClick={()=>{ destroyExtrudeScene(); setExtrudeOpen(false); }}
                style={{background:'none',border:'none',color:'#888',cursor:'pointer',fontSize:20}}>✕</button>
            </div>

            <div style={{display:'flex',flex:1,overflow:'hidden'}}>
              {/* 3D Preview */}
              <div style={{flex:1,position:'relative',background:'#06060f',minHeight:360}}>
                <canvas ref={extrudeCanvasRef} width={480} height={360}
                  style={{width:'100%',height:'100%',display:'block',cursor:'grab'}}
                  onMouseDown={onExtrudeOrbitDown} onMouseMove={onExtrudeOrbitMove}
                  onMouseUp={onExtrudeOrbitUp} onMouseLeave={onExtrudeOrbitUp}
                  onWheel={onExtrudeWheel}/>
                <div style={{position:'absolute',bottom:8,left:8,color:'#333',fontSize:9,fontFamily:'JetBrains Mono'}}>
                  Drag to orbit · Scroll to zoom · Auto-rotating
                </div>
              </div>

              {/* Controls */}
              <div style={{width:220,background:'#0d1117',borderLeft:'1px solid #21262d',
                padding:14,display:'flex',flexDirection:'column',gap:10,overflowY:'auto',flexShrink:0}}>

                {/* Mode toggle */}
                <div style={{display:'flex',gap:4,marginBottom:4}}>
                  {[['flat','Flat Extrude'],['midas','AI Depth (MiDaS)']].map(([id,lbl])=>(
                    <button key={id} onClick={()=>{ setDepthMode(id); if(id==='flat') buildExtrudeMesh(); }}
                      style={{flex:1,padding:'4px',border:'none',borderRadius:3,cursor:'pointer',fontSize:9,fontWeight:700,
                        background:depthMode===id?'#00ffc8':'#1a1f2e',color:depthMode===id?'#06060f':'#888'}}>
                      {lbl}
                    </button>
                  ))}
                </div>

                {/* Depth */}
                {depthMode==='flat' && <div>
                  <div style={{color:'#888',fontSize:10,marginBottom:4}}>Extrude Depth</div>
                  <input type="range" min={0.01} max={2} step={0.01} value={extrudeDepth}
                    onChange={e=>{ setExtrudeDepth(Number(e.target.value)); setTimeout(buildExtrudeMesh,10); }}
                    style={{width:'100%'}}/>
                  <span style={{color:'#FF6600',fontSize:10}}>{extrudeDepth.toFixed(2)}</span>
                </div>

                </div>}

                {/* MiDaS AI Depth */}
                {depthMode==='midas' && (
                  <div style={{display:'flex',flexDirection:'column',gap:6}}>
                    <div style={{color:'#555',fontSize:9,lineHeight:1.5}}>
                      Rasterizes your SVG and sends it to MiDaS depth estimation. Result is displaced as a 3D surface.
                    </div>
                    <div style={{display:'flex',gap:6,alignItems:'center'}}>
                      <span style={{color:'#888',fontSize:10,width:60}}>Strength</span>
                      <input type="range" min={0.1} max={3} step={0.1} value={depthStrength}
                        onChange={e=>setDepthStrength(Number(e.target.value))} style={{flex:1}}/>
                      <span style={{color:'#00ffc8',fontSize:9,width:24}}>{depthStrength.toFixed(1)}</span>
                    </div>
                    <button onClick={runMiDaS} disabled={depthLoading}
                      style={{background:depthLoading?'#333':'#00ffc8',color:depthLoading?'#555':'#06060f',
                        border:'none',borderRadius:4,padding:'6px',cursor:depthLoading?'not-allowed':'pointer',
                        fontWeight:700,fontSize:11}}>
                      {depthLoading ? '⏳ Running MiDaS…' : '✦ Generate AI Depth'}
                    </button>
                    {depthMapUrl && (
                      <div style={{display:'flex',flexDirection:'column',gap:4}}>
                        <span style={{color:'#888',fontSize:9}}>Depth map:</span>
                        <img src={depthMapUrl} alt="depth" style={{width:'100%',borderRadius:4,border:'1px solid #333'}}/>
                        <button onClick={()=>applyDepthMapToMesh(depthMapUrl)}
                          style={{background:'#1a1f2e',border:'1px solid #FF6600',color:'#FF6600',
                            borderRadius:3,padding:'4px',cursor:'pointer',fontSize:10}}>
                          ↺ Reapply to Mesh
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Bevel */}
                {depthMode==='flat' && <div>
                  <div style={{color:'#888',fontSize:10,marginBottom:4}}>Bevel Size</div>
                  <input type="range" min={0} max={0.2} step={0.005} value={extrudeBevel}
                    onChange={e=>{ setExtrudeBevel(Number(e.target.value)); setTimeout(buildExtrudeMesh,10); }}
                    style={{width:'100%'}}/>
                  <span style={{color:'#FF6600',fontSize:10}}>{extrudeBevel.toFixed(3)}</span>
                </div>

                </div>}
                {/* Material */}
                <div>
                  <div style={{color:'#888',fontSize:10,marginBottom:6}}>Material</div>
                  <div style={{display:'flex',flexDirection:'column',gap:3}}>
                    {EXTRUDE_MATERIALS.map(m=>(
                      <button key={m.id} onClick={()=>{ setExtrudeMaterial(m.id); setTimeout(buildExtrudeMesh,10); }}
                        style={{padding:'5px 8px',border:'none',borderRadius:4,cursor:'pointer',fontSize:10,
                          textAlign:'left',display:'flex',alignItems:'center',gap:8,
                          background:extrudeMaterial===m.id?'#1a1f2e':'transparent',
                          color:extrudeMaterial===m.id?'#dde6ef':'#666',
                          borderLeft:`3px solid ${m.color}`}}>
                        <div style={{width:12,height:12,borderRadius:'50%',background:m.color,flexShrink:0}}/>
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Rebuild */}
                <button onClick={buildExtrudeMesh}
                  style={{background:'#1a1f2e',border:'1px solid #333',color:'#aaa',
                    borderRadius:4,padding:'6px',cursor:'pointer',fontSize:11}}>
                  ↺ Rebuild Mesh
                </button>

                {/* Info */}
                <div style={{background:'#06060f',borderRadius:4,padding:'8px',fontSize:9,color:'#555',lineHeight:1.5}}>
                  {project.layers.filter(l=>l.type==='path').length > 0
                    ? `Extruding ${project.layers.filter(l=>l.type==='path').length} path layer(s) from your vector art.`
                    : 'No path layers found — showing demo star shape. Draw paths in the canvas first.'}
                </div>

                {/* Export */}
                <div style={{borderTop:'1px solid #21262d',paddingTop:8,marginTop:4}}>
                  <div style={{color:'#888',fontSize:10,marginBottom:6}}>Export 3D Mesh</div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:4}}>
                    {[['glb','GLB'],['obj','OBJ'],['png','PNG'],['svg','SVG']].map(([fmt,lbl])=>(
                      <button key={fmt} onClick={()=>exportAs(fmt)} disabled={exportLoading}
                        style={{padding:'5px',border:'1px solid #21262d',borderRadius:3,cursor:'pointer',fontSize:10,
                          background:'#0d1117',color:'#aaa'}}>
                        ↓ {lbl}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div style={{display:'flex',flexDirection:'column',gap:6,marginTop:'auto'}}>
                  <button onClick={sendToCompositor}
                    style={{background:'#FF6600',border:'none',color:'#fff',borderRadius:4,
                      padding:'8px',cursor:'pointer',fontWeight:700,fontSize:12}}>
                    → Send to 3D Compositor
                  </button>
                  <button onClick={sendToMotionStudio}
                    style={{background:motionTarget?'#00ffc8':'#1a1f2e',
                      border:'1px solid #333',color:motionTarget?'#06060f':'#aaa',borderRadius:4,
                      padding:'6px',cursor:'pointer',fontSize:11,fontWeight:motionTarget?700:400}}>
                    {motionTarget ? '✓ Sent!' : '→ Send to Motion Studio'}
                  </button>
                  <button onClick={sendToVideoEditor}
                    style={{background:videoTarget?'#00ffc8':'#1a1f2e',
                      border:'1px solid #333',color:videoTarget?'#06060f':'#aaa',borderRadius:4,
                      padding:'6px',cursor:'pointer',fontSize:11,fontWeight:videoTarget?700:400}}>
                    {videoTarget ? '✓ Sent!' : '→ Send to Video Editor'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

  </> );
}
