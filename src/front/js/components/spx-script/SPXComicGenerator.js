import React, { useState } from "react";

const ART_STYLES = [
  "Noir / Ink", "Manga", "Marvel / DC", "Graphic Novel",
  "Retro / Silver Age", "Watercolor", "Cyberpunk", "Cartoon / Animated",
];

const BALLOON_TYPES = [
  "Speech", "Thought", "Caption", "Shout / Burst",
  "Whisper", "Radio / Device", "None",
];

const ASPECT_RATIOS = [
  { label: "Square (1:1)", value: "1:1", width: 1024, height: 1024 },
  { label: "Wide (16:9)", value: "16:9", width: 1280, height: 720 },
  { label: "Portrait (2:3)", value: "2:3", width: 683, height: 1024 },
  { label: "Cinematic (21:9)", value: "21:9", width: 1280, height: 549 },
];

const GEN_COUNTS = [
  { value: 1, label: "1 panel", credits: 2 },
  { value: 2, label: "2 panels", credits: 4 },
  { value: 4, label: "4 panels", credits: 8 },
  { value: 6, label: "6 panels", credits: 12 },
];

const FLUX_MODEL = "black-forest-labs/flux-1.1-pro";

export default function SPXComicGenerator({
  credits, setCredits,
  generatedPanels, setGeneratedPanels,
  generating, setGenerating,
  comic, setComic,
  selectedIssueId, selectedPageId, selectedPanelId,
}) {
  const [prompt, setPrompt] = useState("");
  const [characters, setCharacters] = useState("");
  const [balloonType, setBalloonType] = useState("Speech");
  const [dialogue, setDialogue] = useState("");
  const [selectedStyles, setSelectedStyles] = useState(["Noir / Ink"]);
  const [genCount, setGenCount] = useState(4);
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [seed, setSeed] = useState("");
  const [selectedResult, setSelectedResult] = useState(null);
  const [error, setError] = useState("");

  const costPerPanel = 2;
  const totalCost = genCount * costPerPanel;

  const toggleStyle = (style) => {
    setSelectedStyles((prev) =>
      prev.includes(style) ? prev.filter((s) => s !== style) : [...prev, style]
    );
  };

  const buildPrompt = () => {
    const styleStr = selectedStyles.join(", ");
    const charStr = characters ? `Characters: ${characters}. ` : "";
    const dialogueStr = dialogue && balloonType !== "None"
      ? `Speech balloon (${balloonType.toLowerCase()}): "${dialogue}". `
      : "";
    return `Comic book panel, ${styleStr} art style. ${charStr}${prompt}. ${dialogueStr}Professional sequential art, dramatic composition, high detail, comic book ink lines.`;
  };

  const generatePanels = async () => {
    if (!prompt.trim()) {
      setError("Please describe the panel before generating.");
      return;
    }
    if (credits < totalCost) {
      setError(`Not enough SPX Credits. Need ${totalCost}, have ${credits}.`);
      return;
    }
    setError("");
    setGenerating(true);

    const ratio = ASPECT_RATIOS.find((r) => r.value === aspectRatio) || ASPECT_RATIOS[0];
    const builtPrompt = buildPrompt();

    // Deduct credits immediately
    setCredits((prev) => prev - totalCost);

    const newPanels = Array.from({ length: genCount }, (_, i) => ({
      id: Date.now() + i,
      prompt: builtPrompt,
      style: selectedStyles.join(", "),
      dialogue,
      balloonType,
      character: characters,
      status: "loading",
      imageUrl: null,
      seed: seed || Math.floor(Math.random() * 999999).toString(),
    }));

    setGeneratedPanels((prev) => [...newPanels, ...prev]);

    // Part 18c: route through backend so the Replicate token stays server-side.
    // Backend handles polling and returns one entry per panel.
    const backend = process.env.REACT_APP_BACKEND_URL || "";
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    let results;
    try {
      const response = await fetch(`${backend}/api/script/generate-panel`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          prompt: builtPrompt,
          width: ratio.width,
          height: ratio.height,
          seed: seed ? parseInt(seed) : undefined,
          num_panels: genCount,
        }),
      });
      if (!response.ok) throw new Error(`Backend error: ${response.status}`);
      const data = await response.json();
      const panels = Array.isArray(data.panels) ? data.panels : [];
      results = newPanels.map((panel, idx) => {
        const r = panels[idx];
        if (r && r.status === "succeeded" && r.image_url) {
          return { id: panel.id, status: "done", imageUrl: r.image_url };
        }
        return { id: panel.id, status: "error", imageUrl: null };
      });
    } catch (err) {
      setError("Generation failed — please try again.");
      results = newPanels.map((panel) => ({ id: panel.id, status: "error", imageUrl: null }));
    }

    // Update generated panels with results
    setGeneratedPanels((prev) =>
      prev.map((p) => {
        const result = results.find((r) => r.id === p.id);
        return result ? { ...p, ...result } : p;
      })
    );

    setGenerating(false);
  };

  const sendToComicPage = (panel) => {
    if (!panel.imageUrl) return;
    setComic((prev) => ({
      ...prev,
      issues: prev.issues.map((iss) =>
        iss.id === selectedIssueId
          ? {
              ...iss,
              pages: iss.pages.map((pg) =>
                pg.id === selectedPageId
                  ? {
                      ...pg,
                      panels: pg.panels.map((p) =>
                        p.id === selectedPanelId
                          ? { ...p, generatedImage: panel.imageUrl, dialogue: panel.dialogue, balloonType: panel.balloonType, character: panel.character }
                          : p
                      ),
                    }
                  : pg
              ),
            }
          : iss
      ),
    }));
    alert(`Panel sent to Issue ${selectedIssueId}, Page ${selectedPageId}, Panel ${selectedPanelId}`);
  };

  return (
    <div className="spx-gen-area">
      {/* LEFT — Controls */}
      <div className="spx-gen-left">
        {/* Panel Description */}
        <div className="spx-gen-card">
          <div className="spx-gen-card-title">PANEL DESCRIPTION</div>
          <div className="spx-gen-field">
            <label>Scene / Action</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={"Describe what happens in this panel...\n\ne.g. Wide shot of a noir detective in a rain-soaked alley, neon signs reflecting in puddles, dramatic shadows."}
              rows={5}
            />
          </div>
          <div className="spx-gen-field">
            <label>Character(s)</label>
            <input
              type="text"
              value={characters}
              onChange={(e) => setCharacters(e.target.value)}
              placeholder="e.g. Nova, Rook"
            />
          </div>
          <div className="spx-gen-field">
            <label>Balloon Type</label>
            <select value={balloonType} onChange={(e) => setBalloonType(e.target.value)}>
              {BALLOON_TYPES.map((b) => <option key={b}>{b}</option>)}
            </select>
          </div>
          {balloonType !== "None" && (
            <div className="spx-gen-field">
              <label>Dialogue Text</label>
              <input
                type="text"
                value={dialogue}
                onChange={(e) => setDialogue(e.target.value)}
                placeholder="What they say..."
              />
            </div>
          )}
        </div>

        {/* Art Style */}
        <div className="spx-gen-card">
          <div className="spx-gen-card-title">ART STYLE</div>
          <div className="spx-style-grid">
            {ART_STYLES.map((style) => (
              <button
                key={style}
                className={`spx-style-chip ${selectedStyles.includes(style) ? "sel" : ""}`}
                onClick={() => toggleStyle(style)}
              >
                {style}
              </button>
            ))}
          </div>
        </div>

        {/* Settings */}
        <div className="spx-gen-card">
          <div className="spx-gen-card-title">GENERATION SETTINGS</div>
          <div className="spx-gen-field">
            <label>Panels to generate</label>
            <select value={genCount} onChange={(e) => setGenCount(Number(e.target.value))}>
              {GEN_COUNTS.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label} — {g.credits} credits
                </option>
              ))}
            </select>
          </div>
          <div className="spx-gen-field">
            <label>Aspect Ratio</label>
            <select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)}>
              {ASPECT_RATIOS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
          <div className="spx-gen-field">
            <label>Consistency Seed <span style={{ color: "#5a5a7a", fontSize: 10 }}>(same seed = same character look)</span></label>
            <input
              type="text"
              value={seed}
              onChange={(e) => setSeed(e.target.value)}
              placeholder="Leave blank for random"
            />
          </div>
        </div>

        {error && <div className="spx-gen-error">{error}</div>}

        <button
          className="spx-gen-btn"
          onClick={generatePanels}
          disabled={generating}
        >
          {generating ? (
            <><span className="spx-gen-spinner" /> GENERATING...</>
          ) : (
            <>◈ GENERATE PANELS</>
          )}
        </button>
        <div className="spx-credit-note">
          Will use {totalCost} SPX Credits · {Math.max(0, credits - totalCost)} remaining after
        </div>
        <div className="spx-flux-badge">FLUX 1.1 PRO via Replicate</div>
      </div>

      {/* RIGHT — Results */}
      <div className="spx-gen-right">
        <div className="spx-gen-results-header">
          <div className="spx-gen-results-title">GENERATED PANELS</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className="spx-toolbar-meta">{credits} credits remaining</span>
            {selectedResult && (
              <button
                className="spx-gen-send-btn"
                onClick={() => sendToComicPage(selectedResult)}
              >
                ← Send to Comic Page
              </button>
            )}
          </div>
        </div>

        {generatedPanels.length === 0 ? (
          <div className="spx-gen-placeholder">
            <div className="spx-gen-placeholder-icon">◈</div>
            <div className="spx-gen-placeholder-title">No panels generated yet</div>
            <div className="spx-gen-placeholder-sub">
              Describe your panel, pick a style,<br />and hit Generate Panels.
            </div>
            <div className="spx-gen-placeholder-note">
              Powered by FLUX 1.1 Pro via Replicate API
            </div>
          </div>
        ) : (
          <div className="spx-gen-grid">
            {generatedPanels.map((panel) => (
              <div
                key={panel.id}
                className={`spx-gen-result-card ${selectedResult?.id === panel.id ? "sel" : ""}`}
                onClick={() => setSelectedResult(panel)}
              >
                <div className="spx-gen-img-wrap">
                  {panel.status === "loading" ? (
                    <div className="spx-gen-img-loading">
                      <span className="spx-gen-spinner" />
                      <span>Generating...</span>
                    </div>
                  ) : panel.imageUrl ? (
                    <img src={panel.imageUrl} alt="Generated panel" className="spx-gen-img" />
                  ) : (
                    <div className="spx-gen-img-placeholder">
                      <div style={{ fontSize: 28, opacity: 0.2 }}>◈</div>
                      <div style={{ fontSize: 10, opacity: 0.5, textAlign: "center", padding: "0 12px" }}>
                        Generation failed
                      </div>
                    </div>
                  )}
                </div>
                <div className="spx-gen-result-meta">
                  <span>{panel.style}</span>
                  <span style={{ color: "#5a5a7a" }}>Seed: {panel.seed}</span>
                </div>
                {panel.dialogue && (
                  <div className="spx-gen-result-balloon">
                    <span className="spx-gen-result-char">{panel.character}</span>
                    <span className="spx-gen-result-text">{panel.dialogue}</span>
                  </div>
                )}
                {selectedResult?.id === panel.id && panel.imageUrl && (
                  <button
                    className="spx-gen-send-btn-inline"
                    onClick={(e) => { e.stopPropagation(); sendToComicPage(panel); }}
                  >
                    → Send to Comic Page
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
