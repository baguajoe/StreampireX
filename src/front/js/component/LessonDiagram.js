// =============================================================================
// LessonDiagram.js — SVG Music Theory Diagrams for Creator Academy
// =============================================================================
// Renders the correct interactive diagram based on lesson title.
// No external images — pure SVG/JSX.
// =============================================================================

import React, { useState } from "react";

// ── Color palette ──
const C = {
  bg: "#0d1117",
  bg2: "#161b22",
  border: "#21262d",
  teal: "#00ffc8",
  cyan: "#5ac8fa",
  orange: "#FF6600",
  yellow: "#ffd60a",
  purple: "#bf5af2",
  red: "#ff453a",
  green: "#30d158",
  white: "#ddeeff",
  dim: "#5a7088",
  highlight: "rgba(0,255,200,0.15)",
};

// =============================================================================
// PIANO KEYBOARD
// =============================================================================
const NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const BLACK_PATTERN = [false, true, false, true, false, false, true, false, true, false, true, false];

const PianoKeyboard = ({ highlightNotes = [], labelNotes = [], startOctave = 4, numOctaves = 2, title = "" }) => {
  const wW = 28, hW = 90, wB = 17, hB = 58;
  const whites = ["C","D","E","F","G","A","B"];
  const totalWhites = numOctaves * 7;
  const svgW = totalWhites * wW + 2;
  const svgH = hW + 40;

  const keys = [];
  for (let oct = 0; oct < numOctaves; oct++) {
    let wi = 0;
    for (let n = 0; n < 12; n++) {
      const note = NOTES[n];
      const noteWithOct = note + (startOctave + oct);
      const noteName = note;
      const isBlack = BLACK_PATTERN[n];
      const isHighlighted = highlightNotes.includes(note) || highlightNotes.includes(noteWithOct);
      const label = labelNotes.find(l => l.note === note || l.note === noteWithOct);

      if (!isBlack) {
        const x = (oct * 7 + wi) * wW + 1;
        keys.push({ type: "white", note, noteWithOct, x, y: 0, w: wW - 1, h: hW, isHighlighted, label, wi });
        wi++;
      }
    }
  }

  // Black keys (drawn on top)
  for (let oct = 0; oct < numOctaves; oct++) {
    let wi = 0;
    for (let n = 0; n < 12; n++) {
      const note = NOTES[n];
      const noteWithOct = note + (startOctave + oct);
      const isBlack = BLACK_PATTERN[n];
      const isHighlighted = highlightNotes.includes(note) || highlightNotes.includes(noteWithOct);
      const label = labelNotes.find(l => l.note === note || l.note === noteWithOct);

      if (isBlack) {
        const prevWi = wi - 1;
        const x = (oct * 7 + prevWi) * wW + wW - wB / 2;
        keys.push({ type: "black", note, noteWithOct, x, y: 0, w: wB, h: hB, isHighlighted, label });
      } else {
        wi++;
      }
    }
  }

  const whites2 = keys.filter(k => k.type === "white");
  const blacks2 = keys.filter(k => k.type === "black");

  return (
    <div style={{ textAlign: "center", padding: "16px 0" }}>
      {title && <div style={{ color: C.teal, fontSize: 13, fontWeight: 700, marginBottom: 12, letterSpacing: 1 }}>{title}</div>}
      <svg width={svgW} height={svgH} style={{ maxWidth: "100%", display: "block", margin: "0 auto" }}>
        {whites2.map((k, i) => (
          <g key={i}>
            <rect x={k.x} y={k.y} width={k.w} height={k.h}
              fill={k.isHighlighted ? C.teal : "#f0f0f0"}
              stroke="#333" strokeWidth={1} rx={2}
            />
            {k.label && (
              <text x={k.x + k.w / 2} y={k.h - 10} textAnchor="middle"
                fill={k.isHighlighted ? "#000" : "#555"} fontSize={9} fontWeight={700}
                fontFamily="monospace">
                {k.label.label || k.note}
              </text>
            )}
            {!k.label && k.isHighlighted && (
              <text x={k.x + k.w / 2} y={k.h - 10} textAnchor="middle"
                fill="#000" fontSize={9} fontWeight={700} fontFamily="monospace">
                {k.note}
              </text>
            )}
          </g>
        ))}
        {blacks2.map((k, i) => (
          <g key={i}>
            <rect x={k.x} y={k.y} width={k.w} height={k.h}
              fill={k.isHighlighted ? C.teal : "#1a1a1a"}
              stroke="#000" strokeWidth={1} rx={2}
            />
            {(k.isHighlighted || k.label) && (
              <text x={k.x + k.w / 2} y={k.h - 6} textAnchor="middle"
                fill={k.isHighlighted ? "#000" : C.teal} fontSize={7} fontWeight={700}
                fontFamily="monospace">
                {k.label?.label || k.note}
              </text>
            )}
          </g>
        ))}
        {/* Octave labels */}
        {Array.from({ length: numOctaves }, (_, i) => (
          <text key={i} x={i * 7 * wW + wW / 2} y={svgH - 6}
            textAnchor="middle" fill={C.dim} fontSize={9} fontFamily="monospace">
            C{startOctave + i}
          </text>
        ))}
      </svg>
    </div>
  );
};

