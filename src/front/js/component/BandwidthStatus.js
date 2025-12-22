// src/front/js/component/BandwidthStatus.js
// Bandwidth Status Component for Dashboard

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import '../../styles/BandwidthStatus.css';

const BandwidthStatus = ({ compact = false }) => {
  const [bandwidth, setBandwidth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchBandwidthStatus();
  }, []);

  const fetchBandwidthStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/user/bandwidth`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setBandwidth(data.bandwidth);
      } else {
        setError('Failed to load bandwidth info');
      }
    } catch (err) {
      console.error('Error fetching bandwidth:', err);
      setError('Unable to connect to server');
    } finally {
      setLoading(false);
    }
  };

  const getProgressBarClass = (percentage) => {
    if (percentage >= 100) return 'progress-bar over-limit';
    if (percentage >= 90) return 'progress-bar critical';
    if (percentage >= 75) return 'progress-bar warning';
    return 'progress-bar ok';
  };

  const getQualityBadge = (quality) => {
    const badges = {
      '360p': { label: 'SD', class: 'quality-sd' },
      '480p': { label: 'SD+', class: 'quality-sd' },
      '720p': { label: 'HD', class: 'quality-hd' },
      '1080p': { label: 'FHD', class: 'quality-fhd' },
      '4k': { label: '4K', class: 'quality-4k' }
    };
    return badges[quality] || { label: quality, class: '' };
  };

  if (loading) {
    return (
      <div className={`bandwidth-status ${compact ? 'compact' : ''}`}>
        <div className="bandwidth-loading">
          <div className="spinner"></div>
          <span>Loading bandwidth info...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bandwidth-status ${compact ? 'compact' : ''} error`}>
        <span className="error-icon">⚠️</span>
        <span>{error}</span>
        <button onClick={fetchBandwidthStatus} className="retry-btn">Retry</button>
      </div>
    );
  }

  if (!bandwidth) return null;

  // Compact version
  if (compact) {
    return (
      <div className="bandwidth-status compact">
        <div className="bandwidth-compact-row">
          <span className="bandwidth-icon">📡</span>
          <div className="bandwidth-compact-info">
            <span className="bandwidth-label">Monthly</span>
            <span className="bandwidth-value">
              {bandwidth.monthly_used_display} / {bandwidth.monthly_limit_display}
            </span>
          </div>
        </div>
        <div className="bandwidth-progress-container">
          <div 
            className={getProgressBarClass(bandwidth.monthly_percentage)}
            style={{ width: `${Math.min(bandwidth.monthly_percentage, 100)}%` }}
          />
        </div>
        {!bandwidth.can_stream && (
          <Link to="/pricing" className="upgrade-link-compact">Upgrade</Link>
        )}
      </div>
    );
  }

  // Full version
  const qualityBadge = getQualityBadge(bandwidth.max_quality);

  return (
    <div className="bandwidth-status full">
      {/* Header */}
      <div className="bandwidth-header">
        <div className="bandwidth-title">
          <span className="bandwidth-icon-large">📡</span>
          <h3>Bandwidth ({bandwidth.tier_name} Plan)</h3>
        </div>
        <div className={`status-badge ${bandwidth.status_level}`}>
          {bandwidth.status_message}
        </div>
      </div>

      {/* Quality Badge */}
      <div className="quality-section">
        <div className="max-quality">
          <span className="quality-label">Max Streaming Quality</span>
          <span className={`quality-badge ${qualityBadge.class}`}>
            {qualityBadge.label}
          </span>
        </div>
        <div className="available-qualities">
          {bandwidth.available_qualities.map(q => (
            <span key={q} className={`quality-tag ${getQualityBadge(q).class}`}>
              {q}
            </span>
          ))}
        </div>
      </div>

      {/* Monthly Usage */}
      <div className="usage-section">
        <div className="usage-header">
          <span className="usage-icon">📅</span>
          <span className="usage-title">Monthly Bandwidth</span>
        </div>
        <div className="usage-stats">
          <div className="usage-numbers">
            <span className="used">{bandwidth.monthly_used_display}</span>
            <span className="separator">/</span>
            <span className="limit">{bandwidth.monthly_limit_display}</span>
          </div>
          <span className="usage-percentage">{bandwidth.monthly_percentage}%</span>
        </div>
        <div className="bandwidth-progress-container large">
          <div 
            className={getProgressBarClass(bandwidth.monthly_percentage)}
            style={{ width: `${Math.min(bandwidth.monthly_percentage, 100)}%` }}
          />
        </div>
        <div className="usage-remaining">
          Remaining: <strong>{bandwidth.monthly_remaining_display}</strong>
        </div>
      </div>

      {/* Daily Usage */}
      <div className="usage-section">
        <div className="usage-header">
          <span className="usage-icon">⏰</span>
          <span className="usage-title">Today's Usage</span>
        </div>
        <div className="daily-stats">
          <div className="daily-stat">
            <span className="stat-label">Bandwidth</span>
            <span className="stat-value">
              {bandwidth.daily_used_display} / {bandwidth.daily_limit_display}
            </span>
            <div className="mini-progress">
              <div 
                className={getProgressBarClass(bandwidth.daily_percentage)}
                style={{ width: `${Math.min(bandwidth.daily_percentage, 100)}%` }}
              />
            </div>
          </div>
          <div className="daily-stat">
            <span className="stat-label">Views</span>
            <span className="stat-value">
              {bandwidth.daily_views} / {bandwidth.daily_views_limit}
            </span>
            <div className="mini-progress">
              <div 
                className={getProgressBarClass(bandwidth.views_percentage)}
                style={{ width: `${Math.min(bandwidth.views_percentage, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="features-section">
        <h4>Your Features</h4>
        <div className="features-grid">
          <div className={`feature-item ${bandwidth.allow_download ? 'enabled' : 'disabled'}`}>
            <span className="feature-icon">{bandwidth.allow_download ? '✅' : '❌'}</span>
            <span>Downloads</span>
          </div>
          <div className={`feature-item ${bandwidth.allow_4k ? 'enabled' : 'disabled'}`}>
            <span className="feature-icon">{bandwidth.allow_4k ? '✅' : '❌'}</span>
            <span>4K Streaming</span>
          </div>
          <div className={`feature-item ${bandwidth.allow_live_streaming ? 'enabled' : 'disabled'}`}>
            <span className="feature-icon">{bandwidth.allow_live_streaming ? '✅' : '❌'}</span>
            <span>Live Streaming</span>
          </div>
          <div className="feature-item enabled">
            <span className="feature-icon">🔄</span>
            <span>{bandwidth.concurrent_streams} Streams</span>
          </div>
        </div>
      </div>

      {/* Warning */}
      {!bandwidth.can_stream && (
        <div className="bandwidth-alert over_limit">
          <p><strong>⛔ Bandwidth limit reached!</strong></p>
          <p>You won't be able to stream videos until your limits reset or you upgrade.</p>
          <div className="alert-actions">
            <Link to="/pricing" className="btn-upgrade">🚀 Upgrade Plan</Link>
          </div>
        </div>
      )}

      {bandwidth.can_stream && bandwidth.monthly_percentage >= 75 && (
        <div className={`bandwidth-alert ${bandwidth.monthly_percentage >= 90 ? 'critical' : 'warning'}`}>
          <p><strong>⚠️ Bandwidth running low</strong></p>
          <p>Consider upgrading to avoid interruptions.</p>
          <Link to="/pricing" className="btn-upgrade-small">Upgrade</Link>
        </div>
      )}

      {/* Tier Comparison */}
      <div className="tier-comparison">
        <h4>Bandwidth by Plan</h4>
        <div className="tier-grid">
          <div className={`tier-card ${bandwidth.tier === 'free' ? 'current' : ''}`}>
            <span className="tier-name">🆓 Free</span>
            <span className="tier-bandwidth">50 GB/mo</span>
            <span className="tier-quality">720p max</span>
          </div>
          <div className={`tier-card ${bandwidth.tier === 'pro' ? 'current' : ''}`}>
            <span className="tier-name">⭐ Pro</span>
            <span className="tier-bandwidth">500 GB/mo</span>
            <span className="tier-quality">1080p max</span>
          </div>
          <div className={`tier-card ${bandwidth.tier === 'premium' ? 'current' : ''}`}>
            <span className="tier-name">💎 Premium</span>
            <span className="tier-bandwidth">2 TB/mo</span>
            <span className="tier-quality">4K max</span>
          </div>
          <div className={`tier-card ${bandwidth.tier === 'professional' ? 'current' : ''}`}>
            <span className="tier-name">👑 Pro+</span>
            <span className="tier-bandwidth">Unlimited</span>
            <span className="tier-quality">4K max</span>
          </div>
        </div>
      </div>

      <button onClick={fetchBandwidthStatus} className="btn-refresh">
        🔄 Refresh Bandwidth Info
      </button>
    </div>
  );
};

export default BandwidthStatus;