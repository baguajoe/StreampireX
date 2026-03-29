// =============================================================================
// SPXWorklets_Analog.js — 10/10 Professional Analog DSP AudioWorklet Suite
// Append to: src/front/js/component/audio/engine/SPXWorklets.js
// 14 processors: Tape, Tube, Transformer, Console, Opto, FET, VCA Bus,
//                BrickWall, Gate, De-esser, Exciter, Stereo, Vinyl, Parallel
// =============================================================================

export const getTapeForgeWorkletSource = () => `
class SPXTapeForgeProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name:'drive',      defaultValue:0.5,  minValue:0,    maxValue:1    },
      { name:'bias',       defaultValue:0.5,  minValue:0,    maxValue:1    },
      { name:'saturation', defaultValue:0.6,  minValue:0,    maxValue:1    },
      { name:'hfLoss',     defaultValue:0.3,  minValue:0,    maxValue:1    },
      { name:'noise',      defaultValue:0.02, minValue:0,    maxValue:0.2  },
      { name:'wow',        defaultValue:0.02, minValue:0,    maxValue:0.1  },
      { name:'flutter',    defaultValue:0.01, minValue:0,    maxValue:0.05 },
      { name:'outputGain', defaultValue:1.0,  minValue:0,    maxValue:2    },
    ];
  }
  constructor() {
    super();
    this._M=0; this._dM=0; this._wowPh=0; this._flutPh=0;
    this._hfZ=[0,0]; this._dcZ=[0,0]; this._dcOut=[0,0]; this._noiseZ=0;
    this._delayBuf=[new Float32Array(sampleRate),new Float32Array(sampleRate)];
    this._delayWrite=0;
  }
  _langevin(x) {
    if (Math.abs(x)<1e-4) return x/3.0;
    const ex=Math.exp(Math.min(20,2*x));
    return (ex+1)/(ex-1)-1/x;
  }
  _ja(H,drive,sat) {
    const Ms=1.0,a=0.08+(1-sat)*0.35,k=0.015+drive*0.22,c=0.08+drive*0.28;
    const Man=Ms*this._langevin(H/Math.max(a,0.001));
    const delta=(H-this._dM)>=0?1:-1;
    const denom=delta*k-c*(Man-this._M);
    if (Math.abs(denom)<1e-10) return this._M;
    this._M=Math.max(-Ms,Math.min(Ms,this._M+(Man-this._M)/denom*0.04));
    this._dM=H; return this._M;
  }
  _pink(w){this._noiseZ=0.99765*this._noiseZ+w*0.099046;return this._noiseZ+w*0.0555179;}
  process(inputs,outputs,parameters){
    const inp=inputs[0],out=outputs[0];
    if(!inp||!inp[0])return true;
    const drive=parameters.drive[0]??0.5,sat=parameters.saturation[0]??0.6;
    const hfLoss=parameters.hfLoss[0]??0.3,noiseAmt=parameters.noise[0]??0.02;
    const wow=parameters.wow[0]??0.02,flutter=parameters.flutter[0]??0.01;
    const outGain=parameters.outputGain[0]??1.0;
    const dt=1/sampleRate,hfCoeff=Math.exp(-2*Math.PI*(3000+(1-hfLoss)*14000)*dt);
    const nCh=Math.min(inp.length,out.length),N=inp[0].length;
    for(let i=0;i<N;i++){
      this._wowPh=(this._wowPh+0.5*dt)%1;
      this._flutPh=(this._flutPh+13.0*dt)%1;
      const dFrac=Math.max(0,(Math.sin(2*Math.PI*this._wowPh)*wow+Math.sin(2*Math.PI*this._flutPh)*flutter)*sampleRate*0.05);
      const dI=Math.floor(dFrac),dF=dFrac-dI;
      for(let c=0;c<nCh;c++){
        this._delayBuf[c][this._delayWrite]=inp[c][i];
        const r0=(this._delayWrite-dI+sampleRate)%sampleRate,r1=(r0-1+sampleRate)%sampleRate;
        let s=this._delayBuf[c][r0]*(1-dF)+this._delayBuf[c][r1]*dF;
        this._hfZ[c]=hfCoeff*this._hfZ[c]+(1-hfCoeff)*s;s=this._hfZ[c];
        s=this._ja(s*(0.5+drive*4.0),drive,sat)*0.95;
        s+=this._pink(Math.random()*2-1)*noiseAmt*0.003;
        this._dcOut[c]=s-this._dcZ[c]+0.9995*this._dcOut[c];this._dcZ[c]=s;
        out[c][i]=this._dcOut[c]*outGain;
      }
      this._delayWrite=(this._delayWrite+1)%sampleRate;
    }
    return true;
  }
}
registerProcessor('spx-tape-forge',SPXTapeForgeProcessor);
`;

