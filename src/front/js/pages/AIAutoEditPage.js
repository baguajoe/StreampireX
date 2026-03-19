import React from "react";
import "../../styles/NodeCompositor.css";
import AIAutoEditPanel from "../component/nodecompositor/AIAutoEditPanel";

export default function AIAutoEditPage() {
  return (
    <div className="nc-page">
      <div className="nc-topbar">
        <div>
          <div className="nc-title">AI Auto Edit</div>
          <div className="nc-subtitle">Generate suggested cuts and transitions</div>
        </div>
      </div>

      <div style={{ padding: 16, maxWidth: 720 }}>
        <AIAutoEditPanel />
      </div>
    </div>
  );
}
