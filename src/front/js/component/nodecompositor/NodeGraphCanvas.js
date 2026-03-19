import React, { useMemo, useRef, useState } from "react";

function getPortPosition(node, side, index) {
  const headerHeight = 44;
  const rowGap = 22;
  const startY = headerHeight + 18;
  const y = node.y + startY + index * rowGap;
  const x = side === "input" ? node.x : node.x + node.width;
  return { x, y };
}

function buildPortMap(nodes) {
  const map = {};
  nodes.forEach((node) => {
    node.inputs.forEach((input, i) => {
      map[`${node.id}:in:${input}`] = getPortPosition(node, "input", i);
    });
    node.outputs.forEach((output, i) => {
      map[`${node.id}:out:${output}`] = getPortPosition(node, "output", i);
    });
  });
  return map;
}

function NodeCard({
  node,
  selected,
  onSelect,
  onDrag,
  onPortMouseDown,
  onPortMouseUp
}) {
  const handleMouseDown = (e) => {
    e.stopPropagation();
    onSelect(node.id);

    const startX = e.clientX;
    const startY = e.clientY;
    const startNodeX = node.x;
    const startNodeY = node.y;

    const onMove = (ev) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      onDrag(node.id, startNodeX + dx, startNodeY + dy);
    };

    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  return (
    <div
      className={`nc-node ${selected ? "selected" : ""}`}
      style={{
        left: node.x,
        top: node.y,
        borderColor: node.color
      }}
      onMouseDown={handleMouseDown}
    >
      <div className="nc-node-header" style={{ background: `${node.color}22` }}>
        <span className="nc-node-header-dot" style={{ background: node.color }} />
        {node.properties.name || node.label}
      </div>

      <div className="nc-node-body">
        <div className="nc-node-ports">
          <div className="nc-node-side">
            {node.inputs.map((input) => (
              <div key={input} className="nc-port-row">
                <button
                  className="nc-port nc-port-in"
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    onPortMouseUp(node.id, input);
                  }}
                  title={`${node.label}:${input}`}
                />
                <span className="nc-port-label">{input}</span>
              </div>
            ))}
          </div>

          <div className="nc-node-side nc-node-side-right">
            {node.outputs.map((output) => (
              <div key={output} className="nc-port-row right">
                <span className="nc-port-label">{output}</span>
                <button
                  className="nc-port nc-port-out"
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    onPortMouseDown(e, node.id, output);
                  }}
                  title={`${node.label}:${output}`}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function EdgeLayer({
  nodes,
  edges,
  selectedEdgeId,
  setSelectedEdgeId,
  setSelectedNodeId,
  liveConnection
}) {
  const portMap = useMemo(() => buildPortMap(nodes), [nodes]);

  const edgePath = (a, b) => {
    const c1x = a.x + 120;
    const c2x = b.x - 120;
    return `M ${a.x} ${a.y} C ${c1x} ${a.y}, ${c2x} ${b.y}, ${b.x} ${b.y}`;
  };

  return (
    <svg className="nc-edge-layer">
      {edges.map((edge) => {
        const a = portMap[`${edge.fromNodeId}:out:${edge.fromPort}`];
        const b = portMap[`${edge.toNodeId}:in:${edge.toPort}`];
        if (!a || !b) return null;

        return (
          <path
            key={edge.id}
            d={edgePath(a, b)}
            className={`nc-edge-path ${selectedEdgeId === edge.id ? "selected" : ""}`}
            onMouseDown={(e) => {
              e.stopPropagation();
              setSelectedEdgeId(edge.id);
              setSelectedNodeId(null);
            }}
          />
        );
      })}

      {liveConnection && liveConnection.start ? (
        <path
          d={edgePath(liveConnection.start, liveConnection.end)}
          className="nc-edge-path nc-edge-live"
        />
      ) : null}
    </svg>
  );
}

export default function NodeGraphCanvas({
  nodes,
  edges,
  selectedNodeId,
  setSelectedNodeId,
  selectedEdgeId,
  setSelectedEdgeId,
  updateNodePosition,
  addEdge
}) {
  const [zoom] = useState(1);
  const [pendingConnection, setPendingConnection] = useState(null);
  const [liveConnection, setLiveConnection] = useState(null);
  const wrapRef = useRef(null);

  const portMap = useMemo(() => buildPortMap(nodes), [nodes]);

  const handleCanvasMouseMove = (e) => {
    if (!pendingConnection || !wrapRef.current) return;
    const rect = wrapRef.current.getBoundingClientRect();

    setLiveConnection({
      start: pendingConnection.startPos,
      end: {
        x: e.clientX - rect.left + wrapRef.current.scrollLeft,
        y: e.clientY - rect.top + wrapRef.current.scrollTop
      }
    });
  };

  const clearPending = () => {
    setPendingConnection(null);
    setLiveConnection(null);
  };

  const handleCanvasMouseDown = () => {
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
    clearPending();
  };

  return (
    <div
      ref={wrapRef}
      className="nc-canvas-wrap"
      onMouseDown={handleCanvasMouseDown}
      onMouseMove={handleCanvasMouseMove}
    >
      <div
        className="nc-canvas-grid"
        style={{ transform: `scale(${zoom})`, transformOrigin: "top left" }}
      >
        <EdgeLayer
          nodes={nodes}
          edges={edges}
          selectedEdgeId={selectedEdgeId}
          setSelectedEdgeId={setSelectedEdgeId}
          setSelectedNodeId={setSelectedNodeId}
          liveConnection={liveConnection}
        />

        {nodes.map((node) => (
          <NodeCard
            key={node.id}
            node={node}
            selected={selectedNodeId === node.id}
            onSelect={(id) => {
              setSelectedNodeId(id);
              setSelectedEdgeId(null);
            }}
            onDrag={updateNodePosition}
            onPortMouseDown={(e, nodeId, portName) => {
              const pos = portMap[`${nodeId}:out:${portName}`];
              if (!pos) return;
              setPendingConnection({
                fromNodeId: nodeId,
                fromPort: portName,
                startPos: pos
              });
              setLiveConnection({
                start: pos,
                end: pos
              });
            }}
            onPortMouseUp={(nodeId, portName) => {
              if (!pendingConnection) return;
              addEdge(
                pendingConnection.fromNodeId,
                pendingConnection.fromPort,
                nodeId,
                portName
              );
              clearPending();
            }}
          />
        ))}
      </div>
    </div>
  );
}
