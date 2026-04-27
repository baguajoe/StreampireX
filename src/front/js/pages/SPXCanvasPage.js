// src/front/js/pages/SPXCanvasPage.js
// SPX Canvas — Photoshop-rival canvas editor with real Canvas 2D rendering

import { saveToCloud, listCloudProjects, loadFromCloud, deleteCloudProject } from "../utils/cloudSave";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { renderCanvas, hitTestLayers, exportCanvasPNG, exportCanvasJPG, exportCanvasWebP } from "../utils/spxcanvas/canvasEngine";
import {
  applyBrightnessContrast, applyHueSaturation, applyLevels, applyCurves,
  applyColorBalance, applyVibrance, applySharpening, applyNoiseReduction,
  applyExposure, applyPhotoFilter, applyDodge, applyBurn, applySmudge,
  applyCloneStamp, applyHealing
} from "../utils/spxcanvas/adjustments";
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
  { id:'heal',       icon:'✚',  label:'Healing Brush',  shortcut:'J', group:'retouch' },
  { id:'clone',      icon:'⊕',  label:'Clone Stamp',    shortcut:'S', group:'retouch' },
  { id:'dodge',      icon:'◯',  label:'Dodge',          shortcut:'O', group:'retouch' },
  { id:'burn',       icon:'●',  label:'Burn',           shortcut:'O', group:'retouch' },
  { id:'smudge',     icon:'∿',  label:'Smudge',         shortcut:'',  group:'retouch' },
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

