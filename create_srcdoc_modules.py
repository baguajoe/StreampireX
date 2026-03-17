#!/usr/bin/env python3
"""
create_srcdoc_modules.py
Run from: /workspaces/SpectraSphere

Writes 5 animation HTML files as ES module exports into
src/front/js/component/  so they can be imported as srcDoc props.

Usage:
  python3 /tmp/create_srcdoc_modules.py
"""
import os, shutil

COMP = "/workspaces/SpectraSphere/src/front/js/component"
os.makedirs(COMP, exist_ok=True)

# ── helper ──────────────────────────────────────────────────────────────────
def write_module(filename, html):
    path = os.path.join(COMP, filename)
    if os.path.exists(path):
        shutil.copy(path, path + ".bak")
    # escape backticks and ${} inside the HTML so it's safe in a template literal
    escaped = html.replace("\\", "\\\\").replace("`", "\\`").replace("${", "\\${")
    content = f"const html = `{escaped}`;\nexport default html;\n"
    open(path, "w").write(content)
    print(f"  ✓ Wrote {filename}  ({len(content):,} bytes)")

# ============================================================================
# 1. DJ STUDIO
# ============================================================================
DJ_STUDIO_HTML = r"""<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<style>
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:100%;background:#06060f;font-family:'Inter',system-ui,sans-serif;color:#e0eaf0}
.dj{width:100%;background:#06060f;overflow:hidden}
.topbar{display:flex;align-items:center;justify-content:space-between;padding:12px 20px;background:#09090f;border-bottom:1px solid #1a1a2e}
.logo{font-size:15px;font-weight:800;color:#00ffcc;letter-spacing:1px;font-family:'Courier New',monospace}
.logo em{color:#fff;font-style:normal}
.acts{display:flex;gap:8px}
.btn{padding:7px 16px;border-radius:7px;font-size:12px;font-weight:700;cursor:pointer;border:none;font-family:inherit;transition:all .15s}
.sync{border:1px solid #00ffcc;background:rgba(0,255,200,0.08);color:#00ffcc}
.sync:hover{background:rgba(0,255,200,0.2)}
.rec{border:2px solid #ff3366;background:rgba(255,51,102,0.1);color:#ff3366;letter-spacing:.5px}
.rec.on{background:rgba(255,51,102,0.25);animation:rp 1.5s ease-in-out infinite}
@keyframes rp{0%,100%{box-shadow:0 0 12px rgba(255,51,102,0.3)}50%{box-shadow:0 0 24px rgba(255,51,102,0.7)}}
.mst{border:1px solid #333;background:#111;color:#aaa}
.main{display:grid;grid-template-columns:1fr 150px 1fr}
.deck{padding:16px;display:flex;flex-direction:column;gap:10px;border-right:1px solid #1a1a2e}
.deck:last-child{border-right:none;border-left:1px solid #1a1a2e}
.dkhd{display:flex;align-items:center;gap:10px}
.letter{font-size:2rem;font-weight:900;width:36px;flex-shrink:0}
.tname{font-size:13px;font-weight:700;color:#e0eaf0;margin-bottom:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tmeta{display:flex;gap:4px;flex-wrap:wrap}
.badge{font-size:10px;padding:2px 7px;border-radius:3px;border:1px solid #333;color:#aaa;background:#111}
.mstbadge{border-color:#00ffcc;color:#00ffcc;background:rgba(0,255,200,0.1)}
.turntable-wrap{display:flex;justify-content:center;align-items:center;padding:10px 0;position:relative}
.platter-outer{width:180px;height:180px;border-radius:50%;background:#111;border:3px solid #1a1a2e;position:relative;display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 6px #0a0a12,0 0 0 7px #1a1a2e,0 8px 30px rgba(0,0,0,0.8)}
.vinyl{width:160px;height:160px;border-radius:50%;position:relative;transition:transform 0s;flex-shrink:0}
.vinyl.spin{animation:vspin 1.8s linear infinite}
.vinyl.slow{animation:vspin 4s linear infinite}
@keyframes vspin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
.waveform{width:100%;height:72px;border-radius:6px;display:block;background:#06060f;border:1px solid #1a1a2e}
.prog{height:4px;background:#1a1a2e;border-radius:2px;overflow:hidden}
.progf{height:100%;border-radius:2px;transition:width .15s linear}
.progt{display:flex;justify-content:space-between;font-size:10px;color:#555;font-family:"Courier New",monospace;margin-top:2px}
.hcues{display:flex;gap:4px;align-items:center;flex-wrap:wrap}
.hc{width:30px;height:30px;border-radius:5px;border:1px solid var(--hcc,#555);background:rgba(0,0,0,0.3);color:var(--hcc,#555);font-size:11px;font-weight:800;cursor:pointer;transition:all .12s}
.hc.set{background:var(--hcc);color:#000;box-shadow:0 0 10px var(--hcc)}
.hc:hover{transform:scale(1.1)}
.cbtn{padding:5px 10px;border-radius:4px;border:1px solid #333;background:#111;color:#aaa;font-size:11px;font-weight:700;cursor:pointer;font-family:inherit}
.cbtn:hover{border-color:#00ffcc;color:#00ffcc}
.transport{display:flex;align-items:center;gap:7px}
.play{width:46px;height:46px;border-radius:50%;border:2px solid var(--pc,#00ffcc);background:rgba(0,0,0,0.4);color:var(--pc,#00ffcc);font-size:1.2rem;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s}
.play.on{background:var(--pc);color:#000;box-shadow:0 0 18px var(--pc)}
.play:hover{transform:scale(1.08)}
.lbtn{width:28px;height:28px;border-radius:4px;border:1px solid #222;background:#111;color:#555;font-size:11px;font-weight:700;cursor:pointer;transition:all .12s}
.lbtn:hover{border-color:#00ffcc;color:#00ffcc}
.loop-btn{padding:5px 10px;border-radius:4px;border:1px solid #222;background:#111;color:#555;font-size:11px;cursor:pointer;font-family:inherit}
.loop-btn.on{border-color:#00ffcc;color:#00ffcc;background:rgba(0,255,200,0.1)}
.eq-row{display:flex;align-items:center;gap:8px;padding:6px 0}
.knob-wrap{display:flex;flex-direction:column;align-items:center;gap:2px}
.knob{width:40px;height:40px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#2a2a3e,#0d0d1a);border:1px solid #2a2a3e;position:relative;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,0.5)}
.knob::after{content:'';position:absolute;top:5px;left:50%;transform:translateX(-50%);width:4px;height:4px;border-radius:50%;background:var(--kc,#00ffcc);box-shadow:0 0 6px var(--kc,#00ffcc)}
.knob-lbl{font-size:10px;color:#555;letter-spacing:1px}
.faders{display:flex;flex-direction:column;gap:6px}
.fg{display:flex;align-items:center;gap:8px}
.fl{font-size:10px;color:#555;min-width:40px;letter-spacing:.5px}
.fader{-webkit-appearance:none;appearance:none;flex:1;height:4px;border-radius:2px;background:#1a1a2e;outline:none;cursor:pointer}
.fader::-webkit-slider-thumb{-webkit-appearance:none;width:14px;height:14px;border-radius:50%;background:var(--fc,#00ffcc);cursor:pointer;box-shadow:0 0 6px var(--fc,#00ffcc)}
.fv{font-size:10px;color:#777;min-width:34px;text-align:right}
.center{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:16px 10px;background:#080810}
.xfw{width:100%;display:flex;flex-direction:column;gap:5px}
.xfl{display:flex;justify-content:space-between;align-items:center;font-size:11px;font-weight:700}
.xft{color:#444;font-size:9px;letter-spacing:1px}
.xfader{-webkit-appearance:none;appearance:none;width:100%;height:10px;border-radius:5px;background:linear-gradient(90deg,#00ffcc44,#1a1a2e,#ff6b3544);outline:none;cursor:pointer}
.xfader::-webkit-slider-thumb{-webkit-appearance:none;width:22px;height:22px;border-radius:5px;background:#e0eaf0;border:2px solid #aaa;cursor:grab;box-shadow:0 2px 8px #000}
.xfc{align-self:center;padding:4px 12px;border-radius:4px;border:1px solid #333;background:#111;color:#666;font-size:10px;cursor:pointer;font-family:inherit}
.xfc:hover{border-color:#00ffcc;color:#00ffcc}
.mvol{width:100%;display:flex;flex-direction:column;gap:5px}
.recl{display:flex;align-items:center;gap:6px;font-size:11px;font-weight:800;color:#ff3366;letter-spacing:2px}
.recdot{width:8px;height:8px;border-radius:50%;background:#ff3366;box-shadow:0 0 8px #ff3366;animation:blink 1s ease-in-out infinite}
@keyframes blink{0%,100%{opacity:1}50%{opacity:.15}}
.lib{background:#08080f;border-top:2px solid #1a1a2e;padding:12px 16px}
.libhd{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;gap:10px}
.libttl{font-size:13px;font-weight:800;color:#ffa726}
.libsearch{background:#111;border:1px solid #222;border-radius:6px;color:#ccc;font-size:11px;padding:5px 10px;outline:none;width:200px;font-family:inherit}
.libsearch:focus{border-color:#00ffcc}
.libfilters{display:flex;gap:4px;flex-wrap:wrap;margin-bottom:8px}
.ff{padding:4px 13px;border-radius:20px;border:1px solid #1e2330;background:transparent;color:#4a6070;font-size:11px;font-weight:700;cursor:pointer;font-family:inherit;transition:all .13s}
.ff:hover{border-color:#00ffcc;color:#00ffcc}
.ff.on{background:rgba(0,255,200,0.12);border-color:#00ffcc;color:#00ffcc;box-shadow:0 0 8px rgba(0,255,200,0.15)}
.librows{max-height:130px;overflow-y:auto}
.librow{display:flex;align-items:center;justify-content:space-between;padding:6px 8px;border-radius:5px;gap:8px;transition:background .12s}
.librow:hover{background:rgba(255,255,255,0.04)}
.libname{font-size:12px;font-weight:600;color:#c0d0e0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.libmeta{font-size:10px;color:#555;display:flex;gap:5px}
.libtag{padding:1px 5px;border-radius:3px;background:#1a1a2e;color:#ff8800;font-size:9px;font-weight:700;text-transform:uppercase}
.libbtns{display:flex;gap:4px;flex-shrink:0}
.liba,.libb{width:30px;height:30px;border-radius:5px;border:none;font-size:12px;font-weight:800;cursor:pointer;transition:all .12s}
.liba{background:rgba(0,255,200,0.15);color:#00ffcc}
.liba:hover{background:#00ffcc;color:#000}
.libb{background:rgba(255,107,53,0.15);color:#ff6b35}
.libb:hover{background:#ff6b35;color:#000}
.libempty{padding:18px;text-align:center;color:#333;font-size:11px}
</style></head>
<body>
<div class="dj">
  <div class="topbar">
    <div class="logo">&#127927; DJ<em>Studio</em></div>
    <div class="acts">
      <button class="btn sync" onclick="syncBPM()">&#10231; SYNC</button>
      <button class="btn mst" id="mstbtn" onclick="toggleMaster()">MASTER: A</button>
      <button class="btn rec" id="recbtn" onclick="toggleRec()">&#9210; REC</button>
    </div>
  </div>
  <div class="main">
    <!-- DECK A -->
    <div class="deck">
      <div class="dkhd">
        <div class="letter" style="color:#00ffcc">A</div>
        <div style="flex:1;min-width:0">
          <div class="tname" id="tnA">Midnight Drive</div>
          <div class="tmeta">
            <span class="badge" id="bpmA">128 BPM</span>
            <span class="badge" style="border-color:#ffd700;color:#ffd700">Am</span>
            <span class="badge mstbadge" id="mstA">MASTER</span>
          </div>
        </div>
      </div>
      <div class="turntable-wrap">
        <div class="platter-outer">
          <div class="vinyl spin" id="vinA">
            <svg width="160" height="160" viewBox="0 0 160 160" style="position:absolute;top:0;left:0">
              <circle cx="80" cy="80" r="75" fill="#0d0d14" stroke="rgba(255,255,255,0.04)" stroke-width="1"/>
              <circle cx="80" cy="80" r="70" fill="none" stroke="rgba(255,255,255,0.03)" stroke-width="1"/>
              <circle cx="80" cy="80" r="64" fill="none" stroke="rgba(255,255,255,0.03)" stroke-width="1"/>
              <circle cx="80" cy="80" r="58" fill="none" stroke="rgba(255,255,255,0.03)" stroke-width="1"/>
              <circle cx="80" cy="80" r="52" fill="none" stroke="rgba(255,255,255,0.03)" stroke-width="1"/>
              <circle cx="80" cy="80" r="28" fill="#00ffcc"/>
              <text x="80" y="76" text-anchor="middle" fill="#000" font-size="7" font-weight="800" font-family="Courier New">STREAM</text>
              <text x="80" y="85" text-anchor="middle" fill="#000" font-size="7" font-weight="800" font-family="Courier New">PIREX</text>
              <circle cx="80" cy="80" r="4" fill="#111" stroke="#333" stroke-width="1"/>
            </svg>
          </div>
        </div>
        <svg width="90" height="90" style="position:absolute;top:2px;right:4px;pointer-events:none">
          <line x1="75" y1="5" x2="30" y2="70" stroke="#888" stroke-width="2.5" stroke-linecap="round"/>
          <circle cx="75" cy="5" r="6" fill="#444" stroke="#666" stroke-width="1"/>
          <circle cx="20" cy="80" r="4" fill="#00ffcc"/>
        </svg>
      </div>
      <canvas class="waveform" id="wfA" width="400" height="72"></canvas>
      <div class="prog"><div class="progf" id="pfA" style="width:0%;background:#00ffcc"></div></div>
      <div class="progt"><span id="ctA">0:00</span><span>-3:48</span></div>
      <div class="hcues">
        <button class="hc set" style="--hcc:#ff4466">1</button>
        <button class="hc" style="--hcc:#00aaff">2</button>
        <button class="hc set" style="--hcc:#00ff88">3</button>
        <button class="hc" style="--hcc:#ff8800">4</button>
        <button class="cbtn">CUE</button>
        <button class="cbtn">&#9664;CUE</button>
      </div>
      <div class="transport">
        <button class="play" id="playA" style="--pc:#00ffcc" onclick="togglePlay('A')">&#9654;</button>
        <button class="loop-btn" id="loopA" onclick="this.classList.toggle('on')">&#128260; LOOP</button>
        <button class="lbtn">1</button><button class="lbtn">2</button><button class="lbtn">4</button><button class="lbtn">8</button>
      </div>
      <div class="eq-row">
        <div class="knob-wrap"><div class="knob" style="transform:rotate(-30deg);--kc:#00ffcc"></div><span class="knob-lbl">HI</span></div>
        <div class="knob-wrap"><div class="knob" style="transform:rotate(0deg);--kc:#00ffcc"></div><span class="knob-lbl">MID</span></div>
        <div class="knob-wrap"><div class="knob" style="transform:rotate(25deg);--kc:#00ffcc"></div><span class="knob-lbl">LOW</span></div>
        <canvas id="vuA" width="20" height="110"></canvas>
      </div>
      <div class="faders">
        <div class="fg"><label class="fl">VOL</label><input type="range" class="fader" min="0" max="150" value="100" style="--fc:#00ffcc" oninput="this.nextElementSibling.textContent=this.value+'%'"><span class="fv">100%</span></div>
        <div class="fg"><label class="fl">PITCH</label><input type="range" class="fader" min="85" max="115" value="100" style="--fc:#00ffcc" oninput="this.nextElementSibling.textContent=((this.value-100)).toFixed(1)+'%'"><span class="fv">0.0%</span></div>
      </div>
    </div>
    <!-- CENTER -->
    <div class="center">
      <div class="xfw">
        <div class="xfl"><span style="color:#00ffcc">A</span><span class="xft">CROSSFADER</span><span style="color:#ff6b35">B</span></div>
        <input type="range" class="xfader" min="0" max="100" value="50">
        <button class="xfc" onclick="document.querySelector('.xfader').value=50">&#8859; Center</button>
      </div>
      <div class="mvol">
        <label class="fl" style="color:#fff;min-width:0;font-size:10px;text-align:center">MASTER</label>
        <div class="fg"><input type="range" class="fader" min="0" max="150" value="100" style="--fc:#fff" oninput="this.nextElementSibling.textContent=this.value+'%'"><span class="fv">100%</span></div>
      </div>
      <div class="recl" id="recl" style="display:none"><span class="recdot"></span>REC</div>
      <div style="font-size:10px;color:#333;text-align:center;line-height:1.8">
        <div id="syncinfo">BPM sync ready</div>
        <div style="color:#1e2330;font-size:9px;margin-top:4px">StreamPireX DJ Studio</div>
      </div>
    </div>
    <!-- DECK B -->
    <div class="deck">
      <div class="dkhd">
        <div class="letter" style="color:#ff6b35">B</div>
        <div style="flex:1;min-width:0">
          <div class="tname" id="tnB">City Lights Remix</div>
          <div class="tmeta">
            <span class="badge" id="bpmB">135 BPM</span>
            <span class="badge" style="border-color:#ffd700;color:#ffd700">Cm</span>
            <span class="badge mstbadge" id="mstB" style="display:none">MASTER</span>
          </div>
        </div>
      </div>
      <div class="turntable-wrap">
        <div class="platter-outer">
          <div class="vinyl slow" id="vinB">
            <svg width="160" height="160" viewBox="0 0 160 160" style="position:absolute;top:0;left:0">
              <circle cx="80" cy="80" r="75" fill="#0d0d14" stroke="rgba(255,255,255,0.04)" stroke-width="1"/>
              <circle cx="80" cy="80" r="70" fill="none" stroke="rgba(255,255,255,0.03)" stroke-width="1"/>
              <circle cx="80" cy="80" r="64" fill="none" stroke="rgba(255,255,255,0.03)" stroke-width="1"/>
              <circle cx="80" cy="80" r="28" fill="#ff6b35"/>
              <text x="80" y="76" text-anchor="middle" fill="#000" font-size="7" font-weight="800" font-family="Courier New">STREAM</text>
              <text x="80" y="85" text-anchor="middle" fill="#000" font-size="7" font-weight="800" font-family="Courier New">PIREX</text>
              <circle cx="80" cy="80" r="4" fill="#111" stroke="#333" stroke-width="1"/>
            </svg>
          </div>
        </div>
        <svg width="90" height="90" style="position:absolute;top:2px;right:4px;pointer-events:none">
          <line x1="75" y1="5" x2="32" y2="68" stroke="#888" stroke-width="2.5" stroke-linecap="round"/>
          <circle cx="75" cy="5" r="6" fill="#444" stroke="#666" stroke-width="1"/>
          <circle cx="22" cy="78" r="4" fill="#ff6b35"/>
        </svg>
      </div>
      <canvas class="waveform" id="wfB" width="400" height="72"></canvas>
      <div class="prog"><div class="progf" id="pfB" style="width:0%;background:#ff6b35"></div></div>
      <div class="progt"><span id="ctB">0:00</span><span>-4:12</span></div>
      <div class="hcues">
        <button class="hc" style="--hcc:#ff4466">1</button>
        <button class="hc set" style="--hcc:#00aaff">2</button>
        <button class="hc" style="--hcc:#00ff88">3</button>
        <button class="hc set" style="--hcc:#ff8800">4</button>
        <button class="cbtn">CUE</button>
        <button class="cbtn">&#9664;CUE</button>
      </div>
      <div class="transport">
        <button class="play" id="playB" style="--pc:#ff6b35" onclick="togglePlay('B')">&#9654;</button>
        <button class="loop-btn" id="loopB" onclick="this.classList.toggle('on')">&#128260; LOOP</button>
        <button class="lbtn">1</button><button class="lbtn">2</button><button class="lbtn">4</button><button class="lbtn">8</button>
      </div>
      <div class="eq-row">
        <div class="knob-wrap"><div class="knob" style="transform:rotate(15deg);--kc:#ff6b35"></div><span class="knob-lbl">HI</span></div>
        <div class="knob-wrap"><div class="knob" style="transform:rotate(-20deg);--kc:#ff6b35"></div><span class="knob-lbl">MID</span></div>
        <div class="knob-wrap"><div class="knob" style="transform:rotate(35deg);--kc:#ff6b35"></div><span class="knob-lbl">LOW</span></div>
        <canvas id="vuB" width="20" height="110"></canvas>
      </div>
      <div class="faders">
        <div class="fg"><label class="fl">VOL</label><input type="range" class="fader" min="0" max="150" value="85" style="--fc:#ff6b35" oninput="this.nextElementSibling.textContent=this.value+'%'"><span class="fv">85%</span></div>
        <div class="fg"><label class="fl">PITCH</label><input type="range" class="fader" min="85" max="115" value="102" style="--fc:#ff6b35" oninput="this.nextElementSibling.textContent=((this.value-100)).toFixed(1)+'%'"><span class="fv">+2.0%</span></div>
      </div>
    </div>
  </div>
  <div class="lib">
    <div class="libhd"><span class="libttl">&#128194; Library</span><input class="libsearch" placeholder="Search..." oninput="filterLib(this.value)"></div>
    <div class="libfilters" id="libf">
      <button class="ff on" onclick="setFilter('all',this)">All</button>
      <button class="ff" onclick="setFilter('beat',this)">Beat</button>
      <button class="ff" onclick="setFilter('acapella',this)">Acapella</button>
      <button class="ff" onclick="setFilter('stem',this)">Stem</button>
      <button class="ff" onclick="setFilter('remix',this)">Remix</button>
    </div>
    <div class="librows" id="librows"></div>
  </div>
</div>
<script>
const S={A:{playing:false,prog:0,bpm:128,title:'Midnight Drive'},B:{playing:false,prog:0,bpm:135,title:'City Lights Remix'},master:'A',rec:false,lf:'all'};
const TRACKS=[{id:1,title:'Midnight Drive',type:'beat',bpm:128,key:'Am'},{id:2,title:'City Lights Remix',type:'remix',bpm:135,key:'Cm'},{id:3,title:'Deep Frequency',type:'beat',bpm:132,key:'Gm'},{id:4,title:'Vocal Take Bridge',type:'acapella',bpm:null,key:'Em'},{id:5,title:'Bass Stem 01',type:'stem',bpm:128,key:null}];
function togglePlay(id){S[id].playing=!S[id].playing;const btn=document.getElementById('play'+id);const vin=document.getElementById('vin'+id);btn.textContent=S[id].playing?'\u23F8':'\u25B6';btn.classList.toggle('on',S[id].playing);vin.className='vinyl'+(S[id].playing?' spin':S[id].prog>0?' slow':'');}
function toggleMaster(){S.master=S.master==='A'?'B':'A';document.getElementById('mstbtn').textContent='MASTER: '+S.master;document.getElementById('mstA').style.display=S.master==='A'?'inline':'none';document.getElementById('mstB').style.display=S.master==='B'?'inline':'none';}
function toggleRec(){S.rec=!S.rec;const b=document.getElementById('recbtn');b.textContent=S.rec?'\u23F9 STOP':'\u23FA REC';b.classList.toggle('on',S.rec);document.getElementById('recl').style.display=S.rec?'flex':'none';}
function syncBPM(){document.getElementById('syncinfo').textContent='Synced at '+S[S.master].bpm+' BPM';setTimeout(()=>document.getElementById('syncinfo').textContent='BPM sync ready',2500);}
function setFilter(f,btn){S.lf=f;document.querySelectorAll('.ff').forEach(b=>b.classList.remove('on'));btn.classList.add('on');renderLib();}
function filterLib(q){renderLib(q);}
function renderLib(q=''){const rows=document.getElementById('librows');const tracks=TRACKS.filter(t=>{const tm=S.lf==='all'||t.type===S.lf;const sm=!q||t.title.toLowerCase().includes(q.toLowerCase());return tm&&sm;});if(!tracks.length){rows.innerHTML='<div class="libempty">No tracks match</div>';return;}rows.innerHTML=tracks.map(t=>`<div class="librow"><div style="flex:1;min-width:0"><div class="libname">${t.title}</div><div class="libmeta"><span class="libtag">${t.type}</span>${t.bpm?`<span>${t.bpm} BPM</span>`:''}</div></div><div class="libbtns"><button class="liba" onclick="loadDeck('A','${t.title}',${t.bpm||128})">A</button><button class="libb" onclick="loadDeck('B','${t.title}',${t.bpm||128})">B</button></div></div>`).join('');}
function loadDeck(id,title,bpm){S[id].title=title;S[id].bpm=bpm;S[id].prog=0;document.getElementById('tn'+id).textContent=title;document.getElementById('bpm'+id).textContent=bpm+' BPM';if(!S[id].playing)togglePlay(id);}
renderLib();
function drawWave(id,color,playing){const c=document.getElementById('wf'+id);const ctx=c.getContext('2d');const w=c.width,h=c.height;ctx.fillStyle='#06060f';ctx.fillRect(0,0,w,h);const n=90;for(let i=0;i<n;i++){const active=playing&&Math.random()>.35;const bh=active?Math.random()*h*.85+3:Math.random()*h*.15+2;ctx.fillStyle=active?color:'#1a1a2e';ctx.globalAlpha=active?0.6+Math.random()*.4:0.4;ctx.fillRect(i*(w/n),(h-bh)/2,(w/n)-1,bh);}ctx.globalAlpha=1;const p=S[id].prog;ctx.strokeStyle='rgba(255,255,255,0.85)';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(p*w,0);ctx.lineTo(p*w,h);ctx.stroke();}
function drawVU(id,color,playing){const c=document.getElementById('vu'+id);if(!c)return;const ctx=c.getContext('2d');const w=c.width,h=c.height;ctx.clearRect(0,0,w,h);const n=22,sh=h/n-1;const active=playing?Math.round(Math.random()*n*.75+2):1;for(let i=0;i<n;i++){const y=h-(i+1)*(h/n);ctx.fillStyle=i>=active?'#111122':i>18?'#ff3366':i>15?'#ffcc00':color;ctx.fillRect(1,y,w-2,sh);}}
let prA=0.2,prB=0.08;
setInterval(()=>{if(S.A.playing){prA=(prA+0.0009)%1;S.A.prog=prA;}if(S.B.playing){prB=(prB+0.0011)%1;S.B.prog=prB;}document.getElementById('pfA').style.width=(prA*100)+'%';document.getElementById('pfB').style.width=(prB*100)+'%';const tA=Math.floor(prA*228);document.getElementById('ctA').textContent=Math.floor(tA/60)+':'+(tA%60<10?'0':'')+tA%60;const tB=Math.floor(prB*252);document.getElementById('ctB').textContent=Math.floor(tB/60)+':'+(tB%60<10?'0':'')+tB%60;drawWave('A','#00ffcc',S.A.playing);drawWave('B','#ff6b35',S.B.playing);drawVU('A','#00ffcc',S.A.playing);drawVU('B','#ff6b35',S.B.playing);},80);
// Auto-start deck A
setTimeout(()=>togglePlay('A'),400);
</script>
</body></html>"""

