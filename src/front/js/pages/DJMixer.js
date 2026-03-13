// src/front/js/pages/DJMixer.js
import React, { useState, useEffect, useRef, useCallback, useContext } from "react";
import { Context } from "../store/appContext";
import "../../styles/DJMixer.css";

const BACKEND = process.env.REACT_APP_BACKEND_URL || "";

const CAMELOT = {
    "C major": "8B", "A minor": "8A", "G major": "9B", "E minor": "9A", "D major": "10B", "B minor": "10A",
    "A major": "11B", "F# minor": "11A", "E major": "12B", "C# minor": "12A", "B major": "1B", "G# minor": "1A",
    "F# major": "2B", "D# minor": "2A", "C# major": "3B", "A# minor": "3A", "G# major": "4B", "F minor": "4A",
    "D# major": "5B", "C minor": "5A", "A# major": "6B", "G minor": "6A", "F major": "7B", "D minor": "7A",
};

let _ctx = null;
const getCtx = () => { if (!_ctx) _ctx = new (window.AudioContext || window.webkitAudioContext)(); return _ctx; };

async function detectBPM(buffer) {
    try {
        const sr = buffer.sampleRate;
        const off = new OfflineAudioContext(1, buffer.length, sr);
        const src = off.createBufferSource(); src.buffer = buffer;
        const f = off.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 150;
        src.connect(f); f.connect(off.destination); src.start(0);
        const r = await off.startRendering(); const d = r.getChannelData(0);
        const ws = Math.floor(sr * 0.01); const energy = [];
        for (let i = 0; i < d.length - ws; i += ws) { let s = 0; for (let j = 0; j < ws; j++) s += d[i + j] ** 2; energy.push(s / ws); }
        const avg = energy.reduce((a, b) => a + b, 0) / energy.length;
        const thr = avg * 1.5; let peaks = 0, lp = -10;
        for (let i = 1; i < energy.length - 1; i++) {
            if (energy[i] > thr && energy[i] > energy[i - 1] && energy[i] > energy[i + 1] && i - lp > 5) { peaks++; lp = i; }
        }
        return Math.max(60, Math.min(200, Math.round((peaks / (d.length / sr)) * 60)));
    } catch { return null; }
}

class TimecodeDecoder {
    constructor(audioCtx, onResult) {
        this.ctx = audioCtx; this.onResult = onResult;
        this.scriptNode = null; this.sourceNode = null; this.stream = null; this.running = false;
        this.PILOT_FREQ = 1000; this.PHASE_FREQ = 2000; this.WINDOW = 2048;
        this._lastPilotPhase = null;
    }
    async start(deviceId) {
        try {
            const constraints = { audio: deviceId ? { deviceId: { exact: deviceId }, echoCancellation: false, noiseSuppression: false, autoGainControl: false } : { echoCancellation: false, noiseSuppression: false, autoGainControl: false } };
            this.stream = await navigator.mediaDevices.getUserMedia(constraints);
            this.sourceNode = this.ctx.createMediaStreamSource(this.stream);
            this.scriptNode = this.ctx.createScriptProcessor(this.WINDOW, 2, 2);
            this.scriptNode.onaudioprocess = (e) => this._process(e);
            this.sourceNode.connect(this.scriptNode);
            this.scriptNode.connect(this.ctx.destination);
            this.running = true; return true;
        } catch (err) { console.error("TimecodeDecoder start failed:", err); return false; }
    }
    stop() {
        this.running = false;
        if (this.scriptNode) { this.scriptNode.disconnect(); this.scriptNode = null; }
        if (this.sourceNode) { this.sourceNode.disconnect(); this.sourceNode = null; }
        if (this.stream) { this.stream.getTracks().forEach(t => t.stop()); this.stream = null; }
    }
    _process(e) {
        if (!this.running) return;
        const L = e.inputBuffer.getChannelData(0);
        const R = e.inputBuffer.getChannelData(1);
        const sr = e.inputBuffer.sampleRate;
        const pilotL = this._goertzel(L, this.PILOT_FREQ, sr);
        const phaseL = this._goertzel(L, this.PHASE_FREQ, sr);
        const phaseR = this._goertzel(R, this.PHASE_FREQ, sr);
        const pilotMag = Math.sqrt(pilotL.re ** 2 + pilotL.im ** 2);
        const phaseMag = Math.sqrt(phaseL.re ** 2 + phaseL.im ** 2);
        const THRESHOLD = 0.02;
        const valid = pilotMag > THRESHOLD && phaseMag > THRESHOLD;
        if (!valid) { this.onResult({ pitch: 0, position: 0, valid: false, signal: pilotMag }); return; }
        const pilotPhase = Math.atan2(pilotL.im, pilotL.re);
        const prevPhase = this._lastPilotPhase !== null ? this._lastPilotPhase : pilotPhase;
        let phaseDiff = pilotPhase - prevPhase;
        while (phaseDiff > Math.PI) phaseDiff -= 2 * Math.PI;
        while (phaseDiff < -Math.PI) phaseDiff += 2 * Math.PI;
        this._lastPilotPhase = pilotPhase;
        const expectedDiff = (2 * Math.PI * this.PILOT_FREQ * this.WINDOW) / sr;
        const pitch = expectedDiff > 0 ? phaseDiff / expectedDiff : 1.0;
        const clampedPitch = Math.max(-2.0, Math.min(2.0, pitch));
        const phaseAngleL = Math.atan2(phaseL.im, phaseL.re);
        const phaseAngleR = Math.atan2(phaseR.im, phaseR.re);
        let posDiff = phaseAngleL - phaseAngleR;
        while (posDiff < 0) posDiff += 2 * Math.PI;
        const position = posDiff / (2 * Math.PI);
        this.onResult({ pitch: clampedPitch, position, valid: true, signal: pilotMag });
    }
    _goertzel(samples, freq, sr) {
        const k = Math.round(samples.length * freq / sr);
        const omega = (2 * Math.PI * k) / samples.length;
        const coeff = 2 * Math.cos(omega);
        let q0 = 0, q1 = 0, q2 = 0;
        for (let i = 0; i < samples.length; i++) { q0 = coeff * q1 - q2 + samples[i]; q2 = q1; q1 = q0; }
        return { re: q1 - q2 * Math.cos(omega), im: q2 * Math.sin(omega) };
    }
}

