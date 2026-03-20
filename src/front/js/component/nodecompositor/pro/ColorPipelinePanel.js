import React, { useMemo, useState } from "react";
import { LUT_PRESETS, applyLUTMeta } from "../../../utils/color/lutUtils";
import { getFakeWaveform, getFakeVectorscope } from "../../../utils/color/scopeUtils";

export default function ColorPipelinePanel() {
  const [lut, setLut] = useState("none");
  const [gain, setGain] = useState(1);
  const [gamma, setGamma] = useState(1);
  const [sat, setSat] = useState(1);

  const waveform = useMemo(() => getFakeWaveform(), []);
  const vectors = useMemo(() => getFakeVectorscope(), []);
  const lutMeta = applyLUTMeta(lut);

  return (
    <div className="motion-panel">
      <div className="motion-panel-title">Color Pipeline</div>

      <div className="spx-pro-inspector-grid">
        <label>
          LUT
          <select value={lut} onChange={(e) => setLut(e.target.value)}>
            {LUT_PRESETS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>

        <label>
          Gain
          <input type="number" step="0.1" value={gain} onChange={(e) => setGain(Number(e.target.value))} />
        </label>

        <label>
          Gamma
          <input type="number" step="0.1" value={gamma} onChange={(e) => setGamma(Number(e.target.value))} />
        </label>

        <label>
          Saturation
          <input type="number" step="0.1" value={sat} onChange={(e) => setSat(Number(e.target.value))} />
        </label>
      </div>

      <div style={{ marginTop: 12, fontSize: 12, opacity: 0.75 }}>
        Active LUT: {lutMeta.name}
      </div>

      <div className="spx-scope-wrap">
        <div className="spx-scope-panel">
          <div className="spx-scope-title">Waveform</div>
          <svg width="100%" height="120" viewBox="0 0 64 48">
            <polyline
              fill="none"
              stroke="#00ffc8"
              strokeWidth="1"
              points={waveform.map((p) => `${p.x},${48 - p.y}`).join(" ")}
            />
          </svg>
        </div>

        <div className="spx-scope-panel">
          <div className="spx-scope-title">Vectorscope</div>
          <svg width="100%" height="120" viewBox="-40 -40 80 80">
            {vectors.map((p, idx) => (
              <circle key={idx} cx={p.x} cy={p.y} r="1.2" fill="#ff9f45" />
            ))}
          </svg>
        </div>
      </div>
    </div>
  );
}
