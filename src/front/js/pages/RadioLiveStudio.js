// =============================================================================
// RadioLiveStudio.js — Live Broadcasting Studio for Radio Station Owners
// Features:
//   - Audio-only OR Video+Audio broadcast mode
//   - WebRTC peer broadcast (viewers connect via RadioLiveViewer)
//   - MediaRecorder → R2 recording with auto-upload on stop
//   - OBS/external encoder stream key display
//   - Live listener count + live chat
//   - VU meter for audio monitoring
// =============================================================================

import React, { useState, useRef, useEffect, useCallback } from "react";

const BACKEND = process.env.REACT_APP_BACKEND_URL || "";

// ── VU Meter ─────────────────────────────────────────────────────────────────
function VUMeter({ stream }) {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const analyserRef = useRef(null);

  useEffect(() => {
    if (!stream) return;
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const src = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    src.connect(analyser);
    analyserRef.current = analyser;

    const data = new Uint8Array(analyser.frequencyBinCount);
    const draw = () => {
      if (!canvasRef.current) return;
      analyser.getByteFrequencyData(data);
      const c = canvasRef.current.getContext("2d");
      const w = canvasRef.current.width;
      const h = canvasRef.current.height;
      c.clearRect(0, 0, w, h);
      const avg = data.reduce((a, b) => a + b, 0) / data.length;
      const level = avg / 255;
      const col = level > 0.8 ? "#ff4444" : level > 0.6 ? "#ffaa00" : "#00ffc8";
      c.fillStyle = col;
      c.fillRect(0, 0, w * level, h);
      rafRef.current = requestAnimationFrame(draw);
    };
    draw();
    return () => {
      cancelAnimationFrame(rafRef.current);
      ctx.close();
    };
  }, [stream]);

  return (
    <canvas
      ref={canvasRef}
      width={300}
      height={12}
      style={{ borderRadius: 4, background: "#0a1628", width: "100%", height: 12 }}
    />
  );
}

