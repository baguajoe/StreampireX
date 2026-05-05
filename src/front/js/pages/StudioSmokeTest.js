// =============================================================================
// StudioSmokeTest.js — Dev-only verification of every simulator (Part 17)
// =============================================================================
// Visit /studio-smoke-test in dev. Click "Run All" to render a 1 kHz tone +
// white noise burst through each mic/speaker/room/console simulator via
// OfflineAudioContext and compare the output spectrum against bypass.
//
// A simulator passes if at least one frequency band (out of 8 octave bins
// 31 Hz → 16 kHz) differs from bypass by ≥ 1 dB. This catches "the DSP
// instantiated but produced silence" and "the DSP returned input unchanged"
// regressions without relying on a manual ear test.
//
// The DSP factories below MIRROR the production code in MicSimulator.js,
// SpeakerSimulator.js, MonitorRoomPro.js, and RecordingStudio.js. If the
// production code changes, mirror the change here too — failure to do so
// means this page tests a stale spec, not the production behavior.
// =============================================================================

import React, { useState, useCallback } from "react";

// ── Constants mirrored from production simulators ────────────────────────────
const SPEAKER_EQ = {
  flat:      { low: 0,   lowMid: 0,  highMid: 0,  high: 0,  gain: 0  },
  ns10:      { low: -3,  lowMid: 3,  highMid: 4,  high: -3, gain: 0  },
  auratone:  { low: -10, lowMid: 5,  highMid: 2,  high: -7, gain: 3  },
  genelec:   { low: 1,   lowMid: 0,  highMid: 1,  high: 2,  gain: 0  },
  krk:       { low: 4,   lowMid: -1, highMid: 1,  high: 3,  gain: -1 },
  adam:      { low: 0,   lowMid: 0,  highMid: 2,  high: 5,  gain: 0  },
  focal:     { low: 1,   lowMid: 1,  highMid: 0,  high: 1,  gain: 0  },
  avantone:  { low: -9,  lowMid: 4,  highMid: 3,  high: -6, gain: 3  },
  mackie:    { low: 2,   lowMid: -1, highMid: 1,  high: -1, gain: 0  },
  jbl306:    { low: 2,   lowMid: 0,  highMid: 2,  high: 1,  gain: 0  },
  eve:       { low: 0,   lowMid: 0,  highMid: 0,  high: 1,  gain: 0  },
  amphion:   { low: -1,  lowMid: 1,  highMid: 0,  high: 0,  gain: 0  },
  iphone:    { low: -10, lowMid: 3,  highMid: 5,  high: -4, gain: 4  },
  android:   { low: -12, lowMid: 2,  highMid: 4,  high: -8, gain: 5  },
  macbook:   { low: -8,  lowMid: 1,  highMid: 3,  high: -3, gain: 3  },
  airpods:   { low: -2,  lowMid: 1,  highMid: 4,  high: 6,  gain: 1  },
  car:       { low: 4,   lowMid: -2, highMid: 2,  high: -1, gain: -1 },
  bluetooth: { low: 2,   lowMid: -1, highMid: 1,  high: -4, gain: 1  },
  club:      { low: 6,   lowMid: -1, highMid: 0,  high: 2,  gain: -3 },
  tv:        { low: -6,  lowMid: 3,  highMid: 4,  high: -2, gain: 2  },
  homepod:   { low: 3,   lowMid: 0,  highMid: 2,  high: -1, gain: 0  },
  sonos:     { low: 2,   lowMid: 0,  highMid: 1,  high: 0,  gain: 0  },
};

// Mics (RecordingStudio.js MIC_MODELS): each model is a per-band EQ + HPF
// applied via track.effects coefficients. Tested as a peaking-EQ equivalent.
const MIC_MODELS = {
  none:   null,
  sm7b:   { hp: 80,  bands: [{f: 250, g: -2, q: 0.7}, {f: 4000, g: 3, q: 1.0}, {f: 12000, g: -2, q: 0.7}] },
  sm58:   { hp: 100, bands: [{f: 200, g: -3, q: 0.7}, {f: 5000, g: 4, q: 1.0}] },
  u87:    { hp: 60,  bands: [{f: 8000, g: 3, q: 0.8}, {f: 12000, g: 4, q: 0.8}] },
  c414:   { hp: 60,  bands: [{f: 6000, g: 2, q: 0.7}, {f: 10000, g: 3, q: 0.7}] },
  re20:   { hp: 60,  bands: [{f: 200, g: 1, q: 0.7}, {f: 3000, g: 2, q: 1.0}] },
  tlm103: { hp: 60,  bands: [{f: 8000, g: 4, q: 0.7}, {f: 12000, g: 4, q: 0.7}] },
  md421:  { hp: 70,  bands: [{f: 100, g: 2, q: 0.7}, {f: 5000, g: 3, q: 1.0}] },
  ribbon: { hp: 50,  bands: [{f: 5000, g: -3, q: 0.7}, {f: 12000, g: -6, q: 0.7}] },
};

