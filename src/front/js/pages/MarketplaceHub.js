// =============================================================================
// MarketplaceHub.js - Unified Marketplace (MC-3)
// =============================================================================
// Location: src/front/js/pages/MarketplaceHub.js
// Route:    /marketplace
//
// Replaces these sidebar entries with ONE page + tabs:
//   /music-store               -> Music tab (embeds MusicStore which has its
//                                 own internal Beats/Stems sub-tabs)
//   /creator-sample-marketplace -> Samples tab (sample packs)
//   /wam-plugin-store          -> Plugins tab (VST/WAM plugins)
//
// Also preserves old routes in layout.js by redirecting:
//   /music-store -> /marketplace?tab=music
//   /beat-store  -> /marketplace?tab=music
//   (MusicStore handles beats/stems via its own internal tabs)
//
// Tab routing: /marketplace?tab=music | samples | plugins
// =============================================================================

import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import MusicStore from "./MusicStore";
import CreatorSampleMarketplace from "./CreatorSampleMarketplace";
import WAMPluginStore from "./WAMPluginStore";

const TABS = [
  {
    id:    "music",
    icon:  "🎹",
    label: "Music",
    hint:  "Beats, stems, tracks",
    color: "#00ffc8",
  },
  {
    id:    "samples",
    icon:  "🎛️",
    label: "Samples",
    hint:  "Sample packs & loops",
    color: "#FF6600",
  },
  {
    id:    "plugins",
    icon:  "🔌",
    label: "Plugins",
    hint:  "VST, WAM, instruments",
    color: "#a78bfa",
  },
];

const MarketplaceHub = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const getTabFromUrl = () => {
    const params = new URLSearchParams(location.search);
    const t = params.get("tab");
    return TABS.find((x) => x.id === t) ? t : "music";
  };

  const [activeTab, setActiveTab] = useState(getTabFromUrl);

  useEffect(() => {
    setActiveTab(getTabFromUrl());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  const handleTabClick = (tabId) => {
    setActiveTab(tabId);
    navigate(`/marketplace?tab=${tabId}`, { replace: false });
  };

  const active = TABS.find((t) => t.id === activeTab) || TABS[0];

  return (
    <div style={{
      minHeight: "100vh",
      background: "#06060f",
      color: "#e0e0e0",
      fontFamily: "JetBrains Mono, monospace",
    }}>
      {/* Tab bar */}
      <div style={{
        display: "flex",
        gap: 0,
        padding: "16px 24px 0",
        background: "#07090f",
        borderBottom: "1px solid #1a1a2e",
        position: "sticky",
        top: 0,
        zIndex: 10,
      }}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              style={{
                background: "transparent",
                border: "none",
                borderBottom: isActive
                  ? `3px solid ${tab.color}`
                  : "3px solid transparent",
                padding: "12px 20px 14px",
                cursor: "pointer",
                color: isActive ? tab.color : "#888",
                fontFamily: "inherit",
                fontSize: 13,
                fontWeight: isActive ? 700 : 500,
                transition: "all 0.15s",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 2,
                minWidth: 110,
              }}
            >
              <div style={{ fontSize: 20 }}>{tab.icon}</div>
              <div>{tab.label}</div>
              <div style={{
                fontSize: 9,
                color: isActive ? tab.color : "#555",
                opacity: 0.85,
                fontWeight: 400,
              }}>{tab.hint}</div>
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div style={{ padding: 0 }}>
        {activeTab === "music" && <MusicStore />}
        {activeTab === "samples" && <CreatorSampleMarketplace />}
        {activeTab === "plugins" && <WAMPluginStore />}
      </div>
    </div>
  );
};

export default MarketplaceHub;
