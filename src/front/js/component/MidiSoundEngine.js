// =============================================================================
// MidiSoundEngine.js — General MIDI Web Audio Synthesizer
// =============================================================================
// Location: src/front/js/component/MidiSoundEngine.js
// Purpose: Provides realistic instrument sounds via Web Audio synthesis,
//          compatible with General MIDI program numbers. Used by VirtualPiano,
//          Beat Maker, and any component needing instrument playback.
// Features:
//   - 128 GM instrument programs (grouped by family)
//   - 16 MIDI channels (channel 10 = drums)
//   - Velocity sensitivity with dynamic filtering
//   - Pitch bend & modulation wheel
//   - Polyphonic with voice stealing
//   - Per-channel volume, pan, reverb send
//   - Drum kit with layered samples (synthesized)
// =============================================================================

// ── GM Instrument Families ──
// Each defines oscillator stack + ADSR + filter for that group
const GM_FAMILIES = {
  // 0-7: Piano
  piano: {
    programs: [0,1,2,3,4,5,6,7],
    names: ['Acoustic Grand','Bright Acoustic','Electric Grand','Honky-Tonk','Electric Piano 1','Electric Piano 2','Harpsichord','Clavinet'],
    oscillators: [
      { type: 'triangle', detune: 0, gain: 0.5 },
      { type: 'sine', detune: 1, gain: 0.3 },
      { type: 'sawtooth', detune: -0.5, gain: 0.04 },
    ],
    envelope: { attack: 0.003, decay: 0.4, sustain: 0.15, release: 0.8 },
    filter: { freq: 5500, q: 1, envAmount: 2000, envDecay: 0.3 },
  },
  // 8-15: Chromatic Percussion
  chromaticPerc: {
    programs: [8,9,10,11,12,13,14,15],
    names: ['Celesta','Glockenspiel','Music Box','Vibraphone','Marimba','Xylophone','Tubular Bells','Dulcimer'],
    oscillators: [
      { type: 'sine', detune: 0, gain: 0.6 },
      { type: 'triangle', detune: 0.3, gain: 0.2 },
    ],
    envelope: { attack: 0.001, decay: 0.6, sustain: 0.05, release: 1.0 },
    filter: { freq: 8000, q: 0.5, envAmount: 3000, envDecay: 0.1 },
  },
  // 16-23: Organ
  organ: {
    programs: [16,17,18,19,20,21,22,23],
    names: ['Drawbar Organ','Percussive Organ','Rock Organ','Church Organ','Reed Organ','Accordion','Harmonica','Tango Accordion'],
    oscillators: [
      { type: 'sine', detune: 0, gain: 0.35 },
      { type: 'sine', detune: 1200, gain: 0.18 },
      { type: 'sine', detune: 1902, gain: 0.08 },
      { type: 'sine', detune: 2400, gain: 0.04 },
    ],
    envelope: { attack: 0.008, decay: 0.1, sustain: 0.85, release: 0.12 },
    filter: { freq: 7000, q: 0.5, envAmount: 0, envDecay: 0 },
  },
  // 24-31: Guitar
  guitar: {
    programs: [24,25,26,27,28,29,30,31],
    names: ['Nylon Guitar','Steel Guitar','Jazz Guitar','Clean Guitar','Muted Guitar','Overdriven Guitar','Distortion Guitar','Guitar Harmonics'],
    oscillators: [
      { type: 'sawtooth', detune: 0, gain: 0.2 },
      { type: 'triangle', detune: 0.5, gain: 0.25 },
      { type: 'square', detune: -0.3, gain: 0.05 },
    ],
    envelope: { attack: 0.002, decay: 0.3, sustain: 0.2, release: 0.5 },
    filter: { freq: 3500, q: 2, envAmount: 2500, envDecay: 0.15 },
  },
  // 32-39: Bass
  bass: {
    programs: [32,33,34,35,36,37,38,39],
    names: ['Acoustic Bass','Finger Bass','Pick Bass','Fretless Bass','Slap Bass 1','Slap Bass 2','Synth Bass 1','Synth Bass 2'],
    oscillators: [
      { type: 'sawtooth', detune: 0, gain: 0.35 },
      { type: 'square', detune: -1200, gain: 0.25 },
    ],
    envelope: { attack: 0.003, decay: 0.2, sustain: 0.35, release: 0.2 },
    filter: { freq: 1500, q: 3, envAmount: 1500, envDecay: 0.1 },
  },
  // 40-47: Strings
  strings: {
    programs: [40,41,42,43,44,45,46,47],
    names: ['Violin','Viola','Cello','Contrabass','Tremolo Strings','Pizzicato Strings','Orchestral Harp','Timpani'],
    oscillators: [
      { type: 'sawtooth', detune: 0, gain: 0.1 },
      { type: 'sawtooth', detune: 3, gain: 0.1 },
      { type: 'sawtooth', detune: -3, gain: 0.1 },
      { type: 'sawtooth', detune: 7, gain: 0.08 },
    ],
    envelope: { attack: 0.25, decay: 0.3, sustain: 0.75, release: 0.8 },
    filter: { freq: 4500, q: 1, envAmount: 1000, envDecay: 0.5 },
  },
  // 48-55: Ensemble
  ensemble: {
    programs: [48,49,50,51,52,53,54,55],
    names: ['String Ensemble 1','String Ensemble 2','Synth Strings 1','Synth Strings 2','Choir Aahs','Voice Oohs','Synth Voice','Orchestra Hit'],
    oscillators: [
      { type: 'sawtooth', detune: 0, gain: 0.08 },
      { type: 'sawtooth', detune: 5, gain: 0.08 },
      { type: 'sawtooth', detune: -5, gain: 0.08 },
      { type: 'triangle', detune: 2, gain: 0.1 },
    ],
    envelope: { attack: 0.35, decay: 0.4, sustain: 0.7, release: 1.0 },
    filter: { freq: 3500, q: 1.5, envAmount: 800, envDecay: 0.6 },
  },
  // 56-63: Brass
  brass: {
    programs: [56,57,58,59,60,61,62,63],
    names: ['Trumpet','Trombone','Tuba','Muted Trumpet','French Horn','Brass Section','Synth Brass 1','Synth Brass 2'],
    oscillators: [
      { type: 'sawtooth', detune: 0, gain: 0.25 },
      { type: 'square', detune: 1, gain: 0.1 },
    ],
    envelope: { attack: 0.04, decay: 0.15, sustain: 0.7, release: 0.2 },
    filter: { freq: 2500, q: 3, envAmount: 3000, envDecay: 0.08 },
  },
  // 64-71: Reed
  reed: {
    programs: [64,65,66,67,68,69,70,71],
    names: ['Soprano Sax','Alto Sax','Tenor Sax','Baritone Sax','Oboe','English Horn','Bassoon','Clarinet'],
    oscillators: [
      { type: 'square', detune: 0, gain: 0.2 },
      { type: 'sawtooth', detune: 0.5, gain: 0.15 },
    ],
    envelope: { attack: 0.02, decay: 0.1, sustain: 0.7, release: 0.15 },
    filter: { freq: 3000, q: 4, envAmount: 2000, envDecay: 0.1 },
  },
  // 72-79: Pipe
  pipe: {
    programs: [72,73,74,75,76,77,78,79],
    names: ['Piccolo','Flute','Recorder','Pan Flute','Blown Bottle','Shakuhachi','Whistle','Ocarina'],
    oscillators: [
      { type: 'sine', detune: 0, gain: 0.45 },
      { type: 'triangle', detune: 1, gain: 0.15 },
    ],
    envelope: { attack: 0.03, decay: 0.1, sustain: 0.75, release: 0.15 },
    filter: { freq: 6000, q: 1, envAmount: 500, envDecay: 0.2 },
  },
  // 80-87: Synth Lead
  synthLead: {
    programs: [80,81,82,83,84,85,86,87],
    names: ['Square Lead','Sawtooth Lead','Calliope','Chiff','Charang','Voice Lead','Fifths Lead','Bass + Lead'],
    oscillators: [
      { type: 'sawtooth', detune: 0, gain: 0.25 },
      { type: 'sawtooth', detune: 7, gain: 0.25 },
    ],
    envelope: { attack: 0.01, decay: 0.15, sustain: 0.65, release: 0.25 },
    filter: { freq: 3500, q: 4, envAmount: 2000, envDecay: 0.15 },
  },
  // 88-95: Synth Pad
  synthPad: {
    programs: [88,89,90,91,92,93,94,95],
    names: ['New Age Pad','Warm Pad','Polysynth','Choir Pad','Bowed Pad','Metallic Pad','Halo Pad','Sweep Pad'],
    oscillators: [
      { type: 'sawtooth', detune: 0, gain: 0.12 },
      { type: 'sawtooth', detune: 5, gain: 0.12 },
      { type: 'triangle', detune: -5, gain: 0.15 },
    ],
    envelope: { attack: 0.4, decay: 0.5, sustain: 0.7, release: 1.5 },
    filter: { freq: 2500, q: 2, envAmount: 1000, envDecay: 0.8 },
  },
  // 96-103: Synth Effects
  synthFx: {
    programs: [96,97,98,99,100,101,102,103],
    names: ['Rain','Soundtrack','Crystal','Atmosphere','Brightness','Goblins','Echoes','Sci-Fi'],
    oscillators: [
      { type: 'sine', detune: 0, gain: 0.3 },
      { type: 'sawtooth', detune: 7, gain: 0.1 },
    ],
    envelope: { attack: 0.2, decay: 0.6, sustain: 0.4, release: 2.0 },
    filter: { freq: 4000, q: 2, envAmount: 3000, envDecay: 1.0 },
  },
  // 104-111: Ethnic
  ethnic: {
    programs: [104,105,106,107,108,109,110,111],
    names: ['Sitar','Banjo','Shamisen','Koto','Kalimba','Bag Pipe','Fiddle','Shanai'],
    oscillators: [
      { type: 'sawtooth', detune: 0, gain: 0.2 },
      { type: 'triangle', detune: 2, gain: 0.15 },
    ],
    envelope: { attack: 0.005, decay: 0.25, sustain: 0.25, release: 0.5 },
    filter: { freq: 4000, q: 3, envAmount: 2000, envDecay: 0.2 },
  },
  // 112-119: Percussive
  percussive: {
    programs: [112,113,114,115,116,117,118,119],
    names: ['Tinkle Bell','Agogo','Steel Drums','Woodblock','Taiko Drum','Melodic Tom','Synth Drum','Reverse Cymbal'],
    oscillators: [
      { type: 'triangle', detune: 0, gain: 0.5 },
      { type: 'sine', detune: 0, gain: 0.2 },
    ],
    envelope: { attack: 0.001, decay: 0.2, sustain: 0.05, release: 0.4 },
    filter: { freq: 6000, q: 1, envAmount: 4000, envDecay: 0.05 },
  },
  // 120-127: Sound Effects
  soundFx: {
    programs: [120,121,122,123,124,125,126,127],
    names: ['Guitar Fret Noise','Breath Noise','Seashore','Bird Tweet','Telephone','Helicopter','Applause','Gunshot'],
    oscillators: [
      { type: 'sawtooth', detune: 0, gain: 0.15 },
    ],
    envelope: { attack: 0.01, decay: 0.5, sustain: 0.1, release: 1.0 },
    filter: { freq: 3000, q: 1, envAmount: 2000, envDecay: 0.3 },
  },
};

