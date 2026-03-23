// =============================================================================
// TrackGraph.js — Audio Routing Graph for SPX Studio
// =============================================================================
// Manages the complete signal flow for all tracks:
//   - Per-track insert FX chains
//   - Send/return buses (reverb, delay aux)
//   - Sidechain routing
//   - Group/bus channels
//   - Pre/post fader sends
// =============================================================================

import { AudioEngine } from './AudioEngine';

export class TrackGraph {
  constructor() {
    this.engine = AudioEngine.getInstance();
    this.groups = new Map();   // groupId → GroupBus
    this.auxBuses = new Map(); // auxId   → AuxBus
  }

  get ctx() { return this.engine.context; }

  // ── Group/Bus Channels ────────────────────────────────────────────────────
  createGroup(id, options = {}) {
    if (this.groups.has(id)) return this.groups.get(id);

    const ctx = this.ctx;
    const group = {
      id,
      name: options.name ?? `Group ${id}`,
      input:    ctx.createGain(),
      fader:    ctx.createGain(),
      pan:      ctx.createStereoPanner(),
      meter:    ctx.createAnalyser(),
      compressor: null,
      members:  new Set(),
    };

    group.fader.gain.value = options.volume ?? 1;
    group.pan.pan.value    = options.pan ?? 0;
    group.meter.fftSize    = 256;

    group.input.connect(group.fader);
    group.fader.connect(group.pan);
    group.pan.connect(group.meter);
    group.pan.connect(this.engine.masterInput);

    // Optional group compressor (glue compression)
    if (options.glueComp) {
      group.compressor = ctx.createDynamicsCompressor();
      group.compressor.threshold.value = -15;
      group.compressor.ratio.value     = 2;
      group.compressor.knee.value      = 6;
      group.compressor.attack.value    = 0.005;
      group.compressor.release.value   = 0.1;
      // Insert between fader and pan
      group.fader.disconnect();
      group.fader.connect(group.compressor);
      group.compressor.connect(group.pan);
    }

    this.groups.set(id, group);
    return group;
  }

  assignToGroup(trackId, groupId) {
    const track = this.engine.tracks.get(trackId);
    const group = this.groups.get(groupId);
    if (!track || !group) return;

    // Disconnect track from master, route through group instead
    track.panNode.disconnect(this.engine.masterInput);
    track.panNode.connect(group.input);
    group.members.add(trackId);
  }

  removeFromGroup(trackId, groupId) {
    const track = this.engine.tracks.get(trackId);
    const group = this.groups.get(groupId);
    if (!track || !group) return;

    track.panNode.disconnect(group.input);
    track.panNode.connect(this.engine.masterInput);
    group.members.delete(trackId);
  }

  setGroupVolume(id, gain) {
    const group = this.groups.get(id);
    if (group) group.fader.gain.setTargetAtTime(gain, this.ctx.currentTime, 0.01);
  }

  // ── Aux Buses ─────────────────────────────────────────────────────────────
  createAux(id, options = {}) {
    if (this.auxBuses.has(id)) return this.auxBuses.get(id);

    const ctx = this.ctx;
    const aux = {
      id,
      name:   options.name ?? `Aux ${id}`,
      input:  ctx.createGain(),
      fader:  ctx.createGain(),
      meter:  ctx.createAnalyser(),
      plugin: null, // e.g. reverb or delay plugin
    };

    aux.fader.gain.value = options.volume ?? 1;
    aux.meter.fftSize    = 256;
    aux.input.connect(aux.fader);
    aux.fader.connect(aux.meter);

    // Connect to master by default (or override with plugin)
    if (options.plugin) {
      aux.plugin = options.plugin;
      aux.fader.connect(options.plugin.inputNode);
      options.plugin.connect(this.engine.masterInput);
    } else {
      aux.fader.connect(this.engine.masterInput);
    }

    this.auxBuses.set(id, aux);
    return aux;
  }

  sendToAux(trackId, auxId, amount = 0.3, preFader = false) {
    const track = this.engine.tracks.get(trackId);
    const aux   = this.auxBuses.get(auxId);
    if (!track || !aux) return;

    const ctx      = this.ctx;
    const sendGain = ctx.createGain();
    sendGain.gain.value = amount;

    // Pre-fader: tap from input; post-fader: tap from pan output
    const tapNode = preFader ? track.inputGain : track.panNode;
    tapNode.connect(sendGain);
    sendGain.connect(aux.input);

    // Store for cleanup
    const key = `${trackId}:${auxId}`;
    track.sendGains.set(key, sendGain);
    return sendGain;
  }

