import React, { useEffect, useMemo, useRef, useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/SPXCanvas.css";
import { Context } from "../store/appContext";
import { sendToMotion } from "../utils/motionHelpers";

const backendURL = process.env.REACT_APP_BACKEND_URL || "";

const DEFAULT_TEMPLATES = [
  { id: "youtube_thumb", name: "YouTube Thumbnail", width: 1280, height: 720 },
  { id: "album_cover", name: "Album Cover", width: 3000, height: 3000 },
  { id: "podcast_cover", name: "Podcast Cover", width: 3000, height: 3000 },
  { id: "instagram_post", name: "Instagram Post", width: 1080, height: 1080 },
  { id: "story", name: "Story / Reel Cover", width: 1080, height: 1920 },
  { id: "flyer", name: "Flyer", width: 1080, height: 1350 }
];

const BLEND_MODES = [
  "normal",
  "multiply",
  "screen",
  "overlay",
  "darken",
  "lighten",
  "soft-light",
  "hard-light",
  "difference"
];

const makeId = (prefix = "layer") =>
  `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

const createBaseProject = (template = DEFAULT_TEMPLATES[0]) => ({
  id: null,
  name: `Untitled ${template.name}`,
  width: template.width,
  height: template.height,
  background: "#111827",
  layers: []
});

const createTextLayer = () => ({
  id: makeId("text"),
  type: "text",
  name: "Text",
  visible: true,
  locked: false,
  x: 80,
  y: 80,
  width: 320,
  height: 80,
  rotation: 0,
  opacity: 1,
  blendMode: "normal",
  blur: 0,
  brightness: 100,
  contrast: 100,
  saturate: 100,
  text: "SPX Canvas",
  color: "#ffffff",
  fontSize: 42,
  fontWeight: 700,
  textAlign: "left",
  fontFamily: "Inter, sans-serif"
});

const createShapeLayer = (shape = "rect") => ({
  id: makeId("shape"),
  type: "shape",
  shape,
  name: shape === "circle" ? "Circle" : "Rectangle",
  visible: true,
  locked: false,
  x: 120,
  y: 120,
  width: 260,
  height: 180,
  rotation: 0,
  opacity: 1,
  blendMode: "normal",
  blur: 0,
  brightness: 100,
  contrast: 100,
  saturate: 100,
  fill: "#00ffc8",
  stroke: "#ffffff",
  strokeWidth: 0,
  radius: 16
});

const createBrushLayer = (points = []) => ({
  id: makeId("brush"),
  type: "brush",
  name: "Brush Stroke",
  visible: true,
  locked: false,
  x: 0,
  y: 0,
  width: 0,
  height: 0,
  rotation: 0,
  opacity: 1,
  blendMode: "normal",
  blur: 0,
  brightness: 100,
  contrast: 100,
  saturate: 100,
  stroke: "#ffffff",
  strokeWidth: 8,
  points
});

const layerFilter = (layer) =>
  [
    `blur(${layer.blur || 0}px)`,
    `brightness(${layer.brightness || 100}%)`,
    `contrast(${layer.contrast || 100}%)`,
    `saturate(${layer.saturate || 100}%)`
  ].join(" ");

function Field({ label, children }) {
  return (
    <div className="spx-field">
      <label>{label}</label>
      {children}
    </div>
  );
}

function NumberInput({ value, onChange, min, max, step = 1 }) {
  return (
    <input
      type="number"
      value={value}
      min={min}
      max={max}
      step={step}
      onChange={(e) => onChange(parseFloat(e.target.value || 0))}
    />
  );
}

function brushPath(points = []) {
  if (!points.length) return "";
  return points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
}

export default function SPXCanvasPage() {
  const { actions = {} } = useContext(Context);
  const navigate = useNavigate();

  const [project, setProject] = useState(createBaseProject());
  const [selectedId, setSelectedId] = useState(null);
  const [templates, setTemplates] = useState(DEFAULT_TEMPLATES);
  const [recentProjects, setRecentProjects] = useState([]);
  const [assets, setAssets] = useState([]);
  const [activeLeftTab, setActiveLeftTab] = useState("layers");
  const [zoom, setZoom] = useState(1);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("Ready");
  const [history, setHistory] = useState([]);
  const [future, setFuture] = useState([]);
  const [dragState, setDragState] = useState(null);
  const [activeTool, setActiveTool] = useState("move"); // move | brush | eraser | crop
  const [cropRect, setCropRect] = useState(null);
  const [drawingStroke, setDrawingStroke] = useState(null);

  const stageWrapRef = useRef(null);
  const fileInputRef = useRef(null);

  const selectedLayer = useMemo(
    () => project.layers.find((l) => l.id === selectedId) || null,
    [project.layers, selectedId]
  );

  const pushHistory = (nextProject) => {
    setHistory((prev) => [...prev.slice(-39), JSON.parse(JSON.stringify(project))]);
    setFuture([]);
    setProject(nextProject);
  };

  const updateProject = (producer) => {
    const next = JSON.parse(JSON.stringify(project));
    producer(next);
    pushHistory(next);
  };

  const updateLayer = (id, patch) => {
    updateProject((draft) => {
      const idx = draft.layers.findIndex((l) => l.id === id);
      if (idx !== -1) draft.layers[idx] = { ...draft.layers[idx], ...patch };
    });
  };

  const addLayer = (layer) => {
    updateProject((draft) => {
      draft.layers.push(layer);
    });
    setSelectedId(layer.id);
  };

  const removeSelected = () => {
    if (!selectedId) return;
    updateProject((draft) => {
      draft.layers = draft.layers.filter((l) => l.id !== selectedId);
    });
    setSelectedId(null);
  };

  const duplicateSelected = () => {
    if (!selectedLayer) return;
    const clone = JSON.parse(JSON.stringify(selectedLayer));
    clone.id = makeId(selectedLayer.type);
    clone.name = `${selectedLayer.name} Copy`;
    clone.x = (clone.x || 0) + 20;
    clone.y = (clone.y || 0) + 20;
    addLayer(clone);
  };

  const moveLayer = (id, dir) => {
    updateProject((draft) => {
      const idx = draft.layers.findIndex((l) => l.id === id);
      if (idx === -1) return;
      const swap = dir === "up" ? idx + 1 : idx - 1;
      if (swap < 0 || swap >= draft.layers.length) return;
      [draft.layers[idx], draft.layers[swap]] = [draft.layers[swap], draft.layers[idx]];
    });
  };

  const undo = () => {
    if (!history.length) return;
    const prev = history[history.length - 1];
    setFuture((f) => [JSON.parse(JSON.stringify(project)), ...f].slice(0, 40));
    setHistory((h) => h.slice(0, -1));
    setProject(prev);
  };

  const redo = () => {
    if (!future.length) return;
    const next = future[0];
    setHistory((h) => [...h.slice(-39), JSON.parse(JSON.stringify(project))]);
    setFuture((f) => f.slice(1));
    setProject(next);
  };

  const createFromTemplate = (tpl) => {
    const fresh = createBaseProject(tpl);
    setProject(fresh);
    setSelectedId(null);
    setHistory([]);
    setFuture([]);
    setStatus(`New ${tpl.name} canvas created`);
  };

  const authHeaders = () => {
    const token = localStorage.getItem("token") || localStorage.getItem("jwt-token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const loadTemplates = async () => {
    try {
      const res = await fetch(`${backendURL}/api/spx-canvas/templates`);
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.templates) && data.templates.length) setTemplates(data.templates);
    } catch (e) {
      console.error(e);
    }
  };

  const loadProjects = async () => {
    try {
      const res = await fetch(`${backendURL}/api/spx-canvas/projects`, { headers: { ...authHeaders() } });
      if (!res.ok) return;
      const data = await res.json();
      setRecentProjects(data.projects || []);
    } catch (e) {
      console.error(e);
    }
  };

  const loadAssets = async () => {
    try {
      const res = await fetch(`${backendURL}/api/spx-canvas/assets`, { headers: { ...authHeaders() } });
      if (!res.ok) return;
      const data = await res.json();
      setAssets(data.assets || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadTemplates();
    loadProjects();
    loadAssets();
  }, []);

  useEffect(() => {
    const onMove = (e) => {
      if (!dragState || !stageWrapRef.current) return;
      const rect = stageWrapRef.current.getBoundingClientRect();
      const px = (e.clientX - rect.left) / zoom;
      const py = (e.clientY - rect.top) / zoom;

      if (dragState.kind === "move") {
        setProject((prev) => ({
          ...prev,
          layers: prev.layers.map((l) =>
            l.id === dragState.id
              ? {
                ...l,
                x: clamp(px - dragState.offsetX, 0, Math.max(0, prev.width - l.width)),
                y: clamp(py - dragState.offsetY, 0, Math.max(0, prev.height - l.height))
              }
              : l
          )
        }));
      }
      if (dragState && ["move", "resize"].includes(dragState.kind)) {
          setProject((prev) => ({
            ...prev,
            layers: prev.layers.map((l) =>
              l.id === dragState.id
                ? {
                  ...l,
                  width: clamp(px - l.x, 20, prev.width - l.x),
                  height: clamp(py - l.y, 20, prev.height - l.y)
                }
                : l
            )
          }));
        }

        if (dragState.kind === "crop") {
          setCropRect({
            x: Math.min(dragState.startX, px),
            y: Math.min(dragState.startY, py),
            width: Math.abs(px - dragState.startX),
            height: Math.abs(py - dragState.startY)
          });
        }

        if (dragState.kind === "brush" || dragState.kind === "eraser") {
          setDrawingStroke((prev) => {
            if (!prev) return prev;
            return { ...prev, points: [...prev.points, { x: px, y: py }] };
          });
        }
      };

      const onUp = () => {
        if (dragState?.kind === "brush" && drawingStroke && drawingStroke.points.length > 1) {
          const layer = createBrushLayer(drawingStroke.points);
          layer.stroke = drawingStroke.stroke;
          layer.strokeWidth = drawingStroke.strokeWidth;
          addLayer(layer);
        }

        if (dragState?.kind === "eraser" && drawingStroke && drawingStroke.points.length > 1) {
          const pts = drawingStroke.points;
          const first = pts[0];
          const last = pts[pts.length - 1];
          updateProject((draft) => {
            draft.layers = draft.layers.filter((l) => {
              const lx = l.x || 0;
              const ly = l.y || 0;
              const lw = l.width || 0;
              const lh = l.height || 0;
              const minX = Math.min(first.x, last.x);
              const maxX = Math.max(first.x, last.x);
              const minY = Math.min(first.y, last.y);
              const maxY = Math.max(first.y, last.y);
              const intersects = lx < maxX && lx + lw > minX && ly < maxY && ly + lh > minY;
              return !intersects;
            });
          });
        }

        if (dragState?.kind === "crop") {
          // just keeps cropRect visible for apply/cancel
        }

        if (dragState && (dragState.kind === "move" or dragState.kind === "resize")) {
    setHistory((prev) => [...prev.slice(-39), JSON.parse(JSON.stringify(dragState.projectSnapshot))]);
    setFuture([]);
  }

  setDragState(null);
  setDrawingStroke(null);
};

window.addEventListener("mousemove", onMove);
window.addEventListener("mouseup", onUp);
return () => {
  window.removeEventListener("mousemove", onMove);
  window.removeEventListener("mouseup", onUp);
};
  }, [dragState, drawingStroke, zoom]);

const beginDrag = (e, layer, kind = "move") => {
  if (layer.locked) return;
  e.stopPropagation();
  const rect = stageWrapRef.current.getBoundingClientRect();
  const px = (e.clientX - rect.left) / zoom;
  const py = (e.clientY - rect.top) / zoom;
  setSelectedId(layer.id);
  setDragState({
    id: layer.id,
    kind,
    offsetX: px - layer.x,
    offsetY: py - layer.y,
    projectSnapshot: JSON.parse(JSON.stringify(project))
  });
};

const startToolGesture = (e) => {
  if (!stageWrapRef.current) return;
  const rect = stageWrapRef.current.getBoundingClientRect();
  const px = (e.clientX - rect.left) / zoom;
  const py = (e.clientY - rect.top) / zoom;

  if (activeTool === "brush") {
    setDragState({ kind: "brush" });
    setDrawingStroke({
      points: [{ x: px, y: py }],
      stroke: "#ffffff",
      strokeWidth: 8
    });
  }

  if (activeTool === "eraser") {
    setDragState({ kind: "eraser" });
    setDrawingStroke({
      points: [{ x: px, y: py }],
      stroke: "#ff0000",
      strokeWidth: 24
    });
  }

  if (activeTool === "crop") {
    setDragState({ kind: "crop", startX: px, startY: py });
    setCropRect({ x: px, y: py, width: 0, height: 0 });
  }
};

const applyCrop = () => {
  if (!cropRect || cropRect.width < 2 || cropRect.height < 2) return;
  updateProject((draft) => {
    draft.layers = draft.layers.map((l) => ({
      ...l,
      x: (l.x || 0) - cropRect.x,
      y: (l.y || 0) - cropRect.y
    }));
    draft.width = Math.round(cropRect.width);
    draft.height = Math.round(cropRect.height);
  });
  setCropRect(null);
  setActiveTool("move");
  setStatus("Crop applied");
};

const cancelCrop = () => {
  setCropRect(null);
  setActiveTool("move");
  setStatus("Crop canceled");
};

const uploadImageLayer = async (file) => {
  if (!file) return;
  const form = new FormData();
  form.append("file", file);

  try {
    setStatus("Uploading image...");
    const res = await fetch(`${backendURL}/api/spx-canvas/upload`, {
      method: "POST",
      headers: { ...authHeaders() },
      body: form
    });
    const data = await res.json();
    if (!res.ok) {
      setStatus(data.error || "Upload failed");
      return;
    }

    const img = new window.Image();
    img.onload = () => {
      addLayer({
        id: makeId("image"),
        type: "image",
        name: file.name,
        visible: true,
        locked: false,
        x: 100,
        y: 100,
        width: Math.min(img.width, 480),
        height: Math.min(img.height, 480),
        rotation: 0,
        opacity: 1,
        blendMode: "normal",
        blur: 0,
        brightness: 100,
        contrast: 100,
        saturate: 100,
        src: data.url
      });
      loadAssets();
      setStatus("Image uploaded");
    };
    img.src = data.url;
  } catch (e) {
    console.error(e);
    setStatus("Upload failed");
  }
};

const addAssetToCanvas = (asset) => {
  const img = new window.Image();
  img.onload = () => {
    addLayer({
      id: makeId("image"),
      type: "image",
      name: asset.name || "Asset",
      visible: true,
      locked: false,
      x: 100,
      y: 100,
      width: Math.min(img.width, 480),
      height: Math.min(img.height, 480),
      rotation: 0,
      opacity: 1,
      blendMode: "normal",
      blur: 0,
      brightness: 100,
      contrast: 100,
      saturate: 100,
      src: asset.file_url
    });
  };
  img.src = asset.file_url;
};

const saveProject = async () => {
  try {
    setSaving(true);
    const payload = {
      name: project.name,
      width: project.width,
      height: project.height,
      background: project.background,
      data_json: project
    };
    const method = project.id ? "PUT" : "POST";
    const url = project.id
      ? `${backendURL}/api/spx-canvas/projects/${project.id}`
      : `${backendURL}/api/spx-canvas/projects`;

    const res = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...authHeaders()
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok) {
      setStatus(data.error || "Save failed");
      return;
    }

    setProject((prev) => ({ ...prev, id: data.project?.id || prev.id }));
    setStatus("Project saved");
    loadProjects();
  } catch (e) {
    console.error(e);
    setStatus("Save failed");
  } finally {
    setSaving(false);
  }
};

const loadProject = async (id) => {
  try {
    const res = await fetch(`${backendURL}/api/spx-canvas/projects/${id}`, {
      headers: { ...authHeaders() }
    });
    const data = await res.json();
    if (!res.ok) return;
    const p = data.project?.data_json || data.project;
    setProject({
      ...(p || createBaseProject()),
      id: data.project.id,
      name: data.project.name,
      width: data.project.width,
      height: data.project.height,
      background: data.project.background || p.background || "#111827"
    });
    setSelectedId(null);
    setHistory([]);
    setFuture([]);
    setStatus(`Loaded ${data.project.name}`);
  } catch (e) {
    console.error(e);
  }
};

const renderToCanvas = async () => {
  const canvas = document.createElement("canvas");
  canvas.width = project.width;
  canvas.height = project.height;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = project.background || "#111827";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (const layer of project.layers) {
    if (!layer.visible) continue;
    ctx.save();
    ctx.globalAlpha = layer.opacity ?? 1;
    ctx.filter = layerFilter(layer);
    ctx.translate((layer.x || 0) + (layer.width || 0) / 2, (layer.y || 0) + (layer.height || 0) / 2);
    ctx.rotate(((layer.rotation || 0) * Math.PI) / 180);
    ctx.translate(-(layer.width || 0) / 2, -(layer.height || 0) / 2);

    if (layer.type === "image" && layer.src) {
      const img = await new Promise((resolve, reject) => {
        const i = new Image();
        i.crossOrigin = "anonymous";
        i.onload = () => resolve(i);
        i.onerror = reject;
        i.src = layer.src;
      }).catch(() => null);
      if (img) ctx.drawImage(img, 0, 0, layer.width, layer.height);
    }

    if (layer.type === "shape") {
      ctx.fillStyle = layer.fill || "#00ffc8";
      ctx.strokeStyle = layer.stroke || "#ffffff";
      ctx.lineWidth = layer.strokeWidth || 0;
      if (layer.shape === "circle") {
        ctx.beginPath();
        ctx.ellipse(layer.width / 2, layer.height / 2, layer.width / 2, layer.height / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        if (layer.strokeWidth) ctx.stroke();
      } else {
        const r = layer.radius || 0;
        ctx.beginPath();
        ctx.moveTo(r, 0);
        ctx.lineTo(layer.width - r, 0);
        ctx.quadraticCurveTo(layer.width, 0, layer.width, r);
        ctx.lineTo(layer.width, layer.height - r);
        ctx.quadraticCurveTo(layer.width, layer.height, layer.width - r, layer.height);
        ctx.lineTo(r, layer.height);
        ctx.quadraticCurveTo(0, layer.height, 0, layer.height - r);
        ctx.lineTo(0, r);
        ctx.quadraticCurveTo(0, 0, r, 0);
        ctx.closePath();
        ctx.fill();
        if (layer.strokeWidth) ctx.stroke();
      }
    }

    if (layer.type === "text") {
      ctx.fillStyle = layer.color || "#fff";
      ctx.font = `${layer.fontWeight || 700} ${layer.fontSize || 42}px ${layer.fontFamily || "sans-serif"}`;
      ctx.textAlign = layer.textAlign || "left";
      ctx.textBaseline = "top";
      const x = layer.textAlign === "center" ? layer.width / 2 : layer.textAlign === "right" ? layer.width : 0;
      const lines = String(layer.text || "").split("\n");
      lines.forEach((line, i) => {
        ctx.fillText(line, x, i * ((layer.fontSize || 42) + 6));
      });
    }

    if (layer.type === "brush" && Array.isArray(layer.points) && layer.points.length > 1) {
      ctx.resetTransform();
      ctx.globalAlpha = layer.opacity ?? 1;
      ctx.strokeStyle = layer.stroke || "#fff";
      ctx.lineWidth = layer.strokeWidth || 8;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      layer.points.forEach((p, idx) => {
        if (idx === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.stroke();
    }

    ctx.restore();
  }

  return canvas;
};

const exportPNG = async () => {
  const canvas = await renderToCanvas();
  const a = document.createElement("a");
  a.href = canvas.toDataURL("image/png");
  a.download = `${project.name || "spx-canvas"}.png`;
  a.click();
  setStatus("PNG exported");
};

const sendCanvasToMotion = async () => {
  const canvas = await renderToCanvas();
  const dataUrl = canvas.toDataURL("image/png");
  if (actions.sendToMotion) {
    actions.sendToMotion({
      type: "image",
      url: dataUrl,
      name: `${project.name || "SPX Canvas"} Export`,
      source: "spx-canvas"
    });
  } else {
    sendToMotion(actions, navigate, {
      type: "image",
      url: dataUrl,
      name: `${project.name || "SPX Canvas"} Export`
    });
    return;
  }
  navigate("/node-compositor");
};

return (
  <div className="spx-canvas-page">
    <div className="spx-canvas-topbar">
      <div className="spx-canvas-brand">🎨 SPX Canvas</div>

      <div className="spx-canvas-top-actions">
        <input
          className="spx-name-input"
          value={project.name}
          onChange={(e) => setProject((prev) => ({ ...prev, name: e.target.value }))}
          placeholder="Project name"
        />

        <button onClick={() => createFromTemplate(templates[0])}>New</button>
        <button onClick={undo} disabled={!history.length}>Undo</button>
        <button onClick={redo} disabled={!future.length}>Redo</button>
        <button onClick={() => fileInputRef.current?.click()}>Upload Image</button>
        <button onClick={() => addLayer(createTextLayer())}>Add Text</button>
        <button onClick={() => addLayer(createShapeLayer("rect"))}>Add Rect</button>
        <button onClick={() => addLayer(createShapeLayer("circle"))}>Add Circle</button>
        <button onClick={duplicateSelected} disabled={!selectedLayer}>Duplicate</button>
        <button onClick={removeSelected} disabled={!selectedLayer}>Delete</button>
        <button onClick={saveProject} disabled={saving}>{saving ? "Saving..." : "Save"}</button>
        <button className="spx-export-btn" onClick={exportPNG}>Export PNG</button>
        <button className="spx-motion-btn" onClick={sendCanvasToMotion}>Send to Motion</button>
      </div>
    </div>

    <input
      ref={fileInputRef}
      type="file"
      hidden
      accept="image/*"
      onChange={(e) => uploadImageLayer(e.target.files?.[0])}
    />

    <div className="spx-canvas-shell">
      <aside className="spx-canvas-left">
        <div className="spx-side-tabs">
          <button className={activeLeftTab === "layers" ? "active" : ""} onClick={() => setActiveLeftTab("layers")}>Layers</button>
          <button className={activeLeftTab === "templates" ? "active" : ""} onClick={() => setActiveLeftTab("templates")}>Templates</button>
          <button className={activeLeftTab === "projects" ? "active" : ""} onClick={() => setActiveLeftTab("projects")}>Projects</button>
          <button className={activeLeftTab === "assets" ? "active" : ""} onClick={() => setActiveLeftTab("assets")}>Assets</button>
        </div>

        {activeLeftTab === "layers" && (
          <div className="spx-panel">
            <div className="spx-panel-title">Layers</div>
            {[...project.layers].map((layer, i) => (
              <div
                key={layer.id}
                className={`spx-layer-row ${selectedId === layer.id ? "selected" : ""}`}
                onClick={() => setSelectedId(layer.id)}
              >
                <div className="spx-layer-main">
                  <span>{layer.type === "image" ? "🖼" : layer.type === "text" ? "🔤" : layer.type === "brush" ? "🖌" : "⬛"}</span>
                  <span>{layer.name || `${layer.type} ${i + 1}`}</span>
                </div>
                <div className="spx-layer-actions">
                  <button onClick={(e) => { e.stopPropagation(); updateLayer(layer.id, { visible: !layer.visible }); }}>{layer.visible ? "👁" : "🚫"}</button>
                  <button onClick={(e) => { e.stopPropagation(); updateLayer(layer.id, { locked: !layer.locked }); }}>{layer.locked ? "🔒" : "🔓"}</button>
                  <button onClick={(e) => { e.stopPropagation(); moveLayer(layer.id, "up"); }}>↑</button>
                  <button onClick={(e) => { e.stopPropagation(); moveLayer(layer.id, "down"); }}>↓</button>
                </div>
              </div>
            ))}
            {!project.layers.length && <div className="spx-empty">No layers yet</div>}
          </div>
        )}

        {activeLeftTab === "templates" && (
          <div className="spx-panel">
            <div className="spx-panel-title">Templates</div>
            {templates.map((tpl) => (
              <button key={tpl.id} className="spx-template-card" onClick={() => createFromTemplate(tpl)}>
                <strong>{tpl.name}</strong>
                <span>{tpl.width} × {tpl.height}</span>
              </button>
            ))}
          </div>
        )}

        {activeLeftTab === "projects" && (
          <div className="spx-panel">
            <div className="spx-panel-title">Recent Projects</div>
            {recentProjects.map((p) => (
              <button key={p.id} className="spx-template-card" onClick={() => loadProject(p.id)}>
                <strong>{p.name}</strong>
                <span>{p.width} × {p.height}</span>
              </button>
            ))}
            {!recentProjects.length && <div className="spx-empty">No saved projects yet</div>}
          </div>
        )}

        {activeLeftTab === "assets" && (
          <div className="spx-panel">
            <div className="spx-panel-title">Asset Library</div>
            {assets.map((asset) => (
              <button key={asset.id} className="spx-template-card" onClick={() => addAssetToCanvas(asset)}>
                <strong>{asset.name}</strong>
                <span>{asset.file_type || "image"}</span>
              </button>
            ))}
            {!assets.length && <div className="spx-empty">No uploaded assets yet</div>}
          </div>
        )}
      </aside>

      <main className="spx-canvas-center">
        <div className="spx-stage-toolbar">
          <div className="spx-status">{status}</div>
          <div className="spx-stage-controls">
            <label>Canvas</label>
            <input type="number" value={project.width} onChange={(e) => setProject((p) => ({ ...p, width: parseInt(e.target.value || 1, 10) }))} />
            <input type="number" value={project.height} onChange={(e) => setProject((p) => ({ ...p, height: parseInt(e.target.value || 1, 10) }))} />
            <input type="color" value={project.background} onChange={(e) => setProject((p) => ({ ...p, background: e.target.value }))} />
            <label>Zoom</label>
            <input type="range" min="0.25" max="1.5" step="0.05" value={zoom} onChange={(e) => setZoom(parseFloat(e.target.value))} />
            <span>{Math.round(zoom * 100)}%</span>
          </div>
        </div>

        <div className="spx-tools-bar">
          <button className={activeTool === "move" ? "active" : ""} onClick={() => setActiveTool("move")}>Move</button>
          <button className={activeTool === "brush" ? "active" : ""} onClick={() => setActiveTool("brush")}>Brush</button>
          <button className={activeTool === "eraser" ? "active" : ""} onClick={() => setActiveTool("eraser")}>Eraser</button>
          <button className={activeTool === "crop" ? "active" : ""} onClick={() => setActiveTool("crop")}>Crop</button>
          {activeTool === "crop" && cropRect && (
            <>
              <button onClick={applyCrop}>Apply Crop</button>
              <button onClick={cancelCrop}>Cancel Crop</button>
            </>
          )}
        </div>

        <div className="spx-stage-wrap" ref={stageWrapRef}>
          <div
            className="spx-stage"
            style={{
              width: project.width,
              height: project.height,
              background: project.background,
              transform: `scale(${zoom})`,
              transformOrigin: "top left"
            }}
            onMouseDown={(e) => {
              setSelectedId(null);
              if (activeTool !== "move") startToolGesture(e);
            }}
          >
            {project.layers.map((layer) => {
              if (!layer.visible) return null;
              const selected = layer.id === selectedId;

              return (
                <div
                  key={layer.id}
                  className={`spx-layer ${selected ? "selected" : ""}`}
                  style={{
                    left: layer.x,
                    top: layer.y,
                    width: layer.width,
                    height: layer.height,
                    opacity: layer.opacity,
                    mixBlendMode: layer.blendMode === "normal" ? "normal" : layer.blendMode,
                    filter: layerFilter(layer),
                    transform: `rotate(${layer.rotation || 0}deg)`
                  }}
                  onMouseDown={(e) => {
                    if (activeTool === "move") beginDrag(e, layer, "move");
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedId(layer.id);
                  }}
                >
                  {layer.type === "image" && <img src={layer.src} alt={layer.name} draggable={false} />}

                  {layer.type === "shape" && (
                    <div
                      className="spx-shape"
                      style={{
                        background: layer.fill,
                        border: `${layer.strokeWidth || 0}px solid ${layer.stroke || "#fff"}`,
                        borderRadius: layer.shape === "circle" ? "999px" : `${layer.radius || 0}px`
                      }}
                    />
                  )}

                  {layer.type === "text" && (
                    <div
                      className="spx-text-layer"
                      style={{
                        color: layer.color,
                        fontSize: layer.fontSize,
                        fontWeight: layer.fontWeight,
                        textAlign: layer.textAlign,
                        fontFamily: layer.fontFamily
                      }}
                    >
                      {String(layer.text || "").split("\n").map((line, i) => (
                        <div key={i}>{line || "\u00A0"}</div>
                      ))}
                    </div>
                  )}

                  {layer.type === "brush" && (
                    <svg className="spx-brush-svg" viewBox={`0 0 ${project.width} ${project.height}`}>
                      <path
                        d={brushPath(layer.points)}
                        fill="none"
                        stroke={layer.stroke || "#fff"}
                        strokeWidth={layer.strokeWidth || 8}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}

                  {selected && !layer.locked && activeTool === "move" && (
                    <div className="spx-resize-handle" onMouseDown={(e) => beginDrag(e, layer, "resize")} />
                  )}
                </div>
              );
            })}

            {drawingStroke && (
              <svg className="spx-drawing-overlay" viewBox={`0 0 ${project.width} ${project.height}`}>
                <path
                  d={brushPath(drawingStroke.points)}
                  fill="none"
                  stroke={drawingStroke.stroke}
                  strokeWidth={drawingStroke.strokeWidth}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}

            {cropRect && activeTool === "crop" && (
              <div
                className="spx-crop-rect"
                style={{
                  left: cropRect.x,
                  top: cropRect.y,
                  width: cropRect.width,
                  height: cropRect.height
                }}
              />
            )}
          </div>
        </div>
      </main>

      <aside className="spx-canvas-right">
        <div className="spx-panel">
          <div className="spx-panel-title">Properties</div>

          {!selectedLayer && <div className="spx-empty">Select a layer</div>}

          {selectedLayer && (
            <>
              <Field label="Name">
                <input value={selectedLayer.name || ""} onChange={(e) => updateLayer(selectedLayer.id, { name: e.target.value })} />
              </Field>

              <div className="spx-grid-2">
                <Field label="X"><NumberInput value={selectedLayer.x || 0} onChange={(v) => updateLayer(selectedLayer.id, { x: v })} /></Field>
                <Field label="Y"><NumberInput value={selectedLayer.y || 0} onChange={(v) => updateLayer(selectedLayer.id, { y: v })} /></Field>
                <Field label="W"><NumberInput value={selectedLayer.width || 0} min={20} onChange={(v) => updateLayer(selectedLayer.id, { width: v })} /></Field>
                <Field label="H"><NumberInput value={selectedLayer.height || 0} min={20} onChange={(v) => updateLayer(selectedLayer.id, { height: v })} /></Field>
              </div>

              <div className="spx-grid-2">
                <Field label="Rotation"><NumberInput value={selectedLayer.rotation || 0} onChange={(v) => updateLayer(selectedLayer.id, { rotation: v })} /></Field>
                <Field label="Opacity">
                  <input type="range" min="0" max="1" step="0.01" value={selectedLayer.opacity ?? 1} onChange={(e) => updateLayer(selectedLayer.id, { opacity: parseFloat(e.target.value) })} />
                </Field>
              </div>

              <Field label="Blend Mode">
                <select value={selectedLayer.blendMode || "normal"} onChange={(e) => updateLayer(selectedLayer.id, { blendMode: e.target.value })}>
                  {BLEND_MODES.map((mode) => <option key={mode} value={mode}>{mode}</option>)}
                </select>
              </Field>

              <Field label={`Blur (${selectedLayer.blur || 0}px)`}>
                <input type="range" min="0" max="30" step="1" value={selectedLayer.blur || 0} onChange={(e) => updateLayer(selectedLayer.id, { blur: parseInt(e.target.value, 10) })} />
              </Field>

              <Field label={`Brightness (${selectedLayer.brightness || 100}%)`}>
                <input type="range" min="0" max="200" step="1" value={selectedLayer.brightness || 100} onChange={(e) => updateLayer(selectedLayer.id, { brightness: parseInt(e.target.value, 10) })} />
              </Field>

              <Field label={`Contrast (${selectedLayer.contrast || 100}%)`}>
                <input type="range" min="0" max="200" step="1" value={selectedLayer.contrast || 100} onChange={(e) => updateLayer(selectedLayer.id, { contrast: parseInt(e.target.value, 10) })} />
              </Field>

              <Field label={`Saturate (${selectedLayer.saturate || 100}%)`}>
                <input type="range" min="0" max="200" step="1" value={selectedLayer.saturate || 100} onChange={(e) => updateLayer(selectedLayer.id, { saturate: parseInt(e.target.value, 10) })} />
              </Field>

              {selectedLayer.type === "text" && (
                <>
                  <Field label="Text">
                    <textarea rows={4} value={selectedLayer.text || ""} onChange={(e) => updateLayer(selectedLayer.id, { text: e.target.value })} />
                  </Field>

                  <div className="spx-grid-2">
                    <Field label="Color"><input type="color" value={selectedLayer.color || "#ffffff"} onChange={(e) => updateLayer(selectedLayer.id, { color: e.target.value })} /></Field>
                    <Field label="Font Size"><NumberInput value={selectedLayer.fontSize || 42} min={8} onChange={(v) => updateLayer(selectedLayer.id, { fontSize: v })} /></Field>
                  </div>
                </>
              )}

              {selectedLayer.type === "shape" && (
                <>
                  <div className="spx-grid-2">
                    <Field label="Fill"><input type="color" value={selectedLayer.fill || "#00ffc8"} onChange={(e) => updateLayer(selectedLayer.id, { fill: e.target.value })} /></Field>
                    <Field label="Stroke"><input type="color" value={selectedLayer.stroke || "#ffffff"} onChange={(e) => updateLayer(selectedLayer.id, { stroke: e.target.value })} /></Field>
                  </div>

                  <div className="spx-grid-2">
                    <Field label="Stroke Width"><NumberInput value={selectedLayer.strokeWidth || 0} min={0} max={20} onChange={(v) => updateLayer(selectedLayer.id, { strokeWidth: v })} /></Field>
                    {selectedLayer.shape !== "circle" && <Field label="Radius"><NumberInput value={selectedLayer.radius || 0} min={0} max={200} onChange={(v) => updateLayer(selectedLayer.id, { radius: v })} /></Field>}
                  </div>
                </>
              )}

              {selectedLayer.type === "brush" && (
                <div className="spx-grid-2">
                  <Field label="Stroke"><input type="color" value={selectedLayer.stroke || "#ffffff"} onChange={(e) => updateLayer(selectedLayer.id, { stroke: e.target.value })} /></Field>
                  <Field label="Stroke Width"><NumberInput value={selectedLayer.strokeWidth || 8} min={1} max={50} onChange={(v) => updateLayer(selectedLayer.id, { strokeWidth: v })} /></Field>
                </div>
              )}
            </>
          )}
        </div>
      </aside>
    </div>
  </div>
);
}
