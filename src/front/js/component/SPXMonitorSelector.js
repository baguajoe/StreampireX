import { useState } from "react";

// ─── ROOM DATA ───────────────────────────────────────────────────────────────
const ROOMS = [
  { id: "none",       name: "Bypass",        sub: "No Room",          color: "#1a2d45" },
  { id: "studio_a",   name: "Studio A",      sub: "Dry Control Room", color: "#2d4a1e" },
  { id: "abbey_road", name: "Abbey Road",    sub: "Studio 2 London",  color: "#1e2d4a" },
  { id: "power_sta",  name: "Power Station", sub: "NYC Loft",         color: "#3a2010" },
  { id: "electric",   name: "Electric Lady", sub: "Greenwich Village", color: "#2a1040" },
  { id: "mdm_studio", name: "MDM Studios",   sub: "Los Angeles",      color: "#101a20" },
];

// ─── CONSOLE DATA ─────────────────────────────────────────────────────────────
const CONSOLES = [
  { id: "none",       name: "Bypass",      era: "—",    color: "#1a2d45", accent: "#4a7090" },
  { id: "ssl4ke",     name: "SSL 4000E",   era: "1979", color: "#1a1200", accent: "#e8a020" },
  { id: "ssl4kg",     name: "SSL 4000G",   era: "1987", color: "#1a1400", accent: "#d4941c" },
  { id: "neve8078",   name: "Neve 8078",   era: "1972", color: "#0a0f1a", accent: "#4a9eff" },
  { id: "neve1073",   name: "Neve 1073",   era: "1970", color: "#080d18", accent: "#3a7acc" },
  { id: "api1604",    name: "API 1604",    era: "1971", color: "#060806", accent: "#00ffc8" },
  { id: "tridentA",   name: "Trident A",   era: "1969", color: "#0a0818", accent: "#a78bfa" },
  { id: "studer900",  name: "Studer A900", era: "1980", color: "#100808", accent: "#ff6b6b" },
  { id: "mciJH636",   name: "MCI JH-636",  era: "1974", color: "#0a0e0a", accent: "#ff8c42" },
  { id: "ssl9000",    name: "SSL 9000",    era: "1996", color: "#1a1500", accent: "#f0c040" },
  { id: "neve8068",   name: "Neve 8068",   era: "1971", color: "#080c16", accent: "#6ab0ff" },
  { id: "api2488",    name: "API 2488",    era: "1975", color: "#060a06", accent: "#00e5cc" },
  { id: "helios69",   name: "Helios T69",  era: "1969", color: "#0e0a04", accent: "#cc8844" },
  { id: "neveVR",     name: "Neve VR",     era: "1988", color: "#080e16", accent: "#5588cc" },
  { id: "emiTG",      name: "EMI TG12345", era: "1968", color: "#100808", accent: "#cc4444" },
  { id: "sslAWS",     name: "SSL AWS",     era: "2004", color: "#181600", accent: "#ddaa20" },
  { id: "amekAngela", name: "Amek Angela", era: "1992", color: "#0c0818", accent: "#9966ff" },
  { id: "harrison",   name: "Harrison 32", era: "1975", color: "#081014", accent: "#44aadd" },
  { id: "neve8014",   name: "Neve 8014",   era: "1964", color: "#060a0e", accent: "#2266aa" },
  { id: "sonyMXP",    name: "Sony MXP",    era: "1985", color: "#0a0a14", accent: "#aaaaff" },
  { id: "calrec",     name: "Calrec",      era: "1982", color: "#081008", accent: "#88ccaa" },
];

