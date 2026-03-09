/**
 * ReferenceMastering.js
 * StreamPireX — Reference Mastering (closes LANDR gap)
 *
 * Features:
 *  - Upload a reference track (pro song you want to match tonally)
 *  - Analyzes both your mix and the reference using Web Audio API
 *  - Compares: frequency spectrum, LUFS loudness, dynamic range, stereo width
 *  - Outputs a corrective EQ curve + gain adjustment suggestion
 *  - Visual spectrum overlay: your mix vs reference
 *  - Export analysis as JSON for MasteringChain integration
 *  - Backend route: POST /api/mastering/reference-analyze
 *
 * Integration:
 *   import ReferenceMastering from './ReferenceMastering';
 *   // Add as a tab inside the Mastering view
 *   <ReferenceMastering onApplyCorrections={(eq, gain) => applyToMasteringChain(eq, gain)} />
 */

import React, { useState, useRef, useCallback } from 'react';

// ---------------------------------------------------------------------------
// Web Audio analysis helpers
// ---------------------------------------------------------------------------
async function analyzeAudio(arrayBuffer) {
  const ctx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 44100 });
  const audioBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0));

  const offline = new OfflineAudioContext(
    audioBuffer.numberOfChannels, audioBuffer.length, audioBuffer.sampleRate
  );
  const source = offline.createBufferSource();
  source.buffer = audioBuffer;

  const analyzer = offline.createAnalyser();
  analyzer.fftSize = 4096;
  source.connect(analyzer);
  analyzer.connect(offline.destination);
  source.start();

  await offline.startRendering();

  // Frequency data
  const freqData = new Float32Array(analyzer.frequencyBinCount);
  analyzer.getFloatFrequencyData(freqData);

  // LUFS approximation (simplified ITU-R BS.1770)
  const channelData = audioBuffer.getChannelData(0);
  const blockSize = Math.floor(audioBuffer.sampleRate * 0.4);
  let sumSquares = 0;
  let blocks = 0;
  for (let i = 0; i < channelData.length - blockSize; i += blockSize / 4) {
    let blockSum = 0;
    for (let j = 0; j < blockSize; j++) {
      blockSum += channelData[i + j] ** 2;
    }
    const blockLufs = 10 * Math.log10(blockSum / blockSize);
    if (blockLufs > -70) {
      sumSquares += blockSum / blockSize;
      blocks++;
    }
  }
  const lufs = blocks > 0 ? 10 * Math.log10(sumSquares / blocks) - 0.691 : -23;

  // Dynamic range (peak - average RMS)
  let peak = 0, rmsSum = 0;
  for (let i = 0; i < channelData.length; i++) {
    const abs = Math.abs(channelData[i]);
    if (abs > peak) peak = abs;
    rmsSum += channelData[i] ** 2;
  }
  const rms = Math.sqrt(rmsSum / channelData.length);
  const dynamicRange = 20 * Math.log10(peak) - 20 * Math.log10(rms);

  // Stereo width (if stereo available)
  let stereoWidth = 0;
  if (audioBuffer.numberOfChannels >= 2) {
    const L = audioBuffer.getChannelData(0);
    const R = audioBuffer.getChannelData(1);
    let midSum = 0, sideSum = 0;
    for (let i = 0; i < Math.min(L.length, R.length); i++) {
      const mid  = (L[i] + R[i]) / 2;
      const side = (L[i] - R[i]) / 2;
      midSum  += mid ** 2;
      sideSum += side ** 2;
    }
    stereoWidth = Math.min(sideSum / (midSum + 0.0001), 2);
  }

  await ctx.close();

  return {
    freqData: Array.from(freqData).slice(0, 512), // 0 - ~11kHz relevant bands
    lufs: Math.max(-60, Math.min(0, lufs)),
    dynamicRange: Math.max(0, Math.min(30, dynamicRange)),
    stereoWidth: Math.min(stereoWidth * 100, 100),
    peak: 20 * Math.log10(Math.max(peak, 0.000001)),
    duration: audioBuffer.duration,
  };
}

