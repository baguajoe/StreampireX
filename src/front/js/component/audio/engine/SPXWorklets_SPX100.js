// =============================================================================
// SPXWorklets_SPX100.js — 28 New AudioWorklet DSP Processors
// Append to: src/front/js/component/audio/engine/SPXWorklets.js
// =============================================================================

// ─── TAPE STOP — pitch ramps to halt, motor restart ──────────────────────────
export const getTapeStopWorkletSource = () => `
class SPXTapeStopProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name:'active',    defaultValue:0,   minValue:0, maxValue:1 },
      { name:'stopTime',  defaultValue:0.5, minValue:0.05, maxValue:3 },
      { name:'startTime', defaultValue:0.3, minValue:0.05, maxValue:3 },
      { name:'curve',     defaultValue:0.5, minValue:0, maxValue:1 },
    ];
  }
  constructor() {
    super();
    this._phase = 0;
    this._speed = 1.0;
    this._buf = [new Float32Array(sampleRate*2), new Float32Array(sampleRate*2)];
    this._write = 0;
    this._state = 'play'; // play|stopping|stopped|starting
    this._wasActive = false;
    this.port.onmessage = (e) => { if (e.data === 'stop') this._state = 'stopping'; if (e.data === 'start') this._state = 'starting'; };
  }
  process(inputs, outputs, parameters) {
    const inp = inputs[0], out = outputs[0];
    if (!inp||!inp[0]) return true;
    const active    = parameters.active[0] > 0.5;
    const stopSamps = Math.floor((parameters.stopTime[0]??0.5) * sampleRate);
    const startSamps= Math.floor((parameters.startTime[0]??0.3) * sampleRate);
    const curve     = parameters.curve[0] ?? 0.5;
    const nCh = Math.min(inp.length, out.length);
    const N   = inp[0].length;

    if (active && !this._wasActive) this._state = 'stopping';
    if (!active && this._wasActive) this._state = 'starting';
    this._wasActive = active;

    for (let i = 0; i < N; i++) {
      for (let c = 0; c < nCh; c++) this._buf[c][this._write] = inp[c][i];
      this._write = (this._write + 1) % (sampleRate * 2);

      if (this._state === 'stopping') {
        this._speed = Math.max(0, this._speed - 1/stopSamps);
        if (this._speed <= 0) { this._speed = 0; this._state = 'stopped'; }
      } else if (this._state === 'starting') {
        this._speed = Math.min(1, this._speed + 1/startSamps);
        if (this._speed >= 1) { this._speed = 1; this._state = 'play'; }
      }

      // Curved speed (exponential feel)
      const s = Math.pow(this._speed, 1 + curve * 2);
      this._phase = (this._phase + s + sampleRate*2) % (sampleRate*2);
      const ri = Math.floor(this._phase);
      const rf = this._phase - ri;
      const r0 = (this._write - ri - 1 + sampleRate*2) % (sampleRate*2);
      const r1 = (r0 - 1 + sampleRate*2) % (sampleRate*2);
      for (let c = 0; c < nCh; c++) {
        out[c][i] = this._buf[c][r0]*(1-rf) + this._buf[c][r1]*rf;
      }
    }
    return true;
  }
}
registerProcessor('spx-tape-stop', SPXTapeStopProcessor);
`;

// ─── TRANSIENT SHAPER — sample-accurate attack/sustain control ───────────────
export const getTransientShaperWorkletSource = () => `
class SPXTransientShaperProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name:'attack',   defaultValue:0,  minValue:-24, maxValue:24 },
      { name:'sustain',  defaultValue:0,  minValue:-24, maxValue:24 },
      { name:'speed',    defaultValue:0.5,minValue:0,   maxValue:1  },
      { name:'outputGain',defaultValue:1, minValue:0,   maxValue:4  },
    ];
  }
  constructor() {
    super();
    this._envA = 0; this._envR = 0;
    this._dcZ = [0,0]; this._dcOut = [0,0];
  }
  process(inputs, outputs, parameters) {
    const inp = inputs[0], out = outputs[0];
    if (!inp||!inp[0]) return true;
    const atk    = Math.pow(10, (parameters.attack[0]??0)/20);
    const sus    = Math.pow(10, (parameters.sustain[0]??0)/20);
    const speed  = parameters.speed[0] ?? 0.5;
    const ogain  = parameters.outputGain[0] ?? 1;
    // Fast envelope (attack detection)
    const fastCoeff = Math.exp(-1/(sampleRate*(0.001+speed*0.004)));
    // Slow envelope (sustain detection)
    const slowCoeff = Math.exp(-1/(sampleRate*(0.01+speed*0.1)));
    const nCh = Math.min(inp.length, out.length);
    const N   = inp[0].length;
    for (let i = 0; i < N; i++) {
      let peak = 0;
      for (let c = 0; c < nCh; c++) peak = Math.max(peak, Math.abs(inp[c][i]));
      // Fast: tracks attack
      if (peak > this._envA) this._envA = peak;
      else this._envA = fastCoeff*this._envA + (1-fastCoeff)*peak;
      // Slow: tracks sustain
      if (peak > this._envR) this._envR = peak;
      else this._envR = slowCoeff*this._envR + (1-slowCoeff)*peak;
      // Attack = fast - slow, Sustain = slow
      const atkAmt = Math.max(0, this._envA - this._envR);
      const susAmt = this._envR;
      const gain = (peak > 1e-6)
        ? (atkAmt*atk + susAmt*sus) / Math.max(peak, 1e-6)
        : 1;
      for (let c = 0; c < nCh; c++) {
        this._dcOut[c] = inp[c][i]*gain*ogain - this._dcZ[c] + 0.9995*this._dcOut[c];
        this._dcZ[c] = inp[c][i]*gain*ogain;
        out[c][i] = this._dcOut[c];
      }
    }
    return true;
  }
}
registerProcessor('spx-transient-shaper', SPXTransientShaperProcessor);
`;

// ─── MULTIBAND SAT — 4-band independent saturation ───────────────────────────
export const getMultibandSatWorkletSource = () => `
class SPXMultibandSatProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name:'xover1',  defaultValue:200,  minValue:40,   maxValue:800  },
      { name:'xover2',  defaultValue:2000, minValue:400,  maxValue:8000 },
      { name:'xover3',  defaultValue:8000, minValue:2000, maxValue:18000},
      { name:'drive1',  defaultValue:0.3,  minValue:0,    maxValue:1    },
      { name:'drive2',  defaultValue:0.3,  minValue:0,    maxValue:1    },
      { name:'drive3',  defaultValue:0.2,  minValue:0,    maxValue:1    },
      { name:'drive4',  defaultValue:0.1,  minValue:0,    maxValue:1    },
      { name:'mix',     defaultValue:0.5,  minValue:0,    maxValue:1    },
    ];
  }
  constructor() {
    super();
    // 4-band Linkwitz-Riley crossover states (2 channels each)
    this._lp1 = [[0,0],[0,0]]; this._hp1 = [[0,0],[0,0]];
    this._lp2 = [[0,0],[0,0]]; this._hp2 = [[0,0],[0,0]];
    this._lp3 = [[0,0],[0,0]]; this._hp3 = [[0,0],[0,0]];
  }
  _lp(x, z, coeff) {
    z[0] = coeff*z[0] + (1-coeff)*x;
    z[1] = coeff*z[1] + (1-coeff)*z[0];
    return z[1];
  }
  _sat(x, drive) {
    const g = 1 + drive*6;
    return Math.tanh(x*g) / Math.tanh(g);
  }
  process(inputs, outputs, parameters) {
    const inp = inputs[0], out = outputs[0];
    if (!inp||!inp[0]) return true;
    const x1 = parameters.xover1[0]??200, x2 = parameters.xover2[0]??2000, x3 = parameters.xover3[0]??8000;
    const d1=parameters.drive1[0]??0.3, d2=parameters.drive2[0]??0.3;
    const d3=parameters.drive3[0]??0.2, d4=parameters.drive4[0]??0.1;
    const mix = parameters.mix[0]??0.5;
    const c1=Math.exp(-2*Math.PI*x1/sampleRate);
    const c2=Math.exp(-2*Math.PI*x2/sampleRate);
    const c3=Math.exp(-2*Math.PI*x3/sampleRate);
    const nCh=Math.min(inp.length,out.length), N=inp[0].length;
    for (let i=0;i<N;i++) {
      for (let c=0;c<nCh;c++) {
        const s=inp[c][i];
        const b1=this._lp(s, this._lp1[c], c1);
        const hp1=s-b1;
        const b2=this._lp(hp1, this._lp2[c], c2);
        const hp2=hp1-b2;
        const b3=this._lp(hp2, this._lp3[c], c3);
        const b4=hp2-b3;
        const wet=this._sat(b1,d1)+this._sat(b2,d2)+this._sat(b3,d3)+this._sat(b4,d4);
        out[c][i]=s*(1-mix)+wet*mix;
      }
    }
    return true;
  }
}
registerProcessor('spx-multiband-sat', SPXMultibandSatProcessor);
`;