// ── Main Studio ───────────────────────────────────────────────────────────────
export default function RadioLiveStudio({ station, onClose, onGoLive }) {
  const [mode, setMode] = useState("audio"); // audio | video
  const [isLive, setIsLive] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [listenerCount, setListenerCount] = useState(0);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [streamKey, setStreamKey] = useState("");
  const [recordingChunks, setRecordingChunks] = useState([]);
  const [recordings, setRecordings] = useState([]);
  const [status, setStatus] = useState("Ready to broadcast");
  const [micDevices, setMicDevices] = useState([]);
  const [camDevices, setCamDevices] = useState([]);
  const [selectedMic, setSelectedMic] = useState("");
  const [selectedCam, setSelectedCam] = useState("");
  const [micGain, setMicGain] = useState(1.0);
  const [noiseSuppression, setNoiseSuppression] = useState(true);
  const [echoCancellation, setEchoCancellation] = useState(true);
  const [localStream, setLocalStream] = useState(null);
  const [peerConnections, setPeerConnections] = useState({});

  const localVideoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const wsRef = useRef(null);
  const token = localStorage.getItem("token") || sessionStorage.getItem("token");

  // ── Get devices ─────────────────────────────────────────────────────────────
  useEffect(() => {
    navigator.mediaDevices?.enumerateDevices().then(devices => {
      setMicDevices(devices.filter(d => d.kind === "audioinput"));
      setCamDevices(devices.filter(d => d.kind === "videoinput"));
    });
    fetchStreamKey();
  }, []);

  const fetchStreamKey = async () => {
    try {
      const r = await fetch(`${BACKEND}/api/radio/${station.id}/stream-key`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (r.ok) {
        const d = await r.json();
        setStreamKey(d.stream_key || `spx_${station.id}_${Date.now()}`);
      }
    } catch { setStreamKey(`spx_${station.id}_live`); }
  };

  // ── Get media stream ─────────────────────────────────────────────────────────
  const getStream = useCallback(async () => {
    const constraints = {
      audio: {
        deviceId: selectedMic ? { exact: selectedMic } : undefined,
        noiseSuppression,
        echoCancellation,
        autoGainControl: false,
      },
      video: mode === "video" ? {
        deviceId: selectedCam ? { exact: selectedCam } : undefined,
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 30 },
      } : false,
    };
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    setLocalStream(stream);
    if (localVideoRef.current) localVideoRef.current.srcObject = stream;
    return stream;
  }, [mode, selectedMic, selectedCam, noiseSuppression, echoCancellation]);

  // ── Start broadcast ──────────────────────────────────────────────────────────
  const startBroadcast = async () => {
    try {
      setStatus("Requesting media access...");
      const stream = await getStream();

      // Tell backend we're live
      await fetch(`${BACKEND}/api/radio/${station.id}/toggle-live`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ is_live: true, mode, stream_key: streamKey }),
      });

      // Open WebSocket signaling for WebRTC
      const wsUrl = BACKEND.replace("https://", "wss://").replace("http://", "ws://");
      const ws = new WebSocket(`${wsUrl}/ws/radio/${station.id}/broadcast`);
      wsRef.current = ws;

      ws.onopen = () => setStatus("🔴 LIVE — WebRTC signaling connected");
      ws.onmessage = async (e) => {
        const msg = JSON.parse(e.data);
        if (msg.type === "viewer_joined") handleViewerJoined(msg.viewer_id, stream, ws);
        if (msg.type === "answer") handleAnswer(msg.viewer_id, msg.sdp);
        if (msg.type === "ice_candidate") handleRemoteICE(msg.viewer_id, msg.candidate);
        if (msg.type === "viewer_count") setListenerCount(msg.count);
        if (msg.type === "chat") setChatMessages(p => [...p.slice(-99), msg]);
      };
      ws.onerror = () => setStatus("WebSocket error — using audio-only fallback");

      // Start elapsed timer
      let secs = 0;
      timerRef.current = setInterval(() => setElapsed(++secs), 1000);

      setIsLive(true);
      onGoLive?.(true);
      setStatus(`🔴 LIVE — ${mode === "video" ? "Video + Audio" : "Audio only"}`);
    } catch (err) {
      setStatus(`Error: ${err.message}`);
    }
  };

  // ── WebRTC: handle new viewer ────────────────────────────────────────────────
  const handleViewerJoined = async (viewerId, stream, ws) => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
    });

    stream.getTracks().forEach(t => pc.addTrack(t, stream));

    pc.onicecandidate = e => {
      if (e.candidate) {
        ws.send(JSON.stringify({ type: "ice_candidate", viewer_id: viewerId, candidate: e.candidate }));
      }
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    ws.send(JSON.stringify({ type: "offer", viewer_id: viewerId, sdp: offer }));

    setPeerConnections(prev => ({ ...prev, [viewerId]: pc }));
  };

  const handleAnswer = async (viewerId, sdp) => {
    const pc = peerConnections[viewerId];
    if (pc) await pc.setRemoteDescription(new RTCSessionDescription(sdp));
  };

  const handleRemoteICE = async (viewerId, candidate) => {
    const pc = peerConnections[viewerId];
    if (pc) await pc.addIceCandidate(new RTCIceCandidate(candidate));
  };

  // ── Stop broadcast ───────────────────────────────────────────────────────────
  const stopBroadcast = async () => {
    clearInterval(timerRef.current);
    wsRef.current?.close();
    localStream?.getTracks().forEach(t => t.stop());
    Object.values(peerConnections).forEach(pc => pc.close());
    setPeerConnections({});
    setLocalStream(null);
    setIsLive(false);
    setElapsed(0);

    await fetch(`${BACKEND}/api/radio/${station.id}/toggle-live`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ is_live: false }),
    });

    onGoLive?.(false);
    setStatus("Broadcast ended");
  };

  // ── Recording ────────────────────────────────────────────────────────────────
  const startRecording = async () => {
    const stream = localStream || await getStream();
    chunksRef.current = [];

    const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus" : "audio/webm";

    const mr = new MediaRecorder(stream, { mimeType });
    mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    mr.onstop = () => saveRecording(mimeType);
    mr.start(1000); // collect every 1s
    mediaRecorderRef.current = mr;
    setIsRecording(true);
    setStatus("⏺ Recording...");
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    setStatus("Recording saved");
  };

  const saveRecording = async (mimeType) => {
    const blob = new Blob(chunksRef.current, { type: mimeType });
    const filename = `${station.name}_${new Date().toISOString().slice(0,19)}.webm`;

    // Save locally for download
    const url = URL.createObjectURL(blob);
    setRecordings(prev => [...prev, { url, filename, size: blob.size, date: new Date() }]);

    // Upload to R2
    const formData = new FormData();
    formData.append("file", blob, filename);
    formData.append("station_id", station.id);
    formData.append("type", "recording");
    try {
      const r = await fetch(`${BACKEND}/api/radio/${station.id}/upload-recording`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (r.ok) setStatus(`✓ Recording uploaded: ${filename}`);
    } catch { setStatus("Recording saved locally (upload failed)"); }
  };

  // ── Chat ─────────────────────────────────────────────────────────────────────
  const sendChat = () => {
    if (!chatInput.trim() || !wsRef.current) return;
    wsRef.current.send(JSON.stringify({ type: "chat", message: chatInput, from: "host" }));
    setChatMessages(p => [...p, { from: "host", message: chatInput, time: new Date().toLocaleTimeString() }]);
    setChatInput("");
  };

  // ── Elapsed time formatter ───────────────────────────────────────────────────
  const fmtTime = s => `${String(Math.floor(s/3600)).padStart(2,"0")}:${String(Math.floor(s/60)%60).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;

  const S = {
    wrap: { display:"flex", flexDirection:"column", height:"100%", background:"#06060f", color:"#ccc", fontFamily:"JetBrains Mono,monospace", fontSize:12 },
    header: { display:"flex", alignItems:"center", gap:10, padding:"10px 16px", background:"#0a0a14", borderBottom:"1px solid #1a2a3a", flexShrink:0 },
    body: { flex:1, display:"flex", gap:0, overflow:"hidden" },
    left: { flex:1, display:"flex", flexDirection:"column", padding:12, gap:10, overflowY:"auto" },
    right: { width:260, borderLeft:"1px solid #1a2a3a", display:"flex", flexDirection:"column" },
    btn: (col="#00ffc8",sm=false) => ({ padding:sm?"4px 10px":"6px 14px", border:`1px solid ${col}44`, borderRadius:4, background:`${col}11`, color:col, cursor:"pointer", fontSize:sm?10:11, fontWeight:700, fontFamily:"inherit" }),
    sec: { background:"#0a0a14", border:"1px solid #1a2a3a", borderRadius:6, padding:10 },
    sl: { fontSize:9, color:"#5a7088", letterSpacing:1, textTransform:"uppercase", marginBottom:6 },
    select: { background:"#06060f", border:"1px solid #1a2a3a", borderRadius:3, color:"#ccc", padding:"4px 7px", fontSize:11, fontFamily:"inherit", width:"100%" },
    input: { background:"#06060f", border:"1px solid #1a2a3a", borderRadius:3, color:"#ccc", padding:"4px 7px", fontSize:11, fontFamily:"inherit", flex:1 },
  };

  return (
    <div style={S.wrap}>
      {/* Header */}
      <div style={S.header}>
        <span style={{ background:"#ff4444", color:"#fff", fontSize:9, fontWeight:800, padding:"2px 6px", borderRadius:3, animation: isLive?"pulse 1s infinite":"none" }}>
          {isLive ? "🔴 LIVE" : "📻"}
        </span>
        <span style={{ color:"#00ffc8", fontWeight:700 }}>{station?.name || "Radio Studio"}</span>
        {isLive && <span style={{ color:"#5a7088", fontSize:10 }}>{fmtTime(elapsed)}</span>}
        <span style={{ marginLeft:"auto", color:"#5a7088", fontSize:10 }}>👥 {listenerCount} listening</span>
        <button style={S.btn("#5a7088",true)} onClick={onClose}>✕</button>
      </div>

      <div style={S.body}>
        {/* Left — Controls */}
        <div style={S.left}>

          {/* Mode selector */}
          {!isLive && (
            <div style={S.sec}>
              <div style={S.sl}>Broadcast Mode</div>
              <div style={{ display:"flex", gap:6 }}>
                {[["audio","🎙 Audio Only"],["video","📹 Video + Audio"]].map(([m,l]) => (
                  <button key={m} onClick={() => setMode(m)} style={{
                    ...S.btn(mode===m?"#00ffc8":"#5a7088"),
                    flex:1, padding:"8px 0",
                  }}>{l}</button>
                ))}
              </div>
            </div>
          )}

          {/* Video preview */}
          {mode === "video" && (
            <div style={S.sec}>
              <div style={S.sl}>Camera Preview</div>
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                style={{ width:"100%", borderRadius:4, background:"#000", aspectRatio:"16/9", objectFit:"cover" }}
              />
            </div>
          )}

          {/* Audio meters */}
          {localStream && (
            <div style={S.sec}>
              <div style={S.sl}>Audio Level</div>
              <VUMeter stream={localStream} />
              <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:6 }}>
                <span style={{ color:"#5a7088", fontSize:10, width:60 }}>Gain</span>
                <input type="range" min={0} max={2} step={0.05} value={micGain}
                  onChange={e => setMicGain(Number(e.target.value))}
                  style={{ flex:1, accentColor:"#00ffc8" }} />
                <span style={{ color:"#00ffc8", fontSize:10, width:30 }}>{micGain.toFixed(2)}</span>
              </div>
            </div>
          )}

          {/* Device selection */}
          {!isLive && (
            <div style={S.sec}>
              <div style={S.sl}>Devices</div>
              <div style={{ marginBottom:6 }}>
                <div style={{ fontSize:10, color:"#5a7088", marginBottom:3 }}>Microphone</div>
                <select style={S.select} value={selectedMic} onChange={e => setSelectedMic(e.target.value)}>
                  <option value="">Default Microphone</option>
                  {micDevices.map(d => <option key={d.deviceId} value={d.deviceId}>{d.label||`Mic ${d.deviceId.slice(0,8)}`}</option>)}
                </select>
              </div>
              {mode === "video" && (
                <div style={{ marginBottom:6 }}>
                  <div style={{ fontSize:10, color:"#5a7088", marginBottom:3 }}>Camera</div>
                  <select style={S.select} value={selectedCam} onChange={e => setSelectedCam(e.target.value)}>
                    <option value="">Default Camera</option>
                    {camDevices.map(d => <option key={d.deviceId} value={d.deviceId}>{d.label||`Camera ${d.deviceId.slice(0,8)}`}</option>)}
                  </select>
                </div>
              )}
              <div style={{ display:"flex", gap:12 }}>
                {[["noiseSuppression",noiseSuppression,setNoiseSuppression,"Noise Suppression"],
                  ["echoCancellation",echoCancellation,setEchoCancellation,"Echo Cancellation"]].map(([k,v,s,l]) => (
                  <label key={k} style={{ display:"flex", alignItems:"center", gap:4, cursor:"pointer", fontSize:10, color:"#ccc" }}>
                    <input type="checkbox" checked={v} onChange={e => s(e.target.checked)} /> {l}
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* OBS / External encoder */}
          <div style={S.sec}>
            <div style={S.sl}>External Encoder (OBS / vMix)</div>
            <div style={{ fontSize:10, color:"#5a7088", marginBottom:6 }}>
              Stream to <span style={{ color:"#00ffc8" }}>rtmp://stream.streampirex.com/live</span> using your stream key:
            </div>
            <div style={{ display:"flex", gap:6, alignItems:"center" }}>
              <code style={{ flex:1, background:"#06060f", border:"1px solid #1a2a3a", borderRadius:3, padding:"5px 8px", fontSize:11, color:"#ffaa00", overflow:"hidden", textOverflow:"ellipsis" }}>
                {streamKey || "Loading..."}
              </code>
              <button style={S.btn("#5a7088",true)} onClick={() => navigator.clipboard?.writeText(streamKey)}>Copy</button>
              <button style={S.btn("#5a7088",true)} onClick={fetchStreamKey}>Regen</button>
            </div>
          </div>

          {/* Broadcast controls */}
          <div style={{ display:"flex", gap:8 }}>
            {!isLive ? (
              <button style={{ ...S.btn("#ff4444"), flex:1, padding:"10px 0", fontSize:13 }} onClick={startBroadcast}>
                🔴 Go Live
              </button>
            ) : (
              <button style={{ ...S.btn("#ff4444"), flex:1, padding:"10px 0", fontSize:13 }} onClick={stopBroadcast}>
                ⏹ End Broadcast
              </button>
            )}
            {!isRecording ? (
              <button style={{ ...S.btn("#ffaa00"), flex:1, padding:"10px 0", fontSize:13 }} onClick={startRecording}>
                ⏺ Record
              </button>
            ) : (
              <button style={{ ...S.btn("#ffaa00"), flex:1, padding:"10px 0", fontSize:13 }} onClick={stopRecording}>
                ⏹ Stop Recording
              </button>
            )}
          </div>

          {/* Status */}
          <div style={{ fontSize:10, color: isLive?"#ff4444": isRecording?"#ffaa00":"#5a7088", textAlign:"center" }}>
            {status}
          </div>

          {/* Recordings */}
          {recordings.length > 0 && (
            <div style={S.sec}>
              <div style={S.sl}>Recordings ({recordings.length})</div>
              {recordings.map((r, i) => (
                <div key={i} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6, fontSize:10 }}>
                  <span style={{ flex:1, color:"#ccc", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{r.filename}</span>
                  <span style={{ color:"#5a7088" }}>{(r.size/1024/1024).toFixed(1)}MB</span>
                  <a href={r.url} download={r.filename} style={{ color:"#00ffc8", textDecoration:"none" }}>↓ Save</a>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right — Chat */}
        <div style={S.right}>
          <div style={{ padding:"8px 10px", borderBottom:"1px solid #1a2a3a", fontSize:10, color:"#5a7088" }}>
            💬 Live Chat
          </div>
          <div style={{ flex:1, overflowY:"auto", padding:8, display:"flex", flexDirection:"column", gap:4 }}>
            {chatMessages.length === 0 && (
              <div style={{ color:"#5a7088", fontSize:10, textAlign:"center", marginTop:20 }}>
                Chat will appear here when you go live
              </div>
            )}
            {chatMessages.map((m, i) => (
              <div key={i} style={{ fontSize:10 }}>
                <span style={{ color: m.from==="host"?"#00ffc8":"#ffaa00", fontWeight:700 }}>{m.from==="host"?"[HOST]":m.from}: </span>
                <span style={{ color:"#ccc" }}>{m.message}</span>
              </div>
            ))}
          </div>
          <div style={{ padding:8, borderTop:"1px solid #1a2a3a", display:"flex", gap:6 }}>
            <input
              style={S.input}
              placeholder="Say something..."
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key==="Enter" && sendChat()}
            />
            <button style={S.btn("#00ffc8",true)} onClick={sendChat}>Send</button>
          </div>
        </div>
      </div>
    </div>
  );
}
