import React, { useState } from "react";

const VideoEditorCollapsiblePanel = ({ title, defaultOpen = true, children }) => {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={`spx-collapsible-panel ${open ? "open" : "closed"}`}>
      <div className="spx-collapsible-header">
        <button
          type="button"
          className="spx-collapse-btn"
          onClick={() => setOpen(!open)}
        >
          <span>{open ? "▾" : "▸"}</span>
          <span>{title}</span>
        </button>
      </div>
      {open && <div className="spx-collapsible-body">{children}</div>}
    </div>
  );
};

export default VideoEditorCollapsiblePanel;