export const getValveGlowWorkletSource = () => `
class SPXValveGlowProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      {name:'drive',defaultValue:0.4,minValue:0,maxValue:1},
      {name:'warmth',defaultValue:0.6,minValue:0,maxValue:1},
      {name:'even2nd',defaultValue:0.7,minValue:0,maxValue:1},
      {name:'even4th',defaultValue:0.3,minValue:0,maxValue:1},
      {name:'bias',defaultValue:0.5,minValue:0,maxValue:1},
      {name:'outputGain',defaultValue:0.8,minValue:0,maxValue:2},
    ];
  }
  constructor(){
    super();
    this._drift=[0,0];this._dcZ=[0,0];this._dcOut=[0,0];this._lpZ=[0,0];
  }
  _triode(x,drive,e2,e4,bias,warmth){
    const g=0.3+drive*3.5,bv=(bias-0.5)*0.6,xi=x*g+bv;
    const h2=e2*0.18*xi*xi,h4=e4*0.04*xi*xi*xi*xi;
    const y=xi>=0?xi/(1+Math.abs(xi)*(1+warmth*0.5)):xi/(1+Math.abs(xi)*0.6);
    return (y+h2+h4)/(g*1.2);
  }
  process(inputs,outputs,parameters){
    const inp=inputs[0],out=outputs[0];
    if(!inp||!inp[0])return true;
    const drive=parameters.drive[0]??0.4,warmth=parameters.warmth[0]??0.6;
    const e2=parameters.even2nd[0]??0.7,e4=parameters.even4th[0]??0.3;
    const bias=parameters.bias[0]??0.5,outGain=parameters.outputGain[0]??0.8;
    const wc=Math.exp(-2*Math.PI*8000/sampleRate);
    const nCh=Math.min(inp.length,out.length),N=inp[0].length;
    for(let i=0;i<N;i++){
      for(let c=0;c<nCh;c++){
        let s=inp[c][i];
        this._lpZ[c]=wc*this._lpZ[c]+(1-wc)*s;
        s=this._triode(s+this._lpZ[c]*warmth*0.3,drive,e2,e4,bias,warmth);
        this._drift[c]=this._drift[c]*0.9999+(Math.random()-0.5)*0.000002;
        s+=this._drift[c];
        this._dcOut[c]=s-this._dcZ[c]+0.9995*this._dcOut[c];this._dcZ[c]=s;
        out[c][i]=this._dcOut[c]*outGain;
      }
    }
    return true;
  }
}
registerProcessor('spx-valve-glow',SPXValveGlowProcessor);
`;

export const getIronCoreWorkletSource = () => `
class SPXIronCoreProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      {name:'slewRate',defaultValue:0.5,minValue:0,maxValue:1},
      {name:'coreSize',defaultValue:0.6,minValue:0,maxValue:1},
      {name:'dcMag',defaultValue:0.2,minValue:0,maxValue:1},
      {name:'resonance',defaultValue:0.3,minValue:0,maxValue:1},
      {name:'outputGain',defaultValue:1.0,minValue:0,maxValue:2},
    ];
  }
  constructor(){
    super();
    this._prev=[0,0];this._mag=[0,0];this._res=[0,0];this._resOut=[0,0];
    this._dcZ=[0,0];this._dcOut=[0,0];
  }
  process(inputs,outputs,parameters){
    const inp=inputs[0],out=outputs[0];
    if(!inp||!inp[0])return true;
    const slew=parameters.slewRate[0]??0.5,core=parameters.coreSize[0]??0.6;
    const dcMag=parameters.dcMag[0]??0.2,res=parameters.resonance[0]??0.3;
    const outGain=parameters.outputGain[0]??1.0;
    const maxSlew=(0.01+slew*0.99)*2.0/sampleRate*1000;
    const knee=0.3+(1-core)*0.7;
    const rc=Math.exp(-2*Math.PI*(40+res*160)/sampleRate);
    const nCh=Math.min(inp.length,out.length),N=inp[0].length;
    for(let i=0;i<N;i++){
      for(let c=0;c<nCh;c++){
        let s=inp[c][i];
        const delta=s-this._prev[c];
        s=this._prev[c]+Math.sign(delta)*Math.min(Math.abs(delta),maxSlew);
        this._prev[c]=s;
        this._mag[c]=this._mag[c]*0.999+s*(1+dcMag*0.3);
        const sat=this._mag[c]/(Math.abs(this._mag[c])+knee);
        const ri=sat+res*0.88*this._resOut[c];
        this._res[c]=rc*this._res[c]+(1-rc)*ri;
        this._resOut[c]=rc*this._resOut[c]+(1-rc)*this._res[c];
        s=sat+this._resOut[c]*res*0.15;
        this._dcOut[c]=s-this._dcZ[c]+0.9995*this._dcOut[c];this._dcZ[c]=s;
        out[c][i]=this._dcOut[c]*outGain;
      }
    }
    return true;
  }
}
registerProcessor('spx-iron-core',SPXIronCoreProcessor);
`;

