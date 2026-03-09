// =============================================================================
// WAMPluginStore.js — StreamPireX WAM Plugin Marketplace
// =============================================================================
// Full-featured plugin store UI. Users browse, preview, and install
// WAM 2.0 plugins directly into their DAW plugin rack.
//
// INSTALL:
//   Copy to: src/front/js/pages/WAMPluginStore.js
//
// ADD ROUTE in app.js:
//   import WAMPluginStore from './pages/WAMPluginStore';
//   <Route path="/plugin-store" element={<WAMPluginStore />} />
//
// ADD NAV LINK in DAW sidebar or Plugins view tab:
//   <Link to="/plugin-store">🔌 Plugin Store</Link>
// =============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  installWAMPlugin,
  uninstallWAMPlugin,
  getInstalledWAMPlugins,
} from '../component/audio/plugins/WAMPluginHost';

const S = {
  bg:        '#0d1117',
  surface:   '#161b22',
  card:      '#1f2937',
  border:    '#30363d',
  teal:      '#00ffc8',
  orange:    '#FF6600',
  text:      '#e6edf3',
  dim:       '#8b949e',
  green:     '#2ea043',
  red:       '#cf222e',
  purple:    '#7c3aed',
};

const CATEGORIES = ['All', 'Synth', 'Effects', 'Utility'];
const TYPE_ICONS  = { instrument: '🎹', effect: '🎛️', utility: '🔧' };
const TYPE_COLORS = { instrument: S.teal, effect: S.orange, utility: S.purple };

// ── Star Rating ───────────────────────────────────────────────────────────────
const StarRating = ({ rating }) => {
  const full  = Math.floor(rating);
  const half  = rating % 1 >= 0.5;
  return (
    <span style={{ color: '#f0b429', fontSize: '0.75rem' }}>
      {'★'.repeat(full)}{half ? '½' : ''}{'☆'.repeat(5 - full - (half ? 1 : 0))}
      <span style={{ color: S.dim, marginLeft: 4 }}>{rating.toFixed(1)}</span>
    </span>
  );
};