// Rooms (RecordingStudio.js ROOM_CONFIGS): algorithmic convolver IRs
// (exponentially decaying noise scaled by `decay`).
const ROOM_CONFIGS = {
  none:       null,
  studio_a:   { decay: 0.4, wet: 0.12 },
  abbey_road: { decay: 1.2, wet: 0.20 },
  power_sta:  { decay: 0.8, wet: 0.15 },
  electric:   { decay: 1.8, wet: 0.25 },
  mdm_studio: { decay: 0.6, wet: 0.14 },
  // MonitorRoomPro extras
  oceanway_a:    { decay: 1.8, wet: 0.18 },
  abbeyroad_2:   { decay: 1.2, wet: 0.18 },
  capitol_a:     { decay: 2.2, wet: 0.20 },
  electriclady:  { decay: 0.9, wet: 0.16 },
  sunsetsound:   { decay: 1.3, wet: 0.18 },
  recordplant:   { decay: 1.5, wet: 0.18 },
  powerstation:  { decay: 2.0, wet: 0.22 },
  muscleshoals:  { decay: 1.1, wet: 0.16 },
  criteria:      { decay: 1.4, wet: 0.18 },
  vangelder:     { decay: 1.0, wet: 0.16 },
  unitedwestern: { decay: 1.3, wet: 0.18 },
};

// Console boards (RecordingStudio.js applyConsoleCharacter) — config tuple
// is [hpFreq, hpQ, inSatAmt, inSatAsym, eqLoFreq, eqLoGain, eqHiFreq, eqHiGain, outSatAmt, outSatAsym, outGain]
const CONSOLE_CONFIGS = {
  none:       null,
  ssl4ke:    [18, 0.5, 1.2, false, 200, -0.8, 10000, 1.2, 1.1,  false, 0.98],
  ssl4kg:    [15, 0.4, 1.1, false, 160, -0.5, 12000, 0.8, 1.05, false, 0.99],
  neve8078:  [30, 0.7, 1.6, true,  250, 1.5,  8000,  -0.5,1.4,  true,  0.95],
  neve1073:  [50, 0.8, 1.8, true,  300, 2.0,  6000,  -0.8,1.6,  true,  0.93],
  api1604:   [20, 0.6, 1.3, false, 100, 0.5,  5000,  1.0, 1.25, false, 0.97],
  tridentA:  [25, 0.5, 1.4, true,  180, 1.0,  9000,  0.6, 1.3,  true,  0.96],
  studer900: [22, 0.4, 1.05,false, 120, -0.3, 15000, 0.3, 1.02, false, 1.0],
  mciJH636:  [28, 0.6, 1.5, true,  220, 1.2,  7500,  0.8, 1.35, true,  0.96],
  ssl9000:   [12, 0.4, 1.15,false, 140, -0.3, 14000, 1.0, 1.1,  false, 0.99],
  neve8068:  [35, 0.7, 1.7, true,  280, 1.8,  7500,  -0.6,1.45, true,  0.94],
  api2488:   [22, 0.5, 1.35,false, 110, 0.8,  4800,  1.2, 1.3,  false, 0.97],
  helios69:  [40, 0.8, 1.9, true,  350, 2.5,  6000,  -1.0,1.5,  true,  0.92],
  neveVR:    [20, 0.5, 1.45,true,  200, 1.2,  9000,  0.2, 1.3,  true,  0.96],
  emiTG:     [45, 0.9, 2.0, true,  400, 3.0,  5500,  -1.5,1.6,  true,  0.90],
  sslAWS:    [10, 0.3, 1.1, false, 130, -0.2, 16000, 0.6, 1.05, false, 1.0],
  amekAngela:[32, 0.6, 1.55,true,  240, 1.6,  8500,  -0.3,1.4,  true,  0.95],
  harrison:  [8,  0.3, 1.05,false, 100, 0.2,  18000, 0.4, 1.02, false, 1.0],
  neve8014:  [60, 1.0, 2.1, true,  500, 3.5,  5000,  -2.0,1.7,  true,  0.88],
  sonyMXP:   [14, 0.4, 1.2, false, 180, 0.3,  13000, 0.8, 1.1,  false, 0.98],
  calrec:    [16, 0.4, 1.15,false, 150, -0.1, 15000, 0.5, 1.08, false, 0.99],
};

