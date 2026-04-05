/**
 * SPXCutQuickApply.js
 * Floating draggable window — quick effect apply buttons.
 * Drag via useClipDrag.startWindowDrag (refs only, no state).
 * Zero inline CSS.
 */
import React, { useRef, useCallback } from 'react';

const QUICK_GROUPS = [
  {
    label: '🎞️ Film Looks',
    btns: [
      { name: 'Cinematic Warm',   type: 'qa-orange' },
      { name: 'Bleach Bypass',    type: '' },
      { name: 'Teal & Orange',    type: '' },
      { name: 'Vintage Film',     type: '' },
      { name: 'Moody Noir',       type: '' },
      { name: 'Cross Process',    type: '' },
    ],
  },
  {
    label: '🌅 Color Grades',
    btns: [
      { name: 'Golden Hour',      type: 'qa-orange' },
      { name: 'Blue Hour',        type: '' },
      { name: 'Neon Nights',      type: '' },
      { name: 'Desert Heat',      type: 'qa-orange' },
      { name: 'Arctic Drift',     type: '' },
      { name: 'Soft Portrait',    type: '' },
    ],
  },
  {
    label: '🎬 Cinematic FX',
    btns: [
      { name: 'Vignette Soft',    type: '' },
      { name: 'Film Grain Fine',  type: '' },
      { name: 'Letterbox 2.35',   type: '' },
      { name: 'Soft Focus',       type: '' },
      { name: 'Chromatic Aberration', type: 'qa-orange' },
      { name: 'Halation Red',     type: 'qa-orange' },
    ],
  },
  {
    label: '⚡ Quick Fixes',
    btns: [
      { name: 'Brightness/Contrast', type: '' },
      { name: 'Hue/Saturation',      type: '' },
      { name: 'Clarity Boost',       type: '' },
      { name: 'Vignette Soft',       type: '' },
      { name: 'Reduce Noise',        type: '' },
      { name: 'Unsharp Mask',        type: '' },
    ],
  },
];

function SPXCutQuickApply({ state, actions, selectors, drag }) {
  const windowRef = useRef(null);

  const activeClip = selectors.getActiveClip();

  const applyEffect = useCallback((name) => {
    if (!activeClip) return;
    actions.addEffect(activeClip.id, {
      name,
      type:          'preset',
      icon:          '⚡',
      defaultParams: {},
    });
  }, [activeClip, actions]);

  const onHeaderMouseDown = useCallback((e) => {
    drag.startWindowDrag(e, windowRef);
  }, [drag]);

  return (
    <div
      className="spxcut-quick-apply"
      ref={windowRef}
      style={{ top: 80, right: 530 }}
    >
      <div
        className="spxcut-quick-apply-header"
        onMouseDown={onHeaderMouseDown}
      >
        <span className="spxcut-quick-apply-title">⚡ Quick Apply</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {activeClip ? (
            <span style={{ fontSize: 9, color: 'var(--teal)' }}>→ {activeClip.name.slice(0, 14)}</span>
          ) : (
            <span style={{ fontSize: 9, color: 'var(--text-dim)' }}>Select a clip</span>
          )}
          <button
            className="spxcut-icon-btn"
            onClick={() => actions.setQuickApply(false)}
            style={{ fontSize: 11 }}
          >✕</button>
        </div>
      </div>

      <div className="spxcut-quick-apply-body">
        {QUICK_GROUPS.map((group, gi) => (
          <div key={gi} style={{ width: '100%', marginBottom: 6 }}>
            <div style={{ fontSize: 9, color: 'var(--text-dim)', marginBottom: 4, fontWeight: 600 }}>
              {group.label}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
              {group.btns.map((btn, bi) => (
                <button
                  key={bi}
                  className={`spxcut-qa-btn${btn.type ? ` ${btn.type}` : ''}`}
                  onClick={() => applyEffect(btn.name)}
                  disabled={!activeClip}
                  title={activeClip ? `Apply "${btn.name}" to ${activeClip.name}` : 'Select a clip first'}
                >
                  {btn.name}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default SPXCutQuickApply;