# ============================================================================
# 2. BEAT MAKER DAW  (from approved document #1 — document index 1)
# ============================================================================
BEAT_MAKER_HTML = r"""<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<style>
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:100%;height:100vh;background:#0d0f14;font-family:'Inter',system-ui,sans-serif;color:#c8d0d8;overflow:hidden;user-select:none}
.topbar{display:flex;align-items:center;gap:0;background:#141820;border-bottom:1px solid #1e2530;height:36px;padding:0 8px;flex-shrink:0}
.collab-btn{display:flex;flex-direction:column;align-items:center;padding:0 10px;font-size:9px;color:#4a6070;letter-spacing:.3px;border-right:1px solid #1e2530;height:36px;justify-content:center;gap:2px}
.session-btns{display:flex;gap:6px;padding:0 10px;border-right:1px solid #1e2530;align-items:center;height:36px}
.sbtn{padding:5px 12px;border-radius:5px;font-size:11px;font-weight:700;cursor:pointer;border:none;font-family:inherit}
.sbtn.start{background:#00ffc8;color:#041014}
.sbtn.join{background:#1e2530;color:#8090a0;border:1px solid #2a3040}
.nav-tabs{display:flex;align-items:center;height:36px;overflow-x:auto;scrollbar-width:none;flex:1}
.nav-tabs::-webkit-scrollbar{display:none}
.ntab{padding:0 12px;height:36px;display:flex;align-items:center;gap:5px;font-size:11px;color:#4a6070;cursor:pointer;border-right:1px solid #1e2530;white-space:nowrap;transition:all .12s;flex-shrink:0}
.ntab:hover{color:#8090a0;background:rgba(255,255,255,.03)}
.ntab.on{color:#00ffc8;background:rgba(0,255,200,.06)}
.export-btn{margin-left:auto;padding:5px 14px;border-radius:5px;background:#00ffc8;color:#041014;font-size:11px;font-weight:800;border:none;cursor:pointer;flex-shrink:0}
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
.subtabs{display:flex;align-items:center;gap:2px;background:#0d0f14;border-bottom:1px solid #1e2530;padding:5px 10px;flex-shrink:0;overflow-x:auto;scrollbar-width:none}
.subtabs::-webkit-scrollbar{display:none}
.stab{padding:5px 12px;border-radius:6px;font-size:11px;font-weight:600;color:#4a6070;cursor:pointer;border:none;background:transparent;white-space:nowrap;transition:all .12s;flex-shrink:0}
.stab:hover{color:#8090a0}
.stab.on{background:rgba(0,255,200,.12);color:#00ffc8;border:1px solid rgba(0,255,200,.2)}
.view-btns{display:flex;gap:4px;margin-left:auto;flex-shrink:0}
.vbtn{padding:4px 10px;border-radius:5px;background:#1e2530;border:1px solid #2a3040;color:#6a8090;font-size:10px;font-weight:700;cursor:pointer}
.vbtn.on{background:rgba(0,255,200,.12);border-color:#00ffc8;color:#00ffc8}
.main{display:grid;grid-template-columns:1fr 320px;flex:1;overflow:hidden;min-height:0}
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
.piano-wrap{flex:1;padding:8px 14px 10px;display:flex;align-items:flex-end;gap:0;overflow-x:auto;scrollbar-width:thin;scrollbar-color:#1e2530 transparent;position:relative}
.wkey{width:32px;min-width:32px;height:90px;background:#d8dde8;border-radius:0 0 5px 5px;border:1px solid #9aa0a8;cursor:pointer;position:relative;transition:background .08s;flex-shrink:0}
.wkey:hover,.wkey.on{background:#00ffc8}
.wkey-lbl{position:absolute;bottom:6px;left:50%;transform:translateX(-50%);font-size:8px;color:#6a8090;font-weight:700;font-family:'Courier New',monospace}
.wkey.on .wkey-lbl{color:#041014}
.bkey{width:20px;min-width:20px;height:56px;background:#1a1e28;border-radius:0 0 4px 4px;border:1px solid #0a0c10;cursor:pointer;position:absolute;z-index:2;transition:background .08s}
.bkey:hover,.bkey.on{background:#00ffc8}
.arrange-section{flex-shrink:0;border-top:1px solid #1e2530;background:#080a0e}
.arrange-hd{display:flex;align-items:center;gap:8px;padding:5px 12px;border-bottom:1px solid #1e2530;height:28px}
.arrange-lbl{font-size:9px;font-weight:700;color:#4a6070;letter-spacing:1px}
.arrange-tracks{overflow:hidden}
.atrack{display:flex;align-items:center;height:26px;border-bottom:1px solid #0d1018}
.atrack-lbl{font-size:8px;color:#4a6070;width:50px;padding:0 8px;flex-shrink:0;letter-spacing:.3px}
.atrack-lane{flex:1;height:100%;position:relative;background:repeating-linear-gradient(90deg,transparent,transparent 49px,#111620 49px,#111620 50px)}
.aclip{position:absolute;top:3px;height:20px;border-radius:3px;display:flex;align-items:center;padding:0 6px;font-size:7px;font-weight:700;cursor:pointer}
.playhead{position:absolute;top:0;bottom:0;width:1.5px;background:#00ffc8;z-index:10;box-shadow:0 0 6px #00ffc8}
</style>
</head>
<body style="display:flex;flex-direction:column;height:100vh">
<div class="topbar">
  <div class="collab-btn">&#129309;<span>Collab</span></div>
  <div class="session-btns">
    <button class="sbtn start">+ Start Session</button>
    <button class="sbtn join">Join Session</button>
  </div>
  <div class="nav-tabs">
    <div class="ntab"><span class="ico">&#8862;</span> Arrange</div>
    <div class="ntab"><span class="ico">&#9000;</span> Console</div>
    <div class="ntab"><span class="ico">&#127929;</span> Piano Roll</div>
    <div class="ntab"><span class="ico">&#127929;</span> Piano</div>
    <div class="ntab on"><span class="ico">&#129345;</span> Sampler</div>
    <div class="ntab"><span class="ico">&#127935;</span> AI Mix</div>
    <div class="ntab"><span class="ico">&#127928;</span> Synth</div>
    <div class="ntab"><span class="ico">&#129345;</span> Drum Design</div>
    <div class="ntab"><span class="ico">&#128295;</span> Instr Build</div>
    <div class="ntab"><span class="ico">&#127962;</span> Multiband</div>
    <div class="ntab"><span class="ico">&#127925;</span> Key Finder</div>
    <div class="ntab"><span class="ico">&#127908;</span> Vocal</div>
    <div class="ntab"><span class="ico">&#9935;</span> FX Chain</div>
    <div class="ntab"><span class="ico">&#10024;</span> Mastering</div>
  </div>
  <button class="export-btn">&#11014; Export</button>
</div>
<div class="transport">
  <button class="tport-btn tport-stop">&#9632;</button>
  <button class="tport-btn tport-play" id="playBtn" onclick="togglePlay()">&#9654;</button>
  <button class="tport-btn tport-rec">&#9210;</button>
  <div class="divider"></div>
  <div class="bpm-wrap">
    <span class="bpm-lbl">BPM</span>
    <span class="bpm-val" id="bpmVal">140</span>
    <div class="bpm-ctrl">
      <button class="bpm-arrow" onclick="changeBPM(1)">&#9650;</button>
      <button class="bpm-arrow" onclick="changeBPM(-1)">&#9660;</button>
    </div>
  </div>
  <div class="divider"></div>
  <button class="tap-btn">TAP</button>
  <div class="divider"></div>
  <div class="swing-wrap"><div class="swing-knob"></div><span>Swing</span><span style="color:#00ffc8;font-family:'Courier New',monospace;font-size:11px">0%</span></div>
  <div class="steps-wrap">
    <span>Steps:</span>
    <button class="step-btn">8</button>
    <button class="step-btn on">16</button>
    <button class="step-btn">32</button>
    <button class="step-btn">64</button>
  </div>
</div>
<div class="subtabs">
  <button class="stab">&#127908; Sampler</button>
  <button class="stab">&#129345; Drum Kit</button>
  <button class="stab on">&#127929; Beat Maker</button>
  <button class="stab">&#127928; Chords</button>
  <button class="stab">&#128266; Sounds</button>
  <button class="stab">&#128260; Loops</button>
  <button class="stab">&#129302; AI Beats</button>
  <button class="stab">&#127908; Voice MIDI</button>
  <button class="stab">&#127925; Hum to Song</button>
  <button class="stab">&#127926; Text to Song</button>
  <button class="stab">&#128256; Stems</button>
  <div class="view-btns">
    <button class="vbtn on">&#8862; Split</button>
    <button class="vbtn">&#8865; Pads</button>
    <button class="vbtn">&#8801; Seq</button>
  </div>
</div>
<div class="main" style="flex:1;min-height:0">
  <div style="display:flex;flex-direction:column;overflow:hidden">
    <div class="pad-section" style="flex:1">
      <div class="pad-grid" id="padGrid"></div>
    </div>
    <div class="arrange-section" style="height:160px">
      <div class="arrange-hd">
        <span class="arrange-lbl">ARRANGEMENT VIEW</span>
        <span style="font-size:9px;color:#2a3040;margin-left:4px">All</span>
      </div>
      <div class="arrange-tracks" id="arrangeTracks"></div>
    </div>
  </div>
  <div class="instr-panel">
    <div class="instr-section">
      <div class="instr-lbl">Instrument</div>
      <div class="instr-grid">
        <button class="instr-btn on">&#127929; Piano</button>
        <button class="instr-btn">&#127927; Organ</button>
        <button class="instr-btn">&#9889; Synth Lead</button>
        <button class="instr-btn">&#127928; Synth Pad</button>
        <button class="instr-btn">&#127928; Bass</button>
        <button class="instr-btn">&#127931; Strings</button>
        <button class="instr-btn">&#9889; Electric Piano</button>
        <button class="instr-btn">&#127957; Pluck</button>
      </div>
    </div>
    <div class="oct-row">
      <span class="oct-lbl">OCTAVE</span>
      <button class="oct-btn" onclick="changeOct(-1)">&#8722;</button>
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
      <button style="padding:4px 10px;border-radius:5px;background:rgba(0,255,200,.1);border:1px solid rgba(0,255,200,.25);color:#00ffc8;font-size:10px;font-weight:700;cursor:pointer">&#127925; Sustain</button>
      <button style="padding:4px 10px;border-radius:5px;background:rgba(0,255,200,.15);border:1px solid #00ffc8;color:#00ffc8;font-size:10px;font-weight:700;cursor:pointer">Labels</button>
    </div>
    <div class="midi-bar">
      <div class="midi-badge">&#127929; MIDI: StudioRack</div>
      <div class="midi-hint">Keys: Z-M / Q-U &middot; Space: Sustain &middot; +/-: Octave</div>
      <div class="labels-badge">ON</div>
    </div>
    <div class="piano-wrap" id="pianoWrap"></div>
  </div>
</div>
<script>
const PAD_COLORS=['#00ffc8','#00aaff','#ff6b35','#ffd700','#a78bfa','#ff4466','#00ff88','#ff8800','#e040fb','#40c4ff','#69f0ae','#ff5722','#00ffc8','#ff9800','#7c4dff','#f06292'];
const PAD_NAMES=['Kick 808','Snare','Hi-Hat','Open HH','Clap','Perc','Bass','Sub Drop','Chord A','Chord B','Lead Mel','Arp 1','FX Rise','FX Fall','Pad Atm','Noise'];
const LOADED=[0,1,2,4,6,8,9,10,12,14];
const grid=document.getElementById('padGrid');
const pads=PAD_NAMES.map((name,i)=>{
  const p=document.createElement('div');
  p.className='pad'+(LOADED.includes(i)?' loaded':'');
  p.style.setProperty('--pc',PAD_COLORS[i]);
  p.innerHTML=`<div class="pad-num">${i+1}</div><div class="pad-active-dot"></div><div class="pad-label">${name}</div><div class="pad-sub">${LOADED.includes(i)?'\u25CF\u25CF\u25CF\u25CF\u25CF\u25CF':'Empty'}</div>`;
  p.onclick=()=>{p.classList.add('hit');setTimeout(()=>p.classList.remove('hit'),100);};
  grid.appendChild(p);return p;
});
const TRACK_DATA=[
  {lbl:'KICK',color:'#00ffc8',clips:[{l:0,w:120},{l:200,w:80},{l:340,w:120}]},
  {lbl:'SNARE',color:'#ff6b35',clips:[{l:60,w:60},{l:280,w:40}]},
  {lbl:'HI-HAT',color:'#ffd700',clips:[{l:0,w:200},{l:220,w:160}]},
  {lbl:'BASS',color:'#00aaff',clips:[{l:80,w:100},{l:300,w:80}]},
  {lbl:'CHORD',color:'#a78bfa',clips:[{l:0,w:160},{l:240,w:120}]},
  {lbl:'LEAD',color:'#ff4466',clips:[{l:120,w:80},{l:320,w:100}]},
  {lbl:'PAD',color:'#00ff88',clips:[{l:0,w:80},{l:280,w:60}]},
];
const at=document.getElementById('arrangeTracks');
TRACK_DATA.forEach(t=>{
  const row=document.createElement('div');row.className='atrack';
  const lbl=document.createElement('div');lbl.className='atrack-lbl';lbl.textContent=t.lbl;
  const lane=document.createElement('div');lane.className='atrack-lane';
  t.clips.forEach(c=>{
    const clip=document.createElement('div');clip.className='aclip';
    clip.style.cssText=`left:${c.l+54}px;width:${c.w}px;background:${t.color}22;border:1px solid ${t.color}44;color:${t.color}`;
    clip.textContent=t.lbl;lane.appendChild(clip);
  });
  row.appendChild(lbl);row.appendChild(lane);at.appendChild(row);
});
const pianoWrap=document.getElementById('pianoWrap');
const NOTES=['C','D','E','F','G','A','B'];
const BLACK_AFTER=[0,1,3,4,5];
let xPos=0;
for(let oct=4;oct<=6;oct++){
  NOTES.forEach((note,ni)=>{
    const wk=document.createElement('div');wk.className='wkey';
    const noteLabel=document.createElement('div');noteLabel.className='wkey-lbl';
    noteLabel.textContent=note+oct;wk.appendChild(noteLabel);
    wk.onclick=()=>{wk.classList.add('on');setTimeout(()=>wk.classList.remove('on'),200);};
    pianoWrap.appendChild(wk);
    if(BLACK_AFTER.includes(ni)){
      const bk=document.createElement('div');bk.className='bkey';
      bk.style.cssText=`left:${xPos+22}px;top:0`;
      bk.onclick=e=>{e.stopPropagation();bk.classList.add('on');setTimeout(()=>bk.classList.remove('on'),200);};
      pianoWrap.appendChild(bk);
    }
    xPos+=32;
  });
}
pianoWrap.style.position='relative';
let bpm=140;
function changeBPM(d){bpm=Math.max(60,Math.min(200,bpm+d));document.getElementById('bpmVal').textContent=bpm;if(isPlaying)resetInterval();}
const OCTS=['C2','C3','C4','C5','C6'];let octIdx=2;
function changeOct(d){octIdx=Math.max(0,Math.min(4,octIdx+d));document.getElementById('octVal').textContent=OCTS[octIdx];}
let isPlaying=false,step=0,interval=null;
const SEQ=[[1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0],[0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0],[1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,1],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0]];
let phX=54;
function tick(){
  phX+=2.5;if(phX>600)phX=54;
  SEQ.forEach((row,ri)=>{
    if(row[step%16]){const padIdx=ri===0?0:ri===1?1:ri===2?2:6;pads[padIdx].classList.add('hit');setTimeout(()=>pads[padIdx].classList.remove('hit'),80);}
  });
  if(Math.random()>0.3){pads[2].classList.add('hit');setTimeout(()=>pads[2].classList.remove('hit'),60);}
  step=(step+1)%16;
  document.querySelectorAll('.atrack-lane').forEach(lane=>{
    let ph=lane.querySelector('.playhead');
    if(!ph){ph=document.createElement('div');ph.className='playhead';lane.appendChild(ph);}
    ph.style.left=phX+'px';
  });
}
function resetInterval(){clearInterval(interval);interval=setInterval(tick,60000/bpm/4);}
function togglePlay(){
  isPlaying=!isPlaying;
  const btn=document.getElementById('playBtn');
  if(isPlaying){btn.textContent='\u23F8';btn.style.background='#ff6b35';resetInterval();}
  else{btn.textContent='\u25B6';btn.style.background='#00ffc8';clearInterval(interval);}
}
document.querySelectorAll('.instr-btn').forEach(b=>{b.onclick=()=>{document.querySelectorAll('.instr-btn').forEach(x=>x.classList.remove('on'));b.classList.add('on');};});
document.querySelectorAll('.ntab').forEach(b=>{b.onclick=()=>{document.querySelectorAll('.ntab').forEach(x=>x.classList.remove('on'));b.classList.add('on');};});
document.querySelectorAll('.stab').forEach(b=>{b.onclick=()=>{document.querySelectorAll('.stab').forEach(x=>x.classList.remove('on'));b.classList.add('on');};});
setTimeout(togglePlay,400);
</script>
</body></html>"""

