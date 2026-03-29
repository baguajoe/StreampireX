// =============================================================================
// VideoEditorTitleDesigner.js — Title/Graphics/Lower Thirds designer
// Animated text, lower thirds, titles, graphics overlays
// =============================================================================

import React, { useState, useRef, useEffect, useCallback } from 'react';

const FONT_FAMILIES = [
  'JetBrains Mono', 'Arial', 'Helvetica', 'Georgia', 'Impact',
  'Times New Roman', 'Courier New', 'Verdana', 'Trebuchet MS',
];

const ANIMATIONS = [
  { id: 'none',      label: 'None' },
  { id: 'fadeIn',    label: 'Fade In' },
  { id: 'slideUp',   label: 'Slide Up' },
  { id: 'slideLeft', label: 'Slide Left' },
  { id: 'typewriter',label: 'Typewriter' },
  { id: 'bounce',    label: 'Bounce' },
  { id: 'glow',      label: 'Glow Pulse' },
];

const PRESETS = [
  { id: 'lower_third', label: 'Lower Third', elements: [
    { id: 1, type: 'text', text: 'Name Here', x: 8, y: 75, fontSize: 28, fontFamily: 'Arial', color: '#ffffff', fontWeight: 'bold', animation: 'slideLeft', animDuration: 0.5, bg: 'none' },
    { id: 2, type: 'text', text: 'Title / Organization', x: 8, y: 84, fontSize: 18, fontFamily: 'Arial', color: '#00ffc8', fontWeight: 'normal', animation: 'slideLeft', animDuration: 0.7, bg: 'none' },
    { id: 3, type: 'rect', x: 8, y: 73, width: 40, height: 0.4, color: '#00ffc8', animation: 'slideLeft', animDuration: 0.3 },
  ]},
  { id: 'title_card', label: 'Title Card', elements: [
    { id: 1, type: 'text', text: 'TITLE', x: 50, y: 45, fontSize: 64, fontFamily: 'Impact', color: '#ffffff', fontWeight: 'bold', animation: 'fadeIn', animDuration: 0.8, textAlign: 'center', bg: 'none' },
    { id: 2, type: 'text', text: 'Subtitle text here', x: 50, y: 58, fontSize: 24, fontFamily: 'Arial', color: '#cccccc', fontWeight: 'normal', animation: 'fadeIn', animDuration: 1.2, textAlign: 'center', bg: 'none' },
  ]},
  { id: 'caption', label: 'Caption', elements: [
    { id: 1, type: 'text', text: 'Caption text goes here', x: 50, y: 88, fontSize: 22, fontFamily: 'Arial', color: '#ffffff', fontWeight: 'normal', animation: 'none', textAlign: 'center', bg: '#00000088' },
  ]},
  { id: 'credits', label: 'End Credits', elements: [
    { id: 1, type: 'text', text: 'Directed by\nYour Name', x: 50, y: 40, fontSize: 24, fontFamily: 'Georgia', color: '#ffffff', fontWeight: 'normal', animation: 'slideUp', animDuration: 1.0, textAlign: 'center', bg: 'none' },
  ]},
  { id: 'watermark', label: 'Watermark', elements: [
    { id: 1, type: 'text', text: '© StreamPireX', x: 94, y: 96, fontSize: 14, fontFamily: 'Arial', color: '#ffffff88', fontWeight: 'normal', animation: 'none', textAlign: 'right', bg: 'none' },
  ]},
];

