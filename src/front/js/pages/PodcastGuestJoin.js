// =============================================================================
// PodcastGuestJoin.js — Guest Recording Page (No Account Required)
// =============================================================================
// Location: src/front/js/pages/PodcastGuestJoin.js
// Route: /podcast-join/:sessionId?code=XXXXX
// =============================================================================

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import "../../styles/PodcastStudio.css";

const SAMPLE_RATE = 48000;
const LOCAL_RECORD_MIME = (() => {
  if (typeof MediaRecorder !== "undefined") {
    if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) return "audio/webm;codecs=opus";
  }
  return "audio/webm";
})();

const ICE_SERVERS = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:stun1.l.google.com:19302" }] };

const fmtTime = (s) => {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
};

const LevelMeter = ({ analyser }) => {
  const [level, setLevel] = useState(0);
  const animRef = useRef(null);
  useEffect(() => {
    if (!analyser) return;
    const data = new Uint8Array(analyser.frequencyBinCount);
    const update = () => {
      analyser.getByteFrequencyData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) sum += data[i];
      setLevel(sum / (data.length * 255));
      animRef.current = requestAnimationFrame(update);
    };
    update();
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [analyser]);
  const pct = Math.min(level * 100, 100);
  const clr = pct > 85 ? "#ff3b30" : pct > 60 ? "#ff9500" : "#00ffc8";
  return <div className="ps-level-meter"><div className="ps-level-meter-fill" style={{ width: `${pct}%`, background: clr }} /></div>;
};

