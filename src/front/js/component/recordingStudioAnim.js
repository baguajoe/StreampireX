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
:root{
  --bg:#050913;
  --bg2:#07111c;
  --panel:#08111c;
  --panel2:#0b1623;
  --panel3:#0d1b2b;
  --line:#183246;
  --line2:#233f56;
  --text:#dce9f3;
  --muted:#7290a7;
  --teal:#00ffc8;
  --orange:#ff7a1a;
  --red:#ff4d4f;
  --yellow:#ffc857;
  --purple:#7f5cff;
  --blue:#43b7ff;
  --green:#19d88f;
}

*,
*::before,
*::after{
  box-sizing:border-box;
}

html,body{
  margin:0;
  width:100%;
  height:100%;
  overflow:hidden;
  background:
    radial-gradient(circle at center, rgba(0,255,200,0.08), transparent 32%),
    linear-gradient(180deg,#07111c 0%, #030914 100%);
  font-family:"JetBrains Mono","Fira Code","Courier New",monospace;
  color:var(--text);
}

body{
  display:flex;
  align-items:center;
  justify-content:center;
}

#stage{
  width:100vw;
  height:100vh;
  position:relative;
  overflow:hidden;
}

#scaleWrap{
  position:absolute;
  left:50%;
  top:50%;
  transform-origin:center center;
}

.daw{
  width:1280px;
  height:720px;
  border:1px solid rgba(0,255,200,0.16);
  border-radius:16px;
  overflow:hidden;
  background:
    linear-gradient(180deg, rgba(7,12,22,0.98), rgba(2,6,14,0.98));
  box-shadow:
    0 0 0 1px rgba(0,255,200,0.04) inset,
    0 0 40px rgba(0,255,200,0.08);
  display:grid;
  grid-template-rows: 42px 54px 1fr 118px 34px;
}

/* topbar */
.topbar{
  display:grid;
  grid-template-columns: 110px 220px 1fr 130px;
  align-items:center;
  background:#09111b;
  border-bottom:1px solid var(--line);
}

.collab{
  display:flex;
  align-items:center;
  gap:8px;
  padding:0 14px;
  border-right:1px solid var(--line);
  height:100%;
  color:var(--muted);
  font-size:11px;
  font-weight:800;
  text-transform:uppercase;
}

.collab-dot{
  width:8px;
  height:8px;
  border-radius:50%;
  background:#4d6f88;
}

.session{
  display:flex;
  align-items:center;
  gap:8px;
  padding:0 10px;
  border-right:1px solid var(--line);
  height:100%;
}

.sbtn{
  height:26px;
  padding:0 14px;
  border:none;
  border-radius:5px;
  font:inherit;
  font-size:11px;
  font-weight:900;
  cursor:pointer;
}

.sbtn.start{
  background:var(--teal);
  color:#041014;
  box-shadow:0 0 10px rgba(0,255,200,0.2);
}

.sbtn.join{
  background:#101b28;
  color:#c8d7e3;
  border:1px solid var(--line);
}

.tabs{
  display:flex;
  align-items:stretch;
  min-width:0;
  height:100%;
}

.tab{
  min-width:108px;
  display:flex;
  align-items:center;
  justify-content:center;
  border-right:1px solid var(--line);
  color:var(--muted);
  font-size:11px;
  font-weight:800;
  text-transform:uppercase;
}

.tab.active{
  color:var(--teal);
  background:rgba(0,255,200,0.06);
  box-shadow:inset 0 -2px 0 var(--teal);
}

.exportWrap{
  display:flex;
  justify-content:center;
  align-items:center;
}

.exportBtn{
  height:28px;
  padding:0 18px;
  border:none;
  border-radius:5px;
  background:var(--teal);
  color:#041014;
  font:inherit;
  font-size:12px;
  font-weight:900;
}

/* transport */
.transport{
  display:grid;
  grid-template-columns: 330px 1fr 240px;
  align-items:center;
  padding:0 12px;
  background:#07101a;
  border-bottom:1px solid var(--line);
}

.transport-left{
  display:flex;
  align-items:center;
  gap:8px;
}

