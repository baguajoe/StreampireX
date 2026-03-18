import React, { useEffect, useMemo, useState } from "react";
import { BackendURL } from "./backendURL";
import AvatarSelector from "./AvatarSelector";

export default function AILessonTools({ token, lessons = [], onAttached }) {
  const [tier, setTier] = useState("starter");
  const [selectedAvatar, setSelectedAvatar] = useState(null);
  const [selectedLessonId, setSelectedLessonId] = useState("");
  const [videos, setVideos] = useState([]);
  const [selectedGenerationId, setSelectedGenerationId] = useState("");
  const [loading, setLoading] = useState(false);
  const [attaching, setAttaching] = useState(false);
  const [msg, setMsg] = useState("");

  const attachableLessons = useMemo(
    () => lessons.filter(Boolean),
    [lessons]
  );

  useEffect(() => {
    const run = async () => {
      if (!token) return;
      try {
        setLoading(true);

        const [statusRes, vidsRes] = await Promise.all([
          fetch(`${BackendURL}/api/ai-video/studio-status`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          fetch(`${BackendURL}/api/ai-video/my-videos?status=completed&per_page=50`, {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);

        if (statusRes.ok) {
          const s = await statusRes.json();
          setTier((s.tier || "starter").toLowerCase());
        }

        if (vidsRes.ok) {
          const d = await vidsRes.json();
          setVideos(d.videos || []);
        }
      } catch (e) {
        console.error("AI lesson tools load error:", e);
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [token]);

  const attachVideo = async () => {
    setMsg("");
    if (!selectedLessonId) {
      setMsg("Choose a lesson first.");
      return;
    }
    if (!selectedGenerationId) {
      setMsg("Choose a generated AI video.");
      return;
    }

    try {
      setAttaching(true);
      const res = await fetch(`${BackendURL}/api/academy/lessons/${selectedLessonId}/attach-ai-video`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          generation_id: Number(selectedGenerationId),
          avatar_choice: selectedAvatar?.id || null
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to attach AI video");

      setMsg("✅ AI video attached to lesson.");
      if (typeof onAttached === "function") onAttached();
    } catch (e) {
      console.error(e);
      setMsg(`❌ ${e.message}`);
    } finally {
      setAttaching(false);
    }
  };

  return (
    <div style={S.wrap}>
      <div style={S.header}>
        <div>
          <h3 style={S.title}>AI Lesson Tools</h3>
          <p style={S.sub}>
            Manual lessons still work. Use this only when you want AI narration, AI clips, or avatar-led lesson segments.
          </p>
        </div>
        <a href="/ai-video-studio" style={S.linkBtn}>Open AI Video Studio</a>
      </div>

      <div style={S.panel}>
        <div style={S.row}>
          <div style={S.field}>
            <label style={S.label}>Lesson</label>
            <select value={selectedLessonId} onChange={(e) => setSelectedLessonId(e.target.value)} style={S.select}>
              <option value="">Select a lesson</option>
              {attachableLessons.map((lesson) => (
                <option key={lesson.id} value={lesson.id}>
                  {lesson.title || `Lesson ${lesson.id}`}
                </option>
              ))}
            </select>
          </div>

          <div style={S.field}>
            <label style={S.label}>Generated AI Video</label>
            <select value={selectedGenerationId} onChange={(e) => setSelectedGenerationId(e.target.value)} style={S.select}>
              <option value="">Select a completed video</option>
              {videos.map((v) => (
                <option key={v.id} value={v.id}>
                  #{v.id} • {(v.prompt || v.generation_type || "AI Video").slice(0, 60)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <AvatarSelector tier={tier} value={selectedAvatar} onChange={setSelectedAvatar} />

        <div style={S.actions}>
          <button type="button" onClick={attachVideo} style={S.primaryBtn} disabled={attaching || loading}>
            {attaching ? "Attaching..." : "Attach AI Video to Lesson"}
          </button>
          <span style={S.note}>
            Avatar choice is stored with the attach request now, and you can expand lesson-level avatar persistence next.
          </span>
        </div>

        {!!msg && <div style={S.message}>{msg}</div>}
      </div>
    </div>
  );
}

const S = {
  wrap: {
    marginBottom: 22,
    padding: 16,
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "linear-gradient(180deg, rgba(0,255,200,0.04), rgba(255,255,255,0.02))"
  },
  header: { display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start", flexWrap: "wrap", marginBottom: 14 },
  title: { margin: 0, color: "#eef6fa", fontSize: "1rem" },
  sub: { margin: "6px 0 0", color: "#7a93a3", fontSize: "0.82rem", maxWidth: 760 },
  panel: { marginTop: 4 },
  row: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 },
  field: { display: "flex", flexDirection: "column", gap: 6 },
  label: { color: "#dce8ee", fontSize: "0.78rem", fontWeight: 700 },
  select: {
    background: "#0d141d",
    color: "#e0edf3",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 10,
    padding: "11px 12px"
  },
  actions: { display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginTop: 14 },
  primaryBtn: {
    background: "#00ffc8",
    color: "#04211a",
    border: "none",
    borderRadius: 10,
    padding: "12px 16px",
    fontWeight: 800,
    cursor: "pointer"
  },
  linkBtn: {
    textDecoration: "none",
    background: "rgba(255,255,255,0.06)",
    color: "#d9ebf2",
    borderRadius: 10,
    padding: "10px 14px",
    fontWeight: 700
  },
  note: { color: "#7a93a3", fontSize: "0.75rem" },
  message: {
    marginTop: 12,
    padding: "10px 12px",
    borderRadius: 10,
    background: "rgba(255,255,255,0.05)",
    color: "#dbe7ee",
    fontSize: "0.82rem"
  }
};
