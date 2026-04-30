// src/front/js/component/sampler/SpecBadge.js
import React from 'react';

const BASE_STYLE = {
  cursor: 'default',
  userSelect: 'none',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
};

const DOT_BASE = {
  display: 'inline-block',
  width: 6,
  height: 6,
  borderRadius: '50%',
  flexShrink: 0,
};

const TOOLTIP_DEFAULT  = 'Baked into sample at load. Reload sample to reprocess.';
const TOOLTIP_ACTIVE   = 'Chain enabled \u2014 baked at load. Reload sample to reprocess.';
const TOOLTIP_INACTIVE = 'Chain disabled. Toggle and reload sample to apply.';

export default function SpecBadge({ label, className = '', style, active }) {
  const isToggleable = typeof active === 'boolean';
  const isOn = isToggleable ? active : true;

  const dotStyle = isOn
    ? { ...DOT_BASE, background: 'currentColor', opacity: 0.85 }
    : { ...DOT_BASE, background: 'transparent', border: '1px solid currentColor', opacity: 0.5 };

  const tooltip = !isToggleable
    ? TOOLTIP_DEFAULT
    : isOn ? TOOLTIP_ACTIVE : TOOLTIP_INACTIVE;

  return (
    <span
      className={className}
      style={{ ...BASE_STYLE, ...style }}
      title={tooltip}
      role="status"
      aria-label={`${label} \u2014 ${isOn ? 'baked at load' : 'disabled'}`}
    >
      <span style={dotStyle} aria-hidden="true" />
      {label}
    </span>
  );
}
