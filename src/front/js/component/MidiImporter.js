// =============================================================================
// MidiImporter.js — MIDI File Import for Piano Roll & Beat Maker
// =============================================================================
// Location: src/front/js/component/MidiImporter.js
// Parses Standard MIDI Files (.mid) and converts to piano roll note format.
// Supports Type 0 and Type 1 MIDI files.
// No external dependencies — pure JavaScript MIDI parser.
// =============================================================================

import React, { useState, useCallback, useRef } from 'react';

// =============================================================================
// MIDI PARSER (Pure JS — no npm dependencies)
// =============================================================================

class MidiParser {
  constructor(arrayBuffer) {
    this.data = new DataView(arrayBuffer);
    this.pos = 0;
    this.tracks = [];
    this.format = 0;
    this.numTracks = 0;
    this.ticksPerBeat = 480;
    this.tempos = [{ tick: 0, bpm: 120 }];
  }

  readUint8() { return this.data.getUint8(this.pos++); }
  readUint16() { const v = this.data.getUint16(this.pos); this.pos += 2; return v; }
  readUint32() { const v = this.data.getUint32(this.pos); this.pos += 4; return v; }
  readString(len) {
    let s = '';
    for (let i = 0; i < len; i++) s += String.fromCharCode(this.readUint8());
    return s;
  }

  readVarLen() {
    let val = 0;
    let byte;
    do {
      byte = this.readUint8();
      val = (val << 7) | (byte & 0x7F);
    } while (byte & 0x80);
    return val;
  }

  parse() {
    // Header chunk
    const headerChunk = this.readString(4);
    if (headerChunk !== 'MThd') throw new Error('Not a valid MIDI file');

    const headerLen = this.readUint32();
    this.format = this.readUint16();
    this.numTracks = this.readUint16();
    const division = this.readUint16();

    if (division & 0x8000) {
      // SMPTE time
      const fps = -(division >> 8);
      const tpf = division & 0xFF;
      this.ticksPerBeat = fps * tpf;
    } else {
      this.ticksPerBeat = division;
    }

    // Track chunks
    for (let t = 0; t < this.numTracks; t++) {
      const trackChunk = this.readString(4);
      if (trackChunk !== 'MTrk') throw new Error(`Expected MTrk at position ${this.pos - 4}`);

      const trackLen = this.readUint32();
      const trackEnd = this.pos + trackLen;
      const events = [];
      let runningStatus = 0;
      let absoluteTick = 0;

      while (this.pos < trackEnd) {
        const delta = this.readVarLen();
        absoluteTick += delta;

        let statusByte = this.readUint8();

        // Running status
        if (statusByte < 0x80) {
          this.pos--;
          statusByte = runningStatus;
        } else {
          runningStatus = statusByte;
        }

        const type = statusByte & 0xF0;
        const channel = statusByte & 0x0F;

        if (statusByte === 0xFF) {
          // Meta event
          const metaType = this.readUint8();
          const metaLen = this.readVarLen();
          const metaData = [];
          for (let i = 0; i < metaLen; i++) metaData.push(this.readUint8());

          if (metaType === 0x51 && metaLen === 3) {
            // Tempo change
            const uspqn = (metaData[0] << 16) | (metaData[1] << 8) | metaData[2];
            const bpm = Math.round(60000000 / uspqn);
            this.tempos.push({ tick: absoluteTick, bpm });
          }

          if (metaType === 0x03) {
            // Track name
            const name = metaData.map(b => String.fromCharCode(b)).join('');
            events.push({ tick: absoluteTick, type: 'trackName', name });
          }

          if (metaType === 0x2F) {
            // End of track
            break;
          }
        } else if (statusByte === 0xF0 || statusByte === 0xF7) {
          // SysEx
          const sysexLen = this.readVarLen();
          this.pos += sysexLen;
        } else if (type === 0x90) {
          // Note On
          const note = this.readUint8();
          const velocity = this.readUint8();
          if (velocity > 0) {
            events.push({ tick: absoluteTick, type: 'noteOn', channel, note, velocity });
          } else {
            events.push({ tick: absoluteTick, type: 'noteOff', channel, note, velocity: 0 });
          }
        } else if (type === 0x80) {
          // Note Off
          const note = this.readUint8();
          const velocity = this.readUint8();
          events.push({ tick: absoluteTick, type: 'noteOff', channel, note, velocity });
        } else if (type === 0xA0) {
          // Aftertouch
          this.readUint8(); this.readUint8();
        } else if (type === 0xB0) {
          // Control Change
          const ctrl = this.readUint8();
          const val = this.readUint8();
          events.push({ tick: absoluteTick, type: 'cc', channel, controller: ctrl, value: val });
        } else if (type === 0xC0) {
          // Program Change
          const program = this.readUint8();
          events.push({ tick: absoluteTick, type: 'programChange', channel, program });
        } else if (type === 0xD0) {
          // Channel Pressure
          this.readUint8();
        } else if (type === 0xE0) {
          // Pitch Bend
          this.readUint8(); this.readUint8();
        }
      }

      this.pos = trackEnd;
      this.tracks.push(events);
    }

    return this;
  }

