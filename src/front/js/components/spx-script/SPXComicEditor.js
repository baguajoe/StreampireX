import React, { useState } from "react";

const LAYOUTS = [
  { value: "grid-3c", label: "3-Column" },
  { value: "grid-2c", label: "2-Column" },
  { value: "grid-splash", label: "Splash Page" },
  { value: "grid-2t1b", label: "2-Top 1-Bottom" },
  { value: "grid-1t2b", label: "1-Top 2-Bottom" },
];

const BALLOON_TYPES = [
  "Speech", "Thought", "Caption", "Shout / Burst",
  "Whisper", "Radio / Device", "None",
];

export default function SPXComicEditor({
  comic, setComic,
  selectedIssueId, selectedPageId, setSelectedPageId,
  selectedPanelId, setSelectedPanelId,
}) {
  const [editingPanelId, setEditingPanelId] = useState(null);

  const issue = comic.issues.find((i) => i.id === selectedIssueId) || comic.issues[0];
  const page = issue?.pages.find((p) => p.id === selectedPageId) || issue?.pages[0];

  const updatePage = (updater) => {
    setComic((prev) => ({
      ...prev,
      issues: prev.issues.map((iss) =>
        iss.id === selectedIssueId
          ? {
              ...iss,
              pages: iss.pages.map((pg) =>
                pg.id === selectedPageId ? updater(pg) : pg
              ),
            }
          : iss
      ),
    }));
  };

  const addPanel = () => {
    updatePage((pg) => ({
      ...pg,
      panels: [
        ...pg.panels,
        {
          id: Date.now(),
          description: "New panel — add description...",
          character: "",
          balloonType: "Speech",
          dialogue: "",
          generatedImage: null,
        },
      ],
    }));
  };

  const updatePanel = (panelId, key, value) => {
    updatePage((pg) => ({
      ...pg,
      panels: pg.panels.map((p) =>
        p.id === panelId ? { ...p, [key]: value } : p
      ),
    }));
  };

  const deletePanel = (panelId) => {
    updatePage((pg) => ({
      ...pg,
      panels: pg.panels.filter((p) => p.id !== panelId),
    }));
  };

  // Generate panel image via FLUX 1.1 Pro (backend route /api/script/generate-panel).
  // Sets the panel's generatedImage to "loading" optimistically; replaces with the
  // returned URL on success, or null on failure. Race-safe via panelId capture.
  const generatePanelImage = async (panelId) => {
    const targetPanel = page?.panels.find((p) => p.id === panelId);
    if (!targetPanel) return;
    const prompt = (targetPanel.description || "").trim();
    if (!prompt || prompt === "New panel — add description...") {
      alert("Add a description for this panel before generating.");
      return;
    }

    // Optimistic loading state
    updatePanel(panelId, "generatedImage", "loading");

    try {
      const token =
        localStorage.getItem("token") ||
        sessionStorage.getItem("token") ||
        "";
      const backend = process.env.REACT_APP_BACKEND_URL || "";
      const res = await fetch(`${backend}/api/script/generate-panel`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          prompts: [prompt],
          style: targetPanel.balloonType === "Caption" ? "noir" : "comic",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = data?.error || data?.details || `HTTP ${res.status}`;
        throw new Error(msg);
      }
      const firstPanel = Array.isArray(data?.panels) ? data.panels[0] : null;
      const imageUrl = firstPanel?.image_url || firstPanel?.url || null;
      if (imageUrl) {
        updatePanel(panelId, "generatedImage", imageUrl);
      } else {
        updatePanel(panelId, "generatedImage", null);
        alert("Panel generated but no image URL returned. Check backend logs.");
      }
    } catch (err) {
      updatePanel(panelId, "generatedImage", null);
      alert(`Generate failed: ${err.message || err}`);
    }
  };

  const addPage = () => {
    const newPageId = Date.now();
    setComic((prev) => ({
      ...prev,
      issues: prev.issues.map((iss) =>
        iss.id === selectedIssueId
          ? {
              ...iss,
              pages: [
                ...iss.pages,
                { id: newPageId, layout: "grid-3c", panels: [] },
              ],
            }
          : iss
      ),
    }));
    setSelectedPageId(newPageId);
  };

  const addIssue = () => {
    const newIssueId = Date.now();
    setComic((prev) => ({
      ...prev,
      issues: [
        ...prev.issues,
        {
          id: newIssueId,
          number: prev.issues.length + 1,
          pages: [{ id: Date.now(), layout: "grid-3c", panels: [] }],
        },
      ],
    }));
  };

  const setLayout = (layout) => {
    updatePage((pg) => ({ ...pg, layout }));
  };

  if (!page) return <div className="spx-script-center"><div style={{ padding: 40, color: "#5a5a7a" }}>No pages yet.</div></div>;

  const panelCount = page.panels.length;

  return (
    <div className="spx-script-center">
      {/* COMIC TOOLBAR */}
      <div className="spx-script-toolbar">
        <span className="spx-toolbar-meta">Issue</span>
        <select
          className="spx-fmt-sel-sm"
          value={selectedIssueId}
          onChange={(e) => {/* handled by nav */}}
        >
          {comic.issues.map((iss) => (
            <option key={iss.id} value={iss.id}>#{iss.number}</option>
          ))}
        </select>
        <span className="spx-toolbar-meta" style={{ marginLeft: 8 }}>Page</span>
        <select
          className="spx-fmt-sel-sm"
          value={selectedPageId}
          onChange={(e) => setSelectedPageId(Number(e.target.value))}
        >
          {issue.pages.map((pg, idx) => (
            <option key={pg.id} value={pg.id}>Pg {idx + 1}</option>
          ))}
        </select>
        <span className="spx-toolbar-meta" style={{ marginLeft: 8 }}>Layout</span>
        <select
          className="spx-fmt-sel-sm"
          value={page.layout}
          onChange={(e) => setLayout(e.target.value)}
        >
          {LAYOUTS.map((l) => (
            <option key={l.value} value={l.value}>{l.label}</option>
          ))}
        </select>
        <button className="spx-el-btn" style={{ marginLeft: 8 }} onClick={addPanel}>+ PANEL</button>
        <button className="spx-el-btn" onClick={addPage}>+ PAGE</button>
        <button className="spx-el-btn" onClick={addIssue}>+ ISSUE</button>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
          <span className="spx-toolbar-meta">{panelCount} panels on this page</span>
          <span className="spx-toolbar-sep">|</span>
          <span className="spx-toolbar-meta spx-toolbar-meta-teal">Issue #{issue.number}</span>
        </div>
      </div>

      {/* PANEL GRID */}
      <div className="spx-script-scroll">
        <div className="spx-comic-wrap">
          <div className="spx-comic-page-label">
            PAGE {issue.pages.findIndex(p => p.id === selectedPageId) + 1} — ISSUE #{issue.number}
          </div>

          <div className={`spx-panel-grid ${page.layout}`}>
            {page.panels.map((panel, idx) => (
              <div
                key={panel.id}
                className={`spx-panel-box ${selectedPanelId === panel.id ? "active" : ""}`}
                onClick={() => { setSelectedPanelId(panel.id); setEditingPanelId(panel.id); }}
              >
                {/* Panel image area */}
                {panel.generatedImage ? (
                  <img src={panel.generatedImage} alt={`Panel ${idx + 1}`} className="spx-panel-img" />
                ) : (
                  <div className="spx-panel-placeholder">
                    <div className="spx-panel-num">
                      {String(idx + 1).padStart(2, "0")}
                    </div>
                    <span>Panel {idx + 1}</span>
                    {panel.generatedImage === "loading" && (
                      <div className="spx-panel-loading">Generating...</div>
                    )}
                  </div>
                )}

                {/* Description */}
                {editingPanelId === panel.id ? (
                  <textarea
                    className="spx-panel-desc-input"
                    value={panel.description}
                    autoFocus
                    onChange={(e) => updatePanel(panel.id, "description", e.target.value)}
                    onBlur={() => setEditingPanelId(null)}
                    placeholder="Describe this panel..."
                    rows={3}
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <div className="spx-panel-desc">{panel.description}</div>
                )}

                {/* Balloon */}
                <div className="spx-panel-balloon">
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                    <select
                      className="spx-panel-balloon-type"
                      value={panel.balloonType}
                      onChange={(e) => updatePanel(panel.id, "balloonType", e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {BALLOON_TYPES.map((b) => (
                        <option key={b}>{b}</option>
                      ))}
                    </select>
                    <input
                      className="spx-panel-char-input"
                      value={panel.character}
                      placeholder="CHARACTER"
                      onChange={(e) => updatePanel(panel.id, "character", e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  {panel.balloonType !== "None" && (
                    <input
                      className="spx-panel-dialogue-input"
                      value={panel.dialogue}
                      placeholder="Dialogue..."
                      onChange={(e) => updatePanel(panel.id, "dialogue", e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  )}
                </div>

                {/* Panel controls */}
                {selectedPanelId === panel.id && (
                  <div className="spx-panel-controls">
                    <button
                      className="spx-panel-ctrl"
                      onClick={(e) => { e.stopPropagation(); generatePanelImage(panel.id); }}
                      title="Generate image from description (uses SPX Credits)"
                      disabled={panel.generatedImage === "loading"}
                    >{panel.generatedImage === "loading" ? "⏳" : "🎨"}</button>
                    <button
                      className="spx-panel-ctrl danger"
                      onClick={(e) => { e.stopPropagation(); deletePanel(panel.id); }}
                      title="Delete panel"
                    >✕</button>
                  </div>
                )}
              </div>
            ))}

            {/* Add panel cell */}
            <div className="spx-add-panel-btn" onClick={addPanel}>
              + ADD PANEL
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
