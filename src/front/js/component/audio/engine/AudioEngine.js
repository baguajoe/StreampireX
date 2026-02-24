// =============================================================================
// AudioEngine.js — Core Audio Engine for StreamPireX DAW
// =============================================================================
// Single source of truth for the entire audio graph.
//   - Creates and owns the AudioContext
//   - Transport: play / pause / stop / seek / loop
//   - Track registry with automatic master bus routing
//   - Offline export (bounce) via OfflineAudioContext
//   - Metronome click
//   - Master limiter
// =============================================================================

let _instance = null;

class AudioEngine {
  constructor() {
    if (_instance) return _instance;
    _instance = this;

    this.context = null;
    this.masterInput = null;
    this.masterGain = null;
    this.masterLimiter = null;
    this.masterAnalyser = null;

    this.tracks = new Map();
    this.isPlaying = false;
    this.isRecording = false;
    this.bpm = 120;
    this.timeSignature = [4, 4];
    this.loopEnabled = false;
    this.loopStart = 0;
    this.loopEnd = 0;
    this.startTime = 0;
    this.startOffset = 0;

    this._metronomeEnabled = false;
    this._listeners = new Map();
    this._transportRAF = null;
  }

  // ── Initialize ──
  init() {
    if (this.context && this.context.state !== 'closed') return this;

    this.context = new (window.AudioContext || window.webkitAudioContext)({
      latencyHint: 'interactive',
      sampleRate: 48000,
    });

    // Master chain: input → gain → limiter → analyser → destination
    this.masterInput = this.context.createGain();
    this.masterGain = this.context.createGain();
    this.masterGain.gain.value = 0.8;

    this.masterLimiter = this.context.createDynamicsCompressor();
    this.masterLimiter.threshold.value = -1;
    this.masterLimiter.knee.value = 0;
    this.masterLimiter.ratio.value = 20;
    this.masterLimiter.attack.value = 0.001;
    this.masterLimiter.release.value = 0.05;

    this.masterAnalyser = this.context.createAnalyser();
    this.masterAnalyser.fftSize = 2048;

    this.masterInput
      .connect(this.masterGain)
      .connect(this.masterLimiter)
      .connect(this.masterAnalyser)
      .connect(this.context.destination);

    return this;
  }

  async resume() {
    if (this.context?.state === 'suspended') await this.context.resume();
  }

  // ── Transport ──
  get currentTime() {
    if (!this.context) return 0;
    if (!this.isPlaying) return this.startOffset;
    return this.context.currentTime - this.startTime + this.startOffset;
  }

  get beatPosition() {
    return (this.currentTime / 60) * this.bpm;
  }

  play() {
    if (this.isPlaying || !this.context) return;
    this.resume();
    this.startTime = this.context.currentTime;
    this.isPlaying = true;
    this.tracks.forEach(t => t.play?.(this.startOffset));
    this._startTransportTick();
    this._emit('transport', { state: 'playing', time: this.currentTime });
  }

  pause() {
    if (!this.isPlaying) return;
    this.startOffset = this.currentTime;
    this.isPlaying = false;
    this.tracks.forEach(t => t.stop?.());
    this._stopTransportTick();
    this._emit('transport', { state: 'paused', time: this.currentTime });
  }

  stop() {
    this.isPlaying = false;
    this.startOffset = 0;
    this.tracks.forEach(t => t.stop?.());
    this._stopTransportTick();
    this._emit('transport', { state: 'stopped', time: 0 });
  }

  seek(timeSeconds) {
    const wasPlaying = this.isPlaying;
    if (wasPlaying) this.pause();
    this.startOffset = Math.max(0, timeSeconds);
    if (wasPlaying) this.play();
    this._emit('transport', { state: wasPlaying ? 'playing' : 'paused', time: this.startOffset });
  }

  _startTransportTick() {
    const tick = () => {
      if (!this.isPlaying) return;
      if (this.loopEnabled && this.loopEnd > this.loopStart && this.currentTime >= this.loopEnd) {
        this.seek(this.loopStart);
      }
      this._emit('tick', { time: this.currentTime, beat: this.beatPosition });
      this._transportRAF = requestAnimationFrame(tick);
    };
    this._transportRAF = requestAnimationFrame(tick);
  }

  _stopTransportTick() {
    if (this._transportRAF) { cancelAnimationFrame(this._transportRAF); this._transportRAF = null; }
  }

  // ── Track management ──
  registerTrack(trackGraph) {
    this.tracks.set(trackGraph.id, trackGraph);
    trackGraph.connectToMaster(this.masterInput);
  }

  unregisterTrack(trackId) {
    const track = this.tracks.get(trackId);
    if (track) { track.disconnect(); this.tracks.delete(trackId); }
  }

  getTrack(trackId) { return this.tracks.get(trackId); }

  setMasterVolume(v) {
    if (this.masterGain) this.masterGain.gain.value = Math.max(0, Math.min(2, v));
  }

  setBpm(bpm) {
    this.bpm = Math.max(20, Math.min(300, bpm));
    this._emit('bpm', this.bpm);
  }

  // ── Metronome ──
  setMetronome(on) { this._metronomeEnabled = on; }

  clickMetronome(isDownbeat) {
    if (!this.context || !this._metronomeEnabled) return;
    const osc = this.context.createOscillator();
    const g = this.context.createGain();
    osc.frequency.value = isDownbeat ? 1000 : 800;
    g.gain.value = 0.15;
    g.gain.exponentialRampToValueAtTime(0.001, this.context.currentTime + 0.05);
    osc.connect(g).connect(this.context.destination);
    osc.start(); osc.stop(this.context.currentTime + 0.05);
  }

  // ── Offline Bounce ──
  async bounce(durationSeconds) {
    const sr = this.context?.sampleRate || 48000;
    const offline = new OfflineAudioContext(2, Math.ceil(durationSeconds * sr), sr);
    const master = offline.createGain();
    master.gain.value = this.masterGain?.gain.value ?? 0.8;
    master.connect(offline.destination);

    this.tracks.forEach(track => {
      if (track.audioBuffer && !track.muted) {
        const src = offline.createBufferSource();
        src.buffer = track.audioBuffer;
        const g = offline.createGain(); g.gain.value = track.volume ?? 1;
        const p = offline.createStereoPanner(); p.pan.value = track.pan ?? 0;
        src.connect(g).connect(p).connect(master);
        src.start(0);
      }
    });

    return offline.startRendering();
  }

  // ── Events ──
  on(event, cb) {
    if (!this._listeners.has(event)) this._listeners.set(event, new Set());
    this._listeners.get(event).add(cb);
    return () => this._listeners.get(event)?.delete(cb);
  }

  _emit(event, data) {
    this._listeners.get(event)?.forEach(cb => { try { cb(data); } catch (e) { console.error(`[AudioEngine] ${event}:`, e); } });
  }

  destroy() {
    this.stop();
    this.tracks.forEach(t => t.disconnect?.());
    this.tracks.clear();
    if (this.context?.state !== 'closed') this.context?.close();
    _instance = null;
  }
}

export const getEngine = () => {
  if (!_instance) _instance = new AudioEngine();
  return _instance;
};

export default AudioEngine;