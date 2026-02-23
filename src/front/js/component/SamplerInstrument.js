// =============================================================================
// SamplerInstrument.js — Track-level Sampler for StreamPireX Recording Studio
// Logic/Kontakt-style sampler: waveform, trim, loop, ADSR, pitch, filter, reverse
// =============================================================================

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';

// ── Note names ──
const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const noteLabel = (n) => `${NOTE_NAMES[n % 12]}${Math.floor(n / 12) - 1}`;

// ── QWERTY → semitone offset (2 octaves) ──
const QWERTY_MAP = {
  'z':0,'s':1,'x':2,'d':3,'c':4,'v':5,'g':6,'b':7,'h':8,'n':9,'j':10,'m':11,
  'q':12,'2':13,'w':14,'3':15,'e':16,'r':17,'5':18,'t':19,'6':20,'y':21,'7':22,'u':23,'i':24,
};

const SamplerInstrument = ({ track, trackIndex, onUpdate, audioCtx: externalCtx, onSendToBeatMaker, onSendToTrack }) => {
  // ── State ──
  const [sample, setSample] = useState(null);        // AudioBuffer
  const [sampleName, setSampleName] = useState('');
  const [rootNote, setRootNote] = useState(60);       // C4
  const [pitch, setPitch] = useState(0);              // semitones
  const [volume, setVolume] = useState(0.8);
  const [trimStart, setTrimStart] = useState(0);      // seconds
  const [trimEnd, setTrimEnd] = useState(0);          // seconds
  const [loopEnabled, setLoopEnabled] = useState(false);
  const [loopStart, setLoopStart] = useState(0);
  const [loopEnd, setLoopEnd] = useState(0);
  const [reversed, setReversed] = useState(false);
  const [playMode, setPlayMode] = useState('oneshot'); // oneshot | hold | loop | gate

  // ADSR
  const [attack, setAttack] = useState(0.005);
  const [decay, setDecay] = useState(0.1);
  const [sustain, setSustain] = useState(0.8);
  const [release, setRelease] = useState(0.2);

  // Filter
  const [filterType, setFilterType] = useState('lowpass');
  const [filterFreq, setFilterFreq] = useState(20000);
  const [filterQ, setFilterQ] = useState(1);
  const [filterEnabled, setFilterEnabled] = useState(false);

  // UI state
  const [activeTab, setActiveTab] = useState('main');
  const [draggingTrim, setDraggingTrim] = useState(null); // 'start' | 'end' | 'loopStart' | 'loopEnd' | null
  const [activeKeys, setActiveKeys] = useState(new Set());
  const [isPlaying, setIsPlaying] = useState(false);

  // Refs
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const activeVoices = useRef({});
  const fileInputRef = useRef(null);

  // ── Audio Context ──
  const getCtx = useCallback(() => {
    if (externalCtx) return externalCtx;
    if (!ctxRef.current) ctxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    if (ctxRef.current.state === 'suspended') ctxRef.current.resume();
    return ctxRef.current;
  }, [externalCtx]);

  // ── Load Sample ──
  const loadSample = useCallback(async (file) => {
    const ctx = getCtx();
    const arrayBuf = await file.arrayBuffer();
    const audioBuf = await ctx.decodeAudioData(arrayBuf);
    setSample(audioBuf);
    setSampleName(file.name.replace(/\.[^/.]+$/, ''));
    setTrimStart(0);
    setTrimEnd(audioBuf.duration);
    setLoopStart(0);
    setLoopEnd(audioBuf.duration);
  }, [getCtx]);

  // ── Drop handler ──
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const file = e.dataTransfer?.files?.[0];
    if (file && file.type.startsWith('audio/')) loadSample(file);
  }, [loadSample]);

  const handleFileSelect = useCallback((e) => {
    const file = e.target.files?.[0];
    if (file) loadSample(file);
  }, [loadSample]);

  // ── Draw Waveform ──
  const drawWaveform = useCallback(() => {
    const cv = canvasRef.current;
    if (!cv || !sample) return;
    const ctx = cv.getContext('2d');
    const w = cv.width, h = cv.height;
    const data = sample.getChannelData(0);
    const dur = sample.duration;

    ctx.clearRect(0, 0, w, h);

    // Background
    ctx.fillStyle = '#0a1018';
    ctx.fillRect(0, 0, w, h);

    // Grid lines
    ctx.strokeStyle = 'rgba(0, 255, 200, 0.04)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 10; i++) {
      const x = (i / 10) * w;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    ctx.beginPath(); ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2); ctx.stroke();

    // Trim region overlay
    const tsX = (trimStart / dur) * w;
    const teX = (trimEnd / dur) * w;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    if (trimStart > 0) ctx.fillRect(0, 0, tsX, h);
    if (trimEnd < dur) ctx.fillRect(teX, 0, w - teX, h);

    // Loop region
    if (loopEnabled) {
      const lsX = (loopStart / dur) * w;
      const leX = (loopEnd / dur) * w;
      ctx.fillStyle = 'rgba(0, 255, 200, 0.05)';
      ctx.fillRect(lsX, 0, leX - lsX, h);
      // Loop markers
      ctx.strokeStyle = '#00ffc8';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(lsX, 0); ctx.lineTo(lsX, h); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(leX, 0); ctx.lineTo(leX, h); ctx.stroke();
      ctx.setLineDash([]);
    }

    // Waveform
    const step = Math.max(1, Math.floor(data.length / w));
    ctx.beginPath();
    ctx.strokeStyle = '#00ffc8';
    ctx.lineWidth = 1;
    for (let i = 0; i < w; i++) {
      const idx = Math.floor((i / w) * data.length);
      let min = 1, max = -1;
      for (let j = 0; j < step; j++) {
        const v = data[idx + j] || 0;
        if (v < min) min = v;
        if (v > max) max = v;
      }
      const yMin = ((1 - max) / 2) * h;
      const yMax = ((1 - min) / 2) * h;
      if (i === 0) ctx.moveTo(i, yMin);
      ctx.lineTo(i, yMin);
      ctx.lineTo(i, yMax);
    }
    ctx.stroke();

    // RMS fill
    ctx.beginPath();
    ctx.fillStyle = 'rgba(0, 255, 200, 0.15)';
    for (let i = 0; i < w; i++) {
      const idx = Math.floor((i / w) * data.length);
      let sum = 0;
      for (let j = 0; j < step; j++) sum += (data[idx + j] || 0) ** 2;
      const rms = Math.sqrt(sum / step);
      const yTop = ((1 - rms) / 2) * h;
      const yBot = ((1 + rms) / 2) * h;
      if (i === 0) ctx.moveTo(i, yTop);
      ctx.lineTo(i, yTop);
    }
    for (let i = w - 1; i >= 0; i--) {
      const idx = Math.floor((i / w) * data.length);
      let sum = 0;
      for (let j = 0; j < step; j++) sum += (data[idx + j] || 0) ** 2;
      const rms = Math.sqrt(sum / step);
      const yBot = ((1 + rms) / 2) * h;
      ctx.lineTo(i, yBot);
    }
    ctx.fill();

    // Trim handles
    ctx.fillStyle = '#FF6600';
    ctx.fillRect(tsX - 2, 0, 4, h);
    ctx.fillRect(teX - 2, 0, 4, h);

    // Labels
    ctx.fillStyle = '#FF6600';
    ctx.font = '9px monospace';
    ctx.fillText('S', tsX + 4, 12);
    ctx.fillText('E', teX - 12, 12);

    if (loopEnabled) {
      ctx.fillStyle = '#00ffc8';
      ctx.fillText('L', ((loopStart / dur) * w) + 4, h - 6);
      ctx.fillText('L', ((loopEnd / dur) * w) - 12, h - 6);
    }
  }, [sample, trimStart, trimEnd, loopEnabled, loopStart, loopEnd]);

  useEffect(() => { drawWaveform(); }, [drawWaveform]);

  // ── Canvas mouse interaction for trim/loop handles ──
  const handleCanvasMouseDown = useCallback((e) => {
    if (!sample || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const dur = sample.duration;
    const w = canvasRef.current.width;
    const time = (x / w) * dur;

    const tsX = (trimStart / dur) * w;
    const teX = (trimEnd / dur) * w;

    if (Math.abs(x - tsX) < 8) setDraggingTrim('start');
    else if (Math.abs(x - teX) < 8) setDraggingTrim('end');
    else if (loopEnabled) {
      const lsX = (loopStart / dur) * w;
      const leX = (loopEnd / dur) * w;
      if (Math.abs(x - lsX) < 8) setDraggingTrim('loopStart');
      else if (Math.abs(x - leX) < 8) setDraggingTrim('loopEnd');
    }
  }, [sample, trimStart, trimEnd, loopEnabled, loopStart, loopEnd]);

  const handleCanvasMouseMove = useCallback((e) => {
    if (!draggingTrim || !sample || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, canvasRef.current.width));
    const time = (x / canvasRef.current.width) * sample.duration;

    if (draggingTrim === 'start') setTrimStart(Math.min(time, trimEnd - 0.01));
    else if (draggingTrim === 'end') setTrimEnd(Math.max(time, trimStart + 0.01));
    else if (draggingTrim === 'loopStart') setLoopStart(Math.min(time, loopEnd - 0.01));
    else if (draggingTrim === 'loopEnd') setLoopEnd(Math.max(time, loopStart + 0.01));
  }, [draggingTrim, sample, trimStart, trimEnd, loopStart, loopEnd]);

  const handleCanvasMouseUp = useCallback(() => setDraggingTrim(null), []);

  // ── Play note ──
  const playNote = useCallback((midiNote) => {
    if (!sample) return;
    const ctx = getCtx();
    const semitones = midiNote - rootNote + pitch;

    // Source
    const src = ctx.createBufferSource();
    src.buffer = sample;
    src.playbackRate.value = Math.pow(2, semitones / 12);

    // Gain (ADSR)
    const gain = ctx.createGain();
    const now = ctx.currentTime;
    const peakVol = volume;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(peakVol, now + attack);
    gain.gain.linearRampToValueAtTime(peakVol * sustain, now + attack + decay);

    // Filter
    let lastNode = src;
    if (filterEnabled) {
      const filt = ctx.createBiquadFilter();
      filt.type = filterType;
      filt.frequency.value = filterFreq;
      filt.Q.value = filterQ;
      src.connect(filt);
      lastNode = filt;
    }

    lastNode.connect(gain);
    gain.connect(ctx.destination);

    // Loop
    if (loopEnabled || playMode === 'loop') {
      src.loop = true;
      src.loopStart = loopStart;
      src.loopEnd = loopEnd;
    }

    // Start
    const off = reversed ? (sample.duration - trimEnd) : trimStart;
    const dur = trimEnd - trimStart;
    if (playMode === 'loop' || playMode === 'hold') {
      src.start(now, off);
    } else {
      src.start(now, off, dur + release);
    }

    // Release envelope for oneshot
    if (playMode === 'oneshot') {
      const relStart = now + dur;
      gain.gain.setValueAtTime(peakVol * sustain, relStart);
      gain.gain.linearRampToValueAtTime(0, relStart + release);
      src.stop(relStart + release + 0.05);
    }

    activeVoices.current[midiNote] = { src, gain, startTime: now };
    setIsPlaying(true);
    src.onended = () => {
      delete activeVoices.current[midiNote];
      if (Object.keys(activeVoices.current).length === 0) setIsPlaying(false);
    };
  }, [sample, rootNote, pitch, volume, attack, decay, sustain, release, trimStart, trimEnd, loopEnabled, loopStart, loopEnd, playMode, filterEnabled, filterType, filterFreq, filterQ, reversed, getCtx]);

  // ── Stop note ──
  const stopNote = useCallback((midiNote) => {
    const voice = activeVoices.current[midiNote];
    if (!voice) return;
    const ctx = getCtx();
    const now = ctx.currentTime;
    voice.gain.gain.cancelScheduledValues(now);
    voice.gain.gain.setValueAtTime(voice.gain.gain.value, now);
    voice.gain.gain.linearRampToValueAtTime(0, now + release);
    voice.src.stop(now + release + 0.05);
    delete activeVoices.current[midiNote];
  }, [release, getCtx]);

  // ── Keyboard handler ──
  useEffect(() => {
    const kd = (e) => {
      if (['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)) return;
      const k = e.key.toLowerCase();
      if (QWERTY_MAP.hasOwnProperty(k) && !activeKeys.has(k)) {
        e.preventDefault();
        const rootOctBase = Math.floor(rootNote / 12) * 12;
        const midiNote = rootOctBase + QWERTY_MAP[k];
        setActiveKeys(prev => new Set(prev).add(k));
        playNote(midiNote);
      }
    };
    const ku = (e) => {
      const k = e.key.toLowerCase();
      if (QWERTY_MAP.hasOwnProperty(k)) {
        const rootOctBase = Math.floor(rootNote / 12) * 12;
        const midiNote = rootOctBase + QWERTY_MAP[k];
        setActiveKeys(prev => { const n = new Set(prev); n.delete(k); return n; });
        if (playMode === 'hold' || playMode === 'gate') stopNote(midiNote);
      }
    };
    window.addEventListener('keydown', kd);
    window.addEventListener('keyup', ku);
    return () => { window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku); };
  }, [playNote, stopNote, rootNote, playMode, activeKeys]);

  // ── Reverse sample ──
  const reverseSample = useCallback(() => {
    if (!sample) return;
    const ctx = getCtx();
    const rev = ctx.createBuffer(sample.numberOfChannels, sample.length, sample.sampleRate);
    for (let ch = 0; ch < sample.numberOfChannels; ch++) {
      const src = sample.getChannelData(ch);
      const dst = rev.getChannelData(ch);
      for (let i = 0; i < src.length; i++) dst[i] = src[src.length - 1 - i];
    }
    setSample(rev);
    setReversed(!reversed);
  }, [sample, reversed, getCtx]);

  // ── Chop State ──
  const [showChop, setShowChop] = useState(false);
  const [chopPoints, setChopPoints] = useState([]);
  const [chopMode, setChopMode] = useState('transient'); // transient | bpmgrid | equal | manual
  const [chopSensitivity, setChopSensitivity] = useState(0.3);
  const [chopSliceCount, setChopSliceCount] = useState(8);
  const [chopBpm, setChopBpm] = useState(120);
  const [activeSlice, setActiveSlice] = useState(-1);
  const chopCanvasRef = useRef(null);

  // ── Zero-crossing snap ──
  const zeroCrossSnap = useCallback((buffer, time) => {
    if (!buffer) return time;
    const data = buffer.getChannelData(0);
    const sr = buffer.sampleRate;
    const center = Math.round(time * sr);
    const window = Math.round(sr * 0.002); // 2ms window
    let bestIdx = center, bestVal = Math.abs(data[center] || 0);
    for (let i = Math.max(0, center - window); i < Math.min(data.length, center + window); i++) {
      const v = Math.abs(data[i] || 0);
      if (v < bestVal) { bestVal = v; bestIdx = i; }
    }
    return bestIdx / sr;
  }, []);

  // ── Auto-Chop ──
  const autoChop = useCallback(() => {
    if (!sample) return;
    const data = sample.getChannelData(0);
    const dur = sample.duration;
    const sr = sample.sampleRate;
    let points = [];

    if (chopMode === 'transient') {
      // Transient detection via energy difference
      const blockSize = Math.round(sr * 0.01); // 10ms blocks
      const numBlocks = Math.floor(data.length / blockSize);
      let prevEnergy = 0;
      const minGap = sr * 0.05; // 50ms min between chops
      let lastChopSample = 0;
      for (let b = 0; b < numBlocks; b++) {
        let energy = 0;
        const start = b * blockSize;
        for (let i = start; i < start + blockSize && i < data.length; i++) {
          energy += data[i] * data[i];
        }
        energy /= blockSize;
        if (energy > chopSensitivity * 0.1 && energy > prevEnergy * 3 && b > 0) {
          const samplePos = start;
          if (samplePos - lastChopSample > minGap) {
            const t = zeroCrossSnap(sample, samplePos / sr);
            if (t > 0.01 && t < dur - 0.01) {
              points.push(t);
              lastChopSample = samplePos;
            }
          }
        }
        prevEnergy = energy;
      }
    } else if (chopMode === 'bpmgrid') {
      const beatDur = 60 / chopBpm;
      const sliceDur = beatDur / 4; // 16th note grid
      for (let t = sliceDur; t < dur - 0.01; t += sliceDur) {
        points.push(zeroCrossSnap(sample, t));
      }
    } else if (chopMode === 'equal') {
      const sliceDur = dur / chopSliceCount;
      for (let i = 1; i < chopSliceCount; i++) {
        points.push(zeroCrossSnap(sample, sliceDur * i));
      }
    }

    setChopPoints(points.sort((a, b) => a - b));
  }, [sample, chopMode, chopSensitivity, chopBpm, chopSliceCount, zeroCrossSnap]);

  // ── Manual chop point on canvas click ──
  const handleChopCanvasClick = useCallback((e) => {
    if (!sample || !chopCanvasRef.current) return;
    if (chopMode !== 'manual') return;
    const rect = chopCanvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const time = (x / chopCanvasRef.current.width) * sample.duration;
    const snapped = zeroCrossSnap(sample, time);
    // Check if near existing point — if so, remove it
    const nearIdx = chopPoints.findIndex(pt => Math.abs(pt - snapped) < 0.02);
    if (nearIdx !== -1) {
      setChopPoints(prev => prev.filter((_, i) => i !== nearIdx));
    } else {
      setChopPoints(prev => [...prev, snapped].sort((a, b) => a - b));
    }
  }, [sample, chopMode, chopPoints, zeroCrossSnap]);

  // ── Preview a slice ──
  const previewSlice = useCallback((idx) => {
    if (!sample) return;
    const ctx = getCtx();
    const all = [0, ...chopPoints, sample.duration];
    const start = all[idx] || 0;
    const end = all[idx + 1] || sample.duration;
    const src = ctx.createBufferSource();
    src.buffer = sample;
    src.connect(ctx.destination);
    src.start(0, start, end - start);
    setActiveSlice(idx);
    setTimeout(() => setActiveSlice(-1), (end - start) * 1000);
  }, [sample, chopPoints, getCtx]);

  // ── Draw chop waveform ──
  const drawChopWaveform = useCallback(() => {
    const cv = chopCanvasRef.current;
    if (!cv || !sample) return;
    const ctx = cv.getContext('2d');
    const w = cv.width, h = cv.height;
    const data = sample.getChannelData(0);
    const dur = sample.duration;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#080e14';
    ctx.fillRect(0, 0, w, h);

    // Alternating slice colors
    const all = [0, ...chopPoints, dur];
    for (let i = 0; i < all.length - 1; i++) {
      const x1 = (all[i] / dur) * w;
      const x2 = (all[i + 1] / dur) * w;
      ctx.fillStyle = i % 2 === 0 ? 'rgba(0,255,200,0.03)' : 'rgba(255,102,0,0.03)';
      if (i === activeSlice) ctx.fillStyle = 'rgba(0,255,200,0.1)';
      ctx.fillRect(x1, 0, x2 - x1, h);
    }

    // Waveform
    const step = Math.max(1, Math.floor(data.length / w));
    ctx.beginPath();
    ctx.strokeStyle = '#00ffc8';
    ctx.lineWidth = 1;
    for (let i = 0; i < w; i++) {
      const idx = Math.floor((i / w) * data.length);
      let min = 1, max = -1;
      for (let j = 0; j < step; j++) {
        const v = data[idx + j] || 0;
        if (v < min) min = v;
        if (v > max) max = v;
      }
      const yMin = ((1 - max) / 2) * h;
      const yMax = ((1 - min) / 2) * h;
      if (i === 0) ctx.moveTo(i, yMin);
      ctx.lineTo(i, yMin);
      ctx.lineTo(i, yMax);
    }
    ctx.stroke();

    // Chop lines
    ctx.strokeStyle = '#FF6600';
    ctx.lineWidth = 2;
    chopPoints.forEach((pt) => {
      const x = (pt / dur) * w;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      // Handle triangle
      ctx.fillStyle = '#FF6600';
      ctx.beginPath(); ctx.moveTo(x - 5, 0); ctx.lineTo(x + 5, 0); ctx.lineTo(x, 8); ctx.fill();
    });

    // Center line
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2); ctx.stroke();
  }, [sample, chopPoints, activeSlice]);

  useEffect(() => { if (showChop) drawChopWaveform(); }, [showChop, drawChopWaveform, chopPoints, activeSlice]);

  // ── Send trimmed sample to Beat Maker ──
  const sendToBeatMaker = useCallback(() => {
    if (!sample || !onSendToBeatMaker) return;
    // Create trimmed buffer
    const ctx = getCtx();
    const sr = sample.sampleRate;
    const nc = sample.numberOfChannels;
    const startSamp = Math.floor(trimStart * sr);
    const endSamp = Math.floor(trimEnd * sr);
    const len = endSamp - startSamp;
    if (len <= 0) return;
    const trimmed = ctx.createBuffer(nc, len, sr);
    for (let ch = 0; ch < nc; ch++) {
      const src = sample.getChannelData(ch);
      const dst = trimmed.getChannelData(ch);
      for (let i = 0; i < len; i++) dst[i] = src[startSamp + i] || 0;
    }
    onSendToBeatMaker(trimmed, sampleName || 'Sample');
  }, [sample, trimStart, trimEnd, sampleName, onSendToBeatMaker, getCtx]);

  // ── Send chop slices to Beat Maker ──
  const sendSlicesToBeatMaker = useCallback(() => {
    if (!sample || !onSendToBeatMaker || chopPoints.length === 0) return;
    // Send the whole buffer + chop points — Beat Maker handles distribution
    const ctx = getCtx();
    const all = [0, ...chopPoints, sample.duration];
    const slices = [];
    const sr = sample.sampleRate;
    const nc = sample.numberOfChannels;
    for (let i = 0; i < all.length - 1 && i < 16; i++) {
      const s = Math.floor(all[i] * sr);
      const e = Math.floor(all[i + 1] * sr);
      const len = e - s;
      if (len <= 0) continue;
      // Add 2ms crossfade
      const fadeSamps = Math.min(Math.round(sr * 0.002), Math.floor(len / 4));
      const buf = ctx.createBuffer(nc, len, sr);
      for (let ch = 0; ch < nc; ch++) {
        const src = sample.getChannelData(ch);
        const dst = buf.getChannelData(ch);
        for (let j = 0; j < len; j++) dst[j] = src[s + j] || 0;
        // Fade in
        for (let j = 0; j < fadeSamps; j++) dst[j] *= j / fadeSamps;
        // Fade out
        for (let j = 0; j < fadeSamps; j++) dst[len - 1 - j] *= j / fadeSamps;
      }
      slices.push({ buffer: buf, name: `${sampleName || 'Chop'} ${i + 1}` });
    }
    // Send first slice, store rest for Beat Maker to pick up
    if (slices.length > 0) {
      window.__spx_sampler_slices = slices;
      onSendToBeatMaker(slices[0].buffer, `${sampleName} (${slices.length} slices)`);
    }
  }, [sample, chopPoints, sampleName, onSendToBeatMaker, getCtx]);

  // ── Send to Track ──
  const sendToTrack = useCallback(() => {
    if (!sample || !onSendToTrack) return;
    const ctx = getCtx();
    const sr = sample.sampleRate;
    const nc = sample.numberOfChannels;
    const startSamp = Math.floor(trimStart * sr);
    const endSamp = Math.floor(trimEnd * sr);
    const len = endSamp - startSamp;
    if (len <= 0) return;
    const trimmed = ctx.createBuffer(nc, len, sr);
    for (let ch = 0; ch < nc; ch++) {
      const src = sample.getChannelData(ch);
      const dst = trimmed.getChannelData(ch);
      for (let i = 0; i < len; i++) dst[i] = src[startSamp + i] || 0;
    }
    onSendToTrack(trimmed, sampleName || 'Sample');
  }, [sample, trimStart, trimEnd, sampleName, onSendToTrack, getCtx]);

  // ── Mini keyboard (2 octaves) ──
  const miniKeyboard = useMemo(() => {
    const keys = [];
    const baseNote = Math.floor(rootNote / 12) * 12; // C of root octave
    for (let i = 0; i < 25; i++) {
      const note = baseNote + i;
      const isBlack = [1,3,6,8,10].includes(i % 12);
      const isRoot = note === rootNote;
      // Find QWERTY shortcut
      let shortcut = '';
      Object.entries(QWERTY_MAP).forEach(([key, offset]) => {
        if (offset === i) shortcut = key.toUpperCase();
      });
      keys.push({ note, isBlack, isRoot, shortcut, name: noteLabel(note) });
    }
    return keys;
  }, [rootNote]);

  // ── Format time ──
  const fmtTime = (t) => `${t.toFixed(3)}s`;

  return (
    <div className="sampler-instrument" onDrop={handleDrop} onDragOver={(e) => e.preventDefault()}>
      {/* ── Header ── */}
      <div className="si-header">
        <div className="si-header-left">
          <span className="si-logo">◆</span>
          <span className="si-title">SAMPLER</span>
          {sampleName && <span className="si-sample-name">{sampleName}</span>}
        </div>
        <div className="si-header-right">
          <button className="si-btn" onClick={() => fileInputRef.current?.click()}>📂 Load</button>
          <input ref={fileInputRef} type="file" accept="audio/*" style={{ display: 'none' }} onChange={handleFileSelect} />
          <button className="si-btn" onClick={() => setShowChop(!showChop)} disabled={!sample}>
            {showChop ? '🎵 Main' : '✂️ Chop'}
          </button>
          <button className="si-btn" onClick={reverseSample} disabled={!sample}>⟲ Reverse</button>
          <select className="si-select" value={playMode} onChange={(e) => setPlayMode(e.target.value)}>
            <option value="oneshot">One-Shot</option>
            <option value="hold">Hold</option>
            <option value="loop">Loop</option>
            <option value="gate">Gate</option>
          </select>
          <div className="si-send-btns">
            <button className="si-btn si-btn-send" onClick={sendToBeatMaker} disabled={!sample} title="Send trimmed sample to Beat Maker">
              🥁 → Beat Maker
            </button>
            <button className="si-btn si-btn-send" onClick={sendToTrack} disabled={!sample} title="Place sample on selected track">
              🎚 → Track {(trackIndex || 0) + 1}
            </button>
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="si-tabs">
        {['main','envelope','filter','settings'].map(tab => (
          <button key={tab} className={`si-tab ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>
            {tab === 'main' ? '🎵 Main' : tab === 'envelope' ? '📈 ADSR' : tab === 'filter' ? '🔉 Filter' : '⚙ Settings'}
          </button>
        ))}
      </div>

      {/* ── Waveform / Chop View ── */}
      {showChop && sample ? (
        <div className="si-chop-panel">
          <div className="si-chop-canvas-wrap">
            <canvas
              ref={chopCanvasRef}
              className="si-chop-canvas"
              width={900}
              height={180}
              onClick={handleChopCanvasClick}
              style={{ cursor: chopMode === 'manual' ? 'crosshair' : 'default' }}
            />
          </div>
          <div className="si-chop-controls">
            <div className="si-chop-modes">
              {['transient', 'bpmgrid', 'equal', 'manual'].map(m => (
                <button key={m} className={`si-mode-btn ${chopMode === m ? 'active' : ''}`} onClick={() => setChopMode(m)}>
                  {m === 'transient' ? '⚡ Transient' : m === 'bpmgrid' ? '🎵 BPM Grid' : m === 'equal' ? '📐 Equal' : '✋ Manual'}
                </button>
              ))}
            </div>
            <div className="si-chop-params">
              {chopMode === 'transient' && (
                <div className="si-control-group">
                  <label>Sensitivity <span className="si-val">{Math.round(chopSensitivity * 100)}%</span></label>
                  <input type="range" min={1} max={100} value={chopSensitivity * 100} onChange={(e) => setChopSensitivity(e.target.value / 100)} className="si-slider" />
                </div>
              )}
              {chopMode === 'bpmgrid' && (
                <div className="si-control-group">
                  <label>BPM <span className="si-val">{chopBpm}</span></label>
                  <input type="range" min={40} max={300} value={chopBpm} onChange={(e) => setChopBpm(+e.target.value)} className="si-slider" />
                </div>
              )}
              {chopMode === 'equal' && (
                <div className="si-control-group">
                  <label>Slices <span className="si-val">{chopSliceCount}</span></label>
                  <input type="range" min={2} max={32} value={chopSliceCount} onChange={(e) => setChopSliceCount(+e.target.value)} className="si-slider" />
                </div>
              )}
              {chopMode === 'manual' && (
                <span className="si-chop-hint">Click waveform to add/remove chop points</span>
              )}
            </div>
            <div className="si-chop-actions">
              <button className="si-btn" onClick={autoChop} disabled={chopMode === 'manual'}>🤖 Auto-Chop</button>
              <button className="si-btn" onClick={() => setChopPoints([])} disabled={chopPoints.length === 0}>🗑 Clear</button>
              <span className="si-chop-count">{chopPoints.length} chops → {chopPoints.length + 1} slices</span>
            </div>
          </div>
          {/* Slice previews */}
          {chopPoints.length > 0 && (
            <div className="si-chop-slices">
              {Array.from({ length: chopPoints.length + 1 }, (_, i) => (
                <button
                  key={i}
                  className={`si-slice-btn ${activeSlice === i ? 'playing' : ''}`}
                  onClick={() => previewSlice(i)}
                >
                  ▶ {i + 1}
                </button>
              ))}
              <button className="si-btn si-btn-send" onClick={sendSlicesToBeatMaker} title="Send all slices to Beat Maker pads">
                📤 Slices → Beat Maker
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="si-waveform-wrap">
        {sample ? (
          <canvas
            ref={canvasRef}
            className="si-waveform"
            width={900}
            height={180}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={handleCanvasMouseUp}
            style={{ cursor: draggingTrim ? 'ew-resize' : 'crosshair' }}
          />
        ) : (
          <div className="si-drop-zone" onClick={() => fileInputRef.current?.click()}>
            <div className="si-drop-icon">🎹</div>
            <div className="si-drop-text">Drop audio file here or click to load</div>
            <div className="si-drop-hint">Supports WAV, MP3, OGG, FLAC, AIFF</div>
          </div>
        )}
        {sample && (
          <div className="si-waveform-info">
            <span>Duration: {fmtTime(sample.duration)}</span>
            <span>Trim: {fmtTime(trimStart)} – {fmtTime(trimEnd)}</span>
            <span>{sample.sampleRate}Hz · {sample.numberOfChannels}ch</span>
          </div>
        )}
      </div>
      )}

      {/* ── Tab Content ── */}
      <div className="si-content">
        {activeTab === 'main' && (
          <div className="si-main-controls">
            <div className="si-control-group">
              <label>Root Note</label>
              <div className="si-root-select">
                <button className="si-tiny-btn" onClick={() => setRootNote(Math.max(0, rootNote - 1))}>−</button>
                <span className="si-root-display">{noteLabel(rootNote)}</span>
                <button className="si-tiny-btn" onClick={() => setRootNote(Math.min(127, rootNote + 1))}>+</button>
              </div>
            </div>
            <div className="si-control-group">
              <label>Pitch <span className="si-val">{pitch > 0 ? '+' : ''}{pitch}st</span></label>
              <input type="range" min={-24} max={24} value={pitch} onChange={(e) => setPitch(+e.target.value)} className="si-slider" />
            </div>
            <div className="si-control-group">
              <label>Volume <span className="si-val">{Math.round(volume * 100)}%</span></label>
              <input type="range" min={0} max={100} value={Math.round(volume * 100)} onChange={(e) => setVolume(e.target.value / 100)} className="si-slider" />
            </div>
            <div className="si-control-group">
              <label>Trim Start <span className="si-val">{fmtTime(trimStart)}</span></label>
              <input type="range" min={0} max={sample ? Math.round(sample.duration * 1000) : 1000} value={Math.round(trimStart * 1000)} onChange={(e) => setTrimStart(Math.min(e.target.value / 1000, trimEnd - 0.001))} className="si-slider si-slider-orange" />
            </div>
            <div className="si-control-group">
              <label>Trim End <span className="si-val">{fmtTime(trimEnd)}</span></label>
              <input type="range" min={0} max={sample ? Math.round(sample.duration * 1000) : 1000} value={Math.round(trimEnd * 1000)} onChange={(e) => setTrimEnd(Math.max(e.target.value / 1000, trimStart + 0.001))} className="si-slider si-slider-orange" />
            </div>
            <div className="si-control-group si-loop-toggle">
              <label>
                <input type="checkbox" checked={loopEnabled} onChange={(e) => setLoopEnabled(e.target.checked)} />
                Loop
              </label>
              {loopEnabled && (
                <>
                  <div className="si-loop-range">
                    <span>L: {fmtTime(loopStart)}</span>
                    <span>R: {fmtTime(loopEnd)}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {activeTab === 'envelope' && (
          <div className="si-adsr-controls">
            <div className="si-adsr-visual">
              <svg viewBox="0 0 200 80" className="si-adsr-svg">
                <polyline
                  fill="none"
                  stroke="#00ffc8"
                  strokeWidth="2"
                  points={`0,80 ${attack * 80},5 ${attack * 80 + decay * 60},${80 - sustain * 75} ${160},${80 - sustain * 75} ${160 + release * 40},80`}
                />
                <text x={attack * 40} y={75} fill="#555" fontSize="8">A</text>
                <text x={attack * 80 + decay * 30} y={75} fill="#555" fontSize="8">D</text>
                <text x={120} y={75} fill="#555" fontSize="8">S</text>
                <text x={160 + release * 20} y={75} fill="#555" fontSize="8">R</text>
              </svg>
            </div>
            <div className="si-adsr-sliders">
              <div className="si-control-group">
                <label>Attack <span className="si-val">{(attack * 1000).toFixed(0)}ms</span></label>
                <input type="range" min={0} max={2000} value={attack * 1000} onChange={(e) => setAttack(e.target.value / 1000)} className="si-slider" />
              </div>
              <div className="si-control-group">
                <label>Decay <span className="si-val">{(decay * 1000).toFixed(0)}ms</span></label>
                <input type="range" min={0} max={2000} value={decay * 1000} onChange={(e) => setDecay(e.target.value / 1000)} className="si-slider" />
              </div>
              <div className="si-control-group">
                <label>Sustain <span className="si-val">{Math.round(sustain * 100)}%</span></label>
                <input type="range" min={0} max={100} value={sustain * 100} onChange={(e) => setSustain(e.target.value / 100)} className="si-slider" />
              </div>
              <div className="si-control-group">
                <label>Release <span className="si-val">{(release * 1000).toFixed(0)}ms</span></label>
                <input type="range" min={0} max={5000} value={release * 1000} onChange={(e) => setRelease(e.target.value / 1000)} className="si-slider" />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'filter' && (
          <div className="si-filter-controls">
            <div className="si-control-group si-filter-toggle">
              <label>
                <input type="checkbox" checked={filterEnabled} onChange={(e) => setFilterEnabled(e.target.checked)} />
                Enable Filter
              </label>
            </div>
            <div className="si-control-group">
              <label>Type</label>
              <select className="si-select" value={filterType} onChange={(e) => setFilterType(e.target.value)} disabled={!filterEnabled}>
                <option value="lowpass">Low Pass</option>
                <option value="highpass">High Pass</option>
                <option value="bandpass">Band Pass</option>
                <option value="notch">Notch</option>
              </select>
            </div>
            <div className="si-control-group">
              <label>Frequency <span className="si-val">{filterFreq >= 1000 ? `${(filterFreq / 1000).toFixed(1)}kHz` : `${filterFreq}Hz`}</span></label>
              <input type="range" min={20} max={20000} value={filterFreq} onChange={(e) => setFilterFreq(+e.target.value)} className="si-slider" disabled={!filterEnabled} />
            </div>
            <div className="si-control-group">
              <label>Resonance <span className="si-val">{filterQ.toFixed(1)}</span></label>
              <input type="range" min={0.1} max={20} step={0.1} value={filterQ} onChange={(e) => setFilterQ(+e.target.value)} className="si-slider" disabled={!filterEnabled} />
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="si-settings">
            <div className="si-control-group">
              <label>Play Mode</label>
              <div className="si-play-modes">
                {['oneshot','hold','loop','gate'].map(m => (
                  <button key={m} className={`si-mode-btn ${playMode === m ? 'active' : ''}`} onClick={() => setPlayMode(m)}>
                    {m === 'oneshot' ? '▶ One-Shot' : m === 'hold' ? '⏎ Hold' : m === 'loop' ? '🔁 Loop' : '⏏ Gate'}
                  </button>
                ))}
              </div>
            </div>
            <div className="si-control-group">
              <label>Polyphony</label>
              <span className="si-val" style={{ color: '#00ffc8' }}>Full (per note)</span>
            </div>
            <div className="si-keyboard-hint">
              <span>🎹 QWERTY: Z-M = lower octave, Q-I = upper octave</span>
            </div>
          </div>
        )}
      </div>

      {/* ── Mini Keyboard ── */}
      <div className="si-keyboard">
        <div className="si-keyboard-keys">
          {miniKeyboard.filter(k => !k.isBlack).map((key) => (
            <div
              key={key.note}
              className={`si-key white ${key.isRoot ? 'root' : ''} ${activeKeys.has(Object.entries(QWERTY_MAP).find(([_,v]) => v === key.note - Math.floor(rootNote / 12) * 12)?.[0]) ? 'active' : ''}`}
              onMouseDown={() => playNote(key.note)}
              onMouseUp={() => stopNote(key.note)}
              onMouseLeave={() => stopNote(key.note)}
            >
              <span className="si-key-label">{key.name}</span>
              {key.shortcut && <span className="si-key-shortcut">{key.shortcut}</span>}
            </div>
          ))}
          {miniKeyboard.filter(k => k.isBlack).map((key) => {
            const whiteIdx = miniKeyboard.filter(k => !k.isBlack && k.note < key.note).length;
            return (
              <div
                key={key.note}
                className={`si-key black ${activeKeys.has(Object.entries(QWERTY_MAP).find(([_,v]) => v === key.note - Math.floor(rootNote / 12) * 12)?.[0]) ? 'active' : ''}`}
                style={{ left: `${(whiteIdx - 0.3) * (100 / 15)}%` }}
                onMouseDown={() => playNote(key.note)}
                onMouseUp={() => stopNote(key.note)}
                onMouseLeave={() => stopNote(key.note)}
              >
                {key.shortcut && <span className="si-key-shortcut">{key.shortcut}</span>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default SamplerInstrument;