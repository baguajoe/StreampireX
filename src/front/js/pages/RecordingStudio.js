
// ═══ RS_part1.js ═══
// =============================================================================
// RecordingStudio.js — Part 1/4
// Imports · Constants · Helpers · Sub-components
// =============================================================================

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
      <button className={"daw-mix-dropdown-btn" + (isActive ? " active" : "")} onClick={() => setOpen(o => !o)}>
        {isActive && active ? active[1] : "Mix"} ▾
      </button>
      {open && (
        <div className="daw-mix-dropdown-menu">
          {items.map(([m, l]) => (
            <button key={m} className={"daw-mix-dropdown-item" + (viewMode === m ? " active" : "")}
              onClick={() => { setViewMode(m); setOpen(false); }}>{l}</button>
          ))}
        </div>
      )}
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
      <button className={"daw-mix-dropdown-btn" + (isActive ? " active" : "")} onClick={() => setOpen(o => !o)}>
        {isActive && active ? active[1] : "Tools"} ▾
      </button>
      {open && (
        <div className="daw-mix-dropdown-menu">
          {items.map(([m, l]) => (
            <button key={m} className={"daw-mix-dropdown-item" + (viewMode === m ? " active" : "")}
              onClick={() => { setViewMode(m); setOpen(false); }}>{l}</button>
          ))}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// MAIN FILE STARTS HERE
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
import SPXVoxEngine from "../component/SPXVoxEngine";
import SPXMonitorSelector from "../component/SPXMonitorSelector";
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
import AddTrackDialog from "../component/AddTrackDialog";

// =============================================================================
// CONSTANTS
// =============================================================================
const TRACK_COLORS = [
  "#34c759","#ff9500","#007aff","#af52de","#ff3b30","#5ac8fa","#ff2d55","#ffcc00",
  "#30d158","#ff6b35","#0a84ff","#bf5af2","#ff453a","#64d2ff","#ff375f","#ffd60a",
  "#32d74b","#ff8c00","#0066cc","#9b59b6","#e74c3c","#2ecc71","#e91e63","#f39c12",
  "#27ae60","#d35400","#2980b9","#8e44ad","#c0392b","#16a085","#e84393","#fdcb6e",
];

const TIER_TRACK_LIMITS = { free: 4, starter: 8, creator: 16, pro: 32 };
const DEFAULT_MAX = 4;

const CONSOLE_BOARDS = {
  none:      { name: "Bypass",      color: "#555" },
  ssl4ke:    { name: "SSL 4000E",   color: "#e8a020" },
  ssl4kg:    { name: "SSL 4000G",   color: "#d4941c" },
  neve8078:  { name: "Neve 8078",   color: "#4a9eff" },
  neve1073:  { name: "Neve 1073",   color: "#3a7acc" },
  api1604:   { name: "API 1604",    color: "#00ffc8" },
  tridentA:  { name: "Trident A",   color: "#a78bfa" },
  studer900: { name: "Studer 900",  color: "#ff6b6b" },
  mciJH636:  { name: "MCI JH-636",  color: "#ff8c42" },
  ssl9000:   { name: "SSL 9000",    color: "#f0c040" },
  neve8068:  { name: "Neve 8068",   color: "#6ab0ff" },
  api2488:   { name: "API 2488",    color: "#00e5cc" },
  helios69:  { name: "Helios T69",  color: "#cc8844" },
  neveVR:    { name: "Neve VR",     color: "#5588cc" },
  emiTG:     { name: "EMI TG12345", color: "#cc4444" },
  sslAWS:    { name: "SSL AWS",     color: "#ddaa20" },
  amekAngela:{ name: "Amek Angela", color: "#9966ff" },
  harrison:  { name: "Harrison 32", color: "#44aadd" },
  neve8014:  { name: "Neve 8014",   color: "#2266aa" },
  sonyMXP:   { name: "Sony MXP",    color: "#aaaaff" },
  calrec:    { name: "Calrec",      color: "#88ccaa" },
};

const MIC_MODELS = {
  none:   { name: "No Mic Model",        eqCurve: null, rolloff: 0 },
  sm7b:   { name: "SM7B (Dynamic)",      desc: "Warm, smooth midrange — podcasts, vocals, rap",            eqCurve: { lowGain: 2,  midGain: 3,  midFreq: 3000, highGain: -2 }, rolloff: 80  },
  sm58:   { name: "SM58 (Dynamic)",      desc: "Bright presence peak — live vocals, spoken word",          eqCurve: { lowGain: -1, midGain: 4,  midFreq: 5000, highGain: 1  }, rolloff: 100 },
  u87:    { name: "U87 (Condenser)",     desc: "Detailed, airy top — studio vocals, acoustic",             eqCurve: { lowGain: 1,  midGain: 1,  midFreq: 4000, highGain: 4  }, rolloff: 40  },
  c414:   { name: "C414 (Condenser)",    desc: "Flat, transparent — versatile studio mic",                 eqCurve: { lowGain: 0,  midGain: 1,  midFreq: 3500, highGain: 2  }, rolloff: 40  },
  re20:   { name: "RE20 (Dynamic)",      desc: "Deep, full low end — broadcast, bass vocals",              eqCurve: { lowGain: 4,  midGain: 1,  midFreq: 2500, highGain: -1 }, rolloff: 50  },
  tlm103: { name: "TLM 103 (Condenser)", desc: "Wide presence boost — bright vocals, voiceover",           eqCurve: { lowGain: 0,  midGain: 2,  midFreq: 6000, highGain: 5  }, rolloff: 40  },
  md421:  { name: "MD 421 (Dynamic)",    desc: "Aggressive midrange — rock vocals, instruments",           eqCurve: { lowGain: 1,  midGain: 5,  midFreq: 2000, highGain: 0  }, rolloff: 80  },
  ribbon: { name: "Ribbon (Figure-8)",   desc: "Dark, vintage warmth — smooth jazz, crooners",             eqCurve: { lowGain: 3,  midGain: -1, midFreq: 3000, highGain: -4 }, rolloff: 60  },
};

const MONITOR_EQ = {
  flat:        { name: "Flat (Bypass)",          cat: "bypass",   low: 0,   lowMid: 0,   highMid: 0,   high: 0,   gain: 0  },
  genelec8030: { name: "Genelec 8030C",          cat: "pro",      low: 0.5, lowMid: 0,   highMid: 0.3, high: 0.5, gain: 0  },
  genelec1032: { name: "Genelec 1032A",          cat: "pro",      low: 1.0, lowMid: 0.5, highMid: 0.5, high: 0.8, gain: 0  },
  ns10:        { name: "Yamaha NS-10M",          cat: "pro",      low: -3,  lowMid: 2,   highMid: 2.5, high: -2,  gain: 1  },
  auratone:    { name: "Auratone 5C",            cat: "pro",      low: -8,  lowMid: 4,   highMid: 3,   high: -6,  gain: 3  },
  avantone:    { name: "Avantone MixCube",       cat: "pro",      low: -7,  lowMid: 3.5, highMid: 2.5, high: -5,  gain: 2.5},
  krk8:        { name: "KRK Rokit 8 G4",         cat: "pro",      low: 2,   lowMid: -1,  highMid: 1,   high: 1,   gain: -1 },
  adamA7x:     { name: "Adam Audio A7X",         cat: "pro",      low: 0.5, lowMid: 0,   highMid: 0.5, high: 1.5, gain: 0  },
  focalAlpha:  { name: "Focal Alpha 65",         cat: "pro",      low: 1,   lowMid: -0.5,highMid: 0.3, high: 0.8, gain: 0  },
  dynaudio:    { name: "Dynaudio BM5A",          cat: "pro",      low: 0.8, lowMid: 0.3, highMid: 0.5, high: 0.5, gain: 0  },
  evenT20:     { name: "Event 20/20bas",         cat: "pro",      low: 1.5, lowMid: 0,   highMid: 0.8, high: 0.3, gain: 0  },
  barefoot:    { name: "Barefoot MicroMain27",   cat: "pro",      low: 0.3, lowMid: 0,   highMid: 0.2, high: 0.5, gain: 0  },
  mackie8:     { name: "Mackie HR824",           cat: "pro",      low: 1.2, lowMid: -0.3,highMid: 0.5, high: 0.5, gain: 0  },
  jblLsr:      { name: "JBL LSR 305",            cat: "pro",      low: 1.0, lowMid: -0.5,highMid: 0.8, high: 1.0, gain: -0.5},
  augspurger:  { name: "Augspurger Studio",      cat: "pro",      low: 1.5, lowMid: 0.5, highMid: 0.5, high: 1.0, gain: -1 },
  iphone:      { name: "iPhone Speaker",         cat: "consumer", low: -10, lowMid: 3,   highMid: 5,   high: -4,  gain: 4  },
  android:     { name: "Android Phone",          cat: "consumer", low: -9,  lowMid: 2.5, highMid: 4.5, high: -3,  gain: 3.5},
  laptop:      { name: "Laptop Speakers",        cat: "consumer", low: -12, lowMid: 2,   highMid: 4,   high: -3,  gain: 5  },
  earbuds:     { name: "Earbuds",                cat: "consumer", low: -4,  lowMid: 1,   highMid: 3,   high: 2,   gain: 1  },
  car:         { name: "Car Stereo",             cat: "consumer", low: 4,   lowMid: -2,  highMid: 2,   high: -1,  gain: -1 },
  club:        { name: "Club / PA System",       cat: "consumer", low: 6,   lowMid: -1,  highMid: 0,   high: 2,   gain: -3 },
  tv:          { name: "TV Speakers",            cat: "consumer", low: -6,  lowMid: 1,   highMid: 3,   high: -2,  gain: 2  },
  bluetooth:   { name: "Bluetooth Speaker",      cat: "consumer", low: -2,  lowMid: 1,   highMid: 2,   high: -1,  gain: 1  },
};

// =============================================================================
// HELPERS
// =============================================================================
const uid = () => globalThis.crypto?.randomUUID?.() ?? `id_${Date.now()}_${Math.random().toString(36).slice(2)}`;
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const secondsToBeat = (s, bpm) => (s / 60) * bpm;
const beatToSeconds = (b, bpm) => (b / bpm) * 60;
const DB_MARKS = [0, -6, -12, -18, -24, -30, -40, -50];
const linearToMeterPos = (lin) => { if (lin <= 0) return 0; const db = 20 * Math.log10(lin); return clamp((db + 60) / 66, 0, 1); };
const dbToMeterPos = (db) => clamp((db + 60) / 66, 0, 1);

const DEFAULT_EFFECTS = () => ({
  eq:            { lowGain: 0, midGain: 0, midFreq: 1000, highGain: 0, enabled: false },
  compressor:    { threshold: -24, ratio: 4, attack: 0.003, release: 0.25, knee: 30, enabled: false },
  reverb:        { mix: 0.2, decay: 2.0, enabled: false },
  delay:         { time: 0.3, feedback: 0.3, mix: 0.2, enabled: false },
  distortion:    { amount: 0, enabled: false },
  filter:        { type: "lowpass", frequency: 20000, Q: 1, enabled: false },
  limiter:       { threshold: -1, knee: 0, ratio: 20, attack: 0.001, release: 0.05, enabled: false },
  gate:          { threshold: -40, attack: 0.001, release: 0.05, enabled: false },
  deesser:       { frequency: 6000, threshold: -20, ratio: 8, enabled: false },
  chorus:        { rate: 1.5, depth: 0.002, mix: 0.3, enabled: false },
  flanger:       { rate: 0.3, depth: 0.003, feedback: 0.5, mix: 0.3, enabled: false },
  phaser:        { rate: 0.5, depth: 1000, baseFreq: 1000, Q: 5, stages: 4, mix: 0.3, enabled: false },
  tremolo:       { rate: 4, depth: 0.5, enabled: false },
  stereoWidener: { width: 0.5, enabled: false },
  bitcrusher:    { bits: 8, sampleRateReduce: 1, enabled: false },
  exciter:       { amount: 30, frequency: 3000, mix: 0.2, enabled: false },
  tapeSaturation:{ drive: 0.3, warmth: 0.5, enabled: false },
  gainUtility:   { gain: 0, phaseInvert: false, monoSum: false, enabled: false },
});

const DEFAULT_TRACK = (i, type = "audio") => ({
  id: uid(),
  name: `${type === "midi" ? "MIDI" : type === "bus" ? "Bus" : type === "aux" ? "Aux" : "Audio"} ${i + 1}`,
  trackType: type,
  instrument: type === "midi" ? { program: 0, name: "Acoustic Grand" } : null,
  volume: 1.0, pan: 0, muted: false, solo: false, armed: false,
  audio_url: null, color: TRACK_COLORS[i % TRACK_COLORS.length],
  audioBuffer: null, effects: DEFAULT_EFFECTS(), regions: [],
});

// =============================================================================
// CUBASE METER (canvas stereo VU)
// =============================================================================
const CubaseMeter = React.memo(({ leftLevel = 0, rightLevel = 0, height = 200, showScale = false }) => {
  const canvasRef = useRef(null);
  const peakLRef = useRef(0), peakRRef = useRef(0), peakTimerRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const displayW = showScale ? 52 : 26;
    canvas.width = displayW * dpr; canvas.height = height * dpr;
    canvas.style.width = `${displayW}px`; canvas.style.height = `${height}px`;
  }, [height, showScale]);

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.width / dpr, h = canvas.height / dpr;
    const barW = 8, gap = 2, totalBarsW = barW * 2 + gap;
    const scaleW = showScale ? 22 : 0;
    const ox = Math.floor((w - totalBarsW - scaleW) / 2);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const lPos = linearToMeterPos(leftLevel), rPos = linearToMeterPos(rightLevel);
    if (lPos > peakLRef.current) { peakLRef.current = lPos; peakTimerRef.current = 0; }
    if (rPos > peakRRef.current) { peakRRef.current = rPos; peakTimerRef.current = 0; }
    peakTimerRef.current++;
    if (peakTimerRef.current > 25) {
      peakLRef.current = Math.max(peakLRef.current - 0.01, 0);
      peakRRef.current = Math.max(peakRRef.current - 0.01, 0);
    }
    const drawBar = (x, level, peak) => {
      ctx.fillStyle = "#060a0e"; ctx.fillRect(x, 0, barW, h);
      const fillH = level * h;
      const grad = ctx.createLinearGradient(0, h, 0, 0);
      grad.addColorStop(0,    "#0d3320"); grad.addColorStop(0.15, "#0f8040");
      grad.addColorStop(0.5,  "#2db84a"); grad.addColorStop(0.7,  "#7acc20");
      grad.addColorStop(0.82, "#c8c820"); grad.addColorStop(0.9,  "#e8a010");
      grad.addColorStop(0.96, "#e04040"); grad.addColorStop(1.0,  "#ff2020");
      ctx.fillStyle = grad; ctx.fillRect(x, h - fillH, barW, fillH);
      ctx.fillStyle = "#060a0e";
      for (let sy = 0; sy < h; sy += 4) ctx.fillRect(x, sy, barW, 1);
      if (peak > 0.01) {
        const py = h - peak * h;
        ctx.fillStyle = peak > 0.92 ? "#ff3030" : peak > 0.75 ? "#e8c020" : "#40d870";
        ctx.fillRect(x, py, barW, 2);
      }
    };
    drawBar(ox, lPos, peakLRef.current);
    drawBar(ox + barW + gap, rPos, peakRRef.current);
    if (showScale) {
      ctx.font = '8px "SF Mono","Consolas",monospace'; ctx.textAlign = "left";
      DB_MARKS.forEach(db => {
        const pos = dbToMeterPos(db); const y = h - pos * h;
        ctx.fillStyle = "#2a3848"; ctx.fillRect(ox + totalBarsW + 2, y, 3, 1);
        ctx.fillStyle = "#5a7088"; ctx.fillText(`${db}`, ox + totalBarsW + 7, y + 3);
      });
    }
    ctx.fillStyle = "#5a7088"; ctx.font = '7px "SF Mono","Consolas",monospace'; ctx.textAlign = "center";
    ctx.fillText("L", ox + barW / 2, h - 2); ctx.fillText("R", ox + barW + gap + barW / 2, h - 2);
  }, [leftLevel, rightLevel, height, showScale]);

  return <canvas ref={canvasRef} className="daw-cubase-meter" />;
});

// =============================================================================
// MIC MODEL SELECTOR
// =============================================================================
const MicModelSelector = React.memo(({ trackIndex, currentModel, onApply }) => {
  const [isOpen, setIsOpen] = useState(false);
  const isActive = currentModel && currentModel !== "none";
  return (
    <>
      <button
        className={"daw-ch-mic-btn" + (isActive ? " active" : "")}
        onClick={() => setIsOpen(!isOpen)}
        title={isActive ? MIC_MODELS[currentModel]?.desc : "Select mic model"}
      >
        {isActive ? MIC_MODELS[currentModel]?.name?.split(" (")[0] || "Mic" : "🎙 Mic Model"}
      </button>
      {isOpen && (
        <div className="daw-ch-mic-popup">
          <div
            className={"daw-ch-mic-item" + (!currentModel || currentModel === "none" ? " active" : "")}
            onClick={() => { onApply(trackIndex, "none"); setIsOpen(false); }}
          >
            <div className="daw-ch-mic-item-name">None</div>
          </div>
          {Object.entries(MIC_MODELS).filter(([k]) => k !== "none").map(([key, mic]) => (
            <div key={key}
              className={"daw-ch-mic-item" + (currentModel === key ? " active" : "")}
              onClick={() => { onApply(trackIndex, key); setIsOpen(false); }}
              title={mic?.desc || ""}
            >
              <div className="daw-ch-mic-item-name">{mic?.name || key}</div>
              <div className="daw-ch-mic-item-desc">{mic?.desc || ""}</div>
            </div>
          ))}
        </div>
      )}
    </>
  );
});

// =============================================================================
// MIDI REGION PREVIEW
// =============================================================================
const MidiRegionPreview = React.memo(({ notes = [], duration, height, color }) => {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas || !notes.length) return;
    const ctx = canvas.getContext("2d"); const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    const noteNums = notes.map(n => n.note);
    const minNote = Math.min(...noteNums) - 1, maxNote = Math.max(...noteNums) + 1;
    const range = Math.max(maxNote - minNote, 12);
    ctx.fillStyle = color || "#7c3aed"; ctx.globalAlpha = 0.8;
    notes.forEach(n => {
      const x = (n.startBeat / duration) * w;
      const noteW = Math.max((n.duration / duration) * w, 2);
      const y = h - ((n.note - minNote) / range) * h;
      const noteH = Math.max(h / range, 2);
      ctx.fillRect(x, y - noteH, noteW, noteH);
    });
  }, [notes, duration, height, color]);
  return <canvas ref={canvasRef} width={300} height={height} className="daw-midi-preview" />;
});

