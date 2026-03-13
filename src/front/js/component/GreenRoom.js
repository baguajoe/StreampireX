// =============================================================================
// GreenRoom.js — Pre-Show Lobby for Podcast Guests
// =============================================================================
// Location: src/front/js/component/GreenRoom.js
// Usage: <GreenRoom user={user} sessionId={sessionId} inviteCode={inviteCode}
//               onReady={fn} onLeave={fn} localStream={stream} />
// =============================================================================

import React, { useState, useEffect, useRef, useCallback } from "react";

const GreenRoom = ({ user, sessionId, inviteCode, onReady, onLeave, localStream }) => {
  const [micLevel, setMicLevel] = useState(0);
  const [camOn, setCamOn] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [testingMic, setTestingMic] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [audioDevices, setAudioDevices] = useState([]);
  const [videoDevices, setVideoDevices] = useState([]);
  const [selectedMic, setSelectedMic] = useState("default");
  const [selectedCam, setSelectedCam] = useState("");
  const [qualityChecks, setQualityChecks] = useState({ mic: null, browser: null, connection: null });
  const [displayName, setDisplayName] = useState(user?.username || "");
  const [role, setRole] = useState("guest"); // guest | host

  const videoRef = useRef(null);
  const animRef = useRef(null);
  const analyserRef = useRef(null);
  const audioCtxRef = useRef(null);

  // ── Enumerate devices ──
  useEffect(() => {
    navigator.mediaDevices.enumerateDevices().then((devices) => {
      setAudioDevices(devices.filter((d) => d.kind === "audioinput"));
      setVideoDevices(devices.filter((d) => d.kind === "videoinput"));
    });
    runQualityChecks();
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      if (cameraStream) cameraStream.getTracks().forEach((t) => t.stop());
      if (audioCtxRef.current) audioCtxRef.current.close();
    };
  }, []);

  // ── Mic level meter ──
  useEffect(() => {
    if (!localStream) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      audioCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(localStream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;
      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        setMicLevel(Math.min(avg / 128, 1));
        animRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch (e) {}
  }, [localStream]);

  // ── Quality checks ──
  const runQualityChecks = async () => {
    // Browser check
    const browserOk = !!(navigator.mediaDevices && window.MediaRecorder && window.RTCPeerConnection);
    // Mic check
    let micOk = false;
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      micOk = true;
      s.getTracks().forEach((t) => t.stop());
    } catch (e) {}
    // Connection check (just navigator.onLine)
    const connOk = navigator.onLine;
    setQualityChecks({ mic: micOk, browser: browserOk, connection: connOk });
  };

  // ── Toggle camera ──
  const toggleCamera = useCallback(async () => {
    if (camOn) {
      if (cameraStream) cameraStream.getTracks().forEach((t) => t.stop());
      setCameraStream(null);
      setCamOn(false);
      if (videoRef.current) videoRef.current.srcObject = null;
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { deviceId: selectedCam ? { exact: selectedCam } : undefined, width: 1280, height: 720 },
        });
        setCameraStream(stream);
        setCamOn(true);
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch (e) {}
    }
  }, [camOn, cameraStream, selectedCam]);

  const handleReady = () => {
    onReady && onReady({ displayName, role, camOn, micOn });
  };

  const micPct = Math.round(micLevel * 100);
  const micColor = micPct > 80 ? "#ff4444" : micPct > 50 ? "#FF6600" : "#00ffc8";

  return (
    <div style={styles.overlay}>
      <div style={styles.card}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <div style={styles.dot} />
            <span style={styles.headerTitle}>🟢 Green Room</span>
          </div>
          <span style={styles.headerSub}>Get ready before joining the studio</span>
        </div>

        {/* Main content */}
        <div style={styles.content}>
          {/* Video preview */}
          <div style={styles.previewWrap}>
            <div style={styles.preview}>
              {camOn ? (
                <video ref={videoRef} autoPlay muted playsInline style={styles.previewVideo} />
              ) : (
                <div style={styles.previewAvatar}>
                  <div style={styles.avatarCircle}>
                    {(displayName || "?")[0].toUpperCase()}
                  </div>
                  <span style={styles.avatarLabel}>Camera off</span>
                </div>
              )}
              {/* Mic level bar */}
              <div style={styles.micBar}>
                <div style={{ ...styles.micFill, height: `${micPct}%`, background: micColor }} />
              </div>
              {/* Recording indicator */}
              <div style={styles.previewBadge}>🎙️ Preview</div>
            </div>

            {/* Toggles */}
            <div style={styles.toggleRow}>
              <button
                style={{ ...styles.toggleBtn, ...(micOn ? styles.toggleActive : {}) }}
                onClick={() => setMicOn(!micOn)}
              >
                {micOn ? "🎙️ Mic On" : "🔇 Mic Off"}
              </button>
              <button
                style={{ ...styles.toggleBtn, ...(camOn ? styles.toggleActive : {}) }}
                onClick={toggleCamera}
              >
                {camOn ? "📹 Cam On" : "📷 Cam Off"}
              </button>
            </div>
          </div>

          {/* Controls */}
          <div style={styles.controls}>
            {/* Display name */}
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Your Name</label>
              <input
                style={styles.input}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="How should we call you?"
              />
            </div>

            {/* Role */}
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Joining as</label>
              <div style={styles.roleRow}>
                {["host", "guest", "co-host"].map((r) => (
                  <button
                    key={r}
                    style={{ ...styles.rolePill, ...(role === r ? styles.rolePillActive : {}) }}
                    onClick={() => setRole(r)}
                  >
                    {r === "host" ? "👑" : r === "co-host" ? "🎤" : "🎧"} {r}
                  </button>
                ))}
              </div>
            </div>

            {/* Mic select */}
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Microphone</label>
              <select style={styles.select} value={selectedMic} onChange={(e) => setSelectedMic(e.target.value)}>
                <option value="default">Default Microphone</option>
                {audioDevices.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>{d.label || `Mic ${d.deviceId.slice(0, 6)}`}</option>
                ))}
              </select>
            </div>

            {/* Camera select */}
            {videoDevices.length > 0 && (
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Camera</label>
                <select style={styles.select} value={selectedCam} onChange={(e) => setSelectedCam(e.target.value)}>
                  <option value="">Default Camera</option>
                  {videoDevices.map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>{d.label || `Camera ${d.deviceId.slice(0, 6)}`}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Mic level */}
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Mic Level</label>
              <div style={styles.levelBar}>
                <div style={{ ...styles.levelFill, width: `${micPct}%`, background: micColor }} />
              </div>
              <span style={styles.levelLabel}>{micPct}%</span>
            </div>

            {/* Quality checks */}
            <div style={styles.checks}>
              {[
                { key: "mic", label: "Microphone access" },
                { key: "browser", label: "Browser compatible" },
                { key: "connection", label: "Internet connected" },
              ].map(({ key, label }) => (
                <div key={key} style={styles.checkRow}>
                  <span style={{
                    ...styles.checkIcon,
                    color: qualityChecks[key] === null ? "#666" : qualityChecks[key] ? "#00ffc8" : "#ff4444"
                  }}>
                    {qualityChecks[key] === null ? "⏳" : qualityChecks[key] ? "✅" : "❌"}
                  </span>
                  <span style={styles.checkLabel}>{label}</span>
                </div>
              ))}
            </div>

            {/* Session info */}
            <div style={styles.sessionInfo}>
              <span style={styles.sessionLabel}>Session Code:</span>
              <span style={styles.sessionCode}>{inviteCode}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div style={styles.actions}>
          <button style={styles.leaveBtn} onClick={onLeave}>Leave</button>
          <button
            style={{ ...styles.joinBtn, ...(!displayName ? styles.joinBtnDisabled : {}) }}
            onClick={handleReady}
            disabled={!displayName}
          >
            🎙️ Enter Studio
          </button>
        </div>
      </div>
    </div>
  );
};

