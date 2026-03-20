// src/front/js/component/nodecompositor/pro/GPUMultiPassPanel.js
import React, { useEffect, useRef, useState, useCallback } from "react";
import { DEFAULT_PASSES, renderMultiPassGPU } from "../../../utils/compositor/pro/multiPassGPU";

const S = { bg:'#0d1117', accent:'#00ffc8', border:'rgba(0,255,200,0.15)', text:'#dde6ef', dim:'#4e6a82', orange:'#ff9f45' };

export default function GPUMultiPassPanel() {
  const canvasRef  = useRef(null);
  const rafRef     = useRef(null);
  const startRef   = useRef(performance.now());
  const [passes,   setPasses]   = useState(DEFAULT_PASSES);
  const [fps,      setFps]      = useState(0);
  const [playing,  setPlaying]  = useState(true);
  const lastFrameRef = useRef(performance.now());
  const fpsCountRef  = useRef(0);

  const draw = useCallback((now) => {
    const canvas = canvasRef.current; if (!canvas) return;
    try {
      renderMultiPassGPU(canvas, passes, (now - startRef.current) / 1000);
    } catch(e) { console.warn('GPU pass error', e); }

    fpsCountRef.current++;
    if (now - lastFrameRef.current >= 1000) {
      setFps(fpsCountRef.current);
      fpsCountRef.current = 0;
      lastFrameRef.current = now;
    }
    if (playing) rafRef.current = requestAnimationFrame(draw);
  }, [passes, playing]);

  useEffect(() => {
    if (playing) rafRef.current = requestAnimationFrame(draw);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [draw, playing]);

  const togglePass = (id) => {
    setPasses(prev => prev.map(p => p.id === id ? { ...p, enabled: !p.enabled } : p));
  };

  const updateParam = (passId, key, value) => {
    setPasses(prev => prev.map(p => p.id === passId ? { ...p, params: { ...p.params, [key]: value } } : p));
  };

  return (
    <div className="motion-panel">
      <div className="motion-panel-title" style={{ display:'flex', alignItems:'center', gap:8 }}>
        ⚡ Multi-Pass GPU Compositor
        <span style={{ marginLeft:'auto', fontSize:'0.65rem', color:S.accent, fontFamily:'monospace' }}>
          {fps} fps
        </span>
        <button onClick={() => setPlaying(p => !p)} style={{
          padding:'2px 8px', borderRadius:4, cursor:'pointer', fontSize:'0.65rem',
          background: playing ? S.dim : S.accent, color: playing ? S.text : '#000', border:'none',
        }}>
          {playing ? '⏸' : '▶'}
        </button>
      </div>

      <canvas ref={canvasRef} width={640} height={260}
        style={{ width:'100%', height:200, borderRadius:10, border:`1px solid ${S.border}`, background:'#081220', marginBottom:10 }} />

      <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
        {passes.map(p => (
          <div key={p.id} style={{
            background: p.enabled ? `${S.accent}08` : 'transparent',
            border: `1px solid ${p.enabled ? S.accent : S.border}`,
            borderRadius:6, padding:'6px 8px',
          }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <input type="checkbox" checked={p.enabled} onChange={() => togglePass(p.id)} />
              <span style={{ color: p.enabled ? S.text : S.dim, fontSize:'0.75rem', fontWeight: p.enabled ? 700 : 400 }}>
                {p.label}
              </span>
              <span style={{ marginLeft:'auto', fontSize:'0.6rem', color:S.dim, fontFamily:'monospace' }}>
                {p.type}
              </span>
            </div>
            {p.enabled && p.params && Object.entries(p.params).map(([key, val]) => (
              <div key={key} style={{ display:'flex', alignItems:'center', gap:6, marginTop:4, paddingLeft:20 }}>
                <span style={{ fontSize:'0.65rem', color:S.dim, width:80 }}>{key}</span>
                <input type="range"
                  min={key==='radius'||key==='shift'?0:key==='amount'?0:0}
                  max={key==='radius'?20:key==='shift'?10:key==='amount'?40:key==='strength'?2:2}
                  step={0.05} value={val}
                  onChange={e => updateParam(p.id, key, Number(e.target.value))}
                  style={{ flex:1 }} />
                <span style={{ fontSize:'0.65rem', color:S.accent, width:32, fontFamily:'monospace' }}>
                  {typeof val === 'number' ? val.toFixed(2) : val}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
