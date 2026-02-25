// =============================================================================
// PHASE 1: PODCAST STUDIO UPGRADES — Riverside-Quality Features
// =============================================================================
// Location: src/front/js/pages/PodcastStudio.js (merge into existing)
//
// UPGRADES:
//   1. WAV/Lossless Recording (PCM capture via Web Audio API)
//   2. AI Transcription + Text-Based Editing
//   3. Auto Filler Word & Pause Removal
//   4. Green Room / Pre-Session Lobby
//   5. Progressive Upload (chunk upload during recording)
//
// =============================================================================

import React, { useState, useEffect, useRef, useCallback } from 'react';

// =============================================================================
// 1. WAV/LOSSLESS RECORDING ENGINE
// =============================================================================
// Replaces MediaRecorder Opus with raw PCM capture for studio-quality audio
// Records at 48kHz/24-bit — same quality tier as Riverside's "uncompressed" claim

class WAVRecordingEngine {
    constructor(stream, options = {}) {
        this.stream = stream;
        this.sampleRate = options.sampleRate || 48000;
        this.bitDepth = options.bitDepth || 24; // 16 or 24
        this.channels = options.channels || 1; // mono for voice
        this.audioContext = null;
        this.sourceNode = null;
        this.processorNode = null;
        this.chunks = [];
        this.isRecording = false;
        this.onDataAvailable = options.onDataAvailable || null; // For progressive upload
        this.chunkInterval = options.chunkInterval || 30000; // 30s chunks
        this.chunkTimer = null;
        this.totalSamples = 0;
    }

    async start() {
        this.audioContext = new AudioContext({ sampleRate: this.sampleRate });
        this.sourceNode = this.audioContext.createMediaStreamSource(this.stream);

        // Use AudioWorklet for high-performance PCM capture
        // Falls back to ScriptProcessorNode if AudioWorklet unavailable
        try {
            await this.audioContext.audioWorklet.addModule(
                URL.createObjectURL(new Blob([WAV_WORKLET_CODE], { type: 'application/javascript' }))
            );
            this.processorNode = new AudioWorkletNode(this.audioContext, 'pcm-capture-processor', {
                processorOptions: { bitDepth: this.bitDepth }
            });
            this.processorNode.port.onmessage = (e) => {
                if (e.data.type === 'pcm-data') {
                    this.chunks.push(e.data.buffer);
                    this.totalSamples += e.data.sampleCount;
                }
            };
        } catch {
            // Fallback: ScriptProcessorNode (deprecated but universal)
            const bufferSize = 4096;
            this.processorNode = this.audioContext.createScriptProcessor(bufferSize, 1, 1);
            this.processorNode.onaudioprocess = (e) => {
                if (!this.isRecording) return;
                const input = e.inputBuffer.getChannelData(0);
                const pcmData = this.bitDepth === 24
                    ? float32ToPCM24(input)
                    : float32ToPCM16(input);
                this.chunks.push(pcmData);
                this.totalSamples += input.length;
            };
        }

        this.sourceNode.connect(this.processorNode);
        this.processorNode.connect(this.audioContext.destination);
        this.isRecording = true;

        // Progressive upload: send chunks periodically
        if (this.onDataAvailable) {
            this.chunkTimer = setInterval(() => {
                if (this.chunks.length > 0) {
                    const chunkBlob = this._buildPartialWAV();
                    this.onDataAvailable(chunkBlob, this.totalSamples / this.sampleRate);
                }
            }, this.chunkInterval);
        }
    }

    stop() {
        this.isRecording = false;
        if (this.chunkTimer) clearInterval(this.chunkTimer);
        if (this.processorNode) {
            this.processorNode.disconnect();
            this.sourceNode.disconnect();
        }
        if (this.audioContext) {
            this.audioContext.close();
        }
        return this._buildWAV();
    }

    _buildPartialWAV() {
        // Build WAV from current chunks without clearing them
        const dataLength = this.chunks.reduce((acc, c) => acc + c.byteLength, 0);
        return this._createWAVBlob(dataLength);
    }

    _buildWAV() {
        const dataLength = this.chunks.reduce((acc, c) => acc + c.byteLength, 0);
        return this._createWAVBlob(dataLength);
    }

