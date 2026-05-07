// =============================================================================
// PluginHost.js — Plugin Instance Manager for StreamPireX DAW
// =============================================================================
// Manages plugin insert chains per track.
//   - addPlugin / removePlugin / movePlugin / bypass / setParam
//   - Chains: rackInput → plugin1 → plugin2 → ... → rackOutput
//   - Worklet loading & registration
//   - Serialize / deserialize for project save/load
// =============================================================================

import { getPluginDef } from './registry';
import { createGainPlugin } from './plugins/GainPlugin';
import { createEQ3BandPlugin } from './plugins/EQ3BandPlugin';
import { createCompressorPlugin } from './plugins/CompressorPlugin';
import { createReverbPlugin } from './plugins/ReverbPlugin';
import { createDelayPlugin } from './plugins/DelayPlugin';
import { createLimiterPlugin } from './plugins/LimiterPlugin';
import { createDeEsserPlugin } from './plugins/DeEsserPlugin';
import { createSaturationPlugin } from './plugins/SaturationPlugin';
import { createAICompressorPlugin } from './plugins/AICompressorPlugin';
import { createAIDeRoomPlugin } from './plugins/AIDeRoomPlugin';
import { createAIEQMatchPlugin } from './plugins/AIEQMatchPlugin';
import { createAINoiseReducePlugin } from './plugins/AINoiseReducePlugin';
import { createAIVocalCleanPlugin } from './plugins/AIVocalCleanPlugin';
import { createAirEQPlugin } from './plugins/AirEQPlugin';
import { createAmpSimPlugin } from './plugins/AmpSimPlugin';
import { createAutoFilterPlugin } from './plugins/AutoFilterPlugin';
import { createAutoPanPlugin } from './plugins/AutoPanPlugin';
import { createAutoTunePlugin } from './plugins/AutoTunePlugin';
import { createBassEnhancerPlugin } from './plugins/BassEnhancerPlugin';
import { createBitDepthPlugin } from './plugins/BitDepthPlugin';
import { createBitcrusherPlugin } from './plugins/BitcrusherPlugin';
import { createBreathGatePlugin } from './plugins/BreathGatePlugin';
import { createBrickwallLimiterPlugin } from './plugins/BrickwallLimiterPlugin';
import { createCassettePlugin } from './plugins/CassettePlugin';
import { createChamberReverbPlugin } from './plugins/ChamberReverbPlugin';
import { createChannelStripPlugin } from './plugins/ChannelStripPlugin';
import { createChoirPlugin } from './plugins/ChoirPlugin';
import { createChorusPlugin } from './plugins/ChorusPlugin';
import { createCombFilterPlugin } from './plugins/CombFilterPlugin';
import { createConvolutionShaperPlugin } from './plugins/ConvolutionShaperPlugin';
import { createDCFilterPlugin } from './plugins/DCFilterPlugin';
import { createDottedEighthDelayPlugin } from './plugins/DottedEighthDelayPlugin';
import { createDrumBusPlugin } from './plugins/DrumBusPlugin';
import { createDustScratchPlugin } from './plugins/DustScratchPlugin';
import { createDynamicEQPlugin } from './plugins/DynamicEQPlugin';
import { createEnvelopeFilterPlugin } from './plugins/EnvelopeFilterPlugin';
import { createExpanderPlugin } from './plugins/ExpanderPlugin';
import { createFETCompPlugin } from './plugins/FETCompPlugin';
import { createFlangerPlugin } from './plugins/FlangerPlugin';
import { createFrequencyShifterPlugin } from './plugins/FrequencyShifterPlugin';
import { createFuzzPlugin } from './plugins/FuzzPlugin';
import { createGatePlugin } from './plugins/GatePlugin';
import { createGatedReverbPlugin } from './plugins/GatedReverbPlugin';
import { createGranularFreezePlugin } from './plugins/GranularFreezePlugin';
import { createGraphicEQPlugin } from './plugins/GraphicEQPlugin';
import { createGraphicEQ4BandPlugin } from './plugins/GraphicEQ4BandPlugin';
import { createGraphicEQ5BandPlugin } from './plugins/GraphicEQ5BandPlugin';
import { createGraphicEQ6BandPlugin } from './plugins/GraphicEQ6BandPlugin';
import { createHaasEffectPlugin } from './plugins/HaasEffectPlugin';
import { createHallReverbPlugin } from './plugins/HallReverbPlugin';
import { createHarmonicExciterPlugin } from './plugins/HarmonicExciterPlugin';
import { createHarmonizerPlugin } from './plugins/HarmonizerPlugin';
import { createHiHatShimmerPlugin } from './plugins/HiHatShimmerPlugin';
import { createKickEnhancerPlugin } from './plugins/KickEnhancerPlugin';
import { createLinearPhaseEQPlugin } from './plugins/LinearPhaseEQPlugin';
import { createLooperPlugin } from './plugins/LooperPlugin';
import { createLoudnessMaximizerPlugin } from './plugins/LoudnessMaximizerPlugin';
import { createMasteringEQPlugin } from './plugins/MasteringEQPlugin';
import { createMidSideBalancePlugin } from './plugins/MidSideBalancePlugin';
import { createMidSideEQPlugin } from './plugins/MidSideEQPlugin';
import { createMidSideProcessorPlugin } from './plugins/MidSideProcessorPlugin';
import { createMonoMakerPlugin } from './plugins/MonoMakerPlugin';
import { createMultibandCompPlugin } from './plugins/MultibandCompPlugin';
import { createMultitapDelayPlugin } from './plugins/MultitapDelayPlugin';
import { createNotchEQPlugin } from './plugins/NotchEQPlugin';
import { createOctaverPlugin } from './plugins/OctaverPlugin';
import { createOpticalCompPlugin } from './plugins/OpticalCompPlugin';
import { createOverdrivePlugin } from './plugins/OverdrivePlugin';
import { createParallelCompPlugin } from './plugins/ParallelCompPlugin';
import { createPhaseFlipPlugin } from './plugins/PhaseFlipPlugin';
import { createPhaserPlugin } from './plugins/PhaserPlugin';
import { createPhonePlugin } from './plugins/PhonePlugin';
import { createPingPongDelayPlugin } from './plugins/PingPongDelayPlugin';
import { createPitchShifterPlugin } from './plugins/PitchShifterPlugin';
import { createPlateReverbPlugin } from './plugins/PlateReverbPlugin';
import { createPresenceEQPlugin } from './plugins/PresenceEQPlugin';
import { createRadioPlugin } from './plugins/RadioPlugin';
import { createResonatorPlugin } from './plugins/ResonatorPlugin';
import { createReverseReverbPlugin } from './plugins/ReverseReverbPlugin';
import { createRingModPlugin } from './plugins/RingModPlugin';
import { createRoomReverbPlugin } from './plugins/RoomReverbPlugin';
import { createRotaryPlugin } from './plugins/RotaryPlugin';
import { createSampleRateReducerPlugin } from './plugins/SampleRateReducerPlugin';
import { createShimmerReverbPlugin } from './plugins/ShimmerReverbPlugin';
import { createSlapbackDelayPlugin } from './plugins/SlapbackDelayPlugin';
import { createSnareEnhancerPlugin } from './plugins/SnareEnhancerPlugin';
import { createSpectralGatePlugin } from './plugins/SpectralGatePlugin';
import { createSpringReverbPlugin } from './plugins/SpringReverbPlugin';
import { createStepFilterPlugin } from './plugins/StepFilterPlugin';
import { createStereoEnhancerPlugin } from './plugins/StereoEnhancerPlugin';
import { createStereoWidenerPlugin } from './plugins/StereoWidenerPlugin';
import { createSubHarmonizerPlugin } from './plugins/SubHarmonizerPlugin';
import { createTapeDelayPlugin } from './plugins/TapeDelayPlugin';
import { createTapeWarmthPlugin } from './plugins/TapeWarmthPlugin';
import { createTiltEQPlugin } from './plugins/TiltEQPlugin';
import { createTransientDesignerPlugin } from './plugins/TransientDesignerPlugin';
import { createTremoloPlugin } from './plugins/TremoloPlugin';
import { createTubeCompPlugin } from './plugins/TubeCompPlugin';
import { createTubeSaturatorPlugin } from './plugins/TubeSaturatorPlugin';
import { createVCACompPlugin } from './plugins/VCACompPlugin';
import { createVibratoPlugin } from './plugins/VibratoPlugin';
import { createVinylSimPlugin } from './plugins/VinylSimPlugin';
import { createVocalCompPlugin } from './plugins/VocalCompPlugin';
import { createVocalDoublerPlugin } from './plugins/VocalDoublerPlugin';
import { createVocalEnhancerPlugin } from './plugins/VocalEnhancerPlugin';
import { createVowelFilterPlugin } from './plugins/VowelFilterPlugin';
import { createWahWahPlugin } from './plugins/WahWahPlugin';
import { createWaveshaperPlugin } from './plugins/WaveshaperPlugin';
import { createWowFlutterPlugin } from './plugins/WowFlutterPlugin';