// Build lookup: program number → family key
const PROGRAM_TO_FAMILY = {};
Object.entries(GM_FAMILIES).forEach(([familyKey, family]) => {
  family.programs.forEach(p => { PROGRAM_TO_FAMILY[p] = familyKey; });
});

// ── GM Drum Map (Channel 10) ──
// MIDI note → drum sound synthesis parameters
const DRUM_MAP = {
  35: { name: 'Acoustic Bass Drum', type: 'kick',    freq: 55,   decay: 0.4,  noiseDecay: 0.05, noiseGain: 0.15 },
  36: { name: 'Bass Drum 1',        type: 'kick',    freq: 60,   decay: 0.35, noiseDecay: 0.04, noiseGain: 0.2 },
  37: { name: 'Side Stick',         type: 'click',   freq: 800,  decay: 0.03, noiseDecay: 0.02, noiseGain: 0.6 },
  38: { name: 'Acoustic Snare',     type: 'snare',   freq: 180,  decay: 0.12, noiseDecay: 0.15, noiseGain: 0.5 },
  39: { name: 'Hand Clap',          type: 'clap',    freq: 1000, decay: 0.01, noiseDecay: 0.12, noiseGain: 0.8 },
  40: { name: 'Electric Snare',     type: 'snare',   freq: 200,  decay: 0.1,  noiseDecay: 0.18, noiseGain: 0.55 },
  41: { name: 'Low Floor Tom',      type: 'tom',     freq: 80,   decay: 0.25, noiseDecay: 0.04, noiseGain: 0.15 },
  42: { name: 'Closed Hi-Hat',      type: 'hihat',   freq: 6000, decay: 0.02, noiseDecay: 0.04, noiseGain: 0.7 },
  43: { name: 'High Floor Tom',     type: 'tom',     freq: 100,  decay: 0.2,  noiseDecay: 0.04, noiseGain: 0.15 },
  44: { name: 'Pedal Hi-Hat',       type: 'hihat',   freq: 5000, decay: 0.01, noiseDecay: 0.05, noiseGain: 0.6 },
  45: { name: 'Low Tom',            type: 'tom',     freq: 120,  decay: 0.22, noiseDecay: 0.04, noiseGain: 0.15 },
  46: { name: 'Open Hi-Hat',        type: 'hihat',   freq: 6000, decay: 0.02, noiseDecay: 0.3,  noiseGain: 0.65 },
  47: { name: 'Low-Mid Tom',        type: 'tom',     freq: 140,  decay: 0.2,  noiseDecay: 0.04, noiseGain: 0.15 },
  48: { name: 'Hi-Mid Tom',         type: 'tom',     freq: 180,  decay: 0.18, noiseDecay: 0.03, noiseGain: 0.12 },
  49: { name: 'Crash Cymbal 1',     type: 'cymbal',  freq: 5500, decay: 0.01, noiseDecay: 1.2,  noiseGain: 0.5 },
  50: { name: 'High Tom',           type: 'tom',     freq: 220,  decay: 0.15, noiseDecay: 0.03, noiseGain: 0.12 },
  51: { name: 'Ride Cymbal 1',      type: 'cymbal',  freq: 7000, decay: 0.01, noiseDecay: 0.8,  noiseGain: 0.35 },
  52: { name: 'Chinese Cymbal',     type: 'cymbal',  freq: 4000, decay: 0.01, noiseDecay: 1.0,  noiseGain: 0.45 },
  53: { name: 'Ride Bell',          type: 'bell',    freq: 3000, decay: 0.3,  noiseDecay: 0.02, noiseGain: 0.1 },
  54: { name: 'Tambourine',         type: 'hihat',   freq: 8000, decay: 0.01, noiseDecay: 0.15, noiseGain: 0.7 },
  55: { name: 'Splash Cymbal',      type: 'cymbal',  freq: 6000, decay: 0.01, noiseDecay: 0.6,  noiseGain: 0.45 },
  56: { name: 'Cowbell',            type: 'bell',    freq: 560,  decay: 0.15, noiseDecay: 0.01, noiseGain: 0.05 },
};