    _createWAVBlob(dataLength) {
        const bytesPerSample = this.bitDepth / 8;
        const headerSize = 44;
        const buffer = new ArrayBuffer(headerSize + dataLength);
        const view = new DataView(buffer);

        // RIFF header
        writeString(view, 0, 'RIFF');
        view.setUint32(4, 36 + dataLength, true);
        writeString(view, 8, 'WAVE');

        // fmt chunk
        writeString(view, 12, 'fmt ');
        view.setUint32(16, 16, true); // chunk size
        view.setUint16(20, 1, true); // PCM format
        view.setUint16(22, this.channels, true);
        view.setUint32(24, this.sampleRate, true);
        view.setUint32(28, this.sampleRate * this.channels * bytesPerSample, true);
        view.setUint16(32, this.channels * bytesPerSample, true);
        view.setUint16(34, this.bitDepth, true);

        // data chunk
        writeString(view, 36, 'data');
        view.setUint32(40, dataLength, true);

        // Copy PCM data
        const output = new Uint8Array(buffer);
        let offset = headerSize;
        for (const chunk of this.chunks) {
            output.set(new Uint8Array(chunk), offset);
            offset += chunk.byteLength;
        }

        return new Blob([buffer], { type: 'audio/wav' });
    }

    getDuration() {
        return this.totalSamples / this.sampleRate;
    }
}

// AudioWorklet processor code (runs in audio thread)
const WAV_WORKLET_CODE = `
class PCMCaptureProcessor extends AudioWorkletProcessor {
    constructor(options) {
        super();
        this.bitDepth = options.processorOptions?.bitDepth || 24;
        this.buffer = [];
        this.bufferSize = 0;
        this.flushSize = 48000; // Flush every ~1 second at 48kHz
    }

    process(inputs) {
        const input = inputs[0];
        if (!input || !input[0]) return true;

        const samples = input[0];
        const bytesPerSample = this.bitDepth / 8;
        const pcmBuffer = new ArrayBuffer(samples.length * bytesPerSample);
        const view = new DataView(pcmBuffer);

        for (let i = 0; i < samples.length; i++) {
            const s = Math.max(-1, Math.min(1, samples[i]));
            if (this.bitDepth === 24) {
                const val = Math.round(s * 8388607);
                const offset = i * 3;
                view.setUint8(offset, val & 0xFF);
                view.setUint8(offset + 1, (val >> 8) & 0xFF);
                view.setUint8(offset + 2, (val >> 16) & 0xFF);
            } else {
                view.setInt16(i * 2, Math.round(s * 32767), true);
            }
        }

        this.buffer.push(pcmBuffer);
        this.bufferSize += samples.length;

        if (this.bufferSize >= this.flushSize) {
            const totalBytes = this.buffer.reduce((a, b) => a + b.byteLength, 0);
            const merged = new ArrayBuffer(totalBytes);
            const out = new Uint8Array(merged);
            let off = 0;
            for (const buf of this.buffer) {
                out.set(new Uint8Array(buf), off);
                off += buf.byteLength;
            }
            this.port.postMessage({
                type: 'pcm-data',
                buffer: merged,
                sampleCount: this.bufferSize
            }, [merged]);
            this.buffer = [];
            this.bufferSize = 0;
        }

        return true;
    }
}
registerProcessor('pcm-capture-processor', PCMCaptureProcessor);
`;

// PCM conversion helpers
function float32ToPCM16(float32Array) {
    const buffer = new ArrayBuffer(float32Array.length * 2);
    const view = new DataView(buffer);
    for (let i = 0; i < float32Array.length; i++) {
        const s = Math.max(-1, Math.min(1, float32Array[i]));
        view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
    return buffer;
}

function float32ToPCM24(float32Array) {
    const buffer = new ArrayBuffer(float32Array.length * 3);
    const view = new DataView(buffer);
    for (let i = 0; i < float32Array.length; i++) {
        const s = Math.max(-1, Math.min(1, float32Array[i]));
        const val = Math.round(s * 8388607);
        const offset = i * 3;
        view.setUint8(offset, val & 0xFF);
        view.setUint8(offset + 1, (val >> 8) & 0xFF);
        view.setUint8(offset + 2, (val >> 16) & 0xFF);
    }
    return buffer;
}

function writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
    }
}


// =============================================================================
// 2. GREEN ROOM / PRE-SESSION LOBBY
// =============================================================================

