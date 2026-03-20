import React, { useState } from "react";
import { createRenderJob, updateRenderJob } from "../../../utils/render/renderQueue";
import { PRO_FORMATS } from "../../../utils/compositor/pro/exrPipelineConfig";

export default function RenderQueuePanel() {
  const [queue, setQueue] = useState([]);

  const addJob = (format = "png") => {
    const job = createRenderJob({ format, name: `SPX ${format.toUpperCase()} Render` });
    setQueue((q) => [...q, job]);
  };

  const markDone = (id) => {
    setQueue((q) => updateRenderJob(q, id, { status: "done" }));
  };

  return (
    <div className="motion-panel">
      <div className="motion-panel-title">Render Queue + Pro Formats</div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        {PRO_FORMATS.map((fmt) => (
          <button
            key={fmt.id}
            className="spx-comp-btn"
            onClick={() => addJob(fmt.id)}
          >
            Queue {fmt.name}
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gap: 8 }}>
        {queue.length === 0 && <div style={{ opacity: 0.72 }}>No queued renders yet.</div>}
        {queue.map((job) => (
          <div key={job.id} className="spx-render-job">
            <div>
              <strong>{job.name}</strong>
              <div style={{ fontSize: 12, opacity: 0.7 }}>
                {job.width}x{job.height} @ {job.fps}fps — {job.format}
              </div>
            </div>
            <button className="spx-comp-btn spx-comp-btn-primary" onClick={() => markDone(job.id)}>
              Mark Done
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
