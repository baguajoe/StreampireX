// =============================================================================
// PodcastStudio.js — In-App Podcast Recording Studio
// =============================================================================
// Location: src/front/js/pages/PodcastStudio.js
// Route: /podcast-studio
//
// Simplified DAW interface for podcast recording:
// - Host + up to 3 remote guests via WebRTC
// - Local high-quality recording per participant (double-ender)
// - Real-time monitoring with low-latency WebRTC audio
// - Per-track volume/mute controls
// - Soundboard for intros/stingers/SFX
// - Chapter markers on timeline
// - Episode metadata & direct publish to podcast feed
// - Export: stereo mixdown, multitrack stems, or open in Recording Studio
// =============================================================================

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import io from "socket.io-client";
import "../../styles/PodcastStudio.css";

// ── Constants ──
const MAX_GUESTS = 3;
const SAMPLE_RATE = 48000;
const LOCAL_RECORD_MIME = (() => {
  if (typeof MediaRecorder !== "undefined") {
    if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) return "audio/webm;codecs=opus";
    if (MediaRecorder.isTypeSupported("audio/webm")) return "audio/webm";
  }
  return "audio/webm";
})();

const SOUNDBOARD_DEFAULTS = [
  { id: "intro", label: "🎵 Intro", key: "1", color: "#00ffc8" },
  { id: "outro", label: "🎵 Outro", key: "2", color: "#00ffc8" },
  { id: "sting", label: "⚡ Sting", key: "3", color: "#FF6600" },
  { id: "applause", label: "👏 Applause", key: "4", color: "#ff9500" },
  { id: "laugh", label: "😂 Laugh", key: "5", color: "#ff9500" },
  { id: "rimshot", label: "🥁 Rimshot", key: "6", color: "#af52de" },
  { id: "transition", label: "🔄 Transition", key: "7", color: "#007aff" },
  { id: "silence", label: "🔇 Silence", key: "8", color: "#666" },
];

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

// ── Helpers ──
const fmtTime = (s) => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
    : `${m}:${String(sec).padStart(2, "0")}`;
};

const generateSessionId = () =>
  `pod_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 6)}`;

const generateInviteCode = () =>
  Math.random().toString(36).substr(2, 8).toUpperCase();

// =============================================================================
// LIVE WAVEFORM VISUALIZER
// =============================================================================
const LiveWaveform = React.memo(({ analyser, color, height = 48 }) => {
  const canvasRef = useRef(null);
  const animRef = useRef(null);

  useEffect(() => {
    if (!analyser) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const bufLen = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufLen);

    const draw = () => {
      analyser.getByteTimeDomainData(dataArray);
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      ctx.strokeStyle = color || "#00ffc8";
      ctx.lineWidth = 1.5;
      ctx.beginPath();

      const sliceWidth = w / bufLen;
      let x = 0;
      for (let i = 0; i < bufLen; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * h) / 2;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        x += sliceWidth;
      }
      ctx.lineTo(w, h / 2);
      ctx.stroke();

      animRef.current = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [analyser, color]);

  return (
    <canvas ref={canvasRef} width={300} height={height} className="ps-waveform-canvas" />
  );
});

