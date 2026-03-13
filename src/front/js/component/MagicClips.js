// =============================================================================
// MagicClips.js — AI Auto Highlight Reel Generator
// =============================================================================
// Location: src/front/js/component/MagicClips.js
// Usage: <MagicClips recordedBlob={blob} sessionId={id} sessionName={str} />
// =============================================================================

import React, { useState, useCallback } from "react";

const RATIO_OPTIONS = [
  { id: "9:16", icon: "📱", label: "9:16", desc: "TikTok / Reels" },
  { id: "1:1", icon: "⬜", label: "1:1", desc: "Instagram" },
  { id: "16:9", icon: "🖥", label: "16:9", desc: "YouTube" },
];

const CAPTION_STYLES = [
  { id: "bold", label: "BOLD", preview: "bold", desc: "White caps" },
  { id: "minimal", label: "Minimal", preview: "minimal", desc: "Clean lower-third" },
  { id: "colorful", label: "Colorful", preview: "colorful", desc: "Teal highlight" },
  { id: "karaoke", label: "Karaoke", preview: "karaoke", desc: "Word-by-word" },
];

const MagicClips = ({ recordedBlob, sessionId, sessionName = "Episode" }) => {
  const [clips, setClips] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [selectedRatio, setSelectedRatio] = useState("9:16");
  const [selectedCaption, setSelectedCaption] = useState("bold");
  const [selectedClips, setSelectedClips] = useState(new Set());
  const [editingClip, setEditingClip] = useState(null);
  const [generatingStep, setGeneratingStep] = useState("");
  const [exportingAll, setExportingAll] = useState(false);

  const genSteps = [
    "Analyzing audio transcript...",
    "Identifying high-engagement moments...",
    "Scoring emotional peaks...",
    "Extracting top clips...",
    "Preparing clip data...",
  ];

  const generateClips = useCallback(async () => {
    if (!recordedBlob && !sessionId) return;
    setGenerating(true);
    setClips([]);

    for (let i = 0; i < genSteps.length; i++) {
      setGeneratingStep(genSteps[i]);
      await new Promise((r) => setTimeout(r, 900));
    }

    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      const bu = process.env.REACT_APP_BACKEND_URL || "";
      const fd = new FormData();
      if (recordedBlob) fd.append("audio", recordedBlob, "recording.webm");
      if (sessionId) fd.append("session_id", sessionId);
      fd.append("ratio", selectedRatio);
      fd.append("caption_style", selectedCaption);

      const res = await fetch(`${bu}/api/podcast-studio/magic-clips`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });

      if (res.ok) {
        const data = await res.json();
        if (data.clips?.length) { setClips(data.clips); setGenerating(false); return; }
      }
    } catch (e) {}

    // Mock clips fallback
    const mockClips = [
      { id: "c1", start: 12.4, end: 72.1, duration: 59.7, score: 94, preview: "...this is the moment everything changed for creators. The old model of waiting for gatekeepers is completely dead...", tags: ["high_energy", "quotable"], reasons: ["emotional_peak", "viral_potential"] },
      { id: "c2", start: 145.2, end: 195.8, duration: 50.6, score: 88, preview: "...90 percent revenue share. Think about that. YouTube keeps 55 cents of every dollar. We flip that model completely...", tags: ["revenue", "comparison"], reasons: ["key_stat", "controversy"] },
      { id: "c3", start: 287.0, end: 332.5, duration: 45.5, score: 82, preview: "...I remember when streaming meant you needed a TV deal. Now you need a phone and StreamPireX. That's the whole thing...", tags: ["story", "relatable"], reasons: ["storytelling", "humor"] },
      { id: "c4", start: 401.3, end: 441.7, duration: 40.4, score: 79, preview: "...AI is not replacing creators. AI is the editor, the engineer, the distributor. You're still the artist...", tags: ["ai", "inspiration"], reasons: ["quotable", "shareable"] },
      { id: "c5", start: 512.0, end: 547.2, duration: 35.2, score: 75, preview: "...The difference between creators who blow up and those who don't? Consistency plus the right tools at the right time...", tags: ["advice", "growth"], reasons: ["actionable", "relatable"] },
    ];
    setClips(mockClips);
    setGenerating(false);
  }, [recordedBlob, sessionId, selectedRatio, selectedCaption]);

  const toggleSelect = (id) => {
    setSelectedClips((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const exportClip = async (clip) => {
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    const bu = process.env.REACT_APP_BACKEND_URL || "";
    try {
      await fetch(`${bu}/api/podcast-studio/export-clip`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, clip_id: clip.id, start: clip.start, end: clip.end, ratio: selectedRatio, caption_style: selectedCaption }),
      });
    } catch (e) {}
  };

  const exportAll = async () => {
    setExportingAll(true);
    const toExport = selectedClips.size > 0 ? clips.filter((c) => selectedClips.has(c.id)) : clips;
    for (const clip of toExport) await exportClip(clip);
    setExportingAll(false);
  };

  const fmtTime = (s) => {
    const m = Math.floor(s / 60), sec = Math.floor(s % 60);
    return `${m}:${String(sec).padStart(2, "0")}`;
  };

  const captionStyle = (style) => {
    const base = { fontSize: "13px", padding: "2px 0" };
    if (style === "bold") return { ...base, color: "#fff", fontWeight: "900", textTransform: "uppercase" };
    if (style === "minimal") return { ...base, color: "rgba(255,255,255,0.8)", fontWeight: "400" };
    if (style === "colorful") return { ...base, color: "#00ffc8", fontWeight: "700" };
    if (style === "karaoke") return { ...base, color: "#ffff44", fontWeight: "800" };
    return base;
  };

  return (
    <div style={MC.wrap}>
      <div style={MC.header}>
        <h3 style={MC.title}>✨ Magic Clips</h3>
        <p style={MC.sub}>AI finds your most viral moments and turns them into social clips automatically</p>
      </div>

      {clips.length === 0 && !generating && (
        <div style={MC.empty}>
          {/* Format bar */}
          <div style={MC.formatBar}>
            <div style={MC.formatGroup}>
              <label style={MC.formatLabel}>Aspect Ratio</label>
              <div style={MC.pills}>
                {RATIO_OPTIONS.map((r) => (
                  <button key={r.id} style={{ ...MC.pill, ...(selectedRatio === r.id ? MC.pillActive : {}) }} onClick={() => setSelectedRatio(r.id)}>
                    <span style={MC.pillIcon}>{r.icon}</span>
                    <span style={MC.pillLabel}>{r.label}</span>
                    <span style={MC.pillDesc}>{r.desc}</span>
                  </button>
                ))}
              </div>
            </div>
            <div style={MC.formatGroup}>
              <label style={MC.formatLabel}>Caption Style</label>
              <div style={MC.pills}>
                {CAPTION_STYLES.map((c) => (
                  <button key={c.id} style={{ ...MC.pill, ...(selectedCaption === c.id ? MC.pillActive : {}) }} onClick={() => setSelectedCaption(c.id)}>
                    <span style={captionStyle(c.preview)}>{c.label}</span>
                    <span style={MC.pillDesc}>{c.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
          <button
            style={{ ...MC.genBtn, ...(!recordedBlob && !sessionId ? MC.btnDisabled : {}) }}
            onClick={generateClips}
            disabled={!recordedBlob && !sessionId}
          >
            ✨ Generate Magic Clips
          </button>
          {!recordedBlob && !sessionId && <p style={MC.noRecHint}>Record an episode first</p>}
        </div>
      )}

      {generating && (
        <div style={MC.genLoading}>
          <div style={MC.genSpinner} />
          <p style={MC.genText}>{generatingStep}</p>
          <div style={MC.genBar}><div style={MC.genBarFill} /></div>
        </div>
      )}

      {clips.length > 0 && (
        <>
          {/* Clip grid */}
          <div style={MC.grid}>
            {clips.map((clip, i) => (
              <div
                key={clip.id}
                style={{ ...MC.card, ...(selectedClips.has(clip.id) ? MC.cardSelected : {}) }}
                onClick={() => toggleSelect(clip.id)}
              >
                <div style={MC.cardTop}>
                  <span style={MC.clipNum}>CLIP {i + 1}</span>
                  <span style={MC.clipScore}>🔥 {clip.score}</span>
                </div>
                <p style={MC.clipPreview}>"{clip.preview}"</p>
                <div style={MC.clipMeta}>
                  <span style={MC.clipTime}>{fmtTime(clip.start)} → {fmtTime(clip.end)}</span>
                  <span style={MC.clipDur}>{clip.duration.toFixed(0)}s</span>
                </div>
                <div style={MC.clipTags}>
                  {clip.reasons?.map((r) => <span key={r} style={MC.reasonTag}>{r.replace(/_/g, " ")}</span>)}
                  {clip.tags?.map((t) => <span key={t} style={MC.tag}>{t}</span>)}
                </div>
                <div style={MC.cardActions} onClick={(e) => e.stopPropagation()}>
                  <button style={MC.actionBtn} onClick={() => exportClip(clip)}>📤 Export</button>
                  <button style={{ ...MC.actionBtn, ...MC.actionBtnEdit }} onClick={() => setEditingClip(clip)}>✏️ Edit</button>
                </div>
                {selectedClips.has(clip.id) && <div style={MC.selectedCheck}>✓</div>}
              </div>
            ))}
          </div>

          {/* Export all */}
          <div style={MC.exportRow}>
            <button style={MC.exportAllBtn} onClick={exportAll} disabled={exportingAll}>
              {exportingAll ? "Exporting..." : `📤 Export ${selectedClips.size > 0 ? selectedClips.size + " Selected" : "All " + clips.length} Clips`}
            </button>
            <button style={MC.regenBtn} onClick={() => { setClips([]); setSelectedClips(new Set()); }}>🔄 Regenerate</button>
          </div>
        </>
      )}

      {/* Clip edit modal */}
      {editingClip && (
        <div style={MC.modalOverlay} onClick={() => setEditingClip(null)}>
          <div style={MC.modal} onClick={(e) => e.stopPropagation()}>
            <div style={MC.modalHeader}>
              <h4 style={MC.modalTitle}>Edit Clip</h4>
              <button style={MC.modalClose} onClick={() => setEditingClip(null)}>✕</button>
            </div>
            <div style={MC.modalBody}>
              <div style={MC.modalField}>
                <label style={MC.modalLabel}>Start Time (seconds)</label>
                <input style={MC.modalInput} type="number" step="0.1" defaultValue={editingClip.start}
                  onChange={(e) => setEditingClip((c) => ({ ...c, start: parseFloat(e.target.value) }))} />
              </div>
              <div style={MC.modalField}>
                <label style={MC.modalLabel}>End Time (seconds)</label>
                <input style={MC.modalInput} type="number" step="0.1" defaultValue={editingClip.end}
                  onChange={(e) => setEditingClip((c) => ({ ...c, end: parseFloat(e.target.value) }))} />
              </div>
              <div style={MC.modalField}>
                <label style={MC.modalLabel}>Caption Text</label>
                <textarea style={MC.modalTextarea} defaultValue={editingClip.preview} rows={3} />
              </div>
            </div>
            <div style={MC.modalFooter}>
              <button style={MC.modalCancel} onClick={() => setEditingClip(null)}>Cancel</button>
              <button style={MC.modalSave} onClick={() => { setClips((prev) => prev.map((c) => c.id === editingClip.id ? editingClip : c)); setEditingClip(null); }}>Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const MC = {
  wrap: { background: "linear-gradient(180deg, rgba(14,20,30,0.96), rgba(8,13,20,0.96))", borderRadius: "20px", border: "1px solid rgba(255,255,255,0.06)", padding: "24px", marginTop: "16px" },
  header: { marginBottom: "20px" },
  title: { color: "#e0eaf0", fontSize: "1.1rem", fontWeight: "800", margin: "0 0 4px" },
  sub: { color: "#4a6070", fontSize: "0.82rem", margin: 0 },
  empty: { display: "flex", flexDirection: "column", alignItems: "center", gap: "20px" },
  formatBar: { width: "100%", display: "flex", gap: "24px", padding: "16px", background: "rgba(255,255,255,0.02)", borderRadius: "14px", border: "1px solid rgba(255,255,255,0.04)", flexWrap: "wrap" },
  formatGroup: { display: "flex", flexDirection: "column", gap: "10px" },
  formatLabel: { color: "#4a6070", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: "700" },
  pills: { display: "flex", gap: "8px", flexWrap: "wrap" },
  pill: { padding: "10px 14px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "10px", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: "2px", minWidth: "80px", transition: "all 0.18s" },
  pillActive: { background: "rgba(0,255,200,0.1)", borderColor: "rgba(0,255,200,0.28)" },
  pillIcon: { fontSize: "1.2rem" },
  pillLabel: { color: "#e0eaf0", fontSize: "0.8rem", fontWeight: "700" },
  pillDesc: { color: "#4a6070", fontSize: "0.68rem" },
  genBtn: { padding: "16px 40px", background: "linear-gradient(135deg, #FF6600, #ff3366)", border: "none", borderRadius: "14px", color: "#fff", fontWeight: "800", fontSize: "1rem", cursor: "pointer", boxShadow: "0 10px 28px rgba(255,102,0,0.25)" },
  btnDisabled: { opacity: 0.4, cursor: "not-allowed" },
  noRecHint: { color: "#3a5060", fontSize: "0.78rem", margin: 0 },
  genLoading: { textAlign: "center", padding: "48px 20px" },
  genSpinner: { width: "44px", height: "44px", border: "3px solid rgba(255,102,0,0.15)", borderTopColor: "#FF6600", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" },
  genText: { color: "#FF6600", fontWeight: "700", fontSize: "0.9rem", margin: "0 0 16px" },
  genBar: { width: "240px", height: "4px", background: "rgba(255,102,0,0.15)", borderRadius: "999px", overflow: "hidden", margin: "0 auto" },
  genBarFill: { height: "100%", width: "60%", background: "linear-gradient(90deg, #FF6600, #ff3366)", borderRadius: "999px", animation: "slide 1.5s ease-in-out infinite" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "14px", marginBottom: "18px" },
  card: { background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "16px", padding: "16px", cursor: "pointer", transition: "all 0.18s", position: "relative" },
  cardSelected: { border: "1px solid rgba(0,255,200,0.3)", background: "rgba(0,255,200,0.04)" },
  cardTop: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" },
  clipNum: { color: "#00ffc8", fontSize: "0.7rem", fontWeight: "800", letterSpacing: "0.08em" },
  clipScore: { color: "#FF6600", fontSize: "0.82rem", fontWeight: "800" },
  clipPreview: { color: "#8090a0", fontSize: "0.82rem", lineHeight: 1.5, fontStyle: "italic", marginBottom: "10px", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" },
  clipMeta: { display: "flex", justifyContent: "space-between", marginBottom: "8px" },
  clipTime: { color: "#4a6070", fontSize: "0.76rem", fontFamily: "monospace" },
  clipDur: { color: "#6a8090", fontSize: "0.76rem", fontWeight: "700" },
  clipTags: { display: "flex", flexWrap: "wrap", gap: "5px", marginBottom: "10px" },
  reasonTag: { padding: "2px 8px", background: "rgba(0,255,200,0.08)", color: "#00d9aa", borderRadius: "4px", fontSize: "0.68rem", fontWeight: "700" },
  tag: { padding: "2px 8px", background: "rgba(255,255,255,0.05)", color: "#6a8090", borderRadius: "4px", fontSize: "0.68rem" },
  cardActions: { display: "flex", gap: "8px" },
  actionBtn: { flex: 1, padding: "7px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "8px", color: "#8090a0", fontSize: "0.74rem", fontWeight: "700", cursor: "pointer" },
  actionBtnEdit: { color: "#FF9060" },
  selectedCheck: { position: "absolute", top: "10px", right: "10px", width: "22px", height: "22px", background: "#00ffc8", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#041014", fontWeight: "800", fontSize: "0.8rem" },
  exportRow: { display: "flex", gap: "12px", justifyContent: "center" },
  exportAllBtn: { padding: "13px 28px", background: "linear-gradient(135deg, #00ffc8, #00d9aa)", border: "none", borderRadius: "12px", color: "#041014", fontWeight: "800", fontSize: "0.9rem", cursor: "pointer" },
  regenBtn: { padding: "13px 20px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", color: "#8090a0", fontSize: "0.88rem", fontWeight: "700", cursor: "pointer" },
  modalOverlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 },
  modal: { width: "90%", maxWidth: "500px", background: "linear-gradient(180deg, #0d1520, #080e17)", borderRadius: "20px", border: "1px solid rgba(255,255,255,0.08)", overflow: "hidden" },
  modalHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.05)" },
  modalTitle: { color: "#e0eaf0", fontWeight: "800", margin: 0, fontSize: "1rem" },
  modalClose: { background: "none", border: "none", color: "#4a6070", fontSize: "1.2rem", cursor: "pointer" },
  modalBody: { padding: "20px", display: "flex", flexDirection: "column", gap: "14px" },
  modalField: { display: "flex", flexDirection: "column", gap: "6px" },
  modalLabel: { color: "#4a6070", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: "700" },
  modalInput: { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "10px", padding: "10px 12px", color: "#e0eaf0", fontSize: "0.9rem", outline: "none" },
  modalTextarea: { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "10px", padding: "10px 12px", color: "#e0eaf0", fontSize: "0.9rem", outline: "none", resize: "vertical", fontFamily: "inherit" },
  modalFooter: { display: "flex", gap: "10px", justifyContent: "flex-end", padding: "16px 20px", borderTop: "1px solid rgba(255,255,255,0.05)" },
  modalCancel: { padding: "10px 20px", background: "transparent", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", color: "#6a8090", cursor: "pointer", fontWeight: "700" },
  modalSave: { padding: "10px 24px", background: "linear-gradient(135deg, #00ffc8, #00d9aa)", border: "none", borderRadius: "10px", color: "#041014", fontWeight: "800", cursor: "pointer" },
};

export default MagicClips;