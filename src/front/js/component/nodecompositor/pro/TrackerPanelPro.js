// src/front/js/component/nodecompositor/pro/TrackerPanelPro.js
import React, { useState, useRef, useCallback } from "react";
import { createTrackerJob, sampleTrackerMotion, solveTrackFromSamples } from "../../../utils/compositor/pro/trackerSolver";

const S = { bg:'#0d1117', accent:'#00ffc8', border:'rgba(0,255,200,0.15)', text:'#dde6ef', dim:'#4e6a82', orange:'#ff9f45' };

export default function TrackerPanelPro({ onTrackSolved }) {
  const [job, setJob] = useState(createTrackerJob());
  const [seed, setSeed] = useState({ x:320, y:180 });
  const [solving, setSolving] = useState(false);
  const [smoothing, setSmoothing] = useState(0.5);
  const canvasRef = useRef(null);

  const drawPath = useCallback((solved) => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0,0,W,H);
    ctx.fillStyle = '#081220';
    ctx.fillRect(0,0,W,H);
    if (!solved.length) return;

    const xs = solved.map(s=>s.x), ys = solved.map(s=>s.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const rangeX = maxX - minX || 1, rangeY = maxY - minY || 1;

    const toScreen = (x,y) => ({
      sx: 20 + ((x-minX)/rangeX)*(W-40),
      sy: 20 + ((y-minY)/rangeY)*(H-40),
    });

    // Draw path
    ctx.beginPath();
    solved.forEach((s, i) => {
      const {sx,sy} = toScreen(s.x, s.y);
      i === 0 ? ctx.moveTo(sx,sy) : ctx.lineTo(sx,sy);
    });
    ctx.strokeStyle = S.accent; ctx.lineWidth = 2; ctx.stroke();

    // Draw dots
    solved.forEach((s, i) => {
      const {sx,sy} = toScreen(s.x, s.y);
      ctx.beginPath();
      ctx.arc(sx, sy, i===0||i===solved.length-1 ? 5 : 2.5, 0, Math.PI*2);
      ctx.fillStyle = i===0 ? S.orange : i===solved.length-1 ? S.accent : `${S.accent}88`;
      ctx.fill();
    });

    ctx.fillStyle = S.dim; ctx.font = '11px monospace';
    ctx.fillText(`${solved.length} frames tracked`, 8, H-6);
  }, []);

  const handleSolve = async () => {
    setSolving(true);
    await new Promise(r => setTimeout(r, 300));
    const raw = sampleTrackerMotion(seed, 24, 5);
    const solved = solveTrackFromSamples(raw, smoothing);
    setJob(j => ({ ...j, status:'solved', sampledFrames: solved }));
    drawPath(solved);
    onTrackSolved?.(solved);
    setSolving(false);
  };

  return (
    <div className="motion-panel">
      <div className="motion-panel-title">📍 Tracker Solver Pro</div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:10 }}>
        {[['Seed X', 'x', 0, 1280], ['Seed Y', 'y', 0, 720]].map(([label, key, min, max]) => (
          <label key={key} style={{ color:S.dim, fontSize:'0.7rem', display:'flex', flexDirection:'column', gap:2 }}>
            {label}
            <input type="number" min={min} max={max} value={seed[key]}
              onChange={e => setSeed(s => ({...s, [key]: Number(e.target.value)}))}
              style={{ background:'#16263d', border:`1px solid ${S.border}`, color:S.text, borderRadius:4, padding:'3px 6px', fontSize:'0.75rem' }} />
          </label>
        ))}
      </div>

      <label style={{ color:S.dim, fontSize:'0.7rem', display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
        Smoothing
        <input type="range" min={0} max={1} step={0.05} value={smoothing}
          onChange={e => setSmoothing(Number(e.target.value))} style={{ flex:1 }} />
        <span style={{ color:S.accent, width:30 }}>{smoothing.toFixed(2)}</span>
      </label>

      <canvas ref={canvasRef} width={280} height={140}
        style={{ width:'100%', height:140, borderRadius:6, border:`1px solid ${S.border}`, marginBottom:10 }} />

      <button onClick={handleSolve} disabled={solving} style={{
        width:'100%', padding:'7px', borderRadius:6, cursor:'pointer', fontWeight:700, fontSize:'0.8rem',
        background: solving ? S.dim : S.accent, color:'#000', border:'none',
      }}>
        {solving ? 'Solving...' : '▶ Solve Track'}
      </button>

      {job.status === 'solved' && (
        <div style={{ marginTop:8, fontSize:'0.65rem', color:S.dim }}>
          ✅ {job.sampledFrames.length} frames solved • Smoothing {smoothing.toFixed(2)}
        </div>
      )}
    </div>
  );
}