let _nextId = 1;
const _loadedWorklets = new Set();

// Factory map: pluginId → create function
// Part 16: exported so callers (Recording Studio) can instantiate plugin
// instances directly, bypassing the PluginHost class for simple insert chains.
export const PLUGIN_FACTORIES = {
  gain:       createGainPlugin,
  eq_3band:   createEQ3BandPlugin,
  compressor: createCompressorPlugin,
  reverb:     createReverbPlugin,
  delay:      createDelayPlugin,
  limiter:    createLimiterPlugin,
  deesser:    createDeEsserPlugin,
  saturation: createSaturationPlugin,
  ai_compressor:       createAICompressorPlugin,
  ai_de_room:       createAIDeRoomPlugin,
  aieq_match:       createAIEQMatchPlugin,
  ai_noise_reduce:       createAINoiseReducePlugin,
  ai_vocal_clean:       createAIVocalCleanPlugin,
  air_eq:       createAirEQPlugin,
  amp_sim:       createAmpSimPlugin,
  auto_filter:       createAutoFilterPlugin,
  auto_pan:       createAutoPanPlugin,
  auto_tune:       createAutoTunePlugin,
  bass_enhancer:       createBassEnhancerPlugin,
  bit_depth:       createBitDepthPlugin,
  bitcrusher:       createBitcrusherPlugin,
  breath_gate:       createBreathGatePlugin,
  brickwall_limiter:       createBrickwallLimiterPlugin,
  cassette:       createCassettePlugin,
  chamber_reverb:       createChamberReverbPlugin,
  channel_strip:       createChannelStripPlugin,
  choir:       createChoirPlugin,
  chorus:       createChorusPlugin,
  comb_filter:       createCombFilterPlugin,
  convolution_shaper:       createConvolutionShaperPlugin,
  dc_filter:       createDCFilterPlugin,
  de_esser:       createDeEsserPlugin,
  delay:       createDelayPlugin,
  dotted_eighth_delay:       createDottedEighthDelayPlugin,
  drum_bus:       createDrumBusPlugin,
  dust_scratch:       createDustScratchPlugin,
  dynamic_eq:       createDynamicEQPlugin,
  eq3_band:       createEQ3BandPlugin,
  envelope_filter:       createEnvelopeFilterPlugin,
  expander:       createExpanderPlugin,
  fet_comp:       createFETCompPlugin,
  flanger:       createFlangerPlugin,
  frequency_shifter:       createFrequencyShifterPlugin,
  fuzz:       createFuzzPlugin,
  gain:       createGainPlugin,
  gate:       createGatePlugin,
  gated_reverb:       createGatedReverbPlugin,
  granular_freeze:       createGranularFreezePlugin,
  graphic_eq:       createGraphicEQPlugin,
  graphic_e_q4_band: createGraphicEQ4BandPlugin,
  graphic_e_q5_band: createGraphicEQ5BandPlugin,
  graphic_e_q6_band: createGraphicEQ6BandPlugin,
  haas_effect:       createHaasEffectPlugin,
  hall_reverb:       createHallReverbPlugin,
  harmonic_exciter:       createHarmonicExciterPlugin,
  harmonizer:       createHarmonizerPlugin,
  hi_hat_shimmer:       createHiHatShimmerPlugin,
  kick_enhancer:       createKickEnhancerPlugin,
  limiter:       createLimiterPlugin,
  linear_phase_eq:       createLinearPhaseEQPlugin,
  looper:       createLooperPlugin,
  loudness_maximizer:       createLoudnessMaximizerPlugin,
  mastering_eq:       createMasteringEQPlugin,
  mid_side_balance:       createMidSideBalancePlugin,
  mid_side_eq:       createMidSideEQPlugin,
  mid_side_processor:       createMidSideProcessorPlugin,
  mono_maker:       createMonoMakerPlugin,
  multiband_comp:       createMultibandCompPlugin,
  multitap_delay:       createMultitapDelayPlugin,
  notch_eq:       createNotchEQPlugin,
  octaver:       createOctaverPlugin,
  optical_comp:       createOpticalCompPlugin,
  overdrive:       createOverdrivePlugin,
  parallel_comp:       createParallelCompPlugin,
  phase_flip:       createPhaseFlipPlugin,
  phaser:       createPhaserPlugin,
  phone:       createPhonePlugin,
  ping_pong_delay:       createPingPongDelayPlugin,
  pitch_shifter:       createPitchShifterPlugin,
  plate_reverb:       createPlateReverbPlugin,
  presence_eq:       createPresenceEQPlugin,
  radio:       createRadioPlugin,
  resonator:       createResonatorPlugin,
  reverb:       createReverbPlugin,
  reverse_reverb:       createReverseReverbPlugin,
  ring_mod:       createRingModPlugin,
  room_reverb:       createRoomReverbPlugin,
  rotary:       createRotaryPlugin,
  sample_rate_reducer:       createSampleRateReducerPlugin,
  saturation:       createSaturationPlugin,
  shimmer_reverb:       createShimmerReverbPlugin,
  slapback_delay:       createSlapbackDelayPlugin,
  snare_enhancer:       createSnareEnhancerPlugin,
  spectral_gate:       createSpectralGatePlugin,
  spring_reverb:       createSpringReverbPlugin,
  step_filter:       createStepFilterPlugin,
  stereo_enhancer:       createStereoEnhancerPlugin,
  stereo_widener:       createStereoWidenerPlugin,
  sub_harmonizer:       createSubHarmonizerPlugin,
  tape_delay:       createTapeDelayPlugin,
  tape_warmth:       createTapeWarmthPlugin,
  tilt_eq:       createTiltEQPlugin,
  transient_designer:       createTransientDesignerPlugin,
  tremolo:       createTremoloPlugin,
  tube_comp:       createTubeCompPlugin,
  tube_saturator:       createTubeSaturatorPlugin,
  vca_comp:       createVCACompPlugin,
  vibrato:       createVibratoPlugin,
  vinyl_sim:       createVinylSimPlugin,
  vocal_comp:       createVocalCompPlugin,
  vocal_doubler:       createVocalDoublerPlugin,
  vocal_enhancer:       createVocalEnhancerPlugin,
  vowel_filter:       createVowelFilterPlugin,
  wah_wah:       createWahWahPlugin,
  waveshaper:       createWaveshaperPlugin,
  wow_flutter:       createWowFlutterPlugin,
};

