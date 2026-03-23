import React, { useState, useRef, useEffect, useCallback } from "react";
export const FRAME_RATES = {
  "24":{ fps:24, label:"24 fps (Film)" }, "25":{ fps:25, label:"25 fps (PAL)" },
  "29.97":{ fps:29.97, label:"29.97 DF (NTSC)" }, "30":{ fps:30, label:"30 fps" },
};
export function secondsToSMPTE(seconds, fpsKey="24") {
  const { fps } = FRAME_RATES[fpsKey]||FRAME_RATES["24"];
  const tf=Math.floor(seconds*fps), f=tf%fps, ts=Math.floor(tf/fps), s=ts%60, m=Math.floor(ts/60)%60, h=Math.floor(ts/3600);
  const pad=n=>String(Math.floor(n)).padStart(2,"0");
  return `${pad(h)}:${pad(m)}:${pad(s)}:${pad(f)}`;
}
export function smpteToSeconds(tc, fpsKey="24") {
  const { fps } = FRAME_RATES[fpsKey]||FRAME_RATES["24"];
  const [h,m,s,f]=(tc||"00:00:00:00").split(":").map(Number);
  return h*3600+m*60+s+f/fps;
}
export const FilmScoringPanel = ({ currentTime=0, bpm=120, onBpmChange, onSeek, onAddMarker }) => {
  const [fpsKey, setFpsKey] = useState("24");
  const [hitPoints, setHitPoints] = useState([]);
  const [fitStart, setFitStart] = useState("00:00:00:00");
  const [fitEnd, setFitEnd] = useState("00:00:04:00");
  const [fitBeats, setFitBeats] = useState(4);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const videoRef = useRef(null);
  const fileRef = useRef(null);
  const smpteCurrent = secondsToSMPTE(currentTime, fpsKey);
  const addHit = () => { const id=Date.now(); const hp={id,name:`Hit ${hitPoints.length+1}`,seconds:currentTime,timecode:secondsToSMPTE(currentTime,fpsKey),color:"#00ffc8",note:""}; setHitPoints(p=>[...p,hp]); onAddMarker?.({time:currentTime,label:hp.name,type:"hit"}); };
  const calcBPM = () => { const s=smpteToSeconds(fitStart,fpsKey),e=smpteToSeconds(fitEnd,fpsKey); if(e>s&&fitBeats>0) onBpmChange?.(Math.round((fitBeats/(e-s))*60*100)/100); };
  const s = { panel:{background:"#0d1117",border:"1px solid #21262d",borderRadius:10,padding:"14px",display:"flex",flexDirection:"column",gap:12}, label:{fontSize:9,fontWeight:800,color:"#4e6a82",textTransform:"uppercase",letterSpacing:1.5}, input:{background:"#161b22",border:"1px solid #21262d",borderRadius:5,color:"#e6edf3",fontSize:10,padding:"4px 8px",fontFamily:"JetBrains Mono,monospace",outline:"none"}, btn:{padding:"5px 12px",borderRadius:5,border:"1px solid #21262d",background:"transparent",color:"#8b949e",fontSize:9,fontWeight:800,cursor:"pointer"} };
  return (
    <div style={s.panel}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <span style={{fontSize:11,fontWeight:800,color:"#e6edf3"}}>🎬 Film Scoring</span>
        <select value={fpsKey} onChange={e=>setFpsKey(e.target.value)} style={{...s.input,width:"auto"}}>{Object.entries(FRAME_RATES).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}</select>
      </div>
      <div style={{textAlign:"center",fontFamily:"JetBrains Mono,monospace",fontSize:20,fontWeight:800,color:"#00ffc8",letterSpacing:2,background:"#0a0d14",borderRadius:8,padding:"10px 0"}}>{smpteCurrent}</div>
      <input ref={fileRef} type="file" accept="video/*" style={{display:"none"}} onChange={e=>{if(e.target.files[0]&&videoRef.current){videoRef.current.src=URL.createObjectURL(e.target.files[0]);setVideoLoaded(true);}}}/>
      <button style={s.btn} onClick={()=>fileRef.current?.click()}>{videoLoaded?"📽 Video loaded":"+ Import Video"}</button>
      {videoLoaded && <video ref={videoRef} style={{width:"100%",borderRadius:6,maxHeight:140}} controls/>}
      {!videoLoaded && <div ref={videoRef} style={{display:"none"}}/>}
      <div style={{display:"flex",gap:4}}><button style={{...s.btn,flex:1}} onClick={addHit}>+ Mark Hit Point</button></div>
      {hitPoints.map(hp=>(
        <div key={hp.id} style={{display:"flex",gap:6,alignItems:"center",padding:"4px 6px",background:"#0a0d14",borderRadius:6}}>
          <span style={{fontFamily:"JetBrains Mono,monospace",fontSize:10,color:"#00ffc8",flexShrink:0}}>{hp.timecode}</span>
          <span style={{fontSize:10,color:"#e6edf3",flex:1}}>{hp.name}</span>
          <button onClick={()=>setHitPoints(p=>p.filter(h=>h.id!==hp.id))} style={{background:"none",border:"none",color:"#f85149",cursor:"pointer"}}>✕</button>
        </div>
      ))}
      <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
        <span style={s.label}>Fit BPM:</span>
        <input value={fitStart} onChange={e=>setFitStart(e.target.value)} style={{...s.input,width:80}} placeholder="00:00:00:00"/>
        <span style={{color:"#4e6a82",fontSize:10}}>→</span>
        <input value={fitEnd} onChange={e=>setFitEnd(e.target.value)} style={{...s.input,width:80}} placeholder="00:00:04:00"/>
        <input type="number" value={fitBeats} onChange={e=>setFitBeats(+e.target.value)} style={{...s.input,width:40}} min={1}/>
        <span style={{color:"#4e6a82",fontSize:9}}>beats</span>
        <button style={{...s.btn,color:"#00ffc8",borderColor:"#00ffc830"}} onClick={calcBPM}>Calc</button>
      </div>
    </div>
  );
};
export default FilmScoringPanel;
