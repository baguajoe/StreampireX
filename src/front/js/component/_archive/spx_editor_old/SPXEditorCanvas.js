import React, { useEffect } from "react";

const Monitor = ({ title, children, footer, controls }) => {
  return (
    <div className="spx-monitor-panel">
      <div className="spx-editor-panel-header">
        <span>{title}</span>
        <div className="spx-monitor-header-actions">
          <button className="spx-monitor-dot" type="button" />
          <button className="spx-monitor-dot" type="button" />
          <button className="spx-monitor-dot" type="button" />
        </div>
      </div>

      <div className="spx-monitor-stage">
        <div className="spx-monitor-frame">
          {children}
        </div>
      </div>

      {footer ? <div className="spx-monitor-footer">{footer}</div> : null}
      <div className="spx-monitor-controls">{controls}</div>
    </div>
  );
};

const formatPoint = (value) => (value == null ? "--:--" : `${value.toFixed(2)}s`);
const formatClock = (value) => `${Math.max(0, value || 0).toFixed(2)}s`;

const MonitorRuler = ({ currentTime, duration, setPlayhead }) => {
  const pct = duration > 0 ? Math.max(0, Math.min(100, (currentTime / duration) * 100)) : 0;

  return (
    <div
      className="spx-monitor-ruler"
      onMouseDown={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const nextPct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        setPlayhead(nextPct * duration);
      }}
    >
      <div className="spx-monitor-ruler-time spx-left">{formatClock(currentTime)}</div>
      <div className="spx-monitor-ruler-track">
        <div className="spx-monitor-ruler-cti" style={{ left: `${pct}%` }} />
      </div>
      <div className="spx-monitor-ruler-time spx-right">{formatClock(duration)}</div>
    </div>
  );
};

