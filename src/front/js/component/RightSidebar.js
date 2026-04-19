import React, { useState, useEffect } from "react";
import LoopermanBrowser from "./LoopermanBrowser";
import FreesoundBrowser from "./FreesoundBrowser";

// Instrument catalog (built-in — wires to your existing instrument engines)
const INSTRUMENTS = [
  { id: "grand_piano", name: "Grand Piano", cat: "Keys", icon: "🎹" },
  { id: "electric_piano", name: "Electric Piano", cat: "Keys", icon: "🎹" },
  { id: "organ", name: "Organ", cat: "Keys", icon: "⛪" },
  { id: "synth_lead", name: "Synth Lead", cat: "Synth", icon: "🎛️" },
  { id: "synth_pad", name: "Synth Pad", cat: "Synth", icon: "🌊" },
  { id: "synth_bass", name: "Synth Bass", cat: "Synth", icon: "🔊" },
  { id: "drum_kit_808", name: "808 Drum Kit", cat: "Drums", icon: "🥁" },
  { id: "drum_kit_acoustic", name: "Acoustic Kit", cat: "Drums", icon: "🥁" },
  { id: "drum_kit_trap", name: "Trap Kit", cat: "Drums", icon: "🥁" },
  { id: "bass_fingered", name: "Bass (Fingered)", cat: "Bass", icon: "🎸" },
  { id: "bass_picked", name: "Bass (Picked)", cat: "Bass", icon: "🎸" },
  { id: "guitar_acoustic", name: "Acoustic Guitar", cat: "Guitar", icon: "🎸" },
  { id: "guitar_electric", name: "Electric Guitar", cat: "Guitar", icon: "🎸" },
  { id: "strings_violin", name: "Violin", cat: "Strings", icon: "🎻" },
  { id: "strings_ensemble", name: "String Ensemble", cat: "Strings", icon: "🎻" },
  { id: "brass_trumpet", name: "Trumpet", cat: "Brass", icon: "🎺" },
  { id: "brass_saxophone", name: "Saxophone", cat: "Brass", icon: "🎷" },
  { id: "vocal_choir", name: "Choir", cat: "Vocal", icon: "🎤" },
  { id: "world_flute", name: "World Flute", cat: "World", icon: "🪈" },
  { id: "fx_atmosphere", name: "Atmosphere FX", cat: "FX", icon: "✨" },
];

// Effect plugin catalog
const EFFECTS = [
  { id: "spx_eq4", name: "SPX EQ-4", cat: "EQ", tier: "SPX" },
  { id: "spx_eq8", name: "SPX EQ-8", cat: "EQ", tier: "SPX" },
  { id: "spx_parametric", name: "SPX Parametric EQ", cat: "EQ", tier: "SPX" },
  { id: "spx_comp", name: "SPX Compressor", cat: "Dynamics", tier: "SPX" },
  { id: "spx_1176", name: "SPX 1176", cat: "Dynamics", tier: "SPX" },
  { id: "spx_la2a", name: "SPX LA-2A", cat: "Dynamics", tier: "SPX" },
  { id: "spx_ssl_bus", name: "SPX SSL Bus Comp", cat: "Dynamics", tier: "SPX" },
  { id: "spx_multiband", name: "SPX Multiband", cat: "Dynamics", tier: "SPX" },
  { id: "spx_gate", name: "SPX Gate", cat: "Dynamics", tier: "SPX" },
  { id: "spx_limiter", name: "SPX Limiter", cat: "Dynamics", tier: "SPX" },
  { id: "spx_hall", name: "SPX Hall Reverb", cat: "Reverb", tier: "SPX" },
  { id: "spx_plate", name: "SPX Plate Reverb", cat: "Reverb", tier: "SPX" },
  { id: "spx_room", name: "SPX Room Reverb", cat: "Reverb", tier: "SPX" },
  { id: "spx_spring", name: "SPX Spring Reverb", cat: "Reverb", tier: "SPX" },
  { id: "spx_delay", name: "SPX Tape Delay", cat: "Delay", tier: "SPX" },
  { id: "spx_ping_pong", name: "SPX Ping Pong", cat: "Delay", tier: "SPX" },
  { id: "spx_chorus", name: "SPX Chorus", cat: "Modulation", tier: "SPX" },
  { id: "spx_flanger", name: "SPX Flanger", cat: "Modulation", tier: "SPX" },
  { id: "spx_phaser", name: "SPX Phaser", cat: "Modulation", tier: "SPX" },
  { id: "spx_tremolo", name: "SPX Tremolo", cat: "Modulation", tier: "SPX" },
  { id: "spx_distortion", name: "SPX Distortion", cat: "Distortion", tier: "SPX" },
  { id: "spx_saturator", name: "SPX Saturator", cat: "Distortion", tier: "SPX" },
  { id: "spx_bitcrusher", name: "SPX Bitcrusher", cat: "Distortion", tier: "SPX" },
  { id: "spx_autotune", name: "SPX AutoTune", cat: "Pitch", tier: "SPX" },
  { id: "spx_harmony", name: "SPX Harmony", cat: "Pitch", tier: "SPX" },
  { id: "spx_vocoder", name: "SPX Vocoder", cat: "Pitch", tier: "SPX" },
];

