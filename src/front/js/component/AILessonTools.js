import React, { useEffect, useMemo, useState } from "react";
import { BackendURL } from "./backendURL";
import AvatarSelector from "./AvatarSelector";

export default function AILessonTools({ token, lessons = [], onAttached }) {
  const [tier, setTier] = useState("starter");
  const [selectedAvatar, setSelectedAvatar] = useState(null);
  const [selectedLessonId, setSelectedLessonId] = useState("");
  const [videos, setVideos] = useState([]);
  const [selectedGenerationId, setSelectedGenerationId] = useState("");
  const [scriptText, setScriptText] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [videoPrompt, setVideoPrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [quality, setQuality] = useState("standard");
  const [loading, setLoading] = useState(false);
  const [attaching, setAttaching] = useState(false);
  const [savingScript, setSavingScript] = useState(false);
  const [generatingAudio, setGeneratingAudio] = useState(false);
  const [generatingVideo, setGeneratingVideo] = useState(false);
  const [msg, setMsg] = useState("");

  const attachableLessons = useMemo(() => lessons.filter(Boolean), [lessons]);

  const selectedLesson = useMemo(
    () => lessons.find((l) => String(l.id) === String(selectedLessonId)),
    [selectedLessonId, lessons]
  );

  const reloadVideoGallery = async () => {
    if (!token) return;
    try {
      const vidsRes = await fetch(`${BackendURL}/api/ai-video/my-videos?status=completed&per_page=50`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (vidsRes.ok) {
        const d = await vidsRes.json();
        setVideos(d.videos || []);
      }
    } catch (e) {
      console.error("reloadVideoGallery error:", e);
    }
  };

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

  useEffect(() => {
    if (!selectedLesson) return;
    setScriptText(selectedLesson.script_text || selectedLesson.text_content || "");
    setAudioUrl(selectedLesson.ai_audio_url || (selectedLesson.content_type === "audio" ? selectedLesson.video_url || "" : ""));
    setVideoPrompt(selectedLesson.script_text || selectedLesson.text_content || selectedLesson.description || "");
  }, [selectedLesson]);

  const saveScript = async () => {
    setMsg("");
    if (!selectedLessonId) {
      setMsg("Choose a lesson first.");
      return;
    }

    try {
      setSavingScript(true);
      const res = await fetch(`${BackendURL}/api/academy/lessons/${selectedLessonId}/script`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          script_text: scriptText,
          avatar_id: selectedAvatar?.id || null,
          source_mode: "hybrid",
          generation_status: "idle"
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save script");

      setMsg("✅ Lesson script saved.");
      if (typeof onAttached === "function") onAttached();
    } catch (e) {
      console.error(e);
      setMsg(`❌ ${e.message}`);
    } finally {
      setSavingScript(false);
    }
  };

  const attachVideo = async (generationIdOverride = null) => {
    setMsg("");
    const generationId = generationIdOverride || selectedGenerationId;

    if (!selectedLessonId) {
      setMsg("Choose a lesson first.");
      return false;
    }
    if (!generationId) {
      setMsg("Choose or generate an AI video first.");
      return false;
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
          generation_id: Number(generationId),
          avatar_choice: selectedAvatar?.id || null
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to attach AI video");

      setMsg("✅ AI video attached to lesson.");
      if (typeof onAttached === "function") onAttached();
      return true;
    } catch (e) {
      console.error(e);
      setMsg(`❌ ${e.message}`);
      return false;
    } finally {
      setAttaching(false);
    }
  };

  const attachAudio = async (audioUrlOverride = null) => {
    setMsg("");
    const finalAudioUrl = (audioUrlOverride || audioUrl || "").trim();

    if (!selectedLessonId) {
      setMsg("Choose a lesson first.");
      return false;
    }
    if (!finalAudioUrl) {
      setMsg("Generate or paste an audio URL first.");
      return false;
    }

    try {
      setAttaching(true);
      const res = await fetch(`${BackendURL}/api/academy/lessons/${selectedLessonId}/attach-ai-audio`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          audio_url: finalAudioUrl,
          script_text: scriptText,
          avatar_choice: selectedAvatar?.id || null
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to attach AI audio");

      setAudioUrl(finalAudioUrl);
      setMsg("✅ AI audio attached to lesson.");
      if (typeof onAttached === "function") onAttached();
      return true;
    } catch (e) {
      console.error(e);
      setMsg(`❌ ${e.message}`);
      return false;
    } finally {
      setAttaching(false);
    }
  };

  const generateLessonAudio = async () => {
    setMsg("");
    if (!selectedLessonId) {
      setMsg("Choose a lesson first.");
      return;
    }
    if (!scriptText.trim()) {
      setMsg("Write or save a lesson script first.");
      return;
    }

    try {
      setGeneratingAudio(true);

      const lessonTitle = selectedLesson?.title || "Lesson";
      const courseName = selectedLesson?.course_id ? `Course ${selectedLesson.course_id}` : "My Course";

      const res = await fetch(`${BackendURL}/api/voice/course/lesson`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          script: scriptText,
          title: lessonTitle,
          course_name: courseName
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate lesson audio");

      const generatedAudioUrl = data.audio_url || data.url || data.lesson_audio_url;
      if (!generatedAudioUrl) {
        throw new Error("Audio was generated but no audio URL was returned.");
      }

      setAudioUrl(generatedAudioUrl);
      const attached = await attachAudio(generatedAudioUrl);
      if (attached) {
        setMsg("✅ Lesson audio generated and attached.");
      }
    } catch (e) {
      console.error(e);
      setMsg(`❌ ${e.message}`);
    } finally {
      setGeneratingAudio(false);
    }
  };

  const generateLessonVideo = async () => {
    setMsg("");
    if (!selectedLessonId) {
      setMsg("Choose a lesson first.");
      return;
    }

    const prompt = (videoPrompt || scriptText || "").trim();
    if (!prompt) {
      setMsg("Add a video prompt or lesson script first.");
      return;
    }

    try {
      setGeneratingVideo(true);

      const res = await fetch(`${BackendURL}/api/ai-video/generate/text`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          prompt,
          aspect_ratio: aspectRatio,
          quality,
          avatar_mode: !!selectedAvatar
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate lesson video");

      const generationId = data.generation?.id;
      if (!generationId) {
        throw new Error("Video generated but no generation id was returned.");
      }

      setSelectedGenerationId(String(generationId));
      await reloadVideoGallery();

      const attached = await attachVideo(generationId);
      if (attached) {
        setMsg(`✅ Lesson video generated and attached${data.credits_used ? ` (${data.credits_used} credits used)` : ""}.`);
      }
    } catch (e) {
      console.error(e);
      setMsg(`❌ ${e.message}`);
    } finally {
      setGeneratingVideo(false);
    }
  };

  return (
    <div style={S.wrap}>
      <div style={S.header}>
        <div>
          <h3 style={S.title}>AI Lesson Tools</h3>
          <p style={S.sub}>
            Manual lessons still work. Use AI only where it saves time: script saving, narration, short video clips, and avatar-led segments.
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

        <div style={S.field}>
          <label style={S.label}>Lesson Script</label>
          <textarea
            value={scriptText}
            onChange={(e) => setScriptText(e.target.value)}
            rows={6}
            style={S.textarea}
            placeholder="Write or paste your lesson script here..."
          />
        </div>

        <div style={S.row}>
          <div style={S.field}>
            <label style={S.label}>Video Prompt</label>
            <textarea
              value={videoPrompt}
              onChange={(e) => setVideoPrompt(e.target.value)}
              rows={4}
              style={S.textarea}
              placeholder="Short prompt for a visual clip based on this lesson..."
            />
          </div>

          <div style={S.field}>
            <label style={S.label}>AI Audio URL</label>
            <input
              type="text"
              value={audioUrl}
              onChange={(e) => setAudioUrl(e.target.value)}
              style={S.input}
              placeholder="Generated lesson audio URL"
            />
          </div>
        </div>

        <div style={S.row}>
          <div style={S.field}>
            <label style={S.label}>Aspect Ratio</label>
            <select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)} style={S.select}>
              <option value="16:9">16:9</option>
              <option value="9:16">9:16</option>
              <option value="1:1">1:1</option>
            </select>
          </div>

          <div style={S.field}>
            <label style={S.label}>Quality</label>
            <select value={quality} onChange={(e) => setQuality(e.target.value)} style={S.select}>
              <option value="standard">Standard</option>
              <option value="premium">Premium</option>
            </select>
          </div>
        </div>

        <div style={S.actions}>
          <button type="button" onClick={saveScript} style={S.secondaryBtn} disabled={savingScript || loading}>
            {savingScript ? "Saving..." : "Save Lesson Script"}
          </button>

          <button type="button" onClick={generateLessonAudio} style={S.secondaryBtn} disabled={generatingAudio || loading}>
            {generatingAudio ? "Generating Audio..." : "Generate Lesson Audio"}
          </button>

          <button type="button" onClick={generateLessonVideo} style={S.primaryBtn} disabled={generatingVideo || loading}>
            {generatingVideo ? "Generating Video..." : "Generate Lesson Video"}
          </button>

          <button type="button" onClick={() => attachAudio()} style={S.secondaryBtn} disabled={attaching || loading}>
            {attaching ? "Working..." : "Attach AI Audio"}
          </button>

          <button type="button" onClick={() => attachVideo()} style={S.secondaryBtn} disabled={attaching || loading}>
            {attaching ? "Working..." : "Attach Existing AI Video"}
          </button>

          <span style={S.note}>
            Manual upload, text lessons, and regular course building still work the same.
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
  field: { display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 },
  label: { color: "#dce8ee", fontSize: "0.78rem", fontWeight: 700 },
  select: {
    background: "#0d141d",
    color: "#e0edf3",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 10,
    padding: "11px 12px"
  },
  input: {
    background: "#0d141d",
    color: "#e0edf3",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 10,
    padding: "11px 12px"
  },
  textarea: {
    background: "#0d141d",
    color: "#e0edf3",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 10,
    padding: "12px",
    resize: "vertical"
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
  secondaryBtn: {
    background: "rgba(255,255,255,0.06)",
    color: "#d9ebf2",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 10,
    padding: "12px 16px",
    fontWeight: 700,
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
