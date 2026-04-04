import React, { useState, useRef, useCallback } from 'react';
import { useEditorState } from './useEditorState';
import VideoEditorToolbar    from './VideoEditorToolbar';
import VideoEditorTimeline   from './VideoEditorTimeline';
import VideoEditorMonitors   from './VideoEditorMonitors';
import VideoEditorLeftPanel  from './VideoEditorLeftPanel';
import VideoEditorRightPanel, { VideoEditorColorPanel, VideoEditorAudioMixer } from './VideoEditorRightPanel';
import VideoEditorExportModal from './VideoEditorExportModal';

// ── Design tokens ─────────────────────────────────────────
export const T = {
  bg0: '#04040c', bg1: '#07070f', bg2: '#0c0c18', bg3: '#111120', bg4: '#161630',
  border: 'rgba(255,255,255,0.06)', border2: 'rgba(255,255,255,0.1)',
  teal: '#00ffc8', tealDim: 'rgba(0,255,200,0.1)',
  orange: '#ff6b35', purple: '#a78bfa',
  text: '#f0f4f8', dim: 'rgba(255,255,255,0.4)', dim2: 'rgba(255,255,255,0.2)',
  red: '#f85149', font: "'JetBrains Mono', monospace",
};

// ── Speed dialog ──────────────────────────────────────────
function SpeedDialog({ clip, onApply, onClose }) {
  const [speed, setSpeed] = React.useState(clip?.speed || 1);
  const dur = (clip?.duration || 0) / speed;
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.8)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', backdropFilter:'blur(12px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background:T.bg3, border:`1px solid ${T.border2}`, borderRadius:12, padding:28, minWidth:340, color:T.text, fontFamily:T.font }}>
        <div style={{ fontSize:13, fontWeight:700, marginBottom:18, color:T.teal }}>SPEED / DURATION — {clip?.title}</div>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:12 }}>
          <span style={{ fontSize:11, color:T.dim, minWidth:60 }}>SPEED</span>
          <input type="range" min={0.1} max={4} step={0.05} value={speed} onChange={e => setSpeed(Number(e.target.value))}
            style={{ flex:1, accentColor:T.teal }} />
          <span style={{ fontSize:13, fontWeight:700, color:T.teal, minWidth:50 }}>{speed.toFixed(2)}x</span>
        </div>
        <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:16 }}>
          {[0.25,0.5,0.75,1,1.5,2,4].map(s => (
            <button key={s} onClick={() => setSpeed(s)} style={{ padding:'3px 10px', border:`1px solid ${speed===s?T.teal:T.border2}`, borderRadius:5, cursor:'pointer', background:speed===s?T.tealDim:'transparent', color:speed===s?T.teal:T.dim, fontSize:10, fontFamily:T.font }}>{s}x</button>
          ))}
        </div>
        <div style={{ fontSize:11, color:T.dim, marginBottom:18 }}>New duration: <span style={{ color:T.text }}>{dur.toFixed(2)}s</span></div>
        <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
          <button onClick={onClose} style={{ padding:'7px 16px', border:`1px solid ${T.border2}`, borderRadius:6, cursor:'pointer', background:'transparent', color:T.dim, fontSize:11, fontFamily:T.font }}>Cancel</button>
          <button onClick={() => onApply(speed)} style={{ padding:'7px 16px', border:`1px solid ${T.teal}`, borderRadius:6, cursor:'pointer', background:T.tealDim, color:T.teal, fontSize:11, fontWeight:700, fontFamily:T.font }}>Apply</button>
        </div>
      </div>
    </div>
  );
}

