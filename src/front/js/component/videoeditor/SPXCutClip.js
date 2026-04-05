/**
 * SPXCutClip.js
 * Single clip: resize handles, waveform/thumbnail, fx badges, linked indicator.
 * Drag handled via useClipDrag refs — zero stale closures.
 * Zero inline CSS.
 */
import React, { useRef, useEffect, useCallback, useMemo } from 'react';

function SPXCutClip({ clip, track, state, actions, selectors, drag, pps }) {
  const waveformCanvasRef = useRef(null);

  const isSelected = state.selectedClipIds.includes(clip.id);
  const isActive   = state.activeClipId === clip.id;

  const leftPx     = clip.startTime * pps;
  const widthPx    = Math.max(4, clip.duration * pps);

  // ── Clip class names ──────────────────────────────────────
  const clipClass = useMemo(() => {
    const parts = ['spxcut-clip'];
    parts.push(`clip-${clip.mediaType || 'video'}`);
    if (isSelected)    parts.push('clip-selected');
    if (clip.linkGroup) parts.push('clip-linked');
    return parts.join(' ');
  }, [clip.mediaType, isSelected, clip.linkGroup]);

  // ── Draw waveform for audio clips ─────────────────────────
  useEffect(() => {
    if (clip.mediaType !== 'audio') return;
    const canvas = waveformCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width  = canvas.offsetWidth  || 1;
    const H = canvas.height = canvas.offsetHeight || 1;
    ctx.clearRect(0, 0, W, H);

    if (clip.waveformData && clip.waveformData.length > 0) {
      // Real waveform data
      const data = clip.waveformData;
      const step = data.length / W;
      ctx.strokeStyle = '#00ffc8';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x < W; x++) {
        const idx = Math.floor(x * step);
        const amp = (data[idx] || 0) * (H / 2);
        ctx.moveTo(x, H / 2 - amp);
        ctx.lineTo(x, H / 2 + amp);
      }
      ctx.stroke();
    } else {
      // Synthetic waveform
      ctx.strokeStyle = 'rgba(0,255,200,0.6)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x < W; x++) {
        const noise = Math.sin(x * 0.3) * 0.4 + Math.sin(x * 0.7 + 1) * 0.3 + Math.sin(x * 1.3 + 2) * 0.2 + Math.sin(x * 2.1 + 3) * 0.1;
        const amp = (noise * 0.5 + 0.5) * (H * 0.35) + 2;
        ctx.moveTo(x, H / 2 - amp);
        ctx.lineTo(x, H / 2 + amp);
      }
      ctx.stroke();
    }
  }, [clip.mediaType, clip.waveformData, widthPx]);

  // ── Clip body click: select ───────────────────────────────
  const onClipClick = useCallback((e) => {
    e.stopPropagation();
    if (state.activeTool === 'blade') return; // Blade handled by track
    actions.selectClip(clip.id, e.shiftKey || e.metaKey || e.ctrlKey);
  }, [actions, clip.id, state.activeTool]);

  // ── Clip drag ─────────────────────────────────────────────
  const onClipMouseDown = useCallback((e) => {
    if (state.activeTool !== 'select' && state.activeTool !== 'slip' && state.activeTool !== 'slide') return;
    if (e.button !== 0) return;
    e.stopPropagation();
    drag.startClipMove(e, clip.id, null);
  }, [drag, clip.id, state.activeTool]);

  // ── Resize handles ────────────────────────────────────────
  const onLeftHandleMouseDown = useCallback((e) => {
    e.stopPropagation();
    e.preventDefault();
    drag.startClipResize(e, clip.id, 'left');
  }, [drag, clip.id]);

  const onRightHandleMouseDown = useCallback((e) => {
    e.stopPropagation();
    e.preventDefault();
    drag.startClipResize(e, clip.id, 'right');
  }, [drag, clip.id]);

  // ── Context menu ──────────────────────────────────────────
  const onContextMenu = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    // Dispatch custom event picked up by SPXCutContextMenu
    window.dispatchEvent(new CustomEvent('spxcut:contextmenu', {
      detail: { type: 'clip', clipId: clip.id, x: e.clientX, y: e.clientY }
    }));
  }, [clip.id]);

  // ── FX drop ───────────────────────────────────────────────
  const onFxDragOver = useCallback((e) => { e.preventDefault(); e.stopPropagation(); }, []);
  const onFxDrop = useCallback((e) => {
    e.stopPropagation();
    drag.handleClipFxDrop(e, clip.id);
  }, [drag, clip.id]);

  return (
    <div
      className={clipClass}
      style={{
        position: 'absolute',
        left:  leftPx,
        width: widthPx,
      }}
      onClick={onClipClick}
      onMouseDown={onClipMouseDown}
      onContextMenu={onContextMenu}
      onDragOver={onFxDragOver}
      onDrop={onFxDrop}
      title={`${clip.name} | ${clip.duration.toFixed(2)}s`}
    >
      {/* Left resize handle */}
      <div
        className="spxcut-clip-handle spxcut-clip-handle-left"
        onMouseDown={onLeftHandleMouseDown}
      />

      {/* Clip header */}
      <div className="spxcut-clip-header">
        <span className="spxcut-clip-name">{clip.name}</span>
        {clip.linkGroup && <span className="spxcut-clip-link-icon">🔗</span>}
      </div>

      {/* Clip body: waveform or thumbnails */}
      <div className="spxcut-clip-body">
        {clip.mediaType === 'audio' ? (
          <canvas className="spxcut-clip-waveform" ref={waveformCanvasRef} />
        ) : (
          <div className="spxcut-clip-thumbs">
            {/* Thumbnails generated from video via VideoThumbnailGenerator */}
            {clip.thumbnails && clip.thumbnails.map((src, i) => (
              <img key={i} className="spxcut-clip-thumb-frame" src={src} alt="" />
            ))}
          </div>
        )}

        {/* FX badges */}
        {clip.effects && clip.effects.filter(e => e.enabled).length > 0 && (
          <div className="spxcut-clip-fx-badges">
            {clip.effects.filter(e => e.enabled).slice(0, 3).map(fx => (
              <span key={fx.id} className="spxcut-clip-fx-badge" title={fx.name}>
                {fx.name.slice(0, 3).toUpperCase()}
              </span>
            ))}
            {clip.effects.filter(e => e.enabled).length > 3 && (
              <span className="spxcut-clip-fx-badge">+{clip.effects.filter(e => e.enabled).length - 3}</span>
            )}
          </div>
        )}
      </div>

      {/* Right resize handle */}
      <div
        className="spxcut-clip-handle spxcut-clip-handle-right"
        onMouseDown={onRightHandleMouseDown}
      />
    </div>
  );
}

export default React.memo(SPXCutClip);
