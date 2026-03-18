// =============================================================================
// MicSimulator.js — Virtual Microphone Emulator
// =============================================================================
// Emulates the frequency response + character of classic studio microphones
// using Web Audio API filter chains. Zero server cost, all browser-based.
//
// Usage:
//   <MicSimulator
//     audioContext={ctx}
//     inputStream={mediaStream}        // from getUserMedia
//     onProcessedNode={node => ...}    // returns processed audio node to connect
//     onRecordingComplete={blob => ...} // returns recorded audio blob
//     embedded={true}                  // compact mode for embedding
//   />
//
// Or standalone hook:
//   const { processedNode, startRecording, stopRecording } = useMicSimulator(ctx, stream, 'sm7b');
// =============================================================================

import React, { useState, useEffect, useRef, useCallback } from 'react';
import '../../styles/MicSimulator.css';

// =============================================================================
// MIC PROFILES — Each profile defines the filter chain that shapes the sound
// =============================================================================
// Real microphones have unique frequency response curves. We approximate them
// with chains of: HPF → Low Shelf → Parametric EQs → High Shelf → Compressor → Saturation
//
// Values are derived from published frequency response charts of each mic.
// =============================================================================

const MIC_PROFILES = {
  flat: {
    name: 'Flat (No Processing)',
    icon: '🎙️',
    type: 'none',
    description: 'Raw input — no mic emulation applied',
    color: '#888888',
    filters: [],
    compressor: null,
    saturation: 0,
    noiseFloor: 0,
  },

  sm7b: {
    name: 'Shure SM7B',
    icon: '🎤',
    type: 'Dynamic',
    description: 'Industry standard for vocals & podcasts. Warm with presence bump.',
    color: '#2d2d2d',
    filters: [
      // HPF — proximity effect rolloff (SM7B has built-in bass rolloff)
      { type: 'highpass', frequency: 80, Q: 0.7 },
      // Low shelf — warm body, slight cut below 200Hz (not boomy)
      { type: 'lowshelf', frequency: 200, gain: -1.5 },
      // Low-mid warmth
      { type: 'peaking', frequency: 400, Q: 0.8, gain: 1.5 },
      // Presence bump — the SM7B signature (broad peak 2-6kHz)
      { type: 'peaking', frequency: 3500, Q: 0.6, gain: 4.5 },
      // Upper presence
      { type: 'peaking', frequency: 5500, Q: 1.0, gain: 3.0 },
      // Air rolloff — dynamics don't capture much above 12kHz
      { type: 'highshelf', frequency: 10000, gain: -4.0 },
      // Steep rolloff above 16kHz
      { type: 'lowpass', frequency: 16000, Q: 0.5 },
    ],
    compressor: { threshold: -18, knee: 12, ratio: 3, attack: 0.01, release: 0.15 },
    saturation: 0.05, // Subtle transformer coloring
    noiseFloor: -70,
  },

  u87: {
    name: 'Neumann U87',
    icon: '🎙️',
    type: 'Condenser',
    description: 'The gold standard studio condenser. Bright, detailed, airy.',
    color: '#c0a060',
    filters: [
      // HPF — clean low cut
      { type: 'highpass', frequency: 40, Q: 0.7 },
      // Slight low-mid dip (U87 is famously not boomy)
      { type: 'peaking', frequency: 250, Q: 0.6, gain: -1.0 },
      // Flat mids with slight 1kHz bump
      { type: 'peaking', frequency: 1000, Q: 0.5, gain: 0.5 },
      // Presence peak — the U87 "sheen"
      { type: 'peaking', frequency: 4000, Q: 0.8, gain: 2.5 },
      // Upper presence
      { type: 'peaking', frequency: 8000, Q: 1.0, gain: 3.5 },
      // Air / brilliance — condensers capture high detail
      { type: 'highshelf', frequency: 12000, gain: 3.0 },
    ],
    compressor: { threshold: -22, knee: 8, ratio: 2, attack: 0.003, release: 0.1 },
    saturation: 0.02, // Very clean transformer
    noiseFloor: -82,
  },

  sm58: {
    name: 'Shure SM58',
    icon: '🎤',
    type: 'Dynamic',
    description: 'The legendary live vocal mic. Mid-forward, cuts through a mix.',
    color: '#1a3a5c',
    filters: [
      // HPF — strong proximity rolloff
      { type: 'highpass', frequency: 100, Q: 0.8 },
      // Bass scoop
      { type: 'lowshelf', frequency: 150, gain: -3.0 },
      // Mid push — SM58 is very mid-forward
      { type: 'peaking', frequency: 800, Q: 0.6, gain: 2.0 },
      // Strong presence peak (higher and narrower than SM7B)
      { type: 'peaking', frequency: 4000, Q: 0.9, gain: 5.0 },
      // Secondary presence
      { type: 'peaking', frequency: 8000, Q: 1.2, gain: 2.0 },
      // High rolloff — dynamics
      { type: 'highshelf', frequency: 12000, gain: -5.0 },
      { type: 'lowpass', frequency: 15000, Q: 0.5 },
    ],
    compressor: { threshold: -16, knee: 15, ratio: 3.5, attack: 0.008, release: 0.12 },
    saturation: 0.08,
    noiseFloor: -65,
  },

  c414: {
    name: 'AKG C414',
    icon: '🎙️',
    type: 'Condenser',
    description: 'Versatile studio condenser. Flat, natural, subtle presence lift.',
    color: '#1a1a2e',
    filters: [
      { type: 'highpass', frequency: 35, Q: 0.7 },
      // Very flat response with gentle low-mid clarity
      { type: 'peaking', frequency: 300, Q: 0.4, gain: -0.5 },
      // Gentle presence
      { type: 'peaking', frequency: 3000, Q: 0.5, gain: 1.5 },
      // Subtle high peak — less hyped than U87
      { type: 'peaking', frequency: 8000, Q: 0.8, gain: 2.0 },
      // Extended top
      { type: 'highshelf', frequency: 14000, gain: 1.5 },
    ],
    compressor: { threshold: -24, knee: 6, ratio: 1.8, attack: 0.002, release: 0.08 },
    saturation: 0.01,
    noiseFloor: -80,
  },

  nt1: {
    name: 'Rode NT1',
    icon: '🎙️',
    type: 'Condenser',
    description: 'Ultra-low noise condenser. Clean with sparkly high end.',
    color: '#333333',
    filters: [
      { type: 'highpass', frequency: 30, Q: 0.7 },
      // Clean, almost flat low end
      { type: 'peaking', frequency: 200, Q: 0.5, gain: 0.5 },
      // Flat mids
      { type: 'peaking', frequency: 1200, Q: 0.4, gain: 0.3 },
      // Slight presence
      { type: 'peaking', frequency: 5000, Q: 0.7, gain: 2.0 },
      // High shimmer — NT1 signature
      { type: 'peaking', frequency: 10000, Q: 0.9, gain: 3.5 },
      // Extended air
      { type: 'highshelf', frequency: 14000, gain: 2.5 },
    ],
    compressor: { threshold: -26, knee: 5, ratio: 1.5, attack: 0.002, release: 0.06 },
    saturation: 0.005, // Extremely clean
    noiseFloor: -88, // NT1 is famous for ultra-low self noise
  },

  vintage47: {
    name: 'Vintage 47 (Tube)',
    icon: '🎙️',
    type: 'Tube Condenser',
    description: 'Warm tube saturation with silky top end. Sinatra / Motown vibe.',
    color: '#8B4513',
    filters: [
      { type: 'highpass', frequency: 40, Q: 0.5 },
      // Rich, warm low end from tube circuit
      { type: 'lowshelf', frequency: 150, gain: 2.0 },
      // Tube warmth in low mids
      { type: 'peaking', frequency: 300, Q: 0.5, gain: 1.5 },
      // Slight mid scoop for clarity
      { type: 'peaking', frequency: 1500, Q: 0.4, gain: -1.0 },
      // Silky presence — not harsh
      { type: 'peaking', frequency: 3500, Q: 0.6, gain: 2.0 },
      // Smooth, rolled top — tube mics aren't crispy
      { type: 'peaking', frequency: 8000, Q: 0.7, gain: 1.0 },
      { type: 'highshelf', frequency: 12000, gain: -1.5 },
    ],
    compressor: { threshold: -20, knee: 20, ratio: 2.5, attack: 0.005, release: 0.2 },
    saturation: 0.18, // Significant tube warmth
    noiseFloor: -60,
  },

  ribbon121: {
    name: 'Royer 121 (Ribbon)',
    icon: '🎙️',
    type: 'Ribbon',
    description: 'Dark, smooth, rolled-off highs. Jazz, soul, acoustic character.',
    color: '#4a0e0e',
    filters: [
      { type: 'highpass', frequency: 50, Q: 0.5 },
      // Rich, full low end (ribbons love bass)
      { type: 'lowshelf', frequency: 200, gain: 2.5 },
      // Warm lower mids
      { type: 'peaking', frequency: 500, Q: 0.5, gain: 1.0 },
      // Smooth, flat mids
      { type: 'peaking', frequency: 2000, Q: 0.4, gain: -0.5 },
      // Gentle presence — very smooth
      { type: 'peaking', frequency: 4000, Q: 0.6, gain: 0.5 },
      // Significant high rolloff — ribbon signature
      { type: 'highshelf', frequency: 8000, gain: -6.0 },
      { type: 'lowpass', frequency: 12000, Q: 0.4 },
    ],
    compressor: { threshold: -22, knee: 15, ratio: 2, attack: 0.008, release: 0.2 },
    saturation: 0.12, // Ribbon transformer color
    noiseFloor: -55,
  },

  telephone: {
    name: 'Telephone',
    icon: '📞',
    type: 'Effect',
    description: 'Lo-fi bandpass filter. Classic telephone vocal effect.',
    color: '#cc3333',
    filters: [
      // Aggressive HPF — kill everything below 300Hz
      { type: 'highpass', frequency: 300, Q: 1.2 },
      { type: 'highpass', frequency: 350, Q: 0.8 },
      // Mid boost — telephony concentrates here
      { type: 'peaking', frequency: 1500, Q: 0.5, gain: 4.0 },
      // Aggressive LPF — kill everything above 3400Hz
      { type: 'lowpass', frequency: 3400, Q: 1.0 },
      { type: 'lowpass', frequency: 3200, Q: 0.7 },
    ],
    compressor: { threshold: -12, knee: 20, ratio: 8, attack: 0.001, release: 0.05 },
    saturation: 0.25, // Heavy distortion
    noiseFloor: -40,
  },

  radio: {
    name: 'FM Radio',
    icon: '📻',
    type: 'Effect',
    description: 'Bright, compressed radio broadcast sound with limited bandwidth.',
    color: '#ff6600',
    filters: [
      { type: 'highpass', frequency: 80, Q: 1.0 },
      // Low cut more aggressive
      { type: 'lowshelf', frequency: 150, gain: -4.0 },
      // Loud, forward mids
      { type: 'peaking', frequency: 1200, Q: 0.5, gain: 3.0 },
      // Presence push
      { type: 'peaking', frequency: 3500, Q: 0.7, gain: 5.0 },
      // Bright top
      { type: 'peaking', frequency: 8000, Q: 0.8, gain: 3.0 },
      // Hard cutoff at 15kHz (FM bandwidth)
      { type: 'lowpass', frequency: 15000, Q: 0.8 },
    ],
    compressor: { threshold: -10, knee: 5, ratio: 10, attack: 0.001, release: 0.03 },
    saturation: 0.15,
    noiseFloor: -50,
  },
};

