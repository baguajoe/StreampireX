// =============================================================================
// PricingPage.jsx - Complete 3-Tier + Distribution Plans
// =============================================================================
// Includes: Gaming Features, Artist Distribution, Label Distribution
// =============================================================================

import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Context } from '../store/appContext';
import './PricingPage.css';

const PricingPage = () => {
  const { store } = useContext(Context);
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [showComparison, setShowComparison] = useState(false);
  const [currentPlan, setCurrentPlan] = useState(null);
  const [processing, setProcessing] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Creator Plan Pricing
  const pricing = {
    free: { monthly: 0, yearly: 0 },
    basic: { monthly: 12.99, yearly: 129.99 },
    premium: { monthly: 29.99, yearly: 299.99 },
  };

  // Distribution Plan Pricing (yearly only)
  const distributionPricing = {
    artist: 21.99,
    label: 74.99,
  };

  // Fetch current plan on mount
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
      
      // Map distribution plan IDs
      let planId = tier;
      if (tier === 'artist-distribution') {
        planId = 'standalone-artist';
      } else if (tier === 'label-distribution') {
        planId = 'standalone-label';
      }
      
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

  return (
    <div className="pricing-page">
      {/* Header */}
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

      {/* Value Proposition Banner */}
      <div className="value-banner">
        <h2>🎬 The All-in-One Creator Platform</h2>
        <p>Replace 15+ tools with one platform. Video editing, streaming, gaming, music distribution, and more.</p>
        <div className="value-stats">
          <div className="stat">
            <span className="stat-value">90%</span>
            <span className="stat-label">Creator Earnings</span>
          </div>
          <div className="stat">
            <span className="stat-value">50+</span>
            <span className="stat-label">Distribution Platforms</span>
          </div>
          <div className="stat">
            <span className="stat-value">$0</span>
            <span className="stat-label">To Start Creating</span>
          </div>
        </div>
      </div>

      {/* ==================== CREATOR PLANS ==================== */}
      <div className="pricing-section">
        <h2 className="section-title">🎨 Creator Plans</h2>
        <p className="section-subtitle">Full access to video editing, streaming, gaming, and monetization</p>
        
        <div className="pricing-cards">
          
          {/* ==================== FREE TIER ==================== */}
          <div className={`pricing-card free ${isCurrentPlan('free') ? 'current' : ''}`}>
            {isCurrentPlan('free') && <div className="current-badge">Current Plan</div>}
            
            <div className="card-header">
              <h2>Free</h2>
              <p className="card-subtitle">For hobbyists & beginners</p>
            </div>
            
            <div className="card-price">
              <span className="price">$0</span>
              <span className="period">forever</span>
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

          {/* ==================== BASIC TIER ==================== */}
          <div className={`pricing-card basic ${isCurrentPlan('basic') ? 'current' : ''}`}>
            {isCurrentPlan('basic') && <div className="current-badge">Current Plan</div>}
            
            <div className="card-header">
              <h2>Basic</h2>
              <p className="card-subtitle">For growing creators</p>
            </div>
            
            <div className="card-price">
              <span className="price">${getMonthlyEquivalent('basic')}</span>
              <span className="period">/month</span>
              {billingCycle === 'yearly' && (
                <>
                  <span className="billed-yearly">Billed ${getPrice('basic')}/year</span>
                  <span className="yearly-savings">Save ${getYearlySavings('basic')}</span>
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
                <span><strong>4K export, no watermark!</strong></span>
              </li>
              <li className="feature included">
                <span className="icon">✓</span>
                <span>25 projects, 8 tracks, 60 min exports</span>
              </li>
              <li className="feature included">
                <span className="icon">✓</span>
                <span>25GB storage</span>
              </li>
              
              {/* Clips */}
              <li className="feature included">
                <span className="icon">📱</span>
                <span>20 clips/day (3 min max)</span>
              </li>
              
              {/* Streaming */}
              <li className="feature included highlight">
                <span className="icon">📺</span>
                <span><strong>Live Streaming</strong> (4 hrs, 1080p)</span>
              </li>
              
              {/* Cross-posting */}
              <li className="feature included">
                <span className="icon">🔗</span>
                <span>Cross-post to 3 platforms (5/day)</span>
              </li>
              
              {/* Gaming */}
              <li className="feature included highlight">
                <span className="icon">🎮</span>
                <span><strong>Team Rooms</strong></span>
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
            </ul>

            <button 
              className="select-plan-btn"
              onClick={() => handleSelectPlan('basic')}
              disabled={processing === 'basic' || isCurrentPlan('basic')}
            >
              {processing === 'basic' ? (
                <span className="btn-loading">
                  <span className="spinner"></span> Processing...
                </span>
              ) : isCurrentPlan('basic') ? '✅ Current Plan' : 'Start Basic'}
            </button>
          </div>

          {/* ==================== PREMIUM TIER ==================== */}
          <div className={`pricing-card premium popular ${isCurrentPlan('premium') ? 'current' : ''}`}>
            <div className="popular-badge">🔥 Most Popular</div>
            {isCurrentPlan('premium') && <div className="current-badge">Current Plan</div>}
            
            <div className="card-header">
              <h2>Premium</h2>
              <p className="card-subtitle">For serious creators</p>
            </div>
            
            <div className="card-price">
              <span className="price">${getMonthlyEquivalent('premium')}</span>
              <span className="period">/month</span>
              {billingCycle === 'yearly' && (
                <>
                  <span className="billed-yearly">Billed ${getPrice('premium')}/year</span>
                  <span className="yearly-savings">Save ${getYearlySavings('premium')}</span>
                </>
              )}
            </div>

            <ul className="features-list">
              <li className="feature included highlight">
                <span className="icon">⬆️</span>
                <span><strong>Everything in Basic, plus:</strong></span>
              </li>
              
              {/* Video Editing */}
              <li className="feature included">
                <span className="icon">🎬</span>
                <span><strong>Unlimited</strong> projects & exports</span>
              </li>
              <li className="feature included">
                <span className="icon">✓</span>
                <span>24 tracks, 150GB storage</span>
              </li>
              <li className="feature included">
                <span className="icon">✓</span>
                <span>Collaborate with 5 people</span>
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
                <span>Simulcast to 5 destinations</span>
              </li>
              
              {/* Cross-posting */}
              <li className="feature included">
                <span className="icon">🔗</span>
                <span>Cross-post to <strong>ALL 7 platforms</strong></span>
              </li>
              
              {/* Gaming */}
              <li className="feature included highlight">
                <span className="icon">🎮</span>
                <span><strong>Game Streaming & Monetization</strong></span>
              </li>
              
              {/* Music Distribution */}
              <li className="feature included special">
                <span className="icon">🎵</span>
                <span><strong>Music Distribution</strong> (90% royalties)</span>
              </li>
              
              {/* Support */}
              <li className="feature included">
                <span className="icon">⚡</span>
                <span>Priority export queue & support</span>
              </li>
            </ul>

            <button 
              className="select-plan-btn primary"
              onClick={() => handleSelectPlan('premium')}
              disabled={processing === 'premium' || isCurrentPlan('premium')}
            >
              {processing === 'premium' ? (
                <span className="btn-loading">
                  <span className="spinner"></span> Processing...
                </span>
              ) : isCurrentPlan('premium') ? '✅ Current Plan' : 'Go Premium'}
            </button>
          </div>
        </div>
      </div>

      {/* ==================== MUSIC DISTRIBUTION PLANS ==================== */}
      <div className="pricing-section distribution-section">
        <h2 className="section-title">🎵 Music Distribution Plans</h2>
        <p className="section-subtitle">Distribute your music globally to 150+ platforms. Annual billing only.</p>
        
        <div className="distribution-cards">
          
          {/* Artist Distribution */}
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

          {/* Label Distribution */}
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
          <p>💡 <strong>Premium creators</strong> already have music distribution included! These standalone plans are for users who only need distribution.</p>
        </div>
      </div>

      {/* Creator Earnings Highlight */}
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

      {/* Comparison Toggle */}
      <div className="comparison-toggle">
        <button onClick={() => setShowComparison(!showComparison)}>
          {showComparison ? 'Hide' : 'Show'} Full Feature Comparison
          <span className={`arrow ${showComparison ? 'up' : 'down'}`}>▼</span>
        </button>
      </div>

      {/* Feature Comparison Table */}
      {showComparison && (
        <div className="comparison-table-wrapper">
          <table className="comparison-table">
            <thead>
              <tr>
                <th>Feature</th>
                <th>Free</th>
                <th>Basic</th>
                <th className="highlight">Premium</th>
              </tr>
            </thead>
            <tbody>
              {/* Pricing */}
              <tr className="category-header">
                <td colSpan="4">💳 Pricing</td>
              </tr>
              <tr>
                <td>Monthly Price</td>
                <td>$0</td>
                <td>$12.99</td>
                <td className="highlight">$29.99</td>
              </tr>
              <tr>
                <td>Yearly Price</td>
                <td>$0</td>
                <td>$129.99</td>
                <td className="highlight">$299.99</td>
              </tr>

              {/* Video Editing */}
              <tr className="category-header">
                <td colSpan="4">🎬 Video Editing</td>
              </tr>
              <tr>
                <td>All Tools & Effects</td>
                <td>✓</td>
                <td>✓</td>
                <td className="highlight">✓</td>
              </tr>
              <tr>
                <td>Max Export Quality</td>
                <td>1080p</td>
                <td>4K</td>
                <td className="highlight">4K</td>
              </tr>
              <tr>
                <td>Watermark</td>
                <td>Yes</td>
                <td>No</td>
                <td className="highlight">No</td>
              </tr>
              <tr>
                <td>Projects / Tracks</td>
                <td>5 / 4</td>
                <td>25 / 8</td>
                <td className="highlight">∞ / 24</td>
              </tr>
              <tr>
                <td>Storage</td>
                <td>5GB</td>
                <td>25GB</td>
                <td className="highlight">150GB</td>
              </tr>
              <tr>
                <td>Max Export Length</td>
                <td>10 min</td>
                <td>60 min</td>
                <td className="highlight">Unlimited</td>
              </tr>
              <tr>
                <td>Collaboration</td>
                <td>✗</td>
                <td>✗</td>
                <td className="highlight">5 people</td>
              </tr>

              {/* Clips */}
              <tr className="category-header">
                <td colSpan="4">📱 Clips</td>
              </tr>
              <tr>
                <td>Clips Per Day</td>
                <td>3</td>
                <td>20</td>
                <td className="highlight">Unlimited</td>
              </tr>
              <tr>
                <td>Max Clip Duration</td>
                <td>60 sec</td>
                <td>3 min</td>
                <td className="highlight">10 min</td>
              </tr>
              <tr>
                <td>Premium Music</td>
                <td>✗</td>
                <td>✓</td>
                <td className="highlight">✓</td>
              </tr>

              {/* Streaming */}
              <tr className="category-header">
                <td colSpan="4">📺 Live Streaming</td>
              </tr>
              <tr>
                <td>Live Streaming</td>
                <td>✗</td>
                <td>✓</td>
                <td className="highlight">✓</td>
              </tr>
              <tr>
                <td>Max Quality</td>
                <td>—</td>
                <td>1080p</td>
                <td className="highlight">4K</td>
              </tr>
              <tr>
                <td>Max Duration</td>
                <td>—</td>
                <td>4 hours</td>
                <td className="highlight">12 hours</td>
              </tr>
              <tr>
                <td>Simulcast</td>
                <td>✗</td>
                <td>✗</td>
                <td className="highlight">5 destinations</td>
              </tr>

              {/* Gaming */}
              <tr className="category-header">
                <td colSpan="4">🎮 Gaming Features</td>
              </tr>
              <tr>
                <td>Gaming Community</td>
                <td>✓</td>
                <td>✓</td>
                <td className="highlight">✓</td>
              </tr>
              <tr>
                <td>Squad Finder</td>
                <td>✓</td>
                <td>✓</td>
                <td className="highlight">✓</td>
              </tr>
              <tr>
                <td>Team Rooms</td>
                <td>✗</td>
                <td>✓</td>
                <td className="highlight">✓</td>
              </tr>
              <tr>
                <td>Gaming Analytics</td>
                <td>✗</td>
                <td>✓</td>
                <td className="highlight">✓</td>
              </tr>
              <tr>
                <td>Game Streaming</td>
                <td>✗</td>
                <td>✗</td>
                <td className="highlight">✓</td>
              </tr>
              <tr>
                <td>Gaming Monetization</td>
                <td>✗</td>
                <td>✗</td>
                <td className="highlight">✓</td>
              </tr>

              {/* Cross-Posting */}
              <tr className="category-header">
                <td colSpan="4">🔗 Cross-Posting</td>
              </tr>
              <tr>
                <td>Platforms</td>
                <td>YouTube</td>
                <td>3 platforms</td>
                <td className="highlight">All 7</td>
              </tr>
              <tr>
                <td>Posts Per Day</td>
                <td>1</td>
                <td>5</td>
                <td className="highlight">Unlimited</td>
              </tr>

              {/* Music Distribution */}
              <tr className="category-header">
                <td colSpan="4">🎵 Music Distribution</td>
              </tr>
              <tr>
                <td>Distribute to Spotify, Apple, etc.</td>
                <td>✗</td>
                <td>✗</td>
                <td className="highlight">✓ (Included!)</td>
              </tr>
              <tr>
                <td>Royalty Rate</td>
                <td>—</td>
                <td>—</td>
                <td className="highlight">90%</td>
              </tr>

              {/* Monetization */}
              <tr className="category-header">
                <td colSpan="4">💰 Monetization</td>
              </tr>
              <tr>
                <td>Receive Tips</td>
                <td>✓</td>
                <td>✓</td>
                <td className="highlight">✓</td>
              </tr>
              <tr>
                <td>Earnings Rate</td>
                <td>90%</td>
                <td>90%</td>
                <td className="highlight">90%</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* FAQ Section */}
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
            <h3>Do I need a distribution plan if I'm Premium?</h3>
            <p>No! Premium already includes full music distribution. The Artist/Label plans are for users who only need distribution without other creator features.</p>
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
        </div>
      </div>

      {/* CTA Section */}
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

export default PricingPage;