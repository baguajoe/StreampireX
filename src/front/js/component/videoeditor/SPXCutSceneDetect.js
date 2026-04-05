/**
 * SPXCutSceneDetect.js
 * Auto-detects scene cuts using histogram analysis from VideoEditorAdvancedFeatures.
 * Shows detected scenes as clickable thumbnails that jump playhead.
 */
import React, { useState, useCallback, useRef } from 'react';
import { detectScenes } from '../VideoEditorAdvancedFeatures';
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