class Deck {
    constructor(id) {
        this.id = id; this.buffer = null; this.source = null; this.gainNode = null;
        this.eqLow = null; this.eqMid = null; this.eqHigh = null; this.analyser = null;
        this.startTime = 0; this.pauseOffset = 0; this.playing = false;
        this.bpm = null; this.key = null; this.cuePoint = 0;
        this.hotcues = [null, null, null, null];
        this.loop = false; this.loopStart = 0; this.loopEnd = 4; this.pitch = 1.0;
        this.title = ""; this.artwork = null; this.audioType = "original";
    }
    setup(out) {
        const c = getCtx();
        this.gainNode = c.createGain(); this.gainNode.gain.value = 1;
        this.eqLow = c.createBiquadFilter(); this.eqLow.type = "lowshelf"; this.eqLow.frequency.value = 200;
        this.eqMid = c.createBiquadFilter(); this.eqMid.type = "peaking"; this.eqMid.frequency.value = 1000; this.eqMid.Q.value = 1;
        this.eqHigh = c.createBiquadFilter(); this.eqHigh.type = "highshelf"; this.eqHigh.frequency.value = 3000;
        this.analyser = c.createAnalyser(); this.analyser.fftSize = 512;
        this.gainNode.connect(this.eqLow); this.eqLow.connect(this.eqMid); this.eqMid.connect(this.eqHigh);
        this.eqHigh.connect(this.analyser); this.analyser.connect(out);
    }
    async loadBuffer(ab) { this.buffer = await getCtx().decodeAudioData(ab); this.pauseOffset = 0; this.bpm = await detectBPM(this.buffer); return this.bpm; }
    async loadURL(url) { const r = await fetch(url); return this.loadBuffer(await r.arrayBuffer()); }
    play(off) {
        if (!this.buffer) return; const c = getCtx();
        if (c.state === "suspended") c.resume(); this._stop();
        this.source = c.createBufferSource(); this.source.buffer = this.buffer;
        this.source.playbackRate.value = this.pitch;
        if (this.loop) { this.source.loop = true; this.source.loopStart = this.loopStart; this.source.loopEnd = this.loopEnd; }
        this.source.connect(this.gainNode);
        const o = off !== undefined ? off : this.pauseOffset;
        this.source.start(0, Math.max(0, o)); this.startTime = c.currentTime - o; this.playing = true;
    }
    pause() { if (!this.playing) return; this.pauseOffset = this.currentTime(); this._stop(); this.playing = false; }
    setCue() { this.cuePoint = this.currentTime(); }
    jumpCue() { this.pauseOffset = this.cuePoint; if (this.playing) this.play(this.cuePoint); }
    jumpHotcue(i) { if (this.hotcues[i] === null) { this.hotcues[i] = this.currentTime(); return; } this.pauseOffset = this.hotcues[i]; if (this.playing) this.play(this.hotcues[i]); }
    currentTime() { if (!this.playing) return this.pauseOffset; return Math.min(getCtx().currentTime - this.startTime, this.duration()); }
    duration() { return this.buffer ? this.buffer.duration : 0; }
    setGain(v) { if (this.gainNode) this.gainNode.gain.value = v; }
    setEQ(b, db) { const n = b === "low" ? this.eqLow : b === "mid" ? this.eqMid : this.eqHigh; if (n) n.gain.value = db; }
    _stop() { try { if (this.source) { this.source.stop(); this.source.disconnect(); } } catch (_) { } this.source = null; }
    getFreq() { if (!this.analyser) return new Uint8Array(64); const d = new Uint8Array(this.analyser.frequencyBinCount); this.analyser.getByteFrequencyData(d); return d; }
}

