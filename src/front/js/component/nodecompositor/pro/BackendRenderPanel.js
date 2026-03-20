import React, { useState } from "react";

export default function BackendRenderPanel() {
  const [format, setFormat] = useState("png");
  const [jobs, setJobs] = useState([]);

  const queueJob = () => {
    const job = {
      id: `frontend_${Date.now()}`,
      format,
      backendRequired: ["exr", "prores"].includes(format),
      status: "queued",
    };
    setJobs((prev) => [job, ...prev]);
  };

  return (
    <div className="motion-panel">
      <div className="motion-panel-title">Backend Render Queue</div>

      <div className="spx-pro-inspector-grid">
        <label>
          Format
          <select value={format} onChange={(e) => setFormat(e.target.value)}>
            <option value="png">PNG</option>
            <option value="webm">WebM</option>
            <option value="exr">OpenEXR</option>
            <option value="prores">ProRes</option>
          </select>
        </label>
      </div>

      <div style={{ marginTop: 12 }}>
        <button className="spx-comp-btn spx-comp-btn-primary" onClick={queueJob}>
          Queue Backend Render
        </button>
      </div>

      <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
        {jobs.map((job) => (
          <div key={job.id} className="spx-render-job">
            <div>
              <strong>{job.format.toUpperCase()}</strong>
              <div style={{ fontSize: 12, opacity: 0.72 }}>
                {job.backendRequired ? "Backend required" : "Browser-capable"}
              </div>
            </div>
            <div>{job.status}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
