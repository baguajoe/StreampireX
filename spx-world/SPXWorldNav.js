// =============================================================================
// SPXWorldNav.js — World Mode Left Navigation
// =============================================================================
// Location: src/front/js/components/spx-script/SPXWorldNav.js
//
// Shows when user switches to WORLD MODE in SPX Script.
// Sections: Characters · Locations · Factions · Lore
// Click any entry → opens its sheet in the right panel Bible tab
// =============================================================================

import React, { useState } from "react";

const SECTION_ICONS = {
  characters: "👤",
  locations: "📍",
  factions: "⚔️",
  lore: "📖",
};

export default function SPXWorldNav({
  worldData,
  setWorldData,
  selectedEntry,
  setSelectedEntry,
  onSelectEntry,
}) {
  const [openSections, setOpenSections] = useState(["characters", "locations"]);
  const [addingTo, setAddingTo] = useState(null);
  const [newName, setNewName] = useState("");

  const toggleSection = (section) => {
    setOpenSections((prev) =>
      prev.includes(section) ? prev.filter((s) => s !== section) : [...prev, section]
    );
  };

  const addEntry = (section) => {
    if (!newName.trim()) return;
    const entry = {
      id: Date.now(),
      name: newName.trim(),
      section,
      bio: "",
      traits: [],
      appearance: "",
      role: "",
      connections: [],
      artwork: null,
      notes: "",
      createdAt: new Date().toISOString(),
    };
    setWorldData((prev) => ({
      ...prev,
      [section]: [...(prev[section] || []), entry],
    }));
    setNewName("");
    setAddingTo(null);
    onSelectEntry && onSelectEntry(entry);
  };

  const sections = [
    { key: "characters", label: "Characters" },
    { key: "locations", label: "Locations" },
    { key: "factions", label: "Factions" },
    { key: "lore", label: "Lore" },
  ];

  return (
    <div className="spx-nav-panel">
      <div style={{ padding: "10px 12px 6px", fontSize: 10, fontWeight: 700, letterSpacing: 1, color: "#5a7088", textTransform: "uppercase" }}>
        World Bible
      </div>

      {sections.map((section) => {
        const entries = worldData[section.key] || [];
        const isOpen = openSections.includes(section.key);

        return (
          <div key={section.key}>
            {/* Section header */}
            <div
              className="spx-nav-item"
              style={{ fontWeight: 700, fontSize: 11, justifyContent: "space-between" }}
              onClick={() => toggleSection(section.key)}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 12 }}>{SECTION_ICONS[section.key]}</span>
                {section.label.toUpperCase()}
                <span style={{ fontSize: 10, color: "#5a7088", marginLeft: 2 }}>({entries.length})</span>
              </div>
              <span style={{ fontSize: 10, color: "#5a7088" }}>{isOpen ? "▲" : "▼"}</span>
            </div>

            {/* Entries */}
            {isOpen && (
              <>
                {entries.map((entry) => (
                  <div
                    key={entry.id}
                    className={`spx-nav-item spx-nav-item-sub ${selectedEntry?.id === entry.id ? "active" : ""}`}
                    onClick={() => { onSelectEntry && onSelectEntry(entry); }}
                  >
                    <div className="spx-nav-dot" />
                    <span style={{ fontSize: 11 }}>{entry.name}</span>
                    {entry.role && (
                      <span style={{ fontSize: 9, color: "#5a7088", marginLeft: "auto" }}>{entry.role.slice(0, 8)}</span>
                    )}
                  </div>
                ))}

                {/* Add entry */}
                {addingTo === section.key ? (
                  <div style={{ padding: "4px 14px", display: "flex", gap: 4 }}>
                    <input
                      autoFocus
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") addEntry(section.key); if (e.key === "Escape") { setAddingTo(null); setNewName(""); } }}
                      placeholder={`New ${section.label.slice(0, -1)}...`}
                      style={{ flex: 1, background: "#111122", border: "1px solid rgba(0,255,200,0.3)", color: "#dde0f0", padding: "3px 6px", borderRadius: 3, fontSize: 11, outline: "none", fontFamily: "inherit" }}
                    />
                    <button onClick={() => addEntry(section.key)} style={{ background: "#00ffc8", border: "none", color: "#000", borderRadius: 3, padding: "2px 6px", cursor: "pointer", fontSize: 11, fontWeight: 700 }}>+</button>
                  </div>
                ) : (
                  <div
                    style={{ padding: "4px 14px 6px 28px", fontSize: 10, color: "#3a5070", cursor: "pointer", transition: "color .1s" }}
                    onClick={() => setAddingTo(section.key)}
                    onMouseEnter={(e) => e.currentTarget.style.color = "#00ffc8"}
                    onMouseLeave={(e) => e.currentTarget.style.color = "#3a5070"}
                  >
                    + Add {section.label.slice(0, -1)}
                  </div>
                )}
              </>
            )}
            <div className="spx-nav-divider" />
          </div>
        );
      })}
    </div>
  );
}
