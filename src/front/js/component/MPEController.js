import React, { useEffect, useRef, useState } from "react";
export class MPEEngine {
  constructor(ctx) { this.ctx = ctx; this.zone = { master: 0, members: [1,2,3,4,5,6,7] }; this.pitchBendRange = 48; }
  processMIDI(message, onNoteOn, onNoteOff, onNoteUpdate) {
    const [status, data1, data2] = message.data;
    const channel = status & 0x0F, type = status & 0xF0;
    const isMember = this.zone.members.includes(channel);
    if (type === 0x90 && data2 > 0 && isMember) onNoteOn?.(`${channel}-${data1}`, { channel, note: data1, velocity: data2/127, pressure: data2/127, pitch: 0, slide: 0.5 });
    if ((type === 0x80 || (type === 0x90 && data2 === 0)) && isMember) onNoteOff?.(channel, data1);
    if (type === 0xE0 && isMember) { const bend = ((data2<<7)|data1-8192)/8192*this.pitchBendRange; onNoteUpdate?.(channel, { pitchBend: bend }); }
    if (type === 0xD0 && isMember) onNoteUpdate?.(channel, { pressure: data1/127 });
    if (type === 0xB0 && data1 === 74 && isMember) onNoteUpdate?.(channel, { slide: data1/127 });
  }
  applyToNote(noteId, expression, nodes) {
    if (!nodes || !this.ctx) return;
    const now = this.ctx.currentTime;
    if (expression.pitchBend !== undefined && nodes.source?.detune) nodes.source.detune.setTargetAtTime(expression.pitchBend*100, now, 0.01);
    if (expression.pressure !== undefined && nodes.gainNode) nodes.gainNode.gain.setTargetAtTime(0.5+expression.pressure*0.5, now, 0.02);
  }
}
export function useMPE(audioContextRef, { onNoteOn, onNoteOff, onNoteUpdate } = {}) {
  const engineRef = useRef(null);
  const [mpeEnabled, setMpeEnabled] = useState(false);
  const [activeNoteCount, setActiveNoteCount] = useState(0);
  const [midiInputs, setMidiInputs] = useState([]);
  useEffect(() => {
    if (!mpeEnabled || !audioContextRef?.current) return;
    engineRef.current = new MPEEngine(audioContextRef.current);
    navigator.requestMIDIAccess?.({ sysex: false }).then(access => {
      const inputs = Array.from(access.inputs.values());
      setMidiInputs(inputs.map(i => ({ id: i.id, name: i.name })));
      inputs.forEach(input => { input.onmidimessage = (msg) => engineRef.current?.processMIDI(msg, (id,d) => { setActiveNoteCount(c=>c+1); onNoteOn?.(id,d); }, (ch,n) => { setActiveNoteCount(c=>Math.max(0,c-1)); onNoteOff?.(ch,n); }, onNoteUpdate); });
    }).catch(()=>{});
    return () => { engineRef.current = null; };
  }, [mpeEnabled, audioContextRef]);
  return { mpeEnabled, setMpeEnabled, activeNoteCount, midiInputs, engine: engineRef.current };
}
export const MPEPanel = ({ audioContextRef, onNoteOn, onNoteOff, onNoteUpdate }) => {
  const { mpeEnabled, setMpeEnabled, activeNoteCount, midiInputs } = useMPE(audioContextRef, { onNoteOn, onNoteOff, onNoteUpdate });
  return (
    <div style={{background:"#0d1117",border:"1px solid #21262d",borderRadius:10,padding:"12px 14px",display:"flex",flexDirection:"column",gap:10}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <span style={{fontSize:9,fontWeight:800,color:"#4e6a82",textTransform:"uppercase",letterSpacing:1.5}}>MPE — Polyphonic Expression</span>
        <span style={{padding:"2px 6px",borderRadius:4,fontSize:9,fontWeight:800,background:mpeEnabled?"rgba(0,255,200,0.15)":"rgba(248,81,73,0.1)",color:mpeEnabled?"#00ffc8":"#f85149"}}>{mpeEnabled?"ACTIVE":"OFF"}</span>
      </div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <span style={{fontSize:11,fontWeight:700,color:"#e6edf3"}}>Enable MPE</span>
        <button onClick={()=>setMpeEnabled(v=>!v)} style={{width:36,height:18,borderRadius:9,background:mpeEnabled?"#00ffc8":"#21262d",border:"none",cursor:"pointer",position:"relative"}}>
          <div style={{width:14,height:14,borderRadius:"50%",background:"#fff",position:"absolute",top:2,left:mpeEnabled?20:2,transition:"left 0.2s"}}/>
        </button>
      </div>
      {mpeEnabled && <div style={{fontSize:9,color:"#4e6a82"}}>{midiInputs.length===0?"No MPE devices detected":midiInputs.map(i=>`● ${i.name}`).join(" · ")} · Active notes: {activeNoteCount}</div>}
    </div>
  );
};
export default MPEPanel;