const GreenRoom = ({ sessionId, isHost, userName, onJoinStudio, onLeave }) => {
    const [micStream, setMicStream] = useState(null);
    const [selectedMic, setSelectedMic] = useState('');
    const [selectedCamera, setSelectedCamera] = useState('');
    const [devices, setDevices] = useState({ mics: [], cameras: [] });
    const [micLevel, setMicLevel] = useState(0);
    const [videoEnabled, setVideoEnabled] = useState(false);
    const [isMicTesting, setIsMicTesting] = useState(false);
    const [isReady, setIsReady] = useState(false);
    const videoRef = useRef(null);
    const analyserRef = useRef(null);
    const animFrameRef = useRef(null);

    useEffect(() => {
        // Enumerate devices
        navigator.mediaDevices.enumerateDevices().then(deviceList => {
            setDevices({
                mics: deviceList.filter(d => d.kind === 'audioinput'),
                cameras: deviceList.filter(d => d.kind === 'videoinput')
            });
        });
    }, []);

    const startMicTest = async () => {
        try {
            const constraints = {
                audio: selectedMic ? { deviceId: { exact: selectedMic } } : true,
                video: videoEnabled && selectedCamera
                    ? { deviceId: { exact: selectedCamera }, width: 1280, height: 720 }
                    : videoEnabled ? { width: 1280, height: 720 } : false
            };
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            setMicStream(stream);
            setIsMicTesting(true);

            // Show video preview
            if (videoRef.current && videoEnabled) {
                videoRef.current.srcObject = stream;
            }

            // Mic level meter
            const ctx = new AudioContext();
            const source = ctx.createMediaStreamSource(stream);
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 256;
            source.connect(analyser);
            analyserRef.current = analyser;

            const updateLevel = () => {
                const data = new Uint8Array(analyser.frequencyBinCount);
                analyser.getByteFrequencyData(data);
                const avg = data.reduce((a, b) => a + b) / data.length;
                setMicLevel(avg / 255 * 100);
                animFrameRef.current = requestAnimationFrame(updateLevel);
            };
            updateLevel();
        } catch (err) {
            console.error('Device access error:', err);
        }
    };

    const stopMicTest = () => {
        if (micStream) {
            micStream.getTracks().forEach(t => t.stop());
            setMicStream(null);
        }
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        setIsMicTesting(false);
        setMicLevel(0);
    };

    useEffect(() => {
        return () => {
            stopMicTest();
        };
    }, []);

    const handleJoin = () => {
        // Pass selected devices to studio
        onJoinStudio({
            micId: selectedMic,
            cameraId: selectedCamera,
            videoEnabled,
            stream: micStream
        });
    };

    return (
        <div className="green-room">
            <div className="green-room-header">
                <h2>🟢 Green Room</h2>
                <p className="green-room-subtitle">
                    Check your setup before joining the studio
                </p>
            </div>

            <div className="green-room-content">
                {/* Video Preview */}
                <div className="green-room-preview">
                    {videoEnabled ? (
                        <video
                            ref={videoRef}
                            autoPlay
                            muted
                            playsInline
                            className="green-room-video"
                        />
                    ) : (
                        <div className="green-room-avatar">
                            <span className="avatar-initial">
                                {userName?.charAt(0)?.toUpperCase() || '?'}
                            </span>
                            <p>{userName || 'Guest'}</p>
                        </div>
                    )}

                    {/* Mic Level Indicator */}
                    <div className="green-room-mic-level">
                        <div className="mic-level-bar">
                            <div
                                className="mic-level-fill"
                                style={{
                                    height: `${micLevel}%`,
                                    backgroundColor: micLevel > 80 ? '#ff4444' :
                                        micLevel > 50 ? '#FF6600' : '#00ffc8'
                                }}
                            />
                        </div>
                        <span className="mic-level-label">
                            {isMicTesting ? `${Math.round(micLevel)}%` : '—'}
                        </span>
                    </div>
                </div>

                {/* Device Selection */}
                <div className="green-room-controls">
                    <div className="device-select-group">
                        <label>🎤 Microphone</label>
                        <select
                            value={selectedMic}
                            onChange={e => setSelectedMic(e.target.value)}
                            className="device-select"
                        >
                            <option value="">Default Microphone</option>
                            {devices.mics.map(d => (
                                <option key={d.deviceId} value={d.deviceId}>
                                    {d.label || `Mic ${d.deviceId.slice(0, 8)}`}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="device-select-group">
                        <label>📷 Camera</label>
                        <select
                            value={selectedCamera}
                            onChange={e => setSelectedCamera(e.target.value)}
                            className="device-select"
                            disabled={!videoEnabled}
                        >
                            <option value="">Default Camera</option>
                            {devices.cameras.map(d => (
                                <option key={d.deviceId} value={d.deviceId}>
                                    {d.label || `Camera ${d.deviceId.slice(0, 8)}`}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="device-toggles">
                        <button
                            className={`toggle-btn ${videoEnabled ? 'active' : ''}`}
                            onClick={() => setVideoEnabled(!videoEnabled)}
                        >
                            {videoEnabled ? '📹 Video On' : '📹 Video Off'}
                        </button>

                        <button
                            className={`toggle-btn test-btn ${isMicTesting ? 'testing' : ''}`}
                            onClick={isMicTesting ? stopMicTest : startMicTest}
                        >
                            {isMicTesting ? '⏹ Stop Test' : '🎙 Test Mic'}
                        </button>
                    </div>

                    {/* Audio Quality Indicator */}
                    {isMicTesting && (
                        <div className="audio-quality-check">
                            <div className={`quality-item ${micLevel > 5 ? 'pass' : 'fail'}`}>
                                {micLevel > 5 ? '✅' : '❌'} Microphone detected
                            </div>
                            <div className={`quality-item ${micLevel < 80 ? 'pass' : 'warn'}`}>
                                {micLevel < 80 ? '✅' : '⚠️'} Audio level
                                {micLevel >= 80 ? ' — too loud, move back' : ' OK'}
                            </div>
                            <div className="quality-item pass">
                                ✅ Recording quality: WAV 48kHz / 24-bit
                            </div>
                        </div>
                    )}

                    {/* Waiting Room Info */}
                    {!isHost && (
                        <div className="waiting-message">
                            <div className="waiting-spinner" />
                            <p>Waiting for host to start the session...</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="green-room-actions">
                <button className="btn-leave" onClick={onLeave}>
                    Leave
                </button>
                <button
                    className="btn-join-studio"
                    onClick={handleJoin}
                    disabled={!isHost && !isReady}
                >
                    {isHost ? '🎙 Start Studio' : '✅ Ready to Join'}
                </button>
            </div>
        </div>
    );
};


// =============================================================================
// 3. AI TRANSCRIPTION + TEXT-BASED EDITING
// =============================================================================
// Uses Whisper/Deepgram for word-level timestamps, then lets you edit
// the transcript to edit the audio (delete words = cut audio)

const TranscriptEditor = ({ audioUrl, episodeId, onEditComplete }) => {
    const [transcript, setTranscript] = useState(null);
    const [words, setWords] = useState([]); // { word, start, end, deleted, isFiller }
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [showFillers, setShowFillers] = useState(true);
    const [editHistory, setEditHistory] = useState([]);
    const [stats, setStats] = useState({ fillers: 0, pauses: 0, totalRemoved: 0 });
    const audioRef = useRef(null);
    const token = sessionStorage.getItem('token');

    const FILLER_WORDS = ['um', 'uh', 'uhh', 'umm', 'hmm', 'hm', 'ah', 'like', 'you know',
        'i mean', 'sort of', 'kind of', 'basically', 'actually', 'literally',
        'right', 'so', 'well', 'er', 'erm'];

    // Transcribe audio
    const handleTranscribe = async () => {
        setIsTranscribing(true);
        try {
            const res = await fetch('/api/podcast-studio/transcribe', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ audio_url: audioUrl, episode_id: episodeId })
            });
            const data = await res.json();

            if (data.words) {
                const processedWords = data.words.map((w, i) => ({
                    id: i,
                    word: w.word || w.punctuated_word,
                    start: w.start,
                    end: w.end,
                    confidence: w.confidence,
                    deleted: false,
                    isFiller: FILLER_WORDS.some(f =>
                        w.word.toLowerCase().replace(/[.,!?]/g, '') === f
                    ),
                    isPause: false,
                    speaker: w.speaker || 0
                }));

                // Detect long pauses (> 1.5 seconds between words)
                for (let i = 1; i < processedWords.length; i++) {
                    const gap = processedWords[i].start - processedWords[i - 1].end;
                    if (gap > 1.5) {
                        processedWords[i].isPause = true;
                        processedWords[i].pauseDuration = gap;
                    }
                }

                setWords(processedWords);
                setTranscript(data.full_text);

                // Count stats
                const fillerCount = processedWords.filter(w => w.isFiller).length;
                const pauseCount = processedWords.filter(w => w.isPause).length;
                setStats({ fillers: fillerCount, pauses: pauseCount, totalRemoved: 0 });
            }
        } catch (err) {
            console.error('Transcription error:', err);
        }
        setIsTranscribing(false);
    };

    // Remove all filler words
    const removeAllFillers = () => {
        const updated = words.map(w => ({
            ...w,
            deleted: w.deleted || w.isFiller
        }));
        setWords(updated);
        const removed = updated.filter(w => w.deleted).length;
        setStats(prev => ({ ...prev, totalRemoved: removed }));
        setEditHistory(prev => [...prev, { type: 'remove_fillers', timestamp: Date.now() }]);
    };

    // Remove all long pauses (trim to 0.5s)
    const removeAllPauses = () => {
        const updated = words.map(w => ({
            ...w,
            trimmedPause: w.isPause ? Math.max(0.5, w.pauseDuration * 0.3) : undefined
        }));
        setWords(updated);
        setEditHistory(prev => [...prev, { type: 'remove_pauses', timestamp: Date.now() }]);
    };

    // Toggle delete on a word (click to strike through)
    const toggleWord = (id) => {
        const updated = words.map(w =>
            w.id === id ? { ...w, deleted: !w.deleted } : w
        );
        setWords(updated);
        const removed = updated.filter(w => w.deleted).length;
        setStats(prev => ({ ...prev, totalRemoved: removed }));
    };

    // Select range of words to delete
    const [selectionStart, setSelectionStart] = useState(null);

    const handleWordMouseDown = (id) => {
        setSelectionStart(id);
    };

    const handleWordMouseUp = (id) => {
        if (selectionStart !== null && selectionStart !== id) {
            const start = Math.min(selectionStart, id);
            const end = Math.max(selectionStart, id);
            const updated = words.map(w =>
                w.id >= start && w.id <= end ? { ...w, deleted: true } : w
            );
            setWords(updated);
            const removed = updated.filter(w => w.deleted).length;
            setStats(prev => ({ ...prev, totalRemoved: removed }));
        }
        setSelectionStart(null);
    };

    // Undo last edit
    const handleUndo = () => {
        if (editHistory.length === 0) return;
        const lastEdit = editHistory[editHistory.length - 1];
        if (lastEdit.type === 'remove_fillers') {
            setWords(prev => prev.map(w => ({
                ...w,
                deleted: w.isFiller ? false : w.deleted
            })));
        }
        setEditHistory(prev => prev.slice(0, -1));
    };

    // Generate edit decision list (timestamps to keep/cut)
    const generateEDL = () => {
        const edl = [];
        let currentSegment = null;

        words.forEach(w => {
            if (!w.deleted) {
                if (!currentSegment) {
                    currentSegment = { start: w.start, end: w.end };
                } else {
                    currentSegment.end = w.end;
                }
            } else {
                if (currentSegment) {
                    edl.push(currentSegment);
                    currentSegment = null;
                }
            }
        });
        if (currentSegment) edl.push(currentSegment);
        return edl;
    };

    // Apply edits — send EDL to backend for actual audio cutting
    const applyEdits = async () => {
        const edl = generateEDL();
        try {
            const res = await fetch('/api/podcast-studio/apply-text-edits', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    episode_id: episodeId,
                    audio_url: audioUrl,
                    edit_decision_list: edl,
                    words: words.filter(w => !w.deleted).map(w => ({
                        word: w.word, start: w.start, end: w.end
                    }))
                })
            });
            const data = await res.json();
            if (data.edited_audio_url) {
                onEditComplete(data.edited_audio_url, data.transcript);
            }
        } catch (err) {
            console.error('Apply edits error:', err);
        }
    };

    // Playback with word highlighting
    useEffect(() => {
        if (!audioRef.current) return;
        const audio = audioRef.current;
        const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
        audio.addEventListener('timeupdate', handleTimeUpdate);
        return () => audio.removeEventListener('timeupdate', handleTimeUpdate);
    }, []);

    const playFromWord = (word) => {
        if (audioRef.current) {
            audioRef.current.currentTime = word.start;
            audioRef.current.play();
            setIsPlaying(true);
        }
    };

    return (
        <div className="transcript-editor">
            <div className="transcript-header">
                <h3>📝 Text-Based Editor</h3>
                <p className="transcript-subtitle">
                    Click words to remove them. Select ranges by dragging. Edit your podcast like a document.
                </p>
            </div>

            {!transcript && !isTranscribing && (
                <div className="transcript-empty">
                    <button className="btn-transcribe" onClick={handleTranscribe}>
                        ✨ Generate Transcript
                    </button>
                    <p>AI transcription with word-level timestamps</p>
                </div>
            )}

            {isTranscribing && (
                <div className="transcript-loading">
                    <div className="loading-spinner" />
                    <p>Transcribing audio... This may take 30-60 seconds</p>
                    <div className="loading-steps">
                        <span className="step active">🎤 Uploading audio</span>
                        <span className="step">🧠 AI processing</span>
                        <span className="step">📝 Generating timestamps</span>
                        <span className="step">🔍 Detecting fillers</span>
                    </div>
                </div>
            )}

            {words.length > 0 && (
                <>
                    {/* Toolbar */}
                    <div className="transcript-toolbar">
                        <div className="toolbar-actions">
                            <button
                                className="toolbar-btn remove-fillers"
                                onClick={removeAllFillers}
                            >
                                🗑 Remove Fillers ({stats.fillers})
                            </button>
                            <button
                                className="toolbar-btn remove-pauses"
                                onClick={removeAllPauses}
                            >
                                ⏩ Trim Pauses ({stats.pauses})
                            </button>
                            <button
                                className="toolbar-btn undo"
                                onClick={handleUndo}
                                disabled={editHistory.length === 0}
                            >
                                ↩ Undo
                            </button>
                        </div>

                        <div className="toolbar-stats">
                            <span className="stat">
                                <strong>{stats.totalRemoved}</strong> words removed
                            </span>
                            <span className="stat">
                                <strong>
                                    {Math.round(words.filter(w => w.deleted)
                                        .reduce((acc, w) => acc + (w.end - w.start), 0))}s
                                </strong> trimmed
                            </span>
                        </div>

                        <div className="toolbar-toggles">
                            <label className="toggle-label">
                                <input
                                    type="checkbox"
                                    checked={showFillers}
                                    onChange={e => setShowFillers(e.target.checked)}
                                />
                                Highlight fillers
                            </label>
                        </div>
                    </div>

                    {/* Audio player */}
                    <audio ref={audioRef} src={audioUrl} />

                    {/* Transcript text */}
                    <div className="transcript-text">
                        {words.map(w => (
                            <span
                                key={w.id}
                                className={[
                                    'transcript-word',
                                    w.deleted ? 'deleted' : '',
                                    w.isFiller && showFillers ? 'filler' : '',
                                    w.isPause ? 'has-pause' : '',
                                    currentTime >= w.start && currentTime <= w.end ? 'playing' : ''
                                ].filter(Boolean).join(' ')}
                                onMouseDown={() => handleWordMouseDown(w.id)}
                                onMouseUp={() => handleWordMouseUp(w.id)}
                                onClick={() => toggleWord(w.id)}
                                onDoubleClick={() => playFromWord(w)}
                                title={`${w.start.toFixed(1)}s - ${w.end.toFixed(1)}s${w.isFiller ? ' (filler)' : ''}${w.isPause ? ` (${w.pauseDuration.toFixed(1)}s pause)` : ''}`}
                            >
                                {w.isPause && (
                                    <span className="pause-marker">
                                        ⏸ {w.pauseDuration.toFixed(1)}s
                                    </span>
                                )}
                                {w.word}{' '}
                            </span>
                        ))}
                    </div>

                    {/* Apply button */}
                    <div className="transcript-apply">
                        <button className="btn-apply-edits" onClick={applyEdits}>
                            ✂️ Apply Edits & Export
                        </button>
                        <span className="apply-note">
                            Creates a new audio file with your edits applied
                        </span>
                    </div>
                </>
            )}
        </div>
    );
};


// =============================================================================
// 4. PROGRESSIVE UPLOAD ENGINE
// =============================================================================
// Uploads chunks every 30 seconds during recording so files are nearly
// ready when you hit stop (like Riverside)

class ProgressiveUploader {
    constructor(sessionId, trackId, token) {
        this.sessionId = sessionId;
        this.trackId = trackId;
        this.token = token;
        this.chunkIndex = 0;
        this.uploadedChunks = [];
        this.isUploading = false;
        this.queue = [];
    }

    async uploadChunk(blob, currentDuration) {
        this.queue.push({ blob, chunkIndex: this.chunkIndex++, currentDuration });
        if (!this.isUploading) {
            this.processQueue();
        }
    }

    async processQueue() {
        if (this.queue.length === 0) {
            this.isUploading = false;
            return;
        }
        this.isUploading = true;
        const { blob, chunkIndex, currentDuration } = this.queue.shift();

        try {
            const formData = new FormData();
            formData.append('chunk', blob, `chunk_${chunkIndex}.wav`);
            formData.append('session_id', this.sessionId);
            formData.append('track_id', this.trackId);
            formData.append('chunk_index', chunkIndex);
            formData.append('duration', currentDuration);

            const res = await fetch('/api/podcast-studio/upload-chunk', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${this.token}` },
                body: formData
            });

            if (res.ok) {
                this.uploadedChunks.push(chunkIndex);
            }
        } catch (err) {
            console.error(`Chunk ${chunkIndex} upload failed:`, err);
            // Re-queue failed chunk
            this.queue.unshift({ blob, chunkIndex, currentDuration });
        }

        this.processQueue();
    }

    async finalizeUpload(finalBlob) {
        // Upload the complete final WAV file
        const formData = new FormData();
        formData.append('audio', finalBlob, `recording_${this.trackId}.wav`);
        formData.append('session_id', this.sessionId);
        formData.append('track_id', this.trackId);
        formData.append('is_final', 'true');
        formData.append('uploaded_chunks', JSON.stringify(this.uploadedChunks));

        const res = await fetch('/api/podcast-studio/upload-track', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${this.token}` },
            body: formData
        });

        return await res.json();
    }

    getProgress() {
        return {
            chunksUploaded: this.uploadedChunks.length,
            chunksQueued: this.queue.length,
            isUploading: this.isUploading
        };
    }
}


// =============================================================================
// 5. RECORDING QUALITY SELECTOR
// =============================================================================
// Let user choose between WAV (lossless) and Opus (compressed) based on
// their internet speed and storage preferences

const RecordingQualitySelector = ({ value, onChange }) => {
    const qualities = [
        {
            id: 'wav-24',
            label: 'Studio (WAV 48kHz/24-bit)',
            description: 'Uncompressed lossless — same as Riverside Pro',
            bitrate: '~2.3 Mbps',
            fileSize: '~17 MB/min',
            icon: '🏆',
            recommended: true
        },
        {
            id: 'wav-16',
            label: 'High (WAV 48kHz/16-bit)',
            description: 'Lossless CD quality — great for most podcasts',
            bitrate: '~1.5 Mbps',
            fileSize: '~11 MB/min',
            icon: '⭐'
        },
        {
            id: 'opus-256',
            label: 'Standard (Opus 256kbps)',
            description: 'Near-lossless compressed — saves bandwidth',
            bitrate: '256 kbps',
            fileSize: '~1.9 MB/min',
            icon: '📡'
        },
        {
            id: 'opus-128',
            label: 'Compact (Opus 128kbps)',
            description: 'Good quality compressed — for slow connections',
            bitrate: '128 kbps',
            fileSize: '~0.96 MB/min',
            icon: '📱'
        }
    ];

    return (
        <div className="quality-selector">
            <label className="quality-label">Recording Quality</label>
            <div className="quality-options">
                {qualities.map(q => (
                    <div
                        key={q.id}
                        className={`quality-option ${value === q.id ? 'selected' : ''} ${q.recommended ? 'recommended' : ''}`}
                        onClick={() => onChange(q.id)}
                    >
                        <div className="quality-header">
                            <span className="quality-icon">{q.icon}</span>
                            <span className="quality-name">{q.label}</span>
                            {q.recommended && <span className="quality-badge">Recommended</span>}
                        </div>
                        <p className="quality-desc">{q.description}</p>
                        <div className="quality-stats">
                            <span>{q.bitrate}</span>
                            <span>{q.fileSize}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};


// =============================================================================
// EXPORT ALL PHASE 1 COMPONENTS
// =============================================================================

export {
    WAVRecordingEngine,
    GreenRoom,
    TranscriptEditor,
    ProgressiveUploader,
    RecordingQualitySelector,
    float32ToPCM16,
    float32ToPCM24
};