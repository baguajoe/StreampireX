/**
 * SPXCutScopes.js
 * Waveform, Vectorscope, Histogram, Parade scopes.
 * Reads from program monitor canvas via RAF.
 * Zero inline CSS.
 */
import React, { useRef, useEffect, useState, useCallback } from 'react';

const SCOPE_TABS = ['Waveform', 'Vectorscope', 'Histogram', 'Parade'];

function drawWaveform(canvas, imageData) {
  if (!imageData) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width = canvas.offsetWidth || 256;
  const H = canvas.height = 128;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);
  const data = imageData.data;
  const srcW = imageData.width;
  const srcH = imageData.height;
  ctx.strokeStyle = 'rgba(0,255,200,0.15)';
  ctx.lineWidth = 1;
  for (let x = 0; x < W; x++) {
    const srcX = Math.floor((x / W) * srcW);
    for (let y = 0; y < srcH; y++) {
      const i = (y * srcW + srcX) * 4;
      const lum = (data[i] * 0.299 + data[i+1] * 0.587 + data[i+2] * 0.114) / 255;
      const py = H - Math.floor(lum * H);
      ctx.fillStyle = `rgba(0,255,200,0.3)`;
      ctx.fillRect(x, py, 1, 1);
    }
  }
  // Graticule
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  [0,25,50,75,100].forEach(pct => {
    const y = H - Math.floor(pct / 100 * H);
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = '8px JetBrains Mono';
    ctx.fillText(pct, 2, y - 2);
  });
}

function drawVectorscope(canvas, imageData) {
  if (!imageData) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width = canvas.offsetWidth || 256;
  const H = canvas.height = W;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);
  // Graticule circle
  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  ctx.beginPath();
  ctx.arc(W/2, H/2, W/2 - 4, 0, Math.PI*2);
  ctx.stroke();
  // Color targets
  const targets = [
    { label: 'R', angle: 0,   color: '#ff4455' },
    { label: 'G', angle: 120, color: '#44ff88' },
    { label: 'B', angle: 240, color: '#4499ff' },
    { label: 'Cy', angle: 180, color: '#00ffc8' },
    { label: 'Mg', angle: 300, color: '#ff44ff' },
    { label: 'Yw', angle: 60,  color: '#ffcc00' },
  ];
  targets.forEach(t => {
    const rad = (t.angle - 90) * Math.PI / 180;
    const r = W * 0.42;
    const x = W/2 + r * Math.cos(rad);
    const y = H/2 + r * Math.sin(rad);
    ctx.strokeStyle = t.color;
    ctx.lineWidth = 1;
    ctx.strokeRect(x - 4, y - 4, 8, 8);
    ctx.fillStyle = t.color;
    ctx.font = '7px JetBrains Mono';
    ctx.fillText(t.label, x + 5, y);
  });
  // Plot pixels
  const data = imageData.data;
  const len = data.length;
  for (let i = 0; i < len; i += 16) {
    const r = data[i] / 255, g = data[i+1] / 255, b = data[i+2] / 255;
    const u = -0.147 * r - 0.289 * g + 0.436 * b;
    const v =  0.615 * r - 0.515 * g - 0.100 * b;
    const px = W/2 + u * W * 1.2;
    const py = H/2 - v * H * 1.2;
    ctx.fillStyle = `rgba(${data[i]},${data[i+1]},${data[i+2]},0.4)`;
    ctx.fillRect(px, py, 1, 1);
  }
}

function drawHistogram(canvas, imageData, channel) {
  if (!imageData) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width = canvas.offsetWidth || 256;
  const H = canvas.height = 128;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);
  const data = imageData.data;
  const bins = new Array(256).fill(0);
  const chOffset = channel === 'r' ? 0 : channel === 'g' ? 1 : channel === 'b' ? 2 : -1;
  for (let i = 0; i < data.length; i += 4) {
    if (chOffset === -1) {
      const lum = Math.round(data[i]*0.299 + data[i+1]*0.587 + data[i+2]*0.114);
      bins[lum]++;
    } else {
      bins[data[i + chOffset]]++;
    }
  }
  const max = Math.max(...bins) || 1;
  const color = channel === 'r' ? '#ff4455' : channel === 'g' ? '#44ff88' : channel === 'b' ? '#4499ff' : '#00ffc8';
  ctx.fillStyle = color + '88';
  bins.forEach((v, i) => {
    const x = Math.floor(i / 256 * W);
    const h = Math.floor((v / max) * H);
    ctx.fillRect(x, H - h, Math.ceil(W / 256), h);
  });
  // Graticule
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  [64,128,192].forEach(v => {
    const x = Math.floor(v / 256 * W);
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
  });
}

