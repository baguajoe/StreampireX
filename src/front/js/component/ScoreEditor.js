// =============================================================================
// ScoreEditor.js — MIDI Score Editor with Video Scoring
// =============================================================================
// Features:
//   - Standard notation (treble/bass clef) via VexFlow
//   - Bidirectional Piano Roll ↔ Score sync
//   - Video import + timecode ruler + hit point markers
//   - Fit-to-picture tempo mapping
//   - Export: MusicXML, PDF (via jsPDF), MIDI
//   - Video + audio export (server-side FFmpeg)
// =============================================================================

import React, {
  useState, useEffect, useRef, useCallback, useMemo
} from 'react';

// ── VexFlow loaded via CDN (added to index.html) ──────────────────────────────
// <script src="https://cdn.jsdelivr.net/npm/vexflow@4.2.2/build/cjs/vexflow.js"></script>

const NOTE_NAMES   = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const DURATION_MAP = { 4:' w', 2:'h', 1:'q', 0.5:'8', 0.25:'16', 0.125:'32' };
const CLEF_SPLIT   = 60; // middle C — above = treble, below = bass

// ── helpers ───────────────────────────────────────────────────────────────────
const midiToVex = (midi) => {
  const name   = NOTE_NAMES[midi % 12].toLowerCase().replace('#', '#');
  const octave = Math.floor(midi / 12) - 1;
  return `${name}/${octave}`;
};

const beatsToSeconds = (beats, bpm) => (beats / bpm) * 60;
const secondsToBeats = (sec, bpm)   => (sec * bpm) / 60;

const snapDuration = (dur) => {
  const vals = [4, 2, 1, 0.5, 0.25, 0.125];
  return vals.reduce((prev, curr) =>
    Math.abs(curr - dur) < Math.abs(prev - dur) ? curr : prev
  );
};

