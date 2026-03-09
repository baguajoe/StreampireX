// =============================================================================
// AICreditsPanel.js — AI Credits Dashboard Panel
// =============================================================================
// Embed in Creator Dashboard or use as standalone page at /ai-credits
// Shows: Balance, feature costs, usage history, buy credit packs
// Backend: /api/ai/credits, /api/ai/credits/usage, /api/ai/credits/purchase
// =============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import './AICreditsPanel.css';

const BACKEND = process.env.REACT_APP_BACKEND_URL || 'https://streampirex-api.up.railway.app';
const getToken = () => sessionStorage.getItem('token') || localStorage.getItem('token');
const authHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${getToken()}`,
});

const FEATURE_INFO = {
  ai_video_generation:   { name: 'AI Video Generation',    icon: '🎬', cat: 'Video' },
  voice_clone_create:    { name: 'Voice Clone (Create)',    icon: '🎤', cat: 'Voice' },
  voice_clone_tts:       { name: 'Voice Clone TTS',        icon: '🗣️', cat: 'Voice' },
  ai_radio_dj_tts:       { name: 'Radio DJ Voice',         icon: '📻', cat: 'Voice' },
  ai_podcast_intro:      { name: 'Podcast Intro/Outro',    icon: '🎙️', cat: 'Voice' },
  ai_video_narration:    { name: 'Video Narration',        icon: '🎥', cat: 'Voice' },
  ai_content_generation: { name: 'Content Writer',         icon: '✍️', cat: 'Content' },
  ai_auto_captions:      { name: 'Auto Captions',          icon: '💬', cat: 'Video' },
  ai_lyrics_generation:  { name: 'Lyrics Writer',          icon: '📝', cat: 'Content' },
  ai_image_generation:   { name: 'Image Generation',       icon: '🖼️', cat: 'Visual' },
  
  text_to_song:              { name: 'AI Text to Song',          icon: '✨', cat: 'Music AI' },
  text_to_song_with_vocals:  { name: 'AI Song + Vocals',         icon: '✨', cat: 'Music AI' },
  add_vocals_to_track:       { name: 'Add Vocals to Beat',       icon: '🎤', cat: 'Music AI' },
  add_beat_to_vocals:        { name: 'Add Beat to Vocals',       icon: '🎸', cat: 'Music AI' },
  hum_to_song:               { name: 'Hum to Song',              icon: '🎙', cat: 'Music AI' },
  song_extender:             { name: 'AI Song Extender',         icon: '🔮', cat: 'Music AI' },
  ai_stack_generator:        { name: 'AI Stack Generator',       icon: '🎛', cat: 'Music AI' },
  reference_mastering_ai:    { name: 'Reference Mastering AI',   icon: '📊', cat: 'Mastering' },

  ai_thumbnail_enhance:  { name: 'Thumbnail Enhance',      icon: '✨', cat: 'Visual' },
  stem_separation:       { name: 'Stem Separation',        icon: '🎛️', cat: 'Audio' },
  ai_mix_assistant:      { name: 'Mix Assistant',          icon: '🎚️', cat: 'Audio' },
};

const TIER_LABELS = {
  free: 'Free', starter: 'Starter', creator: 'Creator', pro: 'Pro',
};

const AICreditsPanel = () => {
  const [loading, setLoading] = useState(true);
  const [credits, setCredits] = useState(null);
  const [tier, setTier] = useState('free');
  const [features, setFeatures] = useState({});
  const [packs, setPacks] = useState([]);
  const [usage, setUsage] = useState([]);
  const [usageSummary, setUsageSummary] = useState({});
  const [activeTab, setActiveTab] = useState('overview');
  const [purchasing, setPurchasing] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');

  // Load credit balance + features + packs
  const loadCredits = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND}/api/ai/credits`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setCredits(data.credits || {});
        setTier(data.tier || 'free');
        setFeatures(data.features || {});
        setPacks(data.packs || []);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to load credits');
      }
    } catch (e) {
      setError('Could not connect to server');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load usage history
  const loadUsage = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND}/api/ai/credits/usage?days=30&per_page=50`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setUsage(data.usage || []);
        setUsageSummary(data.summary || {});
      }
    } catch (e) { /* silent */ }
  }, []);

  useEffect(() => { loadCredits(); loadUsage(); }, [loadCredits, loadUsage]);
  useEffect(() => { if (status) { const t = setTimeout(() => setStatus(''), 4000); return () => clearTimeout(t); } }, [status]);
  useEffect(() => { if (error) { const t = setTimeout(() => setError(''), 5000); return () => clearTimeout(t); } }, [error]);

  // Purchase credit pack
  const purchasePack = async (packId) => {
    setPurchasing(true);
    setError('');
    try {
      const res = await fetch(`${BACKEND}/api/ai/credits/purchase`, {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({ pack_id: packId }),
      });
      const data = await res.json();
      if (res.ok && data.checkout_url) {
        window.location.href = data.checkout_url;
      } else {
        setError(data.error || 'Purchase failed');
      }
    } catch (e) {
      setError('Payment error: ' + e.message);
    } finally {
      setPurchasing(false);
    }
  };

  if (loading) {
    return (
      <div className="acp-loading">
        <div className="acp-spinner" />
        <span>Loading AI Credits...</span>
      </div>
    );
  }

  const balance = credits?.balance || 0;
  const monthlyFree = credits?.monthly_free_credits || 0;
  const monthlyUsed = credits?.monthly_credits_used || 0;
  const totalPurchased = credits?.total_purchased || 0;
  const totalUsed = credits?.total_used || 0;

  // Separate paid vs free features
  const paidFeatures = Object.entries(features).filter(([_, f]) => !f.free);
  const freeFeatures = Object.entries(features).filter(([_, f]) => f.free);

  return (
    <div className="ai-credits-panel">
      {/* Status / Error */}
      {(status || error) && (
        <div className={`acp-toast ${error ? 'error' : 'success'}`}>
          {error || status}
        </div>
      )}

      {/* Header */}
      <div className="acp-header">
        <div className="acp-header-left">
          <h2 className="acp-title">⚡ AI Credits</h2>
          <span className={`acp-tier-badge ${tier}`}>{TIER_LABELS[tier] || tier} Plan</span>
        </div>
      </div>

      {/* Balance Card */}
      <div className="acp-balance-card">
        <div className="acp-balance-main">
          <span className="acp-balance-label">Available Credits</span>
          <span className="acp-balance-number">{balance.toLocaleString()}</span>
        </div>
        <div className="acp-balance-stats">
          <div className="acp-stat">
            <span className="acp-stat-value">{monthlyFree}</span>
            <span className="acp-stat-label">Monthly Free</span>
          </div>
          <div className="acp-stat">
            <span className="acp-stat-value">{monthlyUsed}</span>
            <span className="acp-stat-label">Used This Month</span>
          </div>
          <div className="acp-stat">
            <span className="acp-stat-value">{totalPurchased}</span>
            <span className="acp-stat-label">Total Purchased</span>
          </div>
          <div className="acp-stat">
            <span className="acp-stat-value">{totalUsed}</span>
            <span className="acp-stat-label">Total Used</span>
          </div>
        </div>
        {balance < 10 && (
          <div className="acp-low-balance">
            ⚠️ Low balance — buy a credit pack below to keep using AI features
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="acp-tabs">
        <button className={activeTab === 'overview' ? 'active' : ''} onClick={() => setActiveTab('overview')}>
          💰 Buy Credits
        </button>
        <button className={activeTab === 'features' ? 'active' : ''} onClick={() => setActiveTab('features')}>
          🧠 Feature Costs
        </button>
        <button className={activeTab === 'history' ? 'active' : ''} onClick={() => setActiveTab('history')}>
          📊 Usage History
        </button>
      </div>

      {/* ═══════════ BUY CREDITS ═══════════ */}
      {activeTab === 'overview' && (
        <div className="acp-section">
          <h3 className="acp-section-title">Credit Packs</h3>
          <p className="acp-section-desc">
            Credits power all AI features — video generation, voice cloning, content writing, and more. 
            Buy once, use across any AI tool.
          </p>

          {tier === 'free' && (
            <div className="acp-upgrade-banner">
              <span>🔒 Upgrade to a paid plan to purchase credit packs</span>
              <a href="/pricing" className="acp-upgrade-btn">View Plans</a>
            </div>
          )}

          <div className="acp-packs-grid">
            {packs.map(pack => (
              <div key={pack.id} className={`acp-pack-card ${pack.popular ? 'popular' : ''}`}>
                {pack.popular && <span className="acp-popular-tag">Most Popular</span>}
                <span className="acp-pack-icon">{pack.icon}</span>
                <h4 className="acp-pack-name">{pack.name}</h4>
                <div className="acp-pack-credits">{pack.credits} credits</div>
                <div className="acp-pack-price">${pack.price.toFixed(2)}</div>
                <div className="acp-pack-per">${pack.per_credit.toFixed(2)} / credit</div>
                {pack.savings && <span className="acp-pack-savings">{pack.savings}</span>}
                <button
                  className="acp-buy-btn"
                  onClick={() => purchasePack(pack.id)}
                  disabled={purchasing || tier === 'free'}
                >
                  {purchasing ? '⏳...' : 'Buy Now'}
                </button>
              </div>
            ))}
          </div>

          {/* What credits cover */}
          <div className="acp-credit-examples">
            <h4>What can you do with credits?</h4>
            <div className="acp-examples-grid">
              <div className="acp-example">
                <span className="acp-example-icon">🎬</span>
                <span className="acp-example-text">AI Video (10 credits)</span>
              </div>
              <div className="acp-example">
                <span className="acp-example-icon">🎤</span>
                <span className="acp-example-text">Voice Clone (5 credits)</span>
              </div>
              <div className="acp-example">
                <span className="acp-example-icon">🗣️</span>
                <span className="acp-example-text">Text-to-Speech (2 credits)</span>
              </div>
              <div className="acp-example">
                <span className="acp-example-icon">✍️</span>
                <span className="acp-example-text">Content Writer (1 credit)</span>
              </div>
              <div className="acp-example">
                <span className="acp-example-icon">🖼️</span>
                <span className="acp-example-text">Image Gen (3 credits)</span>
              </div>
              <div className="acp-example">
                <span className="acp-example-icon">🎛️</span>
                <span className="acp-example-text">Stem Separation (FREE)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════ FEATURE COSTS ═══════════ */}
      {activeTab === 'features' && (
        <div className="acp-section">
          <h3 className="acp-section-title">AI Feature Costs</h3>

          {/* Paid features */}
          <h4 className="acp-sub-title">Paid Features (use credits)</h4>
          <div className="acp-features-list">
            {paidFeatures.map(([key, feat]) => {
              const info = FEATURE_INFO[key] || { name: key, icon: '🤖', cat: 'Other' };
              return (
                <div key={key} className={`acp-feature-row ${feat.has_access ? '' : 'locked'}`}>
                  <span className="acp-feat-icon">{info.icon}</span>
                  <div className="acp-feat-info">
                    <span className="acp-feat-name">{info.name}</span>
                    <span className="acp-feat-cat">{info.cat}</span>
                  </div>
                  <div className="acp-feat-cost">
                    <span className="acp-feat-credits">{feat.cost} credits</span>
                    {feat.daily_limit && (
                      <span className="acp-feat-limit">{feat.daily_limit}/day</span>
                    )}
                  </div>
                  {!feat.has_access && (
                    <span className="acp-feat-locked">🔒 {feat.min_tier}</span>
                  )}
                  {feat.has_access && (
                    <span className="acp-feat-unlocked">✅</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Free features */}
          <h4 className="acp-sub-title" style={{ marginTop: 24 }}>Free Features (no credits needed)</h4>
          <div className="acp-features-list free">
            {freeFeatures.map(([key, feat]) => {
              const info = FEATURE_INFO[key] || { name: key, icon: '🆓', cat: 'Other' };
              return (
                <div key={key} className="acp-feature-row free">
                  <span className="acp-feat-icon">{info.icon}</span>
                  <div className="acp-feat-info">
                    <span className="acp-feat-name">{info.name}</span>
                    <span className="acp-feat-cat">{info.cat}</span>
                  </div>
                  <span className="acp-feat-free">FREE</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══════════ USAGE HISTORY ═══════════ */}
      {activeTab === 'history' && (
        <div className="acp-section">
          <h3 className="acp-section-title">Usage History (Last 30 Days)</h3>

          {/* Summary cards */}
          {Object.keys(usageSummary).length > 0 && (
            <div className="acp-summary-grid">
              {Object.entries(usageSummary).map(([feat, data]) => {
                const info = FEATURE_INFO[feat] || { name: feat, icon: '🤖' };
                return (
                  <div key={feat} className="acp-summary-card">
                    <span className="acp-summary-icon">{info.icon}</span>
                    <span className="acp-summary-name">{info.name}</span>
                    <span className="acp-summary-count">{data.count} uses</span>
                    <span className="acp-summary-credits">{data.total_credits} credits</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Usage list */}
          {usage.length === 0 ? (
            <div className="acp-empty">No AI usage recorded yet. Start creating!</div>
          ) : (
            <div className="acp-usage-list">
              {usage.map((u, i) => {
                const info = FEATURE_INFO[u.feature] || { name: u.feature, icon: '🤖' };
                return (
                  <div key={u.id || i} className="acp-usage-row">
                    <span className="acp-usage-icon">{info.icon}</span>
                    <div className="acp-usage-info">
                      <span className="acp-usage-name">{info.name}</span>
                      <span className="acp-usage-date">
                        {new Date(u.created_at).toLocaleDateString()} at {new Date(u.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <span className="acp-usage-credits">-{u.credits_used}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AICreditsPanel;