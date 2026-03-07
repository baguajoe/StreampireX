// =============================================================================
// DAWMeteringTools.js — Live Metering Suite for RecordingStudio
// =============================================================================
// Location: src/front/js/component/DAWMeteringTools.js
//
// Components:
//   1. SpectrumAnalyzer     — Real-time FFT spectrum display (like an oscilloscope bar graph)
//   2. LUFSMeter            — Integrated loudness meter (EBU R128, approximate browser impl)
//   3. CorrelationMeter     — L+R phase correlation (-1 to +1), mono compatibility indicator
//   4. ExportRangeSelector  — Set in/out loop points for partial mixdown
//   5. useDAWMetering       — Hook that manages a single shared AnalyserNode
//
// INTEGRATION into RecordingStudio.js:
//
//   import {
//     useDAWMetering, SpectrumAnalyzer, LUFSMeter,
//     CorrelationMeter, ExportRangeSelector
//   } from '../component/DAWMeteringTools';
//
//   // In component body:
//   const metering = useDAWMetering(audioCtxRef, masterGainRef);
//   // masterGainRef = the master gain node your final mix passes through
//
//   // In Console or Mastering view:
//   <SpectrumAnalyzer analyser={metering.analyser} isPlaying={isPlaying} />
//   <LUFSMeter lufs={metering.lufs} peak={metering.peak} />
//   <CorrelationMeter correlation={metering.correlation} />
//
//   // For export range:
//   const [exportRange, setExportRange] = useState({ start: 0, end: null });
//   // Pass exportRange into your handleMixdown() to trim the bounce
//   <ExportRangeSelector
//     duration={duration} bpm={bpm}
//     exportRange={exportRange} setExportRange={setExportRange}
//   />
// =============================================================================

import React, { useRef, useEffect, useState, useCallback } from 'react';

// =============================================================================
// useDAWMetering — single hook to share one AnalyserNode across all meters
// =============================================================================

export function useDAWMetering(audioCtxRef, masterGainRef) {
  const analyserRef  = useRef(null);
  const analyserRRef = useRef(null); // right channel for correlation
  const rafRef       = useRef(null);

  const [lufs,        setLufs]        = useState(-60);
  const [peak,        setPeak]        = useState(-60);
  const [correlation, setCorrelation] = useState(1);

  // Attach analyser to master gain once audioCtx is ready
  useEffect(() => {
    const ctx = audioCtxRef?.current;
    const master = masterGainRef?.current;
    if (!ctx || !master) return;
    if (analyserRef.current) return; // already connected

    const analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.8;
    master.connect(analyser);
    analyserRef.current = analyser;

    // Loudness measurement via ScriptProcessor (deprecated but still widely supported)
    // For production, swap with AudioWorklet
    let sqSumL = 0, sqSumR = 0, sqCount = 0;
    let peakHold = -60;
    const sampleRate = ctx.sampleRate;

    const splitter = ctx.createChannelSplitter(2);
    master.connect(splitter);

    const proc = ctx.createScriptProcessor(4096, 2, 2);
    splitter.connect(proc, 0, 0);
    splitter.connect(proc, 1, 1);
    proc.connect(ctx.destination);

    proc.onaudioprocess = (e) => {
      const L = e.inputBuffer.getChannelData(0);
      const R = e.inputBuffer.numberOfChannels > 1
        ? e.inputBuffer.getChannelData(1)
        : L;

      // RMS for LUFS approximation
      let sumL = 0, sumR = 0;
      let corrSum = 0;
      for (let i = 0; i < L.length; i++) {
        sumL += L[i] * L[i];
        sumR += R[i] * R[i];
        corrSum += L[i] * R[i];
        const p = Math.max(Math.abs(L[i]), Math.abs(R[i]));
        if (p > peakHold) peakHold = p;
      }
      const rmsL = Math.sqrt(sumL / L.length);
      const rmsR = Math.sqrt(sumR / R.length);
      const rmsAvg = (rmsL + rmsR) / 2;

      // Momentary LUFS (approximate)
      const momentaryLUFS = rmsAvg > 0 ? 20 * Math.log10(rmsAvg) - 0.691 : -70;
      setLufs(prev => {
        // Integrated: slow IIR
        const integrated = prev * 0.95 + momentaryLUFS * 0.05;
        return Math.max(-70, Math.min(0, integrated));
      });
      setPeak(peakHold > 0 ? 20 * Math.log10(peakHold) : -70);

      // Correlation
      const normL = Math.sqrt(sumL / L.length);
      const normR = Math.sqrt(sumR / R.length);
      const corr = (normL * normR > 0)
        ? corrSum / L.length / (normL * normR)
        : 1;
      setCorrelation(Math.max(-1, Math.min(1, corr)));
    };

    return () => {
      try { master.disconnect(analyser); } catch(e) {}
      try { master.disconnect(splitter); } catch(e) {}
      try { proc.disconnect(); } catch(e) {}
      if (analyserRef.current) analyserRef.current = null;
    };
  }, []); // eslint-disable-line

  return {
    analyser: analyserRef.current,
    lufs,
    peak,
    correlation,
  };
}

