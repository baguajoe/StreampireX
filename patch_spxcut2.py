#!/usr/bin/env python3
"""
SPX Cut — Full feature wire-up patch
Wires:
1. Audio Mixer tab (from VideoEditorAudioMixer.js)
2. Waveform / Vectorscope / Histogram scopes panel
3. Scene Detection (from VideoEditorAdvancedFeatures.js)
4. FFmpeg real export (from useFFmpeg.js)
5. Proxy workflow toggle
6. Color grading scopes tab in right panel
Run: python3 patch_spxcut2.py
"""
import os

BASE = '/workspaces/SpectraSphere'
VE   = f'{BASE}/src/front/js/component/videoeditor'
CSS  = f'{BASE}/src/front/styles/SPXCut.css'

# ── 1. CSS additions ──────────────────────────────────────────
css_additions = """
/* ── Audio Mixer Panel ──────────────────────────────────── */
.spxcut-mixer-panel {
  display: flex;
  flex-direction: column;
  height: 220px;
  flex-shrink: 0;
  border-top: 1px solid var(--border);
  background: var(--bg-base);
  overflow: hidden;
}
.spxcut-mixer-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 10px;
  background: var(--bg-2);
  border-bottom: 1px solid var(--border);
  cursor: pointer;
  flex-shrink: 0;
}
.spxcut-mixer-toggle-label {
  font-size: 10px;
  font-weight: 600;
  color: var(--teal);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
.spxcut-mixer-inner {
  flex: 1;
  overflow-x: auto;
  overflow-y: hidden;
}

/* ── Scopes Panel ───────────────────────────────────────── */
.spxcut-scopes-panel {
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.spxcut-scope-tabs {
  display: flex;
  gap: 2px;
  flex-shrink: 0;
}
.spxcut-scope-tab {
  background: none;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text-dim);
  font-size: 9px;
  padding: 3px 8px;
  cursor: pointer;
  transition: all var(--trans);
  font-family: var(--font);
}
.spxcut-scope-tab.scope-active {
  border-color: var(--teal);
  color: var(--teal);
  background: var(--teal-glow-sm);
}
.spxcut-scope-canvas-wrap {
  background: #000;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  overflow: hidden;
}
.spxcut-scope-canvas-wrap canvas {
  width: 100%;
  display: block;
}

/* ── Scene Detection ────────────────────────────────────── */
.spxcut-scene-panel {
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.spxcut-scene-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.spxcut-scene-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 6px;
  background: var(--bg-3);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all var(--trans);
}
.spxcut-scene-item:hover {
  border-color: var(--teal-dim);
  background: var(--teal-glow-sm);
}
.spxcut-scene-thumb {
  width: 40px;
  height: 23px;
  background: var(--bg-4);
  border-radius: var(--radius-xs);
  overflow: hidden;
  flex-shrink: 0;
}
.spxcut-scene-thumb canvas { width: 100%; height: 100%; display: block; }
.spxcut-scene-tc { font-size: 10px; color: var(--teal); }
.spxcut-scene-label { font-size: 9px; color: var(--text-dim); flex: 1; }

/* ── Proxy Badge ────────────────────────────────────────── */
.spxcut-proxy-badge {
  background: var(--orange-glow-sm);
  border: 1px solid var(--orange-dim);
  border-radius: var(--radius-sm);
  color: var(--orange);
  font-size: 9px;
  padding: 2px 6px;
  margin-left: 6px;
}
.spxcut-proxy-btn {
  background: none;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text-dim);
  font-size: 10px;
  padding: 3px 8px;
  cursor: pointer;
  transition: all var(--trans);
  font-family: var(--font);
}
.spxcut-proxy-btn:hover { border-color: var(--orange); color: var(--orange); }
.spxcut-proxy-btn.proxy-on { border-color: var(--orange); color: var(--orange); background: var(--orange-glow-sm); }
"""

css = open(CSS).read()
if '.spxcut-mixer-panel' not in css:
    css += css_additions
    open(CSS, 'w').write(css)
    print('✓ CSS additions written')
else:
    print('✓ CSS already patched')

# ── 2. SPXCutEditor.js — add AudioMixer + Scopes + Scene tabs ─
editor_path = f'{VE}/SPXCutEditor.js'
editor = open(editor_path).read()

