// =============================================================================
// DJControllerMappings.js — Universal DJ Controller MIDI Mappings
// =============================================================================
// Supports: Pioneer, Numark, Hercules, Native Instruments, Reloop, Denon,
//           Behringer, Vestax, Allen & Heath, and Generic MIDI controllers
// Uses Web MIDI API — works in Chrome/Edge only
// =============================================================================

// ── HOW IT WORKS ──────────────────────────────────────────────────────────────
// Each controller maps MIDI CC/Note numbers to DJ functions:
// { type: 'cc'|'note', channel: 0-15, number: 0-127, action: 'functionName' }
// Actions: play_a, play_b, cue_a, cue_b, crossfader, volume_a, volume_b,
//          pitch_a, pitch_b, eq_hi_a, eq_mid_a, eq_lo_a, eq_hi_b, eq_mid_b,
//          eq_lo_b, loop_a, loop_b, hotcue_1-8, load_a, load_b, sync_a,
//          sync_b, jog_a, jog_b, filter_a, filter_b, fx1, fx2, fx3

export const DJ_CONTROLLER_MAPPINGS = {

  // ── PIONEER ─────────────────────────────────────────────────────────────────

  'DDJ-200': {
    name: 'Pioneer DDJ-200',
    brand: 'Pioneer',
    channel: 0,
    mappings: [
      // Deck A Transport
      { type: 'note', channel: 0, number: 11, action: 'play_a' },
      { type: 'note', channel: 0, number: 12, action: 'cue_a' },
      { type: 'note', channel: 0, number: 13, action: 'sync_a' },
      { type: 'note', channel: 0, number: 20, action: 'loop_a' },
      // Deck B Transport
      { type: 'note', channel: 1, number: 11, action: 'play_b' },
      { type: 'note', channel: 1, number: 12, action: 'cue_b' },
      { type: 'note', channel: 1, number: 13, action: 'sync_b' },
      { type: 'note', channel: 1, number: 20, action: 'loop_b' },
      // Faders
      { type: 'cc', channel: 0, number: 9,  action: 'volume_a' },
      { type: 'cc', channel: 1, number: 9,  action: 'volume_b' },
      { type: 'cc', channel: 0, number: 8,  action: 'crossfader' },
      // Pitch
      { type: 'cc', channel: 0, number: 0,  action: 'pitch_a' },
      { type: 'cc', channel: 1, number: 0,  action: 'pitch_b' },
      // EQ Deck A
      { type: 'cc', channel: 0, number: 7,  action: 'eq_hi_a' },
      { type: 'cc', channel: 0, number: 11, action: 'eq_mid_a' },
      { type: 'cc', channel: 0, number: 15, action: 'eq_lo_a' },
      // EQ Deck B
      { type: 'cc', channel: 1, number: 7,  action: 'eq_hi_b' },
      { type: 'cc', channel: 1, number: 11, action: 'eq_mid_b' },
      { type: 'cc', channel: 1, number: 15, action: 'eq_lo_b' },
      // Hot Cues Deck A
      { type: 'note', channel: 0, number: 1, action: 'hotcue_1' },
      { type: 'note', channel: 0, number: 2, action: 'hotcue_2' },
      { type: 'note', channel: 0, number: 3, action: 'hotcue_3' },
      { type: 'note', channel: 0, number: 4, action: 'hotcue_4' },
      // Jog Wheels
      { type: 'cc', channel: 0, number: 33, action: 'jog_a' },
      { type: 'cc', channel: 1, number: 33, action: 'jog_b' },
      // Load
      { type: 'note', channel: 0, number: 70, action: 'load_a' },
      { type: 'note', channel: 1, number: 70, action: 'load_b' },
    ],
  },

  'DDJ-400': {
    name: 'Pioneer DDJ-400',
    brand: 'Pioneer',
    channel: 0,
    mappings: [
      { type: 'note', channel: 0, number: 11, action: 'play_a' },
      { type: 'note', channel: 0, number: 12, action: 'cue_a' },
      { type: 'note', channel: 0, number: 13, action: 'sync_a' },
      { type: 'note', channel: 1, number: 11, action: 'play_b' },
      { type: 'note', channel: 1, number: 12, action: 'cue_b' },
      { type: 'note', channel: 1, number: 13, action: 'sync_b' },
      { type: 'cc',   channel: 0, number: 9,  action: 'volume_a' },
      { type: 'cc',   channel: 1, number: 9,  action: 'volume_b' },
      { type: 'cc',   channel: 0, number: 8,  action: 'crossfader' },
      { type: 'cc',   channel: 0, number: 0,  action: 'pitch_a' },
      { type: 'cc',   channel: 1, number: 0,  action: 'pitch_b' },
      { type: 'cc',   channel: 0, number: 7,  action: 'eq_hi_a' },
      { type: 'cc',   channel: 0, number: 11, action: 'eq_mid_a' },
      { type: 'cc',   channel: 0, number: 15, action: 'eq_lo_a' },
      { type: 'cc',   channel: 1, number: 7,  action: 'eq_hi_b' },
      { type: 'cc',   channel: 1, number: 11, action: 'eq_mid_b' },
      { type: 'cc',   channel: 1, number: 15, action: 'eq_lo_b' },
      { type: 'cc',   channel: 0, number: 20, action: 'filter_a' },
      { type: 'cc',   channel: 1, number: 20, action: 'filter_b' },
      { type: 'note', channel: 0, number: 20, action: 'loop_a' },
      { type: 'note', channel: 1, number: 20, action: 'loop_b' },
      { type: 'cc',   channel: 0, number: 33, action: 'jog_a' },
      { type: 'cc',   channel: 1, number: 33, action: 'jog_b' },
      { type: 'note', channel: 0, number: 1,  action: 'hotcue_1' },
      { type: 'note', channel: 0, number: 2,  action: 'hotcue_2' },
      { type: 'note', channel: 0, number: 3,  action: 'hotcue_3' },
      { type: 'note', channel: 0, number: 4,  action: 'hotcue_4' },
      { type: 'note', channel: 0, number: 70, action: 'load_a' },
      { type: 'note', channel: 1, number: 70, action: 'load_b' },
      { type: 'cc',   channel: 0, number: 70, action: 'fx1' },
      { type: 'cc',   channel: 0, number: 71, action: 'fx2' },
      { type: 'cc',   channel: 0, number: 72, action: 'fx3' },
    ],
  },

  'DDJ-SB3': {
    name: 'Pioneer DDJ-SB3',
    brand: 'Pioneer',
    channel: 0,
    mappings: [
      { type: 'note', channel: 0, number: 11, action: 'play_a' },
      { type: 'note', channel: 0, number: 12, action: 'cue_a' },
      { type: 'note', channel: 0, number: 13, action: 'sync_a' },
      { type: 'note', channel: 1, number: 11, action: 'play_b' },
      { type: 'note', channel: 1, number: 12, action: 'cue_b' },
      { type: 'note', channel: 1, number: 13, action: 'sync_b' },
      { type: 'cc',   channel: 0, number: 9,  action: 'volume_a' },
      { type: 'cc',   channel: 1, number: 9,  action: 'volume_b' },
      { type: 'cc',   channel: 0, number: 8,  action: 'crossfader' },
      { type: 'cc',   channel: 0, number: 0,  action: 'pitch_a' },
      { type: 'cc',   channel: 1, number: 0,  action: 'pitch_b' },
      { type: 'cc',   channel: 0, number: 7,  action: 'eq_hi_a' },
      { type: 'cc',   channel: 0, number: 11, action: 'eq_mid_a' },
      { type: 'cc',   channel: 0, number: 15, action: 'eq_lo_a' },
      { type: 'cc',   channel: 1, number: 7,  action: 'eq_hi_b' },
      { type: 'cc',   channel: 1, number: 11, action: 'eq_mid_b' },
      { type: 'cc',   channel: 1, number: 15, action: 'eq_lo_b' },
      { type: 'note', channel: 0, number: 1,  action: 'hotcue_1' },
      { type: 'note', channel: 0, number: 2,  action: 'hotcue_2' },
      { type: 'note', channel: 0, number: 3,  action: 'hotcue_3' },
      { type: 'note', channel: 0, number: 4,  action: 'hotcue_4' },
      { type: 'cc',   channel: 0, number: 33, action: 'jog_a' },
      { type: 'cc',   channel: 1, number: 33, action: 'jog_b' },
    ],
  },

  'DDJ-REV1': {
    name: 'Pioneer DDJ-REV1',
    brand: 'Pioneer',
    channel: 0,
    mappings: [
      { type: 'note', channel: 0, number: 11, action: 'play_a' },
      { type: 'note', channel: 0, number: 12, action: 'cue_a' },
      { type: 'note', channel: 1, number: 11, action: 'play_b' },
      { type: 'note', channel: 1, number: 12, action: 'cue_b' },
      { type: 'cc',   channel: 0, number: 9,  action: 'volume_a' },
      { type: 'cc',   channel: 1, number: 9,  action: 'volume_b' },
      { type: 'cc',   channel: 0, number: 8,  action: 'crossfader' },
      { type: 'cc',   channel: 0, number: 0,  action: 'pitch_a' },
      { type: 'cc',   channel: 1, number: 0,  action: 'pitch_b' },
      { type: 'cc',   channel: 0, number: 7,  action: 'eq_hi_a' },
      { type: 'cc',   channel: 0, number: 11, action: 'eq_mid_a' },
      { type: 'cc',   channel: 0, number: 15, action: 'eq_lo_a' },
      { type: 'cc',   channel: 1, number: 7,  action: 'eq_hi_b' },
      { type: 'cc',   channel: 1, number: 11, action: 'eq_mid_b' },
      { type: 'cc',   channel: 1, number: 15, action: 'eq_lo_b' },
      { type: 'cc',   channel: 0, number: 33, action: 'jog_a' },
      { type: 'cc',   channel: 1, number: 33, action: 'jog_b' },
    ],
  },

  // ── NUMARK ──────────────────────────────────────────────────────────────────

  'Numark-Mixtrack-Pro-FX': {
    name: 'Numark Mixtrack Pro FX',
    brand: 'Numark',
    channel: 0,
    mappings: [
      { type: 'note', channel: 0, number: 0,  action: 'play_a' },
      { type: 'note', channel: 0, number: 1,  action: 'cue_a' },
      { type: 'note', channel: 0, number: 2,  action: 'sync_a' },
      { type: 'note', channel: 1, number: 0,  action: 'play_b' },
      { type: 'note', channel: 1, number: 1,  action: 'cue_b' },
      { type: 'note', channel: 1, number: 2,  action: 'sync_b' },
      { type: 'cc',   channel: 0, number: 2,  action: 'volume_a' },
      { type: 'cc',   channel: 1, number: 2,  action: 'volume_b' },
      { type: 'cc',   channel: 0, number: 1,  action: 'crossfader' },
      { type: 'cc',   channel: 0, number: 3,  action: 'pitch_a' },
      { type: 'cc',   channel: 1, number: 3,  action: 'pitch_b' },
      { type: 'cc',   channel: 0, number: 4,  action: 'eq_hi_a' },
      { type: 'cc',   channel: 0, number: 5,  action: 'eq_mid_a' },
      { type: 'cc',   channel: 0, number: 6,  action: 'eq_lo_a' },
      { type: 'cc',   channel: 1, number: 4,  action: 'eq_hi_b' },
      { type: 'cc',   channel: 1, number: 5,  action: 'eq_mid_b' },
      { type: 'cc',   channel: 1, number: 6,  action: 'eq_lo_b' },
      { type: 'cc',   channel: 0, number: 7,  action: 'filter_a' },
      { type: 'cc',   channel: 1, number: 7,  action: 'filter_b' },
      { type: 'note', channel: 0, number: 10, action: 'loop_a' },
      { type: 'note', channel: 1, number: 10, action: 'loop_b' },
      { type: 'cc',   channel: 0, number: 8,  action: 'jog_a' },
      { type: 'cc',   channel: 1, number: 8,  action: 'jog_b' },
      { type: 'note', channel: 0, number: 20, action: 'hotcue_1' },
      { type: 'note', channel: 0, number: 21, action: 'hotcue_2' },
      { type: 'note', channel: 0, number: 22, action: 'hotcue_3' },
      { type: 'note', channel: 0, number: 23, action: 'hotcue_4' },
      { type: 'cc',   channel: 0, number: 20, action: 'fx1' },
      { type: 'cc',   channel: 0, number: 21, action: 'fx2' },
      { type: 'cc',   channel: 0, number: 22, action: 'fx3' },
      { type: 'note', channel: 0, number: 30, action: 'load_a' },
      { type: 'note', channel: 1, number: 30, action: 'load_b' },
    ],
  },

  'Numark-Party-Mix': {
    name: 'Numark Party Mix',
    brand: 'Numark',
    channel: 0,
    mappings: [
      { type: 'note', channel: 0, number: 0,  action: 'play_a' },
      { type: 'note', channel: 0, number: 1,  action: 'cue_a' },
      { type: 'note', channel: 1, number: 0,  action: 'play_b' },
      { type: 'note', channel: 1, number: 1,  action: 'cue_b' },
      { type: 'cc',   channel: 0, number: 2,  action: 'volume_a' },
      { type: 'cc',   channel: 1, number: 2,  action: 'volume_b' },
      { type: 'cc',   channel: 0, number: 1,  action: 'crossfader' },
      { type: 'cc',   channel: 0, number: 3,  action: 'pitch_a' },
      { type: 'cc',   channel: 1, number: 3,  action: 'pitch_b' },
      { type: 'cc',   channel: 0, number: 8,  action: 'jog_a' },
      { type: 'cc',   channel: 1, number: 8,  action: 'jog_b' },
    ],
  },

  'Numark-DJ2GO2': {
    name: 'Numark DJ2GO2',
    brand: 'Numark',
    channel: 0,
    mappings: [
      { type: 'note', channel: 0, number: 0,  action: 'play_a' },
      { type: 'note', channel: 0, number: 1,  action: 'cue_a' },
      { type: 'note', channel: 1, number: 0,  action: 'play_b' },
      { type: 'note', channel: 1, number: 1,  action: 'cue_b' },
      { type: 'cc',   channel: 0, number: 2,  action: 'volume_a' },
      { type: 'cc',   channel: 1, number: 2,  action: 'volume_b' },
      { type: 'cc',   channel: 0, number: 1,  action: 'crossfader' },
      { type: 'cc',   channel: 0, number: 3,  action: 'pitch_a' },
      { type: 'cc',   channel: 1, number: 3,  action: 'pitch_b' },
      { type: 'cc',   channel: 0, number: 8,  action: 'jog_a' },
      { type: 'cc',   channel: 1, number: 8,  action: 'jog_b' },
      { type: 'note', channel: 0, number: 20, action: 'hotcue_1' },
      { type: 'note', channel: 0, number: 21, action: 'hotcue_2' },
    ],
  },

  // ── HERCULES ────────────────────────────────────────────────────────────────

  'Hercules-DJControl-Starlight': {
    name: 'Hercules DJControl Starlight',
    brand: 'Hercules',
    channel: 0,
    mappings: [
      { type: 'note', channel: 0, number: 0,  action: 'play_a' },
      { type: 'note', channel: 0, number: 1,  action: 'cue_a' },
      { type: 'note', channel: 1, number: 0,  action: 'play_b' },
      { type: 'note', channel: 1, number: 1,  action: 'cue_b' },
      { type: 'cc',   channel: 0, number: 2,  action: 'volume_a' },
      { type: 'cc',   channel: 1, number: 2,  action: 'volume_b' },
      { type: 'cc',   channel: 0, number: 1,  action: 'crossfader' },
      { type: 'cc',   channel: 0, number: 3,  action: 'pitch_a' },
      { type: 'cc',   channel: 1, number: 3,  action: 'pitch_b' },
      { type: 'cc',   channel: 0, number: 4,  action: 'eq_hi_a' },
      { type: 'cc',   channel: 0, number: 5,  action: 'eq_lo_a' },
      { type: 'cc',   channel: 1, number: 4,  action: 'eq_hi_b' },
      { type: 'cc',   channel: 1, number: 5,  action: 'eq_lo_b' },
      { type: 'cc',   channel: 0, number: 8,  action: 'jog_a' },
      { type: 'cc',   channel: 1, number: 8,  action: 'jog_b' },
      { type: 'note', channel: 0, number: 20, action: 'hotcue_1' },
      { type: 'note', channel: 0, number: 21, action: 'hotcue_2' },
      { type: 'note', channel: 0, number: 22, action: 'hotcue_3' },
      { type: 'note', channel: 0, number: 23, action: 'hotcue_4' },
    ],
  },

  'Hercules-DJControl-Inpulse-300': {
    name: 'Hercules DJControl Inpulse 300',
    brand: 'Hercules',
    channel: 0,
    mappings: [
      { type: 'note', channel: 0, number: 0,  action: 'play_a' },
      { type: 'note', channel: 0, number: 1,  action: 'cue_a' },
      { type: 'note', channel: 0, number: 2,  action: 'sync_a' },
      { type: 'note', channel: 1, number: 0,  action: 'play_b' },
      { type: 'note', channel: 1, number: 1,  action: 'cue_b' },
      { type: 'note', channel: 1, number: 2,  action: 'sync_b' },
      { type: 'cc',   channel: 0, number: 2,  action: 'volume_a' },
      { type: 'cc',   channel: 1, number: 2,  action: 'volume_b' },
      { type: 'cc',   channel: 0, number: 1,  action: 'crossfader' },
      { type: 'cc',   channel: 0, number: 3,  action: 'pitch_a' },
      { type: 'cc',   channel: 1, number: 3,  action: 'pitch_b' },
      { type: 'cc',   channel: 0, number: 4,  action: 'eq_hi_a' },
      { type: 'cc',   channel: 0, number: 5,  action: 'eq_mid_a' },
      { type: 'cc',   channel: 0, number: 6,  action: 'eq_lo_a' },
      { type: 'cc',   channel: 1, number: 4,  action: 'eq_hi_b' },
      { type: 'cc',   channel: 1, number: 5,  action: 'eq_mid_b' },
      { type: 'cc',   channel: 1, number: 6,  action: 'eq_lo_b' },
      { type: 'cc',   channel: 0, number: 7,  action: 'filter_a' },
      { type: 'cc',   channel: 1, number: 7,  action: 'filter_b' },
      { type: 'cc',   channel: 0, number: 8,  action: 'jog_a' },
      { type: 'cc',   channel: 1, number: 8,  action: 'jog_b' },
      { type: 'note', channel: 0, number: 10, action: 'loop_a' },
      { type: 'note', channel: 1, number: 10, action: 'loop_b' },
      { type: 'note', channel: 0, number: 20, action: 'hotcue_1' },
      { type: 'note', channel: 0, number: 21, action: 'hotcue_2' },
      { type: 'note', channel: 0, number: 22, action: 'hotcue_3' },
      { type: 'note', channel: 0, number: 23, action: 'hotcue_4' },
      { type: 'note', channel: 0, number: 30, action: 'load_a' },
      { type: 'note', channel: 1, number: 30, action: 'load_b' },
      { type: 'cc',   channel: 0, number: 20, action: 'fx1' },
      { type: 'cc',   channel: 0, number: 21, action: 'fx2' },
    ],
  },

  'Hercules-DJControl-Inpulse-500': {
    name: 'Hercules DJControl Inpulse 500',
    brand: 'Hercules',
    channel: 0,
    mappings: [
      { type: 'note', channel: 0, number: 0,  action: 'play_a' },
      { type: 'note', channel: 0, number: 1,  action: 'cue_a' },
      { type: 'note', channel: 0, number: 2,  action: 'sync_a' },
      { type: 'note', channel: 1, number: 0,  action: 'play_b' },
      { type: 'note', channel: 1, number: 1,  action: 'cue_b' },
      { type: 'note', channel: 1, number: 2,  action: 'sync_b' },
      { type: 'cc',   channel: 0, number: 2,  action: 'volume_a' },
      { type: 'cc',   channel: 1, number: 2,  action: 'volume_b' },
      { type: 'cc',   channel: 0, number: 1,  action: 'crossfader' },
      { type: 'cc',   channel: 0, number: 3,  action: 'pitch_a' },
      { type: 'cc',   channel: 1, number: 3,  action: 'pitch_b' },
      { type: 'cc',   channel: 0, number: 4,  action: 'eq_hi_a' },
      { type: 'cc',   channel: 0, number: 5,  action: 'eq_mid_a' },
      { type: 'cc',   channel: 0, number: 6,  action: 'eq_lo_a' },
      { type: 'cc',   channel: 1, number: 4,  action: 'eq_hi_b' },
      { type: 'cc',   channel: 1, number: 5,  action: 'eq_mid_b' },
      { type: 'cc',   channel: 1, number: 6,  action: 'eq_lo_b' },
      { type: 'cc',   channel: 0, number: 7,  action: 'filter_a' },
      { type: 'cc',   channel: 1, number: 7,  action: 'filter_b' },
      { type: 'cc',   channel: 0, number: 8,  action: 'jog_a' },
      { type: 'cc',   channel: 1, number: 8,  action: 'jog_b' },
      { type: 'note', channel: 0, number: 10, action: 'loop_a' },
      { type: 'note', channel: 1, number: 10, action: 'loop_b' },
      { type: 'note', channel: 0, number: 20, action: 'hotcue_1' },
      { type: 'note', channel: 0, number: 21, action: 'hotcue_2' },
      { type: 'note', channel: 0, number: 22, action: 'hotcue_3' },
      { type: 'note', channel: 0, number: 23, action: 'hotcue_4' },
      { type: 'note', channel: 0, number: 24, action: 'hotcue_5' },
      { type: 'note', channel: 0, number: 25, action: 'hotcue_6' },
      { type: 'note', channel: 0, number: 26, action: 'hotcue_7' },
      { type: 'note', channel: 0, number: 27, action: 'hotcue_8' },
      { type: 'cc',   channel: 0, number: 20, action: 'fx1' },
      { type: 'cc',   channel: 0, number: 21, action: 'fx2' },
      { type: 'cc',   channel: 0, number: 22, action: 'fx3' },
    ],
  },

  // ── NATIVE INSTRUMENTS ──────────────────────────────────────────────────────

  'NI-Traktor-Kontrol-S2': {
    name: 'Native Instruments Traktor Kontrol S2',
    brand: 'Native Instruments',
    channel: 0,
    mappings: [
      { type: 'note', channel: 0, number: 0,  action: 'play_a' },
      { type: 'note', channel: 0, number: 1,  action: 'cue_a' },
      { type: 'note', channel: 0, number: 2,  action: 'sync_a' },
      { type: 'note', channel: 1, number: 0,  action: 'play_b' },
      { type: 'note', channel: 1, number: 1,  action: 'cue_b' },
      { type: 'note', channel: 1, number: 2,  action: 'sync_b' },
      { type: 'cc',   channel: 0, number: 2,  action: 'volume_a' },
      { type: 'cc',   channel: 1, number: 2,  action: 'volume_b' },
      { type: 'cc',   channel: 0, number: 1,  action: 'crossfader' },
      { type: 'cc',   channel: 0, number: 3,  action: 'pitch_a' },
      { type: 'cc',   channel: 1, number: 3,  action: 'pitch_b' },
      { type: 'cc',   channel: 0, number: 4,  action: 'eq_hi_a' },
      { type: 'cc',   channel: 0, number: 5,  action: 'eq_mid_a' },
      { type: 'cc',   channel: 0, number: 6,  action: 'eq_lo_a' },
      { type: 'cc',   channel: 1, number: 4,  action: 'eq_hi_b' },
      { type: 'cc',   channel: 1, number: 5,  action: 'eq_mid_b' },
      { type: 'cc',   channel: 1, number: 6,  action: 'eq_lo_b' },
      { type: 'cc',   channel: 0, number: 7,  action: 'filter_a' },
      { type: 'cc',   channel: 1, number: 7,  action: 'filter_b' },
      { type: 'cc',   channel: 0, number: 8,  action: 'jog_a' },
      { type: 'cc',   channel: 1, number: 8,  action: 'jog_b' },
      { type: 'note', channel: 0, number: 10, action: 'loop_a' },
      { type: 'note', channel: 1, number: 10, action: 'loop_b' },
      { type: 'note', channel: 0, number: 20, action: 'hotcue_1' },
      { type: 'note', channel: 0, number: 21, action: 'hotcue_2' },
      { type: 'note', channel: 0, number: 22, action: 'hotcue_3' },
      { type: 'note', channel: 0, number: 23, action: 'hotcue_4' },
      { type: 'cc',   channel: 0, number: 20, action: 'fx1' },
      { type: 'cc',   channel: 0, number: 21, action: 'fx2' },
      { type: 'cc',   channel: 0, number: 22, action: 'fx3' },
    ],
  },

  'NI-Traktor-Kontrol-S4': {
    name: 'Native Instruments Traktor Kontrol S4',
    brand: 'Native Instruments',
    channel: 0,
    mappings: [
      { type: 'note', channel: 0, number: 0,  action: 'play_a' },
      { type: 'note', channel: 0, number: 1,  action: 'cue_a' },
      { type: 'note', channel: 0, number: 2,  action: 'sync_a' },
      { type: 'note', channel: 1, number: 0,  action: 'play_b' },
      { type: 'note', channel: 1, number: 1,  action: 'cue_b' },
      { type: 'note', channel: 1, number: 2,  action: 'sync_b' },
      { type: 'cc',   channel: 0, number: 2,  action: 'volume_a' },
      { type: 'cc',   channel: 1, number: 2,  action: 'volume_b' },
      { type: 'cc',   channel: 0, number: 1,  action: 'crossfader' },
      { type: 'cc',   channel: 0, number: 3,  action: 'pitch_a' },
      { type: 'cc',   channel: 1, number: 3,  action: 'pitch_b' },
      { type: 'cc',   channel: 0, number: 4,  action: 'eq_hi_a' },
      { type: 'cc',   channel: 0, number: 5,  action: 'eq_mid_a' },
      { type: 'cc',   channel: 0, number: 6,  action: 'eq_lo_a' },
      { type: 'cc',   channel: 1, number: 4,  action: 'eq_hi_b' },
      { type: 'cc',   channel: 1, number: 5,  action: 'eq_mid_b' },
      { type: 'cc',   channel: 1, number: 6,  action: 'eq_lo_b' },
      { type: 'cc',   channel: 0, number: 7,  action: 'filter_a' },
      { type: 'cc',   channel: 1, number: 7,  action: 'filter_b' },
      { type: 'cc',   channel: 0, number: 8,  action: 'jog_a' },
      { type: 'cc',   channel: 1, number: 8,  action: 'jog_b' },
      { type: 'note', channel: 0, number: 10, action: 'loop_a' },
      { type: 'note', channel: 1, number: 10, action: 'loop_b' },
      { type: 'note', channel: 0, number: 20, action: 'hotcue_1' },
      { type: 'note', channel: 0, number: 21, action: 'hotcue_2' },
      { type: 'note', channel: 0, number: 22, action: 'hotcue_3' },
      { type: 'note', channel: 0, number: 23, action: 'hotcue_4' },
      { type: 'note', channel: 0, number: 24, action: 'hotcue_5' },
      { type: 'note', channel: 0, number: 25, action: 'hotcue_6' },
      { type: 'note', channel: 0, number: 26, action: 'hotcue_7' },
      { type: 'note', channel: 0, number: 27, action: 'hotcue_8' },
      { type: 'cc',   channel: 0, number: 20, action: 'fx1' },
      { type: 'cc',   channel: 0, number: 21, action: 'fx2' },
      { type: 'cc',   channel: 0, number: 22, action: 'fx3' },
    ],
  },

  // ── RELOOP ──────────────────────────────────────────────────────────────────

  'Reloop-Mixtour': {
    name: 'Reloop Mixtour',
    brand: 'Reloop',
    channel: 0,
    mappings: [
      { type: 'note', channel: 0, number: 0,  action: 'play_a' },
      { type: 'note', channel: 0, number: 1,  action: 'cue_a' },
      { type: 'note', channel: 1, number: 0,  action: 'play_b' },
      { type: 'note', channel: 1, number: 1,  action: 'cue_b' },
      { type: 'cc',   channel: 0, number: 2,  action: 'volume_a' },
      { type: 'cc',   channel: 1, number: 2,  action: 'volume_b' },
      { type: 'cc',   channel: 0, number: 1,  action: 'crossfader' },
      { type: 'cc',   channel: 0, number: 3,  action: 'pitch_a' },
      { type: 'cc',   channel: 1, number: 3,  action: 'pitch_b' },
      { type: 'cc',   channel: 0, number: 8,  action: 'jog_a' },
      { type: 'cc',   channel: 1, number: 8,  action: 'jog_b' },
    ],
  },

  'Reloop-Ready': {
    name: 'Reloop Ready',
    brand: 'Reloop',
    channel: 0,
    mappings: [
      { type: 'note', channel: 0, number: 0,  action: 'play_a' },
      { type: 'note', channel: 0, number: 1,  action: 'cue_a' },
      { type: 'note', channel: 0, number: 2,  action: 'sync_a' },
      { type: 'note', channel: 1, number: 0,  action: 'play_b' },
      { type: 'note', channel: 1, number: 1,  action: 'cue_b' },
      { type: 'note', channel: 1, number: 2,  action: 'sync_b' },
      { type: 'cc',   channel: 0, number: 2,  action: 'volume_a' },
      { type: 'cc',   channel: 1, number: 2,  action: 'volume_b' },
      { type: 'cc',   channel: 0, number: 1,  action: 'crossfader' },
      { type: 'cc',   channel: 0, number: 3,  action: 'pitch_a' },
      { type: 'cc',   channel: 1, number: 3,  action: 'pitch_b' },
      { type: 'cc',   channel: 0, number: 4,  action: 'eq_hi_a' },
      { type: 'cc',   channel: 0, number: 5,  action: 'eq_mid_a' },
      { type: 'cc',   channel: 0, number: 6,  action: 'eq_lo_a' },
      { type: 'cc',   channel: 1, number: 4,  action: 'eq_hi_b' },
      { type: 'cc',   channel: 1, number: 5,  action: 'eq_mid_b' },
      { type: 'cc',   channel: 1, number: 6,  action: 'eq_lo_b' },
      { type: 'cc',   channel: 0, number: 8,  action: 'jog_a' },
      { type: 'cc',   channel: 1, number: 8,  action: 'jog_b' },
      { type: 'note', channel: 0, number: 20, action: 'hotcue_1' },
      { type: 'note', channel: 0, number: 21, action: 'hotcue_2' },
      { type: 'note', channel: 0, number: 22, action: 'hotcue_3' },
      { type: 'note', channel: 0, number: 23, action: 'hotcue_4' },
    ],
  },

  // ── DENON ───────────────────────────────────────────────────────────────────

  'Denon-MC4000': {
    name: 'Denon MC4000',
    brand: 'Denon',
    channel: 0,
    mappings: [
      { type: 'note', channel: 0, number: 0,  action: 'play_a' },
      { type: 'note', channel: 0, number: 1,  action: 'cue_a' },
      { type: 'note', channel: 0, number: 2,  action: 'sync_a' },
      { type: 'note', channel: 1, number: 0,  action: 'play_b' },
      { type: 'note', channel: 1, number: 1,  action: 'cue_b' },
      { type: 'note', channel: 1, number: 2,  action: 'sync_b' },
      { type: 'cc',   channel: 0, number: 2,  action: 'volume_a' },
      { type: 'cc',   channel: 1, number: 2,  action: 'volume_b' },
      { type: 'cc',   channel: 0, number: 1,  action: 'crossfader' },
      { type: 'cc',   channel: 0, number: 3,  action: 'pitch_a' },
      { type: 'cc',   channel: 1, number: 3,  action: 'pitch_b' },
      { type: 'cc',   channel: 0, number: 4,  action: 'eq_hi_a' },
      { type: 'cc',   channel: 0, number: 5,  action: 'eq_mid_a' },
      { type: 'cc',   channel: 0, number: 6,  action: 'eq_lo_a' },
      { type: 'cc',   channel: 1, number: 4,  action: 'eq_hi_b' },
      { type: 'cc',   channel: 1, number: 5,  action: 'eq_mid_b' },
      { type: 'cc',   channel: 1, number: 6,  action: 'eq_lo_b' },
      { type: 'cc',   channel: 0, number: 7,  action: 'filter_a' },
      { type: 'cc',   channel: 1, number: 7,  action: 'filter_b' },
      { type: 'cc',   channel: 0, number: 8,  action: 'jog_a' },
      { type: 'cc',   channel: 1, number: 8,  action: 'jog_b' },
      { type: 'note', channel: 0, number: 10, action: 'loop_a' },
      { type: 'note', channel: 1, number: 10, action: 'loop_b' },
      { type: 'note', channel: 0, number: 20, action: 'hotcue_1' },
      { type: 'note', channel: 0, number: 21, action: 'hotcue_2' },
      { type: 'note', channel: 0, number: 22, action: 'hotcue_3' },
      { type: 'note', channel: 0, number: 23, action: 'hotcue_4' },
      { type: 'cc',   channel: 0, number: 20, action: 'fx1' },
      { type: 'cc',   channel: 0, number: 21, action: 'fx2' },
    ],
  },

  // ── BEHRINGER ───────────────────────────────────────────────────────────────

  'Behringer-CMD-Studio-4a': {
    name: 'Behringer CMD Studio 4a',
    brand: 'Behringer',
    channel: 0,
    mappings: [
      { type: 'note', channel: 0, number: 0,  action: 'play_a' },
      { type: 'note', channel: 0, number: 1,  action: 'cue_a' },
      { type: 'note', channel: 0, number: 2,  action: 'sync_a' },
      { type: 'note', channel: 1, number: 0,  action: 'play_b' },
      { type: 'note', channel: 1, number: 1,  action: 'cue_b' },
      { type: 'note', channel: 1, number: 2,  action: 'sync_b' },
      { type: 'cc',   channel: 0, number: 2,  action: 'volume_a' },
      { type: 'cc',   channel: 1, number: 2,  action: 'volume_b' },
      { type: 'cc',   channel: 0, number: 1,  action: 'crossfader' },
      { type: 'cc',   channel: 0, number: 3,  action: 'pitch_a' },
      { type: 'cc',   channel: 1, number: 3,  action: 'pitch_b' },
      { type: 'cc',   channel: 0, number: 4,  action: 'eq_hi_a' },
      { type: 'cc',   channel: 0, number: 5,  action: 'eq_mid_a' },
      { type: 'cc',   channel: 0, number: 6,  action: 'eq_lo_a' },
      { type: 'cc',   channel: 1, number: 4,  action: 'eq_hi_b' },
      { type: 'cc',   channel: 1, number: 5,  action: 'eq_mid_b' },
      { type: 'cc',   channel: 1, number: 6,  action: 'eq_lo_b' },
      { type: 'cc',   channel: 0, number: 8,  action: 'jog_a' },
      { type: 'cc',   channel: 1, number: 8,  action: 'jog_b' },
      { type: 'note', channel: 0, number: 20, action: 'hotcue_1' },
      { type: 'note', channel: 0, number: 21, action: 'hotcue_2' },
      { type: 'note', channel: 0, number: 22, action: 'hotcue_3' },
      { type: 'note', channel: 0, number: 23, action: 'hotcue_4' },
    ],
  },

  // ── GENERIC MIDI ────────────────────────────────────────────────────────────
  // Works with any controller using standard MIDI CC assignments

  'Generic-MIDI': {
    name: 'Generic MIDI Controller',
    brand: 'Generic',
    channel: 0,
    mappings: [
      { type: 'note', channel: 0, number: 0,  action: 'play_a' },
      { type: 'note', channel: 0, number: 1,  action: 'cue_a' },
      { type: 'note', channel: 0, number: 2,  action: 'sync_a' },
      { type: 'note', channel: 1, number: 0,  action: 'play_b' },
      { type: 'note', channel: 1, number: 1,  action: 'cue_b' },
      { type: 'note', channel: 1, number: 2,  action: 'sync_b' },
      { type: 'cc',   channel: 0, number: 7,  action: 'volume_a' },
      { type: 'cc',   channel: 1, number: 7,  action: 'volume_b' },
      { type: 'cc',   channel: 0, number: 8,  action: 'crossfader' },
      { type: 'cc',   channel: 0, number: 1,  action: 'pitch_a' },
      { type: 'cc',   channel: 1, number: 1,  action: 'pitch_b' },
      { type: 'cc',   channel: 0, number: 74, action: 'eq_hi_a' },
      { type: 'cc',   channel: 0, number: 71, action: 'eq_mid_a' },
      { type: 'cc',   channel: 0, number: 75, action: 'eq_lo_a' },
      { type: 'cc',   channel: 1, number: 74, action: 'eq_hi_b' },
      { type: 'cc',   channel: 1, number: 71, action: 'eq_mid_b' },
      { type: 'cc',   channel: 1, number: 75, action: 'eq_lo_b' },
      { type: 'cc',   channel: 0, number: 10, action: 'jog_a' },
      { type: 'cc',   channel: 1, number: 10, action: 'jog_b' },
      { type: 'note', channel: 0, number: 36, action: 'hotcue_1' },
      { type: 'note', channel: 0, number: 37, action: 'hotcue_2' },
      { type: 'note', channel: 0, number: 38, action: 'hotcue_3' },
      { type: 'note', channel: 0, number: 39, action: 'hotcue_4' },
    ],
  },
};