// =============================================================================
// 1. SpectrumAnalyzer
// =============================================================================

export function SpectrumAnalyzer({ analyser, isPlaying, width = 280, height = 80 }) {
  const canvasRef = useRef(null);
  const rafRef    = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const draw = () => {
      rafRef.current = requestAnimationFrame(draw);
      const W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      // Background
      ctx.fillStyle = '#060c12';
      ctx.fillRect(0, 0, W, H);

      // Grid lines at standard octave frequencies
      const freqLabels = [50, 100, 200, 500, '1k', '2k', '5k', '10k', '20k'];
      const freqValues = [50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000];
      const sampleRate = 44100;

      freqValues.forEach((f, i) => {
        const x = (Math.log10(f / 20) / Math.log10(20000 / 20)) * W;
        ctx.strokeStyle = 'rgba(255,255,255,0.04)';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 3]);
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.font = '7px monospace';
        ctx.fillText(freqLabels[i], x + 2, H - 3);
      });

      // dB grid lines
      [-6, -12, -24, -40].forEach(db => {
        const y = ((0 - db) / 60) * H;
        ctx.strokeStyle = 'rgba(255,255,255,0.05)';
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.font = '7px monospace';
        ctx.fillText(`${db}`, 2, y - 2);
      });

      if (!analyser || !isPlaying) {
        // Static noise floor
        const grad = ctx.createLinearGradient(0, 0, 0, H);
        grad.addColorStop(0, 'rgba(0,255,200,0.02)');
        grad.addColorStop(1, 'rgba(0,255,200,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, H * 0.85, W, H * 0.15);
        return;
      }

      const bufLen = analyser.frequencyBinCount;
      const data   = new Uint8Array(bufLen);
      analyser.getByteFrequencyData(data);

      // Frequency spectrum bars (log scale)
      const barCount = W;
      ctx.beginPath();

      for (let i = 0; i < barCount; i++) {
        const t      = i / barCount;
        const freq   = 20 * Math.pow(20000 / 20, t);
        const binIdx = Math.round((freq / (sampleRate / 2)) * bufLen);
        const clampedIdx = Math.min(bufLen - 1, Math.max(0, binIdx));
        const value  = data[clampedIdx] / 255;
        const dbVal  = value > 0 ? 20 * Math.log10(value) : -60;
        const y      = H - ((dbVal + 60) / 60) * H;

        if (i === 0) ctx.moveTo(i, y);
        else ctx.lineTo(i, y);
      }

      // Fill below the spectrum line
      ctx.lineTo(barCount, H);
      ctx.lineTo(0, H);
      ctx.closePath();

      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, 'rgba(0,255,200,0.7)');
      grad.addColorStop(0.5, 'rgba(0,180,140,0.3)');
      grad.addColorStop(1, 'rgba(0,100,80,0.05)');
      ctx.fillStyle = grad;
      ctx.fill();

      // Spectrum line
      ctx.beginPath();
      for (let i = 0; i < barCount; i++) {
        const t      = i / barCount;
        const freq   = 20 * Math.pow(20000 / 20, t);
        const binIdx = Math.min(bufLen - 1, Math.round((freq / (sampleRate / 2)) * bufLen));
        const value  = data[binIdx] / 255;
        const dbVal  = value > 0 ? 20 * Math.log10(value) : -60;
        const y      = H - ((dbVal + 60) / 60) * H;
        if (i === 0) ctx.moveTo(i, y);
        else ctx.lineTo(i, y);
      }
      ctx.strokeStyle = '#00ffc8';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    };

    draw();
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [analyser, isPlaying]);

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ fontSize: 9, color: '#8b949e', fontFamily: 'monospace', marginBottom: 4, letterSpacing: 1 }}>
        SPECTRUM
      </div>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{ width: '100%', height, display: 'block', borderRadius: 4 }}
      />
    </div>
  );
}