# ============================================================================
# 3. PODCAST STUDIO  (from document #3)
# ============================================================================
PODCAST_HTML = r"""<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<style>
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:100%;background:#050709;font-family:'Inter',system-ui,sans-serif;color:#e0eaf0}
.root{width:100%;background:#050709;overflow:hidden}
.hdr{display:flex;align-items:center;justify-content:space-between;padding:10px 18px;background:#07090f;border-bottom:1px solid rgba(0,255,200,0.08);flex-wrap:wrap;gap:8px}
.logo{font-size:13px;font-weight:800;color:#00ffc8;letter-spacing:2px}
.hr{display:flex;align-items:center;gap:10px}
.rp{display:flex;align-items:center;gap:6px;padding:5px 12px;border-radius:20px;border:2px solid #ff2d55;background:rgba(255,45,85,0.12);color:#ff2d55;font-size:11px;font-weight:800}
.rd{width:8px;height:8px;border-radius:50%;background:#ff2d55;animation:bl 1s ease-in-out infinite}
@keyframes bl{0%,100%{opacity:1}50%{opacity:.15}}
.tm{font-family:'Courier New',monospace;font-size:15px;color:#ff2d55;letter-spacing:2px;min-width:48px}
.inv{padding:5px 12px;border-radius:8px;border:1px solid rgba(0,180,255,0.3);background:rgba(0,180,255,0.08);color:#00b4ff;font-size:10px;font-weight:700}
.main{display:grid;grid-template-columns:1fr 200px}
.va{padding:14px;display:flex;flex-direction:column;gap:10px}
.tiles{display:grid;grid-template-columns:1fr 1fr;gap:10px;height:240px}
.tile{position:relative;border-radius:10px;overflow:hidden;border:1px solid rgba(255,255,255,0.06);background:#0d1117}
.tile.h{border-color:rgba(0,255,200,0.2)}.tile.g{border-color:rgba(255,102,0,0.2)}
.tile::after{content:'';position:absolute;inset:0;background:repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.06) 2px,rgba(0,0,0,0.06) 4px);pointer-events:none;z-index:2}
@keyframes gT{0%,100%{box-shadow:0 0 0 2px rgba(0,255,200,0.1)}50%{box-shadow:0 0 0 3px rgba(0,255,200,0.85),0 0 22px rgba(0,255,200,0.3)}}
@keyframes gO{0%,100%{box-shadow:0 0 0 2px rgba(255,102,0,0.1)}50%{box-shadow:0 0 0 3px rgba(255,102,0,0.85),0 0 22px rgba(255,102,0,0.3)}}
.tile.sh{animation:gT .5s ease-in-out infinite}.tile.sg{animation:gO .5s ease-in-out infinite}
.timg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center 5%;display:block;z-index:0}
.tov{position:absolute;inset:0;background:linear-gradient(180deg,transparent 42%,rgba(0,0,0,0.92) 100%);z-index:1}
.wf{position:absolute;bottom:28px;left:0;right:0;height:22px;z-index:3;padding:0 8px;display:flex;align-items:center;gap:2px}
.wb{border-radius:1px;width:3px;transition:height .07s ease}
.tl{position:absolute;bottom:0;left:0;right:0;padding:5px 9px;z-index:3}
.tn{font-size:11px;font-weight:700;color:#fff;text-shadow:0 1px 4px rgba(0,0,0,0.9)}
.chat{padding:0 14px 8px}
.cb{background:#0f1320;border-radius:8px;padding:8px 11px;margin-bottom:5px;border-left:2px solid #00ffc8;opacity:0;transform:translateY(4px);transition:opacity .25s ease,transform .25s ease}
.cb.show{opacity:1;transform:translateY(0)}.cb.gb{border-left-color:#ff6600}
.cn{font-weight:700;font-size:10px;margin-bottom:2px}.cn.h{color:#00ffc8}.cn.g{color:#ff6600}
.ct{color:#6a8090;line-height:1.5;font-size:10px}
.sbar{padding:4px 14px 10px;display:flex;align-items:center;gap:6px}
.sd{width:6px;height:6px;border-radius:50%;background:#00ffc8;box-shadow:0 0 6px #00ffc8;animation:bl 2s ease-in-out infinite}
.stxt{font-size:10px;color:#4a6070}
.rp2{background:#0a0c12;border-left:1px solid rgba(255,255,255,0.04);padding:14px;display:flex;flex-direction:column;gap:12px}
.rpl{font-size:9px;font-weight:700;color:#3a5060;letter-spacing:1px;text-transform:uppercase;margin-bottom:4px}
.vb{display:flex;align-items:center;gap:7px;padding:8px 12px;border-radius:9px;border:1px solid rgba(0,255,200,0.25);background:rgba(0,255,200,0.07);color:#00ffc8;font-size:10px;font-weight:700;cursor:pointer;width:100%;margin-bottom:5px;transition:all .15s;text-align:left}
.vb:hover{background:rgba(0,255,200,0.16);border-color:#00ffc8}
.vb.active{background:rgba(0,255,200,0.16);border-color:#00ffc8}
.vb.sc{border-color:rgba(0,180,255,0.25);background:rgba(0,180,255,0.07);color:#00b4ff}
.vb.mr{border-color:rgba(167,139,250,0.25);background:rgba(167,139,250,0.07);color:#a78bfa}
.res{display:flex;gap:4px;flex-wrap:wrap}
.rb{padding:3px 10px;border-radius:20px;border:1px solid #1e2330;background:transparent;color:#3a5060;font-size:9px;font-weight:700;cursor:pointer;transition:all .12s}
.rb.active{background:rgba(0,255,200,0.1);border-color:rgba(0,255,200,0.3);color:#00ffc8}
.lg{display:grid;grid-template-columns:1fr 1fr;gap:4px}
.lb2{display:flex;flex-direction:column;align-items:center;gap:2px;padding:6px 4px;border-radius:8px;border:1px solid #1e2330;background:rgba(255,255,255,0.02);cursor:pointer;transition:all .12s}
.lb2:hover{border-color:rgba(0,255,200,0.2)}.lb2.active{background:rgba(0,255,200,0.1);border-color:#00ffc8}
.li{font-size:13px}.ln{font-size:8px;font-weight:700;color:#3a5060;text-align:center}.lb2.active .ln{color:#00ffc8}
</style></head><body>
<div class="root">
  <div class="hdr">
    <div style="display:flex;align-items:center;gap:12px">
      <span class="logo">&#127897; PODCAST STUDIO</span>
      <span style="font-size:11px;color:#4a6070;padding:4px 10px;border:1px solid #1e2330;border-radius:6px">Ep. 42 &#8212; The Creator Economy</span>
    </div>
    <div class="hr">
      <div class="rp"><span class="rd"></span>REC</div>
      <div class="tm" id="tm">0:00</div>
      <div class="inv">&#128101; Invite (1/3)</div>
    </div>
  </div>
  <div class="main">
    <div class="va">
      <div class="tiles">
        <div class="tile h" id="ht">
          <div style="position:absolute;inset:0;background:linear-gradient(135deg,#0a1a20,#0d2030);display:flex;align-items:center;justify-content:center;font-size:48px;">&#128081;</div>
          <div class="tov"></div>
          <div class="wf" id="hw"></div>
          <div class="tl"><span class="tn">&#128081; Sophia (Host)</span></div>
        </div>
        <div class="tile g" id="gt">
          <div style="position:absolute;inset:0;background:linear-gradient(135deg,#1a0a05,#2a1005);display:flex;align-items:center;justify-content:center;font-size:48px;">&#127908;</div>
          <div class="tov"></div>
          <div class="wf" id="gw"></div>
          <div class="tl"><span class="tn">&#127908; Marcus (Guest)</span></div>
        </div>
      </div>
      <div class="chat" id="chat"></div>
      <div class="sbar"><div class="sd"></div><span class="stxt" id="stxt">&#127897; Recording &#8212; 2 participants connected</span></div>
    </div>
    <div class="rp2">
      <div>
        <div class="rpl">Camera</div>
        <button class="vb active" onclick="this.classList.toggle('active')">&#128249; Stop Camera</button>
        <button class="vb sc" onclick="this.classList.toggle('active')">&#128421; Share Screen</button>
        <button class="vb mr" onclick="this.classList.toggle('active')">&#129710; Mirror ON</button>
      </div>
      <div><div class="rpl">Resolution</div><div class="res"><button class="rb" onclick="document.querySelectorAll('.rb').forEach(b=>b.classList.remove('active'));this.classList.add('active')">480p</button><button class="rb active" onclick="document.querySelectorAll('.rb').forEach(b=>b.classList.remove('active'));this.classList.add('active')">720p</button><button class="rb" onclick="document.querySelectorAll('.rb').forEach(b=>b.classList.remove('active'));this.classList.add('active')">1080p</button><button class="rb" onclick="document.querySelectorAll('.rb').forEach(b=>b.classList.remove('active'));this.classList.add('active')">4K</button></div></div>
      <div>
        <div class="rpl">Layout</div>
        <div class="lg">
          <div class="lb2 active"><span class="li">&#127897;</span><span class="ln">Audio Only</span></div>
          <div class="lb2"><span class="li">&#128249;</span><span class="ln">Camera</span></div>
          <div class="lb2"><span class="li">&#128421;</span><span class="ln">Screen</span></div>
          <div class="lb2"><span class="li">&#127916;</span><span class="ln">PiP</span></div>
          <div class="lb2"><span class="li">&#128208;</span><span class="ln">Side/Side</span></div>
          <div class="lb2"><span class="li">&#8862;</span><span class="ln">All Cams</span></div>
        </div>
      </div>
    </div>
  </div>
</div>
<script>
const HC=['#00ffc8','#00e8b5'],GC=['#ff6600','#ff7a1a'];
let hS=true,gS=false,t=0;
function bw(id,colors,n){
  const c=document.getElementById(id);if(!c)return[];c.innerHTML='';
  return Array.from({length:n},()=>{
    const b=document.createElement('div');b.className='wb';
    b.style.cssText='height:2px;background:'+colors[0];c.appendChild(b);return b;
  });
}
const hB=bw('hw',HC,40),gB=bw('gw',GC,40);
setInterval(()=>{t++;const m=Math.floor(t/60),s=t%60;document.getElementById('tm').textContent=m+':'+(s<10?'0':'')+s;},1000);
setInterval(()=>{
  [hB,gB].forEach((bars,i)=>{
    const sp=i===0?hS:gS,col=i===0?HC:GC;
    bars.forEach((b,j)=>{
      if(sp){const v=Date.now()/160+j*0.4;b.style.height=Math.max(2,Math.abs(Math.sin(v)*16+Math.cos(v*1.6)*7+Math.random()*5))+'px';b.style.opacity='0.9';}
      else{b.style.height='2px';b.style.opacity='0.18';}
      b.style.background=col[j%col.length];
    });
  });
  document.getElementById('ht').className='tile h'+(hS?' sh':'');
  document.getElementById('gt').className='tile g'+(gS?' sg':'');
},80);
const LINES=[
  {s:'host',n:'Sophia',t:"Welcome to StreamPireX Podcast Studio — all-in-one creator platform."},
  {s:'guest',n:'Marcus',t:"Recording directly inside the platform. No OBS, no Zoom needed."},
  {s:'host',n:'Sophia',t:"Record, edit, distribute — all in one place. One login."},
  {s:'guest',n:'Marcus',t:"90% revenue to creators. YouTube takes 55%. StreamPireX takes 10%."},
  {s:'host',n:'Sophia',t:"The platform works for you, not the other way around."},
  {s:'guest',n:'Marcus',t:"DJ Mixer, beat maker, AI mastering — replaces my entire stack."},
  {s:'host',n:'Sophia',t:"One platform. 15 tools. 90% for creators. StreamPireX."},
  {s:'guest',n:'Marcus',t:"I'm fully sold. This changes everything for independent creators."},
];
let idx=0;const chat=document.getElementById('chat');
function next(){
  const line=LINES[idx++%LINES.length];
  hS=line.s==='host';gS=line.s==='guest';
  document.getElementById('stxt').textContent='\uD83C\uDF97\uFE0F '+line.n+' is speaking...';
  const all=chat.querySelectorAll('.cb');if(all.length>=3)all[0].remove();
  const b=document.createElement('div');
  b.className='cb'+(line.s==='guest'?' gb':'');
  b.innerHTML='<div class="cn '+(line.s==='host'?'h':'g')+'">'+line.n+'</div><div class="ct">'+line.t+'</div>';
  chat.appendChild(b);
  requestAnimationFrame(()=>setTimeout(()=>b.classList.add('show'),20));
  setTimeout(()=>{hS=false;gS=false;setTimeout(next,400);},1500);
}
setTimeout(next,800);
</script>
</body></html>"""

