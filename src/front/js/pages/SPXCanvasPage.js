import React, { useEffect, useMemo, useRef, useState } from "react";
import "../../styles/SPXCanvas.css";

const makeId = (prefix = "layer") =>
  `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

const DEFAULT_PROJECT = {
  name: "Untitled Canvas",
  width: 1200,
  height: 700,
  background: "#1c2a38",
  layers: []
};

const TOOLS = [
  { id: "move", label: "Move" },
  { id: "select", label: "Select" },
  { id: "brush", label: "Brush" },
  { id: "eraser", label: "Eraser" },
  { id: "rect", label: "Rect" },
  { id: "text", label: "Text" },
  { id: "crop", label: "Crop" }
];

export default function SPXCanvasPage() {
  const stageRef = useRef(null);

  const [project, setProject] = useState(DEFAULT_PROJECT);
  const [activeTool, setActiveTool] = useState("move");
  const [selectedId, setSelectedId] = useState(null);
  const [dragState, setDragState] = useState(null);
  const [history, setHistory] = useState([]);
  const [future, setFuture] = useState([]);
  const [status, setStatus] = useState("Ready");
  const [brushColor, setBrushColor] = useState("#00ffc8");
  const [brushSize, setBrushSize] = useState(8);
  const [textInput, setTextInput] = useState("SPX Text");
  const [activeTab, setActiveTab] = useState("layers");
  const [cropRect, setCropRect] = useState(null);

  const selectedLayer = useMemo(
    () => project.layers.find((l) => l.id === selectedId) || null,
    [project.layers, selectedId]
  );

  const pushHistoryProject = (snapshot) => {
    setHistory((prev) => [...prev.slice(-39), JSON.parse(JSON.stringify(snapshot))]);
    setFuture([]);
  };

  const updateProject = (producer) => {
    const snapshot = JSON.parse(JSON.stringify(project));
    const next = JSON.parse(JSON.stringify(project));
    producer(next);
    pushHistoryProject(snapshot);
    setProject(next);
  };

  const updateLayer = (id, patch) => {
    updateProject((draft) => {
      draft.layers = draft.layers.map((layer) =>
        layer.id === id ? { ...layer, ...patch } : layer
      );
    });
  };

  const removeSelected = () => {
    if (!selectedId) return;
    updateProject((draft) => {
      draft.layers = draft.layers.filter((layer) => layer.id !== selectedId);
    });
    setSelectedId(null);
    setStatus("Layer deleted");
  };

  const duplicateSelected = () => {
    if (!selectedLayer) return;
    updateProject((draft) => {
      const clone = JSON.parse(JSON.stringify(selectedLayer));
      clone.id = makeId(clone.type || "layer");
      clone.name = `${selectedLayer.name || selectedLayer.type} Copy`;
      clone.x = (clone.x || 0) + 24;
      clone.y = (clone.y || 0) + 24;
      draft.layers.push(clone);
    });
    setStatus("Layer duplicated");
  };

  const moveLayerOrder = (id, direction) => {
    updateProject((draft) => {
      const idx = draft.layers.findIndex((l) => l.id === id);
      if (idx === -1) return;
      const swap = direction === "up" ? idx + 1 : idx - 1;
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
    setStatus("Undo");
  };

  const redo = () => {
    if (!future.length) return;
    const next = future[0];
    setHistory((h) => [...h.slice(-39), JSON.parse(JSON.stringify(project))]);
    setFuture((f) => f.slice(1));
    setProject(next);
    setStatus("Redo");
  };

  const getStagePoint = (event) => {
    if (!stageRef.current) return { x: 0, y: 0 };
    const rect = stageRef.current.getBoundingClientRect();
    return {
      x: clamp(event.clientX - rect.left, 0, project.width),
      y: clamp(event.clientY - rect.top, 0, project.height)
    };
  };

  const beginDrag = (event, layer, kind = "move") => {
    if (layer.locked) return;
    const pt = getStagePoint(event);
    setSelectedId(layer.id);
    setDragState({
      id: layer.id,
      kind,
      startX: pt.x,
      startY: pt.y,
      originX: layer.x || 0,
      originY: layer.y || 0,
      originW: layer.width || 0,
      originH: layer.height || 0,
      snapshot: JSON.parse(JSON.stringify(project))
    });
  };

  useEffect(() => {
    const onMove = (e) => {
      if (!dragState) return;
      const pt = getStagePoint(e);

      if (dragState.kind === "move") {
        setProject((prev) => ({
          ...prev,
          layers: prev.layers.map((layer) =>
            layer.id === dragState.id
              ? {
                  ...layer,
                  x: clamp(dragState.originX + (pt.x - dragState.startX), 0, Math.max(0, prev.width - (layer.width || 1))),
                  y: clamp(dragState.originY + (pt.y - dragState.startY), 0, Math.max(0, prev.height - (layer.height || 1)))
                }
              : layer
          )
        }));
      }

      if (dragState.kind === "resize") {
        setProject((prev) => ({
          ...prev,
          layers: prev.layers.map((layer) =>
            layer.id === dragState.id
              ? {
                  ...layer,
                  width: clamp(dragState.originW + (pt.x - dragState.startX), 24, prev.width - (layer.x || 0)),
                  height: clamp(dragState.originH + (pt.y - dragState.startY), 24, prev.height - (layer.y || 0))
                }
              : layer
          )
        }));
      }

      if (dragState.kind === "draw") {
        setProject((prev) => ({
          ...prev,
          layers: prev.layers.map((layer) => {
            if (layer.id !== dragState.id) return layer;
            return {
              ...layer,
              points: [...(layer.points || []), { x: pt.x, y: pt.y }]
            };
          })
        }));
      }

      if (dragState.kind === "crop") {
        setCropRect({
          x: Math.min(dragState.startX, pt.x),
          y: Math.min(dragState.startY, pt.y),
          width: Math.abs(pt.x - dragState.startX),
          height: Math.abs(pt.y - dragState.startY)
        });
      }
    };

    const onUp = () => {
      if (dragState && (dragState.kind === "move" || dragState.kind === "resize" || dragState.kind === "draw" || dragState.kind === "crop")) {
        setHistory((prev) => [...prev.slice(-39), JSON.parse(JSON.stringify(dragState.snapshot))]);
        setFuture([]);
      }
      setDragState(null);
      if (cropRect) setStatus("Crop box placed");
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [dragState, project.width, project.height, cropRect]);

  const handleStageMouseDown = (e) => {
    const pt = getStagePoint(e);

    if (activeTool === "rect") {
      const layer = {
        id: makeId("rect"),
        type: "rect",
        name: "Rectangle",
        x: pt.x,
        y: pt.y,
        width: 180,
        height: 120,
        rotation: 0,
        opacity: 1,
        fill: brushColor,
        visible: true,
        locked: false
      };
      updateProject((draft) => {
        draft.layers.push(layer);
      });
      setSelectedId(layer.id);
      setStatus("Rectangle added");
      return;
    }

    if (activeTool === "text") {
      const layer = {
        id: makeId("text"),
        type: "text",
        name: "Text",
        x: pt.x,
        y: pt.y,
        width: 260,
        height: 64,
        rotation: 0,
        opacity: 1,
        color: brushColor,
        text: textInput || "SPX Text",
        fontSize: 28,
        visible: true,
        locked: false
      };
      updateProject((draft) => {
        draft.layers.push(layer);
      });
      setSelectedId(layer.id);
      setStatus("Text added");
      return;
    }

    if (activeTool === "brush" || activeTool === "eraser") {
      const layer = {
        id: makeId("draw"),
        type: "draw",
        name: activeTool === "eraser" ? "Eraser Stroke" : "Brush Stroke",
        points: [{ x: pt.x, y: pt.y }],
        color: activeTool === "eraser" ? project.background : brushColor,
        size: brushSize,
        opacity: 1,
        visible: true,
        locked: false
      };
      setProject((prev) => ({
        ...prev,
        layers: [...prev.layers, layer]
      }));
      setSelectedId(layer.id);
      setDragState({
        id: layer.id,
        kind: "draw",
        startX: pt.x,
        startY: pt.y,
        snapshot: JSON.parse(JSON.stringify(project))
      });
      setStatus(activeTool === "eraser" ? "Erasing..." : "Drawing...");
      return;
    }

    if (activeTool === "crop") {
      setCropRect({ x: pt.x, y: pt.y, width: 0, height: 0 });
      setDragState({
        id: "crop",
        kind: "crop",
        startX: pt.x,
        startY: pt.y,
        snapshot: JSON.parse(JSON.stringify(project))
      });
      setStatus("Dragging crop box...");
      return;
    }

    if (activeTool === "select" || activeTool === "move") {
      setSelectedId(null);
    }
  };

  const clearCanvas = () => {
    pushHistoryProject(project);
    setProject((prev) => ({ ...prev, layers: [] }));
    setSelectedId(null);
    setStatus("Canvas cleared");
  };

  const renderPath = (points = []) => {
    if (!points.length) return "";
    return points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
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
            placeholder="Canvas name"
          />
          <button onClick={undo} disabled={!history.length}>Undo</button>
          <button onClick={redo} disabled={!future.length}>Redo</button>
          <button onClick={duplicateSelected} disabled={!selectedLayer}>Duplicate</button>
          <button onClick={removeSelected} disabled={!selectedLayer}>Delete</button>
          <button onClick={clearCanvas}>Clear</button>
        </div>
      </div>

      <div className="spx-canvas-shell">

        <div className="spx-left-toolbar">
          {TOOLS.map(tool => (
            <div
              key={tool.id}
              className={`spx-tool-btn ${activeTool === tool.id ? "active" : ""}`}
              onClick={() => setActiveTool(tool.id)}
            >
              {tool.label[0]}
            </div>
          ))}
        </div>
        
        <aside className="spx-canvas-left">
          <div className="spx-tools-bar">
            {TOOLS.map((tool) => (
              <button
                key={tool.id}
                className={activeTool === tool.id ? "active" : ""}
                onClick={() => setActiveTool(tool.id)}
                type="button"
              >
                {tool.label}
              </button>
            ))}
          </div>

          <div className="spx-side-tabs">
            <button className={activeTab === "layers" ? "active" : ""} onClick={() => setActiveTab("layers")}>Layers</button>
            <button className={activeTab === "tools" ? "active" : ""} onClick={() => setActiveTab("tools")}>Tools</button>
            <button className={activeTab === "notes" ? "active" : ""} onClick={() => setActiveTab("notes")}>Notes</button>
          </div>

          {activeTab === "layers" && (
            <div className="spx-panel">
              <div className="spx-panel-title">Layers</div>
              {[...project.layers].reverse().map((layer) => (
                <div
                  key={layer.id}
                  className={`spx-layer-row ${selectedId === layer.id ? "selected" : ""}`}
                  onClick={() => setSelectedId(layer.id)}
                >
                  <div className="spx-layer-main">
                    <span>{layer.type}</span>
                    <span>{layer.name || layer.type}</span>
                  </div>
                  <div className="spx-layer-actions">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        updateLayer(layer.id, { visible: !layer.visible });
                      }}
                    >
                      {layer.visible ? "👁" : "🚫"}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        updateLayer(layer.id, { locked: !layer.locked });
                      }}
                    >
                      {layer.locked ? "🔒" : "🔓"}
                    </button>
                    <button type="button" onClick={(e) => { e.stopPropagation(); moveLayerOrder(layer.id, "up"); }}>↑</button>
                    <button type="button" onClick={(e) => { e.stopPropagation(); moveLayerOrder(layer.id, "down"); }}>↓</button>
                  </div>
                </div>
              ))}
              {!project.layers.length && <div className="spx-empty">No layers yet</div>}
            </div>
          )}

          {activeTab === "tools" && (
            <div className="spx-panel">
              <div className="spx-panel-title">Tool Options</div>

              <div className="spx-field">
                <label>Brush / Shape Color</label>
                <input type="color" value={brushColor} onChange={(e) => setBrushColor(e.target.value)} />
              </div>

              <div className="spx-field">
                <label>Brush Size</label>
                <input type="range" min="1" max="50" value={brushSize} onChange={(e) => setBrushSize(Number(e.target.value))} />
              </div>

              <div className="spx-field">
                <label>Text</label>
                <textarea rows="4" value={textInput} onChange={(e) => setTextInput(e.target.value)} />
              </div>
            </div>
          )}

          {activeTab === "notes" && (
            <div className="spx-panel">
              <div className="spx-panel-title">Status</div>
              <div className="spx-empty-note">{status}</div>
              <div className="spx-empty-note">Drop 4–6 enabled: select, move, resize, layers, inspector, crop placeholder.</div>
            </div>
          )}
        </aside>

        <main className="spx-canvas-center">

        <div className="spx-top-toolbar">
          <label>Tool: {activeTool}</label>

          <label>Size</label>
          <input type="range" min="1" max="50" value={brushSize}
            onChange={e=>setBrushSize(Number(e.target.value))} />

          <label>Color</label>
          <input type="color" value={brushColor}
            onChange={e=>setBrushColor(e.target.value)} />
        </div>
        
          <div className="spx-stage-toolbar">
            <div className="spx-status">{status}</div>
            <div className="spx-stage-controls">
              <label>Canvas</label>
              <input
                type="number"
                value={project.width}
                onChange={(e) => setProject((prev) => ({ ...prev, width: Number(e.target.value || 1) }))}
              />
              <input
                type="number"
                value={project.height}
                onChange={(e) => setProject((prev) => ({ ...prev, height: Number(e.target.value || 1) }))}
              />
              <input
                type="color"
                value={project.background}
                onChange={(e) => setProject((prev) => ({ ...prev, background: e.target.value }))}
              />
            </div>
          </div>

          <div className="spx-stage-wrap">
            <div
              ref={stageRef}
              className="spx-stage"
              style={{
                width: project.width,
                height: project.height,
                background: project.background
              }}
              onMouseDown={handleStageMouseDown}
            >
              {project.layers.map((layer) => {
                if (layer.visible === false) return null;

                if (layer.type === "draw") {
                  return (
                    <svg key={layer.id} className="spx-brush-svg">
                      <path
                        d={renderPath(layer.points)}
                        fill="none"
                        stroke={layer.color}
                        strokeWidth={layer.size}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        opacity={layer.opacity ?? 1}
                      />
                    </svg>
                  );
                }

                return (
                  <div
                    key={layer.id}
                    className={`spx-layer ${selectedId === layer.id ? "selected" : ""} type-${layer.type}`}
                    style={{
                      left: layer.x || 0,
                      top: layer.y || 0,
                      width: layer.width || 100,
                      height: layer.height || 100,
                      opacity: layer.opacity ?? 1,
                      transform: `rotate(${layer.rotation || 0}deg)`
                    }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      setSelectedId(layer.id);
                      if (activeTool === "move" || activeTool === "select") {
                        beginDrag(e, layer, "move");
                      }
                    }}
                  >
                    {layer.type === "rect" && (
                      <div
                        className="spx-shape"
                        style={{ background: layer.fill || "#00ffc8" }}
                      />
                    )}

                    {layer.type === "text" && (
                      <div
                        className="spx-text-layer"
                        style={{
                          color: layer.color || "#fff",
                          fontSize: layer.fontSize || 28
                        }}
                      >
                        {layer.text}
                      </div>
                    )}

                    {selectedId === layer.id && layer.type !== "draw" && (
                      <div
                        className="spx-resize-handle"
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          beginDrag(e, layer, "resize");
                        }}
                      />
                    )}
                  </div>
                );
              })}

              {cropRect && (
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
            <div className="spx-panel-title">Inspector</div>

            {!selectedLayer && <div className="spx-empty">Select a layer</div>}

            {selectedLayer && (
              <>
                <div className="spx-field">
                  <label>Name</label>
                  <input
                    type="text"
                    value={selectedLayer.name || ""}
                    onChange={(e) => updateLayer(selectedLayer.id, { name: e.target.value })}
                  />
                </div>

                {"x" in selectedLayer && (
                  <div className="spx-grid-2">
                    <div className="spx-field">
                      <label>X</label>
                      <input
                        type="number"
                        value={selectedLayer.x || 0}
                        onChange={(e) => updateLayer(selectedLayer.id, { x: Number(e.target.value || 0) })}
                      />
                    </div>
                    <div className="spx-field">
                      <label>Y</label>
                      <input
                        type="number"
                        value={selectedLayer.y || 0}
                        onChange={(e) => updateLayer(selectedLayer.id, { y: Number(e.target.value || 0) })}
                      />
                    </div>
                  </div>
                )}

                {"width" in selectedLayer && (
                  <div className="spx-grid-2">
                    <div className="spx-field">
                      <label>W</label>
                      <input
                        type="number"
                        value={selectedLayer.width || 0}
                        onChange={(e) => updateLayer(selectedLayer.id, { width: Number(e.target.value || 0) })}
                      />
                    </div>
                    <div className="spx-field">
                      <label>H</label>
                      <input
                        type="number"
                        value={selectedLayer.height || 0}
                        onChange={(e) => updateLayer(selectedLayer.id, { height: Number(e.target.value || 0) })}
                      />
                    </div>
                  </div>
                )}

                <div className="spx-field">
                  <label>Opacity</label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={selectedLayer.opacity ?? 1}
                    onChange={(e) => updateLayer(selectedLayer.id, { opacity: Number(e.target.value) })}
                  />
                </div>

                {selectedLayer.type === "rect" && (
                  <div className="spx-field">
                    <label>Fill</label>
                    <input
                      type="color"
                      value={selectedLayer.fill || "#00ffc8"}
                      onChange={(e) => updateLayer(selectedLayer.id, { fill: e.target.value })}
                    />
                  </div>
                )}

                {selectedLayer.type === "text" && (
                  <>
                    <div className="spx-field">
                      <label>Text</label>
                      <textarea
                        rows="4"
                        value={selectedLayer.text || ""}
                        onChange={(e) => updateLayer(selectedLayer.id, { text: e.target.value })}
                      />
                    </div>
                    <div className="spx-field">
                      <label>Color</label>
                      <input
                        type="color"
                        value={selectedLayer.color || "#ffffff"}
                        onChange={(e) => updateLayer(selectedLayer.id, { color: e.target.value })}
                      />
                    </div>
                    <div className="spx-field">
                      <label>Font Size</label>
                      <input
                        type="number"
                        value={selectedLayer.fontSize || 28}
                        onChange={(e) => updateLayer(selectedLayer.id, { fontSize: Number(e.target.value || 1) })}
                      />
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