// ── MIDI Learn System ─────────────────────────────────────────────────────────
// Lets users map ANY controller by clicking a button and moving a knob
export class MIDILearnManager {
  constructor() {
    this.learning = false;
    this.pendingAction = null;
    this.customMappings = {};
    this.listeners = [];
  }

  startLearn(action) {
    this.learning = true;
    this.pendingAction = action;
  }

  stopLearn() {
    this.learning = false;
    this.pendingAction = null;
  }

  handleMessage(status, data1, data2) {
    if (!this.learning || !this.pendingAction) return false;
    const type = (status & 0xF0) === 0xB0 ? 'cc' : 'note';
    const channel = status & 0x0F;
    this.customMappings[this.pendingAction] = { type, channel, number: data1 };
    this.stopLearn();
    return true;
  }

  getMapping(action) {
    return this.customMappings[action] || null;
  }

  exportMappings() {
    return JSON.stringify(this.customMappings);
  }

  importMappings(json) {
    try {
      this.customMappings = JSON.parse(json);
      return true;
    } catch { return false; }
  }
}

// ── Controller Detection ──────────────────────────────────────────────────────
export function detectController(deviceName) {
  const name = deviceName.toLowerCase();
  if (name.includes('ddj-200'))  return 'DDJ-200';
  if (name.includes('ddj-400'))  return 'DDJ-400';
  if (name.includes('ddj-sb3'))  return 'DDJ-SB3';
  if (name.includes('ddj-rev1')) return 'DDJ-REV1';
  if (name.includes('mixtrack pro fx')) return 'Numark-Mixtrack-Pro-FX';
  if (name.includes('party mix')) return 'Numark-Party-Mix';
  if (name.includes('dj2go'))    return 'Numark-DJ2GO2';
  if (name.includes('starlight')) return 'Hercules-DJControl-Starlight';
  if (name.includes('inpulse 300')) return 'Hercules-DJControl-Inpulse-300';
  if (name.includes('inpulse 500')) return 'Hercules-DJControl-Inpulse-500';
  if (name.includes('kontrol s2')) return 'NI-Traktor-Kontrol-S2';
  if (name.includes('kontrol s4')) return 'NI-Traktor-Kontrol-S4';
  if (name.includes('mixtour'))  return 'Reloop-Mixtour';
  if (name.includes('reloop ready')) return 'Reloop-Ready';
  if (name.includes('mc4000'))   return 'Denon-MC4000';
  if (name.includes('cmd studio 4a')) return 'Behringer-CMD-Studio-4a';
  return 'Generic-MIDI';
}