# ============================================================================
# 4. RADIO STATION  (from document #4)
# ============================================================================
RADIO_HTML = r"""<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8">
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Inter',system-ui,sans-serif}
.station-detail-container{max-width:1200px;margin:0 auto;padding:2rem;background:#0d1117!important;min-height:100vh;color:#ffffff}
.back-button{background:linear-gradient(135deg,#1f2937,#374151);color:#00ffc8;border:1px solid #00ffc8;padding:12px 24px;border-radius:25px;font-size:14px;font-weight:bold;cursor:pointer;transition:all .3s ease;box-shadow:0 4px 15px rgba(0,255,200,0.2)}
.back-button:hover{background:#00ffc8;color:#0d1117;transform:translateY(-2px)}
.station-detail-content{background:#161b22;border-radius:20px;padding:2rem;box-shadow:0 10px 40px rgba(0,0,0,0.5);border:1px solid #30363d}
.station-info{display:flex;gap:2rem;align-items:flex-start;margin-bottom:3rem;flex-wrap:wrap}
.station-name{font-size:2.5rem;font-weight:bold;color:#00ffc8;margin:0 0 .5rem 0;text-shadow:0 2px 10px rgba(0,255,200,0.3)}
.station-genre{font-size:1.2rem;color:#FF6600;font-weight:500;margin:0 0 1rem 0;text-transform:uppercase;letter-spacing:1px}
.station-description{font-size:1rem;color:#d1d5db;line-height:1.6;margin:0 0 1.5rem 0}
.station-stats{display:flex;flex-wrap:wrap;gap:1rem;margin-bottom:2rem}
.stat{background:#1f2937;padding:8px 16px;border-radius:20px;font-size:14px;font-weight:500;border:1px solid #30363d;display:inline-flex;align-items:center;gap:5px;color:#d1d5db}
.live-indicator{background:linear-gradient(135deg,#dc3545,#c82333)!important;color:white!important;border:none!important;animation:pulse 2s infinite}
.loop-indicator{background:linear-gradient(135deg,#FF6600,#ff8533)!important;color:white!important;border:none!important}
.listener-ticker{display:flex;align-items:center;gap:12px;background:#0d1117;border:1px solid #30363d;border-radius:12px;padding:12px 18px;margin-bottom:1.5rem}
.ticker-dot{width:10px;height:10px;border-radius:50%;background:#00ffc8;box-shadow:0 0 10px #00ffc8;animation:tickerPulse 1.2s ease-in-out infinite;flex-shrink:0}
@keyframes tickerPulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(.85)}}
.ticker-count{font-size:28px;font-weight:900;color:#00ffc8;font-family:'Courier New',monospace;min-width:60px}
.ticker-label{font-size:12px;color:#6b7280;letter-spacing:.5px}
.ticker-peak{margin-left:auto;font-size:12px;color:#6b7280}
.ticker-peak span{color:#ffa726;font-weight:700}
.audio-meters-wrap{display:flex;align-items:flex-end;gap:3px;height:48px;padding:6px 10px;background:#0d1117;border-radius:8px;border:1px solid #30363d;flex-shrink:0}
.meter-bar{width:7px;border-radius:2px;transition:height .06s ease;flex-shrink:0}
.play-pause-btn{background:linear-gradient(135deg,#00ffc8,#00d4a8);color:#0d1117;border:none;padding:15px 30px;border-radius:30px;font-size:16px;font-weight:bold;cursor:pointer;transition:all .3s ease;box-shadow:0 4px 15px rgba(0,255,200,0.3);display:flex;align-items:center;gap:8px}
.play-pause-btn.playing{background:linear-gradient(135deg,#FF6600,#ff8533)}
.volume-slider{-webkit-appearance:none;appearance:none;width:100px;height:6px;border-radius:3px;background:#374151;outline:none}
.volume-slider::-webkit-slider-thumb{-webkit-appearance:none;width:16px;height:16px;border-radius:50%;background:#00ffc8;cursor:pointer}
.now-playing{background:#1f2937!important;padding:1.5rem;border-radius:15px;border-left:5px solid #00ffc8;border:1px solid #30363d;margin-top:1rem}
.now-playing h3{color:#00ffc8!important;margin:0 0 1rem 0}
.track-title{font-size:1.1rem;font-weight:bold;color:#ffffff!important;margin-bottom:.25rem}
.track-artist{color:#d1d5db!important}
.detail-panels-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:1.5rem;margin-top:2rem}
.panel{background:#161b22;border:1px solid #30363d;border-radius:15px;overflow:hidden}
.panel-hd{display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:1px solid #30363d;background:#0d1117}
.panel-title{font-size:13px;font-weight:800;color:#6b7280;letter-spacing:1px;text-transform:uppercase}
.song-row{display:flex;align-items:center;gap:12px;padding:10px 14px;border-bottom:1px solid #0d1117}
.song-row:last-child{border-bottom:none}
.song-num{font-size:11px;color:#374151;font-family:'Courier New',monospace;min-width:20px}
.song-art{width:36px;height:36px;border-radius:6px;background:#1f2937;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0}
.song-info{flex:1;min-width:0}
.song-title{font-size:13px;font-weight:600;color:#d1d5db;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.song-artist{font-size:11px;color:#6b7280}
.song-time{font-size:11px;color:#374151;font-family:'Courier New',monospace;flex-shrink:0}
.song-row.now .song-title{color:#00ffc8}
.song-row.now{background:rgba(0,255,200,0.04);border-radius:8px;padding:10px 8px;margin:0}
.chat-body{height:200px;overflow-y:auto;display:flex;flex-direction:column;gap:8px;padding:14px 18px;scrollbar-width:thin;scrollbar-color:#30363d transparent}
.chat-msg{display:flex;gap:10px;align-items:flex-start}
.chat-avatar{width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;flex-shrink:0}
.chat-user{font-size:12px;font-weight:700;margin-bottom:2px}
.chat-text{font-size:12px;color:#9ca3af;line-height:1.4}
.chat-input-row{display:flex;gap:8px;padding:12px 18px;border-top:1px solid #30363d}
.chat-input{flex:1;background:#0d1117;border:1px solid #30363d;border-radius:10px;color:#d1d5db;font-size:13px;padding:10px 14px;outline:none}
.chat-input:focus{border-color:#00ffc8}
.chat-send{padding:10px 16px;border-radius:10px;border:none;background:#00ffc8;color:#0d1117;font-size:12px;font-weight:800;cursor:pointer}
.share-btn{display:flex;align-items:center;gap:8px;padding:12px 14px;border-radius:12px;border:1px solid #30363d;background:#0d1117;color:#9ca3af;font-size:12px;font-weight:700;cursor:pointer;transition:all .15s;margin-bottom:6px;width:100%}
.share-btn:hover{border-color:rgba(0,255,200,0.4);color:#00ffc8}
.info-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.info-item{background:#0d1117;padding:1rem;border-radius:10px;border:1px solid #30363d;color:#d1d5db}
.info-item strong{color:#00ffc8;display:block;margin-bottom:.25rem;font-size:.85rem;text-transform:uppercase;letter-spacing:.5px}
@keyframes pulse{0%{box-shadow:0 4px 15px rgba(255,102,0,0.3);transform:scale(1)}50%{box-shadow:0 6px 25px rgba(255,102,0,0.6);transform:scale(1.02)}100%{box-shadow:0 4px 15px rgba(255,102,0,0.3);transform:scale(1)}}
</style>
</head>
<body>
<div class="station-detail-container">
  <div style="margin-bottom:1rem"><button class="back-button">&#8592; Back to Stations</button></div>
  <div class="station-detail-content">
    <div class="station-info">
      <div style="width:220px;height:220px;border-radius:20px;border:4px solid #00ffc8;background:linear-gradient(135deg,#0d2020,#0a1220);display:flex;align-items:center;justify-content:center;font-size:70px;box-shadow:0 8px 25px rgba(0,255,200,.2);flex-shrink:0">&#127897;</div>
      <div style="flex:1">
        <h1 class="station-name">Lo-Fi Dreams</h1>
        <p class="station-genre">Lo-Fi / Chill</p>
        <p class="station-description">Relaxing lo-fi beats to help you focus, study, or unwind. Powered by StreamPireX — 90% revenue to creators.</p>
        <div class="station-stats">
          <span class="stat">&#128101; 1,247 listeners</span>
          <span class="stat">&#11088; 4.8/5.0</span>
          <span class="stat live-indicator">&#128308; LIVE</span>
          <span class="stat loop-indicator">&#128260; LOOP</span>
          <span class="stat">320kbps</span>
        </div>
        <div class="listener-ticker">
          <div class="ticker-dot"></div>
          <div>
            <div class="ticker-count" id="listenerCount">1,247</div>
            <div class="ticker-label">LISTENING NOW</div>
          </div>
          <div class="audio-meters-wrap" id="meters"></div>
          <div class="ticker-peak">Peak today <span>4,891</span></div>
        </div>
        <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:1rem">
          <button class="play-pause-btn playing" onclick="togglePlay()">&#9208;&#65039; Pause</button>
          <button style="background:linear-gradient(135deg,#dc3545,#c82333);color:white;border:none;padding:15px 25px;border-radius:30px;font-size:14px;font-weight:bold;cursor:pointer">&#9829;&#65039; Favorite</button>
        </div>
      </div>
    </div>
    <div class="now-playing">
      <h3>&#127925; Now Playing</h3>
      <div class="track-title">Midnight Frequencies</div>
      <div class="track-artist">DJ Nova feat. Aria Banks</div>
    </div>
    <div class="detail-panels-grid">
      <div class="panel">
        <div class="panel-hd"><span class="panel-title">&#127925; Song History</span></div>
        <div class="song-row now"><span class="song-num">&#9654;</span><div class="song-art">&#127925;</div><div class="song-info"><div class="song-title">Midnight Frequencies</div><div class="song-artist">DJ Nova feat. Aria Banks</div></div><span class="song-time">Now</span></div>
        <div class="song-row"><span class="song-num">2</span><div class="song-art">&#127927;</div><div class="song-info"><div class="song-title">City Rain</div><div class="song-artist">Mellow Keys</div></div><span class="song-time">3:21</span></div>
        <div class="song-row"><span class="song-num">3</span><div class="song-art">&#127929;</div><div class="song-info"><div class="song-title">Late Night Study</div><div class="song-artist">Caf&#233; Beats</div></div><span class="song-time">4:07</span></div>
        <div class="song-row"><span class="song-num">4</span><div class="song-art">&#127769;</div><div class="song-info"><div class="song-title">Slow Burn</div><div class="song-artist">Indigo Rain</div></div><span class="song-time">5:12</span></div>
      </div>
      <div class="panel">
        <div class="panel-hd"><span class="panel-title">&#128172; Live Chat</span><span style="font-size:12px;color:#00ffc8;font-weight:700" id="chatCount">1,247 online</span></div>
        <div class="chat-body" id="chatBody"></div>
        <div class="chat-input-row">
          <input class="chat-input" id="chatIn" placeholder="Say something..." onkeydown="if(event.key==='Enter')sendChat()">
          <button class="chat-send" onclick="sendChat()">Send</button>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:1rem">
        <div class="panel">
          <div class="panel-hd"><span class="panel-title">&#128279; Share</span></div>
          <div style="padding:14px">
            <button class="share-btn">&#128203; Copy Link</button>
            <button class="share-btn">&#120143; Twitter</button>
          </div>
        </div>
        <div class="panel">
          <div class="panel-hd"><span class="panel-title">&#128202; Station Info</span></div>
          <div style="padding:14px">
            <div class="info-grid">
              <div class="info-item"><strong>Genre</strong>Lo-Fi / Chill</div>
              <div class="info-item"><strong>Bitrate</strong>320 kbps</div>
              <div class="info-item"><strong>Created by</strong>DJ Nova</div>
              <div class="info-item"><strong>Rating</strong>&#11088; 4.8</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
<script>
const mWrap=document.getElementById('meters');
const mBars=Array.from({length:20},()=>{const b=document.createElement('div');b.className='meter-bar';b.style.cssText='height:4px;width:7px;border-radius:2px;';mWrap.appendChild(b);return b;});
let playing=true;
function animMeters(){
  mBars.forEach((b,i)=>{
    if(playing){const t=Date.now()/120+i*0.45;const h=Math.max(3,Math.abs(Math.sin(t)*18+Math.cos(t*1.7)*9+Math.random()*5));const pct=h/32;b.style.height=Math.round(h)+'px';b.style.background=pct>.8?'#ff3366':pct>.6?'#ffcc00':'#00ffc8';b.style.opacity=0.7+Math.random()*.3;}
    else{b.style.height='3px';b.style.background='#374151';b.style.opacity='0.4';}
  });
  requestAnimationFrame(animMeters);
}
animMeters();
function togglePlay(){playing=!playing;}
let cnt=1247;
setInterval(()=>{cnt+=Math.round(Math.random()*8-3);if(cnt<1200)cnt=1200;document.getElementById('listenerCount').textContent=cnt.toLocaleString();document.getElementById('chatCount').textContent=cnt.toLocaleString()+' online';},3000);
const MSGS=[{u:'MikeBeatZ',c:'#00ffc8',m:'this drop is fire!'},{u:'LoFiLover',c:'#a78bfa',m:'perfect study vibes'},{u:'AriaFan99',c:'#ff6b35',m:"this is amazing"},{u:'TrapKing',c:'#ffd700',m:'need that tracklist'},{u:'ChillVibes',c:'#00aaff',m:'been listening for 2hrs'},{u:'NightOwl',c:'#ff4466',m:'streaming from Berlin'}];
let ci=0;
const chatBody=document.getElementById('chatBody');
function addMsg(u,c,m){const d=document.createElement('div');d.className='chat-msg';d.innerHTML=`<div class="chat-avatar" style="background:${c}22;color:${c}">${u[0]}</div><div><div class="chat-user" style="color:${c}">${u}</div><div class="chat-text">${m}</div></div>`;chatBody.appendChild(d);chatBody.scrollTop=chatBody.scrollHeight;if(chatBody.children.length>30)chatBody.children[0].remove();}
MSGS.forEach(m=>addMsg(m.u,m.c,m.m));
setInterval(()=>{const m=MSGS[ci++%MSGS.length];addMsg(m.u,m.c,m.m);},3500);
function sendChat(){const v=document.getElementById('chatIn').value.trim();if(!v)return;addMsg('You','#e0eaf0',v);document.getElementById('chatIn').value='';}
</script>
</body></html>"""

