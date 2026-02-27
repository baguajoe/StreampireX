// =============================================================================
// PodcastStudio.js — In-App Podcast Recording Studio (AUDIO + VIDEO)
// =============================================================================
// Location: src/front/js/pages/PodcastStudio.js
// Route: /podcast-studio
//
// DROP-IN REPLACEMENT — merges base + Phase1 + Phase2 video into single file:
//  - Host + up to 3 remote guests via WebRTC (double-ender recording)
//  - Per-track volume/mute, soundboard, chapters, episode metadata
//  - NEW: Webcam recording (camera select, mirror, resolution)
//  - NEW: Screen share/record via getDisplayMedia (screen, window, or tab)
//  - NEW: PiP canvas compositing (cam overlay on screen capture)
//  - NEW: Layout presets: Audio Only, Camera, Screen, PiP corners, Side-by-Side
//  - NEW: Combined video+audio recording via canvas captureStream
//  - NEW: Video episode export alongside audio stems
// =============================================================================

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import io from "socket.io-client";
import "../../styles/PodcastStudio.css";

// ── Constants ────────────────────────────────────────────────────────────────
const MAX_GUESTS = 3;
const SAMPLE_RATE = 48000;

const LOCAL_RECORD_MIME = (() => {
  if (typeof MediaRecorder !== "undefined") {
    if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) return "audio/webm;codecs=opus";
    if (MediaRecorder.isTypeSupported("audio/webm")) return "audio/webm";
  }
  return "audio/webm";
})();

const VIDEO_RECORD_MIME = (() => {
  if (typeof MediaRecorder !== "undefined") {
    for (const c of ["video/webm;codecs=vp9,opus","video/webm;codecs=vp8,opus","video/webm;codecs=h264,opus","video/webm"]) {
      if (MediaRecorder.isTypeSupported(c)) return c;
    }
  }
  return "video/webm";
})();

const SOUNDBOARD_DEFAULTS = [
  { id: "intro", label: "\u{1f3b5} Intro", key: "1", color: "#00ffc8" },
  { id: "outro", label: "\u{1f3b5} Outro", key: "2", color: "#00ffc8" },
  { id: "sting", label: "\u26a1 Sting", key: "3", color: "#FF6600" },
  { id: "applause", label: "\u{1f44f} Applause", key: "4", color: "#ff9500" },
  { id: "laugh", label: "\u{1f602} Laugh", key: "5", color: "#ff9500" },
  { id: "rimshot", label: "\u{1f941} Rimshot", key: "6", color: "#af52de" },
  { id: "transition", label: "\u{1f504} Transition", key: "7", color: "#007aff" },
  { id: "silence", label: "\u{1f507} Silence", key: "8", color: "#666" },
];

const ICE_SERVERS = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:stun1.l.google.com:19302" }] };

// ── Video Layout Presets (NEW) ───────────────────────────────────────────────
const VIDEO_LAYOUTS = {
  "audio-only":       { label: "Audio Only",       icon: "\u{1f399}\ufe0f", cam: false, scr: false, pip: null,           multi: false },
  "camera-only":      { label: "Camera Only",      icon: "\u{1f4f9}",       cam: true,  scr: false, pip: null,           multi: false },
  "screen-only":      { label: "Screen Only",      icon: "\u{1f5a5}\ufe0f", cam: false, scr: true,  pip: null,           multi: false },
  "pip-bottom-right": { label: "PiP Bottom-Right", icon: "\u{1f3ac}",       cam: true,  scr: true,  pip: "bottom-right", multi: false },
  "pip-bottom-left":  { label: "PiP Bottom-Left",  icon: "\u{1f3ac}",       cam: true,  scr: true,  pip: "bottom-left",  multi: false },
  "pip-top-right":    { label: "PiP Top-Right",    icon: "\u{1f3ac}",       cam: true,  scr: true,  pip: "top-right",    multi: false },
  "pip-top-left":     { label: "PiP Top-Left",     icon: "\u{1f3ac}",       cam: true,  scr: true,  pip: "top-left",     multi: false },
  "side-by-side":     { label: "Side by Side",     icon: "\u{1f4d0}",       cam: true,  scr: true,  pip: "side-by-side", multi: false },
  "multi-grid":       { label: "All Cams Grid",    icon: "\u229e",          cam: true,  scr: false, pip: null,           multi: true },
  "multi-spotlight":  { label: "Host + Guests",    icon: "\u{1f526}",       cam: true,  scr: false, pip: null,           multi: "spotlight" },
  "multi-sbs":        { label: "2-Person Split",   icon: "\u{1f465}",       cam: true,  scr: false, pip: null,           multi: "split" },
};

const CAM_RES = {
  "480p":  { width: 854,  height: 480 },
  "720p":  { width: 1280, height: 720 },
  "1080p": { width: 1920, height: 1080 },
  "4K":    { width: 3840, height: 2160 },
};

// ── Helpers ──────────────────────────────────────────────────────────────────
const fmtTime = (s) => {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = Math.floor(s % 60);
  return h > 0 ? `${h}:${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}` : `${m}:${String(sec).padStart(2,"0")}`;
};
const generateSessionId = () => `pod_${Date.now().toString(36)}_${Math.random().toString(36).substr(2,6)}`;
const generateInviteCode = () => Math.random().toString(36).substr(2,8).toUpperCase();

/** Draw video into canvas region with "cover" fit (crops to fill, no bars) */
function drawVideoFit(ctx, video, dx, dy, dw, dh) {
  if (!video || video.videoWidth === 0) return;
  const vw = video.videoWidth, vh = video.videoHeight, vr = vw / vh, dr = dw / dh;
  let sx = 0, sy = 0, sw = vw, sh = vh;
  if (vr > dr) { sw = vh * dr; sx = (vw - sw) / 2; }
  else { sh = vw / dr; sy = (vh - sh) / 2; }
  ctx.drawImage(video, sx, sy, sw, sh, dx, dy, dw, dh);
}

// ── LiveWaveform ─────────────────────────────────────────────────────────────
const LiveWaveform = React.memo(({ analyser, color, height = 48 }) => {
  const canvasRef = useRef(null), animRef = useRef(null);
  useEffect(() => {
    if (!analyser) return;
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"), bufLen = analyser.frequencyBinCount, data = new Uint8Array(bufLen);
    const draw = () => {
      analyser.getByteTimeDomainData(data);
      const w = canvas.width, h = canvas.height;
      ctx.clearRect(0, 0, w, h); ctx.strokeStyle = color || "#00ffc8"; ctx.lineWidth = 1.5; ctx.beginPath();
      const sw = w / bufLen; let x = 0;
      for (let i = 0; i < bufLen; i++) { const y = (data[i] / 128.0 * h) / 2; i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); x += sw; }
      ctx.lineTo(w, h / 2); ctx.stroke();
      animRef.current = requestAnimationFrame(draw);
    };
    draw();
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [analyser, color]);
  return <canvas ref={canvasRef} width={300} height={height} className="ps-waveform-canvas" />;
});

