import React, { useState, useEffect, useRef, useCallback } from "react";

// ── Mini fader component (thin SVG, 140px tall) ──
const DB_MIN = -60, DB_MAX = 6;
const volumeToPos = (vol) => {
  if (vol <= 0) return 0;
  const db = 20 * Math.log10(vol);
  if (db >= DB_MAX) return 1;
  if (db <= DB_MIN) return 0;
  if (db >= 0) return 0.75 + (db / DB_MAX) * 0.25;
  const norm = Math.pow(10, db / 24);
  return norm * 0.75;
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

// ── Pan knob (rotary) ──
const PanKnob = ({ value = 0, onChange, size = 36 }) => {
  const ref = useRef(null);
  const startY = useRef(0);
  const startVal = useRef(0);
  const angle = value * 135;  // -1..1 -> -135..135 deg

  const handleDown = (e) => {
    e.preventDefault();
    startY.current = e.clientY;
    startVal.current = value;
    const onMove = (ev) => {
      const dy = startY.current - ev.clientY;
      const newVal = Math.max(-1, Math.min(1, startVal.current + dy * 0.005));
      onChange && onChange(newVal);
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

// ── Mini EQ curve preview ──
const MiniEQ = ({ bands = [] }) => {
  // bands = [{freq, gain, q}, ...]  — synthesize a simple curve
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
    const y = 20 - g * 1.5;  // center=20, +1dB=-1.5px
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

// ── Level meter (vertical) ──
const LevelMeter = ({ peakL = 0, peakR = 0, height = 140 }) => {
  const toY = (p) => {
    if (p <= 0) return height;
    const db = 20 * Math.log10(p);
    if (db >= 6) return 0;
    if (db <= -60) return height;
    const norm = volumeToPos(p);
    return height - norm * height;
  };
  const yL = toY(peakL);
  const yR = toY(peakR);

  return (
    <svg width="12" height={height} className="lsb-meter">
      <defs>
        <linearGradient id="lsb-mtr-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ff3030"/>
          <stop offset="15%" stopColor="#ffaa00"/>
          <stop offset="45%" stopColor="#ffee00"/>
          <stop offset="60%" stopColor="#00ffc8"/>
          <stop offset="100%" stopColor="#006655"/>
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="5" height={height} fill="#060a10" stroke="#0d1520"/>
      <rect x="7" y="0" width="5" height={height} fill="#060a10" stroke="#0d1520"/>
      <rect x="0" y={yL} width="5" height={height - yL} fill="url(#lsb-mtr-grad)"/>
      <rect x="7" y={yR} width="5" height={height - yR} fill="url(#lsb-mtr-grad)"/>
    </svg>
  );
};

// ═════════════════════════════════════════════════════════════
// LEFT SIDEBAR MAIN
// ═════════════════════════════════════════════════════════════
const LeftSidebar = ({
  tracks = [],
  selectedTrack = 0,
  onSelectTrack,
  onToggleVisible,
  onUpdateTrack,
  onTrackAction,
}) => {
  const [tab, setTab] = useState(() => localStorage.getItem("rs_left_tab") || "channel");
  const [vizSearch, setVizSearch] = useState("");
  useEffect(() => { localStorage.setItem("rs_left_tab", tab); }, [tab]);

  const t = tracks[selectedTrack] || null;

  // Bulk track ops for Visibility tab
  const showAll = () => tracks.forEach((_, i) => onToggleVisible && onToggleVisible(i, true));
  const hideAll = () => tracks.forEach((_, i) => onToggleVisible && onToggleVisible(i, false));

  const filteredTracks = tracks.map((tr, i) => ({ ...tr, _i: i }))
    .filter(tr => !vizSearch || (tr.name || "").toLowerCase().includes(vizSearch.toLowerCase()));

  return (
    <div className="rs-sidebar rs-sidebar-left lsb-root">
      <div className="rs-sb-tabs">
        <button className={"rs-sb-tab" + (tab === "channel" ? " active" : "")} onClick={() => setTab("channel")}>Channel</button>
        <button className={"rs-sb-tab" + (tab === "inspector" ? " active" : "")} onClick={() => setTab("inspector")}>Inspector</button>
        <button className={"rs-sb-tab" + (tab === "visibility" ? " active" : "")} onClick={() => setTab("visibility")}>Visibility</button>
      </div>

      <div className="rs-sb-content lsb-content">
        {/* ═══════════ CHANNEL TAB ═══════════ */}
        {tab === "channel" && !t && <div className="rs-sb-empty">Click any track to inspect it</div>}
        {tab === "channel" && t && (
          <div className="lsb-channel">
            {/* Header: name + color */}
            <div className="lsb-hdr">
              <div className="lsb-color-tag" style={{background: t.color || "#00ffc8"}}/>
              <input className="lsb-name" type="text" value={t.name || ""}
                     onChange={e => onUpdateTrack && onUpdateTrack(selectedTrack, { name: e.target.value })}/>
              <input className="lsb-color-picker" type="color" value={t.color || "#00ffc8"}
                     onChange={e => onUpdateTrack && onUpdateTrack(selectedTrack, { color: e.target.value })}/>
            </div>

            {/* EQ curve preview */}
            <div className="lsb-block">
              <div className="lsb-block-hdr">EQ CURVE</div>
              <MiniEQ bands={t.eqBands || [
                { freq: 100, gain: t.eqLow || 0, q: 0.7 },
                { freq: 500, gain: t.eqLowMid || 0, q: 0.7 },
                { freq: 3000, gain: t.eqHighMid || 0, q: 0.7 },
                { freq: 10000, gain: t.eqHigh || 0, q: 0.7 },
              ]}/>
            </div>

            {/* Inserts */}
            <div className="lsb-block">
              <div className="lsb-block-hdr">INSERTS</div>
              <div className="lsb-inserts">
                {(t.inserts || []).length === 0 && <div className="lsb-empty-sm">No inserts</div>}
                {(t.inserts || []).map((ins, i) => (
                  <div key={i} className={"lsb-insert" + (ins.bypassed ? " bypassed" : "")}>
                    <button className="lsb-insert-enable" onClick={() => {
                      const next = [...(t.inserts || [])];
                      next[i] = { ...ins, bypassed: !ins.bypassed };
                      onUpdateTrack && onUpdateTrack(selectedTrack, { inserts: next });
                    }}>{ins.bypassed ? "○" : "●"}</button>
                    <span className="lsb-insert-name">{i+1}. {ins.name || "Insert"}</span>
                    <button className="lsb-insert-x" onClick={() => {
                      const next = (t.inserts || []).filter((_, j) => j !== i);
                      onUpdateTrack && onUpdateTrack(selectedTrack, { inserts: next });
                    }}>×</button>
                  </div>
                ))}
                <button className="lsb-insert-add" onClick={() => onTrackAction && onTrackAction("addInsert", selectedTrack)}>+ Add Insert</button>
              </div>
            </div>

            {/* Sends */}
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

            {/* Routing */}
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
              </div>
            </div>

            {/* Transport buttons */}
            <div className="lsb-msr">
              <button className={"lsb-msr-btn" + (t.muted ? " on" : "")}
                      onClick={() => onUpdateTrack && onUpdateTrack(selectedTrack, { muted: !t.muted })}>M</button>
              <button className={"lsb-msr-btn" + (t.solo ? " solo" : "")}
                      onClick={() => onUpdateTrack && onUpdateTrack(selectedTrack, { solo: !t.solo })}>S</button>
              <button className={"lsb-msr-btn" + (t.armed ? " rec" : "")}
                      onClick={() => onUpdateTrack && onUpdateTrack(selectedTrack, { armed: !t.armed })}>R</button>
            </div>

            {/* Pan */}
            <div className="lsb-pan-row">
              <div className="lsb-pan-label">PAN</div>
              <PanKnob value={t.pan || 0} onChange={v => onUpdateTrack && onUpdateTrack(selectedTrack, { pan: v })}/>
            </div>

            {/* Fader + meter */}
            <div className="lsb-fader-row">
              <ChannelFader value={t.volume != null ? t.volume : 1.0}
                            onChange={v => onUpdateTrack && onUpdateTrack(selectedTrack, { volume: v })}/>
              <LevelMeter peakL={t.peakL || 0} peakR={t.peakR || 0}/>
            </div>

            {/* Readouts */}
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
              <div className="lsb-block-hdr">AUTOMATION</div>
              <div className="lsb-kv"><label>Mode</label>
                <select value={t.automationMode || "read"}
                        onChange={e => onUpdateTrack && onUpdateTrack(selectedTrack, { automationMode: e.target.value })}>
                  <option value="off">Off</option><option value="read">Read</option>
                  <option value="touch">Touch</option><option value="latch">Latch</option><option value="write">Write</option>
                </select>
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
      </div>
    </div>
  );
};

export default LeftSidebar;
