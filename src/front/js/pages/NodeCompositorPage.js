import React, { useEffect, useMemo } from "react";
import { requestRender } from "../utils/render/renderClient";
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

  graphRunnerRef.current.setGraph(nodes, edges);
  const engineEvaluation = React.useMemo(() => {
    return graphRunnerRef.current.runFrame(Math.floor(currentTime * 30));
  }, [nodes, edges, currentTime]);

  const addMediaNodeFromPanel = (node) => {
    setNodes((prev) => [...prev, node]);
  };

  const updateNode = (id, patch) => {
    graphRunnerRef.current.invalidateNode(id);
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

  const handleRenderProject = () => {
    if (graphRunnerRef.current) {
      const result = graphRunnerRef.current.runFrame(Math.floor(currentTime * 30));
      console.log("Render result:", result);
    }
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

      {/* ── 3-Panel Fusion-style Layout ── */}
      <div style={{ display:"flex", flex:1, overflow:"hidden", gap:0 }}>

        {/* LEFT — Node Library + Inspector */}
        <div style={{ width:280, background:"#0d1117", borderRight:"1px solid #21262d",
          display:"flex", flexDirection:"column", overflowY:"auto", flexShrink:0 }}>

          <div style={{ padding:"8px 10px", borderBottom:"1px solid #21262d" }}>
            <div style={{ color:"#8b949e", fontSize:10, textTransform:"uppercase", letterSpacing:1, marginBottom:6 }}>Node Library</div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:4 }}>
              {[
                ["Media","media"],["Text","text"],["Solid","solid"],["Gradient","gradient"],
                ["Merge","merge"],["Over","over"],["Multiply","multiply"],["Screen","screen"],
                ["Blur","blur"],["Sharpen","sharpen"],["ChromaKey","chromakey"],["LUT","lut"],
                ["Transform","transform"],["Crop","crop"],["ColorGrade","colorgrade"],
                ["Roto","roto"],["Mask","mask"],["Shader","shader"],["Particles","particles"],["Output","output"],
              ].map(([label,type]) => (
                <button key={type} onClick={() => addNode({
                  type, x:120+nodes.length*20, y:100+nodes.length*15,
                  properties:{name:label}, inputs:{}, outputs:{},
                })} style={{ padding:"2px 6px", borderRadius:3, cursor:"pointer", fontSize:9, fontWeight:700,
                  background:"#21262d", color:"#8b949e", border:"none", marginBottom:2 }}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          <MediaIngestPanel onAddMediaNode={addMediaNodeFromPanel} />
          <ColorPipelinePanel />
          <TrackerPanelPro />
        </div>

        {/* CENTER — Node Graph + Timeline */}
        <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
          <div style={{ flex:1, overflow:"hidden", position:"relative" }}>
            <NodeGraphPro
              nodes={nodes}
              edges={edges}
              selectedId={selection.nodeId}
              onSelect={(id) => setSelection({ nodeId: id })}
              onNodesChange={setNodes}
              onEdgesChange={setEdges}
            />
          </div>
          <div style={{ borderTop:"1px solid #21262d", flexShrink:0 }}>
            <CompositorTimeline
              currentTime={currentTime}
              duration={duration}
              setCurrentTime={setCurrentTime}
              playing={playing}
              onTogglePlay={() => setPlaying((p) => !p)}
            />
          </div>
        </div>

        {/* RIGHT — Preview + Inspector + Panels */}
        <div style={{ width:340, background:"#0d1117", borderLeft:"1px solid #21262d",
          display:"flex", flexDirection:"column", overflowY:"auto", flexShrink:0 }}>

          <CompositorPreviewPro nodes={nodes} edges={edges} currentTime={currentTime} />

          <CompositorInspectorPro
            selectedNode={nodes.find(n => n.id === selection.nodeId) || null}
            updateNode={updateNode}
          />

          <GPUMultiPassPanel />

          <div className="motion-panel">
            <div className="motion-panel-title">Live Shader Preview</div>
            <ShaderPreviewCanvas shaderId="basicColor" height={180} />
          </div>

          <RotoOverlayEditor shape={rotoShape} setShape={setRotoShape} width={320} height={180} />
          <RotoTimelinePanel />
          <RenderQueuePanel />
          <BackendRenderPanel />
          <DependencyGraphPanel nodes={nodes} edges={edges} />
          <NodeEnginePanel frame={Math.floor(currentTime * 30)} evaluation={engineEvaluation} />

          <div style={{ padding:8 }}>
            <button onClick={handleRenderProject}
              style={{ width:"100%", padding:"8px", borderRadius:6, cursor:"pointer",
                fontWeight:700, fontSize:12, background:"#00ffc8", color:"#000", border:"none" }}>
              ▶ Render Project
            </button>
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
{JSON.stringify({ currentTime, edges, rotoShape, graphResult, engineEvaluation }, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}