.ctrl{
  width:28px;
  height:28px;
  border-radius:5px;
  border:1px solid var(--line2);
  background:#111b29;
  color:#cfe2ef;
  display:flex;
  align-items:center;
  justify-content:center;
  font-weight:900;
  font-size:12px;
  cursor:pointer;
}

.ctrl.playing{
  background:var(--teal);
  color:#041014;
  border-color:var(--teal);
}

.ctrl.rec{
  background:rgba(255,77,79,0.12);
  color:var(--red);
  border-color:rgba(255,77,79,0.35);
}

.counter{
  display:flex;
  align-items:center;
  gap:10px;
  margin-left:8px;
}

.bpm{
  color:#f5fbff;
  font-size:16px;
  font-weight:900;
}

.time{
  color:var(--teal);
  font-size:18px;
  font-weight:900;
  letter-spacing:2px;
  min-width:108px;
  text-shadow:0 0 8px rgba(0,255,200,0.18);
}

.transport-mid{
  display:flex;
  justify-content:center;
  align-items:center;
  gap:10px;
}

.pill{
  height:24px;
  padding:0 10px;
  border-radius:5px;
  border:1px solid var(--line);
  background:#0d1825;
  color:#d4e4f0;
  font-size:10px;
  font-weight:800;
  display:flex;
  align-items:center;
}

.pill.orange{
  color:var(--orange);
  border-color:rgba(255,122,26,0.4);
  background:rgba(255,122,26,0.08);
}

.transport-right{
  display:flex;
  justify-content:flex-end;
  align-items:center;
  gap:8px;
}

/* main */
.main{
  display:grid;
  grid-template-columns: 210px 1fr 118px;
  min-height:0;
}

.leftPanel{
  background:#08111c;
  border-right:1px solid var(--line);
  display:grid;
  grid-template-rows: 30px 1fr;
  min-width:0;
}

.tracksHead{
  display:flex;
  align-items:center;
  justify-content:space-between;
  padding:0 10px;
  border-bottom:1px solid var(--line);
  color:var(--muted);
  font-size:10px;
  font-weight:900;
  text-transform:uppercase;
}

.trackList{
  min-height:0;
}

.trackRow{
  height:74px;
  border-bottom:1px solid rgba(24,50,70,0.7);
  padding:8px 8px 8px 10px;
  display:grid;
  grid-template-columns: 6px 1fr;
  gap:10px;
}

.trackBar{
  border-radius:6px;
}

.trackBody{
  min-width:0;
  display:flex;
  flex-direction:column;
  gap:6px;
}

.trackTop{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:8px;
}

.trackName{
  color:#e8f5ff;
  font-size:11px;
  font-weight:900;
  white-space:nowrap;
  overflow:hidden;
  text-overflow:ellipsis;
}

.trackType{
  color:var(--muted);
  font-size:9px;
  text-transform:uppercase;
}

.trackBtns{
  display:flex;
  gap:4px;
  flex-wrap:wrap;
}

.miniBtn{
  min-width:18px;
  height:18px;
  padding:0 4px;
  border-radius:4px;
  border:1px solid var(--line);
  background:#101a27;
  color:#aac0d1;
  display:flex;
  align-items:center;
  justify-content:center;
  font-size:9px;
  font-weight:900;
}

.timeline{
  background:#050b14;
  display:grid;
  grid-template-rows: 30px 1fr;
  min-width:0;
  min-height:0;
  position:relative;
}

.ruler{
  position:relative;
  border-bottom:1px solid var(--line);
  background:#09111b;
}

.rMark{
  position:absolute;
  top:0;
  bottom:0;
  width:1px;
  background:#29465c;
}

.rLabel{
  position:absolute;
  top:6px;
  left:6px;
  color:#778fa2;
  font-size:10px;
  font-weight:800;
}