// ─── STEREO IMAGER — per-frequency stereo width (Ozone style) ────────────────
export const getStereoImagerWorkletSource = () => `
class SPXStereoImagerProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name:'lowWidth',  defaultValue:0.8, minValue:0, maxValue:2 },
      { name:'midWidth',  defaultValue:1.0, minValue:0, maxValue:2 },
      { name:'highWidth', defaultValue:1.2, minValue:0, maxValue:2 },
      { name:'xover1',    defaultValue:300, minValue:80, maxValue:800 },
      { name:'xover2',    defaultValue:5000,minValue:800,maxValue:18000},
    ];
  }
  constructor() {
    super();
    this._lp1=[new Float32Array(2),new Float32Array(2)];
    this._lp2=[new Float32Array(2),new Float32Array(2)];
  }
  _msWidth(l, r, width) {
    const mid=(l+r)*0.7071, side=(l-r)*0.7071*width;
    return [(mid+side)*0.7071,(mid-side)*0.7071];
  }
  process(inputs, outputs, parameters) {
    const inp=inputs[0],out=outputs[0];
    if (!inp||!inp[0]||inp.length<2) return true;
    const lw=parameters.lowWidth[0]??0.8, mw=parameters.midWidth[0]??1.0, hw=parameters.highWidth[0]??1.2;
    const x1=parameters.xover1[0]??300, x2=parameters.xover2[0]??5000;
    const c1=Math.exp(-2*Math.PI*x1/sampleRate);
    const c2=Math.exp(-2*Math.PI*x2/sampleRate);
    const N=inp[0].length;
    for (let i=0;i<N;i++) {
      const l=inp[0][i], r=inp[1]?inp[1][i]:l;
      // Split into 3 bands
      this._lp1[0][0]=c1*this._lp1[0][0]+(1-c1)*l; this._lp1[1][0]=c1*this._lp1[1][0]+(1-c1)*r;
      this._lp1[0][1]=c1*this._lp1[0][1]+(1-c1)*this._lp1[0][0]; this._lp1[1][1]=c1*this._lp1[1][1]+(1-c1)*this._lp1[1][0];
      const lowL=this._lp1[0][1], lowR=this._lp1[1][1];
      const midHiL=l-lowL, midHiR=r-lowR;
      this._lp2[0][0]=c2*this._lp2[0][0]+(1-c2)*midHiL; this._lp2[1][0]=c2*this._lp2[1][0]+(1-c2)*midHiR;
      this._lp2[0][1]=c2*this._lp2[0][1]+(1-c2)*this._lp2[0][0]; this._lp2[1][1]=c2*this._lp2[1][1]+(1-c2)*this._lp2[1][0];
      const midL=this._lp2[0][1], midR=this._lp2[1][1];
      const hiL=midHiL-midL, hiR=midHiR-midR;
      const [wlL,wlR]=this._msWidth(lowL,lowR,lw);
      const [wmL,wmR]=this._msWidth(midL,midR,mw);
      const [whL,whR]=this._msWidth(hiL,hiR,hw);
      out[0][i]=wlL+wmL+whL; out[1][i]=wlR+wmR+whR;
    }
    return true;
  }
}
registerProcessor('spx-stereo-imager', SPXStereoImagerProcessor);
`;

// ─── 808 ENHANCER — sub bass shaper with harmonic generation ─────────────────
export const get808EnhancerWorkletSource = () => `
class SPX808EnhancerProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name:'freq',      defaultValue:60,  minValue:30,  maxValue:120  },
      { name:'punch',     defaultValue:0.5, minValue:0,   maxValue:1    },
      { name:'sub',       defaultValue:0.6, minValue:0,   maxValue:1    },
      { name:'harmonic',  defaultValue:0.3, minValue:0,   maxValue:1    },
      { name:'outputGain',defaultValue:1.0, minValue:0,   maxValue:4    },
    ];
  }
  constructor() {
    super();
    this._lpZ=[0,0]; this._hpZ=[0,0];
    this._envZ=0; this._phase=0;
    this._dcZ=[0,0]; this._dcOut=[0,0];
  }
  process(inputs, outputs, parameters) {
    const inp=inputs[0],out=outputs[0];
    if (!inp||!inp[0]) return true;
    const freq=parameters.freq[0]??60;
    const punch=parameters.punch[0]??0.5;
    const sub=parameters.sub[0]??0.6;
    const harm=parameters.harmonic[0]??0.3;
    const ogain=parameters.outputGain[0]??1.0;
    const lpCoeff=Math.exp(-2*Math.PI*freq*2/sampleRate);
    const hpCoeff=Math.exp(-2*Math.PI*freq*0.5/sampleRate);
    const envCoeff=Math.exp(-1/(sampleRate*0.005));
    const nCh=Math.min(inp.length,out.length),N=inp[0].length;
    for (let i=0;i<N;i++) {
      let peak=0;
      for (let c=0;c<nCh;c++) peak=Math.max(peak,Math.abs(inp[c][i]));
      if (peak>this._envZ) this._envZ=peak;
      else this._envZ=envCoeff*this._envZ+(1-envCoeff)*peak;
      // Synthesize sub sine
      this._phase=(this._phase+2*Math.PI*freq/sampleRate)%(2*Math.PI);
      const subSine=Math.sin(this._phase)*this._envZ*sub;
      const h2=Math.sin(this._phase*2)*this._envZ*harm*0.4;
      const h3=Math.sin(this._phase*3)*this._envZ*harm*0.2;
      for (let c=0;c<nCh;c++) {
        // LP original for sub content, HP for punch
        this._lpZ[c]=lpCoeff*this._lpZ[c]+(1-lpCoeff)*inp[c][i];
        this._hpZ[c]=hpCoeff*this._hpZ[c]+(1-hpCoeff)*inp[c][i];
        const punchSig=(inp[c][i]-this._hpZ[c])*punch;
        let s=inp[c][i]+subSine+h2+h3+punchSig;
        this._dcOut[c]=s-this._dcZ[c]+0.9995*this._dcOut[c];
        this._dcZ[c]=s;
        out[c][i]=this._dcOut[c]*ogain;
      }
    }
    return true;
  }
}
registerProcessor('spx-808-enhancer', SPX808EnhancerProcessor);
`;

