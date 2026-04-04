import React, { useRef, useEffect } from 'react';
import { Film, Play, Pause, Square, Rewind, FastForward, SkipBack, SkipForward, Save, Download, Palette, Volume2, Activity, Scissors, RotateCcw, RotateCw, Crown, Star, Zap } from 'lucide-react';

const T = {
  bg0:'#04040c', bg1:'#07070f', bg2:'#0c0c18', bg3:'#111120',
  border:'rgba(255,255,255,0.06)', border2:'rgba(255,255,255,0.1)',
  teal:'#00ffc8', tealDim:'rgba(0,255,200,0.1)',
  purple:'#a78bfa', purpleDim:'rgba(167,139,250,0.1)',
  text:'#f0f4f8', dim:'rgba(255,255,255,0.4)', dim2:'rgba(255,255,255,0.2)',
  font:"'JetBrains Mono', monospace",
};

const iBtn = (active, color = T.teal, disabled = false) => ({
  width:28, height:28, display:'flex', alignItems:'center', justifyContent:'center',
  background: active ? `rgba(0,255,200,0.12)` : 'transparent',
  border: `1px solid ${active ? color+'44' : 'transparent'}`,
  borderRadius:6, color: disabled ? T.dim2 : active ? color : T.dim,
  cursor: disabled ? 'not-allowed' : 'pointer', flexShrink:0,
  opacity: disabled ? 0.35 : 1, transition:'all .12s',
});

const tBtn = (active, color = T.teal) => ({
  display:'flex', alignItems:'center', gap:5,
  background: active ? (color === T.purple ? T.purpleDim : T.tealDim) : 'transparent',
  border: `1px solid ${active ? color+'44' : 'transparent'}`,
  borderRadius:6, color: active ? color : T.dim,
  padding:'4px 10px', fontSize:10, fontWeight:700,
  cursor:'pointer', whiteSpace:'nowrap', flexShrink:0,
  fontFamily:T.font, transition:'all .12s', letterSpacing:'0.5px',
});

const sep = { width:1, height:20, background:T.border, margin:'0 6px', flexShrink:0 };

const MENUS = (p) => ({
  file: { label:'File', items:[
    {label:'New Project',    shortcut:'Ctrl+N', action:p.onNew},
    {label:'Open Project',   shortcut:'Ctrl+O', action:p.onOpen},
    {type:'sep'},
    {label:'Save',           shortcut:'Ctrl+S', action:p.onSave},
    {label:'Save As…',       shortcut:'Ctrl+Shift+S', action:p.onSaveAs},
    {type:'sep'},
    {label:'Import Media',   shortcut:'Ctrl+I', action:p.onImport},
    {label:'Export Video',   shortcut:'Ctrl+E', action:p.onExport},
    {type:'sep'},
    {label:'Close', action:()=>window.history.back()},
  ]},
  edit: { label:'Edit', items:[
    {label:'Undo', shortcut:'Ctrl+Z',       action:p.onUndo, disabled:!p.canUndo},
    {label:'Redo', shortcut:'Ctrl+Shift+Z', action:p.onRedo, disabled:!p.canRedo},
    {type:'sep'},
    {label:'Cut',    shortcut:'Ctrl+X', action:p.onCut,    disabled:!p.hasSelection},
    {label:'Copy',   shortcut:'Ctrl+C', action:p.onCopy,   disabled:!p.hasSelection},
    {label:'Paste',  shortcut:'Ctrl+V', action:p.onPaste},
    {label:'Delete', shortcut:'Del',    action:p.onDelete, disabled:!p.hasSelection},
  ]},
  clip: { label:'Clip', items:[
    {label:'Split at Playhead', shortcut:'Ctrl+K', action:p.onSplit},
    {label:'Trim In Point',     shortcut:'Q',      action:p.onTrimIn,  disabled:!p.hasSelection},
    {label:'Trim Out Point',    shortcut:'W',      action:p.onTrimOut, disabled:!p.hasSelection},
    {type:'sep'},
    {label:'Speed / Duration…', action:p.onSpeed,   disabled:!p.hasSelection},
    {label:'Reverse Clip',      action:p.onReverse, disabled:!p.hasSelection},
    {type:'sep'},
    {label:'Delete Clip', shortcut:'Del', action:p.onDelete, disabled:!p.hasSelection},
  ]},
  sequence: { label:'Sequence', items:[
    {label:'Add Video Track', action:()=>p.onAddTrack('video')},
    {label:'Add Audio Track', action:()=>p.onAddTrack('audio')},
    {type:'sep'},
    {label:'Go to Start', shortcut:'Home', action:()=>p.onSeek(0)},
    {label:'Go to End',   shortcut:'End',  action:()=>p.onSeek(p.duration)},
  ]},
  markers: { label:'Markers', items:[
    {label:'Add Marker',         shortcut:'M',            action:p.onAddMarker},
    {label:'Next Marker',        shortcut:'Shift+M',      action:p.onNextMarker},
    {label:'Prev Marker',        shortcut:'Ctrl+Shift+M', action:p.onPrevMarker},
    {type:'sep'},
    {label:'Clear All Markers', action:p.onClearMarkers},
  ]},
  view: { label:'View', items:[
    {label:'Zoom In',       shortcut:'+',  action:()=>p.onZoom(Math.min(5,p.zoom+0.25))},
    {label:'Zoom Out',      shortcut:'-',  action:()=>p.onZoom(Math.max(0.1,p.zoom-0.25))},
    {label:'Fit to Window', shortcut:'\\', action:()=>p.onZoom(1)},
    {type:'sep'},
    {label:`${p.showWaveforms?'✓ ':''}Audio Waveforms`, action:p.onToggleWaveforms},
    {label:`${p.snapOn?'✓ ':''}Snap to Grid`,           action:p.onToggleSnap},
    {type:'sep'},
    {label:'Color Grading', action:p.onToggleColor},
    {label:'Audio Mixer',   action:p.onToggleMixer},
  ]},
  help: { label:'Help', items:[
    {label:'Keyboard Shortcuts', shortcut:'Ctrl+/', action:()=>{}},
    {type:'sep'},
    {label:'About SPX Cut', action:()=>{}},
  ]},
});

