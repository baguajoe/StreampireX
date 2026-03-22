// =============================================================================
// SynthCreator.js — Full-Featured Subtractive Synthesizer
// Location: src/front/js/component/SynthCreator.js
// NEW: LFO2, Compressor FX, Filter Drive, Per-osc Pan, Oscilloscope,
//      ADSR visualizer, preset delete, dbl-click knob reset, fine tuning
// =============================================================================

import React, { useState, useEffect, useRef, useCallback } from 'react';
import '../../styles/SynthCreator.css';

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const WAVEFORMS      = ['sine', 'sawtooth', 'square', 'triangle'];
const WAVEFORM_ICONS = { sine: '∿', sawtooth: '⋀', square: '⊓', triangle: '△' };
const WAVEFORM_LABELS= { sine: 'SIN', sawtooth: 'SAW', square: 'SQR', triangle: 'TRI' };
const FILTER_TYPES   = ['lowpass', 'highpass', 'bandpass', 'notch'];
const LFO_DESTS      = ['pitch', 'filter', 'amp', 'pan'];
const NOISE_TYPES    = ['white', 'pink', 'brown'];
const ARP_MODES      = ['up', 'down', 'updown', 'random', 'chord'];
const ARP_RATES      = ['1/4', '1/8', '1/16', '1/32'];

const getFreq = midi => 440 * Math.pow(2, (midi - 69) / 12);

const KEY_MAP = {
  'z':48,'s':49,'x':50,'d':51,'c':52,'v':53,'g':54,'b':55,'h':56,'n':57,'j':58,'m':59,
  'q':60,'2':61,'w':62,'3':63,'e':64,'r':65,'5':66,'t':67,'6':68,'y':69,'7':70,'u':71,'i':72,
};

const DEFAULT_PRESET = {
  name: 'Init',
  oscs: [
    { on: true,  wave: 'sawtooth', oct: 0,  semi: 0, detune: 0,  vol: 0.8, pan: 0 },
    { on: false, wave: 'square',   oct: 0,  semi: 0, detune: 5,  vol: 0.5, pan: 0 },
    { on: false, wave: 'sine',     oct: -1, semi: 0, detune: 0,  vol: 0.4, pan: 0 },
  ],
  unison:    { voices: 1, spread: 10, width: 0.8 },
  noise:     { on: false, type: 'white', vol: 0.15 },
  sub:       { on: false, oct: -1, vol: 0.4 },
  amp:       { attack: 0.01, decay: 0.2, sustain: 0.7, release: 0.4 },
  filter:    { type: 'lowpass', cutoff: 4000, res: 1, on: true, drive: 0 },
  filterEnv: { amount: 2000, attack: 0.01, decay: 0.3, sustain: 0.2, release: 0.4 },
  lfo:       { on: false, wave: 'sine',     rate: 2.5, depth: 50, dest: 'filter' },
  lfo2:      { on: false, wave: 'triangle', rate: 0.5, depth: 20, dest: 'amp' },
  glide:     { on: false, time: 0.1 },
  pitchEnv:  { on: false, amount: 12, attack: 0.01, decay: 0.3 },
  arp:       { on: false, mode: 'up', rate: '1/8', octaves: 1, bpm: 120 },
  fx: {
    chorus:     { on: false, rate: 1.2, depth: 0.003, mix: 0.4 },
    phaser:     { on: false, rate: 0.5, depth: 1000,  mix: 0.5 },
    flanger:    { on: false, rate: 0.3, depth: 0.005, mix: 0.4 },
    distort:    { on: false, amount: 30 },
    bitcrush:   { on: false, bits: 8, sr: 0.5 },
    reverb:     { on: true,  decay: 1.5, mix: 0.2 },
    delay:      { on: false, time: 0.375, feedback: 0.4, mix: 0.3 },
    compressor: { on: false, threshold: -24, ratio: 4, attack: 0.003, release: 0.25 },
  },
  master: { vol: 0.7, voices: 8, tune: 0 },
};

