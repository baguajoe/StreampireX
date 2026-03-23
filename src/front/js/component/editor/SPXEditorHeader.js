import React from "react";

const SPXEditorHeader = ({ editor }) => {

  const projectName =
    editor?.projectName || "Untitled Project";

  return (
    <div className="spx-editor-header">

      <div className="spx-editor-header-left">

        <div className="spx-editor-brand">
          SPX Editor
        </div>

        <div className="spx-editor-project">
          {projectName}
        </div>

      </div>

      <div className="spx-editor-header-center">

        <button className="spx-header-btn">
          Play
        </button>

        <button className="spx-header-btn">
          Pause
        </button>

        <button className="spx-header-btn spx-header-btn-accent">
          Export
        </button>

      </div>

    </div>
  );

};

export default SPXEditorHeader;
