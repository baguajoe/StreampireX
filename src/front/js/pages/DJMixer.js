import { useStemSeparation } from '../hooks/useStemSeparation';
import React, { useState, useEffect, useRef, useCallback, useContext } from "react";
import { Context } from "../store/appContext";
import "../../styles/DJMixer.css";
import MidiHardwareInput from "../component/MidiHardwareInput";
import DVSTimecode from "../component/DVSTimecode";

const BACKEND = process.env.REACT_APP_BACKEND_URL || "";

const CONTROLLER_PROFILES = {
  "Akai MPK Mini": {
    desc: "Akai MPK Mini — 25 keys, 8 pads, 8 knobs",
    map: { 1:"xfader", 7:"vol_a", 8:"vol_b", 10:"low_a", 11:"mid_a", 74:"filter_a", 70:"high_a", 71:"low_b", 72:"mid_b", 73:"high_b" },
    pads: { 36:"cue_a_1", 37:"cue_a_2", 38:"cue_a_3", 39:"cue_a_4", 40:"cue_b_1", 41:"cue_b_2", 42:"cue_b_3", 43:"cue_b_4" },
  },
  "Pioneer DDJ-200": {
    desc: "Pioneer DDJ-200 — 2-deck controller",
    map: { 7:"vol_a", 8:"vol_b", 10:"low_a", 11:"mid_a", 12:"high_a", 13:"low_b", 14:"mid_b", 15:"high_b", 1:"xfader" },
    pads: { 36:"cue_a_1", 37:"cue_a_2", 40:"play_a", 41:"play_b", 46:"sync" },
  },
  "Pioneer DDJ-400": {
    desc: "Pioneer DDJ-400 — 2-deck, jog wheels, FX",
    map: { 9:"vol_a", 8:"xfader", 7:"high_a", 11:"mid_a", 15:"low_a", 20:"filter_a" },
    pads: { 11:"play_a", 12:"cue_a", 13:"sync_a", 1:"cue_a_1", 2:"cue_a_2", 3:"cue_a_3", 4:"cue_a_4" },
  },
  "Custom": { desc: "Custom — build your own mapping", map: {}, pads: {} },
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

async function detectKey(buffer) {
  try {
    const sr = buffer.sampleRate;
    const off = new OfflineAudioContext(1, buffer.length, sr);
    const src = off.createBufferSource(); src.buffer = buffer;
    src.connect(off.destination); src.start(0);
    const r = await off.startRendering();
    const data = r.getChannelData(0);
    const fftSize = 4096;
    const chroma = new Float32Array(12).fill(0);
    const noteFreqs = [16.35,17.32,18.35,19.45,20.6,21.83,23.12,24.5,25.96,27.5,29.14,30.87];
    for (let oct = 1; oct <= 6; oct++) {
      for (let n = 0; n < 12; n++) {
        const freq = noteFreqs[n] * Math.pow(2, oct);
        if (freq > sr / 2) continue;
        const k = Math.round((fftSize * freq) / sr);
        const omega = (2 * Math.PI * k) / fftSize;
        const cos2 = 2 * Math.cos(omega);
        let q1 = 0, q2 = 0;
        const chunk = data.slice(0, fftSize);
        for (let i = 0; i < chunk.length; i++) {
          const q0 = chunk[i] + cos2 * q1 - q2;
          q2 = q1; q1 = q0;
        }
        chroma[n] += q1 * q1 + q2 * q2 - q1 * q2 * cos2;
      }
    }
    const major = [6.35,2.23,3.48,2.33,4.38,4.09,2.52,5.19,2.39,3.66,2.29,2.88];
    const minor = [6.33,2.68,3.52,5.38,2.6,3.53,2.54,4.75,3.98,2.69,3.34,3.17];
    const notes = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
    let bestScore = -Infinity, bestKey = "C", bestMode = "maj";
    for (let shift = 0; shift < 12; shift++) {
      const shifted = [...chroma.slice(shift), ...chroma.slice(0, shift)];
      const scoreM = major.reduce((s, v, i) => s + v * shifted[i], 0);
      const scoreMn = minor.reduce((s, v, i) => s + v * shifted[i], 0);
      if (scoreM > bestScore) { bestScore = scoreM; bestKey = notes[shift]; bestMode = "maj"; }
      if (scoreMn > bestScore) { bestScore = scoreMn; bestKey = notes[shift]; bestMode = "min"; }
    }
    return bestKey + " " + bestMode;
  } catch { return null; }
}

const Turntable = React.memo(({ playing, progress, color, label }) => {
  const cvs = useRef(null);
  const rot = useRef(0);
  const raf = useRef(null);

  useEffect(() => {
    const c = cvs.current; if (!c) return;
    const ctx = c.getContext("2d");
    const W = c.width, H = c.height;
    const PR = 118, cx = 145, cy = H / 2;

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, "#222"); bg.addColorStop(1, "#0a0a0a");
      ctx.fillStyle = bg;
      ctx.beginPath(); ctx.roundRect(0, 0, W, H, 8); ctx.fill();
      ctx.strokeStyle = "#333"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.roundRect(1, 1, W-2, H-2, 8); ctx.stroke();

      const ring = ctx.createRadialGradient(cx, cy, PR-8, cx, cy, PR+8);
      ring.addColorStop(0, "#444"); ring.addColorStop(0.4, "#aaa");
      ring.addColorStop(0.7, "#666"); ring.addColorStop(1, "#222");
      ctx.fillStyle = ring;
      ctx.beginPath(); ctx.arc(cx, cy, PR+8, 0, Math.PI*2); ctx.fill();

      for (let i = 0; i < 72; i++) {
        const a = (i/72)*Math.PI*2, sr = PR+4;
        const blink = Math.sin(Date.now()*0.012 + i*0.5) > 0.65;
        ctx.fillStyle = blink ? "rgba(255,255,255,0.9)" : "rgba(0,0,0,0.5)";
        ctx.beginPath(); ctx.arc(cx+Math.cos(a)*sr, cy+Math.sin(a)*sr, 1, 0, Math.PI*2); ctx.fill();
      }

      ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot.current);
      const mat = ctx.createRadialGradient(0, 0, 0, 0, 0, PR);
      mat.addColorStop(0, "#1a1a1a"); mat.addColorStop(0.8, "#111"); mat.addColorStop(1, "#080808");
      ctx.fillStyle = mat;
      ctx.beginPath(); ctx.arc(0, 0, PR, 0, Math.PI*2); ctx.fill();
      for (let r = PR*0.2; r < PR*0.96; r += 2.6) {
        ctx.strokeStyle = `rgba(255,255,255,${0.02+(r/PR)*0.035})`;
        ctx.lineWidth = 0.5;
        ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI*2); ctx.stroke();
      }
      const lg = ctx.createRadialGradient(0, 0, 0, 0, 0, PR*0.22);
      lg.addColorStop(0, color+"ee"); lg.addColorStop(0.5, color+"44"); lg.addColorStop(1, "#111");
      ctx.fillStyle = lg;
      ctx.beginPath(); ctx.arc(0, 0, PR*0.22, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.font = `bold ${Math.round(PR*0.08)}px JetBrains Mono,monospace`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("SPX", 0, -PR*0.065);
      ctx.font = `${Math.round(PR*0.06)}px JetBrains Mono,monospace`; ctx.fillStyle = color;
      ctx.fillText(label, 0, PR*0.08);
      ctx.fillStyle = "#555"; ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = "#bbb"; ctx.beginPath(); ctx.arc(0, 0, 2.5, 0, Math.PI*2); ctx.fill();
      ctx.restore();

      const fx = cx + PR + 72, fy = H*0.17, fh = H*0.66;
      ctx.fillStyle = "#111";
      ctx.beginPath(); ctx.roundRect(fx-3, fy, 6, fh, 3); ctx.fill();
      ctx.strokeStyle = "#2a2a2a"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.roundRect(fx-3, fy, 6, fh, 3); ctx.stroke();
      ctx.strokeStyle = "#3a3a3a";
      ctx.beginPath(); ctx.moveTo(fx-7, fy+fh/2); ctx.lineTo(fx+7, fy+fh/2); ctx.stroke();
      for (let t = 0; t < 5; t++) {
        const ty = fy+(t/(5-1))*fh;
        ctx.strokeStyle = "#2a2a2a"; ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.moveTo(fx-5, ty); ctx.lineTo(fx-2, ty); ctx.stroke();
      }
      const fcy = fy+fh/2;
      ctx.fillStyle = "#555"; ctx.beginPath(); ctx.roundRect(fx-8, fcy-7, 16, 14, 3); ctx.fill();
      ctx.fillStyle = "#777"; ctx.beginPath(); ctx.roundRect(fx-7, fcy-6, 14, 12, 2); ctx.fill();
      ctx.strokeStyle = "#aaa"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(fx-4, fcy); ctx.lineTo(fx+4, fcy); ctx.stroke();
      ctx.fillStyle = "#444"; ctx.font = "7px JetBrains Mono,monospace"; ctx.textAlign = "center";
      ctx.fillText("+", fx, fy-5); ctx.fillText("-", fx, fy+fh+11);

      const btnX = cx-PR*0.52, btnY = H*0.85;
      ctx.fillStyle = "#1a1a1a"; ctx.beginPath(); ctx.arc(btnX, btnY, 15, 0, Math.PI*2); ctx.fill();
      ctx.strokeStyle = playing?"#ff4444":"#333"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(btnX, btnY, 15, 0, Math.PI*2); ctx.stroke();
      ctx.fillStyle = playing?"#ff4444":"#2a2a2a";
      ctx.shadowColor = playing?"#ff4444":"transparent"; ctx.shadowBlur = playing?10:0;
      ctx.beginPath(); ctx.arc(btnX, btnY, 7, 0, Math.PI*2); ctx.fill();
      ctx.shadowBlur = 0;
      const rpmX = btnX+34;
      ctx.fillStyle = "#1a1a1a"; ctx.beginPath(); ctx.roundRect(rpmX, btnY-9, 26, 18, 3); ctx.fill();
      ctx.font = "7px JetBrains Mono,monospace"; ctx.fillStyle = "#555"; ctx.textAlign = "left";
      ctx.fillText("33", rpmX+2, btnY-1); ctx.fillText("45", rpmX+2, btnY+8);

      // Tonearm
      const pivX = cx+PR+18;
      const pivY = H*0.29;
      ctx.save();

      ctx.fillStyle = "#0d0d0d"; ctx.beginPath(); ctx.arc(pivX, pivY, 16, 0, Math.PI*2); ctx.fill();
      const pw1 = ctx.createRadialGradient(pivX-4, pivY-4, 1, pivX, pivY, 16);
      pw1.addColorStop(0, "#888"); pw1.addColorStop(0.5, "#444"); pw1.addColorStop(1, "#111");
      ctx.fillStyle = pw1; ctx.beginPath(); ctx.arc(pivX, pivY, 16, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = "#1a1a1a"; ctx.beginPath(); ctx.arc(pivX, pivY, 10, 0, Math.PI*2); ctx.fill();
      const pw2 = ctx.createRadialGradient(pivX-2, pivY-2, 1, pivX, pivY, 8);
      pw2.addColorStop(0, "#777"); pw2.addColorStop(1, "#333");
      ctx.fillStyle = pw2; ctx.beginPath(); ctx.arc(pivX, pivY, 8, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = "#555"; ctx.beginPath(); ctx.arc(pivX, pivY, 4, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = "#ccc"; ctx.beginPath(); ctx.arc(pivX, pivY, 2, 0, Math.PI*2); ctx.fill();

      const tipX = cx+PR*0.75-progress*18;
      const tipY = cy-PR*0.1+progress*12;
      // Smooth S-curve: cp1/cp2 control upper curve, cp3/cp4 control lower curve
      // Midpoint between the two segments for G1 continuity
      // S-arm: long straight tube from pivot angling down-left, then S-bend to headshell
      const armEndX = pivX - 55, armEndY = pivY + 55;
      const midX = armEndX, midY = armEndY;
      // First bezier: pivot straight down-left (main arm tube - nearly linear)
      const cp1x=pivX-18, cp1y=pivY+18;
      const cp2x=pivX-38, cp2y=pivY+38;
      // Second bezier: S-bend from arm end to stylus tip
      const cp3x=armEndX-8, cp3y=armEndY+18;
      const cp4x=tipX+10,   cp4y=tipY-8;

      ctx.strokeStyle = "rgba(0,0,0,0.7)"; ctx.lineWidth = 10; ctx.lineCap = "round"; ctx.lineJoin = "round";
      ctx.beginPath(); ctx.moveTo(pivX+1, pivY+2);
      ctx.bezierCurveTo(cp1x+1,cp1y+2,cp2x+1,cp2y+2,midX+1,midY+2);
      ctx.bezierCurveTo(cp3x+1,cp3y+2,cp4x+1,cp4y+2,tipX+1,tipY+2);
      ctx.stroke();

      ctx.strokeStyle = "#444"; ctx.lineWidth = 8;
      ctx.beginPath(); ctx.moveTo(pivX, pivY);
      ctx.bezierCurveTo(cp1x,cp1y,cp2x,cp2y,midX,midY);
      ctx.bezierCurveTo(cp3x,cp3y,cp4x,cp4y,tipX,tipY);
      ctx.stroke();

      const ag = ctx.createLinearGradient(pivX, pivY, tipX, tipY);
      ag.addColorStop(0, "#999"); ag.addColorStop(0.3, "#ddd"); ag.addColorStop(0.7, "#bbb"); ag.addColorStop(1, "#999");
      ctx.strokeStyle = ag; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(pivX, pivY);
      ctx.bezierCurveTo(cp1x,cp1y,cp2x,cp2y,midX,midY);
      ctx.bezierCurveTo(cp3x,cp3y,cp4x,cp4y,tipX,tipY);
      ctx.stroke();

      ctx.strokeStyle = "rgba(255,255,255,0.35)"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(pivX, pivY);
      ctx.bezierCurveTo(cp1x-1,cp1y,cp2x-1,cp2y,midX,midY);
      ctx.bezierCurveTo(cp3x,cp3y,cp4x,cp4y,tipX,tipY);
      ctx.stroke();

      const hsX = tipX-10, hsY = tipY+9;
      ctx.strokeStyle = "#888"; ctx.lineWidth = 4; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(tipX, tipY); ctx.lineTo(hsX, hsY); ctx.stroke();
      ctx.strokeStyle = "#bbb"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(tipX, tipY); ctx.lineTo(hsX, hsY); ctx.stroke();

      ctx.save(); ctx.translate(hsX, hsY); ctx.rotate(-0.18);
      ctx.fillStyle = "#444"; ctx.beginPath(); ctx.roundRect(-2,-5,22,10,3); ctx.fill();
      ctx.fillStyle = "#555"; ctx.beginPath(); ctx.roundRect(-1,-4,20,8,2); ctx.fill();
      ctx.fillStyle = "#333"; ctx.beginPath(); ctx.roundRect(15,-3,5,6,1); ctx.fill();
      ctx.restore();

      const styX = hsX-2, styY = hsY+7;
      ctx.strokeStyle = "#777"; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(hsX+2, hsY+2); ctx.lineTo(styX, styY); ctx.stroke();
      ctx.shadowColor = color; ctx.shadowBlur = 12;
      ctx.fillStyle = color; ctx.beginPath(); ctx.arc(styX, styY, 2.5, 0, Math.PI*2); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.restore();

      if (playing) rot.current += 0.022;
      raf.current = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf.current);
  }, [playing, progress, color, label]);

  return <canvas ref={cvs} width={500} height={300} className="dj-turntable-canvas" />;
});

const Waveform = React.memo(({ deck, color }) => {
  const cvs = useRef(null), raf = useRef(null);
  useEffect(() => {
    const c = cvs.current; if (!c) return;
    const ctx = c.getContext("2d"); const w=c.width, h=c.height;
    const draw = () => {
      ctx.fillStyle = "#06060f"; ctx.fillRect(0,0,w,h);
      const freq=deck.getFreq(); const bw=w/freq.length;
      for (let i=0;i<freq.length;i++) {
        const v=freq[i]/255, bh=v*h*0.9;
        ctx.fillStyle = `hsla(${160+v*80},100%,${25+v*45}%,${0.4+v*0.6})`;
        ctx.fillRect(i*bw,h-bh,bw-0.5,bh);
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
    draw(); return()=>cancelAnimationFrame(raf.current);
  },[deck,color]);
  return <canvas ref={cvs} width={400} height={72} className="dj-waveform"/>;
});

const VU = React.memo(({ deck }) => {
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
        ctx.fillStyle=i>=active?"#0d1117":i>20?"#ff3366":i>16?"#ffcc00":"#00ffcc";
        ctx.fillRect(1,y,w-2,sh);
      }
      raf.current=requestAnimationFrame(draw);
    };
    draw(); return()=>cancelAnimationFrame(raf.current);
  },[deck]);
  return <canvas ref={cvs} width={18} height={120} className="dj-vu"/>;
});

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
      <div className="dj-knob" onMouseDown={onDown} style={{"--ka":`${angle}deg`,"--kc":color,width:size,height:size}}>
        <div className="dj-knob-dot"/>
      </div>
      <span className="dj-knob-lbl">{label}</span>
      <span className="dj-knob-val">{value>0?`+${value.toFixed(0)}`:value.toFixed(0)}</span>
    </div>
  );
};

