// =============================================================================
// VintageEQPlugin.js — Vintage console EQ (Neve 1073 / API 550 style)
// =============================================================================
// Location: src/front/js/component/audio/audio/plugins/plugins/VintageEQPlugin.js

export default class VintageEQPlugin {
  static pluginId   = 'vintage-eq';
  static pluginName = 'Vintage Console EQ';
  static category   = 'EQ';

  // Fixed frequency bands like classic hardware
  static NEVE_FREQS = {
    high:   [12000, 16000, 'shelving'],
    hiMid:  [1600, 3200, 4800, 6400, 8000, 'peak'],
    loMid:  [360, 700, 1000, 1600, 'peak'],
    low:    [35, 60, 110, 220, 'shelving'],
  };

  constructor(audioContext) {
    this.ctx    = audioContext;
    this.input  = audioContext.createGain();
    this.output = audioContext.createGain();

    // 4-band vintage EQ
    this.filters = {
      highPass: audioContext.createBiquadFilter(),
      low:      audioContext.createBiquadFilter(),
      loMid:    audioContext.createBiquadFilter(),
      hiMid:    audioContext.createBiquadFilter(),
      high:     audioContext.createBiquadFilter(),
    };

    // Configure filters
    this.filters.highPass.type            = 'highpass';
    this.filters.highPass.frequency.value = 80;
    this.filters.highPass.Q.value         = 0.7;

    this.filters.low.type            = 'lowshelf';
    this.filters.low.frequency.value = 110;
    this.filters.low.gain.value      = 0;

    this.filters.loMid.type            = 'peaking';
    this.filters.loMid.frequency.value = 700;
    this.filters.loMid.Q.value         = 0.7;
    this.filters.loMid.gain.value      = 0;

    this.filters.hiMid.type            = 'peaking';
    this.filters.hiMid.frequency.value = 3200;
    this.filters.hiMid.Q.value         = 0.7;
    this.filters.hiMid.gain.value      = 0;

    this.filters.high.type            = 'highshelf';
    this.filters.high.frequency.value = 12000;
    this.filters.high.gain.value      = 0;

    // Chain
    const chain = ['highPass','low','loMid','hiMid','high'];
    this.input.connect(this.filters[chain[0]]);
    for (let i = 0; i < chain.length - 1; i++) {
      this.filters[chain[i]].connect(this.filters[chain[i+1]]);
    }
    this.filters[chain[chain.length-1]].connect(this.output);

    // Add harmonic saturation (subtle)
    this.waveshaper = audioContext.createWaveShaper();
    this.waveshaper.curve = this._makeVintageCurve(0.15);
    this.waveshaper.oversample = '2x';

    this.params = {
      hpfOn:     false,
      lowFreq:   110,   lowGain:  0,
      loMidFreq: 700,   loMidGain: 0,
      hiMidFreq: 3200,  hiMidGain: 0,
      highFreq:  12000, highGain: 0,
      drive:     0,     // 0-100% analog saturation
    };
  }

  _makeVintageCurve(amount) {
    const n = 256, curve = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = (2 * i / n) - 1;
      curve[i] = (Math.PI + amount) * x / (Math.PI + amount * Math.abs(x));
    }
    return curve;
  }

  setParam(key, value) {
    this.params[key] = value;
    const f = this.filters;
    if (key === 'hpfOn')     f.highPass.frequency.value = value ? 80 : 20;
    if (key === 'lowFreq')   f.low.frequency.setTargetAtTime(value, 0, 0.01);
    if (key === 'lowGain')   f.low.gain.setTargetAtTime(value, 0, 0.01);
    if (key === 'loMidFreq') f.loMid.frequency.setTargetAtTime(value, 0, 0.01);
    if (key === 'loMidGain') f.loMid.gain.setTargetAtTime(value, 0, 0.01);
    if (key === 'hiMidFreq') f.hiMid.frequency.setTargetAtTime(value, 0, 0.01);
    if (key === 'hiMidGain') f.hiMid.gain.setTargetAtTime(value, 0, 0.01);
    if (key === 'highFreq')  f.high.frequency.setTargetAtTime(value, 0, 0.01);
    if (key === 'highGain')  f.high.gain.setTargetAtTime(value, 0, 0.01);
    if (key === 'drive') {
      this.waveshaper.curve = this._makeVintageCurve(value / 100 * 0.8);
    }
  }

  getState()    { return { ...this.params }; }
  setState(s)   { if (s) Object.entries(s).forEach(([k,v]) => this.setParam(k,v)); }
  connect(dest) { this.output.connect(dest); }
  disconnect()  { this.output.disconnect(); }
  destroy()     { this.disconnect(); }
}