class PluginHost {
  constructor() {
    // trackId → [PluginInstance, ...]
    this.racks = new Map();
    this._listeners = new Map();
  }

  // ── Get or init rack for track ──
  _getRack(trackId) {
    if (!this.racks.has(trackId)) this.racks.set(trackId, []);
    return this.racks.get(trackId);
  }

  // ── Load worklet module if needed ──
  async _ensureWorklet(context, def) {
    if (def.processor.kind !== 'worklet') return;
    const name = def.processor.workletName;
    if (_loadedWorklets.has(name)) return;

    if (def.processor.moduleUrl) {
      await context.audioWorklet.addModule(def.processor.moduleUrl);
    } else {
      // Inline worklet — use compressorWorkletSource for compressor
      const { getCompressorWorkletSource } = await import('../worklets/compressorWorkletSource');
      const src = getCompressorWorkletSource(name);
      const blob = new Blob([src], { type: 'application/javascript' });
      const url = URL.createObjectURL(blob);
      await context.audioWorklet.addModule(url);
      URL.revokeObjectURL(url);
    }
    _loadedWorklets.add(name);
  }

  // ── Add plugin to track ──
  async addPlugin(trackGraph, pluginId, index = -1) {
    const def = getPluginDef(pluginId);
    if (!def) throw new Error(`Unknown plugin: ${pluginId}`);

    const ctx = trackGraph.context;
    await this._ensureWorklet(ctx, def);

    const factory = PLUGIN_FACTORIES[pluginId];
    if (!factory) throw new Error(`No factory for plugin: ${pluginId}`);

    const instanceId = `inst_${_nextId++}`;
    const defaultParams = {};
    def.params.forEach(p => { defaultParams[p.id] = p.default; });

    const instance = factory(ctx, defaultParams);

    const pluginInstance = {
      instanceId,
      pluginId,
      def,
      params: { ...defaultParams },
      bypassed: false,
      node: instance.node,         // main audio node (or chain wrapper)
      inputNode: instance.inputNode || instance.node,
      outputNode: instance.outputNode || instance.node,
      setParam: instance.setParam,  // (paramId, value) => void
      destroy: instance.destroy,    // cleanup
      _bypassGain: null,
    };

    // Create bypass infrastructure
    pluginInstance._bypassGain = ctx.createGain();
    pluginInstance._bypassGain.gain.value = 1;

    const rack = this._getRack(trackGraph.id);
    if (index >= 0 && index < rack.length) {
      rack.splice(index, 0, pluginInstance);
    } else {
      rack.push(pluginInstance);
    }

    this._rewire(trackGraph);
    this._emit('change', { trackId: trackGraph.id, action: 'add', instanceId });
    return instanceId;
  }

