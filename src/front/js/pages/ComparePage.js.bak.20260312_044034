import React, { useEffect } from "react";
import { Link } from "react-router-dom";

const C = () => <span style={{color:"#00ffc8",fontWeight:700}}>✓</span>;
const X = () => <span style={{color:"#2a3a4a",fontWeight:700}}>—</span>;
const P = () => <span style={{color:"#e09b30",fontWeight:700}}>~</span>;
const New = ({label="NEW"}) => <span style={{background:"#FF6600",color:"#fff",fontSize:"9px",fontWeight:700,padding:"1px 5px",borderRadius:"3px",marginLeft:"6px"}}>{label}</span>;

const Table = ({cols,rows}) => (
  <div style={{overflowX:"auto",marginTop:"16px"}}>
    <table style={{width:"100%",borderCollapse:"collapse",fontSize:"12px"}}>
      <thead><tr>{cols.map((c,i)=><th key={i} style={{padding:"8px 10px",textAlign:"left",fontFamily:"monospace",fontSize:"10px",fontWeight:700,color:i===1?"#00ffc8":"#4e6070",background:i===1?"rgba(0,255,200,0.06)":"#0a0f17",borderBottom:"1px solid rgba(255,255,255,0.06)",whiteSpace:"nowrap"}}>{c}</th>)}</tr></thead>
      <tbody>{rows.map((row,ri)=><tr key={ri} style={{background:row.new?"rgba(255,102,0,0.04)":ri%2===0?"#0a0f17":"#0d1420"}}>{row.cells.map((cell,ci)=><td key={ci} style={{padding:"7px 10px",borderBottom:"1px solid rgba(255,255,255,0.03)",color:ci===0?"#dde5ef":ci===1?"#00ffc8":"#4e6070",background:ci===1?"rgba(0,255,200,0.04)":"transparent",fontFamily:ci===0?"inherit":"monospace",fontSize:ci===0?"12px":"11px",fontWeight:ci===1?700:400}}>{ci===0&&row.new?<>{cell}<New label={row.newLabel||"NEW"}/></>:cell}</td>)}</tr>)}</tbody>
    </table>
  </div>
);

const Section = ({num,name,badge,cols,rows}) => (
  <div style={{background:"#0a0f17",border:"1px solid rgba(255,255,255,0.055)",borderRadius:"8px",padding:"24px",marginBottom:"20px"}}>
    <div style={{display:"flex",alignItems:"baseline",gap:"12px",flexWrap:"wrap",marginBottom:"4px"}}>
      <span style={{fontFamily:"monospace",fontSize:"22px",color:"#00ffc8",fontWeight:900}}>{num}</span>
      <span style={{fontSize:"18px",color:"#dde5ef",fontWeight:700}}>{name}</span>
      <span style={{fontSize:"10px",color:"#4e6070",fontFamily:"monospace"}}>{badge}</span>
    </div>
    <Table cols={cols} rows={rows}/>
  </div>
);

