// =============================================================================
// SPXMoodboard.js — Character / Location Moodboard
// Location: src/front/js/components/spx-script/SPXMoodboard.js
// =============================================================================
import React, { useState, useRef } from "react";

const LAYOUTS = [
  { id: "grid", label: "Grid" },
  { id: "masonry", label: "Masonry" },
  { id: "freeform", label: "Freeform" },
];

export default function SPXMoodboard({ worldData, selectedEntry, onSelectEntry }) {
  const [boards, setBoards] = useState({}); // entryId → [{ id, src, x, y, w, h, caption, rotation }]
  const [activeBoard, setActiveBoard] = useState(null); // entryId
  const [layout, setLayout] = useState("grid");
  const [draggingImg, setDraggingImg] = useState(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [selectedImg, setSelectedImg] = useState(null);
  const [urlInput, setUrlInput] = useState("");
  const fileInputRef = useRef(null);
  const boardRef = useRef(null);

  const allEntries = [
    ...(worldData.characters || []).map(e => ({ ...e, section: "characters" })),
    ...(worldData.locations || []).map(e => ({ ...e, section: "locations" })),
    ...(worldData.factions || []).map(e => ({ ...e, section: "factions" })),
  ];

  const currentId = activeBoard || selectedEntry?.id || allEntries[0]?.id;
  const currentImages = boards[currentId] || [];
  const currentEntry = allEntries.find(e => e.id === currentId);

  const addImages = (srcs) => {
    if (!currentId) return;
    const newImgs = srcs.map((src, i) => ({
      id: Date.now() + i,
      src,
      x: 20 + (i * 20) % 300,
      y: 20 + (i * 20) % 200,
      w: 200,
      h: 150,
      caption: "",
      rotation: (Math.random() - 0.5) * 6,
    }));
    setBoards(prev => ({
      ...prev,
      [currentId]: [...(prev[currentId] || []), ...newImgs],
    }));
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => addImages([ev.target.result]);
      reader.readAsDataURL(file);
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const addFromUrl = () => {
    if (!urlInput.trim()) return;
    addImages([urlInput.trim()]);
    setUrlInput("");
  };

  const deleteImage = (imgId) => {
    setBoards(prev => ({
      ...prev,
      [currentId]: (prev[currentId] || []).filter(img => img.id !== imgId),
    }));
    if (selectedImg?.id === imgId) setSelectedImg(null);
  };

  const updateCaption = (imgId, caption) => {
    setBoards(prev => ({
      ...prev,
      [currentId]: (prev[currentId] || []).map(img => img.id === imgId ? { ...img, caption } : img),
    }));
  };

  const handleImgMouseDown = (e, img) => {
    if (layout !== "freeform") return;
    e.stopPropagation();
    setDraggingImg(img.id);
    setDragStart({ x: e.clientX - img.x, y: e.clientY - img.y });
    setSelectedImg(img);
  };

  const handleMouseMove = (e) => {
    if (!draggingImg || layout !== "freeform") return;
    const containerRect = boardRef.current?.getBoundingClientRect();
    if (!containerRect) return;
    setBoards(prev => ({
      ...prev,
      [currentId]: (prev[currentId] || []).map(img =>
        img.id === draggingImg
          ? { ...img, x: Math.max(0, e.clientX - dragStart.x), y: Math.max(0, e.clientY - dragStart.y) }
          : img
      ),
    }));
  };

  const gridStyle = {
    grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12, padding: 16 },
    masonry: { columnCount: 3, columnGap: 12, padding: 16 },
    freeform: { position: "relative", minHeight: 500, padding: 0 },
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#06060f", overflow: "hidden" }}>
      {/* Toolbar */}
      <div className="spx-script-toolbar">
        {/* Entry selector */}
        <select
          value={currentId || ""}
          onChange={e => setActiveBoard(parseInt(e.target.value) || null)}
          style={{ background: "#111122", border: "1px solid rgba(255,255,255,0.13)", color: "#dde0f0", padding: "5px 8px", borderRadius: 3, fontFamily: "inherit", fontSize: 11, outline: "none", maxWidth: 160 }}
        >
          <option value="">Select entry...</option>
          {allEntries.map(e => <option key={e.id} value={e.id}>{e.name} ({e.section})</option>)}
        </select>

        <div className="spx-toolbar-sep">|</div>

        {/* Layout toggle */}
        {LAYOUTS.map(l => (
          <button key={l.id} className={`spx-el-btn ${layout === l.id ? "active" : ""}`} onClick={() => setLayout(l.id)}>{l.label}</button>
        ))}

        <div className="spx-toolbar-sep">|</div>

        {/* Add images */}
        <button className="spx-el-btn" onClick={() => fileInputRef.current?.click()}>📎 Upload</button>
        <input ref={fileInputRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={handleFileUpload} />

        <input
          value={urlInput}
          onChange={e => setUrlInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && addFromUrl()}
          placeholder="Paste image URL..."
          style={{ background: "#111122", border: "1px solid rgba(255,255,255,0.13)", color: "#dde0f0", padding: "5px 8px", borderRadius: 3, fontFamily: "inherit", fontSize: 11, outline: "none", width: 200 }}
        />
        <button className="spx-el-btn" onClick={addFromUrl}>Add URL</button>

        <div style={{ marginLeft: "auto" }}>
          <span className="spx-toolbar-meta">{currentImages.length} images</span>
          {currentEntry && <span className="spx-toolbar-meta" style={{ marginLeft: 8, color: "#00ffc8" }}>— {currentEntry.name}</span>}
        </div>
      </div>

      {/* Board */}
      {!currentId ? (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12, color: "#5a7088" }}>
          <div style={{ fontSize: 40, opacity: 0.15 }}>🎨</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#8888aa" }}>Select an entry to start a moodboard</div>
          <div style={{ fontSize: 12, color: "#5a7088" }}>Add characters, locations, or factions first.</div>
        </div>
      ) : currentImages.length === 0 ? (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 14, color: "#5a7088" }}>
          <div style={{ fontSize: 48, opacity: 0.1 }}>🖼</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#8888aa" }}>No images yet{currentEntry ? ` for ${currentEntry.name}` : ""}</div>
          <div style={{ fontSize: 12, textAlign: "center", lineHeight: 1.8 }}>Upload images or paste URLs for visual reference.<br />Switch to Freeform to arrange images freely.</div>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="spx-gen-btn" style={{ maxWidth: 160 }} onClick={() => fileInputRef.current?.click()}>📎 Upload Images</button>
          </div>
        </div>
      ) : (
        <div
          ref={boardRef}
          style={{ flex: 1, overflow: "auto", ...gridStyle[layout] }}
          onMouseMove={handleMouseMove}
          onMouseUp={() => setDraggingImg(null)}
        >
          {currentImages.map((img, i) => {
            const isSel = selectedImg?.id === img.id;
            const imgStyle = layout === "freeform"
              ? { position: "absolute", left: img.x, top: img.y, width: img.w, height: img.h, transform: `rotate(${img.rotation}deg)`, cursor: "grab", zIndex: isSel ? 10 : i }
              : layout === "masonry"
              ? { breakInside: "avoid", marginBottom: 12, display: "block" }
              : { display: "flex", flexDirection: "column" };

            return (
              <div
                key={img.id}
                style={{ ...imgStyle, background: "#111122", borderRadius: 6, overflow: "hidden", border: `1px solid ${isSel ? "#00ffc8" : "rgba(255,255,255,0.08)"}`, transition: "border-color .1s", userSelect: "none" }}
                onMouseDown={e => handleImgMouseDown(e, img)}
                onClick={() => setSelectedImg(img)}
              >
                <img
                  src={img.src}
                  alt={img.caption || "moodboard"}
                  style={{ width: "100%", height: layout === "grid" ? 150 : "auto", maxHeight: layout === "masonry" ? 300 : undefined, objectFit: "cover", display: "block", pointerEvents: "none" }}
                  draggable={false}
                  onError={e => { e.target.style.display = "none"; }}
                />
                {/* Caption */}
                <div style={{ padding: "6px 8px" }}>
                  <input
                    value={img.caption}
                    onChange={e => updateCaption(img.id, e.target.value)}
                    placeholder="Caption..."
                    onClick={e => e.stopPropagation()}
                    style={{ width: "100%", background: "transparent", border: "none", color: "#8888aa", fontSize: 10, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }}
                  />
                </div>
                {/* Delete button */}
                {isSel && (
                  <button
                    onClick={e => { e.stopPropagation(); deleteImage(img.id); }}
                    style={{ position: "absolute", top: 4, right: 4, width: 20, height: 20, borderRadius: "50%", border: "none", background: "rgba(255,68,68,0.8)", color: "#fff", cursor: "pointer", fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}
                  >✕</button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
