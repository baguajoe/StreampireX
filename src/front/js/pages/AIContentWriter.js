// =============================================================================
// AIContentWriter.js - AI Content Generation Tool
// =============================================================================
// Location: src/front/js/pages/AIContentWriter.js
// No model needed — calls /api/ai/generate-content endpoint
// =============================================================================

import React, { useState, useContext } from 'react';
import { Context } from '../store/appContext';
import '../../styles/AIContentWriter.css';

const CONTENT_TYPES = [
  { id: 'track_description', name: 'Track Description', icon: '🎵', desc: 'Descriptions for your music releases' },
  { id: 'artist_bio', name: 'Artist Bio', icon: '👤', desc: 'Professional bios for your profile' },
  { id: 'social_post', name: 'Social Post', icon: '📱', desc: 'Posts for any platform' },
  { id: 'podcast_notes', name: 'Podcast Notes', icon: '🎙️', desc: 'Show notes and summaries' },
  { id: 'video_description', name: 'Video Description', icon: '🎬', desc: 'SEO-friendly video descriptions' },
  { id: 'email_newsletter', name: 'Email Newsletter', icon: '📧', desc: 'Email campaigns for your fans' },
  { id: 'press_release', name: 'Press Release', icon: '📰', desc: 'Professional press releases' },
  { id: 'hashtags', name: 'Hashtag Generator', icon: '#️⃣', desc: 'Relevant hashtags for your content' },
];

const PLATFORMS = [
  { id: 'instagram', name: 'Instagram', icon: '📸' },
  { id: 'twitter', name: 'Twitter/X', icon: '🐦' },
  { id: 'tiktok', name: 'TikTok', icon: '🎵' },
  { id: 'youtube', name: 'YouTube', icon: '▶️' },
  { id: 'linkedin', name: 'LinkedIn', icon: '💼' },
  { id: 'facebook', name: 'Facebook', icon: '📘' },
];

const TONES = [
  { id: 'casual', name: 'Casual', icon: '😎' },
  { id: 'professional', name: 'Professional', icon: '👔' },
  { id: 'hype', name: 'Hype', icon: '🔥' },
  { id: 'storytelling', name: 'Storytelling', icon: '📖' },
  { id: 'funny', name: 'Funny', icon: '😂' },
  { id: 'emotional', name: 'Emotional', icon: '💜' },
];

const GENRES = [
  'Pop', 'Rock', 'Hip Hop', 'R&B', 'Electronic', 'Jazz', 'Classical',
  'Country', 'Reggae', 'Folk', 'Blues', 'Alternative', 'Indie',
  'Metal', 'Punk', 'Funk', 'House', 'Techno', 'Lo-fi', 'Afrobeat',
];