// =============================================================================
// SATURATION CURVE GENERATOR
// =============================================================================

function createSaturationCurve(amount) {
  const samples = 44100;
  const curve = new Float32Array(samples);
  const deg = Math.PI / 180;
  for (let i = 0; i < samples; i++) {
    const x = (i * 2) / samples - 1;
    curve[i] = ((3 + amount * 100) * x * 20 * deg) / (Math.PI + (amount * 100) * Math.abs(x));
  }
  return curve;
}

// =============================================================================
// HOOK: useMicSimulator
// =============================================================================

export function useMicSimulator(audioContext, inputNode, micId = 'sm7b') {
  const chainRef = useRef(null);
  const outputRef = useRef(null);

  const buildChain = useCallback(() => {
    if (!audioContext || !inputNode) return null;

    const profile = MIC_PROFILES[micId] || MIC_PROFILES.flat;

    // Disconnect old chain
    if (chainRef.current) {
      try { chainRef.current.input.disconnect(); } catch (e) {}
      chainRef.current.nodes.forEach(n => { try { n.disconnect(); } catch (e) {} });
    }

    if (micId === 'flat' || !profile.filters.length) {
      const passthrough = audioContext.createGain();
      passthrough.gain.value = 1;
      inputNode.connect(passthrough);
      chainRef.current = { input: inputNode, output: passthrough, nodes: [passthrough] };
      outputRef.current = passthrough;
      return passthrough;
    }

    const nodes = [];
    let lastNode = inputNode;

    // Build filter chain
    profile.filters.forEach(f => {
      const filter = audioContext.createBiquadFilter();
      filter.type = f.type;
      filter.frequency.value = f.frequency;
      if (f.Q !== undefined) filter.Q.value = f.Q;
      if (f.gain !== undefined) filter.gain.value = f.gain;
      lastNode.connect(filter);
      lastNode = filter;
      nodes.push(filter);
    });

    // Compressor
    if (profile.compressor) {
      const comp = audioContext.createDynamicsCompressor();
      comp.threshold.value = profile.compressor.threshold;
      comp.knee.value = profile.compressor.knee;
      comp.ratio.value = profile.compressor.ratio;
      comp.attack.value = profile.compressor.attack;
      comp.release.value = profile.compressor.release;
      lastNode.connect(comp);
      lastNode = comp;
      nodes.push(comp);
    }

    // Saturation (waveshaper)
    if (profile.saturation > 0) {
      const shaper = audioContext.createWaveShaper();
      shaper.curve = createSaturationCurve(profile.saturation);
      shaper.oversample = '2x';
      lastNode.connect(shaper);
      lastNode = shaper;
      nodes.push(shaper);
    }

    // Output gain (makeup gain)
    const outputGain = audioContext.createGain();
    outputGain.gain.value = 1.0;
    lastNode.connect(outputGain);
    nodes.push(outputGain);

    chainRef.current = { input: inputNode, output: outputGain, nodes };
    outputRef.current = outputGain;
    return outputGain;
  }, [audioContext, inputNode, micId]);

  useEffect(() => {
    buildChain();
    return () => {
      if (chainRef.current) {
        chainRef.current.nodes.forEach(n => { try { n.disconnect(); } catch (e) {} });
      }
    };
  }, [buildChain]);

  return { processedNode: outputRef.current, rebuildChain: buildChain };
}