const RightSidebar = ({ audioContext, selectedTrack, tracks = [], onSendToTrack }) => {
  const [tab, setTab] = useState(() => localStorage.getItem("rs_right_tab") || "instruments");
  const [search, setSearch] = useState("");
  const [instCat, setInstCat] = useState("All");
  const [fxCat, setFxCat] = useState("All");
  const [favorites, setFavorites] = useState(() => {
    try { return JSON.parse(localStorage.getItem("rs_favorites") || "[]"); } catch { return []; }
  });
  const [files, setFiles] = useState([]);
  const [presets, setPresets] = useState([]);

  useEffect(() => { localStorage.setItem("rs_right_tab", tab); }, [tab]);
  useEffect(() => { localStorage.setItem("rs_favorites", JSON.stringify(favorites)); }, [favorites]);

  // Load user files when Files tab is active
  useEffect(() => {
    if (tab !== "files") return;
    const token = localStorage.getItem("token");
    fetch((process.env.REACT_APP_BACKEND_URL || "") + "/api/user-files", {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
      .then(r => r.ok ? r.json() : [])
      .then(data => setFiles(Array.isArray(data) ? data : (data.files || [])))
      .catch(() => setFiles([]));
  }, [tab]);

  // Load presets when Presets tab active
  useEffect(() => {
    if (tab !== "presets") return;
    const token = localStorage.getItem("token");
    fetch((process.env.REACT_APP_BACKEND_URL || "") + "/api/user-presets", {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
      .then(r => r.ok ? r.json() : [])
      .then(data => setPresets(Array.isArray(data) ? data : (data.presets || [])))
      .catch(() => setPresets([]));
  }, [tab]);

  const toggleFav = (item) => {
    const key = `${item.type}:${item.id}`;
    setFavorites(prev => prev.find(f => `${f.type}:${f.id}` === key)
      ? prev.filter(f => `${f.type}:${f.id}` !== key)
      : [...prev, item]);
  };
  const isFav = (item) => favorites.some(f => f.type === item.type && f.id === item.id);

  const instCats = ["All", ...Array.from(new Set(INSTRUMENTS.map(i => i.cat)))];
  const fxCats = ["All", ...Array.from(new Set(EFFECTS.map(e => e.cat)))];

  const filteredInst = INSTRUMENTS.filter(i =>
    (instCat === "All" || i.cat === instCat) &&
    (!search || i.name.toLowerCase().includes(search.toLowerCase()))
  );
  const filteredFx = EFFECTS.filter(e =>
    (fxCat === "All" || e.cat === fxCat) &&
    (!search || e.name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="rs-sidebar rs-sidebar-right">
      <div className="rs-sb-tabs rs-sb-tabs-right">
        <button className={"rs-sb-tab-icon" + (tab === "instruments" ? " active" : "")} onClick={() => setTab("instruments")} title="Instruments">🎹</button>
        <button className={"rs-sb-tab-icon" + (tab === "effects" ? " active" : "")} onClick={() => setTab("effects")} title="Effects">🎛️</button>
        <button className={"rs-sb-tab-icon" + (tab === "loops" ? " active" : "")} onClick={() => setTab("loops")} title="Loops">🔁</button>
        <button className={"rs-sb-tab-icon" + (tab === "sounds" ? " active" : "")} onClick={() => setTab("sounds")} title="Sounds">🎵</button>
        <button className={"rs-sb-tab-icon" + (tab === "presets" ? " active" : "")} onClick={() => setTab("presets")} title="Presets">💾</button>
        <button className={"rs-sb-tab-icon" + (tab === "files" ? " active" : "")} onClick={() => setTab("files")} title="Files">📁</button>
        <button className={"rs-sb-tab-icon" + (tab === "favorites" ? " active" : "")} onClick={() => setTab("favorites")} title="Favorites">⭐</button>
      </div>

      <div className="rs-sb-content">
        {(tab === "instruments" || tab === "effects") && (
          <div className="rs-sb-search">
            <input type="text" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)}/>
          </div>
        )}

        {tab === "instruments" && (
          <>
            <div className="rs-sb-cats">
              {instCats.map(c => (
                <button key={c} className={"rs-sb-cat" + (instCat === c ? " active" : "")} onClick={() => setInstCat(c)}>{c}</button>
              ))}
            </div>
            <div className="rs-sb-list">
              {filteredInst.map(i => {
                const favItem = { type: "instrument", id: i.id, name: i.name };
                return (
                  <div key={i.id} className="rs-sb-item"
                       draggable
                       onDragStart={e => e.dataTransfer.setData("application/spx-instrument", JSON.stringify(i))}
                       onDoubleClick={() => onSendToTrack && onSendToTrack({ type: "instrument", ...i })}>
                    <span className="rs-sb-item-icon">{i.icon}</span>
                    <div className="rs-sb-item-body">
                      <div className="rs-sb-item-name">{i.name}</div>
                      <div className="rs-sb-item-cat">{i.cat}</div>
                    </div>
                    <button className={"rs-sb-star" + (isFav(favItem) ? " on" : "")} onClick={e => { e.stopPropagation(); toggleFav(favItem); }}>★</button>
                  </div>
                );
              })}
              {filteredInst.length === 0 && <div className="rs-sb-empty">No matches</div>}
            </div>
          </>
        )}

        {tab === "effects" && (
          <>
            <div className="rs-sb-cats">
              {fxCats.map(c => (
                <button key={c} className={"rs-sb-cat" + (fxCat === c ? " active" : "")} onClick={() => setFxCat(c)}>{c}</button>
              ))}
            </div>
            <div className="rs-sb-list">
              {filteredFx.map(fx => {
                const favItem = { type: "effect", id: fx.id, name: fx.name };
                return (
                  <div key={fx.id} className="rs-sb-item"
                       draggable
                       onDragStart={e => e.dataTransfer.setData("application/spx-effect", JSON.stringify(fx))}
                       onDoubleClick={() => onSendToTrack && onSendToTrack({ type: "effect", ...fx })}>
                    <span className="rs-sb-item-icon">🎛️</span>
                    <div className="rs-sb-item-body">
                      <div className="rs-sb-item-name">{fx.name}</div>
                      <div className="rs-sb-item-cat">{fx.cat}</div>
                    </div>
                    <span className="rs-sb-tier">{fx.tier}</span>
                    <button className={"rs-sb-star" + (isFav(favItem) ? " on" : "")} onClick={e => { e.stopPropagation(); toggleFav(favItem); }}>★</button>
                  </div>
                );
              })}
              {filteredFx.length === 0 && <div className="rs-sb-empty">No matches</div>}
            </div>
          </>
        )}

        {tab === "loops" && (
          <div className="rs-sb-embed">
            <LoopermanBrowser audioContext={audioContext}
              onSoundSelect={(buffer, name, url) => onSendToTrack && onSendToTrack({ type: "loop", buffer, name, url })}
              onClose={() => {}}
              isEmbedded={true}/>
          </div>
        )}

        {tab === "sounds" && (
          <div className="rs-sb-embed">
            <FreesoundBrowser audioContext={audioContext}
              onSoundSelect={(buffer, name, url) => onSendToTrack && onSendToTrack({ type: "sound", buffer, name, url })}
              onClose={() => {}}
              isEmbedded={true}/>
          </div>
        )}

        {tab === "presets" && (
          <div className="rs-sb-list">
            {presets.length === 0 && <div className="rs-sb-empty">No saved presets yet<br/><span className="rs-sb-hint">Save presets from any plugin to see them here</span></div>}
            {presets.map((p, i) => (
              <div key={p.id || i} className="rs-sb-item" onDoubleClick={() => onSendToTrack && onSendToTrack({ type: "preset", ...p })}>
                <span className="rs-sb-item-icon">💾</span>
                <div className="rs-sb-item-body">
                  <div className="rs-sb-item-name">{p.name || "Preset"}</div>
                  <div className="rs-sb-item-cat">{p.plugin || p.type || ""}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "files" && (
          <div className="rs-sb-list">
            {files.length === 0 && <div className="rs-sb-empty">No files yet<br/><span className="rs-sb-hint">Upload audio files to see them here</span></div>}
            {files.map((f, i) => (
              <div key={f.id || i} className="rs-sb-item"
                   draggable
                   onDragStart={e => e.dataTransfer.setData("application/spx-file", JSON.stringify(f))}>
                <span className="rs-sb-item-icon">📁</span>
                <div className="rs-sb-item-body">
                  <div className="rs-sb-item-name">{f.name || f.filename || "File"}</div>
                  <div className="rs-sb-item-cat">{f.size ? `${(f.size/1024/1024).toFixed(1)} MB` : ""} {f.type || ""}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "favorites" && (
          <div className="rs-sb-list">
            {favorites.length === 0 && <div className="rs-sb-empty">No favorites yet<br/><span className="rs-sb-hint">Click ★ on any item to save it here</span></div>}
            {favorites.map((item, i) => (
              <div key={`${item.type}:${item.id}`} className="rs-sb-item" onDoubleClick={() => onSendToTrack && onSendToTrack(item)}>
                <span className="rs-sb-item-icon">{item.type === "instrument" ? "🎹" : item.type === "effect" ? "🎛️" : "⭐"}</span>
                <div className="rs-sb-item-body">
                  <div className="rs-sb-item-name">{item.name}</div>
                  <div className="rs-sb-item-cat">{item.type}</div>
                </div>
                <button className="rs-sb-star on" onClick={() => toggleFav(item)}>★</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RightSidebar;
