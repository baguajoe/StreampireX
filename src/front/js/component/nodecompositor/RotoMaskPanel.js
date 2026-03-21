// =============================================================================
// RotoMaskPanel.js — Professional Rotoscoping / Mask Panel
// =============================================================================
// Features: Multi-mask, per-point feather, motion blur, mask layers,
//           tracking markers, hold/ease keyframes, mask operations
// Competitive with: Nuke's RotoPaint, Fusion's Polygon/BSpline mask
// =============================================================================
import React, { useState, useCallback } from "react";
import { createBezierMaskPoint } from "../../utils/compositor/maskUtils";

const uid = () => `mask_${Date.now()}_${Math.random().toString(36).slice(2,6)}`;

const DEFAULT_MASK = () => ({
  id: uid(),
  name: 'Mask 1',
  shape: 'bezier',
  points: [],
  x: 50, y: 50,
  width: 40, height: 40,
  feather: 0,
  featherFalloff: 'linear',
  invert: false,
  visible: true,
  locked: false,
  opacity: 1,
  blendMode: 'add',           // add, subtract, intersect, replace
  motionBlur: false,
  motionBlurSamples: 8,
  motionBlurShutter: 180,
  trackingEnabled: false,
  trackingMarkers: [],
  keyframes: [],
  color: '#00ffc8',
});