// ─── LOFI CRUSHER — bit reduction + filtering + noise + wobble ───────────────
export const getLoFiCrusherWorkletSource = () => `
class SPXLoFiCrusherProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name:'bits',    defaultValue:12,  minValue:4,  maxValue:24   },
      { name:'rate',    defaultValue:0.5, minValue:0.1,maxValue:1    },
      { name:'filter',  defaultValue:0.5, minValue:0,  maxValue:1    },
      { name:'noise',   defaultValue:0.05,minValue:0,  maxValue:0.3  },
      { name:'wobble',  defaultValue:0.02,minValue:0,  maxValue:0.1  },
      { name:'mix',     defaultValue:1.0, minValue:0,  maxValue:1    },
    ];
  }
  constructor() {
    super();
    this._held=[0,0]; this._sampleCount=0;
    this._lpZ=[0,0]; this._wobblePh=0;
    this._noiseZ=0;
  }
  _pink(w){this._noiseZ=0.99765*this._noiseZ+w*0.099046;return this._noiseZ+w*0.0555179;}
  process(inputs, outputs, parameters) {
    const inp=inputs[0],out=outputs[0];
    if (!inp||!inp[0]) return true;
    const bits=parameters.bits[0]??12;
    const rate=parameters.rate[0]??0.5;
    const filt=parameters.filter[0]??0.5;
    const noise=parameters.noise[0]??0.05;
    const wobble=parameters.wobble[0]??0.02;
    const mix=parameters.mix[0]??1.0;
    const sampleHold=Math.max(1,Math.floor((1-rate)*8+1));
    const levels=Math.pow(2,bits);
    const lpCoeff=Math.exp(-2*Math.PI*(500+filt*8000)/sampleRate);
    const nCh=Math.min(inp.length,out.length),N=inp[0].length;
    for (let i=0;i<N;i++) {
      this._wobblePh=(this._wobblePh+3.0/sampleRate)%1;
      const wob=Math.sin(2*Math.PI*this._wobblePh)*wobble;
      this._sampleCount++;
      if (this._sampleCount>=sampleHold) {
        this._sampleCount=0;
        for (let c=0;c<nCh;c++) {
          this._held[c]=Math.round((inp[c][i]+wob)*levels)/levels;
        }
      }
      for (let c=0;c<nCh;c++) {
        this._lpZ[c]=lpCoeff*this._lpZ[c]+(1-lpCoeff)*this._held[c];
        const n=this._pink(Math.random()*2-1)*noise;
        const wet=this._lpZ[c]+n;
        out[c][i]=inp[c][i]*(1-mix)+wet*mix;
      }
    }
    return true;
  }
}
registerProcessor('spx-lofi-crusher', SPXLoFiCrusherProcessor);
`;

// ─── INFINITE REVERB — freeze reverb tail, hold forever ──────────────────────
export const getInfiniteReverbWorkletSource = () => `
class SPXInfiniteReverbProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name:'freeze',    defaultValue:0,   minValue:0, maxValue:1 },
      { name:'roomSize',  defaultValue:0.9, minValue:0, maxValue:1 },
      { name:'damping',   defaultValue:0.3, minValue:0, maxValue:1 },
      { name:'mix',       defaultValue:0.5, minValue:0, maxValue:1 },
      { name:'shimmer',   defaultValue:0,   minValue:0, maxValue:1 },
    ];
  }
  constructor() {
    super();
    // 8 comb filters + 4 allpass (Schroeder)
    const COMB_SIZES = [1557,1617,1491,1422,1277,1356,1188,1116];
    const AP_SIZES   = [225,556,441,341];
    this._combs = COMB_SIZES.map(s=>({buf:new Float32Array(s),idx:0,filt:0}));
    this._aps   = AP_SIZES.map(s=>({buf:new Float32Array(s),idx:0}));
    this._frozen = [new Float32Array(sampleRate*4), new Float32Array(sampleRate*4)];
    this._freezeWrite=0; this._freezeRead=0;
    this._isFrozen=false;
  }
  process(inputs, outputs, parameters) {
    const inp=inputs[0],out=outputs[0];
    if (!inp||!inp[0]) return true;
    const freeze=parameters.freeze[0]>0.5;
    const room=parameters.roomSize[0]??0.9;
    const damp=parameters.damping[0]??0.3;
    const mix=parameters.mix[0]??0.5;
    const shimmer=parameters.shimmer[0]??0;
    const nCh=Math.min(inp.length,out.length),N=inp[0].length;
    const combFB=Math.min(0.98, 0.7+room*0.28);
    const dampCoeff=1-damp*0.4;
    for (let i=0;i<N;i++) {
      const s=(inp[0]?inp[0][i]:0+inp[1]?inp[1][i]:0)*0.5;
      const src=freeze?0:s;
      // Comb filters
      let combOut=0;
      for (const cb of this._combs) {
        const y=cb.buf[cb.idx];
        cb.filt=y*(1-dampCoeff)+cb.filt*dampCoeff;
        cb.buf[cb.idx]=src+cb.filt*combFB*(freeze?1.0:combFB);
        cb.idx=(cb.idx+1)%cb.buf.length;
        combOut+=y;
      }
      combOut*=0.125;
      // Allpass diffusion
      let ap=combOut;
      for (const a of this._aps) {
        const y=a.buf[a.idx];
        a.buf[a.idx]=ap+y*0.5;
        ap=y-ap*0.5;
        a.idx=(a.idx+1)%a.buf.length;
      }
      // Shimmer: pitch-up feedback
      const shimOut=shimmer>0.01 ? ap*(1+shimmer*0.3) : ap;
      for (let c=0;c<nCh;c++) {
        out[c][i]=(inp[c]?inp[c][i]:0)*(1-mix)+shimOut*mix;
      }
    }
    return true;
  }
}
registerProcessor('spx-infinite-reverb', SPXInfiniteReverbProcessor);
`;

// ─── REVERSE DELAY — records buffer then plays backwards ─────────────────────
export const getReverseDelayWorkletSource = () => `
class SPXReverseDelayProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name:'time',     defaultValue:500, minValue:50, maxValue:2000 },
      { name:'feedback', defaultValue:0.4, minValue:0,  maxValue:0.95 },
      { name:'mix',      defaultValue:0.4, minValue:0,  maxValue:1    },
      { name:'filter',   defaultValue:0.5, minValue:0,  maxValue:1    },
    ];
  }
  constructor() {
    super();
    const maxSamps=Math.ceil(2*sampleRate);
    this._buf=[new Float32Array(maxSamps),new Float32Array(maxSamps)];
    this._write=0; this._readPos=0; this._segLen=0; this._segStart=0;
    this._lpZ=[0,0];
    this._maxSamps=maxSamps;
  }
  process(inputs, outputs, parameters) {
    const inp=inputs[0],out=outputs[0];
    if (!inp||!inp[0]) return true;
    const timeMs=parameters.time[0]??500;
    const fb=parameters.feedback[0]??0.4;
    const mix=parameters.mix[0]??0.4;
    const filt=parameters.filter[0]??0.5;
    const segLen=Math.min(Math.floor(timeMs/1000*sampleRate),this._maxSamps-1);
    const lpCoeff=Math.exp(-2*Math.PI*(1000+filt*10000)/sampleRate);
    const nCh=Math.min(inp.length,out.length),N=inp[0].length;
    for (let i=0;i<N;i++) {
      // Write input to buffer
      for (let c=0;c<nCh;c++) this._buf[c][this._write]=inp[c][i];
      this._write=(this._write+1)%this._maxSamps;
      // Read backwards from current segment
      if (this._segLen!==segLen) { this._segLen=segLen; this._segStart=this._write; this._readPos=segLen-1; }
      const ri=(this._segStart-this._readPos-1+this._maxSamps)%this._maxSamps;
      this._readPos=(this._readPos-1+segLen)%segLen;
      for (let c=0;c<nCh;c++) {
        let rev=this._buf[c][ri];
        this._lpZ[c]=lpCoeff*this._lpZ[c]+(1-lpCoeff)*rev;
        rev=this._lpZ[c];
        // Feedback write
        this._buf[c][(this._write-1+this._maxSamps)%this._maxSamps]+=rev*fb;
        out[c][i]=inp[c][i]*(1-mix)+rev*mix;
      }
    }
    return true;
  }
}
registerProcessor('spx-reverse-delay', SPXReverseDelayProcessor);
`;