// ── LevelMeter ───────────────────────────────────────────────────────────────
const LevelMeter = React.memo(({ analyser }) => {
  const [level, setLevel] = useState(0); const animRef = useRef(null);
  useEffect(() => {
    if (!analyser) return;
    const data = new Uint8Array(analyser.frequencyBinCount);
    const update = () => {
      analyser.getByteFrequencyData(data);
      let s = 0; for (let i = 0; i < data.length; i++) s += data[i];
      setLevel(s / (data.length * 255));
      animRef.current = requestAnimationFrame(update);
    };
    update();
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [analyser]);
  const pct = Math.min(level * 100, 100), clr = pct > 85 ? "#ff3b30" : pct > 60 ? "#ff9500" : "#00ffc8";
  return <div className="ps-level-meter"><div className="ps-level-meter-fill" style={{ width: `${pct}%`, background: clr }} /></div>;
});

// =============================================================================
// MAIN COMPONENT
// =============================================================================
const PodcastStudio = ({ user }) => {
  // ── Session ──
  const [sessionId] = useState(generateSessionId);
  const [inviteCode] = useState(generateInviteCode);
  const [sessionName, setSessionName] = useState("New Episode");

  // ── Recording ──
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isMonitoring, setIsMonitoring] = useState(false);

  // ── Tracks ──
  const [localTrack, setLocalTrack] = useState({ name: user?.username || "Host", volume: 0.85, muted: false, color: "#00ffc8" });
  const [guestTracks, setGuestTracks] = useState([]);

  // ── Guests ──
  const [connectedGuests, setConnectedGuests] = useState([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);

  // ── Soundboard ──
  const [soundboard] = useState(SOUNDBOARD_DEFAULTS);
  const [soundboardBuffers, setSoundboardBuffers] = useState({});

  // ── Chapters ──
  const [chapters, setChapters] = useState([]);
  const [chapterInput, setChapterInput] = useState("");

  // ── Episode Metadata ──
  const [episodeTitle, setEpisodeTitle] = useState("");
  const [episodeDescription, setEpisodeDescription] = useState("");
  const [episodeNumber, setEpisodeNumber] = useState(1);
  const [showNotes, setShowNotes] = useState("");

  // ── UI ──
  const [activePanel, setActivePanel] = useState("tracks");
  const [status, setStatus] = useState("Ready");
  const [inputDevices, setInputDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState("default");

  // ═══════ VIDEO STATE (NEW) ═══════
  const [videoLayout, setVideoLayout] = useState("audio-only");
  const [cameraStream, setCameraStream] = useState(null);
  const [screenStream, setScreenStream] = useState(null);
  const [availableCameras, setAvailableCameras] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState("");
  const [cameraResolution, setCameraResolution] = useState("720p");
  const [mirrorCamera, setMirrorCamera] = useState(true);
  const [pipSize, setPipSize] = useState(25);
  const [videoError, setVideoError] = useState("");

  // ═══════ GUEST VIDEO STATE (COLLAB) ═══════
  const [guestVideoLayout, setGuestVideoLayout] = useState("grid");  // grid, spotlight, interview, panel
  const [spotlightUserId, setSpotlightUserId] = useState(null);

  // ── Recorded Blobs ──
  const [recordedBlobs, setRecordedBlobs] = useState({});
  const [isExporting, setIsExporting] = useState(false);

  // ── Audio Refs ──
  const audioCtxRef = useRef(null);
  const localStreamRef = useRef(null);
  const localAnalyserRef = useRef(null);
  const localGainRef = useRef(null);
  const localRecorderRef = useRef(null);
  const localChunksRef = useRef([]);
  const soundboardRecorderRef = useRef(null);
  const soundboardChunksRef = useRef([]);
  const soundboardDestRef = useRef(null);

  // ── WebRTC Refs ──
  const socketRef = useRef(null);
  const peerConnectionsRef = useRef({});
  const remoteAnalysersRef = useRef({});
  const remoteGainsRef = useRef({});
  const remoteRecordersRef = useRef({});
  const remoteStreamsRef = useRef({});

  // ── Timer Refs ──
  const timerRef = useRef(null);
  const recordStartRef = useRef(0);
  const pauseOffsetRef = useRef(0);
  const syncTimestampRef = useRef(null);

  // ═══════ VIDEO REFS (NEW) ═══════
  const cameraVideoRef = useRef(null);
  const screenVideoRef = useRef(null);
  const compositeCanvasRef = useRef(null);
  const canvasAnimRef = useRef(null);
  const videoRecorderRef = useRef(null);
  const videoChunksRef = useRef([]);
  const guestVideoRefs = useRef({});  // { peerId: HTMLVideoElement }

  // Derived
  const hasVideo = !!(cameraStream || screenStream);
  const hasGuests = connectedGuests.length > 0;
  const hasAnyVideo = hasVideo || hasGuests;
  const currentLayout = VIDEO_LAYOUTS[videoLayout] || VIDEO_LAYOUTS["audio-only"];

  // ── Audio Context ──
  const getCtx = useCallback(() => {
    if (!audioCtxRef.current || audioCtxRef.current.state === "closed")
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: SAMPLE_RATE });
    if (audioCtxRef.current.state === "suspended") audioCtxRef.current.resume();
    return audioCtxRef.current;
  }, []);

  // ── Enumerate Devices ──
  useEffect(() => {
    navigator.mediaDevices.enumerateDevices().then((d) => {
      setInputDevices(d.filter((x) => x.kind === "audioinput"));
      setAvailableCameras(d.filter((x) => x.kind === "videoinput"));
    }).catch(console.error);
    return () => {
      if (socketRef.current) socketRef.current.disconnect();
      if (localStreamRef.current) localStreamRef.current.getTracks().forEach((t) => t.stop());
      if (audioCtxRef.current && audioCtxRef.current.state !== "closed") audioCtxRef.current.close();
      if (timerRef.current) clearInterval(timerRef.current);
      if (canvasAnimRef.current) cancelAnimationFrame(canvasAnimRef.current);
    };
  }, []);

  // ── Init Local Mic ──
  const initLocalAudio = useCallback(async () => {
    try {
      const ctx = getCtx();
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { deviceId: selectedDevice !== "default" ? { exact: selectedDevice } : undefined, echoCancellation: true, noiseSuppression: true, autoGainControl: false, sampleRate: SAMPLE_RATE },
      });
      localStreamRef.current = stream;
      const source = ctx.createMediaStreamSource(stream);
      const gain = ctx.createGain(); gain.gain.value = localTrack.volume;
      const analyser = ctx.createAnalyser(); analyser.fftSize = 2048; analyser.smoothingTimeConstant = 0.8;
      source.connect(gain); gain.connect(analyser);
      localGainRef.current = gain; localAnalyserRef.current = analyser;
      setIsMonitoring(true); setStatus("\u{1f399}\ufe0f Microphone connected");
      return stream;
    } catch (err) { setStatus(`\u2717 Mic error: ${err.message}`); return null; }
  }, [getCtx, selectedDevice, localTrack.volume]);

  // ═══════ CAMERA START/STOP (NEW) ═══════
  const startCamera = useCallback(async (deviceId) => {
    try {
      if (cameraStream) cameraStream.getTracks().forEach((t) => t.stop());
      const res = CAM_RES[cameraResolution] || CAM_RES["720p"];
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: deviceId ? { exact: deviceId } : undefined, width: { ideal: res.width }, height: { ideal: res.height }, frameRate: { ideal: 30 } },
        audio: false,
      });
      setCameraStream(stream); setVideoError("");
      if (cameraVideoRef.current) cameraVideoRef.current.srcObject = stream;
      const devices = await navigator.mediaDevices.enumerateDevices();
      setAvailableCameras(devices.filter((d) => d.kind === "videoinput"));
      if (videoLayout === "audio-only") setVideoLayout("camera-only");
      setStatus("\u{1f4f9} Camera connected");
      return stream;
    } catch (e) {
      setVideoError(e.name === "NotAllowedError" ? "Camera access denied." : e.name === "NotFoundError" ? "No camera found." : `Camera error: ${e.message}`);
      return null;
    }
  }, [cameraStream, cameraResolution, videoLayout]);

  const stopCamera = useCallback(() => {
    if (cameraStream) { cameraStream.getTracks().forEach((t) => t.stop()); setCameraStream(null); }
    if (cameraVideoRef.current) cameraVideoRef.current.srcObject = null;
    setVideoLayout(screenStream ? "screen-only" : "audio-only");
  }, [cameraStream, screenStream]);

  // ═══════ SCREEN SHARE (NEW) ═══════
  // getDisplayMedia lets user pick: Entire Screen, Window, OR Browser Tab.
  // This IS screen recording — same API, same stream, recorded to canvas.
  const startScreenShare = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30 } },
        audio: true,
      });
      setScreenStream(stream); setVideoError("");
      if (screenVideoRef.current) screenVideoRef.current.srcObject = stream;
      setVideoLayout(cameraStream ? "pip-bottom-right" : "screen-only");
      stream.getVideoTracks()[0].onended = () => stopScreenShare();
      setStatus("\u{1f5a5}\ufe0f Screen sharing active");
      return stream;
    } catch (e) {
      if (e.name !== "AbortError") setVideoError(`Screen share error: ${e.message}`);
      return null;
    }
  }, [cameraStream]);

  const stopScreenShare = useCallback(() => {
    if (screenStream) { screenStream.getTracks().forEach((t) => t.stop()); setScreenStream(null); }
    if (screenVideoRef.current) screenVideoRef.current.srcObject = null;
    setVideoLayout(cameraStream ? "camera-only" : "audio-only");
  }, [screenStream, cameraStream]);

  // Helper: collect all active video elements (host cam + guest cams)
  const getActiveVideoFeeds = useCallback(() => {
    const feeds = [];
    const camV = cameraVideoRef.current;
    if (camV && cameraStream && camV.readyState >= 2) {
      feeds.push({ video: camV, label: "Host", isHost: true });
    }
    // Guest video elements
    Object.entries(guestVideoRefs.current).forEach(([peerId, el]) => {
      if (el && el.readyState >= 2 && el.videoWidth > 0) {
        const guest = connectedGuests.find((g) => g.id === peerId);
        feeds.push({ video: el, label: guest?.name || "Guest", isHost: false });
      }
    });
    return feeds;
  }, [cameraStream, connectedGuests]);

  // ═══════ CANVAS COMPOSITING LOOP (UPDATED — multi-person) ═══════
  useEffect(() => {
    if (canvasAnimRef.current) cancelAnimationFrame(canvasAnimRef.current);
    const canvas = compositeCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const camV = cameraVideoRef.current;
    const scrV = screenVideoRef.current;

    const drawFrame = () => {
      const cw = canvas.width, ch = canvas.height;
      const hasCam = camV && cameraStream && camV.readyState >= 2;
      const hasScr = scrV && screenStream && scrV.readyState >= 2;
      const feeds = getActiveVideoFeeds();

      ctx.fillStyle = "#0a0a0a"; ctx.fillRect(0, 0, cw, ch);

      // ── MULTI-PERSON LAYOUTS ──
      if (currentLayout.multi === true && feeds.length > 0) {
        // Grid: arrange all feeds in a grid
        const cols = feeds.length <= 1 ? 1 : feeds.length <= 4 ? 2 : 3;
        const rows = Math.ceil(feeds.length / cols);
        const cellW = Math.floor(cw / cols), cellH = Math.floor(ch / rows);
        feeds.forEach((feed, i) => {
          const col = i % cols, row = Math.floor(i / cols);
          const x = col * cellW, y = row * cellH;
          const isHost = feed.isHost && mirrorCamera;
          if (isHost) { ctx.save(); ctx.translate(x + cellW, y); ctx.scale(-1, 1); drawVideoFit(ctx, feed.video, 0, 0, cellW, cellH); ctx.restore(); }
          else drawVideoFit(ctx, feed.video, x, y, cellW, cellH);
          // Name label
          ctx.fillStyle = "rgba(0,0,0,0.6)";
          ctx.fillRect(x, y + cellH - 24, cellW, 24);
          ctx.fillStyle = "#fff"; ctx.font = "bold 11px system-ui"; ctx.textAlign = "left";
          ctx.fillText(feed.label, x + 8, y + cellH - 8);
          // Grid lines
          if (col > 0) { ctx.strokeStyle = "#00ffc8"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + cellH); ctx.stroke(); }
          if (row > 0) { ctx.strokeStyle = "#00ffc8"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + cellW, y); ctx.stroke(); }
        });

      } else if (currentLayout.multi === "spotlight" && feeds.length > 0) {
        // Spotlight: host large, guests in sidebar
        const sideW = Math.round(cw * 0.25);
        const mainW = cw - sideW;
        const hostFeed = feeds.find((f) => f.isHost) || feeds[0];
        const others = feeds.filter((f) => f !== hostFeed);
        // Main
        if (hostFeed.isHost && mirrorCamera) { ctx.save(); ctx.translate(mainW, 0); ctx.scale(-1, 1); drawVideoFit(ctx, hostFeed.video, 0, 0, mainW, ch); ctx.restore(); }
        else drawVideoFit(ctx, hostFeed.video, 0, 0, mainW, ch);
        ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fillRect(0, ch - 28, mainW, 28);
        ctx.fillStyle = "#fff"; ctx.font = "bold 12px system-ui"; ctx.textAlign = "left";
        ctx.fillText(hostFeed.label, 10, ch - 10);
        // Sidebar
        if (others.length > 0) {
          const slotH = Math.floor(ch / Math.max(others.length, 1));
          others.forEach((feed, i) => {
            const y = i * slotH;
            drawVideoFit(ctx, feed.video, mainW, y, sideW, slotH);
            ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fillRect(mainW, y + slotH - 20, sideW, 20);
            ctx.fillStyle = "#fff"; ctx.font = "10px system-ui"; ctx.textAlign = "left";
            ctx.fillText(feed.label, mainW + 6, y + slotH - 6);
          });
        }
        // Divider
        ctx.strokeStyle = "#00ffc8"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(mainW, 0); ctx.lineTo(mainW, ch); ctx.stroke();

      } else if (currentLayout.multi === "split" && feeds.length >= 2) {
        // 2-person split: left and right
        const hw = Math.floor(cw / 2);
        const f1 = feeds.find((f) => f.isHost) || feeds[0];
        const f2 = feeds.find((f) => f !== f1) || feeds[1] || f1;
        if (f1.isHost && mirrorCamera) { ctx.save(); ctx.translate(hw, 0); ctx.scale(-1, 1); drawVideoFit(ctx, f1.video, 0, 0, hw, ch); ctx.restore(); }
        else drawVideoFit(ctx, f1.video, 0, 0, hw, ch);
        drawVideoFit(ctx, f2.video, hw, 0, hw, ch);
        // Labels
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.fillRect(0, ch - 28, hw, 28); ctx.fillRect(hw, ch - 28, hw, 28);
        ctx.fillStyle = "#fff"; ctx.font = "bold 12px system-ui"; ctx.textAlign = "left";
        ctx.fillText(f1.label, 10, ch - 10); ctx.fillText(f2.label, hw + 10, ch - 10);
        // Divider
        ctx.strokeStyle = "#00ffc8"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(hw, 0); ctx.lineTo(hw, ch); ctx.stroke();

      } else if (currentLayout.multi === "split" && feeds.length === 1) {
        // Only 1 person — show them full
        const f = feeds[0];
        if (f.isHost && mirrorCamera) { ctx.save(); ctx.translate(cw, 0); ctx.scale(-1, 1); drawVideoFit(ctx, f.video, 0, 0, cw, ch); ctx.restore(); }
        else drawVideoFit(ctx, f.video, 0, 0, cw, ch);

      // ── ORIGINAL SOLO LAYOUTS ──
      } else if (currentLayout.pip === "side-by-side") {
        const hw = cw / 2;
        if (hasScr) drawVideoFit(ctx, scrV, 0, 0, hw, ch);
        if (hasCam) {
          if (mirrorCamera) { ctx.save(); ctx.translate(hw + hw, 0); ctx.scale(-1, 1); drawVideoFit(ctx, camV, 0, 0, hw, ch); ctx.restore(); }
          else drawVideoFit(ctx, camV, hw, 0, hw, ch);
        }
        ctx.strokeStyle = "#00ffc8"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(hw, 0); ctx.lineTo(hw, ch); ctx.stroke();

      } else if (currentLayout.scr && currentLayout.cam && currentLayout.pip) {
        if (hasScr) drawVideoFit(ctx, scrV, 0, 0, cw, ch);
        if (hasCam) {
          const pw = Math.round(cw * (pipSize / 100));
          const ar = (camV.videoHeight || 720) / (camV.videoWidth || 1280);
          const ph = Math.round(pw * ar);
          const margin = 16;
          let px, py;
          if (currentLayout.pip === "bottom-right") { px = cw - pw - margin; py = ch - ph - margin; }
          else if (currentLayout.pip === "bottom-left") { px = margin; py = ch - ph - margin; }
          else if (currentLayout.pip === "top-right") { px = cw - pw - margin; py = margin; }
          else { px = margin; py = margin; }
          ctx.fillStyle = "#00ffc8";
          ctx.beginPath(); ctx.roundRect(px - 2, py - 2, pw + 4, ph + 4, 8); ctx.fill();
          ctx.save(); ctx.beginPath(); ctx.roundRect(px, py, pw, ph, 6); ctx.clip();
          if (mirrorCamera) { ctx.translate(px + pw, py); ctx.scale(-1, 1); ctx.drawImage(camV, 0, 0, pw, ph); }
          else { ctx.drawImage(camV, px, py, pw, ph); }
          ctx.restore();
        }

      } else if (currentLayout.cam && hasCam) {
        if (mirrorCamera) { ctx.save(); ctx.translate(cw, 0); ctx.scale(-1, 1); drawVideoFit(ctx, camV, 0, 0, cw, ch); ctx.restore(); }
        else drawVideoFit(ctx, camV, 0, 0, cw, ch);

      } else if (currentLayout.scr && hasScr) {
        drawVideoFit(ctx, scrV, 0, 0, cw, ch);

      } else {
        ctx.fillStyle = "#1a1a2e"; ctx.fillRect(0, 0, cw, ch);
        ctx.fillStyle = "#00ffc8"; ctx.font = "bold 20px system-ui"; ctx.textAlign = "center";
        ctx.fillText("\u{1f399}\ufe0f Audio Recording Mode", cw / 2, ch / 2 - 8);
        ctx.font = "13px system-ui"; ctx.fillStyle = "#888";
        ctx.fillText("Enable camera or screen share to add video", cw / 2, ch / 2 + 18);
      }

      // Recording indicator
      if (isRecording && (hasVideo || feeds.length > 0)) {
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.beginPath(); ctx.roundRect(cw - 110, 10, 98, 28, 6); ctx.fill();
        ctx.fillStyle = "#ff4444";
        ctx.beginPath(); ctx.arc(cw - 94, 24, 5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#fff"; ctx.font = "bold 12px monospace"; ctx.textAlign = "left";
        ctx.fillText(fmtTime(recordingTime), cw - 84, 28);
      }

      canvasAnimRef.current = requestAnimationFrame(drawFrame);
    };

    canvasAnimRef.current = requestAnimationFrame(drawFrame);
    return () => { if (canvasAnimRef.current) cancelAnimationFrame(canvasAnimRef.current); };
  }, [cameraStream, screenStream, videoLayout, mirrorCamera, pipSize, isRecording, recordingTime, hasVideo, currentLayout, getActiveVideoFeeds, connectedGuests]);

  // ── Socket Connection ──
  const initSocket = useCallback(() => {
    const backendUrl = process.env.REACT_APP_BACKEND_URL;
    if (!backendUrl || socketRef.current?.connected) return;
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    socketRef.current = io(backendUrl, {
      transports: ["websocket", "polling"], withCredentials: true,
      path: "/socket.io/", namespace: "/podcast",
      query: { token, sessionId }, reconnection: true,
      reconnectionAttempts: 10, reconnectionDelay: 2000,
    });
    const socket = socketRef.current;
    socket.on("connect", () => {
      socket.emit("create_podcast_room", { sessionId, inviteCode, hostName: user?.username || "Host", hostId: user?.id });
      setStatus("\u{1f7e2} Connected \u2014 ready to record");
    });
    socket.on("guest_joined", async ({ guestId, guestName, guestSocketId }) => {
      setConnectedGuests((prev) => [...prev, { id: guestId, name: guestName, socketId: guestSocketId }]);
      const guestColor = ["#FF6600", "#ff9500", "#af52de"][guestTracks.length % 3];
      setGuestTracks((prev) => [...prev, { id: guestId, name: guestName, volume: 0.85, muted: false, color: guestColor }]);
      await createPeerConnection(guestSocketId, guestId, true);
      setStatus(`\u{1f399}\ufe0f ${guestName} joined`);
    });
    socket.on("guest_left", ({ guestId }) => {
      setConnectedGuests((prev) => prev.filter((g) => g.id !== guestId));
      setGuestTracks((prev) => prev.filter((t) => t.id !== guestId));
      if (peerConnectionsRef.current[guestId]) {
        peerConnectionsRef.current[guestId].close();
        delete peerConnectionsRef.current[guestId]; delete remoteAnalysersRef.current[guestId];
        delete remoteGainsRef.current[guestId]; delete remoteStreamsRef.current[guestId];
      }
    });
    socket.on("podcast_offer", async ({ offer, from, fromId }) => { await handleOffer(offer, from, fromId); });
    socket.on("podcast_answer", async ({ answer, fromId }) => { const pc = peerConnectionsRef.current[fromId]; if (pc) await pc.setRemoteDescription(new RTCSessionDescription(answer)); });
    socket.on("podcast_ice", async ({ candidate, fromId }) => { const pc = peerConnectionsRef.current[fromId]; if (pc && candidate) await pc.addIceCandidate(new RTCIceCandidate(candidate)); });
    socket.on("sync_timestamp", ({ timestamp }) => { syncTimestampRef.current = timestamp; });
    socket.on("disconnect", () => setStatus("\u{1f534} Disconnected \u2014 reconnecting..."));
    socket.on("connect_error", () => setStatus("\u26a0 Connection error"));
  }, [sessionId, inviteCode, user, guestTracks.length]);

  // ── Peer Connection ──
  const createPeerConnection = useCallback(async (socketId, peerId, isInitiator) => {
    const ctx = getCtx();
    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnectionsRef.current[peerId] = pc;
    if (localStreamRef.current) localStreamRef.current.getAudioTracks().forEach((track) => pc.addTrack(track, localStreamRef.current));
    pc.ontrack = (event) => {
      const rs = event.streams[0]; remoteStreamsRef.current[peerId] = rs;
      const source = ctx.createMediaStreamSource(rs);
      const gain = ctx.createGain(); gain.gain.value = 0.85;
      const analyser = ctx.createAnalyser(); analyser.fftSize = 2048;
      source.connect(gain); gain.connect(analyser); gain.connect(ctx.destination);
      remoteGainsRef.current[peerId] = gain; remoteAnalysersRef.current[peerId] = analyser;
    };
    pc.onicecandidate = (event) => {
      if (event.candidate) socketRef.current?.emit("podcast_ice", { candidate: event.candidate, sessionId, targetSocketId: socketId, fromId: user?.id || "host" });
    };
    if (isInitiator) {
      const offer = await pc.createOffer(); await pc.setLocalDescription(offer);
      socketRef.current?.emit("podcast_offer", { offer, sessionId, targetSocketId: socketId, fromId: user?.id || "host" });
    }
    return pc;
  }, [getCtx, sessionId, user]);

  const handleOffer = useCallback(async (offer, fromSocketId, fromId) => {
    const pc = await createPeerConnection(fromSocketId, fromId, false);
    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer(); await pc.setLocalDescription(answer);
    socketRef.current?.emit("podcast_answer", { answer, sessionId, targetSocketId: fromSocketId, fromId: user?.id || "host" });
  }, [createPeerConnection, sessionId, user]);

  // ═══════ RECORDING (UPDATED — now records video too) ═══════
  const startRecording = useCallback(async () => {
    if (!localStreamRef.current) await initLocalAudio();
    if (!localStreamRef.current) { setStatus("\u26a0 Cannot record \u2014 no microphone"); return; }

    // Audio: host mic
    const localRec = new MediaRecorder(localStreamRef.current, { mimeType: LOCAL_RECORD_MIME, audioBitsPerSecond: 256000 });
    localChunksRef.current = [];
    localRec.ondataavailable = (e) => { if (e.data.size > 0) localChunksRef.current.push(e.data); };
    localRec.start(1000); localRecorderRef.current = localRec;

    // Audio: remote guests
    Object.entries(remoteStreamsRef.current).forEach(([peerId, stream]) => {
      const rec = new MediaRecorder(stream, { mimeType: LOCAL_RECORD_MIME, audioBitsPerSecond: 256000 });
      const chunks = []; rec.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      rec.start(1000); remoteRecordersRef.current[peerId] = { recorder: rec, chunks };
    });

    // Audio: soundboard
    if (soundboardDestRef.current) {
      const sbStream = soundboardDestRef.current.stream;
      const sbRec = new MediaRecorder(sbStream, { mimeType: LOCAL_RECORD_MIME, audioBitsPerSecond: 128000 });
      soundboardChunksRef.current = [];
      sbRec.ondataavailable = (e) => { if (e.data.size > 0) soundboardChunksRef.current.push(e.data); };
      sbRec.start(1000); soundboardRecorderRef.current = sbRec;
    }

    // VIDEO: capture canvas stream + mic audio (NEW)
    if (hasVideo && compositeCanvasRef.current) {
      try {
        const canvasStream = compositeCanvasRef.current.captureStream(30);
        // Merge mic audio into canvas stream
        if (localStreamRef.current) localStreamRef.current.getAudioTracks().forEach((t) => canvasStream.addTrack(t));
        // Also capture system/tab audio from screen share if present
        if (screenStream) screenStream.getAudioTracks().forEach((t) => canvasStream.addTrack(t));
        const vr = new MediaRecorder(canvasStream, { mimeType: VIDEO_RECORD_MIME, videoBitsPerSecond: 5000000 });
        videoChunksRef.current = [];
        vr.ondataavailable = (e) => { if (e.data.size > 0) videoChunksRef.current.push(e.data); };
        vr.start(1000); videoRecorderRef.current = vr;
      } catch (e) { console.error("Video recorder failed:", e); }
    }

    // Sync + timer
    syncTimestampRef.current = Date.now();
    socketRef.current?.emit("recording_started", { sessionId, timestamp: syncTimestampRef.current });
    recordStartRef.current = performance.now() - pauseOffsetRef.current * 1000;
    timerRef.current = setInterval(() => { setRecordingTime((performance.now() - recordStartRef.current) / 1000); }, 100);
    setIsRecording(true); setIsPaused(false);
    setStatus(hasVideo ? "\u25cf Recording (Video + Audio)" : "\u25cf Recording");
  }, [initLocalAudio, sessionId, hasVideo, screenStream]);

  const pauseRecording = useCallback(() => {
    if (!isRecording) return;
    if (isPaused) {
      localRecorderRef.current?.resume();
      Object.values(remoteRecordersRef.current).forEach(({ recorder }) => recorder?.resume());
      soundboardRecorderRef.current?.resume();
      videoRecorderRef.current?.resume();
      recordStartRef.current = performance.now() - recordingTime * 1000;
      timerRef.current = setInterval(() => { setRecordingTime((performance.now() - recordStartRef.current) / 1000); }, 100);
      setIsPaused(false); setStatus("\u25cf Recording");
    } else {
      localRecorderRef.current?.pause();
      Object.values(remoteRecordersRef.current).forEach(({ recorder }) => recorder?.pause());
      soundboardRecorderRef.current?.pause();
      videoRecorderRef.current?.pause();
      if (timerRef.current) clearInterval(timerRef.current);
      pauseOffsetRef.current = recordingTime;
      setIsPaused(true); setStatus("\u23f8 Paused");
    }
  }, [isRecording, isPaused, recordingTime]);

  const stopRecording = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    const blobs = {};
    let pending = 1;
    const remoteIds = Object.keys(remoteRecordersRef.current); pending += remoteIds.length;
    const hasSb = soundboardRecorderRef.current && soundboardRecorderRef.current.state !== "inactive";
    if (hasSb) pending++;
    const hasVid = videoRecorderRef.current && videoRecorderRef.current.state !== "inactive";
    if (hasVid) pending++;

    const checkDone = () => { pending--; if (pending <= 0) { setRecordedBlobs({ ...blobs }); setStatus(`\u2713 Recorded ${fmtTime(recordingTime)} \u2014 ${Object.keys(blobs).length} tracks${blobs.video ? " + video" : ""}`); } };

    // Host audio
    if (localRecorderRef.current && localRecorderRef.current.state !== "inactive") {
      localRecorderRef.current.onstop = () => { blobs.host = new Blob(localChunksRef.current, { type: LOCAL_RECORD_MIME }); checkDone(); };
      localRecorderRef.current.stop();
    } else checkDone();

    // Remote audio
    remoteIds.forEach((peerId) => {
      const { recorder, chunks } = remoteRecordersRef.current[peerId];
      if (recorder && recorder.state !== "inactive") {
        recorder.onstop = () => { blobs[peerId] = new Blob(chunks, { type: LOCAL_RECORD_MIME }); checkDone(); };
        recorder.stop();
      } else checkDone();
    });

    // Soundboard
    if (hasSb) {
      soundboardRecorderRef.current.onstop = () => { blobs.soundboard = new Blob(soundboardChunksRef.current, { type: LOCAL_RECORD_MIME }); checkDone(); };
      soundboardRecorderRef.current.stop();
    }

    // VIDEO (NEW)
    if (hasVid) {
      videoRecorderRef.current.onstop = () => { blobs.video = new Blob(videoChunksRef.current, { type: VIDEO_RECORD_MIME }); checkDone(); };
      videoRecorderRef.current.stop(); videoRecorderRef.current = null;
    }

    socketRef.current?.emit("recording_stopped", { sessionId });
    setIsRecording(false); setIsPaused(false);
  }, [recordingTime, sessionId]);

  // ── Soundboard ──
  const initSoundboardDest = useCallback(() => { if (soundboardDestRef.current) return; soundboardDestRef.current = getCtx().createMediaStreamDestination(); }, [getCtx]);
  const loadSoundboardFile = useCallback(async (padId, file) => {
    try { const ctx = getCtx(); const buffer = await ctx.decodeAudioData(await file.arrayBuffer()); setSoundboardBuffers((prev) => ({ ...prev, [padId]: buffer })); setStatus(`\u2713 Loaded "${file.name}"`); }
    catch (err) { setStatus(`\u2717 Failed: ${err.message}`); }
  }, [getCtx]);
  const playSoundboardPad = useCallback((padId) => {
    const buffer = soundboardBuffers[padId]; if (!buffer) return;
    const ctx = getCtx(); initSoundboardDest();
    const source = ctx.createBufferSource(); source.buffer = buffer;
    source.connect(ctx.destination); if (soundboardDestRef.current) source.connect(soundboardDestRef.current);
    source.start();
  }, [soundboardBuffers, getCtx, initSoundboardDest]);

  useEffect(() => {
    const handler = (e) => { if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return; const pad = soundboard.find((p) => p.key === e.key); if (pad) playSoundboardPad(pad.id); };
    window.addEventListener("keydown", handler); return () => window.removeEventListener("keydown", handler);
  }, [soundboard, playSoundboardPad]);

  // ── Chapters ──
  const addChapter = useCallback(() => {
    if (!chapterInput.trim()) return;
    const ts = isRecording ? recordingTime : 0;
    setChapters((prev) => [...prev, { id: `ch_${Date.now()}`, title: chapterInput.trim(), timestamp: ts, formattedTime: fmtTime(ts) }]);
    setChapterInput("");
  }, [chapterInput, isRecording, recordingTime]);

  // ── Invite ──
  const inviteLink = useMemo(() => `${window.location.origin}/podcast-join/${sessionId}?code=${inviteCode}`, [sessionId, inviteCode]);
  const copyInviteLink = useCallback(() => { navigator.clipboard.writeText(inviteLink).then(() => { setInviteCopied(true); setTimeout(() => setInviteCopied(false), 2000); }); }, [inviteLink]);

  // ═══════ EXPORT (UPDATED — supports video) ═══════
  const exportEpisode = useCallback(async (mode = "mixdown") => {
    if (!Object.keys(recordedBlobs).length) { setStatus("\u26a0 No recording to export"); return; }
    setIsExporting(true); setStatus("\u{1f504} Exporting...");
    try {
      const tok = localStorage.getItem("token") || sessionStorage.getItem("token");
      const bu = process.env.REACT_APP_BACKEND_URL || "";
      if (mode === "stems") {
        for (const [trackId, blob] of Object.entries(recordedBlobs)) {
          const fd = new FormData();
          fd.append("file", blob, `${sessionName}_${trackId}.webm`);
          fd.append("session_id", sessionId); fd.append("track_id", trackId);
          fd.append("type", trackId === "video" ? "video" : "stem");
          await fetch(`${bu}/api/podcast-studio/upload-track`, { method: "POST", headers: { Authorization: `Bearer ${tok}` }, body: fd });
        }
        setStatus("\u2713 Stems uploaded");
      } else if (mode === "video" && recordedBlobs.video) {
        const fd = new FormData();
        fd.append("video", recordedBlobs.video, `${sessionName}_video.webm`);
        if (recordedBlobs.host) fd.append("audio", recordedBlobs.host, `${sessionName}_audio.webm`);
        fd.append("title", episodeTitle || sessionName); fd.append("description", episodeDescription);
        fd.append("episode_number", episodeNumber); fd.append("show_notes", showNotes);
        fd.append("duration", Math.floor(recordingTime)); fd.append("chapters", JSON.stringify(chapters));
        fd.append("session_id", sessionId); fd.append("has_video", "true");
        const res = await fetch(`${bu}/api/podcast-studio/publish-episode`, { method: "POST", headers: { Authorization: `Bearer ${tok}` }, body: fd });
        const data = await res.json();
        setStatus(data?.success ? "\u2713 Video episode published!" : `\u2717 ${data?.error || "Publish failed"}`);
      } else {
        const mainBlob = recordedBlobs.host;
        if (!mainBlob) { setStatus("\u26a0 No host recording"); setIsExporting(false); return; }
        const fd = new FormData();
        fd.append("file", mainBlob, `${sessionName}.webm`);
        fd.append("title", episodeTitle || sessionName); fd.append("description", episodeDescription);
        fd.append("episode_number", episodeNumber); fd.append("show_notes", showNotes);
        fd.append("duration", Math.floor(recordingTime)); fd.append("chapters", JSON.stringify(chapters)); fd.append("session_id", sessionId);
        const res = await fetch(`${bu}/api/podcast-studio/publish-episode`, { method: "POST", headers: { Authorization: `Bearer ${tok}` }, body: fd });
        const data = await res.json();
        setStatus(data?.success ? "\u2713 Episode published!" : `\u2717 ${data?.error || "Publish failed"}`);
      }
    } catch (err) { setStatus(`\u2717 Export failed: ${err.message}`); }
    finally { setIsExporting(false); }
  }, [recordedBlobs, sessionId, sessionName, episodeTitle, episodeDescription, episodeNumber, showNotes, recordingTime, chapters]);

  const downloadRecording = useCallback((trackId) => {
    const blob = recordedBlobs[trackId]; if (!blob) return;
    const url = URL.createObjectURL(blob); const a = document.createElement("a");
    a.href = url; a.download = `${sessionName}_${trackId}.webm`; a.click(); URL.revokeObjectURL(url);
  }, [recordedBlobs, sessionName]);

  // ── Volume ──
  const setHostVolume = useCallback((vol) => { setLocalTrack((prev) => ({ ...prev, volume: vol })); if (localGainRef.current) localGainRef.current.gain.value = vol; }, []);
  const setGuestVolume = useCallback((guestId, vol) => { setGuestTracks((prev) => prev.map((t) => (t.id === guestId ? { ...t, volume: vol } : t))); if (remoteGainsRef.current[guestId]) remoteGainsRef.current[guestId].gain.value = vol; }, []);
  const toggleGuestMute = useCallback((guestId) => { setGuestTracks((prev) => prev.map((t) => { if (t.id !== guestId) return t; const m = !t.muted; if (remoteGainsRef.current[guestId]) remoteGainsRef.current[guestId].gain.value = m ? 0 : t.volume; return { ...t, muted: m }; })); }, []);

  // ── Init on mount ──
  useEffect(() => { initLocalAudio(); initSocket(); initSoundboardDest(); }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="podcast-studio">
      {/* Hidden video elements for canvas compositing */}
      <video ref={cameraVideoRef} autoPlay muted playsInline style={{ display: "none" }} />
      <video ref={screenVideoRef} autoPlay muted playsInline style={{ display: "none" }} />
      {/* Hidden guest video elements for multi-person canvas compositing */}
      {connectedGuests.map((guest) => (
        <video key={`gv_${guest.id}`} autoPlay playsInline style={{ display: "none" }}
          ref={(el) => {
            if (el) {
              guestVideoRefs.current[guest.id] = el;
              const stream = remoteStreamsRef.current[guest.id];
              if (stream && el.srcObject !== stream) el.srcObject = stream;
            }
          }} />
      ))}

      {/* ═══ HEADER ═══ */}
      <div className="ps-header">
        <div className="ps-header-left">
          <h1 className="ps-logo">{"\u{1f399}\ufe0f"} Podcast Studio</h1>
          <input className="ps-session-name" value={sessionName} onChange={(e) => setSessionName(e.target.value)} placeholder="Episode name..." />
        </div>
        <div className="ps-header-center">
          <div className="ps-transport">
            <button className={`ps-transport-btn ps-rec-btn ${isRecording ? "active" : ""}`} onClick={isRecording ? stopRecording : startRecording}>
              {isRecording ? <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2"/></svg> : <span className="ps-rec-dot-large" />}
            </button>
            {isRecording && (
              <button className={`ps-transport-btn ${isPaused ? "paused" : ""}`} onClick={pauseRecording}>
                {isPaused ? <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21"/></svg>
                  : <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="4" width="5" height="16" rx="1"/><rect x="14" y="4" width="5" height="16" rx="1"/></svg>}
              </button>
            )}
            <div className={`ps-timer ${isRecording ? "recording" : ""}`}>
              {isRecording && <span className="ps-rec-indicator">{"\u25cf"}</span>}
              {fmtTime(recordingTime)}
            </div>
            {isRecording && (
              <button className="ps-transport-btn ps-chapter-btn" onClick={() => { const t = prompt("Chapter title:"); if (t) { setChapterInput(t); setTimeout(addChapter, 0); } }} title="Add Chapter">{"\u{1f4cc}"}</button>
            )}
          </div>
        </div>
        <div className="ps-header-right">
          <button className="ps-invite-btn" onClick={() => setShowInviteModal(true)}>
            {"\u{1f465}"} Invite ({connectedGuests.length}/{MAX_GUESTS})
          </button>
          <select className="ps-device-select" value={selectedDevice} onChange={(e) => setSelectedDevice(e.target.value)}>
            <option value="default">Default Mic</option>
            {inputDevices.map((d) => <option key={d.deviceId} value={d.deviceId}>{d.label || `Mic ${d.deviceId.slice(0, 6)}`}</option>)}
          </select>
          <span className="ps-status">{status}</span>
        </div>
      </div>

      {/* ═══ TABS (updated — added Video tab) ═══ */}
      <div className="ps-panel-tabs">
        {["tracks", "video", "soundboard", "chapters", "metadata", "export"].map((id) => (
          <button key={id} className={`ps-panel-tab ${activePanel === id ? "active" : ""}`} onClick={() => setActivePanel(id)}>
            {{ tracks: "\u{1f39a}\ufe0f Tracks", video: "\u{1f4f9} Video", soundboard: "\u{1f50a} Soundboard", chapters: "\u{1f4cc} Chapters", metadata: "\u{1f4dd} Episode Info", export: "\u{1f4e4} Export" }[id]}
          </button>
        ))}
      </div>

      {/* ═══ MAIN PANELS ═══ */}
      <div className="ps-main">
        {/* ─── TRACKS PANEL ─── */}
        {activePanel === "tracks" && (
          <div className="ps-tracks-panel">
            <div className="ps-track host">
              <div className="ps-track-color" style={{ background: localTrack.color }} />
              <div className="ps-track-info">
                <span className="ps-track-label">{"\u{1f399}\ufe0f"} {localTrack.name} (Host)</span>
                <LevelMeter analyser={localAnalyserRef.current} />
              </div>
              <LiveWaveform analyser={localAnalyserRef.current} color={localTrack.color} />
              <div className="ps-track-controls">
                <input type="range" min="0" max="1" step="0.01" value={localTrack.volume} onChange={(e) => setHostVolume(parseFloat(e.target.value))} className="ps-volume-slider" />
                <span className="ps-vol-label">{Math.round(localTrack.volume * 100)}%</span>
                <button className={`ps-mute-btn ${localTrack.muted ? "active" : ""}`} onClick={() => setLocalTrack((prev) => ({ ...prev, muted: !prev.muted }))}>{localTrack.muted ? "\u{1f507}" : "\u{1f50a}"}</button>
              </div>
              {recordedBlobs.host && <button className="ps-download-btn" onClick={() => downloadRecording("host")}>{"\u{1f4be}"}</button>}
            </div>
            {guestTracks.map((guest) => (
              <div key={guest.id} className="ps-track guest">
                <div className="ps-track-color" style={{ background: guest.color }} />
                <div className="ps-track-info">
                  <span className="ps-track-label">{"\u{1f399}\ufe0f"} {guest.name}</span>
                  <LevelMeter analyser={remoteAnalysersRef.current[guest.id]} />
                </div>
                <LiveWaveform analyser={remoteAnalysersRef.current[guest.id]} color={guest.color} />
                <div className="ps-track-controls">
                  <input type="range" min="0" max="1" step="0.01" value={guest.volume} onChange={(e) => setGuestVolume(guest.id, parseFloat(e.target.value))} className="ps-volume-slider" />
                  <span className="ps-vol-label">{Math.round(guest.volume * 100)}%</span>
                  <button className={`ps-mute-btn ${guest.muted ? "active" : ""}`} onClick={() => toggleGuestMute(guest.id)}>{guest.muted ? "\u{1f507}" : "\u{1f50a}"}</button>
                </div>
                {recordedBlobs[guest.id] && <button className="ps-download-btn" onClick={() => downloadRecording(guest.id)}>{"\u{1f4be}"}</button>}
              </div>
            ))}
            {guestTracks.length === 0 && <div className="ps-empty-guests"><p>No guests yet. Click "Invite" to add people.</p></div>}
          </div>
        )}

        {/* ─── VIDEO PANEL (MERGED — Solo + Collab) ─── */}
        {activePanel === "video" && (
          <div className="ps-video-panel">

            {/* ── Participant Video Grid ── */}
            <div className="ps-video-grid-wrapper">
              {/* Layout selector bar */}
              <div className="ps-grid-layout-bar">
                <span className="ps-grid-label">{"\u{1f4f9}"} Video Layout</span>
                <div className="ps-grid-layout-pills">
                  {[
                    { id: "grid", label: "\u229e Grid", desc: "Equal tiles" },
                    { id: "spotlight", label: "\u{1f526} Spotlight", desc: "1 large + thumbnails" },
                    { id: "interview", label: "\u{1f399}\ufe0f Interview", desc: "Host 55% / Guest 45%" },
                    { id: "panel", label: "\u{1f3ac} Panel", desc: "Top row / Bottom row" },
                  ].map((lo) => (
                    <button key={lo.id} className={`ps-grid-pill ${guestVideoLayout === lo.id ? "active" : ""}`}
                      onClick={() => setGuestVideoLayout(lo.id)} title={lo.desc}>
                      {lo.label}
                    </button>
                  ))}
                </div>
                <span className="ps-grid-count">{"\u{1f465}"} {1 + connectedGuests.length} participant{connectedGuests.length !== 0 ? "s" : ""}</span>
              </div>

              {/* Video tiles */}
              <div className={`ps-video-tiles ps-layout-${guestVideoLayout} ps-tiles-${1 + connectedGuests.length}`}>
                {/* Host tile (you) */}
                <div className={`ps-video-tile host ${spotlightUserId === "host" ? "spotlight" : ""} ${guestVideoLayout === "spotlight" && !spotlightUserId ? "spotlight" : ""}`}
                  onClick={() => guestVideoLayout === "spotlight" && setSpotlightUserId("host")}>
                  {cameraStream ? (
                    <video ref={(el) => { if (el && cameraStream) el.srcObject = cameraStream; }}
                      autoPlay muted playsInline className="ps-tile-video"
                      style={mirrorCamera ? { transform: "scaleX(-1)" } : {}} />
                  ) : (
                    <div className="ps-tile-placeholder">
                      <span className="ps-tile-avatar">{(user?.username || "H")[0].toUpperCase()}</span>
                    </div>
                  )}
                  <div className="ps-tile-label">
                    <span className="ps-tile-name">{"\u{1f451}"} {user?.username || "Host"} (You)</span>
                    {!cameraStream && <span className="ps-tile-cam-off">{"\u{1f4f9}\u274c"}</span>}
                  </div>
                  <LiveWaveform analyser={localAnalyserRef.current} color="#00ffc8" height={24} />
                </div>

                {/* Guest tiles */}
                {connectedGuests.map((guest, i) => {
                  const guestStream = remoteStreamsRef.current[guest.id];
                  const hasGuestVideo = guestStream && guestStream.getVideoTracks().length > 0;
                  const guestTrack = guestTracks.find((t) => t.id === guest.id);
                  return (
                    <div key={guest.id} className={`ps-video-tile guest ${spotlightUserId === guest.id ? "spotlight" : ""}`}
                      onClick={() => guestVideoLayout === "spotlight" && setSpotlightUserId(guest.id)}>
                      {hasGuestVideo ? (
                        <video autoPlay playsInline className="ps-tile-video"
                          ref={(el) => { if (el && guestStream) el.srcObject = guestStream; }} />
                      ) : (
                        <div className="ps-tile-placeholder">
                          <span className="ps-tile-avatar">{(guest.name || "G")[0].toUpperCase()}</span>
                        </div>
                      )}
                      <div className="ps-tile-label">
                        <span className="ps-tile-name">{guest.name}</span>
                        {!hasGuestVideo && <span className="ps-tile-cam-off">{"\u{1f4f9}\u274c"}</span>}
                      </div>
                      {remoteAnalysersRef.current[guest.id] && (
                        <LiveWaveform analyser={remoteAnalysersRef.current[guest.id]} color={guestTrack?.color || "#FF6600"} height={24} />
                      )}
                    </div>
                  );
                })}

                {/* Empty slots */}
                {connectedGuests.length === 0 && (
                  <div className="ps-video-tile empty" onClick={() => setShowInviteModal(true)}>
                    <div className="ps-tile-placeholder empty-slot">
                      <span className="ps-tile-add">{"\u2795"}</span>
                      <span>Invite Guest</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Screen share overlay (if active) */}
              {screenStream && (
                <div className="ps-screen-share-preview">
                  <div className="ps-screen-share-header">
                    <span>{"\u{1f5a5}\ufe0f"} Screen Share Active</span>
                    <button className="ps-screen-stop-btn" onClick={stopScreenShare}>{"\u{2716}"} Stop</button>
                  </div>
                  <video ref={(el) => { if (el && screenStream) el.srcObject = screenStream; }}
                    autoPlay muted playsInline className="ps-screen-share-video" />
                </div>
              )}
            </div>

            {/* ── Canvas Preview (for recording composite) ── */}
            {hasVideo && (
              <div className="ps-canvas-section">
                <div className="ps-canvas-header">
                  <span>{"\u{1f3ac}"} Recording Preview</span>
                  <span className="ps-canvas-hint">This is what gets recorded</span>
                </div>
                <div className="ps-video-preview-wrapper small">
                  <canvas ref={compositeCanvasRef} width={1280} height={720} className="ps-composite-canvas" />
                </div>
              </div>
            )}
            {!hasVideo && <canvas ref={compositeCanvasRef} width={1280} height={720} style={{ display: "none" }} />}

            {/* ── Video Controls ── */}
            <div className="ps-video-controls">
              <div className="ps-video-buttons">
                <button className={`ps-video-btn ${cameraStream ? "active" : ""}`} onClick={cameraStream ? stopCamera : () => startCamera(selectedCamera)}>
                  {cameraStream ? "\u{1f4f9} Stop Camera" : "\u{1f4f9} Start Camera"}
                </button>
                <button className={`ps-video-btn ${screenStream ? "active" : ""}`} onClick={screenStream ? stopScreenShare : startScreenShare}>
                  {screenStream ? "\u{1f5a5}\ufe0f Stop Screen" : "\u{1f5a5}\ufe0f Share Screen"}
                </button>
                <button className={`ps-video-btn mirror-btn ${mirrorCamera ? "active" : ""}`} onClick={() => setMirrorCamera(!mirrorCamera)} disabled={!cameraStream}>
                  {"\u{1fa9e}"} Mirror {mirrorCamera ? "ON" : "OFF"}
                </button>
              </div>

              {availableCameras.length > 0 && (
                <div className="ps-video-setting">
                  <label>Camera</label>
                  <select value={selectedCamera} onChange={(e) => { setSelectedCamera(e.target.value); if (cameraStream) startCamera(e.target.value); }}>
                    <option value="">Default</option>
                    {availableCameras.map((d) => <option key={d.deviceId} value={d.deviceId}>{d.label || `Camera ${d.deviceId.slice(0,6)}`}</option>)}
                  </select>
                </div>
              )}

              <div className="ps-video-setting">
                <label>Resolution</label>
                <div className="ps-resolution-pills">
                  {["480p", "720p", "1080p", "4K"].map((r) => (
                    <button key={r} className={`ps-res-pill ${cameraResolution === r ? "active" : ""}`} onClick={() => setCameraResolution(r)}>{r}</button>
                  ))}
                </div>
              </div>

              {/* Recording Layout (for canvas composite) */}
              <div className="ps-video-setting">
                <label>Recording Layout</label>
                <div className="ps-layout-selector">
                  {Object.entries(VIDEO_LAYOUTS).map(([key, lo]) => (
                    <button key={key} className={`ps-layout-btn ${videoLayout === key ? "active" : ""}`} onClick={() => setVideoLayout(key)}
                      disabled={(lo.cam && !cameraStream) || (lo.scr && !screenStream)} title={lo.label}>
                      <span className="ps-layout-icon">{lo.icon}</span>
                      <span className="ps-layout-name">{lo.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {currentLayout.pip && currentLayout.pip !== "side-by-side" && (
                <div className="ps-video-setting">
                  <label>PiP Size: {pipSize}%</label>
                  <input type="range" min="15" max="40" step="1" value={pipSize} onChange={(e) => setPipSize(parseInt(e.target.value))} className="ps-pip-slider" />
                </div>
              )}

              {videoError && <div className="ps-video-error">{videoError}</div>}

              <div className="ps-video-status">
                {cameraStream && <span className="ps-vstatus-badge cam">{"\u{1f4f9}"} Camera: {cameraResolution}</span>}
                {screenStream && <span className="ps-vstatus-badge scr">{"\u{1f5a5}\ufe0f"} Screen</span>}
                {!cameraStream && !screenStream && <span className="ps-vstatus-badge off">Audio Only</span>}
                {isRecording && hasVideo && <span className="ps-vstatus-badge rec">{"\u25cf"} Recording Video</span>}
              </div>
            </div>
          </div>
        )}

        {/* ─── SOUNDBOARD PANEL ─── */}
        {activePanel === "soundboard" && (
          <div className="ps-soundboard-panel">
            <h3>Soundboard</h3>
            <p className="ps-hint">Drag audio files onto pads or click to load. Press 1-8 to trigger.</p>
            <div className="ps-soundboard-grid">
              {soundboard.map((pad) => (
                <div key={pad.id} className={`ps-pad ${soundboardBuffers[pad.id] ? "loaded" : ""}`} style={{ "--pad-color": pad.color }}
                  onClick={() => playSoundboardPad(pad.id)}
                  onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer?.files?.[0]; if (f?.type.startsWith("audio/")) loadSoundboardFile(pad.id, f); }}
                  onDragOver={(e) => e.preventDefault()}>
                  <span className="ps-pad-label">{pad.label}</span>
                  <span className="ps-pad-key">{pad.key}</span>
                  {!soundboardBuffers[pad.id] && (
                    <label className="ps-pad-load"><input type="file" accept="audio/*" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) loadSoundboardFile(pad.id, f); }} />Load</label>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── CHAPTERS PANEL ─── */}
        {activePanel === "chapters" && (
          <div className="ps-chapters-panel">
            <h3>Chapter Markers</h3>
            <div className="ps-chapter-add">
              <input className="ps-chapter-input" value={chapterInput} onChange={(e) => setChapterInput(e.target.value)} placeholder="Chapter title..." onKeyDown={(e) => e.key === "Enter" && addChapter()} />
              <button className="ps-chapter-add-btn" onClick={addChapter}>+ Add at {fmtTime(isRecording ? recordingTime : 0)}</button>
            </div>
            <div className="ps-chapter-list">
              {chapters.length === 0 ? <p className="ps-empty">No chapters yet.</p> : chapters.map((ch, i) => (
                <div key={ch.id} className="ps-chapter-item">
                  <span className="ps-chapter-num">{i + 1}</span>
                  <span className="ps-chapter-time">{ch.formattedTime}</span>
                  <span className="ps-chapter-title">{ch.title}</span>
                  <button className="ps-chapter-remove" onClick={() => setChapters((prev) => prev.filter((c) => c.id !== ch.id))}>{"\u2715"}</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── METADATA PANEL ─── */}
        {activePanel === "metadata" && (
          <div className="ps-metadata-panel">
            <h3>Episode Information</h3>
            <div className="ps-meta-form">
              <label>Episode Title<input value={episodeTitle} onChange={(e) => setEpisodeTitle(e.target.value)} placeholder="My Awesome Episode" /></label>
              <label>Episode Number<input type="number" min="1" value={episodeNumber} onChange={(e) => setEpisodeNumber(parseInt(e.target.value) || 1)} /></label>
              <label>Description<textarea value={episodeDescription} onChange={(e) => setEpisodeDescription(e.target.value)} placeholder="What's this episode about?" rows={4} /></label>
              <label>Show Notes<textarea value={showNotes} onChange={(e) => setShowNotes(e.target.value)} placeholder="Links, credits, timestamps..." rows={6} /></label>
            </div>
          </div>
        )}

        {/* ─── EXPORT PANEL (UPDATED — video export) ─── */}
        {activePanel === "export" && (
          <div className="ps-export-panel">
            <h3>Export & Publish</h3>
            {Object.keys(recordedBlobs).length === 0 ? (
              <div className="ps-export-empty"><p>Record an episode first, then export here.</p></div>
            ) : (
              <>
                <div className="ps-export-info">
                  <p><strong>Duration:</strong> {fmtTime(recordingTime)}</p>
                  <p><strong>Audio Tracks:</strong> {Object.keys(recordedBlobs).filter(k => k !== "video").length}</p>
                  <p><strong>Video:</strong> {recordedBlobs.video ? `\u2713 ${(recordedBlobs.video.size / 1024 / 1024).toFixed(1)} MB` : "None"}</p>
                  <p><strong>Chapters:</strong> {chapters.length}</p>
                </div>
                <div className="ps-export-actions">
                  {recordedBlobs.video && (
                    <button className="ps-export-btn primary" onClick={() => exportEpisode("video")} disabled={isExporting}>
                      {isExporting ? "Publishing..." : "\u{1f4f9} Publish Video Episode"}
                    </button>
                  )}
                  <button className="ps-export-btn primary" onClick={() => exportEpisode("mixdown")} disabled={isExporting}>
                    {isExporting ? "Publishing..." : "\u{1f399}\ufe0f Publish Audio Episode"}
                  </button>
                  <button className="ps-export-btn secondary" onClick={() => exportEpisode("stems")} disabled={isExporting}>
                    {"\u{1f4c1}"} Upload All Stems
                  </button>
                  <div className="ps-export-downloads">
                    <h4>Download Tracks</h4>
                    {Object.keys(recordedBlobs).map((trackId) => (
                      <button key={trackId} className="ps-export-dl-btn" onClick={() => downloadRecording(trackId)}>
                        {"\u{1f4be}"} {trackId === "host" ? localTrack.name : trackId === "soundboard" ? "Soundboard" : trackId === "video" ? "Video (.webm)" : guestTracks.find((g) => g.id === trackId)?.name || trackId}
                      </button>
                    ))}
                  </div>
                  <button className="ps-export-btn studio" onClick={() => { window.location.href = `/recording-studio?podcast_session=${sessionId}`; }}>
                    {"\u{1f39b}\ufe0f"} Open in Recording Studio
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* ═══ INVITE MODAL ═══ */}
      {showInviteModal && (
        <div className="ps-modal-overlay" onClick={() => setShowInviteModal(false)}>
          <div className="ps-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Invite Guest</h2>
            <p>Share this link \u2014 guests join directly, no account needed.</p>
            <div className="ps-invite-link-box">
              <input className="ps-invite-link-input" value={inviteLink} readOnly onClick={(e) => e.target.select()} />
              <button className="ps-copy-btn" onClick={copyInviteLink}>{inviteCopied ? "\u2713 Copied!" : "\u{1f4cb} Copy"}</button>
            </div>
            <div className="ps-invite-code"><span>Code:</span> <strong>{inviteCode}</strong></div>
            <div className="ps-invite-guests">
              <h4>Connected ({connectedGuests.length}/{MAX_GUESTS})</h4>
              {connectedGuests.length === 0 ? <p className="ps-empty">Waiting for guests...</p> : connectedGuests.map((g) => (
                <div key={g.id} className="ps-guest-item"><span className="ps-guest-dot" /><span>{g.name}</span></div>
              ))}
            </div>
            <button className="ps-modal-close" onClick={() => setShowInviteModal(false)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PodcastStudio;