export const getConsoleSoulWorkletSource = () => `
class SPXConsoleSoulProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      {name:'crosstalk',defaultValue:0.3,minValue:0,maxValue:1},
      {name:'noiseFloor',defaultValue:0.001,minValue:0,maxValue:0.01},
      {name:'tolerance',defaultValue:0.02,minValue:0,maxValue:0.1},
      {name:'channelColor',defaultValue:0.5,minValue:0,maxValue:1},
      {name:'sumSaturation',defaultValue:0.4,minValue:0,maxValue:1},
    ];
  }
  constructor(){
    super();
    this._go=[(Math.random()-0.5)*0.04,(Math.random()-0.5)*0.04];
    this._cZ=[0,0];this._nZ=0;this._dcZ=[0,0];this._dcOut=[0,0];this._pIn=[0,0];
  }
  _pink(w){this._nZ=0.99765*this._nZ+w*0.099046;return this._nZ+w*0.0555179;}
  process(inputs,outputs,parameters){
    const inp=inputs[0],out=outputs[0];
    if(!inp||!inp[0])return true;
    const xt=parameters.crosstalk[0]??0.3,nF=parameters.noiseFloor[0]??0.001;
    const tol=parameters.tolerance[0]??0.02,col=parameters.channelColor[0]??0.5;
    const ss=parameters.sumSaturation[0]??0.4;
    const cc=Math.exp(-2*Math.PI*(800+col*3200)/sampleRate);
    const nCh=Math.min(inp.length,out.length),N=inp[0].length;
    for(let i=0;i<N;i++){
      const xa=xt*0.04,l=inp[0]?inp[0][i]:0,r=inp[1]?inp[1][i]:0;
      const ch=[l+r*xa+this._pIn[1]*xa*0.3,r+l*xa+this._pIn[0]*xa*0.3];
      this._pIn[0]=l;this._pIn[1]=r;
      for(let c=0;c<nCh;c++){
        let s=(ch[c]??0)*(1+this._go[c]*tol*10);
        this._cZ[c]=cc*this._cZ[c]+(1-cc)*s;s+=this._cZ[c]*col*0.08;
        s+=this._pink(Math.random()*2-1)*nF*0.5;
        const k=1.0-ss*0.5;s=s/(Math.abs(s)/k+1)*(1+ss*0.3);
        this._dcOut[c]=s-this._dcZ[c]+0.9995*this._dcOut[c];this._dcZ[c]=s;
        out[c][i]=this._dcOut[c];
      }
    }
    return true;
  }
}
registerProcessor('spx-console-soul',SPXConsoleSoulProcessor);
`;

export const getOptoPressWorkletSource = () => `
class SPXOptoPressProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      {name:'peakReduction',defaultValue:0.5,minValue:0,maxValue:1},
      {name:'gainControl',defaultValue:0.5,minValue:0,maxValue:1},
      {name:'tubeSat',defaultValue:0.4,minValue:0,maxValue:1},
      {name:'outputGain',defaultValue:1.0,minValue:0,maxValue:2},
    ];
  }
  constructor(){
    super();
    this._cell=0;this._gDb=0;this._tZ=[0,0];this._dcZ=[0,0];this._dcOut=[0,0];
  }
  process(inputs,outputs,parameters){
    const inp=inputs[0],out=outputs[0];
    if(!inp||!inp[0])return true;
    const pr=parameters.peakReduction[0]??0.5,gc=parameters.gainControl[0]??0.5;
    const ts=parameters.tubeSat[0]??0.4,og=parameters.outputGain[0]??1.0;
    const tL=Math.pow(10,(-10-pr*30)/20);
    const ac=Math.exp(-1/(sampleRate*0.025)),rb=0.05+(1-pr)*0.5;
    const nCh=Math.min(inp.length,out.length),N=inp[0].length;
    for(let i=0;i<N;i++){
      let sq=0;for(let c=0;c<nCh;c++)sq+=inp[c][i]*inp[c][i];
      const rms=Math.sqrt(sq/nCh);
      if(rms>this._cell)this._cell=ac*this._cell+(1-ac)*rms;
      else{const rc=Math.exp(-1/(sampleRate*rb*(1+this._cell*2)));this._cell=rc*this._cell+(1-rc)*rms;}
      let gr=0;if(this._cell>tL)gr=20*Math.log10(tL/this._cell)*pr;
      gr*=gc;this._gDb=this._gDb*0.995+gr*0.005;
      const gl=Math.pow(10,this._gDb/20)*og;
      for(let c=0;c<nCh;c++){
        let s=inp[c][i]*gl;
        this._tZ[c]=this._tZ[c]*0.98+s*0.02;
        s=(s+this._tZ[c]*ts*0.12)/(Math.abs(s)*ts*0.3+1);
        this._dcOut[c]=s-this._dcZ[c]+0.9995*this._dcOut[c];this._dcZ[c]=s;
        out[c][i]=this._dcOut[c];
      }
    }
    return true;
  }
}
registerProcessor('spx-opto-press',SPXOptoPressProcessor);
`;