// =============================================================================
// 2. LUFSMeter
// =============================================================================

export function LUFSMeter({ lufs = -60, peak = -60 }) {
  const lufsColor = lufs > -6 ? '#ff4040' : lufs > -14 ? '#ffd700' : '#00ffc8';
  const peakColor = peak > -1  ? '#ff4040' : peak > -6  ? '#ffd700' : '#8b949e';

  const pct = Math.max(0, Math.min(100, ((lufs + 60) / 60) * 100));

  return (
    <div style={{ fontFamily: '"JetBrains Mono", monospace' }}>
      <div style={{ fontSize: 9, color: '#8b949e', letterSpacing: 1, marginBottom: 4 }}>LOUDNESS</div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
        {/* LUFS bar */}
        <div>
          <div style={{ width: 14, height: 64, background: '#0d1117', borderRadius: 2, position: 'relative', overflow: 'hidden' }}>
            {/* Zone coloring */}
            <div style={{ position:'absolute', bottom:'85%', width:'100%', height:'15%', background:'rgba(255,64,64,0.3)' }} />
            <div style={{ position:'absolute', bottom:'70%', width:'100%', height:'15%', background:'rgba(255,215,0,0.2)' }} />
            {/* Level */}
            <div style={{ position:'absolute', bottom:0, width:'100%', height:`${pct}%`, background: lufsColor, transition:'height 0.15s, background 0.1s' }} />
          </div>
          {/* dB labels */}
          <div style={{ fontSize: 7, color: '#444', textAlign: 'center', marginTop: 2 }}>INT</div>
        </div>

        {/* Numeric readouts */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div>
            <div style={{ fontSize: 7, color: '#555' }}>LUFS</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: lufsColor, lineHeight: 1 }}>
              {lufs > -70 ? lufs.toFixed(1) : '-∞'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 7, color: '#555' }}>PEAK</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: peakColor, lineHeight: 1 }}>
              {peak > -70 ? `${peak > 0 ? '+' : ''}${peak.toFixed(1)}` : '-∞'}
            </div>
          </div>
          <div style={{ fontSize: 7, color: '#444' }}>dBFS</div>
        </div>

        {/* Target guide */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: 7, color: '#333' }}>
          <div style={{ color: '#555' }}>Targets:</div>
          <div>Stream: -14</div>
          <div>CD: -9</div>
          <div>Film: -23</div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// 3. CorrelationMeter
// =============================================================================

