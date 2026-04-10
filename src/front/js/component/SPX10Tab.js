// =============================================================================
// SPX10Tab.js — SPX-10 Keyboard Workstation (ASR-10)
// 16-bit / 44.1kHz, Ensoniq OTTO chip, 4-pole resonant filter per zone
// Keyboard workstation — no drum pads
// Views: KEYBOARD | ZONES | PARAMS | SEQ
// Onboard: reverb, chorus, ADSR per zone, 8 keyboard zones
// =============================================================================
import React, { useState, useRef, useCallback, useEffect } from 'react';
import '../../styles/SPX10Tab.css';

const SAMPLE_RATE  = 44100;
const ROLLOFF_HZ   = 16000;
const NOISE_FLOOR  = 0.000018;
const NUM_ZONES    = 8;
const NOTES        = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const WHITE_NOTE_PATTERN = [0,2,4,5,7,9,11];

// ─── DSP ─────────────────────────────────────────────────────────────────────
const ottoSaturate = x =>
  x > 0 ? x / (1 + 0.04 * x) : x / (1 + 0.06 * Math.abs(x));

const applyOTTOFilter = (ctx, buffer, cutoffHz = 16000, resonance = 0.15) => {
  if (!buffer) return buffer;
  const sr=buffer.sampleRate;
  const f=2*Math.PI*cutoffHz/sr;
  const k=3.6*f-1.6*f*f-1;
  const p=(k+1)*0.5;
  const scale=Math.exp((1-p)*1.386249);
  const r=resonance*scale;
  const nc=buffer.numberOfChannels, len=buffer.length;
  const out=ctx.createBuffer(nc,len,sr);
  for(let ch=0;ch<nc;ch++){
    const src=buffer.getChannelData(ch), dst=out.getChannelData(ch);
    let y1=0,y2=0,y3=0,y4=0,oldx=0;
    for(let i=0;i<len;i++){
      const x=src[i]-r*y4;
      y1=x*p+oldx*p-k*y1; y2=y1*p+oldx*p-k*y2;
      y3=y2*p+y1*p-k*y3;  y4=y3*p+y2*p-k*y4;
      oldx=x; dst[i]=ottoSaturate(y4);
    }
  }
  return out;
};

const apply16bit = (ctx, buffer) => {
  if (!buffer) return buffer;
  const nc=buffer.numberOfChannels, len=buffer.length;
  const out=ctx.createBuffer(nc,len,buffer.sampleRate);
  for(let ch=0;ch<nc;ch++){
    const src=buffer.getChannelData(ch), dst=out.getChannelData(ch);
    for(let i=0;i<len;i++){
      const tpdf=(Math.random()-Math.random())*NOISE_FLOOR;
      dst[i]=Math.round(src[i]*32768)/32768+tpdf;
    }
  }
  return out;
};

const applyRolloff = (ctx, buffer) => {
  if (!buffer) return buffer;
  const a=(1/buffer.sampleRate)/(1/(2*Math.PI*ROLLOFF_HZ)+1/buffer.sampleRate);
  const nc=buffer.numberOfChannels, len=buffer.length;
  const out=ctx.createBuffer(nc,len,buffer.sampleRate);
  for(let ch=0;ch<nc;ch++){
    const src=buffer.getChannelData(ch), dst=out.getChannelData(ch);
    let prev=0;
    for(let i=0;i<len;i++){prev=a*src[i]+(1-a)*prev;dst[i]=prev;}
  }
  return out;
};

const applyDSP = (ctx, buf, cutoff=16000, resonance=0.15) => {
  let b = apply16bit(ctx, buf);
  b = applyOTTOFilter(ctx, b, cutoff, resonance);
  b = applyRolloff(ctx, b);
  return b;
};

const createReverb = (ctx, size=0.6) => {
  const PRIMES=[1117,1357,1491,1617].map(d=>Math.round(d*size));
  const AP=[225,341]; const DECAY=0.80*size+0.12;
  const len=ctx.sampleRate*2;
  const ir=ctx.createBuffer(2,len,ctx.sampleRate);
  for(let ch=0;ch<2;ch++){
    const d=ir.getChannelData(ch);
    const combs=PRIMES.map(p=>new Float32Array(p));
    const ci=new Int32Array(PRIMES.length);
    const ap1=new Float32Array(AP[0]), ap2=new Float32Array(AP[1]);
    let a1i=0,a2i=0;
    for(let i=0;i<len;i++){
      const inp=i===0?1:0; let sum=0;
      combs.forEach((c,j)=>{const o=c[ci[j]];c[ci[j]]=inp+o*DECAY;ci[j]=(ci[j]+1)%c.length;sum+=o;});
      const a1o=ap1[a1i];ap1[a1i]=sum+a1o*0.5;a1i=(a1i+1)%AP[0];sum=a1o-0.5*sum;
      const a2o=ap2[a2i];ap2[a2i]=sum+a2o*0.5;a2i=(a2i+1)%AP[1];sum=a2o-0.5*sum;
      d[i]=sum*0.014*(ch===1?-1:1);
    }
  }
  const conv=ctx.createConvolver(); conv.buffer=ir; return conv;
};