const styles = {
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(12px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" },
  card: { width: "100%", maxWidth: "720px", background: "linear-gradient(180deg, #0d1520 0%, #080e17 100%)", borderRadius: "24px", border: "1px solid rgba(0,255,200,0.15)", boxShadow: "0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,255,200,0.05)", overflow: "hidden" },
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 24px", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(0,255,200,0.04)" },
  headerLeft: { display: "flex", alignItems: "center", gap: "10px" },
  dot: { width: "10px", height: "10px", borderRadius: "50%", background: "#00ffc8", boxShadow: "0 0 12px rgba(0,255,200,0.6)", animation: "pulse 2s infinite" },
  headerTitle: { color: "#00ffc8", fontWeight: "800", fontSize: "1rem", fontFamily: "monospace" },
  headerSub: { color: "#5a7080", fontSize: "0.8rem" },
  content: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0", padding: "0" },
  previewWrap: { padding: "20px", borderRight: "1px solid rgba(255,255,255,0.05)" },
  preview: { position: "relative", background: "#050a10", borderRadius: "16px", overflow: "hidden", aspectRatio: "16/9", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid rgba(255,255,255,0.06)", marginBottom: "12px" },
  previewVideo: { width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)" },
  previewAvatar: { display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" },
  avatarCircle: { width: "72px", height: "72px", borderRadius: "50%", background: "linear-gradient(135deg, rgba(0,255,200,0.2), rgba(0,255,200,0.05))", border: "2px solid rgba(0,255,200,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.8rem", fontWeight: "800", color: "#00ffc8" },
  avatarLabel: { color: "#3a5060", fontSize: "0.76rem" },
  micBar: { position: "absolute", right: "10px", top: "10px", bottom: "10px", width: "6px", background: "rgba(255,255,255,0.06)", borderRadius: "999px", overflow: "hidden", display: "flex", flexDirection: "column-reverse" },
  micFill: { width: "100%", borderRadius: "999px", transition: "height 0.05s linear" },
  previewBadge: { position: "absolute", top: "8px", left: "10px", background: "rgba(0,0,0,0.6)", color: "#00ffc8", fontSize: "0.7rem", padding: "3px 8px", borderRadius: "999px", fontWeight: "700" },
  toggleRow: { display: "flex", gap: "8px" },
  toggleBtn: { flex: 1, padding: "10px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", color: "#6a8090", fontSize: "0.8rem", fontWeight: "700", cursor: "pointer", transition: "all 0.2s" },
  toggleActive: { background: "rgba(0,255,200,0.1)", borderColor: "rgba(0,255,200,0.3)", color: "#00ffc8" },
  controls: { padding: "20px", display: "flex", flexDirection: "column", gap: "14px", overflowY: "auto", maxHeight: "420px" },
  fieldGroup: { display: "flex", flexDirection: "column", gap: "6px" },
  label: { fontSize: "0.72rem", color: "#4a6070", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: "700" },
  input: { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", padding: "10px 12px", color: "#e0eaf0", fontSize: "0.9rem", outline: "none" },
  select: { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", padding: "10px 12px", color: "#e0eaf0", fontSize: "0.86rem", outline: "none" },
  roleRow: { display: "flex", gap: "8px" },
  rolePill: { flex: 1, padding: "8px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "8px", color: "#5a7080", fontSize: "0.76rem", fontWeight: "700", cursor: "pointer", textTransform: "capitalize" },
  rolePillActive: { background: "rgba(0,255,200,0.1)", borderColor: "rgba(0,255,200,0.28)", color: "#00ffc8" },
  levelBar: { height: "6px", background: "rgba(255,255,255,0.06)", borderRadius: "999px", overflow: "hidden" },
  levelFill: { height: "100%", borderRadius: "999px", transition: "width 0.05s linear" },
  levelLabel: { fontSize: "0.7rem", color: "#4a6070", marginTop: "2px" },
  checks: { background: "rgba(255,255,255,0.02)", borderRadius: "10px", padding: "12px", display: "flex", flexDirection: "column", gap: "8px", border: "1px solid rgba(255,255,255,0.04)" },
  checkRow: { display: "flex", alignItems: "center", gap: "10px" },
  checkIcon: { fontSize: "0.9rem" },
  checkLabel: { fontSize: "0.82rem", color: "#5a7080" },
  sessionInfo: { display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", background: "rgba(0,255,200,0.04)", borderRadius: "10px", border: "1px solid rgba(0,255,200,0.1)" },
  sessionLabel: { fontSize: "0.76rem", color: "#4a6070", fontWeight: "700" },
  sessionCode: { fontFamily: "monospace", color: "#00ffc8", fontWeight: "800", letterSpacing: "0.1em", fontSize: "0.9rem" },
  actions: { display: "flex", gap: "12px", padding: "18px 24px", borderTop: "1px solid rgba(255,255,255,0.05)" },
  leaveBtn: { padding: "12px 20px", background: "transparent", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", color: "#5a7080", fontSize: "0.88rem", fontWeight: "700", cursor: "pointer" },
  joinBtn: { flex: 1, padding: "13px", background: "linear-gradient(135deg, #00ffc8, #00d9aa)", border: "none", borderRadius: "12px", color: "#041014", fontSize: "0.95rem", fontWeight: "800", cursor: "pointer", boxShadow: "0 8px 24px rgba(0,255,200,0.2)" },
  joinBtnDisabled: { opacity: 0.4, cursor: "not-allowed" },
};

export default GreenRoom;