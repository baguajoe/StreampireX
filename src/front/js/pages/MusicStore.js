// =============================================================================
// MusicStore.js — Unified Music Marketplace
// =============================================================================
// Location: src/front/js/pages/MusicStore.js
// Route:    /music-store
//
// Replaces these 4 sidebar entries with ONE page + tabs:
//   /beats          → Beat Store (browse & buy)
//   /sell-beats     → Sell Beats (upload & manage)
//   /browse-stems   → Stems Store (browse & buy)
//   /sell-stems     → Sell Stems (upload & manage)
//
// Also preserves old routes in layout.js by redirecting:
//   <Route path="/beats"        element={<Navigate to="/music-store" replace />} />
//   <Route path="/sell-beats"   element={<Navigate to="/music-store?tab=sell-beats" replace />} />
//   <Route path="/browse-stems" element={<Navigate to="/music-store?tab=browse-stems" replace />} />
//   <Route path="/sell-stems"   element={<Navigate to="/music-store?tab=sell-stems" replace />} />
//
// Tab routing: /music-store?tab=browse-beats | sell-beats | browse-stems | sell-stems
// =============================================================================

import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

// Import existing page components
import BeatStorePage from "./BeatStorePage";
import SellBeatsPage from "./SellBeatsPage";
import { BrowseStemsPage, SellStemsPage } from "./StemsStore";

// ─────────────────────────────────────────────
// Tab config
// ─────────────────────────────────────────────
const TABS = [
  {
    id:    "browse-beats",
    icon:  "🎹",
    label: "Browse Beats",
    hint:  "Buy & license beats",
    color: "#00ffc8",
  },
  {
    id:    "sell-beats",
    icon:  "💰",
    label: "Sell Beats",
    hint:  "Upload & manage your beats",
    color: "#FF6600",
  },
  {
    id:    "browse-stems",
    icon:  "🎛️",
    label: "Stems Store",
    hint:  "Buy stems & loops",
    color: "#4a9eff",
  },
  {
    id:    "sell-stems",
    icon:  "📤",
    label: "Sell Stems",
    hint:  "Upload & sell stem packs",
    color: "#a78bfa",
  },
];

// ─────────────────────────────────────────────
// MusicStore
// ─────────────────────────────────────────────
const MusicStore = () => {
  const location  = useLocation();
  const navigate  = useNavigate();

  // Read tab from ?tab= query param, default to browse-beats
  const getTabFromUrl = () => {
    const params = new URLSearchParams(location.search);
    const t = params.get("tab");
    return TABS.find((x) => x.id === t) ? t : "browse-beats";
  };

  const [activeTab, setActiveTab] = useState(getTabFromUrl);

  // Keep URL in sync when tab changes
  const switchTab = (tabId) => {
    setActiveTab(tabId);
    navigate(`/music-store?tab=${tabId}`, { replace: true });
  };

  // Sync from URL if user navigates back/forward
  useEffect(() => {
    setActiveTab(getTabFromUrl());
  }, [location.search]);

  const currentTab = TABS.find((t) => t.id === activeTab);

  return (
    <div style={MS.page}>

      {/* ── Page header ── */}
      <div style={MS.header}>
        <div style={MS.headerLeft}>
          <h1 style={MS.title}>🎹 Music Store</h1>
          <p style={MS.subtitle}>Beats, stems & loops — buy, sell, and license in one place</p>
        </div>
        <div style={MS.headerBadges}>
          <span style={MS.badge}>90% creator payout</span>
          <span style={MS.badge}>Instant delivery</span>
          <span style={MS.badge}>All licenses included</span>
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div style={MS.tabBar}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              style={{
                ...MS.tab,
                ...(isActive
                  ? {
                      ...MS.tabActive,
                      borderBottomColor: tab.color,
                      color: tab.color,
                    }
                  : {}),
              }}
              onClick={() => switchTab(tab.id)}
            >
              <span style={MS.tabIcon}>{tab.icon}</span>
              <span style={MS.tabLabel}>{tab.label}</span>
              <span style={MS.tabHint}>{tab.hint}</span>
              {isActive && (
                <span style={{ ...MS.tabIndicator, background: tab.color }} />
              )}
            </button>
          );
        })}
      </div>

      {/* ── Tab content ── */}
      <div style={MS.content}>
        {activeTab === "browse-beats" && <BeatStorePage />}
        {activeTab === "sell-beats"   && <SellBeatsPage />}
        {activeTab === "browse-stems" && <BrowseStemsPage onLoadToDAW={(stem) => {
          // Navigate to Recording Studio with stem pre-loaded
          navigate(`/recording-studio?load_stem=${encodeURIComponent(stem.url)}&stem_name=${encodeURIComponent(stem.title)}`);
        }} />}
        {activeTab === "sell-stems"   && <SellStemsPage />}
      </div>

    </div>
  );
};

// ─────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────
const MS = {
  page: {
    background: "#07090f",
    minHeight: "100vh",
    color: "#e0eaf0",
    fontFamily: "system-ui, sans-serif",
    display: "flex",
    flexDirection: "column",
  },
  header: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    padding: "32px 40px 20px",
    borderBottom: "1px solid rgba(255,255,255,0.05)",
    flexWrap: "wrap",
    gap: "16px",
    background: "linear-gradient(180deg, rgba(0,255,200,0.04) 0%, transparent 100%)",
  },
  headerLeft: {},
  title: {
    fontSize: "2rem",
    fontWeight: "900",
    margin: "0 0 6px",
  },
  subtitle: {
    color: "#5a7080",
    fontSize: "0.95rem",
    margin: 0,
  },
  headerBadges: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
    alignItems: "center",
  },
  badge: {
    padding: "5px 12px",
    background: "rgba(0,255,200,0.08)",
    border: "1px solid rgba(0,255,200,0.18)",
    borderRadius: "999px",
    color: "#00d9aa",
    fontSize: "0.74rem",
    fontWeight: "700",
  },
  tabBar: {
    display: "flex",
    gap: "0",
    padding: "0 32px",
    borderBottom: "1px solid rgba(255,255,255,0.07)",
    overflowX: "auto",
    scrollbarWidth: "none",
    flexShrink: 0,
  },
  tab: {
    position: "relative",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "3px",
    padding: "14px 28px 12px",
    background: "none",
    border: "none",
    borderBottom: "3px solid transparent",
    color: "#4a6070",
    cursor: "pointer",
    transition: "all 0.18s",
    whiteSpace: "nowrap",
    minWidth: "140px",
  },
  tabActive: {
    background: "rgba(255,255,255,0.02)",
  },
  tabIcon: {
    fontSize: "1.3rem",
    lineHeight: 1,
  },
  tabLabel: {
    fontWeight: "800",
    fontSize: "0.88rem",
    letterSpacing: "0.01em",
  },
  tabHint: {
    fontSize: "0.67rem",
    color: "#3a5060",
    fontWeight: "400",
  },
  tabIndicator: {
    position: "absolute",
    bottom: "-3px",
    left: "20%",
    right: "20%",
    height: "3px",
    borderRadius: "2px 2px 0 0",
  },
  content: {
    flex: 1,
  },
};

export default MusicStore;