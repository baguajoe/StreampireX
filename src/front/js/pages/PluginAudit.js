// PluginAudit.js — /plugin-audit page. Read-only diagnostics. Does not mount
// the studio, does not touch projects, does not modify state. Click "Run Audit"
// to test every PLUGIN_FACTORIES entry against an OfflineAudioContext and see
// which ones process audio, which params are wired, and per-plugin verdicts.

import React, { useState, useRef } from 'react';
import { runRegistryAudit, buildMarkdownReport } from '../audit/plugin_truth_test';

const VERDICT_COLORS = {
  WORKING: '#3aff88',
  PARTIAL: '#ffaa44',
  STUB:    '#ff8888',
  BROKEN:  '#ff4444',
};

export default function PluginAudit() {
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ i: 0, total: 0 });
  const [results, setResults] = useState([]);
  const [filter, setFilter] = useState('all');
  const abortRef = useRef(null);

  const onRun = async () => {
    setRunning(true);
    setResults([]);
    setProgress({ i: 0, total: 0 });
    abortRef.current = { aborted: false };
    const out = await runRegistryAudit({
      onProgress: ({ i, total, current }) => {
        setProgress({ i, total });
        setResults((r) => [...r, current]);
      },
      signal: abortRef.current,
    });
    setResults(out);
    setRunning(false);
  };

  const onAbort = () => {
    if (abortRef.current) abortRef.current.aborted = true;
  };

  const onDownload = () => {
    const md = buildMarkdownReport(results);
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PLUGIN_TRUTH_RUNTIME_${new Date().toISOString().split('T')[0]}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totals = { WORKING: 0, PARTIAL: 0, STUB: 0, BROKEN: 0 };
  results.forEach((r) => { totals[r.verdict] = (totals[r.verdict] || 0) + 1; });

  const filtered = filter === 'all' ? results : results.filter((r) => r.verdict === filter);

  return (
    <div style={{ padding: 20, fontFamily: 'monospace', color: '#ddd', background: '#0a0a14', minHeight: '100vh' }}>
      <h1 style={{ margin: 0 }}>Plugin Truth Audit (runtime)</h1>
      <p style={{ color: '#888', marginTop: 4 }}>
        Tests every <code>PLUGIN_FACTORIES</code> entry in an <code>OfflineAudioContext</code>.
        Read-only. Does not modify any project state. Static report at{' '}
        <code>audit_progress/PLUGIN_TRUTH_REPORT.md</code> covers the inline-factory side.
      </p>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', margin: '20px 0' }}>
        <button onClick={onRun} disabled={running}
          style={{ background: running ? '#444' : '#3a8', color: '#000', padding: '8px 18px', border: 0, fontWeight: 700, cursor: running ? 'wait' : 'pointer' }}>
          {running ? `Running… ${progress.i}/${progress.total}` : 'Run Audit'}
        </button>
        {running && (
          <button onClick={onAbort} style={{ background: '#a44', color: '#fff', padding: '8px 12px', border: 0, cursor: 'pointer' }}>
            Abort
          </button>
        )}
        {!running && results.length > 0 && (
          <button onClick={onDownload} style={{ background: '#48a', color: '#fff', padding: '8px 12px', border: 0, cursor: 'pointer' }}>
            Download .md
          </button>
        )}
        <span style={{ color: '#888', marginLeft: 10 }}>{results.length} results</span>
      </div>

      {results.length > 0 && (
        <div style={{ display: 'flex', gap: 16, margin: '12px 0' }}>
          {['all', 'WORKING', 'PARTIAL', 'STUB', 'BROKEN'].map((f) => {
            const n = f === 'all' ? results.length : (totals[f] || 0);
            const active = filter === f;
            return (
              <button key={f} onClick={() => setFilter(f)}
                style={{
                  background: active ? '#222' : 'transparent',
                  border: `1px solid ${f === 'all' ? '#888' : VERDICT_COLORS[f]}`,
                  color: f === 'all' ? '#ddd' : VERDICT_COLORS[f],
                  padding: '4px 10px', cursor: 'pointer', fontWeight: 700,
                }}>
                {f} ({n})
              </button>
            );
          })}
        </div>
      )}

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ background: '#1a1a2a', textAlign: 'left' }}>
            <th style={th}>Plugin</th>
            <th style={th}>Cat.</th>
            <th style={th}>Audio</th>
            <th style={th}>In/Out dB</th>
            <th style={th}>Params (delta dB)</th>
            <th style={th}>Worklet</th>
            <th style={th}>Verdict</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((r) => (
            <tr key={r.id} style={{ borderBottom: '1px solid #222' }}>
              <td style={td}><strong>{r.id}</strong> <span style={{ color: '#777' }}>{r.name !== r.id ? r.name : ''}</span></td>
              <td style={td}>{r.category}</td>
              <td style={td}>{r.processesAudio ? '✅' : '❌'}</td>
              <td style={td}>
                {r.inputDb != null ? r.inputDb.toFixed(1) : '—'} → {r.defaultDb != null ? r.defaultDb.toFixed(1) : '—'}
              </td>
              <td style={td}>
                {r.paramResults.filter((p) => p.wired !== null).map((p) => (
                  <span key={p.name} style={{ marginRight: 8, color: p.wired ? '#3aff88' : '#ff8888' }}>
                    {p.name} {p.deltaDb != null ? `(${p.deltaDb})` : ''}
                  </span>
                ))}
                {r.errors.length > 0 && (
                  <div style={{ color: '#ff8888', marginTop: 4 }}>{r.errors.join('; ')}</div>
                )}
              </td>
              <td style={td}>{r.workletPath}</td>
              <td style={{ ...td, color: VERDICT_COLORS[r.verdict], fontWeight: 700 }}>{r.verdict}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const th = { padding: '6px 8px', borderBottom: '1px solid #444', position: 'sticky', top: 0, background: '#1a1a2a' };
const td = { padding: '6px 8px', verticalAlign: 'top' };