const ComparePage = () => {
  useEffect(()=>{document.title="StreamPireX vs The Competition";},[]);

  const s = (cols,rows) => ({cols,rows});

  const sections = [
    s(["Feature","SPX","BandLab","Soundtrap","LANDR","Studio One","Suno"],[
      {cells:["Multi-track DAW in browser",<C/>,<C/>,<C/>,<X/>,<X/>,<X/>]},
      {cells:["WAM 2.0 plugin system",<C/>,<X/>,<X/>,<X/>,<X/>,<X/>],new:true,newLabel:"ONLY SPX"},
      {cells:["Voice-to-MIDI",<C/>,<X/>,<X/>,<X/>,<X/>,<X/>],new:true,newLabel:"ONLY SPX"},
      {cells:["Audio-to-MIDI",<C/>,<X/>,<X/>,<X/>,<X/>,<X/>],new:true,newLabel:"ONLY SPX"},
      {cells:["Mic simulator",<C/>,<X/>,<X/>,<X/>,<X/>,<X/>],new:true,newLabel:"ONLY SPX"},
      {cells:["Per-channel AI analysis",<C/>,<X/>,<X/>,<X/>,<X/>,<X/>],new:true,newLabel:"ONLY SPX"},
      {cells:["AI Mix Assistant",<C/>,<X/>,<X/>,<X/>,<X/>,<X/>]},
      {cells:["AI Mastering · 50 genre profiles",<C/>,<C/>,<X/>,<C/>,<X/>,<X/>]},
      {cells:["Real-time collab",<C/>,<C/>,<C/>,<X/>,<X/>,<X/>]},
      {cells:["90% revenue share",<C/>,<X/>,<X/>,<X/>,<X/>,<X/>]},
      {cells:["Price","INCL.","free","$5/mo","$11/mo","$10/mo","$8/mo"]},
    ]),
    s(["Feature","SPX","BandLab","MPC Beats","FL Web","Splice"],[
      {cells:["MPC-style sampler · 16 pads",<C/>,<C/>,<C/>,<C/>,<X/>]},
      {cells:["Step sequencer · 64 steps",<C/>,<C/>,<C/>,<C/>,<X/>]},
      {cells:["4-bus routing",<C/>,<X/>,<X/>,<X/>,<X/>]},
      {cells:["Per-pad AI stem separation",<C/>,<X/>,<X/>,<X/>,<X/>],new:true,newLabel:"ONLY SPX"},
      {cells:["Hum to Song (AI)",<C/>,<X/>,<X/>,<X/>,<X/>],new:true,newLabel:"ONLY SPX"},
      {cells:["Text to Song (AI)",<C/>,<X/>,<X/>,<X/>,<X/>],new:true,newLabel:"ONLY SPX"},
      {cells:["Beat licensing PDF auto-gen",<C/>,<X/>,<X/>,<X/>,<X/>],new:true,newLabel:"ONLY SPX"},
      {cells:["Beat store built-in",<C/>,<X/>,<X/>,<X/>,<X/>]},
      {cells:["Price","INCL.","free","free","free","$8/mo"]},
    ]),
    s(["Feature","SPX","CapCut","Descript","Runway","Adobe","DaVinci"],[
      {cells:["Multi-track timeline",<C/>,<C/>,<C/>,<P/>,<C/>,<C/>]},
      {cells:["Particle emitter",<C/>,<X/>,<X/>,<X/>,<P/>,<C/>]},
      {cells:["AI background removal",<C/>,<C/>,<X/>,<C/>,<C/>,<C/>]},
      {cells:["Auto-captions (AI)",<C/>,<C/>,<C/>,<X/>,<C/>,<X/>]},
      {cells:["AI video gen · text→video",<C/>,<C/>,<X/>,<C/>,<X/>,<X/>]},
      {cells:["Stem-aware audio editing",<C/>,<X/>,<C/>,<X/>,<X/>,<X/>]},
      {cells:["Shareable 60s clip creation",<C/>,<C/>,<X/>,<X/>,<X/>,<X/>],new:true},
      {cells:["Embeddable player widget",<C/>,<X/>,<C/>,<X/>,<X/>,<X/>],new:true},
      {cells:["Monetization built-in",<C/>,<X/>,<X/>,<X/>,<X/>,<X/>]},
      {cells:["Price","INCL.","free/$","free/$","$76/mo","$55/mo","free/$"]},
    ]),
    s(["Feature","SPX","BandLab","LANDR","CapCut","Descript","Runway"],[
      {cells:["AI mastering · 50 genre profiles",<C/>,<C/>,<C/>,<X/>,<X/>,<X/>]},
      {cells:["AI stem separation — FREE",<C/>,<X/>,<P/>,<X/>,<P/>,<X/>]},
      {cells:["AI Radio DJ · 7 personas",<C/>,<X/>,<X/>,<X/>,<X/>,<X/>],new:true,newLabel:"ONLY SPX"},
      {cells:["AI Voice Clone",<C/>,<X/>,<X/>,<X/>,<X/>,<X/>]},
      {cells:["Voice to MIDI",<C/>,<X/>,<X/>,<X/>,<X/>,<X/>]},
      {cells:["Audio to MIDI",<C/>,<X/>,<X/>,<X/>,<X/>,<X/>]},
      {cells:["AI song / beat generation",<C/>,<X/>,<X/>,<X/>,<X/>,<X/>]},
      {cells:["AI video generation",<C/>,<X/>,<X/>,<C/>,<X/>,<C/>]},
      {cells:["EPK AI commercial generator",<C/>,<X/>,<X/>,<X/>,<X/>,<P/>]},
      {cells:["Credits-based AI billing",<C/>,<X/>,<X/>,<P/>,<X/>,<P/>]},
    ]),
    s(["Feature","SPX","BandLab","DistroKid","Patreon","Beatstars","Twitch","Spotify"],[
      {cells:["Music distribution · 150+ DSPs",<C/>,<C/>,<C/>,<X/>,<X/>,<X/>,<X/>]},
      {cells:["90% revenue share",<C/>,<X/>,<P/>,<X/>,<P/>,<X/>,<X/>]},
      {cells:["Beat store",<C/>,<X/>,<X/>,<X/>,<C/>,<X/>,<X/>]},
      {cells:["Beat licensing PDF",<C/>,<X/>,<X/>,<X/>,<P/>,<X/>,<X/>],new:true},
      {cells:["Fan subscription tiers",<C/>,<X/>,<X/>,<C/>,<X/>,<P/>,<X/>],new:true},
      {cells:["Collab request feed",<C/>,<C/>,<X/>,<X/>,<X/>,<X/>,<X/>],new:true},
      {cells:["Live streaming",<C/>,<C/>,<X/>,<X/>,<X/>,<C/>,<X/>]},
      {cells:["Podcast hosting + RSS",<C/>,<X/>,<X/>,<X/>,<X/>,<X/>,<P/>]},
      {cells:["24/7 AI Radio station",<C/>,<X/>,<X/>,<X/>,<X/>,<X/>,<X/>]},
      {cells:["EPK builder",<C/>,<X/>,<X/>,<X/>,<X/>,<X/>,<X/>]},
      {cells:["Fan tipping",<C/>,<C/>,<X/>,<C/>,<X/>,<C/>,<X/>]},
      {cells:["DAW + Video + Beat Maker",<span style={{color:"#00ffc8",fontWeight:700}}>ALL 3</span>,<X/>,<X/>,<X/>,<X/>,<X/>,<X/>],new:true,newLabel:"ONLY SPX"},
    ]),
    s(["Feature","SPX","Live365","Shoutcast","RadioKing","Zeno.FM","Mixcloud","Spreaker"],[
      {cells:["24/7 broadcast hosting",<C/>,<C/>,<C/>,<C/>,<C/>,<C/>,<C/>]},
      {cells:["AI DJ · 7 personas",<C/>,<X/>,<X/>,<X/>,<X/>,<X/>,<X/>],new:true,newLabel:"ONLY SPX"},
      {cells:["Voice clone as station DJ",<C/>,<X/>,<X/>,<X/>,<X/>,<X/>,<X/>],new:true,newLabel:"ONLY SPX"},
      {cells:["AI song intro narration",<C/>,<X/>,<X/>,<X/>,<X/>,<X/>,<X/>],new:true,newLabel:"ONLY SPX"},
      {cells:["AI station ID automation",<C/>,<X/>,<X/>,<X/>,<X/>,<X/>,<X/>],new:true,newLabel:"ONLY SPX"},
      {cells:["AI reads requests on air",<C/>,<X/>,<X/>,<X/>,<X/>,<X/>,<X/>],new:true,newLabel:"ONLY SPX"},
      {cells:["Fan shoutout automation",<C/>,<X/>,<X/>,<X/>,<X/>,<X/>,<X/>],new:true,newLabel:"ONLY SPX"},
      {cells:["Fan tipping on station",<C/>,<X/>,<X/>,<X/>,<X/>,<X/>,<X/>]},
      {cells:["Record track → air same platform",<C/>,<X/>,<X/>,<X/>,<X/>,<X/>,<X/>]},
      {cells:["Listener discovery page",<C/>,<C/>,<C/>,<C/>,<C/>,<C/>,<C/>]},
      {cells:["Price","INCL.","$49+/mo","free/ltd","$39+/mo","free/ltd","$15+/mo","$20+/mo"]},
    ]),
    s(["Feature","SPX","Riverside.fm","Descript","Buzzsprout","Anchor/Spotify","Spreaker"],[
      {cells:["WAV / lossless recording",<C/>,<C/>,<C/>,<X/>,<X/>,<X/>]},
      {cells:["Remote guests WebRTC (up to 3)",<C/>,<C/>,<C/>,<X/>,<X/>,<P/>]},
      {cells:["Local 4K video per guest",<C/>,<C/>,<X/>,<X/>,<X/>,<X/>]},
      {cells:["AI transcription + text editing",<C/>,<X/>,<C/>,<X/>,<X/>,<X/>]},
      {cells:["Filler word / pause removal",<C/>,<X/>,<C/>,<X/>,<X/>,<X/>]},
      {cells:["Async guest recording link",<C/>,<C/>,<X/>,<X/>,<X/>,<X/>]},
      {cells:["Teleprompter overlay",<C/>,<X/>,<X/>,<X/>,<X/>,<X/>]},
      {cells:["Soundboard (8 slots)",<C/>,<X/>,<X/>,<X/>,<X/>,<P/>]},
      {cells:["Open in DAW after recording",<C/>,<X/>,<X/>,<X/>,<X/>,<X/>],new:true,newLabel:"ONLY SPX"},
      {cells:["AI Voice Clone intros/outros",<C/>,<X/>,<X/>,<X/>,<X/>,<X/>],new:true,newLabel:"ONLY SPX"},
      {cells:["90% revenue share",<C/>,<X/>,<X/>,<X/>,<X/>,<X/>]},
      {cells:["Price","INCL.","$15-$29/mo","$12-$24/mo","$12-$24/mo","free/ltd","$20+/mo"]},
    ]),
  ];

  const names = ["01 — Recording Studio DAW","02 — Sampler + Beat Maker","03 — Video Editor","04 — AI Tools Suite","05 — Monetization + Ecosystem","06 — Radio Station","07 — Podcast Studio"];
  const badges = ["vs BandLab · Soundtrap · LANDR · Studio One · Suno","vs BandLab · MPC Beats · FL Web · Splice","vs CapCut · Descript · Runway · Adobe · DaVinci","vs BandLab · LANDR · CapCut · Descript · Runway","vs BandLab · DistroKid · Patreon · Beatstars · Twitch · Spotify","vs Live365 · Shoutcast · RadioKing · Zeno.FM · Mixcloud · Spreaker","vs Riverside.fm · Descript · Buzzsprout · Anchor · Spreaker"];

  return (
    <div style={{background:"#05080d",minHeight:"100vh",color:"#dde5ef",fontFamily:"sans-serif",padding:"0 0 60px"}}>
      <div style={{background:"#0a0f17",borderBottom:"1px solid rgba(255,255,255,0.06)",padding:"40px",textAlign:"center",marginBottom:"32px"}}>
        <div style={{fontSize:"clamp(40px,8vw,80px)",fontWeight:900,letterSpacing:"4px",color:"#00ffc8",lineHeight:1}}>STREAMPIREX</div>
        <div style={{fontSize:"11px",color:"#4e6070",fontFamily:"monospace",letterSpacing:"2px",marginTop:"6px",marginBottom:"24px"}}>WHY WE WIN — PLATFORM COMPARISON</div>
        <div style={{display:"flex",justifyContent:"center",gap:"16px",flexWrap:"wrap",marginBottom:"20px"}}>
          {[["90%","Revenue Share"],["$19.99","Starting/mo"],["15+","Tools Replaced"],["150+","DSPs"]].map(([v,l])=>(
            <div key={l} style={{background:"rgba(0,255,200,0.06)",border:"1px solid rgba(0,255,200,0.15)",borderRadius:"8px",padding:"12px 20px",textAlign:"center"}}>
              <div style={{fontSize:"28px",fontWeight:900,color:"#00ffc8",lineHeight:1}}>{v}</div>
              <div style={{fontSize:"10px",color:"#4e6070",fontFamily:"monospace",marginTop:"4px"}}>{l}</div>
            </div>
          ))}
        </div>
        <Link to="/" style={{color:"#4e6070",fontSize:"11px",fontFamily:"monospace",textDecoration:"none"}}>← Back to StreamPireX</Link>
      </div>
      <div style={{maxWidth:"1200px",margin:"0 auto",padding:"0 20px"}}>
        {sections.map((sec,i)=><Section key={i} num={names[i].split(" — ")[0]} name={names[i].split(" — ")[1]} badge={badges[i]} cols={sec.cols} rows={sec.rows}/>)}
        <div style={{background:"linear-gradient(135deg,rgba(0,255,200,0.06),rgba(255,102,0,0.04))",border:"1px solid rgba(0,255,200,0.15)",borderRadius:"10px",padding:"32px 40px",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:"24px",marginTop:"8px"}}>
          <div style={{maxWidth:"600px"}}>
            <div style={{fontSize:"20px",fontWeight:700,color:"#dde5ef",marginBottom:"8px"}}>The <em style={{color:"#00ffc8"}}>only platform</em> combining DAW · Beat Maker · Video Editor · AI Suite · Distribution · Live Streaming · Podcast · 24/7 Radio · Fan Subscriptions · EPK · Gaming — under one roof.</div>
            <div style={{fontSize:"12px",color:"#4e6070"}}>Replace 15+ subscriptions costing $170–$350/mo. Keep 90% of everything you earn.</div>
          </div>
          <div style={{textAlign:"center"}}>
            <div style={{fontSize:"48px",fontWeight:900,color:"#00ffc8",lineHeight:1}}>$19.99<span style={{fontSize:"22px"}}>/mo</span></div>
            <div style={{fontSize:"10px",color:"#4e6070",fontFamily:"monospace",marginBottom:"12px"}}>Starter · Creator $34.99 · Pro $49.99</div>
            <Link to="/signup" style={{display:"inline-block",padding:"10px 24px",background:"#00ffc8",color:"#0d1117",borderRadius:"5px",fontWeight:700,fontSize:"13px",textDecoration:"none"}}>Get Started Free →</Link>
          </div>
        </div>
      </div>
      <div style={{textAlign:"center",marginTop:"24px",fontSize:"11px",color:"#4e6070",fontFamily:"monospace"}}>
        <span style={{color:"#00ffc8"}}>✓</span> Full &nbsp; <span style={{color:"#e09b30"}}>~</span> Partial &nbsp; — None
      </div>
    </div>
  );
};

export default ComparePage;
