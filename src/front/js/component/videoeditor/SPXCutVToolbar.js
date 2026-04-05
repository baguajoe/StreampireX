/**
 * SPXCutVToolbar.js
 * 8 tool buttons: select, blade, slip, slide, ripple, roll, zoom, hand.
 * Each changes cursor and clip interaction behavior.
 * Zero inline CSS.
 */
import React from 'react';

const TOOLS = [
  { id: 'select',  icon: '↖',  label: 'Select (V)',       shortcut: 'V' },
  { id: 'blade',   icon: '✂',  label: 'Blade / Razor (B)', shortcut: 'B' },
  { sep: true },
  { id: 'slip',    icon: '↔',  label: 'Slip Tool',        shortcut: 'Y' },
  { id: 'slide',   icon: '⇔',  label: 'Slide Tool',       shortcut: 'U' },
  { id: 'ripple',  icon: '⟷',  label: 'Ripple Edit',      shortcut: 'B' },
  { id: 'roll',    icon: '⟺',  label: 'Roll Edit',        shortcut: 'N' },
  { sep: true },
  { id: 'zoom',    icon: '🔍', label: 'Zoom (Z)',          shortcut: 'Z' },
  { id: 'hand',    icon: '✋', label: 'Hand / Pan (H)',    shortcut: 'H' },
];

function SPXCutVToolbar({ activeTool, setTool }) {
  return (
    <div className="spxcut-vtoolbar">
      {TOOLS.map((tool, i) => {
        if (tool.sep) return <div key={`sep-${i}`} className="spxcut-vtool-sep" />;
        const isActive  = activeTool === tool.id;
        const isBlade   = tool.id === 'blade';
        return (
          <button
            key={tool.id}
            className={`spxcut-vtool-btn${isActive ? ` vtool-active${isBlade ? ' vtool-blade' : ''}` : ''}`}
            onClick={() => setTool(tool.id)}
            title={tool.label}
          >
            <span>{tool.icon}</span>
            <span className="spxcut-vtool-tooltip">
              {tool.label}
              {tool.shortcut && (
                <span style={{ marginLeft: 6, opacity: 0.6, fontSize: 9 }}>
                  [{tool.shortcut}]
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default SPXCutVToolbar;