// ─── SVG ROOM ILLUSTRATIONS ───────────────────────────────────────────────────
function RoomSVG({ room, size = 160 }) {
  const h = size * 0.65;
  const c = room.color;

  if (room.id === "none") return (
    <svg width={size} height={h} viewBox={`0 0 ${size} ${h}`}>
      <rect width={size} height={h} fill="#06060f" />
      <text x={size/2} y={h/2+5} textAnchor="middle" fill="#2a4060" fontSize="11" fontFamily="monospace">BYPASS</text>
    </svg>
  );

  // Room floor/ceiling perspective lines
  const fl = size * 0.12, fr = size * 0.88, ft = h * 0.08, fb = h * 0.92;
  const vl = size * 0.28, vr = size * 0.72, vt = h * 0.18, vb = h * 0.82;

  const wallColor   = room.id === "abbey_road" ? "#1a2535" : room.id === "electric" ? "#1a0830" : room.id === "power_sta" ? "#2a1808" : room.id === "studio_a" ? "#1a2818" : room.id === "mdm_studio" ? "#0a1418" : "#111820";
  const floorColor  = room.id === "abbey_road" ? "#0d1520" : room.id === "electric" ? "#100620" : room.id === "power_sta" ? "#1a1008" : room.id === "studio_a" ? "#101808" : "#0a1014";
  const accentColor = room.color.replace("0a","22").replace("1e","44").replace("10","30");

  return (
    <svg width={size} height={h} viewBox={`0 0 ${size} ${h}`} style={{display:"block"}}>
      <defs>
        <radialGradient id={`ceil_${room.id}`} cx="50%" cy="20%">
          <stop offset="0%" stopColor={wallColor} stopOpacity="0.9"/>
          <stop offset="100%" stopColor="#050508" stopOpacity="1"/>
        </radialGradient>
        <radialGradient id={`floor_${room.id}`} cx="50%" cy="80%">
          <stop offset="0%" stopColor={floorColor} stopOpacity="0.8"/>
          <stop offset="100%" stopColor="#030305" stopOpacity="1"/>
        </radialGradient>
        <filter id={`glow_${room.id}`}>
          <feGaussianBlur stdDeviation="2" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>

      {/* Background */}
      <rect width={size} height={h} fill="#050508"/>

      {/* Back wall */}
      <polygon points={`${vl},${vt} ${vr},${vt} ${vr},${vb} ${vl},${vb}`} fill={`url(#ceil_${room.id})`}/>

      {/* Floor perspective */}
      <polygon points={`${fl},${fb} ${vl},${vb} ${vr},${vb} ${fr},${fb}`} fill={`url(#floor_${room.id})`}/>

      {/* Left wall */}
      <polygon points={`${fl},${ft} ${vl},${vt} ${vl},${vb} ${fl},${fb}`} fill={wallColor} opacity="0.6"/>

      {/* Right wall */}
      <polygon points={`${vr},${vt} ${fr},${ft} ${fr},${fb} ${vr},${vb}`} fill={wallColor} opacity="0.5"/>

      {/* Ceiling */}
      <polygon points={`${fl},${ft} ${vl},${vt} ${vr},${vt} ${fr},${ft}`} fill="#030306" opacity="0.9"/>

      {/* Acoustic panels on back wall */}
      {[0.3,0.5,0.7].map((x,i) => (
        <rect key={i} x={vl+(vr-vl)*x-8} y={vt+(vb-vt)*0.1} width={16} height={(vb-vt)*0.35}
          fill={i===1?"#1a1a2e":"#101020"} rx="1" opacity="0.8"
          stroke={room.color} strokeWidth="0.5" strokeOpacity="0.4"/>
      ))}

      {/* Mixing desk */}
      <rect x={size*0.22} y={h*0.52} width={size*0.56} height={h*0.22} rx="2" fill="#0d1420" stroke="#1a2d45" strokeWidth="0.5"/>
      {/* Faders on desk */}
      {Array.from({length:8}).map((_,i) => (
        <rect key={i} x={size*0.25+i*size*0.06} y={h*0.54} width={2} height={h*0.16} rx="1" fill="#1a2d45"/>
      ))}
      {/* Meter bridge */}
      <rect x={size*0.24} y={h*0.50} width={size*0.52} height={h*0.04} rx="1" fill="#0a1018" stroke="#1a2d45" strokeWidth="0.5"/>

      {/* Left monitor */}
      <rect x={size*0.12} y={h*0.30} width={size*0.13} height={size*0.17} rx="3" fill="#101828" stroke={room.color} strokeWidth="1"/>
      <ellipse cx={size*0.185} cy={h*0.37} rx={size*0.04} ry={size*0.05} fill="#1a2838" stroke={room.color} strokeWidth="0.8"/>
      <circle  cx={size*0.185} cy={h*0.45} r={size*0.015} fill={room.color} opacity="0.6" filter={`url(#glow_${room.id})`}/>

      {/* Right monitor */}
      <rect x={size*0.75} y={h*0.30} width={size*0.13} height={size*0.17} rx="3" fill="#101828" stroke={room.color} strokeWidth="1"/>
      <ellipse cx={size*0.815} cy={h*0.37} rx={size*0.04} ry={size*0.05} fill="#1a2838" stroke={room.color} strokeWidth="0.8"/>
      <circle  cx={size*0.815} cy={h*0.45} r={size*0.015} fill={room.color} opacity="0.6" filter={`url(#glow_${room.id})`}/>

      {/* Screen above desk */}
      <rect x={size*0.35} y={h*0.20} width={size*0.30} height={h*0.20} rx="2" fill="#050a14" stroke="#1a2d45" strokeWidth="1"/>
      <rect x={size*0.36} y={h*0.21} width={size*0.28} height={h*0.17} fill="#030810" rx="1"/>
      {/* Waveform on screen */}
      {Array.from({length:20}).map((_,i) => {
        const wh = (Math.sin(i*0.8)*0.3+0.3+Math.random()*0.2)*h*0.06;
        return <rect key={i} x={size*0.37+i*size*0.013} y={h*0.295-wh/2} width={size*0.01} height={wh} fill={room.color} opacity="0.7" rx="1"/>;
      })}

      {/* Ceiling lights */}
      {[0.35,0.5,0.65].map((x,i) => (
        <g key={i}>
          <circle cx={size*x} cy={h*0.06} r={3} fill="#ffe8aa" opacity="0.9"/>
          <circle cx={size*x} cy={h*0.06} r={8} fill="#ffe8aa" opacity="0.06" filter={`url(#glow_${room.id})`}/>
        </g>
      ))}

      {/* Room-specific details */}
      {room.id === "abbey_road" && (
        <text x={size*0.5} y={h*0.97} textAnchor="middle" fill="#2a4060" fontSize="6" fontFamily="monospace">LONDON</text>
      )}
      {room.id === "electric" && (
        <ellipse cx={size*0.5} cy={h*0.5} rx={size*0.45} ry={h*0.4} fill="none" stroke="#5500aa" strokeWidth="0.5" opacity="0.3"/>
      )}
    </svg>
  );
}

