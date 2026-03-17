import os

path = './src/front/js/component/recordingStudioAnim.js'

# backup
with open(path, 'r') as f:
    original = f.read()
with open(path + '.bak2', 'w') as f:
    f.write(original)

new_content = r"""const html = `<!DOCTYPE html>
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
  min-width: 100%;
  background: #070b0f;
  font-family: 'Courier New', monospace;
  color: #dde6ef;
  overflow: hidden;
  user-select: none;
  font-size: 11px;
}

.daw-root {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  background: #070b0f;
}

.topbar {
  display: flex;
  align-items: center;
  background: #0c1219;
  border-bottom: 1px solid #243548;
  height: 32px;
  min-height: 32px;
  padding: 0 8px;
  gap: 6px;
  flex-shrink: 0;
  overflow: hidden;
}

.sbtn-start {
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  border: none;
  font-family: inherit;
  background: #00ffc8;
  color: #041014;
  flex-shrink: 0;
}

.sbtn-join {
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  font-family: inherit;
  background: #111a24;
  color: #8fa8bf;
  border: 1px solid #243548;
  flex-shrink: 0;
}

.tab-sep {
  width: 1px;
  height: 20px;
  background: #243548;
  flex-shrink: 0;
}

.ntab {
  padding: 0 10px;
  height: 32px;
  display: flex;
  align-items: center;
  font-size: 10px;
  font-weight: 700;
  color: #4e6a82;
  cursor: pointer;
  white-space: nowrap;
  transition: color 0.12s;
  flex-shrink: 0;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.ntab:hover {
  color: #8fa8bf;
}

.ntab.active {
  color: #00ffc8;
  border-bottom: 2px solid #00ffc8;
}

.export-btn {
  margin-left: auto;
  padding: 4px 12px;
  border-radius: 4px;
  background: #00ffc8;
  color: #041014;
  font-size: 11px;
  font-weight: 800;
  border: none;
  cursor: pointer;
  flex-shrink: 0;
  font-family: inherit;
}

.transport {
  display: flex;
  align-items: center;
  gap: 6px;
  background: #0a0f16;
  border-bottom: 1px solid #243548;
  padding: 0 12px;
  height: 38px;
  min-height: 38px;
  flex-shrink: 0;
}

.tport-btn {
  width: 26px;
  height: 26px;
  border-radius: 4px;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
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
  font-size: 13px;
}

.tport-rec {
  background: rgba(255, 69, 58, 0.15);
  color: #ff453a;
  border: 1px solid rgba(255, 69, 58, 0.35);
}

.tdiv {
  width: 1px;
  height: 20px;
  background: #243548;
  flex-shrink: 0;
}

.bpm-val {
  font-size: 17px;
  font-weight: 800;
  color: #dde6ef;
  min-width: 40px;
  letter-spacing: 1px;
  font-family: 'Courier New', monospace;
}

.bpm-lbl {
  font-size: 9px;
  font-weight: 800;
  color: #4e6a82;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.time-display {
  font-size: 13px;
  font-weight: 700;
  color: #00ffc8;
  letter-spacing: 2px;
  min-width: 85px;
  text-shadow: 0 0 10px rgba(0,255,200,0.3);
  font-family: 'Courier New', monospace;
}

.snap-sel {
  background: #111a24;
  border: 1px solid #243548;
  color: #8fa8bf;
  font-size: 10px;
  padding: 3px 6px;
  border-radius: 3px;
  outline: none;
  font-family: inherit;
  flex-shrink: 0;
}

.zoom-btn {
  padding: 3px 8px;
  border-radius: 3px;
  border: 1px solid #00ffc8;
  background: rgba(0,255,200,0.1);
  color: #00ffc8;
  font-size: 10px;
  font-weight: 700;
  cursor: pointer;
  font-family: inherit;
  flex-shrink: 0;
}

.rec-btn {
  padding: 3px 8px;
  border-radius: 3px;
  background: rgba(255,69,58,0.15);
  border: 1px solid rgba(255,69,58,0.35);
  color: #ff453a;
  font-size: 10px;
  font-weight: 800;
  cursor: pointer;
  font-family: inherit;
  flex-shrink: 0;
}

.main-area {
  display: flex;
  flex: 1;
  overflow: hidden;
  min-height: 0;
  width: 100%;
}

.track-headers {
  width: 160px;
  min-width: 160px;
  max-width: 160px;
  flex-shrink: 0;
  background: #0c1219;
  border-right: 1px solid #243548;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.hdr-bar {
  height: 26px;
  min-height: 26px;
  background: #0a0f16;
  border-bottom: 1px solid #243548;
  display: flex;
  align-items: center;
  padding: 0 8px;
  font-size: 8px;
  font-weight: 800;
  color: #4e6a82;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  flex-shrink: 0;
}

.track-row {
  flex: 1;
  border-bottom: 1px solid #0d1820;
  display: flex;
  align-items: center;
  padding: 0 6px;
  gap: 5px;
  cursor: pointer;
  transition: background 0.1s;
  min-height: 0;
}

.track-row:hover {
  background: rgba(255,255,255,0.03);
}

.track-row.sel {
  background: rgba(0,255,200,0.05);
  border-left: 2px solid #00ffc8;
}

.tc-bar {
  width: 3px;
  height: 28px;
  border-radius: 2px;
  flex-shrink: 0;
}

.ti {
  flex: 1;
  min-width: 0;
}

.tn {
  font-size: 11px;
  font-weight: 700;
  color: #dde6ef;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tt {
  font-size: 8px;
  color: #4e6a82;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-top: 1px;
}

.tbtns {
  display: flex;
  gap: 2px;
  flex-shrink: 0;
}

.tbtn {
  width: 16px;
  height: 16px;
  border-radius: 2px;
  border: 1px solid #243548;
  font-size: 8px;
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
}

.timeline-wrap {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
  width: 0;
}

.ruler {
  height: 26px;
  min-height: 26px;
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

.tl {
  flex: 1;
  border-bottom: 1px solid #0d1820;
  position: relative;
  min-height: 0;
}

.clip {
  position: absolute;
  top: 3px;
  border-radius: 3px;
  display: flex;
  align-items: flex-end;
  padding: 0 6px 4px;
  cursor: pointer;
  overflow: hidden;
  transition: filter 0.1s;
}

.clip:hover {
  filter: brightness(1.15);
}

.cl {
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
  box-shadow: 0 0 8px rgba(0,255,200,0.6);
  pointer-events: none;
}

.playhead::before {
  content: '';
  position: absolute;
  top: -1px;
  left: -5px;
  width: 12px;
  height: 8px;
  background: #00ffc8;
  clip-path: polygon(0 0, 100% 0, 50% 100%);
}

.fx-panel {
  width: 85px;
  min-width: 85px;
  max-width: 85px;
  flex-shrink: 0;
  background: #0c1219;
  border-left: 1px solid #243548;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.fx-hdr {
  height: 26px;
  min-height: 26px;
  background: #0a0f16;
  border-bottom: 1px solid #243548;
  display: flex;
  align-items: center;
  padding: 0 8px;
  font-size: 8px;
  font-weight: 800;
  color: #4e6a82;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  flex-shrink: 0;
}

.fx-btn {
  margin: 3px 5px;
  padding: 4px 5px;
  border-radius: 3px;
  font-size: 10px;
  font-weight: 700;
  border: 1px solid #243548;
  background: #111a24;
  color: #4e6a82;
  cursor: pointer;
  text-align: center;
  font-family: inherit;
  transition: all 0.1s;
  flex-shrink: 0;
}

.fx-btn.on {
  background: rgba(0,255,200,0.1);
  border-color: rgba(0,255,200,0.4);
  color: #00ffc8;
}

.mixer {
  height: 100px;
  min-height: 100px;
  border-top: 2px solid rgba(0,255,200,0.15);
  background: #070b0f;
  display: flex;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none;
  flex-shrink: 0;
}

.mixer::-webkit-scrollbar {
  display: none;
}

.mixer-ch {
  flex: 1;
  min-width: 48px;
  max-width: 80px;
  border-right: 1px solid #0d1820;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 4px 3px;
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
}

.ch-vu {
  display: flex;
  gap: 1px;
  height: 12px;
  align-items: flex-end;
}

.ch-vu-bar {
  width: 4px;
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
  width: 40px;
  height: 3px;
  border-radius: 2px;
  background: #1a2838;
  outline: none;
  transform: rotate(-90deg);
  cursor: pointer;
}

.ch-vol {
  font-size: 8px;
  font-family: 'Courier New', monospace;
}

</style>
</head>
<body>
<div class="daw-root">

  <div class="topbar">
    <button class="sbtn-start">+ Start Session</button>
    <button class="sbtn-join">Join Session</button>
    <div class="tab-sep"></div>
    <div class="ntab active">&#9654; Arrange</div>
    <div class="ntab">&#9000; Console</div>
    <div class="ntab">&#127929; Piano Roll</div>
    <div class="ntab">&#129345; Sampler</div>
    <div class="ntab">&#9889; AI Mix</div>
    <div class="ntab">&#9889; Synth</div>
    <div class="ntab">&#10024; Mastering</div>
    <button class="export-btn">&#11014; Export</button>
  </div>

  <div class="transport">
    <button class="tport-btn tport-stop">&#9632;</button>
    <button class="tport-btn tport-play" id="playBtn" onclick="togglePlay()">&#9654;</button>
    <button class="tport-btn tport-rec">&#9210;</button>
    <div class="tdiv"></div>
    <span class="bpm-lbl">BPM</span>
    <span class="bpm-val">120</span>
    <div class="tdiv"></div>
    <div class="time-display" id="timeDisplay">1 . 1 . 000</div>
    <div class="tdiv"></div>
    <select class="snap-sel">
      <option>1/4</option><option>1/8</option><option>1/16</option>
    </select>
    <div style="margin-left:auto;display:flex;gap:8px;align-items:center;">
      <button class="zoom-btn">100%</button>
      <button class="rec-btn">&#9210; REC READY</button>
    </div>
  </div>

  <div class="main-area">

    <div class="track-headers">
      <div class="hdr-bar">TRACKS</div>
      <div id="trackList"></div>
    </div>

    <div class="timeline-wrap">
      <div class="ruler" id="ruler"></div>
      <div class="clip-area" id="clipArea">
        <div class="playhead" id="playhead" style="left:0%;"></div>
      </div>
    </div>

    <div class="fx-panel">
      <div class="fx-hdr">FX</div>
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

</div>
<script>

var TRACKS = [
  { name: 'Lead Vocals', type: 'Audio', color: '#00ffc8',
    clips: [{ x: 2, w: 18, label: 'Verse 1' }, { x: 38, w: 14, label: 'Chorus' }, { x: 67, w: 10, label: 'Bridge' }] },
  { name: 'Harmony',    type: 'Audio', color: '#0a84ff',
    clips: [{ x: 38, w: 14, label: 'Harmony' }, { x: 67, w: 10, label: 'Harm 2' }] },
  { name: 'Kick 808',   type: 'Beat',  color: '#ff6600',
    clips: [{ x: 2, w: 76, label: 'Beat Pattern' }] },
  { name: 'Snare',      type: 'Beat',  color: '#ffd60a',
    clips: [{ x: 2, w: 76, label: 'Snare Loop' }] },
  { name: 'Hi-Hat',     type: 'Beat',  color: '#bf5af2',
    clips: [{ x: 2, w: 36, label: 'HH Loop' }, { x: 42, w: 36, label: 'HH Loop 2' }] },
  { name: 'Bass Line',  type: 'MIDI',  color: '#ff453a',
    clips: [{ x: 2, w: 18, label: 'Bass A' }, { x: 38, w: 24, label: 'Bass B' }] },
  { name: 'Chord Pad',  type: 'MIDI',  color: '#30d158',
    clips: [{ x: 16, w: 52, label: 'Pads' }] },
  { name: 'Lead Synth', type: 'MIDI',  color: '#ff8c00',
    clips: [{ x: 38, w: 28, label: 'Lead Mel' }] },
];

var trackListEl = document.getElementById('trackList');
var clipAreaEl  = document.getElementById('clipArea');

TRACKS.forEach(function(t, i) {
  var row = document.createElement('div');
  row.className = 'track-row' + (i === 0 ? ' sel' : '');
  row.innerHTML =
    '<div class="tc-bar" style="background:' + t.color + ';"></div>' +
    '<div class="ti">' +
      '<div class="tn">' + t.name + '</div>' +
      '<div class="tt">' + t.type + '</div>' +
    '</div>' +
    '<div class="tbtns">' +
      '<button class="tbtn">M</button>' +
      '<button class="tbtn">S</button>' +
    '</div>';
  row.onclick = function() {
    document.querySelectorAll('.track-row').forEach(function(r) { r.classList.remove('sel'); });
    row.classList.add('sel');
  };
  trackListEl.appendChild(row);

  var lane = document.createElement('div');
  lane.className = 'tl';

  t.clips.forEach(function(c) {
    var clip = document.createElement('div');
    clip.className = 'clip';
    clip.style.left  = c.x + '%';
    clip.style.width = c.w + '%';
    clip.style.bottom = '3px';
    clip.style.top = '3px';
    clip.style.background = t.color + '22';
    clip.style.border = '1px solid ' + t.color + '55';
    var lbl = document.createElement('div');
    lbl.className = 'cl';
    lbl.style.color = t.color;
    lbl.textContent = c.label;
    clip.appendChild(lbl);
    lane.appendChild(clip);
  });

  clipAreaEl.appendChild(lane);
});

// Ruler
var rulerEl = document.getElementById('ruler');
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
var mixerEl = document.getElementById('mixer');
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
  var s = document.createElement('style');
  s.textContent = '#' + vuId + ' ~ .ch-fader-wrap .ch-fader::-webkit-slider-thumb{-webkit-appearance:none;width:10px;height:10px;border-radius:50%;background:' + t.color + ';cursor:pointer;}';
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

  for (var i = 0; i < mixTracks.length; i++) {
    var vu = document.getElementById('vu-' + i);
    if (!vu) continue;
    var lvl = Math.round(Math.abs(Math.sin(frame / 6 + i) * 3 + Math.random() * 2));
    var bars = vu.querySelectorAll('.ch-vu-bar');
    for (var j = 0; j < bars.length; j++) {
      var active = j < lvl;
      bars[j].style.height = active ? (5 + j * 2) + 'px' : '3px';
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
"""

with open(path, 'w') as f:
    f.write(new_content)

print("Written: " + str(len(new_content)) + " chars")
