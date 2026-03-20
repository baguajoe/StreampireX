import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { BackendURL } from "../component/backendURL";
import { io } from "socket.io-client";

export default function HybridLessonComposer() {
  const { lessonId } = useParams();
  const token = localStorage.getItem("token");
  const [timeline, setTimeline] = useState([]);
  const [segmentUrl, setSegmentUrl] = useState("");
  const [segmentLabel, setSegmentLabel] = useState("");
  const [segmentStart, setSegmentStart] = useState("");
  const [segmentEnd, setSegmentEnd] = useState("");
  const [segmentTransition, setSegmentTransition] = useState("none");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [job, setJob] = useState(null);
  const [dragIndex, setDragIndex] = useState(null);
  const [scrub, setScrub] = useState(0);
  const socketRef = useRef(null);

  const totalDuration = useMemo(() => {
    return timeline.reduce((sum, seg) => {
      const start = Number(seg.start_at || 0);
      const end = seg.end_at === null || seg.end_at === "" || typeof seg.end_at === "undefined" ? start + 5 : Number(seg.end_at);
      return sum + Math.max(1, end - start);
    }, 0);
  }, [timeline]);

  const addSegment = () => {
    if (!segmentUrl.trim()) return;
    setTimeline(prev => [...prev, {
      label: segmentLabel || `Segment ${prev.length + 1}`,
      url: segmentUrl.trim(),
      start_at: segmentStart === "" ? 0 : Number(segmentStart),
      end_at: segmentEnd === "" ? null : Number(segmentEnd),
      transition: segmentTransition
    }]);
    setSegmentUrl("");
    setSegmentLabel("");
    setSegmentStart("");
    setSegmentEnd("");
    setSegmentTransition("none");
  };

  const removeSegment = (idx) => setTimeline(prev => prev.filter((_, i) => i !== idx));

  const moveSegment = (from, to) => {
    if (to < 0 || to >= timeline.length || from === to) return;
    const copy = [...timeline];
    const [item] = copy.splice(from, 1);
    copy.splice(to, 0, item);
    setTimeline(copy);
  };

  const saveTimeline = async () => {
    setMsg("");
    try {
      setLoading(true);
      const res = await fetch(`${BackendURL}/api/advanced-ai/lesson-timeline/${lessonId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ timeline_json: timeline })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save timeline");
      setMsg("✅ Timeline saved.");
    } catch (e) {
      setMsg(`❌ ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const composeTimeline = async () => {
    setMsg("");
    try {
      setLoading(true);
      const saveRes = await fetch(`${BackendURL}/api/advanced-ai/lesson-timeline/${lessonId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ timeline_json: timeline })
      });
      const saveData = await saveRes.json();
      if (!saveRes.ok) throw new Error(saveData.error || "Failed to save timeline");

      const res = await fetch(`${BackendURL}/api/advanced-ai/lesson-timeline/${lessonId}/compose`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to compose timeline");
      setJob(data.job);
      setMsg("⏳ Compose job started.");
    } catch (e) {
      setMsg(`❌ ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const controlJob = async (action) => {
    if (!job?.id) return;
    try {
      const res = await fetch(`${BackendURL}/api/advanced-ai/jobs/${job.id}/${action}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Failed to ${action} job`);
      setJob(data.job);
      setMsg(`✅ Job ${action}d.`);
    } catch (e) {
      setMsg(`❌ ${e.message}`);
    }
  };

  useEffect(() => {
    const load = async () => {
      if (!token || !lessonId) return;
      try {
        const res = await fetch(`${BackendURL}/api/advanced-ai/lesson-timeline/${lessonId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok && data.timeline) setTimeline(data.timeline.timeline_json || []);
      } catch (e) {
        console.error(e);
      }
    };
    load();
  }, [lessonId, token]);

  useEffect(() => {
    const backendOrigin = new URL(BackendURL).origin;
    const socket = io(backendOrigin, {
      path: "/socket.io",
      transports: ["websocket", "polling"]
    });
    socketRef.current = socket;
    socket.on("connect", () => console.log("ai-jobs socket connected"));
    socket.on("ai_job_update", (data) => {
      if (job?.id && data.job_id === job.id) {
        setJob(prev => ({ ...(prev || {}), ...data }));
        if (data.status === "completed" && data.output_url) {
          setMsg(`✅ Hybrid lesson ready: ${data.output_url}`);
        }
        if (data.status === "failed") {
          setMsg(`❌ Job failed: ${data.error_message || "Unknown error"}`);
        }
      }
    });
    return () => socket.disconnect();
  }, [job?.id]);

  return (
    <div style={S.page}>
      <div style={S.card}>
        <h1 style={S.h1}>Hybrid Lesson Composer</h1>
        <p style={S.sub}>Drag to reorder. Add trims, transitions, scrub preview timing, and compose into one lesson.</p>

        <div style={S.grid}>
          <input style={S.input} placeholder="Segment label" value={segmentLabel} onChange={(e) => setSegmentLabel(e.target.value)} />
          <input style={S.input} placeholder="Segment video URL" value={segmentUrl} onChange={(e) => setSegmentUrl(e.target.value)} />
          <input style={S.input} placeholder="Start at (sec)" value={segmentStart} onChange={(e) => setSegmentStart(e.target.value)} />
          <input style={S.input} placeholder="End at (sec)" value={segmentEnd} onChange={(e) => setSegmentEnd(e.target.value)} />
          <select style={S.input} value={segmentTransition} onChange={(e) => setSegmentTransition(e.target.value)}>
            <option value="none">No Transition</option>
            <option value="fade">Fade</option>
          </select>
          <button style={S.btn} onClick={addSegment}>Add Segment</button>
        </div>

        <div style={S.scrubBox}>
          <div style={S.scrubHead}>
            <strong>Timeline Scrubber Preview</strong>
            <span>{scrub}s / {totalDuration}s</span>
          </div>
          <input
            type="range"
            min="0"
            max={Math.max(1, totalDuration)}
            value={scrub}
            onChange={(e) => setScrub(Number(e.target.value))}
            style={S.scrub}
          />
          <div style={S.timelineBar}>
            {timeline.map((seg, idx) => {
              const start = Number(seg.start_at || 0);
              const end = seg.end_at === null || seg.end_at === "" || typeof seg.end_at === "undefined" ? start + 5 : Number(seg.end_at);
              const duration = Math.max(1, end - start);
              const widthPct = `${(duration / Math.max(1, totalDuration)) * 100}%`;
              return (
                <div
                  key={idx}
                  style={{ ...S.segPill, width: widthPct }}
                  title={`${seg.label} (${duration}s)`}
                >
                  {seg.label || `Segment ${idx + 1}`}
                </div>
              );
            })}
          </div>
        </div>

        <div style={S.list}>
          {timeline.map((seg, idx) => (
            <div
              key={idx}
              style={S.seg}
              draggable
              onDragStart={() => setDragIndex(idx)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (dragIndex !== null) moveSegment(dragIndex, idx);
                setDragIndex(null);
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={S.segTitle}>{seg.label || `Segment ${idx + 1}`}</div>
                <div style={S.segUrl}>{seg.url}</div>
                <div style={S.segMeta}>
                  Trim: {seg.start_at ?? 0}s → {seg.end_at ?? "end"} • Transition: {seg.transition || "none"}
                </div>
              </div>
              <div style={S.segBtns}>
                <button style={S.smallBtn} onClick={() => moveSegment(idx, idx - 1)}>↑</button>
                <button style={S.smallBtn} onClick={() => moveSegment(idx, idx + 1)}>↓</button>
                <button style={S.removeBtn} onClick={() => removeSegment(idx)}>Remove</button>
              </div>
            </div>
          ))}
        </div>

        <div style={S.row}>
          <button style={S.btnSecondary} onClick={saveTimeline} disabled={loading}>Save Timeline</button>
          <button style={S.btn} onClick={composeTimeline} disabled={loading || !timeline.length}>
            {loading ? "Working..." : "Compose Hybrid Lesson"}
          </button>
          {job?.id && (
            <>
              <button style={S.btnSecondary} onClick={() => controlJob("pause")}>Pause Job</button>
              <button style={S.btnSecondary} onClick={() => controlJob("resume")}>Resume Job</button>
              <button style={S.removeBtn} onClick={() => controlJob("cancel")}>Cancel Job</button>
            </>
          )}
        </div>

        {job && (
          <div style={S.jobBox}>
            <div><strong>Job:</strong> #{job.id}</div>
            <div><strong>Status:</strong> {job.status}</div>
            <div><strong>Control:</strong> {job.control_state || "active"}</div>
            <div><strong>Progress:</strong> {job.progress_pct || 0}%</div>
            {job.output_url && <div><strong>Output:</strong> {job.output_url}</div>}
          </div>
        )}

        {!!msg && <div style={S.msg}>{msg}</div>}
      </div>
    </div>
  );
}

const S = {
  page: { padding: 24, background: "#0b1118", minHeight: "100vh", color: "#eaf3f8" },
  card: { maxWidth: 1180, margin: "0 auto", background: "#111a24", borderRadius: 18, padding: 20, border: "1px solid rgba(255,255,255,0.07)" },
  h1: { marginTop: 0 },
  sub: { color: "#8aa0af" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 14 },
  row: { display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 14 },
  input: { width: "100%", padding: 12, borderRadius: 10, border: "1px solid rgba(255,255,255,0.09)", background: "#0d141d", color: "#eaf3f8" },
  btn: { background: "#00ffc8", color: "#04211a", border: "none", borderRadius: 10, padding: "12px 16px", fontWeight: 800, cursor: "pointer" },
  btnSecondary: { background: "rgba(255,255,255,0.06)", color: "#eaf3f8", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 10, padding: "12px 16px", fontWeight: 700, cursor: "pointer" },
  list: { display: "grid", gap: 10, marginBottom: 16 },
  seg: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, padding: 12, borderRadius: 12, background: "#0d141d", border: "1px solid rgba(255,255,255,0.06)", cursor: "grab" },
  segTitle: { fontWeight: 700 },
  segUrl: { color: "#89a0ae", fontSize: 13, wordBreak: "break-all" },
  segMeta: { color: "#6f8898", fontSize: 12, marginTop: 6 },
  segBtns: { display: "flex", gap: 8, alignItems: "center" },
  smallBtn: { background: "rgba(255,255,255,0.06)", color: "#dce7ee", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "8px 10px", cursor: "pointer" },
  removeBtn: { background: "#26151a", color: "#ff9b9b", border: "1px solid #5f2a34", borderRadius: 10, padding: "10px 12px", cursor: "pointer" },
  jobBox: { marginTop: 16, padding: 14, borderRadius: 12, background: "#0d141d", border: "1px solid rgba(255,255,255,0.06)" },
  msg: { marginTop: 14, padding: 12, borderRadius: 12, background: "rgba(255,255,255,0.05)" },
  scrubBox: { marginBottom: 16, padding: 14, borderRadius: 12, background: "#0d141d", border: "1px solid rgba(255,255,255,0.06)" },
  scrubHead: { display: "flex", justifyContent: "space-between", marginBottom: 10, color: "#dce7ee" },
  scrub: { width: "100%", marginBottom: 12 },
  timelineBar: { display: "flex", gap: 6, alignItems: "stretch" },
  segPill: { background: "rgba(0,255,200,0.12)", color: "#00ffc8", borderRadius: 8, padding: "8px 10px", fontSize: 12, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }
};
