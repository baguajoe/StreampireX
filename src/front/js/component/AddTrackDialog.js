import React, { useState } from "react";

const TRACK_TYPES = [
  { value: "audio",      label: "Audio",      icon: "🎤", desc: "Record and edit audio" },
  { value: "instrument", label: "Instrument", icon: "🎹", desc: "MIDI instrument track" },
  { value: "midi",       label: "MIDI",       icon: "🎵", desc: "Raw MIDI data" },
  { value: "bus",        label: "Group/Bus",  icon: "🎚", desc: "Route multiple tracks" },
  { value: "aux",        label: "FX/Aux",     icon: "🔊", desc: "Effects return channel" },
];

const AddTrackDialog = ({ onAdd, onClose, maxTracks, currentCount }) => {
  const [selected, setSelected] = useState("audio");
  const [name, setName] = useState("");
  const [count, setCount] = useState(1);
  const atLimit = currentCount >= maxTracks;
  const handleAdd = () => {
    for (let i = 0; i < count; i++) onAdd(selected, name || null);
    onClose();
  };
  return (
    <div className="atd-overlay" onClick={onClose}>
      <div className="atd-modal" onClick={e => e.stopPropagation()}>
        <div className="atd-header">
          <span className="atd-title">Add Track</span>
          <button className="atd-close" onClick={onClose}>✕</button>
        </div>
        <div className="atd-types">
          {TRACK_TYPES.map(t => (
            <button key={t.value} className={"atd-type-btn" + (selected === t.value ? " active" : "")} onClick={() => setSelected(t.value)}>
              <span className="atd-type-icon">{t.icon}</span>
              <span className="atd-type-label">{t.label}</span>
            </button>
          ))}
        </div>
        <div className="atd-desc">{TRACK_TYPES.find(t => t.value === selected)?.desc}</div>
        <div className="atd-fields">
          <div className="atd-field">
            <label className="atd-label">Name</label>
            <input className="atd-input" value={name} onChange={e => setName(e.target.value)}
              placeholder={TRACK_TYPES.find(t => t.value === selected)?.label + " " + (currentCount + 1)}/>
          </div>
          <div className="atd-field atd-field-sm">
            <label className="atd-label">Count</label>
            <div className="atd-count-row">
              <button className="atd-count-btn" onClick={() => setCount(c => Math.max(1, c - 1))}>−</button>
              <span className="atd-count-val">{count}</span>
              <button className="atd-count-btn" onClick={() => setCount(c => Math.min(maxTracks - currentCount, c + 1))}>+</button>
            </div>
          </div>
        </div>
        {atLimit && <div className="atd-limit">Track limit reached ({maxTracks})</div>}
        <div className="atd-footer">
          <button className="atd-cancel" onClick={onClose}>Cancel</button>
          <button className="atd-add" onClick={handleAdd} disabled={atLimit}>Add Track</button>
        </div>
      </div>
    </div>
  );
};
export default AddTrackDialog;
