import React, { useMemo, useRef, useState } from "react";

function getPortPosition(node, side = "right") {
  const x = node.x ?? 100;
  const y = node.y ?? 100;
  const w = 180;
  const h = 76;
  return {
    x: side === "left" ? x : x + w,
    y: y + h / 2,
  };
}

function buildEdgePath(from, to) {
  const dx = Math.abs(to.x - from.x);
  const c1x = from.x + Math.max(60, dx * 0.35);
  const c2x = to.x - Math.max(60, dx * 0.35);
  return `M ${from.x} ${from.y} C ${c1x} ${from.y}, ${c2x} ${to.y}, ${to.x} ${to.y}`;
}

export default function NodeGraphPro({
  nodes = [],
  edges = [],
  selectedId = null,
  onSelect = () => {},
  onNodesChange = () => {},
  onEdgesChange = () => {},
}) {
  const wrapRef = useRef(null);
  const [drag, setDrag] = useState(null);
  const [pendingEdge, setPendingEdge] = useState(null);

  const nodeMap = useMemo(() => {
    const m = {};
    nodes.forEach((n) => {
      m[n.id] = n;
    });
    return m;
  }, [nodes]);

  const svgEdges = useMemo(() => {
    return edges
      .map((edge) => {
        const fromNode = nodeMap[edge.from];
        const toNode = nodeMap[edge.to];
        if (!fromNode || !toNode) return null;

        const from = getPortPosition(fromNode, "right");
        const to = getPortPosition(toNode, "left");
        return {
          ...edge,
          d: buildEdgePath(from, to),
        };
      })
      .filter(Boolean);
  }, [edges, nodeMap]);

  const onMouseMove = (e) => {
    if (!wrapRef.current) return;
    const rect = wrapRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    if (drag) {
      onNodesChange(
        nodes.map((n) =>
          n.id === drag.id
            ? {
                ...n,
                x: Math.max(8, mx - drag.offsetX),
                y: Math.max(8, my - drag.offsetY),
              }
            : n
        )
      );
    }

    if (pendingEdge) {
      setPendingEdge((p) => (p ? { ...p, mx, my } : p));
    }
  };

  const onMouseUp = () => {
    setDrag(null);
  };

  const beginDrag = (e, node) => {
    e.stopPropagation();
    if (!wrapRef.current) return;
    const rect = wrapRef.current.getBoundingClientRect();
    onSelect(node.id);
    setDrag({
      id: node.id,
      offsetX: e.clientX - rect.left - (node.x ?? 100),
      offsetY: e.clientY - rect.top - (node.y ?? 100),
    });
  };

  const beginEdge = (e, node) => {
    e.stopPropagation();
    if (!wrapRef.current) return;
    const rect = wrapRef.current.getBoundingClientRect();
    const p = getPortPosition(node, "right");
    setPendingEdge({
      from: node.id,
      x: p.x,
      y: p.y,
      mx: e.clientX - rect.left,
      my: e.clientY - rect.top,
    });
  };

  const finishEdge = (e, node) => {
    e.stopPropagation();
    if (!pendingEdge || pendingEdge.from === node.id) {
      setPendingEdge(null);
      return;
    }

    const id = `edge_${pendingEdge.from}_${node.id}_${Date.now()}`;
    onEdgesChange([
      ...edges,
      {
        id,
        from: pendingEdge.from,
        to: node.id,
      },
    ]);
    setPendingEdge(null);
  };

  const pendingPath =
    pendingEdge &&
    buildEdgePath(
      { x: pendingEdge.x, y: pendingEdge.y },
      { x: pendingEdge.mx, y: pendingEdge.my }
    );

  return (
    <div
      ref={wrapRef}
      className="spx-node-graph-pro"
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
    >
      <svg className="spx-node-edge-layer" width="100%" height="100%">
        {svgEdges.map((edge) => (
          <path key={edge.id} d={edge.d} className="spx-node-edge" />
        ))}
        {pendingPath ? <path d={pendingPath} className="spx-node-edge pending" /> : null}
      </svg>

      {nodes.map((node) => (
        <div
          key={node.id}
          className={`spx-node-pro ${selectedId === node.id ? "active" : ""}`}
          style={{ left: node.x ?? 100, top: node.y ?? 100 }}
          onMouseDown={(e) => beginDrag(e, node)}
          onClick={() => onSelect(node.id)}
        >
          <div className="spx-node-pro-header">
            <div className="spx-node-pro-title">{node.type}</div>
            <div className="spx-node-pro-sub">{node.id}</div>
          </div>

          <div className="spx-node-pro-body">
            {node.shader ? <div>Shader: {node.shader}</div> : null}
            {node.value !== undefined && node.value !== null ? (
              <div>Value: {String(node.value)}</div>
            ) : null}
          </div>

          <button
            type="button"
            className="spx-port spx-port-out"
            onMouseDown={(e) => beginEdge(e, node)}
            title="Output"
          />
          <button
            type="button"
            className="spx-port spx-port-in"
            onMouseUp={(e) => finishEdge(e, node)}
            title="Input"
          />
        </div>
      ))}
    </div>
  );
}
