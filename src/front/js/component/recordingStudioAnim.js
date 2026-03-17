const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>

*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html, body {
  width: 100%;
  height: 100%;
  background: #070b0f;
  font-family: 'JetBrains Mono', 'Fira Code', 'Courier New', monospace;
  color: #dde6ef;
  overflow: auto;
  user-select: none;
}

.daw-root {
width: 95%;            /* Fills most of the width */
  max-width: 1200px;     /* Matches the 'Desktop App' scale in your image */
  height: 600px;         /* Forces a fixed, professional height */
  margin: 40px auto;     /* Centers it and adds space at the top/bottom */
  
  /* ── THE STYLING ── */
  background: #06060f;
  border: 1px solid #1a1a2e; /* The subtle border seen in the screenshot */
  border-radius: 12px;       /* Rounded corners for the 'App' look */
  box-shadow: 0 20px 50px rgba(0,0,0,0.6); /* Adds the depth from the image */
  
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* ── Top bar ── */
.topbar {
  display: flex;
  align-items: center;
  gap: 0;
  background: #0c1219;
  border-bottom: 1px solid #243548;
  height: 36px;
  padding: 0 10px;
  flex-shrink: 0;
}

.collab-area {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 10px;
  border-right: 1px solid #243548;
  height: 36px;
  flex-shrink: 0;
}

.collab-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #4e6a82;
}

.collab-label {
  font-size: 10px;
  font-weight: 700;
  color: #4e6a82;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.session-btns {
  display: flex;
  gap: 6px;
  padding: 0 12px;
  border-right: 1px solid #243548;
  align-items: center;
  height: 36px;
  flex-shrink: 0;
}

.sbtn {
  padding: 5px 12px;
  border-radius: 5px;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  border: none;
  font-family: inherit;
  letter-spacing: 0.3px;
}

.sbtn-start {
  background: #00ffc8;
  color: #041014;
}

.sbtn-join {
  background: #111a24;
  color: #8fa8bf;
  border: 1px solid #243548;
}

.nav-tabs {
  display: flex;
  align-items: center;
  height: 36px;
  overflow-x: auto;
  scrollbar-width: none;
  flex: 1;
  padding: 0 4px;
}

.nav-tabs::-webkit-scrollbar {
  display: none;
}

.ntab {
  padding: 0 12px;
  height: 36px;
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 600;
  color: #4e6a82;
  cursor: pointer;
  border-right: 1px solid #1a2838;
  white-space: nowrap;
  transition: all 0.12s;
  flex-shrink: 0;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.ntab:hover {
  color: #8fa8bf;
  background: rgba(255, 255, 255, 0.03);
}

.ntab.active {
  color: #00ffc8;
  background: rgba(0, 255, 200, 0.06);
  border-bottom: 2px solid #00ffc8;
}

.export-btn {
  margin-left: 8px;
  padding: 5px 14px;
  border-radius: 5px;
  background: #00ffc8;
  color: #041014;
  font-size: 11px;
  font-weight: 800;
  border: none;
  cursor: pointer;
  flex-shrink: 0;
  font-family: inherit;
  letter-spacing: 0.5px;
}

/* ── Transport ── */
.transport {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #0a0f16;
  border-bottom: 1px solid #243548;
  padding: 6px 14px;
  height: 46px;
  flex-shrink: 0;
}

.tport-btn {
  width: 30px;
  height: 30px;
  border-radius: 5px;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  transition: all 0.12s;
  flex-shrink: 0;
}

.tport-stop {
  background: #111a24;
  color: #8fa8bf;
  border: 1px solid #243548;
}

.tport-play {
  background: #00ffc8;
  color: #041014;
  font-size: 14px;
}

.tport-rec {
  background: rgba(255, 69, 58, 0.15);
  color: #ff453a;
  border: 1px solid rgba(255, 69, 58, 0.35);
}

@keyframes rec-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(255, 69, 58, 0.4); }
  50%       { box-shadow: 0 0 0 6px rgba(255, 69, 58, 0); }
}

.transport-divider {
  width: 1px;
  height: 24px;
  background: #243548;
  margin: 0 2px;
  flex-shrink: 0;
}

