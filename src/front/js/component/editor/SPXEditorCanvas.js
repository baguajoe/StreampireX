import React from "react";

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
    linkSelectedToLinkedGroup
  } = editor;

  const sourcePreview = currentSourceAsset?.objectUrl || null;
  const isVideo = currentSourceAsset?.type === "video";
  const isImage = currentSourceAsset?.type === "image";

  const sourceFooter = (
    <div className="spx-monitor-readout">
      <span>IN {formatPoint(sourceInPoint)}</span>
      <span>OUT {formatPoint(sourceOutPoint)}</span>
      <span>{currentSourceAsset?.name || "No source selected"}</span>
    </div>
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
          <video ref={sourceVideoRef} className="spx-monitor-media" src={sourcePreview} controls preload="metadata" />
        ) : sourcePreview && isImage ? (
          <img className="spx-monitor-media" src={sourcePreview} alt={currentSourceAsset?.name || "Source"} />
        ) : (
          <div className="spx-editor-canvas-placeholder">Source</div>
        )}
      </Monitor>

      <Monitor
        title="Program Monitor"
        footer={<div className="spx-monitor-readout"><span>{selectedClip?.name || "No clip selected"}</span></div>}
        controls={programControls}
      >
        {sourcePreview && isVideo ? (
          <video ref={programVideoRef} className="spx-monitor-media" src={sourcePreview} controls preload="metadata" />
        ) : sourcePreview && isImage ? (
          <img className="spx-monitor-media" src={sourcePreview} alt={selectedClip?.name || "Program"} />
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