.arrange{
  position:relative;
  min-height:0;
  background:
    repeating-linear-gradient(
      90deg,
      rgba(8,14,24,0) 0,
      rgba(8,14,24,0) calc(12.5% - 1px),
      rgba(16,34,50,0.95) calc(12.5% - 1px),
      rgba(16,34,50,0.95) 12.5%
    ),
    linear-gradient(180deg,#040912,#02060c);
}

.lane{
  position:relative;
  height:74px;
  border-bottom:1px solid rgba(24,50,70,0.7);
}

.clip{
  position:absolute;
  top:10px;
  height:54px;
  border-radius:7px;
  padding:0 10px 8px;
  display:flex;
  align-items:flex-end;
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,0.05),
    0 0 0 1px rgba(255,255,255,0.03);
  overflow:hidden;
}

.clip::before{
  content:"";
  position:absolute;
  inset:0;
  background:
    linear-gradient(180deg, rgba(255,255,255,0.08), transparent 45%),
    repeating-linear-gradient(
      90deg,
      transparent 0,
      transparent 10px,
      rgba(255,255,255,0.03) 10px,
      rgba(255,255,255,0.03) 12px
    );
  pointer-events:none;
}

.clip span{
  position:relative;
  z-index:1;
  font-size:10px;
  font-weight:900;
  white-space:nowrap;
}

.playhead{
  position:absolute;
  top:0;
  bottom:0;
  width:2px;
  background:var(--teal);
  z-index:50;
  box-shadow:0 0 12px rgba(0,255,200,0.5);
}

.playhead::before{
  content:"";
  position:absolute;
  top:0;
  left:-4px;
  width:10px;
  height:10px;
  background:var(--teal);
  clip-path:polygon(50% 0%,0% 100%,100% 100%);
  filter:drop-shadow(0 0 8px rgba(0,255,200,0.55));
}

.fxRack{
  background:#08111c;
  border-left:1px solid var(--line);
  padding:10px 8px;
  display:flex;
  flex-direction:column;
  gap:8px;
}

.fxBtn{
  height:24px;
  border-radius:5px;
  border:1px solid rgba(0,255,200,0.55);
  background:rgba(0,255,200,0.05);
  color:var(--teal);
  font:inherit;
  font-size:10px;
  font-weight:900;
}

/* mixer */
.mixer{
  border-top:1px solid var(--line);
  background:#06101a;
  display:flex;
  min-width:0;
  overflow:hidden;
}

.channel{
  width:160px;
  border-right:1px solid rgba(24,50,70,0.65);
  padding:8px 8px 6px;
  display:grid;
  grid-template-rows: 18px 18px 1fr 18px;
  justify-items:center;
  gap:6px;
}

.chName{
  font-size:10px;
  font-weight:900;
}

.chTopBtns{
  display:flex;
  gap:4px;
}

.cbtn{
  width:18px;
  height:18px;
  border-radius:4px;
  border:1px solid var(--line);
  background:#0f1a28;
  color:#a9bed0;
  font-size:8px;
  font-weight:900;
  display:flex;
  align-items:center;
  justify-content:center;
}

.chBody{
  width:100%;
  display:grid;
  grid-template-columns: 26px 1fr 24px;
  align-items:end;
  gap:8px;
  min-height:0;
}

.meter{
  width:18px;
  height:62px;
  border-radius:6px;
  border:1px solid var(--line);
  background:#0a1522;
  display:flex;
  align-items:flex-end;
  padding:2px;
}

.meterFill{
  width:100%;
  height:8px;
  border-radius:4px;
  background:var(--teal);
}

.faderWrap{
  height:70px;
  display:flex;
  align-items:center;
  justify-content:center;
}

.fader{
  -webkit-appearance:none;
  appearance:none;
  width:70px;
  height:4px;
  background:#20384f;
  border-radius:999px;
  transform:rotate(-90deg);
}

.fader::-webkit-slider-thumb{
  -webkit-appearance:none;
  appearance:none;
  width:12px;
  height:12px;
  border-radius:50%;
  background:var(--teal);
  box-shadow:0 0 10px rgba(0,255,200,0.3);
}

.chPan{
  font-size:9px;
  color:var(--muted);
  text-transform:uppercase;
  writing-mode:vertical-rl;
  transform:rotate(180deg);
}

.chLabel{
  font-size:9px;
  color:var(--muted);
}

/* footer */
.footer{
  display:grid;
  grid-template-columns: 1fr 300px;
  border-top:1px solid var(--line);
  background:#070f18;
}

