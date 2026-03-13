// =============================================================================
// StudioBranding.js — Show Identity / Per-Podcast Branding
// =============================================================================
// Location: src/front/js/component/StudioBranding.js

import React, { useState, useCallback } from "react";

export const StudioBranding = ({ sessionId, onSave }) => {
  const [showName, setShowName] = useState("");
  const [tagline, setTagline] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#00ffc8");
  const [secondaryColor, setSecondaryColor] = useState("#FF6600");
  const [logoUrl, setLogoUrl] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const [introFile, setIntroFile] = useState(null);
  const [outroFile, setOutroFile] = useState(null);
  const [watermarkPos, setWatermarkPos] = useState("bottom-right");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    setLogoUrl(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      const bu = process.env.REACT_APP_BACKEND_URL || "";
      const fd = new FormData();
      fd.append("session_id", sessionId || "");
      fd.append("show_name", showName);
      fd.append("tagline", tagline);
      fd.append("primary_color", primaryColor);
      fd.append("secondary_color", secondaryColor);
      fd.append("watermark_position", watermarkPos);
      if (logoFile) fd.append("logo", logoFile);
      if (introFile) fd.append("intro", introFile);
      if (outroFile) fd.append("outro", outroFile);
      await fetch(`${bu}/api/podcast-studio/save-branding`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      onSave && onSave({ showName, tagline, primaryColor, secondaryColor, logoUrl, watermarkPos });
    } catch (e) {}
    setSaving(false);
  };

  const positions = ["top-left", "top-right", "bottom-left", "bottom-right"];

  return (
    <div style={SB.wrap}>
      <div style={SB.header}>
        <h3 style={SB.title}>🎨 Studio Branding</h3>
        <p style={SB.sub}>Customize your show's visual identity. Applied to all exported clips and episodes.</p>
      </div>

      <div style={SB.grid}>
        {/* Show name */}
        <div style={SB.field}>
          <label style={SB.label}>Show Name</label>
          <input style={SB.input} value={showName} onChange={(e) => setShowName(e.target.value)} placeholder="My Podcast Show" />
        </div>

        {/* Tagline */}
        <div style={SB.field}>
          <label style={SB.label}>Tagline</label>
          <input style={SB.input} value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="Your show's catchphrase" />
        </div>

        {/* Colors */}
        <div style={{ ...SB.field, gridColumn: "1 / -1" }}>
          <label style={SB.label}>Brand Colors</label>
          <div style={SB.colorRow}>
            <div style={SB.colorPicker}>
              <span style={SB.colorLabel}>Primary</span>
              <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} style={SB.colorInput} />
              <span style={SB.colorHex}>{primaryColor}</span>
            </div>
            <div style={SB.colorPicker}>
              <span style={SB.colorLabel}>Accent</span>
              <input type="color" value={secondaryColor} onChange={(e) => setSecondaryColor(e.target.value)} style={SB.colorInput} />
              <span style={SB.colorHex}>{secondaryColor}</span>
            </div>
          </div>
        </div>

        {/* Logo upload */}
        <div style={SB.field}>
          <label style={SB.label}>Show Logo</label>
          {logoUrl ? (
            <div style={SB.logoPreview}>
              <img src={logoUrl} alt="logo" style={SB.logoImg} />
              <button style={SB.removeBtn} onClick={() => { setLogoUrl(null); setLogoFile(null); }}>✕</button>
            </div>
          ) : (
            <label style={SB.dropZone}>
              <input type="file" accept="image/*" onChange={handleLogoUpload} style={{ display: "none" }} />
              <span style={SB.dropIcon}>🖼️</span>
              <span style={SB.dropText}>Click to upload logo</span>
              <span style={SB.dropHint}>PNG, SVG recommended</span>
            </label>
          )}
        </div>

        {/* Intro jingle */}
        <div style={SB.field}>
          <label style={SB.label}>Intro Jingle</label>
          <label style={{ ...SB.dropZone, ...SB.dropZoneSmall }}>
            <input type="file" accept="audio/*" onChange={(e) => setIntroFile(e.target.files?.[0])} style={{ display: "none" }} />
            <span>{introFile ? `✅ ${introFile.name}` : "🎵 Upload intro jingle"}</span>
          </label>
        </div>

        {/* Outro */}
        <div style={SB.field}>
          <label style={SB.label}>Outro Music</label>
          <label style={{ ...SB.dropZone, ...SB.dropZoneSmall }}>
            <input type="file" accept="audio/*" onChange={(e) => setOutroFile(e.target.files?.[0])} style={{ display: "none" }} />
            <span>{outroFile ? `✅ ${outroFile.name}` : "🎵 Upload outro music"}</span>
          </label>
        </div>

        {/* Watermark position */}
        <div style={{ ...SB.field, gridColumn: "1 / -1" }}>
          <label style={SB.label}>Watermark Position</label>
          <div style={SB.posGrid}>
            {positions.map((pos) => (
              <button key={pos} style={{ ...SB.posBtn, ...(watermarkPos === pos ? SB.posBtnActive : {}) }} onClick={() => setWatermarkPos(pos)}>
                <div style={{ ...SB.posPreview, position: "relative" }}>
                  <div style={{ ...SB.posDot, ...(pos.includes("top") ? { top: "4px" } : { bottom: "4px" }), ...(pos.includes("right") ? { right: "4px" } : { left: "4px" }), position: "absolute", width: "8px", height: "8px", background: primaryColor, borderRadius: "2px" }} />
                </div>
                <span style={SB.posLabel}>{pos.replace("-", " ")}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Preview card */}
      <div style={{ ...SB.preview, borderColor: primaryColor + "40", background: `linear-gradient(135deg, ${primaryColor}10, ${secondaryColor}08)` }}>
        {logoUrl && <img src={logoUrl} alt="logo" style={SB.previewLogo} />}
        <div>
          <div style={{ ...SB.previewName, color: primaryColor }}>{showName || "Your Show Name"}</div>
          <div style={SB.previewTagline}>{tagline || "Your tagline here"}</div>
        </div>
        <div style={{ ...SB.previewEp, color: secondaryColor }}>EP 001</div>
      </div>

      <button style={{ ...SB.saveBtn, background: saved ? "linear-gradient(135deg, #00aa80, #008060)" : `linear-gradient(135deg, ${primaryColor}, ${primaryColor}aa)` }} onClick={handleSave} disabled={saving}>
        {saved ? "✅ Saved!" : saving ? "Saving..." : "💾 Save Branding"}
      </button>
    </div>
  );
};

const SB = {
  wrap: { background: "linear-gradient(180deg, rgba(14,20,30,0.96), rgba(8,13,20,0.96))", borderRadius: "20px", border: "1px solid rgba(255,255,255,0.06)", padding: "24px" },
  header: { marginBottom: "20px" },
  title: { color: "#e0eaf0", fontSize: "1.1rem", fontWeight: "800", margin: "0 0 4px" },
  sub: { color: "#4a6070", fontSize: "0.82rem", margin: 0 },
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" },
  field: { display: "flex", flexDirection: "column", gap: "8px" },
  label: { color: "#4a6070", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: "700" },
  input: { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", padding: "10px 12px", color: "#e0eaf0", fontSize: "0.9rem", outline: "none" },
  colorRow: { display: "flex", gap: "20px" },
  colorPicker: { display: "flex", alignItems: "center", gap: "10px" },
  colorLabel: { color: "#5a7080", fontSize: "0.8rem" },
  colorInput: { width: "36px", height: "36px", border: "none", borderRadius: "8px", cursor: "pointer", background: "none", padding: 0 },
  colorHex: { fontFamily: "monospace", fontSize: "0.8rem", color: "#8090a0" },
  logoPreview: { position: "relative", display: "inline-block" },
  logoImg: { maxWidth: "120px", maxHeight: "80px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.08)" },
  removeBtn: { position: "absolute", top: "-8px", right: "-8px", width: "20px", height: "20px", background: "#ff4444", border: "none", borderRadius: "50%", color: "#fff", fontSize: "0.7rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" },
  dropZone: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "20px", border: "2px dashed rgba(255,255,255,0.08)", borderRadius: "12px", cursor: "pointer", gap: "4px", transition: "border-color 0.2s" },
  dropZoneSmall: { padding: "12px" },
  dropIcon: { fontSize: "1.5rem" },
  dropText: { color: "#8090a0", fontSize: "0.82rem" },
  dropHint: { color: "#3a5060", fontSize: "0.72rem" },
  posGrid: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "8px" },
  posBtn: { padding: "10px 8px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "10px", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" },
  posBtnActive: { background: "rgba(0,255,200,0.08)", borderColor: "rgba(0,255,200,0.24)" },
  posPreview: { width: "40px", height: "30px", background: "rgba(255,255,255,0.04)", borderRadius: "4px" },
  posLabel: { color: "#6a8090", fontSize: "0.68rem", textTransform: "capitalize" },
  preview: { display: "flex", alignItems: "center", gap: "16px", padding: "16px 20px", borderRadius: "14px", border: "1px solid", marginBottom: "16px" },
  previewLogo: { width: "44px", height: "44px", objectFit: "contain", borderRadius: "8px" },
  previewName: { fontWeight: "800", fontSize: "1rem" },
  previewTagline: { color: "#5a7080", fontSize: "0.8rem", marginTop: "2px" },
  previewEp: { marginLeft: "auto", fontWeight: "700", fontSize: "0.8rem" },
  saveBtn: { width: "100%", padding: "14px", border: "none", borderRadius: "12px", color: "#041014", fontWeight: "800", fontSize: "0.95rem", cursor: "pointer" },
};


