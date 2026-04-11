// =============================================================================
// SPXRelationshipWeb.js — Character Relationship Web
// Location: src/front/js/components/spx-script/SPXRelationshipWeb.js
// =============================================================================
import React, { useState, useRef, useCallback, useEffect } from "react";

const RELATION_TYPES = [
  { value: "ally",    label: "Ally",       color: "#00ffc8" },
  { value: "enemy",   label: "Enemy",      color: "#ff4444" },
  { value: "family",  label: "Family",     color: "#FF6600" },
  { value: "friend",  label: "Friend",     color: "#44aaff" },
  { value: "romance", label: "Romance",    color: "#ff4488" },
  { value: "rival",   label: "Rival",      color: "#ffcc00" },
  { value: "mentor",  label: "Mentor",     color: "#aa44ff" },
  { value: "unknown", label: "Unknown",    color: "#5a7088" },
];

const CHAR_COLORS = ["#00ffc8", "#FF6600", "#44aaff", "#ff4488", "#ffcc00", "#aa44ff", "#44ffaa", "#ff8844"];

export default function SPXRelationshipWeb({ worldData, onSelectEntry }) {
  const canvasRef = useRef(null);
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [draggingNode, setDraggingNode] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [selectedNode, setSelectedNode] = useState(null);
  const [addingEdge, setAddingEdge] = useState(null); // first node of edge being drawn
  const [showEdgeForm, setShowEdgeForm] = useState(null); // { from, to }
  const [edgeType, setEdgeType] = useState("ally");
  const [edgeLabel, setEdgeLabel] = useState("");
  const [mode, setMode] = useState("move"); // move | connect

  // Sync nodes from worldData characters
  useEffect(() => {
    const chars = worldData.characters || [];
    setNodes(prev => {
      const existingIds = new Set(prev.map(n => n.id));
      const newNodes = chars
        .filter(c => !existingIds.has(c.id))
        .map((c, i) => ({
          id: c.id,
          name: c.name,
          color: CHAR_COLORS[i % CHAR_COLORS.length],
          x: 150 + (i % 4) * 180,
          y: 100 + Math.floor(i / 4) * 150,
          section: "characters",
        }));
      return [...prev, ...newNodes];
    });
  }, [worldData.characters]);

  // Also add location/faction nodes
  const addWorldNode = (entry) => {
    if (nodes.find(n => n.id === entry.id)) return;
    setNodes(prev => [...prev, {
      id: entry.id,
      name: entry.name,
      color: "#8888aa",
      x: 200 + Math.random() * 400,
      y: 100 + Math.random() * 300,
      section: entry.section,
      isWorld: true,
    }]);
  };

  const handleMouseDown = (e, node) => {
    e.stopPropagation();
    if (mode === "connect") {
      if (!addingEdge) {
        setAddingEdge(node.id);
      } else if (addingEdge !== node.id) {
        setShowEdgeForm({ from: addingEdge, to: node.id });
        setAddingEdge(null);
      }
      return;
    }
    setDraggingNode(node.id);
    const rect = e.currentTarget.getBoundingClientRect();
    setDragOffset({ x: e.clientX - node.x, y: e.clientY - node.y });
    setSelectedNode(node);
  };

  const handleMouseMove = useCallback((e) => {
    if (!draggingNode) return;
    const containerRect = canvasRef.current?.getBoundingClientRect();
    if (!containerRect) return;
    setNodes(prev => prev.map(n =>
      n.id === draggingNode
        ? { ...n, x: Math.max(40, Math.min(containerRect.width - 40, e.clientX - dragOffset.x)), y: Math.max(40, Math.min(containerRect.height - 40, e.clientY - dragOffset.y)) }
        : n
    ));
  }, [draggingNode, dragOffset]);

  const addEdge = () => {
    if (!showEdgeForm) return;
    const existing = edges.find(e => (e.from === showEdgeForm.from && e.to === showEdgeForm.to) || (e.from === showEdgeForm.to && e.to === showEdgeForm.from));
    if (existing) {
      setEdges(prev => prev.map(e => e.id === existing.id ? { ...e, type: edgeType, label: edgeLabel } : e));
    } else {
      setEdges(prev => [...prev, { id: Date.now(), from: showEdgeForm.from, to: showEdgeForm.to, type: edgeType, label: edgeLabel }]);
    }
    setShowEdgeForm(null);
    setEdgeLabel("");
    setEdgeType("ally");
  };

  const deleteEdge = (id) => setEdges(prev => prev.filter(e => e.id !== id));
  const deleteNode = (id) => {
    setNodes(prev => prev.filter(n => n.id !== id));
    setEdges(prev => prev.filter(e => e.from !== id && e.to !== id));
    if (selectedNode?.id === id) setSelectedNode(null);
  };

  const getRelColor = (type) => RELATION_TYPES.find(r => r.value === type)?.color || "#5a7088";

  const containerStyle = { flex: 1, display: "flex", flexDirection: "column", background: "#06060f", overflow: "hidden" };

  return (
    <div style={containerStyle}>
      {/* Toolbar */}
      <div className="spx-script-toolbar">
        <button className={`spx-el-btn ${mode === "move" ? "active" : ""}`} onClick={() => { setMode("move"); setAddingEdge(null); }}>✥ MOVE</button>
        <button className={`spx-el-btn ${mode === "connect" ? "active" : ""}`} onClick={() => setMode("connect")} title="Click two nodes to connect them">🔗 CONNECT{addingEdge ? " — click target" : ""}</button>
        <div className="spx-toolbar-sep">|</div>
        <span className="spx-toolbar-meta">{nodes.length} nodes · {edges.length} connections</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8, flexWrap: "wrap" }}>
          {RELATION_TYPES.map(r => (
            <span key={r.value} style={{ fontSize: 10, color: r.color, display: "flex", alignItems: "center", gap: 3 }}>
              <span style={{ width: 16, height: 2, background: r.color, display: "inline-block" }} />{r.label}
            </span>
          ))}
        </div>
      </div>

      {/* Canvas */}
      <div
        ref={canvasRef}
        style={{ flex: 1, position: "relative", overflow: "hidden", cursor: mode === "connect" ? "crosshair" : draggingNode ? "grabbing" : "default" }}
        onMouseMove={handleMouseMove}
        onMouseUp={() => setDraggingNode(null)}
        onClick={() => { if (mode === "connect" && addingEdge) setAddingEdge(null); }}
      >
        {nodes.length === 0 ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12, color: "#5a7088", height: "100%" }}>
            <div style={{ fontSize: 40, opacity: 0.15 }}>🕸</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#8888aa" }}>No characters yet</div>
            <div style={{ fontSize: 12, textAlign: "center", lineHeight: 1.8 }}>Add characters in the World nav.<br />They'll appear here automatically.</div>
          </div>
        ) : (
          <>
            {/* SVG edges */}
            <svg style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
              {edges.map(edge => {
                const from = nodes.find(n => n.id === edge.from);
                const to = nodes.find(n => n.id === edge.to);
                if (!from || !to) return null;
                const color = getRelColor(edge.type);
                const mx = (from.x + to.x) / 2;
                const my = (from.y + to.y) / 2;
                return (
                  <g key={edge.id}>
                    <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke={color} strokeWidth={2} strokeOpacity={0.6} />
                    {edge.label && (
                      <text x={mx} y={my - 6} fill={color} fontSize={10} textAnchor="middle" fontFamily="'Rajdhani', monospace" fontWeight="700">{edge.label}</text>
                    )}
                    <text x={mx} y={my + 12} fill={color} fontSize={9} textAnchor="middle" fontFamily="'Rajdhani', monospace" opacity={0.6}>{RELATION_TYPES.find(r => r.value === edge.type)?.label}</text>
                  </g>
                );
              })}
              {/* Drawing edge preview */}
              {addingEdge && (() => {
                const fromNode = nodes.find(n => n.id === addingEdge);
                if (!fromNode) return null;
                return <circle cx={fromNode.x} cy={fromNode.y} r={34} fill="none" stroke="#00ffc8" strokeWidth={2} strokeDasharray="4 4" opacity={0.6} />;
              })()}
            </svg>

            {/* Nodes */}
            {nodes.map(node => {
              const isSel = selectedNode?.id === node.id;
              const isConnecting = addingEdge === node.id;
              return (
                <div
                  key={node.id}
                  style={{
                    position: "absolute",
                    left: node.x - 32,
                    top: node.y - 32,
                    width: 64,
                    height: 64,
                    borderRadius: "50%",
                    background: `${node.color}22`,
                    border: `2px solid ${isConnecting ? "#fff" : isSel ? node.color : node.color + "88"}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexDirection: "column",
                    cursor: mode === "connect" ? "crosshair" : "grab",
                    userSelect: "none",
                    zIndex: isSel ? 10 : 2,
                    boxShadow: isSel ? `0 0 12px ${node.color}44` : "none",
                    transition: "box-shadow .15s, border-color .15s",
                  }}
                  onMouseDown={e => handleMouseDown(e, node)}
                  onDoubleClick={() => { if (onSelectEntry) { const entry = [...(worldData.characters || []), ...(worldData.locations || []), ...(worldData.factions || [])].find(e => e.id === node.id); if (entry) onSelectEntry({ ...entry, section: node.section }); } }}
                  title="Drag to move · Double-click to open Bible · Connect mode: click to link"
                >
                  <div style={{ fontSize: 9, fontWeight: 700, color: node.color, textAlign: "center", padding: "0 4px", lineHeight: 1.2, wordBreak: "break-word" }}>{node.name.slice(0, 10)}</div>
                  {node.isWorld && <div style={{ fontSize: 8, color: "#5a7088" }}>{node.section}</div>}
                </div>
              );
            })}
          </>
        )}
      </div>

      {/* Edge form modal */}
      {showEdgeForm && (
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", background: "#0d1a2e", border: "1px solid rgba(255,255,255,0.13)", borderRadius: 8, padding: 20, zIndex: 50, minWidth: 280, boxShadow: "0 8px 30px rgba(0,0,0,0.7)" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#5a7088", letterSpacing: 1, textTransform: "uppercase", marginBottom: 12 }}>
            {nodes.find(n => n.id === showEdgeForm.from)?.name} → {nodes.find(n => n.id === showEdgeForm.to)?.name}
          </div>
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 10, color: "#8888aa", marginBottom: 4 }}>Relationship Type</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {RELATION_TYPES.map(r => (
                <button key={r.value} onClick={() => setEdgeType(r.value)}
                  style={{ padding: "4px 10px", borderRadius: 3, border: `1px solid ${edgeType === r.value ? r.color : "rgba(255,255,255,0.1)"}`, background: edgeType === r.value ? `${r.color}22` : "transparent", color: edgeType === r.value ? r.color : "#8888aa", cursor: "pointer", fontSize: 10, fontFamily: "inherit", fontWeight: edgeType === r.value ? 700 : 400 }}>
                  {r.label}
                </button>
              ))}
            </div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 10, color: "#8888aa", marginBottom: 4 }}>Label (optional)</div>
            <input value={edgeLabel} onChange={e => setEdgeLabel(e.target.value)} onKeyDown={e => e.key === "Enter" && addEdge()} placeholder="e.g. older brother, betrayed by..." style={{ width: "100%", background: "#111122", border: "1px solid rgba(255,255,255,0.13)", color: "#dde0f0", padding: "6px 8px", borderRadius: 3, fontFamily: "inherit", fontSize: 11, outline: "none", boxSizing: "border-box" }} />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={addEdge} style={{ flex: 1, padding: "8px", borderRadius: 4, border: "none", background: "#00ffc8", color: "#000", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", fontSize: 12 }}>Connect</button>
            <button onClick={() => { setShowEdgeForm(null); setEdgeLabel(""); }} style={{ padding: "8px 14px", borderRadius: 4, border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "#8888aa", cursor: "pointer", fontFamily: "inherit", fontSize: 12 }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Selected node info */}
      {selectedNode && mode === "move" && (
        <div style={{ flexShrink: 0, padding: "8px 16px", background: "#0d0d1a", borderTop: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: selectedNode.color, flexShrink: 0 }} />
          <div style={{ flex: 1, fontSize: 12, fontWeight: 700, color: "#dde0f0" }}>{selectedNode.name}</div>
          <div style={{ fontSize: 11, color: "#5a7088" }}>{edges.filter(e => e.from === selectedNode.id || e.to === selectedNode.id).length} connections</div>
          <button onClick={() => { const entry = [...(worldData.characters || []), ...(worldData.locations || [])].find(e => e.id === selectedNode.id); if (entry) onSelectEntry && onSelectEntry({ ...entry, section: selectedNode.section }); }} style={{ padding: "3px 10px", borderRadius: 3, border: "1px solid rgba(0,255,200,0.3)", background: "rgba(0,255,200,0.1)", color: "#00ffc8", cursor: "pointer", fontFamily: "inherit", fontSize: 10, fontWeight: 600 }}>Open Bible</button>
          <button onClick={() => deleteNode(selectedNode.id)} style={{ padding: "3px 8px", borderRadius: 3, border: "1px solid rgba(255,68,68,0.3)", background: "transparent", color: "#ff4444", cursor: "pointer", fontFamily: "inherit", fontSize: 10 }}>Remove</button>
          <button onClick={() => setSelectedNode(null)} style={{ padding: "3px 8px", borderRadius: 3, border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "#8888aa", cursor: "pointer", fontFamily: "inherit", fontSize: 10 }}>✕</button>
        </div>
      )}
    </div>
  );
}
