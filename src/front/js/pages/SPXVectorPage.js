import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/SPXVector.css";
import { Context } from "../store/appContext";

const backendURL = process.env.REACT_APP_BACKEND_URL || "";

const VECTOR_TEMPLATES = [
  { id: "logo_square", name: "Logo Square", width: 1200, height: 1200 },
  { id: "youtube_thumb", name: "YouTube Thumbnail", width: 1280, height: 720 },
  { id: "album_cover", name: "Album Cover", width: 3000, height: 3000 },
  { id: "poster", name: "Poster", width: 1080, height: 1350 },
  { id: "story", name: "Story / Reel", width: 1080, height: 1920 }
];

const makeId = (prefix = "item") =>
  `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

const DEFAULT_PROJECT = (tpl = VECTOR_TEMPLATES[0]) => ({
  id: null,
  name: `Untitled ${tpl.name}`,
  width: tpl.width,
  height: tpl.height,
  background: "#10161f",
  layers: []
});

const createRect = () => ({
  id: makeId("rect"),
  type: "rect",
  name: "Rectangle",
  visible: true,
  locked: false,
  x: 120,
  y: 120,
  width: 260,
  height: 180,
  rotation: 0,
  opacity: 1,
  fill: "#00ffc8",
  stroke: "#ffffff",
  strokeWidth: 0,
  radius: 18
});

const createCircle = () => ({
  id: makeId("circle"),
  type: "circle",
  name: "Circle",
  visible: true,
  locked: false,
  x: 160,
  y: 160,
  width: 220,
  height: 220,
  rotation: 0,
  opacity: 1,
  fill: "#ff6600",
  stroke: "#ffffff",
  strokeWidth: 0
});

const createText = () => ({
  id: makeId("text"),
  type: "text",
  name: "Text",
  visible: true,
  locked: false,
  x: 120,
  y: 120,
  width: 360,
  height: 90,
  rotation: 0,
  opacity: 1,
  text: "SPX Vector",
  fontSize: 56,
  fontWeight: 800,
  fontFamily: "Inter, sans-serif",
  textAlign: "left",
  fill: "#ffffff",
  stroke: "#000000",
  strokeWidth: 0
});

const createSvgAssetLayer = (name, src) => ({
  id: makeId("svg"),
  type: "svgAsset",
  name: name || "SVG Asset",
  visible: true,
  locked: false,
  x: 120,
  y: 120,
  width: 360,
  height: 360,
  rotation: 0,
  opacity: 1,
  src
});

const createPathLayer = (points = []) => ({
  id: makeId("path"),
  type: "path",
  name: "Path",
  visible: true,
  locked: false,
  x: 0,
  y: 0,
  width: 0,
  height: 0,
  rotation: 0,
  opacity: 1,
  fill: "none",
  stroke: "#00ffc8",
  strokeWidth: 4,
  closed: false,
  points
});

function Field({ label, children }) {
  return (
    <div className="spxv-field">
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

function pathD(points = [], closed = false) {
  if (!points.length) return "";
  const head = `M ${points[0].x} ${points[0].y}`;
  const tail = points.slice(1).map((p) => `L ${p.x} ${p.y}`).join(" ");
  return `${head} ${tail}${closed ? " Z" : ""}`;
}

function exportSVG(project) {
  const body = project.layers
    .filter((l) => l.visible)
    .map((l) => {
      const common = `
        opacity="${l.opacity ?? 1}"
        transform="translate(${l.x || 0} ${l.y || 0}) rotate(${l.rotation || 0} ${(l.width || 0) / 2} ${(l.height || 0) / 2})"
      `;
      const fill = l.fill || "none";
      const stroke = l.stroke || "none";
      const strokeWidth = l.strokeWidth || 0;

      if (l.type === "rect") {
        return `<rect ${common} x="0" y="0" width="${l.width}" height="${l.height}" rx="${l.radius || 0}" ry="${l.radius || 0}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" />`;
      }

      if (l.type === "circle") {
        return `<ellipse ${common} cx="${l.width / 2}" cy="${l.height / 2}" rx="${l.width / 2}" ry="${l.height / 2}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" />`;
      }

      if (l.type === "text") {
        const lines = String(l.text || "").split("\n");
        const x = l.textAlign === "center" ? l.width / 2 : l.textAlign === "right" ? l.width : 0;
        const textSpans = lines.map((line, i) => {
          const safe = line.replace(/&/g, "&amp;").replace(/</g, "&lt;");
          return `<tspan x="${x}" dy="${i === 0 ? 0 : (l.fontSize || 56) + 8}">${safe}</tspan>`;
        }).join("");
        return `<text ${common} x="${x}" y="${l.fontSize || 56}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" font-family="${l.fontFamily || "Inter, sans-serif"}" font-size="${l.fontSize || 56}" font-weight="${l.fontWeight || 800}" text-anchor="${l.textAlign === "center" ? "middle" : l.textAlign === "right" ? "end" : "start"}">${textSpans}</text>`;
      }

      if (l.type === "svgAsset" && l.src) {
        return `<image ${common} href="${l.src}" x="0" y="0" width="${l.width}" height="${l.height}" preserveAspectRatio="xMidYMid meet" />`;
      }

      if (l.type === "path") {
        return `<path ${common} d="${pathD(l.points || [], l.closed)}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" />`;
      }

      return "";
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${project.width}" height="${project.height}" viewBox="0 0 ${project.width} ${project.height}">
  <rect x="0" y="0" width="${project.width}" height="${project.height}" fill="${project.background || "#10161f"}" />
  ${body}
</svg>`;
}

