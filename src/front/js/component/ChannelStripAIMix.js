import React, { useState, useCallback, useRef } from 'react';

const AI_MIX_TIERS = ['starter', 'creator', 'pro'];

const analyzeTrack = async (audioBuffer) => {
  if (!audioBuffer) return null;
  const data = audioBuffer.getChannelData(0);
  const sr = audioBuffer.sampleRate;
  const len = data.length;
  let sumSq = 0;
  for (let i = 0; i < len; i++) sumSq += data[i] * data[i];
  const rms = Math.sqrt(sumSq / len);
  const rmsDb = 20 * Math.log10(Math.max(rms, 1e-10));
  let peak = 0;
  for (let i = 0; i < len; i++) { const a = Math.abs(data[i]); if (a > peak) peak = a; }
  const peakDb = 20 * Math.log10(Math.max(peak, 1e-10));
  const dynamicRange = peakDb - rmsDb;
  const isClipping = peak > 0.99;
  let bandEnergy = { sub: -60, bass: -60, low_mid: -60, mid: -60, high_mid: -60, high: -60 };
  try {
    const fftSize = 2048;
    const ctx = new OfflineAudioContext(1, Math.min(len, sr * 10), sr);
    const src = ctx.createBufferSource();
    const buf = ctx.createBuffer(1, Math.min(len, sr * 10), sr);
    buf.getChannelData(0).set(data.slice(0, buf.length));
    src.buffer = buf;
    const analyser = ctx.createAnalyser();
    analyser.fftSize = fftSize;
    src.connect(analyser);
    analyser.connect(ctx.destination);
    src.start(0);
    await ctx.startRendering();
    const freq = new Float32Array(analyser.frequencyBinCount);
    analyser.getFloatFrequencyData(freq);
    const binHz = sr / fftSize;
    const avgBand = (lo, hi) => {
      const s = Math.floor(lo / binHz), e = Math.ceil(hi / binHz);
      let sum = 0, count = 0;
      for (let i = s; i <= Math.min(e, freq.length - 1); i++) { sum += freq[i]; count++; }
      return count > 0 ? sum / count : -100;
    };
    bandEnergy = { sub: avgBand(20,60), bass: avgBand(60,250), low_mid: avgBand(250,500), mid: avgBand(500,2000), high_mid: avgBand(2000,6000), high: avgBand(6000,20000) };
  } catch (_) {}
  return { rmsDb, peakDb, dynamicRange, isClipping, bandEnergy, peak };
};

const buildSuggestions = (analysis, track) => {
  if (!analysis) return [{ id: 'no_audio', priority: 'low', text: 'No audio on this track', action: null }];
  const { rmsDb, peakDb, dynamicRange, isClipping, bandEnergy } = analysis;
  const suggestions = [];
  if (isClipping) {
    suggestions.push({ id: 'clip', priority: 'critical', text: `Clipping! Reduce volume to ~${Math.max(0.1, track.volume - 0.15).toFixed(2)}`, action: { type: 'volume', value: Math.max(0.1, track.volume - 0.15) }, actionLabel: 'Fix' });
  }
  if (rmsDb < -30 && !isClipping) {
    suggestions.push({ id: 'low_vol', priority: 'high', text: `Too quiet (${rmsDb.toFixed(1)} dBFS). Boost volume.`, action: { type: 'volume', value: Math.min(1.0, track.volume * 1.4) }, actionLabel: 'Boost' });
  }
  if (rmsDb > -6 && !isClipping) {
    suggestions.push({ id: 'hot', priority: 'high', text: `Too loud (${rmsDb.toFixed(1)} dBFS). Reduce for headroom.`, action: { type: 'volume', value: Math.max(0.1, track.volume * 0.7) }, actionLabel: 'Reduce' });
  }
  if (bandEnergy.sub > -20 && bandEnergy.bass > -18) {
    suggestions.push({ id: 'mud', priority: 'medium', text: 'Heavy sub/bass buildup. Apply high-pass filter ~80-120Hz.', action: { type: 'effect', fxKey: 'filter', param: 'enabled', value: true }, actionLabel: 'Enable Filter' });
  }
  if (bandEnergy.high_mid > -15 && bandEnergy.high > -12) {
    suggestions.push({ id: 'harsh', priority: 'medium', text: 'Harsh high-mids. Consider De-Esser or EQ cut 4-8kHz.', action: { type: 'effect', fxKey: 'deesser', param: 'enabled', value: true }, actionLabel: 'Enable De-Esser' });
  }
  if (dynamicRange < 4 && !isClipping) {
    suggestions.push({ id: 'squashed', priority: 'low', text: `Very low dynamic range (${dynamicRange.toFixed(1)} dB). May sound over-compressed.`, action: null });
  }
  if (dynamicRange > 18 && !track.effects?.compressor?.enabled) {
    suggestions.push({ id: 'compress', priority: 'medium', text: `Wide dynamics (${dynamicRange.toFixed(1)} dB). Add compression for consistency.`, action: { type: 'effect', fxKey: 'compressor', param: 'enabled', value: true }, actionLabel: 'Add Comp' });
  }
  if (track.pan === 0 && rmsDb > -40) {
    suggestions.push({ id: 'pan_hint', priority: 'low', text: 'Center-panned. Consider slight panning (±0.2–0.4) to widen mix.', action: null });
  }
  if (suggestions.length === 0) {
    suggestions.push({ id: 'ok', priority: 'low', text: '✓ This track looks good!', action: null });
  }
  return suggestions;
};