// ─── DECLICKER — transient spike removal for mouth clicks/pops ───────────────
export const getDeclickerWorkletSource = () => `
class SPXDeclickerProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name:'sensitivity',defaultValue:0.7,minValue:0,maxValue:1 },
      { name:'strength',   defaultValue:0.8,minValue:0,maxValue:1 },
      { name:'maxWidth',   defaultValue:3,  minValue:1,maxValue:10},
    ];
  }
  constructor() {
    super();
    const LA=64;
    this._bufs=[new Float32Array(LA),new Float32Array(LA)];
    this._idx=0; this._LA=LA;
    this._rmsZ=0; this._prevSamp=[0,0];
  }
  process(inputs, outputs, parameters) {
    const inp=inputs[0],out=outputs[0];
    if (!inp||!inp[0]) return true;
    const sens=parameters.sensitivity[0]??0.7;
    const str=parameters.strength[0]??0.8;
    const mw=Math.floor(parameters.maxWidth[0]??3);
    const nCh=Math.min(inp.length,out.length),N=inp[0].length;
    const thresh=0.05+sens*0.45;
    for (let i=0;i<N;i++) {
      // RMS of recent samples
      let sq=0;
      for (let c=0;c<nCh;c++) sq+=inp[c][i]*inp[c][i];
      this._rmsZ=this._rmsZ*0.999+sq*0.001;
      const rms=Math.sqrt(this._rmsZ/nCh);
      for (let c=0;c<nCh;c++) {
        const s=inp[c][i];
        // Detect sudden spike vs local RMS
        const spike=Math.abs(s)>rms*(1+thresh*8) && Math.abs(s-this._prevSamp[c])>rms*(1+thresh*4);
        if (spike) {
          // Interpolate between prev and next sample
          out[c][i]=this._prevSamp[c]*(1-str)+s*(1-str)*0.5;
        } else {
          out[c][i]=s;
        }
        this._prevSamp[c]=s;
      }
    }
    return true;
  }
}
registerProcessor('spx-declicker', SPXDeclickerProcessor);
`;

// ─── DEHUMMER — notch filter at 50/60Hz + harmonics ──────────────────────────
export const getDehummmerWorkletSource = () => `
class SPXDehummerProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name:'freq',      defaultValue:60,  minValue:50, maxValue:60  },
      { name:'harmonics', defaultValue:5,   minValue:1,  maxValue:10  },
      { name:'depth',     defaultValue:0.9, minValue:0,  maxValue:1   },
      { name:'learn',     defaultValue:0,   minValue:0,  maxValue:1   },
    ];
  }
  constructor() {
    super();
    // Per-harmonic notch states (up to 10 harmonics, 2 channels each)
    this._z1=Array.from({length:20},()=>[0,0]);
    this._z2=Array.from({length:20},()=>[0,0]);
  }
  process(inputs, outputs, parameters) {
    const inp=inputs[0],out=outputs[0];
    if (!inp||!inp[0]) return true;
    const freq=parameters.freq[0]??60;
    const harm=Math.floor(parameters.harmonics[0]??5);
    const depth=parameters.depth[0]??0.9;
    const nCh=Math.min(inp.length,out.length),N=inp[0].length;
    for (let i=0;i<N;i++) {
      for (let c=0;c<nCh;c++) {
        let s=inp[c][i];
        // Apply notch at each harmonic
        for (let h=1;h<=harm;h++) {
          const f=freq*h;
          const w0=2*Math.PI*f/sampleRate;
          const r=1-depth*0.1*(1/h); // shallower at higher harmonics
          const b0=1, b1=-2*Math.cos(w0), b2=1;
          const a1=-2*r*Math.cos(w0), a2=r*r;
          const idx=h-1;
          const y=b0*s+b1*this._z1[idx][c]+b2*this._z2[idx][c]-a1*this._z1[idx+10][c]-a2*this._z2[idx+10][c];
          this._z2[idx][c]=this._z1[idx][c]; this._z1[idx][c]=s;
          this._z2[idx+10][c]=this._z1[idx+10][c]; this._z1[idx+10][c]=y;
          s=y;
        }
        out[c][i]=s;
      }
    }
    return true;
  }
}
registerProcessor('spx-dehummerr', SPXDehummerProcessor);
`;

// ─── MID-SIDE COMP — compress mid and side independently ─────────────────────
export const getMidSideCompWorkletSource = () => `
class SPXMidSideCompProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name:'midThresh',  defaultValue:-18, minValue:-40, maxValue:0  },
      { name:'midRatio',   defaultValue:3,   minValue:1,   maxValue:20 },
      { name:'sideThresh', defaultValue:-24, minValue:-40, maxValue:0  },
      { name:'sideRatio',  defaultValue:4,   minValue:1,   maxValue:20 },
      { name:'attack',     defaultValue:10,  minValue:0.1, maxValue:200},
      { name:'release',    defaultValue:150, minValue:10,  maxValue:2000},
      { name:'makeup',     defaultValue:0,   minValue:-12, maxValue:12 },
    ];
  }
  constructor() {
    super();
    this._midEnv=-100; this._sideEnv=-100;
    this._midRms=new Float32Array(512); this._sideRms=new Float32Array(512);
    this._rmsIdx=0; this._midSum=0; this._sideSum=0;
  }
  _compress(db, thresh, ratio) {
    if (db<=thresh) return 0;
    return (thresh-db)*(1-1/ratio);
  }
  process(inputs, outputs, parameters) {
    const inp=inputs[0],out=outputs[0];
    if (!inp||!inp[0]||inp.length<2) return true;
    const mTh=parameters.midThresh[0]??-18, mRt=parameters.midRatio[0]??3;
    const sTh=parameters.sideThresh[0]??-24, sRt=parameters.sideRatio[0]??4;
    const atkMs=parameters.attack[0]??10, relMs=parameters.release[0]??150;
    const makeup=Math.pow(10,(parameters.makeup[0]??0)/20);
    const ac=Math.exp(-1/(sampleRate*atkMs/1000));
    const rc=Math.exp(-1/(sampleRate*relMs/1000));
    const N=inp[0].length;
    for (let i=0;i<N;i++) {
      const l=inp[0][i], r=inp[1][i];
      const mid=(l+r)*0.7071, side=(l-r)*0.7071;
      this._midSum-=this._midRms[this._rmsIdx]*this._midRms[this._rmsIdx];
      this._sideSum-=this._sideRms[this._rmsIdx]*this._sideRms[this._rmsIdx];
      this._midRms[this._rmsIdx]=mid; this._sideRms[this._rmsIdx]=side;
      this._midSum+=mid*mid; this._sideSum+=side*side;
      this._rmsIdx=(this._rmsIdx+1)%512;
      const mDb=Math.sqrt(Math.max(0,this._midSum)/512)>1e-6?20*Math.log10(Math.sqrt(this._midSum/512)):-100;
      const sDb=Math.sqrt(Math.max(0,this._sideSum)/512)>1e-6?20*Math.log10(Math.sqrt(this._sideSum/512)):-100;
      const mgr=mDb+this._compress(mDb,mTh,mRt);
      const sgr=sDb+this._compress(sDb,sTh,sRt);
      if (mgr<this._midEnv) this._midEnv=ac*this._midEnv+(1-ac)*mgr; else this._midEnv=rc*this._midEnv+(1-rc)*mgr;
      if (sgr<this._sideEnv) this._sideEnv=ac*this._sideEnv+(1-ac)*sgr; else this._sideEnv=rc*this._sideEnv+(1-rc)*sgr;
      const mGain=Math.sqrt(this._midSum/512)>1e-6?Math.pow(10,(this._midEnv-mDb)/20):1;
      const sGain=Math.sqrt(this._sideSum/512)>1e-6?Math.pow(10,(this._sideEnv-sDb)/20):1;
      const mOut=mid*mGain*makeup, sOut=side*sGain*makeup;
      out[0][i]=(mOut+sOut)*0.7071;
      if (out[1]) out[1][i]=(mOut-sOut)*0.7071;
    }
    return true;
  }
}
registerProcessor('spx-mid-side-comp', SPXMidSideCompProcessor);
`;

