// =============================================================================
// RadioLiveViewer.js — Live Stream Viewer (WebRTC + HLS fallback)
// Drop into RadioStationDetailPage when station.is_live === true
// =============================================================================

import React, { useState, useEffect, useRef, useCallback } from "react";

const BACKEND = process.env.REACT_APP_BACKEND_URL || "";

export default function RadioLiveViewer({ station, isOwner, onOpenStudio }) {
  const [connected, setConnected] = useState(false);
  const [mode, setMode] = useState("connecting"); // connecting | webrtc | hls | audio | error
  const [listenerCount, setListenerCount] = useState(0);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1.0);
  const [elapsed, setElapsed] = useState(0);
  const [quality, setQuality] = useState("auto");

  const videoRef = useRef(null);
  const audioRef = useRef(null);
  const pcRef = useRef(null);
  const wsRef = useRef(null);
  const timerRef = useRef(null);
  const token = localStorage.getItem("token") || sessionStorage.getItem("token");

  useEffect(() => {
    if (station?.is_live) connectToStream();
    return () => cleanup();
  }, [station?.id, station?.is_live]);

  const cleanup = () => {
    wsRef.current?.close();
    pcRef.current?.close();
    clearInterval(timerRef.current);
  };

  const connectToStream = useCallback(async () => {
    setMode("connecting");

    // Try WebRTC first
    try {
      const wsUrl = BACKEND.replace("https://","wss://").replace("http://","ws://");
      const ws = new WebSocket(`${wsUrl}/ws/radio/${station.id}/viewer`);
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(JSON.stringify({ type: "join", station_id: station.id }));
      };

      ws.onmessage = async (e) => {
        const msg = JSON.parse(e.data);
        switch (msg.type) {
          case "offer":
            await handleOffer(msg.sdp, ws);
            break;
          case "ice_candidate":
            await pcRef.current?.addIceCandidate(new RTCIceCandidate(msg.candidate));
            break;
          case "viewer_count":
            setListenerCount(msg.count);
            break;
          case "chat":
            setChatMessages(p => [...p.slice(-99), msg]);
            break;
          case "stream_ended":
            setMode("error");
            setConnected(false);
            break;
        }
      };

      ws.onerror = () => fallbackToHLS();
      ws.onclose = () => { if (mode === "connecting") fallbackToHLS(); };

    } catch { fallbackToHLS(); }
  }, [station]);

  const handleOffer = async (sdp, ws) => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
    });
    pcRef.current = pc;

    pc.ontrack = (e) => {
      const stream = e.streams[0];
      if (e.track.kind === "video" && videoRef.current) {
        videoRef.current.srcObject = stream;
        setMode("webrtc");
      } else if (e.track.kind === "audio" && audioRef.current) {
        audioRef.current.srcObject = stream;
        if (mode !== "webrtc") setMode("audio");
      }
      setConnected(true);
      startTimer();
    };

    pc.onicecandidate = (e) => {
      if (e.candidate) ws.send(JSON.stringify({ type: "ice_candidate", candidate: e.candidate }));
    };

    await pc.setRemoteDescription(new RTCSessionDescription(sdp));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    ws.send(JSON.stringify({ type: "answer", sdp: answer }));
  };

  const fallbackToHLS = () => {
    // Try stream_url (HLS / direct audio)
    if (station.stream_url) {
      if (audioRef.current) {
        audioRef.current.src = station.stream_url;
        audioRef.current.play().catch(() => {});
        setMode("audio");
        setConnected(true);
        startTimer();
      }
    } else {
      setMode("error");
    }
  };

  const startTimer = () => {
    let s = 0;
    timerRef.current = setInterval(() => setElapsed(++s), 1000);
  };

  const fmtTime = s => `${String(Math.floor(s/3600)).padStart(2,"0")}:${String(Math.floor(s/60)%60).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;

  const sendChat = () => {
    if (!chatInput.trim() || !wsRef.current) return;
    wsRef.current.send(JSON.stringify({ type: "chat", message: chatInput }));
    setChatInput("");
  };

  const S = {
    wrap: { background:"#06060f", border:"1px solid #1a2a3a", borderRadius:8, overflow:"hidden", fontFamily:"JetBrains Mono,monospace", fontSize:11 },
    header: { display:"flex", alignItems:"center", gap:8, padding:"8px 12px", background:"#0a0a14", borderBottom:"1px solid #1a2a3a" },
    body: { display:"flex", flexDirection:"column" },
    btn: (col="#00ffc8",sm=false) => ({ padding:sm?"3px 8px":"5px 12px", border:`1px solid ${col}44`, borderRadius:3, background:`${col}11`, color:col, cursor:"pointer", fontSize:sm?9:10, fontWeight:700, fontFamily:"inherit" }),
  };

  if (!station?.is_live) return null;

  return (
    <div style={S.wrap}>
      {/* Header */}
      <div style={S.header}>
        <span style={{ background:"#ff4444", color:"#fff", fontSize:8, fontWeight:800, padding:"2px 5px", borderRadius:2 }}>🔴 LIVE</span>
        <span style={{ color:"#00ffc8", fontWeight:700 }}>{station.name}</span>
        <span style={{ color:"#5a7088", fontSize:10 }}>{fmtTime(elapsed)}</span>
        <span style={{ color:"#5a7088", fontSize:10, marginLeft:"auto" }}>👥 {listenerCount}</span>
        {isOwner && (
          <button style={S.btn("#ff4444",true)} onClick={onOpenStudio}>🎙 Open Studio</button>
        )}
      </div>

      {/* Video */}
      {mode === "webrtc" && (
        <div style={{ position:"relative", background:"#000", aspectRatio:"16/9" }}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={muted}
            style={{ width:"100%", height:"100%", objectFit:"contain" }}
          />
          <div style={{ position:"absolute", bottom:8, left:8, right:8, display:"flex", alignItems:"center", gap:8 }}>
            <button style={S.btn(muted?"#ff4444":"#00ffc8",true)} onClick={() => setMuted(v => !v)}>
              {muted ? "🔇" : "🔊"}
            </button>
            <input type="range" min={0} max={1} step={0.05} value={volume}
              onChange={e => { setVolume(Number(e.target.value)); if(videoRef.current) videoRef.current.volume = Number(e.target.value); }}
              style={{ flex:1, accentColor:"#00ffc8" }} />
            <span style={{ background:"#ff444488", color:"#fff", fontSize:8, padding:"2px 5px", borderRadius:2, fontWeight:700 }}>LIVE</span>
          </div>
        </div>
      )}

      {/* Audio only */}
      {(mode === "audio" || mode === "connecting") && (
        <div style={{ padding:20, background:"#000", display:"flex", flexDirection:"column", alignItems:"center", gap:10, minHeight:120 }}>
          <div style={{ fontSize:32 }}>📻</div>
          <div style={{ color:"#00ffc8", fontWeight:700, fontSize:12 }}>
            {mode === "connecting" ? "Connecting..." : "Live Audio Broadcast"}
          </div>
          {mode === "audio" && (
            <div style={{ display:"flex", alignItems:"center", gap:8, width:"100%", maxWidth:300 }}>
              <button style={S.btn(muted?"#ff4444":"#00ffc8",true)} onClick={() => { setMuted(v=>!v); if(audioRef.current) audioRef.current.muted = !muted; }}>
                {muted ? "🔇" : "🔊"}
              </button>
              <input type="range" min={0} max={1} step={0.05} value={volume}
                onChange={e => { setVolume(Number(e.target.value)); if(audioRef.current) audioRef.current.volume = Number(e.target.value); }}
                style={{ flex:1, accentColor:"#00ffc8" }} />
            </div>
          )}
        </div>
      )}

      {mode === "error" && (
        <div style={{ padding:20, textAlign:"center", color:"#5a7088" }}>
          Stream unavailable. The broadcast may have ended.
          <br /><button style={{ ...S.btn("#00ffc8"), marginTop:8 }} onClick={connectToStream}>↻ Retry</button>
        </div>
      )}

      {/* Hidden audio element */}
      <audio ref={audioRef} autoPlay muted={muted} style={{ display:"none" }} />

      {/* Chat */}
      {connected && (
        <div style={{ borderTop:"1px solid #1a2a3a" }}>
          <div style={{ maxHeight:120, overflowY:"auto", padding:8, display:"flex", flexDirection:"column", gap:3 }}>
            {chatMessages.map((m, i) => (
              <div key={i} style={{ fontSize:10 }}>
                <span style={{ color:"#ffaa00", fontWeight:700 }}>{m.from || "listener"}: </span>
                <span style={{ color:"#ccc" }}>{m.message}</span>
              </div>
            ))}
          </div>
          <div style={{ padding:8, borderTop:"1px solid #0a1628", display:"flex", gap:6 }}>
            <input
              style={{ flex:1, background:"#06060f", border:"1px solid #1a2a3a", borderRadius:3, color:"#ccc", padding:"4px 7px", fontSize:11, fontFamily:"inherit" }}
              placeholder="Send a message..."
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key==="Enter" && sendChat()}
            />
            <button style={S.btn("#00ffc8",true)} onClick={sendChat}>→</button>
          </div>
        </div>
      )}
    </div>
  );
}
