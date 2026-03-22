// =============================================================================
// MIDIMappingPanel.js — Visual MIDI CC Mapping Editor
// =============================================================================
import React, { useState } from 'react';

const MAPPABLE_ACTIONS = [
  { action: 'play',          label: 'Play/Pause',       category: 'Transport' },
  { action: 'stop',          label: 'Stop',             category: 'Transport' },
  { action: 'record',        label: 'Record',           category: 'Transport' },
  { action: 'cycleToggle',   label: 'Cycle On/Off',     category: 'Transport' },
  { action: 'masterVolume',  label: 'Master Volume',    category: 'Master' },
  { action: 'masterPan',     label: 'Master Pan',       category: 'Master' },
  ...Array.from({length:16},(_,i) => ({ action:'trackVolume', label:`Track ${i+1} Volume`, category:'Tracks', trackIdx:i })),
  ...Array.from({length:16},(_,i) => ({ action:'trackMute',   label:`Track ${i+1} Mute`,   category:'Tracks', trackIdx:i })),
  ...Array.from({length:16},(_,i) => ({ action:'trackSolo',   label:`Track ${i+1} Solo`,   category:'Tracks', trackIdx:i })),
];

export const MIDIMappingPanel = ({ mappings = [], onStartLearn, onRemoveMapping, onClose }) => {
  const [activeCategory, setActiveCategory] = useState('Transport');
  const categories = [...new Set(MAPPABLE_ACTIONS.map(a => a.category))];

  const filteredActions = MAPPABLE_ACTIONS.filter(a => a.category === activeCategory);

  return (
    <div className="midi-map-panel">
      <div className="mmp-header">
        <span className="mmp-title">🎹 MIDI Controller Mapping</span>
        <button className="mmp-close" onClick={onClose}>✕</button>
      </div>

      <div className="mmp-info">
        Move a knob/fader on your controller after clicking Learn to assign it.
        Default mappings: CC1=Master Vol, CC7=Volume, CC64=Play/Stop.
      </div>

      <div className="mmp-body">
        <div className="mmp-sidebar">
          {categories.map(cat => (
            <button key={cat} className={`mmp-cat-btn ${activeCategory===cat?'active':''}`} onClick={()=>setActiveCategory(cat)}>
              {cat}
            </button>
          ))}
        </div>

        <div className="mmp-content">
          {filteredActions.map((action, i) => {
            const key = action.trackIdx !== undefined ? `${action.action}_${action.trackIdx}` : action.action;
            const mapping = mappings.find(m => m.action === action.action && m.trackIdx === action.trackIdx);
            return (
              <div key={i} className="mmp-row">
                <span className="mmp-action-label">{action.label}</span>
                {mapping ? (
                  <div className="mmp-assigned">
                    <span className="mmp-cc-badge">CC {mapping.cc}</span>
                    <button className="mmp-unmap-btn" onClick={() => onRemoveMapping?.(mapping.cc)}>✕</button>
                  </div>
                ) : (
                  <button className="mmp-learn-btn" onClick={() => onStartLearn?.({ action: action.action, trackIdx: action.trackIdx, label: action.label })}>
                    Learn
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// OnboardingFlow.js — First-time setup wizard
// =============================================================================
export const OnboardingFlow = ({ onComplete, onSkip }) => {
  const [step, setStep] = useState(0);
  const [choices, setChoices] = useState({ role: null, style: null, setup: null });

  const steps = [
    {
      title: "Welcome to StreamPireX Studio",
      subtitle: "The most powerful creator platform ever built.",
      content: (
        <div className="ob-choices">
          {['Music Producer', 'Filmmaker', 'Podcaster', 'Gamer', 'Educator', 'Content Creator'].map(role => (
            <button key={role} className={`ob-choice ${choices.role===role?'selected':''}`} onClick={()=>setChoices(c=>({...c,role}))}>
              {role}
            </button>
          ))}
        </div>
      ),
      question: "What best describes you?",
    },
    {
      title: "What's your primary style?",
      subtitle: "We'll customize your default layout.",
      content: (
        <div className="ob-choices">
          {['Hip-Hop / Trap', 'Pop / R&B', 'Electronic / EDM', 'Rock / Metal', 'Jazz / Soul', 'Lo-Fi / Chill', 'Film Score', 'Podcast'].map(style => (
            <button key={style} className={`ob-choice ${choices.style===style?'selected':''}`} onClick={()=>setChoices(c=>({...c,style}))}>
              {style}
            </button>
          ))}
        </div>
      ),
      question: "Select your primary genre or format",
    },
    {
      title: "Your setup",
      subtitle: "Helps us optimize latency settings.",
      content: (
        <div className="ob-choices">
          {[
            { id:'basic', label:'Basic Setup', sub:'Built-in speakers/headphones' },
            { id:'interface', label:'Audio Interface', sub:'Focusrite, Apollo, etc.' },
            { id:'pro', label:'Pro Studio', sub:'Hardware monitoring, ASIO' },
          ].map(s => (
            <button key={s.id} className={`ob-choice ob-choice-wide ${choices.setup===s.id?'selected':''}`} onClick={()=>setChoices(c=>({...c,setup:s.id}))}>
              <span className="ob-choice-label">{s.label}</span>
              <span className="ob-choice-sub">{s.sub}</span>
            </button>
          ))}
        </div>
      ),
      question: "Describe your audio setup",
    },
    {
      title: "You're all set! 🎉",
      subtitle: "Here's what to know to get started:",
      content: (
        <div className="ob-tips">
          <div className="ob-tip">🎵 <strong>Add a track</strong> — Click the + button or press Ctrl+T</div>
          <div className="ob-tip">▶ <strong>Play/Stop</strong> — Spacebar or the transport controls</div>
          <div className="ob-tip">🔄 <strong>Loop a section</strong> — Drag on the ruler above the arrange view</div>
          <div className="ob-tip">🔌 <strong>Add effects</strong> — Click the FX slot on any track to open the plugin rack</div>
          <div className="ob-tip">🎹 <strong>MIDI controller</strong> — Enable in Settings → MIDI and start mapping</div>
          <div className="ob-tip">🎵 <strong>Sample library</strong> — Click the 🎵 icon in the toolbar to browse 1000+ sounds</div>
          <div className="ob-tip">💾 <strong>Save your project</strong> — Ctrl+S or click the save icon</div>
        </div>
      ),
      question: null,
    },
  ];

  const currentStep = steps[step];
  const isLast = step === steps.length - 1;

  return (
    <div className="onboarding-overlay">
      <div className="onboarding-modal">
        <div className="ob-progress">
          {steps.map((_, i) => (
            <div key={i} className={`ob-progress-dot ${i <= step ? 'active' : ''}`} />
          ))}
        </div>

        <div className="ob-content">
          <h2 className="ob-title">{currentStep.title}</h2>
          <p className="ob-subtitle">{currentStep.subtitle}</p>
          {currentStep.question && <p className="ob-question">{currentStep.question}</p>}
          {currentStep.content}
        </div>

        <div className="ob-footer">
          <button className="ob-skip" onClick={onSkip}>Skip setup</button>
          <button
            className="ob-next"
            onClick={() => isLast ? onComplete(choices) : setStep(s => s+1)}
            disabled={!isLast && !Object.values(choices)[step]}
          >
            {isLast ? 'Start Creating →' : 'Next →'}
          </button>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// ChordTrack.js — Chord track that transposes MIDI regions
// =============================================================================
const CHORD_TYPES = {
  'maj':  [0, 4, 7],
  'min':  [0, 3, 7],
  'dom7': [0, 4, 7, 10],
  'maj7': [0, 4, 7, 11],
  'min7': [0, 3, 7, 10],
  'dim':  [0, 3, 6],
  'aug':  [0, 4, 8],
  'sus2': [0, 2, 7],
  'sus4': [0, 5, 7],
};

const NOTES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

export const ChordTrack = ({ bpm, zoom, chords, onChordsChange, timeSignature = [4,4], scrollLeft = 0, width = 800 }) => {
  const [dragging, setDragging] = useState(null);
  const [showPicker, setShowPicker] = useState(null);
  const [newChordRoot, setNewChordRoot] = useState('C');
  const [newChordType, setNewChordType] = useState('maj');

  const beatsPerBar = timeSignature[0];
  const pxPerBeat = zoom;

  const beatToPx = (beat) => beat * pxPerBeat - scrollLeft;
  const pxToBeat = (px) => (px + scrollLeft) / pxPerBeat;
  const snapToBar = (beat) => Math.round(beat / beatsPerBar) * beatsPerBar;

  const handleClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const beat = snapToBar(pxToBeat(px));
    setShowPicker({ beat, x: e.clientX, y: e.clientY });
  };

  const addChord = () => {
    if (!showPicker) return;
    const chord = {
      id: Date.now(),
      beat: showPicker.beat,
      duration: beatsPerBar,
      root: newChordRoot,
      type: newChordType,
      intervals: CHORD_TYPES[newChordType],
    };
    onChordsChange?.([...(chords || []), chord].sort((a,b) => a.beat - b.beat));
    setShowPicker(null);
  };

  const removeChord = (id, e) => {
    e.stopPropagation();
    onChordsChange?.((chords || []).filter(c => c.id !== id));
  };

  return (
    <div className="chord-track" style={{position:'relative', height:32, background:'#0f0f1a', borderBottom:'1px solid #2a2a2a', overflow:'hidden', cursor:'pointer'}} onClick={handleClick}>
      {/* Chord blocks */}
      {(chords || []).map(chord => {
        const x = beatToPx(chord.beat);
        const w = chord.duration * pxPerBeat;
        if (x + w < 0 || x > width) return null;
        return (
          <div
            key={chord.id}
            className="chord-block"
            style={{
              position:'absolute', left:x, width:w, top:2, height:28,
              background:'linear-gradient(135deg, #1e1e3e, #2a2a4a)',
              border:'1px solid #4444aa', borderRadius:3,
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:11, color:'#a0a0ff', fontWeight:600,
              overflow:'hidden', whiteSpace:'nowrap',
              cursor:'pointer', userSelect:'none',
            }}
            onClick={e => e.stopPropagation()}
          >
            {chord.root}{chord.type !== 'maj' ? chord.type : ''}
            <button
              onClick={e => removeChord(chord.id, e)}
              style={{position:'absolute', right:2, top:1, background:'none', border:'none', color:'#666', cursor:'pointer', fontSize:10, padding:'0 2px', lineHeight:1}}
            >✕</button>
          </div>
        );
      })}

      {/* Chord picker popup */}
      {showPicker && (
        <div className="chord-picker" style={{position:'fixed', left:showPicker.x, top:showPicker.y-100, zIndex:1000, background:'#1e1e2e', border:'1px solid #3333aa', borderRadius:6, padding:10, boxShadow:'0 4px 20px rgba(0,0,0,0.5)'}}>
          <div style={{marginBottom:6, fontSize:11, color:'#aaa'}}>Add Chord at Bar {Math.floor(showPicker.beat/beatsPerBar)+1}</div>
          <div style={{display:'flex', gap:6, marginBottom:8}}>
            <select value={newChordRoot} onChange={e=>setNewChordRoot(e.target.value)} style={{background:'#252535', border:'1px solid #444', color:'#ddd', padding:'3px 6px', borderRadius:3, fontSize:12}}>
              {NOTES.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            <select value={newChordType} onChange={e=>setNewChordType(e.target.value)} style={{background:'#252535', border:'1px solid #444', color:'#ddd', padding:'3px 6px', borderRadius:3, fontSize:12}}>
              {Object.keys(CHORD_TYPES).map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div style={{display:'flex', gap:6}}>
            <button onClick={addChord} style={{background:'#4444cc', border:'none', color:'#fff', padding:'4px 12px', borderRadius:3, cursor:'pointer', fontSize:11}}>Add</button>
            <button onClick={()=>setShowPicker(null)} style={{background:'#333', border:'none', color:'#aaa', padding:'4px 10px', borderRadius:3, cursor:'pointer', fontSize:11}}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
};

// Utility: transpose MIDI notes by chord
export function transposeByChord(notes, chord, referenceChord = null) {
  if (!chord || !referenceChord) return notes;
  const semitones = (NOTES.indexOf(chord.root) - NOTES.indexOf(referenceChord.root) + 12) % 12;
  return notes.map(note => ({ ...note, note: Math.max(0, Math.min(127, (note.note || 60) + semitones)) }));
}

// =============================================================================
// CompTake.js — Comping (multiple takes, pick best)
// =============================================================================
export const CompTakeManager = ({ takes = [], activeTake, onSelectTake, onAddTake, onDeleteTake, onSoloTake }) => {
  return (
    <div className="comp-takes">
      <div className="ct-header">
        <span className="ct-title">🎙 Takes</span>
        <button className="ct-add-btn" onClick={onAddTake} title="New take">+ Take</button>
      </div>
      <div className="ct-list">
        {takes.map((take, i) => (
          <div key={take.id} className={`ct-row ${activeTake === take.id ? 'active' : ''}`}>
            <button className="ct-select-btn" onClick={() => onSelectTake(take.id)} title="Use this take">
              {activeTake === take.id ? '✓' : '○'}
            </button>
            <span className="ct-take-name">{take.name || `Take ${i+1}`}</span>
            <div className="ct-take-actions">
              <button className="ct-solo-btn" onClick={() => onSoloTake(take.id)} title="Audition">▶</button>
              <button className="ct-delete-btn" onClick={() => onDeleteTake(take.id)} title="Delete take">✕</button>
            </div>
          </div>
        ))}
        {takes.length === 0 && (
          <div style={{color:'#555', padding:'8px', fontSize:11}}>No takes yet. Record to create takes.</div>
        )}
      </div>
    </div>
  );
};
