// =============================================================================
// SPXWorldMap.js — Interactive World Map Tab
// =============================================================================
// Location: src/front/js/components/spx-script/SPXWorldMap.js
//
// Features:
//   - Upload any image as a world/location map
//   - Drop pins anywhere on the map
//   - Each pin links to a world entry (character location, scene, faction territory)
//   - Click pin → opens that entry's Bible sheet
//   - Pin types: Character · Location · Scene · Faction · Note
//   - Drag pins to reposition
//   - Zoom + pan the map
// =============================================================================

import React, { useState, useRef, useCallback, useEffect } from "react";

const PIN_TYPES = {
  character: { icon: "👤", color: "#00ffc8" },
  location:  { icon: "📍", color: "#FF6600" },
  scene:     { icon: "🎬", color: "#44aaff" },
  faction:   { icon: "⚔️", color: "#ff4488" },
  note:      { icon: "📝", color: "#ffcc00" },
};

export default function SPXWorldMap({ worldData, mapPins, setMapPins, onSelectEntry }) {
  const [mapImage, setMapImage] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [draggingPin, setDraggingPin] = useState(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [showPinMenu, setShowPinMenu] = useState(null); // { x, y } map coords
  const [editingPin, setEditingPin] = useState(null);
  const [newPinType, setNewPinType] = useState("location");
  const [newPinLabel, setNewPinLabel] = useState("");
  const [newPinEntry, setNewPinEntry] = useState("");
  const mapRef = useRef(null);
  const fileInputRef = useRef(null);

  const allEntries = [
    ...(worldData.characters || []).map(e => ({ ...e, section: "characters" })),
    ...(worldData.locations || []).map(e => ({ ...e, section: "locations" })),
    ...(worldData.factions || []).map(e => ({ ...e, section: "factions" })),
    ...(worldData.lore || []).map(e => ({ ...e, section: "lore" })),
  ];

  const handleMapUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setMapImage(ev.target.result);
    reader.readAsDataURL(file);
  };

  const getMapCoords = useCallback((e) => {
    if (!mapRef.current) return { x: 0, y: 0 };
    const rect = mapRef.current.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left - pan.x) / zoom / rect.width) * 100,
      y: ((e.clientY - rect.top - pan.y) / zoom / rect.height) * 100,
    };
  }, [pan, zoom]);

  const handleMapClick = useCallback((e) => {
    if (draggingPin || isPanning) return;
    if (e.target.closest(".spx-map-pin")) return;
    const coords = getMapCoords(e);
    setShowPinMenu(coords);
    setNewPinLabel("");
    setNewPinEntry("");
  }, [draggingPin, isPanning, getMapCoords]);

  const addPin = () => {
    if (!showPinMenu) return;
    const pin = {
      id: Date.now(),
      x: showPinMenu.x,
      y: showPinMenu.y,
      type: newPinType,
      label: newPinLabel || PIN_TYPES[newPinType].icon,
      entryId: newPinEntry || null,
    };
    setMapPins(prev => [...prev, pin]);
    setShowPinMenu(null);
  };

  const deletePin = (pinId) => {
    setMapPins(prev => prev.filter(p => p.id !== pinId));
    setEditingPin(null);
  };

  const handlePinClick = (e, pin) => {
    e.stopPropagation();
    if (pin.entryId) {
      const entry = allEntries.find(en => en.id === parseInt(pin.entryId));
      if (entry) onSelectEntry && onSelectEntry(entry);
    } else {
      setEditingPin(editingPin?.id === pin.id ? null : pin);
    }
  };

  const handleWheel = (e) => {
    e.preventDefault();
    setZoom(prev => Math.max(0.3, Math.min(4, prev - e.deltaY * 0.001)));
  };

  const handleMouseDown = (e) => {
    if (e.target.closest(".spx-map-pin") || e.target.closest(".spx-map-menu")) return;
    setIsPanning(true);
    setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e) => {
    if (isPanning) {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
    }
  };

  const handleMouseUp = () => { setIsPanning(false); };

  return (
    <div className="spx-script-center" style={{ position: "relative", overflow: "hidden", background: "#06060f" }}>
      {/* Toolbar */}
      <div className="spx-script-toolbar">
        <button className="spx-el-btn" onClick={() => fileInputRef.current?.click()}>
          🗺 {mapImage ? "Replace Map" : "Upload Map"}
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleMapUpload} />
        {mapImage && (
          <>
            <div className="spx-toolbar-sep">|</div>
            <span className="spx-toolbar-meta">Click map to add pin</span>
            <div className="spx-toolbar-sep">|</div>
            <span className="spx-toolbar-meta">{mapPins.length} pins</span>
            <div className="spx-toolbar-sep">|</div>
            <button className="spx-el-btn" onClick={() => setZoom(z => Math.min(4, z + 0.2))}>+</button>
            <span className="spx-toolbar-meta" style={{ minWidth: 36 }}>{Math.round(zoom * 100)}%</span>
            <button className="spx-el-btn" onClick={() => setZoom(z => Math.max(0.3, z - 0.2))}>−</button>
            <button className="spx-el-btn" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}>Reset</button>
          </>
        )}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          {Object.entries(PIN_TYPES).map(([type, cfg]) => (
            <span key={type} style={{ fontSize: 11, color: cfg.color, cursor: "pointer" }} title={type} onClick={() => setNewPinType(type)}>
              {cfg.icon} {type}
            </span>
          ))}
        </div>
      </div>

      {/* Map area */}
      {!mapImage ? (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 14, color: "#5a7088" }}>
          <div style={{ fontSize: 48, opacity: 0.15 }}>🗺</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#8888aa" }}>No map uploaded yet</div>
          <div style={{ fontSize: 12, lineHeight: 1.8, textAlign: "center", maxWidth: 300 }}>
            Upload any image as your world map.<br />
            Add interactive pins linked to your characters, locations, scenes, and factions.
          </div>
          <button className="spx-gen-btn" style={{ maxWidth: 200 }} onClick={() => fileInputRef.current?.click()}>
            Upload Map Image
          </button>
        </div>
      ) : (
        <div
          style={{ flex: 1, position: "relative", overflow: "hidden", cursor: isPanning ? "grabbing" : "crosshair" }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          onClick={handleMapClick}
        >
          {/* Map image */}
          <div
            ref={mapRef}
            style={{
              position: "absolute",
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: "0 0",
              userSelect: "none",
            }}
          >
            <img
              src={mapImage}
              alt="World map"
              style={{ display: "block", maxWidth: "100%", userSelect: "none", pointerEvents: "none" }}
              draggable={false}
            />

            {/* Pins */}
            {mapPins.map((pin) => {
              const cfg = PIN_TYPES[pin.type] || PIN_TYPES.note;
              const linkedEntry = pin.entryId ? allEntries.find(e => e.id === parseInt(pin.entryId)) : null;
              return (
                <div
                  key={pin.id}
                  className="spx-map-pin"
                  style={{
                    position: "absolute",
                    left: `${pin.x}%`,
                    top: `${pin.y}%`,
                    transform: "translate(-50%, -100%)",
                    cursor: "pointer",
                    zIndex: 10,
                    filter: editingPin?.id === pin.id ? "brightness(1.5)" : "none",
                  }}
                  onClick={(e) => handlePinClick(e, pin)}
                  title={linkedEntry ? linkedEntry.name : pin.label}
                >
                  <div style={{
                    background: cfg.color,
                    color: "#000",
                    borderRadius: "50% 50% 50% 0",
                    transform: "rotate(-45deg)",
                    width: 28, height: 28,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    boxShadow: `0 2px 8px ${cfg.color}66`,
                    fontSize: 13,
                  }}>
                    <span style={{ transform: "rotate(45deg)" }}>{cfg.icon}</span>
                  </div>
                  <div style={{
                    position: "absolute",
                    bottom: -18,
                    left: "50%",
                    transform: "translateX(-50%)",
                    fontSize: 9,
                    color: cfg.color,
                    whiteSpace: "nowrap",
                    fontWeight: 700,
                    textShadow: "0 1px 3px rgba(0,0,0,0.8)",
                  }}>
                    {linkedEntry ? linkedEntry.name : pin.label}
                  </div>

                  {/* Pin edit popup */}
                  {editingPin?.id === pin.id && (
                    <div className="spx-map-menu" style={{
                      position: "absolute",
                      bottom: 36,
                      left: "50%",
                      transform: "translateX(-50%)",
                      background: "#0d1a2e",
                      border: "1px solid rgba(255,255,255,0.13)",
                      borderRadius: 6,
                      padding: 10,
                      minWidth: 160,
                      zIndex: 20,
                      boxShadow: "0 4px 20px rgba(0,0,0,0.6)",
                    }} onClick={e => e.stopPropagation()}>
                      <div style={{ fontSize: 11, color: "#8888aa", marginBottom: 6 }}>
                        {linkedEntry ? linkedEntry.name : pin.label}
                      </div>
                      {linkedEntry && (
                        <button style={{ width: "100%", padding: "4px 8px", marginBottom: 4, borderRadius: 3, border: "1px solid rgba(0,255,200,0.3)", background: "rgba(0,255,200,0.1)", color: "#00ffc8", cursor: "pointer", fontFamily: "inherit", fontSize: 11 }}
                          onClick={() => { onSelectEntry && onSelectEntry(linkedEntry); setEditingPin(null); }}>
                          Open Bible Sheet
                        </button>
                      )}
                      <button style={{ width: "100%", padding: "4px 8px", borderRadius: 3, border: "1px solid rgba(255,68,68,0.3)", background: "transparent", color: "#ff4444", cursor: "pointer", fontFamily: "inherit", fontSize: 11 }}
                        onClick={() => deletePin(pin.id)}>
                        Delete Pin
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Add pin menu */}
          {showPinMenu && (
            <div
              className="spx-map-menu"
              style={{
                position: "absolute",
                left: Math.min(window.innerWidth - 220, (showPinMenu.x / 100) * (mapRef.current?.offsetWidth || 600) * zoom + pan.x + 10),
                top: Math.min(window.innerHeight - 260, (showPinMenu.y / 100) * (mapRef.current?.offsetHeight || 400) * zoom + pan.y),
                background: "#0d1a2e",
                border: "1px solid rgba(255,255,255,0.13)",
                borderRadius: 6,
                padding: 12,
                width: 200,
                zIndex: 30,
                boxShadow: "0 4px 20px rgba(0,0,0,0.7)",
              }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: "#5a7088", textTransform: "uppercase", marginBottom: 8 }}>Add Pin</div>
              <div style={{ marginBottom: 8 }}>
                <label style={{ fontSize: 10, color: "#8888aa", display: "block", marginBottom: 3 }}>Type</label>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {Object.entries(PIN_TYPES).map(([type, cfg]) => (
                    <button key={type}
                      style={{ padding: "3px 8px", borderRadius: 3, border: `1px solid ${newPinType === type ? cfg.color : "rgba(255,255,255,0.1)"}`, background: newPinType === type ? `${cfg.color}22` : "transparent", color: newPinType === type ? cfg.color : "#8888aa", cursor: "pointer", fontSize: 10, fontFamily: "inherit" }}
                      onClick={() => setNewPinType(type)}
                    >{cfg.icon}</button>
                  ))}
                </div>
              </div>
              <div style={{ marginBottom: 8 }}>
                <label style={{ fontSize: 10, color: "#8888aa", display: "block", marginBottom: 3 }}>Label</label>
                <input value={newPinLabel} onChange={e => setNewPinLabel(e.target.value)} placeholder="Pin label..." style={{ width: "100%", background: "#111122", border: "1px solid rgba(255,255,255,0.1)", color: "#dde0f0", padding: "4px 6px", borderRadius: 3, fontFamily: "inherit", fontSize: 11, outline: "none", boxSizing: "border-box" }} />
              </div>
              <div style={{ marginBottom: 10 }}>
                <label style={{ fontSize: 10, color: "#8888aa", display: "block", marginBottom: 3 }}>Link to Entry</label>
                <select value={newPinEntry} onChange={e => setNewPinEntry(e.target.value)} style={{ width: "100%", background: "#111122", border: "1px solid rgba(255,255,255,0.1)", color: "#dde0f0", padding: "4px 6px", borderRadius: 3, fontFamily: "inherit", fontSize: 11, outline: "none" }}>
                  <option value="">None</option>
                  {allEntries.map(e => <option key={e.id} value={e.id}>{e.name} ({e.section})</option>)}
                </select>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={addPin} style={{ flex: 1, padding: "6px", borderRadius: 4, border: "none", background: "#00ffc8", color: "#000", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", fontSize: 12 }}>Add Pin</button>
                <button onClick={() => setShowPinMenu(null)} style={{ padding: "6px 10px", borderRadius: 4, border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "#8888aa", cursor: "pointer", fontFamily: "inherit", fontSize: 12 }}>✕</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
