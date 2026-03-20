import React from "react";
import { BLEND_MODES } from "../../../utils/compositor/pro/blendModes";

export default function CompositorInspectorPro({
  selectedNode,
  updateNode,
}) {
  if (!selectedNode) {
    return (
      <div className="motion-panel">
        <div className="motion-panel-title">Inspector</div>
        <div style={{ opacity: 0.7 }}>Select a node</div>
      </div>
    );
  }

  const set = (patch) => updateNode(selectedNode.id, patch);
  const params = selectedNode.params || {};

  return (
    <div className="motion-panel">
      <div className="motion-panel-title">Inspector Pro</div>

      <div className="spx-pro-inspector-grid">
        <label>
          Node Type
          <input value={selectedNode.type || ""} readOnly />
        </label>

        <label>
          X
          <input
            type="number"
            value={selectedNode.x ?? 0}
            onChange={(e) => set({ x: Number(e.target.value) })}
          />
        </label>

        <label>
          Y
          <input
            type="number"
            value={selectedNode.y ?? 0}
            onChange={(e) => set({ y: Number(e.target.value) })}
          />
        </label>

        {selectedNode.type === "text" && (
          <>
            <label>
              Text
              <input
                value={selectedNode.value || ""}
                onChange={(e) => set({ value: e.target.value })}
              />
            </label>

            <label>
              Font Size
              <input
                type="number"
                value={selectedNode.fontSize ?? 42}
                onChange={(e) => set({ fontSize: Number(e.target.value) })}
              />
            </label>

            <label>
              Color
              <input
                type="color"
                value={selectedNode.color || "#ffffff"}
                onChange={(e) => set({ color: e.target.value })}
              />
            </label>
          </>
        )}

        {selectedNode.type === "merge" && (
          <label>
            Blend Mode
            <select
              value={params.blendMode || "normal"}
              onChange={(e) =>
                set({ params: { ...params, blendMode: e.target.value } })
              }
            >
              {BLEND_MODES.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>
        )}

        {selectedNode.type === "blur" && (
          <label>
            Blur Amount
            <input
              type="number"
              value={params.amount ?? 8}
              onChange={(e) =>
                set({ params: { ...params, amount: Number(e.target.value) } })
              }
            />
          </label>
        )}

        {selectedNode.type === "transform" && (
          <>
            <label>
              Translate X
              <input
                type="number"
                value={params.tx ?? 0}
                onChange={(e) =>
                  set({ params: { ...params, tx: Number(e.target.value) } })
                }
              />
            </label>

            <label>
              Translate Y
              <input
                type="number"
                value={params.ty ?? 0}
                onChange={(e) =>
                  set({ params: { ...params, ty: Number(e.target.value) } })
                }
              />
            </label>

            <label>
              Scale
              <input
                type="number"
                step="0.1"
                value={params.scale ?? 1}
                onChange={(e) =>
                  set({ params: { ...params, scale: Number(e.target.value) } })
                }
              />
            </label>

            <label>
              Rotation
              <input
                type="number"
                value={params.rotation ?? 0}
                onChange={(e) =>
                  set({ params: { ...params, rotation: Number(e.target.value) } })
                }
              />
            </label>
          </>
        )}
      </div>
    </div>
  );
}
