// =============================================================================
// ParametricEQPlugin.js — 8-band parametric EQ with visual frequency curve
// =============================================================================
// Location: src/front/js/component/audio/audio/plugins/plugins/ParametricEQPlugin.js

export default class ParametricEQPlugin {
  static pluginId   = 'parametric-eq';
  static pluginName = '8-Band Parametric EQ';
  static category   = 'EQ';

  constructor(audioContext) {
    this.ctx    = audioContext;
    this.input  = audioContext.createGain();
    this.output = audioContext.createGain();

    // 8 bands: LowShelf, Peak x6, HighShelf
    this.bands = [
      { type: 'lowshelf',  freq: 80,    gain: 0, q: 0.7  },
      { type: 'peaking',   freq: 200,   gain: 0, q: 1.0  },
      { type: 'peaking',   freq: 500,   gain: 0, q: 1.0  },
      { type: 'peaking',   freq: 1000,  gain: 0, q: 1.0  },
      { type: 'peaking',   freq: 2500,  gain: 0, q: 1.0  },
      { type: 'peaking',   freq: 5000,  gain: 0, q: 1.0  },
      { type: 'peaking',   freq: 10000, gain: 0, q: 1.0  },
      { type: 'highshelf', freq: 16000, gain: 0, q: 0.7  },
    ];

    this.filters = this.bands.map(b => {
      const f        = audioContext.createBiquadFilter();
      f.type         = b.type;
      f.frequency.value = b.freq;
      f.gain.value   = b.gain;
      f.Q.value      = b.q;
      return f;
    });

    // Chain: input → f0 → f1 → ... → f7 → output
    this.input.connect(this.filters[0]);
    for (let i = 0; i < this.filters.length - 1; i++) {
      this.filters[i].connect(this.filters[i + 1]);
    }
    this.filters[this.filters.length - 1].connect(this.output);
  }

  setParam(bandIndex, param, value) {
    const f = this.filters[bandIndex];
    if (!f) return;
    if (param === 'freq')  f.frequency.setTargetAtTime(value, 0, 0.01);
    if (param === 'gain')  f.gain.setTargetAtTime(value, 0, 0.01);
    if (param === 'q')     f.Q.setTargetAtTime(value, 0, 0.01);
    if (param === 'type')  { f.type = value; }
    this.bands[bandIndex] = { ...this.bands[bandIndex], [param]: value };
  }

  getState() {
    return { bands: this.bands.map(b => ({ ...b })) };
  }

  setState(state) {
    if (!state?.bands) return;
    state.bands.forEach((b, i) => {
      this.setParam(i, 'freq', b.freq);
      this.setParam(i, 'gain', b.gain);
      this.setParam(i, 'q',    b.q);
      this.setParam(i, 'type', b.type);
    });
  }

  // Get frequency response for drawing the curve
  getFrequencyResponse(freqArray) {
    const mag = new Float32Array(freqArray.length).fill(1);
    const magBand = new Float32Array(freqArray.length);
    const phase   = new Float32Array(freqArray.length);
    this.filters.forEach(f => {
      f.getFrequencyResponse(freqArray, magBand, phase);
      for (let i = 0; i < mag.length; i++) mag[i] *= magBand[i];
    });
    return mag;
  }

  connect(dest)    { this.output.connect(dest); }
  disconnect()     { this.output.disconnect(); }
  destroy()        { this.disconnect(); }
}