const Waveform = React.memo(({ deck, color }) => {
    const cvs = useRef(null), raf = useRef(null);
    useEffect(() => {
        const c = cvs.current; if (!c) return; const ctx = c.getContext("2d"); const w = c.width, h = c.height;
        const draw = () => {
            ctx.fillStyle = "#06060f"; ctx.fillRect(0, 0, w, h);
            const freq = deck.getFreq(); const bw = w / freq.length;
            for (let i = 0; i < freq.length; i++) {
                const v = freq[i] / 255; const bh = v * h * 0.9;
                ctx.fillStyle = `hsla(${160 + v * 80},100%,${25 + v * 45}%,${0.4 + v * 0.6})`;
                ctx.fillRect(i * bw, h - bh, bw - 0.5, bh);
            }
            if (deck.buffer) {
                const p = deck.currentTime() / deck.duration(), x = p * w;
                ctx.strokeStyle = "#fff"; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.85;
                ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); ctx.globalAlpha = 1;
                const cx2 = (deck.cuePoint / deck.duration()) * w;
                ctx.strokeStyle = "#ffcc00"; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
                ctx.beginPath(); ctx.moveTo(cx2, 0); ctx.lineTo(cx2, h); ctx.stroke(); ctx.setLineDash([]);
                const hcc = ["#ff4466", "#00aaff", "#00ff88", "#ff8800"];
                deck.hotcues.forEach((hc, i) => {
                    if (hc === null) return; const hx = (hc / deck.duration()) * w;
                    ctx.strokeStyle = hcc[i]; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(hx, 0); ctx.lineTo(hx, h); ctx.stroke();
                    ctx.fillStyle = hcc[i]; ctx.fillRect(hx - 4, 0, 8, 8);
                });
            }
            raf.current = requestAnimationFrame(draw);
        };
        draw(); return () => cancelAnimationFrame(raf.current);
    }, [deck, color]);
    return <canvas ref={cvs} width={440} height={85} className="dj-waveform" />;
});

const VU = React.memo(({ deck }) => {
    const cvs = useRef(null), raf = useRef(null);
    useEffect(() => {
        const c = cvs.current; if (!c) return; const ctx = c.getContext("2d");
        const draw = () => {
            const d = deck.getFreq(); const avg = d.reduce((a, b) => a + b, 0) / d.length / 255;
            const w = c.width, h = c.height; ctx.clearRect(0, 0, w, h);
            const n = 24, sh = h / n - 1, active = Math.round(avg * n);
            for (let i = 0; i < n; i++) {
                const y = h - (i + 1) * (h / n);
                ctx.fillStyle = i >= active ? "#111122" : i > 20 ? "#ff3366" : i > 16 ? "#ffcc00" : "#00ffcc";
                ctx.fillRect(1, y, w - 2, sh);
            }
            raf.current = requestAnimationFrame(draw);
        }; draw(); return () => cancelAnimationFrame(raf.current);
    }, [deck]);
    return <canvas ref={cvs} width={18} height={130} className="dj-vu" />;
});

const SignalMeter = ({ signal, valid }) => {
    const pct = Math.min(100, Math.round((signal || 0) * 500));
    return (
        <div className="dj-signal-wrap" title={`Timecode signal: ${pct}%`}>
            <div className="dj-signal-bar" style={{ width: `${pct}%`, background: valid ? "#00ff88" : pct > 20 ? "#ffcc00" : "#ff3366" }} />
            <span className="dj-signal-lbl">{valid ? "◉ TC" : "○ TC"}</span>
        </div>
    );
};

const Knob = ({ label, value, min, max, onChange, color = "#00ffcc" }) => {
    const drag = useRef({ on: false });
    const angle = ((value - min) / (max - min)) * 270 - 135;
    const onDown = useCallback(e => {
        drag.current = { on: true, sy: e.clientY, sv: value };
        const mv = ev => { if (!drag.current.on) return; const d = (drag.current.sy - ev.clientY) / 120; onChange(Math.max(min, Math.min(max, drag.current.sv + d * (max - min)))); };
        const up = () => { drag.current.on = false; window.removeEventListener("mousemove", mv); window.removeEventListener("mouseup", up); };
        window.addEventListener("mousemove", mv); window.addEventListener("mouseup", up);
    }, [value, min, max, onChange]);
    return (
        <div className="dj-knob-wrap">
            <div className="dj-knob" onMouseDown={onDown} style={{ "--ka": `${angle}deg`, "--kc": color }}><div className="dj-knob-dot" /></div>
            <span className="dj-knob-lbl">{label}</span>
            <span className="dj-knob-val">{value > 0 ? `+${value.toFixed(0)}` : value.toFixed(0)}</span>
        </div>
    );
};

const DropZone = ({ onFile, active }) => {
    const [ov, setOv] = useState(false);
    return (
        <div className={`dj-drop ${ov ? "over" : ""} ${active ? "loaded" : ""}`}
            onDragOver={e => { e.preventDefault(); setOv(true); }} onDragLeave={() => setOv(false)}
            onDrop={e => { e.preventDefault(); setOv(false); const f = e.dataTransfer.files[0]; if (f && f.type.startsWith("audio/")) onFile(f); }}>
            {ov ? "Drop to load →" : active ? "↕ Drag new track" : "Drag MP3 / WAV / FLAC"}
        </div>
    );
};

const deckA = new Deck("A"), deckB = new Deck("B");

