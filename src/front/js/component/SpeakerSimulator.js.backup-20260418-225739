import React, { useState, useRef, useCallback } from "react";

const SPEAKERS = [
  { id: "flat",      name: "Flat (Bypass)",      icon: "📊", category: "Studio Monitor", description: "No processing — your raw mix" },
  { id: "ns10",      name: "Yamaha NS-10",        icon: "🎛️", category: "Studio Monitor", description: "The industry standard — unforgiving midrange" },
  { id: "auratone",  name: "Auratone 5C",         icon: "📦", category: "Studio Monitor", description: "Mono cube — classic translation test" },
  { id: "genelec",   name: "Genelec 8030",        icon: "🔊", category: "Studio Monitor", description: "Accurate Finnish nearfield monitor" },
  { id: "krk",       name: "KRK Rokit 8",         icon: "🟡", category: "Studio Monitor", description: "Popular with hip hop and trap producers" },
  { id: "adam",      name: "Adam Audio A7X",      icon: "🎚️", category: "Studio Monitor", description: "Ribbon tweeter — favorite in electronic music" },
  { id: "focal",     name: "Focal Alpha 65",      icon: "🇫🇷", category: "Studio Monitor", description: "High-end French studio monitor" },
  { id: "avantone",  name: "Avantone MixCube",    icon: "🟠", category: "Studio Monitor", description: "Modern Auratone — small mono reference" },
  { id: "mackie",    name: "Mackie HR824",         icon: "⚫", category: "Studio Monitor", description: "Classic home studio nearfield" },
  { id: "jbl306",    name: "JBL 306P MkII",       icon: "🔵", category: "Studio Monitor", description: "Budget pro monitor — very popular" },
  { id: "eve",       name: "Eve Audio SC207",     icon: "🎯", category: "Studio Monitor", description: "German precision — flat response" },
  { id: "amphion",   name: "Amphion One18",       icon: "🏔️", category: "Studio Monitor", description: "Finnish passive — loved by mastering engineers" },
  { id: "iphone",    name: "iPhone Speaker",      icon: "📱", category: "Consumer", description: "Most common phone speaker" },
  { id: "android",   name: "Android Phone",       icon: "📲", category: "Consumer", description: "Budget Android speaker" },
  { id: "macbook",   name: "MacBook Pro",         icon: "💻", category: "Consumer", description: "Laptop speaker simulation" },
  { id: "airpods",   name: "AirPods / Earbuds",   icon: "🎧", category: "Consumer", description: "Consumer earbuds response" },
  { id: "car",       name: "Car Stereo",          icon: "🚗", category: "Consumer", description: "Average sedan audio system" },
  { id: "bluetooth", name: "Bluetooth Speaker",   icon: "📻", category: "Consumer", description: "JBL Flip type portable speaker" },
  { id: "club",      name: "Club / PA System",    icon: "🏟️", category: "Consumer", description: "Large venue sound system" },
  { id: "tv",        name: "TV Speakers",         icon: "📺", category: "Consumer", description: "Flat screen TV speakers" },
  { id: "homepod",   name: "HomePod Mini",        icon: "🏠", category: "Consumer", description: "Apple smart speaker" },
  { id: "sonos",     name: "Sonos One",           icon: "⭕", category: "Consumer", description: "Popular home wireless speaker" },
];

const SPEAKER_EQ = {
  flat:      { low: 0,   lowMid: 0,  highMid: 0,  high: 0,  gain: 0  },
  ns10:      { low: -3,  lowMid: 3,  highMid: 4,  high: -3, gain: 0  },
  auratone:  { low: -10, lowMid: 5,  highMid: 2,  high: -7, gain: 3  },
  genelec:   { low: 1,   lowMid: 0,  highMid: 1,  high: 2,  gain: 0  },
  krk:       { low: 4,   lowMid: -1, highMid: 1,  high: 3,  gain: -1 },
  adam:      { low: 0,   lowMid: 0,  highMid: 2,  high: 5,  gain: 0  },
  focal:     { low: 1,   lowMid: 1,  highMid: 0,  high: 1,  gain: 0  },
  avantone:  { low: -9,  lowMid: 4,  highMid: 3,  high: -6, gain: 3  },
  mackie:    { low: 2,   lowMid: -1, highMid: 1,  high: -1, gain: 0  },
  jbl306:    { low: 2,   lowMid: 0,  highMid: 2,  high: 1,  gain: 0  },
  eve:       { low: 0,   lowMid: 0,  highMid: 0,  high: 1,  gain: 0  },
  amphion:   { low: -1,  lowMid: 1,  highMid: 0,  high: 0,  gain: 0  },
  iphone:    { low: -10, lowMid: 3,  highMid: 5,  high: -4, gain: 4  },
  android:   { low: -12, lowMid: 2,  highMid: 4,  high: -8, gain: 5  },
  macbook:   { low: -8,  lowMid: 1,  highMid: 3,  high: -3, gain: 3  },
  airpods:   { low: -2,  lowMid: 1,  highMid: 4,  high: 6,  gain: 1  },
  car:       { low: 4,   lowMid: -2, highMid: 2,  high: -1, gain: -1 },
  bluetooth: { low: 2,   lowMid: -1, highMid: 1,  high: -4, gain: 1  },
  club:      { low: 6,   lowMid: -1, highMid: 0,  high: 2,  gain: -3 },
  tv:        { low: -6,  lowMid: 3,  highMid: 4,  high: -2, gain: 2  },
  homepod:   { low: 3,   lowMid: 0,  highMid: 2,  high: -1, gain: 0  },
  sonos:     { low: 2,   lowMid: 0,  highMid: 1,  high: 0,  gain: 0  },
};