// ─── SUB OCTAVER — generate sub octave below input signal ────────────────────
export const getSubOctaverWorkletSource = () => `
class SPXSubOctaverProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name:'oct1Level',  defaultValue:0.7, minValue:0, maxValue:1 },
      { name:'oct2Level',  defaultValue:0.3, minValue:0, maxValue:1 },
      { name:'dryLevel',   defaultValue:1.0, minValue:0, maxValue:1 },
      { name:'filter',     defaultValue:0.4, minValue:0, maxValue:1 },
      { name:'trackSpeed', defaultValue:0.5, minValue:0, maxValue:1 },
    ];
  }
  constructor() {
    super();
    this._flipFlop=1; this._prevSign=0; this._oct1=0; this._oct2=0;
    this._envZ=0; this._lpZ=[0,0]; this._dcZ=[0,0]; this._dcOut=[0,0];
  }
  process(inputs, outputs, parameters) {
    const inp=inputs[0],out=outputs[0];
    if (!inp||!inp[0]) return true;
    const o1=parameters.oct1Level[0]??0.7;
    const o2=parameters.oct2Level[0]??0.3;
    const dry=parameters.dryLevel[0]??1.0;
    const filt=parameters.filter[0]??0.4;
    const lpCoeff=Math.exp(-2*Math.PI*(200+filt*1000)/sampleRate);
    const nCh=Math.min(inp.length,out.length),N=inp[0].length;
    for (let i=0;i<N;i++) {
      const s=inp[0][i];
      const sign=s>=0?1:-1;
      // Zero crossing detection for octave division
      if (sign!==this._prevSign) {
        this._flipFlop*=-1;
        if (this._flipFlop===1) this._oct2*=-1;
      }
      this._prevSign=sign;
      this._oct1=this._flipFlop*0.7;
      // Envelope track input for amplitude
      const absS=Math.abs(s);
      this._envZ=this._envZ*0.999+absS*0.001;
      const sub1=this._oct1*this._envZ*o1;
      const sub2=this._oct2*this._envZ*o2;
      for (let c=0;c<nCh;c++) {
        this._lpZ[c]=lpCoeff*this._lpZ[c]+(1-lpCoeff)*(sub1+sub2);
        const sub=this._lpZ[c];
        this._dcOut[c]=inp[c][i]*dry+sub-this._dcZ[c]+0.9995*this._dcOut[c];
        this._dcZ[c]=inp[c][i]*dry+sub;
        out[c][i]=this._dcOut[c];
      }
    }
    return true;
  }
}
registerProcessor('spx-sub-octaver', SPXSubOctaverProcessor);
`;

// ─── CHORUS ENSEMBLE — 8-voice Roland Dimension D style ──────────────────────
export const getChorusEnsembleWorkletSource = () => `
class SPXChorusEnsembleProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name:'mode',  defaultValue:1,   minValue:1, maxValue:4 },
      { name:'mix',   defaultValue:0.5, minValue:0, maxValue:1 },
      { name:'depth', defaultValue:0.5, minValue:0, maxValue:1 },
    ];
  }
  constructor() {
    super();
    // 8 delay lines with individual LFO phases
    const maxD=Math.ceil(0.04*sampleRate);
    this._delays=Array.from({length:8},()=>({buf:new Float32Array(maxD),idx:0}));
    this._lfoPhases=Array.from({length:8},(_,i)=>i/8);
    this._maxD=maxD;
  }
  process(inputs, outputs, parameters) {
    const inp=inputs[0],out=outputs[0];
    if (!inp||!inp[0]) return true;
    const mode=Math.floor(parameters.mode[0]??1);
    const mix=parameters.mix[0]??0.5;
    const depth=parameters.depth[0]??0.5;
    // Mode-based LFO rates (Hz)
    const rates=[0.3,0.5,0.8,1.2,1.8,2.5,3.5,5.0];
    const modeRates=[[0.3,0.5,0.8,1.2],[0.5,0.8,1.2,1.8],[0.8,1.2,1.8,2.5],[1.2,1.8,2.5,3.5]];
    const selectedRates=modeRates[mode-1]||modeRates[0];
    const nCh=Math.min(inp.length,out.length),N=inp[0].length;
    for (let i=0;i<N;i++) {
      const s=(inp[0][i]+(inp[1]?inp[1][i]:0))*0.5;
      let wetL=0,wetR=0;
      for (let v=0;v<8;v++) {
        const rate=selectedRates[v%4];
        this._lfoPhases[v]=(this._lfoPhases[v]+rate/sampleRate)%1;
        const lfo=Math.sin(2*Math.PI*this._lfoPhases[v]);
        const delayTime=Math.floor((0.01+lfo*0.015*depth)*sampleRate);
        const dt=Math.min(delayTime,this._maxD-1);
        const d=this._delays[v];
        d.buf[d.idx]=s;
        const ri=(d.idx-dt+this._maxD)%this._maxD;
        const wet=d.buf[ri];
        d.idx=(d.idx+1)%this._maxD;
        if (v%2===0) wetL+=wet; else wetR+=wet;
      }
      wetL*=0.25; wetR*=0.25;
      out[0][i]=inp[0][i]*(1-mix)+wetL*mix;
      if (out[1]) out[1][i]=(inp[1]?inp[1][i]:inp[0][i])*(1-mix)+wetR*mix;
    }
    return true;
  }
}
registerProcessor('spx-chorus-ensemble', SPXChorusEnsembleProcessor);
`;

