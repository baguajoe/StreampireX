import React, { useRef, useEffect, useCallback, useState } from 'react';
import { Monitor, Volume2, VolumeX, Play, Pause, SkipBack, SkipForward, Plus, Video, AudioWaveform, Image } from 'lucide-react';

const T = {
  bg0:'#04040c', bg1:'#07070f', bg2:'#0c0c18',
  border:'rgba(255,255,255,0.06)',
  teal:'#00ffc8', text:'#f0f4f8',
  dim:'rgba(255,255,255,0.4)', dim2:'rgba(255,255,255,0.2)',
  font:"'JetBrains Mono', monospace",
};

function buildFilter(effects) {
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
      case 'low_light_restore': parts.push(`brightness(${1+v/140}) contrast(${1+v/300})`); break;
      default: break;
    }
  }
  return parts.join(' ');
}

function getFade(effects, progress) {
  if (!effects?.length) return null;
  const fd = 0.3;
  for (const e of effects) {
    if (!e.enabled) continue;
    if (e.id==='crossDissolve') {
      if (progress<fd) return {color:'#000',opacity:1-progress/fd};
      if (progress>1-fd) return {color:'#000',opacity:(progress-(1-fd))/fd};
    }
    if (e.id==='fadeIn'      &&progress<fd)   return {color:'#000',opacity:1-progress/fd};
    if (e.id==='fadeOut'     &&progress>1-fd) return {color:'#000',opacity:(progress-(1-fd))/fd};
    if (e.id==='fadeInWhite' &&progress<fd)   return {color:'#fff',opacity:1-progress/fd};
    if (e.id==='fadeOutWhite'&&progress>1-fd) return {color:'#fff',opacity:(progress-(1-fd))/fd};
  }
  return null;
}

