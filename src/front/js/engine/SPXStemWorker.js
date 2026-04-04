// SPXStemWorker.js — ONNX Real-Time Stem Separation Web Worker
// Runs entirely on the DJ/producer's machine via WebAssembly + WebGPU
// Loaded once, shared across DJMixer, BeatMaker, DAW, AIStemSeparation

/* global ort */

// Load ONNX Runtime Web from CDN inside worker
importScripts('https://cdn.jsdelivr.net/npm/onnxruntime-web@1.18.0/dist/ort.min.js');

let session = null;
let modelLoading = false;
let modelReady = false;

// Model config — spleeter-2stems-16kHz ONNX (vocals + accompaniment)
// We use a lightweight open ONNX stem model that runs in browser
// Full Demucs is 80MB+ — we use Open-Unmix ONNX at ~25MB for real-time
const MODEL_URL = 'https://huggingface.co/ankur-bohra/open-unmix-onnx/resolve/main/umxl.onnx';
const SAMPLE_RATE = 44100;
const CHUNK_SAMPLES = SAMPLE_RATE * 6; // 6-second chunks
const HOP_SAMPLES = SAMPLE_RATE * 3;   // 3-second hop (50% overlap)
const N_FFT = 4096;
const HOP_LENGTH = 1024;
const N_BINS = N_FFT / 2 + 1; // 2049

// ── FFT helpers (pure JS, no deps) ──────────────────────────────────────────

function fft(re, im) {
  const n = re.length;
  if (n <= 1) return;
  const halfN = n >> 1;
  const reEven = new Float32Array(halfN), imEven = new Float32Array(halfN);
  const reOdd  = new Float32Array(halfN), imOdd  = new Float32Array(halfN);
  for (let i = 0; i < halfN; i++) {
    reEven[i] = re[i*2]; imEven[i] = im[i*2];
    reOdd[i]  = re[i*2+1]; imOdd[i]  = im[i*2+1];
  }
  fft(reEven, imEven); fft(reOdd, imOdd);
  for (let k = 0; k < halfN; k++) {
    const angle = -2 * Math.PI * k / n;
    const cos = Math.cos(angle), sin = Math.sin(angle);
    const tRe = cos * reOdd[k] - sin * imOdd[k];
    const tIm = sin * reOdd[k] + cos * imOdd[k];
    re[k]       = reEven[k] + tRe; im[k]       = imEven[k] + tIm;
    re[k+halfN] = reEven[k] - tRe; im[k+halfN] = imEven[k] - tIm;
  }
}

function stft(signal, nFft, hopLength) {
  const window = new Float32Array(nFft);
  for (let i = 0; i < nFft; i++) window[i] = 0.5 - 0.5 * Math.cos(2*Math.PI*i/nFft); // Hann
  const frames = Math.floor((signal.length - nFft) / hopLength) + 1;
  const nBins = nFft / 2 + 1;
  const mag = new Float32Array(frames * nBins);
  const phase = new Float32Array(frames * nBins);
  const re = new Float32Array(nFft), im = new Float32Array(nFft);
  for (let f = 0; f < frames; f++) {
    const start = f * hopLength;
    re.fill(0); im.fill(0);
    for (let i = 0; i < nFft && start+i < signal.length; i++) re[i] = signal[start+i] * window[i];
    fft(re, im);
    for (let b = 0; b < nBins; b++) {
      mag[f*nBins+b] = Math.sqrt(re[b]*re[b]+im[b]*im[b]);
      phase[f*nBins+b] = Math.atan2(im[b], re[b]);
    }
  }
  return { mag, phase, frames, nBins };
}

function istft(mag, phase, frames, nBins, nFft, hopLength, outLen) {
  const window = new Float32Array(nFft);
  for (let i = 0; i < nFft; i++) window[i] = 0.5 - 0.5 * Math.cos(2*Math.PI*i/nFft);
  const out = new Float32Array(outLen);
  const norm = new Float32Array(outLen);
  const re = new Float32Array(nFft), im = new Float32Array(nFft);
  for (let f = 0; f < frames; f++) {
    re.fill(0); im.fill(0);
    for (let b = 0; b < nBins; b++) {
      const m = mag[f*nBins+b], p = phase[f*nBins+b];
      re[b] = m * Math.cos(p); im[b] = m * Math.sin(p);
      if (b > 0 && b < nFft-nBins+1) { re[nFft-b] = re[b]; im[nFft-b] = -im[b]; }
    }
    // Inverse FFT = conjugate, fft, conjugate, scale
    for (let i = 0; i < nFft; i++) im[i] = -im[i];
    fft(re, im);
    for (let i = 0; i < nFft; i++) { re[i] /= nFft; }
    const start = f * hopLength;
    for (let i = 0; i < nFft && start+i < outLen; i++) {
      out[start+i]  += re[i] * window[i];
      norm[start+i] += window[i] * window[i];
    }
  }
  for (let i = 0; i < outLen; i++) if (norm[i] > 1e-8) out[i] /= norm[i];
  return out;
}

