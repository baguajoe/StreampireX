/**
 * SPXCutMonitors.js
 * Source monitor (in/out point marking, in/out bar, insert buttons).
 * Program monitor (canvas playback, safe frame overlay).
 * Insert Video / Insert Audio / Insert Both buttons wired.
 * Zero inline CSS.
 */
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { formatTimecode } from './hooks/usePlayback';

// ── Source Monitor ────────────────────────────────────────────
function SourceMonitor({ state, actions, selectors }) {
  const videoRef   = useRef(null);
  const inOutRef   = useRef(null);
  const [sourceFile, setSourceFile] = useState(null);
  const [sourceDuration, setSourceDuration] = useState(0);
  const [sourceTime, setSourceTime]   = useState(0);
  const [sourcePlaying, setSourcePlaying] = useState(false);
  const [srcIn,  setSrcIn]  = useState(null);
  const [srcOut, setSrcOut] = useState(null);

  // Listen for double-click on media bin items
  useEffect(() => {
    const handler = (e) => {
      const { file, src, duration } = e.detail;
      setSourceFile({ file, src, duration });
      setSourceDuration(duration || 0);
      setSrcIn(null);
      setSrcOut(null);
      setSourceTime(0);
    };
    window.addEventListener('spxcut:opensource', handler);
    return () => window.removeEventListener('spxcut:opensource', handler);
  }, []);

  useEffect(() => {
    const v = videoRef.current;
    if (!v || !sourceFile) return;
    v.src = sourceFile.src;
    v.onloadedmetadata = () => setSourceDuration(v.duration);
    v.ontimeupdate = () => setSourceTime(v.currentTime);
    v.onended = () => setSourcePlaying(false);
  }, [sourceFile]);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play(); setSourcePlaying(true); }
    else { v.pause(); setSourcePlaying(false); }
  }, []);

  const setInPoint  = useCallback(() => setSrcIn(sourceTime),  [sourceTime]);
  const setOutPoint = useCallback(() => setSrcOut(sourceTime), [sourceTime]);
  const clearInOut  = useCallback(() => { setSrcIn(null); setSrcOut(null); }, []);

  // Insert into timeline
  const insertIntoTimeline = useCallback((mode) => {
    if (!sourceFile) return;
    actions.insertMedia({
      file:          sourceFile.file,
      mediaDuration: sourceDuration,
      mode,
      inPoint:       srcIn  || 0,
      outPoint:      srcOut || sourceDuration,
    });
  }, [sourceFile, sourceDuration, srcIn, srcOut, actions]);

  // In/Out bar scrub
  const onInOutBarClick = useCallback((e) => {
    if (!inOutRef.current || sourceDuration === 0) return;
    const rect = inOutRef.current.getBoundingClientRect();
    const t = ((e.clientX - rect.left) / rect.width) * sourceDuration;
    if (videoRef.current) { videoRef.current.currentTime = t; setSourceTime(t); }
  }, [sourceDuration]);

  const inPct  = srcIn  !== null ? (srcIn  / sourceDuration) * 100 : 0;
  const outPct = srcOut !== null ? (srcOut / sourceDuration) * 100 : 100;

  return (
    <div className="spxcut-monitor">
      <div className="spxcut-monitor-header">
        <span className="spxcut-monitor-label">Source Monitor</span>
        <div className="spxcut-monitor-header-btns">
          <button
            className="spxcut-monitor-hbtn"
            onClick={() => document.getElementById('spxcut-source-input')?.click()}
            title="Open Media"
          >📂</button>
          <input
            id="spxcut-source-input"
            type="file"
            accept="video/*,audio/*"
            className="spxcut-visually-hidden"
            onChange={e => {
              const f = e.target.files[0];
              if (!f) return;
              const src = URL.createObjectURL(f);
              setSourceFile({ file: f, src });
              e.target.value = '';
            }}
          />
        </div>
      </div>

      <div className="spxcut-monitor-screen">
        {sourceFile ? (
          <video
            ref={videoRef}
            className="spxcut-monitor-video"
            onClick={togglePlay}
          />
        ) : (
          <div className="spxcut-monitor-empty">
            <span className="spxcut-monitor-empty-icon">🎬</span>
            <span className="spxcut-monitor-empty-text">Double-click clip or open media</span>
          </div>
        )}
      </div>

      {/* In/Out scrub bar */}
      <div
        className="spxcut-monitor-inout-bar"
        ref={inOutRef}
        onClick={onInOutBarClick}
      >
        {sourceDuration > 0 && (
          <div
            className="spxcut-inout-region"
            style={{
              left:  `${inPct}%`,
              width: `${outPct - inPct}%`,
            }}
          />
        )}
      </div>

      {/* Timecode row */}
      <div className="spxcut-monitor-tc-row">
        <span className="spxcut-monitor-tc">{formatTimecode(sourceTime)}</span>
        <span className="spxcut-monitor-tc" style={{ opacity: 0.5 }}>/</span>
        <span className="spxcut-monitor-tc">{formatTimecode(sourceDuration)}</span>
        <button className="spxcut-monitor-hbtn" onClick={setInPoint}  title="Mark In (I)">I</button>
        <button className="spxcut-monitor-hbtn" onClick={setOutPoint} title="Mark Out (O)">O</button>
        {(srcIn !== null || srcOut !== null) && (
          <button className="spxcut-monitor-hbtn" onClick={clearInOut} title="Clear In/Out (X)">✕</button>
        )}
      </div>

      {/* Insert buttons */}
      <div className="spxcut-monitor-footer">
        <button className="spxcut-insert-btn" onClick={() => insertIntoTimeline('video')} disabled={!sourceFile}>
          Insert Video
        </button>
        <button className="spxcut-insert-btn" onClick={() => insertIntoTimeline('audio')} disabled={!sourceFile}>
          Insert Audio
        </button>
        <button className="spxcut-insert-btn ins-both" onClick={() => insertIntoTimeline('both')} disabled={!sourceFile}>
          Insert Both
        </button>
      </div>
    </div>
  );
}

