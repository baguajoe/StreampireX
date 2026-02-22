// =============================================================================
// QuantizeEngine.js — MIDI Note Quantization
// =============================================================================
// Location: src/front/js/component/QuantizeEngine.js
// Snaps MIDI notes to the grid with adjustable strength, swing, and note
// length correction. Works with Piano Roll notes and step sequencer patterns.
// Pure math — no dependencies. Import and use as utility functions.
// =============================================================================

// =============================================================================
// QUANTIZE FUNCTIONS
// =============================================================================

/**
 * Quantize a single beat value to the nearest grid position.
 * @param {number} beat - The beat position to quantize
 * @param {number} gridSize - Grid resolution in beats (e.g., 0.25 = 1/16th)
 * @param {number} strength - Quantize strength 0-100 (0 = no change, 100 = snap to grid)
 * @param {number} swing - Swing amount 0-100 (shifts every other grid position)
 * @returns {number} Quantized beat position
 */
export function quantizeBeat(beat, gridSize = 0.25, strength = 100, swing = 0) {
  // Find nearest grid position
  const gridPos = Math.round(beat / gridSize) * gridSize;

  // Apply swing to off-beat positions
  let swungGrid = gridPos;
  if (swing > 0) {
    const gridIndex = Math.round(gridPos / gridSize);
    if (gridIndex % 2 === 1) {
      // Odd grid positions get pushed forward by swing amount
      const swingOffset = gridSize * (swing / 100) * 0.5;
      swungGrid = gridPos + swingOffset;
    }
  }

  // Apply strength (interpolate between original and quantized position)
  const s = strength / 100;
  return beat + (swungGrid - beat) * s;
}

/**
 * Quantize note duration to nearest grid value.
 * @param {number} duration - Note duration in beats
 * @param {number} gridSize - Grid resolution in beats
 * @param {number} strength - Quantize strength 0-100
 * @param {number} minDuration - Minimum allowed duration
 * @returns {number} Quantized duration
 */
export function quantizeDuration(duration, gridSize = 0.25, strength = 100, minDuration = 0.0625) {
  const gridDuration = Math.max(minDuration, Math.round(duration / gridSize) * gridSize);
  const s = strength / 100;
  return Math.max(minDuration, duration + (gridDuration - duration) * s);
}

/**
 * Quantize an array of piano roll notes.
 * @param {Array} notes - Array of {id, midi, start, duration, velocity}
 * @param {Object} options - Quantize options
 * @returns {Array} New array of quantized notes
 */
export function quantizeNotes(notes, options = {}) {
  const {
    gridSize = 0.25,        // 1/16th note
    strength = 100,          // Full quantize
    swing = 0,               // No swing
    quantizeStart = true,    // Quantize note start positions
    quantizeDur = false,     // Quantize note durations
    quantizeEnd = false,     // Quantize note end positions (alternative to duration)
    minDuration = 0.0625,    // Minimum 1/64th note
    selectedOnly = null,     // Set of note IDs to quantize (null = all)
  } = options;

  return notes.map(note => {
    // Skip non-selected notes if filter is active
    if (selectedOnly && !selectedOnly.has(note.id)) return note;

    let newStart = note.start;
    let newDuration = note.duration;

    if (quantizeStart) {
      newStart = quantizeBeat(note.start, gridSize, strength, swing);
    }

    if (quantizeDur) {
      newDuration = quantizeDuration(note.duration, gridSize, strength, minDuration);
    } else if (quantizeEnd) {
      const end = note.start + note.duration;
      const newEnd = quantizeBeat(end, gridSize, strength, swing);
      newDuration = Math.max(minDuration, newEnd - newStart);
    }

    return { ...note, start: Math.max(0, newStart), duration: newDuration };
  });
}

/**
 * Humanize notes — add slight random timing and velocity variation.
 * Opposite of quantize — makes things feel more "live".
 * @param {Array} notes - Array of piano roll notes
 * @param {Object} options - Humanize options
 * @returns {Array} Humanized notes
 */