  // Convert parsed MIDI to piano roll notes (in beats)
  toNotes() {
    const allNotes = [];
    const tpb = this.ticksPerBeat;

    for (let t = 0; t < this.tracks.length; t++) {
      const events = this.tracks[t];
      const activeNotes = {}; // key: `ch_note` → { tick, velocity }

      for (const ev of events) {
        if (ev.type === 'noteOn') {
          const key = `${ev.channel}_${ev.note}`;
          activeNotes[key] = { tick: ev.tick, velocity: ev.velocity, channel: ev.channel };
        } else if (ev.type === 'noteOff') {
          const key = `${ev.channel}_${ev.note}`;
          if (activeNotes[key]) {
            const startBeat = activeNotes[key].tick / tpb;
            const endBeat = ev.tick / tpb;
            const duration = endBeat - startBeat;

            allNotes.push({
              id: `midi_${t}_${allNotes.length}_${Math.random().toString(36).slice(2, 6)}`,
              midi: ev.note,
              start: Math.round(startBeat * 1000) / 1000,
              duration: Math.max(0.0625, Math.round(duration * 1000) / 1000),
              velocity: activeNotes[key].velocity,
              channel: ev.channel,
              track: t,
            });

            delete activeNotes[key];
          }
        }
      }
    }

    // Sort by start time
    allNotes.sort((a, b) => a.start - b.start);
    return allNotes;
  }

  // Convert to step sequencer pattern (for Beat Maker drum mode)
  toStepPattern(stepCount = 16, quantize = 0.25) {
    const notes = this.toNotes();
    const drumNotes = notes.filter(n => n.channel === 9 || n.midi >= 35 && n.midi <= 81);
    const steps = {};
    const velocities = {};

    for (const note of drumNotes) {
      // Map MIDI drum note to pad (0-15)
      const padIndex = Math.max(0, Math.min(15, note.midi - 36));
      if (!steps[padIndex]) {
        steps[padIndex] = new Array(stepCount).fill(false);
        velocities[padIndex] = new Array(stepCount).fill(0.8);
      }

      const step = Math.round(note.start / quantize) % stepCount;
      steps[padIndex][step] = true;
      velocities[padIndex][step] = note.velocity / 127;
    }

    return { steps, velocities };
  }

  getInfo() {
    const notes = this.toNotes();
    const bpm = this.tempos.length > 0 ? this.tempos[this.tempos.length - 1].bpm : 120;
    const maxBeat = notes.length > 0 ? Math.max(...notes.map(n => n.start + n.duration)) : 0;
    const trackNames = [];
    for (const track of this.tracks) {
      const nameEvt = track.find(e => e.type === 'trackName');
      trackNames.push(nameEvt ? nameEvt.name : 'Untitled');
    }

    return {
      format: this.format,
      numTracks: this.numTracks,
      ticksPerBeat: this.ticksPerBeat,
      bpm,
      totalNotes: notes.length,
      totalBeats: Math.ceil(maxBeat),
      totalBars: Math.ceil(maxBeat / 4),
      trackNames,
      channels: [...new Set(notes.map(n => n.channel))],
      noteRange: notes.length > 0
        ? { low: Math.min(...notes.map(n => n.midi)), high: Math.max(...notes.map(n => n.midi)) }
        : { low: 0, high: 127 },
    };
  }
}

// =============================================================================
// REACT COMPONENT
// =============================================================================

