import React, { useState, useRef, useCallback } from "react";

const SPEAKERS = [
  { id: "flat",      name: "Flat (Bypass)",      icon: "📊", category: "Studio Monitor", description: "No processing — your raw mix" },
  { id: "ns10",      name: "Yamaha NS-10",        icon: "🎛️", category: "Studio Monitor", description: "The industry standard — unforgiving midrange" },
  { id: "auratone",  name: "Auratone 5C",         icon: "📦", category: "Studio Monitor", description: "Mono cube — classic translation test" },
  { id: "genelec",   name: "Genelec 8030",        icon: "🔊", category: "Studio Monitor", description: "Accurate Finnish nearfield monitor" },
  { id: "krk",       name: "KRK Rokit 8",         icon: "🟡", category: "Studio Monitor", description: "Popular with hip hop & trap producers" },
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

const SpeakerSimulator = ({ audioContext }) => {
  const [activeSpeaker, setActiveSpeaker] = useState("flat");
  const [isMono, setIsMono] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [isPlaying, setIsPlaying] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [audioBuffer, setAudioBuffer] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("All");

  const sourceRef = useRef(null);
  const fileInputRef = useRef(null);
  const internalCtxRef = useRef(null);

  const getCtx = useCallback(() => {
    if (audioContext) return audioContext;
    if (!internalCtxRef.current) {
      internalCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    return internalCtxRef.current;
  }, [audioContext]);

  const stopPlayback = useCallback(() => {
    if (sourceRef.current) {
      try { sourceRef.current.stop(); } catch (e) {}
      sourceRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  const buildChain = useCallback((speakerId, ctx) => {
    const eq = SPEAKER_EQ[speakerId] || SPEAKER_EQ.flat;
    const lowShelf = ctx.createBiquadFilter();
    lowShelf.type = "lowshelf"; lowShelf.frequency.value = 200; lowShelf.gain.value = eq.low;
    const lowMid = ctx.createBiquadFilter();
    lowMid.type = "peaking"; lowMid.frequency.value = 500; lowMid.Q.value = 1; lowMid.gain.value = eq.lowMid;
    const highMid = ctx.createBiquadFilter();
    highMid.type = "peaking"; highMid.frequency.value = 3000; highMid.Q.value = 1; highMid.gain.value = eq.highMid;
    const highShelf = ctx.createBiquadFilter();
    highShelf.type = "highshelf"; highShelf.frequency.value = 8000; highShelf.gain.value = eq.high;
    const gainNode = ctx.createGain();
    gainNode.gain.value = volume * Math.pow(10, eq.gain / 20);
    lowShelf.connect(lowMid); lowMid.connect(highMid); highMid.connect(highShelf);
    highShelf.connect(gainNode); gainNode.connect(ctx.destination);
    return lowShelf;
  }, [volume]);

  const playAudio = useCallback(async (speakerId = activeSpeaker) => {
    if (!audioBuffer) return;
    stopPlayback();
    const ctx = getCtx();
    if (ctx.state === "suspended") await ctx.resume();
    const source = ctx.createBufferSource();
    source.buffer = audioBuffer; source.loop = true;
    const inputNode = buildChain(speakerId, ctx);
    if (isMono) {
      const splitter = ctx.createChannelSplitter(2);
      const merger = ctx.createChannelMerger(2);
      source.connect(splitter);
      splitter.connect(merger, 0, 0); splitter.connect(merger, 0, 1);
      merger.connect(inputNode);
    } else { source.connect(inputNode); }
    source.start(); sourceRef.current = source;
    source.onended = () => setIsPlaying(false);
    setIsPlaying(true);
  }, [audioBuffer, activeSpeaker, isMono, buildChain, stopPlayback, getCtx]);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    setUploadedFile(file.name); stopPlayback();
    const ctx = getCtx();
    const decoded = await ctx.decodeAudioData(await file.arrayBuffer());
    setAudioBuffer(decoded);
  };

  const handleSpeakerSelect = (id) => {
    setActiveSpeaker(id);
    if (isPlaying) { stopPlayback(); setTimeout(() => playAudio(id), 120); }
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
          <p style={{ margin: "4px 0 0", color: "#8b949e", fontSize: "12px" }}>12 studio monitors · 10 consumer devices · hear your mix everywhere</p>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button onClick={() => { setIsMono(m => !m); if (isPlaying) { stopPlayback(); setTimeout(() => playAudio(), 120); } }}
            style={{ padding: "6px 14px", background: isMono ? "#FF6600" : "#161b22", border: `1px solid ${isMono ? "#FF6600" : "#30363d"}`, borderRadius: "6px", color: isMono ? "#fff" : "#8b949e", fontSize: "12px", cursor: "pointer", fontWeight: "700" }}>
            MONO {isMono ? "ON" : "OFF"}
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ color: "#8b949e", fontSize: "12px" }}>VOL</span>
            <input type="range" min="0" max="1" step="0.01" value={volume} onChange={e => setVolume(parseFloat(e.target.value))} style={{ width: "80px", accentColor: "#00ffc8" }} />
          </div>
        </div>
      </div>

      <div style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: "8px", padding: "16px", marginBottom: "20px", display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
        <button onClick={() => fileInputRef.current?.click()} style={{ padding: "8px 16px", background: "#21262d", border: "1px solid #30363d", borderRadius: "6px", color: "#e6edf3", fontSize: "13px", cursor: "pointer" }}>📁 Load Audio</button>
        <input ref={fileInputRef} type="file" accept="audio/*" onChange={handleFileUpload} style={{ display: "none" }} />
        <span style={{ color: uploadedFile ? "#00ffc8" : "#8b949e", fontSize: "13px", flex: 1 }}>{uploadedFile || "Upload a mix to test translation across speakers"}</span>
        {audioBuffer && (
          <button onClick={isPlaying ? stopPlayback : () => playAudio()} style={{ padding: "8px 20px", background: isPlaying ? "#f85149" : "#00ffc8", border: "none", borderRadius: "6px", color: "#0d1117", fontWeight: "800", fontSize: "13px", cursor: "pointer" }}>
            {isPlaying ? "⏹ Stop" : "▶ Play"}
          </button>
        )}
        <div style={{ background: "#0d1117", border: "1px solid #00ffc8", borderRadius: "6px", padding: "8px 14px", minWidth: "200px" }}>
          <div style={{ color: "#00ffc8", fontSize: "10px", fontWeight: "700", letterSpacing: "1px" }}>ACTIVE SPEAKER</div>
          <div style={{ color: "#e6edf3", fontSize: "13px", marginTop: "2px" }}>{activeSpeakerData?.icon} {activeSpeakerData?.name}</div>
        </div>
      </div>

      <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
        {categories.map(cat => (
          <button key={cat} onClick={() => setSelectedCategory(cat)}
            style={{ padding: "5px 14px", background: selectedCategory === cat ? "#00ffc8" : "#161b22", border: `1px solid ${selectedCategory === cat ? "#00ffc8" : "#30363d"}`, borderRadius: "20px", color: selectedCategory === cat ? "#0d1117" : "#8b949e", fontSize: "12px", cursor: "pointer", fontWeight: selectedCategory === cat ? "700" : "400" }}>
            {cat}
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(175px, 1fr))", gap: "10px" }}>
        {filtered.map(speaker => {
          const active = activeSpeaker === speaker.id;
          return (
            <button key={speaker.id} onClick={() => handleSpeakerSelect(speaker.id)}
              style={{ background: active ? "#0d2b1a" : "#161b22", border: `2px solid ${active ? "#00ffc8" : "#30363d"}`, borderRadius: "10px", padding: "14px", cursor: "pointer", textAlign: "left", transition: "all 0.15s", position: "relative" }}>
              {active && <div style={{ position: "absolute", top: "8px", right: "8px", width: "8px", height: "8px", background: "#00ffc8", borderRadius: "50%" }} />}
              <div style={{ fontSize: "26px", marginBottom: "6px" }}>{speaker.icon}</div>
              <div style={{ color: active ? "#00ffc8" : "#e6edf3", fontSize: "12px", fontWeight: "700", marginBottom: "3px" }}>{speaker.name}</div>
              <div style={{ color: "#5a7088", fontSize: "11px", lineHeight: 1.4 }}>{speaker.description}</div>
              <div style={{ marginTop: "8px", display: "inline-block", background: "#21262d", borderRadius: "4px", padding: "2px 7px", fontSize: "10px", color: "#8b949e" }}>{speaker.category}</div>
            </button>
          );
        })}
      </div>

      {activeSpeaker !== "flat" && activeEQ && (
        <div style={{ marginTop: "20px", background: "#161b22", border: "1px solid #30363d", borderRadius: "8px", padding: "16px" }}>
          <div style={{ color: "#8b949e", fontSize: "11px", fontWeight: "700", letterSpacing: "1px", marginBottom: "14px" }}>FREQUENCY RESPONSE — {activeSpeakerData?.name}</div>
          <div style={{ display: "flex", gap: "12px", alignItems: "flex-end", height: "70px" }}>
            {[{ label: "Low\n200Hz", value: activeEQ.low }, { label: "Low Mid\n500Hz", value: activeEQ.lowMid }, { label: "High Mid\n3kHz", value: activeEQ.highMid }, { label: "High\n8kHz", value: activeEQ.high }].map(({ label, value }) => (
              <div key={label} style={{ flex: 1, textAlign: "center" }}>
                <div style={{ fontSize: "11px", color: value >= 0 ? "#00ffc8" : "#f85149", fontWeight: "700", marginBottom: "4px" }}>{value > 0 ? "+" : ""}{value}dB</div>
                <div style={{ height: `${Math.min(Math.abs(value) * 4 + 6, 50)}px`, background: value >= 0 ? "#00ffc8" : "#f85149", borderRadius: "3px", opacity: 0.75 }} />
                <div style={{ fontSize: "10px", color: "#5a7088", marginTop: "6px", whiteSpace: "pre-line", lineHeight: 1.3 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginTop: "16px", background: "#161b22", border: "1px solid #30363d", borderRadius: "8px", padding: "14px" }}>
        <div style={{ color: "#8b949e", fontSize: "11px", fontWeight: "700", letterSpacing: "1px", marginBottom: "8px" }}>PRO TIPS</div>
        <div style={{ color: "#5a7088", fontSize: "11px", lineHeight: 1.8 }}>
          💡 Start with <span style={{ color: "#00ffc8" }}>NS-10</span> — if it sounds good here, it translates everywhere<br />
          💡 Check <span style={{ color: "#00ffc8" }}>Auratone/Avantone</span> in mono to catch weak vocal/snare placement<br />
          💡 Test on <span style={{ color: "#FF6600" }}>iPhone + Car</span> — that is where 80% of your listeners hear it<br />
          💡 Use <span style={{ color: "#FF6600" }}>MONO button</span> on every speaker — phase issues disappear in mono
        </div>
      </div>
    </div>
  );
};

export default SpeakerSimulator;