.library{
  padding:10px 12px;
  display:flex;
  flex-direction:column;
  gap:10px;
}

.libTitle{
  color:var(--yellow);
  font-size:11px;
  font-weight:900;
}

.libGrid{
  display:grid;
  grid-template-columns: repeat(4, minmax(0,1fr));
  gap:8px;
}

.libItem{
  border:1px solid rgba(24,50,70,0.8);
  background:#0b1520;
  border-radius:6px;
  padding:8px;
  min-width:0;
}

.libName{
  color:#e2edf5;
  font-size:10px;
  font-weight:800;
  white-space:nowrap;
  overflow:hidden;
  text-overflow:ellipsis;
}

.libSub{
  color:var(--muted);
  font-size:9px;
  margin-top:4px;
}

.brandBar{
  border-left:1px solid var(--line);
  display:flex;
  align-items:center;
  justify-content:center;
  color:var(--teal);
  font-size:12px;
  font-weight:900;
  letter-spacing:0.2px;
  padding:0 12px;
  text-align:center;
}

/* utility colors for clips */
.c-teal{ background:rgba(0,255,200,0.14); border:1px solid rgba(0,255,200,0.45); }
.c-orange{ background:rgba(255,122,26,0.14); border:1px solid rgba(255,122,26,0.45); }
.c-purple{ background:rgba(127,92,255,0.14); border:1px solid rgba(127,92,255,0.45); }
.c-blue{ background:rgba(67,183,255,0.14); border:1px solid rgba(67,183,255,0.45); }
.c-green{ background:rgba(25,216,143,0.14); border:1px solid rgba(25,216,143,0.45); }
.c-red{ background:rgba(255,77,79,0.14); border:1px solid rgba(255,77,79,0.45); }

/* tiny glow pulse */
.pulse{
  animation:pulseGlow 1.8s ease-in-out infinite;
}

@keyframes pulseGlow{
  0%,100%{ box-shadow:0 0 0 rgba(0,255,200,0); }
  50%{ box-shadow:0 0 14px rgba(0,255,200,0.16); }
}
</style>
</head>
<body>
<div id="stage">
  <div id="scaleWrap">
    <div class="daw">
      <div class="topbar">
        <div class="collab"><span class="collab-dot"></span> COLLAB</div>

        <div class="session">
          <button class="sbtn start">+ Start Session</button>
          <button class="sbtn join">Join Session</button>
        </div>

        <div class="tabs">
          <div class="tab active">Arrange</div>
          <div class="tab">Console</div>
          <div class="tab">Piano</div>
        </div>

        <div class="exportWrap">
          <button class="exportBtn">↑ Export</button>
        </div>
      </div>

      <div class="transport">
        <div class="transport-left">
          <div class="ctrl" id="stopBtn">■</div>
          <div class="ctrl rec pulse">●</div>
          <div class="ctrl" id="playBtn">▶</div>
          <div class="counter">
            <span class="bpm">120</span>
            <span class="time" id="timeDisplay">3 . 1</span>
          </div>
        </div>

        <div class="transport-mid">
          <div class="pill">1/4</div>
          <div class="pill orange">108</div>
        </div>

        <div class="transport-right">
          <div class="pill orange">MAX HEAD</div>
        </div>
      </div>

      <div class="main">
        <div class="leftPanel">
          <div class="tracksHead">
            <span>Tracks</span>
            <span>1–8</span>
          </div>
          <div class="trackList" id="trackList"></div>
        </div>

        <div class="timeline">
          <div class="ruler" id="ruler"></div>
          <div class="arrange" id="arrange">
            <div class="playhead" id="playhead" style="left:22%;"></div>
          </div>
        </div>

        <div class="fxRack">
          <button class="fxBtn">EQ</button>
          <button class="fxBtn">Comp</button>
          <button class="fxBtn">Delay</button>
          <button class="fxBtn">Limiter</button>
          <button class="fxBtn">Reverb</button>
          <button class="fxBtn">Filter</button>
        </div>
      </div>

      <div class="mixer" id="mixer"></div>

      <div class="footer">
        <div class="library">
          <div class="libTitle">📁 LIBRARY</div>
          <div class="libGrid">
            <div class="libItem"><div class="libName">Warm Pad</div><div class="libSub">Synth / Atmos</div></div>
            <div class="libItem"><div class="libName">808 Sub</div><div class="libSub">Bass / Mono</div></div>
            <div class="libItem"><div class="libName">Snare Loop</div><div class="libSub">Drums / Loop</div></div>
            <div class="libItem"><div class="libName">Vox Chop</div><div class="libSub">Vocal / FX</div></div>
          </div>
        </div>
        <div class="brandBar">🚀 StreamPireX — The all-in-one creator platform. Replace 15+ tools. Keep 90%.</div>
      </div>
    </div>
  </div>
