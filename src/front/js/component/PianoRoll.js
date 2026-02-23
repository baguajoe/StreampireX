// =============================================================================
// PianoRoll.js — FL Studio-Style Piano Roll Editor
// =============================================================================
// Location: src/front/js/component/PianoRoll.js
// Integrates with SamplerBeatMaker and MidiSoundEngine
// Features: Draw/erase/select/resize notes, velocity lane, snap-to-grid,
//           scale highlighting, chord insertion, copy/paste, undo/redo
// =============================================================================

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import '../../styles/PianoRoll.css';

// =============================================================================
// CONSTANTS
// =============================================================================

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const TOTAL_NOTES = 88; // Piano range: A0 (21) to C8 (108)
const LOWEST_NOTE = 21;
const HIGHEST_NOTE = 108;
const NOTE_HEIGHT = 14;
const HEADER_WIDTH = 56;
const DEFAULT_VELOCITY = 100;
const SNAP_VALUES = [1, 0.5, 0.25, 0.125, 0.0625]; // whole, half, quarter, 8th, 16th (in beats)
const SNAP_LABELS = ['1 Bar', '1/2', '1/4', '1/8', '1/16'];

const isBlackKey = (midi) => [1, 3, 6, 8, 10].includes(midi % 12);
const midiToName = (midi) => `${NOTE_NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`;

// =============================================================================
// COMPONENT
// =============================================================================