// =============================================================================
// COMPONENT: MicSimulator
// =============================================================================

const MicSimulator = ({
  audioContext: externalCtx,
  inputStream,
  onProcessedNode,
  onRecordingComplete,
  embedded = false,
  defaultMic = 'sm7b',
  showRecordButton = true,
}) => {

  // State
  const [selectedMic, setSelectedMic] = useState(defaultMic);
  const [monitoring, setMonitoring] = useState(false);
  const [recording, setRecording] = useState(false);
  const [inputLevel, setInputLevel] = useState(0);
  const [noiseGate, setNoiseGate] = useState(true);
  const [noiseGateThreshold, setNoiseGateThreshold] = useState(-45);
  const [inputGain, setInputGain] = useState(1.0);
  const [abMode, setAbMode] = useState(false); // A/B comparison: false = processed, true = dry
  const [countdown, setCountdown] = useState(0);
  const [recTime, setRecTime] = useState(0);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Refs
  const ctxRef = useRef(null);
  const sourceRef = useRef(null);
  const chainNodesRef = useRef([]);
  const outputNodeRef = useRef(null);
  const inputGainRef = useRef(null);
  const monitorGainRef = useRef(null);
  const analyserRef = useRef(null);
  const gateRef = useRef(null);
  const recorderRef = useRef(null);
  const recChunksRef = useRef([]);
  const animFrameRef = useRef(null);
  const recIntervalRef = useRef(null);
  const canvasRef = useRef(null);

  // Get or create AudioContext
  const getCtx = useCallback(() => {
    if (externalCtx) { ctxRef.current = externalCtx; return externalCtx; }
    if (ctxRef.current && ctxRef.current.state !== 'closed') return ctxRef.current;
    const c = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: 'interactive', sampleRate: 44100 });
    ctxRef.current = c;
    return c;
  }, [externalCtx]);

  // =========================================================================
  // BUILD AUDIO CHAIN
  // =========================================================================

  const buildChain = useCallback(() => {
    const ctx = getCtx();
    if (!inputStream) return;

    // Disconnect old
    chainNodesRef.current.forEach(n => { try { n.disconnect(); } catch (e) {} });
    if (sourceRef.current) { try { sourceRef.current.disconnect(); } catch (e) {} }
    chainNodesRef.current = [];

    const profile = MIC_PROFILES[selectedMic] || MIC_PROFILES.flat;

    // Source from stream
    const source = ctx.createMediaStreamSource(inputStream);
    sourceRef.current = source;

    // Input gain
    const ig = ctx.createGain();
    ig.gain.value = inputGain;
    inputGainRef.current = ig;
    source.connect(ig);

    // Analyser (for level meter — always connected)
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.8;
    analyserRef.current = analyser;

    let lastNode = ig;
    const nodes = [ig];

    // A/B mode: bypass processing if B (dry)
    if (abMode || selectedMic === 'flat') {
      lastNode.connect(analyser);
      nodes.push(analyser);
    } else {
      // Build mic filter chain
      profile.filters.forEach(f => {
        const filter = ctx.createBiquadFilter();
        filter.type = f.type;
        filter.frequency.value = f.frequency;
        if (f.Q !== undefined) filter.Q.value = f.Q;
        if (f.gain !== undefined) filter.gain.value = f.gain;
        lastNode.connect(filter);
        lastNode = filter;
        nodes.push(filter);
      });

      // Compressor
      if (profile.compressor) {
        const comp = ctx.createDynamicsCompressor();
        comp.threshold.value = profile.compressor.threshold;
        comp.knee.value = profile.compressor.knee;
        comp.ratio.value = profile.compressor.ratio;
        comp.attack.value = profile.compressor.attack;
        comp.release.value = profile.compressor.release;
        lastNode.connect(comp);
        lastNode = comp;
        nodes.push(comp);
      }

      // Saturation
      if (profile.saturation > 0) {
        const shaper = ctx.createWaveShaper();
        shaper.curve = createSaturationCurve(profile.saturation);
        shaper.oversample = '2x';
        lastNode.connect(shaper);
        lastNode = shaper;
        nodes.push(shaper);
      }

      // Noise gate (simple gain-based)
      if (noiseGate) {
        const gate = ctx.createGain();
        gate.gain.value = 1;
        gateRef.current = gate;
        lastNode.connect(gate);
        lastNode = gate;
        nodes.push(gate);
      }

      lastNode.connect(analyser);
      nodes.push(analyser);
    }

    // Output node for external use / recording
    const outputGain = ctx.createGain();
    outputGain.gain.value = 1.0;
    analyser.connect(outputGain);
    outputNodeRef.current = outputGain;
    nodes.push(outputGain);

    // Monitor output (headphone monitoring)
    const monGain = ctx.createGain();
    monGain.gain.value = monitoring ? 0.8 : 0;
    outputGain.connect(monGain);
    monGain.connect(ctx.destination);
    monitorGainRef.current = monGain;
    nodes.push(monGain);

    chainNodesRef.current = nodes;

    // Notify parent
    if (onProcessedNode) onProcessedNode(outputGain);

  }, [getCtx, inputStream, selectedMic, inputGain, monitoring, noiseGate, abMode, onProcessedNode]);

  // Rebuild chain when mic or settings change
  useEffect(() => { buildChain(); }, [buildChain]);

  // Update monitor volume without full rebuild
  useEffect(() => {
    if (monitorGainRef.current) monitorGainRef.current.gain.value = monitoring ? 0.8 : 0;
  }, [monitoring]);

  // Update input gain without full rebuild
  useEffect(() => {
    if (inputGainRef.current) inputGainRef.current.gain.value = inputGain;
  }, [inputGain]);

  // =========================================================================
  // LEVEL METER + NOISE GATE
  // =========================================================================

  useEffect(() => {
    const updateMeter = () => {
      if (!analyserRef.current) { animFrameRef.current = requestAnimationFrame(updateMeter); return; }

      const analyser = analyserRef.current;
      const data = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteTimeDomainData(data);

      let sum = 0;
      for (let i = 0; i < data.length; i++) {
        const v = (data[i] - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / data.length);
      const db = 20 * Math.log10(rms + 0.0001);

      setInputLevel(Math.max(0, Math.min(1, (db + 60) / 60)));

      // Noise gate
      if (noiseGate && gateRef.current) {
        const ctx = ctxRef.current;
        if (ctx) {
          const gateOpen = db > noiseGateThreshold;
          const currentGain = gateRef.current.gain.value;
          const targetGain = gateOpen ? 1 : 0;
          if (Math.abs(currentGain - targetGain) > 0.01) {
            gateRef.current.gain.setTargetAtTime(targetGain, ctx.currentTime, gateOpen ? 0.005 : 0.05);
          }
        }
      }

      // Draw mini spectrum on canvas
      drawSpectrum(analyser);

      animFrameRef.current = requestAnimationFrame(updateMeter);
    };

    animFrameRef.current = requestAnimationFrame(updateMeter);
    return () => { if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current); };
  }, [noiseGate, noiseGateThreshold]);

  // =========================================================================
  // SPECTRUM VISUALIZER
  // =========================================================================

  const drawSpectrum = useCallback((analyser) => {
    const canvas = canvasRef.current;
    if (!canvas || !analyser) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;

    const freqData = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(freqData);

    ctx.clearRect(0, 0, w, h);

    // Background
    ctx.fillStyle = 'rgba(10, 22, 40, 0.9)';
    ctx.fillRect(0, 0, w, h);

    // Spectrum bars
    const barCount = 32;
    const barWidth = (w / barCount) - 1;
    const profile = MIC_PROFILES[selectedMic];
    const color = profile?.color || '#00ffc8';

    for (let i = 0; i < barCount; i++) {
      const dataIndex = Math.floor((i / barCount) * freqData.length);
      const value = freqData[dataIndex] / 255;
      const barHeight = value * h;

      const gradient = ctx.createLinearGradient(0, h, 0, h - barHeight);
      gradient.addColorStop(0, 'rgba(0, 255, 200, 0.3)');
      gradient.addColorStop(0.5, color);
      gradient.addColorStop(1, '#ff6600');

      ctx.fillStyle = gradient;
      ctx.fillRect(i * (barWidth + 1), h - barHeight, barWidth, barHeight);
    }

    // Frequency response overlay (mic curve visualization)
    if (selectedMic !== 'flat' && profile) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 3]);
      ctx.beginPath();
      for (let i = 0; i < w; i++) {
        const freq = 20 * Math.pow(1000, i / w); // 20Hz to 20kHz log scale
        let gain = 0;
        profile.filters.forEach(f => {
          if (f.type === 'peaking' || f.type === 'lowshelf' || f.type === 'highshelf') {
            if (f.gain) gain += f.gain * Math.exp(-Math.pow(Math.log(freq / f.frequency), 2) * 2);
          }
        });
        const y = h / 2 - (gain / 12) * (h / 2);
        if (i === 0) ctx.moveTo(i, y); else ctx.lineTo(i, y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }, [selectedMic]);

  // =========================================================================
  // RECORDING
  // =========================================================================

  const startRecording = useCallback(async () => {
    if (!outputNodeRef.current || !ctxRef.current) return;

    const ctx = ctxRef.current;

    // 3-2-1 countdown
    for (let i = 3; i > 0; i--) {
      setCountdown(i);
      await new Promise(r => setTimeout(r, 700));
    }
    setCountdown(0);

    // Create MediaStreamDestination to capture processed audio
    const dest = ctx.createMediaStreamDestination();
    outputNodeRef.current.connect(dest);

    const recorder = new MediaRecorder(dest.stream, {
      mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm'
    });
    recorderRef.current = recorder;
    recChunksRef.current = [];

    recorder.ondataavailable = (e) => { if (e.data.size > 0) recChunksRef.current.push(e.data); };
    recorder.onstop = () => {
      const blob = new Blob(recChunksRef.current, { type: 'audio/webm' });
      if (onRecordingComplete) onRecordingComplete(blob);
      outputNodeRef.current?.disconnect(dest);
    };

    recorder.start();
    setRecording(true);
    setRecTime(0);

    recIntervalRef.current = setInterval(() => {
      setRecTime(t => t + 1);
    }, 1000);
  }, [onRecordingComplete]);

  const stopRecording = useCallback(() => {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
    setRecording(false);
    if (recIntervalRef.current) clearInterval(recIntervalRef.current);
  }, []);

  // =========================================================================
  // CLEANUP
  // =========================================================================

  useEffect(() => {
    return () => {
      chainNodesRef.current.forEach(n => { try { n.disconnect(); } catch (e) {} });
      if (sourceRef.current) { try { sourceRef.current.disconnect(); } catch (e) {} }
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (recIntervalRef.current) clearInterval(recIntervalRef.current);
    };
  }, []);

  // =========================================================================
  // HELPERS
  // =========================================================================

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const profile = MIC_PROFILES[selectedMic];

  // =========================================================================
  // RENDER
  // =========================================================================

  return (
    <div className={`mic-sim ${embedded ? 'embedded' : ''}`}>

      {/* Header */}
      <div className="mic-sim-header">
        <h3 className="mic-sim-title">
          <span>{profile.icon}</span>
          Mic Simulator
        </h3>
        <div className="mic-sim-current">
          <span className="mic-sim-model">{profile.name}</span>
          <span className="mic-sim-type" style={{ color: profile.color }}>{profile.type}</span>
        </div>
      </div>

      {/* Mic Selector Grid */}
      <div className="mic-selector">
        {Object.entries(MIC_PROFILES).map(([id, mic]) => (
          <button
            key={id}
            className={`mic-option ${selectedMic === id ? 'active' : ''}`}
            style={{ '--mic-color': mic.color }}
            onClick={() => setSelectedMic(id)}
            title={mic.description}
          >
            <span className="mic-option-icon">{mic.icon}</span>
            <span className="mic-option-name">{mic.name}</span>
            <span className="mic-option-type">{mic.type}</span>
          </button>
        ))}
      </div>

      {/* Description */}
      <div className="mic-description">{profile.description}</div>

      {/* Spectrum + Level */}
      <div className="mic-viz-row">
        <canvas ref={canvasRef} className="mic-spectrum" width={300} height={80} />
        <div className="mic-level-container">
          <div className="mic-level-bar">
            <div
              className={`mic-level-fill ${inputLevel > 0.85 ? 'clip' : inputLevel > 0.6 ? 'hot' : ''}`}
              style={{ height: `${inputLevel * 100}%` }}
            />
          </div>
          <span className="mic-level-label">IN</span>
        </div>
      </div>

      {/* Controls Row */}
      <div className="mic-controls">
        {/* Input Gain */}
        <div className="mic-control">
          <label>Input Gain</label>
          <input type="range" min={0} max={300} value={Math.round(inputGain * 100)}
            onChange={(e) => setInputGain(+e.target.value / 100)} />
          <span className="mic-control-val">{Math.round(inputGain * 100)}%</span>
        </div>

        {/* Monitor */}
        <button className={`mic-btn ${monitoring ? 'active' : ''}`} onClick={() => setMonitoring(p => !p)} title="Monitor through speakers/headphones">
          🎧 {monitoring ? 'Monitoring' : 'Monitor'}
        </button>

        {/* A/B Compare */}
        <button className={`mic-btn ab ${abMode ? 'active' : ''}`} onClick={() => setAbMode(p => !p)} title="A/B compare: hear raw vs processed">
          {abMode ? 'B (Dry)' : 'A (Mic)'}
        </button>

        {/* Noise Gate */}
        <button className={`mic-btn ${noiseGate ? 'active' : ''}`} onClick={() => setNoiseGate(p => !p)} title="Noise Gate">
          🔇 Gate
        </button>
      </div>

      {/* Advanced Settings */}
      <button className="mic-advanced-toggle" onClick={() => setShowAdvanced(p => !p)}>
        {showAdvanced ? '▼' : '▶'} Advanced Settings
      </button>

      {showAdvanced && (
        <div className="mic-advanced">
          <div className="mic-control">
            <label>Gate Threshold</label>
            <input type="range" min={-80} max={-10} value={noiseGateThreshold}
              onChange={(e) => setNoiseGateThreshold(+e.target.value)} />
            <span className="mic-control-val">{noiseGateThreshold}dB</span>
          </div>

          {/* Mic Technical Specs */}
          {selectedMic !== 'flat' && (
            <div className="mic-specs">
              <div className="mic-spec"><span>Filters:</span> <span>{profile.filters.length} bands</span></div>
              {profile.compressor && (
                <>
                  <div className="mic-spec"><span>Comp Ratio:</span> <span>{profile.compressor.ratio}:1</span></div>
                  <div className="mic-spec"><span>Comp Threshold:</span> <span>{profile.compressor.threshold}dB</span></div>
                </>
              )}
              <div className="mic-spec"><span>Saturation:</span> <span>{(profile.saturation * 100).toFixed(1)}%</span></div>
              <div className="mic-spec"><span>Noise Floor:</span> <span>{profile.noiseFloor}dB</span></div>
            </div>
          )}
        </div>
      )}

      {/* Record Button */}
      {showRecordButton && (
        <div className="mic-record-section">
          {countdown > 0 && (
            <div className="mic-countdown">{countdown}</div>
          )}

          {recording ? (
            <div className="mic-recording-active">
              <span className="mic-rec-dot">⏺</span>
              <span className="mic-rec-time">{formatTime(recTime)}</span>
              <button className="mic-stop-btn" onClick={stopRecording}>⏹ Stop</button>
            </div>
          ) : (
            <button className="mic-record-btn" onClick={startRecording} disabled={!inputStream || countdown > 0}>
              ⏺ Record with {profile.name}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default MicSimulator;