class Deck {
  constructor(id){
    this.id=id;this.buffer=null;this.source=null;this.gainNode=null;
    this.eqLow=null;this.eqMid=null;this.eqHigh=null;this.analyser=null;
    this.currentFX=null;this.fxDry=null;this.fxWet=null;
    this.startTime=0;this.pauseOffset=0;this.playing=false;
    this.bpm=null;this.key=null;this.cuePoint=0;
    this.hotcues=[null,null,null,null];
    this.loop=false;this.loopStart=0;this.loopEnd=4;this.pitch=1.0;
    this.slip=false;this.title="";this.artwork=null;this.audioType="original";
    this.stemData=null;this.stemSources=null;this.usingStems=false;
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
  async loadBuffer(ab){this.buffer=await getCtx().decodeAudioData(ab);this.pauseOffset=0;this.bpm=await detectBPM(this.buffer);this.detectedKey=await detectKey(this.buffer);return{bpm:this.bpm,key:this.detectedKey};}
  async loadURL(url){const r=await fetch(url);return this.loadBuffer(await r.arrayBuffer());}
  play(off){
    if(!this.buffer)return;const c=getCtx();
    if(c.state==="suspended")c.resume();this._stop();
    const o=off!==undefined?off:this.pauseOffset;
    if(this.usingStems&&this.stemData){
      // Stem mode: start all stem sources at one shared AudioContext time so they stay phase-locked.
      this.stemSources=[];
      const startAt=c.currentTime+0.03;
      for(const name of Object.keys(this.stemData)){
        const sd=this.stemData[name];if(!sd||!sd.buffer||!sd.gain)continue;
        const src=c.createBufferSource();src.buffer=sd.buffer;src.playbackRate.value=this.pitch;
        if(this.loop){src.loop=true;src.loopStart=this.loopStart;src.loopEnd=this.loopEnd;}
        src.connect(sd.gain);
        src.start(startAt,Math.max(0,o));
        this.stemSources.push(src);
      }
      this.startTime=startAt-o;this.playing=true;return;
    }
    this.source=c.createBufferSource();this.source.buffer=this.buffer;
    this.source.playbackRate.value=this.pitch;
    if(this.loop){this.source.loop=true;this.source.loopStart=this.loopStart;this.source.loopEnd=this.loopEnd;}
    this.source.connect(this.gainNode);
    this.source.start(0,Math.max(0,o));this.startTime=c.currentTime-o;this.playing=true;
  }
  pause(){if(!this.playing)return;this.pauseOffset=this.currentTime();this._stop();this.playing=false;}
  setCue(){this.cuePoint=this.currentTime();}
  jumpCue(){this.pauseOffset=this.cuePoint;if(this.playing)this.play(this.cuePoint);}
  jumpHotcue(i){if(this.hotcues[i]===null){this.hotcues[i]=this.currentTime();return;}this.pauseOffset=this.hotcues[i];if(this.playing)this.play(this.hotcues[i]);}
  beatJump(beats){if(!this.buffer||!this.bpm)return;const beatSec=60/this.bpm;const t=Math.max(0,Math.min(this.duration(),this.currentTime()+beats*beatSec));this.pauseOffset=t;if(this.playing)this.play(t);}
  currentTime(){if(!this.playing)return this.pauseOffset;return Math.min(getCtx().currentTime-this.startTime,this.duration());}
  duration(){return this.buffer?this.buffer.duration:0;}
  setGain(v){if(this.gainNode)this.gainNode.gain.value=v;}
  setEQ(b,db){const n=b==="low"?this.eqLow:b==="mid"?this.eqMid:this.eqHigh;if(n)n.gain.value=db;}
  setFX(type,wet){
    const c=getCtx();
    if(this.currentFX){try{this.currentFX.disconnect();}catch(_){}}
    this.fxWet.gain.value=wet;this.fxDry.gain.value=1-wet*0.5;
    if(wet===0||type==="Off")return;
    let node;
    if(type==="Filter"){node=c.createBiquadFilter();node.type="lowpass";node.frequency.value=200+wet*3000;}
    else if(type==="Echo"){node=c.createDelay(2);node.delayTime.value=60/((this.bpm||120)*2);}
    else if(type==="Flanger"){node=c.createDelay(0.1);node.delayTime.value=0.003+wet*0.007;}
    else if(type==="Crush"){node=c.createWaveShaper();const curve=new Float32Array(256);for(let i=0;i<256;i++){const x=i*2/256-1;curve[i]=Math.round(x*(1+wet*16))/(1+wet*16);}node.curve=curve;}
    else{node=c.createGain();}
    if(node){this.eqHigh.disconnect();this.eqHigh.connect(node);node.connect(this.fxWet);this.eqHigh.connect(this.fxDry);this.currentFX=node;}
  }
  _stop(){
    try{if(this.source){this.source.stop();this.source.disconnect();}}catch(_){}this.source=null;
    if(this.stemSources){for(const s of this.stemSources){try{s.stop();s.disconnect();}catch(_){}}this.stemSources=null;}
  }
  // Switch the deck into stem mode. stemData: {drums:{buffer,gain}, bass:{...}, vocals:{...}, other:{...}}
  // Each gain is already connected into the deck channel (this.gainNode) so deck EQ/FX/crossfader apply.
  setStems(stemData){
    const wasPlaying=this.playing;const pos=this.currentTime();
    this._stop();                 // kill the original full-mix source so only stems are heard
    this.stemData=stemData;this.usingStems=true;this.pauseOffset=pos;
    if(wasPlaying)this.play(pos);
  }
  getFreq(){if(!this.analyser)return new Uint8Array(64);const d=new Uint8Array(this.analyser.frequencyBinCount);this.analyser.getByteFrequencyData(d);return d;}
}

const deckA=new Deck("A"),deckB=new Deck("B");

const SamplerPads=({audioCtx,masterOut})=>{
  const [pads,setPads]=useState(Array(8).fill(null).map((_,i)=>({
    name:`Pad ${i+1}`,buffer:null,
    color:["#ff4466","#ff8800","#ffcc00","#00ff88","#00ffcc","#00aaff","#aa44ff","#ff44aa"][i]
  })));
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
            <button className={`dj-pad${pad.buffer?" loaded":""}`} style={{"--pc":pad.color}} onMouseDown={()=>triggerPad(i)}>
              <span className="dj-pad-name">{pad.name}</span>
            </button>
            <label className="dj-pad-load">
              <input type="file" accept="audio/*" className="dj-hidden" onChange={e=>e.target.files[0]&&loadPad(i,e.target.files[0])}/>+
            </label>
          </div>
        ))}
      </div>
    </div>
  );
};

