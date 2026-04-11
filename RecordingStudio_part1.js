// MixDropdown
function MixDropdown({ viewMode, setViewMode }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  const items = [
    ["aimix","AI Mix"],["fx","FX Chain"],["multiband","Multiband"],
    ["mastering","Mastering"],["speakersim","Mix Translator"],
    ["analog","Analog Suite"],["vocal","Vocal"],["keyfinder","Key Finder"],
  ];
  const isActive = items.some(([m]) => m === viewMode);
  React.useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const active = items.find(([m]) => m === viewMode);
  return (
    <div ref={ref} className="daw-mix-dropdown">
      <button className={"daw-mix-dropdown-btn"+(isActive?" active":"")} onClick={()=>setOpen(o=>!o)}>
        {isActive&&active?active[1]:"Mix"} ▾
      </button>
      {open&&<div className="daw-mix-dropdown-menu">
        {items.map(([m,l])=>(
          <button key={m} className={"daw-mix-dropdown-item"+(viewMode===m?" active":"")}
            onClick={()=>{setViewMode(m);setOpen(false);}}>{l}</button>
        ))}
      </div>}
    </div>
  );
}

function ToolsDropdown({ viewMode, setViewMode }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  const items = [
    ["keyfinder","Key Finder"],["voicemidi","Voice MIDI"],
    ["takelanes","Take Lanes"],["aibeat","AI Beats"],
    ["plugins","Plugins"],["plugin-store","Plugin Store"],
  ];
  const isActive = items.some(([m]) => m === viewMode);
  React.useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const active = items.find(([m]) => m === viewMode);
  return (
    <div ref={ref} className="daw-mix-dropdown">
      <button className={"daw-mix-dropdown-btn"+(isActive?" active":"")} onClick={()=>setOpen(o=>!o)}>
        {isActive&&active?active[1]:"Tools"} ▾
      </button>
      {open&&<div className="daw-mix-dropdown-menu">
        {items.map(([m,l])=>(
          <button key={m} className={"daw-mix-dropdown-item"+(viewMode===m?" active":"")}
            onClick={()=>{setViewMode(m);setOpen(false);}}>{l}</button>
        ))}
      </div>}
    </div>
  );
}

