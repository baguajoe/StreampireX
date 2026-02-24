// =============================================================================
// PluginBrowserModal.jsx — Plugin Browser / Add Plugin Modal
// =============================================================================
import React, { useState, useMemo } from 'react';
import { getAllPlugins, getCategories } from '../../audio/plugins/registry';

const CAT_LABELS = { utility: '🔧 Utility', eq: '📊 EQ', dynamics: '🎚️ Dynamics', spatial: '🌊 Spatial', distortion: '🔥 Distortion' };
const CAT_COLORS = { utility: '#5ac8fa', eq: '#34c759', dynamics: '#ff9500', spatial: '#af52de', distortion: '#ff3b30' };

const PluginBrowserModal = ({ isOpen, onClose, onAddPlugin }) => {
  const [search, setSearch] = useState('');
  const [selCat, setSelCat] = useState('all');
  const categories = useMemo(() => getCategories(), []);
  const allPlugins = useMemo(() => getAllPlugins(), []);

  const filtered = useMemo(() => {
    let list = selCat === 'all' ? allPlugins : allPlugins.filter(p => p.category === selCat);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(q) || p.category.includes(q));
    }
    return list;
  }, [allPlugins, selCat, search]);

  if (!isOpen) return null;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.title}>Add Plugin</h2>
          <input style={styles.search} placeholder="Search plugins..." value={search} onChange={e => setSearch(e.target.value)} autoFocus />
          <button style={styles.close} onClick={onClose}>✕</button>
        </div>
        <div style={styles.cats}>
          <button style={{ ...styles.catBtn, ...(selCat === 'all' ? styles.catActive : {}) }} onClick={() => setSelCat('all')}>All ({allPlugins.length})</button>
          {categories.map(c => (
            <button key={c} style={{ ...styles.catBtn, ...(selCat === c ? { ...styles.catActive, borderColor: CAT_COLORS[c] } : {}) }} onClick={() => setSelCat(c)}>
              {CAT_LABELS[c] || c} ({allPlugins.filter(p => p.category === c).length})
            </button>
          ))}
        </div>
        <div style={styles.grid}>
          {filtered.map(p => (
            <div key={p.id} style={styles.card} onClick={() => { onAddPlugin(p.id); onClose(); }}
              onMouseEnter={e => e.currentTarget.style.borderColor = CAT_COLORS[p.category] || '#00ffc8'}
              onMouseLeave={e => e.currentTarget.style.borderColor = '#2a3a4a'}>
              <div style={styles.cardTop}>
                <span style={{ ...styles.catBadge, background: (CAT_COLORS[p.category] || '#888') + '25', color: CAT_COLORS[p.category] }}>{p.category}</span>
                <span style={styles.version}>v{p.version}</span>
              </div>
              <h3 style={styles.cardName}>{p.name}</h3>
              <div style={styles.paramTags}>
                {p.params.slice(0, 4).map(pr => <span key={pr.id} style={styles.paramTag}>{pr.label}</span>)}
                {p.params.length > 4 && <span style={styles.paramTag}>+{p.params.length - 4}</span>}
              </div>
              <div style={styles.presetCount}>{(p.factoryPresets || []).length} presets</div>
            </div>
          ))}
          {filtered.length === 0 && <div style={styles.empty}>No plugins match your search</div>}
        </div>
      </div>
    </div>
  );
};

const styles = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 },
  modal: { background: '#1a2332', borderRadius: 12, width: '90%', maxWidth: 720, maxHeight: '80vh', overflow: 'auto', border: '1px solid #2a3a4a' },
  header: { display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', borderBottom: '1px solid #2a3a4a' },
  title: { margin: 0, fontSize: 18, color: '#e0e8f0', flex: '0 0 auto' },
  search: { flex: 1, background: '#0d1520', border: '1px solid #2a3a4a', borderRadius: 6, padding: '8px 12px', color: '#e0e8f0', fontSize: 14, outline: 'none' },
  close: { background: 'none', border: 'none', color: '#5a7088', fontSize: 18, cursor: 'pointer' },
  cats: { display: 'flex', gap: 6, padding: '12px 20px', flexWrap: 'wrap' },
  catBtn: { background: '#0d1520', border: '1px solid #2a3a4a', borderRadius: 16, padding: '4px 12px', color: '#8899aa', fontSize: 12, cursor: 'pointer' },
  catActive: { borderColor: '#00ffc8', color: '#00ffc8' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, padding: '12px 20px 20px' },
  card: { background: '#0d1520', border: '1px solid #2a3a4a', borderRadius: 8, padding: 14, cursor: 'pointer', transition: 'border-color 0.15s' },
  cardTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  catBadge: { fontSize: 10, padding: '2px 8px', borderRadius: 10, fontWeight: 600 },
  version: { fontSize: 10, color: '#5a7088' },
  cardName: { margin: '0 0 8px', fontSize: 15, color: '#e0e8f0' },
  paramTags: { display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 },
  paramTag: { fontSize: 10, background: '#1a2332', padding: '2px 6px', borderRadius: 4, color: '#8899aa' },
  presetCount: { fontSize: 11, color: '#5a7088' },
  empty: { gridColumn: '1 / -1', textAlign: 'center', padding: 40, color: '#5a7088' },
};

export default PluginBrowserModal;