import React, { useEffect, useMemo } from "react";
import { requestRender } from "../utils/render/renderClient";
import { useEditorStore } from "../store/useEditorStore";

const COMP_KEY = "spx_compositor_project";

// ── Shared Menu Bar Component ──
function AppMenuBar({ menus, projectName, setProjectName, rightContent }) {
  return (
    <div className="spx-menu-bar">
      {menus.map(menu => (
        <MenuDropdown key={menu.label} label={menu.label} items={menu.items} />
      ))}
      <input
        className="spx-project-name-input"
        value={projectName || ""}
        onChange={e => setProjectName(e.target.value)}
        placeholder="Untitled Project"
      />
      <div style={{flex:1}}/>
      {rightContent}
    </div>
  );
}

function MenuDropdown({ label, items }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="spx-menu-item" onMouseLeave={() => setOpen(false)}>
      <button className="spx-menu-btn" onMouseEnter={() => setOpen(true)} onClick={() => setOpen(o => !o)}>
        {label}
      </button>
      {open && (
        <div className="spx-menu-dropdown">
          {items.map((item, i) => item === "---"
            ? <div key={i} style={{height:1,background:"#21262d",margin:"3px 0"}}/>
            : <button key={item.label} className="spx-menu-dropdown-item"
                onClick={() => { item.action(); setOpen(false); }}>
                <span>{item.label}</span>
                {item.shortcut && <span style={{color:"#4e6a82",fontSize:10,marginLeft:"auto"}}>{item.shortcut}</span>}
              </button>
          )}
        </div>
      )}
    </div>
  );
}

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
  const [projectName, setProjectName] = React.useState("Untitled Composite");

  // Auto-save nodes/edges
  React.useEffect(() => {
    if (nodes.length > 0) {
      try {
        const serializable = nodes.map(n => ({...n}));
        localStorage.setItem(COMP_KEY, JSON.stringify({ nodes: serializable, edges, name: projectName, savedAt: Date.now() }));
      } catch(e) {}
    }
  }, [nodes, edges, projectName]);

  // Load on mount
  React.useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(COMP_KEY) || "null");
      if (saved?.nodes?.length > 0) {
        setNodes(saved.nodes);
        if (saved.edges) setEdges(saved.edges);
        if (saved.name) setProjectName(saved.name);
      }
    } catch(e) {}
  }, []);

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
    <div className="node-compositor-page"
      style={{ display:"flex", flexDirection:"column", height:"calc(100vh - 60px)", overflow:"hidden" }}>
      <AppMenuBar
        projectName={projectName}
        setProjectName={setProjectName}
        rightContent={
          <span style={{fontSize:10,color:"#4e6a82"}}>{nodes.length} nodes · {edges.length} edges</span>
        }
        menus={[
          { label: "File", items: [
            { label: "New Composite", action: () => { if(window.confirm("Clear?")){ setNodes([]); setEdges([]); localStorage.removeItem(COMP_KEY); } } },
            { label: "Save",          shortcut: "Ctrl+S", action: () => { try { localStorage.setItem(COMP_KEY, JSON.stringify({nodes,edges,name:projectName,savedAt:Date.now()})); alert("Saved!"); } catch(e){} } },
            "---",
            { label: "Export PNG",  action: () => {} },
            { label: "Export EXR",  action: () => {} },
            { label: "Render Queue", action: handleRenderProject },
          ]},
          { label: "Edit", items: [
            { label: "Undo",       shortcut: "Ctrl+Z",       action: () => {} },
            { label: "Redo",       shortcut: "Ctrl+Shift+Z", action: () => {} },
            "---",
            { label: "Select All",    action: () => {} },
            { label: "Delete Node",   action: () => {} },
            { label: "Duplicate Node", action: () => {} },
          ]},
          { label: "Node", items: [
            { label: "Add Media",      action: () => addNode({type:"media",     x:200,y:150,inputs:{},outputs:{}}) },
            { label: "Add Text",       action: () => addNode({type:"text",      x:200,y:200,inputs:{},outputs:{}}) },
            { label: "Add Color Grade",action: () => addNode({type:"colorgrade",x:300,y:150,inputs:{},outputs:{}}) },
            { label: "Add Merge",      action: () => addNode({type:"merge",     x:400,y:150,inputs:{},outputs:{}}) },
            { label: "Add Blur",       action: () => addNode({type:"blur",      x:400,y:200,params:{amount:10},inputs:{},outputs:{}}) },
            { label: "Add ChromaKey",  action: () => addNode({type:"chromakey", x:300,y:200,inputs:{},outputs:{}}) },
            { label: "Add LUT",        action: () => addNode({type:"lut",       x:350,y:250,inputs:{},outputs:{}}) },
            { label: "Add Output",     action: () => addNode({type:"output",    x:600,y:200,inputs:{},outputs:{}}) },
            "---",
            { label: "Clear All Edges", action: () => setEdges([]) },
            { label: "Reset Canvas",    action: () => { setNodes([]); setEdges([]); } },
          ]},
          { label: "View", items: [
            { label: "Zoom In",    action: () => {} },
            { label: "Zoom Out",   action: () => {} },
            { label: "Fit All",    action: () => {} },
            "---",
            { label: "Toggle Preview",       action: () => {} },
            { label: "Toggle Color Pipeline", action: () => {} },
          ]},
          { label: "Render", items: [
            { label: "Render Frame",   action: handleRenderProject },
            { label: "Render Range",   action: () => {} },
            { label: "Add to Queue",   action: () => {} },
            "---",
            { label: "Output: PNG",    action: () => {} },
            { label: "Output: ProRes", action: () => {} },
            { label: "Output: EXR",    action: () => {} },
          ]},
          { label: "Help", items: [
            { label: "Node Reference", action: () => alert("Connect nodes by dragging from output dot to input dot. Output node is required for render.") },
            { label: "Shortcuts",      action: () => alert("Ctrl+Z=Undo  Del=Delete node  Ctrl+S=Save") },
          ]},
        ]}
      />
      <div style={{ display:"flex", flexDirection:"column", height:"calc(100vh - 60px)", overflow:"hidden" }}>
      <div style={{ display:"flex", alignItems:"center", gap:8, padding:"4px 12px", background:"#161b22", borderBottom:"1px solid #21262d", flexShrink:0 }}>
        <span style={{ color:"#00ffc8", fontWeight:700, fontSize:13 }}>🎛️ SPX Compositor</span>
        <div style={{ width:1, height:20, background:"#21262d", margin:"0 4px" }}/>
        <button className="spx-comp-btn" onClick={() => setPlaying(p => !p)}>{playing ? "⏸ Pause" : "▶ Play"}</button>
        <button className="spx-comp-btn" onClick={() => setCurrentTime(0)}>⏮</button>
        <span style={{ color:"#00ffc8", fontFamily:"monospace", fontSize:11 }}>{currentTime.toFixed(2)}s / {duration}s</span>
        <div style={{ flex:1 }}/>
        <button className="spx-comp-btn" onClick={() => setEdges([])}>Clear Edges</button>
        <button className="spx-comp-btn" onClick={() => { setNodes([]); setEdges([]); }}>Reset</button>
        <button className="spx-comp-btn spx-comp-btn-primary" onClick={handleRenderProject}>▶ Render</button>
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