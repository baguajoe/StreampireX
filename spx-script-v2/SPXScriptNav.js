import React, { useState } from "react";

export default function SPXScriptNav({
  mainTab, script, comic,
  selectedIssueId, selectedPageId,
  onSelectPage, onSelectIssue,
  drafts,
}) {
  const [collapsed, setCollapsed] = useState(false);
  const activeDraft = drafts.find((d) => d.active) || drafts[drafts.length - 1];

  if (collapsed) {
    return (
      <div className="spx-nav-collapsed" onClick={() => setCollapsed(false)}>
        <span>›</span>
      </div>
    );
  }

  return (
    <div className="spx-nav-panel">
      <button className="spx-nav-collapse-btn" onClick={() => setCollapsed(true)} title="Collapse">‹</button>

      {mainTab === "script" && (
        <>
          <div className="spx-nav-section">Structure</div>
          <div className="spx-nav-item active"><div className="spx-nav-dot" />ACT ONE</div>
          <div className="spx-nav-item"><div className="spx-nav-dot" />ACT TWO</div>
          <div className="spx-nav-item"><div className="spx-nav-dot" />ACT THREE</div>

          <div className="spx-nav-divider" />
          <div className="spx-nav-section">Scenes</div>
          {script.locations.map((loc) => (
            <div key={loc.name} className="spx-nav-item">
              <div className="spx-nav-dot" />
              <span style={{ fontSize: 11 }}>{loc.name}</span>
            </div>
          ))}

          <div className="spx-nav-divider" />
          <div className="spx-nav-section">Characters</div>
          {script.characters.map((char) => (
            <div key={char.name} className="spx-nav-item">
              <div className="spx-nav-dot" style={{ background: char.color }} />
              {char.name}
            </div>
          ))}
        </>
      )}

      {mainTab === "comic" && (
        <>
          <div className="spx-nav-section">Issues</div>
          {comic.issues.map((iss) => (
            <div key={iss.id}>
              <div
                className={`spx-nav-item ${selectedIssueId === iss.id ? "active" : ""}`}
                onClick={() => onSelectIssue(iss.id)}
                style={{ fontWeight: 700 }}
              >
                <div className="spx-nav-dot" />
                ISSUE #{iss.number}
              </div>
              {selectedIssueId === iss.id && iss.pages.map((pg, idx) => (
                <div
                  key={pg.id}
                  className={`spx-nav-item spx-nav-item-sub ${selectedPageId === pg.id ? "active" : ""}`}
                  onClick={() => onSelectPage(pg.id)}
                >
                  <div className="spx-nav-dot" />
                  Page {idx + 1} · {pg.panels.length} panels
                </div>
              ))}
            </div>
          ))}
        </>
      )}

      <div className="spx-nav-footer">
        {activeDraft && (
          <div className="spx-draft-indicator">
            <span style={{ color: "#00ffc8", marginRight: 4 }}>⬡</span>
            <span>{activeDraft.name}</span>
          </div>
        )}
      </div>
    </div>
  );
}