  // ── Remove plugin ──
  removePlugin(trackGraph, instanceId) {
    const rack = this._getRack(trackGraph.id);
    const idx = rack.findIndex(p => p.instanceId === instanceId);
    if (idx === -1) return;

    const inst = rack[idx];
    rack.splice(idx, 1);

    // Disconnect and cleanup
    try { inst.inputNode.disconnect(); } catch (e) {}
    try { inst.outputNode.disconnect(); } catch (e) {}
    try { inst._bypassGain.disconnect(); } catch (e) {}
    if (inst.destroy) inst.destroy();

    this._rewire(trackGraph);
    this._emit('change', { trackId: trackGraph.id, action: 'remove', instanceId });
  }

  // ── Move plugin to new index ──
  movePlugin(trackGraph, instanceId, newIndex) {
    const rack = this._getRack(trackGraph.id);
    const idx = rack.findIndex(p => p.instanceId === instanceId);
    if (idx === -1) return;

    const [inst] = rack.splice(idx, 1);
    const clampedIdx = Math.max(0, Math.min(rack.length, newIndex));
    rack.splice(clampedIdx, 0, inst);

    this._rewire(trackGraph);
    this._emit('change', { trackId: trackGraph.id, action: 'move', instanceId });
  }

  // ── Set parameter ──
  setParam(trackGraph, instanceId, paramId, value) {
    const rack = this._getRack(trackGraph.id);
    const inst = rack.find(p => p.instanceId === instanceId);
    if (!inst) return;

    inst.params[paramId] = value;
    if (inst.setParam) inst.setParam(paramId, value);
    this._emit('paramChange', { trackId: trackGraph.id, instanceId, paramId, value });
  }