const AIContentWriter = () => {
  const { store } = useContext(Context);

  // State
  const [selectedType, setSelectedType] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(null);
  const [activeVariant, setActiveVariant] = useState('main');
  
  // Form state
  const [form, setForm] = useState({
    title: '',
    artist_name: '',
    genre: '',
    mood: '',
    platform: '',
    tone: 'casual',
    keywords: '',
    additional_info: '',
  });

  // Update form field
  const updateField = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  // Generate content
  const handleGenerate = async () => {
    if (!selectedType) return;
    
    setGenerating(true);
    setResult(null);
    setActiveVariant('main');

    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const backendUrl = process.env.REACT_APP_BACKEND_URL;

      const response = await fetch(`${backendUrl}/api/ai/generate-content`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          type: selectedType,
          context: {
            ...form,
            keywords: form.keywords ? form.keywords.split(',').map(k => k.trim()) : [],
          },
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setResult(data);
      } else {
        setResult({ error: data.error || 'Generation failed. Please try again.' });
      }
    } catch (error) {
      console.error('AI generation error:', error);
      setResult({ error: 'Network error. Please check your connection.' });
    } finally {
      setGenerating(false);
    }
  };

  // Copy to clipboard
  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(label);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  // Get current display content
  const getCurrentContent = () => {
    if (!result || result.error) return '';
    if (activeVariant === 'main') return result.content;
    const idx = parseInt(activeVariant.replace('variant-', ''));
    return result.variants?.[idx] || result.content;
  };

  // Reset everything
  const handleReset = () => {
    setSelectedType(null);
    setResult(null);
    setForm({
      title: '',
      artist_name: '',
      genre: '',
      mood: '',
      platform: '',
      tone: 'casual',
      keywords: '',
      additional_info: '',
    });
  };

  return (
    <div className="ai-writer">
      {/* Header */}
      <header className="ai-writer-header">
        <div className="ai-writer-header-content">
          <h1>✍️ AI Content Writer</h1>
          <p>Generate professional content for your music, videos, podcasts, and social media</p>
        </div>
        {selectedType && (
          <button className="ai-writer-back-btn" onClick={handleReset}>
            ← Start Over
          </button>
        )}
      </header>

      {/* Step 1: Choose Content Type */}
      {!selectedType && (
        <section className="ai-writer-types">
          <h2>What do you want to create?</h2>
          <div className="ai-writer-types-grid">
            {CONTENT_TYPES.map(type => (
              <button
                key={type.id}
                className="ai-writer-type-card"
                onClick={() => setSelectedType(type.id)}
              >
                <span className="ai-writer-type-icon">{type.icon}</span>
                <span className="ai-writer-type-name">{type.name}</span>
                <span className="ai-writer-type-desc">{type.desc}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Step 2: Fill in Context */}
      {selectedType && !result && (
        <section className="ai-writer-form-section">
          <div className="ai-writer-form-header">
            <span className="ai-writer-form-icon">
              {CONTENT_TYPES.find(t => t.id === selectedType)?.icon}
            </span>
            <h2>{CONTENT_TYPES.find(t => t.id === selectedType)?.name}</h2>
          </div>

          <div className="ai-writer-form">
            {/* Title */}
            <div className="ai-writer-field">
              <label>Title / Name *</label>
              <input
                type="text"
                value={form.title}
                onChange={e => updateField('title', e.target.value)}
                placeholder="Song title, video name, episode title..."
              />
            </div>

            {/* Artist Name */}
            <div className="ai-writer-field">
              <label>Artist / Creator Name *</label>
              <input
                type="text"
                value={form.artist_name}
                onChange={e => updateField('artist_name', e.target.value)}
                placeholder="Your name or brand"
              />
            </div>

            {/* Genre */}
            <div className="ai-writer-field">
              <label>Genre / Category</label>
              <div className="ai-writer-chips">
                {GENRES.map(g => (
                  <button
                    key={g}
                    className={`ai-writer-chip ${form.genre === g ? 'active' : ''}`}
                    onClick={() => updateField('genre', form.genre === g ? '' : g)}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            {/* Tone */}
            <div className="ai-writer-field">
              <label>Tone</label>
              <div className="ai-writer-chips">
                {TONES.map(t => (
                  <button
                    key={t.id}
                    className={`ai-writer-chip ${form.tone === t.id ? 'active' : ''}`}
                    onClick={() => updateField('tone', t.id)}
                  >
                    {t.icon} {t.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Platform (for social posts) */}
            {(selectedType === 'social_post' || selectedType === 'hashtags') && (
              <div className="ai-writer-field">
                <label>Platform</label>
                <div className="ai-writer-chips">
                  {PLATFORMS.map(p => (
                    <button
                      key={p.id}
                      className={`ai-writer-chip ${form.platform === p.id ? 'active' : ''}`}
                      onClick={() => updateField('platform', form.platform === p.id ? '' : p.id)}
                    >
                      {p.icon} {p.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Mood */}
            <div className="ai-writer-field">
              <label>Mood / Vibe</label>
              <input
                type="text"
                value={form.mood}
                onChange={e => updateField('mood', e.target.value)}
                placeholder="e.g. energetic, chill, dark, uplifting, nostalgic..."
              />
            </div>

            {/* Keywords */}
            <div className="ai-writer-field">
              <label>Keywords (comma separated)</label>
              <input
                type="text"
                value={form.keywords}
                onChange={e => updateField('keywords', e.target.value)}
                placeholder="e.g. summer, love, freedom, underground..."
              />
            </div>

            {/* Additional Info */}
            <div className="ai-writer-field">
              <label>Additional Context</label>
              <textarea
                value={form.additional_info}
                onChange={e => updateField('additional_info', e.target.value)}
                placeholder="Anything else the AI should know — story behind the track, target audience, collaborators, etc."
                rows={3}
              />
            </div>

            {/* Generate Button */}
            <button
              className="ai-writer-generate-btn"
              onClick={handleGenerate}
              disabled={generating || !form.title}
            >
              {generating ? (
                <>
                  <span className="ai-writer-spinner"></span>
                  Generating...
                </>
              ) : (
                <>✨ Generate Content</>
              )}
            </button>
          </div>
        </section>
      )}

      {/* Step 3: Results */}
      {result && (
        <section className="ai-writer-results">
          {result.error ? (
            <div className="ai-writer-error">
              <span className="ai-writer-error-icon">⚠️</span>
              <p>{result.error}</p>
              <button onClick={() => setResult(null)} className="ai-writer-retry-btn">
                Try Again
              </button>
            </div>
          ) : (
            <>
              <div className="ai-writer-results-header">
                <h2>
                  {CONTENT_TYPES.find(t => t.id === selectedType)?.icon}{' '}
                  Your {CONTENT_TYPES.find(t => t.id === selectedType)?.name}
                </h2>
                {result.ai_powered && (
                  <span className="ai-writer-ai-badge">🤖 AI-Powered</span>
                )}
              </div>

              {/* Variant Tabs */}
              <div className="ai-writer-variant-tabs">
                <button
                  className={`ai-writer-variant-tab ${activeVariant === 'main' ? 'active' : ''}`}
                  onClick={() => setActiveVariant('main')}
                >
                  ⭐ Main
                </button>
                {result.variants?.map((_, i) => (
                  <button
                    key={i}
                    className={`ai-writer-variant-tab ${activeVariant === `variant-${i}` ? 'active' : ''}`}
                    onClick={() => setActiveVariant(`variant-${i}`)}
                  >
                    Variant {i + 1}
                  </button>
                ))}
              </div>

              {/* Content Display */}
              <div className="ai-writer-content-box">
                <pre className="ai-writer-content-text">{getCurrentContent()}</pre>
                <button
                  className={`ai-writer-copy-btn ${copied === activeVariant ? 'copied' : ''}`}
                  onClick={() => copyToClipboard(getCurrentContent(), activeVariant)}
                >
                  {copied === activeVariant ? '✅ Copied!' : '📋 Copy'}
                </button>
              </div>

              {/* Actions */}
              <div className="ai-writer-actions">
                <button
                  className="ai-writer-regenerate-btn"
                  onClick={handleGenerate}
                  disabled={generating}
                >
                  {generating ? '⏳ Regenerating...' : '🔄 Regenerate'}
                </button>
                <button className="ai-writer-new-btn" onClick={handleReset}>
                  ✨ New Content
                </button>
                <button
                  className="ai-writer-edit-btn"
                  onClick={() => setResult(null)}
                >
                  ✏️ Edit Inputs
                </button>
              </div>
            </>
          )}
        </section>
      )}
    </div>
  );
};

export default AIContentWriter;