// src/front/js/pages/SubscriptionSuccess.js
// =============================================================================
// POST-CHECKOUT SUCCESS PAGE
// Distribution plans → SonoSuite Dashboard (SSO redirect)
// Regular plans → Creator Dashboard
// =============================================================================

import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import '../../styles/SubscriptionSuccess.css';

const SubscriptionSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // State
  const [status, setStatus] = useState('loading'); // loading | success | error
  const [planInfo, setPlanInfo] = useState(null);
  const [redirecting, setRedirecting] = useState(false);

  // URL params from Stripe success_url
  const sessionId = searchParams.get('session_id');
  const planType = searchParams.get('plan_type'); // 'distribution' or 'regular'

  const isDistribution = planType === 'distribution';
  const backendUrl = process.env.REACT_APP_BACKEND_URL;

  // ==========================================================================
  // VERIFY CHECKOUT SESSION ON MOUNT
  // ==========================================================================
  useEffect(() => {
    if (sessionId) {
      verifySession();
    } else {
      // No session ID but still show success (Stripe already charged)
      setStatus('success');
    }
  }, [sessionId]);

  const verifySession = async () => {
    try {
      const token = localStorage.getItem('token');

      const response = await fetch(
        `${backendUrl}/api/subscriptions/verify-session?session_id=${sessionId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setPlanInfo(data);
      }
      // Always show success — Stripe already processed the payment
      setStatus('success');

    } catch (error) {
      console.error('Session verification error:', error);
      // Don't show error — payment already went through
      setStatus('success');
    }
  };

  // ==========================================================================
  // CONTINUE BUTTON HANDLER
  // ==========================================================================
  const handleContinue = async () => {
    if (isDistribution) {
      // ── DISTRIBUTION PLAN → Try SonoSuite SSO, fallback to /music-distribution ──
      setRedirecting(true);
      try {
        const token = localStorage.getItem('token');

        const response = await fetch(
          `${backendUrl}/api/sonosuite/redirect?return_to=${encodeURIComponent('/albums')}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );

        const data = await response.json();

        if (response.ok && data.redirect_url) {
          // SSO redirect to SonoSuite dashboard
          window.location.href = data.redirect_url;
        } else {
          // SonoSuite not connected yet — go to music distribution page to connect first
          console.warn('SonoSuite redirect failed:', data.error);
          navigate('/music-distribution');
        }
      } catch (err) {
        console.error('SonoSuite redirect error:', err);
        navigate('/music-distribution');
      } finally {
        setRedirecting(false);
      }
    } else {
      // ── REGULAR PLAN → Creator Dashboard ──
      navigate('/dashboard');
    }
  };

  // ==========================================================================
  // LOADING STATE
  // ==========================================================================
  if (status === 'loading') {
    return (
      <div className="subscription-success-page">
        <div className="subscription-success-card">
          <div className="loading-pulse">
            <div className="pulse-ring"></div>
            <span className="pulse-icon">⚡</span>
          </div>
          <h1>Confirming your payment...</h1>
          <p className="subtitle">This will only take a moment.</p>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // ERROR STATE
  // ==========================================================================
  if (status === 'error') {
    return (
      <div className="subscription-success-page">
        <div className="subscription-success-card error">
          <div className="status-icon">⚠️</div>
          <h1>Something went wrong</h1>
          <p className="subtitle">
            We couldn't verify your payment. If you were charged, your plan will activate shortly.
          </p>
          <div className="success-actions">
            <button onClick={() => navigate('/pricing')} className="btn-primary">
              Back to Pricing
            </button>
            <button onClick={() => navigate('/dashboard')} className="btn-secondary">
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // SUCCESS STATE
  // ==========================================================================
  return (
    <div className="subscription-success-page">
      <div className="subscription-success-card">

        {/* Animated Checkmark */}
        <div className="success-animation">
          <div className="check-circle">
            <svg className="checkmark" viewBox="0 0 52 52">
              <circle className="checkmark-circle" cx="26" cy="26" r="25" fill="none" />
              <path className="checkmark-check" fill="none" d="m14.1 27.2 7.1 7.2 16.7-16.8" />
            </svg>
          </div>
          <div className="confetti-burst">
            <span>🎉</span>
            <span>✨</span>
            <span>🎊</span>
          </div>
        </div>

        {/* Title */}
        <h1>
          {isDistribution ? (
            <>Welcome to <span className="plan-highlight">Music Distribution</span>!</>
          ) : (
            <>You're all set, <span className="plan-highlight">
              {planInfo?.plan_name || 'Creator'}
            </span>!</>
          )}
        </h1>

        {/* Subtitle */}
        <p className="subtitle">
          {isDistribution
            ? "Your music distribution plan is now active. Distribute your music to Spotify, Apple Music, and 150+ platforms worldwide."
            : "Your subscription is now active. Start creating and growing your audience today."
          }
        </p>

        {/* Unlocked Features Grid */}
        <div className="unlocked-features">
          {isDistribution ? (
            <>
              <div className="feature-item">
                <span className="feature-icon">🌍</span> Global Distribution
              </div>
              <div className="feature-item">
                <span className="feature-icon">🎵</span> Spotify & Apple Music
              </div>
              <div className="feature-item">
                <span className="feature-icon">💰</span> 100% Royalties
              </div>
              <div className="feature-item">
                <span className="feature-icon">📊</span> Analytics Dashboard
              </div>
              <div className="feature-item">
                <span className="feature-icon">🎧</span> Unlimited Releases
              </div>
              <div className="feature-item">
                <span className="feature-icon">⚡</span> 24-48hr Distribution
              </div>
            </>
          ) : (
            <>
              <div className="feature-item">
                <span className="feature-icon">🎙️</span> Podcasting
              </div>
              <div className="feature-item">
                <span className="feature-icon">📹</span> Video Streaming
              </div>
              <div className="feature-item">
                <span className="feature-icon">📻</span> Radio Stations
              </div>
              <div className="feature-item">
                <span className="feature-icon">🛒</span> Marketplace
              </div>
              <div className="feature-item">
                <span className="feature-icon">🎮</span> Gaming Community
              </div>
              <div className="feature-item">
                <span className="feature-icon">💬</span> Social Features
              </div>
            </>
          )}
        </div>

        {/* CTA Buttons */}
        <div className="success-actions">
          <button
            onClick={handleContinue}
            className="btn-primary"
            disabled={redirecting}
          >
            {redirecting
              ? '🔄 Redirecting to SonoSuite...'
              : isDistribution
                ? '🎵 Open SonoSuite Dashboard'
                : '🚀 Go to Creator Dashboard'
            }
          </button>

          {isDistribution ? (
            <Link to="/music-distribution" className="btn-secondary">
              Music Distribution Settings
            </Link>
          ) : (
            <Link to="/profile" className="btn-secondary">
              View Profile
            </Link>
          )}
        </div>

        {/* Receipt Note */}
        <p className="receipt-note">
          A receipt has been sent to your email.{' '}
          <Link to="/settings" className="inline-link">Manage subscription</Link>
        </p>
      </div>
    </div>
  );
};

export default SubscriptionSuccess;