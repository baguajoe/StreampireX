// =============================================================================
// AIBeatAssistant.js — AI-Powered Beat Pattern Generator
// =============================================================================
// Location: src/front/js/component/AIBeatAssistant.js
// Features:
//   - 20+ genre presets (Trap, Boom Bap, Lo-Fi, House, etc.)
//   - Generates kick/snare/hihat/perc patterns for step sequencer
//   - Complexity, swing, density, and variation controls
//   - Suggests BPM, time signature, chord progressions
//   - "Humanize" mode adds velocity variation
//   - One-click export to Beat Maker pads
//   - Pattern preview with Web Audio playback
//   - Cubase dark theme
// =============================================================================

import React, { useState, useCallback, useRef, useEffect } from 'react';
import '../../styles/AIBeatAssistant.css';

// ── Genre Templates ──
// Each genre defines base patterns, BPM range, swing, and typical instruments
const GENRES = {
  trap: {
    name: 'Trap', emoji: '🔥', bpm: [130, 160], swing: 0, timeSignature: '4/4',
    description: 'Hard-hitting 808s, rolling hi-hats, sparse snares',
    patterns: {
      kick:  [1,0,0,0, 0,0,0,0, 1,0,0,1, 0,0,0,0],
      snare: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
      hihat: [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0],
      perc:  [0,0,0,0, 0,0,0,1, 0,0,0,0, 0,0,1,0],
    },
    variations: {
      hihatRoll: [1,1,1,1, 1,0,1,1, 1,1,1,1, 1,0,1,1],
      tripletHat: [1,0,1, 1,0,1, 1,0,1, 1,0,1, 1,0,1, 0],
    },
    chords: ['Am', 'F', 'C', 'G'],
  },
  boomBap: {
    name: 'Boom Bap', emoji: '🎤', bpm: [85, 100], swing: 0.3, timeSignature: '4/4',
    description: 'Classic hip-hop feel with swing, punchy drums',
    patterns: {
      kick:  [1,0,0,0, 0,0,1,0, 0,0,1,0, 0,0,0,0],
      snare: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
      hihat: [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0],
      perc:  [0,0,0,0, 0,0,0,0, 0,1,0,0, 0,0,0,1],
    },
    chords: ['Dm', 'Bb', 'C', 'Am'],
  },
  lofi: {
    name: 'Lo-Fi', emoji: '☕', bpm: [70, 85], swing: 0.2, timeSignature: '4/4',
    description: 'Mellow, dusty beats with jazzy chords',
    patterns: {
      kick:  [1,0,0,0, 0,0,1,0, 0,0,0,0, 0,0,1,0],
      snare: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,1],
      hihat: [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0],
      perc:  [0,0,0,1, 0,0,0,0, 0,0,0,1, 0,0,0,0],
    },
    chords: ['Fmaj7', 'Em7', 'Dm7', 'Cmaj7'],
  },
  house: {
    name: 'House', emoji: '🏠', bpm: [120, 130], swing: 0, timeSignature: '4/4',
    description: 'Four-on-the-floor kick, offbeat hats, driving groove',
    patterns: {
      kick:  [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0],
      snare: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
      hihat: [0,0,1,0, 0,0,1,0, 0,0,1,0, 0,0,1,0],
      perc:  [0,0,0,0, 0,0,0,1, 0,0,0,0, 0,0,0,1],
    },
    chords: ['Am', 'G', 'F', 'Em'],
  },
  techno: {
    name: 'Techno', emoji: '🤖', bpm: [125, 140], swing: 0, timeSignature: '4/4',
    description: 'Driving kick, relentless hats, industrial energy',
    patterns: {
      kick:  [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0],
      snare: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,1],
      hihat: [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0],
      perc:  [0,0,1,0, 0,0,0,0, 0,0,1,0, 0,0,0,0],
    },
    chords: ['Am', 'Am', 'Dm', 'Dm'],
  },
  drill: {
    name: 'Drill', emoji: '🇬🇧', bpm: [138, 145], swing: 0.1, timeSignature: '4/4',
    description: 'Sliding 808s, bouncy hats, aggressive energy',
    patterns: {
      kick:  [1,0,0,0, 0,0,0,1, 0,0,1,0, 0,0,0,0],
      snare: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
      hihat: [1,1,0,1, 1,0,1,1, 1,1,0,1, 1,0,1,1],
      perc:  [0,0,0,0, 0,1,0,0, 0,0,0,0, 0,1,0,0],
    },
    chords: ['Cm', 'Ab', 'Eb', 'Bb'],
  },
  reggaeton: {
    name: 'Reggaeton', emoji: '🌴', bpm: [90, 100], swing: 0, timeSignature: '4/4',
    description: 'Dembow rhythm, reggaeton groove',
    patterns: {
      kick:  [1,0,0,1, 0,0,1,0, 1,0,0,1, 0,0,1,0],
      snare: [0,0,0,1, 0,0,1,0, 0,0,0,1, 0,0,1,0],
      hihat: [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0],
      perc:  [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
    },
    chords: ['Am', 'Dm', 'E', 'Am'],
  },
  rnb: {
    name: 'R&B', emoji: '💜', bpm: [65, 80], swing: 0.15, timeSignature: '4/4',
    description: 'Smooth, laid-back groove with soul',
    patterns: {
      kick:  [1,0,0,0, 0,0,1,0, 0,0,0,0, 0,1,0,0],
      snare: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
      hihat: [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0],
      perc:  [0,0,0,0, 0,0,0,1, 0,0,0,0, 0,0,0,1],
    },
    chords: ['Gmaj7', 'Em7', 'Am7', 'D7'],
  },
  pop: {
    name: 'Pop', emoji: '🎵', bpm: [100, 120], swing: 0, timeSignature: '4/4',
    description: 'Clean, punchy, radio-ready drums',
    patterns: {
      kick:  [1,0,0,0, 0,0,0,0, 1,0,1,0, 0,0,0,0],
      snare: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
      hihat: [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0],
      perc:  [0,0,0,0, 0,0,0,0, 0,0,0,1, 0,0,0,0],
    },
    chords: ['C', 'G', 'Am', 'F'],
  },
  edm: {
    name: 'EDM / Future Bass', emoji: '⚡', bpm: [140, 150], swing: 0, timeSignature: '4/4',
    description: 'Big drops, punchy kicks, energy builds',
    patterns: {
      kick:  [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0],
      snare: [0,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0],
      hihat: [0,0,1,0, 0,0,1,0, 0,0,1,0, 0,0,1,0],
      perc:  [0,0,0,1, 0,0,0,1, 0,0,0,1, 0,0,0,1],
    },
    chords: ['F', 'Am', 'C', 'G'],
  },
  dnb: {
    name: 'Drum & Bass', emoji: '🥁', bpm: [170, 180], swing: 0, timeSignature: '4/4',
    description: 'Breakbeat patterns, fast tempo, heavy bass',
    patterns: {
      kick:  [1,0,0,0, 0,0,0,0, 0,0,1,0, 0,0,0,0],
      snare: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,1],
      hihat: [1,0,1,1, 1,0,1,0, 1,0,1,1, 1,0,1,0],
      perc:  [0,0,0,0, 0,0,1,0, 0,0,0,0, 0,0,1,0],
    },
    chords: ['Am', 'F', 'Dm', 'E'],
  },
  jazz: {
    name: 'Jazz', emoji: '🎷', bpm: [100, 130], swing: 0.4, timeSignature: '4/4',
    description: 'Swung ride cymbal, brush feel, walking bass',
    patterns: {
      kick:  [1,0,0,0, 0,0,1,0, 0,0,0,0, 0,0,1,0],
      snare: [0,0,0,0, 0,0,0,1, 0,0,0,0, 0,0,0,1],
      hihat: [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0],
      perc:  [0,0,0,0, 0,0,0,0, 0,1,0,0, 0,0,0,0],
    },
    chords: ['Dm7', 'G7', 'Cmaj7', 'A7'],
  },
  afrobeats: {
    name: 'Afrobeats', emoji: '🌍', bpm: [100, 115], swing: 0.1, timeSignature: '4/4',
    description: 'Infectious polyrhythmic grooves',
    patterns: {
      kick:  [1,0,0,0, 0,0,1,0, 0,0,1,0, 0,0,0,0],
      snare: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,1],
      hihat: [1,0,1,1, 1,0,1,0, 1,0,1,1, 1,0,1,0],
      perc:  [0,0,1,0, 0,1,0,0, 0,0,1,0, 0,1,0,0],
    },
    chords: ['Cm', 'Fm', 'Ab', 'Eb'],
  },
  dancehall: {
    name: 'Dancehall', emoji: '🇯🇲', bpm: [90, 110], swing: 0, timeSignature: '4/4',
    description: 'One drop riddim, offbeat patterns',
    patterns: {
      kick:  [1,0,0,0, 0,0,1,0, 0,0,0,0, 0,0,1,0],
      snare: [0,0,0,1, 0,0,0,0, 0,0,0,1, 0,0,0,0],
      hihat: [0,0,1,0, 0,0,1,0, 0,0,1,0, 0,0,1,0],
      perc:  [0,1,0,0, 0,1,0,0, 0,1,0,0, 0,1,0,0],
    },
    chords: ['Am', 'Dm', 'G', 'C'],
  },
  phonk: {
    name: 'Phonk', emoji: '👻', bpm: [130, 145], swing: 0.1, timeSignature: '4/4',
    description: 'Memphis-inspired, cowbell-heavy, dark vibes',
    patterns: {
      kick:  [1,0,0,0, 0,0,0,0, 1,0,0,1, 0,0,0,0],
      snare: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
      hihat: [1,1,1,0, 1,1,1,0, 1,1,1,0, 1,1,1,0],
      perc:  [0,0,1,0, 0,0,1,0, 0,0,1,0, 0,0,1,0], // cowbell
    },
    chords: ['Dm', 'Bb', 'A', 'Dm'],
  },
  latin: {
    name: 'Latin', emoji: '💃', bpm: [90, 120], swing: 0.05, timeSignature: '4/4',
    description: 'Clave-based, tumbao patterns, salsa feel',
    patterns: {
      kick:  [1,0,0,0, 0,0,1,0, 0,0,0,0, 1,0,0,0],
      snare: [0,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0],
      hihat: [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0],
      perc:  [1,0,0,1, 0,0,1,0, 0,1,0,0, 1,0,0,0], // clave 3-2
    },
    chords: ['Am', 'Dm', 'E7', 'Am'],
  },
  rock: {
    name: 'Rock', emoji: '🎸', bpm: [110, 140], swing: 0, timeSignature: '4/4',
    description: 'Straight-ahead rock beat, driving energy',
    patterns: {
      kick:  [1,0,0,0, 0,0,1,0, 1,0,0,0, 0,0,1,0],
      snare: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
      hihat: [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0],
      perc:  [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,1],
    },
    chords: ['E', 'A', 'B', 'E'],
  },
  gospel: {
    name: 'Gospel', emoji: '⛪', bpm: [75, 100], swing: 0.25, timeSignature: '4/4',
    description: 'Soulful swing, complex hi-hat work',
    patterns: {
      kick:  [1,0,0,0, 0,0,1,0, 0,0,0,0, 0,1,0,0],
      snare: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,1],
      hihat: [1,0,1,1, 1,0,1,1, 1,0,1,1, 1,0,1,1],
      perc:  [0,0,0,0, 0,0,0,0, 0,0,0,1, 0,0,0,0],
    },
    chords: ['Cmaj7', 'Dm7', 'Em7', 'Fmaj7'],
  },
  synthwave: {
    name: 'Synthwave', emoji: '🌆', bpm: [100, 120], swing: 0, timeSignature: '4/4',
    description: '80s retro drums, gated reverb snare',
    patterns: {
      kick:  [1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0],
      snare: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
      hihat: [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0],
      perc:  [0,0,0,0, 0,0,0,0, 0,0,1,0, 0,0,0,0],
    },
    chords: ['Am', 'F', 'C', 'G'],
  },
};

