// =============================================================================
// SPXBiblePanel.js — World Bible Right Panel
// =============================================================================
// Location: src/front/js/components/spx-script/SPXBiblePanel.js
//
// Shows in World Mode right panel.
// Displays and edits character/location/faction/lore sheets.
// Links to SPX Canvas artwork and SPX 3D models.
// =============================================================================

import React, { useState } from "react";

const TRAIT_COLORS = ["#00ffc8", "#FF6600", "#44aaff", "#ff4488", "#ffcc00", "#aa44ff"];

const SECTION_FIELDS = {
  characters: [
    { key: "role", label: "Role", type: "text", placeholder: "Protagonist, Antagonist, Supporting..." },
    { key: "age", label: "Age", type: "text", placeholder: "e.g. 28" },
    { key: "appearance", label: "Appearance", type: "textarea", placeholder: "Physical description..." },
    { key: "bio", label: "Backstory", type: "textarea", placeholder: "Background and history..." },
    { key: "motivation", label: "Motivation", type: "textarea", placeholder: "What drives them?" },
    { key: "arc", label: "Character Arc", type: "textarea", placeholder: "How do they change?" },
    { key: "voice", label: "Voice / Speech", type: "text", placeholder: "How they talk, vocabulary, accent..." },
  ],
  locations: [
    { key: "type", label: "Type", type: "text", placeholder: "City, Forest, Building, Planet..." },
    { key: "description", label: "Description", type: "textarea", placeholder: "What does it look, feel, smell like?" },
    { key: "history", label: "History", type: "textarea", placeholder: "How did this place come to be?" },
    { key: "significance", label: "Significance", type: "text", placeholder: "Why does this place matter to the story?" },
    { key: "climate", label: "Climate / Atmosphere", type: "text", placeholder: "Weather, mood, tone..." },
  ],
  factions: [
    { key: "type", label: "Type", type: "text", placeholder: "Government, Gang, Guild, Religion..." },
    { key: "goal", label: "Goal", type: "textarea", placeholder: "What does this faction want?" },
    { key: "methods", label: "Methods", type: "text", placeholder: "How do they operate?" },
    { key: "leader", label: "Leader", type: "text", placeholder: "Who leads them?" },
    { key: "rivals", label: "Rivals", type: "text", placeholder: "Who opposes them?" },
    { key: "history", label: "History", type: "textarea", placeholder: "How did they form?" },
  ],
  lore: [
    { key: "category", label: "Category", type: "text", placeholder: "Magic, Technology, Culture, History..." },
    { key: "summary", label: "Summary", type: "textarea", placeholder: "Brief overview..." },
    { key: "details", label: "Full Entry", type: "textarea", placeholder: "Detailed wiki-style entry..." },
    { key: "related", label: "Related Entries", type: "text", placeholder: "Other lore this connects to..." },
  ],
};

