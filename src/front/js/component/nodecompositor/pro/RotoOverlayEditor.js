// src/front/js/component/nodecompositor/pro/RotoOverlayEditor.js
import React, { useRef, useState, useCallback, useEffect } from "react";
import {
  createEmptyRotoShape, addRotoPoint, updateRotoPoint,
  removeRotoPoint, getRotoPathData,
} from "../../../utils/compositor/pro/rotoEditor";

const S = { bg:'#0d1117', accent:'#00ffc8', border:'rgba(0,255,200,0.15)', text:'#dde6ef', dim:'#4e6a82', red:'#ff4757' };

export default function RotoOverlayEditor({ shape: externalShape, setShape, width=640, height=360 }) {
  const wrapRef = useRef(null);
  const [shape, setLocal] = useState(externalShape || createEmptyRotoShape());
  const [selected, setSelected] = useState(null);
  const [dragging, setDragging] = useState(null);
  const [mode, setMode] = useState('add'); // add | select | delete

  const sync = useCallback((next) => { setLocal(next); setShape?.(next); }, [setShape]);

  useEffect(() => { if (externalShape) setLocal(externalShape); }, [externalShape]);

  const getXY = (e) => {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return { x:0, y:0 };
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onCanvasClick = (e) => {
    if (mode !== 'add') return;
    const { x, y } = getXY(e);
    sync(addRotoPoint(shape, x, y));
  };

  const onPointMouseDown = (e, idx) => {
    e.stopPropagation();
    if (mode === 'delete') { sync(removeRotoPoint(shape, idx)); return; }
    setSelected(idx);
    setDragging({ idx, startX: e.clientX, startY: e.clientY, ox: shape.points[idx].x, oy: shape.points[idx].y });
  };

  const onMouseMove = useCallback((e) => {
    if (!dragging) return;
    const dx = e.clientX - dragging.startX;
    const dy = e.clientY - dragging.startY;
    sync(updateRotoPoint(shape, dragging.idx, {
      x: dragging.ox + dx, y: dragging.oy + dy,
      inX: shape.points[dragging.idx].inX + dx, inY: shape.points[dragging.idx].inY + dy,
      outX: shape.points[dragging.idx].outX + dx, outY: shape.points[dragging.idx].outY + dy,
    }));
  }, [dragging, shape, sync]);

  const onMouseUp = () => setDragging(null);

  const pathData = getRotoPathData(shape);

  return (
    <div className="motion-panel">
      <div className="motion-panel-title">🎭 Roto Overlay Editor</div>

      <div style={{ display:'flex', gap:6, marginBottom:8 }}>
        {['add','select','delete'].map(m => (
          <button key={m} onClick={() => setMode(m)} style={{
            padding:'3px 10px', borderRadius:4, cursor:'pointer', fontSize:'0.7rem', fontWeight:700,
            background: mode===m ? S.accent : 'transparent',
            color: mode===m ? '#000' : S.dim,
            border: `1px solid ${mode===m ? S.accent : S.border}`,
          }}>{m.charAt(0).toUpperCase()+m.slice(1)}</button>
        ))}
        <button onClick={() => sync(createEmptyRotoShape())} style={{
          marginLeft:'auto', padding:'3px 10px', borderRadius:4, cursor:'pointer',
          fontSize:'0.7rem', background:'transparent', color:S.red, border:`1px solid ${S.red}`,
        }}>Clear</button>
      </div>

      <div ref={wrapRef}
        style={{ width, height, position:'relative', background:'#081220', borderRadius:8,
          border:`1px solid ${S.border}`, cursor: mode==='add' ? 'crosshair' : 'default', overflow:'hidden' }}
        onClick={onCanvasClick}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
      >
        <svg width={width} height={height} style={{ position:'absolute', top:0, left:0 }}>
          {pathData && (
            <path d={pathData} fill={`${S.accent}22`} stroke={S.accent} strokeWidth="1.5"
              strokeDasharray={shape.closed ? 'none' : '6 3'} />
          )}
          {shape.points.map((p, i) => (
            <g key={i}>
              <line x1={p.inX} y1={p.inY} x2={p.x} y2={p.y} stroke={S.dim} strokeWidth="1" />
              <line x1={p.x} y1={p.y} x2={p.outX} y2={p.outY} stroke={S.dim} strokeWidth="1" />
              <circle cx={p.inX} cy={p.inY} r="4" fill={S.dim} style={{ cursor:'move' }} />
              <circle cx={p.outX} cy={p.outY} r="4" fill={S.dim} style={{ cursor:'move' }} />
              <circle cx={p.x} cy={p.y} r="6"
                fill={selected===i ? S.accent : '#fff'}
                stroke={S.accent} strokeWidth="1.5"
                style={{ cursor:'move' }}
                onMouseDown={(e) => onPointMouseDown(e, i)}
              />
            </g>
          ))}
        </svg>
        <div style={{ position:'absolute', bottom:6, right:8, fontSize:'0.65rem', color:S.dim }}>
          {shape.points.length} points • {mode} mode
        </div>
      </div>

      <div style={{ display:'flex', gap:12, marginTop:8, fontSize:'0.7rem' }}>
        <label style={{ color:S.dim }}>
          <input type="checkbox" checked={shape.closed} onChange={e => sync({...shape, closed:e.target.checked})} style={{ marginRight:4 }} />
          Closed
        </label>
        <label style={{ color:S.dim }}>
          <input type="checkbox" checked={shape.invert} onChange={e => sync({...shape, invert:e.target.checked})} style={{ marginRight:4 }} />
          Invert
        </label>
        <label style={{ color:S.dim, display:'flex', alignItems:'center', gap:4 }}>
          Feather
          <input type="range" min={0} max={40} value={shape.feather}
            onChange={e => sync({...shape, feather:Number(e.target.value)})}
            style={{ width:60 }} />
          <span style={{ color:S.accent }}>{shape.feather}px</span>
        </label>
      </div>
    </div>
  );
}