export default function DJMixer() {
    const { store } = useContext(Context);
    const [rdy, setRdy] = useState(false);
    const [xf, setXf] = useState(0.5);
    const [mvol, setMvol] = useState(1);
    const [ds, setDs] = useState({
        A: { playing: false, loaded: false, bpm: null, key: null, title: "", artwork: null, audioType: "original", vol: 1, low: 0, mid: 0, high: 0, pitch: 1, loop: false, hotcues: [null, null, null, null] },
        B: { playing: false, loaded: false, bpm: null, key: null, title: "", artwork: null, audioType: "original", vol: 1, low: 0, mid: 0, high: 0, pitch: 1, loop: false, hotcues: [null, null, null, null] },
    });
    const [lib, setLib] = useState([]);
    const [lf, setLf] = useState("all");
    const [ls, setLs] = useState("");
    const [ldDeck, setLdDeck] = useState(null);
    const [urlI, setUrlI] = useState({ A: "", B: "" });
    const [showUrl, setShowUrl] = useState({ A: false, B: false });
    const [rec, setRec] = useState(false);
    const [recBlob, setRecBlob] = useState(null);
    const [master, setMaster] = useState("A");
    const [prog, setProg] = useState({ A: 0, B: 0 });
    const [saveModal, setSaveModal] = useState(false);
    const [mixTitle, setMixTitle] = useState("");
    const [saving, setSaving] = useState(false);
    const [audioDevices, setAudioDevices] = useState([]);
    const [liveMode, setLiveMode] = useState({ A: "off", B: "off" });
    const [liveDevice, setLiveDevice] = useState({ A: "", B: "" });
    const [tcSignal, setTcSignal] = useState({ A: { signal: 0, valid: false }, B: { signal: 0, valid: false } });
    const [showDevicePanel, setShowDevicePanel] = useState({ A: false, B: false });
    const liveStreamRef = useRef({ A: null, B: null });
    const liveSourceRef = useRef({ A: null, B: null });
    const tcDecoderRef = useRef({ A: null, B: null });
    const mgRef = useRef(null), xgA = useRef(null), xgB = useRef(null), recRef = useRef(null), chunks = useRef([]), rafRef = useRef(null);

    const initAudio = useCallback(() => {
        if (rdy) return; const c = getCtx();
        const mg = c.createGain(); mg.gain.value = mvol;
        const ga = c.createGain(), gb = c.createGain();
        ga.connect(mg); gb.connect(mg); mg.connect(c.destination);
        mgRef.current = mg; xgA.current = ga; xgB.current = gb;
        deckA.setup(ga); deckB.setup(gb); setRdy(true);
    }, [rdy, mvol]);

    useEffect(() => {
        const enumerate = async () => {
            try {
                await navigator.mediaDevices.getUserMedia({ audio: true });
                const all = await navigator.mediaDevices.enumerateDevices();
                setAudioDevices(all.filter(d => d.kind === "audioinput"));
            } catch (e) { console.warn("Device access:", e); }
        };
        enumerate();
        navigator.mediaDevices.addEventListener("devicechange", enumerate);
        return () => navigator.mediaDevices.removeEventListener("devicechange", enumerate);
    }, []);

    useEffect(() => { if (!xgA.current) return; xgA.current.gain.value = Math.cos(xf * Math.PI / 2); xgB.current.gain.value = Math.sin(xf * Math.PI / 2); }, [xf]);
    useEffect(() => { if (mgRef.current) mgRef.current.gain.value = mvol; }, [mvol]);
    useEffect(() => {
        const tick = () => { setProg({ A: deckA.buffer ? Math.min(deckA.currentTime() / deckA.duration(), 1) : 0, B: deckB.buffer ? Math.min(deckB.currentTime() / deckB.duration(), 1) : 0 }); rafRef.current = requestAnimationFrame(tick); };
        tick(); return () => cancelAnimationFrame(rafRef.current);
    }, []);

    useEffect(() => {
        const token = store?.token || localStorage.getItem("token"); if (!token) return;
        Promise.all([
            fetch(`${BACKEND}/api/audio/my-tracks`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.ok ? r.json() : []).catch(() => []),
            fetch(`${BACKEND}/api/beats/my-beats`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.ok ? r.json() : []).catch(() => []),
        ]).then(([audio, beats]) => {
            const bm = (beats || []).map(b => ({ id: `beat_${b.id}`, title: b.title || "Beat", file_url: b.audio_url || b.file_url, audio_url: b.audio_url || b.file_url, audio_type: "beat", bpm: b.bpm, key: b.key, genre: b.genre, artwork_url: b.artwork_url || b.cover_art_url, source: "beat" }));
            const all = [...(audio || []), ...bm]; const seen = new Set();
            setLib(all.filter(t => { const k = `${t.title}_${t.file_url}`; if (seen.has(k)) return false; seen.add(k); return true; }));
        });
    }, [store]);

    const upd = (id, p) => setDs(prev => ({ ...prev, [id]: { ...prev[id], ...p } }));

    const stopLiveMode = useCallback((id) => {
        if (tcDecoderRef.current[id]) { tcDecoderRef.current[id].stop(); tcDecoderRef.current[id] = null; }
        if (liveSourceRef.current[id]) { liveSourceRef.current[id].disconnect(); liveSourceRef.current[id] = null; }
        if (liveStreamRef.current[id]) { liveStreamRef.current[id].getTracks().forEach(t => t.stop()); liveStreamRef.current[id] = null; }
        setLiveMode(p => ({ ...p, [id]: "off" }));
        setTcSignal(p => ({ ...p, [id]: { signal: 0, valid: false } }));
    }, []);

    const startLiveInput = useCallback(async (id) => {
        initAudio(); stopLiveMode(id);
        const deviceId = liveDevice[id];
        const dk = id === "A" ? deckA : deckB;
        try {
            const constraints = { audio: deviceId ? { deviceId: { exact: deviceId }, echoCancellation: false, noiseSuppression: false, autoGainControl: false } : { echoCancellation: false, noiseSuppression: false, autoGainControl: false } };
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            liveStreamRef.current[id] = stream;
            const source = getCtx().createMediaStreamSource(stream);
            source.connect(dk.gainNode);
            liveSourceRef.current[id] = source;
            setLiveMode(p => ({ ...p, [id]: "input" }));
        } catch (e) { alert("Could not access audio device: " + e.message); }
    }, [liveDevice, initAudio, stopLiveMode]);

    const startTimecode = useCallback(async (id) => {
        initAudio(); stopLiveMode(id);
        const dk = id === "A" ? deckA : deckB;
        if (!dk.buffer) { alert("Load a track first, then enable timecode control."); return; }
        const decoder = new TimecodeDecoder(getCtx(), (result) => {
            setTcSignal(p => ({ ...p, [id]: { signal: result.signal, valid: result.valid } }));
            if (!result.valid || !dk.buffer) return;
            const absPitch = Math.abs(result.pitch);
            const clampedPitch = Math.max(0.5, Math.min(2.0, absPitch));
            if (result.pitch === 0) {
                if (dk.playing) { dk.pause(); upd(id, { playing: false }); }
            } else if (result.pitch < 0) {
                dk.pauseOffset = Math.max(0, dk.currentTime() - 0.05);
                if (dk.playing) dk.play(dk.pauseOffset);
            } else {
                if (!dk.playing) { dk.play(); upd(id, { playing: true }); }
                if (dk.source) dk.source.playbackRate.value = clampedPitch;
                dk.pitch = clampedPitch;
                upd(id, { pitch: clampedPitch });
            }
        });
        const ok = await decoder.start(liveDevice[id]);
        if (ok) { tcDecoderRef.current[id] = decoder; setLiveMode(p => ({ ...p, [id]: "timecode" })); }
        else { alert("Failed to start timecode — check device permissions."); }
    }, [liveDevice, initAudio, stopLiveMode]);

    const loadLib = async (id, t) => {
        initAudio(); const url = t.audio_url || t.file_url || t.r2_url; if (!url) return;
        setLdDeck(id); const dk = id === "A" ? deckA : deckB;
        try {
            const bpm = await dk.loadURL(url);
            dk.title = t.title; dk.artwork = t.artwork_url; dk.audioType = t.audio_type || "original"; dk.bpm = bpm || t.bpm; dk.key = t.key;
            upd(id, { loaded: true, bpm: dk.bpm, key: t.key, title: t.title, artwork: t.artwork_url, audioType: dk.audioType, hotcues: [null, null, null, null] });
        } catch (e) { console.error(e); }
        setLdDeck(null);
    };

    const loadFile = async (id, file) => {
        initAudio(); setLdDeck(id); const dk = id === "A" ? deckA : deckB;
        try {
            const bpm = await dk.loadBuffer(await file.arrayBuffer());
            dk.title = file.name.replace(/\.[^.]+$/, "");
            upd(id, { loaded: true, bpm, key: null, title: dk.title, artwork: null, audioType: "original", hotcues: [null, null, null, null] });
        } catch (e) { console.error(e); }
        setLdDeck(null);
    };

    const loadURL = async (id) => {
        const url = urlI[id]; if (!url) return;
        initAudio(); setLdDeck(id); const dk = id === "A" ? deckA : deckB;
        try {
            const bpm = await dk.loadURL(url);
            const name = url.split("/").pop().split("?")[0].replace(/\.[^.]+$/, "");
            upd(id, { loaded: true, bpm, key: null, title: name, artwork: null, audioType: "original", hotcues: [null, null, null, null] });
            setShowUrl(p => ({ ...p, [id]: false })); setUrlI(p => ({ ...p, [id]: "" }));
        } catch (e) { alert("Failed to load — check URL and CORS"); }
        setLdDeck(null);
    };

    const togglePlay = (id) => {
        initAudio(); const dk = id === "A" ? deckA : deckB; if (!dk.buffer) return;
        if (dk.playing) { dk.pause(); upd(id, { playing: false }); }
        else { dk.play(); upd(id, { playing: true }); }
    };

    const syncBPM = () => {
        if (!deckA.bpm || !deckB.bpm) return;
        const mk = master === "A" ? deckA : deckB, sl = master === "A" ? deckB : deckA, sid = master === "A" ? "B" : "A";
        const ratio = mk.bpm / sl.bpm; sl.pitch = ratio;
        if (sl.source) sl.source.playbackRate.value = ratio;
        upd(sid, { pitch: ratio });
    };

    const startRec = () => {
        initAudio(); const c = getCtx(); const dest = c.createMediaStreamDestination();
        mgRef.current.connect(dest);
        const r = new MediaRecorder(dest.stream, { mimeType: "audio/webm" });
        chunks.current = []; r.ondataavailable = e => chunks.current.push(e.data);
        r.onstop = () => setRecBlob(new Blob(chunks.current, { type: "audio/webm" }));
        r.start(); recRef.current = r; setRec(true);
    };
    const stopRec = () => { if (recRef.current) recRef.current.stop(); setRec(false); };
    const dlMix = () => {
        if (!recBlob) return; const a = document.createElement("a");
        a.href = URL.createObjectURL(recBlob); a.download = `${mixTitle || "mix"}_${Date.now()}.webm`; a.click();
    };
    const saveMix = async () => {
        if (!recBlob) return; setSaving(true);
        const token = store?.token || localStorage.getItem("token");
        try {
            const pr = await fetch(`${BACKEND}/api/r2/presign`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ filename: `mix_${Date.now()}.webm`, content_type: "audio/webm", folder: "mixes" }) });
            const { upload_url, public_url } = await pr.json();
            await fetch(upload_url, { method: "PUT", body: recBlob, headers: { "Content-Type": "audio/webm" } });
            const sv = await fetch(`${BACKEND}/api/audio/upload`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ title: mixTitle || `DJ Mix ${new Date().toLocaleDateString()}`, file_url: public_url, audio_type: "mix", is_public: false }) });
            if (sv.ok) { alert("✅ Mix saved!"); setSaveModal(false); setMixTitle(""); }
            else throw new Error("Save failed");
        } catch (e) { alert("Error: " + e.message); }
        setSaving(false);
    };

    const filtLib = lib.filter(t => {
        const tm = lf === "all" || t.audio_type === lf;
        const sm = !ls || t.title?.toLowerCase().includes(ls.toLowerCase());
        return tm && sm;
    });

    const HC_COLORS = ["#ff4466", "#00aaff", "#00ff88", "#ff8800"];

    const renderInputPanel = (id) => {
        const mode = liveMode[id];
        const color = id === "A" ? "#00ffcc" : "#ff6b35";
        const tc = tcSignal[id];
        const show = showDevicePanel[id];
        return (
            <div className="dj-input-panel">
                <div className="dj-input-row">
                    <button className="dj-input-toggle" onClick={() => setShowDevicePanel(p => ({ ...p, [id]: !p[id] }))}>🎚 INPUT {show ? "▲" : "▼"}</button>
                    {mode === "input" && <span className="dj-live-badge" style={{ background: color }}>● LIVE IN</span>}
                    {mode === "timecode" && <>
                        <span className="dj-live-badge" style={{ background: tc.valid ? "#00ff88" : "#ff3366" }}>{tc.valid ? "◉ TIMECODE" : "○ NO SIGNAL"}</span>
                        <SignalMeter signal={tc.signal} valid={tc.valid} />
                    </>}
                    {mode !== "off" && <button className="dj-input-stop" onClick={() => stopLiveMode(id)}>✕</button>}
                </div>
                {show && (
                    <div className="dj-input-drawer">
                        <div className="dj-input-device-row">
                            <label className="dj-fl">Device</label>
                            <select className="dj-device-sel" value={liveDevice[id]} onChange={e => setLiveDevice(p => ({ ...p, [id]: e.target.value }))}>
                                <option value="">Default Input</option>
                                {audioDevices.map(d => <option key={d.deviceId} value={d.deviceId}>{d.label || `Input ${d.deviceId.slice(0, 8)}`}</option>)}
                            </select>
                        </div>
                        <div className="dj-input-btns">
                            <button className={`dj-input-btn ${mode === "input" ? "active" : ""}`} style={{ "--ic": color }}
                                onClick={() => mode === "input" ? stopLiveMode(id) : startLiveInput(id)}
                                title="Route USB turntable/mic through this deck EQ + crossfader">
                                🎙 {mode === "input" ? "Stop Live Input" : "Live Input"}
                            </button>
                            <button className={`dj-input-btn tc-btn ${mode === "timecode" ? "active" : ""}`} style={{ "--ic": color }}
                                onClick={() => mode === "timecode" ? stopLiveMode(id) : startTimecode(id)}
                                title="Serato-style timecode vinyl control — needle position + pitch drives the deck">
                                💿 {mode === "timecode" ? "Stop Timecode" : "Timecode Vinyl"}
                            </button>
                        </div>
                        <div className="dj-input-hint">
                            {mode === "off" && <span>Connect USB turntable → select device → choose mode</span>}
                            {mode === "input" && <span>Live audio routed through deck {id} EQ + crossfader</span>}
                            {mode === "timecode" && <span>{tc.valid ? `Signal locked · pitch control active` : "Put needle on timecode vinyl — waiting for signal"}</span>}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const renderDeck = (id) => {
        const dk = id === "A" ? deckA : deckB, s = ds[id];
        const color = id === "A" ? "#00ffcc" : "#ff6b35";
        const p = prog[id], cam = s.key ? CAMELOT[s.key] : null;
        return (
            <div className={`dj-deck dj-deck-${id.toLowerCase()}`}>
                <div className="dj-deck-hd">
                    <div className="dj-deck-letter" style={{ color }}>{id}</div>
                    <div className="dj-deck-info">
                        <div className="dj-track-name">{s.title || "No track loaded"}</div>
                        <div className="dj-track-meta">
                            {s.bpm && <span className="dj-badge" style={{ borderColor: color }}>{Math.round(s.bpm)} BPM</span>}
                            {cam && <span className="dj-badge dj-cam">{cam}</span>}
                            {s.key && <span className="dj-badge dj-key">{s.key}</span>}
                            {s.audioType && s.audioType !== "original" && <span className="dj-badge dj-atype">{s.audioType.toUpperCase()}</span>}
                            {id === master && <span className="dj-badge dj-mst">MASTER</span>}
                        </div>
                    </div>
                    {s.artwork && <img src={s.artwork} alt="" className="dj-art" />}
                </div>
                <Waveform deck={dk} color={color} />
                <div className="dj-prog-wrap">
                    <div className="dj-prog"><div className="dj-prog-f" style={{ width: `${p * 100}%`, background: color }} /></div>
                    <div className="dj-prog-t"><span>{fmt(dk.currentTime())}</span><span style={{ color: "#555" }}>-{fmt(dk.duration() - dk.currentTime())}</span></div>
                </div>
                <div className="dj-hcues">
                    {[0, 1, 2, 3].map(i => (
                        <button key={i} className={`dj-hc ${s.hotcues[i] !== null ? "set" : ""}`} style={{ "--hcc": HC_COLORS[i] }}
                            onClick={() => { dk.jumpHotcue(i); upd(id, { hotcues: [...dk.hotcues] }); }}
                            onContextMenu={e => { e.preventDefault(); dk.hotcues[i] = null; upd(id, { hotcues: [...dk.hotcues] }); }}
                            title={s.hotcues[i] !== null ? `HC${i + 1}: ${fmt(s.hotcues[i])} (right-click=clear)` : `Set HC${i + 1}`}>{i + 1}</button>
                    ))}
                    <button className="dj-btn dj-cue" onClick={() => { dk.setCue(); upd(id, {}); }}>CUE</button>
                    <button className="dj-btn dj-cjump" onClick={() => dk.jumpCue()}>◀CUE</button>
                </div>
                <div className="dj-transport">
                    <button className={`dj-play ${s.playing ? "on" : ""}`} style={{ "--pc": color }} onClick={() => togglePlay(id)} disabled={!s.loaded && liveMode[id] === "off"}>{s.playing ? "⏸" : "▶"}</button>
                    <button className={`dj-btn dj-loop ${s.loop ? "on" : ""}`} onClick={() => { dk.loop = !dk.loop; if (dk.source) dk.source.loop = dk.loop; upd(id, { loop: dk.loop }); }}>🔁</button>
                    <div className="dj-loop-sz">
                        {[1, 2, 4, 8].map(b => (
                            <button key={b} className="dj-lsz" onClick={() => {
                                if (!dk.buffer) return;
                                const beat = dk.bpm ? 60 / dk.bpm : 0.5;
                                dk.loopStart = dk.currentTime(); dk.loopEnd = dk.loopStart + beat * b * 4;
                                dk.loop = true; if (dk.source) { dk.source.loop = true; dk.source.loopStart = dk.loopStart; dk.source.loopEnd = dk.loopEnd; }
                                upd(id, { loop: true });
                            }}>{b}</button>
                        ))}
                    </div>
                </div>
                <div className="dj-eq-row">
                    <Knob label="HI" value={s.high} min={-12} max={12} color={color} onChange={v => { dk.setEQ("high", v); upd(id, { high: v }); }} />
                    <Knob label="MID" value={s.mid} min={-12} max={12} color={color} onChange={v => { dk.setEQ("mid", v); upd(id, { mid: v }); }} />
                    <Knob label="LOW" value={s.low} min={-12} max={12} color={color} onChange={v => { dk.setEQ("low", v); upd(id, { low: v }); }} />
                    <VU deck={dk} />
                </div>
                <div className="dj-faders">
                    <div className="dj-fg">
                        <label className="dj-fl">VOL</label>
                        <input type="range" className="dj-fader" min="0" max="1.5" step="0.01" value={s.vol} style={{ "--fc": color }} onChange={e => { const v = parseFloat(e.target.value); dk.setGain(v); upd(id, { vol: v }); }} />
                        <span className="dj-fv">{Math.round(s.vol * 100)}%</span>
                    </div>
                    <div className="dj-fg">
                        <label className="dj-fl">PITCH {((s.pitch - 1) * 100).toFixed(1)}%</label>
                        <input type="range" className="dj-fader dj-pitch" min="0.85" max="1.15" step="0.001" value={s.pitch} onChange={e => { const v = parseFloat(e.target.value); dk.pitch = v; if (dk.source) dk.source.playbackRate.value = v; upd(id, { pitch: v }); }} />
                        <button className="dj-prst" onClick={() => { dk.pitch = 1; if (dk.source) dk.source.playbackRate.value = 1; upd(id, { pitch: 1 }); }}>⊙</button>
                    </div>
                </div>
                {renderInputPanel(id)}
                <div className="dj-load-sec">
                    <DropZone onFile={f => loadFile(id, f)} active={s.loaded} />
                    <div className="dj-load-row">
                        <button className="dj-url-btn" onClick={() => setShowUrl(p => ({ ...p, [id]: !p[id] }))}>🔗 URL</button>
                        {ldDeck === id && <span className="dj-ldtxt">Loading…</span>}
                    </div>
                    {showUrl[id] && (
                        <div className="dj-url-row">
                            <input className="dj-url-in" placeholder="Paste direct audio URL…" value={urlI[id]} onChange={e => setUrlI(p => ({ ...p, [id]: e.target.value }))} onKeyDown={e => e.key === "Enter" && loadURL(id)} />
                            <button className="dj-url-go" onClick={() => loadURL(id)}>Load</button>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="dj-page" onClick={initAudio}>
            <div className="dj-topbar">
                <div className="dj-logo">🎛 <span>DJ<em>Studio</em></span></div>
                <div className="dj-top-acts">
                    <button className="dj-sync" onClick={syncBPM}>⟳ SYNC</button>
                    <button className="dj-mst-btn" onClick={() => setMaster(m => m === "A" ? "B" : "A")}>MASTER: {master}</button>
                    {!rec ? <button className="dj-rec" onClick={startRec}>⏺ REC</button> : <button className="dj-rec on" onClick={stopRec}>⏹ STOP</button>}
                    {recBlob && <>
                        <button className="dj-exp" onClick={dlMix}>⬇ Download</button>
                        <button className="dj-exp save" onClick={() => setSaveModal(true)}>☁ Save Mix</button>
                    </>}
                </div>
            </div>
            <div className="dj-main">
                {renderDeck("A")}
                <div className="dj-center">
                    <div className="dj-xfw">
                        <div className="dj-xfl"><span style={{ color: "#00ffcc" }}>A</span><span className="dj-xft">CROSSFADER</span><span style={{ color: "#ff6b35" }}>B</span></div>
                        <input type="range" className="dj-xfader" min="0" max="1" step="0.005" value={xf} onChange={e => setXf(parseFloat(e.target.value))} />
                        <button className="dj-xfc" onClick={() => setXf(0.5)}>⊙ Center</button>
                    </div>
                    <div className="dj-mvol">
                        <label className="dj-fl" style={{ color: "#fff" }}>MASTER</label>
                        <input type="range" className="dj-fader" min="0" max="1.5" step="0.01" value={mvol} style={{ "--fc": "#fff" }} onChange={e => setMvol(parseFloat(e.target.value))} />
                        <span className="dj-fv">{Math.round(mvol * 100)}%</span>
                    </div>
                    {rec && <div className="dj-rec-live"><span className="dj-rec-dot" />REC</div>}
                </div>
                {renderDeck("B")}
            </div>
            <div className="dj-library">
                <div className="dj-lib-hd">
                    <span className="dj-lib-ttl">📂 Library</span>
                    <input className="dj-lib-s" placeholder="Search…" value={ls} onChange={e => setLs(e.target.value)} />
                </div>
                <div className="dj-lib-filters">
                    {["all", "beat", "acapella", "stem", "remix", "mix", "sample", "original"].map(f => (
                        <button key={f} className={`dj-ff ${lf === f ? "on" : ""}`} onClick={() => setLf(f)}>{f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}</button>
                    ))}
                </div>
                <div className="dj-lib-rows">
                    {filtLib.length === 0 ? (
                        <div className="dj-lib-empty">{lib.length === 0 ? "Upload audio or beats to see them here" : "No tracks match filter"}</div>
                    ) : filtLib.map(t => (
                        <div key={t.id} className="dj-lib-row">
                            <div className="dj-lib-inf">
                                <span className="dj-lib-name">{t.title}</span>
                                <span className="dj-lib-meta">
                                    {t.audio_type && t.audio_type !== "original" && <span className="dj-lib-tag">{t.audio_type}</span>}
                                    {t.bpm && <span>{t.bpm} BPM</span>}
                                    {t.key && <span> · {t.key}</span>}
                                    {t.genre && <span> · {t.genre}</span>}
                                </span>
                            </div>
                            <div className="dj-lib-btns">
                                <button className="dj-lib-a" onClick={() => loadLib("A", t)}>A</button>
                                <button className="dj-lib-b" onClick={() => loadLib("B", t)}>B</button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            {saveModal && (
                <div className="dj-overlay" onClick={() => setSaveModal(false)}>
                    <div className="dj-modal" onClick={e => e.stopPropagation()}>
                        <h3>Save Mix to Library</h3>
                        <input className="dj-modal-in" placeholder="Mix title…" value={mixTitle} onChange={e => setMixTitle(e.target.value)} />
                        <div className="dj-modal-acts">
                            <button className="dj-modal-cancel" onClick={() => setSaveModal(false)}>Cancel</button>
                            <button className="dj-modal-save" onClick={saveMix} disabled={saving}>{saving ? "Saving…" : "☁ Save"}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function fmt(s) { if (!s || isNaN(s) || s < 0) return "0:00"; return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, "0")}`; }
