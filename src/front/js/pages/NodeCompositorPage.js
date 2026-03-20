import React, { useEffect, useMemo } from "react";
import { useEditorStore } from "../store/useEditorStore";
import NodeGraph from "../component/compositor/NodeGraph";
import { evaluateGraph } from "../utils/compositor/nodeEngine";
import { SHADER_NODE_PRESETS } from "../component/nodecompositor/vfx/shaderNodePresets";
import "../../styles/NodeCompositor.css";
import "../../styles/MotionStudioPro.css";

export default function NodeCompositorPage() {
  const nodes = useEditorStore((s) => s.nodes);
  const setNodes = useEditorStore((s) => s.setNodes);
  const addNode = useEditorStore((s) => s.addNode);
  const selection = useEditorStore((s) => s.selection);
  const setSelection = useEditorStore((s) => s.setSelection);

  useEffect(() => {
    if (!nodes.length) {
      setNodes([
        {
          id: "color_1",
          type: "color",
          x: 120,
          y: 100,
          value: "#00ffc8",
          inputs: {},
          outputs: {},
        },
        {
          id: "shader_1",
          type: "shader",
          x: 360,
          y: 180,
          shader: SHADER_NODE_PRESETS[0].id,
          params: { intensity: 1 },
          inputs: {},
          outputs: {},
        },
        {
          id: "output_1",
          type: "output",
          x: 640,
          y: 180,
          inputs: { source: "shader_1" },
          outputs: {},
        },
      ]);
    }
  }, [nodes.length, setNodes]);

  const graphResult = useMemo(() => evaluateGraph(nodes), [nodes]);

  const addShaderNode = () => {
    addNode({
      type: "shader",
      x: 240 + nodes.length * 20,
      y: 120 + nodes.length * 20,
      shader: SHADER_NODE_PRESETS[1]?.id || "basicColor",
      params: { intensity: 1 },
      inputs: {},
      outputs: {},
    });
  };

  const addValueNode = () => {
    addNode({
      type: "value",
      x: 160 + nodes.length * 20,
      y: 120 + nodes.length * 16,
      value: Math.random().toFixed(2),
      inputs: {},
      outputs: {},
    });
  };

  return (
    <div className="node-compositor-page" style={{ padding: 16 }}>
      <div className="spx-comp-toolbar">
        <input
          className="spx-comp-project-input"
          value="SPX Compositor"
          readOnly
        />
        <button className="spx-comp-btn spx-comp-btn-primary" onClick={addValueNode}>
          + Value Node
        </button>
        <button className="spx-comp-btn spx-comp-btn-accent" onClick={addShaderNode}>
          + Shader Node
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 340px",
          gap: 16,
          alignItems: "start",
        }}
      >
        <div className="motion-panel">
          <div className="motion-panel-title">Node Graph</div>
          <NodeGraph
            nodes={nodes}
            selectedId={selection.nodeId}
            onSelect={(id) => setSelection({ nodeId: id })}
          />
        </div>

        <div className="motion-panel">
          <div className="motion-panel-title">Graph Output</div>
          <pre
            style={{
              margin: 0,
              whiteSpace: "pre-wrap",
              fontSize: 12,
              lineHeight: 1.5,
              color: "#d9eaff",
            }}
          >
{JSON.stringify(graphResult, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}