export default function SPXBiblePanel({
  selectedEntry,
  worldData,
  setWorldData,
  onOpenCanvas,
  on3DModel,
}) {
  const [newTrait, setNewTrait] = useState("");
  const [newConnection, setNewConnection] = useState("");

  if (!selectedEntry) {
    return (
      <div className="spx-right-panel">
        <div style={{ padding: "20px 14px", textAlign: "center" }}>
          <div style={{ fontSize: 28, marginBottom: 10, opacity: 0.2 }}>📖</div>
          <div style={{ fontSize: 12, color: "#5a7088", lineHeight: 1.8 }}>
            Select an entry from the World nav to view and edit its bible sheet.
          </div>
          <div style={{ fontSize: 11, color: "#3a5070", marginTop: 12, lineHeight: 1.8 }}>
            Characters · Locations · Factions · Lore
          </div>
        </div>
      </div>
    );
  }

  const section = selectedEntry.section;
  const fields = SECTION_FIELDS[section] || [];

  const updateEntry = (key, value) => {
    setWorldData((prev) => ({
      ...prev,
      [section]: prev[section].map((e) =>
        e.id === selectedEntry.id ? { ...e, [key]: value } : e
      ),
    }));
  };

  const addTrait = () => {
    if (!newTrait.trim()) return;
    const traits = [...(selectedEntry.traits || []), newTrait.trim()];
    updateEntry("traits", traits);
    setNewTrait("");
  };

  const removeTrait = (idx) => {
    const traits = [...(selectedEntry.traits || [])];
    traits.splice(idx, 1);
    updateEntry("traits", traits);
  };

  const addConnection = () => {
    if (!newConnection.trim()) return;
    const connections = [...(selectedEntry.connections || []), newConnection.trim()];
    updateEntry("connections", connections);
    setNewConnection("");
  };

  const removeConnection = (idx) => {
    const connections = [...(selectedEntry.connections || [])];
    connections.splice(idx, 1);
    updateEntry("connections", connections);
  };

  const deleteEntry = () => {
    if (!window.confirm(`Delete "${selectedEntry.name}"?`)) return;
    setWorldData((prev) => ({
      ...prev,
      [section]: prev[section].filter((e) => e.id !== selectedEntry.id),
    }));
  };

  const S = {
    label: { fontSize: 10, fontWeight: 700, letterSpacing: 0.8, color: "#5a7088", textTransform: "uppercase", display: "block", marginBottom: 4 },
    input: { width: "100%", background: "#111122", border: "1px solid rgba(255,255,255,0.1)", color: "#dde0f0", padding: "5px 8px", borderRadius: 3, fontFamily: "'Rajdhani', monospace", fontSize: 11, outline: "none", boxSizing: "border-box" },
    textarea: { width: "100%", background: "#111122", border: "1px solid rgba(255,255,255,0.1)", color: "#dde0f0", padding: "5px 8px", borderRadius: 3, fontFamily: "'Rajdhani', monospace", fontSize: 11, outline: "none", resize: "none", minHeight: 52, boxSizing: "border-box" },
    section: { marginBottom: 12 },
    btnSm: { padding: "2px 8px", borderRadius: 3, border: "1px solid rgba(255,255,255,0.13)", background: "transparent", color: "#8888aa", cursor: "pointer", fontFamily: "inherit", fontSize: 10, fontWeight: 600 },
  };

  const SECTION_ICONS = { characters: "👤", locations: "📍", factions: "⚔️", lore: "📖" };

  return (
    <div className="spx-right-panel" style={{ display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ padding: "10px 12px", borderBottom: "1px solid rgba(255,255,255,0.07)", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 14 }}>{SECTION_ICONS[section]}</span>
            <input
              value={selectedEntry.name}
              onChange={(e) => updateEntry("name", e.target.value)}
              style={{ ...S.input, fontSize: 13, fontWeight: 700, background: "transparent", border: "none", borderBottom: "1px solid rgba(255,255,255,0.1)", borderRadius: 0, padding: "2px 4px", width: 140 }}
            />
          </div>
          <button style={{ ...S.btnSm, color: "#ff4444", borderColor: "rgba(255,68,68,0.25)" }} onClick={deleteEntry} title="Delete">✕</button>
        </div>
        <div style={{ fontSize: 10, color: "#5a7088", textTransform: "uppercase", letterSpacing: 0.8 }}>{section}</div>
      </div>

      {/* Artwork / 3D link */}
      <div style={{ padding: "8px 12px", borderBottom: "1px solid rgba(255,255,255,0.07)", flexShrink: 0 }}>
        <div style={{ display: "flex", gap: 6 }}>
          {selectedEntry.artwork ? (
            <img src={selectedEntry.artwork} alt="artwork" style={{ width: 60, height: 60, objectFit: "cover", borderRadius: 4, border: "1px solid rgba(255,255,255,0.1)" }} />
          ) : (
            <div style={{ width: 60, height: 60, background: "#111122", borderRadius: 4, border: "1px dashed rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, color: "#3a5070" }}>🖼</div>
          )}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
            <button style={{ ...S.btnSm, textAlign: "left" }} onClick={() => onOpenCanvas && onOpenCanvas(selectedEntry)}>↗ Open in Canvas</button>
            <button style={{ ...S.btnSm, textAlign: "left" }} onClick={() => on3DModel && on3DModel(selectedEntry)}>↗ Open in 3D Mesh</button>
            <label style={{ ...S.btnSm, cursor: "pointer", display: "block" }}>
              📎 Upload Art
              <input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (ev) => updateEntry("artwork", ev.target.result);
                reader.readAsDataURL(file);
              }} />
            </label>
          </div>
        </div>
      </div>

      {/* Fields */}
      <div className="spx-rp-body">
        {/* Traits (characters only) */}
        {section === "characters" && (
          <div style={S.section}>
            <span style={S.label}>Traits</span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 6 }}>
              {(selectedEntry.traits || []).map((trait, i) => (
                <div key={i} style={{ padding: "2px 8px", borderRadius: 3, background: `${TRAIT_COLORS[i % TRAIT_COLORS.length]}1a`, border: `1px solid ${TRAIT_COLORS[i % TRAIT_COLORS.length]}44`, fontSize: 10, color: TRAIT_COLORS[i % TRAIT_COLORS.length], display: "flex", alignItems: "center", gap: 4 }}>
                  {trait}
                  <span style={{ cursor: "pointer", opacity: 0.5 }} onClick={() => removeTrait(i)}>✕</span>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              <input value={newTrait} onChange={(e) => setNewTrait(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addTrait()} placeholder="Add trait..." style={{ ...S.input, flex: 1 }} />
              <button onClick={addTrait} style={{ ...S.btnSm, color: "#00ffc8", borderColor: "rgba(0,255,200,0.3)" }}>+</button>
            </div>
          </div>
        )}

        {/* Dynamic fields */}
        {fields.map((field) => (
          <div key={field.key} style={S.section}>
            <span style={S.label}>{field.label}</span>
            {field.type === "textarea" ? (
              <textarea
                value={selectedEntry[field.key] || ""}
                onChange={(e) => updateEntry(field.key, e.target.value)}
                placeholder={field.placeholder}
                style={S.textarea}
                rows={3}
              />
            ) : (
              <input
                type="text"
                value={selectedEntry[field.key] || ""}
                onChange={(e) => updateEntry(field.key, e.target.value)}
                placeholder={field.placeholder}
                style={S.input}
              />
            )}
          </div>
        ))}

        {/* Connections */}
        <div style={S.section}>
          <span style={S.label}>Connections</span>
          <div style={{ display: "flex", flexDirection: "column", gap: 3, marginBottom: 6 }}>
            {(selectedEntry.connections || []).map((conn, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, padding: "3px 0", borderBottom: "1px solid rgba(255,255,255,0.05)", fontSize: 11, color: "#8888aa" }}>
                <span style={{ flex: 1 }}>{conn}</span>
                <span style={{ cursor: "pointer", color: "#5a7088", fontSize: 10 }} onClick={() => removeConnection(i)}>✕</span>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            <input value={newConnection} onChange={(e) => setNewConnection(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addConnection()} placeholder="e.g. MARCUS — brother" style={{ ...S.input, flex: 1 }} />
            <button onClick={addConnection} style={{ ...S.btnSm, color: "#00ffc8", borderColor: "rgba(0,255,200,0.3)" }}>+</button>
          </div>
        </div>

        {/* Notes */}
        <div style={S.section}>
          <span style={S.label}>Notes</span>
          <textarea
            value={selectedEntry.notes || ""}
            onChange={(e) => updateEntry("notes", e.target.value)}
            placeholder="Anything else worth noting..."
            style={S.textarea}
            rows={3}
          />
        </div>
      </div>
    </div>
  );
}