export const getFETStrikeWorkletSource = () => `
class SPXFETStrikeProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      {name:'threshold',defaultValue:-15,minValue:-40,maxValue:0},
      {name:'ratio',defaultValue:8,minValue:1,maxValue:20},
      {name:'attack',defaultValue:0.5,minValue:0.1,maxValue:10},
      {name:'release',defaultValue:50,minValue:10,maxValue:1200},
      {name:'inputGain',defaultValue:1.0,minValue:0,maxValue:4},
      {name:'outputGain',defaultValue:1.0,minValue:0,maxValue:4},
      {name:'saturation',defaultValue:0.3,minValue:0,maxValue:1},
    ];
  }
  constructor(){super();this._env=-100;this._pk=[0,0];this._dcZ=[0,0];this._dcOut=[0,0];}
  process(inputs,outputs,parameters){
    const inp=inputs[0],out=outputs[0];
    if(!inp||!inp[0])return true;
    const th=parameters.threshold[0]??-15,rt=parameters.ratio[0]??8;
    const am=parameters.attack[0]??0.5,rm=parameters.release[0]??50;
    const ig=parameters.inputGain[0]??1.0,og=parameters.outputGain[0]??1.0,sat=parameters.saturation[0]??0.3;
    const ac=Math.exp(-1/(sampleRate*am/1000)),rc=Math.exp(-1/(sampleRate*rm/1000));
    const nCh=Math.min(inp.length,out.length),N=inp[0].length;
    for(let i=0;i<N;i++){
      let pk=0;
      for(let c=0;c<nCh;c++){this._pk[c]=Math.max(Math.abs(inp[c][i]*ig),this._pk[c]*0.9998);pk=Math.max(pk,this._pk[c]);}
      const pDb=pk>1e-6?20*Math.log10(pk):-100;
      let gr=0;if(pDb>th)gr=(th-pDb)*(1-1/rt);
      const tDb=pDb+gr;
      if(tDb<this._env)this._env=ac*this._env+(1-ac)*tDb;else this._env=rc*this._env+(1-rc)*tDb;
      const gl=pk>1e-6?Math.pow(10,(this._env-pDb)/20):1;
      for(let c=0;c<nCh;c++){
        let s=inp[c][i]*ig*gl*og;
        s=(s+sat*0.08*s*s*s+sat*0.02*s*s*s*s*s)/(1+sat*0.4);
        this._dcOut[c]=s-this._dcZ[c]+0.9995*this._dcOut[c];this._dcZ[c]=s;
        out[c][i]=this._dcOut[c];
      }
    }
    return true;
  }
}
registerProcessor('spx-fet-strike',SPXFETStrikeProcessor);
`;

export const getGlueBusWorkletSource = () => `
class SPXGlueBusProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      {name:'threshold',defaultValue:-10,minValue:-30,maxValue:0},
      {name:'ratio',defaultValue:4,minValue:1.5,maxValue:10},
      {name:'attack',defaultValue:3,minValue:0.1,maxValue:30},
      {name:'release',defaultValue:100,minValue:50,maxValue:1200},
      {name:'makeupGain',defaultValue:1.0,minValue:0,maxValue:4},
      {name:'scHPF',defaultValue:60,minValue:20,maxValue:300},
      {name:'mix',defaultValue:1.0,minValue:0,maxValue:1},
    ];
  }
  constructor(){
    super();
    this._env=-100;this._scZ=[0,0];this._rw=new Float32Array(2048);
    this._ri=0;this._rs=0;this._amk=0;this._dcZ=[0,0];this._dcOut=[0,0];
  }
  process(inputs,outputs,parameters){
    const inp=inputs[0],out=outputs[0];
    if(!inp||!inp[0])return true;
    const th=parameters.threshold[0]??-10,rt=parameters.ratio[0]??4;
    const am=parameters.attack[0]??3,rm=parameters.release[0]??100;
    const mk=parameters.makeupGain[0]??1.0,sc=parameters.scHPF[0]??60,mx=parameters.mix[0]??1.0;
    const ac=Math.exp(-1/(sampleRate*am/1000)),rc=Math.exp(-1/(sampleRate*rm/1000));
    const scc=Math.exp(-2*Math.PI*sc/sampleRate);
    const nCh=Math.min(inp.length,out.length),N=inp[0].length;
    for(let i=0;i<N;i++){
      for(let c=0;c<nCh;c++){
        this._scZ[c]=scc*this._scZ[c]+(1-scc)*inp[c][i];
        const h=inp[c][i]-this._scZ[c];
        this._rs-=this._rw[this._ri]*this._rw[this._ri];
        this._rw[this._ri]=h;this._rs+=h*h;
      }
      this._ri=(this._ri+1)%this._rw.length;
      const rms=Math.sqrt(Math.max(0,this._rs)/this._rw.length);
      const rDb=rms>1e-6?20*Math.log10(rms):-100;
      let gr=0;if(rDb>th)gr=(th-rDb)*(1-1/rt);
      const tDb=rDb+gr;
      if(tDb<this._env)this._env=ac*this._env+(1-ac)*tDb;else this._env=rc*this._env+(1-rc)*tDb;
      this._amk=this._amk*0.9999+(-gr)*0.0001;
      const gl=rms>1e-6?Math.pow(10,(this._env-rDb)/20)*mk*Math.pow(10,this._amk/20):mk;
      for(let c=0;c<nCh;c++){
        const dry=inp[c][i],wet=dry*gl;
        this._dcOut[c]=wet-this._dcZ[c]+0.9995*this._dcOut[c];this._dcZ[c]=wet;
        out[c][i]=dry*(1-mx)+this._dcOut[c]*mx;
      }
    }
    return true;
  }
}
registerProcessor('spx-glue-bus',SPXGlueBusProcessor);
`;