// ── Action Executor ───────────────────────────────────────────────────────────
export function executeAction(action, value, djState, setDJState) {
  const v = value / 127;
  switch(action) {
    case 'play_a':    if (value > 0) setDJState(s => ({...s, playingA: !s.playingA})); break;
    case 'play_b':    if (value > 0) setDJState(s => ({...s, playingB: !s.playingB})); break;
    case 'cue_a':     if (value > 0) setDJState(s => ({...s, cueA: true})); break;
    case 'cue_b':     if (value > 0) setDJState(s => ({...s, cueB: true})); break;
    case 'sync_a':    if (value > 0) setDJState(s => ({...s, syncA: true})); break;
    case 'sync_b':    if (value > 0) setDJState(s => ({...s, syncB: true})); break;
    case 'loop_a':    if (value > 0) setDJState(s => ({...s, loopA: !s.loopA})); break;
    case 'loop_b':    if (value > 0) setDJState(s => ({...s, loopB: !s.loopB})); break;
    case 'volume_a':  setDJState(s => ({...s, volumeA: v})); break;
    case 'volume_b':  setDJState(s => ({...s, volumeB: v})); break;
    case 'crossfader':setDJState(s => ({...s, crossfader: v})); break;
    case 'pitch_a':   setDJState(s => ({...s, pitchA: (v - 0.5) * 20})); break;
    case 'pitch_b':   setDJState(s => ({...s, pitchB: (v - 0.5) * 20})); break;
    case 'eq_hi_a':   setDJState(s => ({...s, eqHiA: v * 2})); break;
    case 'eq_mid_a':  setDJState(s => ({...s, eqMidA: v * 2})); break;
    case 'eq_lo_a':   setDJState(s => ({...s, eqLoA: v * 2})); break;
    case 'eq_hi_b':   setDJState(s => ({...s, eqHiB: v * 2})); break;
    case 'eq_mid_b':  setDJState(s => ({...s, eqMidB: v * 2})); break;
    case 'eq_lo_b':   setDJState(s => ({...s, eqLoB: v * 2})); break;
    case 'filter_a':  setDJState(s => ({...s, filterA: v})); break;
    case 'filter_b':  setDJState(s => ({...s, filterB: v})); break;
    case 'jog_a':     setDJState(s => ({...s, jogA: value > 64 ? 1 : -1})); break;
    case 'jog_b':     setDJState(s => ({...s, jogB: value > 64 ? 1 : -1})); break;
    case 'fx1':       setDJState(s => ({...s, fx1: v})); break;
    case 'fx2':       setDJState(s => ({...s, fx2: v})); break;
    case 'fx3':       setDJState(s => ({...s, fx3: v})); break;
    case 'load_a':    if (value > 0) setDJState(s => ({...s, loadA: true})); break;
    case 'load_b':    if (value > 0) setDJState(s => ({...s, loadB: true})); break;
    case 'hotcue_1':  if (value > 0) setDJState(s => ({...s, hotcue: 1})); break;
    case 'hotcue_2':  if (value > 0) setDJState(s => ({...s, hotcue: 2})); break;
    case 'hotcue_3':  if (value > 0) setDJState(s => ({...s, hotcue: 3})); break;
    case 'hotcue_4':  if (value > 0) setDJState(s => ({...s, hotcue: 4})); break;
    case 'hotcue_5':  if (value > 0) setDJState(s => ({...s, hotcue: 5})); break;
    case 'hotcue_6':  if (value > 0) setDJState(s => ({...s, hotcue: 6})); break;
    case 'hotcue_7':  if (value > 0) setDJState(s => ({...s, hotcue: 7})); break;
    case 'hotcue_8':  if (value > 0) setDJState(s => ({...s, hotcue: 8})); break;
    default: break;
  }
}

export default { DJ_CONTROLLER_MAPPINGS, MIDILearnManager, detectController, executeAction };
