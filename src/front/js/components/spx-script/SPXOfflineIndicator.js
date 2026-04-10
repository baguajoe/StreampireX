/**
 * SPXOfflineIndicator.js
 * Shows save status, offline mode, sync queue, and last saved time
 * Sits in the topbar next to the credits badge
 */

import React, { useState } from "react";

export default function SPXOfflineIndicator({
  isOffline,
  saveStatus,
  lastSaved,
  syncQueue,
  forceSave,
  clearLocal,
  listLocalScripts,
  onLoadLocalScript,
}) {
  const [showMenu, setShowMenu] = useState(false);
  const [localScripts, setLocalScripts] = useState([]);

  const handleShowMenu = () => {
    setShowMenu(!showMenu);
    if (!showMenu) {
      setLocalScripts(listLocalScripts());
    }
  };

  const label = () => {
    if (isOffline) return "● OFFLINE";
    switch (saveStatus) {
      case "saving": return "↑ Saving...";
      case "saved": return "✓ Saved";
      case "error": return "⚠ Save error";
      case "offline": return "● Offline";
      default: return "✓ Auto-save on";
    }
  };

  const color = () => {
    if (isOffline || saveStatus === "offline") return "#FF6600";
    if (saveStatus === "error") return "#ff4444";
    if (saveStatus === "saving") return "#8888aa";
    return "#00ffc8";
  };

  const formatSaved = (date) => {
    if (!date) return "";
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);
    if (diff < 5) return "just now";
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return date.toLocaleTimeString();
  };

  return (
    <div style={{ position: "relative" }}>
      <button
        className="spx-offline-indicator"
        style={{ color: color() }}
        onClick={handleShowMenu}
        title={lastSaved ? `Last saved: ${formatSaved(lastSaved)}` : "Auto-save status"}
      >
        {label()}
        {syncQueue?.length > 0 && (
          <span className="spx-offline-queue-badge">{syncQueue.length}</span>
        )}
      </button>

      {showMenu && (
        <div className="spx-offline-menu">
          <div className="spx-offline-menu-header">
            <span>LOCAL STORAGE</span>
            <button className="spx-comments-close" onClick={() => setShowMenu(false)}>✕</button>
          </div>

          <div className="spx-offline-menu-section">
            <div className="spx-offline-status-row">
              <span className="spx-offline-status-label">Status</span>
              <span style={{ color: color(), fontSize: 11, fontWeight: 700 }}>
                {isOffline ? "Offline — changes saved locally" : "Online — syncing to cloud"}
              </span>
            </div>
            {lastSaved && (
              <div className="spx-offline-status-row">
                <span className="spx-offline-status-label">Last saved</span>
                <span style={{ fontSize: 11, color: "#8888aa" }}>{formatSaved(lastSaved)}</span>
              </div>
            )}
            {syncQueue?.length > 0 && (
              <div className="spx-offline-status-row">
                <span className="spx-offline-status-label">Pending sync</span>
                <span style={{ fontSize: 11, color: "#FF6600" }}>{syncQueue.length} changes</span>
              </div>
            )}
          </div>

          <div className="spx-offline-menu-section">
            <button className="spx-offline-action-btn" onClick={() => { forceSave(); setShowMenu(false); }}>
              ↑ Force Save Now
            </button>
          </div>

          {localScripts.length > 0 && (
            <div className="spx-offline-menu-section">
              <div className="spx-offline-section-label">LOCALLY SAVED SCRIPTS</div>
              {localScripts.slice(0, 5).map((s) => (
                <div key={s.scriptId} className="spx-offline-local-script" onClick={() => { onLoadLocalScript && onLoadLocalScript(s); setShowMenu(false); }}>
                  <span className="spx-offline-local-title">{s.title || "Untitled"}</span>
                  <span className="spx-offline-local-date">{formatSaved(new Date(s.savedAt))}</span>
                </div>
              ))}
            </div>
          )}

          <div className="spx-offline-menu-section">
            <button
              className="spx-offline-action-btn danger"
              onClick={() => {
                if (window.confirm("Clear all local script data? This cannot be undone.")) {
                  clearLocal();
                  setShowMenu(false);
                }
              }}
            >
              ✕ Clear Local Data
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
