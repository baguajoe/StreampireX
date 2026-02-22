// =============================================================================
// RecordingStudio.js - Multi-Track DAW (Cubase-Inspired)
// =============================================================================
// Location: src/front/js/pages/RecordingStudio.js
// Route: /recording-studio
// Pure Web Audio API — zero external audio libraries
// Effects: EQ, Compressor, Reverb, Delay, Distortion, Filter per track
// Views: Record | Arrange | Console | Beat Maker | Piano | Sounds | Split | Key Finder | AI Beats | Kits | Mic Sim | AI Mix
// Track limits: Free=4, Starter=8, Creator=16, Pro=32
// =============================================================================

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import ArrangerView from '../component/ArrangerView';
import AIMixAssistant from '../component/AIMixAssistant';
import SamplerBeatMaker from '../component/SamplerBeatMaker';
import MicSimulator from '../component/MicSimulator';
import VirtualPiano from '../component/VirtualPiano';
import FreesoundBrowser from '../component/FreesoundBrowser';
import KeyFinder from '../component/KeyFinder';
import AIBeatAssistant from '../component/AIBeatAssistant';
import PianoDrumSplit from '../component/PianoDrumSplit';
import SoundKitManager from '../component/SoundKitManager';
import ParametricEQGraph from '../component/ParametricEQGraph';
import '../../styles/RecordingStudio.css';
import '../../styles/ArrangerView.css';
import '../../styles/AIMixAssistant.css';
import '../../styles/SamplerBeatMaker.css';
import '../../styles/MicSimulator.css';
import '../../styles/VirtualPiano.css';
import '../../styles/FreesoundBrowser.css';
import '../../styles/KeyFinder.css';
import '../../styles/AIBeatAssistant.css';
import '../../styles/PianoDrumSplit.css';
import '../../styles/SoundKitManager.css';

const TRACK_COLORS = ['#34c759','#ff9500','#007aff','#af52de','#ff3b30','#5ac8fa','#ff2d55','#ffcc00',
  '#30d158','#ff6b35','#0a84ff','#bf5af2','#ff453a','#64d2ff','#ff375f','#ffd60a',
  '#32d74b','#ff8c00','#0066cc','#9b59b6','#e74c3c','#2ecc71','#e91e63','#f39c12',
  '#27ae60','#d35400','#2980b9','#8e44ad','#c0392b','#16a085','#e84393','#fdcb6e'];
const TIER_TRACK_LIMITS = { free: 4, starter: 8, creator: 16, pro: 32 };
const DEFAULT_MAX = 4;
const DEFAULT_EFFECTS = () => ({
  eq: { lowGain: 0, midGain: 0, midFreq: 1000, highGain: 0, enabled: true },
  compressor: { threshold: -24, ratio: 4, attack: 0.003, release: 0.25, enabled: false },
  reverb: { mix: 0.2, decay: 2.0, enabled: false },
  delay: { time: 0.3, feedback: 0.3, mix: 0.2, enabled: false },
  distortion: { amount: 0, enabled: false },
  filter: { type: 'lowpass', frequency: 20000, Q: 1, enabled: false },
});
const DEFAULT_TRACK = (i) => ({
  name: `Track ${i+1}`, volume: 0.8, pan: 0, muted: false, solo: false,
  armed: false, audio_url: null, color: TRACK_COLORS[i % TRACK_COLORS.length],
  audioBuffer: null, effects: DEFAULT_EFFECTS(), regions: [],
});

// ── Beat ↔ Seconds helpers ──
const secondsToBeat = (seconds, bpm) => (seconds / 60) * bpm;
const beatToSeconds = (beat, bpm) => (beat / bpm) * 60;