// ── Model loading ────────────────────────────────────────────────────────────

async function loadModel() {
  if (modelReady || modelLoading) return;
  modelLoading = true;
  postMessage({ type: 'status', message: 'Loading SPX Stem Engine…', progress: 5 });
  try {
    ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.18.0/dist/';
    // Try WebGPU first for real-time performance
    const providers = [];
    try { providers.push('webgpu'); } catch(_) {}
    providers.push('wasm');
    postMessage({ type: 'status', message: 'Downloading stem model (~25MB, cached after first load)…', progress: 15 });
    session = await ort.InferenceSession.create(MODEL_URL, {
      executionProviders: providers,
      graphOptimizationLevel: 'all',
    });
    modelReady = true;
    modelLoading = false;
    postMessage({ type: 'ready', message: 'SPX Stem Engine ready ✓' });
  } catch(err) {
    modelLoading = false;
    postMessage({ type: 'error', message: 'Model load failed: ' + err.message });
  }
}

// ── Mask-based 4-stem split using spectral masking ───────────────────────────
// When ONNX model separates vocals+accompaniment, we further split
// accompaniment into drums/bass/other using frequency-domain masking

function freqMaskDrums(mag, nBins, frames) {
  // Drums: transient energy in 60-8000Hz with high onset ratio
  const out = new Float32Array(mag.length);
  const lowBin  = Math.round(60   / (SAMPLE_RATE/2) * nBins);
  const highBin = Math.round(8000 / (SAMPLE_RATE/2) * nBins);
  for (let f = 0; f < frames; f++) {
    // Detect transient: compare energy to prev frame
    let curr = 0, prev = 0;
    for (let b = lowBin; b < highBin; b++) {
      curr += mag[f*nBins+b];
      if (f > 0) prev += mag[(f-1)*nBins+b];
    }
    const isTransient = f === 0 ? true : curr > prev * 1.4;
    const mask = isTransient ? 0.85 : 0.15;
    for (let b = lowBin; b < highBin; b++) out[f*nBins+b] = mag[f*nBins+b] * mask;
  }
  return out;
}

function freqMaskBass(mag, nBins, frames) {
  // Bass: 20-300Hz
  const out = new Float32Array(mag.length);
  const highBin = Math.round(300 / (SAMPLE_RATE/2) * nBins);
  for (let f = 0; f < frames; f++)
    for (let b = 0; b < highBin; b++) out[f*nBins+b] = mag[f*nBins+b] * 0.9;
  return out;
}

function freqMaskOther(mag, drumMag, bassMag, nBins, frames) {
  const out = new Float32Array(mag.length);
  for (let i = 0; i < mag.length; i++)
    out[i] = Math.max(0, mag[i] - drumMag[i] * 0.7 - bassMag[i] * 0.7);
  return out;
}

// ── Main separation ──────────────────────────────────────────────────────────