const PRIORITY_COLORS = { critical: '#ff3b30', high: '#ff9500', medium: '#ffcc00', low: '#34c759' };
const PRIORITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };

const ChannelStripAIMix = ({ track, trackIndex, userTier, onApplyVolume, onApplyPan, onApplyEffect, onStatus }) => {
  const [open, setOpen] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [suggestions, setSuggestions] = useState(null);
  const popoverRef = useRef(null);
  const tierAllowed = AI_MIX_TIERS.includes((userTier || 'free').toLowerCase());

  const runAnalysis = useCallback(async (e) => {
    e.stopPropagation();
    if (!tierAllowed) { onStatus?.('⚠ AI Mix Assistant requires Starter plan or higher'); return; }
    if (!track.audioBuffer) {
      setSuggestions([{ id: 'no_buf', priority: 'low', text: 'Load or record audio on this track first.', action: null }]);
      setOpen(true); return;
    }
    setAnalyzing(true); setOpen(true); setSuggestions(null);
    try {
      const result = await analyzeTrack(track.audioBuffer);
      const suggs = buildSuggestions(result, track);
      suggs.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
      setSuggestions(suggs);
      onStatus?.(`✨ AI analyzed Track ${trackIndex + 1} — ${suggs.length} suggestion(s)`);
    } catch (err) {
      setSuggestions([{ id: 'err', priority: 'low', text: 'Analysis failed. Try again.', action: null }]);
    } finally { setAnalyzing(false); }
  }, [track, trackIndex, tierAllowed, onStatus]);

  const applyAction = useCallback((sugg, e) => {
    e.stopPropagation();
    const { action } = sugg;
    if (!action) return;
    if (action.type === 'volume') { onApplyVolume?.(trackIndex, action.value); onStatus?.(`✨ AI: Track ${trackIndex + 1} vol → ${Math.round(action.value * 100)}%`); }
    else if (action.type === 'pan') { onApplyPan?.(trackIndex, action.value); }
    else if (action.type === 'effect') { onApplyEffect?.(trackIndex, action.fxKey, action.param, action.value); onStatus?.(`✨ AI: ${action.fxKey} enabled on Track ${trackIndex + 1}`); }
    setSuggestions(prev => prev?.map(s => s.id === sugg.id ? { ...s, applied: true } : s));
  }, [trackIndex, onApplyVolume, onApplyPan, onApplyEffect, onStatus]);

  const hasIssues = suggestions?.some(s => s.priority === 'critical' || s.priority === 'high');
  const hasMedium = suggestions?.some(s => s.priority === 'medium');

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={runAnalysis}
        title={tierAllowed ? `AI Mix Analysis — Track ${trackIndex + 1}` : 'Requires Starter plan'}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px', width: '100%', padding: '3px 4px', background: open ? 'rgba(0,255,200,0.12)' : tierAllowed ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.02)', border: `1px solid ${open ? '#00ffc8' : hasIssues ? '#ff9500' : hasMedium ? '#ffcc00' : '#2a3a4a'}`, borderRadius: '3px', color: tierAllowed ? (open ? '#00ffc8' : '#7a9ab0') : '#3a5060', fontSize: '9px', fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, cursor: tierAllowed ? 'pointer' : 'not-allowed', letterSpacing: '0.03em', transition: 'all 0.15s ease' }}
      >
        {analyzing ? (<><span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>◌</span><span>analyzing</span></>) : (<><span>✨</span><span>AI</span>{suggestions && (<span style={{ background: hasIssues ? '#ff9500' : hasMedium ? '#ffcc00' : '#34c759', color: '#000', borderRadius: '8px', padding: '0 4px', fontSize: '8px', fontWeight: 700, minWidth: '14px', textAlign: 'center' }}>{suggestions.length}</span>)}</>)}
      </button>
      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 999 }} onClick={(e) => { e.stopPropagation(); setOpen(false); }} />
          <div ref={popoverRef} onClick={e => e.stopPropagation()} style={{ position: 'absolute', bottom: 'calc(100% + 6px)', left: '50%', transform: 'translateX(-50%)', width: '220px', background: '#0d1f2d', border: '1px solid #00ffc8', borderRadius: '6px', boxShadow: '0 8px 32px rgba(0,0,0,0.7)', zIndex: 1000, fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', background: 'rgba(0,255,200,0.07)', borderBottom: '1px solid rgba(0,255,200,0.15)' }}>
              <span style={{ color: '#00ffc8', fontWeight: 700, fontSize: '10px' }}>✨ AI Mix — Track {trackIndex + 1}</span>
              <button onClick={(e) => { e.stopPropagation(); setOpen(false); }} style={{ background: 'none', border: 'none', color: '#5a7088', cursor: 'pointer', fontSize: '12px', lineHeight: 1 }}>×</button>
            </div>
            <div style={{ padding: '6px', maxHeight: '260px', overflowY: 'auto' }}>
              {!suggestions ? (
                <div style={{ color: '#5a7088', textAlign: 'center', padding: '12px' }}><span style={{ fontSize: '18px', display: 'block', marginBottom: '4px' }}>◌</span>Analyzing audio…</div>
              ) : (
                suggestions.map((sugg) => (
                  <div key={sugg.id} style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '5px 6px', marginBottom: '4px', background: sugg.applied ? 'rgba(52,199,89,0.08)' : 'rgba(255,255,255,0.03)', border: `1px solid ${sugg.applied ? '#34c759' : PRIORITY_COLORS[sugg.priority] + '40'}`, borderLeft: `3px solid ${sugg.applied ? '#34c759' : PRIORITY_COLORS[sugg.priority]}`, borderRadius: '3px', opacity: sugg.applied ? 0.7 : 1 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '4px' }}>
                      <span style={{ color: PRIORITY_COLORS[sugg.priority], fontSize: '8px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap', paddingTop: '1px' }}>{sugg.applied ? '✓' : sugg.priority}</span>
                      <span style={{ color: '#c0d8e8', lineHeight: 1.4, fontSize: '9px' }}>{sugg.text}</span>
                    </div>
                    {sugg.action && !sugg.applied && (
                      <button onClick={(e) => applyAction(sugg, e)} style={{ alignSelf: 'flex-end', padding: '2px 8px', background: 'rgba(0,255,200,0.1)', border: '1px solid #00ffc8', borderRadius: '3px', color: '#00ffc8', fontSize: '8px', fontWeight: 700, cursor: 'pointer', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.05em' }}>{sugg.actionLabel || 'Apply'}</button>
                    )}
                  </div>
                ))
              )}
            </div>
            <div style={{ padding: '5px 8px', borderTop: '1px solid rgba(0,255,200,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#3a6070', fontSize: '8px' }}>tier: {userTier} · no credits used</span>
              <button onClick={(e) => { e.stopPropagation(); runAnalysis(e); }} style={{ background: 'none', border: '1px solid #1a3a4a', borderRadius: '3px', color: '#5a8090', fontSize: '8px', padding: '2px 6px', cursor: 'pointer', fontFamily: "'JetBrains Mono', monospace" }}>↻ Re-run</button>
            </div>
          </div>
        </>
      )}
      <style>{'@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }'}</style>
    </div>
  );
};

export default ChannelStripAIMix;