export default function SPXVectorPage() {
  const { actions = {} } = useContext(Context);
  const navigate = useNavigate();

  const [project, setProject] = useState(DEFAULT_PROJECT());
  const [templates, setTemplates] = useState(VECTOR_TEMPLATES);
  const [projects, setProjects] = useState([]);
  const [assets, setAssets] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedPointIndex, setSelectedPointIndex] = useState(null);
  const [activeLeftTab, setActiveLeftTab] = useState("layers");
  const [activeTool, setActiveTool] = useState("select");
  const [zoom, setZoom] = useState(1);
  const [status, setStatus] = useState("Ready");
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState([]);
  const [future, setFuture] = useState([]);
  const [dragState, setDragState] = useState(null);
  const [pendingPath, setPendingPath] = useState(null);

  const stageRef = useRef(null);
  const importRef = useRef(null);

  const selectedLayer = useMemo(
    () => project.layers.find((l) => l.id === selectedId) || null,
    [project.layers, selectedId]
  );

  const authHeaders = () => {
    const token = localStorage.getItem("token") || localStorage.getItem("jwt-token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

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

  const updatePathPoint = (layerId, pointIndex, patch) => {
    updateProject((draft) => {
      const idx = draft.layers.findIndex((l) => l.id === layerId);
      if (idx === -1) return;
      const pts = [...(draft.layers[idx].points || [])];
      if (!pts[pointIndex]) return;
      pts[pointIndex] = { ...pts[pointIndex], ...patch };
      draft.layers[idx].points = pts;
    });
  };

  const addLayer = (layer) => {
    updateProject((draft) => {
      draft.layers.push(layer);
    });
    setSelectedId(layer.id);
    setActiveTool("select");
  };

  const removeSelected = () => {
    if (!selectedId) return;
    updateProject((draft) => {
      draft.layers = draft.layers.filter((l) => l.id !== selectedId);
    });
    setSelectedId(null);
    setSelectedPointIndex(null);
  };

  const duplicateSelected = () => {
    if (!selectedLayer) return;
    const clone = JSON.parse(JSON.stringify(selectedLayer));
    clone.id = makeId(selectedLayer.type);
    clone.name = `${selectedLayer.name} Copy`;
    clone.x = (clone.x || 0) + 24;
    clone.y = (clone.y || 0) + 24;
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

  const loadTemplates = async () => {
    try {
      const res = await fetch(`${backendURL}/api/spx-vector/templates`);
      const data = await res.json();
      if (res.ok && Array.isArray(data.templates)) setTemplates(data.templates);
    } catch (e) {
      console.error(e);
    }
  };

  const loadProjects = async () => {
    try {
      const res = await fetch(`${backendURL}/api/spx-vector/projects`, {
        headers: { ...authHeaders() }
      });
      const data = await res.json();
      if (res.ok) setProjects(data.projects || []);
    } catch (e) {
      console.error(e);
    }
  };

  const loadAssets = async () => {
    try {
      const res = await fetch(`${backendURL}/api/spx-vector/assets`, {
        headers: { ...authHeaders() }
      });
      const data = await res.json();
      if (res.ok) setAssets(data.assets || []);
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
      if (!dragState || !stageRef.current) return;
      const rect = stageRef.current.getBoundingClientRect();
      const px = (e.clientX - rect.left) / zoom;
      const py = (e.clientY - rect.top) / zoom;

      if (dragState.kind === "move") {
        setProject((prev) => ({
          ...prev,
          layers: prev.layers.map((l) =>
            l.id === dragState.id
              ? {
                  ...l,
                  x: clamp(px - dragState.offsetX, 0, Math.max(0, prev.width - (l.width || 0))),
                  y: clamp(py - dragState.offsetY, 0, Math.max(0, prev.height - (l.height || 0)))
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

      if (dragState.kind === "point") {
        setProject((prev) => ({
          ...prev,
          layers: prev.layers.map((l) => {
            if (l.id !== dragState.id) return l;
            const pts = [...(l.points || [])];
            if (!pts[dragState.pointIndex]) return l;
            pts[dragState.pointIndex] = { x: px, y: py };
            return { ...l, points: pts };
          })
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
    if (layer.locked || activeTool !== "select") return;
    e.stopPropagation();
    const rect = stageRef.current.getBoundingClientRect();
    const px = (e.clientX - rect.left) / zoom;
    const py = (e.clientY - rect.top) / zoom;
    setSelectedId(layer.id);
    setDragState({
      id: layer.id,
      kind,
      offsetX: px - (layer.x || 0),
      offsetY: py - (layer.y || 0),
      projectSnapshot: JSON.parse(JSON.stringify(project))
    });
  };

  const beginPointDrag = (e, layerId, pointIndex) => {
    e.stopPropagation();
    setSelectedId(layerId);
    setSelectedPointIndex(pointIndex);
    setDragState({
      id: layerId,
      kind: "point",
      pointIndex,
      projectSnapshot: JSON.parse(JSON.stringify(project))
    });
  };

  const handleArtboardClick = (e) => {
    if (!stageRef.current) return;
    const rect = stageRef.current.getBoundingClientRect();
    const px = (e.clientX - rect.left) / zoom;
    const py = (e.clientY - rect.top) / zoom;

    if (activeTool === "rect") addLayer(createRect());
    if (activeTool === "circle") addLayer(createCircle());
    if (activeTool === "text") addLayer(createText());

    if (activeTool === "pen") {
      setPendingPath((prev) => {
        const next = prev ? [...prev, { x: px, y: py }] : [{ x: px, y: py }];
        setStatus(`Pen points: ${next.length}`);
        return next;
      });
    }
  };

  const commitPendingPath = (closed = false) => {
    if (!pendingPath || pendingPath.length < 2) return;
    addLayer(createPathLayer(pendingPath.map((p) => ({ x: p.x, y: p.y }))));
    if (closed) {
      const latest = project.layers[project.layers.length - 1];
      if (latest) updateLayer(latest.id, { closed: true });
    }
    setPendingPath(null);
    setActiveTool("select");
    setStatus("Path created");
  };

  const createFromTemplate = (tpl) => {
    setProject(DEFAULT_PROJECT(tpl));
    setSelectedId(null);
    setSelectedPointIndex(null);
    setPendingPath(null);
    setHistory([]);
    setFuture([]);
    setStatus(`New ${tpl.name} document created`);
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

      const url = project.id
        ? `${backendURL}/api/spx-vector/projects/${project.id}`
        : `${backendURL}/api/spx-vector/projects`;
      const method = project.id ? "PUT" : "POST";

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
      const res = await fetch(`${backendURL}/api/spx-vector/projects/${id}`, {
        headers: { ...authHeaders() }
      });
      const data = await res.json();
      if (!res.ok) return;
      const p = data.project?.data_json || {};
      setProject({
        ...(p || DEFAULT_PROJECT()),
        id: data.project.id,
        name: data.project.name,
        width: data.project.width,
        height: data.project.height,
        background: data.project.background || p.background || "#10161f"
      });
      setSelectedId(null);
      setSelectedPointIndex(null);
      setPendingPath(null);
      setHistory([]);
      setFuture([]);
      setStatus(`Loaded ${data.project.name}`);
    } catch (e) {
      console.error(e);
    }
  };

  const uploadSvgAsset = async (file) => {
    if (!file) return;
    const form = new FormData();
    form.append("file", file);

    try {
      const res = await fetch(`${backendURL}/api/spx-vector/assets`, {
        method: "POST",
        headers: { ...authHeaders() },
        body: form
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus(data.error || "Upload failed");
        return;
      }
      loadAssets();
      addLayer(createSvgAssetLayer(data.asset?.name || file.name, data.url));
      setStatus("SVG imported");
    } catch (e) {
      console.error(e);
      setStatus("Upload failed");
    }
  };

  const addAssetToProject = (asset) => {
    addLayer(createSvgAssetLayer(asset.name, asset.file_url));
  };

  const exportAsSVG = () => {
    const svg = exportSVG(project);
    const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${project.name || "spx-vector"}.svg`;
    a.click();
    setStatus("SVG exported");
  };

  const exportToPngDataUrl = async () => {
    const svg = exportSVG(project);
    const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    return await new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = project.width;
        canvas.height = project.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        const png = canvas.toDataURL("image/png");
        URL.revokeObjectURL(url);
        resolve(png);
      };
      img.src = url;
    });
  };

  const exportAsPNG = async () => {
    const png = await exportToPngDataUrl();
    const a = document.createElement("a");
    a.href = png;
    a.download = `${project.name || "spx-vector"}.png`;
    a.click();
    setStatus("PNG exported");
  };

  const sendToCanvas = async () => {
    const png = await exportToPngDataUrl();
    localStorage.setItem(
      "spx_vector_transfer",
      JSON.stringify({
        name: `${project.name || "SPX Vector"} Export`,
        png,
        timestamp: Date.now()
      })
    );
    navigate("/spx-canvas");
  };

  const sendToCompositor = async () => {
    const png = await exportToPngDataUrl();
    if (actions.sendToMotion) {
      actions.sendToMotion({
        type: "image",
        url: png,
        name: `${project.name || "SPX Vector"} Export`,
        source: "spx-vector"
      });
    }
    navigate("/node-compositor");
  };

  const sendToMotion = async () => {
    const png = await exportToPngDataUrl();
    if (actions.sendToMotion) {
      actions.sendToMotion({
        type: "image",
        url: png,
        name: `${project.name || "SPX Vector"} Export`,
        source: "spx-vector"
      });
    }
    navigate("/motion-studio");
  };

  const deleteSelectedPoint = () => {
    if (!selectedLayer || selectedLayer.type !== "path" || selectedPointIndex == null) return;
    updateProject((draft) => {
      const idx = draft.layers.findIndex((l) => l.id === selectedLayer.id);
      if (idx === -1) return;
      const pts = [...(draft.layers[idx].points || [])];
      pts.splice(selectedPointIndex, 1);
      draft.layers[idx].points = pts;
    });
    setSelectedPointIndex(null);
  };

  return (
    <div className="spxv-page">
      <div className="spxv-topbar">
        <div className="spxv-brand">✒️ SPX Vector</div>

        <div className="spxv-top-actions">
          <input
            className="spxv-name-input"
            value={project.name}
            onChange={(e) => setProject((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="Project name"
          />
          <button onClick={() => createFromTemplate(templates[0])}>New</button>
          <button onClick={undo} disabled={!history.length}>Undo</button>
          <button onClick={redo} disabled={!future.length}>Redo</button>
          <button onClick={duplicateSelected} disabled={!selectedLayer}>Duplicate</button>
          <button onClick={removeSelected} disabled={!selectedLayer}>Delete</button>
          <button onClick={() => importRef.current?.click()}>Import SVG</button>
          <button onClick={saveProject} disabled={saving}>{saving ? "Saving..." : "Save"}</button>
          <button className="spxv-export-btn" onClick={exportAsSVG}>Export SVG</button>
          <button className="spxv-export-btn" onClick={exportAsPNG}>Export PNG</button>
          <button className="spxv-send-btn" onClick={sendToCanvas}>To Canvas</button>
          <button className="spxv-send-btn" onClick={sendToCompositor}>To Compositor</button>
          <button className="spxv-send-btn" onClick={sendToMotion}>To Motion</button>
        </div>
      </div>

      <input
        ref={importRef}
        type="file"
        hidden
        accept=".svg,image/svg+xml"
        onChange={(e) => uploadSvgAsset(e.target.files?.[0])}
      />

      <div className="spxv-shell">
        <aside className="spxv-left">
          <div className="spxv-toolbox">
            <button className={activeTool === "select" ? "active" : ""} onClick={() => setActiveTool("select")}>Select</button>
            <button className={activeTool === "rect" ? "active" : ""} onClick={() => setActiveTool("rect")}>Rect</button>
            <button className={activeTool === "circle" ? "active" : ""} onClick={() => setActiveTool("circle")}>Circle</button>
            <button className={activeTool === "text" ? "active" : ""} onClick={() => setActiveTool("text")}>Text</button>
            <button className={activeTool === "pen" ? "active" : ""} onClick={() => { setActiveTool("pen"); setPendingPath([]); }}>Pen</button>
          </div>

          {activeTool === "pen" && (
            <div className="spxv-penbar">
              <button onClick={() => commitPendingPath(false)} disabled={!pendingPath || pendingPath.length < 2}>Finish Open Path</button>
              <button onClick={() => {
                if (!pendingPath || pendingPath.length < 2) return;
                const layer = createPathLayer(pendingPath.map((p) => ({ x: p.x, y: p.y })));
                layer.closed = true;
                addLayer(layer);
                setPendingPath(null);
                setActiveTool("select");
                setStatus("Closed path created");
              }} disabled={!pendingPath || pendingPath.length < 2}>Finish Closed Path</button>
              <button onClick={() => { setPendingPath(null); setActiveTool("select"); setStatus("Pen canceled"); }}>Cancel Pen</button>
            </div>
          )}

          <div className="spxv-side-tabs">
            <button className={activeLeftTab === "layers" ? "active" : ""} onClick={() => setActiveLeftTab("layers")}>Layers</button>
            <button className={activeLeftTab === "templates" ? "active" : ""} onClick={() => setActiveLeftTab("templates")}>Templates</button>
            <button className={activeLeftTab === "projects" ? "active" : ""} onClick={() => setActiveLeftTab("projects")}>Projects</button>
            <button className={activeLeftTab === "assets" ? "active" : ""} onClick={() => setActiveLeftTab("assets")}>Assets</button>
            <button className={activeLeftTab === "path" ? "active" : ""} onClick={() => setActiveLeftTab("path")}>Path</button>
          </div>

          {activeLeftTab === "layers" && (
            <div className="spxv-panel">
              <div className="spxv-panel-title">Layers</div>
              {[...project.layers].map((layer, i) => (
                <div
                  key={layer.id}
                  className={`spxv-layer-row ${selectedId === layer.id ? "selected" : ""}`}
                  onClick={() => setSelectedId(layer.id)}
                >
                  <div className="spxv-layer-main">
                    <span>{layer.type === "text" ? "🔤" : layer.type === "svgAsset" ? "📄" : layer.type === "path" ? "🖊" : "⬢"}</span>
                    <span>{layer.name || `${layer.type} ${i + 1}`}</span>
                  </div>
                  <div className="spxv-layer-actions">
                    <button onClick={(e) => { e.stopPropagation(); updateLayer(layer.id, { visible: !layer.visible }); }}>{layer.visible ? "👁" : "🚫"}</button>
                    <button onClick={(e) => { e.stopPropagation(); updateLayer(layer.id, { locked: !layer.locked }); }}>{layer.locked ? "🔒" : "🔓"}</button>
                    <button onClick={(e) => { e.stopPropagation(); moveLayer(layer.id, "up"); }}>↑</button>
                    <button onClick={(e) => { e.stopPropagation(); moveLayer(layer.id, "down"); }}>↓</button>
                  </div>
                </div>
              ))}
              {!project.layers.length && <div className="spxv-empty">No layers yet</div>}
            </div>
          )}

          {activeLeftTab === "templates" && (
            <div className="spxv-panel">
              <div className="spxv-panel-title">Templates</div>
              {templates.map((tpl) => (
                <button key={tpl.id} className="spxv-card-btn" onClick={() => createFromTemplate(tpl)}>
                  <strong>{tpl.name}</strong>
                  <span>{tpl.width} × {tpl.height}</span>
                </button>
              ))}
            </div>
          )}

          {activeLeftTab === "projects" && (
            <div className="spxv-panel">
              <div className="spxv-panel-title">Saved Projects</div>
              {projects.map((p) => (
                <button key={p.id} className="spxv-card-btn" onClick={() => loadProject(p.id)}>
                  <strong>{p.name}</strong>
                  <span>{p.width} × {p.height}</span>
                </button>
              ))}
              {!projects.length && <div className="spxv-empty">No saved projects yet</div>}
            </div>
          )}

          {activeLeftTab === "assets" && (
            <div className="spxv-panel">
              <div className="spxv-panel-title">Vector Assets</div>
              {assets.map((asset) => (
                <button key={asset.id} className="spxv-card-btn" onClick={() => addAssetToProject(asset)}>
                  <strong>{asset.name}</strong>
                  <span>{asset.file_type || "svg"}</span>
                </button>
              ))}
              {!assets.length && <div className="spxv-empty">No uploaded vector assets yet</div>}
            </div>
          )}

          {activeLeftTab === "path" && (
            <div className="spxv-panel">
              <div className="spxv-panel-title">Path Panel</div>
              {!selectedLayer || selectedLayer.type !== "path" ? (
                <div className="spxv-empty">Select a path layer</div>
              ) : (
                <>
                  <div className="spxv-path-meta">Points: {(selectedLayer.points || []).length}</div>
                  <button className="spxv-card-btn" onClick={() => updateLayer(selectedLayer.id, { closed: !selectedLayer.closed })}>
                    <strong>{selectedLayer.closed ? "Open Path" : "Close Path"}</strong>
                    <span>Toggle path closing</span>
                  </button>
                  <button className="spxv-card-btn" onClick={deleteSelectedPoint} disabled={selectedPointIndex == null}>
                    <strong>Delete Selected Anchor</strong>
                    <span>{selectedPointIndex == null ? "Pick an anchor on stage" : `Anchor #${selectedPointIndex + 1}`}</span>
                  </button>
                  <div className="spxv-anchor-list">
                    {(selectedLayer.points || []).map((p, idx) => (
                      <button
                        key={idx}
                        className={`spxv-anchor-row ${selectedPointIndex === idx ? "selected" : ""}`}
                        onClick={() => setSelectedPointIndex(idx)}
                      >
                        <span>#{idx + 1}</span>
                        <span>{Math.round(p.x)}, {Math.round(p.y)}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </aside>

        <main className="spxv-center">
          <div className="spxv-stage-toolbar">
            <div className="spxv-status">{status}</div>
            <div className="spxv-stage-controls">
              <label>Canvas</label>
              <input type="number" value={project.width} onChange={(e) => setProject((p) => ({ ...p, width: parseInt(e.target.value || 1, 10) }))} />
              <input type="number" value={project.height} onChange={(e) => setProject((p) => ({ ...p, height: parseInt(e.target.value || 1, 10) }))} />
              <input type="color" value={project.background} onChange={(e) => setProject((p) => ({ ...p, background: e.target.value }))} />
              <label>Zoom</label>
              <input type="range" min="0.25" max="1.5" step="0.05" value={zoom} onChange={(e) => setZoom(parseFloat(e.target.value))} />
              <span>{Math.round(zoom * 100)}%</span>
            </div>
          </div>

          <div className="spxv-stage-wrap">
            <svg
              ref={stageRef}
              className="spxv-stage"
              viewBox={`0 0 ${project.width} ${project.height}`}
              style={{
                width: project.width,
                height: project.height,
                background: project.background,
                transform: `scale(${zoom})`,
                transformOrigin: "top left"
              }}
              onMouseDown={handleArtboardClick}
            >
              {project.layers.map((layer) => {
                if (!layer.visible) return null;
                const selected = layer.id === selectedId;
                const common = {
                  opacity: layer.opacity ?? 1,
                  transform: `translate(${layer.x || 0} ${layer.y || 0}) rotate(${layer.rotation || 0} ${(layer.width || 0) / 2} ${(layer.height || 0) / 2})`,
                  onMouseDown: (e) => {
                    e.stopPropagation();
                    setSelectedId(layer.id);
                    if (activeTool === "select") beginDrag(e, layer, "move");
                  },
                  style: { cursor: activeTool === "select" ? "move" : "default" }
                };

                return (
                  <g key={layer.id}>
                    {layer.type === "rect" && (
                      <rect
                        {...common}
                        x="0"
                        y="0"
                        width={layer.width}
                        height={layer.height}
                        rx={layer.radius || 0}
                        ry={layer.radius || 0}
                        fill={layer.fill || "none"}
                        stroke={layer.stroke || "none"}
                        strokeWidth={layer.strokeWidth || 0}
                      />
                    )}

                    {layer.type === "circle" && (
                      <ellipse
                        {...common}
                        cx={layer.width / 2}
                        cy={layer.height / 2}
                        rx={layer.width / 2}
                        ry={layer.height / 2}
                        fill={layer.fill || "none"}
                        stroke={layer.stroke || "none"}
                        strokeWidth={layer.strokeWidth || 0}
                      />
                    )}

                    {layer.type === "text" && (
                      <text
                        {...common}
                        x={layer.textAlign === "center" ? layer.width / 2 : layer.textAlign === "right" ? layer.width : 0}
                        y={layer.fontSize || 56}
                        fill={layer.fill || "#fff"}
                        stroke={layer.stroke || "none"}
                        strokeWidth={layer.strokeWidth || 0}
                        fontFamily={layer.fontFamily || "Inter, sans-serif"}
                        fontSize={layer.fontSize || 56}
                        fontWeight={layer.fontWeight || 800}
                        textAnchor={layer.textAlign === "center" ? "middle" : layer.textAlign === "right" ? "end" : "start"}
                      >
                        {String(layer.text || "").split("\n").map((line, i) => (
                          <tspan
                            key={i}
                            x={layer.textAlign === "center" ? layer.width / 2 : layer.textAlign === "right" ? layer.width : 0}
                            dy={i === 0 ? 0 : (layer.fontSize || 56) + 8}
                          >
                            {line}
                          </tspan>
                        ))}
                      </text>
                    )}

                    {layer.type === "svgAsset" && (
                      <image
                        {...common}
                        href={layer.src}
                        x="0"
                        y="0"
                        width={layer.width}
                        height={layer.height}
                        preserveAspectRatio="xMidYMid meet"
                      />
                    )}

                    {layer.type === "path" && (
                      <>
                        <path
                          {...common}
                          d={pathD(layer.points || [], layer.closed)}
                          fill={layer.fill || "none"}
                          stroke={layer.stroke || "#00ffc8"}
                          strokeWidth={layer.strokeWidth || 4}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        {selected && (layer.points || []).map((p, idx) => (
                          <circle
                            key={idx}
                            cx={p.x}
                            cy={p.y}
                            r={selectedPointIndex === idx ? 8 : 6}
                            className="spxv-anchor-point"
                            onMouseDown={(e) => beginPointDrag(e, layer.id, idx)}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedPointIndex(idx);
                            }}
                          />
                        ))}
                      </>
                    )}

                    {selected && activeTool === "select" && layer.type !== "path" && (
                      <g transform={`translate(${layer.x || 0} ${layer.y || 0}) rotate(${layer.rotation || 0} ${(layer.width || 0) / 2} ${(layer.height || 0) / 2})`}>
                        <rect
                          className="spxv-selection-box"
                          x="0"
                          y="0"
                          width={layer.width}
                          height={layer.height}
                          fill="none"
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            beginDrag(e, layer, "move");
                          }}
                        />
                        <circle
                          className="spxv-resize-handle"
                          cx={layer.width}
                          cy={layer.height}
                          r="8"
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            beginDrag(e, layer, "resize");
                          }}
                        />
                      </g>
                    )}
                  </g>
                );
              })}

              {pendingPath && pendingPath.length > 0 && (
                <>
                  <path
                    d={pathD(pendingPath, false)}
                    fill="none"
                    stroke="#ff6600"
                    strokeWidth="3"
                    strokeDasharray="6 4"
                  />
                  {pendingPath.map((p, idx) => (
                    <circle key={idx} cx={p.x} cy={p.y} r="5" className="spxv-pending-point" />
                  ))}
                </>
              )}
            </svg>
          </div>
        </main>

        <aside className="spxv-right">
          <div className="spxv-panel">
            <div className="spxv-panel-title">Properties</div>

            {!selectedLayer && <div className="spxv-empty">Select an object</div>}

            {selectedLayer && (
              <>
                <Field label="Name">
                  <input value={selectedLayer.name || ""} onChange={(e) => updateLayer(selectedLayer.id, { name: e.target.value })} />
                </Field>

                {selectedLayer.type !== "path" && (
                  <div className="spxv-grid-2">
                    <Field label="X"><NumberInput value={selectedLayer.x || 0} onChange={(v) => updateLayer(selectedLayer.id, { x: v })} /></Field>
                    <Field label="Y"><NumberInput value={selectedLayer.y || 0} onChange={(v) => updateLayer(selectedLayer.id, { y: v })} /></Field>
                    <Field label="W"><NumberInput value={selectedLayer.width || 0} min={20} onChange={(v) => updateLayer(selectedLayer.id, { width: v })} /></Field>
                    <Field label="H"><NumberInput value={selectedLayer.height || 0} min={20} onChange={(v) => updateLayer(selectedLayer.id, { height: v })} /></Field>
                  </div>
                )}

                <div className="spxv-grid-2">
                  <Field label="Rotation"><NumberInput value={selectedLayer.rotation || 0} onChange={(v) => updateLayer(selectedLayer.id, { rotation: v })} /></Field>
                  <Field label="Opacity">
                    <input type="range" min="0" max="1" step="0.01" value={selectedLayer.opacity ?? 1} onChange={(e) => updateLayer(selectedLayer.id, { opacity: parseFloat(e.target.value) })} />
                  </Field>
                </div>

                {selectedLayer.type !== "svgAsset" && (
                  <>
                    <div className="spxv-grid-2">
                      <Field label="Fill">
                        <input type="color" value={selectedLayer.fill || "#ffffff"} onChange={(e) => updateLayer(selectedLayer.id, { fill: e.target.value })} />
                      </Field>
                      <Field label="Stroke">
                        <input type="color" value={selectedLayer.stroke || "#000000"} onChange={(e) => updateLayer(selectedLayer.id, { stroke: e.target.value })} />
                      </Field>
                    </div>

                    <Field label="Stroke Width">
                      <NumberInput value={selectedLayer.strokeWidth || 0} min={0} max={40} onChange={(v) => updateLayer(selectedLayer.id, { strokeWidth: v })} />
                    </Field>
                  </>
                )}

                {selectedLayer.type === "rect" && (
                  <Field label="Corner Radius">
                    <NumberInput value={selectedLayer.radius || 0} min={0} max={300} onChange={(v) => updateLayer(selectedLayer.id, { radius: v })} />
                  </Field>
                )}

                {selectedLayer.type === "text" && (
                  <>
                    <Field label="Text">
                      <textarea rows={4} value={selectedLayer.text || ""} onChange={(e) => updateLayer(selectedLayer.id, { text: e.target.value })} />
                    </Field>

                    <div className="spxv-grid-2">
                      <Field label="Font Size">
                        <NumberInput value={selectedLayer.fontSize || 56} min={8} max={300} onChange={(v) => updateLayer(selectedLayer.id, { fontSize: v })} />
                      </Field>
                      <Field label="Weight">
                        <NumberInput value={selectedLayer.fontWeight || 800} min={100} max={900} step={100} onChange={(v) => updateLayer(selectedLayer.id, { fontWeight: v })} />
                      </Field>
                    </div>

                    <Field label="Align">
                      <select value={selectedLayer.textAlign || "left"} onChange={(e) => updateLayer(selectedLayer.id, { textAlign: e.target.value })}>
                        <option value="left">Left</option>
                        <option value="center">Center</option>
                        <option value="right">Right</option>
                      </select>
                    </Field>
                  </>
                )}

                {selectedLayer.type === "svgAsset" && (
                  <Field label="Asset Source">
                    <input value={selectedLayer.src || ""} readOnly />
                  </Field>
                )}

                {selectedLayer.type === "path" && selectedPointIndex != null && selectedLayer.points?.[selectedPointIndex] && (
                  <>
                    <div className="spxv-grid-2">
                      <Field label="Anchor X">
                        <NumberInput
                          value={selectedLayer.points[selectedPointIndex].x}
                          onChange={(v) => updatePathPoint(selectedLayer.id, selectedPointIndex, { x: v })}
                        />
                      </Field>
                      <Field label="Anchor Y">
                        <NumberInput
                          value={selectedLayer.points[selectedPointIndex].y}
                          onChange={(v) => updatePathPoint(selectedLayer.id, selectedPointIndex, { y: v })}
                        />
                      </Field>
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
