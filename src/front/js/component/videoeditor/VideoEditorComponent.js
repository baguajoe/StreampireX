import React, { useState } from 'react';
import { useEditorState } from './useEditorState';
import VideoEditorToolbar    from './VideoEditorToolbar';
import VideoEditorTimeline   from './VideoEditorTimeline';
import VideoEditorMonitors   from './VideoEditorMonitors';
import VideoEditorLeftPanel  from './VideoEditorLeftPanel';
import VideoEditorRightPanel, {
  VideoEditorColorPanel,
  VideoEditorAudioMixer,
} from './VideoEditorRightPanel';
import VideoEditorExportModal from './VideoEditorExportModal';

export default function VideoEditorComponent() {
  const e = useEditorState();
  const [programMuted, setProgramMuted] = useState(false);
  const [userTier]                      = useState('professional');

  return (
    <div className="spx">

      {/* ── Menu bar + toolbar ─────────────────────────── */}
      <VideoEditorToolbar
        projectTitle={e.projectTitle}
        isPlaying={e.isPlaying}
        currentTime={e.currentTime}
        duration={e.duration}
        frameRate={e.frameRate}
        setFrameRate={e.setFrameRate}
        zoom={e.zoom}
        setZoom={e.setZoom}
        canUndo={e.canUndo}
        canRedo={e.canRedo}
        hasSelection={!!e.selectedClip}
        snapOn={e.snapOn}
        showWaveforms={e.showWaveforms}
        showColor={e.showColor}
        showMixer={e.showMixer}
        showScopes={e.showScopes}
        play={e.play}
        pause={e.pause}
        stop={e.stop}
        playPause={e.playPause}
        seek={e.seek}
        frameBack={e.frameBack}
        frameFwd={e.frameFwd}
        undoTracks={e.undoTracks}
        redoTracks={e.redoTracks}
        saveProject={e.saveProject}
        setShowExport={e.setShowExport}
        fileInputRef={e.fileInputRef}
        splitClip={e.splitClip}
        trimClipIn={e.trimClipIn}
        trimClipOut={e.trimClipOut}
        deleteClip={e.deleteClip}
        selectedClip={e.selectedClip}
        addTrack={e.addTrack}
        addMarker={e.addMarker}
        nextMarker={e.nextMarker}
        prevMarker={e.prevMarker}
        setMarkers={e.setMarkers}
        toggleSnapOn={() => e.setSnapOn(v => !v)}
        setShowWaveforms={e.setShowWaveforms}
        setShowColor={e.setShowColor}
        setShowMixer={e.setShowMixer}
        setShowScopes={e.setShowScopes}
        activeMenu={e.activeMenu}
        setActiveMenu={e.setActiveMenu}
        formatTime={e.formatTime}
        userTier={userTier}
        onLoadProject={e.loadProject}
        onSaveProject={e.saveProject}
        onCopyClip={e.copyClip}
        onPasteClip={e.pasteClip}
        onSpeedDialog={e.openSpeedDialog}
        onReverseClip={e.reverseClip}
      />

      {/* ── Main body ──────────────────────────────────── */}
      <div className="spx-body">

        {/* Left panel */}
        <VideoEditorLeftPanel
          selectedTool={e.selectedTool}
          setSelectedTool={e.setSelectedTool}
          mediaLibrary={e.mediaLibrary}
          uploading={e.uploading}
          importFiles={e.importFiles}
          fileInputRef={e.fileInputRef}
          sourceMedia={e.sourceMedia}
          setSourceMedia={e.setSourceMedia}
          setShowSourceMon={e.setShowSourceMon}
          selectedClip={e.selectedClip}
          applyEffectToClip={e.applyEffectToClip}
          draggedEffect={e.draggedEffect}
          setDraggedEffect={e.setDraggedEffect}
          draggedTransition={e.draggedTransition}
          setDraggedTransition={e.setDraggedTransition}
          selectedTransType={e.selectedTransType}
          setSelectedTransType={e.setSelectedTransType}
          addClipToTrack={e.addClipToTrack}
          tracks={e.tracks}
        />

        {/* Center */}
        <div className="spx-center">

          {/* Monitors */}
          <VideoEditorMonitors
            tracks={e.tracks}
            currentTime={e.currentTime}
            isPlaying={e.isPlaying}
            programMuted={programMuted}
            setProgramMuted={setProgramMuted}
            sourceMedia={e.sourceMedia}
            setSourceMedia={e.setSourceMedia}
            showSourceMon={e.showSourceMon}
            setShowSourceMon={e.setShowSourceMon}
            addClipToTrack={e.addClipToTrack}
            formatTime={e.formatTime}
          />

          {/* Timeline */}
          <VideoEditorTimeline
            tracks={e.tracks}
            currentTime={e.currentTime}
            duration={e.duration}
            zoom={e.zoom}
            snap={e.snap}
            snapOn={e.snapOn}
            snapSize={e.snapSize}
            selectedClip={e.selectedClip}
            setSelectedClip={e.setSelectedClip}
            selectedTransition={e.selectedTransition}
            setSelectedTransition={e.setSelectedTransition}
            selectedTransType={e.selectedTransType}
            draggedMedia={e.draggedMedia}
            setDraggedMedia={e.setDraggedMedia}
            draggedTransition={e.draggedTransition}
            draggedEffect={e.draggedEffect}
            showWaveforms={e.showWaveforms}
            showKeyframes={e.showKeyframes}
            markers={e.markers}
            addClipToTrack={e.addClipToTrack}
            updateClip={e.updateClip}
            deleteClip={e.deleteClip}
            splitClip={e.splitClip}
            addTransition={e.addTransition}
            removeTransition={e.removeTransition}
            toggleTrackMute={e.toggleTrackMute}
            toggleTrackVisible={e.toggleTrackVisible}
            toggleTrackLock={e.toggleTrackLock}
            addTrack={e.addTrack}
            setCurrentTime={e.seek}
            selectedTool={e.selectedTool}
            applyEffectToClip={e.applyEffectToClip}
            timelineRef={e.timelineRef}
            formatTime={e.formatTime}
          />
        </div>

        {/* Right panel */}
        <VideoEditorRightPanel
          selectedClip={e.selectedClip}
          selectedTransition={e.selectedTransition}
          applyEffectToClip={e.applyEffectToClip}
          removeEffectFromClip={e.removeEffectFromClip}
          toggleEffect={e.toggleEffect}
          updateEffectValue={e.updateEffectValue}
          updateCompositing={e.updateCompositing}
          setSelectedTransition={e.setSelectedTransition}
          tracks={e.tracks}
          setTracks={e.setTracks}
        />
      </div>

      {/* ── Floating panels ────────────────────────────── */}
      {e.showColor && (
        <VideoEditorColorPanel
          selectedClip={e.selectedClip}
          applyEffectToClip={e.applyEffectToClip}
          onClose={() => e.setShowColor(false)}
        />
      )}

      {e.showMixer && (
        <VideoEditorAudioMixer
          tracks={e.tracks}
          onClose={() => e.setShowMixer(false)}
        />
      )}

      {/* ── Export modal ───────────────────────────────── */}
      {e.showExport && (
        <VideoEditorExportModal
          tracks={e.tracks}
          project={{ title: e.projectTitle }}
          frameRate={e.frameRate}
          onClose={() => e.setShowExport(false)}
          onComplete={(result) => {
            console.log('Export complete:', result);
            e.setShowExport(false);
          }}
        />
      )}
    </div>
  );
}