export const getBrickWallWorkletSource = () => `
class SPXBrickWallProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      {name:'ceiling',defaultValue:-0.3,minValue:-6,maxValue:0},
      {name:'lookahead',defaultValue:5,minValue:0,maxValue:20},
      {name:'release',defaultValue:100,minValue:10,maxValue:2000},
      {name:'outputGain',defaultValue:1.0,minValue:0,maxValue:1},
    ];
  }
  constructor(){
    super();
    const m=Math.ceil(20/1000*sampleRate)+128;
    this._buf=[new Float32Array(m),new Float32Array(m)];
    this._h=0;this._g=1.0;this._m=m;
  }
  process(inputs,outputs,parameters){
    const inp=inputs[0],out=outputs[0];
    if(!inp||!inp[0])return true;
    const ceil=Math.pow(10,(parameters.ceiling[0]??-0.3)/20);
    const la=Math.min(Math.ceil((parameters.lookahead[0]??5)/1000*sampleRate),this._m-1);
    const rc=Math.exp(-1/(sampleRate*(parameters.release[0]??100)/1000));
    const og=parameters.outputGain[0]??1.0;
    const nCh=Math.min(inp.length,out.length),N=inp[0].length;
    for(let i=0;i<N;i++){
      for(let c=0;c<nCh;c++)this._buf[c][this._h]=inp[c][i];
      let fp=0;
      for(let k=0;k<la;k++){const ri=(this._h-k+this._m)%this._m;for(let c=0;c<nCh;c++)fp=Math.max(fp,Math.abs(this._buf[c][ri]));}
      const nd=fp>ceil?ceil/fp:1.0;
      if(nd<this._g)this._g=nd;else this._g=rc*this._g+(1-rc)*Math.min(nd,1.0);
      const rh=(this._h-la+this._m)%this._m;
      for(let c=0;c<nCh;c++)out[c][i]=this._buf[c][rh]*this._g*og;
      this._h=(this._h+1)%this._m;
    }
    return true;
  }
}
registerProcessor('spx-brick-wall',SPXBrickWallProcessor);
`;

export const getTransGateWorkletSource = () => `
class SPXTransGateProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      {name:'threshold',defaultValue:-40,minValue:-80,maxValue:0},
      {name:'attack',defaultValue:1,minValue:0.1,maxValue:50},
      {name:'hold',defaultValue:50,minValue:0,maxValue:2000},
      {name:'release',defaultValue:200,minValue:10,maxValue:4000},
      {name:'range',defaultValue:-80,minValue:-80,maxValue:0},
      {name:'hysteresis',defaultValue:3,minValue:0,maxValue:12},
      {name:'scHPF',defaultValue:80,minValue:20,maxValue:2000},
      {name:'flip',defaultValue:0,minValue:0,maxValue:1},
    ];
  }
  constructor(){super();this._st='closed';this._hs=0;this._g=0;this._scZ=[0,0];this._dcZ=[0,0];this._dcOut=[0,0];}
  process(inputs,outputs,parameters){
    const inp=inputs[0],out=outputs[0];
    if(!inp||!inp[0])return true;
    const th=parameters.threshold[0]??-40,am=parameters.attack[0]??1;
    const hm=parameters.hold[0]??50,rm=parameters.release[0]??200;
    const rng=parameters.range[0]??-80,hy=parameters.hysteresis[0]??3;
    const sc=parameters.scHPF[0]??80,fl=parameters.flip[0]>0.5;
    const ac=Math.exp(-1/(sampleRate*am/1000)),rc=Math.exp(-1/(sampleRate*rm/1000));
    const hs=Math.ceil(hm/1000*sampleRate),scc=Math.exp(-2*Math.PI*sc/sampleRate);
    const fg=Math.pow(10,rng/20);
    const nCh=Math.min(inp.length,out.length),N=inp[0].length;
    for(let i=0;i<N;i++){
      let pk=0;
      for(let c=0;c<nCh;c++){this._scZ[c]=scc*this._scZ[c]+(1-scc)*inp[c][i];pk=Math.max(pk,Math.abs(inp[c][i]-this._scZ[c]));}
      const pDb=pk>1e-6?20*Math.log10(pk):-100;
      if(pDb>th){this._st='open';this._hs=hs;}
      else if(this._st==='open'){if(this._hs>0)this._hs--;else this._st='closed';}
      const tg=this._st==='open'?1.0:fg;
      if(tg>this._g)this._g=ac*this._g+(1-ac)*tg;else this._g=rc*this._g+(1-rc)*tg;
      const ag=fl?(1-this._g+fg):this._g;
      for(let c=0;c<nCh;c++){
        this._dcOut[c]=inp[c][i]*ag-this._dcZ[c]+0.9995*this._dcOut[c];
        this._dcZ[c]=inp[c][i]*ag;out[c][i]=this._dcOut[c];
      }
    }
    return true;
  }
}
registerProcessor('spx-trans-gate',SPXTransGateProcessor);
`;