function TitleElement({ el, selected, onSelect, onUpdate, canvasW, canvasH }) {
  const isText = el.type === 'text';
  const xPx = (el.x / 100) * canvasW;
  const yPx = (el.y / 100) * canvasH;

  if (!isText) {
    // Rectangle bar
    return (
      <div onClick={() => onSelect(el.id)} style={{
        position: 'absolute',
        left: `${el.x}%`, top: `${el.y}%`,
        width: `${el.width}%`, height: `${el.height}%`,
        background: el.color,
        cursor: 'pointer',
        outline: selected ? '1px dashed #00ffc8' : 'none',
      }} />
    );
  }

  return (
    <div onClick={() => onSelect(el.id)}
      style={{
        position: 'absolute',
        left: el.textAlign === 'center' ? '50%' : el.textAlign === 'right' ? 'auto' : `${el.x}%`,
        right: el.textAlign === 'right' ? `${100 - el.x}%` : 'auto',
        top: `${el.y}%`,
        transform: el.textAlign === 'center' ? 'translate(-50%, -50%)' : 'translateY(-50%)',
        fontSize: el.fontSize ? `${el.fontSize * (canvasW / 1920)}px` : 24,
        fontFamily: el.fontFamily || 'Arial',
        color: el.color || '#fff',
        fontWeight: el.fontWeight || 'normal',
        textAlign: el.textAlign || 'left',
        background: el.bg && el.bg !== 'none' ? el.bg : 'transparent',
        padding: el.bg && el.bg !== 'none' ? '2px 8px' : 0,
        cursor: 'pointer',
        outline: selected ? '1px dashed #00ffc8' : 'none',
        whiteSpace: 'pre-wrap',
        textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
        userSelect: 'none',
      }}>
      {el.text}
    </div>
  );
}

