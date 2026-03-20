import React, { useState } from "react";
import {
  createTrackerJob,
  sampleTrackerMotion,
  solveTrackFromSamples,
} from "../../../utils/compositor/pro/trackerSolver";

export default function TrackerPanelPro() {
  const [job, setJob] = useState(createTrackerJob());
  const [seed, setSeed] = useState({ x: 320, y: 180 });

  const handleSolve = () => {
    const samples = sampleTrackerMotion(seed, 5, 12);
    const solved = solveTrackFromSamples(samples);
    setJob({
      ...job,
      status: "solved",
      sampledFrames: solved,
    });
  };

  return (
    <div className="motion-panel">
      <div className="motion-panel-title">Tracker Solver Pro</div>

      <div className="spx-pro-inspector-grid">
        <label>
          Seed X
          <input
            type="number"
            value={seed.x}
            onChange={(e) => setSeed((s) => ({ ...s, x: Number(e.target.value) }))}
          />
        </label>

        <label>
          Seed Y
          <input
            type="number"
            value={seed.y}
            onChange={(e) => setSeed((s) => ({ ...s, y: Number(e.target.value) }))}
          />
        </label>
      </div>

      <div style={{ marginTop: 12 }}>
        <button className="spx-comp-btn spx-comp-btn-primary" onClick={handleSolve}>
          Solve Track
        </button>
      </div>

      <pre style={{ marginTop: 12, fontSize: 12, whiteSpace: "pre-wrap" }}>
{JSON.stringify(job.sampledFrames.slice(0, 8), null, 2)}
      </pre>
    </div>
  );
}
