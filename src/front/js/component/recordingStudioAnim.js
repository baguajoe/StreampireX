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
  overflow: hidden; /* Prevent iframe scrollbars */
  user-select: none;
}

.daw-root {
  display: flex;
  flex-direction: column;
  
  /* FILL THE IFRAME COMPLETELY */
  width: 100% !important;   
  height: 100vh;           
  margin: 0 !important; 
  
  /* REMOVE THESE - THEY ARE BREAKING YOUR LAYOUT */
  position: relative;
  left: 0;
  transform: none !important; 

  background: #06060f;
  border: none;
  overflow: hidden;
}

/* ── Top bar ── */
.topbar {
  display: flex;
  align-items: center;
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
}

.session-btns {
  display: flex;
  gap: 6px;
  padding: 0 12px;
  border-right: 1px solid #243548;
  align-items: center;
  height: 36px;
}

.sbtn {
  padding: 5px 12px;
  border-radius: 5px;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  border: none;
  font-family: inherit;
}

.sbtn-start { background: #00ffc8; color: #041014; }
.sbtn-join { background: #111a24; color: #8fa8bf; border: 1px solid #243548; }

.nav-tabs {
  display: flex;
  align-items: center;
  height: 36px;
  flex: 1;
  padding: 0 4px;
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
  text-transform: uppercase;
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
}

.tport-stop { background: #111a24; color: #8fa8bf; border: 1px solid #243548; }
.tport-play { background: #00ffc8; color: #041014; }
.tport-rec { background: rgba(255, 69, 58, 0.15); color: #ff453a; border: 1px solid rgba(255, 69, 58, 0.35); }

.bpm-group { display: flex; align-items: center; gap: 6px; }
.bpm-val { font-size: 18px; font-weight: 800; color: #dde6ef; min-width: 44px; }
.time-display { font-size: 14px; font-weight: 700; color: #00ffc8; min-width: 90px; text-shadow: 0 0 10px rgba(0, 255, 200, 0.3); }

/* ── Main area ── */
.main-area {
  display: flex;
  flex: 1;
  overflow: hidden;
  min-height: 0;
}

.track-headers {
  width: 130px;
  flex-shrink: 0;
  background: #0c1219;
  border-right: 1px solid #243548;
  overflow-y: auto;
}

.track-row {
  height: 48px;
  border-bottom: 1px solid #0d1820;
  display: flex;
  align-items: center;
  padding: 0 8px;
  gap: 6px;
}

.track-color-bar { width: 3px; height: 32px; border-radius: 2px; }
.track-name { font-size: 11px; font-weight: 700; color: #dde6ef; }

.timeline-wrap {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.ruler {
  height: 28px;
  background: #0a0f16;
  border-bottom: 1px solid #243548;
  position: relative;
}

.clip-area {
  flex: 1;
  overflow: hidden;
  position: relative;
  background: repeating-linear-gradient(90deg, transparent, transparent calc(12.5% - 1px), #0d1820 calc(12.5% - 1px), #0d1820 12.5%);
}

.track-lane { height: 48px; border-bottom: 1px solid #0d1820; position: relative; }

.clip {
  position: absolute;
  top: 5px;
  height: 38px;
  border-radius: 4px;
  display: flex;
  align-items: flex-end;
  padding: 0 8px 5px;
  cursor: pointer;
}

.clip-label { font-size: 10px; font-weight: 700; white-space: nowrap; }

.playhead {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2px;
  background: #00ffc8;
  z-index: 10;
  box-shadow: 0 0 8px rgba(0, 255, 200, 0.6);
}

.fx-panel {
  width: 100px;
  background: #0c1219;
  border-left: 1px solid #243548;
  display: flex;
  flex-direction: column;
}

.fx-btn {
  margin: 4px 6px;
  padding: 5px 6px;
  border-radius: 4px;
  font-size: 10px;
  border: 1px solid #243548;
  background: #111a24;
  color: #4e6a82;
  cursor: pointer;
}

.fx-btn.on { color: #00ffc8; border-color: #00ffc8; background: rgba(0, 255, 200, 0.05); }

/* ── Mixer ── */
.mixer {
  height: 112px;
  border-top: 2px solid rgba(0, 255, 200, 0.15);
  background: #070b0f;
  display: flex;
  overflow-x: auto;
}

.mixer-ch {
  flex: 1;
  min-width: 60px;
  border-right: 1px solid #0d1820;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 5px;
}

.ch-name { font-size: 8px; font-weight: 700; margin-bottom: 4px; }
.ch-vu { display: flex; gap: 1px; height: 14px; margin-bottom: 4px; }
.ch-vu-bar { width: 4px; background: #1a2838; }

.ch-fader {
  -webkit-appearance: none;
  width: 40px;
  height: 3px;
  background: #1a2838;
  transform: rotate(-90deg);
  margin: 15px 0;
}

/* ── Library ── */
.lib {
  background: #08080f;
  border-top: 1px solid #243548;
  padding: 12px;
  height: 160px;
  flex-shrink: 0;
}

</style>
</head>
<body>
<div class="daw-root">

  <div class="topbar">
    <div class="collab-area"><div class="collab-dot"></div><span class="collab-label">Collab</span></div>
    <div class="session-btns"><button class="sbtn sbtn-start">+ Start</button></div>
    <div class="nav-tabs">
      <div class="ntab active">Arrange</div>
      <div class="ntab">Console</div>
      <div class="ntab">Piano</div>
    </div>
    <button class="export-btn">Export</button>
  </div>

  <div class="transport">
    <button class="tport-btn tport-stop">■</button>
    <button class="tport-btn tport-play" id="playBtn" onclick="togglePlay()">▶</button>
    <div class="bpm-group"><span class="bpm-val">120</span></div>
    <div class="time-display" id="timeDisplay">1 . 1 . 000</div>
  </div>

  <div class="main-area">
    <div class="track-headers"><div id="trackList"></div></div>
    <div class="timeline-wrap">
      <div class="ruler" id="ruler"></div>
      <div class="clip-area" id="clipArea">
        <div class="playhead" id="playhead" style="left: 0%;"></div>
      </div>
    </div>
    <div class="fx-panel"><button class="fx-btn on">EQ</button><button class="fx-btn on">Comp</button></div>
  </div>

  <div class="mixer" id="mixer"></div>

  <div class="lib">
    <div style="color: #ffa726; font-size: 11px; font-weight: 800; margin-bottom: 10px;">📂 LIBRARY</div>
    <div id="libList"></div>
  </div>

</div>

<script>
const TRACKS = [
  { name: 'Vocals', type: 'Audio', color: '#00ffc8', clips: [{ x: 1, w: 26, label: 'Verse 1' }] },
  { name: 'Drums', type: 'Beat', color: '#ff6600', clips: [{ x: 1, w: 89, label: 'Pattern' }] },
  { name: 'Bass', type: 'MIDI', color: '#ff453a', clips: [{ x: 1, w: 26, label: 'Bassline' }] }
];

const trackListEl = document.getElementById('trackList');
const clipAreaEl  = document.getElementById('clipArea');

function renderTracks() {
    trackListEl.innerHTML = '';
    // Clear lanes but keep playhead
    const lanes = clipAreaEl.querySelectorAll('.track-lane');
    lanes.forEach(l => l.remove());

    TRACKS.forEach((t) => {
      const row = document.createElement('div');
      row.className = 'track-row';
      row.innerHTML = '<div class="track-color-bar" style="background:'+t.color+';"></div>' +
                      '<div class="track-name">'+t.name+'</div>';
      trackListEl.appendChild(row);

      const lane = document.createElement('div');
      lane.className = 'track-lane';
      t.clips.forEach(c => {
        const clip = document.createElement('div');
        clip.className = 'clip';
        clip.style.left = c.x + '%';
        clip.style.width = c.w + '%';
        clip.style.background = t.color + '22';
        clip.style.border = '1px solid ' + t.color + '55';
        clip.innerHTML = '<span class="clip-label" style="color:'+t.color+'">'+c.label+'</span>';
        lane.appendChild(clip);
      });
      clipAreaEl.appendChild(lane);
    });
}

const rulerEl = document.getElementById('ruler');
for (let i = 0; i < 9; i++) {
  let line = document.createElement('div');
  line.style.cssText = 'position:absolute;top:0;bottom:0;left:'+(i*12.5)+'%;width:1px;background:#243548;';
  rulerEl.appendChild(line);
}

const mixerEl = document.getElementById('mixer');
TRACKS.concat([{name:'Master', color:'#fff'}]).forEach((t, i) => {
  const ch = document.createElement('div');
  ch.className = 'mixer-ch';
  ch.innerHTML = '<div class="ch-name" style="color:'+t.color+'">'+t.name+'</div>' +
                 '<div class="ch-vu"><div class="ch-vu-bar"></div><div class="ch-vu-bar"></div></div>' +
                 '<input type="range" class="ch-fader">';
  mixerEl.appendChild(ch);
});

function loadFromLibrary(trackName, color) {
  TRACKS.push({ name: trackName, type: 'Audio', color: color, clips: [{ x: 30, w: 20, label: 'Imported' }] });
  renderTracks();
}

const LIB_DATA = [{ name: '808 Sub', color: '#ff453a' }, { name: 'Synth Lead', color: '#00ffc8' }];
document.getElementById('libList').innerHTML = LIB_DATA.map(t => 
  '<div style="display:flex; justify-content:space-between; padding:5px; border-bottom:1px solid #1a1a2e;">' +
  '<span style="font-size:11px;">'+t.name+'</span>' +
  '<button onclick="loadFromLibrary(\''+t.name+'\',\''+t.color+'\')" style="background:#00ffc8; color:#000; border:none; font-size:9px; padding:2px 5px; cursor:pointer;">LOAD</button></div>'
).join('');

var isPlaying = false; var pos = 0; var raf = null;
function togglePlay() {
  isPlaying = !isPlaying;
  document.getElementById('playBtn').textContent = isPlaying ? '⏸' : '▶';
  if (isPlaying) tick(); else cancelAnimationFrame(raf);
}

function tick() {
  pos += 0.1; if (pos > 100) pos = 0;
  document.getElementById('playhead').style.left = pos + '%';
  if (isPlaying) raf = requestAnimationFrame(tick);
}

renderTracks();

// This is the "Spark Plug" that starts the animation
window.addEventListener('load', () => {
    setTimeout(() => {
        if (!isPlaying && typeof togglePlay === 'function') {
            togglePlay();
        }
    }, 500);
});

</script>
</body>
</html>`;

export default html;