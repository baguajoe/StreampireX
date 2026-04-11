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
  const [timeSignature, setTimeSignature] = useState([4,4]);
  const [masterVolume, setMasterVolume] = useState(0.8);
  const [masterPan, setMasterPan] = useState(0);
  const [tracks, setTracks] = useState(Array.from({length:1},(_,i)=>DEFAULT_TRACK(i)));
  const [trackMicModels, setTrackMicModels] = useState({});
  const [midiEnabled, setMidiEnabled] = useState(false);
  const [wamPlugins, setWamPlugins] = useState([]);
  const [analogSubview, setAnalogSubview] = useState("ampsim");
  const [trackConsoleChar, setTrackConsoleChar] = useState({});
  const [masterConsoleChar, setMasterConsoleChar] = useState('none');
  const trackConsoleCharRef = useRef({});
  const masterConsoleCharRef = useRef('none');
  const masterConsoleOutRef = useRef(null);
  const [monitorSpeaker, setMonitorSpeaker] = useState('flat');
  const monitorNodesRef = useRef(null);

  const MONITOR_EQ = {
    flat:       {name:'Flat (Bypass)',cat:'bypass',low:0,lowMid:0,highMid:0,high:0,gain:0},
    genelec8030:{name:'Genelec 8030C',cat:'pro',low:0.5,lowMid:0,highMid:0.3,high:0.5,gain:0},
    genelec1032:{name:'Genelec 1032A',cat:'pro',low:1.0,lowMid:0.5,highMid:0.5,high:0.8,gain:0},
    ns10:       {name:'Yamaha NS-10M',cat:'pro',low:-3,lowMid:2,highMid:2.5,high:-2,gain:1},
    auratone:   {name:'Auratone 5C',cat:'pro',low:-8,lowMid:4,highMid:3,high:-6,gain:3},
    avantone:   {name:'Avantone MixCube',cat:'pro',low:-7,lowMid:3.5,highMid:2.5,high:-5,gain:2.5},
    krk8:       {name:'KRK Rokit 8 G4',cat:'pro',low:2,lowMid:-1,highMid:1,high:1,gain:-1},
    adamA7x:    {name:'Adam Audio A7X',cat:'pro',low:0.5,lowMid:0,highMid:0.5,high:1.5,gain:0},
    focalAlpha: {name:'Focal Alpha 65',cat:'pro',low:1,lowMid:-0.5,highMid:0.3,high:0.8,gain:0},
    dynaudio:   {name:'Dynaudio BM5A',cat:'pro',low:0.8,lowMid:0.3,highMid:0.5,high:0.5,gain:0},
    evenT20:    {name:'Event 20/20bas',cat:'pro',low:1.5,lowMid:0,highMid:0.8,high:0.3,gain:0},
    barefoot:   {name:'Barefoot MicroMain27',cat:'pro',low:0.3,lowMid:0,highMid:0.2,high:0.5,gain:0},
    mackie8:    {name:'Mackie HR824',cat:'pro',low:1.2,lowMid:-0.3,highMid:0.5,high:0.5,gain:0},
    jblLsr:     {name:'JBL LSR 305',cat:'pro',low:1.0,lowMid:-0.5,highMid:0.8,high:1.0,gain:-0.5},
    augspurger: {name:'Augspurger Studio',cat:'pro',low:1.5,lowMid:0.5,highMid:0.5,high:1.0,gain:-1},
    iphone:     {name:'iPhone Speaker',cat:'consumer',low:-10,lowMid:3,highMid:5,high:-4,gain:4},
    android:    {name:'Android Phone',cat:'consumer',low:-9,lowMid:2.5,highMid:4.5,high:-3,gain:3.5},
    laptop:     {name:'Laptop Speakers',cat:'consumer',low:-12,lowMid:2,highMid:4,high:-3,gain:5},
    earbuds:    {name:'Earbuds',cat:'consumer',low:-4,lowMid:1,highMid:3,high:2,gain:1},
    car:        {name:'Car Stereo',cat:'consumer',low:4,lowMid:-2,highMid:2,high:-1,gain:-1},
    club:       {name:'Club / PA System',cat:'consumer',low:6,lowMid:-1,highMid:0,high:2,gain:-3},
    tv:         {name:'TV Speakers',cat:'consumer',low:-6,lowMid:1,highMid:3,high:-2,gain:2},
    bluetooth:  {name:'Bluetooth Speaker',cat:'consumer',low:-2,lowMid:1,highMid:2,high:-1,gain:1},
  };

  useEffect(() => { trackConsoleCharRef.current = trackConsoleChar; }, [trackConsoleChar]);
  useEffect(() => { masterConsoleCharRef.current = masterConsoleChar; }, [masterConsoleChar]);

  useEffect(() => {
    const nodes = monitorNodesRef.current;
    if (!nodes || !audioCtxRef.current) return;
    const eq = MONITOR_EQ[monitorSpeaker] || MONITOR_EQ.flat;
    const t = audioCtxRef.current.currentTime;
    nodes.lo.gain.setTargetAtTime(eq.low,t,0.02);
    nodes.loMid.gain.setTargetAtTime(eq.lowMid,t,0.02);
    nodes.hiMid.gain.setTargetAtTime(eq.highMid,t,0.02);
    nodes.hi.gain.setTargetAtTime(eq.high,t,0.02);
    nodes.gain.gain.setTargetAtTime(Math.pow(10,(eq.gain||0)/20),t,0.02);
  }, [monitorSpeaker]);

  const [latencyMs, setLatencyMs] = useState(0);
  const [monitoringEnabled, setMonitoringEnabled] = useState(false);
  const [latencyCompMs, setLatencyCompMs] = useState(0);
  const monitorGainRef = useRef(null);
  const [tapeDrive, setTapeDrive] = useState(0.3);
  const [tapeWarmth, setTapeWarmth] = useState(0.5);
  const [tapeEnabled, setTapeEnabled] = useState(false);
  const [harmonicEnabled, setHarmonicEnabled] = useState(false);
  const [harmonicAmount, setHarmonicAmount] = useState(0.5);

  useEffect(() => { setWamPlugins(getInstalledWAMPlugins()||[]); }, []);

  const collab = useDAWCollaboration({
    projectId: projectId||null, user:null, tracks, setTracks,
    bpm, setBpm, timeSignature, setTimeSignature, isEnabled:true,
    onStatus:(msg)=>console.log('[Collab]',msg),
  });

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
  const [audioBufferSize, setAudioBufferSize] = useState(256);
  const [sampleRate, setSampleRate] = useState(48000);
  const [workletsLoaded, setWorkletsLoaded] = useState(false);
  const [audioSampleRate, setAudioSampleRate] = useState(44100);
  const [audioLookahead, setAudioLookahead] = useState(25);
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
  const [masterMeterLevels, setMasterMeterLevels] = useState({left:0,right:0,peak:0});
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
  const [showSampleLibrary, setShowSampleLibrary] = useState(false);
  const [showPluginRack, setShowPluginRack] = useState(false);
  const [showMidiMapping, setShowMidiMapping] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(()=>!localStorage.getItem('spx_onboarded'));
  const [chords, setChords] = useState([]);
  const [takes, setTakes] = useState([]);
  const [activeTake, setActiveTake] = useState(null);
  const [pluginRackTrack, setPluginRackTrack] = useState(null);
  const [trackPlugins, setTrackPlugins] = useState({});
  const [cycleEnabled, setCycleEnabled] = useState(false);
  const [cycleStart, setCycleStart] = useState(0);
  const [cycleEnd, setCycleEnd] = useState(8);
  const loopCheckRef = useRef(null);
  const midiMappingsRef = useRef(new Map());
  const midiLearnRef = useRef(null);
  const [midiLearnMode, setMidiLearnMode] = useState(false);
  const [midiMappings, setMidiMappings] = useState([]);
  const metroRef = useRef(null);
  const timeRef = useRef(null);
  const canvasRefs = useRef([]);
  const inputAnalyserRef = useRef(null);
  const inputAnimRef = useRef(null);
  const trackNodesRef = useRef(new Map());
  const tapTimesRef = useRef([]);

  const motionAudioUrl = tracks?.[selectedTrack]?.audio_url || tracks?.find(t=>t?.audio_url)?.audio_url || null;

  const dbToGain = (db) => Math.pow(10,db/20);

  const setStereoPan = (panNode, pan) => {
    if (!audioCtxRef.current) return;
    try { panNode.pan.setTargetAtTime(pan,audioCtxRef.current.currentTime,0.01); }
    catch { panNode.pan.value=pan; }
  };

  const CONSOLE_BOARDS = {
    none:     {name:'Bypass',color:'#555'},
    ssl4ke:   {name:'SSL 4000E',color:'#e8a020'},
    ssl4kg:   {name:'SSL 4000G',color:'#d4941c'},
    neve8078: {name:'Neve 8078',color:'#4a9eff'},
    neve1073: {name:'Neve 1073',color:'#3a7acc'},
    api1604:  {name:'API 1604',color:'#00ffc8'},
    tridentA: {name:'Trident A',color:'#a78bfa'},
    studer900:{name:'Studer 900',color:'#ff6b6b'},
    mciJH636: {name:'MCI JH-636',color:'#ff8c42'},
  };

  const buildSatCurve = (wsNode, drive=1.2, asymmetric=false) => {
    const N=44100; const curve=new Float32Array(N);
    for(let i=0;i<N;i++){
      const x=(i*2)/N-1;
      curve[i]=asymmetric
        ?(x>0?x/(1+drive*0.8*Math.abs(x)):x/(1+drive*1.2*Math.abs(x)))
        :Math.tanh(x*drive)/Math.tanh(drive);
    }
    wsNode.curve=curve; wsNode.oversample='4x';
  };

  const applyConsoleCharacter = (ctx, inputNode, outputNode, boardId) => {
    if (!boardId||boardId==='none'){inputNode.connect(outputNode);return [inputNode];}
    const nodes=[];
    const inputSat=ctx.createWaveShaper(), inputHp=ctx.createBiquadFilter();
    inputHp.type='highpass';
    const eqLo=ctx.createBiquadFilter(), eqHi=ctx.createBiquadFilter();
    eqLo.type='lowshelf'; eqHi.type='highshelf';
    const outputSat=ctx.createWaveShaper(), outputGain=ctx.createGain();
    const configs = {
      ssl4ke:   [18,0.5,1.2,false,200,-0.8,10000,1.2,1.1,false,0.98],
      ssl4kg:   [15,0.4,1.1,false,160,-0.5,12000,0.8,1.05,false,0.99],
      neve8078: [30,0.7,1.6,true,250,1.5,8000,-0.5,1.4,true,0.95],
      neve1073: [50,0.8,1.8,true,300,2.0,6000,-0.8,1.6,true,0.93],
      api1604:  [20,0.6,1.3,false,100,0.5,5000,1.0,1.25,false,0.97],
      tridentA: [25,0.5,1.4,true,180,1.0,9000,0.6,1.3,true,0.96],
      studer900:[22,0.4,1.05,false,120,-0.3,15000,0.3,1.02,false,1.0],
      mciJH636: [28,0.6,1.5,true,220,1.2,7500,0.8,1.35,true,0.96],
    };
    const c=configs[boardId];
    if(!c){inputNode.connect(outputNode);return [inputNode];}
    inputHp.frequency.value=c[0]; inputHp.Q.value=c[1];
    buildSatCurve(inputSat,c[2],c[3]);
    eqLo.frequency.value=c[4]; eqLo.gain.value=c[5];
    eqHi.frequency.value=c[6]; eqHi.gain.value=c[7];
    buildSatCurve(outputSat,c[8],c[9]);
    outputGain.gain.value=c[10];
    inputNode.connect(inputHp); inputHp.connect(inputSat); inputSat.connect(eqLo);
    eqLo.connect(eqHi); eqHi.connect(outputSat); outputSat.connect(outputGain);
    outputGain.connect(outputNode);
    nodes.push(inputHp,inputSat,eqLo,eqHi,outputSat,outputGain);
    return nodes;
  };

  const ensureTrackGraph = (track) => {
    const ctx=audioCtxRef.current;
    if(!ctx||!masterGainRef.current) return null;
    if(trackNodesRef.current.has(track.id)) return trackNodesRef.current.get(track.id);
    const input=ctx.createGain(), preGain=ctx.createGain();
    const panNode=ctx.createStereoPanner(), fader=ctx.createGain();
    const meter=ctx.createAnalyser(); meter.fftSize=2048;
    const fxNodes=(track.effects&&Object.keys(track.effects).length)?buildFxChain(ctx,track):[];
    let last=preGain;
    fxNodes.forEach(n=>{last.connect(n);last=n;});
    last.connect(panNode); panNode.connect(fader); fader.connect(meter);
    const boardId=trackConsoleChar[track.id]||'none';
    const consoleOut=ctx.createGain();
    applyConsoleCharacter(ctx,meter,consoleOut,boardId);
    const busTrack=track.busTarget?tracks.find(t=>t.id===track.busTarget):null;
    const busNodes=busTrack?trackNodesRef.current.get(busTrack.id):null;
    const dest=(busNodes&&busNodes.input)?busNodes.input:masterGainRef.current;
    consoleOut.connect(dest);
    buildSends(ctx,track,fader,dest);
    input.connect(preGain);
    const nodes={input,preGain,panNode,fader,meter,fxNodes,dest};
    trackNodesRef.current.set(track.id,nodes);
    applyTrackToNodes(track,nodes);
    return nodes;
  };

  const rebuildTrackGraph = (trackId) => {
    const ctx=audioCtxRef.current; if(!ctx) return;
    const track=tracks.find(t=>t.id===trackId); if(!track) return;
    const old=trackNodesRef.current.get(trackId);
    if(old){
      ["input","preGain","panNode","fader","meter"].forEach(k=>{try{old[k].disconnect();}catch(_){}});
      (old.fxNodes||[]).forEach(n=>{try{n.disconnect();}catch(_){}});
    }
    trackNodesRef.current.delete(trackId);
    ensureTrackGraph(track);
  };

  const ensureBusGraph = (busTrack) => {
    const ctx=audioCtxRef.current;
    if(!ctx||!masterGainRef.current) return null;
    if(trackNodesRef.current.has(busTrack.id)) return trackNodesRef.current.get(busTrack.id);
    const input=ctx.createGain(), preGain=ctx.createGain();
    const panNode=ctx.createStereoPanner(), fader=ctx.createGain();
    const meter=ctx.createAnalyser(); meter.fftSize=2048;
    const fxNodes=(busTrack.effects&&Object.keys(busTrack.effects).length)?buildFxChain(ctx,busTrack):[];
    let last=preGain;
    fxNodes.forEach(n=>{last.connect(n);last=n;});
    last.connect(panNode); panNode.connect(fader); fader.connect(meter);
    const busConsoleOut=ctx.createGain();
    applyConsoleCharacter(ctx,meter,busConsoleOut,trackConsoleChar[busTrack?.id]||'none');
    busConsoleOut.connect(masterGainRef.current);
    input.connect(preGain);
    const nodes={input,preGain,panNode,fader,meter,fxNodes,isBus:true};
    trackNodesRef.current.set(busTrack.id,nodes);
    applyTrackToNodes(busTrack,nodes);
    return nodes;
  };

  const applyTrackToNodes = (track, nodes) => {
    if(!audioCtxRef.current) return;
    nodes.preGain.gain.setTargetAtTime(track.muted?0:1,audioCtxRef.current.currentTime,0.01);
    nodes.fader.gain.setTargetAtTime(dbToGain(track.volumeDb??0),audioCtxRef.current.currentTime,0.01);
    setStereoPan(nodes.panNode,track.pan??0);
  };

  const playheadBeat = useMemo(()=>secondsToBeat(currentTime,bpm),[currentTime,bpm]);

  const getTrackInputNode = useCallback((trackIndex) => {
    const track=tracks[trackIndex]; if(!track) return null;
    const nodes=ensureTrackGraph(track); if(!nodes) return null;
    return nodes.input;
  }, [tracks]);

  const instrumentEngine = useInstrumentTrackEngine(audioCtxRef, tracks, {
    bpm, isPlaying, isRecording, playheadBeat, masterGainRef, getTrackInputNode,
    onNotesRecorded:(notes)=>{
      const armedIdx=tracks.findIndex(t=>t.armed&&(t.trackType==="midi"||t.trackType==="instrument"));
      if(armedIdx===-1||!notes.length) return;
      const region=createMidiRegionFromNotes(notes,"MIDI Recording");
      setTracks(prev=>prev.map((t,i)=>i===armedIdx?{...t,regions:[...(t.regions||[]),region]}:t));
      setStatus(`✓ Recorded ${notes.length} MIDI notes → Track ${armedIdx+1}`);
    },
  });

  useEffect(()=>{
    navigator.mediaDevices.enumerateDevices()
      .then(d=>setInputDevices(d.filter(x=>x.kind==="audioinput")))
      .catch(console.error);
    return ()=>{ stopEverything(); if(audioCtxRef.current) audioCtxRef.current.close(); };
  },[]);

  const getCtx = useCallback(()=>{
    if(!audioCtxRef.current||audioCtxRef.current.state==="closed"){
      const ctx=new (window.AudioContext||window.webkitAudioContext)({latencyHint:"interactive",sampleRate});
      audioCtxRef.current=ctx;
      loadAllWorklets(ctx).then(r=>{setWorkletsLoaded(true);console.log("[SPX] Worklets:",r.loaded);}).catch(e=>console.warn("[SPX] Worklet error:",e));
      masterGainRef.current=ctx.createGain(); masterGainRef.current.gain.value=masterVolume;
      masterPanRef.current=ctx.createStereoPanner(); masterPanRef.current.pan.value=masterPan;
      const splitter=ctx.createChannelSplitter(2);
      masterAnalyserLRef.current=ctx.createAnalyser(); masterAnalyserLRef.current.fftSize=256; masterAnalyserLRef.current.smoothingTimeConstant=0.7;
      masterAnalyserRRef.current=ctx.createAnalyser(); masterAnalyserRRef.current.fftSize=256; masterAnalyserRRef.current.smoothingTimeConstant=0.7;
      const masterConsoleOutNode=ctx.createGain(); masterConsoleOutRef.current=masterConsoleOutNode;
      applyConsoleCharacter(ctx,masterGainRef.current,masterConsoleOutNode,masterConsoleChar||'none');
      if(masterConsoleChar&&masterConsoleChar!=='none') masterConsoleOutNode.connect(masterPanRef.current);
      else masterGainRef.current.connect(masterPanRef.current);
      masterPanRef.current.connect(splitter);
      splitter.connect(masterAnalyserLRef.current,0); splitter.connect(masterAnalyserRRef.current,1);
      const monLo=ctx.createBiquadFilter(); monLo.type='lowshelf'; monLo.frequency.value=200;
      const monLoMid=ctx.createBiquadFilter(); monLoMid.type='peaking'; monLoMid.frequency.value=500; monLoMid.Q.value=1;
      const monHiMid=ctx.createBiquadFilter(); monHiMid.type='peaking'; monHiMid.frequency.value=3000; monHiMid.Q.value=1;
      const monHi=ctx.createBiquadFilter(); monHi.type='highshelf'; monHi.frequency.value=8000;
      const monGain=ctx.createGain();
      monLo.connect(monLoMid); monLoMid.connect(monHiMid); monHiMid.connect(monHi); monHi.connect(monGain); monGain.connect(ctx.destination);
      masterPanRef.current.connect(monLo);
      monitorNodesRef.current={lo:monLo,loMid:monLoMid,hiMid:monHiMid,hi:monHi,gain:monGain};
      if(!spxEngineRef.current){
        const engine=AudioEngine.getInstance();
        if(!engine.context||engine.context.state==='closed'){
          engine.context=ctx; engine._buildMasterBus().catch(console.warn);
          engine._loadWorklets().catch(console.warn); engine._startScheduler();
        }
        spxEngineRef.current=engine;
      }
    }
    if(audioCtxRef.current.state==="suspended") audioCtxRef.current.resume();
    return audioCtxRef.current;
  },[masterVolume,masterPan]);

  useEffect(()=>{ if(masterGainRef.current) masterGainRef.current.gain.value=masterVolume; },[masterVolume]);
  useEffect(()=>{
    if(masterPanRef.current){
      try{masterPanRef.current.pan.setTargetAtTime(masterPan,audioCtxRef.current?.currentTime||0,0.01);}
      catch{masterPanRef.current.pan.value=masterPan;}
    }
  },[masterPan]);

  const startLoopCheck = useCallback(()=>{
    if(loopCheckRef.current) cancelAnimationFrame(loopCheckRef.current);
    const check=()=>{
      if(!cycleEnabled||!isPlaying){loopCheckRef.current=null;return;}
      const beatNow=playOffsetRef.current+(audioCtxRef.current?(audioCtxRef.current.currentTime-playStartRef.current)*(bpm/60):0);
      if(beatNow>=cycleEnd){
        playOffsetRef.current=cycleStart; playStartRef.current=audioCtxRef.current?.currentTime||0;
        setCurrentTime(cycleStart*(60/bpm));
      }
      loopCheckRef.current=requestAnimationFrame(check);
    };
    loopCheckRef.current=requestAnimationFrame(check);
  },[cycleEnabled,cycleStart,cycleEnd,bpm,isPlaying]);

  useEffect(()=>{
    if(isPlaying&&cycleEnabled) startLoopCheck();
    else if(loopCheckRef.current){cancelAnimationFrame(loopCheckRef.current);loopCheckRef.current=null;}
  },[isPlaying,cycleEnabled,startLoopCheck]);

  useEffect(()=>{
    if(!audioCtxRef.current||!masterGainRef.current) return;
    tracks.filter(t=>t.trackType==='bus'||t.trackType==='aux').forEach(t=>ensureBusGraph(t));
    tracks.filter(t=>t.trackType!=='bus'&&t.trackType!=='aux').forEach(t=>ensureTrackGraph(t));
  },[tracks]);

  const getReverbBuf = useCallback((ctx,decay=2)=>{
    const len=ctx.sampleRate*decay; const buf=ctx.createBuffer(2,len,ctx.sampleRate);
    for(let ch=0;ch<2;ch++){const d=buf.getChannelData(ch);for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,decay);}
    return buf;
  },[]);

  const updateTrack = useCallback((i,u)=>setTracks(p=>p.map((t,idx)=>idx===i?{...t,...u}:t)),[]);
  const updateEffect = (ti,fx,param,val)=>setTracks(p=>p.map((t,i)=>i!==ti?t:{...t,effects:{...t.effects,[fx]:{...t.effects[fx],[param]:val}}}));

  const hasSolo = tracks.some(t=>t.solo);
  const isAudible = (t)=>!t.muted&&(!hasSolo||t.solo);

  const buildFxChain = (ctx, track) => {
    const nodes=[]; const fx=track.effects;
    if(fx.eq.enabled){
      const lo=ctx.createBiquadFilter(); lo.type="lowshelf"; lo.frequency.value=320; lo.gain.value=fx.eq.lowGain;
      const mi=ctx.createBiquadFilter(); mi.type="peaking"; mi.frequency.value=fx.eq.midFreq; mi.Q.value=1.5; mi.gain.value=fx.eq.midGain;
      const hi=ctx.createBiquadFilter(); hi.type="highshelf"; hi.frequency.value=3200; hi.gain.value=fx.eq.highGain;
      nodes.push(lo,mi,hi);
    }
    if(fx.filter.enabled){const f=ctx.createBiquadFilter();f.type=fx.filter.type;f.frequency.value=fx.filter.frequency;f.Q.value=fx.filter.Q;nodes.push(f);}
    if(fx.compressor.enabled){const c=ctx.createDynamicsCompressor();c.threshold.value=fx.compressor.threshold;c.ratio.value=fx.compressor.ratio;c.attack.value=fx.compressor.attack;c.release.value=fx.compressor.release;nodes.push(c);}
    if(fx.distortion.enabled&&fx.distortion.amount>0){const ws=ctx.createWaveShaper();const amt=fx.distortion.amount;const curve=new Float32Array(44100);for(let i=0;i<44100;i++){const x=(i*2)/44100-1;curve[i]=((3+amt)*x*20*(Math.PI/180))/(Math.PI+amt*Math.abs(x));}ws.curve=curve;ws.oversample="4x";nodes.push(ws);}
    if(fx.limiter?.enabled){const lim=ctx.createDynamicsCompressor();lim.threshold.value=fx.limiter.threshold;lim.knee.value=fx.limiter.knee;lim.ratio.value=fx.limiter.ratio;lim.attack.value=fx.limiter.attack;lim.release.value=fx.limiter.release;nodes.push(lim);}
    if(fx.gate?.enabled){const gt=ctx.createDynamicsCompressor();gt.threshold.value=fx.gate.threshold;gt.ratio.value=20;gt.knee.value=0;gt.attack.value=fx.gate.attack;gt.release.value=fx.gate.release;nodes.push(gt);}
    if(fx.deesser?.enabled){const bp=ctx.createBiquadFilter();bp.type="peaking";bp.frequency.value=fx.deesser.frequency;bp.Q.value=4;bp.gain.value=-Math.abs(fx.deesser.threshold);nodes.push(bp);}
    if(fx.chorus?.enabled){const cd=ctx.createDelay(0.05);cd.delayTime.value=fx.chorus.depth;const cLfo=ctx.createOscillator();const cLfoG=ctx.createGain();cLfo.frequency.value=fx.chorus.rate;cLfoG.gain.value=fx.chorus.depth*0.5;cLfo.connect(cLfoG);cLfoG.connect(cd.delayTime);cLfo.start();nodes.push(cd);}
    if(fx.flanger?.enabled){const fd=ctx.createDelay(0.02);fd.delayTime.value=fx.flanger.depth;const fLfo=ctx.createOscillator();const fLfoG=ctx.createGain();fLfo.frequency.value=fx.flanger.rate;fLfoG.gain.value=fx.flanger.depth*0.5;fLfo.connect(fLfoG);fLfoG.connect(fd.delayTime);fLfo.start();nodes.push(fd);}
    if(fx.phaser?.enabled){for(let s=0;s<(fx.phaser.stages||4);s++){const ap=ctx.createBiquadFilter();ap.type="allpass";ap.frequency.value=fx.phaser.baseFreq*(1+s*0.5);ap.Q.value=fx.phaser.Q;nodes.push(ap);}}
    if(fx.tremolo?.enabled){const tGain=ctx.createGain();tGain.gain.value=1-fx.tremolo.depth*0.5;const tLfo=ctx.createOscillator();const tLfoG=ctx.createGain();tLfo.frequency.value=fx.tremolo.rate;tLfoG.gain.value=fx.tremolo.depth*0.5;tLfo.connect(tLfoG);tLfoG.connect(tGain.gain);tLfo.start();nodes.push(tGain);}
    if(fx.bitcrusher?.enabled){const bws=ctx.createWaveShaper();const steps=Math.pow(2,fx.bitcrusher.bits||8);const bcurve=new Float32Array(44100);for(let i=0;i<44100;i++){const x=(i*2)/44100-1;bcurve[i]=Math.round(x*steps)/steps;}bws.curve=bcurve;nodes.push(bws);}
    if(fx.exciter?.enabled){const ehpf=ctx.createBiquadFilter();ehpf.type="highpass";ehpf.frequency.value=fx.exciter.frequency;const ews=ctx.createWaveShaper();const ecurve=new Float32Array(44100);for(let i=0;i<44100;i++){const x=(i*2)/44100-1;ecurve[i]=x+(fx.exciter.amount/100)*Math.sin(x*Math.PI);}ews.curve=ecurve;nodes.push(ehpf,ews);}
    if(fx.tapeSaturation?.enabled){const tws=ctx.createWaveShaper();const drv=fx.tapeSaturation.drive||0.3;const tcurve=new Float32Array(44100);for(let i=0;i<44100;i++){const x=(i*2)/44100-1;tcurve[i]=Math.tanh(x*(1+drv*5));}tws.curve=tcurve;tws.oversample="4x";const tlp=ctx.createBiquadFilter();tlp.type="lowpass";tlp.frequency.value=12000-fx.tapeSaturation.warmth*6000;nodes.push(tws,tlp);}
    if(fx.gainUtility?.enabled){const ug=ctx.createGain();ug.gain.value=Math.pow(10,(fx.gainUtility.gain||0)/20)*(fx.gainUtility.phaseInvert?-1:1);nodes.push(ug);}
    return nodes;
  };

  const buildSends = (ctx, track, dry, master) => {
    const fx=track.effects;
    if(fx.reverb.enabled&&fx.reverb.mix>0){const conv=ctx.createConvolver();conv.buffer=getReverbBuf(ctx,fx.reverb.decay);const g=ctx.createGain();g.gain.value=fx.reverb.mix;dry.connect(conv);conv.connect(g);g.connect(master);}
    if(fx.delay.enabled&&fx.delay.mix>0){const d=ctx.createDelay(5);d.delayTime.value=fx.delay.time;const fb=ctx.createGain();fb.gain.value=fx.delay.feedback;const mx=ctx.createGain();mx.gain.value=fx.delay.mix;dry.connect(d);d.connect(fb);fb.connect(d);d.connect(mx);mx.connect(master);}
  };

  const startMeterAnimation = useCallback(()=>{
    if(meterAnimRef.current) cancelAnimationFrame(meterAnimRef.current);
    const animate=()=>{
      const analysers=trackAnalysersRef.current;
      if(analysers&&analysers.length>0){
        const levels=analysers.map(pair=>{
          if(!pair||!pair.left||!pair.right) return {left:0,right:0,peak:0};
          const dataL=new Uint8Array(pair.left.frequencyBinCount); pair.left.getByteFrequencyData(dataL);
          const left=dataL.reduce((a,b)=>a+b,0)/(dataL.length*255);
          const dataR=new Uint8Array(pair.right.frequencyBinCount); pair.right.getByteFrequencyData(dataR);
          const right=dataR.reduce((a,b)=>a+b,0)/(dataR.length*255);
          return {left,right,peak:Math.max(left,right)};
        });
        setMeterLevels(levels);
      } else setMeterLevels([]);
      if(masterAnalyserLRef.current&&masterAnalyserRRef.current){
        const bL=new Uint8Array(masterAnalyserLRef.current.frequencyBinCount); masterAnalyserLRef.current.getByteFrequencyData(bL);
        const mL=bL.reduce((a,b)=>a+b,0)/(bL.length*255);
        const bR=new Uint8Array(masterAnalyserRRef.current.frequencyBinCount); masterAnalyserRRef.current.getByteFrequencyData(bR);
        const mR=bR.reduce((a,b)=>a+b,0)/(bR.length*255);
        setMasterMeterLevels({left:mL,right:mR,peak:Math.max(mL,mR)});
      }
      meterAnimRef.current=requestAnimationFrame(animate);
    };
    meterAnimRef.current=requestAnimationFrame(animate);
  },[]);

  const stopMeterAnimation = useCallback(()=>{
    if(meterAnimRef.current){cancelAnimationFrame(meterAnimRef.current);meterAnimRef.current=null;}
    setMeterLevels([]); setMasterMeterLevels({left:0,right:0,peak:0});
  },[]);

  const startMetronome = (ctx) => {
    if(metroRef.current){clearInterval(metroRef.current);metroRef.current=null;}
    const beats=timeSignature&&timeSignature[0]?timeSignature[0]:4;
    const iv=(60/bpm)*1000; let beat=0;
    const click=(isDownbeat)=>{
      try{if(!ctx||ctx.state==="closed") return;
        const o=ctx.createOscillator(); const g=ctx.createGain();
        o.frequency.value=isDownbeat?1000:800;
        g.gain.setValueAtTime(0.35,ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.06);
        o.connect(g); g.connect(ctx.destination); o.start(ctx.currentTime); o.stop(ctx.currentTime+0.06);
      }catch(e){}
    };
    click(true);
    metroRef.current=setInterval(()=>{beat=(beat+1)%beats;click(beat===0);},iv);
  };

  const stopMetronome = () => { if(metroRef.current){clearInterval(metroRef.current);metroRef.current=null;} };

  const playCountIn = (ctx) => new Promise(res=>{
    const iv=(60/bpm)*1000; let c=0;
    const click=()=>{
      const o=ctx.createOscillator(); const g=ctx.createGain();
      o.frequency.value=c===0?1200:1000; g.gain.value=0.5;
      g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.06);
      o.connect(g); g.connect(ctx.destination); o.start(ctx.currentTime); o.stop(ctx.currentTime+0.06);
    };
    click();
    const id=setInterval(()=>{c++;if(c>=(timeSignature&&timeSignature[0]?timeSignature[0]:4)){clearInterval(id);res();}else click();},iv);
  });

  const startPlayback = (overdub=false) => {
    const ctx=getCtx();
    trackSourcesRef.current.forEach(s=>{try{s.stop();}catch{}});
    trackSourcesRef.current=[]; trackGainsRef.current=[]; trackPansRef.current=[]; trackAnalysersRef.current=[];
    let maxDur=0;
    tracks.forEach((t,i)=>{
      if(!t.audioBuffer){trackAnalysersRef.current[i]=null;return;}
      const s=ctx.createBufferSource(); s.buffer=t.audioBuffer;
      const g=ctx.createGain(); g.gain.value=isAudible(t)?t.volume:0;
      const p=ctx.createStereoPanner(); p.pan.value=t.pan;
      const splitter=ctx.createChannelSplitter(2);
      const analyserL=ctx.createAnalyser(); analyserL.fftSize=256; analyserL.smoothingTimeConstant=0.7;
      const analyserR=ctx.createAnalyser(); analyserR.fftSize=256; analyserR.smoothingTimeConstant=0.7;
      const fxNodes=buildFxChain(ctx,t); let last=s;
      fxNodes.forEach(n=>{last.connect(n);last=n;});
      last.connect(g); g.connect(p); p.connect(splitter);
      splitter.connect(analyserL,0); splitter.connect(analyserR,1);
      p.connect(masterGainRef.current); buildSends(ctx,t,p,masterGainRef.current);
      s.start(0,playOffsetRef.current);
      trackSourcesRef.current[i]=s; trackGainsRef.current[i]=g; trackPansRef.current[i]=p;
      trackAnalysersRef.current[i]={left:analyserL,right:analyserR};
      if(t.audioBuffer.duration>maxDur) maxDur=t.audioBuffer.duration;
    });
    setDuration(maxDur); playStartRef.current=ctx.currentTime; setIsPlaying(true);
    if(metronomeOn) startMetronome(ctx);
    startMeterAnimation();
    timeRef.current=setInterval(()=>{
      if(!audioCtxRef.current) return;
      const el=audioCtxRef.current.currentTime-playStartRef.current+playOffsetRef.current;
      setCurrentTime(el);
      if(el>=maxDur&&maxDur>0&&!overdub) stopPlayback();
    },50);
    if(!overdub) setStatus("▶ Playing");
  };

  const stopPlayback = () => {
    trackSourcesRef.current.forEach(s=>{try{s.stop();}catch{}});
    trackSourcesRef.current=[];
    if(!metronomeOn&&metroRef.current){clearInterval(metroRef.current);metroRef.current=null;}
    if(timeRef.current) clearInterval(timeRef.current);
    stopMeterAnimation(); trackAnalysersRef.current=[]; setIsPlaying(false);
    if(!isRecording){playOffsetRef.current=currentTime;setStatus("■ Stopped");}
  };

  const createRegionFromRecording = (trackIndex, audioBuffer, audioUrl) => {
    const regionId=`rgn_${Date.now()}_${Math.random().toString(36).substr(2,6)}`;
    const startBeat=secondsToBeat(playOffsetRef.current,bpm);
    const durationBeat=secondsToBeat(audioBuffer.duration,bpm);
    setTracks(prev=>prev.map((t,i)=>i===trackIndex?{...t,regions:[...(t.regions||[]),{id:regionId,name:tracks[trackIndex]?.name||`Track ${trackIndex+1}`,startBeat,duration:durationBeat,audioUrl,color:tracks[trackIndex]?.color||TRACK_COLORS[trackIndex%TRACK_COLORS.length],loopEnabled:false,loopCount:1}]}:t));
  };

  const createRegionFromImport = (trackIndex, audioBuffer, name, audioUrl) => {
    const regionId=`rgn_${Date.now()}_${Math.random().toString(36).substr(2,6)}`;
    const durationBeat=secondsToBeat(audioBuffer.duration,bpm);
    setTracks(prev=>prev.map((t,i)=>i===trackIndex?{...t,regions:[...(t.regions||[]),{id:regionId,name:name||`Import ${trackIndex+1}`,startBeat:0,duration:durationBeat,audioUrl,color:t.color||TRACK_COLORS[trackIndex%TRACK_COLORS.length],loopEnabled:false,loopCount:1}]}:t));
  };

  const uploadTrack = async (blob, ti) => {
    if(!projectId) return;
    try{
      const tok=localStorage.getItem("token")||sessionStorage.getItem("token");
      const bu=process.env.REACT_APP_BACKEND_URL||"";
      const fd=new FormData(); fd.append("file",blob,`track_${ti}.webm`); fd.append("project_id",projectId); fd.append("track_index",ti);
      await fetch(`${bu}/api/studio/tracks/upload`,{method:"POST",headers:{Authorization:`Bearer ${tok}`},body:fd});
    }catch(e){console.error(e);}
  };

  const startRecording = async () => {
    const ai=tracks.findIndex(t=>t.armed);
    if(ai===-1){setStatus("⚠ Arm a track");return;}
    try{
      const ctx=getCtx();
      const stream=await navigator.mediaDevices.getUserMedia({audio:{deviceId:selectedDevice!=="default"?{exact:selectedDevice}:undefined,echoCancellation:false,noiseSuppression:false,autoGainControl:false,sampleRate:44100}});
      mediaStreamRef.current=stream; setMicSimStream(stream);
      const src=ctx.createMediaStreamSource(stream); inputAnalyserRef.current=ctx.createAnalyser(); inputAnalyserRef.current.fftSize=256; src.connect(inputAnalyserRef.current);
      const mon=()=>{if(!inputAnalyserRef.current) return;const d=new Uint8Array(inputAnalyserRef.current.frequencyBinCount);inputAnalyserRef.current.getByteFrequencyData(d);setInputLevel(d.reduce((a,b)=>a+b,0)/d.length/255);inputAnimRef.current=requestAnimationFrame(mon);};mon();
      if(countIn){setStatus("Count in...");await playCountIn(ctx);}
      const mime=MediaRecorder.isTypeSupported("audio/webm;codecs=opus")?"audio/webm;codecs=opus":"audio/webm";
      const rec=new MediaRecorder(stream,{mimeType:mime}); chunksRef.current=[];
      rec.ondataavailable=(e)=>{if(e.data.size>0) chunksRef.current.push(e.data);};
      rec.onstop=async()=>{
        const blob=new Blob(chunksRef.current,{type:mime}); const ab=await blob.arrayBuffer();
        const buf=await ctx.decodeAudioData(ab); const audioUrl=URL.createObjectURL(blob);
        updateTrack(ai,{audioBuffer:buf,audio_url:audioUrl}); createRegionFromRecording(ai,buf,audioUrl);
        await uploadTrack(blob,ai); setStatus("✓ Recorded");
      };
      mediaRecorderRef.current=rec; rec.start(100); startPlayback(true); setIsRecording(true); setStatus(`● REC Track ${ai+1}`);
    }catch(e){setStatus(`✗ Mic: ${e.message}`);}
  };

  const stopRecording = () => {
    if(mediaRecorderRef.current&&mediaRecorderRef.current.state!=="inactive") mediaRecorderRef.current.stop();
    if(mediaStreamRef.current){mediaStreamRef.current.getTracks().forEach(t=>t.stop());mediaStreamRef.current=null;}
    if(inputAnimRef.current) cancelAnimationFrame(inputAnimRef.current);
    setMicSimStream(null); setInputLevel(0); setIsRecording(false); stopPlayback();
  };

  const stopEverything = () => {
    stopRecording(); stopPlayback(); stopMetronome(); setMetronomeOn(false);
    playOffsetRef.current=0; setCurrentTime(0);
  };

  const detectBPM = async (audioBuffer) => {
    try{
      const data=audioBuffer.getChannelData(0),sr=audioBuffer.sampleRate;
      const win=Math.floor(sr*0.01),energy=[];
      for(let i=0;i<data.length-win;i+=win){let e=0;for(let j=0;j<win;j++)e+=data[i+j]*data[i+j];energy.push(e/win);}
      const avg=energy.reduce((a,b)=>a+b,0)/energy.length,thresh=avg*1.6;
      const beats=[];let last=0,minGap=Math.floor(sr*0.01*0.25/win);
      for(let i=1;i<energy.length;i++)if(energy[i]>thresh&&energy[i]>energy[i-1]&&(i-last)>minGap){beats.push(i*win/sr);last=i;}
      if(beats.length<4) return null;
      const ints=[];for(let i=1;i<Math.min(beats.length,32);i++)ints.push(beats[i]-beats[i-1]);
      const avgInt=ints.reduce((a,b)=>a+b,0)/ints.length,raw=Math.round(60/avgInt);
      if(raw>=60&&raw<=200) return raw; if(raw>=30&&raw<60) return raw*2; if(raw>200) return Math.round(raw/2);
      return null;
    }catch(_){return null;}
  };

  const loadAudioBuffer = async (url, ti) => {
    try{
      const ctx=getCtx(); const r=await fetch(url); const ab=await r.arrayBuffer();
      const buf=await ctx.decodeAudioData(ab); updateTrack(ti,{audioBuffer:buf,audio_url:url});
      detectBPM(buf).then(det=>{if(det&&Math.abs(det-bpm)>5)window.confirm(`Detected BPM: ${det} — set project to ${det}?`)&&setBpm(det);});
      return buf;
    }catch(e){console.error(e);return null;}
  };

  const drawWaveform = useCallback((el,buf,color)=>{
    if(!el||!buf) return;
    const c=el.getContext("2d"),w=el.width,h=el.height,data=buf.getChannelData(0),step=Math.ceil(data.length/w),mid=h/2;
    c.clearRect(0,0,w,h);
    c.strokeStyle="rgba(255,255,255,0.06)"; c.lineWidth=1; c.beginPath(); c.moveTo(0,mid); c.lineTo(w,mid); c.stroke();
    c.fillStyle=color+"40"; c.beginPath(); c.moveTo(0,mid);
    for(let i=0;i<w;i++){let mx=-1;for(let j=0;j<step;j++){const d=data[i*step+j];if(d!==undefined&&d>mx)mx=d;}c.lineTo(i,mid-mx*mid*0.9);}
    for(let i=w-1;i>=0;i--){let mn=1;for(let j=0;j<step;j++){const d=data[i*step+j];if(d!==undefined&&d<mn)mn=d;}c.lineTo(i,mid-mn*mid*0.9);}
    c.closePath(); c.fill();
    c.strokeStyle=color; c.lineWidth=0.8; c.beginPath();
    for(let i=0;i<w;i++){let mx=-1;for(let j=0;j<step;j++){const d=data[i*step+j];if(d!==undefined&&d>mx)mx=d;}const y=mid-mx*mid*0.9;i===0?c.moveTo(i,y):c.lineTo(i,y);}
    c.stroke();
  },[]);

  useEffect(()=>{ tracks.forEach((t,i)=>{if(t.audioBuffer&&canvasRefs.current[i])drawWaveform(canvasRefs.current[i],t.audioBuffer,t.color);}); },[tracks,drawWaveform]);

  const mixDownProject = async () => {
    if(!tracks.some(t=>t.audioBuffer)){setStatus("⚠ No audio to bounce");return;}
    setMixingDown(true); setStatus("⏳ Bouncing to WAV...");
    try{
      const sr=44100,maxDur=Math.max(...tracks.map(t=>t.audioBuffer?.duration??0),0.5);
      const offCtx=new OfflineAudioContext(2,Math.ceil(sr*(maxDur+1)),sr);
      const master=offCtx.createGain(); master.gain.value=masterVolume??1; master.connect(offCtx.destination);
      tracks.forEach(t=>{
        if(!t.audioBuffer||t.muted) return;
        if(tracks.some(x=>x.solo)&&!t.solo) return;
        const src=offCtx.createBufferSource(); src.buffer=t.audioBuffer;
        const g=offCtx.createGain(); g.gain.value=t.volume??0.8;
        const pan=offCtx.createStereoPanner(); pan.pan.value=t.pan??0;
        let last=src; const fx=t.effects??{};
        if(fx.eq?.enabled){const lo=offCtx.createBiquadFilter();lo.type='lowshelf';lo.frequency.value=fx.eq.lowFreq??200;lo.gain.value=fx.eq.lowShelf??0;const mi=offCtx.createBiquadFilter();mi.type='peaking';mi.frequency.value=fx.eq.midFreq??1000;mi.Q.value=1;mi.gain.value=fx.eq.midPeak??0;const hi=offCtx.createBiquadFilter();hi.type='highshelf';hi.frequency.value=fx.eq.highFreq??8000;hi.gain.value=fx.eq.highShelf??0;last.connect(lo);lo.connect(mi);mi.connect(hi);last=hi;}
        if(fx.compressor?.enabled){const c=offCtx.createDynamicsCompressor();c.threshold.value=fx.compressor.threshold??-24;c.ratio.value=fx.compressor.ratio??4;c.attack.value=(fx.compressor.attack??10)/1000;c.release.value=(fx.compressor.release??100)/1000;last.connect(c);last=c;}
        last.connect(g);g.connect(pan);pan.connect(master);src.start(t.startTime??0);
      });
      const buf=await offCtx.startRendering();
      const nc=buf.numberOfChannels,len=buf.length*nc*2,ab=new ArrayBuffer(44+len),view=new DataView(ab);
      const ws=(o,s)=>{for(let i=0;i<s.length;i++)view.setUint8(o+i,s.charCodeAt(i));};
      ws(0,'RIFF');view.setUint32(4,36+len,true);ws(8,'WAVE');ws(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);
      view.setUint16(22,nc,true);view.setUint32(24,sr,true);view.setUint32(28,sr*nc*2,true);view.setUint16(32,nc*2,true);view.setUint16(34,16,true);ws(36,'data');view.setUint32(40,len,true);
      let off=44;for(let i=0;i<buf.length;i++)for(let ch=0;ch<nc;ch++){const s=Math.max(-1,Math.min(1,buf.getChannelData(ch)[i]));view.setInt16(off,s<0?s*0x8000:s*0x7FFF,true);off+=2;}
      const blob=new Blob([ab],{type:'audio/wav'}); const url=URL.createObjectURL(blob);
      const a=document.createElement('a'); a.href=url; a.download=`${(projectName??'project').replace(/\s+/g,'_')}_mix.wav`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a); setTimeout(()=>URL.revokeObjectURL(url),8000);
      setStatus(`✓ Bounced: ${a.download}`);
    }catch(e){setStatus(`✗ Bounce failed: ${e.message}`);}
    setMixingDown(false);
  };

  const freezeTrack = async (ti) => {
    const t=tracks[ti]; if(!t?.audioBuffer){setStatus(`⚠ Track ${ti+1} has no audio`);return;} if(t.frozen){setStatus(`Track ${ti+1} already frozen`);return;}
    setStatus(`⏳ Freezing Track ${ti+1}...`);
    try{
      const sr=audioCtxRef.current?.sampleRate||48000,offCtx=new OfflineAudioContext(2,Math.ceil(sr*(t.audioBuffer.duration+0.5)),sr);
      const src=offCtx.createBufferSource(); src.buffer=t.audioBuffer;
      const g=offCtx.createGain(); g.gain.value=t.volume??0.8; const pan=offCtx.createStereoPanner(); pan.pan.value=t.pan??0;
      src.connect(g); g.connect(pan); pan.connect(offCtx.destination); src.start(0);
      const rendered=await offCtx.startRendering();
      updateTrack(ti,{audioBuffer:rendered,frozenBuffer:t.audioBuffer,frozenEffects:JSON.parse(JSON.stringify(t.effects)),frozen:true,name:(t.name??`Track ${ti+1}`)+'  ❄'});
      setStatus(`✓ Track ${ti+1} frozen`);
    }catch(e){setStatus(`✗ Freeze failed: ${e.message}`);}
  };

  const unfreezeTrack=(ti)=>{
    const t=tracks[ti]; if(!t?.frozen||!t?.frozenBuffer){setStatus(`Track ${ti+1} is not frozen`);return;}
    updateTrack(ti,{audioBuffer:t.frozenBuffer,frozenBuffer:null,effects:t.frozenEffects??t.effects,frozen:false,name:(t.name??'').replace('  ❄','')});
    setStatus(`✓ Track ${ti+1} unfrozen`);
  };

  const handleSplitMouseDown = useCallback((e)=>{
    e.preventDefault(); splitDragRef.current=true;
    const container=splitContainerRef.current; if(!container) return;
    const onMove=(me)=>{if(!splitDragRef.current) return;const rect=container.getBoundingClientRect();const pct=Math.max(20,Math.min(80,((me.clientY-rect.top)/rect.height)*100));setSplitTopH(Math.round(pct));};
    const onUp=()=>{splitDragRef.current=false;window.removeEventListener('mousemove',onMove);window.removeEventListener('mouseup',onUp);};
    window.addEventListener('mousemove',onMove); window.addEventListener('mouseup',onUp);
  },[]);

  const openFlexPitch = useCallback((ti)=>{
    const t=tracks[ti]; if(!t?.audioBuffer){setStatus(`⚠ Track ${ti+1} has no audio`);return;}
    setFlexPitchBuffer(t.audioBuffer); setFlexPitchTrack(ti); setShowFlexPitch(true);
  },[tracks]);

  const handleFlexPitchExport = useCallback((correctedBuffer)=>{
    if(flexPitchTrack===null) return;
    updateTrack(flexPitchTrack,{audioBuffer:correctedBuffer});
    setStatus(`✓ Pitch corrections applied to Track ${flexPitchTrack+1}`);
    setShowFlexPitch(false);
  },[flexPitchTrack,updateTrack]);

  useEffect(()=>{
    if(!projectId) return;
    const interval=setInterval(()=>{if(!saving){saveProject();setStatus('✓ Auto-saved');}},60000);
    return ()=>clearInterval(interval);
  },[projectId,saving]);

  const recreateAudioContext = useCallback(async(bufferSize,sampleRate)=>{
    if(audioCtxRef.current&&audioCtxRef.current.state!=='closed') await audioCtxRef.current.close();
    const hint=bufferSize<=128?'interactive':bufferSize<=512?'balanced':'playback';
    audioCtxRef.current=new (window.AudioContext||window.webkitAudioContext)({latencyHint:hint,sampleRate});
    setAudioBufferSize(bufferSize); setAudioSampleRate(sampleRate);
    const ms=Math.round((audioCtxRef.current.baseLatency+(audioCtxRef.current.outputLatency||0))*1000);
    setLatencyMs(ms); setStatus(`✓ Audio engine restarted — ${sampleRate}Hz, ~${ms}ms latency`);
  },[]);

  const rewind = () => { if(isPlaying) stopPlayback(); playOffsetRef.current=0; setCurrentTime(0); };

  const fmt = (s) => { const m=Math.floor(s/60),sec=Math.floor(s%60),ms=Math.floor((s%1)*100); return `${m}:${String(sec).padStart(2,"0")}.${String(ms).padStart(2,"0")}`; };

  const handleImport = async (ti) => {
    const inp=document.createElement("input"); inp.type="file"; inp.accept="audio/*";
    inp.onchange=async(e)=>{
      const f=e.target.files?.[0]; if(!f) return; setStatus("Importing...");
      try{
        const ctx=getCtx(); const ab=await f.arrayBuffer(); const buf=await ctx.decodeAudioData(ab);
        const name=f.name.replace(/\.[^/.]+$/,"").substring(0,20); const audioUrl=URL.createObjectURL(f);
        updateTrack(ti,{audioBuffer:buf,audio_url:audioUrl,name}); createRegionFromImport(ti,buf,name,audioUrl);
        if(projectId){const fd=new FormData();fd.append("file",f);fd.append("project_id",projectId);fd.append("track_index",ti);const tok=localStorage.getItem("token")||sessionStorage.getItem("token");const bu=process.env.REACT_APP_BACKEND_URL||"";await fetch(`${bu}/api/studio/tracks/import`,{method:"POST",headers:{Authorization:`Bearer ${tok}`},body:fd});}
        setStatus(`✓ Track ${ti+1}`);
      }catch(err){setStatus(`✗ ${err.message}`);}
    };
    inp.click();
  };

  const clearTrack = (ti) => { updateTrack(ti,{audioBuffer:null,audio_url:null,armed:false,regions:[]}); setStatus(`Track ${ti+1} cleared`); };

  const handleBeatExport = useCallback((renderedBuffer,blob)=>{
    let t=tracks.findIndex(t=>!t.audioBuffer);
    if(t===-1&&tracks.length<maxTracks){t=tracks.length;setTracks(prev=>[...prev,DEFAULT_TRACK(t)]);}
    if(t===-1){setStatus("⚠ No empty tracks.");return;}
    if(renderedBuffer){const audioUrl=URL.createObjectURL(blob);updateTrack(t,{audioBuffer:renderedBuffer,audio_url:audioUrl,name:"Beat Export"});createRegionFromImport(t,renderedBuffer,"Beat Export",audioUrl);setStatus(`✓ Beat → Track ${t+1}`);setViewMode("arrange");}
  },[tracks,maxTracks,updateTrack]);

  const handlePianoRollExport = useCallback((renderedBuffer,blob)=>{
    let t=tracks.findIndex(t=>!t.audioBuffer);
    if(t===-1&&tracks.length<maxTracks){t=tracks.length;setTracks(prev=>[...prev,DEFAULT_TRACK(t)]);}
    if(t===-1){setStatus("⚠ No empty tracks.");return;}
    if(renderedBuffer){const audioUrl=URL.createObjectURL(blob);updateTrack(t,{audioBuffer:renderedBuffer,audio_url:audioUrl,name:"Piano Roll Export"});createRegionFromImport(t,renderedBuffer,"Piano Roll Export",audioUrl);setStatus(`✓ Piano Roll → Track ${t+1}`);setViewMode("arrange");}
  },[tracks,maxTracks,updateTrack]);

  const handlePianoRollNotesChange = useCallback((notes)=>setPianoRollNotes(notes),[]);
  const handleChordInsert = useCallback((chordNotes)=>{if(chordNotes?.length){setPianoRollNotes(prev=>[...prev,...chordNotes]);setStatus(`✓ ${chordNotes.length} chord notes inserted`);}},[ ]);
  const handleChordKeyChange = useCallback((key,scale)=>{setPianoRollKey(key);setPianoRollScale(scale);},[]);

  const exportMidiFile = useCallback(()=>{
    if(!pianoRollNotes?.length){setStatus("⚠ No piano roll notes");return;}
    try{
      const bytes=midiFromNotes({notes:pianoRollNotes,bpm,ppq:480});
      const blob=new Blob([bytes],{type:"audio/midi"}); const url=URL.createObjectURL(blob);
      const a=document.createElement("a"); a.href=url; a.download=`${projectName.replace(/\s+/g,"_")||"project"}_pianoroll.mid`; a.click();
      URL.revokeObjectURL(url); setStatus("✓ MIDI exported");
    }catch(e){setStatus("✗ MIDI export failed");}
  },[pianoRollNotes,bpm,projectName]);

  const tapTempo = useCallback(()=>{
    const now=performance.now();
    tapTimesRef.current=[...tapTimesRef.current,now].slice(-6);
    if(tapTimesRef.current.length<2){setStatus("Tap tempo…");return;}
    const diffs=[]; for(let i=1;i<tapTimesRef.current.length;i++) diffs.push(tapTimesRef.current[i]-tapTimesRef.current[i-1]);
    const newBpm=clamp(Math.round(60000/(diffs.reduce((a,b)=>a+b,0)/diffs.length)),40,240);
    setBpm(newBpm); setStatus(`✓ BPM: ${newBpm}`);
  },[]);

  const seekToBeat = useCallback((beat)=>{
    const secs=beatToSeconds(beat,bpm); if(isPlaying) stopPlayback();
    playOffsetRef.current=secs; setCurrentTime(secs);
  },[bpm,isPlaying]);

  const savePianoRollToRegion = useCallback(()=>{
    if(!editingRegion) return;
    const {trackIndex,regionId}=editingRegion;
    setTracks(prev=>prev.map((t,i)=>{
      if(i!==trackIndex) return t;
      return {...t,regions:(t.regions||[]).map(r=>{
        if(r.id!==regionId) return r;
        const relativeNotes=pianoRollNotes.map(n=>({...n,startBeat:n.startBeat-r.startBeat}));
        const maxEnd=Math.max(...relativeNotes.map(n=>n.startBeat+n.duration),0);
        return {...r,notes:relativeNotes,duration:Math.max(maxEnd,r.duration)};
      })};
    }));
    setEditingRegion(null); setStatus("✓ Piano Roll edits saved");
  },[editingRegion,pianoRollNotes]);

  useEffect(()=>{ if(viewMode!=="pianoroll"&&editingRegion) savePianoRollToRegion(); },[viewMode,editingRegion,savePianoRollToRegion]);

  const onOpenPianoRoll = useCallback((trackIdx,regionId)=>{
    const track=tracks[trackIdx]; const region=(track?.regions||[]).find(r=>r.id===regionId); if(!region) return;
    setEditingRegion({trackIndex:trackIdx,regionId});
    setPianoRollNotes(region.notes.map(n=>({...n,startBeat:n.startBeat+region.startBeat})));
    setViewMode("pianoroll");
  },[tracks]);

  const handleTimelineDoubleClick = useCallback((e,trackIndex)=>{
    const track=tracks[trackIndex];
    if(track.trackType==="midi"||track.trackType==="instrument"){
      const newRegion=createMidiRegion(playheadBeat,timeSignature[0],`MIDI ${trackIndex+1}`);
      setTracks(prev=>{const next=[...prev];next[trackIndex]={...next[trackIndex],regions:[...(next[trackIndex].regions||[]),newRegion]};return next;});
    }
  },[tracks,playheadBeat,timeSignature]);

  const addTrack = () => {
    if(tracks.length>=maxTracks){setStatus(`⚠ ${userTier} tier limit: ${maxTracks} tracks.`);return;}
    const i=tracks.length;
    setTracks(prev=>[...prev,DEFAULT_TRACK(i,newTrackType)]);
    setSelectedTrackIndex(i);
    setStatus(`Track ${i+1} added`);
  };

  const removeTrack = (idx) => {
    if(tracks.length<=1){setStatus("⚠ Must have at least 1 track");return;}
    setTracks(prev=>prev.filter((_,i)=>i!==idx));
    if(activeEffectsTrack===idx) setActiveEffectsTrack(null);
    else if(activeEffectsTrack>idx) setActiveEffectsTrack(activeEffectsTrack-1);
    setSelectedTrackIndex(prev=>{const nl=tracks.length-1;if(prev===idx)return Math.max(0,idx-1);if(prev>idx)return prev-1;return Math.min(prev,nl-1);});
    setStatus(`Track ${idx+1} removed`);
  };

  const saveProject = async () => {
    setSaving(true); setStatus("Saving...");
    try{
      const tok=localStorage.getItem("token")||sessionStorage.getItem("token");
      const bu=process.env.REACT_APP_BACKEND_URL||"";
      const td=tracks.map(t=>({name:t.name,volume:t.volume,pan:t.pan,muted:t.muted,solo:t.solo,effects:t.effects,color:t.color,trackType:t.trackType,instrument:t.instrument,regions:(t.regions||[]).map(r=>({...r,audioUrl:null})),audio_url:typeof t.audio_url==="string"&&!t.audio_url.startsWith("blob:")?t.audio_url:null}));
      const method=projectId?"PUT":"POST";
      const url=projectId?`${bu}/api/studio/projects/${projectId}`:`${bu}/api/studio/projects`;
      const res=await fetch(url,{method,headers:{"Content-Type":"application/json",Authorization:`Bearer ${tok}`},body:JSON.stringify({name:projectName,bpm,time_signature:`${timeSignature[0]}/${timeSignature[1]}`,tracks:td,master_volume:masterVolume,master_pan:masterPan,piano_roll_notes:pianoRollNotes,piano_roll_key:pianoRollKey,piano_roll_scale:pianoRollScale,automation,cycle_start:cycleStart,cycle_end:cycleEnd,cycle_enabled:cycleEnabled})});
      const data=await res.json();
      if(data?.success){setProjectId(data.project.id);setStatus("✓ Saved");}
      else setStatus("✗ Save failed");
    }catch(e){setStatus("✗ Save failed");}
    finally{setSaving(false);}
  };

  const loadProject = async (pid) => {
    try{
      const tok=localStorage.getItem("token")||sessionStorage.getItem("token");
      const bu=process.env.REACT_APP_BACKEND_URL||"";
      const res=await fetch(`${bu}/api/studio/projects/${pid}`,{headers:{Authorization:`Bearer ${tok}`}});
      const data=await res.json();
      if(data?.success){
        const p=data.project;
        setProjectId(p.id); setProjectName(p.name); setBpm(p.bpm); setMasterVolume(p.master_volume||0.8); setMasterPan(p.master_pan||0);
        if(p.time_signature){const ts=p.time_signature.split("/").map(Number);if(ts.length===2)setTimeSignature(ts);}
        if(p.piano_roll_notes) setPianoRollNotes(p.piano_roll_notes);
        if(p.piano_roll_key) setPianoRollKey(p.piano_roll_key);
        if(p.piano_roll_scale) setPianoRollScale(p.piano_roll_scale);
        if(p.automation) setAutomation(p.automation);
        if(p.cycle_start!=null) setCycleStart(p.cycle_start);
        if(p.cycle_end!=null) setCycleEnd(p.cycle_end);
        if(p.cycle_enabled!=null) setCycleEnabled(p.cycle_enabled);
        const trackCount=Math.min(Math.max(p.tracks?.length||1,1),maxTracks);
        const loaded=Array.from({length:trackCount},(_,i)=>({...DEFAULT_TRACK(i),...(p.tracks[i]||{}),audioBuffer:null,effects:p.tracks[i]?.effects||DEFAULT_EFFECTS(),regions:p.tracks[i]?.regions||[]}));
        setTracks(loaded); setSelectedTrackIndex(0);
        for(let i=0;i<loaded.length;i++) if(loaded[i].audio_url) await loadAudioBuffer(loaded[i].audio_url,i);
        setShowProjectList(false); setStatus(`Loaded: ${p.name}`);
      }
    }catch(e){setStatus("✗ Load failed");}
  };

  const loadProjectList = async () => {
    try{
      const tok=localStorage.getItem("token")||sessionStorage.getItem("token");
      const bu=process.env.REACT_APP_BACKEND_URL||"";
      const res=await fetch(`${bu}/api/studio/projects`,{headers:{Authorization:`Bearer ${tok}`}});
      const data=await res.json();
      if(data?.success){setProjects(data.projects||[]);setShowProjectList(true);}
    }catch(e){console.error(e);}
  };

  const newProject = () => {
    stopEverything(); setProjectId(null); setProjectName("Untitled Project"); setBpm(120); setMasterVolume(0.8); setMasterPan(0);
    setActiveEffectsTrack(null); setTimeSignature([4,4]); setTracks(Array.from({length:1},(_,i)=>DEFAULT_TRACK(i)));
    setSelectedTrackIndex(0); setPianoRollNotes([]); setPianoRollKey("C"); setPianoRollScale("major");
    setEditingRegion(null); setStatus("New project"); setViewMode("arrange");
  };

  const handleAIApplyVolume = useCallback((trackIndex,value)=>{updateTrack(trackIndex,{volume:value});if(trackGainsRef.current[trackIndex])trackGainsRef.current[trackIndex].gain.value=value;setStatus(`AI: Track ${trackIndex+1} vol → ${Math.round(value*100)}%`);},[updateTrack]);
  const handleAIApplyPan = useCallback((trackIndex,value)=>{updateTrack(trackIndex,{pan:value});if(trackPansRef.current[trackIndex])trackPansRef.current[trackIndex].pan.value=value;setStatus(`AI: Track ${trackIndex+1} pan`);},[updateTrack]);
  const handleAIApplyEQ = useCallback((trackIndex,eqSuggestion)=>{const updates={};if(eqSuggestion.frequency<400)updates.lowGain=eqSuggestion.gain_db;else if(eqSuggestion.frequency<3000){updates.midGain=eqSuggestion.gain_db;updates.midFreq=eqSuggestion.frequency;}else updates.highGain=eqSuggestion.gain_db;setTracks(prev=>prev.map((t,i)=>i!==trackIndex?t:{...t,effects:{...t.effects,eq:{...t.effects.eq,...updates,enabled:true}}}));setStatus(`AI: Track ${trackIndex+1} EQ adjusted`);},[]);
  const handleAIApplyCompression = useCallback((trackIndex,comp)=>{setTracks(prev=>prev.map((t,i)=>i!==trackIndex?t:{...t,effects:{...t.effects,compressor:{threshold:comp.suggested_threshold||-20,ratio:comp.suggested_ratio||4,attack:(comp.suggested_attack_ms||10)/1000,release:(comp.suggested_release_ms||100)/1000,enabled:true}}}));setStatus(`AI: Track ${trackIndex+1} compressor applied`);},[]);

  const toggleMonitoring = useCallback((trackIndex)=>{
    const ctx=audioCtxRef?.current; if(!ctx) return;
    if(monitoringEnabled){monitorGainRef.current?.disconnect();monitorGainRef.current=null;setMonitoringEnabled(false);setStatus("Direct monitoring OFF");return;}
    navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false,latency:0}}).then(stream=>{
      const src=ctx.createMediaStreamSource(stream); const gain=ctx.createGain(); gain.gain.value=0.8;
      const delay=ctx.createDelay(0.5); delay.delayTime.value=Math.max(0,latencyCompMs/1000);
      src.connect(delay); delay.connect(gain); gain.connect(ctx.destination);
      monitorGainRef.current=gain; setMonitoringEnabled(true);
      const ms=getLatencyMs(ctx); setLatencyMs(ms); setStatus(`Direct monitoring ON — ${ms}ms`);
    }).catch(e=>setStatus("Monitoring error: "+e.message));
  },[monitoringEnabled,latencyCompMs]);

  const handleApplyVocalFx = useCallback((fxSettings)=>{
    const idx=tracks.findIndex(t=>t.armed); const targetIdx=idx!==-1?idx:selectedTrackIndex;
    setTracks(prev=>prev.map((t,i)=>{if(i!==targetIdx) return t;return {...t,effects:{...t.effects,eq:{...t.effects.eq,...(fxSettings.eq||{}),enabled:fxSettings.eq?.enabled??t.effects.eq.enabled},compressor:{...t.effects.compressor,...(fxSettings.compressor||{}),enabled:fxSettings.compressor?.enabled??t.effects.compressor.enabled},reverb:{...t.effects.reverb,...(fxSettings.reverb||{}),enabled:fxSettings.reverb?.enabled??t.effects.reverb.enabled},gate:{...t.effects.gate,...(fxSettings.gate||{}),enabled:fxSettings.gate?.enabled??t.effects.gate.enabled},deesser:{...t.effects.deesser,...(fxSettings.deesser||{}),enabled:fxSettings.deesser?.enabled??t.effects.deesser.enabled},limiter:{...t.effects.limiter,...(fxSettings.limiter||{}),enabled:fxSettings.limiter?.enabled??t.effects.limiter.enabled},filter:{...t.effects.filter,...(fxSettings.filter||{}),enabled:fxSettings.filter?.enabled??t.effects.filter.enabled},distortion:{...t.effects.distortion,...(fxSettings.distortion||{}),enabled:fxSettings.distortion?.enabled??t.effects.distortion.enabled},chorus:{...t.effects.chorus,...(fxSettings.chorus||{}),enabled:fxSettings.chorus?.enabled??t.effects.chorus.enabled}}};}));
    setActiveEffectsTrack(targetIdx); setStatus(`✓ Vocal FX applied to Track ${targetIdx+1}`);
  },[tracks,selectedTrackIndex]);

  const handleApplyMicProfile = useCallback((micProfile)=>{
    const idx=tracks.findIndex(t=>t.armed); const targetIdx=idx!==-1?idx:selectedTrackIndex;
    if(!micProfile?.eqCurve) return;
    setTracks(prev=>prev.map((t,i)=>{if(i!==targetIdx) return t;return {...t,effects:{...t.effects,eq:{...t.effects.eq,...micProfile.eqCurve,enabled:true},filter:micProfile.rolloff?{...t.effects.filter,type:'highpass',frequency:micProfile.rolloff,Q:0.707,enabled:true}:t.effects.filter}};}));
    setStatus(`✓ Mic profile "${micProfile.name}" applied to Track ${targetIdx+1}`);
  },[tracks,selectedTrackIndex]);

  const handleConsoleMicModel = useCallback((trackIndex,modelKey)=>{
    setTrackMicModels(prev=>({...prev,[trackIndex]:modelKey}));
    if(modelKey==="none"||!MIC_MODELS[modelKey]?.eqCurve){setStatus(`Mic model cleared — Track ${trackIndex+1}`);return;}
    const mic=MIC_MODELS[modelKey];
    handleApplyMicProfile({name:mic.name,eqCurve:mic.eqCurve,rolloff:mic.rolloff});
    setStatus(`🎙 ${mic.name} applied to Track ${trackIndex+1}`);
  },[handleApplyMicProfile]);

  const handleAIBeatApply = useCallback((patternData)=>{setStatus(`✓ AI Beat: ${patternData.genre} @ ${patternData.bpm} BPM`);},[ ]);
  const handleArrangerPlay = useCallback(()=>{ if(!isPlaying) startPlayback(); },[isPlaying]);
  const handleArrangerStop = useCallback(()=>{ if(isPlaying) stopPlayback(); },[isPlaying]);
  const handleArrangerRecord = useCallback(()=>{ isRecording?stopRecording():startRecording(); },[isRecording]);
  const handleBpmChange = useCallback((newBpm)=>setBpm(newBpm),[]);
  const handleTimeSignatureChange = useCallback((top,bottom)=>setTimeSignature([top,bottom]),[]);
  const handleToggleFx = useCallback((trackIndex)=>setActiveEffectsTrack(prev=>prev===trackIndex?null:trackIndex),[]);
  const handleBrowseSounds = useCallback((trackIndex)=>{setSelectedTrackIndex(trackIndex);updateTrack(trackIndex,{armed:true});setTracks(prev=>prev.map((t,i)=>({...t,armed:i===trackIndex})));setViewMode("sounds");setStatus(`Browse sounds for Track ${trackIndex+1}`);},[updateTrack]);

  const landBufferOnTrack = useCallback((audioBuffer,trackName)=>{
    const foundIdx=tracks.findIndex(t=>!t.audioBuffer);
    const targetIdx=(foundIdx===-1&&tracks.length<maxTracks)?tracks.length:foundIdx;
    if(foundIdx===-1&&tracks.length<maxTracks) setTracks(prev=>[...prev,DEFAULT_TRACK(targetIdx)]);
    if(targetIdx===-1){setStatus("⚠ No empty tracks");return;}
    const blob=new Blob([audioBuffer],{type:"audio/wav"}); const audioUrl=URL.createObjectURL(blob);
    updateTrack(targetIdx,{audioBuffer,audio_url:audioUrl,name:trackName});
    createRegionFromImport(targetIdx,audioBuffer,trackName,audioUrl);
    setStatus(`✓ "${trackName}" → Track ${targetIdx+1}`); setViewMode("arrange");
  },[tracks,maxTracks,updateTrack,createRegionFromImport]);

  const handleMenuAction = async (action) => {
    const sel=clamp(selectedTrackIndex,0,Math.max(0,tracks.length-1));
    const toggleArmSelected=()=>{setTracks(p=>p.map((t,idx)=>({...t,armed:idx===sel?!t.armed:false})));setSelectedTrackIndex(sel);setStatus(`Track ${sel+1} ${tracks[sel]?.armed?"disarmed":"armed"}`);};
    const toggleMuteSelected=()=>{const wasMuted=!!tracks[sel]?.muted;updateTrack(sel,{muted:!wasMuted});if(trackGainsRef.current[sel])trackGainsRef.current[sel].gain.value=!wasMuted?0:tracks[sel].volume;setStatus(`Track ${sel+1} ${!wasMuted?"muted":"unmuted"}`);};
    const toggleSoloSelected=()=>{updateTrack(sel,{solo:!tracks[sel]?.solo});setStatus(`Track ${sel+1} solo`);};
    const toggleFxPanel=()=>{setActiveEffectsTrack(prev=>prev===sel?null:sel);};
    switch(action){
      case "file:new": newProject(); break;
      case "file:open": loadProjectList(); break;
      case "file:save": saveProject(); break;
      case "file:openLocal":{const inp=document.createElement('input');inp.type='file';inp.accept='.spx,.json';inp.onchange=async(e)=>{const f=e.target.files[0];if(!f)return;try{const text=await f.text();const data=JSON.parse(text);if(data.format!=='streampirex-daw'){setStatus('Not a valid StreamPireX project');return;}stopEverything();setProjectId(null);setProjectName(data.name||'Imported Project');setBpm(data.bpm||120);setMasterVolume(data.master_volume||0.8);if(data.time_signature){const ts=data.time_signature.split('/').map(Number);if(ts.length===2)setTimeSignature(ts);}if(data.piano_roll_notes)setPianoRollNotes(data.piano_roll_notes);if(data.piano_roll_key)setPianoRollKey(data.piano_roll_key);if(data.piano_roll_scale)setPianoRollScale(data.piano_roll_scale);const trackCount=Math.min(Math.max(data.tracks?.length||1,1),maxTracks);const loaded=Array.from({length:trackCount},(_,i)=>({...DEFAULT_TRACK(i),...(data.tracks[i]||{}),audioBuffer:null,effects:data.tracks[i]?.effects||DEFAULT_EFFECTS(),regions:data.tracks[i]?.regions||[]}));setTracks(loaded);setSelectedTrackIndex(0);setStatus('Opened: '+(data.name||'project'));}catch(err){setStatus('Failed to open: '+err.message);}};inp.click();break;}
      case "file:saveAs":{const saveData={name:projectName,bpm,time_signature:timeSignature[0]+'/'+timeSignature[1],master_volume:masterVolume,tracks:tracks.map(t=>({name:t.name,volume:t.volume,pan:t.pan,muted:t.muted,solo:t.solo,effects:t.effects,color:t.color,regions:(t.regions||[]).map(r=>({...r,audioUrl:null})),audio_url:typeof t.audio_url==='string'&&!t.audio_url.startsWith('blob:')?t.audio_url:null})),piano_roll_notes:pianoRollNotes,piano_roll_key:pianoRollKey,piano_roll_scale:pianoRollScale,created_at:new Date().toISOString(),format:'streampirex-daw',version:'1.0'};setSaveAsData(JSON.stringify(saveData,null,2));setShowSaveAsModal(true);break;}
      case 'file:saveDesktop':{const dlData={name:projectName,bpm,time_signature:`${timeSignature[0]}/${timeSignature[1]}`,master_volume:masterVolume,tracks:tracks.map(t=>({name:t.name,volume:t.volume,pan:t.pan,muted:t.muted,solo:t.solo,effects:t.effects,color:t.color,regions:(t.regions||[]).map(r=>({...r,audioUrl:null}))})),piano_roll_notes:pianoRollNotes,piano_roll_key:pianoRollKey,piano_roll_scale:pianoRollScale,created_at:new Date().toISOString(),format:'streampirex-daw',version:'1.0'};const dlBlob=new Blob([JSON.stringify(dlData,null,2)],{type:'application/json'});const dlUrl=URL.createObjectURL(dlBlob);const dlA=document.createElement('a');dlA.href=dlUrl;dlA.download=`${projectName.replace(/\s+/g,'_')}.spx`;document.body.appendChild(dlA);dlA.click();document.body.removeChild(dlA);URL.revokeObjectURL(dlUrl);setStatus(`Downloaded: ${projectName}.spx`);break;}
      case "file:importAudio": setViewMode("arrange"); handleImport(sel); break;
      case 'file:importMidi': case 'midi:import': setViewMode('pianoroll'); break;
      case 'midi:controller': setMidiEnabled(m=>!m); break;
      case 'plugins:wam': window.open('/wam-plugin-store','_blank'); break;
      case "file:exportMidi": case "midi:export": exportMidiFile(); break;
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
      case "transport:playPause": isPlaying?stopPlayback():startPlayback(); break;
      case "transport:stop": stopEverything(); break;
      case "transport:record": isRecording?stopRecording():startRecording(); break;
      case "transport:rewind": rewind(); break;
      case "transport:tapTempo": tapTempo(); break;
      case "track:add": addTrack(); break;
      case "track:remove": removeTrack(sel); break;
      case "track:arm": toggleArmSelected(); break;
      case "track:mute": toggleMuteSelected(); break;
      case "track:solo": toggleSoloSelected(); break;
      case "track:clear": clearTrack(sel); break;
      case "track:duplicate":{if(!tracks[sel])break;const dup={...tracks[sel],id:Date.now(),name:(tracks[sel].name??`Track ${sel+1}`)+" copy"};setTracks(t=>[...t,dup]);setStatus(`Track ${sel+1} duplicated`);break;}
      case "track:color":{const pal=["#34c759","#ff9500","#007aff","#af52de","#ff3b30","#5ac8fa","#ff2d55","#ffcc00","#ff6b35","#00ffc8"];const next=pal[(pal.indexOf(tracks[sel]?.color??pal[0])+1)%pal.length];updateTrack(sel,{color:next});break;}
      case "track:rename":{const n=window.prompt("Rename track:",tracks[sel]?.name??`Track ${sel+1}`);if(n?.trim())updateTrack(sel,{name:n.trim()});break;}
      case "transport:metronome": metronomeOn?stopMetronome():startMetronome(audioCtxRef?.current);setMetronomeOn(m=>!m);break;
      case "transport:cycle": setCycleEnabled(e=>!e);setStatus(`Cycle ${cycleEnabled?"OFF":"ON"}`);break;
      case "transport:countIn": setCountIn(c=>!c);break;
      case "transport:setBpm":{const b=window.prompt("Set BPM:",String(bpm??120));if(b&&!isNaN(parseInt(b)))setBpm(Math.max(20,Math.min(300,parseInt(b))));break;}
      case "transport:timeSignature":{const ts=window.prompt("Time signature:",`${timeSignature[0]}/${timeSignature[1]}`);if(ts){const[top,bot]=ts.split("/").map(Number);if(top>0&&bot>0)setTimeSignature([top,bot]);}break;}
      case "transport:goToEnd":{const mx=Math.max(...tracks.map(t=>t.audioBuffer?.duration??0),0);playOffsetRef.current=mx;setCurrentTime(mx);break;}
      case "midi:hardware": setMidiEnabled(m=>!m);break;
      case "midi:humanize":{const h=(pianoRollNotes??[]).map(n=>({...n,startBeat:+(n.startBeat+(Math.random()-.5)*.04).toFixed(4),velocity:+Math.max(.05,Math.min(1,(n.velocity??.8)+(Math.random()-.5)*.15)).toFixed(3)}));setPianoRollNotes(h);setStatus(`✓ Humanized ${h.length} notes`);break;}
      case "midi:quantize":{setPianoRollNotes(p=>p.map(n=>({...n,startBeat:Math.round(n.startBeat/0.25)*0.25})));setStatus("✓ Quantized to 1/16");break;}
      case "midi:transpose":{const s=window.prompt("Semitones (+/-)","0");if(s!==null&&!isNaN(parseInt(s))){const n=parseInt(s);setPianoRollNotes(p=>p.map(note=>({...note,note:Math.max(0,Math.min(127,(note.note??60)+n))})));setStatus(`✓ Transposed ${n>0?"+":""}${n} semitones`);}break;}
      case "midi:velocity":{const pct=window.prompt("Scale velocity %","100");if(pct&&!isNaN(parseFloat(pct))){const sc=parseFloat(pct)/100;setPianoRollNotes(p=>p.map(n=>({...n,velocity:+Math.max(.05,Math.min(1,(n.velocity??.8)*sc)).toFixed(3)})));setStatus(`✓ Velocity ×${pct}%`);}break;}
      case "midi:clearAll": if(window.confirm("Clear all piano roll notes?"))setPianoRollNotes([]);break;
      case "audio:settings": setShowAudioSettings(true);break;
      case "view:sampleLibrary": setShowSampleLibrary(s=>!s);break;
      case "view:pluginRack": setShowPluginRack(s=>!s);break;
      case "view:midiMapping": setShowMidiMapping(s=>!s);break;
      case "view:onboarding": setShowOnboarding(true);break;
      case "file:projectSettings":{const nm=window.prompt("Project name:",projectName??"Untitled");if(nm?.trim())setProjectName(nm.trim());const b=window.prompt("BPM:",String(bpm??120));if(b&&!isNaN(parseInt(b)))setBpm(Math.max(20,Math.min(300,parseInt(b))));break;}
      default: setStatus(`ℹ ${action}`);
    }
  };

  const applyAutomation = useCallback(()=>{
    if(!audioCtxRef.current||!isPlaying){autoRafRef.current=null;return;}
    const now=audioCtxRef.current.currentTime;
    const projectTime=playOffsetRef.current/bpm*60+(now-playStartRef.current);
    tracks.forEach((t,i)=>{
      const tId=t.id??i; if(!autoRead[tId]) return;
      const tAuto=automation[tId]??{}; const paramK=autoParams[tId]??'volume';
      const param=AUTO_PARAMS.find(p=>p.key===paramK); if(!param) return;
      const pts=(tAuto[paramK]??[]).sort((a,b)=>a.time-b.time); if(pts.length===0) return;
      const val=getValueAtTime(pts,projectTime,param);
      const nodes=trackNodesRef.current.get(tId); if(!nodes) return;
      switch(paramK){
        case 'volume': nodes.fader?.gain.setTargetAtTime(val,now,0.02);break;
        case 'pan': nodes.panNode?.pan.setTargetAtTime(Math.max(-1,Math.min(1,val)),now,0.02);break;
        case 'mute': nodes.preGain?.gain.setTargetAtTime(val>0.5?0:1,now,0.01);break;
      }
    });
    autoRafRef.current=requestAnimationFrame(applyAutomation);
  },[isPlaying,tracks,automation,autoRead,autoParams,bpm]);

  useEffect(()=>{
    if(isPlaying){if(autoRafRef.current)cancelAnimationFrame(autoRafRef.current);autoRafRef.current=requestAnimationFrame(applyAutomation);}
    else{if(autoRafRef.current){cancelAnimationFrame(autoRafRef.current);autoRafRef.current=null;}}
    return ()=>{if(autoRafRef.current)cancelAnimationFrame(autoRafRef.current);};
  },[isPlaying,applyAutomation]);
