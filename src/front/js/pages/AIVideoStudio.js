// =============================================================================
// AI VIDEO STUDIO - React Page Component
// =============================================================================
// Save as: src/front/js/pages/AIVideoStudio.js
// Route: <Route path="/ai-video-studio" element={<AIVideoStudio />} />
// =============================================================================

import React, { useState, useEffect, useCallback, useRef } from 'react';
import '../../styles/AIVideoStudio.css';

const AIVideoStudio = () => {
  const [activeTab, setActiveTab] = useState('text');
  const [studioStatus, setStudioStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [quality, setQuality] = useState('standard');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [imagePrompt, setImagePrompt] = useState('');
  const [myVideos, setMyVideos] = useState([]);
  const [galleryPage, setGalleryPage] = useState(1);
  const [galleryTotal, setGalleryTotal] = useState(0);
  const [creditPacks, setCreditPacks] = useState([]);
  const [purchaseHistory, setPurchaseHistory] = useState([]);
  const [purchasing, setPurchasing] = useState(false);
  const [generatedVideo, setGeneratedVideo] = useState(null);

  const fileInputRef = useRef(null);
  const backendUrl = process.env.REACT_APP_BACKEND_URL || '';

  const getHeaders = useCallback(() => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
  }, []);

  // ── LOADERS ──

  const loadStudioStatus = useCallback(async () => {
    try {
      const res = await fetch(`${backendUrl}/api/ai-video/studio-status`, { headers: getHeaders() });
      const data = await res.json();
      if (data.success) setStudioStatus(data);
    } catch (e) { console.error('Studio status error:', e); }
    finally { setLoading(false); }
  }, [backendUrl, getHeaders]);

  const loadGallery = useCallback(async (page = 1) => {
    try {
      const res = await fetch(`${backendUrl}/api/ai-video/my-videos?page=${page}&per_page=12`, { headers: getHeaders() });
      const data = await res.json();
      if (data.success) { setMyVideos(data.videos); setGalleryTotal(data.total); setGalleryPage(page); }
    } catch (e) { console.error('Gallery error:', e); }
  }, [backendUrl, getHeaders]);

  const loadCreditPacks = useCallback(async () => {
    try {
      const res = await fetch(`${backendUrl}/api/ai-video/credit-packs`, { headers: getHeaders() });
      const data = await res.json();
      if (data.success) setCreditPacks(data.packs);
    } catch (e) { console.error('Credit packs error:', e); }
  }, [backendUrl, getHeaders]);

  const loadHistory = useCallback(async () => {
    try {
      const res = await fetch(`${backendUrl}/api/ai-video/credit-history`, { headers: getHeaders() });
      const data = await res.json();
      if (data.success) setPurchaseHistory(data.purchases);
    } catch (e) { console.error('History error:', e); }
  }, [backendUrl, getHeaders]);

  const verifyPurchase = async (sessionId) => {
    try {
      const res = await fetch(`${backendUrl}/api/ai-video/verify-purchase`, {
        method: 'POST', headers: getHeaders(),
        body: JSON.stringify({ session_id: sessionId }),
      });
      const data = await res.json();
      if (data.success) { setSuccess(data.message); loadStudioStatus(); }
    } catch (e) { console.error('Verify error:', e); }
  };

  // ── INIT ──

  useEffect(() => {
    loadStudioStatus();
    loadCreditPacks();
    const params = new URLSearchParams(window.location.search);
    if (params.get('purchase') === 'success') {
      const sid = params.get('session_id');
      if (sid) verifyPurchase(sid);
      window.history.replaceState({}, '', '/ai-video-studio');
    }
  }, []); // eslint-disable-line

  useEffect(() => {
    if (activeTab === 'gallery') loadGallery();
    if (activeTab === 'credits') { loadCreditPacks(); loadHistory(); }
  }, [activeTab]); // eslint-disable-line

  // ── TEXT TO VIDEO ──

  const handleTextToVideo = async () => {
    if (!prompt.trim()) { setError('Please enter a prompt'); return; }
    if (!studioStatus?.can_generate) { setError('Check your credits or daily limit'); return; }
    setGenerating(true); setError(''); setSuccess(''); setGeneratedVideo(null);
    try {
      const res = await fetch(`${backendUrl}/api/ai-video/generate/text`, {
        method: 'POST', headers: getHeaders(),
        body: JSON.stringify({ prompt, aspect_ratio: aspectRatio, quality }),
      });
      const data = await res.json();
      if (data.success) { setGeneratedVideo(data); setSuccess(data.message); loadStudioStatus(); }
      else { setError(data.error || 'Generation failed'); }
    } catch (e) { setError('Network error — please try again'); }
    finally { setGenerating(false); }
  };

  // ── IMAGE TO VIDEO ──

  const handleImageToVideo = async () => {
    if (!imageFile) { setError('Please upload an image'); return; }
    if (!studioStatus?.can_generate) { setError('Check your credits or daily limit'); return; }
    setGenerating(true); setError(''); setSuccess(''); setGeneratedVideo(null);
    try {
      const formData = new FormData();
      formData.append('image', imageFile);
      formData.append('prompt', imagePrompt);
      formData.append('aspect_ratio', aspectRatio);
      formData.append('quality', quality);
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const res = await fetch(`${backendUrl}/api/ai-video/generate/image`, {
        method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: formData,
      });
      const data = await res.json();
      if (data.success) { setGeneratedVideo(data); setSuccess(data.message); loadStudioStatus(); }
      else { setError(data.error || 'Generation failed'); }
    } catch (e) { setError('Network error — please try again'); }
    finally { setGenerating(false); }
  };

  // ── PURCHASE PACK ──

  const handlePurchasePack = async (packId) => {
    setPurchasing(true); setError('');
    try {
      const res = await fetch(`${backendUrl}/api/ai-video/purchase-credits`, {
        method: 'POST', headers: getHeaders(), body: JSON.stringify({ pack_id: packId }),
      });
      const data = await res.json();
      if (data.success && data.checkout_url) window.location.href = data.checkout_url;
      else setError(data.error || 'Purchase failed');
    } catch (e) { setError('Network error'); }
    finally { setPurchasing(false); }
  };

  // ── IMAGE UPLOAD ──

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Upload an image file'); return; }
    if (file.size > 10 * 1024 * 1024) { setError('Image must be under 10MB'); return; }
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  // ── DELETE VIDEO ──

  const handleDeleteVideo = async (id) => {
    if (!window.confirm('Delete this video?')) return;
    try {
      const res = await fetch(`${backendUrl}/api/ai-video/delete/${id}`, { method: 'DELETE', headers: getHeaders() });
      const data = await res.json();
      if (data.success) setMyVideos(prev => prev.filter(v => v.id !== id));
    } catch (e) { setError('Delete failed'); }
  };

  // ── PROMPT SUGGESTIONS ──

  const promptSuggestions = [
    'A cinematic shot of a neon city at night with rain reflections',
    'Ocean waves crashing on a rocky cliff during golden hour',
    'A futuristic spaceship flying through an asteroid field',
    'Abstract colorful particles flowing in slow motion',
    'A cozy cabin in the woods with snow falling gently',
    'Time-lapse of flowers blooming in a garden',
  ];

  // ── LOADING STATE ──

  if (loading) {
    return (
      <div className="aivs-page">
        <div className="aivs-loading">
          <div className="aivs-spinner"></div>
          <p>Loading AI Video Studio...</p>
        </div>
      </div>
    );
  }

  // ── UPGRADE WALL (Free tier) ──

  if (studioStatus?.tier === 'free') {
    return (
      <div className="aivs-page">
        <div className="aivs-upgrade-wall">
          <div className="aivs-upgrade-icon">🎬</div>
          <h2>AI Video Studio</h2>
          <p>Generate stunning videos from text or images using AI.</p>
          <p>Available on paid plans starting at $12.99/month.</p>
          <div className="aivs-upgrade-features">
            <div className="aivs-upgrade-feature"><span>✨</span> Text-to-Video Generation</div>
            <div className="aivs-upgrade-feature"><span>🖼️</span> Image-to-Video Animation</div>
            <div className="aivs-upgrade-feature"><span>🎥</span> Up to 30 free videos/month on Pro</div>
            <div className="aivs-upgrade-feature"><span>💰</span> Buy additional credit packs anytime</div>
          </div>
          <a href="/pricing" className="aivs-upgrade-btn">View Plans & Upgrade</a>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // MAIN RENDER
  // ══════════════════════════════════════════════════════════════════════════

  return (
    <div className="aivs-page">

      {/* ── HEADER ── */}
      <div className="aivs-header">
        <div className="aivs-header-left">
          <h1>🎬 AI Video Studio</h1>
          <p>Generate stunning videos from text or images</p>
        </div>
        <div className="aivs-header-right">
          <div className="aivs-credit-badge">
            <span className="aivs-credit-icon">⚡</span>
            <span className="aivs-credit-count">{studioStatus?.credits?.balance || 0}</span>
            <span className="aivs-credit-label">credits</span>
          </div>
          <div className="aivs-daily-badge">
            <span>{studioStatus?.remaining_today || 0}/{studioStatus?.daily_limit || 0}</span>
            <span className="aivs-daily-label">today</span>
          </div>
        </div>
      </div>

      {/* ── ALERTS ── */}
      {error && (
        <div className="aivs-alert aivs-alert-error">
          <span>❌</span> {error}
          <button onClick={() => setError('')}>×</button>
        </div>
      )}
      {success && (
        <div className="aivs-alert aivs-alert-success">
          <span>✅</span> {success}
          <button onClick={() => setSuccess('')}>×</button>
        </div>
      )}

      {/* ── TABS ── */}
      <div className="aivs-tabs">
        <button className={`aivs-tab ${activeTab === 'text' ? 'active' : ''}`} onClick={() => setActiveTab('text')}>
          ✨ Text to Video
        </button>
        <button className={`aivs-tab ${activeTab === 'image' ? 'active' : ''}`} onClick={() => setActiveTab('image')}>
          🖼️ Image to Video
        </button>
        <button className={`aivs-tab ${activeTab === 'gallery' ? 'active' : ''}`} onClick={() => setActiveTab('gallery')}>
          🎥 My Videos ({studioStatus?.total_videos_generated || 0})
        </button>
        <button className={`aivs-tab ${activeTab === 'credits' ? 'active' : ''}`} onClick={() => setActiveTab('credits')}>
          ⚡ Credits
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* TEXT TO VIDEO TAB                                                 */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'text' && (
        <div className="aivs-panel">
          <div className="aivs-form-group">
            <label>Describe your video</label>
            <textarea
              className="aivs-textarea"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="A cinematic drone shot flying over a mountain lake at sunrise..."
              maxLength={500}
              rows={4}
            />
            <div className="aivs-char-count">{prompt.length}/500</div>
          </div>

          <div className="aivs-suggestions">
            <label>Try a suggestion:</label>
            <div className="aivs-suggestion-chips">
              {promptSuggestions.map((s, i) => (
                <button key={i} className="aivs-chip" onClick={() => setPrompt(s)}>
                  {s.substring(0, 45)}...
                </button>
              ))}
            </div>
          </div>

          <div className="aivs-settings-row">
            <div className="aivs-setting">
              <label>Aspect Ratio</label>
              <select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)}>
                <option value="16:9">16:9 Widescreen</option>
                <option value="9:16">9:16 Vertical/TikTok</option>
                <option value="1:1">1:1 Square</option>
              </select>
            </div>
            <div className="aivs-setting">
              <label>Quality</label>
              <select value={quality} onChange={(e) => setQuality(e.target.value)}>
                <option value="standard">Standard (1 credit)</option>
                <option value="premium">Premium (1 credit, slower)</option>
              </select>
            </div>
          </div>

          <button
            className="aivs-generate-btn"
            onClick={handleTextToVideo}
            disabled={generating || !prompt.trim() || !studioStatus?.can_generate}
          >
            {generating ? (
              <><span className="aivs-btn-spinner"></span> Generating... (30-90 sec)</>
            ) : (
              <>🎬 Generate Video (1 credit)</>
            )}
          </button>

          {generatedVideo?.video_url && (
            <div className="aivs-result">
              <h3>Your Generated Video</h3>
              <video src={generatedVideo.video_url} controls autoPlay loop className="aivs-result-video" />
              <div className="aivs-result-actions">
                <a href={generatedVideo.video_url} download className="aivs-download-btn">⬇️ Download</a>
                <span className="aivs-result-info">Credits remaining: {generatedVideo.credits_remaining}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* IMAGE TO VIDEO TAB                                                */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'image' && (
        <div className="aivs-panel">
          <div className="aivs-upload-area" onClick={() => fileInputRef.current?.click()}>
            {imagePreview ? (
              <img src={imagePreview} alt="Source" className="aivs-upload-preview" />
            ) : (
              <>
                <div className="aivs-upload-icon">🖼️</div>
                <p>Click to upload an image</p>
                <span>PNG, JPG, WebP — Max 10MB</span>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              style={{ display: 'none' }}
            />
          </div>

          {imagePreview && (
            <button className="aivs-clear-btn" onClick={() => { setImageFile(null); setImagePreview(''); }}>
              ✕ Clear image
            </button>
          )}

          <div className="aivs-form-group">
            <label>Motion prompt (optional)</label>
            <input
              type="text"
              className="aivs-input"
              value={imagePrompt}
              onChange={(e) => setImagePrompt(e.target.value)}
              placeholder="e.g., camera slowly zooms in, person turns head..."
            />
          </div>

          <div className="aivs-settings-row">
            <div className="aivs-setting">
              <label>Aspect Ratio</label>
              <select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)}>
                <option value="16:9">16:9 Widescreen</option>
                <option value="9:16">9:16 Vertical</option>
                <option value="1:1">1:1 Square</option>
              </select>
            </div>
            <div className="aivs-setting">
              <label>Quality</label>
              <select value={quality} onChange={(e) => setQuality(e.target.value)}>
                <option value="standard">Standard (1 credit)</option>
                <option value="premium">Premium (1 credit, slower)</option>
              </select>
            </div>
          </div>

          <button
            className="aivs-generate-btn"
            onClick={handleImageToVideo}
            disabled={generating || !imageFile || !studioStatus?.can_generate}
          >
            {generating ? (
              <><span className="aivs-btn-spinner"></span> Animating... (30-90 sec)</>
            ) : (
              <>🖼️ Animate Image (1 credit)</>
            )}
          </button>

          {generatedVideo?.video_url && (
            <div className="aivs-result">
              <h3>Your Animated Video</h3>
              <video src={generatedVideo.video_url} controls autoPlay loop className="aivs-result-video" />
              <div className="aivs-result-actions">
                <a href={generatedVideo.video_url} download className="aivs-download-btn">⬇️ Download</a>
                <span className="aivs-result-info">Credits remaining: {generatedVideo.credits_remaining}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* GALLERY TAB                                                       */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'gallery' && (
        <div className="aivs-panel">
          {myVideos.length === 0 ? (
            <div className="aivs-empty-gallery">
              <div className="aivs-empty-icon">🎬</div>
              <p>No videos generated yet</p>
              <button className="aivs-chip" onClick={() => setActiveTab('text')}>
                Create your first video →
              </button>
            </div>
          ) : (
            <>
              <div className="aivs-gallery-grid">
                {myVideos.map((video) => (
                  <div key={video.id} className="aivs-gallery-card">
                    {video.status === 'completed' && video.video_url ? (
                      <video
                        src={video.video_url}
                        className="aivs-gallery-video"
                        muted
                        loop
                        onMouseEnter={(e) => e.target.play()}
                        onMouseLeave={(e) => { e.target.pause(); e.target.currentTime = 0; }}
                      />
                    ) : (
                      <div className={`aivs-gallery-placeholder ${video.status}`}>
                        {video.status === 'processing' && '⏳ Processing...'}
                        {video.status === 'failed' && '❌ Failed'}
                        {video.status === 'pending' && '🔄 Queued'}
                      </div>
                    )}
                    <div className="aivs-gallery-info">
                      <span className="aivs-gallery-type">
                        {video.generation_type === 'text_to_video' ? '✨ Text' : '🖼️ Image'}
                      </span>
                      <span className="aivs-gallery-date">
                        {new Date(video.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="aivs-gallery-prompt">
                      {video.prompt?.substring(0, 80) || 'Image animation'}
                      {video.prompt?.length > 80 && '...'}
                    </p>
                    <div className="aivs-gallery-actions">
                      {video.video_url && (
                        <a href={video.video_url} download className="aivs-gallery-btn">⬇️</a>
                      )}
                      <button className="aivs-gallery-btn delete" onClick={() => handleDeleteVideo(video.id)}>
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {galleryTotal > 12 && (
                <div className="aivs-pagination">
                  <button disabled={galleryPage <= 1} onClick={() => loadGallery(galleryPage - 1)}>← Prev</button>
                  <span>Page {galleryPage}</span>
                  <button disabled={myVideos.length < 12} onClick={() => loadGallery(galleryPage + 1)}>Next →</button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* CREDITS TAB                                                       */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'credits' && (
        <div className="aivs-panel">

          {/* Balance Card */}
          <div className="aivs-balance-card">
            <div className="aivs-balance-main">
              <span className="aivs-balance-number">{studioStatus?.credits?.balance || 0}</span>
              <span className="aivs-balance-label">Credits Available</span>
            </div>
            <div className="aivs-balance-stats">
              <div className="aivs-stat">
                <span className="aivs-stat-value">{studioStatus?.credits?.total_used || 0}</span>
                <span className="aivs-stat-label">Videos Created</span>
              </div>
              <div className="aivs-stat">
                <span className="aivs-stat-value">${studioStatus?.credits?.total_spent || '0.00'}</span>
                <span className="aivs-stat-label">Total Spent</span>
              </div>
              <div className="aivs-stat">
                <span className="aivs-stat-value">{studioStatus?.credits?.monthly_free_credits || 0}/mo</span>
                <span className="aivs-stat-label">Free from {studioStatus?.tier} plan</span>
              </div>
            </div>
          </div>

          {/* Credit Packs */}
          <h3 className="aivs-section-title">Buy Credit Packs</h3>
          <div className="aivs-packs-grid">
            {creditPacks.map((pack) => (
              <div key={pack.id} className={`aivs-pack-card ${pack.popular ? 'popular' : ''}`}>
                {pack.popular && <div className="aivs-pack-badge">Most Popular</div>}
                <div className="aivs-pack-icon">{pack.icon}</div>
                <h4 className="aivs-pack-name">{pack.name}</h4>
                <div className="aivs-pack-credits">{pack.credits} videos</div>
                <div className="aivs-pack-price">${pack.price.toFixed(2)}</div>
                <div className="aivs-pack-per-video">${pack.price_per_video.toFixed(2)} per video</div>
                {pack.savings && <div className="aivs-pack-savings">{pack.savings}</div>}
                <button
                  className="aivs-pack-buy-btn"
                  onClick={() => handlePurchasePack(pack.id)}
                  disabled={purchasing}
                >
                  {purchasing ? 'Processing...' : 'Buy Now'}
                </button>
              </div>
            ))}
          </div>

          {/* Tier Free Credits Info */}
          <div className="aivs-tier-info">
            <h4>Monthly Free Credits by Plan</h4>
            <div className="aivs-tier-grid">
              <div className={`aivs-tier-card ${studioStatus?.tier === 'starter' ? 'current' : ''}`}>
                <span className="aivs-tier-name">Starter</span>
                <span className="aivs-tier-credits">5/month</span>
              </div>
              <div className={`aivs-tier-card ${studioStatus?.tier === 'creator' ? 'current' : ''}`}>
                <span className="aivs-tier-name">Creator</span>
                <span className="aivs-tier-credits">15/month</span>
              </div>
              <div className={`aivs-tier-card ${studioStatus?.tier === 'pro' ? 'current' : ''}`}>
                <span className="aivs-tier-name">Pro</span>
                <span className="aivs-tier-credits">30/month</span>
              </div>
            </div>
          </div>

          {/* Purchase History */}
          {purchaseHistory.length > 0 && (
            <>
              <h3 className="aivs-section-title">Purchase History</h3>
              <div className="aivs-history-list">
                {purchaseHistory.map((p) => (
                  <div key={p.id} className="aivs-history-item">
                    <span className="aivs-history-name">{p.pack_name}</span>
                    <span className="aivs-history-credits">+{p.credits_amount} credits</span>
                    <span className="aivs-history-price">${p.price.toFixed(2)}</span>
                    <span className="aivs-history-date">{new Date(p.created_at).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default AIVideoStudio;