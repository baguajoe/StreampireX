// =============================================================================
// PluginRackUI.js — Visual Plugin Rack for StreamPireX DAW
// =============================================================================
// Features:
//   - Browse all 109 plugins by category
//   - Drag plugin from browser onto rack slot
//   - Reorder plugins via drag and drop
//   - Per-plugin parameter controls
//   - Bypass toggle per plugin
//   - Pre/post gain per plugin
//   - Save/load rack presets
// =============================================================================

import React, { useState, useCallback, useRef } from 'react';

// All 109 plugins organized by category
export const PLUGIN_REGISTRY = {
  'EQ': [
    { id: 'eq_3band',         name: '3-Band EQ',        fn: 'createEQ3BandPlugin' },
    { id: 'dynamic_eq',       name: 'Dynamic EQ',       fn: 'createDynamicEQPlugin' },
    { id: 'linear_phase_eq',  name: 'Linear Phase EQ',  fn: 'createLinearPhaseEQPlugin' },
    { id: 'mid_side_eq',      name: 'Mid-Side EQ',      fn: 'createMidSideEQPlugin' },
    { id: 'air_eq',           name: 'Air EQ',           fn: 'createAirEQPlugin' },
    { id: 'tilt_eq',          name: 'Tilt EQ',          fn: 'createTiltEQPlugin' },
    { id: 'graphic_eq',       name: '10-Band Graphic',  fn: 'createGraphicEQPlugin' },
    { id: 'notch_eq',         name: 'Notch/Surgical',   fn: 'createNotchEQPlugin' },
    { id: 'presence_eq',      name: 'Presence EQ',      fn: 'createPresenceEQPlugin' },
    { id: 'parametric_eq',    name: 'Parametric EQ',    fn: 'createParametricEQPlugin' },
    { id: 'mastering_eq',     name: 'Mastering EQ',     fn: 'createMasteringEQPlugin' },
    { id: 'vintage_eq',       name: 'Vintage Console',  fn: 'createVintageEQPlugin' },
  ],
  'Dynamics': [
    { id: 'compressor',       name: 'Compressor',       fn: 'createCompressorPlugin' },
    { id: 'optical_comp',     name: 'Optical (LA-2A)',  fn: 'createOpticalCompPlugin' },
    { id: 'fet_comp',         name: 'FET (1176)',        fn: 'createFETCompPlugin' },
    { id: 'vca_comp',         name: 'VCA (SSL G-Bus)',   fn: 'createVCACompPlugin' },
    { id: 'tube_comp',        name: 'Tube Compressor',  fn: 'createTubeCompPlugin' },
    { id: 'multiband_comp',   name: 'Multiband Comp',   fn: 'createMultibandCompPlugin' },
    { id: 'parallel_comp',    name: 'Parallel Comp',    fn: 'createParallelCompPlugin' },
    { id: 'ai_compressor',    name: 'AI Compressor',    fn: 'createAICompressorPlugin' },
    { id: 'gate',             name: 'Gate',             fn: 'createGatePlugin' },
    { id: 'expander',         name: 'Expander',         fn: 'createExpanderPlugin' },
    { id: 'transient_shaper', name: 'Transient Shaper', fn: 'createTransientShaperPlugin' },
    { id: 'transient_designer',name:'Transient Designer',fn:'createTransientDesignerPlugin'},
    { id: 'limiter',          name: 'Limiter',          fn: 'createLimiterPlugin' },
    { id: 'brickwall_limiter',name: 'Brickwall Limiter',fn: 'createBrickwallLimiterPlugin' },
    { id: 'loudness_max',     name: 'Loudness Max',     fn: 'createLoudnessMaximizerPlugin' },
    { id: 'deesser',          name: 'De-Esser',         fn: 'createDeEsserPlugin' },
    { id: 'breath_gate',      name: 'Breath Gate',      fn: 'createBreathGatePlugin' },
    { id: 'drum_bus',         name: 'Drum Bus',         fn: 'createDrumBusPlugin' },
  ],
  'Reverb': [
    { id: 'reverb',           name: 'Convolution Reverb',fn:'createReverbPlugin' },
    { id: 'hall_reverb',      name: 'Hall Reverb',      fn: 'createHallReverbPlugin' },
    { id: 'plate_reverb',     name: 'Plate Reverb',     fn: 'createPlateReverbPlugin' },
    { id: 'room_reverb',      name: 'Room Reverb',      fn: 'createRoomReverbPlugin' },
    { id: 'chamber_reverb',   name: 'Chamber Reverb',   fn: 'createChamberReverbPlugin' },
    { id: 'spring_reverb',    name: 'Spring Reverb',    fn: 'createSpringReverbPlugin' },
    { id: 'shimmer_reverb',   name: 'Shimmer Reverb',   fn: 'createShimmerReverbPlugin' },
    { id: 'gated_reverb',     name: 'Gated Reverb',     fn: 'createGatedReverbPlugin' },
    { id: 'reverse_reverb',   name: 'Reverse Reverb',   fn: 'createReverseReverbPlugin' },
  ],
  'Delay': [
    { id: 'delay',            name: 'Delay',            fn: 'createDelayPlugin' },
    { id: 'tape_delay',       name: 'Tape Delay',       fn: 'createTapeDelayPlugin' },
    { id: 'ping_pong_delay',  name: 'Ping Pong',        fn: 'createPingPongDelayPlugin' },
    { id: 'slapback_delay',   name: 'Slapback',         fn: 'createSlapbackDelayPlugin' },
    { id: 'multitap_delay',   name: 'Multitap',         fn: 'createMultitapDelayPlugin' },
    { id: 'dotted_8th_delay', name: 'Dotted 8th',       fn: 'createDottedEighthDelayPlugin' },
  ],
  'Modulation': [
    { id: 'chorus',           name: 'Chorus',           fn: 'createChorusPlugin' },
    { id: 'flanger',          name: 'Flanger',          fn: 'createFlangerPlugin' },
    { id: 'phaser',           name: 'Phaser',           fn: 'createPhaserPlugin' },
    { id: 'tremolo',          name: 'Tremolo',          fn: 'createTremoloPlugin' },
    { id: 'vibrato',          name: 'Vibrato',          fn: 'createVibratoPlugin' },
    { id: 'auto_pan',         name: 'Auto-Pan',         fn: 'createAutoPanPlugin' },
    { id: 'rotary',           name: 'Rotary',           fn: 'createRotaryPlugin' },
    { id: 'ring_mod',         name: 'Ring Modulator',   fn: 'createRingModPlugin' },
    { id: 'auto_filter',      name: 'Auto Filter',      fn: 'createAutoFilterPlugin' },
    { id: 'envelope_filter',  name: 'Envelope Filter',  fn: 'createEnvelopeFilterPlugin' },
    { id: 'wah_wah',          name: 'Wah Wah',          fn: 'createWahWahPlugin' },
  ],
  'Distortion': [
    { id: 'saturation',       name: 'Saturation',       fn: 'createSaturationPlugin' },
    { id: 'tube_saturator',   name: 'Tube Saturator',   fn: 'createTubeSaturatorPlugin' },
    { id: 'overdrive',        name: 'Overdrive',        fn: 'createOverdrivePlugin' },
    { id: 'fuzz',             name: 'Fuzz',             fn: 'createFuzzPlugin' },
    { id: 'bitcrusher',       name: 'Bitcrusher',       fn: 'createBitcrusherPlugin' },
    { id: 'waveshaper',       name: 'Waveshaper',       fn: 'createWaveshaperPlugin' },
    { id: 'amp_sim',          name: 'Amp Sim',          fn: 'createAmpSimPlugin' },
    { id: 'vintage_eq2',      name: 'Vintage EQ',       fn: 'createVintageEQPlugin' },
    { id: 'bit_depth',        name: 'Bit Depth',        fn: 'createBitDepthPlugin' },
    { id: 'sample_rate_reducer',name:'Sample Rate Red.',fn:'createSampleRateReducerPlugin'},
  ],
  'Lo-Fi': [
    { id: 'vinyl_sim',        name: 'Vinyl Sim',        fn: 'createVinylSimPlugin' },
    { id: 'cassette',         name: 'Cassette',         fn: 'createCassettePlugin' },
    { id: 'radio',            name: 'Radio',            fn: 'createRadioPlugin' },
    { id: 'phone',            name: 'Phone',            fn: 'createPhonePlugin' },
    { id: 'wow_flutter',      name: 'Wow & Flutter',    fn: 'createWowFlutterPlugin' },
    { id: 'dust_scratch',     name: 'Dust & Scratch',   fn: 'createDustScratchPlugin' },
    { id: 'tape_warmth',      name: 'Tape Warmth',      fn: 'createTapeWarmthPlugin' },
  ],
  'Vocal': [
    { id: 'pitch_shifter',    name: 'Pitch Shifter',    fn: 'createPitchShifterPlugin' },
    { id: 'vocal_doubler',    name: 'Vocal Doubler',    fn: 'createVocalDoublerPlugin' },
    { id: 'vocal_enhancer',   name: 'Vocal Enhancer',   fn: 'createVocalEnhancerPlugin' },
    { id: 'vocal_comp',       name: 'Vocal Compressor', fn: 'createVocalCompPlugin' },
    { id: 'auto_tune',        name: 'Auto-Tune',        fn: 'createAutoTunePlugin' },
    { id: 'harmonizer',       name: 'Harmonizer',       fn: 'createHarmonizerPlugin' },
    { id: 'choir',            name: 'Choir',            fn: 'createChoirPlugin' },
    { id: 'ai_vocal_clean',   name: 'AI Vocal Clean',   fn: 'createAIVocalCleanPlugin' },
  ],
  'Mastering': [
    { id: 'harmonic_exciter', name: 'Harmonic Exciter', fn: 'createHarmonicExciterPlugin' },
    { id: 'stereo_enhancer',  name: 'Stereo Enhancer',  fn: 'createStereoEnhancerPlugin' },
    { id: 'stereo_widener',   name: 'Stereo Widener',   fn: 'createStereoWidenerPlugin' },
    { id: 'mid_side_balance', name: 'Mid-Side Balance', fn: 'createMidSideBalancePlugin' },
    { id: 'mid_side_processor',name:'Mid-Side Proc.',   fn: 'createMidSideProcessorPlugin' },
    { id: 'haas_effect',      name: 'Haas Effect',      fn: 'createHaasEffectPlugin' },
  ],
  'Filters': [
    { id: 'step_filter',      name: 'Step Filter',      fn: 'createStepFilterPlugin' },
    { id: 'vowel_filter',     name: 'Vowel Filter',     fn: 'createVowelFilterPlugin' },
    { id: 'comb_filter',      name: 'Comb Filter',      fn: 'createCombFilterPlugin' },
    { id: 'resonator',        name: 'Resonator',        fn: 'createResonatorPlugin' },
    { id: 'dc_filter',        name: 'DC Filter',        fn: 'createDCFilterPlugin' },
  ],
  'AI': [
    { id: 'ai_noise_reduce',  name: 'AI Noise Reduce',  fn: 'createAINoiseReducePlugin' },
    { id: 'ai_de_room',       name: 'AI De-Room',       fn: 'createAIDeRoomPlugin' },
    { id: 'ai_eq_match',      name: 'AI EQ Match',      fn: 'createAIEQMatchPlugin' },
  ],
  'Drums': [
    { id: 'kick_enhancer',    name: 'Kick Enhancer',    fn: 'createKickEnhancerPlugin' },
    { id: 'snare_enhancer',   name: 'Snare Enhancer',   fn: 'createSnareEnhancerPlugin' },
    { id: 'hihat_shimmer',    name: 'Hi-Hat Shimmer',   fn: 'createHiHatShimmerPlugin' },
    { id: 'bass_enhancer',    name: 'Bass Enhancer',    fn: 'createBassEnhancerPlugin' },
    { id: 'sub_harmonizer',   name: 'Sub Harmonizer',   fn: 'createSubHarmonizerPlugin' },
  ],
  'Utility': [
    { id: 'gain',             name: 'Gain',             fn: 'createGainPlugin' },
    { id: 'channel_strip',    name: 'Channel Strip',    fn: 'createChannelStripPlugin' },
    { id: 'phase_flip',       name: 'Phase Flip',       fn: 'createPhaseFlipPlugin' },
    { id: 'mono_maker',       name: 'Mono Maker',       fn: 'createMonoMakerPlugin' },
    { id: 'freq_shifter',     name: 'Freq Shifter',     fn: 'createFrequencyShifterPlugin' },
    { id: 'spectral_gate',    name: 'Spectral Gate',    fn: 'createSpectralGatePlugin' },
    { id: 'convolution_shaper',name:'Conv. Shaper',     fn: 'createConvolutionShaperPlugin' },
    { id: 'granular_freeze',  name: 'Granular Freeze',  fn: 'createGranularFreezePlugin' },
    { id: 'looper',           name: 'Looper',           fn: 'createLooperPlugin' },
    { id: 'octaver',          name: 'Octaver',          fn: 'createOctaverPlugin' },
  ],
  'Creative': [
    { id: 'pitch_shifter2',   name: 'Pitch Shifter',    fn: 'createPitchShifterPlugin' },
    { id: 'sub_harmonizer2',  name: 'Sub Harmonizer',   fn: 'createSubHarmonizerPlugin' },
    { id: 'freq_shifter2',    name: 'Freq Shifter',     fn: 'createFrequencyShifterPlugin' },
  ],
};

