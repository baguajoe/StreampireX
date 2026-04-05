/**
 * SPXCutAudioMixer.js
 * Wraps VideoEditorAudioMixer with SPXCut state integration.
 * Floating panel docked to bottom of editor.
 */
import React, { useRef, useCallback } from 'react';
import VideoEditorAudioMixer from '../VideoEditorAudioMixer';

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