// =============================================================================
// SCALE DIAGRAM
// =============================================================================
const ScaleDiagram = ({ scale, root = "C", color = C.teal, title = "" }) => {
  const SCALE_PATTERNS = {
    major:    [0,2,4,5,7,9,11],
    minor:    [0,2,3,5,7,8,10],
    dorian:   [0,2,3,5,7,9,10],
    phrygian: [0,1,3,5,7,8,10],
    lydian:   [0,2,4,6,7,9,11],
    mixolydian:[0,2,4,5,7,9,10],
    locrian:  [0,1,3,5,6,8,10],
    pentatonic:[0,2,4,7,9],
    blues:    [0,3,5,6,7,10],
  };

  const rootIdx = NOTES.indexOf(root);
  const pattern = SCALE_PATTERNS[scale] || SCALE_PATTERNS.major;
  const scaleNotes = pattern.map(i => NOTES[(rootIdx + i) % 12]);

  return (
    <PianoKeyboard
      highlightNotes={scaleNotes}
      labelNotes={scaleNotes.map((n, i) => ({
        note: n,
        label: i === 0 ? `${n}\n(root)` : n
      }))}
      title={title || `${root} ${scale.charAt(0).toUpperCase() + scale.slice(1)} Scale`}
    />
  );
};

// =============================================================================
// CHORD DIAGRAM
// =============================================================================
const ChordBox = ({ name, notes, color = C.teal }) => {
  return (
    <div style={{ display: "inline-block", margin: "0 8px", textAlign: "center" }}>
      <div style={{ color, fontSize: 14, fontWeight: 800, marginBottom: 6 }}>{name}</div>
      <div style={{ display: "flex", gap: 3 }}>
        {notes.map((n, i) => (
          <div key={i} style={{
            width: 36, height: 36, borderRadius: 6,
            background: i === 0 ? color : "rgba(255,255,255,0.08)",
            border: `1px solid ${i === 0 ? color : "#333"}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: i === 0 ? "#000" : C.white, fontSize: 11, fontWeight: 700,
            fontFamily: "monospace"
          }}>{n}</div>
        ))}
      </div>
      <div style={{ color: C.dim, fontSize: 9, marginTop: 4 }}>
        {notes.map((n, i) => ["Root", "3rd", "5th", "7th", "9th"][i]).join(" · ")}
      </div>
    </div>
  );
};

const ChordProgressionDiagram = ({ chords, title = "", colors }) => {
  const defaultColors = [C.teal, C.cyan, C.purple, C.orange];
  return (
    <div style={{ padding: "16px 0", textAlign: "center" }}>
      {title && <div style={{ color: C.teal, fontSize: 13, fontWeight: 700, marginBottom: 16, letterSpacing: 1 }}>{title}</div>}
      <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: 12 }}>
        {chords.map((c, i) => (
          <ChordBox key={i} name={c.name} notes={c.notes} color={(colors && colors[i]) || defaultColors[i % defaultColors.length]} />
        ))}
      </div>
      {chords.length > 1 && (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, marginTop: 16 }}>
          {chords.map((c, i) => (
            <React.Fragment key={i}>
              <span style={{ color: C.teal, fontWeight: 800, fontSize: 13, fontFamily: "monospace" }}>{c.roman || c.name}</span>
              {i < chords.length - 1 && <span style={{ color: C.dim }}>→</span>}
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
};

// =============================================================================
// STEP SEQUENCER (for drum lessons)
// =============================================================================
const StepSequencer = ({ pattern, label, color = C.orange, title = "" }) => {
  const steps = 16;
  const rows = Object.entries(pattern);
  return (
    <div style={{ padding: "16px 0" }}>
      {title && <div style={{ color: C.teal, fontSize: 13, fontWeight: 700, marginBottom: 12, textAlign: "center", letterSpacing: 1 }}>{title}</div>}
      <div style={{ overflowX: "auto" }}>
        {rows.map(([name, beats], ri) => {
          const rowColor = [C.orange, C.teal, C.yellow, C.cyan, C.purple][ri % 5];
          return (
            <div key={name} style={{ display: "flex", alignItems: "center", marginBottom: 6 }}>
              <div style={{ width: 70, color: C.dim, fontSize: 10, fontWeight: 700, fontFamily: "monospace", textAlign: "right", paddingRight: 10 }}>{name}</div>
              <div style={{ display: "flex", gap: 3 }}>
                {Array.from({ length: steps }, (_, i) => (
                  <div key={i} style={{
                    width: 18, height: 18, borderRadius: 3,
                    background: beats.includes(i) ? rowColor : "rgba(255,255,255,0.04)",
                    border: `1px solid ${beats.includes(i) ? rowColor : "#222"}`,
                    opacity: beats.includes(i) ? 1 : 0.5,
                    ...(i === 0 || i === 4 || i === 8 || i === 12 ? { marginLeft: 4 } : {})
                  }} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", justifyContent: "center", gap: 3, marginTop: 8, paddingLeft: 80 }}>
        {Array.from({ length: 16 }, (_, i) => (
          <div key={i} style={{
            width: 18, fontSize: 7, textAlign: "center", color: C.dim, fontFamily: "monospace",
            ...(i === 0 || i === 4 || i === 8 || i === 12 ? { marginLeft: 4, color: C.teal } : {})
          }}>{i + 1}</div>
        ))}
      </div>
    </div>
  );
};

// =============================================================================
// BPM METER
// =============================================================================
const BPMMeter = ({ bpm = 120, mood = "" }) => {
  const tempos = [
    { name: "Larghissimo", range: [0, 24], color: "#3a7bd5" },
    { name: "Largo", range: [24, 40], color: "#5ac8fa" },
    { name: "Adagio", range: [40, 66], color: "#00ffc8" },
    { name: "Andante", range: [66, 76], color: "#30d158" },
    { name: "Moderato", range: [76, 108], color: "#ffd60a" },
    { name: "Allegro", range: [108, 132], color: "#ff9500" },
    { name: "Vivace", range: [132, 168], color: "#ff6600" },
    { name: "Presto", range: [168, 200], color: "#ff453a" },
    { name: "Prestissimo", range: [200, 240], color: "#bf5af2" },
  ];
  const maxBPM = 240;
  const pct = Math.min(bpm / maxBPM, 1);
  const activeTempo = tempos.find(t => bpm >= t.range[0] && bpm < t.range[1]) || tempos[4];

  return (
    <div style={{ padding: "16px 24px", textAlign: "center" }}>
      <div style={{ color: C.teal, fontSize: 13, fontWeight: 700, marginBottom: 16, letterSpacing: 1 }}>TEMPO / BPM</div>
      <div style={{ fontSize: 48, fontWeight: 900, color: activeTempo.color, fontFamily: "monospace", lineHeight: 1 }}>{bpm}</div>
      <div style={{ color: activeTempo.color, fontSize: 14, fontWeight: 700, marginBottom: 16 }}>{activeTempo.name}</div>
      <div style={{ background: "#1a2838", borderRadius: 8, height: 16, overflow: "hidden", margin: "0 auto", maxWidth: 400 }}>
        <div style={{ width: `${pct * 100}%`, height: "100%", background: `linear-gradient(90deg, #00ffc8, ${activeTempo.color})`, borderRadius: 8, transition: "width 0.5s" }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", color: C.dim, fontSize: 9, marginTop: 4, maxWidth: 400, margin: "4px auto 0" }}>
        <span>0</span><span>60</span><span>120</span><span>180</span><span>240</span>
      </div>
      <div style={{ marginTop: 16, display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center" }}>
        {[
          { label: "Lofi / Chill", bpm: "70-85", color: "#5ac8fa" },
          { label: "Hip-Hop", bpm: "85-95", color: "#ffd60a" },
          { label: "Trap", bpm: "130-160", color: "#ff6600" },
          { label: "Pop", bpm: "100-130", color: "#30d158" },
          { label: "EDM", bpm: "128-145", color: "#bf5af2" },
          { label: "Drum & Bass", bpm: "160-180", color: "#ff453a" },
        ].map((g, i) => (
          <div key={i} style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${g.color}33`, borderRadius: 6, padding: "4px 10px", fontSize: 10 }}>
            <span style={{ color: g.color, fontWeight: 700 }}>{g.label}</span>
            <span style={{ color: C.dim, marginLeft: 4 }}>{g.bpm} BPM</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// =============================================================================
// TIME SIGNATURE DIAGRAM
// =============================================================================
const TimeSignatureDiagram = ({ top = 4, bottom = 4 }) => {
  const beats = Array.from({ length: top }, (_, i) => i);
  return (
    <div style={{ padding: "16px 0", textAlign: "center" }}>
      <div style={{ color: C.teal, fontSize: 13, fontWeight: 700, marginBottom: 16, letterSpacing: 1 }}>TIME SIGNATURE</div>
      <div style={{ display: "inline-flex", alignItems: "center", gap: 32 }}>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", lineHeight: 1 }}>
          <div style={{ fontSize: 64, fontWeight: 900, color: C.white, lineHeight: 1 }}>{top}</div>
          <div style={{ borderTop: `3px solid ${C.dim}`, margin: "4px 0" }} />
          <div style={{ fontSize: 64, fontWeight: 900, color: C.dim, lineHeight: 1 }}>{bottom}</div>
        </div>
        <div>
          <div style={{ color: C.dim, fontSize: 11, marginBottom: 8 }}>{top} beats per measure</div>
          <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
            {beats.map((i) => (
              <div key={i} style={{
                width: 36, height: 36, borderRadius: 6,
                background: i === 0 ? C.teal : "rgba(255,255,255,0.06)",
                border: `1px solid ${i === 0 ? C.teal : "#333"}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: i === 0 ? "#000" : C.white, fontSize: 12, fontWeight: 700
              }}>{i + 1}</div>
            ))}
          </div>
          <div style={{ color: C.dim, fontSize: 10 }}>
            {top === 4 && bottom === 4 && "Common Time — most songs use this"}
            {top === 3 && bottom === 4 && "Waltz Time — 1-2-3, 1-2-3"}
            {top === 6 && bottom === 8 && "Compound Duple — flowing, triplet feel"}
            {top === 5 && bottom === 4 && "Odd Time — Dave Brubeck 'Take Five'"}
            {top === 7 && bottom === 8 && "Odd Time — complex, asymmetric"}
          </div>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// INTERVAL DIAGRAM
// =============================================================================
const IntervalDiagram = () => {
  const intervals = [
    { semitones: 0, name: "Unison", abbr: "P1", color: C.teal, example: "C→C" },
    { semitones: 1, name: "Minor 2nd", abbr: "m2", color: C.dim, example: "C→C#" },
    { semitones: 2, name: "Major 2nd", abbr: "M2", color: C.cyan, example: "C→D" },
    { semitones: 3, name: "Minor 3rd", abbr: "m3", color: C.purple, example: "C→Eb" },
    { semitones: 4, name: "Major 3rd", abbr: "M3", color: C.yellow, example: "C→E" },
    { semitones: 5, name: "Perfect 4th", abbr: "P4", color: C.green, example: "C→F" },
    { semitones: 6, name: "Tritone", abbr: "TT", color: C.red, example: "C→F#" },
    { semitones: 7, name: "Perfect 5th", abbr: "P5", color: C.teal, example: "C→G" },
    { semitones: 8, name: "Minor 6th", abbr: "m6", color: C.purple, example: "C→Ab" },
    { semitones: 9, name: "Major 6th", abbr: "M6", color: C.cyan, example: "C→A" },
    { semitones: 10, name: "Minor 7th", abbr: "m7", color: C.orange, example: "C→Bb" },
    { semitones: 11, name: "Major 7th", abbr: "M7", color: C.yellow, example: "C→B" },
    { semitones: 12, name: "Octave", abbr: "P8", color: C.teal, example: "C→C'" },
  ];

  return (
    <div style={{ padding: "16px 0" }}>
      <div style={{ color: C.teal, fontSize: 13, fontWeight: 700, marginBottom: 12, textAlign: "center", letterSpacing: 1 }}>INTERVALS</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 6 }}>
        {intervals.map((iv, i) => (
          <div key={i} style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${iv.color}44`, borderRadius: 8, padding: "8px 10px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: iv.color, fontWeight: 800, fontSize: 12, fontFamily: "monospace" }}>{iv.abbr}</span>
              <span style={{ color: C.dim, fontSize: 10 }}>{iv.semitones} st</span>
            </div>
            <div style={{ color: C.white, fontSize: 11, marginTop: 2 }}>{iv.name}</div>
            <div style={{ color: C.dim, fontSize: 10, fontFamily: "monospace" }}>{iv.example}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

// =============================================================================
// CAMELOT WHEEL
// =============================================================================
const CamelotWheel = () => {
  const keys = [
    { pos: 1, major: "B",  minor: "G#m",  color: "#ff453a" },
    { pos: 2, major: "F#", minor: "D#m",  color: "#ff6600" },
    { pos: 3, major: "Db", minor: "Bbm",  color: "#ffd60a" },
    { pos: 4, major: "Ab", minor: "Fm",   color: "#30d158" },
    { pos: 5, major: "Eb", minor: "Cm",   color: "#00ffc8" },
    { pos: 6, major: "Bb", minor: "Gm",   color: "#5ac8fa" },
    { pos: 7, major: "F",  minor: "Dm",   color: "#4a9eff" },
    { pos: 8, major: "C",  minor: "Am",   color: "#bf5af2" },
    { pos: 9, major: "G",  minor: "Em",   color: "#ff2d55" },
    { pos: 10,major: "D",  minor: "Bm",   color: "#ff9500" },
    { pos: 11,major: "A",  minor: "F#m",  color: "#ffcc00" },
    { pos: 12,major: "E",  minor: "C#m",  color: "#ff375f" },
  ];

  const cx = 140, cy = 140, r1 = 110, r2 = 75;

  return (
    <div style={{ textAlign: "center", padding: "16px 0" }}>
      <div style={{ color: C.teal, fontSize: 13, fontWeight: 700, marginBottom: 12, letterSpacing: 1 }}>CAMELOT WHEEL — DJ Key Mixing</div>
      <svg width={280} height={280} style={{ display: "block", margin: "0 auto" }}>
        {keys.map((k, i) => {
          const angle = (i / 12) * Math.PI * 2 - Math.PI / 2;
          const x1 = cx + Math.cos(angle) * r1;
          const y1 = cy + Math.sin(angle) * r1;
          const x2 = cx + Math.cos(angle) * r2;
          const y2 = cy + Math.sin(angle) * r2;

          return (
            <g key={i}>
              <circle cx={x1} cy={y1} r={20} fill={k.color + "33"} stroke={k.color} strokeWidth={1.5} />
              <text x={x1} y={y1 - 4} textAnchor="middle" fill={k.color} fontSize={9} fontWeight={700} fontFamily="monospace">{k.pos}B {k.major}</text>
              <text x={x1} y={y1 + 7} textAnchor="middle" fill={k.color} fontSize={8} fontFamily="monospace">maj</text>
              <circle cx={x2} cy={y2} r={16} fill={k.color + "22"} stroke={k.color + "88"} strokeWidth={1} />
              <text x={x2} y={y2 - 3} textAnchor="middle" fill={k.color + "cc"} fontSize={8} fontWeight={700} fontFamily="monospace">{k.pos}A {k.minor}</text>
              <text x={x2} y={y2 + 6} textAnchor="middle" fill={k.color + "88"} fontSize={7} fontFamily="monospace">min</text>
            </g>
          );
        })}
        <circle cx={cx} cy={cy} r={30} fill="#161b22" stroke="#333" strokeWidth={1} />
        <text x={cx} y={cy - 4} textAnchor="middle" fill={C.teal} fontSize={9} fontWeight={700}>CAMELOT</text>
        <text x={cx} y={cy + 7} textAnchor="middle" fill={C.dim} fontSize={8}>WHEEL</text>
      </svg>
    </div>
  );
};

// =============================================================================
// EQ FREQUENCY SPECTRUM
// =============================================================================
const EQDiagram = () => {
  const bands = [
    { name: "Sub Bass", range: "20-60Hz", desc: "Rumble, feel", color: "#ff453a" },
    { name: "Bass", range: "60-250Hz", desc: "Warmth, power", color: "#ff6600" },
    { name: "Low Mid", range: "250-500Hz", desc: "Muddiness", color: "#ffd60a" },
    { name: "Mid", range: "500-2kHz", desc: "Presence, body", color: "#30d158" },
    { name: "Upper Mid", range: "2-4kHz", desc: "Attack, clarity", color: "#00ffc8" },
    { name: "Presence", range: "4-6kHz", desc: "Bite, definition", color: "#5ac8fa" },
    { name: "Brilliance", range: "6-20kHz", desc: "Air, shimmer", color: "#bf5af2" },
  ];
  const heights = [80, 70, 50, 65, 72, 60, 40];

  return (
    <div style={{ padding: "16px 0" }}>
      <div style={{ color: C.teal, fontSize: 13, fontWeight: 700, marginBottom: 16, textAlign: "center", letterSpacing: 1 }}>EQ FREQUENCY SPECTRUM</div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 4, justifyContent: "center", height: 100, marginBottom: 8 }}>
        {bands.map((b, i) => (
          <div key={i} style={{ flex: 1, maxWidth: 60, display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ width: "100%", height: heights[i], background: `linear-gradient(0deg, ${b.color}88, ${b.color}22)`, borderRadius: "4px 4px 0 0", border: `1px solid ${b.color}66` }} />
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 4, justifyContent: "center" }}>
        {bands.map((b, i) => (
          <div key={i} style={{ flex: 1, maxWidth: 60, textAlign: "center" }}>
            <div style={{ color: b.color, fontSize: 8, fontWeight: 700, fontFamily: "monospace" }}>{b.name}</div>
            <div style={{ color: C.dim, fontSize: 7 }}>{b.range}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

// =============================================================================
// SONG STRUCTURE DIAGRAM
// =============================================================================
const SongStructureDiagram = ({ structure, title = "" }) => {
  const SECTION_COLORS = {
    "Intro": "#5ac8fa",
    "Verse": "#30d158",
    "Pre-Chorus": "#ffd60a",
    "Chorus": "#ff6600",
    "Bridge": "#bf5af2",
    "Outro": "#ff453a",
    "Drop": "#ff453a",
    "Build": "#ffd60a",
    "Hook": "#ff6600",
  };

  return (
    <div style={{ padding: "16px 0" }}>
      <div style={{ color: C.teal, fontSize: 13, fontWeight: 700, marginBottom: 16, textAlign: "center", letterSpacing: 1 }}>{title || "SONG STRUCTURE"}</div>
      <div style={{ display: "flex", gap: 4, alignItems: "stretch", overflowX: "auto", padding: "0 8px" }}>
        {structure.map((s, i) => {
          const color = SECTION_COLORS[s.name] || C.teal;
          return (
            <div key={i} style={{
              flex: s.bars || 1, minWidth: 50,
              background: color + "22", border: `2px solid ${color}`,
              borderRadius: 8, padding: "8px 4px", textAlign: "center"
            }}>
              <div style={{ color, fontSize: 11, fontWeight: 800 }}>{s.name}</div>
              {s.bars && <div style={{ color: C.dim, fontSize: 9, marginTop: 2 }}>{s.bars} bars</div>}
              {s.desc && <div style={{ color: C.dim, fontSize: 8, marginTop: 2 }}>{s.desc}</div>}
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", color: C.dim, fontSize: 9, marginTop: 6, padding: "0 8px" }}>
        <span>START</span><span>END</span>
      </div>
    </div>
  );
};

// =============================================================================
// EXTENDED CHORD DIAGRAM
// =============================================================================
const ExtendedChordDiagram = ({ type = "7th" }) => {
  const chords = {
    "7th": [
      { name: "Cmaj7", notes: ["C", "E", "G", "B"], desc: "Major 7th — dreamy, smooth" },
      { name: "Cm7", notes: ["C", "Eb", "G", "Bb"], desc: "Minor 7th — jazzy, soul" },
      { name: "C7", notes: ["C", "E", "G", "Bb"], desc: "Dominant 7th — bluesy tension" },
      { name: "Cdim7", notes: ["C", "Eb", "Gb", "A"], desc: "Diminished 7th — dark, tense" },
    ],
    "9th": [
      { name: "Cmaj9", notes: ["C", "E", "G", "B", "D"], desc: "Major 9th — lush, open" },
      { name: "Cm9", notes: ["C", "Eb", "G", "Bb", "D"], desc: "Minor 9th — rich, emotional" },
      { name: "C9", notes: ["C", "E", "G", "Bb", "D"], desc: "Dominant 9th — funky, R&B" },
    ],
  };
  const selected = chords[type] || chords["7th"];

  return (
    <div style={{ padding: "16px 0" }}>
      <div style={{ color: C.teal, fontSize: 13, fontWeight: 700, marginBottom: 16, textAlign: "center", letterSpacing: 1 }}>{type.toUpperCase()} CHORDS</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center" }}>
        {selected.map((c, i) => (
          <div key={i} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid #21262d", borderRadius: 10, padding: "12px 16px", minWidth: 140 }}>
            <div style={{ color: C.teal, fontSize: 14, fontWeight: 800, marginBottom: 8, fontFamily: "monospace" }}>{c.name}</div>
            <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
              {c.notes.map((n, j) => (
                <div key={j} style={{
                  width: 30, height: 30, borderRadius: 6,
                  background: j === 0 ? C.teal : j === c.notes.length - 1 ? C.purple + "55" : "rgba(255,255,255,0.08)",
                  border: `1px solid ${j === 0 ? C.teal : "#333"}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: j === 0 ? "#000" : C.white, fontSize: 10, fontWeight: 700
                }}>{n}</div>
              ))}
            </div>
            <div style={{ color: C.dim, fontSize: 10 }}>{c.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

// =============================================================================
// COMPRESSION DIAGRAM
// =============================================================================
const CompressionDiagram = () => (
  <div style={{ padding: "16px 0", textAlign: "center" }}>
    <div style={{ color: C.teal, fontSize: 13, fontWeight: 700, marginBottom: 16, letterSpacing: 1 }}>COMPRESSION — HOW IT WORKS</div>
    <svg width={340} height={160} style={{ display: "block", margin: "0 auto" }}>
      {/* Before */}
      <text x={80} y={16} textAnchor="middle" fill={C.dim} fontSize={10}>BEFORE</text>
      {[50, 30, 80, 20, 90, 40, 70, 25].map((h, i) => (
        <rect key={i} x={20 + i * 16} y={20 + (90 - h)} width={12} height={h}
          fill={h > 60 ? C.red + "aa" : C.cyan + "88"} rx={2} />
      ))}
      {/* Threshold line */}
      <line x1={10} y1={20 + 30} x2={150} y2={20 + 30} stroke={C.yellow} strokeWidth={1} strokeDasharray="4,3" />
      <text x={155} y={20 + 34} fill={C.yellow} fontSize={8}>threshold</text>

      {/* Arrow */}
      <text x={175} y={75} textAnchor="middle" fill={C.teal} fontSize={18}>→</text>

      {/* After */}
      <text x={265} y={16} textAnchor="middle" fill={C.dim} fontSize={10}>AFTER</text>
      {[50, 30, 60, 20, 62, 40, 58, 25].map((h, i) => (
        <rect key={i} x={200 + i * 16} y={20 + (90 - h)} width={12} height={h}
          fill={C.teal + "88"} rx={2} />
      ))}
      <line x1={190} y1={20 + 30} x2={330} y2={20 + 30} stroke={C.yellow} strokeWidth={1} strokeDasharray="4,3" />

      <text x={170} y={130} textAnchor="middle" fill={C.dim} fontSize={9}>Loud peaks are reduced → more consistent volume</text>
    </svg>
    <div style={{ display: "flex", justifyContent: "center", gap: 16, marginTop: 8 }}>
      {[
        { label: "Threshold", desc: "Where compression kicks in", color: C.yellow },
        { label: "Ratio", desc: "How much to reduce", color: C.orange },
        { label: "Attack", desc: "How fast it reacts", color: C.cyan },
        { label: "Release", desc: "How fast it recovers", color: C.green },
      ].map((p, i) => (
        <div key={i} style={{ textAlign: "center" }}>
          <div style={{ color: p.color, fontSize: 10, fontWeight: 700 }}>{p.label}</div>
          <div style={{ color: C.dim, fontSize: 9 }}>{p.desc}</div>
        </div>
      ))}
    </div>
  </div>
);

// =============================================================================
// REVERB / DELAY DIAGRAM
// =============================================================================
const ReverbDiagram = ({ type = "reverb" }) => (
  <div style={{ padding: "16px 0", textAlign: "center" }}>
    <div style={{ color: C.teal, fontSize: 13, fontWeight: 700, marginBottom: 16, letterSpacing: 1 }}>
      {type === "reverb" ? "REVERB — ADDING SPACE" : "DELAY — CREATING ECHOES"}
    </div>
    <svg width={340} height={100} style={{ display: "block", margin: "0 auto" }}>
      {/* Source signal */}
      <rect x={10} y={35} width={40} height={30} fill={C.teal + "33"} stroke={C.teal} strokeWidth={1.5} rx={4} />
      <text x={30} y={54} textAnchor="middle" fill={C.teal} fontSize={9} fontWeight={700}>SOURCE</text>

      {type === "reverb" ? (
        <>
          {[1, 0.7, 0.5, 0.3, 0.15].map((op, i) => (
            <g key={i}>
              <rect x={70 + i * 50} y={35 + (1 - op) * 15} width={35} height={op * 30}
                fill={C.purple + Math.round(op * 200).toString(16).padStart(2, "0")}
                stroke={C.purple} strokeWidth={1} rx={3} />
              <text x={87 + i * 50} y={105} textAnchor="middle" fill={C.dim} fontSize={8}>
                {i === 0 ? "Early" : `Ref ${i}`}
              </text>
            </g>
          ))}
          <text x={175} y={20} textAnchor="middle" fill={C.dim} fontSize={9}>
            Hundreds of reflections → sense of space
          </text>
        </>
      ) : (
        <>
          {[1, 0.7, 0.5, 0.3].map((op, i) => (
            <g key={i}>
              <rect x={70 + i * 60} y={35 + (1 - op) * 15} width={40} height={op * 30}
                fill={C.cyan + Math.round(op * 200).toString(16).padStart(2, "0")}
                stroke={C.cyan} strokeWidth={1} rx={3} />
              <text x={90 + i * 60} y={105} textAnchor="middle" fill={C.dim} fontSize={8}>
                {i === 0 ? "Dry" : `Echo ${i}`}
              </text>
            </g>
          ))}
          <text x={175} y={20} textAnchor="middle" fill={C.dim} fontSize={9}>
            Repeated copies at set intervals → echo
          </text>
        </>
      )}
    </svg>
  </div>
);

// =============================================================================
// PANNING DIAGRAM
// =============================================================================
const PanningDiagram = () => (
  <div style={{ padding: "16px 0", textAlign: "center" }}>
    <div style={{ color: C.teal, fontSize: 13, fontWeight: 700, marginBottom: 16, letterSpacing: 1 }}>PANNING — STEREO WIDTH</div>
    <svg width={340} height={120} style={{ display: "block", margin: "0 auto" }}>
      {/* L/R labels */}
      <text x={30} y={20} textAnchor="middle" fill={C.cyan} fontSize={12} fontWeight={700}>L</text>
      <text x={310} y={20} textAnchor="middle" fill={C.cyan} fontSize={12} fontWeight={700}>R</text>
      <line x1={50} y1={15} x2={290} y2={15} stroke="#333" strokeWidth={1} />
      <line x1={170} y1={10} x2={170} y2={20} stroke={C.teal} strokeWidth={2} />
      <text x={170} y={30} textAnchor="middle" fill={C.teal} fontSize={9}>CENTER</text>

      {/* Instruments */}
      {[
        { label: "Kick", pos: 170, color: C.orange },
        { label: "Bass", pos: 170, color: C.red, y: 55 },
        { label: "Lead Vox", pos: 170, color: C.teal, y: 75 },
        { label: "Snare", pos: 155, color: C.yellow, y: 40 },
        { label: "Guitar L", pos: 80, color: C.green, y: 55 },
        { label: "Guitar R", pos: 260, color: C.green, y: 55 },
        { label: "Keys L", pos: 110, color: C.purple, y: 75 },
        { label: "Keys R", pos: 230, color: C.purple, y: 75 },
        { label: "Hi-Hat", pos: 200, color: C.cyan, y: 40 },
      ].map((item, i) => (
        <g key={i}>
          <circle cx={item.pos} cy={item.y || 45} r={14}
            fill={item.color + "22"} stroke={item.color} strokeWidth={1.5} />
          <text x={item.pos} y={(item.y || 45) + 4} textAnchor="middle"
            fill={item.color} fontSize={7} fontWeight={700}>{item.label}</text>
        </g>
      ))}
    </svg>
    <div style={{ color: C.dim, fontSize: 10, marginTop: 8 }}>
      Kick, bass & lead vocal stay centered • Guitars & keys spread wide
    </div>
  </div>
);

// =============================================================================
// MAIN DIAGRAM SELECTOR
// =============================================================================
const LessonDiagram = ({ lesson }) => {
  if (!lesson) return null;
  const title = (lesson.title || "").toLowerCase();

  // Helper to wrap diagram in container
  const wrap = (diagram) => (
    <div style={{
      background: C.bg2, border: `1px solid ${C.border}`,
      borderRadius: 12, padding: "8px 16px", marginBottom: 24,
      width: "100%", boxSizing: "border-box", overflow: "hidden"
    }}>
      {diagram}
    </div>
  );

  // ── Piano / Notes ──
  if (title.includes("12 notes") || title.includes("musical alphabet"))
    return wrap(<PianoKeyboard highlightNotes={NOTES} labelNotes={NOTES.map(n => ({ note: n, label: n }))} title="THE 12 NOTES" numOctaves={2} />);

  if (title.includes("piano keyboard") || title.includes("meet the piano"))
    return wrap(<PianoKeyboard labelNotes={["C","D","E","F","G","A","B"].map(n => ({ note: n, label: n }))} highlightNotes={["C"]} title="THE PIANO KEYBOARD" numOctaves={2} />);

  if (title.includes("sharps") || title.includes("flats") || title.includes("black keys"))
    return wrap(<PianoKeyboard highlightNotes={["C#","D#","F#","G#","A#"]} labelNotes={[
      {note:"C#",label:"C#/Db"},{note:"D#",label:"D#/Eb"},{note:"F#",label:"F#/Gb"},
      {note:"G#",label:"G#/Ab"},{note:"A#",label:"A#/Bb"}
    ]} title="SHARPS & FLATS — THE BLACK KEYS" numOctaves={2} />);

  // ── Scales ──
  if (title.includes("major scale") || title.includes("happy & bright"))
    return wrap(<ScaleDiagram scale="major" root="C" color={C.teal} />);

  if (title.includes("minor scale") || title.includes("dark & emotional"))
    return wrap(<ScaleDiagram scale="minor" root="A" color={C.purple} />);

  if (title.includes("play your first scale"))
    return wrap(<ScaleDiagram scale="major" root="C" color={C.teal} title="C Major Scale — Play Along" />);

  if (title.includes("dorian"))
    return wrap(<ScaleDiagram scale="dorian" root="D" color={C.cyan} />);

  if (title.includes("mixolydian"))
    return wrap(<ScaleDiagram scale="mixolydian" root="G" color={C.yellow} />);

  if (title.includes("lydian"))
    return wrap(<ScaleDiagram scale="lydian" root="F" color={C.purple} />);

  if (title.includes("phrygian"))
    return wrap(<ScaleDiagram scale="phrygian" root="E" color={C.red} />);

  if (title.includes("pentatonic"))
    return wrap(<ScaleDiagram scale="pentatonic" root="C" color={C.orange} title="C Pentatonic Scale" />);

  // ── Chords ──
  if (title.includes("what is a chord"))
    return wrap(<ChordProgressionDiagram title="CHORD = 3+ NOTES PLAYED TOGETHER" chords={[
      { name: "C Major", notes: ["C", "E", "G"], roman: "C" },
      { name: "A Minor", notes: ["A", "C", "E"], roman: "Am" },
      { name: "F Major", notes: ["F", "A", "C"], roman: "F" },
    ]} />);

  if (title.includes("major chord"))
    return wrap(<ChordProgressionDiagram title="MAJOR CHORDS — HAPPY & BRIGHT" chords={[
      { name: "C Major", notes: ["C", "E", "G"], roman: "C" },
      { name: "G Major", notes: ["G", "B", "D"], roman: "G" },
      { name: "F Major", notes: ["F", "A", "C"], roman: "F" },
    ]} />);

  if (title.includes("minor chord"))
    return wrap(<ChordProgressionDiagram title="MINOR CHORDS — DARK & EMOTIONAL" chords={[
      { name: "A Minor", notes: ["A", "C", "E"], roman: "Am" },
      { name: "D Minor", notes: ["D", "F", "A"], roman: "Dm" },
      { name: "E Minor", notes: ["E", "G", "B"], roman: "Em" },
    ]} colors={[C.purple, C.purple, C.purple]} />);

  if (title.includes("i-iv-v") || title.includes("3 chords"))
    return wrap(<ChordProgressionDiagram title="I — IV — V — THE CLASSIC PROGRESSION" chords={[
      { name: "C", notes: ["C","E","G"], roman: "I" },
      { name: "F", notes: ["F","A","C"], roman: "IV" },
      { name: "G", notes: ["G","B","D"], roman: "V" },
      { name: "C", notes: ["C","E","G"], roman: "I" },
    ]} />);

  if (title.includes("i-v-vi-iv") || title.includes("pop progression"))
    return wrap(<ChordProgressionDiagram title="I — V — vi — IV — THE POP PROGRESSION" chords={[
      { name: "C", notes: ["C","E","G"], roman: "I" },
      { name: "G", notes: ["G","B","D"], roman: "V" },
      { name: "Am", notes: ["A","C","E"], roman: "vi" },
      { name: "F", notes: ["F","A","C"], roman: "IV" },
    ]} />);

  if (title.includes("ii-v-i") || title.includes("jazz"))
    return wrap(<ChordProgressionDiagram title="ii — V — I — JAZZ & R&B" chords={[
      { name: "Dm7", notes: ["D","F","A","C"], roman: "ii7" },
      { name: "G7", notes: ["G","B","D","F"], roman: "V7" },
      { name: "Cmaj7", notes: ["C","E","G","B"], roman: "Imaj7" },
    ]} colors={[C.cyan, C.orange, C.teal]} />);

  // ── Extended Chords ──
  if (title.includes("7th chord") || title.includes("beyond triads"))
    return wrap(<ExtendedChordDiagram type="7th" />);

  if (title.includes("9th chord"))
    return wrap(<ExtendedChordDiagram type="9th" />);

  // ── Rhythm / BPM ──
  if (title.includes("bpm") || title.includes("tempo"))
    return wrap(<BPMMeter bpm={120} />);

  if (title.includes("time signature"))
    return wrap(
      <div>
        <div style={{ display: "flex", justifyContent: "center", gap: 32, flexWrap: "wrap" }}>
          {[[4,4],[3,4],[6,8]].map(([t,b], i) => (
            <TimeSignatureDiagram key={i} top={t} bottom={b} />
          ))}
        </div>
      </div>
    );

  if (title.includes("odd time"))
    return wrap(
      <div style={{ display: "flex", justifyContent: "center", gap: 32, flexWrap: "wrap" }}>
        {[[5,4],[7,8],[9,8]].map(([t,b], i) => (
          <TimeSignatureDiagram key={i} top={t} bottom={b} />
        ))}
      </div>
    );

  // ── Intervals ──
  if (title.includes("interval"))
    return wrap(<IntervalDiagram />);

  // ── Drum Patterns ──
  if (title.includes("your first drum") || title.includes("drum pattern"))
    return wrap(<StepSequencer title="BASIC DRUM PATTERN" pattern={{
      "Kick":   [0, 8],
      "Snare":  [4, 12],
      "Hi-Hat": [0,2,4,6,8,10,12,14],
    }} />);

  if (title.includes("kick drum"))
    return wrap(<StepSequencer title="KICK DRUM PATTERNS" pattern={{
      "4-on-Floor": [0,4,8,12],
      "Hip-Hop":    [0,6,10,14],
      "Trap":       [0,3,8,11,14],
    }} color={C.orange} />);

  if (title.includes("snare") || title.includes("clap"))
    return wrap(<StepSequencer title="SNARE & CLAP PATTERNS" pattern={{
      "Standard":  [4,12],
      "Syncopated":[4,10,14],
      "Double":    [4,6,12,14],
    }} color={C.yellow} />);

  if (title.includes("hi-hat"))
    return wrap(<StepSequencer title="HI-HAT PATTERNS" pattern={{
      "Straight":  [0,2,4,6,8,10,12,14],
      "Offbeat":   [1,3,5,7,9,11,13,15],
      "Trap Open": [0,4,8,12,14],
    }} color={C.cyan} />);

  if (title.includes("808"))
    return wrap(<StepSequencer title="808 BASS PATTERNS" pattern={{
      "Simple":  [0,6,10],
      "Sliding": [0,2,8,12],
      "Trap 808":[0,3,6,10,13],
    }} color={C.red} />);

  // ── Song Structure ──
  if (title.includes("intro, verse") || title.includes("song structure") || title.includes("chorus"))
    return wrap(<SongStructureDiagram title="STANDARD SONG STRUCTURE" structure={[
      {name:"Intro",bars:4,desc:"Set mood"},
      {name:"Verse",bars:8,desc:"Story"},
      {name:"Pre-Chorus",bars:4,desc:"Build"},
      {name:"Chorus",bars:8,desc:"Hook!"},
      {name:"Verse",bars:8,desc:"Deepen"},
      {name:"Chorus",bars:8,desc:"Hook!"},
      {name:"Bridge",bars:4,desc:"Contrast"},
      {name:"Chorus",bars:8,desc:"Big!"},
      {name:"Outro",bars:4,desc:"Fade"},
    ]} />);

  if (title.includes("hip-hop vs pop") || title.includes("structure in hip"))
    return wrap(
      <div>
        <SongStructureDiagram title="HIP-HOP STRUCTURE" structure={[
          {name:"Intro",bars:4},{name:"Verse",bars:16},{name:"Hook",bars:8},
          {name:"Verse",bars:16},{name:"Hook",bars:8},{name:"Bridge",bars:8},{name:"Hook",bars:8},
        ]} />
        <SongStructureDiagram title="EDM / TRAP STRUCTURE" structure={[
          {name:"Intro",bars:8},{name:"Build",bars:8},{name:"Drop",bars:16},
          {name:"Break",bars:8},{name:"Build",bars:8},{name:"Drop",bars:16},{name:"Outro",bars:8},
        ]} />
      </div>
    );

  // ── EQ / Compression / Effects ──
  if (title.includes("eq") || title.includes("equali"))
    return wrap(<EQDiagram />);

  if (title.includes("compression") || title.includes("dynamics"))
    return wrap(<CompressionDiagram />);

  if (title.includes("reverb"))
    return wrap(<ReverbDiagram type="reverb" />);

  if (title.includes("delay") || title.includes("echo"))
    return wrap(<ReverbDiagram type="delay" />);

  if (title.includes("panning") || title.includes("width"))
    return wrap(<PanningDiagram />);

  // ── Camelot / Keys ──
  if (title.includes("camelot"))
    return wrap(<CamelotWheel />);

  if (title.includes("what is a key") || title.includes("keys create brand"))
    return wrap(<PianoKeyboard highlightNotes={["C","D","E","F","G","A","B"]}
      labelNotes={["C","D","E","F","G","A","B"].map(n => ({note:n, label:n}))}
      title="C MAJOR KEY — THE WHITE KEYS" numOctaves={2} />);

  // ── Default — no diagram ──
  return null;
};

export default LessonDiagram;