const PianoRoll = ({
  bpm = 120,
  bars = 4,
  beatsPerBar = 4,
  notes: externalNotes,
  onNotesChange,
  onPlayNote,
  onStopNote,
  scaleNotes = null,   // array of pitch classes to highlight
  keyRoot = null,       // root note name for scale display
  scaleName = null,     // scale name for display
  isEmbedded = false,
}) => {
  // State
  const [notes, setNotes] = useState(externalNotes || []);
  const [tool, setTool] = useState('draw'); // draw, erase, select, slice
  const [snapIdx, setSnapIdx] = useState(2); // default 1/4
  const [zoom, setZoom] = useState(1);
  const [scrollX, setScrollX] = useState(0);
  const [scrollY, setScrollY] = useState(0);
  const [selectedNotes, setSelectedNotes] = useState(new Set());
  const [clipboard, setClipboard] = useState([]);
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const [dragState, setDragState] = useState(null);
  const [hoverNote, setHoverNote] = useState(null);
  const [showVelocity, setShowVelocity] = useState(true);
  const [ghostNote, setGhostNote] = useState(null);
  const [playheadBeat, setPlayheadBeat] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const canvasRef = useRef(null);
  const velCanvasRef = useRef(null);
  const containerRef = useRef(null);
  const animRef = useRef(null);
  const playStartRef = useRef(null);
  const audioCtxRef = useRef(null);
  const notesRef = useRef(notes);
  notesRef.current = notes;

  const snap = SNAP_VALUES[snapIdx];
  const totalBeats = bars * beatsPerBar;
  const beatWidth = 60 * zoom;
  const gridWidth = totalBeats * beatWidth;
  const gridHeight = TOTAL_NOTES * NOTE_HEIGHT;
  const velLaneHeight = showVelocity ? 80 : 0;

  // Sync external notes
  useEffect(() => {
    if (externalNotes) setNotes(externalNotes);
  }, [externalNotes]);

  // Notify parent of changes
  useEffect(() => {
    if (onNotesChange) onNotesChange(notes);
  }, [notes, onNotesChange]);

  // ==========================================================================
  // UNDO / REDO
  // ==========================================================================

  const pushUndo = useCallback(() => {
    setUndoStack(prev => [...prev.slice(-50), JSON.stringify(notes)]);
    setRedoStack([]);
  }, [notes]);

  const undo = useCallback(() => {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    setRedoStack(r => [...r, JSON.stringify(notes)]);
    setUndoStack(u => u.slice(0, -1));
    setNotes(JSON.parse(prev));
  }, [undoStack, notes]);

  const redo = useCallback(() => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setUndoStack(u => [...u, JSON.stringify(notes)]);
    setRedoStack(r => r.slice(0, -1));
    setNotes(JSON.parse(next));
  }, [redoStack, notes]);

  // ==========================================================================
  // COORDINATE HELPERS
  // ==========================================================================

  const beatToX = useCallback((beat) => HEADER_WIDTH + beat * beatWidth - scrollX, [beatWidth, scrollX]);
  const xToBeat = useCallback((x) => {
    const raw = (x - HEADER_WIDTH + scrollX) / beatWidth;
    return Math.max(0, Math.round(raw / snap) * snap);
  }, [beatWidth, scrollX, snap]);

  const midiToY = useCallback((midi) => (HIGHEST_NOTE - midi) * NOTE_HEIGHT - scrollY, [scrollY]);
  const yToMidi = useCallback((y) => {
    const midi = HIGHEST_NOTE - Math.floor((y + scrollY) / NOTE_HEIGHT);
    return Math.max(LOWEST_NOTE, Math.min(HIGHEST_NOTE, midi));
  }, [scrollY]);

  // ==========================================================================
  // NOTE OPERATIONS
  // ==========================================================================

  const addNote = useCallback((midi, startBeat, duration = snap, velocity = DEFAULT_VELOCITY) => {
    pushUndo();
    const id = `n_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const newNote = { id, midi, start: startBeat, duration, velocity };
    setNotes(prev => [...prev, newNote]);
    if (onPlayNote) onPlayNote(midi, velocity / 127);
    return id;
  }, [snap, pushUndo, onPlayNote]);

  const removeNote = useCallback((id) => {
    pushUndo();
    setNotes(prev => prev.filter(n => n.id !== id));
    setSelectedNotes(prev => { const s = new Set(prev); s.delete(id); return s; });
  }, [pushUndo]);

  const updateNote = useCallback((id, updates) => {
    setNotes(prev => prev.map(n => n.id === id ? { ...n, ...updates } : n));
  }, []);

  const deleteSelected = useCallback(() => {
    if (selectedNotes.size === 0) return;
    pushUndo();
    setNotes(prev => prev.filter(n => !selectedNotes.has(n.id)));
    setSelectedNotes(new Set());
  }, [selectedNotes, pushUndo]);

  const selectAll = useCallback(() => {
    setSelectedNotes(new Set(notes.map(n => n.id)));
  }, [notes]);

  const copySelected = useCallback(() => {
    const sel = notes.filter(n => selectedNotes.has(n.id));
    if (sel.length === 0) return;
    const minStart = Math.min(...sel.map(n => n.start));
    setClipboard(sel.map(n => ({ ...n, start: n.start - minStart })));
  }, [notes, selectedNotes]);

  const paste = useCallback((atBeat = 0) => {
    if (clipboard.length === 0) return;
    pushUndo();
    const newNotes = clipboard.map(n => ({
      ...n,
      id: `n_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      start: n.start + atBeat,
    }));
    setNotes(prev => [...prev, ...newNotes]);
    setSelectedNotes(new Set(newNotes.map(n => n.id)));
  }, [clipboard, pushUndo]);

  // ==========================================================================
  // HIT TESTING
  // ==========================================================================

  const hitTest = useCallback((x, y) => {
    const beat = (x - HEADER_WIDTH + scrollX) / beatWidth;
    const midi = HIGHEST_NOTE - Math.floor((y + scrollY) / NOTE_HEIGHT);
    for (let i = notes.length - 1; i >= 0; i--) {
      const n = notes[i];
      if (midi === n.midi && beat >= n.start && beat <= n.start + n.duration) {
        const noteEndX = beatToX(n.start + n.duration);
        const isResize = x >= noteEndX - 6;
        return { note: n, index: i, isResize };
      }
    }
    return null;
  }, [notes, beatWidth, scrollX, scrollY, beatToX]);

  // ==========================================================================
  // CANVAS DRAWING
  // ==========================================================================

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Background rows
    for (let midi = LOWEST_NOTE; midi <= HIGHEST_NOTE; midi++) {
      const y = midiToY(midi);
      if (y < -NOTE_HEIGHT || y > h) continue;

      const black = isBlackKey(midi);
      const isScaleNote = scaleNotes ? scaleNotes.includes(midi % 12) : true;
      const isRoot = keyRoot ? (midi % 12 === NOTE_NAMES.indexOf(keyRoot)) : false;

      if (isRoot) {
        ctx.fillStyle = 'rgba(0, 255, 200, 0.08)';
      } else if (!isScaleNote && scaleNotes) {
        ctx.fillStyle = 'rgba(255, 0, 0, 0.03)';
      } else if (black) {
        ctx.fillStyle = '#0d1520';
      } else {
        ctx.fillStyle = '#111a28';
      }
      ctx.fillRect(HEADER_WIDTH, y, w - HEADER_WIDTH, NOTE_HEIGHT);

      // Row line
      ctx.strokeStyle = 'rgba(255,255,255,0.04)';
      ctx.beginPath();
      ctx.moveTo(HEADER_WIDTH, y + NOTE_HEIGHT);
      ctx.lineTo(w, y + NOTE_HEIGHT);
      ctx.stroke();
    }

    // Beat grid lines
    for (let beat = 0; beat <= totalBeats; beat += snap) {
      const x = beatToX(beat);
      if (x < HEADER_WIDTH || x > w) continue;
      const isBar = beat % beatsPerBar === 0;
      const isBeat = Number.isInteger(beat);
      ctx.strokeStyle = isBar ? 'rgba(0,255,200,0.25)' : isBeat ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.04)';
      ctx.lineWidth = isBar ? 1.5 : 0.5;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }

    // Bar numbers
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '10px monospace';
    for (let bar = 0; bar < bars; bar++) {
      const x = beatToX(bar * beatsPerBar);
      if (x >= HEADER_WIDTH) ctx.fillText(`${bar + 1}`, x + 3, 11);
    }

    // Piano keys (left header)
    for (let midi = LOWEST_NOTE; midi <= HIGHEST_NOTE; midi++) {
      const y = midiToY(midi);
      if (y < -NOTE_HEIGHT || y > h) continue;
      const black = isBlackKey(midi);
      ctx.fillStyle = black ? '#1a1a2e' : '#252540';
      ctx.fillRect(0, y, HEADER_WIDTH - 1, NOTE_HEIGHT);
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.strokeRect(0, y, HEADER_WIDTH - 1, NOTE_HEIGHT);

      if (midi % 12 === 0) {
        ctx.fillStyle = '#00ffc8';
        ctx.font = 'bold 9px monospace';
        ctx.fillText(midiToName(midi), 4, y + NOTE_HEIGHT - 3);
      } else if (!black) {
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.font = '8px monospace';
        ctx.fillText(NOTE_NAMES[midi % 12], 4, y + NOTE_HEIGHT - 3);
      }
    }

    // Notes
    for (const note of notes) {
      const x = beatToX(note.start);
      const y = midiToY(note.midi);
      const w2 = note.duration * beatWidth;

      if (x + w2 < HEADER_WIDTH || x > w || y < -NOTE_HEIGHT || y > h) continue;

      const selected = selectedNotes.has(note.id);
      const velAlpha = 0.5 + (note.velocity / 127) * 0.5;

      // Note body
      ctx.fillStyle = selected
        ? `rgba(255, 102, 0, ${velAlpha})`
        : `rgba(0, 255, 200, ${velAlpha})`;
      ctx.fillRect(Math.max(x, HEADER_WIDTH), y + 1, w2 - 1, NOTE_HEIGHT - 2);

      // Border
      ctx.strokeStyle = selected ? '#FF6600' : '#00ffc8';
      ctx.lineWidth = selected ? 2 : 1;
      ctx.strokeRect(Math.max(x, HEADER_WIDTH), y + 1, w2 - 1, NOTE_HEIGHT - 2);

      // Resize handle
      if (w2 > 10) {
        ctx.fillStyle = selected ? '#FF6600' : '#00ffc8';
        ctx.fillRect(x + w2 - 5, y + 1, 4, NOTE_HEIGHT - 2);
      }

      // Note name inside
      if (w2 > 30) {
        ctx.fillStyle = '#000';
        ctx.font = '9px monospace';
        ctx.fillText(midiToName(note.midi), Math.max(x + 3, HEADER_WIDTH + 3), y + NOTE_HEIGHT - 4);
      }
    }

    // Ghost note preview
    if (ghostNote && tool === 'draw') {
      const gx = beatToX(ghostNote.start);
      const gy = midiToY(ghostNote.midi);
      const gw = snap * beatWidth;
      ctx.fillStyle = 'rgba(0, 255, 200, 0.2)';
      ctx.fillRect(Math.max(gx, HEADER_WIDTH), gy + 1, gw - 1, NOTE_HEIGHT - 2);
      ctx.strokeStyle = 'rgba(0, 255, 200, 0.5)';
      ctx.setLineDash([3, 3]);
      ctx.strokeRect(Math.max(gx, HEADER_WIDTH), gy + 1, gw - 1, NOTE_HEIGHT - 2);
      ctx.setLineDash([]);
    }

    // Playhead
    if (playheadBeat > 0) {
      const px = beatToX(playheadBeat);
      ctx.strokeStyle = '#ff4757';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(px, 0);
      ctx.lineTo(px, h);
      ctx.stroke();
    }

    // Selection box
    if (dragState?.type === 'select-box') {
      const sx = Math.min(dragState.startX, dragState.currentX);
      const sy = Math.min(dragState.startY, dragState.currentY);
      const sw = Math.abs(dragState.currentX - dragState.startX);
      const sh = Math.abs(dragState.currentY - dragState.startY);
      ctx.fillStyle = 'rgba(0, 255, 200, 0.1)';
      ctx.fillRect(sx, sy, sw, sh);
      ctx.strokeStyle = 'rgba(0, 255, 200, 0.5)';
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(sx, sy, sw, sh);
      ctx.setLineDash([]);
    }
  }, [notes, selectedNotes, beatWidth, totalBeats, bars, beatsPerBar, snap, zoom,
      scrollX, scrollY, tool, ghostNote, playheadBeat, scaleNotes, keyRoot,
      beatToX, midiToY]);

  // Velocity lane
  const drawVelocity = useCallback(() => {
    const canvas = velCanvasRef.current;
    if (!canvas || !showVelocity) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    ctx.fillStyle = '#0a0f1a';
    ctx.fillRect(0, 0, w, h);

    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    for (let beat = 0; beat <= totalBeats; beat++) {
      const x = beatToX(beat);
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }

    // Velocity bars
    for (const note of notes) {
      const x = beatToX(note.start);
      const barW = Math.max(4, note.duration * beatWidth - 2);
      const barH = (note.velocity / 127) * (h - 4);
      const selected = selectedNotes.has(note.id);

      ctx.fillStyle = selected ? '#FF6600' : `hsl(${160 + (note.velocity / 127) * 40}, 100%, ${40 + (note.velocity / 127) * 30}%)`;
      ctx.fillRect(x, h - barH - 2, barW, barH);
    }

    // Labels
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = '9px monospace';
    ctx.fillText('VEL', 4, 12);
    ctx.fillText('127', 4, 22);
    ctx.fillText('0', 4, h - 4);
  }, [notes, selectedNotes, showVelocity, totalBeats, beatWidth, beatToX]);

  // Render loop
  useEffect(() => {
    draw();
    drawVelocity();
  }, [draw, drawVelocity]);

  // ==========================================================================
  // MOUSE HANDLERS
  // ==========================================================================

  const handleMouseDown = useCallback((e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (x < HEADER_WIDTH) {
      // Clicked on piano keys — preview note
      const midi = yToMidi(y);
      if (onPlayNote) onPlayNote(midi, 0.8);
      return;
    }

    const hit = hitTest(x, y);

    if (tool === 'draw') {
      if (hit && !hit.isResize) {
        // Start dragging existing note
        pushUndo();
        setDragState({ type: 'move', noteId: hit.note.id, startX: x, startY: y,
          origStart: hit.note.start, origMidi: hit.note.midi });
        setSelectedNotes(new Set([hit.note.id]));
      } else if (hit && hit.isResize) {
        pushUndo();
        setDragState({ type: 'resize', noteId: hit.note.id, startX: x, origDuration: hit.note.duration });
        setSelectedNotes(new Set([hit.note.id]));
      } else {
        const beat = xToBeat(x);
        const midi = yToMidi(y);
        const id = addNote(midi, beat);
        setDragState({ type: 'draw-extend', noteId: id, startBeat: beat });
        setSelectedNotes(new Set([id]));
      }
    } else if (tool === 'erase') {
      if (hit) removeNote(hit.note.id);
    } else if (tool === 'select') {
      if (hit) {
        if (e.shiftKey) {
          setSelectedNotes(prev => {
            const s = new Set(prev);
            s.has(hit.note.id) ? s.delete(hit.note.id) : s.add(hit.note.id);
            return s;
          });
        } else {
          if (!selectedNotes.has(hit.note.id)) setSelectedNotes(new Set([hit.note.id]));
          if (hit.isResize) {
            pushUndo();
            setDragState({ type: 'resize', noteId: hit.note.id, startX: x, origDuration: hit.note.duration });
          } else {
            pushUndo();
            setDragState({ type: 'move-selected', startX: x, startY: y,
              origPositions: notes.filter(n => selectedNotes.has(n.id)).map(n => ({ id: n.id, start: n.start, midi: n.midi })) });
          }
        }
      } else {
        if (!e.shiftKey) setSelectedNotes(new Set());
        setDragState({ type: 'select-box', startX: x, startY: y, currentX: x, currentY: y });
      }
    }
  }, [tool, hitTest, xToBeat, yToMidi, addNote, removeNote, pushUndo, selectedNotes, notes, onPlayNote]);

  const handleMouseMove = useCallback((e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (x > HEADER_WIDTH && tool === 'draw' && !dragState) {
      setGhostNote({ midi: yToMidi(y), start: xToBeat(x) });
    } else {
      setGhostNote(null);
    }

    if (!dragState) return;

    if (dragState.type === 'move') {
      const dx = (x - dragState.startX) / beatWidth;
      const dy = Math.round((dragState.startY - y) / NOTE_HEIGHT);
      const newStart = Math.max(0, Math.round((dragState.origStart + dx) / snap) * snap);
      const newMidi = Math.max(LOWEST_NOTE, Math.min(HIGHEST_NOTE, dragState.origMidi + dy));
      updateNote(dragState.noteId, { start: newStart, midi: newMidi });
    } else if (dragState.type === 'resize') {
      const dx = (x - dragState.startX) / beatWidth;
      const newDur = Math.max(snap, Math.round((dragState.origDuration + dx) / snap) * snap);
      updateNote(dragState.noteId, { duration: newDur });
    } else if (dragState.type === 'draw-extend') {
      const currentBeat = xToBeat(x);
      const dur = Math.max(snap, currentBeat - dragState.startBeat);
      updateNote(dragState.noteId, { duration: Math.round(dur / snap) * snap });
    } else if (dragState.type === 'move-selected') {
      const dx = (x - dragState.startX) / beatWidth;
      const dy = Math.round((dragState.startY - y) / NOTE_HEIGHT);
      for (const orig of dragState.origPositions) {
        const newStart = Math.max(0, Math.round((orig.start + dx) / snap) * snap);
        const newMidi = Math.max(LOWEST_NOTE, Math.min(HIGHEST_NOTE, orig.midi + dy));
        updateNote(orig.id, { start: newStart, midi: newMidi });
      }
    } else if (dragState.type === 'select-box') {
      setDragState(prev => ({ ...prev, currentX: x, currentY: y }));
    }
  }, [dragState, tool, beatWidth, snap, xToBeat, yToMidi, updateNote]);

  const handleMouseUp = useCallback(() => {
    if (dragState?.type === 'select-box') {
      const sx = Math.min(dragState.startX, dragState.currentX);
      const sy = Math.min(dragState.startY, dragState.currentY);
      const ex = Math.max(dragState.startX, dragState.currentX);
      const ey = Math.max(dragState.startY, dragState.currentY);

      const selected = new Set();
      for (const note of notes) {
        const nx = beatToX(note.start);
        const ny = midiToY(note.midi);
        const nw = note.duration * beatWidth;
        if (nx + nw > sx && nx < ex && ny + NOTE_HEIGHT > sy && ny < ey) {
          selected.add(note.id);
        }
      }
      setSelectedNotes(selected);
    }
    setDragState(null);
  }, [dragState, notes, beatToX, midiToY, beatWidth]);

  // Velocity lane mouse
  const handleVelMouseDown = useCallback((e) => {
    const rect = velCanvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const h = rect.height;

    const beat = (x - HEADER_WIDTH + scrollX) / beatWidth;
    for (const note of notes) {
      if (beat >= note.start && beat <= note.start + note.duration) {
        const newVel = Math.round(Math.max(1, Math.min(127, (1 - y / h) * 127)));
        pushUndo();
        updateNote(note.id, { velocity: newVel });
        break;
      }
    }
  }, [notes, beatWidth, scrollX, pushUndo, updateNote]);

  // ==========================================================================
  // KEYBOARD SHORTCUTS
  // ==========================================================================

  useEffect(() => {
    const handleKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undo(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') { e.preventDefault(); redo(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') { e.preventDefault(); selectAll(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') { e.preventDefault(); copySelected(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') { e.preventDefault(); paste(playheadBeat); }
      if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); deleteSelected(); }
      if (e.key === '1') setTool('draw');
      if (e.key === '2') setTool('erase');
      if (e.key === '3') setTool('select');
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [undo, redo, selectAll, copySelected, paste, deleteSelected, playheadBeat]);

  // ==========================================================================
  // SCROLL
  // ==========================================================================

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      setZoom(prev => Math.max(0.25, Math.min(4, prev + (e.deltaY > 0 ? -0.1 : 0.1))));
    } else if (e.shiftKey) {
      setScrollX(prev => Math.max(0, prev + e.deltaY));
    } else {
      setScrollY(prev => Math.max(0, Math.min(gridHeight - 400, prev + e.deltaY)));
    }
  }, [gridHeight]);

  // ==========================================================================
  // CANVAS RESIZE
  // ==========================================================================

  useEffect(() => {
    const resize = () => {
      if (!containerRef.current || !canvasRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      canvasRef.current.width = rect.width;
      canvasRef.current.height = rect.height - velLaneHeight;
      if (velCanvasRef.current) {
        velCanvasRef.current.width = rect.width;
        velCanvasRef.current.height = velLaneHeight;
      }
      draw();
      drawVelocity();
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [velLaneHeight, draw, drawVelocity]);

  // Center scroll to middle C on mount
  useEffect(() => {
    setScrollY((60 - LOWEST_NOTE) * NOTE_HEIGHT - 200);
  }, []);

  // ==========================================================================
  // PLAYBACK
  // ==========================================================================

  const togglePlayback = useCallback(() => {
    if (isPlaying) {
      setIsPlaying(false);
      cancelAnimationFrame(animRef.current);
      setPlayheadBeat(0);
      return;
    }
    setIsPlaying(true);
    playStartRef.current = performance.now();
    const playedNotes = new Set();

    const tick = () => {
      const elapsed = (performance.now() - playStartRef.current) / 1000;
      const currentBeat = (elapsed / 60) * bpm;

      if (currentBeat >= totalBeats) {
        setIsPlaying(false);
        setPlayheadBeat(0);
        return;
      }

      setPlayheadBeat(currentBeat);

      // Trigger notes
      for (const note of notesRef.current) {
        const noteKey = note.id;
        if (!playedNotes.has(noteKey) && currentBeat >= note.start && currentBeat < note.start + note.duration) {
          playedNotes.add(noteKey);
          if (onPlayNote) onPlayNote(note.midi, note.velocity / 127);
        }
        if (playedNotes.has(noteKey) && currentBeat >= note.start + note.duration) {
          if (onStopNote) onStopNote(note.midi);
        }
      }

      animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);
  }, [isPlaying, bpm, totalBeats, onPlayNote, onStopNote]);

  // Cleanup
  useEffect(() => {
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, []);

  // ==========================================================================
  // INSERT CHORDS
  // ==========================================================================

  const insertChords = useCallback((chords) => {
    if (!chords || chords.length === 0) return;
    pushUndo();
    const newNotes = [];
    for (const chord of chords) {
      for (const midi of chord.midi_notes) {
        newNotes.push({
          id: `n_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          midi,
          start: chord.start_beat,
          duration: chord.duration_beats,
          velocity: chord.velocity || DEFAULT_VELOCITY,
        });
      }
    }
    setNotes(prev => [...prev, ...newNotes]);
  }, [pushUndo]);

  // Expose insertChords for parent
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.insertChords = insertChords;
    }
  }, [insertChords]);

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <div className={`piano-roll ${isEmbedded ? 'embedded' : ''}`} ref={containerRef}>
      {/* Toolbar */}
      <div className="pr-toolbar">
        <div className="pr-toolbar-left">
          <div className="pr-tool-group">
            <button className={`pr-tool-btn ${tool === 'draw' ? 'active' : ''}`}
              onClick={() => setTool('draw')} title="Draw (1)">✏️</button>
            <button className={`pr-tool-btn ${tool === 'erase' ? 'active' : ''}`}
              onClick={() => setTool('erase')} title="Erase (2)">🗑️</button>
            <button className={`pr-tool-btn ${tool === 'select' ? 'active' : ''}`}
              onClick={() => setTool('select')} title="Select (3)">◻️</button>
          </div>

          <div className="pr-divider" />

          <div className="pr-tool-group">
            <button className={`pr-transport-btn ${isPlaying ? 'playing' : ''}`}
              onClick={togglePlayback}>{isPlaying ? '⏹' : '▶'}</button>
          </div>

          <div className="pr-divider" />

          <div className="pr-tool-group">
            <label className="pr-snap-label">Snap:</label>
            <select className="pr-select" value={snapIdx}
              onChange={e => setSnapIdx(Number(e.target.value))}>
              {SNAP_LABELS.map((l, i) => <option key={i} value={i}>{l}</option>)}
            </select>
          </div>

          <div className="pr-tool-group">
            <label className="pr-snap-label">Bars:</label>
            <select className="pr-select" value={bars} disabled>
              {[2, 4, 8, 16, 32].map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
        </div>

        <div className="pr-toolbar-right">
          {keyRoot && scaleName && (
            <span className="pr-key-display">🎵 {keyRoot} {scaleName}</span>
          )}
          <button className={`pr-tool-btn small ${showVelocity ? 'active' : ''}`}
            onClick={() => setShowVelocity(!showVelocity)} title="Toggle Velocity Lane">VEL</button>
          <div className="pr-zoom-group">
            <button className="pr-tool-btn small" onClick={() => setZoom(z => Math.max(0.25, z - 0.25))}>−</button>
            <span className="pr-zoom-label">{Math.round(zoom * 100)}%</span>
            <button className="pr-tool-btn small" onClick={() => setZoom(z => Math.min(4, z + 0.25))}>+</button>
          </div>
          <span className="pr-note-count">{notes.length} notes</span>
        </div>
      </div>

      {/* Main Canvas */}
      <canvas
        ref={canvasRef}
        className="pr-canvas"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onContextMenu={e => e.preventDefault()}
      />

      {/* Velocity Lane */}
      {showVelocity && (
        <canvas
          ref={velCanvasRef}
          className="pr-vel-canvas"
          onMouseDown={handleVelMouseDown}
        />
      )}

      {/* Status Bar */}
      <div className="pr-statusbar">
        <span>{tool.toUpperCase()}</span>
        <span>|</span>
        <span>BPM: {bpm}</span>
        <span>|</span>
        <span>Selected: {selectedNotes.size}</span>
        <span>|</span>
        <span>Ctrl+Z/Y: Undo/Redo | Del: Delete | Ctrl+A/C/V: Select/Copy/Paste</span>
      </div>
    </div>
  );
};

export default PianoRoll;