// ── Pattern mutation helpers ──
function mutatePattern(pattern, density, humanize) {
  const result = [...pattern];
  const len = result.length;

  // Density: add or remove hits
  if (density > 0.5) {
    // Add hits
    const addChance = (density - 0.5) * 0.6;
    for (let i = 0; i < len; i++) {
      if (result[i] === 0 && Math.random() < addChance) result[i] = 1;
    }
  } else if (density < 0.5) {
    // Remove hits
    const removeChance = (0.5 - density) * 0.6;
    for (let i = 0; i < len; i++) {
      if (result[i] === 1 && Math.random() < removeChance && i !== 0) result[i] = 0;
    }
  }

  return result;
}

function generateVelocities(pattern, humanize) {
  return pattern.map(hit => {
    if (!hit) return 0;
    const base = 0.75 + Math.random() * 0.25;
    if (humanize > 0) {
      return Math.max(0.3, Math.min(1.0, base + (Math.random() - 0.5) * humanize * 0.5));
    }
    return base;
  });
}

// =============================================================================
// AIBeatAssistant React Component
// =============================================================================
const AIBeatAssistant = ({ onApplyPattern, onClose, isEmbedded = false }) => {
  const [selectedGenre, setSelectedGenre] = useState('trap');
  const [density, setDensity] = useState(0.5);
  const [complexity, setComplexity] = useState(0.5);
  const [swing, setSwing] = useState(null); // null = use genre default
  const [humanize, setHumanize] = useState(0.3);
  const [bpm, setBpm] = useState(null); // null = use genre default
  const [generatedPattern, setGeneratedPattern] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeStep, setActiveStep] = useState(-1);

  const audioCtxRef = useRef(null);
  const timerRef = useRef(null);
  const stepRef = useRef(0);

  const genre = GENRES[selectedGenre];
  const effectiveBpm = bpm || Math.round((genre.bpm[0] + genre.bpm[1]) / 2);
  const effectiveSwing = swing !== null ? swing : genre.swing;

  // ── Generate pattern ──
  const generatePattern = useCallback(() => {
    const g = GENRES[selectedGenre];
    const pattern = {};
    const velocities = {};

    Object.entries(g.patterns).forEach(([inst, basePattern]) => {
      pattern[inst] = mutatePattern(basePattern, density, humanize);
      velocities[inst] = generateVelocities(pattern[inst], humanize);
    });

    // Add complexity: extra ghost notes, fills
    if (complexity > 0.6) {
      // Add ghost snare hits
      for (let i = 0; i < 16; i++) {
        if (pattern.snare[i] === 0 && Math.random() < (complexity - 0.5) * 0.3) {
          pattern.snare[i] = 1;
          velocities.snare[i] = 0.25 + Math.random() * 0.2; // ghost note = quiet
        }
      }
      // Extra kick variations
      for (let i = 0; i < 16; i++) {
        if (pattern.kick[i] === 0 && Math.random() < (complexity - 0.6) * 0.25) {
          pattern.kick[i] = 1;
          velocities.kick[i] = 0.5 + Math.random() * 0.2;
        }
      }
    }

    setGeneratedPattern({
      pattern,
      velocities,
      bpm: effectiveBpm,
      swing: effectiveSwing,
      genre: g.name,
      chords: g.chords,
      timeSignature: g.timeSignature,
    });
  }, [selectedGenre, density, complexity, humanize, effectiveBpm, effectiveSwing]);

  // ── Auto-generate on genre change ──
  useEffect(() => {
    generatePattern();
  }, [selectedGenre]); // eslint-disable-line

  // ── Simple preview playback with Web Audio ──
  const getCtx = () => {
    if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtxRef.current.state === 'suspended') audioCtxRef.current.resume();
    return audioCtxRef.current;
  };

  const playDrumHit = (type, velocity, ctx) => {
    const now = ctx.currentTime;
    const masterGain = ctx.createGain();
    masterGain.gain.value = velocity * 0.6;
    masterGain.connect(ctx.destination);

    if (type === 'kick') {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(120, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.08);
      const g = ctx.createGain();
      g.gain.setValueAtTime(1, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.connect(g); g.connect(masterGain);
      osc.start(now); osc.stop(now + 0.35);
    } else if (type === 'snare') {
      // Tone
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = 180;
      const og = ctx.createGain();
      og.gain.setValueAtTime(0.7, now);
      og.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc.connect(og); og.connect(masterGain);
      osc.start(now); osc.stop(now + 0.15);
      // Noise
      const buf = ctx.createBuffer(1, ctx.sampleRate * 0.15, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1);
      const ns = ctx.createBufferSource(); ns.buffer = buf;
      const ng = ctx.createGain();
      ng.gain.setValueAtTime(0.8, now);
      ng.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 2000;
      ns.connect(hp); hp.connect(ng); ng.connect(masterGain);
      ns.start(now); ns.stop(now + 0.15);
    } else if (type === 'hihat') {
      const buf = ctx.createBuffer(1, ctx.sampleRate * 0.05, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1);
      const ns = ctx.createBufferSource(); ns.buffer = buf;
      const ng = ctx.createGain();
      ng.gain.setValueAtTime(0.6, now);
      ng.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 8000; bp.Q.value = 2;
      ns.connect(bp); bp.connect(ng); ng.connect(masterGain);
      ns.start(now); ns.stop(now + 0.05);
    } else if (type === 'perc') {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = 800;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.5, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
      osc.connect(g); g.connect(masterGain);
      osc.start(now); osc.stop(now + 0.08);
    }
  };

  const togglePlayback = () => {
    if (isPlaying) {
      clearInterval(timerRef.current);
      setIsPlaying(false);
      setActiveStep(-1);
      return;
    }
    if (!generatedPattern) return;

    const ctx = getCtx();
    stepRef.current = 0;
    setIsPlaying(true);

    const stepMs = (60000 / effectiveBpm) / 4; // 16th note duration
    timerRef.current = setInterval(() => {
      const step = stepRef.current % 16;
      setActiveStep(step);

      ['kick', 'snare', 'hihat', 'perc'].forEach(inst => {
        if (generatedPattern.pattern[inst]?.[step]) {
          const vel = generatedPattern.velocities[inst]?.[step] || 0.7;
          playDrumHit(inst, vel, ctx);
        }
      });

      stepRef.current++;
    }, stepMs);
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // ── Apply to Beat Maker ──
  const handleApply = () => {
    if (!generatedPattern || !onApplyPattern) return;
    onApplyPattern({
      ...generatedPattern,
      bpm: effectiveBpm,
      swing: effectiveSwing,
    });
  };

  return (
    <div className={`aibeat ${isEmbedded ? 'aibeat-embedded' : ''}`}>
      {/* ── Header ── */}
      <div className="aibeat-header">
        <div className="aibeat-title-row">
          <h3 className="aibeat-title">
            <span className="aibeat-icon">🤖</span> AI Beat Assistant
          </h3>
          {onClose && <button className="aibeat-close-btn" onClick={onClose}>✕</button>}
        </div>
        <p className="aibeat-subtitle">Pick a genre, tweak the vibe, generate beats instantly</p>
      </div>

      <div className="aibeat-body">
        {/* ── Genre Grid ── */}
        <div className="aibeat-section">
          <label className="aibeat-label">Genre</label>
          <div className="aibeat-genre-grid">
            {Object.entries(GENRES).map(([key, g]) => (
              <button
                key={key}
                className={`aibeat-genre-btn ${selectedGenre === key ? 'active' : ''}`}
                onClick={() => setSelectedGenre(key)}
              >
                <span className="aibeat-genre-emoji">{g.emoji}</span>
                <span className="aibeat-genre-name">{g.name}</span>
              </button>
            ))}
          </div>
          {genre && (
            <p className="aibeat-genre-desc">{genre.emoji} {genre.description}</p>
          )}
        </div>

        {/* ── Controls ── */}
        <div className="aibeat-controls">
          <div className="aibeat-ctrl">
            <label>BPM</label>
            <input type="range" min={genre.bpm[0]} max={genre.bpm[1]} value={effectiveBpm}
              onChange={e => setBpm(parseInt(e.target.value))} />
            <span className="aibeat-val">{effectiveBpm}</span>
          </div>
          <div className="aibeat-ctrl">
            <label>Density</label>
            <input type="range" min="0" max="1" step="0.05" value={density}
              onChange={e => setDensity(parseFloat(e.target.value))} />
            <span className="aibeat-val">{Math.round(density * 100)}%</span>
          </div>
          <div className="aibeat-ctrl">
            <label>Complexity</label>
            <input type="range" min="0" max="1" step="0.05" value={complexity}
              onChange={e => setComplexity(parseFloat(e.target.value))} />
            <span className="aibeat-val">{Math.round(complexity * 100)}%</span>
          </div>
          <div className="aibeat-ctrl">
            <label>Swing</label>
            <input type="range" min="0" max="0.5" step="0.05" value={effectiveSwing}
              onChange={e => setSwing(parseFloat(e.target.value))} />
            <span className="aibeat-val">{Math.round(effectiveSwing * 100)}%</span>
          </div>
          <div className="aibeat-ctrl">
            <label>Humanize</label>
            <input type="range" min="0" max="1" step="0.05" value={humanize}
              onChange={e => setHumanize(parseFloat(e.target.value))} />
            <span className="aibeat-val">{Math.round(humanize * 100)}%</span>
          </div>
        </div>

        {/* ── Action Buttons ── */}
        <div className="aibeat-actions">
          <button className="aibeat-generate-btn" onClick={generatePattern}>
            🎲 Generate New Pattern
          </button>
          <button className={`aibeat-play-btn ${isPlaying ? 'playing' : ''}`} onClick={togglePlayback}>
            {isPlaying ? '■ Stop' : '▶ Preview'}
          </button>
          {onApplyPattern && (
            <button className="aibeat-apply-btn" onClick={handleApply} disabled={!generatedPattern}>
              ✓ Send to Beat Maker
            </button>
          )}
        </div>

        {/* ── Pattern Visualization ── */}
        {generatedPattern && (
          <div className="aibeat-pattern-viz">
            <h4 className="aibeat-section-title">Generated Pattern</h4>
            <div className="aibeat-pattern-grid">
              {['kick', 'snare', 'hihat', 'perc'].map(inst => (
                <div key={inst} className="aibeat-pattern-row">
                  <span className="aibeat-inst-label">
                    {inst === 'kick' ? '🦵' : inst === 'snare' ? '🥁' : inst === 'hihat' ? '🎩' : '🔔'}
                    {inst.charAt(0).toUpperCase() + inst.slice(1)}
                  </span>
                  <div className="aibeat-steps">
                    {generatedPattern.pattern[inst]?.map((hit, i) => {
                      const vel = generatedPattern.velocities[inst]?.[i] || 0;
                      return (
                        <div
                          key={i}
                          className={`aibeat-step ${hit ? 'active' : ''} ${activeStep === i ? 'current' : ''} ${i % 4 === 0 ? 'beat-start' : ''}`}
                          style={hit ? { opacity: 0.4 + vel * 0.6 } : {}}
                          title={hit ? `Vel: ${Math.round(vel * 100)}%` : ''}
                        ></div>
                      );
                    })}
                  </div>
                </div>
              ))}
              {/* Beat markers */}
              <div className="aibeat-beat-markers">
                <span className="aibeat-inst-label"></span>
                <div className="aibeat-steps markers">
                  {Array.from({ length: 16 }, (_, i) => (
                    <span key={i} className={`aibeat-marker ${i % 4 === 0 ? 'beat' : ''}`}>
                      {i % 4 === 0 ? (i / 4 + 1) : '·'}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Chord suggestion */}
            {generatedPattern.chords && (
              <div className="aibeat-chords">
                <span className="aibeat-chord-label">Suggested Chords:</span>
                {generatedPattern.chords.map((chord, i) => (
                  <span key={i} className="aibeat-chord">{chord}</span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AIBeatAssistant;
export { GENRES };