// =============================================================================
// ScoreEditor
// =============================================================================
export default function ScoreEditor({
  notes           = [],          // [{id, midi, startBeat, duration, velocity}]
  onNotesChange   = () => {},
  bpm             = 120,
  onBpmChange     = () => {},
  timeSignature   = [4, 4],
  onTsChange      = () => {},
  keySignature    = 'C',
  onKeyChange     = () => {},
  currentBeat     = 0,
  onSeek          = () => {},
  onExportMidi    = () => {},
  backendUrl      = '',
}) {
  // ── state ──────────────────────────────────────────────────────────────────
  const [tool,        setTool]        = useState('select');   // select | pencil | eraser
  const [zoom,        setZoom]        = useState(1);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [history,     setHistory]     = useState([notes]);
  const [histIdx,     setHistIdx]     = useState(0);

  // video scoring
  const [videoFile,    setVideoFile]    = useState(null);
  const [videoUrl,     setVideoUrl]     = useState(null);
  const [hitPoints,    setHitPoints]    = useState([]);   // [{beat, label}]
  const [showVideo,    setShowVideo]    = useState(true);
  const [exportStatus, setExportStatus] = useState('');
  const [showXmlModal, setShowXmlModal] = useState(false);
  const [xmlContent,   setXmlContent]   = useState('');

  const canvasRef  = useRef(null);
  const videoRef   = useRef(null);
  const animRef    = useRef(null);
  const vfRef      = useRef(null);   // VexFlow renderer

  // ── push to history ────────────────────────────────────────────────────────
  const pushHistory = useCallback((newNotes) => {
    setHistory(h => {
      const trimmed = h.slice(0, histIdx + 1);
      return [...trimmed, newNotes];
    });
    setHistIdx(i => i + 1);
    onNotesChange(newNotes);
  }, [histIdx, onNotesChange]);

  const undo = () => {
    if (histIdx <= 0) return;
    const idx = histIdx - 1;
    setHistIdx(idx);
    onNotesChange(history[idx]);
  };
  const redo = () => {
    if (histIdx >= history.length - 1) return;
    const idx = histIdx + 1;
    setHistIdx(idx);
    onNotesChange(history[idx]);
  };

  // ── sync video to beat ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!videoRef.current || !videoUrl) return;
    const targetSec = beatsToSeconds(currentBeat, bpm);
    if (Math.abs(videoRef.current.currentTime - targetSec) > 0.1) {
      videoRef.current.currentTime = targetSec;
    }
  }, [currentBeat, bpm, videoUrl]);

  // ── render VexFlow score ───────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (typeof window.Vex === 'undefined') return;

    const Vex       = window.Vex;
    const Renderer  = Vex.Flow.Renderer;
    const Stave     = Vex.Flow.Stave;
    const StaveNote = Vex.Flow.StaveNote;
    const Voice     = Vex.Flow.Voice;
    const Formatter = Vex.Flow.Formatter;
    const Beam      = Vex.Flow.Beam;

    const [beatsPerBar, beatUnit] = timeSignature;
    const totalBeats = notes.length
      ? Math.ceil(Math.max(...notes.map(n => n.startBeat + n.duration)) / beatsPerBar) * beatsPerBar
      : beatsPerBar * 4;
    const numBars    = Math.max(4, Math.ceil(totalBeats / beatsPerBar));
    const barWidth   = 220 * zoom;
    const staveX     = 60;
    const staveY_T   = 20;
    const staveY_B   = 110;
    const systemH    = 200;
    const barsPerRow = Math.max(1, Math.floor((canvas.parentElement?.clientWidth - staveX - 20) / barWidth) || 4);
    const numRows    = Math.ceil(numBars / barsPerRow);

    canvas.width  = staveX + barsPerRow * barWidth + 40;
    canvas.height = numRows * systemH + 40;

    const renderer = new Renderer(canvas, Renderer.Backends.CANVAS);
    renderer.resize(canvas.width, canvas.height);
    const ctx = renderer.getContext();
    ctx.setFillStyle(getComputedStyle(document.documentElement).getPropertyValue('--bg-primary') || '#06060f');
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setFillStyle('#e0e0e0');
    ctx.setStrokeStyle('#e0e0e0');

    for (let row = 0; row < numRows; row++) {
      for (let col = 0; col < barsPerRow; col++) {
        const barIdx = row * barsPerRow + col;
        if (barIdx >= numBars) break;

        const x     = staveX + col * barWidth;
        const yT    = row * systemH + staveY_T;
        const yB    = row * systemH + staveY_B;
        const isFirst = barIdx === 0;

        // ── staves ──
        const treble = new Stave(x, yT, barWidth);
        const bass   = new Stave(x, yB, barWidth);

        if (isFirst && col === 0) {
          treble.addClef('treble').addKeySignature(keySignature).addTimeSignature(`${beatsPerBar}/${beatUnit}`);
          bass.addClef('bass').addKeySignature(keySignature).addTimeSignature(`${beatsPerBar}/${beatUnit}`);
        }
        treble.setContext(ctx).draw();
        bass.setContext(ctx).draw();

        // ── gather notes for this bar ──
        const barStart = barIdx * beatsPerBar;
        const barEnd   = barStart + beatsPerBar;
        const barNotes = notes.filter(n =>
          n.startBeat >= barStart && n.startBeat < barEnd
        );

        const buildVoice = (clef, midiMin, midiMax) => {
          const clefNotes = barNotes.filter(n => n.midi >= midiMin && n.midi < midiMax);
          const vexNotes  = [];

          // fill bar with rests + real notes
          let cursor = barStart;
          const sorted = [...clefNotes].sort((a, b) => a.startBeat - b.startBeat);

          for (const n of sorted) {
            const gap = n.startBeat - cursor;
            if (gap > 0) {
              const rd = snapDuration(gap);
              vexNotes.push(new StaveNote({
                clef,
                keys: [clef === 'treble' ? 'b/4' : 'd/3'],
                duration: DURATION_MAP[rd] + 'r',
              }));
            }
            const nd = snapDuration(n.duration);
            const sn = new StaveNote({
              clef,
              keys: [midiToVex(n.midi)],
              duration: DURATION_MAP[nd],
            });
            if (selectedIds.has(n.id)) {
              sn.setStyle({ fillStyle: '#00ffc8', strokeStyle: '#00ffc8' });
            }
            vexNotes.push(sn);
            cursor = n.startBeat + n.duration;
          }

          // fill remaining
          const remaining = barEnd - cursor;
          if (remaining > 0.01) {
            const rd = snapDuration(remaining);
            vexNotes.push(new StaveNote({
              clef,
              keys: [clef === 'treble' ? 'b/4' : 'd/3'],
              duration: DURATION_MAP[rd] + 'r',
            }));
          }

          if (!vexNotes.length) {
            vexNotes.push(new StaveNote({
              clef,
              keys: [clef === 'treble' ? 'b/4' : 'd/3'],
              duration: 'wr',
            }));
          }

          const voice = new Voice({ num_beats: beatsPerBar, beat_value: beatUnit });
          try { voice.addTickables(vexNotes); } catch (e) { /* beat mismatch */ }
          return { voice, vexNotes };
        };

        const { voice: tVoice, vexNotes: tNotes } = buildVoice('treble', CLEF_SPLIT, 128);
        const { voice: bVoice, vexNotes: bNotes } = buildVoice('bass', 0, CLEF_SPLIT);

        try {
          new Formatter()
            .joinVoices([tVoice])
            .joinVoices([bVoice])
            .format([tVoice, bVoice], barWidth - 20);
          tVoice.draw(ctx, treble);
          bVoice.draw(ctx, bass);
          Beam.generateBeams(tNotes).forEach(b => b.setContext(ctx).draw());
          Beam.generateBeams(bNotes).forEach(b => b.setContext(ctx).draw());
        } catch (e) { /* skip malformed bar */ }

        // ── draw playhead ──
        if (currentBeat >= barStart && currentBeat < barEnd) {
          const frac = (currentBeat - barStart) / beatsPerBar;
          const px   = x + frac * barWidth;
          ctx.save();
          ctx.beginPath();
          ctx.moveTo(px, yT);
          ctx.lineTo(px, yB + 40);
          ctx.strokeStyle = '#00ffc8';
          ctx.lineWidth   = 2;
          ctx.stroke();
          ctx.restore();
        }

        // ── draw hit points ──
        hitPoints
          .filter(h => h.beat >= barStart && h.beat < barEnd)
          .forEach(h => {
            const frac = (h.beat - barStart) / beatsPerBar;
            const px   = x + frac * barWidth;
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(px, yT - 10);
            ctx.lineTo(px, yT);
            ctx.strokeStyle = '#FF6600';
            ctx.lineWidth   = 2;
            ctx.stroke();
            ctx.fillStyle = '#FF6600';
            ctx.font      = '9px JetBrains Mono, monospace';
            ctx.fillText(h.label || '●', px + 2, yT - 2);
            ctx.restore();
          });
      }
    }
  }, [notes, bpm, timeSignature, keySignature, zoom, selectedIds, currentBeat, hitPoints]);

  // ── canvas click → pencil/eraser/select ───────────────────────────────────
  const handleCanvasClick = useCallback((e) => {
    if (tool === 'pencil') {
      const rect  = canvasRef.current.getBoundingClientRect();
      const x     = e.clientX - rect.left;
      const y     = e.clientY - rect.top;

      const [beatsPerBar] = timeSignature;
      const barWidth   = 220 * zoom;
      const staveX     = 60;
      const systemH    = 200;
      const barsPerRow = Math.max(1, Math.floor((canvasRef.current.parentElement?.clientWidth - staveX - 20) / barWidth) || 4);

      const row    = Math.floor(y / systemH);
      const col    = Math.floor((x - staveX) / barWidth);
      const barIdx = row * barsPerRow + col;
      const frac   = ((x - staveX) % barWidth) / barWidth;
      const beat   = barIdx * beatsPerBar + frac * beatsPerBar;

      // y → midi: treble stave y=20-80, bass y=110-170
      const relY = y % systemH;
      let midi = 60;
      if (relY < 90) {
        midi = Math.round(84 - ((relY - 20) / 60) * 24);
      } else {
        midi = Math.round(60 - ((relY - 110) / 60) * 24);
      }
      midi = Math.max(21, Math.min(108, midi));

      const newNote = {
        id:        `n_${Date.now()}`,
        midi,
        startBeat: Math.round(beat * 4) / 4,
        duration:  0.5,
        velocity:  100,
      };
      pushHistory([...notes, newNote]);
    }
  }, [tool, notes, pushHistory, timeSignature, zoom]);

  // ── video file drop ────────────────────────────────────────────────────────
  const handleVideoDrop = useCallback((e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file || !file.type.startsWith('video/')) return;
    setVideoFile(file);
    setVideoUrl(URL.createObjectURL(file));
  }, []);

  const handleVideoInput = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setVideoFile(file);
    setVideoUrl(URL.createObjectURL(file));
  };

  // ── add hit point at current beat ─────────────────────────────────────────
  const addHitPoint = () => {
    const label = `HP${hitPoints.length + 1}`;
    setHitPoints(prev => [...prev, { beat: currentBeat, label }]);
  };

  // ── fit to picture: tempo map so score ends with video ────────────────────
  const fitToPicture = () => {
    if (!videoRef.current || !notes.length) return;
    const videoDur  = videoRef.current.duration;
    const totalBeats = Math.max(...notes.map(n => n.startBeat + n.duration));
    if (!totalBeats) return;
    const newBpm = Math.round((totalBeats / videoDur) * 60);
    onBpmChange(Math.max(40, Math.min(300, newBpm)));
  };

  // ── export MusicXML ────────────────────────────────────────────────────────
  const exportMusicXML = useCallback(() => {
    const [beatsPerBar, beatUnit] = timeSignature;
    const divisions = 4;

    const durToType = (d) => {
      if (d >= 4)    return 'whole';
      if (d >= 2)    return 'half';
      if (d >= 1)    return 'quarter';
      if (d >= 0.5)  return 'eighth';
      if (d >= 0.25) return '16th';
      return '32nd';
    };

    const midiToPitch = (midi) => {
      const names   = ['C','C','D','D','E','F','F','G','G','A','A','B'];
      const alters  = [0,1,0,1,0,0,1,0,1,0,1,0];
      const step    = names[midi % 12];
      const alter   = alters[midi % 12];
      const octave  = Math.floor(midi / 12) - 1;
      return `<pitch><step>${step}</step>${alter ? `<alter>${alter}</alter>` : ''}<octave>${octave}</octave></pitch>`;
    };

    const totalBeats = notes.length
      ? Math.ceil(Math.max(...notes.map(n => n.startBeat + n.duration)) / beatsPerBar) * beatsPerBar
      : beatsPerBar;
    const numBars = Math.max(1, Math.ceil(totalBeats / beatsPerBar));

    let measures = '';
    for (let b = 0; b < numBars; b++) {
      const barStart  = b * beatsPerBar;
      const barEnd    = barStart + beatsPerBar;
      const barNotes  = [...notes]
        .filter(n => n.startBeat >= barStart && n.startBeat < barEnd)
        .sort((a, c) => a.startBeat - c.startBeat);

      let noteXml = '';
      let cursor  = barStart;

      for (const n of barNotes) {
        const gap = n.startBeat - cursor;
        if (gap > 0.01) {
          const rd = snapDuration(gap);
          noteXml += `<note><rest/><duration>${Math.round(rd * divisions)}</duration><type>${durToType(rd)}</type></note>`;
        }
        const nd = snapDuration(n.duration);
        noteXml += `<note>${midiToPitch(n.midi)}<duration>${Math.round(nd * divisions)}</duration><type>${durToType(nd)}</type><dynamics>${n.velocity}</dynamics></note>`;
        cursor = n.startBeat + n.duration;
      }

      const rem = barEnd - cursor;
      if (rem > 0.01) {
        const rd = snapDuration(rem);
        noteXml += `<note><rest/><duration>${Math.round(rd * divisions)}</duration><type>${durToType(rd)}</type></note>`;
      }

      const attrs = b === 0 ? `<attributes>
        <divisions>${divisions}</divisions>
        <key><fifths>0</fifths></key>
        <time><beats>${beatsPerBar}</beats><beat-type>${beatUnit}</beat-type></time>
        <clef><sign>G</sign><line>2</line></clef>
      </attributes>
      <direction><direction-type><metronome><beat-unit>quarter</beat-unit><per-minute>${bpm}</per-minute></metronome></direction-type></direction>` : '';

      measures += `<measure number="${b + 1}">${attrs}${noteXml}</measure>`;
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 4.0 Partwise//EN"
  "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="4.0">
  <work><work-title>StreamPireX Score</work-title></work>
  <identification><encoding><software>StreamPireX</software></encoding></identification>
  <part-list><score-part id="P1"><part-name>Music</part-name></score-part></part-list>
  <part id="P1">${measures}</part>
</score-partwise>`;

    setXmlContent(xml);
    setShowXmlModal(true);

    const blob = new Blob([xml], { type: 'application/xml' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = 'score.musicxml';
    a.click();
    URL.revokeObjectURL(url);
  }, [notes, bpm, timeSignature]);

  // ── export PDF (canvas snapshot) ──────────────────────────────────────────
  const exportPDF = useCallback(async () => {
    if (!canvasRef.current) return;
    setExportStatus('Generating PDF…');
    try {
      const { jsPDF } = await import('jspdf');
      const imgData   = canvasRef.current.toDataURL('image/png');
      const pdf       = new jsPDF({ orientation: 'landscape', unit: 'px', format: [canvasRef.current.width, canvasRef.current.height] });
      pdf.addImage(imgData, 'PNG', 0, 0, canvasRef.current.width, canvasRef.current.height);
      pdf.save('score.pdf');
      setExportStatus('PDF exported ✓');
    } catch (e) {
      setExportStatus('PDF export failed — ' + e.message);
    }
  }, []);

  // ── export video + score audio ─────────────────────────────────────────────
  const exportVideoWithScore = useCallback(async () => {
    if (!videoFile) { setExportStatus('No video loaded'); return; }
    setExportStatus('Uploading to render…');
    try {
      const fd = new FormData();
      fd.append('video', videoFile);
      fd.append('notes', JSON.stringify(notes));
      fd.append('bpm',   bpm);
      fd.append('time_signature', JSON.stringify(timeSignature));
      const res  = await fetch(`${backendUrl}/api/score/export-video`, { method: 'POST', body: fd });
      const data = await res.json();
      if (data.url) {
        const a    = document.createElement('a');
        a.href     = data.url;
        a.download = 'scored_video.mp4';
        a.click();
        setExportStatus('Video exported ✓');
      } else {
        setExportStatus('Error: ' + (data.error || 'unknown'));
      }
    } catch (e) {
      setExportStatus('Export failed: ' + e.message);
    }
  }, [videoFile, notes, bpm, timeSignature, backendUrl]);

  // ── keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z') { e.preventDefault(); undo(); }
        if (e.key === 'y') { e.preventDefault(); redo(); }
        if (e.key === 'e') { e.preventDefault(); exportMusicXML(); }
      }
      if (e.key === 'p') setTool('pencil');
      if (e.key === 's') setTool('select');
      if (e.key === 'e') setTool('eraser');
      if (e.key === 'h') addHitPoint();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo, exportMusicXML]);

  // ── styles ────────────────────────────────────────────────────────────────
  const S = {
    root: {
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: 'var(--bg-primary, #06060f)',
      color: '#e0e0e0',
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: 12,
      userSelect: 'none',
    },
    toolbar: {
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      padding: '6px 10px',
      background: '#0d0d1a',
      borderBottom: '1px solid #1a1a2e',
      flexWrap: 'wrap',
    },
    btn: (active) => ({
      padding: '3px 10px',
      borderRadius: 4,
      border: `1px solid ${active ? '#00ffc8' : '#333'}`,
      background: active ? 'rgba(0,255,200,0.1)' : '#111',
      color: active ? '#00ffc8' : '#aaa',
      cursor: 'pointer',
      fontSize: 11,
    }),
    sep: { width: 1, height: 20, background: '#222', margin: '0 4px' },
    body: {
      display: 'flex',
      flex: 1,
      overflow: 'hidden',
    },
    scoreArea: {
      flex: 1,
      overflow: 'auto',
      padding: 10,
      cursor: tool === 'pencil' ? 'crosshair' : tool === 'eraser' ? 'cell' : 'default',
    },
    videoPanel: {
      width: 320,
      display: showVideo ? 'flex' : 'none',
      flexDirection: 'column',
      borderLeft: '1px solid #1a1a2e',
      background: '#080810',
      padding: 8,
      gap: 8,
    },
    video: {
      width: '100%',
      borderRadius: 6,
      background: '#000',
    },
    hitList: {
      flex: 1,
      overflowY: 'auto',
      fontSize: 10,
    },
    hitRow: {
      display: 'flex',
      justifyContent: 'space-between',
      padding: '3px 4px',
      borderBottom: '1px solid #111',
    },
    input: {
      background: '#0d0d1a',
      border: '1px solid #333',
      borderRadius: 4,
      color: '#e0e0e0',
      padding: '2px 6px',
      fontSize: 11,
      width: 50,
    },
    label: { color: '#888', fontSize: 10, marginRight: 4 },
    statusBar: {
      padding: '3px 10px',
      background: '#080810',
      borderTop: '1px solid #1a1a2e',
      fontSize: 10,
      color: '#555',
      display: 'flex',
      justifyContent: 'space-between',
    },
  };

  return (
    <div style={S.root}>

      {/* ── Toolbar ── */}
      <div style={S.toolbar}>

        {/* Tools */}
        <button style={S.btn(tool==='select')}  onClick={() => setTool('select')}  title="Select (S)">▸ Select</button>
        <button style={S.btn(tool==='pencil')}  onClick={() => setTool('pencil')}  title="Draw note (P)">✏ Pencil</button>
        <button style={S.btn(tool==='eraser')}  onClick={() => setTool('eraser')}  title="Erase (E)">⌫ Erase</button>

        <div style={S.sep}/>

        {/* Undo/Redo */}
        <button style={S.btn(false)} onClick={undo} title="Undo (Ctrl+Z)">↩</button>
        <button style={S.btn(false)} onClick={redo} title="Redo (Ctrl+Y)">↪</button>

        <div style={S.sep}/>

        {/* BPM */}
        <span style={S.label}>BPM</span>
        <input
          style={S.input}
          type="number"
          value={bpm}
          min={20} max={300}
          onChange={e => onBpmChange(Number(e.target.value))}
        />

        {/* Time Sig */}
        <span style={S.label}>Time</span>
        <select
          style={{...S.input, width:70}}
          value={`${timeSignature[0]}/${timeSignature[1]}`}
          onChange={e => {
            const [n, d] = e.target.value.split('/').map(Number);
            onTsChange([n, d]);
          }}
        >
          {['2/4','3/4','4/4','5/4','6/8','7/8','12/8'].map(v =>
            <option key={v} value={v}>{v}</option>
          )}
        </select>

        {/* Key */}
        <span style={S.label}>Key</span>
        <select
          style={{...S.input, width:50}}
          value={keySignature}
          onChange={e => onKeyChange(e.target.value)}
        >
          {['C','G','D','A','E','B','F#','F','Bb','Eb','Ab','Db'].map(k =>
            <option key={k} value={k}>{k}</option>
          )}
        </select>

        {/* Zoom */}
        <span style={S.label}>Zoom</span>
        <input
          style={{...S.input, width:44}}
          type="range" min={0.5} max={3} step={0.1}
          value={zoom}
          onChange={e => setZoom(Number(e.target.value))}
        />

        <div style={S.sep}/>

        {/* Video scoring */}
        <button style={S.btn(showVideo)} onClick={() => setShowVideo(v => !v)} title="Toggle video panel">🎬 Video</button>
        <button style={S.btn(false)} onClick={addHitPoint} title="Add hit point at playhead (H)">📍 Hit Point</button>
        <button style={S.btn(false)} onClick={fitToPicture} title="Tempo-map score to video length">⏱ Fit to Picture</button>

        <div style={S.sep}/>

        {/* Export */}
        <button style={S.btn(false)} onClick={exportMusicXML}      title="Export MusicXML (Ctrl+E)">📄 MusicXML</button>
        <button style={S.btn(false)} onClick={exportPDF}            title="Export PDF sheet music">🖨 PDF</button>
        <button style={S.btn(false)} onClick={onExportMidi}         title="Export MIDI">🎹 MIDI</button>
        <button style={{...S.btn(false), color:'#FF6600', borderColor:'rgba(255,102,0,0.4)'}}
                onClick={exportVideoWithScore} title="Export video with score audio">🎞 Export Video+Score</button>

      </div>

      {/* ── Body ── */}
      <div style={S.body}>

        {/* Score canvas */}
        <div
          style={S.scoreArea}
          onDrop={handleVideoDrop}
          onDragOver={e => e.preventDefault()}
        >
          <canvas
            ref={canvasRef}
            onClick={handleCanvasClick}
            style={{ display: 'block' }}
          />
          {typeof window !== 'undefined' && typeof window.Vex === 'undefined' && (
            <div style={{ color:'#FF6600', padding:20 }}>
              ⚠ VexFlow not loaded — add to index.html:<br/>
              <code style={{fontSize:10}}>{'<script src="https://cdn.jsdelivr.net/npm/vexflow@4.2.2/build/cjs/vexflow.js"></script>'}</code>
            </div>
          )}
        </div>

        {/* Video panel */}
        <div style={S.videoPanel}>
          <div style={{ color:'#888', fontSize:10, marginBottom:4 }}>🎬 VIDEO SCORING</div>

          {videoUrl ? (
            <video
              ref={videoRef}
              src={videoUrl}
              style={S.video}
              controls
              onTimeUpdate={() => {
                if (videoRef.current) {
                  const beat = secondsToBeats(videoRef.current.currentTime, bpm);
                  onSeek(beat);
                }
              }}
            />
          ) : (
            <label style={{
              display:'flex', alignItems:'center', justifyContent:'center',
              height:140, border:'2px dashed #333', borderRadius:8,
              cursor:'pointer', color:'#555', fontSize:11, textAlign:'center',
              flexDirection:'column', gap:6,
            }}>
              <span style={{fontSize:28}}>🎬</span>
              Drop video here<br/>or click to browse
              <input type="file" accept="video/*" style={{display:'none'}} onChange={handleVideoInput}/>
            </label>
          )}

          <div style={{ fontSize:10, color:'#888' }}>
            <span style={{color:'#FF6600'}}>●</span> Hit Points
          </div>
          <div style={S.hitList}>
            {hitPoints.length === 0 && (
              <div style={{color:'#444', padding:8}}>None — press H to add at playhead</div>
            )}
            {hitPoints.map((h, i) => (
              <div key={i} style={S.hitRow}>
                <span style={{color:'#FF6600'}}>{h.label}</span>
                <span style={{color:'#aaa'}}>Beat {h.beat.toFixed(2)}</span>
                <button
                  style={{...S.btn(false), padding:'1px 6px', fontSize:10}}
                  onClick={() => setHitPoints(p => p.filter((_, j) => j !== i))}
                >✕</button>
              </div>
            ))}
          </div>

          {videoUrl && (
            <button
              style={{...S.btn(false), color:'#ff4444', borderColor:'rgba(255,68,68,0.4)', fontSize:10}}
              onClick={() => { setVideoUrl(null); setVideoFile(null); }}
            >✕ Remove Video</button>
          )}
        </div>
      </div>

      {/* ── Status bar ── */}
      <div style={S.statusBar}>
        <span>Notes: {notes.length} | Hit Points: {hitPoints.length} | Tool: {tool} | Zoom: {zoom.toFixed(1)}x</span>
        <span style={{ color: exportStatus.includes('✓') ? '#00ffc8' : exportStatus.includes('fail') ? '#ff4444' : '#555' }}>
          {exportStatus || 'Ready — P: pencil · S: select · H: hit point · Ctrl+E: MusicXML'}
        </span>
      </div>

      {/* ── MusicXML preview modal ── */}
      {showXmlModal && (
        <div style={{
          position:'fixed', inset:0, background:'rgba(0,0,0,0.8)',
          display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999,
        }}>
          <div style={{
            background:'#0d0d1a', border:'1px solid #333', borderRadius:8,
            padding:20, width:'60vw', maxHeight:'70vh', display:'flex', flexDirection:'column', gap:10,
          }}>
            <div style={{display:'flex', justifyContent:'space-between'}}>
              <span style={{color:'#00ffc8'}}>MusicXML Export</span>
              <button style={S.btn(false)} onClick={() => setShowXmlModal(false)}>✕ Close</button>
            </div>
            <textarea
              readOnly
              value={xmlContent}
              style={{
                flex:1, background:'#060610', color:'#aaa', border:'1px solid #222',
                borderRadius:4, padding:10, fontSize:10, fontFamily:'monospace',
                resize:'none', overflowY:'auto', minHeight:300,
              }}
            />
          </div>
        </div>
      )}

    </div>
  );
}
