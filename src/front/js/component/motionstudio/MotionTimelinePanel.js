import React, { useMemo, useRef, useState, useEffect } from "react";

const BASE_PX_PER_SEC = 90;
const MIN_DURATION = 0.5;
const KEYFRAME_PROPS = ["positionX", "positionY", "scale", "rotation", "opacity"];

export default function MotionTimelinePanel({
  layers,
  duration,
  currentTime,
  setCurrentTime,
  selectedLayerId,
  setSelectedLayerId,
  updateLayer,
  setDuration,
  selectedKeyframeRef,
  setSelectedKeyframeRef,
  loopRegion,
  setLoopRegion,
  timelineZoom,
  setTimelineZoom
}) {
  const scrollRef = useRef(null);
  const [dragState, setDragState] = useState(null);
  const PX_PER_SEC = BASE_PX_PER_SEC * (timelineZoom || 1);
  const totalWidth = Math.max(duration * PX_PER_SEC, 900);

  const sortedLayers = useMemo(() => {
    return [...layers].sort((a, b) => (a.startTime || 0) - (b.startTime || 0));
  }, [layers]);

  const beginClipDrag = (e, layer, type) => {
    e.stopPropagation();
    setSelectedLayerId(layer.id);
    setDragState({
      kind: "clip",
      type,
      layerId: layer.id,
      startX: e.clientX,
      startTime: layer.startTime || 0,
      startDuration: layer.duration || 1
    });
  };

  const beginKeyframeDrag = (e, layerId, prop, keyframeIndex, keyframeTime) => {
    e.stopPropagation();
    setSelectedLayerId(layerId);
    setSelectedKeyframeRef?.({
      layerId,
      prop,
      index: keyframeIndex
    });
    setDragState({
      kind: "keyframe",
      layerId,
      prop,
      keyframeIndex,
      startX: e.clientX,
      startTime: keyframeTime
    });
  };

  useEffect(() => {
    if (!dragState) return;

    const onMove = (e) => {
      const dx = e.clientX - dragState.startX;
      const deltaSeconds = dx / PX_PER_SEC;
      const layer = layers.find((l) => l.id === dragState.layerId);
      if (!layer) return;

      if (dragState.kind === "clip") {
        if (dragState.type === "move") {
          const nextStart = Math.max(0, dragState.startTime + deltaSeconds);
          updateLayer(layer.id, { startTime: nextStart });
          const end = nextStart + (layer.duration || 0);
          if (end > duration) setDuration(end + 1);
        }

        if (dragState.type === "resize-left") {
          const originalEnd = dragState.startTime + dragState.startDuration;
          const nextStart = Math.max(0, dragState.startTime + deltaSeconds);
          const safeStart = Math.min(nextStart, originalEnd - MIN_DURATION);
          const nextDuration = Math.max(MIN_DURATION, originalEnd - safeStart);

          updateLayer(layer.id, {
            startTime: safeStart,
            duration: nextDuration
          });
        }

        if (dragState.type === "resize-right") {
          const nextDuration = Math.max(MIN_DURATION, dragState.startDuration + deltaSeconds);
          updateLayer(layer.id, { duration: nextDuration });
          const end = (layer.startTime || 0) + nextDuration;
          if (end > duration) setDuration(end + 1);
        }
      }

      if (dragState.kind === "keyframe") {
        const nextTime = Math.max(0, dragState.startTime + deltaSeconds);
        const keyframes = { ...(layer.keyframes || {}) };
        const track = [...(keyframes[dragState.prop] || [])];

        if (!track[dragState.keyframeIndex]) return;

        const oldValue = track[dragState.keyframeIndex].value;

        track[dragState.keyframeIndex] = {
          ...track[dragState.keyframeIndex],
          time: nextTime
        };
        track.sort((a, b) => a.time - b.time);

        keyframes[dragState.prop] = track;
        updateLayer(layer.id, { keyframes });

        const newIndex = track.findIndex(
          (kf) => kf.time === nextTime && kf.value === oldValue
        );

        setSelectedKeyframeRef?.({
          layerId: layer.id,
          prop: dragState.prop,
          index: newIndex >= 0 ? newIndex : 0
        });

        if (nextTime > duration) setDuration(nextTime + 1);
      }
    };

    const onUp = () => setDragState(null);

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [dragState, layers, updateLayer, duration, setDuration, PX_PER_SEC, setSelectedKeyframeRef]);

  const onTimelineClick = (e) => {
    if (!scrollRef.current) return;
    const rect = scrollRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left + scrollRef.current.scrollLeft;
    const nextTime = Math.max(0, Math.min(duration, x / PX_PER_SEC));
    setCurrentTime(nextTime);
  };

  const addKeyframeAtPlayhead = (layer, prop) => {
    const existingTrack = [...((layer.keyframes || {})[prop] || [])];
    let value = 0;

    if (prop === "positionX") value = 0;
    if (prop === "positionY") value = 0;
    if (prop === "scale") value = layer.scale ?? 1;
    if (prop === "rotation") value = layer.rotation ?? 0;
    if (prop === "opacity") value = layer.opacity ?? 1;

    existingTrack.push({
      time: currentTime,
      value,
      easing: "linear",
      curveStrength: 0.5
    });
    existingTrack.sort((a, b) => a.time - b.time);

    updateLayer(layer.id, {
      keyframes: {
        ...(layer.keyframes || {}),
        [prop]: existingTrack
      }
    });

    const idx = existingTrack.findIndex(
      (kf) => kf.time === currentTime && kf.value === value
    );

    setSelectedKeyframeRef?.({
      layerId: layer.id,
      prop,
      index: idx >= 0 ? idx : 0
    });
  };

  return (
    <div className="motion-panel motion-timeline-panel">
      <div className="motion-panel-title">Timeline</div>

      <div className="motion-timeline-meta">
        <span>{layers.length} layers</span>
        <span>{duration.toFixed(1)}s total</span>
        <span>Playhead: {currentTime.toFixed(2)}s</span>
      </div>

      <div className="motion-mini-actions" style={{ marginBottom: 10 }}>
        <button onClick={() => setLoopRegion?.({ ...loopRegion, start: currentTime })}>
          Set Loop Start
        </button>
        <button onClick={() => setLoopRegion?.({ ...loopRegion, end: currentTime })}>
          Set Loop End
        </button>
        <button onClick={() => setLoopRegion?.({ ...loopRegion, enabled: !loopRegion?.enabled })}>
          {loopRegion?.enabled ? "Disable Loop" : "Enable Loop"}
        </button>
        <button onClick={() => setTimelineZoom?.(Math.max(0.5, (timelineZoom || 1) - 0.25))}>
          - Zoom
        </button>
        <button onClick={() => setTimelineZoom?.(Math.min(3, (timelineZoom || 1) + 0.25))}>
          + Zoom
        </button>
      </div>

      <div className="motion-dim" style={{ marginBottom: 8 }}>
        Zoom: {(timelineZoom || 1).toFixed(2)}x
        {loopRegion?.enabled
          ? ` • Loop ${loopRegion.start.toFixed(2)}s → ${loopRegion.end.toFixed(2)}s`
          : ""}
      </div>

      <div className="motion-timeline-scroll" ref={scrollRef} onMouseDown={onTimelineClick}>
        <div className="motion-timeline-inner" style={{ width: totalWidth }}>
          <div className="motion-timeline-ruler">
            {Array.from({ length: Math.ceil(duration) + 1 }).map((_, i) => (
              <div key={i} className="motion-ruler-tick" style={{ left: i * PX_PER_SEC }}>
                <span>{i}s</span>
              </div>
            ))}
          </div>

          {loopRegion?.enabled && (
            <div
              className="motion-loop-region"
              style={{
                left: Math.min(loopRegion.start, loopRegion.end) * PX_PER_SEC,
                width: Math.abs(loopRegion.end - loopRegion.start) * PX_PER_SEC
              }}
            />
          )}

          <div className="motion-playhead" style={{ left: currentTime * PX_PER_SEC }} />

          <div className="motion-timeline-tracks">
            {sortedLayers.map((layer) => {
              const left = (layer.startTime || 0) * PX_PER_SEC;
              const width = Math.max((layer.duration || 1) * PX_PER_SEC, 40);
              const active = selectedLayerId === layer.id;
              const keyframes = layer.keyframes || {};

              return (
                <div key={layer.id} className="motion-track-row motion-track-row-tall">
                  <div className="motion-track-label">
                    <strong>{layer.name}</strong>
                    <span>{layer.type}</span>
                  </div>

                  <div className="motion-track-lane motion-track-lane-tall">
                    <div
                      className={`motion-clip-bar ${active ? "active" : ""}`}
                      style={{ left, width }}
                      onMouseDown={(e) => beginClipDrag(e, layer, "move")}
                    >
                      <div
                        className="motion-clip-handle left"
                        onMouseDown={(e) => beginClipDrag(e, layer, "resize-left")}
                      />
                      <div className="motion-clip-content">
                        <span>{layer.text || layer.name}</span>
                        <small>
                          {(layer.startTime || 0).toFixed(1)}s → {((layer.startTime || 0) + (layer.duration || 0)).toFixed(1)}s
                        </small>
                      </div>
                      <div
                        className="motion-clip-handle right"
                        onMouseDown={(e) => beginClipDrag(e, layer, "resize-right")}
                      />
                    </div>

                    <div className="motion-keyframe-tools">
                      {KEYFRAME_PROPS.map((prop) => (
                        <button
                          key={prop}
                          className="motion-keyframe-add-btn"
                          onMouseDown={(e) => e.stopPropagation()}
                          onClick={() => addKeyframeAtPlayhead(layer, prop)}
                        >
                          + {prop}
                        </button>
                      ))}
                    </div>

                    <div className="motion-keyframe-lanes">
                      {KEYFRAME_PROPS.map((prop) => {
                        const track = keyframes[prop] || [];
                        return (
                          <div key={prop} className="motion-keyframe-lane">
                            <div className="motion-keyframe-prop">{prop}</div>
                            <div className="motion-keyframe-line">
                              {track.map((kf, index) => {
                                const isSelected =
                                  selectedKeyframeRef &&
                                  selectedKeyframeRef.layerId === layer.id &&
                                  selectedKeyframeRef.prop === prop &&
                                  selectedKeyframeRef.index === index;

                                return (
                                  <div
                                    key={`${prop}_${index}_${kf.time}`}
                                    className={`motion-keyframe-diamond ${isSelected ? "selected" : ""}`}
                                    style={{ left: kf.time * PX_PER_SEC }}
                                    title={`${prop}: ${kf.value} @ ${kf.time.toFixed(2)}s`}
                                    onMouseDown={(e) =>
                                      beginKeyframeDrag(e, layer.id, prop, index, kf.time)
                                    }
                                  />
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
