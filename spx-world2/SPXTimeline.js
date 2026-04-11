// =============================================================================
// SPXTimeline.js — Story / World Timeline
// Location: src/front/js/components/spx-script/SPXTimeline.js
// =============================================================================
import React, { useState, useRef, useCallback } from "react";

const EVENT_TYPES = {
  story:     { label: "Story",     color: "#00ffc8" },
  history:   { label: "History",   color: "#FF6600" },
  character: { label: "Character", color: "#44aaff" },
  political: { label: "Political", color: "#ff4488" },
  war:       { label: "War",       color: "#ff4444" },
  other:     { label: "Other",     color: "#8888aa" },
};

const TRACKS = ["Story Events", "World History", "Character Arcs"];

export default function SPXTimeline({ worldData, onSelectEntry }) {
  const [events, setEvents] = useState([]);
  const [zoom, setZoom] = useState(1);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [dragging, setDragging] = useState(null);
  const [newEvent, setNewEvent] = useState({ title: "", type: "story", date: "", description: "", linkedCharacter: "", track: 0 });

  const TRACK_HEIGHT = 64;
  const UNIT_WIDTH = 200 * zoom;
  const EVENT_WIDTH = 160 * zoom;

  const addEvent = () => {
    if (!newEvent.title.trim()) return;
    setEvents(prev => [...prev, { id: Date.now(), ...newEvent, position: prev.length * 220 }]);
    setNewEvent({ title: "", type: "story", date: "", description: "", linkedCharacter: "", track: 0 });
    setShowAddForm(false);
  };

  const deleteEvent = (id) => {
    setEvents(prev => prev.filter(e => e.id !== id));
    if (selectedEvent?.id === id) setSelectedEvent(null);
  };

  const handleDragStart = (e, event) => {
    e.stopPropagation();
    setDragging({ id: event.id, startX: e.clientX, startPos: event.position });
  };

  const handleMouseMove = useCallback((e) => {
    if (!dragging) return;
    const dx = e.clientX - dragging.startX;
    setEvents(prev => prev.map(ev =>
      ev.id === dragging.id ? { ...ev, position: Math.max(0, dragging.startPos + dx / zoom) } : ev
    ));
  }, [dragging, zoom]);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#06060f", overflow: "hidden" }}
      onMouseMove={handleMouseMove} onMouseUp={() => setDragging(null)}>

      {/* Toolbar */}
      <div className="spx-script-toolbar">
        <button className="spx-el-btn" onClick={() => setShowAddForm(!showAddForm)}>+ ADD EVENT</button>
        <div className="spx-toolbar-sep">|</div>
        <button className="spx-el-btn" onClick={() => setZoom(z => Math.min(3, z + 0.25))}>+</button>
        <span className="spx-toolbar-meta" style={{ minWidth: 40 }}>{Math.round(zoom * 100)}%</span>
        <button className="spx-el-btn" onClick={() => setZoom(z => Math.max(0.25, z - 0.25))}>−</button>
        <div style={{ marginLeft: "auto", display: "flex", gap: 10, flexWrap: "wrap" }}>
          {Object.entries(EVENT_TYPES).map(([k, v]) => (
            <span key={k} style={{ fontSize: 10, color: v.color, display: "flex", alignItems: "center", gap: 3 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: v.color, display: "inline-block" }} />{v.label}
            </span>
          ))}
        </div>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div style={{ padding: "10px 14px", background: "#0d0d1a", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", gap: 8, flexWrap: "wrap", flexShrink: 0 }}>
          <input value={newEvent.title} onChange={e => setNewEvent(p => ({ ...p, title: e.target.value }))} placeholder="Event title *" style={{ background: "#111122", border: "1px solid rgba(255,255,255,0.13)", color: "#dde0f0", padding: "5px 8px", borderRadius: 3, fontFamily: "inherit", fontSize: 11, outline: "none", width: 150 }} />
          <select value={newEvent.type} onChange={e => setNewEvent(p => ({ ...p, type: e.target.value }))} style={{ background: "#111122", border: "1px solid rgba(255,255,255,0.13)", color: "#dde0f0", padding: "5px 8px", borderRadius: 3, fontFamily: "inherit", fontSize: 11, outline: "none" }}>
            {Object.entries(EVENT_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <input value={newEvent.date} onChange={e => setNewEvent(p => ({ ...p, date: e.target.value }))} placeholder="Date / Year..." style={{ background: "#111122", border: "1px solid rgba(255,255,255,0.13)", color: "#dde0f0", padding: "5px 8px", borderRadius: 3, fontFamily: "inherit", fontSize: 11, outline: "none", width: 120 }} />
          <select value={newEvent.track} onChange={e => setNewEvent(p => ({ ...p, track: parseInt(e.target.value) }))} style={{ background: "#111122", border: "1px solid rgba(255,255,255,0.13)", color: "#dde0f0", padding: "5px 8px", borderRadius: 3, fontFamily: "inherit", fontSize: 11, outline: "none" }}>
            {TRACKS.map((t, i) => <option key={i} value={i}>{t}</option>)}
          </select>
          <select value={newEvent.linkedCharacter} onChange={e => setNewEvent(p => ({ ...p, linkedCharacter: e.target.value }))} style={{ background: "#111122", border: "1px solid rgba(255,255,255,0.13)", color: "#dde0f0", padding: "5px 8px", borderRadius: 3, fontFamily: "inherit", fontSize: 11, outline: "none" }}>
            <option value="">Link character...</option>
            {(worldData.characters || []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input value={newEvent.description} onChange={e => setNewEvent(p => ({ ...p, description: e.target.value }))} placeholder="Description..." style={{ background: "#111122", border: "1px solid rgba(255,255,255,0.13)", color: "#dde0f0", padding: "5px 8px", borderRadius: 3, fontFamily: "inherit", fontSize: 11, outline: "none", flex: 1, minWidth: 100 }} onKeyDown={e => e.key === "Enter" && addEvent()} />
          <button onClick={addEvent} style={{ padding: "5px 14px", borderRadius: 4, border: "none", background: "#00ffc8", color: "#000", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", fontSize: 12 }}>Add</button>
          <button onClick={() => setShowAddForm(false)} style={{ padding: "5px 10px", borderRadius: 4, border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "#8888aa", cursor: "pointer", fontFamily: "inherit", fontSize: 12 }}>✕</button>
        </div>
      )}

      {/* Canvas */}
      <div style={{ flex: 1, overflow: "auto" }}>
        {events.length === 0 ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12, color: "#5a7088", height: "100%", minHeight: 300 }}>
            <div style={{ fontSize: 40, opacity: 0.15 }}>📅</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#8888aa" }}>No timeline events yet</div>
            <div style={{ fontSize: 12, textAlign: "center", lineHeight: 1.8 }}>Track story events, world history, and character arcs.</div>
            <button className="spx-gen-btn" style={{ maxWidth: 180 }} onClick={() => setShowAddForm(true)}>+ Add First Event</button>
          </div>
        ) : (
          <div style={{ minWidth: 20 * UNIT_WIDTH + 120 }}>
            {/* Ruler */}
            <div style={{ display: "flex", background: "#0a0a18", borderBottom: "1px solid rgba(255,255,255,0.07)", position: "sticky", top: 0, zIndex: 5 }}>
              <div style={{ width: 120, flexShrink: 0 }} />
              <div style={{ flex: 1, height: 24, position: "relative" }}>
                {Array.from({ length: 20 }).map((_, i) => (
                  <div key={i} style={{ position: "absolute", left: i * UNIT_WIDTH, height: "100%", borderLeft: "1px solid rgba(255,255,255,0.07)", paddingLeft: 4, fontSize: 9, color: "#3a5070", display: "flex", alignItems: "center", fontWeight: 700 }}>
                    {i === 0 ? "START" : `+${i}`}
                  </div>
                ))}
              </div>
            </div>
            {/* Tracks */}
            {TRACKS.map((trackName, trackIdx) => {
              const trackEvents = events.filter(e => (e.track || 0) === trackIdx);
              return (
                <div key={trackIdx} style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,0.05)", height: TRACK_HEIGHT }}>
                  <div style={{ width: 120, flexShrink: 0, background: "#0a0a18", borderRight: "1px solid rgba(255,255,255,0.07)", padding: "0 12px", display: "flex", alignItems: "center", fontSize: 10, fontWeight: 700, color: "#5a7088", letterSpacing: 0.5 }}>{trackName}</div>
                  <div style={{ flex: 1, position: "relative", background: trackIdx % 2 === 0 ? "#06060f" : "#08080f" }}>
                    {Array.from({ length: 20 }).map((_, i) => (
                      <div key={i} style={{ position: "absolute", left: i * UNIT_WIDTH, top: 0, bottom: 0, borderLeft: "1px solid rgba(255,255,255,0.03)" }} />
                    ))}
                    {trackEvents.map(event => {
                      const cfg = EVENT_TYPES[event.type] || EVENT_TYPES.other;
                      const isSel = selectedEvent?.id === event.id;
                      return (
                        <div key={event.id}
                          style={{ position: "absolute", left: event.position * zoom, top: 8, width: EVENT_WIDTH, height: TRACK_HEIGHT - 16, background: `${cfg.color}18`, border: `1px solid ${isSel ? "#fff" : cfg.color}`, borderRadius: 4, padding: "4px 8px", cursor: "grab", userSelect: "none", overflow: "hidden", zIndex: isSel ? 10 : 1 }}
                          onMouseDown={e => { handleDragStart(e, event); setSelectedEvent(event); }}
                          onClick={e => { e.stopPropagation(); setSelectedEvent(event); if (event.linkedCharacter) { const entry = (worldData.characters || []).find(c => c.id === parseInt(event.linkedCharacter)); if (entry) onSelectEntry && onSelectEntry({ ...entry, section: "characters" }); } }}
                        >
                          <div style={{ fontSize: 10, fontWeight: 700, color: cfg.color, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{event.title}</div>
                          {event.date && <div style={{ fontSize: 9, color: "#5a7088", marginTop: 1 }}>{event.date}</div>}
                          {event.description && <div style={{ fontSize: 9, color: "#8888aa", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{event.description}</div>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Selected event bar */}
      {selectedEvent && (
        <div style={{ flexShrink: 0, padding: "8px 16px", background: "#0d0d1a", borderTop: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 8, height: 8, borderRadius: 2, background: EVENT_TYPES[selectedEvent.type]?.color, flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#dde0f0" }}>{selectedEvent.title}</div>
            {selectedEvent.date && <div style={{ fontSize: 10, color: "#5a7088" }}>{selectedEvent.date}</div>}
          </div>
          {selectedEvent.description && <div style={{ fontSize: 11, color: "#8888aa", flex: 2 }}>{selectedEvent.description}</div>}
          <button onClick={() => deleteEvent(selectedEvent.id)} style={{ padding: "3px 8px", borderRadius: 3, border: "1px solid rgba(255,68,68,0.3)", background: "transparent", color: "#ff4444", cursor: "pointer", fontFamily: "inherit", fontSize: 10 }}>Delete</button>
          <button onClick={() => setSelectedEvent(null)} style={{ padding: "3px 8px", borderRadius: 3, border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "#8888aa", cursor: "pointer", fontFamily: "inherit", fontSize: 10 }}>✕</button>
        </div>
      )}
    </div>
  );
}