export const getSibilantCutWorkletSource = () => `
class SPXSibilantCutProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      {name:'freq',defaultValue:7500,minValue:2000,maxValue:16000},
      {name:'bandwidth',defaultValue:0.5,minValue:0.1,maxValue:2},
      {name:'threshold',defaultValue:-18,minValue:-40,maxValue:0},
      {name:'ratio',defaultValue:6,minValue:1,maxValue:20},
      {name:'speed',defaultValue:0.3,minValue:0,maxValue:1},
    ];
  }
  constructor(){super();this._z1=[0,0];this._z2=[0,0];this._zb1=[0,0];this._zb2=[0,0];this._env=0;this._gr=1.0;this._bp=[0,0];}
  process(inputs,outputs,parameters){
    const inp=inputs[0],out=outputs[0];
    if(!inp||!inp[0])return true;
    const fr=parameters.freq[0]??7500,bw=parameters.bandwidth[0]??0.5;
    const th=parameters.threshold[0]??-18,rt=parameters.ratio[0]??6,sp=parameters.speed[0]??0.3;
    const tL=Math.pow(10,th/20);
    const w0=2*Math.PI*fr/sampleRate,bR=Math.exp(-w0*bw);
    const b0=1-bR,b2=-(1-bR),a1=-2*bR*Math.cos(w0),a2=bR*bR;
    const ac=Math.exp(-1/(sampleRate*(0.001+sp*0.005))),rc=Math.exp(-1/(sampleRate*(0.05+sp*0.2)));
    const nCh=Math.min(inp.length,out.length),N=inp[0].length;
    for(let i=0;i<N;i++){
      let bp=0;
      for(let c=0;c<nCh;c++){
        const x=inp[c][i];
        const y=b0*x+b2*this._z2[c]-a1*this._zb1[c]-a2*this._zb2[c];
        this._z2[c]=this._z1[c];this._z1[c]=x;this._zb2[c]=this._zb1[c];this._zb1[c]=y;
        this._bp[c]=y;bp=Math.max(bp,Math.abs(y));
      }
      if(bp>this._env)this._env=ac*this._env+(1-ac)*bp;else this._env=rc*this._env+(1-rc)*bp;
      let gr=1.0;
      if(this._env>tL){const ex=20*Math.log10(this._env/tL);gr=Math.pow(10,-ex*(1-1/rt)/20);}
      this._gr=this._gr*0.98+gr*0.02;
      for(let c=0;c<nCh;c++)out[c][i]=(inp[c][i]-this._bp[c])+this._bp[c]*this._gr;
    }
    return true;
  }
}
registerProcessor('spx-sibilant-cut',SPXSibilantCutProcessor);
`;

export const getHarmonicExciteWorkletSource = () => `
class SPXHarmonicExciteProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      {name:'freq',defaultValue:3000,minValue:500,maxValue:12000},
      {name:'drive',defaultValue:0.5,minValue:0,maxValue:1},
      {name:'even',defaultValue:0.6,minValue:0,maxValue:1},
      {name:'odd',defaultValue:0.3,minValue:0,maxValue:1},
      {name:'airBoost',defaultValue:0.0,minValue:-6,maxValue:12},
      {name:'mix',defaultValue:0.3,minValue:0,maxValue:1},
    ];
  }
  constructor(){super();this._hZ=[0,0];this._lZ=[0,0];this._dcZ=[0,0];this._dcOut=[0,0];}
  process(inputs,outputs,parameters){
    const inp=inputs[0],out=outputs[0];
    if(!inp||!inp[0])return true;
    const fr=parameters.freq[0]??3000,dr=parameters.drive[0]??0.5;
    const ev=parameters.even[0]??0.6,od=parameters.odd[0]??0.3;
    const ag=Math.pow(10,(parameters.airBoost[0]??0)/20),mx=parameters.mix[0]??0.3;
    const hc=Math.exp(-2*Math.PI*fr/sampleRate),lc=Math.exp(-2*Math.PI*12000/sampleRate);
    const nCh=Math.min(inp.length,out.length),N=inp[0].length;
    for(let i=0;i<N;i++){
      for(let c=0;c<nCh;c++){
        const dry=inp[c][i];
        this._hZ[c]=hc*this._hZ[c]+(1-hc)*dry;
        const hf=dry-this._hZ[c],g=1+dr*8,xi=hf*g;
        let exc=(hf+ev*0.25*xi*xi*Math.sign(xi)+od*0.12*xi*xi*xi+od*0.03*xi*xi*xi*xi*xi)/(1+Math.abs(xi)*0.5);
        this._lZ[c]=lc*this._lZ[c]+(1-lc)*exc;
        exc=exc+(exc-this._lZ[c])*ag;
        this._dcOut[c]=exc-this._dcZ[c]+0.9995*this._dcOut[c];this._dcZ[c]=exc;
        out[c][i]=dry+this._dcOut[c]*mx;
      }
    }
    return true;
  }
}
registerProcessor('spx-harmonic-excite',SPXHarmonicExciteProcessor);
`;