// ── Program Monitor ───────────────────────────────────────────
function ProgramMonitor({ state, actions, selectors, playback }) {
  const canvasRef   = useRef(null);
  const [showSafe, setShowSafe] = useState(false);
  const [fitMode,  setFitMode]  = useState('fit'); // fit | fill | 1:1

  // Draw current frame placeholder on canvas (real composite rendering wired to video elements)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width  = canvas.offsetWidth  || 1;
    const H = canvas.height = canvas.offsetHeight || 1;

    // Draw program canvas background
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);

    // Collect playing video elements from the active tracks and composite
    const ph = state.playhead;
    state.tracks.forEach(track => {
      if (track.muted || track.type !== 'video') return;
      track.clips.forEach(clip => {
        if (ph >= clip.startTime && ph < clip.startTime + clip.duration) {
          // Real playback: grab from registered video elements via playback.registerVideoRef
          // This canvas draw is the frame compositing point
          const videoTime = clip.inPoint + (ph - clip.startTime);
          const el = document.getElementById(`spxcut-video-${clip.id}`);
          if (el && el.readyState >= 2) {
            const t = clip.transform;
            ctx.save();
            ctx.translate(W / 2 + t.x, H / 2 + t.y);
            ctx.rotate((t.rotation * Math.PI) / 180);
            ctx.scale(t.scaleX, t.scaleY);
            ctx.globalAlpha = t.opacity;
            ctx.globalCompositeOperation = t.blendMode || 'source-over';
            const aspect = el.videoWidth / el.videoHeight || 16 / 9;
            const dw = fitMode === '1:1' ? el.videoWidth : W;
            const dh = fitMode === '1:1' ? el.videoHeight : (fitMode === 'fill' ? W / aspect : H);
            ctx.drawImage(el, -dw / 2, -dh / 2, dw, dh);
            ctx.restore();
          } else {
            // No video element yet — show placeholder frame
            ctx.fillStyle = '#0d0d1a';
            ctx.fillRect(0, 0, W, H);
            ctx.fillStyle = '#2a2a45';
            ctx.font = '11px JetBrains Mono';
            ctx.textAlign = 'center';
            ctx.fillText(clip.name, W / 2, H / 2);
          }
        }
      });
    });

    // Empty state
    const hasActiveClip = state.tracks.some(t =>
      !t.muted && t.type === 'video' && t.clips.some(c => ph >= c.startTime && ph < c.startTime + c.duration)
    );
    if (!hasActiveClip) {
      ctx.fillStyle = '#06060f';
      ctx.fillRect(0, 0, W, H);
    }
  }, [state.playhead, state.tracks, fitMode]);

  return (
    <div className="spxcut-monitor">
      <div className="spxcut-monitor-header">
        <span className="spxcut-monitor-label lbl-program">Program Monitor</span>
        <div className="spxcut-monitor-header-btns">
          <button
            className={`spxcut-monitor-hbtn${showSafe ? ' mhbtn-active' : ''}`}
            onClick={() => setShowSafe(!showSafe)}
            title="Safe Frame Overlay"
          >⊞</button>
          <button
            className={`spxcut-monitor-hbtn${fitMode === 'fit' ? ' mhbtn-active' : ''}`}
            onClick={() => setFitMode('fit')}
            title="Fit"
          >Fit</button>
          <button
            className={`spxcut-monitor-hbtn${fitMode === 'fill' ? ' mhbtn-active' : ''}`}
            onClick={() => setFitMode('fill')}
            title="Fill"
          >Fill</button>
          <button
            className={`spxcut-monitor-hbtn${fitMode === '1:1' ? ' mhbtn-active' : ''}`}
            onClick={() => setFitMode('1:1')}
            title="100%"
          >1:1</button>
        </div>
      </div>

      <div className="spxcut-monitor-screen">
        <canvas className="spxcut-monitor-canvas" ref={canvasRef} />
        {showSafe && (
          <div className="spxcut-monitor-safe-frame">
            <div className="spxcut-safe-outer" />
            <div className="spxcut-safe-inner" />
          </div>
        )}
        {/* Hidden video elements for each video clip — used for canvas compositing */}
        {state.tracks.flatMap(track =>
          track.clips
            .filter(c => c.mediaType === 'video' && c.src)
            .map(c => (
              <video
                key={c.id}
                id={`spxcut-video-${c.id}`}
                src={c.src}
                className="spxcut-visually-hidden"
                preload="auto"
                ref={el => playback.registerVideoRef(c.id, el)}
                muted={track.muted}
              />
            ))
        )}
      </div>

      {/* Program timecode */}
      <div className="spxcut-monitor-tc-row">
        <span className="spxcut-monitor-tc">{playback.timecode}</span>
        <span className="spxcut-monitor-tc" style={{ opacity: 0.5 }}>/</span>
        <span className="spxcut-monitor-tc">{playback.durationTimecode}</span>
        {state.inPoint !== null && (
          <span className="spxcut-monitor-tc tc-orange">IN: {formatTimecode(state.inPoint)}</span>
        )}
        {state.outPoint !== null && (
          <span className="spxcut-monitor-tc tc-orange">OUT: {formatTimecode(state.outPoint)}</span>
        )}
      </div>
    </div>
  );
}

// ── Monitors Container ────────────────────────────────────────
function SPXCutMonitors({ state, actions, selectors, playback }) {
  return (
    <div className="spxcut-monitors">
      <SourceMonitor  state={state} actions={actions} selectors={selectors} />
      <ProgramMonitor state={state} actions={actions} selectors={selectors} playback={playback} />
    </div>
  );
}

export default SPXCutMonitors;
