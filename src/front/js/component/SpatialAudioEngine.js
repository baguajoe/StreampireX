import React, { useState, useRef, useEffect, useCallback } from "react";
export const SURROUND_CONFIGS = {
  stereo: { label:"Stereo 2.0", channels:["L","R"] },
  surround51: { label:"Surround 5.1", channels:["L","R","C","LFE","Ls","Rs"] },
  surround71: { label:"Surround 7.1", channels:["L","R","C","LFE","Ls","Rs","Lss","Rss"] },
  atmos: { label:"Atmos 7.1.4", channels:["L","R","C","LFE","Ls","Rs","Lss","Rss","LH","RH","LsH","RsH"] },
};
export const DEFAULT_POSITION = { x:0, y:0, z:-1, rolloffFactor:1, refDistance:1, maxDistance:100 };
export class SpatialAudioEngine {
  constructor(ctx) { this.ctx = ctx; this.trackPanners = new Map(); }
  createPanner(trackId, pos=DEFAULT_POSITION) {
    if (this.trackPanners.has(trackId)) return this.trackPanners.get(trackId);
    const p = this.ctx.createPanner();
    p.panningModel = "HRTF"; p.distanceModel = "inverse";
    p.refDistance = pos.refDistance??1; p.maxDistance = pos.maxDistance??100; p.rolloffFactor = pos.rolloffFactor??1;
    const now = this.ctx.currentTime;
    if (p.positionX) { p.positionX.setValueAtTime(pos.x??0,now); p.positionY.setValueAtTime(pos.y??0,now); p.positionZ.setValueAtTime(pos.z??-1,now); } else p.setPosition(pos.x??0,pos.y??0,pos.z??-1);
    this.trackPanners.set(trackId, p); return p;
  }
  setTrackPosition(trackId, pos) {
    const p = this.trackPanners.get(trackId); if (!p) return;
    const now = this.ctx.currentTime;
    if (p.positionX) { p.positionX.setTargetAtTime(pos.x,now,0.02); p.positionY.setTargetAtTime(pos.y,now,0.02); p.positionZ.setTargetAtTime(pos.z,now,0.02); } else p.setPosition(pos.x,pos.y,pos.z);
  }
  connectTrack(trackId, src, dst, pos=DEFAULT_POSITION) { const p=this.createPanner(trackId,pos); src.connect(p); p.connect(dst); return p; }
  removeTrack(trackId) { const p=this.trackPanners.get(trackId); if(p){try{p.disconnect();}catch(_){} this.trackPanners.delete(trackId);} }
}
export const SpatialTrackPanel = ({ trackId, trackName, audioContextRef, sourceNode, masterNode, color="#00ffc8" }) => {
  const [enabled, setEnabled] = useState(false);
  const [position, setPosition] = useState(DEFAULT_POSITION);
  const [config, setConfig] = useState("stereo");
  const engineRef = useRef(null);
  useEffect(() => {
    if (!enabled||!audioContextRef?.current) return;
    if (!engineRef.current) engineRef.current = new SpatialAudioEngine(audioContextRef.current);
    if (sourceNode&&masterNode) engineRef.current.connectTrack(trackId,sourceNode,masterNode,position);
    return () => engineRef.current?.removeTrack(trackId);
  }, [enabled]);
  useEffect(() => { if(enabled&&engineRef.current) engineRef.current.setTrackPosition(trackId,position); }, [position,enabled]);
  return (
    <div style={{background:"#0d1117",border:"1px solid #21262d",borderRadius:10,padding:"12px 14px",display:"flex",flexDirection:"column",gap:10}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <span style={{fontSize:9,fontWeight:800,color:"#4e6a82",textTransform:"uppercase"}}>🌐 Spatial — {trackName}</span>
        <button onClick={()=>setEnabled(v=>!v)} style={{padding:"3px 10px",borderRadius:5,border:`1px solid ${enabled?color+"66":"#21262d"}`,background:enabled?color+"18":"transparent",color:enabled?color:"#4e6a82",fontSize:9,fontWeight:800,cursor:"pointer"}}>{enabled?"ON":"OFF"}</button>
      </div>
      {enabled && <>
        <select value={config} onChange={e=>setConfig(e.target.value)} style={{background:"#161b22",border:"1px solid #21262d",borderRadius:5,color:"#e6edf3",fontSize:10,padding:"4px 6px",outline:"none"}}>
          {Object.entries(SURROUND_CONFIGS).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
        </select>
        <div style={{fontSize:9,color:"#4e6a82"}}>X:{position.x.toFixed(1)} Y:{position.y.toFixed(1)} Z:{position.z.toFixed(1)} · HRTF binaural</div>
        {["x","y","z"].map(axis=>(
          <div key={axis} style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:9,color:"#4e6a82",width:10,textTransform:"uppercase"}}>{axis}</span>
            <input type="range" min={-5} max={5} step={0.1} value={position[axis]} onChange={e=>setPosition(p=>({...p,[axis]:+e.target.value}))} style={{flex:1,accentColor:color}}/>
            <span style={{fontSize:10,color:"#00ffc8",width:30,textAlign:"right",fontFamily:"monospace"}}>{position[axis].toFixed(1)}</span>
          </div>
        ))}
      </>}
    </div>
  );
};
export default SpatialTrackPanel;
