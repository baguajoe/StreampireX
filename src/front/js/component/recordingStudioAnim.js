const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta
  name="viewport"
  content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"
/>
<title>StreamPireX Recording Studio Demo</title>
<style>
:root {
  --bg: #050813;
  --panel: #09111b;
  --panel-2: #0c1623;
  --panel-3: #0f1b2b;
  --line: #17324a;
  --line-soft: #102638;
  --text: #dce8f3;
  --muted: #6e8aa3;
  --teal: #00ffc8;
  --orange: #ff8a1e;
  --red: #ff4d4f;
  --yellow: #ffbf47;
}

*,
*::before,
*::after {
  box-sizing: border-box;
}

html,
body {
  width: 100%;
  min-width: 100%;
  max-width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
  overflow: hidden;
  background:
    radial-gradient(circle at top center, rgba(0,255,200,0.08), transparent 30%),
    linear-gradient(180deg, #07111c 0%, #030914 100%);
  font-family: "JetBrains Mono", "Fira Code", "Courier New", monospace;
  color: var(--text);
}

body {
  display: block;
}

#app {
  width: 100vw;
  height: 100vh;
  min-width: 100vw;
  max-width: 100vw;
  min-height: 100vh;
  max-height: 100vh;
  overflow: hidden;
}

.daw-root {
  width: 100vw;
  height: 100vh;
  min-width: 100vw;
  max-width: 100vw;
  min-height: 100vh;
  max-height: 100vh;
  display: grid;
  grid-template-rows: 36px 44px 1fr 108px 140px 34px;
  background: linear-gradient(180deg, rgba(5,8,19,0.96), rgba(2,5,12,0.98));
  border: 1px solid rgba(0,255,200,0.18);
  box-shadow:
    0 0 0 1px rgba(0,255,200,0.06) inset,
    0 0 28px rgba(0,255,200,0.08);
  overflow: hidden;
}

/* topbar */
.topbar {
  display: flex;
  align-items: center;
  min-width: 0;
  background: rgba(10, 18, 29, 0.95);
  border-bottom: 1px solid var(--line);
  overflow: hidden;
}

.collab-area {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 12px;
  height: 100%;
  border-right: 1px solid var(--line);
  flex: 0 0 auto;
}

.collab-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #35546f;
  box-shadow: 0 0 8px rgba(53,84,111,0.45);
}

.collab-label {
  font-size: 10px;
  color: var(--muted);
  font-weight: 700;
  text-transform: uppercase;
}

.session-btns {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 10px;
  border-right: 1px solid var(--line);
  height: 100%;
  flex: 0 0 auto;
}

.sbtn {
  height: 24px;
  padding: 0 12px;
  border: none;
  border-radius: 4px;
  font: inherit;
  font-size: 11px;
  font-weight: 800;
  cursor: pointer;
  white-space: nowrap;
}

.sbtn-start {
  background: var(--teal);
  color: #041014;
  box-shadow: 0 0 10px rgba(0,255,200,0.22);
}

.nav-tabs {
  display: flex;
  align-items: stretch;
  min-width: 0;
  flex: 1 1 auto;
  overflow: hidden;
}

.ntab {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 78px;
  padding: 0 14px;
  border-right: 1px solid var(--line-soft);
  color: var(--muted);
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  white-space: nowrap;
}

.ntab.active {
  color: var(--teal);
  background: rgba(0,255,200,0.06);
  box-shadow: inset 0 -2px 0 var(--teal);
}

.export-btn {
  margin: 0 8px 0 10px;
  height: 28px;
  padding: 0 16px;
  border: none;
  border-radius: 4px;
  background: var(--teal);
  color: #041014;
  font: inherit;
  font-size: 12px;
  font-weight: 900;
  cursor: pointer;
  flex: 0 0 auto;
}

/* transport */
.transport {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  padding: 0 12px;
  background: rgba(6, 14, 23, 0.98);
  border-bottom: 1px solid var(--line);
}

.tport-btn {
  width: 24px;
  height: 24px;
  border: 1px solid #26415a;
  border-radius: 4px;
  background: #101b29;
  color: #b9d7ec;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font: inherit;
  font-size: 12px;
  font-weight: 900;
  cursor: pointer;
  flex: 0 0 auto;
}

.tport-btn.playing {
  background: var(--teal);
  color: #041014;
  border-color: var(--teal);
  box-shadow: 0 0 12px rgba(0,255,200,0.28);
}