// ─── Zone factory ────────────────────────────────────────────────────────────
const mkZone = idx => ({
  idx, name: `Zone ${idx+1}`,
  buffer: null, processedBuffer: null,
  loNote: idx*9, hiNote: idx*9+8, rootNote: idx*9+4,
  volume: 1.0, pan: 0, tune: 0,
  cutoff: 16000, resonance: 0.15,
  attack: 0.01, decay: 0.3, sustain: 0.8, release: 0.5,
  reverbSend: 0.2, chorusSend: 0.0, muted: false,
});

const mkSeq = (bars=2) => ({
  bars,
  steps: Array.from({length:bars*16},()=>
    Array.from({length:8},()=>({on:false,vel:100})))
});

// ─── Component ───────────────────────────────────────────────────────────────
export default function SPX10Tab({ onExport, onSendToArrange, isEmbedded, masterClock, onSendToTriple }) {
  const [zones, setZones]             = useState(()=>Array.from({length:NUM_ZONES},(_,i)=>mkZone(i)));
  const [sequences, setSequences]     = useState([mkSeq(2)]);
  const [seqIdx, setSeqIdx]           = useState(0);
  const [playing, setPlaying]         = useState(false);
  const [step, setStep]               = useState(0);
  const [bpm, setBpm]                 = useState(95);
  const [swing, setSwing]             = useState(0);
  const [bars, setBars]               = useState(2);
  const [selectedZone, setSelectedZone] = useState(0);
  const [view, setView]               = useState('keyboard');
  const [syncToMaster, setSyncToMaster] = useState(false);
  const [activeNotes, setActiveNotes]   = useState(new Set());
  const [octave, setOctave]             = useState(4);
  const [globalReverb, setGlobalReverb] = useState(0.2);
  const [globalChorus, setGlobalChorus] = useState(false);

  const ctxRef    = useRef(null);
  const stepRef   = useRef(0);
  const playRef   = useRef(false);
  const timerRef  = useRef(null);
  const bpmRef    = useRef(bpm);
  const swingRef  = useRef(swing);
  const zonesRef  = useRef(zones);
  const seqRef    = useRef(sequences);
  const seqIdxRef = useRef(seqIdx);
  const srcMap    = useRef({});
  const reverbRef = useRef(null);

  useEffect(()=>{bpmRef.current=bpm;},[bpm]);
  useEffect(()=>{swingRef.current=swing;},[swing]);
  useEffect(()=>{zonesRef.current=zones;},[zones]);
  useEffect(()=>{seqRef.current=sequences;},[sequences]);
  useEffect(()=>{seqIdxRef.current=seqIdx;},[seqIdx]);

  const getCtx = useCallback(()=>{
    if(!ctxRef.current) ctxRef.current=new(window.AudioContext||window.webkitAudioContext)();
    return ctxRef.current;
  },[]);

  const getOrCreateReverb = useCallback(()=>{
    const ctx=getCtx();
    if(!reverbRef.current) reverbRef.current=createReverb(ctx,0.6);
    return reverbRef.current;
  },[getCtx]);

  const stopNote = useCallback(midi=>{
    if(srcMap.current[midi]){try{srcMap.current[midi].stop();}catch(_){}srcMap.current[midi]=null;}
  },[]);

  const findZone = useCallback(midi=>
    zonesRef.current.find(z=>z.processedBuffer&&!z.muted&&midi>=z.loNote&&midi<=z.hiNote)
  ,[]);

  const triggerNote = useCallback((midi, vel=0.8)=>{
    const ctx=getCtx();
    if(ctx.state==='suspended') ctx.resume();
    const zone=findZone(midi);
    if(!zone) return;
    stopNote(midi);
    const src=ctx.createBufferSource();
    src.buffer=zone.processedBuffer;
    const semi=midi-zone.rootNote+zone.tune;
    src.playbackRate.value=Math.pow(2,semi/12);
    const gain=ctx.createGain();
    gain.gain.setValueAtTime(0,ctx.currentTime);
    gain.gain.linearRampToValueAtTime(zone.volume*vel,ctx.currentTime+zone.attack);
    gain.gain.setTargetAtTime(zone.volume*vel*zone.sustain,ctx.currentTime+zone.attack+zone.decay,0.1);
    const pan=ctx.createStereoPanner(); pan.pan.value=zone.pan;
    src.connect(gain);
    if(globalReverb>0.05){
      const dry=ctx.createGain(), wet=ctx.createGain();
      dry.gain.value=1-globalReverb; wet.gain.value=globalReverb;
      const rev=getOrCreateReverb();
      gain.connect(dry); gain.connect(rev);
      dry.connect(pan); rev.connect(wet); wet.connect(pan);
    } else { gain.connect(pan); }
    pan.connect(ctx.destination);
    src.start();
    src.onended=()=>{srcMap.current[midi]=null;};
    srcMap.current[midi]=src;
    setActiveNotes(prev=>new Set([...prev,midi]));
  },[getCtx,findZone,stopNote,globalReverb,getOrCreateReverb]);

  const releaseNote = useCallback(midi=>{
    stopNote(midi);
    setActiveNotes(prev=>{const n=new Set(prev);n.delete(midi);return n;});
  },[stopNote]);

  const scheduleStep = useCallback(()=>{
    if(!playRef.current) return;
    const seq=seqRef.current[seqIdxRef.current]||seqRef.current[0];
    const s=stepRef.current;
    const stepMs=(60000/bpmRef.current)/4;
    const swingMs=s%2===1?(swingRef.current/100)*stepMs*0.5:0;
    seq.steps[s]?.forEach((cell,zi)=>{
      if(cell.on){const z=zonesRef.current[zi];if(z)triggerNote(z.rootNote,cell.vel/127);}
    });
    stepRef.current=(s+1)%(seq.bars*16); setStep(stepRef.current);
    timerRef.current=setTimeout(scheduleStep,stepMs+swingMs);
  },[triggerNote]);

  useEffect(()=>{
    if(!syncToMaster||!masterClock?.subscribe) return;
    const unsub=masterClock.subscribe(({step:ms,bpm:mb})=>{
      bpmRef.current=mb; setBpm(mb);
      const seq=seqRef.current[seqIdxRef.current]||seqRef.current[0];
      const s=ms%(seq.bars*16);
      seq.steps[s]?.forEach((cell,zi)=>{if(cell.on){const z=zonesRef.current[zi];if(z)triggerNote(z.rootNote,cell.vel/127);}});
      setStep(s);
    });
    return unsub;
  },[syncToMaster,masterClock,triggerNote]);

  const togglePlay = useCallback(()=>{
    const ctx=getCtx(); if(ctx.state==='suspended') ctx.resume();
    if(playRef.current){playRef.current=false;setPlaying(false);clearTimeout(timerRef.current);}
    else{stepRef.current=0;playRef.current=true;setPlaying(true);scheduleStep();}
  },[getCtx,scheduleStep]);

  const loadSample = useCallback(async(zi,file)=>{
    const ctx=getCtx();
    const decoded=await ctx.decodeAudioData(await file.arrayBuffer());
    const zone=zonesRef.current[zi];
    const processed=applyDSP(ctx,decoded,zone.cutoff,zone.resonance);
    setZones(prev=>{
      const next=[...prev];
      next[zi]={...next[zi],buffer:decoded,processedBuffer:processed,name:file.name.replace(/\.[^.]+$/,'').slice(0,14)};
      zonesRef.current=next; return next;
    });
  },[getCtx]);

  const fileSelect = useCallback(zi=>{
    const inp=document.createElement('input'); inp.type='file'; inp.accept='audio/*';
    inp.onchange=e=>{if(e.target.files[0])loadSample(zi,e.target.files[0]);};inp.click();
  },[loadSample]);

  const updateZone = useCallback((zi,key,val)=>{
    setZones(prev=>{
      const next=[...prev]; next[zi]={...next[zi],[key]:val};
      if((key==='cutoff'||key==='resonance')&&next[zi].buffer){
        const ctx=getCtx();
        next[zi].processedBuffer=applyDSP(ctx,next[zi].buffer,next[zi].cutoff,next[zi].resonance);
      }
      zonesRef.current=next; return next;
    });
  },[getCtx]);

  const toggleStep = useCallback((s,zi)=>{
    setSequences(prev=>prev.map((sq,si)=>si!==seqIdxRef.current?sq:{
      ...sq,steps:sq.steps.map((row,ri)=>ri!==s?row:row.map((cell,ci)=>ci!==zi?cell:{...cell,on:!cell.on}))
    }));
  },[]);

  const buildKeys = useCallback(()=>{
    const keys=[]; let wi=0;
    for(let oct=octave;oct<octave+3;oct++){
      WHITE_NOTE_PATTERN.forEach((semi,ni)=>{
        const midi=oct*12+semi;
        keys.push({type:'white',midi,note:NOTES[semi]+oct,wi});
        const next=WHITE_NOTE_PATTERN[ni+1];
        if(next!==undefined&&next-semi===2)
          keys.push({type:'black',midi:midi+1,note:NOTES[semi+1]+oct,wi});
        wi++;
      });
    }
    return keys;
  },[octave]);

  const seq=sequences[seqIdx]||sequences[0];
  const keys=buildKeys();
  const whiteKeys=keys.filter(k=>k.type==='white');
  const blackKeys=keys.filter(k=>k.type==='black');

  return (
    <div className="spx10-root">

      <div className="spx10-header">
        <div className="spx10-header-stripe" />
        <div className="spx10-logo">
          <span className="spx10-brand">SPX</span>
          <span className="spx10-model">10</span>
        </div>
        <div className="spx10-lcd">
          <span className="spx10-lcd-item">{zones.filter(z=>z.processedBuffer).length}/{NUM_ZONES} ZONES</span>
          <span className="spx10-lcd-item">BPM {bpm}</span>
          <span className="spx10-lcd-item">OCT {octave}</span>
          <span className="spx10-lcd-item">REV {Math.round(globalReverb*100)}%</span>
          {syncToMaster&&<span className="spx10-lcd-sync">⟳ LINKED</span>}
        </div>
        <div className="spx10-transport">
          {!syncToMaster&&(
            <button className={`spx10-btn${playing?' active':''}`} onClick={togglePlay}>
              {playing?'⏹ STOP':'▶ PLAY'}
            </button>
          )}
          <button className="spx10-btn" onClick={()=>{stepRef.current=0;setStep(0);}}>◀◀</button>
          <button className="spx10-btn" onClick={()=>setSequences(p=>[...p,mkSeq(bars)])}>+ SEQ</button>
        </div>
      </div>

      <div className="spx10-controls">
        <div className="spx10-ctrl-group">
          <label className="spx10-label">BPM</label>
          <input className="spx10-range" type="range" min={40} max={240} value={bpm}
            onChange={e=>{bpmRef.current=+e.target.value;setBpm(+e.target.value);}}/>
          <span className="spx10-val">{bpm}</span>
        </div>
        <div className="spx10-ctrl-group">
          <label className="spx10-label">REVERB</label>
          <input className="spx10-range" type="range" min={0} max={1} step={0.01} value={globalReverb}
            onChange={e=>setGlobalReverb(+e.target.value)}/>
          <span className="spx10-val">{Math.round(globalReverb*100)}%</span>
        </div>
        <div className="spx10-ctrl-group">
          <label className="spx10-label">CHORUS</label>
          <button className={`spx10-fx-btn${globalChorus?' active':''}`} onClick={()=>setGlobalChorus(p=>!p)}>
            {globalChorus?'ON':'OFF'}
          </button>
        </div>
        <div className="spx10-ctrl-group">
          <label className="spx10-label">OCT</label>
          <button className="spx10-oct-btn" onClick={()=>setOctave(p=>Math.max(1,p-1))}>−</button>
          <span className="spx10-val">{octave}</span>
          <button className="spx10-oct-btn" onClick={()=>setOctave(p=>Math.min(7,p+1))}>+</button>
        </div>
        <div className="spx10-ctrl-group">
          <label className="spx10-label">CLOCK</label>
          <button className={`spx10-sync-btn${syncToMaster?' active':''}`} onClick={()=>setSyncToMaster(p=>!p)}>
            {syncToMaster?'⟳ MASTER':'⟳ OWN'}
          </button>
        </div>
        <div className="spx10-ctrl-group">
          {['keyboard','zones','params','seq'].map(v=>(
            <button key={v} className={`spx10-view-btn${view===v?' active':''}`} onClick={()=>setView(v)}>
              {v.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="spx10-main">

        {view==='keyboard'&&(
          <div className="spx10-keyboard-view">
            <div className="spx10-zone-bar">
              {zones.map((z,zi)=>(
                <div key={zi}
                  className={`spx10-zone-chip${z.processedBuffer?' loaded':''}${selectedZone===zi?' selected':''}`}
                  onClick={()=>setSelectedZone(zi)}
                  onDoubleClick={()=>fileSelect(zi)}
                  onDragOver={e=>e.preventDefault()}
                  onDrop={e=>{e.preventDefault();const f=e.dataTransfer.files[0];if(f)loadSample(zi,f);}}>  
                  <span className="spx10-zone-name">{z.name}</span>
                  {z.processedBuffer&&<span className="spx10-zone-range">{NOTES[z.loNote%12]}{Math.floor(z.loNote/12)}–{NOTES[z.hiNote%12]}{Math.floor(z.hiNote/12)}</span>}
                  {!z.processedBuffer&&<span className="spx10-zone-drop">DROP</span>}
                </div>
              ))}
            </div>
            <div className="spx10-keyboard-info">
              <span>Zone {selectedZone+1}: {zones[selectedZone].name}</span>
              <button className="spx10-action-btn" onClick={()=>fileSelect(selectedZone)}>📂 LOAD SAMPLE</button>
              {zones[selectedZone]?.processedBuffer && onChopRequest && (
                <button className="spx10-action-btn" onClick={() => onChopRequest(zones[selectedZone].processedBuffer, (zi, data) => updateZone(zi, Object.keys(data)[0], Object.values(data)[0]), setZones)}>✂️ CHOP</button>
              )}
              {zones[selectedZone].processedBuffer&&(
                <button className="spx10-action-btn" onClick={()=>updateZone(selectedZone,'processedBuffer',null)}>✕ CLEAR</button>
              )}
            </div>
          </div>
        )}

        {view==='zones'&&(
          <div className="spx10-zones-view">
            {zones.map((z,zi)=>(
              <div key={zi} className={`spx10-zone-row${selectedZone===zi?' selected':''}`} onClick={()=>setSelectedZone(zi)}>
                <span className="spx10-zone-idx">{zi+1}</span>
                <span className="spx10-zone-name-cell">{z.name}</span>
                <span className="spx10-zone-range-cell">{NOTES[z.loNote%12]}{Math.floor(z.loNote/12)} – {NOTES[z.hiNote%12]}{Math.floor(z.hiNote/12)}</span>
                <span className="spx10-zone-root">ROOT: {NOTES[z.rootNote%12]}{Math.floor(z.rootNote/12)}</span>
                <span className={`spx10-zone-status${z.processedBuffer?' loaded':''}`}>{z.processedBuffer?'● LOADED':'○ EMPTY'}</span>
                <button className="spx10-action-btn" onClick={e=>{e.stopPropagation();fileSelect(zi);}}>📂</button>
              </div>
            ))}
          </div>
        )}

        {view==='params'&&(
          <div className="spx10-params-view">
            <div className="spx10-params-zone-select">
              {zones.map((z,zi)=>(
                <button key={zi} className={`spx10-param-zone-btn${selectedZone===zi?' active':''}`} onClick={()=>setSelectedZone(zi)}>Z{zi+1}</button>
              ))}
            </div>
            <div className="spx10-params-grid">
              <div className="spx10-params-title">ZONE {selectedZone+1} — {zones[selectedZone].name}</div>
              {[
                {key:'volume',    label:'VOLUME',    min:0,    max:1,     step:0.01},
                {key:'pan',       label:'PAN',       min:-1,   max:1,     step:0.01},
                {key:'tune',      label:'TUNE',      min:-12,  max:12,    step:0.1},
                {key:'cutoff',    label:'CUTOFF',    min:200,  max:16000, step:100},
                {key:'resonance', label:'RESONANCE', min:0,    max:0.9,   step:0.01},
                {key:'attack',    label:'ATTACK',    min:0.001,max:2,     step:0.001},
                {key:'decay',     label:'DECAY',     min:0.01, max:3,     step:0.01},
                {key:'sustain',   label:'SUSTAIN',   min:0,    max:1,     step:0.01},
                {key:'release',   label:'RELEASE',   min:0.01, max:4,     step:0.01},
                {key:'reverbSend',label:'REVERB',    min:0,    max:1,     step:0.01},
                {key:'loNote',    label:'LO NOTE',   min:0,    max:127,   step:1},
                {key:'hiNote',    label:'HI NOTE',   min:0,    max:127,   step:1},
                {key:'rootNote',  label:'ROOT NOTE', min:0,    max:127,   step:1},
              ].map(({key,label,min,max,step:s})=>(
                <div key={key} className="spx10-param-row">
                  <label className="spx10-param-label">{label}</label>
                  <input className="spx10-range" type="range" min={min} max={max} step={s}
                    value={zones[selectedZone][key]??0}
                    onChange={e=>updateZone(selectedZone,key,+e.target.value)}/>
                  <span className="spx10-val">
                    {key.includes('Note')
                      ?`${NOTES[zones[selectedZone][key]%12]}${Math.floor(zones[selectedZone][key]/12)}`
                      :Number(zones[selectedZone][key]??0).toFixed(key==='cutoff'?0:2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {view==='seq'&&(
          <div className="spx10-seq">
            <div className="spx10-seq-controls">
              <div className="spx10-ctrl-group">
                <label className="spx10-label">BARS</label>
                <select className="spx10-select" value={bars} onChange={e=>{
                  const nb=+e.target.value; setBars(nb);
                  setSequences(prev=>prev.map((sq,si)=>si!==seqIdxRef.current?sq:{
                    ...sq,bars:nb,
                    steps:Array.from({length:nb*16},(_,i)=>sq.steps[i]||Array.from({length:8},()=>({on:false,vel:100})))
                  }));
                }}>
                  {[1,2,4,8].map(b=><option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div className="spx10-ctrl-group">
                <label className="spx10-label">SEQ</label>
                <select className="spx10-select" value={seqIdx}
                  onChange={e=>{seqIdxRef.current=+e.target.value;setSeqIdx(+e.target.value);}}>
                  {sequences.map((_,i)=><option key={i} value={i}>SEQ {i+1}</option>)}
                </select>
              </div>
            </div>
            <div className="spx10-seq-grid">
              {zones.map((zone,zi)=>(
                <div key={zi} className="spx10-seq-row">
                  <button className="spx10-seq-zone-btn" onMouseDown={()=>triggerNote(zone.rootNote,0.8)}>
                    {zone.name.slice(0,8)}
                  </button>
                  <div className="spx10-seq-steps">
                    {seq.steps.map((row,si)=>(
                      <button key={si}
                        className={`spx10-step${row[zi]?.on?' on':''}${si===step&&(playing||syncToMaster)?' current':''}${si%4===0?' beat':''}`}
                        onClick={()=>toggleStep(si,zi)}/>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Piano keyboard — always visible ── */}
      <div className="spx10-keyboard-section">
        <div className="spx10-keyboard-controls">
          <span className="spx10-key-label">KEYBOARD — OCT {octave}</span>
          <button className="spx10-oct-btn" onClick={()=>setOctave(p=>Math.max(1,p-1))}>OCT −</button>
          <button className="spx10-oct-btn" onClick={()=>setOctave(p=>Math.min(7,p+1))}>OCT +</button>
        </div>
        <div className="spx10-keyboard">
          {whiteKeys.map((key,i)=>(
            <div key={i}
              className={`spx10-key-white${activeNotes.has(key.midi)?' active':''}${findZone(key.midi)?' mapped':''}`}
              onMouseDown={()=>triggerNote(key.midi)}
              onMouseUp={()=>releaseNote(key.midi)}
              onMouseLeave={()=>releaseNote(key.midi)}>
              <span className="spx10-key-note">{key.note}</span>
            </div>
          ))}
          {blackKeys.map((key,i)=>{
            const pct=((key.wi+0.65)/36)*100;
            return(
              <div key={i}
                className={`spx10-key-black${activeNotes.has(key.midi)?' active':''}${findZone(key.midi)?' mapped':''}`}
                onMouseDown={e=>{e.stopPropagation();triggerNote(key.midi);}}
                onMouseUp={e=>{e.stopPropagation();releaseNote(key.midi);}}
                onMouseLeave={()=>releaseNote(key.midi)}
                style={{left:`${pct}%`}}/>
            );
          })}
        </div>
      </div>

      <div className="spx10-dsp-strip">
        {['16-BIT','44.1kHz','OTTO CHIP','4-POLE FILTER','ONBOARD REVERB','CHORUS','8 ZONES'].map(b=>(
          <span key={b} className="spx10-dsp-badge">{b}</span>
        ))}
      </div>
    </div>
  );
}

export { applyDSP as dspChain };