# ============================================================================
# 5. VIDEO EDITOR — minimal placeholder that avoids route hijacking
# ============================================================================
VIDEO_EDITOR_HTML = r"""<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8">
<style>
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:100%;height:100vh;background:#0a0c12;font-family:'Inter',system-ui,sans-serif;color:#c8d0d8;overflow:hidden}
.top{display:flex;align-items:center;gap:8px;background:#111520;border-bottom:1px solid #1e2530;height:40px;padding:0 14px}
.logo{font-size:12px;font-weight:800;color:#00ffc8;letter-spacing:1px}
.ttab{padding:0 12px;height:40px;display:flex;align-items:center;font-size:11px;color:#4a6070;cursor:pointer;border-bottom:2px solid transparent;white-space:nowrap}
.ttab.on{color:#00ffc8;border-bottom-color:#00ffc8}
.exp{margin-left:auto;padding:6px 14px;border-radius:5px;background:#00ffc8;color:#041014;font-size:11px;font-weight:800;border:none;cursor:pointer}
.main{display:flex;height:calc(100vh - 40px - 36px);overflow:hidden}
.preview{flex:1;background:#000;display:flex;align-items:center;justify-content:center;position:relative}
.pscreen{width:100%;max-width:700px;aspect-ratio:16/9;background:#050709;border:1px solid #1e2530;border-radius:6px;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden}
.pscreen canvas{position:absolute;inset:0;width:100%;height:100%}
.ptc{position:absolute;bottom:10px;left:50%;transform:translateX(-50%);display:flex;align-items:center;gap:8px}
.pbtn{width:32px;height:32px;border-radius:50%;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:13px}
.pbtn.play{background:#00ffc8;color:#041014}
.pbtn.stop{background:#1e2530;color:#8090a0}
.sidebar{width:240px;background:#0d1018;border-left:1px solid #1e2530;display:flex;flex-direction:column;overflow:hidden}
.stab-row{display:flex;border-bottom:1px solid #1e2530;overflow-x:auto;scrollbar-width:none}
.stab-row::-webkit-scrollbar{display:none}
.stab{padding:8px 12px;font-size:10px;font-weight:700;color:#4a6070;cursor:pointer;white-space:nowrap;border-bottom:2px solid transparent}
.stab.on{color:#00ffc8;border-bottom-color:#00ffc8}
.slist{flex:1;overflow-y:auto;padding:8px}
.sitem{display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:8px;cursor:pointer;border:1px solid transparent;transition:all .12s;margin-bottom:4px}
.sitem:hover{background:rgba(255,255,255,.03);border-color:#1e2530}
.sitem.on{background:rgba(0,255,200,.08);border-color:rgba(0,255,200,.2)}
.sicon{width:32px;height:32px;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:15px;flex-shrink:0}
.slbl{font-size:11px;font-weight:600;color:#8090a0}
.ssub{font-size:9px;color:#4a6070}
.timeline-wrap{height:36px;background:#080a0e;border-top:1px solid #1e2530;display:flex;align-items:center;padding:0 14px;gap:8px;flex-shrink:0}
.tl-track{flex:1;height:18px;background:#111620;border-radius:4px;position:relative;overflow:hidden;border:1px solid #1e2530}
.tl-clip{position:absolute;top:1px;height:calc(100% - 2px);border-radius:3px;display:flex;align-items:center;padding:0 6px}
.tl-clip span{font-size:8px;font-weight:700;white-space:nowrap;overflow:hidden}
.tl-head{position:absolute;top:0;bottom:0;width:2px;background:#00ffc8;z-index:10;box-shadow:0 0 4px #00ffc8}
.tl-lbl{font-size:9px;color:#4a6070;width:40px;text-align:right;flex-shrink:0}
</style></head>
<body>
<div class="top">
  <div class="logo">&#127916; VIDEO EDITOR</div>
  <div class="ttab on">&#127916; Timeline</div>
  <div class="ttab">&#127881; Effects</div>
  <div class="ttab">&#127775; Color</div>
  <div class="ttab">&#127926; Audio</div>
  <div class="ttab">&#128191; Export</div>
  <button class="exp">&#11014; Export</button>
</div>
<div class="main">
  <div class="preview">
    <div class="pscreen">
      <canvas id="previewCanvas"></canvas>
      <div class="ptc">
        <button class="pbtn stop">&#9632;</button>
        <button class="pbtn play" id="playBtn" onclick="togglePlay()">&#9654;</button>
        <span style="font-size:10px;color:#8090a0;font-family:'Courier New',monospace" id="timecode">0:00:00</span>
      </div>
    </div>
  </div>
  <div class="sidebar">
    <div class="stab-row">
      <div class="stab on">&#127897; Clips</div>
      <div class="stab">&#127775; FX</div>
      <div class="stab">&#127926; Audio</div>
      <div class="stab">&#128444; Text</div>
    </div>
    <div class="slist">
      <div class="sitem on"><div class="sicon" style="background:rgba(0,255,200,.1)">&#127916;</div><div><div class="slbl">Intro Clip</div><div class="ssub">0:00 — 0:12</div></div></div>
      <div class="sitem"><div class="sicon" style="background:rgba(255,107,53,.1)">&#127909;</div><div><div class="slbl">Main Cut</div><div class="ssub">0:12 — 1:04</div></div></div>
      <div class="sitem"><div class="sicon" style="background:rgba(167,139,250,.1)">&#127926;</div><div><div class="slbl">Background Music</div><div class="ssub">0:00 — 1:04</div></div></div>
      <div class="sitem"><div class="sicon" style="background:rgba(255,215,0,.1)">&#128444;</div><div><div class="slbl">Title Card</div><div class="ssub">0:02 — 0:06</div></div></div>
      <div class="sitem"><div class="sicon" style="background:rgba(0,170,255,.1)">&#127775;</div><div><div class="slbl">Color Grade</div><div class="ssub">Applied</div></div></div>
    </div>
  </div>
</div>
<div class="timeline-wrap">
  <span class="tl-lbl">V1</span>
  <div class="tl-track">
    <div class="tl-clip" style="left:0;width:20%;background:rgba(0,255,200,.2);border:1px solid rgba(0,255,200,.4)"><span style="color:#00ffc8">Intro</span></div>
    <div class="tl-clip" style="left:21%;width:55%;background:rgba(255,107,53,.2);border:1px solid rgba(255,107,53,.4)"><span style="color:#ff6b35">Main Cut</span></div>
    <div class="tl-clip" style="left:77%;width:22%;background:rgba(167,139,250,.2);border:1px solid rgba(167,139,250,.4)"><span style="color:#a78bfa">Outro</span></div>
    <div class="tl-head" id="tlHead" style="left:0"></div>
  </div>
</div>
<script>
const canvas=document.getElementById('previewCanvas');const ctx=canvas.getContext('2d');
canvas.width=700;canvas.height=394;
let playing=false,frame=0,raf=null;
const COLORS=['#00ffc8','#ff6b35','#a78bfa','#ffd700','#00aaff'];
function drawFrame(){
  ctx.fillStyle='#050709';ctx.fillRect(0,0,700,394);
  const t=frame/60;
  // animated gradient background
  const grd=ctx.createLinearGradient(0,0,700,394);
  grd.addColorStop(0,`hsl(${(t*30)%360},40%,8%)`);
  grd.addColorStop(1,`hsl(${(t*30+120)%360},30%,5%)`);
  ctx.fillStyle=grd;ctx.fillRect(0,0,700,394);
  // waveform bars
  for(let i=0;i<80;i++){
    const x=i*8.75+4;
    const h=playing?Math.abs(Math.sin(t*3+i*.4)*60+Math.cos(t*2+i*.25)*30+Math.random()*15)+10:Math.abs(Math.sin(i*.3)*20)+5;
    const col=COLORS[i%COLORS.length];
    ctx.fillStyle=col+'88';
    ctx.fillRect(x,197-h/2,6,h);
  }
  // center label
  ctx.fillStyle='rgba(0,255,200,0.85)';ctx.font='bold 18px Inter,sans-serif';ctx.textAlign='center';
  ctx.fillText('StreamPireX Video Editor',350,200);
  ctx.fillStyle='rgba(200,208,216,0.4)';ctx.font='12px Inter,sans-serif';
  ctx.fillText('Multi-track timeline  |  AI effects  |  4K export',350,222);
}
function loop(){frame++;drawFrame();const pct=((frame%300)/300);document.getElementById('tlHead').style.left=(pct*100)+'%';const s=Math.floor(frame/60),m=Math.floor(s/60);document.getElementById('timecode').textContent=`0:${String(m).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;if(playing)raf=requestAnimationFrame(loop);}
function togglePlay(){playing=!playing;const b=document.getElementById('playBtn');b.textContent=playing?'\u23F8':'\u25B6';if(playing){raf=requestAnimationFrame(loop);}else{cancelAnimationFrame(raf);}}
drawFrame();
setTimeout(togglePlay,500);
</script>
</body></html>"""

# ── write all five ──────────────────────────────────────────────────────────
write_module("djStudioSrcDoc.js",    DJ_STUDIO_HTML)
write_module("beatMakerSrcDoc.js",   BEAT_MAKER_HTML)
write_module("podcastStudioSrcDoc.js", PODCAST_HTML)
write_module("radioStationSrcDoc.js",  RADIO_HTML)
write_module("videoEditorSrcDoc.js",   VIDEO_EDITOR_HTML)

print("\nAll 5 srcDoc modules written. Now run: python3 /tmp/patch_home_imports.py")