// =============================================================================
// MIDI FILE WRITER
// =============================================================================
const midiFromNotes = ({ notes = [], bpm = 120, ppq = 480 }) => {
  const sorted = [...notes]
    .filter(n => Number.isFinite(n.note) && Number.isFinite(n.startBeat) && Number.isFinite(n.duration))
    .map(n => ({
      note: clamp(Math.round(n.note), 0, 127),
      vel: clamp(Math.round((n.velocity ?? 0.9) <= 1 ? (n.velocity ?? 0.9) * 127 : (n.velocity ?? 100)), 1, 127),
      startTick: Math.max(0, Math.round((n.startBeat || 0) * ppq)),
      endTick: Math.max(0, Math.round(((n.startBeat || 0) + (n.duration || 0)) * ppq)),
      channel: clamp(Math.round(n.channel ?? 0), 0, 15),
    }))
    .filter(n => n.endTick > n.startTick)
    .sort((a, b) => a.startTick - b.startTick);
  const events = []; const mpqn = Math.round(60000000 / (bpm || 120));
  events.push({ tick: 0, bytes: [0xff, 0x51, 0x03, (mpqn >> 16) & 0xff, (mpqn >> 8) & 0xff, mpqn & 0xff] });
  for (const n of sorted) {
    events.push({ tick: n.startTick, bytes: [0x90 | n.channel, n.note, n.vel] });
    events.push({ tick: n.endTick,   bytes: [0x80 | n.channel, n.note, 0x00] });
  }
  const lastTick = events.reduce((m, e) => Math.max(m, e.tick), 0);
  events.push({ tick: lastTick + 1, bytes: [0xff, 0x2f, 0x00] });
  events.sort((a, b) => a.tick - b.tick);
  const trackData = []; let prevTick = 0;
  const writeVarLen = (val) => {
    let v = val >>> 0; let buffer = v & 0x7f;
    while ((v >>= 7)) { buffer <<= 8; buffer |= (v & 0x7f) | 0x80; }
    while (true) { trackData.push(buffer & 0xff); if (buffer & 0x80) buffer >>= 8; else break; }
  };
  for (const e of events) { writeVarLen(Math.max(0, e.tick - prevTick)); trackData.push(...e.bytes); prevTick = e.tick; }
  const header = [], pushStr = (s) => s.split("").forEach(ch => header.push(ch.charCodeAt(0)));
  const pushU16 = (n) => header.push((n >> 8) & 0xff, n & 0xff);
  const pushU32 = (n) => header.push((n >> 24) & 0xff, (n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff);
  pushStr("MThd"); pushU32(6); pushU16(0); pushU16(1); pushU16(ppq);
  const trackHeader = [], pushStr3 = (s) => s.split("").forEach(ch => trackHeader.push(ch.charCodeAt(0)));
  const pushU32b = (n) => trackHeader.push((n >> 24) & 0xff, (n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff);
  pushStr3("MTrk"); pushU32b(trackData.length);
  return new Uint8Array([...header, ...trackHeader, ...trackData]);
};


// ═══ RS_part2.js ═══
// =============================================================================
// RecordingStudio.js — Part 2/4
// Component state · Audio engine · Recording · Playback · FX chain
// =============================================================================

const DraggablePanel = ({ title, children, onClose, initialX=100, initialY=60 }) => {
  const [pos, setPos] = React.useState({x: initialX, y: initialY});
  const dragRef = React.useRef(null);
  const onMouseDown = e => {
    dragRef.current = {sx: e.clientX - pos.x, sy: e.clientY - pos.y};
    const onMove = e2 => setPos({x: e2.clientX - dragRef.current.sx, y: e2.clientY - dragRef.current.sy});
    const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };
  return (
    <div style={{position:"fixed",left:pos.x,top:pos.y,zIndex:9998,background:"#0d1117",border:"1px solid #243048",borderRadius:8,boxShadow:"0 16px 48px rgba(0,0,0,.85)",minWidth:520,maxWidth:"95vw",maxHeight:"90vh",overflow:"hidden",display:"flex",flexDirection:"column"}}>
      <div style={{padding:"8px 14px",background:"#161b22",borderBottom:"1px solid #1e2638",display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"grab",userSelect:"none",borderRadius:"8px 8px 0 0"}} onMouseDown={onMouseDown}>
        <span style={{color:"#cdd9e5",fontSize:12,fontWeight:700}}>{title}</span>
        <button onClick={onClose} style={{background:"none",border:"none",color:"#8ba3bc",cursor:"pointer",fontSize:16}}>x</button>
      </div>
      <div style={{overflowY:"auto",flex:1}}>{children}</div>
    </div>
  );
};

const InsertPickerMenu = ({ insertPickerState, setInsertPickerState, tracks, updateEffect, setActiveEffectsTrack, setOpenFxKey, setShowVocalModal, setShowMicSimModal, setStatus }) => {
  const [openCats, setOpenCats] = React.useState({});
  const [dragOffset, setDragOffset] = React.useState({x:0,y:0});
  const dragRef = React.useRef(null);
  const toggleCat = cat => setOpenCats(p => ({...p, [cat]: !p[cat]}));
  const onDragStart = e => {
    dragRef.current = {startX: e.clientX - dragOffset.x, startY: e.clientY - dragOffset.y};
    const onMove = e2 => setDragOffset({x: e2.clientX - dragRef.current.startX, y: e2.clientY - dragRef.current.startY});
    const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };
  const SPX_KEYS = new Set(ALL_FX_EXTENDED.filter(f=>f.component).map(f=>f.key));
  const groups = [
    { cat: "Vocal Tools",   cls: "vocal", items: [{key:"__vocal_processor",name:"Vocal Processor"},{key:"__mic_simulator",name:"Mic Simulator"}] },
    { cat: "── Standard FX ──", cls: "header", items: [] },
    { cat: "EQ",            cls: "", items: ALL_FX_EXTENDED.filter(f=>f.type==="eq" && !SPX_KEYS.has(f.key)) },
    { cat: "Dynamics",      cls: "", items: ALL_FX_EXTENDED.filter(f=>["comp","limit"].includes(f.type) && !SPX_KEYS.has(f.key)) },
    { cat: "Reverb",        cls: "", items: ALL_FX_EXTENDED.filter(f=>f.type==="reverb" && !SPX_KEYS.has(f.key)) },
    { cat: "Delay",         cls: "", items: ALL_FX_EXTENDED.filter(f=>f.type==="delay" && !SPX_KEYS.has(f.key)) },
    { cat: "Modulation",    cls: "", items: ALL_FX_EXTENDED.filter(f=>f.type==="filter" && !SPX_KEYS.has(f.key)) },
    { cat: "Saturation",    cls: "", items: ALL_FX_EXTENDED.filter(f=>f.type==="distortion" && !SPX_KEYS.has(f.key)) },
    { cat: "Utility",       cls: "", items: ALL_FX_EXTENDED.filter(f=>!["comp","limit","eq","reverb","delay","filter","distortion"].includes(f.type) && !SPX_KEYS.has(f.key)) },
    { cat: "── SPX Plugins ──", cls: "header", items: [] },
    { cat: "SPX Dynamics",  cls: "spx", items: ALL_FX_EXTENDED.filter(f=>["comp","limit"].includes(f.type) && SPX_KEYS.has(f.key)) },
    { cat: "SPX EQ",        cls: "spx", items: ALL_FX_EXTENDED.filter(f=>f.type==="eq" && SPX_KEYS.has(f.key)) },
    { cat: "SPX Reverb",    cls: "spx", items: ALL_FX_EXTENDED.filter(f=>f.type==="reverb" && SPX_KEYS.has(f.key)) },
    { cat: "SPX Delay",     cls: "spx", items: ALL_FX_EXTENDED.filter(f=>f.type==="delay" && SPX_KEYS.has(f.key)) },
    { cat: "SPX Modulation",cls: "spx", items: ALL_FX_EXTENDED.filter(f=>f.type==="filter" && SPX_KEYS.has(f.key)) },
    { cat: "SPX Saturation",cls: "spx", items: ALL_FX_EXTENDED.filter(f=>f.type==="distortion" && SPX_KEYS.has(f.key)) },
    { cat: "── Mastering ──", cls: "header", items: [] },
    { cat: "Mastering",     cls: "spx", items: ALL_FX_EXTENDED.filter(f=>["peak","shaped"].includes(f.type)) },
    { cat: "SPX Creative",  cls: "spx", items: ALL_FX_EXTENDED.filter(f=>!["comp","limit","eq","reverb","delay","filter","distortion"].includes(f.type) && SPX_KEYS.has(f.key)) },
  ];
  return (
    <>
      {groups.map(group => (
        <div key={group.cat}>
          {group.cls === 'header' ? (
            <div style={{padding:"8px 12px 4px",color:"#00ffc8",fontSize:9,letterSpacing:2,fontWeight:800,textTransform:"uppercase",borderTop:"1px solid #1e2638",marginTop:4,background:"#060a10"}}>
              {group.cat.replace(/^──\s*|\s*──$/g,"")}
            </div>
          ) : (
            <div style={{cursor:"pointer",display:"flex",justifyContent:"space-between",padding:"6px 12px",background:"rgba(255,255,255,.04)",borderBottom:"1px solid #1e2638"}}
              onClick={()=>toggleCat(group.cat)}>
              <span style={{color:group.cls==="spx"?"#ff6600":group.cls==="vocal"?"#a78bfa":"#cdd9e5",fontSize:11,letterSpacing:1,textTransform:"uppercase",fontWeight:700}}>{group.cat}</span>
              <span style={{fontSize:10,color:"#8ba3bc"}}>{openCats[group.cat]?"▲":"▼"} {group.items.length}</span>
            </div>
          )}
          {group.cls !== 'header' && openCats[group.cat] && group.items.map(fx => {
            const isVocal = fx.key.startsWith("__");
            const already = !isVocal && insertPickerState.trackIndex >= 0 && tracks[insertPickerState.trackIndex] && tracks[insertPickerState.trackIndex].effects && tracks[insertPickerState.trackIndex].effects[fx.key] && tracks[insertPickerState.trackIndex].effects[fx.key].enabled;
            return (
              <div key={fx.key} className={"daw-insert-picker-item"+(already?" done":isVocal?" vocal":"")}
                onClick={()=>{
                  if (fx.key==="__vocal_processor"){setInsertPickerState(null);setShowVocalModal(true);return;}
                  if (fx.key==="__mic_simulator"){setInsertPickerState(null);setShowMicSimModal(true);return;}
                  if (already) return;
                  updateEffect(insertPickerState.trackIndex,fx.key,"enabled",true);
                  setActiveEffectsTrack(insertPickerState.trackIndex);
                  setOpenFxKey(fx.key);
                  setInsertPickerState(null);
                  setStatus(fx.name+" added");
                }}>
                {isVocal?"+ "+fx.name:already?"✓ "+fx.name:fx.name}
              </div>
            );
          })}
        </div>
      ))}
      <div className="rs-divider"/>
      <div className="rs-remove-item" onClick={()=>setInsertPickerState(null)}>Cancel</div>
    </>
  );
};

const RecordingStudio = ({ user }) => {
  // ── Automation ──
  const [automation, setAutomation] = useState({});
  const autoRafRef = useRef(null);
  const [autoRead, setAutoRead] = useState(false);
  const [autoParams, setAutoParams] = useState({});
  const [autoWrite, setAutoWrite] = useState(false);
  const [fx, setFx] = useState({});

  // ── Track / project state ──
  const userTier = (user?.subscription_tier || user?.tier || "free").toLowerCase();
  const maxTracks = TIER_TRACK_LIMITS[userTier] || DEFAULT_MAX;
  const [viewMode, setViewMode] = useState("arrange");
  const [showFlexPitch, setShowFlexPitch] = useState(false);
  const [flexPitchBuffer, setFlexPitchBuffer] = useState(null);
  const [flexPitchTrack, setFlexPitchTrack] = useState(null);
  const [splitScreen, setSplitScreen] = useState(false);
  const [splitTopH, setSplitTopH] = useState(50);
  const splitDragRef = useRef(false);
  const splitContainerRef = useRef(null);
  const [projectName, setProjectName] = useState("Untitled Project");
  const [projectId, setProjectId] = useState(null);
  const [projects, setProjects] = useState([]);
  const [showProjectList, setShowProjectList] = useState(false);
  const [bpm, setBpm] = useState(120);
  const [timeSignature, setTimeSignature] = useState([4, 4]);
  const [masterVolume, setMasterVolume] = useState(1.0);
  const [masterPan, setMasterPan] = useState(0);
  const [tracks, setTracks] = useState(Array.from({ length: 1 }, (_, i) => DEFAULT_TRACK(i)));
  const [trackMicModels, setTrackMicModels] = useState({});
  const [midiEnabled, setMidiEnabled] = useState(false);
  const [wamPlugins, setWamPlugins] = useState([]);
  const [analogSubview, setAnalogSubview] = useState("ampsim");
  const [trackConsoleChar, setTrackConsoleChar] = useState({});
  const [masterConsoleChar, setMasterConsoleChar] = useState("none");
  const [binauralOn, setBinauralOn] = useState(false);
  const [monitorSpeaker, setMonitorSpeaker] = useState("flat");
  const [showMonitorSelector, setShowMonitorSelector] = useState(false);
  const [showVoxEngine, setShowVoxEngine] = useState(false);
  const [voxTrackId, setVoxTrackId] = useState(null);
  const [monoCheck, setMonoCheck] = useState(false);
  const [abRef, setAbRef] = useState(false);
  const [abRefBuffer, setAbRefBuffer] = useState(null);
  const abRefSourceRef = useRef(null);
  const abRefGainRef = useRef(null);
  const [roomSim, setRoomSim] = useState("none");
  const [lufsValue, setLufsValue] = useState(-23);
  const monitorNodeRef = useRef(null);
  const monoNodeRef = useRef(null);
  const roomNodeRef = useRef(null);
  const lufsIntervalRef = useRef(null);
  const trackConsoleCharRef = useRef({});
  const masterConsoleCharRef = useRef("none");
  const masterConsoleOutRef = useRef(null);
  const monitorNodesRef = useRef(null);
  const [keyboardOctave, setKeyboardOctave] = useState(4);
  const [trackInstrument, setTrackInstrument] = useState({});
  const [zoom, setZoom] = useState(1);

  // ── Audio state ──
  const [latencyMs, setLatencyMs] = useState(0);
  const [monitoringEnabled, setMonitoringEnabled] = useState(false);
  const [latencyCompMs, setLatencyCompMs] = useState(0);
  const monitorGainRef = useRef(null);
  const [tapeDrive, setTapeDrive] = useState(0.3);
  const [tapeWarmth, setTapeWarmth] = useState(0.5);
  const [tapeEnabled, setTapeEnabled] = useState(false);
  const [harmonicEnabled, setHarmonicEnabled] = useState(false);
  const [harmonicAmount, setHarmonicAmount] = useState(0.5);
  const [sampleRate, setSampleRate] = useState(48000);
  const [workletsLoaded, setWorkletsLoaded] = useState(false);
  const [audioSampleRate, setAudioSampleRate] = useState(44100);
  const [audioLookahead, setAudioLookahead] = useState(25);
  const [audioBufferSize, setAudioBufferSize] = useState(256);

  // ── UI state ──
  const [selectedTrackIndex, setSelectedTrackIndex] = useState(0);
  const [newTrackType, setNewTrackType] = useState("audio");
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [metronomeOn, setMetronomeOn] = useState(false);
  const [countIn, setCountIn] = useState(false);
  const [inputDevices, setInputDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState("default");
  const [inputLevel, setInputLevel] = useState(0);
  const [status, setStatus] = useState("Ready");
  const [saving, setSaving] = useState(false);
  const [showAudioSettings, setShowAudioSettings] = useState(false);
  const [mixingDown, setMixingDown] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportSettings, setExportSettings] = useState({ format:"wav", sampleRate:44100, bitDepth:16, mode:"mixdown", selectedTracks:[], filename:"", includeVideo:false });
  const [videoFile, setVideoFile] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);
  const [activeEffectsTrack, setActiveEffectsTrack] = useState(null);
  const [insertPickerState, setInsertPickerState] = useState(null);
  const [openFxKey, setOpenFxKey] = useState(null);
  const [micSimStream, setMicSimStream] = useState(null);
  const [showMicBuilder, setShowMicBuilder] = useState(false);
  const [showVocalModal, setShowVocalModal] = useState(false);
  const [showMicSimModal, setShowMicSimModal] = useState(false);
  const [customMicProfiles, setCustomMicProfiles] = useState([]);
  const [meterLevels, setMeterLevels] = useState([]);
  const [masterMeterLevels, setMasterMeterLevels] = useState({ left: 0, right: 0, peak: 0 });
  const [pianoRollNotes, setPianoRollNotes] = useState([]);
  const pianoRollStepInputRef = useRef(null);
  const [pianoRollKey, setPianoRollKey] = useState("C");
  const [pianoRollScale, setPianoRollScale] = useState("major");
  const [selectedTrack, setSelectedTrack] = useState(0);
  const [selectedChannels, setSelectedChannels] = useState(new Set());
  const [channelCtxMenu, setChannelCtxMenu] = useState(null);
  const [showTakeLanes, setShowTakeLanes] = useState(false);
  const [takeLanesTrackIndex, setTakeLanesTrackIndex] = useState(null);
  const [showSaveAsModal, setShowSaveAsModal] = useState(false);
  const [saveAsData, setSaveAsData] = useState(null);
  const [editingRegion, setEditingRegion] = useState(null);
  const [cycleEnabled, setCycleEnabled] = useState(false);
  const [cycleStart, setCycleStart] = useState(0);
  const [cycleEnd, setCycleEnd] = useState(8);
  const [midiLearnMode, setMidiLearnMode] = useState(false);
  const [midiMappings, setMidiMappings] = useState([]);
  const [showSampleLibrary, setShowSampleLibrary] = useState(false);
  const [showPluginRack, setShowPluginRack] = useState(false);
  const [showMidiMapping, setShowMidiMapping] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(() => !localStorage.getItem("spx_onboarded"));
  const [chords, setChords] = useState([]);
  const [takes, setTakes] = useState([]);
  const [activeTake, setActiveTake] = useState(null);
  const [pluginRackTrack, setPluginRackTrack] = useState(null);
  const [trackPlugins, setTrackPlugins] = useState({});
  const [chordsList, setChordsList] = useState([]);
  const [showAddTrackDialog, setShowAddTrackDialog] = useState(false);

  // ── Audio refs ──
  const audioCtxRef = useRef(null);
  const masterGainRef = useRef(null);
  const masterPanRef = useRef(null);
  const masterAnalyserLRef = useRef(null);
  const masterAnalyserRRef = useRef(null);
  const trackSourcesRef = useRef([]);
  const trackGainsRef = useRef([]);
  const trackPansRef = useRef([]);
  const trackAnalysersRef = useRef([]);
  const meterAnimRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const chunksRef = useRef([]);
  const playStartRef = useRef(0);
  const playOffsetRef = useRef(0);
  const spxEngineRef = useRef(null);
  const metroRef = useRef(null);
  const timeRef = useRef(null);
  const canvasRefs = useRef([]);
  const inputAnalyserRef = useRef(null);
  const inputAnimRef = useRef(null);
  const trackNodesRef = useRef(new Map());
  const tapTimesRef = useRef([]);
  const loopCheckRef = useRef(null);
  const midiMappingsRef = useRef(new Map());
  const midiLearnRef = useRef(null);

  const motionAudioUrl = tracks?.[selectedTrack]?.audio_url || tracks?.find(t => t?.audio_url)?.audio_url || null;
  const dbToGain = (db) => Math.pow(10, db / 20);
  const hasSolo = tracks.some(t => t.solo);
  const isAudible = (t) => !t.muted && (!hasSolo || t.solo);
  const playheadBeat = useMemo(() => secondsToBeat(currentTime, bpm), [currentTime, bpm]);

  // ── Sync refs ──
  useEffect(() => { trackConsoleCharRef.current = trackConsoleChar; }, [trackConsoleChar]);
  useEffect(() => { masterConsoleCharRef.current = masterConsoleChar; }, [masterConsoleChar]);
  useEffect(() => { setWamPlugins(getInstalledWAMPlugins() || []); }, []);

  // ── Monitor EQ sync ──
  useEffect(() => {
    const nodes = monitorNodesRef.current;
    if (!nodes || !audioCtxRef.current) return;
    const eq = MONITOR_EQ[monitorSpeaker] || MONITOR_EQ.flat;
    const t = audioCtxRef.current.currentTime;
    nodes.lo.gain.setTargetAtTime(eq.low, t, 0.02);
    nodes.loMid.gain.setTargetAtTime(eq.lowMid, t, 0.02);
    nodes.hiMid.gain.setTargetAtTime(eq.highMid, t, 0.02);
    nodes.hi.gain.setTargetAtTime(eq.high, t, 0.02);
    nodes.gain.gain.setTargetAtTime(Math.pow(10, (eq.gain || 0) / 20), t, 0.02);
  }, [monitorSpeaker]);

  // ── Collab ──
  const collab = useDAWCollaboration({
    projectId: projectId || null, user: null, tracks, setTracks,
    bpm, setBpm, timeSignature, setTimeSignature, isEnabled: true,
    onStatus: (msg) => console.log("[Collab]", msg),
  });

  // ── Instrument engine ──
  const getTrackInputNode = useCallback((trackIndex) => {
    const track = tracks[trackIndex]; if (!track) return null;
    const nodes = ensureTrackGraph(track); if (!nodes) return null;
    return nodes.input;
  }, [tracks]);

  const instrumentEngine = useInstrumentTrackEngine(audioCtxRef, tracks, {
    bpm, isPlaying, isRecording, playheadBeat, masterGainRef, getTrackInputNode,
    onNotesRecorded: (notes) => {
      const armedIdx = tracks.findIndex(t => t.armed && (t.trackType === "midi" || t.trackType === "instrument"));
      if (armedIdx === -1 || !notes.length) return;
      const region = createMidiRegionFromNotes(notes, "MIDI Recording");
      setTracks(prev => prev.map((t, i) => i === armedIdx ? { ...t, regions: [...(t.regions || []), region] } : t));
      setStatus(`✓ Recorded ${notes.length} MIDI notes → Track ${armedIdx + 1}`);
    },
  });

  // ── Init ──
  useEffect(() => {
    navigator.mediaDevices.enumerateDevices()
      .then(d => setInputDevices(d.filter(x => x.kind === "audioinput")))
      .catch(console.error);
    return () => { stopEverything(); if (audioCtxRef.current) audioCtxRef.current.close(); };
  }, []);

  // ── Console character helper ──
  const setStereoPan = (panNode, pan) => {
    if (!audioCtxRef.current) return;
    try { panNode.pan.setTargetAtTime(pan, audioCtxRef.current.currentTime, 0.01); }
    catch { panNode.pan.value = pan; }
  };

  const buildSatCurve = (wsNode, drive = 1.2, asymmetric = false) => {
    const N = 44100; const curve = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const x = (i * 2) / N - 1;
      curve[i] = asymmetric
        ? (x > 0 ? x / (1 + drive * 0.8 * Math.abs(x)) : x / (1 + drive * 1.2 * Math.abs(x)))
        : Math.tanh(x * drive) / Math.tanh(drive);
    }
    wsNode.curve = curve; wsNode.oversample = "4x";
  };

  const applyConsoleCharacter = (ctx, inputNode, outputNode, boardId) => {
    if (!boardId || boardId === "none") { inputNode.connect(outputNode); return [inputNode]; }
    const configs = {
      ssl4ke:    [18, 0.5, 1.2, false, 200, -0.8, 10000, 1.2, 1.1,  false, 0.98],
      ssl4kg:    [15, 0.4, 1.1, false, 160, -0.5, 12000, 0.8, 1.05, false, 0.99],
      neve8078:  [30, 0.7, 1.6, true,  250, 1.5,  8000,  -0.5,1.4,  true,  0.95],
      neve1073:  [50, 0.8, 1.8, true,  300, 2.0,  6000,  -0.8,1.6,  true,  0.93],
      api1604:   [20, 0.6, 1.3, false, 100, 0.5,  5000,  1.0, 1.25, false, 0.97],
      tridentA:  [25, 0.5, 1.4, true,  180, 1.0,  9000,  0.6, 1.3,  true,  0.96],
      studer900: [22, 0.4, 1.05,false, 120, -0.3, 15000, 0.3, 1.02, false, 1.0 ],
      mciJH636:  [28, 0.6, 1.5, true,  220, 1.2,  7500,  0.8, 1.35, true,  0.96],
      // ── New consoles ──
      ssl9000:   [12, 0.4, 1.15,false, 140, -0.3, 14000, 1.0, 1.1,  false, 0.99],  // SSL 9000 — modern pop/hip-hop
      neve8068:  [35, 0.7, 1.7, true,  280, 1.8,  7500,  -0.6,1.45, true,  0.94],  // Neve 8068 — slightly darker 8078
      api2488:   [22, 0.5, 1.35,false, 110, 0.8,  4800,  1.2, 1.3,  false, 0.97],  // API 2488 — more headroom
      helios69:  [40, 0.8, 1.9, true,  350, 2.5,  6000,  -1.0,1.5,  true,  0.92],  // Helios Type 69 — dark British
      neveVR:    [20, 0.5, 1.45,true,  200, 1.2,  9000,  0.2, 1.3,  true,  0.96],  // Neve VR — 80s/90s warm
      emiTG:     [45, 0.9, 2.0, true,  400, 3.0,  5500,  -1.5,1.6,  true,  0.90],  // EMI TG12345 — Abbey Road
      sslAWS:    [10, 0.3, 1.1, false, 130, -0.2, 16000, 0.6, 1.05, false, 1.0 ],  // SSL AWS — hybrid clean
      amekAngela:[32, 0.6, 1.55,true,  240, 1.6,  8500,  -0.3,1.4,  true,  0.95],  // Amek Angela — Neve designed
      harrison:  [8,  0.3, 1.05,false, 100, 0.2,  18000, 0.4, 1.02, false, 1.0 ],  // Harrison 4032 — very clean
      neve8014:  [60, 1.0, 2.1, true,  500, 3.5,  5000,  -2.0,1.7,  true,  0.88],  // Neve 8014 — vintage dark
      sonyMXP:   [14, 0.4, 1.2, false, 180, 0.3,  13000, 0.8, 1.1,  false, 0.98],  // Sony MXP-3000 — smooth highs
      calrec:    [16, 0.4, 1.15,false, 150, -0.1, 15000, 0.5, 1.08, false, 0.99],  // Calrec — broadcast clean
    };
    const c = configs[boardId];
    if (!c) { inputNode.connect(outputNode); return [inputNode]; }
    const inputSat = ctx.createWaveShaper(), inputHp = ctx.createBiquadFilter();
    const eqLo = ctx.createBiquadFilter(), eqHi = ctx.createBiquadFilter();
    const outputSat = ctx.createWaveShaper(), outputGain = ctx.createGain();
    inputHp.type = "highpass"; inputHp.frequency.value = c[0]; inputHp.Q.value = c[1];
    buildSatCurve(inputSat, c[2], c[3]);
    eqLo.type = "lowshelf";  eqLo.frequency.value = c[4];  eqLo.gain.value = c[5];
    eqHi.type = "highshelf"; eqHi.frequency.value = c[6];  eqHi.gain.value = c[7];
    buildSatCurve(outputSat, c[8], c[9]);
    outputGain.gain.value = c[10];
    inputNode.connect(inputHp); inputHp.connect(inputSat); inputSat.connect(eqLo);
    eqLo.connect(eqHi); eqHi.connect(outputSat); outputSat.connect(outputGain);
    outputGain.connect(outputNode);
    return [inputHp, inputSat, eqLo, eqHi, outputSat, outputGain];
  };

  const buildFxChain = (ctx, track) => {
    const nodes = []; const fx = track.effects;
    if (fx.eq?.enabled) {
      const lo = ctx.createBiquadFilter(); lo.type = "lowshelf";  lo.frequency.value = 320;         lo.gain.value = fx.eq.lowGain;
      const mi = ctx.createBiquadFilter(); mi.type = "peaking";   mi.frequency.value = fx.eq.midFreq; mi.Q.value = 1.5; mi.gain.value = fx.eq.midGain;
      const hi = ctx.createBiquadFilter(); hi.type = "highshelf"; hi.frequency.value = 3200;         hi.gain.value = fx.eq.highGain;
      nodes.push(lo, mi, hi);
    }
    if (fx.filter?.enabled)      { const f = ctx.createBiquadFilter(); f.type = fx.filter.type; f.frequency.value = fx.filter.frequency; f.Q.value = fx.filter.Q; nodes.push(f); }
    if (fx.compressor?.enabled)  { const c = ctx.createDynamicsCompressor(); c.threshold.value = fx.compressor.threshold; c.ratio.value = fx.compressor.ratio; c.attack.value = fx.compressor.attack; c.release.value = fx.compressor.release; nodes.push(c); }
    if (fx.distortion?.enabled && fx.distortion.amount > 0) { const ws = ctx.createWaveShaper(); const amt = fx.distortion.amount; const curve = new Float32Array(44100); for (let i = 0; i < 44100; i++) { const x = (i * 2) / 44100 - 1; curve[i] = ((3 + amt) * x * 20 * (Math.PI / 180)) / (Math.PI + amt * Math.abs(x)); } ws.curve = curve; ws.oversample = "4x"; nodes.push(ws); }
    if (fx.limiter?.enabled)     { const lim = ctx.createDynamicsCompressor(); lim.threshold.value = fx.limiter.threshold; lim.knee.value = fx.limiter.knee; lim.ratio.value = fx.limiter.ratio; lim.attack.value = fx.limiter.attack; lim.release.value = fx.limiter.release; nodes.push(lim); }
    if (fx.gate?.enabled)        { const gt = ctx.createDynamicsCompressor(); gt.threshold.value = fx.gate.threshold; gt.ratio.value = 20; gt.knee.value = 0; gt.attack.value = fx.gate.attack; gt.release.value = fx.gate.release; nodes.push(gt); }
    if (fx.deesser?.enabled)     { const bp = ctx.createBiquadFilter(); bp.type = "peaking"; bp.frequency.value = fx.deesser.frequency; bp.Q.value = 4; bp.gain.value = -Math.abs(fx.deesser.threshold); nodes.push(bp); }
    if (fx.chorus?.enabled)      { const cd = ctx.createDelay(0.05); cd.delayTime.value = fx.chorus.depth; const cLfo = ctx.createOscillator(); const cLfoG = ctx.createGain(); cLfo.frequency.value = fx.chorus.rate; cLfoG.gain.value = fx.chorus.depth * 0.5; cLfo.connect(cLfoG); cLfoG.connect(cd.delayTime); cLfo.start(); nodes.push(cd); }
    if (fx.flanger?.enabled)     { const fd = ctx.createDelay(0.02); fd.delayTime.value = fx.flanger.depth; const fLfo = ctx.createOscillator(); const fLfoG = ctx.createGain(); fLfo.frequency.value = fx.flanger.rate; fLfoG.gain.value = fx.flanger.depth * 0.5; fLfo.connect(fLfoG); fLfoG.connect(fd.delayTime); fLfo.start(); nodes.push(fd); }
    if (fx.phaser?.enabled)      { for (let s = 0; s < (fx.phaser.stages || 4); s++) { const ap = ctx.createBiquadFilter(); ap.type = "allpass"; ap.frequency.value = fx.phaser.baseFreq * (1 + s * 0.5); ap.Q.value = fx.phaser.Q; nodes.push(ap); } }
    if (fx.tremolo?.enabled)     { const tGain = ctx.createGain(); tGain.gain.value = 1 - fx.tremolo.depth * 0.5; const tLfo = ctx.createOscillator(); const tLfoG = ctx.createGain(); tLfo.frequency.value = fx.tremolo.rate; tLfoG.gain.value = fx.tremolo.depth * 0.5; tLfo.connect(tLfoG); tLfoG.connect(tGain.gain); tLfo.start(); nodes.push(tGain); }
    if (fx.bitcrusher?.enabled)  { const bws = ctx.createWaveShaper(); const steps = Math.pow(2, fx.bitcrusher.bits || 8); const bcurve = new Float32Array(44100); for (let i = 0; i < 44100; i++) { const x = (i * 2) / 44100 - 1; bcurve[i] = Math.round(x * steps) / steps; } bws.curve = bcurve; nodes.push(bws); }
    if (fx.exciter?.enabled)     { const ehpf = ctx.createBiquadFilter(); ehpf.type = "highpass"; ehpf.frequency.value = fx.exciter.frequency; const ews = ctx.createWaveShaper(); const ecurve = new Float32Array(44100); for (let i = 0; i < 44100; i++) { const x = (i * 2) / 44100 - 1; ecurve[i] = x + (fx.exciter.amount / 100) * Math.sin(x * Math.PI); } ews.curve = ecurve; nodes.push(ehpf, ews); }
    if (fx.tapeSaturation?.enabled) { const tws = ctx.createWaveShaper(); const drv = fx.tapeSaturation.drive || 0.3; const tcurve = new Float32Array(44100); for (let i = 0; i < 44100; i++) { const x = (i * 2) / 44100 - 1; tcurve[i] = Math.tanh(x * (1 + drv * 5)); } tws.curve = tcurve; tws.oversample = "4x"; const tlp = ctx.createBiquadFilter(); tlp.type = "lowpass"; tlp.frequency.value = 12000 - fx.tapeSaturation.warmth * 6000; nodes.push(tws, tlp); }
    if (fx.gainUtility?.enabled) { const ug = ctx.createGain(); ug.gain.value = Math.pow(10, (fx.gainUtility.gain || 0) / 20) * (fx.gainUtility.phaseInvert ? -1 : 1); nodes.push(ug); }
    return nodes;
  };

  const buildSends = (ctx, track, dry, master) => {
    if (!track.effects) return;
    const fx = track.effects;
    if (fx.reverb?.enabled && fx.reverb.mix > 0) { const conv = ctx.createConvolver(); conv.buffer = getReverbBuf(ctx, fx.reverb.decay); const g = ctx.createGain(); g.gain.value = fx.reverb.mix; dry.connect(conv); conv.connect(g); g.connect(master); }
    if (fx.delay?.enabled && fx.delay.mix > 0)   { const d = ctx.createDelay(5); d.delayTime.value = fx.delay.time; const fb = ctx.createGain(); fb.gain.value = fx.delay.feedback; const mx = ctx.createGain(); mx.gain.value = fx.delay.mix; dry.connect(d); d.connect(fb); fb.connect(d); d.connect(mx); mx.connect(master); }
  };

  // ── Room simulation configs ──
  const ROOM_CONFIGS = {
    none:       null,
    studio_a:   { decay: 0.4, preDelay: 0.008, lowCut: 80,  highCut: 16000, wet: 0.12, name: "Studio A — Dry Control Room" },
    abbey_road: { decay: 1.2, preDelay: 0.015, lowCut: 60,  highCut: 14000, wet: 0.20, name: "Abbey Road Studio 2" },
    power_sta:  { decay: 0.8, preDelay: 0.010, lowCut: 70,  highCut: 15000, wet: 0.15, name: "Power Station NYC" },
    electric:   { decay: 1.8, preDelay: 0.020, lowCut: 50,  highCut: 12000, wet: 0.25, name: "Electric Lady NYC" },
    mdm_studio: { decay: 0.6, preDelay: 0.012, lowCut: 75,  highCut: 15500, wet: 0.14, name: "MDM Studios LA" },
  };

  const SPEAKER_EQ_CONFIGS = {
    flat:      { low: 0,   lowMid: 0,  highMid: 0,  high: 0,  gain: 0  },
    ns10:      { low: -3,  lowMid: 3,  highMid: 4,  high: -3, gain: 0  },
    auratone:  { low: -10, lowMid: 5,  highMid: 2,  high: -7, gain: 3  },
    genelec:   { low: 1,   lowMid: 0,  highMid: 1,  high: 2,  gain: 0  },
    krk:       { low: 4,   lowMid: -1, highMid: 1,  high: 3,  gain: -1 },
    adam:      { low: 0,   lowMid: 0,  highMid: 2,  high: 5,  gain: 0  },
    focal:     { low: 1,   lowMid: 1,  highMid: 0,  high: 1,  gain: 0  },
    avantone:  { low: -9,  lowMid: 4,  highMid: 3,  high: -6, gain: 3  },
    iphone:    { low: -10, lowMid: 3,  highMid: 5,  high: -4, gain: 4  },
    car:       { low: 4,   lowMid: -2, highMid: 2,  high: -1, gain: -1 },
    club:      { low: 6,   lowMid: -1, highMid: 0,  high: 2,  gain: -3 },
    macbook:   { low: -8,  lowMid: 1,  highMid: 3,  high: -3, gain: 3  },
    airpods:   { low: -2,  lowMid: 1,  highMid: 4,  high: 6,  gain: 1  },
  };

  const applyMonitorChain = useCallback((ctx, inputNode) => {
    if (!ctx) return inputNode;
    // Disconnect previous monitor nodes
    if (monitorNodeRef.current) {
      try { monitorNodeRef.current.disconnect(); } catch(e) {}
    }
    const masterOut = ctx.createGain();
    masterOut.gain.value = 1;
    let last = inputNode;

    // Mono check
    if (monoCheck) {
      const merger = ctx.createChannelMerger(2);
      const splitter = ctx.createChannelSplitter(2);
      const monoGain = ctx.createGain();
      last.connect(splitter);
      splitter.connect(monoGain, 0);
      splitter.connect(monoGain, 1);
      monoGain.connect(merger, 0, 0);
      monoGain.connect(merger, 0, 1);
      last = merger;
    }

    // Speaker EQ simulation
    const eq = SPEAKER_EQ_CONFIGS[monitorSpeaker];
    if (eq && monitorSpeaker !== 'flat') {
      const lowShelf = ctx.createBiquadFilter();
      lowShelf.type = 'lowshelf'; lowShelf.frequency.value = 200; lowShelf.gain.value = eq.low;
      const lowMid = ctx.createBiquadFilter();
      lowMid.type = 'peaking'; lowMid.frequency.value = 500; lowMid.Q.value = 1; lowMid.gain.value = eq.lowMid;
      const highMid = ctx.createBiquadFilter();
      highMid.type = 'peaking'; highMid.frequency.value = 3000; highMid.Q.value = 1; highMid.gain.value = eq.highMid;
      const highShelf = ctx.createBiquadFilter();
      highShelf.type = 'highshelf'; highShelf.frequency.value = 8000; highShelf.gain.value = eq.high;
      const gainNode = ctx.createGain(); gainNode.gain.value = Math.pow(10, (eq.gain||0)/20);
      last.connect(lowShelf); lowShelf.connect(lowMid); lowMid.connect(highMid);
      highMid.connect(highShelf); highShelf.connect(gainNode);
      last = gainNode;
    }

    // Room simulation
    const room = ROOM_CONFIGS[roomSim];
    if (room) {
      const conv = ctx.createConvolver();
      const len = Math.ceil(ctx.sampleRate * room.decay);
      const ir = ctx.createBuffer(2, len, ctx.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const d = ir.getChannelData(ch);
        for (let i = 0; i < len; i++) {
          const env = Math.exp(-i / (ctx.sampleRate * room.decay * 0.5));
          d[i] = (Math.random() * 2 - 1) * env * (ch === 0 ? 1 : 0.97);
        }
      }
      conv.buffer = ir;
      const wet = ctx.createGain(); wet.gain.value = room.wet;
      const dry = ctx.createGain(); dry.gain.value = 1 - room.wet * 0.5;
      const mix = ctx.createGain();
      last.connect(dry); dry.connect(mix);
      last.connect(conv); conv.connect(wet); wet.connect(mix);
      last = mix;
    }

    last.connect(masterOut);
    monitorNodeRef.current = masterOut;
    return masterOut;
  }, [monitorSpeaker, monoCheck, roomSim]);

  // ── Binaural headphone correction ──
  React.useEffect(() => {
    const ctx = audioCtxRef.current;
    const nodes = monitorNodesRef.current;
    if (!ctx || !nodes) return;
    if (binauralOn) {
      // HRTF-style processing: slight all-pass filter + cross-feed for headphone correction
      // Cross-feed reduces ear fatigue on headphones by adding small delay between channels
      const xfeedDelay = ctx.createDelay(0.03);
      xfeedDelay.delayTime.value = 0.0003; // 0.3ms cross-feed delay
      const xfeedGain = ctx.createGain();
      xfeedGain.gain.value = 0.15; // 15% cross-feed
      // HP correction: slight presence boost + bass rolloff
      nodes.hi.gain.setTargetAtTime(2.0, ctx.currentTime, 0.05);
      nodes.lo.gain.setTargetAtTime(-1.5, ctx.currentTime, 0.05);
    } else {
      // Reset to speaker EQ values
      const eq = SPEAKER_EQ_CONFIGS[monitorSpeaker] || { low:0, high:0 };
      nodes.hi.gain.setTargetAtTime(eq.high, ctx.currentTime, 0.05);
      nodes.lo.gain.setTargetAtTime(eq.low, ctx.currentTime, 0.05);
    }
  }, [binauralOn]);

  // ── Apply monitor chain whenever settings change ──
  React.useEffect(() => {
    const ctx = audioCtxRef.current;
    const nodes = monitorNodesRef.current;
    if (!ctx || !nodes) return;

    // Update speaker EQ
    const eq = SPEAKER_EQ_CONFIGS[monitorSpeaker] || { low:0, lowMid:0, highMid:0, high:0, gain:0 };
    nodes.lo.gain.setTargetAtTime(eq.low, ctx.currentTime, 0.02);
    nodes.loMid.gain.setTargetAtTime(eq.lowMid, ctx.currentTime, 0.02);
    nodes.hiMid.gain.setTargetAtTime(eq.highMid, ctx.currentTime, 0.02);
    nodes.hi.gain.setTargetAtTime(eq.high, ctx.currentTime, 0.02);
    nodes.gain.gain.setTargetAtTime(Math.pow(10,(eq.gain||0)/20), ctx.currentTime, 0.02);
  }, [monitorSpeaker]);

  // ── LUFS meter — poll analyser every 200ms ──
  React.useEffect(() => {
    if (lufsIntervalRef.current) clearInterval(lufsIntervalRef.current);
    lufsIntervalRef.current = setInterval(() => {
      const analyser = masterAnalyserLRef.current;
      if (!analyser) return;
      const buf = new Float32Array(analyser.fftSize);
      analyser.getFloatTimeDomainData(buf);
      let rms = 0;
      for (let i = 0; i < buf.length; i++) rms += buf[i] * buf[i];
      rms = Math.sqrt(rms / buf.length);
      const lufs = rms > 0 ? Math.max(-60, 20 * Math.log10(rms) - 0.691) : -60;
      setLufsValue(Math.round(lufs * 10) / 10);
    }, 200);
    return () => clearInterval(lufsIntervalRef.current);
  }, []);

  // ── A/B Reference — load + toggle ──
  const loadAbReference = useCallback(async (file) => {
    const ctx = audioCtxRef.current;
    if (!ctx || !file) return;
    const ab = await file.arrayBuffer();
    const buffer = await ctx.decodeAudioData(ab);
    setAbRefBuffer(buffer);
  }, []);

  const toggleAbRef = useCallback(() => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    if (abRef) {
      // Turn off — stop reference
      if (abRefSourceRef.current) { try { abRefSourceRef.current.stop(); } catch(e) {} abRefSourceRef.current = null; }
      setAbRef(false);
    } else if (abRefBuffer) {
      // Turn on — play reference through monitor chain
      const src = ctx.createBufferSource();
      src.buffer = abRefBuffer;
      src.loop = true;
      const gain = ctx.createGain(); gain.gain.value = 0.8;
      abRefGainRef.current = gain;
      src.connect(gain);
      gain.connect(monitorNodesRef.current?.lo || ctx.destination);
      src.start(0);
      abRefSourceRef.current = src;
      setAbRef(true);
    }
  }, [abRef, abRefBuffer]);

  // ── Mono check — collapse stereo to mono ──
  React.useEffect(() => {
    const ctx = audioCtxRef.current;
    const nodes = monitorNodesRef.current;
    if (!ctx || !nodes) return;
    // Mono is handled by gain node trick — set both channels equal
    if (monoCheck) {
      nodes.gain.channelCount = 1;
      nodes.gain.channelCountMode = 'explicit';
      nodes.gain.channelInterpretation = 'discrete';
    } else {
      nodes.gain.channelCount = 2;
      nodes.gain.channelCountMode = 'max';
      nodes.gain.channelInterpretation = 'speakers';
    }
  }, [monoCheck]);

  const getReverbBuf = useCallback((ctx, decay = 2) => {
    const len = ctx.sampleRate * decay; const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = buf.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay); }
    return buf;
  }, []);

  const applyTrackToNodes = (track, nodes) => {
    if (!audioCtxRef.current) return;
    nodes.preGain.gain.setTargetAtTime(track.muted ? 0 : 1, audioCtxRef.current.currentTime, 0.01);
    nodes.fader.gain.setTargetAtTime(dbToGain(track.volumeDb ?? 0), audioCtxRef.current.currentTime, 0.01);
    setStereoPan(nodes.panNode, track.pan ?? 0);
  };

  const ensureTrackGraph = (track) => {
    const ctx = audioCtxRef.current;
    if (!ctx || !masterGainRef.current) return null;
    if (trackNodesRef.current.has(track.id)) return trackNodesRef.current.get(track.id);
    const input = ctx.createGain(), preGain = ctx.createGain();
    const panNode = ctx.createStereoPanner(), fader = ctx.createGain();
    const meter = ctx.createAnalyser(); meter.fftSize = 2048;
    const fxNodes = (track.effects && Object.keys(track.effects).length) ? buildFxChain(ctx, track) : [];
    let last = preGain;
    fxNodes.forEach(n => { last.connect(n); last = n; });
    last.connect(panNode); panNode.connect(fader); fader.connect(meter);
    const boardId = trackConsoleChar[track.id] || "none";
    const consoleOut = ctx.createGain();
    applyConsoleCharacter(ctx, meter, consoleOut, boardId);
    const busTrack = track.busTarget ? tracks.find(t => t.id === track.busTarget) : null;
    const busNodes = busTrack ? trackNodesRef.current.get(busTrack.id) : null;
    const dest = (busNodes && busNodes.input) ? busNodes.input : masterGainRef.current;
    consoleOut.connect(dest);
    buildSends(ctx, track, fader, dest);
    input.connect(preGain);
    const nodes = { input, preGain, panNode, fader, meter, fxNodes, dest };
    trackNodesRef.current.set(track.id, nodes);
    applyTrackToNodes(track, nodes);
    return nodes;
  };

  const ensureBusGraph = (busTrack) => {
    const ctx = audioCtxRef.current;
    if (!ctx || !masterGainRef.current) return null;
    if (trackNodesRef.current.has(busTrack.id)) return trackNodesRef.current.get(busTrack.id);
    const input = ctx.createGain(), preGain = ctx.createGain();
    const panNode = ctx.createStereoPanner(), fader = ctx.createGain();
    const meter = ctx.createAnalyser(); meter.fftSize = 2048;
    const fxNodes = (busTrack.effects && Object.keys(busTrack.effects).length) ? buildFxChain(ctx, busTrack) : [];
    let last = preGain;
    fxNodes.forEach(n => { last.connect(n); last = n; });
    last.connect(panNode); panNode.connect(fader); fader.connect(meter);
    const busConsoleOut = ctx.createGain();
    applyConsoleCharacter(ctx, meter, busConsoleOut, trackConsoleChar[busTrack?.id] || "none");
    busConsoleOut.connect(masterGainRef.current);
    input.connect(preGain);
    const nodes = { input, preGain, panNode, fader, meter, fxNodes, isBus: true };
    trackNodesRef.current.set(busTrack.id, nodes);
    applyTrackToNodes(busTrack, nodes);
    return nodes;
  };

  const rebuildTrackGraph = (trackId) => {
    const ctx = audioCtxRef.current; if (!ctx) return;
    const track = tracks.find(t => t.id === trackId); if (!track) return;
    const old = trackNodesRef.current.get(trackId);
    if (old) {
      ["input","preGain","panNode","fader","meter"].forEach(k => { try { old[k].disconnect(); } catch (_) {} });
      (old.fxNodes || []).forEach(n => { try { n.disconnect(); } catch (_) {} });
    }
    trackNodesRef.current.delete(trackId);
    ensureTrackGraph(track);
  };

  useEffect(() => { if (masterGainRef.current) masterGainRef.current.gain.value = masterVolume; }, [masterVolume]);
  useEffect(() => {
    if (masterPanRef.current) {
      try { masterPanRef.current.pan.setTargetAtTime(masterPan, audioCtxRef.current?.currentTime || 0, 0.01); }
      catch { masterPanRef.current.pan.value = masterPan; }
    }
  }, [masterPan]);

  useEffect(() => {
    if (!audioCtxRef.current || !masterGainRef.current) return;
    tracks.filter(t => t.trackType === "bus" || t.trackType === "aux").forEach(t => ensureBusGraph(t));
    tracks.filter(t => t.trackType !== "bus" && t.trackType !== "aux").forEach(t => ensureTrackGraph(t));
  }, [tracks]);

  const getCtx = useCallback(() => {
    if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
      const ctx = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: "interactive", sampleRate });
      audioCtxRef.current = ctx;
      loadAllWorklets(ctx).then(r => { setWorkletsLoaded(true); console.log("[SPX] Worklets:", r.loaded); }).catch(e => console.warn("[SPX] Worklet error:", e));
      masterGainRef.current = ctx.createGain(); masterGainRef.current.gain.value = masterVolume;
      masterPanRef.current = ctx.createStereoPanner(); masterPanRef.current.pan.value = masterPan;
      const splitter = ctx.createChannelSplitter(2);
      masterAnalyserLRef.current = ctx.createAnalyser(); masterAnalyserLRef.current.fftSize = 2048; masterAnalyserLRef.current.smoothingTimeConstant = 0.88;
      masterAnalyserRRef.current = ctx.createAnalyser(); masterAnalyserRRef.current.fftSize = 2048; masterAnalyserRRef.current.smoothingTimeConstant = 0.88;
      const masterConsoleOutNode = ctx.createGain(); masterConsoleOutRef.current = masterConsoleOutNode;
      applyConsoleCharacter(ctx, masterGainRef.current, masterConsoleOutNode, masterConsoleChar || "none");
      if (masterConsoleChar && masterConsoleChar !== "none") masterConsoleOutNode.connect(masterPanRef.current);
      else masterGainRef.current.connect(masterPanRef.current);
      masterPanRef.current.connect(splitter);
      splitter.connect(masterAnalyserLRef.current, 0); splitter.connect(masterAnalyserRRef.current, 1);
      const monLo = ctx.createBiquadFilter(); monLo.type = "lowshelf"; monLo.frequency.value = 200;
      const monLoMid = ctx.createBiquadFilter(); monLoMid.type = "peaking"; monLoMid.frequency.value = 500; monLoMid.Q.value = 1;
      const monHiMid = ctx.createBiquadFilter(); monHiMid.type = "peaking"; monHiMid.frequency.value = 3000; monHiMid.Q.value = 1;
      const monHi = ctx.createBiquadFilter(); monHi.type = "highshelf"; monHi.frequency.value = 8000;
      const monGain = ctx.createGain();
      monLo.connect(monLoMid); monLoMid.connect(monHiMid); monHiMid.connect(monHi); monHi.connect(monGain); monGain.connect(ctx.destination);
      masterPanRef.current.connect(monLo);
      monitorNodesRef.current = { lo: monLo, loMid: monLoMid, hiMid: monHiMid, hi: monHi, gain: monGain };
      if (!spxEngineRef.current) {
        const engine = AudioEngine.getInstance();
        if (!engine.context || engine.context.state === "closed") {
          engine.context = ctx; engine._buildMasterBus().catch(console.warn);
          engine._loadWorklets().catch(console.warn); engine._startScheduler();
        }
        spxEngineRef.current = engine;
      }
    }
    if (audioCtxRef.current.state === "suspended") audioCtxRef.current.resume();
    return audioCtxRef.current;
  }, [masterVolume, masterPan]);

  // ── Meter animation ──
  const startMeterAnimation = useCallback(() => {
    if (meterAnimRef.current) cancelAnimationFrame(meterAnimRef.current);
    const animate = () => {
      const analysers = trackAnalysersRef.current;
      if (analysers && analysers.length > 0) {
        const levels = analysers.map(pair => {
          if (!pair || !pair.left || !pair.right) return { left: 0, right: 0, peak: 0 };
          const dataL = new Float32Array(pair.left.fftSize); pair.left.getFloatTimeDomainData(dataL);
          const left = Math.min(1.5, Math.sqrt(dataL.reduce((a, b) => a + b * b, 0) / dataL.length) * 6);
          const dataR = new Float32Array(pair.right.fftSize); pair.right.getFloatTimeDomainData(dataR);
          const right = Math.min(1.5, Math.sqrt(dataR.reduce((a, b) => a + b * b, 0) / dataR.length) * 6);
          return { left, right, peak: Math.max(left, right) };
        });
        setMeterLevels(levels);
      } else setMeterLevels([]);
      if (masterAnalyserLRef.current && masterAnalyserRRef.current) {
        const bL = new Float32Array(masterAnalyserLRef.current.fftSize); masterAnalyserLRef.current.getFloatTimeDomainData(bL);
        const mL = Math.min(1.5, Math.sqrt(bL.reduce((a, b) => a + b * b, 0) / bL.length) * 6);
        const bR = new Float32Array(masterAnalyserRRef.current.fftSize); masterAnalyserRRef.current.getFloatTimeDomainData(bR);
        const mR = Math.min(1.5, Math.sqrt(bR.reduce((a, b) => a + b * b, 0) / bR.length) * 6);
        setMasterMeterLevels({ left: mL, right: mR, peak: Math.max(mL, mR) });
      }
      meterAnimRef.current = requestAnimationFrame(animate);
    };
    meterAnimRef.current = requestAnimationFrame(animate);
  }, []);

  const stopMeterAnimation = useCallback(() => {
    if (meterAnimRef.current) { cancelAnimationFrame(meterAnimRef.current); meterAnimRef.current = null; }
    setMeterLevels([]); setMasterMeterLevels({ left: 0, right: 0, peak: 0 });
  }, []);

  // ── Metronome ──
  const startMetronome = (ctx) => {
    if (metroRef.current) { clearInterval(metroRef.current); metroRef.current = null; }
    const beats = timeSignature && timeSignature[0] ? timeSignature[0] : 4;
    const iv = (60 / bpm) * 1000; let beat = 0;
    const click = (isDownbeat) => {
      try {
        if (!ctx || ctx.state === "closed") return;
        const o = ctx.createOscillator(); const g = ctx.createGain();
        o.frequency.value = isDownbeat ? 1000 : 800;
        g.gain.setValueAtTime(0.35, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
        o.connect(g); g.connect(ctx.destination); o.start(ctx.currentTime); o.stop(ctx.currentTime + 0.06);
      } catch (e) {}
    };
    click(true);
    metroRef.current = setInterval(() => { beat = (beat + 1) % beats; click(beat === 0); }, iv);
  };

  const stopMetronome = () => { if (metroRef.current) { clearInterval(metroRef.current); metroRef.current = null; } };

  const playCountIn = (ctx) => new Promise(res => {
    const iv = (60 / bpm) * 1000; let c = 0;
    const click = () => {
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.frequency.value = c === 0 ? 1200 : 1000; g.gain.value = 0.5;
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
      o.connect(g); g.connect(ctx.destination); o.start(ctx.currentTime); o.stop(ctx.currentTime + 0.06);
    };
    click();
    const id = setInterval(() => { c++; if (c >= (timeSignature && timeSignature[0] ? timeSignature[0] : 4)) { clearInterval(id); res(); } else click(); }, iv);
  });

  // ── Playback ──
  const startLoopCheck = useCallback(() => {
    if (loopCheckRef.current) cancelAnimationFrame(loopCheckRef.current);
    const check = () => {
      if (!cycleEnabled || !isPlaying) { loopCheckRef.current = null; return; }
      const beatNow = playOffsetRef.current + (audioCtxRef.current ? (audioCtxRef.current.currentTime - playStartRef.current) * (bpm / 60) : 0);
      if (beatNow >= cycleEnd) {
        playOffsetRef.current = cycleStart; playStartRef.current = audioCtxRef.current?.currentTime || 0;
        setCurrentTime(cycleStart * (60 / bpm));
      }
      loopCheckRef.current = requestAnimationFrame(check);
    };
    loopCheckRef.current = requestAnimationFrame(check);
  }, [cycleEnabled, cycleStart, cycleEnd, bpm, isPlaying]);

  useEffect(() => {
    if (isPlaying && cycleEnabled) startLoopCheck();
    else if (loopCheckRef.current) { cancelAnimationFrame(loopCheckRef.current); loopCheckRef.current = null; }
  }, [isPlaying, cycleEnabled, startLoopCheck]);

  const startPlayback = (overdub = false) => {
    const ctx = getCtx();
    trackSourcesRef.current.forEach(s => { try { s.stop(); } catch {} });
    trackSourcesRef.current = []; trackGainsRef.current = []; trackPansRef.current = []; trackAnalysersRef.current = [];
    let maxDur = 0;
    tracks.forEach((t, i) => {
      if (!t.audioBuffer) { trackAnalysersRef.current[i] = null; return; }
      const s = ctx.createBufferSource(); s.buffer = t.audioBuffer;
      const g = ctx.createGain(); g.gain.value = isAudible(t) ? t.volume : 0;
      const p = ctx.createStereoPanner(); p.pan.value = t.pan;
      const splitter = ctx.createChannelSplitter(2);
      const analyserL = ctx.createAnalyser(); analyserL.fftSize = 2048; analyserL.smoothingTimeConstant = 0.88;
      const analyserR = ctx.createAnalyser(); analyserR.fftSize = 2048; analyserR.smoothingTimeConstant = 0.88;
      const fxNodes = (t.effects && Object.keys(t.effects).length) ? buildFxChain(ctx, t) : []; let last = s;
      fxNodes.forEach(n => { last.connect(n); last = n; });
      last.connect(g); g.connect(p); p.connect(splitter);
      splitter.connect(analyserL, 0); splitter.connect(analyserR, 1);
      p.connect(masterGainRef.current); if (t.effects) buildSends(ctx, t, p, masterGainRef.current);
      s.start(0, playOffsetRef.current);
      trackSourcesRef.current[i] = s; trackGainsRef.current[i] = g; trackPansRef.current[i] = p;
      trackAnalysersRef.current[i] = { left: analyserL, right: analyserR };
      if (t.audioBuffer.duration > maxDur) maxDur = t.audioBuffer.duration;
    });
    setDuration(maxDur); playStartRef.current = ctx.currentTime; setIsPlaying(true);
    if (metronomeOn) startMetronome(ctx);
    startMeterAnimation();
    timeRef.current = setInterval(() => {
      if (!audioCtxRef.current) return;
      const el = audioCtxRef.current.currentTime - playStartRef.current + playOffsetRef.current;
      setCurrentTime(el);
      if (el >= maxDur && maxDur > 0 && !overdub) stopPlayback();
    }, 50);
    if (!overdub) setStatus("▶ Playing");
  };

  const stopPlayback = () => {
    trackSourcesRef.current.forEach(s => { try { s.stop(); } catch {} });
    trackSourcesRef.current = [];
    if (!metronomeOn && metroRef.current) { clearInterval(metroRef.current); metroRef.current = null; }
    if (timeRef.current) clearInterval(timeRef.current);
    stopMeterAnimation(); trackAnalysersRef.current = []; setIsPlaying(false);
    if (!isRecording) { playOffsetRef.current = currentTime; setStatus("■ Stopped"); }
  };

  const rewind = () => { if (isPlaying) stopPlayback(); playOffsetRef.current = 0; setCurrentTime(0); };

  const fmt = (s) => { const m = Math.floor(s / 60), sec = Math.floor(s % 60), ms = Math.floor((s % 1) * 100); return `${m}:${String(sec).padStart(2, "0")}.${String(ms).padStart(2, "0")}`; };

  // ── Region helpers ──
  const createRegionFromRecording = (trackIndex, audioBuffer, audioUrl) => {
    const regionId = `rgn_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const startBeat = secondsToBeat(playOffsetRef.current, bpm);
    const durationBeat = secondsToBeat(audioBuffer.duration, bpm);
    setTracks(prev => prev.map((t, i) => i === trackIndex ? { ...t, regions: [...(t.regions || []), { id: regionId, name: tracks[trackIndex]?.name || `Track ${trackIndex + 1}`, startBeat, duration: durationBeat, audioUrl, color: tracks[trackIndex]?.color || TRACK_COLORS[trackIndex % TRACK_COLORS.length], loopEnabled: false, loopCount: 1 }] } : t));
  };

  const createRegionFromImport = (trackIndex, audioBuffer, name, audioUrl) => {
    const regionId = `rgn_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const durationBeat = secondsToBeat(audioBuffer.duration, bpm);
    setTracks(prev => prev.map((t, i) => i === trackIndex ? { ...t, regions: [...(t.regions || []), { id: regionId, name: name || `Import ${trackIndex + 1}`, startBeat: 0, duration: durationBeat, audioUrl, color: t.color || TRACK_COLORS[trackIndex % TRACK_COLORS.length], loopEnabled: false, loopCount: 1 }] } : t));
  };

  const uploadTrack = async (blob, ti) => {
    if (!projectId) return;
    try {
      const tok = localStorage.getItem("token") || sessionStorage.getItem("token");
      const bu = process.env.REACT_APP_BACKEND_URL || "";
      const fd = new FormData(); fd.append("file", blob, `track_${ti}.webm`); fd.append("project_id", projectId); fd.append("track_index", ti);
      await fetch(`${bu}/api/studio/tracks/upload`, { method: "POST", headers: { Authorization: `Bearer ${tok}` }, body: fd });
    } catch (e) { console.error(e); }
  };

  // ── Recording ──
  const startRecording = async () => {
    const ai = tracks.findIndex(t => t.armed);
    if (ai === -1) { setStatus("⚠ Arm a track"); return; }
    try {
      const ctx = getCtx();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { deviceId: selectedDevice !== "default" ? { exact: selectedDevice } : undefined, echoCancellation: false, noiseSuppression: false, autoGainControl: false, sampleRate: 44100 } });
      mediaStreamRef.current = stream; setMicSimStream(stream);
      const src = ctx.createMediaStreamSource(stream); inputAnalyserRef.current = ctx.createAnalyser(); inputAnalyserRef.current.fftSize = 256; src.connect(inputAnalyserRef.current);
      const mon = () => { if (!inputAnalyserRef.current) return; const d = new Uint8Array(inputAnalyserRef.current.frequencyBinCount); inputAnalyserRef.current.getByteFrequencyData(d); setInputLevel(d.reduce((a, b) => a + b, 0) / d.length / 255); inputAnimRef.current = requestAnimationFrame(mon); }; mon();
      if (countIn) { setStatus("Count in..."); await playCountIn(ctx); }
      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "audio/webm";
      const rec = new MediaRecorder(stream, { mimeType: mime }); chunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      rec.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: mime }); const ab = await blob.arrayBuffer();
        const buf = await ctx.decodeAudioData(ab); const audioUrl = URL.createObjectURL(blob);
        updateTrack(ai, { audioBuffer: buf, audio_url: audioUrl }); createRegionFromRecording(ai, buf, audioUrl);
        await uploadTrack(blob, ai); setStatus("✓ Recorded");
      };
      mediaRecorderRef.current = rec; rec.start(100); startPlayback(true); setIsRecording(true); setStatus(`● REC Track ${ai + 1}`);
    } catch (e) { setStatus(`✗ Mic: ${e.message}`); }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") mediaRecorderRef.current.stop();
    if (mediaStreamRef.current) { mediaStreamRef.current.getTracks().forEach(t => t.stop()); mediaStreamRef.current = null; }
    if (inputAnimRef.current) cancelAnimationFrame(inputAnimRef.current);
    setMicSimStream(null); setInputLevel(0); setIsRecording(false); stopPlayback();
  };

  const stopEverything = () => {
    stopRecording(); stopPlayback(); stopMetronome(); setMetronomeOn(false);
    playOffsetRef.current = 0; setCurrentTime(0);
  };

  // ── Track CRUD ──
  const updateTrack = useCallback((i, u) => setTracks(p => p.map((t, idx) => idx === i ? { ...t, ...u } : t)), []);
  const updateEffect = (ti, fx, param, val) => setTracks(p => p.map((t, i) => i !== ti ? t : { ...t, effects: { ...t.effects, [fx]: { ...t.effects[fx], [param]: val } } }));

  const addTrack = () => {
    if (tracks.length >= maxTracks) { setStatus(`⚠ ${userTier} tier limit: ${maxTracks} tracks.`); return; }
    const i = tracks.length;
    setTracks(prev => [...prev, DEFAULT_TRACK(i, newTrackType)]);
    setSelectedTrackIndex(i);
    setStatus(`Track ${i + 1} added`);
  };

  const removeTrack = (idx) => {
    if (tracks.length <= 1) { setStatus("⚠ Must have at least 1 track"); return; }
    setTracks(prev => prev.filter((_, i) => i !== idx));
    if (activeEffectsTrack === idx) setActiveEffectsTrack(null);
    else if (activeEffectsTrack > idx) setActiveEffectsTrack(activeEffectsTrack - 1);
    setSelectedTrackIndex(prev => { const nl = tracks.length - 1; if (prev === idx) return Math.max(0, idx - 1); if (prev > idx) return prev - 1; return Math.min(prev, nl - 1); });
    setStatus(`Track ${idx + 1} removed`);
  };

  // ── Waveform draw ──
  const drawWaveform = useCallback((el, buf, color) => {
    if (!el || !buf) return;
    const c = el.getContext("2d"), w = el.width, h = el.height, data = buf.getChannelData(0), step = Math.ceil(data.length / w), mid = h / 2;
    c.clearRect(0, 0, w, h);
    c.strokeStyle = "rgba(255,255,255,0.06)"; c.lineWidth = 1; c.beginPath(); c.moveTo(0, mid); c.lineTo(w, mid); c.stroke();
    c.fillStyle = color + "40"; c.beginPath(); c.moveTo(0, mid);
    for (let i = 0; i < w; i++) { let mx = -1; for (let j = 0; j < step; j++) { const d = data[i * step + j]; if (d !== undefined && d > mx) mx = d; } c.lineTo(i, mid - mx * mid * 0.9); }
    for (let i = w - 1; i >= 0; i--) { let mn = 1; for (let j = 0; j < step; j++) { const d = data[i * step + j]; if (d !== undefined && d < mn) mn = d; } c.lineTo(i, mid - mn * mid * 0.9); }
    c.closePath(); c.fill();
    c.strokeStyle = color; c.lineWidth = 0.8; c.beginPath();
    for (let i = 0; i < w; i++) { let mx = -1; for (let j = 0; j < step; j++) { const d = data[i * step + j]; if (d !== undefined && d > mx) mx = d; } const y = mid - mx * mid * 0.9; i === 0 ? c.moveTo(i, y) : c.lineTo(i, y); }
    c.stroke();
  }, []);

  useEffect(() => { tracks.forEach((t, i) => { if (t.audioBuffer && canvasRefs.current[i]) drawWaveform(canvasRefs.current[i], t.audioBuffer, t.color); }); }, [tracks, drawWaveform]);

  // ── Import ──
  const handleImport = async (ti) => {
    const inp = document.createElement("input"); inp.type = "file"; inp.accept = "audio/*";
    inp.onchange = async (e) => {
      const f = e.target.files?.[0]; if (!f) return; setStatus("Importing...");
      try {
        const ctx = getCtx(); const ab = await f.arrayBuffer(); const buf = await ctx.decodeAudioData(ab);
        const name = f.name.replace(/\.[^/.]+$/, "").substring(0, 20); const audioUrl = URL.createObjectURL(f);
        try {
          const ch = buf.getChannelData(0); const sr = buf.sampleRate; const step = Math.floor(sr * 0.01);
          const peaks = []; for (let s = 0; s < ch.length - step; s += step) { let r = 0; for (let k = 0; k < step; k++) r += ch[s+k]*ch[s+k]; peaks.push(Math.sqrt(r/step)); }
          const avg = peaks.reduce((a,b)=>a+b,0)/peaks.length; const thr = avg * 1.5;
          const beats = []; let last = -1;
          for (let i = 1; i < peaks.length-1; i++) { if (peaks[i]>thr && peaks[i]>peaks[i-1] && peaks[i]>peaks[i+1] && (i-last)>20) { beats.push(i*0.01); last=i; } }
          if (beats.length > 3) { const intervals = beats.slice(1).map((b,i)=>b-beats[i]); const avgInt = intervals.reduce((a,b)=>a+b,0)/intervals.length; const det = Math.round(60/avgInt); if (det>=60&&det<=200) { setBpm(det); setStatus('♩ BPM: '+det+' from "'+name+'"'); } }
        } catch(e) {}
        updateTrack(ti, { audioBuffer: buf, audio_url: audioUrl, name }); createRegionFromImport(ti, buf, name, audioUrl);
        setStatus(`✓ Track ${ti + 1}`);
      } catch (err) { setStatus(`✗ ${err.message}`); }
    };
    inp.click();
  };

  const clearTrack = (ti) => { updateTrack(ti, { audioBuffer: null, audio_url: null, armed: false, regions: [] }); setStatus(`Track ${ti + 1} cleared`); };

  const recreateAudioContext = useCallback(async (bufferSize, sampleRate) => {
    if (audioCtxRef.current && audioCtxRef.current.state !== "closed") await audioCtxRef.current.close();
    const hint = bufferSize <= 128 ? "interactive" : bufferSize <= 512 ? "balanced" : "playback";
    audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: hint, sampleRate });
    setAudioBufferSize(bufferSize); setAudioSampleRate(sampleRate);
    const ms = Math.round((audioCtxRef.current.baseLatency + (audioCtxRef.current.outputLatency || 0)) * 1000);
    setLatencyMs(ms); setStatus(`✓ Audio engine restarted — ${sampleRate}Hz, ~${ms}ms latency`);
  }, []);

  const tapTempo = useCallback(() => {
    const now = performance.now();
    tapTimesRef.current = [...tapTimesRef.current, now].slice(-6);
    if (tapTimesRef.current.length < 2) { setStatus("Tap tempo…"); return; }
    const diffs = []; for (let i = 1; i < tapTimesRef.current.length; i++) diffs.push(tapTimesRef.current[i] - tapTimesRef.current[i - 1]);
    const newBpm = clamp(Math.round(60000 / (diffs.reduce((a, b) => a + b, 0) / diffs.length)), 40, 240);
    setBpm(newBpm); setStatus(`✓ BPM: ${newBpm}`);
  }, []);

  const seekToBeat = useCallback((beat) => {
    const secs = beatToSeconds(beat, bpm); if (isPlaying) stopPlayback();
    playOffsetRef.current = secs; setCurrentTime(secs);
  }, [bpm, isPlaying]);

  const detectBPM = async (audioBuffer) => {
    try {
      const data = audioBuffer.getChannelData(0), sr = audioBuffer.sampleRate;
      const win = Math.floor(sr * 0.01), energy = [];
      for (let i = 0; i < data.length - win; i += win) { let e = 0; for (let j = 0; j < win; j++) e += data[i + j] * data[i + j]; energy.push(e / win); }
      const avg = energy.reduce((a, b) => a + b, 0) / energy.length, thresh = avg * 1.6;
      const beats = []; let last = 0, minGap = Math.floor(sr * 0.01 * 0.25 / win);
      for (let i = 1; i < energy.length; i++) if (energy[i] > thresh && energy[i] > energy[i - 1] && (i - last) > minGap) { beats.push(i * win / sr); last = i; }
      if (beats.length < 4) return null;
      const ints = []; for (let i = 1; i < Math.min(beats.length, 32); i++) ints.push(beats[i] - beats[i - 1]);
      const avgInt = ints.reduce((a, b) => a + b, 0) / ints.length, raw = Math.round(60 / avgInt);
      if (raw >= 60 && raw <= 200) return raw; if (raw >= 30 && raw < 60) return raw * 2; if (raw > 200) return Math.round(raw / 2);
      return null;
    } catch (_) { return null; }
  };

  const loadAudioBuffer = async (url, ti) => {
    try {
      const ctx = getCtx(); const r = await fetch(url); const ab = await r.arrayBuffer();
      const buf = await ctx.decodeAudioData(ab); updateTrack(ti, { audioBuffer: buf, audio_url: url });
      detectBPM(buf).then(det => { if (det && Math.abs(det - bpm) > 5) window.confirm(`Detected BPM: ${det} — set project to ${det}?`) && setBpm(det); });
      return buf;
    } catch (e) { console.error(e); return null; }
  };

  const toggleMonitoring = useCallback((trackIndex) => {
    const ctx = audioCtxRef?.current; if (!ctx) return;
    if (monitoringEnabled) { monitorGainRef.current?.disconnect(); monitorGainRef.current = null; setMonitoringEnabled(false); setStatus("Direct monitoring OFF"); return; }
    navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false, latency: 0 } }).then(stream => {
      const src = ctx.createMediaStreamSource(stream); const gain = ctx.createGain(); gain.gain.value = 0.8;
      const delay = ctx.createDelay(0.5); delay.delayTime.value = Math.max(0, latencyCompMs / 1000);
      src.connect(delay); delay.connect(gain); gain.connect(ctx.destination);
      monitorGainRef.current = gain; setMonitoringEnabled(true);
      const ms = Math.round(((ctx.baseLatency || 0) + (ctx.outputLatency || 0)) * 1000); setLatencyMs(ms); setStatus(`Direct monitoring ON — ${ms}ms`);
    }).catch(e => setStatus("Monitoring error: " + e.message));
  }, [monitoringEnabled, latencyCompMs]);


