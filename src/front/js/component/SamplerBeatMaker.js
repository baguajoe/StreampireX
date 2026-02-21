// =============================================================================
// SamplerBeatMaker.js — Complete Beat Maker / Sampler (Phase 1 + 2 + 3)
// =============================================================================
// 16-pad MPC-style sampler with step sequencer, live recording, chop view,
// pattern management, mixer, per-pad effects, song mode/sequence builder,
// mic/line-in sampling, MIDI controller support, sound library, export
// =============================================================================

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import '../../styles/SamplerBeatMaker.css';

// =============================================================================
// CONSTANTS
// =============================================================================

const KEY_TO_PAD = {
  '1': 0, '2': 1, '3': 2, '4': 3,
  'q': 4, 'w': 5, 'e': 6, 'r': 7,
  'a': 8, 's': 9, 'd': 10, 'f': 11,
  'z': 12, 'x': 13, 'c': 14, 'v': 15,
};

const PAD_KEY_LABELS = [
  '1','2','3','4','Q','W','E','R',
  'A','S','D','F','Z','X','C','V',
];

const PAD_COLORS = [
  '#ff4444','#ff6b35','#ffa500','#ffd700',
  '#00ffc8','#00d4ff','#4a9eff','#7b68ee',
  '#ff69b4','#ff1493','#c840e9','#9370db',
  '#32cd32','#00fa9a','#40e0d0','#87ceeb',
];

const DEFAULT_PAD = {
  name: 'Empty', buffer: null,
  volume: 0.8, pitch: 0, pan: 0,
  trimStart: 0, trimEnd: null,
  playMode: 'oneshot', reverse: false,
  muted: false, soloed: false,
  // Effects (Phase 3)
  filterOn: false, filterType: 'lowpass', filterFreq: 2000, filterQ: 1,
  reverbOn: false, reverbMix: 0.3,
  delayOn: false, delayTime: 0.25, delayFeedback: 0.3, delayMix: 0.2,
  distortionOn: false, distortionAmt: 20,
  attack: 0, release: 0,
};

const STEP_COUNTS = [16, 32, 64];

const SOUND_LIBRARY = {
  'Trap Kit': [
    '808 Deep','808 Distorted','Kick Hard','Snare Tight',
    'HH Closed','HH Open','HH Roll','Clap',
    'Rim','Perc 1','Crash','Vox Chop',
  ],
  'Boom Bap Kit': [
    'Kick Dusty','Snare Vinyl','HH Tight','Open Hat',
    'Shaker','Kick Alt','Snare Ghost','Ride',
  ],
  'R&B Kit': [
    'Kick Soft','Snare Brush','HH Light','Rim Click',
    'Fingersnap','Shaker','Tambourine','Clap Soft',
  ],
  'Lo-Fi Kit': [
    'Kick Muffled','Snare Tape','HH Dusty','Vinyl Crackle',
    'Perc Warm','Rim Soft',
  ],
  'EDM Kit': [
    'Kick Big','Clap Layer','HH Sharp','Open Hat',
    'Crash','Snare Build','Riser','Impact',
  ],
  'Afrobeats Kit': [
    'Kick Log','Snare Wire','Shaker','Bell',
    'Conga High','Conga Low','Guiro','Perc',
  ],
};

const mkPattern = (n, sc) => ({
  name: n || 'Pattern 1',
  steps: Array.from({ length: 16 }, () => Array(sc || 16).fill(false)),
  velocities: Array.from({ length: 16 }, () => Array(sc || 16).fill(0.8)),
  stepCount: sc || 16,
});

// =============================================================================
// COMPONENT
// =============================================================================