const FXPanel=({deck})=>{
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

const BeatJump=({deck})=>(
  <div className="dj-beatjump">
    {[-32,-16,-8,-4,-2,-1,1,2,4,8,16,32].map(b=>(
      <button key={b} className={`dj-bj ${b<0?"bj-back":"bj-fwd"}`} onClick={()=>deck.beatJump(b)}>
        {b>0?`+${b}`:b}
      </button>
    ))}
  </div>
);

function fmt(s){if(!s||isNaN(s)||s<0)return"0:00";return`${Math.floor(s/60)}:${Math.floor(s%60).toString().padStart(2,"0")}`;}

const HC_COLORS=["#ff4466","#00aaff","#00ff88","#ff8800"];


const PIANO_NOTES=["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
const NOTE_COLORS={"C":"#ff4444","C#":"#ff8800","D":"#ffcc00","D#":"#88ff00","E":"#00ff88","F":"#00ffcc","F#":"#00ccff","G":"#0088ff","G#":"#4400ff","A":"#8800ff","A#":"#cc00ff","B":"#ff0088"};

function PianoReference({currentKey}){
  const root=currentKey?currentKey.split(" ")[0]:null;
  return(
    <div className="dj-piano-ref">
      <div className="dj-piano-keys">
        {PIANO_NOTES.map(n=>(
          <div key={n} className={"dj-piano-key"+(n.includes("#")?" black":"")+(root===n?" active":"")}
            style={root===n?{background:NOTE_COLORS[n]||"#00ffc8"}:{}} title={n}>
            <span>{n}</span>
          </div>
        ))}
      </div>
      {currentKey&&<div className="dj-piano-label">Root: {currentKey}</div>}
    </div>
  );
}

function EnergyBar({score}){
  if(!score)return<span className="dj-energy-empty">—</span>;
  const colors=["","#224","#336","#449","#33aa88","#00ffc8","#88ff44","#ffcc00","#ff8800","#ff4400","#ff0000"];
  return(
    <div className="dj-energy-bar-wrap" title={"Energy: "+score+"/10"}>
      {[1,2,3,4,5,6,7,8,9,10].map(i=>(
        <div key={i} className="dj-energy-seg" style={{background:i<=score?colors[i]:"#1a1a2e"}}/>
      ))}
      <span className="dj-energy-num">{score}</span>
    </div>
  );
}

export default function DJMixer(){
  const{store}=useContext(Context);
  const[rdy,setRdy]=useState(false);
  const[djStatus,setDjStatus]=useState("");
  useEffect(()=>{if(!djStatus)return;const t=setTimeout(()=>setDjStatus(""),4000);return()=>clearTimeout(t);},[djStatus]);
  const[xf,setXf]=useState(0.5);
  const[mvol,setMvol]=useState(1);
  const[ds,setDs]=useState({
    A:{playing:false,loaded:false,bpm:null,key:null,title:"",artwork:null,audioType:"original",vol:1,low:0,mid:0,high:0,pitch:1,loop:false,hotcues:[null,null,null,null],slip:false,stems:null,stemsLoading:false,stemVols:{},stemMutes:{}},
    B:{playing:false,loaded:false,bpm:null,key:null,title:"",artwork:null,audioType:"original",vol:1,low:0,mid:0,high:0,pitch:1,loop:false,hotcues:[null,null,null,null],slip:false,stems:null,stemsLoading:false,stemVols:{},stemMutes:{}},
  });
  const[lib,setLib]=useState([]);
  const[lf,setLf]=useState("all");
  const[ls,setLs]=useState("");
  const[ldDeck,setLdDeck]=useState(null);
  const[urlI,setUrlI]=useState({A:"",B:""});
  const[showUrl,setShowUrl]=useState({A:false,B:false});
  const[rec,setRec]=useState(false);
  const[recBlob,setRecBlob]=useState(null);
  const[master,setMaster]=useState("A");
  const[prog,setProg]=useState({A:0,B:0});
  const progRef=useRef({A:0,B:0});
  const[saveModal,setSaveModal]=useState(false);
  const[mixTitle,setMixTitle]=useState("");
  const[saving,setSaving]=useState(false);
  const[activeTab,setActiveTab]=useState("decks");
  const[analyzeData,setAnalyzeData]=useState({A:null,B:null});
  const[analyzingDeck,setAnalyzingDeck]=useState(null);
  const[cuePoints,setCuePoints]=useState({A:[],B:[]});
  const[energyScore,setEnergyScore]=useState({A:null,B:null});
  const[keyShift,setKeyShift]=useState({A:0,B:0});
  const[mashupSuggestions,setMashupSuggestions]=useState([]);
  const[setOrderTracks,setSetOrderTracks]=useState([]);
  const[tagStatus,setTagStatus]=useState("");
  const[showPiano,setShowPiano]=useState(false);
  const[midiEnabled,setMidiEnabled]=useState(false);
  const[controllerProfile,setControllerProfile]=useState("Custom");
  const[showProfilePicker,setShowProfilePicker]=useState(false);
  const[keyLock,setKeyLock]=useState({A:false,B:false});
  const[quantize,setQuantize]=useState(true);
  const[tapTimes,setTapTimes]=useState([]);
  const[tapBpm,setTapBpm]=useState(null);
  const[sessionHistory,setSessionHistory]=useState([]);
  const[showHistory,setShowHistory]=useState(false);
  const[streamDests,setStreamDests]=useState({streampirex:false,twitch:false,youtube:false});
  const[midiMap,setMidiMap]=useState({1:"xfader",7:"vol_a",8:"vol_b",10:"low_a",11:"mid_a",74:"filter_a"});
  const mgRef=useRef(null),xgA=useRef(null),xgB=useRef(null),recRef=useRef(null),chunks=useRef([]),rafRef=useRef(null),streamRefs=useRef({});

  const handleTap=useCallback(()=>{
    const now=Date.now();
    setTapTimes(prev=>{
      const recent=[...prev,now].filter(t=>now-t<4000).slice(-8);
      if(recent.length>=2){const intervals=recent.slice(1).map((t,i)=>t-recent[i]);const avg=intervals.reduce((a,b)=>a+b,0)/intervals.length;setTapBpm(Math.round(60000/avg));}
      return recent;
    });
  },[]);

  const addToHistory=useCallback((deck,title,key,bpm)=>{
    setSessionHistory(prev=>[{deck,title,key,bpm,time:new Date().toLocaleTimeString(),ts:Date.now()},...prev].slice(0,50));
  },[]);

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
    let frame=0;
    const tick=()=>{
      const a=deckA.buffer?Math.min(deckA.currentTime()/deckA.duration(),1):0;
      const b=deckB.buffer?Math.min(deckB.currentTime()/deckB.duration(),1):0;
      progRef.current.A=a; progRef.current.B=b;
      // Throttle React state updates to ~10fps (every 6 frames @ 60fps)
      if((frame++ & 5)===0) setProg({A:a,B:b});
      rafRef.current=requestAnimationFrame(tick);
    };
    tick();
    return()=>cancelAnimationFrame(rafRef.current);
  },[]);

  // Pause module-level decks on unmount (otherwise audio keeps playing after navigate-away)
  useEffect(()=>{
    return()=>{
      try{if(deckA.playing)deckA.pause();}catch(_){}
      try{if(deckB.playing)deckB.pause();}catch(_){}
    };
  },[]);

  useEffect(()=>{
    const token=store?.token||localStorage.getItem("token");if(!token)return;
    Promise.all([
      fetch(`${BACKEND}/api/audio/my-tracks`,{headers:{Authorization:`Bearer ${token}`}}).then(r=>r.ok?r.json().then(d=>Array.isArray(d)?d:d.beats||d.data||[]):[]).catch(()=>[]),
      fetch(`${BACKEND}/api/beats/my-beats`,{headers:{Authorization:`Bearer ${token}`}}).then(r=>r.ok?r.json().then(d=>Array.isArray(d)?d:d.beats||d.data||[]):[]).catch(()=>[]),
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
      const result=await dk.loadURL(url);
      dk.title=t.title;dk.artwork=t.artwork_url;dk.audioType=t.audio_type||"original";dk.bpm=result?.bpm||t.bpm;dk.key=t.key;
      upd(id,{loaded:true,bpm:dk.bpm,key:t.key,title:t.title,artwork:t.artwork_url,audioType:dk.audioType,hotcues:[null,null,null,null]});
      addToHistory(id,t.title,t.key,dk.bpm);
    }catch(e){console.error(e);}
    setLdDeck(null);
  };

  const loadFile=async(id,file)=>{
    initAudio();setLdDeck(id);const dk=id==="A"?deckA:deckB;
    try{
      const result=await dk.loadBuffer(await file.arrayBuffer());
      dk.title=file.name.replace(/\.[^.]+$/,"");
      upd(id,{loaded:true,bpm:result?.bpm,key:result?.key,title:dk.title,artwork:null,audioType:"original",hotcues:[null,null,null,null]});
    }catch(e){console.error(e);}
    setLdDeck(null);
  };

  const loadURL=async(id)=>{
    const url=urlI[id];if(!url)return;
    initAudio();setLdDeck(id);const dk=id==="A"?deckA:deckB;
    try{
      await dk.loadURL(url);
      const name=url.split("/").pop().split("?")[0].replace(/\.[^.]+$/,"");
      upd(id,{loaded:true,bpm:dk.bpm,key:null,title:name,artwork:null,audioType:"original",hotcues:[null,null,null,null]});
      setShowUrl(p=>({...p,[id]:false}));setUrlI(p=>({...p,[id]:""}));
    }catch(e){setDjStatus("Failed to load: "+e.message);}
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

  const recDestRef=useRef(null);
  const startRec=()=>{
    initAudio();const c=getCtx();const dest=c.createMediaStreamDestination();
    mgRef.current.connect(dest);
    recDestRef.current=dest;
    const r=new MediaRecorder(dest.stream,{mimeType:"audio/webm"});
    chunks.current=[];r.ondataavailable=e=>chunks.current.push(e.data);
    r.onstop=()=>{
      setRecBlob(new Blob(chunks.current,{type:"audio/webm"}));
      // Disconnect destination node to free resources
      try{if(recDestRef.current){mgRef.current?.disconnect(recDestRef.current);recDestRef.current=null;}}catch(_){}
    };
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
      if(sv.ok){setDjStatus("Mix saved!");setSaveModal(false);setMixTitle("");}
      else throw new Error("Save failed");
    }catch(e){setDjStatus("Error: "+e.message);}
    setSaving(false);
  };

  const applyControllerProfile=useCallback((name)=>{
    const profile=CONTROLLER_PROFILES[name];if(!profile)return;
    setMidiMap(profile.map);setControllerProfile(name);setShowProfilePicker(false);
  },[]);

  const toggleStream=useCallback(async(destId)=>{
    const token=store?.token||localStorage.getItem("token");
    if(streamDests[destId]){
      try{await fetch(`${BACKEND}/api/live-stream/stop`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},body:JSON.stringify({destination:destId})});}catch(e){}
      setStreamDests(p=>({...p,[destId]:false}));
    }else{
      try{
        const c=getCtx();const dest=c.createMediaStreamDestination();mgRef.current?.connect(dest);
        const audioTrack=dest.stream.getAudioTracks()[0];
        const vizCanvas=document.querySelector(".dj-waveform");
        let stream;
        if(vizCanvas){const vs=vizCanvas.captureStream(30);stream=new MediaStream([vs.getVideoTracks()[0],audioTrack]);}
        else{stream=dest.stream;}
        streamRefs.current[destId]=stream;
        if(destId!=="streampirex"){await fetch(`${BACKEND}/api/live-stream/start-rtmp`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},body:JSON.stringify({destination:destId,title:"DJ Mix — Live",stream_key:null})}).catch(e=>console.warn(e));}
        else{await fetch(`${BACKEND}/api/live-stream/create`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},body:JSON.stringify({title:"DJ Mix — Live",type:"audio",is_live:true})}).catch(e=>console.warn(e));}
        setStreamDests(p=>({...p,[destId]:true}));
      }catch(e){setDjStatus("Could not start stream: "+e.message);}
    }
  },[streamDests,store]);

  
  const analyzeDeck=async(id)=>{
    const dk=id==="A"?deckA:deckB;
    if(!dk.buffer){setDjStatus("Load a track first");return;}
    setAnalyzingDeck(id);
    try{
      function audioBufferToWav(buffer){
        const numCh=buffer.numberOfChannels,sr=buffer.sampleRate,len=buffer.length;
        const ab=new ArrayBuffer(44+len*2),view=new DataView(ab);
        const write=(o,s)=>{for(let i=0;i<s.length;i++)view.setUint8(o+i,s.charCodeAt(i));};
        write(0,"RIFF");view.setUint32(4,36+len*2,true);write(8,"WAVE");write(12,"fmt ");
        view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,numCh,true);
        view.setUint32(24,sr,true);view.setUint32(28,sr*numCh*2,true);
        view.setUint16(32,numCh*2,true);view.setUint16(34,16,true);write(36,"data");
        view.setUint32(40,len*2,true);
        const ch=buffer.getChannelData(0);
        for(let i=0;i<len;i++){const s=Math.max(-1,Math.min(1,ch[i]));view.setInt16(44+i*2,s<0?s*0x8000:s*0x7FFF,true);}
        return new Blob([ab],{type:"audio/wav"});
      }
      const ctx2=getCtx();
      const offCtx=new OfflineAudioContext(1,dk.buffer.length,dk.buffer.sampleRate);
      const src2=offCtx.createBufferSource();src2.buffer=dk.buffer;src2.connect(offCtx.destination);src2.start();
      const rendered=await offCtx.startRendering();
      const wavBlob=audioBufferToWav(rendered);
      const form=new FormData();
      form.append("file",wavBlob,"track.wav");
      const res=await fetch(`${BACKEND}/api/dj/analyze`,{method:"POST",body:form});
      const data=await res.json();
      setAnalyzeData(prev=>({...prev,[id]:data}));
      setCuePoints(prev=>({...prev,[id]:data.cues||[]}));
      setEnergyScore(prev=>({...prev,[id]:data.energy}));
      upd(id,{bpm:data.bpm||dk.bpm,key:data.key||dk.key});
      setDjStatus("Deck "+id+" analyzed — Key: "+data.camelot+" Energy: "+data.energy+"/10");
    }catch(e){setDjStatus("Analysis failed: "+e.message);}
    setAnalyzingDeck(null);
  };

  const getMashupSuggestions=async()=>{
    const ad=analyzeData.A||analyzeData.B;
    if(!ad){setDjStatus("Analyze a deck first");return;}
    const camelot=ad.camelot||"8A";
    const bpm=ds.A.bpm||ds.B.bpm||120;
    const library=(lib||[]).map(t=>({id:t.id,title:t.title,artist:t.artist||"",bpm:t.bpm,camelot:t.camelot||t.key,energy:t.energy,artwork_url:t.artwork_url,audio_url:t.audio_url||t.file_url}));
    try{
      const res=await fetch(`${BACKEND}/api/dj/mashup-suggest`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({camelot,bpm,library})});
      const data=await res.json();
      setMashupSuggestions(data.suggestions||[]);
    }catch(e){setDjStatus("Mashup failed: "+e.message);}
  };

  const buildSetOrder=async()=>{
    const tracks=(lib||[]).map(t=>({id:t.id,title:t.title,bpm:t.bpm||120,energy:t.energy||5,camelot:t.camelot||"8A",artwork_url:t.artwork_url}));
    try{
      const res=await fetch(`${BACKEND}/api/dj/set-order`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({tracks})});
      const data=await res.json();
      setSetOrderTracks(data.order||[]);
    }catch(e){setDjStatus("Set order failed: "+e.message);}
  };

  const exportRekordbox=async()=>{
    const tracks=setOrderTracks.length?setOrderTracks:(lib||[]);
    const res=await fetch(`${BACKEND}/api/dj/export/rekordbox`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({tracks})});
    const data=await res.json();
    const blob=new Blob([data.xml],{type:"text/xml"});
    const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="rekordbox.xml";a.click();
    setDjStatus("Rekordbox XML exported");
  };

  const exportTraktor=async()=>{
    const tracks=setOrderTracks.length?setOrderTracks:(lib||[]);
    const res=await fetch(`${BACKEND}/api/dj/export/traktor`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({tracks})});
    const data=await res.json();
    const blob=new Blob([data.nml],{type:"text/xml"});
    const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="traktor.nml";a.click();
    setDjStatus("Traktor NML exported");
  };

  const { separate: realtimeSeparate, isRealtime: stemRealtime } = useStemSeparation();
  const handleStemSeparate=useCallback(async(id)=>{
    const dk=id==="A"?deckA:deckB;const s=id==="A"?ds.A:ds.B;
    if(!dk.buffer||!s.loaded)return;
    upd(id,{stemsLoading:true});
    const token=store?.token||localStorage.getItem("token");
    try{
      const c=getCtx();
      const numCh=dk.buffer.numberOfChannels,sr=dk.buffer.sampleRate,len=dk.buffer.length;
      const wavBuf=new ArrayBuffer(44+len*numCh*2);const view=new DataView(wavBuf);
      const writeStr=(o,s)=>{for(let i=0;i<s.length;i++)view.setUint8(o+i,s.charCodeAt(i));};
      writeStr(0,"RIFF");view.setUint32(4,36+len*numCh*2,true);writeStr(8,"WAVE");writeStr(12,"fmt ");
      view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,numCh,true);
      view.setUint32(24,sr,true);view.setUint32(28,sr*numCh*2,true);view.setUint16(32,numCh*2,true);
      view.setUint16(34,16,true);writeStr(36,"data");view.setUint32(40,len*numCh*2,true);
      let offset=44;
      for(let i=0;i<len;i++)for(let ch=0;ch<numCh;ch++){const samp=Math.max(-1,Math.min(1,dk.buffer.getChannelData(ch)[i]));view.setInt16(offset,samp<0?samp*0x8000:samp*0x7FFF,true);offset+=2;}
      const blob=new Blob([wavBuf],{type:"audio/wav"});
      const form=new FormData();form.append("file",blob,"deck_"+id+".wav");form.append("model","htdemucs");
      const res=await fetch(`${BACKEND}/api/ai/stems/separate-upload`,{method:"POST",headers:{Authorization:`Bearer ${token}`},body:form});
      if(!res.ok)throw new Error("Stem separation failed — "+res.status);
      const data=await res.json();
      // Backend returns { stems: { drums:{url}, bass:{url}, vocals:{url}, other:{url} } }
      const sd=data.stems||{};
      const stemUrls={drums:sd.drums?.url,bass:sd.bass?.url,vocals:sd.vocals?.url,other:sd.other?.url};
      const stems={};const stemData={};
      for(const[name,url]of Object.entries(stemUrls)){
        if(!url)continue;
        const r=await fetch(url);const ab=await r.arrayBuffer();
        const buf=await c.decodeAudioData(ab);
        // Route each stem's gain into the deck channel head so deck EQ/FX/crossfader/master all apply.
        const gn=c.createGain();gn.gain.value=1;gn.connect(dk.gainNode||c.destination);
        stems[name+"_buf"]=buf;stems[name+"_gain"]=gn;
        stemData[name]={buffer:buf,gain:gn};
      }
      if(Object.keys(stemData).length===0)throw new Error("Stem separation returned no stems");
      dk.setStems(stemData);  // stop original full-mix source; start stems together (sample-accurate)
      upd(id,{stems,stemsLoading:false,playing:dk.playing,stemVols:{drums:1,bass:1,vocals:1,other:1},stemMutes:{}});
    }catch(e){console.error("Stems error:",e);upd(id,{stemsLoading:false});setDjStatus("Stem separation failed: "+e.message);}
  },[ds,store]);

  const handleMidiCC=useCallback((cc,val)=>{
    const norm=val/127;const action=midiMap[cc];if(!action)return;
    switch(action){
      case"xfader":setXf(norm);break;
      case"vol_a":deckA.setGain(norm*1.5);upd("A",{vol:norm*1.5});break;
      case"vol_b":deckB.setGain(norm*1.5);upd("B",{vol:norm*1.5});break;
      case"low_a":deckA.setEQ("low",(norm-0.5)*24);upd("A",{low:(norm-0.5)*24});break;
      case"mid_a":deckA.setEQ("mid",(norm-0.5)*24);upd("A",{mid:(norm-0.5)*24});break;
      case"high_a":deckA.setEQ("high",(norm-0.5)*24);upd("A",{high:(norm-0.5)*24});break;
      case"filter_a":deckA.setFX("Filter",norm);break;
      case"filter_b":deckB.setFX("Filter",norm);break;
      default:break;
    }
  },[midiMap]);

  const handleMidiNote=useCallback((note)=>{
    // Pads 36-39 → Deck A hotcues 0-3
    if(note>=36&&note<=39){const hcIdx=note-36;deckA.jumpHotcue(hcIdx);upd("A",{hotcues:[...deckA.hotcues]});return;}
    // Pads 40-43 → Deck B hotcues 0-3
    if(note>=40&&note<=43){const hcIdx=note-40;deckB.jumpHotcue(hcIdx);upd("B",{hotcues:[...deckB.hotcues]});return;}
    if(note===44)togglePlay("A");
    if(note===45)togglePlay("B");
    if(note===46)syncBPM();
    if(note===47){deckA.setCue();upd("A",{});}
    if(note===48){deckB.setCue();upd("B",{});}
  },[]);

  const renderDeck=(id)=>{
    const dk=id==="A"?deckA:deckB,s=ds[id];
    const color=id==="A"?"#00ffcc":"#ff6b35";
    const p=prog[id],cam=s.key?CAMELOT[s.key]:null;
    return(
      <div className={`dj-deck${id==="B"?" dj-deck-b":""}`}>
        <div className="dj-deck-hd">
          <div className={`dj-deck-letter dj-deck-letter-${id.toLowerCase()}`}>{id}</div>
          <div className="dj-deck-info">
            <div className="dj-track-name">{s.title||"No track loaded"}</div>
            <div className="dj-track-meta">
              {s.bpm&&<span className={`dj-badge dj-badge-${id.toLowerCase()}`}>{Math.round(s.bpm)} BPM</span>}
              {cam&&<span className="dj-badge dj-cam">{cam}</span>}
              {s.key&&<span className="dj-badge dj-key">{s.key}</span>}
              {id===master&&<span className="dj-badge dj-mst">MASTER</span>}
            </div>
          </div>
          {s.artwork&&<img src={s.artwork} alt="" className="dj-art"/>}
          {s.loaded&&(
            <button className={`dj-stems-btn${s.stemsLoading?" loading":""}${s.stems?" active":""}`}
              onClick={()=>handleStemSeparate(id)}>
              {s.stemsLoading?"⏳":"🎚"} STEMS
            </button>
          )}
        </div>

        {s.stems&&(
          <div className="dj-stem-mixer">
            <div className="dj-stem-label">STEMS — {s.title}</div>
            {[["🥁","drums","#ff4466"],["🎸","bass","#ff8800"],["🎤","vocals","#00aaff"],["🎹","other","#00ffc8"]].map(([icon,stem,sc])=>(
              <div key={stem} className="dj-stem-ch">
                <span className="dj-stem-icon">{icon}</span>
                <input type="range" className="dj-stem-fader" min={0} max={1} step={0.01}
                  value={s.stemVols?.[stem]??1}
                  style={{"--sc":sc}}
                  onChange={e=>{const v=parseFloat(e.target.value);upd(id,{stemVols:{...(s.stemVols||{}),[stem]:v}});if(s.stems?.[stem+"_gain"])s.stems[stem+"_gain"].gain.value=v;}}/>
                <button className={`dj-stem-mute${s.stemMutes?.[stem]?" muted":""}`}
                  onClick={()=>{const muted=!(s.stemMutes?.[stem]);upd(id,{stemMutes:{...(s.stemMutes||{}),[stem]:muted}});if(s.stems?.[stem+"_gain"])s.stems[stem+"_gain"].gain.value=muted?0:(s.stemVols?.[stem]??1);}}>
                  {s.stemMutes?.[stem]?"M":"—"}
                </button>
                <span className="dj-stem-lbl">{stem}</span>
              </div>
            ))}
          </div>
        )}

        <div className="dj-turntable-wrap">
          <Turntable playing={s.playing} progress={p} color={color} label={id==="A"?"DECK A":"DECK B"}/>
        </div>

        <Waveform deck={dk} color={color}/>

        <div className="dj-prog-wrap">
          <div className="dj-prog">
            <div className={`dj-prog-f dj-prog-f-${id.toLowerCase()}`} style={{width:`${p*100}%`}}/>
          </div>
          <div className="dj-prog-t">
            <span>{fmt(dk.currentTime())}</span>
            <span className="dj-prog-remaining">-{fmt(dk.duration()-dk.currentTime())}</span>
          </div>
        </div>

        <div className="dj-hcues">
          {[0,1,2,3].map(i=>(
            <button key={i} className={`dj-hc${s.hotcues[i]!==null?" set":""}`}
              style={{"--hcc":HC_COLORS[i]}}
              onClick={()=>{dk.jumpHotcue(i);upd(id,{hotcues:[...dk.hotcues]});}}
              onContextMenu={e=>{e.preventDefault();dk.hotcues[i]=null;upd(id,{hotcues:[...dk.hotcues]});}}>
              {i+1}
            </button>
          ))}
          <button className="dj-btn" onClick={()=>{dk.setCue();upd(id,{});}}>CUE</button>
          <button className="dj-btn" onClick={()=>dk.jumpCue()}>◀CUE</button>
          <button className={`dj-btn${s.slip?" dj-slip-on":""}`} onClick={()=>upd(id,{slip:!s.slip})}>SLIP</button>
        </div>

        <BeatJump deck={dk}/>

        <div className="dj-transport">
          <button className={`dj-play${s.playing?" on":""} dj-play-${id.toLowerCase()}`}
            onClick={()=>togglePlay(id)} disabled={!s.loaded}>
            {s.playing?"⏸":"▶"}
          </button>
          <button className={`dj-btn dj-loop${s.loop?" on":""}`}
            onClick={()=>{dk.loop=!dk.loop;if(dk.source)dk.source.loop=dk.loop;upd(id,{loop:dk.loop});}}>🔁</button>
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

        <div className="dj-eq-row">
          <Knob label="HI" value={s.high} min={-12} max={12} color={color} onChange={v=>{dk.setEQ("high",v);upd(id,{high:v});}}/>
          <Knob label="MID" value={s.mid} min={-12} max={12} color={color} onChange={v=>{dk.setEQ("mid",v);upd(id,{mid:v});}}/>
          <Knob label="LOW" value={s.low} min={-12} max={12} color={color} onChange={v=>{dk.setEQ("low",v);upd(id,{low:v});}}/>
          <Knob label="GAIN" value={s.vol} min={0} max={1.5} color={color} onChange={v=>{dk.setGain(v);upd(id,{vol:v});}}/>
          <VU deck={dk}/>
        </div>

        <FXPanel deck={dk}/>

        <div className="dj-faders">
          <div className="dj-fg">
            <label className="dj-fl">PITCH {((s.pitch-1)*100).toFixed(1)}%</label>
            <input type="range" className="dj-fader dj-pitch" min="0.85" max="1.15" step="0.001" value={s.pitch}
              onChange={e=>{const v=parseFloat(e.target.value);dk.pitch=v;if(dk.source)dk.source.playbackRate.value=v;upd(id,{pitch:v});}}/>
            <button className="dj-prst" onClick={()=>{dk.pitch=1;if(dk.source)dk.source.playbackRate.value=1;upd(id,{pitch:1});}}>⊙</button>
          </div>
          <div className="dj-fg">
            <label className="dj-fl">VOL</label>
            <input type="range" className={`dj-fader dj-fader-${id.toLowerCase()}`} min="0" max="1.5" step="0.01" value={s.vol}
              onChange={e=>{const v=parseFloat(e.target.value);dk.setGain(v);upd(id,{vol:v});}}/>
            <span className="dj-fv">{Math.round(s.vol*100)}%</span>
          </div>
        </div>

        <DVSTimecode deckId={id} color={color} audioCtx={getCtx}
          onPitch={p=>{dk.pitch=Math.abs(p);if(dk.source)dk.source.playbackRate.value=Math.abs(p);upd(id,{pitch:Math.abs(p)});}}
          onPosition={()=>{}}/>

        <div className="dj-load-sec">
          <div className="dj-drop-zone"
            onDragOver={e=>e.preventDefault()}
            onDrop={e=>{e.preventDefault();const f=e.dataTransfer.files[0];if(f&&f.type.startsWith("audio/"))loadFile(id,f);}}>
            <label className="dj-drop-label">
              <input type="file" accept="audio/*" className="dj-hidden" onChange={e=>e.target.files[0]&&loadFile(id,e.target.files[0])}/>
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
      <div className="dj-topbar">
        <div className="dj-logo">🎛 <span>SPX <em>DJ Mixer</em></span></div>
        <div className="dj-tabs">
          <button className={`dj-tab${activeTab==="decks"?" active":""}`} onClick={()=>setActiveTab("decks")}>🎚 Decks</button>
          <button className={`dj-tab${activeTab==="sampler"?" active":""}`} onClick={()=>setActiveTab("sampler")}>🥁 Sampler</button>
          <button className={`dj-tab${activeTab==="analyze"?" active":""}`} onClick={()=>setActiveTab("analyze")}>🔬 Analyze</button>
          <button className={`dj-tab${activeTab==="cues"?" active":""}`} onClick={()=>setActiveTab("cues")}>📍 Cues</button>
          <button className={`dj-tab${activeTab==="mashup"?" active":""}`} onClick={()=>setActiveTab("mashup")}>🧩 Mashup</button>
          <button className={`dj-tab${activeTab==="setbuilder"?" active":""}`} onClick={()=>setActiveTab("setbuilder")}>📋 Set Builder</button>
          <button className={`dj-tab${activeTab==="tags"?" active":""}`} onClick={()=>setActiveTab("tags")}>🏷 Tags</button>
        </div>
        <div className="dj-top-acts">
          <button className="dj-sync" onClick={syncBPM}>⟳ SYNC</button>
          <button className="dj-mst-btn" onClick={()=>setMaster(m=>m==="A"?"B":"A")}>MASTER: {master}</button>
          <button className={`dj-tab${quantize?" active":""}`} onClick={()=>setQuantize(v=>!v)}>Q</button>
          <button className="dj-tab" onClick={handleTap}>{tapBpm?`${tapBpm} BPM`:"TAP"}</button>
          {tapBpm&&<button className="dj-tab" onClick={()=>{setTapBpm(null);setTapTimes([]);}}>✕</button>}
          <button className={`dj-tab dj-tab-midi${midiEnabled?" active":""}`} onClick={()=>setMidiEnabled(m=>!m)}>🎹 MIDI</button>
          {midiEnabled&&(
            <div className="dj-profile-wrap">
              <button className="dj-tab" onClick={()=>setShowProfilePicker(p=>!p)}>🎮 {controllerProfile} ▾</button>
              {showProfilePicker&&(
                <div className="dj-profile-picker">
                  {Object.entries(CONTROLLER_PROFILES).map(([name,prof])=>(
                    <button key={name} className={`dj-profile-opt${controllerProfile===name?" active":""}`}
                      onClick={()=>applyControllerProfile(name)}>
                      <div className="dj-profile-name">{name}</div>
                      <div className="dj-profile-desc">{prof.desc}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          <button className={`dj-tab${showHistory?" active":""}`} onClick={()=>setShowHistory(v=>!v)}>📋 LOG</button>
          {!rec
            ?<button className="dj-rec" onClick={startRec}>⏺ REC</button>
            :<button className="dj-rec on" onClick={stopRec}>⏹ STOP</button>
          }
          {recBlob&&<>
            <button className="dj-exp" onClick={dlMix}>⬇ DL</button>
            <button className="dj-exp save" onClick={()=>setSaveModal(true)}>☁ Save</button>
          </>}
          {rec&&<div className="dj-rec-live"><span className="dj-rec-dot"/>REC</div>}
        </div>
      </div>

      {activeTab==="decks"&&(
        <div className="dj-main">
          {renderDeck("A")}
          <div className="dj-center">
            <div className="dj-mixer-title">MIXER</div>
            <div className="dj-xfw">
              <div className="dj-xfl">
                <span className="dj-xfl-a">A</span>
                <span className="dj-xft">CROSSFADER</span>
                <span className="dj-xfl-b">B</span>
              </div>
              <input type="range" className="dj-xfader" min="0" max="1" step="0.005" value={xf} onChange={e=>setXf(parseFloat(e.target.value))}/>
              <button className="dj-xfc" onClick={()=>setXf(0.5)}>⊙ Center</button>
            </div>
            <div className="dj-mvol">
              <label className="dj-fl dj-fl-center">MASTER VOL</label>
              <input type="range" className="dj-fader dj-fader-master" min="0" max="1.5" step="0.01" value={mvol} onChange={e=>setMvol(parseFloat(e.target.value))}/>
              <span className="dj-fv dj-fv-center">{Math.round(mvol*100)}%</span>
            </div>
            <div className="dj-ch-faders-section">
              <div className="dj-ch-faders-label">CH FADERS</div>
              {["A","B"].map(id=>(
                <div key={id} className="dj-fg">
                  <span className={`dj-fl dj-ch-id-${id.toLowerCase()}`}>{id}</span>
                  <input type="range" className={`dj-fader dj-fader-${id.toLowerCase()}`} min="0" max="1.5" step="0.01"
                    value={ds[id].vol}
                    onChange={e=>{const v=parseFloat(e.target.value);(id==="A"?deckA:deckB).setGain(v);upd(id,{vol:v});}}/>
                </div>
              ))}
            </div>
            <div className="dj-stream-panel">
              <div className="dj-stream-label">🔴 BROADCAST</div>
              {[
                {id:"streampirex",label:"StreamPireX",icon:"✨",cls:"dj-stream-btn-spx"},
                {id:"twitch",label:"Twitch",icon:"🟣",cls:"dj-stream-btn-twitch"},
                {id:"youtube",label:"YouTube",icon:"🔴",cls:"dj-stream-btn-yt"},
              ].map(dest=>(
                <div key={dest.id} className="dj-stream-dest">
                  <span className="dj-stream-icon">{dest.icon}</span>
                  <span className="dj-stream-name">{dest.label}</span>
                  <button className={`dj-stream-btn ${dest.cls}${streamDests[dest.id]?" live":""}`}
                    onClick={()=>toggleStream(dest.id)}>
                    {streamDests[dest.id]?"⏹ Stop":"▶ Go Live"}
                  </button>
                </div>
              ))}
              {Object.values(streamDests).some(Boolean)&&(
                <div className="dj-stream-live-badge"><span className="dj-rec-dot"/>LIVE</div>
              )}
              <div className="dj-stream-hint">Configure stream keys in Settings → Streaming</div>
            </div>
          </div>
          {renderDeck("B")}
        </div>
      )}

      {midiEnabled&&(
        <div className="dj-midi-wrap">
          <MidiHardwareInput
            drumMode={false}
            onNoteOn={(note)=>handleMidiNote(note)}
            onNoteOff={()=>{}}
            onCC={(cc,val)=>handleMidiCC(cc,val)}
            onPitchBend={val=>{const norm=(val+8192)/16384;deckA.pitch=0.85+norm*0.3;if(deckA.source)deckA.source.playbackRate.value=deckA.pitch;upd("A",{pitch:deckA.pitch});}}
            onPadTrigger={pad=>handleMidiNote(36+pad)}/>
          <div className="dj-midi-map">
            <div className="dj-midi-map-title">MIDI MAP</div>
            {Object.entries(midiMap).map(([cc,action])=>(
              <div key={cc} className="dj-midi-row">
                <span className="dj-midi-cc">CC {cc}</span>
                <span className="dj-midi-action">{action}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab==="sampler"&&(
        <div className="dj-sampler-view">
          <SamplerPads audioCtx={getCtx} masterOut={mgRef}/>
        </div>
      )}

      <div className="dj-library">
        <div className="dj-lib-hd">
          <span className="dj-lib-ttl">📂 Library</span>
          <input className="dj-lib-s" placeholder="Search…" value={ls} onChange={e=>setLs(e.target.value)}/>
        </div>
        <div className="dj-lib-filters">
          {["all","beat","acapella","stem","remix","mix","sample","original"].map(f=>(
            <button key={f} className={`dj-ff${lf===f?" on":""}`} onClick={()=>setLf(f)}>
              {f==="all"?"All":f.charAt(0).toUpperCase()+f.slice(1)}
            </button>
          ))}
        </div>
        <div className="dj-lib-rows">
          {filtLib.length===0
            ?<div className="dj-lib-empty">{lib.length===0?"Upload audio or beats to see them here":"No tracks match filter"}</div>
            :filtLib.map(t=>(
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
            ))
          }
        </div>
      </div>


      {activeTab==="analyze"&&(
        <div className="dj-analyze-panel">
          <div className="dj-analyze-decks">
            {["A","B"].map(id=>{
              const d=ds[id];const ad=analyzeData[id];
              return(
                <div key={id} className={"dj-analyze-deck dj-analyze-deck-"+id.toLowerCase()}>
                  <div className="dj-analyze-header">DECK {id}{d.title&&<span className="dj-analyze-title"> {d.title}</span>}</div>
                  <div className="dj-analyze-grid">
                    <div className="dj-analyze-cell"><label>BPM</label><span>{d.bpm?Math.round(d.bpm):"—"}</span></div>
                    <div className="dj-analyze-cell"><label>KEY</label><span>{ad?.key||d.key||"—"}</span></div>
                    <div className="dj-analyze-cell"><label>CAMELOT</label><span className="dj-camelot-badge">{ad?.camelot||"—"}</span></div>
                    <div className="dj-analyze-cell"><label>ENERGY</label><EnergyBar score={energyScore[id]}/></div>
                  </div>
                  <div className="dj-key-shift-row">
                    <label>KEY SHIFT</label>
                    <input type="range" min="-6" max="6" step="1" value={keyShift[id]}
                      onChange={e=>setKeyShift(prev=>({...prev,[id]:Number(e.target.value)}))}/>
                    <span>{keyShift[id]>0?"+":""}{keyShift[id]} st</span>
                  </div>
                  <button className="dj-btn-analyze" onClick={()=>analyzeDeck(id)} disabled={analyzingDeck===id||!d.loaded}>
                    {analyzingDeck===id?"⏳ Analyzing...":"🔬 Analyze Track"}
                  </button>
                </div>
              );
            })}
          </div>
          <div className="dj-piano-toggle-row">
            <button className={"dj-tab"+(showPiano?" active":"")} onClick={()=>setShowPiano(v=>!v)}>🎹 Piano Reference</button>
          </div>
          {showPiano&&<PianoReference currentKey={analyzeData.A?.key||analyzeData.B?.key||ds.A.key||ds.B.key}/>}
        </div>
      )}

      {activeTab==="cues"&&(
        <div className="dj-cues-panel">
          <div className="dj-cues-header">
            <span>Auto Cue Points</span>
            <div className="dj-cues-actions">
              <button className="dj-btn-sm" onClick={()=>analyzeDeck("A")} disabled={!ds.A.loaded}>🔬 Detect A</button>
              <button className="dj-btn-sm" onClick={()=>analyzeDeck("B")} disabled={!ds.B.loaded}>🔬 Detect B</button>
            </div>
          </div>
          {["A","B"].map(id=>(
            <div key={id} className="dj-cue-deck-section">
              <div className="dj-cue-deck-label">DECK {id}</div>
              {cuePoints[id].length===0
                ?<div className="dj-cues-empty">Load a track and click Detect {id}</div>
                :<div className="dj-cue-list">
                  {cuePoints[id].map(c=>(
                    <div key={c.index} className="dj-cue-item" style={{borderLeft:"3px solid "+c.color}}>
                      <span className="dj-cue-label">{c.label}</span>
                      <span className="dj-cue-time">{c.time.toFixed(2)}s</span>
                      <button className="dj-cue-jump" onClick={()=>{const dk=id==="A"?deckA:deckB;dk.pauseOffset=c.time;if(dk.playing)dk.play(c.time);}}>▶</button>
                    </div>
                  ))}
                </div>
              }
            </div>
          ))}
          <div className="dj-export-row">
            <span>Export:</span>
            <button className="dj-btn-sm" onClick={exportRekordbox}>Rekordbox XML</button>
            <button className="dj-btn-sm" onClick={exportTraktor}>Traktor NML</button>
          </div>
        </div>
      )}

      {activeTab==="mashup"&&(
        <div className="dj-mashup-panel">
          <div className="dj-mashup-header">
            <div className="dj-mashup-source">
              Source: {analyzeData.A?.camelot||analyzeData.B?.camelot||"Analyze a deck first"}
              {(ds.A.bpm||ds.B.bpm)&&<span> @ {Math.round(ds.A.bpm||ds.B.bpm)} BPM</span>}
            </div>
            <button className="dj-btn-analyze" onClick={getMashupSuggestions}>🧩 Find Matches</button>
          </div>
          {mashupSuggestions.length===0
            ?<div className="dj-mashup-empty">Analyze a deck then click Find Matches to see harmonically compatible tracks.</div>
            :<div className="dj-mashup-list">
              {mashupSuggestions.map((t,i)=>(
                <div key={i} className="dj-mashup-item">
                  {t.artwork_url&&<img src={t.artwork_url} className="dj-mashup-art" alt=""/>}
                  <div className="dj-mashup-info">
                    <div className="dj-mashup-name">{t.title}</div>
                    <div className="dj-mashup-meta">{t.camelot} · {t.bpm?Math.round(t.bpm):"?"}BPM</div>
                  </div>
                  <div className="dj-compat-badge" style={{color:t.compatibility>=90?"#00ffc8":t.compatibility>=75?"#ffcc00":"#ff8800"}}>{t.compatibility}%</div>
                  <button className="dj-btn-sm" onClick={()=>loadLib("B",t)}>→ B</button>
                </div>
              ))}
            </div>
          }
        </div>
      )}

      {activeTab==="setbuilder"&&(
        <div className="dj-set-panel">
          <div className="dj-set-header">
            <span>Set Builder — Energy Arc</span>
            <div>
              <button className="dj-btn-sm" onClick={buildSetOrder}>⚡ Build Set</button>
              <button className="dj-btn-sm" onClick={exportRekordbox}>↓ Rekordbox</button>
              <button className="dj-btn-sm" onClick={exportTraktor}>↓ Traktor</button>
            </div>
          </div>
          {setOrderTracks.length===0
            ?<div className="dj-set-empty">Click Build Set to auto-arrange your library into a progressive energy arc.</div>
            :<>
              <div className="dj-energy-arc">
                {setOrderTracks.map((t,i)=>(
                  <div key={i} className="dj-arc-bar-wrap" title={t.title+" | Energy: "+(t.energy||5)+"/10"}>
                    <div className="dj-arc-bar" style={{height:((t.energy||5)*10)+"%",background:t.energy>=8?"#ff4400":t.energy>=5?"#00ffc8":"#0088ff"}}/>
                    <span className="dj-arc-num">{i+1}</span>
                  </div>
                ))}
              </div>
              <div className="dj-set-list">
                {setOrderTracks.map((t,i)=>(
                  <div key={i} className="dj-set-item">
                    <span className="dj-set-num">{i+1}</span>
                    {t.artwork_url&&<img src={t.artwork_url} className="dj-mashup-art" alt=""/>}
                    <div className="dj-mashup-info">
                      <div className="dj-mashup-name">{t.title}</div>
                      <div className="dj-mashup-meta">{t.camelot||""} · {t.bpm?Math.round(t.bpm):"?"}BPM · Energy {t.energy||"?"}/10</div>
                    </div>
                    <button className="dj-btn-sm" onClick={()=>loadLib("A",t)}>→ A</button>
                  </div>
                ))}
              </div>
            </>
          }
        </div>
      )}

      {activeTab==="tags"&&(
        <div className="dj-tags-panel">
          <div className="dj-tags-header">ID3 Tag Writer & Cleaner</div>
          <div className="dj-tags-info">Write detected key and BPM directly into file metadata so Serato, Rekordbox, and Traktor read them automatically.</div>
          {["A","B"].map(id=>{
            const d=decks[id];const ad=analyzeData[id];
            return(
              <div key={id} className="dj-tag-deck">
                <div className="dj-tag-deck-label">DECK {id} — {d.title||"No track loaded"}</div>
                <div className="dj-tag-row">
                  <span>BPM: {ad?.bpm||d.bpm?Math.round(ad?.bpm||d.bpm):"—"}</span>
                  <span>Key: {ad?.camelot||"—"}</span>
                </div>
              </div>
            );
          })}
          <div className="dj-tag-upload">
            <div className="dj-tags-subheader">Upload File to Write Tags</div>
            <input type="file" accept=".mp3,.flac,.m4a,.aac" className="dj-tag-file-input"
              onChange={async(e)=>{
                const file=e.target.files[0];if(!file)return;
                const form=new FormData();form.append("file",file);
                const ad2=analyzeData.A||analyzeData.B;
                if(ad2?.bpm)form.append("bpm",String(ad2.bpm));
                if(ad2?.camelot)form.append("camelot",ad2.camelot);
                if(ad2?.key)form.append("key",ad2.key);
                setTagStatus("Writing tags...");
                try{
                  const res=await fetch(`${BACKEND}/api/dj/tag-write`,{method:"POST",body:form});
                  const data=await res.json();
                  if(data.file_b64){
                    const bytes=atob(data.file_b64);const arr=new Uint8Array(bytes.length);
                    for(let i=0;i<bytes.length;i++)arr[i]=bytes.charCodeAt(i);
                    const blob=new Blob([arr]);const a=document.createElement("a");
                    a.href=URL.createObjectURL(blob);a.download=data.filename||file.name;a.click();
                    setTagStatus("Tags written — file downloaded");
                  }else{setTagStatus("Failed: "+(data.error||"unknown"));}
                }catch(err){setTagStatus("Error: "+err.message);}
              }}/>
            <div className="dj-tag-status">{tagStatus}</div>
          </div>
          <div className="dj-tag-clean-section">
            <div className="dj-tags-subheader">Clean Junk Metadata</div>
            <input type="file" accept=".mp3" className="dj-tag-file-input"
              onChange={async(e)=>{
                const file=e.target.files[0];if(!file)return;
                const form=new FormData();form.append("file",file);
                setTagStatus("Cleaning...");
                try{
                  const res=await fetch(`${BACKEND}/api/dj/tag-clean`,{method:"POST",body:form});
                  const data=await res.json();
                  if(data.file_b64){
                    const bytes=atob(data.file_b64);const arr=new Uint8Array(bytes.length);
                    for(let i=0;i<bytes.length;i++)arr[i]=bytes.charCodeAt(i);
                    const blob=new Blob([arr]);const a=document.createElement("a");
                    a.href=URL.createObjectURL(blob);a.download=data.filename||file.name;a.click();
                    setTagStatus("Cleaned — removed: "+(data.removed||[]).join(", ")||"nothing removed");
                  }else{setTagStatus("Failed: "+(data.error||"unknown"));}
                }catch(err){setTagStatus("Error: "+err.message);}
              }}/>
          </div>
        </div>
      )}

      {showHistory&&(
        <div className="dj-history-panel">
          <div className="dj-history-header">
            <span className="dj-history-title">📋 Session Tracklist</span>
            <div className="dj-history-actions">
              <button className="dj-btn" onClick={()=>{
                const txt=sessionHistory.map((t,i)=>((i+1)+". ["+t.time+"] Deck "+t.deck+": "+t.title+(t.bpm?" - "+t.bpm+"BPM":"")+(t.key?" ("+t.key+")":""))).join("\n");
                navigator.clipboard.writeText(txt);
              }}>Copy</button>
              <button className="dj-btn" onClick={()=>setShowHistory(false)}>✕</button>
            </div>
          </div>
          {sessionHistory.length===0&&<div className="dj-lib-empty">No tracks played yet</div>}
          {sessionHistory.map((t,i)=>(
            <div key={i} className="dj-history-row">
              <div className={`dj-history-deck dj-history-deck-${t.deck.toLowerCase()}`}>{t.deck}</div>
              <div className="dj-history-info">
                <div className="dj-history-track">{t.title}</div>
                <div className="dj-history-meta">
                  {t.bpm&&<span className="dj-history-bpm">{t.bpm} BPM</span>}
                  {t.key&&<span className="dj-history-key">{t.key}</span>}
                  <span className="dj-history-time">{t.time}</span>
                </div>
              </div>
            </div>
          ))}
          {sessionHistory.length>0&&(
            <div className="dj-history-clear">
              <button className="dj-btn dj-btn-danger" onClick={()=>setSessionHistory([])}>Clear History</button>
            </div>
          )}
        </div>
      )}

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