// ── Source Monitor Popup ──────────────────────────────────
export function SourceMonitorPopup({ media, onClose, onAddToTimeline }) {
  const [inPoint,  setInPoint]  = useState(0);
  const [outPoint, setOutPoint] = useState(0);
  const [curTime,  setCurTime]  = useState(0);
  const [dur,      setDur]      = useState(0);
  const [playing,  setPlaying]  = useState(false);
  const vidRef = useRef(null);
  const audRef = useRef(null);
  const getEl = () => vidRef.current || audRef.current;

  useEffect(() => { setInPoint(0); setOutPoint(0); setCurTime(0); setDur(0); setPlaying(false); }, [media]);

  const fmt = s => {
    if (isNaN(s)) return '00:00:00';
    const m=Math.floor(s/60), sec=Math.floor(s%60), fr=Math.floor((s%1)*30);
    return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}:${String(fr).padStart(2,'0')}`;
  };

  const toggle = () => { const el=getEl(); if(!el)return; playing?el.pause():el.play(); setPlaying(p=>!p); };

  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', zIndex:5000, display:'flex', alignItems:'center', justifyContent:'center', backdropFilter:'blur(16px)' }}>
      <div onClick={e=>e.stopPropagation()} style={{ width:680, maxWidth:'95vw', background:'#0e0e1e', border:'1px solid rgba(255,255,255,0.12)', borderRadius:14, overflow:'hidden', boxShadow:'0 32px 80px rgba(0,0,0,0.95)' }}>
        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 16px', background:'rgba(255,255,255,0.03)', borderBottom:'1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <Monitor size={14} style={{color:T.teal}}/>
            <span style={{fontSize:12,fontWeight:700,color:T.text,fontFamily:T.font}}>Source Monitor</span>
            <span style={{fontSize:11,color:T.dim,fontFamily:T.font}}>— {media?.name}</span>
          </div>
          <button onClick={onClose} style={{background:'transparent',border:'none',color:T.dim,cursor:'pointer',fontSize:16}}>✕</button>
        </div>
        {/* Screen */}
        <div style={{ background:'#000', minHeight:280, display:'flex', alignItems:'center', justifyContent:'center', position:'relative' }}>
          {media?.type==='video' && <video ref={vidRef} src={media.url} style={{maxWidth:'100%',maxHeight:320}} onTimeUpdate={e=>setCurTime(e.target.currentTime)} onLoadedMetadata={e=>{setDur(e.target.duration);setOutPoint(e.target.duration);}} onPlay={()=>setPlaying(true)} onPause={()=>setPlaying(false)}/>}
          {media?.type==='audio' && <div style={{textAlign:'center',padding:40}}><AudioWaveform size={56} style={{color:'#ff6b6b',marginBottom:12}}/><p style={{color:T.dim,marginBottom:12,fontFamily:T.font}}>{media.name}</p><audio ref={audRef} src={media.url} onTimeUpdate={e=>setCurTime(e.target.currentTime)} onLoadedMetadata={e=>{setDur(e.target.duration);setOutPoint(e.target.duration);}} onPlay={()=>setPlaying(true)} onPause={()=>setPlaying(false)}/></div>}
          {media?.type==='image' && <img src={media.url} alt="preview" style={{maxWidth:'100%',maxHeight:300,objectFit:'contain'}}/>}
        </div>
        {/* Footer controls */}
        {(media?.type==='video'||media?.type==='audio') && (
          <div style={{ padding:'10px 16px', background:'rgba(255,255,255,0.02)', borderTop:'1px solid rgba(255,255,255,0.06)' }}>
            {/* Scrub bar */}
            <div style={{ position:'relative', height:20, background:'rgba(255,255,255,0.06)', borderRadius:4, marginBottom:8, overflow:'hidden', cursor:'pointer' }}>
              <div style={{ position:'absolute', height:'100%', background:'rgba(0,255,200,0.15)', left:`${dur>0?(inPoint/dur)*100:0}%`, width:`${dur>0?((outPoint-inPoint)/dur)*100:100}%` }}/>
              <div style={{ position:'absolute', width:2, height:'100%', background:T.teal, left:`${dur>0?(curTime/dur)*100:0}%`, boxShadow:'0 0 6px rgba(0,255,200,0.6)' }}/>
              <input type="range" min="0" max="100" value={dur>0?(curTime/dur)*100:0} onChange={e=>{const t=(parseFloat(e.target.value)/100)*dur; const el=getEl(); if(el)el.currentTime=t; setCurTime(t);}} style={{ position:'absolute', inset:0, opacity:0, cursor:'pointer', width:'100%' }}/>
            </div>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8 }}>
              <div style={{ display:'flex', gap:3 }}>
                <button onClick={()=>{const el=getEl();if(el){el.currentTime=inPoint;setCurTime(inPoint);}}} style={{width:28,height:28,background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:5,color:T.text,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}><SkipBack size={12}/></button>
                <button onClick={toggle} style={{width:28,height:28,background:playing?'#f85149':T.teal,border:'none',borderRadius:5,color:'#000',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}>{playing?<Pause size={14}/>:<Play size={14}/>}</button>
                <button onClick={()=>{const el=getEl();if(el){el.currentTime=outPoint;setCurTime(outPoint);}}} style={{width:28,height:28,background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:5,color:T.text,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}><SkipForward size={12}/></button>
              </div>
              <div style={{ fontSize:11, fontWeight:700, color:T.teal, fontFamily:T.font }}>{fmt(curTime)} / {fmt(dur)}</div>
              <div style={{ display:'flex', gap:3 }}>
                <button onClick={()=>setInPoint(curTime)} style={{width:28,height:28,background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:5,color:'#4a9eff',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',fontSize:10,fontWeight:700,fontFamily:T.font}}>I</button>
                <button onClick={()=>setOutPoint(curTime)} style={{width:28,height:28,background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:5,color:'#f85149',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',fontSize:10,fontWeight:700,fontFamily:T.font}}>O</button>
              </div>
            </div>
          </div>
        )}
        {/* Insert buttons */}
        <div style={{ display:'flex', gap:8, justifyContent:'center', padding:'10px 16px', borderTop:'1px solid rgba(255,255,255,0.06)' }}>
          {media?.type==='video' && <button onClick={()=>onAddToTimeline(media,inPoint,outPoint,'video')} style={{display:'flex',alignItems:'center',gap:5,padding:'8px 14px',background:'rgba(74,158,255,0.15)',border:'1px solid rgba(74,158,255,0.3)',borderRadius:7,color:'#4a9eff',fontSize:11,fontWeight:600,cursor:'pointer',fontFamily:T.font}}><Video size={12}/>Insert Video</button>}
          {(media?.type==='video'||media?.type==='audio') && <button onClick={()=>onAddToTimeline(media,inPoint,outPoint,'audio')} style={{display:'flex',alignItems:'center',gap:5,padding:'8px 14px',background:'rgba(255,107,107,0.15)',border:'1px solid rgba(255,107,107,0.3)',borderRadius:7,color:'#ff6b6b',fontSize:11,fontWeight:600,cursor:'pointer',fontFamily:T.font}}><AudioWaveform size={12}/>Insert Audio</button>}
          {media?.type==='video' && <button onClick={()=>onAddToTimeline(media,inPoint,outPoint,'both')} style={{display:'flex',alignItems:'center',gap:5,padding:'8px 16px',background:'linear-gradient(135deg,#00ffc8,#00b894)',border:'none',borderRadius:7,color:'#000',fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:T.font}}><Plus size={12}/>Insert Both</button>}
          {media?.type==='image' && <button onClick={()=>onAddToTimeline(media,0,5,'video')} style={{display:'flex',alignItems:'center',gap:5,padding:'8px 16px',background:'linear-gradient(135deg,#00ffc8,#00b894)',border:'none',borderRadius:7,color:'#000',fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:T.font}}><Image size={12}/>Add Image</button>}
        </div>
      </div>
    </div>
  );
}

// ── Main monitors component ───────────────────────────────
export default function VideoEditorMonitors({
  tracks, currentTime, isPlaying, programMuted, setProgramMuted,
  sourceMedia, setSourceMedia, showSourceMon, setShowSourceMon,
  addClipToTrack, formatTime,
}) {
  const programVideoRef = useRef(null);

  const activeClip = tracks
    .flatMap(tr => tr.clips.map(c => ({...c, trackMuted:tr.muted})))
    .find(c => currentTime>=c.startTime && currentTime<c.startTime+c.duration) || null;

  useEffect(() => {
    const el = programVideoRef.current;
    if (!el || !activeClip || activeClip.type!=='video') return;
    const offset = currentTime - activeClip.startTime;
    if (Math.abs(el.currentTime - offset) > 0.05) el.currentTime = offset;
    if (isPlaying && el.paused)  el.play().catch(()=>{});
    if (!isPlaying && !el.paused) el.pause();
  }, [isPlaying, currentTime, activeClip]);

  const handleAddToTimeline = useCallback((media, inPt, outPt, mode) => {
    const dur = Math.max(1, outPt - inPt);
    const videoTrack = tracks.find(t => t.type==='video' && !t.locked);
    const audioTrack = tracks.find(t => t.type==='audio' && !t.locked);
    const getEnd = tr => tr ? Math.max(0, ...tr.clips.map(c => c.startTime+c.duration)) : 0;
    if ((mode==='video'||mode==='both') && media.type!=='audio' && videoTrack) {
      addClipToTrack(videoTrack.id, {id:Date.now(),title:media.name,type:'video',startTime:getEnd(videoTrack),duration:dur,mediaUrl:media.url,r2_key:media.r2_key,cloudId:media.cloudId,thumbnail:media.thumbnail,inPoint:inPt,outPoint:outPt,effects:[],compositing:{opacity:100,blendMode:'normal',position:{x:0,y:0},scale:{x:100,y:100},rotation:0}});
    }
    if ((mode==='audio'||mode==='both') && (media.type==='video'||media.type==='audio') && audioTrack) {
      addClipToTrack(audioTrack.id, {id:Date.now()+1,title:media.name+' (audio)',type:'audio',startTime:getEnd(audioTrack),duration:dur,mediaUrl:media.url,r2_key:media.r2_key,cloudId:media.cloudId,inPoint:inPt,outPoint:outPt,effects:[],compositing:{opacity:100}});
    }
    setShowSourceMon(false);
  }, [tracks, addClipToTrack, setShowSourceMon]);

  const smpte = (t, fr=24) => {
    const tf=Math.floor(t*fr), ff=tf%fr, ts=Math.floor(tf/fr);
    return `${String(Math.floor(ts/3600)).padStart(2,'0')}:${String(Math.floor(ts/60)%60).padStart(2,'0')}:${String(ts%60).padStart(2,'0')}:${String(ff).padStart(2,'0')}`;
  };

  const monHeader = (label, right) => (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'4px 12px', flexShrink:0, background:'rgba(4,4,12,0.95)', borderBottom:'1px solid rgba(255,255,255,0.05)', height:28 }}>
      <span style={{ fontSize:9, fontWeight:700, color:T.dim2, textTransform:'uppercase', letterSpacing:1.5, fontFamily:T.font }}>{label}</span>
      {right}
    </div>
  );

  const renderProgram = () => {
    if (!activeClip) return (
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:10, color:'rgba(255,255,255,0.08)' }}>
        <Monitor size={40}/><p style={{fontSize:11,color:T.dim2,fontFamily:T.font}}>Program Monitor</p>
        <p style={{fontSize:10,color:'rgba(255,255,255,0.15)',fontFamily:T.font}}>No clip at playhead</p>
      </div>
    );
    const offset = currentTime - activeClip.startTime;
    const progress = activeClip.duration>0 ? offset/activeClip.duration : 0;
    const cssFilter = buildFilter(activeClip.effects);
    const fade = getFade(activeClip.effects, progress);
    return (
      <div style={{ position:'relative', width:'100%', height:'100%', background:'#000', display:'flex', alignItems:'center', justifyContent:'center' }}>
        {activeClip.type==='video' && activeClip.mediaUrl && <video key={activeClip.id} ref={programVideoRef} src={activeClip.previewUrl||activeClip.mediaUrl} muted={programMuted||activeClip.trackMuted} style={{maxWidth:'100%',maxHeight:'100%',display:'block',filter:cssFilter}} onEnded={()=>{}}/>}
        {activeClip.type==='image' && activeClip.mediaUrl && <img src={activeClip.previewUrl||activeClip.mediaUrl} alt={activeClip.title} style={{maxWidth:'100%',maxHeight:'100%',objectFit:'contain',filter:cssFilter}}/>}
        {activeClip.type==='audio' && <div style={{textAlign:'center',color:T.dim}}><AudioWaveform size={48} style={{marginBottom:8}}/><p style={{fontSize:11,fontFamily:T.font}}>{activeClip.title}</p>{activeClip.mediaUrl&&<audio key={activeClip.id} src={activeClip.mediaUrl} autoPlay={isPlaying&&!programMuted} muted={programMuted}/>}</div>}
        {fade && <div style={{ position:'absolute', inset:0, backgroundColor:fade.color, opacity:fade.opacity, pointerEvents:'none' }}/>}
        <div style={{ position:'absolute', bottom:8, left:8, background:'rgba(0,0,0,0.8)', padding:'5px 10px', borderRadius:6, fontSize:10, pointerEvents:'none', backdropFilter:'blur(8px)', border:'1px solid rgba(255,255,255,0.08)', fontFamily:T.font }}>
          <div style={{fontWeight:700,color:T.text}}>{activeClip.title}</div>
          <div style={{color:T.dim,marginTop:2}}>{formatTime(offset)} / {formatTime(activeClip.duration)}</div>
          {activeClip.effects?.filter(e=>e.enabled).length>0 && <div style={{color:T.teal,marginTop:2,fontSize:9}}>FX: {activeClip.effects.filter(e=>e.enabled).map(e=>e.id).join(', ')}</div>}
        </div>
      </div>
    );
  };

  const monBody = { flex:1, display:'flex', alignItems:'center', justifyContent:'center', position:'relative', overflow:'hidden', background:'#000', minHeight:0 };
  const monFoot = { display:'flex', alignItems:'center', gap:6, padding:'4px 10px', flexShrink:0, background:'rgba(4,4,12,0.95)', borderTop:'1px solid rgba(255,255,255,0.05)', height:28 };
  const tcStyle = { fontSize:11, fontWeight:700, color:T.teal, fontFamily:T.font, letterSpacing:1 };
  const smBtn = (active, children, onClick) => (
    <button onClick={onClick} style={{ display:'flex', alignItems:'center', gap:4, background:active?'rgba(0,255,200,0.1)':'transparent', border:`1px solid ${active?'rgba(0,255,200,0.25)':'transparent'}`, borderRadius:5, color:active?T.teal:T.dim, fontSize:10, padding:'2px 8px', cursor:'pointer', fontFamily:T.font }}>{children}</button>
  );

  return (
    <>
      <div style={{ display:'flex', flexDirection:'row', flex:1, overflow:'hidden', minHeight:0 }}>
        {/* Source monitor */}
        <div style={{ flex:1, display:'flex', flexDirection:'column', borderRight:'1px solid rgba(255,255,255,0.05)', minWidth:0 }}>
          {monHeader('Source Monitor', sourceMedia && smBtn(true,'Open',()=>setShowSourceMon(true)))}
          <div style={monBody}>
            {sourceMedia ? (
              <>
                {sourceMedia.type==='video' && <video src={sourceMedia.url} controls style={{maxWidth:'100%',maxHeight:'100%'}}/>}
                {sourceMedia.type==='audio' && <div style={{textAlign:'center',color:T.dim,padding:20}}><AudioWaveform size={40} style={{marginBottom:8}}/><p style={{fontSize:11,marginBottom:8,fontFamily:T.font}}>{sourceMedia.name}</p><audio src={sourceMedia.url} controls/></div>}
                {sourceMedia.type==='image' && <img src={sourceMedia.url} alt={sourceMedia.name} style={{maxWidth:'100%',maxHeight:'100%',objectFit:'contain'}}/>}
              </>
            ) : (
              <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:10,color:'rgba(255,255,255,0.08)'}}>
                <Monitor size={32}/><p style={{fontSize:11,color:T.dim2,fontFamily:T.font}}>Click media to preview</p>
              </div>
            )}
          </div>
          <div style={monFoot}>
            <span style={tcStyle}>{smpte(currentTime)}</span>
            {sourceMedia && <button onClick={()=>setShowSourceMon(true)} style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:4,background:'rgba(0,255,200,0.08)',border:'1px solid rgba(0,255,200,0.2)',borderRadius:5,color:T.teal,fontSize:10,padding:'2px 8px',cursor:'pointer',fontFamily:T.font}}>Edit In/Out</button>}
          </div>
        </div>

        {/* Program monitor */}
        <div style={{ flex:1, display:'flex', flexDirection:'column', minWidth:0 }}>
          {monHeader('Program Monitor',
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <button onClick={()=>setProgramMuted(m=>!m)} style={{display:'flex',alignItems:'center',gap:4,background:programMuted?'rgba(248,81,73,0.1)':'rgba(0,255,200,0.1)',border:`1px solid ${programMuted?'rgba(248,81,73,0.25)':'rgba(0,255,200,0.25)'}`,borderRadius:5,color:programMuted?'#f85149':T.teal,fontSize:10,padding:'2px 8px',cursor:'pointer',fontFamily:T.font}}>
                {programMuted?<><VolumeX size={11}/> Muted</>:<><Volume2 size={11}/> Sound</>}
              </button>
              <span style={tcStyle}>{formatTime(currentTime)}</span>
            </div>
          )}
          <div style={monBody}>{renderProgram()}</div>
          <div style={monFoot}>
            <span style={{fontSize:10,color:T.dim2,fontFamily:T.font}}>1920×1080</span>
            <span style={{...tcStyle,marginLeft:6}}>{formatTime(currentTime)}</span>
          </div>
        </div>
      </div>

      {showSourceMon && sourceMedia && (
        <SourceMonitorPopup media={sourceMedia} onClose={()=>setShowSourceMon(false)} onAddToTimeline={handleAddToTimeline}/>
      )}
    </>
  );
}