function SPXMenuDropdown({ label, items }) {
  const [open, setOpen] = React.useState(false);
  const canvasToBase64 = () => { const c = canvasRef.current; return c ? c.toDataURL('image/png').split(',')[1] : ''; };
  const maskToBase64   = () => { const m = maskCanvasRef.current; return m ? m.toDataURL('image/png').split(',')[1] : ''; };
  const clearMask = () => { const m = maskCanvasRef.current; if (m) m.getContext('2d').clearRect(0,0,m.width,m.height); };
  const drawMask = (e) => {
    const m = maskCanvasRef.current; if (!m) return;
    const r = m.getBoundingClientRect();
    const x = (e.clientX - r.left) * (m.width / r.width);
    const y = (e.clientY - r.top)  * (m.height / r.height);
    const ctx = m.getContext('2d');
    ctx.fillStyle = 'white'; ctx.beginPath();
    ctx.arc(x, y, maskBrushSize / 2, 0, Math.PI * 2); ctx.fill();
  };
  const onMaskMD = (e) => { maskPainting.current = true;  drawMask(e); };
  const onMaskMM = (e) => { if (maskPainting.current) drawMask(e); };
  const onMaskMU = ()  => { maskPainting.current = false; };
  const runAiFill = async () => {
    setAiFillLoading(true); setAiFillResult(null);
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token') || '';
      const res = await fetch('/api/ai-fill/inpaint', {
        method:'POST', headers:{'Content-Type':'application/json', Authorization:`Bearer ${token}`},
        body: JSON.stringify({ image: canvasToBase64(), mask: maskToBase64(), prompt: aiFillPrompt }),
      });
      const data = await res.json();
      if (data.url) setAiFillResult(data.url);
      else setStatus('AI Fill error: ' + (data.error||'unknown'));
    } catch(err) { setStatus('AI Fill: ' + err.message); }
    setAiFillLoading(false);
  };
  const acceptAiFill = () => {
    if (!aiFillResult) return;
    const nl = { id:`${Date.now()}_aifill`, type:'image', name:'AI Fill', visible:true, locked:false,
      opacity:1, blendMode:'normal', x:0, y:0, width:project.width, height:project.height, src:aiFillResult, effects:[] };
    setProject(p => ({...p, layers:[...p.layers, nl]}));
    setAiFillOpen(false); setAiFillResult(null); clearMask();
  };

  return (
    <div className="spx-menu-item" onMouseLeave={() => setOpen(false)}>
      <button className="spx-menu-btn" onMouseEnter={() => setOpen(true)} onClick={() => setOpen(o => !o)}>
        {label}
      </button>
      {open && (
        <div className="spx-menu-dropdown">
          {items.map(item => (
            <button key={item.label} className="spx-menu-dropdown-item"
              onClick={() => { item.action(); setOpen(false); }}>
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SPXCanvasPage() {
  const canvasRef   = useRef(null);
  const aiFillPreviewRef = useRef(null);
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
  const [aiFillOpen,    setAiFillOpen]    = useState(false);
  const [aiFillPrompt,  setAiFillPrompt]  = useState('');
  const [aiFillLoading, setAiFillLoading] = useState(false);
  const [aiFillResult,  setAiFillResult]  = useState(null);
  const maskCanvasRef = useRef(null);
  const maskPainting  = useRef(false);
  const [maskBrushSize, setMaskBrushSize] = useState(40);
  const [status,       setStatus]       = useState('Ready');
  const [activeTab,    setActiveTab]    = useState('layers');
  const [brushColor,   setBrushColor]   = useState('#00ffc8');
  const [brushSize,    setBrushSize]    = useState(12);
  const [brushHardness,setBrushHardness]= useState(0.8);
  const [brushOpacity, setBrushOpacity] = useState(1);
  const [cloneSrc,     setCloneSrc]     = useState(null);
  const [showMaskPanel,setShowMaskPanel] = useState(false);
  const [photoFilter,  setPhotoFilter]   = useState('warming');
  const [filterDensity,setFilterDensity] = useState(0.25);
  const [exposure,     setExposure]      = useState(0);
  const [showAdjustPanel, setShowAdjustPanel] = useState(false);
  const [brightness,   setBrightness]   = useState(0);
  const [contrastAdj,  setContrastAdj]  = useState(1);
  const [hue,          setHue]          = useState(0);
  const [saturation,   setSaturation]   = useState(1);
  const [lightness,    setLightness]    = useState(0);
  const [vibrance,     setVibrance]     = useState(0);
  const [inBlack,      setInBlack]      = useState(0);
  const [inWhite,      setInWhite]      = useState(255);
  const [gamma,        setGamma]        = useState(1);
  const [showPhotoFilter, setShowPhotoFilter] = useState(false);
  const [showCloudPanel,  setShowCloudPanel]  = useState(false);
  const [cloudProjects,   setCloudProjects]   = useState([]);
  const [cloneSource,     setCloneSource]     = useState(null);
  const [retouchRadius,   setRetouchRadius]   = useState(20);
  const [retouchStrength, setRetouchStrength] = useState(0.4);
  const lastRetouchPt     = useRef(null);
  // ── Curves state ──────────────────────────────────────────────────────────
  const [curvesPoints,  setCurvesPoints]  = useState([{x:0,y:0},{x:255,y:255}]);
  const [activeChannel, setActiveChannel] = useState('rgb'); // rgb|r|g|b
  const [sharpAmount,   setSharpAmount]   = useState(0.5);
  const [noiseAmount,   setNoiseAmount]   = useState(0);
  const [showResizeDialog, setShowResizeDialog] = useState(false);
  const [resizeW,       setResizeW]       = useState(0);
  const [resizeH,       setResizeH]       = useState(0);
  const [showMaskEditor,setShowMaskEditor] = useState(false);
  const [layerMasks,    setLayerMasks]    = useState({});
  const curvesCanvasRef   = useRef(null);
  const histCanvasRef     = useRef(null);
  const liquifyCanvasRef  = useRef(null);
  const liquifyCtxRef     = useRef(null);
  const liquifyImgRef     = useRef(null);
  // ── Filter Gallery ──────────────────────────────────────────────────────────
  const [showFilterGallery, setShowFilterGallery] = useState(false);
  const [filterPreview,     setFilterPreview]     = useState(null);
  // ── Liquify ─────────────────────────────────────────────────────────────────
  const [showLiquify,       setShowLiquify]       = useState(false);
  const [liquifyBrush,      setLiquifyBrush]      = useState(60);
  const [liquifyStrength,   setLiquifyStrength]   = useState(0.3);
  const [liquifyMode,       setLiquifyMode]       = useState('push'); // push|bloat|pucker|smooth
  const liquifyPainting    = useRef(false);
  // ── Layer Masks ─────────────────────────────────────────────────────────────
  const [maskTarget,        setMaskTarget]        = useState(null); // layerId
  const maskPaintRef        = useRef(false);
  const layerMaskRefs       = useRef({});
  // ── Color Balance ───────────────────────────────────────────────────────────
  const [cbShadows,         setCbShadows]         = useState([0,0,0]);
  const [cbMidtones,        setCbMidtones]        = useState([0,0,0]);
  const [cbHighlights,      setCbHighlights]      = useState([0,0,0]);
  const [cbTone,            setCbTone]            = useState('midtones');
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

  // ─── Apply pixel adjustment to canvas ──────────────────────────────────────
  const applyAdjustToCanvas = useCallback((fn) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    snapshot();
    const ctx = canvas.getContext('2d');
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const result = fn(imgData);
    ctx.putImageData(result, 0, 0);
    setStatus('Adjustment applied');
  }, [snapshot]);

  // ─── Cloud save/load ────────────────────────────────────────────────────────
  const handleCloudSave = useCallback(async () => {
    try {
      await saveToCloud('canvas', project.name, project);
      setStatus('✓ Saved to cloud');
    } catch(e) { setStatus('Cloud save failed: ' + e.message); }
  }, [project]);

  const handleCloudLoad = useCallback(async () => {
    try {
      const list = await listCloudProjects();
      setCloudProjects(list || []);
      setShowCloudPanel(true);
    } catch(e) { setStatus('Cloud load failed: ' + e.message); }
  }, []);

  const loadCloudProject = useCallback(async (id) => {
    try {
      const loaded = await loadFromCloud(id);
      if (loaded) { setProject(loaded); setShowCloudPanel(false); setStatus('✓ Project loaded'); }
    } catch(e) { setStatus('Load failed: ' + e.message); }
  }, []);

  // ── Drawing Tablet Support (Wacom, Huion, XP-Pen, Apple Pencil) ──
  const tabletPressure = useRef(1.0);
  const tabletTiltX = useRef(0);
  const tabletTiltY = useRef(0);

  // ── Curves renderer ──────────────────────────────────────────────────────
  const renderCurves = React.useCallback(() => {
    const cv = curvesCanvasRef.current; if (!cv) return;
    const ctx = cv.getContext('2d');
    const W = cv.width, H = cv.height;
    ctx.clearRect(0,0,W,H);
    // Background
    ctx.fillStyle='#1a1a1a'; ctx.fillRect(0,0,W,H);
    // Grid
    ctx.strokeStyle='#333'; ctx.lineWidth=0.5;
    [64,128,192].forEach(v=>{
      ctx.beginPath(); ctx.moveTo(v/255*W,0); ctx.lineTo(v/255*W,H); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0,H-v/255*H); ctx.lineTo(W,H-v/255*H); ctx.stroke();
    });
    // Diagonal reference
    ctx.strokeStyle='#444'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(0,H); ctx.lineTo(W,0); ctx.stroke();
    // Curve
    const pts = [...curvesPoints].sort((a,b)=>a.x-b.x);
    ctx.strokeStyle = activeChannel==='r'?'#ff4444':activeChannel==='g'?'#44ff44':activeChannel==='b'?'#4488ff':'#00ffc8';
    ctx.lineWidth=2; ctx.beginPath();
    pts.forEach((p,i)=>{
      const cx=p.x/255*W, cy=H-p.y/255*H;
      if(i===0) ctx.moveTo(cx,cy); else ctx.lineTo(cx,cy);
    });
    ctx.stroke();
    // Control points
    pts.forEach(p=>{
      ctx.beginPath(); ctx.arc(p.x/255*W, H-p.y/255*H, 5, 0, Math.PI*2);
      ctx.fillStyle='#fff'; ctx.fill();
      ctx.strokeStyle='#333'; ctx.lineWidth=1.5; ctx.stroke();
    });
  }, [curvesPoints, activeChannel]);

  React.useEffect(()=>{ renderCurves(); },[renderCurves]);

  const addCurvePoint = React.useCallback((e) => {
    const cv = curvesCanvasRef.current; if (!cv) return;
    const rect = cv.getBoundingClientRect();
    const x = Math.round(((e.clientX-rect.left)/rect.width)*255);
    const y = Math.round((1-(e.clientY-rect.top)/rect.height)*255);
    setCurvesPoints(prev=>[...prev,{x:Math.max(0,Math.min(255,x)),y:Math.max(0,Math.min(255,y))}]);
  }, []);

  const applyCurvesToLayer = React.useCallback(() => {
    if (!selectedLayer) return;
    const pts = [...curvesPoints].sort((a,b)=>a.x-b.x);
    const lut = new Uint8Array(256);
    for (let i=0;i<256;i++) {
      let lo=pts[0], hi=pts[pts.length-1];
      for (let j=0;j<pts.length-1;j++) { if(pts[j].x<=i&&pts[j+1].x>=i){lo=pts[j];hi=pts[j+1];break;} }
      const t = lo.x===hi.x ? 0 : (i-lo.x)/(hi.x-lo.x);
      lut[i] = Math.max(0,Math.min(255,Math.round(lo.y+(hi.y-lo.y)*t)));
    }
    snapshot();
    applyAdjustToCanvas(layer => {
      if (!layer.imageData) return layer;
      const d = new Uint8ClampedArray(layer.imageData.data);
      for (let i=0;i<d.length;i+=4) {
        if (activeChannel==='rgb'||activeChannel==='r') d[i]  =lut[d[i]];
        if (activeChannel==='rgb'||activeChannel==='g') d[i+1]=lut[d[i+1]];
        if (activeChannel==='rgb'||activeChannel==='b') d[i+2]=lut[d[i+2]];
      }
      return {...layer, imageData:{...layer.imageData,data:d}};
    });
    setStatus('Curves applied');
  }, [curvesPoints, activeChannel, selectedLayer, snapshot, applyAdjustToCanvas]);

  const applyLevelsToLayer = React.useCallback(() => {
    if (!selectedLayer) return;
    snapshot();
    applyAdjustToCanvas(layer => applyLevels(layer, inBlack, inWhite, gamma));
    setStatus('Levels applied');
  }, [selectedLayer, inBlack, inWhite, gamma, snapshot, applyAdjustToCanvas]);

  const applyBCToLayer = React.useCallback(() => {
    if (!selectedLayer) return;
    snapshot();
    applyAdjustToCanvas(layer => applyBrightnessContrast(layer, brightness, contrastAdj));
    setStatus('Brightness/Contrast applied');
  }, [selectedLayer, brightness, contrastAdj, snapshot, applyAdjustToCanvas]);

  const applyHSLToLayer = React.useCallback(() => {
    if (!selectedLayer) return;
    snapshot();
    applyAdjustToCanvas(layer => applyHueSaturation(layer, hue, saturation, lightness));
    setStatus('Hue/Saturation applied');
  }, [selectedLayer, hue, saturation, lightness, snapshot, applyAdjustToCanvas]);

  const applyVibranceToLayer = React.useCallback(() => {
    if (!selectedLayer) return;
    snapshot();
    applyAdjustToCanvas(layer => applyVibrance(layer, vibrance));
    setStatus('Vibrance applied');
  }, [selectedLayer, vibrance, snapshot, applyAdjustToCanvas]);

  const applySharpenToLayer = React.useCallback(() => {
    if (!selectedLayer) return;
    snapshot();
    applyAdjustToCanvas(imgData => applySharpening(imgData, canvasRef.current?.width || project.width, canvasRef.current?.height || project.height, sharpAmount));
    setStatus('Sharpening applied');
  }, [selectedLayer, sharpAmount, snapshot, applyAdjustToCanvas]);

  const applyNoiseRedToLayer = React.useCallback(() => {
    if (!selectedLayer) return;
    snapshot();
    applyAdjustToCanvas(imgData => applyNoiseReduction(imgData, canvasRef.current?.width || project.width, canvasRef.current?.height || project.height, noiseAmount));
    setStatus('Noise reduction applied');
  }, [selectedLayer, noiseAmount, snapshot, applyAdjustToCanvas]);

  const applyResizeCanvas = React.useCallback(() => {
    if (!resizeW || !resizeH) return;
    snapshot();
    setProject(p=>({...p, width:resizeW, height:resizeH}));
    setShowResizeDialog(false);
    setStatus(`Canvas resized to ${resizeW}×${resizeH}`);
  }, [resizeW, resizeH, snapshot]);

  const toggleLayerMask = React.useCallback((layerId) => {
    setLayerMasks(prev=>({...prev,[layerId]:!prev[layerId]}));
    setStatus('Layer mask toggled');
  }, []);

  // ── Histogram renderer ───────────────────────────────────────────────────
  const renderHistogram = React.useCallback(() => {
    const cv = histCanvasRef.current; if (!cv) return;
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = cv.getContext('2d');
    const W = cv.width, H = cv.height;
    ctx.clearRect(0,0,W,H);
    ctx.fillStyle='#1a1a1a'; ctx.fillRect(0,0,W,H);
    const srcCtx = canvas.getContext('2d');
    const imgData = srcCtx.getImageData(0,0,canvas.width,canvas.height);
    const d = imgData.data;
    const rHist=new Uint32Array(256),gHist=new Uint32Array(256),bHist=new Uint32Array(256),lHist=new Uint32Array(256);
    for(let i=0;i<d.length;i+=4){
      rHist[d[i]]++; gHist[d[i+1]]++; bHist[d[i+2]]++;
      lHist[Math.round(0.299*d[i]+0.587*d[i+1]+0.114*d[i+2])]++;
    }
    const maxVal = Math.max(...lHist);
    const drawChannel = (hist, color) => {
      ctx.fillStyle = color;
      for(let i=0;i<256;i++){
        const h = (hist[i]/maxVal)*H;
        ctx.fillRect(i/256*W, H-h, W/256+1, h);
      }
    };
    drawChannel(rHist,'rgba(255,80,80,0.5)');
    drawChannel(gHist,'rgba(80,255,80,0.5)');
    drawChannel(bHist,'rgba(80,120,255,0.5)');
    drawChannel(lHist,'rgba(255,255,255,0.7)');
    // Grid lines
    ctx.strokeStyle='#333'; ctx.lineWidth=0.5;
    [64,128,192].forEach(v=>{
      ctx.beginPath(); ctx.moveTo(v/255*W,0); ctx.lineTo(v/255*W,H); ctx.stroke();
    });
  }, []);

  React.useEffect(()=>{ if(activeTab==='adjust') renderHistogram(); },[activeTab, project, renderHistogram]);

  // ── Layer Mask helpers ────────────────────────────────────────────────────
  const addLayerMask = React.useCallback((layerId) => {
    setMaskTarget(layerId);
    setStatus('Layer mask added — paint black to hide, white to reveal');
  }, []);

  const applyLayerMask = React.useCallback((layerId) => {
    const maskCv = layerMaskRefs.current[layerId]; if (!maskCv) return;
    snapshot();
    const mainCv = canvasRef.current; if (!mainCv) return;
    const mainCtx = mainCv.getContext('2d');
    const maskCtx = maskCv.getContext('2d');
    const mainData = mainCtx.getImageData(0,0,mainCv.width,mainCv.height);
    const maskData = maskCtx.getImageData(0,0,maskCv.width,maskCv.height);
    for(let i=0;i<mainData.data.length;i+=4){
      const maskVal = maskData.data[i]/255;
      mainData.data[i+3] = Math.round(mainData.data[i+3]*maskVal);
    }
    mainCtx.putImageData(mainData,0,0);
    setMaskTarget(null);
    setLayerMasks(prev=>({...prev,[layerId]:false}));
    setStatus('Layer mask applied');
  }, [snapshot]);

  const deleteMask = React.useCallback((layerId) => {
    setMaskTarget(null);
    setLayerMasks(prev=>{ const n={...prev}; delete n[layerId]; return n; });
    setStatus('Layer mask deleted');
  }, []);

  // ── Color Balance ─────────────────────────────────────────────────────────
  const applyColorBalance = React.useCallback(() => {
    if(!selectedLayer) return;
    snapshot();
    applyAdjustToCanvas(imgData => {
      const d=imgData.data;
      const tone=cbTone;
      const [cr,cg,cb2]= tone==='shadows'?cbShadows:tone==='highlights'?cbHighlights:cbMidtones;
      for(let i=0;i<d.length;i+=4){
        const lum=(d[i]+d[i+1]+d[i+2])/3/255;
        let weight=1;
        if(tone==='shadows') weight=Math.max(0,1-lum*2);
        else if(tone==='highlights') weight=Math.max(0,lum*2-1);
        else weight=Math.max(0,1-Math.abs(lum-0.5)*2);
        d[i]  =Math.min(255,Math.max(0,d[i]  +cr*weight));
        d[i+1]=Math.min(255,Math.max(0,d[i+1]+cg*weight));
        d[i+2]=Math.min(255,Math.max(0,d[i+2]+cb2*weight));
      }
      return imgData;
    });
    setStatus('Color Balance applied');
  }, [selectedLayer, cbTone, cbShadows, cbMidtones, cbHighlights, snapshot, applyAdjustToCanvas]);

  // ── Filter Gallery ────────────────────────────────────────────────────────
  const FILTER_GALLERY = [
    { id:'emboss',      label:'Emboss',       fn:(d)=>{ const o=new Uint8ClampedArray(d.data); const W=d.width; for(let i=0;i<o.length;i+=4){ const r=d.data[i]-d.data[i+4]+128,g=d.data[i+1]-d.data[i+5]+128,b=d.data[i+2]-d.data[i+6]+128; o[i]=r;o[i+1]=g;o[i+2]=b;o[i+3]=255;} return new ImageData(o,d.width,d.height); }},
    { id:'edge_detect', label:'Edge Detect',  fn:(d)=>{ const o=new Uint8ClampedArray(d.data.length); const W=d.width,H=d.height; for(let y=1;y<H-1;y++)for(let x=1;x<W-1;x++){const i=(y*W+x)*4,u=((y-1)*W+x)*4,dn=((y+1)*W+x)*4; const gx=d.data[i]-d.data[i+4],gy=d.data[i]-d.data[dn]; const m=Math.min(255,Math.abs(gx)+Math.abs(gy)); o[i]=m;o[i+1]=m;o[i+2]=m;o[i+3]=255;} return new ImageData(o,W,H); }},
    { id:'posterize',   label:'Posterize',    fn:(d,lv=4)=>{ const o=new Uint8ClampedArray(d.data); for(let i=0;i<o.length;i+=4){ o[i]=Math.round(o[i]/255*(lv-1))/(lv-1)*255; o[i+1]=Math.round(o[i+1]/255*(lv-1))/(lv-1)*255; o[i+2]=Math.round(o[i+2]/255*(lv-1))/(lv-1)*255;} return new ImageData(o,d.width,d.height); }},
    { id:'sepia',       label:'Sepia',        fn:(d)=>{ const o=new Uint8ClampedArray(d.data); for(let i=0;i<o.length;i+=4){ const r=d.data[i],g=d.data[i+1],b=d.data[i+2]; o[i]=Math.min(255,r*.393+g*.769+b*.189); o[i+1]=Math.min(255,r*.349+g*.686+b*.168); o[i+2]=Math.min(255,r*.272+g*.534+b*.131); o[i+3]=d.data[i+3];} return new ImageData(o,d.width,d.height); }},
    { id:'cross_process',label:'Cross Process',fn:(d)=>{ const o=new Uint8ClampedArray(d.data); for(let i=0;i<o.length;i+=4){ o[i]=Math.min(255,d.data[i]*1.4); o[i+1]=Math.min(255,d.data[i+1]*0.8); o[i+2]=Math.min(255,d.data[i+2]*1.2); o[i+3]=d.data[i+3];} return new ImageData(o,d.width,d.height); }},
    { id:'warming',     label:'Warming',      fn:(d)=>{ const o=new Uint8ClampedArray(d.data); for(let i=0;i<o.length;i+=4){ o[i]=Math.min(255,d.data[i]+20); o[i+1]=Math.min(255,d.data[i+1]+5); o[i+2]=Math.max(0,d.data[i+2]-15); o[i+3]=d.data[i+3];} return new ImageData(o,d.width,d.height); }},
    { id:'cooling',     label:'Cooling',      fn:(d)=>{ const o=new Uint8ClampedArray(d.data); for(let i=0;i<o.length;i+=4){ o[i]=Math.max(0,d.data[i]-15); o[i+1]=Math.min(255,d.data[i+1]+5); o[i+2]=Math.min(255,d.data[i+2]+20); o[i+3]=d.data[i+3];} return new ImageData(o,d.width,d.height); }},
    { id:'vintage',     label:'Vintage',      fn:(d)=>{ const o=new Uint8ClampedArray(d.data); for(let i=0;i<o.length;i+=4){ const r=d.data[i],g=d.data[i+1],b=d.data[i+2]; o[i]=Math.min(255,r*.8+60); o[i+1]=Math.min(255,g*.75+40); o[i+2]=Math.min(255,b*.7+20); o[i+3]=d.data[i+3];} return new ImageData(o,d.width,d.height); }},
    { id:'noir',        label:'Noir',         fn:(d)=>{ const o=new Uint8ClampedArray(d.data); for(let i=0;i<o.length;i+=4){ const lum=Math.round(0.299*d.data[i]+0.587*d.data[i+1]+0.114*d.data[i+2]); const c=lum>128?Math.min(255,lum*1.3):Math.max(0,lum*0.7); o[i]=o[i+1]=o[i+2]=c; o[i+3]=d.data[i+3];} return new ImageData(o,d.width,d.height); }},
    { id:'duotone',     label:'Duotone',      fn:(d)=>{ const o=new Uint8ClampedArray(d.data); for(let i=0;i<o.length;i+=4){ const lum=(d.data[i]+d.data[i+1]+d.data[i+2])/3/255; o[i]=Math.round(lum*0+255*(1-lum)); o[i+1]=Math.round(lum*255); o[i+2]=Math.round(lum*200); o[i+3]=d.data[i+3];} return new ImageData(o,d.width,d.height); }},
    { id:'halftone',    label:'Halftone',     fn:(d)=>{ const o=new Uint8ClampedArray(d.data.length).fill(255); const W=d.width,dot=6; for(let y=0;y<d.height;y+=dot)for(let x=0;x<W;x+=dot){ const i=(y*W+x)*4; const lum=1-(d.data[i]+d.data[i+1]+d.data[i+2])/3/255; const r=lum*dot*0.5; for(let dy=0;dy<dot;dy++)for(let dx=0;dx<dot;dx++){ if(Math.hypot(dx-dot/2,dy-dot/2)<r){const pi=((y+dy)*W+(x+dx))*4;o[pi]=o[pi+1]=o[pi+2]=0;o[pi+3]=255;}}} return new ImageData(o,W,d.height); }},
    { id:'pixelate',    label:'Pixelate',     fn:(d,sz=8)=>{ const o=new Uint8ClampedArray(d.data); const W=d.width; for(let y=0;y<d.height;y+=sz)for(let x=0;x<W;x+=sz){ const i=(y*W+x)*4; const r=d.data[i],g=d.data[i+1],b=d.data[i+2]; for(let dy=0;dy<sz;dy++)for(let dx=0;dx<sz;dx++){const pi=((y+dy)*W+(x+dx))*4;o[pi]=r;o[pi+1]=g;o[pi+2]=b;}} return new ImageData(o,W,d.height); }},
  ];

  const applyFilter = React.useCallback((filterId) => {
    const flt = FILTER_GALLERY.find(f=>f.id===filterId); if(!flt) return;
    const canvas = canvasRef.current; if(!canvas) return;
    snapshot();
    const ctx = canvas.getContext('2d');
    const imgData = ctx.getImageData(0,0,canvas.width,canvas.height);
    const result = flt.fn(imgData);
    ctx.putImageData(result,0,0);
    setShowFilterGallery(false);
    setStatus(`Filter applied: ${flt.label}`);
  }, [snapshot]);

  // ── Liquify ───────────────────────────────────────────────────────────────
  const initLiquify = React.useCallback(() => {
    const canvas = canvasRef.current; if(!canvas) return;
    const lCv = liquifyCanvasRef.current; if(!lCv) return;
    lCv.width=canvas.width; lCv.height=canvas.height;
    const ctx=lCv.getContext('2d');
    ctx.drawImage(canvas,0,0);
    liquifyCtxRef.current=ctx;
    const imgData=ctx.getImageData(0,0,lCv.width,lCv.height);
    liquifyImgRef.current=new Uint8ClampedArray(imgData.data);
  }, []);

  const liquifyPush = React.useCallback((cx,cy) => {
    const lCv=liquifyCanvasRef.current; if(!lCv||!liquifyImgRef.current) return;
    const ctx=liquifyCtxRef.current;
    const W=lCv.width,H=lCv.height;
    const src=new Uint8ClampedArray(liquifyImgRef.current);
    const dst=ctx.getImageData(0,0,W,H);
    const d=dst.data;
    const r=liquifyBrush,str=liquifyStrength;
    for(let y=Math.max(0,cy-r);y<Math.min(H,cy+r);y++){
      for(let x=Math.max(0,cx-r);x<Math.min(W,cx+r);x++){
        const dist=Math.hypot(x-cx,y-cy);
        if(dist>r) continue;
        const falloff=1-dist/r;
        const force=falloff*str*10;
        let sx=x,sy=y;
        if(liquifyMode==='push'){sx=x-force;sy=y-force;}
        else if(liquifyMode==='bloat'){sx=cx+(x-cx)*(1-falloff*str);sy=cy+(y-cy)*(1-falloff*str);}
        else if(liquifyMode==='pucker'){sx=cx+(x-cx)*(1+falloff*str);sy=cy+(y-cy)*(1+falloff*str);}
        else{sx=x;sy=y;}
        sx=Math.max(0,Math.min(W-1,Math.round(sx)));
        sy=Math.max(0,Math.min(H-1,Math.round(sy)));
        const di=(y*W+x)*4, si=(sy*W+sx)*4;
        d[di]=src[si];d[di+1]=src[si+1];d[di+2]=src[si+2];d[di+3]=src[si+3];
      }
    }
    ctx.putImageData(dst,0,0);
    liquifyImgRef.current=new Uint8ClampedArray(dst.data);
  }, [liquifyBrush, liquifyStrength, liquifyMode]);

  const applyLiquify = React.useCallback(() => {
    const lCv=liquifyCanvasRef.current; if(!lCv) return;
    const canvas=canvasRef.current; if(!canvas) return;
    snapshot();
    const ctx=canvas.getContext('2d');
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.drawImage(lCv,0,0);
    setShowLiquify(false);
    setStatus('Liquify applied');
  }, [snapshot]);

  const onPointerDown = useCallback((e) => {
    // Capture pointer for tablet support
    e.currentTarget.setPointerCapture(e.pointerId);
    // Read tablet pressure (0.0-1.0), default 1.0 for mouse
    tabletPressure.current = e.pressure || 1.0;
    tabletTiltX.current = e.tiltX || 0;
    tabletTiltY.current = e.tiltY || 0;
    const e2 = { ...e, clientX: e.clientX, clientY: e.clientY };
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
        brushSize: Math.max(1, brushSize * tabletPressure.current),
        brushOpacity: brushOpacity * (0.3 + tabletPressure.current * 0.7),
        brushHardness,
        tiltX: tabletTiltX.current,
        tiltY: tabletTiltY.current,
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

    if (activeTool==='magic_wand') {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const sel = magicWandSelect(imgData, canvas.width, canvas.height, Math.floor(pt.x), Math.floor(pt.y), 30);
        setSelection(sel);
        setStatus(`Magic Wand: selected region at (${Math.floor(pt.x)}, ${Math.floor(pt.y)})`);
      }
    }

    if (activeTool==='eyedropper') {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        const px = ctx.getImageData(Math.floor(pt.x), Math.floor(pt.y), 1, 1).data;
        const hex = '#' + [px[0],px[1],px[2]].map(v=>v.toString(16).padStart(2,'0')).join('');
        setBrushColor(hex);
        setStatus(`Eyedropper: picked ${hex}`);
      }
    }

    if (activeTool==='heal' || activeTool==='clone' || activeTool==='dodge' || activeTool==='burn' || activeTool==='smudge') {
      if (activeTool==='clone' && e.altKey) {
        setCloneSource({ x: Math.floor(pt.x), y: Math.floor(pt.y) });
        setStatus(`Clone source set at (${Math.floor(pt.x)}, ${Math.floor(pt.y)})`);
        return;
      }
      lastRetouchPt.current = { x: Math.floor(pt.x), y: Math.floor(pt.y) };
      setDragState({ kind:'retouch', tool: activeTool });
      snapshot();
    }
  }, [activeTool, project, getCanvasPoint, addLayer, brushColor, brushSize, brushOpacity, brushHardness, snapshot, snapToGrid, gridSize]);

  const onPointerMove = useCallback((e) => {
    // Update tablet pressure on move
    if (e.pressure > 0) {
      tabletPressure.current = e.pressure;
      tabletTiltX.current = e.tiltX || 0;
      tabletTiltY.current = e.tiltY || 0;
    }
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

    if (dragState.kind==='retouch') {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const W = canvas.width;
      const H = canvas.height;
      const x = Math.floor(pt.x);
      const y = Math.floor(pt.y);
      const radius = brushSize / 2;
      const strength = brushOpacity;
      const lp = lastRetouchPt.current || { x, y };
      switch (dragState.tool) {
        case 'dodge':
          applyDodge(imgData, x, y, radius, strength, W);
          break;
        case 'burn':
          applyBurn(imgData, x, y, radius, strength, W);
          break;
        case 'smudge':
          applySmudge(imgData, lp.x, lp.y, x - lp.x, y - lp.y, radius, strength, W);
          break;
        case 'clone':
          if (cloneSource) {
            const dx = x - lp.x;
            const dy = y - lp.y;
            applyCloneStamp(imgData, cloneSource.x + dx, cloneSource.y + dy, x, y, radius, W);
          }
          break;
        case 'heal':
          applyHealing(imgData, x, y, radius, W, H);
          break;
        default:
          break;
      }
      ctx.putImageData(imgData, 0, 0);
      lastRetouchPt.current = { x, y };
    }
  }, [dragState, getCanvasPoint, updateLayer, project.width, project.height, brushSize, brushOpacity, cloneSource]);

  const onPointerUp = useCallback(() => {
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
        if (e.key==='a') { e.preventDefault(); setSelectedId(null); setSelection(createRectSelection(0,0,project.width,project.height)); setStatus('All selected'); }
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

  return (<>
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
        <div style={{width:1,height:20,background:'#444',margin:'0 4px'}}/>
        <button style={S.btn()} onClick={()=>{setShowFilterGallery(true);}} title="Filter Gallery">🎨 Filters</button>
        <button style={S.btn()} onClick={()=>{setShowLiquify(true);setTimeout(initLiquify,50);}} title="Liquify">💧 Liquify</button>
        <button style={S.btn()} onClick={flattenAll} title="Flatten all layers to one">⬇ Flatten</button>
        <button style={S.btn()} onClick={mergeDown} title="Merge selected layer down">⬇ Merge</button>
        <button style={S.btn()} onClick={()=>{setResizeW(project.width);setResizeH(project.height);setShowResizeDialog(true);}} title="Resize canvas">⛶ Resize</button>
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
        <div ref={stageRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
          style={{...S.center, touchAction:'none', cursor:
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
                {type:'exposure',label:'Exposure',key:'value',min:-3,max:3,step:0.1,default:0},
                {type:'vibrance',label:'Vibrance',key:'value',min:-1,max:1,step:0.05,default:0},
                {type:'photo_filter',label:'Photo Filter',key:'value',min:0,max:1,step:0.05,default:0.25},
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

          {/* Adjust Tab */}
          {activeTab==='adjust' && (
            <div style={{padding:10,display:'flex',flexDirection:'column',gap:10,overflowY:'auto'}}>

              {/* Curves */}
              <div>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}}>
                  <div style={S.label}>Curves</div>
                  <div style={{display:'flex',gap:3}}>
                    {['rgb','r','g','b'].map(ch=>(
                      <button key={ch} onClick={()=>setActiveChannel(ch)}
                        style={{...S.btn(activeChannel===ch),padding:'1px 5px',fontSize:9,
                          background:activeChannel===ch?(ch==='r'?'#ff4444':ch==='g'?'#44ff44':ch==='b'?'#4488ff':'#00ffc8'):'#333',
                          color:activeChannel===ch?'#000':'#aaa'}}>
                        {ch.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
                <canvas ref={curvesCanvasRef} width={200} height={200}
                  style={{width:'100%',border:'1px solid #333',borderRadius:4,cursor:'crosshair',display:'block'}}
                  onClick={addCurvePoint}/>
                <div style={{display:'flex',gap:4,marginTop:4}}>
                  <button onClick={()=>setCurvesPoints([{x:0,y:0},{x:255,y:255}])}
                    style={{...S.btn(false),flex:1,fontSize:9}}>Reset</button>
                  <button onClick={applyCurvesToLayer} disabled={!selectedLayer} title="Note: adjustments apply to the live canvas but persistence to layers requires v1.1's per-layer raster buffers"
                    style={{...S.btn(true),flex:1,fontSize:9,opacity:selectedLayer?1:0.4}}>Apply</button>
                </div>
              </div>

              {/* Levels */}
              <div style={{borderTop:'1px solid #333',paddingTop:8}}>
                <div style={S.label}>Levels</div>
                {[['Black Point','inBlack',setInBlack,0,255,inBlack],
                  ['White Point','inWhite',setInWhite,0,255,inWhite],
                  ['Gamma','gamma',setGamma,0.1,3,gamma]].map(([lbl,key,setter,min,max,val])=>(
                  <div key={key} style={{marginBottom:6}}>
                    <div style={{display:'flex',justifyContent:'space-between'}}>
                      <span style={{color:'#888',fontSize:10}}>{lbl}</span>
                      <span style={{color:'#00ffc8',fontSize:10}}>{Number(val).toFixed(key==='gamma'?2:0)}</span>
                    </div>
                    <input type="range" min={min} max={max} step={key==='gamma'?0.05:1} value={val}
                      onChange={e=>setter(Number(e.target.value))} style={{width:'100%'}}/>
                  </div>
                ))}
                <button onClick={applyLevelsToLayer} disabled={!selectedLayer} title="Note: adjustments apply to the live canvas but persistence to layers requires v1.1's per-layer raster buffers"
                  style={{...S.btn(true),width:'100%',fontSize:9,opacity:selectedLayer?1:0.4}}>Apply Levels</button>
              </div>

              {/* Brightness / Contrast */}
              <div style={{borderTop:'1px solid #333',paddingTop:8}}>
                <div style={S.label}>Brightness / Contrast</div>
                {[['Brightness','brightness',setBrightness,-1,1,0.01,brightness],
                  ['Contrast','contrastAdj',setContrastAdj,0,3,0.05,contrastAdj]].map(([lbl,key,setter,min,max,step,val])=>(
                  <div key={key} style={{marginBottom:6}}>
                    <div style={{display:'flex',justifyContent:'space-between'}}>
                      <span style={{color:'#888',fontSize:10}}>{lbl}</span>
                      <span style={{color:'#00ffc8',fontSize:10}}>{Number(val).toFixed(2)}</span>
                    </div>
                    <input type="range" min={min} max={max} step={step} value={val}
                      onChange={e=>setter(Number(e.target.value))} style={{width:'100%'}}/>
                  </div>
                ))}
                <button onClick={applyBCToLayer} disabled={!selectedLayer} title="Note: adjustments apply to the live canvas but persistence to layers requires v1.1's per-layer raster buffers"
                  style={{...S.btn(true),width:'100%',fontSize:9,opacity:selectedLayer?1:0.4}}>Apply B/C</button>
              </div>

              {/* Hue / Saturation / Lightness */}
              <div style={{borderTop:'1px solid #333',paddingTop:8}}>
                <div style={S.label}>Hue / Saturation</div>
                {[['Hue','hue',setHue,-180,180,1,hue],
                  ['Saturation','saturation',setSaturation,0,3,0.05,saturation],
                  ['Lightness','lightness',setLightness,-1,1,0.05,lightness],
                  ['Vibrance','vibrance',setVibrance,-1,1,0.05,vibrance]].map(([lbl,key,setter,min,max,step,val])=>(
                  <div key={key} style={{marginBottom:6}}>
                    <div style={{display:'flex',justifyContent:'space-between'}}>
                      <span style={{color:'#888',fontSize:10}}>{lbl}</span>
                      <span style={{color:'#00ffc8',fontSize:10}}>{Number(val).toFixed(key==='hue'?0:2)}</span>
                    </div>
                    <input type="range" min={min} max={max} step={step} value={val}
                      onChange={e=>setter(Number(e.target.value))} style={{width:'100%'}}/>
                  </div>
                ))}
                <div style={{display:'flex',gap:4}}>
                  <button onClick={applyHSLToLayer} disabled={!selectedLayer} title="Note: adjustments apply to the live canvas but persistence to layers requires v1.1's per-layer raster buffers"
                    style={{...S.btn(true),flex:1,fontSize:9,opacity:selectedLayer?1:0.4}}>Apply H/S</button>
                  <button onClick={applyVibranceToLayer} disabled={!selectedLayer} title="Note: adjustments apply to the live canvas but persistence to layers requires v1.1's per-layer raster buffers"
                    style={{...S.btn(true),flex:1,fontSize:9,opacity:selectedLayer?1:0.4}}>Apply Vib</button>
                </div>
              </div>

              {/* Sharpen + Noise Reduction */}
              <div style={{borderTop:'1px solid #333',paddingTop:8}}>
                <div style={S.label}>Sharpen / Noise</div>
                <div style={{marginBottom:6}}>
                  <div style={{display:'flex',justifyContent:'space-between'}}>
                    <span style={{color:'#888',fontSize:10}}>Sharpen Amount</span>
                    <span style={{color:'#00ffc8',fontSize:10}}>{sharpAmount.toFixed(2)}</span>
                  </div>
                  <input type="range" min={0} max={2} step={0.05} value={sharpAmount}
                    onChange={e=>setSharpAmount(Number(e.target.value))} style={{width:'100%'}}/>
                  <button onClick={applySharpenToLayer} disabled={!selectedLayer} title="Note: adjustments apply to the live canvas but persistence to layers requires v1.1's per-layer raster buffers"
                    style={{...S.btn(true),width:'100%',marginTop:4,fontSize:9,opacity:selectedLayer?1:0.4}}>Apply Sharpen</button>
                </div>
                <div>
                  <div style={{display:'flex',justifyContent:'space-between'}}>
                    <span style={{color:'#888',fontSize:10}}>Noise Reduction</span>
                    <span style={{color:'#00ffc8',fontSize:10}}>{noiseAmount.toFixed(2)}</span>
                  </div>
                  <input type="range" min={0} max={1} step={0.05} value={noiseAmount}
                    onChange={e=>setNoiseAmount(Number(e.target.value))} style={{width:'100%'}}/>
                  <button onClick={applyNoiseRedToLayer} disabled={!selectedLayer} title="Note: adjustments apply to the live canvas but persistence to layers requires v1.1's per-layer raster buffers"
                    style={{...S.btn(true),width:'100%',marginTop:4,fontSize:9,opacity:selectedLayer?1:0.4}}>Apply Noise Red</button>
                </div>
              </div>

              {/* Color Balance */}
              <div style={{borderTop:'1px solid #333',paddingTop:8}}>
                <div style={S.label}>Color Balance</div>
                <div style={{display:'flex',gap:4,marginBottom:6}}>
                  {['shadows','midtones','highlights'].map(t=>(
                    <button key={t} onClick={()=>setCbTone(t)}
                      style={{...S.btn(cbTone===t),flex:1,fontSize:9,padding:'2px 2px',textTransform:'capitalize'}}>{t}</button>
                  ))}
                </div>
                {[['Cyan/Red',0],['Magenta/Green',1],['Yellow/Blue',2]].map(([lbl,idx])=>{
                  const arr=cbTone==='shadows'?cbShadows:cbTone==='highlights'?cbHighlights:cbMidtones;
                  const setter=cbTone==='shadows'?setCbShadows:cbTone==='highlights'?setCbHighlights:setCbMidtones;
                  return(
                    <div key={idx} style={{marginBottom:4}}>
                      <div style={{display:'flex',justifyContent:'space-between'}}>
                        <span style={{color:'#888',fontSize:10}}>{lbl}</span>
                        <span style={{color:'#00ffc8',fontSize:10}}>{arr[idx]}</span>
                      </div>
                      <input type="range" min={-100} max={100} value={arr[idx]}
                        onChange={e=>{const n=[...arr];n[idx]=Number(e.target.value);setter(n);}}
                        style={{width:'100%'}}/>
                    </div>
                  );
                })}
                <button onClick={applyColorBalance} disabled={!selectedLayer}
                  style={{...S.btn(true),width:'100%',fontSize:9,opacity:selectedLayer?1:0.4}}>Apply Color Balance</button>
              </div>

              {/* Histogram */}
              <div style={{borderTop:'1px solid #333',paddingTop:8}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}}>
                  <div style={S.label}>Histogram</div>
                  <button onClick={renderHistogram} style={{...S.btn(false),fontSize:9,padding:'1px 6px'}}>↺</button>
                </div>
                <canvas ref={histCanvasRef} width={240} height={80}
                  style={{width:'100%',border:'1px solid #333',borderRadius:4,display:'block'}}/>
                <div style={{display:'flex',justifyContent:'space-around',marginTop:3}}>
                  {[['R','rgba(255,80,80,0.8)'],['G','rgba(80,255,80,0.8)'],['B','rgba(80,120,255,0.8)'],['L','rgba(255,255,255,0.7)']].map(([ch,col])=>(
                    <span key={ch} style={{color:col,fontSize:9}}>{ch}</span>
                  ))}
                </div>
              </div>

              {/* Layer Masks */}
              <div style={{borderTop:'1px solid #333',paddingTop:8}}>
                <div style={S.label}>Layer Masks</div>
                {project.layers.map(l=>(
                  <div key={l.id} style={{display:'flex',alignItems:'center',gap:4,marginBottom:4}}>
                    <span style={{flex:1,color:'#888',fontSize:10,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{l.name}</span>
                    {!layerMasks[l.id]?(
                      <button onClick={()=>{setLayerMasks(p=>({...p,[l.id]:true}));addLayerMask(l.id);}}
                        style={{...S.btn(false),fontSize:9,padding:'1px 5px'}}>+ Mask</button>
                    ):(
                      <>
                        <canvas ref={el=>{if(el)layerMaskRefs.current[l.id]=el;}}
                          width={project.width} height={project.height}
                          style={{width:32,height:20,border:'1px solid #555',borderRadius:2,background:'#fff',cursor:'crosshair',
                            outline:maskTarget===l.id?'2px solid #00ffc8':'none'}}
                          onClick={()=>setMaskTarget(maskTarget===l.id?null:l.id)}/>
                        <button onClick={()=>applyLayerMask(l.id)}
                          style={{...S.btn(true),fontSize:9,padding:'1px 5px'}}>Apply</button>
                        <button onClick={()=>deleteMask(l.id)}
                          style={{...S.btn(false),fontSize:9,padding:'1px 5px',color:'#ff4757'}}>✕</button>
                      </>
                    )}
                  </div>
                ))}
                {maskTarget&&(
                  <div style={{background:'#1a1a1a',border:'1px solid #333',borderRadius:4,padding:6,marginTop:4}}>
                    <div style={{color:'#00ffc8',fontSize:10,marginBottom:4}}>Painting mask on: {project.layers.find(l=>l.id===maskTarget)?.name}</div>
                    <div style={{color:'#555',fontSize:9}}>Black = hide · White = reveal</div>
                    <button onClick={()=>setMaskTarget(null)} style={{...S.btn(false),marginTop:4,fontSize:9,width:'100%'}}>Done</button>
                  </div>
                )}
              </div>

              {!selectedLayer&&<div style={{color:'#555',fontSize:10,textAlign:'center',padding:'8px 0'}}>Select a layer to apply adjustments</div>}
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
      {/* ── Filter Gallery Modal ── */}
      {showFilterGallery&&(
        <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.88)',zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center'}}>
          <div style={{background:'#0d1117',border:'1px solid #21262d',borderRadius:8,width:680,maxHeight:'85vh',display:'flex',flexDirection:'column',overflow:'hidden'}}>
            <div style={{height:44,background:'#0a0e1a',borderBottom:'1px solid #21262d',display:'flex',alignItems:'center',padding:'0 16px',gap:12}}>
              <span style={{color:'#00ffc8',fontFamily:'JetBrains Mono',fontSize:13,fontWeight:700}}>🎨 Filter Gallery</span>
              <div style={{flex:1}}/>
              <button onClick={()=>setShowFilterGallery(false)} style={{background:'none',border:'none',color:'#888',cursor:'pointer',fontSize:18}}>✕</button>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,padding:16,overflowY:'auto'}}>
              {FILTER_GALLERY.map(flt=>(
                <div key={flt.id} style={{display:'flex',flexDirection:'column',gap:6,alignItems:'center'}}>
                  <div style={{width:'100%',aspectRatio:'1',background:'#1a1a1a',border:'1px solid #333',borderRadius:4,
                    display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',fontSize:28,
                    transition:'border-color 0.15s'}}
                    onClick={()=>applyFilter(flt.id)}
                    onMouseEnter={e=>e.currentTarget.style.borderColor='#00ffc8'}
                    onMouseLeave={e=>e.currentTarget.style.borderColor='#333'}>
                    {flt.id==='sepia'?'🟤':flt.id==='noir'?'⬛':flt.id==='warming'?'🟠':flt.id==='cooling'?'🔵':flt.id==='vintage'?'🟡':flt.id==='duotone'?'🟣':flt.id==='emboss'?'⬜':flt.id==='edge_detect'?'🔲':flt.id==='posterize'?'🎭':flt.id==='cross_process'?'🌈':flt.id==='halftone'?'⚫':flt.id==='pixelate'?'🔳':'✨'}
                  </div>
                  <span style={{color:'#aaa',fontSize:10,textAlign:'center'}}>{flt.label}</span>
                </div>
              ))}
            </div>
            <div style={{padding:'10px 16px',borderTop:'1px solid #21262d',color:'#555',fontSize:10}}>
              Click a filter to apply it to the canvas. This is non-reversible — use Undo (Ctrl+Z) to revert.
            </div>
          </div>
        </div>
      )}

      {/* ── Liquify Modal ── */}
      {showLiquify&&(
        <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.9)',zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center'}}>
          <div style={{background:'#0d1117',border:'1px solid #21262d',borderRadius:8,width:900,maxHeight:'90vh',display:'flex',flexDirection:'column',overflow:'hidden'}}>
            <div style={{height:44,background:'#0a0e1a',borderBottom:'1px solid #21262d',display:'flex',alignItems:'center',padding:'0 16px',gap:12}}>
              <span style={{color:'#00ffc8',fontFamily:'JetBrains Mono',fontSize:13,fontWeight:700}}>💧 Liquify</span>
              <div style={{flex:1}}/>
              <button onClick={()=>setShowLiquify(false)} style={{background:'none',border:'none',color:'#888',cursor:'pointer',fontSize:18}}>✕</button>
            </div>
            <div style={{display:'flex',flex:1,overflow:'hidden'}}>
              <div style={{flex:1,background:'#1a1a1a',display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden'}}>
                <canvas ref={liquifyCanvasRef}
                  style={{maxWidth:'100%',maxHeight:'calc(90vh - 120px)',cursor:'crosshair',border:'1px solid #333'}}
                  onMouseDown={e=>{liquifyPainting.current=true; const r=e.currentTarget.getBoundingClientRect(); liquifyPush(Math.round((e.clientX-r.left)*(liquifyCanvasRef.current?.width||1)/r.width),Math.round((e.clientY-r.top)*(liquifyCanvasRef.current?.height||1)/r.height));}}
                  onMouseMove={e=>{if(!liquifyPainting.current)return; const r=e.currentTarget.getBoundingClientRect(); liquifyPush(Math.round((e.clientX-r.left)*(liquifyCanvasRef.current?.width||1)/r.width),Math.round((e.clientY-r.top)*(liquifyCanvasRef.current?.height||1)/r.height));}}
                  onMouseUp={()=>liquifyPainting.current=false}
                  onMouseLeave={()=>liquifyPainting.current=false}/>
              </div>
              <div style={{width:220,background:'#0d1117',borderLeft:'1px solid #21262d',padding:12,display:'flex',flexDirection:'column',gap:10}}>
                <div>
                  <div style={{color:'#888',fontSize:10,marginBottom:6,textTransform:'uppercase',letterSpacing:1}}>Mode</div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:4}}>
                    {[['push','↗ Push'],['bloat','⊕ Bloat'],['pucker','⊖ Pucker'],['smooth','∿ Smooth']].map(([m,l])=>(
                      <button key={m} onClick={()=>setLiquifyMode(m)}
                        style={{...S.btn(liquifyMode===m),fontSize:10,padding:'5px 4px'}}>{l}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <div style={{display:'flex',justifyContent:'space-between'}}>
                    <span style={{color:'#888',fontSize:10}}>Brush Size</span>
                    <span style={{color:'#00ffc8',fontSize:10}}>{liquifyBrush}</span>
                  </div>
                  <input type="range" min={10} max={300} value={liquifyBrush}
                    onChange={e=>setLiquifyBrush(Number(e.target.value))} style={{width:'100%'}}/>
                </div>
                <div>
                  <div style={{display:'flex',justifyContent:'space-between'}}>
                    <span style={{color:'#888',fontSize:10}}>Strength</span>
                    <span style={{color:'#00ffc8',fontSize:10}}>{liquifyStrength.toFixed(2)}</span>
                  </div>
                  <input type="range" min={0.05} max={1} step={0.05} value={liquifyStrength}
                    onChange={e=>setLiquifyStrength(Number(e.target.value))} style={{width:'100%'}}/>
                </div>
                <div style={{marginTop:'auto',display:'flex',flexDirection:'column',gap:6}}>
                  <button onClick={initLiquify} style={{...S.btn(false),padding:'6px',fontSize:11}}>↺ Reset</button>
                  <button onClick={applyLiquify}
                    style={{background:'#00ffc8',border:'none',color:'#06060f',borderRadius:4,padding:'8px',cursor:'pointer',fontWeight:700,fontSize:12}}>
                    ✓ Apply Liquify
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Canvas Resize Dialog ── */}
      {showResizeDialog&&(
        <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.8)',zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center'}}>
          <div style={{background:'#0d1117',border:'1px solid #21262d',borderRadius:8,padding:24,width:320,display:'flex',flexDirection:'column',gap:12}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span style={{color:'#00ffc8',fontFamily:'JetBrains Mono',fontSize:13,fontWeight:700}}>⛶ Canvas Size</span>
              <button onClick={()=>setShowResizeDialog(false)} style={{background:'none',border:'none',color:'#888',cursor:'pointer',fontSize:18}}>✕</button>
            </div>
            <div style={{display:'flex',gap:12,alignItems:'center'}}>
              <div style={{flex:1}}>
                <div style={S.label}>Width (px)</div>
                <input type="number" style={S.input} value={resizeW} onChange={e=>setResizeW(Number(e.target.value))}/>
              </div>
              <div style={{flex:1}}>
                <div style={S.label}>Height (px)</div>
                <input type="number" style={S.input} value={resizeH} onChange={e=>setResizeH(Number(e.target.value))}/>
              </div>
            </div>
            <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
              {[['HD','1280x720'],['FHD','1920x1080'],['4K','3840x2160'],['Square','1080x1080'],['Portrait','1080x1920'],['A4','2480x3508']].map(([name,size])=>{
                const [w,h]=size.split('x').map(Number);
                return <button key={name} onClick={()=>{setResizeW(w);setResizeH(h);}}
                  style={{...S.btn(false),fontSize:9,padding:'2px 6px'}}>{name}</button>;
              })}
            </div>
            <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
              <button onClick={()=>setShowResizeDialog(false)} style={{...S.btn(false),padding:'6px 14px'}}>Cancel</button>
              <button onClick={applyResizeCanvas} style={{...S.btn(true),padding:'6px 14px'}}>Apply</button>
            </div>
          </div>
        </div>
      )}

      {/* AI Fill DEFERRED for v1.1 — handlers live in SPXMenuDropdown which is unrendered. To re-enable: hoist runAiFill/acceptAiFill/clearMask/drawMask/onMaskMD/onMaskMM/onMaskMU into the page body. */}
      <button title="AI Fill (coming in v1.1)" disabled style={{position:'fixed',bottom:24,right:24,zIndex:1000,width:48,height:48,borderRadius:'50%',background:'#444',border:'none',color:'#888',fontSize:20,cursor:'not-allowed',boxShadow:'0 4px 16px rgba(0,0,0,0.4)',opacity:0.6}}>✦</button>
      {aiFillOpen&&(
        <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.85)',zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center'}}>
          <div style={{background:'#0d1117',border:'1px solid #21262d',borderRadius:8,padding:20,width:540,maxHeight:'90vh',overflowY:'auto',display:'flex',flexDirection:'column',gap:12}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span style={{color:'#00ffc8',fontFamily:'JetBrains Mono',fontSize:13,fontWeight:700}}>✦ Content-Aware AI Fill</span>
              <button onClick={()=>setAiFillOpen(false)} style={{background:'none',border:'none',color:'#888',cursor:'pointer',fontSize:18}}>✕</button>
            </div>
            <div style={{fontSize:11,color:'#666'}}>Paint mask over area to fill. White=replace, black=keep.</div>
            <div style={{position:'relative',width:'100%',background:'#111',borderRadius:4,overflow:'hidden',border:'1px solid #333',aspectRatio:`${project.width}/${project.height}`}}>
              <canvas ref={aiFillPreviewRef} style={{position:'absolute',top:0,left:0,width:'100%',height:'100%',pointerEvents:'none'}}/>
              <canvas ref={maskCanvasRef} width={project.width} height={project.height}
                style={{position:'absolute',top:0,left:0,width:'100%',height:'100%',cursor:'crosshair',opacity:0.55}}
                onMouseDown={onMaskMD} onMouseMove={onMaskMM} onMouseUp={onMaskMU} onMouseLeave={onMaskMU}/>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <span style={{color:'#888',fontSize:11,width:70}}>Brush</span>
              <input type="range" min={5} max={200} value={maskBrushSize} onChange={e=>setMaskBrushSize(Number(e.target.value))} style={{flex:1}}/>
              <span style={{color:'#00ffc8',fontSize:11,width:28}}>{maskBrushSize}</span>
              <button onClick={clearMask} style={{background:'#1a1f2e',border:'1px solid #333',color:'#aaa',borderRadius:4,padding:'2px 8px',cursor:'pointer',fontSize:11}}>Clear</button>
            </div>
            <input value={aiFillPrompt} onChange={e=>setAiFillPrompt(e.target.value)}
              placeholder="Prompt: seamless grass, brick wall, blue sky…"
              style={{background:'#06060f',border:'1px solid #333',borderRadius:4,padding:'7px 10px',color:'#dde6ef',fontSize:12,fontFamily:'JetBrains Mono',outline:'none'}}/>
            {aiFillResult&&<img src={aiFillResult} alt="AI Result" style={{width:'100%',borderRadius:4,border:'1px solid #333'}}/>}
            <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
              {aiFillResult&&<button onClick={acceptAiFill} style={{background:'#00ffc8',color:'#06060f',border:'none',borderRadius:4,padding:'7px 18px',cursor:'pointer',fontWeight:700,fontSize:12}}>✓ Accept as Layer</button>}
              <button onClick={runAiFill} disabled={aiFillLoading}
                style={{background:aiFillLoading?'#333':'#FF6600',color:'#fff',border:'none',borderRadius:4,padding:'7px 18px',cursor:aiFillLoading?'not-allowed':'pointer',fontWeight:700,fontSize:12}}>
                {aiFillLoading?'⏳ Generating…':'✦ Generate Fill'}
              </button>
            </div>
          </div>
        </div>
      )}

  </> );
}
