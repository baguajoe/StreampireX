// =============================================================================
// TransientShaperPlugin.js — Attack/Sustain transient shaper
// =============================================================================
// Location: src/front/js/component/audio/audio/plugins/plugins/TransientShaperPlugin.js

export default class TransientShaperPlugin {
  static pluginId   = 'transient-shaper';
  static pluginName = 'Transient Shaper';
  static category   = 'Dynamics';

  constructor(audioContext) {
    this.ctx    = audioContext;
    this.input  = audioContext.createGain();
    this.output = audioContext.createGain();

    // Attack envelope follower
    this.attackEnv  = audioContext.createDynamicsCompressor();
    this.attackEnv.threshold.value = -24;
    this.attackEnv.knee.value      = 6;
    this.attackEnv.ratio.value     = 4;
    this.attackEnv.attack.value    = 0.003;
    this.attackEnv.release.value   = 0.1;

    // Sustain envelope follower (slower)
    this.sustainEnv = audioContext.createDynamicsCompressor();
    this.sustainEnv.threshold.value = -24;
    this.sustainEnv.knee.value      = 6;
    this.sustainEnv.ratio.value     = 2;
    this.sustainEnv.attack.value    = 0.05;
    this.sustainEnv.release.value   = 0.5;

    this.attackGain  = audioContext.createGain();
    this.sustainGain = audioContext.createGain();

    this.params = {
      attack:  0,    // -12 to +12 dB
      sustain: 0,    // -12 to +12 dB
      speed:   'medium', // fast | medium | slow
    };

    // Signal flow: input → attackEnv → attackGain → output
    //                    → sustainEnv → sustainGain ↗
    this.input.connect(this.attackEnv);
    this.input.connect(this.sustainEnv);
    this.attackEnv.connect(this.attackGain);
    this.sustainEnv.connect(this.sustainGain);
    this.attackGain.connect(this.output);
    this.sustainGain.connect(this.output);
    this.input.connect(this.output); // dry signal
  }

  setParam(key, value) {
    this.params[key] = value;
    if (key === 'attack') {
      this.attackGain.gain.setTargetAtTime(
        Math.pow(10, value / 20), 0, 0.01
      );
    }
    if (key === 'sustain') {
      this.sustainGain.gain.setTargetAtTime(
        Math.pow(10, value / 20), 0, 0.01
      );
    }
    if (key === 'speed') {
      const speeds = { fast: 0.001, medium: 0.003, slow: 0.01 };
      this.attackEnv.attack.value = speeds[value] ?? 0.003;
    }
  }

  getState()       { return { ...this.params }; }
  setState(s)      { if (s) Object.entries(s).forEach(([k,v]) => this.setParam(k,v)); }
  connect(dest)    { this.output.connect(dest); }
  disconnect()     { this.output.disconnect(); }
  destroy()        { this.disconnect(); }
}
