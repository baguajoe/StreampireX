import React, { useState, useEffect, useRef, useCallback } from "react";
import SpeakerSimulator from "./SpeakerSimulator";

// ── Speaker/headphone profiles (monitor-only) ──
const SPEAKERS = [
  { id: "flat",      name: "Flat (Bypass)",      icon: "📊", category: "Monitor", description: "No processing — raw mix" },
  { id: "ns10",      name: "Yamaha NS-10",        icon: "🎛️", category: "Studio", description: "Industry standard — unforgiving mids" },
  { id: "auratone",  name: "Auratone 5C",         icon: "📦", category: "Studio", description: "Mono cube — translation test" },
  { id: "genelec",   name: "Genelec 8030",        icon: "🔊", category: "Studio", description: "Accurate Finnish nearfield" },
  { id: "krk",       name: "KRK Rokit 8",         icon: "🟡", category: "Studio", description: "Hip hop/trap favorite" },
  { id: "adam",      name: "Adam A7X",            icon: "🎚️", category: "Studio", description: "Ribbon tweeter — electronic music" },
  { id: "focal",     name: "Focal Alpha 65",      icon: "🇫🇷", category: "Studio", description: "French studio monitor" },
  { id: "avantone",  name: "Avantone MixCube",    icon: "🟠", category: "Studio", description: "Modern Auratone mono reference" },
  { id: "mackie",    name: "Mackie HR824",         icon: "⚫", category: "Studio", description: "Classic home studio nearfield" },
  { id: "jbl306",    name: "JBL 306P",            icon: "🔵", category: "Studio", description: "Budget pro monitor" },
  { id: "eve",       name: "Eve SC207",           icon: "🎯", category: "Studio", description: "German precision" },
  { id: "amphion",   name: "Amphion One18",       icon: "🏔️", category: "Studio", description: "Mastering engineer favorite" },
  { id: "iphone",    name: "iPhone Speaker",      icon: "📱", category: "Consumer", description: "Most common phone speaker" },
  { id: "android",   name: "Android Phone",       icon: "📲", category: "Consumer", description: "Budget Android speaker" },
  { id: "macbook",   name: "MacBook Pro",         icon: "💻", category: "Consumer", description: "Laptop speakers" },
  { id: "airpods",   name: "AirPods/Earbuds",     icon: "🎧", category: "Consumer", description: "Consumer earbuds" },
  { id: "car",       name: "Car Stereo",          icon: "🚗", category: "Consumer", description: "Average sedan audio" },
  { id: "bluetooth", name: "Bluetooth Speaker",   icon: "📻", category: "Consumer", description: "JBL Flip type portable" },
  { id: "club",      name: "Club / PA",           icon: "🏟️", category: "Consumer", description: "Large venue system" },
  { id: "tv",        name: "TV Speakers",         icon: "📺", category: "Consumer", description: "Flat screen TV" },
  { id: "homepod",   name: "HomePod Mini",        icon: "🏠", category: "Consumer", description: "Apple smart speaker" },
  { id: "sonos",     name: "Sonos One",           icon: "⭕", category: "Consumer", description: "Wireless smart speaker" },
];