</div>

<script>
(function(){
  const tracks = [
    {
      name:"Lead",
      type:"Audio",
      color:"#00ffc8",
      clips:[
        {left:2, width:14, label:"Verse 1", cls:"c-teal"},
        {left:33, width:12, label:"Chorus", cls:"c-green"},
        {left:56, width:10, label:"Vox A", cls:"c-teal"}
      ]
    },
    {
      name:"Piano",
      type:"MIDI",
      color:"#43b7ff",
      clips:[
        {left:27, width:12, label:"Summary", cls:"c-blue"},
        {left:50, width:9, label:"Bass", cls:"c-blue"}
      ]
    },
    {
      name:"Kick",
      type:"Beat",
      color:"#ff7a1a",
      clips:[
        {left:8, width:38, label:"Beat Pattern", cls:"c-orange"}
      ]
    },
    {
      name:"Snare",
      type:"Loop",
      color:"#ffc857",
      clips:[
        {left:8, width:22, label:"Snare Loop", cls:"c-orange"}
      ]
    },
    {
      name:"Hi-Hat",
      type:"Loop",
      color:"#7f5cff",
      clips:[
        {left:6, width:20, label:"HF Loop", cls:"c-purple"},
        {left:34, width:22, label:"HF Loop 2", cls:"c-purple"}
      ]
    },
    {
      name:"Bass",
      type:"Audio",
      color:"#ff4d4f",
      clips:[
        {left:8, width:14, label:"Bass A", cls:"c-red"},
        {left:23, width:14, label:"Bass B", cls:"c-red"},
        {left:38, width:14, label:"Bass C", cls:"c-red"},
        {left:53, width:14, label:"Bass D", cls:"c-red"},
        {left:68, width:14, label:"Bass E", cls:"c-red"}
      ]
    }
  ];

  const trackList = document.getElementById("trackList");
  const arrange = document.getElementById("arrange");
  const ruler = document.getElementById("ruler");
  const mixer = document.getElementById("mixer");
  const playhead = document.getElementById("playhead");
  const playBtn = document.getElementById("playBtn");
  const stopBtn = document.getElementById("stopBtn");
  const timeDisplay = document.getElementById("timeDisplay");
  const scaleWrap = document.getElementById("scaleWrap");

  let isPlaying = true;
  let pos = 22;
  let raf = null;
  let last = null;
  let meterTimer = null;

  function buildRuler(){
    ruler.innerHTML = "";
    for(let i=0;i<=8;i++){
      const m = document.createElement("div");
      m.className = "rMark";
      m.style.left = (i*12.5) + "%";
      if(i<8){
        const l = document.createElement("div");
        l.className = "rLabel";
        l.textContent = String(i+1);
        m.appendChild(l);
      }
      ruler.appendChild(m);
    }
  }

  function buildTracks(){
    trackList.innerHTML = "";
    arrange.querySelectorAll(".lane").forEach(n=>n.remove());

    tracks.forEach((t, idx)=>{
      const row = document.createElement("div");
      row.className = "trackRow";
      row.innerHTML = \`
        <div class="trackBar" style="background:\${t.color}"></div>
        <div class="trackBody">
          <div class="trackTop">
            <div>
              <div class="trackName">\${t.name}</div>
              <div class="trackType">\${t.type}</div>
            </div>
          </div>
          <div class="trackBtns">
            <div class="miniBtn">M</div>
            <div class="miniBtn">S</div>
            <div class="miniBtn">R</div>
            <div class="miniBtn">FX</div>
          </div>
        </div>
      \`;
      trackList.appendChild(row);

      const lane = document.createElement("div");
      lane.className = "lane";

      t.clips.forEach(c=>{
        const clip = document.createElement("div");
        clip.className = "clip " + c.cls;
        clip.style.left = c.left + "%";
        clip.style.width = c.width + "%";
        clip.innerHTML = '<span style="color:'+t.color+'">'+c.label+'</span>';
        lane.appendChild(clip);
      });

      arrange.appendChild(lane);
    });

    arrange.appendChild(playhead);
  }

  function buildMixer(){
    mixer.innerHTML = "";
    [...tracks, {name:"Master", color:"#ffffff"}].forEach((t)=>{
      const ch = document.createElement("div");
      ch.className = "channel";
      ch.innerHTML = \`
        <div class="chName" style="color:\${t.color}">\${t.name}</div>
        <div class="chTopBtns">
          <div class="cbtn">M</div>
          <div class="cbtn">S</div>
          <div class="cbtn">FX</div>
        </div>
        <div class="chBody">
          <div class="meter"><div class="meterFill"></div></div>
          <div class="faderWrap"><input class="fader" type="range" min="0" max="100" value="70" /></div>
          <div class="chPan">Pan</div>
        </div>
        <div class="chLabel">Track</div>
      \`;
      mixer.appendChild(ch);
    });
  }

  function animateMeters(){
    const fills = mixer.querySelectorAll(".meterFill");
    fills.forEach((fill)=>{
      const v = isPlaying ? Math.random() : 0.08;
      fill.style.height = (6 + v * 48) + "px";
      if(v > 0.8){
        fill.style.background = "var(--red)";
      }else if(v > 0.52){
        fill.style.background = "var(--yellow)";
      }else{
        fill.style.background = "var(--teal)";
      }
    });
  }

  function updateTime(){
    const bars = 8;
    const totalBeats = bars * 4;
    const beats = (pos / 100) * totalBeats;
    const bar = Math.floor(beats / 4) + 1;
    const beat = Math.floor(beats % 4) + 1;
    timeDisplay.textContent = bar + " . " + beat;
  }

  function tick(ts){
    if(!isPlaying) return;
    if(last == null) last = ts;
    const dt = (ts - last) / 1000;
    last = ts;

    pos += dt * 10.5; /* movement speed */
    if(pos > 95) pos = 8;

    playhead.style.left = pos + "%";
    updateTime();
    raf = requestAnimationFrame(tick);
  }

  function play(){
    if(isPlaying) return;
    isPlaying = true;
    playBtn.textContent = "⏸";
    playBtn.classList.add("playing");
    last = null;
    raf = requestAnimationFrame(tick);
  }

  function pause(){
    isPlaying = false;
    playBtn.textContent = "▶";
    playBtn.classList.remove("playing");
    last = null;
    if(raf) cancelAnimationFrame(raf);
    raf = null;
  }

  function stop(){
    pause();
    pos = 8;
    playhead.style.left = pos + "%";
    updateTime();
  }

  function togglePlay(){
    if(isPlaying) pause();
    else play();
  }

  function scaleStage(){
    const baseW = 1280;
    const baseH = 720;
    const pad = 24;
    const vw = window.innerWidth - pad;
    const vh = window.innerHeight - pad;
    const scale = Math.min(vw / baseW, vh / baseH);

    scaleWrap.style.transform = \`translate(-50%, -50%) scale(\${scale})\`;
    scaleWrap.style.width = baseW + "px";
    scaleWrap.style.height = baseH + "px";
  }

  buildRuler();
  buildTracks();
  buildMixer();
  scaleStage();
  animateMeters();
  updateTime();

  meterTimer = setInterval(animateMeters, 90);

  playBtn.addEventListener("click", togglePlay);
  stopBtn.addEventListener("click", stop);
  window.addEventListener("resize", scaleStage);

  playBtn.textContent = "⏸";
  playBtn.classList.add("playing");
  raf = requestAnimationFrame(tick);
})();
</script>
</body>
</html>`;

export default html;