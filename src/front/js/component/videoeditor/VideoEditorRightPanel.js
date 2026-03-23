import React from "react";
import VideoEditorCollapsiblePanel from "./VideoEditorCollapsiblePanel";

const VideoEditorRightPanel = ({ activeInspectorTab }) => {
  return (
    <div className="editor-right-panel">
      {activeInspectorTab === "transform" && (
        <VideoEditorCollapsiblePanel title="Transform">
          <div className="panel-body">Position, scale, rotation, opacity, anchor point, crop, blend mode.</div>
        </VideoEditorCollapsiblePanel>
      )}

      {activeInspectorTab === "motion" && (
        <VideoEditorCollapsiblePanel title="Motion / Keyframes">
          <div className="panel-body">Keyframe editor, easing curves, motion presets, interpolation, path animation.</div>
        </VideoEditorCollapsiblePanel>
      )}

      {activeInspectorTab === "fx" && (
        <VideoEditorCollapsiblePanel title="Effects Stack">
          <div className="panel-body">Color effects, blur, sharpen, chroma key, effect preview, effect stack ordering.</div>
        </VideoEditorCollapsiblePanel>
      )}

      {activeInspectorTab === "captions" && (
        <VideoEditorCollapsiblePanel title="Captions / Transcript">
          <div className="panel-body">Transcribe audio, subtitle generation, lower thirds, text presets, caption styling.</div>
        </VideoEditorCollapsiblePanel>
      )}

      {activeInspectorTab === "audio" && (
        <VideoEditorCollapsiblePanel title="Audio Controls">
          <div className="panel-body">Volume, pan, mute/solo, ducking, meters, waveform-linked editing.</div>
        </VideoEditorCollapsiblePanel>
      )}

      {activeInspectorTab === "scopes" && (
        <VideoEditorCollapsiblePanel title="Scopes">
          <div className="panel-body">Waveform, vectorscope, histogram, RGB parade, luma and chroma monitoring.</div>
        </VideoEditorCollapsiblePanel>
      )}
    </div>
  );
};

export default VideoEditorRightPanel;
