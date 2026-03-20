import React, { useRef } from "react";
import "../../styles/MotionStudio.css";

import MotionToolbar from "../component/motionstudio/MotionToolbar";
import MotionLayerPanel from "../component/motionstudio/MotionLayerPanel";
import MotionPropertyInspector from "../component/motionstudio/MotionPropertyInspector";
import MotionKeyframePanel from "../component/motionstudio/MotionKeyframePanel";
import MotionPathPanel from "../component/motionstudio/MotionPathPanel";
import MotionKeyframeEditorPanel from "../component/motionstudio/MotionKeyframeEditorPanel";
import MotionTimelinePanel from "../component/motionstudio/MotionTimelinePanel";

import useMotionStudioState from "../component/motionstudio/useMotionStudioState";
import useMotionEngine from "../component/motionstudio/engine/useMotionEngine";
import useMotionPlayback from "../component/motionstudio/engine/useMotionPlayback";
import useMotionCamera from "../component/motionstudio/engine/useMotionCamera";
import useMotionExport from "../component/motionstudio/engine/useMotionExport";

import MotionPreviewStageV2 from "../component/motionstudio/MotionPreviewStageV2";
import MotionGraphEditorV2 from "../component/motionstudio/MotionGraphEditorV2";
import MotionCameraPanelV2 from "../component/motionstudio/MotionCameraPanelV2";
import MotionMaskEffectsPanel from "../component/motionstudio/MotionMaskEffectsPanel";
import MotionPresetManagerPanel from "../component/motionstudio/MotionPresetManagerPanel";
import MotionExportPanel from "../component/motionstudio/MotionExportPanel";
import MotionEngineDebugPanel from "../component/motionstudio/MotionEngineDebugPanel";

export default function MotionStudioPage() {
  const state = useMotionStudioState();
  const motionEngine = useMotionEngine();
  const motionCamera = useMotionCamera();
  const previewStageRef = useRef(null);

  const motionExport = useMotionExport({
    layers: motionEngine.layers,
    camera: motionCamera.camera,
    canvasRef: {
      get current() {
        return previewStageRef.current?.getCanvas?.() || null;
      }
    }
  });

  useMotionPlayback({
    isPlaying: motionEngine.isPlaying,
    currentTime: motionEngine.currentTime,
    setCurrentTime: motionEngine.setCurrentTime,
    duration: motionEngine.duration,
    loopRegion: motionEngine.loopRegion,
  });

  return (
    <div className="motion-studio-page">
      <MotionToolbar
        addTextLayer={motionEngine.addTextLayer}
        addLowerThirdLayer={motionEngine.addLowerThirdLayer}
        isPlaying={motionEngine.isPlaying}
        setIsPlaying={motionEngine.setIsPlaying}
        currentTime={motionEngine.currentTime}
        setCurrentTime={motionEngine.setCurrentTime}
        duration={motionEngine.duration}
      />

      <div className="motion-studio-layout" style={{ display: "grid", gridTemplateColumns: "280px 1fr 340px", gap: 16 }}>
        <div className="motion-left" style={{ display: "grid", gap: 16 }}>
          <MotionLayerPanel
            layers={state.layers}
            selectedLayerId={state.selectedLayerId}
            setSelectedLayerId={state.setSelectedLayerId}
            removeLayer={state.removeLayer}
          />

          <MotionPresetManagerPanel
            selectedLayer={motionEngine.selectedLayer}
            updateLayer={motionEngine.updateLayer}
            setLayers={motionEngine.setLayers}
          />
        </div>

        <div className="motion-center" style={{ display: "grid", gap: 16 }}>
          <MotionPreviewStageV2
            ref={previewStageRef}
            layers={motionEngine.evaluatedLayers}
            width={960}
            height={540}
            showTitleSafe={true}
            camera={motionCamera.camera}
          />

          <MotionTimelinePanel
            layers={state.layers}
            duration={state.duration}
            currentTime={state.currentTime}
            setCurrentTime={state.setCurrentTime}
            selectedLayerId={state.selectedLayerId}
            setSelectedLayerId={state.setSelectedLayerId}
            updateLayer={state.updateLayer}
            setDuration={state.setDuration}
            selectedKeyframeRef={state.selectedKeyframeRef}
            setSelectedKeyframeRef={state.setSelectedKeyframeRef}
            loopRegion={state.loopRegion}
            setLoopRegion={state.setLoopRegion}
            timelineZoom={state.timelineZoom}
            setTimelineZoom={state.setTimelineZoom}
          />

          <MotionGraphEditorV2
            selectedLayer={motionEngine.selectedLayer}
            updateLayer={motionEngine.updateLayer}
          />
        </div>

        <div className="motion-right" style={{ display: "grid", gap: 16 }}>
          <MotionPropertyInspector
            selectedLayer={state.selectedLayer}
            updateLayer={state.updateLayer}
          />

          <MotionKeyframePanel
            selectedLayer={state.selectedLayer}
            currentTime={state.currentTime}
            duration={state.duration}
            addKeyframeToSelected={state.addKeyframeToSelected}
            removeKeyframeFromSelected={state.removeKeyframeFromSelected}
          />

          <MotionPathPanel
            pathPresets={state.pathPresets}
            selectedPathPreset={state.selectedPathPreset}
            setSelectedPathPreset={state.setSelectedPathPreset}
            applyPathPresetToSelected={state.applyPathPresetToSelected}
            clearPathFromSelected={state.clearPathFromSelected}
            selectedLayer={state.selectedLayer}
          />

          <MotionKeyframeEditorPanel
            selectedLayer={state.selectedLayer}
            currentTime={state.currentTime}
            updateLayer={state.updateLayer}
            selectedKeyframeRef={state.selectedKeyframeRef}
            setSelectedKeyframeRef={state.setSelectedKeyframeRef}
          />

          <MotionCameraPanelV2
            camera={motionCamera.camera}
            updateCamera={motionCamera.updateCamera}
            resetCamera={motionCamera.resetCamera}
          />

          <MotionMaskEffectsPanel
            selectedLayer={motionEngine.selectedLayer}
            updateLayer={motionEngine.updateLayer}
          />

          <MotionExportPanel
            settings={motionExport.settings}
            setSettings={motionExport.setSettings}
            exportFrame={motionExport.exportFrame}
            exportProject={motionExport.exportProject}
          />

          <MotionEngineDebugPanel
            evaluatedLayers={motionEngine.evaluatedLayers}
            currentTime={motionEngine.currentTime}
          />
        </div>
      </div>
    </div>
  );
}