  setAuxSend(trackId, auxId, amount) {
    const track = this.engine.tracks.get(trackId);
    if (!track) return;
    const key  = `${trackId}:${auxId}`;
    const gain = track.sendGains.get(key);
    if (gain) gain.gain.setTargetAtTime(amount, this.ctx.currentTime, 0.01);
  }

  // ── Sidechain Routing ─────────────────────────────────────────────────────
  // Route track A's signal to trigger compression on track B
  routeSidechain(sourceTrackId, destTrackId, plugin) {
    const sourceAnalyser = this.engine.getSidechainSource(sourceTrackId);
    if (!sourceAnalyser || !plugin) return;

    // Pass the analyser to the plugin's sidechain input if it supports it
    if (typeof plugin.setSidechainSource === 'function') {
      plugin.setSidechainSource(sourceAnalyser);
    }

    // For plugins without sidechain support, provide a polling function
    const getLevel = () => this.engine.getSidechainLevel(sourceTrackId);
    return getLevel;
  }

  // ── Parallel Processing ───────────────────────────────────────────────────
  // New York-style parallel compression: blend dry with heavily compressed wet
  setupParallelCompression(trackId, compPlugin, blend = 0.5) {
    const track = this.engine.tracks.get(trackId);
    if (!track || !compPlugin) return;

    const ctx = this.ctx;
    const dryGain = ctx.createGain();
    const wetGain = ctx.createGain();

    dryGain.gain.value = 1 - blend;
    wetGain.gain.value = blend;

    // Tap dry signal before fader
    track.inputGain.connect(dryGain);
    dryGain.connect(track.fader);

    // Tap wet signal through compressor
    track.inputGain.connect(compPlugin.inputNode);
    compPlugin.connect(wetGain);
    wetGain.connect(track.fader);

    return { dryGain, wetGain };
  }

  // ── Mid/Side Processing ──────────────────────────────────────────────────
  setupMidSideProcessing(trackId) {
    const track = this.engine.tracks.get(trackId);
    if (!track) return;

    const ctx = this.ctx;
    const splitter = ctx.createChannelSplitter(2);
    const merger   = ctx.createChannelMerger(2);
    const midGain  = ctx.createGain();
    const sideGain = ctx.createGain();

    track.inputGain.connect(splitter);
    // M = L + R
    splitter.connect(midGain, 0);
    splitter.connect(midGain, 1);
    // S = L - R (approximated via separate gains)
    splitter.connect(sideGain, 0);
    splitter.connect(sideGain, 1);
    sideGain.gain.value = -1; // invert for side

    midGain.connect(merger, 0, 0);
    sideGain.connect(merger, 0, 1);
    merger.connect(track.fader);

    return {
      midGain,
      sideGain,
      setMid:  v => midGain.gain.setTargetAtTime(v, ctx.currentTime, 0.01),
      setSide: v => sideGain.gain.setTargetAtTime(v, ctx.currentTime, 0.01),
    };
  }

  // ── Utility ────────────────────────────────────────────────────────────────
  getGroupLevel(id) {
    const group = this.groups.get(id);
    if (!group) return { rms: -Infinity, peak: -Infinity };
    const buf = new Uint8Array(group.meter.frequencyBinCount);
    group.meter.getByteFrequencyData(buf);
    const rms = Math.sqrt(buf.reduce((a, v) => a + v * v, 0) / buf.length) / 128;
    return {
      rms:  20 * Math.log10(rms + 1e-6),
      peak: 20 * Math.log10(Math.max(...buf) / 128 + 1e-6),
    };
  }

  destroy() {
    this.groups.forEach(g => {
      try { g.input.disconnect(); g.fader.disconnect(); } catch(e) {}
    });
    this.auxBuses.forEach(a => {
      try { a.input.disconnect(); a.fader.disconnect(); } catch(e) {}
    });
    this.groups.clear();
    this.auxBuses.clear();
  }
}

export default TrackGraph;