export const getStereoForgeWorkletSource = () => `
class SPXStereoForgeProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      {name:'width',defaultValue:1.0,minValue:0,maxValue:2},
      {name:'midGain',defaultValue:1.0,minValue:0,maxValue:4},
      {name:'sideGain',defaultValue:1.0,minValue:0,maxValue:4},
      {name:'monoBelow',defaultValue:100,minValue:20,maxValue:300},
      {name:'flipPhase',defaultValue:0,minValue:0,maxValue:1},
    ];
  }
  constructor(){super();this._mZ=[0,0];}
  process(inputs,outputs,parameters){
    const inp=inputs[0],out=outputs[0];
    if(!inp||!inp[0])return true;
    const w=parameters.width[0]??1.0,mg=parameters.midGain[0]??1.0;
    const sg=parameters.sideGain[0]??1.0,mb=parameters.monoBelow[0]??100,fl=parameters.flipPhase[0]>0.5;
    const mc=Math.exp(-2*Math.PI*mb/sampleRate);
    if(Math.min(inp.length,out.length)<2){for(let i=0;i<inp[0].length;i++)out[0][i]=inp[0][i];return true;}
    const N=inp[0].length;
    for(let i=0;i<N;i++){
      const l=inp[0][i],r=fl?-inp[1][i]:inp[1][i];
      const mid=(l+r)*0.7071,side=(l-r)*0.7071;
      const mO=mid*mg,sO=side*sg*w;
      this._mZ[0]=mc*this._mZ[0]+(1-mc)*mO;
      this._mZ[1]=mc*this._mZ[1]+(1-mc)*sO;
      const sF=sO-this._mZ[1];
      out[0][i]=(mO+sF)*0.7071;out[1][i]=(mO-sF)*0.7071;
    }
    return true;
  }
}
registerProcessor('spx-stereo-forge',SPXStereoForgeProcessor);
`;

export const getVinylPressWorkletSource = () => `
class SPXVinylPressProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      {name:'warmth',defaultValue:0.6,minValue:0,maxValue:1},
      {name:'crackle',defaultValue:0.2,minValue:0,maxValue:1},
      {name:'dust',defaultValue:0.15,minValue:0,maxValue:1},
      {name:'warp',defaultValue:0.1,minValue:0,maxValue:1},
      {name:'riaa',defaultValue:1,minValue:0,maxValue:1},
    ];
  }
  constructor(){
    super();
    this._rZ=[[0,0,0],[0,0,0]];this._wPh=Math.random();
    this._cT=0;this._cZ=0;this._dZ=0;this._wmZ=[0,0];this._dcZ=[0,0];this._dcOut=[0,0];
    const m=Math.ceil(0.05*sampleRate);
    this._wB=[new Float32Array(m),new Float32Array(m)];this._wW=0;this._mW=m;
  }
  _riaa(x,z){
    const p1=Math.exp(-1/(sampleRate*0.00318)),p2=Math.exp(-1/(sampleRate*0.000318)),p3=Math.exp(-1/(sampleRate*0.000075));
    z[0]=p1*z[0]+(1-p1)*x;z[1]=p2*z[1]+(1-p2)*z[0];z[2]=p3*z[2]+(1-p3)*z[1];
    return z[2]*1.8+z[0]*0.3-z[1]*0.1;
  }
  process(inputs,outputs,parameters){
    const inp=inputs[0],out=outputs[0];
    if(!inp||!inp[0])return true;
    const wm=parameters.warmth[0]??0.6,cr=parameters.crackle[0]??0.2;
    const du=parameters.dust[0]??0.15,wp=parameters.warp[0]??0.1,ri=parameters.riaa[0]??1;
    const wc=Math.exp(-2*Math.PI*4000/sampleRate);
    const nCh=Math.min(inp.length,out.length),N=inp[0].length;
    for(let i=0;i<N;i++){
      this._wPh=(this._wPh+0.5/sampleRate)%1;
      const wm2=Math.sin(2*Math.PI*this._wPh)*wp*0.003;
      const dF=Math.max(0,wm2*sampleRate*0.1),dI=Math.floor(dF),dFr=dF-dI;
      for(let c=0;c<nCh;c++){
        this._wB[c][this._wW]=inp[c][i];
        const r0=(this._wW-dI+this._mW)%this._mW,r1=(r0-1+this._mW)%this._mW;
        let s=this._wB[c][r0]*(1-dFr)+this._wB[c][r1]*dFr;
        if(ri>0.5)s=this._riaa(s,this._rZ[c])*ri+s*(1-ri);
        this._wmZ[c]=wc*this._wmZ[c]+(1-wc)*s;s+=this._wmZ[c]*wm*0.2;
        this._cT--;let ck=0;
        if(this._cT<=0){this._cT=Math.floor(sampleRate*0.05+Math.random()*sampleRate*(2/Math.max(cr,0.01)));ck=(Math.random()-0.5)*cr*0.4;}
        this._cZ=0.5*this._cZ+ck;
        this._dZ=0.99*this._dZ+(Math.random()*2-1)*0.01*du;
        s+=this._cZ*cr+this._dZ;
        this._dcOut[c]=s-this._dcZ[c]+0.9995*this._dcOut[c];this._dcZ[c]=s;
        out[c][i]=this._dcOut[c];
      }
      this._wW=(this._wW+1)%this._mW;
    }
    return true;
  }
}
registerProcessor('spx-vinyl-press',SPXVinylPressProcessor);
`;

