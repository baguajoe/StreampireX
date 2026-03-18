import React from "react";
import "../../styles/MotionStudio.css";

import MotionToolbar from "../component/motionstudio/MotionToolbar";
import MotionLayerPanel from "../component/motionstudio/MotionLayerPanel";
import MotionPresetBrowser from "../component/motionstudio/MotionPresetBrowser";
import MotionPropertyInspector from "../component/motionstudio/MotionPropertyInspector";
import MotionKeyframePanel from "../component/motionstudio/MotionKeyframePanel";
import MotionPathPanel from "../component/motionstudio/MotionPathPanel";
import MotionCameraPanel from "../component/motionstudio/MotionCameraPanel";
import MotionTemplatePanel from "../component/motionstudio/MotionTemplatePanel";
import MotionPreviewStage from "../component/motionstudio/MotionPreviewStage";
import MotionTimelinePanel from "../component/motionstudio/MotionTimelinePanel";
import MotionKeyframeEditorPanel from "../component/motionstudio/MotionKeyframeEditorPanel";
import MotionGraphEditorPanel from "../component/motionstudio/MotionGraphEditorPanel";
import useMotionStudioState from "../component/motionstudio/useMotionStudioState";

export default function MotionStudioPage() {
  const state = useMotionStudioState();

  return (
    <div className="motion-studio-page">
      <MotionToolbar
        addTextLayer={state.addTextLayer}
        addLowerThirdLayer={state.addLowerThirdLayer}
        isPlaying={state.isPlaying}
        setIsPlaying={state.setIsPlaying}
        currentTime={state.currentTime}
        setCurrentTime={state.setCurrentTime}
        duration={state.duration}
      />

      <div className="motion-studio-layout">
        <div className="motion-left">
          <MotionLayerPanel
            layers={state.layers}
            selectedLayerId={state.selectedLayerId}
            setSelectedLayerId={state.setSelectedLayerId}
            removeLayer={state.removeLayer}
          />

          <MotionPresetBrowser
            textPresets={state.textPresets}
            lowerThirdTemplates={state.lowerThirdTemplates}
            selectedTextPreset={state.selectedTextPreset}
            setSelectedTextPreset={state.setSelectedTextPreset}
            selectedLowerThirdTemplate={state.selectedLowerThirdTemplate}
            setSelectedLowerThirdTemplate={state.setSelectedLowerThirdTemplate}
            selectedLayer={state.selectedLayer}
            updateLayer={state.updateLayer}
          />

          <MotionTemplatePanel setLayers={state.setLayers} />
        </div>

        <div className="motion-center">
          <MotionPreviewStage
            layers={state.layers}
            currentTime={state.currentTime}
            isPlaying={state.isPlaying}
            setCurrentTime={state.setCurrentTime}
            duration={state.duration}
            pathAnimations={state.pathAnimations}
            selectedLayerId={state.selectedLayerId}
            setSelectedLayerId={state.setSelectedLayerId}
            updateLayer={state.updateLayer}
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
        </div>

        <div className="motion-right">
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

          <MotionCameraPanel
            cameraPresets={state.cameraPresets}
            cameraPreset={state.cameraPreset}
            setCameraPreset={state.setCameraPreset}
          />

          <MotionKeyframeEditorPanel
            selectedLayer={state.selectedLayer}
            currentTime={state.currentTime}
            updateLayer={state.updateLayer}
            selectedKeyframeRef={state.selectedKeyframeRef}
            setSelectedKeyframeRef={state.setSelectedKeyframeRef}
          />

          <MotionGraphEditorPanel
            selectedLayer={state.selectedLayer}
            currentTime={state.currentTime}
            updateLayer={state.updateLayer}
            selectedKeyframeRef={state.selectedKeyframeRef}
            setSelectedKeyframeRef={state.setSelectedKeyframeRef}
          />
        </div>
      </div>
    </div>
  );
}
