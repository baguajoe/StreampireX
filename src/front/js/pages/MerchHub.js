// =============================================================================
// MerchHub.js - Unified Merch (Buy + Design) (MC-3)
// =============================================================================
// Location: src/front/js/pages/MerchHub.js
// Route:    /merch
//
// Dual-mode tabbed page:
//   Buy tab    -> embeds MerchStore (Printful POD products)
//   Design tab -> embeds MerchDesigner (create your own merch)
//
// Tab routing: /merch?tab=buy | design (default 'buy')
//
// Preserves old routes via redirects in layout.js:
//   /merch-store    -> /merch?tab=buy
//   /merch-designer -> /merch?tab=design
// =============================================================================

import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import MerchStore from "./MerchStore";
import MerchDesigner from "./MerchDesigner";

const TABS = [
  {
    id:    "buy",
    icon:  "👕",
    label: "Buy",
    hint:  "Browse merch",
    color: "#00ffc8",
  },
  {
    id:    "design",
    icon:  "🎨",
    label: "Design",
    hint:  "Create your own",
    color: "#FF6600",
  },
];

const MerchHub = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const getTabFromUrl = () => {
    const params = new URLSearchParams(location.search);
    const t = params.get("tab");
    return TABS.find((x) => x.id === t) ? t : "buy";
  };

  const [activeTab, setActiveTab] = useState(getTabFromUrl);

  useEffect(() => {
    setActiveTab(getTabFromUrl());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  const handleTabClick = (tabId) => {
    setActiveTab(tabId);
    navigate(`/merch?tab=${tabId}`, { replace: false });
  };

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
                minWidth: 130,
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
        {activeTab === "buy" && <MerchStore />}
        {activeTab === "design" && <MerchDesigner />}
      </div>
    </div>
  );
};

export default MerchHub;