const TRACK_COLORS = ["#00ffc8","#FF6600","#a78bfa","#f472b6","#facc15","#38bdf8","#4ade80","#fb923c"];
let trackIdCounter = 0;

const SpeakerSimulator = ({ audioContext }) => {
  const [activeSpeaker, setActiveSpeaker] = useState("flat");
  const [isMono, setIsMono] = useState(false);
  const [masterVolume, setMasterVolume] = useState(0.8);
  const [isPlaying, setIsPlaying] = useState(false);
  const [tracks, setTracks] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("All");

  const sourceRefs = useRef({});
  const gainRefs = useRef({});
  const internalCtxRef = useRef(null);
  const fileInputRef = useRef(null);

  const getCtx = useCallback(() => {
    if (audioContext) return audioContext;
    if (!internalCtxRef.current) {
      internalCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    return internalCtxRef.current;
  }, [audioContext]);

  const buildEQChain = useCallback((speakerId, ctx) => {
    const eq = SPEAKER_EQ[speakerId] || SPEAKER_EQ.flat;
    const lowShelf = ctx.createBiquadFilter();
    lowShelf.type = "lowshelf"; lowShelf.frequency.value = 200; lowShelf.gain.value = eq.low;
    const lowMid = ctx.createBiquadFilter();
    lowMid.type = "peaking"; lowMid.frequency.value = 500; lowMid.Q.value = 1; lowMid.gain.value = eq.lowMid;
    const highMid = ctx.createBiquadFilter();
    highMid.type = "peaking"; highMid.frequency.value = 3000; highMid.Q.value = 1; highMid.gain.value = eq.highMid;
    const highShelf = ctx.createBiquadFilter();
    highShelf.type = "highshelf"; highShelf.frequency.value = 8000; highShelf.gain.value = eq.high;
    const masterGain = ctx.createGain();
    masterGain.gain.value = masterVolume * Math.pow(10, eq.gain / 20);
    lowShelf.connect(lowMid); lowMid.connect(highMid);
    highMid.connect(highShelf); highShelf.connect(masterGain);
    masterGain.connect(ctx.destination);
    return lowShelf;
  }, [masterVolume]);

  const stopAll = useCallback(() => {
    Object.values(sourceRefs.current).forEach(src => { try { src.stop(); } catch (e) {} });
    sourceRefs.current = {};
    gainRefs.current = {};
    setIsPlaying(false);
  }, []);

  const playAll = useCallback(async (speakerId, trackList) => {
    const spk = speakerId || activeSpeaker;
    const tl = trackList || tracks;
    if (!tl.length) return;
    stopAll();
    const ctx = getCtx();
    if (ctx.state === "suspended") await ctx.resume();
    const eqInput = buildEQChain(spk, ctx);
    const anySoloed = tl.some(t => t.soloed);
    tl.forEach(track => {
      if (!track.buffer) return;
      const source = ctx.createBufferSource();
      source.buffer = track.buffer;
      source.loop = true;
      const trackGain = ctx.createGain();
      const audible = !track.muted && (anySoloed ? track.soloed : true);
      trackGain.gain.value = audible ? track.volume : 0;
      if (isMono) {
        const splitter = ctx.createChannelSplitter(2);
        const merger = ctx.createChannelMerger(2);
        source.connect(splitter);
        splitter.connect(merger, 0, 0);
        splitter.connect(merger, 0, 1);
        merger.connect(trackGain);
      } else {
        source.connect(trackGain);
      }
      trackGain.connect(eqInput);
      source.start();
      sourceRefs.current[track.id] = source;
      gainRefs.current[track.id] = trackGain;
    });
    setIsPlaying(true);
  }, [activeSpeaker, tracks, isMono, buildEQChain, stopAll, getCtx]);

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    const ctx = getCtx();
    const newTracks = await Promise.all(files.map(async (file, i) => {
      const buffer = await ctx.decodeAudioData(await file.arrayBuffer());
      return {
        id: ++trackIdCounter,
        name: file.name.replace(/\.[^.]+$/, ""),
        buffer,
        volume: 0.8,
        muted: false,
        soloed: false,
        color: TRACK_COLORS[(tracks.length + i) % TRACK_COLORS.length],
      };
    }));
    const updated = [...tracks, ...newTracks];
    setTracks(updated);
    if (isPlaying) { stopAll(); setTimeout(() => playAll(activeSpeaker, updated), 120); }
    e.target.value = "";
  };

  const removeTrack = (id) => {
    try { sourceRefs.current[id]?.stop(); } catch (e) {}
    delete sourceRefs.current[id];
    delete gainRefs.current[id];
    const updated = tracks.filter(t => t.id !== id);
    setTracks(updated);
    if (!updated.length) setIsPlaying(false);
  };

  const updateTrackVolume = (id, vol) => {
    setTracks(prev => prev.map(t => t.id === id ? { ...t, volume: vol } : t));
    const track = tracks.find(t => t.id === id);
    const anySoloed = tracks.some(t => t.soloed);
    if (gainRefs.current[id] && track && !track.muted && (anySoloed ? track.soloed : true)) {
      gainRefs.current[id].gain.value = vol;
    }
  };

  const toggleMute = (id) => {
    setTracks(prev => {
      const updated = prev.map(t => t.id === id ? { ...t, muted: !t.muted } : t);
      const anySoloed = updated.some(t => t.soloed);
      updated.forEach(t => {
        if (gainRefs.current[t.id]) {
          gainRefs.current[t.id].gain.value = (!t.muted && (anySoloed ? t.soloed : true)) ? t.volume : 0;
        }
      });
      return updated;
    });
  };

  const toggleSolo = (id) => {
    setTracks(prev => {
      const updated = prev.map(t => t.id === id ? { ...t, soloed: !t.soloed } : t);
      const anySoloed = updated.some(t => t.soloed);
      updated.forEach(t => {
        if (gainRefs.current[t.id]) {
          gainRefs.current[t.id].gain.value = (!t.muted && (anySoloed ? t.soloed : true)) ? t.volume : 0;
        }
      });
      return updated;
    });
  };

  const handleSpeakerSelect = (id) => {
    setActiveSpeaker(id);
    if (isPlaying) { stopAll(); setTimeout(() => playAll(id, tracks), 120); }
  };

  const handleMonoToggle = () => {
    setIsMono(m => !m);
    if (isPlaying) { stopAll(); setTimeout(() => playAll(activeSpeaker, tracks), 120); }
  };

  const categories = ["All", "Studio Monitor", "Consumer"];
  const filtered = selectedCategory === "All" ? SPEAKERS : SPEAKERS.filter(s => s.category === selectedCategory);
  const activeSpeakerData = SPEAKERS.find(s => s.id === activeSpeaker);
  const activeEQ = SPEAKER_EQ[activeSpeaker];

  return (
    <div style={{ background: "#0d1117", minHeight: "100%", padding: "20px", fontFamily: "'JetBrains Mono', monospace", color: "#e6edf3" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
        <div>
          <h2 style={{ margin: 0, color: "#00ffc8", fontSize: "18px" }}>🔊 Mix Translator</h2>
          <p style={{ margin: "4px 0 0", color: "#8b949e", fontSize: "12px" }}>12 studio monitors · 10 consumer devices · multi-track with mute/solo</p>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button onClick={handleMonoToggle}
            style={{ padding: "6px 14px", background: isMono ? "#FF6600" : "#161b22", border: "1px solid " + (isMono ? "#FF6600" : "#30363d"), borderRadius: "6px", color: isMono ? "#fff" : "#8b949e", fontSize: "12px", cursor: "pointer", fontWeight: "700" }}>
            MONO {isMono ? "ON" : "OFF"}
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ color: "#8b949e", fontSize: "12px" }}>MASTER</span>
            <input type="range" min="0" max="1" step="0.01" value={masterVolume}
              onChange={e => setMasterVolume(parseFloat(e.target.value))}
              style={{ width: "80px", accentColor: "#00ffc8" }} />
          </div>
        </div>
      </div>

      <div style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: "8px", padding: "16px", marginBottom: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
          <div style={{ color: "#8b949e", fontSize: "11px", fontWeight: "700", letterSpacing: "1px" }}>
            TRACKS {tracks.length > 0 && <span style={{ color: "#00ffc8" }}>({tracks.length})</span>}
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={() => fileInputRef.current && fileInputRef.current.click()}
              style={{ padding: "6px 14px", background: "#21262d", border: "1px solid #30363d", borderRadius: "6px", color: "#e6edf3", fontSize: "12px", cursor: "pointer" }}>
              + Add Track(s)
            </button>
            <input ref={fileInputRef} type="file" accept="audio/*" multiple onChange={handleFileUpload} style={{ display: "none" }} />
            {tracks.length > 0 && (
              <>
                <button onClick={isPlaying ? stopAll : () => playAll()}
                  style={{ padding: "6px 18px", background: isPlaying ? "#f85149" : "#00ffc8", border: "none", borderRadius: "6px", color: "#0d1117", fontWeight: "800", fontSize: "12px", cursor: "pointer" }}>
                  {isPlaying ? "⏹ Stop" : "▶ Play All"}
                </button>
                <button onClick={() => { stopAll(); setTracks([]); }}
                  style={{ padding: "6px 10px", background: "transparent", border: "1px solid #f85149", borderRadius: "6px", color: "#f85149", fontSize: "12px", cursor: "pointer" }}>
                  Clear
                </button>
              </>
            )}
          </div>
        </div>

        {tracks.length === 0 ? (
          <div style={{ textAlign: "center", padding: "30px", color: "#5a7088", fontSize: "13px", border: "1px dashed #30363d", borderRadius: "6px" }}>
            📁 Add Track(s) — load drums, bass, vocals, synths individually<br />
            <span style={{ fontSize: "11px", marginTop: "6px", display: "block" }}>Select multiple files at once · or load a single stereo mix</span>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {tracks.map(track => (
              <div key={track.id} style={{ background: "#0d1117", border: "1px solid " + (track.soloed ? track.color : "#30363d"), borderRadius: "8px", padding: "10px 14px", display: "flex", alignItems: "center", gap: "12px", opacity: track.muted ? 0.45 : 1, transition: "opacity 0.15s" }}>
                <div style={{ width: "4px", height: "36px", background: track.color, borderRadius: "2px", flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: "#e6edf3", fontSize: "12px", fontWeight: "700", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{track.name}</div>
                  <div style={{ color: "#5a7088", fontSize: "10px", marginTop: "2px" }}>
                    {track.buffer ? (track.buffer.duration.toFixed(1) + "s · " + track.buffer.numberOfChannels + "ch") : "loading..."}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ color: "#5a7088", fontSize: "10px", width: "28px", textAlign: "right" }}>{Math.round(track.volume * 100)}</span>
                  <input type="range" min="0" max="1" step="0.01" value={track.volume}
                    onChange={e => updateTrackVolume(track.id, parseFloat(e.target.value))}
                    style={{ width: "90px", accentColor: track.color }} />
                </div>
                <button onClick={() => toggleMute(track.id)}
                  style={{ padding: "3px 8px", background: track.muted ? "#f85149" : "#21262d", border: "1px solid " + (track.muted ? "#f85149" : "#30363d"), borderRadius: "4px", color: track.muted ? "#fff" : "#8b949e", fontSize: "11px", fontWeight: "700", cursor: "pointer", width: "28px" }}>M</button>
                <button onClick={() => toggleSolo(track.id)}
                  style={{ padding: "3px 8px", background: track.soloed ? "#facc15" : "#21262d", border: "1px solid " + (track.soloed ? "#facc15" : "#30363d"), borderRadius: "4px", color: track.soloed ? "#0d1117" : "#8b949e", fontSize: "11px", fontWeight: "700", cursor: "pointer", width: "28px" }}>S</button>
                <button onClick={() => removeTrack(track.id)}
                  style={{ padding: "3px 7px", background: "transparent", border: "1px solid #30363d", borderRadius: "4px", color: "#5a7088", fontSize: "11px", cursor: "pointer" }}>X</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: "inline-flex", alignItems: "center", gap: "10px", background: "#0d1117", border: "1px solid #00ffc8", borderRadius: "6px", padding: "8px 14px", marginBottom: "16px" }}>
        <div style={{ color: "#00ffc8", fontSize: "10px", fontWeight: "700", letterSpacing: "1px" }}>MONITORING THROUGH</div>
        <div style={{ color: "#e6edf3", fontSize: "13px" }}>{activeSpeakerData && activeSpeakerData.icon} {activeSpeakerData && activeSpeakerData.name}</div>
      </div>

      <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
        {categories.map(cat => (
          <button key={cat} onClick={() => setSelectedCategory(cat)}
            style={{ padding: "5px 14px", background: selectedCategory === cat ? "#00ffc8" : "#161b22", border: "1px solid " + (selectedCategory === cat ? "#00ffc8" : "#30363d"), borderRadius: "20px", color: selectedCategory === cat ? "#0d1117" : "#8b949e", fontSize: "12px", cursor: "pointer", fontWeight: selectedCategory === cat ? "700" : "400" }}>
            {cat}
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(165px, 1fr))", gap: "10px" }}>
        {filtered.map(speaker => {
          const active = activeSpeaker === speaker.id;
          return (
            <button key={speaker.id} onClick={() => handleSpeakerSelect(speaker.id)}
              style={{ background: active ? "#0d2b1a" : "#161b22", border: "2px solid " + (active ? "#00ffc8" : "#30363d"), borderRadius: "10px", padding: "12px", cursor: "pointer", textAlign: "left", transition: "all 0.15s", position: "relative" }}>
              {active && <div style={{ position: "absolute", top: "8px", right: "8px", width: "8px", height: "8px", background: "#00ffc8", borderRadius: "50%" }} />}
              <div style={{ fontSize: "22px", marginBottom: "5px" }}>{speaker.icon}</div>
              <div style={{ color: active ? "#00ffc8" : "#e6edf3", fontSize: "11px", fontWeight: "700", marginBottom: "3px" }}>{speaker.name}</div>
              <div style={{ color: "#5a7088", fontSize: "10px", lineHeight: 1.4 }}>{speaker.description}</div>
              <div style={{ marginTop: "6px", display: "inline-block", background: "#21262d", borderRadius: "4px", padding: "2px 6px", fontSize: "9px", color: "#8b949e" }}>{speaker.category}</div>
            </button>
          );
        })}
      </div>

      {activeSpeaker !== "flat" && activeEQ && (
        <div style={{ marginTop: "20px", background: "#161b22", border: "1px solid #30363d", borderRadius: "8px", padding: "16px" }}>
          <div style={{ color: "#8b949e", fontSize: "11px", fontWeight: "700", letterSpacing: "1px", marginBottom: "14px" }}>FREQ RESPONSE — {activeSpeakerData && activeSpeakerData.name}</div>
          <div style={{ display: "flex", gap: "12px", alignItems: "flex-end", height: "70px" }}>
            {[{ label: "Low\n200Hz", value: activeEQ.low }, { label: "Low Mid\n500Hz", value: activeEQ.lowMid }, { label: "High Mid\n3kHz", value: activeEQ.highMid }, { label: "High\n8kHz", value: activeEQ.high }].map(({ label, value }) => (
              <div key={label} style={{ flex: 1, textAlign: "center" }}>
                <div style={{ fontSize: "11px", color: value >= 0 ? "#00ffc8" : "#f85149", fontWeight: "700", marginBottom: "4px" }}>{value > 0 ? "+" : ""}{value}dB</div>
                <div style={{ height: Math.min(Math.abs(value) * 4 + 6, 50) + "px", background: value >= 0 ? "#00ffc8" : "#f85149", borderRadius: "3px", opacity: 0.75 }} />
                <div style={{ fontSize: "10px", color: "#5a7088", marginTop: "6px", whiteSpace: "pre-line", lineHeight: 1.3 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginTop: "16px", background: "#161b22", border: "1px solid #30363d", borderRadius: "8px", padding: "14px" }}>
        <div style={{ color: "#8b949e", fontSize: "11px", fontWeight: "700", letterSpacing: "1px", marginBottom: "8px" }}>PRO TIPS</div>
        <div style={{ color: "#5a7088", fontSize: "11px", lineHeight: 1.9 }}>
          Solo kick + bass on Auratone — can you hear both? If not, fix the low end<br />
          Solo vocals on iPhone — if they disappear, boost 2-4kHz presence<br />
          MONO + Auratone together = harshest reference test in the industry<br />
          Use S (solo) to isolate one element, then rapidly switch speakers<br />
          Load stems from your DAW — drums, bass, mids, tops as separate files
        </div>
      </div>
    </div>
  );
};

export default SpeakerSimulator;