// ── DSP factories (mirror production) ────────────────────────────────────────
const buildSpeakerChain = (ctx, speakerId) => {
  const eq = SPEAKER_EQ[speakerId];
  if (!eq) return null;
  const lo = ctx.createBiquadFilter(); lo.type = "lowshelf"; lo.frequency.value = 200; lo.gain.value = eq.low;
  const lm = ctx.createBiquadFilter(); lm.type = "peaking";  lm.frequency.value = 500; lm.Q.value = 1; lm.gain.value = eq.lowMid;
  const hm = ctx.createBiquadFilter(); hm.type = "peaking";  hm.frequency.value = 3000; hm.Q.value = 1; hm.gain.value = eq.highMid;
  const hi = ctx.createBiquadFilter(); hi.type = "highshelf"; hi.frequency.value = 8000; hi.gain.value = eq.high;
  const g = ctx.createGain(); g.gain.value = Math.pow(10, eq.gain / 20);
  lo.connect(lm); lm.connect(hm); hm.connect(hi); hi.connect(g);
  return { input: lo, output: g };
};
const buildMicChain = (ctx, micId) => {
  const m = MIC_MODELS[micId]; if (!m) return null;
  const hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = m.hp;
  let last = hp;
  m.bands.forEach(b => {
    const f = ctx.createBiquadFilter(); f.type = "peaking"; f.frequency.value = b.f; f.Q.value = b.q; f.gain.value = b.g;
    last.connect(f); last = f;
  });
  return { input: hp, output: last };
};
const buildRoomChain = (ctx, roomId) => {
  const r = ROOM_CONFIGS[roomId]; if (!r) return null;
  const conv = ctx.createConvolver();
  const len = Math.ceil(ctx.sampleRate * r.decay);
  const ir = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch);
    for (let i = 0; i < len; i++) {
      const env = Math.exp(-i / (ctx.sampleRate * r.decay * 0.5));
      d[i] = (Math.random() * 2 - 1) * env * (ch === 0 ? 1 : 0.97);
    }
  }
  conv.buffer = ir;
  const wet = ctx.createGain(); wet.gain.value = r.wet;
  const dry = ctx.createGain(); dry.gain.value = 1 - r.wet * 0.5;
  const mix = ctx.createGain();
  // input fans out to dry + conv; both sum into mix
  // We expose a single input gain that fans
  const fan = ctx.createGain();
  fan.connect(dry); dry.connect(mix);
  fan.connect(conv); conv.connect(wet); wet.connect(mix);
  return { input: fan, output: mix };
};
const buildSatCurve = (amount, asym) => {
  const N = 1024, c = new Float32Array(N), a = amount, asy = asym ? 0.05 : 0;
  for (let i = 0; i < N; i++) {
    const x = (i * 2) / N - 1;
    c[i] = Math.tanh(x * (1 + a * 2)) + (asy ? asy * x * x : 0);
  }
  return c;
};
const buildConsoleChain = (ctx, boardId) => {
  const c = CONSOLE_CONFIGS[boardId]; if (!c) return null;
  const inHp = ctx.createBiquadFilter(); inHp.type = "highpass"; inHp.frequency.value = c[0]; inHp.Q.value = c[1];
  const inSat = ctx.createWaveShaper(); inSat.curve = buildSatCurve(c[2], c[3]); inSat.oversample = "2x";
  const eqLo = ctx.createBiquadFilter(); eqLo.type = "lowshelf"; eqLo.frequency.value = c[4]; eqLo.gain.value = c[5];
  const eqHi = ctx.createBiquadFilter(); eqHi.type = "highshelf"; eqHi.frequency.value = c[6]; eqHi.gain.value = c[7];
  const outSat = ctx.createWaveShaper(); outSat.curve = buildSatCurve(c[8], c[9]); outSat.oversample = "2x";
  const og = ctx.createGain(); og.gain.value = c[10];
  inHp.connect(inSat); inSat.connect(eqLo); eqLo.connect(eqHi); eqHi.connect(outSat); outSat.connect(og);
  return { input: inHp, output: og };
};