const FACTORY_PRESETS = [
  { name:'808 Bass', oscs:[{on:true,wave:'sine',oct:-1,semi:0,detune:0,vol:0.9,pan:0},{on:false,wave:'sawtooth',oct:0,semi:0,detune:0,vol:0.5,pan:0},{on:false,wave:'sine',oct:0,semi:0,detune:0,vol:0.4,pan:0}],unison:{voices:1,spread:0,width:0},noise:{on:false,type:'white',vol:0.1},sub:{on:true,oct:-1,vol:0.5},amp:{attack:0.005,decay:0.8,sustain:0.0,release:0.5},filter:{type:'lowpass',cutoff:800,res:2,on:true,drive:0},filterEnv:{amount:1200,attack:0.005,decay:0.4,sustain:0,release:0.3},lfo:{on:false,wave:'sine',rate:2,depth:30,dest:'filter'},lfo2:{on:false,wave:'triangle',rate:0.5,depth:20,dest:'amp'},glide:{on:true,time:0.08},pitchEnv:{on:false,amount:12,attack:0.01,decay:0.3},arp:{on:false,mode:'up',rate:'1/8',octaves:1,bpm:120},fx:{chorus:{on:false,rate:1.2,depth:0.003,mix:0.4},phaser:{on:false,rate:0.5,depth:1000,mix:0.5},flanger:{on:false,rate:0.3,depth:0.005,mix:0.4},distort:{on:true,amount:15},bitcrush:{on:false,bits:8,sr:0.5},reverb:{on:false,decay:1.5,mix:0.15},delay:{on:false,time:0.375,feedback:0.4,mix:0.3},compressor:{on:true,threshold:-18,ratio:6,attack:0.003,release:0.25}},master:{vol:0.8,voices:4,tune:0} },
  { name:'Supersaw Lead', oscs:[{on:true,wave:'sawtooth',oct:0,semi:0,detune:0,vol:0.7,pan:0},{on:true,wave:'sawtooth',oct:0,semi:0,detune:12,vol:0.7,pan:0},{on:true,wave:'sawtooth',oct:1,semi:0,detune:-8,vol:0.4,pan:0}],unison:{voices:7,spread:25,width:0.9},noise:{on:false,type:'white',vol:0.05},sub:{on:false,oct:-1,vol:0.3},amp:{attack:0.01,decay:0.1,sustain:0.8,release:0.4},filter:{type:'lowpass',cutoff:6000,res:3,on:true,drive:0},filterEnv:{amount:3000,attack:0.01,decay:0.4,sustain:0.3,release:0.3},lfo:{on:true,wave:'sine',rate:0.3,depth:20,dest:'filter'},lfo2:{on:false,wave:'triangle',rate:0.5,depth:20,dest:'amp'},glide:{on:false,time:0.05},pitchEnv:{on:false,amount:12,attack:0.01,decay:0.3},arp:{on:false,mode:'up',rate:'1/8',octaves:1,bpm:120},fx:{chorus:{on:true,rate:0.8,depth:0.004,mix:0.5},phaser:{on:false,rate:0.5,depth:1000,mix:0.5},flanger:{on:false,rate:0.3,depth:0.005,mix:0.4},distort:{on:false,amount:10},bitcrush:{on:false,bits:8,sr:0.5},reverb:{on:true,decay:2,mix:0.3},delay:{on:true,time:0.375,feedback:0.35,mix:0.25},compressor:{on:false,threshold:-24,ratio:4,attack:0.003,release:0.25}},master:{vol:0.7,voices:8,tune:0} },
  { name:'Dreamy Pad', oscs:[{on:true,wave:'sawtooth',oct:0,semi:0,detune:0,vol:0.5,pan:0},{on:true,wave:'sawtooth',oct:0,semi:7,detune:5,vol:0.4,pan:0},{on:true,wave:'triangle',oct:1,semi:0,detune:-3,vol:0.3,pan:0}],unison:{voices:4,spread:15,width:0.85},noise:{on:false,type:'white',vol:0.05},sub:{on:false,oct:-1,vol:0.2},amp:{attack:0.6,decay:0.5,sustain:0.7,release:2.0},filter:{type:'lowpass',cutoff:2500,res:2,on:true,drive:0},filterEnv:{amount:800,attack:0.5,decay:0.8,sustain:0.4,release:1.5},lfo:{on:true,wave:'sine',rate:0.15,depth:300,dest:'filter'},lfo2:{on:true,wave:'sine',rate:0.08,depth:10,dest:'pitch'},glide:{on:false,time:0.1},pitchEnv:{on:false,amount:12,attack:0.01,decay:0.3},arp:{on:false,mode:'up',rate:'1/8',octaves:1,bpm:120},fx:{chorus:{on:true,rate:0.5,depth:0.005,mix:0.6},phaser:{on:true,rate:0.2,depth:1500,mix:0.4},flanger:{on:false,rate:0.3,depth:0.005,mix:0.4},distort:{on:false,amount:10},bitcrush:{on:false,bits:8,sr:0.5},reverb:{on:true,decay:4,mix:0.5},delay:{on:true,time:0.5,feedback:0.4,mix:0.3},compressor:{on:false,threshold:-24,ratio:4,attack:0.003,release:0.25}},master:{vol:0.65,voices:6,tune:0} },
  { name:'Pluck Keys', oscs:[{on:true,wave:'triangle',oct:0,semi:0,detune:0,vol:0.8,pan:0},{on:false,wave:'sine',oct:0,semi:0,detune:0,vol:0.4,pan:0},{on:false,wave:'sawtooth',oct:0,semi:0,detune:0,vol:0.3,pan:0}],unison:{voices:1,spread:0,width:0},noise:{on:true,type:'white',vol:0.08},sub:{on:false,oct:-1,vol:0.3},amp:{attack:0.003,decay:0.4,sustain:0.0,release:0.3},filter:{type:'lowpass',cutoff:5000,res:4,on:true,drive:0},filterEnv:{amount:6000,attack:0.001,decay:0.25,sustain:0,release:0.15},lfo:{on:false,wave:'sine',rate:2,depth:20,dest:'filter'},lfo2:{on:false,wave:'triangle',rate:0.5,depth:20,dest:'amp'},glide:{on:false,time:0.05},pitchEnv:{on:false,amount:12,attack:0.01,decay:0.3},arp:{on:false,mode:'up',rate:'1/8',octaves:1,bpm:120},fx:{chorus:{on:false,rate:1.2,depth:0.003,mix:0.3},phaser:{on:false,rate:0.5,depth:1000,mix:0.5},flanger:{on:false,rate:0.3,depth:0.005,mix:0.4},distort:{on:false,amount:10},bitcrush:{on:false,bits:8,sr:0.5},reverb:{on:true,decay:1.2,mix:0.25},delay:{on:true,time:0.25,feedback:0.3,mix:0.2},compressor:{on:false,threshold:-24,ratio:4,attack:0.003,release:0.25}},master:{vol:0.75,voices:6,tune:0} },
  { name:'Wobble Bass', oscs:[{on:true,wave:'sawtooth',oct:-1,semi:0,detune:0,vol:0.8,pan:0},{on:true,wave:'square',oct:-1,semi:0,detune:3,vol:0.5,pan:0},{on:false,wave:'sine',oct:0,semi:0,detune:0,vol:0.3,pan:0}],unison:{voices:2,spread:8,width:0.5},noise:{on:false,type:'white',vol:0.05},sub:{on:true,oct:-1,vol:0.4},amp:{attack:0.01,decay:0.2,sustain:0.8,release:0.3},filter:{type:'lowpass',cutoff:400,res:12,on:true,drive:0.3},filterEnv:{amount:0,attack:0.01,decay:0.3,sustain:0,release:0.3},lfo:{on:true,wave:'sine',rate:4,depth:3000,dest:'filter'},lfo2:{on:false,wave:'triangle',rate:0.5,depth:20,dest:'amp'},glide:{on:false,time:0.05},pitchEnv:{on:false,amount:12,attack:0.01,decay:0.3},arp:{on:false,mode:'up',rate:'1/8',octaves:1,bpm:120},fx:{chorus:{on:false,rate:1.2,depth:0.003,mix:0.3},phaser:{on:false,rate:0.5,depth:1000,mix:0.5},flanger:{on:false,rate:0.3,depth:0.005,mix:0.4},distort:{on:true,amount:25},bitcrush:{on:false,bits:8,sr:0.5},reverb:{on:false,decay:1.5,mix:0.1},delay:{on:false,time:0.375,feedback:0.4,mix:0.2},compressor:{on:true,threshold:-12,ratio:8,attack:0.001,release:0.1}},master:{vol:0.75,voices:4,tune:0} },
  { name:'Lo-Fi Keys', oscs:[{on:true,wave:'triangle',oct:0,semi:0,detune:0,vol:0.7,pan:0},{on:true,wave:'sine',oct:0,semi:0,detune:2,vol:0.3,pan:0},{on:false,wave:'sine',oct:0,semi:0,detune:0,vol:0.3,pan:0}],unison:{voices:1,spread:0,width:0},noise:{on:true,type:'pink',vol:0.04},sub:{on:false,oct:-1,vol:0.2},amp:{attack:0.005,decay:0.6,sustain:0.2,release:0.8},filter:{type:'lowpass',cutoff:2000,res:1.5,on:true,drive:0},filterEnv:{amount:1500,attack:0.005,decay:0.4,sustain:0,release:0.3},lfo:{on:true,wave:'sine',rate:0.8,depth:8,dest:'pitch'},lfo2:{on:false,wave:'triangle',rate:0.5,depth:20,dest:'amp'},glide:{on:false,time:0.05},pitchEnv:{on:false,amount:12,attack:0.01,decay:0.3},arp:{on:false,mode:'up',rate:'1/8',octaves:1,bpm:120},fx:{chorus:{on:true,rate:0.4,depth:0.003,mix:0.3},phaser:{on:false,rate:0.5,depth:1000,mix:0.5},flanger:{on:false,rate:0.3,depth:0.005,mix:0.4},distort:{on:false,amount:10},bitcrush:{on:true,bits:12,sr:0.7},reverb:{on:true,decay:2,mix:0.3},delay:{on:false,time:0.375,feedback:0.3,mix:0.2},compressor:{on:false,threshold:-24,ratio:4,attack:0.003,release:0.25}},master:{vol:0.7,voices:6,tune:0} },
  { name:'Bell Tone', oscs:[{on:true,wave:'sine',oct:0,semi:0,detune:0,vol:0.8,pan:0},{on:true,wave:'sine',oct:1,semi:5,detune:0,vol:0.4,pan:0.3},{on:true,wave:'sine',oct:2,semi:10,detune:0,vol:0.2,pan:-0.3}],unison:{voices:1,spread:0,width:0},noise:{on:false,type:'white',vol:0.02},sub:{on:false,oct:-1,vol:0.2},amp:{attack:0.001,decay:1.2,sustain:0.0,release:2.0},filter:{type:'lowpass',cutoff:12000,res:0.5,on:true,drive:0},filterEnv:{amount:0,attack:0.001,decay:0.5,sustain:0,release:0.5},lfo:{on:false,wave:'sine',rate:2,depth:20,dest:'pitch'},lfo2:{on:false,wave:'triangle',rate:0.5,depth:20,dest:'amp'},glide:{on:false,time:0.05},pitchEnv:{on:false,amount:12,attack:0.01,decay:0.3},arp:{on:false,mode:'up',rate:'1/8',octaves:1,bpm:120},fx:{chorus:{on:false,rate:1.2,depth:0.003,mix:0.3},phaser:{on:false,rate:0.5,depth:1000,mix:0.5},flanger:{on:false,rate:0.3,depth:0.005,mix:0.4},distort:{on:false,amount:5},bitcrush:{on:false,bits:8,sr:0.5},reverb:{on:true,decay:3.5,mix:0.4},delay:{on:true,time:0.33,feedback:0.25,mix:0.2},compressor:{on:false,threshold:-24,ratio:4,attack:0.003,release:0.25}},master:{vol:0.7,voices:8,tune:0} },
  { name:'FX Sweep', oscs:[{on:true,wave:'sawtooth',oct:0,semi:0,detune:0,vol:0.6,pan:0},{on:true,wave:'square',oct:0,semi:5,detune:0,vol:0.4,pan:0},{on:false,wave:'sine',oct:0,semi:0,detune:0,vol:0.3,pan:0}],unison:{voices:3,spread:20,width:0.7},noise:{on:true,type:'white',vol:0.1},sub:{on:false,oct:-1,vol:0.3},amp:{attack:0.8,decay:0.5,sustain:0.5,release:2.0},filter:{type:'lowpass',cutoff:200,res:8,on:true,drive:0.2},filterEnv:{amount:8000,attack:1.5,decay:1,sustain:0.3,release:1.5},lfo:{on:true,wave:'sine',rate:0.5,depth:2,dest:'pitch'},lfo2:{on:true,wave:'sawtooth',rate:0.3,depth:500,dest:'filter'},glide:{on:false,time:0.1},pitchEnv:{on:false,amount:12,attack:0.01,decay:0.3},arp:{on:false,mode:'up',rate:'1/8',octaves:1,bpm:120},fx:{chorus:{on:true,rate:1,depth:0.005,mix:0.5},phaser:{on:true,rate:0.8,depth:2000,mix:0.6},flanger:{on:false,rate:0.3,depth:0.005,mix:0.4},distort:{on:false,amount:10},bitcrush:{on:false,bits:8,sr:0.5},reverb:{on:true,decay:3,mix:0.4},delay:{on:true,time:0.5,feedback:0.5,mix:0.35},compressor:{on:false,threshold:-24,ratio:4,attack:0.003,release:0.25}},master:{vol:0.65,voices:6,tune:0} },
];

// ─────────────────────────────────────────────────────────────────────────────
// KNOB
// ─────────────────────────────────────────────────────────────────────────────

