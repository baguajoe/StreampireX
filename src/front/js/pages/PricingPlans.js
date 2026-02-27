import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Context } from '../store/appContext';
import '../../styles/PricingPlans.css';

const PricingPlans = () => {
  const { store } = useContext(Context);
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [showComparison, setShowComparison] = useState(false);
  const [currentPlan, setCurrentPlan] = useState(null);
  const [processing, setProcessing] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // ==========================================================================
  // PRICING CONFIGURATION - 4 TIERS (Updated Feb 2026 — +$2 for AI costs)
  // ==========================================================================
  const pricing = {
    free: { monthly: 0, yearly: 0 },
    starter: { monthly: 12.99, yearly: 129.99 },
    creator: { monthly: 22.99, yearly: 229.99 },
    pro: { monthly: 31.99, yearly: 319.99 },
  };

  // Distribution Plan Pricing (yearly only)
  const distributionPricing = {
    artist: 21.99,
    label: 74.99,
  };

  // ==========================================================================
  // FETCH CURRENT PLAN
  // ==========================================================================
  useEffect(() => {
    const fetchCurrentPlan = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setLoading(false);
          return;
        }

        const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';
        const response = await fetch(`${backendUrl}/api/user/subscription`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
          const data = await response.json();
          setCurrentPlan(data.tier || data.plan_name || 'free');
        }
      } catch (err) {
        console.error('Error fetching plan:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCurrentPlan();
  }, []);

  // ==========================================================================
  // HELPER FUNCTIONS
  // ==========================================================================
  const getPrice = (tier) => {
    return pricing[tier][billingCycle];
  };

  const getMonthlyEquivalent = (tier) => {
    if (tier === 'free') return 0;
    if (billingCycle === 'monthly') return pricing[tier].monthly;
    return (pricing[tier].yearly / 12).toFixed(2);
  };

  const getYearlySavings = (tier) => {
    if (tier === 'free') return 0;
    const monthlyTotal = pricing[tier].monthly * 12;
    return (monthlyTotal - pricing[tier].yearly).toFixed(0);
  };

  const isCurrentPlan = (tier) => {
    return currentPlan?.toLowerCase() === tier.toLowerCase();
  };

  // ==========================================================================
  // SUBSCRIPTION HANDLER
  // ==========================================================================
  const handleSelectPlan = async (tier, isDistribution = false) => {
    if (!store.user) {
      navigate('/signup');
      return;
    }

    if (tier === 'free') {
      navigate('/dashboard');
      return;
    }

    if (isCurrentPlan(tier)) {
      return;
    }

    try {
      setProcessing(tier);
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';

      const planNameMap = {
        'free': 'Free',
        'starter': 'Starter',
        'creator': 'Creator',
        'pro': 'Pro',
        'artist-distribution': 'standalone-artist',
        'label-distribution': 'standalone-label'
      };

      let planId = planNameMap[tier] || tier;

      const response = await fetch(`${backendUrl}/api/subscriptions/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          plan_id: planId,
          billing_cycle: isDistribution ? 'yearly' : billingCycle
        })
      });

      const data = await response.json();

      if (response.ok && data.checkout_url) {
        window.location.href = data.checkout_url;
      } else if (response.ok) {
        alert('✅ ' + (data.message || 'Subscription updated!'));
        window.location.reload();
      } else {
        alert('❌ ' + (data.error || 'Subscription failed'));
      }
    } catch (error) {
      console.error('Subscription error:', error);
      alert('❌ Failed to process subscription');
    } finally {
      setProcessing(null);
    }
  };

  // ==========================================================================
  // LOADING STATE
  // ==========================================================================
  if (loading) {
    return (
      <div className="pricing-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading plans...</p>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // RENDER
  // ==========================================================================
  return (
    <div className="pricing-page">

      {/* ================================================================== */}
      {/* HEADER SECTION */}
      {/* ================================================================== */}
      <div className="pricing-header">
        <h1>Simple, Transparent Pricing</h1>
        <p>Everything you need to create, stream, game, and grow. No hidden fees.</p>

        {/* Billing Toggle */}
        <div className="billing-toggle">
          <span className={billingCycle === 'monthly' ? 'active' : ''}>Monthly</span>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={billingCycle === 'yearly'}
              onChange={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
            />
            <span className="toggle-slider"></span>
          </label>
          <span className={billingCycle === 'yearly' ? 'active' : ''}>
            Yearly <span className="savings-badge">Save 17%</span>
          </span>
        </div>

        {currentPlan && currentPlan !== 'free' && (
          <div className="current-plan-indicator">
            ✅ Currently on: <strong>{currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)}</strong>
          </div>
        )}
      </div>

      {/* ================================================================== */}
      {/* VALUE PROPOSITION BANNER */}
      {/* ================================================================== */}
      <div className="value-banner">
        <h2>🎬 The All-in-One Creator Platform</h2>
        <p>Replace 15+ tools with one platform. Video editing, streaming, gaming, music distribution, AI mastering, recording studio, and more.</p>
        <div className="value-stats">
          <div className="stat">
            <span className="stat-value">90%</span>
            <span className="stat-label">Creator Earnings</span>
          </div>
          <div className="stat">
            <span className="stat-value">150+</span>
            <span className="stat-label">Distribution Platforms</span>
          </div>
          <div className="stat">
            <span className="stat-value">$0</span>
            <span className="stat-label">To Start Creating</span>
          </div>
        </div>
      </div>

      {/* ================================================================== */}
      {/* CREATOR PLANS - 4 TIERS */}
      {/* ================================================================== */}
      <div className="pricing-section">
        <h2 className="section-title">🎨 Creator Plans</h2>
        <p className="section-subtitle">Full access to video editing, streaming, gaming, AI tools, recording studio, and monetization</p>

        <div className="pricing-cards four-tier">

          {/* ============================================================ */}
          {/* FREE TIER - $0 */}
          {/* ============================================================ */}
          <div className={`pricing-card free ${isCurrentPlan('free') ? 'current' : ''}`}>
            {isCurrentPlan('free') && <div className="current-badge">Current Plan</div>}

            <div className="card-header">
              <h2>Free</h2>
              <p className="card-subtitle">For hobbyists & beginners</p>
            </div>

            <div className="card-price">
              <span className="price">$0</span>
              <span className="period">/forever</span>
            </div>

            <ul className="features-list">
              {/* Video Editing */}
              <li className="feature included highlight">
                <span className="icon">🎬</span>
                <span><strong>Full video editor</strong> - all tools!</span>
              </li>
              <li className="feature included">
                <span className="icon">✓</span>
                <span>1080p export, 5 projects, 4 tracks</span>
              </li>
              <li className="feature included">
                <span className="icon">✓</span>
                <span>5GB storage</span>
              </li>
              <li className="feature limited">
                <span className="icon">~</span>
                <span>Small watermark on exports</span>
              </li>

              {/* Recording Studio */}
              <li className="feature included">
                <span className="icon">🎚️</span>
                <span><strong>Recording Studio</strong> (4 tracks)</span>
              </li>

              {/* Free AI Tools */}
              <li className="feature included highlight">
                <span className="icon">🎵</span>
                <span><strong>AI Stem Separation</strong> — Free!</span>
              </li>
              <li className="feature included">
                <span className="icon">🎯</span>
                <span>Pitch Correction, Key Finder, Audio-to-MIDI</span>
              </li>
              <li className="feature included">
                <span className="icon">🖼️</span>
                <span>Background Removal, Scene Detection</span>
              </li>

              {/* AI Credits */}
              <li className="feature excluded">
                <span className="icon">✗</span>
                <span>0 AI credits/month</span>
              </li>

              {/* Clips */}
              <li className="feature included">
                <span className="icon">📱</span>
                <span>3 clips/day (60 sec max)</span>
              </li>

              {/* Cross-posting */}
              <li className="feature included">
                <span className="icon">🔗</span>
                <span>Cross-post to YouTube (1/day)</span>
              </li>

              {/* Gaming - FREE FOR ALL */}
              <li className="feature included highlight">
                <span className="icon">🎮</span>
                <span><strong>Gaming Community Access</strong></span>
              </li>
              <li className="feature included">
                <span className="icon">✓</span>
                <span>Squad Finder</span>
              </li>

              {/* Monetization */}
              <li className="feature included">
                <span className="icon">💰</span>
                <span>Receive tips (keep 90%)</span>
              </li>

              {/* Excluded */}
              <li className="feature excluded">
                <span className="icon">✗</span>
                <span>AI Mastering, Voice Clone, Radio DJ</span>
              </li>
              <li className="feature excluded">
                <span className="icon">✗</span>
                <span>Live streaming</span>
              </li>
              <li className="feature excluded">
                <span className="icon">✗</span>
                <span>Team Rooms</span>
              </li>
            </ul>

            <button
              className="select-plan-btn"
              onClick={() => handleSelectPlan('free')}
              disabled={isCurrentPlan('free')}
            >
              {isCurrentPlan('free') ? '✅ Current Plan' : 'Get Started Free'}
            </button>
          </div>

          {/* ============================================================ */}
          {/* STARTER TIER - $12.99 */}
          {/* ============================================================ */}
          <div className={`pricing-card starter ${isCurrentPlan('starter') ? 'current' : ''}`}>
            {isCurrentPlan('starter') && <div className="current-badge">Current Plan</div>}

            <div className="card-header">
              <h2>Starter</h2>
              <p className="card-subtitle">For growing creators</p>
            </div>

            <div className="card-price">
              <span className="price">${getMonthlyEquivalent('starter')}</span>
              <span className="period">/month</span>
              {billingCycle === 'yearly' && (
                <>
                  <span className="billed-yearly">Billed ${getPrice('starter')}/year</span>
                  <span className="yearly-savings">Save ${getYearlySavings('starter')}</span>
                </>
              )}
            </div>

            <ul className="features-list">
              <li className="feature included highlight">
                <span className="icon">⬆️</span>
                <span><strong>Everything in Free, plus:</strong></span>
              </li>

              {/* Video Editing */}
              <li className="feature included">
                <span className="icon">🎬</span>
                <span><strong>1080p export, no watermark!</strong></span>
              </li>
              <li className="feature included">
                <span className="icon">✓</span>
                <span>15 projects, 8 tracks, 60 min exports</span>
              </li>
              <li className="feature included">
                <span className="icon">✓</span>
                <span>25GB storage</span>
              </li>

              {/* Recording Studio + AI Mix */}
              <li className="feature included highlight">
                <span className="icon">🎚️</span>
                <span><strong>Recording Studio</strong> (8 tracks)</span>
              </li>
              <li className="feature included">
                <span className="icon">🤖</span>
                <span><strong>AI Mix Assistant</strong></span>
              </li>

              {/* AI Stem Separation — FREE */}
              <li className="feature included highlight">
                <span className="icon">🎵</span>
                <span><strong>AI Stem Separation</strong> — Free!</span>
              </li>

              {/* AI Credits */}
              <li className="feature included special">
                <span className="icon">⚡</span>
                <span><strong>50 AI Credits/month</strong></span>
              </li>
              <li className="feature included">
                <span className="icon">✓</span>
                <span>AI Captions, Content Gen, Narration</span>
              </li>

              {/* Clips */}
              <li className="feature included">
                <span className="icon">📱</span>
                <span>20 clips/day (3 min max)</span>
              </li>

              {/* Streaming */}
              <li className="feature included highlight">
                <span className="icon">📺</span>
                <span><strong>Live Streaming</strong> (4 hrs, 720p)</span>
              </li>

              {/* Cross-posting */}
              <li className="feature included">
                <span className="icon">🔗</span>
                <span>Cross-post to 3 platforms (5/day)</span>
              </li>

              {/* Podcasts & Radio */}
              <li className="feature included">
                <span className="icon">🎙️</span>
                <span>Podcast hosting (5 episodes)</span>
              </li>
              <li className="feature included">
                <span className="icon">📻</span>
                <span>1 Radio station</span>
              </li>

              {/* Gaming */}
              <li className="feature included highlight">
                <span className="icon">🎮</span>
                <span><strong>Team Rooms</strong> (3 rooms)</span>
              </li>
              <li className="feature included">
                <span className="icon">✓</span>
                <span>Gaming Analytics</span>
              </li>

              {/* Music */}
              <li className="feature included">
                <span className="icon">🎵</span>
                <span>Premium music library</span>
              </li>

              {/* AI Features - Starter */}
              <li className="feature included highlight">
                <span className="icon">🤖</span>
                <span><strong>AI Mastering</strong> (3/month)</span>
              </li>

              <li className="feature excluded">
                <span className="icon">✗</span>
                <span>AI Radio DJ, Voice Cloning</span>
              </li>
            </ul>

            <button
              className="select-plan-btn starter-btn"
              onClick={() => handleSelectPlan('starter')}
              disabled={processing === 'starter' || isCurrentPlan('starter')}
            >
              {processing === 'starter' ? (
                <span className="btn-loading">
                  <span className="spinner"></span> Processing...
                </span>
              ) : isCurrentPlan('starter') ? '✅ Current Plan' : 'Start Creating'}
            </button>
          </div>

          {/* ============================================================ */}
          {/* CREATOR TIER - $22.99 (MOST POPULAR) */}
          {/* ============================================================ */}
          <div className={`pricing-card creator popular ${isCurrentPlan('creator') ? 'current' : ''}`}>
            <div className="popular-badge">🔥 Most Popular</div>
            {isCurrentPlan('creator') && <div className="current-badge">Current Plan</div>}

            <div className="card-header">
              <h2>Creator</h2>
              <p className="card-subtitle">For serious creators</p>
            </div>

            <div className="card-price">
              <span className="price">${getMonthlyEquivalent('creator')}</span>
              <span className="period">/month</span>
              {billingCycle === 'yearly' && (
                <>
                  <span className="billed-yearly">Billed ${getPrice('creator')}/year</span>
                  <span className="yearly-savings">Save ${getYearlySavings('creator')}</span>
                </>
              )}
            </div>

            <ul className="features-list">
              <li className="feature included highlight">
                <span className="icon">⬆️</span>
                <span><strong>Everything in Starter, plus:</strong></span>
              </li>

              {/* Video Editing */}
              <li className="feature included">
                <span className="icon">🎬</span>
                <span><strong>4K export</strong>, unlimited projects</span>
              </li>
              <li className="feature included">
                <span className="icon">✓</span>
                <span>24 tracks, 100GB storage</span>
              </li>
              <li className="feature included">
                <span className="icon">✓</span>
                <span>Collaborate with 8 people</span>
              </li>

              {/* Recording Studio + AI Mix */}
              <li className="feature included highlight">
                <span className="icon">🎚️</span>
                <span><strong>Recording Studio</strong> (16 tracks)</span>
              </li>
              <li className="feature included">
                <span className="icon">🤖</span>
                <span><strong>AI Mix Assistant</strong></span>
              </li>

              {/* AI Stem Separation — FREE */}
              <li className="feature included highlight">
                <span className="icon">🎵</span>
                <span><strong>AI Stem Separation</strong> — Free!</span>
              </li>

              {/* AI Credits */}
              <li className="feature included special">
                <span className="icon">⚡</span>
                <span><strong>200 AI Credits/month</strong></span>
              </li>
              <li className="feature included">
                <span className="icon">✓</span>
                <span>AI Video Gen, Captions, Content, Images</span>
              </li>

              {/* Clips */}
              <li className="feature included">
                <span className="icon">📱</span>
                <span><strong>Unlimited clips</strong> (10 min max)</span>
              </li>

              {/* Streaming */}
              <li className="feature included highlight">
                <span className="icon">📺</span>
                <span><strong>4K Streaming</strong> (12 hours max)</span>
              </li>
              <li className="feature included">
                <span className="icon">✓</span>
                <span>1,000 concurrent viewers</span>
              </li>

              {/* Cross-posting */}
              <li className="feature included">
                <span className="icon">🔗</span>
                <span>Cross-post to <strong>8 platforms</strong> (10/day)</span>
              </li>

              {/* Podcasts & Radio */}
              <li className="feature included">
                <span className="icon">🎙️</span>
                <span><strong>Unlimited</strong> podcast episodes</span>
              </li>
              <li className="feature included">
                <span className="icon">📻</span>
                <span>3 Radio stations + Auto-DJ</span>
              </li>

              {/* Gaming */}
              <li className="feature included highlight">
                <span className="icon">🎮</span>
                <span><strong>Game Streaming & Monetization</strong></span>
              </li>
              <li className="feature included">
                <span className="icon">✓</span>
                <span>10 Team Rooms</span>
              </li>

              {/* Analytics */}
              <li className="feature included">
                <span className="icon">📊</span>
                <span>Advanced Analytics Dashboard</span>
              </li>

              {/* AI Features - Creator */}
              <li className="feature included highlight">
                <span className="icon">🤖</span>
                <span><strong>AI Mastering</strong> (15/month)</span>
              </li>
              <li className="feature included highlight">
                <span className="icon">📻</span>
                <span><strong>AI Radio DJ</strong> (7 preset personas)</span>
              </li>

              <li className="feature excluded">
                <span className="icon">✗</span>
                <span>AI Voice Cloning</span>
              </li>
            </ul>

            <button
              className="select-plan-btn creator-btn"
              onClick={() => handleSelectPlan('creator')}
              disabled={processing === 'creator' || isCurrentPlan('creator')}
            >
              {processing === 'creator' ? (
                <span className="btn-loading">
                  <span className="spinner"></span> Processing...
                </span>
              ) : isCurrentPlan('creator') ? '✅ Current Plan' : 'Go Creator'}
            </button>
          </div>

          {/* ============================================================ */}
          {/* PRO TIER - $31.99 */}
          {/* ============================================================ */}
          <div className={`pricing-card pro ${isCurrentPlan('pro') ? 'current' : ''}`}>
            {isCurrentPlan('pro') && <div className="current-badge">Current Plan</div>}

            <div className="card-header">
              <h2>Pro</h2>
              <p className="card-subtitle">The ultimate creator suite</p>
            </div>

            <div className="card-price">
              <span className="price">${getMonthlyEquivalent('pro')}</span>
              <span className="period">/month</span>
              {billingCycle === 'yearly' && (
                <>
                  <span className="billed-yearly">Billed ${getPrice('pro')}/year</span>
                  <span className="yearly-savings">Save ${getYearlySavings('pro')}</span>
                </>
              )}
            </div>

            <ul className="features-list">
              <li className="feature included highlight">
                <span className="icon">⬆️</span>
                <span><strong>Everything in Creator, plus:</strong></span>
              </li>

              {/* Video Editing */}
              <li className="feature included">
                <span className="icon">🎬</span>
                <span><strong>8K export</strong>, 50 tracks</span>
              </li>
              <li className="feature included">
                <span className="icon">✓</span>
                <span><strong>Unlimited</strong> storage</span>
              </li>
              <li className="feature included">
                <span className="icon">✓</span>
                <span>Team collaboration (unlimited)</span>
              </li>

              {/* Recording Studio + AI Mix */}
              <li className="feature included highlight">
                <span className="icon">🎚️</span>
                <span><strong>Recording Studio</strong> (32 tracks)</span>
              </li>
              <li className="feature included special">
                <span className="icon">🤖</span>
                <span><strong>AI Mix Assistant</strong> (browser + server deep analysis)</span>
              </li>

              {/* AI Stem Separation — FREE */}
              <li className="feature included highlight">
                <span className="icon">🎵</span>
                <span><strong>AI Stem Separation</strong> — Free!</span>
              </li>

              {/* AI Credits */}
              <li className="feature included special">
                <span className="icon">⚡</span>
                <span><strong>1,000 AI Credits/month</strong></span>
              </li>
              <li className="feature included">
                <span className="icon">✓</span>
                <span>ALL AI features unlocked</span>
              </li>
              <li className="feature included">
                <span className="icon">🛒</span>
                <span>Buy extra credit packs anytime</span>
              </li>

              {/* Streaming */}
              <li className="feature included highlight">
                <span className="icon">📺</span>
                <span><strong>Unlimited</strong> viewers & duration</span>
              </li>
              <li className="feature included">
                <span className="icon">✓</span>
                <span>Simulcast to 5 destinations</span>
              </li>

              {/* Cross-posting */}
              <li className="feature included">
                <span className="icon">🔗</span>
                <span>Cross-post to <strong>ALL platforms</strong> (unlimited)</span>
              </li>

              {/* Radio */}
              <li className="feature included">
                <span className="icon">📻</span>
                <span><strong>Unlimited</strong> Radio stations</span>
              </li>

              {/* Gaming */}
              <li className="feature included highlight">
                <span className="icon">🎮</span>
                <span><strong>Cloud Gaming</strong> + Unlimited Team Rooms</span>
              </li>

              {/* Music Distribution - PRO EXCLUSIVE */}
              <li className="feature included special">
                <span className="icon">🎵</span>
                <span><strong>Music Distribution</strong> (90% royalties)</span>
              </li>
              <li className="feature included">
                <span className="icon">💰</span>
                <span>Performance royalty collection</span>
              </li>

              {/* AI Features - Pro */}
              <li className="feature included special">
                <span className="icon">🤖</span>
                <span><strong>Unlimited AI Mastering</strong></span>
              </li>
              <li className="feature included special">
                <span className="icon">📻</span>
                <span><strong>AI Radio DJ</strong> (unlimited personas)</span>
              </li>
              <li className="feature included special">
                <span className="icon">🎙️</span>
                <span><strong>AI Voice Cloning</strong> — your voice as DJ</span>
              </li>

              {/* Support */}
              <li className="feature included">
                <span className="icon">⚡</span>
                <span>Priority export queue & 24/7 support</span>
              </li>
              <li className="feature included">
                <span className="icon">🌟</span>
                <span>Early access to new features</span>
              </li>
            </ul>

            <button
              className="select-plan-btn pro-btn"
              onClick={() => handleSelectPlan('pro')}
              disabled={processing === 'pro' || isCurrentPlan('pro')}
            >
              {processing === 'pro' ? (
                <span className="btn-loading">
                  <span className="spinner"></span> Processing...
                </span>
              ) : isCurrentPlan('pro') ? '✅ Current Plan' : 'Go Pro'}
            </button>
          </div>
        </div>
      </div>

      {/* ================================================================== */}
      {/* AI CREDITS EXPLANATION SECTION */}
      {/* ================================================================== */}
      <div className="pricing-section ai-credits-section">
        <h2 className="section-title">⚡ AI Credits — How They Work</h2>
        <p className="section-subtitle">Credits power premium AI features that use paid APIs. Many AI tools run locally and are completely free — no credits needed!</p>

        <div className="pricing-cards three-col">

          {/* Free AI Column */}
          <div className="pricing-card ai-info-card">
            <div className="card-header">
              <h2>🆓 Always Free</h2>
              <p className="card-subtitle">No credits needed — ever</p>
            </div>
            <ul className="features-list">
              <li className="feature included"><span className="icon">🎵</span><span>AI Stem Separation</span></li>
              <li className="feature included"><span className="icon">🎯</span><span>Pitch Correction / Auto-Tune</span></li>
              <li className="feature included"><span className="icon">🔑</span><span>Key Finder</span></li>
              <li className="feature included"><span className="icon">🎼</span><span>Audio-to-MIDI</span></li>
              <li className="feature included"><span className="icon">🥁</span><span>Beat Detection</span></li>
              <li className="feature included"><span className="icon">🎤</span><span>Vocal Tuner</span></li>
              <li className="feature included"><span className="icon">🔊</span><span>Audio Ducking</span></li>
              <li className="feature included"><span className="icon">🖼️</span><span>Background Removal</span></li>
              <li className="feature included"><span className="icon">🎬</span><span>Scene Detection</span></li>
              <li className="feature included"><span className="icon">📍</span><span>Motion Tracking</span></li>
              <li className="feature included"><span className="icon">🔇</span><span>Silence Detection</span></li>
              <li className="feature included"><span className="icon">📷</span><span>Thumbnail Extract</span></li>
            </ul>
          </div>

          {/* Paid AI Column */}
          <div className="pricing-card ai-info-card">
            <div className="card-header">
              <h2>⚡ Uses Credits</h2>
              <p className="card-subtitle">Powered by premium AI APIs</p>
            </div>
            <ul className="features-list">
              <li className="feature included"><span className="icon">🎬</span><span>AI Video Generation — <strong>10 cr</strong></span></li>
              <li className="feature included"><span className="icon">🎤</span><span>Voice Clone (create) — <strong>5 cr</strong></span></li>
              <li className="feature included"><span className="icon">🗣️</span><span>Voice Clone TTS — <strong>2 cr</strong></span></li>
              <li className="feature included"><span className="icon">🎞️</span><span>Video Narration — <strong>3 cr</strong></span></li>
              <li className="feature included"><span className="icon">📻</span><span>AI Radio DJ TTS — <strong>1 cr</strong></span></li>
              <li className="feature included"><span className="icon">🎙️</span><span>Podcast Intro/Outro — <strong>2 cr</strong></span></li>
              <li className="feature included"><span className="icon">💬</span><span>Auto Captions — <strong>2 cr</strong></span></li>
              <li className="feature included"><span className="icon">🖼️</span><span>AI Image Generation — <strong>3 cr</strong></span></li>
              <li className="feature included"><span className="icon">✍️</span><span>AI Content/Lyrics — <strong>1 cr</strong></span></li>
              <li className="feature included"><span className="icon">📷</span><span>AI Thumbnail Enhance — <strong>1 cr</strong></span></li>
            </ul>
          </div>

          {/* Credit Packs Column */}
          <div className="pricing-card ai-info-card">
            <div className="card-header">
              <h2>🛒 Buy More Anytime</h2>
              <p className="card-subtitle">Credit packs for paid subscribers</p>
            </div>
            <ul className="features-list">
              <li className="feature included special"><span className="icon">⚡</span><span><strong>Starter Pack</strong> — 25 credits / $4.99</span></li>
              <li className="feature included special"><span className="icon">🎥</span><span><strong>Creator Pack</strong> — 75 credits / $11.99</span></li>
              <li className="feature included special"><span className="icon">🎬</span><span><strong>Studio Pack</strong> — 200 credits / $24.99</span></li>
              <li className="feature included special"><span className="icon">🚀</span><span><strong>Unlimited Pack</strong> — 500 credits / $49.99</span></li>
            </ul>
            <div style={{ padding: '0 20px 15px', fontSize: '13px', color: '#aaa' }}>
              <p>Credits never expire. Available to Starter, Creator, and Pro subscribers. Purchased credits stack on top of your monthly allotment.</p>
            </div>
          </div>
        </div>
      </div>

      {/* ================================================================== */}
      {/* MUSIC DISTRIBUTION PLANS */}
      {/* ================================================================== */}
      <div className="pricing-section distribution-section">
        <h2 className="section-title">🎵 Music Distribution Plans</h2>
        <p className="section-subtitle">Distribute your music globally to 150+ platforms. Annual billing only.</p>

        <div className="distribution-cards">

          {/* ARTIST DISTRIBUTION */}
          <div className={`pricing-card distribution artist ${isCurrentPlan('artist-distribution') ? 'current' : ''}`}>
            {isCurrentPlan('artist-distribution') && <div className="current-badge">Current Plan</div>}

            <div className="card-header">
              <div className="distribution-icon">🎤</div>
              <h2>Artist Distribution</h2>
              <p className="card-subtitle">For independent artists</p>
            </div>

            <div className="card-price">
              <span className="price">${distributionPricing.artist}</span>
              <span className="period">/year</span>
              <span className="billed-yearly">One-time annual fee</span>
            </div>

            <ul className="features-list">
              <li className="feature included highlight">
                <span className="icon">🌍</span>
                <span><strong>Global Music Distribution</strong></span>
              </li>
              <li className="feature included">
                <span className="icon">✓</span>
                <span>Spotify, Apple Music, Amazon, etc.</span>
              </li>
              <li className="feature included">
                <span className="icon">✓</span>
                <span>150+ streaming platforms</span>
              </li>
              <li className="feature included">
                <span className="icon">📊</span>
                <span>Streaming analytics dashboard</span>
              </li>
              <li className="feature included special">
                <span className="icon">💰</span>
                <span><strong>100% royalty retention</strong></span>
              </li>
              <li className="feature included">
                <span className="icon">⚡</span>
                <span>24-48 hour distribution</span>
              </li>
              <li className="feature included">
                <span className="icon">📈</span>
                <span>Performance tracking</span>
              </li>
              <li className="feature included">
                <span className="icon">🎧</span>
                <span>Unlimited releases</span>
              </li>
            </ul>

            <button
              className="select-plan-btn distribution-btn"
              onClick={() => handleSelectPlan('artist-distribution', true)}
              disabled={processing === 'artist-distribution' || isCurrentPlan('artist-distribution')}
            >
              {processing === 'artist-distribution' ? (
                <span className="btn-loading">
                  <span className="spinner"></span> Processing...
                </span>
              ) : isCurrentPlan('artist-distribution') ? '✅ Current Plan' : 'Start Distributing'}
            </button>
          </div>

          {/* LABEL DISTRIBUTION */}
          <div className={`pricing-card distribution label ${isCurrentPlan('label-distribution') ? 'current' : ''}`}>
            <div className="label-badge">🏆 For Labels</div>
            {isCurrentPlan('label-distribution') && <div className="current-badge">Current Plan</div>}

            <div className="card-header">
              <div className="distribution-icon">🏷️</div>
              <h2>Label Distribution</h2>
              <p className="card-subtitle">For record labels & managers</p>
            </div>

            <div className="card-price">
              <span className="price">${distributionPricing.label}</span>
              <span className="period">/year</span>
              <span className="billed-yearly">One-time annual fee</span>
            </div>

            <ul className="features-list">
              <li className="feature included highlight">
                <span className="icon">🌍</span>
                <span><strong>Unlimited Artist Distribution</strong></span>
              </li>
              <li className="feature included">
                <span className="icon">✓</span>
                <span>All 150+ streaming platforms</span>
              </li>
              <li className="feature included">
                <span className="icon">🏷️</span>
                <span>Label management tools</span>
              </li>
              <li className="feature included">
                <span className="icon">👥</span>
                <span>Artist roster management</span>
              </li>
              <li className="feature included">
                <span className="icon">📊</span>
                <span>Multi-artist analytics</span>
              </li>
              <li className="feature included special">
                <span className="icon">💰</span>
                <span><strong>Revenue split management</strong></span>
              </li>
              <li className="feature included">
                <span className="icon">📈</span>
                <span>Label performance dashboard</span>
              </li>
              <li className="feature included">
                <span className="icon">⚡</span>
                <span>Priority distribution</span>
              </li>
            </ul>

            <button
              className="select-plan-btn distribution-btn label-btn"
              onClick={() => handleSelectPlan('label-distribution', true)}
              disabled={processing === 'label-distribution' || isCurrentPlan('label-distribution')}
            >
              {processing === 'label-distribution' ? (
                <span className="btn-loading">
                  <span className="spinner"></span> Processing...
                </span>
              ) : isCurrentPlan('label-distribution') ? '✅ Current Plan' : 'Start Label Plan'}
            </button>
          </div>
        </div>

        <div className="distribution-note">
          <p>💡 <strong>Pro creators</strong> already have music distribution included! These standalone plans are for users who only need distribution.</p>
        </div>
      </div>

      {/* ================================================================== */}
      {/* CREATOR EARNINGS HIGHLIGHT */}
      {/* ================================================================== */}
      <div className="earnings-highlight">
        <h3>💰 Keep 90% of Your Earnings</h3>
        <p>Unlike other platforms that take 30-50%, StreamPireX lets you keep 90% of tips, subscriptions, and music royalties.</p>
        <div className="earnings-comparison">
          <div className="platform-compare">
            <span className="platform-name">YouTube</span>
            <div className="earnings-bar youtube"><span>45%</span></div>
          </div>
          <div className="platform-compare">
            <span className="platform-name">Twitch</span>
            <div className="earnings-bar twitch"><span>50%</span></div>
          </div>
          <div className="platform-compare">
            <span className="platform-name">StreamPireX</span>
            <div className="earnings-bar streampirex"><span>90%</span></div>
          </div>
        </div>
      </div>

      {/* ================================================================== */}
      {/* COMPARISON TABLE TOGGLE */}
      {/* ================================================================== */}
      <div className="comparison-toggle">
        <button onClick={() => setShowComparison(!showComparison)}>
          {showComparison ? 'Hide' : 'Show'} Full Feature Comparison
          <span className={`arrow ${showComparison ? 'up' : 'down'}`}>▼</span>
        </button>
      </div>

      {/* ================================================================== */}
      {/* FEATURE COMPARISON TABLE - 4 TIERS */}
      {/* ================================================================== */}
      {showComparison && (
        <div className="comparison-table-wrapper">
          <table className="comparison-table">
            <thead>
              <tr>
                <th>Feature</th>
                <th>Free</th>
                <th>Starter</th>
                <th className="highlight">Creator</th>
                <th>Pro</th>
              </tr>
            </thead>
            <tbody>
              {/* Pricing */}
              <tr className="category-header">
                <td colSpan="5">💳 Pricing</td>
              </tr>
              <tr>
                <td>Monthly Price</td>
                <td>$0</td>
                <td>$12.99</td>
                <td className="highlight">$22.99</td>
                <td>$31.99</td>
              </tr>
              <tr>
                <td>Yearly Price</td>
                <td>$0</td>
                <td>$129.99</td>
                <td className="highlight">$229.99</td>
                <td>$319.99</td>
              </tr>

              {/* AI Credits */}
              <tr className="category-header">
                <td colSpan="5">⚡ AI Credits</td>
              </tr>
              <tr>
                <td>Monthly AI Credits</td>
                <td>0</td>
                <td>50</td>
                <td className="highlight">200</td>
                <td>1,000</td>
              </tr>
              <tr>
                <td>Buy Extra Credit Packs</td>
                <td>✗</td>
                <td>✓</td>
                <td className="highlight">✓</td>
                <td>✓</td>
              </tr>
              <tr>
                <td>AI Video Generation (10 cr)</td>
                <td>✗</td>
                <td>3/day</td>
                <td className="highlight">10/day</td>
                <td>50/day</td>
              </tr>
              <tr>
                <td>AI Content/Lyrics Gen (1 cr)</td>
                <td>✗</td>
                <td>10/day</td>
                <td className="highlight">50/day</td>
                <td>200/day</td>
              </tr>
              <tr>
                <td>Auto Captions (2 cr)</td>
                <td>✗</td>
                <td>3/day</td>
                <td className="highlight">10/day</td>
                <td>50/day</td>
              </tr>
              <tr>
                <td>AI Image Gen (3 cr)</td>
                <td>✗</td>
                <td>5/day</td>
                <td className="highlight">20/day</td>
                <td>100/day</td>
              </tr>

              {/* Free AI Tools */}
              <tr className="category-header">
                <td colSpan="5">🆓 Free AI Tools (No Credits)</td>
              </tr>
              <tr>
                <td>AI Stem Separation</td>
                <td>✓ Free</td>
                <td>✓ Free</td>
                <td className="highlight">✓ Free</td>
                <td>✓ Free</td>
              </tr>
              <tr>
                <td>Pitch Correction / Auto-Tune</td>
                <td>✓ Free</td>
                <td>✓ Free</td>
                <td className="highlight">✓ Free</td>
                <td>✓ Free</td>
              </tr>
              <tr>
                <td>Key Finder</td>
                <td>✓ Free</td>
                <td>✓ Free</td>
                <td className="highlight">✓ Free</td>
                <td>✓ Free</td>
              </tr>
              <tr>
                <td>Audio-to-MIDI</td>
                <td>✓ Free</td>
                <td>✓ Free</td>
                <td className="highlight">✓ Free</td>
                <td>✓ Free</td>
              </tr>
              <tr>
                <td>Beat Detection</td>
                <td>✓ Free</td>
                <td>✓ Free</td>
                <td className="highlight">✓ Free</td>
                <td>✓ Free</td>
              </tr>
              <tr>
                <td>Background Removal</td>
                <td>✓ Free</td>
                <td>✓ Free</td>
                <td className="highlight">✓ Free</td>
                <td>✓ Free</td>
              </tr>
              <tr>
                <td>Scene Detection</td>
                <td>✓ Free</td>
                <td>✓ Free</td>
                <td className="highlight">✓ Free</td>
                <td>✓ Free</td>
              </tr>
              <tr>
                <td>Motion Tracking</td>
                <td>✓ Free</td>
                <td>✓ Free</td>
                <td className="highlight">✓ Free</td>
                <td>✓ Free</td>
              </tr>
              <tr>
                <td>Audio Ducking</td>
                <td>✓ Free</td>
                <td>✓ Free</td>
                <td className="highlight">✓ Free</td>
                <td>✓ Free</td>
              </tr>
              <tr>
                <td>Silence Detection</td>
                <td>✓ Free</td>
                <td>✓ Free</td>
                <td className="highlight">✓ Free</td>
                <td>✓ Free</td>
              </tr>

              {/* Video Editing */}
              <tr className="category-header">
                <td colSpan="5">🎬 Video Editing</td>
              </tr>
              <tr>
                <td>All Tools & Effects</td>
                <td>✓</td>
                <td>✓</td>
                <td className="highlight">✓</td>
                <td>✓</td>
              </tr>
              <tr>
                <td>Max Export Quality</td>
                <td>1080p</td>
                <td>1080p</td>
                <td className="highlight">4K</td>
                <td>8K</td>
              </tr>
              <tr>
                <td>Watermark</td>
                <td>Yes</td>
                <td>No</td>
                <td className="highlight">No</td>
                <td>No</td>
              </tr>
              <tr>
                <td>Projects / Tracks</td>
                <td>5 / 4</td>
                <td>15 / 8</td>
                <td className="highlight">∞ / 24</td>
                <td>∞ / 50</td>
              </tr>
              <tr>
                <td>Storage</td>
                <td>5GB</td>
                <td>25GB</td>
                <td className="highlight">100GB</td>
                <td>Unlimited</td>
              </tr>
              <tr>
                <td>Max Export Length</td>
                <td>10 min</td>
                <td>60 min</td>
                <td className="highlight">Unlimited</td>
                <td>Unlimited</td>
              </tr>
              <tr>
                <td>Collaboration</td>
                <td>✗</td>
                <td>✗</td>
                <td className="highlight">8 people</td>
                <td>Unlimited</td>
              </tr>

              {/* Recording Studio */}
              <tr className="category-header">
                <td colSpan="5">🎚️ Recording Studio</td>
              </tr>
              <tr>
                <td>Recording Studio Tracks</td>
                <td>4</td>
                <td>8</td>
                <td className="highlight">16</td>
                <td>32</td>
              </tr>
              <tr>
                <td>Effects Chain (EQ, Comp, Reverb, etc.)</td>
                <td>✓</td>
                <td>✓</td>
                <td className="highlight">✓</td>
                <td>✓</td>
              </tr>
              <tr>
                <td>Arranger View</td>
                <td>✓</td>
                <td>✓</td>
                <td className="highlight">✓</td>
                <td>✓</td>
              </tr>

              {/* Premium AI Features */}
              <tr className="category-header">
                <td colSpan="5">🤖 Premium AI Features</td>
              </tr>
              <tr>
                <td>AI Mastering</td>
                <td>✗</td>
                <td>3/month</td>
                <td className="highlight">15/month</td>
                <td>Unlimited</td>
              </tr>
              <tr>
                <td>Smart Auto-Detect</td>
                <td>✗</td>
                <td>✓</td>
                <td className="highlight">✓</td>
                <td>✓</td>
              </tr>
              <tr>
                <td>50 Genre Profiles</td>
                <td>✗</td>
                <td>✓</td>
                <td className="highlight">✓</td>
                <td>✓</td>
              </tr>
              <tr>
                <td>AI Mix Assistant</td>
                <td>✗</td>
                <td>✓ (Browser)</td>
                <td className="highlight">✓ (Browser)</td>
                <td>✓ (Browser + Server)</td>
              </tr>
              <tr>
                <td>AI Radio DJ</td>
                <td>✗</td>
                <td>✗</td>
                <td className="highlight">7 personas</td>
                <td>Unlimited</td>
              </tr>
              <tr>
                <td>AI Voice Cloning</td>
                <td>✗</td>
                <td>✗</td>
                <td className="highlight">✗</td>
                <td>✓</td>
              </tr>

              {/* Clips */}
              <tr className="category-header">
                <td colSpan="5">📱 Clips</td>
              </tr>
              <tr>
                <td>Clips Per Day</td>
                <td>3</td>
                <td>20</td>
                <td className="highlight">Unlimited</td>
                <td>Unlimited</td>
              </tr>
              <tr>
                <td>Max Clip Duration</td>
                <td>60 sec</td>
                <td>3 min</td>
                <td className="highlight">10 min</td>
                <td>Unlimited</td>
              </tr>
              <tr>
                <td>Premium Music</td>
                <td>✗</td>
                <td>✓</td>
                <td className="highlight">✓</td>
                <td>✓</td>
              </tr>

              {/* Streaming */}
              <tr className="category-header">
                <td colSpan="5">📺 Live Streaming</td>
              </tr>
              <tr>
                <td>Live Streaming</td>
                <td>✗</td>
                <td>720p</td>
                <td className="highlight">4K</td>
                <td>4K</td>
              </tr>
              <tr>
                <td>Max Duration</td>
                <td>—</td>
                <td>4 hours</td>
                <td className="highlight">12 hours</td>
                <td>Unlimited</td>
              </tr>
              <tr>
                <td>Max Viewers</td>
                <td>—</td>
                <td>100</td>
                <td className="highlight">1,000</td>
                <td>Unlimited</td>
              </tr>
              <tr>
                <td>Simulcast</td>
                <td>✗</td>
                <td>✗</td>
                <td className="highlight">✗</td>
                <td>5 destinations</td>
              </tr>

              {/* Podcasts & Radio */}
              <tr className="category-header">
                <td colSpan="5">🎙️ Podcasts & Radio</td>
              </tr>
              <tr>
                <td>Podcast Episodes</td>
                <td>✗</td>
                <td>5</td>
                <td className="highlight">Unlimited</td>
                <td>Unlimited</td>
              </tr>
              <tr>
                <td>Radio Stations</td>
                <td>✗</td>
                <td>1</td>
                <td className="highlight">3</td>
                <td>Unlimited</td>
              </tr>
              <tr>
                <td>Auto-DJ</td>
                <td>✗</td>
                <td>✗</td>
                <td className="highlight">✓</td>
                <td>✓</td>
              </tr>

              {/* Gaming */}
              <tr className="category-header">
                <td colSpan="5">🎮 Gaming Features</td>
              </tr>
              <tr>
                <td>Gaming Community</td>
                <td>✓</td>
                <td>✓</td>
                <td className="highlight">✓</td>
                <td>✓</td>
              </tr>
              <tr>
                <td>Squad Finder</td>
                <td>✓</td>
                <td>✓</td>
                <td className="highlight">✓</td>
                <td>✓</td>
              </tr>
              <tr>
                <td>Team Rooms</td>
                <td>1</td>
                <td>3</td>
                <td className="highlight">10</td>
                <td>Unlimited</td>
              </tr>
              <tr>
                <td>Gaming Analytics</td>
                <td>✗</td>
                <td>✓</td>
                <td className="highlight">✓</td>
                <td>✓</td>
              </tr>
              <tr>
                <td>Game Streaming</td>
                <td>✗</td>
                <td>✗</td>
                <td className="highlight">✓</td>
                <td>✓ + Cloud</td>
              </tr>
              <tr>
                <td>Gaming Monetization</td>
                <td>✗</td>
                <td>✗</td>
                <td className="highlight">✓</td>
                <td>✓</td>
              </tr>

              {/* Cross-Posting */}
              <tr className="category-header">
                <td colSpan="5">🔗 Cross-Posting</td>
              </tr>
              <tr>
                <td>Platforms</td>
                <td>YouTube</td>
                <td>3 platforms</td>
                <td className="highlight">8 platforms</td>
                <td>All platforms</td>
              </tr>
              <tr>
                <td>Posts Per Day</td>
                <td>1</td>
                <td>5</td>
                <td className="highlight">10</td>
                <td>Unlimited</td>
              </tr>

              {/* Music Distribution */}
              <tr className="category-header">
                <td colSpan="5">🎵 Music Distribution</td>
              </tr>
              <tr>
                <td>Distribute to Spotify, Apple, etc.</td>
                <td>✗</td>
                <td>✗</td>
                <td className="highlight">✗</td>
                <td>✓ (Included!)</td>
              </tr>
              <tr>
                <td>Royalty Rate</td>
                <td>—</td>
                <td>—</td>
                <td className="highlight">—</td>
                <td>90%</td>
              </tr>

              {/* Monetization */}
              <tr className="category-header">
                <td colSpan="5">💰 Monetization</td>
              </tr>
              <tr>
                <td>Receive Tips</td>
                <td>✓</td>
                <td>✓</td>
                <td className="highlight">✓</td>
                <td>✓</td>
              </tr>
              <tr>
                <td>Earnings Rate</td>
                <td>90%</td>
                <td>90%</td>
                <td className="highlight">90%</td>
                <td>90%</td>
              </tr>

              {/* Support */}
              <tr className="category-header">
                <td colSpan="5">⚡ Support & Extras</td>
              </tr>
              <tr>
                <td>Support Level</td>
                <td>Community</td>
                <td>Email</td>
                <td className="highlight">Priority</td>
                <td>24/7 Priority</td>
              </tr>
              <tr>
                <td>Export Priority</td>
                <td>Standard</td>
                <td>Standard</td>
                <td className="highlight">Fast</td>
                <td>Priority Queue</td>
              </tr>
              <tr>
                <td>Early Access</td>
                <td>✗</td>
                <td>✗</td>
                <td className="highlight">✗</td>
                <td>✓</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* ================================================================== */}
      {/* FAQ SECTION */}
      {/* ================================================================== */}
      <div className="pricing-faq">
        <h2>❓ Frequently Asked Questions</h2>

        <div className="faq-grid">
          <div className="faq-item">
            <h3>Can I upgrade or downgrade anytime?</h3>
            <p>Yes! Change your plan anytime. Upgrades take effect immediately, downgrades at the end of your billing cycle.</p>
          </div>

          <div className="faq-item">
            <h3>What payment methods do you accept?</h3>
            <p>All major credit cards, debit cards, and PayPal through our secure Stripe payment processor.</p>
          </div>

          <div className="faq-item">
            <h3>Do I need a distribution plan if I'm Pro?</h3>
            <p>No! Pro already includes full music distribution. The Artist/Label plans are for users who only need distribution without other creator features.</p>
          </div>

          <div className="faq-item">
            <h3>What are AI Credits?</h3>
            <p>AI Credits power premium AI features like video generation, voice cloning, auto-captions, and content generation. Each paid plan includes monthly credits that reset every 30 days — Starter gets 50, Creator gets 200, and Pro gets 1,000. Many AI tools like stem separation, pitch correction, key finder, beat detection, audio-to-MIDI, background removal, and motion tracking are completely free and never use credits.</p>
          </div>

          <div className="faq-item">
            <h3>Can I buy more AI Credits?</h3>
            <p>Yes! Paid subscribers can purchase credit packs anytime starting at $4.99 for 25 credits, up to $49.99 for 500 credits. Purchased credits never expire and stack on top of your monthly allotment.</p>
          </div>

          <div className="faq-item">
            <h3>Which AI features are free?</h3>
            <p>AI Stem Separation, Pitch Correction, Key Finder, Audio-to-MIDI, Beat Detection, Vocal Tuner, Background Removal, Scene Detection, Motion Tracking, Audio Ducking, Silence Detection, and Thumbnail Extraction are all completely free on every plan with no limits. These run locally and don't require paid APIs.</p>
          </div>

          <div className="faq-item">
            <h3>What's included in gaming features?</h3>
            <p>Squad Finder, Team Rooms, gaming analytics, game streaming integration, and monetization tools for gaming content.</p>
          </div>

          <div className="faq-item">
            <h3>How does 90% creator earnings work?</h3>
            <p>You keep 90% of tips and subscriptions. We only take 10% for processing. External payments (CashApp, Venmo) go 100% to you!</p>
          </div>

          <div className="faq-item">
            <h3>Can I cancel anytime?</h3>
            <p>Yes, cancel anytime with no fees. Keep access until the end of your billing period.</p>
          </div>

          <div className="faq-item">
            <h3>What happens to my content if I downgrade?</h3>
            <p>Your content stays safe! You just won't be able to upload more until you're within your new plan's limits.</p>
          </div>

          <div className="faq-item">
            <h3>Is there a free trial?</h3>
            <p>Starter has a 7-day trial, Creator has 14 days, and Pro has a full 30-day trial. Cancel anytime during the trial.</p>
          </div>

          <div className="faq-item">
            <h3>What is AI Mastering?</h3>
            <p>AI Mastering uses professional DSP signal chains, adaptive reference matching, and smart auto-detection to master your tracks to studio quality. It analyzes BPM, key, mood, and frequency balance to pick the perfect mastering preset.</p>
          </div>

          <div className="faq-item">
            <h3>What is AI Radio DJ?</h3>
            <p>AI Radio DJ generates realistic voice breaks for your radio stations using AI personas. Pro users can clone their own voice to create a custom DJ that sounds like them.</p>
          </div>

          <div className="faq-item">
            <h3>What is the AI Mix Assistant?</h3>
            <p>The AI Mix Assistant analyzes every track in your Recording Studio session — volume levels, panning, EQ conflicts, compression needs, and clipping risk. It gives per-track suggestions you can apply with one click. Pro users get deeper server-side analysis powered by librosa.</p>
          </div>

          <div className="faq-item">
            <h3>What is the Recording Studio?</h3>
            <p>A full multi-track DAW (Digital Audio Workstation) in your browser. Record audio, import files, add effects (EQ, compression, reverb, delay, distortion, filters), arrange regions on a timeline, and bounce to a final mix. Track limits scale with your plan: 4 (Free), 8 (Starter), 16 (Creator), 32 (Pro).</p>
          </div>

          <div className="faq-item">
            <h3>What is AI Stem Separation?</h3>
            <p>AI Stem Separation uses Meta's Demucs AI to split any song into individual stems — vocals, drums, bass, and instruments. Choose 4-stem or 6-stem mode (which also separates guitar and piano). It's completely free on every plan with no limits. Perfect for remixing, sampling, karaoke, or isolating parts for practice.</p>
          </div>
        </div>
      </div>

      {/* ================================================================== */}
      {/* CTA SECTION */}
      {/* ================================================================== */}
      <div className="pricing-cta">
        <h2>Ready to create?</h2>
        <p>Join thousands of creators building their audience on StreamPireX</p>
        <button
          className="cta-button"
          onClick={() => navigate('/signup')}
        >
          🚀 Start Creating for Free
        </button>
      </div>
    </div>
  );
};

export default PricingPlans;