// ── Noise buffer (shared) ──
let sharedNoiseBuffer = null;
function getNoiseBuffer(ctx) {
  if (sharedNoiseBuffer && sharedNoiseBuffer.sampleRate === ctx.sampleRate) return sharedNoiseBuffer;
  const len = ctx.sampleRate * 2;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  sharedNoiseBuffer = buf;
  return buf;
}

// =============================================================================
// MidiSoundEngine Class
// =============================================================================
class MidiSoundEngine {
  constructor(audioContext) {
    this.ctx = audioContext;
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.8;
    this.masterGain.connect(this.ctx.destination);

    // 16 channels
    this.channels = Array.from({ length: 16 }, (_, i) => ({
      program: i === 9 ? -1 : 0, // Channel 10 (index 9) = drums
      volume: 1.0,
      pan: 0,
      pitchBend: 0,     // -8192 to 8191
      modulation: 0,     // 0-127
      voices: {},        // noteNum → voice
      gainNode: null,
      panNode: null,
    }));

    // Create channel audio nodes
    this.channels.forEach((ch, i) => {
      ch.gainNode = this.ctx.createGain();
      ch.gainNode.gain.value = ch.volume;
      ch.panNode = this.ctx.createStereoPanner();
      ch.panNode.pan.value = 0;
      ch.gainNode.connect(ch.panNode);
      ch.panNode.connect(this.masterGain);
    });

    // Reverb
    this.reverbGain = this.ctx.createGain();
    this.reverbGain.gain.value = 0.15;
    this.convolver = this.ctx.createConvolver();
    const len = this.ctx.sampleRate * 1.5;
    const irBuf = this.ctx.createBuffer(2, len, this.ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = irBuf.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.5);
    }
    this.convolver.buffer = irBuf;
    this.convolver.connect(this.reverbGain);
    this.reverbGain.connect(this.masterGain);