export default function VideoEditorComponent() {
  const e = useEditorState();
  const [programMuted, setProgramMuted] = useState(false);
  const [userTier] = useState('professional');
  const [leftW, setLeftW]   = useState(220);
  const [rightW, setRightW] = useState(290);
  const [monH, setMonH]     = useState(260);
  const [rightOpen, setRightOpen] = useState(true);

  // ── Resize logic ──────────────────────────────────────
  const startResize = useCallback((evt, type) => {
    evt.preventDefault();
    const sx = evt.clientX, sy = evt.clientY;
    const sl = leftW, sr = rightW, sm = monH;
    const onMove = mv => {
      if (type === 'left')    setLeftW(Math.max(160, Math.min(400, sl + mv.clientX - sx)));
      if (type === 'right')   setRightW(Math.max(200, Math.min(480, sr - (mv.clientX - sx))));
      if (type === 'monitor') setMonH(Math.max(150, Math.min(500, sm + mv.clientY - sy)));
    };
    const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [leftW, rightW, monH]);

  const resizeH = (type) => ({
    width: 4, flexShrink: 0, background: 'transparent', cursor: 'col-resize', position: 'relative', zIndex: 5,
    onMouseDown: ev => startResize(ev, type),
    onMouseEnter: ev => { ev.currentTarget.style.background = 'rgba(0,255,200,0.4)'; },
    onMouseLeave: ev => { ev.currentTarget.style.background = 'transparent'; },
  });
  const resizeV = () => ({
    height: 4, width: '100%', flexShrink: 0, background: 'transparent', cursor: 'row-resize',
    onMouseDown: ev => startResize(ev, 'monitor'),
    onMouseEnter: ev => { ev.currentTarget.style.background = 'rgba(0,255,200,0.4)'; },
    onMouseLeave: ev => { ev.currentTarget.style.background = 'transparent'; },
  });

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100vh', width:'100%', background:T.bg0, color:T.text, fontFamily:T.font, fontSize:12, overflow:'hidden', userSelect:'none' }}>

      {/* ── Toolbar ──────────────────────────────────── */}
      <VideoEditorToolbar
        projectTitle={e.projectTitle} isPlaying={e.isPlaying}
        currentTime={e.currentTime} duration={e.duration}
        frameRate={e.frameRate} setFrameRate={e.setFrameRate}
        zoom={e.zoom} setZoom={e.setZoom}
        canUndo={e.canUndo} canRedo={e.canRedo}
        hasSelection={!!e.selectedClip} snapOn={e.snapOn}
        showWaveforms={e.showWaveforms} showColor={e.showColor}
        showMixer={e.showMixer} showScopes={e.showScopes}
        play={e.play} pause={e.pause} stop={e.stop}
        playPause={e.playPause} seek={e.seek}
        frameBack={e.frameBack} frameFwd={e.frameFwd}
        undoTracks={e.undoTracks} redoTracks={e.redoTracks}
        saveProject={e.saveProject} setShowExport={e.setShowExport}
        fileInputRef={e.fileInputRef}
        splitClip={e.splitClip} trimClipIn={e.trimClipIn}
        trimClipOut={e.trimClipOut} deleteClip={e.deleteClip}
        selectedClip={e.selectedClip} addTrack={e.addTrack}
        addMarker={e.addMarker} nextMarker={e.nextMarker}
        prevMarker={e.prevMarker} setMarkers={e.setMarkers}
        toggleSnapOn={() => e.setSnapOn(v => !v)}
        setShowWaveforms={e.setShowWaveforms}
        setShowColor={e.setShowColor} setShowMixer={e.setShowMixer}
        setShowScopes={e.setShowScopes}
        activeMenu={e.activeMenu} setActiveMenu={e.setActiveMenu}
        formatTime={e.formatTime} userTier={userTier}
        onLoadProject={e.loadProject} onSaveProject={e.saveProject}
        onCopyClip={e.copyClip} onPasteClip={e.pasteClip}
        onSpeedDialog={e.openSpeedDialog} onReverseClip={e.reverseClip}
      />

      {/* ── Speed dialog ─────────────────────────────── */}
      {e.showSpeedDialog && e.selectedClip && (
        <SpeedDialog
          clip={e.selectedClip}
          onApply={(speed) => { e.updateClip(e.selectedClip.id, { speed, duration: e.selectedClip.duration / speed }); e.setShowSpeedDialog(false); }}
          onClose={() => e.setShowSpeedDialog(false)}
        />
      )}

      {/* ── 3-column body ────────────────────────────── */}
      <div style={{ display:'flex', flexDirection:'row', flex:1, overflow:'hidden', minHeight:0 }}>

        {/* Left panel */}
        <div style={{ width:leftW, minWidth:leftW, flexShrink:0, display:'flex', flexDirection:'column', background:T.bg1, borderRight:`1px solid ${T.border}`, overflow:'hidden' }}>
          <VideoEditorLeftPanel
            selectedTool={e.selectedTool} setSelectedTool={e.setSelectedTool}
            mediaLibrary={e.mediaLibrary} uploading={e.uploading}
            importFiles={e.importFiles} fileInputRef={e.fileInputRef}
            sourceMedia={e.sourceMedia} setSourceMedia={e.setSourceMedia}
            setShowSourceMon={e.setShowSourceMon}
            selectedClip={e.selectedClip}
            applyEffectToClip={e.applyEffectToClip}
            draggedEffect={e.draggedEffect} setDraggedEffect={e.setDraggedEffect}
            draggedTransition={e.draggedTransition} setDraggedTransition={e.setDraggedTransition}
            selectedTransType={e.selectedTransType} setSelectedTransType={e.setSelectedTransType}
            addClipToTrack={e.addClipToTrack} tracks={e.tracks}
          />
        </div>

        {/* Left resize */}
        <div {...resizeH('left')} />

        {/* Center */}
        <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', minWidth:0 }}>

          {/* Monitors */}
          <div style={{ height:monH, flexShrink:0, display:'flex', flexDirection:'column', overflow:'hidden' }}>
            <VideoEditorMonitors
              tracks={e.tracks} currentTime={e.currentTime}
              isPlaying={e.isPlaying} programMuted={programMuted}
              setProgramMuted={setProgramMuted}
              sourceMedia={e.sourceMedia} setSourceMedia={e.setSourceMedia}
              showSourceMon={e.showSourceMon} setShowSourceMon={e.setShowSourceMon}
              addClipToTrack={e.addClipToTrack} formatTime={e.formatTime}
            />
          </div>

          {/* Monitor resize */}
          <div {...resizeV()} />

          {/* Timeline */}
          <VideoEditorTimeline
            tracks={e.tracks} currentTime={e.currentTime}
            duration={e.duration} zoom={e.zoom}
            snap={e.snap} snapOn={e.snapOn} snapSize={e.snapSize}
            selectedClip={e.selectedClip} setSelectedClip={e.setSelectedClip}
            selectedTransition={e.selectedTransition} setSelectedTransition={e.setSelectedTransition}
            selectedTransType={e.selectedTransType}
            draggedMedia={e.draggedMedia} setDraggedMedia={e.setDraggedMedia}
            draggedTransition={e.draggedTransition} draggedEffect={e.draggedEffect}
            showWaveforms={e.showWaveforms} showKeyframes={e.showKeyframes}
            markers={e.markers}
            addClipToTrack={e.addClipToTrack} updateClip={e.updateClip}
            deleteClip={e.deleteClip} splitClip={e.splitClip}
            addTransition={e.addTransition} removeTransition={e.removeTransition}
            toggleTrackMute={e.toggleTrackMute} toggleTrackVisible={e.toggleTrackVisible}
            toggleTrackLock={e.toggleTrackLock} addTrack={e.addTrack}
            setCurrentTime={e.seek} selectedTool={e.selectedTool}
            applyEffectToClip={e.applyEffectToClip}
            timelineRef={e.timelineRef} formatTime={e.formatTime}
            setZoom={e.setZoom} toggleSnapOn={() => e.setSnapOn(v=>!v)}
            setShowWaveforms={e.setShowWaveforms}
          />
        </div>

        {/* Right resize */}
        <div {...resizeH('right')} />

        {/* Right panel */}
        <div style={{ width:rightOpen?rightW:0, flexShrink:0, display:'flex', flexDirection:'column', background:T.bg1, borderLeft:`1px solid ${T.border}`, overflow:'hidden', position:'relative', transition:'width 0.15s' }}>
          {/* Toggle tab */}
          <div onClick={() => setRightOpen(v=>!v)} style={{ position:'absolute', left:-14, top:'50%', transform:'translateY(-50%)', width:14, height:48, background:T.bg2, border:`1px solid ${T.border}`, borderRight:'none', borderRadius:'6px 0 0 6px', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:T.dim, fontSize:11, zIndex:20 }}>
            {rightOpen ? '›' : '‹'}
          </div>
          {rightOpen && (
            <VideoEditorRightPanel
              selectedClip={e.selectedClip} selectedTransition={e.selectedTransition}
              applyEffectToClip={e.applyEffectToClip} removeEffectFromClip={e.removeEffectFromClip}
              toggleEffect={e.toggleEffect} updateEffectValue={e.updateEffectValue}
              updateCompositing={e.updateCompositing} setSelectedTransition={e.setSelectedTransition}
              tracks={e.tracks} setTracks={e.setTracks}
            />
          )}
        </div>
      </div>

      {/* ── Floating panels ─────────────────────────── */}
      {e.showColor && <VideoEditorColorPanel selectedClip={e.selectedClip} applyEffectToClip={e.applyEffectToClip} onClose={() => e.setShowColor(false)} />}
      {e.showMixer && <VideoEditorAudioMixer tracks={e.tracks} onClose={() => e.setShowMixer(false)} />}
      {e.showExport && (
        <VideoEditorExportModal tracks={e.tracks} project={{ title: e.projectTitle }}
          frameRate={e.frameRate} onClose={() => e.setShowExport(false)}
          onComplete={() => e.setShowExport(false)} />
      )}
    </div>
  );
}
