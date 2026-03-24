import React from "react";
import SPXEditorHeader from "./SPXEditorHeader";
import SPXEditorTimeline from "./SPXEditorTimeline";
import { useSPXEditorState } from "../hooks/useSPXEditorState";
import SPXPanelLayout from "./SPXPanelLayout";
import "../../../styles/SPXEditor.css";

const SPXEditorComponent = () => {
  const editor = useSPXEditorState();

  return (
    <div className="spx-editor-shell">
      <SPXEditorHeader editor={editor} />

      <div className="spx-editor-workspace spx-editor-workspace-column">
        <div className="spx-editor-main spx-editor-main-full spx-editor-top-region">
          <SPXPanelLayout editor={editor} />
        </div>

        <div className="spx-editor-bottom-region">
          <SPXEditorTimeline editor={editor} />
        </div>
      </div>
    </div>
  );
};

export default SPXEditorComponent;