    this.maxPolyphony = 64;
    this.totalVoices = 0;
  }

  // ── Get family def for a program number ──
  _getFamily(program) {
    const key = PROGRAM_TO_FAMILY[program] || 'piano';
    return GM_FAMILIES[key];
  }

  // ── Program Change ──
  programChange(channel, program) {
    if (channel >= 0 && channel < 16) {
      this.channels[channel].program = program;
    }
  }

  // ── Control Change ──
  controlChange(channel, cc, value) {
    const ch = this.channels[channel];
    if (!ch) return;
    switch (cc) {
      case 1:  ch.modulation = value; break;  // Mod wheel
      case 7:  ch.volume = value / 127; ch.gainNode.gain.value = ch.volume; break;  // Volume
      case 10: ch.pan = (value - 64) / 64; ch.panNode.pan.value = ch.pan; break;  // Pan
      case 64: // Sustain pedal
        if (value >= 64) {
          ch.sustain = true;
        } else {
          ch.sustain = false;
          // Release sustained notes
          Object.keys(ch.voices).forEach(key => {
            if (ch.voices[key] && ch.voices[key].sustained) {
              this._releaseVoice(channel, parseInt(key));
            }
          });
        }
        break;
      case 121: this._resetChannel(channel); break;  // Reset all controllers
      case 123: this.allNotesOff(channel); break;  // All notes off
    }
  }

  // ── Pitch Bend ──
  pitchBend(channel, value) {
    const ch = this.channels[channel];
    if (!ch) return;
    ch.pitchBend = value; // -8192 to 8191
    const semitones = (value / 8192) * 2; // ±2 semitones range
    const ratio = Math.pow(2, semitones / 12);
    // Apply to all active oscillators on this channel
    Object.values(ch.voices).forEach(voice => {
      if (voice && voice.oscs) {
        voice.oscs.forEach(({ osc, baseFreq }) => {
          osc.frequency.setValueAtTime(baseFreq * ratio, this.ctx.currentTime);
        });
      }
    });
  }

  // ── Note On ──
  noteOn(channel, noteNum, velocity = 100, timeSec = null) {
    if (velocity === 0) { this.noteOff(channel, noteNum, timeSec); return; }
    const ch = this.channels[channel];
    if (!ch) return;

    // Voice stealing if at max polyphony
    if (this.totalVoices >= this.maxPolyphony) {
      this._stealOldestVoice();
    }

    const vel = velocity / 127;

    // Channel 10 (index 9) = drums
    if (channel === 9) {
      this._triggerDrum(noteNum, vel);
      return;
    }

    const family = this._getFamily(ch.program);
    const freq = 440 * Math.pow(2, (noteNum - 69) / 12);
    const now = timeSec ?? this.ctx.currentTime;

    // Voice gain
    const voiceGain = this.ctx.createGain();
    voiceGain.gain.setValueAtTime(0, now);

    // Filter with envelope
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    const filterBase = family.filter.freq * (0.5 + vel * 0.5); // velocity → filter
    filter.frequency.setValueAtTime(filterBase + family.filter.envAmount, now);
    filter.frequency.linearRampToValueAtTime(filterBase, now + family.filter.envDecay);
    filter.Q.value = family.filter.q;

    // Oscillators
    const oscs = family.oscillators.map(def => {
      const osc = this.ctx.createOscillator();
      osc.type = def.type;
      osc.frequency.value = freq;
      osc.detune.value = def.detune;
      const oscGain = this.ctx.createGain();
      oscGain.gain.value = def.gain * vel;
      osc.connect(oscGain);
      oscGain.connect(filter);
      osc.start(now);
      return { osc, oscGain, baseFreq: freq };
    });

    // ADSR
    const env = family.envelope;
    const peak = vel;
    voiceGain.gain.setValueAtTime(0, now);
    voiceGain.gain.linearRampToValueAtTime(peak, now + env.attack);
    voiceGain.gain.linearRampToValueAtTime(peak * env.sustain, now + env.attack + env.decay);

    filter.connect(voiceGain);
    voiceGain.connect(ch.gainNode);
    // Reverb send
    voiceGain.connect(this.convolver);

    // Store voice
    if (ch.voices[noteNum]) this._killVoice(channel, noteNum);
    ch.voices[noteNum] = { oscs, voiceGain, filter, envelope: env, sustained: false, startTime: now };
    this.totalVoices++;
  }

  // ── Note Off ──
  noteOff(channel, noteNum, timeSec = null) {
    const ch = this.channels[channel];
    if (!ch || !ch.voices[noteNum]) return;

    if (ch.sustain) {
      ch.voices[noteNum].sustained = true;
      return;
    }

    this._releaseVoice(channel, noteNum, timeSec);
  }

  // ── Internal: release voice with ADSR release ──
  _releaseVoice(channel, noteNum, timeSec = null) {
    const ch = this.channels[channel];
    const voice = ch.voices[noteNum];
    if (!voice) return;

    const now = timeSec ?? this.ctx.currentTime;
    const release = voice.envelope.release;

    voice.voiceGain.gain.cancelScheduledValues(now);
    voice.voiceGain.gain.setValueAtTime(voice.voiceGain.gain.value, now);
    voice.voiceGain.gain.linearRampToValueAtTime(0, now + release);

    voice.oscs.forEach(({ osc }) => {
      try { osc.stop(now + release + 0.05); } catch (e) {}
    });

    setTimeout(() => {
      try { voice.voiceGain.disconnect(); voice.filter.disconnect(); } catch (e) {}
      delete ch.voices[noteNum];
      this.totalVoices = Math.max(0, this.totalVoices - 1);
    }, (release + 0.1) * 1000);
  }

  // ── Internal: immediately kill a voice ──
  _killVoice(channel, noteNum) {
    const ch = this.channels[channel];
    const voice = ch.voices[noteNum];
    if (!voice) return;
    voice.oscs.forEach(({ osc }) => { try { osc.stop(); } catch (e) {} });
    try { voice.voiceGain.disconnect(); voice.filter.disconnect(); } catch (e) {}
    delete ch.voices[noteNum];
    this.totalVoices = Math.max(0, this.totalVoices - 1);
  }

  // ── Voice stealing: kill oldest voice across all channels ──
  _stealOldestVoice() {
    let oldest = null;
    let oldestCh = -1;
    let oldestNote = -1;

    this.channels.forEach((ch, ci) => {
      Object.entries(ch.voices).forEach(([noteNum, voice]) => {
        if (voice && (!oldest || voice.startTime < oldest.startTime)) {
          oldest = voice;
          oldestCh = ci;
          oldestNote = parseInt(noteNum);
        }
      });
    });

    if (oldest && oldestCh >= 0) {
      this._killVoice(oldestCh, oldestNote);
    }
  }

  // ── Drum synthesis ──
  _triggerDrum(noteNum, velocity) {
    const drum = DRUM_MAP[noteNum];
    if (!drum) return;

    const now = this.ctx.currentTime;
    const ch = this.channels[9];

    // Tone oscillator (for tonal drums like kick, toms)
    if (drum.type === 'kick' || drum.type === 'tom' || drum.type === 'bell') {
      const osc = this.ctx.createOscillator();
      osc.type = drum.type === 'bell' ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(drum.freq * 2, now);
      osc.frequency.exponentialRampToValueAtTime(drum.freq, now + 0.03);
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(velocity * 0.8, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + drum.decay);
      osc.connect(gain);
      gain.connect(ch.gainNode);
      osc.start(now);
      osc.stop(now + drum.decay + 0.05);
    }

    // Noise component (for snares, hihats, cymbals, claps)
    if (drum.noiseGain > 0) {
      const noiseSrc = this.ctx.createBufferSource();
      noiseSrc.buffer = getNoiseBuffer(this.ctx);
      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(velocity * drum.noiseGain, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + drum.noiseDecay);

      // Bandpass filter for hihats/cymbals
      if (drum.type === 'hihat' || drum.type === 'cymbal') {
        const bp = this.ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = drum.freq;
        bp.Q.value = drum.type === 'hihat' ? 3 : 1;
        noiseSrc.connect(bp);
        bp.connect(noiseGain);
      } else {
        const hp = this.ctx.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.value = drum.type === 'snare' ? 2000 : 1000;
        noiseSrc.connect(hp);
        hp.connect(noiseGain);
      }

      noiseGain.connect(ch.gainNode);
      noiseGain.connect(this.convolver);
      noiseSrc.start(now);
      noiseSrc.stop(now + drum.noiseDecay + 0.05);
    }
  }

  // ── All Notes Off ──
  allNotesOff(channel) {
    if (channel !== undefined) {
      const ch = this.channels[channel];
      if (ch) {
        Object.keys(ch.voices).forEach(n => this._killVoice(channel, parseInt(n)));
      }
    } else {
      this.channels.forEach((_, ci) => {
        Object.keys(this.channels[ci].voices).forEach(n => this._killVoice(ci, parseInt(n)));
      });
    }
  }

  // ── Reset channel ──
  _resetChannel(channel) {
    const ch = this.channels[channel];
    if (!ch) return;
    ch.volume = 1.0;
    ch.pan = 0;
    ch.pitchBend = 0;
    ch.modulation = 0;
    ch.sustain = false;
    ch.gainNode.gain.value = 1.0;
    ch.panNode.pan.value = 0;
  }

  // ── Process raw MIDI message ──
  processMidiMessage(data) {
    const [status, d1, d2] = data;
    const channel = status & 0x0F;
    const command = status & 0xF0;

    switch (command) {
      case 0x80: this.noteOff(channel, d1); break;
      case 0x90: this.noteOn(channel, d1, d2); break;
      case 0xB0: this.controlChange(channel, d1, d2); break;
      case 0xC0: this.programChange(channel, d1); break;
      case 0xE0: this.pitchBend(channel, ((d2 << 7) | d1) - 8192); break;
    }
  }

  // ── Set master volume ──
  setMasterVolume(vol) {
    this.masterGain.gain.value = vol;
  }

  // ── Set reverb ──
  setReverb(amount) {
    this.reverbGain.gain.value = amount;
  }

  // ── Get instrument name ──
  static getInstrumentName(program) {
    const familyKey = PROGRAM_TO_FAMILY[program];
    if (!familyKey) return 'Unknown';
    const family = GM_FAMILIES[familyKey];
    const idx = family.programs.indexOf(program);
    return family.names[idx] || family.names[0];
  }

  // ── Get all instrument names grouped ──
  static getInstrumentList() {
    return Object.entries(GM_FAMILIES).map(([key, family]) => ({
      family: key,
      instruments: family.programs.map((p, i) => ({
        program: p,
        name: family.names[i],
      })),
    }));
  }

  // ── Get drum names ──
  static getDrumMap() {
    return Object.entries(DRUM_MAP).map(([note, drum]) => ({
      note: parseInt(note),
      name: drum.name,
      type: drum.type,
    }));
  }

  // ── Cleanup ──
  destroy() {
    this.allNotesOff();
    try { this.masterGain.disconnect(); } catch (e) {}
    try { this.convolver.disconnect(); } catch (e) {}
    try { this.reverbGain.disconnect(); } catch (e) {}
  }
}

export default MidiSoundEngine;
export { GM_FAMILIES, DRUM_MAP, PROGRAM_TO_FAMILY };