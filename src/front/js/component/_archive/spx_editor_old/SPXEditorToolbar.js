import React from "react";

const TOOLS = [
  ["select", "↖"],
  ["razor", "✂"],
  ["slip", "⇄"],
  ["pen", "✎"],
  ["shape", "▭"],
  ["hand", "✋"],
  ["text", "T"],
  ["crop", "⌗"],
  ["zoom", "⌕"],
  ["mask", "◫"]
];

const SPXEditorToolbar = ({ activeTool, setActiveTool }) => {
  return (
    <div className="spx-editor-toolbar">
      {TOOLS.map(([tool, icon]) => (
        <button
          key={tool}
          type="button"
          className={`spx-toolbar-btn ${activeTool === tool ? "is-active" : ""}`}
          onClick={() => setActiveTool(tool)}
          title={tool}
        >
          {icon}
        </button>
      ))}
    </div>
  );
};

export default SPXEditorToolbar;
