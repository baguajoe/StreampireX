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
        {isActive&&active?active[1]:"Mix"} v
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
// ToolsDropdown — Key Finder, Voice MIDI, Take Lanes, AI Beats, Plugins, Plugin Store
function ToolsDropdown({ viewMode, setViewMode }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  const items = [
    ["keyfinder",    "Key Finder"],
    ["voicemidi",    "Voice MIDI"],
    ["takelanes",    "Take Lanes"],
    ["aibeat",       "AI Beats"],
    ["plugins",      "Plugins"],
    ["plugin-store", "Plugin Store"],
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
// RecordingStudio.js - Multi-Track DAW (Cubase-Inspired)
// =============================================================================
// Location: src/front/js/pages/RecordingStudio.js
// Route: /recording-studio
// Pure Web Audio API — zero external audio libraries
// Effects: EQ, Compressor, Reverb, Delay, Distortion, Filter per track
// Views: Console | Arrange | Piano Roll | Piano | Sampler | Sounds | Chords | AI Beats | AI Mix | Key Finder | Mic Sim | Vocal | Voice MIDI | Plugins
// Track limits: Free=4, Starter=8, Creator=16, Pro=32
//
// NEW:
// - DAWMenuBar integrated (import + JSX)
// - onAction handler wired to RecordingStudio functions
// - selectedTrackIndex for Track/Edit actions
// - Simple MIDI export (pianoRollNotes -> .mid download)
// - InstrumentTrackEngine integration (GM Synth, Samples, External MIDI, Beat Maker → Arrange)
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

// ── Latency compensation utility ──
const getLatencyMs = (ctx) => {
  if (!ctx) return 0;
  const base = ctx.baseLatency || 0;
  const output = ctx.outputLatency || 0;
  return Math.round((base + output) * 1000);
};

const LOW_LATENCY_TIPS = [
  "Use Chrome or Edge for lowest latency",
  "Close other browser tabs and apps",
  "Use a USB audio interface instead of built-in mic",
  "Enable exclusive mode on your audio device",
  "Set buffer size to 128 or 256 samples in your OS audio settings",
  "Use wired headphones — Bluetooth adds 100-200ms",
];

import AmpSimPlugin from "../component/AmpSimPlugin";
import PanKnob from "../component/PanKnob";
import { InlineStemSeparation, AudioToMIDIPanel, PitchCorrectionPanel } from "../component/DAWAdvancedFeatures";
import SaveAsModal from '../component/SaveAsModal';
import MultibandEffects from '../component/MultibandEffects';
import '../../styles/VoiceToMIDI.css';

// ── Piano Roll / MIDI / Chord imports ──
import PianoRoll from "../component/PianoRoll";
import ScoreEditor from "../component/ScoreEditor";
import ChordProgressionGenerator from "../component/ChordProgressionGenerator";

// ── DAW Menu Bar ──
import DAWMenuBar from "../component/DAWMenuBar";
import MPEPanel from "../component/MPEController";
import { SpatialTrackPanel } from "../component/SpatialAudioEngine";
import FilmScoringPanel from "../component/FilmScoringPanel";
import { SampleRateSelector } from "../component/SampleRateSelector";

// ── Vocal Processor ──
import VocalProcessor from "../component/VocalProcessor";
import SynthCreator from "../component/SynthCreator";
import DrumDesigner from "../component/DrumDesigner";
import InstrumentBuilder from "../component/InstrumentBuilder";

// ── Plugin Rack System ──
import UnifiedFXChain from '../component/UnifiedFXChain';
import { SPXPluginHost, ALL_FX_EXTENDED } from '../component/SPXPlugins';
import MasteringChain from '../component/MasteringChain';
import LoopermanBrowser from '../component/LoopermanBrowser';

// ── Voice-to-MIDI (Dubler-style) ──
import VoiceToMIDI from "../component/VoiceToMIDI";

// ── Drum Kit Connector ──
import DrumKitConnector from "../component/DrumKitConnector";

// ── Add these with the other component imports at the top ──
import useDAWHistory from '../component/useDAWHistory';
import TakeLanes from '../component/TakeLanes';
import ArrangeClipEditor from '../component/ArrangeClipEditor';
import TrackGroupBus from '../component/TrackGroupBus';
import DAWMeteringTools from '../component/DAWMeteringTools';

// ── Instrument Track Engine (STEP 1) ──
import useInstrumentTrackEngine, {
  InstrumentSelector,
  KeyboardOctaveIndicator,
  MidiDeviceIndicator,
  createMidiRegion,
  createMidiRegionFromNotes,
  SOURCE_TYPES,
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

const TRACK_COLORS = [
  "#34c759",
  "#ff9500",
  "#007aff",
  "#af52de",
  "#ff3b30",
  "#5ac8fa",
  "#ff2d55",
  "#ffcc00",
  "#30d158",
  "#ff6b35",
  "#0a84ff",
  "#bf5af2",
  "#ff453a",
  "#64d2ff",
  "#ff375f",
  "#ffd60a",
  "#32d74b",
  "#ff8c00",
  "#0066cc",
  "#9b59b6",
  "#e74c3c",
  "#2ecc71",
  "#e91e63",
  "#f39c12",
  "#27ae60",
  "#d35400",
  "#2980b9",
  "#8e44ad",
  "#c0392b",
  "#16a085",
  "#e84393",
  "#fdcb6e",
];

const TIER_TRACK_LIMITS = { free: 4, starter: 8, creator: 16, pro: 32 };
const DEFAULT_MAX = 4;
const DEFAULT_EFFECTS = () => ({
  eq: { lowGain: 0, midGain: 0, midFreq: 1000, highGain: 0, enabled: false },
  compressor: { threshold: -24, ratio: 4, attack: 0.003, release: 0.25, knee: 30, enabled: false },
  reverb: { mix: 0.2, decay: 2.0, enabled: false },
  delay: { time: 0.3, feedback: 0.3, mix: 0.2, enabled: false },
  distortion: { amount: 0, enabled: false },
  filter: { type: "lowpass", frequency: 20000, Q: 1, enabled: false },
  limiter: { threshold: -1, knee: 0, ratio: 20, attack: 0.001, release: 0.05, enabled: false },
  gate: { threshold: -40, attack: 0.001, release: 0.05, enabled: false },
  deesser: { frequency: 6000, threshold: -20, ratio: 8, enabled: false },
  chorus: { rate: 1.5, depth: 0.002, mix: 0.3, enabled: false },
  flanger: { rate: 0.3, depth: 0.003, feedback: 0.5, mix: 0.3, enabled: false },
  phaser: { rate: 0.5, depth: 1000, baseFreq: 1000, Q: 5, stages: 4, mix: 0.3, enabled: false },
  tremolo: { rate: 4, depth: 0.5, enabled: false },
  stereoWidener: { width: 0.5, enabled: false },
  bitcrusher: { bits: 8, sampleRateReduce: 1, enabled: false },
  exciter: { amount: 30, frequency: 3000, mix: 0.2, enabled: false },
  tapeSaturation: { drive: 0.3, warmth: 0.5, enabled: false },
  gainUtility: { gain: 0, phaseInvert: false, monoSum: false, enabled: false },
});
const MIC_MODELS = {
  none: { name: "No Mic Model", eqCurve: null, rolloff: 0 },
  sm7b: {
    name: "SM7B (Dynamic)",
    desc: "Warm, smooth midrange — podcasts, vocals, rap",
    eqCurve: { lowGain: 2, midGain: 3, midFreq: 3000, highGain: -2 },
    rolloff: 80,
  },
  sm58: {
    name: "SM58 (Dynamic)",
    desc: "Bright presence peak — live vocals, spoken word",
    eqCurve: { lowGain: -1, midGain: 4, midFreq: 5000, highGain: 1 },
    rolloff: 100,
  },
  u87: {
    name: "U87 (Condenser)",
    desc: "Detailed, airy top — studio vocals, acoustic",
    eqCurve: { lowGain: 1, midGain: 1, midFreq: 4000, highGain: 4 },
    rolloff: 40,
  },
  c414: {
    name: "C414 (Condenser)",
    desc: "Flat, transparent — versatile studio mic",
    eqCurve: { lowGain: 0, midGain: 1, midFreq: 3500, highGain: 2 },
    rolloff: 40,
  },
  re20: {
    name: "RE20 (Dynamic)",
    desc: "Deep, full low end — broadcast, bass vocals",
    eqCurve: { lowGain: 4, midGain: 1, midFreq: 2500, highGain: -1 },
    rolloff: 50,
  },
  tlm103: {
    name: "TLM 103 (Condenser)",
    desc: "Wide presence boost — bright vocals, voiceover",
    eqCurve: { lowGain: 0, midGain: 2, midFreq: 6000, highGain: 5 },
    rolloff: 40,
  },
  md421: {
    name: "MD 421 (Dynamic)",
    desc: "Aggressive midrange — rock vocals, instruments",
    eqCurve: { lowGain: 1, midGain: 5, midFreq: 2000, highGain: 0 },
    rolloff: 80,
  },
  ribbon: {
    name: "Ribbon (Figure-8)",
    desc: "Dark, vintage warmth — smooth jazz, crooners",
    eqCurve: { lowGain: 3, midGain: -1, midFreq: 3000, highGain: -4 },
    rolloff: 60,
  },
};
// =============================================================================
// Stable ID Generator (for tracks)
// =============================================================================
const uid = () => globalThis.crypto?.randomUUID?.() ?? `id_${Date.now()}_${Math.random().toString(36).slice(2)}`;

// ── STEP 10: DEFAULT_TRACK updated for instrument support ──
const DEFAULT_TRACK = (i, type = "audio") => ({
  id: uid(),
  name: `${type === "midi" ? "MIDI" : type === "bus" ? "Bus" : type === "aux" ? "Aux" : "Audio"} ${i + 1}`,
  trackType: type,
  instrument: type === "midi" ? { program: 0, name: "Acoustic Grand" } : null,
  volume: 0.8,
  pan: 0,
  muted: false,
  solo: false,
  armed: false,
  audio_url: null,
  color: TRACK_COLORS[i % TRACK_COLORS.length],
  audioBuffer: null,
  effects: DEFAULT_EFFECTS(),
  regions: [],
});

// ── Beat ↔ Seconds helpers ──
const secondsToBeat = (seconds, bpm) => (seconds / 60) * bpm;
const beatToSeconds = (beat, bpm) => (beat / bpm) * 60;

// ── Small helpers ──
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

// =============================================================================
// NEW: Cubase-style Meter helpers
// =============================================================================
const DB_MARKS = [0, -6, -12, -18, -24, -30, -40, -50];
const linearToMeterPos = (lin) => {
  if (lin <= 0) return 0;
  const db = 20 * Math.log10(lin);
  return clamp((db + 60) / 66, 0, 1);
};
const dbToMeterPos = (db) => clamp((db + 60) / 66, 0, 1);

// =============================================================================
// NEW: CubaseMeter — Stereo LED-style meter with dB scale (canvas-drawn)
// =============================================================================
const CubaseMeter = React.memo(({ leftLevel = 0, rightLevel = 0, height = 200, showScale = false }) => {
  const canvasRef = useRef(null);
  const peakLRef = useRef(0);
  const peakRRef = useRef(0);
  const peakTimerRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const displayW = showScale ? 52 : 26;
    canvas.width = displayW * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${displayW}px`;
    canvas.style.height = `${height}px`;
  }, [height, showScale]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;
    const barW = 8,
      gap = 2;
    const totalBarsW = barW * 2 + gap;
    const scaleW = showScale ? 22 : 0;
    const ox = Math.floor((w - totalBarsW - scaleW) / 2);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const lPos = linearToMeterPos(leftLevel);
    const rPos = linearToMeterPos(rightLevel);

    // Peak hold
    if (lPos > peakLRef.current) {
      peakLRef.current = lPos;
      peakTimerRef.current = 0;
    }
    if (rPos > peakRRef.current) {
      peakRRef.current = rPos;
      peakTimerRef.current = 0;
    }
    peakTimerRef.current++;
    if (peakTimerRef.current > 25) {
      peakLRef.current = Math.max(peakLRef.current - 0.01, 0);
      peakRRef.current = Math.max(peakRRef.current - 0.01, 0);
    }

    const drawBar = (x, level, peak) => {
      // Dark background
      ctx.fillStyle = "#080e14";
      ctx.fillRect(x, 0, barW, h);

      // Gradient fill
      const fillH = level * h;
      const grad = ctx.createLinearGradient(0, h, 0, 0);
      grad.addColorStop(0, "#0d3320");
      grad.addColorStop(0.15, "#0f8040");
      grad.addColorStop(0.5, "#2db84a");
      grad.addColorStop(0.7, "#7acc20");
      grad.addColorStop(0.82, "#c8c820");
      grad.addColorStop(0.9, "#e8a010");
      grad.addColorStop(0.96, "#e04040");
      grad.addColorStop(1.0, "#ff2020");
      ctx.fillStyle = grad;
      ctx.fillRect(x, h - fillH, barW, fillH);

      // LED segment gaps
      ctx.fillStyle = "#080e14";
      for (let sy = 0; sy < h; sy += 4) ctx.fillRect(x, sy, barW, 1);

      // Peak hold line
      if (peak > 0.01) {
        const py = h - peak * h;
        ctx.fillStyle = peak > 0.92 ? "#ff3030" : peak > 0.75 ? "#e8c020" : "#40d870";
        ctx.fillRect(x, py, barW, 2);
      }
    };

    drawBar(ox, lPos, peakLRef.current);
    drawBar(ox + barW + gap, rPos, peakRRef.current);

    // dB scale labels
    if (showScale) {
      ctx.font = '8px "SF Mono","Consolas",monospace';
      ctx.textAlign = "left";
      DB_MARKS.forEach((db) => {
        const pos = dbToMeterPos(db);
        const y = h - pos * h;
        ctx.fillStyle = "#2a3848";
        ctx.fillRect(ox + totalBarsW + 2, y, 3, 1);
        ctx.fillStyle = "#5a7088";
        ctx.fillText(`${db}`, ox + totalBarsW + 7, y + 3);
      });
    }

    // L/R labels
    ctx.fillStyle = "#5a7088";
    ctx.font = '7px "SF Mono","Consolas",monospace';
    ctx.textAlign = "center";
    ctx.fillText("L", ox + barW / 2, h - 2);
    ctx.fillText("R", ox + barW + gap + barW / 2, h - 2);
  }, [leftLevel, rightLevel, height, showScale]);

  return <canvas ref={canvasRef} style={{ display: "block" }} />;
});
const MicModelSelector = React.memo(({ trackIndex, currentModel, onApply }) => {
  const [isOpen, setIsOpen] = useState(false);

  // landBufferOnTrack removed — was referencing out-of-scope vars

  return (
    <>
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          padding: "2px 6px",
          fontSize: "0.55rem",
          color: currentModel && currentModel !== "none" ? "#ff6b9d" : "#5a7088",
          background: currentModel && currentModel !== "none" ? "rgba(255,107,157,0.1)" : "transparent",
          border: "1px solid",
          borderColor: currentModel && currentModel !== "none" ? "rgba(255,107,157,0.3)" : "#1a2636",
          borderRadius: 3,
          cursor: "pointer",
          textAlign: "center",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          maxWidth: 90,
          transition: "all 0.15s",
        }}
        title={currentModel && currentModel !== "none" ? MIC_MODELS[currentModel]?.desc : "Select mic model"}
      >
        {currentModel && currentModel !== "none"
          ? MIC_MODELS[currentModel]?.name?.split(" (")[0] || "Mic"
          : "🎙 Mic Model"}
      </div>

      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            zIndex: 9999,
            background: "#1a2636",
            border: "1px solid #3a5570",
            borderRadius: 6,
            padding: "4px 0",
            minWidth: 200,
            maxHeight: 320,
            overflowY: "auto",
            boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
          }}
        >
          <div
            onClick={() => {
              onApply(trackIndex, "none");
              setIsOpen(false);
            }}
            style={{
              padding: "8px 12px",
              cursor: "pointer",
              fontSize: "0.75rem",
              color: currentModel === "none" || !currentModel ? "#00ffc8" : "#c9d1d9",
              background: currentModel === "none" || !currentModel ? "rgba(0,255,200,0.08)" : "transparent",
            }}
          >
            None
          </div>

          {Object.entries(MIC_MODELS).map(([key, mic]) => (
            <div
              key={key}
              onClick={() => {
                onApply(trackIndex, key);
                setIsOpen(false);
              }}
              style={{
                padding: "8px 12px",
                cursor: "pointer",
                fontSize: "0.75rem",
                color: currentModel === key ? "#00ffc8" : "#c9d1d9",
                background: currentModel === key ? "rgba(0,255,200,0.08)" : "transparent",
                borderTop: "1px solid rgba(255,255,255,0.04)",
              }}
              title={mic?.desc || ""}
            >
              <div className="rs-mic-name">{mic?.name || key}</div>
              <div className="rs-mic-desc">{mic?.desc || ""}</div>
            </div>
          ))}
        </div>
      )}
    </>
  );
});
// ── STEP 8: MidiRegionPreview — mini piano-roll inside region ──
const MidiRegionPreview = React.memo(({ notes = [], duration, height, color }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !notes.length) return;
    const ctx = canvas.getContext("2d");
    const w = canvas.width,
      h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const noteNums = notes.map((n) => n.note);
    const minNote = Math.min(...noteNums) - 1;
    const maxNote = Math.max(...noteNums) + 1;
    const range = Math.max(maxNote - minNote, 12);

    ctx.fillStyle = color || "#7c3aed";
    ctx.globalAlpha = 0.8;
    notes.forEach((n) => {
      const x = (n.startBeat / duration) * w;
      const noteW = Math.max((n.duration / duration) * w, 2);
      const y = h - ((n.note - minNote) / range) * h;
      const noteH = Math.max(h / range, 2);
      ctx.fillRect(x, y - noteH, noteW, noteH);
    });
  }, [notes, duration, height, color]);

  return (
    <canvas
      ref={canvasRef}
      width={300}
      height={height}
      style={{ width: "100%", height, display: "block", opacity: 0.9 }}
    />
  );
});

/**
 * Minimal MIDI writer (SMF format 0 / single track).
 * Notes expected: [{ note, velocity, startBeat, duration, channel }]
 */
const midiFromNotes = ({ notes = [], bpm = 120, ppq = 480 }) => {
  const sorted = [...notes]
    .filter((n) => Number.isFinite(n.note) && Number.isFinite(n.startBeat) && Number.isFinite(n.duration))
    .map((n) => ({
      note: clamp(Math.round(n.note), 0, 127),
      vel: clamp(Math.round((n.velocity ?? 0.9) <= 1 ? (n.velocity ?? 0.9) * 127 : (n.velocity ?? 100)), 1, 127),
      startTick: Math.max(0, Math.round((n.startBeat || 0) * ppq)),
      endTick: Math.max(0, Math.round(((n.startBeat || 0) + (n.duration || 0)) * ppq)),
      channel: clamp(Math.round(n.channel ?? 0), 0, 15),
    }))
    .filter((n) => n.endTick > n.startTick)
    .sort((a, b) => a.startTick - b.startTick);

  const events = [];
  const mpqn = Math.round(60000000 / (bpm || 120));
  events.push({ tick: 0, bytes: [0xff, 0x51, 0x03, (mpqn >> 16) & 0xff, (mpqn >> 8) & 0xff, mpqn & 0xff] });

  for (const n of sorted) {
    events.push({ tick: n.startTick, bytes: [0x90 | n.channel, n.note, n.vel] });
    events.push({ tick: n.endTick, bytes: [0x80 | n.channel, n.note, 0x00] });
  }

  const lastTick = events.reduce((m, e) => Math.max(m, e.tick), 0);
  events.push({ tick: lastTick + 1, bytes: [0xff, 0x2f, 0x00] });
  events.sort((a, b) => a.tick - b.tick);

  const trackData = [];
  let prevTick = 0;

  const writeVarLen = (val) => {
    let v = val >>> 0;
    let buffer = v & 0x7f;
    while ((v >>= 7)) {
      buffer <<= 8;
      buffer |= (v & 0x7f) | 0x80;
    }
    while (true) {
      trackData.push(buffer & 0xff);
      if (buffer & 0x80) buffer >>= 8;
      else break;
    }
  };

  for (const e of events) {
    const delta = Math.max(0, e.tick - prevTick);
    writeVarLen(delta);
    trackData.push(...e.bytes);
    prevTick = e.tick;
  }

  const header = [];
  const pushStr = (s) => s.split("").forEach((ch) => header.push(ch.charCodeAt(0)));
  const pushU16 = (n) => header.push((n >> 8) & 0xff, n & 0xff);
  const pushU32 = (n) => header.push((n >> 24) & 0xff, (n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff);

  pushStr("MThd");
  pushU32(6);
  pushU16(0);
  pushU16(1);
  pushU16(ppq);

  const trackHeader = [];
  const pushStr3 = (s) => s.split("").forEach((ch) => trackHeader.push(ch.charCodeAt(0)));
  const pushU32b = (n) => trackHeader.push((n >> 24) & 0xff, (n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff);

  pushStr3("MTrk");
  pushU32b(trackData.length);

  return new Uint8Array([...header, ...trackHeader, ...trackData]);
};

const RecordingStudio = ({ user }) => {
  const [automation, setAutomation] = useState({});
  const autoRafRef = useRef(null);
  const [autoRead, setAutoRead] = useState(false);
  const [autoParams, setAutoParams] = useState({});
  const [autoWrite, setAutoWrite] = useState(false);
  const [fx, setFx] = useState({});
  const [keyboardOctave, setKeyboardOctave] = useState(4);
  const [trackInstrument, setTrackInstrument] = useState({});
  const [zoom, setZoom] = useState(1);



  // ── Tier-based track limit ──
  const userTier = (user?.subscription_tier || user?.tier || "free").toLowerCase();
  const maxTracks = TIER_TRACK_LIMITS[userTier] || DEFAULT_MAX;

  // ✅ Default view is Arrange (NOT record)
  const [viewMode, setViewMode] = useState("arrange");

  // ── Split Screen ────────────────────────────────────────────────────────

  // ── Flex Pitch ──────────────────────────────────────────────────────────────
  const [showFlexPitch,    setShowFlexPitch]    = React.useState(false);
  const [flexPitchBuffer,  setFlexPitchBuffer]  = React.useState(null);
  const [flexPitchTrack,   setFlexPitchTrack]   = React.useState(null);
  // ────────────────────────────────────────────────────────────────────────────

    const [splitScreen,    setSplitScreen]    = useState(false);
  const [splitTopH,      setSplitTopH]      = useState(50); // percent
  const splitDragRef                        = React.useRef(false);
  const splitContainerRef                   = React.useRef(null);
  // ────────────────────────────────────────────────────────────────────────

  const [projectName, setProjectName] = useState("Untitled Project");
  const [projectId, setProjectId] = useState(null);
  const [projects, setProjects] = useState([]);
  const [showProjectList, setShowProjectList] = useState(false);
  const [bpm, setBpm] = useState(120);
  const [timeSignature, setTimeSignature] = useState([4, 4]);
  const [masterVolume, setMasterVolume] = useState(0.8);
  const [masterPan, setMasterPan] = useState(0); // NEW: master pan state
  const [tracks, setTracks] = useState(Array.from({ length: 1 }, (_, i) => DEFAULT_TRACK(i)));

  const motionAudioUrl = tracks?.[selectedTrack]?.audio_url || tracks?.find((t) => t?.audio_url)?.audio_url || null;
  const [trackMicModels, setTrackMicModels] = useState({});

  // ── DAW Collaboration ──
  // ── MIDI Hardware ──
  const [midiEnabled, setMidiEnabled] = React.useState(false);
  const [wamPlugins, setWamPlugins] = React.useState([]);
  const [analogSubview, setAnalogSubview] = React.useState("ampsim");
  const [trackConsoleChar, setTrackConsoleChar] = React.useState({}); // {trackId: 'ssl4ke'}
  const [masterConsoleChar, setMasterConsoleChar] = React.useState('none');
  const trackConsoleCharRef = React.useRef({});
  const masterConsoleCharRef = React.useRef('none');
  const masterConsoleOutRef  = React.useRef(null);
  const [monitorSpeaker, setMonitorSpeaker] = React.useState('flat');
  const monitorNodesRef = React.useRef(null);

  const MONITOR_EQ = {
    flat:       { name: 'Flat (Bypass)',        cat: 'bypass',   low: 0,    lowMid: 0,    highMid: 0,    high: 0,   gain: 0    },
    genelec8030:{ name: 'Genelec 8030C',        cat: 'pro',      low: 0.5,  lowMid: 0,    highMid: 0.3,  high: 0.5, gain: 0    },
    genelec1032:{ name: 'Genelec 1032A',        cat: 'pro',      low: 1.0,  lowMid: 0.5,  highMid: 0.5,  high: 0.8, gain: 0    },
    ns10:       { name: 'Yamaha NS-10M',         cat: 'pro',      low: -3,   lowMid: 2,    highMid: 2.5,  high: -2,  gain: 1    },
    auratone:   { name: 'Auratone 5C',           cat: 'pro',      low: -8,   lowMid: 4,    highMid: 3,    high: -6,  gain: 3    },
    avantone:   { name: 'Avantone MixCube',      cat: 'pro',      low: -7,   lowMid: 3.5,  highMid: 2.5,  high: -5,  gain: 2.5  },
    krk8:       { name: 'KRK Rokit 8 G4',        cat: 'pro',      low: 2,    lowMid: -1,   highMid: 1,    high: 1,   gain: -1   },
    adamA7x:    { name: 'Adam Audio A7X',         cat: 'pro',      low: 0.5,  lowMid: 0,    highMid: 0.5,  high: 1.5, gain: 0    },
    focalAlpha: { name: 'Focal Alpha 65',         cat: 'pro',      low: 1,    lowMid: -0.5, highMid: 0.3,  high: 0.8, gain: 0    },
    dynaudio:   { name: 'Dynaudio BM5A',          cat: 'pro',      low: 0.8,  lowMid: 0.3,  highMid: 0.5,  high: 0.5, gain: 0    },
    evenT20:    { name: 'Event 20/20bas',          cat: 'pro',      low: 1.5,  lowMid: 0,    highMid: 0.8,  high: 0.3, gain: 0    },
    barefoot:   { name: 'Barefoot MicroMain27',   cat: 'pro',      low: 0.3,  lowMid: 0,    highMid: 0.2,  high: 0.5, gain: 0    },
    mackie8:    { name: 'Mackie HR824',            cat: 'pro',      low: 1.2,  lowMid: -0.3, highMid: 0.5,  high: 0.5, gain: 0    },
    jblLsr:     { name: 'JBL LSR 305',             cat: 'pro',      low: 1.0,  lowMid: -0.5, highMid: 0.8,  high: 1.0, gain: -0.5 },
    augspurger: { name: 'Augspurger Studio',       cat: 'pro',      low: 1.5,  lowMid: 0.5,  highMid: 0.5,  high: 1.0, gain: -1   },
    iphone:     { name: 'iPhone Speaker',          cat: 'consumer', low: -10,  lowMid: 3,    highMid: 5,    high: -4,  gain: 4    },
    android:    { name: 'Android Phone',           cat: 'consumer', low: -9,   lowMid: 2.5,  highMid: 4.5,  high: -3,  gain: 3.5  },
    laptop:     { name: 'Laptop Speakers',         cat: 'consumer', low: -12,  lowMid: 2,    highMid: 4,    high: -3,  gain: 5    },
    earbuds:    { name: 'Earbuds',                 cat: 'consumer', low: -4,   lowMid: 1,    highMid: 3,    high: 2,   gain: 1    },
    car:        { name: 'Car Stereo',              cat: 'consumer', low: 4,    lowMid: -2,   highMid: 2,    high: -1,  gain: -1   },
    club:       { name: 'Club / PA System',        cat: 'consumer', low: 6,    lowMid: -1,   highMid: 0,    high: 2,   gain: -3   },
    tv:         { name: 'TV Speakers',             cat: 'consumer', low: -6,   lowMid: 1,    highMid: 3,    high: -2,  gain: 2    },
    bluetooth:  { name: 'Bluetooth Speaker',       cat: 'consumer', low: -2,   lowMid: 1,    highMid: 2,    high: -1,  gain: 1    },
  };
  React.useEffect(() => { trackConsoleCharRef.current = trackConsoleChar; }, [trackConsoleChar]);

  React.useEffect(() => {
    const nodes = monitorNodesRef.current;
    if (!nodes || !audioCtxRef.current) return;
    const eq = MONITOR_EQ[monitorSpeaker] || MONITOR_EQ.flat;
    const t  = audioCtxRef.current.currentTime;
    nodes.lo.gain.setTargetAtTime(eq.low,     t, 0.02);
    nodes.loMid.gain.setTargetAtTime(eq.lowMid,  t, 0.02);
    nodes.hiMid.gain.setTargetAtTime(eq.highMid, t, 0.02);
    nodes.hi.gain.setTargetAtTime(eq.high,    t, 0.02);
    nodes.gain.gain.setTargetAtTime(Math.pow(10, (eq.gain || 0) / 20), t, 0.02);
  }, [monitorSpeaker]);
  React.useEffect(() => { masterConsoleCharRef.current = masterConsoleChar; }, [masterConsoleChar]);
  const [latencyMs, setLatencyMs] = React.useState(0);
  const [monitoringEnabled, setMonitoringEnabled] = React.useState(false);
  const [latencyCompMs, setLatencyCompMs] = React.useState(0);
  const monitorGainRef = React.useRef(null);
  const [tapeDrive, setTapeDrive] = React.useState(0.3);
  const [tapeWarmth, setTapeWarmth] = React.useState(0.5);
  const [tapeEnabled, setTapeEnabled] = React.useState(false);
  const [harmonicEnabled, setHarmonicEnabled] = React.useState(false);
  const [harmonicAmount, setHarmonicAmount] = React.useState(0.5);

  React.useEffect(() => {
    setWamPlugins(getInstalledWAMPlugins() || []);
  }, []);

  const collab = useDAWCollaboration({
    projectId: projectId || null,
    user: null,
    tracks,
    setTracks,
    bpm,
    setBpm,
    timeSignature,
    setTimeSignature,
    isEnabled: true,
    onStatus: (msg) => console.log('[Collab]', msg),
  });
  // ── Selected track (for DAWMenuBar Track/Edit actions) ──
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

  // ── Audio / Latency Settings ─────────────────────────────────────────────
  const [showAudioSettings, setShowAudioSettings] = React.useState(false);
  const [audioBufferSize,   setAudioBufferSize]   = React.useState(256);
  const [sampleRate, setSampleRate] = React.useState(48000);
  const [workletsLoaded, setWorkletsLoaded] = React.useState(false);
  const [audioSampleRate,   setAudioSampleRate]   = React.useState(44100);
  const [audioLookahead,    setAudioLookahead]    = React.useState(25);
  // ─────────────────────────────────────────────────────────────────────────

    const [mixingDown, setMixingDown] = useState(false);
  const [activeEffectsTrack, setActiveEffectsTrack] = useState(null);
  const [insertPickerState, setInsertPickerState] = useState(null);
  const [openFxKey, setOpenFxKey] = useState(null); // which effect popup is open
  const [micSimStream, setMicSimStream] = useState(null);
  const [showMicBuilder, setShowMicBuilder] = useState(false);
  const [showVocalModal, setShowVocalModal] = useState(false);
  const [showMicSimModal, setShowMicSimModal] = useState(false);
  const [customMicProfiles, setCustomMicProfiles] = useState([]);
  const [meterLevels, setMeterLevels] = useState([]);
  const [masterMeterLevels, setMasterMeterLevels] = useState({ left: 0, right: 0, peak: 0 }); // NEW

  const [pianoRollNotes, setPianoRollNotes] = useState([]);
  const pianoRollStepInputRef = useRef(null); // ref to PianoRoll's handleStepInputNote
  const [pianoRollKey, setPianoRollKey] = useState("C");
  const [pianoRollScale, setPianoRollScale] = useState("major");
  const [selectedTrack, setSelectedTrack] = useState(0);
  const [showTakeLanes, setShowTakeLanes] = useState(false);
  const [takeLanesTrackIndex, setTakeLanesTrackIndex] = useState(null);
  const [showSaveAsModal, setShowSaveAsModal] = useState(false);
  const [saveAsData, setSaveAsData] = useState(null);

  // ── STEP 13: Track active region being edited in Piano Roll ──
  const [editingRegion, setEditingRegion] = useState(null);
  // { trackIndex: number, regionId: string }

  const audioCtxRef = useRef(null);
  const masterGainRef = useRef(null);
  const masterPanRef = useRef(null); // NEW: master pan node
  const masterAnalyserLRef = useRef(null); // NEW: left channel analyser
  const masterAnalyserRRef = useRef(null); // NEW: right channel analyser
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
  const spxEngineRef  = useRef(null);  // SPX AudioEngine instance
  const [showSampleLibrary,  setShowSampleLibrary]  = React.useState(false);
  const [showPluginRack,     setShowPluginRack]      = React.useState(false);
  const [showMidiMapping,    setShowMidiMapping]     = React.useState(false);
  const [showOnboarding,     setShowOnboarding]      = React.useState(() => !localStorage.getItem('spx_onboarded'));
  const [chords,             setChords]              = React.useState([]);
  const [takes,              setTakes]               = React.useState([]);
  const [activeTake,         setActiveTake]          = React.useState(null);
  const [pluginRackTrack,    setPluginRackTrack]     = React.useState(null);
  const [trackPlugins,       setTrackPlugins]        = React.useState({});

  // ── Loop / Cycle state ──────────────────────────────────────────────────
  const [cycleEnabled, setCycleEnabled] = React.useState(false);
  const [cycleStart,   setCycleStart]   = React.useState(0);   // beats
  const [cycleEnd,     setCycleEnd]     = React.useState(8);   // beats
  const loopCheckRef  = useRef(null);  // RAF for loop check

  // ── MIDI controller mapping ─────────────────────────────────────────────
  const midiMappingsRef  = useRef(new Map()); // cc# → { action, trackIdx }
  const midiLearnRef     = useRef(null);       // { cc target } during learn
  const [midiLearnMode,  setMidiLearnMode]  = React.useState(false);
  const [midiMappings,   setMidiMappings]   = React.useState([]);
  const metroRef = useRef(null);
  const timeRef = useRef(null);
  const canvasRefs = useRef([]);
  const inputAnalyserRef = useRef(null);
  const inputAnimRef = useRef(null);

  // =============================================================================
  // Cubase-Style Per-Track Audio Graph System
  // =============================================================================

  const trackNodesRef = useRef(new Map()); // trackId -> audio nodes

  const dbToGain = (db) => Math.pow(10, db / 20);

  const setStereoPan = (panNode, pan) => {
    if (!audioCtxRef.current) return;
    try {
      panNode.pan.setTargetAtTime(pan, audioCtxRef.current.currentTime, 0.01);
    } catch {
      panNode.pan.value = pan;
    }
  };

  const ensureTrackGraph = (track) => {
    const ctx = audioCtxRef.current;
    if (!ctx || !masterGainRef.current) return null;

    if (trackNodesRef.current.has(track.id)) {
      return trackNodesRef.current.get(track.id);
    }

    // ── Base nodes ──
    const input   = ctx.createGain();
    const preGain = ctx.createGain();
    const panNode = ctx.createStereoPanner();
    const fader   = ctx.createGain();
    const meter   = ctx.createAnalyser();
    meter.fftSize = 2048;

    // ── Live FX insert chain (preGain -> FX -> panNode) ──
    const fxNodes = (track.effects && Object.keys(track.effects).length)
      ? buildFxChain(ctx, track) : [];
    let last = preGain;
    fxNodes.forEach(n => { last.connect(n); last = n; });
    last.connect(panNode);
    panNode.connect(fader);
    fader.connect(meter);

    // ── Console character (analog board emulation) ──
    const boardId = trackConsoleChar[track.id] || 'none';
    const consoleOut = ctx.createGain();
    const consoleNodes = applyConsoleCharacter(ctx, meter, consoleOut, boardId);

    // ── Bus routing ──
    const busTrack = track.busTarget
      ? tracks.find(t => t.id === track.busTarget) : null;
    const busNodes = busTrack ? trackNodesRef.current.get(busTrack.id) : null;
    const dest = (busNodes && busNodes.input) ? busNodes.input : masterGainRef.current;
    consoleOut.connect(dest);

    // ── Sends (reverb/delay) parallel ──
    buildSends(ctx, track, fader, dest);

    input.connect(preGain);
    const nodes = { input, preGain, panNode, fader, meter, fxNodes, dest };
    trackNodesRef.current.set(track.id, nodes);
    applyTrackToNodes(track, nodes);
    return nodes;
  };

  const rebuildTrackGraph = (trackId) => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    const track = tracks.find(t => t.id === trackId);
    if (!track) return;
    const old = trackNodesRef.current.get(trackId);
    if (old) {
      ["input","preGain","panNode","fader","meter"].forEach(k => {
        try { old[k].disconnect(); } catch(_) {}
      });
      (old.fxNodes || []).forEach(n => { try { n.disconnect(); } catch(_) {} });
    }
    trackNodesRef.current.delete(trackId);
    ensureTrackGraph(track);
  };

  const ensureBusGraph = (busTrack) => {
    const ctx = audioCtxRef.current;
    if (!ctx || !masterGainRef.current) return null;
    if (trackNodesRef.current.has(busTrack.id)) return trackNodesRef.current.get(busTrack.id);
    const input   = ctx.createGain();
    const preGain = ctx.createGain();
    const panNode = ctx.createStereoPanner();
    const fader   = ctx.createGain();
    const meter   = ctx.createAnalyser();
    meter.fftSize = 2048;
    const fxNodes = (busTrack.effects && Object.keys(busTrack.effects).length)
      ? buildFxChain(ctx, busTrack) : [];
    let last = preGain;
    fxNodes.forEach(n => { last.connect(n); last = n; });
    last.connect(panNode); panNode.connect(fader);
    fader.connect(meter);
    // Console character on bus
    const busConsoleOut = ctx.createGain();
    applyConsoleCharacter(ctx, meter, busConsoleOut, trackConsoleChar[busTrack?.id] || 'none');
    busConsoleOut.connect(masterGainRef.current);
    input.connect(preGain);
    const nodes = { input, preGain, panNode, fader, meter, fxNodes, isBus: true };
    trackNodesRef.current.set(busTrack.id, nodes);
    applyTrackToNodes(busTrack, nodes);
    return nodes;
  };


  const applyTrackToNodes = (track, nodes) => {
    if (!audioCtxRef.current) return;

    const volDb = track.volumeDb ?? 0;
    const pan = track.pan ?? 0;

    // Mute logic
    nodes.preGain.gain.setTargetAtTime(track.muted ? 0 : 1, audioCtxRef.current.currentTime, 0.01);

    // Fader
    nodes.fader.gain.setTargetAtTime(dbToGain(volDb), audioCtxRef.current.currentTime, 0.01);

    // Pan
    setStereoPan(nodes.panNode, pan);
  };

  // Tap tempo tracking
  const tapTimesRef = useRef([]);

  const playheadBeat = useMemo(() => secondsToBeat(currentTime, bpm), [currentTime, bpm]);

  // ── STEP 1: Instrument Track Engine ──
  // ── STEP 7: Routing contract — returns track input GainNode ──
  const getTrackInputNode = useCallback(
    (trackIndex) => {
      const track = tracks[trackIndex];
      if (!track) return null;
      const nodes = ensureTrackGraph(track);
      if (!nodes) return null;
      return nodes.input;
    },
    [tracks],
  );

  const instrumentEngine = useInstrumentTrackEngine(audioCtxRef, tracks, {
    bpm,
    isPlaying,
    isRecording,
    playheadBeat,
    masterGainRef,
    getTrackInputNode,
    onNotesRecorded: (notes) => {
      const armedIdx = tracks.findIndex((t) => t.armed && (t.trackType === "midi" || t.trackType === "instrument"));
      if (armedIdx === -1 || !notes.length) return;
      const region = createMidiRegionFromNotes(notes, "MIDI Recording");
      setTracks((prev) => prev.map((t, i) => (i === armedIdx ? { ...t, regions: [...(t.regions || []), region] } : t)));
      setStatus(`✓ Recorded ${notes.length} MIDI notes → Track ${armedIdx + 1}`);
    },
  });

  useEffect(() => {
    navigator.mediaDevices
      .enumerateDevices()
      .then((d) => setInputDevices(d.filter((x) => x.kind === "audioinput")))
      .catch(console.error);

    return () => {
      stopEverything();
      if (audioCtxRef.current) audioCtxRef.current.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── NEW: getCtx creates AudioContext with master chain:
  //    gain → pan → splitter → L/R analysers → destination ──
  const getCtx = useCallback(() => {
    if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: "interactive", sampleRate });
      loadAllWorklets(audioCtxRef.current).then(r => { setWorkletsLoaded(true); console.log("[SPX] Worklets:", r.loaded); }).catch(e => console.warn("[SPX] Worklet error:", e));

      masterGainRef.current = audioCtxRef.current.createGain();
      masterGainRef.current.gain.value = masterVolume;

      // NEW: Master pan node
      masterPanRef.current = audioCtxRef.current.createStereoPanner();
      masterPanRef.current.pan.value = masterPan;

      // NEW: Stereo splitter + L/R analysers for CubaseMeter
      const splitter = audioCtxRef.current.createChannelSplitter(2);
      masterAnalyserLRef.current = audioCtxRef.current.createAnalyser();
      masterAnalyserLRef.current.fftSize = 256;
      masterAnalyserLRef.current.smoothingTimeConstant = 0.7;
      masterAnalyserRRef.current = audioCtxRef.current.createAnalyser();
      masterAnalyserRRef.current.fftSize = 256;
      masterAnalyserRRef.current.smoothingTimeConstant = 0.7;

      // Chain: masterGain → masterPan → splitter → L/R analysers
      //                                → destination
      // Master bus console character — insert between masterGain and masterPan
    const masterConsoleOutNode = ctx.createGain();
    masterConsoleOutRef.current = masterConsoleOutNode;
    applyConsoleCharacter(ctx, masterGainRef.current, masterConsoleOutNode, masterConsoleChar || 'none');
    // Console char → masterPan (exclusive routing)
    if (masterConsoleChar && masterConsoleChar !== 'none') {
      masterConsoleOutNode.connect(masterPanRef.current);
    } else {
      masterGainRef.current.connect(masterPanRef.current);
    }
    // Meter splitter (analysers only — not in audio output path)
    masterPanRef.current.connect(splitter);
    splitter.connect(masterAnalyserLRef.current, 0);
    splitter.connect(masterAnalyserRRef.current, 1);
      const monLo    = ctx.createBiquadFilter(); monLo.type = 'lowshelf';  monLo.frequency.value = 200;
    const monLoMid  = ctx.createBiquadFilter(); monLoMid.type = 'peaking'; monLoMid.frequency.value = 500;  monLoMid.Q.value = 1;
    const monHiMid  = ctx.createBiquadFilter(); monHiMid.type = 'peaking'; monHiMid.frequency.value = 3000; monHiMid.Q.value = 1;
    const monHi     = ctx.createBiquadFilter(); monHi.type = 'highshelf'; monHi.frequency.value = 8000;
    const monGain   = ctx.createGain();
    monLo.connect(monLoMid); monLoMid.connect(monHiMid); monHiMid.connect(monHi);
    monHi.connect(monGain); monGain.connect(ctx.destination);
    masterPanRef.current.connect(monLo);
    monitorNodesRef.current = { lo: monLo, loMid: monLoMid, hiMid: monHiMid, hi: monHi, gain: monGain };
    }
    if (audioCtxRef.current.state === "suspended") audioCtxRef.current.resume();

    // ── Init SPX AudioEngine using same context ──────────────────────────
    if (!spxEngineRef.current) {
      const engine = AudioEngine.getInstance();
      if (!engine.context || engine.context.state === 'closed') {
        engine.context = audioCtxRef.current;
        engine._buildMasterBus().catch(console.warn);
        engine._loadWorklets().catch(console.warn);
        engine._startScheduler();
      }
      spxEngineRef.current = engine;
    }

    return audioCtxRef.current;
  }, [masterVolume, masterPan]);

  useEffect(() => {
    if (masterGainRef.current) masterGainRef.current.gain.value = masterVolume;
  }, [masterVolume]);

  // ── Loop enforcement — checks playhead vs cycle region ─────────────────
  const startLoopCheck = React.useCallback(() => {
    if (loopCheckRef.current) cancelAnimationFrame(loopCheckRef.current);
    const check = () => {
      if (!cycleEnabled || !isPlaying) { loopCheckRef.current = null; return; }
      const beatNow = playOffsetRef.current
        + (audioCtxRef.current ? (audioCtxRef.current.currentTime - playStartRef.current) * (bpm / 60) : 0);
      if (beatNow >= cycleEnd) {
        // Jump back to cycle start
        const jumpToSec = cycleStart * (60 / bpm);
        playOffsetRef.current = cycleStart;
        playStartRef.current  = audioCtxRef.current?.currentTime || 0;
        setCurrentTime?.(jumpToSec);
      }
      loopCheckRef.current = requestAnimationFrame(check);
    };
    loopCheckRef.current = requestAnimationFrame(check);
  }, [cycleEnabled, cycleStart, cycleEnd, bpm, isPlaying]);

  // Start/stop loop check when play state or cycle changes
  React.useEffect(() => {
    if (isPlaying && cycleEnabled) startLoopCheck();
    else if (loopCheckRef.current) { cancelAnimationFrame(loopCheckRef.current); loopCheckRef.current = null; }
  }, [isPlaying, cycleEnabled, startLoopCheck]);

  // ── Automation Playback RAF ─────────────────────────────────────────────
  // Runs every animation frame while playing, reads automation curves
  // and applies values to the actual audio nodes in trackNodesRef
  const applyAutomation = React.useCallback(() => {
    if (!audioCtxRef.current || !isPlaying) { autoRafRef.current = null; return; }

    const now = audioCtxRef.current.currentTime;
    // currentTime in seconds relative to project start
    const projectTime = playOffsetRef.current / bpm * 60 +
      (now - playStartRef.current);

    tracks.forEach((t, i) => {
      const tId  = t.id ?? i;
      if (!autoRead[tId]) return;

      const tAuto  = automation[tId] ?? {};
      const paramK = autoParams[tId] ?? 'volume';
      const param  = AUTO_PARAMS.find(p => p.key === paramK);
      if (!param) return;

      const pts = (tAuto[paramK] ?? []).sort((a, b) => a.time - b.time);
      if (pts.length === 0) return;

      const val  = getValueAtTime(pts, projectTime, param);
      const nodes = trackNodesRef.current.get(tId);
      if (!nodes) return;

      // Apply to correct audio node based on param
      switch (paramK) {
        case 'volume':
          nodes.fader?.gain.setTargetAtTime(val, now, 0.02);
          break;
        case 'pan':
          nodes.panNode?.pan.setTargetAtTime(Math.max(-1, Math.min(1, val)), now, 0.02);
          break;
        case 'mute':
          nodes.preGain?.gain.setTargetAtTime(val > 0.5 ? 0 : 1, now, 0.01);
          break;
        case 'filterCut':
          // Apply to any filter node on the track (future: wire to FX chain)
          break;
        default:
          break;
      }
    });

    autoRafRef.current = requestAnimationFrame(applyAutomation);
  }, [isPlaying, tracks, automation, autoRead, autoParams, bpm]);

  // Start/stop automation RAF with playback
  React.useEffect(() => {
    if (isPlaying) {
      if (autoRafRef.current) cancelAnimationFrame(autoRafRef.current);
      autoRafRef.current = requestAnimationFrame(applyAutomation);
    } else {
      if (autoRafRef.current) { cancelAnimationFrame(autoRafRef.current); autoRafRef.current = null; }
    }
    return () => { if (autoRafRef.current) cancelAnimationFrame(autoRafRef.current); };
  }, [isPlaying, applyAutomation]);

  // Helpers for AutomationLane callbacks
  const handleAutomationChange = React.useCallback((trackId, paramKey, points) => {
    setAutomation(prev => ({
      ...prev,
      [trackId]: { ...(prev[trackId] ?? {}), [paramKey]: points },
    }));
  }, []);

  const handleAutoReadToggle = React.useCallback((trackId) => {
    setAutoRead(prev => ({ ...prev, [trackId]: !prev[trackId] }));
  }, []);

  const handleAutoWriteToggle = React.useCallback((trackId) => {
    setAutoWrite(prev => ({ ...prev, [trackId]: !prev[trackId] }));
  }, []);

  const handleAutoParamChange = React.useCallback((trackId, paramKey) => {
    setAutoParams(prev => ({ ...prev, [trackId]: paramKey }));
  }, []);

  // ── MIDI Controller Setup ───────────────────────────────────────────────
  React.useEffect(() => {
    if (!midiEnabled) return;
    let midiAccess = null;

    navigator.requestMIDIAccess?.({ sysex: false }).then(access => {
      midiAccess = access;
      const handleMsg = (msg) => {
        const [status, cc, value] = msg.data;
        const isCC = (status & 0xF0) === 0xB0;
        if (!isCC) return;

        // MIDI Learn mode
        if (midiLearnRef.current) {
          const { target } = midiLearnRef.current;
          midiMappingsRef.current.set(cc, target);
          setMidiMappings([...midiMappingsRef.current.entries()].map(([k,v]) => ({ cc: k, ...v })));
          midiLearnRef.current = null;
          setMidiLearnMode(false);
          setStatus(`✓ CC${cc} mapped to ${target.action}`);
          return;
        }

        const mapping = midiMappingsRef.current.get(cc);
        if (!mapping) {
          // Default mappings for common controllers
          handleDefaultMidiCC(cc, value);
          return;
        }
        handleMappedMidiCC(mapping, value);
      };

      access.inputs.forEach(input => { input.onmidimessage = handleMsg; });
      access.onstatechange = () => {
        access.inputs.forEach(input => { input.onmidimessage = handleMsg; });
      };
    }).catch(e => console.warn('[MIDI] Access denied:', e));

    return () => {
      if (midiAccess) midiAccess.inputs.forEach(i => { i.onmidimessage = null; });
    };
  }, [midiEnabled]);

  const handleDefaultMidiCC = React.useCallback((cc, value) => {
    const norm = value / 127;
    // Common default mappings
    switch(cc) {
      case 1:  // Mod wheel → master volume
        setMasterVolume(norm);
        break;
      case 7:  // Volume → master volume
        setMasterVolume(norm);
        break;
      case 10: // Pan → master pan
        setMasterPan((norm * 2) - 1);
        break;
      case 64: // Sustain pedal → play/stop
        if (value >= 64) handleTransportAction(isPlaying ? 'stop' : 'play');
        break;
      case 93: // Effect 1 → cycle toggle
        if (value >= 64) setCycleEnabled(e => !e);
        break;
    }
    // Track volume via CC 102–117 (16 tracks)
    if (cc >= 102 && cc <= 117) {
      const trackIdx = cc - 102;
      if (tracks[trackIdx]) {
        setTracks(prev => prev.map((t, i) =>
          i === trackIdx ? { ...t, volume: Math.round(norm * 127) } : t
        ));
      }
    }
    // Track mute via CC 118–133
    if (cc >= 118 && cc <= 133) {
      const trackIdx = cc - 118;
      if (tracks[trackIdx] && value >= 64) {
        setTracks(prev => prev.map((t, i) =>
          i === trackIdx ? { ...t, muted: !t.muted } : t
        ));
      }
    }
  }, [isPlaying, tracks]);

  const handleMappedMidiCC = React.useCallback((mapping, value) => {
    const norm = value / 127;
    switch(mapping.action) {
      case 'masterVolume':   setMasterVolume(norm); break;
      case 'masterPan':      setMasterPan((norm * 2) - 1); break;
      case 'play':           if (value >= 64) handleTransportAction('play'); break;
      case 'stop':           if (value >= 64) handleTransportAction('stop'); break;
      case 'record':         if (value >= 64) handleTransportAction('record'); break;
      case 'cycleToggle':    if (value >= 64) setCycleEnabled(e => !e); break;
      case 'trackVolume':
        if (mapping.trackIdx !== undefined && tracks[mapping.trackIdx]) {
          setTracks(prev => prev.map((t, i) =>
            i === mapping.trackIdx ? { ...t, volume: Math.round(norm * 127) } : t
          ));
        }
        break;
      case 'trackMute':
        if (mapping.trackIdx !== undefined && tracks[mapping.trackIdx] && value >= 64) {
          setTracks(prev => prev.map((t, i) =>
            i === mapping.trackIdx ? { ...t, muted: !t.muted } : t
          ));
        }
        break;
      case 'trackSolo':
        if (mapping.trackIdx !== undefined && tracks[mapping.trackIdx] && value >= 64) {
          setTracks(prev => prev.map((t, i) =>
            i === mapping.trackIdx ? { ...t, soloed: !t.soloed } : t
          ));
        }
        break;
    }
  }, [tracks]);

  const startMidiLearn = React.useCallback((target) => {
    midiLearnRef.current = { target };
    setMidiLearnMode(true);
    setStatus(`🎹 Move a knob/fader on your controller to map to: ${target.action}`);
  }, []);

  // ── NEW: Master pan live update ──
  useEffect(() => {
    if (masterPanRef.current) {
      try {
        masterPanRef.current.pan.setTargetAtTime(masterPan, audioCtxRef.current?.currentTime || 0, 0.01);
      } catch {
        masterPanRef.current.pan.value = masterPan;
      }
    }
  }, [masterPan]);

  // Initialize per-track audio graphs
  useEffect(() => {
    if (!audioCtxRef.current || !masterGainRef.current) return;

    // Init bus/aux tracks first so audio tracks can route into them
    tracks.filter(t => t.trackType === 'bus' || t.trackType === 'aux')
      .forEach(t => ensureBusGraph(t));
    tracks.filter(t => t.trackType !== 'bus' && t.trackType !== 'aux')
      .forEach(t => ensureTrackGraph(t));
  }, [tracks]);

  const getReverbBuf = useCallback((ctx, decay = 2) => {
    const len = ctx.sampleRate * decay;
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  }, []);

  const updateTrack = useCallback((i, u) => setTracks((p) => p.map((t, idx) => (idx === i ? { ...t, ...u } : t))), []);
  const updateEffect = (ti, fx, param, val) =>
    setTracks((p) =>
      p.map((t, i) => (i !== ti ? t : { ...t, effects: { ...t.effects, [fx]: { ...t.effects[fx], [param]: val } } })),
    );

  const hasSolo = tracks.some((t) => t.solo);
  const isAudible = (t) => !t.muted && (!hasSolo || t.solo);
  const applyAudibilityToAllGains = useCallback(
    (overrideTracks = null) => {
      const list = overrideTracks || tracks;
      const anySolo = list.some((t) => t.solo);

      list.forEach((t, idx) => {
        const gainNode = trackGainsRef.current[idx];
        if (!gainNode) return;

        const audible = !t.muted && (!anySolo || t.solo);
        gainNode.gain.value = audible ? (t.volume ?? 0.8) : 0;
      });
    },
    [tracks],
  );

  // ── STEP 13: Save Piano Roll edits back to region ──
  const savePianoRollToRegion = useCallback(() => {
    if (!editingRegion) return;
    const { trackIndex, regionId } = editingRegion;

    setTracks((prev) =>
      prev.map((t, i) => {
        if (i !== trackIndex) return t;
        return {
          ...t,
          regions: (t.regions || []).map((r) => {
            if (r.id !== regionId) return r;
            // Convert absolute beats back to relative
            const relativeNotes = pianoRollNotes.map((n) => ({
              ...n,
              startBeat: n.startBeat - r.startBeat,
            }));
            // Recalculate duration
            const maxEnd = Math.max(...relativeNotes.map((n) => n.startBeat + n.duration), 0);
            return { ...r, notes: relativeNotes, duration: Math.max(maxEnd, r.duration) };
          }),
        };
      }),
    );

    setEditingRegion(null);
    setStatus("✓ Piano Roll edits saved to region");
  }, [editingRegion, pianoRollNotes]);

  // Auto-save piano roll edits when switching away from pianoroll view (STEP 13)
  useEffect(() => {
    if (viewMode !== "pianoroll" && editingRegion) {
      savePianoRollToRegion();
    }
  }, [viewMode, editingRegion, savePianoRollToRegion]);

  // ── STEP 7 / STEP 13: Open Piano Roll from a MIDI region ──
  const onOpenPianoRoll = useCallback(
    (trackIdx, regionId) => {
      const track = tracks[trackIdx];
      const region = (track?.regions || []).find((r) => r.id === regionId);
      if (!region) return;

      setEditingRegion({ trackIndex: trackIdx, regionId });
      setPianoRollNotes(
        region.notes.map((n) => ({
          ...n,
          startBeat: n.startBeat + region.startBeat,
        })),
      );
      setViewMode("pianoroll");
    },
    [tracks],
  );

  // ── Waveform drawing ──
  const drawWaveform = useCallback((el, buf, color) => {
    if (!el || !buf) return;
    const c = el.getContext("2d"),
      w = el.width,
      h = el.height,
      data = buf.getChannelData(0),
      step = Math.ceil(data.length / w),
      mid = h / 2;

    c.clearRect(0, 0, w, h);
    c.strokeStyle = "rgba(255,255,255,0.03)";
    c.lineWidth = 1;
    for (let x = 0; x < w; x += 50) {
      c.beginPath();
      c.moveTo(x, 0);
      c.lineTo(x, h);
      c.stroke();
    }
    c.strokeStyle = "rgba(255,255,255,0.06)";
    c.beginPath();
    c.moveTo(0, mid);
    c.lineTo(w, mid);
    c.stroke();

    c.fillStyle = color + "40";
    c.beginPath();
    c.moveTo(0, mid);
    for (let i = 0; i < w; i++) {
      let mx = -1;
      for (let j = 0; j < step; j++) {
        const d = data[i * step + j];
        if (d !== undefined && d > mx) mx = d;
      }
      c.lineTo(i, mid - mx * mid * 0.9);
    }
    for (let i = w - 1; i >= 0; i--) {
      let mn = 1;
      for (let j = 0; j < step; j++) {
        const d = data[i * step + j];
        if (d !== undefined && d < mn) mn = d;
      }
      c.lineTo(i, mid - mn * mid * 0.9);
    }
    c.closePath();
    c.fill();

    c.strokeStyle = color;
    c.lineWidth = 0.8;
    c.beginPath();
    for (let i = 0; i < w; i++) {
      let mx = -1;
      for (let j = 0; j < step; j++) {
        const d = data[i * step + j];
        if (d !== undefined && d > mx) mx = d;
      }
      const y = mid - mx * mid * 0.9;
      i === 0 ? c.moveTo(i, y) : c.lineTo(i, y);
    }
    c.stroke();
  }, []);

  useEffect(() => {
    tracks.forEach((t, i) => {
      if (t.audioBuffer && canvasRefs.current[i]) drawWaveform(canvasRefs.current[i], t.audioBuffer, t.color);
    });
  }, [tracks, drawWaveform]);

  const loadAudioBuffer = async (url, ti) => {
    try {
      const ctx = getCtx();
      const r = await fetch(url);
      const ab = await r.arrayBuffer();
      const buf = await ctx.decodeAudioData(ab);
      updateTrack(ti, { audioBuffer: buf, audio_url: url });
        detectBPM(buf).then(det => {
          if (det && Math.abs(det - bpm) > 5)
            window.confirm(`Detected BPM: ${det} — set project to ${det}?`) && setBpm(det);
        });
      return buf;
    } catch (e) {
      console.error(e);
      return null;
    }
  };

  // ── Effects chain builder ──
  // ==========================================================================
  // ANALOG CONSOLE CHARACTER ENGINE
  // 8 classic mixing consoles — input transformer + EQ coloring + output stage
  // ==========================================================================
  const CONSOLE_BOARDS = {
    none:     { name: 'Bypass',        color: '#555' },
    ssl4ke:   { name: 'SSL 4000E',     color: '#e8a020' },
    ssl4kg:   { name: 'SSL 4000G',     color: '#d4941c' },
    neve8078: { name: 'Neve 8078',     color: '#4a9eff' },
    neve1073: { name: 'Neve 1073',     color: '#3a7acc' },
    api1604:  { name: 'API 1604',      color: '#00ffc8' },
    tridentA: { name: 'Trident A',     color: '#a78bfa' },
    studer900:{ name: 'Studer 900',    color: '#ff6b6b' },
    mciJH636: { name: 'MCI JH-636',   color: '#ff8c42' },
  };

  const applyConsoleCharacter = (ctx, inputNode, outputNode, boardId) => {
    if (!boardId || boardId === 'none') {
      inputNode.connect(outputNode);
      return [inputNode];
    }
    const nodes = [];

    // ── Input transformer (frequency-dependent saturation) ──
    const inputSat = ctx.createWaveShaper();
    const inputHp  = ctx.createBiquadFilter();
    inputHp.type   = 'highpass';

    // ── EQ coloring (passive shelf characteristic per board) ──
    const eqLo = ctx.createBiquadFilter();
    const eqHi = ctx.createBiquadFilter();
    eqLo.type  = 'lowshelf';
    eqHi.type  = 'highshelf';

    // ── Output transformer / op-amp stage ──
    const outputSat = ctx.createWaveShaper();
    const outputGain = ctx.createGain();

    switch (boardId) {
      case 'ssl4ke':
        // SSL 4000E — aggressive, punchy, bright top, fast transients
        // Input: tight transformer, minimal low end coloring
        inputHp.frequency.value = 18;
        inputHp.Q.value = 0.5;
        buildSatCurve(inputSat, 1.2, false); // symmetric, clean
        // EQ: slight low-mid scoop (200Hz), air boost (10kHz)
        eqLo.frequency.value = 200; eqLo.gain.value = -0.8;
        eqHi.frequency.value = 10000; eqHi.gain.value = 1.2;
        // Output: IC op-amp, clean with slight odd harmonics
        buildSatCurve(outputSat, 1.1, false);
        outputGain.gain.value = 0.98;
        break;

      case 'ssl4kg':
        // SSL 4000G — smoother than E, more refined
        inputHp.frequency.value = 15;
        inputHp.Q.value = 0.4;
        buildSatCurve(inputSat, 1.1, false);
        eqLo.frequency.value = 160; eqLo.gain.value = -0.5;
        eqHi.frequency.value = 12000; eqHi.gain.value = 0.8;
        buildSatCurve(outputSat, 1.05, false);
        outputGain.gain.value = 0.99;
        break;

      case 'neve8078':
        // Neve 8078 — thick transformer warmth, low-mid richness, smooth highs
        // Input: large iron transformer, heavy low-mid color
        inputHp.frequency.value = 30;
        inputHp.Q.value = 0.7;
        buildSatCurve(inputSat, 1.6, true); // asymmetric = even harmonics = warmth
        // EQ: low-mid boost (250Hz), gentle high rolloff
        eqLo.frequency.value = 250; eqLo.gain.value = 1.5;
        eqHi.frequency.value = 8000; eqHi.gain.value = -0.5;
        buildSatCurve(outputSat, 1.4, true);
        outputGain.gain.value = 0.95;
        break;

      case 'neve1073':
        // Neve 1073 — even richer than 8078, the classic preamp character
        inputHp.frequency.value = 50;
        inputHp.Q.value = 0.8;
        buildSatCurve(inputSat, 1.8, true);
        eqLo.frequency.value = 300; eqLo.gain.value = 2.0;
        eqHi.frequency.value = 6000; eqHi.gain.value = -0.8;
        buildSatCurve(outputSat, 1.6, true);
        outputGain.gain.value = 0.93;
        break;

      case 'api1604':
        // API 1604 — fast, punchy, aggressive mids, fast transient response
        inputHp.frequency.value = 20;
        inputHp.Q.value = 0.6;
        buildSatCurve(inputSat, 1.3, false);
        eqLo.frequency.value = 100; eqLo.gain.value = 0.5;
        eqHi.frequency.value = 5000; eqHi.gain.value = 1.0;
        buildSatCurve(outputSat, 1.25, false);
        outputGain.gain.value = 0.97;
        break;

      case 'tridentA':
        // Trident A-Range — smooth, open, vintage British warmth
        inputHp.frequency.value = 25;
        inputHp.Q.value = 0.5;
        buildSatCurve(inputSat, 1.4, true);
        eqLo.frequency.value = 180; eqLo.gain.value = 1.0;
        eqHi.frequency.value = 9000; eqHi.gain.value = 0.6;
        buildSatCurve(outputSat, 1.3, true);
        outputGain.gain.value = 0.96;
        break;

      case 'studer900':
        // Studer 900 — European precision, tight low end, clinical
        inputHp.frequency.value = 22;
        inputHp.Q.value = 0.4;
        buildSatCurve(inputSat, 1.05, false);
        eqLo.frequency.value = 120; eqLo.gain.value = -0.3;
        eqHi.frequency.value = 15000; eqHi.gain.value = 0.3;
        buildSatCurve(outputSat, 1.02, false);
        outputGain.gain.value = 1.0;
        break;

      case 'mciJH636':
        // MCI JH-636 — Thriller board, warm with fast transients
        inputHp.frequency.value = 28;
        inputHp.Q.value = 0.6;
        buildSatCurve(inputSat, 1.5, true);
        eqLo.frequency.value = 220; eqLo.gain.value = 1.2;
        eqHi.frequency.value = 7500; eqHi.gain.value = 0.8;
        buildSatCurve(outputSat, 1.35, true);
        outputGain.gain.value = 0.96;
        break;

      default:
        inputNode.connect(outputNode);
        return [inputNode];
    }

    // Connect chain: input → inputHp → inputSat → eqLo → eqHi → outputSat → outputGain → output
    inputNode.connect(inputHp);
    inputHp.connect(inputSat);
    inputSat.connect(eqLo);
    eqLo.connect(eqHi);
    eqHi.connect(outputSat);
    outputSat.connect(outputGain);
    outputGain.connect(outputNode);

    nodes.push(inputHp, inputSat, eqLo, eqHi, outputSat, outputGain);
    return nodes;
  };

  // Build waveshaper curve — asymmetric for even harmonics (analog warmth)
  const buildSatCurve = (wsNode, drive = 1.2, asymmetric = false) => {
    const N = 44100;
    const curve = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const x = (i * 2) / N - 1;
      if (asymmetric) {
        // Asymmetric: positive clips softer, negative harder = even harmonics
        curve[i] = x > 0
          ? x / (1 + drive * 0.8 * Math.abs(x))
          : x / (1 + drive * 1.2 * Math.abs(x));
      } else {
        // Symmetric: tanh-style soft clip = odd harmonics
        curve[i] = Math.tanh(x * drive) / Math.tanh(drive);
      }
    }
    wsNode.curve = curve;
    wsNode.oversample = '4x';
  };

  const buildFxChain = (ctx, track) => {
    const nodes = [];
    const fx = track.effects;

    if (fx.eq.enabled) {
      const lo = ctx.createBiquadFilter();
      lo.type = "lowshelf";
      lo.frequency.value = 320;
      lo.gain.value = fx.eq.lowGain;

      const mi = ctx.createBiquadFilter();
      mi.type = "peaking";
      mi.frequency.value = fx.eq.midFreq;
      mi.Q.value = 1.5;
      mi.gain.value = fx.eq.midGain;

      const hi = ctx.createBiquadFilter();
      hi.type = "highshelf";
      hi.frequency.value = 3200;
      hi.gain.value = fx.eq.highGain;

      nodes.push(lo, mi, hi);
    }

    if (fx.filter.enabled) {
      const f = ctx.createBiquadFilter();
      f.type = fx.filter.type;
      f.frequency.value = fx.filter.frequency;
      f.Q.value = fx.filter.Q;
      nodes.push(f);
    }

    if (fx.compressor.enabled) {
      const c = ctx.createDynamicsCompressor();
      c.threshold.value = fx.compressor.threshold;
      c.ratio.value = fx.compressor.ratio;
      c.attack.value = fx.compressor.attack;
      c.release.value = fx.compressor.release;
      nodes.push(c);
    }

    if (fx.distortion.enabled && fx.distortion.amount > 0) {
      const ws = ctx.createWaveShaper();
      const amt = fx.distortion.amount;
      const s = 44100;
      const curve = new Float32Array(s);
      for (let i = 0; i < s; i++) {
        const x = (i * 2) / s - 1;
        curve[i] = ((3 + amt) * x * 20 * (Math.PI / 180)) / (Math.PI + amt * Math.abs(x));
      }
      ws.curve = curve;
      ws.oversample = "4x";
      nodes.push(ws);
    }

    if (fx.limiter?.enabled) {
      const lim = ctx.createDynamicsCompressor();
      lim.threshold.value = fx.limiter.threshold;
      lim.knee.value = fx.limiter.knee;
      lim.ratio.value = fx.limiter.ratio;
      lim.attack.value = fx.limiter.attack;
      lim.release.value = fx.limiter.release;
      nodes.push(lim);
    }

    // ── Gate (expander with high ratio) ──
    if (fx.gate?.enabled) {
      const gt = ctx.createDynamicsCompressor();
      gt.threshold.value = fx.gate.threshold;
      gt.ratio.value = 20;
      gt.knee.value = 0;
      gt.attack.value = fx.gate.attack;
      gt.release.value = fx.gate.release;
      nodes.push(gt);
    }

    // ── De-Esser (narrow band compressor on sibilance) ──
    if (fx.deesser?.enabled) {
      const bp = ctx.createBiquadFilter();
      bp.type = "peaking";
      bp.frequency.value = fx.deesser.frequency;
      bp.Q.value = 4;
      bp.gain.value = -Math.abs(fx.deesser.threshold);
      nodes.push(bp);
    }

    // ── Chorus (modulated delay) ──
    if (fx.chorus?.enabled) {
      const cd = ctx.createDelay(0.05);
      cd.delayTime.value = fx.chorus.depth;
      const cLfo = ctx.createOscillator();
      const cLfoG = ctx.createGain();
      cLfo.frequency.value = fx.chorus.rate;
      cLfoG.gain.value = fx.chorus.depth * 0.5;
      cLfo.connect(cLfoG);
      cLfoG.connect(cd.delayTime);
      cLfo.start();
      nodes.push(cd);
    }

    // ── Flanger (short modulated delay with feedback) ──
    if (fx.flanger?.enabled) {
      const fd = ctx.createDelay(0.02);
      fd.delayTime.value = fx.flanger.depth;
      const fLfo = ctx.createOscillator();
      const fLfoG = ctx.createGain();
      fLfo.frequency.value = fx.flanger.rate;
      fLfoG.gain.value = fx.flanger.depth * 0.5;
      fLfo.connect(fLfoG);
      fLfoG.connect(fd.delayTime);
      fLfo.start();
      nodes.push(fd);
    }

    // ── Phaser (allpass filter stages) ──
    if (fx.phaser?.enabled) {
      for (let s = 0; s < (fx.phaser.stages || 4); s++) {
        const ap = ctx.createBiquadFilter();
        ap.type = "allpass";
        ap.frequency.value = fx.phaser.baseFreq * (1 + s * 0.5);
        ap.Q.value = fx.phaser.Q;
        nodes.push(ap);
      }
    }

    // ── Tremolo (amplitude modulation) ──
    if (fx.tremolo?.enabled) {
      const tGain = ctx.createGain();
      tGain.gain.value = 1 - fx.tremolo.depth * 0.5;
      const tLfo = ctx.createOscillator();
      const tLfoG = ctx.createGain();
      tLfo.frequency.value = fx.tremolo.rate;
      tLfoG.gain.value = fx.tremolo.depth * 0.5;
      tLfo.connect(tLfoG);
      tLfoG.connect(tGain.gain);
      tLfo.start();
      nodes.push(tGain);
    }

    // ── Bit Crusher (quantization distortion) ──
    if (fx.bitcrusher?.enabled) {
      const bws = ctx.createWaveShaper();
      const bits = fx.bitcrusher.bits || 8;
      const steps = Math.pow(2, bits);
      const bcurve = new Float32Array(44100);
      for (let i = 0; i < 44100; i++) {
        const x = (i * 2) / 44100 - 1;
        bcurve[i] = Math.round(x * steps) / steps;
      }
      bws.curve = bcurve;
      nodes.push(bws);
    }

    // ── Exciter (harmonic enhancer) ──
    if (fx.exciter?.enabled) {
      const ehpf = ctx.createBiquadFilter();
      ehpf.type = "highpass";
      ehpf.frequency.value = fx.exciter.frequency;
      const ews = ctx.createWaveShaper();
      const ea = fx.exciter.amount;
      const ecurve = new Float32Array(44100);
      for (let i = 0; i < 44100; i++) {
        const x = (i * 2) / 44100 - 1;
        ecurve[i] = x + (ea / 100) * Math.sin(x * Math.PI);
      }
      ews.curve = ecurve;
      nodes.push(ehpf, ews);
    }

    // ── Tape Saturation ──
    if (fx.tapeSaturation?.enabled) {
      const tws = ctx.createWaveShaper();
      const drv = fx.tapeSaturation.drive || 0.3;
      const tcurve = new Float32Array(44100);
      for (let i = 0; i < 44100; i++) {
        const x = (i * 2) / 44100 - 1;
        tcurve[i] = Math.tanh(x * (1 + drv * 5));
      }
      tws.curve = tcurve;
      tws.oversample = "4x";
      const tlp = ctx.createBiquadFilter();
      tlp.type = "lowpass";
      tlp.frequency.value = 12000 - fx.tapeSaturation.warmth * 6000;
      nodes.push(tws, tlp);
    }

    // ── Gain Utility ──
    if (fx.gainUtility?.enabled) {
      const ug = ctx.createGain();
      ug.gain.value = Math.pow(10, (fx.gainUtility.gain || 0) / 20);
      if (fx.gainUtility.phaseInvert) ug.gain.value *= -1;
      nodes.push(ug);
    }
    return nodes;
  };

  const buildSends = (ctx, track, dry, master) => {
    const fx = track.effects;

    if (fx.reverb.enabled && fx.reverb.mix > 0) {
      const conv = ctx.createConvolver();
      conv.buffer = getReverbBuf(ctx, fx.reverb.decay);
      const g = ctx.createGain();
      g.gain.value = fx.reverb.mix;
      dry.connect(conv);
      conv.connect(g);
      g.connect(master);
    }

    if (fx.delay.enabled && fx.delay.mix > 0) {
      const d = ctx.createDelay(5);
      d.delayTime.value = fx.delay.time;
      const fb = ctx.createGain();
      fb.gain.value = fx.delay.feedback;
      const mx = ctx.createGain();
      mx.gain.value = fx.delay.mix;
      dry.connect(d);
      d.connect(fb);
      fb.connect(d);
      d.connect(mx);
      mx.connect(master);
    }
  };

  // ── NEW: Real-time meter animation (track + master stereo) ──
  const startMeterAnimation = useCallback(() => {
    if (meterAnimRef.current) cancelAnimationFrame(meterAnimRef.current);

    const animate = () => {
      // Track meters
      const analysers = trackAnalysersRef.current;
      if (analysers && analysers.length > 0) {
        const levels = analysers.map((pair) => {
          if (!pair || !pair.left || !pair.right) return { left: 0, right: 0, peak: 0 };

          const dataL = new Uint8Array(pair.left.frequencyBinCount);
          pair.left.getByteFrequencyData(dataL);
          let sumL = 0;
          for (let i = 0; i < dataL.length; i++) sumL += dataL[i];
          const left = sumL / (dataL.length * 255);

          const dataR = new Uint8Array(pair.right.frequencyBinCount);
          pair.right.getByteFrequencyData(dataR);
          let sumR = 0;
          for (let i = 0; i < dataR.length; i++) sumR += dataR[i];
          const right = sumR / (dataR.length * 255);

          return { left, right, peak: Math.max(left, right) };
        });
        setMeterLevels(levels);
      } else {
        setMeterLevels([]);
      }

      // NEW: Master stereo meters
      if (masterAnalyserLRef.current && masterAnalyserRRef.current) {
        const bL = new Uint8Array(masterAnalyserLRef.current.frequencyBinCount);
        masterAnalyserLRef.current.getByteFrequencyData(bL);
        let sL = 0;
        for (let i = 0; i < bL.length; i++) sL += bL[i];
        const mL = sL / (bL.length * 255);

        const bR = new Uint8Array(masterAnalyserRRef.current.frequencyBinCount);
        masterAnalyserRRef.current.getByteFrequencyData(bR);
        let sR = 0;
        for (let i = 0; i < bR.length; i++) sR += bR[i];
        const mR = sR / (bR.length * 255);

        setMasterMeterLevels({ left: mL, right: mR, peak: Math.max(mL, mR) });
      }

      meterAnimRef.current = requestAnimationFrame(animate);
    };

    meterAnimRef.current = requestAnimationFrame(animate);
  }, []);

  const stopMeterAnimation = useCallback(() => {
    if (meterAnimRef.current) {
      cancelAnimationFrame(meterAnimRef.current);
      meterAnimRef.current = null;
    }
    setMeterLevels([]);
    setMasterMeterLevels({ left: 0, right: 0, peak: 0 });
  }, []);

  // ── Playback ──
  const startMetronome = (ctx) => {
    if (metroRef.current) {
      clearInterval(metroRef.current);
      metroRef.current = null;
    }
    const beats = timeSignature && timeSignature[0] ? timeSignature[0] : 4;
    const iv = (60 / bpm) * 1000;
    let beat = 0;
    const click = (isDownbeat) => {
      try {
        if (!ctx || ctx.state === "closed") return;
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.frequency.value = isDownbeat ? 1000 : 800;
        g.gain.setValueAtTime(0.35, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
        o.connect(g);
        g.connect(ctx.destination);
        o.start(ctx.currentTime);
        o.stop(ctx.currentTime + 0.06);
      } catch (e) {}
    };
    click(true);
    metroRef.current = setInterval(() => {
      beat = (beat + 1) % beats;
      click(beat === 0);
    }, iv);
  };

  const stopMetronome = () => {
    if (metroRef.current) {
      clearInterval(metroRef.current);
      metroRef.current = null;
    }
  };

  const playCountIn = (ctx) =>
    new Promise((res) => {
      const iv = (60 / bpm) * 1000;
      let c = 0;
      const click = () => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.frequency.value = c === 0 ? 1200 : 1000;
        g.gain.value = 0.5;
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
        o.connect(g);
        g.connect(ctx.destination);
        o.start(ctx.currentTime);
        o.stop(ctx.currentTime + 0.06);
      };
      click();
      const id = setInterval(() => {
        c++;
        if (c >= (timeSignature && timeSignature[0] ? timeSignature[0] : 4)) {
          clearInterval(id);
          res();
        } else click();
      }, iv);
    });

  const startPlayback = (overdub = false) => {
    const ctx = getCtx();

    trackSourcesRef.current.forEach((s) => {
      try {
        s.stop();
      } catch { }
    });
    trackSourcesRef.current = [];
    trackGainsRef.current = [];
    trackPansRef.current = [];
    trackAnalysersRef.current = [];

    let maxDur = 0;

    tracks.forEach((t, i) => {
      if (!t.audioBuffer) {
        trackAnalysersRef.current[i] = null;
        return;
      }

      const s = ctx.createBufferSource();
      s.buffer = t.audioBuffer;

      const g = ctx.createGain();
      g.gain.value = isAudible(t) ? t.volume : 0;

      const p = ctx.createStereoPanner();
      p.pan.value = t.pan;

      const splitter = ctx.createChannelSplitter(2);
      const analyserL = ctx.createAnalyser();
      analyserL.fftSize = 256;
      analyserL.smoothingTimeConstant = 0.7;

      const analyserR = ctx.createAnalyser();
      analyserR.fftSize = 256;
      analyserR.smoothingTimeConstant = 0.7;

      const fxNodes = buildFxChain(ctx, t);
      let last = s;
      fxNodes.forEach((n) => {
        last.connect(n);
        last = n;
      });

      last.connect(g);
      g.connect(p);

      p.connect(splitter);
      splitter.connect(analyserL, 0);
      splitter.connect(analyserR, 1);

      p.connect(masterGainRef.current);
      buildSends(ctx, t, p, masterGainRef.current);

      s.start(0, playOffsetRef.current);

      trackSourcesRef.current[i] = s;
      trackGainsRef.current[i] = g;
      trackPansRef.current[i] = p;
      trackAnalysersRef.current[i] = { left: analyserL, right: analyserR };

      if (t.audioBuffer.duration > maxDur) maxDur = t.audioBuffer.duration;
    });

    setDuration(maxDur);
    playStartRef.current = ctx.currentTime;
    setIsPlaying(true);

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
    trackSourcesRef.current.forEach((s) => {
      try {
        s.stop();
      } catch { }
    });
    trackSourcesRef.current = [];

    if (!metronomeOn && metroRef.current) {
      clearInterval(metroRef.current);
      metroRef.current = null;
    }
    if (timeRef.current) clearInterval(timeRef.current);

    stopMeterAnimation();
    trackAnalysersRef.current = [];
    setIsPlaying(false);

    if (!isRecording) {
      playOffsetRef.current = currentTime;
      setStatus("■ Stopped");
    }
  };

  // ── Recording ──
  const createRegionFromRecording = (trackIndex, audioBuffer, audioUrl) => {
    const regionId = `rgn_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const startBeat = secondsToBeat(playOffsetRef.current, bpm);
    const durationBeat = secondsToBeat(audioBuffer.duration, bpm);

    const newRegion = {
      id: regionId,
      name: tracks[trackIndex]?.name || `Track ${trackIndex + 1}`,
      startBeat,
      duration: durationBeat,
      audioUrl,
      color: tracks[trackIndex]?.color || TRACK_COLORS[trackIndex % TRACK_COLORS.length],
      loopEnabled: false,
      loopCount: 1,
    };

    setTracks((prev) =>
      prev.map((t, i) => (i === trackIndex ? { ...t, regions: [...(t.regions || []), newRegion] } : t)),
    );
  };

  const createRegionFromImport = (trackIndex, audioBuffer, name, audioUrl) => {
    const regionId = `rgn_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const durationBeat = secondsToBeat(audioBuffer.duration, bpm);

    setTracks((prev) =>
      prev.map((t, i) =>
        i === trackIndex
          ? {
            ...t,
            regions: [
              ...(t.regions || []),
              {
                id: regionId,
                name: name || `Import ${trackIndex + 1}`,
                startBeat: 0,
                duration: durationBeat,
                audioUrl,
                color: t.color || TRACK_COLORS[trackIndex % TRACK_COLORS.length],
                loopEnabled: false,
                loopCount: 1,
              },
            ],
          }
          : t,
      ),
    );
  };

  const uploadTrack = async (blob, ti) => {
    if (!projectId) return;
    try {
      const tok = localStorage.getItem("token") || sessionStorage.getItem("token");
      const bu = process.env.REACT_APP_BACKEND_URL || "";
      const fd = new FormData();
      fd.append("file", blob, `track_${ti}.webm`);
      fd.append("project_id", projectId);
      fd.append("track_index", ti);

      await fetch(`${bu}/api/studio/tracks/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${tok}` },
        body: fd,
      });
    } catch (e) {
      console.error(e);
    }
  };

  const startRecording = async () => {
    const ai = tracks.findIndex((t) => t.armed);
    if (ai === -1) {
      setStatus("⚠ Arm a track");
      return;
    }

    try {
      const ctx = getCtx();
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: selectedDevice !== "default" ? { exact: selectedDevice } : undefined,
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          sampleRate: 44100,
        },
      });

      mediaStreamRef.current = stream;
      setMicSimStream(stream);

      const src = ctx.createMediaStreamSource(stream);
      inputAnalyserRef.current = ctx.createAnalyser();
      inputAnalyserRef.current.fftSize = 256;
      src.connect(inputAnalyserRef.current);

      const mon = () => {
        if (!inputAnalyserRef.current) return;
        const d = new Uint8Array(inputAnalyserRef.current.frequencyBinCount);
        inputAnalyserRef.current.getByteFrequencyData(d);
        setInputLevel(d.reduce((a, b) => a + b, 0) / d.length / 255);
        inputAnimRef.current = requestAnimationFrame(mon);
      };
      mon();

      if (countIn) {
        setStatus("Count in...");
        await playCountIn(ctx);
      }

      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "audio/webm";
      const rec = new MediaRecorder(stream, { mimeType: mime });
      chunksRef.current = [];

      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      rec.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: mime });
        const ab = await blob.arrayBuffer();
        const buf = await ctx.decodeAudioData(ab);
        const audioUrl = URL.createObjectURL(blob);

        updateTrack(ai, { audioBuffer: buf, audio_url: audioUrl });
        createRegionFromRecording(ai, buf, audioUrl);

        await uploadTrack(blob, ai);
        setStatus("✓ Recorded");
      };

      mediaRecorderRef.current = rec;
      rec.start(100);
      startPlayback(true);
      setIsRecording(true);
      setStatus(`● REC Track ${ai + 1}`);
    } catch (e) {
      setStatus(`✗ Mic: ${e.message}`);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") mediaRecorderRef.current.stop();

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }

    if (inputAnimRef.current) cancelAnimationFrame(inputAnimRef.current);

    setMicSimStream(null);
    setInputLevel(0);
    setIsRecording(false);
    stopPlayback();
  };

  const stopEverything = () => {
    stopRecording();
    stopPlayback();
    stopMetronome();
    setMetronomeOn(false);
    playOffsetRef.current = 0;
    setCurrentTime(0);
  };


  // ── Mix Down / Bounce to WAV ─────────────────────────────────────────
  const mixDownProject = async () => {
    const hasTracks = tracks.some(t => t.audioBuffer);
    if (!hasTracks) { setStatus("⚠ No audio to bounce"); return; }
    setMixingDown && setMixingDown(true);
    setStatus("⏳ Bouncing to WAV...");
    try {
      const sr     = 44100;
      const maxDur = Math.max(...tracks.map(t => t.audioBuffer?.duration ?? 0), 0.5);
      const offCtx = new OfflineAudioContext(2, Math.ceil(sr * (maxDur + 1)), sr);
      const master = offCtx.createGain();
      master.gain.value = masterVolume ?? 1;
      master.connect(offCtx.destination);

      tracks.forEach(t => {
        if (!t.audioBuffer || t.muted) return;
        const anySolo = tracks.some(x => x.solo);
        if (anySolo && !t.solo) return;
        const src = offCtx.createBufferSource(); src.buffer = t.audioBuffer;
        const g   = offCtx.createGain(); g.gain.value = t.volume ?? 0.8;
        const pan = offCtx.createStereoPanner(); pan.pan.value = t.pan ?? 0;
        let last  = src;
        const fx  = t.effects ?? {};
        if (fx.eq?.enabled) {
          const lo=offCtx.createBiquadFilter();lo.type='lowshelf';lo.frequency.value=fx.eq.lowFreq??200;lo.gain.value=fx.eq.lowShelf??0;
          const mi=offCtx.createBiquadFilter();mi.type='peaking';mi.frequency.value=fx.eq.midFreq??1000;mi.Q.value=fx.eq.midQ??1;mi.gain.value=fx.eq.midPeak??0;
          const hi=offCtx.createBiquadFilter();hi.type='highshelf';hi.frequency.value=fx.eq.highFreq??8000;hi.gain.value=fx.eq.highShelf??0;
          last.connect(lo);lo.connect(mi);mi.connect(hi);last=hi;
        }
        if (fx.compressor?.enabled) {
          const c=offCtx.createDynamicsCompressor();
          c.threshold.value=fx.compressor.threshold??-24;c.ratio.value=fx.compressor.ratio??4;
          c.attack.value=(fx.compressor.attack??10)/1000;c.release.value=(fx.compressor.release??100)/1000;
          last.connect(c);last=c;
        }
        if (fx.reverb?.enabled&&(fx.reverb.mix??0)>0) {
          const decLen=Math.floor(sr*(fx.reverb.decay??1.5));
          const ir=offCtx.createBuffer(2,decLen,sr);
          for(let ch=0;ch<2;ch++){const d=ir.getChannelData(ch);for(let i=0;i<decLen;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/decLen,1.8);}
          const conv=offCtx.createConvolver();conv.buffer=ir;
          const wet=offCtx.createGain();wet.gain.value=fx.reverb.mix??0.3;
          const dry=offCtx.createGain();dry.gain.value=1-(fx.reverb.mix??0.3);
          const mx=offCtx.createGain();
          last.connect(dry);dry.connect(mx);last.connect(conv);conv.connect(wet);wet.connect(mx);last=mx;
        }
        if (fx.delay?.enabled&&(fx.delay.mix??0)>0) {
          const dly=offCtx.createDelay(2);dly.delayTime.value=(fx.delay.time??250)/1000;
          const fb=offCtx.createGain();fb.gain.value=(fx.delay.feedback??30)/100;
          const wet=offCtx.createGain();wet.gain.value=(fx.delay.mix??25)/100;
          const dry=offCtx.createGain();dry.gain.value=1-(fx.delay.mix??25)/100;
          const mx=offCtx.createGain();
          last.connect(dly);dly.connect(fb);fb.connect(dly);dly.connect(wet);wet.connect(mx);last.connect(dry);dry.connect(mx);last=mx;
        }
        if (fx.limiter?.enabled) {
          const lim=offCtx.createDynamicsCompressor();
          lim.threshold.value=fx.limiter.threshold??-1;lim.knee.value=0;lim.ratio.value=20;
          lim.attack.value=0.001;lim.release.value=(fx.limiter.release??50)/1000;
          last.connect(lim);last=lim;
        }
        last.connect(g);g.connect(pan);pan.connect(master);
        src.start(t.startTime??0);
      });

      const buf=await offCtx.startRendering();
      const nc=buf.numberOfChannels,len=buf.length*nc*2;
      const ab=new ArrayBuffer(44+len);const view=new DataView(ab);
      const ws=(o,s)=>{for(let i=0;i<s.length;i++)view.setUint8(o+i,s.charCodeAt(i));};
      ws(0,'RIFF');view.setUint32(4,36+len,true);ws(8,'WAVE');
      ws(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);
      view.setUint16(22,nc,true);view.setUint32(24,sr,true);
      view.setUint32(28,sr*nc*2,true);view.setUint16(32,nc*2,true);
      view.setUint16(34,16,true);ws(36,'data');view.setUint32(40,len,true);
      let off=44;
      for(let i=0;i<buf.length;i++)for(let ch=0;ch<nc;ch++){
        const s=Math.max(-1,Math.min(1,buf.getChannelData(ch)[i]));
        view.setInt16(off,s<0?s*0x8000:s*0x7FFF,true);off+=2;
      }
      const blob=new Blob([ab],{type:'audio/wav'});
      const url=URL.createObjectURL(blob);
      const a=document.createElement('a');
      a.href=url;a.download=`${(projectName??'project').replace(/\s+/g,'_')}_mix.wav`;
      document.body.appendChild(a);a.click();document.body.removeChild(a);
      setTimeout(()=>URL.revokeObjectURL(url),8000);
      setStatus(`✓ Bounced: ${a.download}`);
    } catch(e){setStatus(`✗ Bounce failed: ${e.message}`);}
    setMixingDown && setMixingDown(false);
  };
  // ─────────────────────────────────────────────────────────────────────

  // ── Smart BPM Detection ───────────────────────────────────────────────
  const detectBPM = async (audioBuffer) => {
    try {
      const data=audioBuffer.getChannelData(0),sr=audioBuffer.sampleRate;
      const win=Math.floor(sr*0.01),energy=[];
      for(let i=0;i<data.length-win;i+=win){let e=0;for(let j=0;j<win;j++)e+=data[i+j]*data[i+j];energy.push(e/win);}
      const avg=energy.reduce((a,b)=>a+b,0)/energy.length,thresh=avg*1.6;
      const beats=[];let last=0,minGap=Math.floor(sr*0.01*0.25/win);
      for(let i=1;i<energy.length;i++)if(energy[i]>thresh&&energy[i]>energy[i-1]&&(i-last)>minGap){beats.push(i*win/sr);last=i;}
      if(beats.length<4)return null;
      const ints=[];for(let i=1;i<Math.min(beats.length,32);i++)ints.push(beats[i]-beats[i-1]);
      const avgInt=ints.reduce((a,b)=>a+b,0)/ints.length,raw=Math.round(60/avgInt);
      if(raw>=60&&raw<=200)return raw;if(raw>=30&&raw<60)return raw*2;if(raw>200)return Math.round(raw/2);
      return null;
    }catch(_){return null;}
  };
  // ─────────────────────────────────────────────────────────────────────

  // ── Freeze / Unfreeze Track ───────────────────────────────────────────
  const freezeTrack = async (ti) => {
    const t=tracks[ti];
    if(!t?.audioBuffer){setStatus(`⚠ Track ${ti+1} has no audio to freeze`);return;}
    if(t.frozen){setStatus(`Track ${ti+1} already frozen`);return;}
    setStatus(`⏳ Freezing Track ${ti+1}...`);
    try{
      const sr=audioCtxRef.current?.sampleRate||48000,offCtx=new OfflineAudioContext(2,Math.ceil(sr*(t.audioBuffer.duration+0.5)),sr);
      const src=offCtx.createBufferSource();src.buffer=t.audioBuffer;
      const g=offCtx.createGain();g.gain.value=t.volume??0.8;
      const pan=offCtx.createStereoPanner();pan.pan.value=t.pan??0;
      let last=src;const fx=t.effects??{};
      if(fx.eq?.enabled){
        const lo=offCtx.createBiquadFilter();lo.type='lowshelf';lo.frequency.value=fx.eq.lowFreq??200;lo.gain.value=fx.eq.lowShelf??0;
        const mi=offCtx.createBiquadFilter();mi.type='peaking';mi.frequency.value=fx.eq.midFreq??1000;mi.Q.value=1.5;mi.gain.value=fx.eq.midPeak??0;
        const hi=offCtx.createBiquadFilter();hi.type='highshelf';hi.frequency.value=fx.eq.highFreq??8000;hi.gain.value=fx.eq.highShelf??0;
        last.connect(lo);lo.connect(mi);mi.connect(hi);last=hi;
      }
      if(fx.compressor?.enabled){
        const c=offCtx.createDynamicsCompressor();
        c.threshold.value=fx.compressor.threshold??-24;c.ratio.value=fx.compressor.ratio??4;
        c.attack.value=(fx.compressor.attack??10)/1000;c.release.value=(fx.compressor.release??100)/1000;
        last.connect(c);last=c;
      }
      last.connect(g);g.connect(pan);pan.connect(offCtx.destination);
      src.start(0);
      const rendered=await offCtx.startRendering();
      updateTrack(ti,{audioBuffer:rendered,frozenBuffer:t.audioBuffer,
        frozenEffects:JSON.parse(JSON.stringify(fx)),frozen:true,
        name:(t.name??`Track ${ti+1}`)+'  ❄'});
      setStatus(`✓ Track ${ti+1} frozen — FX baked in`);
    }catch(e){setStatus(`✗ Freeze failed: ${e.message}`);}
  };

  const unfreezeTrack=(ti)=>{
    const t=tracks[ti];
    if(!t?.frozen||!t?.frozenBuffer){setStatus(`Track ${ti+1} is not frozen`);return;}
    updateTrack(ti,{audioBuffer:t.frozenBuffer,frozenBuffer:null,
      effects:t.frozenEffects??t.effects,frozen:false,
      name:(t.name??'').replace('  ❄','')});
    setStatus(`✓ Track ${ti+1} unfrozen`);
  };
  // ─────────────────────────────────────────────────────────────────────

  
  // ── Split screen resize drag ─────────────────────────────────────────────
  const handleSplitMouseDown = React.useCallback((e) => {
    e.preventDefault();
    splitDragRef.current = true;
    const container = splitContainerRef.current;
    if (!container) return;
    const onMove = (me) => {
      if (!splitDragRef.current) return;
      const rect = container.getBoundingClientRect();
      const pct  = Math.max(20, Math.min(80, ((me.clientY - rect.top) / rect.height) * 100));
      setSplitTopH(Math.round(pct));
    };
    const onUp = () => {
      splitDragRef.current = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, []);
  // ─────────────────────────────────────────────────────────────────────────

  
  // ── Open flex pitch editor for a track ──────────────────────────────────────
  const openFlexPitch = React.useCallback((ti) => {
    const t = tracks[ti];
    if (!t?.audioBuffer) {
      setStatus(`⚠ Track ${ti + 1} has no audio — record or import first`);
      return;
    }
    setFlexPitchBuffer(t.audioBuffer);
    setFlexPitchTrack(ti);
    setShowFlexPitch(true);
  }, [tracks]);

  const handleFlexPitchExport = React.useCallback((correctedBuffer) => {
    if (flexPitchTrack === null) return;
    updateTrack(flexPitchTrack, { audioBuffer: correctedBuffer });
    setStatus(`✓ Pitch corrections applied to Track ${flexPitchTrack + 1}`);
    setShowFlexPitch(false);
  }, [flexPitchTrack, updateTrack]);
  // ────────────────────────────────────────────────────────────────────────────

  
  // ── Cloud Auto-Save every 60 seconds ───────────────────────────────────
  React.useEffect(() => {
    if (!projectId) return; // only auto-save existing projects
    const interval = setInterval(() => {
      if (!saving) {
        saveProject();
        setStatus('✓ Auto-saved');
      }
    }, 60000); // 60 seconds
    return () => clearInterval(interval);
  }, [projectId, saving]);

  // ── Recreate AudioContext with new latency settings ──────────────────────
  const recreateAudioContext = React.useCallback(async (bufferSize, sampleRate) => {
    // Close existing context
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      await audioCtxRef.current.close();
    }
    // Create new context with updated settings
    const hint = bufferSize <= 128 ? 'interactive' : bufferSize <= 512 ? 'balanced' : 'playback';
    audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)({
      latencyHint: hint,
      sampleRate:  sampleRate,
    });
    setAudioBufferSize(bufferSize);
    setAudioSampleRate(sampleRate);
    const ms = Math.round((audioCtxRef.current.baseLatency + (audioCtxRef.current.outputLatency || 0)) * 1000);
    setLatencyMs(ms);
    setStatus(`✓ Audio engine restarted — ${sampleRate}Hz, ~${ms}ms latency`);
  }, []);
  // ─────────────────────────────────────────────────────────────────────────

    const rewind = () => {
    if (isPlaying) stopPlayback();
    playOffsetRef.current = 0;
    setCurrentTime(0);
  };

  const fmt = (s) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    const ms = Math.floor((s % 1) * 100);
    return `${m}:${String(sec).padStart(2, "0")}.${String(ms).padStart(2, "0")}`;
  };

  // ── Import audio ──
  const handleImport = async (ti) => {
    const inp = document.createElement("input");
    inp.type = "file";
    inp.accept = "audio/*";

    inp.onchange = async (e) => {
      const f = e.target.files?.[0];
      if (!f) return;

      setStatus("Importing...");
      try {
        const ctx = getCtx();
        const ab = await f.arrayBuffer();
        const buf = await ctx.decodeAudioData(ab);

        const name = f.name.replace(/\.[^/.]+$/, "").substring(0, 20);
        const audioUrl = URL.createObjectURL(f);

        updateTrack(ti, { audioBuffer: buf, audio_url: audioUrl, name });
        createRegionFromImport(ti, buf, name, audioUrl);

        if (projectId) {
          const fd = new FormData();
          fd.append("file", f);
          fd.append("project_id", projectId);
          fd.append("track_index", ti);
          const tok = localStorage.getItem("token") || sessionStorage.getItem("token");
          const bu = process.env.REACT_APP_BACKEND_URL || "";
          await fetch(`${bu}/api/studio/tracks/import`, {
            method: "POST",
            headers: { Authorization: `Bearer ${tok}` },
            body: fd,
          });
        }

        setStatus(`✓ Track ${ti + 1}`);
      } catch (err) {
        setStatus(`✗ ${err.message}`);
      }
    };

    inp.click();
  };

  const clearTrack = (ti) => {
    updateTrack(ti, { audioBuffer: null, audio_url: null, armed: false, regions: [] });
    setStatus(`Track ${ti + 1} cleared`);
  };

  // ── Beat export to track ──
  const handleBeatExport = useCallback(
    (renderedBuffer, blob) => {
      let targetTrack = tracks.findIndex((t) => !t.audioBuffer);
      if (targetTrack === -1 && tracks.length < maxTracks) {
        targetTrack = tracks.length;
        setTracks((prev) => [...prev, DEFAULT_TRACK(targetTrack)]);
      }
      if (targetTrack === -1) {
        setStatus("⚠ No empty tracks. Clear a track first.");
        return;
      }
      if (renderedBuffer) {
        const audioUrl = URL.createObjectURL(blob);
        updateTrack(targetTrack, { audioBuffer: renderedBuffer, audio_url: audioUrl, name: "Beat Export" });
        createRegionFromImport(targetTrack, renderedBuffer, "Beat Export", audioUrl);
        setStatus(`✓ Beat → Track ${targetTrack + 1}`);
        setViewMode("arrange");
      }
    },
    [tracks, maxTracks, updateTrack],
  );

  const handlePianoRollExport = useCallback(
    (renderedBuffer, blob) => {
      let targetTrack = tracks.findIndex((t) => !t.audioBuffer);
      if (targetTrack === -1 && tracks.length < maxTracks) {
        targetTrack = tracks.length;
        setTracks((prev) => [...prev, DEFAULT_TRACK(targetTrack)]);
      }
      if (targetTrack === -1) {
        setStatus("⚠ No empty tracks. Clear a track first.");
        return;
      }
      if (renderedBuffer) {
        const audioUrl = URL.createObjectURL(blob);
        updateTrack(targetTrack, { audioBuffer: renderedBuffer, audio_url: audioUrl, name: "Piano Roll Export" });
        createRegionFromImport(targetTrack, renderedBuffer, "Piano Roll Export", audioUrl);
        setStatus(`✓ Piano Roll → Track ${targetTrack + 1}`);
        setViewMode("arrange");
      }
    },
    [tracks, maxTracks, updateTrack],
  );

  const handleMidiImport = useCallback((midiData) => {
    if (midiData?.notes) {
      setPianoRollNotes(midiData.notes);
      if (midiData.bpm) setBpm(midiData.bpm);
      if (midiData.key) setPianoRollKey(midiData.key);
      setStatus(`✓ MIDI imported — ${midiData.notes.length} notes loaded`);
      setViewMode("pianoroll");
    }
  }, []);

  const handlePianoRollNotesChange = useCallback((notes) => setPianoRollNotes(notes), []);

  const handleMidiNoteOn = useCallback(
    (note) => {
      if (viewMode === "pianoroll") {
        const newNote = {
          id: `midi_${Date.now()}_${note.note}`,
          note: note.note,
          velocity: note.velocity,
          startBeat: secondsToBeat(currentTime, bpm),
          duration: 0.25,
          channel: note.channel || 0,
        };
        setPianoRollNotes((prev) => [...prev, newNote]);
      }
      setStatus(`MIDI In: ${note.noteName || note.note} vel:${note.velocity}`);
    },
    [viewMode, currentTime, bpm],
  );

  const handleMidiNoteOff = useCallback(
    (note) => {
      const currentBeat = secondsToBeat(currentTime, bpm);
      setPianoRollNotes((prev) =>
        prev.map((n) => {
          if (n.note === note.note && n.id?.startsWith("midi_"))
            return { ...n, duration: Math.max(currentBeat - n.startBeat, 0.125) };
          return n;
        }),
      );
    },
    [currentTime, bpm],
  );

  const handleChordInsert = useCallback((chordNotes) => {
    if (chordNotes?.length) {
      setPianoRollNotes((prev) => [...prev, ...chordNotes]);
      setStatus(`✓ ${chordNotes.length} chord notes inserted into Piano Roll`);
    }
  }, []);

  const handleChordKeyChange = useCallback((key, scale) => {
    setPianoRollKey(key);
    setPianoRollScale(scale);
  }, []);

  // ── MIDI export ──
  const exportMidiFile = useCallback(() => {
    if (!pianoRollNotes?.length) {
      setStatus("⚠ No piano roll notes to export");
      return;
    }
    try {
      const bytes = midiFromNotes({ notes: pianoRollNotes, bpm, ppq: 480 });
      const blob = new Blob([bytes], { type: "audio/midi" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `${projectName.replace(/\s+/g, "_") || "project"}_pianoroll.mid`;
      a.click();

      URL.revokeObjectURL(url);
      setStatus("✓ MIDI exported");
    } catch (e) {
      console.error(e);
      setStatus("✗ MIDI export failed");
    }
  }, [pianoRollNotes, bpm, projectName]);

  // ── Tap tempo ──
  const tapTempo = useCallback(() => {
    const now = performance.now();
    tapTimesRef.current = [...tapTimesRef.current, now].slice(-6);
    if (tapTimesRef.current.length < 2) {
      setStatus("Tap tempo…");
      return;
    }
    const diffs = [];
    for (let i = 1; i < tapTimesRef.current.length; i++)
      diffs.push(tapTimesRef.current[i] - tapTimesRef.current[i - 1]);
    const avgMs = diffs.reduce((a, b) => a + b, 0) / diffs.length;
    const newBpm = clamp(Math.round(60000 / avgMs), 40, 240);
    setBpm(newBpm);
    setStatus(`✓ BPM set by tap: ${newBpm}`);
  }, []);

  // ── Seek helpers ──
  const seekToBeat = useCallback(
    (beat) => {
      const secs = beatToSeconds(beat, bpm);
      if (isPlaying) stopPlayback();
      playOffsetRef.current = secs;
      setCurrentTime(secs);
    },
    [bpm, isPlaying],
  );

  // ── STEP 6: Double-click Arrange lane → create MIDI region ──
  const handleTimelineDoubleClick = useCallback(
    (e, trackIndex) => {
      const track = tracks[trackIndex];

      if (track.trackType === "midi" || track.trackType === "instrument") {
        const newRegion = createMidiRegion(playheadBeat, timeSignature[0], `MIDI ${trackIndex + 1}`);
        const next = [...tracks];
        next[trackIndex] = {
          ...next[trackIndex],
          regions: [...(next[trackIndex].regions || []), newRegion],
        };
        setTracks(next);
      }
    },
    [tracks, playheadBeat, timeSignature, setTracks],
  );

  // ── Project save/load ──
  const saveProject = async () => {
    setSaving(true);
    setStatus("Saving...");
    try {
      const tok = localStorage.getItem("token") || sessionStorage.getItem("token");
      const bu = process.env.REACT_APP_BACKEND_URL || "";

      const td = tracks.map((t) => ({
        name: t.name,
        volume: t.volume,
        pan: t.pan,
        muted: t.muted,
        solo: t.solo,
        effects: t.effects,
        color: t.color,
        trackType: t.trackType,
        instrument: t.instrument,
        regions: (t.regions || []).map((r) => ({ ...r, audioUrl: null })),
        audio_url: typeof t.audio_url === "string" && !t.audio_url.startsWith("blob:") ? t.audio_url : null,
      }));

      const method = projectId ? "PUT" : "POST";
      const url = projectId ? `${bu}/api/studio/projects/${projectId}` : `${bu}/api/studio/projects`;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${tok}` },
        body: JSON.stringify({
          name: projectName,
          bpm,
          time_signature: `${timeSignature[0]}/${timeSignature[1]}`,
          tracks: td,
          master_volume: masterVolume,
          master_pan: masterPan, // NEW: persist master pan
          piano_roll_notes: pianoRollNotes,
          piano_roll_key: pianoRollKey,
          piano_roll_scale: pianoRollScale,
          automation,
          cycle_start: cycleStart,
          cycle_end: cycleEnd,
          cycle_enabled: cycleEnabled,
        }),
      });

      const data = await res.json();
      if (data?.success) {
        setProjectId(data.project.id);
        setStatus("✓ Saved");
      } else {
        setStatus("✗ Save failed");
      }
    } catch (e) {
      setStatus("✗ Save failed");
    } finally {
      setSaving(false);
    }
  };

  const loadProject = async (pid) => {
    try {
      const tok = localStorage.getItem("token") || sessionStorage.getItem("token");
      const bu = process.env.REACT_APP_BACKEND_URL || "";
      const res = await fetch(`${bu}/api/studio/projects/${pid}`, { headers: { Authorization: `Bearer ${tok}` } });
      const data = await res.json();

      if (data?.success) {
        const p = data.project;

        setProjectId(p.id);
        setProjectName(p.name);
        setBpm(p.bpm);
        setMasterVolume(p.master_volume || 0.8);
        setMasterPan(p.master_pan || 0); // NEW: restore master pan

        if (p.time_signature) {
          const ts = p.time_signature.split("/").map(Number);
          if (ts.length === 2) setTimeSignature(ts);
        }

        if (p.piano_roll_notes) setPianoRollNotes(p.piano_roll_notes);
        if (p.piano_roll_key) setPianoRollKey(p.piano_roll_key);
        if (p.piano_roll_scale) setPianoRollScale(p.piano_roll_scale);
        if (p.automation) setAutomation(p.automation);
        if (p.cycle_start != null) setCycleStart(p.cycle_start);
        if (p.cycle_end   != null) setCycleEnd(p.cycle_end);
        if (p.cycle_enabled != null) setCycleEnabled(p.cycle_enabled);

        const trackCount = Math.min(Math.max(p.tracks?.length || 1, 1), maxTracks);
        const loaded = Array.from({ length: trackCount }, (_, i) => ({
          ...DEFAULT_TRACK(i),
          ...(p.tracks[i] || {}),
          audioBuffer: null,
          effects: p.tracks[i]?.effects || DEFAULT_EFFECTS(),
          regions: p.tracks[i]?.regions || [],
        }));

        setTracks(loaded);
        setSelectedTrackIndex(0);

        for (let i = 0; i < loaded.length; i++) if (loaded[i].audio_url) await loadAudioBuffer(loaded[i].audio_url, i);

        setShowProjectList(false);
        setStatus(`Loaded: ${p.name}`);
      }
    } catch (e) {
      setStatus("✗ Load failed");
    }
  };

  const loadProjectList = async () => {
    try {
      const tok = localStorage.getItem("token") || sessionStorage.getItem("token");
      const bu = process.env.REACT_APP_BACKEND_URL || "";
      const res = await fetch(`${bu}/api/studio/projects`, { headers: { Authorization: `Bearer ${tok}` } });
      const data = await res.json();
      if (data?.success) {
        setProjects(data.projects || []);
        setShowProjectList(true);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const newProject = () => {
    stopEverything();
    setProjectId(null);
    setProjectName("Untitled Project");
    setBpm(120);
    setMasterVolume(0.8);
    setMasterPan(0); // NEW: reset master pan
    setActiveEffectsTrack(null);
    setTimeSignature([4, 4]);
    setTracks(Array.from({ length: 1 }, (_, i) => DEFAULT_TRACK(i)));
    setSelectedTrackIndex(0);
    setPianoRollNotes([]);
    setPianoRollKey("C");
    setPianoRollScale("major");
    setEditingRegion(null);
    setStatus("New project");
    setViewMode("arrange");
  };

  const addTrack = () => {
    if (tracks.length >= maxTracks) {
      setStatus(`⚠ ${userTier} tier limit: ${maxTracks} tracks. Upgrade for more.`);
      return;
    }
    const i = tracks.length;
    const typeName =
      newTrackType === "midi" ? "MIDI" : newTrackType === "bus" ? "Bus" : newTrackType === "aux" ? "Aux" : "Audio";
    setTracks((prev) => [...prev, DEFAULT_TRACK(i, newTrackType)]);
    setSelectedTrackIndex(i);
    setStatus(`${typeName} Track ${i + 1} added (${tracks.length + 1}/${maxTracks})`);
  };

  const removeTrack = (idx) => {
    if (tracks.length <= 1) {
      setStatus("⚠ Must have at least 1 track");
      return;
    }
    setTracks((prev) => prev.filter((_, i) => i !== idx));
    if (activeEffectsTrack === idx) setActiveEffectsTrack(null);
    else if (activeEffectsTrack > idx) setActiveEffectsTrack(activeEffectsTrack - 1);

    setSelectedTrackIndex((prev) => {
      const nextLen = tracks.length - 1;
      if (prev === idx) return Math.max(0, idx - 1);
      if (prev > idx) return prev - 1;
      return Math.min(prev, nextLen - 1);
    });

    setStatus(`Track ${idx + 1} removed`);
  };

  // ── AI callbacks used by AIMixAssistant ──
  const handleAIApplyVolume = useCallback(
    (trackIndex, value) => {
      updateTrack(trackIndex, { volume: value });
      if (trackGainsRef.current[trackIndex]) trackGainsRef.current[trackIndex].gain.value = value;
      setStatus(`AI: Track ${trackIndex + 1} vol → ${Math.round(value * 100)}%`);
    },
    [updateTrack],
  );

  const handleAIApplyPan = useCallback(
    (trackIndex, value) => {
      updateTrack(trackIndex, { pan: value });
      if (trackPansRef.current[trackIndex]) trackPansRef.current[trackIndex].pan.value = value;
      const label =
        value === 0 ? "C" : value < 0 ? `L${Math.abs(Math.round(value * 50))}` : `R${Math.round(value * 50)}`;
      setStatus(`AI: Track ${trackIndex + 1} pan → ${label}`);
    },
    [updateTrack],
  );

  const handleAIApplyEQ = useCallback((trackIndex, eqSuggestion) => {
    const updates = {};
    if (eqSuggestion.frequency < 400) updates.lowGain = eqSuggestion.gain_db;
    else if (eqSuggestion.frequency < 3000) {
      updates.midGain = eqSuggestion.gain_db;
      updates.midFreq = eqSuggestion.frequency;
    } else updates.highGain = eqSuggestion.gain_db;

    setTracks((prev) =>
      prev.map((t, i) =>
        i !== trackIndex ? t : { ...t, effects: { ...t.effects, eq: { ...t.effects.eq, ...updates, enabled: true } } },
      ),
    );
    setStatus(`AI: Track ${trackIndex + 1} EQ adjusted`);
  }, []);

  const handleAIApplyCompression = useCallback((trackIndex, comp) => {
    setTracks((prev) =>
      prev.map((t, i) =>
        i !== trackIndex
          ? t
          : {
            ...t,
            effects: {
              ...t.effects,
              compressor: {
                threshold: comp.suggested_threshold || -20,
                ratio: comp.suggested_ratio || 4,
                attack: (comp.suggested_attack_ms || 10) / 1000,
                release: (comp.suggested_release_ms || 100) / 1000,
                enabled: true,
              },
            },
          },
      ),
    );
    setStatus(`AI: Track ${trackIndex + 1} compressor applied`);
  }, []);
  // ── Direct monitoring with latency compensation ──
  const toggleMonitoring = React.useCallback((trackIndex) => {
    const ctx = audioCtxRef?.current;
    if (!ctx) return;
    if (monitoringEnabled) {
      monitorGainRef.current?.disconnect();
      monitorGainRef.current = null;
      setMonitoringEnabled(false);
      setStatus("Direct monitoring OFF");
      return;
    }
    navigator.mediaDevices.getUserMedia({ audio: {
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
      latency: 0,
    }}).then(stream => {
      const src = ctx.createMediaStreamSource(stream);
      const gain = ctx.createGain();
      gain.gain.value = 0.8;
      // Latency compensation delay node
      const delay = ctx.createDelay(0.5);
      delay.delayTime.value = Math.max(0, latencyCompMs / 1000);
      src.connect(delay);
      delay.connect(gain);
      gain.connect(ctx.destination);
      monitorGainRef.current = gain;
      setMonitoringEnabled(true);
      const ms = getLatencyMs(ctx);
      setLatencyMs(ms);
      setStatus(`Direct monitoring ON — latency: ${ms}ms`);
    }).catch(e => setStatus("Monitoring error: " + e.message));
  }, [monitoringEnabled, latencyCompMs]);

  // ── Vocal Processor → Console FX bridge ──
  const handleApplyVocalFx = useCallback((fxSettings) => {
    const idx = tracks.findIndex(t => t.armed);
    const targetIdx = idx !== -1 ? idx : selectedTrackIndex;
    setTracks(prev => prev.map((t, i) => {
      if (i !== targetIdx) return t;
      return {
        ...t,
        effects: {
          ...t.effects,
          eq: { ...t.effects.eq, ...(fxSettings.eq || {}), enabled: fxSettings.eq?.enabled ?? t.effects.eq.enabled },
          compressor: { ...t.effects.compressor, ...(fxSettings.compressor || {}), enabled: fxSettings.compressor?.enabled ?? t.effects.compressor.enabled },
          reverb: { ...t.effects.reverb, ...(fxSettings.reverb || {}), enabled: fxSettings.reverb?.enabled ?? t.effects.reverb.enabled },
          gate: { ...t.effects.gate, ...(fxSettings.gate || {}), enabled: fxSettings.gate?.enabled ?? t.effects.gate.enabled },
          deesser: { ...t.effects.deesser, ...(fxSettings.deesser || {}), enabled: fxSettings.deesser?.enabled ?? t.effects.deesser.enabled },
          limiter: { ...t.effects.limiter, ...(fxSettings.limiter || {}), enabled: fxSettings.limiter?.enabled ?? t.effects.limiter.enabled },
          filter: { ...t.effects.filter, ...(fxSettings.filter || {}), enabled: fxSettings.filter?.enabled ?? t.effects.filter.enabled },
          distortion: { ...t.effects.distortion, ...(fxSettings.distortion || {}), enabled: fxSettings.distortion?.enabled ?? t.effects.distortion.enabled },
          chorus: { ...t.effects.chorus, ...(fxSettings.chorus || {}), enabled: fxSettings.chorus?.enabled ?? t.effects.chorus.enabled },
        },
      };
    }));
    setActiveEffectsTrack(targetIdx);
    setStatus(`✓ Vocal FX chain applied to Track ${targetIdx + 1} — visible in Console`);
  }, [tracks, selectedTrackIndex]);

  // ── Mic Simulator → Console EQ bridge ──
  const handleApplyMicProfile = useCallback((micProfile) => {
    const idx = tracks.findIndex(t => t.armed);
    const targetIdx = idx !== -1 ? idx : selectedTrackIndex;
    if (!micProfile?.eqCurve) return;
    setTracks(prev => prev.map((t, i) => {
      if (i !== targetIdx) return t;
      return {
        ...t,
        effects: {
          ...t.effects,
          eq: {
            ...t.effects.eq,
            lowGain: micProfile.eqCurve.lowGain || 0,
            midGain: micProfile.eqCurve.midGain || 0,
            midFreq: micProfile.eqCurve.midFreq || 1000,
            highGain: micProfile.eqCurve.highGain || 0,
            enabled: true,
          },
          filter: micProfile.rolloff ? {
            ...t.effects.filter,
            type: 'highpass',
            frequency: micProfile.rolloff,
            Q: 0.707,
            enabled: true,
          } : t.effects.filter,
        },
      };
    }));
    setStatus(`✓ Mic profile "${micProfile.name}" EQ applied to Track ${targetIdx + 1}`);
  }, [tracks, selectedTrackIndex]);

  const handleConsoleMicModel = useCallback((trackIndex, modelKey) => {
    setTrackMicModels(prev => ({ ...prev, [trackIndex]: modelKey }));
    if (modelKey === "none" || !MIC_MODELS[modelKey]?.eqCurve) {
      setStatus(`Mic model cleared — Track ${trackIndex + 1}`);
      return;
    }
    const mic = MIC_MODELS[modelKey];
    handleApplyMicProfile({
      name: mic.name,
      eqCurve: mic.eqCurve,
      rolloff: mic.rolloff,
    });
    setStatus(`🎙 ${mic.name} applied to Track ${trackIndex + 1}`);
  }, [handleApplyMicProfile]);

  const handleAIBeatApply = useCallback((patternData) => {
    setStatus(
      `✓ AI Beat pattern generated: ${patternData.genre} @ ${patternData.bpm} BPM — Switch to Beat Maker to use`,
    );
  }, []);

  const handleArrangerPlay = useCallback(() => {
    if (!isPlaying) startPlayback();
  }, [isPlaying]);

  const handleArrangerStop = useCallback(() => {
    if (isPlaying) stopPlayback();
  }, [isPlaying]);

  const handleArrangerRecord = useCallback(() => {
    isRecording ? stopRecording() : startRecording();
  }, [isRecording]);

  const handleBpmChange = useCallback((newBpm) => setBpm(newBpm), []);
  const handleTimeSignatureChange = useCallback((top, bottom) => setTimeSignature([top, bottom]), []);
  const handleToggleFx = useCallback(
    (trackIndex) => setActiveEffectsTrack((prev) => (prev === trackIndex ? null : trackIndex)),
    [],
  );
  const handleBrowseSounds = useCallback(
    (trackIndex) => {
      setSelectedTrackIndex(trackIndex);
      updateTrack(trackIndex, { armed: true });
      // Disarm all other tracks
      setTracks((prev) => prev.map((t, i) => ({ ...t, armed: i === trackIndex })));
      setViewMode("sounds");
      setStatus(`Browse sounds for Track ${trackIndex + 1}`);
    },
    [updateTrack],
  );
  const handleEQGraphChange = useCallback(
    (updatedEQ) => {
      if (activeEffectsTrack === null) return;
      setTracks((p) =>
        p.map((t, i) =>
          i !== activeEffectsTrack ? t : { ...t, effects: { ...t.effects, eq: { ...t.effects.eq, ...updatedEQ } } },
        ),
      );
    },
    [activeEffectsTrack],
  );

  // ── MenuBar action router ──
  const handleMenuAction = async (action) => {
    const sel = clamp(selectedTrackIndex, 0, Math.max(0, tracks.length - 1));

    const toggleArmSelected = () => {
      setTracks((p) => p.map((t, idx) => ({ ...t, armed: idx === sel ? !t.armed : false })));
      setSelectedTrackIndex(sel);
      setStatus(`Track ${sel + 1} ${tracks[sel]?.armed ? "disarmed" : "armed"}`);
    };

    const toggleMuteSelected = () => {
      const wasMuted = !!tracks[sel]?.muted;
      updateTrack(sel, { muted: !wasMuted });
      if (trackGainsRef.current[sel]) trackGainsRef.current[sel].gain.value = !wasMuted ? 0 : tracks[sel].volume;
      setStatus(`Track ${sel + 1} ${!wasMuted ? "muted" : "unmuted"}`);
    };

    const toggleSoloSelected = () => {
      updateTrack(sel, { solo: !tracks[sel]?.solo });
      setStatus(`Track ${sel + 1} solo ${tracks[sel]?.solo ? "off" : "on"}`);
    };

    const toggleFxPanel = () => {
      setActiveEffectsTrack((prev) => (prev === sel ? null : sel));
      setStatus(`FX ${activeEffectsTrack === sel ? "closed" : "opened"} for Track ${sel + 1}`);
    };

    switch (action) {
      case "file:new":
        newProject();
        break;
      case "file:open":
        loadProjectList();
        break;
      case "file:save":
        saveProject();
        break;
      case "file:openLocal": {
        const inp = document.createElement('input');
        inp.type = 'file'; inp.accept = '.spx,.json';
        inp.onchange = async (e) => {
          const f = e.target.files[0]; if (!f) return;
          try {
            const text = await f.text(); const data = JSON.parse(text);
            if (data.format !== 'streampirex-daw') { setStatus('Not a valid StreamPireX project'); return; }
            stopEverything(); setProjectId(null);
            setProjectName(data.name || 'Imported Project');
            setBpm(data.bpm || 120); setMasterVolume(data.master_volume || 0.8);
            if (data.time_signature) { const ts = data.time_signature.split('/').map(Number); if (ts.length === 2) setTimeSignature(ts); }
            if (data.piano_roll_notes) setPianoRollNotes(data.piano_roll_notes);
            if (data.piano_roll_key) setPianoRollKey(data.piano_roll_key);
            if (data.piano_roll_scale) setPianoRollScale(data.piano_roll_scale);
            const trackCount = Math.min(Math.max(data.tracks?.length || 1, 1), maxTracks);
            const loaded = Array.from({ length: trackCount }, (_, i) => ({
              ...DEFAULT_TRACK(i), ...(data.tracks[i] || {}), audioBuffer: null,
              effects: data.tracks[i]?.effects || DEFAULT_EFFECTS(), regions: data.tracks[i]?.regions || []
            }));
            setTracks(loaded); setSelectedTrackIndex(0);
            setStatus('Opened: ' + (data.name || 'project'));
          } catch (err) { setStatus('Failed to open: ' + err.message); }
        };
        inp.click();
        break;
      }
      case "file:saveAs": {
        const saveData = {
          name: projectName, bpm,
          time_signature: timeSignature[0] + '/' + timeSignature[1],
          master_volume: masterVolume,
          tracks: tracks.map(t => ({
            name: t.name, volume: t.volume, pan: t.pan,
            muted: t.muted, solo: t.solo, effects: t.effects,
            color: t.color,
            regions: (t.regions || []).map(r => ({ ...r, audioUrl: null })),
            audio_url: typeof t.audio_url === 'string' && !t.audio_url.startsWith('blob:') ? t.audio_url : null
          })),
          piano_roll_notes: pianoRollNotes, piano_roll_key: pianoRollKey, piano_roll_scale: pianoRollScale,
          created_at: new Date().toISOString(), format: 'streampirex-daw', version: '1.0'
        };
        setSaveAsData(JSON.stringify(saveData, null, 2));
        setShowSaveAsModal(true);
        break;
      }
      case 'file:saveDesktop': {
        const dlData = {
          name: projectName, bpm,
          time_signature: `${timeSignature[0]}/${timeSignature[1]}`,
          master_volume: masterVolume,
          tracks: tracks.map(t => ({
            name: t.name, volume: t.volume, pan: t.pan,
            muted: t.muted, solo: t.solo, effects: t.effects,
            color: t.color, regions: (t.regions || []).map(r => ({ ...r, audioUrl: null })),
          })),
          piano_roll_notes: pianoRollNotes, piano_roll_key: pianoRollKey, piano_roll_scale: pianoRollScale,
          created_at: new Date().toISOString(), format: 'streampirex-daw', version: '1.0'
        };
        const dlBlob = new Blob([JSON.stringify(dlData, null, 2)], { type: 'application/json' });
        const dlUrl = URL.createObjectURL(dlBlob);
        const dlA = document.createElement('a');
        dlA.href = dlUrl; dlA.download = `${projectName.replace(/\s+/g, '_')}.spx`;
        document.body.appendChild(dlA); dlA.click(); document.body.removeChild(dlA);
        URL.revokeObjectURL(dlUrl);
        setStatus(`Downloaded: ${projectName}.spx`);
        break;
      }
      case "file:importAudio":
        setViewMode("arrange");
        handleImport(sel);
        break;
      case 'file:importMidi': case 'midi:import': setViewMode('pianoroll'); setStatus('Open a .mid file from Piano Roll'); break;
      case 'midi:controller': setMidiEnabled(m => !m); setStatus(midiEnabled ? 'MIDI controller disconnected' : 'MIDI controller enabled — connect device'); break;
      case 'plugins:wam': window.open('/wam-plugin-store', '_blank'); break;
      case "file:exportMidi":
      case "midi:export":
        exportMidiFile();
        break;
      case "view:arrange":
        setViewMode("arrange");
        break;
      case "view:console":
        setViewMode("console");
        break;
      case "view:beatmaker":
        setViewMode("beatmaker");
        break;
      case "view:drumkits":
        setViewMode("beatmaker");
        break;
      case "view:pianoroll":
        setViewMode("pianoroll");
        break;
      case "view:piano":
        setViewMode("piano");
        break;
      case "view:sounds":
        setViewMode("sounds");
        break;
      case "view:keyfinder":
        setViewMode("keyfinder");
        break;
      case "view:aibeat":
        setViewMode("aibeat");
        break;
      case "view:kits":
        setViewMode("beatmaker");
        break;
      case "view:micsim":
        setShowMicSimModal(true);
        break;
      case "view:aimix":
        setViewMode("aimix");
        break;
      case "view:midi":
        setViewMode("pianoroll");
        break;
      case "view:chords":
        setViewMode("chords");
        break;
      case "view:sampler":
        setViewMode("beatmaker");
        break;
      case "view:vocal":
        setShowVocalModal(true);
        break;
      case "view:takelanes":
        setViewMode("takelanes");
        break;
      case "view:plugins":
        setViewMode("plugins");
        break;
      case "view:plugin-store":
        setViewMode("plugin-store");
        break;
      case "view:multiband":
        setViewMode("multiband");
        break;
      case "view:voicemidi":
        setViewMode("voicemidi");
        break;
      case "view:toggleFx":
        toggleFxPanel();
        break;
      case "transport:playPause":
        if (isPlaying) stopPlayback();
        else startPlayback();
        break;
      case "transport:stop":
        stopEverything();
        break;
      case "transport:record":
        isRecording ? stopRecording() : startRecording();
        break;
      case "transport:rewind":
        rewind();
        break;
      case "transport:tapTempo":
        tapTempo();
        break;
      case "track:add":
        addTrack();
        break;
      case "track:remove":
        removeTrack(sel);
        break;
      case "track:arm":
        toggleArmSelected();
        break;
      case "track:mute":
        toggleMuteSelected();
        break;
      case "track:solo":
        toggleSoloSelected();
        break;
      case "track:clear":
        clearTrack(sel);
        break;
      case "track:duplicate": {
        if (!tracks[sel]) break;
        const dup = {...tracks[sel], id: Date.now(), name: (tracks[sel].name??`Track ${sel+1}`) + " copy"};
        setTracks(t => [...t, dup]); setStatus(`Track ${sel+1} duplicated`); break;
      }
      case "track:color": {
        const pal=["#34c759","#ff9500","#007aff","#af52de","#ff3b30","#5ac8fa","#ff2d55","#ffcc00","#ff6b35","#00ffc8"];
        const next=pal[(pal.indexOf(tracks[sel]?.color??pal[0])+1)%pal.length];
        updateTrack(sel,{color:next});setStatus(`Track ${sel+1} color → ${next}`); break;
      }
      case "track:rename": {
        const n=window.prompt("Rename track:",tracks[sel]?.name??`Track ${sel+1}`);
        if(n?.trim())updateTrack(sel,{name:n.trim()});break;
      }
      case "transport:metronome":
        metronomeOn?stopMetronome?.():startMetronome?.(audioCtxRef?.current);
        setMetronomeOn(m=>!m);setStatus(`Metronome ${metronomeOn?"OFF":"ON"}`); break;
      case "transport:cycle":
        setCycleEnabled(e => !e);
        setStatus(`Cycle ${cycleEnabled ? "OFF" : "ON"}`); break;
      case "transport:countIn":
        setCountIn?.(c=>!c);setStatus(`Count-in ${countIn?"OFF":"ON"}`); break;
      case "transport:setBpm": {
        const b=window.prompt("Set BPM:",String(bpm??120));
        if(b&&!isNaN(parseInt(b)))setBpm(Math.max(20,Math.min(300,parseInt(b)))); break;
      }
      case "transport:timeSignature": {
        const ts=window.prompt("Time signature (e.g. 4/4):",`${(timeSignature??[4,4])[0]}/${(timeSignature??[4,4])[1]}`);
        if(ts){const[top,bot]=ts.split("/").map(Number);if(top>0&&bot>0)setTimeSignature?.([top,bot]);} break;
      }
      case "transport:goToEnd": {
        const mx=Math.max(...tracks.map(t=>t.audioBuffer?.duration??0),0);
        if(playOffsetRef)playOffsetRef.current=mx;setCurrentTime?.(mx); break;
      }
      case "midi:hardware":
        setMidiEnabled?.(m=>!m);setStatus(midiEnabled?"MIDI OFF":"MIDI controller enabled"); break;
      case "midi:humanize": {
        const h=(pianoRollNotes??[]).map(n=>({...n,
          startBeat:+(n.startBeat+(Math.random()-.5)*.04).toFixed(4),
          velocity:+Math.max(.05,Math.min(1,(n.velocity??.8)+(Math.random()-.5)*.15)).toFixed(3)}));
        setPianoRollNotes?.(h);setStatus(`✓ Humanized ${h.length} notes`); break;
      }
      case "midi:quantize": {
        const g=0.25;
        setPianoRollNotes?.(p=>p.map(n=>({...n,startBeat:Math.round(n.startBeat/g)*g})));
        setStatus("✓ Quantized to 1/16"); break;
      }
      case "midi:transpose": {
        const s=window.prompt("Semitones (+/-)","0");
        if(s!==null&&!isNaN(parseInt(s))){
          const n=parseInt(s);
          setPianoRollNotes?.(p=>p.map(note=>({...note,note:Math.max(0,Math.min(127,(note.note??60)+n))})));
          setStatus(`✓ Transposed ${n>0?"+":""}${n} semitones`);
        } break;
      }
      case "midi:velocity": {
        const pct=window.prompt("Scale velocity %","100");
        if(pct&&!isNaN(parseFloat(pct))){
          const sc=parseFloat(pct)/100;
          setPianoRollNotes?.(p=>p.map(n=>({...n,velocity:+Math.max(.05,Math.min(1,(n.velocity??.8)*sc)).toFixed(3)})));
          setStatus(`✓ Velocity ×${pct}%`);
        } break;
      }
      case "midi:clearAll":
        if(window.confirm("Clear all piano roll notes?"))setPianoRollNotes?.([]);break;
      case "audio:settings": setShowAudioSettings(true); break;
      case "view:sampleLibrary": setShowSampleLibrary(s => !s); break;
      case "view:pluginRack":    setShowPluginRack(s => !s); break;
      case "view:midiMapping":   setShowMidiMapping(s => !s); break;
      case "view:onboarding":    setShowOnboarding(true); break;
      case "file:projectSettings": {
        const nm=window.prompt("Project name:",projectName??"Untitled");
        if(nm?.trim())setProjectName?.(nm.trim());
        const b=window.prompt("BPM:",String(bpm??120));
        if(b&&!isNaN(parseInt(b)))setBpm?.(Math.max(20,Math.min(300,parseInt(b)))); break;
      }
      default:
        setStatus(`ℹ Unhandled action: ${action}`);
        break;
    }
  };

  // ── Helper: land an AudioBuffer on the next empty Arrange track ──
  const landBufferOnTrack = useCallback((audioBuffer, trackName) => {
    const foundIdx = tracks.findIndex(t => !t.audioBuffer);
    const targetIdx = (foundIdx === -1 && tracks.length < maxTracks) ? tracks.length : foundIdx;
    if (foundIdx === -1 && tracks.length < maxTracks) {
      setTracks(prev => [...prev, DEFAULT_TRACK(targetIdx)]);
    }
    if (targetIdx === -1) {
      setStatus("⚠ No empty tracks — clear a track first");
      return;
    }
    const blob = new Blob([audioBuffer], { type: "audio/wav" });
    const audioUrl = URL.createObjectURL(blob);
    updateTrack(targetIdx, { audioBuffer, audio_url: audioUrl, name: trackName });
    createRegionFromImport(targetIdx, audioBuffer, trackName, audioUrl);
    setStatus(`✓ "${trackName}" → Track ${targetIdx + 1}`);
    setViewMode("arrange");
  }, [tracks, maxTracks, updateTrack, createRegionFromImport]);

  // ===================== RENDER =====================
  const afx = activeEffectsTrack !== null ? tracks[activeEffectsTrack] : null;

  return (
    <div className="daw">
      {/* ═══════════════════ DAW MENU BAR ═══════════════════ */}
      <DAWMenuBar
        viewMode={viewMode}
        isPlaying={isPlaying}
        isRecording={isRecording}
        metronomeOn={metronomeOn}
        countIn={countIn}
        tracks={tracks}
        maxTracks={maxTracks}
        saving={saving}
        mixingDown={mixingDown}
        pianoRollNotes={pianoRollNotes}
        bpm={bpm}
        projectName={projectName}
        onAction={handleMenuAction}
      />

      {/* ═══════════════════ TOP BAR ═══════════════════ */}
      <div className="daw-topbar">
        <div className="daw-topbar-row1">
        <div className="daw-topbar-left">
          <button className="daw-icon-btn" onClick={newProject} title="New">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>

          <button className="daw-icon-btn" onClick={loadProjectList} title="Open">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
          </button>

          <button
            className={`daw-icon-btn ${saving ? "saving" : ""}`}
            onClick={saveProject}
            title="Save"
            disabled={saving}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
              <polyline points="17 21 17 13 7 13 7 21" />
              <polyline points="7 3 7 8 15 8" />
            </svg>
          </button>

          <div className="daw-divider" />
          <input className="daw-project-name" value={projectName} onChange={(e) => setProjectName(e.target.value)} />
        </div>

        {/* Transport — always visible */}
        <div className="daw-transport">
          <button className="daw-transport-btn" onClick={rewind} disabled={isRecording} title="Return to Zero">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 20L9 12l10-8v16zM7 19V5H5v14h2z" />
            </svg>
          </button>

          <button className="daw-transport-btn" onClick={stopEverything} title="Stop">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <rect x="4" y="4" width="16" height="16" rx="2" />
            </svg>
          </button>

          <button
            className={`daw-transport-btn daw-play-btn ${isPlaying && !isRecording ? "active" : ""}`}
            onClick={() => (isPlaying ? stopPlayback() : startPlayback())}
            disabled={isRecording}
            title={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying && !isRecording ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <rect x="5" y="4" width="5" height="16" rx="1" />
                <rect x="14" y="4" width="5" height="16" rx="1" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            )}
          </button>

          <button
            className={`daw-transport-btn daw-rec-btn ${isRecording ? "active" : ""}`}
            onClick={() => (isRecording ? stopRecording() : startRecording())}
            title={isRecording ? "Stop Recording" : "Record"}
          >
            <span className="daw-rec-dot" />
          </button>

          <div className="daw-lcd">
            <span className="daw-lcd-time">{fmt(currentTime)}</span>
            <span className="daw-lcd-sep">|</span>
            <span className="daw-lcd-bpm">{bpm} BPM</span>
          </div>

          
              {/* ── Split Screen Toggle ── */}
              <button
                className={`rs-split-toggle-btn ${splitScreen ? 'active' : ''}`}
                onClick={() => setSplitScreen(s => !s)}
                title={splitScreen ? 'Exit split view' : 'Split view: Arrange + Mixer'}
              >
                <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="1" y="1" width="10" height="4.5" rx="0.5"/>
                  <rect x="1" y="6.5" width="10" height="4.5" rx="0.5"/>
                </svg>
                SPLIT
              </button>
              <button
            className={`daw-transport-btn daw-metro-btn ${metronomeOn ? "active" : ""}`}
            onClick={() => {
              const ctx = getCtx();
              if (metronomeOn) {
                stopMetronome();
                setMetronomeOn(false);
              } else {
                startMetronome(ctx);
                setMetronomeOn(true);
              }
            }}
            title="Metronome"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L8 22h8L12 2z" />
              <line x1="12" y1="8" x2="18" y2="4" />
            </svg>
          </button>

          <button
            className={`daw-transport-btn rs-transport-label ${countIn ? "active" : ""}`}
            onClick={() => setCountIn(!countIn)}
            title="Count-in"
          >
            1234
          </button>

          {/* ── STEP 5: MIDI device + keyboard octave in toolbar ── */}
          <MidiDeviceIndicator
            devices={instrumentEngine.midiDevices}
            activeDevice={instrumentEngine.activeMidiDevice}
            midiActivity={instrumentEngine.midiActivity}
            onConnect={instrumentEngine.connectMidiDevice}
            onDisconnect={instrumentEngine.disconnectMidiDevice}
          />
          <KeyboardOctaveIndicator
            octave={instrumentEngine.keyboardOctave}
            onOctaveChange={instrumentEngine.setKeyboardOctave}
          />
          {/* ── Monitor Speaker Simulator ── */}
          <div style={{ display:'flex', alignItems:'center', gap:4, marginLeft:8, background:'rgba(0,255,200,0.05)', border:'1px solid rgba(0,255,200,0.15)', borderRadius:4, padding:'2px 6px' }}>
            <span style={{ fontSize:9, color:'#00ffc8', fontFamily:'Share Tech Mono,monospace',
              letterSpacing:1, whiteSpace:'nowrap' }}>🔊 MON</span>
            <select
              value={monitorSpeaker}
              onChange={e => setMonitorSpeaker(e.target.value)}
              style={{ background:'#0d1117', border:'none', color: monitorSpeaker === 'flat' ? '#444' :
                MONITOR_EQ[monitorSpeaker]?.cat === 'pro' ? '#00ffc8' : '#ff8a3d',
                fontSize:9, fontFamily:'Share Tech Mono,monospace', cursor:'pointer',
                outline:'none', padding:'1px 2px', maxWidth:130 }}
              title="Monitor speaker simulation">
              <optgroup label="── Bypass ──">
                <option value="flat">Flat (Bypass)</option>
              </optgroup>
              <optgroup label="── Pro Monitors ──">
                {Object.entries(MONITOR_EQ).filter(([,v]) => v.cat === 'pro').map(([id, v]) => (
                  <option key={id} value={id}>{v.name}</option>
                ))}
              </optgroup>
              <optgroup label="── Consumer ──">
                {Object.entries(MONITOR_EQ).filter(([,v]) => v.cat === 'consumer').map(([id, v]) => (
                  <option key={id} value={id}>{v.name}</option>
                ))}
              </optgroup>
            </select>
          </div>
        </div>

        </div>{/* end row1 */}
        <div className="daw-topbar-row2">
          {midiEnabled && (
            <MidiHardwareInput
              drumMode={viewMode === "beatmaker" || viewMode === "sampler"}
              onNoteOn={(note, vel) => { setStatus(`MIDI: Note ${note} vel ${vel}`); }}
              onNoteOff={(note) => {}}
              onCC={(cc, val) => {
                if (cc === 7)  tracks.forEach((t,i) => { if(selectedTrack===i) updateTrack(i, { volume: val/127 }); });
                if (cc === 10) tracks.forEach((t,i) => { if(selectedTrack===i) updateTrack(i, { pan: (val-64)/64 }); });
              }}
              onPadTrigger={(pad) => setStatus(`Pad ${pad} triggered`)}
            />
          )}
          <CollabToolbar collab={collab} />
          {wamPlugins.length > 0 && (
            <div className="rs-wam-badge">
              <span className="rs-wam-text">🔌 {wamPlugins.length} WAM{wamPlugins.length>1?"s":""}</span>
            </div>
          )}
          <div className="daw-tabs-row">
            <button className={`daw-view-tab ${viewMode === "arrange" ? "active" : ""}`} onClick={() => setViewMode("arrange")}>Arrange</button>
            <button className={`daw-view-tab ${viewMode === "console" ? "active" : ""}`} onClick={() => setViewMode("console")}>Console</button>
            <button className={`daw-view-tab ${viewMode === "pianoroll" ? "active" : ""}`} onClick={() => setViewMode("pianoroll")}>Piano Roll</button>
            <button className={`daw-view-tab ${viewMode === "score" ? "active" : ""}`} onClick={() => setViewMode("score")}>Score</button>
            <button className={`daw-view-tab ${viewMode === "beatmaker" ? "active" : ""}`} onClick={() => setViewMode("beatmaker")}>Beat Maker</button>
            <button className={`daw-view-tab ${viewMode === "piano" ? "active" : ""}`} onClick={() => setViewMode("piano")}>Piano</button>
            <button className={`daw-view-tab ${viewMode === "chords" ? "active" : ""}`} onClick={() => setViewMode("chords")}>Chords</button>
            <button className={`daw-view-tab ${viewMode === "sounds" ? "active" : ""}`} onClick={() => setViewMode("sounds")}>Sounds</button>
            <MixDropdown viewMode={viewMode} setViewMode={setViewMode} />
            <ToolsDropdown viewMode={viewMode} setViewMode={setViewMode} />
          </div>
        </div>{/* /row2 */}

        {/* I/O & Status */}
        <div className="daw-topbar-right">
          {/* Latency display */}
          {latencyMs > 0 && (
            <div style={{
              display:'flex', alignItems:'center', gap:6,
              padding:'3px 10px',
              background: latencyMs < 20 ? 'rgba(48,209,88,0.1)' : latencyMs < 50 ? 'rgba(255,214,10,0.1)' : 'rgba(248,81,73,0.1)',
              border: `1px solid ${latencyMs < 20 ? 'rgba(48,209,88,0.3)' : latencyMs < 50 ? 'rgba(255,214,10,0.3)' : 'rgba(248,81,73,0.3)'}`,
              borderRadius:5,
            }}>
              <span style={{fontSize:9,fontWeight:800,color: latencyMs < 20 ? '#30d158' : latencyMs < 50 ? '#ffd60a' : '#f85149'}}>
                ⚡ {latencyMs}ms
              </span>
            </div>
          )}
          {/* Direct monitoring toggle */}
          <button
            className={`daw-icon-btn ${monitoringEnabled ? 'active' : ''}`}
            onClick={() => toggleMonitoring(selectedTrack)}
            title={`Direct monitoring ${monitoringEnabled ? 'ON' : 'OFF'} — hear yourself through the DAW with zero-latency passthrough`}
            style={monitoringEnabled ? {background:'rgba(0,255,200,0.15)',borderColor:'#00ffc8',color:'#00ffc8'} : {}}
          >
            🎧
          </button>
          <select
            value={selectedDevice}
            onChange={(e) => setSelectedDevice(e.target.value)}
            className="daw-input-select"
          >
            <option value="default">Default Mic</option>
            {inputDevices.map((d) => (
              <option key={d.deviceId} value={d.deviceId}>
                {d.label || `Mic ${d.deviceId.slice(0, 6)}`}
              </option>
            ))}
          </select>
          <div className="daw-input-meter">
            <div className="daw-input-meter-fill" style={{ width: `${inputLevel * 100}%` }} />
          </div>
          <span className="daw-status">{status}</span>
        </div>
      </div>

      {/* ═══════════════════ PROJECT LIST MODAL ═══════════════════ */}
      {showProjectList && (
        <div className="daw-modal-overlay" onClick={() => setShowProjectList(false)}>
          <div className="daw-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Open Project</h2>
            {projects.length === 0 ? (
              <p className="daw-empty">No saved projects</p>
            ) : (
              <div className="daw-project-list">
                {projects.map((p) => (
                  <button key={p.id} className="daw-project-item" onClick={() => loadProject(p.id)}>
                    <span>{p.name}</span>
                    <span className="daw-project-meta">
                      {p.bpm} BPM \u00b7 {new Date(p.updated_at).toLocaleDateString()}
                    </span>
                  </button>
                ))}
              </div>
            )}
            <button className="daw-btn" onClick={() => setShowProjectList(false)}>
              Close
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════════ MAIN VIEW AREA ═══════════════════ */}
      <div className="daw-main">
        {!splitScreen && viewMode === "arrange" && (
          <div className="rs-relative">
          <ArrangerView
            cycleEnabled={cycleEnabled}
            cycleStart={cycleStart}
            cycleEnd={cycleEnd}
            onCycleChange={(start, end) => { setCycleStart(start); setCycleEnd(end); }}
            onCycleToggle={() => setCycleEnabled(e => !e)}
            tracks={tracks}
            setTracks={setTracks}
            bpm={bpm}
            timeSignatureTop={timeSignature[0]}
            timeSignatureBottom={timeSignature[1]}
            masterVolume={masterVolume}
            onMasterVolumeChange={setMasterVolume}
            projectName={projectName}
            userTier={userTier}
            playheadBeat={playheadBeat}
            isPlaying={isPlaying}
            isRecording={isRecording}
            onPlay={handleArrangerPlay}
            onStop={handleArrangerStop}
            onRecord={handleArrangerRecord}
            onSeek={seekToBeat}
            onBpmChange={handleBpmChange}
            onTimeSignatureChange={handleTimeSignatureChange}
            onToggleFx={handleToggleFx}
            onBounce={mixDownProject}
            onSave={saveProject}
            saving={saving}
            instrumentEngine={instrumentEngine}
            onBrowseSounds={handleBrowseSounds}
            onOpenPianoRoll={onOpenPianoRoll}
            onTimelineDoubleClick={handleTimelineDoubleClick}
            MidiRegionPreview={MidiRegionPreview}
          />
          <CollabOverlay collab={collab} tracks={tracks} trackHeight={48} />
          </div>
        )}

        {/* ──────── CONSOLE VIEW — Cubase-style with CubaseMeter + Master Pan Knob ──────── */}
        
        {/* ══ FLEX PITCH EDITOR OVERLAY ══════════════════════════════════════ */}

        {/* ══ AUDIO SETTINGS MODAL ═════════════════════════════════════════ */}
        {showAudioSettings && (
          <div style={{
            position:'fixed',inset:0,zIndex:300,background:'rgba(4,8,15,0.92)',
            display:'flex',alignItems:'center',justifyContent:'center',
          }} onClick={() => setShowAudioSettings(false)}>
            <div style={{
              background:'#0d1520',border:'1px solid #1c2128',borderRadius:12,
              padding:28,minWidth:380,fontFamily:'JetBrains Mono,monospace',
            }} onClick={e => e.stopPropagation()}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
                <span className="rs-settings-title">AUDIO SETTINGS</span>
                <button onClick={() => setShowAudioSettings(false)} className="rs-close-btn">✕</button>
              </div>

              {/* Buffer Size */}
              <div className="rs-settings-section">
                <label className="rs-settings-label">BUFFER SIZE</label>
                <div className="rs-settings-row">
                  {[64,128,256,512,1024,2048].map(size => (
                    <button key={size}
                      onClick={() => recreateAudioContext(size, audioSampleRate)}
                      style={{
                        background: audioBufferSize === size ? '#00ffc818' : '#161b22',
                        border: `1px solid ${audioBufferSize === size ? '#00ffc8' : '#21262d'}`,
                        color: audioBufferSize === size ? '#00ffc8' : '#6e7681',
                        borderRadius:5,padding:'4px 8px',cursor:'pointer',
                        fontFamily:'inherit',fontSize:10,fontWeight:700,
                      }}
                    >{size}</button>
                  ))}
                </div>
                <div className="rs-hint">
                  {audioBufferSize <= 128 ? '⚡ Low latency (may crackle)' :
                   audioBufferSize <= 512 ? '✓ Balanced' : '🔇 High stability (higher latency)'}
                </div>
              </div>

              {/* Sample Rate */}
              <div className="rs-settings-section">
                <label className="rs-settings-label">SAMPLE RATE</label>
                <div className="rs-settings-row">
                  {[44100,48000,96000].map(sr => (
                    <button key={sr}
                      onClick={() => recreateAudioContext(audioBufferSize, sr)}
                      style={{
                        background: audioSampleRate === sr ? '#4a9eff18' : '#161b22',
                        border: `1px solid ${audioSampleRate === sr ? '#4a9eff' : '#21262d'}`,
                        color: audioSampleRate === sr ? '#4a9eff' : '#6e7681',
                        borderRadius:5,padding:'4px 8px',cursor:'pointer',
                        fontFamily:'inherit',fontSize:10,fontWeight:700,
                      }}
                    >{sr >= 1000 ? `${sr/1000}kHz` : `${sr}Hz`}</button>
                  ))}
                </div>
              </div>

              {/* Latency display */}
              <div className="rs-latency-box">
                <div className="rs-stat-row">
                  <span className="rs-stat-label">Measured Latency</span>
                  <span className="rs-stat-val-teal">{latencyMs}ms</span>
                </div>
                <div className="rs-stat-row">
                  <span className="rs-stat-label">Sample Rate</span>
                  <span className="rs-stat-val">{audioSampleRate}Hz</span>
                </div>
                <div className="rs-stat-row-last">
                  <span className="rs-stat-label">Scheduler Lookahead</span>
                  <span className="rs-stat-val">{audioLookahead}ms</span>
                </div>
              </div>

              {/* Latency compensation */}
              <div className="rs-settings-section">
                <label className="rs-settings-label">
                  LATENCY COMPENSATION: {latencyCompMs}ms
                </label>
                <input type="range" min={0} max={100} step={1}
                  value={latencyCompMs}
                  onChange={e => setLatencyCompMs(Number(e.target.value))}
                  className="rs-range-teal"
                />
              </div>

              <div className="rs-hint-center">
                Changes take effect immediately. May cause brief audio interruption.
              </div>
            </div>
          </div>
        )}
        {/* ════════════════════════════════════════════════════════════════ */}

        {showFlexPitch && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 200,
            background: 'rgba(4,8,15,0.95)',
            display: 'flex', flexDirection: 'column',
          }}>
            <FlexPitchEditor
              audioBuffer={flexPitchBuffer}
              audioContext={audioCtxRef?.current}
              trackName={tracks[flexPitchTrack]?.name ?? `Track ${(flexPitchTrack ?? 0) + 1}`}
              onClose={() => setShowFlexPitch(false)}
              onExport={handleFlexPitchExport}
            />
          </div>
        )}
        {/* ════════════════════════════════════════════════════════════════════ */}

        {/* ══ SPLIT SCREEN: Arrange top + Mixer bottom simultaneously ══════════ */}
        {splitScreen && (
          <div
            ref={splitContainerRef}
            className="rs-split-screen"
            style={{ '--rs-split-top-h': `${splitTopH}%` }}
          >
            {/* ── Top pane: Arrange ── */}
            <div className="rs-split-top" style={{ height: `${splitTopH}%` }}>
              <span className="rs-split-pane-label">ARRANGE</span>
              {viewMode !== "arrange" && (
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  height: '100%', color: '#484f58', fontFamily: 'JetBrains Mono,monospace',
                  fontSize: 12, gap: 10,
                }}>
                  <span>Switch to Arrange view to see timeline here</span>
                  <button
                    onClick={() => setViewMode('arrange')}
                    style={{
                      background: '#00ffc818', border: '1px solid #00ffc844', color: '#00ffc8',
                      borderRadius: 5, padding: '4px 12px', cursor: 'pointer',
                      fontFamily: 'inherit', fontSize: 11, fontWeight: 800,
                    }}
                  >
                    Go to Arrange
                  </button>
                </div>
              )}
              {viewMode === "arrange" && tracks && (
                <ArrangerView
                  tracks={tracks}
                  bpm={bpm}
                  currentTime={currentTime}
                  isPlaying={isPlaying}
                  selectedTrack={selectedTrack}
                  onSelectTrack={setSelectedTrack}
                  onUpdateRegion={updateRegion}
                  onDeleteRegion={deleteRegion}
                  onSplitRegion={splitRegion}
                  zoom={zoom}
                  onZoomChange={setZoom}
                  snapEnabled={snapEnabled}
                  onBrowseSounds={handleBrowseSounds}
                  onOpenPianoRoll={onOpenPianoRoll}
                  onTimelineDoubleClick={handleTimelineDoubleClick}
                  MidiRegionPreview={MidiRegionPreview}
                />
              )}
              <div className="rs-split-handle" onMouseDown={handleSplitMouseDown} title="Drag to resize" />
            </div>

            {/* ── Bottom pane: Mixer/Console ── */}
            <div className="rs-split-bottom" style={{ height: `${100 - splitTopH}%` }}>
              <span className="rs-split-pane-label">MIXER</span>
              <div className="daw-console rs-console-scroll">
                <div className="daw-console-scroll">
                  {tracks.map((t, i) => {
                    const meter = meterLevels?.[i] || { left: 0, right: 0, peak: 0 };
                    return (
                      <div
                        key={t.id ?? i}
                        className={`daw-channel${i === selectedTrack ? ' selected' : ''}`}
                        onClick={() => setSelectedTrack(i)}
                      >
                        <div className="daw-ch-controls">
                          <button
                            className={`daw-ch-btn mute${t.muted ? ' active' : ''}`}
                            onClick={e => { e.stopPropagation(); updateTrack(i, { muted: !t.muted }); }}
                            title="Mute"
                          >M</button>
                          <button
                            className={`daw-ch-btn solo${t.solo ? ' active' : ''}`}
                            onClick={e => { e.stopPropagation(); updateTrack(i, { solo: !t.solo }); }}
                            title="Solo"
                          >S</button>
                        </div>
                        <div className="daw-ch-fader-meter-row">
                          <div className="daw-ch-fader-area">
                            <input
                              type="range" min={0} max={1} step={0.01}
                              value={t.volume ?? 0.8}
                              className="daw-ch-fader"
                              orient="vertical"
                              onChange={e => updateTrack(i, { volume: parseFloat(e.target.value) })}
                            />
                          </div>
                          <div className="daw-ch-meter">
                            <div className="daw-ch-meter-bar" style={{ height: `${Math.round((meter.left || 0) * 100)}%`, background: meter.peak > 0.9 ? '#ff3b30' : '#00ffc8' }} />
                          </div>
                        </div>
                        <div className="daw-ch-vol-readout">
                          {Math.round((t.volume ?? 0.8) * 100)}
                        </div>
                        <div className="daw-ch-name daw-ch-name-bottom">
                          <select className="daw-ch-console-select"
                            value={trackConsoleChar[t.id] || 'none'}
                            onChange={e => setTrackConsoleChar(prev => ({ ...prev, [t.id]: e.target.value }))}
                            title="Console character"
                          >
                            {Object.entries(CONSOLE_BOARDS).map(([id, b]) => (
                              <option key={id} value={id}>{b.name}</option>
                            ))}
                          </select>
                          <span className="daw-ch-track-label" style={{ color: t.color || '#cdd9e5' }}>
                            {t.name || `Track ${i + 1}`}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  {/* Master channel */}
                  <div className="daw-channel master-channel daw-master">
                    <div className="daw-ch-controls">
                      <button className="daw-ch-btn" title="Master">M</button>
                      <button className="daw-ch-btn" title="Master">S</button>
                    </div>
                    <div className="daw-ch-fader-meter-row">
                      <div className="daw-ch-fader-area">
                        <input
                          type="range" min={0} max={1} step={0.01}
                          value={masterVolume ?? 1}
                          className="daw-ch-fader"
                          orient="vertical"
                          onChange={e => setMasterVolume(parseFloat(e.target.value))}
                        />
                      </div>
                      <div className="daw-ch-meter">
                        <div className="daw-ch-meter-bar" style={{ height: `${Math.round((masterMeterLevel || 0) * 100)}%`, background: '#ff8a3d' }} />
                      </div>
                    </div>
                    <div className="daw-ch-vol-readout rs-orange">
                      {(20 * Math.log10(masterVolume ?? 1)).toFixed(1)} dB
                    </div>
                    <div className="daw-ch-name daw-ch-name-bottom">
                      <select className="daw-ch-console-select"
                        value={masterConsoleChar}
                        onChange={e => setMasterConsoleChar(e.target.value)}
                        title="Master bus console character"
                      >
                        {Object.entries(CONSOLE_BOARDS).map(([id, b]) => (
                          <option key={id} value={id}>{b.name}</option>
                        ))}
                      </select>
                      <span className="daw-ch-track-label rs-orange">MASTER</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        {/* ════════════════════════════════════════════════════════════════════ */}


        {!splitScreen && viewMode === "console" && (
          <div className="daw-console">
            <div className="daw-console-scroll">
              {tracks.map((t, i) => {
                const meter = meterLevels[i] || { left: 0, right: 0, peak: 0 };

                return (
                  <div
                    key={t.id}
                    className={`daw-channel ${selectedTrack === i ? "selected" : ""}`}
                    onClick={() => setSelectedTrack(i)}
                  >
                    <div className="daw-ch-routing">
                      <span className="daw-ch-routing-label">Routing</span>
                      <span className="daw-ch-routing-value">
                        {t.input || "Default In"} → {t.output || "Stereo Out"}
                      </span>
                      <MicModelSelector
                        trackIndex={i}
                        currentModel={trackMicModels[i] || "none"}
                        onApply={handleConsoleMicModel}
                      />
                    </div>
                    <div className="daw-ch-inserts">
                      <div className="daw-ch-inserts-label daw-ch-track-name-top">{t.name || `Track ${i + 1}`}</div>
                      {(() => {
                        const ALL_FX = ALL_FX_EXTENDED;
                        const loaded = ALL_FX.filter((fx) => t.effects?.[fx.key]?.enabled);
                        return (
                          <>
                            {loaded.map((fx) => (
                              <div
                                key={fx.key}
                                className={`daw-ch-insert-slot active ${fx.type}`}
                                title={`${fx.name} — click to edit, right-click to remove`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedTrack(i);
                                  setSelectedTrackIndex(i);
                                  setActiveEffectsTrack(i);
                                  setOpenFxKey(fx.key);
                                  setStatus(`${fx.name} — Track ${i + 1}`);
                                }}
                                onContextMenu={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  updateEffect(i, fx.key, "enabled", false);
                                  setStatus(`${fx.name} OFF — Track ${i + 1}`);
                                }}
                              >
                                {fx.name}
                              </div>
                            ))}
                            {loaded.length < 8 && (
                              <div
                                className="daw-ch-insert-slot empty rs-relative"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  setInsertPickerState({ trackIndex: i, x: rect.right + 4, y: rect.top });
                                }}
                              >
                                + Add Insert
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>

                    <div className="daw-ch-controls">
                      <div
                        className={`daw-ch-badge ${t.muted ? "m-on" : ""}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          const nextMuted = !t.muted;
                          updateTrack(i, { muted: nextMuted });
                          const audible = !nextMuted && (!hasSolo || t.solo);
                          if (trackGainsRef.current[i]) trackGainsRef.current[i].gain.value = audible ? t.volume : 0;
                        }}
                      >
                        M
                      </div>
                      <div
                        className={`daw-ch-badge ${t.solo ? "s-on" : ""}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          const nextSolo = !t.solo;
                          updateTrack(i, { solo: nextSolo });
                          const willHaveSolo = tracks.some((x, idx) => (idx === i ? nextSolo : x.solo));
                          tracks.forEach((x, idx) => {
                            const gainNode = trackGainsRef.current[idx];
                            if (!gainNode) return;
                            const solo = idx === i ? nextSolo : x.solo;
                            const audible = !x.muted && (!willHaveSolo || solo);
                            gainNode.gain.value = audible ? x.volume : 0;
                          });
                        }}
                      >
                        S
                      </div>
                      <div
                        className={`daw-ch-badge ${selectedTrack === i ? "e-on" : ""}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTrack(i);
                        }}
                      >
                        e
                      </div>
                    </div>

                    <div className="daw-ch-pan">
                      <PanKnob value={t.pan} onChange={(v) => updateTrack(i, { pan: v })} size={30} />
                    </div>

                    {/* ── Cubase-style stereo meter + fader SIDE BY SIDE ── */}
                    <div className="daw-ch-fader-area">
                      <div className="daw-ch-fader-row">
                        <div className="daw-ch-meter" title="Level">
                          <CubaseMeter
                            leftLevel={meter.left || 0}
                            rightLevel={meter.right || 0}
                            height={180}
                            showScale={true}
                          />
                        </div>
                        <div className="daw-ch-fader">
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.01"
                            value={t.volume}
                            onChange={(e) => {
                              const v = parseFloat(e.target.value);
                              updateTrack(i, { volume: v });
                              const audible = !t.muted && (!hasSolo || t.solo);
                              if (trackGainsRef.current[i]) trackGainsRef.current[i].gain.value = audible ? v : 0;
                            }}
                          />
                        </div>
                      </div>
                      <div className="daw-ch-vol-display">
                        <div className="daw-ch-vol-val">
                          {t.volume > 0 ? (20 * Math.log10(t.volume)).toFixed(1) : "-∞"}
                        </div>
                      </div>
                    </div>

                    <div className="daw-ch-automation">
                      <div className={`daw-ch-rw ${t.readAutomation ? "active" : ""}`}>R</div>
                      <div className={`daw-ch-rw ${t.writeAutomation ? "active" : ""}`}>W</div>
                    </div>

                    <div className="daw-ch-rec">
                      <button
                        className={`daw-ch-rec-btn ${t.armed ? "armed" : ""}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          updateTrack(i, { armed: !t.armed });
                        }}
                        title="Record Enable"
                      >
                        ●
                      </button>
                    </div>

                    <ChannelStripAIMix track={t} trackIndex={i} userTier={userTier} onApplyVolume={handleAIApplyVolume} onApplyPan={handleAIApplyPan} onApplyEffect={updateEffect} onStatus={setStatus} />
                    <div className="daw-ch-name">
                      <input
                        className="daw-ch-name-input"
                        value={t.name}
                        onChange={(e) => updateTrack(i, { name: e.target.value })}
                      />
                      <div className="daw-ch-number">
                        <span className="daw-ch-type-icon">{t.trackType === "midi" ? "🎹" : "🎙️"}</span>
                        <span>{i + 1}</span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* ═══════════ MASTER CHANNEL — with Pan Knob + CubaseMeter ═══════════ */}
              <div className="daw-channel master-channel">
                <div className="daw-ch-routing">
                  <span className="daw-ch-routing-label">Routing</span>
                  <span className="daw-ch-routing-value">Stereo Out</span>
                </div>

                <div className="daw-ch-inserts">
                  <div className="daw-ch-inserts-label">Master</div>
                  <div className="daw-ch-insert-slot empty rs-insert-empty-text">
                    Stereo Bus
                  </div>
                </div>

                <div className="daw-ch-controls">
                  <div className="daw-ch-badge">M</div>
                  <div className="daw-ch-badge">S</div>
                  <div className="daw-ch-badge">e</div>
                </div>

                {/* ── Master Pan Knob (functional) ── */}
                <div className="daw-ch-pan">
                  <PanKnob value={masterPan} onChange={(v) => setMasterPan(v)} size={30} />
                </div>

                {/* ── Master Stereo Meter + Fader SIDE BY SIDE ── */}
                <div className="daw-ch-fader-area">
                  <div className="daw-ch-fader-row">
                    <div className="daw-ch-meter" title="Level">
                      <CubaseMeter
                        leftLevel={masterMeterLevels?.left || 0}
                        rightLevel={masterMeterLevels?.right || 0}
                        height={180}
                        showScale={true}
                      />
                    </div>
                    <div className="daw-ch-fader">
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={masterVolume}
                        onChange={(e) => {
                          const v = parseFloat(e.target.value);
                          setMasterVolume(v);
                          if (masterGainRef.current) masterGainRef.current.gain.value = v;
                        }}
                      />
                    </div>
                  </div>
                </div>
                <div className="daw-ch-vol-display">
                  <div className="daw-ch-vol-val">
                    {masterVolume > 0 ? (20 * Math.log10(masterVolume)).toFixed(1) : "-∞"}
                  </div>
                </div>

                <div className="daw-ch-name">
                  <div className="rs-master-label">MASTER</div>
                  <div className="daw-ch-number">Stereo Out</div>
                </div>
              </div>
            </div>
          </div>
        )}
        {/* ──────── RECORD VIEW (kept, no tab) ──────── */}
        {viewMode === "record" && (
          <div className="daw-tracks-area">
            <div className="daw-tracks-toolbar">
              <span className="daw-tracks-toolbar-label">TRACKS</span>
              <div className="daw-tracks-toolbar-controls">
                <select
                  className="daw-track-type-select"
                  value={newTrackType}
                  onChange={(e) => setNewTrackType(e.target.value)}
                >
                  <option value="audio">Audio</option>
                  <option value="midi">MIDI</option>
                  <option value="bus">Bus</option>
                  <option value="aux">Aux</option>
                </select>
                <button
                  className="daw-tracks-toolbar-btn add"
                  onClick={addTrack}
                  disabled={tracks.length >= maxTracks}
                  title="Add Track"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </button>
                <button
                  className="daw-tracks-toolbar-btn remove"
                  onClick={() => removeTrack(selectedTrackIndex)}
                  disabled={tracks.length <= 1}
                  title="Remove"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </button>
                <span className="daw-tracks-toolbar-count">
                  {tracks.length}/{maxTracks}
                </span>
              </div>
            </div>
            {tracks.map((track, i) => (
              <div
                key={track.id}
                className={`daw-track-row ${track.armed ? "armed" : ""} ${track.muted ? "muted" : ""} ${track.solo ? "soloed" : ""} ${activeEffectsTrack === i ? "fx-open" : ""} ${selectedTrackIndex === i ? "selected" : ""}`}
                onClick={() => setSelectedTrackIndex(i)}
              >
                <div className="daw-track-strip">
                  <div className="daw-track-color-bar" style={{ background: track.color }} />
                  <input
                    className="daw-track-name-input"
                    value={track.name}
                    onChange={(e) => updateTrack(i, { name: e.target.value })}
                    onClick={(e) => e.stopPropagation()}
                  />
                  {(track.trackType === "midi" || track.trackType === "instrument") && (
                    <InstrumentSelector
                      trackIndex={i}
                      currentInstrument={instrumentEngine.getTrackInstrument(i)}
                      onSelectGM={(idx, program, name) =>
                        instrumentEngine.setTrackInstrument(idx, { source: SOURCE_TYPES.GM_SYNTH, program, name })
                      }
                      onSelectDrumKit={(idx) =>
                        instrumentEngine.setTrackInstrument(idx, { source: SOURCE_TYPES.DRUM_KIT })
                      }
                      onSelectSampler={(idx) => {
                        updateTrack(idx, { armed: true });
                        setViewMode("sounds");
                      }}
                      onSelectSampleKit={(idx) =>
                        instrumentEngine.setTrackInstrument(idx, { source: SOURCE_TYPES.SAMPLE_KIT })
                      }
                      compact
                    />
                  )}
                  <div className="daw-track-btns">
                    <button
                      className={`daw-badge r ${track.armed ? "on" : ""}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setTracks((p) => p.map((t, idx) => ({ ...t, armed: idx === i ? !t.armed : false })));
                      }}
                    >
                      R
                    </button>
                    <button
                      className={`daw-badge m ${track.muted ? "on" : ""}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        updateTrack(i, { muted: !track.muted });
                        if (trackGainsRef.current[i])
                          trackGainsRef.current[i].gain.value = !track.muted ? 0 : track.volume;
                      }}
                    >
                      M
                    </button>
                    <button
                      className={`daw-badge s ${track.solo ? "on" : ""}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        updateTrack(i, { solo: !track.solo });
                      }}
                    >
                      S
                    </button>
                  </div>
                  <div className="daw-track-vol">
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={track.volume}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value);
                        updateTrack(i, { volume: v });
                        if (trackGainsRef.current[i]) trackGainsRef.current[i].gain.value = v;
                      }}
                      className="daw-knob-slider"
                    />
                    <span className="daw-vol-val">{Math.round(track.volume * 100)}</span>
                  </div>
                  <div className="daw-track-pan">
                    <input
                      type="range"
                      min="-1"
                      max="1"
                      step="0.01"
                      value={track.pan}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value);
                        updateTrack(i, { pan: v });
                        if (trackPansRef.current[i]) trackPansRef.current[i].pan.value = v;
                      }}
                      className="daw-pan-slider"
                    />
                    <span className="daw-pan-val">
                      {track.pan === 0
                        ? "C"
                        : track.pan < 0
                          ? `L${Math.abs(Math.round(track.pan * 50))}`
                          : `R${Math.round(track.pan * 50)}`}
                    </span>
                  </div>
                  <div className="daw-track-actions-strip">
                    <button className="daw-tiny-btn" onClick={() => handleImport(i)} title="Import">
                      Import
                    </button>
                    <button className="daw-tiny-btn" onClick={() => clearTrack(i)} title="Clear">
                      Clear
                    </button>
                    <button
                      className="daw-tiny-btn"
                      onClick={() => setActiveEffectsTrack(activeEffectsTrack === i ? null : i)}
                      title="FX"
                    >
                      FX
                    </button>
                    <button className="daw-tiny-btn" onClick={() => removeTrack(i)} title="Remove">
                      Remove
                    </button>
                  </div>
                </div>
                <div className="daw-track-region">
                  {track.audioBuffer ? (
                    <div className="daw-region-block" style={{ "--region-color": track.color }}>
                      <div className="daw-region-label">{track.name}</div>
                      <canvas
                        ref={(el) => (canvasRefs.current[i] = el)}
                        width={1200}
                        height={96}
                        className="daw-waveform-canvas"
                      />
                    </div>
                  ) : (
                    <div className="daw-region-empty">
                      {track.armed ? <span className="daw-armed-label">● Armed</span> : <span>Empty</span>}
                    </div>
                  )}
                  {duration > 0 && (
                    <div
                      className="daw-track-playhead"
                      style={{ left: `${(currentTime / Math.max(duration, 1)) * 100}%` }}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ──────── BEAT MAKER VIEW ──────── */}
        {viewMode === 'beatmaker' && (
          <SamplerBeatMaker
            onExport={handleBeatExport}
            onClose={() => setViewMode('arrange')}
            isEmbedded={true}
            onSendToArrange={(audioBuffer, name) => {
              const idx = selectedTrackIndex;
              updateTrack(idx, { audioBuffer, name: name || tracks[idx].name });
              setViewMode('arrange');
              setStatus(`Beat bounced to Track ${idx + 1}`);
            }}
            incomingSample={window.__spx_sampler_export || null}
            projectBpm={bpm}
            projectKey={pianoRollKey}
            projectScale={pianoRollScale}
            projectId={projectId}
            onBpmSync={(newBpm) => {
              setBpm(newBpm);
              setStatus(`✓ BPM synced from Sampler: ${newBpm}`);
            }}
            onKeySync={(key, scale) => {
              setPianoRollKey(key);
              setPianoRollScale(scale);
              setStatus(`✓ Key synced from Sampler: ${key} ${scale}`);
            }}
            onExportToArrange={(midiNotes) => {
              let drumTrackIdx = tracks.findIndex(
                (t, idx) => (t.trackType === 'midi' || t.trackType === 'instrument') &&
                  instrumentEngine.getTrackInstrument(idx)?.isDrum,
              );
              if (drumTrackIdx === -1) {
                setTracks(prev => {
                  drumTrackIdx = prev.length;
                  return [...prev, DEFAULT_TRACK(prev.length, 'midi')];
                });
              }
              const region = createMidiRegionFromNotes(midiNotes, 'Beat Pattern');
              region.startBeat = isPlaying ? playheadBeat : 0;
              setTracks(prev =>
                prev.map((t, i) => (i === drumTrackIdx ? { ...t, regions: [...(t.regions || []), region] } : t)),
              );
              setStatus(`🥁 Beat → Arrange Track ${drumTrackIdx + 1}`);
              setViewMode('arrange');
            }}
            chordsComponent={
              <ChordProgressionGenerator
                musicalKey={pianoRollKey}
                scale={pianoRollScale}
                bpm={bpm}
                timeSignature={timeSignature}
                onInsertChords={handleChordInsert}
                onKeyChange={handleChordKeyChange}
                audioContext={audioCtxRef.current}
                onClose={() => {}}
                isEmbedded={true}
              />
            }
            soundsComponent={
              <FreesoundBrowser
                audioContext={audioCtxRef.current}
                onSoundSelect={(audioBuffer, name, audioUrl) => {
                  const ai = tracks.findIndex((t) => t.armed);
                  if (ai !== -1) {
                    updateTrack(ai, { audioBuffer, audio_url: audioUrl, name: name || 'Freesound Sample' });
                    setStatus(`🎵 "${name}" → Track ${ai + 1}`);
                  } else {
                    window.__spx_sampler_export = { buffer: audioBuffer, name, timestamp: Date.now() };
                    setStatus(`🎵 "${name}" loaded to Sampler`);
                  }
                }}
                isEmbedded={true}
              />
            }
            loopsComponent={
              <LoopermanBrowser
                audioContext={audioCtxRef.current}
                onSoundSelect={(audioBuffer, name, audioUrl) => {
                  const ai = tracks.findIndex(t => t.armed);
                  if (ai !== -1) {
                    updateTrack(ai, { audioBuffer, audio_url: audioUrl, name: name || 'Loop' });
                    createRegionFromImport(ai, audioBuffer, name || 'Loop', audioUrl);
                    setStatus(`✓ "${name}" → Track ${ai + 1}`);
                  } else {
                    window.__spx_sampler_export = { buffer: audioBuffer, name, timestamp: Date.now() };
                    setStatus(`Loop "${name}" sent to Sampler`);
                  }
                }}
                onClose={() => {}}
                isEmbedded={true}
              />
            }
            aiBeatsComponent={
              <AIBeatAssistant
                onApplyPattern={handleAIBeatApply}
                onClose={() => {}}
                isEmbedded={true}
              />
            }
            voiceMidiComponent={
              <VoiceToMIDI
                audioContext={audioCtxRef.current}
                bpm={bpm}
                isEmbedded={true}
                onNoteOn={({ note, velocity }) => {
                  const armedIdx = tracks.findIndex(
                    (t) => t.armed && (t.trackType === 'midi' || t.trackType === 'instrument'),
                  );
                  if (armedIdx !== -1) instrumentEngine.playNoteOnTrack(armedIdx, note, velocity);
                }}
                onNoteOff={({ note }) => {
                  const armedIdx = tracks.findIndex(
                    (t) => t.armed && (t.trackType === 'midi' || t.trackType === 'instrument'),
                  );
                  if (armedIdx !== -1) instrumentEngine.stopNoteOnTrack(armedIdx, note);
                }}
              />
            }
          />
        )}

        {viewMode === "pianoroll" && (
          <div className="daw-pianoroll-view">
            <PianoRoll
              notes={pianoRollNotes}
              onNotesChange={handlePianoRollNotesChange}
              bpm={bpm}
              timeSignature={timeSignature}
              musicalKey={pianoRollKey}
              scale={pianoRollScale}
              isPlaying={isPlaying}
              currentBeat={playheadBeat}
              audioContext={audioCtxRef.current}
              onExport={handlePianoRollExport}
              onClose={() => setViewMode("beatmaker")}
              isEmbedded={true}
              editingRegion={editingRegion}
              onSaveToRegion={savePianoRollToRegion}
            />
          </div>
        )}

        {viewMode === "chords" && (
          <div className="daw-chords-view">
            <ChordProgressionGenerator
              musicalKey={pianoRollKey}
              scale={pianoRollScale}
              bpm={bpm}
              timeSignature={timeSignature}
              onInsertChords={handleChordInsert}
              onKeyChange={handleChordKeyChange}
              audioContext={audioCtxRef.current}
              onClose={() => setViewMode("pianoroll")}
              isEmbedded={true}
            />
          </div>
        )}

        {viewMode === "piano" && (
          <div className="daw-piano-view rs-view-full">
            <VirtualPiano audioContext={audioCtxRef.current} onRecordingComplete={() => { }} embedded={true} />
          </div>
        )}

        {viewMode === "sounds" && (
          <div className="daw-freesound-view">
            <FreesoundBrowser
              audioContext={audioCtxRef.current}
              onSoundSelect={(audioBuffer, name, audioUrl) => {
                const armedMidi = tracks.findIndex(
                  (t) => t.armed && (t.trackType === "midi" || t.trackType === "instrument"),
                );
                if (armedMidi !== -1) {
                  instrumentEngine.loadSampleOntoTrack(armedMidi, audioBuffer, name, 60);
                  setStatus(`🎵 "${name}" → Track ${armedMidi + 1} — play keys to hear`);
                } else {
                  const ai = tracks.findIndex((t) => t.armed);
                  if (ai !== -1) {
                    updateTrack(ai, { audioBuffer, audio_url: audioUrl, name: name || "Freesound Sample" });
                    createRegionFromImport(ai, audioBuffer, name || "Freesound Sample", audioUrl);
                    setStatus(`✓ "${name}" loaded → Track ${ai + 1}`);
                  } else {
                    window.__spx_sampler_export = { buffer: audioBuffer, name, timestamp: Date.now() };
                    setViewMode("beatmaker");
                    setStatus(`Sample "${name}" sent to Beat Maker`);
                  }
                }
              }}
              onApplyMicProfile={handleApplyMicProfile}
              onClose={() => setShowMicSimModal(false)}
              isEmbedded={true}
            />
          </div>
        )}

        {viewMode === "vocal" && (
          <div className="daw-vocal-view rs-view-scroll">
            <VocalProcessor
              audioContext={audioCtxRef.current}
              liveStream={micSimStream}
              onRecordingComplete={(blob) => {
                const ai = tracks.findIndex((t) => t.armed);
                if (ai === -1) { setStatus("⚠ Arm a track first"); return; }
                const ctx = getCtx();
                const audioUrl = URL.createObjectURL(blob);
                blob.arrayBuffer()
                  .then((ab) => ctx.decodeAudioData(ab))
                  .then((buf) => {
                    updateTrack(ai, { audioBuffer: buf, audio_url: audioUrl });
                    createRegionFromRecording(ai, buf, audioUrl);
                    uploadTrack(blob, ai);
                    setStatus(`✓ Vocal recorded → Track ${ai + 1}`);
                    setViewMode("arrange");
                  })
                  .catch((e) => setStatus(`✗ ${e.message}`));
              }}
              onApplyMicProfile={handleApplyMicProfile}
              onClose={() => setViewMode("arrange")}
              isEmbedded={true}
            />
          </div>
        )}

        {viewMode === "keyfinder" && (
          <div className="daw-keyfinder-view">
            <KeyFinder
              tracks={tracks}
              audioContext={audioCtxRef.current}
              onClose={() => setViewMode("arrange")}
              isEmbedded={true}
            />
            <div className="rs-bottom-toolbar">
              <button onClick={() => setShowMicBuilder(true)} className="rs-action-btn-teal">
                🔧 Build Custom Mic
              </button>
              {customMicProfiles.length > 0 && (
                <span className="rs-muted-text">{customMicProfiles.length} custom profile{customMicProfiles.length > 1 ? 's' : ''} saved</span>
              )}
            </div>
            {showMicBuilder && (
              <div className="rs-modal-overlay">
                <div className="rs-modal-panel">
                  <CustomMicBuilder
                    onSave={(profileId, profile) => {
                      setCustomMicProfiles(prev => [...prev.filter(p => p.id !== profileId), {id: profileId, ...profile}]);
                      setShowMicBuilder(false);
                    }}
                    onClose={() => setShowMicBuilder(false)}
                  />
                </div>
              </div>
            )}
          </div>
        )}
        {viewMode === "aibeat" && (
          <div className="daw-aibeat-view">
            <AIBeatAssistant
              onApplyPattern={handleAIBeatApply}
              onClose={() => setViewMode("beatmaker")}
              isEmbedded={true}
            />
          </div>
        )}

        {showMicSimModal && (
          <div className="daw-plugin-modal rs-plugin-modal">
              <button onClick={() => setShowMicSimModal(false)} className="rs-modal-close">✕</button>
            <MicSimulator
              audioContext={audioCtxRef.current}
              liveStream={micSimStream}
              onRecordingComplete={(blob) => {
                const ai = tracks.findIndex((t) => t.armed);
                if (ai === -1) {
                  setStatus("⚠ Arm a track first to receive Mic Sim recording");
                  return;
                }
                const ctx = getCtx();
                const audioUrl = URL.createObjectURL(blob);
                blob
                  .arrayBuffer()
                  .then((ab) => ctx.decodeAudioData(ab))
                  .then((buf) => {
                    updateTrack(ai, { audioBuffer: buf, audio_url: audioUrl });
                    createRegionFromRecording(ai, buf, audioUrl);
                    uploadTrack(blob, ai);
                    setStatus(`✓ Mic Sim recorded → Track ${ai + 1}`);
                    setViewMode("arrange");
                  })
                  .catch((e) => setStatus(`✗ ${e.message}`));
              }}
              onApplyMicProfile={handleApplyMicProfile}
              onClose={() => setViewMode("arrange")}
              isEmbedded={true}
            />
            <div className="rs-bottom-toolbar">
              <button onClick={() => setShowMicBuilder(true)} className="rs-action-btn-teal">
                🔧 Build Custom Mic
              </button>
              {customMicProfiles.length > 0 && (
                <span className="rs-muted-text">{customMicProfiles.length} custom profile{customMicProfiles.length > 1 ? 's' : ''} saved</span>
              )}
            </div>
            {showMicBuilder && (
              <div className="rs-modal-overlay">
                <div className="rs-modal-panel">
                  <CustomMicBuilder
                    onSave={(profileId, profile) => {
                      setCustomMicProfiles(prev => [...prev.filter(p => p.id !== profileId), {id: profileId, ...profile}]);
                      setShowMicBuilder(false);
                    }}
                    onClose={() => setShowMicBuilder(false)}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {viewMode === "aimix" && (
          <div className="daw-aimix-view rs-view-scroll">
            <AIMixAssistant
              tracks={tracks}
              projectId={projectId}
              bpm={bpm}
              timeSignature={timeSignature}
              onApplyVolume={handleAIApplyVolume}
              onApplyPan={handleAIApplyPan}
              onApplyEQ={handleAIApplyEQ}
              onApplyCompression={handleAIApplyCompression}
              onClose={() => setViewMode("arrange")}
              isEmbedded={true}
            />
          </div>
        )}

        {showVocalModal && (
          <div className="daw-plugin-modal rs-plugin-modal">
              <button onClick={() => setShowVocalModal(false)} className="rs-modal-close">✕</button>
            <VocalProcessor
              audioContext={audioCtxRef.current}
              isEmbedded={true}
              tracks={tracks}
              selectedTrackIndex={selectedTrackIndex}
              bpm={bpm}
              onApplyToConsole={handleApplyVocalFx}
              onClose={() => setShowVocalModal(false)}
              onSendToTrack={(buf, name) => {
                const ai = tracks.findIndex(t => t.armed);
                const idx = ai !== -1 ? ai : selectedTrackIndex;
                const audioUrl = URL.createObjectURL(new Blob([]));
                updateTrack(idx, { audioBuffer: buf, audio_url: audioUrl, name: name || tracks[idx].name });
                createRegionFromImport(idx, buf, name || "Vocal Take", audioUrl);
                setStatus(`✓ Vocal take → Track ${idx + 1}`);
                setViewMode("arrange");
              }}
              onRecordingComplete={(blob) => {
                const ai = tracks.findIndex(t => t.armed);
                if (ai !== -1) uploadTrack(blob, ai);
              }}
            />
          </div>
        )}
        {/* ──────── PLUGIN RACK VIEW ──────── */}
        {viewMode === "plugins" && (
          <div className="rs-flex-hidden">
            <UnifiedFXChain
              track={tracks[selectedTrackIndex]}
              trackIndex={selectedTrackIndex}
              audioContext={audioCtxRef.current}
              updateEffect={updateEffect}
              onClose={() => setViewMode('arrange')}
              isEmbedded={true}
            />
          </div>
        )}

        {/* ──────── MULTIBAND EFFECTS VIEW ──────── */}
        {viewMode === 'multiband' && (
          <div className="rs-flex-scroll-dark">
            <MultibandEffects
              audioContext={audioCtxRef.current}
              inputNode={
                selectedTrackIndex !== null && trackGainsRef.current[selectedTrackIndex]
                  ? trackGainsRef.current[selectedTrackIndex]
                  : masterGainRef.current
              }
              outputNode={masterGainRef.current}
              onClose={() => setViewMode('arrange')}
              isEmbedded={true}
            />
          </div>
        )}
        {/* ──────── FX CHAIN VIEW ──────── */}
        {viewMode === 'fx' && (
          <div className="rs-flex-scroll-dark">
            <UnifiedFXChain
              track={tracks[selectedTrackIndex]}
              trackIndex={selectedTrackIndex}
              audioContext={audioCtxRef.current}
              updateEffect={updateEffect}
              onClose={() => setViewMode('arrange')}
              isEmbedded={true}
            />
          </div>
        )}

        {/* ──────── MASTERING VIEW ──────── */}
        {viewMode === 'analog' && (
          <div className="rs-flex-scroll-darker">
            <div className="rs-analog-scale">
            <div className="rs-analog-tabs">
              {[['ampsim','🎸 Amp Sim'],['tape','📼 Tape & Harmonic'],['pedals','🎛️ Pedal Chain'],['console','🎚️ Console']].map(([id,label])=>(
                <button key={id} onClick={()=>setAnalogSubview(id)} style={{
                  padding:'10px 16px',background:'transparent',border:'none',
                  borderBottom:analogSubview===id?'2px solid #ff6600':'2px solid transparent',
                  color:analogSubview===id?'#ff6600':'#4e6a82',
                  fontFamily:'JetBrains Mono,monospace',fontSize:11,fontWeight:700,cursor:'pointer'
                }}>{label}</button>
              ))}
            </div>
            {analogSubview==='ampsim'&&(
              <div className="rs-amp-panel">
                <h3 className="rs-amp-heading">🎸 Guitar & Bass Amp Simulator</h3>
                <p className="rs-amp-subtext">6 amp models · Cabinet sim · Pedal chain · Web Audio processing</p>
                <div className="rs-amp-scale">
                <AmpSimPlugin audioContext={null} inputNode={null} outputNode={null}/>
                </div>
              </div>
            )}
            {analogSubview==='tape'&&(
              <div className="rs-settings-panel">
                <div className="rs-dark-card">
                  <div className="rs-card-header">
                    <div><h4 className="rs-card-title">📼 Tape Saturation</h4>
                    <p className="rs-card-subtitle">Analog warmth via waveshaper + lowpass filter</p></div>
                    <label className="rs-toggle-label">
                      <input type="checkbox" checked={tapeEnabled} onChange={e=>{setTapeEnabled(e.target.checked);setFx(f=>({...f,tapeSaturation:{...f.tapeSaturation,enabled:e.target.checked}}));if (audioCtxRef.current) { tracks.forEach(t => { const old = trackNodesRef.current.get(t.id); if (old) { ['input','preGain','panNode','fader','meter'].forEach(k => { try { old[k].disconnect(); } catch(_){} }); (old.fxNodes||[]).forEach(n => { try { n.disconnect(); } catch(_){} }); } trackNodesRef.current.delete(t.id); ensureTrackGraph(t); }); }}}/>
                      <span style={{color:tapeEnabled?'#ff6600':'#4e6a82',fontWeight:700,fontSize:12}}>{tapeEnabled?'ON':'OFF'}</span>
                    </label>
                  </div>
                  {[['DRIVE',tapeDrive,setTapeDrive,'drive'],['WARMTH',tapeWarmth,setTapeWarmth,'warmth']].map(([lbl,val,setter,key])=>(
                    <div key={lbl} className="rs-param-row">
                      <div className="rs-param-header">
                        <span>{lbl}</span><span style={{color:'#ff6600'}}>{(val*100).toFixed(0)}%</span>
                      </div>
                      <input type="range" min={0} max={1} step={0.01} value={val} className="rs-range-orange"
                        onChange={e=>{const v=parseFloat(e.target.value);setter(v);setFx(f=>({...f,tapeSaturation:{...f.tapeSaturation,[key]:v}}));rebuildFxChain();}}/>
                    </div>
                  ))}
                </div>
                <div className="rs-dark-card">
                  <div className="rs-card-header">
                    <div><h4 className="rs-card-title">⚡ Harmonic Exciter</h4>
                    <p className="rs-card-subtitle">Aphex-style presence enhancer — adds air and harmonic overtones</p></div>
                    <label className="rs-toggle-label">
                      <input type="checkbox" checked={harmonicEnabled} onChange={e=>{setHarmonicEnabled(e.target.checked);setFx(f=>({...f,exciter:{...f.exciter,enabled:e.target.checked}}));rebuildFxChain();}}/>
                      <span style={{color:harmonicEnabled?'#ffd60a':'#4e6a82',fontWeight:700,fontSize:12}}>{harmonicEnabled?'ON':'OFF'}</span>
                    </label>
                  </div>
                  <div className="rs-param-header">
                    <span>AMOUNT</span><span style={{color:'#ffd60a'}}>{(harmonicAmount*100).toFixed(0)}%</span>
                  </div>
                  <input type="range" min={0} max={1} step={0.01} value={harmonicAmount} className="rs-range-yellow"
                    onChange={e=>{const v=parseFloat(e.target.value);setHarmonicAmount(v);setFx(f=>({...f,exciter:{...f.exciter,amount:v}}));rebuildFxChain();}}/>
                </div>
              </div>
            )}
            {analogSubview==='pedals'&&(
              <div className="rs-amp-panel">
                <h4 style={{color:'#e6edf3',fontWeight:800,marginBottom:8}}>🎛️ Signal Chain</h4>
                <p style={{color:'#8b949e',fontSize:12,marginBottom:20}}>Analog-modeled effects in series — Tuner → Compressor → Overdrive → Chorus → Delay → Reverb</p>
                <div className="rs-chain-grid">
                  {[['🎵','Tuner'],['🗜️','Compressor'],['🔥','Overdrive'],['🌊','Chorus'],['⏱️','Delay'],['🏔️','Reverb']].map(([icon,name])=>(
                    <div key={name} className="rs-effect-card"
                      onMouseEnter={e=>e.currentTarget.style.borderColor='#ff6600'}
                      onMouseLeave={e=>e.currentTarget.style.borderColor='#21262d'}>
                      <span className="rs-effect-icon">{icon}</span>
                      <span className="rs-effect-name">{name}</span>
                      <div className="rs-effect-knob"/>
                    </div>
                  ))}
                </div>
                <p className="rs-hint-sm">Full pedal chain in Amp Sim tab → Pedal Chain section</p>
              </div>
            )}
            {analogSubview==='console'&&(
              <div className="rs-console-panel">
                <div className="rs-console-label">
                  CONSOLE CHARACTER — Applied to each track and master bus
                </div>
                <div className="rs-console-btn-row">
                  {Object.entries(CONSOLE_BOARDS).map(([id,b]) => (
                    <button key={id}
                      onClick={() => {
                        const newChar = {};
                        tracks.forEach(t => { newChar[t.id] = id; });
                        setTrackConsoleChar(newChar);
                      }}
                      style={{padding:'6px 12px',border:`1px solid ${b.color}`,borderRadius:4,
                        cursor:'pointer',background: id==='none'?'#0d1117':`${b.color}22`,
                        color:b.color,fontSize:11,fontFamily:'Share Tech Mono,monospace'}}>
                      {b.name}
                    </button>
                  ))}
                </div>
                <div className="rs-master-bus-label">MASTER BUS</div>
                <div className="rs-console-btn-row">
                  {Object.entries(CONSOLE_BOARDS).map(([id,b]) => (
                    <button key={id}
                      onClick={() => setMasterConsoleChar(id)}
                      style={{padding:'4px 10px',border:`1px solid ${masterConsoleChar===id?b.color:'#21262d'}`,
                        borderRadius:4,cursor:'pointer',
                        background:masterConsoleChar===id?`${b.color}22`:'#0d1117',
                        color:masterConsoleChar===id?b.color:'#4e6a82',
                        fontSize:10,fontFamily:'Share Tech Mono,monospace'}}>
                      {b.name}
                    </button>
                  ))}
                </div>
                <div className="rs-console-hint">
                  Per-track: Use the Console tab dropdown on each channel strip
                </div>
              </div>
            )}
            </div>
          </div>
        )}
        {viewMode === 'speakersim' && (
          <SpeakerSimulator audioContext={audioCtxRef.current} inputNode={masterConsoleOutRef.current || masterGainRef.current} />
        )}
        {viewMode === 'mastering' && (
          <div className="rs-flex-scroll-dark">
            <MasteringChain
              audioContext={audioCtxRef.current}
              inputNode={masterConsoleOutRef.current || masterGainRef.current}
              outputNode={audioCtxRef.current?.destination}
              masterVolume={masterVolume}
              onClose={() => setViewMode('arrange')}
              isEmbedded={true}
            />
          </div>
        )}

        {/* ──────── LOOPERMAN VIEW ──────── */}
        {viewMode === 'looperman' && (
          <div className="rs-flex-hidden">
            <LoopermanBrowser
              audioContext={audioCtxRef.current}
              onSoundSelect={(audioBuffer, name, audioUrl) => {
                const ai = tracks.findIndex(t => t.armed);
                if (ai !== -1) {
                  updateTrack(ai, { audioBuffer, audio_url: audioUrl, name: name || 'Loop' });
                  createRegionFromImport(ai, audioBuffer, name || 'Loop', audioUrl);
                  setStatus(`✓ "${name}" → Track ${ai + 1}`);
                } else {
                  window.__spx_sampler_export = { buffer: audioBuffer, name, timestamp: Date.now() };
                  setViewMode('beatmaker');
                  setStatus(`Loop "${name}" sent to Beat Maker`);
                }
              }}
              onClose={() => setViewMode('arrange')}
              isEmbedded={true}
            />
          </div>
        )}
        {/* ──────── VOICE MIDI VIEW ──────── */}

        {viewMode === "synth" && (
          <div className="daw-synth-view rs-view-auto">
            <SynthCreator
              onClose={() => setViewMode("arrange")}
              onAssignToTrack={(preset, audioBuffer) => {
                if (!audioBuffer) { setStatus("🎛️ Use Assign to Track in Synth Creator"); return; }
                landBufferOnTrack(audioBuffer, preset?.name || "Synth");
              }}
            />
          </div>
        )}

        {viewMode === "drumdesigner" && (
          <div className="daw-drumdesigner-view rs-view-auto">
            <DrumDesigner
              onClose={() => setViewMode("beatmaker")}
              onAssignToPad={(data) => {
                if (data.audioBuffer) window.__spx_sampler_export = { buffer: data.audioBuffer, name: (data.type || "Drum").toUpperCase(), timestamp: Date.now() };
                setStatus(`🥁 ${(data.type||"Drum").toUpperCase()} → Beat Maker pad`);
                setViewMode("beatmaker");
              }}
              onAssignToTrack={(data) => {
                if (!data.audioBuffer) { setStatus("🥁 Use Send to Track in Drum Designer"); return; }
                landBufferOnTrack(data.audioBuffer, (data.type || "Drum").toUpperCase());
              }}
            />
          </div>
        )}

        {viewMode === "instrbuilder" && (
          <div className="daw-instrbuilder-view rs-view-auto">
            <InstrumentBuilder
              onClose={() => setViewMode("arrange")}
              onAssignToTrack={(preset, audioBuffer) => {
                if (!audioBuffer) { setStatus("🎸 Use Assign to Track in Instrument Builder"); return; }
                landBufferOnTrack(audioBuffer, preset?.instrName || "Instrument");
              }}
            />
          </div>
        )}

        {viewMode === "voicemidi" && (
          <div className="daw-voicemidi-view">
            <VoiceToMIDI
              audioContext={audioCtxRef.current}
              bpm={bpm}
              isEmbedded={true}
              onNoteOn={({ note, velocity, channel }) => {
                const armedIdx = tracks.findIndex(
                  (t) => t.armed && (t.trackType === "midi" || t.trackType === "instrument"),
                );
                if (armedIdx !== -1) instrumentEngine.playNoteOnTrack(armedIdx, note, velocity);
              }}
              onNoteOff={({ note, channel }) => {
                const armedIdx = tracks.findIndex(
                  (t) => t.armed && (t.trackType === "midi" || t.trackType === "instrument"),
                );
                if (armedIdx !== -1) instrumentEngine.stopNoteOnTrack(armedIdx, note);
              }}
              onNotesGenerated={(notes) => {
                if (!notes?.length) return;
                const armedIdx = tracks.findIndex(
                  (t) => t.armed && (t.trackType === "midi" || t.trackType === "instrument"),
                );
                if (armedIdx === -1) return;
                const beatsPerSec = bpm / 60;
                const midiNotes = notes.map((n, i) => ({
                  id: `voice_${Date.now()}_${i}`,
                  note: n.note,
                  velocity: n.velocity || 80,
                  startBeat: (n.startTime || n.time || 0) * beatsPerSec,
                  duration: Math.max((n.duration || 0.25) * beatsPerSec, 0.125),
                }));
                const inst = instrumentEngine.getTrackInstrument(armedIdx);
                const regionName = inst?.isDrum ? "Beatbox Pattern" : "Voice Melody";
                const region = createMidiRegionFromNotes(midiNotes, regionName);
                if (playheadBeat > 0) {
                  const offset = region.startBeat;
                  region.startBeat = playheadBeat;
                  region.notes = region.notes.map((n) => ({ ...n, startBeat: n.startBeat - offset }));
                }
                setTracks((prev) =>
                  prev.map((t, i) => (i === armedIdx ? { ...t, regions: [...(t.regions || []), region] } : t)),
                );
                setStatus(`🎤 ${midiNotes.length} notes from voice → Track ${armedIdx + 1}`);
              }}
              onSendToTrack={(audioBuffer, name) => {
                const idx = selectedTrackIndex;
                updateTrack(idx, { audioBuffer, name: name || tracks[idx].name });
                setViewMode("arrange");
                setStatus(`Vocal MIDI render → Track ${idx + 1}`);
              }}
              onClose={() => setViewMode("arrange")}
            />
          </div>
        )}

        {/* ──────── TAKE LANES VIEW ──────── */}
        {viewMode === "takelanes" && (
          <div className="rs-flex-hidden">
            <TakeLanes
              audioContext={audioCtxRef.current}
              bpm={bpm}
              onCompositeReady={(compositeBuffer, name) => {
                const ai = tracks.findIndex(t => t.armed);
                const targetIdx = ai !== -1 ? ai : selectedTrackIndex;
                const audioUrl = URL.createObjectURL(
                  new Blob([], { type: 'audio/wav' })
                );
                updateTrack(targetIdx, {
                  audioBuffer: compositeBuffer,
                  audio_url: audioUrl,
                  name: name || 'Comp',
                });
                createRegionFromImport(targetIdx, compositeBuffer, name || 'Comp', audioUrl);
                setStatus(`✓ ${name} → Track ${targetIdx + 1}`);
                setViewMode('arrange');
              }}
              isEmbedded={true}
            />
          </div>
        )}

        {/* ── Insert Picker Dropdown ── */}
        {insertPickerState && (
          <div
            style={{
              position: "fixed",
              left: insertPickerState.x,
              top: insertPickerState.y,
              zIndex: 9999,
              background: "#1a2636",
              border: "1px solid #3a5570",
              borderRadius: 6,
              padding: "4px 0",
              minWidth: 160,
              maxHeight: 400,
              overflowY: "auto",
              boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                padding: "4px 10px",
                fontSize: "0.6rem",
                color: "#5a7088",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: 1,
              }}
            >
              Add Insert
            </div>
            {[
              {
                cat: "Vocal Tools",
                items: [
                  { key: "__vocal_processor", name: "Vocal Processor" },
                  { key: "__mic_simulator", name: "Mic Simulator" },
                ],
              },
              {
                cat: "Dynamics",
                items: [
                  { key: "eq", name: "EQ" },
                  { key: "compressor", name: "Compressor" },
                  { key: "gate", name: "Gate" },
                  { key: "deesser", name: "De-Esser" },
                  { key: "limiter", name: "Limiter" },
                ],
              },
              {
                cat: "Time/Space",
                items: [
                  { key: "reverb", name: "Reverb" },
                  { key: "delay", name: "Delay" },
                  { key: "chorus", name: "Chorus" },
                  { key: "flanger", name: "Flanger" },
                  { key: "phaser", name: "Phaser" },
                ],
              },
              {
                cat: "Modulation",
                items: [
                  { key: "tremolo", name: "Tremolo" },
                  { key: "stereoWidener", name: "Stereo Widener" },
                ],
              },
              {
                cat: "Saturation",
                items: [
                  { key: "distortion", name: "Distortion" },
                  { key: "bitcrusher", name: "Bit Crusher" },
                  { key: "tapeSaturation", name: "Tape Saturation" },
                  { key: "exciter", name: "Exciter" },
                ],
              },
              {
                cat: "Utility",
                items: [
                  { key: "filter", name: "Filter" },
                  { key: "gainUtility", name: "Gain Utility" },
                ],
              },
              {
                cat: "SPX Analog",
                items: [
                  { key: "tapeForge",    name: "TapeForge"    },
                  { key: "valveGlow",    name: "ValveGlow"    },
                  { key: "ironCore",     name: "IronCore"     },
                  { key: "consoleSoul",  name: "ConsoleSoul"  },
                ],
              },
              {
                cat: "SPX Dynamics",
                items: [
                  { key: "brickWall",      name: "BrickWall"      },
                  { key: "warmPress",      name: "WarmPress"      },
                  { key: "glueBus",        name: "GlueBus"        },
                  { key: "fetStrike",      name: "FETStrike"      },
                  { key: "optoPress",      name: "OptoPress"      },
                  { key: "parallelCrush",  name: "ParallelCrush"  },
                  { key: "multiPress",     name: "MultiPress"     },
                  { key: "transGate",      name: "TransGate"      },
                ],
              },
              {
                cat: "SPX EQ",
                items: [
                  { key: "ironBand",      name: "IronBand"      },
                  { key: "spectraCurve",  name: "SpectraCurve"  },
                ],
              },
              {
                cat: "SPX Spatial",
                items: [
                  { key: "hallForgeS",     name: "HallForge I"    },
                  { key: "hallForgeL",     name: "HallForge II"   },
                  { key: "gateVerb",       name: "GateVerb"       },
                  { key: "vintageAir",     name: "VintageAir"     },
                  { key: "stochasticHall", name: "StochasticHall" },
                  { key: "greatHall",      name: "GreatHall"      },
                  { key: "plateForge",     name: "PlateForge"     },
                  { key: "springBox",      name: "SpringBox"      },
                  { key: "echoField",      name: "EchoField"      },
                  { key: "stereoBloom",    name: "StereoBloom"    },
                  { key: "pitchForge",     name: "PitchForge"     },
                  { key: "dualDelay",      name: "DualDelay"      },
                ],
              },
              {
                cat: "SPX Vocal",
                items: [
                  { key: "pitchLock",      name: "PitchLock"      },
                  { key: "voiceForge",     name: "VoiceForge"     },
                  { key: "breathGate",     name: "BreathGate"     },
                  { key: "sibilantCut",    name: "SibilantCut"    },
                  { key: "phantomDouble",  name: "PhantomDouble"  },
                  { key: "vocalSpace",     name: "VocalSpace"     },
                ],
              },
              {
                cat: "SPX Mastering",
                items: [
                  { key: "masterWall",      name: "MasterWall"      },
                  { key: "stereoForge",     name: "StereoForge"     },
                  { key: "loudnessMeter",   name: "LoudnessMeter"   },
                  { key: "harmonicExcite",  name: "HarmonicExcite"  },
                  { key: "vinylPress",      name: "VinylPress"      },
                  { key: "ditherForge",     name: "DitherForge"     },
                  { key: "dcBlock",         name: "DCBlock"         },
                  { key: "spaceForge",      name: "SpaceForge"      },
                  { key: "vortexMod",       name: "VortexMod"       },
                  { key: "gainRider",       name: "GainRider"       },
                  { key: "harmonicSum",     name: "HarmonicSum"     },
                ],
              },
              {
                cat: "SPX EQ Suite",
                items: [
                  { key: "pultecForge",   name: "PultecForge"  },
                  { key: "dynamicEQ",     name: "DynamicEQ"    },
                  { key: "graphicEQ",     name: "GraphicEQ"    },
                  { key: "tiltEQ",        name: "TiltEQ"       },
                  { key: "baxandallEQ",   name: "BaxandallEQ"  },
                ],
              },
              {
                cat: "SPX Creative",
                items: [
                  { key: "vocoderSPX",     name: "VocoderSPX"     },
                  { key: "granularFreeze", name: "GranularFreeze" },
                  { key: "noiseReduction", name: "NoiseRedux"     },
                  { key: "ringMod",        name: "RingMod"        },
                  { key: "formantFilter",  name: "FormantFilter"  },
                  { key: "spectrumAnalyzer",name:"SpectrumAnalyzer"},
                ],
              },
              { cat:"SPX Producer", items:[
                  {key:"tapeStop",name:"TapeStop"},{key:"transientShaper",name:"TransientShaper"},
                  {key:"multibandSat",name:"MultibandSat"},{key:"stereoImager",name:"StereoImager"},
                  {key:"enhancer808",name:"808Enhancer"},{key:"loFiCrusher",name:"LoFiCrusher"},
                  {key:"infiniteReverb",name:"InfiniteReverb"},{key:"reverseDelay",name:"ReverseDelay"},
                  {key:"chorusEnsemble",name:"ChorusEnsemble"},{key:"tempoDelay",name:"TempoDelay"},
                  {key:"pitchRandomizer",name:"PitchRandomizer"},{key:"autoWah",name:"AutoWah"},
                  {key:"drumEnhancer",name:"DrumEnhancer"},{key:"vocalSaturator",name:"VocalSaturator"},
                  {key:"subOctaver",name:"SubOctaver"},{key:"freqShifter",name:"FreqShifter"},
                  {key:"cabinetSim",name:"CabinetSim"},
              ]},
              { cat:"SPX Restoration", items:[
                  {key:"declicker",name:"Declicker"},{key:"dehummer",name:"Dehummer"},
                  {key:"dialogueIsolator",name:"DialogueIsolator"},
              ]},
              { cat:"SPX Metering", items:[
                  {key:"gainStager",name:"GainStager"},{key:"goniometer",name:"Goniometer"},
                  {key:"phaseScope",name:"PhaseScope"},{key:"midSideComp",name:"MidSideComp"},
                  {key:"multibandLimiter",name:"MultibandLimiter"},
              ]},
            ].map((group) => (
              <div key={group.cat}>
                <div
                  style={{
                    padding: "6px 10px 2px",
                    fontSize: "0.55rem",
                    color: group.cat === "Vocal Tools" ? "#ff6b9d" : "#5ac8fa",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                  }}
                >
                  {group.cat}
                </div>
                {group.items.map((fx) => {
                  const isVocalTool = fx.key.startsWith("__");
                  const already = !isVocalTool && tracks[insertPickerState.trackIndex]?.effects?.[fx.key]?.enabled;
                  return (
                    <div
                      key={fx.key}
                      style={{
                        padding: "4px 14px",
                        fontSize: "0.7rem",
                        color: already ? "#5a7088" : isVocalTool ? "#ff6b9d" : "#ddeeff",
                        cursor: already ? "default" : "pointer",
                        transition: "background 0.1s",
                        fontStyle: isVocalTool ? "italic" : "normal",
                      }}
                      onMouseEnter={(e) => {
                        if (!already) e.currentTarget.style.background = isVocalTool ? "rgba(255,107,157,0.1)" : "rgba(90,200,250,0.1)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                      }}
                      onClick={() => {
                        if (fx.key === "__vocal_processor") {
                          setInsertPickerState(null);
                          setShowVocalModal(true);
                          setStatus("Vocal Processor — dial FX, then Apply to Console");
                          return;
                        }
                        if (fx.key === "__mic_simulator") {
                          setInsertPickerState(null);
                          setShowMicSimModal(true);
                          setStatus("Mic Simulator — choose a mic model, then apply profile");
                          return;
                        }
                        if (already) return;
                        updateEffect(insertPickerState.trackIndex, fx.key, "enabled", true);
                        setActiveEffectsTrack(insertPickerState.trackIndex);
                        setOpenFxKey(fx.key);
                        setInsertPickerState(null);
                        setStatus(`${fx.name} added — Track ${insertPickerState.trackIndex + 1}`);
                      }}
                    >
                      {isVocalTool ? `⤴ ${fx.name}` : already ? `✓ ${fx.name}` : fx.name}
                    </div>
                  );
                })}
              </div>
            ))}
            {/* ── PLUGIN LIBRARY — 106 legacy plugins ── */}
            <div className="rs-sidebar-section-header">
              <div className="rs-sidebar-section-label">
                🎛 Plugin Library — 106 Plugins
              </div>
            </div>
            {(() => {
              const CATS = ["dynamics","eq","reverb","delay","modulation","filter","distortion","pitch","vocal","spatial","utility","mastering","restoration","creative"];
              const CAT_ICONS = { dynamics:"🎚",eq:"📊",reverb:"🌊",delay:"⏱",modulation:"🌀",filter:"🔊",distortion:"🔥",pitch:"🎵",vocal:"🎤",spatial:"🔭",utility:"🔧",mastering:"💿",restoration:"🛠",creative:"✨" };
              try {
                const { getAllPlugins } = require('../component/audio/plugins/registry') || {};
                const allPlugins = getAllPlugins ? getAllPlugins() : [];
                return CATS.map(cat => {
                  const catPlugins = allPlugins.filter(p => p.category === cat);
                  if (!catPlugins.length) return null;
                  return (
                    <div key={cat}>
                      <div className="rs-sidebar-item-label">
                        {CAT_ICONS[cat] || "🎛"} {cat}
                      </div>
                      {catPlugins.map(plug => {
                        const alreadyLoaded = tracks[insertPickerState?.trackIndex]?.effects?.[plug.id]?.enabled;
                        return (
                          <div
                            key={plug.id}
                            style={{
                              padding: "3px 14px 3px 20px", fontSize: "0.68rem",
                              color: alreadyLoaded ? "#5a7088" : "#ffcc88",
                              cursor: alreadyLoaded ? "default" : "pointer",
                              display: "flex", alignItems: "center", gap: 6,
                            }}
                            onMouseEnter={(e) => { if (!alreadyLoaded) e.currentTarget.style.background = "rgba(255,152,0,0.08)"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                            onClick={() => {
                              if (alreadyLoaded || insertPickerState === null) return;
                              updateEffect(insertPickerState.trackIndex, plug.id, "enabled", true);
                              updateEffect(insertPickerState.trackIndex, plug.id, "name", plug.name);
                              updateEffect(insertPickerState.trackIndex, plug.id, "libPlugin", true);
                              setActiveEffectsTrack(insertPickerState.trackIndex);
                              setInsertPickerState(null);
                              setStatus(`${plug.name} added — Track ${insertPickerState.trackIndex + 1}`);
                            }}
                          >
                            <span className="rs-lib-badge">LIB</span>
                            {alreadyLoaded ? `✓ ${plug.name}` : plug.name}
                          </div>
                        );
                      })}
                    </div>
                  );
                });
              } catch(e) { return null; }
            })()}
            <div className="rs-divider" />
            <div
              className="rs-remove-item"
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(229,57,53,0.1)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
              onClick={() => setInsertPickerState(null)}
            >
              Cancel
            </div>
          </div>
        )}

        {afx && openFxKey && (
          <div
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              zIndex: 999,
              background: "#1a2636",
              border: "1px solid #3a5570",
              borderRadius: 10,
              padding: 0,
              width: 320,
              maxHeight: "80vh",
              overflowY: "auto",
              boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
            }}
          >
            <ConsoleFXPanel
              track={afx}
              trackIndex={activeEffectsTrack}
              updateEffect={updateEffect}
              onClose={() => {
                setActiveEffectsTrack(null);
                setOpenFxKey(null);
              }}
              openFxKey={openFxKey}
            />
          </div>
        )}

        {/* ═══════════════════ SAVE AS MODAL ═══════════════════ */}
        <SaveAsModal
          show={showSaveAsModal}
          defaultName={projectName}
          onSave={(fileName) => {
            if (saveAsData) {
              const blob = new Blob([saveAsData], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = fileName;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
              setStatus('Saved: ' + fileName);
            }
            setShowSaveAsModal(false);
            setSaveAsData(null);
          }}
          onCancel={() => { setShowSaveAsModal(false); setSaveAsData(null); }}
        />
        <CollabChatPanel collab={collab} />
      </div>
    </div>
  );
};

export default RecordingStudio;

// 🔥 SPX → Motion Button
const MotionButton = ({ url }) => {
  const { actions } = useContext(Context);
  const navigate = useNavigate();

  const handleSend = () => {
    sendToMotion(actions, navigate, {
      type: "audio",
      url,
      name: "Recording"
    });
  };

  return (
    <button onClick={handleSend} className="rs-send-btn">
      Send to Motion Studio 🎬
    </button>
  );
};
