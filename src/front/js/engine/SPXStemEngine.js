// SPXStemEngine.js — Real-Time Client-Side Stem Separation
// Uses ONNX Runtime Web + WebGPU on the user's machine
// Zero server cost. No upload wait. Shared across all SPX tools.
//
// Usage:
//   import { SPXStemEngine } from './SPXStemEngine';
//   const engine = SPXStemEngine.getInstance();
//   await engine.init();
//   const stems = await engine.separate(audioBuffer); // returns { vocals, drums, bass, other }

const WORKER_URL = new URL('./SPXStemWorker.js', import.meta.url);
const BACKEND = process.env.REACT_APP_BACKEND_URL || '';

class StemEngine {
  constructor() {
    this.worker = null;
    this.ready = false;
    this.loading = false;
    this.pendingResolve = null;
    this.pendingReject = null;
    this.onStatus = null; // callback(message, progress)
    this._initPromise = null;
  }

  // ── Singleton ──────────────────────────────────────────────────────────────
  static getInstance() {
    if (!StemEngine._instance) StemEngine._instance = new StemEngine();
    return StemEngine._instance;
  }

  // ── Init — loads worker + model ───────────────────────────────────────────
  init(onStatus) {
    if (onStatus) this.onStatus = onStatus;
    if (this._initPromise) return this._initPromise;
    this._initPromise = new Promise((resolve, reject) => {
      try {
        this.worker = new Worker(WORKER_URL);
      } catch(e) {
        // Webpack 5 inline worker fallback
        const blob = new Blob([SPX_WORKER_SOURCE], { type: 'application/javascript' });
        this.worker = new Worker(URL.createObjectURL(blob));
      }

      this.worker.onmessage = (e) => {
        const { type, message, progress, stems, sampleRate, length } = e.data;
        switch(type) {
          case 'ready':
            this.ready = true;
            this.loading = false;
            this._status('✓ SPX Stem Engine ready', 100);
            resolve(true);
            break;
          case 'status':
            this._status(message, progress);
            break;
          case 'stems':
            if (this.pendingResolve) {
              this.pendingResolve({ stems, sampleRate, length });
              this.pendingResolve = null;
              this.pendingReject = null;
            }
            break;
          case 'error':
            this._status('Error: ' + message, 0);
            if (this.pendingReject) {
              this.pendingReject(new Error(message));
              this.pendingResolve = null;
              this.pendingReject = null;
            }
            if (!this.ready) reject(new Error(message));
            break;
          case 'pong':
            if (e.data.ready) { this.ready = true; resolve(true); }
            break;
        }
      };

      this.worker.onerror = (err) => {
        console.error('[SPXStemEngine] Worker error:', err);
        reject(err);
      };

      this.loading = true;
      this._status('Initializing SPX Stem Engine…', 0);
      this.worker.postMessage({ type: 'load' });
    });
    return this._initPromise;
  }

  _status(msg, progress) {
    if (this.onStatus) this.onStatus(msg, progress);
  }

  // ── Separate AudioBuffer → 4 stems ────────────────────────────────────────
  // Returns: { vocals, drums, bass, other } each as AudioBuffer
  async separate(audioBuffer, onStatus) {
    if (onStatus) this.onStatus = onStatus;

    // Fallback to Railway if worker not available
    if (!this.worker || !this.ready) {
      try {
        await this.init(onStatus);
      } catch(e) {
        this._status('Falling back to cloud separation…', 10);
        return this._cloudFallback(audioBuffer);
      }
    }

    return new Promise((resolve, reject) => {
      this.pendingResolve = async ({ stems, sampleRate, length }) => {
        // Convert ArrayBuffer data back to AudioBuffers
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const result = {};
        for (const [name, stemData] of Object.entries(stems)) {
          const float32 = new Float32Array(stemData.data);
          const buf = ctx.createBuffer(1, float32.length, sampleRate);
          buf.copyToChannel(float32, 0);
          // Also create object URL for download/playback
          const wavBlob = float32ToWav(float32, sampleRate);
          const url = URL.createObjectURL(wavBlob);
          result[name] = {
            buffer: buf,
            url,
            name: stemData.name,
            icon: stemData.icon,
            color: stemData.color,
          };
        }
        this._status('✓ Stems ready', 100);
        resolve(result);
      };
      this.pendingReject = reject;

      // Extract raw PCM from AudioBuffer
      const numChannels = audioBuffer.numberOfChannels;
      const length = audioBuffer.length;
      let pcm;
      if (numChannels === 2) {
        pcm = new Float32Array(length * 2);
        const ch0 = audioBuffer.getChannelData(0);
        const ch1 = audioBuffer.getChannelData(1);
        for (let i = 0; i < length; i++) { pcm[i*2] = ch0[i]; pcm[i*2+1] = ch1[i]; }
      } else {
        pcm = audioBuffer.getChannelData(0).slice();
      }

      this.worker.postMessage({
        type: 'separate',
        audioData: pcm.buffer,
        sampleRate: audioBuffer.sampleRate,
        numChannels,
      }, [pcm.buffer]);
    });
  }