// =============================================================================
// AsyncRecording.js — Send-a-link async guest recording
// =============================================================================
// Location: src/front/js/component/AsyncRecording.js
// Export: default AsyncRecording

export const AsyncRecording = ({ sessionId, sessionName = "Episode" }) => {
  const [links, setLinks] = useState([]);
  const [guestName, setGuestName] = useState("");
  const [prompt, setPrompt] = useState("");
  const [maxMins, setMaxMins] = useState(10);
  const [deadline, setDeadline] = useState("");
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(null);

  const createLink = async () => {
    if (!guestName.trim()) return;
    setCreating(true);
    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      const bu = process.env.REACT_APP_BACKEND_URL || "";
      const res = await fetch(`${bu}/api/podcast-studio/async-link`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, guest_name: guestName, prompt, max_minutes: maxMins, deadline }),
      });
      const data = await res.json();
      const link = data.link || `${window.location.origin}/async-record/${data.token || Math.random().toString(36).substr(2, 8)}`;
      setLinks((prev) => [{ id: Date.now(), guest: guestName, link, status: "pending", prompt, deadline }, ...prev]);
      setGuestName(""); setPrompt(""); setDeadline("");
    } catch (e) {
      // Mock
      const token = Math.random().toString(36).substr(2, 8).toUpperCase();
      setLinks((prev) => [{ id: Date.now(), guest: guestName, link: `${window.location.origin}/async-record/${token}`, status: "pending", prompt, deadline }, ...prev]);
      setGuestName(""); setPrompt(""); setDeadline("");
    }
    setCreating(false);
  };

  const copyLink = (id, link) => {
    navigator.clipboard.writeText(link);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const statusColor = (s) => s === "completed" ? "#00ffc8" : s === "viewed" ? "#4a9eff" : "#4a6070";
  const statusBg = (s) => s === "completed" ? "rgba(0,255,200,0.1)" : s === "viewed" ? "rgba(74,158,255,0.1)" : "rgba(255,255,255,0.04)";

  return (
    <div style={AR.wrap}>
      <div style={AR.header}>
        <h3 style={AR.title}>📩 Async Recording</h3>
        <p style={AR.sub}>Send guests a link — they record on their own time, you get the audio automatically.</p>
      </div>

      {/* Create form */}
      <div style={AR.form}>
        <div style={AR.row}>
          <div style={AR.field}>
            <label style={AR.label}>Guest Name</label>
            <input style={AR.input} value={guestName} onChange={(e) => setGuestName(e.target.value)} placeholder="John Smith" />
          </div>
          <div style={AR.field}>
            <label style={AR.label}>Max Duration</label>
            <select style={AR.select} value={maxMins} onChange={(e) => setMaxMins(parseInt(e.target.value))}>
              {[3, 5, 10, 15, 20, 30].map((m) => <option key={m} value={m}>{m} minutes</option>)}
            </select>
          </div>
          <div style={AR.field}>
            <label style={AR.label}>Deadline (optional)</label>
            <input style={AR.input} type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </div>
        </div>
        <div style={AR.field}>
          <label style={AR.label}>Recording Prompt (optional)</label>
          <textarea style={AR.textarea} value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="What should they talk about? E.g. 'Tell us about your journey from zero to 10k listeners...'" rows={2} />
        </div>
        <button style={{ ...AR.createBtn, ...(!guestName.trim() ? AR.btnDisabled : {}) }} onClick={createLink} disabled={creating || !guestName.trim()}>
          {creating ? "Creating..." : "🔗 Create Recording Link"}
        </button>
      </div>

      {/* Links list */}
      {links.length > 0 && (
        <div style={AR.linksList}>
          <h4 style={AR.linksTitle}>Guest Links ({links.length})</h4>
          {links.map((item) => (
            <div key={item.id} style={AR.linkCard}>
              <div style={AR.linkLeft}>
                <div style={AR.linkGuest}>{item.guest}</div>
                {item.prompt && <div style={AR.linkPrompt}>"{item.prompt}"</div>}
                {item.deadline && <div style={AR.linkDeadline}>Due: {item.deadline}</div>}
              </div>
              <div style={AR.linkRight}>
                <span style={{ ...AR.statusBadge, color: statusColor(item.status), background: statusBg(item.status) }}>
                  {item.status}
                </span>
                <button style={AR.copyBtn} onClick={() => copyLink(item.id, item.link)}>
                  {copied === item.id ? "✓ Copied!" : "📋 Copy Link"}
                </button>
                {item.status === "completed" && (
                  <button style={AR.downloadBtn}>⬇️ Download</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {links.length === 0 && (
        <div style={AR.empty}>
          <span style={AR.emptyIcon}>📩</span>
          <p style={AR.emptyText}>No async links yet. Create one above.</p>
        </div>
      )}
    </div>
  );
};

const AR = {
  wrap: { background: "linear-gradient(180deg, rgba(14,20,30,0.96), rgba(8,13,20,0.96))", borderRadius: "20px", border: "1px solid rgba(255,255,255,0.06)", padding: "24px" },
  header: { marginBottom: "20px" },
  title: { color: "#e0eaf0", fontSize: "1.1rem", fontWeight: "800", margin: "0 0 4px" },
  sub: { color: "#4a6070", fontSize: "0.82rem", margin: 0 },
  form: { background: "rgba(255,255,255,0.02)", borderRadius: "14px", padding: "18px", marginBottom: "20px", border: "1px solid rgba(255,255,255,0.04)", display: "flex", flexDirection: "column", gap: "14px" },
  row: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" },
  field: { display: "flex", flexDirection: "column", gap: "6px" },
  label: { color: "#4a6070", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: "700" },
  input: { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", padding: "10px 12px", color: "#e0eaf0", fontSize: "0.88rem", outline: "none" },
  select: { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", padding: "10px 12px", color: "#e0eaf0", fontSize: "0.88rem", outline: "none" },
  textarea: { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", padding: "10px 12px", color: "#e0eaf0", fontSize: "0.88rem", outline: "none", resize: "vertical", fontFamily: "inherit" },
  createBtn: { padding: "12px", background: "linear-gradient(135deg, #00ffc8, #00d9aa)", border: "none", borderRadius: "12px", color: "#041014", fontWeight: "800", fontSize: "0.9rem", cursor: "pointer" },
  btnDisabled: { opacity: 0.4, cursor: "not-allowed" },
  linksList: { display: "flex", flexDirection: "column", gap: "10px" },
  linksTitle: { color: "#8090a0", fontSize: "0.82rem", fontWeight: "700", margin: "0 0 10px", textTransform: "uppercase", letterSpacing: "0.06em" },
  linkCard: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", padding: "14px 16px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "12px", flexWrap: "wrap" },
  linkLeft: { display: "flex", flexDirection: "column", gap: "4px", flex: 1 },
  linkGuest: { color: "#e0eaf0", fontWeight: "700", fontSize: "0.9rem" },
  linkPrompt: { color: "#5a7080", fontSize: "0.78rem", fontStyle: "italic" },
  linkDeadline: { color: "#4a6070", fontSize: "0.74rem" },
  linkRight: { display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" },
  statusBadge: { padding: "4px 10px", borderRadius: "999px", fontSize: "0.72rem", fontWeight: "700", textTransform: "capitalize" },
  copyBtn: { padding: "7px 14px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", color: "#8090a0", fontSize: "0.76rem", fontWeight: "700", cursor: "pointer" },
  downloadBtn: { padding: "7px 14px", background: "rgba(0,255,200,0.08)", border: "1px solid rgba(0,255,200,0.18)", borderRadius: "8px", color: "#00ffc8", fontSize: "0.76rem", fontWeight: "700", cursor: "pointer" },
  empty: { textAlign: "center", padding: "32px", display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" },
  emptyIcon: { fontSize: "2rem" },
  emptyText: { color: "#3a5060", fontSize: "0.85rem" },
};

export default AsyncRecording;