function computeCorrectiveEQ(myAnalysis, refAnalysis) {
  // Compare frequency bands and compute correction
  const BANDS = [
    { name: 'Sub', freq: 60, label: '60Hz' },
    { name: 'Bass', freq: 120, label: '120Hz' },
    { name: 'Low-Mid', freq: 250, label: '250Hz' },
    { name: 'Mid', freq: 500, label: '500Hz' },
    { name: 'Upper-Mid', freq: 2000, label: '2kHz' },
    { name: 'Presence', freq: 4000, label: '4kHz' },
    { name: 'Air', freq: 8000, label: '8kHz' },
    { name: 'Brilliance', freq: 12000, label: '12kHz' },
  ];
  const sampleRate = 44100;
  const fftSize = 4096;
  const binHz = sampleRate / fftSize;

  return BANDS.map(band => {
    const bin = Math.round(band.freq / binHz);
    const myDb = myAnalysis.freqData[Math.min(bin, myAnalysis.freqData.length - 1)] ?? -60;
    const refDb = refAnalysis.freqData[Math.min(bin, refAnalysis.freqData.length - 1)] ?? -60;
    const correction = Math.max(-12, Math.min(12, refDb - myDb));
    return { ...band, myDb, refDb, correction };
  });
}

// ---------------------------------------------------------------------------
// Spectrum Visualizer
// ---------------------------------------------------------------------------
function SpectrumCompare({ myFreq, refFreq, width = 500, height = 160 }) {
  if (!myFreq || !refFreq) return null;
  const padding = { top:10, right:10, bottom:30, left:40 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;
  const numBins = Math.min(myFreq.length, refFreq.length, 256);
  const minDb = -100, maxDb = 0;

  const toX = (i) => (i / numBins) * chartW;
  const toY = (db) => chartH - ((Math.max(minDb, Math.min(maxDb, db)) - minDb) / (maxDb - minDb)) * chartH;

  const myPath = myFreq.slice(0, numBins).map((db, i) => `${i===0?'M':'L'}${toX(i)},${toY(db)}`).join(' ');
  const refPath = refFreq.slice(0, numBins).map((db, i) => `${i===0?'M':'L'}${toX(i)},${toY(db)}`).join(' ');

  const freqLabels = ['100','500','1k','5k','10k'];
  const freqPositions = [0.05, 0.22, 0.38, 0.65, 0.82];

  return (
    <svg width={width} height={height} style={{fontFamily:'JetBrains Mono,monospace'}}>
      <g transform={`translate(${padding.left},${padding.top})`}>
        {/* Grid */}
        {[-80,-60,-40,-20,0].map(db => (
          <g key={db}>
            <line x1={0} y1={toY(db)} x2={chartW} y2={toY(db)} stroke="#21262d" strokeWidth={0.5} />
            <text x={-4} y={toY(db)+3} fill="#8b949e" fontSize={8} textAnchor="end">{db}</text>
          </g>
        ))}
        {freqLabels.map((label, i) => (
          <text key={label} x={freqPositions[i]*chartW} y={chartH+16} fill="#8b949e" fontSize={8} textAnchor="middle">{label}</text>
        ))}
        {/* Curves */}
        <path d={refPath} fill="none" stroke="#FF6600" strokeWidth={1.5} opacity={0.7} />
        <path d={myPath}  fill="none" stroke="#00ffc8" strokeWidth={1.5} opacity={0.9} />
        {/* Legend */}
        <rect x={chartW-100} y={4} width={8} height={8} fill="#00ffc8" />
        <text x={chartW-88} y={12} fill="#00ffc8" fontSize={8}>Your mix</text>
        <rect x={chartW-100} y={18} width={8} height={8} fill="#FF6600" />
        <text x={chartW-88} y={26} fill="#FF6600" fontSize={8}>Reference</text>
      </g>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// EQ Correction Bar Chart
// ---------------------------------------------------------------------------
function EQCorrections({ bands }) {
  if (!bands?.length) return null;
  return (
    <div style={{display:'flex', gap:4, alignItems:'flex-end', height:80, padding:'0 4px'}}>
      {bands.map(band => {
        const normalized = band.correction / 12;
        const barH = Math.abs(normalized) * 36;
        const isBoost = band.correction >= 0;
        return (
          <div key={band.name} style={{flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:2}}>
            <div style={{fontSize:8, color: isBoost ? '#00ffc8' : '#FF6600', fontFamily:'JetBrains Mono,monospace', fontWeight:700}}>
              {band.correction >= 0 ? '+' : ''}{band.correction.toFixed(1)}
            </div>
            <div style={{
              width:'100%', height: barH || 2,
              background: isBoost ? '#00ffc888' : '#FF660088',
              border: `1px solid ${isBoost ? '#00ffc8' : '#FF6600'}`,
              borderRadius: 2,
            }} />
            <div style={{fontSize:7, color:'#8b949e', textAlign:'center', fontFamily:'JetBrains Mono,monospace'}}>
              {band.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
export default function ReferenceMastering({ onApplyCorrections = () => {} }) {
  const [myFile, setMyFile] = useState(null);
  const [refFile, setRefFile] = useState(null);
  const [myAnalysis, setMyAnalysis] = useState(null);
  const [refAnalysis, setRefAnalysis] = useState(null);
  const [eqCorrections, setEqCorrections] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const myInputRef = useRef(null);
  const refInputRef = useRef(null);

  const handleFile = useCallback(async (file, isRef) => {
    if (!file) return;
    const buf = await file.arrayBuffer();
    setAnalyzing(true);
    setError('');
    try {
      const analysis = await analyzeAudio(buf);
      if (isRef) {
        setRefFile(file.name);
        setRefAnalysis(analysis);
      } else {
        setMyFile(file.name);
        setMyAnalysis(analysis);
      }
    } catch (e) {
      setError(`Analysis failed: ${e.message}`);
    } finally {
      setAnalyzing(false);
    }
  }, []);

  useEffect(() => {
    if (myAnalysis && refAnalysis) {
      const corrections = computeCorrectiveEQ(myAnalysis, refAnalysis);
      setEqCorrections(corrections);
    }
  }, [myAnalysis, refAnalysis]);

  const handleApply = () => {
    if (!eqCorrections) return;
    const gainCorrection = refAnalysis.lufs - myAnalysis.lufs;
    onApplyCorrections(eqCorrections, gainCorrection);
  };

  const s = {
    root: {
      background:'#0d1117', color:'#e6edf3',
      fontFamily:'JetBrains Mono,monospace', fontSize:12,
      padding:16,
    },
    title: { fontSize:13, fontWeight:700, color:'#00ffc8', marginBottom:12, letterSpacing:1 },
    card: {
      background:'#161b22', border:'1px solid #21262d',
      borderRadius:8, padding:12, marginBottom:12,
    },
    label: { fontSize:11, color:'#8b949e', marginBottom:6, display:'block' },
    uploadBtn: (hasFile) => ({
      background: hasFile ? '#00ffc811' : '#21262d',
      border:`1px solid ${hasFile ? '#00ffc8' : '#30363d'}`,
      color: hasFile ? '#00ffc8' : '#8b949e',
      borderRadius:6, padding:'8px 14px', cursor:'pointer',
      fontFamily:'inherit', fontSize:11, width:'100%', textAlign:'left',
    }),
    stat: { display:'flex', justifyContent:'space-between', padding:'4px 0',
      borderBottom:'1px solid #21262d', fontSize:11 },
    statLabel: { color:'#8b949e' },
    statValue: (good) => ({ color: good ? '#00ffc8' : '#FF6600', fontWeight:700 }),
    applyBtn: {
      background:'#00ffc822', border:'1px solid #00ffc8', color:'#00ffc8',
      borderRadius:6, padding:'10px 20px', cursor:'pointer',
      fontFamily:'inherit', fontSize:13, fontWeight:700, width:'100%',
      marginTop:8,
    },
  };

  return (
    <div style={s.root}>
      <div style={s.title}>🎚 REFERENCE MASTERING</div>
      <p style={{fontSize:11, color:'#8b949e', marginBottom:12}}>
        Upload your mix and a reference track to get a corrective EQ + gain analysis.
      </p>

      {error && (
        <div style={{background:'#ff444422',border:'1px solid #ff4444',color:'#ff4444',borderRadius:6,padding:'8px 12px',marginBottom:12,fontSize:11}}>
          ⚠ {error}
        </div>
      )}

      {/* Upload Section */}
      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12}}>
        <div style={s.card}>
          <span style={s.label}>YOUR MIX</span>
          <input ref={myInputRef} type="file" accept="audio/*" style={{display:'none'}}
            onChange={e => handleFile(e.target.files[0], false)} />
          <button style={s.uploadBtn(!!myFile)} onClick={() => myInputRef.current.click()}>
            {myFile ? `✓ ${myFile}` : '📂 Upload your mix...'}
          </button>
        </div>
        <div style={s.card}>
          <span style={s.label}>REFERENCE TRACK</span>
          <input ref={refInputRef} type="file" accept="audio/*" style={{display:'none'}}
            onChange={e => handleFile(e.target.files[0], true)} />
          <button style={s.uploadBtn(!!refFile)} onClick={() => refInputRef.current.click()}>
            {refFile ? `✓ ${refFile}` : '📂 Upload reference...'}
          </button>
        </div>
      </div>

      {analyzing && (
        <div style={{textAlign:'center', padding:20, color:'#00ffc8'}}>Analyzing audio...</div>
      )}

      {/* Spectrum Compare */}
      {myAnalysis && refAnalysis && (
        <>
          <div style={s.card}>
            <div style={{fontSize:11, fontWeight:700, color:'#e6edf3', marginBottom:8}}>FREQUENCY SPECTRUM</div>
            <SpectrumCompare
              myFreq={myAnalysis.freqData}
              refFreq={refAnalysis.freqData}
              width={520} height={160}
            />
          </div>

          {/* Stats comparison */}
          <div style={{...s.card, display:'grid', gridTemplateColumns:'1fr 1fr', gap:12}}>
            <div>
              <div style={{fontSize:11, fontWeight:700, color:'#00ffc8', marginBottom:6}}>YOUR MIX</div>
              {[
                ['LUFS', `${myAnalysis.lufs.toFixed(1)} dB`],
                ['Peak', `${myAnalysis.peak.toFixed(1)} dB`],
                ['Dynamic Range', `${myAnalysis.dynamicRange.toFixed(1)} dB`],
                ['Stereo Width', `${myAnalysis.stereoWidth.toFixed(0)}%`],
              ].map(([k,v]) => (
                <div key={k} style={s.stat}>
                  <span style={s.statLabel}>{k}</span>
                  <span style={{color:'#00ffc8', fontWeight:700}}>{v}</span>
                </div>
              ))}
            </div>
            <div>
              <div style={{fontSize:11, fontWeight:700, color:'#FF6600', marginBottom:6}}>REFERENCE</div>
              {[
                ['LUFS', `${refAnalysis.lufs.toFixed(1)} dB`],
                ['Peak', `${refAnalysis.peak.toFixed(1)} dB`],
                ['Dynamic Range', `${refAnalysis.dynamicRange.toFixed(1)} dB`],
                ['Stereo Width', `${refAnalysis.stereoWidth.toFixed(0)}%`],
              ].map(([k,v]) => (
                <div key={k} style={s.stat}>
                  <span style={s.statLabel}>{k}</span>
                  <span style={{color:'#FF6600', fontWeight:700}}>{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* EQ Corrections */}
          {eqCorrections && (
            <div style={s.card}>
              <div style={{fontSize:11, fontWeight:700, color:'#e6edf3', marginBottom:8}}>
                CORRECTIVE EQ
                <span style={{fontSize:10, color:'#8b949e', marginLeft:8, fontWeight:400}}>
                  Green = boost · Orange = cut
                </span>
              </div>
              <EQCorrections bands={eqCorrections} />
              <div style={{fontSize:10, color:'#8b949e', marginTop:8}}>
                Gain correction needed: {(refAnalysis.lufs - myAnalysis.lufs) > 0 ? '+' : ''}{(refAnalysis.lufs - myAnalysis.lufs).toFixed(1)} dB
              </div>
              <button style={s.applyBtn} onClick={handleApply}>
                → Apply to Mastering Chain
              </button>
            </div>
          )}
        </>
      )}

      {(!myAnalysis || !refAnalysis) && !analyzing && (
        <div style={{textAlign:'center', padding:20, color:'#8b949e', fontSize:11}}>
          Upload both files above to begin analysis
        </div>
      )}
    </div>
  );
}
