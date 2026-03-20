import React, { useEffect, useState } from "react";
import { BackendURL } from "../component/backendURL";
import { io } from "socket.io-client";

export default function AIJobsMonitor() {
  const token = localStorage.getItem("token");
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  const loadJobs = async () => {
    try {
      setLoading(true);
      const txRes = await fetch(`${BackendURL}/api/advanced-ai/credit-transactions?per_page=50`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const txData = await txRes.json();
      if (!txRes.ok) throw new Error(txData.error || "Failed to load transactions");

      const jobIds = Array.from(new Set(
        (txData.transactions || [])
          .filter(t => t.reference_type === "job" && t.reference_id)
          .map(t => t.reference_id)
      )).slice(0, 25);

      const hydrated = [];
      for (const id of jobIds) {
        const jr = await fetch(`${BackendURL}/api/advanced-ai/jobs/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const jd = await jr.json();
        if (jr.ok && jd.job) hydrated.push(jd.job);
      }

      setJobs(hydrated.sort((a, b) => (b.id || 0) - (a.id || 0)));
    } catch (e) {
      setMsg(`❌ ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const controlJob = async (id, action) => {
    try {
      const res = await fetch(`${BackendURL}/api/advanced-ai/jobs/${id}/${action}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Failed to ${action} job`);
      setJobs(prev => prev.map(j => j.id === id ? { ...j, ...data.job } : j));
    } catch (e) {
      setMsg(`❌ ${e.message}`);
    }
  };

  useEffect(() => {
    loadJobs();
    const backendOrigin = new URL(BackendURL).origin;
    const socket = io(backendOrigin, { path: "/socket.io", transports: ["websocket", "polling"] });
    socket.on("ai_job_update", (data) => {
      setJobs(prev => prev.map(j => j.id === data.job_id ? { ...j, ...data } : j));
    });
    return () => socket.disconnect();
  }, []);

  return (
    <div style={S.page}>
      <div style={S.wrap}>
        <div style={S.head}>
          <div>
            <h1 style={S.title}>AI Jobs Monitor</h1>
            <p style={S.sub}>Live job updates over websocket, with pause/resume/cancel controls.</p>
          </div>
          <button onClick={loadJobs} style={S.refreshBtn}>Refresh</button>
        </div>

        {loading ? (
          <div style={S.empty}>Loading jobs...</div>
        ) : jobs.length === 0 ? (
          <div style={S.empty}>No AI jobs found yet.</div>
        ) : (
          <div style={S.list}>
            {jobs.map((job) => (
              <div key={job.id} style={S.card}>
                <div style={S.row}>
                  <div>
                    <div style={S.jobTitle}>#{job.id} • {job.job_type}</div>
                    <div style={S.meta}>Lesson: {job.lesson_id || "—"} • Course: {job.course_id || "—"}</div>
                  </div>
                  <span style={{
                    ...S.badge,
                    ...(job.status === "completed" ? S.done :
                        job.status === "failed" ? S.fail :
                        job.status === "processing" ? S.proc : S.queue)
                  }}>
                    {job.status}
                  </span>
                </div>

                <div style={S.metaLine}>Progress: {job.progress_pct || 0}% • Control: {job.control_state || "active"}</div>

                {job.output_url && (
                  <div style={S.output}>
                    <strong>Output:</strong> <a href={job.output_url} target="_blank" rel="noreferrer" style={S.link}>Open output</a>
                  </div>
                )}

                {!!job.error_message && <div style={S.error}>{job.error_message}</div>}

                <div style={S.controls}>
                  <button style={S.ctrlBtn} onClick={() => controlJob(job.id, "pause")}>Pause</button>
                  <button style={S.ctrlBtn} onClick={() => controlJob(job.id, "resume")}>Resume</button>
                  <button style={S.cancelBtn} onClick={() => controlJob(job.id, "cancel")}>Cancel</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {!!msg && <div style={S.msg}>{msg}</div>}
      </div>
    </div>
  );
}

const S = {
  page: { background: "#0b1118", minHeight: "100vh", padding: 24, color: "#eaf3f8" },
  wrap: { maxWidth: 1100, margin: "0 auto" },
  head: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap", marginBottom: 20 },
  title: { margin: 0 },
  sub: { margin: "6px 0 0", color: "#86a0b1" },
  refreshBtn: { background: "#00ffc8", color: "#04211a", border: "none", borderRadius: 10, padding: "11px 14px", fontWeight: 800, cursor: "pointer" },
  empty: { padding: 18, borderRadius: 14, background: "#111a24", border: "1px solid rgba(255,255,255,0.06)" },
  list: { display: "grid", gap: 12 },
  card: { background: "#111a24", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: 16 },
  row: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" },
  jobTitle: { fontWeight: 800, fontSize: "0.98rem" },
  meta: { color: "#8ba2b0", fontSize: "0.8rem", marginTop: 4 },
  badge: { padding: "6px 10px", borderRadius: 999, fontSize: "0.74rem", fontWeight: 800, textTransform: "uppercase" },
  done: { background: "rgba(0,255,200,0.12)", color: "#00ffc8" },
  fail: { background: "rgba(255,90,90,0.12)", color: "#ff9f9f" },
  proc: { background: "rgba(90,150,255,0.12)", color: "#8eb8ff" },
  queue: { background: "rgba(255,255,255,0.08)", color: "#dbe7ee" },
  output: { marginTop: 10, fontSize: "0.85rem" },
  link: { color: "#00ffc8" },
  error: { marginTop: 10, color: "#ff9f9f", fontSize: "0.82rem" },
  metaLine: { marginTop: 10, color: "#7d96a6", fontSize: "0.76rem" },
  controls: { display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" },
  ctrlBtn: { background: "rgba(255,255,255,0.06)", color: "#eaf3f8", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "10px 12px", cursor: "pointer" },
  cancelBtn: { background: "#26151a", color: "#ff9b9b", border: "1px solid #5f2a34", borderRadius: 10, padding: "10px 12px", cursor: "pointer" },
  msg: { marginTop: 14, padding: 12, borderRadius: 12, background: "rgba(255,255,255,0.05)" }
};