export function humanizeNotes(notes, options = {}) {
  const {
    timingAmount = 10,    // Max timing offset in ms equivalent (mapped to beats)
    velocityAmount = 15,  // Max velocity variation (+/-)
    bpm = 120,
    selectedOnly = null,
  } = options;

  // Convert ms to beats
  const msPerBeat = 60000 / bpm;
  const maxBeatOffset = (timingAmount / msPerBeat);

  return notes.map(note => {
    if (selectedOnly && !selectedOnly.has(note.id)) return note;

    const timeOffset = (Math.random() * 2 - 1) * maxBeatOffset;
    const velOffset = Math.round((Math.random() * 2 - 1) * velocityAmount);

    return {
      ...note,
      start: Math.max(0, note.start + timeOffset),
      velocity: Math.max(1, Math.min(127, note.velocity + velOffset)),
    };
  });
}

/**
 * Legato — extend each note to reach the next note's start time.
 * @param {Array} notes - Array of piano roll notes
 * @param {Object} options
 * @returns {Array} Legato-ified notes
 */
export function legatoNotes(notes, options = {}) {
  const {
    gap = 0,              // Small gap between notes in beats (0 = true legato)
    selectedOnly = null,
    sameNoteOnly = true,  // Only connect notes on the same MIDI pitch
  } = options;

  // Sort by start time and group by pitch if needed
  const sorted = [...notes].sort((a, b) => a.start - b.start);
  const result = sorted.map(n => ({ ...n }));

  for (let i = 0; i < result.length - 1; i++) {
    if (selectedOnly && !selectedOnly.has(result[i].id)) continue;

    // Find the next note (optionally on same pitch)
    let nextIdx = -1;
    for (let j = i + 1; j < result.length; j++) {
      if (!sameNoteOnly || result[j].midi === result[i].midi) {
        nextIdx = j;
        break;
      }
    }

    if (nextIdx >= 0) {
      const nextStart = result[nextIdx].start;
      const newDuration = Math.max(0.0625, nextStart - result[i].start - gap);
      result[i].duration = newDuration;
    }
  }

  return result;
}

/**
 * Staccato — shorten notes to a fraction of their length.
 * @param {Array} notes - Array of piano roll notes
 * @param {Object} options
 * @returns {Array} Staccato notes
 */
export function staccatoNotes(notes, options = {}) {
  const {
    ratio = 0.5,          // Keep this fraction of the note length
    minDuration = 0.0625,
    selectedOnly = null,
  } = options;

  return notes.map(note => {
    if (selectedOnly && !selectedOnly.has(note.id)) return note;
    return { ...note, duration: Math.max(minDuration, note.duration * ratio) };
  });
}

/**
 * Transpose notes by semitones.
 * @param {Array} notes
 * @param {number} semitones - Number of semitones (+/-)
 * @param {Object} options
 * @returns {Array}
 */
export function transposeNotes(notes, semitones, options = {}) {
  const { selectedOnly = null } = options;
  return notes.map(note => {
    if (selectedOnly && !selectedOnly.has(note.id)) return note;
    const newMidi = Math.max(0, Math.min(127, note.midi + semitones));
    return { ...note, midi: newMidi };
  });
}

/**
 * Scale velocity of notes.
 * @param {Array} notes
 * @param {number} factor - Multiply velocity by this (e.g., 1.2 = 20% louder)
 * @param {Object} options
 * @returns {Array}
 */
export function scaleVelocity(notes, factor, options = {}) {
  const { selectedOnly = null } = options;
  return notes.map(note => {
    if (selectedOnly && !selectedOnly.has(note.id)) return note;
    return { ...note, velocity: Math.max(1, Math.min(127, Math.round(note.velocity * factor))) };
  });
}

/**
 * Reverse notes in time — flip the order within their time range.
 * @param {Array} notes
 * @param {Object} options
 * @returns {Array}
 */
export function reverseNotes(notes, options = {}) {
  const { selectedOnly = null } = options;

  const toReverse = selectedOnly
    ? notes.filter(n => selectedOnly.has(n.id))
    : [...notes];

  if (toReverse.length < 2) return notes;

  const minStart = Math.min(...toReverse.map(n => n.start));
  const maxEnd = Math.max(...toReverse.map(n => n.start + n.duration));
  const totalSpan = maxEnd - minStart;

  const reversed = new Map();
  for (const note of toReverse) {
    const newStart = minStart + (totalSpan - (note.start - minStart) - note.duration);
    reversed.set(note.id, Math.max(0, newStart));
  }

  return notes.map(note => {
    if (reversed.has(note.id)) {
      return { ...note, start: reversed.get(note.id) };
    }
    return note;
  });
}

// =============================================================================
// GRID SIZE PRESETS
// =============================================================================