const RecordingStudio = ({ user }) => {
  // ── Tier-based track limit ──
  const userTier = (user?.subscription_tier || user?.tier || 'free').toLowerCase();
  const maxTracks = TIER_TRACK_LIMITS[userTier] || DEFAULT_MAX;

  // ── View mode: record | arrange | console | beatmaker | piano | split | sounds | keyfinder | aibeat | kits | micsim | aimix ──
  const [viewMode, setViewMode] = useState('record');

  // ── Project state ──
  const [projectName, setProjectName] = useState('Untitled Project');
  const [projectId, setProjectId] = useState(null);
  const [projects, setProjects] = useState([]);
  const [showProjectList, setShowProjectList] = useState(false);
  const [bpm, setBpm] = useState(120);
  const [timeSignature, setTimeSignature] = useState([4, 4]);
  const [masterVolume, setMasterVolume] = useState(0.8);
  const [tracks, setTracks] = useState(Array.from({length: Math.min(maxTracks, 8)},(_,i)=>DEFAULT_TRACK(i)));

  // ── Transport state ──
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [metronomeOn, setMetronomeOn] = useState(false);
  const [countIn, setCountIn] = useState(false);

  // ── I/O state ──
  const [inputDevices, setInputDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState('default');
  const [inputLevel, setInputLevel] = useState(0);
  const [status, setStatus] = useState('Ready');
  const [saving, setSaving] = useState(false);
  const [mixingDown, setMixingDown] = useState(false);
  const [activeEffectsTrack, setActiveEffectsTrack] = useState(null);

  // ── Mic Simulator state ──
  const [micSimStream, setMicSimStream] = useState(null);

  // ── Real-time meter levels for Console (FIX: was static) ──
  const [meterLevels, setMeterLevels] = useState([]);

  const audioCtxRef = useRef(null);
  const masterGainRef = useRef(null);
  const trackSourcesRef = useRef([]);
  const trackGainsRef = useRef([]);
  const trackPansRef = useRef([]);
  const trackAnalysersRef = useRef([]);    // FIX: {left, right} AnalyserNode pairs per track
  const meterAnimRef = useRef(null);       // FIX: meter animation frame
  const mediaRecorderRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const chunksRef = useRef([]);
  const playStartRef = useRef(0);
  const playOffsetRef = useRef(0);
  const metroRef = useRef(null);
  const timeRef = useRef(null);
  const canvasRefs = useRef([]);
  const inputAnalyserRef = useRef(null);
  const inputAnimRef = useRef(null);

  // ── Beat-based playhead for ArrangerView ──
  const playheadBeat = useMemo(() => secondsToBeat(currentTime, bpm), [currentTime, bpm]);

  useEffect(() => {
    navigator.mediaDevices.enumerateDevices().then(d => {
      setInputDevices(d.filter(x => x.kind === 'audioinput'));
    }).catch(console.error);
    return () => { stopEverything(); if(audioCtxRef.current) audioCtxRef.current.close(); };
  }, []);

  const getCtx = useCallback(() => {
    if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      masterGainRef.current = audioCtxRef.current.createGain();
      masterGainRef.current.gain.value = masterVolume;
      masterGainRef.current.connect(audioCtxRef.current.destination);
    }
    if (audioCtxRef.current.state === 'suspended') audioCtxRef.current.resume();
    return audioCtxRef.current;
  }, [masterVolume]);

  useEffect(() => { if(masterGainRef.current) masterGainRef.current.gain.value = masterVolume; }, [masterVolume]);

  const getReverbBuf = useCallback((ctx, decay=2) => {
    const len = ctx.sampleRate * decay;
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for(let ch=0;ch<2;ch++){const d=buf.getChannelData(ch);for(let i=0;i<len;i++) d[i]=(Math.random()*2-1)*Math.pow(1-i/len,decay);}
    return buf;
  }, []);

  const updateTrack = useCallback((i, u) => setTracks(p => p.map((t,idx) => idx===i ? {...t,...u} : t)), []);
  const updateEffect = (ti, fx, param, val) => setTracks(p => p.map((t,i) => i!==ti ? t : {...t, effects:{...t.effects,[fx]:{...t.effects[fx],[param]:val}}}));
  const hasSolo = tracks.some(t => t.solo);
  const isAudible = (t) => !t.muted && (!hasSolo || t.solo);

  // ── Waveform drawing ──
  const drawWaveform = useCallback((el, buf, color) => {
    if(!el||!buf) return;
    const c=el.getContext('2d'), w=el.width, h=el.height, data=buf.getChannelData(0), step=Math.ceil(data.length/w), mid=h/2;
    c.clearRect(0,0,w,h);
    c.strokeStyle='rgba(255,255,255,0.03)';c.lineWidth=1;
    for(let x=0;x<w;x+=50){c.beginPath();c.moveTo(x,0);c.lineTo(x,h);c.stroke();}
    c.strokeStyle='rgba(255,255,255,0.06)';c.beginPath();c.moveTo(0,mid);c.lineTo(w,mid);c.stroke();
    c.fillStyle=color+'40';c.beginPath();c.moveTo(0,mid);
    for(let i=0;i<w;i++){let mx=-1;for(let j=0;j<step;j++){const d=data[i*step+j];if(d!==undefined&&d>mx)mx=d;}c.lineTo(i,mid-(mx*mid*0.9));}
    for(let i=w-1;i>=0;i--){let mn=1;for(let j=0;j<step;j++){const d=data[i*step+j];if(d!==undefined&&d<mn)mn=d;}c.lineTo(i,mid-(mn*mid*0.9));}
    c.closePath();c.fill();
    c.strokeStyle=color;c.lineWidth=0.8;c.beginPath();
    for(let i=0;i<w;i++){let mx=-1;for(let j=0;j<step;j++){const d=data[i*step+j];if(d!==undefined&&d>mx)mx=d;}const y=mid-(mx*mid*0.9);i===0?c.moveTo(i,y):c.lineTo(i,y);}
    c.stroke();
  }, []);

  useEffect(() => { tracks.forEach((t,i) => { if(t.audioBuffer && canvasRefs.current[i]) drawWaveform(canvasRefs.current[i], t.audioBuffer, t.color); }); }, [tracks, drawWaveform]);

  const loadAudioBuffer = async (url, ti) => {
    try { const ctx=getCtx(); const r=await fetch(url); const ab=await r.arrayBuffer(); const buf=await ctx.decodeAudioData(ab); updateTrack(ti,{audioBuffer:buf,audio_url:url}); return buf; }
    catch(e){ console.error(e); return null; }
  };

  // ── Effects chain builder ──
  const buildFxChain = (ctx, track) => {
    const nodes=[], fx=track.effects;
    if(fx.eq.enabled){
      const lo=ctx.createBiquadFilter();lo.type='lowshelf';lo.frequency.value=320;lo.gain.value=fx.eq.lowGain;
      const mi=ctx.createBiquadFilter();mi.type='peaking';mi.frequency.value=fx.eq.midFreq;mi.Q.value=1.5;mi.gain.value=fx.eq.midGain;
      const hi=ctx.createBiquadFilter();hi.type='highshelf';hi.frequency.value=3200;hi.gain.value=fx.eq.highGain;
      nodes.push(lo,mi,hi);
    }
    if(fx.filter.enabled){const f=ctx.createBiquadFilter();f.type=fx.filter.type;f.frequency.value=fx.filter.frequency;f.Q.value=fx.filter.Q;nodes.push(f);}
    if(fx.compressor.enabled){const c=ctx.createDynamicsCompressor();c.threshold.value=fx.compressor.threshold;c.ratio.value=fx.compressor.ratio;c.attack.value=fx.compressor.attack;c.release.value=fx.compressor.release;nodes.push(c);}
    if(fx.distortion.enabled&&fx.distortion.amount>0){
      const ws=ctx.createWaveShaper();const amt=fx.distortion.amount;const s=44100;const curve=new Float32Array(s);
      for(let i=0;i<s;i++){const x=i*2/s-1;curve[i]=(3+amt)*x*20*(Math.PI/180)/(Math.PI+amt*Math.abs(x));}
      ws.curve=curve;ws.oversample='4x';nodes.push(ws);
    }
    return nodes;
  };

  const buildSends = (ctx, track, dry, master) => {
    const fx=track.effects;
    if(fx.reverb.enabled&&fx.reverb.mix>0){const conv=ctx.createConvolver();conv.buffer=getReverbBuf(ctx,fx.reverb.decay);const g=ctx.createGain();g.gain.value=fx.reverb.mix;dry.connect(conv);conv.connect(g);g.connect(master);}
    if(fx.delay.enabled&&fx.delay.mix>0){const d=ctx.createDelay(5);d.delayTime.value=fx.delay.time;const fb=ctx.createGain();fb.gain.value=fx.delay.feedback;const mx=ctx.createGain();mx.gain.value=fx.delay.mix;dry.connect(d);d.connect(fb);fb.connect(d);d.connect(mx);mx.connect(master);}
  };

  // ══════════════════════════════════════════════════════
  // FIX: Real-time meter animation (for Console VU meters)
  // ══════════════════════════════════════════════════════
  // FIX: Read from separate L/R AnalyserNodes (ChannelSplitter-based, true stereo)
  const startMeterAnimation = useCallback(() => {
    if (meterAnimRef.current) cancelAnimationFrame(meterAnimRef.current);
    const animate = () => {
      const analysers = trackAnalysersRef.current;
      if (!analysers || analysers.length === 0) { setMeterLevels([]); return; }
      const levels = analysers.map(pair => {
        if (!pair || !pair.left || !pair.right) return { left: 0, right: 0, peak: 0 };
        // Read left channel
        const dataL = new Uint8Array(pair.left.frequencyBinCount);
        pair.left.getByteFrequencyData(dataL);
        let sumL = 0;
        for (let i = 0; i < dataL.length; i++) sumL += dataL[i];
        const left = sumL / (dataL.length * 255);
        // Read right channel
        const dataR = new Uint8Array(pair.right.frequencyBinCount);
        pair.right.getByteFrequencyData(dataR);
        let sumR = 0;
        for (let i = 0; i < dataR.length; i++) sumR += dataR[i];
        const right = sumR / (dataR.length * 255);
        return { left, right, peak: Math.max(left, right) };
      });
      setMeterLevels(levels);
      meterAnimRef.current = requestAnimationFrame(animate);
    };
    meterAnimRef.current = requestAnimationFrame(animate);
  }, []);

  const stopMeterAnimation = useCallback(() => {
    if (meterAnimRef.current) { cancelAnimationFrame(meterAnimRef.current); meterAnimRef.current = null; }
    setMeterLevels([]);
  }, []);

  // ── Recording (with optional Mic Simulator) ──
  const startRecording = async () => {
    const ai=tracks.findIndex(t=>t.armed);
    if(ai===-1){setStatus('⚠ Arm a track');return;}
    try{
      const ctx=getCtx();
      const stream=await navigator.mediaDevices.getUserMedia({audio:{deviceId:selectedDevice!=='default'?{exact:selectedDevice}:undefined,echoCancellation:false,noiseSuppression:false,autoGainControl:false,sampleRate:44100}});
      mediaStreamRef.current=stream;
      setMicSimStream(stream);

      const src=ctx.createMediaStreamSource(stream);inputAnalyserRef.current=ctx.createAnalyser();inputAnalyserRef.current.fftSize=256;src.connect(inputAnalyserRef.current);
      const mon=()=>{if(!inputAnalyserRef.current)return;const d=new Uint8Array(inputAnalyserRef.current.frequencyBinCount);inputAnalyserRef.current.getByteFrequencyData(d);setInputLevel(d.reduce((a,b)=>a+b,0)/d.length/255);inputAnimRef.current=requestAnimationFrame(mon);};mon();
      if(countIn){setStatus('Count in...');await playCountIn(ctx);}
      const mime=MediaRecorder.isTypeSupported('audio/webm;codecs=opus')?'audio/webm;codecs=opus':'audio/webm';
      const rec=new MediaRecorder(stream,{mimeType:mime});chunksRef.current=[];
      rec.ondataavailable=e=>{if(e.data.size>0)chunksRef.current.push(e.data);};
      // FIX: Create audioUrl and pass to region creator for ArrangerView waveforms
      rec.onstop=async()=>{
        const blob=new Blob(chunksRef.current,{type:mime});
        const ab=await blob.arrayBuffer();
        const buf=await ctx.decodeAudioData(ab);
        const audioUrl = URL.createObjectURL(blob);
        updateTrack(ai,{audioBuffer:buf,audio_url:audioUrl});
        createRegionFromRecording(ai, buf, audioUrl);
        await uploadTrack(blob,ai);
        setStatus('✓ Recorded');
      };
      mediaRecorderRef.current=rec;rec.start(100);startPlayback(true);setIsRecording(true);setStatus(`● REC Track ${ai+1}`);
    }catch(e){setStatus(`✗ Mic: ${e.message}`);}
  };

  const stopRecording = () => {
    if(mediaRecorderRef.current&&mediaRecorderRef.current.state!=='inactive')mediaRecorderRef.current.stop();
    if(mediaStreamRef.current){mediaStreamRef.current.getTracks().forEach(t=>t.stop());mediaStreamRef.current=null;}
    if(inputAnimRef.current)cancelAnimationFrame(inputAnimRef.current);
    setMicSimStream(null);
    setInputLevel(0);setIsRecording(false);stopPlayback();
  };

  // ── Mic Simulator recording callback ──
  const handleMicSimRecordingComplete = useCallback((blob) => {
    const ai = tracks.findIndex(t => t.armed);
    if (ai === -1) {
      setStatus('⚠ Arm a track first to receive Mic Sim recording');
      return;
    }
    const ctx = getCtx();
    const audioUrl = URL.createObjectURL(blob);
    blob.arrayBuffer().then(ab => ctx.decodeAudioData(ab)).then(buf => {
      updateTrack(ai, { audioBuffer: buf, audio_url: audioUrl });
      createRegionFromRecording(ai, buf, audioUrl);
      uploadTrack(blob, ai);
      setStatus(`✓ Mic Sim recorded → Track ${ai + 1}`);
    }).catch(e => setStatus(`✗ ${e.message}`));
  }, [tracks]);

  // ── Virtual Piano recording callback ──
  const handlePianoRecordingComplete = useCallback((blob) => {
    const ai = tracks.findIndex(t => t.armed);
    if (ai === -1) {
      setStatus('⚠ Arm a track first to receive Piano recording');
      return;
    }
    const ctx = getCtx();
    const audioUrl = URL.createObjectURL(blob);
    blob.arrayBuffer().then(ab => ctx.decodeAudioData(ab)).then(buf => {
      updateTrack(ai, { audioBuffer: buf, audio_url: audioUrl });
      createRegionFromRecording(ai, buf, audioUrl);
      uploadTrack(blob, ai);
      setStatus(`✓ Piano recorded → Track ${ai + 1}`);
    }).catch(e => setStatus(`✗ ${e.message}`));
  }, [tracks]);

  // ── Freesound Browser: load sound into armed track ──
  const handleFreesoundSelect = useCallback((audioBuffer, name, audioUrl) => {
    const ai = tracks.findIndex(t => t.armed);
    if (ai === -1) {
      setStatus('⚠ Arm a track first to load sound');
      return;
    }
    updateTrack(ai, { audioBuffer, audio_url: audioUrl, name: name || `Freesound Sample` });
    createRegionFromRecording(ai, audioBuffer, audioUrl);
    setStatus(`✓ "${name}" loaded → Track ${ai + 1}`);
  }, [tracks]);

  // ── Piano+Drum Split recording callback ──
  const handleSplitRecordingComplete = useCallback((blob) => {
    const ai = tracks.findIndex(t => t.armed);
    if (ai === -1) { setStatus('⚠ Arm a track first to receive Split recording'); return; }
    const ctx = getCtx();
    const audioUrl = URL.createObjectURL(blob);
    blob.arrayBuffer().then(ab => ctx.decodeAudioData(ab)).then(buf => {
      updateTrack(ai, { audioBuffer: buf, audio_url: audioUrl });
      createRegionFromRecording(ai, buf, audioUrl);
      uploadTrack(blob, ai);
      setStatus(`✓ Split recording → Track ${ai + 1}`);
    }).catch(e => setStatus(`✗ ${e.message}`));
  }, [tracks]);

  // ── AI Beat pattern apply callback (log for now; Beat Maker integration future) ──
  const handleAIBeatApply = useCallback((patternData) => {
    setStatus(`✓ AI Beat pattern generated: ${patternData.genre} @ ${patternData.bpm} BPM — Switch to Beat Maker to use`);
    // Future: auto-load patternData into SamplerBeatMaker step sequencer
  }, []);

  // ── Sound Kit: load full kit into Beat Maker ──
  const handleLoadKit = useCallback((samples) => {
    if (!samples || samples.length === 0) { setStatus('⚠ Kit has no samples'); return; }
    setStatus(`✓ Kit loaded — ${samples.length} samples available. Switch to Beat Maker to play.`);
    // Future: auto-populate SamplerBeatMaker pads with kit samples
  }, []);

  // ── Sound Kit: load single sample to a pad ──
  const handleLoadKitSample = useCallback((audioBuffer, name, url, padNum) => {
    setStatus(`✓ "${name}" loaded → Pad ${padNum >= 0 ? padNum + 1 : '(unassigned)'}`);
  }, []);

  // ── Playback — FIX: now creates AnalyserNode per track for real-time metering ──
  const startPlayback = (overdub=false) => {
    const ctx=getCtx();
    trackSourcesRef.current.forEach(s=>{try{s.stop();}catch(e){}});
    trackSourcesRef.current=[];trackGainsRef.current=[];trackPansRef.current=[];
    trackAnalysersRef.current=[];
    let maxDur=0;
    tracks.forEach((t,i)=>{
      if(!t.audioBuffer){
        trackAnalysersRef.current[i]=null;
        return;
      }
      const s=ctx.createBufferSource();s.buffer=t.audioBuffer;
      const g=ctx.createGain();g.gain.value=isAudible(t)?t.volume:0;
      const p=ctx.createStereoPanner();p.pan.value=t.pan;

      // FIX: ChannelSplitter → separate L/R AnalyserNodes for true stereo metering
      const splitter=ctx.createChannelSplitter(2);
      const analyserL=ctx.createAnalyser();
      analyserL.fftSize=256;
      analyserL.smoothingTimeConstant=0.7;
      const analyserR=ctx.createAnalyser();
      analyserR.fftSize=256;
      analyserR.smoothingTimeConstant=0.7;

      const fxNodes=buildFxChain(ctx,t);let last=s;fxNodes.forEach(n=>{last.connect(n);last=n;});
      last.connect(g);g.connect(p);
      // FIX: Post-fader metering with true stereo split
      p.connect(splitter);
      splitter.connect(analyserL, 0);  // left channel
      splitter.connect(analyserR, 1);  // right channel
      p.connect(masterGainRef.current);
      buildSends(ctx,t,p,masterGainRef.current);
      s.start(0,playOffsetRef.current);trackSourcesRef.current[i]=s;trackGainsRef.current[i]=g;trackPansRef.current[i]=p;
      trackAnalysersRef.current[i]={ left: analyserL, right: analyserR };
      if(t.audioBuffer.duration>maxDur)maxDur=t.audioBuffer.duration;
    });
    setDuration(maxDur);playStartRef.current=ctx.currentTime;setIsPlaying(true);
    if(metronomeOn)startMetronome(ctx);
    // FIX: Start real-time meter animation
    startMeterAnimation();
    timeRef.current=setInterval(()=>{if(audioCtxRef.current){const el=audioCtxRef.current.currentTime-playStartRef.current+playOffsetRef.current;setCurrentTime(el);if(el>=maxDur&&maxDur>0&&!overdub)stopPlayback();}},50);
    if(!overdub)setStatus('▶ Playing');
  };

  const stopPlayback = () => {
    trackSourcesRef.current.forEach(s=>{try{s.stop();}catch(e){}});trackSourcesRef.current=[];
    if(metroRef.current)clearInterval(metroRef.current);if(timeRef.current)clearInterval(timeRef.current);
    // FIX: Stop meter animation and clear analyser refs
    stopMeterAnimation();
    trackAnalysersRef.current=[];
    setIsPlaying(false);if(!isRecording){playOffsetRef.current=currentTime;setStatus('■ Stopped');}
  };

  const stopEverything = () => { stopRecording(); stopPlayback(); playOffsetRef.current=0; setCurrentTime(0); };
  const rewind = () => { if(isPlaying)stopPlayback(); playOffsetRef.current=0; setCurrentTime(0); };

  // ── Metronome ──
  const startMetronome = (ctx) => {
    const iv=(60/bpm)*1000;let beat=0;
    const click=(down)=>{const o=ctx.createOscillator();const g=ctx.createGain();o.frequency.value=down?1000:800;g.gain.value=0.3;g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.05);o.connect(g);g.connect(ctx.destination);o.start(ctx.currentTime);o.stop(ctx.currentTime+0.05);};
    click(true);metroRef.current=setInterval(()=>{beat=(beat+1)%4;click(beat===0);},iv);
  };

  const playCountIn = (ctx) => new Promise(res=>{
    const iv=(60/bpm)*1000;let c=0;
    const click=()=>{const o=ctx.createOscillator();const g=ctx.createGain();o.frequency.value=c===0?1200:1000;g.gain.value=0.5;g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.06);o.connect(g);g.connect(ctx.destination);o.start(ctx.currentTime);o.stop(ctx.currentTime+0.06);};
    click();const id=setInterval(()=>{c++;if(c>=4){clearInterval(id);res();}else click();},iv);
  });

  // ── File import — FIX: now passes audioUrl to region creator ──
  const handleImport = async (ti) => {
    const inp=document.createElement('input');inp.type='file';inp.accept='audio/*';
    inp.onchange=async(e)=>{const f=e.target.files[0];if(!f)return;setStatus(`Importing...`);
      try{const ctx=getCtx();const ab=await f.arrayBuffer();const buf=await ctx.decodeAudioData(ab);
        const name = f.name.replace(/\.[^/.]+$/,'').substring(0,20);
        const audioUrl = URL.createObjectURL(f);
        updateTrack(ti,{audioBuffer:buf,audio_url:audioUrl,name});
        createRegionFromImport(ti, buf, name, audioUrl);
        if(projectId){const fd=new FormData();fd.append('file',f);fd.append('project_id',projectId);fd.append('track_index',ti);
          const tok=localStorage.getItem('token')||sessionStorage.getItem('token');const bu=process.env.REACT_APP_BACKEND_URL||'';
          await fetch(`${bu}/api/studio/tracks/import`,{method:'POST',headers:{'Authorization':`Bearer ${tok}`},body:fd});}
        setStatus(`✓ Track ${ti+1}`);
      }catch(err){setStatus(`✗ ${err.message}`);}
    };inp.click();
  };

  const uploadTrack = async (blob, ti) => {
    if(!projectId)return;try{const tok=localStorage.getItem('token')||sessionStorage.getItem('token');const bu=process.env.REACT_APP_BACKEND_URL||'';
      const fd=new FormData();fd.append('file',blob,`track_${ti}.webm`);fd.append('project_id',projectId);fd.append('track_index',ti);
      await fetch(`${bu}/api/studio/tracks/upload`,{method:'POST',headers:{'Authorization':`Bearer ${tok}`},body:fd});
    }catch(e){console.error(e);}
  };

  const clearTrack = (ti) => {
    updateTrack(ti,{audioBuffer:null,audio_url:null,armed:false,regions:[]});
    setStatus(`Track ${ti+1} cleared`);
  };

  // ── Beat Maker export → DAW track import — FIX: passes audioUrl ──
  const handleBeatExport = useCallback((renderedBuffer, blob) => {
    let targetTrack = tracks.findIndex(t => !t.audioBuffer);
    if (targetTrack === -1 && tracks.length < maxTracks) {
      targetTrack = tracks.length;
      setTracks(prev => [...prev, DEFAULT_TRACK(targetTrack)]);
    }
    if (targetTrack === -1) {
      setStatus('⚠ No empty tracks. Clear a track first.');
      return;
    }
    const ctx = getCtx();
    if (renderedBuffer) {
      const audioUrl = URL.createObjectURL(blob);
      updateTrack(targetTrack, {
        audioBuffer: renderedBuffer,
        audio_url: audioUrl,
        name: 'Beat Export',
      });
      createRegionFromImport(targetTrack, renderedBuffer, 'Beat Export', audioUrl);
      setStatus(`✓ Beat → Track ${targetTrack + 1}`);
      setViewMode('record');
    }
  }, [tracks, maxTracks]);

  // ── Mixdown / Bounce ──
  const handleMixdown = async () => {
    if(!tracks.some(t=>t.audioBuffer)){setStatus('No tracks');return;}
    setMixingDown(true);setStatus('Bouncing...');
    try{
      const maxLen=Math.max(...tracks.map(t=>t.audioBuffer?t.audioBuffer.length:0));
      const sr=tracks.find(t=>t.audioBuffer).audioBuffer.sampleRate;
      const off=new OfflineAudioContext(2,maxLen,sr);
      tracks.forEach(t=>{if(!t.audioBuffer||!isAudible(t))return;const s=off.createBufferSource();s.buffer=t.audioBuffer;
        const fxN=buildFxChain(off,t);const g=off.createGain();g.gain.value=t.volume;const p=off.createStereoPanner();p.pan.value=t.pan;
        let last=s;fxN.forEach(n=>{last.connect(n);last=n;});last.connect(g);g.connect(p);p.connect(off.destination);
        const fx=t.effects;
        if(fx.reverb.enabled&&fx.reverb.mix>0){const cv=off.createConvolver();cv.buffer=getReverbBuf(off,fx.reverb.decay);const rg=off.createGain();rg.gain.value=fx.reverb.mix;p.connect(cv);cv.connect(rg);rg.connect(off.destination);}
        if(fx.delay.enabled&&fx.delay.mix>0){const dl=off.createDelay(5);dl.delayTime.value=fx.delay.time;const fb=off.createGain();fb.gain.value=fx.delay.feedback;const dm=off.createGain();dm.gain.value=fx.delay.mix;p.connect(dl);dl.connect(fb);fb.connect(dl);dl.connect(dm);dm.connect(off.destination);}
        s.start(0);});
      const rendered=await off.startRendering();const wav=bufToWav(rendered);
      const url=URL.createObjectURL(wav);const a=document.createElement('a');a.href=url;a.download=`${projectName.replace(/\s+/g,'_')}_mixdown.wav`;a.click();URL.revokeObjectURL(url);
      if(projectId){const tok=localStorage.getItem('token')||sessionStorage.getItem('token');const bu=process.env.REACT_APP_BACKEND_URL||'';const fd=new FormData();fd.append('file',wav,'mixdown.wav');await fetch(`${bu}/api/studio/projects/${projectId}/mixdown`,{method:'POST',headers:{'Authorization':`Bearer ${tok}`},body:fd});}
      setStatus('✓ Bounced');
    }catch(e){setStatus(`✗ ${e.message}`);}finally{setMixingDown(false);}
  };

  // ── WAV encoder ──
  const bufToWav = (buf) => {
    const nc=buf.numberOfChannels,sr=buf.sampleRate,bps=16,chs=[];for(let i=0;i<nc;i++)chs.push(buf.getChannelData(i));
    const il=nc===2?interleave(chs[0],chs[1]):chs[0],dl=il.length*(bps/8),ab=new ArrayBuffer(44+dl),v=new DataView(ab);
    const ws=(o,s)=>{for(let i=0;i<s.length;i++)v.setUint8(o+i,s.charCodeAt(i));};
    ws(0,'RIFF');v.setUint32(4,36+dl,true);ws(8,'WAVE');ws(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);
    v.setUint16(22,nc,true);v.setUint32(24,sr,true);v.setUint32(28,sr*nc*(bps/8),true);v.setUint16(32,nc*(bps/8),true);
    v.setUint16(34,bps,true);ws(36,'data');v.setUint32(40,dl,true);
    let off=44;for(let i=0;i<il.length;i++){const s=Math.max(-1,Math.min(1,il[i]));v.setInt16(off,s<0?s*0x8000:s*0x7FFF,true);off+=2;}
    return new Blob([ab],{type:'audio/wav'});
  };
  const interleave=(l,r)=>{const res=new Float32Array(l.length+r.length);for(let i=0,idx=0;i<l.length;i++){res[idx++]=l[i];res[idx++]=r[i];}return res;};

  // ── Project save / load ──
  const saveProject = async () => {
    setSaving(true);setStatus('Saving...');
    try{const tok=localStorage.getItem('token')||sessionStorage.getItem('token');const bu=process.env.REACT_APP_BACKEND_URL||'';
      const td=tracks.map(t=>({name:t.name,volume:t.volume,pan:t.pan,muted:t.muted,solo:t.solo,effects:t.effects,color:t.color,regions:(t.regions||[]).map(r=>({...r, audioUrl: null})),audio_url:typeof t.audio_url==='string'&&!t.audio_url.startsWith('blob:')?t.audio_url:null}));
      const method=projectId?'PUT':'POST';const url=projectId?`${bu}/api/studio/projects/${projectId}`:`${bu}/api/studio/projects`;
      const res=await fetch(url,{method,headers:{'Content-Type':'application/json','Authorization':`Bearer ${tok}`},body:JSON.stringify({name:projectName,bpm,time_signature:`${timeSignature[0]}/${timeSignature[1]}`,tracks:td,master_volume:masterVolume})});
      const data=await res.json();if(data.success){setProjectId(data.project.id);setStatus('✓ Saved');}
    }catch(e){setStatus('✗ Save failed');}finally{setSaving(false);}
  };

  const loadProject = async (pid) => {
    try{const tok=localStorage.getItem('token')||sessionStorage.getItem('token');const bu=process.env.REACT_APP_BACKEND_URL||'';
      const res=await fetch(`${bu}/api/studio/projects/${pid}`,{headers:{'Authorization':`Bearer ${tok}`}});const data=await res.json();
      if(data.success){const p=data.project;setProjectId(p.id);setProjectName(p.name);setBpm(p.bpm);setMasterVolume(p.master_volume||0.8);
        if(p.time_signature){const ts=p.time_signature.split('/').map(Number);if(ts.length===2)setTimeSignature(ts);}
        const trackCount=Math.min(Math.max(p.tracks?.length||8, 1), maxTracks);
        const loaded=Array.from({length:trackCount},(_,i)=>({...DEFAULT_TRACK(i),...(p.tracks[i]||{}),audioBuffer:null,effects:p.tracks[i]?.effects||DEFAULT_EFFECTS(),regions:p.tracks[i]?.regions||[]}));
        setTracks(loaded);for(let i=0;i<loaded.length;i++){if(loaded[i].audio_url)await loadAudioBuffer(loaded[i].audio_url,i);}
        setShowProjectList(false);setStatus(`Loaded: ${p.name}`);}
    }catch(e){setStatus('✗ Load failed');}
  };

  const loadProjectList = async () => {
    try{const tok=localStorage.getItem('token')||sessionStorage.getItem('token');const bu=process.env.REACT_APP_BACKEND_URL||'';
      const res=await fetch(`${bu}/api/studio/projects`,{headers:{'Authorization':`Bearer ${tok}`}});const data=await res.json();
      if(data.success){setProjects(data.projects);setShowProjectList(true);}
    }catch(e){console.error(e);}
  };

  const newProject = () => {
    stopEverything();setProjectId(null);setProjectName('Untitled Project');setBpm(120);
    setMasterVolume(0.8);setActiveEffectsTrack(null);setTimeSignature([4,4]);
    setTracks(Array.from({length:Math.min(maxTracks,8)},(_,i)=>DEFAULT_TRACK(i)));
    setStatus('New project');
  };

  // ── Add / Remove tracks (tier-gated) ──
  const addTrack = () => {
    if (tracks.length >= maxTracks) {
      setStatus(`⚠ ${userTier} tier limit: ${maxTracks} tracks. Upgrade for more.`);
      return;
    }
    const i = tracks.length;
    setTracks(prev => [...prev, DEFAULT_TRACK(i)]);
    setStatus(`Track ${i + 1} added (${tracks.length + 1}/${maxTracks})`);
  };

  const removeTrack = (idx) => {
    if (tracks.length <= 1) return;
    setTracks(prev => prev.filter((_, i) => i !== idx));
    if (activeEffectsTrack === idx) setActiveEffectsTrack(null);
    else if (activeEffectsTrack > idx) setActiveEffectsTrack(activeEffectsTrack - 1);
    setStatus(`Track ${idx + 1} removed`);
  };

  // ── Seek (seconds-based for Record view, beat-converted for Arranger) ──
  const seekTo = (t) => {
    if (isPlaying) stopPlayback();
    playOffsetRef.current = t;
    setCurrentTime(t);
  };

  // ── Seek handler from ArrangerView (beat-based → seconds) ──
  const seekToBeat = useCallback((beat) => {
    const secs = beatToSeconds(beat, bpm);
    if (isPlaying) stopPlayback();
    playOffsetRef.current = secs;
    setCurrentTime(secs);
  }, [bpm, isPlaying]);

  // ══════════════════════════════════════════════════════════
  // FIX: Region creation — uses "duration" (not "durationBeats")
  //       + includes "audioUrl" for ArrangerView waveform rendering
  // ══════════════════════════════════════════════════════════

  // ── Auto-create region when recording stops ──
  const createRegionFromRecording = (trackIndex, audioBuffer, audioUrl) => {
    const regionId = `rgn_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const startBeat = secondsToBeat(playOffsetRef.current, bpm);
    const duration = secondsToBeat(audioBuffer.duration, bpm);
    const newRegion = {
      id: regionId,
      name: tracks[trackIndex]?.name || `Track ${trackIndex + 1}`,
      startBeat,
      duration,        // FIX: was "durationBeats" — ArrangerView reads "region.duration"
      audioUrl,         // FIX: was missing — needed for waveform rendering in ArrangerView
      color: tracks[trackIndex]?.color || TRACK_COLORS[trackIndex % TRACK_COLORS.length],
      loopEnabled: false,
      loopCount: 1,
    };
    setTracks(prev => prev.map((t, i) =>
      i === trackIndex ? { ...t, regions: [...(t.regions || []), newRegion] } : t
    ));
  };

  // ── Auto-create region when importing audio ──
  const createRegionFromImport = (trackIndex, audioBuffer, name, audioUrl) => {
    const regionId = `rgn_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const duration = secondsToBeat(audioBuffer.duration, bpm);
    setTracks(prev => prev.map((t, i) =>
      i === trackIndex ? { ...t, regions: [...(t.regions || []), {
        id: regionId,
        name: name || `Import ${trackIndex + 1}`,
        startBeat: 0,
        duration,        // FIX: was "durationBeats"
        audioUrl,         // FIX: was missing
        color: t.color || TRACK_COLORS[trackIndex % TRACK_COLORS.length],
        loopEnabled: false,
        loopCount: 1,
      }] } : t
    ));
  };

  const fmt = (s) => { const m=Math.floor(s/60),sec=Math.floor(s%60),ms=Math.floor((s%1)*100); return `${m}:${String(sec).padStart(2,'0')}.${String(ms).padStart(2,'0')}`; };

  // ── AI Mix Assistant apply callbacks ──
  const handleAIApplyVolume = useCallback((trackIndex, value) => {
    updateTrack(trackIndex, { volume: value });
    if (trackGainsRef.current[trackIndex]) trackGainsRef.current[trackIndex].gain.value = value;
    setStatus(`AI: Track ${trackIndex + 1} vol → ${Math.round(value * 100)}%`);
  }, [updateTrack]);

  const handleAIApplyPan = useCallback((trackIndex, value) => {
    updateTrack(trackIndex, { pan: value });
    if (trackPansRef.current[trackIndex]) trackPansRef.current[trackIndex].pan.value = value;
    const label = value === 0 ? 'C' : value < 0 ? `L${Math.abs(Math.round(value*50))}` : `R${Math.round(value*50)}`;
    setStatus(`AI: Track ${trackIndex + 1} pan → ${label}`);
  }, [updateTrack]);

  const handleAIApplyEQ = useCallback((trackIndex, eqSuggestion) => {
    const updates = {};
    if (eqSuggestion.frequency < 400) updates.lowGain = eqSuggestion.gain_db;
    else if (eqSuggestion.frequency < 3000) { updates.midGain = eqSuggestion.gain_db; updates.midFreq = eqSuggestion.frequency; }
    else updates.highGain = eqSuggestion.gain_db;
    setTracks(prev => prev.map((t, i) => i !== trackIndex ? t : { ...t, effects: { ...t.effects, eq: { ...t.effects.eq, ...updates, enabled: true } } }));
    setStatus(`AI: Track ${trackIndex + 1} EQ adjusted`);
  }, []);

  const handleAIApplyCompression = useCallback((trackIndex, comp) => {
    setTracks(prev => prev.map((t, i) => i !== trackIndex ? t : { ...t, effects: { ...t.effects, compressor: { threshold: comp.suggested_threshold || -20, ratio: comp.suggested_ratio || 4, attack: (comp.suggested_attack_ms || 10) / 1000, release: (comp.suggested_release_ms || 100) / 1000, enabled: true } } }));
    setStatus(`AI: Track ${trackIndex + 1} compressor applied`);
  }, []);

  // ── ArrangerView callbacks ──
  const handleArrangerPlay = useCallback(() => { if (!isPlaying) startPlayback(); }, [isPlaying]);
  const handleArrangerStop = useCallback(() => { if (isPlaying) stopPlayback(); }, [isPlaying]);
  const handleArrangerRecord = useCallback(() => { isRecording ? stopRecording() : startRecording(); }, [isRecording]);
  const handleBpmChange = useCallback((newBpm) => setBpm(newBpm), []);
  const handleTimeSignatureChange = useCallback((top, bottom) => setTimeSignature([top, bottom]), []);
  const handleToggleFx = useCallback((trackIndex) => setActiveEffectsTrack(prev => prev === trackIndex ? null : trackIndex), []);

  // ── EQ Graph onChange handler — updates track EQ state from draggable nodes ──
  const handleEQGraphChange = useCallback((updatedEQ) => {
    if (activeEffectsTrack === null) return;
    setTracks(p => p.map((t, i) => i !== activeEffectsTrack ? t : {
      ...t, effects: { ...t.effects, eq: { ...t.effects.eq, ...updatedEQ } }
    }));
  }, [activeEffectsTrack]);

  // ===================== RENDER =====================
  const afx = activeEffectsTrack !== null ? tracks[activeEffectsTrack] : null;

  return (
    <div className="daw">
      {/* ═══════════════════ TOP BAR ═══════════════════ */}
      <div className="daw-topbar">
        <div className="daw-topbar-left">
          <button className="daw-icon-btn" onClick={newProject} title="New">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
          </button>
          <button className="daw-icon-btn" onClick={loadProjectList} title="Open">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
          </button>
          <button className={`daw-icon-btn ${saving?'saving':''}`} onClick={saveProject} title="Save" disabled={saving}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
          </button>
          <div className="daw-divider"></div>
          <input className="daw-project-name" value={projectName} onChange={e=>setProjectName(e.target.value)} />
        </div>

        {/* Transport — always visible */}
        <div className="daw-transport">
          <button className="daw-transport-btn" onClick={rewind} disabled={isRecording}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19 20L9 12l10-8v16zM7 19V5H5v14h2z"/></svg>
          </button>
          <button className="daw-transport-btn" onClick={stopEverything}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>
          </button>
          <button className={`daw-transport-btn daw-play-btn ${isPlaying&&!isRecording?'active':''}`} onClick={()=>isPlaying?stopPlayback():startPlayback()} disabled={isRecording}>
            {isPlaying&&!isRecording
              ? <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="4" width="5" height="16" rx="1"/><rect x="14" y="4" width="5" height="16" rx="1"/></svg>
              : <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>}
          </button>
          <button className={`daw-transport-btn daw-rec-btn ${isRecording?'active':''}`} onClick={()=>isRecording?stopRecording():startRecording()}>
            <span className="daw-rec-dot"></span>
          </button>
          <div className="daw-lcd">
            <span className="daw-lcd-time">{fmt(currentTime)}</span>
            <span className="daw-lcd-sep">|</span>
            <span className="daw-lcd-bpm">{bpm} BPM</span>
          </div>
          <button className={`daw-transport-btn daw-metro-btn ${metronomeOn?'active':''}`} onClick={()=>setMetronomeOn(!metronomeOn)} title="Metronome">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L8 22h8L12 2z"/><line x1="12" y1="8" x2="18" y2="4"/></svg>
          </button>
          <button className={`daw-transport-btn ${countIn?'active':''}`} onClick={()=>setCountIn(!countIn)} title="Count-in" style={{fontSize:'0.7rem',fontWeight:800}}>1234</button>
        </div>

        {/* ═══ View Toggle ═══ */}
        <div className="daw-topbar-center-tabs">
          <button className={`daw-view-tab ${viewMode==='record'?'active':''}`} onClick={()=>setViewMode('record')}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="8"/></svg>
            Record
          </button>
          <button className={`daw-view-tab ${viewMode==='arrange'?'active':''}`} onClick={()=>setViewMode('arrange')}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
            Arrange
          </button>
          <button className={`daw-view-tab ${viewMode==='console'?'active':''}`} onClick={()=>setViewMode('console')}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><circle cx="4" cy="12" r="2"/><circle cx="12" cy="10" r="2"/><circle cx="20" cy="14" r="2"/></svg>
            Console
          </button>
          <button className={`daw-view-tab ${viewMode==='beatmaker'?'active':''}`} onClick={()=>setViewMode('beatmaker')}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="8" height="8" rx="1"/><rect x="14" y="2" width="8" height="8" rx="1"/><rect x="2" y="14" width="8" height="8" rx="1"/><rect x="14" y="14" width="8" height="8" rx="1"/></svg>
            Beat Maker
          </button>
          <button className={`daw-view-tab ${viewMode==='piano'?'active':''}`} onClick={()=>setViewMode('piano')} title="Virtual Piano">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><line x1="6" y1="4" x2="6" y2="14"/><line x1="10" y1="4" x2="10" y2="14"/><line x1="14" y1="4" x2="14" y2="14"/><line x1="18" y1="4" x2="18" y2="14"/></svg>
            Piano
          </button>
          <button className={`daw-view-tab ${viewMode==='sounds'?'active':''}`} onClick={()=>setViewMode('sounds')} title="Sound Browser (Freesound.org)">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
            Sounds
          </button>
          <button className={`daw-view-tab ${viewMode==='split'?'active':''}`} onClick={()=>setViewMode('split')} title="Piano + Drums Split">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="9" rx="1"/><rect x="2" y="13" width="20" height="9" rx="1"/></svg>
            Split
          </button>
          <button className={`daw-view-tab ${viewMode==='keyfinder'?'active':''}`} onClick={()=>setViewMode('keyfinder')} title="Key & Scale Detector">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
            Key Finder
          </button>
          <button className={`daw-view-tab ai-tab ${viewMode==='aibeat'?'active':''}`} onClick={()=>setViewMode('aibeat')} title="AI Beat Generator">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a4 4 0 014 4v1h2a2 2 0 012 2v10a2 2 0 01-2 2H6a2 2 0 01-2-2V9a2 2 0 012-2h2V6a4 4 0 014-4z"/></svg>
            AI Beats
          </button>
          <button className={`daw-view-tab ${viewMode==='kits'?'active':''}`} onClick={()=>setViewMode('kits')} title="Sound Kit Manager">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="18" rx="2"/><path d="M2 9h20"/><path d="M9 21V9"/></svg>
            Kits
          </button>
          <button className={`daw-view-tab ${viewMode==='micsim'?'active':''}`} onClick={()=>setViewMode('micsim')} title="Mic Simulator">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
            Mic Sim
          </button>
          <button className={`daw-view-tab ai-tab ${viewMode==='aimix'?'active':''}`} onClick={()=>setViewMode('aimix')} title="AI Mix Assistant">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M8 12h8M12 8v8"/><circle cx="8" cy="8" r="1.5" fill="currentColor"/><circle cx="16" cy="8" r="1.5" fill="currentColor"/></svg>
            AI Mix
          </button>
        </div>

        {/* I/O & Status */}
        <div className="daw-topbar-right">
          <select value={selectedDevice} onChange={e=>setSelectedDevice(e.target.value)} className="daw-input-select">
            <option value="default">Default Mic</option>
            {inputDevices.map(d=><option key={d.deviceId} value={d.deviceId}>{d.label||`Mic ${d.deviceId.slice(0,6)}`}</option>)}
          </select>
          <div className="daw-input-meter"><div className="daw-input-meter-fill" style={{width:`${inputLevel*100}%`}}></div></div>
          <span className="daw-status">{status}</span>
        </div>
      </div>

      {/* ═══════════════════ PROJECT LIST MODAL ═══════════════════ */}
      {showProjectList && (
        <div className="daw-modal-overlay" onClick={()=>setShowProjectList(false)}>
          <div className="daw-modal" onClick={e=>e.stopPropagation()}>
            <h2>Open Project</h2>
            {projects.length===0
              ? <p className="daw-empty">No saved projects</p>
              : <div className="daw-project-list">{projects.map(p=>
                  <button key={p.id} className="daw-project-item" onClick={()=>loadProject(p.id)}>
                    <span>{p.name}</span>
                    <span className="daw-project-meta">{p.bpm} BPM · {new Date(p.updated_at).toLocaleDateString()}</span>
                  </button>
                )}</div>
            }
            <button className="daw-btn" onClick={()=>setShowProjectList(false)}>Close</button>
          </div>
        </div>
      )}

      {/* ═══════════════════ MAIN VIEW AREA ═══════════════════ */}
      <div className="daw-main">

        {/* ──────── RECORD VIEW ──────── */}
        {viewMode === 'record' && (
          <>
            <div className="daw-tracks-area">
              <div className="daw-ruler">
                <div className="daw-ruler-header"></div>
                <div className="daw-ruler-timeline">
                  {Array.from({length:Math.max(Math.ceil(duration||30),30)},(_,s)=>
                    <div key={s} className="daw-ruler-mark" style={{left:`${(s/Math.max(duration||30,30))*100}%`}}>
                      {s%5===0&&<span>{Math.floor(s/60)}:{String(s%60).padStart(2,'0')}</span>}
                    </div>
                  )}
                  {duration>0&&<div className="daw-ruler-playhead" style={{left:`${(currentTime/Math.max(duration,1))*100}%`}}></div>}
                </div>
              </div>
              {tracks.map((track,i)=>(
                <div key={i} className={`daw-track-row ${track.armed?'armed':''} ${track.muted?'muted':''} ${track.solo?'soloed':''} ${activeEffectsTrack===i?'fx-open':''}`}>
                  <div className="daw-track-strip">
                    <div className="daw-track-color-bar" style={{background:track.color}}></div>
                    <input className="daw-track-name-input" value={track.name} onChange={e=>updateTrack(i,{name:e.target.value})} />
                    <div className="daw-track-btns">
                      <button className={`daw-badge r ${track.armed?'on':''}`} onClick={()=>setTracks(p=>p.map((t,idx)=>({...t,armed:idx===i?!t.armed:false})))}>R</button>
                      <button className={`daw-badge m ${track.muted?'on':''}`} onClick={()=>{updateTrack(i,{muted:!track.muted});if(trackGainsRef.current[i])trackGainsRef.current[i].gain.value=!track.muted?0:track.volume;}}>M</button>
                      <button className={`daw-badge s ${track.solo?'on':''}`} onClick={()=>updateTrack(i,{solo:!track.solo})}>S</button>
                    </div>
                    <div className="daw-track-vol">
                      <input type="range" min="0" max="1" step="0.01" value={track.volume} onChange={e=>{const v=parseFloat(e.target.value);updateTrack(i,{volume:v});if(trackGainsRef.current[i])trackGainsRef.current[i].gain.value=v;}} className="daw-knob-slider" />
                      <span className="daw-vol-val">{Math.round(track.volume*100)}</span>
                    </div>
                    <div className="daw-track-pan">
                      <input type="range" min="-1" max="1" step="0.01" value={track.pan} onChange={e=>{const v=parseFloat(e.target.value);updateTrack(i,{pan:v});if(trackPansRef.current[i])trackPansRef.current[i].pan.value=v;}} className="daw-pan-slider" />
                      <span className="daw-pan-val">{track.pan===0?'C':track.pan<0?`L${Math.abs(Math.round(track.pan*50))}`:`R${Math.round(track.pan*50)}`}</span>
                    </div>
                    <div className="daw-track-actions-strip">
                      <button className="daw-tiny-btn" onClick={()=>handleImport(i)} title="Import"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></button>
                      <button className="daw-tiny-btn" onClick={()=>clearTrack(i)} title="Clear"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
                      <button className="daw-tiny-btn" onClick={()=>setActiveEffectsTrack(activeEffectsTrack===i?null:i)} title="FX"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg></button>
                      <button className="daw-tiny-btn" onClick={()=>removeTrack(i)} title="Remove"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
                    </div>
                  </div>
                  <div className="daw-track-region">
                    {track.audioBuffer
                      ? <div className="daw-region-block" style={{'--region-color':track.color}}><div className="daw-region-label">{track.name}</div><canvas ref={el=>{canvasRefs.current[i]=el;}} width={1200} height={96} className="daw-waveform-canvas" /></div>
                      : <div className="daw-region-empty">{track.armed?<span className="daw-armed-label">● Armed</span>:<span>Empty</span>}</div>}
                    {duration>0&&<div className="daw-track-playhead" style={{left:`${(currentTime/Math.max(duration,1))*100}%`}}></div>}
                  </div>
                </div>
              ))}
              <div className="daw-add-track-row">
                <button className="daw-add-track-btn" onClick={addTrack} disabled={tracks.length >= maxTracks}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  Add Track ({tracks.length}/{maxTracks})
                </button>
                <span className="daw-tier-label">{userTier.charAt(0).toUpperCase() + userTier.slice(1)} tier</span>
              </div>
            </div>
          </>
        )}

        {/* ──────── ARRANGE VIEW ──────── */}
        {viewMode === 'arrange' && (
          <ArrangerView
            tracks={tracks} setTracks={setTracks} bpm={bpm}
            timeSignatureTop={timeSignature[0]} timeSignatureBottom={timeSignature[1]}
            masterVolume={masterVolume} onMasterVolumeChange={setMasterVolume}
            projectName={projectName} userTier={userTier}
            playheadBeat={playheadBeat} isPlaying={isPlaying} isRecording={isRecording}
            onPlay={handleArrangerPlay} onStop={handleArrangerStop} onRecord={handleArrangerRecord}
            onSeek={seekToBeat} onBpmChange={handleBpmChange}
            onTimeSignatureChange={handleTimeSignatureChange} onToggleFx={handleToggleFx}
            onBounce={handleMixdown} onSave={saveProject} saving={saving}
          />
        )}

        {/* ──────── CONSOLE / MIXER VIEW (Cubase MixConsole) ──────── */}
        {/* FIX: Meters now use real-time AnalyserNode levels instead of static track.volume */}
        {viewMode === 'console' && (
          <div className="daw-console">
            <div className="daw-console-scroll">
              {tracks.map((track, i) => {
                const fx = track.effects;
                const insertSlots = [
                  { key: 'eq',         label: 'EQ',          on: fx.eq.enabled,         cls: 'eq' },
                  { key: 'compressor', label: 'Compressor',  on: fx.compressor.enabled, cls: 'comp' },
                  { key: 'reverb',     label: 'Reverb',      on: fx.reverb.enabled,     cls: 'reverb' },
                  { key: 'delay',      label: 'Delay',       on: fx.delay.enabled,      cls: 'delay' },
                  { key: 'distortion', label: 'Distortion',  on: fx.distortion.enabled, cls: 'distortion' },
                  { key: 'filter',     label: `Filter ${fx.filter.type === 'lowpass' ? 'LP' : fx.filter.type === 'highpass' ? 'HP' : fx.filter.type === 'bandpass' ? 'BP' : 'N'}`, on: fx.filter.enabled, cls: 'filter' },
                ];
                const panLabel = track.pan === 0 ? 'C' : track.pan < 0 ? `L${Math.abs(Math.round(track.pan * 50))}` : `R${Math.round(track.pan * 50)}`;
                const volDb = track.volume > 0 ? (20 * Math.log10(track.volume)).toFixed(1) : '-∞';

                // FIX: Real-time meter levels from AnalyserNodes
                const level = meterLevels[i] || { left: 0, right: 0, peak: 0 };
                const meterL = level.left * 100;
                const meterR = level.right * 100;

                return (
                  <div key={i} className={`daw-channel ${activeEffectsTrack === i ? 'selected' : ''}`}>
                    {/* Routing */}
                    <div className="daw-ch-routing">
                      <span className="daw-ch-routing-label">Routing</span>
                      <span className="daw-ch-routing-value">Mono In 2 (Mic)</span>
                      <span className="daw-ch-routing-value">{track.solo ? 'Solo Bus' : 'Stereo Out'}</span>
                    </div>

                    {/* Inserts */}
                    <div className="daw-ch-inserts">
                      <span className="daw-ch-inserts-label">Inserts</span>
                      {insertSlots.map(slot => (
                        <div
                          key={slot.key}
                          className={`daw-ch-insert-slot ${slot.on ? `active ${slot.cls}` : 'inactive'}`}
                          onClick={() => {
                            setActiveEffectsTrack(i);
                            updateEffect(i, slot.key, 'enabled', !slot.on);
                          }}
                          title={`${slot.label} — click to toggle`}
                        >
                          {slot.label}
                        </div>
                      ))}
                    </div>

                    {/* M S L e */}
                    <div className="daw-ch-controls">
                      <div className={`daw-ch-badge ${track.muted ? 'm-on' : ''}`}
                        onClick={() => { updateTrack(i, { muted: !track.muted }); if (trackGainsRef.current[i]) trackGainsRef.current[i].gain.value = !track.muted ? 0 : track.volume; }}>M</div>
                      <div className={`daw-ch-badge ${track.solo ? 's-on' : ''}`}
                        onClick={() => updateTrack(i, { solo: !track.solo })}>S</div>
                      <div className="daw-ch-badge" onClick={() => { /* listen/monitor placeholder */ }}>L</div>
                      <div className={`daw-ch-badge ${activeEffectsTrack === i ? 'e-on' : ''}`}
                        onClick={() => setActiveEffectsTrack(activeEffectsTrack === i ? null : i)}>e</div>
                    </div>

                    {/* Pan */}
                    <div className="daw-ch-pan">
                      <input
                        type="range" min="-1" max="1" step="0.02" value={track.pan}
                        className="daw-ch-pan-display"
                        style={{ background: 'transparent', cursor: 'pointer', border: 'none', WebkitAppearance: 'none', appearance: 'none', height: '18px', width: '100%' }}
                        onChange={e => { const v = parseFloat(e.target.value); updateTrack(i, { pan: v }); if (trackPansRef.current[i]) trackPansRef.current[i].pan.value = v; }}
                        title={panLabel}
                      />
                    </div>
                    <div style={{ textAlign: 'center', fontSize: '0.58rem', color: '#5a7088', fontFamily: "'JetBrains Mono', monospace", padding: '1px 0' }}>
                      {panLabel}
                    </div>

                    {/* Fader + Meter — FIX: Real-time AnalyserNode levels */}
                    <div className="daw-ch-fader-area">
                      <div className="daw-ch-meter">
                        <div className="daw-ch-meter-bar">
                          <div className="daw-ch-meter-fill" style={{ height: `${isPlaying ? Math.max(meterL, 2) : 0}%`, transition: isPlaying ? 'height 0.06s linear' : 'height 0.4s ease-out' }}></div>
                        </div>
                        <div className="daw-ch-meter-bar">
                          <div className="daw-ch-meter-fill" style={{ height: `${isPlaying ? Math.max(meterR, 2) : 0}%`, transition: isPlaying ? 'height 0.06s linear' : 'height 0.4s ease-out' }}></div>
                        </div>
                      </div>
                      <div className="daw-ch-fader">
                        <input type="range" min="0" max="1" step="0.005" value={track.volume}
                          onChange={e => { const v = parseFloat(e.target.value); updateTrack(i, { volume: v }); if (trackGainsRef.current[i]) trackGainsRef.current[i].gain.value = v; }}
                          orient="vertical" />
                      </div>
                      <div className="daw-ch-vol-display">
                        <span className="daw-ch-vol-val">{volDb}</span>
                      </div>
                    </div>

                    {/* R/W Automation */}
                    <div className="daw-ch-automation">
                      <div className="daw-ch-rw">R</div>
                      <div className="daw-ch-rw">W</div>
                    </div>

                    {/* Record Enable */}
                    <div className="daw-ch-rec">
                      <div className={`daw-ch-rec-btn ${track.armed ? 'armed' : ''}`}
                        onClick={() => setTracks(p => p.map((t, idx) => ({ ...t, armed: idx === i ? !t.armed : false })))} />
                    </div>

                    {/* Channel Name */}
                    <div className="daw-ch-name">
                      <div className="daw-ch-number"><span className="daw-ch-type-icon">🎵</span> {i + 1}</div>
                      <input className="daw-ch-name-input" value={track.name} onChange={e => updateTrack(i, { name: e.target.value })} />
                    </div>
                  </div>
                );
              })}

              {/* ── Master Channel — FIX: Real-time meter levels ── */}
              <div className="daw-channel master-channel">
                <div className="daw-ch-routing">
                  <span className="daw-ch-routing-label">Routing</span>
                  <span className="daw-ch-routing-value">Stereo Out</span>
                </div>
                <div className="daw-ch-inserts">
                  <span className="daw-ch-inserts-label">Inserts</span>
                </div>
                <div className="daw-ch-controls">
                  <div className="daw-ch-badge">M</div>
                  <div className="daw-ch-badge">S</div>
                </div>
                <div className="daw-ch-pan">
                  <div className="daw-ch-pan-display" style={{ textAlign: 'center' }}>C</div>
                </div>
                <div style={{ textAlign: 'center', fontSize: '0.58rem', color: '#5a7088', fontFamily: "'JetBrains Mono', monospace", padding: '1px 0' }}>C</div>
                <div className="daw-ch-fader-area">
                  <div className="daw-ch-meter">
                    <div className="daw-ch-meter-bar">
                      <div className="daw-ch-meter-fill" style={{ height: `${isPlaying ? Math.max((meterLevels.reduce((a, l) => Math.max(a, l?.left || 0), 0)) * 90, 2) : 0}%`, transition: isPlaying ? 'height 0.06s linear' : 'height 0.4s ease-out' }}></div>
                    </div>
                    <div className="daw-ch-meter-bar">
                      <div className="daw-ch-meter-fill" style={{ height: `${isPlaying ? Math.max((meterLevels.reduce((a, l) => Math.max(a, l?.right || 0), 0)) * 90, 2) : 0}%`, transition: isPlaying ? 'height 0.06s linear' : 'height 0.4s ease-out' }}></div>
                    </div>
                  </div>
                  <div className="daw-ch-fader">
                    <input type="range" min="0" max="1" step="0.005" value={masterVolume}
                      onChange={e => setMasterVolume(parseFloat(e.target.value))} orient="vertical" />
                  </div>
                  <div className="daw-ch-vol-display">
                    <span className="daw-ch-vol-val">{masterVolume > 0 ? (20 * Math.log10(masterVolume)).toFixed(1) : '-∞'}</span>
                  </div>
                </div>
                <div className="daw-ch-automation">
                  <div className="daw-ch-rw">R</div>
                  <div className="daw-ch-rw">W</div>
                </div>
                <div className="daw-ch-rec"></div>
                <div className="daw-ch-name">
                  <div className="daw-ch-number">🔊 M</div>
                  <input className="daw-ch-name-input" value="Master" readOnly style={{ cursor: 'default' }} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ──────── BEAT MAKER VIEW ──────── */}
        {viewMode === 'beatmaker' && (
          <SamplerBeatMaker
            onExport={handleBeatExport}
            onClose={() => setViewMode('record')}
            isEmbedded={true}
          />
        )}

        {/* ──────── VIRTUAL PIANO VIEW ──────── */}
        {viewMode === 'piano' && (
          <div className="daw-piano-view">
            <VirtualPiano
              audioContext={audioCtxRef.current}
              onRecordingComplete={handlePianoRecordingComplete}
              embedded={true}
            />
          </div>
        )}

        {/* ──────── FREESOUND BROWSER VIEW ──────── */}
        {viewMode === 'sounds' && (
          <div className="daw-freesound-view">
            <FreesoundBrowser
              audioContext={audioCtxRef.current}
              onSoundSelect={handleFreesoundSelect}
              onClose={() => setViewMode('record')}
              isEmbedded={true}
            />
          </div>
        )}

        {/* ──────── PIANO + DRUMS SPLIT VIEW ──────── */}
        {viewMode === 'split' && (
          <div className="daw-split-view">
            <PianoDrumSplit
              audioContext={audioCtxRef.current}
              onRecordingComplete={handleSplitRecordingComplete}
              isEmbedded={true}
            />
          </div>
        )}

        {/* ──────── KEY FINDER VIEW ──────── */}
        {viewMode === 'keyfinder' && (
          <div className="daw-keyfinder-view">
            <KeyFinder
              tracks={tracks}
              audioContext={audioCtxRef.current}
              onClose={() => setViewMode('record')}
              isEmbedded={true}
            />
          </div>
        )}

        {/* ──────── AI BEAT ASSISTANT VIEW ──────── */}
        {viewMode === 'aibeat' && (
          <div className="daw-aibeat-view">
            <AIBeatAssistant
              onApplyPattern={handleAIBeatApply}
              onClose={() => setViewMode('beatmaker')}
              isEmbedded={true}
            />
          </div>
        )}

        {/* ──────── SOUND KIT MANAGER VIEW ──────── */}
        {viewMode === 'kits' && (
          <div className="daw-kits-view">
            <SoundKitManager
              audioContext={audioCtxRef.current}
              onLoadKit={handleLoadKit}
              onLoadSample={handleLoadKitSample}
              currentPads={null}
              onClose={() => setViewMode('beatmaker')}
              isEmbedded={true}
            />
          </div>
        )}

        {/* ──────── FX PANEL (with Parametric EQ Graph) ──────── */}
        {(viewMode === 'record' || viewMode === 'console') && afx && (
          <div className="daw-fx-panel">
            <div className="daw-fx-header">
              <span style={{color:afx.color}}>●</span>
              <span>{afx.name} — Effects</span>
              <button className="daw-fx-close" onClick={()=>setActiveEffectsTrack(null)}>✕</button>
            </div>
            {[
              {key:'eq',label:'EQ',params:[{p:'lowGain',l:'Low',min:-12,max:12,step:0.5,fmt:v=>`${v>0?'+':''}${v}dB`},{p:'midGain',l:'Mid',min:-12,max:12,step:0.5,fmt:v=>`${v>0?'+':''}${v}dB`},{p:'midFreq',l:'Mid Freq',min:200,max:8000,step:10,fmt:v=>v>=1000?(v/1000).toFixed(1)+'k':v},{p:'highGain',l:'High',min:-12,max:12,step:0.5,fmt:v=>`${v>0?'+':''}${v}dB`}]},
              {key:'compressor',label:'Compressor',params:[{p:'threshold',l:'Thresh',min:-60,max:0,step:1,fmt:v=>`${v}dB`},{p:'ratio',l:'Ratio',min:1,max:20,step:0.5,fmt:v=>`${v}:1`},{p:'attack',l:'Attack',min:0,max:1,step:0.001,fmt:v=>`${(v*1000).toFixed(0)}ms`},{p:'release',l:'Release',min:0.01,max:1,step:0.01,fmt:v=>`${(v*1000).toFixed(0)}ms`}]},
              {key:'reverb',label:'Reverb',params:[{p:'mix',l:'Mix',min:0,max:1,step:0.01,fmt:v=>`${Math.round(v*100)}%`},{p:'decay',l:'Decay',min:0.1,max:8,step:0.1,fmt:v=>`${v.toFixed(1)}s`}]},
              {key:'delay',label:'Delay',params:[{p:'time',l:'Time',min:0.01,max:2,step:0.01,fmt:v=>`${(v*1000).toFixed(0)}ms`},{p:'feedback',l:'Feedback',min:0,max:0.9,step:0.01,fmt:v=>`${Math.round(v*100)}%`},{p:'mix',l:'Mix',min:0,max:1,step:0.01,fmt:v=>`${Math.round(v*100)}%`}]},
              {key:'distortion',label:'Distortion',params:[{p:'amount',l:'Amount',min:0,max:100,step:1,fmt:v=>v}]},
              {key:'filter',label:'Filter',params:[{p:'frequency',l:'Freq',min:20,max:20000,step:1,fmt:v=>v>=1000?(v/1000).toFixed(1)+'k':v},{p:'Q',l:'Q',min:0.1,max:18,step:0.1,fmt:v=>v.toFixed(1)}],extra:(
                <div className="daw-fx-param"><label>Type</label><select value={afx.effects.filter.type} onChange={e=>updateEffect(activeEffectsTrack,'filter','type',e.target.value)} className="daw-fx-select"><option value="lowpass">Low Pass</option><option value="highpass">High Pass</option><option value="bandpass">Band Pass</option><option value="notch">Notch</option></select></div>
              )}
            ].map(({key,label,params,extra})=>(
              <div key={key} className={`daw-fx-block ${afx.effects[key].enabled?'enabled':''}`}>
                <div className="daw-fx-block-header">
                  <button className="daw-fx-toggle" onClick={()=>updateEffect(activeEffectsTrack,key,'enabled',!afx.effects[key].enabled)}>{afx.effects[key].enabled?'◉':'○'}</button>
                  <span>{label}</span>
                </div>
                {/* ══ PARAMETRIC EQ GRAPH — only renders inside the EQ block ══ */}
                {key === 'eq' && afx.effects.eq.enabled && (
                  <div style={{ padding: '4px 6px 2px' }}>
                    <ParametricEQGraph
                      eq={afx.effects.eq}
                      onChange={handleEQGraphChange}
                      width={260}
                      height={140}
                      compact={true}
                      showLabels={true}
                    />
                  </div>
                )}
                <div className="daw-fx-controls">
                  {extra}
                  {params.map(({p,l,min,max,step,fmt})=>(
                    <div key={p} className="daw-fx-param"><label>{l}</label><input type="range" min={min} max={max} step={step} value={afx.effects[key][p]} onChange={e=>updateEffect(activeEffectsTrack,key,p,parseFloat(e.target.value))} /><span>{fmt(afx.effects[key][p])}</span></div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ──────── MIC SIMULATOR VIEW ──────── */}
        {viewMode === 'micsim' && (
          <div className="daw-micsim-view">
            <MicSimulator
              audioContext={audioCtxRef.current}
              inputStream={micSimStream}
              onRecordingComplete={handleMicSimRecordingComplete}
              embedded={true}
              defaultMic="sm7b"
              showRecordButton={true}
            />
          </div>
        )}

        {/* ──────── AI MIX ASSISTANT VIEW ──────── */}
        {viewMode === 'aimix' && (
          <div className="daw-aimix-view">
            <AIMixAssistant
              tracks={tracks} projectId={projectId}
              onApplyVolume={handleAIApplyVolume} onApplyPan={handleAIApplyPan}
              onApplyEQ={handleAIApplyEQ} onApplyCompression={handleAIApplyCompression}
              onClose={() => setViewMode('record')}
            />
          </div>
        )}
      </div>

      {/* ═══════════════════ MASTER BAR ═══════════════════ */}
      <div className="daw-master-bar">
        <div className="daw-master-vol">
          <span>Master</span>
          <input type="range" min="0" max="1" step="0.01" value={masterVolume} onChange={e=>setMasterVolume(parseFloat(e.target.value))} className="daw-master-slider" />
          <span className="daw-master-val">{Math.round(masterVolume*100)}%</span>
        </div>
        <div className="daw-master-info">
          <span className="daw-tier-badge" data-tier={userTier}>{userTier.charAt(0).toUpperCase() + userTier.slice(1)}</span>
          <span className="daw-track-count">{tracks.length}/{maxTracks} tracks</span>
        </div>
        <button className="daw-bounce-btn" onClick={handleMixdown} disabled={mixingDown||!tracks.some(t=>t.audioBuffer)}>
          {mixingDown?'Bouncing...':'Bounce'}
        </button>
      </div>
    </div>
  );
};

export default RecordingStudio;