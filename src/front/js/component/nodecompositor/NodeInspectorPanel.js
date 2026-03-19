import React, { useState } from "react";
import { BLEND_MODES, MASK_SHAPES, PATH_PRESETS } from "./nodeTypes";

function Field({ label, children }) {
  return (
    <div className="nc-field">
      <label>{label}</label>
      {children}
    </div>
  );
}

function NumberField({ label, value, onChange, step = 1 }) {
  return (
    <Field label={label}>
      <input type="number" step={step} value={value} onChange={(e) => onChange(parseFloat(e.target.value || 0))} />
    </Field>
  );
}

function TextField({ label, value, onChange }) {
  return (
    <Field label={label}>
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} />
    </Field>
  );
}

function ColorField({ label, value, onChange }) {
  return (
    <Field label={label}>
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)} />
    </Field>
  );
}

function CheckboxField({ label, checked, onChange }) {
  return (
    <Field label={label}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </Field>
  );
}

function renderNodeSpecificFields(node, onChange) {
  const p = node.properties || {};

  if (node.type === "mediaIn") {
    return (
      <>
        <TextField label="Media URL" value={p.mediaUrl || ""} onChange={(v) => onChange("mediaUrl", v)} />
        <NumberField label="Width" value={p.width || 640} onChange={(v) => onChange("width", v)} />
        <NumberField label="Height" value={p.height || 360} onChange={(v) => onChange("height", v)} />
        <NumberField label="Opacity" value={p.opacity ?? 1} step={0.1} onChange={(v) => onChange("opacity", v)} />
      </>
    );
  }

  if (node.type === "text") {
    return (
      <>
        <TextField label="Text" value={p.text || ""} onChange={(v) => onChange("text", v)} />
        <div className="nc-grid-2">
          <NumberField label="X %" value={p.x ?? 50} onChange={(v) => onChange("x", v)} />
          <NumberField label="Y %" value={p.y ?? 50} onChange={(v) => onChange("y", v)} />
        </div>
        <div className="nc-grid-2">
          <NumberField label="Font Size" value={p.fontSize || 42} onChange={(v) => onChange("fontSize", v)} />
          <NumberField label="Weight" value={p.fontWeight || 800} onChange={(v) => onChange("fontWeight", v)} />
        </div>
        <ColorField label="Color" value={p.color || "#ffffff"} onChange={(v) => onChange("color", v)} />
        <NumberField label="Opacity" value={p.opacity ?? 1} step={0.1} onChange={(v) => onChange("opacity", v)} />
      </>
    );
  }

  if (node.type === "transform") {
    return (
      <>
        <div className="nc-grid-2">
          <NumberField label="Translate X" value={p.x || 0} onChange={(v) => onChange("x", v)} />
          <NumberField label="Translate Y" value={p.y || 0} onChange={(v) => onChange("y", v)} />
        </div>
        <div className="nc-grid-2">
          <NumberField label="Scale" value={p.scale ?? 1} step={0.1} onChange={(v) => onChange("scale", v)} />
          <NumberField label="Rotation" value={p.rotation || 0} onChange={(v) => onChange("rotation", v)} />
        </div>
        <NumberField label="Opacity" value={p.opacity ?? 1} step={0.1} onChange={(v) => onChange("opacity", v)} />
      </>
    );
  }

  if (node.type === "path") {
    return (
      <>
        <Field label="Preset">
          <select value={p.preset || "orbit"} onChange={(e) => onChange("preset", e.target.value)}>
            {PATH_PRESETS.map((preset) => (
              <option key={preset} value={preset}>{preset}</option>
            ))}
          </select>
        </Field>
        <div className="nc-grid-2">
          <NumberField label="Amplitude X" value={p.amplitudeX ?? 120} onChange={(v) => onChange("amplitudeX", v)} />
          <NumberField label="Amplitude Y" value={p.amplitudeY ?? 80} onChange={(v) => onChange("amplitudeY", v)} />
        </div>
        <div className="nc-grid-2">
          <NumberField label="Speed" value={p.speed ?? 1} step={0.1} onChange={(v) => onChange("speed", v)} />
          <NumberField label="Phase" value={p.phase ?? 0} step={0.1} onChange={(v) => onChange("phase", v)} />
        </div>
        <CheckboxField label="Rotate Along Path" checked={!!p.rotateAlongPath} onChange={(v) => onChange("rotateAlongPath", v)} />
        <NumberField label="Opacity" value={p.opacity ?? 1} step={0.1} onChange={(v) => onChange("opacity", v)} />
      </>
    );
  }

  if (node.type === "camera") {
    return (
      <>
        <div className="nc-grid-2">
          <NumberField label="Pan X" value={p.x || 0} onChange={(v) => onChange("x", v)} />
          <NumberField label="Pan Y" value={p.y || 0} onChange={(v) => onChange("y", v)} />
        </div>
        <div className="nc-grid-2">
          <NumberField label="Zoom" value={p.zoom ?? 1} step={0.1} onChange={(v) => onChange("zoom", v)} />
          <NumberField label="Rotation" value={p.rotation || 0} onChange={(v) => onChange("rotation", v)} />
        </div>
      </>
    );
  }

  if (node.type === "colorCorrect" || node.type === "adjustment") {
    return (
      <>
        <div className="nc-grid-2">
          <NumberField label="Brightness" value={p.brightness ?? 100} onChange={(v) => onChange("brightness", v)} />
          <NumberField label="Contrast" value={p.contrast ?? 100} onChange={(v) => onChange("contrast", v)} />
        </div>
        <div className="nc-grid-2">
          <NumberField label="Saturate" value={p.saturate ?? 100} onChange={(v) => onChange("saturate", v)} />
          <NumberField label="Hue Rotate" value={p.hueRotate ?? 0} onChange={(v) => onChange("hueRotate", v)} />
        </div>
        <NumberField label="Blur" value={p.blur ?? 0} step={0.5} onChange={(v) => onChange("blur", v)} />
        <NumberField label="Opacity" value={p.opacity ?? 1} step={0.1} onChange={(v) => onChange("opacity", v)} />
      </>
    );
  }

  if (node.type === "blur") {
    return (
      <>
        <NumberField label="Blur Amount" value={p.amount ?? 8} step={0.5} onChange={(v) => onChange("amount", v)} />
        <NumberField label="Opacity" value={p.opacity ?? 1} step={0.1} onChange={(v) => onChange("opacity", v)} />
      </>
    );
  }

  if (node.type === "mask") {
    return (
      <>
        <Field label="Shape">
          <select value={p.shape || "rectangle"} onChange={(e) => onChange("shape", e.target.value)}>
            {MASK_SHAPES.map((shape) => (
              <option key={shape} value={shape}>{shape}</option>
            ))}
          </select>
        </Field>
        <div className="nc-grid-2">
          <NumberField label="Center X %" value={p.x ?? 50} onChange={(v) => onChange("x", v)} />
          <NumberField label="Center Y %" value={p.y ?? 50} onChange={(v) => onChange("y", v)} />
        </div>
        <div className="nc-grid-2">
          <NumberField label="Width %" value={p.width ?? 40} onChange={(v) => onChange("width", v)} />
          <NumberField label="Height %" value={p.height ?? 40} onChange={(v) => onChange("height", v)} />
        </div>
        <NumberField label="Feather" value={p.feather ?? 0} step={0.5} onChange={(v) => onChange("feather", v)} />
        <CheckboxField label="Invert" checked={!!p.invert} onChange={(v) => onChange("invert", v)} />
      </>
    );
  }

  if (node.type === "merge") {
    return (
      <>
        <Field label="Blend Mode">
          <select value={p.blendMode || "normal"} onChange={(e) => onChange("blendMode", e.target.value)}>
            {BLEND_MODES.map((mode) => (
              <option key={mode} value={mode}>{mode}</option>
            ))}
          </select>
        </Field>
        <NumberField label="Opacity" value={p.opacity ?? 1} step={0.1} onChange={(v) => onChange("opacity", v)} />
        <div className="nc-dim">
          Merge expects:
          <br />
          background → bottom layer
          <br />
          foreground → top layer
          <br />
          mask → clip foreground
        </div>
      </>
    );
  }

  if (node.type === "output") {
    return (
      <div className="nc-dim">
        Output node displays the final evaluated image chain.
        <br />
        Optional camera input drives 2.5D preview motion.
      </div>
    );
  }

  return <div className="nc-dim">No editable controls for this node.</div>;
}

