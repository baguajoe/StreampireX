import React, { useRef, useCallback } from 'react';
import { Plus, Video, AudioWaveform, Lock, Unlock, Volume2, VolumeX, Eye, EyeOff, Sparkles } from 'lucide-react';

const T = {
  bg0:'#04040c', bg1:'#07070f', bg2:'#0c0c18', bg3:'#111120',
  border:'rgba(255,255,255,0.06)', border2:'rgba(255,255,255,0.1)',
  teal:'#00ffc8', tealDim:'rgba(0,255,200,0.08)',
  purple:'#a78bfa', text:'#f0f4f8',
  dim:'rgba(255,255,255,0.4)', dim2:'rgba(255,255,255,0.15)',
  font:"'JetBrains Mono', monospace",
};

const buildFilter = (effects) => {
  if (!effects?.length) return '';
  const parts = [];
  for (const e of effects) {
    if (!e.enabled) continue;
    const v = e.value||50;
    switch(e.id) {
      case 'brightness': parts.push(`brightness(${0.5+v/100})`); break;
      case 'contrast':   parts.push(`contrast(${0.5+v/100})`); break;
      case 'saturation': parts.push(`saturate(${v/50})`); break;
      case 'hue':        parts.push(`hue-rotate(${v/100*360}deg)`); break;
      case 'blur':       parts.push(`blur(${v/10}px)`); break;
      case 'grayscale':  parts.push(`grayscale(${v}%)`); break;
      case 'sepia':      parts.push(`sepia(${v}%)`); break;
      case 'low_light_restore': parts.push(`brightness(${1+v/140}) contrast(${1+v/300})`); break;
      case 'shadow_recovery':   parts.push(`brightness(${1+v/180})`); break;
      case 'detail_boost':      parts.push(`contrast(${1+v/250})`); break;
      default: break;
    }
  }
  return parts.join(' ');
};

