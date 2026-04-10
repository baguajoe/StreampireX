import React from "react";

const SCENE_TAGS = [
  "CAST", "PROPS", "LOCATION", "WARDROBE",
  "VFX", "STUNT", "VEHICLE", "SOUND", "MUSIC",
];

export default function SPXScriptRightPanel({
  mainTab, rpTab, setRpTab,
  script, comic, setComic,
  selectedIssueId, selectedPageId, selectedPanelId,
}) {
  const [tags, setTags] = React.useState(["CAST", "LOCATION", "MUSIC"]);
  const [sceneLocation, setSceneLocation] = React.useState("Recording Studio");
  const [timeOfDay, setTimeOfDay] = React.useState("NIGHT");
  const [intExt, setIntExt] = React.useState("INT.");
  const [props, setProps] = React.useState("Mixing board, headphones, coffee cup");
  const [sceneNote, setSceneNote] = React.useState("Marcus's reluctance here is key — he's not blocked, he's afraid. The 16 bars represent the entire third act reveal. Don't rush this beat.");
  const [dirNote, setDirNote] = React.useState("Lighting ref: Blade Runner 2049 opening. Hold the silence longer than feels comfortable.");
  const [revNote, setRevNote] = React.useState("");

  const toggleTag = (tag) => {
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const estimatedPages = Math.max(1, Math.ceil((script?.elements?.length || 0) / 8));
  const progress = Math.min(100, Math.round((estimatedPages / 90) * 100));

  // Get selected panel for comic breakdown
  const issue = comic?.issues?.find((i) => i.id === selectedIssueId);
  const page = issue?.pages?.find((p) => p.id === selectedPageId);
  const panel = page?.panels?.find((p) => p.id === selectedPanelId);

  return (
    <div className="spx-right-panel">
      <div className="spx-rp-tabs">
        {["breakdown", "notes", "chars"].map((tab) => (
          <button
            key={tab}
            className={`spx-rp-tab ${rpTab === tab ? "active" : ""}`}
            onClick={() => setRpTab(tab)}
          >
            {tab === "breakdown" ? "BREAKDOWN" : tab === "notes" ? "NOTES" : "CAST"}
          </button>
        ))}
      </div>

      <div className="spx-rp-body">
        {/* BREAKDOWN */}
        {rpTab === "breakdown" && (
          <>
            {mainTab === "script" && (
              <>
                <div className="spx-rp-section">
                  <div className="spx-rp-label">Scene Tags</div>
                  <div className="spx-tag-row">
                    {SCENE_TAGS.map((tag) => (
                      <button
                        key={tag}
                        className={`spx-tag ${tags.includes(tag) ? "on" : ""}`}
                        onClick={() => toggleTag(tag)}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="spx-rp-section">
                  <div className="spx-rp-label">Scene Details</div>
                  <div className="spx-rp-field">
                    <label>Location</label>
                    <input type="text" value={sceneLocation} onChange={(e) => setSceneLocation(e.target.value)} />
                  </div>
                  <div className="spx-rp-field">
                    <label>Time of Day</label>
                    <select value={timeOfDay} onChange={(e) => setTimeOfDay(e.target.value)}>
                      {["NIGHT", "DAY", "DAWN", "DUSK", "CONTINUOUS"].map((t) => (
                        <option key={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div className="spx-rp-field">
                    <label>INT / EXT</label>
                    <select value={intExt} onChange={(e) => setIntExt(e.target.value)}>
                      {["INT.", "EXT.", "INT./EXT."].map((t) => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
                <div className="spx-rp-section">
                  <div className="spx-rp-label">Props</div>
                  <div className="spx-rp-field">
                    <textarea value={props} onChange={(e) => setProps(e.target.value)} rows={3} />
                  </div>
                </div>
                <div className="spx-rp-section">
                  <div className="spx-rp-label">Script Progress</div>
                  <div style={{ fontSize: 11, color: "#8888aa", marginBottom: 4 }}>
                    Page {estimatedPages} of est. 90
                  </div>
                  <div className="spx-progress-bar">
                    <div className="spx-progress-fill" style={{ width: `${progress}%` }} />
                  </div>
                  <div style={{ fontSize: 10, color: "#5a5a7a" }}>
                    ~{progress}% complete
                  </div>
                </div>
              </>
            )}

            {mainTab === "comic" && panel && (
              <>
                <div className="spx-rp-section">
                  <div className="spx-rp-label">Selected Panel</div>
                  <div style={{ fontSize: 11, color: "#8888aa", marginBottom: 8 }}>
                    Issue #{issue?.number} · Page {page ? issue.pages.findIndex(p => p.id === page.id) + 1 : "—"} · Panel {page?.panels?.findIndex(p => p.id === selectedPanelId) + 1 || "—"}
                  </div>
                  <div className="spx-rp-field">
                    <label>Description</label>
                    <textarea
                      value={panel.description}
                      onChange={(e) => {
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
                                              ? { ...p, description: e.target.value }
                                              : p
                                          ),
                                        }
                                      : pg
                                  ),
                                }
                              : iss
                          ),
                        }));
                      }}
                      rows={4}
                    />
                  </div>
                  <div className="spx-rp-field">
                    <label>Character</label>
                    <input type="text" value={panel.character} readOnly />
                  </div>
                  <div className="spx-rp-field">
                    <label>Balloon</label>
                    <input type="text" value={panel.balloonType} readOnly />
                  </div>
                  <div className="spx-rp-field">
                    <label>Dialogue</label>
                    <textarea value={panel.dialogue} readOnly rows={2} />
                  </div>
                  <div className="spx-rp-field">
                    <label>AI Image</label>
                    <div style={{ fontSize: 11, color: panel.generatedImage ? "#00ffc8" : "#5a5a7a" }}>
                      {panel.generatedImage ? "✓ Image applied" : "No image yet — use AI Generator tab"}
                    </div>
                  </div>
                </div>
              </>
            )}

            {mainTab === "comic" && !panel && (
              <div style={{ padding: 16, fontSize: 12, color: "#5a5a7a" }}>
                Select a panel to see its breakdown.
              </div>
            )}
          </>
        )}

        {/* NOTES */}
        {rpTab === "notes" && (
          <>
            <div className="spx-rp-section">
              <div className="spx-rp-label">Scene Note</div>
              <div className="spx-rp-field">
                <textarea value={sceneNote} onChange={(e) => setSceneNote(e.target.value)} rows={5} />
              </div>
            </div>
            <div className="spx-rp-section">
              <div className="spx-rp-label">Director Note</div>
              <div className="spx-rp-field">
                <textarea value={dirNote} onChange={(e) => setDirNote(e.target.value)} rows={4} />
              </div>
            </div>
            <div className="spx-rp-section">
              <div className="spx-rp-label">Revision Note</div>
              <div className="spx-rp-field">
                <textarea value={revNote} onChange={(e) => setRevNote(e.target.value)} rows={3} placeholder="What changed in this draft..." />
              </div>
            </div>
          </>
        )}

        {/* CAST */}
        {rpTab === "chars" && (
          <>
            <div className="spx-rp-section">
              <div className="spx-rp-label">Characters</div>
              <div className="spx-char-list">
                {script.characters.map((char) => (
                  <div key={char.name} className="spx-char-item">
                    <div className="spx-char-dot" style={{ background: char.color }} />
                    <div className="spx-char-name">{char.name}</div>
                    <div className="spx-char-count">{char.lines} lines</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="spx-rp-section" style={{ marginTop: 14 }}>
              <div className="spx-rp-label">Locations</div>
              {script.locations.map((loc) => (
                <div key={loc.name} className="spx-loc-item">
                  <span>{loc.name}</span>
                  <span className="spx-loc-count">{loc.count} scenes</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