// ─── TEMPO DELAY — BPM-synced delay with note value selection ────────────────
export const getTempoDelayWorkletSource = () => `
class SPXTempoDelayProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name:'bpm',       defaultValue:120,  minValue:60,  maxValue:200 },
      { name:'division',  defaultValue:4,    minValue:1,   maxValue:16  },
      { name:'feedback',  defaultValue:0.4,  minValue:0,   maxValue:0.95},
      { name:'filterHP',  defaultValue:100,  minValue:20,  maxValue:2000},
      { name:'filterLP',  defaultValue:8000, minValue:1000,maxValue:20000},
      { name:'mix',       defaultValue:0.3,  minValue:0,   maxValue:1   },
      { name:'pingPong',  defaultValue:0,    minValue:0,   maxValue:1   },
    ];
  }
  constructor() {
    super();
    const maxD=Math.ceil(3*sampleRate);
    this._bufL=new Float32Array(maxD); this._bufR=new Float32Array(maxD);
    this._write=0; this._maxD=maxD;
    this._hpZL=0; this._hpZR=0; this._lpZL=0; this._lpZR=0;
  }
  process(inputs, outputs, parameters) {
    const inp=inputs[0],out=outputs[0];
    if (!inp||!inp[0]) return true;
    const bpm=parameters.bpm[0]??120;
    const div=parameters.division[0]??4;
    const fb=parameters.feedback[0]??0.4;
    const fHP=parameters.filterHP[0]??100;
    const fLP=parameters.filterLP[0]??8000;
    const mix=parameters.mix[0]??0.3;
    const pp=parameters.pingPong[0]>0.5;
    // Note divisions: 1=whole,2=half,4=quarter,8=eighth,16=sixteenth
    const beatSecs=60/bpm;
    const delaySecs=beatSecs*(4/div);
    const delaySamps=Math.min(Math.floor(delaySecs*sampleRate),this._maxD-1);
    const hpC=Math.exp(-2*Math.PI*fHP/sampleRate);
    const lpC=Math.exp(-2*Math.PI*fLP/sampleRate);
    const nCh=Math.min(inp.length,out.length),N=inp[0].length;
    for (let i=0;i<N;i++) {
      const l=inp[0][i], r=inp[1]?inp[1][i]:l;
      const ri=(this._write-delaySamps+this._maxD)%this._maxD;
      let delL=this._bufL[ri], delR=pp?this._bufR[(this._write-delaySamps*2+this._maxD)%this._maxD]:this._bufR[ri];
      // Filter delay signal
      this._hpZL=hpC*this._hpZL+(1-hpC)*delL; delL=delL-this._hpZL;
      this._hpZR=hpC*this._hpZR+(1-hpC)*delR; delR=delR-this._hpZR;
      this._lpZL=lpC*this._lpZL+(1-lpC)*delL; delL=this._lpZL;
      this._lpZR=lpC*this._lpZR+(1-lpC)*delR; delR=this._lpZR;
      this._bufL[this._write]=l+delR*fb;
      this._bufR[this._write]=r+delL*fb;
      this._write=(this._write+1)%this._maxD;
      out[0][i]=l*(1-mix)+delL*mix;
      if (out[1]) out[1][i]=r*(1-mix)+delR*mix;
    }
    return true;
  }
}
registerProcessor('spx-tempo-delay', SPXTempoDelayProcessor);
`;

// ─── PITCH RANDOMIZER — humanize with random detune per note ─────────────────
export const getPitchRandomizerWorkletSource = () => `
class SPXPitchRandomizerProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name:'amount',  defaultValue:10,  minValue:0, maxValue:100 },
      { name:'rate',    defaultValue:4,   minValue:0.1,maxValue:20 },
      { name:'smooth',  defaultValue:0.7, minValue:0, maxValue:1   },
      { name:'mix',     defaultValue:1.0, minValue:0, maxValue:1   },
    ];
  }
  constructor() {
    super();
    const maxD=Math.ceil(0.1*sampleRate);
    this._buf=[new Float32Array(maxD),new Float32Array(maxD)];
    this._write=0; this._maxD=maxD;
    this._targetDetune=0; this._currentDetune=0; this._timer=0;
  }
  process(inputs, outputs, parameters) {
    const inp=inputs[0],out=outputs[0];
    if (!inp||!inp[0]) return true;
    const amount=parameters.amount[0]??10;
    const rate=parameters.rate[0]??4;
    const smooth=parameters.smooth[0]??0.7;
    const mix=parameters.mix[0]??1.0;
    const changePeriod=Math.floor(sampleRate/rate);
    const smoothCoeff=Math.exp(-1/(sampleRate*smooth*0.1+0.001));
    const nCh=Math.min(inp.length,out.length),N=inp[0].length;
    for (let i=0;i<N;i++) {
      for (let c=0;c<nCh;c++) this._buf[c][this._write]=inp[c][i];
      this._write=(this._write+1)%this._maxD;
      this._timer++;
      if (this._timer>=changePeriod) {
        this._timer=0;
        this._targetDetune=(Math.random()*2-1)*amount;
      }
      this._currentDetune=smoothCoeff*this._currentDetune+(1-smoothCoeff)*this._targetDetune;
      // Convert cents to delay samples: 100 cents = 1 semitone = ratio 2^(1/12)
      const ratio=Math.pow(2,this._currentDetune/1200);
      const delaySamps=Math.max(0,(1/ratio-1)*sampleRate*0.01);
      const dI=Math.floor(delaySamps), dF=delaySamps-dI;
      for (let c=0;c<nCh;c++) {
        const r0=(this._write-dI-1+this._maxD)%this._maxD;
        const r1=(r0-1+this._maxD)%this._maxD;
        const pitched=this._buf[c][r0]*(1-dF)+this._buf[c][r1]*dF;
        out[c][i]=inp[c][i]*(1-mix)+pitched*mix;
      }
    }
    return true;
  }
}
registerProcessor('spx-pitch-randomizer', SPXPitchRandomizerProcessor);
`;

// ─── AUTO WAH — envelope-triggered resonant filter ───────────────────────────
export const getAutoWahWorkletSource = () => `
class SPXAutoWahProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name:'sensitivity',defaultValue:0.6,minValue:0,maxValue:1    },
      { name:'minFreq',    defaultValue:200,minValue:50,maxValue:2000 },
      { name:'maxFreq',    defaultValue:4000,minValue:500,maxValue:12000},
      { name:'resonance',  defaultValue:8,  minValue:1, maxValue:20  },
      { name:'attack',     defaultValue:5,  minValue:0.1,maxValue:100},
      { name:'release',    defaultValue:200,minValue:10,maxValue:2000 },
      { name:'mix',        defaultValue:1.0,minValue:0, maxValue:1   },
    ];
  }
  constructor() {
    super();
    this._env=0;
    this._bpZ1=[0,0]; this._bpZ2=[0,0]; this._bpZ3=[0,0]; this._bpZ4=[0,0];
    this._currentFreq=200;
  }
  process(inputs, outputs, parameters) {
    const inp=inputs[0],out=outputs[0];
    if (!inp||!inp[0]) return true;
    const sens=parameters.sensitivity[0]??0.6;
    const minF=parameters.minFreq[0]??200;
    const maxF=parameters.maxFreq[0]??4000;
    const res=parameters.resonance[0]??8;
    const atkMs=parameters.attack[0]??5;
    const relMs=parameters.release[0]??200;
    const mix=parameters.mix[0]??1.0;
    const ac=Math.exp(-1/(sampleRate*atkMs/1000));
    const rc=Math.exp(-1/(sampleRate*relMs/1000));
    const nCh=Math.min(inp.length,out.length),N=inp[0].length;
    for (let i=0;i<N;i++) {
      let peak=0;
      for (let c=0;c<nCh;c++) peak=Math.max(peak,Math.abs(inp[c][i]));
      if (peak>this._env) this._env=ac*this._env+(1-ac)*peak;
      else this._env=rc*this._env+(1-rc)*peak;
      // Map envelope to frequency
      const targetFreq=minF+Math.pow(this._env*sens,0.7)*(maxF-minF);
      this._currentFreq=this._currentFreq*0.98+targetFreq*0.02;
      const f=this._currentFreq;
      const w0=2*Math.PI*f/sampleRate;
      const bwR=Math.exp(-w0/(res*2));
      const b0=1-bwR,b2=-(1-bwR),a1=-2*bwR*Math.cos(w0),a2=bwR*bwR;
      for (let c=0;c<nCh;c++) {
        const x=inp[c][i];
        const y=b0*x+b2*this._bpZ2[c]-a1*this._bpZ3[c]-a2*this._bpZ4[c];
        this._bpZ2[c]=this._bpZ1[c]; this._bpZ1[c]=x;
        this._bpZ4[c]=this._bpZ3[c]; this._bpZ3[c]=y;
        out[c][i]=x*(1-mix)+y*mix;
      }
    }
    return true;
  }
}
registerProcessor('spx-auto-wah', SPXAutoWahProcessor);
`;