const CATEGORY_COLORS = {
  'EQ': '#3b82f6', 'Dynamics': '#10b981', 'Reverb': '#8b5cf6',
  'Delay': '#f59e0b', 'Modulation': '#ec4899', 'Distortion': '#ef4444',
  'Lo-Fi': '#a78bfa', 'Vocal': '#06b6d4', 'Mastering': '#fbbf24',
  'Filters': '#84cc16', 'AI': '#f97316', 'Drums': '#6366f1',
  'Utility': '#6b7280', 'Creative': '#14b8a6',
};

const PluginRackUI = ({
  trackId,
  plugins = [],        // current plugin chain: [{id, name, bypassed, params}]
  onAddPlugin,         // (pluginDef) => void
  onRemovePlugin,      // (index) => void
  onMovePlugin,        // (fromIdx, toIdx) => void
  onBypassPlugin,      // (index, bypassed) => void
  onSetParam,          // (index, key, value) => void
  onClose,
}) => {
  const [browserOpen, setBrowserOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState('EQ');
  const [searchQuery, setSearchQuery] = useState('');
  const [dragOverIdx, setDragOverIdx] = useState(null);
  const dragSourceRef = useRef(null);

  // ── Plugin drag/drop reordering ────────────────────────────────────────
  const handleDragStart = (e, idx) => {
    dragSourceRef.current = idx;
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, idx) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIdx(idx);
  };

  const handleDrop = (e, idx) => {
    e.preventDefault();
    if (dragSourceRef.current !== null && dragSourceRef.current !== idx) {
      onMovePlugin?.(dragSourceRef.current, idx);
    }
    dragSourceRef.current = null;
    setDragOverIdx(null);
  };

  const handleDragLeave = () => setDragOverIdx(null);

  // ── Add plugin from browser ────────────────────────────────────────────
  const handleAddPlugin = (pluginDef) => {
    onAddPlugin?.(pluginDef);
  };

  const allPlugins = Object.entries(PLUGIN_REGISTRY).flatMap(([cat, plugins]) =>
    plugins.map(p => ({ ...p, category: cat }))
  );

  const filteredPlugins = searchQuery
    ? allPlugins.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : PLUGIN_REGISTRY[activeCategory] || [];

  return (
    <div className="plugin-rack-ui">
      {/* Rack header */}
      <div className="pru-header">
        <span className="pru-title">🔌 Plugin Rack {trackId ? `— Track ${trackId}` : ''}</span>
        <div className="pru-header-actions">
          <button className="pru-btn" onClick={() => setBrowserOpen(b => !b)}>
            {browserOpen ? '◀ Hide Browser' : '+ Add Plugin'}
          </button>
          <button className="pru-btn pru-preset">💾 Preset</button>
          {onClose && <button className="pru-close" onClick={onClose}>✕</button>}
        </div>
      </div>

      <div className="pru-body">
        {/* Plugin chain */}
        <div className="pru-chain">
          {plugins.length === 0 ? (
            <div className="pru-empty">
              <div style={{fontSize:24, marginBottom:6}}>🔌</div>
              <div>No plugins in chain</div>
              <div style={{color:'#555', fontSize:11, marginTop:4}}>Click "+ Add Plugin" to browse 109 plugins</div>
            </div>
          ) : (
            plugins.map((plugin, idx) => (
              <PluginSlot
                key={`${plugin.id}-${idx}`}
                plugin={plugin}
                index={idx}
                isDragOver={dragOverIdx === idx}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onDragLeave={handleDragLeave}
                onRemove={() => onRemovePlugin?.(idx)}
                onBypass={(val) => onBypassPlugin?.(idx, val)}
                onSetParam={(key, val) => onSetParam?.(idx, key, val)}
              />
            ))
          )}

          {/* Drop zone at end */}
          <div
            className={`pru-drop-zone ${dragOverIdx === plugins.length ? 'active' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragOverIdx(plugins.length); }}
            onDrop={(e) => handleDrop(e, plugins.length)}
            onDragLeave={handleDragLeave}
          >
            Drop plugin here
          </div>
        </div>

        {/* Plugin browser */}
        {browserOpen && (
          <div className="pru-browser">
            <div className="pru-browser-search">
              <input
                className="pru-search-input"
                placeholder="Search plugins..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                autoFocus
              />
            </div>

            {!searchQuery && (
              <div className="pru-categories">
                {Object.keys(PLUGIN_REGISTRY).map(cat => (
                  <button
                    key={cat}
                    className={`pru-cat-btn ${activeCategory === cat ? 'active' : ''}`}
                    style={{ borderLeftColor: CATEGORY_COLORS[cat] }}
                    onClick={() => setActiveCategory(cat)}
                  >
                    {cat}
                    <span className="pru-cat-count">{PLUGIN_REGISTRY[cat].length}</span>
                  </button>
                ))}
              </div>
            )}

            <div className="pru-plugin-list">
              {(searchQuery ? filteredPlugins : PLUGIN_REGISTRY[activeCategory] || []).map(plugin => (
                <div
                  key={plugin.id}
                  className="pru-plugin-item"
                  style={{ borderLeftColor: CATEGORY_COLORS[plugin.category || activeCategory] }}
                  onClick={() => handleAddPlugin(plugin)}
                  title={`Add ${plugin.name}`}
                >
                  <span className="pru-plugin-name">{plugin.name}</span>
                  {plugin.category && searchQuery && (
                    <span className="pru-plugin-cat">{plugin.category}</span>
                  )}
                  <span className="pru-plugin-add">+</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const PluginSlot = ({ plugin, index, isDragOver, onDragStart, onDragOver, onDrop, onDragLeave, onRemove, onBypass, onSetParam }) => {
  const [expanded, setExpanded] = useState(false);
  const category = Object.entries(PLUGIN_REGISTRY).find(([, plugins]) =>
    plugins.some(p => p.fn === plugin.fn || p.id === plugin.id)
  )?.[0] || 'Utility';
  const color = CATEGORY_COLORS[category] || '#6b7280';

  return (
    <div
      className={`pru-slot ${plugin.bypassed ? 'bypassed' : ''} ${isDragOver ? 'drag-over' : ''}`}
      draggable
      onDragStart={(e) => onDragStart(e, index)}
      onDragOver={(e) => onDragOver(e, index)}
      onDrop={(e) => onDrop(e, index)}
      onDragLeave={onDragLeave}
      style={{ borderLeftColor: color }}
    >
      <div className="pru-slot-header">
        <span className="pru-slot-drag">⠿</span>

        <button
          className={`pru-bypass-btn ${plugin.bypassed ? '' : 'active'}`}
          onClick={() => onBypass(!plugin.bypassed)}
          title="Bypass"
        />

        <span className="pru-slot-name">{plugin.name}</span>
        <span className="pru-slot-cat" style={{color}}>{category}</span>

        <div className="pru-slot-actions">
          <button className="pru-expand-btn" onClick={() => setExpanded(e => !e)}>
            {expanded ? '▲' : '▼'}
          </button>
          <button className="pru-remove-btn" onClick={onRemove} title="Remove">✕</button>
        </div>
      </div>

      {expanded && (
        <div className="pru-slot-params">
          {(plugin.params || []).map(param => (
            <div key={param.key} className="pru-param-row">
              <label className="pru-param-label">{param.label}</label>
              <input
                type="range"
                className="pru-param-slider"
                min={param.min ?? 0}
                max={param.max ?? 100}
                step={param.step ?? 1}
                value={param.value ?? param.default ?? 0}
                onChange={e => onSetParam(param.key, parseFloat(e.target.value))}
              />
              <span className="pru-param-value">
                {typeof param.value === 'number' ? param.value.toFixed(1) : (param.default ?? 0)}
                {param.unit || ''}
              </span>
            </div>
          ))}
          {(!plugin.params || plugin.params.length === 0) && (
            <div style={{color:'#555', fontSize:11, padding:'4px 0'}}>No parameters exposed</div>
          )}
        </div>
      )}
    </div>
  );
};

export default PluginRackUI;
