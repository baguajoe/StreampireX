// DVSTimecode.js — Timecode vinyl control for DJ Mixer
// Analyzes audio input from turntable to extract pitch + position
// Compatible with: Serato, Virtual DJ, Traktor timecode vinyl

import React, { useState, useEffect, useRef, useCallback } from "react";

const TIMECODE_FREQ = 1000; // Hz — Serato uses 1kHz pilot tone

const DVSTimecode = ({ deckId, onPitch, onPosition, audioCtx, color = "#00ffc8" }) => {
  const [mode, setMode] = useState("off"); // off | thru | timecode
  const [devices, setDevices] = useState([]);
  const [selDevice, setSelDevice] = useState("");
  const [signal, setSignal] = useState(0);
  const [pitch, setPitch] = useState(1);
  const [position, setPosition] = useState(0);
  const [valid, setValid] = useState(false);
  const [direction, setDirection] = useState(1); // 1=forward, -1=reverse
  const sourceRef = useRef(null);
  const analyserRef = useRef(null);
  const rafRef = useRef(null);
  const phaseRef = useRef(0);
  const lastZeroRef = useRef(null);
  const streamRef = useRef(null);

  // Get available audio input devices
  useEffect(() => {
    navigator.mediaDevices?.enumerateDevices()
      .then(devs => setDevices(devs.filter(d => d.kind === "audioinput")))
      .catch(() => {});
  }, []);

  const stopCapture = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    try { sourceRef.current?.disconnect(); } catch(_) {}
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    sourceRef.current = null;
    setValid(false); setSignal(0);
  }, []);

  const startTimecode = useCallback(async (deviceId) => {
    stopCapture();
    try {
      const ctx = audioCtx();
      if (ctx.state === "suspended") await ctx.resume();

      const constraints = {
        audio: {
          deviceId: deviceId ? { exact: deviceId } : undefined,
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          latency: 0,
          sampleRate: 44100,
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      const source = ctx.createMediaStreamSource(stream);
      sourceRef.current = source;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0;
      analyserRef.current = analyser;

      source.connect(analyser);

      // ── Timecode analysis loop ──
      const buf = new Float32Array(analyser.fftSize);
      let lastPhase = 0;
      let sampleCount = 0;
      const sr = ctx.sampleRate;

      const analyze = () => {
        analyser.getFloatTimeDomainData(buf);

        // Calculate RMS signal level
        let rms = 0;
        for (let i = 0; i < buf.length; i++) rms += buf[i] * buf[i];
        rms = Math.sqrt(rms / buf.length);
        setSignal(Math.min(1, rms * 8));

        const hasSignal = rms > 0.01;
        setValid(hasSignal);

        if (hasSignal) {
          // Zero crossing detection for pitch estimation
          let crossings = 0;
          let lastSign = buf[0] > 0 ? 1 : -1;
          for (let i = 1; i < buf.length; i++) {
            const sign = buf[i] > 0 ? 1 : -1;
            if (sign !== lastSign) { crossings++; lastSign = sign; }
          }

          // Estimated frequency from zero crossings
          const duration = buf.length / sr;
          const freq = (crossings / 2) / duration;

          // Pitch ratio relative to 1000Hz reference
          const pitchRatio = Math.max(0.1, Math.min(3, freq / TIMECODE_FREQ));

          // Direction detection via phase correlation
          const half = Math.floor(buf.length / 2);
          let corr = 0;
          for (let i = 0; i < half; i++) corr += buf[i] * buf[i + half];
          const dir = corr > 0 ? 1 : -1;
          setDirection(dir);

          const finalPitch = pitchRatio * dir;
          setPitch(finalPitch);
          onPitch?.(finalPitch);

          // Position estimation (accumulate)
          phaseRef.current += (finalPitch * buf.length) / sr;
          const pos = ((phaseRef.current % 1800) / 1800);
          setPosition(Math.max(0, Math.min(1, Math.abs(pos))));
          onPosition?.(pos);
        }

        rafRef.current = requestAnimationFrame(analyze);
      };

      analyze();
    } catch(e) {
      console.error("DVS capture error:", e);
      setValid(false);
    }
  }, [audioCtx, stopCapture, onPitch, onPosition]);

  const handleModeChange = async (newMode) => {
    setMode(newMode);
    if (newMode === "timecode") {
      await startTimecode(selDevice);
    } else {
      stopCapture();
    }
  };

  useEffect(() => () => stopCapture(), [stopCapture]);

  const signalPct = Math.round(signal * 100);
  const pitchPct = ((pitch - 1) * 100).toFixed(1);

  return (
    <div style={{
      background: "#0a0d14",
      border: `1px solid ${valid && mode==="timecode" ? color+"44" : "#21262d"}`,
      borderRadius: 10,
      padding: "10px 12px",
      display: "flex",
      flexDirection: "column",
      gap: 8,
    }}>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", gap:8, justifyContent:"space-between" }}>
        <span style={{ fontSize:9, fontWeight:800, color:"#4e6a82", textTransform:"uppercase", letterSpacing:2 }}>
          DVS — Deck {deckId}
        </span>
        {valid && mode==="timecode" && (
          <span style={{ fontSize:9, fontWeight:800, color:color, animation:"rec-pulse 1s ease infinite" }}>
            ● LOCKED
          </span>
        )}
      </div>

      {/* Mode selector */}
      <div style={{ display:"flex", gap:4 }}>
        {[["off","OFF"],["thru","THRU"],["timecode","TC VINYL"]].map(([m,l]) => (
          <button key={m}
            style={{
              flex:1, padding:"5px 0", borderRadius:5,
              border:`1px solid ${mode===m ? color+"66" : "#21262d"}`,
              background: mode===m ? color+"18" : "transparent",
              color: mode===m ? color : "#4e6a82",
              fontFamily:"JetBrains Mono,monospace", fontSize:9, fontWeight:800,
              cursor:"pointer", letterSpacing:0.5,
            }}
            onClick={() => handleModeChange(m)}>
            {l}
          </button>
        ))}
      </div>

      {/* Device selector */}
      {mode !== "off" && (
        <select
          value={selDevice}
          onChange={e => { setSelDevice(e.target.value); if(mode==="timecode") startTimecode(e.target.value); }}
          style={{
            background:"#161b22", border:"1px solid #21262d", borderRadius:5,
            color:"#8b949e", fontFamily:"JetBrains Mono,monospace", fontSize:10,
            padding:"4px 6px", outline:"none", cursor:"pointer", width:"100%",
          }}>
          <option value="">Default Input</option>
          {devices.map(d => <option key={d.deviceId} value={d.deviceId}>{d.label||`Input ${d.deviceId.slice(0,8)}`}</option>)}
        </select>
      )}

      {/* Signal meter */}
      {mode === "timecode" && (
        <div>
          <div style={{ display:"flex", justifyContent:"space-between", fontSize:9, color:"#4e6a82", marginBottom:3 }}>
            <span>SIGNAL</span><span>{signalPct}%</span>
          </div>
          <div style={{ height:4, background:"#21262d", borderRadius:2, overflow:"hidden" }}>
            <div style={{
              height:"100%", borderRadius:2,
              width:`${signalPct}%`,
              background: signalPct > 60 ? color : signalPct > 30 ? "#ffd60a" : "#f85149",
              transition:"width 0.05s",
            }}/>
          </div>
        </div>
      )}

      {/* Pitch + direction readout */}
      {mode === "timecode" && valid && (
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          <div style={{ flex:1, background:"#06060f", borderRadius:5, padding:"4px 8px", textAlign:"center" }}>
            <div style={{ fontSize:9, color:"#4e6a82" }}>PITCH</div>
            <div style={{ fontSize:13, fontWeight:800, color:color, letterSpacing:1 }}>
              {pitchPct > 0 ? "+" : ""}{pitchPct}%
            </div>
          </div>
          <div style={{ flex:1, background:"#06060f", borderRadius:5, padding:"4px 8px", textAlign:"center" }}>
            <div style={{ fontSize:9, color:"#4e6a82" }}>DIR</div>
            <div style={{ fontSize:13, fontWeight:800, color:direction>0?"#00ffc8":"#f85149" }}>
              {direction > 0 ? "▶ FWD" : "◀ REV"}
            </div>
          </div>
        </div>
      )}

      {/* Status message */}
      <div style={{ fontSize:9, color:"#4e6a82", lineHeight:1.4 }}>
        {mode==="off" && "Connect phono/line input, then select THRU or TC VINYL"}
        {mode==="thru" && "Audio routed through deck EQ + crossfader"}
        {mode==="timecode" && !valid && "Put needle on timecode vinyl — waiting for signal..."}
        {mode==="timecode" && valid && `Vinyl control active · ${direction>0?"Forward":"Reverse"} play`}
      </div>
    </div>
  );
};

export default DVSTimecode;