const MidiImporter = ({ onImport, onImportSteps, onBpmDetected }) => {
  const [fileInfo, setFileInfo] = useState(null);
  const [error, setError] = useState(null);
  const [importing, setImporting] = useState(false);
  const [tracks, setTracks] = useState([]);
  const [selectedTracks, setSelectedTracks] = useState(new Set());
  const fileInputRef = useRef(null);
  const parsedRef = useRef(null);

  const handleFile = useCallback(async (file) => {
    if (!file || !file.name.toLowerCase().endsWith('.mid') && !file.name.toLowerCase().endsWith('.midi')) {
      setError('Please select a .mid or .midi file');
      return;
    }

    setError(null);
    setImporting(true);

    try {
      const buffer = await file.arrayBuffer();
      const parser = new MidiParser(buffer);
      parser.parse();
      parsedRef.current = parser;

      const info = parser.getInfo();
      setFileInfo({ ...info, fileName: file.name });

      // Pre-select all tracks
      const trackSet = new Set();
      for (let i = 0; i < info.numTracks; i++) trackSet.add(i);
      setSelectedTracks(trackSet);
      setTracks(info.trackNames.map((name, i) => ({ index: i, name })));

      if (onBpmDetected && info.bpm) {
        onBpmDetected(info.bpm);
      }
    } catch (e) {
      setError(`Failed to parse MIDI: ${e.message}`);
    } finally {
      setImporting(false);
    }
  }, [onBpmDetected]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer?.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const importToRoll = useCallback(() => {
    if (!parsedRef.current) return;
    const allNotes = parsedRef.current.toNotes();
    const filtered = allNotes.filter(n => selectedTracks.has(n.track));
    if (onImport) onImport(filtered);
  }, [selectedTracks, onImport]);

  const importToSteps = useCallback(() => {
    if (!parsedRef.current) return;
    const pattern = parsedRef.current.toStepPattern();
    if (onImportSteps) onImportSteps(pattern);
  }, [onImportSteps]);

  const toggleTrack = useCallback((idx) => {
    setSelectedTracks(prev => {
      const s = new Set(prev);
      s.has(idx) ? s.delete(idx) : s.add(idx);
      return s;
    });
  }, []);

  return (
    <div className="midi-importer" onDrop={handleDrop} onDragOver={handleDragOver}>
      <div className="midi-import-dropzone" onClick={() => fileInputRef.current?.click()}>
        <input ref={fileInputRef} type="file" accept=".mid,.midi" hidden
          onChange={e => { if (e.target.files[0]) handleFile(e.target.files[0]); }} />
        <div className="midi-import-icon">📥</div>
        <div className="midi-import-text">
          {importing ? 'Parsing MIDI...' : 'Drop .mid file here or click to browse'}
        </div>
      </div>

      {error && <div className="midi-import-error">⚠️ {error}</div>}

      {fileInfo && (
        <div className="midi-import-info">
          <div className="midi-info-header">
            <strong>📄 {fileInfo.fileName}</strong>
            <span className="midi-info-badge">Type {fileInfo.format}</span>
          </div>
          <div className="midi-info-stats">
            <span>🎵 {fileInfo.totalNotes} notes</span>
            <span>🎼 {fileInfo.totalBars} bars</span>
            <span>⏱️ {fileInfo.bpm} BPM</span>
            <span>🎹 {fileInfo.noteRange.low}–{fileInfo.noteRange.high}</span>
          </div>

          {tracks.length > 1 && (
            <div className="midi-track-selector">
              <div className="midi-track-label">Select tracks to import:</div>
              {tracks.map(t => (
                <label key={t.index} className="midi-track-item">
                  <input type="checkbox" checked={selectedTracks.has(t.index)}
                    onChange={() => toggleTrack(t.index)} />
                  <span>Track {t.index + 1}: {t.name}</span>
                </label>
              ))}
            </div>
          )}

          <div className="midi-import-actions">
            <button className="midi-import-btn primary" onClick={importToRoll}>
              🎹 Import to Piano Roll
            </button>
            {fileInfo.channels.includes(9) && (
              <button className="midi-import-btn secondary" onClick={importToSteps}>
                🥁 Import Drums to Step Sequencer
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Export both the component and the parser for direct use
export { MidiParser };
export default MidiImporter;