export const GRID_PRESETS = {
  '1 bar':  4,
  '1/2':    2,
  '1/4':    1,
  '1/8':    0.5,
  '1/8T':   1/3,     // Triplet
  '1/16':   0.25,
  '1/16T':  1/6,     // Triplet
  '1/32':   0.125,
  '1/64':   0.0625,
};

// =============================================================================
// REACT COMPONENT — Quantize Panel UI
// =============================================================================

import React, { useState, useCallback } from 'react';

const QuantizePanel = ({ notes, selectedNotes, onApply, bpm = 120 }) => {
  const [gridSize, setGridSize] = useState(0.25);
  const [strength, setStrength] = useState(100);
  const [swing, setSwing] = useState(0);
  const [quantizeStart, setQuantizeStart] = useState(true);
  const [quantizeDur, setQuantizeDur] = useState(false);
  const [selectedOnlyMode, setSelectedOnlyMode] = useState(true);

  const apply = useCallback((fn, ...args) => {
    const filter = selectedOnlyMode && selectedNotes?.size > 0 ? selectedNotes : null;
    const result = fn(notes, ...args, { selectedOnly: filter });
    if (onApply) onApply(result);
  }, [notes, selectedNotes, selectedOnlyMode, onApply]);

  return (
    <div className="quantize-panel">
      <div className="qp-header">
        <h4 className="qp-title">⚡ Quantize & Transform</h4>
        {selectedNotes?.size > 0 && (
          <label className="qp-selected-toggle">
            <input type="checkbox" checked={selectedOnlyMode}
              onChange={e => setSelectedOnlyMode(e.target.checked)} />
            Selected only ({selectedNotes.size})
          </label>
        )}
      </div>

      {/* Quantize Settings */}
      <div className="qp-settings">
        <div className="qp-field">
          <label>Grid</label>
          <select value={gridSize} onChange={e => setGridSize(Number(e.target.value))}>
            {Object.entries(GRID_PRESETS).map(([label, val]) => (
              <option key={label} value={val}>{label}</option>
            ))}
          </select>
        </div>

        <div className="qp-field">
          <label>Strength: {strength}%</label>
          <input type="range" min="0" max="100" value={strength}
            onChange={e => setStrength(Number(e.target.value))} />
        </div>

        <div className="qp-field">
          <label>Swing: {swing}%</label>
          <input type="range" min="0" max="100" value={swing}
            onChange={e => setSwing(Number(e.target.value))} />
        </div>

        <div className="qp-checkboxes">
          <label>
            <input type="checkbox" checked={quantizeStart}
              onChange={e => setQuantizeStart(e.target.checked)} /> Start
          </label>
          <label>
            <input type="checkbox" checked={quantizeDur}
              onChange={e => setQuantizeDur(e.target.checked)} /> Duration
          </label>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="qp-actions">
        <button className="qp-btn primary"
          onClick={() => apply(quantizeNotes, { gridSize, strength, swing, quantizeStart, quantizeDur })}>
          ⚡ Quantize
        </button>
        <button className="qp-btn"
          onClick={() => apply(humanizeNotes, { timingAmount: 10, velocityAmount: 15, bpm })}>
          🎭 Humanize
        </button>
        <button className="qp-btn" onClick={() => apply(legatoNotes)}>
          🔗 Legato
        </button>
        <button className="qp-btn" onClick={() => apply(staccatoNotes)}>
          ✂️ Staccato
        </button>
      </div>

      {/* Transform Buttons */}
      <div className="qp-transforms">
        <div className="qp-transform-label">Transform:</div>
        <div className="qp-transform-btns">
          <button className="qp-btn small" onClick={() => apply(transposeNotes, 12)}>Oct ↑</button>
          <button className="qp-btn small" onClick={() => apply(transposeNotes, -12)}>Oct ↓</button>
          <button className="qp-btn small" onClick={() => apply(transposeNotes, 1)}>Semi ↑</button>
          <button className="qp-btn small" onClick={() => apply(transposeNotes, -1)}>Semi ↓</button>
          <button className="qp-btn small" onClick={() => apply(scaleVelocity, 1.2)}>Vel ↑</button>
          <button className="qp-btn small" onClick={() => apply(scaleVelocity, 0.8)}>Vel ↓</button>
          <button className="qp-btn small" onClick={() => apply(reverseNotes)}>⇄ Reverse</button>
        </div>
      </div>
    </div>
  );
};

export { QuantizePanel };
export default QuantizePanel;