// =============================================================================
// RecordingStudio.js - Multi-Track DAW (Cubase-Inspired)
// =============================================================================
import FlexPitchEditor from '../component/FlexPitchEditor';
import React, { useState, useEffect, useRef, useCallback, useMemo, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { Context } from "../store/appContext";
import SendToMotionButton from "../component/SendToMotionButton";
import { sendToMotion } from "../utils/motionHelpers";
import ArrangerView from "../component/ArrangerView";
import SampleLibrary from "../component/SampleLibrary";
import { AUTO_PARAMS, getValueAtTime } from "../component/AutomationLane";
import PluginRackUI from "../component/PluginRackUI";
import { MIDIMappingPanel, OnboardingFlow, ChordTrack, CompTakeManager, transposeByChord } from "../component/DAWFeatures2";
import "../../styles/SampleLibrary.css";
import "../../styles/PluginRackUI.css";
import "../../styles/DAWFeatures2.css";
import { AudioEngine } from "../component/audio/engine/AudioEngine";
import { loadAllWorklets } from "../component/audio/engine/SPXWorklets";
import AIMixAssistant from "../component/AIMixAssistant";
import ChannelStripAIMix from "../component/ChannelStripAIMix";
import SamplerBeatMaker from "../component/SamplerBeatMaker";
import SamplerInstrument from "../component/SamplerInstrument";
import MicSimulator from "../component/MicSimulator";
import CustomMicBuilder from "../component/CustomMicBuilder";
import SpeakerSimulator from "../component/SpeakerSimulator";
import VirtualPiano from "../component/VirtualPiano";
import FreesoundBrowser from "../component/FreesoundBrowser";
import KeyFinder from "../component/KeyFinder";
import AIBeatAssistant from "../component/AIBeatAssistant";
import ParametricEQGraph from "../component/ParametricEQGraph";
import ConsoleFXPanel from "../component/ConsoleFXPanel";
import AmpSimPlugin from "../component/AmpSimPlugin";
import PanKnob from "../component/PanKnob";
import { InlineStemSeparation, AudioToMIDIPanel, PitchCorrectionPanel } from "../component/DAWAdvancedFeatures";
import SaveAsModal from '../component/SaveAsModal';
import MultibandEffects from '../component/MultibandEffects';
import '../../styles/VoiceToMIDI.css';
import PianoRoll from "../component/PianoRoll";
import ScoreEditor from "../component/ScoreEditor";
import ChordProgressionGenerator from "../component/ChordProgressionGenerator";
import DAWMenuBar from "../component/DAWMenuBar";
import MPEPanel from "../component/MPEController";
import { SpatialTrackPanel } from "../component/SpatialAudioEngine";
import FilmScoringPanel from "../component/FilmScoringPanel";
import { SampleRateSelector } from "../component/SampleRateSelector";
import VocalProcessor from "../component/VocalProcessor";
import SynthCreator from "../component/SynthCreator";
import DrumDesigner from "../component/DrumDesigner";
import InstrumentBuilder from "../component/InstrumentBuilder";
import UnifiedFXChain from '../component/UnifiedFXChain';
import { SPXPluginHost, ALL_FX_EXTENDED } from '../component/SPXPlugins';
import MasteringChain from '../component/MasteringChain';
import LoopermanBrowser from '../component/LoopermanBrowser';
import VoiceToMIDI from "../component/VoiceToMIDI";
import DrumKitConnector from "../component/DrumKitConnector";
import useDAWHistory from '../component/useDAWHistory';
import TakeLanes from '../component/TakeLanes';
import ArrangeClipEditor from '../component/ArrangeClipEditor';
import TrackGroupBus from '../component/TrackGroupBus';
import DAWMeteringTools from '../component/DAWMeteringTools';
import useInstrumentTrackEngine, {
  InstrumentSelector, KeyboardOctaveIndicator, MidiDeviceIndicator,
  createMidiRegion, createMidiRegionFromNotes, SOURCE_TYPES,
} from "../component/InstrumentTrackEngine";
import "../../styles/RecordingStudio.css";
import "../../styles/ArrangerView.css";
import "../../styles/AIMixAssistant.css";
import "../../styles/SamplerBeatMaker.css";
import "../../styles/SamplerInstrument.css";
import "../../styles/MicSimulator.css";
import "../../styles/VirtualPiano.css";
import "../../styles/FreesoundBrowser.css";
import "../../styles/KeyFinder.css";
import "../../styles/AIBeatAssistant.css";
import "../../styles/SoundKitManager.css";
import "../../styles/PianoRoll.css";
import "../../styles/ChordProgressionGenerator.css";
import "../../styles/DAWMenuBar.css";
import "../../styles/VocalTools.css";
import { useDAWCollaboration, CollabToolbar, CollabOverlay, CollabChatPanel } from "../component/hooks/useDAWCollaboration";
import MidiHardwareInput from "../component/MidiHardwareInput";
import { installWAMPlugin, getInstalledWAMPlugins } from "../component/audio/plugins/WAMPluginHost";

const getLatencyMs = (ctx) => {
  if (!ctx) return 0;
  return Math.round(((ctx.baseLatency||0)+(ctx.outputLatency||0))*1000);
};

const TRACK_COLORS = [
  "#34c759","#ff9500","#007aff","#af52de","#ff3b30","#5ac8fa","#ff2d55","#ffcc00",
  "#30d158","#ff6b35","#0a84ff","#bf5af2","#ff453a","#64d2ff","#ff375f","#ffd60a",
  "#32d74b","#ff8c00","#0066cc","#9b59b6","#e74c3c","#2ecc71","#e91e63","#f39c12",
  "#27ae60","#d35400","#2980b9","#8e44ad","#c0392b","#16a085","#e84393","#fdcb6e",
];

const TIER_TRACK_LIMITS = { free:4, starter:8, creator:16, pro:32 };
const DEFAULT_MAX = 4;

const DEFAULT_EFFECTS = () => ({
  eq:            { lowGain:0, midGain:0, midFreq:1000, highGain:0, enabled:false },
  compressor:    { threshold:-24, ratio:4, attack:0.003, release:0.25, knee:30, enabled:false },
  reverb:        { mix:0.2, decay:2.0, enabled:false },
  delay:         { time:0.3, feedback:0.3, mix:0.2, enabled:false },
  distortion:    { amount:0, enabled:false },
  filter:        { type:"lowpass", frequency:20000, Q:1, enabled:false },
  limiter:       { threshold:-1, knee:0, ratio:20, attack:0.001, release:0.05, enabled:false },
  gate:          { threshold:-40, attack:0.001, release:0.05, enabled:false },
  deesser:       { frequency:6000, threshold:-20, ratio:8, enabled:false },
  chorus:        { rate:1.5, depth:0.002, mix:0.3, enabled:false },
  flanger:       { rate:0.3, depth:0.003, feedback:0.5, mix:0.3, enabled:false },
  phaser:        { rate:0.5, depth:1000, baseFreq:1000, Q:5, stages:4, mix:0.3, enabled:false },
  tremolo:       { rate:4, depth:0.5, enabled:false },
  stereoWidener: { width:0.5, enabled:false },
  bitcrusher:    { bits:8, sampleRateReduce:1, enabled:false },
  exciter:       { amount:30, frequency:3000, mix:0.2, enabled:false },
  tapeSaturation:{ drive:0.3, warmth:0.5, enabled:false },
  gainUtility:   { gain:0, phaseInvert:false, monoSum:false, enabled:false },
});

const MIC_MODELS = {
  none:   { name:"No Mic Model", eqCurve:null, rolloff:0 },
  sm7b:   { name:"SM7B (Dynamic)", desc:"Warm, smooth midrange — podcasts, vocals, rap", eqCurve:{lowGain:2,midGain:3,midFreq:3000,highGain:-2}, rolloff:80 },
  sm58:   { name:"SM58 (Dynamic)", desc:"Bright presence peak — live vocals, spoken word", eqCurve:{lowGain:-1,midGain:4,midFreq:5000,highGain:1}, rolloff:100 },
  u87:    { name:"U87 (Condenser)", desc:"Detailed, airy top — studio vocals, acoustic", eqCurve:{lowGain:1,midGain:1,midFreq:4000,highGain:4}, rolloff:40 },
  c414:   { name:"C414 (Condenser)", desc:"Flat, transparent — versatile studio mic", eqCurve:{lowGain:0,midGain:1,midFreq:3500,highGain:2}, rolloff:40 },
  re20:   { name:"RE20 (Dynamic)", desc:"Deep, full low end — broadcast, bass vocals", eqCurve:{lowGain:4,midGain:1,midFreq:2500,highGain:-1}, rolloff:50 },
  tlm103: { name:"TLM 103 (Condenser)", desc:"Wide presence boost — bright vocals, voiceover", eqCurve:{lowGain:0,midGain:2,midFreq:6000,highGain:5}, rolloff:40 },
  md421:  { name:"MD 421 (Dynamic)", desc:"Aggressive midrange — rock vocals, instruments", eqCurve:{lowGain:1,midGain:5,midFreq:2000,highGain:0}, rolloff:80 },
  ribbon: { name:"Ribbon (Figure-8)", desc:"Dark, vintage warmth — smooth jazz, crooners", eqCurve:{lowGain:3,midGain:-1,midFreq:3000,highGain:-4}, rolloff:60 },
};

const uid = () => globalThis.crypto?.randomUUID?.() ?? `id_${Date.now()}_${Math.random().toString(36).slice(2)}`;

const DEFAULT_TRACK = (i, type="audio") => ({
  id: uid(),
  name: `${type==="midi"?"MIDI":type==="bus"?"Bus":type==="aux"?"Aux":"Audio"} ${i+1}`,
  trackType: type,
  instrument: type==="midi" ? { program:0, name:"Acoustic Grand" } : null,
  volume: 0.8, pan: 0, muted: false, solo: false, armed: false,
  audio_url: null, color: TRACK_COLORS[i%TRACK_COLORS.length],
  audioBuffer: null, effects: DEFAULT_EFFECTS(), regions: [],
});

const secondsToBeat = (s, bpm) => (s/60)*bpm;
const beatToSeconds = (b, bpm) => (b/bpm)*60;
const clamp = (n,a,b) => Math.max(a,Math.min(b,n));

const DB_MARKS = [0,-6,-12,-18,-24,-30,-40,-50];
const linearToMeterPos = (lin) => { if(lin<=0) return 0; const db=20*Math.log10(lin); return clamp((db+60)/66,0,1); };
const dbToMeterPos = (db) => clamp((db+60)/66,0,1);

// ── CubaseMeter ──
const CubaseMeter = React.memo(({ leftLevel=0, rightLevel=0, height=200, showScale=false }) => {
  const canvasRef = useRef(null);
  const peakLRef = useRef(0), peakRRef = useRef(0), peakTimerRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current; if(!canvas) return;
    const dpr = window.devicePixelRatio||1;
    const displayW = showScale?52:26;
    canvas.width=displayW*dpr; canvas.height=height*dpr;
    canvas.style.width=`${displayW}px`; canvas.style.height=`${height}px`;
  }, [height, showScale]);

  useEffect(() => {
    const canvas = canvasRef.current; if(!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio||1;
    const w=canvas.width/dpr, h=canvas.height/dpr;
    const barW=8, gap=2, totalBarsW=barW*2+gap;
    const scaleW=showScale?22:0;
    const ox=Math.floor((w-totalBarsW-scaleW)/2);
    ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.clearRect(0,0,w,h);
    const lPos=linearToMeterPos(leftLevel), rPos=linearToMeterPos(rightLevel);
    if(lPos>peakLRef.current){peakLRef.current=lPos;peakTimerRef.current=0;}
    if(rPos>peakRRef.current){peakRRef.current=rPos;peakTimerRef.current=0;}
    peakTimerRef.current++;
    if(peakTimerRef.current>25){
      peakLRef.current=Math.max(peakLRef.current-0.01,0);
      peakRRef.current=Math.max(peakRRef.current-0.01,0);
    }
    const drawBar=(x,level,peak)=>{
      ctx.fillStyle="#080e14"; ctx.fillRect(x,0,barW,h);
      const fillH=level*h;
      const grad=ctx.createLinearGradient(0,h,0,0);
      grad.addColorStop(0,"#0d3320"); grad.addColorStop(0.15,"#0f8040");
      grad.addColorStop(0.5,"#2db84a"); grad.addColorStop(0.7,"#7acc20");
      grad.addColorStop(0.82,"#c8c820"); grad.addColorStop(0.9,"#e8a010");
      grad.addColorStop(0.96,"#e04040"); grad.addColorStop(1.0,"#ff2020");
      ctx.fillStyle=grad; ctx.fillRect(x,h-fillH,barW,fillH);
      ctx.fillStyle="#080e14";
      for(let sy=0;sy<h;sy+=4) ctx.fillRect(x,sy,barW,1);
      if(peak>0.01){
        const py=h-peak*h;
        ctx.fillStyle=peak>0.92?"#ff3030":peak>0.75?"#e8c020":"#40d870";
        ctx.fillRect(x,py,barW,2);
      }
    };
    drawBar(ox,lPos,peakLRef.current);
    drawBar(ox+barW+gap,rPos,peakRRef.current);
    if(showScale){
      ctx.font='8px "SF Mono","Consolas",monospace'; ctx.textAlign="left";
      DB_MARKS.forEach(db=>{
        const pos=dbToMeterPos(db); const y=h-pos*h;
        ctx.fillStyle="#2a3848"; ctx.fillRect(ox+totalBarsW+2,y,3,1);
        ctx.fillStyle="#5a7088"; ctx.fillText(`${db}`,ox+totalBarsW+7,y+3);
      });
    }
    ctx.fillStyle="#5a7088"; ctx.font='7px "SF Mono","Consolas",monospace'; ctx.textAlign="center";
    ctx.fillText("L",ox+barW/2,h-2); ctx.fillText("R",ox+barW+gap+barW/2,h-2);
  }, [leftLevel,rightLevel,height,showScale]);

  return <canvas ref={canvasRef} className="daw-cubase-meter" />;
});

