// =============================================================================
// RecordingStudio.js — Part 2/4
// Component state · Audio engine · Recording · Playback · FX chain
// =============================================================================

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
  const [masterVolume, setMasterVolume] = useState(0.8);
  const [masterPan, setMasterPan] = useState(0);
  const [tracks, setTracks] = useState(Array.from({ length: 1 }, (_, i) => DEFAULT_TRACK(i)));
  const [trackMicModels, setTrackMicModels] = useState({});
  const [midiEnabled, setMidiEnabled] = useState(false);
  const [wamPlugins, setWamPlugins] = useState([]);
  const [analogSubview, setAnalogSubview] = useState("ampsim");
  const [trackConsoleChar, setTrackConsoleChar] = useState({});
  const [masterConsoleChar, setMasterConsoleChar] = useState("none");
  const trackConsoleCharRef = useRef({});
  const masterConsoleCharRef = useRef("none");
  const masterConsoleOutRef = useRef(null);
  const [monitorSpeaker, setMonitorSpeaker] = useState("flat");
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
    const fx = track.effects;
    if (fx.reverb?.enabled && fx.reverb.mix > 0) { const conv = ctx.createConvolver(); conv.buffer = getReverbBuf(ctx, fx.reverb.decay); const g = ctx.createGain(); g.gain.value = fx.reverb.mix; dry.connect(conv); conv.connect(g); g.connect(master); }
    if (fx.delay?.enabled && fx.delay.mix > 0)   { const d = ctx.createDelay(5); d.delayTime.value = fx.delay.time; const fb = ctx.createGain(); fb.gain.value = fx.delay.feedback; const mx = ctx.createGain(); mx.gain.value = fx.delay.mix; dry.connect(d); d.connect(fb); fb.connect(d); d.connect(mx); mx.connect(master); }
  };

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
      masterAnalyserLRef.current = ctx.createAnalyser(); masterAnalyserLRef.current.fftSize = 256; masterAnalyserLRef.current.smoothingTimeConstant = 0.7;
      masterAnalyserRRef.current = ctx.createAnalyser(); masterAnalyserRRef.current.fftSize = 256; masterAnalyserRRef.current.smoothingTimeConstant = 0.7;
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
          const dataL = new Uint8Array(pair.left.frequencyBinCount); pair.left.getByteFrequencyData(dataL);
          const left = dataL.reduce((a, b) => a + b, 0) / (dataL.length * 255);
          const dataR = new Uint8Array(pair.right.frequencyBinCount); pair.right.getByteFrequencyData(dataR);
          const right = dataR.reduce((a, b) => a + b, 0) / (dataR.length * 255);
          return { left, right, peak: Math.max(left, right) };
        });
        setMeterLevels(levels);
      } else setMeterLevels([]);
      if (masterAnalyserLRef.current && masterAnalyserRRef.current) {
        const bL = new Uint8Array(masterAnalyserLRef.current.frequencyBinCount); masterAnalyserLRef.current.getByteFrequencyData(bL);
        const mL = bL.reduce((a, b) => a + b, 0) / (bL.length * 255);
        const bR = new Uint8Array(masterAnalyserRRef.current.frequencyBinCount); masterAnalyserRRef.current.getByteFrequencyData(bR);
        const mR = bR.reduce((a, b) => a + b, 0) / (bR.length * 255);
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
      const analyserL = ctx.createAnalyser(); analyserL.fftSize = 256; analyserL.smoothingTimeConstant = 0.7;
      const analyserR = ctx.createAnalyser(); analyserR.fftSize = 256; analyserR.smoothingTimeConstant = 0.7;
      const fxNodes = buildFxChain(ctx, t); let last = s;
      fxNodes.forEach(n => { last.connect(n); last = n; });
      last.connect(g); g.connect(p); p.connect(splitter);
      splitter.connect(analyserL, 0); splitter.connect(analyserR, 1);
      p.connect(masterGainRef.current); buildSends(ctx, t, p, masterGainRef.current);
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
    setSelectedTrackIndex(i); setStatus(`Track ${i + 1} added`);
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
