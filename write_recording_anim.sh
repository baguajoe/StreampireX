#!/bin/bash
cat > ./src/front/js/component/recordingStudioAnim.js << 'JSEOF'
const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html,body{width:100%;height:100%;min-width:100%;background:#070b0f;font-family:'Courier New',monospace;color:#dde6ef;overflow:hidden;user-select:none;font-size:11px}
.root{display:flex;flex-direction:column;width:100%;height:100%;background:#070b0f}

.topbar{display:flex;align-items:center;background:#0c1219;border-bottom:1px solid #243548;height:32px;min-height:32px;padding:0 8px;gap:4px;flex-shrink:0;overflow:hidden}
.s-start{padding:4px 10px;border-radius:4px;font-size:11px;font-weight:700;border:none;font-family:inherit;background:#00ffc8;color:#041014;flex-shrink:0;cursor:pointer}
.s-join{padding:4px 10px;border-radius:4px;font-size:11px;font-weight:700;font-family:inherit;background:#111a24;color:#8fa8bf;border:1px solid #243548;flex-shrink:0;cursor:pointer}
.sep{width:1px;height:20px;background:#243548;flex-shrink:0}
.ntab{padding:0 9px;height:32px;display:flex;align-items:center;font-size:10px;font-weight:700;color:#4e6a82;cursor:pointer;white-space:nowrap;flex-shrink:0;text-transform:uppercase;letter-spacing:0.3px}
.ntab.on{color:#00ffc8;border-bottom:2px solid #00ffc8}
.ntab:hover{color:#8fa8bf}
.exp-btn{margin-left:auto;padding:4px 12px;border-radius:4px;background:#00ffc8;color:#041014;font-size:11px;font-weight:800;border:none;cursor:pointer;flex-shrink:0;font-family:inherit}

.transport{display:flex;align-items:center;gap:6px;background:#0a0f16;border-bottom:1px solid #243548;padding:0 12px;height:38px;min-height:38px;flex-shrink:0}
.tb{width:26px;height:26px;border-radius:4px;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:12px;flex-shrink:0}
.tb-stop{background:#111a24;color:#8fa8bf;border:1px solid #243548}
.tb-play{background:#00ffc8;color:#041014;font-size:13px}
.tb-rec{background:rgba(255,69,58,0.15);color:#ff453a;border:1px solid rgba(255,69,58,0.35)}
.tdiv{width:1px;height:20px;background:#243548;flex-shrink:0}
.bpm-lbl{font-size:9px;font-weight:800;color:#4e6a82;text-transform:uppercase;letter-spacing:1px}
.bpm-val{font-size:17px;font-weight:800;color:#dde6ef;min-width:40px;letter-spacing:1px;font-family:'Courier New',monospace}
.time{font-size:13px;font-weight:700;color:#00ffc8;letter-spacing:2px;min-width:85px;text-shadow:0 0 10px rgba(0,255,200,0.3);font-family:'Courier New',monospace}
.snap-sel{background:#111a24;border:1px solid #243548;color:#8fa8bf;font-size:10px;padding:3px 6px;border-radius:3px;outline:none;font-family:inherit;flex-shrink:0}
.zoom-btn{padding:3px 8px;border-radius:3px;border:1px solid #00ffc8;background:rgba(0,255,200,0.1);color:#00ffc8;font-size:10px;font-weight:700;cursor:pointer;font-family:inherit;flex-shrink:0}
.rec-rdy{padding:3px 8px;border-radius:3px;background:rgba(255,69,58,0.15);border:1px solid rgba(255,69,58,0.35);color:#ff453a;font-size:10px;font-weight:800;cursor:pointer;font-family:inherit;flex-shrink:0}

.main{display:flex;flex:1;overflow:hidden;min-height:0;width:100%}

.th{width:130px;min-width:130px;max-width:130px;flex-shrink:0;background:#0c1219;border-right:1px solid #243548;display:flex;flex-direction:column;overflow:hidden}
.th-hdr{height:26px;min-height:26px;background:#0a0f16;border-bottom:1px solid #243548;display:flex;align-items:center;padding:0 8px;font-size:8px;font-weight:800;color:#4e6a82;letter-spacing:1.5px;text-transform:uppercase;flex-shrink:0}
.tr{flex:1;border-bottom:1px solid #0d1820;display:flex;align-items:center;padding:0 5px;gap:4px;cursor:pointer;transition:background 0.1s;min-height:0}
.tr:hover{background:rgba(255,255,255,0.03)}
.tr.on{background:rgba(0,255,200,0.05);border-left:2px solid #00ffc8}
.tc{width:3px;height:26px;border-radius:2px;flex-shrink:0}
.ti{flex:1;min-width:0}
.tn{font-size:11px;font-weight:700;color:#dde6ef;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tt{font-size:8px;color:#4e6a82;text-transform:uppercase;letter-spacing:0.5px;margin-top:1px}
.tbs{display:flex;gap:2px;flex-shrink:0}
.tbtn{width:15px;height:15px;border-radius:2px;border:1px solid #243548;font-size:8px;font-weight:800;cursor:pointer;display:flex;align-items:center;justify-content:center;background:#111a24;color:#4e6a82;font-family:inherit}

.tw{flex:1;display:flex;flex-direction:column;overflow:hidden;min-width:0;width:0}
.ruler{height:26px;min-height:26px;background:#0a0f16;border-bottom:1px solid #243548;position:relative;overflow:hidden;flex-shrink:0}
.ca{flex:1;overflow:hidden;position:relative;background:repeating-linear-gradient(90deg,transparent,transparent calc(12.5% - 1px),#0d1820 calc(12.5% - 1px),#0d1820 12.5%)}
.lane{flex:1;border-bottom:1px solid #0d1820;position:relative;min-height:0}
.clip{position:absolute;top:3px;bottom:3px;border-radius:3px;display:flex;align-items:flex-end;padding:0 6px 4px;cursor:pointer;overflow:hidden}
.clip:hover{filter:brightness(1.15)}
.cl{font-size:10px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1}
.ph{position:absolute;top:0;bottom:0;width:2px;background:#00ffc8;z-index:10;box-shadow:0 0 8px rgba(0,255,200,0.6);pointer-events:none}
.ph::before{content:'';position:absolute;top:-1px;left:-5px;width:12px;height:8px;background:#00ffc8;clip-path:polygon(0 0,100% 0,50% 100%)}

.fx{width:82px;min-width:82px;max-width:82px;flex-shrink:0;background:#0c1219;border-left:1px solid #243548;display:flex;flex-direction:column;overflow:hidden}
.fx-hdr{height:26px;min-height:26px;background:#0a0f16;border-bottom:1px solid #243548;display:flex;align-items:center;padding:0 8px;font-size:8px;font-weight:800;color:#4e6a82;letter-spacing:1.5px;text-transform:uppercase;flex-shrink:0}
.fb{margin:3px 5px;padding:4px 5px;border-radius:3px;font-size:10px;font-weight:700;border:1px solid #243548;background:#111a24;color:#4e6a82;cursor:pointer;text-align:center;font-family:inherit;flex-shrink:0}
.fb.on{background:rgba(0,255,200,0.1);border-color:rgba(0,255,200,0.4);color:#00ffc8}

.mx{height:100px;min-height:100px;border-top:2px solid rgba(0,255,200,0.15);background:#070b0f;display:flex;overflow-x:auto;overflow-y:hidden;scrollbar-width:none;flex-shrink:0}
.mx::-webkit-scrollbar{display:none}
.mc{flex:1;min-width:46px;max-width:80px;border-right:1px solid #0d1820;display:flex;flex-direction:column;align-items:center;padding:4px 3px;gap:2px}
.mcn{font-size:8px;font-weight:700;text-align:center;width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.mvu{display:flex;gap:1px;height:12px;align-items:flex-end}
.mvb{width:4px;border-radius:1px;background:#1a2838;transition:height 0.06s,background 0.06s}
.mfw{display:flex;align-items:center;justify-content:center;width:100%;flex:1}
.mf{-webkit-appearance:none;appearance:none;width:38px;height:3px;border-radius:2px;background:#1a2838;outline:none;transform:rotate(-90deg);cursor:pointer}
.mvol{font-size:8px;font-family:'Courier New',monospace}
</style>
</head>
<body>
<div class="root">

<div class="topbar">
  <button class="s-start">+ Start Session</button>
  <button class="s-join">Join Session</button>
  <div class="sep"></div>
  <div class="ntab on">&#9654; Arrange</div>
  <div class="ntab">&#9000; Console</div>
  <div class="ntab">&#127929; Piano Roll</div>
  <div class="ntab">&#129345; Sampler</div>
  <div class="ntab">&#9889; AI Mix</div>
  <div class="ntab">&#9889; Synth</div>
  <div class="ntab">&#10024; Mastering</div>
  <button class="exp-btn">&#11014; Export</button>
</div>

<div class="transport">
  <button class="tb tb-stop">&#9632;</button>
  <button class="tb tb-play" id="playBtn" onclick="togglePlay()">&#9654;</button>
  <button class="tb tb-rec">&#9210;</button>
  <div class="tdiv"></div>
  <span class="bpm-lbl">BPM</span>
  <span class="bpm-val">120</span>
  <div class="tdiv"></div>
  <div class="time" id="timeDisplay">1 . 1 . 000</div>
  <div class="tdiv"></div>
  <select class="snap-sel"><option>1/4</option><option>1/8</option><option>1/16</option></select>
  <div style="margin-left:auto;display:flex;gap:8px;align-items:center">
    <button class="zoom-btn">100%</button>
    <button class="rec-rdy">&#9210; REC READY</button>
  </div>
</div>

<div class="main">
  <div class="th">
    <div class="th-hdr">TRACKS</div>
    <div id="tl"></div>
  </div>
  <div class="tw">
    <div class="ruler" id="ruler"></div>
    <div class="ca" id="ca">
      <div class="ph" id="ph" style="left:0%"></div>
    </div>
  </div>
  <div class="fx">
    <div class="fx-hdr">FX</div>
    <button class="fb on">EQ</button>
    <button class="fb on">Comp</button>
    <button class="fb">Reverb</button>
    <button class="fb">Delay</button>
    <button class="fb on">Limiter</button>
    <button class="fb">Distort</button>
    <button class="fb">Chorus</button>
    <button class="fb">Filter</button>
  </div>
</div>

<div class="mx" id="mx"></div>

</div>
<script>
var T=[
  {n:'Lead Vocals',t:'Audio',c:'#00ffc8',clips:[{x:1,w:26,l:'Verse 1'},{x:40,w:19,l:'Chorus'},{x:72,w:14,l:'Bridge'}]},
  {n:'Harmony',t:'Audio',c:'#0a84ff',clips:[{x:40,w:19,l:'Harmony'},{x:72,w:14,l:'Harm 2'}]},
  {n:'Kick 808',t:'Beat',c:'#ff6600',clips:[{x:1,w:89,l:'Beat Pattern'}]},
  {n:'Snare',t:'Beat',c:'#ffd60a',clips:[{x:1,w:89,l:'Snare Loop'}]},
  {n:'Hi-Hat',t:'Beat',c:'#bf5af2',clips:[{x:1,w:44,l:'HH Loop'},{x:47,w:43,l:'HH Loop 2'}]},
  {n:'Bass Line',t:'MIDI',c:'#ff453a',clips:[{x:1,w:26,l:'Bass A'},{x:40,w:30,l:'Bass B'}]},
  {n:'Chord Pad',t:'MIDI',c:'#30d158',clips:[{x:14,w:62,l:'Pads'}]},
  {n:'Lead Synth',t:'MIDI',c:'#ff8c00',clips:[{x:40,w:36,l:'Lead Mel'}]}
];

var tlEl=document.getElementById('tl');
var caEl=document.getElementById('ca');

T.forEach(function(t,i){
  var r=document.createElement('div');
  r.className='tr'+(i===0?' on':'');
  r.innerHTML='<div class="tc" style="background:'+t.c+'"></div><div class="ti"><div class="tn">'+t.n+'</div><div class="tt">'+t.t+'</div></div><div class="tbs"><button class="tbtn">M</button><button class="tbtn">S</button></div>';
  r.onclick=function(){document.querySelectorAll('.tr').forEach(function(x){x.classList.remove('on')});r.classList.add('on')};
  tlEl.appendChild(r);
  var lane=document.createElement('div');
  lane.className='lane';
  t.clips.forEach(function(c){
    var cl=document.createElement('div');
    cl.className='clip';
    cl.style.left=c.x+'%';
    cl.style.width=c.w+'%';
    cl.style.background=t.c+'22';
    cl.style.border='1px solid '+t.c+'55';
    var lb=document.createElement('div');
    lb.className='cl';
    lb.style.color=t.c;
    lb.textContent=c.l;
    cl.appendChild(lb);
    lane.appendChild(cl);
  });
  caEl.appendChild(lane);
});

// Ruler
var rulerEl=document.getElementById('ruler');
for(var i=0;i<9;i++){
  var pct=(i/8)*100;
  var ln=document.createElement('div');
  ln.style.cssText='position:absolute;top:0;bottom:0;left:'+pct+'%;width:1px;background:'+(i===0?'#243548':'#1a2838')+';';
  rulerEl.appendChild(ln);
  var lb=document.createElement('span');
  lb.style.cssText='position:absolute;bottom:3px;left:calc('+pct+'% + 3px);font-size:9px;color:#4e6a82;font-family:Courier New,monospace;';
  lb.textContent=i+1;
  rulerEl.appendChild(lb);
}

// Mixer
var mxEl=document.getElementById('mx');
var MT=T.slice(0,7).concat([{n:'Master',c:'#dde6ef'}]);
MT.forEach(function(t,i){
  var v=70+Math.floor(Math.random()*25);
  var ch=document.createElement('div');
  ch.className='mc';
  var vid='v'+i;
  ch.innerHTML='<div class="mcn" style="color:'+t.c+'">'+t.n+'</div><div class="mvu" id="'+vid+'"><div class="mvb"></div><div class="mvb"></div><div class="mvb"></div><div class="mvb"></div><div class="mvb"></div></div><div class="mfw"><input type="range" class="mf" min="0" max="100" value="'+v+'"></div><div class="mvol" style="color:'+t.c+'">'+v+'%</div>';
  var s=document.createElement('style');
  s.textContent='#'+vid+' ~ .mfw .mf::-webkit-slider-thumb{-webkit-appearance:none;width:9px;height:9px;border-radius:50%;background:'+t.c+';cursor:pointer}';
  ch.appendChild(s);
  mxEl.appendChild(ch);
});

var playing=false,pos=0,frame=0,raf=null;

function togglePlay(){
  playing=!playing;
  var btn=document.getElementById('playBtn');
  btn.textContent=playing?'\u23f8':'\u25b6';
  btn.style.background=playing?'#ff6600':'#00ffc8';
  btn.style.color='#041014';
  if(playing){raf=requestAnimationFrame(tick)}else{cancelAnimationFrame(raf)}
}

function tick(){
  frame++;
  pos+=0.08;
  if(pos>90)pos=0;
  document.getElementById('ph').style.left=pos+'%';
  var tb=(pos/100)*32;
  var bar=Math.floor(tb/4)+1;
  var beat=Math.floor(tb%4)+1;
  var ticks=Math.floor((tb%1)*1000);
  document.getElementById('timeDisplay').textContent=bar+' . '+beat+' . '+('000'+ticks).slice(-3);
  MT.forEach(function(t,i){
    var vu=document.getElementById('v'+i);
    if(!vu)return;
    var lvl=Math.round(Math.abs(Math.sin(frame/6+i)*3+Math.random()*2));
    var bars=vu.querySelectorAll('.mvb');
    bars.forEach(function(b,j){
      var a=j<lvl;
      b.style.height=a?(5+j*2)+'px':'3px';
      b.style.background=a?(j>=3?'#ff453a':j>=2?'#ffd60a':(T[i]?T[i].c:'#00ffc8')):'#1a2838';
    });
  });
  if(playing)raf=requestAnimationFrame(tick);
}

document.querySelectorAll('.ntab').forEach(function(tab){
  tab.onclick=function(){document.querySelectorAll('.ntab').forEach(function(t){t.classList.remove('on')});tab.classList.add('on')};
});
document.querySelectorAll('.fb').forEach(function(b){b.onclick=function(){b.classList.toggle('on')}});

setTimeout(togglePlay,600);
</script>
</body>
</html>`;
export default html;
JSEOF
echo "Done"
