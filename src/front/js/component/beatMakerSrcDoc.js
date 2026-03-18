const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<style>
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:100%;height:100vh;background:#0d0f14;font-family:'Inter',system-ui,sans-serif;color:#c8d0d8;overflow:hidden;user-select:none}

/* TOP BAR */
.topbar{display:flex;align-items:center;gap:0;background:#141820;border-bottom:1px solid #1e2530;height:36px;padding:0 8px;flex-shrink:0}
.collab-btn{display:flex;flex-direction:column;align-items:center;padding:0 10px;font-size:9px;color:#4a6070;letter-spacing:.3px;border-right:1px solid #1e2530;height:36px;justify-content:center;gap:2px}
.collab-btn span{font-size:8px;color:#4a6070}
.session-btns{display:flex;gap:6px;padding:0 10px;border-right:1px solid #1e2530;align-items:center;height:36px}
.sbtn{padding:5px 12px;border-radius:5px;font-size:11px;font-weight:700;cursor:pointer;border:none;font-family:inherit}
.sbtn.start{background:#00ffc8;color:#041014}
.sbtn.join{background:#1e2530;color:#8090a0;border:1px solid #2a3040}
.nav-tabs{display:flex;align-items:center;height:36px;overflow-x:auto;scrollbar-width:none;flex:1}
.nav-tabs::-webkit-scrollbar{display:none}
.ntab{padding:0 12px;height:36px;display:flex;align-items:center;gap:5px;font-size:11px;color:#4a6070;cursor:pointer;border-right:1px solid #1e2530;white-space:nowrap;transition:all .12s;flex-shrink:0}
.ntab:hover{color:#8090a0;background:rgba(255,255,255,.03)}
.ntab.on{color:#00ffc8;background:rgba(0,255,200,.06)}
.ntab .ico{font-size:11px}
.export-btn{margin-left:auto;padding:5px 14px;border-radius:5px;background:#00ffc8;color:#041014;font-size:11px;font-weight:800;border:none;cursor:pointer;flex-shrink:0}

/* TRANSPORT */
.transport{display:flex;align-items:center;gap:8px;background:#0f1218;border-bottom:1px solid #1e2530;padding:6px 12px;height:44px;flex-shrink:0}
.tport-btn{width:28px;height:28px;border-radius:4px;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:13px;transition:all .12s}
.tport-play{background:#00ffc8;color:#041014;font-size:14px}
.tport-stop{background:#1e2530;color:#8090a0}
.tport-rec{background:rgba(255,45,85,.15);color:#ff2d55;border:1px solid rgba(255,45,85,.3)}
.bpm-wrap{display:flex;align-items:center;gap:6px;margin-left:4px}
.bpm-lbl{font-size:10px;color:#4a6070;letter-spacing:.5px}
.bpm-val{font-size:17px;font-weight:800;color:#e0eaf0;font-family:'Courier New',monospace;min-width:38px}
.bpm-ctrl{display:flex;flex-direction:column;gap:1px}
.bpm-arrow{width:14px;height:10px;background:#1e2530;border:none;color:#6a8090;font-size:8px;cursor:pointer;border-radius:2px;display:flex;align-items:center;justify-content:center}
.tap-btn{padding:4px 10px;border-radius:4px;background:#1e2530;border:1px solid #2a3040;color:#8090a0;font-size:10px;font-weight:700;cursor:pointer}
.divider{width:1px;height:24px;background:#1e2530;margin:0 4px}
.swing-wrap{display:flex;align-items:center;gap:6px;font-size:10px;color:#4a6070}
.swing-knob{width:16px;height:16px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#2a3040,#0d1018);border:1px solid #2a3040;flex-shrink:0}
.steps-wrap{display:flex;align-items:center;gap:4px;margin-left:auto;font-size:10px;color:#4a6070}
.step-btn{padding:3px 8px;border-radius:4px;border:1px solid #1e2530;background:transparent;color:#4a6070;font-size:10px;font-weight:700;cursor:pointer}
.step-btn.on{background:rgba(0,255,200,.15);border-color:#00ffc8;color:#00ffc8}

/* SUB TABS */
.subtabs{display:flex;align-items:center;gap:2px;background:#0d0f14;border-bottom:1px solid #1e2530;padding:5px 10px;flex-shrink:0;overflow-x:auto;scrollbar-width:none}
.subtabs::-webkit-scrollbar{display:none}
.stab{padding:5px 12px;border-radius:6px;font-size:11px;font-weight:600;color:#4a6070;cursor:pointer;border:none;background:transparent;white-space:nowrap;transition:all .12s;flex-shrink:0}
.stab:hover{color:#8090a0}
.stab.on{background:rgba(0,255,200,.12);color:#00ffc8;border:1px solid rgba(0,255,200,.2)}
.view-btns{display:flex;gap:4px;margin-left:auto;flex-shrink:0}
.vbtn{padding:4px 10px;border-radius:5px;background:#1e2530;border:1px solid #2a3040;color:#6a8090;font-size:10px;font-weight:700;cursor:pointer}
.vbtn.on{background:rgba(0,255,200,.12);border-color:#00ffc8;color:#00ffc8}

/* MAIN LAYOUT */
.main{display:grid;grid-template-columns:1fr 320px;flex:1;overflow:hidden;min-height:0}

/* PAD GRID */
.pad-section{padding:12px;display:flex;flex-direction:column;gap:8px;overflow:hidden}
.pad-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;flex:1}
.pad{position:relative;border-radius:8px;border:2px solid var(--pc);background:rgba(0,0,0,.3);cursor:pointer;display:flex;flex-direction:column;align-items:flex-start;justify-content:flex-end;padding:8px 10px;transition:all .1s;min-height:80px;overflow:hidden}
.pad::after{content:'';position:absolute;inset:0;background:var(--pc);opacity:0;transition:opacity .08s;border-radius:6px}
.pad.hit::after{opacity:.18}
.pad-num{position:absolute;top:7px;left:10px;font-size:10px;font-weight:700;color:var(--pc);opacity:.7;font-family:'Courier New',monospace}
.pad-label{font-size:11px;font-weight:600;color:#8090a0;z-index:1}
.pad-sub{font-size:9px;color:#4a6070;margin-top:1px;z-index:1}
.pad-active-dot{position:absolute;top:7px;right:8px;width:6px;height:6px;border-radius:50%;background:var(--pc);box-shadow:0 0 6px var(--pc);display:none}
.pad.loaded .pad-active-dot{display:block}
.pad.loaded .pad-label{color:#e0eaf0}

/* INSTRUMENT PANEL */
.instr-panel{background:#0a0c12;border-left:1px solid #1e2530;display:flex;flex-direction:column;overflow:hidden}
.instr-section{padding:10px 14px;border-bottom:1px solid #1e2530;flex-shrink:0}
.instr-lbl{font-size:9px;font-weight:700;color:#4a6070;letter-spacing:1px;text-transform:uppercase;margin-bottom:8px}
.instr-grid{display:flex;flex-wrap:wrap;gap:5px}
.instr-btn{padding:5px 10px;border-radius:6px;font-size:11px;font-weight:600;cursor:pointer;border:1px solid #2a3040;background:#111620;color:#8090a0;transition:all .12s;white-space:nowrap}
.instr-btn:hover{border-color:#4a6070;color:#c0d0e0}
.instr-btn.on{background:rgba(0,255,200,.12);border-color:#00ffc8;color:#00ffc8}
.knob-row{display:flex;align-items:center;gap:14px;padding:10px 14px;border-bottom:1px solid #1e2530;flex-shrink:0}
.oct-row{display:flex;align-items:center;gap:8px;padding:0 14px 10px;border-bottom:1px solid #1e2530;flex-shrink:0}
.oct-lbl{font-size:9px;color:#4a6070;letter-spacing:.5px}
.oct-btn{width:22px;height:22px;border-radius:4px;border:1px solid #2a3040;background:#111620;color:#8090a0;font-size:12px;cursor:pointer;display:flex;align-items:center;justify-content:center}
.oct-val{font-size:13px;font-weight:700;color:#e0eaf0;min-width:26px;text-align:center;font-family:'Courier New',monospace}
.midi-bar{display:flex;align-items:center;gap:8px;padding:7px 14px;background:#07090f;border-bottom:1px solid #1e2530;flex-shrink:0}
.midi-badge{padding:3px 8px;border-radius:4px;background:rgba(0,200,255,.12);border:1px solid rgba(0,200,255,.25);color:#00c8ff;font-size:9px;font-weight:700}
.midi-hint{font-size:9px;color:#2a3040}
.labels-badge{padding:3px 8px;border-radius:4px;background:rgba(0,255,200,.1);border:1px solid rgba(0,255,200,.2);color:#00ffc8;font-size:9px;font-weight:700;margin-left:auto}

/* PIANO */
.piano-wrap{flex:1;padding:8px 14px 10px;display:flex;align-items:flex-end;gap:0;overflow-x:auto;scrollbar-width:thin;scrollbar-color:#1e2530 transparent;position:relative}
.wkey{width:32px;min-width:32px;height:90px;background:#d8dde8;border-radius:0 0 5px 5px;border:1px solid #9aa0a8;cursor:pointer;position:relative;transition:background .08s;flex-shrink:0}
.wkey:hover,.wkey.on{background:#00ffc8}
.wkey-lbl{position:absolute;bottom:6px;left:50%;transform:translateX(-50%);font-size:8px;color:#6a8090;font-weight:700;font-family:'Courier New',monospace}
.wkey.on .wkey-lbl{color:#041014}
.bkey{width:20px;min-width:20px;height:56px;background:#1a1e28;border-radius:0 0 4px 4px;border:1px solid #0a0c10;cursor:pointer;position:absolute;z-index:2;transition:background .08s}
.bkey:hover,.bkey.on{background:#00ffc8}

/* ARRANGE */
.arrange-section{flex-shrink:0;border-top:1px solid #1e2530;background:#080a0e}
.arrange-hd{display:flex;align-items:center;gap:8px;padding:5px 12px;border-bottom:1px solid #1e2530;height:28px}
.arrange-lbl{font-size:9px;font-weight:700;color:#4a6070;letter-spacing:1px}
.arrange-tracks{overflow:hidden}
.atrack{display:flex;align-items:center;height:26px;border-bottom:1px solid #0d1018}
.atrack-lbl{font-size:8px;color:#4a6070;width:50px;padding:0 8px;flex-shrink:0;letter-spacing:.3px}
.atrack-lane{flex:1;height:100%;position:relative;background:repeating-linear-gradient(90deg,transparent,transparent 49px,#111620 49px,#111620 50px)}
.aclip{position:absolute;top:3px;height:20px;border-radius:3px;display:flex;align-items:center;padding:0 6px;font-size:7px;font-weight:700;cursor:pointer}
.playhead{position:absolute;top:0;bottom:0;width:1.5px;background:#00ffc8;z-index:10;box-shadow:0 0 6px #00ffc8}
/* ADD THESE LINES STARTING AT LINE 108 */
.pad-section { overflow-y: auto; min-height: 0; }
.arrange-section { flex-shrink: 0; border-top: 1px solid #1e2530; }
.pad { min-height: 80px; flex-basis: 80px; }
</style>
</head>
<body style="display:flex;flex-direction:column;height:100vh">

<div class="topbar">
  <div class="collab-btn">🤝<span>Collab</span></div>
  <div class="session-btns">
    <button class="sbtn start">+ Start Session</button>
    <button class="sbtn join">Join Session</button>
  </div>
  <div class="nav-tabs">
    <div class="ntab"><span class="ico">⊞</span> Arrange</div>
    <div class="ntab"><span class="ico">⌨</span> Console</div>
    <div class="ntab"><span class="ico">🎹</span> Piano Roll</div>
    <div class="ntab"><span class="ico">🎹</span> Piano</div>
    <div class="ntab on"><span class="ico">🥁</span> Sampler</div>
    <div class="ntab"><span class="ico">🎛</span> AI Mix</div>
    <div class="ntab"><span class="ico">🎸</span> Synth</div>
    <div class="ntab"><span class="ico">🥁</span> Drum Design</div>
    <div class="ntab"><span class="ico">🔧</span> Instr Build</div>
    <div class="ntab"><span class="ico">🎚</span> Multiband</div>
    <div class="ntab"><span class="ico">🎵</span> Key Finder</div>
    <div class="ntab"><span class="ico">🎤</span> Vocal</div>
    <div class="ntab"><span class="ico">⛓</span> FX Chain</div>
    <div class="ntab"><span class="ico">✨</span> Mastering</div>
  </div>
  <button class="export-btn">⬆ Export</button>
</div>

<div class="transport">
  <button class="tport-btn tport-stop">■</button>
  <button class="tport-btn tport-play" id="playBtn" onclick="togglePlay()">▶</button>
  <button class="tport-btn tport-rec">⏺</button>
  <div class="divider"></div>
  <div class="bpm-wrap">
    <span class="bpm-lbl">BPM</span>
    <span class="bpm-val" id="bpmVal">140</span>
    <div class="bpm-ctrl">
      <button class="bpm-arrow" onclick="changeBPM(1)">▲</button>
      <button class="bpm-arrow" onclick="changeBPM(-1)">▼</button>
    </div>
  </div>
  <div class="divider"></div>
  <button class="tap-btn">TAP</button>
  <div class="divider"></div>
  <div class="swing-wrap"><div class="swing-knob"></div><span>Swing</span><span style="color:#00ffc8;font-family:'Courier New',monospace;font-size:11px">0%</span></div>
  <div class="divider"></div>
  <div style="font-size:10px;color:#4a6070">Q</div>
  <select style="background:#1e2530;border:1px solid #2a3040;color:#8090a0;font-size:10px;padding:3px 6px;border-radius:4px;outline:none">
    <option>1/16</option><option>1/8</option><option>1/4</option>
  </select>
  <div class="steps-wrap">
    <span>Steps:</span>
    <button class="step-btn">8</button>
    <button class="step-btn on" id="step16">16</button>
    <button class="step-btn">32</button>
    <button class="step-btn">64</button>
  </div>
</div>

<div class="subtabs">
  <button class="stab">🎤 Sampler</button>
  <button class="stab">🥁 Drum Kit</button>
  <button class="stab on">🎹 Beat Maker</button>
  <button class="stab">🎸 Chords</button>
  <button class="stab">🔊 Sounds</button>
  <button class="stab">🔄 Loops</button>
  <button class="stab">🤖 AI Beats</button>
  <button class="stab">🎤 Voice MIDI</button>
  <button class="stab">🎵 Hum to Song</button>
  <button class="stab">🎶 Text to Song</button>
  <button class="stab">🔀 Stems</button>
  <div class="view-btns">
    <button class="vbtn on">⊞ Split</button>
    <button class="vbtn">⊡ Pads</button>
    <button class="vbtn">≡ Seq</button>
  </div>
</div>

<div class="main" style="flex:1;min-height:0;overflow:hidden">

  <div style="display:flex;flex-direction:column;overflow:hidden">
    <div class="pad-section" style="flex:1;min-height:0;overflow:hidden">
      <div class="pad-grid" id="padGrid"></div>
    </div>

    <div class="arrange-section" style="height:120px;flex-shrink:0">
      <div class="arrange-hd">
        <span class="arrange-lbl">ARRANGEMENT VIEW</span>
        <span style="font-size:9px;color:#2a3040;margin-left:4px">All</span>
        <div id="phContainer" style="flex:1;position:relative;height:100%"></div>
      </div>
      <div class="arrange-tracks" id="arrangeTracks"></div>
    </div>
  </div>

  <div class="instr-panel">
    <div class="instr-section">
      <div class="instr-lbl">Instrument</div>
      <div class="instr-grid">
        <button class="instr-btn on">🎹 Piano</button>
        <button class="instr-btn">🎷 Organ</button>
        <button class="instr-btn">⚡ Synth Lead</button>
        <button class="instr-btn">🎸 Synth Pad</button>
        <button class="instr-btn">🎸 Bass</button>
        <button class="instr-btn">🎻 Strings</button>
        <button class="instr-btn">⚡ Electric Piano</button>
        <button class="instr-btn">🪕 Pluck</button>
      </div>
    </div>

    <div class="oct-row">
      <span class="oct-lbl">OCTAVE</span>
      <button class="oct-btn" onclick="changeOct(-1)">−</button>
      <span class="oct-val" id="octVal">C4</span>
      <button class="oct-btn" onclick="changeOct(1)">+</button>
      <div style="margin-left:auto;display:flex;align-items:center;gap:8px">
        <div style="font-size:9px;color:#4a6070">VOLUME</div>
        <input type="range" min="0" max="100" value="76" style="width:60px;accent-color:#00ffc8;height:3px">
        <span style="font-size:10px;color:#00ffc8;font-family:'Courier New',monospace">76%</span>
        <div style="font-size:9px;color:#4a6070;margin-left:6px">REVERB</div>
        <input type="range" min="0" max="100" value="15" style="width:50px;accent-color:#00ffc8;height:3px">
        <span style="font-size:10px;color:#00ffc8;font-family:'Courier New',monospace">15%</span>
      </div>
    </div>

    <div class="knob-row">
      <button style="padding:4px 10px;border-radius:5px;background:rgba(0,255,200,.1);border:1px solid rgba(0,255,200,.25);color:#00ffc8;font-size:10px;font-weight:700;cursor:pointer">🎵 Sustain</button>
      <button style="padding:4px 10px;border-radius:5px;background:rgba(0,255,200,.15);border:1px solid #00ffc8;color:#00ffc8;font-size:10px;font-weight:700;cursor:pointer">Labels</button>
    </div>

    <div class="midi-bar">
      <div class="midi-badge">🎹 MIDI: StudioRack</div>
      <div class="midi-hint">Keys: Z-M / Q-U · Sharps: S,0,8,H,J / 2,3,5,6,7 · Space: Sustain · +/-: Octave</div>
      <div class="labels-badge">ON</div>
    </div>

    <div class="piano-wrap" id="pianoWrap"></div>
  </div>

</div>

<script>
const PAD_COLORS = [
  '#00ffc8','#00aaff','#ff6b35','#ffd700',
  '#a78bfa','#ff4466','#00ff88','#ff8800',
  '#e040fb','#40c4ff','#69f0ae','#ff5722',
  '#00ffc8','#ff9800','#7c4dff','#f06292'
];

const PAD_NAMES = [
  'Kick 808','Snare','Hi-Hat','Open HH',
  'Clap','Perc','Bass','Sub Drop',
  'Chord A','Chord B','Lead Mel','Arp 1',
  'FX Rise','FX Fall','Pad Atm','Noise'
];

const LOADED = [0,1,2,4,6,8,9,10,12,14];

// Build pads
const grid = document.getElementById('padGrid');
const pads = PAD_NAMES.map((name, i) => {
  const p = document.createElement('div');
  p.className = 'pad' + (LOADED.includes(i) ? ' loaded' : '');
  p.style.setProperty('--pc', PAD_COLORS[i]);
  p.innerHTML = '<div class="pad-num">' + (i+1) + '</div><div class="pad-active-dot"></div><div class="pad-label">' + name + '</div><div class="pad-sub">' + (LOADED.includes(i) ? '●●●●●●' : 'Empty') + '</div>';
  p.onclick = () => { p.classList.add('hit'); setTimeout(() => p.classList.remove('hit'), 100); };
  grid.appendChild(p);
  return p;
});

// Build arrange tracks
const TRACK_DATA = [
  {lbl:'KICK',color:'#00ffc8',clips:[{l:0,w:120},{l:200,w:80},{l:340,w:120}]},
  {lbl:'SNARE',color:'#ff6b35',clips:[{l:60,w:60},{l:280,w:40}]},
  {lbl:'HI-HAT',color:'#ffd700',clips:[{l:0,w:200},{l:220,w:160}]},
  {lbl:'BASS',color:'#00aaff',clips:[{l:80,w:100},{l:300,w:80}]},
  {lbl:'CHORD',color:'#a78bfa',clips:[{l:0,w:160},{l:240,w:120}]},
  {lbl:'LEAD',color:'#ff4466',clips:[{l:120,w:80},{l:320,w:100}]},
  {lbl:'PAD',color:'#00ff88',clips:[{l:0,w:80},{l:280,w:60}]},
];

const at = document.getElementById('arrangeTracks');
TRACK_DATA.forEach(t => {
  const row = document.createElement('div');
  row.className = 'atrack';

  const lbl = document.createElement('div');
  lbl.className = 'atrack-lbl';
  lbl.textContent = t.lbl;

  const lane = document.createElement('div');
  lane.className = 'atrack-lane';

  t.clips.forEach(c => {
    const clip = document.createElement('div');
    clip.className = 'aclip';
    clip.style.cssText = 'left:' + (c.l + 54) + 'px;width:' + c.w + 'px;background:' + t.color + '22;border:1px solid ' + t.color + '44;color:' + t.color;
    clip.textContent = t.lbl;
    lane.appendChild(clip);
  });

  row.appendChild(lbl);
  row.appendChild(lane);
  at.appendChild(row);
});

// Build piano
const pianoWrap = document.getElementById('pianoWrap');
const NOTES = ['C','D','E','F','G','A','B'];
const BLACK_AFTER = [0,1,3,4,5];
let xPos = 0;

for (let oct = 4; oct <= 6; oct++) {
  NOTES.forEach((note, ni) => {
    const wk = document.createElement('div');
    wk.className = 'wkey';

    const noteLabel = document.createElement('div');
    noteLabel.className = 'wkey-lbl';
    noteLabel.textContent = note + oct;

    wk.appendChild(noteLabel);
    wk.onclick = () => {
      wk.classList.add('on');
      setTimeout(() => wk.classList.remove('on'), 200);
    };

    pianoWrap.appendChild(wk);

    if (BLACK_AFTER.includes(ni)) {
      const bk = document.createElement('div');
      bk.className = 'bkey';
      bk.style.cssText = 'left:' + (xPos + 22) + 'px;top:0';
      bk.onclick = e => {
        e.stopPropagation();
        bk.classList.add('on');
        setTimeout(() => bk.classList.remove('on'), 200);
      };
      pianoWrap.appendChild(bk);
    }

    xPos += 32;
  });
}

pianoWrap.style.position = 'relative';

// BPM
let bpm = 140;
function changeBPM(d) {
  bpm = Math.max(60, Math.min(200, bpm + d));
  document.getElementById('bpmVal').textContent = bpm;
  if (isPlaying) resetInterval();
}

// Octave
const OCTS = ['C2','C3','C4','C5','C6'];
let octIdx = 2;
function changeOct(d) {
  octIdx = Math.max(0, Math.min(4, octIdx + d));
  document.getElementById('octVal').textContent = OCTS[octIdx];
}

// Playback
let isPlaying = false;
let step = 0;
let interval = null;

const SEQ = [
  [1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0],
  [0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0],
  [1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,1],
  [0,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0]
];

let phX = 54;

function tick() {
  phX += 2.5;
  if (phX > 600) phX = 54;

  SEQ.forEach((row, ri) => {
    if (row[step % 16]) {
      const padIdx = ri === 0 ? 0 : ri === 1 ? 1 : ri === 2 ? 2 : 6;
      pads[padIdx].classList.add('hit');
      setTimeout(() => pads[padIdx].classList.remove('hit'), 80);
    }
  });

  if (Math.random() > 0.3) {
    pads[2].classList.add('hit');
    setTimeout(() => pads[2].classList.remove('hit'), 60);
  }

  step = (step + 1) % 16;

  document.querySelectorAll('.atrack-lane').forEach(lane => {
    let ph = lane.querySelector('.playhead');
    if (!ph) {
      ph = document.createElement('div');
      ph.className = 'playhead';
      lane.appendChild(ph);
    }
    ph.style.left = phX + 'px';
  });
}

function resetInterval() {
  clearInterval(interval);
  interval = setInterval(tick, 60000 / bpm / 4);
}

function togglePlay() {
  isPlaying = !isPlaying;
  const btn = document.getElementById('playBtn');

  if (isPlaying) {
    btn.textContent = '⏸';
    btn.style.background = '#ff6b35';
    resetInterval();
  } else {
    btn.textContent = '▶';
    btn.style.background = '#00ffc8';
    clearInterval(interval);
  }
}

document.querySelectorAll('.instr-btn').forEach(b => {
  b.onclick = () => {
    document.querySelectorAll('.instr-btn').forEach(x => x.classList.remove('on'));
    b.classList.add('on');
  };
});

document.querySelectorAll('.ntab').forEach(b => {
  b.onclick = () => {
    document.querySelectorAll('.ntab').forEach(x => x.classList.remove('on'));
    b.classList.add('on');
  };
});

document.querySelectorAll('.stab').forEach(b => {
  b.onclick = () => {
    document.querySelectorAll('.stab').forEach(x => x.classList.remove('on'));
    b.classList.add('on');
  };
});

setTimeout(togglePlay, 400);
</script>
</body>
</html>`;

export default html;