function KeyframePanel({ selectedNode, currentTime, addKeyframeToSelectedNode, removeKeyframeFromSelectedNode }) {
  const [prop, setProp] = useState("x");
  const [easing, setEasing] = useState("easeInOut");

  if (!selectedNode) return null;
  const numericProps = Object.entries(selectedNode.properties || {}).filter(([, v]) => typeof v === "number");

  const addCurrent = () => {
    const value = selectedNode.properties?.[prop];
    if (typeof value !== "number") return;
    addKeyframeToSelectedNode(prop, value, easing);
  };

  return (
    <div className="nc-keyframe-panel">
      <div className="nc-field">
        <label>Keyframe Property</label>
        <select value={prop} onChange={(e) => setProp(e.target.value)}>
          {numericProps.map(([k]) => (
            <option key={k} value={k}>{k}</option>
          ))}
        </select>
      </div>

      <div className="nc-field">
        <label>Easing</label>
        <select value={easing} onChange={(e) => setEasing(e.target.value)}>
          <option value="linear">linear</option>
          <option value="easeIn">easeIn</option>
          <option value="easeOut">easeOut</option>
          <option value="easeInOut">easeInOut</option>
        </select>
      </div>

      <button className="nc-key-btn" onClick={addCurrent}>
        + Add Keyframe at {currentTime.toFixed(2)}s
      </button>

      <div className="nc-keyframe-list">
        {(selectedNode.keyframes || []).map((kf) => (
          <div key={kf.id} className="nc-keyframe-row">
            <span>{kf.property}</span>
            <span>{kf.value}</span>
            <span>@ {kf.time.toFixed(2)}s</span>
            <button onClick={() => removeKeyframeFromSelectedNode(kf.id)}>✕</button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function NodeInspectorPanel({
  selectedNode,
  selectedEdge,
  updateNodeProperties,
  removeNode,
  removeEdge,
  currentTime,
  addKeyframeToSelectedNode,
  removeKeyframeFromSelectedNode
}) {
  if (selectedEdge) {
    return (
      <div className="nc-panel">
        <div className="nc-panel-title">Inspector</div>
        <div className="nc-node-badge nc-edge-badge">Edge Selected</div>
        <div className="nc-dim" style={{ marginBottom: 12 }}>
          {selectedEdge.fromNodeId} → {selectedEdge.toNodeId}
        </div>
        <button className="nc-danger-btn" onClick={() => removeEdge(selectedEdge.id)}>
          Delete Edge
        </button>
      </div>
    );
  }

  if (!selectedNode) {
    return (
      <div className="nc-panel">
        <div className="nc-panel-title">Inspector</div>
        <div className="nc-dim">Select a node or edge</div>
      </div>
    );
  }

  const onChange = (key, value) => {
    updateNodeProperties(selectedNode.id, { [key]: value });
  };

  return (
    <div className="nc-panel">
      <div className="nc-panel-title">Inspector</div>
      <div className="nc-node-badge" style={{ borderColor: selectedNode.color }}>
        {selectedNode.label}
      </div>

      <TextField label="Node Name" value={selectedNode.properties.name || ""} onChange={(v) => onChange("name", v)} />
      {renderNodeSpecificFields(selectedNode, onChange)}

      <KeyframePanel
        selectedNode={selectedNode}
        currentTime={currentTime}
        addKeyframeToSelectedNode={addKeyframeToSelectedNode}
        removeKeyframeFromSelectedNode={removeKeyframeFromSelectedNode}
      />

      <button className="nc-danger-btn" onClick={() => removeNode(selectedNode.id)}>
        Delete Node
      </button>
    </div>
  );
}