export default function VideoEditorToolbar({
  projectTitle, isPlaying, currentTime, duration, frameRate, setFrameRate,
  zoom, setZoom, canUndo, canRedo, hasSelection, snapOn, showWaveforms,
  showColor, showMixer, showScopes,
  play, pause, stop, playPause, seek, frameBack, frameFwd,
  undoTracks, redoTracks, saveProject, setShowExport, fileInputRef,
  splitClip, trimClipIn, trimClipOut, deleteClip, selectedClip,
  addTrack, addMarker, nextMarker, prevMarker, setMarkers,
  toggleSnapOn, setShowWaveforms, setShowColor, setShowMixer, setShowScopes,
  activeMenu, setActiveMenu, formatTime, userTier,
  onLoadProject, onSaveProject, onCopyClip, onPasteClip,
  onSpeedDialog, onReverseClip,
}) {
  const barRef = useRef(null);

  useEffect(() => {
    const h = e => { if (barRef.current && !barRef.current.contains(e.target)) setActiveMenu(null); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [setActiveMenu]);

  const mp = {
    onNew: () => { if(window.confirm('New project?')) window.location.reload(); },
    onOpen: () => { const i=document.createElement('input'); i.type='file'; i.accept='.json'; i.onchange=e=>{ if(e.target.files[0]){const r=new FileReader(); r.onload=ev=>{try{const p=JSON.parse(ev.target.result); onLoadProject?.(p);}catch(e){}}; r.readAsText(e.target.files[0]);} }; i.click(); },
    onSave: saveProject,
    onSaveAs: () => { const d=onSaveProject?.(); if(d){const b=new Blob([JSON.stringify(d,null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(b); a.download='project.spxproj'; a.click();} },
    onImport: () => fileInputRef.current?.click(),
    onExport: () => setShowExport(true),
    onUndo:undoTracks, onRedo:redoTracks, canUndo, canRedo,
    onCut:()=>selectedClip&&deleteClip(selectedClip.id),
    onCopy:onCopyClip, onPaste:onPasteClip,
    onDelete:()=>selectedClip&&deleteClip(selectedClip.id),
    hasSelection:!!selectedClip,
    onSplit:()=>selectedClip&&splitClip(selectedClip.id),
    onTrimIn:()=>selectedClip&&trimClipIn(selectedClip.id),
    onTrimOut:()=>selectedClip&&trimClipOut(selectedClip.id),
    onSpeed:onSpeedDialog, onReverse:onReverseClip,
    onAddTrack:addTrack, onSeek:seek, duration,
    onAddMarker:()=>addMarker(), onNextMarker:nextMarker, onPrevMarker:prevMarker,
    onClearMarkers:()=>{if(window.confirm('Clear all markers?'))setMarkers([]);},
    zoom, onZoom:setZoom,
    showWaveforms, onToggleWaveforms:()=>setShowWaveforms(v=>!v),
    snapOn, onToggleSnap:toggleSnapOn,
    onToggleColor:()=>setShowColor(v=>!v),
    onToggleMixer:()=>setShowMixer(v=>!v),
  };

  const menus = MENUS(mp);
  const tierIcon = userTier==='professional'?<Crown size={9}/>:userTier==='premium'?<Star size={9}/>:<Zap size={9}/>;

  return (
    <div style={{ display:'flex', flexDirection:'column', flexShrink:0, width:'100%' }}>

      {/* ── Menu bar ──────────────────────────────────── */}
      <div ref={barRef} style={{ display:'flex', flexDirection:'row', alignItems:'center', height:28, flexShrink:0, background:T.bg0, borderBottom:`1px solid ${T.border}`, padding:'0 8px', gap:0, zIndex:300, overflow:'hidden', width:'100%' }}>
        {/* Logo */}
        <div style={{ display:'flex', alignItems:'center', gap:5, padding:'0 12px 0 2px', marginRight:4, borderRight:`1px solid ${T.border}`, color:T.teal, fontWeight:800, fontSize:12, flexShrink:0, fontFamily:T.font }}>
          <Film size={12}/> SPX
        </div>

        {Object.entries(menus).map(([key, menu]) => (
          <div key={key} style={{ position:'relative', flexShrink:0 }}>
            <button
              style={{ background:activeMenu===key?T.bg3:'transparent', border:'none', color:activeMenu===key?T.text:T.dim, fontSize:11, padding:'4px 10px', borderRadius:4, cursor:'pointer', fontFamily:T.font, whiteSpace:'nowrap', transition:'all .1s' }}
              onClick={() => setActiveMenu(activeMenu===key?null:key)}
              onMouseEnter={() => activeMenu && setActiveMenu(key)}>
              {menu.label}
            </button>
            {activeMenu === key && (
              <div style={{ position:'absolute', top:'calc(100% + 2px)', left:0, zIndex:9999, background:'#0f0f1e', border:'1px solid rgba(255,255,255,0.12)', borderRadius:8, padding:4, minWidth:220, boxShadow:'0 16px 48px rgba(0,0,0,.95)' }}>
                {menu.items.map((item, i) =>
                  item.type==='sep'
                    ? <div key={i} style={{ height:1, background:'rgba(255,255,255,0.06)', margin:'3px 6px' }}/>
                    : <button key={i}
                        style={{ display:'flex', alignItems:'center', justifyContent:'space-between', width:'100%', padding:'6px 10px', background:'transparent', border:'none', color:item.disabled?T.dim2:T.text, fontSize:11, borderRadius:5, gap:20, textAlign:'left', cursor:item.disabled?'default':'pointer', fontFamily:T.font, opacity:item.disabled?.4:1 }}
                        onMouseEnter={ev=>{if(!item.disabled)ev.currentTarget.style.background='rgba(255,255,255,0.06)';}}
                        onMouseLeave={ev=>{ev.currentTarget.style.background='transparent';}}
                        onClick={()=>{if(!item.disabled){item.action?.();setActiveMenu(null);}}}>
                        <span>{item.label}</span>
                        {item.shortcut&&<span style={{color:T.dim2,fontSize:10,whiteSpace:'nowrap'}}>{item.shortcut}</span>}
                      </button>
                )}
              </div>
            )}
          </div>
        ))}

        <div style={{ flex:1 }}/>
        <div style={{ fontSize:11, color:T.dim2, paddingRight:8, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:300, fontFamily:T.font }}>{projectTitle}</div>
      </div>

      {/* ── Transport toolbar ──────────────────────────── */}
      <div style={{ display:'flex', flexDirection:'row', alignItems:'center', height:44, flexShrink:0, background:T.bg1, borderBottom:`1px solid ${T.border}`, padding:'0 12px', gap:3, overflow:'hidden', width:'100%' }}>

        {/* Tier badge */}
        <div style={{ display:'flex', alignItems:'center', gap:4, padding:'3px 8px', borderRadius:20, background:'rgba(255,165,0,0.1)', border:'1px solid rgba(255,165,0,0.2)', color:'#ffa500', fontSize:9, fontWeight:800, textTransform:'uppercase', letterSpacing:1, flexShrink:0, fontFamily:T.font }}>
          {tierIcon} {userTier}
        </div>

        <div style={sep}/>

        {/* Panel toggles */}
        <button style={tBtn(showColor, T.purple)} onClick={()=>setShowColor(v=>!v)}><Palette size={11}/> Color</button>
        <button style={tBtn(showMixer, T.purple)} onClick={()=>setShowMixer(v=>!v)}><Volume2 size={11}/> Mixer</button>
        <button style={tBtn(showScopes, T.purple)} onClick={()=>setShowScopes(v=>!v)}><Activity size={11}/> Scopes</button>

        <div style={sep}/>

        {/* Transport */}
        <button style={iBtn(false)} title="Stop" onClick={stop}><Square size={12}/></button>
        <button style={iBtn(false)} title="Rewind 5s" onClick={()=>seek(Math.max(0,currentTime-5))}><Rewind size={12}/></button>
        <button style={iBtn(false)} title="Frame back" onClick={frameBack}><SkipBack size={12}/></button>

        {/* Play btn */}
        <button onClick={playPause} title="Play/Pause (Space)" style={{ width:36, height:32, borderRadius:20, border:'none', display:'flex', alignItems:'center', justifyContent:'center', background:isPlaying?'linear-gradient(135deg,#f85149,#ff6b35)':'linear-gradient(135deg,#00ffc8,#00b894)', color:'#000', cursor:'pointer', flexShrink:0, boxShadow:isPlaying?'0 0 14px rgba(248,81,73,.4)':'0 0 14px rgba(0,255,200,.3)', transition:'all .15s' }}>
          {isPlaying?<Pause size={14}/>:<Play size={14}/>}
        </button>

        <button style={iBtn(false)} title="Frame forward" onClick={frameFwd}><SkipForward size={12}/></button>
        <button style={iBtn(false)} title="Forward 5s" onClick={()=>seek(Math.min(duration,currentTime+5))}><FastForward size={12}/></button>

        <div style={sep}/>

        {/* Timecode */}
        <div style={{ fontSize:13, fontWeight:700, color:T.teal, background:'rgba(0,255,200,0.06)', border:'1px solid rgba(0,255,200,0.18)', borderRadius:8, padding:'4px 14px', letterSpacing:2, minWidth:164, textAlign:'center', flexShrink:0, fontFamily:T.font, boxShadow:'0 0 8px rgba(0,255,200,0.1)' }}>
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>

        <div style={sep}/>

        {/* FPS */}
        <select value={frameRate} onChange={e=>setFrameRate(Number(e.target.value))} style={{ background:T.bg3, border:`1px solid ${T.border2}`, borderRadius:6, color:T.dim, fontSize:10, padding:'4px 8px', flexShrink:0, fontFamily:T.font, cursor:'pointer' }}>
          {[24,25,30,48,60].map(f=><option key={f} value={f}>{f} fps</option>)}
        </select>

        <div style={sep}/>

        {/* Edit tools */}
        <button style={iBtn(false,T.teal,!canUndo)} title="Undo (Ctrl+Z)" onClick={undoTracks} disabled={!canUndo}><RotateCcw size={12}/></button>
        <button style={iBtn(false,T.teal,!canRedo)} title="Redo" onClick={redoTracks} disabled={!canRedo}><RotateCw size={12}/></button>
        <button style={iBtn(false,T.teal,!selectedClip)} title="Split (Ctrl+K)" onClick={()=>selectedClip&&splitClip(selectedClip.id)} disabled={!selectedClip}><Scissors size={12}/></button>

        <div style={{ flex:1 }}/>

        {/* Save */}
        <button onClick={saveProject} style={{ display:'flex', alignItems:'center', gap:5, background:'rgba(0,255,200,0.08)', border:'1px solid rgba(0,255,200,0.2)', borderRadius:8, color:T.teal, padding:'5px 12px', fontSize:10, fontWeight:700, cursor:'pointer', flexShrink:0, fontFamily:T.font, letterSpacing:'0.5px' }}>
          <Save size={11}/> Save
        </button>

        {/* Export */}
        <button onClick={()=>setShowExport(true)} style={{ display:'flex', alignItems:'center', gap:5, background:'linear-gradient(135deg,#00ffc8,#00b894)', border:'none', borderRadius:8, color:'#000', padding:'5px 14px', fontSize:10, fontWeight:800, cursor:'pointer', flexShrink:0, marginLeft:4, fontFamily:T.font, letterSpacing:'0.5px', boxShadow:'0 0 12px rgba(0,255,200,0.25)' }}>
          <Download size={11}/> Export
        </button>
      </div>
    </div>
  );
}
