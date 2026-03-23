import React from "react";
export const SampleRateSelector = ({ sampleRate, onChange, workletsLoaded }) => {
  const rates = [
    { value:44100, label:"44.1 kHz", desc:"CD / Web" },
    { value:48000, label:"48 kHz",   desc:"Video / Broadcast" },
    { value:96000, label:"96 kHz",   desc:"Hi-Res" },
    { value:192000,label:"192 kHz",  desc:"Studio" },
  ];
  return (
    <div style={{display:"flex",flexDirection:"column",gap:6}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <span style={{fontSize:9,fontWeight:800,color:"#4e6a82",textTransform:"uppercase",letterSpacing:1.5}}>Sample Rate</span>
        <span style={{fontSize:9,padding:"2px 6px",borderRadius:4,background:workletsLoaded?"rgba(0,255,200,0.1)":"rgba(255,214,10,0.1)",color:workletsLoaded?"#00ffc8":"#ffd60a",fontWeight:800}}>{workletsLoaded?"⚡ WORKLETS ON":"○ WORKLETS OFF"}</span>
      </div>
      <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
        {rates.map(r=>(
          <button key={r.value} onClick={()=>onChange(r.value)} title={r.desc} style={{flex:1,minWidth:70,padding:"5px 4px",borderRadius:5,border:`1px solid ${sampleRate===r.value?"#00ffc880":"#21262d"}`,background:sampleRate===r.value?"#00ffc818":"transparent",color:sampleRate===r.value?"#00ffc8":"#4e6a82",fontFamily:"JetBrains Mono,monospace",fontSize:9,fontWeight:800,cursor:"pointer",lineHeight:1.3}}>
            <div>{r.label}</div>
            <div style={{fontSize:8,opacity:0.7}}>{r.desc}</div>
          </button>
        ))}
      </div>
    </div>
  );
};
export default SampleRateSelector;
