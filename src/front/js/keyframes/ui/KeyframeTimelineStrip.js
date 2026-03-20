import React from 'react';

const wrapStyle = {
  position: 'relative',
  width: '100%',
  height: 40,
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 8,
  background: 'linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))',
  overflow: 'hidden',
  marginTop: 10,
};

const railStyle = {
  position: 'absolute',
  left: 0,
  right: 0,
  top: '50%',
  height: 2,
  transform: 'translateY(-50%)',
  background: 'rgba(255,255,255,0.08)',
};

const playheadStyle = (leftPct) => ({
  position: 'absolute',
  top: 0,
  bottom: 0,
  left: `${leftPct}%`,
  width: 2,
  background: '#00ffc8',
  boxShadow: '0 0 8px rgba(0,255,200,0.45)',
});

const diamondStyle = (leftPct, selected = false) => ({
  position: 'absolute',
  left: `${leftPct}%`,
  top: '50%',
  width: 12,
  height: 12,
  transform: 'translate(-50%, -50%) rotate(45deg)',
  background: selected ? '#ffcc00' : '#ffffff',
  border: selected ? '2px solid #ff9500' : '1px solid rgba(0,0,0,0.4)',
  borderRadius: 2,
  cursor: 'pointer',
  boxShadow: selected
    ? '0 0 10px rgba(255,204,0,0.5)'
    : '0 1px 4px rgba(0,0,0,0.35)',
});

export default function KeyframeTimelineStrip({
  keyframes = [],
  duration = 1,
  currentTime = 0,
  selectedKeyframeId = null,
  onSeek,
  onRemove,
  onSelect,
  onAddAtTime,
}) {
  const safeDuration = Math.max(0.001, Number(duration) || 1);
  const playheadPct = Math.max(0, Math.min(100, (currentTime / safeDuration) * 100));

  const handleBackgroundClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = rect.width ? x / rect.width : 0;
    const t = Math.max(0, Math.min(safeDuration, pct * safeDuration));
    onAddAtTime?.(t);
  };

  return (
    <div style={wrapStyle} onDoubleClick={handleBackgroundClick} title="Double-click to add a keyframe at the clicked time">
      <div style={railStyle} />
      <div style={playheadStyle(playheadPct)} />

      {keyframes.map((kf) => {
        const leftPct = Math.max(0, Math.min(100, (kf.time / safeDuration) * 100));
        return (
          <button
            key={kf.id}
            type="button"
            style={diamondStyle(leftPct, selectedKeyframeId === kf.id)}
            title={`Time ${Number(kf.time).toFixed(2)}s | Value ${Number(kf.value).toFixed(2)}`}
            onClick={() => {
              onSelect?.(kf.id);
              onSeek?.(kf.time);
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              onRemove?.(kf.id);
            }}
          />
        );
      })}
    </div>
  );
}