export function CorrelationMeter({ correlation = 1 }) {
  const pct = ((correlation + 1) / 2) * 100; // -1→0%, +1→100%
  const color = correlation < 0 ? '#ff4040' : correlation < 0.3 ? '#ffd700' : '#00ffc8';
  const label = correlation < -0.1 ? 'OUT OF PHASE' : correlation < 0.3 ? 'NARROW' : correlation < 0.7 ? 'WIDE' : 'MONO SAFE';

  return (
    <div style={{ fontFamily: '"JetBrains Mono", monospace' }}>
      <div style={{ fontSize: 9, color: '#8b949e', letterSpacing: 1, marginBottom: 4 }}>
        CORRELATION <span style={{ color: '#444' }}>L↔R</span>
      </div>
      <div style={{ position: 'relative', height: 10, background: '#0d1117', borderRadius: 2, width: '100%' }}>
        {/* Zero line */}
        <div style={{ position:'absolute', left:'50%', top:0, width:1, height:'100%', background:'#2a3040' }} />
        {/* Indicator */}
        <div style={{
          position: 'absolute',
          left: `${pct}%`,
          top: '50%',
          transform: 'translate(-50%, -50%)',
          width: 10, height: 10,
          borderRadius: '50%',
          background: color,
          boxShadow: `0 0 6px ${color}88`,
          transition: 'left 0.1s, background 0.1s',
        }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
        <span style={{ fontSize: 7, color: '#555' }}>-1</span>
        <span style={{ fontSize: 7, color }}>
          {correlation.toFixed(2)} — {label}
        </span>
        <span style={{ fontSize: 7, color: '#555' }}>+1</span>
      </div>
    </div>
  );
}

// =============================================================================
// 4. ExportRangeSelector
// =============================================================================
// Lets users set in/out beat points for partial mixdown export.
// Integrates with handleMixdown() — pass exportRange as trim params.

export function ExportRangeSelector({ duration, bpm, exportRange, setExportRange }) {
  const totalBeats = (duration / 60) * bpm;

  const setIn  = (v) => setExportRange(p => ({ ...p, start: Math.max(0, Math.min(p.end ?? totalBeats, parseFloat(v) || 0)) }));
  const setOut = (v) => setExportRange(p => ({ ...p, end: Math.min(totalBeats, Math.max(p.start, parseFloat(v) || totalBeats)) }));

  const rangeStart = exportRange?.start ?? 0;
  const rangeEnd   = exportRange?.end   ?? totalBeats;
  const rangeDur   = rangeEnd - rangeStart;
  const rangeSec   = (rangeDur / bpm) * 60;

  const fmtBeat = (b) => {
    const bar  = Math.floor(b / 4) + 1;
    const beat = Math.floor(b % 4) + 1;
    return `${bar}:${beat}`;
  };

  const fmtTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = (s % 60).toFixed(1);
    return `${m}:${sec.padStart(4, '0')}`;
  };

  return (
    <div style={{ fontFamily: '"JetBrains Mono", monospace', background: '#0f1419', borderRadius: 6, padding: '10px 12px', border: '1px solid #1c2333' }}>
      <div style={{ fontSize: 10, color: '#8b949e', letterSpacing: 1, marginBottom: 8 }}>
        📤 EXPORT RANGE
      </div>

      {/* Range bar */}
      <div style={{ position: 'relative', height: 16, background: '#0d1117', borderRadius: 2, marginBottom: 8, cursor: 'pointer' }}
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const beat = ((e.clientX - rect.left) / rect.width) * totalBeats;
          // If clicking near in point, move in; else move out
          if (Math.abs(beat - rangeStart) < Math.abs(beat - rangeEnd)) {
            setIn(beat);
          } else {
            setOut(beat);
          }
        }}
      >
        {/* Full duration */}
        <div style={{ position:'absolute', inset:0, background:'#1c2333', borderRadius:2 }} />
        {/* Selected range */}
        <div style={{
          position: 'absolute',
          left:  `${(rangeStart / totalBeats) * 100}%`,
          width: `${(rangeDur   / totalBeats) * 100}%`,
          top: 0, height: '100%',
          background: 'rgba(0,255,200,0.25)',
          borderLeft:  '2px solid #00ffc8',
          borderRight: '2px solid #00ffc8',
        }} />
        <span style={{ position:'absolute', left:'50%', top:'50%', transform:'translate(-50%,-50%)', fontSize:8, color:'#00ffc8', whiteSpace:'nowrap' }}>
          {fmtBeat(rangeStart)} – {fmtBeat(rangeEnd)}
        </span>
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        {/* In point */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 9, color: '#00ffc8' }}>IN</span>
          <input type="number" min={0} max={rangeEnd - 0.5} step={0.5}
            value={rangeStart.toFixed(2)}
            onChange={e => setIn(e.target.value)}
            style={{ width: 52, fontSize: 9, background: '#0d1117', border: '1px solid #30363d', color: '#cdd9e5', borderRadius: 2, padding: '2px 4px', fontFamily: 'inherit' }}
            title="In point (beats)"
          />
          <span style={{ fontSize: 8, color: '#555' }}>beat</span>
        </div>

        {/* Out point */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 9, color: '#FF6600' }}>OUT</span>
          <input type="number" min={rangeStart + 0.5} max={totalBeats} step={0.5}
            value={rangeEnd.toFixed(2)}
            onChange={e => setOut(e.target.value)}
            style={{ width: 52, fontSize: 9, background: '#0d1117', border: '1px solid #30363d', color: '#cdd9e5', borderRadius: 2, padding: '2px 4px', fontFamily: 'inherit' }}
            title="Out point (beats)"
          />
          <span style={{ fontSize: 8, color: '#555' }}>beat</span>
        </div>

        {/* Duration display */}
        <span style={{ fontSize: 8, color: '#555', marginLeft: 'auto' }}>
          {fmtTime(rangeSec)} ({rangeDur.toFixed(1)} beats)
        </span>

        {/* Reset to full */}
        <button
          onClick={() => setExportRange({ start: 0, end: totalBeats })}
          style={{ fontSize: 8, padding: '2px 7px', background: '#1c2333', border: '1px solid #30363d', color: '#8b949e', borderRadius: 2, cursor: 'pointer', fontFamily: 'inherit' }}
        >
          Full
        </button>
      </div>

      <div style={{ fontSize: 8, color: '#444', marginTop: 6 }}>
        Set range then click Bounce/Mixdown — only this section will be exported.
        To use: pass exportRange.start and exportRange.end (in beats) to your handleMixdown().
      </div>
    </div>
  );
}