export default function VideoEditorTitleDesigner({ onAddToTimeline, onClose, currentTime }) {
  const canvasRef = useRef(null);
  const [elements, setElements] = useState([]);
  const [selectedEl, setSelectedEl] = useState(null);
  const [activePreset, setActivePreset] = useState(null);
  const [duration, setDuration] = useState(5);
  const [titleName, setTitleName] = useState('New Title');

  const loadPreset = (preset) => {
    setElements(preset.elements.map(el => ({ ...el, id: Date.now() + el.id })));
    setActivePreset(preset.id);
    setTitleName(preset.label);
  };

  const addTextElement = () => {
    const el = {
      id: Date.now(), type: 'text', text: 'New Text',
      x: 50, y: 50, fontSize: 32, fontFamily: 'Arial',
      color: '#ffffff', fontWeight: 'normal',
      animation: 'fadeIn', animDuration: 0.5,
      textAlign: 'center', bg: 'none',
    };
    setElements(prev => [...prev, el]);
    setSelectedEl(el.id);
  };

  const updateElement = (id, updates) => {
    setElements(prev => prev.map(el => el.id === id ? { ...el, ...updates } : el));
  };

  const deleteElement = (id) => {
    setElements(prev => prev.filter(el => el.id !== id));
    setSelectedEl(null);
  };

  const sel = elements.find(e => e.id === selectedEl);

  const handleAddToTimeline = () => {
    if (!elements.length) return;
    const titleClip = {
      id: Date.now(),
      title: titleName,
      type: 'title',
      startTime: currentTime || 0,
      duration,
      elements,
      effects: [],
      keyframes: [],
      compositing: { opacity: 100, blendMode: 'normal', position: {x:0,y:0}, scale: {x:100,y:100}, rotation: 0, anchor: {x:50,y:50} }
    };
    onAddToTimeline?.(titleClip);
    onClose?.();
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 9998,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'JetBrains Mono, monospace',
    }} onClick={onClose}>
      <div style={{
        background: '#0a0a14', border: '1px solid #1a2a3a', borderRadius: 8,
        width: '90vw', maxWidth: 1100, height: '85vh',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#0d1f35', borderBottom: '1px solid #1a2a3a' }}>
          <span style={{ fontSize: 11, color: '#00ffc8', fontWeight: 700 }}>🎬 TITLE DESIGNER</span>
          <input value={titleName} onChange={e => setTitleName(e.target.value)}
            style={{ background: '#0a1628', border: '1px solid #1a2a3a', color: '#ccc', padding: '3px 8px', borderRadius: 3, fontSize: 11, fontFamily: 'inherit', marginLeft: 8 }} />
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 10, color: '#5a7088' }}>Duration:</span>
            <input type="number" value={duration} onChange={e => setDuration(Math.max(0.5, parseFloat(e.target.value)))}
              style={{ width: 50, background: '#0a1628', border: '1px solid #1a2a3a', color: '#00ffc8', padding: '3px 6px', borderRadius: 3, fontSize: 11, fontFamily: 'inherit' }} />
            <span style={{ fontSize: 10, color: '#5a7088' }}>s</span>
            <button onClick={handleAddToTimeline}
              style={{ padding: '5px 16px', background: '#00ffc833', border: '1px solid #00ffc8', borderRadius: 4, color: '#00ffc8', cursor: 'pointer', fontSize: 11, fontWeight: 700, fontFamily: 'inherit' }}>
              + Add to Timeline
            </button>
            <button onClick={onClose}
              style={{ background: 'none', border: 'none', color: '#5a7088', cursor: 'pointer', fontSize: 16 }}>✕</button>
          </div>
        </div>

        {/* Body */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Left — Presets + Controls */}
          <div style={{ width: 220, borderRight: '1px solid #1a2a3a', overflowY: 'auto', padding: 8 }}>
            <div style={{ fontSize: 9, color: '#5a7088', marginBottom: 6, letterSpacing: 1 }}>PRESETS</div>
            {PRESETS.map(preset => (
              <button key={preset.id} onClick={() => loadPreset(preset)}
                style={{
                  width: '100%', textAlign: 'left', padding: '6px 10px', marginBottom: 3,
                  background: activePreset === preset.id ? '#00ffc822' : '#0d1f35',
                  border: `1px solid ${activePreset === preset.id ? '#00ffc8' : '#1a2a3a'}`,
                  borderRadius: 3, color: activePreset === preset.id ? '#00ffc8' : '#ccc',
                  cursor: 'pointer', fontSize: 10, fontFamily: 'inherit',
                }}>{preset.label}</button>
            ))}

            <div style={{ fontSize: 9, color: '#5a7088', margin: '12px 0 6px', letterSpacing: 1 }}>ADD ELEMENTS</div>
            <button onClick={addTextElement}
              style={{ width: '100%', padding: '6px 10px', background: '#0d1f35', border: '1px solid #1a2a3a', borderRadius: 3, color: '#ccc', cursor: 'pointer', fontSize: 10, fontFamily: 'inherit', marginBottom: 4 }}>
              + Text
            </button>

            {/* Element list */}
            {elements.length > 0 && (
              <>
                <div style={{ fontSize: 9, color: '#5a7088', margin: '12px 0 6px', letterSpacing: 1 }}>ELEMENTS</div>
                {elements.map(el => (
                  <div key={el.id}
                    onClick={() => setSelectedEl(el.id)}
                    style={{
                      padding: '5px 8px', marginBottom: 3, borderRadius: 3, cursor: 'pointer',
                      background: selectedEl === el.id ? '#00ffc822' : '#070f1a',
                      border: `1px solid ${selectedEl === el.id ? '#00ffc8' : '#1a2a3a'}`,
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}>
                    <span style={{ fontSize: 9, color: selectedEl === el.id ? '#00ffc8' : '#ccc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 }}>
                      {el.type === 'text' ? el.text : 'Bar'}
                    </span>
                    <button onClick={e => { e.stopPropagation(); deleteElement(el.id); }}
                      style={{ background: 'none', border: 'none', color: '#ff4444', cursor: 'pointer', fontSize: 11, padding: 0 }}>×</button>
                  </div>
                ))}
              </>
            )}
          </div>

          {/* Center — Canvas preview */}
          <div style={{ flex: 1, background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
            <div ref={canvasRef} style={{
              width: '100%', maxWidth: 800, aspectRatio: '16/9',
              background: '#000', position: 'relative', overflow: 'hidden',
            }}>
              {/* Grid overlay */}
              <div style={{ position: 'absolute', inset: 0, opacity: 0.1, backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '10% 10%', pointerEvents: 'none' }} />
              {/* Elements */}
              {elements.map(el => (
                <TitleElement key={el.id} el={el}
                  selected={selectedEl === el.id}
                  onSelect={setSelectedEl}
                  onUpdate={updateElement}
                  canvasW={800} canvasH={450}
                />
              ))}
            </div>
          </div>

          {/* Right — Properties */}
          {sel && (
            <div style={{ width: 220, borderLeft: '1px solid #1a2a3a', overflowY: 'auto', padding: 8 }}>
              <div style={{ fontSize: 9, color: '#5a7088', marginBottom: 8, letterSpacing: 1 }}>PROPERTIES</div>

              {sel.type === 'text' && (
                <>
                  <label style={{ fontSize: 9, color: '#5a7088' }}>Text</label>
                  <textarea value={sel.text} onChange={e => updateElement(sel.id, { text: e.target.value })}
                    style={{ width: '100%', background: '#0a1628', border: '1px solid #1a2a3a', color: '#ccc', padding: 4, borderRadius: 3, fontSize: 10, fontFamily: 'inherit', marginBottom: 6, resize: 'vertical', minHeight: 50 }} />

                  <label style={{ fontSize: 9, color: '#5a7088' }}>Font</label>
                  <select value={sel.fontFamily} onChange={e => updateElement(sel.id, { fontFamily: e.target.value })}
                    style={{ width: '100%', background: '#0a1628', border: '1px solid #1a2a3a', color: '#ccc', padding: 4, borderRadius: 3, fontSize: 10, marginBottom: 6 }}>
                    {FONT_FAMILIES.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>

                  <label style={{ fontSize: 9, color: '#5a7088' }}>Size</label>
                  <input type="number" value={sel.fontSize} onChange={e => updateElement(sel.id, { fontSize: parseInt(e.target.value) })}
                    style={{ width: '100%', background: '#0a1628', border: '1px solid #1a2a3a', color: '#00ffc8', padding: 4, borderRadius: 3, fontSize: 10, marginBottom: 6 }} />

                  <label style={{ fontSize: 9, color: '#5a7088' }}>Color</label>
                  <input type="color" value={sel.color} onChange={e => updateElement(sel.id, { color: e.target.value })}
                    style={{ width: '100%', height: 28, background: '#0a1628', border: '1px solid #1a2a3a', borderRadius: 3, marginBottom: 6, cursor: 'pointer' }} />

                  <label style={{ fontSize: 9, color: '#5a7088' }}>Animation</label>
                  <select value={sel.animation} onChange={e => updateElement(sel.id, { animation: e.target.value })}
                    style={{ width: '100%', background: '#0a1628', border: '1px solid #1a2a3a', color: '#ccc', padding: 4, borderRadius: 3, fontSize: 10, marginBottom: 6 }}>
                    {ANIMATIONS.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
                  </select>

                  <label style={{ fontSize: 9, color: '#5a7088' }}>Align</label>
                  <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
                    {['left','center','right'].map(align => (
                      <button key={align} onClick={() => updateElement(sel.id, { textAlign: align })}
                        style={{ flex: 1, padding: '4px 0', fontSize: 9, fontWeight: 700, borderRadius: 3, cursor: 'pointer', border: `1px solid ${sel.textAlign === align ? '#00ffc8' : '#1a2a3a'}`, background: sel.textAlign === align ? '#00ffc822' : '#0a1628', color: sel.textAlign === align ? '#00ffc8' : '#5a7088', fontFamily: 'inherit' }}>
                        {align[0].toUpperCase()}
                      </button>
                    ))}
                  </div>

                  <label style={{ fontSize: 9, color: '#5a7088' }}>X Position (%)</label>
                  <input type="number" value={sel.x} onChange={e => updateElement(sel.id, { x: parseFloat(e.target.value) })}
                    style={{ width: '100%', background: '#0a1628', border: '1px solid #1a2a3a', color: '#ccc', padding: 4, borderRadius: 3, fontSize: 10, marginBottom: 4 }} />

                  <label style={{ fontSize: 9, color: '#5a7088' }}>Y Position (%)</label>
                  <input type="number" value={sel.y} onChange={e => updateElement(sel.id, { y: parseFloat(e.target.value) })}
                    style={{ width: '100%', background: '#0a1628', border: '1px solid #1a2a3a', color: '#ccc', padding: 4, borderRadius: 3, fontSize: 10, marginBottom: 4 }} />
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