// ─── DRUM ENHANCER — all-in-one drum bus: punch + snap + glue ────────────────
export const getDrumEnhancerWorkletSource = () => `
class SPXDrumEnhancerProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name:'punch',   defaultValue:0.5,minValue:0,maxValue:1 },
      { name:'snap',    defaultValue:0.4,minValue:0,maxValue:1 },
      { name:'glue',    defaultValue:0.4,minValue:0,maxValue:1 },
      { name:'sub',     defaultValue:0.3,minValue:0,maxValue:1 },
      { name:'air',     defaultValue:0.3,minValue:0,maxValue:1 },
      { name:'outputGain',defaultValue:1,minValue:0,maxValue:4 },
    ];
  }
  constructor() {
    super();
    // Transient envelope
    this._fastEnv=0; this._slowEnv=0;
    // Sub enhancer
    this._subPhase=0; this._subEnv=0;
    // Air exciter
    this._airHPZ=[0,0]; this._airLPZ=[0,0];
    // Glue compressor
    this._glueEnv=-100; this._glueRms=new Float32Array(2048); this._glueIdx=0; this._glueSum=0;
    this._dcZ=[0,0]; this._dcOut=[0,0];
  }
  process(inputs, outputs, parameters) {
    const inp=inputs[0],out=outputs[0];
    if (!inp||!inp[0]) return true;
    const punch=parameters.punch[0]??0.5;
    const snap=parameters.snap[0]??0.4;
    const glue=parameters.glue[0]??0.4;
    const sub=parameters.sub[0]??0.3;
    const air=parameters.air[0]??0.3;
    const og=parameters.outputGain[0]??1;
    const fastC=Math.exp(-1/(sampleRate*0.002));
    const slowC=Math.exp(-1/(sampleRate*0.03));
    const glueC=Math.exp(-1/(sampleRate*0.003));
    const glueRC=Math.exp(-1/(sampleRate*0.1));
    const airC=Math.exp(-2*Math.PI*8000/sampleRate);
    const subC=Math.exp(-2*Math.PI*80/sampleRate);
    const nCh=Math.min(inp.length,out.length),N=inp[0].length;
    for (let i=0;i<N;i++) {
      let peak=0;
      for (let c=0;c<nCh;c++) peak=Math.max(peak,Math.abs(inp[c][i]));
      // Transient detection
      if (peak>this._fastEnv) this._fastEnv=peak; else this._fastEnv=fastC*this._fastEnv+(1-fastC)*peak;
      if (peak>this._slowEnv) this._slowEnv=peak; else this._slowEnv=slowC*this._slowEnv+(1-slowC)*peak;
      const transient=Math.max(0,this._fastEnv-this._slowEnv);
      // Sub
      this._subEnv=this._subEnv*0.999+peak*0.001;
      this._subPhase=(this._subPhase+2*Math.PI*60/sampleRate)%(2*Math.PI);
      const subAdd=Math.sin(this._subPhase)*this._subEnv*sub*0.3;
      // Glue compressor
      this._glueSum-=this._glueRms[this._glueIdx]*this._glueRms[this._glueIdx];
      this._glueRms[this._glueIdx]=peak; this._glueSum+=peak*peak;
      this._glueIdx=(this._glueIdx+1)%2048;
      const rms=Math.sqrt(Math.max(0,this._glueSum)/2048);
      const rmsDb=rms>1e-6?20*Math.log10(rms):-100;
      const thresh=-12, ratio=4;
      let grDb=0; if (rmsDb>thresh) grDb=(thresh-rmsDb)*(1-1/ratio)*glue;
      const tDb=rmsDb+grDb;
      if (tDb<this._glueEnv) this._glueEnv=glueC*this._glueEnv+(1-glueC)*tDb;
      else this._glueEnv=glueRC*this._glueEnv+(1-glueRC)*tDb;
      const glueGain=rms>1e-6?Math.pow(10,(this._glueEnv-rmsDb)/20):1;
      for (let c=0;c<nCh;c++) {
        let s=inp[c][i];
        // Punch: boost attack transients
        s+=transient*punch*0.5;
        // Snap: HF transient enhancement
        this._airHPZ[c]=airC*this._airHPZ[c]+(1-airC)*s;
        const hf=s-this._airHPZ[c];
        s+=hf*snap*0.4+hf*air*0.3;
        // Glue compress
        s*=glueGain;
        // Sub add
        s+=subAdd;
        this._dcOut[c]=s-this._dcZ[c]+0.9995*this._dcOut[c];
        this._dcZ[c]=s;
        out[c][i]=this._dcOut[c]*og;
      }
    }
    return true;
  }
}
registerProcessor('spx-drum-enhancer', SPXDrumEnhancerProcessor);
`;

// ─── VOCAL SATURATOR — tube warmth optimized for voice ───────────────────────
export const getVocalSaturatorWorkletSource = () => `
class SPXVocalSaturatorProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name:'drive',    defaultValue:0.4,minValue:0,maxValue:1 },
      { name:'warmth',   defaultValue:0.6,minValue:0,maxValue:1 },
      { name:'presence', defaultValue:0.4,minValue:0,maxValue:1 },
      { name:'air',      defaultValue:0.3,minValue:0,maxValue:1 },
      { name:'mix',      defaultValue:0.6,minValue:0,maxValue:1 },
      { name:'outputGain',defaultValue:1,  minValue:0,maxValue:2},
    ];
  }
  constructor() {
    super();
    this._warmZ=[0,0]; this._airZ=[0,0]; this._presZ=[0,0];
    this._dcZ=[0,0]; this._dcOut=[0,0];
  }
  process(inputs, outputs, parameters) {
    const inp=inputs[0],out=outputs[0];
    if (!inp||!inp[0]) return true;
    const drive=parameters.drive[0]??0.4;
    const warmth=parameters.warmth[0]??0.6;
    const presence=parameters.presence[0]??0.4;
    const air=parameters.air[0]??0.3;
    const mix=parameters.mix[0]??0.6;
    const og=parameters.outputGain[0]??1;
    const warmC=Math.exp(-2*Math.PI*300/sampleRate);
    const presC=Math.exp(-2*Math.PI*3000/sampleRate);
    const airC=Math.exp(-2*Math.PI*10000/sampleRate);
    const nCh=Math.min(inp.length,out.length),N=inp[0].length;
    for (let i=0;i<N;i++) {
      for (let c=0;c<nCh;c++) {
        const dry=inp[c][i];
        const g=1+drive*4;
        // Asymmetric tube: positive harder clip (like a triode)
        const xi=dry*g;
        const sat=xi>=0?xi/(1+Math.abs(xi)*0.8):xi/(1+Math.abs(xi)*0.4);
        // Warmth (low-mid boost)
        this._warmZ[c]=warmC*this._warmZ[c]+(1-warmC)*sat;
        const w=sat+this._warmZ[c]*warmth*0.3;
        // Presence (2-5kHz)
        this._presZ[c]=presC*this._presZ[c]+(1-presC)*w;
        const p=w+(w-this._presZ[c])*presence*0.5;
        // Air (10kHz+)
        this._airZ[c]=airC*this._airZ[c]+(1-airC)*p;
        const a=p+(p-this._airZ[c])*air*0.4;
        this._dcOut[c]=a-this._dcZ[c]+0.9995*this._dcOut[c];
        this._dcZ[c]=a;
        out[c][i]=dry*(1-mix)+this._dcOut[c]/g*mix*og;
      }
    }
    return true;
  }
}
registerProcessor('spx-vocal-saturator', SPXVocalSaturatorProcessor);
`;

