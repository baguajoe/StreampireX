
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
    ["mastering","Mastering"],["speakersim","Monitor Room"],
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

function ToolsDropdown({ viewMode, setViewMode, onSplitAtPlayhead }) {
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
          {/* Bug #10b: discoverable Split-at-playhead entry. (Existing scissors button stays for muscle memory.) */}
          {onSplitAtPlayhead && (
            <button
              className="daw-mix-dropdown-item daw-mix-dropdown-action"
              onClick={() => { onSplitAtPlayhead(); setOpen(false); }}
            >
              ✂ Split at playhead <span className="daw-mix-dropdown-shortcut">S</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// MAIN FILE STARTS HERE
// =============================================================================
import FlexPitchEditor from '../component/FlexPitchEditor';
import AudioClipEditor from '../component/AudioClipEditor';
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
import * as Tone from "tone";
import AIMixAssistant from "../component/AIMixAssistant";
import ChannelStripAIMix from "../component/ChannelStripAIMix";
import SamplerBeatMaker from "../component/SamplerBeatMaker";
import SamplerInstrument from "../component/SamplerInstrument";
import MicSimulator from "../component/MicSimulator";
import CustomMicBuilder from "../component/CustomMicBuilder";
import SpeakerSimulator from "../component/SpeakerSimulator";
import MonitorRoomPro from "../component/MonitorRoomPro";
import LeftSidebar from "../component/LeftSidebar";
import RightSidebar from "../component/RightSidebar";
import SvgFader, { volumeToPos } from "../component/SvgFader";
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
import { saveProjectFile, loadProjectFile, audioBufferToWav, FILE_EXTENSION as PROJECT_FILE_EXT } from '../utils/projectFileFormat';
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
import { SPXPluginHost, ALL_FX_EXTENDED, PLUGIN_DEFAULTS } from '../component/SPXPlugins';
// Part 16: PluginHost integration. The 111-plugin factory library lives in
// audio/plugins/ and previously was only reachable from /plugin-rack-demo.
// We pull the factories + registry directly so the studio's inserts picker
// can offer the full library and buildFxChain can instantiate them inline.
import { PLUGIN_FACTORIES } from '../component/audio/plugins/PluginHost';
import pluginRegistry, { getAllPlugins as getAllHostPlugins } from '../component/audio/plugins/registry';
import MasteringChain from '../component/MasteringChain';
import ConsolePanel from '../component/audio/ConsolePanel';
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
import { qwertyMidi } from "../utils/qwertyMidi";
import { installWAMPlugin, getInstalledWAMPlugins } from "../component/audio/plugins/WAMPluginHost";
import AddTrackDialog from "../component/AddTrackDialog";
import { DEFAULT_EFFECTS, DEFAULT_TRACK } from "../utils/trackFactory";

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

const MIDI_NOTE_NAMES = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
const midiNoteName = (n) => `${MIDI_NOTE_NAMES[((n % 12) + 12) % 12]}${Math.floor(n / 12) - 1}`;

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

// ── Phase F4-A.7B: Console-character factory presets (named-param shape) ──
// Maps board id → 11-named-param object. The DSP factory in
// `applyConsoleCharacter` reads from this when no live override is supplied;
// the ConsolePanel UI reads it for Reset / "factory" baseline; user tweaks
// live in trackConsoleParams[trackId] / masterConsoleParams.
const CONSOLE_FACTORY_PARAMS = {
  ssl4ke:    { hpfFreq: 18, hpfQ: 0.5, satInDrive: 1.2,  satInAsym: 0, lowFreq: 200, lowGain: -0.8, highFreq: 10000, highGain: 1.2,  satOutDrive: 1.1,  satOutAsym: 0, outputGain: 0.98 },
  ssl4kg:    { hpfFreq: 15, hpfQ: 0.4, satInDrive: 1.1,  satInAsym: 0, lowFreq: 160, lowGain: -0.5, highFreq: 12000, highGain: 0.8,  satOutDrive: 1.05, satOutAsym: 0, outputGain: 0.99 },
  neve8078:  { hpfFreq: 30, hpfQ: 0.7, satInDrive: 1.6,  satInAsym: 1, lowFreq: 250, lowGain:  1.5, highFreq:  8000, highGain: -0.5, satOutDrive: 1.4,  satOutAsym: 1, outputGain: 0.95 },
  neve1073:  { hpfFreq: 50, hpfQ: 0.8, satInDrive: 1.8,  satInAsym: 1, lowFreq: 300, lowGain:  2.0, highFreq:  6000, highGain: -0.8, satOutDrive: 1.6,  satOutAsym: 1, outputGain: 0.93 },
  api1604:   { hpfFreq: 20, hpfQ: 0.6, satInDrive: 1.3,  satInAsym: 0, lowFreq: 100, lowGain:  0.5, highFreq:  5000, highGain: 1.0,  satOutDrive: 1.25, satOutAsym: 0, outputGain: 0.97 },
  tridentA:  { hpfFreq: 25, hpfQ: 0.5, satInDrive: 1.4,  satInAsym: 1, lowFreq: 180, lowGain:  1.0, highFreq:  9000, highGain: 0.6,  satOutDrive: 1.3,  satOutAsym: 1, outputGain: 0.96 },
  studer900: { hpfFreq: 22, hpfQ: 0.4, satInDrive: 1.05, satInAsym: 0, lowFreq: 120, lowGain: -0.3, highFreq: 15000, highGain: 0.3,  satOutDrive: 1.02, satOutAsym: 0, outputGain: 1.0  },
  mciJH636:  { hpfFreq: 28, hpfQ: 0.6, satInDrive: 1.5,  satInAsym: 1, lowFreq: 220, lowGain:  1.2, highFreq:  7500, highGain: 0.8,  satOutDrive: 1.35, satOutAsym: 1, outputGain: 0.96 },
  ssl9000:   { hpfFreq: 12, hpfQ: 0.4, satInDrive: 1.15, satInAsym: 0, lowFreq: 140, lowGain: -0.3, highFreq: 14000, highGain: 1.0,  satOutDrive: 1.1,  satOutAsym: 0, outputGain: 0.99 },
  neve8068:  { hpfFreq: 35, hpfQ: 0.7, satInDrive: 1.7,  satInAsym: 1, lowFreq: 280, lowGain:  1.8, highFreq:  7500, highGain: -0.6, satOutDrive: 1.45, satOutAsym: 1, outputGain: 0.94 },
  api2488:   { hpfFreq: 22, hpfQ: 0.5, satInDrive: 1.35, satInAsym: 0, lowFreq: 110, lowGain:  0.8, highFreq:  4800, highGain: 1.2,  satOutDrive: 1.3,  satOutAsym: 0, outputGain: 0.97 },
  helios69:  { hpfFreq: 40, hpfQ: 0.8, satInDrive: 1.9,  satInAsym: 1, lowFreq: 350, lowGain:  2.5, highFreq:  6000, highGain: -1.0, satOutDrive: 1.5,  satOutAsym: 1, outputGain: 0.92 },
  neveVR:    { hpfFreq: 20, hpfQ: 0.5, satInDrive: 1.45, satInAsym: 1, lowFreq: 200, lowGain:  1.2, highFreq:  9000, highGain: 0.2,  satOutDrive: 1.3,  satOutAsym: 1, outputGain: 0.96 },
  emiTG:     { hpfFreq: 45, hpfQ: 0.9, satInDrive: 2.0,  satInAsym: 1, lowFreq: 400, lowGain:  3.0, highFreq:  5500, highGain: -1.5, satOutDrive: 1.6,  satOutAsym: 1, outputGain: 0.90 },
  sslAWS:    { hpfFreq: 10, hpfQ: 0.3, satInDrive: 1.1,  satInAsym: 0, lowFreq: 130, lowGain: -0.2, highFreq: 16000, highGain: 0.6,  satOutDrive: 1.05, satOutAsym: 0, outputGain: 1.0  },
  amekAngela:{ hpfFreq: 32, hpfQ: 0.6, satInDrive: 1.55, satInAsym: 1, lowFreq: 240, lowGain:  1.6, highFreq:  8500, highGain: -0.3, satOutDrive: 1.4,  satOutAsym: 1, outputGain: 0.95 },
  harrison:  { hpfFreq: 8,  hpfQ: 0.3, satInDrive: 1.05, satInAsym: 0, lowFreq: 100, lowGain:  0.2, highFreq: 18000, highGain: 0.4,  satOutDrive: 1.02, satOutAsym: 0, outputGain: 1.0  },
  neve8014:  { hpfFreq: 60, hpfQ: 1.0, satInDrive: 2.1,  satInAsym: 1, lowFreq: 500, lowGain:  3.5, highFreq:  5000, highGain: -2.0, satOutDrive: 1.7,  satOutAsym: 1, outputGain: 0.88 },
  sonyMXP:   { hpfFreq: 14, hpfQ: 0.4, satInDrive: 1.2,  satInAsym: 0, lowFreq: 180, lowGain:  0.3, highFreq: 13000, highGain: 0.8,  satOutDrive: 1.1,  satOutAsym: 0, outputGain: 0.98 },
  calrec:    { hpfFreq: 16, hpfQ: 0.4, satInDrive: 1.15, satInAsym: 0, lowFreq: 150, lowGain: -0.1, highFreq: 15000, highGain: 0.5,  satOutDrive: 1.08, satOutAsym: 0, outputGain: 0.99 },
};

// Family aesthetic — drives ConsolePanel skin / knob style.
const CONSOLE_FAMILY = {
  ssl4ke: "ssl", ssl4kg: "ssl", ssl9000: "ssl", sslAWS: "ssl",
  neve8078: "neve", neve1073: "neve", neve8068: "neve", neveVR: "neve", neve8014: "neve",
  api1604: "api", api2488: "api",
  tridentA: "trident",
  studer900: "vintage", mciJH636: "vintage", emiTG: "vintage", helios69: "vintage",
  amekAngela: "vintage", harrison: "vintage", sonyMXP: "vintage", calrec: "vintage",
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
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const secondsToBeat = (s, bpm) => (s / 60) * bpm;
const beatToSeconds = (b, bpm) => (b / bpm) * 60;
const DB_MARKS = [0, -6, -12, -18, -24, -30, -40, -50];
const linearToMeterPos = (lin) => { if (lin <= 0) return 0; const db = 20 * Math.log10(lin); return clamp((db + 60) / 66, 0, 1); };
const dbToMeterPos = (db) => clamp((db + 60) / 66, 0, 1);

// Set of plugin keys whose UI is provided by SPXPluginHost (component-backed
// SPX plugins). Used by the FX popup to decide whether to render SPXPluginHost
// vs ConsoleFXPanel — ConsoleFXPanel only knows about the native effect keys
// (eq/comp/gate/etc.) defined in DEFAULT_EFFECTS.
const SPX_PLUGIN_KEYS = new Set(ALL_FX_EXTENDED.filter(f => f.component).map(f => f.key));

// Part 16: unified "what inserts are loaded on this track?" — combines native +
// SPX entries (from ALL_FX_EXTENDED) with any `ph_*`-keyed PluginHost plugin
// in track.effects. Returns [{ key, name, type }] in declaration order.
const getLoadedInserts = (track) => {
  if (!track?.effects) return [];
  const out = ALL_FX_EXTENDED.filter(fx => track.effects[fx.key]?.enabled);
  for (const k of Object.keys(track.effects)) {
    if (!k.startsWith("ph_") || !track.effects[k]?.enabled) continue;
    const def = pluginRegistry[k.slice(3)];
    if (def) out.push({ key: k, name: def.name || k, type: def.category || "host" });
  }
  return out;
};


// ── Cubase-style fader curve ──────────────────────────────────
// Slider int 0..1000 maps to dB -inf..+6 with 0 dB at 75% travel
const SLIDER_MAX = 1000;
const DB_MIN = -60;
const DB_MAX = 6;
// Cubase taper: 0dB at 75% (slider=750), +6dB at 100% (slider=1000)
const faderToDb = (s) => {
  if (s <= 0) return DB_MIN;
  const t = s / SLIDER_MAX;
  // Piecewise: bottom 75% = log from -inf to 0 dB, top 25% = linear 0 to +6
  if (t >= 0.75) return (t - 0.75) / 0.25 * DB_MAX;
  // Below 0 dB: logarithmic taper so -6 at 50%, -12 at 25%, -inf at 0
  // t * 100 = 0, 25, 50, 75 -> db = -inf, -12, -6, 0
  // Use curve: db = -24 * log10(1 / (t/0.75))  ... but clamp
  const norm = t / 0.75; // 0..1 across working range
  if (norm <= 0.001) return DB_MIN;
  const db = 24 * Math.log10(norm); // 0 dB at norm=1, -24 at norm=0.1, etc.
  return Math.max(DB_MIN, db);
};
const dbToFader = (db) => {
  if (db <= DB_MIN) return 0;
  if (db >= DB_MAX) return SLIDER_MAX;
  if (db >= 0) return (0.75 + (db / DB_MAX) * 0.25) * SLIDER_MAX;
  // Inverse of log taper: norm = 10^(db/24)
  const norm = Math.pow(10, db / 24);
  return Math.max(0, norm * 0.75 * SLIDER_MAX);
};
const volumeToFader = (vol) => {
  if (vol <= 0) return 0;
  const db = 20 * Math.log10(vol);
  return dbToFader(db);
};
const faderToVolume = (s) => {
  const db = faderToDb(s);
  if (db <= DB_MIN) return 0;
  return Math.pow(10, db / 20);
};

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
// DB SCALE (Part 18) — inline SVG so number positions are deterministic.
// =============================================================================
// Both flavors derive their y positions from the same math that draws the
// thing they label, so labels and graphics can never drift:
//   type="fader" — y from volumeToPos (SvgFader.js) so labels track the thumb.
//   type="meter" — y from dbToMeterPos so labels track the CubaseMeter bar.
// dB lists are deliberately sparse to keep ~14px+ y-gaps between labels.
const FADER_DB_LIST = [6, 0, -6, -12, -24, -60];   // -60 renders as "-∞"
const METER_DB_LIST = [0, -6, -12, -24, -48];
const formatFaderDb = (db) => db <= -60 ? "-∞" : db > 0 ? `+${db}` : String(db);
const DBScale = React.memo(({ type = "fader", height = 180 }) => {
  const marks = type === "meter"
    ? METER_DB_LIST.map(db => ({ db: String(db), y: height - dbToMeterPos(db) * height }))
    : FADER_DB_LIST.map(db => ({ db: formatFaderDb(db), y: height - volumeToPos(Math.pow(10, db / 20)) * height }));
  const w = 26;  // wide enough for "-48" + tick mark
  const align = type === "fader" ? "end"   : "start";
  const tx    = type === "fader" ? w - 6   : 4;
  const labelMaxY = height - 9;  // glyph height ≈ 9px; keep labels inside the SVG
  return (
    <svg className="db-scale-svg" width={w} height={height}>
      {marks.map(m => {
        // Tick stays at the true bar/thumb position; label clamps so the bottom
        // mark ("-∞", "-48") doesn't overflow past the SVG's lower edge.
        const yLabel = Math.max(0, Math.min(labelMaxY, m.y));
        return (
          <g key={m.db}>
            <line
              x1={type === "fader" ? w - 4 : 0} y1={m.y}
              x2={type === "fader" ? w     : 4} y2={m.y}
              stroke="rgba(255,255,255,0.25)" strokeWidth={1}
            />
            <text
              className="db-scale-text"
              x={tx} y={yLabel}
              textAnchor={align}
              dominantBaseline="hanging"
            >{m.db}</text>
          </g>
        );
      })}
    </svg>
  );
});

// =============================================================================
// MIC MODEL SELECTOR
// =============================================================================
const MicModelSelector = React.memo(({ trackIndex, currentModel, onApply }) => {
  const [isOpen, setIsOpen] = useState(false);
  const isActive = currentModel && currentModel !== "none";
  return (
    <div className="daw-ch-mic-wrapper">
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
    </div>
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
    <div className="rs-drag-panel" style={{ left: pos.x, top: pos.y }}>
      <div className="rs-drag-panel-header" onMouseDown={onMouseDown}>
        <span className="rs-drag-panel-title">{title}</span>
        <button onClick={onClose} className="rs-drag-panel-close">x</button>
      </div>
      <div className="rs-drag-panel-body">{children}</div>
    </div>
  );
};

const InsertPickerMenu = ({ insertPickerState, setInsertPickerState, tracks, updateEffect, seedEffect, setActiveEffectsTrack, setOpenFxKey, setShowVocalModal, setShowMicSimModal, setStatus, setTracks, disposeAllForTrack }) => {
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
  // Phase F4-A.5: hide `comingSoon: true` entries (deprecated reverb clones,
  // pre-differentiation stubs) from the picker. Factory code stays in RS.js
  // for Phase E differentiation, but users can't add them as inserts.
  const visible = (f) => !f.comingSoon;
  // Part 16: surface every PluginHost-registered plugin (audio/plugins/*)
  // through the inserts picker. The track.effects key is `ph_<pluginId>` so
  // it never collides with native or SPX keys; buildFxChain detects the
  // prefix and routes through PLUGIN_FACTORIES. Grouped by registry category.
  const HOST_PLUGINS = getAllHostPlugins();
  const hostByCat = {};
  HOST_PLUGINS.forEach(p => {
    if (!PLUGIN_FACTORIES[p.id]) return;  // only show plugins we can actually instantiate
    const cat = (p.category || "creative").replace(/^./, c => c.toUpperCase());
    (hostByCat[cat] = hostByCat[cat] || []).push({ key: `ph_${p.id}`, name: p.name || p.id, type: p.type, _host: true });
  });
  const HOST_GROUPS = Object.keys(hostByCat).sort().map(cat => ({ cat: `Plugin Rack — ${cat}`, cls: "host", items: hostByCat[cat] }));
  const groups = [
    { cat: "Vocal Tools",   cls: "vocal", items: [{key:"__vocal_processor",name:"Vocal Processor"},{key:"__mic_simulator",name:"Mic Simulator"}] },
    { cat: "── Standard FX ──", cls: "header", items: [] },
    { cat: "EQ",            cls: "", items: ALL_FX_EXTENDED.filter(f=>visible(f) && f.type==="eq" && !SPX_KEYS.has(f.key)) },
    { cat: "Dynamics",      cls: "", items: ALL_FX_EXTENDED.filter(f=>visible(f) && ["comp","limit","gate"].includes(f.type) && !SPX_KEYS.has(f.key)) },
    { cat: "Reverb",        cls: "", items: ALL_FX_EXTENDED.filter(f=>visible(f) && f.type==="reverb" && !SPX_KEYS.has(f.key)) },
    { cat: "Delay",         cls: "", items: ALL_FX_EXTENDED.filter(f=>visible(f) && f.type==="delay" && !SPX_KEYS.has(f.key)) },
    { cat: "Modulation",    cls: "", items: ALL_FX_EXTENDED.filter(f=>visible(f) && f.type==="filter" && !SPX_KEYS.has(f.key)) },
    { cat: "Saturation",    cls: "", items: ALL_FX_EXTENDED.filter(f=>visible(f) && f.type==="distortion" && !SPX_KEYS.has(f.key)) },
    { cat: "Utility",       cls: "", items: ALL_FX_EXTENDED.filter(f=>visible(f) && !["comp","limit","gate","eq","reverb","delay","filter","distortion"].includes(f.type) && !SPX_KEYS.has(f.key)) },
    { cat: "── SPX Plugins ──", cls: "header", items: [] },
    { cat: "SPX Dynamics",  cls: "spx", items: ALL_FX_EXTENDED.filter(f=>visible(f) && ["comp","limit","gate"].includes(f.type) && SPX_KEYS.has(f.key)) },
    { cat: "SPX EQ",        cls: "spx", items: ALL_FX_EXTENDED.filter(f=>visible(f) && f.type==="eq" && SPX_KEYS.has(f.key)) },
    { cat: "SPX Reverb",    cls: "spx", items: ALL_FX_EXTENDED.filter(f=>visible(f) && f.type==="reverb" && SPX_KEYS.has(f.key)) },
    { cat: "SPX Delay",     cls: "spx", items: ALL_FX_EXTENDED.filter(f=>visible(f) && f.type==="delay" && SPX_KEYS.has(f.key)) },
    { cat: "SPX Modulation",cls: "spx", items: ALL_FX_EXTENDED.filter(f=>visible(f) && f.type==="filter" && SPX_KEYS.has(f.key)) },
    { cat: "SPX Saturation",cls: "spx", items: ALL_FX_EXTENDED.filter(f=>visible(f) && f.type==="distortion" && SPX_KEYS.has(f.key)) },
    { cat: "── Analog Character ──", cls: "header", items: [] },
    { cat: "Vocals",        cls: "spx", items: ALL_FX_EXTENDED.filter(f=>visible(f) && ["warmPress","valveGlow","deesser","vocalComp"].includes(f.key)) },
    { cat: "Drums",         cls: "spx", items: ALL_FX_EXTENDED.filter(f=>visible(f) && ["glueBus","fetStrike","tapeForge","transGate","parallelCrush","ironCore"].includes(f.key)) },
    { cat: "Mix Bus",       cls: "spx", items: ALL_FX_EXTENDED.filter(f=>visible(f) && ["brickWall","multiPress","consoleSoul","spectraCurve","ironBand","tubeComp"].includes(f.key)) },
    { cat: "── Mastering ──", cls: "header", items: [] },
    { cat: "Mastering",     cls: "master", items: ALL_FX_EXTENDED.filter(f=>visible(f) && f.type==="mastering") },
    { cat: "SPX Creative",  cls: "spx", items: ALL_FX_EXTENDED.filter(f=>visible(f) && !["comp","limit","gate","eq","reverb","delay","filter","distortion"].includes(f.type) && SPX_KEYS.has(f.key)) },
    { cat: "── Plugin Rack Library ──", cls: "header", items: [] },
    ...HOST_GROUPS,
  ];
  // Phase 3 / Fix 1: full clear — drop every effect key + dispose every live
  // PluginInstance for the track. (Old behavior just toggled enabled=false,
  // leaving stale params and orphaned LFO oscillators in the registry.)
  const clearAllInserts = () => {
    const ti = insertPickerState.trackIndex;
    if (ti < 0) return;
    const t = tracks[ti]; if (!t || !t.effects) { setInsertPickerState(null); return; }
    if (t.id) disposeAllForTrack(t.id);
    setTracks(prev => prev.map((tr, i) => i !== ti ? tr : ({ ...tr, effects: {} })));
    setInsertPickerState(null);
    setStatus("Inserts cleared");
  };
  return (
    <>
      <div className="rs-insert-none-row" onClick={clearAllInserts} title="Disable every insert on this track">
        <span>✕ None / Clear all inserts</span>
      </div>
      <div className="rs-divider"/>
      {groups.map(group => (
        <div key={group.cat}>
          {group.cls === 'header' ? (
            <div className="rs-insert-cat-header">
              {group.cat.replace(/^──\s*|\s*──$/g,"")}
            </div>
          ) : (
            <div className="rs-insert-cat-row" onClick={()=>toggleCat(group.cat)}>
              <span className={"rs-insert-cat-label" + (group.cls === "spx" ? " spx" : group.cls === "vocal" ? " vocal" : "")}>{group.cat}</span>
              <span className="rs-insert-cat-count">{openCats[group.cat]?"▲":"▼"} {group.items.length}</span>
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
                  seedEffect(insertPickerState.trackIndex, fx.key, PLUGIN_DEFAULTS[fx.key] || {});
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

// Bug #12 (Part 9b): destination picker for +Add Send. Lists every track that
// is NOT the source track (so you can route to buses, aux, or any sibling
// audio track). Adds { busId, target, level: 0.5 } so the existing Console
// renderer (which keys by busId) continues to find/update the send.
const SendPickerMenu = ({ sendPickerState, setSendPickerState, tracks, updateTrack, setStatus }) => {
  const ti = sendPickerState?.trackIndex ?? -1;
  const sourceTrack = tracks[ti];
  if (!sourceTrack) return null;
  const targets = tracks.map((t, i) => ({ t, i })).filter(({ t, i }) => i !== ti && t.id);
  const existingIds = new Set((sourceTrack.sends || []).map(s => s.busId));
  return (
    <>
      {targets.length === 0 && <div className="rs-insert-cat-header" style={{color:"#8ba3bc"}}>No other tracks to send to</div>}
      {targets.map(({ t: target, i: idx }) => {
        const already = existingIds.has(target.id);
        return (
          <div key={target.id} className={"daw-insert-picker-item" + (already ? " done" : "")}
            onClick={() => {
              if (already) return;
              const newSends = [...(sourceTrack.sends || []), { busId: target.id, target: target.name || `Track ${idx + 1}`, level: 0.5, prePost: "post" }];
              updateTrack(ti, { sends: newSends });
              setSendPickerState(null);
              setStatus(`Send → ${target.name || `Track ${idx + 1}`}`);
            }}>
            {already ? "✓ " : "→ "}{target.name || `Track ${idx + 1}`} <span style={{color:"#4e6a82",fontSize:9,marginLeft:6}}>({target.trackType || "audio"})</span>
          </div>
        );
      })}
      <div className="rs-divider"/>
      <div className="rs-remove-item" onClick={() => setSendPickerState(null)}>Cancel</div>
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

  // Sidebar state
  const [showLeftSidebar, setShowLeftSidebar] = useState(() => {
    const v = localStorage.getItem("rs_left_open");
    return v === null ? true : v === "true";
  });
  const [showRightSidebar, setShowRightSidebar] = useState(() => {
    const v = localStorage.getItem("rs_right_open");
    return v === null ? true : v === "true";
  });
  useEffect(() => { localStorage.setItem("rs_left_open", showLeftSidebar); }, [showLeftSidebar]);
  useEffect(() => { localStorage.setItem("rs_right_open", showRightSidebar); }, [showRightSidebar]);

  // Part 12: subscribe to QWERTY-MIDI engine state so the toolbar toggle and HUD
  // stay in sync with octave/velocity/last-note changes triggered by hotkeys.
  useEffect(() => qwertyMidi.onChange(s => {
    setQwertyEnabled(s.enabled);
    setQwertyOctave(s.octave);
    setQwertyVelocity(s.velocity);
    setQwertyLastNote(s.lastNote);
  }), []);

  // Keyboard shortcuts for sidebar toggles + Bug #10c: S = split at playhead.
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "l" && !e.altKey) {
        e.preventDefault(); setShowLeftSidebar(v => !v);
      } else if ((e.metaKey || e.ctrlKey) && e.key === "r" && !e.altKey && !e.shiftKey) {
        e.preventDefault(); setShowRightSidebar(v => !v);
      } else if ((e.metaKey || e.ctrlKey) && e.key === "0") {
        e.preventDefault(); setShowLeftSidebar(false); setShowRightSidebar(false);
      } else if (e.key === "s" && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
        // Bug #10c: split at playhead. Don't fire when typing in inputs or while the clip editor owns the keyboard.
        const t = e.target;
        const inField = t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable);
        if (inField) return;
        if (document.querySelector(".ace-overlay")) return; // AudioClipEditor open → its own shortcuts
        e.preventDefault();
        handleCutRegionRef.current && handleCutRegionRef.current();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Follow Playhead: F toggles modes. Skip while typing or when the clip
  // editor owns the keyboard, matching the existing S-shortcut guard.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "f" && e.key !== "F") return;
      if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
      const t = e.target;
      const inField = t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable);
      if (inField) return;
      if (document.querySelector(".ace-overlay")) return;
      e.preventDefault();
      cycleFollowMode();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cycleFollowMode]);

  // Manual-scroll detection: if the user scrolls during playback (and it
  // wasn't a programmatic scroll we just made), disable follow until next Play.
  useEffect(() => {
    const el = arrangeScrollRef.current;
    if (!el) return;
    const onScroll = () => {
      if (!isPlaying) return;
      if (Date.now() - lastProgrammaticScrollRef.current < 100) return;
      userScrollOverrideRef.current = true;
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [isPlaying, followMode]);

  // Auto-scroll on currentTime changes. Page mode jumps the viewport when the
  // playhead reaches the right edge; smooth mode keeps it ~1/3 from the left.
  // Reads the playhead's absolute X from the DOM so it stays correct under any
  // zoom/bpm without lifting ArrangerView's internal zoom state.
  useEffect(() => {
    if (!isPlaying || followMode === "off") return;
    if (userScrollOverrideRef.current) return;
    const container = arrangeScrollRef.current;
    if (!container) return;
    if (document.querySelector(".arr-region.dragging")) return;
    const playheadEl = container.querySelector(".arr-playhead");
    if (!playheadEl) return;
    const leftPx = parseFloat(playheadEl.style.left) || 0;
    const playheadX = leftPx + container.scrollLeft;
    const viewportRight = container.scrollLeft + container.clientWidth;
    let nextScroll = null;
    if (followMode === "page") {
      if (playheadX > viewportRight - 50 || playheadX < container.scrollLeft) {
        nextScroll = Math.max(0, playheadX - 50);
      }
    } else if (followMode === "smooth") {
      nextScroll = Math.max(0, playheadX - container.clientWidth / 3);
    }
    if (nextScroll != null && Math.abs(nextScroll - container.scrollLeft) > 0.5) {
      lastProgrammaticScrollRef.current = Date.now();
      container.scrollLeft = nextScroll;
    }
  }, [currentTime, isPlaying, followMode]);

  // Bug #10c: handleCutRegion is defined later; use a ref so the effect (mounted once) reads the latest closure.
  const handleCutRegionRef = useRef(null);
  const [showFlexPitch, setShowFlexPitch] = useState(false);
  const [flexPitchBuffer, setFlexPitchBuffer] = useState(null);
  const [flexPitchTrack, setFlexPitchTrack] = useState(null);
  // Bug #9: AudioClipEditor modal state. { region, ti, ri } when open, else null.
  const [editingClip, setEditingClip] = useState(null);
  const [splitScreen, setSplitScreen] = useState(false);
  const [splitTopH, setSplitTopH] = useState(50);
  const [mixerHeightPx, setMixerHeightPx] = useState(450);
  const splitDragRef = useRef(false);
  const splitContainerRef = useRef(null);

  // Cubase-style Follow Playhead. 3 modes cycle off → page → smooth → off; the
  // active mode persists in localStorage. Manual user scrolls during playback
  // disable follow until the next Play press.
  const [followMode, setFollowMode] = useState(() => {
    const v = localStorage.getItem("spx_rs_follow_mode");
    return v === "off" || v === "page" || v === "smooth" ? v : "page";
  });
  const arrangeScrollRef = useRef(null);
  const userScrollOverrideRef = useRef(false);
  const lastProgrammaticScrollRef = useRef(0);
  const cycleFollowMode = useCallback(() => {
    setFollowMode(prev => {
      const next = prev === "off" ? "page" : prev === "page" ? "smooth" : "off";
      try { localStorage.setItem("spx_rs_follow_mode", next); } catch {}
      userScrollOverrideRef.current = false;
      return next;
    });
  }, []);
  const [projectName, setProjectName] = useState("Untitled Project");
  const [projectId, setProjectId] = useState(null);
  const [projects, setProjects] = useState([]);
  const [showProjectList, setShowProjectList] = useState(false);
  const [bpm, setBpm] = useState(120);
  const [timeSignature, setTimeSignature] = useState([4, 4]);
  const [countInBars, setCountInBars] = useState(1); // Bug #6: pre-roll length in bars (0/1/2/4).
  const [masterVolume, setMasterVolume] = useState(1.0);
  const [masterPan, setMasterPan] = useState(0);
  const [tracks, setTracks] = useState(Array.from({ length: 1 }, (_, i) => DEFAULT_TRACK(i)));
  const [trackMicModels, setTrackMicModels] = useState({});
  const [midiEnabled, setMidiEnabled] = useState(false);
  const [qwertyEnabled, setQwertyEnabled] = useState(false);
  const [qwertyOctave, setQwertyOctave] = useState(4);
  const [qwertyVelocity, setQwertyVelocity] = useState(100);
  const [qwertyLastNote, setQwertyLastNote] = useState(null);
  const [wamPlugins, setWamPlugins] = useState([]);
  const [analogSubview, setAnalogSubview] = useState("ampsim");
  const [trackConsoleChar, setTrackConsoleChar] = useState({});
  const [masterConsoleChar, setMasterConsoleChar] = useState("none");
  // Phase F4-A.7B: per-track and master live console params (named-key shape).
  // When a non-`none` console is selected, seed from CONSOLE_FACTORY_PARAMS;
  // user knob tweaks update this state AND ramp the live AudioParam via the
  // registered PluginInstance (`${trackId}:console` / `master:console`).
  const [trackConsoleParams, setTrackConsoleParams] = useState({}); // { [trackId]: paramsObj }
  const [masterConsoleParams, setMasterConsoleParams] = useState(null); // paramsObj | null
  // Which console panel is currently visible (per track-id or "master"). Closing
  // the panel does NOT change the dropdown selection — DSP keeps running.
  const [openConsolePanel, setOpenConsolePanel] = useState(null);
  // A/B compare slot: stores the "B" snapshot per scope so the user can flip
  // between two configurations of the same console.
  const [consoleABSlot, setConsoleABSlot] = useState({}); // { [scope]: paramsObj }
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
  const monitorSrcRef = useRef(null);
  const monitorDelayRef = useRef(null);
  const monitorStreamRef = useRef(null);
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
  const [showTrackTypeModal, setShowTrackTypeModal] = useState(false);
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
  // Bug #12 (Part 9b): send-destination picker state, mirrors insertPickerState
  // shape ({ trackIndex, x, y }). Picker shows every other track in the project
  // and lets the user route a post-fader send to it.
  const [sendPickerState, setSendPickerState] = useState(null);
  const [mixerUpperH, setMixerUpperH] = useState(180);
  const mixerUpperDragRef = useRef(false);
  const [openFxKey, setOpenFxKey] = useState(null);

  // ── Phase 3: Live plugin-instance registry ────────────────────────────
  // Map<`${trackId}:${pluginKey}`, PluginInstance>
  // Populated by buildFxChain after each handler creates its nodes.
  // Read by the plugin-window onChange handler so knob turns ramp the
  // already-running AudioParams instead of forcing a chain rebuild.
  const liveInstancesRef = useRef(new Map());
  const registerInstance = (trackId, pluginKey, instance) => {
    const key = `${trackId}:${pluginKey}`;
    const prev = liveInstancesRef.current.get(key);
    if (prev) { try { prev.dispose(); } catch (e) { /* noop */ } }
    liveInstancesRef.current.set(key, instance);
    console.warn("[REGISTER]", key, "instance stored");  // Phase F3 instrumentation — Bug #1
  };
  const getInstance = (trackId, pluginKey) =>
    liveInstancesRef.current.get(`${trackId}:${pluginKey}`);
  const disposeInstance = (trackId, pluginKey) => {
    // Dispose the exact (legacy/unscoped) key AND every "${base}:${scope}"
    // variant, so disabling an insert tears down all of monitor/bus/playback.
    // Anchored on ":" so pluginKey "hall" doesn't also drop "hallForgeS".
    const base = `${trackId}:${pluginKey}`;
    const scoped = `${base}:`;
    for (const k of Array.from(liveInstancesRef.current.keys())) {
      if (k === base || k.startsWith(scoped)) {
        const inst = liveInstancesRef.current.get(k);
        try { inst?.dispose(); } catch (e) { /* noop */ }
        liveInstancesRef.current.delete(k);
      }
    }
  };
  const disposeAllForTrack = (trackId) => {
    const prefix = `${trackId}:`;
    for (const k of Array.from(liveInstancesRef.current.keys())) {
      if (k.startsWith(prefix)) {
        const inst = liveInstancesRef.current.get(k);
        try { inst?.dispose(); } catch (e) { /* noop */ }
        liveInstancesRef.current.delete(k);
      }
    }
  };
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
  const [clipboardTrackSettings, setClipboardTrackSettings] = useState(null);
  const [channelCtxMenu, setChannelCtxMenu] = useState(null);
  // Phase 3 / Fix 1: insert-slot context menu — { x, y, trackIndex, fxKey, fxName }
  const [insertCtxMenu, setInsertCtxMenu] = useState(null);
  const [showTakeLanes, setShowTakeLanes] = useState(false);
  const [takeLanesTrackIndex, setTakeLanesTrackIndex] = useState(null);
  const [showSaveAsModal, setShowSaveAsModal] = useState(false);
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
  // Bug #4b-1: bpm captured by closure went stale once metronome/playCountIn started. Live ref + useEffect keep them in sync without re-creating the closure.
  const bpmRef = useRef(120);
  const timeSignatureRef = useRef([4, 4]);
  const metronomeOnRef = useRef(false);
  const timeRef = useRef(null);
  const canvasRefs = useRef([]);
  const inputAnalyserRef = useRef(null);
  const inputAnimRef = useRef(null);
  const recMonitorGainRef = useRef(null);
  const recInputSrcRef = useRef(null);
  const micSplitterRef = useRef(null);
  const micMergerRef = useRef(null);
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

  // Bug #4b-1: keep refs in sync so metronome/playCountIn closures read live values per tick.
  useEffect(() => { bpmRef.current = bpm; }, [bpm]);
  useEffect(() => { timeSignatureRef.current = timeSignature; }, [timeSignature]);
  useEffect(() => { metronomeOnRef.current = metronomeOn; }, [metronomeOn]);

  // ── Mixer upper height CSS var sync ──
  useEffect(() => {
    document.documentElement.style.setProperty('--mixer-upper-h', mixerUpperH + 'px');
  }, [mixerUpperH]);

  useEffect(() => {
    const syncScroll = (e) => {
      const src = e.target;
      if (!src.classList || !src.classList.contains('ch-upper')) return;
      const y = src.scrollTop;
      document.querySelectorAll('.ch-upper').forEach(el => {
        if (el !== src && el.scrollTop !== y) el.scrollTop = y;
      });
    };
    document.addEventListener('scroll', syncScroll, true);
    return () => document.removeEventListener('scroll', syncScroll, true);
  }, []);

  const handleMixerResizeStart = useCallback((e) => {
    e.preventDefault();
    mixerUpperDragRef.current = true;
    const startY = e.clientY;
    const startH = mixerUpperH;
    // Cubase-style clamp: fader section must stay fully visible
    // Fixed below mid-handle: ch-mid (~50) + ch-lower (~340: controls+fader+auto+name)
    const FIXED_BELOW = 390;
    // Fixed above ch-upper: colorbar(5) + header(26) + routing(40) = ~71
    const FIXED_ABOVE = 71;
    const MIN_UPPER = 40;   // just enough to see INSERTS + SENDS labels
    const onMove = (me) => {
      if (!mixerUpperDragRef.current) return;
      const delta = me.clientY - startY;
      // Max upper = pane height - fader section - header area
      const maxUpper = Math.max(MIN_UPPER + 1, mixerHeightPx - FIXED_BELOW - FIXED_ABOVE);
      const newH = Math.max(MIN_UPPER, Math.min(maxUpper, startH + delta));
      setMixerUpperH(newH);
    };
    const onUp = () => {
      mixerUpperDragRef.current = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [mixerUpperH, mixerHeightPx]);

  // ── Sync refs ──
  useEffect(() => { trackConsoleCharRef.current = trackConsoleChar; }, [trackConsoleChar]);
  useEffect(() => { masterConsoleCharRef.current = masterConsoleChar; }, [masterConsoleChar]);
  useEffect(() => { setWamPlugins(getInstalledWAMPlugins() || []); }, []);

  // ── Rebuild track graphs when their console board assignment changes ──
  useEffect(() => {
    if (!audioCtxRef.current) return;
    Object.keys(trackConsoleChar).forEach(trackId => {
      if (trackNodesRef.current.has(trackId)) rebuildTrackGraph(trackId);
    });
  }, [trackConsoleChar]);

  // ── Rebuild master bus when its console board assignment changes ──
  useEffect(() => {
    const ctx = audioCtxRef.current;
    if (!ctx || !masterGainRef.current || !masterPanRef.current) return;
    // Disconnect old master->pan path
    try { masterGainRef.current.disconnect(); } catch (_) {}
    if (masterConsoleOutRef.current) {
      try { masterConsoleOutRef.current.disconnect(); } catch (_) {}
    }
    // Rebuild console character on master bus
    const newConsoleOut = ctx.createGain();
    masterConsoleOutRef.current = newConsoleOut;
    applyConsoleCharacter(ctx, masterGainRef.current, newConsoleOut, masterConsoleChar || "none", { trackId: "master", params: masterConsoleParams || undefined });
    if (masterConsoleChar && masterConsoleChar !== "none") {
      newConsoleOut.connect(masterPanRef.current);
    } else {
      masterGainRef.current.connect(masterPanRef.current);
    }
  }, [masterConsoleChar, masterConsoleParams]);

  // ── Phase F4-A.7B: console-board selection w/ param seeding ──
  // Wraps setTrackConsoleChar/setMasterConsoleChar so picking a non-`none`
  // board ALSO seeds the live params slot from the factory, and picking
  // `none` clears the slot. The dropdown onChange handlers below call these
  // wrappers instead of the raw state setters.
  const selectTrackConsole = useCallback((trackId, boardId) => {
    setTrackConsoleChar(prev => ({ ...prev, [trackId]: boardId }));
    setTrackConsoleParams(prev => {
      if (!boardId || boardId === "none") {
        if (!(trackId in prev)) return prev;
        const next = { ...prev }; delete next[trackId]; return next;
      }
      const factory = CONSOLE_FACTORY_PARAMS[boardId];
      if (!factory) return prev;
      // Seed only if missing or board changed; preserve user tweaks across
      // re-selects of the SAME board (rare path, but matches user expectation).
      const existing = prev[trackId];
      if (existing && existing._board === boardId) return prev;
      return { ...prev, [trackId]: { ...factory, _board: boardId } };
    });
  }, []);

  const selectMasterConsole = useCallback((boardId) => {
    setMasterConsoleChar(boardId);
    setMasterConsoleParams(prev => {
      if (!boardId || boardId === "none") return null;
      const factory = CONSOLE_FACTORY_PARAMS[boardId];
      if (!factory) return prev;
      if (prev && prev._board === boardId) return prev;
      return { ...factory, _board: boardId };
    });
  }, []);

  // Update a single console param. Updates state AND ramps the live AudioParam
  // on the registered PluginInstance (key: `${trackId}:console` or `master:console`).
  // Part 1: fan a console param out to EVERY registered console node-set for a
  // track (keys "${trackId}:console", "${trackId}:console:monitor",
  // "${trackId}:console:playback"). Only one is in the audible path at a time
  // (playback for audio tracks, monitor for MIDI), but applying to all is
  // harmless — they are independent parallel graphs — and guarantees the
  // audible one receives the tweak regardless of which built last.
  const setConsoleParamForTrack = useCallback((trackId, name, value) => {
    const prefix = `${trackId}:console`;
    for (const [key, inst] of liveInstancesRef.current) {
      if (key.startsWith(prefix) && inst && typeof inst.setParam === "function") {
        try { inst.setParam(name, value); } catch (_e) { /* noop */ }
      }
    }
  }, []);

  // Native insert plugins have the SAME instance-key collision the console had:
  // buildFxChain runs from three builders (monitor/bus/playback), each
  // registering `${trackId}:${pluginKey}:${scope}`. Fan a param out to EVERY
  // registered scope for that plugin so the audible graph (playback for audio
  // tracks, monitor for MIDI) always receives the tweak, regardless of which
  // built last. Harmless on non-audible scopes — they are parallel graphs.
  const setEffectParamForTrack = useCallback((trackId, pluginKey, name, value) => {
    // Match the exact key (legacy/unscoped) OR any "${base}:${scope}" variant.
    // Anchored on the ":" boundary so e.g. pluginKey "hall" does not also hit
    // "hallForgeS"/"hallForgeL" instances on the same track.
    const base = `${trackId}:${pluginKey}`;
    const scoped = `${base}:`;
    for (const [key, inst] of liveInstancesRef.current) {
      if ((key === base || key.startsWith(scoped)) && inst && typeof inst.setParam === "function") {
        try { inst.setParam(name, value); } catch (_e) { /* noop */ }
      }
    }
  }, []);

  const updateTrackConsoleParam = useCallback((trackId, name, value) => {
    setTrackConsoleParams(prev => ({
      ...prev,
      [trackId]: { ...(prev[trackId] || {}), [name]: value },
    }));
    setConsoleParamForTrack(trackId, name, value);
  }, [setConsoleParamForTrack]);

  const updateMasterConsoleParam = useCallback((name, value) => {
    setMasterConsoleParams(prev => ({ ...(prev || {}), [name]: value }));
    const inst = liveInstancesRef.current.get(`master:console`);
    if (inst && typeof inst.setParam === "function") {
      try { inst.setParam(name, value); } catch (_e) { /* noop */ }
    }
  }, []);

  // Reset a console scope back to its factory baseline (clears user tweaks
  // for the currently-selected board). Both updates state and ramps live
  // AudioParams via setParam — no graph rebuild needed.
  const resetTrackConsole = useCallback((trackId) => {
    const boardId = trackConsoleChar[trackId];
    if (!boardId || boardId === "none") return;
    const factory = CONSOLE_FACTORY_PARAMS[boardId]; if (!factory) return;
    setTrackConsoleParams(prev => ({ ...prev, [trackId]: { ...factory, _board: boardId } }));
    Object.entries(factory).forEach(([k, v]) => setConsoleParamForTrack(trackId, k, v));
  }, [trackConsoleChar, setConsoleParamForTrack]);

  const resetMasterConsole = useCallback(() => {
    const boardId = masterConsoleChar;
    if (!boardId || boardId === "none") return;
    const factory = CONSOLE_FACTORY_PARAMS[boardId]; if (!factory) return;
    setMasterConsoleParams({ ...factory, _board: boardId });
    const inst = liveInstancesRef.current.get(`master:console`);
    if (inst && typeof inst.setParam === "function") {
      Object.entries(factory).forEach(([k, v]) => { try { inst.setParam(k, v); } catch (_e) {} });
    }
  }, [masterConsoleChar]);

  // ── Bus mute/solo propagation to audio ──
  useEffect(() => {
    if (!audioCtxRef.current) return;
    const hasSolo = tracks.some(t => t.solo);
    tracks.forEach(t => {
      const nodes = trackNodesRef.current.get(t.id);
      if (!nodes) return;
      const audible = !t.muted && (!hasSolo || t.solo);
      const targetGain = audible ? (t.volume ?? 1.0) : 0;
      if (nodes.fader) {
        try { nodes.fader.gain.setTargetAtTime(targetGain, audioCtxRef.current.currentTime, 0.01); } catch (_) {}
      }
    });
  }, [tracks]);

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
  // Bug #11-2: pre-permission enumerateDevices returns blank labels and stale
  // deviceIds. Best-effort enumerate now, then refresh on `devicechange`
  // (browsers emit it after the first getUserMedia grant) so the picker shows
  // real labels/IDs.
  useEffect(() => {
    const md = navigator.mediaDevices;
    if (!md) return;
    const refresh = () => md.enumerateDevices()
      .then(d => setInputDevices(d.filter(x => x.kind === "audioinput")))
      .catch(console.error);
    refresh();
    md.addEventListener?.("devicechange", refresh);
    return () => {
      md.removeEventListener?.("devicechange", refresh);
      stopEverything();
      if (audioCtxRef.current) audioCtxRef.current.close();
    };
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

  // ── Phase F4-A.7B: applyConsoleCharacter — PluginInstance shape ──
  // Builds the 5-stage console chain (HPF → tanh sat → low-shelf → high-shelf →
  // tanh sat → output gain) and connects inputNode → chain → outputNode.
  //
  // Returns the legacy array-of-internal-nodes (for the existing disconnect
  // bookkeeping in ensureTrackGraph / ensureBusGraph), and ALSO registers a
  // PluginInstance under `${trackId}:console` (or "master:console") so the
  // ConsolePanel UI can ramp live AudioParams without rebuilding the graph.
  //
  // opts (all optional):
  //   params       — named-param override ({ hpfFreq, hpfQ, satInDrive,
  //                  satInAsym, lowFreq, lowGain, highFreq, highGain,
  //                  satOutDrive, satOutAsym, outputGain }). When supplied,
  //                  these REPLACE the factory baseline for boardId. Used for
  //                  applying user-tweaked state on graph rebuild.
  //   trackId      — register a PluginInstance under this key. "master" for
  //                  master bus. When omitted, no instance is registered
  //                  (legacy callers that don't need live tweak access).
  const applyConsoleCharacter = (ctx, inputNode, outputNode, boardId, opts = {}) => {
    if (!boardId || boardId === "none") { inputNode.connect(outputNode); return [inputNode]; }
    const factory = CONSOLE_FACTORY_PARAMS[boardId];
    if (!factory) { inputNode.connect(outputNode); return [inputNode]; }
    const p = { ...factory, ...(opts.params || {}) };

    const inputHp  = ctx.createBiquadFilter();
    const inputSat = ctx.createWaveShaper();
    const eqLo     = ctx.createBiquadFilter();
    const eqHi     = ctx.createBiquadFilter();
    const outputSat = ctx.createWaveShaper();
    const outputGain = ctx.createGain();
    inputHp.type = "highpass"; inputHp.frequency.value = p.hpfFreq; inputHp.Q.value = p.hpfQ;
    buildSatCurve(inputSat, p.satInDrive, !!p.satInAsym);
    eqLo.type = "lowshelf";  eqLo.frequency.value = p.lowFreq;  eqLo.gain.value = p.lowGain;
    eqHi.type = "highshelf"; eqHi.frequency.value = p.highFreq; eqHi.gain.value = p.highGain;
    buildSatCurve(outputSat, p.satOutDrive, !!p.satOutAsym);
    outputGain.gain.value = p.outputGain;
    inputNode.connect(inputHp); inputHp.connect(inputSat); inputSat.connect(eqLo);
    eqLo.connect(eqHi); eqHi.connect(outputSat); outputSat.connect(outputGain);
    outputGain.connect(outputNode);

    // Register a live PluginInstance for the ConsolePanel UI to ramp.
    if (opts.trackId) {
      const TAU_C = 0.01;
      const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
      const safeNum = (v, fb) => (Number.isFinite(v) ? v : fb);
      // Part 2: parallel analyser TAP off the console output so the ConsolePanel
      // VU/LED meter reflects post-console level. This is a branch (outputGain →
      // analyser), NOT inserted in series — it does not alter the signal that
      // reaches outputNode.
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048; analyser.smoothingTimeConstant = 0.8;
      outputGain.connect(analyser);
      const inst = {
        inputNode: inputHp,
        outputNode,
        analyser,
        setParam(name, value) {
          const t = ctx.currentTime;
          const v = safeNum(value, 0);
          switch (name) {
            case "hpfFreq":     inputHp.frequency.setTargetAtTime(clamp(v, 5, 500), t, TAU_C); break;
            case "hpfQ":        inputHp.Q.setTargetAtTime(clamp(v, 0.1, 2), t, TAU_C); break;
            case "satInDrive":  buildSatCurve(inputSat, clamp(v, 0, 3), !!p.satInAsym); break;
            case "satInAsym":   p.satInAsym = !!v; buildSatCurve(inputSat, p.satInDrive, !!v); break;
            case "lowFreq":     eqLo.frequency.setTargetAtTime(clamp(v, 40, 600), t, TAU_C); break;
            case "lowGain":     eqLo.gain.setTargetAtTime(clamp(v, -9, 9), t, TAU_C); break;
            case "highFreq":    eqHi.frequency.setTargetAtTime(clamp(v, 3000, 18000), t, TAU_C); break;
            case "highGain":    eqHi.gain.setTargetAtTime(clamp(v, -9, 9), t, TAU_C); break;
            case "satOutDrive": buildSatCurve(outputSat, clamp(v, 0, 3), !!p.satOutAsym); break;
            case "satOutAsym":  p.satOutAsym = !!v; buildSatCurve(outputSat, p.satOutDrive, !!v); break;
            case "outputGain":  outputGain.gain.setTargetAtTime(clamp(v, 0.5, 1.2), t, TAU_C); break;
            default: break;
          }
          // Keep the cached `p` mirror up to date for asym-toggle's drive read.
          if (name === "satInDrive" || name === "satOutDrive" ||
              name === "hpfFreq" || name === "hpfQ" ||
              name === "lowFreq" || name === "lowGain" ||
              name === "highFreq" || name === "highGain" ||
              name === "outputGain") {
            p[name] = v;
          }
        },
        dispose() {
          for (const n of [inputHp, inputSat, eqLo, eqHi, outputSat, outputGain, analyser]) {
            try { n.disconnect(); } catch (_e) { /* noop */ }
          }
        },
      };
      // Part 1: scope-qualified key (default "console"). Distinct scopes
      // (e.g. "console:monitor" vs "console:playback") let the per-track
      // monitor and playback consoles coexist instead of disposing each
      // other; the panel fans setParam out to every "${trackId}:console*".
      registerInstance(opts.trackId, opts.consoleScope || "console", inst);
    }

    return [inputHp, inputSat, eqLo, eqHi, outputSat, outputGain];
  };

  const buildFxChain = (ctx, track, scope) => {
    const nodes = []; const fx = track.effects;
    // Defensive AudioParam setters: clamp NaN/undefined/out-of-range values to
    // safe defaults so plugins don't crash the audio graph with non-finite
    // AudioParam errors. Wrap every direct .value assignment with these.
    const safe = (v, fallback, min, max) => {
      if (!Number.isFinite(v)) return fallback;
      if (min !== undefined && v < min) return min;
      if (max !== undefined && v > max) return max;
      return v;
    };
    const setFreq        = (param, v) => { param.value = safe(v, 1000, 20, 20000); };
    const setQ           = (param, v) => { param.value = safe(v, 1, 0.0001, 1000); };
    const setGainDb      = (param, db) => { param.value = safe(db, 0, -60, 24); };
    const setGainLinear  = (param, v) => { param.value = safe(v, 1, 0, 4); };
    const setTime        = (param, v) => { param.value = safe(v, 0, 0, 5); };
    const setMix         = (param, v) => { param.value = safe(v, 0, 0, 1); };
    const setDetune      = (param, v) => { param.value = safe(v, 0, -1200, 1200); };
    const setCompThresh  = (param, v) => { param.value = safe(v, -20, -100, 0); };
    const setCompRatio   = (param, v) => { param.value = safe(v, 4, 1, 20); };
    const setCompAttack  = (param, v) => { param.value = safe(v, 0.01, 0, 1); };
    const setCompRelease = (param, v) => { param.value = safe(v, 0.1, 0, 1); };
    const setCompKnee    = (param, v) => { param.value = safe(v, 6, 0, 40); };
    const setPan         = (param, v) => { param.value = safe(v, 0, -1, 1); };

    // Reverb/delay UIs ship mix knobs in two flavors: percent (0–100) and
    // fraction (0–1). Normalize so factories don't have to know which:
    // values > 1 are treated as percent and divided. Used for build-time
    // initialization (returns the normalized number) and for setParam ramps
    // on the wet-gain (writes the normalized value to the AudioParam).
    const normalizeMix = (v, fallback = 0.25) => {
      if (!Number.isFinite(v)) return fallback;
      const n = v > 1 ? v / 100 : v;
      return n < 0 ? 0 : (n > 1 ? 1 : n);
    };
    const setReverbMix = (param, v) => {
      // 10ms ramp matches the standard TAU defined below; literal here so this
      // helper is callable from the helpers block before TAU is in scope.
      param.setTargetAtTime(normalizeMix(v, 0.25), ctx.currentTime, 0.01);
    };

    // ── Phase 3 PluginInstance contract ─────────────────────────────────
    // Every SPX-native handler should produce a PluginInstance:
    //   {
    //     inputNode:  AudioNode,                    // chain entry
    //     outputNode: AudioNode,                    // chain exit
    //     setParam(name: string, value: number),    // ramp live AudioParam(s)
    //     dispose(): void                           // disconnect + stop osc/lfos
    //   }
    // The instance is registered into liveInstancesRef under
    // `${track.id}:${pluginKey}` so the plugin-window onChange can route
    // knob turns straight to AudioParam.setTargetAtTime — no chain rebuild.
    //
    // setParam invariants:
    //   • Use safe() helpers so NaN/undefined/out-of-range can't crash audio.
    //   • Default tau = 0.01 (10ms). LFO `rate`/`frequency` use 0.05 to
    //     avoid audible pitch sweep on rate-knob drags.
    //   • setParam(unknownKey, _) silently no-ops via `default:`.
    //   • For WaveShaper.curve / Convolver.buffer — rebuild & assign
    //     synchronously (cheap; click-free for waveshaper, audible click on
    //     IR swap is accepted, mirrors PluginHost ReverbPlugin behavior).
    //
    // Topology rule for "always-on" filters that the legacy code added
    // conditionally (e.g. ironBand HPF only if hpf > 20): the factory must
    // build them ALL at neutral pass-through values so live param ramps
    // never need to add/remove nodes mid-stream.
    //
    // ── Plugin factories ────────────────────────────────────────────────
    const TAU = 0.01;
    const TAU_LFO = 0.05;

    // F4-C-FIX: audible-processing verification. After a plugin installs
    // successfully, attach two analyser sinks (one on inputNode, one on
    // outputNode) and 800 ms later compare RMS + waveform diff. If output ≈
    // input AND signal is present, the plugin is a silent passthrough — log
    // a warning so the user sees which factories install but don't process.
    // Analysers are sinks (no audio impact). Skipped if input is below -50 dBFS
    // (no signal yet, e.g. live-mixer build before Play). Self-cleans 800 ms in.
    const verifyPluginProcessesAudio = (inst, pluginKey) => {
      if (!inst || !inst.inputNode || !inst.outputNode) return;
      let inAn, outAn;
      try {
        inAn = ctx.createAnalyser(); inAn.fftSize = 256;
        outAn = ctx.createAnalyser(); outAn.fftSize = 256;
        inst.inputNode.connect(inAn);
        inst.outputNode.connect(outAn);
      } catch (e) {
        console.error(`[F4-C-FIX] verifyPluginProcessesAudio: tap-attach failed for "${pluginKey}":`, e);
        return;
      }
      setTimeout(() => {
        try {
          const inBuf = new Float32Array(inAn.fftSize);
          const outBuf = new Float32Array(outAn.fftSize);
          inAn.getFloatTimeDomainData(inBuf);
          outAn.getFloatTimeDomainData(outBuf);
          let inAcc = 0, outAcc = 0, diffAcc = 0;
          for (let i = 0; i < inBuf.length; i++) {
            inAcc += inBuf[i] * inBuf[i];
            outAcc += outBuf[i] * outBuf[i];
            diffAcc += Math.abs(inBuf[i] - outBuf[i]);
          }
          const inRms = Math.sqrt(inAcc / inBuf.length);
          const outRms = Math.sqrt(outAcc / outBuf.length);
          const avgDiff = diffAcc / inBuf.length;
          const inDb = 20 * Math.log10(Math.max(1e-6, inRms));
          const outDb = 20 * Math.log10(Math.max(1e-6, outRms));
          if (inDb < -50) return; // no signal at install-time — skip rather than log a false positive
          const dbDelta = Math.abs(outDb - inDb);
          if (avgDiff < 0.001 && dbDelta < 0.5) {
            console.warn(
              `[F4-C-FIX] PASSTHROUGH WARN "${pluginKey}" — output ≈ input. ` +
              `inDb=${inDb.toFixed(1)} outDb=${outDb.toFixed(1)} diff=${avgDiff.toFixed(4)}. ` +
              `Plugin may not be processing (mix=0, internal disconnect, or factory bug).`
            );
          } else {
            console.log(
              `[F4-C-FIX] OK "${pluginKey}" — inDb=${inDb.toFixed(1)} outDb=${outDb.toFixed(1)} diff=${avgDiff.toFixed(4)}`
            );
          }
        } finally {
          try { inAn.disconnect(); } catch (_e) { /* noop */ }
          try { outAn.disconnect(); } catch (_e) { /* noop */ }
        }
      }, 800);
    };

    // Install helper: invoke factory, register instance, push compound node.
    // Centralizes the registry+chain wiring so each handler stays one-liner-ish.
    // F4-C-FIX: wrap factory + validate return shape so a single bad plugin
    // doesn't take down the whole chain build, and the failing plugin name
    // shows up in the console for surgical follow-up.
    const install = (pluginKey, factory) => {
      let inst;
      try {
        inst = factory(fx[pluginKey] || {});
      } catch (e) {
        console.error(
          `[F4-C-FIX] factory threw for "${pluginKey}" on track ${track.id}:`,
          e?.message || e,
          "\nparams:", fx[pluginKey] || {},
          "\nstack:", e?.stack || "(no stack)"
        );
        return;
      }
      if (!inst || !inst.inputNode || !inst.outputNode) {
        console.error(
          `[F4-C-FIX] factory returned invalid instance for "${pluginKey}" on track ${track.id}:`,
          "\nreturned:", inst,
          "\nparams:", fx[pluginKey] || {},
          "\nexpected: { inputNode, outputNode, setParam, dispose }"
        );
        return;
      }
      // Scope-qualified key (default bare pluginKey). Distinct scopes
      // (monitor/bus/playback) let the per-track graphs coexist instead of
      // disposing each other; the UI fans setParam out to every
      // "${trackId}:${pluginKey}*" via setEffectParamForTrack.
      registerInstance(track.id, scope ? `${pluginKey}:${scope}` : pluginKey, inst);
      nodes.push({ inputNode: inst.inputNode, outputNode: inst.outputNode });
      verifyPluginProcessesAudio(inst, pluginKey);
    };
    const disposeNodes = (...ns) => { for (const n of ns) { try { n?.disconnect(); } catch (e) { /* noop */ } } };
    // Stop oscillators safely (LFOs created with .start() must be .stop()'d)
    const stopOscs = (...oscs) => { for (const o of oscs) { try { o?.stop(); } catch (e) { /* noop */ } try { o?.disconnect(); } catch (e) { /* noop */ } } };

    // Passthrough factory for meter-only / placeholder plugins.
    const makePassthrough = () => {
      const g = ctx.createGain(); setGainLinear(g.gain, 1);
      return { inputNode: g, outputNode: g, setParam() {}, dispose() { disposeNodes(g); } };
    };

    // Build a tanh-saturation curve. driveAmt 0 → linear identity, 1 → heavy.
    const makeTanhCurve = (driveAmt, N = 2048) => {
      const c = new Float32Array(N);
      const k = 1 + safe(driveAmt, 0, 0, 4) * 5;
      for (let i = 0; i < N; i++) { const x = (i*2)/N - 1; c[i] = Math.tanh(x * k); }
      return c;
    };
    // Bit-crusher quantization curve. bits 16+ → near-identity, 1 → harsh.
    const makeBitcrushCurve = (bits, N = 4096) => {
      const c = new Float32Array(N); const steps = Math.pow(2, safe(bits, 8, 1, 24));
      for (let i = 0; i < N; i++) { const x = (i*2)/N - 1; c[i] = Math.round(x * steps) / steps; }
      return c;
    };
    // Identity curve y=x — used as the "off" state for WaveShapers when amount=0.
    const makeIdentityCurve = (N = 1024) => {
      const c = new Float32Array(N);
      for (let i = 0; i < N; i++) c[i] = (i*2)/N - 1;
      return c;
    };

    // ironBand — 4-band parametric EQ with always-on HPF/LPF/input-trim.
    // Topology fixed: inputGain → HPF → low → lowMid → hiMid → hi → LPF.
    // Off-state: HPF=20Hz, LPF=20kHz, gains=0dB, inputGain=0dB (unity).
    const makeIronBand = (p) => {
      const ig = ctx.createGain();
      setGainLinear(ig.gain, Math.pow(10, (p.inputGain || 0) / 20));
      const hpf = ctx.createBiquadFilter(); hpf.type = "highpass";
      setFreq(hpf.frequency, (p.hpf || 0) > 20 ? p.hpf : 20); setQ(hpf.Q, 0.7);
      const low    = ctx.createBiquadFilter(); low.type    = "peaking";
      setFreq(low.frequency,    p.lowFreq    || 100);  setQ(low.Q, 1);    setGainDb(low.gain,    p.lowGain    || 0);
      const lowMid = ctx.createBiquadFilter(); lowMid.type = "peaking";
      setFreq(lowMid.frequency, p.lowMidFreq || 500);  setQ(lowMid.Q, 1); setGainDb(lowMid.gain, p.lowMidGain || 0);
      const hiMid  = ctx.createBiquadFilter(); hiMid.type  = "peaking";
      setFreq(hiMid.frequency,  p.hiMidFreq  || 2500); setQ(hiMid.Q, 1);  setGainDb(hiMid.gain,  p.hiMidGain  || 0);
      const hi     = ctx.createBiquadFilter(); hi.type     = "peaking";
      setFreq(hi.frequency,     p.hiFreq     || 8000); setQ(hi.Q, 1);     setGainDb(hi.gain,     p.hiGain     || 0);
      const lpf = ctx.createBiquadFilter(); lpf.type = "lowpass";
      setFreq(lpf.frequency, (p.lpf ?? 20000) < 20000 ? p.lpf : 20000); setQ(lpf.Q, 0.7);
      ig.connect(hpf); hpf.connect(low); low.connect(lowMid); lowMid.connect(hiMid); hiMid.connect(hi); hi.connect(lpf);
      return {
        inputNode: ig, outputNode: lpf,
        setParam(name, value) {
          const t = ctx.currentTime;
          switch (name) {
            case "inputGain":  ig.gain.setTargetAtTime(safe(Math.pow(10, safe(value, 0, -60, 24) / 20), 1, 0, 4), t, TAU); break;
            case "hpf":        hpf.frequency.setTargetAtTime(safe((value || 0) > 20 ? value : 20, 20, 20, 20000), t, TAU); break;
            case "lpf":        lpf.frequency.setTargetAtTime(safe((value ?? 20000) < 20000 ? value : 20000, 20000, 20, 20000), t, TAU); break;
            case "lowFreq":    low.frequency.setTargetAtTime(safe(value, 100, 20, 20000), t, TAU); break;
            case "lowGain":    low.gain.setTargetAtTime(safe(value, 0, -60, 24), t, TAU); break;
            case "lowMidFreq": lowMid.frequency.setTargetAtTime(safe(value, 500, 20, 20000), t, TAU); break;
            case "lowMidGain": lowMid.gain.setTargetAtTime(safe(value, 0, -60, 24), t, TAU); break;
            case "hiMidFreq":  hiMid.frequency.setTargetAtTime(safe(value, 2500, 20, 20000), t, TAU); break;
            case "hiMidGain":  hiMid.gain.setTargetAtTime(safe(value, 0, -60, 24), t, TAU); break;
            case "hiFreq":     hi.frequency.setTargetAtTime(safe(value, 8000, 20, 20000), t, TAU); break;
            case "hiGain":     hi.gain.setTargetAtTime(safe(value, 0, -60, 24), t, TAU); break;
            default: break;  // enabled toggle / unknown: no-op (chain rebuild handles enable/disable)
          }
        },
        dispose() {
          for (const n of [ig, hpf, low, lowMid, hiMid, hi, lpf]) {
            try { n.disconnect(); } catch (e) { /* noop */ }
          }
        },
      };
    };

    if (fx.eq?.enabled) install("eq", (p) => {
      const lo = ctx.createBiquadFilter(); lo.type = "lowshelf";  setFreq(lo.frequency, 320);          setGainDb(lo.gain, p.lowGain);
      const mi = ctx.createBiquadFilter(); mi.type = "peaking";   setFreq(mi.frequency, p.midFreq);    setQ(mi.Q, 1.5); setGainDb(mi.gain, p.midGain);
      const hi = ctx.createBiquadFilter(); hi.type = "highshelf"; setFreq(hi.frequency, 3200);         setGainDb(hi.gain, p.highGain);
      lo.connect(mi); mi.connect(hi);
      return {
        inputNode: lo, outputNode: hi,
        setParam(n, v) { const t = ctx.currentTime; switch (n) {
          case "lowGain":  lo.gain.setTargetAtTime(safe(v, 0, -60, 24), t, TAU); break;
          case "midFreq":  mi.frequency.setTargetAtTime(safe(v, 1000, 20, 20000), t, TAU); break;
          case "midGain":  mi.gain.setTargetAtTime(safe(v, 0, -60, 24), t, TAU); break;
          case "highGain": hi.gain.setTargetAtTime(safe(v, 0, -60, 24), t, TAU); break;
          default: break;
        } },
        dispose() { disposeNodes(lo, mi, hi); },
      };
    });
    if (fx.filter?.enabled) install("filter", (p) => {
      // BiquadFilter.type is a string, not an AudioParam — type changes require
      // node swap (not real-time). Frequency and Q ramp normally.
      const f = ctx.createBiquadFilter(); f.type = p.type || "lowpass";
      setFreq(f.frequency, p.frequency); setQ(f.Q, p.Q);
      return {
        inputNode: f, outputNode: f,
        setParam(n, v) { const t = ctx.currentTime; switch (n) {
          case "frequency": f.frequency.setTargetAtTime(safe(v, 1000, 20, 20000), t, TAU); break;
          case "Q":         f.Q.setTargetAtTime(safe(v, 1, 0.0001, 1000), t, TAU); break;
          case "type":      try { f.type = v || "lowpass"; } catch (e) { /* invalid type */ } break;
          default: break;
        } },
        dispose() { disposeNodes(f); },
      };
    });
    if (fx.compressor?.enabled) install("compressor", (p) => {
      const c = ctx.createDynamicsCompressor();
      setCompThresh(c.threshold, p.threshold); setCompRatio(c.ratio, p.ratio);
      setCompAttack(c.attack, p.attack); setCompRelease(c.release, p.release);
      return {
        inputNode: c, outputNode: c,
        setParam(n, v) { const t = ctx.currentTime; switch (n) {
          case "threshold": c.threshold.setTargetAtTime(safe(v, -20, -100, 0), t, TAU); break;
          case "ratio":     c.ratio.setTargetAtTime(safe(v, 4, 1, 20), t, TAU); break;
          case "attack":    c.attack.setTargetAtTime(safe(v, 0.01, 0, 1), t, TAU); break;
          case "release":   c.release.setTargetAtTime(safe(v, 0.1, 0, 1), t, TAU); break;
          default: break;
        } },
        dispose() { disposeNodes(c); },
        meters: { comp: c },
      };
    });
    if (fx.distortion?.enabled) install("distortion", (p) => {
      const ws = ctx.createWaveShaper(); ws.oversample = "4x";
      const buildCurve = (amt) => {
        const N = 4096; const c = new Float32Array(N);
        const a = safe(amt, 0, 0, 100);
        if (a <= 0) { for (let i = 0; i < N; i++) c[i] = (i*2)/N - 1; return c; }
        for (let i = 0; i < N; i++) { const x = (i*2)/N - 1; c[i] = ((3 + a) * x * 20 * (Math.PI / 180)) / (Math.PI + a * Math.abs(x)); }
        return c;
      };
      ws.curve = buildCurve(p.amount || 0);
      return {
        inputNode: ws, outputNode: ws,
        setParam(n, v) { if (n === "amount") ws.curve = buildCurve(v); },
        dispose() { disposeNodes(ws); },
      };
    });
    if (fx.limiter?.enabled) install("limiter", (p) => {
      const lim = ctx.createDynamicsCompressor();
      setCompThresh(lim.threshold, p.threshold); setCompKnee(lim.knee, p.knee);
      setCompRatio(lim.ratio, p.ratio); setCompAttack(lim.attack, p.attack); setCompRelease(lim.release, p.release);
      return {
        inputNode: lim, outputNode: lim,
        setParam(n, v) { const t = ctx.currentTime; switch (n) {
          case "threshold": lim.threshold.setTargetAtTime(safe(v, -1, -100, 0), t, TAU); break;
          case "knee":      lim.knee.setTargetAtTime(safe(v, 0, 0, 40), t, TAU); break;
          case "ratio":     lim.ratio.setTargetAtTime(safe(v, 20, 1, 20), t, TAU); break;
          case "attack":    lim.attack.setTargetAtTime(safe(v, 0.001, 0, 1), t, TAU); break;
          case "release":   lim.release.setTargetAtTime(safe(v, 0.01, 0, 1), t, TAU); break;
          default: break;
        } },
        dispose() { disposeNodes(lim); },
      };
    });
    if (fx.gate?.enabled) install("gate", (p) => {
      // Approximated with DynamicsCompressor at ratio=20, knee=0 — closest the
      // built-in node gets to a noise gate. ratio/knee aren't user-facing here.
      const gt = ctx.createDynamicsCompressor();
      setCompThresh(gt.threshold, p.threshold); setCompRatio(gt.ratio, 20); setCompKnee(gt.knee, 0);
      setCompAttack(gt.attack, p.attack); setCompRelease(gt.release, p.release);
      return {
        inputNode: gt, outputNode: gt,
        setParam(n, v) { const t = ctx.currentTime; switch (n) {
          case "threshold": gt.threshold.setTargetAtTime(safe(v, -40, -100, 0), t, TAU); break;
          case "attack":    gt.attack.setTargetAtTime(safe(v, 0.001, 0, 1), t, TAU); break;
          case "release":   gt.release.setTargetAtTime(safe(v, 0.1, 0, 1), t, TAU); break;
          default: break;
        } },
        dispose() { disposeNodes(gt); },
      };
    });
    if (fx.deesser?.enabled) install("deesser", (p) => {
      // Single peaking notch at sibilance band; "threshold" repurposed as
      // notch depth (negative dB).
      const bp = ctx.createBiquadFilter(); bp.type = "peaking";
      setFreq(bp.frequency, p.frequency); setQ(bp.Q, 4); setGainDb(bp.gain, -Math.abs(p.threshold || 6));
      return {
        inputNode: bp, outputNode: bp,
        setParam(n, v) { const t = ctx.currentTime; switch (n) {
          case "frequency": bp.frequency.setTargetAtTime(safe(v, 7000, 20, 20000), t, TAU); break;
          case "threshold": bp.gain.setTargetAtTime(safe(-Math.abs(v ?? 6), -6, -60, 0), t, TAU); break;
          default: break;
        } },
        dispose() { disposeNodes(bp); },
      };
    });
    if (fx.chorus?.enabled) install("chorus", (p) => {
      // Delay center modulated by LFO. depth controls both delay center and LFO swing.
      const cd = ctx.createDelay(0.05); setTime(cd.delayTime, p.depth || 0.005);
      const lfo = ctx.createOscillator(); const lfoG = ctx.createGain();
      setFreq(lfo.frequency, p.rate || 1.5); setGainLinear(lfoG.gain, (p.depth || 0.005) * 0.5);
      lfo.connect(lfoG); lfoG.connect(cd.delayTime); lfo.start();
      return {
        inputNode: cd, outputNode: cd,
        setParam(n, v) { const t = ctx.currentTime; switch (n) {
          case "rate":  lfo.frequency.setTargetAtTime(safe(v, 1.5, 0, 20), t, TAU_LFO); break;
          case "depth": cd.delayTime.setTargetAtTime(safe(v, 0.005, 0, 0.05), t, TAU);
                        lfoG.gain.setTargetAtTime(safe(safe(v, 0.005, 0, 0.05) * 0.5, 0.0025, 0, 4), t, TAU); break;
          default: break;
        } },
        dispose() { stopOscs(lfo); disposeNodes(cd, lfoG); },
      };
    });
    if (fx.flanger?.enabled) install("flanger", (p) => {
      const fd = ctx.createDelay(0.02); setTime(fd.delayTime, p.depth || 0.003);
      const lfo = ctx.createOscillator(); const lfoG = ctx.createGain();
      setFreq(lfo.frequency, p.rate || 0.5); setGainLinear(lfoG.gain, (p.depth || 0.003) * 0.5);
      lfo.connect(lfoG); lfoG.connect(fd.delayTime); lfo.start();
      return {
        inputNode: fd, outputNode: fd,
        setParam(n, v) { const t = ctx.currentTime; switch (n) {
          case "rate":  lfo.frequency.setTargetAtTime(safe(v, 0.5, 0, 20), t, TAU_LFO); break;
          case "depth": fd.delayTime.setTargetAtTime(safe(v, 0.003, 0, 0.02), t, TAU);
                        lfoG.gain.setTargetAtTime(safe(safe(v, 0.003, 0, 0.02) * 0.5, 0.0015, 0, 4), t, TAU); break;
          default: break;
        } },
        dispose() { stopOscs(lfo); disposeNodes(fd, lfoG); },
      };
    });
    if (fx.phaser?.enabled) install("phaser", (p) => {
      // Always build a fixed 8-stage allpass cascade so live changes to the
      // `stages` knob are bypassed cosmetically — extra stages over user
      // selection are zeroed via Q=0.0001 (negligible). Real-time stage count
      // would require chain rebuild.
      const MAX_STAGES = 8;
      const stages = Math.min(MAX_STAGES, p.stages || 4);
      const baseFreq = p.baseFreq || 350;
      const Qval = p.Q || 5;
      const filters = [];
      for (let s = 0; s < MAX_STAGES; s++) {
        const ap = ctx.createBiquadFilter(); ap.type = "allpass";
        setFreq(ap.frequency, baseFreq * (1 + s * 0.5));
        setQ(ap.Q, s < stages ? Qval : 0.0001);
        filters.push(ap);
      }
      let prev = filters[0]; for (let i = 1; i < filters.length; i++) { prev.connect(filters[i]); prev = filters[i]; }
      let curStages = stages, curBase = baseFreq, curQ = Qval;
      const applyStages = () => {
        const t = ctx.currentTime;
        for (let s = 0; s < MAX_STAGES; s++) {
          filters[s].frequency.setTargetAtTime(safe(curBase * (1 + s * 0.5), 350, 20, 20000), t, TAU);
          filters[s].Q.setTargetAtTime(safe(s < curStages ? curQ : 0.0001, 1, 0.0001, 1000), t, TAU);
        }
      };
      return {
        inputNode: filters[0], outputNode: filters[MAX_STAGES - 1],
        setParam(n, v) { switch (n) {
          case "stages":   curStages = Math.min(MAX_STAGES, Math.max(1, Math.floor(safe(v, 4, 1, MAX_STAGES)))); applyStages(); break;
          case "baseFreq": curBase = safe(v, 350, 20, 20000); applyStages(); break;
          case "Q":        curQ = safe(v, 5, 0.0001, 1000); applyStages(); break;
          default: break;
        } },
        dispose() { disposeNodes(...filters); },
      };
    });
    if (fx.tremolo?.enabled) install("tremolo", (p) => {
      const tGain = ctx.createGain(); setGainLinear(tGain.gain, 1 - (p.depth || 0.5) * 0.5);
      const lfo = ctx.createOscillator(); const lfoG = ctx.createGain();
      setFreq(lfo.frequency, p.rate || 4); setGainLinear(lfoG.gain, (p.depth || 0.5) * 0.5);
      lfo.connect(lfoG); lfoG.connect(tGain.gain); lfo.start();
      return {
        inputNode: tGain, outputNode: tGain,
        setParam(n, v) { const t = ctx.currentTime; switch (n) {
          case "rate":  lfo.frequency.setTargetAtTime(safe(v, 4, 0, 20), t, TAU_LFO); break;
          case "depth": tGain.gain.setTargetAtTime(safe(1 - safe(v, 0.5, 0, 1) * 0.5, 0.75, 0, 4), t, TAU);
                        lfoG.gain.setTargetAtTime(safe(safe(v, 0.5, 0, 1) * 0.5, 0.25, 0, 4), t, TAU); break;
          default: break;
        } },
        dispose() { stopOscs(lfo); disposeNodes(tGain, lfoG); },
      };
    });
    if (fx.bitcrusher?.enabled) install("bitcrusher", (p) => {
      const ws = ctx.createWaveShaper();
      ws.curve = makeBitcrushCurve(p.bits || 8);
      return {
        inputNode: ws, outputNode: ws,
        setParam(n, v) { if (n === "bits") ws.curve = makeBitcrushCurve(v); },
        dispose() { disposeNodes(ws); },
      };
    });
    if (fx.exciter?.enabled) install("exciter", (p) => {
      const hp = ctx.createBiquadFilter(); hp.type = "highpass"; setFreq(hp.frequency, p.frequency || 3000);
      const ws = ctx.createWaveShaper();
      const buildCurve = (amt) => {
        const N = 2048; const c = new Float32Array(N); const a = safe(amt, 0, 0, 100) / 100;
        for (let i = 0; i < N; i++) { const x = (i*2)/N - 1; c[i] = x + a * Math.sin(x * Math.PI); }
        return c;
      };
      ws.curve = buildCurve(p.amount || 0);
      hp.connect(ws);
      return {
        inputNode: hp, outputNode: ws,
        setParam(n, v) { const t = ctx.currentTime; switch (n) {
          case "frequency": hp.frequency.setTargetAtTime(safe(v, 3000, 20, 20000), t, TAU); break;
          case "amount":    ws.curve = buildCurve(v); break;
          default: break;
        } },
        dispose() { disposeNodes(hp, ws); },
      };
    });
    if (fx.tapeSaturation?.enabled) install("tapeSaturation", (p) => {
      const ws = ctx.createWaveShaper(); ws.oversample = "4x";
      const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; setFreq(lp.frequency, 12000 - (p.warmth || 0) * 6000);
      ws.curve = makeTanhCurve(p.drive || 0);
      ws.connect(lp);
      return {
        inputNode: ws, outputNode: lp,
        setParam(n, v) { const t = ctx.currentTime; switch (n) {
          case "drive":  ws.curve = makeTanhCurve(v); break;
          case "warmth": lp.frequency.setTargetAtTime(safe(12000 - safe(v, 0, 0, 1) * 6000, 12000, 20, 20000), t, TAU); break;
          default: break;
        } },
        dispose() { disposeNodes(ws, lp); },
      };
    });
    if (fx.gainUtility?.enabled) install("gainUtility", (p) => {
      // Phase-invert is a sign flip on the GainNode value (must allow negatives).
      // Live param updates: ramp magnitude with setTargetAtTime, but a phaseInvert
      // toggle is a discrete sign change applied via direct .value (clamped via safe).
      const ug = ctx.createGain();
      ug.gain.value = safe(Math.pow(10, (p.gain || 0) / 20) * (p.phaseInvert ? -1 : 1), 1, -4, 4);
      let lastInvert = !!p.phaseInvert;
      let lastGainDb = p.gain || 0;
      const recompute = () => {
        const t = ctx.currentTime;
        const target = safe(Math.pow(10, lastGainDb / 20) * (lastInvert ? -1 : 1), 1, -4, 4);
        ug.gain.setTargetAtTime(target, t, TAU);
      };
      return {
        inputNode: ug, outputNode: ug,
        setParam(n, v) {
          if (n === "gain") { lastGainDb = safe(v, 0, -60, 24); recompute(); }
          else if (n === "phaseInvert") { lastInvert = !!v; recompute(); }
        },
        dispose() { disposeNodes(ug); },
      };
    });

    // ── SPX ANALOG COLORING ──
    if (fx.tapeForge?.enabled) install("tapeForge", (p) => {
      const ws = ctx.createWaveShaper(); ws.oversample = "4x";
      const buildCurve = (drv, sat) => {
        const N = 2048; const c = new Float32Array(N);
        const dr = safe(drv, 0.5, 0, 1), st = safe(sat, 0.6, 0, 1);
        for (let i = 0; i < N; i++) { const x = (i*2)/N-1; c[i] = Math.tanh(x*(1+dr*4))/(1+st*0.5); }
        return c;
      };
      ws.curve = buildCurve(p.drive ?? 0, p.saturation ?? 0);
      const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; setFreq(lp.frequency, 18000 - ((p.hfLoss ?? 0) * 10000));
      const hp = ctx.createBiquadFilter(); hp.type = "highpass"; setFreq(hp.frequency, 20 + ((p.bias ?? 0.5) * 30));
      ws.connect(lp); lp.connect(hp);
      let drv = p.drive ?? 0, sat = p.saturation ?? 0;
      return {
        inputNode: ws, outputNode: hp,
        setParam(n, v) { const t = ctx.currentTime; switch (n) {
          case "drive":      drv = safe(v, 0.5, 0, 1); ws.curve = buildCurve(drv, sat); break;
          case "saturation": sat = safe(v, 0.6, 0, 1); ws.curve = buildCurve(drv, sat); break;
          case "hfLoss":     lp.frequency.setTargetAtTime(safe(18000 - safe(v, 0.3, 0, 1) * 10000, 18000, 20, 20000), t, TAU); break;
          case "bias":       hp.frequency.setTargetAtTime(safe(20 + safe(v, 0.5, 0, 1) * 30, 20, 20, 20000), t, TAU); break;
          default: break;
        } },
        dispose() { disposeNodes(ws, lp, hp); },
      };
    });
    if (fx.valveGlow?.enabled) install("valveGlow", (p) => {
      const ws = ctx.createWaveShaper(); ws.oversample = "2x";
      const buildCurve = (drive) => {
        const N = 2048; const c = new Float32Array(N); const k = safe(drive, 0.4, 0, 1) * 10;
        for (let i = 0; i < N; i++) { const x = (i*2)/N-1; c[i] = (1+k/2)*x/(1+k*Math.abs(x)); }
        return c;
      };
      ws.curve = buildCurve(p.drive ?? 0);
      const lo = ctx.createBiquadFilter(); lo.type = "lowshelf"; setFreq(lo.frequency, 250); setGainDb(lo.gain, (p.warmth ?? 0) * 3);
      lo.connect(ws);
      return {
        inputNode: lo, outputNode: ws,
        setParam(n, v) { const t = ctx.currentTime; switch (n) {
          case "drive":  ws.curve = buildCurve(v); break;
          case "warmth": lo.gain.setTargetAtTime(safe(safe(v, 0.5, 0, 1) * 3, 0, -60, 24), t, TAU); break;
          default: break;
        } },
        dispose() { disposeNodes(lo, ws); },
      };
    });
    if (fx.ironCore?.enabled) install("ironCore", (p) => {
      const ws = ctx.createWaveShaper(); ws.oversample = "4x";
      // UI param aliases: slewRate→sat, coreSize→punch, dcMag→xfmr.gain,
      // resonance→xfmr.Q, outputGain→og (new gain stage).
      const buildCurve = (sat, punch) => {
        const N = 2048; const c = new Float32Array(N);
        const s = safe(sat, 0.5, 0, 1), pn = safe(punch, 0.5, 0, 1);
        for (let i = 0; i < N; i++) { const x = (i*2)/N-1; c[i] = x*Math.pow(1-Math.abs(x)*s, pn*2); }
        return c;
      };
      const initSat   = (p.slewRate != null ? p.slewRate : (p.saturation != null ? p.saturation : 0));
      const initPunch = (p.coreSize != null ? p.coreSize : (p.punch != null ? p.punch : 0));
      ws.curve = buildCurve(initSat, initPunch);
      const xfmr = ctx.createBiquadFilter(); xfmr.type = "peaking"; setFreq(xfmr.frequency, 80);
      setQ(xfmr.Q, 0.5 + safe(p.resonance != null ? p.resonance : 0, 0, 0, 1) * 4);
      setGainDb(xfmr.gain, safe((p.dcMag != null ? p.dcMag : 0), 0, 0, 1) * 8);
      const og = ctx.createGain(); setGainLinear(og.gain, Math.pow(10, (p.outputGain || 0) / 20));
      ws.connect(xfmr); xfmr.connect(og);
      let sat = initSat, punch = initPunch;
      return {
        inputNode: ws, outputNode: og,
        setParam(n, v) { const t = ctx.currentTime; switch (n) {
          case "slewRate":
          case "saturation": sat = safe(v, 0.5, 0, 1); ws.curve = buildCurve(sat, punch); break;
          case "coreSize":
          case "punch":      punch = safe(v, 0.5, 0, 1); ws.curve = buildCurve(sat, punch); break;
          case "dcMag":      xfmr.gain.setTargetAtTime(safe(safe(v, 0.2, 0, 1) * 8, 0, -60, 24), t, TAU); break;
          case "resonance":  xfmr.Q.setTargetAtTime(safe(0.5 + safe(v, 0.3, 0, 1) * 4, 1, 0.0001, 1000), t, TAU); break;
          case "outputGain": og.gain.setTargetAtTime(safe(Math.pow(10, safe(v, 0, -60, 24) / 20), 1, 0, 4), t, TAU); break;
          default: break;
        } },
        dispose() { disposeNodes(ws, xfmr, og); },
      };
    });
    if (fx.consoleSoul?.enabled) install("consoleSoul", (p) => {
      const ws = ctx.createWaveShaper(); ws.oversample = "2x";
      // UI param aliases: channelColor→color, sumSaturation augments curve sat,
      // crosstalk→hi.gain (high-shelf air emulating crosstalk artifacts).
      // noiseFloor, tolerance: no audio node available — accepted as no-ops.
      const buildCurve = (color, sumSat) => {
        const N = 2048; const c = new Float32Array(N);
        const co = safe(color, 0.5, 0, 1), ss = safe(sumSat, 0, 0, 1);
        const k = 1 + co * 2 + ss * 2;
        for (let i = 0; i < N; i++) { const x = (i*2)/N-1; c[i] = Math.tanh(x*k)/(1+co*0.3+ss*0.2); }
        return c;
      };
      const initColor  = (p.channelColor != null ? p.channelColor : (p.color != null ? p.color : 0));
      const initSumSat = (p.sumSaturation != null ? p.sumSaturation : 0);
      ws.curve = buildCurve(initColor, initSumSat);
      const hi = ctx.createBiquadFilter(); hi.type = "highshelf"; setFreq(hi.frequency, 12000);
      const initAir = (p.crosstalk != null ? p.crosstalk : (p.air != null ? p.air : 0));
      setGainDb(hi.gain, safe(initAir, 0, 0, 1) * 4);
      ws.connect(hi);
      let curColor = initColor, curSumSat = initSumSat;
      return {
        inputNode: ws, outputNode: hi,
        setParam(n, v) { const t = ctx.currentTime; switch (n) {
          case "channelColor":
          case "color":         curColor = safe(v, 0.5, 0, 1); ws.curve = buildCurve(curColor, curSumSat); break;
          case "sumSaturation": curSumSat = safe(v, 0, 0, 1); ws.curve = buildCurve(curColor, curSumSat); break;
          case "crosstalk":
          case "air":           hi.gain.setTargetAtTime(safe(safe(v, 0.3, 0, 1) * 4, 0, -60, 24), t, TAU); break;
          case "noiseFloor":    /* no noise generator node — accepted no-op */ break;
          case "tolerance":     /* no component-variance node — accepted no-op */ break;
          default: break;
        } },
        dispose() { disposeNodes(ws, hi); },
      };
    });
    if (fx.harmonicExcite?.enabled) install("harmonicExcite", (p) => {
      // UI param aliases: freq→frequency, drive+even+odd→ws curve harmonics,
      // mix→g.gain (UI %→0..1), airBoost→new high-shelf at 10 kHz.
      const hp = ctx.createBiquadFilter(); hp.type = "highpass";
      setFreq(hp.frequency, (p.freq != null ? p.freq : (p.frequency != null ? p.frequency : 3000)));
      const ws = ctx.createWaveShaper();
      const buildCurve = (drive, even, odd) => {
        const N = 2048; const c = new Float32Array(N);
        const d = safe(drive, 0.5, 0, 1), e = safe(even, 0.6, 0, 1), o = safe(odd, 0.3, 0, 1);
        for (let i = 0; i < N; i++) {
          const x = (i*2)/N-1;
          c[i] = x + d * (e * 0.3 * Math.sin(x*Math.PI*2) + o * 0.2 * Math.sin(x*Math.PI*3));
        }
        return c;
      };
      const initDrive = (p.drive != null ? p.drive : (p.amount != null ? p.amount : 0));
      const initEven  = (p.even != null ? p.even : 0);
      const initOdd   = (p.odd != null ? p.odd : 0);
      ws.curve = buildCurve(initDrive, initEven, initOdd);
      const air = ctx.createBiquadFilter(); air.type = "highshelf"; setFreq(air.frequency, 10000);
      setGainDb(air.gain, safe(p.airBoost != null ? p.airBoost : 0, 0, -6, 12));
      const initMixPct = (p.mix != null ? p.mix : 0);
      const g = ctx.createGain(); setGainLinear(g.gain, safe(initMixPct / 100, 0, 0, 1));
      hp.connect(ws); ws.connect(air); air.connect(g);
      let dr = initDrive, ev = initEven, od = initOdd;
      return {
        inputNode: hp, outputNode: g,
        setParam(n, v) { const t = ctx.currentTime; switch (n) {
          case "freq":
          case "frequency": hp.frequency.setTargetAtTime(safe(v, 3000, 20, 20000), t, TAU); break;
          case "drive":     dr = safe(v, 0.5, 0, 1); ws.curve = buildCurve(dr, ev, od); break;
          case "even":      ev = safe(v, 0.6, 0, 1); ws.curve = buildCurve(dr, ev, od); break;
          case "odd":       od = safe(v, 0.3, 0, 1); ws.curve = buildCurve(dr, ev, od); break;
          case "amount":    dr = safe(v, 0.5, 0, 1); ws.curve = buildCurve(dr, ev, od); break;
          case "airBoost":  air.gain.setTargetAtTime(safe(v, 0, -60, 24), t, TAU); break;
          case "mix":       g.gain.setTargetAtTime(safe(safe(v, 30, 0, 100) / 100, 0.3, 0, 1), t, TAU); break;
          default: break;
        } },
        dispose() { disposeNodes(hp, ws, air, g); },
      };
    });
    if (fx.vinylPress?.enabled) install("vinylPress", (p) => {
      const ws = ctx.createWaveShaper();
      const buildCurve = (warmth) => {
        const N = 2048; const c = new Float32Array(N); const w = safe(warmth, 0.5, 0, 1);
        for (let i = 0; i < N; i++) { const x = (i*2)/N-1; c[i] = Math.tanh(x*(1+w)); }
        return c;
      };
      ws.curve = buildCurve(p.warmth || 0);
      const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; setFreq(lp.frequency, 14000 - ((p.warmth || 0) * 4000));
      const hp = ctx.createBiquadFilter(); hp.type = "highpass"; setFreq(hp.frequency, 30 + ((p.crackle || 0) * 20));
      ws.connect(lp); lp.connect(hp);
      return {
        inputNode: ws, outputNode: hp,
        setParam(n, v) { const t = ctx.currentTime; switch (n) {
          case "warmth":  ws.curve = buildCurve(v); lp.frequency.setTargetAtTime(safe(14000 - safe(v, 0.5, 0, 1) * 4000, 14000, 20, 20000), t, TAU); break;
          case "crackle": hp.frequency.setTargetAtTime(safe(30 + safe(v, 0.1, 0, 1) * 20, 30, 20, 20000), t, TAU); break;
          default: break;
        } },
        dispose() { disposeNodes(ws, lp, hp); },
      };
    });
    if (fx.loFiCrusher?.enabled) install("loFiCrusher", (p) => {
      // UI emits bits, rate (0.1–1), filter (0–1), noise, wobble, mix.
      // Topology: input → ws (bits) → lp (rate/filter) → out
      //                                 (LFO modulates lp.frequency for wobble)
      //           noise generator → noiseGain → out
      const ws = ctx.createWaveShaper();
      ws.curve = makeBitcrushCurve(p.bits || 24);
      const lp = ctx.createBiquadFilter(); lp.type = "lowpass";
      const rateToFreq = (r) => 2000 + safe(r, 1, 0.1, 1) * 18000;
      const lpInitFreq = rateToFreq(p.rate != null ? p.rate : 1);
      setFreq(lp.frequency, lpInitFreq);
      ws.connect(lp);

      // Noise source — short noise buffer, looped.
      const noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const nd = noiseBuf.getChannelData(0);
      for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
      const noise = ctx.createBufferSource(); noise.buffer = noiseBuf; noise.loop = true;
      const noiseGain = ctx.createGain(); noiseGain.gain.value = safe(p.noise != null ? p.noise : 0, 0, 0, 1) * 0.1;
      noise.connect(noiseGain); noiseGain.connect(lp);
      try { noise.start(); } catch (e) {}

      // Wobble: LFO oscillator (sine) modulating lp.frequency.
      const wobLfo = ctx.createOscillator(); wobLfo.type = "sine"; wobLfo.frequency.value = 4; // 4 Hz wobble
      const wobDepth = ctx.createGain(); wobDepth.gain.value = safe(p.wobble != null ? p.wobble : 0, 0, 0, 1) * lpInitFreq * 0.4;
      wobLfo.connect(wobDepth); wobDepth.connect(lp.frequency);
      try { wobLfo.start(); } catch (e) {}

      let curLpBase = lpInitFreq;
      const updateWobbleDepth = (w) => { wobDepth.gain.setTargetAtTime(safe(w, 0, 0, 1) * curLpBase * 0.4, ctx.currentTime, TAU); };

      return {
        inputNode: ws, outputNode: lp,
        setParam(n, v) { const t = ctx.currentTime; switch (n) {
          case "bits":       ws.curve = makeBitcrushCurve(safe(v, 12, 4, 24)); break;
          case "rate":       curLpBase = rateToFreq(v); lp.frequency.setTargetAtTime(safe(curLpBase, 12000, 20, 20000), t, TAU); break;
          case "filter":     curLpBase = 2000 + safe(v, 0.5, 0, 1) * 18000; lp.frequency.setTargetAtTime(safe(curLpBase, 12000, 20, 20000), t, TAU); break;
          case "downsample": curLpBase = 8000 - safe(v, 0.5, 0, 1) * 4000;  lp.frequency.setTargetAtTime(safe(curLpBase, 8000, 20, 20000), t, TAU); break;
          case "noise":      noiseGain.gain.setTargetAtTime(safe(v, 0, 0, 1) * 0.1, t, TAU); break;
          case "wobble":     updateWobbleDepth(v); break;
          // Phase C: mix needs proper dry/wet split (current chain is wet-only).
          case "mix": break;
          default: break;
        } },
        dispose() {
          try { noise.stop(); } catch (e) {}
          try { wobLfo.stop(); } catch (e) {}
          disposeNodes(ws, lp, noise, noiseGain, wobLfo, wobDepth);
        },
      };
    });
    if (fx.vocalSaturator?.enabled) install("vocalSaturator", (p) => {
      // Topology: input → dry → out, input → ws → warmth(lowshelf) → air(highshelf) → presence → outputGain → wet → out.
      const inBus = ctx.createGain();
      const outBus = ctx.createGain();
      const dry = ctx.createGain();
      const wet = ctx.createGain();
      const ws = ctx.createWaveShaper(); ws.oversample = "2x";
      const buildCurve = (amt) => {
        const N = 2048; const c = new Float32Array(N); const a = safe(amt, 0.4, 0, 1);
        for (let i = 0; i < N; i++) { const x = (i*2)/N-1; c[i] = (1+a)*x/(1+a*Math.abs(x)); }
        return c;
      };
      ws.curve = buildCurve((p.amount != null ? p.amount : (p.drive != null ? p.drive : 0)));
      const warmth = ctx.createBiquadFilter(); warmth.type = "lowshelf"; setFreq(warmth.frequency, 200); setGainDb(warmth.gain, (p.warmth ?? 0) * 6);
      const air    = ctx.createBiquadFilter(); air.type    = "highshelf"; setFreq(air.frequency, 8000); setGainDb(air.gain, (p.air ?? 0) * 6);
      const pres = ctx.createBiquadFilter(); pres.type = "peaking"; setFreq(pres.frequency, 3500); setQ(pres.Q, 1.2); setGainDb(pres.gain, (p.presence ?? 0) * 5);
      const outG = ctx.createGain(); setGainLinear(outG.gain, Math.pow(10, (p.outputGain ?? 0) / 20));
      const initMix = (p.mix != null) ? safe(p.mix > 1 ? p.mix / 100 : p.mix, 0.5, 0, 1) : 1;
      setMix(wet.gain, initMix); setMix(dry.gain, 1 - initMix);
      inBus.connect(dry); dry.connect(outBus);
      inBus.connect(ws); ws.connect(warmth); warmth.connect(air); air.connect(pres); pres.connect(outG); outG.connect(wet); wet.connect(outBus);
      return {
        inputNode: inBus, outputNode: outBus,
        setParam(n, v) { const t = ctx.currentTime; switch (n) {
          case "amount":   ws.curve = buildCurve(v); break;
          case "drive":    ws.curve = buildCurve(safe(v, 0.4, 0, 1)); break;
          case "presence": pres.gain.setTargetAtTime(safe(safe(v, 0.5, 0, 1) * 5, 0, -60, 24), t, TAU); break;
          case "warmth":   warmth.gain.setTargetAtTime(safe(safe(v, 0, 0, 1) * 6, 0, -60, 24), t, TAU); break;
          case "air":      air.gain.setTargetAtTime(safe(safe(v, 0, 0, 1) * 6, 0, -60, 24), t, TAU); break;
          case "mix": {
            const m = safe(v > 1 ? v / 100 : v, 0.5, 0, 1);
            wet.gain.setTargetAtTime(m, t, TAU);
            dry.gain.setTargetAtTime(1 - m, t, TAU);
            break;
          }
          case "outputGain": outG.gain.setTargetAtTime(safe(Math.pow(10, safe(v, 0, -60, 24) / 20), 1, 0, 4), t, TAU); break;
          default: break;
        } },
        dispose() { disposeNodes(inBus, dry, ws, warmth, air, pres, outG, wet, outBus); },
      };
    });
    if (fx.multibandSat?.enabled) install("multibandSat", (p) => {
      // Phase C2.1: 4-band parallel saturation. Linkwitz-Riley-style xover via
      // cascaded biquad LP/HP pairs at xover1/xover2/xover3. Each band drives
      // its own WaveShaper (tanh curve scaled by drive%), summed back via a
      // gain bus. UI keys: xover1, xover2, xover3, drive1..drive4, mix.
      const buildCurve = (a) => {
        const N = 2048; const c = new Float32Array(N);
        const k = 1 + safe(a, 0.3, 0, 1) * 9; // 0 → ~unity, 1 → hard clip
        for (let i = 0; i < N; i++) { const x = (i*2)/N - 1; c[i] = Math.tanh(x * k) / Math.tanh(k); }
        return c;
      };
      const x1 = safe(p.xover1 != null ? p.xover1 : 200,  200,  20, 20000);
      const x2 = safe(p.xover2 != null ? p.xover2 : 2000, 2000, 20, 20000);
      const x3 = safe(p.xover3 != null ? p.xover3 : 8000, 8000, 20, 20000);
      // Input split-bus (single source, fan out to 4 bands).
      const inBus = ctx.createGain();
      // Band 1 (sub/low): LP at x1 (cascade 2 LPs for steeper LR-style slope).
      const b1lp1 = ctx.createBiquadFilter(); b1lp1.type = "lowpass"; setFreq(b1lp1.frequency, x1); setQ(b1lp1.Q, 0.707);
      const b1lp2 = ctx.createBiquadFilter(); b1lp2.type = "lowpass"; setFreq(b1lp2.frequency, x1); setQ(b1lp2.Q, 0.707);
      // Band 2 (low-mid): HP at x1, LP at x2.
      const b2hp1 = ctx.createBiquadFilter(); b2hp1.type = "highpass"; setFreq(b2hp1.frequency, x1); setQ(b2hp1.Q, 0.707);
      const b2hp2 = ctx.createBiquadFilter(); b2hp2.type = "highpass"; setFreq(b2hp2.frequency, x1); setQ(b2hp2.Q, 0.707);
      const b2lp1 = ctx.createBiquadFilter(); b2lp1.type = "lowpass"; setFreq(b2lp1.frequency, x2); setQ(b2lp1.Q, 0.707);
      const b2lp2 = ctx.createBiquadFilter(); b2lp2.type = "lowpass"; setFreq(b2lp2.frequency, x2); setQ(b2lp2.Q, 0.707);
      // Band 3 (high-mid): HP at x2, LP at x3.
      const b3hp1 = ctx.createBiquadFilter(); b3hp1.type = "highpass"; setFreq(b3hp1.frequency, x2); setQ(b3hp1.Q, 0.707);
      const b3hp2 = ctx.createBiquadFilter(); b3hp2.type = "highpass"; setFreq(b3hp2.frequency, x2); setQ(b3hp2.Q, 0.707);
      const b3lp1 = ctx.createBiquadFilter(); b3lp1.type = "lowpass"; setFreq(b3lp1.frequency, x3); setQ(b3lp1.Q, 0.707);
      const b3lp2 = ctx.createBiquadFilter(); b3lp2.type = "lowpass"; setFreq(b3lp2.frequency, x3); setQ(b3lp2.Q, 0.707);
      // Band 4 (air): HP at x3.
      const b4hp1 = ctx.createBiquadFilter(); b4hp1.type = "highpass"; setFreq(b4hp1.frequency, x3); setQ(b4hp1.Q, 0.707);
      const b4hp2 = ctx.createBiquadFilter(); b4hp2.type = "highpass"; setFreq(b4hp2.frequency, x3); setQ(b4hp2.Q, 0.707);
      // Per-band waveshapers.
      const ws1 = ctx.createWaveShaper(); ws1.oversample = "2x"; ws1.curve = buildCurve(safe(p.drive1 != null ? p.drive1 : 0, 0, 0, 1));
      const ws2 = ctx.createWaveShaper(); ws2.oversample = "2x"; ws2.curve = buildCurve(safe(p.drive2 != null ? p.drive2 : 0, 0, 0, 1));
      const ws3 = ctx.createWaveShaper(); ws3.oversample = "2x"; ws3.curve = buildCurve(safe(p.drive3 != null ? p.drive3 : 0, 0, 0, 1));
      const ws4 = ctx.createWaveShaper(); ws4.oversample = "2x"; ws4.curve = buildCurve(safe(p.drive4 != null ? p.drive4 : 0, 0, 0, 1));
      // Output sum + dry/wet mix.
      const wetSum = ctx.createGain(); setGainLinear(wetSum.gain, 0.7); // -3 dB headroom
      const dry = ctx.createGain(); setGainLinear(dry.gain, 1 - safe(p.mix != null ? p.mix : 0, 0, 0, 1));
      const wet = ctx.createGain(); setGainLinear(wet.gain, safe(p.mix != null ? p.mix : 0, 0, 0, 1));
      const out = ctx.createGain();
      // Wire: inBus fans out to all 4 band chains, plus dry path.
      inBus.connect(b1lp1); b1lp1.connect(b1lp2); b1lp2.connect(ws1); ws1.connect(wetSum);
      inBus.connect(b2hp1); b2hp1.connect(b2hp2); b2hp2.connect(b2lp1); b2lp1.connect(b2lp2); b2lp2.connect(ws2); ws2.connect(wetSum);
      inBus.connect(b3hp1); b3hp1.connect(b3hp2); b3hp2.connect(b3lp1); b3lp1.connect(b3lp2); b3lp2.connect(ws3); ws3.connect(wetSum);
      inBus.connect(b4hp1); b4hp1.connect(b4hp2); b4hp2.connect(ws4); ws4.connect(wetSum);
      wetSum.connect(wet); wet.connect(out);
      inBus.connect(dry); dry.connect(out);
      return {
        inputNode: inBus, outputNode: out,
        setParam(n, v) { const t = ctx.currentTime; switch (n) {
          case "xover1": {
            const f = safe(v, 200, 20, 20000);
            b1lp1.frequency.setTargetAtTime(f, t, TAU); b1lp2.frequency.setTargetAtTime(f, t, TAU);
            b2hp1.frequency.setTargetAtTime(f, t, TAU); b2hp2.frequency.setTargetAtTime(f, t, TAU);
            break;
          }
          case "xover2": {
            const f = safe(v, 2000, 20, 20000);
            b2lp1.frequency.setTargetAtTime(f, t, TAU); b2lp2.frequency.setTargetAtTime(f, t, TAU);
            b3hp1.frequency.setTargetAtTime(f, t, TAU); b3hp2.frequency.setTargetAtTime(f, t, TAU);
            break;
          }
          case "xover3": {
            const f = safe(v, 8000, 20, 20000);
            b3lp1.frequency.setTargetAtTime(f, t, TAU); b3lp2.frequency.setTargetAtTime(f, t, TAU);
            b4hp1.frequency.setTargetAtTime(f, t, TAU); b4hp2.frequency.setTargetAtTime(f, t, TAU);
            break;
          }
          case "drive1": ws1.curve = buildCurve(safe(v, 0.3, 0, 1)); break;
          case "drive2": ws2.curve = buildCurve(safe(v, 0.3, 0, 1)); break;
          case "drive3": ws3.curve = buildCurve(safe(v, 0.2, 0, 1)); break;
          case "drive4": ws4.curve = buildCurve(safe(v, 0.1, 0, 1)); break;
          case "mix": {
            const m = safe(v, 0.5, 0, 1);
            wet.gain.setTargetAtTime(m, t, TAU);
            dry.gain.setTargetAtTime(1 - m, t, TAU);
            break;
          }
          // Legacy aliases (back-compat).
          case "low":  ws1.curve = buildCurve(safe(v, 0.3, 0, 1)); break;
          case "mid":  ws2.curve = buildCurve(safe(v, 0.3, 0, 1)); break;
          case "high": ws3.curve = buildCurve(safe(v, 0.2, 0, 1)); break;
          default: break;
        } },
        dispose() {
          disposeNodes(inBus, b1lp1, b1lp2, b2hp1, b2hp2, b2lp1, b2lp2,
            b3hp1, b3hp2, b3lp1, b3lp2, b4hp1, b4hp2, ws1, ws2, ws3, ws4,
            wetSum, dry, wet, out);
        },
      };
    });
    if (fx.cabinetSim?.enabled) install("cabinetSim", (p) => {
      // True cabinet sim needs convolution / IRs. We approximate with a
      // shaped HP+peak+peak+LP. UI knobs:
      //   cabinet (0–5 button) → varies mid center + LP cutoff (different cabs sound different)
      //   distance (0–1) → darkens LP (more distance = less HF)
      //   angle (0–90°) → off-axis cut on mid presence
      //   mic, mix — Phase C (mic needs separate presence node; mix needs dry/wet split).
      const cabToMidF = (c) => 800 + safe(c, 0, 0, 5) * 200;
      const cabToHiF  = (c) => 6000 + safe(c, 0, 0, 5) * 2000;
      const distToHi  = (d) => -safe(d, 0, 0, 1) * 2000; // up to 2k cut at full distance
      const angleToMidGain = (a) => 3 - safe(a, 0, 0, 90) / 30; // 3 dB at 0°, 0 dB at 90°
      const initCab = p.cabinet != null ? p.cabinet : 0;
      const initDist = p.distance != null ? p.distance : 0;
      const initAng = p.angle != null ? p.angle : 0;
      const lo = ctx.createBiquadFilter(); lo.type = "highpass"; setFreq(lo.frequency, 80);
      const body = ctx.createBiquadFilter(); body.type = "peaking"; setFreq(body.frequency, 200); setQ(body.Q, 1); setGainDb(body.gain, 2);
      const mid = ctx.createBiquadFilter(); mid.type = "peaking"; setFreq(mid.frequency, cabToMidF(initCab)); setQ(mid.Q, 0.8); setGainDb(mid.gain, angleToMidGain(initAng));
      const hi = ctx.createBiquadFilter(); hi.type = "lowpass"; setFreq(hi.frequency, cabToHiF(initCab) + distToHi(initDist));
      lo.connect(body); body.connect(mid); mid.connect(hi);
      // Track current cabinet so distance/angle can recompute against it.
      let curCab = safe(initCab, 0, 0, 5);
      let curDist = safe(initDist, 0.5, 0, 1);
      return {
        inputNode: lo, outputNode: hi,
        setParam(n, v) { const t = ctx.currentTime; switch (n) {
          case "cabinet": {
            curCab = safe(v, 0, 0, 5);
            mid.frequency.setTargetAtTime(safe(cabToMidF(curCab), 800, 20, 20000), t, TAU);
            hi.frequency.setTargetAtTime(safe(cabToHiF(curCab) + distToHi(curDist), 6000, 20, 20000), t, TAU);
            break;
          }
          case "distance": {
            curDist = safe(v, 0, 0, 1);
            hi.frequency.setTargetAtTime(safe(cabToHiF(curCab) + distToHi(curDist), 6000, 20, 20000), t, TAU);
            break;
          }
          case "angle":
            mid.gain.setTargetAtTime(safe(angleToMidGain(v), 0, -60, 24), t, TAU);
            break;
          case "type": {
            // Legacy alias — UI never sends, but kept for back-compat.
            const ty = safe(v, 0, 0, 10);
            mid.frequency.setTargetAtTime(safe(800 + ty * 200, 800, 20, 20000), t, TAU);
            hi.frequency.setTargetAtTime(safe(6000 + ty * 2000, 6000, 20, 20000), t, TAU);
            break;
          }
          // Phase C: mic (needs additional mic-emulation peak node), mix (dry/wet split).
          case "mic": case "mix": break;
          default: break;
        } },
        dispose() { disposeNodes(lo, body, mid, hi); },
      };
    });

    // ── SPX DYNAMICS ──
    if (fx.warmPress?.enabled) install("warmPress", (p) => {
      // Phase F4-A.5 Batch 4: model selector now swaps engine, plus parallel dry/wet mix.
      // Topology:
      //   in (split) → comp (DynComp) → ws (WaveShaper, model-dependent) → makeup (mk)
      //                                                                  ╲
      //                                                                   wetGain ─╮
      //   in ──────────────────────────────────────── dryGain ──────────────────────┤── out
      //
      // model:
      //   "optical": knee=12, attack=20 ms, release=300 ms, soft tanh sat (k=1.3)
      //   "vca":     knee=2,  attack=1 ms,  release=80 ms,  no sat (clean curve y=x)
      //   "vari-mu": knee=15, attack=30 ms, release=400 ms, asym tanh sat (even harmonics)
      //
      // mix (0..100): 100 → wet only; 0 → dry only. Implemented as crossfade between
      // input (dry) and post-makeup wet path via two summing GainNodes.
      const inNode  = ctx.createGain(); setGainLinear(inNode.gain, 1);
      const outNode = ctx.createGain(); setGainLinear(outNode.gain, 1);
      const c  = ctx.createDynamicsCompressor();
      const ws = ctx.createWaveShaper(); ws.oversample = "2x";
      const mk = ctx.createGain();
      setGainLinear(mk.gain, Math.pow(10, safe(p.makeupGain != null ? p.makeupGain : (p.makeup != null ? p.makeup : 0), 0, -60, 24) / 20));
      const wetGain = ctx.createGain();
      const dryGain = ctx.createGain();

      // Curve builders for each model.
      const N = 2048;
      const buildOpticalCurve = () => {
        const cv = new Float32Array(N);
        for (let i = 0; i < N; i++) { const x = (i*2)/N-1; cv[i] = Math.tanh(x*1.3); }
        return cv;
      };
      const buildVcaCurve = () => {
        // Linear identity — no saturation for clean VCA character.
        const cv = new Float32Array(N);
        for (let i = 0; i < N; i++) { const x = (i*2)/N-1; cv[i] = x; }
        return cv;
      };
      const buildVariMuCurve = () => {
        // Asymmetric tanh — even harmonics, like tubeComp.
        const cv = new Float32Array(N);
        const k = 1.5;
        for (let i = 0; i < N; i++) {
          const x = (i*2)/N - 1;
          const xk = x * k;
          let y = Math.tanh(xk) + 0.1 * Math.tanh(xk * xk) * Math.sign(x);
          if (y > 1) y = 1; if (y < -1) y = -1;
          cv[i] = y;
        }
        return cv;
      };

      // Apply mode: updates DynComp ballistics + WaveShaper curve.
      const setMode = (modeName) => {
        const t = ctx.currentTime;
        switch (modeName) {
          case "vca":
            c.knee.setTargetAtTime(2, t, TAU);
            c.attack.setTargetAtTime(safe(0.001, 0.001, 0, 1), t, TAU);
            c.release.setTargetAtTime(safe(0.080, 0.08, 0, 1), t, TAU);
            ws.curve = buildVcaCurve();
            break;
          case "vari-mu":
            c.knee.setTargetAtTime(15, t, TAU);
            c.attack.setTargetAtTime(safe(0.030, 0.03, 0, 1), t, TAU);
            c.release.setTargetAtTime(safe(0.400, 0.4, 0, 1), t, TAU);
            ws.curve = buildVariMuCurve();
            break;
          case "optical":
          default:
            c.knee.setTargetAtTime(12, t, TAU);
            c.attack.setTargetAtTime(safe(0.020, 0.02, 0, 1), t, TAU);
            c.release.setTargetAtTime(safe(0.300, 0.3, 0, 1), t, TAU);
            ws.curve = buildOpticalCurve();
            break;
        }
      };

      // Initialise threshold/ratio/knee from params, then apply mode (overrides knee/attack/release).
      setCompThresh(c.threshold, p.threshold != null ? p.threshold : -10);
      setCompRatio(c.ratio, p.ratio != null ? p.ratio : 2);
      // attack/release/knee defaults written below by setMode; if user-provided params exist,
      // they win after setMode applies the mode preset.
      setCompKnee(c.knee, p.knee != null ? p.knee : 6);
      setCompAttack(c.attack, (p.attack != null ? p.attack : 10) / 1000);
      setCompRelease(c.release, (p.release != null ? p.release : 100) / 1000);
      const initModel = (typeof p.model === "string" && p.model) ? p.model : "optical";
      setMode(initModel);
      // Re-apply user attack/release after mode preset if user supplied explicit values.
      if (p.attack != null) c.attack.value = safe(p.attack / 1000, 0.01, 0, 1);
      if (p.release != null) c.release.value = safe(p.release / 1000, 0.1, 0, 1);

      // Mix init.
      const initMix = safe((p.mix != null ? p.mix : 100) / 100, 1, 0, 1);
      setGainLinear(wetGain.gain, initMix);
      setGainLinear(dryGain.gain, 1 - initMix);

      // Wire: dry path inNode → dryGain → outNode; wet path inNode → c → ws → mk → wetGain → outNode.
      inNode.connect(c); c.connect(ws); ws.connect(mk); mk.connect(wetGain); wetGain.connect(outNode);
      inNode.connect(dryGain); dryGain.connect(outNode);
      // SAT meter tap: post-makeup wet level. Analyser is a sink — no audio impact.
      const satAn = ctx.createAnalyser(); satAn.fftSize = 256; satAn.smoothingTimeConstant = 0.85;
      mk.connect(satAn);

      return {
        inputNode: inNode, outputNode: outNode,
        setParam(n, v) { const t = ctx.currentTime; switch (n) {
          case "threshold": c.threshold.setTargetAtTime(safe(v, -18, -100, 0), t, TAU); break;
          case "ratio":     c.ratio.setTargetAtTime(safe(v, 3, 1, 20), t, TAU); break;
          case "attack":    c.attack.setTargetAtTime(safe((v != null ? v : 10) / 1000, 0.01, 0, 1), t, TAU); break;
          case "release":   c.release.setTargetAtTime(safe((v != null ? v : 100) / 1000, 0.1, 0, 1), t, TAU); break;
          case "knee":      c.knee.setTargetAtTime(safe(v, 6, 0, 40), t, TAU); break;
          case "makeup":
          case "makeupGain": mk.gain.setTargetAtTime(safe(Math.pow(10, safe(v, 0, -60, 24) / 20), 1, 0, 16), t, TAU); break;
          case "model":     setMode(typeof v === "string" ? v : "optical"); break;
          case "mix": {
            const m = safe((v != null ? v : 100) / 100, 1, 0, 1);
            wetGain.gain.setTargetAtTime(m, t, TAU);
            dryGain.gain.setTargetAtTime(1 - m, t, TAU);
            break;
          }
          default: break;
        } },
        dispose() { disposeNodes(inNode, c, ws, mk, wetGain, dryGain, outNode, satAn); },
        meters: { comp: c, analyserOut: satAn },
      };
    });
    if (fx.glueBus?.enabled) install("glueBus", (p) => {
      // SSL G-Bus character:
      //   in → 1ms lookahead delay → DynComp(knee:6) → +0.5 dB peaking @ 12 kHz → makeup → out
      // - 1ms delay slightly anticipates transients (subtle slew-rate "softening").
      // - 12 kHz peaking (Q=1, +0.5 dB) is the always-on "air" lift after compression.
      // - autoGain: when true, makeup is recomputed from threshold movement
      //     extraDb = -threshold/10 * 0.5  (gives +0.5 dB per -10 dB threshold drop)
      //   The user's manual `makeupGain` knob is summed on top.
      const lookahead = ctx.createDelay(0.005);
      lookahead.delayTime.value = 0.001;
      const c = ctx.createDynamicsCompressor();
      const initThresh = (p.threshold != null ? p.threshold : -10);
      setCompThresh(c.threshold, initThresh);
      setCompRatio(c.ratio, p.ratio != null ? p.ratio : 2);
      setCompAttack(c.attack, (p.attack != null ? p.attack : 10) / 1000);
      setCompRelease(c.release, (p.release != null ? p.release : 100) / 1000);
      setCompKnee(c.knee, 6);
      const air = ctx.createBiquadFilter();
      air.type = "peaking"; setFreq(air.frequency, 12000); setQ(air.Q, 1); setGainDb(air.gain, 0.5);
      const g = ctx.createGain();
      // Track autoGain state and last threshold so we can recompute makeup on changes.
      let autoGain = !!(p.autoGain != null ? p.autoGain : true);
      let lastThresh = initThresh;
      let baseMakeupDb = (p.makeupGain != null ? p.makeupGain : (p.makeup != null ? p.makeup : 0));
      const computeMakeupLinear = () => {
        const auto = autoGain ? (-lastThresh / 10) * 0.5 : 0;
        const totalDb = baseMakeupDb + auto;
        return Math.pow(10, safe(totalDb, 0, -60, 24) / 20);
      };
      setGainLinear(g.gain, computeMakeupLinear());
      lookahead.connect(c); c.connect(air); air.connect(g);
      return {
        inputNode: lookahead, outputNode: g,
        setParam(n, v) { const t = ctx.currentTime; switch (n) {
          case "threshold":
            lastThresh = safe(v, -12, -100, 0);
            c.threshold.setTargetAtTime(lastThresh, t, TAU);
            // If autoGain is on, recompute makeup so loudness stays roughly matched.
            if (autoGain) g.gain.setTargetAtTime(computeMakeupLinear(), t, TAU);
            break;
          case "ratio":     c.ratio.setTargetAtTime(safe(v, 4, 1, 20), t, TAU); break;
          case "attack":    c.attack.setTargetAtTime(safe((v || 10) / 1000, 0.01, 0, 1), t, TAU); break;
          case "release":   c.release.setTargetAtTime(safe((v || 100) / 1000, 0.1, 0, 1), t, TAU); break;
          case "makeup":
          case "makeupGain":
            baseMakeupDb = safe(v, 0, -60, 24);
            g.gain.setTargetAtTime(computeMakeupLinear(), t, TAU);
            break;
          case "autoGain":
            autoGain = !!v;
            g.gain.setTargetAtTime(computeMakeupLinear(), t, TAU);
            break;
          default: break;
        } },
        dispose() { disposeNodes(lookahead, c, air, g); },
        meters: { comp: c },
      };
    });
    if (fx.fetStrike?.enabled) install("fetStrike", (p) => {
      // 1176-style FET: DynComp(hard knee) → WaveShaper(FET curve) → makeup
      // FET curve replicates PluginHost's createFETCompPlugin character.
      const c = ctx.createDynamicsCompressor();
      setCompThresh(c.threshold, p.threshold != null ? p.threshold : -10);
      setCompRatio(c.ratio, p.ratio != null ? p.ratio : 2);
      setCompAttack(c.attack, (p.attack != null ? p.attack : 10) / 1000);
      setCompRelease(c.release, (p.release != null ? p.release : 100) / 1000);
      setCompKnee(c.knee, 2); // hard knee — FET character
      const ws = ctx.createWaveShaper(); ws.oversample = "2x";
      const buildFETCurve = (drive) => {
        const N = 2048; const cv = new Float32Array(N);
        const k = 1 + safe(drive, 0, 0, 1) * 4;
        for (let i = 0; i < N; i++) {
          const x = (i*2)/N - 1;
          cv[i] = ((Math.PI + 2) * x) / (Math.PI + k * Math.abs(x));
        }
        return cv;
      };
      // Track saturation/allButton state so allButtonRatio can boost saturation dynamically.
      let satState = safe(p.saturation != null ? p.saturation : 0, 0, 0, 1);
      let allButton = !!p.allButtonRatio;
      ws.curve = buildFETCurve(allButton ? Math.min(1, satState + 0.3) : satState);
      const g = ctx.createGain(); setGainLinear(g.gain, Math.pow(10, (p.makeup || 0) / 20));
      // If init has allButtonRatio, lock ratio to 20.
      if (allButton) c.ratio.value = 20;
      c.connect(ws); ws.connect(g);
      return {
        inputNode: c, outputNode: g,
        setParam(n, v) { const t = ctx.currentTime; switch (n) {
          case "threshold": c.threshold.setTargetAtTime(safe(v, -15, -100, 0), t, TAU); break;
          case "ratio":
            // If allButton is engaged, ratio is locked to 20 and ignores knob.
            if (!allButton) c.ratio.setTargetAtTime(safe(v, 6, 1, 20), t, TAU);
            break;
          case "attack":    c.attack.setTargetAtTime(safe((v || 1) / 1000, 0.001, 0, 1), t, TAU); break;
          case "release":   c.release.setTargetAtTime(safe((v || 50) / 1000, 0.05, 0, 1), t, TAU); break;
          case "makeup":    g.gain.setTargetAtTime(safe(Math.pow(10, safe(v, 4, -60, 24) / 20), 1, 0, 4), t, TAU); break;
          case "saturation": {
            satState = safe(v, 0, 0, 1);
            const eff = allButton ? Math.min(1, satState + 0.3) : satState;
            ws.curve = buildFETCurve(eff);
            break;
          }
          case "allButtonRatio": {
            allButton = !!v;
            if (allButton) {
              c.ratio.setTargetAtTime(20, t, TAU);
              ws.curve = buildFETCurve(Math.min(1, satState + 0.3));
            } else {
              // Restore base saturation curve; ratio stays where it is until next ratio change.
              ws.curve = buildFETCurve(satState);
            }
            break;
          }
          default: break;
        } },
        dispose() { disposeNodes(c, ws, g); },
        meters: { comp: c },
      };
    });
    if (fx.optoPress?.enabled) install("optoPress", (p) => {
      // LA-2A character: HF pre-emph → transformer pre-sat → DynComp(soft knee, slow attack/release)
      //                  → tube post-sat → makeup → output gain.
      // Program-dependent release: AnalyserNode polled at 30 Hz tracks an envelope and modulates
      // c.release between fast (~150 ms) on transients and slow (~600 ms) on sustained signals.
      // UI aliases: peakReduction → c.threshold, gainControl → mk gain, hfEmphasis → hf,
      // tubeSaturation → ws (post), outputGain → og.
      const hf = ctx.createBiquadFilter(); hf.type = "highshelf"; setFreq(hf.frequency, 5000);
      setGainDb(hf.gain, safe(p.hfEmphasis != null ? p.hfEmphasis : 0, 0, 0, 1) * 6);
      // Transformer saturation pre-stage: gentle warmth via tanh(x * 1.2).
      const xfmr = ctx.createWaveShaper(); xfmr.oversample = "2x";
      {
        const N = 1024; const cv = new Float32Array(N);
        for (let i = 0; i < N; i++) { const x = (i*2)/N - 1; cv[i] = Math.tanh(x * 1.2); }
        xfmr.curve = cv;
      }
      const c = ctx.createDynamicsCompressor();
      const initThresh = (p.peakReduction != null
        ? -safe(p.peakReduction, 17, 0, 100) * 0.6
        : (p.threshold != null ? p.threshold : -10));
      setCompThresh(c.threshold, initThresh);
      setCompRatio(c.ratio, p.ratio || 2);
      // Slightly slower attack baseline for opto VOX color (150 µs floor).
      setCompAttack(c.attack, (p.attack != null ? p.attack : 50) / 1000);
      // Base release — program-dependent envelope tracker will modulate this.
      setCompRelease(c.release, (p.release != null ? p.release : 300) / 1000);
      setCompKnee(c.knee, 15);
      const ws = ctx.createWaveShaper(); ws.oversample = "2x";
      const buildSatCurve = (sat) => {
        const N = 1024; const cv = new Float32Array(N); const s = safe(sat, 0.4, 0, 1);
        const k = 1 + s * 3;
        for (let i = 0; i < N; i++) { const x = (i*2)/N-1; cv[i] = Math.tanh(x*k)/Math.tanh(k); }
        return cv;
      };
      ws.curve = buildSatCurve(p.tubeSaturation != null ? p.tubeSaturation : 0);
      const mk = ctx.createGain();
      setGainLinear(mk.gain, Math.pow(10, safe(p.gainControl != null ? p.gainControl : 0, 0, 0, 40) / 20));
      const og = ctx.createGain();
      setGainLinear(og.gain, Math.pow(10, (p.outputGain || 0) / 20));
      // Program-dependent release tracker.
      const an = ctx.createAnalyser(); an.fftSize = 256; an.smoothingTimeConstant = 0.85;
      const buf = new Uint8Array(an.fftSize);
      let envEMA = 0;       // long-term moving average of |x|
      const emaAlpha = 0.15; // smoothing for envelope
      const minRelease = 0.15; // 150 ms — fast (transients)
      const maxRelease = 0.60; // 600 ms — slow (sustained)
      let releaseTimer = null;
      try {
        releaseTimer = setInterval(() => {
          try {
            an.getByteTimeDomainData(buf);
            // Compute RMS-ish magnitude around 128 (zero).
            let acc = 0;
            for (let i = 0; i < buf.length; i++) {
              const x = (buf[i] - 128) / 128;
              acc += x * x;
            }
            const rms = Math.sqrt(acc / buf.length); // 0..~1
            envEMA = envEMA * (1 - emaAlpha) + rms * emaAlpha;
            // Map envEMA (≈0..0.5) to release time.
            // Sustained signal → high envEMA → longer release.
            const rel = minRelease + (maxRelease - minRelease) * Math.min(1, envEMA * 4);
            c.release.setTargetAtTime(rel, ctx.currentTime, 0.05);
          } catch (e) { /* noop */ }
        }, 33); // ~30 Hz
      } catch (e) { /* environment may not support setInterval — fall back to fixed release */ }
      // Topology: hf → xfmr → c → ws → mk → og.
      // Tap analyser off the post-comp signal so envelope reflects compressed level.
      hf.connect(xfmr); xfmr.connect(c); c.connect(ws); ws.connect(mk); mk.connect(og);
      c.connect(an); // analyser is a sink, doesn't affect audio path.
      return {
        inputNode: hf, outputNode: og,
        setParam(n, v) { const t = ctx.currentTime; switch (n) {
          case "peakReduction": c.threshold.setTargetAtTime(safe(-safe(v, 50, 0, 100) * 0.6, -30, -100, 0), t, TAU); break;
          case "threshold":     c.threshold.setTargetAtTime(safe(v, -20, -100, 0), t, TAU); break;
          case "ratio":         c.ratio.setTargetAtTime(safe(v, 3, 1, 20), t, TAU); break;
          case "attack":        c.attack.setTargetAtTime(safe((v || 50) / 1000, 0.05, 0, 1), t, TAU); break;
          // Note: release is auto-modulated by the program-dependent tracker; setting it
          // here defines the *base* but the tracker will continue to override every 33 ms.
          case "release":       c.release.setTargetAtTime(safe((v || 300) / 1000, 0.3, 0, 1), t, TAU); break;
          case "hfEmphasis":    hf.gain.setTargetAtTime(safe(safe(v, 0, 0, 1) * 6, 0, -60, 24), t, TAU); break;
          case "tubeSaturation":ws.curve = buildSatCurve(v); break;
          case "gainControl":   mk.gain.setTargetAtTime(safe(Math.pow(10, safe(v, 0, 0, 40) / 20), 1, 0, 100), t, TAU); break;
          case "outputGain":    og.gain.setTargetAtTime(safe(Math.pow(10, safe(v, 0, -60, 24) / 20), 1, 0, 4), t, TAU); break;
          default: break;
        } },
        dispose() {
          if (releaseTimer != null) { try { clearInterval(releaseTimer); } catch (e) { /* noop */ } }
          disposeNodes(hf, xfmr, c, ws, mk, og, an);
        },
        meters: { comp: c },
      };
    });
    if (fx.parallelCrush?.enabled) install("parallelCrush", (p) => {
      // Phase C2.3 rebuild: proper parallel routing.
      //   in → dryGain → output
      //   in → comp (heavy) → WaveShaper (crush curve) → wetGain → output
      // mix (0..100 %) crossfades dry vs wet; wetGain/dryGain are dB trims.
      const inNode  = ctx.createGain(); setGainLinear(inNode.gain, 1);
      const outNode = ctx.createGain(); setGainLinear(outNode.gain, 1);
      const comp = ctx.createDynamicsCompressor();
      setCompThresh(comp.threshold, p.threshold != null ? p.threshold : -10);
      setCompRatio(comp.ratio, p.ratio != null ? p.ratio : 2);
      setCompAttack(comp.attack, safe((p.attack != null ? p.attack : 10) / 1000, 0.01, 0, 1));
      setCompRelease(comp.release, safe((p.release != null ? p.release : 100) / 1000, 0.1, 0, 1));
      setCompKnee(comp.knee, 2);
      const ws = ctx.createWaveShaper();
      const N = 2048;
      const buildCrushCurve = (amt) => {
        const c = new Float32Array(N);
        const k = 1 + safe(amt, 0.7, 0, 1) * 30;
        for (let i = 0; i < N; i++) {
          const x = (i * 2) / N - 1;
          // tanh + asymmetric clip → aggressive crush
          let y = Math.tanh(x * k) * 0.8 + Math.sign(x) * 0.2 * Math.min(1, Math.abs(x) * k);
          if (y > 1) y = 1; if (y < -1) y = -1;
          c[i] = y;
        }
        return c;
      };
      ws.curve = buildCrushCurve(p.crush != null ? p.crush : 0);
      ws.oversample = '2x';
      const wetGain = ctx.createGain();
      const dryGain = ctx.createGain();
      const wetTrim = ctx.createGain(); // wetGain knob (dB)
      const dryTrim = ctx.createGain(); // dryGain knob (dB)
      setGainLinear(wetTrim.gain, Math.pow(10, safe(p.wetGain != null ? p.wetGain : 0, 0, -12, 12) / 20));
      setGainLinear(dryTrim.gain, Math.pow(10, safe(p.dryGain != null ? p.dryGain : 0, 0, -12, 12) / 20));
      const initMix = safe((p.mix != null ? p.mix : 100) / 100, 1, 0, 1);
      setGainLinear(wetGain.gain, initMix);
      setGainLinear(dryGain.gain, 1 - initMix);
      // Wet path
      inNode.connect(comp); comp.connect(ws); ws.connect(wetTrim); wetTrim.connect(wetGain); wetGain.connect(outNode);
      // Dry path
      inNode.connect(dryTrim); dryTrim.connect(dryGain); dryGain.connect(outNode);
      // Per-path meter taps. dryAn is post-dryTrim/pre-mix; wetAn is post-wetTrim/pre-mix.
      const dryAn = ctx.createAnalyser(); dryAn.fftSize = 256; dryAn.smoothingTimeConstant = 0.85;
      const wetAn = ctx.createAnalyser(); wetAn.fftSize = 256; wetAn.smoothingTimeConstant = 0.85;
      dryTrim.connect(dryAn); wetTrim.connect(wetAn);
      return {
        inputNode: inNode, outputNode: outNode,
        setParam(n, v) { const t = ctx.currentTime; switch (n) {
          case "threshold": comp.threshold.setTargetAtTime(safe(v, -25, -100, 0), t, TAU); break;
          case "ratio":     comp.ratio.setTargetAtTime(safe(v, 10, 1, 20), t, TAU); break;
          case "attack":    comp.attack.setTargetAtTime(safe((v || 5) / 1000, 0.005, 0, 1), t, TAU); break;
          case "release":   comp.release.setTargetAtTime(safe((v || 80) / 1000, 0.08, 0, 1), t, TAU); break;
          case "crush":     ws.curve = buildCrushCurve(v); break;
          case "wetGain":   wetTrim.gain.setTargetAtTime(safe(Math.pow(10, safe(v, 0, -12, 12) / 20), 1, 0, 4), t, TAU); break;
          case "dryGain":   dryTrim.gain.setTargetAtTime(safe(Math.pow(10, safe(v, 0, -12, 12) / 20), 1, 0, 4), t, TAU); break;
          case "mix": {
            const m = safe((v != null ? v : 50) / 100, 0.5, 0, 1);
            wetGain.gain.setTargetAtTime(m, t, TAU);
            dryGain.gain.setTargetAtTime(1 - m, t, TAU);
            break;
          }
          default: break;
        } },
        dispose() { disposeNodes(inNode, comp, ws, wetTrim, dryTrim, wetGain, dryGain, outNode, dryAn, wetAn); },
        meters: { analyserDry: dryAn, analyserWet: wetAn },
      };
    });
    if (fx.tubeComp?.enabled) install("tubeComp", (p) => {
      // Tube-style compressor — port of PluginHost createTubeCompPlugin with
      // even-harmonic asymmetric tanh saturation (2nd-harmonic "tube" color, vs
      // the 3rd-harmonic FET curve in fetStrike).
      // Topology:
      //   in → DynComp(very soft knee 12) → tube WaveShaper (asym tanh, 4× OS)
      //      → 200 Hz lowshelf (warmth) → makeup Gain → out
      // Slow release (300 ms default) for smooth sustained character.
      // NOTE: stereoLink is UI-only / informational — Web Audio's
      // DynamicsCompressorNode is already a single-instance summed-side detector
      // (effectively linked) when fed a stereo signal. Toggle is preserved in
      // PLUGIN_DEFAULTS but does not alter inline DSP.
      const c = ctx.createDynamicsCompressor();
      setCompThresh(c.threshold, p.threshold != null ? p.threshold : -14);
      setCompRatio(c.ratio, p.ratio != null ? p.ratio : 3);
      setCompAttack(c.attack, (p.attack != null ? p.attack : 20) / 1000);
      setCompRelease(c.release, (p.release != null ? p.release : 300) / 1000);
      setCompKnee(c.knee, 12); // very soft knee — tube character
      const ws = ctx.createWaveShaper(); ws.oversample = "4x";
      const buildTubeCurve = (drive) => {
        const N = 2048; const cv = new Float32Array(N);
        const d = safe(drive, 0.4, 0, 1);
        const k = 1 + d * 4;
        for (let i = 0; i < N; i++) {
          const x = (i*2)/N - 1;
          const xk = x * k;
          // Asymmetric tanh: primary tanh + 0.1 * tanh(xk^2) * sign(x)
          // injects 2nd-harmonic content for tube color.
          let y = Math.tanh(xk) + 0.1 * Math.tanh(xk * xk) * Math.sign(x);
          if (y > 1) y = 1; if (y < -1) y = -1;
          cv[i] = y;
        }
        return cv;
      };
      ws.curve = buildTubeCurve(p.drive != null ? p.drive : 0.4);
      const warmth = ctx.createBiquadFilter();
      warmth.type = "lowshelf"; setFreq(warmth.frequency, 200);
      // Map warmth knob (0..1) to ~0..6 dB lift for body without mud.
      setGainDb(warmth.gain, safe(p.warmth != null ? p.warmth : 0.5, 0.5, 0, 1) * 6);
      const mk = ctx.createGain();
      setGainLinear(mk.gain, Math.pow(10, safe(p.makeup != null ? p.makeup : 0, 0, -60, 24) / 20));
      // Input gain wraps c so we can tap a true pre-comp analyser.
      const inGain = ctx.createGain(); setGainLinear(inGain.gain, 1);
      const inAn = ctx.createAnalyser(); inAn.fftSize = 256; inAn.smoothingTimeConstant = 0.85;
      inGain.connect(c); inGain.connect(inAn);
      c.connect(ws); ws.connect(warmth); warmth.connect(mk);
      return {
        inputNode: inGain, outputNode: mk,
        setParam(n, v) { const t = ctx.currentTime; switch (n) {
          case "threshold":  c.threshold.setTargetAtTime(safe(v, -14, -100, 0), t, TAU); break;
          case "ratio":      c.ratio.setTargetAtTime(safe(v, 3, 1, 20), t, TAU); break;
          case "attack":     c.attack.setTargetAtTime(safe((v != null ? v : 20) / 1000, 0.02, 0, 1), t, TAU); break;
          case "release":    c.release.setTargetAtTime(safe((v != null ? v : 300) / 1000, 0.3, 0, 1), t, TAU); break;
          case "drive":      ws.curve = buildTubeCurve(v); break;
          case "warmth":     warmth.gain.setTargetAtTime(safe(safe(v, 0.5, 0, 1) * 6, 3, -24, 24), t, TAU); break;
          case "makeup":     mk.gain.setTargetAtTime(safe(Math.pow(10, safe(v, 0, -60, 24) / 20), 1, 0, 16), t, TAU); break;
          case "stereoLink": /* UI-only — see comment above */ break;
          default: break;
        } },
        dispose() { disposeNodes(inGain, c, ws, warmth, mk, inAn); },
        meters: { comp: c, analyserIn: inAn },
      };
    });
    if (fx.vocalComp?.enabled) install("vocalComp", (p) => {
      // Vocal-focused compressor with tilt EQ pre, simplified de-esser, main DynComp,
      // presence boost, and parallel dry/wet mix.
      //
      // Topology:
      //   in (split) → tiltHpf (low cut HPF ~80 Hz)
      //              → airShelf (high shelf @ 12 kHz, gain ∝ air * 8 dB)
      //              → deEss (peaking @ 7 kHz, Q=3, gain = -deEss * 8 dB) [FALLBACK — see notes]
      //              → mainComp (DynComp, vocal-tuned)
      //              → presence (peaking @ 3 kHz, Q=1, gain = presence * 6 dB)
      //              → wetGain ─╮
      //   in ────────── dryGain ┤── outNode
      //
      // FALLBACK NOTE: True frequency-selective de-essing requires a sidechain into
      // DynamicsCompressorNode, which Web Audio's standard node does not expose. We
      // approximate by placing a static peaking notch at 7 kHz pre-comp; the deEss
      // knob simply controls notch depth (linear in dB). For program-dependent
      // de-essing we'd need an AudioWorklet — out of scope for this batch.
      const inNode  = ctx.createGain(); setGainLinear(inNode.gain, 1);
      const outNode = ctx.createGain(); setGainLinear(outNode.gain, 1);

      // Tilt EQ pre-stage: low cut + air shelf.
      const tiltHpf = ctx.createBiquadFilter();
      tiltHpf.type = "highpass"; setFreq(tiltHpf.frequency, 80); setQ(tiltHpf.Q, 0.707);
      const airShelf = ctx.createBiquadFilter();
      airShelf.type = "highshelf"; setFreq(airShelf.frequency, 12000);
      setGainDb(airShelf.gain, safe(p.air != null ? p.air : 0.2, 0.2, 0, 1) * 8);

      // De-esser fallback: static peaking notch.
      const deEss = ctx.createBiquadFilter();
      deEss.type = "peaking"; setFreq(deEss.frequency, 7000); setQ(deEss.Q, 3);
      setGainDb(deEss.gain, -safe(p.deEss != null ? p.deEss : 0.4, 0.4, 0, 1) * 8);

      // Main vocal compressor.
      const mainComp = ctx.createDynamicsCompressor();
      setCompThresh(mainComp.threshold, p.threshold != null ? p.threshold : -16);
      setCompRatio(mainComp.ratio, p.ratio != null ? p.ratio : 3);
      setCompAttack(mainComp.attack, (p.attack != null ? p.attack : 5) / 1000);
      setCompRelease(mainComp.release, (p.release != null ? p.release : 80) / 1000);
      setCompKnee(mainComp.knee, 6);

      // Presence boost.
      const presence = ctx.createBiquadFilter();
      presence.type = "peaking"; setFreq(presence.frequency, 3000); setQ(presence.Q, 1);
      setGainDb(presence.gain, safe(p.presence != null ? p.presence : 0.3, 0.3, 0, 1) * 6);

      // Parallel mix.
      const wetGain = ctx.createGain();
      const dryGain = ctx.createGain();
      const initMix = safe((p.mix != null ? p.mix : 100) / 100, 1, 0, 1);
      setGainLinear(wetGain.gain, initMix);
      setGainLinear(dryGain.gain, 1 - initMix);

      // Wet path: in → tiltHpf → airShelf → deEss → mainComp → presence → wetGain → out.
      inNode.connect(tiltHpf); tiltHpf.connect(airShelf); airShelf.connect(deEss);
      deEss.connect(mainComp); mainComp.connect(presence); presence.connect(wetGain);
      wetGain.connect(outNode);
      // Dry path: in → dryGain → out.
      inNode.connect(dryGain); dryGain.connect(outNode);
      // Sibilance meter: 6 kHz bandpass tap on the input. Reflects high-freq
      // energy density so the LEDLadder lights up on actual sibilants.
      const sibBP = ctx.createBiquadFilter();
      sibBP.type = "bandpass"; setFreq(sibBP.frequency, 6000); setQ(sibBP.Q, 4);
      const sibAn = ctx.createAnalyser(); sibAn.fftSize = 256; sibAn.smoothingTimeConstant = 0.7;
      inNode.connect(sibBP); sibBP.connect(sibAn);

      return {
        inputNode: inNode, outputNode: outNode,
        setParam(n, v) { const t = ctx.currentTime; switch (n) {
          case "threshold": mainComp.threshold.setTargetAtTime(safe(v, -16, -100, 0), t, TAU); break;
          case "ratio":     mainComp.ratio.setTargetAtTime(safe(v, 3, 1, 20), t, TAU); break;
          case "attack":    mainComp.attack.setTargetAtTime(safe((v != null ? v : 5) / 1000, 0.005, 0, 1), t, TAU); break;
          case "release":   mainComp.release.setTargetAtTime(safe((v != null ? v : 80) / 1000, 0.08, 0, 1), t, TAU); break;
          case "deEss":     deEss.gain.setTargetAtTime(safe(-safe(v, 0.4, 0, 1) * 8, -3, -24, 24), t, TAU); break;
          case "presence":  presence.gain.setTargetAtTime(safe(safe(v, 0.3, 0, 1) * 6, 2, -24, 24), t, TAU); break;
          case "air":       airShelf.gain.setTargetAtTime(safe(safe(v, 0.2, 0, 1) * 8, 1.6, -24, 24), t, TAU); break;
          case "mix": {
            const m = safe((v != null ? v : 100) / 100, 1, 0, 1);
            wetGain.gain.setTargetAtTime(m, t, TAU);
            dryGain.gain.setTargetAtTime(1 - m, t, TAU);
            break;
          }
          default: break;
        } },
        dispose() { disposeNodes(inNode, tiltHpf, airShelf, deEss, mainComp, presence, wetGain, dryGain, outNode, sibBP, sibAn); },
        meters: { analyserSibilance: sibAn },
      };
    });
    if (fx.multiPress?.enabled) install("multiPress", (p) => {
      // Phase C2.1: 4-band parallel multiband compressor.
      // Topology: inBus → 4 parallel xover chains (LR-style cascaded LP/HP at
      // xover1/xover2/xover3) → 4 × DynamicsCompressor → 4 × makeup Gain → out.
      // UI keys: xover1/2/3, b1Thresh/b1Ratio/b1Gain ... b4Thresh/b4Ratio/b4Gain.
      const x1 = safe(p.xover1 != null ? p.xover1 : 100,  100,  20, 20000);
      const x2 = safe(p.xover2 != null ? p.xover2 : 1000, 1000, 20, 20000);
      const x3 = safe(p.xover3 != null ? p.xover3 : 8000, 8000, 20, 20000);
      const inBus = ctx.createGain();
      // Band 1 (sub/low): LP at x1.
      const b1lp1 = ctx.createBiquadFilter(); b1lp1.type = "lowpass"; setFreq(b1lp1.frequency, x1); setQ(b1lp1.Q, 0.707);
      const b1lp2 = ctx.createBiquadFilter(); b1lp2.type = "lowpass"; setFreq(b1lp2.frequency, x1); setQ(b1lp2.Q, 0.707);
      // Band 2 (low-mid): HP at x1, LP at x2.
      const b2hp1 = ctx.createBiquadFilter(); b2hp1.type = "highpass"; setFreq(b2hp1.frequency, x1); setQ(b2hp1.Q, 0.707);
      const b2hp2 = ctx.createBiquadFilter(); b2hp2.type = "highpass"; setFreq(b2hp2.frequency, x1); setQ(b2hp2.Q, 0.707);
      const b2lp1 = ctx.createBiquadFilter(); b2lp1.type = "lowpass"; setFreq(b2lp1.frequency, x2); setQ(b2lp1.Q, 0.707);
      const b2lp2 = ctx.createBiquadFilter(); b2lp2.type = "lowpass"; setFreq(b2lp2.frequency, x2); setQ(b2lp2.Q, 0.707);
      // Band 3 (high-mid): HP at x2, LP at x3.
      const b3hp1 = ctx.createBiquadFilter(); b3hp1.type = "highpass"; setFreq(b3hp1.frequency, x2); setQ(b3hp1.Q, 0.707);
      const b3hp2 = ctx.createBiquadFilter(); b3hp2.type = "highpass"; setFreq(b3hp2.frequency, x2); setQ(b3hp2.Q, 0.707);
      const b3lp1 = ctx.createBiquadFilter(); b3lp1.type = "lowpass"; setFreq(b3lp1.frequency, x3); setQ(b3lp1.Q, 0.707);
      const b3lp2 = ctx.createBiquadFilter(); b3lp2.type = "lowpass"; setFreq(b3lp2.frequency, x3); setQ(b3lp2.Q, 0.707);
      // Band 4 (air): HP at x3.
      const b4hp1 = ctx.createBiquadFilter(); b4hp1.type = "highpass"; setFreq(b4hp1.frequency, x3); setQ(b4hp1.Q, 0.707);
      const b4hp2 = ctx.createBiquadFilter(); b4hp2.type = "highpass"; setFreq(b4hp2.frequency, x3); setQ(b4hp2.Q, 0.707);
      // Per-band compressors.
      const c1 = ctx.createDynamicsCompressor();
      setCompThresh(c1.threshold, p.b1Thresh != null ? p.b1Thresh : -10);
      setCompRatio(c1.ratio, p.b1Ratio != null ? p.b1Ratio : 2);
      setCompAttack(c1.attack, 0.01); setCompRelease(c1.release, 0.1);
      const c2 = ctx.createDynamicsCompressor();
      setCompThresh(c2.threshold, p.b2Thresh != null ? p.b2Thresh : -10);
      setCompRatio(c2.ratio, p.b2Ratio != null ? p.b2Ratio : 2);
      setCompAttack(c2.attack, 0.01); setCompRelease(c2.release, 0.1);
      const c3 = ctx.createDynamicsCompressor();
      setCompThresh(c3.threshold, p.b3Thresh != null ? p.b3Thresh : -10);
      setCompRatio(c3.ratio, p.b3Ratio != null ? p.b3Ratio : 2);
      setCompAttack(c3.attack, 0.01); setCompRelease(c3.release, 0.1);
      const c4 = ctx.createDynamicsCompressor();
      setCompThresh(c4.threshold, p.b4Thresh != null ? p.b4Thresh : -10);
      setCompRatio(c4.ratio, p.b4Ratio != null ? p.b4Ratio : 2);
      setCompAttack(c4.attack, 0.01); setCompRelease(c4.release, 0.1);
      // Per-band makeup gain.
      const g1 = ctx.createGain(); setGainLinear(g1.gain, Math.pow(10, safe(p.b1Gain != null ? p.b1Gain : 0, 0, -24, 24) / 20));
      const g2 = ctx.createGain(); setGainLinear(g2.gain, Math.pow(10, safe(p.b2Gain != null ? p.b2Gain : 0, 0, -24, 24) / 20));
      const g3 = ctx.createGain(); setGainLinear(g3.gain, Math.pow(10, safe(p.b3Gain != null ? p.b3Gain : 0, 0, -24, 24) / 20));
      const g4 = ctx.createGain(); setGainLinear(g4.gain, Math.pow(10, safe(p.b4Gain != null ? p.b4Gain : 0, 0, -24, 24) / 20));
      const out = ctx.createGain();
      // Wire fan-out: inBus → 4 parallel band chains → out summer.
      inBus.connect(b1lp1); b1lp1.connect(b1lp2); b1lp2.connect(c1); c1.connect(g1); g1.connect(out);
      inBus.connect(b2hp1); b2hp1.connect(b2hp2); b2hp2.connect(b2lp1); b2lp1.connect(b2lp2); b2lp2.connect(c2); c2.connect(g2); g2.connect(out);
      inBus.connect(b3hp1); b3hp1.connect(b3hp2); b3hp2.connect(b3lp1); b3lp1.connect(b3lp2); b3lp2.connect(c3); c3.connect(g3); g3.connect(out);
      inBus.connect(b4hp1); b4hp1.connect(b4hp2); b4hp2.connect(c4); c4.connect(g4); g4.connect(out);
      return {
        inputNode: inBus, outputNode: out,
        setParam(n, v) { const t = ctx.currentTime; switch (n) {
          case "xover1": {
            const f = safe(v, 100, 20, 20000);
            b1lp1.frequency.setTargetAtTime(f, t, TAU); b1lp2.frequency.setTargetAtTime(f, t, TAU);
            b2hp1.frequency.setTargetAtTime(f, t, TAU); b2hp2.frequency.setTargetAtTime(f, t, TAU);
            break;
          }
          case "xover2": {
            const f = safe(v, 1000, 20, 20000);
            b2lp1.frequency.setTargetAtTime(f, t, TAU); b2lp2.frequency.setTargetAtTime(f, t, TAU);
            b3hp1.frequency.setTargetAtTime(f, t, TAU); b3hp2.frequency.setTargetAtTime(f, t, TAU);
            break;
          }
          case "xover3": {
            const f = safe(v, 8000, 20, 20000);
            b3lp1.frequency.setTargetAtTime(f, t, TAU); b3lp2.frequency.setTargetAtTime(f, t, TAU);
            b4hp1.frequency.setTargetAtTime(f, t, TAU); b4hp2.frequency.setTargetAtTime(f, t, TAU);
            break;
          }
          case "b1Thresh": c1.threshold.setTargetAtTime(safe(v, -20, -100, 0), t, TAU); break;
          case "b2Thresh": c2.threshold.setTargetAtTime(safe(v, -18, -100, 0), t, TAU); break;
          case "b3Thresh": c3.threshold.setTargetAtTime(safe(v, -16, -100, 0), t, TAU); break;
          case "b4Thresh": c4.threshold.setTargetAtTime(safe(v, -14, -100, 0), t, TAU); break;
          case "b1Ratio":  c1.ratio.setTargetAtTime(safe(v, 3, 1, 20), t, TAU); break;
          case "b2Ratio":  c2.ratio.setTargetAtTime(safe(v, 3, 1, 20), t, TAU); break;
          case "b3Ratio":  c3.ratio.setTargetAtTime(safe(v, 4, 1, 20), t, TAU); break;
          case "b4Ratio":  c4.ratio.setTargetAtTime(safe(v, 4, 1, 20), t, TAU); break;
          case "b1Gain":   g1.gain.setTargetAtTime(safe(Math.pow(10, safe(v, 0, -24, 24) / 20), 1, 0, 16), t, TAU); break;
          case "b2Gain":   g2.gain.setTargetAtTime(safe(Math.pow(10, safe(v, 0, -24, 24) / 20), 1, 0, 16), t, TAU); break;
          case "b3Gain":   g3.gain.setTargetAtTime(safe(Math.pow(10, safe(v, 0, -24, 24) / 20), 1, 0, 16), t, TAU); break;
          case "b4Gain":   g4.gain.setTargetAtTime(safe(Math.pow(10, safe(v, 0, -24, 24) / 20), 1, 0, 16), t, TAU); break;
          // Legacy aliases.
          case "lowThreshold":  c1.threshold.setTargetAtTime(safe(v, -20, -100, 0), t, TAU); break;
          case "highThreshold": c4.threshold.setTargetAtTime(safe(v, -14, -100, 0), t, TAU); break;
          default: break;
        } },
        dispose() {
          disposeNodes(inBus, b1lp1, b1lp2, b2hp1, b2hp2, b2lp1, b2lp2,
            b3hp1, b3hp2, b3lp1, b3lp2, b4hp1, b4hp2, c1, c2, c3, c4, g1, g2, g3, g4, out);
        },
        meters: { comps: [c1, c2, c3, c4] },
      };
    });
    if (fx.transGate?.enabled) install("transGate", (p) => {
      // Phase C2.3 rebuild: downward gate with sidechain-style HPF/LPF and lookahead.
      // Topology:
      //   in → lookaheadDelay → scHPF → scLPF → comp (high ratio) → out
      // True sidechain (separate detector path) needs an AudioWorklet — flagged
      // for Phase C5. For C2 we approximate by filtering the main path so the
      // comp gates on filtered energy. Knee acts as hysteresis. hold is folded
      // into release (proxy). range / flip flagged C5 (DynamicsCompressor cannot
      // implement true range floor or inverted ducker without a worklet).
      const inNode  = ctx.createGain(); setGainLinear(inNode.gain, 1);
      const outNode = ctx.createGain(); setGainLinear(outNode.gain, 1);
      const lookahead = ctx.createDelay(0.05);
      setTime(lookahead.delayTime, safe((p.lookahead != null ? p.lookahead : 1) / 1000, 0.001, 0, 0.05));
      const scHPF = ctx.createBiquadFilter(); scHPF.type = 'highpass';
      setFreq(scHPF.frequency, safe(p.scHPF != null ? p.scHPF : 80, 80, 20, 20000));
      setQ(scHPF.Q, 0.707);
      const scLPF = ctx.createBiquadFilter(); scLPF.type = 'lowpass';
      setFreq(scLPF.frequency, safe(p.scLPF != null ? p.scLPF : 8000, 8000, 20, 20000));
      setQ(scLPF.Q, 0.707);
      const comp = ctx.createDynamicsCompressor();
      setCompThresh(comp.threshold, p.threshold != null ? p.threshold : -40);
      setCompRatio(comp.ratio, 20);
      setCompKnee(comp.knee, safe(p.hysteresis != null ? p.hysteresis : 3, 3, 0, 40));
      setCompAttack(comp.attack, safe((p.attack != null ? p.attack : 1) / 1000, 0.001, 0, 1));
      const initHoldRel = ((p.hold != null ? p.hold : 50) + (p.release != null ? p.release : 100)) / 1000;
      setCompRelease(comp.release, safe(initHoldRel, 0.15, 0, 1));
      // Track current hold/release ms separately so we can recombine on knob change.
      let holdMs = p.hold != null ? p.hold : 50;
      let releaseMs = p.release != null ? p.release : 100;
      let flipMode = !!p.flip;
      inNode.connect(lookahead);
      lookahead.connect(scHPF);
      scHPF.connect(scLPF);
      scLPF.connect(comp);
      comp.connect(outNode);
      return {
        inputNode: inNode, outputNode: outNode,
        setParam(n, v) { const t = ctx.currentTime; switch (n) {
          case "threshold":  comp.threshold.setTargetAtTime(safe(v, -40, -100, 0), t, TAU); break;
          case "attack":     comp.attack.setTargetAtTime(safe((v || 1) / 1000, 0.001, 0, 1), t, TAU); break;
          case "hold":
            holdMs = safe(v, 50, 0, 2000);
            comp.release.setTargetAtTime(safe((holdMs + releaseMs) / 1000, 0.25, 0, 1), t, TAU);
            break;
          case "release":
            releaseMs = safe(v, 200, 10, 4000);
            comp.release.setTargetAtTime(safe((holdMs + releaseMs) / 1000, 0.25, 0, 1), t, TAU);
            break;
          case "range":
            // Phase C5: needs worklet for proper floor attenuation.
            break;
          case "hysteresis": comp.knee.setTargetAtTime(safe(v, 3, 0, 40), t, TAU); break;
          case "scHPF":      scHPF.frequency.setTargetAtTime(safe(v, 80, 20, 20000), t, TAU); break;
          case "scLPF":      scLPF.frequency.setTargetAtTime(safe(v, 8000, 20, 20000), t, TAU); break;
          case "lookahead":  lookahead.delayTime.setTargetAtTime(safe((v || 1) / 1000, 0.001, 0, 0.05), t, TAU); break;
          case "flip":
            // Phase C5: ducker (inverted gate) needs worklet.
            flipMode = !!v;
            break;
          default: break;
        } },
        dispose() { disposeNodes(inNode, lookahead, scHPF, scLPF, comp, outNode); },
      };
    });
    if (fx.brickWall?.enabled) install("brickWall", (p) => {
      const lim = ctx.createDynamicsCompressor();
      setCompThresh(lim.threshold, p.ceiling || -0.3); setCompRatio(lim.ratio, 20); setCompKnee(lim.knee, 0);
      setCompAttack(lim.attack, 0.001); setCompRelease(lim.release, 0.01);
      return {
        inputNode: lim, outputNode: lim,
        setParam(n, v) { if (n === "ceiling") lim.threshold.setTargetAtTime(safe(v, -0.3, -100, 0), ctx.currentTime, TAU); },
        dispose() { disposeNodes(lim); },
      };
    });
    if (fx.masterWall?.enabled) install("masterWall", (p) => {
      // Phase C5: proper lookahead brick-wall limiter via AudioWorklet.
      // Worklet does sample-accurate peak detection over a 5 ms ring buffer,
      // ducks gain BEFORE the peak hits, with 2× linear-interpolation oversampling
      // for inter-sample-peak (true peak) approximation. Final hard ceiling at
      // (ceiling + clipMargin) so output never exceeds.
      // Falls back to the C2.4 DelayNode + DynamicsCompressor topology if the
      // worklet fails to load.
      // Quality tag: ACCEPTABLE — 2× oversampling, no noise-shaped dither.
      // UI keys: ceiling (dB), lookahead (ms), release (ms), threshold (dB),
      //   clipMargin (dB headroom), truePeak (bool), dither (string — no-op),
      //   outputGain (dB).
      const initCeiling   = safe(p.ceiling   != null ? p.ceiling   : -0.3,  -0.3, -12, 0);
      const initThreshold = safe(p.threshold != null ? p.threshold : -1,    -1,   -24, 0);
      const initRelease   = safe(p.release   != null ? p.release   : 100,   100,  10, 1000);
      const initLookahead = safe(p.lookahead != null ? p.lookahead : 5,     5,    0, 10);
      const initClipMargin= safe(p.clipMargin!= null ? p.clipMargin: 0.3,   0.3,  0, 6);
      const initOutputGain= safe(p.outputGain!= null ? p.outputGain: 0,     0,    -12, 12);
      const initTruePeak  = (p.truePeak != null) ? (p.truePeak ? 1 : 0) : 1;

      const input  = ctx.createGain();
      const output = ctx.createGain();
      setGainLinear(output.gain, Math.pow(10, initOutputGain / 20));

      // ── Fallback path (Web Audio nodes, C2.4 topology) ─────────────────────
      const fbDelay = ctx.createDelay(0.05);
      setTime(fbDelay.delayTime, initLookahead / 1000);
      const fbLim = ctx.createDynamicsCompressor();
      setCompThresh(fbLim.threshold, initCeiling);
      setCompRatio(fbLim.ratio, 20); setCompKnee(fbLim.knee, 0);
      setCompAttack(fbLim.attack, 0.001);
      setCompRelease(fbLim.release, initRelease / 1000);
      const connectFallback = () => {
        try { input.disconnect(); } catch {}
        try { fbDelay.disconnect(); } catch {}
        try { fbLim.disconnect(); } catch {}
        input.connect(fbDelay); fbDelay.connect(fbLim); fbLim.connect(output);
      };
      connectFallback();

      // ── Worklet path ────────────────────────────────────────────────────────
      const WORKLET_NAME = 'spx-masterwall-limiter';
      let workletNode = null;
      const ensureWorklet = (() => {
        if (!ctx._spxWorkletPromises) ctx._spxWorkletPromises = new Map();
        if (ctx._spxWorkletPromises.has(WORKLET_NAME)) {
          return ctx._spxWorkletPromises.get(WORKLET_NAME);
        }
        const src = `
class SPXMasterWallProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: 'ceiling',    defaultValue: -0.3, minValue: -12,  maxValue: 0,    automationRate: 'k-rate' },
      { name: 'threshold',  defaultValue: -1,   minValue: -24,  maxValue: 0,    automationRate: 'k-rate' },
      { name: 'release',    defaultValue: 100,  minValue: 10,   maxValue: 1000, automationRate: 'k-rate' },
      { name: 'lookahead',  defaultValue: 5,    minValue: 0,    maxValue: 10,   automationRate: 'k-rate' },
      { name: 'clipMargin', defaultValue: 0.3,  minValue: 0,    maxValue: 6,    automationRate: 'k-rate' },
      { name: 'outputGain', defaultValue: 0,    minValue: -12,  maxValue: 12,   automationRate: 'k-rate' },
      { name: 'truePeak',   defaultValue: 1,    minValue: 0,    maxValue: 1,    automationRate: 'k-rate' },
    ];
  }
  constructor() {
    super();
    // Max 10 ms lookahead; 64-sample headroom for FIR/oversample slack
    this._maxLA = Math.ceil(0.010 * sampleRate) + 64;
    this._chBufs = [
      new Float32Array(this._maxLA),
      new Float32Array(this._maxLA),
    ];
    this._head = 0;
    // Peak envelope for lookahead (per-frame max of |sample|)
    this._peakBuf = new Float32Array(this._maxLA);
    this._gain = 1;       // current applied gain
    this._targetGain = 1; // target derived from upcoming peak
    this._prevSample = [0, 0]; // for 2× linear-interp oversample inter-sample peak
  }
  process(inputs, outputs, parameters) {
    const inp = inputs[0];
    const out = outputs[0];
    if (!out || !out[0]) return true;
    const inpL = inp && inp[0] ? inp[0] : null;
    const inpR = inp && inp[1] ? inp[1] : (inpL || null);
    const outL = out[0];
    const outR = out[1] || null;
    const N = outL.length;

    const ceilDb     = parameters.ceiling[0];
    const threshDb   = parameters.threshold[0];
    const relMs      = parameters.release[0];
    const laMs       = parameters.lookahead[0];
    const clipMargin = parameters.clipMargin[0];
    const outGainDb  = parameters.outputGain[0];
    const truePeak   = parameters.truePeak[0] >= 0.5;

    const ceilLin = Math.pow(10, ceilDb / 20);
    const threshLin = Math.pow(10, threshDb / 20);
    const hardClip = Math.pow(10, (ceilDb + clipMargin) / 20);
    const outGainLin = Math.pow(10, outGainDb / 20);
    const la = Math.max(1, Math.min(this._maxLA - 1, Math.ceil(laMs / 1000 * sampleRate)));
    // Release coefficient: per-sample exponential approach back to unity
    const relCoef = Math.exp(-1 / (Math.max(1, relMs) * 0.001 * sampleRate));
    // Attack: instant duck (limiter style)

    for (let i = 0; i < N; i++) {
      const sL = inpL ? inpL[i] : 0;
      const sR = inpR ? inpR[i] : sL;

      // Capture into per-channel ring buffers + peak buffer (max of |L|,|R|
      // plus 2× linear-interpolated halfway sample for inter-sample peak).
      this._chBufs[0][this._head] = sL;
      this._chBufs[1][this._head] = sR;

      let pk = Math.max(Math.abs(sL), Math.abs(sR));
      if (truePeak) {
        // Cheap 2× oversample: midpoint between previous sample and current.
        const midL = 0.5 * (this._prevSample[0] + sL);
        const midR = 0.5 * (this._prevSample[1] + sR);
        pk = Math.max(pk, Math.abs(midL), Math.abs(midR));
      }
      this._prevSample[0] = sL;
      this._prevSample[1] = sR;
      this._peakBuf[this._head] = pk;

      // Look ahead 'la' samples to find the maximum upcoming peak.
      let maxPk = 0;
      for (let k = 0; k < la; k++) {
        const idx = (this._head - k + this._maxLA) % this._maxLA;
        const v = this._peakBuf[idx];
        if (v > maxPk) maxPk = v;
      }
      // Required gain so maxPk * g <= ceilLin, but only attenuate when above
      // threshold (knee-less: once peaks exceed threshLin we duck).
      let needed = 1;
      if (maxPk > threshLin) {
        needed = ceilLin / Math.max(maxPk, 1e-9);
        if (needed > 1) needed = 1;
      }
      // Attack: instantaneous on duck-down.
      if (needed < this._gain) {
        this._gain = needed;
      } else {
        // Release: exponential approach to 1.0 (or current 'needed' if >gain).
        this._gain = relCoef * this._gain + (1 - relCoef) * Math.min(needed, 1);
      }

      // Read the delayed sample (at head - la), apply gain, hard-clip at margin.
      const rh = (this._head - la + this._maxLA) % this._maxLA;
      let yL = this._chBufs[0][rh] * this._gain * outGainLin;
      let yR = this._chBufs[1][rh] * this._gain * outGainLin;
      if (yL > hardClip) yL = hardClip; else if (yL < -hardClip) yL = -hardClip;
      if (yR > hardClip) yR = hardClip; else if (yR < -hardClip) yR = -hardClip;
      outL[i] = yL;
      if (outR) outR[i] = yR;

      this._head = (this._head + 1) % this._maxLA;
    }
    // Mirror to additional channels if present
    for (let c = 2; c < out.length; c++) out[c].set(outL);
    return true;
  }
}
registerProcessor('${WORKLET_NAME}', SPXMasterWallProcessor);
`;
        const promise = (async () => {
          try {
            const blob = new Blob([src], { type: 'application/javascript' });
            const url = URL.createObjectURL(blob);
            try { await ctx.audioWorklet.addModule(url); }
            finally { URL.revokeObjectURL(url); }
            return true;
          } catch (e) {
            if (String(e && e.message || e).includes('already')) return true;
            console.warn('[MasterWall] worklet load failed, using fallback:', e);
            return false;
          }
        })();
        ctx._spxWorkletPromises.set(WORKLET_NAME, promise);
        return promise;
      })();

      ensureWorklet.then((ok) => {
        if (!ok) return;
        try {
          const node = new AudioWorkletNode(ctx, WORKLET_NAME, {
            numberOfInputs: 1, numberOfOutputs: 1,
            outputChannelCount: [2],
          });
          const ap = (n, v) => { const par = node.parameters.get(n); if (par) par.setTargetAtTime(v, ctx.currentTime, 0.01); };
          ap('ceiling', initCeiling);
          ap('threshold', initThreshold);
          ap('release', initRelease);
          ap('lookahead', initLookahead);
          ap('clipMargin', initClipMargin);
          ap('outputGain', initOutputGain);
          ap('truePeak', initTruePeak);
          // Swap fallback path for worklet.
          try { input.disconnect(); } catch {}
          try { fbDelay.disconnect(); } catch {}
          try { fbLim.disconnect(); } catch {}
          input.connect(node); node.connect(output);
          // Reset output gain to 1 since worklet does outputGain internally.
          setGainLinear(output.gain, 1);
          workletNode = node;
        } catch (e) {
          console.warn('[MasterWall] worklet instantiation failed, staying on fallback:', e);
        }
      }).catch(() => {});

      const setAP = (name, value) => {
        if (!workletNode) return;
        const par = workletNode.parameters.get(name);
        if (par) par.setTargetAtTime(value, ctx.currentTime, 0.01);
      };

      return {
        inputNode: input, outputNode: output,
        setParam(n, v) { const t = ctx.currentTime; switch (n) {
          case "ceiling": {
            const cv = safe(v, -0.3, -12, 0);
            setAP('ceiling', cv);
            fbLim.threshold.setTargetAtTime(cv, t, TAU);
            break;
          }
          case "threshold": {
            const tv = safe(v, -6, -24, 0);
            setAP('threshold', tv);
            // Fallback compressor uses single threshold; honor whichever moved last.
            fbLim.threshold.setTargetAtTime(tv, t, TAU);
            break;
          }
          case "release": {
            const rv = safe(v, 100, 10, 1000);
            setAP('release', rv);
            fbLim.release.setTargetAtTime(rv / 1000, t, TAU);
            break;
          }
          case "lookahead": {
            const lv = safe(v, 5, 0, 10);
            setAP('lookahead', lv);
            fbDelay.delayTime.setTargetAtTime(lv / 1000, t, TAU);
            break;
          }
          case "clipMargin": setAP('clipMargin', safe(v, 0.3, 0, 6)); break;
          case "outputGain":
          case "gain": {
            const gv = safe(v, 0, -12, 12);
            setAP('outputGain', gv);
            if (!workletNode) {
              output.gain.setTargetAtTime(Math.pow(10, gv / 20), t, TAU);
            }
            break;
          }
          case "truePeak": setAP('truePeak', v ? 1 : 0); break;
          case "dither":   /* APPROXIMATE: noise-shaped dither not implemented */ break;
          default: break;
        } },
        dispose() {
          try { if (workletNode) workletNode.disconnect(); } catch {}
          disposeNodes(input, fbDelay, fbLim, output);
          workletNode = null;
        },
      };
    });
    if (fx.gainRider?.enabled) install("gainRider", (p) => {
      // UI param aliases: targetLevel→c.threshold, speed (0..1) → c.attack
      // (faster) + c.release (faster), smooth (0..1) → c.knee.
      // maxGain/minGain/lookahead/gateThresh: no available node — accepted as
      // no-ops so knobs do not crash.
      const c = ctx.createDynamicsCompressor();
      const initThresh = (p.targetLevel != null ? p.targetLevel : (p.target != null ? p.target : -10));
      setCompThresh(c.threshold, initThresh); setCompRatio(c.ratio, 2);
      const initSpeed = safe(p.speed != null ? p.speed : 0.95, 0.95, 0, 1);
      // speed=0 → slow (attack 200 ms, release 1000 ms); speed=1 → fast (10 ms, 100 ms)
      setCompAttack(c.attack, 0.2 - initSpeed * 0.19);
      setCompRelease(c.release, 1.0 - initSpeed * 0.9);
      setCompKnee(c.knee, safe(p.smooth != null ? p.smooth : 0.2, 0.2, 0, 1) * 30);
      return {
        inputNode: c, outputNode: c,
        setParam(n, v) { const t = ctx.currentTime; switch (n) {
          case "targetLevel":
          case "target":     c.threshold.setTargetAtTime(safe(v, -18, -100, 0), t, TAU); break;
          case "speed": {
            const s = safe(v, 0.5, 0, 1);
            c.attack.setTargetAtTime(safe(0.2 - s * 0.19, 0.1, 0, 1), t, TAU);
            c.release.setTargetAtTime(safe(1.0 - s * 0.9, 0.5, 0, 1), t, TAU);
            break;
          }
          case "smooth":     c.knee.setTargetAtTime(safe(safe(v, 0.7, 0, 1) * 30, 20, 0, 40), t, TAU); break;
          case "maxGain":    /* no makeup-gain node — accepted no-op */ break;
          case "minGain":    /* no min-gain node — accepted no-op */ break;
          case "lookahead":  /* no delay-line node — accepted no-op */ break;
          case "gateThresh": /* no gate node — accepted no-op */ break;
          default: break;
        } },
        dispose() { disposeNodes(c); },
      };
    });
    if (fx.transientShaper?.enabled) install("transientShaper", (p) => {
      // Phase C2 envelope-difference fake using two parallel DynamicsCompressors:
      //   fast comp (attack 1 ms, release 30 ms)  → emphasises transient envelope.
      //   slow comp (attack 30 ms, release 300 ms) → emphasises sustain envelope.
      // Topology:
      //   input ─┬─→ fastComp → fastGain  ──┐
      //          └─→ slowComp → slowGain  ──┴→ outGain
      // attack knob (-1..+1) rides fastGain (positive boosts attacks, negative cuts).
      // sustain knob (-1..+1) rides slowGain. speed (0..1) rescales both comps' attack/release.
      // Honest-fake limitation: without a worklet we cannot subtract the two envelope
      // signals, so this is parallel-blend rather than true difference shaping. The
      // perceptual outcome (more punch / more sustain) still matches user intent.
      // UI keys: attack (-1..+1), sustain (-1..+1), speed (0..1), outputGain (linear).
      const att0 = safe(p.attack != null ? p.attack : 0, 0, -1, 1);
      const sus0 = safe(p.sustain != null ? p.sustain : 0, 0, -1, 1);
      const spd0 = safe(p.speed != null ? p.speed : 0.5, 0.5, 0, 1);
      const fastAttack = (cur) => 0.001 + (1 - cur) * 0.005;   // 1..6 ms
      const fastRelease = (cur) => 0.02 + (1 - cur) * 0.05;    // 20..70 ms
      const slowAttack = (cur) => 0.02 + (1 - cur) * 0.05;     // 20..70 ms
      const slowRelease = (cur) => 0.2 + (1 - cur) * 0.4;      // 200..600 ms

      const fastC = ctx.createDynamicsCompressor();
      setCompThresh(fastC.threshold, -24); setCompRatio(fastC.ratio, 4); setCompKnee(fastC.knee, 6);
      setCompAttack(fastC.attack, fastAttack(spd0)); setCompRelease(fastC.release, fastRelease(spd0));
      const slowC = ctx.createDynamicsCompressor();
      setCompThresh(slowC.threshold, -24); setCompRatio(slowC.ratio, 2); setCompKnee(slowC.knee, 12);
      setCompAttack(slowC.attack, slowAttack(spd0)); setCompRelease(slowC.release, slowRelease(spd0));

      // Map knob (-1..+1) to gain ride: -1 → -6 dB, 0 → 0 dB, +1 → +6 dB.
      const dbFromKnob = (k) => k * 6;
      const fastG = ctx.createGain(); setGainLinear(fastG.gain, Math.pow(10, dbFromKnob(att0) / 20));
      const slowG = ctx.createGain(); setGainLinear(slowG.gain, Math.pow(10, dbFromKnob(sus0) / 20));
      const inBus = ctx.createGain(); setGainLinear(inBus.gain, 0.5); // -6 dB to keep parallel sum at unity headroom.
      const out = ctx.createGain();
      setGainLinear(out.gain, safe(p.outputGain != null ? p.outputGain : 1, 1, 0, 4));
      inBus.connect(fastC); fastC.connect(fastG); fastG.connect(out);
      inBus.connect(slowC); slowC.connect(slowG); slowG.connect(out);
      return {
        inputNode: inBus, outputNode: out,
        setParam(n, v) { const t = ctx.currentTime; switch (n) {
          case "attack":  fastG.gain.setTargetAtTime(safe(Math.pow(10, dbFromKnob(safe(v, 0, -1, 1)) / 20), 1, 0, 4), t, TAU); break;
          case "sustain": slowG.gain.setTargetAtTime(safe(Math.pow(10, dbFromKnob(safe(v, 0, -1, 1)) / 20), 1, 0, 4), t, TAU); break;
          case "speed": {
            const s = safe(v, 0.5, 0, 1);
            fastC.attack.setTargetAtTime(safe(fastAttack(s), 0.001, 0, 1), t, TAU);
            fastC.release.setTargetAtTime(safe(fastRelease(s), 0.05, 0, 1), t, TAU);
            slowC.attack.setTargetAtTime(safe(slowAttack(s), 0.05, 0, 1), t, TAU);
            slowC.release.setTargetAtTime(safe(slowRelease(s), 0.4, 0, 1), t, TAU);
            break;
          }
          case "outputGain": out.gain.setTargetAtTime(safe(v, 1, 0, 4), t, TAU); break;
          default: break;
        } },
        dispose() { disposeNodes(inBus, fastC, fastG, slowC, slowG, out); },
      };
    });
    if (fx.breathGate?.enabled) install("breathGate", (p) => {
      const g = ctx.createDynamicsCompressor();
      setCompThresh(g.threshold, p.threshold || -40); setCompRatio(g.ratio, 20); setCompKnee(g.knee, 0);
      setCompAttack(g.attack, 0.002); setCompRelease(g.release, 0.1);
      return {
        inputNode: g, outputNode: g,
        setParam(n, v) { if (n === "threshold") g.threshold.setTargetAtTime(safe(v, -45, -100, 0), ctx.currentTime, TAU); },
        dispose() { disposeNodes(g); },
      };
    });
    if (fx.sibilantCut?.enabled) install("sibilantCut", (p) => {
      // UI param aliases: freq→ds.frequency, bandwidth (0..1) → ds.Q
      // (narrow→wide), ratio (1..20) → static peak attenuation depth.
      // threshold/attackSpeed/mode/listenSC: no dynamic SC available — accepted
      // no-ops (static notch only; true dynamic de-ess would need new SC tree).
      const ds = ctx.createBiquadFilter(); ds.type = "peaking";
      setFreq(ds.frequency, (p.freq != null ? p.freq : (p.frequency != null ? p.frequency : 7000)));
      // bandwidth 0=narrow→Q≈10, 1=wide→Q≈0.5
      const initQ = 10 - safe(p.bandwidth != null ? p.bandwidth : 0.5, 0.5, 0, 1) * 9.5;
      setQ(ds.Q, initQ);
      // ratio→cut depth: ratio 1 → -1 dB, ratio 20 → -12 dB
      const initRatio = safe(p.ratio != null ? p.ratio : 3, 3, 1, 20);
      const initDepth = -((initRatio - 1) / 19) * 11 - 1;
      const initGainDb = (p.amount != null) ? -Math.abs(p.amount) : initDepth;
      setGainDb(ds.gain, initGainDb);
      return {
        inputNode: ds, outputNode: ds,
        setParam(n, v) { const t = ctx.currentTime; switch (n) {
          case "freq":
          case "frequency":   ds.frequency.setTargetAtTime(safe(v, 7000, 20, 20000), t, TAU); break;
          case "bandwidth":   ds.Q.setTargetAtTime(safe(10 - safe(v, 0.5, 0, 1) * 9.5, 5, 0.0001, 1000), t, TAU); break;
          case "ratio": {
            const r = safe(v, 6, 1, 20);
            ds.gain.setTargetAtTime(safe(-((r - 1) / 19) * 11 - 1, -6, -60, 0), t, TAU);
            break;
          }
          case "amount":      ds.gain.setTargetAtTime(safe(-Math.abs(v ?? 6), -6, -60, 0), t, TAU); break;
          case "threshold":   /* no dynamic SC node — accepted no-op */ break;
          case "attackSpeed": /* no envelope follower — accepted no-op */ break;
          case "mode":        /* dynamic/broadband/split — needs SC tree (Phase C) */ break;
          case "listenSC":    /* SC monitor needs split — accepted no-op */ break;
          default: break;
        } },
        dispose() { disposeNodes(ds); },
      };
    });
    if (fx.drumEnhancer?.enabled) install("drumEnhancer", (p) => {
      // Phase C2: punch peak (80Hz), snap peak (6kHz), glue compressor threshold,
      // sub lowshelf (60Hz), air highshelf (10kHz), outputGain.
      const c = ctx.createDynamicsCompressor();
      // glue 0..1 → threshold -8..-30 dB (more glue = lower threshold = more comp).
      const glueThresh = (v) => -8 - safe(v, 0, 0, 1) * 22;
      setCompThresh(c.threshold, glueThresh(p.glue));
      setCompRatio(c.ratio, 4); setCompAttack(c.attack, 0.001); setCompRelease(c.release, 0.05);
      const sub = ctx.createBiquadFilter(); sub.type = "lowshelf"; setFreq(sub.frequency, 60); setGainDb(sub.gain, safe(p.sub, 0, 0, 1) * 9);
      const lo = ctx.createBiquadFilter(); lo.type = "peaking"; setFreq(lo.frequency, 80); setQ(lo.Q, 0.8); setGainDb(lo.gain, safe(p.punch, 0, 0, 1) * 6);
      const hi = ctx.createBiquadFilter(); hi.type = "peaking"; setFreq(hi.frequency, 6000); setQ(hi.Q, 1); setGainDb(hi.gain, safe(p.snap, 0, 0, 1) * 4);
      const air = ctx.createBiquadFilter(); air.type = "highshelf"; setFreq(air.frequency, 10000); setGainDb(air.gain, safe(p.air, 0, 0, 1) * 6);
      const og = ctx.createGain(); setGainLinear(og.gain, safe(p.outputGain, 1, 0, 4));
      c.connect(sub); sub.connect(lo); lo.connect(hi); hi.connect(air); air.connect(og);
      return {
        inputNode: c, outputNode: og,
        setParam(n, v) { const t = ctx.currentTime; switch (n) {
          case "punch":      lo.gain.setTargetAtTime(safe(safe(v, 0.5, 0, 1) * 6, 3, -60, 24), t, TAU); break;
          case "snap":       hi.gain.setTargetAtTime(safe(safe(v, 0.4, 0, 1) * 4, 1.6, -60, 24), t, TAU); break;
          case "glue":       c.threshold.setTargetAtTime(safe(glueThresh(v), -16, -100, 0), t, TAU); break;
          case "sub":        sub.gain.setTargetAtTime(safe(safe(v, 0.3, 0, 1) * 9, 2.7, -60, 24), t, TAU); break;
          case "air":        air.gain.setTargetAtTime(safe(safe(v, 0.3, 0, 1) * 6, 1.8, -60, 24), t, TAU); break;
          case "outputGain": og.gain.setTargetAtTime(safe(v, 1, 0, 4), t, TAU); break;
          default: break;
        } },
        dispose() { disposeNodes(c, sub, lo, hi, air, og); },
      };
    });
    if (fx.midSideComp?.enabled) install("midSideComp", (p) => {
      // Approximation: UI promises true M/S split, engine is a single
      // compressor driven by the MID-channel knobs only. side*/makeup require
      // a real M/S decode (channelSplitter + matrix) — Phase C.
      const c = ctx.createDynamicsCompressor();
      setCompThresh(c.threshold, p.midThresh != null ? p.midThresh : -10);
      setCompRatio(c.ratio, p.midRatio != null ? p.midRatio : 2);
      setCompAttack(c.attack, safe((p.attack != null ? p.attack : 10) / 1000, 0.01, 0, 1));
      setCompRelease(c.release, safe((p.release != null ? p.release : 100) / 1000, 0.1, 0, 1));
      return {
        inputNode: c, outputNode: c,
        setParam(n, v) { const t = ctx.currentTime; switch (n) {
          case "midThresh": c.threshold.setTargetAtTime(safe(v, -18, -100, 0), t, TAU); break;
          case "midRatio":  c.ratio.setTargetAtTime(safe(v, 3, 1, 20), t, TAU); break;
          case "attack":    c.attack.setTargetAtTime(safe((v || 0) / 1000, 0.005, 0, 1), t, TAU); break;
          case "release":   c.release.setTargetAtTime(safe((v || 0) / 1000, 0.1, 0, 1), t, TAU); break;
          // Phase C: sideThresh, sideRatio, makeup require true M/S split.
          case "sideThresh": case "sideRatio": case "makeup": break;
          default: break;
        } },
        dispose() { disposeNodes(c); },
      };
    });
    if (fx.multibandLimiter?.enabled) install("multibandLimiter", (p) => {
      // Phase C2.1: 4-band limiter with simple delay-line "lookahead".
      // True sample-accurate lookahead requires an AudioWorklet (Phase C5);
      // here we use a fixed DelayNode (lookahead ms) on the band chains so
      // the limiter sees a delayed signal, plus DynamicsCompressor with
      // ratio 20 + ~0 ms attack to act as a brick-wall limiter per band.
      // UI keys: ceiling (-6..0 dB), xover1/2/3, lookahead (ms; cosmetic — fixed delay).
      const initLookaheadMs = safe(p.lookahead != null ? p.lookahead : 3, 3, 0, 10);
      const initLookaheadS = initLookaheadMs / 1000;
      const x1 = safe(p.xover1 != null ? p.xover1 : 200,  200,  20, 20000);
      const x2 = safe(p.xover2 != null ? p.xover2 : 2000, 2000, 20, 20000);
      const x3 = safe(p.xover3 != null ? p.xover3 : 8000, 8000, 20, 20000);
      const initCeiling = safe(p.ceiling != null ? p.ceiling : -0.3, -0.3, -6, 0);
      const inBus = ctx.createGain();
      // Lookahead delay applied before the split.
      const dly = ctx.createDelay(0.05); setTime(dly.delayTime, initLookaheadS);
      // Band 1: LP at x1.
      const b1lp1 = ctx.createBiquadFilter(); b1lp1.type = "lowpass"; setFreq(b1lp1.frequency, x1); setQ(b1lp1.Q, 0.707);
      const b1lp2 = ctx.createBiquadFilter(); b1lp2.type = "lowpass"; setFreq(b1lp2.frequency, x1); setQ(b1lp2.Q, 0.707);
      // Band 2: HP at x1, LP at x2.
      const b2hp1 = ctx.createBiquadFilter(); b2hp1.type = "highpass"; setFreq(b2hp1.frequency, x1); setQ(b2hp1.Q, 0.707);
      const b2hp2 = ctx.createBiquadFilter(); b2hp2.type = "highpass"; setFreq(b2hp2.frequency, x1); setQ(b2hp2.Q, 0.707);
      const b2lp1 = ctx.createBiquadFilter(); b2lp1.type = "lowpass"; setFreq(b2lp1.frequency, x2); setQ(b2lp1.Q, 0.707);
      const b2lp2 = ctx.createBiquadFilter(); b2lp2.type = "lowpass"; setFreq(b2lp2.frequency, x2); setQ(b2lp2.Q, 0.707);
      // Band 3: HP at x2, LP at x3.
      const b3hp1 = ctx.createBiquadFilter(); b3hp1.type = "highpass"; setFreq(b3hp1.frequency, x2); setQ(b3hp1.Q, 0.707);
      const b3hp2 = ctx.createBiquadFilter(); b3hp2.type = "highpass"; setFreq(b3hp2.frequency, x2); setQ(b3hp2.Q, 0.707);
      const b3lp1 = ctx.createBiquadFilter(); b3lp1.type = "lowpass"; setFreq(b3lp1.frequency, x3); setQ(b3lp1.Q, 0.707);
      const b3lp2 = ctx.createBiquadFilter(); b3lp2.type = "lowpass"; setFreq(b3lp2.frequency, x3); setQ(b3lp2.Q, 0.707);
      // Band 4: HP at x3.
      const b4hp1 = ctx.createBiquadFilter(); b4hp1.type = "highpass"; setFreq(b4hp1.frequency, x3); setQ(b4hp1.Q, 0.707);
      const b4hp2 = ctx.createBiquadFilter(); b4hp2.type = "highpass"; setFreq(b4hp2.frequency, x3); setQ(b4hp2.Q, 0.707);
      // Per-band brick-wall limiters.
      const mkLim = () => {
        const c = ctx.createDynamicsCompressor();
        setCompThresh(c.threshold, initCeiling);
        setCompRatio(c.ratio, 20); setCompKnee(c.knee, 0);
        setCompAttack(c.attack, 0.0005); setCompRelease(c.release, 0.1);
        return c;
      };
      const l1 = mkLim(); const l2 = mkLim(); const l3 = mkLim(); const l4 = mkLim();
      const out = ctx.createGain();
      // Wire: inBus → dly → 4 parallel band chains → out.
      inBus.connect(dly);
      dly.connect(b1lp1); b1lp1.connect(b1lp2); b1lp2.connect(l1); l1.connect(out);
      dly.connect(b2hp1); b2hp1.connect(b2hp2); b2hp2.connect(b2lp1); b2lp1.connect(b2lp2); b2lp2.connect(l2); l2.connect(out);
      dly.connect(b3hp1); b3hp1.connect(b3hp2); b3hp2.connect(b3lp1); b3lp1.connect(b3lp2); b3lp2.connect(l3); l3.connect(out);
      dly.connect(b4hp1); b4hp1.connect(b4hp2); b4hp2.connect(l4); l4.connect(out);
      return {
        inputNode: inBus, outputNode: out,
        setParam(n, v) { const t = ctx.currentTime; switch (n) {
          case "ceiling": {
            const c = safe(v, -0.3, -6, 0);
            l1.threshold.setTargetAtTime(c, t, TAU);
            l2.threshold.setTargetAtTime(c, t, TAU);
            l3.threshold.setTargetAtTime(c, t, TAU);
            l4.threshold.setTargetAtTime(c, t, TAU);
            break;
          }
          case "lookahead": {
            // 0..10 ms → 0..0.01 s. Note: this is a pre-split delay, not true
            // sample-accurate lookahead (which would need a worklet sidechain).
            dly.delayTime.setTargetAtTime(safe(safe(v, 3, 0, 10) / 1000, 0.003, 0, 0.05), t, TAU);
            break;
          }
          case "xover1": {
            const f = safe(v, 200, 20, 20000);
            b1lp1.frequency.setTargetAtTime(f, t, TAU); b1lp2.frequency.setTargetAtTime(f, t, TAU);
            b2hp1.frequency.setTargetAtTime(f, t, TAU); b2hp2.frequency.setTargetAtTime(f, t, TAU);
            break;
          }
          case "xover2": {
            const f = safe(v, 2000, 20, 20000);
            b2lp1.frequency.setTargetAtTime(f, t, TAU); b2lp2.frequency.setTargetAtTime(f, t, TAU);
            b3hp1.frequency.setTargetAtTime(f, t, TAU); b3hp2.frequency.setTargetAtTime(f, t, TAU);
            break;
          }
          case "xover3": {
            const f = safe(v, 8000, 20, 20000);
            b3lp1.frequency.setTargetAtTime(f, t, TAU); b3lp2.frequency.setTargetAtTime(f, t, TAU);
            b4hp1.frequency.setTargetAtTime(f, t, TAU); b4hp2.frequency.setTargetAtTime(f, t, TAU);
            break;
          }
          default: break;
        } },
        dispose() {
          disposeNodes(inBus, dly, b1lp1, b1lp2, b2hp1, b2hp2, b2lp1, b2lp2,
            b3hp1, b3hp2, b3lp1, b3lp2, b4hp1, b4hp2, l1, l2, l3, l4, out);
        },
      };
    });

    // ── SPX EQ ──
    if (fx.ironBand?.enabled) install("ironBand", makeIronBand);
    if (fx.spectraCurve?.enabled) install("spectraCurve", (p) => {
      // Variable-band parametric EQ. Live param updates ramp the biquad params
      // of each band keyed by index — UI emits onChange("bands", newArray) on
      // any band edit, so we re-derive node state on bands changes. Adding/
      // removing bands at runtime requires a chain rebuild (toggle-equivalent).
      const bands = Array.isArray(p.bands) ? p.bands : [];
      const filters = bands.map(b => {
        const ty = b.type === "peak" ? "peaking" : (b.type || "peaking");
        const f = ctx.createBiquadFilter(); f.type = ty;
        setFreq(f.frequency, b.freq || 1000); setQ(f.Q, b.q || 1);
        if (ty === "peaking" || ty === "lowshelf" || ty === "highshelf") setGainDb(f.gain, b.gain || 0);
        return f;
      });
      // Wire serial chain (or use a passthrough if empty so the chain stays connected).
      const head = ctx.createGain(); setGainLinear(head.gain, 1);
      const tail = ctx.createGain(); setGainLinear(tail.gain, 1);
      let prev = head;
      for (const f of filters) { prev.connect(f); prev = f; }
      prev.connect(tail);
      return {
        inputNode: head, outputNode: tail,
        setParam(n, v) {
          const t = ctx.currentTime;
          if (n === "bands" && Array.isArray(v)) {
            v.forEach((b, i) => {
              const f = filters[i]; if (!f) return;
              if (Number.isFinite(b.freq))  f.frequency.setTargetAtTime(safe(b.freq, 1000, 20, 20000), t, TAU);
              if (Number.isFinite(b.q))     f.Q.setTargetAtTime(safe(b.q, 1, 0.0001, 1000), t, TAU);
              if (Number.isFinite(b.gain) && (f.type === "peaking" || f.type === "lowshelf" || f.type === "highshelf")) {
                f.gain.setTargetAtTime(safe(b.gain, 0, -60, 24), t, TAU);
              }
            });
          }
        },
        dispose() { disposeNodes(head, tail, ...filters); },
      };
    });
    if (fx.stereoForge?.enabled) install("stereoForge", (p) => {
      // UI emits width on 0-200 scale (50=mono, 100=passthrough, 200=2x). Divide by 100.
      const g = ctx.createGain(); setGainLinear(g.gain, (p.width != null ? p.width : 100) / 100);
      return {
        inputNode: g, outputNode: g,
        setParam(n, v) { if (n === "width") g.gain.setTargetAtTime(safe((v != null ? v : 100) / 100, 1, 0, 4), ctx.currentTime, TAU); },
        dispose() { disposeNodes(g); },
      };
    });
    if (fx.gainStager?.enabled) install("gainStager", (p) => {
      // UI emits linear `gain` (0..4, 1=unity) and `trim` in dB (-24..+24).
      // Combined factor = gain * 10^(trim/20). Other UI keys (targetDb, phase,
      // rmsDb, peakDb) are meter/state — left as dead cases.
      const initGain = safe(p.gain != null ? p.gain : 1, 1, 0, 4);
      const initTrim = Math.pow(10, safe(p.trim || 0, 0, -24, 24) / 20);
      const g = ctx.createGain(); setGainLinear(g.gain, initGain * initTrim);
      let curGain = initGain, curTrim = initTrim;
      return {
        inputNode: g, outputNode: g,
        setParam(n, v) { const t = ctx.currentTime; switch (n) {
          case "gain": curGain = safe(v, 1, 0, 4); g.gain.setTargetAtTime(safe(curGain * curTrim, 1, 0, 16), t, TAU); break;
          case "trim": curTrim = Math.pow(10, safe(v, 0, -24, 24) / 20); g.gain.setTargetAtTime(safe(curGain * curTrim, 1, 0, 16), t, TAU); break;
          // Meter/state knobs — not driven into the audio graph.
          case "targetDb": case "phase": case "rmsDb": case "peakDb": break;
          default: break;
        } },
        dispose() { disposeNodes(g); },
      };
    });
    if (fx.dynamicEQ?.enabled) install("dynamicEQ", (p) => {
      // UI promises 5 bands (each with freq/gain/q/threshold/ratio/attack/release/dynamic/type).
      // Engine here is a single compressor → peaking filter (one band only).
      // Compromise: bind the UI's currently-selected band to this single engine
      // band. Switching bands re-points the engine at the newly-selected band.
      // Phase C: build a real 5-band parallel topology (5x compressor+filter
      // with channel-merger output) when this becomes a release blocker.
      const c = ctx.createDynamicsCompressor();
      const f1 = ctx.createBiquadFilter(); f1.type = "peaking";
      // Track the currently-selected band index so `bands` array updates know
      // which entry to apply.
      let curBand = (p.selectedBand != null) ? safe(p.selectedBand, 0, 0, 4) : 0;
      const initBands = Array.isArray(p.bands) ? p.bands : null;
      const seedBand = initBands && initBands[curBand] ? initBands[curBand] : { freq: 1000, q: 1, gain: 0, threshold: -20, ratio: 2, attack: 10, release: 100 };
      setCompThresh(c.threshold, seedBand.threshold != null ? seedBand.threshold : (p.threshold || -20));
      setCompRatio(c.ratio, safe(seedBand.ratio || 2, 2, 1, 20));
      setCompAttack(c.attack, safe((seedBand.attack || 10) / 1000, 0.01, 0, 1));
      setCompRelease(c.release, safe((seedBand.release || 100) / 1000, 0.1, 0, 1));
      setFreq(f1.frequency, seedBand.freq || p.frequency || 1000);
      setQ(f1.Q, seedBand.q || p.q || 1);
      setGainDb(f1.gain, seedBand.gain != null ? seedBand.gain : (p.gain || 0));
      c.connect(f1);
      const applyBand = (b) => {
        if (!b) return;
        const t = ctx.currentTime;
        f1.frequency.setTargetAtTime(safe(b.freq, 1000, 20, 20000), t, TAU);
        f1.Q.setTargetAtTime(safe(b.q, 1, 0.0001, 1000), t, TAU);
        f1.gain.setTargetAtTime(safe(b.gain, 0, -60, 24), t, TAU);
        c.threshold.setTargetAtTime(safe(b.threshold, -20, -100, 0), t, TAU);
        c.ratio.setTargetAtTime(safe(b.ratio, 2, 1, 20), t, TAU);
        c.attack.setTargetAtTime(safe((b.attack != null ? b.attack : 10) / 1000, 0.01, 0, 1), t, TAU);
        c.release.setTargetAtTime(safe((b.release != null ? b.release : 100) / 1000, 0.1, 0, 1), t, TAU);
      };
      return {
        inputNode: c, outputNode: f1,
        setParam(n, v) { const t = ctx.currentTime; switch (n) {
          case "selectedBand": {
            curBand = safe(v, 0, 0, 4);
            // No bands array reference here — wait for the next `bands` push.
            break;
          }
          case "bands": {
            if (Array.isArray(v) && v[curBand]) applyBand(v[curBand]);
            break;
          }
          // Legacy single-value cases (kept so old presets still work).
          case "frequency": f1.frequency.setTargetAtTime(safe(v, 1000, 20, 20000), t, TAU); break;
          case "q":         f1.Q.setTargetAtTime(safe(v, 1, 0.0001, 1000), t, TAU); break;
          case "gain":      f1.gain.setTargetAtTime(safe(v, 0, -60, 24), t, TAU); break;
          case "threshold": c.threshold.setTargetAtTime(safe(v, -20, -100, 0), t, TAU); break;
          default: break;
        } },
        dispose() { disposeNodes(c, f1); },
      };
    });
    if (fx.midSideEQ?.enabled) install("midSideEQ", (p) => {
      // Phase C2.1: real M/S encode → 4-band peaking EQ on Mid + 4-band peaking
      // EQ on Side → M/S decode.
      // Mid bands: midLowGain (100 Hz), midLowMidGain (400 Hz), midHiMidGain (3 kHz), midHiGain (10 kHz).
      // Side bands: sideLowGain, sideLowMidGain, sideHiMidGain, sideHiGain (same freqs).
      const inSplitter = ctx.createChannelSplitter(2);
      const outMerger  = ctx.createChannelMerger(2);
      // Encode M=(L+R)*0.5
      const midSum = ctx.createGain(); midSum.gain.value = 0.5;
      inSplitter.connect(midSum, 0); inSplitter.connect(midSum, 1);
      // Encode S=(L-R)*0.5
      const rInvert = ctx.createGain(); rInvert.gain.value = -1;
      const sideSum = ctx.createGain(); sideSum.gain.value = 0.5;
      inSplitter.connect(sideSum, 0);
      inSplitter.connect(rInvert, 1); rInvert.connect(sideSum);
      // Mid 4-band peaking EQ.
      const mLo  = ctx.createBiquadFilter(); mLo.type  = "peaking"; setFreq(mLo.frequency, 100);  setQ(mLo.Q, 1.0); setGainDb(mLo.gain, safe(p.midLowGain    != null ? p.midLowGain    : (p.midGain || 0), 0, -24, 24));
      const mLM  = ctx.createBiquadFilter(); mLM.type  = "peaking"; setFreq(mLM.frequency, 400);  setQ(mLM.Q, 1.0); setGainDb(mLM.gain, safe(p.midLowMidGain != null ? p.midLowMidGain : 0, 0, -24, 24));
      const mHM  = ctx.createBiquadFilter(); mHM.type  = "peaking"; setFreq(mHM.frequency, 3000); setQ(mHM.Q, 1.0); setGainDb(mHM.gain, safe(p.midHiMidGain  != null ? p.midHiMidGain  : 0, 0, -24, 24));
      const mHi  = ctx.createBiquadFilter(); mHi.type  = "peaking"; setFreq(mHi.frequency, 10000);setQ(mHi.Q, 1.0); setGainDb(mHi.gain, safe(p.midHiGain     != null ? p.midHiGain     : 0, 0, -24, 24));
      midSum.connect(mLo); mLo.connect(mLM); mLM.connect(mHM); mHM.connect(mHi);
      // Side 4-band peaking EQ.
      const sLo  = ctx.createBiquadFilter(); sLo.type  = "peaking"; setFreq(sLo.frequency, 100);  setQ(sLo.Q, 1.0); setGainDb(sLo.gain, safe(p.sideLowGain    != null ? p.sideLowGain    : (p.sideGain || 0), 0, -24, 24));
      const sLM  = ctx.createBiquadFilter(); sLM.type  = "peaking"; setFreq(sLM.frequency, 400);  setQ(sLM.Q, 1.0); setGainDb(sLM.gain, safe(p.sideLowMidGain != null ? p.sideLowMidGain : 0, 0, -24, 24));
      const sHM  = ctx.createBiquadFilter(); sHM.type  = "peaking"; setFreq(sHM.frequency, 3000); setQ(sHM.Q, 1.0); setGainDb(sHM.gain, safe(p.sideHiMidGain  != null ? p.sideHiMidGain  : 0, 0, -24, 24));
      const sHi  = ctx.createBiquadFilter(); sHi.type  = "peaking"; setFreq(sHi.frequency, 10000);setQ(sHi.Q, 1.0); setGainDb(sHi.gain, safe(p.sideHiGain     != null ? p.sideHiGain     : 0, 0, -24, 24));
      sideSum.connect(sLo); sLo.connect(sLM); sLM.connect(sHM); sHM.connect(sHi);
      // Decode: L = M + S, R = M - S.
      const sInvOut = ctx.createGain(); sInvOut.gain.value = -1;
      sHi.connect(sInvOut);
      const lOut = ctx.createGain();
      const rOut = ctx.createGain();
      mHi.connect(lOut); sHi.connect(lOut);
      mHi.connect(rOut); sInvOut.connect(rOut);
      lOut.connect(outMerger, 0, 0);
      rOut.connect(outMerger, 0, 1);
      // Optional center-freq adjustments via legacy keys.
      return {
        inputNode: inSplitter, outputNode: outMerger,
        setParam(n, v) { const t = ctx.currentTime; switch (n) {
          case "midLowGain":     mLo.gain.setTargetAtTime(safe(v, 0, -24, 24), t, TAU); break;
          case "midLowMidGain":  mLM.gain.setTargetAtTime(safe(v, 0, -24, 24), t, TAU); break;
          case "midHiMidGain":   mHM.gain.setTargetAtTime(safe(v, 0, -24, 24), t, TAU); break;
          case "midHiGain":      mHi.gain.setTargetAtTime(safe(v, 0, -24, 24), t, TAU); break;
          case "sideLowGain":    sLo.gain.setTargetAtTime(safe(v, 0, -24, 24), t, TAU); break;
          case "sideLowMidGain": sLM.gain.setTargetAtTime(safe(v, 0, -24, 24), t, TAU); break;
          case "sideHiMidGain":  sHM.gain.setTargetAtTime(safe(v, 0, -24, 24), t, TAU); break;
          case "sideHiGain":     sHi.gain.setTargetAtTime(safe(v, 0, -24, 24), t, TAU); break;
          // Legacy single-band aliases.
          case "midFreq":  mLM.frequency.setTargetAtTime(safe(v, 400, 20, 20000), t, TAU); break;
          case "midGain":  mLM.gain.setTargetAtTime(safe(v, 0, -24, 24), t, TAU); break;
          case "sideFreq": sLM.frequency.setTargetAtTime(safe(v, 400, 20, 20000), t, TAU); break;
          case "sideGain": sLM.gain.setTargetAtTime(safe(v, 0, -24, 24), t, TAU); break;
          default: break;
        } },
        dispose() {
          disposeNodes(inSplitter, midSum, rInvert, sideSum,
            mLo, mLM, mHM, mHi, sLo, sLM, sHM, sHi,
            sInvOut, lOut, rOut, outMerger);
        },
      };
    });

    // ── SPX REVERB ──
    // Convolver-based factory helper: pre→conv→[extras]→mix-gain in serial,
    // matching the legacy chain shape. decay knob regens IR (audible click —
    // mirrors PluginHost ReverbPlugin); mix/preDelay/extras ramp smoothly.
    if (fx.hallForgeS?.enabled) install("hallForgeS", (p) => {
      const pre = ctx.createDelay(0.1); setTime(pre.delayTime, p.preDelay || 0.02);
      const conv = ctx.createConvolver(); conv.buffer = getReverbBuf(ctx, p.decay || 2.0);
      const g = ctx.createGain(); g.gain.value = normalizeMix(p.mix, 0);
      pre.connect(conv); conv.connect(g);
      return {
        inputNode: pre, outputNode: g,
        setParam(n, v) { const t = ctx.currentTime; switch (n) {
          case "decay":    conv.buffer = getReverbBuf(ctx, safe(v, 2.0, 0.05, 20)); break;
          case "preDelay": pre.delayTime.setTargetAtTime(safe(v, 0.02, 0, 0.1), t, TAU); break;
          case "mix":      setReverbMix(g.gain, v); break;
          default: break;
        } },
        dispose() { disposeNodes(pre, conv, g); },
      };
    });
    if (fx.hallForgeL?.enabled) install("hallForgeL", (p) => {
      const pre = ctx.createDelay(0.1); setTime(pre.delayTime, p.preDelay || 0.04);
      const conv = ctx.createConvolver(); conv.buffer = getReverbBuf(ctx, p.decay || 2.0);
      const g = ctx.createGain(); g.gain.value = normalizeMix(p.mix, 0);
      pre.connect(conv); conv.connect(g);
      return {
        inputNode: pre, outputNode: g,
        setParam(n, v) { const t = ctx.currentTime; switch (n) {
          case "decay":    conv.buffer = getReverbBuf(ctx, safe(v, 2.0, 0.05, 20)); break;
          case "preDelay": pre.delayTime.setTargetAtTime(safe(v, 0.04, 0, 0.1), t, TAU); break;
          case "mix":      setReverbMix(g.gain, v); break;
          default: break;
        } },
        dispose() { disposeNodes(pre, conv, g); },
      };
    });
    if (fx.gateVerb?.enabled) install("gateVerb", (p) => {
      // Phase F4-A.5 Batch 2 — gateVerb REBUILD.
      // Old factory placed gate AFTER convolver, so the gate sat on the wet signal and
      // never closed cleanly (the long convolver tail kept the gate input above
      // threshold). New topology: dry-side gate BEFORE the convolver — when the input
      // (the source) drops below threshold, the gate clamps the convolver's input to
      // silence so the reverb tail decays naturally and no further wet energy is
      // produced. This is the "honest fallback" approach (DynamicsCompressorNode with
      // ratio=20, knee=0, attack=1ms, release=gateDecay/1000) noted in the spec.
      // Gate sits dry-side on the convolver input only; the wet output has its own
      // mix gain (this is a wet-only insert — input → conv → wet).
      const gateThreshInit = safe(p.gateThresh, -40, -100, 0);    // dB
      const gateDecayInit  = safe(p.gateDecay, 100, 1, 1000);     // ms
      const decayInit      = safe(p.decay, 0.4, 0.05, 2.0);       // s — short IR (~0.4 s)
      const preInit        = safe((p.preDelay != null ? p.preDelay : 0) / 1000, 0, 0, 0.1);
      const dampInit       = safe(p.damping, 0.5, 0, 1);

      const pre  = ctx.createDelay(0.1); pre.delayTime.value = preInit;
      const gate = ctx.createDynamicsCompressor();
      // ratio=20, knee=0 → near-brickwall gate above threshold; release = gateDecay (ms→s).
      setCompThresh(gate.threshold, gateThreshInit);
      setCompRatio(gate.ratio, 20);
      try { gate.knee.value = 0; } catch (e) { /* noop */ }
      setCompAttack(gate.attack, 0.001);
      setCompRelease(gate.release, gateDecayInit / 1000);
      const conv = ctx.createConvolver(); conv.buffer = getReverbBuf(ctx, decayInit);
      const damp = ctx.createBiquadFilter(); damp.type = "lowpass";
      setFreq(damp.frequency, 800 + (1 - dampInit) * 11200);
      setQ(damp.Q, 0.707);
      const g    = ctx.createGain(); g.gain.value = normalizeMix(p.mix, 0);
      // pre → gate → conv → damp → wet
      pre.connect(gate); gate.connect(conv); conv.connect(damp); damp.connect(g);
      // Input meter tap pre-gate so the threshold meter shows incoming level vs threshold.
      const inAn = ctx.createAnalyser(); inAn.fftSize = 256; inAn.smoothingTimeConstant = 0.85;
      pre.connect(inAn);
      return {
        inputNode: pre, outputNode: g,
        setParam(n, v) { const t = ctx.currentTime; switch (n) {
          case "decay":      conv.buffer = getReverbBuf(ctx, safe(v, 0.4, 0.05, 2.0)); break;
          case "preDelay":   pre.delayTime.setTargetAtTime(safe(v / 1000, 0, 0, 0.1), t, TAU); break;
          case "gateThresh": gate.threshold.setTargetAtTime(safe(v, -40, -100, 0), t, TAU); break;
          case "gateDecay":  gate.release.setTargetAtTime(safe(v, 100, 1, 1000) / 1000, t, TAU); break;
          case "damping":    damp.frequency.setTargetAtTime(800 + (1 - safe(v, 0.5, 0, 1)) * 11200, t, TAU); break;
          case "mix":        setReverbMix(g.gain, v); break;
          default: break;
        } },
        dispose() { disposeNodes(pre, gate, conv, damp, g, inAn); },
        meters: { analyserIn: inAn },
      };
    });
    if (fx.vintageAir?.enabled) install("vintageAir", (p) => {
      // Phase F4-A.5 Batch 2 — vintageAir UPGRADE.
      // Old: plate-conv + 8 kHz +3 dB shelf only (no analog character).
      // New: plate-conv → tape-saturation WaveShaper (tanh, bias-controlled) →
      //      wow-modulated short delay (1.6 ms swing @ 0.3 Hz LFO) →
      //      flutter-modulated short delay (0.7 ms swing @ 7 Hz LFO) →
      //      8 kHz highshelf "air" → wet gain.
      // Wow + flutter use small DelayNode + LFO via gain (the same pattern as
      // chorus/spring "boing"). Bias shifts the tanh curve density so saturation
      // gets denser as it pushes more low-order harmonics — cheap analog model.
      const decayInit   = safe(p.decay, 1.8, 0.05, 20);
      const wowInit     = safe(p.tapeWow, 0.3, 0, 1);
      const flutInit    = safe(p.flutter, 0.2, 0, 1);
      const biasInit    = safe(p.bias, 0.5, 0, 1);

      // Tape-saturation WaveShaper: y = tanh(x * (1 + bias*2)). Higher bias = denser sat.
      const buildSatCurve = (bias) => {
        const N = 4096;
        const c = new Float32Array(N);
        const k = 1 + safe(bias, 0.5, 0, 1) * 2; // 1..3 drive
        for (let i = 0; i < N; i++) {
          const x = (i / (N - 1)) * 2 - 1;
          c[i] = Math.tanh(x * k);
        }
        return c;
      };

      const conv = ctx.createConvolver(); conv.buffer = getReverbBuf(ctx, decayInit);
      const sat  = ctx.createWaveShaper(); sat.curve = buildSatCurve(biasInit); sat.oversample = "2x";
      // Wow: ~0.3 Hz LFO modulating ~2 ms base delay, depth ∝ tapeWow (up to ~1.6 ms swing).
      const wowDelay = ctx.createDelay(0.02); wowDelay.delayTime.value = 0.002;
      const wowLFO   = ctx.createOscillator(); wowLFO.type = "sine"; wowLFO.frequency.value = 0.3;
      const wowGain  = ctx.createGain(); wowGain.gain.value = wowInit * 0.0016;
      wowLFO.connect(wowGain); wowGain.connect(wowDelay.delayTime); wowLFO.start();
      // Flutter: ~7 Hz LFO modulating ~1.5 ms base delay, depth ∝ flutter (up to ~0.7 ms swing).
      const flutDelay = ctx.createDelay(0.02); flutDelay.delayTime.value = 0.0015;
      const flutLFO   = ctx.createOscillator(); flutLFO.type = "sine"; flutLFO.frequency.value = 7.0;
      const flutGain  = ctx.createGain(); flutGain.gain.value = flutInit * 0.0007;
      flutLFO.connect(flutGain); flutGain.connect(flutDelay.delayTime); flutLFO.start();
      // 8 kHz +3 dB highshelf "air" — preserved from prior factory.
      const air = ctx.createBiquadFilter(); air.type = "highshelf"; setFreq(air.frequency, 8000); setGainDb(air.gain, p.air || 3);
      const g = ctx.createGain(); g.gain.value = normalizeMix(p.mix, 0);
      // conv → sat → wowDelay → flutDelay → air → wet
      conv.connect(sat); sat.connect(wowDelay); wowDelay.connect(flutDelay);
      flutDelay.connect(air); air.connect(g);
      // Output meter tap on the wet stage so the VU reflects how hot the verb is.
      const outAn = ctx.createAnalyser(); outAn.fftSize = 256; outAn.smoothingTimeConstant = 0.85;
      g.connect(outAn);
      return {
        inputNode: conv, outputNode: g,
        setParam(n, v) { const t = ctx.currentTime; switch (n) {
          case "decay":   conv.buffer = getReverbBuf(ctx, safe(v, 1.8, 0.05, 20)); break;
          case "air":     air.gain.setTargetAtTime(safe(v, 3, -60, 24), t, TAU); break;
          case "tapeWow": wowGain.gain.setTargetAtTime(safe(v, 0.3, 0, 1) * 0.0016, t, TAU); break;
          case "flutter": flutGain.gain.setTargetAtTime(safe(v, 0.2, 0, 1) * 0.0007, t, TAU); break;
          case "bias":    sat.curve = buildSatCurve(safe(v, 0.5, 0, 1)); break;
          case "mix":     setReverbMix(g.gain, v); break;
          default: break;
        } },
        dispose() {
          stopOscs(wowLFO, flutLFO);
          disposeNodes(conv, sat, wowDelay, flutDelay, wowGain, flutGain, air, g, outAn);
        },
        meters: { analyserOut: outAn },
      };
    });
    if (fx.stochasticHall?.enabled) install("stochasticHall", (p) => {
      const conv = ctx.createConvolver(); conv.buffer = getReverbBuf(ctx, p.decay || 2.0);
      const g = ctx.createGain(); g.gain.value = normalizeMix(p.mix, 0);
      conv.connect(g);
      return {
        inputNode: conv, outputNode: g,
        setParam(n, v) { switch (n) {
          case "decay": conv.buffer = getReverbBuf(ctx, safe(v, 2.0, 0.05, 20)); break;
          case "mix":   setReverbMix(g.gain, v); break;
          default: break;
        } },
        dispose() { disposeNodes(conv, g); },
      };
    });
    if (fx.greatHall?.enabled) install("greatHall", (p) => {
      const pre = ctx.createDelay(0.1); setTime(pre.delayTime, 0.06);
      const conv = ctx.createConvolver(); conv.buffer = getReverbBuf(ctx, p.decay || 2.0);
      const g = ctx.createGain(); g.gain.value = normalizeMix(p.mix, 0);
      pre.connect(conv); conv.connect(g);
      return {
        inputNode: pre, outputNode: g,
        setParam(n, v) { switch (n) {
          case "decay": conv.buffer = getReverbBuf(ctx, safe(v, 2.0, 0.05, 20)); break;
          case "mix":   setReverbMix(g.gain, v); break;
          default: break;
        } },
        dispose() { disposeNodes(pre, conv, g); },
      };
    });
    if (fx.plateForge?.enabled) install("plateForge", (p) => {
      const conv = ctx.createConvolver(); conv.buffer = getReverbBuf(ctx, p.decay || 2.0);
      const bri = ctx.createBiquadFilter(); bri.type = "highshelf"; setFreq(bri.frequency, 6000); setGainDb(bri.gain, p.brightness || 2);
      const g = ctx.createGain(); g.gain.value = normalizeMix(p.mix, 0.1);
      conv.connect(bri); bri.connect(g);
      return {
        inputNode: conv, outputNode: g,
        setParam(n, v) { const t = ctx.currentTime; switch (n) {
          case "decay":      conv.buffer = getReverbBuf(ctx, safe(v, 2.0, 0.05, 20)); break;
          case "brightness": bri.gain.setTargetAtTime(safe(v, 2, -60, 24), t, TAU); break;
          case "mix":        setReverbMix(g.gain, v); break;
          default: break;
        } },
        dispose() { disposeNodes(conv, bri, g); },
      };
    });
    if (fx.springBox?.enabled) install("springBox", (p) => {
      const conv = ctx.createConvolver(); conv.buffer = getReverbBuf(ctx, 0.8);
      const mid = ctx.createBiquadFilter(); mid.type = "peaking"; setFreq(mid.frequency, 1200); setQ(mid.Q, 0.5); setGainDb(mid.gain, 3);
      const g = ctx.createGain(); g.gain.value = normalizeMix(p.mix, 0.1);
      conv.connect(mid); mid.connect(g);
      return {
        inputNode: conv, outputNode: g,
        setParam(n, v) { if (n === "mix") setReverbMix(g.gain, v); },
        dispose() { disposeNodes(conv, mid, g); },
      };
    });

    // ──────────────────────────────────────────────────────────────────────
    // Phase F4-A.5: differentiated reverbs (hall, plate, spring, room) — distinct DSP engines
    // ──────────────────────────────────────────────────────────────────────
    // Wet-only insert pattern (matches hallForgeS / plateForge / springBox above):
    // when `mix` knob is 0 the wetGain mutes this insert (silence through this FX),
    // user dials `mix` up to taste. Each factory returns the standard PluginInstance
    // contract { inputNode, outputNode, setParam(name, value), dispose() }.
    //
    // 1) hall — Schroeder-style hall: stereo-spread parallel comb bank (6 combs with
    //    one-pole damping LP per comb feedback path) into 2 serial allpass diffusers.
    //    Knobs: decay (s), preDelay (ms), damping (0..1, lowers comb-feedback HF roll),
    //    hfDamping (0..1, second post-bank LP), width (0..1.5, L/R comb-time spread),
    //    mix (0..100). preDelay + width are smooth ramps; decay/damping recompute
    //    feedback gains in-place (no IR rebuild — true network so this is click-free).
    if (fx.hall?.enabled) install("hall", (p) => {
      const COMB_TIMES = [0.0297, 0.0371, 0.0411, 0.0437, 0.0050, 0.0079]; // Freeverb-ish base
      const STEREO_SPREAD = 0.0023;
      const decayInit = safe(p.decay, 2.4, 0.05, 20);
      const preInit   = safe((p.preDelay != null ? p.preDelay : 20) / 1000, 0.02, 0, 0.1);
      const dampInit  = safe(p.damping, 0.4, 0, 1);
      const hfInit    = safe(p.hfDamping, 0.5, 0, 1);
      const widthInit = safe(p.width, 1.0, 0, 1.5);
      // Map decay (sec) → comb feedback gain so RT60 ≈ decay; gFb ≈ exp(-3*ln10*delay/decay).
      const fbForDecay = (decay, delay) => {
        const g = Math.exp(-3 * Math.LN10 * delay / Math.max(0.05, decay));
        return Math.min(0.98, Math.max(0, g));
      };
      // Damping → feedback LP cutoff in Hz: 0 → 18 kHz (open), 1 → 800 Hz (dark).
      const dampToFreq = (d) => 800 + (1 - safe(d, 0.4, 0, 1)) * 17200;

      const pre = ctx.createDelay(0.2); pre.delayTime.value = preInit;
      // Build 6 parallel combs, each = delay + LP filter + feedback gain.
      const combs = COMB_TIMES.map((baseT) => {
        const tL = baseT;
        const tR = baseT + STEREO_SPREAD * widthInit;
        // Mono comb (single-channel) — Web Audio nodes are stereo by default; we model the
        // bank in summed mono into wetGain (full-stereo Schroeder bank would need 2x the nodes).
        const t = (tL + tR) * 0.5;
        const d = ctx.createDelay(0.5); d.delayTime.value = t;
        const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; setFreq(lp.frequency, dampToFreq(dampInit)); setQ(lp.Q, 0.707);
        const fb = ctx.createGain(); fb.gain.value = fbForDecay(decayInit, t);
        d.connect(lp); lp.connect(fb); fb.connect(d);
        return { d, lp, fb, t };
      });
      const sum = ctx.createGain(); sum.gain.value = 1 / COMB_TIMES.length;
      // Parallel combs: pre → each comb.delay; each comb.delay → sum.
      combs.forEach((c) => { pre.connect(c.d); c.d.connect(sum); });
      // 2 serial allpass diffusers (typical Schroeder values).
      const ap1 = ctx.createBiquadFilter(); ap1.type = "allpass"; setFreq(ap1.frequency, 480); setQ(ap1.Q, 0.5);
      const ap2 = ctx.createBiquadFilter(); ap2.type = "allpass"; setFreq(ap2.frequency, 1200); setQ(ap2.Q, 0.5);
      // Post-bank HF damping (2nd LP).
      const hf = ctx.createBiquadFilter(); hf.type = "lowpass"; setFreq(hf.frequency, 800 + (1 - hfInit) * 17200); setQ(hf.Q, 0.707);
      const wet = ctx.createGain(); wet.gain.value = normalizeMix(p.mix, 0);
      sum.connect(ap1); ap1.connect(ap2); ap2.connect(hf); hf.connect(wet);
      let curDecay = decayInit;
      let curWidth = widthInit;
      const recomputeFb = () => {
        for (const c of combs) c.fb.gain.setTargetAtTime(fbForDecay(curDecay, c.t), ctx.currentTime, TAU);
      };
      const recomputeWidth = () => {
        // Width modulates comb delay time slightly; tau-ramped to avoid clicks.
        for (let i = 0; i < combs.length; i++) {
          const baseT = COMB_TIMES[i];
          const t = baseT + 0.5 * STEREO_SPREAD * curWidth;
          combs[i].d.delayTime.setTargetAtTime(t, ctx.currentTime, TAU);
          combs[i].t = t;
        }
        recomputeFb();
      };
      return {
        inputNode: pre, outputNode: wet,
        setParam(n, v) { const t = ctx.currentTime; switch (n) {
          case "decay":     curDecay = safe(v, 2.4, 0.05, 20); recomputeFb(); break;
          case "preDelay":  pre.delayTime.setTargetAtTime(safe(v / 1000, 0.02, 0, 0.1), t, TAU); break;
          case "damping":   { const f = dampToFreq(safe(v, 0.4, 0, 1)); for (const c of combs) c.lp.frequency.setTargetAtTime(f, t, TAU); } break;
          case "hfDamping": hf.frequency.setTargetAtTime(800 + (1 - safe(v, 0.5, 0, 1)) * 17200, t, TAU); break;
          case "width":     curWidth = safe(v, 1.0, 0, 1.5); recomputeWidth(); break;
          case "mix":       setReverbMix(wet.gain, v); break;
          default: break;
        } },
        dispose() {
          disposeNodes(pre, sum, ap1, ap2, hf, wet);
          for (const c of combs) disposeNodes(c.d, c.lp, c.fb);
        },
      };
    });

    // 2) plate — Simplified Dattorro plate: 4 serial allpass diffusers (prime-time
    //    spaced) → 2 cross-fed delay lines (the "tank") with shared decay LP. This is
    //    the simplified port: the full Dattorro figure-of-eight has bigger diffusers +
    //    secondary modulated allpass; the simplification preserves the dense metallic
    //    character (input diffusion + tank) while keeping the node count manageable
    //    for live param ramps. Knobs: decay (s), preDelay (ms), diffusion (0..1 = AP gain),
    //    damping (0..1 = tank LP), brightness (0..1, peaking-EQ tilt at 3 kHz), mix.
    if (fx.plate?.enabled) install("plate", (p) => {
      const sr = ctx.sampleRate || 48000;
      // Prime-number sample counts at sr — convert to seconds (independent of sr).
      // Use 48 kHz as the reference so the "primeness" is just a perceptual quirk.
      const AP_TIMES = [149 / 48000, 211 / 48000, 263 / 48000, 311 / 48000]; // ~3..6.5 ms
      const TANK_TIMES = [0.0832, 0.1187]; // tank delays — golden-ratio'd
      const decayInit = safe(p.decay, 1.8, 0.05, 20);
      const preInit   = safe((p.preDelay != null ? p.preDelay : 12) / 1000, 0.012, 0, 0.1);
      const diffInit  = safe(p.diffusion, 0.85, 0, 0.95);
      const dampInit  = safe(p.damping, 0.4, 0, 1);
      const briInit   = safe(p.brightness, 0.6, 0, 1);
      // Tank cross-feedback gain so RT60 ≈ decay against the average tank delay.
      const tankFbForDecay = (decay) => {
        const avg = (TANK_TIMES[0] + TANK_TIMES[1]) * 0.5;
        return Math.min(0.95, Math.max(0, Math.exp(-3 * Math.LN10 * avg / Math.max(0.05, decay))));
      };
      const dampToFreq = (d) => 800 + (1 - safe(d, 0.4, 0, 1)) * 11200; // 800 Hz .. 12 kHz

      const pre = ctx.createDelay(0.2); pre.delayTime.value = preInit;
      // 4 serial allpass diffusers — biquad allpass with Q ≈ diffusion control.
      const ap = AP_TIMES.map((t, i) => {
        const f = ctx.createBiquadFilter(); f.type = "allpass";
        // freq = 1 / (period); use sample-time as 1/freq → freq = 1/period
        setFreq(f.frequency, 1 / t);
        setQ(f.Q, 0.5 + diffInit * 5); // diffusion → Q resonance of allpass
        return f;
      });
      ap.reduce((prev, cur) => { prev.connect(cur); return cur; });
      pre.connect(ap[0]);
      // Tank: 2 cross-fed delay lines with shared damping LP.
      const tankSum = ctx.createGain(); tankSum.gain.value = 1.0;
      ap[ap.length - 1].connect(tankSum);
      const dA = ctx.createDelay(0.5); dA.delayTime.value = TANK_TIMES[0];
      const dB = ctx.createDelay(0.5); dB.delayTime.value = TANK_TIMES[1];
      const lpA = ctx.createBiquadFilter(); lpA.type = "lowpass"; setFreq(lpA.frequency, dampToFreq(dampInit)); setQ(lpA.Q, 0.707);
      const lpB = ctx.createBiquadFilter(); lpB.type = "lowpass"; setFreq(lpB.frequency, dampToFreq(dampInit)); setQ(lpB.Q, 0.707);
      const fbA = ctx.createGain(); fbA.gain.value = tankFbForDecay(decayInit);
      const fbB = ctx.createGain(); fbB.gain.value = tankFbForDecay(decayInit);
      // Cross-fed: tankSum + fbB → dA → lpA → fbA → (cross to dB)
      //            tankSum + fbA → dB → lpB → fbB → (cross to dA)
      tankSum.connect(dA); tankSum.connect(dB);
      dA.connect(lpA); lpA.connect(fbA); fbA.connect(dB);
      dB.connect(lpB); lpB.connect(fbB); fbB.connect(dA);
      // Output: tap both tank LPs into a sum.
      const merged = ctx.createGain(); merged.gain.value = 0.5;
      lpA.connect(merged); lpB.connect(merged);
      // Brightness: peaking EQ at 3 kHz (legacy plateForge style).
      const bri = ctx.createBiquadFilter(); bri.type = "peaking"; setFreq(bri.frequency, 3000); setQ(bri.Q, 0.5); setGainDb(bri.gain, briInit * 12 - 6); // 0..1 → -6..+6 dB
      const wet = ctx.createGain(); wet.gain.value = normalizeMix(p.mix, 0);
      merged.connect(bri); bri.connect(wet);
      return {
        inputNode: pre, outputNode: wet,
        setParam(n, v) { const t = ctx.currentTime; switch (n) {
          case "decay":      { const g = tankFbForDecay(safe(v, 1.8, 0.05, 20)); fbA.gain.setTargetAtTime(g, t, TAU); fbB.gain.setTargetAtTime(g, t, TAU); } break;
          case "preDelay":   pre.delayTime.setTargetAtTime(safe(v / 1000, 0.012, 0, 0.1), t, TAU); break;
          case "diffusion":  { const Q = 0.5 + safe(v, 0.85, 0, 0.95) * 5; for (const f of ap) f.Q.setTargetAtTime(Q, t, TAU); } break;
          case "damping":    { const f = dampToFreq(safe(v, 0.4, 0, 1)); lpA.frequency.setTargetAtTime(f, t, TAU); lpB.frequency.setTargetAtTime(f, t, TAU); } break;
          case "brightness": bri.gain.setTargetAtTime(safe(v, 0.6, 0, 1) * 12 - 6, t, TAU); break;
          case "mix":        setReverbMix(wet.gain, v); break;
          default: break;
        } },
        dispose() {
          disposeNodes(pre, tankSum, dA, dB, lpA, lpB, fbA, fbB, merged, bri, wet);
          for (const f of ap) disposeNodes(f);
        },
      };
    });

    // 3) spring — Spring tank: 1..3 parallel comb springs (each = delay+LP+feedback)
    //    + cascaded allpass chain + LFO-modulated short delay for the metallic "boing"
    //    twang. Knobs: decay (s, comb feedback gain), springs (1..3, gates extra combs
    //    via their feedback gain), tone (0..1, tilt EQ across wet — low/dark .. bright),
    //    boing (0..1, depth of LFO modulation on a chirped allpass), mix.
    if (fx.spring?.enabled) install("spring", (p) => {
      const SPRING_TIMES = [0.030, 0.034, 0.038]; // base spring tank delay periods (s)
      const decayInit  = safe(p.decay, 1.4, 0.05, 10);
      const springsInit = Math.round(safe(p.springs, 3, 1, 3));
      const toneInit   = safe(p.tone, 0.55, 0, 1);
      const boingInit  = safe(p.boing, 0.35, 0, 1);
      // Map decay → spring feedback (avg time 0.034s → small base, scale to decay).
      const fbForDecay = (decay, t) => {
        const g = Math.exp(-3 * Math.LN10 * t / Math.max(0.05, decay));
        return Math.min(0.95, Math.max(0, g));
      };
      // Springs knob gates each comb: spring i is "active" when springsInit > i.
      const isActive = (i, springs) => springs > i ? 1 : 0;

      const inGain = ctx.createGain(); inGain.gain.value = 1;
      // 3 parallel comb-spring lines; gated by per-comb wet gain (active = 1, off = 0).
      const springs = SPRING_TIMES.map((t, i) => {
        const d = ctx.createDelay(0.1); d.delayTime.value = t;
        const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; setFreq(lp.frequency, 2000); setQ(lp.Q, 0.707);
        const fb = ctx.createGain(); fb.gain.value = fbForDecay(decayInit, t);
        d.connect(lp); lp.connect(fb); fb.connect(d);
        const gate = ctx.createGain(); gate.gain.value = isActive(i, springsInit);
        inGain.connect(d); d.connect(gate);
        return { d, lp, fb, gate, t };
      });
      const springSum = ctx.createGain(); springSum.gain.value = 1 / SPRING_TIMES.length;
      springs.forEach((s) => s.gate.connect(springSum));
      // Cascaded allpass chain (4 stages) → adds metallic dispersion on top of the comb bank.
      const ap = [600, 1100, 1700, 2400].map((f) => {
        const a = ctx.createBiquadFilter(); a.type = "allpass"; setFreq(a.frequency, f); setQ(a.Q, 4); return a;
      });
      ap.reduce((prev, cur) => { prev.connect(cur); return cur; });
      springSum.connect(ap[0]);
      // LFO-modulated short delay → "boing" twang. LFO 1.6 Hz, depth ∝ boing.
      const modDelay = ctx.createDelay(0.05); modDelay.delayTime.value = 0.012;
      const lfo = ctx.createOscillator(); lfo.type = "sine"; lfo.frequency.value = 1.6;
      const lfoGain = ctx.createGain(); lfoGain.gain.value = boingInit * 0.008; // up to 8 ms swing
      lfo.connect(lfoGain); lfoGain.connect(modDelay.delayTime);
      lfo.start();
      ap[ap.length - 1].connect(modDelay);
      // Tone: tilt EQ — low shelf cut + high shelf boost as tone↑ (0=dark, 1=bright).
      const lowShelf = ctx.createBiquadFilter(); lowShelf.type = "lowshelf"; setFreq(lowShelf.frequency, 400); setGainDb(lowShelf.gain, (toneInit - 0.5) * -10);
      const hiShelf  = ctx.createBiquadFilter(); hiShelf.type  = "highshelf"; setFreq(hiShelf.frequency, 4000); setGainDb(hiShelf.gain, (toneInit - 0.5) * 10);
      modDelay.connect(lowShelf); lowShelf.connect(hiShelf);
      const wet = ctx.createGain(); wet.gain.value = normalizeMix(p.mix, 0);
      hiShelf.connect(wet);
      let curDecay = decayInit;
      const recomputeFb = () => {
        for (const s of springs) s.fb.gain.setTargetAtTime(fbForDecay(curDecay, s.t), ctx.currentTime, TAU);
      };
      return {
        inputNode: inGain, outputNode: wet,
        setParam(n, v) { const t = ctx.currentTime; switch (n) {
          case "decay":   curDecay = safe(v, 1.4, 0.05, 10); recomputeFb(); break;
          case "springs": { const sn = Math.round(safe(v, 3, 1, 3)); for (let i = 0; i < springs.length; i++) springs[i].gate.gain.setTargetAtTime(isActive(i, sn), t, TAU); } break;
          case "tone":    { const tv = safe(v, 0.55, 0, 1); lowShelf.gain.setTargetAtTime((tv - 0.5) * -10, t, TAU); hiShelf.gain.setTargetAtTime((tv - 0.5) * 10, t, TAU); } break;
          case "boing":   lfoGain.gain.setTargetAtTime(safe(v, 0.35, 0, 1) * 0.008, t, TAU); break;
          case "mix":     setReverbMix(wet.gain, v); break;
          default: break;
        } },
        dispose() {
          stopOscs(lfo);
          disposeNodes(inGain, springSum, modDelay, lfoGain, lowShelf, hiShelf, wet);
          for (const s of springs) disposeNodes(s.d, s.lp, s.fb, s.gate);
          for (const a of ap) disposeNodes(a);
        },
      };
    });

    // 4) room — Short-decay convolver with synthesized IR and post-conv damping LP +
    //    brightness highshelf. IR = white noise × (1 - i/len)^4 envelope, length = size×1.0s
    //    (so size=0.45 → 450 ms IR). Knobs: size (0.2..0.8 → 200..800 ms IR length, see clamp),
    //    damping (0..1 → 8 kHz cutoff at 0, 800 Hz at 1), brightness (0..1 → -6..+6 dB highshelf),
    //    mix. Decay/size knob change rebuilds IR (audible click acceptable, mirrors existing).
    if (fx.room?.enabled) install("room", (p) => {
      const sizeInit = safe(p.size, 0.45, 0.2, 0.8);
      const dampInit = safe(p.damping, 0.5, 0, 1);
      const briInit  = safe(p.brightness, 0.6, 0, 1);
      // Build short-room IR: noise × (1-i/len)^4 envelope.
      const buildIR = (sizeSec) => {
        const sr = ctx.sampleRate;
        const len = Math.max(1, Math.floor(sr * safe(sizeSec, 0.45, 0.05, 1.5)));
        const buf = ctx.createBuffer(2, len, sr);
        for (let ch = 0; ch < 2; ch++) {
          const d = buf.getChannelData(ch);
          const phase = ch === 0 ? 1 : -1; // simple stereo decorrelation
          for (let i = 0; i < len; i++) {
            const t = i / len;
            const env = Math.pow(1 - t, 4);
            d[i] = (Math.random() * 2 - 1) * env * (i % 7 === 0 ? phase : 1);
          }
        }
        return buf;
      };
      const dampToFreq = (dv) => 800 + (1 - safe(dv, 0.5, 0, 1)) * 7200; // 800 Hz .. 8 kHz
      const conv = ctx.createConvolver(); conv.buffer = buildIR(sizeInit);
      const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; setFreq(lp.frequency, dampToFreq(dampInit)); setQ(lp.Q, 0.707);
      const bri = ctx.createBiquadFilter(); bri.type = "highshelf"; setFreq(bri.frequency, 6000); setGainDb(bri.gain, (briInit - 0.5) * 12);
      const wet = ctx.createGain(); wet.gain.value = normalizeMix(p.mix, 0);
      conv.connect(lp); lp.connect(bri); bri.connect(wet);
      return {
        inputNode: conv, outputNode: wet,
        setParam(n, v) { const t = ctx.currentTime; switch (n) {
          case "size":       conv.buffer = buildIR(safe(v, 0.45, 0.05, 1.5)); break;
          case "damping":    lp.frequency.setTargetAtTime(dampToFreq(safe(v, 0.5, 0, 1)), t, TAU); break;
          case "brightness": bri.gain.setTargetAtTime((safe(v, 0.6, 0, 1) - 0.5) * 12, t, TAU); break;
          case "mix":        setReverbMix(wet.gain, v); break;
          default: break;
        } },
        dispose() { disposeNodes(conv, lp, bri, wet); },
      };
    });

    // ──────────────────────────────────────────────────────────────────────
    // Phase F4-A.5 batch 2: chamber, shimmer + gateVerb rebuild + vintageAir upgrade + infiniteReverb refinement
    // (gateVerb / vintageAir / infiniteReverb upgrades are in-place above; chamber + shimmer are new SPX keys
    //  added here since the picker only checks `fx.<key>?.enabled` after PLUGIN_DEFAULTS provides the keys.)
    // ──────────────────────────────────────────────────────────────────────

    // 1) chamber — Mid-decay convolver with diffusion-modulated allpass before the convolver.
    //    Topology:  in → preDelay → AP1 (modulated) → AP2 (modulated) → convolver
    //               (decay-length IR) → damping LP → color tilt (peaking @ 1.5 kHz) → wet
    //    Diffusion is provided by 2 LFO-modulated allpass biquads (slow LFO ~0.7 Hz on a
    //    chirped frequency band — adds smear/movement that keeps the chamber from sounding
    //    static like a plain conv-only path).
    //    Knobs: decay (s, IR length), damping (0..1, post-conv LP), color (0..1 → -6..+6 dB
    //    peaking @ 1.5 kHz: dark/wood vs bright/marble), mix.
    if (fx.chamber?.enabled) install("chamber", (p) => {
      const decayInit = safe(p.decay, 1.6, 0.05, 8);
      const dampInit  = safe(p.damping, 0.45, 0, 1);
      const colorInit = safe(p.color, 0.5, 0, 1);
      const dampToFreq = (d) => 800 + (1 - safe(d, 0.45, 0, 1)) * 11200; // 800 Hz .. 12 kHz

      const pre = ctx.createDelay(0.05); pre.delayTime.value = 0.012; // 12 ms preDelay
      // Two diffusion allpass stages, each with a slow LFO modulating frequency.
      const ap1 = ctx.createBiquadFilter(); ap1.type = "allpass"; setFreq(ap1.frequency, 600); setQ(ap1.Q, 1.0);
      const ap2 = ctx.createBiquadFilter(); ap2.type = "allpass"; setFreq(ap2.frequency, 1700); setQ(ap2.Q, 1.0);
      const lfo1 = ctx.createOscillator(); lfo1.type = "sine"; lfo1.frequency.value = 0.7;
      const lfo2 = ctx.createOscillator(); lfo2.type = "sine"; lfo2.frequency.value = 0.4;
      const lfo1Gain = ctx.createGain(); lfo1Gain.gain.value = 80;  // ±80 Hz around 600 Hz
      const lfo2Gain = ctx.createGain(); lfo2Gain.gain.value = 220; // ±220 Hz around 1700 Hz
      lfo1.connect(lfo1Gain); lfo1Gain.connect(ap1.frequency);
      lfo2.connect(lfo2Gain); lfo2Gain.connect(ap2.frequency);
      lfo1.start(); lfo2.start();
      const conv = ctx.createConvolver(); conv.buffer = getReverbBuf(ctx, decayInit);
      const damp = ctx.createBiquadFilter(); damp.type = "lowpass"; setFreq(damp.frequency, dampToFreq(dampInit)); setQ(damp.Q, 0.707);
      // Color tilt: 0 → -6 dB peaking (warmer/darker), 1 → +6 dB peaking (brighter).
      const color = ctx.createBiquadFilter(); color.type = "peaking"; setFreq(color.frequency, 1500); setQ(color.Q, 0.7); setGainDb(color.gain, (colorInit - 0.5) * 12);
      const wet = ctx.createGain(); wet.gain.value = normalizeMix(p.mix, 0);
      pre.connect(ap1); ap1.connect(ap2); ap2.connect(conv);
      conv.connect(damp); damp.connect(color); color.connect(wet);
      return {
        inputNode: pre, outputNode: wet,
        setParam(n, v) { const t = ctx.currentTime; switch (n) {
          case "decay":   conv.buffer = getReverbBuf(ctx, safe(v, 1.6, 0.05, 8)); break;
          case "damping": damp.frequency.setTargetAtTime(dampToFreq(safe(v, 0.45, 0, 1)), t, TAU); break;
          case "color":   color.gain.setTargetAtTime((safe(v, 0.5, 0, 1) - 0.5) * 12, t, TAU); break;
          case "mix":     setReverbMix(wet.gain, v); break;
          default: break;
        } },
        dispose() {
          stopOscs(lfo1, lfo2);
          disposeNodes(pre, ap1, ap2, lfo1Gain, lfo2Gain, conv, damp, color, wet);
        },
      };
    });

    // 2) shimmer — Hall convolver + pitch-shifted feedback (octave-up shimmer).
    //    APPROACH: "poor man's shimmer" — there is no Web Audio inline pitch-shift
    //    primitive. Honest fallback documented in spec: use a delay loop with a high
    //    feedback gain feeding a comb-spaced grain of duplicated audio at half the
    //    period, producing a perceptual octave-up "ghost" tail. We implement it as:
    //
    //      in → preDelay → conv (hall IR, decay-length) → dampingLP → splitter
    //          ├→ wetGain → out
    //          └→ shimmerLoop:  delayHi (feedback fast, half-period of base) →
    //                           shimmerHS (highshelf accent for shimmer character) →
    //                           shimmerGain (feedback) → conv input (re-injected)
    //
    //    The "delayHi" is a 30 ms delay with feedback ≈ 0.85 — at this short time it
    //    sounds like a metallic shimmer/halo rather than a slap echo. The high-shelf
    //    accent adds the bright "octave-up" perceptual character without true
    //    re-pitching. `octave` knob (0..2) increases shimmer-loop highshelf and
    //    shortens delayHi (24 ms / 18 ms / 12 ms for 0/1/2 octaves). Spec accepts
    //    this as the documented honest fallback.
    //
    //    Knobs: decay (s), shimmer (0..1, shimmer-loop feedback gain), octave (0/1/2),
    //    damping (0..1, post-conv LP), mix.
    if (fx.shimmer?.enabled) install("shimmer", (p) => {
      const decayInit   = safe(p.decay, 3.5, 0.05, 12);
      const shimmerInit = safe(p.shimmer, 0.6, 0, 1);
      const octaveInit  = Math.round(safe(p.octave, 1, 0, 2));
      const dampInit    = safe(p.damping, 0.4, 0, 1);
      // octave → shimmer delay time (shorter = brighter halo) and HS accent gain.
      const octToTime = (o) => [0.024, 0.018, 0.012][Math.max(0, Math.min(2, o))];
      const octToHsDb = (o) => [3, 9, 15][Math.max(0, Math.min(2, o))];
      const dampToFreq = (d) => 800 + (1 - safe(d, 0.4, 0, 1)) * 11200; // 800 Hz .. 12 kHz

      const pre = ctx.createDelay(0.1); pre.delayTime.value = 0.02;
      const conv = ctx.createConvolver(); conv.buffer = getReverbBuf(ctx, decayInit);
      const damp = ctx.createBiquadFilter(); damp.type = "lowpass"; setFreq(damp.frequency, dampToFreq(dampInit)); setQ(damp.Q, 0.707);
      const wet = ctx.createGain(); wet.gain.value = normalizeMix(p.mix, 0);
      // Shimmer feedback loop:
      const shimmerInput = ctx.createGain(); shimmerInput.gain.value = 1; // sums into conv input
      const delayHi = ctx.createDelay(0.05); delayHi.delayTime.value = octToTime(octaveInit);
      const shimmerHS = ctx.createBiquadFilter(); shimmerHS.type = "highshelf";
      setFreq(shimmerHS.frequency, 4000); setGainDb(shimmerHS.gain, octToHsDb(octaveInit));
      const shimmerFb = ctx.createGain(); shimmerFb.gain.value = shimmerInit * 0.85;
      // Wire: pre → conv → damp → wet
      pre.connect(conv); conv.connect(damp); damp.connect(wet);
      // Re-inject damped wet through delayHi+HS+shimmerFb back into conv.
      damp.connect(delayHi); delayHi.connect(shimmerHS); shimmerHS.connect(shimmerFb);
      shimmerFb.connect(shimmerInput); shimmerInput.connect(conv);
      // Also feed input to shimmerInput so initial pre also flows into conv.
      // (pre.connect(conv) above already handles dry-side feed — this just re-uses
      // shimmerInput as the loop's sum point.)
      // Output meter tap on wet stage — drives particle drift density in the UI.
      const outAn = ctx.createAnalyser(); outAn.fftSize = 256; outAn.smoothingTimeConstant = 0.85;
      wet.connect(outAn);
      return {
        inputNode: pre, outputNode: wet,
        setParam(n, v) { const t = ctx.currentTime; switch (n) {
          case "decay":   conv.buffer = getReverbBuf(ctx, safe(v, 3.5, 0.05, 12)); break;
          case "shimmer": shimmerFb.gain.setTargetAtTime(safe(v, 0.6, 0, 1) * 0.85, t, TAU); break;
          case "octave": {
            const o = Math.round(safe(v, 1, 0, 2));
            delayHi.delayTime.setTargetAtTime(octToTime(o), t, TAU);
            shimmerHS.gain.setTargetAtTime(octToHsDb(o), t, TAU);
            break;
          }
          case "damping": damp.frequency.setTargetAtTime(dampToFreq(safe(v, 0.4, 0, 1)), t, TAU); break;
          case "mix":     setReverbMix(wet.gain, v); break;
          default: break;
        } },
        dispose() { disposeNodes(pre, conv, damp, wet, shimmerInput, delayHi, shimmerHS, shimmerFb, outAn); },
        meters: { analyserOut: outAn },
      };
    });

    if (fx.phantomDouble?.enabled) install("phantomDouble", (p) => {
      // Slap-doubler — single short delay + wet gain. No convolver.
      // UI param aliases: delay (ms 5..50) ÷ 1000 → d.delayTime (s 0..0.05).
      // spread/pitchVarL/pitchVarR/modRate/modDepth: need LFO + pitch-shift
      // node tree — Phase C candidates; accepted as no-ops here.
      const d = ctx.createDelay(0.05);
      const initTime = (p.delay != null ? p.delay / 1000 : (p.time != null ? p.time : 0.023));
      setTime(d.delayTime, initTime);
      const g = ctx.createGain(); g.gain.value = normalizeMix(p.mix, 0.3);
      d.connect(g);
      return {
        inputNode: d, outputNode: g,
        setParam(n, v) { const t = ctx.currentTime; switch (n) {
          case "delay":     d.delayTime.setTargetAtTime(safe(safe(v, 18, 5, 50) / 1000, 0.018, 0, 0.05), t, TAU); break;
          case "time":      d.delayTime.setTargetAtTime(safe(v, 0.023, 0, 0.05), t, TAU); break;
          case "mix":       setReverbMix(g.gain, v); break;
          case "spread":    /* needs L/R split — Phase C */ break;
          case "pitchVarL": /* needs pitch-shift node — Phase C */ break;
          case "pitchVarR": /* needs pitch-shift node — Phase C */ break;
          case "modRate":   /* needs LFO node — Phase C */ break;
          case "modDepth":  /* needs LFO mod depth — Phase C */ break;
          default: break;
        } },
        dispose() { disposeNodes(d, g); },
      };
    });
    if (fx.vocalSpace?.enabled) install("vocalSpace", (p) => {
      // Phase-3 / Fix 3: full param expansion.
      // Topology: input → preDelay → warmth (lowshelf) → conv → brightness (highshelf) → wetGain
      // TODO Phase 4 polish: dry/wet split + parallel early-reflections (earlyMix, lateMix
      //   knobs are emitted by the UI but ignored here — single-conv path only).
      const pre = ctx.createDelay(0.1);
      setTime(pre.delayTime, ((p.preDelay != null ? p.preDelay : 15)) / 1000);  // UI ms → s
      const warmth = ctx.createBiquadFilter(); warmth.type = "lowshelf";
      setFreq(warmth.frequency, 250); setGainDb(warmth.gain, (p.warmth != null ? p.warmth : 0.5) * 4);
      const conv = ctx.createConvolver();
      // size scales the effective IR length: size=0 → 0.4× decay, size=1 → 1.6× decay
      const irLen = (p.decay != null ? p.decay : 1.8) * (0.4 + (p.size != null ? p.size : 0.4) * 1.2);
      conv.buffer = getReverbBuf(ctx, irLen);
      const bri = ctx.createBiquadFilter(); bri.type = "highshelf";
      setFreq(bri.frequency, 6000); setGainDb(bri.gain, (p.brightness != null ? p.brightness : 0.6) * 6);
      const g = ctx.createGain(); g.gain.value = normalizeMix(p.mix, 0);
      pre.connect(warmth); warmth.connect(conv); conv.connect(bri); bri.connect(g);
      let curDecay = p.decay != null ? p.decay : 1.8;
      let curSize  = p.size != null ? p.size : 0.4;
      const recomputeIR = () => {
        const len = safe(curDecay, 1.8, 0.05, 20) * (0.4 + safe(curSize, 0.4, 0, 1) * 1.2);
        conv.buffer = getReverbBuf(ctx, safe(len, 1.8, 0.05, 24));
      };
      return {
        inputNode: pre, outputNode: g,
        setParam(n, v) { const t = ctx.currentTime; switch (n) {
          case "preDelay":   pre.delayTime.setTargetAtTime(safe((v ?? 15) / 1000, 0.015, 0, 0.1), t, TAU); break;
          case "decay":      curDecay = safe(v, 1.8, 0.05, 20); recomputeIR(); break;
          case "size":       curSize  = safe(v, 0.4, 0, 1); recomputeIR(); break;
          case "warmth":     warmth.gain.setTargetAtTime(safe(safe(v, 0.5, 0, 1) * 4, 2, -60, 24), t, TAU); break;
          case "brightness": bri.gain.setTargetAtTime(safe(safe(v, 0.6, 0, 1) * 6, 3.6, -60, 24), t, TAU); break;
          case "mix":        setReverbMix(g.gain, v); break;
          case "earlyMix": case "lateMix": break;  // TODO: parallel early/late path
          default: break;
        } },
        dispose() { disposeNodes(pre, warmth, conv, bri, g); },
      };
    });
    if (fx.infiniteReverb?.enabled) install("infiniteReverb", (p) => {
      // Phase F4-A.5 Batch 2 — infiniteReverb refinement.
      // Phase C2 continuous-decay reverb. Topology (UPDATED for true freeze):
      //   input → ConvolverNode → inFeed (gain) → wetSum
      //   wetSum → DelayNode (1.5 s) → damping LP → shimmer high-shelf →
      //           feedback gain → wetSum   (loops itself)
      //   wetSum → mix gain → output
      // freeze=true:
      //   - inFeed.gain → 0  (disables input feed; tail isolates from new audio)
      //   - fbGain.gain → 1.0 (unity feedback, true infinite tail)
      // freeze=false:
      //   - inFeed.gain → 1
      //   - fbGain.gain → 0.6 (natural decay)
      // shimmer is a high-shelf boost on the feedback path (true pitch-up shimmer
      //   landed in the dedicated `shimmer` factory; this stays a cheap fake here).
      // damping (0..1) lowers the feedback LP cutoff (1 = bright, 0 = dark).
      // roomSize (0..1) scales IR length 0.5..6 s.
      // UI keys: freeze (bool), roomSize (0..1), damping (0..1), mix (0..1), shimmer (0..1).
      const sizeInit = safe(p.roomSize != null ? p.roomSize : 0.9, 0.9, 0, 1);
      const conv = ctx.createConvolver(); conv.buffer = getReverbBuf(ctx, 0.5 + sizeInit * 5.5);
      const inFeed = ctx.createGain(); // dedicated input-feed gate for true freeze
      const wetSum = ctx.createGain(); setGainLinear(wetSum.gain, 1);
      const fbDelay = ctx.createDelay(2.0); setTime(fbDelay.delayTime, 1.5);
      const dampLP = ctx.createBiquadFilter(); dampLP.type = "lowpass";
      const dampInit = safe(p.damping != null ? p.damping : 0.3, 0.3, 0, 1);
      // damping 0 → bright (16k), damping 1 → dark (1k)
      setFreq(dampLP.frequency, 1000 + (1 - dampInit) * 15000);
      setQ(dampLP.Q, 0.7);
      const shimmerHS = ctx.createBiquadFilter(); shimmerHS.type = "highshelf";
      setFreq(shimmerHS.frequency, 6000);
      const shimmerInit = safe(p.shimmer != null ? p.shimmer : 0, 0, 0, 1);
      setGainDb(shimmerHS.gain, shimmerInit * 12);
      const fbGain = ctx.createGain();
      const freezeInit = !!p.freeze;
      setGainLinear(inFeed.gain, freezeInit ? 0 : 1);
      setGainLinear(fbGain.gain, freezeInit ? 1.0 : 0.6);
      const mix = ctx.createGain();
      setMix(mix.gain, safe(p.mix != null ? p.mix : 0.4, 0.4, 0, 1));
      // Wire: conv → inFeed → wetSum → fbDelay → dampLP → shimmerHS → fbGain → wetSum (loop)
      //                          └→ mix (out)
      conv.connect(inFeed); inFeed.connect(wetSum);
      wetSum.connect(fbDelay); fbDelay.connect(dampLP); dampLP.connect(shimmerHS);
      shimmerHS.connect(fbGain); fbGain.connect(wetSum);
      wetSum.connect(mix);
      return {
        inputNode: conv, outputNode: mix,
        setParam(n, v) { const t = ctx.currentTime; switch (n) {
          case "mix":      mix.gain.setTargetAtTime(safe(v, 0.4, 0, 1), t, TAU); break;
          case "freeze":
            // True freeze: cut input feed and lift feedback to unity.
            inFeed.gain.setTargetAtTime(v ? 0 : 1, t, TAU);
            fbGain.gain.setTargetAtTime(v ? 1.0 : 0.6, t, TAU);
            break;
          case "damping": {
            const d = safe(v, 0.3, 0, 1);
            dampLP.frequency.setTargetAtTime(safe(1000 + (1 - d) * 15000, 8000, 20, 20000), t, TAU);
            break;
          }
          case "shimmer":  shimmerHS.gain.setTargetAtTime(safe(safe(v, 0, 0, 1) * 12, 0, -60, 24), t, TAU); break;
          case "roomSize": conv.buffer = getReverbBuf(ctx, 0.5 + safe(v, 0.9, 0, 1) * 5.5); break;
          default: break;
        } },
        dispose() { disposeNodes(conv, inFeed, wetSum, fbDelay, dampLP, shimmerHS, fbGain, mix); },
      };
    });
    if (fx.spaceForge?.enabled) install("spaceForge", (p) => {
      const conv = ctx.createConvolver(); conv.buffer = getReverbBuf(ctx, p.size || 2.0);
      const g = ctx.createGain(); g.gain.value = normalizeMix(p.mix, 0);
      conv.connect(g);
      return {
        inputNode: conv, outputNode: g,
        setParam(n, v) { switch (n) {
          case "size": conv.buffer = getReverbBuf(ctx, safe(v, 2.0, 0.05, 20)); break;
          case "mix":  setReverbMix(g.gain, v); break;
          default: break;
        } },
        dispose() { disposeNodes(conv, g); },
      };
    });
    if (fx.stereoBloom?.enabled) install("stereoBloom", (p) => {
      const conv = ctx.createConvolver(); conv.buffer = getReverbBuf(ctx, 0.6);
      // UI never emits `width`; uses chorus-style mix (0..100). Drop dead panner.
      const g = ctx.createGain(); g.gain.value = normalizeMix(p.mix != null ? p.mix : 50, 0.5);
      conv.connect(g);
      return {
        inputNode: conv, outputNode: g,
        setParam(name, v) { switch (name) {
          case "mix":   setReverbMix(g.gain, v); break;
          // Phase C: rate/depth/feedback/detuneL/detuneR/mode need real chorus chain.
          case "rate": case "depth": case "feedback": case "detuneL": case "detuneR": case "mode": case "width": break;
          default: break;
        } },
        dispose() { disposeNodes(conv, g); },
      };
    });
    if (fx.echoField?.enabled) install("echoField", (p) => {
      // Feedback delay (no convolver). feedback gain ramps; delay time ramps.
      const d = ctx.createDelay(2); setTime(d.delayTime, (p.time || 250) / 1000);
      const fb = ctx.createGain(); setMix(fb.gain, p.feedback || 0.3);
      const g = ctx.createGain(); g.gain.value = normalizeMix(p.mix, 0);
      d.connect(fb); fb.connect(d); d.connect(g);
      return {
        inputNode: d, outputNode: g,
        setParam(n, v) { const t = ctx.currentTime; switch (n) {
          case "time":     d.delayTime.setTargetAtTime(safe(v / 1000, 0.25, 0, 2), t, TAU); break;
          case "feedback": fb.gain.setTargetAtTime(safe(v, 0.3, 0, 0.95), t, TAU); break;
          case "mix":      setReverbMix(g.gain, v); break;
          default: break;
        } },
        dispose() { disposeNodes(d, fb, g); },
      };
    });

    // ── SPX DELAY ──
    if (fx.reverseDelay?.enabled) install("reverseDelay", (p) => {
      // True reverse-buffer playback needs a worklet; this is a feedback delay
      // that approximates the wash. time/feedback/mix all ramp.
      const d = ctx.createDelay(2); setTime(d.delayTime, (p.time || 250) / 1000);
      const fb = ctx.createGain(); setMix(fb.gain, p.feedback || 0.3);
      const g = ctx.createGain(); setMix(g.gain, p.mix || 0);
      d.connect(fb); fb.connect(d); d.connect(g);
      return {
        inputNode: d, outputNode: g,
        setParam(n, v) { const t = ctx.currentTime; switch (n) {
          case "time":     d.delayTime.setTargetAtTime(safe(v / 1000, 0.25, 0, 2), t, TAU); break;
          case "feedback": fb.gain.setTargetAtTime(safe(v, 0.3, 0, 0.95), t, TAU); break;
          case "mix":      g.gain.setTargetAtTime(safe(v, 0, 0, 1), t, TAU); break;
          default: break;
        } },
        dispose() { disposeNodes(d, fb, g); },
      };
    });
    if (fx.tempoDelay?.enabled) install("tempoDelay", (p) => {
      // BPM-synced delay — division is a beat fraction, time = (60/bpm)*division.
      const beat = (60 / bpm) * (p.division || 1);
      const d = ctx.createDelay(4); setTime(d.delayTime, Math.min(beat, 3.9));
      const fb = ctx.createGain(); setMix(fb.gain, p.feedback || 0.3);
      const g = ctx.createGain(); setMix(g.gain, p.mix || 0);
      d.connect(fb); fb.connect(d); d.connect(g);
      return {
        inputNode: d, outputNode: g,
        setParam(n, v) { const t = ctx.currentTime; switch (n) {
          case "division": d.delayTime.setTargetAtTime(safe(Math.min((60 / bpm) * safe(v, 1, 0, 16), 3.9), 0.5, 0, 4), t, TAU); break;
          case "feedback": fb.gain.setTargetAtTime(safe(v, 0.3, 0, 0.95), t, TAU); break;
          case "mix":      g.gain.setTargetAtTime(safe(v, 0, 0, 1), t, TAU); break;
          default: break;
        } },
        dispose() { disposeNodes(d, fb, g); },
      };
    });
    if (fx.dualDelay?.enabled) install("dualDelay", (p) => {
      // Two delays in series — separate time1 and time2 knobs. UI mix is percent.
      const d1 = ctx.createDelay(2); setTime(d1.delayTime, (p.time1 || 250) / 1000);
      const d2 = ctx.createDelay(2); setTime(d2.delayTime, (p.time2 || 375) / 1000);
      const g = ctx.createGain(); g.gain.value = normalizeMix(p.mix, 0);
      d1.connect(d2); d2.connect(g);
      return {
        inputNode: d1, outputNode: g,
        setParam(n, v) { const t = ctx.currentTime; switch (n) {
          case "time1": d1.delayTime.setTargetAtTime(safe(v / 1000, 0.25, 0, 2), t, TAU); break;
          case "time2": d2.delayTime.setTargetAtTime(safe(v / 1000, 0.375, 0, 2), t, TAU); break;
          case "mix":   setReverbMix(g.gain, v); break;
          default: break;
        } },
        dispose() { disposeNodes(d1, d2, g); },
      };
    });

    // ── SPX MODULATION ──
    if (fx.pitchForge?.enabled) install("pitchForge", (p) => {
      // Phase C4: real pitch shift via Tone.PitchShift (delay-line/grain
      // crossfade method). Quality clean within ±5 semitones, mild artifacts
      // beyond. Optional formant peaking biquad approximates formant
      // preservation (decorative — true formant scaling needs a phase
      // vocoder worklet, flagged V2).
      try { Tone.setContext(ctx); } catch (e) {}
      const inGain = ctx.createGain(); setGainLinear(inGain.gain, 1);
      const outGain = ctx.createGain(); setGainLinear(outGain.gain, 1);
      const wet = ctx.createGain(); setGainLinear(wet.gain, 1);
      const dry = ctx.createGain(); setGainLinear(dry.gain, 0);
      const formant = ctx.createBiquadFilter(); formant.type = "peaking";
      setFreq(formant.frequency, safe(p.formant != null ? 1000 + p.formant * 50 : 1000, 1000, 20, 20000));
      setQ(formant.Q, 1.4); setGainDb(formant.gain, safe(p.formantGain != null ? p.formantGain : 0, 0, -12, 12));
      const ps = new Tone.PitchShift({
        pitch: safe(p.pitch != null ? p.pitch : 0, 0, -24, 24),
        windowSize: safe(p.windowSize != null ? p.windowSize : 0.1, 0.1, 0.03, 0.5),
      });
      // Tone.js v15: ps.input is a Tone.Gain wrapper, not a native AudioNode.
      // nativeNode.connect(toneWrapper) throws "Overload resolution failed".
      // Tone.connect bridges native→Tone correctly. The reverse direction
      // (ps.connect(formant) below) goes through Tone's own connect which
      // already handles native targets.
      Tone.connect(inGain, ps);
      ps.connect(formant);
      formant.connect(wet);
      wet.connect(outGain);
      inGain.connect(dry); dry.connect(outGain);
      const mix0 = safe(p.mix != null ? (p.mix > 1 ? p.mix / 100 : p.mix) : 1, 1, 0, 1);
      setGainLinear(wet.gain, mix0); setGainLinear(dry.gain, 1 - mix0);
      return {
        inputNode: inGain, outputNode: outGain,
        setParam(n, v) { const t = ctx.currentTime; switch (n) {
          case "pitch": ps.pitch = safe(v, 0, -24, 24); break;
          case "windowSize": ps.windowSize = safe(v, 0.1, 0.03, 0.5); break;
          case "formant": formant.frequency.setTargetAtTime(safe(1000 + safe(v, 0, -50, 50) * 50, 1000, 20, 20000), t, TAU); break;
          case "formantGain": formant.gain.setTargetAtTime(safe(v, 0, -12, 12), t, TAU); break;
          case "mix": {
            const m = safe(v > 1 ? v / 100 : v, 1, 0, 1);
            wet.gain.setTargetAtTime(m, t, TAU);
            dry.gain.setTargetAtTime(1 - m, t, TAU);
            break;
          }
          default: break;
        } },
        dispose() {
          try { ps.dispose(); } catch (e) {}
          disposeNodes(inGain, outGain, wet, dry, formant);
        },
      };
    });
    if (fx.pitchLock?.enabled) install("pitchLock", (p) => {
      // Phase C4: manual snap-to-target pitch lock via Tone.PitchShift.
      // True pitch-lock requires real-time pitch detection (autocorrelation /
      // YIN inside an AudioWorklet) — flagged V2. This build offers a
      // fixed-transpose mode: user sets `target` (semitones) and the entire
      // signal is shifted by that amount. Combined with a steep narrow
      // peaking filter at `lockFreq`, it emphasises the locked pitch band.
      try { Tone.setContext(ctx); } catch (e) {}
      const inGain = ctx.createGain(); setGainLinear(inGain.gain, 1);
      const outGain = ctx.createGain(); setGainLinear(outGain.gain, 1);
      const ps = new Tone.PitchShift({
        pitch: safe(p.target != null ? p.target : 0, 0, -24, 24),
        windowSize: 0.1,
      });
      const peak = ctx.createBiquadFilter(); peak.type = "peaking";
      setFreq(peak.frequency, safe(p.lockFreq != null ? p.lockFreq : 440, 440, 20, 20000));
      setQ(peak.Q, safe(p.strength != null ? p.strength * 10 + 1 : 4, 4, 0.1, 30));
      setGainDb(peak.gain, 3);
      // Tone.js v15 native→Tone bridge — see pitchForge above.
      Tone.connect(inGain, ps);
      ps.connect(peak); peak.connect(outGain);
      return {
        inputNode: inGain, outputNode: outGain,
        setParam(n, v) { const t = ctx.currentTime; switch (n) {
          case "target": case "pitch": ps.pitch = safe(v, 0, -24, 24); break;
          case "lockFreq": peak.frequency.setTargetAtTime(safe(v, 440, 20, 20000), t, TAU); break;
          case "strength": peak.Q.setTargetAtTime(safe(v * 10 + 1, 4, 0.1, 30), t, TAU); break;
          default: break;
        } },
        dispose() { try { ps.dispose(); } catch (e) {} disposeNodes(inGain, outGain, peak); },
      };
    });
    if (fx.pitchRandomizer?.enabled) install("pitchRandomizer", (p) => {
      // Phase C2.3 rebuild: pitch wobble via DelayNode-modulated delay time.
      // Topology:
      //   in → dryGain → out
      //   in → delay → wetGain → out
      //   LFO osc (sine) → lfoGain (depth) → delay.delayTime
      // amount (cents 0..100): scaled to delay-time mod depth (~0..2 ms wobble).
      // rate (Hz): LFO frequency. smooth (0..1): lowpass on LFO output. mix (0..1).
      // True pitch tracking would need an AudioWorklet — flagged C5.
      const inNode  = ctx.createGain(); setGainLinear(inNode.gain, 1);
      const outNode = ctx.createGain(); setGainLinear(outNode.gain, 1);
      const delay = ctx.createDelay(0.05);
      // Center delay around ~10 ms so modulation can swing both ways.
      setTime(delay.delayTime, 0.01);
      const lfo = ctx.createOscillator(); lfo.type = 'sine';
      const lfoGain = ctx.createGain();
      const smoothLPF = ctx.createBiquadFilter(); smoothLPF.type = 'lowpass';
      // smooth (0..1): 0 = LPF at 30 Hz (snappy), 1 = LPF at 0.5 Hz (very smooth).
      const smoothToFreq = (s) => 30 - safe(s, 0.7, 0, 1) * 29.5;
      setFreq(smoothLPF.frequency, smoothToFreq(p.smooth != null ? p.smooth : 0.7));
      setQ(smoothLPF.Q, 0.707);
      // amount (cents 0..100): map to delay-time depth. ~50 cents ≈ 1 ms wobble.
      const centsToDepth = (cents) => safe(cents, 0, 0, 100) / 50000; // 100¢ → 2 ms
      setGainLinear(lfoGain.gain, centsToDepth(p.amount != null ? p.amount : 0));
      setFreq(lfo.frequency, safe(p.rate != null ? p.rate : 4, 4, 0.1, 20));
      lfo.connect(smoothLPF);
      smoothLPF.connect(lfoGain);
      lfoGain.connect(delay.delayTime);
      lfo.start();
      const wetGain = ctx.createGain();
      const dryGain = ctx.createGain();
      const initMix = safe(p.mix != null ? p.mix : 1.0, 1, 0, 1);
      setGainLinear(wetGain.gain, initMix);
      setGainLinear(dryGain.gain, 1 - initMix);
      // Wet path
      inNode.connect(delay); delay.connect(wetGain); wetGain.connect(outNode);
      // Dry path
      inNode.connect(dryGain); dryGain.connect(outNode);
      return {
        inputNode: inNode, outputNode: outNode,
        setParam(n, v) { const t = ctx.currentTime; switch (n) {
          case "amount": lfoGain.gain.setTargetAtTime(centsToDepth(v), t, TAU); break;
          case "rate":   lfo.frequency.setTargetAtTime(safe(v, 4, 0.1, 20), t, TAU_LFO); break;
          case "smooth": smoothLPF.frequency.setTargetAtTime(safe(smoothToFreq(v), 1, 0.1, 30), t, TAU); break;
          case "mix": {
            const m = safe(v, 1, 0, 1);
            wetGain.gain.setTargetAtTime(m, t, TAU);
            dryGain.gain.setTargetAtTime(1 - m, t, TAU);
            break;
          }
          default: break;
        } },
        dispose() { stopOscs(lfo); disposeNodes(inNode, delay, smoothLPF, lfoGain, wetGain, dryGain, outNode); },
      };
    });
    if (fx.subOctaver?.enabled) install("subOctaver", (p) => {
      // Phase C2: dry + oct1 (full-wave rectifier → LPF) + oct2 (cascade rectifier → LPF).
      // |x| halves the perceived fundamental → octave-down content.
      const N = 2048;
      const rectCurve = new Float32Array(N);
      for (let i = 0; i < N; i++) { const x = (2 * i) / (N - 1) - 1; rectCurve[i] = Math.abs(x) * 2 - 1; }
      const filterFromUI = (v) => {
        // UI 0..1 → 60..600 Hz LPF cutoff (low end emphasises sub-bass).
        const f = safe(v, 0.4, 0, 1);
        return 60 + f * 540;
      };
      const inGain = ctx.createGain(); setGainLinear(inGain.gain, 1);
      // Pre-LPF on the rectifier paths cleans the input first.
      const preLP = ctx.createBiquadFilter(); preLP.type = "lowpass";
      setFreq(preLP.frequency, 800);
      // OCT1 path: rectify → LPF
      const oct1WS = ctx.createWaveShaper(); oct1WS.curve = rectCurve;
      const oct1LP = ctx.createBiquadFilter(); oct1LP.type = "lowpass";
      setFreq(oct1LP.frequency, filterFromUI(p.filter));
      const oct1Gain = ctx.createGain(); setGainLinear(oct1Gain.gain, safe(p.oct1Level, 0, 0, 1));
      // OCT2 path: cascade rectifier (|||x|||) → LPF (deeper sub).
      const oct2WS = ctx.createWaveShaper(); oct2WS.curve = rectCurve;
      const oct2LP = ctx.createBiquadFilter(); oct2LP.type = "lowpass";
      setFreq(oct2LP.frequency, filterFromUI(p.filter) * 0.7);
      const oct2Gain = ctx.createGain(); setGainLinear(oct2Gain.gain, safe(p.oct2Level, 0, 0, 1));
      // Dry path
      const dryGain = ctx.createGain(); setGainLinear(dryGain.gain, safe(p.dryLevel, 1, 0, 1));
      // trackSpeed maps to AudioParam smoothing (faster = smaller TAU). 0..1 → 0.05..0.005s.
      const trackSpeedTau = (v) => 0.05 - safe(v, 0.5, 0, 1) * 0.045;
      let curTau = trackSpeedTau(p.trackSpeed);
      const out = ctx.createGain(); setGainLinear(out.gain, 1);
      // Wiring
      inGain.connect(dryGain); dryGain.connect(out);
      inGain.connect(preLP);
      preLP.connect(oct1WS); oct1WS.connect(oct1LP); oct1LP.connect(oct1Gain); oct1Gain.connect(out);
      // OCT2: feed first rectified+LP into the second rectifier+LP.
      oct1LP.connect(oct2WS); oct2WS.connect(oct2LP); oct2LP.connect(oct2Gain); oct2Gain.connect(out);
      return {
        inputNode: inGain, outputNode: out,
        setParam(n, v) { const t = ctx.currentTime; switch (n) {
          case "oct1Level": oct1Gain.gain.setTargetAtTime(safe(v, 0, 0, 1), t, curTau); break;
          case "oct2Level": oct2Gain.gain.setTargetAtTime(safe(v, 0, 0, 1), t, curTau); break;
          case "dryLevel":  dryGain.gain.setTargetAtTime(safe(v, 1, 0, 1), t, curTau); break;
          case "filter": {
            const f = filterFromUI(v);
            oct1LP.frequency.setTargetAtTime(safe(f, 200, 20, 20000), t, curTau);
            oct2LP.frequency.setTargetAtTime(safe(f * 0.7, 140, 20, 20000), t, curTau);
            break;
          }
          case "trackSpeed": curTau = trackSpeedTau(v); break;
          // Legacy `mix` (older PLUGIN_DEFAULTS) → splits across dry vs wet (oct1).
          case "mix": {
            const m = safe(v, 0.4, 0, 1);
            dryGain.gain.setTargetAtTime(1 - m, t, curTau);
            oct1Gain.gain.setTargetAtTime(m, t, curTau);
            break;
          }
          default: break;
        } },
        dispose() { disposeNodes(inGain, preLP, oct1WS, oct1LP, oct1Gain, oct2WS, oct2LP, oct2Gain, dryGain, out); },
      };
    });
    if (fx.autoWah?.enabled) install("autoWah", (p) => {
      // Bandpass with center modulated by LFO. sensitivity offsets center freq.
      const f = ctx.createBiquadFilter(); f.type = "bandpass";
      setFreq(f.frequency, 800 + ((p.sensitivity || 0.5) * 1200)); setQ(f.Q, p.resonance || 5);
      const lfo = ctx.createOscillator(); const lfoG = ctx.createGain();
      setFreq(lfo.frequency, p.rate || 2); setGainLinear(lfoG.gain, 500);
      lfo.connect(lfoG); lfoG.connect(f.frequency); lfo.start();
      return {
        inputNode: f, outputNode: f,
        setParam(n, v) { const t = ctx.currentTime; switch (n) {
          case "sensitivity": f.frequency.setTargetAtTime(safe(800 + safe(v, 0.5, 0, 1) * 1200, 1400, 20, 20000), t, TAU); break;
          case "resonance":   f.Q.setTargetAtTime(safe(v, 5, 0.0001, 1000), t, TAU); break;
          case "rate":        lfo.frequency.setTargetAtTime(safe(v, 2, 0, 20), t, TAU_LFO); break;
          default: break;
        } },
        dispose() { stopOscs(lfo); disposeNodes(f, lfoG); },
      };
    });
    if (fx.chorusEnsemble?.enabled) install("chorusEnsemble", (p) => {
      // Two delays with two LFOs at 1× and 1.3× rate — denser than mono chorus.
      // UI emits mode (1–4 button), mix (0–1), depth (0–1). mode scales the
      // LFO rate (slow chorus → ensemble); depth writes the lfoG gains;
      // mix needs a dry/wet split (Phase C — current topology is 100% wet).
      const modeToRate = (m) => 0.3 * safe(m, 1, 1, 4);
      const initMode = p.mode != null ? p.mode : 1;
      const initDepth = p.depth != null ? p.depth : 0.5;
      const d1 = ctx.createDelay(0.05); setTime(d1.delayTime, 0.015);
      const d2 = ctx.createDelay(0.05); setTime(d2.delayTime, 0.025);
      const lfo1 = ctx.createOscillator(); const lfoG1 = ctx.createGain();
      setFreq(lfo1.frequency, modeToRate(initMode)); setGainLinear(lfoG1.gain, safe(initDepth, 0.5, 0, 1) * 0.01);
      lfo1.connect(lfoG1); lfoG1.connect(d1.delayTime); lfo1.start();
      const lfo2 = ctx.createOscillator(); const lfoG2 = ctx.createGain();
      setFreq(lfo2.frequency, modeToRate(initMode) * 1.3); setGainLinear(lfoG2.gain, safe(initDepth, 0.5, 0, 1) * 0.01);
      lfo2.connect(lfoG2); lfoG2.connect(d2.delayTime); lfo2.start();
      d1.connect(d2);
      return {
        inputNode: d1, outputNode: d2,
        setParam(n, v) { const t = ctx.currentTime; switch (n) {
          case "mode": {
            const r = modeToRate(v);
            lfo1.frequency.setTargetAtTime(safe(r, 0.3, 0, 20), t, TAU_LFO);
            lfo2.frequency.setTargetAtTime(safe(r * 1.3, 0.4, 0, 20), t, TAU_LFO);
            break;
          }
          case "depth": {
            const d = safe(v, 0.5, 0, 1) * 0.01;
            lfoG1.gain.setTargetAtTime(safe(d, 0.005, 0, 4), t, TAU);
            lfoG2.gain.setTargetAtTime(safe(d, 0.005, 0, 4), t, TAU);
            break;
          }
          case "rate":
            lfo1.frequency.setTargetAtTime(safe(v, 1.5, 0, 20), t, TAU_LFO);
            lfo2.frequency.setTargetAtTime(safe(safe(v, 1.5, 0, 20) * 1.3, 2, 0, 20), t, TAU_LFO);
            break;
          // Phase C: mix needs a dry/wet split (chorus output is currently 100% wet).
          case "mix": break;
          default: break;
        } },
        dispose() { stopOscs(lfo1, lfo2); disposeNodes(d1, d2, lfoG1, lfoG2); },
      };
    });
    if (fx.vortexMod?.enabled) install("vortexMod", (p) => {
      const d = ctx.createDelay(0.03); setTime(d.delayTime, 0.02);
      const lfo = ctx.createOscillator(); const lfoG = ctx.createGain();
      setFreq(lfo.frequency, p.rate || 0.5); setGainLinear(lfoG.gain, p.depth || 0.01);
      lfo.connect(lfoG); lfoG.connect(d.delayTime); lfo.start();
      return {
        inputNode: d, outputNode: d,
        setParam(n, v) { const t = ctx.currentTime; switch (n) {
          case "rate":  lfo.frequency.setTargetAtTime(safe(v, 0.5, 0, 20), t, TAU_LFO); break;
          case "depth": lfoG.gain.setTargetAtTime(safe(v, 0.01, 0, 4), t, TAU); break;
          default: break;
        } },
        dispose() { stopOscs(lfo); disposeNodes(d, lfoG); },
      };
    });
    if (fx.voiceForge?.enabled) install("voiceForge", (p) => {
      // Phase C4 vocal-harmonizer — REAL pitch shift via 4× Tone.PitchShift
      // voices. Replaces the C2 Haas-style detune approximation. Per-voice
      // shift (semitones), per-voice volume, formant peaking biquad. Quality
      // clean within ±5 semitones, mild artifacts beyond. Formant scaling
      // is decorative (true formant correction needs a phase vocoder, V2).
      // Topology:
      //   input (inBus) → dryGain ─────────────────────┐
      //                 → 4× parallel { delay (5..30 ms) ←── LFO mod (0.13..0.27 Hz, ±2 ms)
      //                                  → voice gain v1..v4 ──┤
      //                                                        ↓
      //                                                     wetBus → mix → output
      // voices (1..4) gates which voice gains stay non-zero.
      // v1Vol..v4Vol map straight to per-voice gain (0..1).
      // mix (0..1 or 0..100) blends dry vs wet.
      // formant maps to a peaking biquad on the wet bus (decorative — true
      //   formant scaling needs a Phase C4 pitch shifter).
      // UI keys: voices (1..4), key/scale (informational — V2 needs pitch
      //   detection for chromatic snapping), v1Shift..v4Shift (semitones,
      //   live), v1Vol..v4Vol (0..1), formant (decorative peaking filter),
      //   mix (0..1).
      try { Tone.setContext(ctx); } catch (e) {}
      const voicesInit = Math.max(1, Math.min(4, Math.round(safe(p.voices != null ? p.voices : 2, 2, 1, 4))));
      const inBus = ctx.createGain(); setGainLinear(inBus.gain, 1);
      const dry = ctx.createGain(); setGainLinear(dry.gain, 1);
      const wetBus = ctx.createBiquadFilter(); wetBus.type = "peaking";
      setFreq(wetBus.frequency, safe(p.formant != null ? Math.max(20, 1000 + p.formant * 50) : 1000, 1000, 20, 20000));
      setQ(wetBus.Q, 1.4); setGainDb(wetBus.gain, 0);
      const out = ctx.createGain(); setGainLinear(out.gain, 1);
      const mixWet = ctx.createGain();
      const mixDry = ctx.createGain();
      const mixInit = (() => { const m = p.mix != null ? p.mix : 0; return safe(m > 1 ? m / 100 : m, 0, 0, 1); })();
      setMix(mixWet.gain, mixInit); setMix(mixDry.gain, 1 - mixInit);

      // Per-voice default shifts (musical doubling): unison + 5th + octave + 3rd.
      const defaultShifts = [0, 7, 12, 4];
      const shiftKeys = ["v1Shift", "v2Shift", "v3Shift", "v4Shift"];
      const volKeys = ["v1Vol", "v2Vol", "v3Vol", "v4Vol"];
      const voices = [0, 1, 2, 3].map((i) => {
        const initShift = safe(p[shiftKeys[i]] != null ? p[shiftKeys[i]] : defaultShifts[i], defaultShifts[i], -24, 24);
        const baseVol = safe(p[volKeys[i]] != null ? p[volKeys[i]] : 0, 0, 0, 1);
        const ps = new Tone.PitchShift({ pitch: initShift, windowSize: 0.1 });
        const g = ctx.createGain();
        const gated = (i + 1) <= voicesInit ? baseVol : 0;
        setGainLinear(g.gain, gated);
        // Tone.js v15 native→Tone bridge — see pitchForge above.
        Tone.connect(inBus, ps);
        // Only wire ps→g when the voice is audible — saves CPU at vol=0.
        const v = { ps, g, baseVol, connected: false };
        if (gated > 0) { try { ps.connect(g); v.connected = true; } catch (e) {} }
        g.connect(wetBus);
        return v;
      });
      const setVoiceConnected = (v, shouldConnect) => {
        if (shouldConnect && !v.connected) { try { v.ps.connect(v.g); v.connected = true; } catch (e) {} }
        else if (!shouldConnect && v.connected) { try { v.ps.disconnect(v.g); v.connected = false; } catch (e) {} }
      };

      wetBus.connect(mixWet); mixWet.connect(out);
      inBus.connect(dry); dry.connect(mixDry); mixDry.connect(out);

      let voiceCount = voicesInit;
      const applyVoiceCount = (count) => {
        voiceCount = Math.max(1, Math.min(4, Math.round(count)));
        voices.forEach((v, i) => {
          const target = (i + 1) <= voiceCount ? v.baseVol : 0;
          v.g.gain.setTargetAtTime(safe(target, 0, 0, 4), ctx.currentTime, TAU);
          setVoiceConnected(v, target > 0);
        });
      };

      return {
        inputNode: inBus, outputNode: out,
        setParam(n, v) { const t = ctx.currentTime; switch (n) {
          case "voices":  applyVoiceCount(safe(v, 2, 1, 4)); break;
          case "v1Vol":
          case "v2Vol":
          case "v3Vol":
          case "v4Vol": {
            const idx = parseInt(n.slice(1), 10) - 1;
            const newVol = safe(v, 0, 0, 1);
            voices[idx].baseVol = newVol;
            const gated = (idx + 1) <= voiceCount ? newVol : 0;
            voices[idx].g.gain.setTargetAtTime(safe(gated, 0, 0, 4), t, TAU);
            setVoiceConnected(voices[idx], gated > 0);
            break;
          }
          case "v1Shift":
          case "v2Shift":
          case "v3Shift":
          case "v4Shift": {
            const idx = parseInt(n.slice(1), 10) - 1;
            voices[idx].ps.pitch = safe(v, 0, -24, 24);
            break;
          }
          case "mix": {
            const m = safe(v > 1 ? v / 100 : v, 0, 0, 1);
            mixWet.gain.setTargetAtTime(m, t, TAU);
            mixDry.gain.setTargetAtTime(1 - m, t, TAU);
            break;
          }
          case "formant":
            wetBus.frequency.setTargetAtTime(safe(1000 + safe(v, 0, -50, 50) * 50, 1000, 20, 20000), t, TAU);
            break;
          /* V2 — needs real-time pitch detection for chromatic snapping */
          case "key":     break;
          case "scale":   break;
          // Legacy compat (pre-rebuild voiceForge had `amount`/`air`).
          case "amount":  wetBus.gain.setTargetAtTime(safe(v, 0, -60, 24), t, TAU); break;
          case "air":     /* legacy — no separate air shelf in rebuild */ break;
          default: break;
        } },
        dispose() {
          voices.forEach(v => {
            try { v.ps.dispose(); } catch (e) {}
            disposeNodes(v.g);
          });
          disposeNodes(inBus, dry, wetBus, mixWet, mixDry, out);
        },
      };
    });
    if (fx.tapeStop?.enabled) install("tapeStop", (p) => {
      // Phase C2.3 rebuild: tape-stop pitch sweep via DelayNode automation.
      // Topology: in → delay → lp (darkens during stop) → outGain → out
      // active=true triggers a delayTime ramp from 0 → ~0.5 s over stopTime
      // seconds, plus an outGain ramp to silence, plus an LP sweep for darken.
      // active=false triggers the inverse (start-up). True tape-stop needs a
      // worklet for proper pitch tracking; this is the canonical Web Audio
      // approximation.
      const inNode  = ctx.createGain(); setGainLinear(inNode.gain, 1);
      const outNode = ctx.createGain(); setGainLinear(outNode.gain, 1);
      const delay = ctx.createDelay(1.0);
      setTime(delay.delayTime, 0);
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass';
      setFreq(lp.frequency, 18000);
      setQ(lp.Q, 0.707);
      const trim = ctx.createGain(); setGainLinear(trim.gain, 1);
      inNode.connect(delay);
      delay.connect(lp);
      lp.connect(trim);
      trim.connect(outNode);
      let isActive = !!p.active;
      let stopTime = safe(p.stopTime != null ? p.stopTime : 0.5, 0.5, 0.05, 3);
      let startTime = safe(p.startTime != null ? p.startTime : 0.3, 0.3, 0.05, 3);
      let curveAmt = safe(p.curve != null ? p.curve : 0.5, 0.5, 0, 1);
      const triggerStop = () => {
        const t = ctx.currentTime;
        // Cancel any in-flight ramps.
        try { delay.delayTime.cancelScheduledValues(t); } catch (e) { /* noop */ }
        try { lp.frequency.cancelScheduledValues(t); } catch (e) { /* noop */ }
        try { trim.gain.cancelScheduledValues(t); } catch (e) { /* noop */ }
        delay.delayTime.setValueAtTime(delay.delayTime.value, t);
        lp.frequency.setValueAtTime(lp.frequency.value, t);
        trim.gain.setValueAtTime(trim.gain.value, t);
        // curve 0 = linear, curve 1 = exponential drag (slower at start).
        // Approximate by exponential ramps when curve > 0.
        const useExp = curveAmt > 0.5;
        if (useExp) {
          // expRamp must avoid 0 — use small floor.
          delay.delayTime.exponentialRampToValueAtTime(0.5, t + stopTime);
          lp.frequency.exponentialRampToValueAtTime(200, t + stopTime);
          trim.gain.exponentialRampToValueAtTime(0.0001, t + stopTime);
        } else {
          delay.delayTime.linearRampToValueAtTime(0.5, t + stopTime);
          lp.frequency.linearRampToValueAtTime(200, t + stopTime);
          trim.gain.linearRampToValueAtTime(0.0, t + stopTime);
        }
      };
      const triggerStart = () => {
        const t = ctx.currentTime;
        try { delay.delayTime.cancelScheduledValues(t); } catch (e) { /* noop */ }
        try { lp.frequency.cancelScheduledValues(t); } catch (e) { /* noop */ }
        try { trim.gain.cancelScheduledValues(t); } catch (e) { /* noop */ }
        delay.delayTime.setValueAtTime(delay.delayTime.value, t);
        lp.frequency.setValueAtTime(Math.max(lp.frequency.value, 50), t);
        trim.gain.setValueAtTime(Math.max(trim.gain.value, 0.0001), t);
        const useExp = curveAmt > 0.5;
        if (useExp) {
          delay.delayTime.exponentialRampToValueAtTime(0.0001, t + startTime);
          lp.frequency.exponentialRampToValueAtTime(18000, t + startTime);
          trim.gain.exponentialRampToValueAtTime(1.0, t + startTime);
        } else {
          delay.delayTime.linearRampToValueAtTime(0, t + startTime);
          lp.frequency.linearRampToValueAtTime(18000, t + startTime);
          trim.gain.linearRampToValueAtTime(1.0, t + startTime);
        }
      };
      // Apply initial state — if active=true at build, tape is already stopped.
      if (isActive) {
        setTime(delay.delayTime, 0.5);
        setFreq(lp.frequency, 200);
        setGainLinear(trim.gain, 0.0001);
      }
      return {
        inputNode: inNode, outputNode: outNode,
        setParam(n, v) { switch (n) {
          case "active": {
            const next = !!v;
            if (next === isActive) break;
            isActive = next;
            if (isActive) triggerStop(); else triggerStart();
            break;
          }
          case "stopTime":  stopTime = safe(v, 0.5, 0.05, 3); break;
          case "startTime": startTime = safe(v, 0.3, 0.05, 3); break;
          case "curve":     curveAmt = safe(v, 0.5, 0, 1); break;
          default: break;
        } },
        dispose() { disposeNodes(inNode, delay, lp, trim, outNode); },
      };
    });

    // ── SPX MASTERING ──
    if (fx.stereoImager?.enabled) install("stereoImager", (p) => {
      // Phase C2.1: real M/S split + per-band width on Side channel.
      // in → ChannelSplitter (L,R) → encode M=(L+R)/2, S=(L-R)/2.
      // M passes through. S split 3 ways via xover1/xover2; per-band width gain.
      // Decode: L = M+S', R = M-S' → ChannelMerger.
      const x1 = safe(p.xover1 != null ? p.xover1 : 300,  300,  20, 20000);
      const x2 = safe(p.xover2 != null ? p.xover2 : 5000, 5000, 20, 20000);
      const lowW  = safe(p.lowWidth  != null ? p.lowWidth  : 1.0, 1.0, 0, 4);
      const midW  = safe(p.midWidth  != null ? p.midWidth  : 1.0, 1.0, 0, 4);
      const highW = safe(p.highWidth != null ? p.highWidth : 1.0, 1.0, 0, 4);
      const inSplitter = ctx.createChannelSplitter(2);
      const outMerger  = ctx.createChannelMerger(2);
      const midSum = ctx.createGain(); midSum.gain.value = 0.5;
      inSplitter.connect(midSum, 0); inSplitter.connect(midSum, 1);
      const rInvert = ctx.createGain(); rInvert.gain.value = -1;
      const sideSum = ctx.createGain(); sideSum.gain.value = 0.5;
      inSplitter.connect(sideSum, 0);
      inSplitter.connect(rInvert, 1); rInvert.connect(sideSum);
      const sLowLp1 = ctx.createBiquadFilter(); sLowLp1.type = "lowpass";  setFreq(sLowLp1.frequency, x1); setQ(sLowLp1.Q, 0.707);
      const sLowLp2 = ctx.createBiquadFilter(); sLowLp2.type = "lowpass";  setFreq(sLowLp2.frequency, x1); setQ(sLowLp2.Q, 0.707);
      const sMidHp1 = ctx.createBiquadFilter(); sMidHp1.type = "highpass"; setFreq(sMidHp1.frequency, x1); setQ(sMidHp1.Q, 0.707);
      const sMidHp2 = ctx.createBiquadFilter(); sMidHp2.type = "highpass"; setFreq(sMidHp2.frequency, x1); setQ(sMidHp2.Q, 0.707);
      const sMidLp1 = ctx.createBiquadFilter(); sMidLp1.type = "lowpass";  setFreq(sMidLp1.frequency, x2); setQ(sMidLp1.Q, 0.707);
      const sMidLp2 = ctx.createBiquadFilter(); sMidLp2.type = "lowpass";  setFreq(sMidLp2.frequency, x2); setQ(sMidLp2.Q, 0.707);
      const sHiHp1  = ctx.createBiquadFilter(); sHiHp1.type  = "highpass"; setFreq(sHiHp1.frequency,  x2); setQ(sHiHp1.Q,  0.707);
      const sHiHp2  = ctx.createBiquadFilter(); sHiHp2.type  = "highpass"; setFreq(sHiHp2.frequency,  x2); setQ(sHiHp2.Q,  0.707);
      const gLow  = ctx.createGain(); setGainLinear(gLow.gain,  lowW);
      const gMid  = ctx.createGain(); setGainLinear(gMid.gain,  midW);
      const gHigh = ctx.createGain(); setGainLinear(gHigh.gain, highW);
      const sideOut = ctx.createGain();
      sideSum.connect(sLowLp1); sLowLp1.connect(sLowLp2); sLowLp2.connect(gLow);  gLow.connect(sideOut);
      sideSum.connect(sMidHp1); sMidHp1.connect(sMidHp2); sMidHp2.connect(sMidLp1); sMidLp1.connect(sMidLp2); sMidLp2.connect(gMid); gMid.connect(sideOut);
      sideSum.connect(sHiHp1);  sHiHp1.connect(sHiHp2);   sHiHp2.connect(gHigh); gHigh.connect(sideOut);
      const sInvertOut = ctx.createGain(); sInvertOut.gain.value = -1;
      sideOut.connect(sInvertOut);
      const lOut = ctx.createGain();
      const rOut = ctx.createGain();
      midSum.connect(lOut);      sideOut.connect(lOut);
      midSum.connect(rOut); sInvertOut.connect(rOut);
      lOut.connect(outMerger, 0, 0);
      rOut.connect(outMerger, 0, 1);
      return {
        inputNode: inSplitter, outputNode: outMerger,
        setParam(n, v) { const t = ctx.currentTime; switch (n) {
          case "lowWidth":  gLow.gain.setTargetAtTime(safe(v, 1.0, 0, 4), t, TAU); break;
          case "midWidth":  gMid.gain.setTargetAtTime(safe(v, 1.0, 0, 4), t, TAU); break;
          case "highWidth": gHigh.gain.setTargetAtTime(safe(v, 1.0, 0, 4), t, TAU); break;
          case "xover1": {
            const f = safe(v, 300, 20, 20000);
            sLowLp1.frequency.setTargetAtTime(f, t, TAU); sLowLp2.frequency.setTargetAtTime(f, t, TAU);
            sMidHp1.frequency.setTargetAtTime(f, t, TAU); sMidHp2.frequency.setTargetAtTime(f, t, TAU);
            break;
          }
          case "xover2": {
            const f = safe(v, 5000, 20, 20000);
            sMidLp1.frequency.setTargetAtTime(f, t, TAU); sMidLp2.frequency.setTargetAtTime(f, t, TAU);
            sHiHp1.frequency.setTargetAtTime(f, t, TAU);  sHiHp2.frequency.setTargetAtTime(f, t, TAU);
            break;
          }
          case "width": {
            const w = safe(v, 1.2, 0, 4);
            gLow.gain.setTargetAtTime(w, t, TAU);
            gMid.gain.setTargetAtTime(w, t, TAU);
            gHigh.gain.setTargetAtTime(w, t, TAU);
            break;
          }
          default: break;
        } },
        dispose() {
          disposeNodes(inSplitter, midSum, rInvert, sideSum,
            sLowLp1, sLowLp2, sMidHp1, sMidHp2, sMidLp1, sMidLp2, sHiHp1, sHiHp2,
            gLow, gMid, gHigh, sideOut, sInvertOut, lOut, rOut, outMerger);
        },
      };
    });
    if (fx.loudnessMeter?.enabled) install("loudnessMeter", () => makePassthrough());
    if (fx.ditherForge?.enabled) install("ditherForge", () => makePassthrough());
    if (fx.dcBlock?.enabled) install("dcBlock", () => {
      // Fixed 10Hz HPF — no user params.
      const hp = ctx.createBiquadFilter(); hp.type = "highpass"; setFreq(hp.frequency, 10); setQ(hp.Q, 0.707);
      return { inputNode: hp, outputNode: hp, setParam() {}, dispose() { disposeNodes(hp); } };
    });
    if (fx.harmonicSum?.enabled) install("harmonicSum", (p) => {
      // Phase C2 parameterized harmonic generator. Topology:
      //   input → WaveShaper (curve regen on drive/even/odd/crosstalk) →
      //           highpass (avoids low-end mud accumulating from added harmonics) →
      //           outputGain → output
      // Curve formula (per UI spec):
      //   c[i] = x + drive * (
      //            even2nd * sin(x * 2π) +
      //            odd3rd  * sin(x * 3π) +
      //            odd5th  * sin(x * 5π)
      //          ) + crosstalk * x * x * sign(x) * drive    // asymmetry
      // noiseFloor (dB) is decorative without a noise gate sidechain — accepted
      //   no-op (true noise-floor handling needs a sidechained gate / Phase C5).
      // UI keys: drive, even2nd, odd3rd, odd5th, noiseFloor (no-op),
      //   crosstalk, outputGain (dB).
      const cur = {
        drive:     safe(p.drive    != null ? p.drive    : 0, 0, 0, 4),
        even2nd:   safe(p.even2nd  != null ? p.even2nd  : 0, 0, 0, 1),
        odd3rd:    safe(p.odd3rd   != null ? p.odd3rd   : 0, 0, 0, 1),
        odd5th:    safe(p.odd5th   != null ? p.odd5th   : 0, 0, 0, 1),
        crosstalk: safe(p.crosstalk!= null ? p.crosstalk: 0, 0, 0, 1),
      };
      const buildCurve = () => {
        const N = 2048; const arr = new Float32Array(N);
        for (let i = 0; i < N; i++) {
          const x = (i * 2) / N - 1;
          const harm =
            cur.even2nd * Math.sin(x * Math.PI * 2) +
            cur.odd3rd  * Math.sin(x * Math.PI * 3) +
            cur.odd5th  * Math.sin(x * Math.PI * 5);
          // Asymmetry adds even-order tube-like crosstalk distortion.
          const asym = cur.crosstalk * x * Math.abs(x);
          let y = x + cur.drive * (harm + asym);
          // Soft clip to keep waveshaper sane.
          if (y > 1) y = 1; else if (y < -1) y = -1;
          arr[i] = y;
        }
        return arr;
      };
      const ws = ctx.createWaveShaper(); ws.oversample = "2x";
      ws.curve = buildCurve();
      const hp = ctx.createBiquadFilter(); hp.type = "highpass";
      setFreq(hp.frequency, 30); setQ(hp.Q, 0.707);
      const og = ctx.createGain();
      setGainLinear(og.gain, Math.pow(10, safe(p.outputGain != null ? p.outputGain : 0, 0, -60, 24) / 20));
      ws.connect(hp); hp.connect(og);
      const refresh = () => { ws.curve = buildCurve(); };
      return {
        inputNode: ws, outputNode: og,
        setParam(n, v) { const t = ctx.currentTime; switch (n) {
          case "drive":      cur.drive     = safe(v, 0.4, 0, 4);  refresh(); break;
          case "even2nd":    cur.even2nd   = safe(v, 0.5, 0, 1);  refresh(); break;
          case "odd3rd":     cur.odd3rd    = safe(v, 0.3, 0, 1);  refresh(); break;
          case "odd5th":     cur.odd5th    = safe(v, 0.1, 0, 1);  refresh(); break;
          case "crosstalk":  cur.crosstalk = safe(v, 0.2, 0, 1);  refresh(); break;
          case "outputGain": og.gain.setTargetAtTime(safe(Math.pow(10, safe(v, 0, -60, 24) / 20), 1, 0, 4), t, TAU); break;
          case "noiseFloor": /* Phase C5 — needs sidechain gate for true noise floor */ break;
          default: break;
        } },
        dispose() { disposeNodes(ws, hp, og); },
      };
    });
    if (fx.matchEQ?.enabled) install("matchEQ", (p) => {
      const lo = ctx.createBiquadFilter(); lo.type = "lowshelf"; setFreq(lo.frequency, 200); setGainDb(lo.gain, p.low || 0);
      const hi = ctx.createBiquadFilter(); hi.type = "highshelf"; setFreq(hi.frequency, 8000); setGainDb(hi.gain, p.high || 0);
      lo.connect(hi);
      return {
        inputNode: lo, outputNode: hi,
        setParam(n, v) { const t = ctx.currentTime; switch (n) {
          case "low":  lo.gain.setTargetAtTime(safe(v, 0, -60, 24), t, TAU); break;
          case "high": hi.gain.setTargetAtTime(safe(v, 0, -60, 24), t, TAU); break;
          default: break;
        } },
        dispose() { disposeNodes(lo, hi); },
      };
    });
    if (fx.lowEndFocus?.enabled) install("lowEndFocus", (p) => {
      const hp = ctx.createBiquadFilter(); hp.type = "highpass"; setFreq(hp.frequency, 30);
      const sub = ctx.createBiquadFilter(); sub.type = "peaking"; setFreq(sub.frequency, 60); setQ(sub.Q, 0.8); setGainDb(sub.gain, p.sub || 0);
      const kick = ctx.createBiquadFilter(); kick.type = "peaking"; setFreq(kick.frequency, 100); setQ(kick.Q, 1); setGainDb(kick.gain, p.kick || 0);
      hp.connect(sub); sub.connect(kick);
      return {
        inputNode: hp, outputNode: kick,
        setParam(n, v) { const t = ctx.currentTime; switch (n) {
          case "sub":  sub.gain.setTargetAtTime(safe(v, 0, -60, 24), t, TAU); break;
          case "kick": kick.gain.setTargetAtTime(safe(v, 0, -60, 24), t, TAU); break;
          default: break;
        } },
        dispose() { disposeNodes(hp, sub, kick); },
      };
    });
    if (fx.loudnessTarget?.enabled) install("loudnessTarget", (p) => {
      const lim = ctx.createDynamicsCompressor();
      setCompThresh(lim.threshold, p.ceiling || -1); setCompRatio(lim.ratio, 20); setCompAttack(lim.attack, 0.001); setCompRelease(lim.release, 0.01);
      const g = ctx.createGain(); setGainLinear(g.gain, Math.pow(10, (p.target || 0) / 20));
      lim.connect(g);
      return {
        inputNode: lim, outputNode: g,
        setParam(n, v) { const t = ctx.currentTime; switch (n) {
          case "ceiling": lim.threshold.setTargetAtTime(safe(v, -1, -100, 0), t, TAU); break;
          case "target":  g.gain.setTargetAtTime(safe(Math.pow(10, safe(v, 0, -60, 24) / 20), 1, 0, 4), t, TAU); break;
          default: break;
        } },
        dispose() { disposeNodes(lim, g); },
      };
    });
    if (fx.msImager?.enabled) install("msImager", (p) => {
      const g = ctx.createGain(); setGainLinear(g.gain, p.width || 1);
      return {
        inputNode: g, outputNode: g,
        setParam(n, v) { if (n === "width") g.gain.setTargetAtTime(safe(v, 1, 0, 4), ctx.currentTime, TAU); },
        dispose() { disposeNodes(g); },
      };
    });
    if (fx.spectralRecovery?.enabled) install("spectralRecovery", (p) => {
      const hi = ctx.createBiquadFilter(); hi.type = "highshelf"; setFreq(hi.frequency, 10000); setGainDb(hi.gain, p.amount || 0);
      const ex = ctx.createBiquadFilter(); ex.type = "peaking"; setFreq(ex.frequency, 8000); setQ(ex.Q, 0.5); setGainDb(ex.gain, p.presence || 0);
      hi.connect(ex);
      return {
        inputNode: hi, outputNode: ex,
        setParam(n, v) { const t = ctx.currentTime; switch (n) {
          case "amount":   hi.gain.setTargetAtTime(safe(v, 0, -60, 24), t, TAU); break;
          case "presence": ex.gain.setTargetAtTime(safe(v, 0, -60, 24), t, TAU); break;
          default: break;
        } },
        dispose() { disposeNodes(hi, ex); },
      };
    });
    if (fx.codecPreview?.enabled) install("codecPreview", () => {
      const hp = ctx.createBiquadFilter(); hp.type = "highpass"; setFreq(hp.frequency, 40);
      const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; setFreq(lp.frequency, 16000);
      hp.connect(lp);
      return { inputNode: hp, outputNode: lp, setParam() {}, dispose() { disposeNodes(hp, lp); } };
    });
    if (fx.declicker?.enabled) install("declicker", (p) => {
      // True click detection requires a worklet. UI emits sensitivity, strength,
      // maxWidth — only `strength` maps to any existing node (overall gain
      // attenuation: strength=0 → unity, strength=1 → −20%). sensitivity and
      // maxWidth are Phase C (need transient detector).
      const strengthToGain = (s) => 1 - safe(s, 0, 0, 1) * 0.2;
      const g = ctx.createGain();
      setGainLinear(g.gain, strengthToGain(p.strength != null ? p.strength : 0));
      return {
        inputNode: g, outputNode: g,
        setParam(n, v) { const t = ctx.currentTime; switch (n) {
          case "strength": g.gain.setTargetAtTime(safe(strengthToGain(v), 1, 0, 4), t, TAU); break;
          // Phase C: sensitivity, maxWidth need a transient detector / worklet.
          case "sensitivity": case "maxWidth": break;
          default: break;
        } },
        dispose() { disposeNodes(g); },
      };
    });
    if (fx.dehummer?.enabled) install("dehummer", (p) => {
      // depth (0..1) modulates each notch's Q. Q~0.0001 = bypass; ramps to 20 at depth=1.
      const depthToQ = (d) => 0.0001 + safe(d, 0.5, 0, 1) * 20;
      const initQ = depthToQ(p && p.depth != null ? p.depth : 0.5);
      const n1 = ctx.createBiquadFilter(); n1.type = "notch"; setFreq(n1.frequency, 50);  setQ(n1.Q, initQ);
      const n2 = ctx.createBiquadFilter(); n2.type = "notch"; setFreq(n2.frequency, 60);  setQ(n2.Q, initQ);
      const n3 = ctx.createBiquadFilter(); n3.type = "notch"; setFreq(n3.frequency, 100); setQ(n3.Q, initQ);
      n1.connect(n2); n2.connect(n3);
      return {
        inputNode: n1, outputNode: n3,
        setParam(name, v) { if (name === "depth") {
          const q = depthToQ(v); const t = ctx.currentTime;
          n1.Q.setTargetAtTime(q, t, TAU); n2.Q.setTargetAtTime(q, t, TAU); n3.Q.setTargetAtTime(q, t, TAU);
        } },
        dispose() { disposeNodes(n1, n2, n3); },
      };
    });
    if (fx.dialogueIsolator?.enabled) install("dialogueIsolator", (p) => {
      // True spectral voice isolation needs a worklet. Approximate with a
      // dialogue-band passband + presence peak. UI knobs:
      //   isolation (0–1) — narrows the band (HP up, LP down toward 2.5kHz center)
      //   sensitivity (0–1) — scales the presence peak gain (0–6 dB)
      //   smoothing/mix — Phase C (need envelope follower / dry-wet split).
      const isoToHp = (v) => 100 + safe(v, 0, 0, 1) * 200;   // 100 → 300 Hz
      const isoToLp = (v) => 8000 - safe(v, 0, 0, 1) * 4000; // 8000 → 4000 Hz
      const sensToGain = (v) => safe(v, 0, 0, 1) * 6;        // 0 → 6 dB
      const initIso = p.isolation != null ? p.isolation : 0;
      const initSens = p.sensitivity != null ? p.sensitivity : 0;
      const hp = ctx.createBiquadFilter(); hp.type = "highpass"; setFreq(hp.frequency, isoToHp(initIso));
      const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; setFreq(lp.frequency, isoToLp(initIso));
      const pres = ctx.createBiquadFilter(); pres.type = "peaking"; setFreq(pres.frequency, 2500); setQ(pres.Q, 0.8); setGainDb(pres.gain, sensToGain(initSens));
      hp.connect(lp); lp.connect(pres);
      return {
        inputNode: hp, outputNode: pres,
        setParam(n, v) { const t = ctx.currentTime; switch (n) {
          case "isolation":
            hp.frequency.setTargetAtTime(safe(isoToHp(v), 100, 20, 20000), t, TAU);
            lp.frequency.setTargetAtTime(safe(isoToLp(v), 8000, 20, 20000), t, TAU);
            break;
          case "sensitivity":
            pres.gain.setTargetAtTime(safe(sensToGain(v), 0, -60, 24), t, TAU);
            break;
          // Phase C: smoothing (envelope follower), mix (dry/wet split).
          case "smoothing": case "mix": break;
          default: break;
        } },
        dispose() { disposeNodes(hp, lp, pres); },
      };
    });
    if (fx.phaseScope?.enabled) install("phaseScope", () => makePassthrough());
    if (fx.goniometer?.enabled) install("goniometer", () => makePassthrough());

    // ── Part 16: 14 SPX plugins that previously had UI but no DSP. ──
    // Each handler builds a real Web Audio chain so the user hears their
    // changes. Complex DSP (true SSB freq shift, real granular synthesis,
    // proper vocoder) is approximated via standard nodes; richer
    // implementations live in the audio/plugins/ PluginHost system.
    if (fx.baxandallEQ?.enabled) install("baxandallEQ", (p) => {
      const lo = ctx.createBiquadFilter(); lo.type = "lowshelf";  setFreq(lo.frequency, p.bassFreq   || 100);   setGainDb(lo.gain, p.bass   || 0);
      const mi = ctx.createBiquadFilter(); mi.type = "peaking";   setFreq(mi.frequency, p.midFreq    || 1000);  setQ(mi.Q, p.midQ || 0.7); setGainDb(mi.gain, p.mid || 0);
      const hi = ctx.createBiquadFilter(); hi.type = "highshelf"; setFreq(hi.frequency, p.trebleFreq || 10000); setGainDb(hi.gain, p.treble || 0);
      const og = ctx.createGain(); setGainLinear(og.gain, Math.pow(10, (p.outputGain || 0) / 20));
      lo.connect(mi); mi.connect(hi); hi.connect(og);
      return {
        inputNode: lo, outputNode: og,
        setParam(n, v) { const t = ctx.currentTime; switch (n) {
          case "bass":       lo.gain.setTargetAtTime(safe(v, 0, -60, 24), t, TAU); break;
          case "bassFreq":   lo.frequency.setTargetAtTime(safe(v, 100, 20, 20000), t, TAU); break;
          case "mid":        mi.gain.setTargetAtTime(safe(v, 0, -60, 24), t, TAU); break;
          case "midFreq":    mi.frequency.setTargetAtTime(safe(v, 1000, 20, 20000), t, TAU); break;
          case "midQ":       mi.Q.setTargetAtTime(safe(v, 0.7, 0.0001, 1000), t, TAU); break;
          case "treble":     hi.gain.setTargetAtTime(safe(v, 0, -60, 24), t, TAU); break;
          case "trebleFreq": hi.frequency.setTargetAtTime(safe(v, 10000, 20, 20000), t, TAU); break;
          case "outputGain": og.gain.setTargetAtTime(safe(Math.pow(10, safe(v, 0, -60, 24) / 20), 1, 0, 4), t, TAU); break;
          default: break;
        } },
        dispose() { disposeNodes(lo, mi, hi, og); },
      };
    });
    if (fx.tiltEQ?.enabled) install("tiltEQ", (p) => {
      const tilt = p.tilt || 0;
      const lo = ctx.createBiquadFilter(); lo.type = "lowshelf";  setFreq(lo.frequency, p.tiltFreq || 1000); setGainDb(lo.gain, -tilt / 2);
      const hi = ctx.createBiquadFilter(); hi.type = "highshelf"; setFreq(hi.frequency, p.tiltFreq || 1000); setGainDb(hi.gain,  tilt / 2);
      const pr = ctx.createBiquadFilter(); pr.type = "peaking";   setFreq(pr.frequency, p.presenceFreq || 3000); setQ(pr.Q, 1); setGainDb(pr.gain, p.presence || 0);
      const air = ctx.createBiquadFilter(); air.type = "highshelf"; setFreq(air.frequency, p.airFreq || 12000); setGainDb(air.gain, p.air || 0);
      const og = ctx.createGain(); setGainLinear(og.gain, Math.pow(10, (p.outputGain || 0) / 20));
      lo.connect(hi); hi.connect(pr); pr.connect(air); air.connect(og);
      // tilt and tiltFreq affect both lo+hi shelves — track current values so
      // either knob can recompute the pair.
      let curTilt = tilt, curTiltFreq = p.tiltFreq || 1000;
      const applyTilt = () => {
        const t = ctx.currentTime;
        lo.frequency.setTargetAtTime(safe(curTiltFreq, 1000, 20, 20000), t, TAU);
        hi.frequency.setTargetAtTime(safe(curTiltFreq, 1000, 20, 20000), t, TAU);
        lo.gain.setTargetAtTime(safe(-curTilt / 2, 0, -60, 24), t, TAU);
        hi.gain.setTargetAtTime(safe( curTilt / 2, 0, -60, 24), t, TAU);
      };
      return {
        inputNode: lo, outputNode: og,
        setParam(n, v) { const t = ctx.currentTime; switch (n) {
          case "tilt":         curTilt = safe(v, 0, -24, 24); applyTilt(); break;
          case "tiltFreq":     curTiltFreq = safe(v, 1000, 20, 20000); applyTilt(); break;
          case "presence":     pr.gain.setTargetAtTime(safe(v, 0, -60, 24), t, TAU); break;
          case "presenceFreq": pr.frequency.setTargetAtTime(safe(v, 3000, 20, 20000), t, TAU); break;
          case "air":          air.gain.setTargetAtTime(safe(v, 0, -60, 24), t, TAU); break;
          case "airFreq":      air.frequency.setTargetAtTime(safe(v, 12000, 20, 20000), t, TAU); break;
          case "outputGain":   og.gain.setTargetAtTime(safe(Math.pow(10, safe(v, 0, -60, 24) / 20), 1, 0, 4), t, TAU); break;
          default: break;
        } },
        dispose() { disposeNodes(lo, hi, pr, air, og); },
      };
    });
    if (fx.pultecForge?.enabled) install("pultecForge", (p) => {
      // UI unit for highFreq is kHz. Boost/Atten are separate knobs that
      // combine into a single shelf gain (the Pultec trick is to apply both
      // simultaneously which produces a notch — preserved by combining at apply).
      const lf = p.lowFreq  || 60;
      const hf = (p.highFreq || 10) * 1000;
      const lo = ctx.createBiquadFilter(); lo.type = "lowshelf";  setFreq(lo.frequency, lf); setGainDb(lo.gain, (p.lowBoost  || 0) - (p.lowAtten  || 0));
      const hi = ctx.createBiquadFilter(); hi.type = "highshelf"; setFreq(hi.frequency, hf); setGainDb(hi.gain, (p.highBoost || 0) - (p.highAtten || 0));
      setQ(hi.Q, 0.5 + (p.highBW || 0.5));
      const og = ctx.createGain(); setGainLinear(og.gain, Math.pow(10, (p.outputGain || 0) / 20));
      lo.connect(hi); hi.connect(og);
      let lowBoost = p.lowBoost || 0, lowAtten = p.lowAtten || 0;
      let highBoost = p.highBoost || 0, highAtten = p.highAtten || 0;
      return {
        inputNode: lo, outputNode: og,
        setParam(n, v) { const t = ctx.currentTime; switch (n) {
          case "lowFreq":    lo.frequency.setTargetAtTime(safe(v, 60, 20, 20000), t, TAU); break;
          case "lowBoost":   lowBoost = safe(v, 0, 0, 24); lo.gain.setTargetAtTime(safe(lowBoost - lowAtten, 0, -60, 24), t, TAU); break;
          case "lowAtten":   lowAtten = safe(v, 0, 0, 24); lo.gain.setTargetAtTime(safe(lowBoost - lowAtten, 0, -60, 24), t, TAU); break;
          case "highFreq":   hi.frequency.setTargetAtTime(safe((v || 10) * 1000, 10000, 20, 20000), t, TAU); break;
          case "highBoost":  highBoost = safe(v, 0, 0, 24); hi.gain.setTargetAtTime(safe(highBoost - highAtten, 0, -60, 24), t, TAU); break;
          case "highAtten":  highAtten = safe(v, 0, 0, 24); hi.gain.setTargetAtTime(safe(highBoost - highAtten, 0, -60, 24), t, TAU); break;
          case "highBW":     hi.Q.setTargetAtTime(safe(0.5 + safe(v, 0.5, 0, 4), 1, 0.0001, 1000), t, TAU); break;
          case "outputGain": og.gain.setTargetAtTime(safe(Math.pow(10, safe(v, 0, -60, 24) / 20), 1, 0, 4), t, TAU); break;
          default: break;
        } },
        dispose() { disposeNodes(lo, hi, og); },
      };
    });
    if (fx.graphicEQ?.enabled) install("graphicEQ", (p) => {
      // 31-band ISO graphic EQ. Build all 31 bands always-on at 0 dB so live
      // band edits ramp without rebuild. Pre-amp is always present at unity.
      const ISO = [20,25,31.5,40,50,63,80,100,125,160,200,250,315,400,500,630,800,1000,1250,1600,2000,2500,3150,4000,5000,6300,8000,10000,12500,16000,20000];
      const bands = p.bands || {};
      const filters = ISO.map(f => {
        const b = ctx.createBiquadFilter(); b.type = "peaking"; setFreq(b.frequency, f); setQ(b.Q, 4.3); setGainDb(b.gain, bands[f] || 0);
        return b;
      });
      const og = ctx.createGain(); setGainLinear(og.gain, Math.pow(10, (p.preAmp || 0) / 20));
      let prev = filters[0]; for (let i = 1; i < filters.length; i++) { prev.connect(filters[i]); prev = filters[i]; }
      prev.connect(og);
      return {
        inputNode: filters[0], outputNode: og,
        setParam(n, v) {
          const t = ctx.currentTime;
          if (n === "preAmp") { og.gain.setTargetAtTime(safe(Math.pow(10, safe(v, 0, -60, 24) / 20), 1, 0, 4), t, TAU); return; }
          if (n === "bands" && v && typeof v === "object") {
            ISO.forEach((f, i) => {
              const g = v[f]; if (g === undefined) return;
              filters[i].gain.setTargetAtTime(safe(g, 0, -60, 24), t, TAU);
            });
          }
        },
        dispose() { disposeNodes(og, ...filters); },
      };
    });
    if (fx.stereoWidener?.enabled) install("stereoWidener", (p) => {
      // Mid/Side widener with custom routing — sInv MUST stay negative (phase-invert).
      // Live width knob ramps both sGain (positive) and sInv (negative) symmetrically.
      const w = (p.width != null ? p.width : 1.0);
      const split = ctx.createChannelSplitter(2);
      const mGain = ctx.createGain(); setGainLinear(mGain.gain, 0.5);
      const sGain = ctx.createGain(); setGainLinear(sGain.gain, 0.5 * w);
      const sInv  = ctx.createGain(); sInv.gain.value  = safe(-0.5 * w, -0.5, -4, 0);
      const merge = ctx.createChannelMerger(2);
      const passL = ctx.createGain(), passR = ctx.createGain();
      split.connect(passL, 0); split.connect(passR, 1);
      passL.connect(mGain); passR.connect(mGain); mGain.connect(merge, 0, 0); mGain.connect(merge, 0, 1);
      passL.connect(sGain); passR.connect(sInv);  sGain.connect(merge, 0, 0); sInv.connect(merge, 0, 1);
      return {
        inputNode: split, outputNode: merge,
        setParam(n, v) { const t = ctx.currentTime; if (n === "width") {
          const ww = safe(v, 1, 0, 4);
          sGain.gain.setTargetAtTime(safe(0.5 * ww, 0.5, 0, 4), t, TAU);
          // sInv must remain negative — setTargetAtTime tolerates negative targets.
          sInv.gain.setTargetAtTime(safe(-0.5 * ww, -0.5, -4, 0), t, TAU);
        } },
        dispose() { disposeNodes(split, mGain, sGain, sInv, merge, passL, passR); },
      };
    });
    if (fx.enhancer808?.enabled) install("enhancer808", (p) => {
      // Sub boost via lowshelf, harmonic exciter via tanh, output trim.
      // freq couples sub.frequency and punch.frequency (1.5×) — track in closure.
      const sub = ctx.createBiquadFilter(); sub.type = "lowshelf"; setFreq(sub.frequency, p.freq || 60); setGainDb(sub.gain, (p.sub || 0) * 12);
      const punch = ctx.createBiquadFilter(); punch.type = "peaking"; setFreq(punch.frequency, (p.freq || 60) * 1.5); setQ(punch.Q, 1.2); setGainDb(punch.gain, (p.punch || 0) * 6);
      const ws = ctx.createWaveShaper(); ws.oversample = "2x"; ws.curve = makeTanhCurve(p.harmonic || 0);
      const og = ctx.createGain(); setGainLinear(og.gain, p.outputGain != null ? p.outputGain : 1.0);
      sub.connect(punch); punch.connect(ws); ws.connect(og);
      return {
        inputNode: sub, outputNode: og,
        setParam(n, v) { const t = ctx.currentTime; switch (n) {
          case "freq":       sub.frequency.setTargetAtTime(safe(v, 60, 20, 20000), t, TAU);
                             punch.frequency.setTargetAtTime(safe((v || 60) * 1.5, 90, 20, 20000), t, TAU); break;
          case "sub":        sub.gain.setTargetAtTime(safe(safe(v, 0, 0, 1) * 12, 0, -60, 24), t, TAU); break;
          case "punch":      punch.gain.setTargetAtTime(safe(safe(v, 0, 0, 1) * 6, 0, -60, 24), t, TAU); break;
          case "harmonic":   ws.curve = makeTanhCurve(v); break;
          case "outputGain": og.gain.setTargetAtTime(safe(v, 1, 0, 4), t, TAU); break;
          default: break;
        } },
        dispose() { disposeNodes(sub, punch, ws, og); },
      };
    });
    if (fx.formantFilter?.enabled) install("formantFilter", (p) => {
      // Phase C2: 3 peaking filters at morphed F1/F2/F3 with optional autoWah
      // LFO modulating each filter's frequency, plus wet/dry mix.
      const FORMANTS = { A:[700,1220,2600], E:[400,1700,2400], I:[270,2290,3010], O:[450,800,2830], U:[325,700,2530] };
      let curA = FORMANTS[p.vowelA] || FORMANTS.A;
      let curB = FORMANTS[p.vowelB] || FORMANTS.E;
      let curMorph = p.morph != null ? p.morph : 0.5;
      let curQ = p.q || 8;
      let autoWah = !!p.autoWah;
      let wahDepth = safe(p.wahDepth != null ? p.wahDepth : 0.5, 0.5, 0, 1);
      const inGain = ctx.createGain(); setGainLinear(inGain.gain, 1);
      const f1 = ctx.createBiquadFilter(); f1.type = "peaking"; setFreq(f1.frequency, curA[0]*(1-curMorph) + curB[0]*curMorph); setQ(f1.Q, curQ); setGainDb(f1.gain, 18);
      const f2 = ctx.createBiquadFilter(); f2.type = "peaking"; setFreq(f2.frequency, curA[1]*(1-curMorph) + curB[1]*curMorph); setQ(f2.Q, curQ); setGainDb(f2.gain, 14);
      const f3 = ctx.createBiquadFilter(); f3.type = "peaking"; setFreq(f3.frequency, curA[2]*(1-curMorph) + curB[2]*curMorph); setQ(f3.Q, curQ); setGainDb(f3.gain, 10);
      const initMix = safe(((p.mix != null ? p.mix : 0) / 100), 0, 0, 1);
      const wet = ctx.createGain(); setMix(wet.gain, initMix);
      const dry = ctx.createGain(); setMix(dry.gain, 1 - initMix);
      const og = ctx.createGain(); setGainLinear(og.gain, Math.pow(10, (p.outputGain || 0) / 20));
      const lfo = ctx.createOscillator(); lfo.type = "sine"; setFreq(lfo.frequency, p.wahRate || 1);
      const lfoG1 = ctx.createGain(); const lfoG2 = ctx.createGain(); const lfoG3 = ctx.createGain();
      const updateLfoDepths = () => {
        const f1c = curA[0]*(1-curMorph) + curB[0]*curMorph;
        const f2c = curA[1]*(1-curMorph) + curB[1]*curMorph;
        const f3c = curA[2]*(1-curMorph) + curB[2]*curMorph;
        const dGain = autoWah ? wahDepth : 0;
        setGainLinear(lfoG1.gain, f1c * 0.3 * dGain);
        setGainLinear(lfoG2.gain, f2c * 0.4 * dGain);
        setGainLinear(lfoG3.gain, f3c * 0.5 * dGain);
      };
      updateLfoDepths();
      lfo.connect(lfoG1); lfo.connect(lfoG2); lfo.connect(lfoG3);
      lfoG1.connect(f1.frequency); lfoG2.connect(f2.frequency); lfoG3.connect(f3.frequency);
      lfo.start();
      inGain.connect(f1); f1.connect(f2); f2.connect(f3); f3.connect(wet); wet.connect(og);
      inGain.connect(dry); dry.connect(og);
      const applyFormants = () => {
        const t = ctx.currentTime;
        f1.frequency.setTargetAtTime(safe(curA[0]*(1-curMorph) + curB[0]*curMorph, 700, 20, 20000), t, TAU);
        f2.frequency.setTargetAtTime(safe(curA[1]*(1-curMorph) + curB[1]*curMorph, 1220, 20, 20000), t, TAU);
        f3.frequency.setTargetAtTime(safe(curA[2]*(1-curMorph) + curB[2]*curMorph, 2600, 20, 20000), t, TAU);
        updateLfoDepths();
      };
      return {
        inputNode: inGain, outputNode: og,
        setParam(n, v) { const t = ctx.currentTime; switch (n) {
          case "vowelA":     curA = FORMANTS[v] || FORMANTS.A; applyFormants(); break;
          case "vowelB":     curB = FORMANTS[v] || FORMANTS.E; applyFormants(); break;
          case "morph":      curMorph = safe(v, 0.5, 0, 1); applyFormants(); break;
          case "q":          curQ = safe(v, 8, 0.0001, 1000);
                             f1.Q.setTargetAtTime(curQ, t, TAU); f2.Q.setTargetAtTime(curQ, t, TAU); f3.Q.setTargetAtTime(curQ, t, TAU); break;
          case "autoWah":    autoWah = !!v; updateLfoDepths(); break;
          case "wahRate":    lfo.frequency.setTargetAtTime(safe(v, 1, 0.01, 50), t, TAU_LFO); break;
          case "wahDepth":   wahDepth = safe(v, 0.5, 0, 1); updateLfoDepths(); break;
          case "mix": {
            const m = safe((v || 0) / 100, 0, 0, 1);
            wet.gain.setTargetAtTime(m, t, TAU);
            dry.gain.setTargetAtTime(1 - m, t, TAU);
            break;
          }
          case "outputGain": og.gain.setTargetAtTime(safe(Math.pow(10, safe(v, 0, -60, 24) / 20), 1, 0, 4), t, TAU); break;
          default: break;
        } },
        dispose() { stopOscs(lfo); disposeNodes(inGain, f1, f2, f3, lfoG1, lfoG2, lfoG3, wet, dry, og); },
      };
    });
    if (fx.freqShifter?.enabled) install("freqShifter", (p) => {
      // Phase C4: TRUE single-sideband (SSB) frequency shifter using a
      // Hilbert-transform pair built from cascaded all-pass biquads (Olli
      // Niemitalo 8-section coefficients). Output: y = I·cos(ωt) - Q·sin(ωt)
      // (positive shift) or y = I·cos(ωt) + Q·sin(ωt) (negative). Quality:
      // clean to ±2 kHz, mild aliasing past ±5 kHz, residual leakage <50 Hz.
      const HILBERT_A = [0.4670940904, 0.1232728458, 0.0290015347, 0.0061119025];
      const HILBERT_B = [0.2967226020, 0.0729604006, 0.0166937845, 0.0030597117];
      const buildHilbert = (poles2) => {
        const inG = ctx.createGain();
        let last = inG;
        poles2.forEach((p2) => {
          // 2nd-order all-pass: H(z) = (a² + z^-2) / (1 + a²·z^-2)
          const ap = new IIRFilterNode(ctx, { feedforward: [p2, 0, 1], feedback: [1, 0, p2] });
          last.connect(ap); last = ap;
        });
        const outG = ctx.createGain();
        last.connect(outG);
        return { input: inG, output: outG };
      };
      const branchI = buildHilbert(HILBERT_A);
      const branchQ = buildHilbert(HILBERT_B);

      const inGain = ctx.createGain(); setGainLinear(inGain.gain, 1);
      const outGain = ctx.createGain(); setGainLinear(outGain.gain, 1);
      const dry = ctx.createGain();
      const wet = ctx.createGain();
      // Sample-delay on Q branch aligns the polyphase Hilbert pair group delay.
      const sampleDelay = ctx.createDelay(1 / ctx.sampleRate + 0.001);
      sampleDelay.delayTime.value = 1 / ctx.sampleRate;

      inGain.connect(branchI.input);
      inGain.connect(sampleDelay);
      sampleDelay.connect(branchQ.input);

      const cosOsc = ctx.createOscillator();
      const sinOsc = ctx.createOscillator();
      const cosWave = ctx.createPeriodicWave(new Float32Array([0, 1]), new Float32Array([0, 0]), { disableNormalization: true });
      const sinWave = ctx.createPeriodicWave(new Float32Array([0, 0]), new Float32Array([0, 1]), { disableNormalization: true });
      cosOsc.setPeriodicWave(cosWave);
      sinOsc.setPeriodicWave(sinWave);
      const shift0 = safe(p.shift != null ? p.shift : 0, 0, -5000, 5000);
      cosOsc.frequency.value = Math.abs(shift0);
      sinOsc.frequency.value = Math.abs(shift0);

      const mulI = ctx.createGain(); mulI.gain.value = 0;
      const mulQ = ctx.createGain(); mulQ.gain.value = 0;
      cosOsc.connect(mulI.gain);
      sinOsc.connect(mulQ.gain);
      branchI.output.connect(mulI);
      branchQ.output.connect(mulQ);

      const qSign = ctx.createGain();
      qSign.gain.value = shift0 >= 0 ? -1 : 1;
      mulQ.connect(qSign);

      const sumNode = ctx.createGain();
      mulI.connect(sumNode);
      qSign.connect(sumNode);
      sumNode.connect(wet);
      wet.connect(outGain);
      inGain.connect(dry); dry.connect(outGain);

      const mix0 = safe(p.mix != null ? (p.mix > 1 ? p.mix / 100 : p.mix) : 1, 1, 0, 1);
      setGainLinear(wet.gain, mix0);
      setGainLinear(dry.gain, 1 - mix0);

      cosOsc.start(); sinOsc.start();
      let curShift = shift0;

      return {
        inputNode: inGain, outputNode: outGain,
        setParam(n, v) { const t = ctx.currentTime; switch (n) {
          case "shift": {
            const s = safe(v != null ? v : 0, 0, -5000, 5000);
            curShift = s;
            cosOsc.frequency.setTargetAtTime(Math.abs(s), t, TAU);
            sinOsc.frequency.setTargetAtTime(Math.abs(s), t, TAU);
            qSign.gain.setTargetAtTime(s >= 0 ? -1 : 1, t, TAU);
            break;
          }
          case "mix": {
            const m = safe(v > 1 ? v / 100 : v, 1, 0, 1);
            wet.gain.setTargetAtTime(m, t, TAU);
            dry.gain.setTargetAtTime(1 - m, t, TAU);
            break;
          }
          // V2: lfoRate / lfoDepth need a second LFO modulating cos/sin freq.
          case "lfoRate": case "lfoDepth": break;
          default: break;
        } },
        dispose() {
          stopOscs(cosOsc, sinOsc);
          disposeNodes(inGain, outGain, dry, wet, mulI, mulQ, qSign, sumNode,
            sampleDelay, branchI.input, branchI.output, branchQ.input, branchQ.output);
        },
      };
    });
    if (fx.granularFreeze?.enabled) install("granularFreeze", (p) => {
      // Long delay with high feedback approximates the "frozen" texture.
      const d = ctx.createDelay(2.0);
      setTime(d.delayTime, (p.grainSize || 80) / 1000);
      const fb = ctx.createGain(); setMix(fb.gain, p.freeze ? 0.95 : (p.density || 0.7) * 0.6);
      const wet = ctx.createGain(); setMix(wet.gain, ((p.mix != null ? p.mix : 80) / 100));
      const og  = ctx.createGain(); setGainLinear(og.gain, Math.pow(10, (p.outputGain || 0) / 20));
      d.connect(fb); fb.connect(d); d.connect(wet); wet.connect(og);
      let frozen = !!p.freeze, density = p.density != null ? p.density : 0.7;
      const applyFb = () => fb.gain.setTargetAtTime(safe(frozen ? 0.95 : safe(density, 0.7, 0, 1) * 0.6, 0.42, 0, 0.95), ctx.currentTime, TAU);
      return {
        inputNode: d, outputNode: og,
        setParam(n, v) { const t = ctx.currentTime; switch (n) {
          case "grainSize":  d.delayTime.setTargetAtTime(safe((v || 80) / 1000, 0.08, 0, 2), t, TAU); break;
          case "freeze":     frozen = !!v; applyFb(); break;
          case "density":    density = safe(v, 0.7, 0, 1); applyFb(); break;
          case "mix":        wet.gain.setTargetAtTime(safe((v || 0) / 100, 0.8, 0, 1), t, TAU); break;
          case "outputGain": og.gain.setTargetAtTime(safe(Math.pow(10, safe(v, 0, -60, 24) / 20), 1, 0, 4), t, TAU); break;
          // Phase C candidates — need granular-engine node tree (pitch shifter,
          // grain scheduler, position/randomize). Explicit no-ops to document.
          case "pitch":      /* needs pitch-shift — Phase C */ break;
          case "spread":     /* needs L/R split — Phase C */ break;
          case "position":   /* needs grain buffer — Phase C */ break;
          case "randomize":  /* needs grain scheduler — Phase C */ break;
          case "attack":     /* needs grain envelope — Phase C */ break;
          case "release":    /* needs grain envelope — Phase C */ break;
          default: break;
        } },
        dispose() { disposeNodes(d, fb, wet, og); },
      };
    });
    if (fx.noiseReduction?.enabled) install("noiseReduction", (p) => {
      // Frequency-aware downward expander approximation.
      // UI param aliases: smoothing (0..1) → c.knee (0..30 dB).
      // learn/learnDone/preserveTransients: state flags / detector that have
      // no audio node — accepted as no-ops (workflow lives in UI only).
      const hp = ctx.createBiquadFilter(); hp.type = "highpass"; setFreq(hp.frequency, 60);
      const c = ctx.createDynamicsCompressor();
      setCompThresh(c.threshold, p.threshold != null ? p.threshold : -40);
      setCompRatio(c.ratio, 1 + (p.reduction != null ? p.reduction : 0) * 6);
      setCompAttack(c.attack, (p.attack || 10) / 1000);
      setCompRelease(c.release, (p.release || 200) / 1000);
      setCompKnee(c.knee, safe(p.smoothing != null ? p.smoothing : 0, 0, 0, 1) * 30);
      const og = ctx.createGain(); setGainLinear(og.gain, Math.pow(10, (p.outputGain || 0) / 20));
      hp.connect(c); c.connect(og);
      return {
        inputNode: hp, outputNode: og,
        setParam(n, v) { const t = ctx.currentTime; switch (n) {
          case "threshold":  c.threshold.setTargetAtTime(safe(v, -40, -100, 0), t, TAU); break;
          case "reduction":  c.ratio.setTargetAtTime(safe(1 + safe(v, 0, 0, 1) * 6, 1, 1, 20), t, TAU); break;
          case "attack":     c.attack.setTargetAtTime(safe((v || 10) / 1000, 0.01, 0, 1), t, TAU); break;
          case "release":    c.release.setTargetAtTime(safe((v || 200) / 1000, 0.2, 0, 1), t, TAU); break;
          case "smoothing":  c.knee.setTargetAtTime(safe(safe(v, 0, 0, 1) * 30, 0, 0, 40), t, TAU); break;
          case "outputGain": og.gain.setTargetAtTime(safe(Math.pow(10, safe(v, 0, -60, 24) / 20), 1, 0, 4), t, TAU); break;
          case "learn":              /* UI workflow flag — no audio node */ break;
          case "learnDone":          /* UI workflow flag — no audio node */ break;
          case "preserveTransients": /* needs transient detector — Phase C */ break;
          default: break;
        } },
        dispose() { disposeNodes(hp, c, og); },
      };
    });
    if (fx.ringMod?.enabled) install("ringMod", (p) => {
      const carrier = ctx.createOscillator();
      carrier.type = p.carrierType || "sine";
      setFreq(carrier.frequency, p.carrierFreq || 440);
      const dc = ctx.createGain(); setGainLinear(dc.gain, (p.mode === "am") ? 0.5 : 0);
      const carrierGain = ctx.createGain(); setGainLinear(carrierGain.gain, 1);
      const ampMod = ctx.createGain(); setGainLinear(ampMod.gain, 0);
      carrier.connect(carrierGain); carrierGain.connect(ampMod.gain);
      carrier.start();
      const wet = ctx.createGain(); setMix(wet.gain, ((p.mix != null ? p.mix : 0) / 100));
      const og  = ctx.createGain(); setGainLinear(og.gain, Math.pow(10, (p.outputGain || 0) / 20));
      ampMod.connect(wet); wet.connect(og);
      return {
        inputNode: ampMod, outputNode: og,
        setParam(n, v) { const t = ctx.currentTime; switch (n) {
          case "carrierType": try { carrier.type = v || "sine"; } catch (e) {} break;
          case "carrierFreq": carrier.frequency.setTargetAtTime(safe(v, 440, 0, 20000), t, TAU); break;
          case "mode":        dc.gain.setTargetAtTime(safe(v === "am" ? 0.5 : 0, 0, 0, 4), t, TAU); break;
          case "mix":         wet.gain.setTargetAtTime(safe((v || 0) / 100, 0, 0, 1), t, TAU); break;
          case "outputGain":  og.gain.setTargetAtTime(safe(Math.pow(10, safe(v, 0, -60, 24) / 20), 1, 0, 4), t, TAU); break;
          default: break;
        } },
        dispose() { stopOscs(carrier); disposeNodes(dc, carrierGain, ampMod, wet, og); },
      };
    });
    if (fx.spectrumAnalyzer?.enabled) install("spectrumAnalyzer", () => makePassthrough());
    if (fx.loudnessMeter2?.enabled) install("loudnessMeter2", () => makePassthrough());
    if (fx.vocoderSPX?.enabled) install("vocoderSPX", (p) => {
      // N peaking filters log-spaced from carrierFreq. Always build MAX_BANDS
      // (16) so live `bands` knob can mute extras with gain=0 instead of
      // requiring a chain rebuild.
      const MAX_BANDS = 16;
      const activeBands = Math.min(MAX_BANDS, p.bands || 16);
      const baseF = p.carrierFreq || 110;
      const filters = [];
      for (let i = 0; i < MAX_BANDS; i++) {
        const b = ctx.createBiquadFilter(); b.type = "peaking";
        setFreq(b.frequency, baseF * Math.pow(2, i * 6 / MAX_BANDS));
        setQ(b.Q, 4 + (p.unvoiced || 0.3) * 10);
        setGainDb(b.gain, i < activeBands ? 6 : 0);
        filters.push(b);
      }
      let prev = filters[0]; for (let i = 1; i < filters.length; i++) { prev.connect(filters[i]); prev = filters[i]; }
      const og = ctx.createGain(); const initMix = (p.mix != null ? p.mix : 0) / 100;
      setGainLinear(og.gain, initMix * Math.pow(10, (p.outputGain || 0) / 20));
      prev.connect(og);
      // Internal sawtooth carrier so vocoder is audible without an external carrier.
      const _validTypes = ["sine", "square", "triangle", "sawtooth"];
      const _initCarrierType = _validTypes.indexOf(p.carrierType) >= 0 ? p.carrierType : "sawtooth";
      const carrier = ctx.createOscillator(); carrier.type = _initCarrierType;
      try { carrier.frequency.value = safe(baseF, 110, 20, 20000); } catch (e) {}
      const carrierGainNode = ctx.createGain(); carrierGainNode.gain.value = 0.3;
      carrier.connect(carrierGainNode); carrierGainNode.connect(filters[0]);
      try { carrier.start(); } catch (e) {}
      let curBase = baseF, curBands = activeBands, curUnvoiced = p.unvoiced || 0.3;
      let curMix = initMix, curOutGain = p.outputGain || 0;
      const applyFreqs = () => {
        const t = ctx.currentTime;
        for (let i = 0; i < MAX_BANDS; i++) {
          filters[i].frequency.setTargetAtTime(safe(curBase * Math.pow(2, i * 6 / MAX_BANDS), 110, 20, 20000), t, TAU);
        }
      };
      const applyBandCount = () => {
        const t = ctx.currentTime;
        for (let i = 0; i < MAX_BANDS; i++) filters[i].gain.setTargetAtTime(safe(i < curBands ? 6 : 0, 0, -60, 24), t, TAU);
      };
      const applyOutput = () => og.gain.setTargetAtTime(safe(curMix * Math.pow(10, safe(curOutGain, 0, -60, 24) / 20), 1, 0, 4), ctx.currentTime, TAU);
      // formantShift: scale all band frequencies by 2^(semitones/12).
      let curFormantSemi = safe(p.formantShift != null ? p.formantShift : 0, 0, -24, 24);
      const applyFreqsWithFormant = () => {
        const t = ctx.currentTime;
        const scale = Math.pow(2, curFormantSemi / 12);
        for (let i = 0; i < MAX_BANDS; i++) {
          filters[i].frequency.setTargetAtTime(
            safe(curBase * scale * Math.pow(2, i * 6 / MAX_BANDS), 110, 20, 20000), t, TAU);
        }
      };
      return {
        inputNode: filters[0], outputNode: og,
        setParam(n, v) { switch (n) {
          case "bands":        curBands = Math.min(MAX_BANDS, Math.max(1, Math.floor(safe(v, 16, 1, MAX_BANDS)))); applyBandCount(); break;
          case "carrierFreq":  curBase = safe(v, 110, 20, 20000); applyFreqsWithFormant();
                               try { carrier.frequency.setTargetAtTime(curBase, ctx.currentTime, TAU); } catch (e) {} break;
          case "formantShift": curFormantSemi = safe(v, 0, -24, 24); applyFreqsWithFormant(); break;
          case "unvoiced":     curUnvoiced = safe(v, 0.3, 0, 1);
                               for (const f of filters) f.Q.setTargetAtTime(safe(4 + curUnvoiced * 10, 7, 0.0001, 1000), ctx.currentTime, TAU); break;
          case "mix":          curMix = safe((v || 0) / 100, 0, 0, 1); applyOutput(); break;
          case "outputGain":   curOutGain = safe(v, 0, -60, 24); applyOutput(); break;
          // Phase C candidates — need oscillator carrier + envelope follower
          // tree. Static peaking-filter approximation cannot honor these.
          case "carrierType":  if (_validTypes.indexOf(v) >= 0) { try { carrier.type = v; } catch (e) {} } break;
          case "attack":       /* no envelope follower — Phase C */ break;
          case "release":      /* no envelope follower — Phase C */ break;
          case "breathiness":  /* needs noise generator — Phase C */ break;
          case "freeze":       /* needs envelope-hold — Phase C */ break;
          default: break;
        } },
        dispose() { try { carrier.stop(); } catch (e) {} disposeNodes(carrierGainNode, og, ...filters); },
      };
    });

    // ── Part 16: PluginHost factories ─────────────────────────────────────
    // Any track.effects key prefixed `ph_` resolves to a plugin factory in
    // PLUGIN_FACTORIES (the 111-plugin library in audio/plugins/). The factory
    // returns { inputNode, outputNode, ... }; we push as a compound node so
    // the existing chainer wires it without dry-shortcut bleed. Param updates
    // happen by re-instantiating on fxSignature change — same coarse-grained
    // strategy buildFxChain uses today for native effects.
    for (const fxKey of Object.keys(fx)) {
      if (!fxKey.startsWith("ph_") || !fx[fxKey]?.enabled) continue;
      const pluginId = fxKey.slice(3);  // "ph_a_i_compressor" → "a_i_compressor"
      const factory = PLUGIN_FACTORIES[pluginId];
      if (!factory) { console.warn("[SPX PluginHost] no factory for", pluginId); continue; }
      const def = pluginRegistry[pluginId];
      const defaults = {};
      if (def?.params) def.params.forEach(p => { defaults[p.id] = p.default; });
      const params = { ...defaults, ...fx[fxKey] };
      delete params.enabled;
      try {
        const inst = factory(ctx, params);
        const inp = inst?.inputNode || inst?.node;
        const out = inst?.outputNode || inst?.inputNode || inst?.node;
        if (inp && out) {
          nodes.push({ inputNode: inp, outputNode: out, _hostInstance: inst, _pluginId: pluginId });
        }
      } catch (e) { console.warn("[SPX PluginHost] factory threw for", pluginId, e); }
    }

    return nodes;
  };

  const buildSends = (ctx, track, dry, master) => {
    const sendNodes = [];
    if (!track.effects) return sendNodes;
    const fx = track.effects;
    if (fx.reverb?.enabled && fx.reverb.mix > 0) { const conv = ctx.createConvolver(); conv.buffer = getReverbBuf(ctx, fx.reverb.decay); const g = ctx.createGain(); g.gain.value = fx.reverb.mix; dry.connect(conv); conv.connect(g); g.connect(master); sendNodes.push(conv, g); }
    if (fx.delay?.enabled && fx.delay.mix > 0)   { const d = ctx.createDelay(5); d.delayTime.value = fx.delay.time; const fb = ctx.createGain(); fb.gain.value = fx.delay.feedback; const mx = ctx.createGain(); mx.gain.value = fx.delay.mix; dry.connect(d); d.connect(fb); fb.connect(d); d.connect(mx); mx.connect(master); sendNodes.push(d, fb, mx); }
    return sendNodes;
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
      // Turn off — stop reference and disconnect chain
      if (abRefSourceRef.current) {
        try { abRefSourceRef.current.stop(); } catch(e) {}
        try { abRefSourceRef.current.disconnect(); } catch(e) {}
        abRefSourceRef.current = null;
      }
      if (abRefGainRef.current) {
        try { abRefGainRef.current.disconnect(); } catch(e) {}
        abRefGainRef.current = null;
      }
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
    const fxNodes = (track.effects && Object.keys(track.effects).length) ? buildFxChain(ctx, track, "monitor") : [];
    let last = preGain;
    // F4-C-FIX: drop the silent `|| n` fallback that was wrapping the
    // entry itself (a plain object) when its inputNode/outputNode were
    // undefined — that's what threw "Failed to execute 'connect' on
    // 'AudioNode': Overload resolution failed". Now skip + log instead.
    fxNodes.forEach(n => {
      const ni = n.inputNode, no = n.outputNode;
      if (!ni || !no || typeof ni.connect !== "function") {
        console.error("[F4-C-FIX] ensureTrackGraph chainer skipping invalid entry:", n);
        return;
      }
      last.connect(ni); last = no;
    });
    last.connect(panNode); panNode.connect(fader); fader.connect(meter);
    const boardId = trackConsoleChar[track.id] || "none";
    const consoleOut = ctx.createGain();
    const consoleNodes = applyConsoleCharacter(ctx, meter, consoleOut, boardId, { trackId: track.id, consoleScope: "console:monitor", params: trackConsoleParams[track.id] }) || [];
    const busTrack = track.busTarget ? tracks.find(t => t.id === track.busTarget) : null;
    const busNodes = busTrack ? trackNodesRef.current.get(busTrack.id) : null;
    const dest = (busNodes && busNodes.input) ? busNodes.input : masterGainRef.current;
    consoleOut.connect(dest);
    const sendNodes = buildSends(ctx, track, fader, dest) || [];
    input.connect(preGain);
    const nodes = { input, preGain, panNode, fader, meter, fxNodes, consoleOut, consoleNodes, sendNodes, dest };
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
    const fxNodes = (busTrack.effects && Object.keys(busTrack.effects).length) ? buildFxChain(ctx, busTrack, "bus") : [];
    let last = preGain;
    // F4-C-FIX: same chainer guard as ensureTrackGraph.
    fxNodes.forEach(n => {
      const ni = n.inputNode, no = n.outputNode;
      if (!ni || !no || typeof ni.connect !== "function") {
        console.error("[F4-C-FIX] ensureBusGraph chainer skipping invalid entry:", n);
        return;
      }
      last.connect(ni); last = no;
    });
    last.connect(panNode); panNode.connect(fader); fader.connect(meter);
    const busConsoleOut = ctx.createGain();
    const busConsoleNodes = applyConsoleCharacter(ctx, meter, busConsoleOut, trackConsoleChar[busTrack?.id] || "none", { trackId: busTrack?.id, params: trackConsoleParams[busTrack?.id] }) || [];
    busConsoleOut.connect(masterGainRef.current);
    input.connect(preGain);
    const nodes = { input, preGain, panNode, fader, meter, fxNodes, consoleOut: busConsoleOut, consoleNodes: busConsoleNodes, sendNodes: [], isBus: true };
    trackNodesRef.current.set(busTrack.id, nodes);
    applyTrackToNodes(busTrack, nodes);
    return nodes;
  };

  const rebuildTrackGraph = (trackId) => {
    const ctx = audioCtxRef.current; if (!ctx) return;
    const track = tracks.find(t => t.id === trackId); if (!track) return;
    const old = trackNodesRef.current.get(trackId);
    if (old) {
      ["input","preGain","panNode","fader","meter","consoleOut"].forEach(k => { try { old[k]?.disconnect(); } catch (_) {} });
      (old.fxNodes || []).forEach(n => {
        // Part 16: handle compound nodes ({inputNode, outputNode}) — disconnect
        // both ends so feedback paths and modulation oscillators tear down cleanly.
        const ni = n.inputNode || n, no = n.outputNode || n;
        try { if (typeof n.stop === "function") n.stop(); } catch (_) {}
        try { ni.disconnect(); } catch (_) {}
        if (no !== ni) { try { no.disconnect(); } catch (_) {} }
      });
      (old.consoleNodes || []).forEach(n => { try { n.disconnect(); } catch (_) {} });
      (old.sendNodes || []).forEach(n => { try { n.disconnect(); } catch (_) {} });
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
      applyConsoleCharacter(ctx, masterGainRef.current, masterConsoleOutNode, masterConsoleChar || "none", { trackId: "master", params: masterConsoleParams || undefined });
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
  }, [masterVolume, masterPan, sampleRate, masterConsoleChar]);

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
  // Bug #4b-1: previous impl computed `iv = (60 / bpm) * 1000` once via setInterval, so changing
  // bpm while running did NOT update tick rate. Now we use a self-rescheduling setTimeout that
  // reads bpmRef.current each tick, and a useEffect below restarts on bpm changes.
  const metroCtxRef = useRef(null);
  const metroBeatRef = useRef(0);
  const startMetronome = (ctx) => {
    if (metroRef.current) { clearTimeout(metroRef.current); metroRef.current = null; }
    metroCtxRef.current = ctx; metroBeatRef.current = 0;
    const click = (isDownbeat) => {
      const c = metroCtxRef.current;
      try {
        if (!c || c.state === "closed") return;
        const o = c.createOscillator(); const g = c.createGain();
        o.frequency.value = isDownbeat ? 1000 : 800;
        g.gain.setValueAtTime(0.35, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.06);
        o.connect(g); g.connect(c.destination); o.start(c.currentTime); o.stop(c.currentTime + 0.06);
      } catch (e) {}
    };
    const tick = () => {
      const beats = (timeSignatureRef.current && timeSignatureRef.current[0]) || 4;
      click(metroBeatRef.current === 0);
      metroBeatRef.current = (metroBeatRef.current + 1) % beats;
      // Re-read bpm every tick so live tempo edits propagate immediately.
      const iv = (60 / (bpmRef.current || 120)) * 1000;
      metroRef.current = setTimeout(tick, iv);
    };
    tick();
  };

  const stopMetronome = () => { if (metroRef.current) { clearTimeout(metroRef.current); metroRef.current = null; } };

  // Bug #4b-1: rescue running metronome when bpm or timeSignature changes mid-flight.
  useEffect(() => {
    if (!metronomeOnRef.current) return;
    if (metroRef.current) { clearTimeout(metroRef.current); metroRef.current = null; }
    if (metroCtxRef.current) startMetronome(metroCtxRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bpm, timeSignature]);

  // Bug #6: pre-roll length is now configurable (countInBars). Bug #4b-1: tick rate also reads bpmRef per tick.
  const playCountIn = (ctx) => new Promise(res => {
    const beatsPerBar = (timeSignatureRef.current && timeSignatureRef.current[0]) || 4;
    const totalBeats = Math.max(1, (countInBars || 1) * beatsPerBar);
    let c = 0;
    const click = () => {
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.frequency.value = c === 0 ? 1200 : 1000; g.gain.value = 0.5;
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
      o.connect(g); g.connect(ctx.destination); o.start(ctx.currentTime); o.stop(ctx.currentTime + 0.06);
    };
    const step = () => {
      click();
      c++;
      if (c >= totalBeats) { res(); return; }
      const iv = (60 / (bpmRef.current || 120)) * 1000;
      setTimeout(step, iv);
    };
    step();
  });

  // ── Playback ──
  // Bug #5b: ref-stable handle to the latest source builder so the cycle-wrap
  // closure inside startLoopCheck doesn't see a stale `tracks` snapshot.
  const buildSourcesRef = useRef(null);
  const startLoopCheck = useCallback(() => {
    // Phase F2 (Bug #3): swapped requestAnimationFrame for setInterval(50ms).
    // rAF is paused/severely throttled in background tabs while the AudioContext
    // clock keeps ticking, so the playhead drifts well past cycleEnd before the
    // wrap fires (or never fires). setInterval is also throttled in background
    // tabs (typically to ~1000ms), but it still FIRES — so the wrap engages
    // within ~1s of cycleEnd instead of when the tab regains focus. Good enough
    // for cycle correctness; precise audio-clock scheduling would need
    // setTimeout-re-armed-each-cycle and isn't needed for beta.
    if (loopCheckRef.current) clearInterval(loopCheckRef.current);
    const check = () => {
      if (!cycleEnabled || !isPlaying) {
        if (loopCheckRef.current) { clearInterval(loopCheckRef.current); loopCheckRef.current = null; }
        return;
      }
      // Bug #4b-2-extra: playOffsetRef.current is SECONDS — convert to BEATS so both terms (and cycleEnd) share units.
      const beatNow = secondsToBeat(playOffsetRef.current, bpm) + (audioCtxRef.current ? (audioCtxRef.current.currentTime - playStartRef.current) * (bpm / 60) : 0);
      if (beatNow >= cycleEnd) {
        // Bug #4b-2: cycleStart is in BEATS but playOffsetRef is used as SECONDS everywhere — convert before storing.
        const cycleStartSec = beatToSeconds(cycleStart, bpm);
        playOffsetRef.current = cycleStartSec;
        const ctx = audioCtxRef.current;
        playStartRef.current = ctx?.currentTime || 0;
        setCurrentTime(cycleStartSec);
        // Bug #5b: BufferSourceNodes don't support post-start seeking — stop them and rebuild at the loop start.
        if (ctx && buildSourcesRef.current) buildSourcesRef.current(ctx, cycleStartSec);
      }
    };
    loopCheckRef.current = setInterval(check, 50);
  }, [cycleEnabled, cycleStart, cycleEnd, bpm, isPlaying]);

  useEffect(() => {
    if (isPlaying && cycleEnabled) startLoopCheck();
    else if (loopCheckRef.current) { clearInterval(loopCheckRef.current); loopCheckRef.current = null; }
    return () => { if (loopCheckRef.current) { clearInterval(loopCheckRef.current); loopCheckRef.current = null; } };
  }, [isPlaying, cycleEnabled, startLoopCheck]);

  // Bug #5b: shared source builder so cycle wrap can rebuild buffer sources at the new offset
  // (BufferSourceNodes are one-shot — looping requires stop+recreate).
  const buildPlaybackSources = (ctx, fromOffsetSec) => {
    // Latest reference is published below for use by startLoopCheck.
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
      const fxNodes = (t.effects && Object.keys(t.effects).length) ? buildFxChain(ctx, t, "playback") : []; let last = s;
      // Part 16: chainer supports compound nodes via { inputNode, outputNode }
      // (same shape as PluginHost.addPlugin returns) so multi-node DSP fragments
      // — stereoWidener M/S split, ringMod's modulation graph, etc. — wire
      // cleanly without the loop adding spurious dry-shortcut connections.
      // F4-C-FIX: same chainer guard as ensureTrackGraph.
      fxNodes.forEach(n => {
        const ni = n.inputNode, no = n.outputNode;
        if (!ni || !no || typeof ni.connect !== "function") {
          console.error("[F4-C-FIX] buildPlaybackSources chainer skipping invalid entry:", n);
          return;
        }
        last.connect(ni); last = no;
      });
      last.connect(g); g.connect(p);
      // Part 16: insert per-track console character on playback path. Pre-Part 16
      // the per-track CONSOLE_BOARDS dropdown only colored the live-mixer graph
      // (which audio tracks never traverse), so picking SSL 4000E on a recorded
      // track did nothing audible. Now we route p → consoleOut → master so the
      // user actually hears the analog board. Sends still tap from p (pre-console)
      // which matches typical analog studio aux-send wiring.
      const consoleId = trackConsoleChar[t.id] || "none";
      let masterIn = p;
      if (consoleId && consoleId !== "none") {
        const consoleOut = ctx.createGain();
        applyConsoleCharacter(ctx, p, consoleOut, consoleId, { trackId: t.id, consoleScope: "console:playback", params: trackConsoleParams[t.id] });
        masterIn = consoleOut;
      }
      // F4-C: meter tap is post-console so the dB ladder reflects what the
      // user hears (SSL/Neve saturation + EQ included). Pre-F4-C the splitter
      // sat between pan and console, so console color never showed on the meter.
      masterIn.connect(splitter); splitter.connect(analyserL, 0); splitter.connect(analyserR, 1);
      masterIn.connect(masterGainRef.current); if (t.effects) buildSends(ctx, t, p, masterGainRef.current);
      // Clamp offset to within buffer length so we don't throw or get silence on wrap.
      const safeOffset = Math.max(0, Math.min(fromOffsetSec, Math.max(0, t.audioBuffer.duration - 0.001)));
      s.start(0, safeOffset);
      trackSourcesRef.current[i] = s; trackGainsRef.current[i] = g; trackPansRef.current[i] = p;
      trackAnalysersRef.current[i] = { left: analyserL, right: analyserR };
      if (t.audioBuffer.duration > maxDur) maxDur = t.audioBuffer.duration;
    });
    return maxDur;
  };
  // Publish latest builder so the cycle-wrap closure always sees current `tracks`.
  buildSourcesRef.current = buildPlaybackSources;

  // Bug #3 (Part 9): the playback chain is only built at startPlayback time, so
  // inserting/toggling an effect mid-playback was silently a no-op. Watch a
  // serialized signature of every track's effects (which keys are enabled) and
  // rebuild the live source chain so the user actually hears their inserts.
  // Phase 3: param-knob changes hit AudioParams directly via liveInstancesRef
  // (see SPXPluginHost onChange handler), so this signature only triggers a
  // rebuild on enable/disable — knob sweeps no longer touch this path.
  const fxSignature = useMemo(
    () => tracks.map(t => Object.entries(t.effects || {}).filter(([, v]) => v?.enabled).map(([k]) => k).sort().join(",")).join("|"),
    [tracks]
  );
  const lastFxSignatureRef = useRef("");
  useEffect(() => {
    if (!isPlaying) { lastFxSignatureRef.current = fxSignature; return; }
    if (fxSignature === lastFxSignatureRef.current) return;
    lastFxSignatureRef.current = fxSignature;
    const ctx = audioCtxRef.current; if (!ctx) return;
    // Rebuild from the current playhead so the user keeps their place.
    const elapsed = ctx.currentTime - playStartRef.current + playOffsetRef.current;
    playOffsetRef.current = elapsed;
    playStartRef.current = ctx.currentTime;
    buildPlaybackSources(ctx, elapsed);
  }, [fxSignature, isPlaying]);

  // Part 16: same rebuild trigger for console-board changes during playback. The
  // existing trackConsoleChar useEffect (RS:930-936) only rebuilt the live-mixer
  // graph; without this, picking a different console mid-playback was silent
  // until the next play.
  const consoleSignature = useMemo(
    () => tracks.map(t => `${t.id}:${trackConsoleChar[t.id] || "none"}`).join("|"),
    [tracks, trackConsoleChar]
  );
  const lastConsoleSignatureRef = useRef("");
  useEffect(() => {
    if (!isPlaying) { lastConsoleSignatureRef.current = consoleSignature; return; }
    if (consoleSignature === lastConsoleSignatureRef.current) return;
    lastConsoleSignatureRef.current = consoleSignature;
    const ctx = audioCtxRef.current; if (!ctx) return;
    const elapsed = ctx.currentTime - playStartRef.current + playOffsetRef.current;
    playOffsetRef.current = elapsed;
    playStartRef.current = ctx.currentTime;
    buildPlaybackSources(ctx, elapsed);
  }, [consoleSignature, isPlaying]);

  // Bug #2 (Part 9): mute / solo toggled from ArrangerView only set state — the
  // Console rows additionally poke trackGainsRef directly, but Arrange has no
  // ref. Sync gains from track state on every change so both surfaces affect
  // live audio identically.
  useEffect(() => {
    const anySolo = tracks.some(t => t.solo);
    tracks.forEach((t, i) => {
      const gn = trackGainsRef.current[i]; if (!gn) return;
      const audible = !t.muted && (!anySolo || t.solo);
      gn.gain.value = audible ? (t.volume ?? 1) : 0;
    });
  }, [tracks]);

  // Bug #7 (Part 9): per-track input monitor — when recording, follow the armed
  // track's `monitoring` field. Toggle takes effect immediately without
  // restarting the recorder. Global `monitoringEnabled` still wins (live mic
  // is already routed elsewhere; doubling it would cause feedback/comb filter).
  useEffect(() => {
    if (!isRecording || !recMonitorGainRef.current) return;
    const armed = tracks.find(t => t.armed);
    const target = monitoringEnabled ? 0 : (armed?.monitoring ? 0.6 : 0);
    try { recMonitorGainRef.current.gain.setTargetAtTime(target, audioCtxRef.current?.currentTime || 0, 0.02); }
    catch { recMonitorGainRef.current.gain.value = target; }
  }, [tracks, isRecording, monitoringEnabled]);

  // Bug #5d: toggling CYCLE on with no valid region defined was a silent no-op (start>=end never triggers wrap).
  // Snap to the bar at the playhead and span 4 bars by default so the user gets immediate feedback.
  const toggleCycle = useCallback(() => {
    setCycleEnabled(prev => {
      const turningOn = !prev;
      if (turningOn && cycleEnd <= cycleStart) {
        const beatsPerBar = (timeSignature && timeSignature[0]) || 4;
        const playheadBeatNow = secondsToBeat(playOffsetRef.current, bpm);
        const snappedStart = Math.max(0, Math.floor(playheadBeatNow / beatsPerBar) * beatsPerBar);
        setCycleStart(snappedStart);
        setCycleEnd(snappedStart + 4 * beatsPerBar);
        setStatus(`Cycle ON — ${snappedStart}…${snappedStart + 4 * beatsPerBar} beats`);
      } else {
        setStatus(`Cycle ${turningOn ? "ON" : "OFF"}`);
      }
      return turningOn;
    });
  }, [cycleStart, cycleEnd, bpm, timeSignature]);

  const startPlayback = (overdub = false) => {
    const ctx = getCtx();
    const maxDur = buildPlaybackSources(ctx, playOffsetRef.current);
    // Re-arm Follow Playhead: a previous manual scroll only suppresses follow
    // until the next Play press (Cubase behavior).
    userScrollOverrideRef.current = false;
    setDuration(maxDur); playStartRef.current = ctx.currentTime; setIsPlaying(true);
    if (metronomeOn) startMetronome(ctx);
    startMeterAnimation();
    timeRef.current = setInterval(() => {
      if (!audioCtxRef.current) return;
      const el = audioCtxRef.current.currentTime - playStartRef.current + playOffsetRef.current;
      setCurrentTime(el);
      // Bug #5b: when cycling, never auto-stop on maxDur — wrap takes care of bounds.
      if (el >= maxDur && maxDur > 0 && !overdub && !cycleEnabled) stopPlayback();
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

  // Transport bar-step + hold-to-scrub. Single click on Rewind/FF moves ±1 bar;
  // mousedown-hold (>250ms) scrubs continuously. During playback the seek is
  // applied by re-arming buildPlaybackSources at the new offset — same pattern
  // fxSignature uses to swap inserts mid-flight (no stop+restart click).
  const projectMaxDuration = () => Math.max(0, ...tracks.map(t => t.audioBuffer?.duration || 0));
  const seekBy = (deltaSec) => {
    const max = projectMaxDuration();
    const ctx = audioCtxRef.current;
    const cur = (isPlaying && ctx)
      ? (ctx.currentTime - playStartRef.current + playOffsetRef.current)
      : playOffsetRef.current;
    let next = cur + deltaSec;
    if (next < 0) next = 0;
    if (max > 0 && next > max) next = max;
    if (next === cur) return;
    if (isPlaying && ctx) {
      playOffsetRef.current = next;
      playStartRef.current = ctx.currentTime;
      buildPlaybackSources(ctx, next);
    } else {
      playOffsetRef.current = next;
    }
    setCurrentTime(next);
  };
  const scrubHoldTimeoutRef = useRef(null);
  const scrubIntervalRef = useRef(null);
  const startScrub = (direction) => {
    // Immediate ±1 bar so a quick click is exactly one bar.
    const beats = (timeSignatureRef.current && timeSignatureRef.current[0]) || 4;
    const barSec = (60 / Math.max(1, bpm)) * beats;
    seekBy(direction * barSec);
    if (scrubHoldTimeoutRef.current) clearTimeout(scrubHoldTimeoutRef.current);
    if (scrubIntervalRef.current) clearInterval(scrubIntervalRef.current);
    // After 250ms hold, scrub at one beat per 50ms tick (~10× realtime at 4/4).
    scrubHoldTimeoutRef.current = setTimeout(() => {
      scrubIntervalRef.current = setInterval(() => seekBy(direction * (barSec / 4)), 50);
    }, 250);
  };
  const stopScrub = () => {
    if (scrubHoldTimeoutRef.current) { clearTimeout(scrubHoldTimeoutRef.current); scrubHoldTimeoutRef.current = null; }
    if (scrubIntervalRef.current) { clearInterval(scrubIntervalRef.current); scrubIntervalRef.current = null; }
  };
  useEffect(() => () => stopScrub(), []);

  const fmt = (s) => { const m = Math.floor(s / 60), sec = Math.floor(s % 60), ms = Math.floor((s % 1) * 100); return `${m}:${String(sec).padStart(2, "0")}.${String(ms).padStart(2, "0")}`; };

  // ── Region helpers ──
  const createRegionFromRecording = (trackIndex, audioBuffer, audioUrl) => {
    const regionId = `rgn_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const startBeat = secondsToBeat(playOffsetRef.current, bpm);
    const durationBeat = secondsToBeat(audioBuffer.duration, bpm);
    // Bug #9 (Part 9): include audioBuffer on the region so WaveformMini's
    // decoded-buffer fast path renders real peaks even before the blob fetch
    // resolves (which can fail in Codespaces if the URL is recycled).
    setTracks(prev => prev.map((t, i) => i === trackIndex ? { ...t, regions: [...(t.regions || []), { id: regionId, name: tracks[trackIndex]?.name || `Track ${trackIndex + 1}`, startBeat, duration: durationBeat, audioUrl, audioBuffer, color: tracks[trackIndex]?.color || TRACK_COLORS[trackIndex % TRACK_COLORS.length], loopEnabled: false, loopCount: 1 }] } : t));
  };

  const createRegionFromImport = (trackIndex, audioBuffer, name, audioUrl) => {
    const regionId = `rgn_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const durationBeat = secondsToBeat(audioBuffer.duration, bpm);
    // Bug #9 (Part 9): same as above — pass the decoded buffer so the waveform
    // renders peaks immediately for imports too.
    setTracks(prev => prev.map((t, i) => i === trackIndex ? { ...t, regions: [...(t.regions || []), { id: regionId, name: name || `Import ${trackIndex + 1}`, startBeat: 0, duration: durationBeat, audioUrl, audioBuffer, color: t.color || TRACK_COLORS[trackIndex % TRACK_COLORS.length], loopEnabled: false, loopCount: 1 }] } : t));
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
      const baseAudio = { echoCancellation: false, noiseSuppression: false, autoGainControl: false, sampleRate: 44100 };
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: selectedDevice !== "default" ? { ...baseAudio, deviceId: { exact: selectedDevice } } : baseAudio });
      } catch (err) {
        // Bug #11-2: stale/anonymized deviceId from pre-permission enumerate can throw NotFound/Overconstrained — fall back to default mic.
        if (selectedDevice !== "default" && (err?.name === "NotFoundError" || err?.name === "OverconstrainedError")) {
          setStatus("⚠ Selected input unavailable, using default mic");
          stream = await navigator.mediaDevices.getUserMedia({ audio: baseAudio });
        } else { throw err; }
      }
      // Re-enumerate now that permission is granted so labels/IDs are real (Bug #11-2).
      navigator.mediaDevices.enumerateDevices().then(d => setInputDevices(d.filter(x => x.kind === "audioinput"))).catch(() => {});
      mediaStreamRef.current = stream; setMicSimStream(stream);
      // Bug #6 (Part 9) diagnostics: log the actual input track so we can see
      // when the browser hands us a virtual/silent driver (e.g. Waves SoundGrid)
      // even though the dropdown said MOTU.
      const audioTracks = stream.getAudioTracks();
      const inputLabel = audioTracks[0]?.label || "(unknown)";
      const inputSettings = audioTracks[0]?.getSettings?.() || {};
      console.log("[SPX rec] stream input:", inputLabel, "settings:", inputSettings);
      if (audioTracks.length === 0 || !audioTracks[0].enabled) {
        setStatus("✗ No active audio track on input stream");
        return;
      }
      const src = ctx.createMediaStreamSource(stream); recInputSrcRef.current = src;
      // Phase F1.4 (Bug #7): force mono→stereo upmix at the input boundary.
      // USB/aggregate interfaces commonly hand back a 2-channel MediaStream with
      // mic on ch.0 and silence on ch.1. GainNode's "speakers" interpretation
      // doesn't kick in (input already has 2 channels), so the bare wiring
      // src→recMon→destination played mic in left ear only. Splitter takes ch.0
      // and Merger writes it to BOTH outputs — handles 1-channel and
      // 2-channel-with-silent-R sources alike.
      const monoSplitter = ctx.createChannelSplitter(2);
      const stereoMerger = ctx.createChannelMerger(2);
      src.connect(monoSplitter);
      monoSplitter.connect(stereoMerger, 0, 0);
      monoSplitter.connect(stereoMerger, 0, 1);
      micSplitterRef.current = monoSplitter; micMergerRef.current = stereoMerger;
      // Analyser reads the upmixed signal so the meter matches what the user
      // hears (and so a stereo-rendered VU shows centered, not L-only).
      inputAnalyserRef.current = ctx.createAnalyser(); inputAnalyserRef.current.fftSize = 256; stereoMerger.connect(inputAnalyserRef.current);
      // Bug #11-3: route mic to destination so user hears themselves while recording. Held at 0 if direct-monitor is already on, to avoid double-routing/feedback.
      // Bug #7 (Part 9): if the armed track has its own per-track monitor enabled,
      // start at 0.6; otherwise default to 0 (silent unless user explicitly opts in).
      // Global monitoringEnabled still wins (held at 0 to avoid double-routing/feedback).
      const armedTrack = tracks[ai];
      const initialMon = monitoringEnabled ? 0 : (armedTrack?.monitoring ? 0.6 : 0);
      const recMon = ctx.createGain(); recMon.gain.value = initialMon; stereoMerger.connect(recMon); recMon.connect(ctx.destination); recMonitorGainRef.current = recMon;
      const mon = () => { if (!inputAnalyserRef.current) return; const d = new Uint8Array(inputAnalyserRef.current.frequencyBinCount); inputAnalyserRef.current.getByteFrequencyData(d); setInputLevel(d.reduce((a, b) => a + b, 0) / d.length / 255); inputAnimRef.current = requestAnimationFrame(mon); }; mon();
      if (countIn && countInBars > 0) { setStatus(`Count in (${countInBars} bar${countInBars > 1 ? "s" : ""})...`); await playCountIn(ctx); }
      // supportedMime guard: Safari rejects webm; let the browser pick its default when none of our preferred mimes are available.
      const supportedMime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm"
        : MediaRecorder.isTypeSupported("audio/mp4") ? "audio/mp4" : "";
      // Bug #6 (Part 9): pass the SAME `stream` we attached the analyser to. If
      // we ever wrap this in cloneStream() for parallel taps, both consumers
      // must keep referencing the original or one will end up silent.
      const rec = new MediaRecorder(stream, supportedMime ? { mimeType: supportedMime } : undefined);
      console.log("[SPX rec] MediaRecorder mime:", rec.mimeType, "state:", rec.state);
      chunksRef.current = [];
      let totalChunkBytes = 0;
      rec.ondataavailable = (e) => {
        // Bug #6 (Part 9): track chunk sizes so a silent file is distinguishable
        // from "MediaRecorder never emitted data" (which usually means the
        // stream is paused/disabled).
        if (e.data && e.data.size > 0) {
          totalChunkBytes += e.data.size;
          chunksRef.current.push(e.data);
        }
      };
      rec.onerror = (e) => { console.error("[SPX rec] MediaRecorder error:", e?.error || e); setStatus(`✗ Recorder error: ${e?.error?.message || "unknown"}`); };
      rec.onstop = async () => {
        console.log("[SPX rec] stopped. chunks:", chunksRef.current.length, "bytes:", totalChunkBytes);
        const blob = new Blob(chunksRef.current, supportedMime ? { type: supportedMime } : undefined);
        if (!blob.size) { setStatus("✗ Recording produced no audio (0 bytes captured)"); return; }
        const audioUrl = URL.createObjectURL(blob);
        let buf;
        try {
          const ab = await blob.arrayBuffer();
          buf = await ctx.decodeAudioData(ab);
        } catch (err) {
          // Bug #11-1: surface decode failures (Safari/codec mismatch) instead of silently dropping the post-record callback chain.
          URL.revokeObjectURL(audioUrl);
          console.error("[SPX] decodeAudioData failed:", err);
          setStatus(`✗ Recording decode failed: ${err?.message || err}`);
          return;
        }
        // Recorded buffer: post-decode mono→stereo for the 1-channel case ONLY.
        // Does NOT detect "2-channel buffer with silent R" — common for USB
        // interfaces that hand back a 2-ch stream with mic on ch.0 only. In
        // that case decodeAudioData yields numberOfChannels === 2 and this
        // branch is skipped, leaving the recorded buffer L=mic / R=silent.
        // Live monitoring is already corrected upstream by the splitter+merger
        // upmix at startRecording (Phase F1.4). The matching capture-side fix
        // (route MediaRecorder through a MediaStreamDestination fed from the
        // upmixed graph, OR detect near-silent R post-decode and copy L→R) is
        // tracked as Phase E post-beta cleanup.
        if (buf.numberOfChannels === 1) {
          const mono = buf.getChannelData(0);
          const stereo = ctx.createBuffer(2, buf.length, buf.sampleRate);
          stereo.copyToChannel(mono, 0);
          stereo.copyToChannel(mono, 1);
          buf = stereo;
        }
        // Bug #6 (Part 9): sanity-check the decoded buffer — if MediaRecorder
        // captured a virtual/silent stream we get bytes but zero amplitude.
        let peak = 0;
        try {
          for (let ch = 0; ch < buf.numberOfChannels; ch++) {
            const d = buf.getChannelData(ch);
            for (let i = 0; i < d.length; i += 256) { const v = Math.abs(d[i]); if (v > peak) peak = v; }
          }
        } catch (_) {}
        console.log("[SPX rec] decoded buffer:", buf.duration.toFixed(2) + "s", "peak amplitude:", peak.toFixed(4));
        updateTrack(ai, { audioBuffer: buf, audio_url: audioUrl }); createRegionFromRecording(ai, buf, audioUrl);
        if (peak < 0.001) {
          setStatus(`⚠ Recorded but signal is silent (peak ${peak.toFixed(4)}) — check input "${inputLabel}"`);
        } else {
          setStatus(`✓ Recorded (peak ${peak.toFixed(2)})`);
        }
        try { await uploadTrack(blob, ai); } catch (err) { console.error("[SPX] uploadTrack failed:", err); return; }
      };
      mediaRecorderRef.current = rec; rec.start(100); startPlayback(true); setIsRecording(true); setStatus(`● REC Track ${ai + 1} — ${inputLabel}`);
      // startPlayback→buildPlaybackSources nulls the armed track's analyser slot
      // (no audioBuffer yet on a fresh take). Wire the live mic analyser into
      // the slot so the meter loop reads input level during the take. Mic is
      // mono — left and right point to the same analyser. stopPlayback (called
      // by stopRecording) clears trackAnalysersRef wholesale so no manual cleanup.
      if (inputAnalyserRef.current && trackAnalysersRef.current) {
        trackAnalysersRef.current[ai] = { left: inputAnalyserRef.current, right: inputAnalyserRef.current };
      }
    } catch (e) { setStatus(`✗ Mic: ${e.message}`); }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") mediaRecorderRef.current.stop();
    if (mediaStreamRef.current) { mediaStreamRef.current.getTracks().forEach(t => t.stop()); mediaStreamRef.current = null; }
    if (inputAnimRef.current) cancelAnimationFrame(inputAnimRef.current);
    // Bug #11-3 cleanup.
    try { recMonitorGainRef.current?.disconnect(); } catch (_) {}
    try { recInputSrcRef.current?.disconnect(); } catch (_) {}
    try { micSplitterRef.current?.disconnect(); } catch (_) {}
    try { micMergerRef.current?.disconnect(); } catch (_) {}
    recMonitorGainRef.current = null; recInputSrcRef.current = null;
    micSplitterRef.current = null; micMergerRef.current = null;
    setMicSimStream(null); setInputLevel(0); setIsRecording(false); stopPlayback();
  };

  const stopEverything = () => {
    stopRecording(); stopPlayback(); stopMetronome(); setMetronomeOn(false);
    playOffsetRef.current = 0; setCurrentTime(0);
  };

  // ── Track CRUD ──
  const updateTrack = useCallback((i, u) => setTracks(p => p.map((t, idx) => idx === i ? { ...t, ...u } : t)), []);
  // Defensive against tracks that pre-date the shared trackFactory and may
  // be missing the `effects` field (legacy projects, externally-created
  // tracks). Without these guards, adding any insert would throw
  // "Cannot read properties of undefined (reading '<plugin-key>')".
  const updateEffect = (ti, fx, param, val) => {
    const trackId = tracks[ti]?.id;
    // Fan out across every registered scope (monitor/bus/playback) so the
    // audible graph receives the tweak regardless of which built last.
    if (param !== "enabled") setEffectParamForTrack(trackId, fx, param, val);
    setTracks(p => p.map((t, i) => i !== ti ? t : { ...t, effects: { ...(t.effects || DEFAULT_EFFECTS()), [fx]: { ...((t.effects || {})[fx] || {}), [param]: val } } }));

    // F4-C-FIX Task 4: enable toggles MUST bust the ensureTrackGraph cache and
    // rewire the live-mixer chain — otherwise per-track FX panel toggles
    // (Analog Rack tape-sat, exciter, compressor, etc.) flip UI state but the
    // audio graph stays frozen with the previous plugin set, so subsequent
    // slider moves dispatch into nothing. We compute the updated track object
    // locally (don't wait on setTracks to resolve) so the rebuild reads the
    // just-toggled effects map.
    if (param === "enabled" && audioCtxRef.current && trackId) {
      // Dispose the prior live instance for this fx key. ensureTrackGraph
      // re-registers when the plugin is enabled; for val=false the registry
      // entry would otherwise linger.
      if (!val) disposeInstance(trackId, fx);
      if (trackNodesRef.current.has(trackId)) {
        const oldTrack = tracks[ti];
        if (oldTrack) {
          const updatedTrack = { ...oldTrack, effects: { ...(oldTrack.effects || DEFAULT_EFFECTS()), [fx]: { ...((oldTrack.effects || {})[fx] || {}), [param]: val } } };
          const oldNodes = trackNodesRef.current.get(trackId);
          if (oldNodes) {
            ["input", "preGain", "panNode", "fader", "meter", "consoleOut"].forEach(k => { try { oldNodes[k]?.disconnect(); } catch (_) {} });
            (oldNodes.fxNodes || []).forEach(n => {
              const ni = n.inputNode || n, no = n.outputNode || n;
              try { if (typeof n.stop === "function") n.stop(); } catch (_) {}
              try { ni.disconnect(); } catch (_) {}
              if (no !== ni) { try { no.disconnect(); } catch (_) {} }
            });
            (oldNodes.consoleNodes || []).forEach(n => { try { n.disconnect(); } catch (_) {} });
            (oldNodes.sendNodes || []).forEach(n => { try { n.disconnect(); } catch (_) {} });
          }
          trackNodesRef.current.delete(trackId);
          ensureTrackGraph(updatedTrack);
        }
      }
    }
  };
  // Seed an effect's full defaults + enabled:true atomically. Used by the
  // inserts picker so buildFxChain sees populated params on the first build.
  // Merges defaults UNDER any pre-existing values so DEFAULT_EFFECTS()'s native
  // plugin params (deesser.frequency, exciter.amount, etc.) survive — wiping
  // them caused non-finite AudioParam errors when the audio handler read
  // undefined keys.
  const seedEffect = (ti, fx, defaults) => setTracks(p => p.map((t, i) => i !== ti ? t : { ...t, effects: { ...(t.effects || DEFAULT_EFFECTS()), [fx]: { ...defaults, ...((t.effects || {})[fx] || {}), enabled: true } } }));
  // Phase 3 / Fix 1: full removal of an insert. Disposes the live PluginInstance
  // (stops LFO oscillators, disconnects nodes) BEFORE setTracks so the chain
  // rebuild on fxSignature change starts from a clean registry. Difference vs
  // updateEffect(.., "enabled", false): this drops the key entirely from
  // track.effects so saved sessions don't accumulate stale params.
  const removeInsert = (ti, fxKey) => {
    const t = tracks[ti]; if (!t) return;
    disposeInstance(t.id, fxKey);
    setTracks(prev => prev.map((tr, i) => i !== ti ? tr : ({
      ...tr,
      effects: Object.fromEntries(
        Object.entries(tr.effects || {}).filter(([k]) => k !== fxKey)
      ),
    })));
  };

  const addTrack = () => {
    if (tracks.length >= maxTracks) { setStatus(`⚠ ${userTier} tier limit: ${maxTracks} tracks.`); return; }
    setShowTrackTypeModal(true);
  };

  const addTrackWithType = (trackType) => {
    if (tracks.length >= maxTracks) { setStatus(`⚠ ${userTier} tier limit: ${maxTracks} tracks.`); return; }
    const i = tracks.length;
    setTracks(prev => [...prev, DEFAULT_TRACK(i, trackType)]);
    setSelectedTrackIndex(i);
    setStatus(`${trackType.charAt(0).toUpperCase() + trackType.slice(1)} Track ${i + 1} added`);
    setShowTrackTypeModal(false);
  };

  const removeTrack = (idx) => {
    if (tracks.length <= 1) { setStatus("⚠ Must have at least 1 track"); return; }
    // Part 13b bug 2: stop and tear down the audio graph BEFORE dropping the
    // track from React state — otherwise the BufferSourceNode keeps emitting
    // through master and the user hears phantom audio for a deleted track.
    const removed = tracks[idx];
    try { trackSourcesRef.current[idx]?.stop(); } catch (_) {}
    try { trackSourcesRef.current[idx]?.disconnect(); } catch (_) {}
    try { trackGainsRef.current[idx]?.disconnect(); } catch (_) {}
    try { trackPansRef.current[idx]?.disconnect(); } catch (_) {}
    const an = trackAnalysersRef.current[idx];
    try { an?.left?.disconnect(); } catch (_) {}
    try { an?.right?.disconnect(); } catch (_) {}
    trackSourcesRef.current.splice(idx, 1);
    trackGainsRef.current.splice(idx, 1);
    trackPansRef.current.splice(idx, 1);
    trackAnalysersRef.current.splice(idx, 1);
    if (removed?.id) {
      const old = trackNodesRef.current.get(removed.id);
      if (old) {
        ["input","preGain","panNode","fader","meter","consoleOut"].forEach(k => { try { old[k]?.disconnect(); } catch (_) {} });
        (old.fxNodes || []).forEach(n => { try { n.disconnect(); } catch (_) {} });
        (old.consoleNodes || []).forEach(n => { try { n.disconnect(); } catch (_) {} });
        (old.sendNodes || []).forEach(n => { try { n.disconnect(); } catch (_) {} });
      }
      trackNodesRef.current.delete(removed.id);
      // Phase 3: dispose every PluginInstance keyed under this trackId so
      // setParam refs / running LFO oscillators don't leak after removal.
      disposeAllForTrack(removed.id);
    }
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
    if (monitoringEnabled) {
      // Clean up the entire monitoring chain
      try { monitorGainRef.current?.disconnect(); } catch (_) {}
      try { monitorSrcRef.current?.disconnect(); } catch (_) {}
      try { monitorDelayRef.current?.disconnect(); } catch (_) {}
      try { monitorStreamRef.current?.getTracks().forEach(t => t.stop()); } catch (_) {}
      monitorGainRef.current = null;
      monitorSrcRef.current = null;
      monitorDelayRef.current = null;
      monitorStreamRef.current = null;
      setMonitoringEnabled(false); setStatus("Direct monitoring OFF"); return;
    }
    navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false, latency: 0 } }).then(stream => {
      const src = ctx.createMediaStreamSource(stream); const gain = ctx.createGain(); gain.gain.value = 0.8;
      const delay = ctx.createDelay(0.5); delay.delayTime.value = Math.max(0, latencyCompMs / 1000);
      src.connect(delay); delay.connect(gain); gain.connect(ctx.destination);
      monitorGainRef.current = gain;
      monitorSrcRef.current = src;
      monitorDelayRef.current = delay;
      monitorStreamRef.current = stream;
      setMonitoringEnabled(true);
      const ms = Math.round(((ctx.baseLatency || 0) + (ctx.outputLatency || 0)) * 1000); setLatencyMs(ms); setStatus(`Direct monitoring ON — ${ms}ms`);
    }).catch(e => setStatus("Monitoring error: " + e.message));
  }, [monitoringEnabled, latencyCompMs]);


// ═══ RS_part3.js ═══
// =============================================================================
// RecordingStudio.js — Part 3/4
// Save/Load · Mixdown · Freeze · Piano roll · AI handlers · Menu actions
// =============================================================================

  // ── Autosave ──
  const saveProjectRef = useRef(null);
  useEffect(() => { saveProjectRef.current = saveProject; });
  useEffect(() => {
    if (!projectId) return;
    const interval = setInterval(() => { if (!saving && saveProjectRef.current) { saveProjectRef.current(); setStatus("✓ Auto-saved"); } }, 60000);
    return () => clearInterval(interval);
  }, [projectId, saving]);

  // ── Save ──
  const saveProject = async () => {
    setSaving(true); setStatus("Saving...");
    try {
      const tok = localStorage.getItem("token") || sessionStorage.getItem("token");
      const bu = process.env.REACT_APP_BACKEND_URL || "";
      const td = tracks.map(t => ({
        id: t.id,
        name: t.name, volume: t.volume, pan: t.pan, muted: t.muted, solo: t.solo,
        effects: t.effects, color: t.color, trackType: t.trackType, instrument: t.instrument,
        regions: (t.regions || []).map(r => ({ ...r, audioUrl: null })),
        audio_url: typeof t.audio_url === "string" && !t.audio_url.startsWith("blob:") ? t.audio_url : null,
        sends: t.sends || [],
        busTarget: t.busTarget || null,
        vcaMembers: t.vcaMembers || null,
        groupMembers: t.groupMembers || null,
        vcaController: t.vcaController || null,
        groupController: t.groupController || null,
        linkedGroup: t.linkedGroup || null,
        readAutomation: !!t.readAutomation,
        writeAutomation: !!t.writeAutomation,
      }));
      const method = projectId ? "PUT" : "POST";
      const url = projectId ? `${bu}/api/studio/projects/${projectId}` : `${bu}/api/studio/projects`;
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json", Authorization: `Bearer ${tok}` }, body: JSON.stringify({
        name: projectName, bpm, time_signature: `${timeSignature[0]}/${timeSignature[1]}`,
        tracks: td, master_volume: masterVolume, master_pan: masterPan,
        piano_roll_notes: pianoRollNotes, piano_roll_key: pianoRollKey, piano_roll_scale: pianoRollScale,
        automation, cycle_start: cycleStart, cycle_end: cycleEnd, cycle_enabled: cycleEnabled,
        track_console_char: trackConsoleChar,
        master_console_char: masterConsoleChar,
        track_console_params: trackConsoleParams,
        master_console_params: masterConsoleParams,
        monitor_speaker: monitorSpeaker,
        room_sim: roomSim,
        binaural_on: binauralOn,
        mono_check: monoCheck,
      }) });
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
        setProjectId(p.id); setProjectName(p.name); setBpm(p.bpm); setMasterVolume(p.master_volume || 1.0); setMasterPan(p.master_pan || 0);
        if (p.time_signature) { const ts = p.time_signature.split("/").map(Number); if (ts.length === 2) setTimeSignature(ts); }
        if (p.piano_roll_notes) setPianoRollNotes(p.piano_roll_notes);
        if (p.piano_roll_key) setPianoRollKey(p.piano_roll_key);
        if (p.piano_roll_scale) setPianoRollScale(p.piano_roll_scale);
        if (p.automation) setAutomation(p.automation);
        if (p.cycle_start != null) setCycleStart(p.cycle_start);
        if (p.cycle_end != null) setCycleEnd(p.cycle_end);
        if (p.cycle_enabled != null) setCycleEnabled(p.cycle_enabled);
        if (p.track_console_char) setTrackConsoleChar(p.track_console_char);
        if (p.master_console_char) setMasterConsoleChar(p.master_console_char);
        if (p.track_console_params) setTrackConsoleParams(p.track_console_params);
        if (p.master_console_params != null) setMasterConsoleParams(p.master_console_params);
        if (p.monitor_speaker) setMonitorSpeaker(p.monitor_speaker);
        if (p.room_sim) setRoomSim(p.room_sim);
        if (p.binaural_on != null) setBinauralOn(p.binaural_on);
        if (p.mono_check != null) setMonoCheck(p.mono_check);
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
    stopEverything(); setProjectId(null); setProjectName("Untitled Project"); setBpm(120); setMasterVolume(1.0); setMasterPan(0);
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
        const g = offCtx.createGain(); g.gain.value = t.volume ?? 1.0;
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
      const g = offCtx.createGain(); g.gain.value = t.volume ?? 1.0;
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
    const startY = e.clientY;
    const startH = mixerHeightPx;
    const onMove = (me) => {
      if (!splitDragRef.current) return;
      const delta = startY - me.clientY;
      const containerH = container.getBoundingClientRect().height;
      const newH = Math.max(250, Math.min(700, startH + delta));
      setMixerHeightPx(newH);
    };
    const onUp = () => { splitDragRef.current = false; window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
    window.addEventListener("mousemove", onMove); window.addEventListener("mouseup", onUp);
  }, [mixerHeightPx]);


  const addVCATrack = useCallback(() => {
    const vcaId = `vca_${Date.now()}`;
    const vcaTrack = { ...DEFAULT_TRACK(tracks.length, "vca"), id: vcaId, name: "VCA " + (tracks.filter(t=>t.trackType==="vca").length+1), color: "#ff6600", vcaMembers: [...selectedChannels] };
    setTracks(prev => [...prev, vcaTrack].map(t => selectedChannels.has(t.id) ? {...t, vcaController: vcaId} : t));
    setSelectedChannels(new Set());
    setStatus("VCA track created");
  }, [tracks, selectedChannels]);

  const addEffectTrack = useCallback(() => {
    const fxId = `fx_${Date.now()}`;
    const fxTrack = { ...DEFAULT_TRACK(tracks.length, "fx"), id: fxId, name: "FX " + (tracks.filter(t=>t.trackType==="fx").length+1), color: "#a855f7" };
    setTracks(prev => [...prev, fxTrack]);
    setStatus("Effect track created");
  }, [tracks]);

  const addCubaseGroupTrack = useCallback(() => {
    const groupId = `group_${Date.now()}`;
    const groupTrack = { ...DEFAULT_TRACK(tracks.length, "group"), id: groupId, name: "Group " + (tracks.filter(t=>t.trackType==="group").length+1), color: "#00ffc8", groupMembers: [...selectedChannels] };
    setTracks(prev => [...prev, groupTrack].map(t => selectedChannels.has(t.id) ? {...t, groupController: groupId} : t));
    setSelectedChannels(new Set());
    setStatus("Group master created");
  }, [tracks, selectedChannels]);

  const copyTrackSettings = useCallback(() => {
    if (channelCtxMenu?.trackIndex == null) return;
    const sourceTrack = tracks[channelCtxMenu.trackIndex];
    const settings = { effects: sourceTrack.effects, color: sourceTrack.color, input: sourceTrack.input };
    setClipboardTrackSettings(settings);
    setStatus("Track settings copied");
  }, [tracks, channelCtxMenu]);

  const pasteTrackSettings = useCallback(() => {
    if (!clipboardTrackSettings || selectedChannels.size === 0) return;
    setTracks(prev => prev.map(t => selectedChannels.has(t.id) ? {...t, ...clipboardTrackSettings} : t));
    setStatus(`Settings pasted to ${selectedChannels.size} tracks`);
  }, [clipboardTrackSettings, selectedChannels]);

  const moveSelectedChannels = useCallback((direction) => {
    if (selectedChannels.size === 0) return;
    setTracks(prev => {
      const newTracks = [...prev];
      const selectedIndices = newTracks.map((t, i) => selectedChannels.has(t.id) ? i : -1).filter(i => i >= 0);
      if (direction === "up" && selectedIndices[0] > 0) {
        selectedIndices.forEach(idx => {
          [newTracks[idx-1], newTracks[idx]] = [newTracks[idx], newTracks[idx-1]];
        });
      } else if (direction === "down" && selectedIndices[selectedIndices.length-1] < newTracks.length-1) {
        selectedIndices.reverse().forEach(idx => {
          [newTracks[idx], newTracks[idx+1]] = [newTracks[idx+1], newTracks[idx]];
        });
      }
      return newTracks;
    });
    setStatus("Channels moved " + direction);
  }, [selectedChannels]);

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
  // Bug #10c: keep the keydown effect's ref pointed at the freshest closure.
  handleCutRegionRef.current = handleCutRegion;

  // ── Bug #8b: project file save/load helpers (zip-based .spxsonic) ──
  // Build the JSON-safe project metadata. Audio buffers are NOT inlined here —
  // they're stored separately in the zip and pointed to by audio_id keys.
  const buildProjectMetadata = useCallback(() => ({
    name: projectName, bpm, time_signature: `${timeSignature[0]}/${timeSignature[1]}`,
    master_volume: masterVolume, master_pan: masterPan,
    tracks: tracks.map(t => ({
      id: t.id, name: t.name, volume: t.volume, pan: t.pan, muted: t.muted, solo: t.solo,
      effects: t.effects, color: t.color, trackType: t.trackType, instrument: t.instrument,
      // Strip blob: URLs (session-scoped). Persistent http(s) URLs survive.
      audio_url: typeof t.audio_url === "string" && !t.audio_url.startsWith("blob:") ? t.audio_url : null,
      // Bug #8b-3: tag track with a stable key into the audio map if it has a buffer.
      audio_id: t.audioBuffer ? `track_${t.id}` : null,
      regions: (t.regions || []).map(r => ({
        ...r, audioUrl: null,
        // Per-region buffer (set after AudioClipEditor save) gets its own audio_id.
        audio_id: r.audioBuffer ? `region_${t.id}_${r.id}` : null,
        edits: r.edits || null,
        // Don't serialise the AudioBuffer object itself.
        audioBuffer: undefined,
      })),
      sends: t.sends || [], busTarget: t.busTarget || null,
      vcaMembers: t.vcaMembers || null, groupMembers: t.groupMembers || null,
      vcaController: t.vcaController || null, groupController: t.groupController || null,
      linkedGroup: t.linkedGroup || null,
    })),
    piano_roll_notes: pianoRollNotes,
    track_console_char: trackConsoleChar, master_console_char: masterConsoleChar,
    monitor_speaker: monitorSpeaker, room_sim: roomSim,
    binaural_on: binauralOn, mono_check: monoCheck,
    automation, cycle_start: cycleStart, cycle_end: cycleEnd, cycle_enabled: cycleEnabled,
    created_at: new Date().toISOString(), format: "streampirex-daw", version: "2.0",
  }), [projectName, bpm, timeSignature, masterVolume, masterPan, tracks, pianoRollNotes, trackConsoleChar, masterConsoleChar, monitorSpeaker, roomSim, binauralOn, monoCheck, automation, cycleStart, cycleEnd, cycleEnabled]);

  // Bug #8b-1/3: collect every AudioBuffer (track-level + per-region edited) into one Map.
  const collectProjectAudioBuffers = useCallback(() => {
    const map = new Map();
    tracks.forEach(t => {
      if (t.audioBuffer) map.set(`track_${t.id}`, t.audioBuffer);
      (t.regions || []).forEach(r => {
        if (r.audioBuffer) map.set(`region_${t.id}_${r.id}`, r.audioBuffer);
      });
    });
    return map;
  }, [tracks]);

  // Returns total bytes generated, for status display.
  const downloadProjectAsSpxsonic = useCallback(async (filename) => {
    const project = buildProjectMetadata();
    const audioBuffers = collectProjectAudioBuffers();
    const blob = await saveProjectFile(project, audioBuffers);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return blob.size;
  }, [buildProjectMetadata, collectProjectAudioBuffers]);

  // Bug #8b-2: rehydrate audioBuffer onto tracks AND regions; reconstruct blob URLs from buffers.
  const applyLoadedProject = useCallback((project, audioBuffers, opts = {}) => {
    if (project.format && project.format !== "streampirex-daw") {
      setStatus("Not a valid StreamPireX project"); return;
    }
    stopEverything();
    setProjectId(null);
    setProjectName(project.name || "Imported Project");
    setBpm(project.bpm || 120);
    setMasterVolume(project.master_volume || 1.0);
    if (project.time_signature) {
      const ts = String(project.time_signature).split("/").map(Number);
      if (ts.length === 2 && !ts.some(isNaN)) setTimeSignature(ts);
    }
    if (project.piano_roll_notes) setPianoRollNotes(project.piano_roll_notes);
    if (project.master_pan != null) setMasterPan(project.master_pan);
    if (project.track_console_char) setTrackConsoleChar(project.track_console_char);
    if (project.master_console_char) setMasterConsoleChar(project.master_console_char);
    if (project.track_console_params) setTrackConsoleParams(project.track_console_params);
    if (project.master_console_params != null) setMasterConsoleParams(project.master_console_params);
    if (project.monitor_speaker) setMonitorSpeaker(project.monitor_speaker);
    if (project.room_sim) setRoomSim(project.room_sim);
    if (project.binaural_on != null) setBinauralOn(project.binaural_on);
    if (project.mono_check != null) setMonoCheck(project.mono_check);
    if (project.automation) setAutomation(project.automation);
    if (project.cycle_start != null) setCycleStart(project.cycle_start);
    if (project.cycle_end != null) setCycleEnd(project.cycle_end);
    if (project.cycle_enabled != null) setCycleEnabled(project.cycle_enabled);
    const trackCount = Math.min(Math.max(project.tracks?.length || 1, 1), maxTracks);
    const loaded = Array.from({ length: trackCount }, (_, i) => {
      const src = project.tracks?.[i] || {};
      const trackBuffer = audioBuffers.get(src.audio_id || `track_${src.id}`) || null;
      const trackUrl = trackBuffer ? URL.createObjectURL(audioBufferToWav(trackBuffer)) : (src.audio_url || null);
      const regions = (src.regions || []).map(r => {
        const regionBuffer = audioBuffers.get(r.audio_id || "") || null;
        return {
          ...r,
          audioBuffer: regionBuffer,
          audioUrl: regionBuffer ? URL.createObjectURL(audioBufferToWav(regionBuffer)) : (trackUrl || null),
        };
      });
      return {
        ...DEFAULT_TRACK(i),
        ...src,
        audioBuffer: trackBuffer,
        audio_url: trackUrl,
        effects: src.effects || DEFAULT_EFFECTS(),
        regions,
      };
    });
    setTracks(loaded);
    setSelectedTrackIndex(0);
    setStatus(`Opened: ${project.name || "project"}${opts.legacy ? " (legacy format — audio missing)" : ""}`);
  }, [maxTracks]);

  // ── Architectural #4: localStorage autosave (metadata only — no audio) ──
  // Debounced 2s. Audio buffers are too big for localStorage (5MB cap), so they
  // stay in-memory only; reload restores everything except actual sound. Refresh
  // prompts the user to restore via the offer-state below.
  const AUTOSAVE_KEY = "spx-sonic-autosave";
  const AUTOSAVE_MAX_AGE_MS = 24 * 3600 * 1000;
  const AUTOSAVE_MAX_BYTES = 4 * 1024 * 1024; // stay well under 5MB browser cap
  const [restoreOffer, setRestoreOffer] = useState(null); // { savedAt, project } or null
  const autosaveTimerRef = useRef(null);

  useEffect(() => {
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(() => {
      try {
        const project = buildProjectMetadata();
        const payload = JSON.stringify({ savedAt: new Date().toISOString(), project });
        if (payload.length > AUTOSAVE_MAX_BYTES) return; // too large — skip silently
        localStorage.setItem(AUTOSAVE_KEY, payload);
      } catch (_) { /* QuotaExceededError or private mode — non-fatal */ }
    }, 2000);
    return () => { if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current); };
  }, [buildProjectMetadata]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(AUTOSAVE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!parsed?.savedAt || !parsed?.project) return;
      const ageMs = Date.now() - new Date(parsed.savedAt).getTime();
      if (!isFinite(ageMs) || ageMs > AUTOSAVE_MAX_AGE_MS) {
        localStorage.removeItem(AUTOSAVE_KEY);
        return;
      }
      setRestoreOffer(parsed);
    } catch (_) {
      try { localStorage.removeItem(AUTOSAVE_KEY); } catch (_) {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const acceptRestore = useCallback(() => {
    if (!restoreOffer) return;
    applyLoadedProject(restoreOffer.project, new Map(), { legacy: false });
    setRestoreOffer(null);
    setStatus("Restored unsaved work (audio not embedded — open the .spxsonic file to recover)");
  }, [restoreOffer, applyLoadedProject]);

  const dismissRestore = useCallback(() => {
    setRestoreOffer(null);
    try { localStorage.removeItem(AUTOSAVE_KEY); } catch (_) {}
  }, []);

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
    // Bug #4b-3: playOffsetRef is already SECONDS — earlier `/ bpm * 60` re-divided seconds by bpm,
    // sending automation lookups to a wildly wrong project time at any non-120 tempo.
    const projectTime = playOffsetRef.current + (now - playStartRef.current);
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
      case "file:openLocal": {
        // Bug #8a: accept both new .spxsonic and legacy .spx/.json files.
        const inp = document.createElement("input");
        inp.type = "file"; inp.accept = `.${PROJECT_FILE_EXT},.spx,.json`;
        inp.onchange = async (e) => {
          const f = e.target.files[0]; if (!f) return;
          try {
            const ctx = audioCtxRef.current || getCtx();
            const { project, audioBuffers, isLegacy } = await loadProjectFile(f, ctx);
            applyLoadedProject(project, audioBuffers, { legacy: isLegacy });
          } catch (err) { setStatus("Failed to open: " + err.message); }
        };
        inp.click(); break;
      }
      case "file:saveAs": {
        // Bug #8b: SaveAsModal now owns just the filename — actual write goes through
        // downloadProjectAsSpxsonic so the audio buffers come along for the ride.
        setShowSaveAsModal(true); break;
      }
      case "file:saveDesktop": {
        // Bug #8a/#8b-1: zip with embedded audio (was a JSON-only payload missing audio_url and buffers).
        downloadProjectAsSpxsonic(`${projectName.replace(/\s+/g, "_")}.${PROJECT_FILE_EXT}`)
          .then(size => setStatus(`Downloaded: ${projectName}.${PROJECT_FILE_EXT} (${(size/1024).toFixed(1)} KB)`))
          .catch(err => setStatus(`Save failed: ${err.message}`));
        break;
      }
      case "file:importAudio": setViewMode("arrange"); handleImport(sel); break;
      case "file:importMidi": case "midi:import": setViewMode("pianoroll"); break;
      case "midi:controller": setMidiEnabled(m => !m); break;
      case "plugins:wam": window.open("/wam-plugin-store", "_blank"); break;
      case "file:exportMidi": case "midi:export": exportMidiFile(); break;
      case "file:bounce": case "file:exportMixdown": setShowExportModal(true); break;
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
      case "transport:rewind": {
        const beats = (timeSignatureRef.current && timeSignatureRef.current[0]) || 4;
        seekBy(-(60 / Math.max(1, bpm)) * beats);
        break;
      }
      case "transport:fastForward": {
        const beats = (timeSignatureRef.current && timeSignatureRef.current[0]) || 4;
        seekBy((60 / Math.max(1, bpm)) * beats);
        break;
      }
      case "transport:goToStart": rewind(); break;  // legacy "jump to 0" — preserved under explicit name
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
      case "transport:cycle": toggleCycle(); break;
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
    <div className="rs-layout-root">
      {showLeftSidebar && (
        <LeftSidebar
          tracks={tracks}
          selectedTrack={selectedTrack}
          onSelectTrack={setSelectedTrack}
          onToggleVisible={(i, v) => updateTrack(i, { visible: v })}
          onUpdateTrack={updateTrack}
          bpm={bpm}
          onBpmChange={setBpm}
          projectName={projectName}
          onProjectNameChange={setProjectName}
          fxRegistry={ALL_FX_EXTENDED}
          updateEffect={updateEffect}
          // Bug #11/#12 (Part 9b): the sidebar's + Add Insert / + Add Send
          // buttons fire onTrackAction(action, trackIndex) — previously this
          // prop was undefined so both were silent no-ops. Map them to the
          // same picker state Console uses, so a single source of truth
          // (track.effects / track.sends) drives every surface.
          onTrackAction={(action, ti) => {
            if (action === "addInsert") setInsertPickerState({ trackIndex: ti, x: 320, y: 200 });
            else if (action === "addSend") setSendPickerState({ trackIndex: ti, x: 320, y: 240 });
          }}
        />
      )}
      <div className="rs-layout-main">
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
            <button
              className={"rs-sb-toggle-btn" + (showLeftSidebar ? " active" : "")}
              onClick={() => setShowLeftSidebar(v => !v)}
              title={`Left sidebar (Ctrl+L)`}
            >▐◀</button>
            <button
              className={"rs-sb-toggle-btn" + (showRightSidebar ? " active" : "")}
              onClick={() => setShowRightSidebar(v => !v)}
              title={`Right sidebar (Ctrl+R)`}
            >▶▐</button>
            <div className="daw-divider"/>
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

          {/* transport moved to bottom bar */}
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

          <CollabToolbar collab={collab}/>
          <button
            className={"daw-toolbar-btn" + (qwertyEnabled ? " active" : "")}
            onClick={() => qwertyMidi.toggle()}
            title="Computer keyboard as MIDI controller (Cubase-style). A-S-D-F-G-H-J-K-L-; play notes; Z/X octave; ,/. velocity; Space sustain; Esc panic."
          >🎹 QWERTY</button>
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
            <ToolsDropdown viewMode={viewMode} setViewMode={setViewMode} onSplitAtPlayhead={handleCutRegion}/>
          </div>
        </div>
      </div>

      {/* ═══ MAIN VIEW ═══ */}
      <div className="daw-main">

        {/* ARRANGE */}
        {!splitScreen && viewMode === "arrange" && (
          <div className="rs-relative">
            <ArrangerView onBpmDetected={det => { setBpm(det); setStatus("♩ BPM detected: " + det); }} cycleEnabled={cycleEnabled} cycleStart={cycleStart} cycleEnd={cycleEnd}
              onCycleChange={(s, e) => { setCycleStart(s); setCycleEnd(e); }} onCycleToggle={toggleCycle}
              scrollContainerRef={arrangeScrollRef}
              selectedTrack={selectedTrack} onSelectTrack={setSelectedTrack}
              tracks={tracks} setTracks={setTracks} bpm={bpm} timeSignatureTop={timeSignature[0]} timeSignatureBottom={timeSignature[1]}
              masterVolume={masterVolume} onMasterVolumeChange={setMasterVolume} projectName={projectName} userTier={userTier}
              playheadBeat={playheadBeat} isPlaying={isPlaying} isRecording={isRecording}
              onPlay={handleArrangerPlay} onStop={handleArrangerStop} onRecord={handleArrangerRecord}
              onSeek={seekToBeat} onBpmChange={handleBpmChange} onTimeSignatureChange={handleTimeSignatureChange}
              onToggleFx={handleToggleFx} onBounce={mixDownProject} onSave={saveProject} saving={saving}
              instrumentEngine={instrumentEngine} onBrowseSounds={handleBrowseSounds}
              onOpenPianoRoll={onOpenPianoRoll} onTimelineDoubleClick={handleTimelineDoubleClick}
              MidiRegionPreview={MidiRegionPreview}
              onOpenClipEditor={(region, ti, ri) => setEditingClip({ region, ti, ri })}
              onAddTrack={() => setShowAddTrackDialog(true)}
              onAnalysisComplete={(analysis, fileName) => setStatus(`♬ ${fileName}: ${analysis.bpm?.bpm ?? "?"} BPM · ${analysis.key?.key ?? "?"} (${analysis.key?.camelot ?? "?"})`)}
              />
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

        {/* AUDIO CLIP EDITOR (Bug #9) */}
        {editingClip && (
          <AudioClipEditor
            region={editingClip.region}
            audioBuffer={editingClip.region?.audioBuffer || tracks[editingClip.ti]?.audioBuffer}
            onSave={(editedBuffer, editedAudioUrl, editMeta) => {
              setTracks(prev => prev.map((t, i) => (
                i !== editingClip.ti ? t : {
                  ...t,
                  regions: (t.regions || []).map((r, j) => (
                    j !== editingClip.ri ? r : { ...r, audioBuffer: editedBuffer, audioUrl: editedAudioUrl, edits: [...(r.edits || []), ...editMeta] }
                  )),
                }
              )));
              setEditingClip(null);
              setStatus(`✓ Clip edits applied (${editMeta.length} ops)`);
            }}
            onCancel={() => setEditingClip(null)}
          />
        )}

        {/* SPLIT SCREEN */}
        {splitScreen && (
          <div ref={splitContainerRef} className="rs-split-screen">
            <div className="rs-split-top" style={{ flex: "1 1 auto", minHeight: 0 }}>
              <span className="rs-split-pane-label">ARRANGE</span>
              <ArrangerView onBpmDetected={det => { setBpm(det); setStatus("♩ BPM detected: " + det); }} tracks={tracks} setTracks={setTracks} bpm={bpm} currentTime={currentTime} isPlaying={isPlaying}
                scrollContainerRef={arrangeScrollRef}
                selectedTrack={selectedTrack} onSelectTrack={setSelectedTrack} zoom={zoom} onZoomChange={setZoom}
                onBrowseSounds={handleBrowseSounds} onOpenPianoRoll={onOpenPianoRoll}
                onTimelineDoubleClick={handleTimelineDoubleClick} MidiRegionPreview={MidiRegionPreview}
                onOpenClipEditor={(region, ti, ri) => setEditingClip({ region, ti, ri })}/>
            </div>
            <div className="rs-split-handle" onMouseDown={handleSplitMouseDown} title="Drag to resize"/>
            <div className="rs-split-bottom" style={{ flex: "0 0 auto", height: `${mixerHeightPx}px` }}>
              <span className="rs-split-pane-label">MIXER</span>
              <div className="daw-console">
                <div
                  className="mixer-resize-handle"
                  style={{ top: `calc(${mixerUpperH}px + 74px)` }}
                  onMouseDown={handleMixerResizeStart}
                  title="Drag to resize inserts/sends"
                />
                <div className="daw-console-scroll">
                  {tracks.map((t, i) => {
                    const meter = meterLevels?.[i] || { left: 0, right: 0, peak: 0 };
                    // Phase F4-A.7B: visual active-console feedback. Non-`none`
                    // boards tint the channel's left edge with the console color
                    // and add a small ● ACTIVE badge near the header number.
                    const tConsoleId = trackConsoleChar[t.id];
                    const tConsoleActive = tConsoleId && tConsoleId !== "none";
                    const tConsoleColor = tConsoleActive ? (CONSOLE_BOARDS[tConsoleId]?.color || "#888") : null;
                    return (
                      <div key={t.id ?? i} className={"daw-channel"+(i===selectedTrack?" selected":"")+(t.armed?" armed":"")+(t.trackType==="bus"?" bus-channel":"")+(selectedChannels.has(t.id)?" linked":"")} style={tConsoleActive ? { borderLeft: `3px solid ${tConsoleColor}` } : undefined} onClick={e=>{if(e.ctrlKey||e.metaKey){setSelectedChannels(prev=>{const n=new Set(prev);n.has(t.id)?n.delete(t.id):n.add(t.id);return n;});}else setSelectedTrack(i);}} onContextMenu={e=>{e.preventDefault();setChannelCtxMenu({x:e.clientX,y:e.clientY,trackId:t.id,trackIndex:i});}}>
                        <div className="daw-ch-colorbar" style={{ background: t.color || "#4a90d9" }}/>
                        <div className="daw-ch-header">
                          <span className="daw-ch-type-icon">{t.trackType === "midi" ? "🎹" : "🎙"}</span>
                          <span className="daw-ch-header-num">{i + 1}</span>
                          {tConsoleActive && (
                            <span title={`${CONSOLE_BOARDS[tConsoleId]?.name} active`} style={{ display: "inline-flex", alignItems: "center", gap: 2, marginLeft: 4, fontSize: 8, fontWeight: 700, color: tConsoleColor, letterSpacing: 0.5, textShadow: `0 0 4px ${tConsoleColor}88` }}>
                              <span style={{ width: 6, height: 6, borderRadius: "50%", background: tConsoleColor, boxShadow: `0 0 4px ${tConsoleColor}` }} />
                              ACTIVE
                            </span>
                          )}
                        </div>
                        <div className="daw-ch-routing">
                          <span className="daw-ch-routing-value">{t.input || "Stereo In"}</span>
                          <select className="daw-ch-console-select" value={trackConsoleChar[t.id] || "none"} onChange={e => selectTrackConsole(t.id, e.target.value)}>
                            {Object.entries(CONSOLE_BOARDS).map(([id, b]) => <option key={id} value={id}>{b.name}</option>)}
                          </select>
                          {trackConsoleChar[t.id] && trackConsoleChar[t.id] !== "none" && (
                            <button
                              type="button"
                              className="daw-ch-console-edit-btn"
                              title="Open console editor"
                              onClick={e => { e.stopPropagation(); setOpenConsolePanel(prev => prev === t.id ? null : t.id); }}
                              style={{ marginLeft: 4, padding: "1px 6px", fontSize: 9, background: openConsolePanel === t.id ? (CONSOLE_BOARDS[trackConsoleChar[t.id]]?.color || "#4a90d9") : "#21262d", color: openConsolePanel === t.id ? "#000" : "#cdd9e5", border: `1px solid ${CONSOLE_BOARDS[trackConsoleChar[t.id]]?.color || "#444"}`, borderRadius: 3, cursor: "pointer", fontFamily: "monospace", fontWeight: 700 }}
                            >EDIT</button>
                          )}
                        </div>
                        <div className="ch-upper">
                        <div className="daw-ch-inserts">
                          <div className="daw-ch-inserts-label">INSERTS</div>
                          {getLoadedInserts(t).map(fx => (
                            <div key={fx.key} className={"daw-ch-insert-slot active " + (fx.type || "")}
                              onClick={e => { e.stopPropagation(); setSelectedTrack(i); setActiveEffectsTrack(i); setOpenFxKey(fx.key); }}
                              onContextMenu={e => { e.preventDefault(); e.stopPropagation(); setInsertCtxMenu({ x: e.clientX, y: e.clientY, trackIndex: i, fxKey: fx.key, fxName: fx.name }); }}>
                              {fx.name}
                              <button className="daw-ch-insert-x"
                                title="Remove insert"
                                onClick={e => { e.stopPropagation(); removeInsert(i, fx.key); }}>×</button>
                            </div>
                          ))}
                          {Array.from({length: Math.max(0, 6 - getLoadedInserts(t).length)}).map((_, si) => (
                            <div key={"empty"+si} className="daw-ch-insert-slot empty"
                              onClick={e => { e.stopPropagation(); const rect = e.currentTarget.getBoundingClientRect(); setInsertPickerState({ trackIndex: i, x: rect.right + 4, y: rect.top }); }}>
                            </div>
                          ))}
                        </div>
                        <div className="daw-ch-sends">
                          <div className="daw-ch-sends-label">SENDS</div>
                          {/* Bug #13 (Part 9b): empty placeholder send slots were inert. Wire them
                              to the SendPickerMenu so users can route to any track without first
                              creating a bus track. */}
                          {tracks.filter(b=>b.trackType==="bus").length === 0 && (
                            <>
                              <div className="daw-ch-send-slot empty" title="Click to add a send" onClick={e => { e.stopPropagation(); const rect = e.currentTarget.getBoundingClientRect(); setSendPickerState({ trackIndex: i, x: rect.right + 4, y: rect.top }); }}></div>
                              <div className="daw-ch-send-slot empty" title="Click to add a send" onClick={e => { e.stopPropagation(); const rect = e.currentTarget.getBoundingClientRect(); setSendPickerState({ trackIndex: i, x: rect.right + 4, y: rect.top }); }}></div>
                            </>
                          )}
                          {/* Existing user-added sends (not bus-targeted) — show + allow remove */}
                          {(t.sends || []).filter(s => !tracks.find(b => b.trackType === "bus" && b.id === s.busId)).map(s => (
                            <div key={s.busId} className="daw-ch-send-row" title="Right-click to remove send"
                              onContextMenu={e => { e.preventDefault(); e.stopPropagation(); updateTrack(i, { sends: (t.sends || []).filter(x => x.busId !== s.busId) }); }}>
                              <span className="daw-ch-send-name" style={{fontSize:9, color:"#00ffc8"}}>→ {s.target || "?"}</span>
                              <input type="range" className="daw-ch-send-level" min={0} max={1} step={0.01}
                                defaultValue={s.level || 0.5}
                                onClick={e => e.stopPropagation()}
                                onChange={e => { const v = parseFloat(e.target.value); updateTrack(i, { sends: (t.sends || []).map(x => x.busId === s.busId ? { ...x, level: v } : x) }); }}/>
                            </div>
                          ))}
                          {tracks.filter(b=>b.trackType==="bus").map(bus=>(
                            <div key={bus.id} className="daw-ch-send-row">
                              <span className="daw-ch-send-name">{bus.name}</span>
                              <div style={{display:"flex",alignItems:"center",gap:4,flex:1}}>
                                <input type="range" className="daw-ch-send-level" min={0} max={1} step={0.01}
                                  defaultValue={(t.sends||[]).find(s=>s.busId===bus.id)?.level||0}
                                  onClick={e=>e.stopPropagation()}
                                  onChange={e=>{const v=parseFloat(e.target.value);const newSends=[...(t.sends||[]).filter(s=>s.busId!==bus.id),{busId:bus.id,level:v}];updateTrack(i,{sends:newSends});}}/>
                                <span style={{color:"#4e6a82",fontSize:8,minWidth:24,textAlign:"right"}}>
                                  {Math.round(((t.sends||[]).find(s=>s.busId===bus.id)?.level||0)*100)}%
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                        </div>
                        <div className="ch-mid">
                        <div className="daw-ch-controls">
                          <div className={"daw-ch-badge" + (t.muted ? " m-on" : "")} onClick={e => { e.stopPropagation(); const nm = !t.muted; updateTrack(i, { muted: nm }); const audible = !nm && (!hasSolo || t.solo); if (trackGainsRef.current[i]) trackGainsRef.current[i].gain.value = audible ? t.volume : 0; }}>M</div>
                          <div className={"daw-ch-badge" + (t.solo ? " s-on" : "")} onClick={e => { e.stopPropagation(); const ns = !t.solo; updateTrack(i, { solo: ns }); const whs = tracks.some((x, idx) => idx === i ? ns : x.solo); tracks.forEach((x, idx) => { const gn = trackGainsRef.current[idx]; if (!gn) return; const s = idx === i ? ns : x.solo; gn.gain.value = (!x.muted && (!whs || s)) ? x.volume : 0; }); }}>S</div>
                          <div className={"daw-ch-badge" + (selectedTrack === i ? " e-on" : "")} onClick={e => { e.stopPropagation(); setSelectedTrack(i); setActiveEffectsTrack(i); }}>e</div>
                          {/* Bug #7 (Part 9): per-track input monitor (Cubase-style). Toggles `monitoring` so the recording mic gets routed to ctx.destination only when this track is armed. */}
                          <div className={"daw-ch-badge mon" + (t.monitoring ? " mon-on" : "")} onClick={e => { e.stopPropagation(); updateTrack(i, { monitoring: !t.monitoring }); }} title={t.monitoring ? "Input monitor ON" : "Input monitor OFF"}>🔊</div>
                          <button className={"daw-ch-rec-btn" + (t.armed ? " armed" : "")} onClick={e => { e.stopPropagation(); updateTrack(i, { armed: !t.armed }); }}>●</button>
                        </div>
                        <div className="daw-ch-pan">
                          <PanKnob value={t.pan} onChange={v => updateTrack(i, { pan: v })} size={32}/>
                        </div>
                        </div>
                        <div className="ch-lower">
                        <div className="daw-ch-fader-area">
                          <div className="daw-ch-fader-row">
                            <DBScale type="fader" />
                            <div className="daw-ch-fader">
                              <SvgFader value={t.volume ?? 1.0} showScale={false} onChange={v => { updateTrack(i, { volume: v }); const audible = !t.muted && (!hasSolo || t.solo); if (trackGainsRef.current[i]) trackGainsRef.current[i].gain.value = audible ? v : 0; }}/>
                            </div>
                            <CubaseMeter leftLevel={meter.left||0} rightLevel={meter.right||0} height={180} showScale={false}/>
                        <DBScale type="meter" />
                          </div>
                          <div className="daw-ch-vol-display">
                            <span className="daw-ch-vol-val">{t.volume > 0 ? (20 * Math.log10(t.volume)).toFixed(1) : "-∞"} dB</span>
                          </div>
                        </div>
                        <div className="daw-ch-automation">
                          <div className={"daw-ch-rw" + (t.readAutomation ? " active" : "")}>R</div>
                          <div className={"daw-ch-rw" + (t.writeAutomation ? " active" : "")}>W</div>
                        </div>
                        <div className="daw-ch-name daw-ch-name-bottom">
                          <input className="daw-ch-name-input" value={t.name || `Track ${i+1}`} onChange={e => updateTrack(i, {name: e.target.value})} onClick={e => e.stopPropagation()} style={{color: t.color || "#cdd9e5"}}/>
                        </div>
                        </div>
                      </div>
                    );
                  })}
                  {(() => {
                    const mActive = masterConsoleChar && masterConsoleChar !== "none";
                    const mColor = mActive ? (CONSOLE_BOARDS[masterConsoleChar]?.color || "#ff8a3d") : null;
                    return (
                  <div className={"daw-channel master-channel" + (selectedTrack === -1 ? " selected" : "")} style={mActive ? { borderLeft: `3px solid ${mColor}` } : undefined} onClick={() => { console.log("Master clicked! Current selectedTrack:", selectedTrack); setSelectedTrack(-1); }}>
                    <div className="daw-ch-colorbar" style={{ background: "#ff8a3d" }}/>
                    <div className="daw-ch-header">
                      <span className="daw-ch-type-icon">🎚</span>
                      <span className="daw-ch-header-num" style={{color:"#ff8a3d"}}>M</span>
                      {mActive && (
                        <span title={`${CONSOLE_BOARDS[masterConsoleChar]?.name} active`} style={{ display: "inline-flex", alignItems: "center", gap: 2, marginLeft: 4, fontSize: 8, fontWeight: 700, color: mColor, letterSpacing: 0.5, textShadow: `0 0 4px ${mColor}88` }}>
                          <span style={{ width: 6, height: 6, borderRadius: "50%", background: mColor, boxShadow: `0 0 4px ${mColor}` }} />
                          ACTIVE
                        </span>
                      )}
                    </div>
                    <div className="daw-ch-routing">
                      <span className="daw-ch-routing-value">Stereo Out</span>
                      <select className="daw-ch-console-select" value={masterConsoleChar} onChange={e => selectMasterConsole(e.target.value)}>
                        {Object.entries(CONSOLE_BOARDS).map(([id, b]) => <option key={id} value={id}>{b.name}</option>)}
                      </select>
                      {masterConsoleChar && masterConsoleChar !== "none" && (
                        <button
                          type="button"
                          className="daw-ch-console-edit-btn"
                          title="Open master console editor"
                          onClick={e => { e.stopPropagation(); setOpenConsolePanel(prev => prev === "master" ? null : "master"); }}
                          style={{ marginLeft: 4, padding: "1px 6px", fontSize: 9, background: openConsolePanel === "master" ? (CONSOLE_BOARDS[masterConsoleChar]?.color || "#ff8a3d") : "#21262d", color: openConsolePanel === "master" ? "#000" : "#cdd9e5", border: `1px solid ${CONSOLE_BOARDS[masterConsoleChar]?.color || "#444"}`, borderRadius: 3, cursor: "pointer", fontFamily: "monospace", fontWeight: 700 }}
                        >EDIT</button>
                      )}
                    </div>
                    <div className="ch-upper">
                    <div className="daw-ch-inserts">
                      <div className="daw-ch-inserts-label">INSERTS</div>
                      {Array.from({length:6}).map((_,si)=>(
                        <div key={"ms"+si} className="daw-ch-insert-slot empty" onClick={e=>{e.stopPropagation();const rect=e.currentTarget.getBoundingClientRect();setInsertPickerState({trackIndex:-1,x:rect.right+4,y:rect.top});}}></div>
                      ))}
                    </div>
                    <div className="daw-ch-sends">
                      <div className="daw-ch-sends-label">SENDS</div>
                      <div className="daw-ch-send-slot empty"></div>
                      <div className="daw-ch-send-slot empty"></div>
                    </div>
                    </div>
                    <div className="ch-mid">
                    <div className="daw-ch-controls">
                      <div className="daw-ch-badge">M</div>
                      <div className="daw-ch-badge">S</div>
                      <div className="daw-ch-badge e-on" onClick={e => { e.stopPropagation(); setActiveEffectsTrack(-1); }}>e</div>
                    </div>
                    <div className="daw-ch-pan">
                      <PanKnob value={masterPan || 0} onChange={v => { setMasterPan(v); if (masterPanRef.current) masterPanRef.current.pan.value = v; }} size={32}/>
                    </div>
                    </div>
                    <div className="ch-lower">
                    <div className="daw-ch-fader-area">
                      <div className="daw-ch-fader-row">
                        <DBScale type="fader" />
                        <div className="daw-ch-fader">
                          <SvgFader value={masterVolume ?? 1.0} showScale={false} isMaster={true} onChange={v => { setMasterVolume(v); if (masterGainRef.current) masterGainRef.current.gain.value = v; }}/>
                        </div>
                        <CubaseMeter leftLevel={masterMeterLevels?.left||0} rightLevel={masterMeterLevels?.right||0} height={180} showScale={false}/>
                        <DBScale type="meter" />
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
                      <span className="daw-ch-track-label rs-orange">MASTER</span>
                    </div>
                    </div>
                  </div>
                  );
                  })()}
                </div>

                {channelCtxMenu && (
                  <div className="channel-context-menu" onMouseLeave={()=>setChannelCtxMenu(null)}>
                    <div style={{color:"#4e6a82",fontSize:9,padding:"8px 12px 4px",letterSpacing:1,textTransform:"uppercase"}}>Channel Options</div>
                    <button className="arr-ctx-item" onClick={()=>{setSelectedChannels(prev=>{const n=new Set(prev);n.add(channelCtxMenu.trackId);return n;});setChannelCtxMenu(null);}}>🔗 Link Selected Channels</button>
                    <div className="ctx-separator" />
                    <button className="arr-ctx-item" onClick={()=>{addEffectTrack();setChannelCtxMenu(null);}}>🎛 Add Effect Track</button>
                    <button className="arr-ctx-item" onClick={()=>{addGroupTrack();setChannelCtxMenu(null);}}>⊕ Add Group Track (Bus)</button>
                    <button className="arr-ctx-item" onClick={()=>{addCubaseGroupTrack();setChannelCtxMenu(null);}}>👥 Add Group Master</button>
                    <button className="arr-ctx-item" onClick={()=>{addVCATrack();setChannelCtxMenu(null);}}>🎚 Add VCA Track</button>
                    <div className="ctx-separator" />
                    <button className="arr-ctx-item" onClick={()=>{addEffectTrack();selectedChannels.forEach(id=>{const idx=tracks.findIndex(t=>t.id===id);if(idx>=0) updateTrack(idx,{sends:[...(tracks[idx].sends||[]),{fxId:'fx_'+Date.now(),level:0.5}]});});setChannelCtxMenu(null);}}>🎛 Add Effect Track to Selected</button>
                    <button className="arr-ctx-item" onClick={()=>{addCubaseGroupTrack();setChannelCtxMenu(null);}}>👥 Add Group Master to Selected</button>
                    <button className="arr-ctx-item" onClick={()=>{addVCATrack();setChannelCtxMenu(null);}}>🎚 Add VCA Track to Selected</button>
                    <div className="ctx-separator" />
                    <button className="arr-ctx-item" onClick={()=>{copyTrackSettings();setChannelCtxMenu(null);}}>📋 Copy Track Settings</button>
                    <button className="arr-ctx-item" onClick={()=>{pasteTrackSettings();setChannelCtxMenu(null);}}>📄 Paste Settings to Selected</button>
                    <div className="ctx-separator" />
                    <button className="arr-ctx-item" onClick={()=>{moveSelectedChannels("up");setChannelCtxMenu(null);}}>⬆️ Move Selected Up</button>
                    <button className="arr-ctx-item" onClick={()=>{moveSelectedChannels("down");setChannelCtxMenu(null);}}>⬇️ Move Selected Down</button>
                    <div className="ctx-separator" />
                    <button className="arr-ctx-item" onClick={()=>{updateTrack(channelCtxMenu.trackIndex,{color:"#a855f7"});setChannelCtxMenu(null);}}>🎨 Purple</button>
                    <button className="arr-ctx-item" onClick={()=>{updateTrack(channelCtxMenu.trackIndex,{color:"#3b82f6"});setChannelCtxMenu(null);}}>🎨 Blue</button>
                    <button className="arr-ctx-item" onClick={()=>{updateTrack(channelCtxMenu.trackIndex,{color:"#00ffc8"});setChannelCtxMenu(null);}}>🎨 Teal</button>
                    <button className="arr-ctx-item" onClick={()=>{updateTrack(channelCtxMenu.trackIndex,{color:"#ff3b30"});setChannelCtxMenu(null);}}>🎨 Red</button>
                    <button className="arr-ctx-item" onClick={()=>{updateTrack(channelCtxMenu.trackIndex,{color:"#ff6600"});setChannelCtxMenu(null);}}>🎨 Orange</button>
                    <div className="ctx-separator" />
                    <button className="arr-ctx-item danger" onClick={()=>{removeTrack(channelCtxMenu.trackIndex);setChannelCtxMenu(null);}}>🗑 Remove Track</button>
                  </div>
                )}
                {insertCtxMenu && (
                  <div className="insert-context-menu" style={{left: insertCtxMenu.x, top: insertCtxMenu.y}} onMouseLeave={()=>setInsertCtxMenu(null)}>
                    <div className="ctx-header">{insertCtxMenu.fxName}</div>
                    <button className="arr-ctx-item danger" onClick={()=>{ removeInsert(insertCtxMenu.trackIndex, insertCtxMenu.fxKey); setInsertCtxMenu(null); }}>🗑 Remove insert</button>
                    <button className="arr-ctx-item" onClick={()=>{ updateEffect(insertCtxMenu.trackIndex, insertCtxMenu.fxKey, "enabled", false); setInsertCtxMenu(null); }}>🚫 Disable (keep params)</button>
                    <div className="ctx-separator" />
                    <button className="arr-ctx-item" onClick={()=>{ seedEffect(insertCtxMenu.trackIndex, insertCtxMenu.fxKey, PLUGIN_DEFAULTS[insertCtxMenu.fxKey] || {}); setInsertCtxMenu(null); }}>↺ Reset to defaults</button>
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
                const loaded = getLoadedInserts(t);
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
                    <div className="ch-upper">
                    <div className="daw-ch-inserts">
                      <div className="daw-ch-inserts-label">INSERTS</div>
                      {loaded.map(fx => (
                        <div key={fx.key} className={"daw-ch-insert-slot active " + (fx.type || "")}
                          onClick={e => { e.stopPropagation(); setSelectedTrack(i); setSelectedTrackIndex(i); setActiveEffectsTrack(i); setOpenFxKey(fx.key); }}
                          onContextMenu={e => { e.preventDefault(); e.stopPropagation(); setInsertCtxMenu({ x: e.clientX, y: e.clientY, trackIndex: i, fxKey: fx.key, fxName: fx.name }); }}>
                          {fx.name}
                          <button className="daw-ch-insert-x"
                            title="Remove insert"
                            onClick={e => { e.stopPropagation(); removeInsert(i, fx.key); }}>×</button>
                        </div>
                      ))}
                      {loaded.length < 8 && (
                        <div className="daw-ch-insert-slot empty"
                          onClick={e => { e.stopPropagation(); const rect = e.currentTarget.getBoundingClientRect(); setInsertPickerState({ trackIndex: i, x: rect.right + 4, y: rect.top }); }}>
                          + Insert
                        </div>
                      )}
                    </div>
                    </div>
                    <div className="ch-mid">
                    <div className="daw-ch-controls">
                      <div className={"daw-ch-badge" + (t.muted ? " m-on" : "")} onClick={e => { e.stopPropagation(); const nm = !t.muted; updateTrack(i, { muted: nm }); const audible = !nm && (!hasSolo || t.solo); if (trackGainsRef.current[i]) trackGainsRef.current[i].gain.value = audible ? t.volume : 0; }}>M</div>
                      <div className={"daw-ch-badge" + (t.solo ? " s-on" : "")} onClick={e => { e.stopPropagation(); const ns = !t.solo; updateTrack(i, { solo: ns }); const whs = tracks.some((x, idx) => idx === i ? ns : x.solo); tracks.forEach((x, idx) => { const gn = trackGainsRef.current[idx]; if (!gn) return; const s = idx === i ? ns : x.solo; gn.gain.value = (!x.muted && (!whs || s)) ? x.volume : 0; }); }}>S</div>
                      <div className={"daw-ch-badge" + (selectedTrack === i ? " e-on" : "")} onClick={e => { e.stopPropagation(); setSelectedTrack(i); setActiveEffectsTrack(i); }}>e</div>
                      {/* Bug #7 (Part 9): per-track input monitor in the split-screen mixer too. */}
                      <div className={"daw-ch-badge mon" + (t.monitoring ? " mon-on" : "")} onClick={e => { e.stopPropagation(); updateTrack(i, { monitoring: !t.monitoring }); }} title={t.monitoring ? "Input monitor ON" : "Input monitor OFF"}>🔊</div>
                      <button className={"daw-ch-rec-btn" + (t.armed ? " armed" : "")} onClick={e => { e.stopPropagation(); updateTrack(i, { armed: !t.armed }); }} title="Record arm">●</button>
                    </div>
                    <div className="daw-ch-pan">
                      <PanKnob value={t.pan} onChange={v => updateTrack(i, { pan: v })} size={32}/>
                    </div>
                    </div>
                    <div className="ch-lower">
                    <div className="daw-ch-fader-area">
                      <div className="daw-ch-fader-row">
                        <DBScale type="fader" />
                        <div className="daw-ch-fader">
                          <SvgFader value={t.volume ?? 1.0} showScale={false}
                            onChange={v => { updateTrack(i, { volume: v }); const audible = !t.muted && (!hasSolo || t.solo); if (trackGainsRef.current[i]) trackGainsRef.current[i].gain.value = audible ? v : 0; }}/>
                        </div>
                        <CubaseMeter leftLevel={meter.left || 0} rightLevel={meter.right || 0} height={180} showScale={false}/>
                        <DBScale type="meter" />
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
                      <select className="daw-ch-console-select" value={trackConsoleChar[t.id] || "none"} onChange={e => selectTrackConsole(t.id, e.target.value)} onClick={e => e.stopPropagation()}>
                        {Object.entries(CONSOLE_BOARDS).map(([id, b]) => <option key={id} value={id}>{b.name}</option>)}
                      </select>
                      {trackConsoleChar[t.id] && trackConsoleChar[t.id] !== "none" && (
                        <button
                          type="button"
                          className="daw-ch-console-edit-btn"
                          title="Open console editor"
                          onClick={e => { e.stopPropagation(); setOpenConsolePanel(prev => prev === t.id ? null : t.id); }}
                          style={{ marginLeft: 4, padding: "1px 6px", fontSize: 9, background: openConsolePanel === t.id ? (CONSOLE_BOARDS[trackConsoleChar[t.id]]?.color || "#4a90d9") : "#21262d", color: openConsolePanel === t.id ? "#000" : "#cdd9e5", border: `1px solid ${CONSOLE_BOARDS[trackConsoleChar[t.id]]?.color || "#444"}`, borderRadius: 3, cursor: "pointer", fontFamily: "monospace", fontWeight: 700 }}
                        >EDIT</button>
                      )}
                    </div>
                    </div>
                  </div>
                );
              })}

              {/* MASTER CHANNEL */}
              <div className={"daw-channel master-channel" + (selectedTrack === -1 ? " selected" : "")} onClick={() => { console.log("Master clicked! Current selectedTrack:", selectedTrack); setSelectedTrack(-1); }}>
                <div className="daw-ch-colorbar" style={{ background: "#ff8a3d" }}/>
                <div className="daw-ch-header">
                  <span className="daw-ch-type-icon">🎚</span>
                  <span className="daw-ch-header-num">M</span>
                </div>
                <div className="daw-ch-routing"><span className="daw-ch-routing-value">Stereo Out</span></div>
                <div className="ch-upper">
                <div className="daw-ch-inserts">
                  <div className="daw-ch-inserts-label">INSERTS</div>
                  <div className="daw-ch-insert-slot empty" onClick={e => { e.stopPropagation(); const rect = e.currentTarget.getBoundingClientRect(); setInsertPickerState({ trackIndex: -1, x: rect.right + 4, y: rect.top }); }}>+ Insert</div>
                </div>
                </div>
                <div className="ch-mid">
                <div className="daw-ch-controls">
                  <div className="daw-ch-badge">M</div>
                  <div className="daw-ch-badge">S</div>
                  <div className="daw-ch-badge">e</div>
                  <div className="daw-ch-rec-btn"/>
                </div>
                <div className="daw-ch-pan">
                  <PanKnob value={masterPan || 0} onChange={v => { setMasterPan(v); if (masterPanRef.current) masterPanRef.current.pan.value = v; }} size={32}/>
                </div>
                </div>
                <div className="ch-lower">
                <div className="daw-ch-fader-area">
                  <div className="daw-ch-fader-row">
                        <DBScale type="fader" />
                    <div className="daw-ch-fader">
                      <SvgFader value={masterVolume ?? 1.0} showScale={false} isMaster={true}
                        onChange={v => { setMasterVolume(v); if (masterGainRef.current) masterGainRef.current.gain.value = v; }}/>
                    </div>
                    <CubaseMeter leftLevel={masterMeterLevels?.left || 0} rightLevel={masterMeterLevels?.right || 0} height={180} showScale={false}/>
                        <DBScale type="meter" />
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
                  <select className="daw-ch-console-select" value={masterConsoleChar} onChange={e => selectMasterConsole(e.target.value)}>
                    {Object.entries(CONSOLE_BOARDS).map(([id, b]) => <option key={id} value={id}>{b.name}</option>)}
                  </select>
                  {masterConsoleChar && masterConsoleChar !== "none" && (
                    <button
                      type="button"
                      className="daw-ch-console-edit-btn"
                      title="Open master console editor"
                      onClick={e => { e.stopPropagation(); setOpenConsolePanel(prev => prev === "master" ? null : "master"); }}
                      style={{ marginLeft: 4, padding: "1px 6px", fontSize: 9, background: openConsolePanel === "master" ? (CONSOLE_BOARDS[masterConsoleChar]?.color || "#ff8a3d") : "#21262d", color: openConsolePanel === "master" ? "#000" : "#cdd9e5", border: `1px solid ${CONSOLE_BOARDS[masterConsoleChar]?.color || "#444"}`, borderRadius: 3, cursor: "pointer", fontFamily: "monospace", fontWeight: 700 }}
                    >EDIT</button>
                  )}
                </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* BEAT MAKER */}
        {viewMode === "beatmaker" && (
          <SamplerBeatMaker onExport={handleBeatExport} onClose={() => setViewMode("arrange")} isEmbedded={true}
            onSendToArrange={(audioBuffer, name) => { const idx = selectedTrackIndex; const audioUrl = URL.createObjectURL(audioBufferToWav(audioBuffer)); updateTrack(idx, { audioBuffer, audio_url: audioUrl, name: name || tracks[idx].name }); createRegionFromImport(idx, audioBuffer, name || "Beat", audioUrl); setViewMode("arrange"); setStatus(`Beat bounced to Track ${idx + 1}`); }}
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
        {viewMode === "speakersim"   && <MonitorRoomPro audioContext={audioCtxRef.current} inputNode={masterConsoleOutRef.current || masterGainRef.current}/>}
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
            onConsoleChange={v => { selectMasterConsole(v); masterConsoleCharRef.current = v; }}
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
              {analogSubview === "console" && <div className="rs-console-panel"><div className="rs-console-label">CONSOLE CHARACTER — Applied to each track and master bus</div><div className="rs-console-btn-row">{Object.entries(CONSOLE_BOARDS).map(([id, b]) => (<button key={id} onClick={() => { tracks.forEach(t => selectTrackConsole(t.id, id)); }} className="daw-console-board-btn" style={{ borderColor: b.color, background: id === "none" ? "#0d1117" : `${b.color}22`, color: b.color }}>{b.name}</button>))}</div><div className="rs-master-bus-label">MASTER BUS</div><div className="rs-console-btn-row">{Object.entries(CONSOLE_BOARDS).map(([id, b]) => (<button key={id} onClick={() => selectMasterConsole(id)} className="daw-console-board-btn-sm" style={{ borderColor: masterConsoleChar === id ? b.color : "#21262d", background: masterConsoleChar === id ? `${b.color}22` : "#0d1117", color: masterConsoleChar === id ? b.color : "#4e6a82" }}>{b.name}</button>))}</div><div className="rs-console-hint">Per-track: Use the Console tab dropdown on each channel strip</div></div>}
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

        {/* SEND PICKER (Bug #12 Part 9b) */}
        {sendPickerState && (
          <DraggablePanel title="ADD SEND" onClose={() => setSendPickerState(null)} initialX={Math.min(sendPickerState.x, window.innerWidth - 340)} initialY={120}>
            <div style={{maxHeight:"60vh", overflowY:"auto"}} onClick={e => e.stopPropagation()}>
              <SendPickerMenu
                sendPickerState={sendPickerState}
                setSendPickerState={setSendPickerState}
                tracks={tracks}
                updateTrack={updateTrack}
                setStatus={setStatus}
              />
            </div>
          </DraggablePanel>
        )}

        {/* INSERT PICKER */}
        {insertPickerState && (
          <DraggablePanel title="ADD INSERT" onClose={()=>setInsertPickerState(null)} initialX={Math.min(insertPickerState.x, window.innerWidth-340)} initialY={80}>
            <div style={{maxHeight:"75vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
            <InsertPickerMenu
              insertPickerState={insertPickerState}
              setInsertPickerState={setInsertPickerState}
              tracks={tracks}
              updateEffect={updateEffect}
              seedEffect={seedEffect}
              setActiveEffectsTrack={setActiveEffectsTrack}
              setOpenFxKey={setOpenFxKey}
              setShowVocalModal={setShowVocalModal}
              setShowMicSimModal={setShowMicSimModal}
              setStatus={setStatus}
              setTracks={setTracks}
              disposeAllForTrack={disposeAllForTrack}
            />
            </div>
          </DraggablePanel>
        )}


        {/* ── EXPORT AUDIO MIXDOWN MODAL ── */}
        {showExportModal && (
          <div className="rs-export-overlay" onClick={()=>setShowExportModal(false)}>
            <div className="rs-export-modal" onClick={e=>e.stopPropagation()}>

              {/* Header */}
              <div className="rs-export-header">
                <span className="rs-export-title">Export Audio Mixdown</span>
                <div className="rs-export-header-actions">
                  <button onClick={()=>{setShowExportModal(false);exportStems(tracks.map((_,i)=>i),true);}} className="rs-export-stems-quick">⚡ Stems Without FX</button>
                  <button onClick={()=>setShowExportModal(false)} className="rs-export-close">✕</button>
                </div>
              </div>

              {/* Body */}
              <div className="rs-export-body">

                {/* LEFT — Channel Selection */}
                <div className="rs-export-left">
                  <div className="rs-export-section-head">
                    <span className="rs-export-section-head-label">Channel Selection</span>
                    <div className="rs-export-mode-row">
                      <button onClick={()=>setExportSettings(p=>({...p,mode:"mixdown",selectedTracks:[]}))} className={"rs-export-mode-btn" + (exportSettings.mode==="mixdown" ? " active" : "")}>Single</button>
                      <button onClick={()=>setExportSettings(p=>({...p,mode:"stems"}))} className={"rs-export-mode-btn" + (exportSettings.mode==="stems" ? " active" : "")}>Multiple</button>
                    </div>
                  </div>
                  <div className="rs-export-channel-list">
                    {/* Output Channels */}
                    <div className="rs-export-channel-group-header output">
                      <span>▼</span><span>Output Channels</span>
                    </div>
                    <div className="rs-export-stereo-out">
                      <input type="checkbox" checked={exportSettings.mode==="mixdown"} onChange={()=>setExportSettings(p=>({...p,mode:"mixdown",selectedTracks:[]}))} style={{accentColor:"#00ffc8"}}/>
                      <span className="rs-export-channel-name">🎚 Stereo Out</span>
                    </div>
                    {/* Group Channels */}
                    {tracks.filter(t=>t.trackType==="bus").length > 0 && <>
                      <div className="rs-export-channel-group-header bus">
                        <span>▼</span><span>Group Channels</span>
                      </div>
                      {tracks.filter(t=>t.trackType==="bus").map((t,i)=>(
                        <div key={t.id} className="rs-export-channel-row" onClick={()=>setExportSettings(p=>({...p,mode:"stems",selectedTracks:p.selectedTracks.includes(i)?p.selectedTracks.filter(x=>x!==i):[...p.selectedTracks,i]}))}>
                          <input type="checkbox" readOnly checked={exportSettings.selectedTracks.includes(i)} style={{accentColor:"#a78bfa"}}/>
                          <div className="rs-export-channel-color" style={{background:t.color||"#a78bfa"}}/>
                          <span className="rs-export-channel-name">{t.name}</span>
                        </div>
                      ))}
                    </>}
                    {/* Audio Channels */}
                    <div className="rs-export-channel-group-header audio">
                      <span>▼</span><span>Audio Channels</span>
                    </div>
                    {tracks.filter(t=>t.trackType!=="bus").map((t,i)=>(
                      <div key={t.id} className={"rs-export-channel-row" + (exportSettings.selectedTracks.includes(i) ? " selected" : "")} onClick={()=>setExportSettings(p=>({...p,mode:"stems",selectedTracks:p.selectedTracks.includes(i)?p.selectedTracks.filter(x=>x!==i):[...p.selectedTracks,i]}))}>
                        <input type="checkbox" readOnly checked={exportSettings.mode==="mixdown"||exportSettings.selectedTracks.includes(i)} style={{accentColor:"#5ac8fa"}}/>
                        <div className="rs-export-channel-color" style={{background:t.color||"#5ac8fa"}}/>
                        <span className="rs-export-channel-name flex1">{t.name||`Track ${i+1}`}</span>
                        {t.audioBuffer && <span className="rs-export-channel-has-audio">●</span>}
                      </div>
                    ))}
                  </div>
                  {/* Export Range */}
                  <div className="rs-export-range-section">
                    <div className="rs-export-range-label">Export Range</div>
                    <div className="rs-export-range-row">
                      {["Locators","All"].map(r=>(
                        <button key={r} onClick={()=>setExportSettings(p=>({...p,range:r}))} className={"rs-export-range-btn" + (exportSettings.range===r ? " active" : "")}>{r}</button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* RIGHT — File Format */}
                <div className="rs-export-right">
                  {/* File Location */}
                  <div className="rs-export-block">
                    <div className="rs-export-block-label">File Location</div>
                    <div className="rs-export-grid-2col">
                      <span className="rs-export-field-label">Name</span>
                      <input value={exportSettings.filename||projectName} onChange={e=>setExportSettings(p=>({...p,filename:e.target.value}))} className="rs-export-input"/>
                      <span className="rs-export-field-label">Preview</span>
                      <span className="rs-export-preview">{(exportSettings.filename||projectName).replace(/\s+/g,"_")}.{exportSettings.format}</span>
                    </div>
                  </div>

                  {/* File Format */}
                  <div className="rs-export-block">
                    <div className="rs-export-block-label">File Format</div>
                    <div className="rs-export-grid-4col">
                      <span className="rs-export-field-label">File Type</span>
                      <select value={exportSettings.format} onChange={e=>setExportSettings(p=>({...p,format:e.target.value}))} className="rs-export-select">
                        <option value="wav">WAV</option>
                        <option value="mp3">MP3 (MPEG 1 Layer 3)</option>
                        <option value="flac">FLAC</option>
                        <option value="aiff">AIFF</option>
                      </select>
                      <span className="rs-export-field-label">Sample Rate</span>
                      <select value={exportSettings.sampleRate} onChange={e=>setExportSettings(p=>({...p,sampleRate:+e.target.value}))} className="rs-export-select">
                        <option value={44100}>44.100 kHz</option>
                        <option value={48000}>48.000 kHz</option>
                        <option value={96000}>96.000 kHz</option>
                      </select>
                      <span className="rs-export-field-label">Bit Depth</span>
                      <select value={exportSettings.bitDepth} onChange={e=>setExportSettings(p=>({...p,bitDepth:+e.target.value}))} className="rs-export-select">
                        <option value={16}>16 Bit</option>
                        <option value={24}>24 Bit</option>
                        <option value={32}>32 Bit Float</option>
                      </select>
                      <span className="rs-export-field-label">Export As</span>
                      <select className="rs-export-select">
                        <option>Interleaved</option>
                        <option>Split Channels</option>
                      </select>
                    </div>
                  </div>

                  {/* Effects */}
                  <div className="rs-export-block">
                    <div className="rs-export-block-label">Effects</div>
                    <div className="rs-export-grid-2col-wide">
                      <span className="rs-export-field-label">Processing</span>
                      <select value={exportSettings.processing||"inserts"} onChange={e=>setExportSettings(p=>({...p,processing:e.target.value}))} className="rs-export-select">
                        <option value="inserts">Inserts and Strip</option>
                        <option value="noFx">No Effects (Dry)</option>
                        <option value="masterOnly">Master Bus Only</option>
                      </select>
                      <span className="rs-export-field-label">After Export</span>
                      <select className="rs-export-select">
                        <option>Do Nothing</option>
                        <option>Open in New Track</option>
                      </select>
                    </div>
                  </div>

                  {/* Options */}
                  <div className="rs-export-block">
                    <div className="rs-export-block-label">Options</div>
                    <div className="rs-export-options-row">
                      {[["Real Time Export","realtimeExport"],["Update Display","updateDisplay"],["Keep Dialog Open","keepOpen"]].map(([lbl,key])=>(
                        <label key={key} className="rs-export-option-label">
                          <input type="checkbox" checked={!!exportSettings[key]} onChange={e=>setExportSettings(p=>({...p,[key]:e.target.checked}))} style={{accentColor:"#00ffc8"}}/>
                          <span className="rs-export-field-label">{lbl}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="rs-export-footer">
                <div className="rs-export-footer-group">
                  <button onClick={()=>{setShowExportModal(false);exportStems(tracks.map((_,i)=>i),true);}} className="rs-export-stems-bulk">⚡ Export All Stems (No FX)</button>
                </div>
                <div className="rs-export-footer-group">
                  <button onClick={()=>setShowExportModal(false)} className="rs-export-cancel-btn">Cancel</button>
                  <button onClick={()=>{
                    setShowExportModal(false);
                    if(exportSettings.mode==="stems") exportStems(exportSettings.selectedTracks);
                    else mixDownProject();
                  }} className="rs-export-confirm-btn">
                    {mixingDown?"Exporting...":"Export Audio"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── VIDEO SCORE PANEL ── */}
        {videoUrl && (
          <div className="rs-video-score">
            <div className="rs-video-score-header">
              <span className="rs-video-score-title">🎬 VIDEO SCORE</span>
              <button onClick={()=>{setVideoUrl(null);setVideoFile(null);}} className="rs-video-score-close">✕</button>
            </div>
            <video src={videoUrl} controls className="rs-video-score-video" ref={el=>{if(el){el.currentTime=currentTime;}}} onTimeUpdate={e=>{}}/>
          </div>
        )}
        {/* FX POPUP — SPX plugins render their own PluginWindow via SPXPluginHost;
            native effects (eq/comp/gate/etc.) render inside ConsoleFXPanel. */}
        {afx && openFxKey && SPX_PLUGIN_KEYS.has(openFxKey) && (
          <SPXPluginHost
            pluginKey={openFxKey}
            params={afx?.effects?.[openFxKey]}
            onChange={(newPatch) => {
              // Phase 3 RT path: diff against previous patch and push only
              // changed params straight to the live AudioParam via setParam.
              // Persistence via setTracks happens after — UI never has to wait.
              const oldPatch = afx?.effects?.[openFxKey] || {};
              // Fan changed params out to every registered scope
              // (monitor/bus/playback) so the audible graph always receives them.
              Object.keys(newPatch).forEach(key => {
                if (key !== "enabled" && newPatch[key] !== oldPatch[key]) {
                  setEffectParamForTrack(afx.id, openFxKey, key, newPatch[key]);
                }
              });
              setTracks(prev => prev.map((t, i) => i !== activeEffectsTrack ? t : {
                ...t,
                effects: {
                  ...(t.effects || DEFAULT_EFFECTS()),
                  [openFxKey]: { ...newPatch, enabled: t.effects?.[openFxKey]?.enabled ?? true },
                },
              }));
            }}
            onClose={() => { setActiveEffectsTrack(null); setOpenFxKey(null); }}
            setStatus={setStatus}
            getInstance={() => {
              // Resolve the audible scoped instance (playback for audio tracks,
              // monitor for MIDI), falling back to bus / legacy unscoped key.
              const lm = liveInstancesRef.current, b = `${afx.id}:${openFxKey}`;
              return lm.get(`${b}:playback`) || lm.get(`${b}:monitor`) || lm.get(`${b}:bus`) || lm.get(b);
            }}
          />
        )}
        {afx && openFxKey && !SPX_PLUGIN_KEYS.has(openFxKey) && (
          <DraggablePanel title={"FX — " + (afx.name || "Track")} onClose={() => { setActiveEffectsTrack(null); setOpenFxKey(null); }} initialX={window.innerWidth-680} initialY={60}>
            <ConsoleFXPanel track={afx} trackIndex={activeEffectsTrack} updateEffect={updateEffect}
              onClose={() => { setActiveEffectsTrack(null); setOpenFxKey(null); }} openFxKey={openFxKey}
              setStatus={setStatus}/>
          </DraggablePanel>
        )}

        {/* Phase F4-A.7B: ConsolePanel — live-tweak UI for the active console */}
        {openConsolePanel && (() => {
          const isMaster = openConsolePanel === "master";
          const trackId = isMaster ? null : openConsolePanel;
          const boardId = isMaster ? masterConsoleChar : trackConsoleChar[trackId];
          if (!boardId || boardId === "none") return null;
          const board = CONSOLE_BOARDS[boardId];
          if (!board) return null;
          const params = isMaster
            ? (masterConsoleParams || CONSOLE_FACTORY_PARAMS[boardId])
            : (trackConsoleParams[trackId] || CONSOLE_FACTORY_PARAMS[boardId]);
          const family = CONSOLE_FAMILY[boardId] || "vintage";
          const scopeKey = isMaster ? "master" : `track:${trackId}`;
          const onParamChange = (name, value) => {
            if (isMaster) updateMasterConsoleParam(name, value);
            else updateTrackConsoleParam(trackId, name, value);
          };
          const onReset = () => { if (isMaster) resetMasterConsole(); else resetTrackConsole(trackId); };
          const onAB = () => {
            // Snapshot current → B if no B yet for this scope; otherwise swap
            // current ↔ B and apply via setParam ramps.
            const cur = { ...(params || {}) };
            const slot = consoleABSlot[scopeKey];
            if (!slot) {
              setConsoleABSlot(prev => ({ ...prev, [scopeKey]: cur }));
              setStatus("Stored B snapshot — tweak knobs then A/B to swap");
            } else {
              setConsoleABSlot(prev => ({ ...prev, [scopeKey]: cur }));
              // Apply slot values to live audio + state
              if (isMaster) {
                setMasterConsoleParams({ ...slot, _board: boardId });
                const inst = liveInstancesRef.current.get(`master:console`);
                if (inst) Object.entries(slot).forEach(([k, v]) => { if (k !== "_board") try { inst.setParam(k, v); } catch (_e) {} });
              } else {
                setTrackConsoleParams(prev => ({ ...prev, [trackId]: { ...slot, _board: boardId } }));
                Object.entries(slot).forEach(([k, v]) => { if (k !== "_board") setConsoleParamForTrack(trackId, k, v); });
              }
              setStatus("A/B swap");
            }
          };
          const onLoadPreset = (_name, presetParams) => {
            if (isMaster) {
              setMasterConsoleParams({ ...presetParams, _board: boardId });
              const inst = liveInstancesRef.current.get(`master:console`);
              if (inst) Object.entries(presetParams).forEach(([k, v]) => { if (k !== "_board") try { inst.setParam(k, v); } catch (_e) {} });
            } else {
              setTrackConsoleParams(prev => ({ ...prev, [trackId]: { ...presetParams, _board: boardId } }));
              Object.entries(presetParams).forEach(([k, v]) => { if (k !== "_board") setConsoleParamForTrack(trackId, k, v); });
            }
          };
          // Part 2: feed the VU/LED meter from the AUDIBLE console's analyser
          // tap. Prefer playback (audio tracks) then monitor (MIDI), falling
          // back to the legacy unscoped key; master has a single console.
          const lm = liveInstancesRef.current;
          const meterAnalyser = isMaster
            ? lm.get(`master:console`)?.analyser
            : (lm.get(`${trackId}:console:playback`)?.analyser
               || lm.get(`${trackId}:console:monitor`)?.analyser
               || lm.get(`${trackId}:console`)?.analyser
               || null);
          return (
            <DraggablePanel
              title={`CONSOLE — ${board.name}${isMaster ? " (MASTER)" : ""}`}
              onClose={() => setOpenConsolePanel(null)}
              initialX={Math.max(20, window.innerWidth - 580)}
              initialY={120}
            >
              <ConsolePanel
                consoleId={boardId}
                consoleName={board.name}
                consoleColor={board.color}
                family={family}
                params={params}
                onParamChange={onParamChange}
                onAB={onAB}
                onReset={onReset}
                onLoadPreset={onLoadPreset}
                onSavePreset={() => setStatus("Preset saved")}
                onClose={() => setOpenConsolePanel(null)}
                target={isMaster ? "master" : "track"}
                postOutputAnalyser={meterAnalyser}
              />
            </DraggablePanel>
          );
        })()}

        {/* Architectural #4: restore-unsaved-work offer (metadata only, no audio). */}
        {restoreOffer && (
          <div className="rs-restore-toast">
            <span className="rs-restore-toast-msg">
              Restore unsaved work from <strong>{new Date(restoreOffer.savedAt).toLocaleString()}</strong>?
              <span className="rs-restore-toast-hint">(metadata only — audio buffers stay if you have the .spxsonic)</span>
            </span>
            <button className="rs-restore-toast-btn primary" onClick={acceptRestore}>Restore</button>
            <button className="rs-restore-toast-btn" onClick={dismissRestore}>Dismiss</button>
          </div>
        )}

        {/* SAVE AS — Bug #8a/#8b: zip-based .spxsonic with embedded audio. */}
        <SaveAsModal show={showSaveAsModal} defaultName={projectName} extension={PROJECT_FILE_EXT}
          onSave={async (fileName) => {
            try {
              const size = await downloadProjectAsSpxsonic(fileName);
              setStatus(`Saved: ${fileName} (${(size/1024).toFixed(1)} KB)`);
            } catch (err) { setStatus(`Save failed: ${err.message}`); }
            setShowSaveAsModal(false);
          }}
          onCancel={() => setShowSaveAsModal(false)}/>

        <CollabChatPanel collab={collab}/>
        {showAddTrackDialog && (
          <AddTrackDialog
            onAdd={(type, trackName) => {
              // Bug #1 (Part 9): always read prev.length so multiple onAdd calls
              // (count > 1, or a stale closure after a file drop) each get the
              // correct index instead of overwriting the same slot.
              setTracks(prev => {
                if (prev.length >= maxTracks) return prev;
                const i = prev.length;
                const t = { ...DEFAULT_TRACK(i, type) };
                if (trackName) t.name = trackName;
                setSelectedTrackIndex(i);
                setStatus("✓ " + t.name + " added");
                return [...prev, t];
              });
            }}
            onClose={() => setShowAddTrackDialog(false)}
            maxTracks={maxTracks}
            currentCount={tracks.length}
          />
        )}
      </div>
    {/* ── BOTTOM TRANSPORT BAR ── */}
      <div className="daw-bottom-transport">
        <div className="daw-bt-left">
          <span className="daw-bt-snap-label">SNAP</span>
          <select className="daw-bt-snap-select" value={timeSignature[0]} onChange={e=>setTimeSignature([+e.target.value,timeSignature[1]])}>
            {[1,2,3,4,5,6,7,8].map(n=><option key={n} value={n}>{n}</option>)}
          </select>
          <span className="daw-bt-snap-label">/</span>
          <select className="daw-bt-snap-select" value={timeSignature[1]} onChange={e=>setTimeSignature([timeSignature[0],+e.target.value])}>
            {[2,4,8,16].map(n=><option key={n} value={n}>{n}</option>)}
          </select>
          <div className="daw-bt-divider"/>
          {/* Bug #10c: keyboard shortcut S also triggers handleCutRegion (set up via window keydown handler). */}
          <button className="daw-icon-btn" onClick={handleCutRegion} title="Split clip at playhead (S)">✂</button>
          {/* Bug #10a: was "SPLIT" — clashed with the audio-split affordance above. Renamed to SPLIT VIEW. */}
          <button className={"rs-split-toggle-btn" + (splitScreen?" active":"")} onClick={()=>setSplitScreen(s=>!s)} title="Toggle split view layout">
            <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="1" y="1" width="10" height="4.5" rx="0.5"/><rect x="1" y="6.5" width="10" height="4.5" rx="0.5"/></svg>
            SPLIT VIEW
          </button>
        </div>
        <div className="daw-bt-center">
          <button className="daw-transport-btn"
            onMouseDown={() => startScrub(-1)}
            onMouseUp={stopScrub}
            onMouseLeave={stopScrub}
            onTouchStart={(e) => { e.preventDefault(); startScrub(-1); }}
            onTouchEnd={stopScrub}
            disabled={isRecording}
            title="Rewind 1 bar (hold to scrub)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19 20L9 12l10-8v16zM7 19V5H5v14h2z"/></svg>
          </button>
          <button className="daw-transport-btn"
            onMouseDown={() => startScrub(1)}
            onMouseUp={stopScrub}
            onMouseLeave={stopScrub}
            onTouchStart={(e) => { e.preventDefault(); startScrub(1); }}
            onTouchEnd={stopScrub}
            disabled={isRecording}
            title="Fast forward 1 bar (hold to scrub)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M5 4l10 8-10 8V4zM17 5h2v14h-2V5z"/></svg>
          </button>
          <button className="daw-transport-btn" onClick={stopEverything} title="Stop">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>
          </button>
          <button className={"daw-transport-btn daw-play-btn"+(isPlaying&&!isRecording?" active":"")} onClick={()=>isPlaying?stopPlayback():startPlayback()} disabled={isRecording}>
            {isPlaying&&!isRecording
              ?<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="4" width="5" height="16" rx="1"/><rect x="14" y="4" width="5" height="16" rx="1"/></svg>
              :<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>}
          </button>
          <button className={"daw-transport-btn daw-rec-btn"+(isRecording?" active":"")} onClick={()=>isRecording?stopRecording():startRecording()}>
            <span className="daw-rec-dot"/>
          </button>
          <button
            className={`spx-follow-btn spx-follow-${followMode}`}
            onClick={cycleFollowMode}
            title={`Follow Playhead: ${followMode.toUpperCase()} (F)`}
          >
            {followMode === "off" ? "⇥" : followMode === "page" ? "⇉" : "⟳"}
          </button>
          <div className="daw-lcd">
            <span className="daw-lcd-time">{fmt(currentTime)}</span>
            <span className="daw-lcd-sep">|</span>
            <span className="daw-lcd-bpm">{bpm} BPM</span>
          </div>
        </div>
        <div className="daw-bt-right">
          <button className={"daw-transport-btn daw-metro-btn"+(metronomeOn?" active":"")}
            onClick={()=>{const ctx=getCtx();if(metronomeOn){stopMetronome();setMetronomeOn(false);}else{startMetronome(ctx);setMetronomeOn(true);}}} title="Metronome">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L8 22h8L12 2z"/><line x1="12" y1="8" x2="18" y2="4"/></svg>
          </button>
          <button className={"daw-transport-btn rs-transport-label"+(countIn?" active":"")} onClick={()=>setCountIn(!countIn)} title="Count-in">1234</button>
          {/* Bug #6: configurable pre-roll length (was hardcoded to one bar). */}
          <select value={countInBars} onChange={(e)=>setCountInBars(Number(e.target.value))} className="daw-pre-roll-select" title="Pre-roll length">
            <option value={0}>Off</option>
            <option value={1}>1 bar</option>
            <option value={2}>2 bars</option>
            <option value={4}>4 bars</option>
          </select>
          <button className={"daw-transport-btn"+(cycleEnabled?" active":"")} onClick={toggleCycle} title="Cycle">⟳ CYCLE</button>
          <div className="daw-bt-divider"/>
          <span className="daw-bt-snap-label">LUFS</span>
          <span className="daw-bt-lufs" style={{color:lufsValue>-14?"#ff6b6b":lufsValue>-18?"#ffaa00":"#00ffc8",fontFamily:"JetBrains Mono,monospace",fontSize:11,minWidth:36}}>{lufsValue.toFixed(1)}</span>
          <div className="daw-bt-divider"/>
          <button className={"daw-transport-btn"+(monoCheck?" active":"")} onClick={()=>setMonoCheck(p=>!p)} title="Mono check">MONO</button>
          <div className="daw-bt-divider"/>
          <MidiDeviceIndicator devices={instrumentEngine.midiDevices} activeDevice={instrumentEngine.activeMidiDevice} midiActivity={instrumentEngine.midiActivity} onConnect={instrumentEngine.connectMidiDevice} onDisconnect={instrumentEngine.disconnectMidiDevice}/>
          <KeyboardOctaveIndicator octave={instrumentEngine.keyboardOctave} onOctaveChange={instrumentEngine.setKeyboardOctave}/>
          <span className="daw-bt-status">{status}</span>
        </div>

        {/* TRACK TYPE SELECTION MODAL */}
        {showTrackTypeModal && (
          <div className="rs-modal-overlay" onClick={() => setShowTrackTypeModal(false)}>
            <div className="rs-modal-panel" style={{maxWidth:320}} onClick={e => e.stopPropagation()}>
              <div className="rs-modal-header">
                <h3>Add Track</h3>
                <button onClick={() => setShowTrackTypeModal(false)} className="rs-modal-close">✕</button>
              </div>
              <div className="rs-modal-body">
                <div style={{display:"grid",gap:12,gridTemplateColumns:"1fr"}}>
                  <button className="arr-ctx-item" style={{justifyContent:"flex-start",padding:16}} onClick={() => addTrackWithType("audio")}>
                    🎙 Audio Track
                    <div style={{fontSize:12,color:"#8ba3bc",marginTop:4}}>Record vocals, instruments, or import audio files</div>
                  </button>
                  <button className="arr-ctx-item" style={{justifyContent:"flex-start",padding:16}} onClick={() => addTrackWithType("midi")}>
                    🎹 MIDI Track
                    <div style={{fontSize:12,color:"#8ba3bc",marginTop:4}}>Sequence notes for virtual instruments</div>
                  </button>
                  <button className="arr-ctx-item" style={{justifyContent:"flex-start",padding:16}} onClick={() => addTrackWithType("instrument")}>
                    🎸 Instrument Track
                    <div style={{fontSize:12,color:"#8ba3bc",marginTop:4}}>Audio + MIDI combined with built-in instrument</div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
      </div>
      {showRightSidebar && (
        <RightSidebar
          audioContext={audioCtxRef.current}
          selectedTrack={selectedTrack}
          tracks={tracks}
          onSendToTrack={(item) => {
            // Hook for drag/double-click items from sidebar
            if (item && item.type === "instrument") {
              setStatus(`Loading instrument: ${item.name}`);
            } else if (item && item.type === "effect") {
              setStatus(`Adding FX: ${item.name}`);
            } else if (item && item.type === "loop" && item.buffer) {
              const ai = tracks.findIndex(t => t.armed);
              const idx = ai !== -1 ? ai : selectedTrack;
              if (idx >= 0 && tracks[idx]) {
                updateTrack(idx, { audioBuffer: item.buffer, audio_url: item.url, name: item.name });
                if (typeof createRegionFromImport === "function") {
                  createRegionFromImport(idx, item.buffer, item.name, item.url);
                }
                setStatus(`✓ "${item.name}" → Track ${idx + 1}`);
              }
            }
          }}
        />
      )}
      {qwertyEnabled && (
        <div className="qwerty-midi-hud">
          <div className="qwerty-midi-hud-row">
            <span className="qwerty-midi-label">QWERTY MIDI</span>
            <span className="qwerty-midi-status">ON</span>
          </div>
          <div className="qwerty-midi-hud-row">
            <span>Octave: C{qwertyOctave}</span>
            <span>Vel: {qwertyVelocity}</span>
          </div>
          {qwertyLastNote != null && (
            <div className="qwerty-midi-hud-row">
              <span>Last: {midiNoteName(qwertyLastNote)}</span>
            </div>
          )}
          <div className="qwerty-midi-hud-keys">
            A-S-D-F-G-H-J-K-L-; · W-E-T-Y-U-O-P · Z/X octave · ,/. vel · Space sustain · Esc panic
          </div>
        </div>
      )}
    </div>
  );
};

export default RecordingStudio;
