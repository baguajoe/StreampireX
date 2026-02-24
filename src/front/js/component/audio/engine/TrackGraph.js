// =============================================================================
// TrackGraph.js — Per-Track Audio Routing Graph
// =============================================================================
// source → preGain → INSERT_RACK_IN → [plugin1 → plugin2 → ...] →
//   INSERT_RACK_OUT → faderGain → panNode → outputNode → master
//
// The insert rack is managed by PluginHost — TrackGraph provides the
// input/output nodes that PluginHost connects through.
// =============================================================================

class TrackGraph {
  constructor(id, context, options = {}) {
    this.id = id;
    this.context = context;

    this.name = options.name || `Track ${id}`;
    this.trackType = options.trackType || 'audio'; // audio | midi | bus
    this.color = options.color || '#34c759';
    this.volume = options.volume ?? 0.8;
    this.pan = options.pan ?? 0;
    this.muted = options.muted ?? false;
    this.solo = options.solo ?? false;

    this.audioBuffer = null;
    this._sourceNode = null;

    // Build the graph nodes
    this.inputNode = context.createGain();        // source connects here
    this.preGain = context.createGain();
    this.preGain.gain.value = 1.0;

    this.insertRackInput = context.createGain();   // plugins chain from here
    this.insertRackOutput = context.createGain();   // ...to here

    this.faderGain = context.createGain();
    this.faderGain.gain.value = this.volume;

    this.panNode = context.createStereoPanner();
    this.panNode.pan.value = this.pan;

    this.outputNode = context.createGain();
    this.outputNode.gain.value = 1.0;

    // Analyser for metering
    this.analyser = context.createAnalyser();
    this.analyser.fftSize = 512;

    // Wire: input → preGain → rackIn → rackOut → fader → pan → analyser → output
    this.inputNode.connect(this.preGain);
    this.preGain.connect(this.insertRackInput);
    this.insertRackInput.connect(this.insertRackOutput); // direct passthrough (PluginHost overrides)
    this.insertRackOutput.connect(this.faderGain);
    this.faderGain.connect(this.panNode);
    this.panNode.connect(this.analyser);
    this.analyser.connect(this.outputNode);

    // Mute handling
    this._updateMute();
  }

  // ── Connect to master bus ──
  connectToMaster(masterNode) {
    this.outputNode.connect(masterNode);
  }

  // ── Disconnect from everything ──
  disconnect() {
    try {
      this.stop();
      this.outputNode.disconnect();
    } catch (e) { /* may already be disconnected */ }
  }

  // ── Playback ──
  setAudioBuffer(buffer) {
    this.audioBuffer = buffer;
  }

  play(offset = 0) {
    this.stop();
    if (!this.audioBuffer || this.muted) return;

    this._sourceNode = this.context.createBufferSource();
    this._sourceNode.buffer = this.audioBuffer;
    this._sourceNode.connect(this.inputNode);

    const clampedOffset = Math.min(offset, this.audioBuffer.duration);
    this._sourceNode.start(0, clampedOffset);
    this._sourceNode.onended = () => { this._sourceNode = null; };
  }

  stop() {
    if (this._sourceNode) {
      try { this._sourceNode.stop(); } catch (e) {}
      this._sourceNode = null;
    }
  }

  // ── Parameters ──
  setVolume(v) {
    this.volume = Math.max(0, Math.min(2, v));
    this.faderGain.gain.value = this.volume;
  }

  setPan(p) {
    this.pan = Math.max(-1, Math.min(1, p));
    this.panNode.pan.value = this.pan;
  }

  setMuted(m) {
    this.muted = m;
    this._updateMute();
  }

  setSolo(s) {
    this.solo = s;
    // Solo logic is typically managed globally by the engine
  }

  _updateMute() {
    this.outputNode.gain.value = this.muted ? 0 : 1;
  }

  // ── Metering ──
  getPeakLevel() {
    if (!this.analyser) return 0;
    const data = new Float32Array(this.analyser.fftSize);
    this.analyser.getFloatTimeDomainData(data);
    let peak = 0;
    for (let i = 0; i < data.length; i++) {
      const abs = Math.abs(data[i]);
      if (abs > peak) peak = abs;
    }
    return peak;
  }

  getRmsLevel() {
    if (!this.analyser) return 0;
    const data = new Float32Array(this.analyser.fftSize);
    this.analyser.getFloatTimeDomainData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i++) sum += data[i] * data[i];
    return Math.sqrt(sum / data.length);
  }

  // ── Insert rack passthrough management ──
  // Called by PluginHost to disconnect the direct passthrough
  // and wire plugins between insertRackInput and insertRackOutput
  disconnectInsertPassthrough() {
    try { this.insertRackInput.disconnect(this.insertRackOutput); } catch (e) {}
  }

  reconnectInsertPassthrough() {
    try { this.insertRackInput.disconnect(); } catch (e) {}
    this.insertRackInput.connect(this.insertRackOutput);
  }

  // ── Serialization ──
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      trackType: this.trackType,
      color: this.color,
      volume: this.volume,
      pan: this.pan,
      muted: this.muted,
      solo: this.solo,
    };
  }
}

export default TrackGraph;