// =============================================================================
// qwertyMidi.js — computer keyboard as MIDI controller (Part 12)
// =============================================================================
// Registers itself as a virtual input on the MidiBus when enabled, then emits
// synthetic note-on/off, sustain, and panic messages so every existing MIDI
// consumer (Recording Studio, Beat Lab, Piano Roll, VirtualPiano) receives
// keyboard input the same way it receives hardware MIDI.
//
// Layout (Cubase / Logic style, two-row QWERTY):
//   Music white keys: A S D F G H J K L ;   → C D E F G A B C D E (relative to base octave)
//   Music black keys: W E _ T Y U _ O P     → C# D# _ F# G# A# _ C# D#
//   Octave down: Z      Octave up: X
//   Velocity dn: ,      Velocity up: .
//   Sustain (hold): Space     Panic (all notes off): Esc
//
// Limitations: targets US QWERTY only (AZERTY/Dvorak unsupported in V1). No
// aftertouch, pitch bend, or mod wheel — Z/X are octave shift, not pitch wheel.

import { midiBus } from './MidiBus';

const VIRTUAL_INPUT_ID = 'computer-keyboard';
const VIRTUAL_INPUT_NAME = 'Computer Keyboard';

// Semitone offset from base-octave C. Two-octave span A→; with proper black-key gaps.
const NOTE_MAP = {
  'a': 0,  's': 2,  'd': 4,  'f': 5,  'g': 7,  'h': 9,  'j': 11, 'k': 12, 'l': 14, ';': 16,
  'w': 1,  'e': 3,  't': 6,  'y': 8,  'u': 10, 'o': 13, 'p': 15,
};

class QwertyMidiEngine {
  constructor() {
    this.enabled = false;
    this.octave = 4;          // base C-octave; C4 = MIDI 48 (octave * 12)
    this.velocity = 100;
    this.activeNotes = new Set();    // keys currently held — guards against key-repeat double-triggers
    this.sustainPedalDown = false;
    this.sustainedNotes = new Set(); // released-but-held-by-sustain
    this._lastNote = null;
    this._listeners = new Set();
    this._keydown = this._keydown.bind(this);
    this._keyup = this._keyup.bind(this);
  }

  enable() {
    if (this.enabled) return;
    this.enabled = true;
    midiBus.registerVirtualInput(VIRTUAL_INPUT_ID, VIRTUAL_INPUT_NAME);
    window.addEventListener('keydown', this._keydown);
    window.addEventListener('keyup', this._keyup);
    this._notify();
  }

  disable() {
    if (!this.enabled) return;
    this.enabled = false;
    // Send note-off for every still-held note, then release sustain, then unregister —
    // order matters: emitVirtualMessage drops messages once the input is unregistered.
    this.activeNotes.forEach(n => this._sendNoteOff(n));
    this.sustainedNotes.forEach(n => this._sendNoteOff(n));
    this.activeNotes.clear();
    this.sustainedNotes.clear();
    if (this.sustainPedalDown) {
      this._sendCC(64, 0);
      this.sustainPedalDown = false;
    }
    window.removeEventListener('keydown', this._keydown);
    window.removeEventListener('keyup', this._keyup);
    midiBus.unregisterVirtualInput(VIRTUAL_INPUT_ID);
    this._notify();
  }

  toggle() { this.enabled ? this.disable() : this.enable(); }

  setOctave(o) { this.octave = Math.max(0, Math.min(8, o)); this._notify(); }
  setVelocity(v) { this.velocity = Math.max(1, Math.min(127, Math.round(v))); this._notify(); }

  onChange(fn) { this._listeners.add(fn); fn(this._state()); return () => this._listeners.delete(fn); }

  _state() {
    return { enabled: this.enabled, octave: this.octave, velocity: this.velocity, lastNote: this._lastNote };
  }
  _notify() {
    const s = this._state();
    this._listeners.forEach(fn => { try { fn(s); } catch (err) { console.warn('[qwertyMidi] listener threw:', err); } });
  }

  // Smart focus detection: never intercept keystrokes when the user is typing
  // into an input/textarea/select/contenteditable. Naturally covers modal forms.
  _isInputFocused() {
    const ae = document.activeElement;
    if (!ae) return false;
    const tag = (ae.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
    if (ae.isContentEditable) return true;
    return false;
  }

  _keydown(e) {
    if (!this.enabled) return;
    if (this._isInputFocused()) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return; // leave browser/OS shortcuts alone
    if (e.repeat) return;                            // OS key-repeat would re-fire note-on otherwise

    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key.toLowerCase();

    if (key === 'z') { this.setOctave(this.octave - 1); e.preventDefault(); return; }
    if (key === 'x') { this.setOctave(this.octave + 1); e.preventDefault(); return; }
    if (key === ',') { this.setVelocity(this.velocity - 10); e.preventDefault(); return; }
    if (key === '.') { this.setVelocity(this.velocity + 10); e.preventDefault(); return; }
    if (key === ' ') {
      if (!this.sustainPedalDown) {
        this.sustainPedalDown = true;
        this._sendCC(64, 127);
      }
      e.preventDefault();
      return;
    }
    if (key === 'escape') { this._panic(); e.preventDefault(); return; }

    const offset = NOTE_MAP[key];
    if (offset === undefined) return;
    const note = (this.octave * 12) + offset;
    if (note < 0 || note > 127) return;
    if (this.activeNotes.has(note)) return;

    this.activeNotes.add(note);
    this._lastNote = note;
    this._sendNoteOn(note, this.velocity);
    e.preventDefault();
    this._notify();
  }

  _keyup(e) {
    if (!this.enabled) return;
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key.toLowerCase();

    if (key === ' ') {
      if (this.sustainPedalDown) {
        this.sustainPedalDown = false;
        this._sendCC(64, 0);
        // Release everything the pedal was holding
        this.sustainedNotes.forEach(n => this._sendNoteOff(n));
        this.sustainedNotes.clear();
      }
      return;
    }

    const offset = NOTE_MAP[key];
    if (offset === undefined) return;
    // Compute against current octave; a key released after an octave shift still
    // resolves to the note that was sent on press because activeNotes holds the
    // exact MIDI number — find it and release that, regardless of current octave.
    const candidate = (this.octave * 12) + offset;
    let note = candidate;
    if (!this.activeNotes.has(note)) {
      // fall back: scan activeNotes for any matching pitch class within ±octaves
      for (const n of this.activeNotes) {
        if (((n - offset) % 12 + 12) % 12 === 0) { note = n; break; }
      }
    }
    if (!this.activeNotes.has(note)) return;
    this.activeNotes.delete(note);

    if (this.sustainPedalDown) {
      this.sustainedNotes.add(note);
    } else {
      this._sendNoteOff(note);
    }
  }

  _panic() {
    this.activeNotes.forEach(n => this._sendNoteOff(n));
    this.sustainedNotes.forEach(n => this._sendNoteOff(n));
    this.activeNotes.clear();
    this.sustainedNotes.clear();
    if (this.sustainPedalDown) {
      this._sendCC(64, 0);
      this.sustainPedalDown = false;
    }
  }

  _sendNoteOn(note, velocity) { midiBus.emitVirtualMessage(VIRTUAL_INPUT_ID, 0x90, note, velocity); }
  _sendNoteOff(note)          { midiBus.emitVirtualMessage(VIRTUAL_INPUT_ID, 0x80, note, 0); }
  _sendCC(controller, value)  { midiBus.emitVirtualMessage(VIRTUAL_INPUT_ID, 0xB0, controller, value); }
}

export const qwertyMidi = new QwertyMidiEngine();
