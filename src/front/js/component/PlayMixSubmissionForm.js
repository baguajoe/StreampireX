// =============================================================================
// PlayMixSubmissionForm.js — Song submission for PlayMix with full PRO data
// Required fields for BMI, ASCAP, SESAC, GMR royalty reporting:
//   - ISRC, ISWC, songwriter info, PRO affiliation, publisher, ownership splits
//   - Explicit flag, release date, genre, BPM, key
// This form must be completed before a track is added to PlayMix rotation
// =============================================================================

import React, { useState, useRef } from "react";
import { showToast } from "../utils/toast";

const BACKEND = process.env.REACT_APP_BACKEND_URL || "";
const PROS = ["BMI", "ASCAP", "SESAC", "GMR", "SOCAN", "PRS", "GEMA", "SACEM", "APRA", "Other", "None"];
const GENRES = ["Hip Hop","R&B","Pop","Rock","Electronic","Jazz","Classical","Country","Gospel","Reggae","Latin","Alternative","Indie","Soul","Funk","Blues","Folk","Metal","Punk","Lo-Fi","Trap","Drill","Afrobeats","Dancehall","House","Techno","Drum & Bass","Ambient","Other"];
const KEYS = ["C","C#/Db","D","D#/Eb","E","F","F#/Gb","G","G#/Ab","A","A#/Bb","B"];
const MODES = ["Major","Minor"];