export default function VideoEditorTimeline({
  tracks, currentTime, duration, zoom, snap, snapOn, snapSize,
  selectedClip, setSelectedClip, selectedTransition, setSelectedTransition,
  selectedTransType, draggedMedia, setDraggedMedia, draggedTransition,
  draggedEffect, showWaveforms, showKeyframes, markers,
  addClipToTrack, updateClip, deleteClip, splitClip,
  addTransition, removeTransition, toggleTrackMute, toggleTrackVisible,
  toggleTrackLock, addTrack, setCurrentTime, selectedTool,
  applyEffectToClip, timelineRef, formatTime,
  setZoom, toggleSnapOn, setShowWaveforms,
}) {
  const draggingClip = useRef(null);
  const dragOffset   = useRef(0);
  const PX = 2 * zoom;

  const handleRulerClick = useCallback((e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setCurrentTime(Math.max(0, Math.min(duration, (e.clientX - rect.left) / PX)));
  }, [PX, duration, setCurrentTime]);

  const handleLaneClick = useCallback((e) => {
    if (selectedTool !== 'select') return;
    if (e.target.dataset.lane) {
      const rect = e.currentTarget.getBoundingClientRect();
      setCurrentTime(Math.max(0, Math.min(duration, (e.clientX - rect.left) / PX)));
    }
  }, [selectedTool, PX, duration, setCurrentTime]);

  const handleClipMouseDown = useCallback((e, clip, trackId) => {
    const track = tracks.find(t => t.id === trackId);
    if (track?.locked) return;
    if (selectedTool === 'razor') { e.stopPropagation(); splitClip(clip.id); return; }
    e.preventDefault(); e.stopPropagation();
    setSelectedClip(clip); setSelectedTransition(null);
    const rect = timelineRef.current.getBoundingClientRect();
    dragOffset.current = (e.clientX - rect.left) - clip.startTime * PX;
    draggingClip.current = { ...clip, trackId };
    const onMove = (mv) => {
      if (!draggingClip.current || !timelineRef.current) return;
      const r = timelineRef.current.getBoundingClientRect();
      const rawTime = (mv.clientX - r.left - dragOffset.current) / PX;
      const newStart = snap(rawTime);
      const tr = tracks.find(t => t.id === draggingClip.current.trackId);
      const others = tr ? tr.clips.filter(c => c.id !== clip.id) : [];
      let safe = newStart;
      for (const o of others) {
        if (safe < o.startTime + o.duration && safe + clip.duration > o.startTime) {
          safe = safe < o.startTime ? o.startTime - clip.duration : o.startTime + o.duration;
        }
      }
      updateClip(clip.id, { startTime: Math.max(0, safe) });
    };
    const onUp = () => { draggingClip.current = null; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [tracks, selectedTool, PX, snap, splitClip, setSelectedClip, setSelectedTransition, updateClip, timelineRef]);

  const handleDrop = useCallback((e, trackId) => {
    e.preventDefault(); e.stopPropagation();
    e.currentTarget.style.background = 'transparent';
    const track = tracks.find(t => t.id === trackId);
    if (!track || track.locked) return;
    let data = null;
    try { const raw = e.dataTransfer.getData('application/json'); if (raw) data = JSON.parse(raw); } catch {}
    if (!data) { try { const raw = e.dataTransfer.getData('text/plain'); if (raw) data = JSON.parse(raw); } catch {} }
    if (data?.type === 'effect') {
      const rect = timelineRef.current?.getBoundingClientRect();
      const dropX = rect ? e.clientX - rect.left : 0;
      const clipUnder = track.clips.find(c => { const cs = c.startTime*PX; return dropX >= cs && dropX <= cs + c.duration*PX; });
      if (clipUnder) applyEffectToClip(clipUnder.id, data.id, 50);
      return;
    }
    if (data?.type === 'transition') {
      const rect = timelineRef.current?.getBoundingClientRect();
      const dropTime = rect ? (e.clientX - rect.left) / PX : 0;
      const sorted = [...track.clips].sort((a,b) => a.startTime - b.startTime);
      for (let i = 0; i < sorted.length-1; i++) {
        const gap = sorted[i+1].startTime - (sorted[i].startTime + sorted[i].duration);
        if (Math.abs(dropTime - (sorted[i].startTime + sorted[i].duration)) < 2 && gap < 1) {
          addTransition(trackId, sorted[i], sorted[i+1], data.id); break;
        }
      }
      return;
    }
    const media = (data?.name || data?.url) ? data : draggedMedia;
    if (!media) return;
    const rect = timelineRef.current?.getBoundingClientRect();
    const dropTime = snap(rect ? (e.clientX - rect.left) / PX : 0);
    let dur = 30;
    if (media.duration) { const p = media.duration.split(':'); dur = p.length===2 ? parseInt(p[0])*60+parseInt(p[1]) : 30; }
    if (media.type === 'image') dur = 5;
    const newClip = { id:Date.now(), title:media.name, type:media.type, startTime:dropTime, duration:dur, mediaUrl:media.url, r2_key:media.r2_key, cloudId:media.cloudId, thumbnail:media.thumbnail, effects:[], compositing:{opacity:100,blendMode:'normal',position:{x:0,y:0},scale:{x:100,y:100},rotation:0} };
    addClipToTrack(trackId, newClip);
    setSelectedClip(newClip);
    setDraggedMedia(null);
  }, [tracks, draggedMedia, PX, snap, addClipToTrack, addTransition, applyEffectToClip, setSelectedClip, setDraggedMedia, timelineRef]);

  const getAdjacentPairs = (track) => {
    const sorted = [...track.clips].sort((a,b) => a.startTime - b.startTime);
    const pairs = [];
    for (let i = 0; i < sorted.length-1; i++) {
      if (sorted[i+1].startTime - (sorted[i].startTime + sorted[i].duration) < 1) pairs.push({ c1:sorted[i], c2:sorted[i+1] });
    }
    return pairs;
  };

  const totalWidth = Math.max(duration * PX, 800);
  const sortedTracks = [...tracks].sort((a,b) => b.zIndex - a.zIndex);

  const buildRuler = () => {
    const marks = [];
    const interval = zoom<0.3?60:zoom<0.6?30:zoom<1.2?10:zoom<2.5?5:1;
    for (let t = 0; t <= duration; t += interval) {
      marks.push(
        <div key={t} style={{ position:'absolute', top:0, left:t*PX, display:'flex', flexDirection:'column', alignItems:'flex-start' }}>
          <div style={{ width:1, height:8, background:'rgba(255,255,255,0.12)' }}/>
          <div style={{ fontSize:9, color:T.dim2, marginTop:2, marginLeft:2, whiteSpace:'nowrap', fontFamily:T.font }}>{formatTime(t)}</div>
        </div>
      );
    }
    return marks;
  };

  const trackIconColor = (type) => type==='video'?'rgba(0,255,200,0.8)':'rgba(255,107,53,0.8)';

  const tOptBtn = (active, label, onClick) => (
    <button onClick={onClick} style={{ display:'flex', alignItems:'center', gap:3, background:active?'rgba(0,255,200,0.08)':'transparent', border:`1px solid ${active?'rgba(0,255,200,0.25)':'transparent'}`, borderRadius:4, color:active?T.teal:T.dim, fontSize:10, padding:'3px 8px', cursor:'pointer', whiteSpace:'nowrap', flexShrink:0, fontFamily:T.font, transition:'all .12s' }}>
      {label}
    </button>
  );

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', minHeight:0 }}>

      {/* Controls bar */}
      <div style={{ display:'flex', alignItems:'center', gap:6, padding:'4px 12px', flexShrink:0, background:T.bg1, borderBottom:`1px solid ${T.border}`, flexWrap:'nowrap', overflow:'hidden' }}>
        <button onClick={()=>setZoom&&setZoom(z=>Math.max(0.1,z-0.25))} style={{ width:22, height:22, background:'rgba(255,255,255,0.04)', border:`1px solid ${T.border}`, borderRadius:4, color:T.dim, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0 }}>−</button>
        <span style={{ fontSize:10, color:T.dim2, minWidth:36, flexShrink:0, fontFamily:T.font }}>{Math.round(zoom*100)}%</span>
        <button onClick={()=>setZoom&&setZoom(z=>Math.min(5,z+0.25))} style={{ width:22, height:22, background:'rgba(255,255,255,0.04)', border:`1px solid ${T.border}`, borderRadius:4, color:T.dim, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0 }}>+</button>
        <div style={{ width:1, height:18, background:T.border, margin:'0 4px', flexShrink:0 }}/>
        {tOptBtn(snapOn, `Snap ${snapOn?'ON':'OFF'}`, toggleSnapOn)}
        {tOptBtn(showWaveforms, 'Waveforms', ()=>setShowWaveforms&&setShowWaveforms(v=>!v))}
        <div style={{ width:1, height:18, background:T.border, margin:'0 4px', flexShrink:0 }}/>
        <button onClick={()=>addTrack('video')} style={{ display:'flex', alignItems:'center', gap:3, background:'transparent', border:`1px solid ${T.border}`, borderRadius:4, color:T.dim, fontSize:10, padding:'3px 8px', cursor:'pointer', flexShrink:0, fontFamily:T.font }}>+ Video</button>
        <button onClick={()=>addTrack('audio')} style={{ display:'flex', alignItems:'center', gap:3, background:'transparent', border:`1px solid ${T.border}`, borderRadius:4, color:T.dim, fontSize:10, padding:'3px 8px', cursor:'pointer', flexShrink:0, fontFamily:T.font }}>+ Audio</button>
      </div>

      {/* Timeline scroll */}
      <div ref={timelineRef} style={{ flex:1, overflow:'auto', position:'relative', minHeight:0 }}>
        <div style={{ display:'flex', position:'relative', minHeight:'100%', minWidth: totalWidth + 200 }}>

          {/* Track headers */}
          <div style={{ width:200, minWidth:200, flexShrink:0, background:T.bg1, borderRight:`1px solid ${T.border}`, position:'sticky', left:0, zIndex:10 }}>
            {/* Ruler spacer */}
            <div style={{ height:28, borderBottom:`1px solid ${T.border}`, background:T.bg2 }}/>
            {sortedTracks.map(track => (
              <div key={track.id} style={{ height:52, borderBottom:`1px solid ${T.border}`, display:'flex', alignItems:'center', padding:'0 8px', gap:7 }}>
                <div style={{ width:26, height:26, background:`rgba(${track.type==='video'?'0,255,200':'255,107,53'},0.08)`, border:`1px solid rgba(${track.type==='video'?'0,255,200':'255,107,53'},0.2)`, borderRadius:6, display:'flex', alignItems:'center', justifyContent:'center', color:trackIconColor(track.type), flexShrink:0 }}>
                  {track.type==='video'?<Video size={11}/>:<AudioWaveform size={11}/>}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:10, fontWeight:600, color:T.text, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', fontFamily:T.font }}>{track.name}</div>
                  <div style={{ fontSize:9, color:T.dim2, fontFamily:T.font }}>Layer {track.zIndex}</div>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:2 }}>
                  {[
                    [track.muted?<VolumeX size={10}/>:<Volume2 size={10}/>, ()=>toggleTrackMute(track.id), track.muted?'#f85149':T.dim2, 'Mute'],
                    [track.visible?<Eye size={10}/>:<EyeOff size={10}/>, ()=>toggleTrackVisible(track.id), track.visible?T.teal:T.dim2, 'Visibility'],
                    [track.locked?<Lock size={10}/>:<Unlock size={10}/>, ()=>toggleTrackLock(track.id), track.locked?'#ffd60a':T.dim2, 'Lock'],
                  ].map(([icon, onClick, color, title], i) => (
                    <button key={i} onClick={onClick} title={title} style={{ width:22, height:22, background:'transparent', border:'none', borderRadius:4, color, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', transition:'all .1s' }}>
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Timeline canvas */}
          <div style={{ flex:1, position:'relative', width:totalWidth }}>
            {/* Ruler */}
            <div onClick={handleRulerClick} style={{ height:28, background:T.bg2, borderBottom:`1px solid ${T.border}`, position:'relative', overflow:'visible', cursor:'pointer', width:totalWidth }}>
              {buildRuler()}
            </div>

            {/* Playhead */}
            <div style={{ position:'absolute', top:0, left:currentTime*PX, width:2, background:T.teal, zIndex:20, pointerEvents:'none', height:`${sortedTracks.length*52+28}px`, boxShadow:'0 0 6px rgba(0,255,200,0.6)' }}>
              <div style={{ position:'absolute', top:-2, left:-5, width:0, height:0, borderLeft:'6px solid transparent', borderRight:'6px solid transparent', borderTop:`8px solid ${T.teal}`, filter:'drop-shadow(0 0 4px rgba(0,255,200,0.8))' }}/>
            </div>

            {/* Markers */}
            {markers.map(mk => (
              <div key={mk.id} onClick={()=>setCurrentTime(mk.time)} style={{ position:'absolute', top:0, left:mk.time*PX, width:2, background:'#FF6600', zIndex:15, cursor:'pointer', height:`${sortedTracks.length*52+28}px`, boxShadow:'0 0 5px rgba(255,102,0,0.5)' }}>
                {mk.label && <div style={{ position:'absolute', top:-18, left:-4, background:'#FF6600', borderRadius:'2px 6px 6px 2px', padding:'1px 5px', fontSize:8, color:'#fff', whiteSpace:'nowrap' }}>{mk.label}</div>}
              </div>
            ))}

            {/* Track rows */}
            {sortedTracks.map(track => (
              <div key={track.id} style={{ height:52, borderBottom:`1px solid ${T.border}`, position:'relative', background:'rgba(255,255,255,0.015)', width:totalWidth }}>
                <div data-lane="true"
                  onClick={handleLaneClick}
                  onDrop={e=>handleDrop(e,track.id)}
                  onDragOver={e=>{e.preventDefault();e.currentTarget.style.background='rgba(0,255,200,0.05)';}}
                  onDragLeave={e=>{e.currentTarget.style.background='transparent';}}
                  style={{ position:'absolute', inset:0, cursor:'crosshair' }}>

                  {track.clips.length===0 && (
                    <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, color:'rgba(255,255,255,0.06)', pointerEvents:'none', fontFamily:T.font }}>Drop media here</div>
                  )}

                  {/* Clips */}
                  {track.clips.map(clip => {
                    const left  = clip.startTime * PX;
                    const width = Math.max(clip.duration * PX, 4);
                    const isSel = selectedClip?.id === clip.id;
                    const cssFilter = buildFilter(clip.effects);
                    const trackColor = track.color || (track.type==='video'?'#1a4a3a':'#3a2a1a');
                    return (
                      <div key={clip.id}
                        onMouseDown={e=>handleClipMouseDown(e,clip,track.id)}
                        onClick={e=>{e.stopPropagation();setSelectedClip(clip);setSelectedTransition(null);}}
                        onDragOver={e=>{e.preventDefault();e.currentTarget.style.outline=`2px solid ${T.teal}`;}}
                        onDragLeave={e=>{e.currentTarget.style.outline='none';}}
                        onDrop={e=>{e.preventDefault();e.stopPropagation();e.currentTarget.style.outline='none';if(draggedEffect)applyEffectToClip(clip.id,draggedEffect.id,50);}}
                        style={{
                          position:'absolute', top:4, height:44, left, width,
                          borderRadius:6, overflow:'hidden', cursor:'grab',
                          border:`1px solid ${isSel?'rgba(255,255,255,0.9)':'rgba(255,255,255,0.12)'}`,
                          boxShadow:isSel?'0 0 0 2px rgba(255,255,255,0.3)':'none',
                          background: clip.thumbnail
                            ? `linear-gradient(rgba(0,0,0,0.4),rgba(0,0,0,0.6)), url(${clip.thumbnail}) center/cover no-repeat`
                            : trackColor,
                          filter:cssFilter, transition:'box-shadow .1s',
                        }}>
                        {clip.thumbnail && (
                          <img src={clip.thumbnail} alt="" style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover', opacity:0.35, pointerEvents:'none', borderRadius:5 }}/>
                        )}
                        <div style={{ position:'relative', zIndex:1, padding:'4px 7px', fontSize:10, fontWeight:700, color:'rgba(255,255,255,0.95)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', textShadow:'0 1px 4px rgba(0,0,0,0.9)', fontFamily:T.font }}>{clip.title}</div>
                        {clip.effects?.length>0 && (
                          <div style={{ position:'absolute', bottom:3, right:5, zIndex:1, display:'flex', alignItems:'center', gap:2, fontSize:9, color:'rgba(255,255,255,0.6)' }}>
                            <Sparkles size={8}/>{clip.effects.length}
                          </div>
                        )}
                        {clip.cloudId && <span style={{ position:'absolute', bottom:3, left:5, zIndex:1, fontSize:9, color:'rgba(255,255,255,0.5)' }}>☁</span>}
                      </div>
                    );
                  })}

                  {/* Transition blocks */}
                  {(track.transitions||[]).map(tr => {
                    const left = tr.startTime*PX;
                    const width = Math.max(tr.duration*PX, 8);
                    const isSel = selectedTransition?.id===tr.id;
                    return (
                      <div key={tr.id}
                        onClick={e=>{e.stopPropagation();setSelectedTransition(tr);setSelectedClip(null);}}
                        style={{ position:'absolute', top:4, height:44, left, width, background:isSel?'rgba(167,139,250,0.3)':'rgba(167,139,250,0.15)', border:`1px solid ${isSel?T.purple:'rgba(167,139,250,0.35)'}`, borderRadius:4, display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, color:T.purple, overflow:'hidden', cursor:'pointer', zIndex:5 }}>
                        {tr.type}
                      </div>
                    );
                  })}

                  {/* + Transition buttons */}
                  {getAdjacentPairs(track).map(({c1,c2},i) => {
                    const pos = (c1.startTime+c1.duration)*PX;
                    const has = (track.transitions||[]).some(t=>Math.abs(t.startTime-(c1.startTime+c1.duration-0.5))<1.2);
                    if (has) return null;
                    return (
                      <div key={i}
                        onClick={e=>{e.stopPropagation();addTransition(track.id,c1,c2,selectedTransType);}}
                        title={`Add ${selectedTransType} transition`}
                        style={{ position:'absolute', top:'50%', transform:'translateY(-50%)', left:pos-11, width:22, height:22, borderRadius:'50%', background:`linear-gradient(135deg,${T.purple},#7c3aed)`, border:'2px solid rgba(255,255,255,0.9)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', zIndex:10, boxShadow:'0 2px 10px rgba(0,0,0,0.5)' }}>
                        <Plus size={12} color="#fff"/>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
