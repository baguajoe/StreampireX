import React
import { requestRender } from '../utils/render/renderClient', { useEffect, useMemo } from "react";
import { useEditorStore } from "../store/useEditorStore";
import NodeGraph from "../component/compositor/NodeGraph";
import NodeGraphPro from "../component/compositor/NodeGraphPro";
import { evaluateGraph } from "../utils/compositor/nodeEngine";
import { SHADER_NODE_PRESETS } from "../component/nodecompositor/vfx/shaderNodePresets";
import ShaderPreviewCanvas from "../component/nodecompositor/vfx/ShaderPreviewCanvas";
import CompositorTimeline from "../component/compositor/CompositorTimeline";
import "../../styles/NodeCompositor.css";
import "../../styles/MotionStudioPro.css";
import CompositorInspectorPro from "../component/nodecompositor/pro/CompositorInspectorPro";
import CompositorPreviewPro from "../component/nodecompositor/pro/CompositorPreviewPro";
import RotoOverlayEditor from "../component/nodecompositor/pro/RotoOverlayEditor";
import TrackerPanelPro from "../component/nodecompositor/pro/TrackerPanelPro";
import GPUMultiPassPanel from "../component/nodecompositor/pro/GPUMultiPassPanel";
import RenderQueuePanel from "../component/nodecompositor/pro/RenderQueuePanel";
import BackendRenderPanel from "../component/nodecompositor/pro/BackendRenderPanel";
import MediaIngestPanel from "../component/nodecompositor/pro/MediaIngestPanel";
import ColorPipelinePanel from "../component/nodecompositor/pro/ColorPipelinePanel";
import RotoTimelinePanel from "../component/nodecompositor/pro/RotoTimelinePanel";
import DependencyGraphPanel from "../component/nodecompositor/pro/DependencyGraphPanel";
import { createGraphRunner } from "../utils/compositor/engine/graphRunner";
import NodeEnginePanel from "../component/nodecompositor/pro/NodeEnginePanel";

export default function NodeCompositorPage() {
  const [edges, setEdges] = React.useState([]);
  const [currentTime, setCurrentTime] = React.useState(0);
  const [playing, setPlaying] = React.useState(false);
  const [rotoShape, setRotoShape] = React.useState({ id: "roto_start", closed: true, feather: 0, invert: false, points: [] });

  const graphRunnerRef = React.useRef(null);
  if (!graphRunnerRef.current) {
    graphRunnerRef.current = createGraphRunner();
  }
  const duration = 10;
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

  const engineEvaluation = React.useMemo(() => {
    return graphRunnerRef.current.runGraph(nodes, edges, Math.floor(currentTime * 30));
  }, [nodes, edges, currentTime]);

  const addMediaNodeFromPanel = (node) => {
    setNodes((prev) => [...prev, node]);
  };

  const updateNode = (id, patch) => {
    graphRunnerRef.current.invalidateNode(nodes, edges, id);
    setNodes(nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)));
  };

  useEffect(() => {
    let raf = null;
    let last = performance.now();

    const tick = (now) => {
      const dt = (now - last) / 1000;
      last = now;
      if (playing) {
        setCurrentTime((t) => {
          const next = t + dt;
          return next >= duration ? 0 : next;
        });
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => {
      if (raf) cancelAnimationFrame(raf);
    };
  }, [playing]);

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

        <button className="spx-comp-btn" onClick={() => addNode({
          type: "text",
          x: 180 + nodes.length * 20,
          y: 200 + nodes.length * 10,
          value: "Fusion-style text",
          color: "#ffffff",
          fontSize: 42,
          inputs: {},
          outputs: {},
        })}>+ Text Node</button>

        <button className="spx-comp-btn" onClick={() => addNode({
          type: "merge",
          x: 260 + nodes.length * 18,
          y: 180 + nodes.length * 12,
          params: { blendMode: "screen" },
          inputs: {},
          outputs: {},
        })}>+ Merge Node</button>

        <button className="spx-comp-btn" onClick={() => addNode({
          type: "blur",
          x: 280 + nodes.length * 16,
          y: 220 + nodes.length * 14,
          params: { amount: 12 },
          inputs: {},
          outputs: {},
        })}>+ Blur Node</button>

        <button className="spx-comp-btn" onClick={() => addNode({
          type: "transform",
          x: 220 + nodes.length * 14,
          y: 260 + nodes.length * 14,
          params: { tx: 0, ty: 0, scale: 1, rotation: 0 },
          inputs: {},
          outputs: {},
        })}>+ Transform Node</button>
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
          <NodeGraphPro
            nodes={nodes}
            edges={edges}
            selectedId={selection.nodeId}
            onSelect={(id) => setSelection({ nodeId: id })}
            onNodesChange={setNodes}
            onEdgesChange={setEdges}
          />

          <div style={{ marginTop: 16 }}>
            <CompositorTimeline
              currentTime={currentTime}
              duration={duration}
              setCurrentTime={setCurrentTime}
              playing={playing}
              onTogglePlay={() => setPlaying((p) => !p)}
            />
          </div>
        </div>

        <div style={{ display: "grid", gap: 16 }}>
          <CompositorPreviewPro
            nodes={nodes}
            edges={edges}
            currentTime={currentTime}
          />

          <MediaIngestPanel onAddMediaNode={addMediaNodeFromPanel} />

          <button onClick={handleRenderProject} className='spx-comp-btn spx-comp-btn-primary'>Render Project</button>

<GPUMultiPassPanel />

          <div className="motion-panel">
            <div className="motion-panel-title">Live Shader Preview</div>
            <ShaderPreviewCanvas shaderId="basicColor" height={220} />
          </div>

          <RotoTimelinePanel />

          <RotoOverlayEditor
            shape={rotoShape}
            setShape={setRotoShape}
            width={640}
            height={260}
          />

          <TrackerPanelPro />

          <ColorPipelinePanel />

          <CompositorInspectorPro
            selectedNode={nodes.find((n) => n.id === selection.nodeId) || null}
            updateNode={updateNode}
          />

          <RenderQueuePanel />

          <BackendRenderPanel />

          <DependencyGraphPanel nodes={nodes} edges={edges} />

          <NodeEnginePanel frame={Math.floor(currentTime * 30)} evaluation={engineEvaluation} />

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
{JSON.stringify({ currentTime, edges, rotoShape, graphResult, engineEvaluation }, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}