// =============================================================================
// LEVEL METER
// =============================================================================
const LevelMeter = React.memo(({ analyser }) => {
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

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [analyser]);

  const pct = Math.min(level * 100, 100);
  const clr = pct > 85 ? "#ff3b30" : pct > 60 ? "#ff9500" : "#00ffc8";

  return (
    <div className="ps-level-meter">
      <div className="ps-level-meter-fill" style={{ width: `${pct}%`, background: clr }} />
    </div>
  );
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
  const [localTrack, setLocalTrack] = useState({
    name: user?.username || "Host",
    volume: 0.85,
    muted: false,
    color: "#00ffc8",
  });
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

  // ── Timer ──
  const timerRef = useRef(null);
  const recordStartRef = useRef(0);
  const pauseOffsetRef = useRef(0);
  const syncTimestampRef = useRef(null);

  // ── Recorded ──
  const [recordedBlobs, setRecordedBlobs] = useState({});
  const [isExporting, setIsExporting] = useState(false);

  // ─────────────────────────────────────────────────────────
  // AUDIO CONTEXT
  // ─────────────────────────────────────────────────────────
  const getCtx = useCallback(() => {
    if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: SAMPLE_RATE });
    }
    if (audioCtxRef.current.state === "suspended") audioCtxRef.current.resume();
    return audioCtxRef.current;
  }, []);

  // ─────────────────────────────────────────────────────────
  // ENUMERATE DEVICES
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    navigator.mediaDevices
      .enumerateDevices()
      .then((d) => setInputDevices(d.filter((x) => x.kind === "audioinput")))
      .catch(console.error);

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
      if (localStreamRef.current) localStreamRef.current.getTracks().forEach((t) => t.stop());
      if (audioCtxRef.current && audioCtxRef.current.state !== "closed") audioCtxRef.current.close();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // ─────────────────────────────────────────────────────────
  // INIT LOCAL MIC
  // ─────────────────────────────────────────────────────────
  const initLocalAudio = useCallback(async () => {
    try {
      const ctx = getCtx();
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: selectedDevice !== "default" ? { exact: selectedDevice } : undefined,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: false,
          sampleRate: SAMPLE_RATE,
        },
      });

      localStreamRef.current = stream;

      const source = ctx.createMediaStreamSource(stream);
      const gain = ctx.createGain();
      gain.gain.value = localTrack.volume;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.8;

      source.connect(gain);
      gain.connect(analyser);
      // Not connected to destination to prevent feedback

      localGainRef.current = gain;
      localAnalyserRef.current = analyser;
      setIsMonitoring(true);
      setStatus("🎙️ Microphone connected");
      return stream;
    } catch (err) {
      setStatus(`✗ Mic error: ${err.message}`);
      return null;
    }
  }, [getCtx, selectedDevice, localTrack.volume]);

  // ─────────────────────────────────────────────────────────
  // SOCKET CONNECTION
  // ─────────────────────────────────────────────────────────
  const initSocket = useCallback(() => {
    const backendUrl = process.env.REACT_APP_BACKEND_URL;
    if (!backendUrl || socketRef.current?.connected) return;

    const token = localStorage.getItem("token") || sessionStorage.getItem("token");

    socketRef.current = io(backendUrl, {
      transports: ["websocket", "polling"],
      withCredentials: true,
      path: "/socket.io/",
      namespace: "/podcast",
      query: { token, sessionId },
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    const socket = socketRef.current;

    socket.on("connect", () => {
      socket.emit("create_podcast_room", {
        sessionId,
        inviteCode,
        hostName: user?.username || "Host",
        hostId: user?.id,
      });
      setStatus("🟢 Connected — ready to record");
    });

    socket.on("guest_joined", async ({ guestId, guestName, guestSocketId }) => {
      setConnectedGuests((prev) => [...prev, { id: guestId, name: guestName, socketId: guestSocketId }]);
      const guestColor = ["#FF6600", "#ff9500", "#af52de"][guestTracks.length % 3];
      setGuestTracks((prev) => [
        ...prev,
        { id: guestId, name: guestName, volume: 0.85, muted: false, color: guestColor },
      ]);
      await createPeerConnection(guestSocketId, guestId, true);
      setStatus(`🎙️ ${guestName} joined`);
    });

    socket.on("guest_left", ({ guestId }) => {
      setConnectedGuests((prev) => prev.filter((g) => g.id !== guestId));
      setGuestTracks((prev) => prev.filter((t) => t.id !== guestId));
      if (peerConnectionsRef.current[guestId]) {
        peerConnectionsRef.current[guestId].close();
        delete peerConnectionsRef.current[guestId];
        delete remoteAnalysersRef.current[guestId];
        delete remoteGainsRef.current[guestId];
        delete remoteStreamsRef.current[guestId];
      }
    });

    socket.on("podcast_offer", async ({ offer, from, fromId }) => {
      await handleOffer(offer, from, fromId);
    });

    socket.on("podcast_answer", async ({ answer, fromId }) => {
      const pc = peerConnectionsRef.current[fromId];
      if (pc) await pc.setRemoteDescription(new RTCSessionDescription(answer));
    });

    socket.on("podcast_ice", async ({ candidate, fromId }) => {
      const pc = peerConnectionsRef.current[fromId];
      if (pc && candidate) await pc.addIceCandidate(new RTCIceCandidate(candidate));
    });

    socket.on("sync_timestamp", ({ timestamp }) => {
      syncTimestampRef.current = timestamp;
    });

    socket.on("disconnect", () => setStatus("🔴 Disconnected — reconnecting..."));
    socket.on("connect_error", () => setStatus("⚠ Connection error"));
  }, [sessionId, inviteCode, user, guestTracks.length]);

  // ─────────────────────────────────────────────────────────
  // PEER CONNECTION
  // ─────────────────────────────────────────────────────────
  const createPeerConnection = useCallback(
    async (socketId, peerId, isInitiator) => {
      const ctx = getCtx();
      const pc = new RTCPeerConnection(ICE_SERVERS);
      peerConnectionsRef.current[peerId] = pc;

      if (localStreamRef.current) {
        localStreamRef.current.getAudioTracks().forEach((track) => {
          pc.addTrack(track, localStreamRef.current);
        });
      }

      pc.ontrack = (event) => {
        const remoteStream = event.streams[0];
        remoteStreamsRef.current[peerId] = remoteStream;

        const source = ctx.createMediaStreamSource(remoteStream);
        const gain = ctx.createGain();
        gain.gain.value = 0.85;
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 2048;

        source.connect(gain);
        gain.connect(analyser);
        gain.connect(ctx.destination);

        remoteGainsRef.current[peerId] = gain;
        remoteAnalysersRef.current[peerId] = analyser;
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socketRef.current?.emit("podcast_ice", {
            candidate: event.candidate,
            sessionId,
            targetSocketId: socketId,
            fromId: user?.id || "host",
          });
        }
      };

      if (isInitiator) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socketRef.current?.emit("podcast_offer", {
          offer,
          sessionId,
          targetSocketId: socketId,
          fromId: user?.id || "host",
        });
      }

      return pc;
    },
    [getCtx, sessionId, user]
  );

  const handleOffer = useCallback(
    async (offer, fromSocketId, fromId) => {
      const pc = await createPeerConnection(fromSocketId, fromId, false);
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socketRef.current?.emit("podcast_answer", {
        answer,
        sessionId,
        targetSocketId: fromSocketId,
        fromId: user?.id || "host",
      });
    },
    [createPeerConnection, sessionId, user]
  );

  // ─────────────────────────────────────────────────────────
  // RECORDING
  // ─────────────────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    if (!localStreamRef.current) await initLocalAudio();
    if (!localStreamRef.current) {
      setStatus("⚠ Cannot record — no microphone");
      return;
    }

    // Record local mic
    const localRecorder = new MediaRecorder(localStreamRef.current, {
      mimeType: LOCAL_RECORD_MIME,
      audioBitsPerSecond: 256000,
    });
    localChunksRef.current = [];
    localRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) localChunksRef.current.push(e.data);
    };
    localRecorder.start(1000);
    localRecorderRef.current = localRecorder;

    // Record remote guests
    Object.entries(remoteStreamsRef.current).forEach(([peerId, stream]) => {
      const recorder = new MediaRecorder(stream, { mimeType: LOCAL_RECORD_MIME, audioBitsPerSecond: 256000 });
      const chunks = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      recorder.start(1000);
      remoteRecordersRef.current[peerId] = { recorder, chunks };
    });

    // Record soundboard
    if (soundboardDestRef.current) {
      const sbStream = soundboardDestRef.current.stream;
      const sbRecorder = new MediaRecorder(sbStream, { mimeType: LOCAL_RECORD_MIME, audioBitsPerSecond: 128000 });
      soundboardChunksRef.current = [];
      sbRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) soundboardChunksRef.current.push(e.data);
      };
      sbRecorder.start(1000);
      soundboardRecorderRef.current = sbRecorder;
    }

    // Sync timestamp
    syncTimestampRef.current = Date.now();
    socketRef.current?.emit("recording_started", { sessionId, timestamp: syncTimestampRef.current });

    // Timer
    recordStartRef.current = performance.now() - pauseOffsetRef.current * 1000;
    timerRef.current = setInterval(() => {
      setRecordingTime((performance.now() - recordStartRef.current) / 1000);
    }, 100);

    setIsRecording(true);
    setIsPaused(false);
    setStatus("● Recording");
  }, [initLocalAudio, sessionId]);

  const pauseRecording = useCallback(() => {
    if (!isRecording) return;
    if (isPaused) {
      localRecorderRef.current?.resume();
      Object.values(remoteRecordersRef.current).forEach(({ recorder }) => recorder?.resume());
      soundboardRecorderRef.current?.resume();
      recordStartRef.current = performance.now() - recordingTime * 1000;
      timerRef.current = setInterval(() => {
        setRecordingTime((performance.now() - recordStartRef.current) / 1000);
      }, 100);
      setIsPaused(false);
      setStatus("● Recording");
    } else {
      localRecorderRef.current?.pause();
      Object.values(remoteRecordersRef.current).forEach(({ recorder }) => recorder?.pause());
      soundboardRecorderRef.current?.pause();
      if (timerRef.current) clearInterval(timerRef.current);
      pauseOffsetRef.current = recordingTime;
      setIsPaused(true);
      setStatus("⏸ Paused");
    }
  }, [isRecording, isPaused, recordingTime]);

  const stopRecording = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);

    const blobs = {};
    let pendingCount = 1; // host
    const remoteIds = Object.keys(remoteRecordersRef.current);
    pendingCount += remoteIds.length;
    const hasSb = soundboardRecorderRef.current && soundboardRecorderRef.current.state !== "inactive";
    if (hasSb) pendingCount++;

    const checkDone = () => {
      pendingCount--;
      if (pendingCount <= 0) {
        setRecordedBlobs({ ...blobs });
        setStatus(`✓ Recorded ${fmtTime(recordingTime)} — ${Object.keys(blobs).length} tracks`);
      }
    };

    // Stop host
    if (localRecorderRef.current && localRecorderRef.current.state !== "inactive") {
      localRecorderRef.current.onstop = () => {
        blobs.host = new Blob(localChunksRef.current, { type: LOCAL_RECORD_MIME });
        checkDone();
      };
      localRecorderRef.current.stop();
    } else {
      checkDone();
    }

    // Stop remotes
    remoteIds.forEach((peerId) => {
      const { recorder, chunks } = remoteRecordersRef.current[peerId];
      if (recorder && recorder.state !== "inactive") {
        recorder.onstop = () => {
          blobs[peerId] = new Blob(chunks, { type: LOCAL_RECORD_MIME });
          checkDone();
        };
        recorder.stop();
      } else {
        checkDone();
      }
    });

    // Stop soundboard
    if (hasSb) {
      soundboardRecorderRef.current.onstop = () => {
        blobs.soundboard = new Blob(soundboardChunksRef.current, { type: LOCAL_RECORD_MIME });
        checkDone();
      };
      soundboardRecorderRef.current.stop();
    }

    socketRef.current?.emit("recording_stopped", { sessionId });
    setIsRecording(false);
    setIsPaused(false);
  }, [recordingTime, sessionId]);

  // ─────────────────────────────────────────────────────────
  // SOUNDBOARD
  // ─────────────────────────────────────────────────────────
  const initSoundboardDest = useCallback(() => {
    if (soundboardDestRef.current) return;
    const ctx = getCtx();
    soundboardDestRef.current = ctx.createMediaStreamDestination();
  }, [getCtx]);

  const loadSoundboardFile = useCallback(
    async (padId, file) => {
      try {
        const ctx = getCtx();
        const ab = await file.arrayBuffer();
        const buffer = await ctx.decodeAudioData(ab);
        setSoundboardBuffers((prev) => ({ ...prev, [padId]: buffer }));
        setStatus(`✓ Loaded "${file.name}" → ${padId}`);
      } catch (err) {
        setStatus(`✗ Failed to load: ${err.message}`);
      }
    },
    [getCtx]
  );

  const playSoundboardPad = useCallback(
    (padId) => {
      const buffer = soundboardBuffers[padId];
      if (!buffer) return;
      const ctx = getCtx();
      initSoundboardDest();
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      if (soundboardDestRef.current) source.connect(soundboardDestRef.current);
      source.start();
    },
    [soundboardBuffers, getCtx, initSoundboardDest]
  );

  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      const pad = soundboard.find((p) => p.key === e.key);
      if (pad) playSoundboardPad(pad.id);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [soundboard, playSoundboardPad]);

  // ─────────────────────────────────────────────────────────
  // CHAPTERS
  // ─────────────────────────────────────────────────────────
  const addChapter = useCallback(() => {
    if (!chapterInput.trim()) return;
    const timestamp = isRecording ? recordingTime : 0;
    setChapters((prev) => [
      ...prev,
      { id: `ch_${Date.now()}`, title: chapterInput.trim(), timestamp, formattedTime: fmtTime(timestamp) },
    ]);
    setChapterInput("");
    setStatus(`📌 Chapter at ${fmtTime(timestamp)}`);
  }, [chapterInput, isRecording, recordingTime]);

  // ─────────────────────────────────────────────────────────
  // INVITE
  // ─────────────────────────────────────────────────────────
  const inviteLink = useMemo(() => {
    return `${window.location.origin}/podcast-join/${sessionId}?code=${inviteCode}`;
  }, [sessionId, inviteCode]);

  const copyInviteLink = useCallback(() => {
    navigator.clipboard.writeText(inviteLink).then(() => {
      setInviteCopied(true);
      setTimeout(() => setInviteCopied(false), 2000);
    });
  }, [inviteLink]);

  // ─────────────────────────────────────────────────────────
  // EXPORT
  // ─────────────────────────────────────────────────────────
  const exportEpisode = useCallback(
    async (mode = "mixdown") => {
      if (!Object.keys(recordedBlobs).length) {
        setStatus("⚠ No recording to export");
        return;
      }
      setIsExporting(true);
      setStatus("🔄 Exporting...");

      try {
        const tok = localStorage.getItem("token") || sessionStorage.getItem("token");
        const bu = process.env.REACT_APP_BACKEND_URL || "";

        if (mode === "stems") {
          for (const [trackId, blob] of Object.entries(recordedBlobs)) {
            const fd = new FormData();
            fd.append("file", blob, `${sessionName}_${trackId}.webm`);
            fd.append("session_id", sessionId);
            fd.append("track_id", trackId);
            fd.append("type", "stem");
            await fetch(`${bu}/api/podcast-studio/upload-track`, {
              method: "POST",
              headers: { Authorization: `Bearer ${tok}` },
              body: fd,
            });
          }
          setStatus("✓ Stems uploaded");
        } else {
          const mainBlob = recordedBlobs.host;
          if (!mainBlob) {
            setStatus("⚠ No host recording found");
            setIsExporting(false);
            return;
          }
          const fd = new FormData();
          fd.append("file", mainBlob, `${sessionName}.webm`);
          fd.append("title", episodeTitle || sessionName);
          fd.append("description", episodeDescription);
          fd.append("episode_number", episodeNumber);
          fd.append("show_notes", showNotes);
          fd.append("duration", Math.floor(recordingTime));
          fd.append("chapters", JSON.stringify(chapters));
          fd.append("session_id", sessionId);

          const res = await fetch(`${bu}/api/podcast-studio/publish-episode`, {
            method: "POST",
            headers: { Authorization: `Bearer ${tok}` },
            body: fd,
          });
          const data = await res.json();
          if (data?.success) {
            setStatus(`✓ Episode published!`);
          } else {
            setStatus(`✗ ${data?.error || "Publish failed"}`);
          }
        }
      } catch (err) {
        setStatus(`✗ Export failed: ${err.message}`);
      } finally {
        setIsExporting(false);
      }
    },
    [recordedBlobs, sessionId, sessionName, episodeTitle, episodeDescription, episodeNumber, showNotes, recordingTime, chapters]
  );

  const downloadRecording = useCallback(
    (trackId) => {
      const blob = recordedBlobs[trackId];
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${sessionName}_${trackId}.webm`;
      a.click();
      URL.revokeObjectURL(url);
    },
    [recordedBlobs, sessionName]
  );

  // ─────────────────────────────────────────────────────────
  // VOLUME
  // ─────────────────────────────────────────────────────────
  const setHostVolume = useCallback((vol) => {
    setLocalTrack((prev) => ({ ...prev, volume: vol }));
    if (localGainRef.current) localGainRef.current.gain.value = vol;
  }, []);

  const setGuestVolume = useCallback((guestId, vol) => {
    setGuestTracks((prev) => prev.map((t) => (t.id === guestId ? { ...t, volume: vol } : t)));
    if (remoteGainsRef.current[guestId]) remoteGainsRef.current[guestId].gain.value = vol;
  }, []);

  const toggleGuestMute = useCallback((guestId) => {
    setGuestTracks((prev) =>
      prev.map((t) => {
        if (t.id !== guestId) return t;
        const newMuted = !t.muted;
        if (remoteGainsRef.current[guestId]) remoteGainsRef.current[guestId].gain.value = newMuted ? 0 : t.volume;
        return { ...t, muted: newMuted };
      })
    );
  }, []);

  // ─────────────────────────────────────────────────────────
  // INIT ON MOUNT
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    initLocalAudio();
    initSocket();
    initSoundboardDest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ===================== RENDER =====================
  return (
    <div className="podcast-studio">
      {/* ═══════════ HEADER ═══════════ */}
      <div className="ps-header">
        <div className="ps-header-left">
          <h1 className="ps-logo">🎙️ Podcast Studio</h1>
          <input className="ps-session-name" value={sessionName} onChange={(e) => setSessionName(e.target.value)} placeholder="Episode name..." />
        </div>

        <div className="ps-header-center">
          <div className="ps-transport">
            <button className={`ps-transport-btn ps-rec-btn ${isRecording ? "active" : ""}`} onClick={isRecording ? stopRecording : startRecording}>
              {isRecording ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2" /></svg>
              ) : (
                <span className="ps-rec-dot-large" />
              )}
            </button>

            {isRecording && (
              <button className={`ps-transport-btn ${isPaused ? "paused" : ""}`} onClick={pauseRecording}>
                {isPaused ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21" /></svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="4" width="5" height="16" rx="1" /><rect x="14" y="4" width="5" height="16" rx="1" /></svg>
                )}
              </button>
            )}

            <div className={`ps-timer ${isRecording ? "recording" : ""}`}>
              {isRecording && <span className="ps-rec-indicator">●</span>}
              {fmtTime(recordingTime)}
            </div>

            {isRecording && (
              <button className="ps-transport-btn ps-chapter-btn" onClick={() => { const t = prompt("Chapter title:"); if (t) { setChapterInput(t); setTimeout(addChapter, 0); } }} title="Add Chapter">📌</button>
            )}
          </div>
        </div>

        <div className="ps-header-right">
          <button className="ps-invite-btn" onClick={() => setShowInviteModal(true)}>
            👥 Invite Guest ({connectedGuests.length}/{MAX_GUESTS})
          </button>
          <select className="ps-device-select" value={selectedDevice} onChange={(e) => setSelectedDevice(e.target.value)}>
            <option value="default">Default Mic</option>
            {inputDevices.map((d) => (
              <option key={d.deviceId} value={d.deviceId}>{d.label || `Mic ${d.deviceId.slice(0, 6)}`}</option>
            ))}
          </select>
          <span className="ps-status">{status}</span>
        </div>
      </div>

      {/* ═══════════ TABS ═══════════ */}
      <div className="ps-panel-tabs">
        {["tracks", "soundboard", "chapters", "metadata", "export"].map((id) => (
          <button key={id} className={`ps-panel-tab ${activePanel === id ? "active" : ""}`} onClick={() => setActivePanel(id)}>
            {{ tracks: "🎚️ Tracks", soundboard: "🔊 Soundboard", chapters: "📌 Chapters", metadata: "📝 Episode Info", export: "📤 Export" }[id]}
          </button>
        ))}
      </div>

      {/* ═══════════ MAIN ═══════════ */}
      <div className="ps-main">
        {activePanel === "tracks" && (
          <div className="ps-tracks-panel">
            <div className="ps-track host">
              <div className="ps-track-color" style={{ background: localTrack.color }} />
              <div className="ps-track-info">
                <span className="ps-track-label">🎙️ {localTrack.name} (Host)</span>
                <LevelMeter analyser={localAnalyserRef.current} />
              </div>
              <LiveWaveform analyser={localAnalyserRef.current} color={localTrack.color} />
              <div className="ps-track-controls">
                <input type="range" min="0" max="1" step="0.01" value={localTrack.volume} onChange={(e) => setHostVolume(parseFloat(e.target.value))} className="ps-volume-slider" />
                <span className="ps-vol-label">{Math.round(localTrack.volume * 100)}%</span>
                <button className={`ps-mute-btn ${localTrack.muted ? "active" : ""}`} onClick={() => setLocalTrack((prev) => ({ ...prev, muted: !prev.muted }))}>{localTrack.muted ? "🔇" : "🔊"}</button>
              </div>
              {recordedBlobs.host && <button className="ps-download-btn" onClick={() => downloadRecording("host")}>💾</button>}
            </div>

            {guestTracks.map((guest) => (
              <div key={guest.id} className="ps-track guest">
                <div className="ps-track-color" style={{ background: guest.color }} />
                <div className="ps-track-info">
                  <span className="ps-track-label">🎙️ {guest.name}</span>
                  <LevelMeter analyser={remoteAnalysersRef.current[guest.id]} />
                </div>
                <LiveWaveform analyser={remoteAnalysersRef.current[guest.id]} color={guest.color} />
                <div className="ps-track-controls">
                  <input type="range" min="0" max="1" step="0.01" value={guest.volume} onChange={(e) => setGuestVolume(guest.id, parseFloat(e.target.value))} className="ps-volume-slider" />
                  <span className="ps-vol-label">{Math.round(guest.volume * 100)}%</span>
                  <button className={`ps-mute-btn ${guest.muted ? "active" : ""}`} onClick={() => toggleGuestMute(guest.id)}>{guest.muted ? "🔇" : "🔊"}</button>
                </div>
                {recordedBlobs[guest.id] && <button className="ps-download-btn" onClick={() => downloadRecording(guest.id)}>💾</button>}
              </div>
            ))}

            {guestTracks.length === 0 && (
              <div className="ps-empty-guests"><p>No guests yet. Click "Invite Guest" to add people.</p></div>
            )}
          </div>
        )}

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
                    <label className="ps-pad-load">
                      <input type="file" accept="audio/*" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) loadSoundboardFile(pad.id, f); }} />
                      Load
                    </label>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activePanel === "chapters" && (
          <div className="ps-chapters-panel">
            <h3>Chapter Markers</h3>
            <div className="ps-chapter-add">
              <input className="ps-chapter-input" value={chapterInput} onChange={(e) => setChapterInput(e.target.value)} placeholder="Chapter title..." onKeyDown={(e) => e.key === "Enter" && addChapter()} />
              <button className="ps-chapter-add-btn" onClick={addChapter}>+ Add at {fmtTime(isRecording ? recordingTime : 0)}</button>
            </div>
            <div className="ps-chapter-list">
              {chapters.length === 0 ? (
                <p className="ps-empty">No chapters yet.</p>
              ) : (
                chapters.map((ch, i) => (
                  <div key={ch.id} className="ps-chapter-item">
                    <span className="ps-chapter-num">{i + 1}</span>
                    <span className="ps-chapter-time">{ch.formattedTime}</span>
                    <span className="ps-chapter-title">{ch.title}</span>
                    <button className="ps-chapter-remove" onClick={() => setChapters((prev) => prev.filter((c) => c.id !== ch.id))}>✕</button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

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

        {activePanel === "export" && (
          <div className="ps-export-panel">
            <h3>Export & Publish</h3>
            {Object.keys(recordedBlobs).length === 0 ? (
              <div className="ps-export-empty"><p>Record an episode first, then export here.</p></div>
            ) : (
              <>
                <div className="ps-export-info">
                  <p><strong>Duration:</strong> {fmtTime(recordingTime)}</p>
                  <p><strong>Tracks:</strong> {Object.keys(recordedBlobs).length}</p>
                  <p><strong>Chapters:</strong> {chapters.length}</p>
                </div>
                <div className="ps-export-actions">
                  <button className="ps-export-btn primary" onClick={() => exportEpisode("mixdown")} disabled={isExporting}>{isExporting ? "Publishing..." : "📤 Publish Episode"}</button>
                  <button className="ps-export-btn secondary" onClick={() => exportEpisode("stems")} disabled={isExporting}>📁 Upload Stems</button>
                  <div className="ps-export-downloads">
                    <h4>Download Tracks</h4>
                    {Object.keys(recordedBlobs).map((trackId) => (
                      <button key={trackId} className="ps-export-dl-btn" onClick={() => downloadRecording(trackId)}>
                        💾 {trackId === "host" ? localTrack.name : trackId === "soundboard" ? "Soundboard" : guestTracks.find((g) => g.id === trackId)?.name || trackId}
                      </button>
                    ))}
                  </div>
                  <button className="ps-export-btn studio" onClick={() => { window.location.href = `/recording-studio?podcast_session=${sessionId}`; }}>🎛️ Open in Recording Studio</button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* ═══════════ INVITE MODAL ═══════════ */}
      {showInviteModal && (
        <div className="ps-modal-overlay" onClick={() => setShowInviteModal(false)}>
          <div className="ps-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Invite Guest</h2>
            <p>Share this link — guests join directly in their browser, no account needed.</p>
            <div className="ps-invite-link-box">
              <input className="ps-invite-link-input" value={inviteLink} readOnly onClick={(e) => e.target.select()} />
              <button className="ps-copy-btn" onClick={copyInviteLink}>{inviteCopied ? "✓ Copied!" : "📋 Copy"}</button>
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