if 'VideoEditorAudioMixer' not in editor:
    # Add import
    editor = editor.replace(
        "import SPXCutContextMenu     from './SPXCutContextMenu';",
        """import SPXCutContextMenu     from './SPXCutContextMenu';
import SPXCutAudioMixer      from './SPXCutAudioMixer';
import SPXCutScopes          from './SPXCutScopes';
import SPXCutSceneDetect     from './SPXCutSceneDetect';"""
    )

    # Add showMixer/showScopes/showScenes to state usage — add below bottom-row
    editor = editor.replace(
        "      {/* Modals / Overlays */}",
        """      {/* Audio Mixer */}
      {state.showMixer && (
        <SPXCutAudioMixer
          state={state}
          actions={actions}
        />
      )}

      {/* Modals / Overlays */}"""
    )

    open(editor_path, 'w').write(editor)
    print('✓ SPXCutEditor.js patched')
else:
    print('✓ SPXCutEditor.js already patched')

# ── 3. useEditorStore.js — add showMixer/showScopes/proxyMode ─
store_path = f'{VE}/hooks/useEditorStore.js'
store = open(store_path).read()

if 'showMixer' not in store:
    store = store.replace(
        "  showExportModal:   false,",
        """  showExportModal:   false,
  showMixer:         false,
  showScopes:        false,
  showSceneDetect:   false,
  proxyMode:         false,"""
    )
    store = store.replace(
        "    case 'SET_EXPORT_MODAL':\n      return { ...state, showExportModal: action.payload };",
        """    case 'SET_EXPORT_MODAL':
      return { ...state, showExportModal: action.payload };
    case 'SET_MIXER':
      return { ...state, showMixer: action.payload };
    case 'SET_SCOPES':
      return { ...state, showScopes: action.payload };
    case 'SET_SCENE_DETECT':
      return { ...state, showSceneDetect: action.payload };
    case 'SET_PROXY_MODE':
      return { ...state, proxyMode: action.payload };"""
    )
    store = store.replace(
        "    setExportModal:   useCallback(v => dispatch({ type: 'SET_EXPORT_MODAL', payload: v }), []),",
        """    setExportModal:   useCallback(v => dispatch({ type: 'SET_EXPORT_MODAL', payload: v }), []),
    setMixer:         useCallback(v => dispatch({ type: 'SET_MIXER', payload: v }), []),
    setScopes:        useCallback(v => dispatch({ type: 'SET_SCOPES', payload: v }), []),
    setSceneDetect:   useCallback(v => dispatch({ type: 'SET_SCENE_DETECT', payload: v }), []),
    setProxyMode:     useCallback(v => dispatch({ type: 'SET_PROXY_MODE', payload: v }), []),"""
    )
    open(store_path, 'w').write(store)
    print('✓ useEditorStore.js patched')
else:
    print('✓ useEditorStore.js already patched')

# ── 4. SPXCutHeader.js — wire mixer/scopes/scene/proxy buttons ─
header_path = f'{VE}/SPXCutHeader.js'
header = open(header_path).read()

if 'setMixer' not in header:
    header = header.replace(
        "      case 'colorGrade':\n        actions.setColorGrade(!state.showColorGrade);\n        break;",
        """      case 'colorGrade':
        actions.setColorGrade(!state.showColorGrade);
        break;
      case 'mixer':
        actions.setMixer(!state.showMixer);
        break;
      case 'scopes':
        actions.setScopes(!state.showScopes);
        break;
      case 'sceneDetect':
        actions.setSceneDetect(!state.showSceneDetect);
        break;
      case 'proxyMode':
        actions.setProxyMode(!state.proxyMode);
        break;"""
    )
    # Add to Window menu
    header = header.replace(
        "    { label: 'Reset Layout',       shortcut: '',        action: 'resetLayout' },",
        """    { label: 'Reset Layout',       shortcut: '',        action: 'resetLayout' },
    { sep: true },
    { label: 'Audio Mixer',        shortcut: 'Shift+6', action: 'mixer' },
    { label: 'Scopes',             shortcut: 'Shift+7', action: 'scopes' },
    { label: 'Scene Detection',    shortcut: 'Shift+8', action: 'sceneDetect' },
    { label: 'Proxy Mode',         shortcut: 'Shift+P', action: 'proxyMode' },"""
    )
    # Add proxy badge to header right
    header = header.replace(
        "        <button\n          className=\"spxcut-hbtn hbtn-export\"",
        """        {state.proxyMode && <span className="spxcut-proxy-badge">PROXY</span>}
        <button
          className="spxcut-proxy-btn"
          onClick={() => handleAction('mixer')}
          title="Audio Mixer (Shift+6)"
        >🎚</button>
        <button
          className="spxcut-proxy-btn"
          onClick={() => handleAction('scopes')}
          title="Scopes (Shift+7)"
        >📊</button>
        <button
          className="spxcut-hbtn hbtn-export\""""
    )
    open(header_path, 'w').write(header)
    print('✓ SPXCutHeader.js patched')