  // ── Bypass toggle ──
  bypass(trackGraph, instanceId, bypassed) {
    const rack = this._getRack(trackGraph.id);
    const inst = rack.find(p => p.instanceId === instanceId);
    if (!inst) return;

    inst.bypassed = bypassed;
    this._rewire(trackGraph);
    this._emit('change', { trackId: trackGraph.id, action: 'bypass', instanceId, bypassed });
  }

  // ── Load preset ──
  loadPreset(trackGraph, instanceId, presetParams) {
    const rack = this._getRack(trackGraph.id);
    const inst = rack.find(p => p.instanceId === instanceId);
    if (!inst) return;

    Object.entries(presetParams).forEach(([paramId, value]) => {
      inst.params[paramId] = value;
      if (inst.setParam) inst.setParam(paramId, value);
    });
    this._emit('presetLoad', { trackId: trackGraph.id, instanceId, params: presetParams });
  }

  // ── Get rack for track ──
  getRack(trackId) {
    return this._getRack(trackId);
  }

  // ── Rewire the insert chain ──
  _rewire(trackGraph) {
    const rack = this._getRack(trackGraph.id);

    // Disconnect existing insert chain
    trackGraph.disconnectInsertPassthrough();
    try { trackGraph.insertRackInput.disconnect(); } catch (e) {}
    rack.forEach(inst => {
      try { inst.inputNode.disconnect(); } catch (e) {}
      try { inst.outputNode.disconnect(); } catch (e) {}
      try { inst._bypassGain.disconnect(); } catch (e) {}
    });

    if (rack.length === 0) {
      // No plugins — direct passthrough
      trackGraph.reconnectInsertPassthrough();
      return;
    }

    // Chain: rackInput → [plugin1 → plugin2 → ...] → rackOutput
    let prevOutput = trackGraph.insertRackInput;

    rack.forEach(inst => {
      if (inst.bypassed) {
        // Bypass: skip the plugin node, connect through bypass gain
        inst._bypassGain.gain.value = 1;
        prevOutput.connect(inst._bypassGain);
        prevOutput = inst._bypassGain;
      } else {
        prevOutput.connect(inst.inputNode);
        prevOutput = inst.outputNode;
      }
    });

    prevOutput.connect(trackGraph.insertRackOutput);
  }