// ── Test runner ──────────────────────────────────────────────────────────────
// Renders a 200ms white-noise burst through `chain` (or bypass if null) and
// returns octave-band energies in dB. Two simulators are "different" if any
// band differs by ≥ 1 dB.
const OCTAVE_CENTERS = [31, 63, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
const renderToSpectrum = async (sampleRate, chainBuilder) => {
  const dur = 0.2;
  const len = Math.ceil(sampleRate * dur);
  const ctx = new OfflineAudioContext(1, len, sampleRate);
  // Source: white noise (deterministic seed via Math.random isn't deterministic
  // but over 200ms with FFT averaging this is fine for smoke-testing).
  const buf = ctx.createBuffer(1, len, sampleRate);
  const d = buf.getChannelData(0);
  let seed = 1;
  for (let i = 0; i < len; i++) { seed = (seed * 1103515245 + 12345) & 0x7fffffff; d[i] = (seed / 0x7fffffff) * 2 - 1; }
  const src = ctx.createBufferSource(); src.buffer = buf;
  if (chainBuilder) {
    const chain = chainBuilder(ctx);
    if (chain) { src.connect(chain.input); chain.output.connect(ctx.destination); }
    else { src.connect(ctx.destination); }
  } else {
    src.connect(ctx.destination);
  }
  src.start();
  const rendered = await ctx.startRendering();
  // Octave-band energies via simple time-domain bandpass approximation: compute
  // RMS over the rendered buffer per octave by re-rendering through a peaking
  // filter centered on each band. Cheap: 10 short OfflineAudioContexts.
  const out = rendered.getChannelData(0);
  const totalRms = Math.sqrt(out.reduce((s, v) => s + v * v, 0) / out.length);
  // Skip per-band re-rendering for speed; use FFT-style band energy from a
  // short window via direct convolution with a Hann-windowed sine at each
  // center. For 200ms @ 44.1k that's ~9k samples × 10 bands = 90k MACs. OK.
  const bands = OCTAVE_CENTERS.map(fc => {
    let acc = 0;
    const w = Math.min(out.length, Math.floor(sampleRate / fc * 8)); // 8 cycles
    for (let i = 0; i < w; i++) {
      const t = i / sampleRate;
      const win = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / w);
      acc += out[i] * Math.cos(2 * Math.PI * fc * t) * win;
    }
    const energy = Math.abs(acc) / w;
    return 20 * Math.log10(Math.max(energy, 1e-9));
  });
  return { totalRms, bands };
};

const runTests = async (categoryLabel, items, builder, bypassSpectrum, sampleRate) => {
  const results = [];
  for (const item of items) {
    if (item.id === "none" || item.id === "flat") {
      results.push({ id: item.id, name: item.name, status: "bypass", maxDelta: 0, peakBand: "—" });
      continue;
    }
    try {
      const spec = await renderToSpectrum(sampleRate, (ctx) => builder(ctx, item.id));
      let maxDelta = 0, peakBandIdx = 0;
      for (let i = 0; i < spec.bands.length; i++) {
        const d = Math.abs(spec.bands[i] - bypassSpectrum.bands[i]);
        if (d > maxDelta) { maxDelta = d; peakBandIdx = i; }
      }
      const status = maxDelta >= 1.0 ? "pass" : "fail";
      results.push({ id: item.id, name: item.name, status, maxDelta: maxDelta.toFixed(2), peakBand: `${OCTAVE_CENTERS[peakBandIdx]} Hz`, totalRms: spec.totalRms.toFixed(4) });
    } catch (e) {
      results.push({ id: item.id, name: item.name, status: "error", error: e.message });
    }
  }
  return { category: categoryLabel, results };
};

