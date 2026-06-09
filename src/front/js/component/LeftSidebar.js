import React, { useState, useEffect, useRef, useCallback } from "react";

// ── Log fader math ──
const DB_MIN = -60, DB_MAX = 6;
const volumeToPos = (vol) => {
  if (vol <= 0) return 0;
  const db = 20 * Math.log10(vol);
  if (db >= DB_MAX) return 1;
  if (db <= DB_MIN) return 0;
  if (db >= 0) return 0.75 + (db / DB_MAX) * 0.25;
  return Math.pow(10, db / 24) * 0.75;
};
const posToVolume = (pos) => {
  if (pos <= 0) return 0;
  if (pos >= 1) return Math.pow(10, DB_MAX / 20);
  if (pos >= 0.75) return Math.pow(10, ((pos - 0.75) / 0.25 * DB_MAX) / 20);
  const db = 24 * Math.log10(pos / 0.75);
  if (db <= DB_MIN) return 0;
  return Math.pow(10, db / 20);
};

const ChannelFader = ({ value = 1.0, onChange, height = 140 }) => {
  const ref = useRef(null);
  const dragging = useRef(false);
  const pos = volumeToPos(value);
  const thumbY = height - pos * height - 5;

  const handleMove = useCallback((clientY) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const y = Math.max(0, Math.min(height, clientY - rect.top));
    onChange && onChange(posToVolume(1 - y / height));
  }, [onChange, height]);

  const handleDown = (e) => {
    e.preventDefault();
    dragging.current = true;
    handleMove(e.clientY);
    const onUp = () => { dragging.current = false; window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
    const onMove = (ev) => dragging.current && handleMove(ev.clientY);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const labels = [{t:"+6",p:1},{t:"0",p:0.75},{t:"-6",p:0.5},{t:"-12",p:0.25},{t:"-∞",p:0}];

  return (
    <div className="lsb-fader-wrap">
      <div className="lsb-fader-scale">
        {labels.map(l => <span key={l.t} style={{ top: `${height - l.p * height - 4}px` }}>{l.t}</span>)}
      </div>
      <svg ref={ref} width={22} height={height} onMouseDown={handleDown}
           onDoubleClick={() => onChange && onChange(1.0)}
           onWheel={(e) => { e.preventDefault(); const d = e.deltaY < 0 ? 0.01 : -0.01; onChange && onChange(posToVolume(Math.max(0, Math.min(1, pos + d)))); }}
           className="lsb-fader-svg">
        <rect x="8" y="0" width="6" height={height} fill="#060a10" stroke="#0d1520" rx="1"/>
        <rect x="2" y={thumbY} width="18" height="10" fill="url(#lsb-thumb-grad)" stroke="#506070" rx="1"/>
        <line x1="5" y1={thumbY + 5} x2="17" y2={thumbY + 5} stroke="#00ffc8" strokeWidth="1.5"/>
        <defs><linearGradient id="lsb-thumb-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#d0d8e4"/><stop offset="50%" stopColor="#8090a4"/><stop offset="100%" stopColor="#a0aab8"/>
        </linearGradient></defs>
      </svg>
    </div>
  );
};

const PanKnob = ({ value = 0, onChange, size = 36 }) => {
  const startY = useRef(0);
  const startVal = useRef(0);
  const angle = value * 135;

  const handleDown = (e) => {
    e.preventDefault();
    startY.current = e.clientY;
    startVal.current = value;
    const onMove = (ev) => {
      const dy = startY.current - ev.clientY;
      onChange && onChange(Math.max(-1, Math.min(1, startVal.current + dy * 0.005)));
    };
    const onUp = () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  return (
    <div className="lsb-knob" onMouseDown={handleDown} onDoubleClick={() => onChange && onChange(0)}>
      <svg width={size} height={size} viewBox="0 0 36 36">
        <circle cx="18" cy="18" r="15" fill="#0f1422" stroke="#2a3248" strokeWidth="1"/>
        <g transform={`rotate(${angle} 18 18)`}>
          <line x1="18" y1="18" x2="18" y2="6" stroke="#00ffc8" strokeWidth="2" strokeLinecap="round"/>
        </g>
        <circle cx="18" cy="18" r="2" fill="#00ffc8"/>
      </svg>
      <div className="lsb-knob-label">{value === 0 ? "C" : (value > 0 ? `R${Math.round(value*100)}` : `L${Math.round(Math.abs(value)*100)}`)}</div>
    </div>
  );
};

// Compact rotary knob (for Trim, HPF freq, etc)
const MiniKnob = ({ value = 0, min = 0, max = 1, onChange, size = 28, label, unit = "", format = (v) => v.toFixed(1) }) => {
  const startY = useRef(0);
  const startVal = useRef(0);
  const range = max - min;
  const norm = (value - min) / range;
  const angle = norm * 270 - 135;

  const handleDown = (e) => {
    e.preventDefault();
    startY.current = e.clientY;
    startVal.current = value;
    const onMove = (ev) => {
      const dy = startY.current - ev.clientY;
      const newVal = Math.max(min, Math.min(max, startVal.current + dy * (range / 200)));
      onChange && onChange(newVal);
    };
    const onUp = () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  return (
    <div className="lsb-mini-knob" onMouseDown={handleDown} onDoubleClick={() => onChange && onChange((min + max) / 2)}>
      {label && <div className="lsb-mini-knob-label">{label}</div>}
      <svg width={size} height={size} viewBox="0 0 28 28">
        <circle cx="14" cy="14" r="11" fill="#0f1422" stroke="#2a3248" strokeWidth="1"/>
        <g transform={`rotate(${angle} 14 14)`}>
          <line x1="14" y1="14" x2="14" y2="5" stroke="#00ffc8" strokeWidth="1.5" strokeLinecap="round"/>
        </g>
        <circle cx="14" cy="14" r="1.5" fill="#00ffc8"/>
      </svg>
      <div className="lsb-mini-knob-val">{format(value)}{unit}</div>
    </div>
  );
};

const MiniEQ = ({ bands = [] }) => {
  const points = [];
  for (let i = 0; i < 60; i++) {
    const freq = 20 * Math.pow(22050/20, i/59);
    let g = 0;
    bands.forEach(b => {
      if (!b || b.gain == null) return;
      const ratio = freq / (b.freq || 1000);
      const bw = Math.log2(ratio);
      g += b.gain * Math.exp(-Math.pow(bw * (b.q || 1), 2));
    });
    const y = 20 - g * 1.5;
    points.push(`${i * 3},${Math.max(2, Math.min(38, y))}`);
  }

  return (
    <svg width="180" height="40" viewBox="0 0 180 40" className="lsb-eq-preview">
      <rect x="0" y="0" width="180" height="40" fill="#060a10" stroke="#1a1f2e" rx="2"/>
      <line x1="0" y1="20" x2="180" y2="20" stroke="#2a3248" strokeWidth="0.5" strokeDasharray="2,2"/>
      <polyline points={points.join(" ")} fill="none" stroke="#00ffc8" strokeWidth="1.5"/>
    </svg>
  );
};

const LevelMeter = ({ peakL = 0, peakR = 0, height = 140 }) => {
  const toY = (p) => {
    if (p <= 0) return height;
    const db = 20 * Math.log10(p);
    if (db >= 6) return 0;
    if (db <= -60) return height;
    return height - volumeToPos(p) * height;
  };
  return (
    <svg width="12" height={height} className="lsb-meter">
      <defs>
        <linearGradient id="lsb-mtr-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ff3030"/><stop offset="15%" stopColor="#ffaa00"/>
          <stop offset="45%" stopColor="#ffee00"/><stop offset="60%" stopColor="#00ffc8"/>
          <stop offset="100%" stopColor="#006655"/>
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="5" height={height} fill="#060a10" stroke="#0d1520"/>
      <rect x="7" y="0" width="5" height={height} fill="#060a10" stroke="#0d1520"/>
      <rect x="0" y={toY(peakL)} width="5" height={height - toY(peakL)} fill="url(#lsb-mtr-grad)"/>
      <rect x="7" y={toY(peakR)} width="5" height={height - toY(peakR)} fill="url(#lsb-mtr-grad)"/>
    </svg>
  );
};

const AUTO_PARAMS = ["Volume", "Pan", "Mute", "Send 1", "Send 2", "EQ Low", "EQ Mid", "EQ High", "Reverb Mix"];
const GROUP_COLORS = ["#ff6600", "#00ffc8", "#a78bfa", "#facc15", "#f472b6", "#38bdf8", "#4ade80", "#fb923c"];

// ═════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════
const LeftSidebar = ({
  tracks = [],
  selectedTrack = 0,
  onSelectTrack,
  onToggleVisible,
  onUpdateTrack,
  onTrackAction,
  bpm = 120,
  onBpmChange,
  projectName = "Untitled Project",
  onProjectNameChange,
  // Bug #11 (Part 9b): the inserts list previously read t.inserts (always
  // undefined) so the picker appeared to do nothing. Read from t.effects via
  // this registry instead, so a single source of truth (track.effects) drives
  // both Console mixer slots and the sidebar list.
  fxRegistry = null,
  updateEffect = null,
}) => {
  const [tab, setTab] = useState(() => localStorage.getItem("rs_left_tab") || "channel");
  const [vizSearch, setVizSearch] = useState("");

  // Groups state (persists in localStorage)
  const [groups, setGroups] = useState(() => {
    try { return JSON.parse(localStorage.getItem("rs_groups") || "[]"); } catch { return []; }
  });
  useEffect(() => { localStorage.setItem("rs_groups", JSON.stringify(groups)); }, [groups]);

  // Markers state
  const [markers, setMarkers] = useState(() => {
    try { return JSON.parse(localStorage.getItem("rs_markers") || "[]"); } catch { return []; }
  });
  useEffect(() => { localStorage.setItem("rs_markers", JSON.stringify(markers)); }, [markers]);

  // Project metadata
  const [projectMeta, setProjectMeta] = useState(() => {
    try { return JSON.parse(localStorage.getItem("rs_project_meta") || "{}"); } catch { return {}; }
  });
  useEffect(() => { localStorage.setItem("rs_project_meta", JSON.stringify(projectMeta)); }, [projectMeta]);

  // History (undo stack visualizer — reads from window if RecordingStudio exposes)
  const [history, setHistory] = useState([]);
  useEffect(() => {
    const refresh = () => {
      if (window.__spxHistory) setHistory(window.__spxHistory);
    };
    refresh();
    const interval = setInterval(refresh, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => { localStorage.setItem("rs_left_tab", tab); }, [tab]);

  const t = tracks[selectedTrack] || null;

  const showAll = () => tracks.forEach((_, i) => onToggleVisible && onToggleVisible(i, true));
  const hideAll = () => tracks.forEach((_, i) => onToggleVisible && onToggleVisible(i, false));

  const filteredTracks = tracks.map((tr, i) => ({ ...tr, _i: i }))
    .filter(tr => !vizSearch || (tr.name || "").toLowerCase().includes(vizSearch.toLowerCase()));

  // Groups helpers
  const addGroup = () => {
    const name = prompt("Group name:", `Group ${groups.length + 1}`);
    if (!name) return;
    setGroups([...groups, { id: `g${Date.now()}`, name, color: GROUP_COLORS[groups.length % GROUP_COLORS.length], trackIds: [], collapsed: false, muted: false, solo: false }]);
  };
  const deleteGroup = (gid) => {
    if (!confirm("Delete this group? (tracks stay)")) return;
    setGroups(groups.filter(g => g.id !== gid));
  };
  const toggleGroupCollapse = (gid) => setGroups(groups.map(g => g.id === gid ? { ...g, collapsed: !g.collapsed } : g));
  const toggleGroupMute = (gid) => {
    const g = groups.find(g => g.id === gid);
    if (!g) return;
    setGroups(groups.map(gg => gg.id === gid ? { ...gg, muted: !gg.muted } : gg));
    g.trackIds.forEach(ti => onUpdateTrack && onUpdateTrack(ti, { muted: !g.muted }));
  };
  const assignTrackToGroup = (trackIdx, gid) => {
    setGroups(groups.map(g => {
      if (g.id === gid) return { ...g, trackIds: [...new Set([...g.trackIds, trackIdx])] };
      return { ...g, trackIds: g.trackIds.filter(ti => ti !== trackIdx) };
    }));
  };
  const removeTrackFromGroup = (trackIdx, gid) => {
    setGroups(groups.map(g => g.id === gid ? { ...g, trackIds: g.trackIds.filter(ti => ti !== trackIdx) } : g));
  };

  // Markers helpers
  const addMarker = () => {
    const name = prompt("Marker name (e.g. Intro, Verse, Chorus):", "New Marker");
    if (!name) return;
    const time = parseFloat(prompt("At time (seconds):", "0") || "0");
    setMarkers([...markers, { id: `m${Date.now()}`, name, time, color: GROUP_COLORS[markers.length % GROUP_COLORS.length] }].sort((a, b) => a.time - b.time));
  };
  const deleteMarker = (mid) => setMarkers(markers.filter(m => m.id !== mid));
  const jumpToMarker = (m) => {
    if (window.__spxJumpToTime) window.__spxJumpToTime(m.time);
    else onTrackAction && onTrackAction("jumpTo", m.time);
  };

  const updateMeta = (key, val) => setProjectMeta({ ...projectMeta, [key]: val });

  return (
    <div className="rs-sidebar rs-sidebar-left lsb-root">
      <div className="lsb-icon-tabs">
        <button className={"lsb-icon-tab" + (tab === "channel" ? " active" : "")}
                onClick={() => setTab("channel")} title="Channel">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3v18h18"/><rect x="7" y="10" width="3" height="9"/><rect x="12" y="7" width="3" height="12"/><rect x="17" y="13" width="3" height="6"/></svg>
        </button>
        <button className={"lsb-icon-tab" + (tab === "inspector" ? " active" : "")}
                onClick={() => setTab("inspector")} title="Inspector">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
        </button>
        <button className={"lsb-icon-tab" + (tab === "visibility" ? " active" : "")}
                onClick={() => setTab("visibility")} title="Visibility">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
        </button>
        <button className={"lsb-icon-tab" + (tab === "groups" ? " active" : "")}
                onClick={() => setTab("groups")} title="Groups">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
        </button>
        <button className={"lsb-icon-tab" + (tab === "markers" ? " active" : "")}
                onClick={() => setTab("markers")} title="Markers">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
        </button>
        <button className={"lsb-icon-tab" + (tab === "project" ? " active" : "")}
                onClick={() => setTab("project")} title="Project">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
        </button>
        <button className={"lsb-icon-tab" + (tab === "history" ? " active" : "")}
                onClick={() => setTab("history")} title="History">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3v5h5"/><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"/><path d="M12 7v5l4 2"/></svg>
        </button>
      </div>

      <div className="rs-sb-content lsb-content">
        {/* ═══════════ CHANNEL TAB ═══════════ */}
        {tab === "channel" && !t && <div className="rs-sb-empty">Click any track to inspect it</div>}
        {tab === "channel" && t && (
          <div className="lsb-channel">
            <div className="lsb-hdr">
              <div className="lsb-color-tag" style={{background: t.color || "#00ffc8"}}/>
              <input className="lsb-name" type="text" value={t.name || ""}
                     onChange={e => onUpdateTrack && onUpdateTrack(selectedTrack, { name: e.target.value })}/>
              <input className="lsb-color-picker" type="color" value={t.color || "#00ffc8"}
                     onChange={e => onUpdateTrack && onUpdateTrack(selectedTrack, { color: e.target.value })}/>
            </div>

            {/* Input stage: Trim / Phase / HPF */}
            <div className="lsb-block">
              <div className="lsb-block-hdr">INPUT STAGE</div>
              <div className="lsb-input-stage">
                <MiniKnob value={t.inputTrim != null ? t.inputTrim : 0} min={-24} max={24}
                          onChange={v => onUpdateTrack && onUpdateTrack(selectedTrack, { inputTrim: v })}
                          label="TRIM" unit=" dB" format={v => v.toFixed(1)}/>
                <button className={"lsb-toggle-btn" + (t.phaseFlipped ? " on" : "")}
                        onClick={() => onUpdateTrack && onUpdateTrack(selectedTrack, { phaseFlipped: !t.phaseFlipped })}
                        title="Polarity invert (180°)">Ø</button>
                <button className={"lsb-toggle-btn" + (t.hpfOn ? " on" : "")}
                        onClick={() => onUpdateTrack && onUpdateTrack(selectedTrack, { hpfOn: !t.hpfOn })}
                        title="High-pass filter">HPF</button>
                {t.hpfOn && (
                  <MiniKnob value={t.hpfFreq != null ? t.hpfFreq : 80} min={20} max={500}
                            onChange={v => onUpdateTrack && onUpdateTrack(selectedTrack, { hpfFreq: v })}
                            label="FREQ" unit=" Hz" format={v => Math.round(v)}/>
                )}
              </div>
            </div>

            <div className="lsb-block">
              <div className="lsb-block-hdr">EQ CURVE</div>
              <MiniEQ bands={t.eqBands || [
                { freq: 100, gain: t.eqLow || 0, q: 0.7 },
                { freq: 500, gain: t.eqLowMid || 0, q: 0.7 },
                { freq: 3000, gain: t.eqHighMid || 0, q: 0.7 },
                { freq: 10000, gain: t.eqHigh || 0, q: 0.7 },
              ]}/>
            </div>

            {/* Part 10: MUSIC INFO — auto-detected BPM / key / loudness with
                inline manual override. Anything the user types becomes the
                authoritative value (metadata.bpmManual / metadata.keyManual)
                so a re-import of the same audio doesn't clobber their edit. */}
            <div className="lsb-block">
              <div className="lsb-block-hdr">MUSIC INFO</div>
              {(() => {
                const m = t.metadata;
                if (!m) return <div className="lsb-empty-sm">Drop or import an audio file to analyze</div>;
                const bpmConf = m.bpm?.confidence ?? 0;
                const keyConf = m.key?.confidence ?? 0;
                const dot = (c) => c >= 1.5 ? "#3fbf5f" : c >= 1.15 ? "#bfbf3f" : "#bf3f5f";
                const writeMeta = (patch) => onUpdateTrack && onUpdateTrack(selectedTrack, { metadata: { ...m, ...patch } });
                const ALL_KEYS = [];
                ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"].forEach((n, r) => {
                  ALL_KEYS.push({ label: `${n} major`, root: r, scale: "major" });
                  ALL_KEYS.push({ label: `${n} minor`, root: r, scale: "minor" });
                });
                return (
                  <div className="lsb-music-info">
                    <div className="lsb-mi-row">
                      <span className="lsb-mi-label">BPM</span>
                      <input className="lsb-mi-input" type="number" min={20} max={300} step={1}
                        value={Math.round((m.bpm?.bpm) ?? 0) || ""}
                        placeholder="—"
                        onChange={e => {
                          const v = parseInt(e.target.value, 10);
                          if (!isFinite(v)) return;
                          writeMeta({ bpm: { ...(m.bpm || {}), bpm: v }, bpmManual: true });
                        }}/>
                      <span className="lsb-mi-conf" style={{background: dot(bpmConf)}} title={`BPM confidence ${bpmConf} (runner-up ${m.bpm?.runnerUp ?? "?"} BPM)`}/>
                      {m.bpmManual && <span className="lsb-mi-edited" title="Manually overridden">✎</span>}
                    </div>
                    <div className="lsb-mi-row">
                      <span className="lsb-mi-label">KEY</span>
                      <select className="lsb-mi-select"
                        value={`${m.key?.root ?? 0}-${m.key?.scale ?? "major"}`}
                        onChange={e => {
                          const [rs, sc] = e.target.value.split("-");
                          const root = parseInt(rs, 10);
                          const camMaj = ["8B","3B","10B","5B","12B","7B","2B","9B","4B","11B","6B","1B"];
                          const camMin = ["5A","12A","7A","2A","9A","4A","11A","6A","1A","8A","3A","10A"];
                          const NOTES = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
                          writeMeta({ key: { ...(m.key || {}), root, scale: sc, camelot: sc === "major" ? camMaj[root] : camMin[root], key: `${NOTES[root]} ${sc}` }, keyManual: true });
                        }}>
                        {ALL_KEYS.map(k => <option key={k.label} value={`${k.root}-${k.scale}`}>{k.label}</option>)}
                      </select>
                      {m.key?.camelot && <span className="lsb-mi-camelot" style={{background: ({"1A":"#8b5fbf","1B":"#a47cd6","2A":"#5f7fbf","2B":"#7c9cd6","3A":"#4f9fbf","3B":"#6cbcd6","4A":"#3fbfa0","4B":"#5cd6bd","5A":"#3fbf5f","5B":"#5cd67c","6A":"#7fbf3f","6B":"#9cd65c","7A":"#bfbf3f","7B":"#d6d65c","8A":"#bf9f3f","8B":"#d6bc5c","9A":"#bf7f3f","9B":"#d69c5c","10A":"#bf5f3f","10B":"#d67c5c","11A":"#bf3f5f","11B":"#d65c7c","12A":"#bf3f9f","12B":"#d65cbc"})[m.key.camelot] || "#7a8aaa", color: "#06070d"}}>{m.key.camelot}</span>}
                      <span className="lsb-mi-conf" style={{background: dot(keyConf)}} title={`Key confidence ${keyConf} (runner-up ${m.key?.runnerUp ?? "?"})`}/>
                      {m.keyManual && <span className="lsb-mi-edited" title="Manually overridden">✎</span>}
                    </div>
                    <div className="lsb-mi-row">
                      <span className="lsb-mi-label">LUFS</span>
                      <span className="lsb-mi-readout">{m.loudness?.lufs != null ? `${m.loudness.lufs.toFixed(1)} dB` : "—"}</span>
                      <span className="lsb-mi-readout-sub">peak {m.loudness?.peakDb != null ? m.loudness.peakDb.toFixed(1) : "—"} dB</span>
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="lsb-block">
              <div className="lsb-block-hdr">INSERTS</div>
              <div className="lsb-inserts">
                {(() => {
                  // Bug #11 (Part 9b): derive enabled inserts from t.effects so
                  // the Console + sidebar share state. Falls back to legacy
                  // t.inserts (deprecated) if no fxRegistry was passed.
                  const enabled = fxRegistry
                    ? fxRegistry.filter(fx => t.effects?.[fx.key]?.enabled)
                    : (t.inserts || []).map((ins, i) => ({ key: `_legacy_${i}`, name: ins.name || "Insert", _legacyBypassed: ins.bypassed, _legacyIdx: i }));
                  if (enabled.length === 0) return <div className="lsb-empty-sm">No inserts</div>;
                  return enabled.map((fx, i) => (
                    <div key={fx.key} className="lsb-insert">
                      <button className="lsb-insert-enable" title="Bypass / enable"
                        onClick={() => {
                          if (fx.key.startsWith("_legacy_")) {
                            const next = [...(t.inserts || [])]; next[fx._legacyIdx] = { ...next[fx._legacyIdx], bypassed: !next[fx._legacyIdx].bypassed };
                            onUpdateTrack && onUpdateTrack(selectedTrack, { inserts: next });
                          } else if (updateEffect) {
                            updateEffect(selectedTrack, fx.key, "enabled", false);
                          }
                        }}>●</button>
                      <span className="lsb-insert-name">{i+1}. {fx.name}</span>
                      <button className="lsb-insert-x" title="Remove insert"
                        onClick={() => {
                          if (fx.key.startsWith("_legacy_")) {
                            const next = (t.inserts || []).filter((_, j) => j !== fx._legacyIdx);
                            onUpdateTrack && onUpdateTrack(selectedTrack, { inserts: next });
                          } else if (updateEffect) {
                            updateEffect(selectedTrack, fx.key, "enabled", false);
                          }
                        }}>×</button>
                    </div>
                  ));
                })()}
                <button className="lsb-insert-add" onClick={() => onTrackAction && onTrackAction("addInsert", selectedTrack)}>+ Add Insert</button>
              </div>
            </div>

            <div className="lsb-block">
              <div className="lsb-block-hdr">SENDS</div>
              <div className="lsb-sends">
                {(t.sends || []).length === 0 && <div className="lsb-empty-sm">No sends</div>}
                {(t.sends || []).map((s, i) => (
                  <div key={i} className="lsb-send">
                    <span className="lsb-send-target">→ {s.target || "—"}</span>
                    <input type="range" min="0" max="1" step="0.01" value={s.level || 0}
                      onChange={e => {
                        const next = [...(t.sends || [])];
                        next[i] = { ...s, level: parseFloat(e.target.value) };
                        onUpdateTrack && onUpdateTrack(selectedTrack, { sends: next });
                      }}/>
                    <span className="lsb-send-val">{Math.round((s.level || 0) * 100)}%</span>
                  </div>
                ))}
                <button className="lsb-insert-add" onClick={() => onTrackAction && onTrackAction("addSend", selectedTrack)}>+ Add Send</button>
              </div>
            </div>

            <div className="lsb-block">
              <div className="lsb-block-hdr">CUE / MONITOR</div>
              <div className="lsb-cue-row">
                <label>Cue Send</label>
                <input type="range" min="0" max="1" step="0.01" value={t.cueSend || 0}
                       onChange={e => onUpdateTrack && onUpdateTrack(selectedTrack, { cueSend: parseFloat(e.target.value) })}/>
                <span>{Math.round((t.cueSend || 0)*100)}%</span>
              </div>
              <div className="lsb-cue-row">
                <label>Source</label>
                <select value={t.monitorSource || "playback"}
                        onChange={e => onUpdateTrack && onUpdateTrack(selectedTrack, { monitorSource: e.target.value })}>
                  <option value="playback">Playback</option>
                  <option value="input">Input</option>
                  <option value="auto">Auto</option>
                </select>
              </div>
            </div>

            <div className="lsb-block">
              <div className="lsb-block-hdr">ROUTING</div>
              <div className="lsb-routing">
                <div className="lsb-route-row">
                  <label>IN</label>
                  <select value={t.input || "Stereo In"}
                          onChange={e => onUpdateTrack && onUpdateTrack(selectedTrack, { input: e.target.value })}>
                    <option>Stereo In</option><option>Mono In 1</option><option>Mono In 2</option>
                    <option>Mic Input</option><option>Line Input</option>
                  </select>
                </div>
                <div className="lsb-route-row">
                  <label>OUT</label>
                  <select value={t.output || "Master"}
                          onChange={e => onUpdateTrack && onUpdateTrack(selectedTrack, { output: e.target.value })}>
                    <option>Master</option><option>Bus 1</option><option>Bus 2</option>
                    <option>Group A</option><option>Group B</option>
                  </select>
                </div>
                <div className="lsb-route-row">
                  <label>GRP</label>
                  <select value={t.group || ""} onChange={e => {
                    const gid = e.target.value;
                    onUpdateTrack && onUpdateTrack(selectedTrack, { group: gid });
                    if (gid) assignTrackToGroup(selectedTrack, gid);
                  }}>
                    <option value="">None</option>
                    {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="lsb-block">
              <div className="lsb-block-hdr">AUTOMATION LANE</div>
              <div className="lsb-route-row">
                <label>Param</label>
                <select value={t.automationParam || "Volume"}
                        onChange={e => onUpdateTrack && onUpdateTrack(selectedTrack, { automationParam: e.target.value })}>
                  {AUTO_PARAMS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="lsb-route-row">
                <label>Mode</label>
                <select value={t.automationMode || "read"}
                        onChange={e => onUpdateTrack && onUpdateTrack(selectedTrack, { automationMode: e.target.value })}>
                  <option value="off">Off</option><option value="read">Read</option>
                  <option value="touch">Touch</option><option value="latch">Latch</option><option value="write">Write</option>
                </select>
              </div>
            </div>

            <div className="lsb-msr">
              <button className={"lsb-msr-btn" + (t.muted ? " on" : "")}
                      onClick={() => onUpdateTrack && onUpdateTrack(selectedTrack, { muted: !t.muted })}>M</button>
              <button className={"lsb-msr-btn" + (t.solo ? " solo" : "")}
                      onClick={() => onUpdateTrack && onUpdateTrack(selectedTrack, { solo: !t.solo })}>S</button>
              <button className={"lsb-msr-btn" + (t.armed ? " rec" : "")}
                      onClick={() => onUpdateTrack && onUpdateTrack(selectedTrack, { armed: !t.armed })}>R</button>
              {t.frozen && <span className="lsb-frozen">❄ FROZEN</span>}
            </div>

            <div className="lsb-pan-row">
              <div className="lsb-pan-label">PAN</div>
              <PanKnob value={t.pan || 0} onChange={v => onUpdateTrack && onUpdateTrack(selectedTrack, { pan: v })}/>
            </div>

            <div className="lsb-fader-row">
              <ChannelFader value={t.volume != null ? t.volume : 1.0}
                            onChange={v => onUpdateTrack && onUpdateTrack(selectedTrack, { volume: v })}/>
              <LevelMeter peakL={t.peakL || 0} peakR={t.peakR || 0}/>
            </div>

            <div className="lsb-readouts">
              <div className="lsb-readout"><span>Volume</span><strong>{t.volume > 0 ? (20*Math.log10(t.volume)).toFixed(1) : "-∞"} dB</strong></div>
              <div className="lsb-readout"><span>Peak</span><strong>{t.peakL > 0 ? (20*Math.log10(Math.max(t.peakL, t.peakR || 0))).toFixed(1) : "-∞"} dB</strong></div>
              <div className="lsb-readout"><span>RMS</span><strong>{t.rms != null ? t.rms.toFixed(1) : "—"} dB</strong></div>
            </div>
          </div>
        )}

        {/* ═══════════ INSPECTOR TAB ═══════════ */}
        {tab === "inspector" && !t && <div className="rs-sb-empty">Select a track first</div>}
        {tab === "inspector" && t && (
          <div className="lsb-inspector">
            <div className="lsb-block">
              <div className="lsb-block-hdr">TRACK INFO</div>
              <div className="lsb-kv"><label>Type</label><span>{t.trackType || "audio"}</span></div>
              <div className="lsb-kv"><label>Channels</label><span>{t.channels || "Stereo"}</span></div>
              <div className="lsb-kv"><label>Sample Rate</label><span>{t.sampleRate || "48 kHz"}</span></div>
              <div className="lsb-kv"><label>Bit Depth</label><span>{t.bitDepth || "24-bit"}</span></div>
              <div className="lsb-kv"><label>Duration</label><span>{t.duration != null ? `${t.duration.toFixed(2)}s` : "—"}</span></div>
            </div>
            <div className="lsb-block">
              <div className="lsb-block-hdr">TIMING</div>
              <div className="lsb-kv"><label>Delay</label>
                <input type="number" value={t.delay || 0} step="1"
                       onChange={e => onUpdateTrack && onUpdateTrack(selectedTrack, { delay: parseInt(e.target.value) || 0 })}/><span>ms</span>
              </div>
              <div className="lsb-kv"><label>Quantize</label>
                <select value={t.quantize || "off"} onChange={e => onUpdateTrack && onUpdateTrack(selectedTrack, { quantize: e.target.value })}>
                  <option value="off">Off</option><option value="1/4">1/4</option><option value="1/8">1/8</option>
                  <option value="1/16">1/16</option><option value="1/32">1/32</option>
                </select>
              </div>
              <div className="lsb-kv"><label>Swing</label>
                <input type="range" min="0" max="100" value={t.swing || 0}
                       onChange={e => onUpdateTrack && onUpdateTrack(selectedTrack, { swing: parseInt(e.target.value) })}/>
                <span>{t.swing || 0}%</span>
              </div>
            </div>
            <div className="lsb-block">
              <div className="lsb-block-hdr">NOTES</div>
              <textarea className="lsb-notes" value={t.notes || ""}
                        onChange={e => onUpdateTrack && onUpdateTrack(selectedTrack, { notes: e.target.value })}
                        placeholder="Add notes about this track..."/>
            </div>
          </div>
        )}

        {/* ═══════════ VISIBILITY TAB ═══════════ */}
        {tab === "visibility" && (
          <div className="lsb-visibility">
            <div className="lsb-viz-toolbar">
              <input className="lsb-viz-search" type="text" placeholder="Search tracks..."
                     value={vizSearch} onChange={e => setVizSearch(e.target.value)}/>
              <div className="lsb-viz-bulk">
                <button onClick={showAll}>Show All</button>
                <button onClick={hideAll}>Hide All</button>
              </div>
            </div>
            <div className="lsb-viz-count">{filteredTracks.length} of {tracks.length} tracks</div>
            <div className="lsb-viz-list">
              {filteredTracks.length === 0 && <div className="rs-sb-empty">No tracks match</div>}
              {filteredTracks.map(tr => (
                <div key={tr._i}
                     className={"lsb-viz-row" + (tr._i === selectedTrack ? " active" : "") + (tr.visible === false ? " hidden" : "")}
                     onClick={() => onSelectTrack && onSelectTrack(tr._i)}>
                  <input type="checkbox" checked={tr.visible !== false}
                         onClick={e => e.stopPropagation()}
                         onChange={e => onToggleVisible && onToggleVisible(tr._i, e.target.checked)}/>
                  <span className="lsb-viz-num">{tr._i + 1}</span>
                  <div className="lsb-viz-color" style={{background: tr.color || "#2a3248"}}/>
                  <span className="lsb-viz-name">{tr.name || `Track ${tr._i+1}`}</span>
                  <div className="lsb-viz-badges">
                    {tr.muted && <span className="lsb-viz-b mute">M</span>}
                    {tr.solo && <span className="lsb-viz-b solo">S</span>}
                    {tr.armed && <span className="lsb-viz-b rec">R</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══════════ GROUPS TAB ═══════════ */}
        {tab === "groups" && (
          <div className="lsb-groups">
            <div className="lsb-tab-hdr">
              <div className="lsb-tab-title">TRACK GROUPS</div>
              <button className="lsb-btn-sm" onClick={addGroup}>+ New Group</button>
            </div>
            {groups.length === 0 && <div className="rs-sb-empty">No groups yet<br/><span className="rs-sb-hint">Create groups to organize tracks (Drums, Vocals, FX, etc.)</span></div>}
            {groups.map(g => (
              <div key={g.id} className="lsb-group" style={{borderLeftColor: g.color}}>
                <div className="lsb-group-hdr">
                  <button className="lsb-group-toggle" onClick={() => toggleGroupCollapse(g.id)}>
                    {g.collapsed ? "▶" : "▼"}
                  </button>
                  <div className="lsb-group-color" style={{background: g.color}}/>
                  <span className="lsb-group-name">{g.name}</span>
                  <span className="lsb-group-count">{g.trackIds.length}</span>
                  <button className={"lsb-msr-btn sm" + (g.muted ? " on" : "")}
                          onClick={() => toggleGroupMute(g.id)}>M</button>
                  <button className="lsb-insert-x" onClick={() => deleteGroup(g.id)}>×</button>
                </div>
                {!g.collapsed && (
                  <div className="lsb-group-tracks">
                    {g.trackIds.length === 0 && <div className="lsb-empty-sm">No tracks — assign from Channel tab routing</div>}
                    {g.trackIds.map(ti => {
                      const tr = tracks[ti];
                      if (!tr) return null;
                      return (
                        <div key={ti} className="lsb-group-track" onClick={() => onSelectTrack && onSelectTrack(ti)}>
                          <div className="lsb-viz-color" style={{background: tr.color || "#2a3248"}}/>
                          <span>{tr.name || `Track ${ti+1}`}</span>
                          <button className="lsb-insert-x" onClick={e => { e.stopPropagation(); removeTrackFromGroup(ti, g.id); }}>×</button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ═══════════ MARKERS TAB ═══════════ */}
        {tab === "markers" && (
          <div className="lsb-markers">
            <div className="lsb-tab-hdr">
              <div className="lsb-tab-title">SONG MARKERS</div>
              <button className="lsb-btn-sm" onClick={addMarker}>+ New Marker</button>
            </div>
            {markers.length === 0 && <div className="rs-sb-empty">No markers yet<br/><span className="rs-sb-hint">Add markers like Intro, Verse, Chorus, Bridge, Outro to navigate your song</span></div>}
            {markers.map(m => (
              <div key={m.id} className="lsb-marker" style={{borderLeftColor: m.color}} onClick={() => jumpToMarker(m)}>
                <div className="lsb-marker-color" style={{background: m.color}}/>
                <span className="lsb-marker-name">{m.name}</span>
                <span className="lsb-marker-time">{Math.floor(m.time / 60)}:{String(Math.floor(m.time % 60)).padStart(2,"0")}</span>
                <button className="lsb-insert-x" onClick={e => { e.stopPropagation(); deleteMarker(m.id); }}>×</button>
              </div>
            ))}
          </div>
        )}

        {/* ═══════════ PROJECT TAB ═══════════ */}
        {tab === "project" && (
          <div className="lsb-project">
            <div className="lsb-tab-hdr">
              <div className="lsb-tab-title">PROJECT METADATA</div>
            </div>
            <div className="lsb-block">
              <div className="lsb-block-hdr">BASIC</div>
              <div className="lsb-kv"><label>Title</label>
                <input type="text" value={projectName} onChange={e => onProjectNameChange && onProjectNameChange(e.target.value)}/>
              </div>
              <div className="lsb-kv"><label>Artist</label>
                <input type="text" value={projectMeta.artist || ""} onChange={e => updateMeta("artist", e.target.value)}/>
              </div>
              <div className="lsb-kv"><label>Genre</label>
                <select value={projectMeta.genre || ""} onChange={e => updateMeta("genre", e.target.value)}>
                  <option value="">—</option>
                  <option>Hip Hop</option><option>R&B</option><option>Pop</option><option>Rock</option>
                  <option>EDM</option><option>House</option><option>Trap</option><option>Lo-Fi</option>
                  <option>Jazz</option><option>Classical</option><option>Country</option><option>Folk</option>
                  <option>Reggae</option><option>Afrobeats</option><option>Latin</option><option>Other</option>
                </select>
              </div>
              <div className="lsb-kv"><label>Key</label>
                <select value={projectMeta.key || ""} onChange={e => updateMeta("key", e.target.value)}>
                  <option value="">—</option>
                  {["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"].map(k => [
                    <option key={k+"maj"} value={`${k} Maj`}>{k} Major</option>,
                    <option key={k+"min"} value={`${k} Min`}>{k} Minor</option>
                  ])}
                </select>
              </div>
              <div className="lsb-kv"><label>BPM</label>
                <input type="number" value={bpm} min="40" max="300" step="1"
                       onChange={e => onBpmChange && onBpmChange(parseInt(e.target.value) || 120)}/>
              </div>
              <div className="lsb-kv"><label>Time Sig</label>
                <select value={projectMeta.timeSig || "4/4"} onChange={e => updateMeta("timeSig", e.target.value)}>
                  <option>4/4</option><option>3/4</option><option>6/8</option><option>5/4</option><option>7/8</option>
                </select>
              </div>
            </div>
            <div className="lsb-block">
              <div className="lsb-block-hdr">CREDITS</div>
              <div className="lsb-kv"><label>Composer</label>
                <input type="text" value={projectMeta.composer || ""} onChange={e => updateMeta("composer", e.target.value)}/>
              </div>
              <div className="lsb-kv"><label>Producer</label>
                <input type="text" value={projectMeta.producer || ""} onChange={e => updateMeta("producer", e.target.value)}/>
              </div>
              <div className="lsb-kv"><label>Engineer</label>
                <input type="text" value={projectMeta.engineer || ""} onChange={e => updateMeta("engineer", e.target.value)}/>
              </div>
              <div className="lsb-kv"><label>© Year</label>
                <input type="number" value={projectMeta.year || new Date().getFullYear()} min="1900" max="2100"
                       onChange={e => updateMeta("year", parseInt(e.target.value))}/>
              </div>
              <div className="lsb-kv"><label>ISRC</label>
                <input type="text" placeholder="AA-AAA-YY-NNNNN" value={projectMeta.isrc || ""} onChange={e => updateMeta("isrc", e.target.value)}/>
              </div>
            </div>
            <div className="lsb-block">
              <div className="lsb-block-hdr">STATS</div>
              <div className="lsb-kv"><label>Tracks</label><span>{tracks.length}</span></div>
              <div className="lsb-kv"><label>Sample Rate</label><span>{projectMeta.sampleRate || "48 kHz"}</span></div>
              <div className="lsb-kv"><label>Bit Depth</label><span>{projectMeta.bitDepth || "24-bit"}</span></div>
            </div>
            <div className="lsb-block">
              <div className="lsb-block-hdr">DESCRIPTION</div>
              <textarea className="lsb-notes" value={projectMeta.description || ""}
                        onChange={e => updateMeta("description", e.target.value)}
                        placeholder="Describe this project..."/>
            </div>
          </div>
        )}

        {/* ═══════════ HISTORY TAB ═══════════ */}
        {tab === "history" && (
          <div className="lsb-history">
            <div className="lsb-tab-hdr">
              <div className="lsb-tab-title">UNDO HISTORY</div>
              <span className="lsb-history-count">{history.length} actions</span>
            </div>
            {history.length === 0 && <div className="rs-sb-empty">No history yet<br/><span className="rs-sb-hint">Every action will appear here — click any to jump back</span></div>}
            {history.map((h, i) => (
              <div key={i} className={"lsb-history-row" + (i === history.length - 1 ? " current" : "")}
                   onClick={() => window.__spxJumpToHistory && window.__spxJumpToHistory(i)}>
                <span className="lsb-history-dot">{i === history.length - 1 ? "●" : "○"}</span>
                <span className="lsb-history-action">{h.action || "Action"}</span>
                <span className="lsb-history-time">{h.time ? new Date(h.time).toLocaleTimeString() : ""}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LeftSidebar;