const SPEAKER_EQ = {
  flat:{low:0,lowMid:0,highMid:0,high:0,gain:0},
  ns10:{low:-3,lowMid:3,highMid:4,high:-3,gain:0},
  auratone:{low:-10,lowMid:5,highMid:2,high:-7,gain:3},
  genelec:{low:1,lowMid:0,highMid:1,high:2,gain:0},
  krk:{low:4,lowMid:-1,highMid:1,high:3,gain:-1},
  adam:{low:0,lowMid:0,highMid:2,high:5,gain:0},
  focal:{low:1,lowMid:1,highMid:0,high:1,gain:0},
  avantone:{low:-9,lowMid:4,highMid:3,high:-6,gain:3},
  mackie:{low:2,lowMid:-1,highMid:1,high:-1,gain:0},
  jbl306:{low:2,lowMid:0,highMid:2,high:1,gain:0},
  eve:{low:0,lowMid:0,highMid:0,high:1,gain:0},
  amphion:{low:-1,lowMid:1,highMid:0,high:0,gain:0},
  iphone:{low:-10,lowMid:3,highMid:5,high:-4,gain:4},
  android:{low:-12,lowMid:2,highMid:4,high:-8,gain:5},
  macbook:{low:-8,lowMid:1,highMid:3,high:-3,gain:3},
  airpods:{low:-2,lowMid:1,highMid:4,high:6,gain:1},
  car:{low:4,lowMid:-2,highMid:2,high:-1,gain:-1},
  bluetooth:{low:2,lowMid:-1,highMid:1,high:-4,gain:1},
  club:{low:6,lowMid:-1,highMid:0,high:2,gain:-3},
  tv:{low:-6,lowMid:3,highMid:4,high:-2,gain:2},
  homepod:{low:3,lowMid:0,highMid:2,high:-1,gain:0},
  sonos:{low:2,lowMid:0,highMid:1,high:0,gain:0},
};

// ── 20 consoles ──
const CONSOLES = [
  { id: "none",        name: "Bypass",          color: "#555",    desc: "Clean — no console color" },
  { id: "ssl4ke",      name: "SSL 4000E",       color: "#e8a020", desc: "British punch, tight drum bus" },
  { id: "ssl4kg",      name: "SSL 4000G",       color: "#d4941c", desc: "Classic R&B/pop, smoother" },
  { id: "ssl9000j",    name: "SSL 9000J",       color: "#f5b544", desc: "Refined mids, modern pop" },
  { id: "sslduality",  name: "SSL Duality",     color: "#d68c00", desc: "Hybrid, clean punch" },
  { id: "neve8078",    name: "Neve 8078",       color: "#4a9eff", desc: "Big vintage, huge rock" },
  { id: "neve1073",    name: "Neve 1073",       color: "#3a7acc", desc: "The classic — creamy mids" },
  { id: "neve88r",     name: "Neve 88R",        color: "#6ba3ff", desc: "Modern Neve, tight bass" },
  { id: "nevevr",      name: "Neve VR",         color: "#2e5c99", desc: "80s/90s rock, massive drums" },
  { id: "api1604",     name: "API 1604",        color: "#00ffc8", desc: "Aggressive mids, rock punch" },
  { id: "apilegacy",   name: "API Legacy+",     color: "#33ffd4", desc: "Big modern API, heavy drums" },
  { id: "apivision",   name: "API Vision",      color: "#00d9aa", desc: "Punchy, drum-friendly" },
  { id: "tridentA",    name: "Trident A",       color: "#a78bfa", desc: "British vibe, indie" },
  { id: "trident80b",  name: "Trident 80B",     color: "#c19bff", desc: "Warm mids, indie rock" },
  { id: "harrison32c", name: "Harrison 32C",    color: "#ff5050", desc: "Thriller/MJ signature" },
  { id: "emitg",       name: "EMI TG12345",     color: "#ffa500", desc: "Pink Floyd/Abbey Road" },
  { id: "helios69",    name: "Helios Type 69",  color: "#b08d57", desc: "Led Zeppelin, creamy rock" },
  { id: "rnd5088",     name: "RND 5088",        color: "#7ab8ff", desc: "Modern Rupert Neve, clarity" },
  { id: "studer900",   name: "Studer 900",      color: "#ff6b6b", desc: "Clean tape-machine feel" },
  { id: "mciJH636",    name: "MCI JH-636",      color: "#ff8c42", desc: "Muscle Shoals southern soul" },
];

