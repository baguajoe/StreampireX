import React, { useState, useEffect } from "react";

const LeftSidebar = ({ tracks = [], selectedTrack = 0, onSelectTrack, onToggleVisible, onUpdateTrack, onRouting }) => {
  const [tab, setTab] = useState(() => localStorage.getItem("rs_left_tab") || "channel");
  useEffect(() => { localStorage.setItem("rs_left_tab", tab); }, [tab]);

  const t = tracks[selectedTrack] || null;

  return (
    <div className="rs-sidebar rs-sidebar-left">
      <div className="rs-sb-tabs">
        <button className={"rs-sb-tab" + (tab === "channel" ? " active" : "")} onClick={() => setTab("channel")}>Channel</button>
        <button className={"rs-sb-tab" + (tab === "inspector" ? " active" : "")} onClick={() => setTab("inspector")}>Inspector</button>
        <button className={"rs-sb-tab" + (tab === "visibility" ? " active" : "")} onClick={() => setTab("visibility")}>Visibility</button>
      </div>

      <div className="rs-sb-content">
        {tab === "channel" && (
          <div className="rs-sb-section">
            <div className="rs-sb-section-hdr">CHANNEL — {t ? t.name : "No selection"}</div>
            {t ? (
              <div className="rs-sb-channel">
                <div className="rs-sb-row"><label>NAME</label>
                  <input type="text" value={t.name || ""} onChange={e => onUpdateTrack && onUpdateTrack(selectedTrack, { name: e.target.value })}/>
                </div>
                <div className="rs-sb-row"><label>COLOR</label>
                  <input type="color" value={t.color || "#00ffc8"} onChange={e => onUpdateTrack && onUpdateTrack(selectedTrack, { color: e.target.value })}/>
                </div>
                <div className="rs-sb-row"><label>TYPE</label><span>{t.trackType || "audio"}</span></div>
                <div className="rs-sb-row"><label>INPUT</label><span>{t.input || "Stereo In"}</span></div>
                <div className="rs-sb-row"><label>OUTPUT</label><span>{t.output || "Master"}</span></div>
                <div className="rs-sb-row"><label>VOLUME</label><span>{t.volume > 0 ? (20 * Math.log10(t.volume)).toFixed(1) : "-∞"} dB</span></div>
                <div className="rs-sb-row"><label>PAN</label><span>{t.pan === 0 ? "C" : (t.pan > 0 ? `R${Math.round(t.pan*100)}` : `L${Math.round(Math.abs(t.pan)*100)}`)}</span></div>
                <div className="rs-sb-row"><label>MUTE</label><span>{t.muted ? "ON" : "OFF"}</span></div>
                <div className="rs-sb-row"><label>SOLO</label><span>{t.solo ? "ON" : "OFF"}</span></div>
                <div className="rs-sb-row"><label>ARMED</label><span>{t.armed ? "REC" : "—"}</span></div>
              </div>
            ) : (
              <div className="rs-sb-empty">Click any track to inspect it</div>
            )}
          </div>
        )}

        {tab === "inspector" && (
          <div className="rs-sb-section">
            <div className="rs-sb-section-hdr">INSPECTOR</div>
            {t ? (
              <div className="rs-sb-inspector">
                <div className="rs-sb-sub">
                  <div className="rs-sb-sub-hdr">ROUTING</div>
                  <div className="rs-sb-row"><label>Input</label><span>{t.input || "Default"}</span></div>
                  <div className="rs-sb-row"><label>Output</label><span>{t.output || "Master"}</span></div>
                  <div className="rs-sb-row"><label>Bus</label><span>{t.bus || "None"}</span></div>
                </div>
                <div className="rs-sb-sub">
                  <div className="rs-sb-sub-hdr">INSERTS</div>
                  <div className="rs-sb-row-list">
                    {(t.inserts || []).length === 0
                      ? <div className="rs-sb-empty-sm">No inserts</div>
                      : (t.inserts || []).map((ins, i) => <div key={i} className="rs-sb-chip">{ins.name || "—"}</div>)}
                  </div>
                </div>
                <div className="rs-sb-sub">
                  <div className="rs-sb-sub-hdr">SENDS</div>
                  <div className="rs-sb-row-list">
                    {(t.sends || []).length === 0
                      ? <div className="rs-sb-empty-sm">No sends</div>
                      : (t.sends || []).map((s, i) => <div key={i} className="rs-sb-chip">{s.target || "—"}</div>)}
                  </div>
                </div>
                <div className="rs-sb-sub">
                  <div className="rs-sb-sub-hdr">NOTES</div>
                  <textarea className="rs-sb-textarea" value={t.notes || ""}
                    onChange={e => onUpdateTrack && onUpdateTrack(selectedTrack, { notes: e.target.value })}
                    placeholder="Add notes about this track..."/>
                </div>
              </div>
            ) : <div className="rs-sb-empty">Select a track first</div>}
          </div>
        )}

        {tab === "visibility" && (
          <div className="rs-sb-section">
            <div className="rs-sb-section-hdr">VISIBILITY</div>
            <div className="rs-sb-visibility">
              {tracks.length === 0 && <div className="rs-sb-empty">No tracks</div>}
              {tracks.map((tr, i) => (
                <div key={i} className={"rs-sb-viz-row" + (i === selectedTrack ? " active" : "")}
                     onClick={() => onSelectTrack && onSelectTrack(i)}>
                  <input type="checkbox"
                         checked={tr.visible !== false}
                         onChange={e => { e.stopPropagation(); onToggleVisible && onToggleVisible(i, e.target.checked); }}/>
                  <span className="rs-sb-viz-num">{i + 1}</span>
                  <span className="rs-sb-viz-name" style={{color: tr.color || "#cdd9e5"}}>{tr.name || `Track ${i+1}`}</span>
                  {tr.muted && <span className="rs-sb-viz-badge">M</span>}
                  {tr.solo && <span className="rs-sb-viz-badge rs-solo">S</span>}
                  {tr.armed && <span className="rs-sb-viz-badge rs-rec">R</span>}
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