export default function RotoMaskPanel({ rotoMasks, setRotoMasks }) {
  const [activeMaskId, setActiveMaskId] = useState(null);
  const [showKeyframes, setShowKeyframes] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  const masks = rotoMasks || [];
  const active = masks.find(m => m.id === activeMaskId) || masks[0];

  const update = useCallback((patch) => {
    if (!active) return;
    setRotoMasks(prev => prev.map(m => m.id === active.id ? { ...m, ...patch } : m));
  }, [active, setRotoMasks]);

  const addMask = () => {
    const m = DEFAULT_MASK();
    m.name = `Mask ${masks.length + 1}`;
    setRotoMasks(prev => [...prev, m]);
    setActiveMaskId(m.id);
  };

  const removeMask = (id) => {
    setRotoMasks(prev => prev.filter(m => m.id !== id));
    if (activeMaskId === id) setActiveMaskId(null);
  };

  const duplicateMask = () => {
    if (!active) return;
    const copy = { ...JSON.parse(JSON.stringify(active)), id: uid(), name: active.name + ' Copy' };
    setRotoMasks(prev => [...prev, copy]);
    setActiveMaskId(copy.id);
  };

  const addPoint = () => {
    const next = createBezierMaskPoint(50, 50);
    update({ points: [...(active?.points || []), next] });
  };

  const removeLastPoint = () => {
    if (!active?.points?.length) return;
    update({ points: active.points.slice(0, -1) });
  };

  const addKeyframe = () => {
    if (!active) return;
    const kf = {
      time: currentTime,
      x: active.x, y: active.y,
      width: active.width, height: active.height,
      points: JSON.parse(JSON.stringify(active.points || [])),
    };
    const existing = (active.keyframes || []).filter(k => k.time !== currentTime);
    update({ keyframes: [...existing, kf].sort((a,b) => a.time - b.time) });
  };

  const addTrackingMarker = () => {
    const marker = { id: uid(), x: 50, y: 50, size: 20, name: `Track ${(active?.trackingMarkers||[]).length + 1}` };
    update({ trackingMarkers: [...(active?.trackingMarkers || []), marker] });
  };

  const S = {
    panel: { fontFamily: 'monospace', fontSize: 11, color: '#cdd6f4', background: '#1e1e2e' },
    title: { fontWeight: 700, fontSize: 12, color: '#cba6f7', padding: '8px 10px', borderBottom: '1px solid #313244' },
    section: { padding: '6px 10px', borderBottom: '1px solid #181825' },
    sectionTitle: { color: '#a6adc8', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
    maskRow: (active) => ({
      display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px',
      background: active ? 'rgba(203,166,247,0.1)' : 'transparent',
      borderLeft: active ? '2px solid #cba6f7' : '2px solid transparent',
      cursor: 'pointer', borderRadius: 3,
    }),
    field: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 },
    label: { color: '#a6adc8', minWidth: 80, fontSize: 10 },
    input: { flex: 1, background: '#181825', border: '1px solid #313244', color: '#cdd6f4', borderRadius: 3, padding: '2px 6px', fontSize: 11 },
    range: { flex: 1, accentColor: '#cba6f7' },
    btn: (active) => ({
      padding: '3px 8px', borderRadius: 3, border: 'none', cursor: 'pointer', fontSize: 10, fontWeight: 700,
      background: active ? '#cba6f7' : '#313244', color: active ? '#1e1e2e' : '#cdd6f4',
    }),
    btnDanger: { padding: '3px 8px', borderRadius: 3, border: 'none', cursor: 'pointer', fontSize: 10, background: '#f38ba8', color: '#1e1e2e', fontWeight: 700 },
  };

  return (
    <div style={S.panel}>
      <div style={S.title}>✂ Roto / Mask</div>

      {/* ── Mask List ── */}
      <div style={S.section}>
        <div style={S.sectionTitle}>Masks</div>
        <div style={{ maxHeight: 120, overflowY: 'auto', marginBottom: 6 }}>
          {masks.map(m => (
            <div key={m.id} style={S.maskRow(m.id === active?.id)} onClick={() => setActiveMaskId(m.id)}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: m.color || '#00ffc8' }}/>
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</span>
              <button style={{ ...S.btn(false), padding: '1px 4px' }}
                onClick={e => { e.stopPropagation(); update({ visible: !m.visible }); }}>
                {m.visible ? '👁' : '🙈'}
              </button>
              <button style={{ ...S.btn(false), padding: '1px 4px' }}
                onClick={e => { e.stopPropagation(); update({ locked: !m.locked }); }}>
                {m.locked ? '🔒' : '🔓'}
              </button>
              <button style={{ ...S.btn(false), padding: '1px 4px', color: '#f38ba8' }}
                onClick={e => { e.stopPropagation(); removeMask(m.id); }}>✕</button>
            </div>
          ))}
          {masks.length === 0 && <div style={{ color: '#585b70', fontSize: 10, padding: '4px 0' }}>No masks — click + to add</div>}
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button style={S.btn(false)} onClick={addMask}>+ Add</button>
          <button style={S.btn(false)} onClick={duplicateMask} disabled={!active}>⊕ Dupe</button>
        </div>
      </div>

      {active && (<>
        {/* ── Shape & Basic Props ── */}
        <div style={S.section}>
          <div style={S.sectionTitle}>Shape</div>
          <div style={S.field}>
            <span style={S.label}>Type</span>
            <select style={S.input} value={active.shape} onChange={e => update({ shape: e.target.value })}>
              <option value="bezier">Bezier</option>
              <option value="bspline">B-Spline</option>
              <option value="rectangle">Rectangle</option>
              <option value="ellipse">Ellipse</option>
              <option value="polygon">Polygon</option>
            </select>
          </div>
          <div style={S.field}>
            <span style={S.label}>Blend</span>
            <select style={S.input} value={active.blendMode} onChange={e => update({ blendMode: e.target.value })}>
              <option value="add">Add</option>
              <option value="subtract">Subtract</option>
              <option value="intersect">Intersect</option>
              <option value="replace">Replace</option>
            </select>
          </div>
          <div style={S.field}>
            <span style={S.label}>Color</span>
            <input type="color" value={active.color || '#00ffc8'} onChange={e => update({ color: e.target.value })}
              style={{ width: 40, height: 24, border: 'none', borderRadius: 3, cursor: 'pointer' }}/>
          </div>
        </div>

        {/* ── Transform ── */}
        <div style={S.section}>
          <div style={S.sectionTitle}>Transform</div>
          {[['X', 'x'], ['Y', 'y'], ['W', 'width'], ['H', 'height']].map(([lbl, key]) => (
            <div key={key} style={S.field}>
              <span style={S.label}>{lbl}</span>
              <input type="number" style={S.input} value={active[key] ?? 50}
                onChange={e => update({ [key]: parseFloat(e.target.value || 0) })}/>
            </div>
          ))}
        </div>

        {/* ── Feather ── */}
        <div style={S.section}>
          <div style={S.sectionTitle}>Feather</div>
          <div style={S.field}>
            <span style={S.label}>Amount</span>
            <input type="range" min={0} max={200} value={active.feather ?? 0}
              onChange={e => update({ feather: parseFloat(e.target.value) })} style={S.range}/>
            <span style={{ color: '#cba6f7', minWidth: 28 }}>{active.feather ?? 0}</span>
          </div>
          <div style={S.field}>
            <span style={S.label}>Falloff</span>
            <select style={S.input} value={active.featherFalloff || 'linear'}
              onChange={e => update({ featherFalloff: e.target.value })}>
              <option value="linear">Linear</option>
              <option value="smooth">Smooth</option>
              <option value="ease_in">Ease In</option>
              <option value="ease_out">Ease Out</option>
            </select>
          </div>
          <div style={S.field}>
            <span style={S.label}>Opacity</span>
            <input type="range" min={0} max={1} step={0.01} value={active.opacity ?? 1}
              onChange={e => update({ opacity: parseFloat(e.target.value) })} style={S.range}/>
            <span style={{ color: '#cba6f7', minWidth: 28 }}>{Math.round((active.opacity ?? 1) * 100)}%</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input type="checkbox" checked={!!active.invert} onChange={e => update({ invert: e.target.checked })}/>
            <span>Invert mask</span>
          </div>
        </div>

        {/* ── Motion Blur ── */}
        <div style={S.section}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <div style={S.sectionTitle}>Motion Blur</div>
            <input type="checkbox" checked={!!active.motionBlur} onChange={e => update({ motionBlur: e.target.checked })}/>
          </div>
          {active.motionBlur && (<>
            <div style={S.field}>
              <span style={S.label}>Samples</span>
              <input type="range" min={2} max={32} step={1} value={active.motionBlurSamples ?? 8}
                onChange={e => update({ motionBlurSamples: parseInt(e.target.value) })} style={S.range}/>
              <span style={{ color: '#cba6f7', minWidth: 20 }}>{active.motionBlurSamples ?? 8}</span>
            </div>
            <div style={S.field}>
              <span style={S.label}>Shutter °</span>
              <input type="range" min={0} max={360} step={1} value={active.motionBlurShutter ?? 180}
                onChange={e => update({ motionBlurShutter: parseInt(e.target.value) })} style={S.range}/>
              <span style={{ color: '#cba6f7', minWidth: 28 }}>{active.motionBlurShutter ?? 180}°</span>
            </div>
          </>)}
        </div>

        {/* ── Points ── */}
        <div style={S.section}>
          <div style={S.sectionTitle}>Bezier Points ({(active.points||[]).length})</div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            <button style={S.btn(false)} onClick={addPoint}>+ Point</button>
            <button style={S.btn(false)} onClick={removeLastPoint} disabled={!active.points?.length}>- Point</button>
            <button style={S.btn(false)} onClick={() => update({ points: [] })}>Clear</button>
          </div>
        </div>

        {/* ── Tracking ── */}
        <div style={S.section}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <div style={S.sectionTitle}>Tracking</div>
            <input type="checkbox" checked={!!active.trackingEnabled}
              onChange={e => update({ trackingEnabled: e.target.checked })}/>
          </div>
          {active.trackingEnabled && (
            <div>
              <button style={S.btn(false)} onClick={addTrackingMarker}>+ Marker</button>
              <div style={{ fontSize: 10, color: '#585b70', marginTop: 4 }}>
                {(active.trackingMarkers||[]).length} markers placed
              </div>
            </div>
          )}
        </div>

        {/* ── Keyframes ── */}
        <div style={S.section}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <div style={S.sectionTitle}>Keyframes ({(active.keyframes||[]).length})</div>
            <button style={S.btn(showKeyframes)} onClick={() => setShowKeyframes(v => !v)}>
              {showKeyframes ? '▲' : '▼'}
            </button>
          </div>
          <div style={S.field}>
            <span style={S.label}>Time</span>
            <input type="number" style={S.input} value={currentTime}
              onChange={e => setCurrentTime(parseFloat(e.target.value || 0))} step={0.1}/>
            <button style={S.btn(false)} onClick={addKeyframe}>◆ Set</button>
          </div>
          {showKeyframes && (active.keyframes||[]).map((kf, i) => (
            <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center', padding: '2px 0' }}>
              <span style={{ color: '#cba6f7' }}>◆</span>
              <span style={{ flex: 1, color: '#a6adc8' }}>t={kf.time.toFixed(2)}s</span>
              <button style={{ ...S.btn(false), padding: '1px 4px', color: '#f38ba8' }}
                onClick={() => update({ keyframes: active.keyframes.filter((_, j) => j !== i) })}>✕</button>
            </div>
          ))}
        </div>
      </>)}
    </div>
  );
}
