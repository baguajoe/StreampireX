/**
 * SessionVersionControl.js
 * StreamPireX — Project Version Snapshots (closes Splice gap)
 *
 * Features:
 *  - Save named version snapshots of the current DAW session to R2
 *  - Browse, restore, and delete snapshots
 *  - Auto-save on configurable interval
 *  - Diff view: compare two snapshots
 *  - Export snapshot as downloadable JSON
 *
 * Backend: POST /api/session/snapshot, GET /api/session/snapshots, DELETE /api/session/snapshot/:id
 *
 * Integration:
 *   import SessionVersionControl from './SessionVersionControl';
 *   <SessionVersionControl
 *     sessionId={currentSessionId}
 *     sessionData={currentSessionState}
 *     onRestore={(snapshot) => loadSessionFromSnapshot(snapshot)}
 *   />
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';

// ---------------------------------------------------------------------------
// API helpers — swap BASE_URL to your Railway endpoint in production
// ---------------------------------------------------------------------------
const BASE_URL = process.env.REACT_APP_BACKEND_URL || '';

async function apiSaveSnapshot(sessionId, label, data, token) {
  const res = await fetch(`${BASE_URL}/api/session/snapshot`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ session_id: sessionId, label, data }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function apiGetSnapshots(sessionId, token) {
  const res = await fetch(`${BASE_URL}/api/session/snapshots?session_id=${sessionId}`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function apiDeleteSnapshot(snapshotId, token) {
  const res = await fetch(`${BASE_URL}/api/session/snapshot/${snapshotId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatDate(ts) {
  return new Date(ts).toLocaleString('en-US', {
    month:'short', day:'numeric', hour:'2-digit', minute:'2-digit',
  });
}

function sessionDiff(a, b) {
  // Returns a human-readable diff summary between two session states
  if (!a || !b) return [];
  const diffs = [];
  const aT = a.tracks?.length ?? 0;
  const bT = b.tracks?.length ?? 0;
  if (aT !== bT) diffs.push(`Tracks: ${aT} → ${bT}`);
  if (a.bpm !== b.bpm) diffs.push(`BPM: ${a.bpm} → ${b.bpm}`);
  if (a.key !== b.key) diffs.push(`Key: ${a.key} → ${b.key}`);
  const aC = a.tracks?.reduce((s, t) => s + (t.clips?.length ?? 0), 0) ?? 0;
  const bC = b.tracks?.reduce((s, t) => s + (t.clips?.length ?? 0), 0) ?? 0;
  if (aC !== bC) diffs.push(`Clips: ${aC} → ${bC}`);
  if (diffs.length === 0) diffs.push('No significant changes detected');
  return diffs;
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
export default function SessionVersionControl({
  sessionId,
  sessionData = {},
  onRestore = () => {},
  authToken = '',
  autoSaveInterval = 0, // minutes, 0 = disabled
}) {
  const [snapshots, setSnapshots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [label, setLabel] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [compareA, setCompareA] = useState(null);
  const [compareB, setCompareB] = useState(null);
  const [showDiff, setShowDiff] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [autoSaveCountdown, setAutoSaveCountdown] = useState(null);
  const autoSaveRef = useRef(null);

  // ---------------------------------------------------------------------------
  // Load snapshots
  // ---------------------------------------------------------------------------
  const loadSnapshots = useCallback(async () => {
    if (!sessionId) return;
    setLoading(true);
    try {
      // In real app: await apiGetSnapshots(sessionId, authToken)
      // Mock data for development:
      setSnapshots([
        {
          id: 'snap-1', label: 'Initial arrangement',
          created_at: Date.now() - 7200000,
          data: { tracks: [{id:'t1', clips:[]}], bpm: 120, key: 'C' },
          size_kb: 24,
        },
        {
          id: 'snap-2', label: 'Added bass line',
          created_at: Date.now() - 3600000,
          data: { tracks: [{id:'t1', clips:[{id:'c1'}]}, {id:'t2', clips:[{id:'c2'},{id:'c3'}]}], bpm: 120, key: 'C' },
          size_kb: 38,
        },
        {
          id: 'snap-3', label: 'Verse done',
          created_at: Date.now() - 1800000,
          data: { tracks: [{id:'t1', clips:[{id:'c1'}]}, {id:'t2', clips:[{id:'c2'},{id:'c3'}]}, {id:'t3', clips:[{id:'c4'}]}], bpm: 128, key: 'Am' },
          size_kb: 52,
        },
      ]);
    } catch (e) {
      setError('Failed to load snapshots');
    } finally {
      setLoading(false);
    }
  }, [sessionId, authToken]);

  useEffect(() => { loadSnapshots(); }, [loadSnapshots]);

  // ---------------------------------------------------------------------------
  // Auto-save
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!autoSaveInterval || autoSaveInterval <= 0) return;
    const intervalMs = autoSaveInterval * 60 * 1000;
    let remaining = intervalMs;
    const countdownTick = setInterval(() => {
      remaining -= 1000;
      setAutoSaveCountdown(Math.max(0, Math.ceil(remaining / 1000)));
      if (remaining <= 0) {
        remaining = intervalMs;
        handleSave(`Auto-save ${new Date().toLocaleTimeString()}`);
      }
    }, 1000);
    autoSaveRef.current = countdownTick;
    return () => clearInterval(countdownTick);
  }, [autoSaveInterval, sessionData]);

  // ---------------------------------------------------------------------------
  // Save snapshot
  // ---------------------------------------------------------------------------
  const handleSave = useCallback(async (customLabel) => {
    const snapshotLabel = customLabel || label.trim() || `Snapshot ${new Date().toLocaleTimeString()}`;
    setSaving(true);
    setError('');
    try {
      // In real app: await apiSaveSnapshot(sessionId, snapshotLabel, sessionData, authToken)
      const newSnap = {
        id: `snap-${Date.now()}`,
        label: snapshotLabel,
        created_at: Date.now(),
        data: { ...sessionData },
        size_kb: Math.round(JSON.stringify(sessionData).length / 1024) || 1,
      };
      setSnapshots(prev => [newSnap, ...prev]);
      setLabel('');
      setSuccess(`Saved: "${snapshotLabel}"`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) {
      setError('Save failed: ' + e.message);
    } finally {
      setSaving(false);
    }
  }, [label, sessionId, sessionData, authToken]);

  // ---------------------------------------------------------------------------
  // Restore
  // ---------------------------------------------------------------------------
  const handleRestore = useCallback((snap) => {
    if (!window.confirm(`Restore snapshot "${snap.label}"?\nUnsaved changes will be lost.`)) return;
    onRestore(snap.data);
    setSuccess(`Restored: "${snap.label}"`);
    setTimeout(() => setSuccess(''), 3000);
  }, [onRestore]);

  // ---------------------------------------------------------------------------
  // Delete
  // ---------------------------------------------------------------------------
  const handleDelete = useCallback(async (snap) => {
    try {
      // In real app: await apiDeleteSnapshot(snap.id, authToken)
      setSnapshots(prev => prev.filter(s => s.id !== snap.id));
      setConfirmDelete(null);
    } catch (e) {
      setError('Delete failed');
    }
  }, [authToken]);

  // ---------------------------------------------------------------------------
  // Export
  // ---------------------------------------------------------------------------
  const handleExport = useCallback((snap) => {
    const blob = new Blob([JSON.stringify(snap, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${snap.label.replace(/\s+/g,'_')}_${snap.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  const s = {
    root: {
      background: '#0d1117', color: '#e6edf3',
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: 12, display: 'flex', flexDirection: 'column', height: '100%',
    },
    header: {
      padding: '10px 12px 8px',
      borderBottom: '1px solid #21262d',
      background: '#161b22',
    },
    title: { fontSize: 13, fontWeight: 700, color: '#00ffc8', marginBottom: 8, letterSpacing: 1 },
    saveRow: { display: 'flex', gap: 6 },
    input: {
      flex: 1, background: '#21262d', border: '1px solid #30363d',
      borderRadius: 4, color: '#e6edf3', padding: '5px 8px',
      fontFamily: 'inherit', fontSize: 12, outline: 'none',
    },
    btn: (variant='default') => ({
      background: variant==='primary' ? '#00ffc822' : '#21262d',
      border: `1px solid ${variant==='primary' ? '#00ffc8' : '#30363d'}`,
      color: variant==='primary' ? '#00ffc8' : '#8b949e',
      borderRadius: 4, padding: '5px 10px', cursor: 'pointer',
      fontFamily: 'inherit', fontSize: 11, whiteSpace: 'nowrap',
    }),
    list: { flex: 1, overflowY: 'auto' },
    snapRow: (selected) => ({
      padding: '8px 12px',
      borderBottom: '1px solid #161b22',
      background: selected ? '#00ffc811' : 'transparent',
      transition: 'background 0.1s',
    }),
    snapLabel: { fontWeight: 700, color: '#e6edf3', marginBottom: 2 },
    snapMeta: { color: '#8b949e', fontSize: 10, display: 'flex', gap: 8 },
    snapActions: { display: 'flex', gap: 4, marginTop: 4 },
    alert: (type) => ({
      margin: '6px 12px', padding: '5px 8px', borderRadius: 4, fontSize: 11,
      background: type==='error' ? '#ff444422' : '#00ffc822',
      border: `1px solid ${type==='error' ? '#ff4444' : '#00ffc8'}`,
      color: type==='error' ? '#ff4444' : '#00ffc8',
    }),
    diffBox: {
      margin: '6px 12px', padding: 8, background: '#161b22',
      border: '1px solid #30363d', borderRadius: 4, fontSize: 11,
    },
    footer: {
      padding: '6px 12px',
      borderTop: '1px solid #21262d',
      background: '#161b22',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    },
  };

  const diffLines = compareA && compareB
    ? sessionDiff(snapshots.find(s => s.id === compareA)?.data, snapshots.find(s => s.id === compareB)?.data)
    : [];

  return (
    <div style={s.root}>
      {/* Header */}
      <div style={s.header}>
        <div style={s.title}>📸 VERSION CONTROL</div>
        <div style={s.saveRow}>
          <input
            style={s.input}
            placeholder="Label this version (optional)..."
            value={label}
            onChange={e => setLabel(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
          />
          <button
            style={s.btn('primary')}
            onClick={() => handleSave()}
            disabled={saving}
          >
            {saving ? '...' : '💾 Save'}
          </button>
        </div>
        {autoSaveCountdown !== null && (
          <div style={{color:'#8b949e', fontSize:10, marginTop:4}}>
            Auto-save in {autoSaveCountdown}s
          </div>
        )}
      </div>

      {/* Alerts */}
      {error && <div style={s.alert('error')}>⚠ {error}</div>}
      {success && <div style={s.alert('success')}>✓ {success}</div>}

      {/* Diff controls */}
      {snapshots.length >= 2 && (
        <div style={{padding:'6px 12px', background:'#161b22', borderBottom:'1px solid #21262d'}}>
          <div style={{display:'flex', gap:4, alignItems:'center', flexWrap:'wrap'}}>
            <span style={{color:'#8b949e', fontSize:10}}>Compare:</span>
            <select
              style={{...s.input, flex:'none', padding:'2px 4px', fontSize:10}}
              value={compareA || ''}
              onChange={e => setCompareA(e.target.value)}
            >
              <option value="">From...</option>
              {snapshots.map(sn => <option key={sn.id} value={sn.id}>{sn.label}</option>)}
            </select>
            <select
              style={{...s.input, flex:'none', padding:'2px 4px', fontSize:10}}
              value={compareB || ''}
              onChange={e => setCompareB(e.target.value)}
            >
              <option value="">To...</option>
              {snapshots.map(sn => <option key={sn.id} value={sn.id}>{sn.label}</option>)}
            </select>
            <button
              style={s.btn()}
              onClick={() => setShowDiff(v => !v)}
              disabled={!compareA || !compareB}
            >Diff</button>
          </div>
          {showDiff && diffLines.length > 0 && (
            <div style={s.diffBox}>
              <div style={{color:'#00ffc8', marginBottom:4, fontSize:10}}>Changes:</div>
              {diffLines.map((line, i) => (
                <div key={i} style={{color:'#e6edf3'}}>• {line}</div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Snapshot list */}
      <div style={s.list}>
        {loading && <div style={{padding:20, textAlign:'center', color:'#8b949e'}}>Loading...</div>}
        {!loading && snapshots.length === 0 && (
          <div style={{padding:20, textAlign:'center', color:'#8b949e'}}>
            No snapshots yet. Save your first version above.
          </div>
        )}
        {snapshots.map((snap) => (
          <div key={snap.id} style={s.snapRow(compareA===snap.id || compareB===snap.id)}>
            <div style={s.snapLabel}>{snap.label}</div>
            <div style={s.snapMeta}>
              <span>📅 {formatDate(snap.created_at)}</span>
              <span>💾 {snap.size_kb}KB</span>
              <span>{snap.data?.tracks?.length ?? 0} tracks</span>
              <span>{snap.data?.bpm ?? '--'} BPM</span>
            </div>
            {confirmDelete === snap.id ? (
              <div style={{marginTop:4, display:'flex', gap:4}}>
                <span style={{color:'#ff4444', fontSize:10}}>Delete this snapshot?</span>
                <button style={s.btn()} onClick={() => handleDelete(snap)}>Yes</button>
                <button style={s.btn()} onClick={() => setConfirmDelete(null)}>No</button>
              </div>
            ) : (
              <div style={s.snapActions}>
                <button style={s.btn('primary')} onClick={() => handleRestore(snap)}>↩ Restore</button>
                <button style={s.btn()} onClick={() => handleExport(snap)}>⬇ Export</button>
                <button
                  style={{...s.btn(), color:'#ff6666', borderColor:'#ff666633'}}
                  onClick={() => setConfirmDelete(snap.id)}
                >🗑</button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={s.footer}>
        <span style={{color:'#8b949e'}}>{snapshots.length} snapshot{snapshots.length !== 1 ? 's' : ''}</span>
        <button style={s.btn()} onClick={loadSnapshots}>↻ Refresh</button>
      </div>
    </div>
  );
}