const CONSOLE_EQ = {
  none:{low:0,lowMid:0,highMid:0,high:0,sat:0},
  ssl4ke:{low:1,lowMid:-1,highMid:2,high:1,sat:0.15},
  ssl4kg:{low:1,lowMid:0,highMid:1,high:1,sat:0.12},
  ssl9000j:{low:1,lowMid:1,highMid:1,high:2,sat:0.08},
  sslduality:{low:1,lowMid:0,highMid:1,high:1,sat:0.06},
  neve8078:{low:2,lowMid:2,highMid:1,high:1,sat:0.25},
  neve1073:{low:2,lowMid:3,highMid:2,high:1,sat:0.22},
  neve88r:{low:1,lowMid:2,highMid:1,high:2,sat:0.15},
  nevevr:{low:3,lowMid:2,highMid:1,high:2,sat:0.28},
  api1604:{low:1,lowMid:-1,highMid:3,high:2,sat:0.20},
  apilegacy:{low:2,lowMid:-1,highMid:3,high:2,sat:0.22},
  apivision:{low:2,lowMid:0,highMid:2,high:2,sat:0.18},
  tridentA:{low:1,lowMid:2,highMid:1,high:1,sat:0.18},
  trident80b:{low:1,lowMid:3,highMid:1,high:1,sat:0.20},
  harrison32c:{low:2,lowMid:1,highMid:2,high:3,sat:0.25},
  emitg:{low:2,lowMid:3,highMid:1,high:0,sat:0.30},
  helios69:{low:2,lowMid:3,highMid:2,high:1,sat:0.28},
  rnd5088:{low:1,lowMid:1,highMid:2,high:3,sat:0.10},
  studer900:{low:1,lowMid:0,highMid:0,high:0,sat:0.12},
  mciJH636:{low:2,lowMid:2,highMid:1,high:0,sat:0.22},
};

// ── 12 famous rooms ──
const ROOMS = [
  { id: "none",           name: "Dry Room",              icon: "🚪", desc: "No reverb — reference check",           decay: 0.1,  size: 0.1 },
  { id: "oceanway_a",     name: "Ocean Way Studio A",    icon: "🌊", desc: "Wide natural — countless hits",          decay: 1.8,  size: 0.85 },
  { id: "abbeyroad_2",    name: "Abbey Road Studio 2",   icon: "🏛️", desc: "The Beatles — warm intimate wood",        decay: 1.2,  size: 0.55 },
  { id: "capitol_a",      name: "Capitol Studios A",     icon: "🎼", desc: "Sinatra — echo chambers",                decay: 2.2,  size: 0.90 },
  { id: "electriclady",   name: "Electric Lady",         icon: "⚡", desc: "Hendrix — tight NYC",                     decay: 0.9,  size: 0.40 },
  { id: "sunsetsound",    name: "Sunset Sound",          icon: "🌅", desc: "Doors/Prince — live room",                decay: 1.3,  size: 0.60 },
  { id: "recordplant",    name: "Record Plant LA",       icon: "🌴", desc: "Eagles/Fleetwood Mac",                    decay: 1.5,  size: 0.70 },
  { id: "powerstation",   name: "Power Station NYC",     icon: "⚡", desc: "Bowie/Madonna — huge drums",              decay: 2.0,  size: 0.95 },
  { id: "muscleshoals",   name: "Muscle Shoals",         icon: "🎸", desc: "Southern warmth",                         decay: 1.1,  size: 0.50 },
  { id: "criteria",       name: "Criteria Miami",        icon: "🌴", desc: "Bee Gees/Clapton",                        decay: 1.4,  size: 0.65 },
  { id: "vangelder",      name: "Van Gelder Studio",     icon: "🎷", desc: "Classic jazz — Blue Note",               decay: 1.0,  size: 0.45 },
  { id: "unitedwestern",  name: "United Western",        icon: "🏖️", desc: "Beach Boys — West Coast",                 decay: 1.3,  size: 0.60 },
];

