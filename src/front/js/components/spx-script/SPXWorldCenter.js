// =============================================================================
// SPXWorldCenter.js — World Mode Center Tab Switcher
// Location: src/front/js/components/spx-script/SPXWorldCenter.js
//
// Tabs: MAP · TIMELINE · RELATIONSHIPS · MOODBOARD
// =============================================================================

import React, { useState } from "react";
import SPXWorldMap from "./SPXWorldMap";
import SPXTimeline from "./SPXTimeline";
import SPXRelationshipWeb from "./SPXRelationshipWeb";
import SPXMoodboard from "./SPXMoodboard";

const TABS = [
  { id: "map",           label: "🗺 MAP" },
  { id: "timeline",      label: "📅 TIMELINE" },
  { id: "relationships", label: "🕸 RELATIONSHIPS" },
  { id: "moodboard",     label: "🎨 MOODBOARD" },
];

export default function SPXWorldCenter({
  worldData,
  mapPins,
  setMapPins,
  selectedEntry,
  onSelectEntry,
}) {
  const [activeTab, setActiveTab] = useState("map");

  return (
    <div className="spx-script-center">
      {/* World tab bar */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 0,
        background: "#0a0a18",
        borderBottom: "2px solid #1a2a3a",
        padding: "0 8px",
        flexShrink: 0,
      }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: "8px 18px",
              background: activeTab === tab.id ? "#0d1f35" : "transparent",
              color: activeTab === tab.id ? "#FF6600" : "#5a7088",
              border: "none",
              borderBottom: activeTab === tab.id ? "2px solid #FF6600" : "2px solid transparent",
              cursor: "pointer",
              fontSize: "0.72rem",
              fontWeight: activeTab === tab.id ? 700 : 400,
              letterSpacing: "0.4px",
              whiteSpace: "nowrap",
              fontFamily: "'Rajdhani', 'JetBrains Mono', monospace",
              transition: "all 0.12s",
            }}
          >
            {tab.label}
          </button>
        ))}
        <div style={{ marginLeft: "auto", paddingRight: 12, fontSize: 10, color: "#3a5070", fontFamily: "monospace" }}>
          WORLD MODE
        </div>
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {activeTab === "map" && (
          <SPXWorldMap
            worldData={worldData}
            mapPins={mapPins}
            setMapPins={setMapPins}
            onSelectEntry={onSelectEntry}
          />
        )}
        {activeTab === "timeline" && (
          <SPXTimeline
            worldData={worldData}
            onSelectEntry={onSelectEntry}
          />
        )}
        {activeTab === "relationships" && (
          <SPXRelationshipWeb
            worldData={worldData}
            onSelectEntry={onSelectEntry}
          />
        )}
        {activeTab === "moodboard" && (
          <SPXMoodboard
            worldData={worldData}
            selectedEntry={selectedEntry}
            onSelectEntry={onSelectEntry}
          />
        )}
      </div>
    </div>
  );
}
