// =============================================================================
// PluginRackDemo.jsx — Demo / Test Page for Plugin System
// =============================================================================
// Route: /plugin-rack-demo
// Creates test track with AudioEngine + TrackGraph, loads test tone,
// shows PluginRackPanel for hands-on testing.
// =============================================================================

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getEngine } from '../component/audio/engine/AudioEngine';
import TrackGraph from '../component/audio/engine/TrackGraph';
import PluginRackPanel from '../component/audio/components/plugins/PluginRackPanel';

const PluginRackDemo = () => {
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [status, setStatus] = useState('Click "Initialize" to start');
  const tgRef = useRef(null);

  const init = useCallback(() => {
    const eng = getEngine(); eng.init();
    const tg = new TrackGraph('demo-1', eng.context, { name: 'Demo Track', color: '#00ffc8' });
    eng.registerTrack(tg);
    tgRef.current = tg;
    setReady(true); setStatus('Engine ready — generate or load audio');
  }, []);

  const genTone = useCallback(() => {
    const eng = getEngine(); if (!eng.context) return;
    const ctx = eng.context, sr = ctx.sampleRate, dur = 4;
    const buf = ctx.createBuffer(2, sr * dur, sr);
    const freqs = [261.63, 329.63, 392.0, 523.25];
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < d.length; i++) {
        let s = 0; const t = i / sr;
        const env = Math.min(1, t * 10) * Math.max(0, 1 - (t - dur + 0.5) * 2);
        freqs.forEach((f, fi) => { s += Math.sin(2 * Math.PI * f * (ch === 0 ? 1.001 : 0.999) * t + fi * 0.3) * 0.15; });
        d[i] = (s + (Math.random() * 2 - 1) * 0.005) * env;
      }
    }
    tgRef.current?.setAudioBuffer(buf);
    setLoaded(true); setStatus('Test tone loaded — add plugins and press Play');
  }, []);

  const loadFile = useCallback(() => {
    const eng = getEngine(); if (!eng.context) return;
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'audio/*';
    inp.onchange = async (e) => {
      const f = e.target.files[0]; if (!f) return; setStatus('Loading...');
      try {
        const buf = await eng.context.decodeAudioData(await f.arrayBuffer());
        tgRef.current?.setAudioBuffer(buf);
        setLoaded(true); setStatus(`Loaded: ${f.name} (${buf.duration.toFixed(1)}s)`);
      } catch (err) { setStatus(`Error: ${err.message}`); }
    }; inp.click();
  }, []);

  const toggle = useCallback(() => {
    const tg = tgRef.current; if (!tg?.audioBuffer) return;
    if (playing) { tg.stop(); setPlaying(false); setStatus('Stopped'); }
    else { tg.play(0); setPlaying(true); setStatus('Playing — adjust plugins in real-time'); }
  }, [playing]);

  useEffect(() => () => getEngine().destroy(), []);

  return (
    <div style={{ background: '#0a1018', minHeight: '100vh', color: '#e0e8f0', fontFamily: "'Inter', sans-serif", display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 20px', borderBottom: '1px solid #1e2d3d', flexWrap: 'wrap' }}>
        <h1 style={{ margin: 0, fontSize: 18, color: '#00ffc8' }}>🔌 Plugin Rack Demo</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          {!ready ? <button style={btnStyle} onClick={init}>Initialize Engine</button> : <>
            <button style={btnStyle} onClick={genTone}>🎵 Test Tone</button>
            <button style={btnStyle} onClick={loadFile}>📂 Load Audio</button>
            <button style={{ ...btnStyle, ...(playing ? { background: '#ff3b3030', borderColor: '#ff3b30', color: '#ff3b30' } : {}) }} onClick={toggle} disabled={!loaded}>
              {playing ? '⏹ Stop' : '▶ Play'}
            </button>
          </>}
        </div>
        <span style={{ fontSize: 12, color: '#5a7088', marginLeft: 'auto' }}>{status}</span>
      </div>
      <div style={{ flex: 1, padding: 16, maxWidth: 480, minHeight: 400 }}>
        {ready && tgRef.current
          ? <PluginRackPanel trackGraph={tgRef.current} trackName="Demo Track" trackColor="#00ffc8" />
          : <div style={{ textAlign: 'center', padding: 60, color: '#3a4a5a' }}>Initialize the engine to see the plugin rack</div>}
      </div>
      <div style={{ padding: '16px 20px', borderTop: '1px solid #1e2d3d', maxWidth: 600, fontSize: 13, color: '#5a7088', lineHeight: 1.8 }}>
        <strong style={{ color: '#8899aa' }}>How to use:</strong> Initialize → Test Tone or Load Audio → Add Plugin → Play → Adjust in real-time.
        Try: EQ → Compressor → Reverb for a classic vocal chain.
      </div>
    </div>
  );
};

const btnStyle = { background: '#1a2332', border: '1px solid #2a3a4a', borderRadius: 6, padding: '8px 16px', color: '#c8d8e8', fontSize: 13, cursor: 'pointer', fontWeight: 600 };

export default PluginRackDemo;