function drawParade(canvas, imageData) {
  if (!imageData) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width = canvas.offsetWidth || 256;
  const H = canvas.height = 128;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);
  const data = imageData.data;
  const srcW = imageData.width;
  const srcH = imageData.height;
  const pw = Math.floor(W / 3);
  ['r','g','b'].forEach((ch, ci) => {
    const colors = { r: '#ff4455', g: '#44ff88', b: '#4499ff' };
    const offset = ci === 0 ? 0 : ci === 1 ? 1 : 2;
    for (let x = 0; x < pw; x++) {
      const srcX = Math.floor((x / pw) * srcW);
      for (let y = 0; y < srcH; y++) {
        const i = (y * srcW + srcX) * 4;
        const val = data[i + offset] / 255;
        const py = H - Math.floor(val * H);
        ctx.fillStyle = colors[ch] + '44';
        ctx.fillRect(ci * pw + x, py, 1, 1);
      }
    }
    ctx.strokeStyle = colors[ch] + '44';
    ctx.strokeRect(ci * pw, 0, pw, H);
    ctx.fillStyle = colors[ch];
    ctx.font = '8px JetBrains Mono';
    ctx.fillText(ch.toUpperCase(), ci * pw + 4, 12);
  });
}

function SPXCutScopes({ state, actions }) {
  const canvasRef  = useRef(null);
  const rafRef     = useRef(null);
  const [activeScope, setActiveScope] = useState('Waveform');

  // Grab frame from program monitor canvas
  const grabFrame = useCallback(() => {
    const programCanvas = document.querySelector('.spxcut-monitor-canvas');
    if (!programCanvas || !canvasRef.current) return null;
    try {
      const tmp = document.createElement('canvas');
      tmp.width  = programCanvas.width  || programCanvas.offsetWidth;
      tmp.height = programCanvas.height || programCanvas.offsetHeight;
      if (tmp.width === 0 || tmp.height === 0) return null;
      tmp.getContext('2d').drawImage(programCanvas, 0, 0);
      return tmp.getContext('2d').getImageData(0, 0, tmp.width, tmp.height);
    } catch(e) { return null; }
  }, []);

  useEffect(() => {
    const draw = () => {
      const imageData = grabFrame();
      const canvas = canvasRef.current;
      if (!canvas || !imageData) { rafRef.current = requestAnimationFrame(draw); return; }
      switch (activeScope) {
        case 'Waveform':    drawWaveform(canvas, imageData);   break;
        case 'Vectorscope': drawVectorscope(canvas, imageData); break;
        case 'Histogram':   drawHistogram(canvas, imageData, 'lum'); break;
        case 'Parade':      drawParade(canvas, imageData);     break;
        default: break;
      }
      rafRef.current = requestAnimationFrame(draw);
    };
    rafRef.current = requestAnimationFrame(draw);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [activeScope, grabFrame]);

  return (
    <div className="spxcut-scopes-panel">
      <div className="spxcut-scope-tabs">
        {SCOPE_TABS.map(t => (
          <button
            key={t}
            className={`spxcut-scope-tab${activeScope === t ? ' scope-active' : ''}`}
            onClick={() => setActiveScope(t)}
          >{t}</button>
        ))}
        <button
          className="spxcut-scope-tab"
          onClick={() => actions.setScopes(false)}
          style={{ marginLeft: 'auto', color: 'var(--red)' }}
        >✕</button>
      </div>
      <div className="spxcut-scope-canvas-wrap">
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}

export default SPXCutScopes;