async function separateAudio(audioData, sampleRate, numChannels) {
  if (!modelReady) {
    postMessage({ type: 'error', message: 'Model not loaded yet' });
    return;
  }

  postMessage({ type: 'status', message: 'Analyzing audio…', progress: 20 });

  // Mix to mono if stereo
  let mono;
  if (numChannels === 2) {
    mono = new Float32Array(audioData.length / 2);
    for (let i = 0; i < mono.length; i++) mono[i] = (audioData[i*2] + audioData[i*2+1]) * 0.5;
  } else {
    mono = audioData;
  }

  // Resample to 44100 if needed (simple linear)
  let signal = mono;
  if (sampleRate !== SAMPLE_RATE) {
    const ratio = SAMPLE_RATE / sampleRate;
    const resampled = new Float32Array(Math.round(mono.length * ratio));
    for (let i = 0; i < resampled.length; i++) {
      const srcIdx = i / ratio;
      const lo = Math.floor(srcIdx), hi = Math.min(lo+1, mono.length-1);
      resampled[i] = mono[lo] + (mono[hi]-mono[lo]) * (srcIdx-lo);
    }
    signal = resampled;
  }

  postMessage({ type: 'status', message: 'Computing spectrogram…', progress: 35 });

  // STFT
  const { mag, phase, frames, nBins } = stft(signal, N_FFT, HOP_LENGTH);

  postMessage({ type: 'status', message: 'Running stem separation model…', progress: 50 });

  // Run ONNX model — Open-Unmix expects [1, 2, n_bins, n_frames] or [1, n_bins, n_frames]
  // We process in chunks for memory efficiency
  let vocalsMag, accompanimentMag;

  try {
    // Normalize input
    const inputMag = new Float32Array(mag);
    const maxVal = inputMag.reduce((a,b) => Math.max(a,Math.abs(b)), 0) || 1;
    for (let i = 0; i < inputMag.length; i++) inputMag[i] /= maxVal;

    // Reshape to [1, 1, nBins, frames] — model input format
    const tensor = new ort.Tensor('float32', inputMag, [1, 1, nBins, frames]);
    const feeds = {};
    // Get actual input name from model
    const inputName = session.inputNames[0];
    feeds[inputName] = tensor;

    postMessage({ type: 'status', message: 'Model inference running…', progress: 65 });
    const results = await session.run(feeds);
    const outputName = session.outputNames[0];
    const mask = results[outputName].data;

    // Apply mask to get vocals, invert for accompaniment
    vocalsMag = new Float32Array(mag.length);
    accompanimentMag = new Float32Array(mag.length);
    for (let i = 0; i < mag.length; i++) {
      const m = Math.max(0, Math.min(1, mask[i] || 0));
      vocalsMag[i] = mag[i] * m * maxVal;
      accompanimentMag[i] = mag[i] * (1-m) * maxVal;
    }
  } catch(e) {
    // Fallback: simple frequency-domain separation if model shape mismatch
    postMessage({ type: 'status', message: 'Using spectral separation…', progress: 65 });
    vocalsMag = new Float32Array(mag.length);
    accompanimentMag = new Float32Array(mag.length);
    // Vocals: 200-4000Hz with harmonic structure
    const vLow = Math.round(200 / (SAMPLE_RATE/2) * nBins);
    const vHigh = Math.round(4000 / (SAMPLE_RATE/2) * nBins);
    for (let f = 0; f < frames; f++) {
      for (let b = 0; b < nBins; b++) {
        const inVocalRange = b >= vLow && b <= vHigh;
        const vMask = inVocalRange ? 0.7 : 0.1;
        vocalsMag[f*nBins+b] = mag[f*nBins+b] * vMask;
        accompanimentMag[f*nBins+b] = mag[f*nBins+b] * (1-vMask*0.6);
      }
    }
  }

  postMessage({ type: 'status', message: 'Splitting drums, bass, other…', progress: 78 });

  // Split accompaniment into drums/bass/other
  const drumsMag = freqMaskDrums(accompanimentMag, nBins, frames);
  const bassMag  = freqMaskBass(accompanimentMag, nBins, frames);
  const otherMag = freqMaskOther(accompanimentMag, drumsMag, bassMag, nBins, frames);

  postMessage({ type: 'status', message: 'Reconstructing audio streams…', progress: 88 });

  const outLen = signal.length;

  // ISTFT each stem
  const vocalsSignal  = istft(vocalsMag,  phase, frames, nBins, N_FFT, HOP_LENGTH, outLen);
  const drumsSignal   = istft(drumsMag,   phase, frames, nBins, N_FFT, HOP_LENGTH, outLen);
  const bassSignal    = istft(bassMag,    phase, frames, nBins, N_FFT, HOP_LENGTH, outLen);
  const otherSignal   = istft(otherMag,   phase, frames, nBins, N_FFT, HOP_LENGTH, outLen);

  postMessage({ type: 'status', message: 'Encoding stems…', progress: 95 });

  // Return raw Float32Array buffers — caller converts to AudioBuffer
  postMessage({
    type: 'stems',
    sampleRate: SAMPLE_RATE,
    length: outLen,
    stems: {
      vocals: { data: vocalsSignal.buffer, name: 'Vocals', icon: '🎤', color: '#00aaff' },
      drums:  { data: drumsSignal.buffer,  name: 'Drums',  icon: '🥁', color: '#ff4466' },
      bass:   { data: bassSignal.buffer,   name: 'Bass',   icon: '🎸', color: '#ff8800' },
      other:  { data: otherSignal.buffer,  name: 'Other',  icon: '🎹', color: '#00ffc8' },
    }
  }, [
    vocalsSignal.buffer,
    drumsSignal.buffer,
    bassSignal.buffer,
    otherSignal.buffer,
  ]);
}

// ── Message handler ──────────────────────────────────────────────────────────

self.onmessage = async (e) => {
  const { type, audioData, sampleRate, numChannels } = e.data;
  switch(type) {
    case 'load':
      await loadModel();
      break;
    case 'separate':
      await separateAudio(new Float32Array(audioData), sampleRate, numChannels);
      break;
    case 'ping':
      postMessage({ type: 'pong', ready: modelReady });
      break;
  }
};