.bpm-group {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.bpm-label {
  font-size: 10px;
  font-weight: 800;
  color: #4e6a82;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.bpm-val {
  font-size: 18px;
  font-weight: 800;
  color: #dde6ef;
  min-width: 44px;
  letter-spacing: 1px;
}

.time-display {
  font-size: 14px;
  font-weight: 700;
  color: #00ffc8;
  letter-spacing: 2px;
  min-width: 90px;
  text-shadow: 0 0 10px rgba(0, 255, 200, 0.3);
}

.snap-select {
  background: #111a24;
  border: 1px solid #243548;
  color: #8fa8bf;
  font-size: 11px;
  padding: 4px 7px;
  border-radius: 4px;
  outline: none;
  font-family: inherit;
  flex-shrink: 0;
}

.zoom-btn {
  padding: 4px 10px;
  border-radius: 4px;
  border: 1px solid #00ffc8;
  background: rgba(0, 255, 200, 0.1);
  color: #00ffc8;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  font-family: inherit;
  flex-shrink: 0;
}

.rec-ready-btn {
  padding: 5px 10px;
  border-radius: 4px;
  background: rgba(255, 69, 58, 0.15);
  border: 1px solid rgba(255, 69, 58, 0.35);
  color: #ff453a;
  font-size: 10px;
  font-weight: 800;
  cursor: pointer;
  font-family: inherit;
  flex-shrink: 0;
  letter-spacing: 0.5px;
}

/* ── Main area ── */
.main-area {
  display: flex;
  flex: 1;
  overflow: hidden;
  min-height: 0;
}

/* ── Track headers (% width, no hard px) ── */
.track-headers {
  width: 130px;
  min-width: 130px;
  max-width: 130px;
  flex-shrink: 0;
  background: #0c1219;
  border-right: 1px solid #243548;
  overflow-y: auto;
  scrollbar-width: none;
  display: flex;
  flex-direction: column;
}

.track-headers::-webkit-scrollbar {
  display: none;
}

.tracks-header-bar {
  height: 28px;
  background: #0a0f16;
  border-bottom: 1px solid #243548;
  display: flex;
  align-items: center;
  padding: 0 10px;
  font-size: 9px;
  font-weight: 800;
  color: #4e6a82;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  flex-shrink: 0;
}

.track-row {
  height: 48px;
  border-bottom: 1px solid #0d1820;
  display: flex;
  align-items: center;
  padding: 0 8px;
  gap: 6px;
  cursor: pointer;
  transition: background 0.12s;
  flex-shrink: 0;
}

.track-row:hover {
  background: rgba(255, 255, 255, 0.03);
}

.track-row.selected {
  background: rgba(0, 255, 200, 0.05);
  border-left: 2px solid #00ffc8;
}

.track-color-bar {
  width: 3px;
  height: 32px;
  border-radius: 2px;
  flex-shrink: 0;
}

.track-info {
  flex: 1;
  min-width: 0;
}

.track-name {
  font-size: 12px;
  font-weight: 700;
  color: #dde6ef;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.2;
}

.track-type {
  font-size: 9px;
  color: #4e6a82;
  margin-top: 2px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.track-btns {
  display: flex;
  gap: 2px;
  flex-shrink: 0;
}

.tbtn {
  width: 18px;
  height: 18px;
  border-radius: 3px;
  border: 1px solid #243548;
  font-size: 9px;
  font-weight: 800;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #111a24;
  color: #4e6a82;
  font-family: inherit;
  transition: all 0.1s;
}

.tbtn:hover {
  color: #dde6ef;
  border-color: #4e6a82;
}

/* ── Timeline ── */
.timeline-wrap {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
}

.ruler {
  height: 28px;
  background: #0a0f16;
  border-bottom: 1px solid #243548;
  position: relative;
  overflow: hidden;
  flex-shrink: 0;
}

.clip-area {
  flex: 1;
  overflow: hidden;
  position: relative;
  background: repeating-linear-gradient(
    90deg,
    transparent,
    transparent calc(12.5% - 1px),
    #0d1820 calc(12.5% - 1px),
    #0d1820 12.5%
  );
}

.track-lane {
  height: 48px;
  border-bottom: 1px solid #0d1820;
  position: relative;
  flex-shrink: 0;
}

.clip {
  position: absolute;
  top: 5px;
  height: 38px;
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding: 0 8px 5px;
  cursor: pointer;
  overflow: hidden;
  transition: filter 0.1s;
}

.clip:hover {
  filter: brightness(1.15);
}

.clip-label {
  font-size: 10px;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1;
}

.playhead {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2px;
  background: #00ffc8;
  z-index: 10;
  box-shadow: 0 0 8px rgba(0, 255, 200, 0.6);
  pointer-events: none;
}

.playhead::before {
  content: '';
  position: absolute;
  top: -2px;
  left: -5px;
  width: 12px;
  height: 10px;
  background: #00ffc8;
  clip-path: polygon(0 0, 100% 0, 50% 100%);
}

/* ── FX panel ── */
.fx-panel {
  width: 9%;
  min-width: 75px;
  max-width: 100px;
  flex-shrink: 0;
  background: #0c1219;
  border-left: 1px solid #243548;
  display: flex;
  flex-direction: column;
}

.fx-header {
  height: 28px;
  background: #0a0f16;
  border-bottom: 1px solid #243548;
  display: flex;
  align-items: center;
  padding: 0 10px;
  font-size: 9px;
  font-weight: 800;
  color: #4e6a82;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  flex-shrink: 0;
}

.fx-btn {
  margin: 4px 6px;
  padding: 5px 6px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 700;
  border: 1px solid #243548;
  background: #111a24;
  color: #4e6a82;
  cursor: pointer;
  text-align: center;
  font-family: inherit;
  transition: all 0.1s;
}

.fx-btn:hover {
  border-color: #4e6a82;
  color: #8fa8bf;
}

.fx-btn.on {
  background: rgba(0, 255, 200, 0.1);
  border-color: rgba(0, 255, 200, 0.4);
  color: #00ffc8;
}

/* ── Mixer ── */
.mixer {
  height: 112px;
  border-top: 2px solid rgba(0, 255, 200, 0.15);
  background: #070b0f;
  display: flex;
  overflow-x: auto;
  scrollbar-width: none;
  flex-shrink: 0;
}

.mixer::-webkit-scrollbar {
  display: none;
}

.mixer-ch {
  flex: 1;
  min-width: 52px;
  max-width: 72px;
  border-right: 1px solid #0d1820;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 5px 4px 4px;
  gap: 2px;
}

.ch-name {
  font-size: 8px;
  font-weight: 700;
  text-align: center;
  width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 2px;
}

.ch-vu {
  display: flex;
  gap: 1px;
  height: 14px;
  align-items: flex-end;
  margin-bottom: 1px;
}

.ch-vu-bar {
  width: 5px;
  border-radius: 1px;
  background: #1a2838;
  transition: height 0.06s, background 0.06s;
}

.ch-fader-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  flex: 1;
}

.ch-fader {
  -webkit-appearance: none;
  appearance: none;
  width: 46px;
  height: 3px;
  border-radius: 2px;
  background: #1a2838;
  outline: none;
  transform: rotate(-90deg);
  margin: 8px 0;
  cursor: pointer;
}

.ch-vol {
  font-size: 8px;
  font-family: 'Courier New', monospace;
  margin-top: 1px;
}

</style>
</head>
<body>
<div class="daw-root">

  <div class="topbar">
    <div class="collab-area">
      <div class="collab-dot"></div>
      <span class="collab-label">Collab</span>
    </div>
    <div class="session-btns">
      <button class="sbtn sbtn-start">+ Start Session</button>
      <button class="sbtn sbtn-join">Join Session</button>
    </div>
    <div class="nav-tabs">
      <div class="ntab active">&#9654; Arrange</div>
      <div class="ntab">&#9000; Console</div>
      <div class="ntab">&#127929; Piano Roll</div>
      <div class="ntab">&#127929; Piano</div>
      <div class="ntab">&#129345; Sampler</div>
      <div class="ntab">&#9889; AI Mix</div>
      <div class="ntab">&#9889; Synth</div>
      <div class="ntab">&#129345; Drum Design</div>
      <div class="ntab">&#10024; Mastering</div>
    </div>
    <button class="export-btn">&#11014; Export</button>
  </div>

  <div class="transport">
    <button class="tport-btn tport-stop">&#9632;</button>
    <button class="tport-btn tport-play" id="playBtn" onclick="togglePlay()">&#9654;</button>
    <button class="tport-btn tport-rec" id="recBtn">&#9210;</button>
    <div class="transport-divider"></div>
    <div class="bpm-group">
      <span class="bpm-label">BPM</span>
      <span class="bpm-val">120</span>
    </div>
    <div class="transport-divider"></div>
    <div class="time-display" id="timeDisplay">1 . 1 . 000</div>
    <div class="transport-divider"></div>
    <select class="snap-select">
      <option>1/4</option><option>1/8</option><option>1/16</option>
    </select>
    <div style="margin-left: auto; display: flex; gap: 8px; align-items: center;">
      <button class="zoom-btn">100%</button>
      <button class="rec-ready-btn">&#9210; REC READY</button>
    </div>
  </div>

  <div class="main-area">

    <div class="track-headers">
      <div class="tracks-header-bar">TRACKS</div>
      <div id="trackList"></div>
    </div>

    <div class="timeline-wrap">
      <div class="ruler" id="ruler"></div>
      <div class="clip-area" id="clipArea">
        <div class="playhead" id="playhead" style="left: 0%;"></div>
      </div>
    </div>

    <div class="fx-panel">
      <div class="fx-header">FX</div>
      <button class="fx-btn on">EQ</button>
      <button class="fx-btn on">Comp</button>
      <button class="fx-btn">Reverb</button>
      <button class="fx-btn">Delay</button>
      <button class="fx-btn on">Limiter</button>
      <button class="fx-btn">Distort</button>
      <button class="fx-btn">Chorus</button>
      <button class="fx-btn">Filter</button>
    </div>

  </div>

  <div class="mixer" id="mixer"></div>
<div class="lib" style="background: #08080f; border-top: 1px solid #243548; padding: 12px; height: 160px;">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
      <span style="color: #ffa726; font-size: 11px; font-weight: 800; letter-spacing: 1px;">📂 LIBRARY</span>
      <input type="text" placeholder="Search tracks..." style="background: #111; border: 1px solid #333; color: #eee; font-size: 10px; padding: 4px 8px; border-radius: 4px; outline: none; width: 150px;">
    </div>
    <div id="libList" style="height: 100px; overflow-y: auto;">
      </div>
  </div>
</div>
<script>

const TRACKS = [
  { name: 'Lead Vocals', type: 'Audio', color: '#00ffc8',
    clips: [{ x: 1, w: 26, label: 'Verse 1' }, { x: 40, w: 20, label: 'Chorus' }, { x: 72, w: 14, label: 'Bridge' }] },
  { name: 'Harmony',    type: 'Audio', color: '#0a84ff',
    clips: [{ x: 40, w: 20, label: 'Harmony' }, { x: 72, w: 14, label: 'Harm 2' }] },
  { name: 'Kick 808',   type: 'Beat',  color: '#ff6600',
    clips: [{ x: 1, w: 89, label: 'Beat Pattern' }] },
  { name: 'Snare',      type: 'Beat',  color: '#ffd60a',
    clips: [{ x: 1, w: 89, label: 'Snare Loop' }] },
  { name: 'Hi-Hat',     type: 'Beat',  color: '#bf5af2',
    clips: [{ x: 1, w: 44, label: 'HH Loop' }, { x: 47, w: 43, label: 'HH Loop 2' }] },
  { name: 'Bass Line',  type: 'MIDI',  color: '#ff453a',
    clips: [{ x: 1, w: 26, label: 'Bass A' }, { x: 40, w: 30, label: 'Bass B' }] },
  { name: 'Chord Pad',  type: 'MIDI',  color: '#30d158',
    clips: [{ x: 14, w: 62, label: 'Pads' }] },
  { name: 'Lead Synth', type: 'MIDI',  color: '#ff8c00',
    clips: [{ x: 38, w: 36, label: 'Lead Mel' }] },
];

const trackListEl = document.getElementById('trackList');
const clipAreaEl  = document.getElementById('clipArea');

TRACKS.forEach((t, i) => {
  const row = document.createElement('div');
  row.className = 'track-row' + (i === 0 ? ' selected' : '');
  row.innerHTML =
    '<div class="track-color-bar" style="background:' + t.color + ';"></div>' +
    '<div class="track-info">' +
      '<div class="track-name">' + t.name + '</div>' +
      '<div class="track-type">' + t.type + '</div>' +
    '</div>' +
    '<div class="track-btns">' +
      '<button class="tbtn">M</button>' +
      '<button class="tbtn">S</button>' +
      '<button class="tbtn">&#9210;</button>' +
    '</div>';
  row.onclick = function() {
    document.querySelectorAll('.track-row').forEach(function(r) { r.classList.remove('selected'); });
    row.classList.add('selected');
  };
  trackListEl.appendChild(row);

  const lane = document.createElement('div');
  lane.className = 'track-lane';

  t.clips.forEach(function(c) {
    const clip = document.createElement('div');
    clip.className = 'clip';
    clip.style.left = c.x + '%';
    clip.style.width = c.w + '%';
    clip.style.background = t.color + '22';
    clip.style.border = '1px solid ' + t.color + '55';
    const lbl = document.createElement('div');
    lbl.className = 'clip-label';
    lbl.style.color = t.color;
    lbl.textContent = c.label;
    clip.appendChild(lbl);
    lane.appendChild(clip);
  });

  clipAreaEl.appendChild(lane);
});

// Ruler — 9 bar marks using %
const rulerEl = document.getElementById('ruler');
var BAR_COUNT = 9;
for (var i = 0; i < BAR_COUNT; i++) {
  var pct = (i / (BAR_COUNT - 1)) * 100;
  var line = document.createElement('div');
  line.style.cssText = 'position:absolute;top:0;bottom:0;left:' + pct + '%;width:1px;background:' + (i === 0 ? '#243548' : '#1a2838') + ';';
  rulerEl.appendChild(line);
  var lbl = document.createElement('span');
  lbl.style.cssText = 'position:absolute;bottom:3px;left:calc(' + pct + '% + 3px);font-size:9px;color:#4e6a82;font-family:Courier New,monospace;';
  lbl.textContent = i + 1;
  rulerEl.appendChild(lbl);
}

// Mixer
const mixerEl = document.getElementById('mixer');
var mixTracks = TRACKS.slice(0, 7).concat([{ name: 'Master', color: '#dde6ef' }]);
mixTracks.forEach(function(t, i) {
  var vol = 70 + Math.floor(Math.random() * 25);
  var ch = document.createElement('div');
  ch.className = 'mixer-ch';
  var vuId = 'vu-' + i;
  ch.innerHTML =
    '<div class="ch-name" style="color:' + t.color + ';">' + t.name + '</div>' +
    '<div class="ch-vu" id="' + vuId + '">' +
      '<div class="ch-vu-bar"></div><div class="ch-vu-bar"></div>' +
      '<div class="ch-vu-bar"></div><div class="ch-vu-bar"></div><div class="ch-vu-bar"></div>' +
    '</div>' +
    '<div class="ch-fader-wrap">' +
      '<input type="range" class="ch-fader" min="0" max="100" value="' + vol + '">' +
    '</div>' +
    '<div class="ch-vol" style="color:' + t.color + ';">' + vol + '%</div>';
  // thumb color via inline style injected
  var s = document.createElement('style');
  s.textContent = '#' + vuId + ' ~ .ch-fader-wrap .ch-fader::-webkit-slider-thumb{background:' + t.color + '}';
  ch.appendChild(s);
  mixerEl.appendChild(ch);
});

// Playback
var isPlaying = false;
var pos = 0;
var frame = 0;
var raf = null;

function togglePlay() {
  isPlaying = !isPlaying;
  var btn = document.getElementById('playBtn');
  btn.textContent = isPlaying ? '\u23f8' : '\u25b6';
  btn.style.background = isPlaying ? '#ff6600' : '#00ffc8';
  btn.style.color = '#041014';
  if (isPlaying) {
    raf = requestAnimationFrame(tick);
  } else {
    cancelAnimationFrame(raf);
  }
}

function tick() {
  frame++;
  pos += 0.08;
  if (pos > 90) pos = 0;

  document.getElementById('playhead').style.left = pos + '%';

  var totalBeats = pos / (100 / 32);
  var bar   = Math.floor(totalBeats / 4) + 1;
  var beat  = Math.floor(totalBeats % 4) + 1;
  var ticks = Math.floor((totalBeats % 1) * 1000);
  document.getElementById('timeDisplay').textContent =
    bar + ' . ' + beat + ' . ' + ('000' + ticks).slice(-3);

  // VU meters
  for (var i = 0; i < mixTracks.length; i++) {
    var vu = document.getElementById('vu-' + i);
    if (!vu) continue;
    var lvl = Math.round(Math.abs(Math.sin(frame / 6 + i) * 3 + Math.random() * 2));
    var bars = vu.querySelectorAll('.ch-vu-bar');
    for (var j = 0; j < bars.length; j++) {
      var active = j < lvl;
      bars[j].style.height = active ? (6 + j * 2) + 'px' : '3px';
      bars[j].style.background = active
        ? (j >= 3 ? '#ff453a' : j >= 2 ? '#ffd60a' : (TRACKS[i] ? TRACKS[i].color : '#00ffc8'))
        : '#1a2838';
    }
  }

  if (isPlaying) raf = requestAnimationFrame(tick);
}

document.querySelectorAll('.ntab').forEach(function(tab) {
  tab.onclick = function() {
    document.querySelectorAll('.ntab').forEach(function(t) { t.classList.remove('active'); });
    tab.classList.add('active');
  };
});

document.querySelectorAll('.fx-btn').forEach(function(btn) {
  btn.onclick = function() { btn.classList.toggle('on'); };
});

setTimeout(togglePlay, 600);

</script>
</body>
</html>`;

export default html;
