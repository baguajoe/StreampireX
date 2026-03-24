import React from "react";

const MENUS = ["File", "Edit", "View", "Clip", "Sequence", "Marker", "Window", "Help"];

const SPXEditorHeader = ({ editor }) => {
  return (
    <div className="spx-editor-header-shell">
      <div className="spx-editor-menubar">
        <div className="spx-editor-menubar-left">
          {MENUS.map((item) => (
            <button key={item} className="spx-menu-item">
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="spx-editor-header">
        <div className="spx-editor-header-left">
          <div className="spx-editor-brand">SPX Editor</div>
          <div className="spx-editor-project">{editor.projectName}</div>
        </div>

        <div className="spx-editor-header-right">
          <button className="spx-header-btn" onClick={editor.togglePlay}>Play</button>
          <button className="spx-header-btn" onClick={editor.togglePlay}>Pause</button>
          <button className="spx-header-btn spx-export-btn">Export</button>
        </div>
      </div>
    </div>
  );
};

export default SPXEditorHeader;