  // ── Cloud fallback (Railway/Demucs) if ONNX fails ─────────────────────────
  async _cloudFallback(audioBuffer) {
    this._status('Cloud separation (Demucs)…', 10);
    const token = localStorage.getItem('token');

    // Convert AudioBuffer to WAV blob
    const pcm = audioBuffer.getChannelData(0);
    const wav = float32ToWav(pcm, audioBuffer.sampleRate);

    const form = new FormData();
    form.append('audio', wav, 'track.wav');
    form.append('model', 'htdemucs');

    const res = await fetch(`${BACKEND}/api/ai/stems/separate-upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    if (!res.ok) throw new Error('Cloud separation failed: ' + res.status);
    const data = await res.json();

    // Normalize to same format as ONNX output
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const result = {};
    const urlMap = {
      vocals: data.vocals_url,
      drums:  data.drums_url,
      bass:   data.bass_url,
      other:  data.other_url,
    };
    const meta = {
      vocals: { name:'Vocals', icon:'🎤', color:'#00aaff' },
      drums:  { name:'Drums',  icon:'🥁', color:'#ff4466' },
      bass:   { name:'Bass',   icon:'🎸', color:'#ff8800' },
      other:  { name:'Other',  icon:'🎹', color:'#00ffc8' },
    };
    for (const [name, url] of Object.entries(urlMap)) {
      if (!url) continue;
      const r = await fetch(url);
      const ab = await r.arrayBuffer();
      const buf = await ctx.decodeAudioData(ab);
      result[name] = { buffer: buf, url, ...meta[name] };
    }
    this._status('✓ Cloud stems ready', 100);
    return result;
  }

  // ── Check if real-time is available ───────────────────────────────────────
  static isRealtimeAvailable() {
    return typeof Worker !== 'undefined' && typeof WebAssembly !== 'undefined';
  }

  // ── Preload model in background ───────────────────────────────────────────
  static preload() {
    if (!StemEngine.isRealtimeAvailable()) return;
    const engine = StemEngine.getInstance();
    engine.init().catch(() => {}); // silent background load
  }
}

// ── WAV encoder ───────────────────────────────────────────────────────────────
function float32ToWav(samples, sampleRate) {
  const buf = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buf);
  const writeStr = (off, str) => { for(let i=0;i<str.length;i++) view.setUint8(off+i, str.charCodeAt(i)); };
  writeStr(0,'RIFF'); view.setUint32(4, 36+samples.length*2, true);
  writeStr(8,'WAVE'); writeStr(12,'fmt ');
  view.setUint32(16,16,true); view.setUint16(20,1,true); view.setUint16(22,1,true);
  view.setUint32(24,sampleRate,true); view.setUint32(28,sampleRate*2,true);
  view.setUint16(32,2,true); view.setUint16(34,16,true);
  writeStr(36,'data'); view.setUint32(40,samples.length*2,true);
  let offset=44;
  for(let i=0;i<samples.length;i++){
    const s=Math.max(-1,Math.min(1,samples[i]));
    view.setInt16(offset, s<0?s*0x8000:s*0x7FFF, true); offset+=2;
  }
  return new Blob([buf], { type:'audio/wav' });
}

// Export singleton
export const SPXStemEngine = StemEngine;
export { float32ToWav };
export default StemEngine.getInstance();