// =============================================================================
// 5. MeteringPanel — Combined panel for Console / Mastering view
// =============================================================================
// Drop this into your Console or Mastering view to show all meters at once.

export function MeteringPanel({ analyser, lufs, peak, correlation, isPlaying, duration, bpm, exportRange, setExportRange }) {
  const [tab, setTab] = useState('spectrum'); // 'spectrum' | 'loudness' | 'export'

  const tabStyle = (t) => ({
    fontSize: 9, padding: '3px 10px',
    background: tab === t ? '#1c2333' : 'transparent',
    border: tab === t ? '1px solid #30363d' : '1px solid transparent',
    color: tab === t ? '#cdd9e5' : '#555',
    borderRadius: 3, cursor: 'pointer', fontFamily: '"JetBrains Mono", monospace',
  });

  return (
    <div style={{ background: '#0a0d14', borderRadius: 6, padding: '10px 12px', border: '1px solid #1c2333' }}>
      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
        <button style={tabStyle('spectrum')} onClick={() => setTab('spectrum')}>Spectrum</button>
        <button style={tabStyle('loudness')} onClick={() => setTab('loudness')}>Loudness</button>
        <button style={tabStyle('export')}   onClick={() => setTab('export')}>Export Range</button>
      </div>

      {tab === 'spectrum' && (
        <SpectrumAnalyzer analyser={analyser} isPlaying={isPlaying} width={280} height={80} />
      )}

      {tab === 'loudness' && (
        <div style={{ display: 'flex', gap: 20 }}>
          <LUFSMeter lufs={lufs} peak={peak} />
          <div style={{ flex: 1, paddingTop: 4 }}>
            <CorrelationMeter correlation={correlation} />
          </div>
        </div>
      )}

      {tab === 'export' && (
        <ExportRangeSelector
          duration={duration} bpm={bpm}
          exportRange={exportRange} setExportRange={setExportRange}
        />
      )}
    </div>
  );
}

export default MeteringPanel;

// =============================================================================
// INTEGRATION: handleMixdown with export range support
// =============================================================================
// Add this to RecordingStudio.js handleMixdown():
//
//   const handleMixdown = async () => {
//     // ... existing setup ...
//
//     const startSec = exportRange?.start != null
//       ? (exportRange.start / bpm) * 60
//       : 0;
//     const endSec = exportRange?.end != null
//       ? (exportRange.end / bpm) * 60
//       : duration;
//
//     const trimmedDuration = endSec - startSec;
//     const offlineCtx = new OfflineAudioContext(2, Math.ceil(trimmedDuration * 44100), 44100);
//
//     // Schedule each track starting from startSec offset:
//     tracks.forEach(track => {
//       if (!track.audioBuffer || track.muted) return;
//       const src = offlineCtx.createBufferSource();
//       src.buffer = track.audioBuffer;
//       // ... connect effects chain ...
//       src.start(0, startSec, trimmedDuration);
//     });
//
//     const rendered = await offlineCtx.startRendering();
//     // ... encode + download ...
//   };
// =============================================================================