import React, { useState, useEffect, useRef, useCallback, useContext } from "react";
import { Context } from "../store/appContext";
import "../../styles/DJMixer.css";
import MidiHardwareInput from "../component/MidiHardwareInput";
import DVSTimecode from "../component/DVSTimecode";

const BACKEND = process.env.REACT_APP_BACKEND_URL || "";


// ── DJ Controller Profiles ──
const CONTROLLER_PROFILES = {
  "Akai MPK Mini": {
    desc: "Akai MPK Mini — 25 keys, 8 pads, 8 knobs",
    map: { 1:"xfader", 7:"vol_a", 8:"vol_b", 10:"low_a", 11:"mid_a", 74:"filter_a",
           70:"high_a", 71:"low_b", 72:"mid_b", 73:"high_b" },
    pads: { 36:"cue_a_1", 37:"cue_a_2", 38:"cue_a_3", 39:"cue_a_4",
            40:"cue_b_1", 41:"cue_b_2", 42:"cue_b_3", 43:"cue_b_4" },
  },
  "Novation Launchpad": {
    desc: "Novation Launchpad — 8x8 grid, 64 pads",
    map: { 7:"vol_a", 8:"vol_b" },
    pads: { 36:"cue_a_1", 37:"cue_a_2", 38:"cue_a_3", 39:"cue_a_4",
            44:"play_a", 45:"play_b", 46:"sync", 47:"cue_a" },
  },
  "Pioneer DDJ-200": {
    desc: "Pioneer DDJ-200 — 2-deck controller, jog wheels",
    map: { 7:"vol_a", 8:"vol_b", 10:"low_a", 11:"mid_a", 12:"high_a",
           13:"low_b", 14:"mid_b", 15:"high_b", 1:"xfader" },
    pads: { 36:"cue_a_1", 37:"cue_a_2", 40:"play_a", 41:"play_b", 46:"sync" },
  },
  "Native Instruments Traktor": {
    desc: "NI Traktor Kontrol S2/S4",
    map: { 7:"vol_a", 8:"vol_b", 10:"low_a", 11:"mid_a", 74:"filter_a",
           75:"filter_b", 1:"xfader" },
    pads: { 36:"cue_a_1", 37:"cue_a_2", 38:"cue_a_3", 39:"cue_a_4", 44:"play_a", 45:"play_b" },
  },
  "Custom": {
    desc: "Custom — build your own mapping",
    map: {},
    pads: {},
  },
};

const CAMELOT = {
  "C major":"8B","A minor":"8A","G major":"9B","E minor":"9A","D major":"10B","B minor":"10A",
  "A major":"11B","F# minor":"11A","E major":"12B","C# minor":"12A","B major":"1B","G# minor":"1A",
  "F# major":"2B","D# minor":"2A","C# major":"3B","A# minor":"3A","G# major":"4B","F minor":"4A",
  "D# major":"5B","C minor":"5A","A# major":"6B","G minor":"6A","F major":"7B","D minor":"7A",
};

const FX_TYPES = ["Filter","Echo","Reverb","Flanger","Phaser","Crush","Gate","Roll"];

let _ctx = null;
const getCtx = () => { if (!_ctx) _ctx = new (window.AudioContext||window.webkitAudioContext)(); return _ctx; };

async function detectBPM(buffer) {
  try {
    const sr = buffer.sampleRate;
    const off = new OfflineAudioContext(1, buffer.length, sr);
    const src = off.createBufferSource(); src.buffer = buffer;
    const f = off.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 150;
    src.connect(f); f.connect(off.destination); src.start(0);
    const r = await off.startRendering(); const d = r.getChannelData(0);
    const ws = Math.floor(sr*0.01); const energy = [];
    for (let i=0; i<d.length-ws; i+=ws) { let s=0; for (let j=0;j<ws;j++) s+=d[i+j]**2; energy.push(s/ws); }
    const avg = energy.reduce((a,b)=>a+b,0)/energy.length;
    const thr = avg*1.5; let peaks=0, lp=-10;
    for (let i=1;i<energy.length-1;i++) {
      if (energy[i]>thr&&energy[i]>energy[i-1]&&energy[i]>energy[i+1]&&i-lp>5){peaks++;lp=i;}
    }
    return Math.max(60,Math.min(200,Math.round((peaks/(d.length/sr))*60)));
  } catch { return null; }
}