// ─── GAIN STAGER — visual gain staging with RMS/peak display ─────────────────
export const getGainStagerWorkletSource = () => `
class SPXGainStagerProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name:'gain',      defaultValue:1,   minValue:0,   maxValue:4   },
      { name:'targetDb',  defaultValue:-18, minValue:-40, maxValue:0   },
      { name:'trim',      defaultValue:0,   minValue:-24, maxValue:24  },
      { name:'phase',     defaultValue:0,   minValue:0,   maxValue:1   },
    ];
  }
  constructor() {
    super();
    this._rmsWin=new Float32Array(4096); this._rmsIdx=0; this._rmsSum=0;
    this._peak=0; this._peakHold=0; this._peakTimer=0;
    // Report metering to main thread
    this._reportTimer=0;
  }
  process(inputs, outputs, parameters) {
    const inp=inputs[0],out=outputs[0];
    if (!inp||!inp[0]) return true;
    const gain=parameters.gain[0]??1;
    const trim=Math.pow(10,(parameters.trim[0]??0)/20);
    const phase=parameters.phase[0]>0.5?-1:1;
    const totalGain=gain*trim*phase;
    const nCh=Math.min(inp.length,out.length),N=inp[0].length;
    for (let i=0;i<N;i++) {
      let sq=0;
      for (let c=0;c<nCh;c++) {
        const s=inp[c][i]*totalGain;
        out[c][i]=s;
        sq+=s*s;
        this._peak=Math.max(this._peak,Math.abs(s));
      }
      this._rmsSum-=this._rmsWin[this._rmsIdx]*this._rmsWin[this._rmsIdx];
      this._rmsWin[this._rmsIdx]=Math.sqrt(sq/nCh);
      this._rmsSum+=this._rmsWin[this._rmsIdx]*this._rmsWin[this._rmsIdx];
      this._rmsIdx=(this._rmsIdx+1)%4096;
      this._peakTimer++;
      if (this._peakTimer>sampleRate*2) { this._peak=0; this._peakTimer=0; }
    }
    // Report metering every 512 samples
    this._reportTimer+=N;
    if (this._reportTimer>=512) {
      this._reportTimer=0;
      const rms=Math.sqrt(Math.max(0,this._rmsSum)/4096);
      const rmsDb=rms>1e-6?20*Math.log10(rms):-100;
      const peakDb=this._peak>1e-6?20*Math.log10(this._peak):-100;
      try { this.port.postMessage({rmsDb,peakDb}); } catch(e) {}
    }
    return true;
  }
}
registerProcessor('spx-gain-stager', SPXGainStagerProcessor);
`;

// ─── MULTIBAND LIMITER — limit each band independently ───────────────────────
export const getMultibandLimiterWorkletSource = () => `
class SPXMultibandLimiterProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name:'ceiling',  defaultValue:-0.3,minValue:-6, maxValue:0  },
      { name:'xover1',   defaultValue:200, minValue:40, maxValue:800 },
      { name:'xover2',   defaultValue:2000,minValue:400,maxValue:8000},
      { name:'xover3',   defaultValue:8000,minValue:2000,maxValue:18000},
      { name:'lookahead',defaultValue:3,   minValue:0,  maxValue:10  },
    ];
  }
  constructor() {
    super();
    this._lp1=[0,0];this._lp2=[0,0];this._lp3=[0,0];
    const maxLA=Math.ceil(10/1000*sampleRate)+64;
    this._bufs=Array.from({length:4},()=>[new Float32Array(maxLA),new Float32Array(maxLA)]);
    this._gains=[1,1,1,1]; this._heads=new Int32Array(4); this._maxLA=maxLA;
  }
  process(inputs, outputs, parameters) {
    const inp=inputs[0],out=outputs[0];
    if (!inp||!inp[0]) return true;
    const ceil=Math.pow(10,(parameters.ceiling[0]??-0.3)/20);
    const x1=parameters.xover1[0]??200,x2=parameters.xover2[0]??2000,x3=parameters.xover3[0]??8000;
    const la=Math.min(Math.ceil((parameters.lookahead[0]??3)/1000*sampleRate),this._maxLA-1);
    const c1=Math.exp(-2*Math.PI*x1/sampleRate);
    const c2=Math.exp(-2*Math.PI*x2/sampleRate);
    const c3=Math.exp(-2*Math.PI*x3/sampleRate);
    const rc=Math.exp(-1/(sampleRate*0.05));
    const nCh=Math.min(inp.length,out.length),N=inp[0].length;
    for (let i=0;i<N;i++) {
      for (let c=0;c<nCh;c++) {
        const s=inp[c][i];
        this._lp1[c]=c1*this._lp1[c]+(1-c1)*s; const b1=this._lp1[c];
        const h1=s-b1;
        this._lp2[c]=c2*this._lp2[c]+(1-c2)*h1; const b2=this._lp2[c];
        const h2=h1-b2;
        this._lp3[c]=c3*this._lp3[c]+(1-c3)*h2; const b3=this._lp3[c];
        const b4=h2-b3;
        const bands=[b1,b2,b3,b4];
        let sumOut=0;
        for (let b=0;b<4;b++) {
          this._bufs[b][c][this._heads[b]]=bands[b];
          // Look ahead for this band
          let fp=0;
          for (let k=0;k<la;k++) fp=Math.max(fp,Math.abs(this._bufs[b][c][(this._heads[b]-k+this._maxLA)%this._maxLA]));
          const nd=fp>ceil?ceil/fp:1;
          if (nd<this._gains[b]) this._gains[b]=nd;
          else this._gains[b]=rc*this._gains[b]+(1-rc)*Math.min(nd,1);
          const rh=(this._heads[b]-la+this._maxLA)%this._maxLA;
          sumOut+=this._bufs[b][c][rh]*this._gains[b];
        }
        out[c][i]=sumOut;
      }
      for (let b=0;b<4;b++) this._heads[b]=(this._heads[b]+1)%this._maxLA;
    }
    return true;
  }
}
registerProcessor('spx-multiband-limiter', SPXMultibandLimiterProcessor);
`;

// ─── LOAD ALL SPX100 WORKLETS ─────────────────────────────────────────────────
export const loadSPX100Worklets = async (audioContext) => {
  const map = [
    ['spx-tape-stop',          getTapeStopWorkletSource()          ],
    ['spx-transient-shaper',   getTransientShaperWorkletSource()   ],
    ['spx-multiband-sat',      getMultibandSatWorkletSource()      ],
    ['spx-stereo-imager',      getStereoImagerWorkletSource()      ],
    ['spx-808-enhancer',       get808EnhancerWorkletSource()       ],
    ['spx-lofi-crusher',       getLoFiCrusherWorkletSource()       ],
    ['spx-infinite-reverb',    getInfiniteReverbWorkletSource()    ],
    ['spx-reverse-delay',      getReverseDelayWorkletSource()      ],
    ['spx-declicker',          getDeclickerWorkletSource()         ],
    ['spx-dehummerr',          getDehummmerWorkletSource()         ],
    ['spx-mid-side-comp',      getMidSideCompWorkletSource()       ],
    ['spx-sub-octaver',        getSubOctaverWorkletSource()        ],
    ['spx-chorus-ensemble',    getChorusEnsembleWorkletSource()    ],
    ['spx-tempo-delay',        getTempoDelayWorkletSource()        ],
    ['spx-pitch-randomizer',   getPitchRandomizerWorkletSource()   ],
    ['spx-auto-wah',           getAutoWahWorkletSource()           ],
    ['spx-drum-enhancer',      getDrumEnhancerWorkletSource()      ],
    ['spx-vocal-saturator',    getVocalSaturatorWorkletSource()    ],
    ['spx-gain-stager',        getGainStagerWorkletSource()        ],
    ['spx-multiband-limiter',  getMultibandLimiterWorkletSource()  ],
  ];
  const results = [];
  for (const [name, src] of map) {
    try {
      const blob = new Blob([src], { type: 'application/javascript' });
      const url  = URL.createObjectURL(blob);
      await audioContext.audioWorklet.addModule(url);
      URL.revokeObjectURL(url);
      results.push({ name, ok: true });
    } catch(e) {
      results.push({ name, ok: false, error: e.message });
      console.warn('SPX100 Worklet load failed:', name, e);
    }
  }
  return results;
};