// ── MicModelSelector ──
const MicModelSelector = React.memo(({ trackIndex, currentModel, onApply }) => {
  const [isOpen, setIsOpen] = useState(false);
  const isActive = currentModel && currentModel !== "none";
  return (
    <>
      <button
        className={`daw-ch-mic-btn${isActive?" active":""}`}
        onClick={() => setIsOpen(!isOpen)}
        title={isActive ? MIC_MODELS[currentModel]?.desc : "Select mic model"}
      >
        {isActive ? MIC_MODELS[currentModel]?.name?.split(" (")[0]||"Mic" : "🎙 Mic Model"}
      </button>
      {isOpen && (
        <div className="daw-ch-mic-popup">
          <div
            className={`daw-ch-mic-item${(!currentModel||currentModel==="none")?" active":""}`}
            onClick={() => { onApply(trackIndex,"none"); setIsOpen(false); }}
          >
            <div className="daw-ch-mic-item-name">None</div>
          </div>
          {Object.entries(MIC_MODELS).filter(([k])=>k!=="none").map(([key,mic]) => (
            <div
              key={key}
              className={`daw-ch-mic-item${currentModel===key?" active":""}`}
              onClick={() => { onApply(trackIndex,key); setIsOpen(false); }}
              title={mic?.desc||""}
            >
              <div className="daw-ch-mic-item-name">{mic?.name||key}</div>
              <div className="daw-ch-mic-item-desc">{mic?.desc||""}</div>
            </div>
          ))}
        </div>
      )}
    </>
  );
});