export const getParallelCrushWorkletSource = () => `
class SPXParallelCrushProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      {name:'threshold',defaultValue:-25,minValue:-50,maxValue:0},
      {name:'ratio',defaultValue:10,minValue:2,maxValue:40},
      {name:'attack',defaultValue:5,minValue:0.1,maxValue:100},
      {name:'release',defaultValue:80,minValue:10,maxValue:500},
      {name:'crush',defaultValue:0.7,minValue:0,maxValue:1},
      {name:'wetGain',defaultValue:1.0,minValue:0,maxValue:4},
      {name:'dryGain',defaultValue:1.0,minValue:0,maxValue:4},
      {name:'mix',defaultValue:0.5,minValue:0,maxValue:1},
    ];
  }
  constructor(){super();this._env=-100;this._rw=new Float32Array(1024);this._ri=0;this._rs=0;}
  process(inputs,outputs,parameters){
    const inp=inputs[0],out=outputs[0];
    if(!inp||!inp[0])return true;
    const th=parameters.threshold[0]??-25,rt=parameters.ratio[0]??10;
    const am=parameters.attack[0]??5,rm=parameters.release[0]??80;
    const cr=parameters.crush[0]??0.7,wg=parameters.wetGain[0]??1.0,dg=parameters.dryGain[0]??1.0,mx=parameters.mix[0]??0.5;
    const ac=Math.exp(-1/(sampleRate*am/1000)),rc=Math.exp(-1/(sampleRate*rm/1000));
    const nCh=Math.min(inp.length,out.length),N=inp[0].length;
    for(let i=0;i<N;i++){
      for(let c=0;c<nCh;c++){this._rs-=this._rw[this._ri]*this._rw[this._ri];this._rw[this._ri]=inp[c][i];this._rs+=inp[c][i]*inp[c][i];}
      this._ri=(this._ri+1)%this._rw.length;
      const rms=Math.sqrt(Math.max(0,this._rs)/this._rw.length);
      const rDb=rms>1e-6?20*Math.log10(rms):-100;
      let gr=0;if(rDb>th)gr=(th-rDb)*(1-1/rt)*cr;
      const tDb=rDb+gr;
      if(tDb<this._env)this._env=ac*this._env+(1-ac)*tDb;else this._env=rc*this._env+(1-rc)*tDb;
      const gl=rms>1e-6?Math.pow(10,(this._env-rDb)/20):1;
      for(let c=0;c<nCh;c++)out[c][i]=inp[c][i]*dg*(1-mx)+inp[c][i]*gl*wg*mx;
    }
    return true;
  }
}
registerProcessor('spx-parallel-crush',SPXParallelCrushProcessor);
`;

// ─── LOAD ALL ANALOG WORKLETS ─────────────────────────────────────────────────
export const loadAnalogWorklets = async (audioContext) => {
  const map = [
    ['spx-tape-forge',      getTapeForgeWorkletSource()     ],
    ['spx-valve-glow',      getValveGlowWorkletSource()     ],
    ['spx-iron-core',       getIronCoreWorkletSource()      ],
    ['spx-console-soul',    getConsoleSoulWorkletSource()   ],
    ['spx-opto-press',      getOptoPressWorkletSource()     ],
    ['spx-fet-strike',      getFETStrikeWorkletSource()     ],
    ['spx-glue-bus',        getGlueBusWorkletSource()       ],
    ['spx-brick-wall',      getBrickWallWorkletSource()     ],
    ['spx-trans-gate',      getTransGateWorkletSource()     ],
    ['spx-sibilant-cut',    getSibilantCutWorkletSource()   ],
    ['spx-harmonic-excite', getHarmonicExciteWorkletSource()],
    ['spx-stereo-forge',    getStereoForgeWorkletSource()   ],
    ['spx-vinyl-press',     getVinylPressWorkletSource()    ],
    ['spx-parallel-crush',  getParallelCrushWorkletSource() ],
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
      console.warn('SPX Analog Worklet load failed:', name, e);
    }
  }
  return results;
};