const PodcastGuestJoin = () => {
  const { sessionId } = useParams();
  const [searchParams] = useSearchParams();
  const inviteCode = searchParams.get("code") || "";

  const [guestName, setGuestName] = useState("");
  const [joined, setJoined] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [status, setStatus] = useState("Enter your name to join");
  const [hostName, setHostName] = useState("Host");
  const [inputDevices, setInputDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState("default");
  const [volume, setVolume] = useState(0.85);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [recordingBlob, setRecordingBlob] = useState(null);

  const audioCtxRef = useRef(null);
  const localStreamRef = useRef(null);
  const localAnalyserRef = useRef(null);
  const localGainRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const socketRef = useRef(null);
  const pcRef = useRef(null);
  const timerRef = useRef(null);
  const recordStartRef = useRef(0);
  const guestIdRef = useRef(`guest_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`);

  const backendUrl = process.env.REACT_APP_BACKEND_URL || "";

  useEffect(() => {
    navigator.mediaDevices.enumerateDevices()
      .then((d) => setInputDevices(d.filter((x) => x.kind === "audioinput")))
      .catch(console.error);
    return () => {
      if (socketRef.current) socketRef.current.disconnect();
      if (localStreamRef.current) localStreamRef.current.getTracks().forEach((t) => t.stop());
      if (audioCtxRef.current && audioCtxRef.current.state !== "closed") audioCtxRef.current.close();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const getCtx = useCallback(() => {
    if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: SAMPLE_RATE });
    }
    if (audioCtxRef.current.state === "suspended") audioCtxRef.current.resume();
    return audioCtxRef.current;
  }, []);

  const initMic = useCallback(async () => {
    try {
      const ctx = getCtx();
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { deviceId: selectedDevice !== "default" ? { exact: selectedDevice } : undefined, echoCancellation: true, noiseSuppression: true, autoGainControl: false, sampleRate: SAMPLE_RATE },
      });
      localStreamRef.current = stream;
      const source = ctx.createMediaStreamSource(stream);
      const gain = ctx.createGain();
      gain.gain.value = volume;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(gain);
      gain.connect(analyser);
      localGainRef.current = gain;
      localAnalyserRef.current = analyser;
      return stream;
    } catch (err) {
      setStatus(`Mic error: ${err.message}`);
      return null;
    }
  }, [getCtx, selectedDevice, volume]);

  const joinSession = useCallback(async () => {
    if (!guestName.trim()) { setStatus("Please enter your name"); return; }
    setStatus("Connecting...");

    const stream = await initMic();
    if (!stream) return;

    const io = (await import("socket.io-client")).default;
    socketRef.current = io(backendUrl, {
      transports: ["websocket", "polling"], withCredentials: true, path: "/socket.io/",
      namespace: "/podcast", query: { sessionId }, reconnection: true,
    });

    const socket = socketRef.current;

    socket.on("connect", () => {
      socket.emit("join_podcast_room", { sessionId, inviteCode, guestName: guestName.trim(), guestId: guestIdRef.current });
      setJoined(true);
      setStatus("Connected — waiting for host to start recording");
    });

    socket.on("session_info", ({ hostName: hn }) => setHostName(hn));

    socket.on("podcast_offer", async ({ offer, from, fromId }) => {
      try {
        const ctx = getCtx();
        const pc = new RTCPeerConnection(ICE_SERVERS);
        pcRef.current = pc;
        stream.getAudioTracks().forEach((track) => pc.addTrack(track, stream));

        pc.ontrack = (event) => {
          const rs = event.streams[0];
          const src = ctx.createMediaStreamSource(rs);
          const g = ctx.createGain();
          g.gain.value = 0.85;
          src.connect(g);
          g.connect(ctx.destination);
        };

        pc.onicecandidate = (event) => {
          if (event.candidate) socket.emit("podcast_ice", { candidate: event.candidate, sessionId, targetSocketId: from, fromId: guestIdRef.current });
        };

        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit("podcast_answer", { answer, sessionId, targetSocketId: from, fromId: guestIdRef.current });
      } catch (err) {
        setStatus(`Connection error: ${err.message}`);
      }
    });

    socket.on("podcast_ice", async ({ candidate }) => {
      if (pcRef.current && candidate) await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
    });

    socket.on("recording_started", () => {
      if (!localStreamRef.current) return;
      const recorder = new MediaRecorder(localStreamRef.current, { mimeType: LOCAL_RECORD_MIME, audioBitsPerSecond: 256000 });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: LOCAL_RECORD_MIME });
        setRecordingBlob(blob);
        uploadRecording(blob);
      };
      recorder.start(1000);
      recorderRef.current = recorder;
      recordStartRef.current = performance.now();
      timerRef.current = setInterval(() => setRecordingTime((performance.now() - recordStartRef.current) / 1000), 100);
      setIsRecording(true);
      setStatus("● Recording...");
    });

    socket.on("recording_stopped", () => {
      if (recorderRef.current && recorderRef.current.state !== "inactive") recorderRef.current.stop();
      if (timerRef.current) clearInterval(timerRef.current);
      setIsRecording(false);
      setStatus("Uploading recording...");
    });

    socket.on("disconnect", () => setStatus("Disconnected"));
    socket.on("invalid_code", () => { setStatus("Invalid invite code"); setJoined(false); });
  }, [guestName, initMic, backendUrl, sessionId, inviteCode, getCtx]);

  const uploadRecording = useCallback(async (blob) => {
    try {
      setUploadProgress(0);
      const fd = new FormData();
      fd.append("file", blob, `${guestName}_recording.webm`);
      fd.append("session_id", sessionId);
      fd.append("guest_name", guestName);
      fd.append("track_id", guestIdRef.current);
      fd.append("type", "guest_recording");

      const xhr = new XMLHttpRequest();
      xhr.open("POST", `${backendUrl}/api/podcast-studio/upload-track`);
      const tok = localStorage.getItem("token") || sessionStorage.getItem("token");
      if (tok) xhr.setRequestHeader("Authorization", `Bearer ${tok}`);

      xhr.upload.onprogress = (e) => { if (e.lengthComputable) setUploadProgress(Math.round((e.loaded / e.total) * 100)); };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) { setUploadProgress(100); setStatus("Recording uploaded! You can close this tab."); }
        else setStatus("Upload failed — use Download button below");
      };
      xhr.onerror = () => setStatus("Upload failed — use Download button below");
      xhr.send(fd);
    } catch (err) {
      setStatus(`Upload error: ${err.message}`);
    }
  }, [guestName, sessionId, backendUrl]);

  const downloadBackup = useCallback(() => {
    if (!recordingBlob) return;
    const url = URL.createObjectURL(recordingBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${guestName}_podcast_recording.webm`;
    a.click();
    URL.revokeObjectURL(url);
  }, [recordingBlob, guestName]);

  // ── PRE-JOIN SCREEN ──
  if (!joined) {
    return (
      <div className="podcast-studio guest-join">
        <div className="ps-guest-join-card">
          <h1>🎙️ Join Podcast Session</h1>
          <p className="ps-guest-join-subtitle">You've been invited to record a podcast episode</p>
          <div className="ps-guest-join-form">
            <label>Your Name
              <input value={guestName} onChange={(e) => setGuestName(e.target.value)} placeholder="Enter your name..." onKeyDown={(e) => e.key === "Enter" && joinSession()} autoFocus />
            </label>
            <label>Microphone
              <select value={selectedDevice} onChange={(e) => setSelectedDevice(e.target.value)}>
                <option value="default">Default Mic</option>
                {inputDevices.map((d) => <option key={d.deviceId} value={d.deviceId}>{d.label || `Mic ${d.deviceId.slice(0, 6)}`}</option>)}
              </select>
            </label>
            <button className="ps-guest-join-btn" onClick={joinSession}>Join Session</button>
            <p className="ps-guest-join-note">No account required. Audio records locally for best quality.</p>
          </div>
          <span className="ps-status">{status}</span>
        </div>
      </div>
    );
  }

  // ── IN-SESSION SCREEN ──
  return (
    <div className="podcast-studio guest-session">
      <div className="ps-header">
        <h1 className="ps-logo">🎙️ Podcast Session</h1>
        <div className="ps-guest-session-info">
          <span>Host: <strong>{hostName}</strong></span>
          <span>You: <strong>{guestName}</strong></span>
        </div>
        <span className="ps-status">{status}</span>
      </div>

      <div className="ps-guest-main">
        <div className="ps-guest-mic-area">
          {isRecording && (
            <div className="ps-guest-recording-indicator">
              <span className="ps-rec-indicator large">●</span>
              <span className="ps-timer recording">{fmtTime(recordingTime)}</span>
            </div>
          )}
          <div className="ps-guest-meter-wrap">
            <LevelMeter analyser={localAnalyserRef.current} />
            <p className="ps-guest-mic-label">Your Microphone</p>
          </div>
          <div className="ps-guest-volume">
            <label>Volume</label>
            <input type="range" min="0" max="1" step="0.01" value={volume} onChange={(e) => { const v = parseFloat(e.target.value); setVolume(v); if (localGainRef.current) localGainRef.current.gain.value = v; }} />
            <span>{Math.round(volume * 100)}%</span>
          </div>

          {!isRecording && !recordingBlob && <p className="ps-guest-waiting">Waiting for host to start recording...</p>}

          {uploadProgress !== null && (
            <div className="ps-guest-upload-progress">
              <div className="ps-guest-upload-bar"><div className="ps-guest-upload-fill" style={{ width: `${uploadProgress}%` }} /></div>
              <span>{uploadProgress}% uploaded</span>
            </div>
          )}

          {recordingBlob && (
            <button className="ps-guest-download-backup" onClick={downloadBackup}>💾 Download Recording Backup</button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PodcastGuestJoin;