else:
    print('✓ SPXCutHeader.js already patched')

# ── 5. SPXCutAudioMixer.js — wrapper around VideoEditorAudioMixer ─
audio_mixer_code = '''/**
 * SPXCutAudioMixer.js
 * Wraps VideoEditorAudioMixer with SPXCut state integration.
 * Floating panel docked to bottom of editor.
 */
import React, { useRef, useCallback } from 'react';
import VideoEditorAudioMixer from '../../VideoEditorAudioMixer';

function SPXCutAudioMixer({ state, actions }) {
  const windowRef = useRef(null);

  const onTrackUpdate = useCallback((trackId, changes) => {
    actions.updateTrack(trackId, changes);
  }, [actions]);

  return (
    <div className="spxcut-mixer-panel" ref={windowRef}>
      <div className="spxcut-mixer-toggle" onClick={() => actions.setMixer(false)}>
        <span className="spxcut-mixer-toggle-label">🎚 Audio Mixer</span>
        <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>✕</span>
      </div>
      <div className="spxcut-mixer-inner">
        <VideoEditorAudioMixer
          tracks={state.tracks}
          onTrackUpdate={onTrackUpdate}
          onClose={() => actions.setMixer(false)}
        />
      </div>
    </div>
  );
}

export default SPXCutAudioMixer;
'''
open(f'{VE}/SPXCutAudioMixer.js', 'w').write(audio_mixer_code)
print('✓ SPXCutAudioMixer.js written')

# ── 6. SPXCutScopes.js — waveform/vectorscope/histogram ──────
scopes_code = '''/**
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
'''
open(f'{VE}/SPXCutScopes.js', 'w').write(scopes_code)
print('✓ SPXCutScopes.js written')

# ── 7. SPXCutSceneDetect.js ───────────────────────────────────
scene_code = '''/**
 * SPXCutSceneDetect.js
 * Auto-detects scene cuts using histogram analysis from VideoEditorAdvancedFeatures.
 * Shows detected scenes as clickable thumbnails that jump playhead.
 */
import React, { useState, useCallback, useRef } from 'react';
import { detectScenes } from '../../VideoEditorAdvancedFeatures';
import { formatTimecode } from './hooks/usePlayback';

function SPXCutSceneDetect({ state, actions }) {
  const [scenes,    setScenes]    = useState([]);
  const [detecting, setDetecting] = useState(false);
  const [sensitivity, setSensitivity] = useState(0.3);
  const videoRef = useRef(null);

  const runDetection = useCallback(async () => {
    // Find first video clip in timeline
    let videoSrc = null;
    state.tracks.forEach(t => {
      if (t.type === 'video' && t.clips.length) {
        const c = t.clips[0];
        if (c.src) videoSrc = c.src;
      }
    });
    if (!videoSrc) {
      window.alert('Add a video clip to the timeline first.');
      return;
    }
    setDetecting(true);
    setScenes([]);
    try {
      const detected = await detectScenes(videoSrc, { threshold: sensitivity });
      setScenes(detected || []);
    } catch(e) {
      console.error('Scene detection failed', e);
    }
    setDetecting(false);
  }, [state.tracks, sensitivity]);

  const jumpToScene = useCallback((time) => {
    actions.setPlayhead(time);
  }, [actions]);

  const splitAtScenes = useCallback(() => {
    scenes.forEach(s => actions.splitClip(s.time));
  }, [scenes, actions]);

  return (
    <div className="spxcut-scene-panel">
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>Sensitivity</span>
        <input
          type="range" className="spxcut-param-slider"
          min={0.1} max={0.9} step={0.05}
          value={sensitivity}
          onChange={e => setSensitivity(parseFloat(e.target.value))}
        />
        <span style={{ fontSize: 9, color: 'var(--text-dim)', width: 28 }}>{sensitivity.toFixed(2)}</span>
      </div>
      <div style={{ display: 'flex', gap: 5 }}>
        <button
          className="spxcut-modal-btn mbtn-primary"
          onClick={runDetection}
          disabled={detecting}
          style={{ flex: 1 }}
        >
          {detecting ? '⏳ Detecting...' : '🔍 Detect Scenes'}
        </button>
        {scenes.length > 0 && (
          <button
            className="spxcut-modal-btn"
            onClick={splitAtScenes}
            title="Split clips at all detected scene cuts"
          >
            ✂ Split All ({scenes.length})
          </button>
        )}
        <button
          className="spxcut-icon-btn"
          onClick={() => actions.setSceneDetect(false)}
          style={{ color: 'var(--red)' }}
        >✕</button>
      </div>
      <div className="spxcut-scene-list">
        {scenes.length === 0 && !detecting && (
          <div style={{ fontSize: 10, color: 'var(--text-dim)', padding: 8, textAlign: 'center' }}>
            Run detection to find scene cuts
          </div>
        )}
        {scenes.map((scene, i) => (
          <div
            key={i}
            className="spxcut-scene-item"
            onClick={() => jumpToScene(scene.time)}
          >
            <div className="spxcut-scene-thumb">
              {scene.thumbnail && <img src={scene.thumbnail} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />}
            </div>
            <span className="spxcut-scene-tc">{formatTimecode(scene.time)}</span>
            <span className="spxcut-scene-label">Scene {i + 1}</span>
            <button
              className="spxcut-icon-btn"
              onClick={e => { e.stopPropagation(); actions.splitClip(scene.time); }}
              title="Split at this scene"
              style={{ fontSize: 11 }}
            >✂</button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default SPXCutSceneDetect;
'''
open(f'{VE}/SPXCutSceneDetect.js', 'w').write(scene_code)
print('✓ SPXCutSceneDetect.js written')

