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

function SpeedDialogContent({ clip, onApply, onClose }) {
  const [speed, setSpeed] = React.useState(clip?.speed || 1);
  const duration = (clip?.duration || 0) / speed;
  return (
    <div style={{display:'flex',flexDirection:'column',gap:12}}>
      <div style={{display:'flex',alignItems:'center',gap:12}}>
        <span style={{fontSize:11,color:'#8b949e',minWidth:60}}>SPEED</span>
        <input type="range" min={0.1} max={4} step={0.05} value={speed}
          onChange={ev => setSpeed(Number(ev.target.value))}
          style={{flex:1,accentColor:'#00ffc8'}}/>
        <span style={{fontSize:12,fontFamily:'Share Tech Mono,monospace',color:'#00ffc8',minWidth:40}}>
          {speed.toFixed(2)}x
        </span>
      </div>
      <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
        {[0.25,0.5,0.75,1,1.5,2,4].map(s => (
          <button key={s} onClick={() => setSpeed(s)}
            style={{padding:'3px 8px',border:`1px solid ${speed===s?'#00ffc8':'#30363d'}`,
              borderRadius:3,cursor:'pointer',
              background:speed===s?'rgba(0,255,200,0.1)':'#0d1117',
              color:speed===s?'#00ffc8':'#8b949e',
              fontSize:10,fontFamily:'Share Tech Mono,monospace'}}>
            {s}x
          </button>
        ))}
      </div>
      <div style={{fontSize:11,color:'#8b949e'}}>
        New duration: <span style={{color:'#cdd9e5'}}>{duration.toFixed(2)}s</span>
      </div>
      <div style={{display:'flex',gap:8,justifyContent:'flex-end',marginTop:8}}>
        <button onClick={onClose}
          style={{padding:'6px 14px',border:'1px solid #30363d',borderRadius:4,
            cursor:'pointer',background:'transparent',color:'#8b949e',fontSize:11}}>
          Cancel
        </button>
        <button onClick={() => onApply(speed)}
          style={{padding:'6px 14px',border:'1px solid #00ffc8',borderRadius:4,
            cursor:'pointer',background:'rgba(0,255,200,0.1)',color:'#00ffc8',
            fontSize:11,fontWeight:700}}>
          Apply
        </button>
      </div>
    </div>
  );
}

export default function VideoEditorComponent() {
  const e = useEditorState();
  const [programMuted, setProgramMuted] = useState(false);
  const [leftWidth, setLeftWidth]   = useState(220);
  const [rightWidth, setRightWidth] = useState(290);
  const [rightOpen, setRightOpen]   = useState(true);
  const [monitorH, setMonitorH]     = useState(260);

  const startResize = (e, type) => {
    e.preventDefault();
    const startX = e.clientX, startY = e.clientY;
    const startLeft = leftWidth, startRight = rightWidth, startH = monitorH;
    const onMove = ev => {
      if (type === 'left')    setLeftWidth(Math.max(160, Math.min(400, startLeft + ev.clientX - startX)));
      if (type === 'right')   setRightWidth(Math.max(200, Math.min(500, startRight - (ev.clientX - startX))));
      if (type === 'monitor') setMonitorH(Math.max(150, Math.min(600, startH + ev.clientY - startY)));
    };
    const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };
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

      {/* ── Speed/Duration Dialog ── */}
      {e.showSpeedDialog && e.selectedClip && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center'}}
          onClick={e => e.target===e.currentTarget && e.setShowSpeedDialog(false)}>
          <div style={{background:'#1a1f2e',border:'1px solid #30363d',borderRadius:8,padding:24,minWidth:320,color:'#cdd9e5'}}>
            <div style={{fontSize:13,fontWeight:700,marginBottom:16,color:'#00ffc8',fontFamily:'Share Tech Mono,monospace'}}>
              SPEED / DURATION — {e.selectedClip.name}
            </div>
            <SpeedDialogContent
              clip={e.selectedClip}
              onApply={(speed) => {
                e.updateClip(e.selectedClip.id, {
                  speed: speed,
                  duration: e.selectedClip.duration / speed,
                });
                e.setShowSpeedDialog(false);
              }}
              onClose={() => e.setShowSpeedDialog(false)}
            />
          </div>
        </div>
      )}

      {/* ── Main body ──────────────────────────────────── */}
      <div className="spx-body">

        {/* Left panel */}
        <div className="spx-left" style={{width:leftWidth,minWidth:leftWidth,flexShrink:0}}>
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
        /></div>
        <div className="spx-resize-handle" onMouseDown={e=>startResize(e,"left")} />

        {/* Center */
        <div className="spx-center">

          {/* Monitors */}
          <div style={{height:monitorH,flexShrink:0,display:"flex",flexDirection:"column"}}>
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
          /></div>
          <div className="spx-resize-handle-v" onMouseDown={e=>startResize(e,"monitor")} />

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
          /></div>
          <div className="spx-resize-handle-v" onMouseDown={e=>startResize(e,"monitor")} />
        </div>

        <div className="spx-resize-handle" onMouseDown={e=>startResize(e,"right")} />
        {/* Right panel */}
        <div className="spx-right" style={{width:rightOpen?rightWidth:0,minWidth:rightOpen?200:0,overflow:"hidden",flexShrink:0,position:"relative"}}>
        <button className="spx-right-close" onClick={()=>setRightOpen(v=>!v)}>{rightOpen?"›":"‹"}</button>
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
        /></div>
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