  // ── Serialize rack for project save ──
  serializeRack(trackId) {
    const rack = this._getRack(trackId);
    return rack.map(inst => ({
      instanceId: inst.instanceId,
      pluginId: inst.pluginId,
      params: { ...inst.params },
      bypassed: inst.bypassed,
    }));
  }

  // ── Deserialize: restore rack from saved data ──
  async deserializeRack(trackGraph, savedRack) {
    // Clear existing
    const rack = this._getRack(trackGraph.id);
    [...rack].forEach(inst => this.removePlugin(trackGraph, inst.instanceId));

    // Restore
    for (const saved of savedRack) {
      const instanceId = await this.addPlugin(trackGraph, saved.pluginId);
      // Apply saved params
      Object.entries(saved.params || {}).forEach(([paramId, value]) => {
        this.setParam(trackGraph, instanceId, paramId, value);
      });
      if (saved.bypassed) {
        this.bypass(trackGraph, instanceId, true);
      }
    }
  }

  // ── Clear all plugins for a track ──
  clearRack(trackGraph) {
    const rack = this._getRack(trackGraph.id);
    [...rack].forEach(inst => this.removePlugin(trackGraph, inst.instanceId));
  }

  // ── Events ──
  on(event, cb) {
    if (!this._listeners.has(event)) this._listeners.set(event, new Set());
    this._listeners.get(event).add(cb);
    return () => this._listeners.get(event)?.delete(cb);
  }

  _emit(event, data) {
    this._listeners.get(event)?.forEach(cb => {
      try { cb(data); } catch (e) { console.error(`[PluginHost] ${event}:`, e); }
    });
  }
}

// Singleton
let _hostInstance = null;
export const getPluginHost = () => {
  if (!_hostInstance) _hostInstance = new PluginHost();
  return _hostInstance;
};

export default PluginHost;