// ── Plugin Card ───────────────────────────────────────────────────────────────
const PluginCard = ({ plugin, isInstalled, onInstall, onUninstall, onPreview }) => {
  const typeColor = TYPE_COLORS[plugin.type] || S.teal;
  return (
    <div style={{
      background:    S.card,
      border:        `1px solid ${isInstalled ? S.teal + '60' : S.border}`,
      borderRadius:  10,
      padding:       16,
      display:       'flex',
      flexDirection: 'column',
      gap:           10,
      transition:    'border-color 0.2s, box-shadow 0.2s',
      boxShadow:     isInstalled ? `0 0 12px ${S.teal}20` : 'none',
      position:      'relative',
    }}>

      {/* Featured badge */}
      {plugin.featured && (
        <div style={{
          position: 'absolute', top: 10, right: 10,
          background: S.orange, color: '#fff',
          fontSize: '0.6rem', fontWeight: 700,
          padding: '2px 7px', borderRadius: 20,
        }}>FEATURED</div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 8,
          background: `${typeColor}20`,
          border: `1px solid ${typeColor}40`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.3rem', flexShrink: 0,
        }}>
          {TYPE_ICONS[plugin.type] || '🔌'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, color: S.text, fontSize: '0.95rem', marginBottom: 2 }}>
            {plugin.name}
          </div>
          <div style={{ color: S.dim, fontSize: '0.75rem' }}>by {plugin.developer}</div>
        </div>
      </div>

      {/* Type + subcategory */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <span style={{
          background: `${typeColor}20`, color: typeColor,
          fontSize: '0.65rem', fontWeight: 600,
          padding: '2px 8px', borderRadius: 20,
          border: `1px solid ${typeColor}40`,
        }}>
          {plugin.subcategory}
        </span>
        {plugin.verified && (
          <span style={{
            background: `${S.green}20`, color: S.green,
            fontSize: '0.65rem', fontWeight: 600,
            padding: '2px 8px', borderRadius: 20,
          }}>✓ Verified</span>
        )}
      </div>

      {/* Description */}
      <p style={{
        color: S.dim, fontSize: '0.78rem',
        lineHeight: 1.5, margin: 0,
        display: '-webkit-box', WebkitLineClamp: 3,
        WebkitBoxOrient: 'vertical', overflow: 'hidden',
      }}>
        {plugin.description}
      </p>

      {/* Rating + installs */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <StarRating rating={plugin.rating} />
        <span style={{ color: S.dim, fontSize: '0.7rem' }}>
          {plugin.installs.toLocaleString()} installs
        </span>
      </div>

      {/* Tags */}
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {plugin.tags.slice(0, 4).map(tag => (
          <span key={tag} style={{
            background: S.surface, color: S.dim,
            fontSize: '0.6rem', padding: '1px 6px',
            borderRadius: 10, border: `1px solid ${S.border}`,
          }}>{tag}</span>
        ))}
      </div>

      {/* Price + actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 'auto' }}>
        <span style={{
          fontWeight: 700, fontSize: '0.85rem',
          color: plugin.price === 0 ? S.green : S.orange,
        }}>
          {plugin.price === 0 ? 'FREE' : `$${plugin.price}`}
        </span>

        <div style={{ flex: 1 }} />

        {isInstalled ? (
          <button
            onClick={() => onUninstall(plugin)}
            style={{
              background: 'transparent', border: `1px solid ${S.red}`,
              color: S.red, borderRadius: 6,
              padding: '5px 12px', fontSize: '0.75rem', cursor: 'pointer',
            }}>
            Remove
          </button>
        ) : (
          <button
            onClick={() => onInstall(plugin)}
            style={{
              background: S.teal, border: 'none',
              color: '#000', fontWeight: 700,
              borderRadius: 6, padding: '5px 14px',
              fontSize: '0.75rem', cursor: 'pointer',
            }}>
            Install
          </button>
        )}
      </div>
    </div>
  );
};

// ── Custom Plugin Modal ───────────────────────────────────────────────────────
const CustomPluginModal = ({ onClose, onInstall }) => {
  const [url, setUrl]       = useState('');
  const [name, setName]     = useState('');
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!url.startsWith('https://') || !url.endsWith('.js')) {
      setError('Must be a valid HTTPS URL ending in .js');
      return;
    }
    if (!name.trim()) {
      setError('Enter a name for this plugin');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/wam/plugins/custom/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionStorage.getItem('token')}` },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!data.valid) { setError(data.error || 'Invalid plugin URL'); return; }
      onInstall({
        id:          `custom_${Date.now()}`,
        name:        name.trim(),
        developer:   'Custom',
        category:    'Custom',
        subcategory: 'Custom',
        description: `Custom WAM plugin loaded from ${url}`,
        url,
        tags:        ['custom'],
        price:       0,
        rating:      0,
        installs:    0,
        hasGUI:      true,
        type:        'effect',
        verified:    false,
        featured:    false,
        isCustom:    true,
      });
      onClose();
    } catch (e) {
      setError('Failed to validate URL');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#000000cc',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
    }}>
      <div style={{
        background: S.surface, border: `1px solid ${S.border}`,
        borderRadius: 12, padding: 28, width: 460, maxWidth: '90vw',
      }}>
        <h3 style={{ color: S.teal, margin: '0 0 6px', fontSize: '1.1rem' }}>Load Custom WAM Plugin</h3>
        <p style={{ color: S.dim, fontSize: '0.8rem', margin: '0 0 20px', lineHeight: 1.5 }}>
          Load any WAM 2.0 compatible plugin by URL. The plugin must be hosted on HTTPS
          and export a valid WAM 2.0 module. Only load plugins from sources you trust.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Plugin name (e.g. MyReverb)"
            style={{
              background: S.card, border: `1px solid ${S.border}`,
              color: S.text, borderRadius: 6, padding: '8px 12px',
              fontSize: '0.85rem', outline: 'none',
            }}
          />
          <input
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="https://example.com/my-plugin/index.js"
            style={{
              background: S.card, border: `1px solid ${S.border}`,
              color: S.text, borderRadius: 6, padding: '8px 12px',
              fontSize: '0.85rem', outline: 'none',
            }}
          />
          {error && <p style={{ color: S.red, fontSize: '0.78rem', margin: 0 }}>{error}</p>}
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{
            background: 'transparent', border: `1px solid ${S.border}`,
            color: S.dim, borderRadius: 6, padding: '7px 16px',
            fontSize: '0.8rem', cursor: 'pointer',
          }}>Cancel</button>
          <button onClick={handleSubmit} disabled={loading} style={{
            background: S.teal, border: 'none',
            color: '#000', fontWeight: 700,
            borderRadius: 6, padding: '7px 20px',
            fontSize: '0.8rem', cursor: 'pointer',
            opacity: loading ? 0.6 : 1,
          }}>
            {loading ? 'Validating...' : 'Install Plugin'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Main Store Component ──────────────────────────────────────────────────────
const WAMPluginStore = () => {
  const [plugins, setPlugins]         = useState([]);
  const [installed, setInstalled]     = useState([]);
  const [category, setCategory]       = useState('All');
  const [search, setSearch]           = useState('');
  const [activeTab, setActiveTab]     = useState('store'); // 'store' | 'installed'
  const [showCustom, setShowCustom]   = useState(false);
  const [toast, setToast]             = useState('');
  const [loading, setLoading]         = useState(true);

  // Load curated plugins from backend
  useEffect(() => {
    const fetchPlugins = async () => {
      try {
        const res = await fetch('/api/wam/plugins');
        const data = await res.json();
        setPlugins(data.plugins || []);
      } catch {
        setPlugins([]);
      } finally {
        setLoading(false);
      }
    };
    fetchPlugins();
  }, []);

  // Load installed plugins from localStorage
  useEffect(() => {
    setInstalled(getInstalledWAMPlugins());
  }, []);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleInstall = useCallback(async (plugin) => {
    installWAMPlugin(plugin);
    setInstalled(getInstalledWAMPlugins());
    // Track install on backend
    try {
      await fetch(`/api/wam/plugins/${plugin.id}/install`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${sessionStorage.getItem('token')}` },
      });
    } catch {}
    showToast(`✓ ${plugin.name} installed — open your DAW Plugin Rack to use it`);
  }, []);

  const handleUninstall = useCallback((plugin) => {
    uninstallWAMPlugin(plugin.url);
    setInstalled(getInstalledWAMPlugins());
    showToast(`${plugin.name} removed`);
  }, []);

  const isInstalled = (plugin) => installed.some(p => p.url === plugin.url);

  // Filter logic
  const filtered = plugins.filter(p => {
    const matchCat    = category === 'All' || p.category === category;
    const matchSearch = !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase()) ||
      p.tags.some(t => t.toLowerCase().includes(search.toLowerCase()));
    return matchCat && matchSearch;
  });

  return (
    <div style={{ minHeight: '100vh', background: S.bg, color: S.text, fontFamily: 'JetBrains Mono, monospace' }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: S.teal, color: '#000', fontWeight: 700,
          padding: '10px 24px', borderRadius: 8, zIndex: 9999,
          fontSize: '0.85rem', boxShadow: `0 4px 20px ${S.teal}60`,
        }}>{toast}</div>
      )}

      {/* Custom Plugin Modal */}
      {showCustom && (
        <CustomPluginModal
          onClose={() => setShowCustom(false)}
          onInstall={(p) => { handleInstall(p); setShowCustom(false); }}
        />
      )}

      {/* Header */}
      <div style={{
        borderBottom: `1px solid ${S.border}`,
        padding: '20px 32px',
        background: S.surface,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Link to="/daw" style={{ color: S.dim, textDecoration: 'none', fontSize: '0.8rem' }}>
              ← DAW
            </Link>
            <span style={{ color: S.border }}>|</span>
            <h1 style={{ margin: 0, fontSize: '1.2rem', color: S.teal }}>🔌 Plugin Store</h1>
          </div>
          <p style={{ margin: '4px 0 0', color: S.dim, fontSize: '0.78rem' }}>
            Web Audio Modules 2.0 — Professional VST-style plugins, browser-native
          </p>
        </div>
        <button
          onClick={() => setShowCustom(true)}
          style={{
            background: 'transparent', border: `1px solid ${S.teal}`,
            color: S.teal, borderRadius: 7, padding: '7px 16px',
            fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'inherit',
          }}>
          + Load Custom URL
        </button>
      </div>

      <div style={{ padding: '24px 32px', maxWidth: 1200, margin: '0 auto' }}>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: `1px solid ${S.border}` }}>
          {[
            { id: 'store',     label: `Browse (${plugins.length})` },
            { id: 'installed', label: `Installed (${installed.length})` },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
              background:   'none',
              border:       'none',
              borderBottom: `2px solid ${activeTab === tab.id ? S.teal : 'transparent'}`,
              color:        activeTab === tab.id ? S.teal : S.dim,
              padding:      '8px 16px',
              cursor:       'pointer',
              fontSize:     '0.85rem',
              fontWeight:   activeTab === tab.id ? 700 : 400,
              fontFamily:   'inherit',
              marginBottom: -1,
            }}>{tab.label}</button>
          ))}
        </div>

        {/* STORE TAB */}
        {activeTab === 'store' && (
          <>
            {/* Search + filters */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search plugins..."
                style={{
                  background: S.surface, border: `1px solid ${S.border}`,
                  color: S.text, borderRadius: 7, padding: '8px 14px',
                  fontSize: '0.85rem', width: 260, outline: 'none', fontFamily: 'inherit',
                }}
              />
              {CATEGORIES.map(cat => (
                <button key={cat} onClick={() => setCategory(cat)} style={{
                  background:  category === cat ? `${S.teal}20` : S.surface,
                  border:      `1px solid ${category === cat ? S.teal : S.border}`,
                  color:       category === cat ? S.teal : S.dim,
                  borderRadius: 7, padding: '7px 16px',
                  fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'inherit',
                }}>{cat}</button>
              ))}
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', color: S.dim, padding: 60 }}>Loading plugins...</div>
            ) : filtered.length === 0 ? (
              <div style={{ textAlign: 'center', color: S.dim, padding: 60 }}>
                No plugins found. Try a different search or{' '}
                <button onClick={() => setShowCustom(true)} style={{
                  background: 'none', border: 'none', color: S.teal,
                  cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit',
                }}>load a custom URL</button>.
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: 16,
              }}>
                {filtered.map(plugin => (
                  <PluginCard
                    key={plugin.id}
                    plugin={plugin}
                    isInstalled={isInstalled(plugin)}
                    onInstall={handleInstall}
                    onUninstall={handleUninstall}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* INSTALLED TAB */}
        {activeTab === 'installed' && (
          <>
            {installed.length === 0 ? (
              <div style={{ textAlign: 'center', color: S.dim, padding: 60 }}>
                <div style={{ fontSize: '2rem', marginBottom: 12 }}>🔌</div>
                <p>No plugins installed yet.</p>
                <button onClick={() => setActiveTab('store')} style={{
                  background: S.teal, border: 'none', color: '#000',
                  fontWeight: 700, borderRadius: 7, padding: '8px 20px',
                  fontSize: '0.85rem', cursor: 'pointer',
                }}>Browse Plugin Store</button>
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: 16,
              }}>
                {installed.map(plugin => (
                  <PluginCard
                    key={plugin.url}
                    plugin={plugin}
                    isInstalled={true}
                    onInstall={handleInstall}
                    onUninstall={handleUninstall}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* WAM Info Banner */}
        <div style={{
          marginTop: 40, padding: 20,
          background: `${S.teal}08`, border: `1px solid ${S.teal}30`,
          borderRadius: 10,
        }}>
          <h4 style={{ color: S.teal, margin: '0 0 8px', fontSize: '0.9rem' }}>
            What are WAM Plugins?
          </h4>
          <p style={{ color: S.dim, fontSize: '0.78rem', margin: 0, lineHeight: 1.6 }}>
            Web Audio Modules (WAM 2.0) are professional-grade synthesizers and effects compiled to
            WebAssembly. They run at near-native performance directly in your browser —
            no downloads, no installs, no DAW software required. The same plugin engine used by
            Surge XT, OB-Xd, and other professional tools. Once installed, plugins appear in your
            DAW Plugin Rack on every track.{' '}
            <a href="https://www.webaudiomodules.org" target="_blank" rel="noreferrer"
               style={{ color: S.teal }}>Learn more →</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default WAMPluginStore;