.bpm-group {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: 2px;
  flex: 0 0 auto;
}

.bpm-val {
  font-size: 14px;
  font-weight: 900;
  color: #f7fcff;
}

.time-display {
  font-size: 15px;
  font-weight: 900;
  color: var(--teal);
  letter-spacing: 1px;
  text-shadow: 0 0 10px rgba(0,255,200,0.18);
  min-width: 110px;
}

/* main */
.main-area {
  display: grid;
  grid-template-columns: 150px minmax(0, 1fr) 96px;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

.track-headers {
  min-width: 0;
  background: rgba(8, 15, 25, 0.96);
  border-right: 1px solid var(--line);
  overflow: hidden;
}

.track-row {
  height: 56px;
  padding: 0 10px;
  display: flex;
  align-items: center;
  gap: 8px;
  border-bottom: 1px solid rgba(23,50,74,0.6);
}

.track-color-bar {
  width: 4px;
  height: 36px;
  border-radius: 3px;
  flex: 0 0 auto;
}

.track-info {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.track-name {
  font-size: 11px;
  font-weight: 800;
  color: #e9f5ff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.track-type {
  font-size: 9px;
  color: var(--muted);
  text-transform: uppercase;
}

.timeline-wrap {
  min-width: 0;
  min-height: 0;
  display: grid;
  grid-template-rows: 30px minmax(0, 1fr);
  overflow: hidden;
}

.ruler {
  position: relative;
  min-width: 0;
  background: rgba(8, 15, 25, 0.95);
  border-bottom: 1px solid var(--line);
  overflow: hidden;
}

.ruler-mark {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 1px;
  background: rgba(39, 79, 110, 0.65);
}

.ruler-label {
  position: absolute;
  top: 6px;
  left: 6px;
  font-size: 10px;
  color: var(--muted);
  font-weight: 700;
}

.clip-area {
  position: relative;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  background:
    repeating-linear-gradient(
      90deg,
      rgba(5,8,18,0.0) 0,
      rgba(5,8,18,0.0) calc(12.5% - 1px),
      rgba(13,30,46,0.85) calc(12.5% - 1px),
      rgba(13,30,46,0.85) 12.5%
    ),
    linear-gradient(180deg, rgba(2,6,12,0.96), rgba(1,3,9,0.98));
}

.track-lane {
  position: relative;
  height: 56px;
  border-bottom: 1px solid rgba(23,50,74,0.55);
}

.clip {
  position: absolute;
  top: 8px;
  height: 40px;
  border-radius: 6px;
  display: flex;
  align-items: flex-end;
  padding: 0 10px 7px;
  overflow: hidden;
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,0.05),
    0 0 0 1px rgba(255,255,255,0.03);
}

.clip::before {
  content: "";
  position: absolute;
  inset: 0;
  background:
    linear-gradient(180deg, rgba(255,255,255,0.08), transparent 45%),
    repeating-linear-gradient(
      90deg,
      transparent 0,
      transparent 8px,
      rgba(255,255,255,0.035) 8px,
      rgba(255,255,255,0.035) 10px
    );
  pointer-events: none;
}

.clip-label {
  position: relative;
  z-index: 1;
  font-size: 10px;
  font-weight: 800;
  white-space: nowrap;
}

.playhead {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2px;
  background: var(--teal);
  z-index: 50;
  box-shadow: 0 0 10px rgba(0,255,200,0.55);
  pointer-events: none;
}

.playhead::before {
  content: "";
  position: absolute;
  top: 0;
  left: -4px;
  width: 10px;
  height: 10px;
  background: var(--teal);
  clip-path: polygon(50% 0%, 0% 100%, 100% 100%);
  filter: drop-shadow(0 0 8px rgba(0,255,200,0.5));
}

.fx-panel {
  background: rgba(8, 15, 25, 0.96);
  border-left: 1px solid var(--line);
  padding: 8px 6px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.fx-btn {
  height: 24px;
  border: 1px solid #1b5565;
  border-radius: 4px;
  background: rgba(0,255,200,0.05);
  color: var(--teal);
  font: inherit;
  font-size: 10px;
  font-weight: 800;
}

/* mixer */
.mixer {
  display: flex;
  min-width: 0;
  overflow-x: auto;
  background: rgba(3,9,15,0.98);
  border-top: 1px solid var(--line);
}

.mixer-ch {
  min-width: 76px;
  border-right: 1px solid rgba(23,50,74,0.5);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 6px 6px 4px;
  flex: 0 0 auto;
}

.ch-name {
  font-size: 9px;
  font-weight: 800;
  margin-bottom: 6px;
}

.ch-vu {
  height: 26px;
  display: flex;
  align-items: end;
  gap: 2px;
  margin-bottom: 8px;
}

.ch-vu-bar {
  width: 6px;
  height: 3px;
  border-radius: 2px 2px 0 0;
  background: #1d3147;
  transition: height 0.08s linear, background 0.08s linear;
}

.ch-fader {
  -webkit-appearance: none;
  appearance: none;
  width: 48px;
  height: 4px;
  margin-top: 18px;
  background: #223a53;
  transform: rotate(-90deg);
  border-radius: 999px;
}

.ch-fader::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 11px;
  height: 11px;
  border-radius: 50%;
  background: var(--teal);
  box-shadow: 0 0 8px rgba(0,255,200,0.28);
}

/* library */
.lib {
  background: rgba(4, 8, 18, 0.98);
  border-top: 1px solid var(--line);
  padding: 10px 12px;
  overflow: hidden;
}

.lib-title {
  color: var(--orange);
  font-size: 11px;
  font-weight: 900;
  margin-bottom: 10px;
}

.lib-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.lib-row {
  min-width: 0;
  border: 1px solid rgba(23,50,74,0.55);
  background: rgba(9,17,29,0.82);
  border-radius: 6px;
  padding: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.lib-name {
  min-width: 0;
  font-size: 11px;
  color: #d8e8f5;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.lib-load-btn {
  border: none;
  background: var(--teal);
  color: #041014;
  font: inherit;
  font-size: 9px;
  font-weight: 900;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
  flex: 0 0 auto;
}

/* footer note */
.footer-note {
  display: flex;
  align-items: center;
  padding: 0 12px;
  border-top: 1px solid rgba(23,50,74,0.5);
  color: var(--teal);
  background: rgba(7, 16, 25, 0.98);
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* responsive */
@media (max-width: 900px) {
  .daw-root {
    grid-template-rows: 36px 44px 1fr 100px 128px 32px;
  }

  .main-area {
    grid-template-columns: 120px minmax(0, 1fr) 72px;
  }

  .track-row,
  .track-lane {
    height: 52px;
  }

  .lib-list {
    grid-template-columns: 1fr;
  }

  .ntab {
    min-width: 64px;
    padding: 0 10px;
    font-size: 10px;
  }
}

@media (max-width: 640px) {
  .main-area {
    grid-template-columns: 92px minmax(0, 1fr) 58px;
  }

  .collab-area {
    padding: 0 8px;
  }

  .session-btns {
    padding: 0 8px;
  }

  .sbtn {
    padding: 0 8px;
    font-size: 10px;
  }

  .export-btn {
    padding: 0 10px;
    font-size: 11px;
  }

  .time-display {
    min-width: 88px;
    font-size: 12px;
  }

  .ntab {
    min-width: 54px;
    padding: 0 8px;
    font-size: 9px;
  }

  .track-name {
    font-size: 10px;
  }

  .track-type {
    font-size: 8px;
  }

  .fx-btn {
    font-size: 9px;
    height: 22px;
  }
}
</style>
</head>
<body>
<div id="app">
  <div class="daw-root">
    <div class="topbar">
      <div class="collab-area">
        <div class="collab-dot"></div>
        <span class="collab-label">Collab</span>
      </div>

      <div class="session-btns">
        <button class="sbtn sbtn-start">+ Start</button>
      </div>

      <div class="nav-tabs">
        <div class="ntab active">Arrange</div>
        <div class="ntab">Console</div>
        <div class="ntab">Piano</div>
      </div>

      <button class="export-btn">Export</button>
    </div>

    <div class="transport">
      <button class="tport-btn" id="stopBtn">■</button>
      <button class="tport-btn" id="playBtn">▶</button>
      <div class="bpm-group">
        <span class="bpm-val">120</span>
      </div>
      <div class="time-display" id="timeDisplay">1 . 1 . 000</div>
    </div>

    <div class="main-area">
      <div class="track-headers" id="trackList"></div>

      <div class="timeline-wrap">
        <div class="ruler" id="ruler"></div>
        <div class="clip-area" id="clipArea">
          <div class="playhead" id="playhead" style="left:0%;"></div>
        </div>
      </div>

      <div class="fx-panel">
        <button class="fx-btn">EQ</button>
        <button class="fx-btn">Comp</button>
      </div>
    </div>

    <div class="mixer" id="mixer"></div>

    <div class="lib">
      <div class="lib-title">📁 LIBRARY</div>
      <div class="lib-list" id="libList"></div>
    </div>

    <div class="footer-note">🚀 StreamPireX — The all-in-one creator platform. Replace 15+ tools. Keep 90%.</div>
  </div>
</div>

<script>
(function () {
  const BPM = 120;
  const BARS_VISIBLE = 8;
  const BEATS_PER_BAR = 4;
  const TOTAL_BEATS = BARS_VISIBLE * BEATS_PER_BAR;

  const TRACKS = [
    { name: "Vocals", type: "Audio", color: "#00ffc8", clips: [{ x: 2, w: 26, label: "Verse 1" }] },
    { name: "Drums", type: "Beat", color: "#ff8a1e", clips: [{ x: 2, w: 88, label: "Pattern" }] },
    { name: "Bass", type: "MIDI", color: "#ff4d4f", clips: [{ x: 2, w: 26, label: "Bassline" }] },
    { name: "Synth", type: "MIDI", color: "#7d6bff", clips: [{ x: 30, w: 20, label: "Hook Chords" }] }
  ];

  const LIB_DATA = [
    { name: "808 Sub", color: "#ff4d4f" },
    { name: "Synth Lead", color: "#00ffc8" },
    { name: "Pad Stack", color: "#7d6bff" },
    { name: "Snare Bus", color: "#ffbf47" }
  ];

  const trackListEl = document.getElementById("trackList");
  const clipAreaEl = document.getElementById("clipArea");
  const rulerEl = document.getElementById("ruler");
  const mixerEl = document.getElementById("mixer");
  const libListEl = document.getElementById("libList");
  const playheadEl = document.getElementById("playhead");
  const timeDisplayEl = document.getElementById("timeDisplay");
  const playBtn = document.getElementById("playBtn");
  const stopBtn = document.getElementById("stopBtn");

  let isPlaying = false;
  let rafId = null;
  let meterInterval = null;
  let lastTs = null;
  let positionPercent = 0;

  function renderRuler() {
    rulerEl.innerHTML = "";
    for (let i = 0; i <= BARS_VISIBLE; i++) {
      const mark = document.createElement("div");
      mark.className = "ruler-mark";
      mark.style.left = (i * (100 / BARS_VISIBLE)) + "%";

      if (i < BARS_VISIBLE) {
        const label = document.createElement("div");
        label.className = "ruler-label";
        label.textContent = String(i + 1);
        mark.appendChild(label);
      }

      rulerEl.appendChild(mark);
    }
  }

  function renderTracks() {
    trackListEl.innerHTML = "";

    clipAreaEl.querySelectorAll(".track-lane").forEach((lane) => lane.remove());

    TRACKS.forEach((track) => {
      const row = document.createElement("div");
      row.className = "track-row";
      row.innerHTML =
        '<div class="track-color-bar" style="background:' + track.color + ';"></div>' +
        '<div class="track-info">' +
          '<div class="track-name">' + track.name + "</div>" +
          '<div class="track-type">' + track.type + "</div>" +
        "</div>";
      trackListEl.appendChild(row);

      const lane = document.createElement("div");
      lane.className = "track-lane";

      track.clips.forEach((clipData) => {
        const clip = document.createElement("div");
        clip.className = "clip";
        clip.style.left = clipData.x + "%";
        clip.style.width = clipData.w + "%";
        clip.style.background = track.color + "22";
        clip.style.border = "1px solid " + track.color + "66";
        clip.innerHTML =
          '<span class="clip-label" style="color:' + track.color + ';">' + clipData.label + "</span>";
        lane.appendChild(clip);
      });

      clipAreaEl.appendChild(lane);
    });

    clipAreaEl.appendChild(playheadEl);
  }

  function renderMixer() {
    mixerEl.innerHTML = "";
    TRACKS.concat([{ name: "Master", color: "#ffffff" }]).forEach((track, idx) => {
      const ch = document.createElement("div");
      ch.className = "mixer-ch";
      ch.innerHTML =
        '<div class="ch-name" style="color:' + track.color + ';">' + track.name + "</div>" +
        '<div class="ch-vu">' +
          '<div class="ch-vu-bar"></div>' +
          '<div class="ch-vu-bar"></div>' +
        "</div>" +
        '<input type="range" class="ch-fader" min="0" max="100" value="' + (idx === TRACKS.length ? 84 : 72) + '">';
      mixerEl.appendChild(ch);
    });
  }

  function renderLibrary() {
    libListEl.innerHTML = "";
    LIB_DATA.forEach((item) => {
      const row = document.createElement("div");
      row.className = "lib-row";
      row.innerHTML =
        '<span class="lib-name">' + item.name + "</span>" +
        '<button class="lib-load-btn">LOAD</button>';
      row.querySelector(".lib-load-btn").addEventListener("click", () => {
        const count = TRACKS.filter((t) => t.name.startsWith(item.name)).length;
        TRACKS.push({
          name: count ? item.name + " " + (count + 1) : item.name,
          type: "Audio",
          color: item.color,
          clips: [{ x: 34, w: 20, label: "Imported" }]
        });
        renderTracks();
        renderMixer();
      });
      libListEl.appendChild(row);
    });
  }

  function setPlayhead(percent) {
    positionPercent = Math.max(0, Math.min(100, percent));
    playheadEl.style.left = positionPercent + "%";
    updateTimeDisplay();
  }

  function updateTimeDisplay() {
    const totalBeatsElapsed = (positionPercent / 100) * TOTAL_BEATS;
    const bar = Math.floor(totalBeatsElapsed / BEATS_PER_BAR) + 1;
    const beat = Math.floor(totalBeatsElapsed % BEATS_PER_BAR) + 1;
    const ticks = String(Math.floor((totalBeatsElapsed % 1) * 1000)).padStart(3, "0");
    timeDisplayEl.textContent = bar + " . " + beat + " . " + ticks;
  }

  function animateMeters() {
    const bars = mixerEl.querySelectorAll(".ch-vu-bar");
    bars.forEach((bar) => {
      const v = isPlaying ? Math.random() : 0.05;
      const h = 3 + v * 22;
      bar.style.height = h + "px";

      if (v > 0.8) {
        bar.style.background = "var(--red)";
      } else if (v > 0.5) {
        bar.style.background = "var(--yellow)";
      } else if (v > 0.14) {
        bar.style.background = "var(--teal)";
      } else {
        bar.style.background = "#1d3147";
      }
    });
  }

  function startMeters() {
    stopMeters();
    meterInterval = setInterval(animateMeters, 80);
  }

  function stopMeters() {
    if (meterInterval) {
      clearInterval(meterInterval);
      meterInterval = null;
    }
    animateMeters();
  }

  function tick(ts) {
    if (!isPlaying) return;

    if (lastTs == null) lastTs = ts;
    const delta = (ts - lastTs) / 1000;
    lastTs = ts;

    const beatsPerSecond = BPM / 60;
    const barsPerSecond = beatsPerSecond / BEATS_PER_BAR;
    const totalTimelineSeconds = BARS_VISIBLE / barsPerSecond;
    const percentPerSecond = 100 / totalTimelineSeconds;

    positionPercent += percentPerSecond * delta;
    if (positionPercent > 100) positionPercent = 0;

    setPlayhead(positionPercent);
    rafId = requestAnimationFrame(tick);
  }

  function play() {
    if (isPlaying) return;
    isPlaying = true;
    playBtn.textContent = "⏸";
    playBtn.classList.add("playing");
    lastTs = null;
    startMeters();
    rafId = requestAnimationFrame(tick);
  }

  function pause() {
    isPlaying = false;
    playBtn.textContent = "▶";
    playBtn.classList.remove("playing");
    lastTs = null;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
    stopMeters();
  }

  function stop() {
    pause();
    setPlayhead(0);
  }

  function togglePlay() {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }

  function forceResize() {
    const app = document.getElementById("app");
    const w = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
    const h = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;
    app.style.width = w + "px";
    app.style.height = h + "px";
  }

  function boot() {
    renderRuler();
    renderTracks();
    renderMixer();
    renderLibrary();
    setPlayhead(0);
    animateMeters();
    forceResize();

    playBtn.addEventListener("click", togglePlay);
    stopBtn.addEventListener("click", stop);
    window.addEventListener("resize", forceResize);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        play();
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
</script>
</body>
</html>`;

export default html;