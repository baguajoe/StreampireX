/**
 * SPXOfflineIndicator.js
 * Shows save status, offline mode, sync queue, and last saved time
 * Sits in the topbar next to the credits badge
 */

import React, { useState } from "react";

export default function SPXOfflineIndicator({
  isOffline,
  saveStatus,
  cloudStatus = "idle",
  cloudError = null,
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

  // Honest two-layer status: local (localStorage) vs cloud (backend draft).
  // Only ever claim "Saved to cloud" on a real 200 from the sync.
  const label = () => {
    if (isOffline) return "● Offline — saved locally";
    switch (cloudStatus) {
      case "syncing": return "↑ Syncing…";
      case "synced": return "✓ Saved to cloud";
      case "error": return "⚠ Cloud save failed — local only";
      case "offline": return "● Offline — saved locally";
      case "unauthenticated": return "✓ Saved locally · sign in to sync";
      default:
        // No cloud attempt yet this session — reflect the local layer only.
        if (saveStatus === "saving") return "↑ Saving…";
        if (saveStatus === "error") return "⚠ Save error";
        if (saveStatus === "saved") return "✓ Saved locally";
        return "✓ Auto-save on";
    }
  };

  const color = () => {
    if (isOffline) return "#FF6600";
    if (cloudStatus === "error" || saveStatus === "error") return "#ff4444";
    if (cloudStatus === "syncing" || saveStatus === "saving") return "#8888aa";
    if (cloudStatus === "unauthenticated" || cloudStatus === "offline") return "#FF6600";
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
                {isOffline ? "Offline — saved locally"
                  : cloudStatus === "synced" ? "Synced to cloud"
                  : cloudStatus === "syncing" ? "Syncing to cloud…"
                  : cloudStatus === "error" ? "Cloud sync failed — saved locally only"
                  : cloudStatus === "unauthenticated" ? "Saved locally — sign in to back up to cloud"
                  : "Saved locally"}
              </span>
            </div>
            {cloudStatus === "error" && cloudError && (
              <div className="spx-offline-status-row">
                <span className="spx-offline-status-label">Cloud error</span>
                <span style={{ fontSize: 11, color: "#ff4444" }}>{cloudError}</span>
              </div>
            )}
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
