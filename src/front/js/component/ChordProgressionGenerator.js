// =============================================================================
// ChordProgressionGenerator.js — AI Chord Suggestion UI
// =============================================================================
// Location: src/front/js/component/ChordProgressionGenerator.js
// Connects to /api/chords/* endpoints.
// Lets producers pick key, scale, genre → generates progressions → inserts
// into Piano Roll. Also has "suggest next chord" for real-time composition.
// =============================================================================

import React, { useState, useCallback, useEffect, useContext } from 'react';
import { Context } from '../store/appContext';
import './ChordProgressionGenerator.css';

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const ChordProgressionGenerator = ({
  onInsertChords,   // (chords) => void — insert into piano roll
  onScaleChange,    // (root, scale, pitchClasses) => void — highlight scale in piano roll
  bpm = 120,
  currentKey = 'C',
  currentScale = 'major',
}) => {
  const { store } = useContext(Context);

  // Settings
  const [root, setRoot] = useState(currentKey);
  const [scale, setScale] = useState(currentScale);
  const [genre, setGenre] = useState('hiphop');
  const [voicing, setVoicing] = useState('close');
  const [use7ths, setUse7ths] = useState(false);
  const [bars, setBars] = useState(4);
  const [beatsPerChord, setBeatsPerChord] = useState(4);
  const [octave, setOctave] = useState(4);

  // Generated data
  const [chords, setChords] = useState([]);
  const [progressionLabel, setProgressionLabel] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Available options
  const [availableScales, setAvailableScales] = useState([]);
  const [availableGenres, setAvailableGenres] = useState([]);
  const [availableVoicings, setAvailableVoicings] = useState({});

  // Progression history (for suggest-next)
  const [chordHistory, setChordHistory] = useState([]);

  // Load available scales/genres on mount
  useEffect(() => {
    fetch('/api/chords/scales')
      .then(r => r.json())
      .then(data => {
        setAvailableScales(data.scales || []);
        setAvailableGenres(data.genres || []);
        setAvailableVoicings(data.voicings || {});
      })
      .catch(() => {});
  }, []);

  // Notify piano roll of scale changes
  useEffect(() => {
    if (!onScaleChange) return;
    const token = store.token || localStorage.getItem('token');
    if (!token) return;

    fetch('/api/chords/scale-notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ root, scale }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.pitch_classes) onScaleChange(root, scale, data.pitch_classes);
      })
      .catch(() => {});
  }, [root, scale, onScaleChange, store.token]);

  // ==========================================================================
  // GENERATE PROGRESSION
  // ==========================================================================

  const generate = useCallback(async () => {
    setLoading(true);
    setError(null);
    const token = store.token || localStorage.getItem('token');

    try {
      const res = await fetch('/api/chords/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ root, scale, genre, voicing, use_7ths: use7ths, bars, beats_per_chord: beatsPerChord, bpm, octave }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Generation failed');

      setChords(data.chords);
      setProgressionLabel(data.progression);
      setChordHistory(data.chords.map(c => c.degree));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [root, scale, genre, voicing, use7ths, bars, beatsPerChord, bpm, octave, store.token]);

  // ==========================================================================
  // SUGGEST NEXT CHORD
  // ==========================================================================

  const suggestNext = useCallback(async () => {
    const token = store.token || localStorage.getItem('token');
    try {
      const res = await fetch('/api/chords/suggest-next', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ root, scale, current_degrees: chordHistory, use_7ths: use7ths, octave, bpm }),
      });
      const data = await res.json();
      if (data.suggestions) setSuggestions(data.suggestions);
    } catch (e) {
      console.error('Suggest error:', e);
    }
  }, [root, scale, chordHistory, use7ths, octave, bpm, store.token]);

  // Auto-suggest when chords change
  useEffect(() => {
    if (chordHistory.length > 0) suggestNext();
  }, [chordHistory]);

  // ==========================================================================
  // PREVIEW CHORD (play audio)
  // ==========================================================================

  const previewChord = useCallback((chord) => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const now = ctx.currentTime;
      for (const midi of chord.midi_notes) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const freq = 440 * Math.pow(2, (midi - 69) / 12);
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 1.5);
      }
    } catch (e) {}
  }, []);

  // ==========================================================================
  // INSERT INTO PIANO ROLL
  // ==========================================================================

  const insertAll = useCallback(() => {
    if (onInsertChords && chords.length > 0) onInsertChords(chords);
  }, [chords, onInsertChords]);

  const insertSingle = useCallback((suggestion) => {
    if (!onInsertChords) return;
    const lastChord = chords[chords.length - 1];
    const startBeat = lastChord ? lastChord.start_beat + lastChord.duration_beats : 0;
    const chord = {
      ...suggestion,
      start_beat: startBeat,
      duration_beats: beatsPerChord,
      velocity: 100,
    };
    onInsertChords([chord]);
    setChordHistory(prev => [...prev, suggestion.degree]);
    setChords(prev => [...prev, chord]);
  }, [chords, beatsPerChord, onInsertChords]);

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <div className="chord-gen">
      <div className="chord-gen-header">
        <h3 className="chord-gen-title">🎹 Chord Progression Generator</h3>
        <span className="chord-gen-badge">AI-Powered</span>
      </div>

      {/* Settings Row */}
      <div className="chord-gen-settings">
        <div className="chord-gen-field">
          <label>Key</label>
          <select value={root} onChange={e => setRoot(e.target.value)}>
            {NOTE_NAMES.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>

        <div className="chord-gen-field">
          <label>Scale</label>
          <select value={scale} onChange={e => setScale(e.target.value)}>
            {(availableScales.length > 0 ? availableScales : Object.keys({
              major:1,natural_minor:1,harmonic_minor:1,dorian:1,mixolydian:1,phrygian:1,lydian:1,pentatonic_major:1,pentatonic_minor:1,blues:1
            })).map(s => (
              <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>

        <div className="chord-gen-field">
          <label>Genre</label>
          <select value={genre} onChange={e => setGenre(e.target.value)}>
            {(availableGenres.length > 0 ? availableGenres : ['pop','hiphop','trap','rnb','jazz','lofi','edm','rock','gospel','reggaeton','country']).map(g => (
              <option key={g} value={g}>{g.charAt(0).toUpperCase() + g.slice(1)}</option>
            ))}
          </select>
        </div>

        <div className="chord-gen-field">
          <label>Voicing</label>
          <select value={voicing} onChange={e => setVoicing(e.target.value)}>
            {Object.entries(availableVoicings.length > 0 ? availableVoicings : {
              close:'Close',open:'Open',root:'Root',high:'High',power:'Power'
            }).map(([k, v]) => (
              <option key={k} value={k}>{typeof v === 'string' ? v.split('—')[0].trim() : k}</option>
            ))}
          </select>
        </div>

        <div className="chord-gen-field">
          <label>Bars</label>
          <select value={bars} onChange={e => setBars(Number(e.target.value))}>
            {[2, 4, 8, 16].map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>

        <div className="chord-gen-field">
          <label>Octave</label>
          <select value={octave} onChange={e => setOctave(Number(e.target.value))}>
            {[2, 3, 4, 5, 6].map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>

        <div className="chord-gen-field checkbox">
          <label>
            <input type="checkbox" checked={use7ths} onChange={e => setUse7ths(e.target.checked)} />
            7th chords
          </label>
        </div>
      </div>

      {/* Generate Button */}
      <div className="chord-gen-actions">
        <button className="chord-gen-btn primary" onClick={generate} disabled={loading}>
          {loading ? '⏳ Generating...' : '🎲 Generate Progression'}
        </button>
        {chords.length > 0 && (
          <button className="chord-gen-btn insert" onClick={insertAll}>
            ➡️ Insert into Piano Roll
          </button>
        )}
      </div>

      {error && <div className="chord-gen-error">⚠️ {error}</div>}

      {/* Generated Progression */}
      {chords.length > 0 && (
        <div className="chord-gen-result">
          <div className="chord-gen-progression-label">
            <strong>{root} {scale.replace(/_/g, ' ')}</strong> — {progressionLabel}
          </div>
          <div className="chord-gen-chords">
            {chords.map((chord, i) => (
              <div key={i} className="chord-card" onClick={() => previewChord(chord)}
                title="Click to preview">
                <div className="chord-card-roman">{chord.roman}</div>
                <div className="chord-card-name">{chord.chord_name}</div>
                <div className="chord-card-notes">
                  {chord.note_names?.join(' ') || chord.midi_notes?.join(' ')}
                </div>
                <div className="chord-card-beats">{chord.duration_beats} beats</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Suggest Next */}
      {suggestions.length > 0 && (
        <div className="chord-gen-suggestions">
          <div className="chord-gen-suggest-label">Next chord suggestions:</div>
          <div className="chord-gen-suggest-list">
            {suggestions.map((s, i) => (
              <button key={i} className="chord-suggest-btn"
                onClick={() => insertSingle(s)}
                onMouseEnter={() => previewChord(s)}
                style={{ opacity: 0.6 + s.strength * 0.4 }}>
                <span className="suggest-roman">{s.roman}</span>
                <span className="suggest-name">{s.chord_name}{s.quality !== 'maj' && s.quality !== 'min' ? s.quality : ''}</span>
                <span className="suggest-bar">
                  <span className="suggest-bar-fill" style={{ width: `${s.strength * 100}%` }} />
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ChordProgressionGenerator;