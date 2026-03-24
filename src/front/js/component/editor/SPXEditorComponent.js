import React from "react";
import SPXEditorHeader from "./SPXEditorHeader";
import SPXEditorSidebar from "./SPXEditorSidebar";
import SPXEditorCanvas from "./SPXEditorCanvas";
import SPXEditorInspector from "./SPXEditorInspector";
import SPXEditorTimeline from "./SPXEditorTimeline";
import SPXEditorToolbar from "./SPXEditorToolbar";
import SPXResizableWorkspace from "./SPXResizableWorkspace";
import { useSPXEditorState } from "../hooks/useSPXEditorState";
import "../../../styles/SPXEditor.css";

const SPXEditorComponent = () => {
  const editor = useSPXEditorState();

  return (
    <div className="spx-editor-shell">
      <SPXEditorHeader editor={editor} />

      <div className="spx-editor-shell-main">
        <SPXEditorToolbar
          activeTool={editor.activeTool}
          setActiveTool={editor.setActiveTool}
        />
        <SPXResizableWorkspace
          left={<SPXEditorSidebar editor={editor} />}
          center={<SPXEditorCanvas editor={editor} />}
          right={<SPXEditorInspector editor={editor} />}
          bottom={<SPXEditorTimeline editor={editor} />}
        />
      </div>
    </div>
  );
};

export default SPXEditorComponent;
