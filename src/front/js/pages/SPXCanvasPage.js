import React, { useEffect, useMemo, useRef, useState } from "react";
import "../../styles/SPXCanvas.css";

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

export default function SPXCanvasPage() {
  const [project, setProject] = useState(createBaseProject());
  const [selectedId, setSelectedId] = useState(null);
  const [templates, setTemplates] = useState(DEFAULT_TEMPLATES);
  const [recentProjects, setRecentProjects] = useState([]);
  const [activeLeftTab, setActiveLeftTab] = useState("layers");
  const [zoom, setZoom] = useState(1);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("Ready");
  const [history, setHistory] = useState([]);
  const [future, setFuture] = useState([]);
  const [dragState, setDragState] = useState(null);

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
    clone.x += 20;
    clone.y += 20;
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
      if (Array.isArray(data.templates) && data.templates.length) {
        setTemplates(data.templates);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadProjects = async () => {
    try {
      const res = await fetch(`${backendURL}/api/spx-canvas/projects`, {
        headers: { ...authHeaders() }
      });
      if (!res.ok) return;
      const data = await res.json();
      setRecentProjects(data.projects || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadTemplates();
    loadProjects();
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

      if (dragState.kind === "resize") {
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
    };

    const onUp = () => {
      if (dragState) {
        setHistory((prev) => [...prev.slice(-39), JSON.parse(JSON.stringify(dragState.projectSnapshot))]);
        setFuture([]);
      }
      setDragState(null);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [dragState, zoom]);

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
        setStatus("Image uploaded");
      };
      img.src = data.url;
    } catch (e) {
      console.error(e);
      setStatus("Upload failed");
    }
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

  const exportPNG = async () => {
    const canvas = document.createElement("canvas");
    canvas.width = project.width;
    canvas.height = project.height;
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = project.background || "#111827";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const sortedLayers = [...project.layers];

    for (const layer of sortedLayers) {
      if (!layer.visible) continue;
      ctx.save();
      ctx.globalAlpha = layer.opacity ?? 1;
      ctx.filter = layerFilter(layer);
      ctx.translate(layer.x + layer.width / 2, layer.y + layer.height / 2);
      ctx.rotate((layer.rotation || 0) * Math.PI / 180);
      ctx.translate(-layer.width / 2, -layer.height / 2);

      if (layer.type === "image" && layer.src) {
        const img = await new Promise((resolve, reject) => {
          const i = new Image();
          i.crossOrigin = "anonymous";
          i.onload = () => resolve(i);
          i.onerror = reject;
          i.src = layer.src;
        }).catch(() => null);
        if (img) {
          ctx.drawImage(img, 0, 0, layer.width, layer.height);
        }
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

      ctx.restore();
    }

    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `${project.name || "spx-canvas"}.png`;
    a.click();
    setStatus("PNG exported");
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
                    <span>{layer.type === "image" ? "🖼" : layer.type === "text" ? "🔤" : "⬛"}</span>
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
        </aside>

        <main className="spx-canvas-center">
          <div className="spx-stage-toolbar">
            <div className="spx-status">{status}</div>
            <div className="spx-stage-controls">
              <label>Canvas</label>
              <input
                type="number"
                value={project.width}
                onChange={(e) => setProject((p) => ({ ...p, width: parseInt(e.target.value || 1, 10) }))}
              />
              <input
                type="number"
                value={project.height}
                onChange={(e) => setProject((p) => ({ ...p, height: parseInt(e.target.value || 1, 10) }))}
              />
              <input
                type="color"
                value={project.background}
                onChange={(e) => setProject((p) => ({ ...p, background: e.target.value }))}
              />
              <label>Zoom</label>
              <input
                type="range"
                min="0.25"
                max="1.5"
                step="0.05"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
              />
              <span>{Math.round(zoom * 100)}%</span>
            </div>
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
              onMouseDown={() => setSelectedId(null)}
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
                    onMouseDown={(e) => beginDrag(e, layer, "move")}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedId(layer.id);
                    }}
                  >
                    {layer.type === "image" && (
                      <img src={layer.src} alt={layer.name} draggable={false} />
                    )}

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

                    {selected && !layer.locked && (
                      <div className="spx-resize-handle" onMouseDown={(e) => beginDrag(e, layer, "resize")} />
                    )}
                  </div>
                );
              })}
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
                  <input
                    value={selectedLayer.name || ""}
                    onChange={(e) => updateLayer(selectedLayer.id, { name: e.target.value })}
                  />
                </Field>

                <div className="spx-grid-2">
                  <Field label="X">
                    <NumberInput value={selectedLayer.x} onChange={(v) => updateLayer(selectedLayer.id, { x: v })} />
                  </Field>
                  <Field label="Y">
                    <NumberInput value={selectedLayer.y} onChange={(v) => updateLayer(selectedLayer.id, { y: v })} />
                  </Field>
                  <Field label="W">
                    <NumberInput value={selectedLayer.width} min={20} onChange={(v) => updateLayer(selectedLayer.id, { width: v })} />
                  </Field>
                  <Field label="H">
                    <NumberInput value={selectedLayer.height} min={20} onChange={(v) => updateLayer(selectedLayer.id, { height: v })} />
                  </Field>
                </div>

                <div className="spx-grid-2">
                  <Field label="Rotation">
                    <NumberInput value={selectedLayer.rotation || 0} onChange={(v) => updateLayer(selectedLayer.id, { rotation: v })} />
                  </Field>
                  <Field label="Opacity">
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={selectedLayer.opacity ?? 1}
                      onChange={(e) => updateLayer(selectedLayer.id, { opacity: parseFloat(e.target.value) })}
                    />
                  </Field>
                </div>

                <Field label="Blend Mode">
                  <select
                    value={selectedLayer.blendMode || "normal"}
                    onChange={(e) => updateLayer(selectedLayer.id, { blendMode: e.target.value })}
                  >
                    {BLEND_MODES.map((mode) => (
                      <option key={mode} value={mode}>{mode}</option>
                    ))}
                  </select>
                </Field>

                <Field label={`Blur (${selectedLayer.blur || 0}px)`}>
                  <input
                    type="range"
                    min="0"
                    max="30"
                    step="1"
                    value={selectedLayer.blur || 0}
                    onChange={(e) => updateLayer(selectedLayer.id, { blur: parseInt(e.target.value, 10) })}
                  />
                </Field>

                <Field label={`Brightness (${selectedLayer.brightness || 100}%)`}>
                  <input
                    type="range"
                    min="0"
                    max="200"
                    step="1"
                    value={selectedLayer.brightness || 100}
                    onChange={(e) => updateLayer(selectedLayer.id, { brightness: parseInt(e.target.value, 10) })}
                  />
                </Field>

                <Field label={`Contrast (${selectedLayer.contrast || 100}%)`}>
                  <input
                    type="range"
                    min="0"
                    max="200"
                    step="1"
                    value={selectedLayer.contrast || 100}
                    onChange={(e) => updateLayer(selectedLayer.id, { contrast: parseInt(e.target.value, 10) })}
                  />
                </Field>

                <Field label={`Saturate (${selectedLayer.saturate || 100}%)`}>
                  <input
                    type="range"
                    min="0"
                    max="200"
                    step="1"
                    value={selectedLayer.saturate || 100}
                    onChange={(e) => updateLayer(selectedLayer.id, { saturate: parseInt(e.target.value, 10) })}
                  />
                </Field>

                {selectedLayer.type === "text" && (
                  <>
                    <Field label="Text">
                      <textarea
                        rows={4}
                        value={selectedLayer.text || ""}
                        onChange={(e) => updateLayer(selectedLayer.id, { text: e.target.value })}
                      />
                    </Field>

                    <div className="spx-grid-2">
                      <Field label="Color">
                        <input
                          type="color"
                          value={selectedLayer.color || "#ffffff"}
                          onChange={(e) => updateLayer(selectedLayer.id, { color: e.target.value })}
                        />
                      </Field>
                      <Field label="Font Size">
                        <NumberInput value={selectedLayer.fontSize || 42} min={8} onChange={(v) => updateLayer(selectedLayer.id, { fontSize: v })} />
                      </Field>
                    </div>

                    <div className="spx-grid-2">
                      <Field label="Weight">
                        <NumberInput value={selectedLayer.fontWeight || 700} min={100} max={900} step={100} onChange={(v) => updateLayer(selectedLayer.id, { fontWeight: v })} />
                      </Field>
                      <Field label="Align">
                        <select
                          value={selectedLayer.textAlign || "left"}
                          onChange={(e) => updateLayer(selectedLayer.id, { textAlign: e.target.value })}
                        >
                          <option value="left">Left</option>
                          <option value="center">Center</option>
                          <option value="right">Right</option>
                        </select>
                      </Field>
                    </div>
                  </>
                )}

                {selectedLayer.type === "shape" && (
                  <>
                    <div className="spx-grid-2">
                      <Field label="Fill">
                        <input
                          type="color"
                          value={selectedLayer.fill || "#00ffc8"}
                          onChange={(e) => updateLayer(selectedLayer.id, { fill: e.target.value })}
                        />
                      </Field>
                      <Field label="Stroke">
                        <input
                          type="color"
                          value={selectedLayer.stroke || "#ffffff"}
                          onChange={(e) => updateLayer(selectedLayer.id, { stroke: e.target.value })}
                        />
                      </Field>
                    </div>

                    <div className="spx-grid-2">
                      <Field label="Stroke Width">
                        <NumberInput value={selectedLayer.strokeWidth || 0} min={0} max={20} onChange={(v) => updateLayer(selectedLayer.id, { strokeWidth: v })} />
                      </Field>
                      {selectedLayer.shape !== "circle" && (
                        <Field label="Radius">
                          <NumberInput value={selectedLayer.radius || 0} min={0} max={200} onChange={(v) => updateLayer(selectedLayer.id, { radius: v })} />
                        </Field>
                      )}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