// ── MidiRegionPreview ──
const MidiRegionPreview = React.memo(({ notes=[], duration, height, color }) => {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas=canvasRef.current; if(!canvas||!notes.length) return;
    const ctx=canvas.getContext("2d"); const w=canvas.width,h=canvas.height;
    ctx.clearRect(0,0,w,h);
    const noteNums=notes.map(n=>n.note);
    const minNote=Math.min(...noteNums)-1, maxNote=Math.max(...noteNums)+1;
    const range=Math.max(maxNote-minNote,12);
    ctx.fillStyle=color||"#7c3aed"; ctx.globalAlpha=0.8;
    notes.forEach(n=>{
      const x=(n.startBeat/duration)*w;
      const noteW=Math.max((n.duration/duration)*w,2);
      const y=h-((n.note-minNote)/range)*h;
      const noteH=Math.max(h/range,2);
      ctx.fillRect(x,y-noteH,noteW,noteH);
    });
  }, [notes,duration,height,color]);
  return <canvas ref={canvasRef} width={300} height={height} className="daw-midi-preview" />;
});

// ── MIDI writer ──
const midiFromNotes = ({ notes=[], bpm=120, ppq=480 }) => {
  const sorted=[...notes]
    .filter(n=>Number.isFinite(n.note)&&Number.isFinite(n.startBeat)&&Number.isFinite(n.duration))
    .map(n=>({
      note:clamp(Math.round(n.note),0,127),
      vel:clamp(Math.round((n.velocity??0.9)<=1?(n.velocity??0.9)*127:(n.velocity??100)),1,127),
      startTick:Math.max(0,Math.round((n.startBeat||0)*ppq)),
      endTick:Math.max(0,Math.round(((n.startBeat||0)+(n.duration||0))*ppq)),
      channel:clamp(Math.round(n.channel??0),0,15),
    }))
    .filter(n=>n.endTick>n.startTick)
    .sort((a,b)=>a.startTick-b.startTick);
  const events=[]; const mpqn=Math.round(60000000/(bpm||120));
  events.push({tick:0,bytes:[0xff,0x51,0x03,(mpqn>>16)&0xff,(mpqn>>8)&0xff,mpqn&0xff]});
  for(const n of sorted){
    events.push({tick:n.startTick,bytes:[0x90|n.channel,n.note,n.vel]});
    events.push({tick:n.endTick,bytes:[0x80|n.channel,n.note,0x00]});
  }
  const lastTick=events.reduce((m,e)=>Math.max(m,e.tick),0);
  events.push({tick:lastTick+1,bytes:[0xff,0x2f,0x00]});
  events.sort((a,b)=>a.tick-b.tick);
  const trackData=[]; let prevTick=0;
  const writeVarLen=(val)=>{
    let v=val>>>0; let buffer=v&0x7f;
    while((v>>=7)){buffer<<=8;buffer|=(v&0x7f)|0x80;}
    while(true){trackData.push(buffer&0xff);if(buffer&0x80)buffer>>=8;else break;}
  };
  for(const e of events){writeVarLen(Math.max(0,e.tick-prevTick));trackData.push(...e.bytes);prevTick=e.tick;}
  const header=[],pushStr=(s)=>s.split("").forEach(ch=>header.push(ch.charCodeAt(0)));
  const pushU16=(n)=>header.push((n>>8)&0xff,n&0xff);
  const pushU32=(n)=>header.push((n>>24)&0xff,(n>>16)&0xff,(n>>8)&0xff,n&0xff);
  pushStr("MThd");pushU32(6);pushU16(0);pushU16(1);pushU16(ppq);
  const trackHeader=[],pushStr3=(s)=>s.split("").forEach(ch=>trackHeader.push(ch.charCodeAt(0)));
  const pushU32b=(n)=>trackHeader.push((n>>24)&0xff,(n>>16)&0xff,(n>>8)&0xff,n&0xff);
  pushStr3("MTrk");pushU32b(trackData.length);
  return new Uint8Array([...header,...trackHeader,...trackData]);
};