// ─── SVG CONSOLE FACEPLATE ────────────────────────────────────────────────────
function ConsoleSVG({ console: con, size = 160 }) {
  const h = size * 0.45;

  if (con.id === "none") return (
    <svg width={size} height={h} viewBox={`0 0 ${size} ${h}`}>
      <rect width={size} height={h} fill="#06060f" rx="3"/>
      <text x={size/2} y={h/2+4} textAnchor="middle" fill="#2a4060" fontSize="10" fontFamily="monospace">BYPASS</text>
    </svg>
  );

  const numStrips = Math.min(12, Math.max(6, Math.floor(size / 13)));
  const stripW    = (size * 0.82) / numStrips;
  const startX    = size * 0.09;

  return (
    <svg width={size} height={h} viewBox={`0 0 ${size} ${h}`} style={{display:"block"}}>
      <defs>
        <linearGradient id={`body_${con.id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={con.color} stopOpacity="1"/>
          <stop offset="100%" stopColor="#030305" stopOpacity="1"/>
        </linearGradient>
        <filter id={`cglow_${con.id}`}>
          <feGaussianBlur stdDeviation="1.5" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>

      {/* Console body */}
      <rect width={size} height={h} rx="3" fill={`url(#body_${con.id})`}/>
      <rect width={size} height={h} rx="3" fill="none" stroke={con.accent} strokeWidth="0.8" strokeOpacity="0.4"/>

      {/* Top rail */}
      <rect x={0} y={0} width={size} height={h*0.1} rx="3" fill={con.accent} opacity="0.15"/>
      <rect x={4} y={h*0.03} width={size-8} height={h*0.04} rx="1" fill={con.accent} opacity="0.3"/>

      {/* Channel strips */}
      {Array.from({length: numStrips}).map((_, i) => {
        const x = startX + i * stripW;
        const isActive = i === Math.floor(numStrips/2);
        return (
          <g key={i}>
            {/* Strip background */}
            <rect x={x} y={h*0.12} width={stripW-1} height={h*0.82} rx="1"
              fill={isActive ? con.accent+"18" : "#00000030"}
              stroke={con.accent} strokeWidth={isActive ? "0.8" : "0.3"} strokeOpacity={isActive ? "0.6" : "0.2"}/>
            {/* Fader */}
            <rect x={x+stripW*0.3} y={h*0.18} width={stripW*0.4} height={h*0.5} rx="1" fill="#050810" stroke={con.accent} strokeWidth="0.3" strokeOpacity="0.4"/>
            <rect x={x+stripW*0.2} y={h*0.40} width={stripW*0.6} height={h*0.08} rx="1"
              fill={isActive ? con.accent : "#1a2d45"} opacity={isActive ? 0.9 : 0.6}/>
            {/* Knobs */}
            {[0.22, 0.72].map((ky, ki) => (
              <circle key={ki} cx={x+stripW*0.5} cy={h*ky} r={stripW*0.22}
                fill="#0a1018" stroke={con.accent} strokeWidth="0.5" strokeOpacity="0.5"/>
            ))}
            {/* Button row */}
            <rect x={x+stripW*0.15} y={h*0.82} width={stripW*0.3} height={h*0.06} rx="0.5"
              fill={isActive ? con.accent : "#0a1018"} opacity={isActive ? 0.9 : 0.5}/>
            <rect x={x+stripW*0.55} y={h*0.82} width={stripW*0.3} height={h*0.06} rx="0.5"
              fill="#0a1018" stroke={con.accent} strokeWidth="0.4" strokeOpacity="0.4"/>
          </g>
        );
      })}

      {/* Master section */}
      <rect x={size*0.86} y={h*0.12} width={size*0.10} height={h*0.82} rx="2"
        fill={con.accent+"20"} stroke={con.accent} strokeWidth="0.8" strokeOpacity="0.5"/>
      <circle cx={size*0.91} cy={h*0.3}  r={size*0.025} fill={con.accent} opacity="0.8" filter={`url(#cglow_${con.id})`}/>
      <circle cx={size*0.91} cy={h*0.5}  r={size*0.025} fill={con.accent} opacity="0.5"/>
      <rect   x={size*0.875} y={h*0.65} width={size*0.07} height={h*0.22} rx="1" fill="#050810" stroke={con.accent} strokeWidth="0.4" strokeOpacity="0.4"/>
      <rect   x={size*0.862} y={h*0.72} width={size*0.096} height={h*0.06} rx="1" fill={con.accent} opacity="0.7"/>

      {/* Era badge */}
      <rect x={2} y={h*0.88} width={28} height={h*0.10} rx="1" fill={con.accent} opacity="0.15"/>
      <text x={16} y={h*0.965} textAnchor="middle" fill={con.accent} fontSize="5.5" fontFamily="monospace" opacity="0.9">{con.era}</text>
    </svg>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function SPXMonitorSelector({
  selectedRoom    = "none",
  selectedConsole = "none",
  onRoomChange    = () => {},
  onConsoleChange = () => {},
  onClose         = () => {},
}) {
  const [tab, setTab]         = useState("rooms");
  const [hovRoom, setHovRoom] = useState(null);
  const [hovCon,  setHovCon]  = useState(null);

  const activeRoom    = ROOMS.find(r => r.id === selectedRoom)    || ROOMS[0];
  const activeConsole = CONSOLES.find(c => c.id === selectedConsole) || CONSOLES[0];

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "rgba(3,4,8,0.92)", backdropFilter: "blur(8px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'Share Tech Mono', monospace",
    }}>
      <div style={{
        width: "min(96vw, 900px)", maxHeight: "90vh",
        background: "#06060f", border: "1px solid #1a2d45",
        borderRadius: "8px", overflow: "hidden",
        boxShadow: "0 0 60px #00ffc820, 0 0 120px #00000080",
        display: "flex", flexDirection: "column",
      }}>

        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", gap: 12,
          padding: "14px 20px", borderBottom: "1px solid #1a2d45",
          background: "#080810",
        }}>
          <span style={{fontSize:"0.55rem", letterSpacing:"0.25em", color:"#00ffc8", textTransform:"uppercase", fontWeight:700}}>
            SPX MONITOR CONTROL
          </span>
          <div style={{flex:1}}/>
          {/* Tabs */}
          {["rooms","consoles"].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              fontFamily:"inherit", fontSize:"0.58rem", letterSpacing:"0.15em",
              textTransform:"uppercase", padding:"5px 16px",
              background: tab===t ? "#00ffc815" : "transparent",
              border: `1px solid ${tab===t ? "#00ffc8" : "#1a2d45"}`,
              color: tab===t ? "#00ffc8" : "#4a7090",
              borderRadius:"3px", cursor:"pointer", transition:"all 0.15s",
            }}>
              {t === "rooms" ? "🏛 ROOMS" : "🎛 CONSOLES"}
            </button>
          ))}
          <div style={{flex:1}}/>
          <button onClick={onClose} style={{
            background:"transparent", border:"1px solid #ff3b5c44",
            color:"#ff3b5c88", fontFamily:"inherit", fontSize:"0.7rem",
            padding:"4px 10px", borderRadius:"3px", cursor:"pointer",
          }}>✕</button>
        </div>

        {/* Status bar */}
        <div style={{
          display:"flex", gap:24, padding:"8px 20px",
          background:"#04040a", borderBottom:"1px solid #0d1826",
          fontSize:"0.55rem", letterSpacing:"0.1em",
        }}>
          <span style={{color:"#2a4060"}}>ROOM</span>
          <span style={{color:"#00ffc8"}}>{activeRoom.name}</span>
          <span style={{color:"#2a4060", marginLeft:12}}>CONSOLE</span>
          <span style={{color:"#FF6600"}}>{activeConsole.name}</span>
          <span style={{color:"#2a4060", marginLeft:"auto"}}>
            {tab==="rooms" ? `${ROOMS.length} ENVIRONMENTS` : `${CONSOLES.length} CONSOLES`}
          </span>
        </div>

        {/* Grid */}
        <div style={{
          flex:1, overflowY:"auto", padding:"16px 20px",
          display:"grid",
          gridTemplateColumns: tab==="rooms"
            ? "repeat(auto-fill, minmax(200px, 1fr))"
            : "repeat(auto-fill, minmax(180px, 1fr))",
          gap:12,
          scrollbarWidth:"thin", scrollbarColor:"#1a2d45 transparent",
        }}>
          {tab === "rooms" && ROOMS.map(room => {
            const isSelected = room.id === selectedRoom;
            const isHovered  = hovRoom === room.id;
            return (
              <div key={room.id}
                onClick={() => onRoomChange(room.id)}
                onMouseEnter={() => setHovRoom(room.id)}
                onMouseLeave={() => setHovRoom(null)}
                style={{
                  cursor:"pointer", borderRadius:"6px", overflow:"hidden",
                  border: isSelected
                    ? `2px solid ${room.id==="none"?"#4a7090":room.color.replace("0a","44").replace("1e","66").replace("10","44")}`
                    : `1px solid ${isHovered ? "#2a4060" : "#0d1826"}`,
                  background: isSelected ? "#0a1018" : "#06060f",
                  transform: isHovered ? "translateY(-2px)" : "none",
                  transition:"all 0.15s",
                  boxShadow: isSelected ? `0 0 20px ${room.color}40` : "none",
                }}
              >
                <div style={{position:"relative"}}>
                  <RoomSVG room={room} size={220}/>
                  {isSelected && (
                    <div style={{
                      position:"absolute", top:6, right:6,
                      background:"#00ffc8", color:"#000", fontSize:"0.5rem",
                      fontFamily:"monospace", padding:"2px 6px", borderRadius:"2px",
                      fontWeight:700, letterSpacing:"0.1em",
                    }}>ACTIVE</div>
                  )}
                </div>
                <div style={{padding:"10px 12px", background:"#08080f"}}>
                  <div style={{fontSize:"0.68rem", color:"#ffffff", fontWeight:700, letterSpacing:"0.05em"}}>{room.name}</div>
                  <div style={{fontSize:"0.55rem", color:"#4a7090", marginTop:2, letterSpacing:"0.05em"}}>{room.sub}</div>
                </div>
              </div>
            );
          })}

          {tab === "consoles" && CONSOLES.map(con => {
            const isSelected = con.id === selectedConsole;
            const isHovered  = hovCon === con.id;
            return (
              <div key={con.id}
                onClick={() => onConsoleChange(con.id)}
                onMouseEnter={() => setHovCon(con.id)}
                onMouseLeave={() => setHovCon(null)}
                style={{
                  cursor:"pointer", borderRadius:"6px", overflow:"hidden",
                  border: isSelected
                    ? `2px solid ${con.accent}`
                    : `1px solid ${isHovered ? "#1a2d45" : "#0d1826"}`,
                  background: isSelected ? "#08080f" : "#06060f",
                  transform: isHovered ? "translateY(-2px)" : "none",
                  transition:"all 0.15s",
                  boxShadow: isSelected ? `0 0 20px ${con.accent}40` : "none",
                }}
              >
                <div style={{position:"relative"}}>
                  <ConsoleSVG console={con} size={200}/>
                  {isSelected && (
                    <div style={{
                      position:"absolute", top:5, right:5,
                      background:con.accent, color:"#000", fontSize:"0.48rem",
                      fontFamily:"monospace", padding:"2px 5px", borderRadius:"2px",
                      fontWeight:700,
                    }}>ACTIVE</div>
                  )}
                </div>
                <div style={{padding:"8px 12px", background:"#04040a"}}>
                  <div style={{fontSize:"0.65rem", color:"#ffffff", fontWeight:700, letterSpacing:"0.05em"}}>{con.name}</div>
                  <div style={{fontSize:"0.52rem", color:con.accent, marginTop:2, opacity:0.7}}>{con.era}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{
          display:"flex", gap:12, padding:"12px 20px",
          borderTop:"1px solid #0d1826", background:"#04040a",
          alignItems:"center",
        }}>
          <span style={{fontSize:"0.55rem", color:"#2a4060", letterSpacing:"0.1em"}}>
            {tab==="rooms"
              ? "SELECT A ROOM ACOUSTIC ENVIRONMENT"
              : "SELECT AN ANALOG CONSOLE CHARACTER"}
          </span>
          <div style={{flex:1}}/>
          <button onClick={() => { onRoomChange("none"); onConsoleChange("none"); }} style={{
            fontFamily:"inherit", fontSize:"0.58rem", letterSpacing:"0.1em",
            padding:"5px 14px", background:"transparent",
            border:"1px solid #2a4060", color:"#4a7090",
            borderRadius:"3px", cursor:"pointer",
          }}>RESET ALL</button>
          <button onClick={onClose} style={{
            fontFamily:"inherit", fontSize:"0.58rem", letterSpacing:"0.1em",
            padding:"5px 20px", background:"#00ffc815",
            border:"1px solid #00ffc8", color:"#00ffc8",
            borderRadius:"3px", cursor:"pointer",
          }}>APPLY & CLOSE</button>
        </div>
      </div>
    </div>
  );
}