// ═══ RS_part3.js ═══
// =============================================================================
// RecordingStudio.js — Part 3/4
// Save/Load · Mixdown · Freeze · Piano roll · AI handlers · Menu actions
// =============================================================================

  // ── Autosave ──
  useEffect(() => {
    if (!projectId) return;
    const interval = setInterval(() => { if (!saving) { saveProject(); setStatus("✓ Auto-saved"); } }, 60000);
    return () => clearInterval(interval);
  }, [projectId, saving]);

  // ── Save ──
  const saveProject = async () => {
    setSaving(true); setStatus("Saving...");
    try {
      const tok = localStorage.getItem("token") || sessionStorage.getItem("token");
      const bu = process.env.REACT_APP_BACKEND_URL || "";
      const td = tracks.map(t => ({ name: t.name, volume: t.volume, pan: t.pan, muted: t.muted, solo: t.solo, effects: t.effects, color: t.color, trackType: t.trackType, instrument: t.instrument, regions: (t.regions || []).map(r => ({ ...r, audioUrl: null })), audio_url: typeof t.audio_url === "string" && !t.audio_url.startsWith("blob:") ? t.audio_url : null }));
      const method = projectId ? "PUT" : "POST";
      const url = projectId ? `${bu}/api/studio/projects/${projectId}` : `${bu}/api/studio/projects`;
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json", Authorization: `Bearer ${tok}` }, body: JSON.stringify({ name: projectName, bpm, time_signature: `${timeSignature[0]}/${timeSignature[1]}`, tracks: td, master_volume: masterVolume, master_pan: masterPan, piano_roll_notes: pianoRollNotes, piano_roll_key: pianoRollKey, piano_roll_scale: pianoRollScale, automation, cycle_start: cycleStart, cycle_end: cycleEnd, cycle_enabled: cycleEnabled }) });
      const data = await res.json();
      if (data?.success) { setProjectId(data.project.id); setStatus("✓ Saved"); }
      else setStatus("✗ Save failed");
    } catch (e) { setStatus("✗ Save failed"); }
    finally { setSaving(false); }
  };

  const loadProject = async (pid) => {
    try {
      const tok = localStorage.getItem("token") || sessionStorage.getItem("token");
      const bu = process.env.REACT_APP_BACKEND_URL || "";
      const res = await fetch(`${bu}/api/studio/projects/${pid}`, { headers: { Authorization: `Bearer ${tok}` } });
      const data = await res.json();
      if (data?.success) {
        const p = data.project;
        setProjectId(p.id); setProjectName(p.name); setBpm(p.bpm); setMasterVolume(p.master_volume || 0.8); setMasterPan(p.master_pan || 0);
        if (p.time_signature) { const ts = p.time_signature.split("/").map(Number); if (ts.length === 2) setTimeSignature(ts); }
        if (p.piano_roll_notes) setPianoRollNotes(p.piano_roll_notes);
        if (p.piano_roll_key) setPianoRollKey(p.piano_roll_key);
        if (p.piano_roll_scale) setPianoRollScale(p.piano_roll_scale);
        if (p.automation) setAutomation(p.automation);
        if (p.cycle_start != null) setCycleStart(p.cycle_start);
        if (p.cycle_end != null) setCycleEnd(p.cycle_end);
        if (p.cycle_enabled != null) setCycleEnabled(p.cycle_enabled);
        const trackCount = Math.min(Math.max(p.tracks?.length || 1, 1), maxTracks);
        const loaded = Array.from({ length: trackCount }, (_, i) => ({ ...DEFAULT_TRACK(i), ...(p.tracks[i] || {}), audioBuffer: null, effects: p.tracks[i]?.effects || DEFAULT_EFFECTS(), regions: p.tracks[i]?.regions || [] }));
        setTracks(loaded); setSelectedTrackIndex(0);
        for (let i = 0; i < loaded.length; i++) if (loaded[i].audio_url) await loadAudioBuffer(loaded[i].audio_url, i);
        setShowProjectList(false); setStatus(`Loaded: ${p.name}`);
      }
    } catch (e) { setStatus("✗ Load failed"); }
  };

  const loadProjectList = async () => {
    try {
      const tok = localStorage.getItem("token") || sessionStorage.getItem("token");
      const bu = process.env.REACT_APP_BACKEND_URL || "";
      const res = await fetch(`${bu}/api/studio/projects`, { headers: { Authorization: `Bearer ${tok}` } });
      const data = await res.json();
      if (data?.success) { setProjects(data.projects || []); setShowProjectList(true); }
    } catch (e) { console.error(e); }
  };

  const newProject = () => {
    stopEverything(); setProjectId(null); setProjectName("Untitled Project"); setBpm(120); setMasterVolume(0.8); setMasterPan(0);
    setActiveEffectsTrack(null); setTimeSignature([4, 4]); setTracks(Array.from({ length: 1 }, (_, i) => DEFAULT_TRACK(i)));
    setSelectedTrackIndex(0); setPianoRollNotes([]); setPianoRollKey("C"); setPianoRollScale("major");
    setEditingRegion(null); setStatus("New project"); setViewMode("arrange");
  };

  // ── Mixdown ──
  const mixDownProject = async () => {
    if (!tracks.some(t => t.audioBuffer)) { setStatus("⚠ No audio to bounce"); return; }
    setMixingDown(true); setStatus("⏳ Bouncing to WAV...");
    try {
      const sr = 44100, maxDur = Math.max(...tracks.map(t => t.audioBuffer?.duration ?? 0), 0.5);
      const offCtx = new OfflineAudioContext(2, Math.ceil(sr * (maxDur + 1)), sr);
      const master = offCtx.createGain(); master.gain.value = masterVolume ?? 1; master.connect(offCtx.destination);
      tracks.forEach(t => {
        if (!t.audioBuffer || t.muted) return;
        if (tracks.some(x => x.solo) && !t.solo) return;
        const src = offCtx.createBufferSource(); src.buffer = t.audioBuffer;
        const g = offCtx.createGain(); g.gain.value = t.volume ?? 0.8;
        const pan = offCtx.createStereoPanner(); pan.pan.value = t.pan ?? 0;
        let last = src; const fxLocal = t.effects ?? {};
        if (fxLocal.eq?.enabled) { const lo = offCtx.createBiquadFilter(); lo.type = "lowshelf"; lo.frequency.value = 200; lo.gain.value = fxLocal.eq.lowGain ?? 0; const mi = offCtx.createBiquadFilter(); mi.type = "peaking"; mi.frequency.value = 1000; mi.Q.value = 1; mi.gain.value = fxLocal.eq.midGain ?? 0; const hi = offCtx.createBiquadFilter(); hi.type = "highshelf"; hi.frequency.value = 8000; hi.gain.value = fxLocal.eq.highGain ?? 0; last.connect(lo); lo.connect(mi); mi.connect(hi); last = hi; }
        if (fxLocal.compressor?.enabled) { const c = offCtx.createDynamicsCompressor(); c.threshold.value = fxLocal.compressor.threshold ?? -24; c.ratio.value = fxLocal.compressor.ratio ?? 4; c.attack.value = (fxLocal.compressor.attack ?? 10) / 1000; c.release.value = (fxLocal.compressor.release ?? 100) / 1000; last.connect(c); last = c; }
        last.connect(g); g.connect(pan); pan.connect(master); src.start(t.startTime ?? 0);
      });
      const buf = await offCtx.startRendering();
      const nc = buf.numberOfChannels, len = buf.length * nc * 2, ab = new ArrayBuffer(44 + len), view = new DataView(ab);
      const ws = (o, s) => { for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i)); };
      ws(0, "RIFF"); view.setUint32(4, 36 + len, true); ws(8, "WAVE"); ws(12, "fmt ");
      view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, nc, true);
      view.setUint32(24, sr, true); view.setUint32(28, sr * nc * 2, true); view.setUint16(32, nc * 2, true);
      view.setUint16(34, 16, true); ws(36, "data"); view.setUint32(40, len, true);
      let off = 44; for (let i = 0; i < buf.length; i++) for (let ch = 0; ch < nc; ch++) { const s = Math.max(-1, Math.min(1, buf.getChannelData(ch)[i])); view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7FFF, true); off += 2; }
      const blob = new Blob([ab], { type: "audio/wav" }); const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `${(projectName ?? "project").replace(/\s+/g, "_")}_mix.wav`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a); setTimeout(() => URL.revokeObjectURL(url), 8000);
      setStatus(`✓ Bounced: ${a.download}`);
    } catch (e) { setStatus(`✗ Bounce failed: ${e.message}`); }
    setMixingDown(false);
  };

  // ── Export Stems ──
  const exportStems = async (trackIndices) => {
    const toExport = trackIndices.length ? tracks.filter((_,i)=>trackIndices.includes(i)) : tracks.filter(t=>t.audioBuffer);
    if (!toExport.length) { setStatus("No audio to export"); return; }
    setMixingDown(true);
    for (const t of toExport) {
      if (!t.audioBuffer) continue;
      try {
        const sr = 44100;
        const offCtx = new OfflineAudioContext(2, Math.ceil(sr*(t.audioBuffer.duration+0.5)), sr);
        const src = offCtx.createBufferSource(); src.buffer = t.audioBuffer;
        const g = offCtx.createGain(); g.gain.value = t.volume??1;
        const pan = offCtx.createStereoPanner(); pan.pan.value = t.pan??0;
        src.connect(g); g.connect(pan); pan.connect(offCtx.destination); src.start(0);
        const buf = await offCtx.startRendering();
        const nc=buf.numberOfChannels, len=buf.length*nc*2, ab=new ArrayBuffer(44+len), view=new DataView(ab);
        const ws=(o,s)=>{for(let i=0;i<s.length;i++)view.setUint8(o+i,s.charCodeAt(i));};
        ws(0,"RIFF");view.setUint32(4,36+len,true);ws(8,"WAVE");ws(12,"fmt ");
        view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,nc,true);
        view.setUint32(24,sr,true);view.setUint32(28,sr*nc*2,true);view.setUint16(32,nc*2,true);
        view.setUint16(34,16,true);ws(36,"data");view.setUint32(40,len,true);
        let off=44; for(let i=0;i<buf.length;i++) for(let ch=0;ch<nc;ch++){const s=Math.max(-1,Math.min(1,buf.getChannelData(ch)[i]));view.setInt16(off,s<0?s*0x8000:s*0x7FFF,true);off+=2;}
        const blob=new Blob([ab],{type:"audio/wav"});const url=URL.createObjectURL(blob);
        const a=document.createElement("a");a.href=url;a.download=`${(t.name||"track").replace(/\s+/g,"_")}_stem.wav`;
        document.body.appendChild(a);a.click();document.body.removeChild(a);
        setTimeout(()=>URL.revokeObjectURL(url),5000);
        setStatus(`✓ Exported: ${a.download}`);
      } catch(e) { setStatus(`✗ Stem export failed: ${e.message}`); }
    }
    setMixingDown(false);
    setStatus(`✓ All stems exported`);
  };

  // ── Import Video ──
  const handleImportVideo = () => {
    const inp = document.createElement("input");
    inp.type = "file"; inp.accept = "video/*";
    inp.onchange = e => {
      const f = e.target.files[0]; if (!f) return;
      const url = URL.createObjectURL(f);
      setVideoFile(f); setVideoUrl(url);
      setStatus(`Video loaded: ${f.name}`);
    };
    inp.click();
  };

  // ── Freeze ──
  const freezeTrack = async (ti) => {
    const t = tracks[ti]; if (!t?.audioBuffer) { setStatus(`⚠ Track ${ti + 1} has no audio`); return; }
    if (t.frozen) { setStatus(`Track ${ti + 1} already frozen`); return; }
    setStatus(`⏳ Freezing Track ${ti + 1}...`);
    try {
      const sr = audioCtxRef.current?.sampleRate || 48000;
      const offCtx = new OfflineAudioContext(2, Math.ceil(sr * (t.audioBuffer.duration + 0.5)), sr);
      const src = offCtx.createBufferSource(); src.buffer = t.audioBuffer;
      const g = offCtx.createGain(); g.gain.value = t.volume ?? 0.8;
      const pan = offCtx.createStereoPanner(); pan.pan.value = t.pan ?? 0;
      src.connect(g); g.connect(pan); pan.connect(offCtx.destination); src.start(0);
      const rendered = await offCtx.startRendering();
      updateTrack(ti, { audioBuffer: rendered, frozenBuffer: t.audioBuffer, frozenEffects: JSON.parse(JSON.stringify(t.effects)), frozen: true, name: (t.name ?? `Track ${ti + 1}`) + "  ❄" });
      setStatus(`✓ Track ${ti + 1} frozen`);
    } catch (e) { setStatus(`✗ Freeze failed: ${e.message}`); }
  };

  const unfreezeTrack = (ti) => {
    const t = tracks[ti]; if (!t?.frozen || !t?.frozenBuffer) { setStatus(`Track ${ti + 1} is not frozen`); return; }
    updateTrack(ti, { audioBuffer: t.frozenBuffer, frozenBuffer: null, effects: t.frozenEffects ?? t.effects, frozen: false, name: (t.name ?? "").replace("  ❄", "") });
    setStatus(`✓ Track ${ti + 1} unfrozen`);
  };

  // ── Piano roll ──
  const handlePianoRollExport = useCallback((renderedBuffer, blob) => {
    let t = tracks.findIndex(t => !t.audioBuffer);
    if (t === -1 && tracks.length < maxTracks) { t = tracks.length; setTracks(prev => [...prev, DEFAULT_TRACK(prev.length)]); }
    if (t === -1) { setStatus("⚠ No empty tracks."); return; }
    if (renderedBuffer) { const audioUrl = URL.createObjectURL(blob); updateTrack(t, { audioBuffer: renderedBuffer, audio_url: audioUrl, name: "Piano Roll Export" }); createRegionFromImport(t, renderedBuffer, "Piano Roll Export", audioUrl); setStatus(`✓ Piano Roll → Track ${t + 1}`); setViewMode("arrange"); }
  }, [tracks, maxTracks, updateTrack]);

  const handleBeatExport = useCallback((renderedBuffer, blob) => {
    let t = tracks.findIndex(t => !t.audioBuffer);
    if (t === -1 && tracks.length < maxTracks) { t = tracks.length; setTracks(prev => [...prev, DEFAULT_TRACK(prev.length)]); }
    if (t === -1) { setStatus("⚠ No empty tracks."); return; }
    if (renderedBuffer) { const audioUrl = URL.createObjectURL(blob); updateTrack(t, { audioBuffer: renderedBuffer, audio_url: audioUrl, name: "Beat Export" }); createRegionFromImport(t, renderedBuffer, "Beat Export", audioUrl); setStatus(`✓ Beat → Track ${t + 1}`); setViewMode("arrange"); }
  }, [tracks, maxTracks, updateTrack]);

  const handlePianoRollNotesChange = useCallback((notes) => setPianoRollNotes(notes), []);
  const handleChordInsert = useCallback((chordNotes) => { if (chordNotes?.length) { setPianoRollNotes(prev => [...prev, ...chordNotes]); setStatus(`✓ ${chordNotes.length} chord notes inserted`); } }, []);
  const handleChordKeyChange = useCallback((key, scale) => { setPianoRollKey(key); setPianoRollScale(scale); }, []);

  const exportMidiFile = useCallback(() => {
    if (!pianoRollNotes?.length) { setStatus("⚠ No piano roll notes"); return; }
    try {
      const bytes = midiFromNotes({ notes: pianoRollNotes, bpm, ppq: 480 });
      const blob = new Blob([bytes], { type: "audio/midi" }); const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `${projectName.replace(/\s+/g, "_") || "project"}_pianoroll.mid`; a.click();
      URL.revokeObjectURL(url); setStatus("✓ MIDI exported");
    } catch (e) { setStatus("✗ MIDI export failed"); }
  }, [pianoRollNotes, bpm, projectName]);

  const savePianoRollToRegion = useCallback(() => {
    if (!editingRegion) return;
    const { trackIndex, regionId } = editingRegion;
    setTracks(prev => prev.map((t, i) => {
      if (i !== trackIndex) return t;
      return { ...t, regions: (t.regions || []).map(r => {
        if (r.id !== regionId) return r;
        const relativeNotes = pianoRollNotes.map(n => ({ ...n, startBeat: n.startBeat - r.startBeat }));
        const maxEnd = Math.max(...relativeNotes.map(n => n.startBeat + n.duration), 0);
        return { ...r, notes: relativeNotes, duration: Math.max(maxEnd, r.duration) };
      }) };
    }));
    setEditingRegion(null); setStatus("✓ Piano Roll edits saved");
  }, [editingRegion, pianoRollNotes]);

  useEffect(() => { if (viewMode !== "pianoroll" && editingRegion) savePianoRollToRegion(); }, [viewMode, editingRegion, savePianoRollToRegion]);

  const onOpenPianoRoll = useCallback((trackIdx, regionId) => {
    const track = tracks[trackIdx]; const region = (track?.regions || []).find(r => r.id === regionId); if (!region) return;
    setEditingRegion({ trackIndex: trackIdx, regionId });
    setPianoRollNotes(region.notes.map(n => ({ ...n, startBeat: n.startBeat + region.startBeat })));
    setViewMode("pianoroll");
  }, [tracks]);

  const handleTimelineDoubleClick = useCallback((e, trackIndex) => {
    const track = tracks[trackIndex];
    if (track.trackType === "midi" || track.trackType === "instrument") {
      const newRegion = createMidiRegion(playheadBeat, timeSignature[0], `MIDI ${trackIndex + 1}`);
      setTracks(prev => { const next = [...prev]; next[trackIndex] = { ...next[trackIndex], regions: [...(next[trackIndex].regions || []), newRegion] }; return next; });
    }
  }, [tracks, playheadBeat, timeSignature]);

  // ── AI handlers ──
  const handleAIApplyVolume   = useCallback((trackIndex, value) => { updateTrack(trackIndex, { volume: value }); if (trackGainsRef.current[trackIndex]) trackGainsRef.current[trackIndex].gain.value = value; setStatus(`AI: Track ${trackIndex + 1} vol → ${Math.round(value * 100)}%`); }, [updateTrack]);
  const handleAIApplyPan      = useCallback((trackIndex, value) => { updateTrack(trackIndex, { pan: value }); if (trackPansRef.current[trackIndex]) trackPansRef.current[trackIndex].pan.value = value; setStatus(`AI: Track ${trackIndex + 1} pan`); }, [updateTrack]);
  const handleAIApplyEQ       = useCallback((trackIndex, eqSuggestion) => { const updates = {}; if (eqSuggestion.frequency < 400) updates.lowGain = eqSuggestion.gain_db; else if (eqSuggestion.frequency < 3000) { updates.midGain = eqSuggestion.gain_db; updates.midFreq = eqSuggestion.frequency; } else updates.highGain = eqSuggestion.gain_db; setTracks(prev => prev.map((t, i) => i !== trackIndex ? t : { ...t, effects: { ...t.effects, eq: { ...t.effects.eq, ...updates, enabled: true } } })); setStatus(`AI: Track ${trackIndex + 1} EQ adjusted`); }, []);
  const handleAIApplyCompression = useCallback((trackIndex, comp) => { setTracks(prev => prev.map((t, i) => i !== trackIndex ? t : { ...t, effects: { ...t.effects, compressor: { threshold: comp.suggested_threshold || -20, ratio: comp.suggested_ratio || 4, attack: (comp.suggested_attack_ms || 10) / 1000, release: (comp.suggested_release_ms || 100) / 1000, enabled: true } } })); setStatus(`AI: Track ${trackIndex + 1} compressor applied`); }, []);
  const handleAIBeatApply     = useCallback((patternData) => { setStatus(`✓ AI Beat: ${patternData.genre} @ ${patternData.bpm} BPM`); }, []);

  const handleApplyVocalFx = useCallback((fxSettings) => {
    const idx = tracks.findIndex(t => t.armed); const targetIdx = idx !== -1 ? idx : selectedTrackIndex;
    setTracks(prev => prev.map((t, i) => { if (i !== targetIdx) return t; return { ...t, effects: { ...t.effects, eq: { ...t.effects.eq, ...(fxSettings.eq || {}), enabled: fxSettings.eq?.enabled ?? t.effects.eq.enabled }, compressor: { ...t.effects.compressor, ...(fxSettings.compressor || {}), enabled: fxSettings.compressor?.enabled ?? t.effects.compressor.enabled }, reverb: { ...t.effects.reverb, ...(fxSettings.reverb || {}), enabled: fxSettings.reverb?.enabled ?? t.effects.reverb.enabled }, gate: { ...t.effects.gate, ...(fxSettings.gate || {}), enabled: fxSettings.gate?.enabled ?? t.effects.gate.enabled }, deesser: { ...t.effects.deesser, ...(fxSettings.deesser || {}), enabled: fxSettings.deesser?.enabled ?? t.effects.deesser.enabled }, limiter: { ...t.effects.limiter, ...(fxSettings.limiter || {}), enabled: fxSettings.limiter?.enabled ?? t.effects.limiter.enabled }, filter: { ...t.effects.filter, ...(fxSettings.filter || {}), enabled: fxSettings.filter?.enabled ?? t.effects.filter.enabled }, distortion: { ...t.effects.distortion, ...(fxSettings.distortion || {}), enabled: fxSettings.distortion?.enabled ?? t.effects.distortion.enabled }, chorus: { ...t.effects.chorus, ...(fxSettings.chorus || {}), enabled: fxSettings.chorus?.enabled ?? t.effects.chorus.enabled } } }; }));
    setActiveEffectsTrack(targetIdx); setStatus(`✓ Vocal FX applied to Track ${targetIdx + 1}`);
  }, [tracks, selectedTrackIndex]);

  const handleApplyMicProfile = useCallback((micProfile) => {
    const idx = tracks.findIndex(t => t.armed); const targetIdx = idx !== -1 ? idx : selectedTrackIndex;
    if (!micProfile?.eqCurve) return;
    setTracks(prev => prev.map((t, i) => { if (i !== targetIdx) return t; return { ...t, effects: { ...t.effects, eq: { ...t.effects.eq, ...micProfile.eqCurve, enabled: true }, filter: micProfile.rolloff ? { ...t.effects.filter, type: "highpass", frequency: micProfile.rolloff, Q: 0.707, enabled: true } : t.effects.filter } }; }));
    setStatus(`✓ Mic profile "${micProfile.name}" applied to Track ${targetIdx + 1}`);
  }, [tracks, selectedTrackIndex]);

  const handleConsoleMicModel = useCallback((trackIndex, modelKey) => {
    setTrackMicModels(prev => ({ ...prev, [trackIndex]: modelKey }));
    if (modelKey === "none" || !MIC_MODELS[modelKey]?.eqCurve) { setStatus(`Mic model cleared — Track ${trackIndex + 1}`); return; }
    const mic = MIC_MODELS[modelKey];
    handleApplyMicProfile({ name: mic.name, eqCurve: mic.eqCurve, rolloff: mic.rolloff });
    setStatus(`🎙 ${mic.name} applied to Track ${trackIndex + 1}`);
  }, [handleApplyMicProfile]);

  const landBufferOnTrack = useCallback((audioBuffer, trackName) => {
    const foundIdx = tracks.findIndex(t => !t.audioBuffer);
    const targetIdx = (foundIdx === -1 && tracks.length < maxTracks) ? tracks.length : foundIdx;
    if (foundIdx === -1 && tracks.length < maxTracks) setTracks(prev => [...prev, DEFAULT_TRACK(targetIdx)]);
    if (targetIdx === -1) { setStatus("⚠ No empty tracks"); return; }
    const blob = new Blob([audioBuffer], { type: "audio/wav" }); const audioUrl = URL.createObjectURL(blob);
    updateTrack(targetIdx, { audioBuffer, audio_url: audioUrl, name: trackName });
    createRegionFromImport(targetIdx, audioBuffer, trackName, audioUrl);
    setStatus(`✓ "${trackName}" → Track ${targetIdx + 1}`); setViewMode("arrange");
  }, [tracks, maxTracks, updateTrack, createRegionFromImport]);

  // ── Arranger callbacks ──
  const handleArrangerPlay   = useCallback(() => { if (!isPlaying) startPlayback(); }, [isPlaying]);
  const handleArrangerStop   = useCallback(() => { if (isPlaying) stopPlayback(); }, [isPlaying]);
  const handleArrangerRecord = useCallback(() => { isRecording ? stopRecording() : startRecording(); }, [isRecording]);
  const handleBpmChange      = useCallback((newBpm) => setBpm(newBpm), []);
  const handleTimeSignatureChange = useCallback((top, bottom) => setTimeSignature([top, bottom]), []);
  const handleToggleFx       = useCallback((trackIndex) => setActiveEffectsTrack(prev => prev === trackIndex ? null : trackIndex), []);
  const handleBrowseSounds   = useCallback((trackIndex) => { setSelectedTrackIndex(trackIndex); updateTrack(trackIndex, { armed: true }); setTracks(prev => prev.map((t, i) => ({ ...t, armed: i === trackIndex }))); setViewMode("sounds"); setStatus(`Browse sounds for Track ${trackIndex + 1}`); }, [updateTrack]);

  // ── Split screen drag ──
  const handleSplitMouseDown = useCallback((e) => {
    e.preventDefault(); splitDragRef.current = true;
    const container = splitContainerRef.current; if (!container) return;
    const onMove = (me) => { if (!splitDragRef.current) return; const rect = container.getBoundingClientRect(); const pct = Math.max(20, Math.min(80, ((me.clientY - rect.top) / rect.height) * 100)); setSplitTopH(Math.round(pct)); };
    const onUp = () => { splitDragRef.current = false; window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
    window.addEventListener("mousemove", onMove); window.addEventListener("mouseup", onUp);
  }, []);

  const addGroupTrack = useCallback(() => {
    const busId = `bus_${Date.now()}`;
    const busTrack = { ...DEFAULT_TRACK(tracks.length, "bus"), id: busId, name: "Group " + (tracks.filter(t=>t.trackType==="bus").length+1), color: "#3b82f6", sends: [] };
    setTracks(prev => {
      const newTracks = [...prev, busTrack];
      return newTracks.map(t => {
        if (selectedChannels.has(t.id) && t.trackType !== "bus") {
          return {...t, sends: [...(t.sends||[]).filter(s=>s.busId!==busId), {busId, level:1.0}]};
        }
        return t;
      });
    });
    setSelectedChannels(new Set());
    setStatus("Group track created");
  }, [tracks, selectedChannels]);

  const linkSelectedChannels = useCallback(() => {
    if (selectedChannels.size < 2) return;
    const ids = [...selectedChannels];
    setTracks(prev => prev.map(t => selectedChannels.has(t.id) ? {...t, linkedGroup: ids[0]} : t));
    setStatus(ids.length + " channels linked");
    setSelectedChannels(new Set());
  }, [selectedChannels, tracks]);

  const handleCutRegion = useCallback(() => {
    if (selectedTrack == null || playheadBeat == null) return;
    const tIdx = typeof selectedTrack === 'number' ? selectedTrack : 0;
    setTracks(prev => prev.map((t, i) => {
      if (i !== tIdx) return t;
      const out = [];
      (t.regions || []).forEach(r => {
        const cut = playheadBeat;
        if (cut > r.startBeat && cut < r.startBeat + r.duration) {
          const lDur = cut - r.startBeat;
          const rDur = r.duration - lDur;
          out.push({ ...r, id: r.id + '_L', duration: lDur });
          out.push({ ...r, id: r.id + '_R', startBeat: cut, duration: rDur, trimStart: (r.trimStart || 0) + lDur });
        } else { out.push(r); }
      });
      return { ...t, regions: out };
    }));
    setStatus('Cut at beat ' + playheadBeat.toFixed(2));
  }, [selectedTrack, playheadBeat, setTracks]);

  // ── Flex pitch ──
  const openFlexPitch = useCallback((ti) => {
    const t = tracks[ti]; if (!t?.audioBuffer) { setStatus(`⚠ Track ${ti + 1} has no audio`); return; }
    setFlexPitchBuffer(t.audioBuffer); setFlexPitchTrack(ti); setShowFlexPitch(true);
  }, [tracks]);

  const handleFlexPitchExport = useCallback((correctedBuffer) => {
    if (flexPitchTrack === null) return;
    updateTrack(flexPitchTrack, { audioBuffer: correctedBuffer });
    setStatus(`✓ Pitch corrections applied to Track ${flexPitchTrack + 1}`);
    setShowFlexPitch(false);
  }, [flexPitchTrack, updateTrack]);

  // ── Automation playback ──
  const applyAutomation = useCallback(() => {
    if (!audioCtxRef.current || !isPlaying) { autoRafRef.current = null; return; }
    const now = audioCtxRef.current.currentTime;
    const projectTime = playOffsetRef.current / bpm * 60 + (now - playStartRef.current);
    tracks.forEach((t, i) => {
      const tId = t.id ?? i; if (!autoRead[tId]) return;
      const tAuto = automation[tId] ?? {}; const paramK = autoParams[tId] ?? "volume";
      const param = AUTO_PARAMS.find(p => p.key === paramK); if (!param) return;
      const pts = (tAuto[paramK] ?? []).sort((a, b) => a.time - b.time); if (pts.length === 0) return;
      const val = getValueAtTime(pts, projectTime, param);
      const nodes = trackNodesRef.current.get(tId); if (!nodes) return;
      switch (paramK) {
        case "volume": nodes.fader?.gain.setTargetAtTime(val, now, 0.02); break;
        case "pan":    nodes.panNode?.pan.setTargetAtTime(Math.max(-1, Math.min(1, val)), now, 0.02); break;
        case "mute":   nodes.preGain?.gain.setTargetAtTime(val > 0.5 ? 0 : 1, now, 0.01); break;
      }
    });
    autoRafRef.current = requestAnimationFrame(applyAutomation);
  }, [isPlaying, tracks, automation, autoRead, autoParams, bpm]);

  useEffect(() => {
    if (isPlaying) { if (autoRafRef.current) cancelAnimationFrame(autoRafRef.current); autoRafRef.current = requestAnimationFrame(applyAutomation); }
    else { if (autoRafRef.current) { cancelAnimationFrame(autoRafRef.current); autoRafRef.current = null; } }
    return () => { if (autoRafRef.current) cancelAnimationFrame(autoRafRef.current); };
  }, [isPlaying, applyAutomation]);

  // ── Menu handler ──
  const handleMenuAction = async (action) => {
    const sel = clamp(selectedTrackIndex, 0, Math.max(0, tracks.length - 1));
    const toggleArmSelected  = () => { setTracks(p => p.map((t, idx) => ({ ...t, armed: idx === sel ? !t.armed : false }))); setSelectedTrackIndex(sel); setStatus(`Track ${sel + 1} ${tracks[sel]?.armed ? "disarmed" : "armed"}`); };
    const toggleMuteSelected = () => { const wasMuted = !!tracks[sel]?.muted; updateTrack(sel, { muted: !wasMuted }); if (trackGainsRef.current[sel]) trackGainsRef.current[sel].gain.value = !wasMuted ? 0 : tracks[sel].volume; setStatus(`Track ${sel + 1} ${!wasMuted ? "muted" : "unmuted"}`); };
    const toggleSoloSelected = () => { updateTrack(sel, { solo: !tracks[sel]?.solo }); setStatus(`Track ${sel + 1} solo`); };
    const toggleFxPanel      = () => { setActiveEffectsTrack(prev => prev === sel ? null : sel); };
    switch (action) {
      case "file:new": newProject(); break;
      case "file:open": loadProjectList(); break;
      case "file:save": saveProject(); break;
      case "file:openLocal": { const inp = document.createElement("input"); inp.type = "file"; inp.accept = ".spx,.json"; inp.onchange = async (e) => { const f = e.target.files[0]; if (!f) return; try { const text = await f.text(); const data = JSON.parse(text); if (data.format !== "streampirex-daw") { setStatus("Not a valid StreamPireX project"); return; } stopEverything(); setProjectId(null); setProjectName(data.name || "Imported Project"); setBpm(data.bpm || 120); setMasterVolume(data.master_volume || 0.8); if (data.time_signature) { const ts = data.time_signature.split("/").map(Number); if (ts.length === 2) setTimeSignature(ts); } if (data.piano_roll_notes) setPianoRollNotes(data.piano_roll_notes); const trackCount = Math.min(Math.max(data.tracks?.length || 1, 1), maxTracks); const loaded = Array.from({ length: trackCount }, (_, i) => ({ ...DEFAULT_TRACK(i), ...(data.tracks[i] || {}), audioBuffer: null, effects: data.tracks[i]?.effects || DEFAULT_EFFECTS(), regions: data.tracks[i]?.regions || [] })); setTracks(loaded); setSelectedTrackIndex(0); setStatus("Opened: " + (data.name || "project")); } catch (err) { setStatus("Failed to open: " + err.message); } }; inp.click(); break; }
      case "file:saveAs": { const saveData = { name: projectName, bpm, time_signature: timeSignature[0] + "/" + timeSignature[1], master_volume: masterVolume, tracks: tracks.map(t => ({ name: t.name, volume: t.volume, pan: t.pan, muted: t.muted, solo: t.solo, effects: t.effects, color: t.color, regions: (t.regions || []).map(r => ({ ...r, audioUrl: null })), audio_url: typeof t.audio_url === "string" && !t.audio_url.startsWith("blob:") ? t.audio_url : null })), piano_roll_notes: pianoRollNotes, created_at: new Date().toISOString(), format: "streampirex-daw", version: "1.0" }; setSaveAsData(JSON.stringify(saveData, null, 2)); setShowSaveAsModal(true); break; }
      case "file:saveDesktop": { const dlData = { name: projectName, bpm, time_signature: `${timeSignature[0]}/${timeSignature[1]}`, master_volume: masterVolume, tracks: tracks.map(t => ({ name: t.name, volume: t.volume, pan: t.pan, muted: t.muted, solo: t.solo, effects: t.effects, color: t.color, regions: (t.regions || []).map(r => ({ ...r, audioUrl: null })) })), piano_roll_notes: pianoRollNotes, created_at: new Date().toISOString(), format: "streampirex-daw", version: "1.0" }; const dlBlob = new Blob([JSON.stringify(dlData, null, 2)], { type: "application/json" }); const dlUrl = URL.createObjectURL(dlBlob); const dlA = document.createElement("a"); dlA.href = dlUrl; dlA.download = `${projectName.replace(/\s+/g, "_")}.spx`; document.body.appendChild(dlA); dlA.click(); document.body.removeChild(dlA); URL.revokeObjectURL(dlUrl); setStatus(`Downloaded: ${projectName}.spx`); break; }
      case "file:importAudio": setViewMode("arrange"); handleImport(sel); break;
      case "file:importMidi": case "midi:import": setViewMode("pianoroll"); break;
      case "midi:controller": setMidiEnabled(m => !m); break;
      case "plugins:wam": window.open("/wam-plugin-store", "_blank"); break;
      case "file:exportMidi": case "midi:export": exportMidiFile(); break;
      case "file:exportMixdown": setShowExportModal(true); break;
      case "file:exportStems": setShowExportModal(true); setExportSettings(p=>({...p,mode:"stems"})); break;
      case "file:importVideo": handleImportVideo(); break;
      case "view:arrange": setViewMode("arrange"); break;
      case "view:console": setViewMode("console"); break;
      case "view:beatmaker": case "view:drumkits": case "view:kits": case "view:sampler": setViewMode("beatmaker"); break;
      case "view:pianoroll": case "view:midi": setViewMode("pianoroll"); break;
      case "view:piano": setViewMode("piano"); break;
      case "view:sounds": setViewMode("sounds"); break;
      case "view:keyfinder": setViewMode("keyfinder"); break;
      case "view:aibeat": setViewMode("aibeat"); break;
      case "view:micsim": setShowMicSimModal(true); break;
      case "view:aimix": setViewMode("aimix"); break;
      case "view:chords": setViewMode("chords"); break;
      case "view:vocal": setShowVocalModal(true); break;
      case "view:takelanes": setViewMode("takelanes"); break;
      case "view:plugins": setViewMode("plugins"); break;
      case "view:plugin-store": setViewMode("plugin-store"); break;
      case "view:multiband": setViewMode("multiband"); break;
      case "view:voicemidi": setViewMode("voicemidi"); break;
      case "view:toggleFx": toggleFxPanel(); break;
      case "transport:playPause": isPlaying ? stopPlayback() : startPlayback(); break;
      case "transport:stop": stopEverything(); break;
      case "transport:record": isRecording ? stopRecording() : startRecording(); break;
      case "transport:rewind": rewind(); break;
      case "transport:tapTempo": tapTempo(); break;
      case "track:add": setShowAddTrackDialog(true); break;
      case "track:remove": removeTrack(sel); break;
      case "track:arm": toggleArmSelected(); break;
      case "track:mute": toggleMuteSelected(); break;
      case "track:solo": toggleSoloSelected(); break;
      case "track:clear": clearTrack(sel); break;
      case "track:duplicate": { if (!tracks[sel]) break; const dup = { ...tracks[sel], id: Date.now(), name: (tracks[sel].name ?? `Track ${sel + 1}`) + " copy" }; setTracks(t => [...t, dup]); setStatus(`Track ${sel + 1} duplicated`); break; }
      case "track:color": { const pal = ["#34c759","#ff9500","#007aff","#af52de","#ff3b30","#5ac8fa","#ff2d55","#ffcc00","#ff6b35","#00ffc8"]; const next = pal[(pal.indexOf(tracks[sel]?.color ?? pal[0]) + 1) % pal.length]; updateTrack(sel, { color: next }); break; }
      case "track:rename": { const n = window.prompt("Rename track:", tracks[sel]?.name ?? `Track ${sel + 1}`); if (n?.trim()) updateTrack(sel, { name: n.trim() }); break; }
      case "transport:metronome": metronomeOn ? stopMetronome() : startMetronome(audioCtxRef?.current); setMetronomeOn(m => !m); break;
      case "transport:cycle": setCycleEnabled(e => !e); setStatus(`Cycle ${cycleEnabled ? "OFF" : "ON"}`); break;
      case "transport:countIn": setCountIn(c => !c); break;
      case "transport:setBpm": { const b = window.prompt("Set BPM:", String(bpm ?? 120)); if (b && !isNaN(parseInt(b))) setBpm(Math.max(20, Math.min(300, parseInt(b)))); break; }
      case "transport:timeSignature": { const ts = window.prompt("Time signature:", `${timeSignature[0]}/${timeSignature[1]}`); if (ts) { const [top, bot] = ts.split("/").map(Number); if (top > 0 && bot > 0) setTimeSignature([top, bot]); } break; }
      case "transport:goToEnd": { const mx = Math.max(...tracks.map(t => t.audioBuffer?.duration ?? 0), 0); playOffsetRef.current = mx; setCurrentTime(mx); break; }
      case "midi:hardware": setMidiEnabled(m => !m); break;
      case "midi:humanize": { const h = (pianoRollNotes ?? []).map(n => ({ ...n, startBeat: +(n.startBeat + (Math.random() - 0.5) * 0.04).toFixed(4), velocity: +Math.max(0.05, Math.min(1, (n.velocity ?? 0.8) + (Math.random() - 0.5) * 0.15)).toFixed(3) })); setPianoRollNotes(h); setStatus(`✓ Humanized ${h.length} notes`); break; }
      case "midi:quantize": { setPianoRollNotes(p => p.map(n => ({ ...n, startBeat: Math.round(n.startBeat / 0.25) * 0.25 }))); setStatus("✓ Quantized to 1/16"); break; }
      case "midi:transpose": { const s = window.prompt("Semitones (+/-)", "0"); if (s !== null && !isNaN(parseInt(s))) { const n = parseInt(s); setPianoRollNotes(p => p.map(note => ({ ...note, note: Math.max(0, Math.min(127, (note.note ?? 60) + n)) }))); setStatus(`✓ Transposed ${n > 0 ? "+" : ""}${n} semitones`); } break; }
      case "midi:velocity": { const pct = window.prompt("Scale velocity %", "100"); if (pct && !isNaN(parseFloat(pct))) { const sc = parseFloat(pct) / 100; setPianoRollNotes(p => p.map(n => ({ ...n, velocity: +Math.max(0.05, Math.min(1, (n.velocity ?? 0.8) * sc)).toFixed(3) }))); setStatus(`✓ Velocity ×${pct}%`); } break; }
      case "midi:clearAll": if (window.confirm("Clear all piano roll notes?")) setPianoRollNotes([]); break;
      case "audio:settings": setShowAudioSettings(true); break;
      case "view:sampleLibrary": setShowSampleLibrary(s => !s); break;
      case "view:pluginRack": setShowPluginRack(s => !s); break;
      case "view:midiMapping": setShowMidiMapping(s => !s); break;
      case "view:onboarding": setShowOnboarding(true); break;
      case "file:projectSettings": { const nm = window.prompt("Project name:", projectName ?? "Untitled"); if (nm?.trim()) setProjectName(nm.trim()); const b = window.prompt("BPM:", String(bpm ?? 120)); if (b && !isNaN(parseInt(b))) setBpm(Math.max(20, Math.min(300, parseInt(b)))); break; }
      default: setStatus(`ℹ ${action}`);
    }
  };


// ═══ RS_part4.js ═══
// =============================================================================
// RecordingStudio.js — Part 4/4
// Full JSX render — zero inline styles
// =============================================================================

  const afx = activeEffectsTrack !== null ? tracks[activeEffectsTrack] : null;

  return (
    <div className="daw">
      <DAWMenuBar
        viewMode={viewMode} isPlaying={isPlaying} isRecording={isRecording}
        metronomeOn={metronomeOn} countIn={countIn} tracks={tracks} maxTracks={maxTracks}
        saving={saving} mixingDown={mixingDown} pianoRollNotes={pianoRollNotes}
        bpm={bpm} projectName={projectName} onAction={handleMenuAction}
      />

      {/* ═══ TOP BAR ═══ */}
      <div className="daw-topbar">
        <div className="daw-topbar-row1">
          <div className="daw-topbar-left">
            <button className="daw-icon-btn" onClick={newProject} title="New">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
            </button>
            <button className="daw-icon-btn" onClick={loadProjectList} title="Open">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
            </button>
            <button className={"daw-icon-btn" + (saving ? " saving" : "")} onClick={saveProject} title="Save" disabled={saving}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
            </button>
            <div className="daw-divider"/>
            <input className="daw-project-name" value={projectName} onChange={e => setProjectName(e.target.value)}/>
          </div>

          <div className="daw-transport">
            <button className="daw-transport-btn" onClick={rewind} disabled={isRecording} title="Rewind">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19 20L9 12l10-8v16zM7 19V5H5v14h2z"/></svg>
            </button>
            <button className="daw-transport-btn" onClick={stopEverything} title="Stop">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>
            </button>
            <button className={"daw-transport-btn daw-play-btn" + (isPlaying && !isRecording ? " active" : "")}
              onClick={() => isPlaying ? stopPlayback() : startPlayback()} disabled={isRecording} title={isPlaying ? "Pause" : "Play"}>
              {isPlaying && !isRecording
                ? <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="4" width="5" height="16" rx="1"/><rect x="14" y="4" width="5" height="16" rx="1"/></svg>
                : <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              }
            </button>
            <button className={"daw-transport-btn daw-rec-btn" + (isRecording ? " active" : "")}
              onClick={() => isRecording ? stopRecording() : startRecording()} title={isRecording ? "Stop Recording" : "Record"}>
              <span className="daw-rec-dot"/>
            </button>
            <div className="daw-lcd">
              <span className="daw-lcd-time">{fmt(currentTime)}</span>
              <span className="daw-lcd-sep">|</span>
              <span className="daw-lcd-bpm">{bpm} BPM</span>
            </div>
            <button className="daw-icon-btn" onClick={handleCutRegion} title="Split region at playhead">✂</button>
            <button className={"rs-split-toggle-btn" + (splitScreen ? " active" : "")} onClick={() => setSplitScreen(s => !s)} title="Split view">
              <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="1" y="1" width="10" height="4.5" rx="0.5"/><rect x="1" y="6.5" width="10" height="4.5" rx="0.5"/></svg>
              SPLIT
            </button>
            <button className={"daw-transport-btn daw-metro-btn" + (metronomeOn ? " active" : "")}
              onClick={() => { const ctx = getCtx(); if (metronomeOn) { stopMetronome(); setMetronomeOn(false); } else { startMetronome(ctx); setMetronomeOn(true); } }} title="Metronome">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L8 22h8L12 2z"/><line x1="12" y1="8" x2="18" y2="4"/></svg>
            </button>
            <button className={"daw-transport-btn rs-transport-label" + (countIn ? " active" : "")} onClick={() => setCountIn(!countIn)} title="Count-in">1234</button>
            <MidiDeviceIndicator devices={instrumentEngine.midiDevices} activeDevice={instrumentEngine.activeMidiDevice} midiActivity={instrumentEngine.midiActivity} onConnect={instrumentEngine.connectMidiDevice} onDisconnect={instrumentEngine.disconnectMidiDevice}/>
            <KeyboardOctaveIndicator octave={instrumentEngine.keyboardOctave} onOctaveChange={instrumentEngine.setKeyboardOctave}/>
            <div className="daw-monitor-row">
              <span className="daw-monitor-label">🔊 MON</span>
              <select value={monitorSpeaker} onChange={e => setMonitorSpeaker(e.target.value)}
                className={"daw-monitor-select" + (monitorSpeaker === "flat" ? "" : MONITOR_EQ[monitorSpeaker]?.cat === "pro" ? " pro" : " consumer")}
                title="Monitor speaker simulation">
                <optgroup label="── Bypass ──"><option value="flat">Flat (Bypass)</option></optgroup>
                <optgroup label="── Pro Monitors ──">
                  {Object.entries(MONITOR_EQ).filter(([, v]) => v.cat === "pro").map(([id, v]) => <option key={id} value={id}>{v.name}</option>)}
                </optgroup>
                <optgroup label="── Consumer ──">
                  {Object.entries(MONITOR_EQ).filter(([, v]) => v.cat === "consumer").map(([id, v]) => <option key={id} value={id}>{v.name}</option>)}
                </optgroup>
              </select>
            </div>
          </div>

          <CollabToolbar collab={collab}/>
          {midiEnabled && <MidiHardwareInput drumMode={viewMode === "beatmaker" || viewMode === "sampler"} onNoteOn={(note, vel) => setStatus(`MIDI: Note ${note} vel ${vel}`)} onNoteOff={() => {}} onCC={(cc, val) => { if (cc === 7) tracks.forEach((t, i) => { if (selectedTrack === i) updateTrack(i, { volume: val / 127 }); }); if (cc === 10) tracks.forEach((t, i) => { if (selectedTrack === i) updateTrack(i, { pan: (val - 64) / 64 }); }); }} onPadTrigger={pad => setStatus(`Pad ${pad} triggered`)}/>}
          {wamPlugins.length > 0 && <span className="rs-wam-badge"><span className="rs-wam-text">🔌 {wamPlugins.length} WAM</span></span>}

          <div className="daw-topbar-right">
            {latencyMs > 0 && <div className={"daw-latency-badge" + (latencyMs < 20 ? " good" : latencyMs < 50 ? " ok" : " bad")}>⚡ {latencyMs}ms</div>}
            <button className={"daw-icon-btn" + (monitoringEnabled ? " active" : "")} onClick={() => toggleMonitoring(selectedTrack)} title={"Direct monitoring " + (monitoringEnabled ? "ON" : "OFF")}>🎧</button>
            <select value={selectedDevice} onChange={e => setSelectedDevice(e.target.value)} className="daw-input-select">
              <option value="default">Default Mic</option>
              {inputDevices.map(d => <option key={d.deviceId} value={d.deviceId}>{d.label || `Mic ${d.deviceId.slice(0, 6)}`}</option>)}
            </select>
            <div className="daw-input-meter"><div className="daw-input-meter-fill" style={{ width: `${inputLevel * 100}%` }}/></div>
            <span className="daw-status">{status}</span>
          </div>
        </div>

        <div className="daw-topbar-row2">
          <div className="daw-tabs-row">
            {[["arrange","Arrange"],["console","Console"],["pianoroll","Piano Roll"],["score","Score"],["beatmaker","Beat Maker"],["piano","Piano"],["chords","Chords"],["sounds","Sounds"]].map(([m, l]) => (
              <button key={m} className={"daw-view-tab" + (viewMode === m ? " active" : "")} onClick={() => setViewMode(m)}>{l}</button>
            ))}
            <MixDropdown viewMode={viewMode} setViewMode={setViewMode}/>
            <ToolsDropdown viewMode={viewMode} setViewMode={setViewMode}/>
          </div>
        </div>
      </div>

      {/* ═══ MAIN VIEW ═══ */}
      <div className="daw-main">

        {/* ARRANGE */}
        {!splitScreen && viewMode === "arrange" && (
          <div className="rs-relative">
            <ArrangerView onBpmDetected={det => { setBpm(det); setStatus("♩ BPM detected: " + det); }} cycleEnabled={cycleEnabled} cycleStart={cycleStart} cycleEnd={cycleEnd}
              onCycleChange={(s, e) => { setCycleStart(s); setCycleEnd(e); }} onCycleToggle={() => setCycleEnabled(e => !e)}
              tracks={tracks} setTracks={setTracks} bpm={bpm} timeSignatureTop={timeSignature[0]} timeSignatureBottom={timeSignature[1]}
              masterVolume={masterVolume} onMasterVolumeChange={setMasterVolume} projectName={projectName} userTier={userTier}
              playheadBeat={playheadBeat} isPlaying={isPlaying} isRecording={isRecording}
              onPlay={handleArrangerPlay} onStop={handleArrangerStop} onRecord={handleArrangerRecord}
              onSeek={seekToBeat} onBpmChange={handleBpmChange} onTimeSignatureChange={handleTimeSignatureChange}
              onToggleFx={handleToggleFx} onBounce={mixDownProject} onSave={saveProject} saving={saving}
              instrumentEngine={instrumentEngine} onBrowseSounds={handleBrowseSounds}
              onOpenPianoRoll={onOpenPianoRoll} onTimelineDoubleClick={handleTimelineDoubleClick}
              MidiRegionPreview={MidiRegionPreview}
              onAddTrack={() => setShowAddTrackDialog(true)}/>
            <CollabOverlay collab={collab} tracks={tracks} trackHeight={48}/>
          </div>
        )}

        {/* AUDIO SETTINGS */}
        {showAudioSettings && (
          <div className="daw-audio-settings-overlay" onClick={() => setShowAudioSettings(false)}>
            <div className="daw-audio-settings-panel" onClick={e => e.stopPropagation()}>
              <div className="daw-audio-settings-header">
                <span className="rs-settings-title">AUDIO SETTINGS</span>
                <button onClick={() => setShowAudioSettings(false)} className="rs-close-btn">✕</button>
              </div>
              <div className="rs-settings-section">
                <label className="rs-settings-label">BUFFER SIZE</label>
                <div className="rs-settings-row">
                  {[64, 128, 256, 512, 1024, 2048].map(size => (
                    <button key={size} onClick={() => recreateAudioContext(size, audioSampleRate)} className={"daw-settings-size-btn " + (audioBufferSize === size ? "active" : "inactive")}>{size}</button>
                  ))}
                </div>
                <div className="rs-hint">{audioBufferSize <= 128 ? "⚡ Low latency" : audioBufferSize <= 512 ? "✓ Balanced" : "🔇 High stability"}</div>
              </div>
              <div className="rs-settings-section">
                <label className="rs-settings-label">SAMPLE RATE</label>
                <div className="rs-settings-row">
                  {[44100, 48000, 96000].map(sr => (
                    <button key={sr} onClick={() => recreateAudioContext(audioBufferSize, sr)} className={"daw-settings-sr-btn " + (audioSampleRate === sr ? "active" : "inactive")}>{sr >= 1000 ? `${sr / 1000}kHz` : `${sr}Hz`}</button>
                  ))}
                </div>
              </div>
              <div className="rs-latency-box">
                <div className="rs-stat-row"><span className="rs-stat-label">Measured Latency</span><span className="rs-stat-val-teal">{latencyMs}ms</span></div>
                <div className="rs-stat-row"><span className="rs-stat-label">Sample Rate</span><span className="rs-stat-val">{audioSampleRate}Hz</span></div>
                <div className="rs-stat-row-last"><span className="rs-stat-label">Scheduler Lookahead</span><span className="rs-stat-val">{audioLookahead}ms</span></div>
              </div>
              <div className="rs-settings-section">
                <label className="rs-settings-label">LATENCY COMPENSATION: {latencyCompMs}ms</label>
                <input type="range" min={0} max={100} step={1} value={latencyCompMs} onChange={e => setLatencyCompMs(Number(e.target.value))} className="rs-range-teal"/>
              </div>
              <div className="rs-hint-center">Changes take effect immediately.</div>
            </div>
          </div>
        )}

        {/* FLEX PITCH */}
        {showFlexPitch && (
          <div className="daw-flexpitch-overlay">
            <FlexPitchEditor audioBuffer={flexPitchBuffer} audioContext={audioCtxRef?.current}
              trackName={tracks[flexPitchTrack]?.name ?? `Track ${(flexPitchTrack ?? 0) + 1}`}
              onClose={() => setShowFlexPitch(false)} onExport={handleFlexPitchExport}/>
          </div>
        )}

        {/* SPLIT SCREEN */}
        {splitScreen && (
          <div ref={splitContainerRef} className="rs-split-screen">
            <div className="rs-split-top" style={{ height: `${splitTopH}%` }}>
              <span className="rs-split-pane-label">ARRANGE</span>
              <ArrangerView onBpmDetected={det => { setBpm(det); setStatus("♩ BPM detected: " + det); }} tracks={tracks} bpm={bpm} currentTime={currentTime} isPlaying={isPlaying}
                selectedTrack={selectedTrack} onSelectTrack={setSelectedTrack} zoom={zoom} onZoomChange={setZoom}
                onBrowseSounds={handleBrowseSounds} onOpenPianoRoll={onOpenPianoRoll}
                onTimelineDoubleClick={handleTimelineDoubleClick} MidiRegionPreview={MidiRegionPreview}/>
            </div>
            <div className="rs-split-handle" onMouseDown={handleSplitMouseDown} title="Drag to resize"/>
            <div className="rs-split-bottom" style={{ height: `${100 - splitTopH}%` }}>
              <span className="rs-split-pane-label">MIXER</span>
              <div className="daw-console">
                <div className="daw-console-scroll">
                  {tracks.map((t, i) => {
                    const meter = meterLevels?.[i] || { left: 0, right: 0, peak: 0 };
                    return (
                      <div key={t.id ?? i} className={"daw-channel"+(i===selectedTrack?" selected":"")+(t.armed?" armed":"")+(t.trackType==="bus"?" bus-channel":"")+(selectedChannels.has(t.id)?" linked":"")} onClick={e=>{if(e.ctrlKey||e.metaKey){setSelectedChannels(prev=>{const n=new Set(prev);n.has(t.id)?n.delete(t.id):n.add(t.id);return n;});}else setSelectedTrack(i);}} onContextMenu={e=>{e.preventDefault();setChannelCtxMenu({x:e.clientX,y:e.clientY,trackId:t.id,trackIndex:i});}}>
                        <div className="daw-ch-colorbar" style={{ background: t.color || "#4a90d9" }}/>
                        <div className="daw-ch-header">
                          <span className="daw-ch-type-icon">{t.trackType === "midi" ? "🎹" : "🎙"}</span>
                          <span className="daw-ch-header-num">{i + 1}</span>
                        </div>
                        <div className="daw-ch-routing">
                          <span className="daw-ch-routing-value">{t.input || "Stereo In"}</span>
                        </div>
                        <div className="daw-ch-inserts">
                          <div className="daw-ch-inserts-label">INSERTS</div>
                          {ALL_FX_EXTENDED.filter(fx => t.effects?.[fx.key]?.enabled).map(fx => (
                            <div key={fx.key} className={"daw-ch-insert-slot active " + (fx.type || "")}
                              onClick={e => { e.stopPropagation(); setSelectedTrack(i); setActiveEffectsTrack(i); setOpenFxKey(fx.key); }}>
                              {fx.name}
                            </div>
                          ))}
                          {Array.from({length: Math.max(0, 6 - ALL_FX_EXTENDED.filter(fx => t.effects?.[fx.key]?.enabled).length)}).map((_, si) => (
                            <div key={"empty"+si} className="daw-ch-insert-slot empty"
                              onClick={e => { e.stopPropagation(); const rect = e.currentTarget.getBoundingClientRect(); setInsertPickerState({ trackIndex: i, x: rect.right + 4, y: rect.top }); }}>
                            </div>
                          ))}
                        </div>
                        <div className="daw-ch-controls">
                          <div className={"daw-ch-badge" + (t.muted ? " m-on" : "")} onClick={e => { e.stopPropagation(); const nm = !t.muted; updateTrack(i, { muted: nm }); const audible = !nm && (!hasSolo || t.solo); if (trackGainsRef.current[i]) trackGainsRef.current[i].gain.value = audible ? t.volume : 0; }}>M</div>
                          <div className={"daw-ch-badge" + (t.solo ? " s-on" : "")} onClick={e => { e.stopPropagation(); const ns = !t.solo; updateTrack(i, { solo: ns }); const whs = tracks.some((x, idx) => idx === i ? ns : x.solo); tracks.forEach((x, idx) => { const gn = trackGainsRef.current[idx]; if (!gn) return; const s = idx === i ? ns : x.solo; gn.gain.value = (!x.muted && (!whs || s)) ? x.volume : 0; }); }}>S</div>
                          <div className={"daw-ch-badge" + (selectedTrack === i ? " e-on" : "")} onClick={e => { e.stopPropagation(); setSelectedTrack(i); setActiveEffectsTrack(i); }}>e</div>
                          <button className={"daw-ch-rec-btn" + (t.armed ? " armed" : "")} onClick={e => { e.stopPropagation(); updateTrack(i, { armed: !t.armed }); }}>●</button>
                        </div>
                        <div className="daw-ch-pan">
                          <PanKnob value={t.pan} onChange={v => updateTrack(i, { pan: v })} size={56}/>
                        </div>
                        <div className="daw-ch-sends">
                          <div className="daw-ch-sends-label">SENDS</div>
                          {tracks.filter(b=>b.trackType==="bus").map(bus=>(
                            <div key={bus.id} className="daw-ch-send-row">
                              <span className="daw-ch-send-name">{bus.name}</span>
                              <input type="range" className="daw-ch-send-level" min={0} max={1} step={0.01}
                                defaultValue={(t.sends||[]).find(s=>s.busId===bus.id)?.level||0}
                                onClick={e=>e.stopPropagation()}
                                onChange={e=>{const v=parseFloat(e.target.value);const newSends=[...(t.sends||[]).filter(s=>s.busId!==bus.id),{busId:bus.id,level:v}];updateTrack(i,{sends:newSends});}}/>
                            </div>
                          ))}
                        </div>
                        <div className="daw-ch-fader-area">
                          <div className="daw-ch-fader-row">
                            <div className="daw-ch-db-scale" style={{textAlign:"right"}}><span>+6</span><span>0</span><span>-6</span><span>-12</span><span>-18</span><span>-∞</span></div>
                            <div className="daw-ch-fader">
                              <input type="range" min={0} max={1.26} step={0.005} value={t.volume ?? 1.0} onChange={e => { const v = parseFloat(e.target.value); updateTrack(i, { volume: v }); const audible = !t.muted && (!hasSolo || t.solo); if (trackGainsRef.current[i]) trackGainsRef.current[i].gain.value = audible ? v : 0; }}/>
                            </div>
                            <CubaseMeter leftLevel={meter.left||0} rightLevel={meter.right||0} height={180} showScale={false}/>
                        <div className="daw-ch-db-scale"><span>0</span><span>-6</span><span>-12</span><span>-18</span><span>-24</span><span>-∞</span></div>
                          </div>
                          <div className="daw-ch-vol-display">
                            <span className="daw-ch-vol-val">{t.volume > 0 ? (20 * Math.log10(t.volume)).toFixed(1) : "-∞"} dB</span>
                          </div>
                        </div>
                        <div className="daw-ch-name daw-ch-name-bottom">
                          <select className="daw-ch-console-select" value={trackConsoleChar[t.id] || "none"} onChange={e => setTrackConsoleChar(prev => ({ ...prev, [t.id]: e.target.value }))}>
                            {Object.entries(CONSOLE_BOARDS).map(([id, b]) => <option key={id} value={id}>{b.name}</option>)}
                          </select>
                          <input className="daw-ch-name-input" value={t.name || `Track ${i+1}`} onChange={e => updateTrack(i, {name: e.target.value})} onClick={e => e.stopPropagation()} style={{color: t.color || "#cdd9e5"}}/>
                        </div>
                      </div>
                    );
                  })}
                  <div className="daw-channel master-channel">
                    <div className="daw-ch-colorbar" style={{ background: "#ff8a3d" }}/>
                    <div className="daw-ch-header">
                      <span className="daw-ch-type-icon">🎚</span>
                      <span className="daw-ch-header-num" style={{color:"#ff8a3d"}}>M</span>
                    </div>
                    <div className="daw-ch-routing"><span className="daw-ch-routing-value">Stereo Out</span></div>
                    <div className="daw-ch-inserts">
                      <div className="daw-ch-inserts-label">INSERTS</div>
                      {Array.from({length:6}).map((_,si)=>(
                        <div key={"ms"+si} className="daw-ch-insert-slot empty" onClick={e=>{e.stopPropagation();const rect=e.currentTarget.getBoundingClientRect();setInsertPickerState({trackIndex:-1,x:rect.right+4,y:rect.top});}}></div>
                      ))}
                    </div>
                    <div className="daw-ch-controls">
                      <div className="daw-ch-badge">M</div>
                      <div className="daw-ch-badge">S</div>
                      <div className="daw-ch-badge e-on" onClick={e => { e.stopPropagation(); setActiveEffectsTrack(-1); }}>e</div>
                    </div>
                    <div className="daw-ch-pan">
                      <PanKnob value={masterPan || 0} onChange={v => { setMasterPan(v); if (masterPanRef.current) masterPanRef.current.pan.value = v; }} size={56}/>
                    </div>
                    <div className="daw-ch-fader-area">
                      <div className="daw-ch-fader-row">
                        <div className="daw-ch-db-scale" style={{textAlign:"right"}}><span>+6</span><span>0</span><span>-6</span><span>-12</span><span>-18</span><span>-∞</span></div>
                        <div className="daw-ch-fader">
                          <input type="range" min={0} max={1.26} step={0.005} value={masterVolume ?? 1.0} onChange={e => { const v = parseFloat(e.target.value); setMasterVolume(v); if (masterGainRef.current) masterGainRef.current.gain.value = v; }}/>
                        </div>
                        <CubaseMeter leftLevel={masterMeterLevels?.left||0} rightLevel={masterMeterLevels?.right||0} height={180} showScale={false}/>
                        <div className="daw-ch-db-scale"><span>0</span><span>-6</span><span>-12</span><span>-18</span><span>-24</span><span>-∞</span></div>
                      </div>
                      <div className="daw-ch-vol-display">
                        <span className="daw-ch-vol-val rs-orange">{masterVolume > 0 ? (20 * Math.log10(masterVolume)).toFixed(1) : "-∞"} dB</span>
                      </div>
                    </div>
                    <div className="daw-ch-automation">
                      <div className="daw-ch-rw">R</div>
                      <div className="daw-ch-rw">W</div>
                    </div>
                    <div className="daw-ch-name daw-ch-name-bottom">
                      <select className="daw-ch-console-select" value={masterConsoleChar} onChange={e => setMasterConsoleChar(e.target.value)}>
                        {Object.entries(CONSOLE_BOARDS).map(([id, b]) => <option key={id} value={id}>{b.name}</option>)}
                      </select>
                      <span className="daw-ch-track-label rs-orange">MASTER</span>
                    </div>
                  </div>
                </div>

                {channelCtxMenu && (
                  <div style={{position:"fixed",left:channelCtxMenu.x,top:channelCtxMenu.y,background:"#1a1e2a",border:"1px solid #2a3248",borderRadius:6,zIndex:9999,minWidth:230,boxShadow:"0 8px 24px rgba(0,0,0,.8)"}} onMouseLeave={()=>setChannelCtxMenu(null)}>
                    <div style={{color:"#4e6a82",fontSize:9,padding:"8px 12px 4px",letterSpacing:1,textTransform:"uppercase"}}>Channel Options</div>
                    <button className="arr-ctx-item" onClick={()=>{setSelectedChannels(prev=>{const n=new Set(prev);n.add(channelCtxMenu.trackId);return n;});setChannelCtxMenu(null);}}>☑ Select Channel</button>
                    <button className="arr-ctx-item" onClick={()=>{addGroupTrack();setChannelCtxMenu(null);}}>⊕ Add Group Track for Selected</button>
                    <button className="arr-ctx-item" onClick={()=>{linkSelectedChannels();setChannelCtxMenu(null);}}>🔗 Link Selected Channels</button>
                    <div style={{height:1,background:"#1e2638",margin:"4px 0"}}/>
                    <button className="arr-ctx-item" onClick={()=>{updateTrack(channelCtxMenu.trackIndex,{color:"#a855f7"});setChannelCtxMenu(null);}}>🎨 Purple</button>
                    <button className="arr-ctx-item" onClick={()=>{updateTrack(channelCtxMenu.trackIndex,{color:"#3b82f6"});setChannelCtxMenu(null);}}>🎨 Blue</button>
                    <button className="arr-ctx-item" onClick={()=>{updateTrack(channelCtxMenu.trackIndex,{color:"#00ffc8"});setChannelCtxMenu(null);}}>🎨 Teal</button>
                    <button className="arr-ctx-item" onClick={()=>{updateTrack(channelCtxMenu.trackIndex,{color:"#ff3b30"});setChannelCtxMenu(null);}}>🎨 Red</button>
                    <button className="arr-ctx-item" onClick={()=>{updateTrack(channelCtxMenu.trackIndex,{color:"#ff6600"});setChannelCtxMenu(null);}}>🎨 Orange</button>
                    <div style={{height:1,background:"#1e2638",margin:"4px 0"}}/>
                    <button className="arr-ctx-item" style={{color:"#ff3b30"}} onClick={()=>{setTracks(prev=>prev.filter((_,idx)=>idx!==channelCtxMenu.trackIndex));setChannelCtxMenu(null);}}>🗑 Remove Track</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* CONSOLE VIEW */}
        {!splitScreen && viewMode === "console" && (
          <div className="daw-console">
            <div className="daw-console-scroll">
              {tracks.map((t, i) => {
                const meter = meterLevels[i] || { left: 0, right: 0, peak: 0 };
                const loaded = ALL_FX_EXTENDED.filter(fx => t.effects?.[fx.key]?.enabled);
                return (
                  <div key={t.id} className={"daw-channel"+(selectedTrack===i?" selected":"")+(t.armed?" armed":"")+(t.trackType==="bus"?" bus-channel":"")+(selectedChannels.has(t.id)?" linked":"")} onClick={e=>{if(e.ctrlKey||e.metaKey){setSelectedChannels(prev=>{const n=new Set(prev);n.has(t.id)?n.delete(t.id):n.add(t.id);return n;});}else setSelectedTrack(i);}} onContextMenu={e=>{e.preventDefault();setChannelCtxMenu({x:e.clientX,y:e.clientY,trackId:t.id,trackIndex:i});}}>
                    <div className="daw-ch-colorbar" style={{ background: t.color || "#4a90d9" }}/>
                    <div className="daw-ch-header">
                      <span className="daw-ch-type-icon">{t.trackType === "midi" ? "🎹" : "🎙"}</span>
                      <span className="daw-ch-header-num">{i + 1}</span>
                    </div>
                    <div className="daw-ch-routing">
                      <span className="daw-ch-routing-value">{t.input || "Default In"}</span>
                      <MicModelSelector trackIndex={i} currentModel={trackMicModels[i] || "none"} onApply={handleConsoleMicModel}/>
                    </div>
                    <div className="daw-ch-inserts">
                      <div className="daw-ch-inserts-label">INSERTS</div>
                      {loaded.map(fx => (
                        <div key={fx.key} className={"daw-ch-insert-slot active " + (fx.type || "")}
                          onClick={e => { e.stopPropagation(); setSelectedTrack(i); setSelectedTrackIndex(i); setActiveEffectsTrack(i); setOpenFxKey(fx.key); }}
                          onContextMenu={e => { e.preventDefault(); e.stopPropagation(); updateEffect(i, fx.key, "enabled", false); }}>
                          {fx.name}
                        </div>
                      ))}
                      {loaded.length < 8 && (
                        <div className="daw-ch-insert-slot empty"
                          onClick={e => { e.stopPropagation(); const rect = e.currentTarget.getBoundingClientRect(); setInsertPickerState({ trackIndex: i, x: rect.right + 4, y: rect.top }); }}>
                          + Insert
                        </div>
                      )}
                    </div>
                    <div className="daw-ch-controls">
                      <div className={"daw-ch-badge" + (t.muted ? " m-on" : "")} onClick={e => { e.stopPropagation(); const nm = !t.muted; updateTrack(i, { muted: nm }); const audible = !nm && (!hasSolo || t.solo); if (trackGainsRef.current[i]) trackGainsRef.current[i].gain.value = audible ? t.volume : 0; }}>M</div>
                      <div className={"daw-ch-badge" + (t.solo ? " s-on" : "")} onClick={e => { e.stopPropagation(); const ns = !t.solo; updateTrack(i, { solo: ns }); const whs = tracks.some((x, idx) => idx === i ? ns : x.solo); tracks.forEach((x, idx) => { const gn = trackGainsRef.current[idx]; if (!gn) return; const s = idx === i ? ns : x.solo; gn.gain.value = (!x.muted && (!whs || s)) ? x.volume : 0; }); }}>S</div>
                      <div className={"daw-ch-badge" + (selectedTrack === i ? " e-on" : "")} onClick={e => { e.stopPropagation(); setSelectedTrack(i); setActiveEffectsTrack(i); }}>e</div>
                      <button className={"daw-ch-rec-btn" + (t.armed ? " armed" : "")} onClick={e => { e.stopPropagation(); updateTrack(i, { armed: !t.armed }); }} title="Record arm">●</button>
                    </div>
                    <div className="daw-ch-pan">
                      <PanKnob value={t.pan} onChange={v => updateTrack(i, { pan: v })} size={56}/>
                    </div>
                    <div className="daw-ch-fader-area">
                      <div className="daw-ch-fader-row">
                        <div className="daw-ch-db-scale" style={{textAlign:"right"}}><span>+6</span><span>0</span><span>-6</span><span>-12</span><span>-18</span><span>-∞</span></div>
                        <div className="daw-ch-fader">
                          <input type="range" min="0" max="1.26" step="0.005" value={t.volume}
                            onChange={e => { const v = parseFloat(e.target.value); updateTrack(i, { volume: v }); const audible = !t.muted && (!hasSolo || t.solo); if (trackGainsRef.current[i]) trackGainsRef.current[i].gain.value = audible ? v : 0; }}/>
                        </div>
                        <CubaseMeter leftLevel={meter.left || 0} rightLevel={meter.right || 0} height={180} showScale={false}/>
                        <div className="daw-ch-db-scale"><span>0</span><span>-6</span><span>-12</span><span>-18</span><span>-24</span><span>-∞</span></div>
                      </div>
                      <div className="daw-ch-vol-display" onClick={e => e.stopPropagation()}>
                        <input
                          className="daw-ch-vol-input"
                          type="number" step="0.1" min="-60" max="2"
                          value={t.volume > 0 ? (20 * Math.log10(t.volume)).toFixed(1) : "-60"}
                          onChange={e => {
                            const db = parseFloat(e.target.value);
                            if (isNaN(db)) return;
                            const v = Math.min(1.26, Math.max(0, Math.pow(10, db / 20)));
                            updateTrack(i, { volume: v });
                            const audible = !t.muted && (!hasSolo || t.solo);
                            if (trackGainsRef.current[i]) trackGainsRef.current[i].gain.value = audible ? v : 0;
                          }}
                          onClick={e => e.stopPropagation()}
                        />
                        <span className="daw-ch-vol-unit">dB</span>
                      </div>
                    </div>
                    <div className="daw-ch-automation">
                      <div className={"daw-ch-rw" + (t.readAutomation ? " active" : "")}>R</div>
                      <div className={"daw-ch-rw" + (t.writeAutomation ? " active" : "")}>W</div>
                    </div>
                    <div className="daw-ch-name">
                      <input className="daw-ch-name-input" value={t.name} onChange={e => updateTrack(i, { name: e.target.value })} onClick={e => e.stopPropagation()}/>
                      <select className="daw-ch-console-select" value={trackConsoleChar[t.id] || "none"} onChange={e => setTrackConsoleChar(prev => ({ ...prev, [t.id]: e.target.value }))} onClick={e => e.stopPropagation()}>
                        {Object.entries(CONSOLE_BOARDS).map(([id, b]) => <option key={id} value={id}>{b.name}</option>)}
                      </select>
                    </div>
                  </div>
                );
              })}

              {/* MASTER CHANNEL */}
              <div className="daw-channel master-channel">
                <div className="daw-ch-colorbar" style={{ background: "#ff8a3d" }}/>
                <div className="daw-ch-header">
                  <span className="daw-ch-type-icon">🎚</span>
                  <span className="daw-ch-header-num">M</span>
                </div>
                <div className="daw-ch-routing"><span className="daw-ch-routing-value">Stereo Out</span></div>
                <div className="daw-ch-inserts">
                  <div className="daw-ch-inserts-label">INSERTS</div>
                  <div className="daw-ch-insert-slot empty" onClick={e => { e.stopPropagation(); const rect = e.currentTarget.getBoundingClientRect(); setInsertPickerState({ trackIndex: -1, x: rect.right + 4, y: rect.top }); }}>+ Insert</div>
                </div>
                                <div className="daw-ch-pan" style={{padding:"4px 0"}}>
                  <PanKnob value={masterPan || 0} onChange={v => { setMasterPan(v); if (masterPanRef.current) masterPanRef.current.pan.value = v; }} size={56}/>
                </div>
                <div className="daw-ch-controls">
                  <div className="daw-ch-badge">M</div>
                  <div className="daw-ch-badge">S</div>
                  <div className="daw-ch-badge">e</div>
                  <div className="daw-ch-rec-btn"/>
                </div>
                <div className="daw-ch-pan">
                  <PanKnob value={masterPan} onChange={v => setMasterPan(v)} size={32}/>
                </div>
                <div className="daw-ch-fader-area">
                  <div className="daw-ch-fader-row">
                        <div className="daw-ch-db-scale" style={{textAlign:"right"}}><span>+6</span><span>0</span><span>-6</span><span>-12</span><span>-18</span><span>-∞</span></div>
                    <div className="daw-ch-fader">
                      <input type="range" min="0" max="1.26" step="0.005" value={masterVolume}
                        onChange={e => { const v = parseFloat(e.target.value); setMasterVolume(v); if (masterGainRef.current) masterGainRef.current.gain.value = v; }}/>
                    </div>
                    <CubaseMeter leftLevel={masterMeterLevels?.left || 0} rightLevel={masterMeterLevels?.right || 0} height={180} showScale={false}/>
                        <div className="daw-ch-db-scale"><span>0</span><span>-6</span><span>-12</span><span>-18</span><span>-24</span><span>-∞</span></div>
                  </div>
                  <div className="daw-ch-vol-display">
                    <span className="daw-ch-vol-val rs-orange">{masterVolume > 0 ? (20 * Math.log10(masterVolume)).toFixed(1) : "-∞"} dB</span>
                  </div>
                </div>
                <div className="daw-ch-automation">
                  <div className="daw-ch-rw">R</div>
                  <div className="daw-ch-rw">W</div>
                </div>
                <div className="daw-ch-name">
                  <span className="rs-master-label">MASTER</span>
                  <select className="daw-ch-console-select" value={masterConsoleChar} onChange={e => setMasterConsoleChar(e.target.value)}>
                    {Object.entries(CONSOLE_BOARDS).map(([id, b]) => <option key={id} value={id}>{b.name}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* BEAT MAKER */}
        {viewMode === "beatmaker" && (
          <SamplerBeatMaker onExport={handleBeatExport} onClose={() => setViewMode("arrange")} isEmbedded={true}
            onSendToArrange={(audioBuffer, name) => { const idx = selectedTrackIndex; updateTrack(idx, { audioBuffer, name: name || tracks[idx].name }); setViewMode("arrange"); setStatus(`Beat bounced to Track ${idx + 1}`); }}
            incomingSample={window.__spx_sampler_export || null} projectBpm={bpm} projectKey={pianoRollKey} projectScale={pianoRollScale} projectId={projectId}
            onBpmSync={newBpm => { setBpm(newBpm); setStatus(`✓ BPM synced: ${newBpm}`); }}
            onKeySync={(key, scale) => { setPianoRollKey(key); setPianoRollScale(scale); setStatus(`✓ Key synced: ${key} ${scale}`); }}
            onExportToArrange={(midiNotes) => {
              let drumTrackIdx = tracks.findIndex((t, idx) => (t.trackType === "midi" || t.trackType === "instrument") && instrumentEngine.getTrackInstrument(idx)?.isDrum);
              if (drumTrackIdx === -1) { setTracks(prev => { drumTrackIdx = prev.length; return [...prev, DEFAULT_TRACK(prev.length, "midi")]; }); }
              const region = createMidiRegionFromNotes(midiNotes, "Beat Pattern");
              region.startBeat = isPlaying ? playheadBeat : 0;
              setTracks(prev => prev.map((t, i) => i === drumTrackIdx ? { ...t, regions: [...(t.regions || []), region] } : t));
              setStatus(`🥁 Beat → Arrange Track ${drumTrackIdx + 1}`); setViewMode("arrange");
            }}
            chordsComponent={<ChordProgressionGenerator musicalKey={pianoRollKey} scale={pianoRollScale} bpm={bpm} timeSignature={timeSignature} onInsertChords={handleChordInsert} onKeyChange={handleChordKeyChange} audioContext={audioCtxRef.current} onClose={() => {}} isEmbedded={true}/>}
            soundsComponent={<FreesoundBrowser audioContext={audioCtxRef.current} onSoundSelect={(audioBuffer, name, audioUrl) => { const ai = tracks.findIndex(t => t.armed); if (ai !== -1) { updateTrack(ai, { audioBuffer, audio_url: audioUrl, name: name || "Freesound Sample" }); setStatus(`🎵 "${name}" → Track ${ai + 1}`); } else { window.__spx_sampler_export = { buffer: audioBuffer, name, timestamp: Date.now() }; setStatus(`🎵 "${name}" loaded to Sampler`); } }} isEmbedded={true}/>}
            loopsComponent={<LoopermanBrowser audioContext={audioCtxRef.current} onSoundSelect={(audioBuffer, name, audioUrl) => { const ai = tracks.findIndex(t => t.armed); if (ai !== -1) { updateTrack(ai, { audioBuffer, audio_url: audioUrl, name: name || "Loop" }); createRegionFromImport(ai, audioBuffer, name || "Loop", audioUrl); setStatus(`✓ "${name}" → Track ${ai + 1}`); } else { window.__spx_sampler_export = { buffer: audioBuffer, name, timestamp: Date.now() }; setStatus(`Loop "${name}" sent to Sampler`); } }} onClose={() => {}} isEmbedded={true}/>}
            aiBeatsComponent={<AIBeatAssistant onApplyPattern={handleAIBeatApply} onClose={() => {}} isEmbedded={true}/>}
            voiceMidiComponent={<VoiceToMIDI audioContext={audioCtxRef.current} bpm={bpm} isEmbedded={true} onNoteOn={({ note, velocity }) => { const armedIdx = tracks.findIndex(t => t.armed && (t.trackType === "midi" || t.trackType === "instrument")); if (armedIdx !== -1) instrumentEngine.playNoteOnTrack(armedIdx, note, velocity); }} onNoteOff={({ note }) => { const armedIdx = tracks.findIndex(t => t.armed && (t.trackType === "midi" || t.trackType === "instrument")); if (armedIdx !== -1) instrumentEngine.stopNoteOnTrack(armedIdx, note); }}/>}
          />
        )}

        {viewMode === "pianoroll"    && <div className="daw-pianoroll-view"><PianoRoll notes={pianoRollNotes} onNotesChange={handlePianoRollNotesChange} bpm={bpm} timeSignature={timeSignature} musicalKey={pianoRollKey} scale={pianoRollScale} isPlaying={isPlaying} currentBeat={playheadBeat} audioContext={audioCtxRef.current} onExport={handlePianoRollExport} onClose={() => setViewMode("beatmaker")} isEmbedded={true} editingRegion={editingRegion} onSaveToRegion={savePianoRollToRegion}/></div>}
        {viewMode === "chords"       && <div className="daw-chords-view"><ChordProgressionGenerator musicalKey={pianoRollKey} scale={pianoRollScale} bpm={bpm} timeSignature={timeSignature} onInsertChords={handleChordInsert} onKeyChange={handleChordKeyChange} audioContext={audioCtxRef.current} onClose={() => setViewMode("pianoroll")} isEmbedded={true}/></div>}
        {viewMode === "piano"        && <div className="daw-piano-view rs-view-full"><VirtualPiano audioContext={audioCtxRef.current} onRecordingComplete={() => {}} embedded={true}/></div>}
        {viewMode === "sounds"       && <div className="daw-freesound-view"><FreesoundBrowser audioContext={audioCtxRef.current} onSoundSelect={(audioBuffer, name, audioUrl) => { const armedMidi = tracks.findIndex(t => t.armed && (t.trackType === "midi" || t.trackType === "instrument")); if (armedMidi !== -1) { instrumentEngine.loadSampleOntoTrack(armedMidi, audioBuffer, name, 60); setStatus(`🎵 "${name}" → Track ${armedMidi + 1} — play keys to hear`); } else { const ai = tracks.findIndex(t => t.armed); if (ai !== -1) { updateTrack(ai, { audioBuffer, audio_url: audioUrl, name: name || "Freesound Sample" }); createRegionFromImport(ai, audioBuffer, name || "Freesound Sample", audioUrl); setStatus(`✓ "${name}" loaded → Track ${ai + 1}`); } else { window.__spx_sampler_export = { buffer: audioBuffer, name, timestamp: Date.now() }; setViewMode("beatmaker"); setStatus(`Sample "${name}" sent to Beat Maker`); } } }} onApplyMicProfile={handleApplyMicProfile} onClose={() => setShowMicSimModal(false)} isEmbedded={true}/></div>}
        {viewMode === "vocal"        && <div className="daw-vocal-view rs-view-scroll"><VocalProcessor audioContext={audioCtxRef.current} liveStream={micSimStream} onRecordingComplete={(blob) => { const ai = tracks.findIndex(t => t.armed); if (ai === -1) { setStatus("⚠ Arm a track first"); return; } const ctx = getCtx(); const audioUrl = URL.createObjectURL(blob); blob.arrayBuffer().then(ab => ctx.decodeAudioData(ab)).then(buf => { updateTrack(ai, { audioBuffer: buf, audio_url: audioUrl }); createRegionFromRecording(ai, buf, audioUrl); uploadTrack(blob, ai); setStatus(`✓ Vocal recorded → Track ${ai + 1}`); setViewMode("arrange"); }).catch(e => setStatus(`✗ ${e.message}`)); }} onApplyMicProfile={handleApplyMicProfile} onClose={() => setViewMode("arrange")} isEmbedded={true}/></div>}
        {viewMode === "keyfinder"    && <div className="daw-keyfinder-view"><KeyFinder tracks={tracks} audioContext={audioCtxRef.current} onClose={() => setViewMode("arrange")} isEmbedded={true}/><div className="rs-bottom-toolbar"><button onClick={() => setShowMicBuilder(true)} className="rs-action-btn-teal">🔧 Build Custom Mic</button>{customMicProfiles.length > 0 && <span className="rs-muted-text">{customMicProfiles.length} custom profile{customMicProfiles.length > 1 ? "s" : ""} saved</span>}</div>{showMicBuilder && (<div className="rs-modal-overlay"><div className="rs-modal-panel"><CustomMicBuilder onSave={(profileId, profile) => { setCustomMicProfiles(prev => [...prev.filter(p => p.id !== profileId), { id: profileId, ...profile }]); setShowMicBuilder(false); }} onClose={() => setShowMicBuilder(false)}/></div></div>)}</div>}
        {viewMode === "aibeat"       && <div className="daw-aibeat-view"><AIBeatAssistant onApplyPattern={handleAIBeatApply} onClose={() => setViewMode("beatmaker")} isEmbedded={true}/></div>}
        {viewMode === "aimix"        && <div className="daw-aimix-view rs-view-scroll"><AIMixAssistant tracks={tracks} projectId={projectId} bpm={bpm} timeSignature={timeSignature} onApplyVolume={handleAIApplyVolume} onApplyPan={handleAIApplyPan} onApplyEQ={handleAIApplyEQ} onApplyCompression={handleAIApplyCompression} onClose={() => setViewMode("arrange")} isEmbedded={true}/></div>}
        {viewMode === "plugins"      && <div className="rs-flex-hidden"><UnifiedFXChain track={tracks[selectedTrackIndex]} trackIndex={selectedTrackIndex} audioContext={audioCtxRef.current} updateEffect={updateEffect} onClose={() => setViewMode("arrange")} isEmbedded={true}/></div>}
        {viewMode === "fx"           && <div className="rs-flex-scroll-dark"><UnifiedFXChain track={tracks[selectedTrackIndex]} trackIndex={selectedTrackIndex} audioContext={audioCtxRef.current} updateEffect={updateEffect} onClose={() => setViewMode("arrange")} isEmbedded={true}/></div>}
        {viewMode === "multiband"    && <div className="rs-flex-scroll-dark"><MultibandEffects audioContext={audioCtxRef.current} inputNode={selectedTrackIndex !== null && trackGainsRef.current[selectedTrackIndex] ? trackGainsRef.current[selectedTrackIndex] : masterGainRef.current} outputNode={masterGainRef.current} onClose={() => setViewMode("arrange")} isEmbedded={true}/></div>}
        {viewMode === "mastering"    && <div className="rs-flex-scroll-dark"><MasteringChain audioContext={audioCtxRef.current} inputNode={masterConsoleOutRef.current || masterGainRef.current} outputNode={audioCtxRef.current?.destination} masterVolume={masterVolume} onClose={() => setViewMode("arrange")} isEmbedded={true}/></div>}
        {viewMode === "speakersim"   && <SpeakerSimulator audioContext={audioCtxRef.current} inputNode={masterConsoleOutRef.current || masterGainRef.current}/>}
        {showVoxEngine && (
          <div style={{position:'fixed',inset:0,zIndex:9998,background:'rgba(0,0,0,0.85)',display:'flex',alignItems:'center',justifyContent:'center'}}>
            <div style={{width:'min(95vw,900px)',maxHeight:'90vh',overflow:'auto',borderRadius:'8px',border:'1px solid #1a2d45'}}>
              <SPXVoxEngine
                audioContext={audioCtxRef.current}
                inputNode={trackNodesRef.current?.get(voxTrackId)?.fader || masterGainRef.current}
                outputNode={masterGainRef.current}
                onClose={() => setShowVoxEngine(false)}
              />
            </div>
          </div>
        )}
        {showMonitorSelector && (
          <SPXMonitorSelector
            selectedRoom={roomSim}
            selectedConsole={masterConsoleChar}
            onRoomChange={v => setRoomSim(v)}
            onConsoleChange={v => { setMasterConsoleChar(v); masterConsoleCharRef.current = v; }}
            onClose={() => setShowMonitorSelector(false)}
          />
        )}
        {/* ── MONITOR BAR — always visible at bottom of DAW ── */}
        <div className="daw-monitor-bar">
          <button className="daw-monitor-btn" onClick={() => setShowMonitorSelector(true)} style={{borderColor:'#00ffc855',color:'#00ffc8'}}>🏛 BROWSE</button>
          <span className="daw-monitor-label">MONITOR</span>
          <select
            className="daw-monitor-select"
            value={monitorSpeaker}
            onChange={e => setMonitorSpeaker(e.target.value)}
          >
            <optgroup label="Studio Monitors">
              {["flat","ns10","auratone","genelec","krk","adam","focal","avantone","mackie","jbl306","eve","amphion"].map(id => (
                <option key={id} value={id}>{id==="flat"?"Flat (Bypass)":id==="ns10"?"Yamaha NS-10":id==="auratone"?"Auratone 5C":id==="genelec"?"Genelec 8030":id==="krk"?"KRK Rokit 8":id==="adam"?"Adam A7X":id==="focal"?"Focal Alpha 65":id==="avantone"?"Avantone MixCube":id==="mackie"?"Mackie HR824":id==="jbl306"?"JBL 306P":id==="eve"?"Eve SC207":"Amphion One18"}</option>
              ))}
            </optgroup>
            <optgroup label="Consumer Devices">
              {["iphone","car","macbook","airpods","club","bluetooth","tv","homepod"].map(id => (
                <option key={id} value={id}>{id==="iphone"?"iPhone":id==="car"?"Car Stereo":id==="macbook"?"MacBook":id==="airpods"?"AirPods":id==="club"?"Club PA":id==="bluetooth"?"Bluetooth":id==="tv"?"TV":"HomePod"}</option>
              ))}
            </optgroup>
          </select>
          <span className="daw-monitor-divider">|</span>
          <span className="daw-monitor-label">ROOM</span>
          <select className="daw-monitor-select" value={roomSim} onChange={e => setRoomSim(e.target.value)}>
            <option value="none">No Room</option>
            <option value="studio_a">Studio A</option>
            <option value="abbey_road">Abbey Road</option>
            <option value="power_sta">Power Station</option>
            <option value="electric">Electric Lady</option>
            <option value="mdm_studio">MDM Studios</option>
          </select>
          <span className="daw-monitor-divider">|</span>
          <button
            className={`daw-monitor-btn${monoCheck ? " active" : ""}`}
            onClick={() => setMonoCheck(p => !p)}
            title="Mono compatibility check"
          >MONO</button>
          <label className={`daw-monitor-btn${abRef ? " active" : ""}${abRefBuffer ? "" : " dim"}`}
            title={abRefBuffer ? "Toggle A/B reference" : "Click to load reference track"}
            style={{cursor:'pointer'}}
          >
            A/B
            {!abRefBuffer && <input type="file" accept="audio/*" style={{display:'none'}}
              onChange={e => e.target.files[0] && loadAbReference(e.target.files[0])} />}
            {abRefBuffer && <span onClick={e => { e.preventDefault(); toggleAbRef(); }}
              style={{position:'absolute',inset:0}} />}
          </label>
          <span className="daw-monitor-divider">|</span>
          <button
            className={`daw-monitor-btn${binauralOn ? " active" : ""}`}
            onClick={() => setBinauralOn(p => !p)}
            title="Binaural headphone correction"
          >BNARL</button>
          <span className="daw-monitor-divider">|</span>
          <span className="daw-monitor-label">LUFS</span>
          <span className="daw-monitor-lufs" style={{color: lufsValue > -14 ? '#ff6b6b' : lufsValue > -18 ? '#ffaa00' : '#00ffc8'}}>
            {lufsValue.toFixed(1)}
          </span>
        </div>}
        {viewMode === "looperman"    && <div className="rs-flex-hidden"><LoopermanBrowser audioContext={audioCtxRef.current} onSoundSelect={(audioBuffer, name, audioUrl) => { const ai = tracks.findIndex(t => t.armed); if (ai !== -1) { updateTrack(ai, { audioBuffer, audio_url: audioUrl, name: name || "Loop" }); createRegionFromImport(ai, audioBuffer, name || "Loop", audioUrl); setStatus(`✓ "${name}" → Track ${ai + 1}`); } else { window.__spx_sampler_export = { buffer: audioBuffer, name, timestamp: Date.now() }; setViewMode("beatmaker"); setStatus(`Loop "${name}" sent to Beat Maker`); } }} onClose={() => setViewMode("arrange")} isEmbedded={true}/></div>}
        {viewMode === "synth"        && <div className="daw-synth-view rs-view-auto"><SynthCreator onClose={() => setViewMode("arrange")} onAssignToTrack={(preset, audioBuffer) => { if (!audioBuffer) { setStatus("🎛️ Use Assign to Track in Synth Creator"); return; } landBufferOnTrack(audioBuffer, preset?.name || "Synth"); }}/></div>}
        {viewMode === "drumdesigner" && <div className="daw-drumdesigner-view rs-view-auto"><DrumDesigner onClose={() => setViewMode("beatmaker")} onAssignToPad={(data) => { if (data.audioBuffer) window.__spx_sampler_export = { buffer: data.audioBuffer, name: (data.type || "Drum").toUpperCase(), timestamp: Date.now() }; setStatus(`🥁 ${(data.type || "Drum").toUpperCase()} → Beat Maker pad`); setViewMode("beatmaker"); }} onAssignToTrack={(data) => { if (!data.audioBuffer) { setStatus("🥁 Use Send to Track in Drum Designer"); return; } landBufferOnTrack(data.audioBuffer, (data.type || "Drum").toUpperCase()); }}/></div>}
        {viewMode === "instrbuilder" && <div className="daw-instrbuilder-view rs-view-auto"><InstrumentBuilder onClose={() => setViewMode("arrange")} onAssignToTrack={(preset, audioBuffer) => { if (!audioBuffer) { setStatus("🎸 Use Assign to Track in Instrument Builder"); return; } landBufferOnTrack(audioBuffer, preset?.instrName || "Instrument"); }}/></div>}
        {viewMode === "voicemidi"    && <div className="daw-voicemidi-view"><VoiceToMIDI audioContext={audioCtxRef.current} bpm={bpm} isEmbedded={true} onNoteOn={({ note, velocity }) => { const armedIdx = tracks.findIndex(t => t.armed && (t.trackType === "midi" || t.trackType === "instrument")); if (armedIdx !== -1) instrumentEngine.playNoteOnTrack(armedIdx, note, velocity); }} onNoteOff={({ note }) => { const armedIdx = tracks.findIndex(t => t.armed && (t.trackType === "midi" || t.trackType === "instrument")); if (armedIdx !== -1) instrumentEngine.stopNoteOnTrack(armedIdx, note); }} onNotesGenerated={(notes) => { if (!notes?.length) return; const armedIdx = tracks.findIndex(t => t.armed && (t.trackType === "midi" || t.trackType === "instrument")); if (armedIdx === -1) return; const beatsPerSec = bpm / 60; const midiNotes = notes.map((n, i) => ({ id: `voice_${Date.now()}_${i}`, note: n.note, velocity: n.velocity || 80, startBeat: (n.startTime || n.time || 0) * beatsPerSec, duration: Math.max((n.duration || 0.25) * beatsPerSec, 0.125) })); const inst = instrumentEngine.getTrackInstrument(armedIdx); const region = createMidiRegionFromNotes(midiNotes, inst?.isDrum ? "Beatbox Pattern" : "Voice Melody"); if (playheadBeat > 0) { const offset = region.startBeat; region.startBeat = playheadBeat; region.notes = region.notes.map(n => ({ ...n, startBeat: n.startBeat - offset })); } setTracks(prev => prev.map((t, i) => i === armedIdx ? { ...t, regions: [...(t.regions || []), region] } : t)); setStatus(`🎤 ${midiNotes.length} notes from voice → Track ${armedIdx + 1}`); }} onSendToTrack={(audioBuffer, name) => { const idx = selectedTrackIndex; updateTrack(idx, { audioBuffer, name: name || tracks[idx].name }); setViewMode("arrange"); setStatus(`Vocal MIDI render → Track ${idx + 1}`); }} onClose={() => setViewMode("arrange")}/></div>}
        {viewMode === "takelanes"    && <div className="rs-flex-hidden"><TakeLanes audioContext={audioCtxRef.current} bpm={bpm} onCompositeReady={(compositeBuffer, name) => { const ai = tracks.findIndex(t => t.armed); const targetIdx = ai !== -1 ? ai : selectedTrackIndex; const audioUrl = URL.createObjectURL(new Blob([], { type: "audio/wav" })); updateTrack(targetIdx, { audioBuffer: compositeBuffer, audio_url: audioUrl, name: name || "Comp" }); createRegionFromImport(targetIdx, compositeBuffer, name || "Comp", audioUrl); setStatus(`✓ ${name} → Track ${targetIdx + 1}`); setViewMode("arrange"); }} isEmbedded={true}/></div>}

        {/* ANALOG SUITE */}
        {viewMode === "analog" && (
          <div className="rs-flex-scroll-darker">
            <div className="rs-analog-scale">
              <div className="rs-analog-tabs">
                {[["ampsim","🎸 Amp Sim"],["tape","📼 Tape & Harmonic"],["pedals","🎛️ Pedal Chain"],["console","🎚️ Console"]].map(([id, label]) => (
                  <button key={id} onClick={() => setAnalogSubview(id)} className={"daw-analog-tab" + (analogSubview === id ? " active" : "")}>{label}</button>
                ))}
              </div>
              {analogSubview === "ampsim"   && <div className="rs-amp-panel"><h3 className="rs-amp-heading">🎸 Guitar & Bass Amp Simulator</h3><p className="rs-amp-subtext">6 amp models · Cabinet sim · Pedal chain · Web Audio processing</p><div className="rs-amp-scale"><AmpSimPlugin audioContext={null} inputNode={null} outputNode={null}/></div></div>}
              {analogSubview === "tape"     && (
                <div className="rs-settings-panel">
                  <div className="rs-dark-card">
                    <div className="rs-card-header"><div><h4 className="rs-card-title">📼 Tape Saturation</h4><p className="rs-card-subtitle">Analog warmth via waveshaper + lowpass filter</p></div><label className="rs-toggle-label"><input type="checkbox" checked={tapeEnabled} onChange={e => { setTapeEnabled(e.target.checked); setFx(f => ({ ...f, tapeSaturation: { ...f.tapeSaturation, enabled: e.target.checked } })); if (audioCtxRef.current) { tracks.forEach(t => { const old = trackNodesRef.current.get(t.id); if (old) { ["input","preGain","panNode","fader","meter"].forEach(k => { try { old[k].disconnect(); } catch (_) {} }); (old.fxNodes || []).forEach(n => { try { n.disconnect(); } catch (_) {} }); } trackNodesRef.current.delete(t.id); ensureTrackGraph(t); }); } }}/><span className={"daw-tape-label" + (tapeEnabled ? " on" : "")}>{tapeEnabled ? "ON" : "OFF"}</span></label></div>
                    {[["DRIVE", tapeDrive, setTapeDrive, "drive"],["WARMTH", tapeWarmth, setTapeWarmth, "warmth"]].map(([lbl, val, setter, key]) => (
                      <div key={lbl} className="rs-param-row"><div className="rs-param-header"><span>{lbl}</span><span className="rs-orange">{(val * 100).toFixed(0)}%</span></div><input type="range" min={0} max={1} step={0.01} value={val} className="rs-range-orange" onChange={e => { const v = parseFloat(e.target.value); setter(v); setFx(f => ({ ...f, tapeSaturation: { ...f.tapeSaturation, [key]: v } })); tracks.forEach(t => rebuildTrackGraph(t.id)); }}/></div>
                    ))}
                  </div>
                  <div className="rs-dark-card">
                    <div className="rs-card-header"><div><h4 className="rs-card-title">⚡ Harmonic Exciter</h4><p className="rs-card-subtitle">Aphex-style presence enhancer</p></div><label className="rs-toggle-label"><input type="checkbox" checked={harmonicEnabled} onChange={e => { setHarmonicEnabled(e.target.checked); setFx(f => ({ ...f, exciter: { ...f.exciter, enabled: e.target.checked } })); tracks.forEach(t => rebuildTrackGraph(t.id)); }}/><span className={"daw-harmonic-label" + (harmonicEnabled ? " on" : "")}>{harmonicEnabled ? "ON" : "OFF"}</span></label></div>
                    <div className="rs-param-header"><span>AMOUNT</span><span className="rs-yellow-text">{(harmonicAmount * 100).toFixed(0)}%</span></div>
                    <input type="range" min={0} max={1} step={0.01} value={harmonicAmount} className="rs-range-yellow" onChange={e => { const v = parseFloat(e.target.value); setHarmonicAmount(v); setFx(f => ({ ...f, exciter: { ...f.exciter, amount: v } })); tracks.forEach(t => rebuildTrackGraph(t.id)); }}/>
                  </div>
                </div>
              )}
              {analogSubview === "pedals"  && <div className="rs-amp-panel"><h4 className="daw-pedals-heading">🎛️ Signal Chain</h4><p className="daw-pedals-sub">Analog-modeled effects in series — Tuner → Compressor → Overdrive → Chorus → Delay → Reverb</p><div className="rs-chain-grid">{[["🎵","Tuner"],["🗜️","Compressor"],["🔥","Overdrive"],["🌊","Chorus"],["⏱️","Delay"],["🏔️","Reverb"]].map(([icon, name]) => (<div key={name} className="rs-effect-card daw-pedal-card"><span className="rs-effect-icon">{icon}</span><span className="rs-effect-name">{name}</span><div className="rs-effect-knob"/></div>))}</div><p className="rs-hint-sm">Full pedal chain in Amp Sim tab → Pedal Chain section</p></div>}
              {analogSubview === "console" && <div className="rs-console-panel"><div className="rs-console-label">CONSOLE CHARACTER — Applied to each track and master bus</div><div className="rs-console-btn-row">{Object.entries(CONSOLE_BOARDS).map(([id, b]) => (<button key={id} onClick={() => { const nc = {}; tracks.forEach(t => { nc[t.id] = id; }); setTrackConsoleChar(nc); }} className="daw-console-board-btn" style={{ borderColor: b.color, background: id === "none" ? "#0d1117" : `${b.color}22`, color: b.color }}>{b.name}</button>))}</div><div className="rs-master-bus-label">MASTER BUS</div><div className="rs-console-btn-row">{Object.entries(CONSOLE_BOARDS).map(([id, b]) => (<button key={id} onClick={() => setMasterConsoleChar(id)} className="daw-console-board-btn-sm" style={{ borderColor: masterConsoleChar === id ? b.color : "#21262d", background: masterConsoleChar === id ? `${b.color}22` : "#0d1117", color: masterConsoleChar === id ? b.color : "#4e6a82" }}>{b.name}</button>))}</div><div className="rs-console-hint">Per-track: Use the Console tab dropdown on each channel strip</div></div>}
            </div>
          </div>
        )}

        {/* MIC SIM MODAL */}
        {showMicSimModal && (
          <div className="daw-plugin-modal rs-plugin-modal">
            <button onClick={() => setShowMicSimModal(false)} className="rs-modal-close">✕</button>
            <MicSimulator audioContext={audioCtxRef.current} liveStream={micSimStream}
              onRecordingComplete={(blob) => { const ai = tracks.findIndex(t => t.armed); if (ai === -1) { setStatus("⚠ Arm a track first"); return; } const ctx = getCtx(); const audioUrl = URL.createObjectURL(blob); blob.arrayBuffer().then(ab => ctx.decodeAudioData(ab)).then(buf => { updateTrack(ai, { audioBuffer: buf, audio_url: audioUrl }); createRegionFromRecording(ai, buf, audioUrl); uploadTrack(blob, ai); setStatus(`✓ Mic Sim recorded → Track ${ai + 1}`); setViewMode("arrange"); }).catch(e => setStatus(`✗ ${e.message}`)); }}
              onApplyMicProfile={handleApplyMicProfile} onClose={() => setViewMode("arrange")} isEmbedded={true}/>
            <div className="rs-bottom-toolbar">
              <button onClick={() => setShowMicBuilder(true)} className="rs-action-btn-teal">🔧 Build Custom Mic</button>
              {customMicProfiles.length > 0 && <span className="rs-muted-text">{customMicProfiles.length} custom profile{customMicProfiles.length > 1 ? "s" : ""} saved</span>}
            </div>
            {showMicBuilder && (<div className="rs-modal-overlay"><div className="rs-modal-panel"><CustomMicBuilder onSave={(profileId, profile) => { setCustomMicProfiles(prev => [...prev.filter(p => p.id !== profileId), { id: profileId, ...profile }]); setShowMicBuilder(false); }} onClose={() => setShowMicBuilder(false)}/></div></div>)}
          </div>
        )}

        {/* VOCAL MODAL */}
        {showVocalModal && (
          <div className="daw-plugin-modal rs-plugin-modal">
            <button onClick={() => setShowVocalModal(false)} className="rs-modal-close">✕</button>
            <VocalProcessor audioContext={audioCtxRef.current} isEmbedded={true} tracks={tracks} selectedTrackIndex={selectedTrackIndex} bpm={bpm}
              onApplyToConsole={handleApplyVocalFx} onClose={() => setShowVocalModal(false)}
              onSendToTrack={(buf, name) => { const ai = tracks.findIndex(t => t.armed); const idx = ai !== -1 ? ai : selectedTrackIndex; const audioUrl = URL.createObjectURL(new Blob([])); updateTrack(idx, { audioBuffer: buf, audio_url: audioUrl, name: name || tracks[idx].name }); createRegionFromImport(idx, buf, name || "Vocal Take", audioUrl); setStatus(`✓ Vocal take → Track ${idx + 1}`); setViewMode("arrange"); }}
              onRecordingComplete={(blob) => { const ai = tracks.findIndex(t => t.armed); if (ai !== -1) uploadTrack(blob, ai); }}/>
          </div>
        )}

        {/* PROJECT LIST MODAL */}
        {showProjectList && (
          <div className="daw-modal-overlay" onClick={() => setShowProjectList(false)}>
            <div className="daw-modal" onClick={e => e.stopPropagation()}>
              <h2>Open Project</h2>
              {projects.length === 0 ? <p className="daw-empty">No saved projects</p> : (
                <div className="daw-project-list">
                  {projects.map(p => (
                    <button key={p.id} className="daw-project-item" onClick={() => loadProject(p.id)}>
                      <span className="daw-project-name">{p.name}</span>
                      <span className="daw-project-meta">{p.bpm} BPM · {new Date(p.updated_at).toLocaleDateString()}</span>
                    </button>
                  ))}
                </div>
              )}
              <button className="daw-btn" onClick={() => setShowProjectList(false)}>Close</button>
            </div>
          </div>
        )}

        {/* INSERT PICKER */}
        {insertPickerState && (
          <div className="daw-insert-picker" style={{position:"fixed", left:Math.min(insertPickerState.x, window.innerWidth-340), top:Math.min(insertPickerState.y, window.innerHeight-520), zIndex:9999, maxHeight:"65vh", overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
            <InsertPickerMenu
              insertPickerState={insertPickerState}
              setInsertPickerState={setInsertPickerState}
              tracks={tracks}
              updateEffect={updateEffect}
              setActiveEffectsTrack={setActiveEffectsTrack}
              setOpenFxKey={setOpenFxKey}
              setShowVocalModal={setShowVocalModal}
              setShowMicSimModal={setShowMicSimModal}
              setStatus={setStatus}
            />
          </div>
        )}


        {/* ── EXPORT AUDIO MIXDOWN MODAL ── */}
        {showExportModal && (
          <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.75)",zIndex:10000,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={()=>setShowExportModal(false)}>
            <div style={{background:"#0d1117",border:"1px solid #243048",borderRadius:8,width:620,maxWidth:"95vw",padding:0,boxShadow:"0 24px 64px rgba(0,0,0,.9)"}} onClick={e=>e.stopPropagation()}>
              <div style={{background:"#161b22",borderBottom:"1px solid #1e2638",padding:"14px 20px",display:"flex",justifyContent:"space-between",alignItems:"center",borderRadius:"8px 8px 0 0"}}>
                <span style={{color:"#cdd9e5",fontWeight:800,fontSize:14,letterSpacing:1}}>EXPORT AUDIO MIXDOWN</span>
                <button onClick={()=>setShowExportModal(false)} style={{background:"none",border:"none",color:"#8ba3bc",cursor:"pointer",fontSize:18}}>✕</button>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:0}}>
                {/* LEFT — Channel Selection */}
                <div style={{borderRight:"1px solid #1e2638",padding:"16px"}}>
                  <div style={{color:"#4e6a82",fontSize:10,letterSpacing:1.5,textTransform:"uppercase",marginBottom:8,fontWeight:700}}>Channel Selection</div>
                  <div style={{display:"flex",gap:8,marginBottom:12}}>
                    <button onClick={()=>setExportSettings(p=>({...p,mode:"mixdown"}))} style={{flex:1,padding:"6px 0",background:exportSettings.mode==="mixdown"?"#00ffc822":"#0d1117",border:`1px solid ${exportSettings.mode==="mixdown"?"#00ffc8":"#243048"}`,color:exportSettings.mode==="mixdown"?"#00ffc8":"#8ba3bc",borderRadius:4,cursor:"pointer",fontSize:11,fontWeight:700}}>MIXDOWN</button>
                    <button onClick={()=>setExportSettings(p=>({...p,mode:"stems"}))} style={{flex:1,padding:"6px 0",background:exportSettings.mode==="stems"?"#00ffc822":"#0d1117",border:`1px solid ${exportSettings.mode==="stems"?"#00ffc8":"#243048"}`,color:exportSettings.mode==="stems"?"#00ffc8":"#8ba3bc",borderRadius:4,cursor:"pointer",fontSize:11,fontWeight:700}}>STEMS</button>
                  </div>
                  <div style={{maxHeight:200,overflowY:"auto",border:"1px solid #1e2638",borderRadius:4}}>
                    <div style={{padding:"6px 10px",background:"#161b22",color:"#00ffc8",fontSize:10,fontWeight:700,letterSpacing:1,textTransform:"uppercase",borderBottom:"1px solid #1e2638",display:"flex",justifyContent:"space-between",cursor:"pointer"}} onClick={()=>setExportSettings(p=>({...p,selectedTracks:[]}))}>
                      <span>✓ Stereo Out</span>
                    </div>
                    {tracks.map((t,i)=>(
                      <div key={t.id} style={{padding:"6px 10px",display:"flex",alignItems:"center",gap:8,borderBottom:"1px solid #0d1219",cursor:"pointer",background:exportSettings.selectedTracks.includes(i)?"rgba(0,255,200,.05)":"transparent"}}
                        onClick={()=>setExportSettings(p=>({...p,selectedTracks:p.selectedTracks.includes(i)?p.selectedTracks.filter(x=>x!==i):[...p.selectedTracks,i]}))}>
                        <input type="checkbox" readOnly checked={exportSettings.mode==="mixdown"||exportSettings.selectedTracks.includes(i)} style={{accentColor:"#00ffc8"}}/>
                        <div style={{width:8,height:8,borderRadius:2,background:t.color||"#4a90d9",flexShrink:0}}/>
                        <span style={{color:"#cdd9e5",fontSize:11,flex:1}}>{t.name||`Track ${i+1}`}</span>
                        {t.audioBuffer && <span style={{color:"#4e6a82",fontSize:9}}>●</span>}
                      </div>
                    ))}
                  </div>
                </div>
                {/* RIGHT — File Format */}
                <div style={{padding:"16px"}}>
                  <div style={{color:"#4e6a82",fontSize:10,letterSpacing:1.5,textTransform:"uppercase",marginBottom:8,fontWeight:700}}>File Format</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
                    {["wav","mp3","flac","aiff"].map(fmt=>(
                      <button key={fmt} onClick={()=>setExportSettings(p=>({...p,format:fmt}))}
                        style={{padding:"8px 0",background:exportSettings.format===fmt?"#00ffc822":"#0d1117",border:`1px solid ${exportSettings.format===fmt?"#00ffc8":"#243048"}`,color:exportSettings.format===fmt?"#00ffc8":"#8ba3bc",borderRadius:4,cursor:"pointer",fontSize:11,fontWeight:700,textTransform:"uppercase"}}>
                        {fmt}
                      </button>
                    ))}
                  </div>
                  <div style={{marginBottom:10}}>
                    <label style={{color:"#8ba3bc",fontSize:10,display:"block",marginBottom:4}}>SAMPLE RATE</label>
                    <select value={exportSettings.sampleRate} onChange={e=>setExportSettings(p=>({...p,sampleRate:+e.target.value}))}
                      style={{width:"100%",background:"#0d1117",border:"1px solid #243048",color:"#cdd9e5",padding:"6px 8px",borderRadius:4,fontSize:11}}>
                      <option value={44100}>44.100 kHz</option>
                      <option value={48000}>48.000 kHz</option>
                      <option value={96000}>96.000 kHz</option>
                    </select>
                  </div>
                  <div style={{marginBottom:10}}>
                    <label style={{color:"#8ba3bc",fontSize:10,display:"block",marginBottom:4}}>BIT DEPTH</label>
                    <select value={exportSettings.bitDepth} onChange={e=>setExportSettings(p=>({...p,bitDepth:+e.target.value}))}
                      style={{width:"100%",background:"#0d1117",border:"1px solid #243048",color:"#cdd9e5",padding:"6px 8px",borderRadius:4,fontSize:11}}>
                      <option value={16}>16-bit</option>
                      <option value={24}>24-bit</option>
                      <option value={32}>32-bit float</option>
                    </select>
                  </div>
                  <div style={{marginBottom:10}}>
                    <label style={{color:"#8ba3bc",fontSize:10,display:"block",marginBottom:4}}>FILE NAME</label>
                    <input value={exportSettings.filename||projectName} onChange={e=>setExportSettings(p=>({...p,filename:e.target.value}))}
                      style={{width:"100%",background:"#0d1117",border:"1px solid #243048",color:"#cdd9e5",padding:"6px 8px",borderRadius:4,fontSize:11,boxSizing:"border-box"}}/>
                  </div>
                  <div style={{marginBottom:10}}>
                    <label style={{color:"#8ba3bc",fontSize:10,display:"block",marginBottom:4}}>AFTER EXPORT</label>
                    <select style={{width:"100%",background:"#0d1117",border:"1px solid #243048",color:"#cdd9e5",padding:"6px 8px",borderRadius:4,fontSize:11}}>
                      <option>Do Nothing</option>
                      <option>Open in New Track</option>
                    </select>
                  </div>
                </div>
              </div>
              {/* Footer */}
              <div style={{borderTop:"1px solid #1e2638",padding:"12px 20px",display:"flex",justifyContent:"flex-end",gap:10,borderRadius:"0 0 8px 8px",background:"#161b22"}}>
                <button onClick={()=>setShowExportModal(false)} style={{padding:"8px 20px",background:"transparent",border:"1px solid #243048",color:"#8ba3bc",borderRadius:4,cursor:"pointer",fontSize:11}}>Cancel</button>
                <button onClick={()=>{
                  setShowExportModal(false);
                  if (exportSettings.mode==="stems") {
                    exportStems(exportSettings.selectedTracks);
                  } else {
                    mixDownProject();
                  }
                }} style={{padding:"8px 24px",background:"#00ffc8",border:"none",color:"#000",borderRadius:4,cursor:"pointer",fontSize:11,fontWeight:800}}>
                  {mixingDown?"EXPORTING...":"EXPORT AUDIO"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── VIDEO SCORE PANEL ── */}
        {videoUrl && (
          <div style={{position:"fixed",bottom:20,right:20,zIndex:5000,background:"#0d1117",border:"1px solid #243048",borderRadius:8,overflow:"hidden",boxShadow:"0 8px 24px rgba(0,0,0,.8)"}}>
            <div style={{background:"#161b22",padding:"6px 12px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{color:"#cdd9e5",fontSize:11,fontWeight:700}}>🎬 VIDEO SCORE</span>
              <button onClick={()=>{setVideoUrl(null);setVideoFile(null);}} style={{background:"none",border:"none",color:"#8ba3bc",cursor:"pointer"}}>✕</button>
            </div>
            <video src={videoUrl} controls style={{width:320,display:"block"}} onTimeUpdate={e=>{}}/>
          </div>
        )}
        {/* FX POPUP */}
        {afx && openFxKey && (
          <DraggablePanel title={"FX — " + (afx.name || "Track")} onClose={() => { setActiveEffectsTrack(null); setOpenFxKey(null); }} initialX={window.innerWidth-680} initialY={60}>
            <ConsoleFXPanel track={afx} trackIndex={activeEffectsTrack} updateEffect={updateEffect}
              onClose={() => { setActiveEffectsTrack(null); setOpenFxKey(null); }} openFxKey={openFxKey}/>
          </DraggablePanel>
        )}

        {/* SAVE AS */}
        <SaveAsModal show={showSaveAsModal} defaultName={projectName}
          onSave={(fileName) => { if (saveAsData) { const blob = new Blob([saveAsData], { type: "application/json" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = fileName; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url); setStatus("Saved: " + fileName); } setShowSaveAsModal(false); setSaveAsData(null); }}
          onCancel={() => { setShowSaveAsModal(false); setSaveAsData(null); }}/>

        <CollabChatPanel collab={collab}/>
        {showAddTrackDialog && (
          <AddTrackDialog
            onAdd={(type, trackName) => {
              if (tracks.length >= maxTracks) return;
              const i = tracks.length;
              const t = { ...DEFAULT_TRACK(i, type) };
              if (trackName) t.name = trackName;
              setTracks(prev => [...prev, t]);
              setSelectedTrackIndex(i);
              setStatus("✓ " + t.name + " added");
            }}
            onClose={() => setShowAddTrackDialog(false)}
            maxTracks={maxTracks}
            currentCount={tracks.length}
          />
        )}
      </div>
    </div>
  );
};

export default RecordingStudio;

const MotionButton = ({ url }) => {
  const { actions } = useContext(Context);
  const navigate = useNavigate();
  const handleSend = () => sendToMotion(actions, navigate, { type: "audio", url, name: "Recording" });
  return <button onClick={handleSend} className="rs-send-btn">Send to Motion Studio 🎬</button>;
};