// ── Technics 1200 Canvas Component ──
const Turntable = React.memo(({ playing, progress, color, label }) => {
  const cvs = useRef(null);
  const rot = useRef(0);
  const raf = useRef(null);

  useEffect(() => {
    const c = cvs.current; if (!c) return;
    const ctx = c.getContext("2d");
    const W = c.width, H = c.height;
    const cx = W/2, cy = H/2;

    const draw = () => {
      ctx.clearRect(0,0,W,H);

      // ── Plinth base ──
      const plinth = ctx.createRadialGradient(cx,cy,0,cx,cy,W*0.48);
      plinth.addColorStop(0,"#1a1a1a");
      plinth.addColorStop(1,"#0a0a0a");
      ctx.fillStyle = plinth;
      ctx.beginPath(); ctx.ellipse(cx,cy,W*0.48,H*0.48,0,0,Math.PI*2); ctx.fill();

      // ── Platter ──
      ctx.save();
      ctx.translate(cx,cy);
      ctx.rotate(rot.current);

      // Outer ring
      const platGrad = ctx.createRadialGradient(0,0,W*0.1,0,0,W*0.44);
      platGrad.addColorStop(0,"#2a2a2a");
      platGrad.addColorStop(0.3,"#1e1e1e");
      platGrad.addColorStop(0.7,"#111");
      platGrad.addColorStop(1,"#0d0d0d");
      ctx.fillStyle = platGrad;
      ctx.beginPath(); ctx.arc(0,0,W*0.44,0,Math.PI*2); ctx.fill();

      // Grooves
      for (let r=W*0.15; r<W*0.43; r+=4) {
        ctx.strokeStyle = `rgba(255,255,255,${0.015+Math.random()*0.01})`;
        ctx.lineWidth = 0.5;
        ctx.beginPath(); ctx.arc(0,0,r,0,Math.PI*2); ctx.stroke();
      }

      // Strobe dots
      const nDots = 60;
      for (let i=0;i<nDots;i++) {
        const a = (i/nDots)*Math.PI*2;
        const r = W*0.38;
        const blink = Math.sin(Date.now()*0.02+i*0.3)>0.7;
        ctx.fillStyle = blink ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.15)";
        ctx.beginPath();
        ctx.arc(Math.cos(a)*r, Math.sin(a)*r, 1.5, 0, Math.PI*2);
        ctx.fill();
      }

      // Record label
      const labelGrad = ctx.createRadialGradient(0,0,0,0,0,W*0.14);
      labelGrad.addColorStop(0, color+"99");
      labelGrad.addColorStop(0.5, color+"44");
      labelGrad.addColorStop(1,"#111");
      ctx.fillStyle = labelGrad;
      ctx.beginPath(); ctx.arc(0,0,W*0.14,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle = color+"66";
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(0,0,W*0.14,0,Math.PI*2); ctx.stroke();

      // Label text
      ctx.fillStyle = "#fff";
      ctx.font = `bold ${W*0.032}px JetBrains Mono, monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("SPX", 0, -8);
      ctx.font = `${W*0.022}px JetBrains Mono, monospace`;
      ctx.fillStyle = color;
      ctx.fillText(label, 0, 8);

      // Center spindle
      ctx.fillStyle = "#555";
      ctx.beginPath(); ctx.arc(0,0,5,0,Math.PI*2); ctx.fill();
      ctx.fillStyle = "#888";
      ctx.beginPath(); ctx.arc(0,0,2,0,Math.PI*2); ctx.fill();

      ctx.restore();

      // ── S-shaped Tone Arm (Technics 1200 style) ──
      ctx.save();
      const pivotX = W*0.83, pivotY = H*0.13;
      const armAngle = -0.35 + progress * 0.45;
      const perp = armAngle + Math.PI/2;

      // Counterweight
      const cwAngle = armAngle + Math.PI;
      const cwX = pivotX + Math.cos(cwAngle)*W*0.18;
      const cwY = pivotY + Math.sin(cwAngle)*W*0.18;
      ctx.strokeStyle="#666"; ctx.lineWidth=4;
      ctx.beginPath(); ctx.moveTo(cwX,cwY); ctx.lineTo(pivotX,pivotY); ctx.stroke();
      ctx.fillStyle="#3a3a3a"; ctx.beginPath(); ctx.arc(cwX,cwY,7,0,Math.PI*2); ctx.fill();
      ctx.fillStyle="#555"; ctx.beginPath(); ctx.arc(cwX,cwY,5,0,Math.PI*2); ctx.fill();

      // Pivot bearing
      ctx.fillStyle="#333"; ctx.beginPath(); ctx.arc(pivotX,pivotY,11,0,Math.PI*2); ctx.fill();
      ctx.fillStyle="#555"; ctx.beginPath(); ctx.arc(pivotX,pivotY,8,0,Math.PI*2); ctx.fill();
      ctx.fillStyle="#888"; ctx.beginPath(); ctx.arc(pivotX,pivotY,4,0,Math.PI*2); ctx.fill();

      // S-curve control points
      const tipX = pivotX + Math.cos(armAngle)*W*0.46;
      const tipY = pivotY + Math.sin(armAngle)*W*0.46;
      const cp1x = pivotX + Math.cos(armAngle)*W*0.1 + Math.cos(perp)*W*0.06;
      const cp1y = pivotY + Math.sin(armAngle)*W*0.1 + Math.sin(perp)*W*0.06;
      const cp2x = pivotX + Math.cos(armAngle)*W*0.32 - Math.cos(perp)*W*0.04;
      const cp2y = pivotY + Math.sin(armAngle)*W*0.32 - Math.sin(perp)*W*0.04;

      // Shadow
      ctx.strokeStyle="rgba(0,0,0,0.5)"; ctx.lineWidth=5;
      ctx.beginPath(); ctx.moveTo(pivotX+1,pivotY+1);
      ctx.bezierCurveTo(cp1x+1,cp1y+1,cp2x+1,cp2y+1,tipX+1,tipY+1); ctx.stroke();

      // Main tube
      ctx.strokeStyle="#777"; ctx.lineWidth=4;
      ctx.beginPath(); ctx.moveTo(pivotX,pivotY);
      ctx.bezierCurveTo(cp1x,cp1y,cp2x,cp2y,tipX,tipY); ctx.stroke();

      // Highlight
      ctx.strokeStyle="#bbb"; ctx.lineWidth=1.5;
      ctx.beginPath(); ctx.moveTo(pivotX,pivotY);
      ctx.bezierCurveTo(cp1x-Math.cos(perp)*1.5,cp1y-Math.sin(perp)*1.5,cp2x-Math.cos(perp)*1.5,cp2y-Math.sin(perp)*1.5,tipX,tipY); ctx.stroke();

      // Headshell
      ctx.save(); ctx.translate(tipX,tipY); ctx.rotate(armAngle+0.15);
      ctx.fillStyle="#4a4a4a"; ctx.beginPath(); ctx.arc(0,0,6,0,Math.PI*2); ctx.fill();
      ctx.fillStyle="#3a3a3a"; ctx.fillRect(-4,0,8,18);
      ctx.fillStyle="#555"; ctx.fillRect(-3,1,6,14);
      ctx.fillStyle="#222"; ctx.fillRect(-3,12,6,5);
      ctx.restore();

      // Stylus with glow
      const stylusAngle=armAngle+0.15;
      const nX=tipX+Math.cos(stylusAngle)*20, nY=tipY+Math.sin(stylusAngle)*20;
      ctx.strokeStyle=color; ctx.lineWidth=1.5;
      ctx.beginPath(); ctx.moveTo(tipX+Math.cos(stylusAngle)*14,tipY+Math.sin(stylusAngle)*14); ctx.lineTo(nX,nY); ctx.stroke();
      ctx.shadowColor=color; ctx.shadowBlur=8;
      ctx.fillStyle=color; ctx.beginPath(); ctx.arc(nX,nY,2,0,Math.PI*2); ctx.fill();
      ctx.shadowBlur=0;

      ctx.restore();

      // ── Pitch fader slot ──
      ctx.fillStyle = "#111";
      ctx.roundRect(W*0.86, H*0.3, 8, H*0.5, 4);
      ctx.fill();
      ctx.fillStyle = "#444";
      ctx.roundRect(W*0.84, H*0.3+H*0.5*(1-progress)-4, 12, 12, 3);
      ctx.fill();
      ctx.fillStyle = "#ddd";
      ctx.roundRect(W*0.845, H*0.3+H*0.5*(1-progress)-2, 10, 8, 2);
      ctx.fill();

      // ── Start/Stop button ──
      ctx.fillStyle = playing ? "#ff4444" : "#444";
      ctx.beginPath(); ctx.arc(W*0.15, H*0.85, 14, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = playing ? "#ff8888" : "#666";
      ctx.beginPath(); ctx.arc(W*0.15, H*0.85, 9, 0, Math.PI*2); ctx.fill();

      // ── RPM label ──
      ctx.fillStyle = "#555";
      ctx.font = "9px JetBrains Mono, monospace";
      ctx.textAlign = "left";
      ctx.fillText("33 ⅓", W*0.72, H*0.88);
      ctx.fillText("45", W*0.72, H*0.93);

      if (playing) rot.current += 0.018;
      raf.current = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(raf.current);
  }, [playing, progress, color, label]);

  return <canvas ref={cvs} width={260} height={260} style={{display:"block",borderRadius:"50%",margin:"0 auto"}} />;
});

// ── Waveform ──
const Waveform = React.memo(({ deck, color }) => {
  const cvs = useRef(null), raf = useRef(null);
  useEffect(() => {
    const c = cvs.current; if (!c) return;
    const ctx = c.getContext("2d"); const w=c.width, h=c.height;
    const draw = () => {
      ctx.fillStyle="#06060f"; ctx.fillRect(0,0,w,h);
      const freq=deck.getFreq(); const bw=w/freq.length;
      for (let i=0;i<freq.length;i++) {
        const v=freq[i]/255, bh=v*h*0.9;
        ctx.fillStyle=`hsla(${160+v*80},100%,${25+v*45}%,${0.4+v*0.6})`;
        ctx.fillRect(i*bw, h-bh, bw-0.5, bh);
      }
      if (deck.buffer) {
        const p=deck.currentTime()/deck.duration(), x=p*w;
        ctx.strokeStyle="#fff"; ctx.lineWidth=1.5; ctx.globalAlpha=0.85;
        ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,h); ctx.stroke();
        ctx.globalAlpha=1;
        const cx2=(deck.cuePoint/deck.duration())*w;
        ctx.strokeStyle="#ffcc00"; ctx.lineWidth=1; ctx.setLineDash([3,3]);
        ctx.beginPath(); ctx.moveTo(cx2,0); ctx.lineTo(cx2,h); ctx.stroke();
        ctx.setLineDash([]);
        deck.hotcues.forEach((hc,i)=>{
          if(hc===null)return;
          const hx=(hc/deck.duration())*w;
          const hcc=["#ff4466","#00aaff","#00ff88","#ff8800"];
          ctx.strokeStyle=hcc[i]; ctx.lineWidth=1.5;
          ctx.beginPath(); ctx.moveTo(hx,0); ctx.lineTo(hx,h); ctx.stroke();
          ctx.fillStyle=hcc[i]; ctx.fillRect(hx-4,0,8,8);
        });
      }
      raf.current=requestAnimationFrame(draw);
    };
    draw(); return ()=>cancelAnimationFrame(raf.current);
  },[deck,color]);
  return <canvas ref={cvs} width={400} height={72} className="dj-waveform"/>;
});

// ── VU Meter ──
const VU = React.memo(({deck})=>{
  const cvs=useRef(null),raf=useRef(null);
  useEffect(()=>{
    const c=cvs.current; if(!c)return;
    const ctx=c.getContext("2d");
    const draw=()=>{
      const d=deck.getFreq(); const avg=d.reduce((a,b)=>a+b,0)/d.length/255;
      const w=c.width,h=c.height; ctx.clearRect(0,0,w,h);
      const n=24,sh=h/n-1,active=Math.round(avg*n);
      for(let i=0;i<n;i++){
        const y=h-(i+1)*(h/n);
        ctx.fillStyle=i>=active?"#111122":i>20?"#ff3366":i>16?"#ffcc00":"#00ffcc";
        ctx.fillRect(1,y,w-2,sh);
      }
      raf.current=requestAnimationFrame(draw);
    };
    draw(); return()=>cancelAnimationFrame(raf.current);
  },[deck]);
  return <canvas ref={cvs} width={18} height={120} className="dj-vu"/>;
});

// ── Knob ──
const Knob=({label,value,min,max,onChange,color="#00ffcc",size=44})=>{
  const drag=useRef({on:false});
  const angle=((value-min)/(max-min))*270-135;
  const onDown=useCallback(e=>{
    drag.current={on:true,sy:e.clientY,sv:value};
    const mv=ev=>{if(!drag.current.on)return;const d=(drag.current.sy-ev.clientY)/120;onChange(Math.max(min,Math.min(max,drag.current.sv+d*(max-min))));};
    const up=()=>{drag.current.on=false;window.removeEventListener("mousemove",mv);window.removeEventListener("mouseup",up);};
    window.addEventListener("mousemove",mv);window.addEventListener("mouseup",up);
  },[value,min,max,onChange]);
  return(
    <div className="dj-knob-wrap">
      <div className="dj-knob" onMouseDown={onDown} style={{"--ka":`${angle}deg`,"--kc":color,width:size,height:size}}><div className="dj-knob-dot"/></div>
      <span className="dj-knob-lbl">{label}</span>
      <span className="dj-knob-val">{value>0?`+${value.toFixed(0)}`:value.toFixed(0)}</span>
    </div>
  );
};

// ── Deck class ──
class Deck {
  constructor(id){
    this.id=id;this.buffer=null;this.source=null;this.gainNode=null;
    this.eqLow=null;this.eqMid=null;this.eqHigh=null;this.analyser=null;
    this.fxChain=[];this.fxNodes={};
    this.startTime=0;this.pauseOffset=0;this.playing=false;
    this.bpm=null;this.key=null;this.cuePoint=0;
    this.hotcues=[null,null,null,null];
    this.loop=false;this.loopStart=0;this.loopEnd=4;this.pitch=1.0;
    this.slip=false;this.slipOffset=0;
    this.title="";this.artwork=null;this.audioType="original";
    this.fxDry=null;this.fxWet=null;
  }
  setup(out){
    const c=getCtx();
    this.gainNode=c.createGain();this.gainNode.gain.value=1;
    this.eqLow=c.createBiquadFilter();this.eqLow.type="lowshelf";this.eqLow.frequency.value=200;
    this.eqMid=c.createBiquadFilter();this.eqMid.type="peaking";this.eqMid.frequency.value=1000;this.eqMid.Q.value=1;
    this.eqHigh=c.createBiquadFilter();this.eqHigh.type="highshelf";this.eqHigh.frequency.value=3000;
    this.analyser=c.createAnalyser();this.analyser.fftSize=512;
    this.fxDry=c.createGain();this.fxDry.gain.value=1;
    this.fxWet=c.createGain();this.fxWet.gain.value=0;
    this.gainNode.connect(this.eqLow);this.eqLow.connect(this.eqMid);this.eqMid.connect(this.eqHigh);
    this.eqHigh.connect(this.analyser);this.analyser.connect(this.fxDry);
    this.fxDry.connect(out);this.fxWet.connect(out);
    this._out=out;
  }
  async loadBuffer(ab){this.buffer=await getCtx().decodeAudioData(ab);this.pauseOffset=0;this.bpm=await detectBPM(this.buffer);return this.bpm;}
  async loadURL(url){const r=await fetch(url);return this.loadBuffer(await r.arrayBuffer());}
  play(off){
    if(!this.buffer)return;const c=getCtx();
    if(c.state==="suspended")c.resume();this._stop();
    this.source=c.createBufferSource();this.source.buffer=this.buffer;
    this.source.playbackRate.value=this.pitch;
    if(this.loop){this.source.loop=true;this.source.loopStart=this.loopStart;this.source.loopEnd=this.loopEnd;}
    this.source.connect(this.gainNode);
    const o=off!==undefined?off:this.pauseOffset;
    this.source.start(0,Math.max(0,o));this.startTime=c.currentTime-o;this.playing=true;
  }
  pause(){if(!this.playing)return;this.pauseOffset=this.currentTime();this._stop();this.playing=false;}
  setCue(){this.cuePoint=this.currentTime();}
  jumpCue(){this.pauseOffset=this.cuePoint;if(this.playing)this.play(this.cuePoint);}
  jumpHotcue(i){if(this.hotcues[i]===null){this.hotcues[i]=this.currentTime();return;}this.pauseOffset=this.hotcues[i];if(this.playing)this.play(this.hotcues[i]);}
  beatJump(beats){
    if(!this.buffer||!this.bpm)return;
    const beatSec=60/this.bpm;
    const t=Math.max(0,Math.min(this.duration(),this.currentTime()+beats*beatSec));
    this.pauseOffset=t;if(this.playing)this.play(t);
  }
  currentTime(){if(!this.playing)return this.pauseOffset;return Math.min(getCtx().currentTime-this.startTime,this.duration());}
  duration(){return this.buffer?this.buffer.duration:0;}
  setGain(v){if(this.gainNode)this.gainNode.gain.value=v;}
  setEQ(b,db){const n=b==="low"?this.eqLow:b==="mid"?this.eqMid:this.eqHigh;if(n)n.gain.value=db;}
  setFX(type,wet){
    const c=getCtx();
    // Remove old FX
    if(this.currentFX){try{this.currentFX.disconnect();}catch(_){}}
    this.fxWet.gain.value=wet;
    this.fxDry.gain.value=1-wet*0.5;
    if(wet===0||type==="Off")return;
    let node;
    if(type==="Filter"){node=c.createBiquadFilter();node.type="lowpass";node.frequency.value=200+wet*3000;}
    else if(type==="Echo"){node=c.createDelay(2);node.delayTime.value=60/((this.bpm||120)*2);}
    else if(type==="Reverb"){node=c.createConvolver();}
    else if(type==="Flanger"){node=c.createDelay(0.1);node.delayTime.value=0.003+wet*0.007;}
    else if(type==="Crush"){node=c.createWaveShaper();const curve=new Float32Array(256);for(let i=0;i<256;i++){const x=i*2/256-1;curve[i]=Math.round(x*(1+wet*16))/(1+wet*16);}node.curve=curve;}
    else{node=c.createGain();}
    if(node){
      this.eqHigh.disconnect();
      this.eqHigh.connect(node);
      node.connect(this.fxWet);
      this.eqHigh.connect(this.fxDry);
      this.currentFX=node;
    }
  }
  _stop(){try{if(this.source){this.source.stop();this.source.disconnect();}}catch(_){}this.source=null;}
  getFreq(){if(!this.analyser)return new Uint8Array(64);const d=new Uint8Array(this.analyser.frequencyBinCount);this.analyser.getByteFrequencyData(d);return d;}
}

const deckA=new Deck("A"),deckB=new Deck("B");

// ── Sampler Pads ──
const SamplerPads=({audioCtx,masterOut})=>{
  const [pads,setPads]=useState(Array(8).fill(null).map((_,i)=>({name:`Pad ${i+1}`,buffer:null,color:["#ff4466","#ff8800","#ffcc00","#00ff88","#00ffcc","#00aaff","#aa44ff","#ff44aa"][i]})));
  const sources=useRef({});
  const loadPad=async(i,file)=>{
    const ab=await file.arrayBuffer();
    const buf=await audioCtx().decodeAudioData(ab);
    setPads(p=>{const u=[...p];u[i]={...u[i],buffer:buf,name:file.name.replace(/\.[^.]+$/,"").slice(0,12)};return u;});
  };
  const triggerPad=useCallback((i)=>{
    const pad=pads[i];if(!pad.buffer)return;
    const c=audioCtx();if(c.state==="suspended")c.resume();
    try{sources.current[i]?.stop();}catch(_){}
    const src=c.createBufferSource();src.buffer=pad.buffer;
    const g=c.createGain();g.gain.value=0.8;
    src.connect(g);g.connect(masterOut.current||c.destination);
    src.start();sources.current[i]=src;
  },[pads,audioCtx,masterOut]);
  return(
    <div className="dj-sampler">
      <div className="dj-sampler-label">SP-8 SAMPLER</div>
      <div className="dj-sampler-grid">
        {pads.map((pad,i)=>(
          <div key={i} className="dj-pad-wrap">
            <button
              className={`dj-pad ${pad.buffer?"loaded":""}`}
              style={{"--pc":pad.color}}
              onMouseDown={()=>triggerPad(i)}
            >
              <span className="dj-pad-name">{pad.name}</span>
            </button>
            <label className="dj-pad-load">
              <input type="file" accept="audio/*" style={{display:"none"}} onChange={e=>e.target.files[0]&&loadPad(i,e.target.files[0])}/>
              +
            </label>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── FX Panel ──
const FXPanel=({deck,ds,upd,id})=>{
  const [fx,setFx]=useState("Filter");
  const [wet,setWet]=useState(0);
  return(
    <div className="dj-fx-panel">
      <div className="dj-fx-label">FX</div>
      <div className="dj-fx-row">
        <select className="dj-fx-sel" value={fx} onChange={e=>{setFx(e.target.value);deck.setFX(e.target.value,wet);}}>
          {FX_TYPES.map(f=><option key={f}>{f}</option>)}
        </select>
        <input type="range" className="dj-fx-knob" min={0} max={1} step={0.01} value={wet}
          onChange={e=>{const v=parseFloat(e.target.value);setWet(v);deck.setFX(fx,v);}}/>
        <span className="dj-fx-val">{Math.round(wet*100)}%</span>
        <button className="dj-fx-off" onClick={()=>{setWet(0);deck.setFX(fx,0);}}>OFF</button>
      </div>
    </div>
  );
};

// ── Beat Jump ──
const BeatJump=({deck})=>(
  <div className="dj-beatjump">
    {[-32,-16,-8,-4,-2,-1,1,2,4,8,16,32].map(b=>(
      <button key={b} className={`dj-bj ${b<0?"bj-back":"bj-fwd"}`}
        onClick={()=>deck.beatJump(b)}>
        {b>0?`+${b}`:b}
      </button>
    ))}
  </div>
);

// ── Main Component ──
export default function DJMixer(){
  const {store}=useContext(Context);
  const [rdy,setRdy]=useState(false);
  const [xf,setXf]=useState(0.5);
  const [mvol,setMvol]=useState(1);
  const [ds,setDs]=useState({
    A:{playing:false,loaded:false,bpm:null,key:null,title:"",artwork:null,audioType:"original",vol:1,low:0,mid:0,high:0,pitch:1,loop:false,hotcues:[null,null,null,null],slip:false,fx:"Filter",fxWet:0,stems:null,stemsLoading:false,stemVols:{},stemMutes:{}},
    B:{playing:false,loaded:false,bpm:null,key:null,title:"",artwork:null,audioType:"original",vol:1,low:0,mid:0,high:0,pitch:1,loop:false,hotcues:[null,null,null,null],slip:false,fx:"Filter",fxWet:0,stems:null,stemsLoading:false,stemVols:{},stemMutes:{}},
  });
  const [lib,setLib]=useState([]);
  const [lf,setLf]=useState("all");
  const [ls,setLs]=useState("");
  const [ldDeck,setLdDeck]=useState(null);
  const [urlI,setUrlI]=useState({A:"",B:""});
  const [showUrl,setShowUrl]=useState({A:false,B:false});
  const [rec,setRec]=useState(false);
  const [recBlob,setRecBlob]=useState(null);
  const [master,setMaster]=useState("A");
  const [prog,setProg]=useState({A:0,B:0});
  const [saveModal,setSaveModal]=useState(false);
  const [mixTitle,setMixTitle]=useState("");
  const [saving,setSaving]=useState(false);
  const [activeTab,setActiveTab]=useState("decks");
  const [midiEnabled,setMidiEnabled]=useState(false);
  const [controllerProfile,setControllerProfile]=useState("Custom");
  const [showProfilePicker,setShowProfilePicker]=useState(false);
  const [midiMap,setMidiMap]=useState({
    // CC -> action mapping (customizable)
    1:  "xfader",    // mod wheel -> crossfader
    7:  "vol_a",     // ch7 -> deck A volume
    8:  "vol_b",     // ch8 -> deck B volume
    10: "low_a",     // ch10 -> deck A low EQ
    11: "mid_a",     // ch11 -> deck A mid EQ
    74: "filter_a",  // ch74 -> deck A filter
  }); // decks | sampler
  const mgRef=useRef(null),xgA=useRef(null),xgB=useRef(null),recRef=useRef(null),chunks=useRef([]),rafRef=useRef(null);

  const initAudio=useCallback(()=>{
    if(rdy)return;const c=getCtx();
    const mg=c.createGain();mg.gain.value=mvol;
    const ga=c.createGain(),gb=c.createGain();
    ga.connect(mg);gb.connect(mg);mg.connect(c.destination);
    mgRef.current=mg;xgA.current=ga;xgB.current=gb;
    deckA.setup(ga);deckB.setup(gb);setRdy(true);
  },[rdy,mvol]);

  useEffect(()=>{if(!xgA.current)return;xgA.current.gain.value=Math.cos(xf*Math.PI/2);xgB.current.gain.value=Math.sin(xf*Math.PI/2);},[xf]);
  useEffect(()=>{if(mgRef.current)mgRef.current.gain.value=mvol;},[mvol]);
  useEffect(()=>{
    const tick=()=>{setProg({A:deckA.buffer?Math.min(deckA.currentTime()/deckA.duration(),1):0,B:deckB.buffer?Math.min(deckB.currentTime()/deckB.duration(),1):0});rafRef.current=requestAnimationFrame(tick);};
    tick();return()=>cancelAnimationFrame(rafRef.current);
  },[]);

  useEffect(()=>{
    const token=store?.token||localStorage.getItem("token");if(!token)return;
    Promise.all([
      fetch(`${BACKEND}/api/audio/my-tracks`,{headers:{Authorization:`Bearer ${token}`}}).then(r=>r.ok?r.json():[]).catch(()=>[]),
      fetch(`${BACKEND}/api/beats/my-beats`,{headers:{Authorization:`Bearer ${token}`}}).then(r=>r.ok?r.json():[]).catch(()=>[]),
    ]).then(([audio,beats])=>{
      const bm=(beats||[]).map(b=>({id:`beat_${b.id}`,title:b.title||"Beat",file_url:b.audio_url||b.file_url,audio_url:b.audio_url||b.file_url,audio_type:"beat",bpm:b.bpm,key:b.key,genre:b.genre,artwork_url:b.artwork_url||b.cover_art_url,source:"beat"}));
      const all=[...(audio||[]),...bm];const seen=new Set();
      setLib(all.filter(t=>{const k=`${t.title}_${t.file_url}`;if(seen.has(k))return false;seen.add(k);return true;}));
    });
  },[store]);

  const upd=(id,p)=>setDs(prev=>({...prev,[id]:{...prev[id],...p}}));

  const loadLib=async(id,t)=>{
    initAudio();const url=t.audio_url||t.file_url||t.r2_url;if(!url)return;
    setLdDeck(id);const dk=id==="A"?deckA:deckB;
    try{
      const bpm=await dk.loadURL(url);
      dk.title=t.title;dk.artwork=t.artwork_url;dk.audioType=t.audio_type||"original";dk.bpm=bpm||t.bpm;dk.key=t.key;
      upd(id,{loaded:true,bpm:dk.bpm,key:t.key,title:t.title,artwork:t.artwork_url,audioType:dk.audioType,hotcues:[null,null,null,null]});
    }catch(e){console.error(e);}
    setLdDeck(null);
  };

  const loadFile=async(id,file)=>{
    initAudio();setLdDeck(id);const dk=id==="A"?deckA:deckB;
    try{
      const bpm=await dk.loadBuffer(await file.arrayBuffer());
      dk.title=file.name.replace(/\.[^.]+$/,"");
      upd(id,{loaded:true,bpm,key:null,title:dk.title,artwork:null,audioType:"original",hotcues:[null,null,null,null]});
    }catch(e){console.error(e);}
    setLdDeck(null);
  };

  const loadURL=async(id)=>{
    const url=urlI[id];if(!url)return;
    initAudio();setLdDeck(id);const dk=id==="A"?deckA:deckB;
    try{
      const bpm=await dk.loadURL(url);
      const name=url.split("/").pop().split("?")[0].replace(/\.[^.]+$/,"");
      upd(id,{loaded:true,bpm,key:null,title:name,artwork:null,audioType:"original",hotcues:[null,null,null,null]});
      setShowUrl(p=>({...p,[id]:false}));setUrlI(p=>({...p,[id]:""}));
    }catch(e){alert("Failed to load");}
    setLdDeck(null);
  };

  const togglePlay=(id)=>{
    initAudio();const dk=id==="A"?deckA:deckB;if(!dk.buffer)return;
    if(dk.playing){dk.pause();upd(id,{playing:false});}
    else{dk.play();upd(id,{playing:true});}
  };

  const syncBPM=()=>{
    if(!deckA.bpm||!deckB.bpm)return;
    const mk=master==="A"?deckA:deckB,sl=master==="A"?deckB:deckA,sid=master==="A"?"B":"A";
    const ratio=mk.bpm/sl.bpm;sl.pitch=ratio;
    if(sl.source)sl.source.playbackRate.value=ratio;
    upd(sid,{pitch:ratio});
  };

  const startRec=()=>{
    initAudio();const c=getCtx();const dest=c.createMediaStreamDestination();
    mgRef.current.connect(dest);
    const r=new MediaRecorder(dest.stream,{mimeType:"audio/webm"});
    chunks.current=[];r.ondataavailable=e=>chunks.current.push(e.data);
    r.onstop=()=>setRecBlob(new Blob(chunks.current,{type:"audio/webm"}));
    r.start();recRef.current=r;setRec(true);
  };
  const stopRec=()=>{if(recRef.current)recRef.current.stop();setRec(false);};
  const dlMix=()=>{if(!recBlob)return;const a=document.createElement("a");a.href=URL.createObjectURL(recBlob);a.download=`${mixTitle||"mix"}_${Date.now()}.webm`;a.click();};

  const saveMix=async()=>{
    if(!recBlob)return;setSaving(true);
    const token=store?.token||localStorage.getItem("token");
    try{
      const pr=await fetch(`${BACKEND}/api/r2/presign`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},body:JSON.stringify({filename:`mix_${Date.now()}.webm`,content_type:"audio/webm",folder:"mixes"})});
      const{upload_url,public_url}=await pr.json();
      await fetch(upload_url,{method:"PUT",body:recBlob,headers:{"Content-Type":"audio/webm"}});
      const sv=await fetch(`${BACKEND}/api/audio/upload`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},body:JSON.stringify({title:mixTitle||`DJ Mix ${new Date().toLocaleDateString()}`,file_url:public_url,audio_type:"mix",is_public:false})});
      if(sv.ok){alert("✅ Mix saved!");setSaveModal(false);setMixTitle("");}
      else throw new Error("Save failed");
    }catch(e){alert("Error: "+e.message);}
    setSaving(false);
  };

  // ── Stream destinations state ──
  const [streamDests, setStreamDests] = useState({streampirex:false, twitch:false, youtube:false});
  const streamRefs = useRef({});

  const applyControllerProfile = React.useCallback((profileName) => {
    const profile = CONTROLLER_PROFILES[profileName];
    if (!profile) return;
    setMidiMap(profile.map);
    setControllerProfile(profileName);
    setShowProfilePicker(false);
  }, []);

  const toggleStream = useCallback(async (destId) => {
    const token = store?.token || localStorage.getItem("token");
    if (streamDests[destId]) {
      // Stop stream
      try {
        await fetch(`${BACKEND}/api/live-stream/stop`, {
          method:"POST", headers:{"Content-Type":"application/json", Authorization:`Bearer ${token}`},
          body: JSON.stringify({destination: destId})
        });
      } catch(e) { console.error("Stop stream error:", e); }
      setStreamDests(p=>({...p,[destId]:false}));
    } else {
      // Start stream — capture master audio + visualizer canvas
      try {
        const c = getCtx();
        const dest = c.createMediaStreamDestination();
        mgRef.current?.connect(dest);
        const audioTrack = dest.stream.getAudioTracks()[0];
        // Get video from a hidden canvas for visualizer
        const vizCanvas = document.querySelector(".dj-waveform");
        let stream;
        if (vizCanvas) {
          const videoStream = vizCanvas.captureStream(30);
          stream = new MediaStream([videoStream.getVideoTracks()[0], audioTrack]);
        } else {
          stream = dest.stream;
        }
        streamRefs.current[destId] = stream;
        // Notify backend to start RTMP relay if Twitch/YouTube
        if (destId !== "streampirex") {
          await fetch(`${BACKEND}/api/live-stream/start-rtmp`, {
            method:"POST", headers:{"Content-Type":"application/json", Authorization:`Bearer ${token}`},
            body: JSON.stringify({destination: destId, title: `DJ Mix — Live`, stream_key: null})
          }).catch(e => console.warn("RTMP relay:", e.message));
        } else {
          // Start StreamPireX live stream
          await fetch(`${BACKEND}/api/live-stream/create`, {
            method:"POST", headers:{"Content-Type":"application/json", Authorization:`Bearer ${token}`},
            body: JSON.stringify({title:`DJ Mix — Live`, type:"audio", is_live:true})
          }).catch(e => console.warn("SPX stream:", e.message));
        }
        setStreamDests(p=>({...p,[destId]:true}));
      } catch(e) {
        console.error("Stream start error:", e);
        alert("Could not start stream: " + e.message);
      }
    }
  }, [streamDests, store]);

  // ── Stem separation ──
  const handleStemSeparate = useCallback(async (id) => {
    const dk = id==="A" ? deckA : deckB;
    const s = id==="A" ? ds.A : ds.B;
    if (!dk.buffer || !s.loaded) return;
    upd(id, {stemsLoading:true});
    const token = store?.token || localStorage.getItem("token");
    try {
      const c = getCtx();
      // Encode buffer to WAV
      const numCh=dk.buffer.numberOfChannels, sr=dk.buffer.sampleRate, len=dk.buffer.length;
      const wavBuf=new ArrayBuffer(44+len*numCh*2);
      const view=new DataView(wavBuf);
      const writeStr=(o,s)=>{for(let i=0;i<s.length;i++)view.setUint8(o+i,s.charCodeAt(i));};
      writeStr(0,"RIFF"); view.setUint32(4,36+len*numCh*2,true); writeStr(8,"WAVE"); writeStr(12,"fmt ");
      view.setUint32(16,16,true); view.setUint16(20,1,true); view.setUint16(22,numCh,true);
      view.setUint32(24,sr,true); view.setUint32(28,sr*numCh*2,true); view.setUint16(32,numCh*2,true);
      view.setUint16(34,16,true); writeStr(36,"data"); view.setUint32(40,len*numCh*2,true);
      let offset=44;
      for(let i=0;i<len;i++) for(let ch=0;ch<numCh;ch++){
        const samp=Math.max(-1,Math.min(1,dk.buffer.getChannelData(ch)[i]));
        view.setInt16(offset,samp<0?samp*0x8000:samp*0x7FFF,true); offset+=2;
      }
      const blob=new Blob([wavBuf],{type:"audio/wav"});
      const form=new FormData(); form.append("audio",blob,"deck_"+id+".wav"); form.append("model","htdemucs");
      const res=await fetch(`${BACKEND}/api/ai/stems/separate-upload`,{method:"POST",headers:{Authorization:`Bearer ${token}`},body:form});
      if(!res.ok) throw new Error("Stem separation failed — "+res.status);
      const data=await res.json();
      const stemUrls={drums:data.drums_url,bass:data.bass_url,vocals:data.vocals_url,other:data.other_url};
      const stems={};
      const out=id==="A"?xgA.current:xgB.current;
      for(const [name,url] of Object.entries(stemUrls)){
        if(!url) continue;
        const r=await fetch(url); const ab=await r.arrayBuffer();
        const buf=await c.decodeAudioData(ab);
        const gn=c.createGain(); gn.gain.value=1; gn.connect(out||c.destination);
        stems[name+"_buf"]=buf; stems[name+"_gain"]=gn;
      }
      upd(id,{stems,stemsLoading:false,stemVols:{drums:1,bass:1,vocals:1,other:1},stemMutes:{}});
    } catch(e){
      console.error("Stems error:",e);
      upd(id,{stemsLoading:false});
      alert("Stem separation failed: "+e.message);
    }
  }, [ds, store]);

  const handleMidiCC = useCallback((cc, val) => {
    const norm = val / 127;
    const action = midiMap[cc];
    if (!action) return;
    switch(action) {
      case "xfader":   setXf(norm); break;
      case "vol_a":    deckA.setGain(norm*1.5); upd("A",{vol:norm*1.5}); break;
      case "vol_b":    deckB.setGain(norm*1.5); upd("B",{vol:norm*1.5}); break;
      case "low_a":    deckA.setEQ("low",(norm-0.5)*24); upd("A",{low:(norm-0.5)*24}); break;
      case "mid_a":    deckA.setEQ("mid",(norm-0.5)*24); upd("A",{mid:(norm-0.5)*24}); break;
      case "high_a":   deckA.setEQ("high",(norm-0.5)*24); upd("A",{high:(norm-0.5)*24}); break;
      case "low_b":    deckB.setEQ("low",(norm-0.5)*24); upd("B",{low:(norm-0.5)*24}); break;
      case "filter_a": deckA.setFX("Filter",norm); break;
      case "filter_b": deckB.setFX("Filter",norm); break;
      default: break;
    }
  }, [midiMap, xf]);

  const handleMidiNote = useCallback((note, vel, deckId) => {
    const dk = deckId === "B" ? deckB : deckA;
    // Pad notes 36-43 = hot cues 1-8
    if (note >= 36 && note <= 43) {
      const hcIdx = note - 36;
      if (hcIdx < 4) { dk.jumpHotcue(hcIdx); upd(deckId,{hotcues:[...dk.hotcues]}); }
    }
    // Note 44 = play/pause A, 45 = play/pause B
    if (note === 44) togglePlay("A");
    if (note === 45) togglePlay("B");
    // Note 46 = sync
    if (note === 46) syncBPM();
    // Note 47 = cue A
    if (note === 47) { deckA.setCue(); upd("A",{}); }
    if (note === 48) { deckB.setCue(); upd("B",{}); }
  }, []);

  const HC_COLORS=["#ff4466","#00aaff","#00ff88","#ff8800"];

  const renderDeck=(id)=>{
    const dk=id==="A"?deckA:deckB,s=ds[id];
    const color=id==="A"?"#00ffcc":"#ff6b35";
    const p=prog[id],cam=s.key?CAMELOT[s.key]:null;
    return(
      <div className={`dj-deck dj-deck-${id.toLowerCase()}`}>

        {/* ── Track Info ── */}
        <div className="dj-deck-hd">
          <div className="dj-deck-letter" style={{color}}>{id}</div>
          <div className="dj-deck-info">
            <div className="dj-track-name">{s.title||"No track loaded"}</div>
            <div className="dj-track-meta">
              {s.bpm&&<span className="dj-badge" style={{borderColor:color}}>{Math.round(s.bpm)} BPM</span>}
              {cam&&<span className="dj-badge dj-cam">{cam}</span>}
              {s.key&&<span className="dj-badge dj-key">{s.key}</span>}
              {id===master&&<span className="dj-badge dj-mst">MASTER</span>}
            </div>
          </div>
          {s.artwork&&<img src={s.artwork} alt="" className="dj-art"/>}
          {s.loaded&&(
            <button className={`dj-stems-btn ${s.stemsLoading?"loading":""} ${s.stems?"active":""}`}
              onClick={()=>handleStemSeparate(id)} title="AI Stem Separation">
              {s.stemsLoading?"⏳":"🎚"} STEMS
            </button>
          )}
        </div>

        {/* ── Stem Mixer ── */}
        {s.stems&&(
          <div className="dj-stem-mixer">
            <div className="dj-stem-label">STEMS — {s.title}</div>
            {[["🥁","drums","#ff4466"],["🎸","bass","#ff8800"],["🎤","vocals","#00aaff"],["🎹","other","#00ffc8"]].map(([icon,stem,sc])=>(
              <div key={stem} className="dj-stem-ch">
                <span className="dj-stem-icon">{icon}</span>
                <input type="range" className="dj-stem-fader" min={0} max={1} step={0.01}
                  value={s.stemVols?.[stem]??1} style={{"--sc":sc}}
                  onChange={e=>{
                    const v=parseFloat(e.target.value);
                    upd(id,{stemVols:{...(s.stemVols||{}),[stem]:v}});
                    if(s.stems?.[stem+"_gain"])s.stems[stem+"_gain"].gain.value=v;
                  }}/>
                <button className={`dj-stem-mute ${s.stemMutes?.[stem]?"muted":""}`}
                  style={{"--sc":sc}}
                  onClick={()=>{
                    const muted=!(s.stemMutes?.[stem]);
                    upd(id,{stemMutes:{...(s.stemMutes||{}),[stem]:muted}});
                    if(s.stems?.[stem+"_gain"])s.stems[stem+"_gain"].gain.value=muted?0:(s.stemVols?.[stem]??1);
                  }}>
                  {s.stemMutes?.[stem]?"M":"—"}
                </button>
                <span className="dj-stem-lbl">{stem}</span>
              </div>
            ))}
          </div>
        )}

        {/* ── Technics 1200 Turntable ── */}
        <div className="dj-turntable-wrap">
          <Turntable playing={s.playing} progress={p} color={color} label={id==="A"?"DECK A":"DECK B"}/>
        </div>

        {/* ── Waveform ── */}
        <Waveform deck={dk} color={color}/>

        {/* ── Progress ── */}
        <div className="dj-prog-wrap">
          <div className="dj-prog"><div className="dj-prog-f" style={{width:`${p*100}%`,background:color}}/></div>
          <div className="dj-prog-t"><span>{fmt(dk.currentTime())}</span><span style={{color:"#555"}}>-{fmt(dk.duration()-dk.currentTime())}</span></div>
        </div>

        {/* ── Hot Cues ── */}
        <div className="dj-hcues">
          {[0,1,2,3].map(i=>(
            <button key={i} className={`dj-hc ${s.hotcues[i]!==null?"set":""}`} style={{"--hcc":HC_COLORS[i]}}
              onClick={()=>{dk.jumpHotcue(i);upd(id,{hotcues:[...dk.hotcues]});}}
              onContextMenu={e=>{e.preventDefault();dk.hotcues[i]=null;upd(id,{hotcues:[...dk.hotcues]});}}
              title={s.hotcues[i]!==null?`HC${i+1}: ${fmt(s.hotcues[i])} (right-click=clear)`:`Set HC${i+1}`}>{i+1}</button>
          ))}
          <button className="dj-btn dj-cue" onClick={()=>{dk.setCue();upd(id,{});}}>CUE</button>
          <button className="dj-btn dj-cjump" onClick={()=>dk.jumpCue()}>◀CUE</button>
          <button className={`dj-btn ${s.slip?"dj-slip-on":""}`} onClick={()=>upd(id,{slip:!s.slip})} title="Slip Mode">SLIP</button>
        </div>

        {/* ── Beat Jump ── */}
        <BeatJump deck={dk}/>

        {/* ── Transport ── */}
        <div className="dj-transport">
          <button className={`dj-play ${s.playing?"on":""}`} style={{"--pc":color}} onClick={()=>togglePlay(id)} disabled={!s.loaded}>
            {s.playing?"⏸":"▶"}
          </button>
          <button className={`dj-btn dj-loop ${s.loop?"on":""}`} onClick={()=>{dk.loop=!dk.loop;if(dk.source)dk.source.loop=dk.loop;upd(id,{loop:dk.loop});}}>🔁</button>
          <div className="dj-loop-sz">
            {[1,2,4,8].map(b=>(
              <button key={b} className="dj-lsz" onClick={()=>{
                if(!dk.buffer)return;
                const beat=dk.bpm?60/dk.bpm:0.5;
                dk.loopStart=dk.currentTime();dk.loopEnd=dk.loopStart+beat*b*4;
                dk.loop=true;if(dk.source){dk.source.loop=true;dk.source.loopStart=dk.loopStart;dk.source.loopEnd=dk.loopEnd;}
                upd(id,{loop:true});
              }}>{b}</button>
            ))}
          </div>
        </div>

        {/* ── EQ ── */}
        <div className="dj-eq-row">
          <Knob label="HI" value={s.high} min={-12} max={12} color={color} onChange={v=>{dk.setEQ("high",v);upd(id,{high:v});}}/>
          <Knob label="MID" value={s.mid} min={-12} max={12} color={color} onChange={v=>{dk.setEQ("mid",v);upd(id,{mid:v});}}/>
          <Knob label="LOW" value={s.low} min={-12} max={12} color={color} onChange={v=>{dk.setEQ("low",v);upd(id,{low:v});}}/>
          <Knob label="GAIN" value={s.vol} min={0} max={1.5} step={0.01} color={color} onChange={v=>{dk.setGain(v);upd(id,{vol:v});}}/>
          <VU deck={dk}/>
        </div>

        {/* ── FX ── */}
        <FXPanel deck={dk} ds={s} upd={upd} id={id}/>

        {/* ── Pitch Fader ── */}
        <div className="dj-faders">
          <div className="dj-fg">
            <label className="dj-fl">PITCH {((s.pitch-1)*100).toFixed(1)}%</label>
            <input type="range" className="dj-fader dj-pitch" min="0.85" max="1.15" step="0.001" value={s.pitch}
              onChange={e=>{const v=parseFloat(e.target.value);dk.pitch=v;if(dk.source)dk.source.playbackRate.value=v;upd(id,{pitch:v});}}/>
            <button className="dj-prst" onClick={()=>{dk.pitch=1;if(dk.source)dk.source.playbackRate.value=1;upd(id,{pitch:1});}}>⊙</button>
          </div>
          <div className="dj-fg">
            <label className="dj-fl">VOL</label>
            <input type="range" className="dj-fader" min="0" max="1.5" step="0.01" value={s.vol} style={{"--fc":color}}
              onChange={e=>{const v=parseFloat(e.target.value);dk.setGain(v);upd(id,{vol:v});}}/>
            <span className="dj-fv">{Math.round(s.vol*100)}%</span>
          </div>
        </div>

        {/* ── DVS Timecode ── */}
        <DVSTimecode
          deckId={id}
          color={color}
          audioCtx={getCtx}
          onPitch={(p) => {
            dk.pitch = Math.abs(p);
            if (dk.source) dk.source.playbackRate.value = Math.abs(p);
            upd(id, {pitch: Math.abs(p)});
            // Reverse play
            if (p < 0 && dk.playing) {
              dk.pause();
              upd(id, {playing: false});
            }
          }}
          onPosition={(pos) => {
            // Sync playhead to vinyl position
          }}
        />

        {/* ── Load ── */}
        <div className="dj-load-sec">
          <div className="dj-drop-zone"
            onDragOver={e=>{e.preventDefault();}}
            onDrop={e=>{e.preventDefault();const f=e.dataTransfer.files[0];if(f&&f.type.startsWith("audio/"))loadFile(id,f);}}>
            <label style={{cursor:"pointer",width:"100%",textAlign:"center"}}>
              <input type="file" accept="audio/*" style={{display:"none"}} onChange={e=>e.target.files[0]&&loadFile(id,e.target.files[0])}/>
              {ldDeck===id?"⏳ Loading…":s.loaded?"↕ Drag new track":"Drag MP3 / WAV / FLAC or click"}
            </label>
          </div>
          <div className="dj-load-row">
            <button className="dj-url-btn" onClick={()=>setShowUrl(p=>({...p,[id]:!p[id]}))}>🔗 URL</button>
          </div>
          {showUrl[id]&&(
            <div className="dj-url-row">
              <input className="dj-url-in" placeholder="Paste direct audio URL…" value={urlI[id]}
                onChange={e=>setUrlI(p=>({...p,[id]:e.target.value}))}
                onKeyDown={e=>e.key==="Enter"&&loadURL(id)}/>
              <button className="dj-url-go" onClick={()=>loadURL(id)}>Load</button>
            </div>
          )}
        </div>
      </div>
    );
  };

  const filtLib=lib.filter(t=>{
    const tm=lf==="all"||t.audio_type===lf;
    const sm=!ls||t.title?.toLowerCase().includes(ls.toLowerCase());
    return tm&&sm;
  });

  return(
    <div className="dj-page" onClick={initAudio}>
      {/* ── Top Bar ── */}
      <div className="dj-topbar">
        <div className="dj-logo">🎛 <span>DJ<em>Studio</em></span></div>
        <div className="dj-tabs">
          <button className={`dj-tab ${activeTab==="decks"?"active":""}`} onClick={()=>setActiveTab("decks")}>🎚 Decks</button>
          <button className={`dj-tab ${activeTab==="sampler"?"active":""}`} onClick={()=>setActiveTab("sampler")}>🥁 Sampler</button>
        </div>
        <div className="dj-top-acts">
          <button className="dj-sync" onClick={syncBPM}>⟳ SYNC</button>
          <button className="dj-mst-btn" onClick={()=>setMaster(m=>m==="A"?"B":"A")}>MASTER: {master}</button>
          <button className={`dj-tab ${midiEnabled?"active":""}`}
            style={{borderColor:midiEnabled?"#ffd60a":"",color:midiEnabled?"#ffd60a":""}}
            onClick={()=>setMidiEnabled(m=>!m)}
            title="Toggle MIDI controller">
            🎹 MIDI
          </button>
          {midiEnabled&&(
            <div style={{position:"relative"}}>
              <button className="dj-tab" style={{color:"#8b949e",fontSize:10}}
                onClick={()=>setShowProfilePicker(p=>!p)}>
                🎮 {controllerProfile} ▾
              </button>
              {showProfilePicker&&(
                <div style={{position:"absolute",top:"100%",left:0,zIndex:200,background:"#161b22",border:"1px solid #30363d",borderRadius:8,padding:4,minWidth:220,boxShadow:"0 8px 32px rgba(0,0,0,0.7)"}}>
                  {Object.entries(CONTROLLER_PROFILES).map(([name,prof])=>(
                    <button key={name}
                      onClick={()=>applyControllerProfile(name)}
                      style={{display:"block",width:"100%",padding:"8px 12px",background:controllerProfile===name?"rgba(0,255,200,0.08)":"transparent",border:"none",borderRadius:5,color:controllerProfile===name?"#00ffc8":"#8b949e",fontFamily:"JetBrains Mono,monospace",fontSize:10,fontWeight:700,textAlign:"left",cursor:"pointer"}}>
                      <div>{name}</div>
                      <div style={{fontSize:9,color:"#4e6a82",fontWeight:400,marginTop:2}}>{prof.desc}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          {!rec?<button className="dj-rec" onClick={startRec}>⏺ REC</button>:<button className="dj-rec on" onClick={stopRec}>⏹ STOP</button>}
          {recBlob&&<><button className="dj-exp" onClick={dlMix}>⬇ Download</button><button className="dj-exp save" onClick={()=>setSaveModal(true)}>☁ Save</button></>}
          {rec&&<div className="dj-rec-live"><span className="dj-rec-dot"/>REC</div>}
        </div>
      </div>

      {/* ── Decks View ── */}
      {activeTab==="decks"&&(
        <div className="dj-main">
          {renderDeck("A")}

          {/* ── Center Mixer ── */}
          <div className="dj-center">
            <div style={{color:"#00ffc8",fontSize:9,fontWeight:800,textTransform:"uppercase",letterSpacing:2,marginBottom:8,textAlign:"center"}}>MIXER</div>
            <div className="dj-xfw">
              <div className="dj-xfl"><span style={{color:"#00ffcc"}}>A</span><span className="dj-xft">CROSSFADER</span><span style={{color:"#ff6b35"}}>B</span></div>
              <input type="range" className="dj-xfader" min="0" max="1" step="0.005" value={xf} onChange={e=>setXf(parseFloat(e.target.value))}/>
              <button className="dj-xfc" onClick={()=>setXf(0.5)}>⊙ Center</button>
            </div>
            <div className="dj-mvol">
              <label className="dj-fl" style={{color:"#fff",textAlign:"center",display:"block"}}>MASTER VOL</label>
              <input type="range" className="dj-fader" min="0" max="1.5" step="0.01" value={mvol} style={{"--fc":"#fff"}} onChange={e=>setMvol(parseFloat(e.target.value))}/>
              <span className="dj-fv" style={{textAlign:"center",display:"block"}}>{Math.round(mvol*100)}%</span>
            </div>
            <div style={{marginTop:12,display:"flex",flexDirection:"column",gap:6}}>
              <div style={{color:"#4e6a82",fontSize:9,fontWeight:800,textTransform:"uppercase",letterSpacing:1,textAlign:"center"}}>CH FADERS</div>
              {["A","B"].map(id=>(
                <div key={id} style={{display:"flex",alignItems:"center",gap:6}}>
                  <span style={{color:id==="A"?"#00ffcc":"#ff6b35",fontSize:11,fontWeight:800,width:14}}>{id}</span>
                  <input type="range" className="dj-fader" min="0" max="1.5" step="0.01"
                    value={ds[id].vol} style={{"--fc":id==="A"?"#00ffcc":"#ff6b35"}}
                    onChange={e=>{const v=parseFloat(e.target.value);(id==="A"?deckA:deckB).setGain(v);upd(id,{vol:v});}}/>
                </div>
              ))}
            </div>

            {/* ── Stream to Destinations ── */}
            <div className="dj-stream-panel">
              <div className="dj-stream-label">🔴 BROADCAST</div>
              {[
                {id:"streampirex", label:"StreamPireX", icon:"✨", color:"#00ffc8"},
                {id:"twitch",      label:"Twitch",      icon:"🟣", color:"#9146ff"},
                {id:"youtube",     label:"YouTube",     icon:"🔴", color:"#ff0000"},
              ].map(dest=>(
                <div key={dest.id} className="dj-stream-dest">
                  <span style={{fontSize:12}}>{dest.icon}</span>
                  <span className="dj-stream-name">{dest.label}</span>
                  <button
                    className={`dj-stream-btn ${streamDests[dest.id]?"live":""}`}
                    style={{"--dc":dest.color}}
                    onClick={()=>toggleStream(dest.id)}>
                    {streamDests[dest.id]?"⏹ Stop":"▶ Go Live"}
                  </button>
                </div>
              ))}
              {Object.values(streamDests).some(Boolean)&&(
                <div className="dj-stream-live-badge">
                  <span className="dj-rec-dot"/>
                  LIVE — {Object.entries(streamDests).filter(([,v])=>v).map(([k])=>k).join(" + ")}
                </div>
              )}
              <div className="dj-stream-hint">
                Configure stream keys in Settings → Streaming
              </div>
            </div>
          </div>

          {renderDeck("B")}
        </div>
      )}

      {/* ── MIDI Controller Panel ── */}
      {midiEnabled&&(
        <div style={{position:"fixed",bottom:220,right:16,zIndex:100,width:320}}>
          <MidiHardwareInput
            drumMode={false}
            onNoteOn={(note,vel)=>handleMidiNote(note,vel,"A")}
            onNoteOff={()=>{}}
            onCC={(cc,val)=>handleMidiCC(cc,val)}
            onPitchBend={(val)=>{
              const norm=(val+8192)/16384;
              deckA.pitch=0.85+norm*0.3;
              if(deckA.source)deckA.source.playbackRate.value=deckA.pitch;
              upd("A",{pitch:deckA.pitch});
            }}
            onPadTrigger={(pad)=>handleMidiNote(36+pad,127,"A")}
          />
          {/* MIDI Mapping Table */}
          <div style={{background:"#0d1117",border:"1px solid #21262d",borderRadius:8,padding:12,marginTop:8,fontSize:10,color:"#8b949e"}}>
            <div style={{color:"#ffd60a",fontWeight:800,marginBottom:8,letterSpacing:1}}>MIDI MAP</div>
            {Object.entries(midiMap).map(([cc,action])=>(
              <div key={cc} style={{display:"flex",justifyContent:"space-between",padding:"2px 0",borderBottom:"1px solid #161b22"}}>
                <span style={{color:"#4e6a82"}}>CC {cc}</span>
                <span style={{color:"#dde6ef"}}>{action}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Sampler View ── */}
      {activeTab==="sampler"&&(
        <div style={{padding:24,flex:1}}>
          <SamplerPads audioCtx={getCtx} masterOut={mgRef}/>
        </div>
      )}

      {/* ── Library ── */}
      <div className="dj-library">
        <div className="dj-lib-hd">
          <span className="dj-lib-ttl">📂 Library</span>
          <input className="dj-lib-s" placeholder="Search…" value={ls} onChange={e=>setLs(e.target.value)}/>
        </div>
        <div className="dj-lib-filters">
          {["all","beat","acapella","stem","remix","mix","sample","original"].map(f=>(
            <button key={f} className={`dj-ff ${lf===f?"on":""}`} onClick={()=>setLf(f)}>{f==="all"?"All":f.charAt(0).toUpperCase()+f.slice(1)}</button>
          ))}
        </div>
        <div className="dj-lib-rows">
          {filtLib.length===0?(
            <div className="dj-lib-empty">{lib.length===0?"Upload audio or beats to see them here":"No tracks match filter"}</div>
          ):filtLib.map(t=>(
            <div key={t.id} className="dj-lib-row">
              <div className="dj-lib-inf">
                <span className="dj-lib-name">{t.title}</span>
                <span className="dj-lib-meta">
                  {t.audio_type&&t.audio_type!=="original"&&<span className="dj-lib-tag">{t.audio_type}</span>}
                  {t.bpm&&<span>{t.bpm} BPM</span>}
                  {t.key&&<span> · {t.key}</span>}
                  {t.genre&&<span> · {t.genre}</span>}
                </span>
              </div>
              <div className="dj-lib-btns">
                <button className="dj-lib-a" onClick={()=>loadLib("A",t)}>A</button>
                <button className="dj-lib-b" onClick={()=>loadLib("B",t)}>B</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {saveModal&&(
        <div className="dj-overlay" onClick={()=>setSaveModal(false)}>
          <div className="dj-modal" onClick={e=>e.stopPropagation()}>
            <h3>Save Mix to Library</h3>
            <input className="dj-modal-in" placeholder="Mix title…" value={mixTitle} onChange={e=>setMixTitle(e.target.value)}/>
            <div className="dj-modal-acts">
              <button className="dj-modal-cancel" onClick={()=>setSaveModal(false)}>Cancel</button>
              <button className="dj-modal-save" onClick={saveMix} disabled={saving}>{saving?"Saving…":"☁ Save"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function fmt(s){if(!s||isNaN(s)||s<0)return"0:00";return`${Math.floor(s/60)}:${Math.floor(s%60).toString().padStart(2,"0")}`;}