const SamplerBeatMaker = ({ onExport, onClose, isEmbedded = false, stemSeparatorOutput = null }) => {

  // ==== AUDIO ENGINE REFS ====
  const ctxRef = useRef(null);
  const masterRef = useRef(null);
  const metGainRef = useRef(null);
  const activeSrc = useRef({});
  const reverbBuf = useRef(null);
  const mediaStream = useRef(null);
  const mediaRec = useRef(null);
  const recChunks = useRef([]);

  // ==== PADS ====
  const [pads, setPads] = useState(
    Array.from({ length: 16 }, (_, i) => ({ ...DEFAULT_PAD, id: i, color: PAD_COLORS[i] }))
  );
  const [activePads, setActivePads] = useState(new Set());
  const [selectedPad, setSelectedPad] = useState(null);
  const [padBank, setPadBank] = useState('A');
  const [padBanks] = useState({ A: null, B: null, C: null, D: null });

  // ==== PATTERNS (Phase 2) ====
  const [patterns, setPatterns] = useState([mkPattern('Pattern 1', 16)]);
  const [curPatIdx, setCurPatIdx] = useState(0);
  const [steps, setSteps] = useState(patterns[0].steps);
  const [stepVel, setStepVel] = useState(patterns[0].velocities);
  const [stepCount, setStepCount] = useState(16);

  // ==== SONG MODE (Phase 3) ====
  const [songMode, setSongMode] = useState(false);
  const [songSeq, setSongSeq] = useState([]);
  const [songPos, setSongPos] = useState(-1);
  const [songPlaying, setSongPlaying] = useState(false);

  // ==== TRANSPORT ====
  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpm] = useState(140);
  const [swing, setSwing] = useState(0);
  const [metOn, setMetOn] = useState(false);
  const [masterVol, setMasterVol] = useState(0.8);
  const [looping, setLooping] = useState(true);
  const [curStep, setCurStep] = useState(-1);

  // ==== LIVE RECORDING (Phase 2) ====
  const [liveRec, setLiveRec] = useState(false);
  const [overdub, setOverdub] = useState(false);
  const [recHits, setRecHits] = useState([]);
  const [quantVal, setQuantVal] = useState('1/16');
  const recStartT = useRef(0);

  // ==== MIC RECORDING ====
  const [micRec, setMicRec] = useState(false);
  const [micPad, setMicPad] = useState(null);
  const [micCount, setMicCount] = useState(0);

  // ==== CHOP VIEW (Phase 2) ====
  const [showChop, setShowChop] = useState(false);
  const [chopIdx, setChopIdx] = useState(null);
  const [chopPts, setChopPts] = useState([]);
  const [chopSens, setChopSens] = useState(0.3);
  const chopCanvas = useRef(null);

  // ==== MIXER (Phase 2) ====
  const [showMixer, setShowMixer] = useState(false);
  const [padLvls, setPadLvls] = useState(Array(16).fill(0));

  // ==== AUDIO DEVICES ====
  const [devices, setDevices] = useState({ inputs: [], outputs: [] });
  const [selOut, setSelOut] = useState('default');
  const [selIn, setSelIn] = useState('default');
  const [showDevices, setShowDevices] = useState(false);

  // ==== SOUND LIBRARY (Phase 2) ====
  const [showLib, setShowLib] = useState(false);
  const [selKit, setSelKit] = useState(null);

  // ==== MIDI (Phase 3) ====
  const [midiInputs, setMidiInputs] = useState([]);
  const [selMidi, setSelMidi] = useState(null);
  const [midiLearn, setMidiLearn] = useState(false);
  const [midiLearnPad, setMidiLearnPad] = useState(null);
  const [midiMap, setMidiMap] = useState({});

  // ==== CUSTOM KITS (Phase 3) ====
  const [savedKits, setSavedKits] = useState(() => {
    try { return JSON.parse(localStorage.getItem('spx_kits') || '[]'); } catch { return []; }
  });

  // ==== UI ====
  const [view, setView] = useState('split');
  const [showPadSet, setShowPadSet] = useState(false);
  const [settingsTab, setSettingsTab] = useState('main');
  const [dragPad, setDragPad] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState('wav');
  const [exportQuality, setExportQuality] = useState(192); // kbps for mp3
  const [showExportPanel, setShowExportPanel] = useState(false);
  const [exportProgress, setExportProgress] = useState('');
  const [exportStatus, setExportStatus] = useState('');
  const lameRef = useRef(null);
  const tapTimes = useRef([]);

  // ==== SEQUENCER REFS ====
  const seqTimer = useRef(null);
  const nextStepT = useRef(0);
  const curStepRef = useRef(-1);
  const playingRef = useRef(false);
  const stepsRef = useRef(steps);
  const padsRef = useRef(pads);
  const bpmRef = useRef(bpm);
  const swingRef = useRef(swing);
  const scRef = useRef(stepCount);
  const metRef = useRef(metOn);
  const loopRef = useRef(looping);
  const liveRef = useRef(liveRec);
  const songRef = useRef(songMode);
  const songSeqRef = useRef(songSeq);
  const patsRef = useRef(patterns);
  const patIdxRef = useRef(curPatIdx);

  useEffect(() => { stepsRef.current = steps; }, [steps]);
  useEffect(() => { padsRef.current = pads; }, [pads]);
  useEffect(() => { bpmRef.current = bpm; }, [bpm]);
  useEffect(() => { swingRef.current = swing; }, [swing]);
  useEffect(() => { scRef.current = stepCount; }, [stepCount]);
  useEffect(() => { metRef.current = metOn; }, [metOn]);
  useEffect(() => { loopRef.current = looping; }, [looping]);
  useEffect(() => { liveRef.current = liveRec; }, [liveRec]);
  useEffect(() => { songRef.current = songMode; }, [songMode]);
  useEffect(() => { songSeqRef.current = songSeq; }, [songSeq]);
  useEffect(() => { patsRef.current = patterns; }, [patterns]);
  useEffect(() => { patIdxRef.current = curPatIdx; }, [curPatIdx]);

  // Sync pattern ↔ steps
  useEffect(() => {
    if (patterns[curPatIdx]) {
      setSteps(patterns[curPatIdx].steps);
      setStepVel(patterns[curPatIdx].velocities);
      setStepCount(patterns[curPatIdx].stepCount);
    }
  }, [curPatIdx, patterns]);

  useEffect(() => {
    setPatterns(prev => {
      const u = [...prev];
      if (u[curPatIdx]) u[curPatIdx] = { ...u[curPatIdx], steps, velocities: stepVel, stepCount };
      return u;
    });
  }, [steps, stepVel, stepCount]);

  // =========================================================================
  // AUDIO INIT
  // =========================================================================

  const initCtx = useCallback(() => {
    if (ctxRef.current && ctxRef.current.state !== 'closed') return ctxRef.current;
    const c = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: 'interactive', sampleRate: 44100 });
    const mg = c.createGain(); mg.gain.value = masterVol; mg.connect(c.destination); masterRef.current = mg;
    const met = c.createGain(); met.gain.value = 0.3; met.connect(c.destination); metGainRef.current = met;
    // Reverb IR
    const len = c.sampleRate * 2;
    const ir = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.5); }
    reverbBuf.current = ir;
    ctxRef.current = c;
    return c;
  }, [masterVol]);

  // =========================================================================
  // DEVICE DETECTION
  // =========================================================================

  useEffect(() => {
    const detect = async () => {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true }).then(s => s.getTracks().forEach(t => t.stop())).catch(() => {});
        const d = await navigator.mediaDevices.enumerateDevices();
        setDevices({
          inputs: d.filter(x => x.kind === 'audioinput').map(x => ({ id: x.deviceId, label: x.label || `Input ${x.deviceId.slice(0, 8)}` })),
          outputs: d.filter(x => x.kind === 'audiooutput').map(x => ({ id: x.deviceId, label: x.label || `Output ${x.deviceId.slice(0, 8)}` })),
        });
      } catch (e) { console.error('Device error:', e); }
    };
    detect();
    navigator.mediaDevices?.addEventListener('devicechange', detect);
    return () => navigator.mediaDevices?.removeEventListener('devicechange', detect);
  }, []);

  useEffect(() => { const c = ctxRef.current; if (c && selOut !== 'default' && c.setSinkId) c.setSinkId(selOut).catch(() => {}); }, [selOut]);
  useEffect(() => { if (masterRef.current) masterRef.current.gain.value = masterVol; }, [masterVol]);

  // =========================================================================
  // MIDI (Phase 3)
  // =========================================================================

  useEffect(() => {
    if (!navigator.requestMIDIAccess) return;
    navigator.requestMIDIAccess({ sysex: false }).then(acc => {
      const ins = []; acc.inputs.forEach(i => ins.push(i)); setMidiInputs(ins);
      acc.onstatechange = () => { const n = []; acc.inputs.forEach(i => n.push(i)); setMidiInputs(n); };
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selMidi) return;
    const handle = (msg) => {
      const [st, note, vel] = msg.data;
      const noteOn = (st & 0xF0) === 0x90 && vel > 0;
      const noteOff = (st & 0xF0) === 0x80 || ((st & 0xF0) === 0x90 && vel === 0);
      if (midiLearn && midiLearnPad !== null && noteOn) {
        setMidiMap(p => ({ ...p, [note]: midiLearnPad }));
        setMidiLearn(false); setMidiLearnPad(null); return;
      }
      const pi = midiMap[note]; if (pi === undefined) return;
      if (noteOn) {
        const v = vel / 127; playPad(pi, v);
        if (liveRef.current && ctxRef.current) setRecHits(p => [...p, { pad: pi, time: ctxRef.current.currentTime - recStartT.current, velocity: v }]);
      } else if (noteOff && padsRef.current[pi]?.playMode === 'hold') stopPad(pi);
    };
    selMidi.onmidimessage = handle;
    return () => { selMidi.onmidimessage = null; };
  }, [selMidi, midiMap, midiLearn, midiLearnPad]);

  // =========================================================================
  // SAMPLE LOADING
  // =========================================================================

  const loadSample = useCallback(async (pi, file) => {
    const c = initCtx();
    try {
      let ab;
      if (file instanceof File || file instanceof Blob) ab = await file.arrayBuffer();
      else if (typeof file === 'string') { const r = await fetch(file); ab = await r.arrayBuffer(); }
      else if (file instanceof AudioBuffer) {
        setPads(p => { const u = [...p]; u[pi] = { ...u[pi], name: `Sample ${pi + 1}`, buffer: file, trimEnd: file.duration }; return u; });
        return;
      } else return;
      const buf = await c.decodeAudioData(ab);
      const name = file.name ? file.name.replace(/\.[^/.]+$/, '') : typeof file === 'string' ? file.split('/').pop().replace(/\.[^/.]+$/, '') : `Sample ${pi + 1}`;
      setPads(p => { const u = [...p]; u[pi] = { ...u[pi], name, buffer: buf, trimEnd: buf.duration }; return u; });
    } catch (e) { console.error(`Load pad ${pi} failed:`, e); }
  }, [initCtx]);

  // Load stem separator output
  useEffect(() => {
    if (stemSeparatorOutput?.length > 0) stemSeparatorOutput.forEach((s, i) => { if (i < 16 && s.url) loadSample(i, s.url); });
  }, [stemSeparatorOutput, loadSample]);

  // =========================================================================
  // MIC / LINE-IN RECORDING
  // =========================================================================

  const startMicRec = useCallback(async (pi) => {
    const c = initCtx(); if (c.state === 'suspended') await c.resume();
    try {
      const constraints = { audio: selIn !== 'default' ? { deviceId: { exact: selIn } } : true };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      mediaStream.current = stream;
      setMicPad(pi);
      // Countdown 3-2-1
      for (let i = 3; i > 0; i--) { setMicCount(i); await new Promise(r => setTimeout(r, 700)); }
      setMicCount(0);
      const rec = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm' });
      mediaRec.current = rec; recChunks.current = [];
      rec.ondataavailable = (e) => { if (e.data.size > 0) recChunks.current.push(e.data); };
      rec.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(recChunks.current, { type: 'audio/webm' });
        await loadSample(pi, blob);
        setMicRec(false); setMicPad(null);
      };
      rec.start(); setMicRec(true);
    } catch (e) {
      console.error('Mic error:', e);
      alert('Could not access microphone. Check browser permissions.');
      setMicRec(false); setMicPad(null); setMicCount(0);
    }
  }, [initCtx, selIn, loadSample]);

  const stopMicRec = useCallback(() => {
    if (mediaRec.current?.state === 'recording') mediaRec.current.stop();
  }, []);

  // =========================================================================
  // PAD PLAYBACK WITH EFFECTS
  // =========================================================================

  const playPad = useCallback((pi, vel = 0.8, time = null) => {
    const c = initCtx();
    const pad = padsRef.current[pi];
    if (!pad?.buffer || pad.muted) return;
    const anySolo = padsRef.current.some(p => p.soloed);
    if (anySolo && !pad.soloed) return;

    // Stop prev
    if (activeSrc.current[pi]) { try { activeSrc.current[pi].source.stop(); } catch (e) {} }

    const src = c.createBufferSource();
    const gain = c.createGain();
    const pan = c.createStereoPanner();

    // Reverse
    if (pad.reverse) {
      const rev = c.createBuffer(pad.buffer.numberOfChannels, pad.buffer.length, pad.buffer.sampleRate);
      for (let ch = 0; ch < pad.buffer.numberOfChannels; ch++) {
        const s = pad.buffer.getChannelData(ch), d = rev.getChannelData(ch);
        for (let i = 0; i < s.length; i++) d[i] = s[s.length - 1 - i];
      }
      src.buffer = rev;
    } else src.buffer = pad.buffer;

    src.playbackRate.value = Math.pow(2, pad.pitch / 12);
    if (pad.playMode === 'loop') { src.loop = true; src.loopStart = pad.trimStart; src.loopEnd = pad.trimEnd || pad.buffer.duration; }

    const st = time || c.currentTime;
    if (pad.attack > 0) { gain.gain.setValueAtTime(0, st); gain.gain.linearRampToValueAtTime(pad.volume * vel, st + pad.attack); }
    else gain.gain.setValueAtTime(pad.volume * vel, st);
    pan.pan.value = pad.pan;

    // Effects chain: src → [filter] → [distortion] → gain → pan → master + [delay wet] + [reverb wet]
    let last = src;
    if (pad.filterOn) {
      const f = c.createBiquadFilter(); f.type = pad.filterType; f.frequency.value = pad.filterFreq; f.Q.value = pad.filterQ;
      last.connect(f); last = f;
    }
    if (pad.distortionOn) {
      const ws = c.createWaveShaper(); const amt = pad.distortionAmt;
      const curve = new Float32Array(44100);
      for (let i = 0; i < 44100; i++) { const x = (i * 2) / 44100 - 1; curve[i] = ((3 + amt) * x * 20 * (Math.PI / 180)) / (Math.PI + amt * Math.abs(x)); }
      ws.curve = curve; ws.oversample = '2x'; last.connect(ws); last = ws;
    }
    last.connect(gain); gain.connect(pan); pan.connect(masterRef.current);

    if (pad.delayOn) {
      const dl = c.createDelay(2), dg = c.createGain(), fb = c.createGain();
      dl.delayTime.value = pad.delayTime; dg.gain.value = pad.delayMix; fb.gain.value = pad.delayFeedback;
      pan.connect(dl); dl.connect(dg); dl.connect(fb); fb.connect(dl); dg.connect(masterRef.current);
    }
    if (pad.reverbOn && reverbBuf.current) {
      const conv = c.createConvolver(), rg = c.createGain();
      conv.buffer = reverbBuf.current; rg.gain.value = pad.reverbMix;
      pan.connect(conv); conv.connect(rg); rg.connect(masterRef.current);
    }

    const off = pad.trimStart || 0;
    const dur = (pad.trimEnd || pad.buffer.duration) - off;
    if (pad.playMode === 'loop') src.start(st, off);
    else src.start(st, off, dur + (pad.release || 0));

    if (pad.release > 0 && pad.playMode !== 'loop') {
      const rs = st + dur; gain.gain.setValueAtTime(pad.volume * vel, rs); gain.gain.linearRampToValueAtTime(0, rs + pad.release);
    }

    activeSrc.current[pi] = { source: src, gain };
    setActivePads(p => new Set([...p, pi]));
    src.onended = () => { setActivePads(p => { const n = new Set(p); n.delete(pi); return n; }); delete activeSrc.current[pi]; };

    setPadLvls(p => { const u = [...p]; u[pi] = vel; return u; });
    setTimeout(() => setPadLvls(p => { const u = [...p]; u[pi] = Math.max(0, u[pi] - 0.3); return u; }), 150);
  }, [initCtx]);

  const stopPad = useCallback((pi) => {
    if (activeSrc.current[pi]) { try { activeSrc.current[pi].source.stop(); } catch (e) {} delete activeSrc.current[pi]; }
    setActivePads(p => { const n = new Set(p); n.delete(pi); return n; });
  }, []);

  const stopAll = useCallback(() => {
    Object.keys(activeSrc.current).forEach(k => { try { activeSrc.current[k].source.stop(); } catch (e) {} });
    activeSrc.current = {}; setActivePads(new Set());
  }, []);

  // =========================================================================
  // METRONOME
  // =========================================================================

  const metClick = useCallback((t, down) => {
    const c = ctxRef.current; if (!c || !metGainRef.current) return;
    const o = c.createOscillator(), g = c.createGain();
    o.frequency.value = down ? 1000 : 800;
    g.gain.setValueAtTime(down ? 0.3 : 0.15, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    o.connect(g); g.connect(metGainRef.current); o.start(t); o.stop(t + 0.05);
  }, []);

  // =========================================================================
  // SEQUENCER ENGINE
  // =========================================================================

  const schedStep = useCallback((si, t) => {
    const cs = stepsRef.current;
    for (let pi = 0; pi < 16; pi++) { if (cs[pi]?.[si]) playPad(pi, stepVel[pi]?.[si] ?? 0.8, t); }
    if (metRef.current) { const spb = scRef.current / 4; metClick(t, si % spb === 0); }
    const d = (t - ctxRef.current.currentTime) * 1000;
    setTimeout(() => setCurStep(si), Math.max(0, d));
  }, [playPad, metClick, stepVel]);

  const startSeq = useCallback(() => {
    const c = initCtx(); if (c.state === 'suspended') c.resume();
    playingRef.current = true; setIsPlaying(true);
    curStepRef.current = -1; nextStepT.current = c.currentTime + 0.05;
    if (liveRec) recStartT.current = c.currentTime;

    const scheduler = () => {
      if (!playingRef.current) return;
      const sd = 60.0 / bpmRef.current / 4;
      while (nextStepT.current < c.currentTime + 0.1) {
        const ns = (curStepRef.current + 1) % scRef.current;
        let so = 0;
        if (ns % 2 === 1 && swingRef.current > 0) so = sd * (swingRef.current / 100) * 0.5;
        schedStep(ns, nextStepT.current + so);
        curStepRef.current = ns; nextStepT.current += sd;

        // Song mode: advance pattern at end
        if (ns === scRef.current - 1 && songRef.current && songSeqRef.current.length > 0) {
          const curSongIdx = songSeqRef.current.findIndex(b => b.patternIndex === patIdxRef.current);
          const nextSongIdx = curSongIdx + 1;
          if (nextSongIdx < songSeqRef.current.length) {
            const nextPat = songSeqRef.current[nextSongIdx].patternIndex;
            setTimeout(() => { setCurPatIdx(nextPat); setSongPos(nextSongIdx); }, 0);
          } else if (loopRef.current) {
            const firstPat = songSeqRef.current[0].patternIndex;
            setTimeout(() => { setCurPatIdx(firstPat); setSongPos(0); }, 0);
          } else {
            playingRef.current = false; setIsPlaying(false); setCurStep(-1); return;
          }
        }

        if (ns === scRef.current - 1 && !loopRef.current && !songRef.current) {
          playingRef.current = false; setIsPlaying(false); setCurStep(-1); return;
        }
      }
      seqTimer.current = setTimeout(scheduler, 25);
    };
    scheduler();
  }, [initCtx, schedStep, liveRec]);

  const stopSeq = useCallback(() => {
    playingRef.current = false; setIsPlaying(false); setCurStep(-1); curStepRef.current = -1;
    if (seqTimer.current) clearTimeout(seqTimer.current); seqTimer.current = null;
    stopAll(); setSongPlaying(false); setSongPos(-1);
  }, [stopAll]);

  const togglePlay = useCallback(() => { playingRef.current ? stopSeq() : startSeq(); }, [startSeq, stopSeq]);

  // =========================================================================
  // SONG MODE (Phase 3)
  // =========================================================================

  const startSong = useCallback(() => {
    if (songSeq.length === 0) return;
    setSongPlaying(true); setSongPos(0); setCurPatIdx(songSeq[0].patternIndex);
    startSeq();
  }, [songSeq, startSeq]);

  const addToSong = useCallback((pi) => {
    setSongSeq(p => [...p, { patternIndex: pi, name: patterns[pi]?.name || `Pat ${pi + 1}` }]);
  }, [patterns]);
  const rmFromSong = useCallback((i) => setSongSeq(p => p.filter((_, j) => j !== i)), []);
  const moveSongBlock = useCallback((from, to) => {
    setSongSeq(p => { const u = [...p]; const [item] = u.splice(from, 1); u.splice(to, 0, item); return u; });
  }, []);

  // =========================================================================
  // LIVE RECORDING + QUANTIZE (Phase 2)
  // =========================================================================

  const startLiveRec = useCallback(() => {
    if (!overdub) setSteps(Array.from({ length: 16 }, () => Array(stepCount).fill(false)));
    setRecHits([]); setLiveRec(true);
    if (!playingRef.current) startSeq();
  }, [overdub, stepCount, startSeq]);

  const stopLiveRec = useCallback(() => {
    setLiveRec(false);
    if (recHits.length > 0) {
      const sd = 60.0 / bpm / 4;
      const qm = { '1/4': 4, '1/8': 2, '1/16': 1, '1/32': 0.5 };
      const qs = qm[quantVal] || 1;
      setSteps(prev => {
        const u = prev.map(r => [...r]);
        recHits.forEach(h => { const si = Math.round(Math.round(h.time / sd / qs) * qs) % stepCount; if (si >= 0 && si < stepCount) u[h.pad][si] = true; });
        return u;
      });
      setStepVel(prev => {
        const u = prev.map(r => [...r]);
        recHits.forEach(h => { const si = Math.round(Math.round(h.time / (60.0 / bpm / 4) / (qm[quantVal] || 1)) * (qm[quantVal] || 1)) % stepCount; if (si >= 0 && si < stepCount) u[h.pad][si] = h.velocity; });
        return u;
      });
    }
  }, [recHits, bpm, quantVal, stepCount]);

  const handleLiveHit = useCallback((pi, vel = 0.8) => {
    if (!liveRef.current || !ctxRef.current) return;
    setRecHits(p => [...p, { pad: pi, time: ctxRef.current.currentTime - recStartT.current, velocity: vel }]);
  }, []);

  // =========================================================================
  // WAVEFORM CHOP (Phase 2)
  // =========================================================================

  const openChop = useCallback((pi) => { if (!pads[pi]?.buffer) return; setChopIdx(pi); setChopPts([]); setShowChop(true); }, [pads]);

  const drawWave = useCallback(() => {
    const cv = chopCanvas.current; if (!cv || chopIdx === null) return;
    const pad = pads[chopIdx]; if (!pad?.buffer) return;
    const ctx = cv.getContext('2d'), w = cv.width, h = cv.height;
    const data = pad.buffer.getChannelData(0), step = Math.ceil(data.length / w);
    ctx.clearRect(0, 0, w, h); ctx.fillStyle = '#0a1628'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#00ffc8'; ctx.lineWidth = 1; ctx.beginPath();
    for (let i = 0; i < w; i++) {
      const s = i * step; let mn = 1, mx = -1;
      for (let j = 0; j < step; j++) { const v = data[s + j] || 0; if (v < mn) mn = v; if (v > mx) mx = v; }
      ctx.moveTo(i, ((1 + mn) / 2) * h); ctx.lineTo(i, ((1 + mx) / 2) * h);
    }
    ctx.stroke();
    ctx.strokeStyle = '#ff6600'; ctx.lineWidth = 2;
    chopPts.forEach(pt => { const x = (pt / pad.buffer.duration) * w; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); });
    const ts = ((pad.trimStart || 0) / pad.buffer.duration) * w;
    const te = ((pad.trimEnd || pad.buffer.duration) / pad.buffer.duration) * w;
    ctx.fillStyle = 'rgba(0,255,200,0.05)'; ctx.fillRect(ts, 0, te - ts, h);
  }, [chopIdx, pads, chopPts]);

  useEffect(() => { if (showChop) drawWave(); }, [showChop, drawWave, chopPts]);

  const chopCanvasClick = useCallback((e) => {
    const cv = chopCanvas.current; if (!cv || chopIdx === null) return;
    const pad = pads[chopIdx]; if (!pad?.buffer) return;
    const r = cv.getBoundingClientRect();
    const t = ((e.clientX - r.left) / cv.width) * pad.buffer.duration;
    setChopPts(p => [...p, t].sort((a, b) => a - b));
  }, [chopIdx, pads]);

  const autoChop = useCallback(() => {
    if (chopIdx === null) return; const pad = pads[chopIdx]; if (!pad?.buffer) return;
    const data = pad.buffer.getChannelData(0), sr = pad.buffer.sampleRate;
    const ws = Math.floor(sr * 0.01); const pts = [];
    let prevE = 0;
    for (let i = 0; i < data.length; i += ws) {
      let e = 0; for (let j = i; j < Math.min(i + ws, data.length); j++) e += data[j] * data[j]; e /= ws;
      if (e > chopSens * 0.1 && e > prevE * 3 && i > 0) {
        const t = i / sr; if (pts.length === 0 || t - pts[pts.length - 1] > 0.05) pts.push(t);
      }
      prevE = e;
    }
    setChopPts(pts);
  }, [chopIdx, pads, chopSens]);

  const distributeToPads = useCallback(() => {
    if (chopIdx === null || chopPts.length === 0) return;
    const pad = pads[chopIdx]; if (!pad?.buffer) return;
    const all = [0, ...chopPts, pad.buffer.duration];
    all.forEach((st, i) => {
      if (i >= all.length - 1 || i >= 16) return;
      setPads(p => { const u = [...p]; u[i] = { ...u[i], buffer: pad.buffer, name: `Chop ${i + 1}`, trimStart: st, trimEnd: all[i + 1] }; return u; });
    });
    setShowChop(false);
  }, [chopIdx, chopPts, pads]);

  // =========================================================================
  // PATTERN MANAGEMENT (Phase 2)
  // =========================================================================

  const addPattern = useCallback(() => {
    setPatterns(p => [...p, mkPattern(`Pattern ${p.length + 1}`, stepCount)]);
  }, [stepCount]);
  const dupPattern = useCallback((i) => {
    setPatterns(p => { const s = p[i]; return [...p, { ...s, name: `${s.name} (copy)`, steps: s.steps.map(r => [...r]), velocities: s.velocities.map(r => [...r]) }]; });
  }, []);
  const delPattern = useCallback((i) => {
    if (patterns.length <= 1) return;
    setPatterns(p => p.filter((_, j) => j !== i));
    if (curPatIdx >= patterns.length - 1) setCurPatIdx(Math.max(0, patterns.length - 2));
  }, [patterns.length, curPatIdx]);
  const renamePattern = useCallback((i, n) => { setPatterns(p => { const u = [...p]; u[i] = { ...u[i], name: n }; return u; }); }, []);

  // =========================================================================
  // SAVE KIT (Phase 3)
  // =========================================================================

  const saveKit = useCallback((name) => {
    const kit = { name, date: new Date().toISOString(), pads: pads.map(p => ({ name: p.name, volume: p.volume, pitch: p.pitch, pan: p.pan, playMode: p.playMode, reverse: p.reverse, trimStart: p.trimStart, trimEnd: p.trimEnd, filterOn: p.filterOn, filterType: p.filterType, filterFreq: p.filterFreq, filterQ: p.filterQ, reverbOn: p.reverbOn, reverbMix: p.reverbMix, delayOn: p.delayOn, delayTime: p.delayTime, delayFeedback: p.delayFeedback, delayMix: p.delayMix, distortionOn: p.distortionOn, distortionAmt: p.distortionAmt, attack: p.attack, release: p.release, hasBuffer: !!p.buffer })) };
    const u = [...savedKits, kit]; setSavedKits(u);
    try { localStorage.setItem('spx_kits', JSON.stringify(u)); } catch (e) {}
  }, [pads, savedKits]);

  // =========================================================================
  // TAP TEMPO
  // =========================================================================

  const tapTempo = useCallback(() => {
    const now = performance.now(), ts = tapTimes.current;
    if (ts.length > 0 && now - ts[ts.length - 1] > 2000) tapTimes.current = [];
    ts.push(now); if (ts.length > 8) ts.shift();
    if (ts.length >= 2) {
      let t = 0; for (let i = 1; i < ts.length; i++) t += ts[i] - ts[i - 1];
      const nb = Math.round(60000 / (t / (ts.length - 1)));
      if (nb >= 40 && nb <= 300) setBpm(nb);
    }
  }, []);

  // =========================================================================
  // KEYBOARD
  // =========================================================================

  useEffect(() => {
    const kd = (e) => {
      if (['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)) return;
      const k = e.key.toLowerCase();
      if (KEY_TO_PAD.hasOwnProperty(k)) { e.preventDefault(); initCtx(); playPad(KEY_TO_PAD[k]); if (liveRef.current) handleLiveHit(KEY_TO_PAD[k]); if (midiLearn) { setMidiLearnPad(KEY_TO_PAD[k]); } }
      if (k === ' ') { e.preventDefault(); togglePlay(); }
    };
    const ku = (e) => { const k = e.key.toLowerCase(); if (KEY_TO_PAD.hasOwnProperty(k) && padsRef.current[KEY_TO_PAD[k]]?.playMode === 'hold') stopPad(KEY_TO_PAD[k]); };
    window.addEventListener('keydown', kd); window.addEventListener('keyup', ku);
    return () => { window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku); };
  }, [playPad, stopPad, togglePlay, handleLiveHit, initCtx, midiLearn]);

  // =========================================================================
  // DRAG & DROP / FILE SELECT
  // =========================================================================

  const onDragOver = useCallback((e, pi) => { e.preventDefault(); e.stopPropagation(); setDragPad(pi); }, []);
  const onDragLeave = useCallback((e) => { e.preventDefault(); setDragPad(null); }, []);
  const onDrop = useCallback((e, pi) => {
    e.preventDefault(); e.stopPropagation(); setDragPad(null);
    const f = e.dataTransfer.files;
    if (f.length > 0 && (f[0].type.startsWith('audio/') || /\.(wav|mp3|ogg|flac|aiff|m4a)$/i.test(f[0].name))) loadSample(pi, f[0]);
  }, [loadSample]);
  const fileSelect = useCallback((pi) => {
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'audio/*,.wav,.mp3,.ogg,.flac,.aiff,.m4a';
    inp.onchange = (e) => { if (e.target.files[0]) loadSample(pi, e.target.files[0]); }; inp.click();
  }, [loadSample]);

  // =========================================================================
  // STEP TOGGLE
  // =========================================================================

  const toggleStep = useCallback((pi, si, e) => {
    setSteps(p => { const u = p.map(r => [...r]); u[pi][si] = !u[pi][si]; return u; });
    if (e) {
      let v = 0.8; if (e.shiftKey) v = 0.4; if (e.ctrlKey || e.metaKey) v = 1.0;
      setStepVel(p => { const u = p.map(r => [...r]); u[pi][si] = v; return u; });
    }
  }, []);
  const clearPat = useCallback(() => {
    setSteps(Array.from({ length: 16 }, () => Array(stepCount).fill(false)));
    setStepVel(Array.from({ length: 16 }, () => Array(stepCount).fill(0.8)));
    setCurStep(-1);
  }, [stepCount]);
  const updatePad = useCallback((pi, u) => { setPads(p => { const a = [...p]; a[pi] = { ...a[pi], ...u }; return a; }); }, []);
  const clearPad = useCallback((pi) => {
    setPads(p => { const a = [...p]; a[pi] = { ...DEFAULT_PAD, id: pi, color: PAD_COLORS[pi] }; return a; });
    setSteps(p => { const u = p.map(r => [...r]); u[pi] = Array(stepCount).fill(false); return u; });
  }, [stepCount]);

  // =========================================================================
  // EXPORT — WAV / MP3 / OGG / WEBM / Stems / MIDI
  // =========================================================================

  // ── WAV encoder (lossless, direct from AudioBuffer) ──
  const toWav = useCallback((buf) => {
    const nc = buf.numberOfChannels, sr = buf.sampleRate, ba = nc * 2, dl = buf.length * ba;
    const ab = new ArrayBuffer(44 + dl), v = new DataView(ab);
    const ws = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
    ws(0,'RIFF'); v.setUint32(4,36+dl,true); ws(8,'WAVE'); ws(12,'fmt '); v.setUint32(16,16,true);
    v.setUint16(20,1,true); v.setUint16(22,nc,true); v.setUint32(24,sr,true);
    v.setUint32(28,sr*ba,true); v.setUint16(32,ba,true); v.setUint16(34,16,true);
    ws(36,'data'); v.setUint32(40,dl,true);
    const chs = []; for (let c = 0; c < nc; c++) chs.push(buf.getChannelData(c));
    let o = 44;
    for (let i = 0; i < buf.length; i++) for (let c = 0; c < nc; c++) { let s = Math.max(-1,Math.min(1,chs[c][i])); v.setInt16(o, s < 0 ? s*0x8000 : s*0x7FFF, true); o += 2; }
    return new Blob([ab], { type: 'audio/wav' });
  }, []);

  // ── MP3 encoder (loads lamejs dynamically) ──
  const loadLame = useCallback(() => {
    return new Promise((resolve, reject) => {
      if (lameRef.current) { resolve(lameRef.current); return; }
      if (window.lamejs) { lameRef.current = window.lamejs; resolve(window.lamejs); return; }
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/lamejs@1.2.1/lame.min.js';
      s.onload = () => { lameRef.current = window.lamejs; resolve(window.lamejs); };
      s.onerror = () => reject(new Error('Failed to load MP3 encoder. Check internet connection.'));
      document.head.appendChild(s);
    });
  }, []);

  const toMp3 = useCallback(async (buf, kbps = 192) => {
    const lamejs = await loadLame();
    const nc = buf.numberOfChannels, sr = buf.sampleRate, len = buf.length;
    const mp3enc = new lamejs.Mp3Encoder(nc, sr, kbps);
    const blockSize = 1152;
    const mp3Buf = [];
    const left = new Int16Array(len);
    const right = nc > 1 ? new Int16Array(len) : null;
    const ld = buf.getChannelData(0);
    for (let i = 0; i < len; i++) left[i] = Math.max(-32768, Math.min(32767, Math.round(ld[i] * 32767)));
    if (right) {
      const rd = buf.getChannelData(1);
      for (let i = 0; i < len; i++) right[i] = Math.max(-32768, Math.min(32767, Math.round(rd[i] * 32767)));
    }
    for (let i = 0; i < len; i += blockSize) {
      const lc = left.subarray(i, i + blockSize);
      const rc = right ? right.subarray(i, i + blockSize) : lc;
      const chunk = nc > 1 ? mp3enc.encodeBuffer(lc, rc) : mp3enc.encodeBuffer(lc);
      if (chunk.length > 0) mp3Buf.push(chunk);
    }
    const end = mp3enc.flush();
    if (end.length > 0) mp3Buf.push(end);
    return new Blob(mp3Buf, { type: 'audio/mp3' });
  }, [loadLame]);

  // ── OGG / WEBM encoder (MediaRecorder re-encode from AudioBuffer) ──
  const toMediaRecorderFormat = useCallback(async (buf, mimeType) => {
    return new Promise((resolve, reject) => {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const dest = ctx.createMediaStreamDestination();
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(dest);
      const supported = MediaRecorder.isTypeSupported(mimeType);
      if (!supported) { reject(new Error(`${mimeType} not supported in this browser`)); ctx.close(); return; }
      const rec = new MediaRecorder(dest.stream, { mimeType });
      const chunks = [];
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      rec.onstop = () => {
        ctx.close();
        resolve(new Blob(chunks, { type: mimeType }));
      };
      rec.onerror = (e) => { ctx.close(); reject(e.error || new Error('MediaRecorder error')); };
      rec.start();
      src.onended = () => { setTimeout(() => { if (rec.state !== 'inactive') rec.stop(); }, 100); };
      src.start(0);
    });
  }, []);

  const toOgg = useCallback(async (buf) => {
    const types = ['audio/ogg;codecs=opus', 'audio/ogg', 'audio/webm;codecs=opus'];
    for (const t of types) { if (MediaRecorder.isTypeSupported(t)) return toMediaRecorderFormat(buf, t); }
    throw new Error('OGG encoding not supported in this browser. Use WAV or MP3.');
  }, [toMediaRecorderFormat]);

  const toWebm = useCallback(async (buf) => {
    const types = ['audio/webm;codecs=opus', 'audio/webm'];
    for (const t of types) { if (MediaRecorder.isTypeSupported(t)) return toMediaRecorderFormat(buf, t); }
    throw new Error('WebM encoding not supported in this browser. Use WAV or MP3.');
  }, [toMediaRecorderFormat]);

  // ── Universal format converter ──
  const FORMAT_INFO = { wav: { ext: 'wav', label: 'WAV (Lossless)' }, mp3: { ext: 'mp3', label: 'MP3' }, ogg: { ext: 'ogg', label: 'OGG Opus' }, webm: { ext: 'webm', label: 'WebM Opus' } };

  const convertToFormat = useCallback(async (audioBuffer, format, quality) => {
    switch (format) {
      case 'mp3': return toMp3(audioBuffer, quality || exportQuality);
      case 'ogg': return toOgg(audioBuffer);
      case 'webm': return toWebm(audioBuffer);
      case 'wav': default: return toWav(audioBuffer);
    }
  }, [toWav, toMp3, toOgg, toWebm, exportQuality]);

  // ── File download helper ──
  const downloadBlob = useCallback((blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  // ── Render single pattern ──
  const renderPat = useCallback(async (patSteps, patVel, patSC) => {
    const sd = 60.0 / bpm / 4, dur = patSC * sd, sr = 44100;
    const oc = new OfflineAudioContext(2, Math.ceil(dur * sr), sr);
    const mg = oc.createGain(); mg.gain.value = masterVol; mg.connect(oc.destination);
    for (let si = 0; si < patSC; si++) {
      const st = si * sd; let so = 0; if (si % 2 === 1 && swing > 0) so = sd * (swing / 100) * 0.5;
      for (let pi = 0; pi < 16; pi++) {
        if (patSteps[pi]?.[si] && pads[pi].buffer) {
          const pad = pads[pi], vel = patVel[pi]?.[si] ?? 0.8;
          const s = oc.createBufferSource(), g = oc.createGain(), pn = oc.createStereoPanner();
          s.buffer = pad.buffer; s.playbackRate.value = Math.pow(2, pad.pitch / 12);
          g.gain.value = pad.volume * vel; pn.pan.value = pad.pan;
          s.connect(g); g.connect(pn); pn.connect(mg);
          const off = pad.trimStart || 0; s.start(st + so, off, (pad.trimEnd || pad.buffer.duration) - off);
        }
      }
    }
    return await oc.startRendering();
  }, [bpm, swing, pads, masterVol]);

  // ── Render full song (chain all patterns in songSeq) ──
  const renderSong = useCallback(async () => {
    const bufs = [];
    for (const b of songSeq) {
      const p = patterns[b.patternIndex];
      if (p) bufs.push(await renderPat(p.steps, p.velocities, p.stepCount));
    }
    if (bufs.length === 0) return null;
    const totalLen = bufs.reduce((s, b) => s + b.length, 0);
    const oc = new OfflineAudioContext(2, totalLen, 44100);
    let off = 0;
    for (const b of bufs) {
      const s = oc.createBufferSource(); s.buffer = b; s.connect(oc.destination); s.start(off / 44100); off += b.length;
    }
    return await oc.startRendering();
  }, [songSeq, patterns, renderPat]);

  // ── Render single pad stem (works for pattern or full song) ──
  const renderStemForPad = useCallback(async (padIndex, useSongMode) => {
    const pad = pads[padIndex];
    if (!pad.buffer) return null;

    if (useSongMode && songSeq.length > 0) {
      // Render pad across all song patterns
      const segBufs = [];
      for (const b of songSeq) {
        const p = patterns[b.patternIndex];
        if (!p) continue;
        const sc = p.stepCount, sd = 60.0 / bpm / 4, dur = sc * sd;
        const oc = new OfflineAudioContext(2, Math.ceil(dur * 44100), 44100);
        const g = oc.createGain(); g.gain.value = pad.volume; g.connect(oc.destination);
        for (let si = 0; si < sc; si++) {
          if (!p.steps[padIndex]?.[si]) continue;
          let so = 0; if (si % 2 === 1 && swing > 0) so = sd * (swing / 100) * 0.5;
          const s = oc.createBufferSource(), sg = oc.createGain();
          s.buffer = pad.buffer; s.playbackRate.value = Math.pow(2, pad.pitch / 12);
          sg.gain.value = p.velocities[padIndex]?.[si] ?? 0.8; s.connect(sg); sg.connect(g);
          const off = pad.trimStart || 0; s.start(si * sd + so, off, (pad.trimEnd || pad.buffer.duration) - off);
        }
        segBufs.push(await oc.startRendering());
      }
      if (segBufs.length === 0) return null;
      const totalLen = segBufs.reduce((s, b) => s + b.length, 0);
      const oc = new OfflineAudioContext(2, totalLen, 44100);
      let off = 0;
      for (const b of segBufs) { const s = oc.createBufferSource(); s.buffer = b; s.connect(oc.destination); s.start(off / 44100); off += b.length; }
      return await oc.startRendering();
    } else {
      // Render pad for current pattern only
      const sd = 60.0 / bpm / 4, dur = stepCount * sd;
      const oc = new OfflineAudioContext(2, Math.ceil(dur * 44100), 44100);
      const g = oc.createGain(); g.gain.value = pad.volume; g.connect(oc.destination);
      for (let si = 0; si < stepCount; si++) {
        if (!steps[padIndex]?.[si]) continue;
        let so = 0; if (si % 2 === 1 && swing > 0) so = sd * (swing / 100) * 0.5;
        const s = oc.createBufferSource(), sg = oc.createGain();
        s.buffer = pad.buffer; s.playbackRate.value = Math.pow(2, pad.pitch / 12);
        sg.gain.value = stepVel[padIndex]?.[si] ?? 0.8; s.connect(sg); sg.connect(g);
        const off = pad.trimStart || 0; s.start(si * sd + so, off, (pad.trimEnd || pad.buffer.duration) - off);
      }
      return await oc.startRendering();
    }
  }, [pads, steps, stepVel, stepCount, bpm, swing, songSeq, patterns]);

  // ── Export full beat (desktop download + optional DAW send) ──
  const exportBeat = useCallback(async (fmt, sendToDaw = false) => {
    const format = fmt || exportFormat;
    setExporting(true);
    setExportProgress('Rendering audio...');
    try {
      let rendered;
      if (songMode && songSeq.length > 0) {
        setExportProgress('Rendering song arrangement...');
        rendered = await renderSong();
        if (!rendered) throw new Error('No patterns in song sequence');
      } else {
        rendered = await renderPat(steps, stepVel, stepCount);
      }

      setExportProgress(`Encoding ${format.toUpperCase()}...`);
      const blob = await convertToFormat(rendered, format, exportQuality);
      const ext = FORMAT_INFO[format]?.ext || format;
      const dateStr = new Date().toISOString().slice(0, 10);
      const songLabel = songMode && songSeq.length > 0 ? 'song' : 'beat';
      downloadBlob(blob, `${songLabel}_${bpm}bpm_${dateStr}.${ext}`);

      // Also send WAV to DAW if requested (always WAV for DAW quality)
      if (sendToDaw && onExport) {
        const wavBlob = format === 'wav' ? blob : toWav(rendered);
        onExport(rendered, wavBlob);
      }

      setExportProgress('');
      setExportStatus(`✓ Exported ${format.toUpperCase()}`);
    } catch (e) {
      console.error('Export fail:', e);
      setExportProgress('');
      setExportStatus(`✗ Export failed: ${e.message}`);
    } finally { setExporting(false); }
  }, [songMode, songSeq, patterns, steps, stepVel, stepCount, bpm, exportFormat, exportQuality, renderPat, renderSong, convertToFormat, downloadBlob, toWav, onExport]);

  // ── Export multi-track stems (each pad as separate file) ──
  const exportStems = useCallback(async (fmt) => {
    const format = fmt || exportFormat;
    const useSong = songMode && songSeq.length > 0;
    setExporting(true);
    let exported = 0;
    try {
      const activePads = [];
      for (let pi = 0; pi < 16; pi++) {
        if (!pads[pi].buffer) continue;
        // Check if pad has any active steps in current pattern or song patterns
        if (useSong) {
          const hasSteps = songSeq.some(b => { const p = patterns[b.patternIndex]; return p?.steps[pi]?.some(s => s); });
          if (hasSteps) activePads.push(pi);
        } else {
          if (steps[pi]?.some(s => s)) activePads.push(pi);
        }
      }
      if (activePads.length === 0) { setExportStatus('⚠ No active pads to export'); setExporting(false); return; }

      for (const pi of activePads) {
        setExportProgress(`Rendering stem ${++exported}/${activePads.length}: ${pads[pi].name}...`);
        const stemBuf = await renderStemForPad(pi, useSong);
        if (!stemBuf) continue;

        setExportProgress(`Encoding ${pads[pi].name} → ${format.toUpperCase()}...`);
        const blob = await convertToFormat(stemBuf, format, exportQuality);
        const ext = FORMAT_INFO[format]?.ext || format;
        const safeName = pads[pi].name.replace(/[^a-zA-Z0-9_-]/g, '_');
        downloadBlob(blob, `stem_${safeName}_${bpm}bpm.${ext}`);
        await new Promise(r => setTimeout(r, 350)); // Browser download spacing
      }
      setExportProgress('');
      setExportStatus(`✓ ${exported} stems exported as ${format.toUpperCase()}`);
    } catch (e) {
      console.error('Stem export fail:', e);
      setExportProgress('');
      setExportStatus(`✗ Stem export failed: ${e.message}`);
    } finally { setExporting(false); }
  }, [pads, steps, stepVel, stepCount, bpm, swing, songMode, songSeq, patterns, exportFormat, exportQuality, convertToFormat, downloadBlob, renderStemForPad]);

  // ── Export bounce (full mix + all stems together) ──
  const exportBounceAll = useCallback(async (fmt) => {
    const format = fmt || exportFormat;
    setExporting(true);
    try {
      // 1) Export the full mix
      setExportProgress('Bouncing full mix...');
      await exportBeat(format, false);
      await new Promise(r => setTimeout(r, 500));
      // 2) Export all stems
      await exportStems(format);
      setExportStatus(`✓ Bounce complete (mix + stems) as ${format.toUpperCase()}`);
    } catch (e) {
      setExportProgress('');
      setExportStatus(`✗ Bounce failed: ${e.message}`);
    } finally { setExporting(false); }
  }, [exportFormat, exportBeat, exportStems]);

  // ── Quick export to DAW (always WAV for quality) ──
  const exportToDaw = useCallback(async () => {
    if (!onExport) { setExportStatus('⚠ DAW export only available inside Recording Studio'); return; }
    setExporting(true);
    setExportProgress('Rendering for DAW...');
    try {
      let rendered;
      if (songMode && songSeq.length > 0) { rendered = await renderSong(); }
      else { rendered = await renderPat(steps, stepVel, stepCount); }
      if (!rendered) { setExportStatus('⚠ Nothing to export'); return; }
      const blob = toWav(rendered);
      onExport(rendered, blob);
      setExportProgress('');
      setExportStatus('✓ Sent to DAW track');
    } catch (e) { setExportProgress(''); setExportStatus(`✗ ${e.message}`); }
    finally { setExporting(false); }
  }, [songMode, songSeq, steps, stepVel, stepCount, renderPat, renderSong, toWav, onExport]);

  // ── MIDI export ──
  const exportMIDI = useCallback(() => {
    const useSong = songMode && songSeq.length > 0;
    const tpb = 480, tps = tpb / 4;
    const hdr = [0x4D,0x54,0x68,0x64,0,0,0,6,0,0,0,1,(tpb>>8)&0xFF,tpb&0xFF];
    const evts = [];
    const usPerBeat = Math.round(60000000 / bpm);
    evts.push({ d: 0, data: [0xFF,0x51,0x03,(usPerBeat>>16)&0xFF,(usPerBeat>>8)&0xFF,usPerBeat&0xFF] });

    if (useSong) {
      let tickOff = 0;
      for (const b of songSeq) {
        const p = patterns[b.patternIndex];
        if (!p) continue;
        for (let si = 0; si < p.stepCount; si++) for (let pi = 0; pi < 16; pi++) {
          if (!p.steps[pi]?.[si]) continue;
          const v = Math.round((p.velocities[pi]?.[si] ?? 0.8) * 127), n = 36 + pi, tick = tickOff + si * tps;
          evts.push({ d: tick, data: [0x90, n, v] }); evts.push({ d: tick + tps - 1, data: [0x80, n, 0] });
        }
        tickOff += p.stepCount * tps;
      }
    } else {
      for (let si = 0; si < stepCount; si++) for (let pi = 0; pi < 16; pi++) {
        if (!steps[pi]?.[si]) continue;
        const v = Math.round((stepVel[pi]?.[si] ?? 0.8) * 127), n = 36 + pi, tick = si * tps;
        evts.push({ d: tick, data: [0x90, n, v] }); evts.push({ d: tick + tps - 1, data: [0x80, n, 0] });
      }
    }

    evts.sort((a, b) => a.d - b.d);
    const tb = []; let lt = 0;
    evts.forEach(e => {
      let rd = e.d - lt; lt = e.d;
      const db = []; db.push(rd & 0x7F); while (rd > 0x7F) { rd >>= 7; db.push((rd & 0x7F) | 0x80); }
      db.reverse().forEach(b => tb.push(b)); e.data.forEach(b => tb.push(b));
    });
    tb.push(0x00, 0xFF, 0x2F, 0x00);
    const th = [0x4D,0x54,0x72,0x6B,(tb.length>>24)&0xFF,(tb.length>>16)&0xFF,(tb.length>>8)&0xFF,tb.length&0xFF];
    const blob = new Blob([new Uint8Array([...hdr,...th,...tb])], { type: 'audio/midi' });
    const label = useSong ? 'song' : 'beat';
    downloadBlob(blob, `${label}_${bpm}bpm.mid`);
    setExportStatus('✓ MIDI exported');
  }, [steps, stepVel, stepCount, bpm, songMode, songSeq, patterns, downloadBlob]);

  // ── Auto-clear export status ──
  useEffect(() => {
    if (!exportStatus) return;
    const t = setTimeout(() => setExportStatus(''), 4000);
    return () => clearTimeout(t);
  }, [exportStatus]);

  // =========================================================================
  // CLEANUP
  // =========================================================================
  useEffect(() => { return () => { stopSeq(); if (ctxRef.current) ctxRef.current.close(); if (mediaStream.current) mediaStream.current.getTracks().forEach(t => t.stop()); }; }, [stopSeq]);

  // =========================================================================
  // RENDER
  // =========================================================================
  return (
    <div className={`sampler-beat-maker ${isEmbedded ? 'embedded' : ''}`}>

      {/* TOP BAR */}
      <div className="sampler-topbar">
        <div className="sampler-topbar-left">
          <h2 className="sampler-title"><span className="sampler-title-icon">🥁</span>Beat Maker</h2>
          <div className="pattern-selector">
            {patterns.map((p, i) => (
              <button key={i} className={`pattern-btn ${i === curPatIdx ? 'active' : ''}`} onClick={() => setCurPatIdx(i)}
                onDoubleClick={() => { const n = prompt('Rename:', p.name); if (n) renamePattern(i, n); }}
                onContextMenu={(e) => { e.preventDefault(); if (confirm(`Delete "${p.name}"?`)) delPattern(i); }}>
                {p.name.length > 8 ? p.name.slice(0, 8) + '…' : p.name}
              </button>
            ))}
            <button className="pattern-btn add" onClick={addPattern}>+</button>
            <button className="pattern-btn dup" onClick={() => dupPattern(curPatIdx)} title="Duplicate">⧉</button>
          </div>
        </div>

        <div className="sampler-transport">
          <button className={`transport-btn ${isPlaying ? 'active stop' : 'play'}`} onClick={togglePlay} title="Space">{isPlaying ? '⏹' : '▶'}</button>
          <button className={`transport-btn rec ${liveRec ? 'recording' : ''}`} onClick={() => liveRec ? stopLiveRec() : startLiveRec()} title="Live Record">⏺</button>
          <button className={`transport-btn ${overdub ? 'active' : ''}`} onClick={() => setOverdub(p => !p)} title="Overdub">OVR</button>

          <div className="bpm-control">
            <button className="bpm-nudge" onClick={() => setBpm(p => Math.max(40, p - 1))}>−</button>
            <input type="number" className="bpm-input" value={bpm} min={40} max={300} onChange={(e) => setBpm(Math.min(300, Math.max(40, parseInt(e.target.value) || 140)))} />
            <span className="bpm-label">BPM</span>
            <button className="bpm-nudge" onClick={() => setBpm(p => Math.min(300, p + 1))}>+</button>
          </div>

          <button className="transport-btn tap" onClick={tapTempo}>TAP</button>
          <button className={`transport-btn met ${metOn ? 'active' : ''}`} onClick={() => setMetOn(p => !p)}>🔔</button>
          <button className={`transport-btn loop ${looping ? 'active' : ''}`} onClick={() => setLooping(p => !p)}>🔁</button>

          <div className="swing-control"><label>Swing</label><input type="range" min={0} max={100} value={swing} onChange={(e) => setSwing(+e.target.value)} /><span className="swing-value">{swing}%</span></div>
          <div className="quantize-control"><label>Q:</label>
            <select value={quantVal} onChange={(e) => setQuantVal(e.target.value)}><option value="1/4">1/4</option><option value="1/8">1/8</option><option value="1/16">1/16</option><option value="1/32">1/32</option></select>
          </div>
          <div className="master-vol-control"><span className="vol-icon">🔊</span><input type="range" min={0} max={100} value={Math.round(masterVol * 100)} onChange={(e) => setMasterVol(+e.target.value / 100)} /></div>
        </div>

        <div className="sampler-topbar-right">
          <button className={`transport-btn ${showDevices ? 'active' : ''}`} onClick={() => setShowDevices(p => !p)} title="Devices">🎛️</button>
          <button className={`transport-btn ${showMixer ? 'active' : ''}`} onClick={() => setShowMixer(p => !p)} title="Mixer">🎚️</button>
          <button className={`transport-btn ${showLib ? 'active' : ''}`} onClick={() => setShowLib(p => !p)} title="Library">📚</button>
          <button className={`transport-btn ${songMode ? 'active' : ''}`} onClick={() => setSongMode(p => !p)} title="Song Mode">🎼</button>

          <div className="view-toggle">
            <button className={view === 'pads' ? 'active' : ''} onClick={() => setView('pads')}>Pads</button>
            <button className={view === 'sequencer' ? 'active' : ''} onClick={() => setView('sequencer')}>Seq</button>
            <button className={view === 'split' ? 'active' : ''} onClick={() => setView('split')}>Split</button>
          </div>

          <div className="export-dropdown">
            <button className="export-btn" onClick={() => setShowExportPanel(!showExportPanel)} disabled={exporting}>{exporting ? '⏳...' : '⬇ Export'}</button>
            <div className="export-menu">
              <button onClick={() => exportBeat('wav')}>WAV</button>
              <button onClick={() => exportBeat('mp3')}>MP3</button>
              <button onClick={() => exportBeat('ogg')}>OGG</button>
              <button onClick={() => exportStems()}>Stems</button>
              <button onClick={() => exportMIDI()}>MIDI</button>
              {onExport && <button onClick={exportToDaw}>→ DAW</button>}
              <button onClick={() => setShowExportPanel(true)}>More...</button>
            </div>
          </div>
          {(exportStatus || exportProgress) && (
            <span className={`export-status-badge ${exportStatus.startsWith('✗') ? 'error' : exportStatus.startsWith('✓') ? 'success' : 'info'}`}>
              {exportProgress || exportStatus}
            </span>
          )}
          {onClose && <button className="close-btn" onClick={onClose}>✕</button>}
        </div>
      </div>

      {/* DEVICE PANEL */}
      {showDevices && (
        <div className="device-settings-panel">
          <div className="device-select"><label>🔊 Output</label>
            <select value={selOut} onChange={(e) => setSelOut(e.target.value)}><option value="default">System Default</option>{devices.outputs.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}</select></div>
          <div className="device-select"><label>🎙️ Input</label>
            <select value={selIn} onChange={(e) => setSelIn(e.target.value)}><option value="default">System Default</option>{devices.inputs.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}</select></div>
          {midiInputs.length > 0 && (
            <div className="device-select"><label>🎹 MIDI</label>
              <select value={selMidi?.id || ''} onChange={(e) => setSelMidi(midiInputs.find(m => m.id === e.target.value) || null)}>
                <option value="">None</option>{midiInputs.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
              <button className={`midi-learn-btn ${midiLearn ? 'active' : ''}`} onClick={() => { setMidiLearn(p => !p); setMidiLearnPad(null); }}>{midiLearn ? '🔴 Learning...' : 'MIDI Learn'}</button>
            </div>
          )}
          {devices.outputs.length > 1 && <div className="device-hint">✅ External audio interface detected</div>}
        </div>
      )}

      {/* LIVE REC BAR */}
      {liveRec && <div className="live-record-bar"><span className="rec-dot">⏺</span> RECORDING — Play pads to record <span className="rec-hits">{recHits.length} hits</span><button onClick={stopLiveRec}>⏹ Stop & Quantize</button></div>}

      {/* MIC COUNTDOWN */}
      {micCount > 0 && <div className="mic-countdown-overlay"><div className="countdown-number">{micCount}</div></div>}
      {micRec && micCount === 0 && <div className="mic-record-bar"><span className="rec-dot pulse">🎙️</span> Recording to Pad {(micPad || 0) + 1}...<button onClick={stopMicRec}>⏹ Stop</button></div>}

      {/* MAIN CONTENT */}
      <div className={`sampler-content view-${view}`}>

        {/* PAD GRID */}
        {(view === 'pads' || view === 'split') && (
          <div className="pad-grid-section">
            <div className="pad-grid">
              {pads.map((pad, i) => (
                <div key={i}
                  className={`pad ${activePads.has(i) ? 'active' : ''} ${selectedPad === i ? 'selected' : ''} ${dragPad === i ? 'drag-over' : ''} ${pad.buffer ? 'loaded' : 'empty'} ${pad.muted ? 'muted' : ''} ${midiLearn ? 'midi-learn' : ''}`}
                  style={{ '--pad-color': pad.color, '--pad-glow': activePads.has(i) ? pad.color : 'transparent' }}
                  onMouseDown={(e) => { e.preventDefault(); initCtx(); playPad(i); setSelectedPad(i); setShowPadSet(true); if (liveRef.current) handleLiveHit(i); if (midiLearn) setMidiLearnPad(i); }}
                  onMouseUp={() => { if (pads[i].playMode === 'hold') stopPad(i); }}
                  onTouchStart={(e) => { e.preventDefault(); initCtx(); playPad(i); setSelectedPad(i); if (liveRef.current) handleLiveHit(i); }}
                  onTouchEnd={(e) => { e.preventDefault(); if (pads[i].playMode === 'hold') stopPad(i); }}
                  onDragOver={(e) => onDragOver(e, i)} onDragLeave={onDragLeave} onDrop={(e) => onDrop(e, i)}
                  onDoubleClick={() => fileSelect(i)}>
                  <div className="pad-key">{PAD_KEY_LABELS[i]}</div>
                  <div className="pad-name">{pad.name}</div>
                  {!pad.buffer && <div className="pad-hint">Drop audio or double-click</div>}
                  {pad.muted && <div className="pad-mute-badge">M</div>}
                  {pad.filterOn && <div className="pad-fx-badge">FX</div>}
                  {midiLearn && <div className="pad-midi-badge">MIDI?</div>}
                  {Object.values(midiMap).includes(i) && <div className="pad-midi-note">{Object.entries(midiMap).find(([,v]) => v === i)?.[0]}</div>}
                </div>
              ))}
            </div>
            <div className="pad-quick-actions">
              <button onClick={clearPat}>🗑️ Clear</button>
              <button onClick={stopAll}>⏹ Stop All</button>
              <button onClick={() => selectedPad !== null && openChop(selectedPad)} disabled={selectedPad === null || !pads[selectedPad]?.buffer}>✂️ Chop</button>
              <button onClick={() => selectedPad !== null && startMicRec(selectedPad)} disabled={selectedPad === null || micRec}>🎙️ Sample</button>
              <button onClick={() => { const n = prompt('Kit name:'); if (n) saveKit(n); }}>💾 Save Kit</button>
              <div className="step-count-selector"><label>Steps:</label>
                {STEP_COUNTS.map(c => (
                  <button key={c} className={stepCount === c ? 'active' : ''} onClick={() => {
                    setStepCount(c);
                    setSteps(p => p.map(r => r.length < c ? [...r, ...Array(c - r.length).fill(false)] : r.slice(0, c)));
                    setStepVel(p => p.map(r => r.length < c ? [...r, ...Array(c - r.length).fill(0.8)] : r.slice(0, c)));
                  }}>{c}</button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STEP SEQUENCER */}
        {(view === 'sequencer' || view === 'split') && (
          <div className="sequencer-section">
            <div className="sequencer-grid">
              <div className="seq-header-row">
                <div className="seq-label-cell"></div>
                {Array.from({ length: stepCount }, (_, i) => (
                  <div key={i} className={`seq-header-cell ${curStep === i ? 'current' : ''} ${i % 4 === 0 ? 'downbeat' : ''}`}>{i + 1}</div>
                ))}
              </div>
              {pads.map((pad, pi) => (
                <div key={pi} className={`seq-row ${!pad.buffer ? 'empty-row' : ''}`}>
                  <div className={`seq-label-cell ${selectedPad === pi ? 'selected' : ''}`} onClick={() => { setSelectedPad(pi); setShowPadSet(true); }}>
                    <span className="seq-pad-color" style={{ background: pad.color }}></span>
                    <span className="seq-pad-name">{pad.name}</span>
                    <span className="seq-pad-key">{PAD_KEY_LABELS[pi]}</span>
                  </div>
                  {Array.from({ length: stepCount }, (_, si) => (
                    <div key={si}
                      className={`seq-cell ${steps[pi]?.[si] ? 'on' : ''} ${curStep === si ? 'current' : ''} ${si % 4 === 0 ? 'downbeat' : ''} ${si % 8 < 4 ? 'even-group' : 'odd-group'}`}
                      style={{ '--cell-color': pad.color, '--cell-opacity': steps[pi]?.[si] ? (stepVel[pi]?.[si] ?? 0.8) : 0 }}
                      onClick={(e) => toggleStep(pi, si, e)} />
                  ))}
                </div>
              ))}
            </div>
            <div className="sequencer-hint">Click = normal | Shift = soft | Ctrl = hard</div>
          </div>
        )}
      </div>

      {/* MIXER (Phase 2) */}
      {showMixer && (
        <div className="mixer-panel">
          <div className="mixer-header"><h3>🎚️ Mixer</h3><button onClick={() => setShowMixer(false)}>✕</button></div>
          <div className="mixer-channels">
            {pads.map((pad, i) => (
              <div key={i} className={`mixer-channel ${!pad.buffer ? 'empty' : ''}`}>
                <div className="mixer-meter"><div className="meter-fill" style={{ height: `${(padLvls[i] || 0) * 100}%` }}></div></div>
                <input type="range" className="mixer-fader" min={0} max={100} value={Math.round(pad.volume * 100)} onChange={(e) => updatePad(i, { volume: +e.target.value / 100 })} />
                <input type="range" className="mixer-pan" min={-100} max={100} value={Math.round(pad.pan * 100)} onChange={(e) => updatePad(i, { pan: +e.target.value / 100 })} />
                <div className="mixer-btns">
                  <button className={`m-btn ${pad.muted ? 'active' : ''}`} onClick={() => updatePad(i, { muted: !pad.muted })}>M</button>
                  <button className={`s-btn ${pad.soloed ? 'active' : ''}`} onClick={() => updatePad(i, { soloed: !pad.soloed })}>S</button>
                </div>
                <div className="mixer-label" style={{ color: pad.color }}>{PAD_KEY_LABELS[i]}</div>
              </div>
            ))}
            <div className="mixer-channel master">
              <div className="mixer-meter"><div className="meter-fill master" style={{ height: `${masterVol * 100}%` }}></div></div>
              <input type="range" className="mixer-fader" min={0} max={100} value={Math.round(masterVol * 100)} onChange={(e) => setMasterVol(+e.target.value / 100)} />
              <div className="mixer-label master-label">MST</div>
            </div>
          </div>
        </div>
      )}

      {/* SOUND LIBRARY (Phase 2) */}
      {showLib && (
        <div className="library-panel">
          <div className="library-header"><h3>📚 Sound Library</h3><button onClick={() => setShowLib(false)}>✕</button></div>
          <div className="library-kits">
            {Object.entries(SOUND_LIBRARY).map(([name, sounds]) => (
              <div key={name} className={`library-kit ${selKit === name ? 'selected' : ''}`}>
                <button className="kit-name" onClick={() => setSelKit(selKit === name ? null : name)}>{name}</button>
                {selKit === name && (
                  <div className="kit-sounds">
                    {sounds.map((s, i) => <div key={i} className="kit-sound"><span>{s}</span><span className="kit-sound-pad">Pad {i + 1}</span></div>)}
                    <button className="load-full-kit" onClick={() => {
                      sounds.forEach((s, i) => { if (i < 16) updatePad(i, { name: s }); });
                      alert(`"${name}" layout applied. Upload matching audio files to each pad, or connect your sound CDN.`);
                    }}>Load Kit Layout</button>
                  </div>
                )}
              </div>
            ))}
            {savedKits.length > 0 && <>
              <div className="library-divider">💾 Saved Kits</div>
              {savedKits.map((k, i) => <div key={i} className="library-kit saved"><span className="kit-name">{k.name}</span><span className="kit-date">{new Date(k.date).toLocaleDateString()}</span></div>)}
            </>}
          </div>
        </div>
      )}

      {/* SONG MODE (Phase 3) */}
      {songMode && (
        <div className="song-mode-panel">
          <div className="song-header">
            <h3>🎼 Song Arranger</h3>
            <span className="song-info">{songSeq.length} blocks • {bpm} BPM • {(() => {
              const sd = 60.0 / bpm / 4; const t = songSeq.reduce((s, b) => { const p = patterns[b.patternIndex]; return s + (p ? p.stepCount * sd : 0); }, 0);
              return `${Math.floor(t / 60)}:${String(Math.round(t % 60)).padStart(2, '0')}`;
            })()}</span>
            <button onClick={() => setSongMode(false)}>✕</button>
          </div>
          <div className="song-patterns"><label>Add:</label>
            {patterns.map((p, i) => <button key={i} className="song-add-btn" onClick={() => addToSong(i)}>+ {p.name}</button>)}
          </div>
          <div className="song-sequence">
            {songSeq.length === 0 ? <div className="song-empty">Click patterns above to build arrangement</div> :
              songSeq.map((b, i) => (
                <div key={i} className={`song-block ${songPos === i ? 'playing' : ''}`}>
                  <span className="block-number">{i + 1}</span><span className="block-name">{b.name}</span>
                  <div className="block-actions">
                    {i > 0 && <button onClick={() => moveSongBlock(i, i - 1)}>◀</button>}
                    {i < songSeq.length - 1 && <button onClick={() => moveSongBlock(i, i + 1)}>▶</button>}
                    <button className="block-remove" onClick={() => rmFromSong(i)}>✕</button>
                  </div>
                </div>
              ))
            }
          </div>
          <div className="song-actions">
            <button className="song-play-btn" onClick={startSong} disabled={songSeq.length === 0}>▶ Play Song</button>
            <button onClick={() => exportBeat(exportFormat)} disabled={songSeq.length === 0 || exporting}>⬇ Export Song ({exportFormat.toUpperCase()})</button>
            <button onClick={() => exportStems(exportFormat)} disabled={songSeq.length === 0 || exporting}>⬇ Song Stems</button>
            <button onClick={() => exportBounceAll(exportFormat)} disabled={songSeq.length === 0 || exporting}>⬇ Bounce All</button>
            <button onClick={() => setSongSeq([])}>🗑️ Clear</button>
          </div>
        </div>
      )}

      {/* EXPORT PANEL (Phase 3 Enhanced) */}
      {showExportPanel && (
        <div className="export-panel-overlay" onClick={() => setShowExportPanel(false)}>
          <div className="export-panel" onClick={(e) => e.stopPropagation()}>
            <div className="export-panel-header">
              <h3>⬇ Export</h3>
              <button className="export-panel-close" onClick={() => setShowExportPanel(false)}>✕</button>
            </div>

            {exportProgress && <div className="export-progress-bar"><span className="export-progress-text">{exportProgress}</span><div className="export-progress-fill"></div></div>}

            <div className="export-section">
              <label className="export-label">Format</label>
              <div className="export-format-grid">
                {Object.entries(FORMAT_INFO).map(([key, info]) => (
                  <button key={key} className={`export-format-btn ${exportFormat === key ? 'active' : ''}`} onClick={() => setExportFormat(key)}>
                    <span className="format-ext">.{info.ext}</span>
                    <span className="format-label">{info.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {exportFormat === 'mp3' && (
              <div className="export-section">
                <label className="export-label">MP3 Quality</label>
                <div className="export-quality-row">
                  {[128, 192, 256, 320].map(q => (
                    <button key={q} className={`export-quality-btn ${exportQuality === q ? 'active' : ''}`} onClick={() => setExportQuality(q)}>
                      {q} kbps{q === 320 ? ' (Best)' : q === 128 ? ' (Small)' : ''}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="export-section">
              <label className="export-label">Download to Desktop</label>
              <div className="export-actions-grid">
                <button className="export-action-btn" onClick={() => exportBeat(exportFormat)} disabled={exporting}>
                  <span className="action-icon">🎵</span>
                  <span className="action-label">Full Mix</span>
                  <span className="action-desc">{songMode && songSeq.length > 0 ? 'Song arrangement' : 'Current pattern'} as .{FORMAT_INFO[exportFormat]?.ext}</span>
                </button>
                <button className="export-action-btn" onClick={() => exportStems(exportFormat)} disabled={exporting}>
                  <span className="action-icon">🎚️</span>
                  <span className="action-label">Multi-Track Stems</span>
                  <span className="action-desc">Each pad as separate .{FORMAT_INFO[exportFormat]?.ext}{songMode && songSeq.length > 0 ? ' (full song)' : ''}</span>
                </button>
                <button className="export-action-btn" onClick={() => exportBounceAll(exportFormat)} disabled={exporting}>
                  <span className="action-icon">📦</span>
                  <span className="action-label">Bounce All</span>
                  <span className="action-desc">Full mix + all stems together</span>
                </button>
                <button className="export-action-btn" onClick={exportMIDI} disabled={exporting}>
                  <span className="action-icon">🎹</span>
                  <span className="action-label">MIDI</span>
                  <span className="action-desc">{songMode && songSeq.length > 0 ? 'Full song' : 'Pattern'} note data (.mid)</span>
                </button>
              </div>
            </div>

            {onExport && (
              <div className="export-section">
                <label className="export-label">Send to Recording Studio</label>
                <div className="export-actions-grid">
                  <button className="export-action-btn daw-send-btn" onClick={exportToDaw} disabled={exporting}>
                    <span className="action-icon">🎛️</span>
                    <span className="action-label">Send to DAW Track</span>
                    <span className="action-desc">Load into next empty track (always WAV quality)</span>
                  </button>
                  <button className="export-action-btn daw-send-btn" onClick={() => exportBeat(exportFormat, true)} disabled={exporting}>
                    <span className="action-icon">⬇🎛️</span>
                    <span className="action-label">Download + Send to DAW</span>
                    <span className="action-desc">.{FORMAT_INFO[exportFormat]?.ext} to desktop AND WAV to DAW track</span>
                  </button>
                </div>
              </div>
            )}

            <div className="export-info">
              <span>📋 {songMode && songSeq.length > 0 ? `Song: ${songSeq.length} patterns` : `Pattern: ${stepCount} steps`} · {bpm} BPM</span>
            </div>
          </div>
        </div>
      )}

      {/* CHOP VIEW (Phase 2) */}
      {showChop && chopIdx !== null && (
        <div className="chop-view-overlay">
          <div className="chop-view">
            <div className="chop-header"><h3>✂️ Chop — {pads[chopIdx]?.name}</h3><button onClick={() => setShowChop(false)}>✕</button></div>
            <canvas ref={chopCanvas} className="chop-canvas" width={800} height={200} onClick={chopCanvasClick} />
            <div className="chop-controls">
              <button onClick={autoChop}>🤖 Auto-Chop</button>
              <div className="chop-sensitivity"><label>Sensitivity</label><input type="range" min={1} max={100} value={Math.round(chopSens * 100)} onChange={(e) => setChopSens(+e.target.value / 100)} /></div>
              <button onClick={() => setChopPts([])}>Clear</button>
              <span className="chop-count">{chopPts.length} chops</span>
              <button className="distribute-btn" onClick={distributeToPads} disabled={chopPts.length === 0}>📤 Distribute to Pads</button>
            </div>
            <div className="chop-hint">Click waveform to add chop points. Auto-Chop detects transients.</div>
          </div>
        </div>
      )}

      {/* PAD SETTINGS */}
      {showPadSet && selectedPad !== null && (
        <div className="pad-settings-panel">
          <div className="pad-settings-header">
            <h3><span className="pad-settings-color" style={{ background: pads[selectedPad].color }}></span>Pad {selectedPad + 1} — {pads[selectedPad].name}</h3>
            <button className="pad-settings-close" onClick={() => setShowPadSet(false)}>✕</button>
          </div>
          <div className="settings-tabs">
            <button className={settingsTab === 'main' ? 'active' : ''} onClick={() => setSettingsTab('main')}>Main</button>
            <button className={settingsTab === 'effects' ? 'active' : ''} onClick={() => setSettingsTab('effects')}>Effects</button>
          </div>
          <div className="pad-settings-actions">
            <button onClick={() => fileSelect(selectedPad)}>📂 Load</button>
            <button onClick={() => startMicRec(selectedPad)} disabled={micRec}>🎙️</button>
            <button onClick={() => openChop(selectedPad)} disabled={!pads[selectedPad]?.buffer}>✂️</button>
            <button onClick={() => clearPad(selectedPad)}>🗑️</button>
          </div>

          {pads[selectedPad].buffer && settingsTab === 'main' && (<>
            <div className="pad-setting"><label>Volume</label><input type="range" min={0} max={100} value={Math.round(pads[selectedPad].volume * 100)} onChange={(e) => updatePad(selectedPad, { volume: +e.target.value / 100 })} /><span className="setting-value">{Math.round(pads[selectedPad].volume * 100)}%</span></div>
            <div className="pad-setting"><label>Pitch</label><input type="range" min={-12} max={12} value={pads[selectedPad].pitch} onChange={(e) => updatePad(selectedPad, { pitch: +e.target.value })} /><span className="setting-value">{pads[selectedPad].pitch > 0 ? '+' : ''}{pads[selectedPad].pitch}st</span></div>
            <div className="pad-setting"><label>Pan</label><input type="range" min={-100} max={100} value={Math.round(pads[selectedPad].pan * 100)} onChange={(e) => updatePad(selectedPad, { pan: +e.target.value / 100 })} /><span className="setting-value">{pads[selectedPad].pan < 0 ? `L${Math.abs(Math.round(pads[selectedPad].pan * 100))}` : pads[selectedPad].pan > 0 ? `R${Math.round(pads[selectedPad].pan * 100)}` : 'C'}</span></div>
            <div className="pad-setting"><label>Trim Start</label><input type="range" min={0} max={Math.round((pads[selectedPad].buffer?.duration || 1) * 1000)} value={Math.round((pads[selectedPad].trimStart || 0) * 1000)} onChange={(e) => updatePad(selectedPad, { trimStart: +e.target.value / 1000 })} /><span className="setting-value">{(pads[selectedPad].trimStart || 0).toFixed(2)}s</span></div>
            <div className="pad-setting"><label>Trim End</label><input type="range" min={0} max={Math.round((pads[selectedPad].buffer?.duration || 1) * 1000)} value={Math.round((pads[selectedPad].trimEnd || pads[selectedPad].buffer?.duration || 0) * 1000)} onChange={(e) => updatePad(selectedPad, { trimEnd: +e.target.value / 1000 })} /><span className="setting-value">{(pads[selectedPad].trimEnd || pads[selectedPad].buffer?.duration || 0).toFixed(2)}s</span></div>
            <div className="pad-setting"><label>Mode</label><div className="play-mode-btns">{['oneshot','hold','loop'].map(m => <button key={m} className={pads[selectedPad].playMode === m ? 'active' : ''} onClick={() => updatePad(selectedPad, { playMode: m })}>{m === 'oneshot' ? '▶ One' : m === 'hold' ? '✊ Hold' : '🔁 Loop'}</button>)}</div></div>
            <div className="pad-setting"><label>Reverse</label><button className={`toggle-btn ${pads[selectedPad].reverse ? 'active' : ''}`} onClick={() => updatePad(selectedPad, { reverse: !pads[selectedPad].reverse })}>{pads[selectedPad].reverse ? '◀ Rev' : '▶ Norm'}</button></div>
            <div className="pad-setting"><label>Attack</label><input type="range" min={0} max={1000} value={Math.round(pads[selectedPad].attack * 1000)} onChange={(e) => updatePad(selectedPad, { attack: +e.target.value / 1000 })} /><span className="setting-value">{(pads[selectedPad].attack * 1000).toFixed(0)}ms</span></div>
            <div className="pad-setting"><label>Release</label><input type="range" min={0} max={2000} value={Math.round(pads[selectedPad].release * 1000)} onChange={(e) => updatePad(selectedPad, { release: +e.target.value / 1000 })} /><span className="setting-value">{(pads[selectedPad].release * 1000).toFixed(0)}ms</span></div>
            <div className="pad-setting mute-solo">
              <button className={`mute-btn ${pads[selectedPad].muted ? 'active' : ''}`} onClick={() => updatePad(selectedPad, { muted: !pads[selectedPad].muted })}>{pads[selectedPad].muted ? '🔇 M' : 'M'}</button>
              <button className={`solo-btn ${pads[selectedPad].soloed ? 'active' : ''}`} onClick={() => updatePad(selectedPad, { soloed: !pads[selectedPad].soloed })}>{pads[selectedPad].soloed ? '🎯 S' : 'S'}</button>
            </div>
          </>)}

          {/* EFFECTS TAB (Phase 3) */}
          {pads[selectedPad].buffer && settingsTab === 'effects' && (<>
            <div className="effect-section">
              <div className="effect-header"><button className={`effect-toggle ${pads[selectedPad].filterOn ? 'on' : ''}`} onClick={() => updatePad(selectedPad, { filterOn: !pads[selectedPad].filterOn })}>{pads[selectedPad].filterOn ? '✅' : '⬜'}</button><span>Filter</span></div>
              {pads[selectedPad].filterOn && <>
                <div className="pad-setting"><label>Type</label><select value={pads[selectedPad].filterType} onChange={(e) => updatePad(selectedPad, { filterType: e.target.value })}><option value="lowpass">Low Pass</option><option value="highpass">High Pass</option><option value="bandpass">Band Pass</option><option value="notch">Notch</option></select></div>
                <div className="pad-setting"><label>Freq</label><input type="range" min={20} max={20000} value={pads[selectedPad].filterFreq} onChange={(e) => updatePad(selectedPad, { filterFreq: +e.target.value })} /><span className="setting-value">{pads[selectedPad].filterFreq}Hz</span></div>
                <div className="pad-setting"><label>Q</label><input type="range" min={0} max={200} value={Math.round(pads[selectedPad].filterQ * 10)} onChange={(e) => updatePad(selectedPad, { filterQ: +e.target.value / 10 })} /><span className="setting-value">{pads[selectedPad].filterQ.toFixed(1)}</span></div>
              </>}
            </div>
            <div className="effect-section">
              <div className="effect-header"><button className={`effect-toggle ${pads[selectedPad].distortionOn ? 'on' : ''}`} onClick={() => updatePad(selectedPad, { distortionOn: !pads[selectedPad].distortionOn })}>{pads[selectedPad].distortionOn ? '✅' : '⬜'}</button><span>Distortion</span></div>
              {pads[selectedPad].distortionOn && <div className="pad-setting"><label>Amount</label><input type="range" min={0} max={100} value={pads[selectedPad].distortionAmt} onChange={(e) => updatePad(selectedPad, { distortionAmt: +e.target.value })} /><span className="setting-value">{pads[selectedPad].distortionAmt}%</span></div>}
            </div>
            <div className="effect-section">
              <div className="effect-header"><button className={`effect-toggle ${pads[selectedPad].delayOn ? 'on' : ''}`} onClick={() => updatePad(selectedPad, { delayOn: !pads[selectedPad].delayOn })}>{pads[selectedPad].delayOn ? '✅' : '⬜'}</button><span>Delay</span></div>
              {pads[selectedPad].delayOn && <>
                <div className="pad-setting"><label>Time</label><input type="range" min={10} max={2000} value={Math.round(pads[selectedPad].delayTime * 1000)} onChange={(e) => updatePad(selectedPad, { delayTime: +e.target.value / 1000 })} /><span className="setting-value">{(pads[selectedPad].delayTime * 1000).toFixed(0)}ms</span></div>
                <div className="pad-setting"><label>Feedback</label><input type="range" min={0} max={90} value={Math.round(pads[selectedPad].delayFeedback * 100)} onChange={(e) => updatePad(selectedPad, { delayFeedback: +e.target.value / 100 })} /><span className="setting-value">{Math.round(pads[selectedPad].delayFeedback * 100)}%</span></div>
                <div className="pad-setting"><label>Mix</label><input type="range" min={0} max={100} value={Math.round(pads[selectedPad].delayMix * 100)} onChange={(e) => updatePad(selectedPad, { delayMix: +e.target.value / 100 })} /><span className="setting-value">{Math.round(pads[selectedPad].delayMix * 100)}%</span></div>
              </>}
            </div>
            <div className="effect-section">
              <div className="effect-header"><button className={`effect-toggle ${pads[selectedPad].reverbOn ? 'on' : ''}`} onClick={() => updatePad(selectedPad, { reverbOn: !pads[selectedPad].reverbOn })}>{pads[selectedPad].reverbOn ? '✅' : '⬜'}</button><span>Reverb</span></div>
              {pads[selectedPad].reverbOn && <div className="pad-setting"><label>Mix</label><input type="range" min={0} max={100} value={Math.round(pads[selectedPad].reverbMix * 100)} onChange={(e) => updatePad(selectedPad, { reverbMix: +e.target.value / 100 })} /><span className="setting-value">{Math.round(pads[selectedPad].reverbMix * 100)}%</span></div>}
            </div>
          </>)}
        </div>
      )}
    </div>
  );
};

export default SamplerBeatMaker;