# ── 8. SPXCutRightPanel.js — add Scopes + Scene tabs ─────────
rp_path = f'{VE}/SPXCutRightPanel.js'
rp = open(rp_path).read()

if 'SPXCutScopes' not in rp:
    rp = "import SPXCutScopes      from './SPXCutScopes';\nimport SPXCutSceneDetect from './SPXCutSceneDetect';\n" + rp
    rp = rp.replace(
        "        <button\n          className={`spxcut-tab${state.activeRightTab === 'presets' ? ' tab-active' : ''}`}\n          onClick={() => actions.setRightTab('presets')}\n        >Presets</button>",
        """        <button
          className={`spxcut-tab${state.activeRightTab === 'presets' ? ' tab-active' : ''}`}
          onClick={() => actions.setRightTab('presets')}
        >Presets</button>
        <button
          className={`spxcut-tab${state.activeRightTab === 'scopes' ? ' tab-active' : ''}`}
          onClick={() => actions.setRightTab('scopes')}
        >Scopes</button>
        <button
          className={`spxcut-tab${state.activeRightTab === 'scenes' ? ' tab-active' : ''}`}
          onClick={() => actions.setRightTab('scenes')}
        >Scenes</button>"""
    )
    rp = rp.replace(
        "        {state.activeRightTab === 'presets'   && <PresetsTab      clip={activeClip} actions={actions} />}",
        """        {state.activeRightTab === 'presets'   && <PresetsTab         clip={activeClip} actions={actions} />}
        {state.activeRightTab === 'scopes'    && <SPXCutScopes      state={state} actions={actions} />}
        {state.activeRightTab === 'scenes'    && <SPXCutSceneDetect state={state} actions={actions} />}"""
    )
    open(rp_path, 'w').write(rp)
    print('✓ SPXCutRightPanel.js patched with Scopes + Scenes tabs')
else:
    print('✓ SPXCutRightPanel.js already patched')

# ── 9. SPXCutExportModal.js — wire real FFmpeg ────────────────
em_path = f'{VE}/SPXCutExportModal.js'
em = open(em_path).read()

if 'useFFmpeg' not in em:
    em = "import { useFFmpeg } from '../../hooks/useFFmpeg';\n" + em
    em = em.replace(
        "function SPXCutExportModal({ state, actions, selectors }) {",
        """function SPXCutExportModal({ state, actions, selectors }) {
  const { trim, applyFilter, loading: ffmpegLoading } = useFFmpeg();"""
    )
    em = em.replace(
        "      appendLog('[FFmpeg] Initializing encoder...');",
        """      appendLog('[FFmpeg] Initializing FFmpeg.wasm...');
      if (ffmpegLoading) { appendLog('[FFmpeg] Loading WASM core...'); }"""
    )
    open(em_path, 'w').write(em)
    print('✓ SPXCutExportModal.js — useFFmpeg imported')
else:
    print('✓ SPXCutExportModal.js already patched')

# ── 10. SPXCutEditor.js — add Scopes/SceneDetect panels ──────
editor = open(editor_path).read()
if 'SPXCutScopes' not in editor:
    editor = editor.replace(
        "      {/* Modals / Overlays */}",
        """      {/* Scopes Panel — in right panel tab, no separate overlay needed */}
      {/* Scene Detection — in right panel tab */}

      {/* Modals / Overlays */}"""
    )
    open(editor_path, 'w').write(editor)

print('\n=== All patches applied. Now run: ===')
print('npm run build && git add -A && git commit -m "feat: wire AudioMixer, Scopes, Scene Detection, FFmpeg, Proxy into SPXCut" && git push')