// ── 10 combined studio presets (console + room + speaker) ──
const STUDIO_PRESETS = [
  { id: "oceanway",    name: "Ocean Way Sessions",   icon: "🌊", console: "ssl4kg",    room: "oceanway_a",   speaker: "genelec",  desc: "Classic pop/rock polish" },
  { id: "abbeyroad",   name: "Abbey Road Classic",   icon: "🏛️", console: "neve8078",  room: "abbeyroad_2",  speaker: "auratone", desc: "Beatles-style warmth" },
  { id: "capitol",     name: "Capitol Old Hollywood",icon: "🎼", console: "api1604",   room: "capitol_a",    speaker: "ns10",     desc: "Sinatra-era grandeur" },
  { id: "electriclady",name: "Electric Lady Vibe",   icon: "⚡", console: "neve1073",  room: "electriclady", speaker: "ns10",     desc: "Hendrix/NYC rock" },
  { id: "powerhouse",  name: "Power Station 80s",    icon: "🔊", console: "ssl4ke",    room: "powerstation", speaker: "krk",      desc: "Huge 80s drums" },
  { id: "vangelder",   name: "Van Gelder Jazz",      icon: "🎷", console: "neve1073",  room: "vangelder",    speaker: "genelec",  desc: "Blue Note jazz classic" },
  { id: "muscleshoals",name: "Muscle Shoals Soul",   icon: "🎸", console: "tridentA",  room: "muscleshoals", speaker: "ns10",     desc: "Southern R&B/soul" },
  { id: "thriller",    name: "Thriller (Westlake)",  icon: "🌟", console: "harrison32c",room: "sunsetsound", speaker: "auratone", desc: "MJ Thriller-era sound" },
  { id: "hiphop2024",  name: "Hip Hop Modern",       icon: "🔥", console: "ssl9000j",  room: "powerstation", speaker: "krk",      desc: "Modern trap/hip hop" },
  { id: "lofi",        name: "Lo-Fi Bedroom",        icon: "🛏️", console: "none",      room: "none",         speaker: "airpods",  desc: "Intimate bedroom vibe" },
];

// ─────────────────────────────────────────────────────────────────────
// Build a synthetic impulse response for Web Audio ConvolverNode
// Uses exponential decay + early reflections — no files needed
// ─────────────────────────────────────────────────────────────────────
const buildImpulseResponse = (ctx, decay, size) => {
  const sampleRate = ctx.sampleRate;
  const length = Math.max(0.1, decay) * sampleRate;
  const impulse = ctx.createBuffer(2, length, sampleRate);

  for (let ch = 0; ch < 2; ch++) {
    const data = impulse.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      const t = i / length;
      // Exponential decay
      const decayGain = Math.pow(1 - t, 2 + decay);
      // Early reflections for size/room feel
      const earlyRefl = (i < sampleRate * 0.08) ? (Math.random() * 2 - 1) * 0.5 : 0;
      // Diffuse tail
      const tail = (Math.random() * 2 - 1) * decayGain;
      data[i] = (earlyRefl + tail) * size;
    }
  }
  return impulse;
};

// Waveshaper curve for console saturation
const makeSatCurve = (amount) => {
  const samples = 2048;
  const curve = new Float32Array(samples);
  const k = amount * 100;
  for (let i = 0; i < samples; i++) {
    const x = (i * 2) / samples - 1;
    curve[i] = ((1 + k) * x) / (1 + k * Math.abs(x));
  }
  return curve;
};