const Knob = ({ value, min, max, step=0.01, onChange, label, unit='', size=52, color='#00e5ff', log=false, bipolar=false }) => {
  const drag=useRef(false), sy=useRef(0), sv=useRef(0);
  const toN = v => bipolar ? (v-min)/(max-min) : log
    ? Math.log(Math.max(v,1e-4)/Math.max(min,1e-4))/Math.log(Math.max(max,1e-4)/Math.max(min,1e-4))
    : (v-min)/(max-min);
  const frN = n => bipolar ? min+n*(max-min) : log ? min*Math.pow(max/min,n) : min+n*(max-min);
  const angle = -135 + toN(value) * 270;

  const onMD = e => {
    e.preventDefault(); drag.current=true; sy.current=e.clientY; sv.current=value;
    const mv = me => {
      if (!drag.current) return;
      let nn = Math.max(0, Math.min(1, toN(sv.current)+(sy.current-me.clientY)/140));
      let nv = frN(nn);
      if (step) nv = Math.round(nv/step)*step;
      onChange(Math.max(min, Math.min(max, nv)));
    };
    const up = () => { drag.current=false; window.removeEventListener('mousemove',mv); window.removeEventListener('mouseup',up); };
    window.addEventListener('mousemove',mv); window.addEventListener('mouseup',up);
  };
  const onDbl = e => { e.preventDefault(); onChange(bipolar ? 0 : log ? Math.sqrt(min*max) : (min+max)/2); };
  const disp = () => {
    if (Math.abs(value)>=1000) return `${(value/1000).toFixed(1)}k`;
    if (step<0.1) return value.toFixed(2);
    if (step<1) return value.toFixed(1);
    return Math.round(value);
  };
  const r=size/2-5, cx=size/2, cy=size/2;
  const rad = d => (d-90)*Math.PI/180;
  const ap = (a1,a2) => {
    const x1=cx+r*Math.cos(a1),y1=cy+r*Math.sin(a1),x2=cx+r*Math.cos(a2),y2=cy+r*Math.sin(a2);
    const lg=(a2-a1+Math.PI*2)%(Math.PI*2)>Math.PI?1:0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${lg} 1 ${x2} ${y2}`;
  };
  const dR = rad(angle);
  const uid = `sckg_${label}_${size}`.replace(/\W/g,'_');
  return (
    <div className="sc-knob-wrap">
      <svg width={size} height={size} onMouseDown={onMD} onDoubleClick={onDbl} className="sc-knob-svg">
        <defs><radialGradient id={uid} cx="38%" cy="32%">
          <stop offset="0%" stopColor="#1e3555"/><stop offset="100%" stopColor="#070f1c"/>
        </radialGradient></defs>
        <path d={ap(rad(-135),rad(135))} fill="none" stroke="#07101c" strokeWidth="4.5" strokeLinecap="round"/>
        <path d={ap(rad(-135),rad(angle))} fill="none" stroke={color} strokeWidth="3.5" strokeLinecap="round"
          style={{filter:`drop-shadow(0 0 4px ${color}99)`}}/>
        <circle cx={cx} cy={cy} r={size/2-11} fill={`url(#${uid})`} stroke="#1a2d45" strokeWidth="1.5"/>
        <circle cx={cx+(r-5)*Math.cos(dR)} cy={cy+(r-5)*Math.sin(dR)} r="2.5" fill={color}
          style={{filter:`drop-shadow(0 0 5px ${color})`}}/>
      </svg>
      <div className="sc-knob-label">{label}</div>
      <div className="sc-knob-value" style={{color}}>{disp()}{unit}</div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// LED TOGGLE
// ─────────────────────────────────────────────────────────────────────────────

const LEDToggle = ({ value, onChange, label, color='#00e5ff' }) => (
  <button className={`sc-led-toggle ${value?'active':''}`} style={{'--led-color':color}} onClick={()=>onChange(!value)}>
    <span className="sc-led-dot"/>{label}
  </button>
);

// ─────────────────────────────────────────────────────────────────────────────
// WAVE SELECT
// ─────────────────────────────────────────────────────────────────────────────

const WaveSelect = ({ value, onChange, color='#00e5ff' }) => (
  <div className="sc-wave-group">
    {WAVEFORMS.map(w => (
      <button key={w} className={`sc-wave-btn ${value===w?'active':''}`}
        style={{'--wave-color':color}} onClick={()=>onChange(w)} title={w}>
        <span className="sc-wave-icon">{WAVEFORM_ICONS[w]}</span>
        <span className="sc-wave-label">{WAVEFORM_LABELS[w]}</span>
      </button>
    ))}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// PILL GROUP
// ─────────────────────────────────────────────────────────────────────────────

const PillGroup = ({ options, value, onChange, color='#00e5ff' }) => (
  <div className="sc-pill-group">
    {options.map(opt => {
      const v = opt.value||opt, l = opt.label||opt;
      return (
        <button key={v} className={`sc-pill ${value===v?'active':''}`}
          style={{'--pill-color':color}} onClick={()=>onChange(v)}>{l}</button>
      );
    })}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// PANEL BOX
// ─────────────────────────────────────────────────────────────────────────────

const Panel = ({ title, accent='#00e5ff', children, right }) => (
  <div className="sc-panel-box" style={{'--panel-accent':accent}}>
    <div className="sc-panel-header">
      <div className="sc-panel-title"><span className="sc-panel-accent-bar"/>{title}</div>
      {right && <div className="sc-panel-right">{right}</div>}
    </div>
    <div className="sc-panel-body">{children}</div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// ADSR VISUALIZER
// ─────────────────────────────────────────────────────────────────────────────

const ADSRViz = ({ attack, decay, sustain, release, color='#00e5ff' }) => {
  const W=280, H=56, pad=8;
  const a = Math.min((attack/4)*(W-pad*2), 65);
  const d = Math.min((decay/4)*(W-pad*2), 55);
  const sy = H-pad-(sustain*(H-pad*2));
  const r = Math.min((release/8)*(W-pad*2), 60);
  const sw = Math.max(25, (W-pad*2)-a-d-r-10);
  const pts = [[pad,H-pad],[pad+a,pad],[pad+a+d,sy],[pad+a+d+sw,sy],[pad+a+d+sw+r,H-pad]];
  const poly = pts.map(p=>p.join(',')).join(' ');
  const fill = [...pts,[pad,H-pad]].map(p=>p.join(',')).join(' ');
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{display:'block',marginBottom:4}}>
      <polygon points={fill} fill={`${color}15`}/>
      <polyline points={poly} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round"
        style={{filter:`drop-shadow(0 0 3px ${color}88)`}}/>
      {pts.map(([x,y],i) => <circle key={i} cx={x} cy={y} r="2.5" fill={color} opacity="0.8"/>)}
    </svg>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// OSCILLOSCOPE
// ─────────────────────────────────────────────────────────────────────────────

const Oscilloscope = ({ analyserRef }) => {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext('2d');
    const draw = () => {
      rafRef.current = requestAnimationFrame(draw);
      ctx.fillStyle = '#060e1a'; ctx.fillRect(0,0,cv.width,cv.height);
      if (!analyserRef.current) return;
      const buf = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteTimeDomainData(buf);
      ctx.strokeStyle = '#00e5ff'; ctx.lineWidth = 1.5;
      ctx.shadowBlur = 8; ctx.shadowColor = '#00e5ff66';
      ctx.beginPath();
      const sw = cv.width/buf.length;
      for (let i=0; i<buf.length; i++) {
        const y = ((buf[i]/128-1)*cv.height/2)+cv.height/2;
        i===0 ? ctx.moveTo(0,y) : ctx.lineTo(i*sw,y);
      }
      ctx.stroke();
    };
    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, [analyserRef]);
  return <canvas ref={canvasRef} width={280} height={52} className="sc-scope"/>;
};

// ─────────────────────────────────────────────────────────────────────────────
// AUDIO ENGINE
// ─────────────────────────────────────────────────────────────────────────────

function useSynthEngine(preset) {
  const ctxRef=useRef(null), activeVoices=useRef({}), fxInputRef=useRef(null);
  const reverbIRRef=useRef(null), lastNoteRef=useRef(null), analyserRef=useRef(null);
  const presetRef=useRef(preset); presetRef.current=preset;

  const getCtx = useCallback(() => {
    if (!ctxRef.current) ctxRef.current = new (window.AudioContext||window.webkitAudioContext)();
    if (ctxRef.current.state==='suspended') ctxRef.current.resume();
    return ctxRef.current;
  }, []);

  const buildIR = useCallback((ctx, decay) => {
    const len=Math.floor(ctx.sampleRate*decay);
    const buf=ctx.createBuffer(2,len,ctx.sampleRate);
    for (let ch=0;ch<2;ch++){const d=buf.getChannelData(ch);for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,1.5);}
    return buf;
  }, []);

  const buildNoise = useCallback((ctx, type, dur=2) => {
    const len=Math.floor(ctx.sampleRate*dur);
    const buf=ctx.createBuffer(1,len,ctx.sampleRate);
    const d=buf.getChannelData(0);
    if (type==='white') { for(let i=0;i<len;i++)d[i]=Math.random()*2-1; }
    else if (type==='pink') {
      let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0;
      for(let i=0;i<len;i++){const w=Math.random()*2-1;b0=0.99886*b0+w*0.0555179;b1=0.99332*b1+w*0.0750759;b2=0.96900*b2+w*0.1538520;b3=0.86650*b3+w*0.3104856;b4=0.55000*b4+w*0.5329522;b5=-0.7616*b5-w*0.0168980;d[i]=(b0+b1+b2+b3+b4+b5+b6+w*0.5362)/5.5;b6=w*0.115926;}
    } else { let last=0;for(let i=0;i<len;i++){last=(last+0.02*(Math.random()*2-1))/1.02;d[i]=last*3.5;} }
    return buf;
  }, []);

  const buildFX = useCallback((ctx, p) => {
    const fx=p.fx; const input=ctx.createGain(); let last=input;
    const chain = n => { last.connect(n); last=n; };

    if (fx.compressor?.on){const c=ctx.createDynamicsCompressor();c.threshold.value=fx.compressor.threshold;c.ratio.value=fx.compressor.ratio;c.attack.value=fx.compressor.attack;c.release.value=fx.compressor.release;chain(c);}
    if (fx.chorus.on){const dry=ctx.createGain();dry.gain.value=1-fx.chorus.mix;const wet=ctx.createGain();wet.gain.value=fx.chorus.mix;const dl=ctx.createDelay(0.05);dl.delayTime.value=fx.chorus.depth;const lfo=ctx.createOscillator();lfo.frequency.value=fx.chorus.rate;const lg=ctx.createGain();lg.gain.value=fx.chorus.depth*0.5;lfo.connect(lg);lg.connect(dl.delayTime);lfo.start();const m=ctx.createGain();last.connect(dry);dry.connect(m);last.connect(dl);dl.connect(wet);wet.connect(m);last=m;}
    if (fx.flanger.on){const dry=ctx.createGain();dry.gain.value=1-fx.flanger.mix;const wet=ctx.createGain();wet.gain.value=fx.flanger.mix;const dl=ctx.createDelay(0.02);dl.delayTime.value=0.003;const lfo=ctx.createOscillator();lfo.frequency.value=fx.flanger.rate;const lg=ctx.createGain();lg.gain.value=fx.flanger.depth*0.3;const fb=ctx.createGain();fb.gain.value=0.5;lfo.connect(lg);lg.connect(dl.delayTime);lfo.start();dl.connect(fb);fb.connect(dl);const m=ctx.createGain();last.connect(dry);dry.connect(m);last.connect(dl);dl.connect(wet);wet.connect(m);last=m;}
    if (fx.phaser.on){const stages=Array.from({length:4},()=>{const f=ctx.createBiquadFilter();f.type='allpass';f.frequency.value=fx.phaser.depth;f.Q.value=5;return f;});stages.reduce((a,b)=>{a.connect(b);return b;});const lfo=ctx.createOscillator();lfo.frequency.value=fx.phaser.rate;const lg=ctx.createGain();lg.gain.value=fx.phaser.depth*0.5;lfo.connect(lg);stages.forEach(s=>lg.connect(s.frequency));lfo.start();const pD=ctx.createGain();pD.gain.value=0.5;const pW=ctx.createGain();pW.gain.value=fx.phaser.mix*0.5;const m=ctx.createGain();last.connect(pD);pD.connect(m);last.connect(stages[0]);stages[3].connect(pW);pW.connect(m);last=m;}
    if (fx.distort.on){const ws=ctx.createWaveShaper();ws.oversample='4x';const a=fx.distort.amount;const curve=new Float32Array(44100);for(let i=0;i<44100;i++){const x=(i*2)/44100-1;curve[i]=((3+a)*x*20*(Math.PI/180))/(Math.PI+a*Math.abs(x));}ws.curve=curve;chain(ws);}
    if (fx.bitcrush.on){const sc=ctx.createScriptProcessor(4096,1,1);const bits=Math.round(fx.bitcrush.bits);const step=Math.pow(0.5,bits-1);const srR=Math.max(1,Math.round(1/(fx.bitcrush.sr+0.01)));let held=0,cnt=0;sc.onaudioprocess=e=>{const inp=e.inputBuffer.getChannelData(0),out=e.outputBuffer.getChannelData(0);for(let i=0;i<inp.length;i++){if(++cnt>=srR){cnt=0;held=step*Math.round(inp[i]/step);}out[i]=held;}};chain(sc);}
    if (fx.delay.on){const dry=ctx.createGain();dry.gain.value=1;const wet=ctx.createGain();wet.gain.value=fx.delay.mix;const dl=ctx.createDelay(5);dl.delayTime.value=fx.delay.time;const fb=ctx.createGain();fb.gain.value=Math.min(0.9,fx.delay.feedback);dl.connect(fb);fb.connect(dl);const m=ctx.createGain();last.connect(dry);dry.connect(m);last.connect(dl);dl.connect(wet);wet.connect(m);last=m;}
    if (fx.reverb.on){const conv=ctx.createConvolver();if(!reverbIRRef.current)reverbIRRef.current=buildIR(ctx,fx.reverb.decay);conv.buffer=reverbIRRef.current;const dry=ctx.createGain();dry.gain.value=1-fx.reverb.mix;const wet=ctx.createGain();wet.gain.value=fx.reverb.mix;const m=ctx.createGain();last.connect(dry);dry.connect(m);last.connect(conv);conv.connect(wet);wet.connect(m);last=m;}

    const analyser=ctx.createAnalyser(); analyser.fftSize=512;
    last.connect(analyser); analyserRef.current=analyser;
    const master=ctx.createGain(); master.gain.value=p.master.vol;
    analyser.connect(master); master.connect(ctx.destination);
    fxInputRef.current=input;
    return {input,master};
  }, [buildIR]);

  const noteOn = useCallback((midi, vel=0.8) => {
    const p=presetRef.current; const ctx=getCtx();
    if (!fxInputRef.current) buildFX(ctx,p);
    if (activeVoices.current[midi]) noteOff(midi);

    const freq=getFreq(midi)*Math.pow(2,(p.master.tune||0)/100);
    const now=ctx.currentTime; const dest=fxInputRef.current;

    const vg=ctx.createGain();
    vg.gain.setValueAtTime(0,now);
    vg.gain.linearRampToValueAtTime(vel,now+p.amp.attack);
    vg.gain.linearRampToValueAtTime(vel*p.amp.sustain,now+p.amp.attack+p.amp.decay);
    vg.connect(dest);

    const filt=ctx.createBiquadFilter();
    filt.type=p.filter.type;
    filt.frequency.setValueAtTime(Math.min(p.filter.cutoff+p.filterEnv.amount,20000),now);
    filt.frequency.linearRampToValueAtTime(Math.min(p.filter.cutoff+p.filterEnv.amount*p.filterEnv.sustain,20000),now+p.filterEnv.attack+p.filterEnv.decay);
    filt.Q.value=p.filter.res;

    if ((p.filter.drive||0)>0) {
      const ws=ctx.createWaveShaper(); const drv=p.filter.drive*30;
      const curve=new Float32Array(256);
      for(let i=0;i<256;i++){const x=(i*2)/256-1;curve[i]=Math.tanh(x*(1+drv));}
      ws.curve=curve; filt.connect(ws); ws.connect(vg);
    } else { filt.connect(vg); }

    const oscsOut=[];
    p.oscs.forEach(osc => {
      if (!osc.on) return;
      const uv=Math.max(1,p.unison.voices);
      for (let u=0;u<uv;u++) {
        const spread=uv>1?((u/(uv-1))-0.5)*p.unison.spread:0;
        const o=ctx.createOscillator(); o.type=osc.wave;
        const bf=freq*Math.pow(2,osc.oct)*Math.pow(2,osc.semi/12);
        if (p.glide.on&&lastNoteRef.current!=null) {
          const lf=getFreq(lastNoteRef.current)*Math.pow(2,osc.oct)*Math.pow(2,osc.semi/12);
          o.frequency.setValueAtTime(lf,now); o.frequency.linearRampToValueAtTime(bf,now+p.glide.time);
        } else { o.frequency.setValueAtTime(bf,now); }
        o.detune.value=osc.detune+spread;
        const og=ctx.createGain(); og.gain.value=osc.vol/uv;
        const pan=ctx.createStereoPanner();
        pan.pan.value=(osc.pan||0)+(uv>1?((u/(uv-1))-0.5)*p.unison.width:0);
        o.connect(og); og.connect(pan); pan.connect(filt); o.start(now);
        oscsOut.push({osc:o,gain:og,pan});
      }
    });

    if (p.sub.on){const sub=ctx.createOscillator();sub.type='sine';sub.frequency.value=freq*Math.pow(2,p.sub.oct);const sg=ctx.createGain();sg.gain.value=p.sub.vol;sub.connect(sg);sg.connect(filt);sub.start(now);oscsOut.push({osc:sub,gain:sg});}
    if (p.noise.on){const nb=buildNoise(ctx,p.noise.type,2);const ns=ctx.createBufferSource();ns.buffer=nb;ns.loop=true;const ng=ctx.createGain();ng.gain.value=p.noise.vol;ns.connect(ng);ng.connect(filt);ns.start(now);oscsOut.push({osc:ns,gain:ng});}

    let lfoNode=null;
    if (p.lfo.on){const lfo=ctx.createOscillator();lfo.type=p.lfo.wave;lfo.frequency.value=p.lfo.rate;const lg=ctx.createGain();lfoNode={lfo,gain:lg};if(p.lfo.dest==='filter'){lg.gain.value=p.lfo.depth;lfo.connect(lg);lg.connect(filt.frequency);}else if(p.lfo.dest==='pitch'){lg.gain.value=p.lfo.depth;lfo.connect(lg);oscsOut.forEach(v=>{if(v.osc.detune)lg.connect(v.osc.detune);});}else if(p.lfo.dest==='amp'){lg.gain.value=p.lfo.depth*0.01;lfo.connect(lg);lg.connect(vg.gain);}else if(p.lfo.dest==='pan'){lg.gain.value=p.lfo.depth*0.01;lfo.connect(lg);oscsOut.forEach(v=>{if(v.pan)lg.connect(v.pan.pan);});}lfo.start(now);}

    let lfo2Node=null;
    if (p.lfo2?.on){const lfo2=ctx.createOscillator();lfo2.type=p.lfo2.wave;lfo2.frequency.value=p.lfo2.rate;const lg2=ctx.createGain();lfo2Node={lfo:lfo2,gain:lg2};if(p.lfo2.dest==='filter'){lg2.gain.value=p.lfo2.depth;lfo2.connect(lg2);lg2.connect(filt.frequency);}else if(p.lfo2.dest==='pitch'){lg2.gain.value=p.lfo2.depth;lfo2.connect(lg2);oscsOut.forEach(v=>{if(v.osc.detune)lg2.connect(v.osc.detune);});}else if(p.lfo2.dest==='amp'){lg2.gain.value=p.lfo2.depth*0.01;lfo2.connect(lg2);lg2.connect(vg.gain);}lfo2.start(now);}

    lastNoteRef.current=midi;
    activeVoices.current[midi]={oscs:oscsOut,voiceGain:vg,filter:filt,lfoNode,lfo2Node};
  }, [getCtx, buildFX, buildNoise]);

  const noteOff = useCallback(midi => {
    const p=presetRef.current; const voice=activeVoices.current[midi]; if(!voice)return;
    const ctx=getCtx(); const now=ctx.currentTime; const rel=p.amp.release;
    voice.voiceGain.gain.cancelScheduledValues(now);
    voice.voiceGain.gain.setValueAtTime(voice.voiceGain.gain.value,now);
    voice.voiceGain.gain.linearRampToValueAtTime(0,now+rel);
    const stop=now+rel+0.05;
    voice.oscs.forEach(({osc})=>{try{osc.stop(stop);}catch(e){}});
    if(voice.lfoNode){try{voice.lfoNode.lfo.stop(stop);}catch(e){}}
    if(voice.lfo2Node){try{voice.lfo2Node.lfo.stop(stop);}catch(e){}}
    setTimeout(()=>{try{voice.voiceGain.disconnect();voice.filter.disconnect();}catch(e){}delete activeVoices.current[midi];},(rel+0.15)*1000);
  }, [getCtx]);

  const initFX = useCallback(() => {
    const ctx=getCtx();
    if(fxInputRef.current){try{fxInputRef.current.disconnect();}catch(e){}}
    reverbIRRef.current=null; buildFX(ctx,presetRef.current);
  }, [getCtx, buildFX]);

  return { noteOn, noteOff, initFX, getCtx, analyserRef };
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

const SynthCreator = ({ onClose, onAssignToPad, onAssignToTrack }) => {
  const [preset, setPreset]           = useState(() => JSON.parse(JSON.stringify(DEFAULT_PRESET)));
  const [activeTab, setActiveTab]     = useState('osc');
  const [activeKeys, setActiveKeys]   = useState(new Set());
  const [octaveShift, setOctaveShift] = useState(0);
  const [presetName, setPresetName]   = useState('Init');
  const [savedPresets, setSavedPresets] = useState([]);
  const [showPresets, setShowPresets] = useState(false);
  const [exporting, setExporting]     = useState(false);
  const [saveName, setSaveName]       = useState('');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [status, setStatus]           = useState('');
  const [showScope, setShowScope]     = useState(true);
  const heldKeys = useRef(new Set());

  const { noteOn, noteOff, initFX, getCtx, analyserRef } = useSynthEngine(preset);

  useEffect(() => { try{const r=localStorage.getItem('spx_synth_presets');if(r)setSavedPresets(JSON.parse(r));}catch(e){} }, []);
  useEffect(() => { initFX(); }, [preset.fx, preset.master.vol]);

  // QWERTY keyboard
  useEffect(() => {
    const down = e => {
      if (['INPUT','TEXTAREA'].includes(e.target.tagName)) return;
      const k=e.key.toLowerCase(); if(heldKeys.current.has(k)) return;
      if(KEY_MAP[k]!=null){heldKeys.current.add(k);const m=KEY_MAP[k]+octaveShift*12;noteOn(m);setActiveKeys(p=>new Set([...p,m]));}
    };
    const up = e => {
      const k=e.key.toLowerCase(); heldKeys.current.delete(k);
      if(KEY_MAP[k]!=null){const m=KEY_MAP[k]+octaveShift*12;noteOff(m);setActiveKeys(p=>{const n=new Set(p);n.delete(m);return n;});}
    };
    window.addEventListener('keydown',down); window.addEventListener('keyup',up);
    return()=>{window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);};
  }, [noteOn, noteOff, octaveShift]);

  // Patch helpers
  const setOsc    = (i,k,v) => setPreset(p=>({...p,oscs:p.oscs.map((o,idx)=>idx===i?{...o,[k]:v}:o)}));
  const setAmp    = (k,v)   => setPreset(p=>({...p,amp:{...p.amp,[k]:v}}));
  const setFilter = (k,v)   => setPreset(p=>({...p,filter:{...p.filter,[k]:v}}));
  const setFEnv   = (k,v)   => setPreset(p=>({...p,filterEnv:{...p.filterEnv,[k]:v}}));
  const setLfo    = (k,v)   => setPreset(p=>({...p,lfo:{...p.lfo,[k]:v}}));
  const setLfo2   = (k,v)   => setPreset(p=>({...p,lfo2:{...p.lfo2,[k]:v}}));
  const setFx     = (fk,k,v)=> setPreset(p=>({...p,fx:{...p.fx,[fk]:{...p.fx[fk],[k]:v}}}));
  const setUnison = (k,v)   => setPreset(p=>({...p,unison:{...p.unison,[k]:v}}));
  const setNoise  = (k,v)   => setPreset(p=>({...p,noise:{...p.noise,[k]:v}}));
  const setSub    = (k,v)   => setPreset(p=>({...p,sub:{...p.sub,[k]:v}}));
  const setGlide  = (k,v)   => setPreset(p=>({...p,glide:{...p.glide,[k]:v}}));
  const setArp    = (k,v)   => setPreset(p=>({...p,arp:{...p.arp,[k]:v}}));

  const toast = m => { setStatus(m); setTimeout(()=>setStatus(''),2500); };
  const loadPreset = p => { setPreset(JSON.parse(JSON.stringify(p))); setPresetName(p.name); setShowPresets(false); };
  const deletePreset = name => {
    const u=savedPresets.filter(p=>p.name!==name); setSavedPresets(u);
    try{localStorage.setItem('spx_synth_presets',JSON.stringify(u));}catch(e){}
  };
  const savePreset = () => {
    const name=saveName.trim()||presetName;
    const np={...JSON.parse(JSON.stringify(preset)),name};
    const u=[...savedPresets.filter(p=>p.name!==name),np];
    setSavedPresets(u); try{localStorage.setItem('spx_synth_presets',JSON.stringify(u));}catch(e){}
    setPresetName(name); setShowSaveModal(false); setSaveName(''); toast('✓ Saved');
  };

  const exportWAV = async () => {
    setExporting(true);
    try {
      const dur=3; const offCtx=new OfflineAudioContext(2,Math.floor(44100*dur),44100);
      const notes=[60,64,67];
      const irLen=Math.floor(44100*(preset.fx.reverb.decay||1.5));
      const irBuf=offCtx.createBuffer(2,irLen,44100);
      for(let ch=0;ch<2;ch++){const d=irBuf.getChannelData(ch);for(let i=0;i<irLen;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/irLen,1.5);}
      const master=offCtx.createGain(); master.gain.value=preset.master.vol; master.connect(offCtx.destination);
      notes.forEach((midi,ni)=>{
        const t=ni*0.05; const freq=getFreq(midi);
        const vg=offCtx.createGain();vg.gain.setValueAtTime(0,t);vg.gain.linearRampToValueAtTime(0.6,t+preset.amp.attack);vg.gain.linearRampToValueAtTime(0.6*preset.amp.sustain,t+preset.amp.attack+preset.amp.decay);vg.gain.linearRampToValueAtTime(0,dur-preset.amp.release);
        const filt=offCtx.createBiquadFilter();filt.type=preset.filter.type;filt.frequency.value=preset.filter.cutoff;filt.Q.value=preset.filter.res;filt.connect(vg);
        if(preset.fx.reverb.on){const conv=offCtx.createConvolver();conv.buffer=irBuf;const dry=offCtx.createGain();dry.gain.value=1-preset.fx.reverb.mix;const wet=offCtx.createGain();wet.gain.value=preset.fx.reverb.mix;const m=offCtx.createGain();vg.connect(dry);dry.connect(m);vg.connect(conv);conv.connect(wet);wet.connect(m);m.connect(master);}else{vg.connect(master);}
        preset.oscs.forEach(osc=>{if(!osc.on)return;const o=offCtx.createOscillator();o.type=osc.wave;o.frequency.value=freq*Math.pow(2,osc.oct)*Math.pow(2,osc.semi/12);o.detune.value=osc.detune;const og=offCtx.createGain();og.gain.value=osc.vol;o.connect(og);og.connect(filt);o.start(t);o.stop(dur);});
      });
      const rendered=await offCtx.startRendering();
      const nc=rendered.numberOfChannels,sr=rendered.sampleRate,len=rendered.length*nc*2;
      const buf=new ArrayBuffer(44+len);const view=new DataView(buf);
      const ws=(o,s)=>{for(let i=0;i<s.length;i++)view.setUint8(o+i,s.charCodeAt(i));};
      ws(0,'RIFF');view.setUint32(4,36+len,true);ws(8,'WAVE');ws(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);
      view.setUint16(22,nc,true);view.setUint32(24,sr,true);view.setUint32(28,sr*nc*2,true);view.setUint16(32,nc*2,true);
      view.setUint16(34,16,true);ws(36,'data');view.setUint32(40,len,true);
      let off=44;for(let i=0;i<rendered.length;i++){for(let ch=0;ch<nc;ch++){const s=Math.max(-1,Math.min(1,rendered.getChannelData(ch)[i]));view.setInt16(off,s<0?s*0x8000:s*0x7FFF,true);off+=2;}}
      const blob=new Blob([buf],{type:'audio/wav'});const url=URL.createObjectURL(blob);
      const a=document.createElement('a');a.href=url;a.download=`${presetName.replace(/\s+/g,'_')}.wav`;document.body.appendChild(a);a.click();document.body.removeChild(a);
      setTimeout(()=>URL.revokeObjectURL(url),5000);
      toast('✓ WAV exported');
    } catch(e){console.error(e);toast('✗ Export failed');}
    setExporting(false);
  };

  // ── Piano keyboard ──
  const OCTAVES=[3,4,5]; const WW=24,WH=82,BW=15,BH=52;
  const KPO=[{b:false,m:0},{b:true,m:1},{b:false,m:2},{b:true,m:3},{b:false,m:4},{b:false,m:5},{b:true,m:6},{b:false,m:7},{b:true,m:8},{b:false,m:9},{b:true,m:10},{b:false,m:11}];

  const renderKeyboard = () => {
    const allKeys=OCTAVES.flatMap(oct=>KPO.map(k=>({...k,midi:(oct+1)*12+k.m+octaveShift*12,oct})));
    const whites=allKeys.filter(k=>!k.b);
    return (
      <div style={{position:'relative',height:WH+4,width:whites.length*WW,userSelect:'none',flexShrink:0}}>
        {whites.map((k,i)=>(
          <div key={`w${k.midi}`}
            onMouseDown={e=>{e.preventDefault();noteOn(k.midi,0.8);setActiveKeys(p=>new Set([...p,k.midi]));}}
            onMouseUp={()=>{noteOff(k.midi);setActiveKeys(p=>{const n=new Set(p);n.delete(k.midi);return n;});}}
            onMouseLeave={()=>{if(activeKeys.has(k.midi)){noteOff(k.midi);setActiveKeys(p=>{const n=new Set(p);n.delete(k.midi);return n;});}}}
            className={`sc-key-white ${activeKeys.has(k.midi)?'active':''}`}
            style={{position:'absolute',left:i*WW,width:WW-1,height:WH}}/>
        ))}
        {allKeys.filter(k=>k.b).map(k=>{
          const oi=OCTAVES.indexOf(k.oct);
          const wbO=[0,1,1,2,2,3,3,4,4,5,5,6][k.m];
          const left=(oi*7+wbO)*WW+WW-BW/2;
          return (
            <div key={`b${k.midi}`}
              onMouseDown={e=>{e.preventDefault();e.stopPropagation();noteOn(k.midi,0.9);setActiveKeys(p=>new Set([...p,k.midi]));}}
              onMouseUp={e=>{e.stopPropagation();noteOff(k.midi);setActiveKeys(p=>{const n=new Set(p);n.delete(k.midi);return n;});}}
              className={`sc-key-black ${activeKeys.has(k.midi)?'active':''}`}
              style={{position:'absolute',left,width:BW,height:BH}}/>
          );
        })}
      </div>
    );
  };

  const OSC_COLORS=['#00e5ff','#ff6b35','#a78bfa'];
  const TABS=[
    {id:'osc',   label:'OSC',    icon:'◎'},
    {id:'env',   label:'ENV',    icon:'╱╲'},
    {id:'filter',label:'FILTER', icon:'≋'},
    {id:'lfo',   label:'MOD',    icon:'∿'},
    {id:'fx',    label:'FX',     icon:'⚡'},
    {id:'out',   label:'OUTPUT', icon:'▷'},
  ];

  return (
    <div className="sc-root">
      {/* HEADER */}
      <div className="sc-header">
        <div className="sc-header-left">
          <div className="sc-logo">
            <span className="sc-logo-icon">♦</span>
            <span className="sc-logo-name">SYNTH<span className="sc-logo-x">X</span></span>
          </div>
          <div className="sc-header-preset-name">{presetName}</div>
          {showScope && <Oscilloscope analyserRef={analyserRef}/>}
        </div>
        <div className="sc-header-right">
          {status && <span className="sc-status">{status}</span>}
          <button className="sc-hbtn sc-hbtn-ghost" onClick={()=>setShowScope(s=>!s)}>{showScope?'◉ SCOPE':'○ SCOPE'}</button>
          <button className="sc-hbtn sc-hbtn-ghost" onClick={()=>setShowPresets(!showPresets)}>◫ PRESETS</button>
          <button className="sc-hbtn sc-hbtn-ghost" onClick={()=>setShowSaveModal(true)}>↓ SAVE</button>
          <button className="sc-hbtn sc-hbtn-amber" onClick={exportWAV} disabled={exporting}>{exporting?'◌ RENDERING':'⬇ WAV'}</button>
          {onClose && <button className="sc-hbtn sc-hbtn-danger" onClick={onClose}>✕</button>}
        </div>
      </div>

      {/* PRESET PANEL */}
      {showPresets && (
        <div className="sc-presets-overlay">
          <div className="sc-presets-panel">
            <div className="sc-presets-section-label">FACTORY PRESETS</div>
            <div className="sc-presets-grid">
              {FACTORY_PRESETS.map(p=><button key={p.name} className="sc-preset-btn" onClick={()=>loadPreset(p)}>{p.name}</button>)}
            </div>
            {savedPresets.length>0 && <>
              <div className="sc-presets-section-label" style={{marginTop:10}}>MY PRESETS</div>
              <div className="sc-presets-grid">
                {savedPresets.map(p=>(
                  <div key={p.name} className="sc-preset-user-row">
                    <button className="sc-preset-btn sc-preset-user" onClick={()=>loadPreset(p)}>{p.name}</button>
                    <button className="sc-preset-del" onClick={()=>deletePreset(p.name)}>✕</button>
                  </div>
                ))}
              </div>
            </>}
          </div>
        </div>
      )}

      {/* TABS */}
      <div className="sc-tabs">
        {TABS.map(t=>(
          <button key={t.id} className={`sc-tab ${activeTab===t.id?'active':''}`} onClick={()=>setActiveTab(t.id)}>
            <span className="sc-tab-icon">{t.icon}</span>
            <span className="sc-tab-label">{t.label}</span>
          </button>
        ))}
      </div>

      {/* CONTENT */}
      <div className="sc-content">

        {/* ── OSC ── */}
        {activeTab==='osc' && <div className="sc-tab-pane">
          {preset.oscs.map((osc,i)=>(
            <Panel key={i} title={`OSC ${i+1}`} accent={OSC_COLORS[i]}
              right={<LEDToggle value={osc.on} onChange={v=>setOsc(i,'on',v)} label="ON" color={OSC_COLORS[i]}/>}>
              <div style={{opacity:osc.on?1:0.38,transition:'opacity 0.2s'}}>
                <WaveSelect value={osc.wave} onChange={v=>setOsc(i,'wave',v)} color={OSC_COLORS[i]}/>
                <div className="sc-knob-row" style={{marginTop:12}}>
                  <Knob value={osc.oct} min={-2} max={2} step={1} onChange={v=>setOsc(i,'oct',v)} label="OCT" color={OSC_COLORS[i]} bipolar/>
                  <Knob value={osc.semi} min={-12} max={12} step={1} onChange={v=>setOsc(i,'semi',v)} label="SEMI" color={OSC_COLORS[i]} bipolar/>
                  <Knob value={osc.detune} min={-100} max={100} step={1} onChange={v=>setOsc(i,'detune',v)} label="DETUNE" unit="¢" color={OSC_COLORS[i]} bipolar/>
                  <Knob value={osc.vol} min={0} max={1} step={0.01} onChange={v=>setOsc(i,'vol',v)} label="LEVEL" color={OSC_COLORS[i]}/>
                  <Knob value={osc.pan||0} min={-1} max={1} step={0.01} onChange={v=>setOsc(i,'pan',v)} label="PAN" color={OSC_COLORS[i]} bipolar/>
                </div>
              </div>
            </Panel>
          ))}
          <div className="sc-row-2col">
            <Panel title="UNISON" accent="#ff6b35">
              <div className="sc-knob-row">
                <Knob value={preset.unison.voices} min={1} max={7} step={2} onChange={v=>setUnison('voices',v)} label="VOICES" color="#ff6b35"/>
                <Knob value={preset.unison.spread} min={0} max={100} step={1} onChange={v=>setUnison('spread',v)} label="SPREAD" unit="¢" color="#ff6b35"/>
                <Knob value={preset.unison.width} min={0} max={1} step={0.01} onChange={v=>setUnison('width',v)} label="WIDTH" color="#ff6b35"/>
              </div>
            </Panel>
            <Panel title="GLIDE" accent="#34d399" right={<LEDToggle value={preset.glide.on} onChange={v=>setGlide('on',v)} label="ON" color="#34d399"/>}>
              <div className="sc-knob-row">
                <Knob value={preset.glide.time} min={0.01} max={2} step={0.01} log onChange={v=>setGlide('time',v)} label="TIME" unit="s" color="#34d399"/>
              </div>
            </Panel>
          </div>
          <div className="sc-row-2col">
            <Panel title="SUB OSC" accent="#a78bfa" right={<LEDToggle value={preset.sub.on} onChange={v=>setSub('on',v)} label="ON" color="#a78bfa"/>}>
              <div className="sc-knob-row">
                <Knob value={preset.sub.oct} min={-2} max={-1} step={1} onChange={v=>setSub('oct',v)} label="OCT" color="#a78bfa"/>
                <Knob value={preset.sub.vol} min={0} max={1} step={0.01} onChange={v=>setSub('vol',v)} label="LEVEL" color="#a78bfa"/>
              </div>
            </Panel>
            <Panel title="NOISE" accent="#f59e0b" right={<LEDToggle value={preset.noise.on} onChange={v=>setNoise('on',v)} label="ON" color="#f59e0b"/>}>
              <PillGroup options={NOISE_TYPES} value={preset.noise.type} onChange={v=>setNoise('type',v)} color="#f59e0b"/>
              <div className="sc-knob-row" style={{marginTop:10}}>
                <Knob value={preset.noise.vol} min={0} max={1} step={0.01} onChange={v=>setNoise('vol',v)} label="LEVEL" color="#f59e0b"/>
              </div>
            </Panel>
          </div>
        </div>}

        {/* ── ENV ── */}
        {activeTab==='env' && <div className="sc-tab-pane">
          <Panel title="AMP ENVELOPE" accent="#00e5ff">
            <ADSRViz attack={preset.amp.attack} decay={preset.amp.decay} sustain={preset.amp.sustain} release={preset.amp.release} color="#00e5ff"/>
            <div className="sc-knob-row" style={{marginTop:12}}>
              <Knob value={preset.amp.attack} min={0.001} max={4} step={0.001} log onChange={v=>setAmp('attack',v)} label="ATTACK" unit="s" color="#00e5ff"/>
              <Knob value={preset.amp.decay} min={0.01} max={4} step={0.01} log onChange={v=>setAmp('decay',v)} label="DECAY" unit="s" color="#00e5ff"/>
              <Knob value={preset.amp.sustain} min={0} max={1} step={0.01} onChange={v=>setAmp('sustain',v)} label="SUSTAIN" color="#00e5ff"/>
              <Knob value={preset.amp.release} min={0.01} max={8} step={0.01} log onChange={v=>setAmp('release',v)} label="RELEASE" unit="s" color="#00e5ff"/>
            </div>
          </Panel>
          <Panel title="PITCH ENVELOPE" accent="#f59e0b"
            right={<LEDToggle value={preset.pitchEnv.on} onChange={v=>setPreset(p=>({...p,pitchEnv:{...p.pitchEnv,on:v}}))} label="ON" color="#f59e0b"/>}>
            <div className="sc-knob-row">
              <Knob value={preset.pitchEnv.amount} min={-48} max={48} step={1} onChange={v=>setPreset(p=>({...p,pitchEnv:{...p.pitchEnv,amount:v}}))} label="AMOUNT" unit="st" color="#f59e0b" bipolar/>
              <Knob value={preset.pitchEnv.attack} min={0.001} max={2} step={0.001} log onChange={v=>setPreset(p=>({...p,pitchEnv:{...p.pitchEnv,attack:v}}))} label="ATTACK" unit="s" color="#f59e0b"/>
              <Knob value={preset.pitchEnv.decay} min={0.01} max={4} step={0.01} log onChange={v=>setPreset(p=>({...p,pitchEnv:{...p.pitchEnv,decay:v}}))} label="DECAY" unit="s" color="#f59e0b"/>
            </div>
          </Panel>
          <Panel title="ARPEGGIATOR" accent="#a78bfa"
            right={<LEDToggle value={preset.arp.on} onChange={v=>setArp('on',v)} label="ON" color="#a78bfa"/>}>
            <div style={{display:'flex',gap:20,flexWrap:'wrap',marginBottom:10}}>
              <div><div className="sc-param-label">MODE</div><PillGroup options={ARP_MODES} value={preset.arp.mode} onChange={v=>setArp('mode',v)} color="#a78bfa"/></div>
              <div><div className="sc-param-label">RATE</div><PillGroup options={ARP_RATES} value={preset.arp.rate} onChange={v=>setArp('rate',v)} color="#a78bfa"/></div>
            </div>
            <div className="sc-knob-row">
              <Knob value={preset.arp.octaves} min={1} max={4} step={1} onChange={v=>setArp('octaves',v)} label="OCTAVES" color="#a78bfa"/>
              <Knob value={preset.arp.bpm} min={60} max={200} step={1} onChange={v=>setArp('bpm',v)} label="BPM" color="#a78bfa"/>
            </div>
          </Panel>
        </div>}

        {/* ── FILTER ── */}
        {activeTab==='filter' && <div className="sc-tab-pane">
          <Panel title="FILTER" accent="#5ac8fa" right={<LEDToggle value={preset.filter.on} onChange={v=>setFilter('on',v)} label="ON" color="#5ac8fa"/>}>
            <PillGroup options={FILTER_TYPES.map(t=>({label:t.toUpperCase(),value:t}))} value={preset.filter.type} onChange={v=>setFilter('type',v)} color="#5ac8fa"/>
            <div className="sc-knob-row" style={{marginTop:14}}>
              <Knob value={preset.filter.cutoff} min={20} max={20000} step={1} log onChange={v=>setFilter('cutoff',v)} label="CUTOFF" unit="Hz" color="#5ac8fa" size={60}/>
              <Knob value={preset.filter.res} min={0.1} max={20} step={0.1} onChange={v=>setFilter('res',v)} label="RESONANCE" color="#5ac8fa" size={60}/>
              <Knob value={preset.filter.drive||0} min={0} max={1} step={0.01} onChange={v=>setFilter('drive',v)} label="DRIVE" color="#f97316" size={60}/>
            </div>
          </Panel>
          <Panel title="FILTER ENVELOPE" accent="#5ac8fa">
            <ADSRViz attack={preset.filterEnv.attack} decay={preset.filterEnv.decay} sustain={preset.filterEnv.sustain||0.2} release={preset.filterEnv.release} color="#5ac8fa"/>
            <div className="sc-knob-row" style={{marginTop:12}}>
              <Knob value={preset.filterEnv.amount} min={-10000} max={10000} step={50} onChange={v=>setFEnv('amount',v)} label="AMOUNT" unit="Hz" color="#5ac8fa" bipolar/>
              <Knob value={preset.filterEnv.attack} min={0.001} max={4} step={0.001} log onChange={v=>setFEnv('attack',v)} label="ATTACK" unit="s" color="#5ac8fa"/>
              <Knob value={preset.filterEnv.decay} min={0.01} max={4} step={0.01} log onChange={v=>setFEnv('decay',v)} label="DECAY" unit="s" color="#5ac8fa"/>
              <Knob value={preset.filterEnv.sustain} min={0} max={1} step={0.01} onChange={v=>setFEnv('sustain',v)} label="SUSTAIN" color="#5ac8fa"/>
              <Knob value={preset.filterEnv.release} min={0.01} max={8} step={0.01} log onChange={v=>setFEnv('release',v)} label="RELEASE" unit="s" color="#5ac8fa"/>
            </div>
          </Panel>
        </div>}

        {/* ── MOD ── */}
        {activeTab==='lfo' && <div className="sc-tab-pane">
          <Panel title="LFO 1" accent="#a78bfa" right={<LEDToggle value={preset.lfo.on} onChange={v=>setLfo('on',v)} label="ON" color="#a78bfa"/>}>
            <div className="sc-lfo-row">
              <div><div className="sc-param-label">WAVEFORM</div><WaveSelect value={preset.lfo.wave} onChange={v=>setLfo('wave',v)} color="#a78bfa"/></div>
              <div><div className="sc-param-label">DESTINATION</div><PillGroup options={LFO_DESTS} value={preset.lfo.dest} onChange={v=>setLfo('dest',v)} color="#a78bfa"/></div>
            </div>
            <div className="sc-knob-row" style={{marginTop:14}}>
              <Knob value={preset.lfo.rate} min={0.01} max={20} step={0.01} log onChange={v=>setLfo('rate',v)} label="RATE" unit="Hz" color="#a78bfa"/>
              <Knob value={preset.lfo.depth} min={0} max={preset.lfo.dest==='pitch'?200:preset.lfo.dest==='filter'?8000:1} step={preset.lfo.dest==='amp'?0.01:1} onChange={v=>setLfo('depth',v)} label="DEPTH" color="#a78bfa"/>
            </div>
          </Panel>
          <Panel title="LFO 2" accent="#f59e0b" right={<LEDToggle value={preset.lfo2?.on} onChange={v=>setLfo2('on',v)} label="ON" color="#f59e0b"/>}>
            <div className="sc-lfo-row">
              <div><div className="sc-param-label">WAVEFORM</div><WaveSelect value={preset.lfo2?.wave||'triangle'} onChange={v=>setLfo2('wave',v)} color="#f59e0b"/></div>
              <div><div className="sc-param-label">DESTINATION</div><PillGroup options={LFO_DESTS} value={preset.lfo2?.dest||'amp'} onChange={v=>setLfo2('dest',v)} color="#f59e0b"/></div>
            </div>
            <div className="sc-knob-row" style={{marginTop:14}}>
              <Knob value={preset.lfo2?.rate||0.5} min={0.01} max={20} step={0.01} log onChange={v=>setLfo2('rate',v)} label="RATE" unit="Hz" color="#f59e0b"/>
              <Knob value={preset.lfo2?.depth||20} min={0} max={preset.lfo2?.dest==='filter'?8000:200} step={1} onChange={v=>setLfo2('depth',v)} label="DEPTH" color="#f59e0b"/>
            </div>
          </Panel>
        </div>}

        {/* ── FX ── */}
        {activeTab==='fx' && <div className="sc-tab-pane">
          <div className="sc-fx-grid">
            <Panel title="CHORUS" accent="#00e5ff" right={<LEDToggle value={preset.fx.chorus.on} onChange={v=>setFx('chorus','on',v)} label="ON" color="#00e5ff"/>}>
              <div className="sc-knob-row"><Knob value={preset.fx.chorus.rate} min={0.1} max={10} step={0.1} onChange={v=>setFx('chorus','rate',v)} label="RATE" unit="Hz" size={46} color="#00e5ff"/><Knob value={preset.fx.chorus.mix} min={0} max={1} step={0.01} onChange={v=>setFx('chorus','mix',v)} label="MIX" size={46} color="#00e5ff"/></div>
            </Panel>
            <Panel title="PHASER" accent="#5ac8fa" right={<LEDToggle value={preset.fx.phaser.on} onChange={v=>setFx('phaser','on',v)} label="ON" color="#5ac8fa"/>}>
              <div className="sc-knob-row"><Knob value={preset.fx.phaser.rate} min={0.05} max={5} step={0.05} onChange={v=>setFx('phaser','rate',v)} label="RATE" unit="Hz" size={46} color="#5ac8fa"/><Knob value={preset.fx.phaser.mix} min={0} max={1} step={0.01} onChange={v=>setFx('phaser','mix',v)} label="MIX" size={46} color="#5ac8fa"/></div>
            </Panel>
            <Panel title="FLANGER" accent="#34d399" right={<LEDToggle value={preset.fx.flanger.on} onChange={v=>setFx('flanger','on',v)} label="ON" color="#34d399"/>}>
              <div className="sc-knob-row"><Knob value={preset.fx.flanger.rate} min={0.05} max={5} step={0.05} onChange={v=>setFx('flanger','rate',v)} label="RATE" unit="Hz" size={46} color="#34d399"/><Knob value={preset.fx.flanger.mix} min={0} max={1} step={0.01} onChange={v=>setFx('flanger','mix',v)} label="MIX" size={46} color="#34d399"/></div>
            </Panel>
            <Panel title="DISTORTION" accent="#f97316" right={<LEDToggle value={preset.fx.distort.on} onChange={v=>setFx('distort','on',v)} label="ON" color="#f97316"/>}>
              <div className="sc-knob-row"><Knob value={preset.fx.distort.amount} min={0} max={100} step={1} onChange={v=>setFx('distort','amount',v)} label="DRIVE" color="#f97316" size={46}/></div>
            </Panel>
            <Panel title="BIT CRUSH" accent="#fbbf24" right={<LEDToggle value={preset.fx.bitcrush.on} onChange={v=>setFx('bitcrush','on',v)} label="ON" color="#fbbf24"/>}>
              <div className="sc-knob-row"><Knob value={preset.fx.bitcrush.bits} min={2} max={16} step={1} onChange={v=>setFx('bitcrush','bits',v)} label="BITS" size={46} color="#fbbf24"/><Knob value={preset.fx.bitcrush.sr} min={0.01} max={1} step={0.01} onChange={v=>setFx('bitcrush','sr',v)} label="SR RED" size={46} color="#fbbf24"/></div>
            </Panel>
            <Panel title="COMPRESSOR" accent="#a78bfa" right={<LEDToggle value={preset.fx.compressor?.on} onChange={v=>setFx('compressor','on',v)} label="ON" color="#a78bfa"/>}>
              <div className="sc-knob-row"><Knob value={preset.fx.compressor?.threshold??-24} min={-60} max={0} step={1} onChange={v=>setFx('compressor','threshold',v)} label="THRESH" unit="dB" size={46} color="#a78bfa"/><Knob value={preset.fx.compressor?.ratio??4} min={1} max={20} step={1} onChange={v=>setFx('compressor','ratio',v)} label="RATIO" size={46} color="#a78bfa"/></div>
            </Panel>
          </div>
          <Panel title="REVERB" accent="#a78bfa" right={<LEDToggle value={preset.fx.reverb.on} onChange={v=>setFx('reverb','on',v)} label="ON" color="#a78bfa"/>}>
            <div className="sc-knob-row"><Knob value={preset.fx.reverb.decay} min={0.1} max={10} step={0.1} onChange={v=>setFx('reverb','decay',v)} label="DECAY" unit="s" color="#a78bfa"/><Knob value={preset.fx.reverb.mix} min={0} max={1} step={0.01} onChange={v=>setFx('reverb','mix',v)} label="MIX" color="#a78bfa"/></div>
          </Panel>
          <Panel title="DELAY" accent="#fb923c" right={<LEDToggle value={preset.fx.delay.on} onChange={v=>setFx('delay','on',v)} label="ON" color="#fb923c"/>}>
            <div className="sc-knob-row"><Knob value={preset.fx.delay.time} min={0.01} max={2} step={0.01} onChange={v=>setFx('delay','time',v)} label="TIME" unit="s" color="#fb923c"/><Knob value={preset.fx.delay.feedback} min={0} max={0.9} step={0.01} onChange={v=>setFx('delay','feedback',v)} label="FEEDBACK" color="#fb923c"/><Knob value={preset.fx.delay.mix} min={0} max={1} step={0.01} onChange={v=>setFx('delay','mix',v)} label="MIX" color="#fb923c"/></div>
          </Panel>
        </div>}

        {/* ── OUTPUT ── */}
        {activeTab==='out' && <div className="sc-tab-pane">
          <Panel title="MASTER OUTPUT" accent="#00e5ff">
            <div className="sc-knob-row">
              <Knob value={preset.master.vol} min={0} max={1} step={0.01} onChange={v=>setPreset(p=>({...p,master:{...p.master,vol:v}}))} label="VOLUME" color="#00e5ff"/>
              <Knob value={preset.master.voices} min={1} max={32} step={1} onChange={v=>setPreset(p=>({...p,master:{...p.master,voices:v}}))} label="VOICES" color="#ff6b35"/>
              <Knob value={preset.master.tune||0} min={-100} max={100} step={1} onChange={v=>setPreset(p=>({...p,master:{...p.master,tune:v}}))} label="TUNE" unit="¢" color="#f59e0b" bipolar/>
            </div>
          </Panel>
          <Panel title="KEYBOARD" accent="#34d399">
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
              <span className="sc-param-label">OCTAVE SHIFT</span>
              <button className="sc-kbd-btn" onClick={()=>setOctaveShift(o=>Math.max(-2,o-1))}>◀</button>
              <span className="sc-oct-display">{octaveShift>0?`+${octaveShift}`:octaveShift}</span>
              <button className="sc-kbd-btn" onClick={()=>setOctaveShift(o=>Math.min(2,o+1))}>▶</button>
              <span className="sc-kbd-hint">Z→M = C3–B3 · Q→U = C4–B4 · DBL-CLICK KNOB = RESET</span>
            </div>
          </Panel>
          {(onAssignToPad||onAssignToTrack) && (
            <Panel title="ASSIGN" accent="#a78bfa">
              <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
                {onAssignToPad && <button className="sc-assign-btn sc-assign-cyan" onClick={()=>{exportWAV();onAssignToPad&&onAssignToPad(preset);}}>🎛 → PAD</button>}
                {onAssignToTrack && <button className="sc-assign-btn sc-assign-orange" onClick={()=>onAssignToTrack&&onAssignToTrack(preset)}>🎹 → TRACK</button>}
              </div>
            </Panel>
          )}
        </div>}
      </div>

      {/* KEYBOARD */}
      <div className="sc-keyboard-section">
        <div className="sc-kbd-controls">
          <span className="sc-param-label">OCT {3+octaveShift}–{5+octaveShift}</span>
          <button className="sc-kbd-btn" onClick={()=>setOctaveShift(o=>Math.max(-2,o-1))}>◀ OCT</button>
          <button className="sc-kbd-btn" onClick={()=>setOctaveShift(o=>Math.min(2,o+1))}>OCT ▶</button>
        </div>
        <div style={{overflowX:'auto'}}>{renderKeyboard()}</div>
      </div>

      {/* SAVE MODAL */}
      {showSaveModal && (
        <div className="sc-modal-backdrop">
          <div className="sc-modal">
            <h3>↓ SAVE PRESET</h3>
            <input className="sc-input" placeholder="Preset name…" value={saveName||presetName}
              onChange={e=>setSaveName(e.target.value)} autoFocus
              onKeyDown={e=>{if(e.key==='Enter')savePreset();if(e.key==='Escape')setShowSaveModal(false);}}/>
            <div className="sc-modal-actions">
              <button className="sc-modal-btn sc-modal-btn-primary" onClick={savePreset}>SAVE</button>
              <button className="sc-modal-btn sc-modal-btn-ghost" onClick={()=>setShowSaveModal(false)}>CANCEL</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SynthCreator;