// ── Songwriter row ────────────────────────────────────────────────────────────
function SongwriterRow({ index, data, onChange, onRemove, canRemove }) {
  return (
    <div style={{ display:"grid", gridTemplateColumns:"2fr 2fr 1fr 1fr auto", gap:6, marginBottom:6, alignItems:"end" }}>
      <div>
        {index === 0 && <div style={{ fontSize:9, color:"#5a7088", marginBottom:3 }}>Songwriter Name *</div>}
        <input style={INP} placeholder="Full legal name" value={data.name}
          onChange={e => onChange(index, "name", e.target.value)} required />
      </div>
      <div>
        {index === 0 && <div style={{ fontSize:9, color:"#5a7088", marginBottom:3 }}>PRO Affiliation *</div>}
        <select style={INP} value={data.pro} onChange={e => onChange(index, "pro", e.target.value)}>
          <option value="">Select PRO</option>
          {PROS.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>
      <div>
        {index === 0 && <div style={{ fontSize:9, color:"#5a7088", marginBottom:3 }}>PRO IPI/CAE #</div>}
        <input style={INP} placeholder="IPI number" value={data.ipi}
          onChange={e => onChange(index, "ipi", e.target.value)} />
      </div>
      <div>
        {index === 0 && <div style={{ fontSize:9, color:"#5a7088", marginBottom:3 }}>% Share *</div>}
        <input style={INP} type="number" min={0} max={100} placeholder="%" value={data.share}
          onChange={e => onChange(index, "share", e.target.value)} required />
      </div>
      <div>
        {index === 0 && <div style={{ fontSize:9, color:"#5a7088", marginBottom:3 }}>&nbsp;</div>}
        <button type="button" onClick={() => onRemove(index)} disabled={!canRemove}
          style={{ padding:"4px 8px", background:"none", border:"1px solid #ff444444", borderRadius:3, color:"#ff4444", cursor:canRemove?"pointer":"not-allowed", opacity:canRemove?1:0.3, fontSize:12 }}>×</button>
      </div>
    </div>
  );
}

const INP = {
  background:"#06060f", border:"1px solid #1a2a3a", borderRadius:3,
  color:"#ccc", padding:"5px 8px", fontSize:11, fontFamily:"JetBrains Mono,monospace", width:"100%", boxSizing:"border-box"
};
const SL = { fontSize:9, color:"#5a7088", letterSpacing:1, textTransform:"uppercase", marginBottom:5 };

export default function PlayMixSubmissionForm({ stationId, onSuccess, onCancel }) {
  const [step, setStep] = useState(1); // 1=track info, 2=rights/PRO, 3=upload
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef(null);

  // Step 1 — Track Info
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [album, setAlbum] = useState("");
  const [genre, setGenre] = useState("");
  const [bpm, setBpm] = useState("");
  const [key, setKey] = useState("");
  const [keyMode, setKeyMode] = useState("Major");
  const [releaseDate, setReleaseDate] = useState("");
  const [duration, setDuration] = useState("");
  const [isExplicit, setIsExplicit] = useState(false);
  const [language, setLanguage] = useState("English");
  const [label, setLabel] = useState("");

  // Step 2 — Rights & PRO
  const [isrc, setIsrc] = useState("");
  const [iswc, setIswc] = useState("");
  const [songwriters, setSongwriters] = useState([
    { name: "", pro: "", ipi: "", share: "100" }
  ]);
  const [publisher, setPublisher] = useState("");
  const [publisherPro, setPublisherPro] = useState("");
  const [publisherIpi, setPublisherIpi] = useState("");
  const [masterOwner, setMasterOwner] = useState("");
  const [syncRights, setSyncRights] = useState(true);
  const [performanceRights, setPerformanceRights] = useState(true);
  const [mechanicalRights, setMechanicalRights] = useState(true);
  const [exclusiveToStation, setExclusiveToStation] = useState(false);
  const [license, setLicense] = useState("all_rights_reserved");
  const [notes, setNotes] = useState("");

  // Step 3 — File
  const [audioFile, setAudioFile] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  // ── Songwriter handlers ──────────────────────────────────────────────────────
  const updateSongwriter = (i, field, val) => {
    setSongwriters(prev => prev.map((s, idx) => idx === i ? { ...s, [field]: val } : s));
  };
  const addSongwriter = () => setSongwriters(prev => [...prev, { name:"", pro:"", ipi:"", share:"" }]);
  const removeSongwriter = (i) => setSongwriters(prev => prev.filter((_, idx) => idx !== i));

  // ── Validate share percentages ───────────────────────────────────────────────
  const totalShare = songwriters.reduce((sum, s) => sum + (parseFloat(s.share) || 0), 0);
  const shareValid = Math.abs(totalShare - 100) < 0.01;

  // ── Step validation ──────────────────────────────────────────────────────────
  const step1Valid = title.trim() && artist.trim() && genre && releaseDate;
  const step2Valid = songwriters.every(s => s.name.trim() && s.pro && s.share) && shareValid;
  const step3Valid = !!audioFile;

  // ── Submit ───────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!step3Valid) return;
    setSubmitting(true);

    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    const formData = new FormData();

    // Track info
    formData.append("title", title);
    formData.append("artist", artist);
    formData.append("album", album);
    formData.append("genre", genre);
    formData.append("bpm", bpm);
    formData.append("key", `${key} ${keyMode}`);
    formData.append("release_date", releaseDate);
    formData.append("duration", duration);
    formData.append("is_explicit", isExplicit);
    formData.append("language", language);
    formData.append("label", label);

    // Rights & PRO
    formData.append("isrc", isrc);
    formData.append("iswc", iswc);
    formData.append("songwriters", JSON.stringify(songwriters));
    formData.append("publisher", publisher);
    formData.append("publisher_pro", publisherPro);
    formData.append("publisher_ipi", publisherIpi);
    formData.append("master_owner", masterOwner);
    formData.append("sync_rights", syncRights);
    formData.append("performance_rights", performanceRights);
    formData.append("mechanical_rights", mechanicalRights);
    formData.append("exclusive_to_station", exclusiveToStation);
    formData.append("license", license);
    formData.append("notes", notes);

    // Files
    formData.append("audio", audioFile);
    if (coverFile) formData.append("cover", coverFile);

    try {
      const xhr = new XMLHttpRequest();
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) setUploadProgress(Math.round(e.loaded / e.total * 100));
      };
      xhr.onload = () => {
        if (xhr.status < 300) {
          showToast.success("Track submitted to PlayMix!");
          onSuccess?.();
        } else {
          const err = JSON.parse(xhr.responseText);
          showToast.error(err.error || "Submission failed");
        }
        setSubmitting(false);
      };
      xhr.onerror = () => { showToast.error("Network error"); setSubmitting(false); };
      xhr.open("POST", `${BACKEND}/api/radio/${stationId}/playmix/submit`);
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      xhr.send(formData);
    } catch (err) {
      showToast.error(err.message);
      setSubmitting(false);
    }
  };

  const S = {
    wrap: { background:"#06060f", border:"1px solid #1a2a3a", borderRadius:8, fontFamily:"JetBrains Mono,monospace", fontSize:11, color:"#ccc", maxWidth:720, margin:"0 auto" },
    header: { padding:"12px 16px", background:"#0a0a14", borderBottom:"1px solid #1a2a3a", display:"flex", alignItems:"center", gap:10 },
    body: { padding:16 },
    sec: { marginBottom:16 },
    row2: { display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:8 },
    row3: { display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:8 },
    btn: (col="#00ffc8") => ({ padding:"7px 16px", border:`1px solid ${col}44`, borderRadius:4, background:`${col}11`, color:col, cursor:"pointer", fontSize:11, fontWeight:700, fontFamily:"inherit" }),
    steps: { display:"flex", gap:0, marginBottom:16 },
    step: (active, done) => ({ flex:1, padding:"6px 0", textAlign:"center", fontSize:10, fontWeight:700, background:done?"#00ffc811":active?"#00ffc822":"transparent", color:done||active?"#00ffc8":"#5a7088", borderBottom:`2px solid ${done?"#00ffc8":active?"#00ffc8":"transparent"}`, cursor:"pointer" }),
  };

  return (
    <div style={S.wrap}>
      <div style={S.header}>
        <span style={{ background:"#00ffc8", color:"#000", fontSize:9, fontWeight:800, padding:"2px 5px", borderRadius:3 }}>PlayMix</span>
        <span style={{ color:"#00ffc8", fontWeight:700 }}>Add Track to Rotation</span>
        <button type="button" onClick={onCancel} style={{ marginLeft:"auto", background:"none", border:"none", color:"#5a7088", cursor:"pointer", fontSize:14 }}>✕</button>
      </div>

      {/* Step indicators */}
      <div style={S.steps}>
        {[["1","Track Info"],["2","Rights & PRO"],["3","Upload"]].map(([n,l],i) => (
          <div key={n} style={S.step(step===i+1, step>i+1)} onClick={() => { if(i===0||(i===1&&step1Valid)||(i===2&&step1Valid&&step2Valid)) setStep(i+1); }}>
            {step > i+1 ? "✓ " : n+". "}{l}
          </div>
        ))}
      </div>

      <div style={S.body}>
        <form onSubmit={handleSubmit}>

          {/* ── STEP 1: Track Info ── */}
          {step === 1 && (
            <div style={S.sec}>
              <div style={SL}>Track Information</div>

              <div style={S.row2}>
                <div>
                  <div style={{ fontSize:9, color:"#5a7088", marginBottom:3 }}>Song Title *</div>
                  <input style={INP} placeholder="Official song title" value={title} onChange={e => setTitle(e.target.value)} required />
                </div>
                <div>
                  <div style={{ fontSize:9, color:"#5a7088", marginBottom:3 }}>Artist Name *</div>
                  <input style={INP} placeholder="Primary artist" value={artist} onChange={e => setArtist(e.target.value)} required />
                </div>
              </div>

              <div style={S.row2}>
                <div>
                  <div style={{ fontSize:9, color:"#5a7088", marginBottom:3 }}>Album / EP</div>
                  <input style={INP} placeholder="Album or EP name" value={album} onChange={e => setAlbum(e.target.value)} />
                </div>
                <div>
                  <div style={{ fontSize:9, color:"#5a7088", marginBottom:3 }}>Record Label</div>
                  <input style={INP} placeholder="Label or 'Independent'" value={label} onChange={e => setLabel(e.target.value)} />
                </div>
              </div>

              <div style={S.row3}>
                <div>
                  <div style={{ fontSize:9, color:"#5a7088", marginBottom:3 }}>Genre *</div>
                  <select style={INP} value={genre} onChange={e => setGenre(e.target.value)} required>
                    <option value="">Select genre</option>
                    {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div>
                  <div style={{ fontSize:9, color:"#5a7088", marginBottom:3 }}>Release Date *</div>
                  <input style={INP} type="date" value={releaseDate} onChange={e => setReleaseDate(e.target.value)} required />
                </div>
                <div>
                  <div style={{ fontSize:9, color:"#5a7088", marginBottom:3 }}>Duration (mm:ss)</div>
                  <input style={INP} placeholder="3:24" value={duration} onChange={e => setDuration(e.target.value)} />
                </div>
              </div>

              <div style={S.row3}>
                <div>
                  <div style={{ fontSize:9, color:"#5a7088", marginBottom:3 }}>BPM</div>
                  <input style={INP} type="number" min={40} max={300} placeholder="120" value={bpm} onChange={e => setBpm(e.target.value)} />
                </div>
                <div>
                  <div style={{ fontSize:9, color:"#5a7088", marginBottom:3 }}>Key</div>
                  <div style={{ display:"flex", gap:4 }}>
                    <select style={{ ...INP, flex:1 }} value={key} onChange={e => setKey(e.target.value)}>
                      <option value="">Key</option>
                      {KEYS.map(k => <option key={k} value={k}>{k}</option>)}
                    </select>
                    <select style={{ ...INP, width:80 }} value={keyMode} onChange={e => setKeyMode(e.target.value)}>
                      {MODES.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize:9, color:"#5a7088", marginBottom:3 }}>Language</div>
                  <input style={INP} placeholder="English" value={language} onChange={e => setLanguage(e.target.value)} />
                </div>
              </div>

              <label style={{ display:"flex", alignItems:"center", gap:6, cursor:"pointer", fontSize:10, color:"#ccc" }}>
                <input type="checkbox" checked={isExplicit} onChange={e => setIsExplicit(e.target.checked)} />
                <span>🅴 Explicit Content (contains profanity or adult themes)</span>
              </label>

              <div style={{ display:"flex", justifyContent:"flex-end", marginTop:12 }}>
                <button type="button" disabled={!step1Valid} onClick={() => setStep(2)}
                  style={{ ...S.btn(step1Valid?"#00ffc8":"#5a7088"), opacity:step1Valid?1:0.5 }}>
                  Next: Rights & PRO →
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 2: Rights & PRO ── */}
          {step === 2 && (
            <div style={S.sec}>
              <div style={{ marginBottom:14 }}>
                <div style={SL}>Registration Numbers</div>
                <div style={S.row2}>
                  <div>
                    <div style={{ fontSize:9, color:"#5a7088", marginBottom:3 }}>ISRC Code</div>
                    <input style={INP} placeholder="US-ABC-23-12345" value={isrc}
                      onChange={e => setIsrc(e.target.value.toUpperCase())}
                      pattern="[A-Z]{2}-[A-Z0-9]{3}-[0-9]{2}-[0-9]{5}" />
                    <div style={{ fontSize:8, color:"#5a7088", marginTop:2 }}>International Standard Recording Code — get one free at usisrc.org</div>
                  </div>
                  <div>
                    <div style={{ fontSize:9, color:"#5a7088", marginBottom:3 }}>ISWC Code</div>
                    <input style={INP} placeholder="T-123456789-0" value={iswc}
                      onChange={e => setIswc(e.target.value.toUpperCase())} />
                    <div style={{ fontSize:8, color:"#5a7088", marginTop:2 }}>International Standard Musical Work Code — assigned by your PRO</div>
                  </div>
                </div>
              </div>

              <div style={{ marginBottom:14 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
                  <div style={SL}>Songwriters / Composers *</div>
                  <div style={{ fontSize:9, color: shareValid?"#00ffc8":"#ff4444" }}>
                    Total: {totalShare.toFixed(1)}% {shareValid ? "✓" : "(must equal 100%)"}
                  </div>
                </div>
                {songwriters.map((s, i) => (
                  <SongwriterRow key={i} index={i} data={s} onChange={updateSongwriter}
                    onRemove={removeSongwriter} canRemove={songwriters.length > 1} />
                ))}
                <button type="button" onClick={addSongwriter} style={{ ...S.btn("#5a7088"), fontSize:10, padding:"4px 10px" }}>
                  + Add Songwriter
                </button>
              </div>

              <div style={{ marginBottom:14 }}>
                <div style={SL}>Publisher Information</div>
                <div style={S.row3}>
                  <div>
                    <div style={{ fontSize:9, color:"#5a7088", marginBottom:3 }}>Publisher Name</div>
                    <input style={INP} placeholder="Publishing company or 'Self-Published'" value={publisher} onChange={e => setPublisher(e.target.value)} />
                  </div>
                  <div>
                    <div style={{ fontSize:9, color:"#5a7088", marginBottom:3 }}>Publisher PRO</div>
                    <select style={INP} value={publisherPro} onChange={e => setPublisherPro(e.target.value)}>
                      <option value="">Select PRO</option>
                      {PROS.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div>
                    <div style={{ fontSize:9, color:"#5a7088", marginBottom:3 }}>Publisher IPI/CAE</div>
                    <input style={INP} placeholder="IPI number" value={publisherIpi} onChange={e => setPublisherIpi(e.target.value)} />
                  </div>
                </div>
              </div>

              <div style={{ marginBottom:14 }}>
                <div style={SL}>Master Recording Rights</div>
                <div>
                  <div style={{ fontSize:9, color:"#5a7088", marginBottom:3 }}>Master Owner *</div>
                  <input style={INP} placeholder="Who owns the master recording?" value={masterOwner} onChange={e => setMasterOwner(e.target.value)} />
                </div>
              </div>

              <div style={{ marginBottom:14 }}>
                <div style={SL}>Rights Granted to StreamPireX</div>
                <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                  {[
                    [performanceRights, setPerformanceRights, "Performance Rights", "Allow streaming/broadcast on this station"],
                    [syncRights, setSyncRights, "Sync Rights", "Allow use in video content on the platform"],
                    [mechanicalRights, setMechanicalRights, "Mechanical Rights", "Allow reproduction and distribution"],
                  ].map(([v,s,l,d]) => (
                    <label key={l} style={{ display:"flex", alignItems:"flex-start", gap:6, cursor:"pointer", fontSize:10, color:"#ccc" }}>
                      <input type="checkbox" checked={v} onChange={e => s(e.target.checked)} style={{ marginTop:1 }} />
                      <div>
                        <div style={{ fontWeight:700 }}>{l}</div>
                        <div style={{ color:"#5a7088", fontSize:9 }}>{d}</div>
                      </div>
                    </label>
                  ))}
                  <label style={{ display:"flex", alignItems:"flex-start", gap:6, cursor:"pointer", fontSize:10, color:"#ccc" }}>
                    <input type="checkbox" checked={exclusiveToStation} onChange={e => setExclusiveToStation(e.target.checked)} style={{ marginTop:1 }} />
                    <div>
                      <div style={{ fontWeight:700 }}>Exclusive to This Station</div>
                      <div style={{ color:"#5a7088", fontSize:9 }}>Only this station can play this track on StreamPireX</div>
                    </div>
                  </label>
                </div>
              </div>

              <div style={{ marginBottom:14 }}>
                <div style={{ fontSize:9, color:"#5a7088", marginBottom:3 }}>License Type</div>
                <select style={INP} value={license} onChange={e => setLicense(e.target.value)}>
                  <option value="all_rights_reserved">All Rights Reserved</option>
                  <option value="cc_by">Creative Commons — Attribution</option>
                  <option value="cc_by_nc">Creative Commons — Attribution Non-Commercial</option>
                  <option value="cc_by_sa">Creative Commons — Attribution ShareAlike</option>
                  <option value="public_domain">Public Domain</option>
                  <option value="custom">Custom License</option>
                </select>
              </div>

              <div>
                <div style={{ fontSize:9, color:"#5a7088", marginBottom:3 }}>Additional Notes</div>
                <textarea style={{ ...INP, minHeight:60, resize:"vertical" }} placeholder="Any special instructions, restrictions, or notes for the station operator..."
                  value={notes} onChange={e => setNotes(e.target.value)} />
              </div>

              <div style={{ display:"flex", justifyContent:"space-between", marginTop:12 }}>
                <button type="button" onClick={() => setStep(1)} style={S.btn("#5a7088")}>← Back</button>
                <button type="button" disabled={!step2Valid} onClick={() => setStep(3)}
                  style={{ ...S.btn(step2Valid?"#00ffc8":"#5a7088"), opacity:step2Valid?1:0.5 }}>
                  Next: Upload Files →
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 3: Upload ── */}
          {step === 3 && (
            <div style={S.sec}>
              <div style={SL}>Upload Files</div>

              {/* Summary */}
              <div style={{ background:"#0a0a14", border:"1px solid #1a2a3a", borderRadius:4, padding:10, marginBottom:12, fontSize:10 }}>
                <div style={{ color:"#00ffc8", fontWeight:700, marginBottom:6 }}>Submission Summary</div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:4 }}>
                  {[["Title", title],["Artist", artist],["Genre", genre],["Release", releaseDate],
                    ["ISRC", isrc||"—"],["ISWC", iswc||"—"],["Songwriters", songwriters.map(s=>s.name).filter(Boolean).join(", ")||"—"],
                    ["Publisher", publisher||"—"],["Explicit", isExplicit?"Yes":"No"],["License", license]
                  ].map(([k,v]) => (
                    <div key={k}><span style={{ color:"#5a7088" }}>{k}: </span><span style={{ color:"#ccc" }}>{v}</span></div>
                  ))}
                </div>
              </div>

              {/* Audio file */}
              <div style={{ marginBottom:12 }}>
                <div style={{ fontSize:9, color:"#5a7088", marginBottom:3 }}>Audio File * (MP3, WAV, FLAC, AAC — max 100MB)</div>
                <label style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 12px", border:`1px dashed ${audioFile?"#00ffc8":"#1a2a3a"}`, borderRadius:4, cursor:"pointer", background:audioFile?"#00ffc811":"transparent" }}>
                  <span style={{ fontSize:20 }}>{audioFile ? "🎵" : "📁"}</span>
                  <div>
                    <div style={{ color:audioFile?"#00ffc8":"#5a7088", fontWeight:700 }}>
                      {audioFile ? audioFile.name : "Click to select audio file"}
                    </div>
                    {audioFile && <div style={{ color:"#5a7088", fontSize:9 }}>{(audioFile.size/1024/1024).toFixed(1)} MB</div>}
                  </div>
                  <input ref={fileRef} type="file" accept="audio/*" style={{ display:"none" }}
                    onChange={e => setAudioFile(e.target.files?.[0] || null)} />
                </label>
              </div>

              {/* Cover art */}
              <div style={{ marginBottom:12 }}>
                <div style={{ fontSize:9, color:"#5a7088", marginBottom:3 }}>Cover Art (optional — JPG/PNG, min 1400×1400px)</div>
                <label style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 12px", border:`1px dashed ${coverFile?"#00ffc8":"#1a2a3a"}`, borderRadius:4, cursor:"pointer" }}>
                  <span style={{ fontSize:20 }}>{coverFile ? "🖼" : "🎨"}</span>
                  <div style={{ color:coverFile?"#00ffc8":"#5a7088", fontWeight:700 }}>
                    {coverFile ? coverFile.name : "Click to select cover art"}
                  </div>
                  <input type="file" accept="image/*" style={{ display:"none" }}
                    onChange={e => setCoverFile(e.target.files?.[0] || null)} />
                </label>
              </div>

              {/* Upload progress */}
              {submitting && (
                <div style={{ marginBottom:12 }}>
                  <div style={{ fontSize:10, color:"#5a7088", marginBottom:4 }}>Uploading... {uploadProgress}%</div>
                  <div style={{ height:6, background:"#0a1628", borderRadius:3 }}>
                    <div style={{ height:"100%", width:`${uploadProgress}%`, background:"#00ffc8", borderRadius:3, transition:"width 0.3s" }} />
                  </div>
                </div>
              )}

              {/* Terms */}
              <div style={{ fontSize:9, color:"#5a7088", marginBottom:12, padding:8, background:"#0a0a14", borderRadius:4, lineHeight:1.5 }}>
                By submitting this track you confirm that: (1) you own or control all rights to this recording, (2) the information provided is accurate for BMI/ASCAP/SESAC reporting, (3) you grant StreamPireX the rights selected above, and (4) this submission complies with all applicable copyright laws. StreamPireX will report plays to your PRO organization based on the information provided.
              </div>

              <div style={{ display:"flex", justifyContent:"space-between" }}>
                <button type="button" onClick={() => setStep(2)} style={S.btn("#5a7088")}>← Back</button>
                <button type="submit" disabled={!step3Valid || submitting}
                  style={{ ...S.btn(step3Valid&&!submitting?"#00ffc8":"#5a7088"), opacity:step3Valid&&!submitting?1:0.5, padding:"8px 20px" }}>
                  {submitting ? "Uploading..." : "✓ Submit to PlayMix"}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