// ═════════════════════════════════════════════════════════════════════
// Main component
// ═════════════════════════════════════════════════════════════════════
const MonitorRoomPro = ({ audioContext, inputNode }) => {
  const [tab, setTab] = useState("speakers"); // speakers, consoles, rooms, studios, reference
  const [activeSpeaker, setActiveSpeaker] = useState(() => localStorage.getItem("mrp_speaker") || "flat");
  const [activeConsole, setActiveConsole] = useState(() => localStorage.getItem("mrp_console") || "none");
  const [activeRoom, setActiveRoom] = useState(() => localStorage.getItem("mrp_room") || "none");
  const [bypassAB, setBypassAB] = useState(false);
  const [isMono, setIsMono] = useState(false);
  const [monitorVol, setMonitorVol] = useState(0.8);
  const [roomMix, setRoomMix] = useState(0.3);
  const [speakerCat, setSpeakerCat] = useState("All");

  const chainRef = useRef({ nodes: [] });

  // Persist selections
  useEffect(() => { localStorage.setItem("mrp_speaker", activeSpeaker); }, [activeSpeaker]);
  useEffect(() => { localStorage.setItem("mrp_console", activeConsole); }, [activeConsole]);
  useEffect(() => { localStorage.setItem("mrp_room", activeRoom); }, [activeRoom]);

  // ── Signal chain: inputNode → [Console EQ+Sat] → [Room Convolver] → [Speaker EQ (monitor-only)] → destination ──
  useEffect(() => {
    if (!inputNode || !audioContext) return;
    const ctx = audioContext;

    // Teardown previous chain
    chainRef.current.nodes.forEach(n => { try { n.disconnect(); } catch(e){} });
    try { inputNode.disconnect(); } catch(e){}

    if (bypassAB) {
      inputNode.connect(ctx.destination);
      chainRef.current = { nodes: [] };
      return;
    }

    const nodes = [];
    let head = inputNode;

    // ── Console stage (audience hears this) ──
    if (activeConsole !== "none") {
      const eq = CONSOLE_EQ[activeConsole];
      const ls = ctx.createBiquadFilter(); ls.type="lowshelf"; ls.frequency.value=100; ls.gain.value=eq.low;
      const lm = ctx.createBiquadFilter(); lm.type="peaking"; lm.frequency.value=400; lm.Q.value=0.7; lm.gain.value=eq.lowMid;
      const hm = ctx.createBiquadFilter(); hm.type="peaking"; hm.frequency.value=3000; hm.Q.value=0.7; hm.gain.value=eq.highMid;
      const hs = ctx.createBiquadFilter(); hs.type="highshelf"; hs.frequency.value=10000; hs.gain.value=eq.high;

      head.connect(ls); ls.connect(lm); lm.connect(hm); hm.connect(hs);
      nodes.push(ls, lm, hm, hs);
      head = hs;

      // Saturation (WaveShaper)
      if (eq.sat > 0) {
        const sat = ctx.createWaveShaper();
        sat.curve = makeSatCurve(eq.sat);
        sat.oversample = "2x";
        head.connect(sat);
        nodes.push(sat);
        head = sat;
      }
    }

    // ── Room stage (audience hears this too — parallel dry/wet blend) ──
    if (activeRoom !== "none") {
      const room = ROOMS.find(r => r.id === activeRoom);
      if (room) {
        const conv = ctx.createConvolver();
        conv.buffer = buildImpulseResponse(ctx, room.decay, room.size);
        const wetGain = ctx.createGain();
        const dryGain = ctx.createGain();
        const merger = ctx.createGain();

        wetGain.gain.value = roomMix;
        dryGain.gain.value = 1 - roomMix;

        head.connect(dryGain);
        head.connect(conv);
        conv.connect(wetGain);
        dryGain.connect(merger);
        wetGain.connect(merger);

        nodes.push(conv, wetGain, dryGain, merger);
        head = merger;
      }
    }

    // ── Speaker sim stage (MONITOR ONLY — last in chain, applied only in non-bypass mode) ──
    if (activeSpeaker !== "flat") {
      const eq = SPEAKER_EQ[activeSpeaker];
      const sls = ctx.createBiquadFilter(); sls.type="lowshelf"; sls.frequency.value=200; sls.gain.value=eq.low;
      const slm = ctx.createBiquadFilter(); slm.type="peaking"; slm.frequency.value=500; slm.Q.value=0.7; slm.gain.value=eq.lowMid;
      const shm = ctx.createBiquadFilter(); shm.type="peaking"; shm.frequency.value=3000; shm.Q.value=0.7; shm.gain.value=eq.highMid;
      const shs = ctx.createBiquadFilter(); shs.type="highshelf"; shs.frequency.value=8000; shs.gain.value=eq.high;
      const sg = ctx.createGain(); sg.gain.value = Math.pow(10, eq.gain/20);

      head.connect(sls); sls.connect(slm); slm.connect(shm); shm.connect(shs); shs.connect(sg);
      nodes.push(sls, slm, shm, shs, sg);
      head = sg;
    }

    // Master monitor volume
    const outGain = ctx.createGain();
    outGain.gain.value = monitorVol;
    head.connect(outGain);
    outGain.connect(ctx.destination);
    nodes.push(outGain);

    // Mono
    if (isMono) {
      const splitter = ctx.createChannelSplitter(2);
      const merger = ctx.createChannelMerger(2);
      outGain.disconnect();
      outGain.connect(splitter);
      splitter.connect(merger, 0, 0);
      splitter.connect(merger, 0, 1);
      merger.connect(ctx.destination);
      nodes.push(splitter, merger);
    }

    chainRef.current = { nodes };

    return () => {
      chainRef.current.nodes.forEach(n => { try { n.disconnect(); } catch(e){} });
      try { inputNode.disconnect(); inputNode.connect(ctx.destination); } catch(e){}
    };
  }, [activeSpeaker, activeConsole, activeRoom, bypassAB, isMono, monitorVol, roomMix, inputNode, audioContext]);

  const applyStudioPreset = (preset) => {
    setActiveConsole(preset.console);
    setActiveRoom(preset.room);
    setActiveSpeaker(preset.speaker);
  };

  const currentSpeaker = SPEAKERS.find(s => s.id === activeSpeaker) || SPEAKERS[0];
  const currentConsole = CONSOLES.find(c => c.id === activeConsole) || CONSOLES[0];
  const currentRoom = ROOMS.find(r => r.id === activeRoom) || ROOMS[0];

  const speakerCats = ["All", "Studio", "Consumer"];
  const filteredSpeakers = speakerCat === "All" ? SPEAKERS : SPEAKERS.filter(s => s.category === speakerCat);

  return (
    <div className="mrp-wrapper">
      {/* Top tab bar */}
      <div className="mrp-tabs">
        <button className={"mrp-tab" + (tab === "speakers" ? " active" : "")} onClick={() => setTab("speakers")}>🎧 Speakers</button>
        <button className={"mrp-tab" + (tab === "consoles" ? " active" : "")} onClick={() => setTab("consoles")}>🎛️ Consoles</button>
        <button className={"mrp-tab" + (tab === "rooms" ? " active" : "")} onClick={() => setTab("rooms")}>🏛️ Rooms</button>
        <button className={"mrp-tab" + (tab === "studios" ? " active" : "")} onClick={() => setTab("studios")}>🎬 Studios</button>
        <button className={"mrp-tab" + (tab === "reference" ? " active" : "")} onClick={() => setTab("reference")}>📊 Reference Mix</button>
      </div>

      {/* Header with global controls */}
      <div className="mrp-header">
        <div className="mrp-status">
          <div className="mrp-status-row">
            <span className="mrp-label">Speaker:</span><strong>{currentSpeaker.name}</strong>
            <span className="mrp-badge mrp-badge-monitor">YOUR EARS ONLY</span>
          </div>
          <div className="mrp-status-row">
            <span className="mrp-label">Console:</span><strong style={{color: currentConsole.color}}>{currentConsole.name}</strong>
            <span className="mrp-badge mrp-badge-print">PRINTS TO OUTPUT</span>
          </div>
          <div className="mrp-status-row">
            <span className="mrp-label">Room:</span><strong>{currentRoom.name}</strong>
            <span className="mrp-badge mrp-badge-print">PRINTS TO OUTPUT</span>
          </div>
        </div>
        <div className="mrp-header-ctrls">
          <button className={"mrp-ab-btn" + (bypassAB ? " active" : "")} onClick={() => setBypassAB(v => !v)}>
            A/B {bypassAB ? "(BYPASSED)" : "(ACTIVE)"}
          </button>
          <button className={"mrp-mono-btn" + (isMono ? " active" : "")} onClick={() => setIsMono(v => !v)}>
            MONO {isMono ? "ON" : "OFF"}
          </button>
          <div className="mrp-vol">
            <label>MONITOR</label>
            <input type="range" min="0" max="1" step="0.01" value={monitorVol} onChange={e => setMonitorVol(parseFloat(e.target.value))}/>
            <span>{Math.round(monitorVol*100)}%</span>
          </div>
        </div>
      </div>

      {/* Tab content */}
      <div className="mrp-content">

        {tab === "speakers" && (
          <>
            <div className="mrp-subheader">
              <div className="mrp-cat-tabs">
                {speakerCats.map(c => (
                  <button key={c} className={"mrp-cat-tab" + (speakerCat === c ? " active" : "")} onClick={() => setSpeakerCat(c)}>{c}</button>
                ))}
              </div>
              <div className="mrp-hint">💡 Switches affect only what YOU hear — audience unchanged</div>
            </div>
            <div className="mrp-grid">
              {filteredSpeakers.map(s => (
                <div key={s.id}
                     className={"mrp-card" + (s.id === activeSpeaker ? " active" : "")}
                     onClick={() => setActiveSpeaker(s.id)}>
                  <div className="mrp-card-icon">{s.icon}</div>
                  <div className="mrp-card-name">{s.name}</div>
                  <div className="mrp-card-desc">{s.description}</div>
                  <div className="mrp-card-tag">{s.category}</div>
                </div>
              ))}
            </div>
          </>
        )}

        {tab === "consoles" && (
          <>
            <div className="mrp-subheader">
              <div className="mrp-hint">🎛️ Applied to master bus. Event speakers, livestream, and recording all hear this.</div>
            </div>
            <div className="mrp-grid">
              {CONSOLES.map(c => (
                <div key={c.id}
                     className={"mrp-card" + (c.id === activeConsole ? " active" : "")}
                     onClick={() => setActiveConsole(c.id)}
                     style={{ borderLeftColor: c.color, borderLeftWidth: "4px", borderLeftStyle: "solid" }}>
                  <div className="mrp-card-name" style={{color: c.color}}>{c.name}</div>
                  <div className="mrp-card-desc">{c.desc}</div>
                </div>
              ))}
            </div>
          </>
        )}

        {tab === "rooms" && (
          <>
            <div className="mrp-subheader">
              <div className="mrp-vol">
                <label>ROOM MIX</label>
                <input type="range" min="0" max="1" step="0.01" value={roomMix} onChange={e => setRoomMix(parseFloat(e.target.value))}/>
                <span>{Math.round(roomMix*100)}%</span>
              </div>
              <div className="mrp-hint">🏛️ Places your mix inside a famous studio. Everyone hears it.</div>
            </div>
            <div className="mrp-grid">
              {ROOMS.map(r => (
                <div key={r.id}
                     className={"mrp-card" + (r.id === activeRoom ? " active" : "")}
                     onClick={() => setActiveRoom(r.id)}>
                  <div className="mrp-card-icon">{r.icon}</div>
                  <div className="mrp-card-name">{r.name}</div>
                  <div className="mrp-card-desc">{r.desc}</div>
                </div>
              ))}
            </div>
          </>
        )}

        {tab === "studios" && (
          <>
            <div className="mrp-subheader">
              <div className="mrp-hint">🎬 One-click setups combining Console + Room + reference Speaker</div>
            </div>
            <div className="mrp-grid mrp-grid-studios">
              {STUDIO_PRESETS.map(p => {
                const con = CONSOLES.find(c => c.id === p.console);
                const room = ROOMS.find(r => r.id === p.room);
                const spk = SPEAKERS.find(s => s.id === p.speaker);
                const isActive = activeConsole === p.console && activeRoom === p.room && activeSpeaker === p.speaker;
                return (
                  <div key={p.id}
                       className={"mrp-card mrp-studio-card" + (isActive ? " active" : "")}
                       onClick={() => applyStudioPreset(p)}>
                    <div className="mrp-card-icon">{p.icon}</div>
                    <div className="mrp-card-name">{p.name}</div>
                    <div className="mrp-card-desc">{p.desc}</div>
                    <div className="mrp-studio-chain">
                      <span style={{color: con?.color}}>{con?.name}</span>
                      <span>·</span>
                      <span>{room?.name}</span>
                      <span>·</span>
                      <span>{spk?.name}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {tab === "reference" && (
          <div className="mrp-reference">
            <div className="mrp-hint" style={{marginBottom: 12}}>📊 Advanced: load reference tracks and compare against your mix with mute/solo</div>
            <SpeakerSimulator audioContext={audioContext} inputNode={inputNode} />
          </div>
        )}

      </div>
    </div>
  );
};

export default MonitorRoomPro;