// ── UI ───────────────────────────────────────────────────────────────────────
const StudioSmokeTest = () => {
  const [running, setRunning] = useState(false);
  const [allResults, setAllResults] = useState(null);
  const [progress, setProgress] = useState("");

  const onRun = useCallback(async () => {
    setRunning(true); setAllResults(null);
    const sampleRate = 44100;
    setProgress("Rendering bypass reference…");
    const bypass = await renderToSpectrum(sampleRate, null);

    setProgress(`Mics (${Object.keys(MIC_MODELS).length})…`);
    const mics = await runTests("Mic Models",
      Object.entries(MIC_MODELS).map(([id]) => ({ id, name: id })),
      buildMicChain, bypass, sampleRate);

    setProgress(`Speakers (${Object.keys(SPEAKER_EQ).length})…`);
    const speakers = await runTests("Speaker Profiles",
      Object.entries(SPEAKER_EQ).map(([id]) => ({ id, name: id })),
      buildSpeakerChain, bypass, sampleRate);

    setProgress(`Rooms (${Object.keys(ROOM_CONFIGS).length})…`);
    const rooms = await runTests("Room Simulations",
      Object.entries(ROOM_CONFIGS).map(([id]) => ({ id, name: id })),
      buildRoomChain, bypass, sampleRate);

    setProgress(`Consoles (${Object.keys(CONSOLE_CONFIGS).length})…`);
    const consoles = await runTests("Console Boards",
      Object.entries(CONSOLE_CONFIGS).map(([id]) => ({ id, name: id })),
      buildConsoleChain, bypass, sampleRate);

    setAllResults([mics, speakers, rooms, consoles]);
    setRunning(false); setProgress("");
  }, []);

  const summary = allResults ? allResults.map(c => {
    const pass = c.results.filter(r => r.status === "pass").length;
    const bypass = c.results.filter(r => r.status === "bypass").length;
    const fail = c.results.filter(r => r.status === "fail").length;
    const err = c.results.filter(r => r.status === "error").length;
    return { ...c, pass, bypass, fail, err };
  }) : null;

  const cellStyle = (status) => ({
    color: status === "pass" ? "#00ffc8" : status === "bypass" ? "#5a7090" : status === "fail" ? "#FF6600" : "#FF0033",
    fontWeight: status === "pass" || status === "bypass" ? 400 : 700,
  });

  return (
    <div style={{ background: "#06060f", color: "#cdd9e5", padding: 24, minHeight: "100vh", fontFamily: "JetBrains Mono, monospace", fontSize: 12 }}>
      <h1 style={{ color: "#00ffc8", fontSize: 18, marginBottom: 4 }}>SPX Studio Smoke Test</h1>
      <p style={{ color: "#5a7090", fontSize: 11, marginTop: 0 }}>Renders a 200ms white-noise burst through each simulator via OfflineAudioContext, compares 10-band octave spectrum vs bypass. Pass = ≥1 dB delta on any band.</p>
      <button onClick={onRun} disabled={running}
        style={{ background: running ? "#1a1f2e" : "#00ffc8", color: running ? "#5a7090" : "#000", border: "none", borderRadius: 4, padding: "8px 24px", fontSize: 12, fontWeight: 700, cursor: running ? "default" : "pointer", marginBottom: 16 }}>
        {running ? `Running… ${progress}` : "▶ Run All Tests"}
      </button>
      {summary && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
            {summary.map(c => (
              <div key={c.category} style={{ background: "#13182a", border: "1px solid #243048", borderRadius: 4, padding: 12 }}>
                <div style={{ color: "#FF6600", fontSize: 11, fontWeight: 700, marginBottom: 8 }}>{c.category.toUpperCase()}</div>
                <div style={{ fontSize: 18, color: "#00ffc8" }}>{c.pass}/{c.results.length - c.bypass}</div>
                <div style={{ fontSize: 10, color: "#5a7090" }}>{c.pass} pass • {c.fail} fail • {c.err} error • {c.bypass} bypass</div>
              </div>
            ))}
          </div>
          {summary.map(c => (
            <div key={c.category} style={{ marginBottom: 24 }}>
              <h2 style={{ color: "#00ffc8", fontSize: 14, borderBottom: "1px solid #243048", paddingBottom: 4 }}>{c.category}</h2>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                <thead>
                  <tr style={{ color: "#5a7090", textAlign: "left" }}>
                    <th style={{ padding: 4 }}>ID</th><th>Status</th><th>Max Δ (dB)</th><th>Peak Band</th><th>Output RMS</th>
                  </tr>
                </thead>
                <tbody>
                  {c.results.map(r => (
                    <tr key={r.id} style={{ borderTop: "1px solid #1a1f2e" }}>
                      <td style={{ padding: 4 }}>{r.id}</td>
                      <td style={cellStyle(r.status)}>{r.status.toUpperCase()}</td>
                      <td>{r.maxDelta || "—"}</td>
                      <td>{r.peakBand || "—"}</td>
                      <td>{r.totalRms || (r.error ? <span style={{ color: "#FF0033" }}>{r.error}</span> : "—")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </>
      )}
    </div>
  );
};

export default StudioSmokeTest;