const SPXEditorCanvas = ({ editor }) => {
  const {
    canvasRef,
    sourceVideoRef,
    programVideoRef,
    currentSourceAsset,
    selectedClip,
    sourceInPoint,
    sourceOutPoint,
    markSourceIn,
    markSourceOut,
    clearSourceIO,
    handlePlayPause,
    handlePause,
    handleRewind,
    handleFastForward,
    insertSourceToTimeline,
    unlinkSelectedClip,
    linkSelectedToLinkedGroup,
    currentTime,
    setPlayhead
  } = editor;

  const sourcePreview = currentSourceAsset?.objectUrl || null;
  const isVideo = currentSourceAsset?.type === "video";
  const isImage = currentSourceAsset?.type === "image";
  const previewDuration = currentSourceAsset?.duration || 10;

  const selectedTransform = selectedClip?.transform || {};
  const selectedColor = selectedClip?.colorAdjustments || {};
  const previewStyle = {
    transform: `translate(${selectedTransform.x || 0}px, ${selectedTransform.y || 0}px) scale(${(selectedTransform.scale || 100) / 100}) rotate(${selectedTransform.rotation || 0}deg)`,
    opacity: Math.max(0, Math.min(1, (selectedTransform.opacity ?? 100) / 100)),
    filter: [
      `brightness(${1 + ((selectedColor.exposure || 0) * 0.08)})`,
      `contrast(${1 + ((selectedColor.contrast || 0) / 100)})`,
      `saturate(${(selectedColor.saturation || 100) / 100})`,
      `sepia(${Math.max(0, (selectedColor.temperature || 0) / 200)})`
    ].join(" ")
  };

  useEffect(() => {
    const source = sourceVideoRef.current;
    const program = programVideoRef.current;
    if (!source && !program) return;

    const handleTime = (e) => {
      const t = e?.target?.currentTime || 0;
      setPlayhead(t);

      if (source && e.target === program && Math.abs(source.currentTime - t) > 0.05) {
        source.currentTime = t;
      }
      if (program && e.target === source && Math.abs(program.currentTime - t) > 0.05) {
        program.currentTime = t;
      }
    };

    source?.addEventListener("timeupdate", handleTime);
    program?.addEventListener("timeupdate", handleTime);

    return () => {
      source?.removeEventListener("timeupdate", handleTime);
      program?.removeEventListener("timeupdate", handleTime);
    };
  }, [setPlayhead, sourceVideoRef, programVideoRef]);

  const sourceFooter = (
    <>
      <div className="spx-monitor-readout">
        <span>IN {formatPoint(sourceInPoint)}</span>
        <span>OUT {formatPoint(sourceOutPoint)}</span>
        <span>{currentSourceAsset?.name || "No source selected"}</span>
      </div>
      <MonitorRuler currentTime={currentTime} duration={previewDuration} setPlayhead={setPlayhead} />
    </>
  );

  const sourceControls = (
    <>
      <button className="spx-header-btn" type="button" onClick={handleRewind}>⏮</button>
      <button className="spx-header-btn" type="button" onClick={handlePlayPause}>▶</button>
      <button className="spx-header-btn" type="button" onClick={handlePause}>⏸</button>
      <button className="spx-header-btn" type="button" onClick={() => {
        const t = sourceVideoRef.current?.currentTime || 0;
        markSourceIn(t);
      }}>I</button>
      <button className="spx-header-btn" type="button" onClick={() => {
        const t = sourceVideoRef.current?.currentTime || 0;
        markSourceOut(t);
      }}>O</button>
      <button className="spx-header-btn" type="button" onClick={clearSourceIO}>Clear</button>
      <button className="spx-header-btn" type="button" onClick={() => insertSourceToTimeline("video")}>Video</button>
      <button className="spx-header-btn" type="button" onClick={() => insertSourceToTimeline("audio")}>Audio</button>
      <button className="spx-header-btn" type="button" onClick={() => insertSourceToTimeline("both")}>Both</button>
      <button className="spx-header-btn" type="button" onClick={handleFastForward}>⏭</button>
    </>
  );

  const programControls = (
    <>
      <button className="spx-header-btn" type="button" onClick={handleRewind}>⏮</button>
      <button className="spx-header-btn" type="button" onClick={handlePlayPause}>▶</button>
      <button className="spx-header-btn" type="button" onClick={handlePause}>⏸</button>
      <button className="spx-header-btn" type="button" onClick={handleFastForward}>⏭</button>
      <button className="spx-header-btn" type="button" onClick={unlinkSelectedClip}>Unlink</button>
      <button className="spx-header-btn" type="button" onClick={linkSelectedToLinkedGroup}>Link</button>
    </>
  );

  return (
    <div className="spx-editor-canvas-wrap">
      <Monitor title="Source Monitor" footer={sourceFooter} controls={sourceControls}>
        {sourcePreview && isVideo ? (
          <>
            <video
              ref={sourceVideoRef}
              className="spx-monitor-media"
              src={sourcePreview}
              preload="metadata"
              style={previewStyle}
            />
            <div className="spx-source-monitor-badge">Source Loaded</div>
          </>
        ) : sourcePreview && isImage ? (
          <img
            className="spx-monitor-media"
            src={sourcePreview}
            alt={currentSourceAsset?.name || "Source"}
            style={previewStyle}
          />
        ) : (
          <div className="spx-editor-canvas-placeholder">Source</div>
        )}
      </Monitor>

      <Monitor
        title="Program Monitor"
        footer={
          <>
            <div className="spx-monitor-readout">
              <span>{selectedClip?.name || "No clip selected"}</span>
            </div>
            <MonitorRuler currentTime={currentTime} duration={previewDuration} setPlayhead={setPlayhead} />
          </>
        }
        controls={programControls}
      >
        {sourcePreview && isVideo ? (
          <video
            ref={programVideoRef}
            className="spx-monitor-media"
            src={sourcePreview}
            preload="metadata"
            style={previewStyle}
          />
        ) : sourcePreview && isImage ? (
          <img
            className="spx-monitor-media"
            src={sourcePreview}
            alt={selectedClip?.name || "Program"}
            style={previewStyle}
          />
        ) : (
          <>
            <canvas ref={canvasRef} className="spx-editor-canvas" />
            <div className="spx-editor-canvas-placeholder">Program</div>
          </>
        )}
      </Monitor>
    </div>
  );
};

export default SPXEditorCanvas;
