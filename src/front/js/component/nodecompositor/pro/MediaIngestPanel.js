import React from "react";
import { normalizeMediaNode } from "../../../utils/compositor/pro/mediaIngest";

export default function MediaIngestPanel({ onAddMediaNode = () => {} }) {
  const onFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    onAddMediaNode(normalizeMediaNode(file, url));
  };

  return (
    <div className="motion-panel">
      <div className="motion-panel-title">Media Ingest</div>
      <input type="file" accept="image/*,video/*" onChange={onFile} />
      <div style={{ fontSize: 12, opacity: 0.72, marginTop: 8 }}>
        Adds image/video media nodes for real preview routing.
      </div>
    </div>
  );
}
