// src/front/js/component/StorageStatus.js
// Storage Status Component for User Dashboard

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import '../../styles/StorageStatus.css';

const StorageStatus = ({ compact = false }) => {
  const [storage, setStorage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchStorageStatus();
  }, []);

  const fetchStorageStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/user/storage`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setStorage(data.storage);
      } else {
        setError('Failed to load storage info');
      }
    } catch (err) {
      console.error('Error fetching storage:', err);
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

  const getTierIcon = (tier) => {
    const icons = {
      'free': '🆓',
      'pro': '⭐',
      'premium': '💎',
      'professional': '👑'
    };
    return icons[tier] || '📦';
  };

  if (loading) {
    return (
      <div className={`storage-status ${compact ? 'compact' : ''}`}>
        <div className="storage-loading">
          <div className="spinner"></div>
          <span>Loading storage info...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`storage-status ${compact ? 'compact' : ''} error`}>
        <span className="error-icon">⚠️</span>
        <span>{error}</span>
        <button onClick={fetchStorageStatus} className="retry-btn">Retry</button>
      </div>
    );
  }

  if (!storage) return null;

  // Compact version for sidebar/header
  if (compact) {
    return (
      <div className="storage-status compact">
        <div className="storage-compact-header">
          <span className="storage-icon">📦</span>
          <span className="storage-text">
            {storage.used_display} / {storage.limit_display}
          </span>
        </div>
        <div className="storage-progress-container">
          <div 
            className={getProgressBarClass(storage.percentage_used)}
            style={{ width: `${Math.min(storage.percentage_used, 100)}%` }}
          />
        </div>
        {storage.percentage_used >= 90 && (
          <Link to="/pricing" className="upgrade-link-compact">Upgrade</Link>
        )}
      </div>
    );
  }

  // Full version for settings/dashboard
  return (
    <div className="storage-status full">
      <div className="storage-header">
        <div className="storage-title">
          <span className="tier-icon">{getTierIcon(storage.tier)}</span>
          <h3>Storage ({storage.tier_name} Plan)</h3>
        </div>
        <div className={`status-badge ${storage.status_level}`}>
          {storage.status_message}
        </div>
      </div>

      <div className="storage-main">
        <div className="storage-usage">
          <div className="usage-numbers">
            <span className="used">{storage.used_display}</span>
            <span className="separator">/</span>
            <span className="limit">{storage.limit_display}</span>
          </div>
          <div className="usage-percentage">{storage.percentage_used}% used</div>
        </div>

        <div className="storage-progress-container large">
          <div 
            className={getProgressBarClass(storage.percentage_used)}
            style={{ width: `${Math.min(storage.percentage_used, 100)}%` }}
          />
        </div>

        <div className="storage-remaining">
          <span className="remaining-label">Remaining:</span>
          <span className="remaining-value">{storage.remaining_display}</span>
        </div>
      </div>

      {/* Per-upload limit info */}
      <div className="per-upload-limit">
        <span className="limit-icon">📤</span>
        <span>Max file size per upload: <strong>{storage.per_upload_limit_display}</strong></span>
      </div>

      {/* Storage breakdown */}
      <div className="storage-breakdown">
        <h4>Storage Breakdown</h4>
        <div className="breakdown-grid">
          {Object.entries(storage.breakdown_display).map(([type, size]) => (
            <div key={type} className="breakdown-item">
              <span className="breakdown-icon">
                {type === 'videos' && '🎬'}
                {type === 'clips' && '✂️'}
                {type === 'audio' && '🎵'}
                {type === 'podcasts' && '🎙️'}
                {type === 'other' && '📁'}
              </span>
              <span className="breakdown-type">{type.charAt(0).toUpperCase() + type.slice(1)}</span>
              <span className="breakdown-size">{size}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Warning/Upgrade section */}
      {storage.percentage_used >= 75 && (
        <div className={`storage-alert ${storage.status_level}`}>
          {storage.percentage_used >= 100 ? (
            <>
              <p><strong>⚠️ You've exceeded your storage limit!</strong></p>
              <p>You won't be able to upload new content until you free up space or upgrade your plan.</p>
            </>
          ) : storage.percentage_used >= 90 ? (
            <>
              <p><strong>🔴 Storage almost full!</strong></p>
              <p>Consider upgrading to continue uploading without interruption.</p>
            </>
          ) : (
            <>
              <p><strong>🟡 Storage getting low</strong></p>
              <p>You're using more than 75% of your storage.</p>
            </>
          )}
          <div className="alert-actions">
            <Link to="/pricing" className="btn-upgrade">
              🚀 Upgrade Plan
            </Link>
            <Link to="/my-content" className="btn-manage">
              🗑️ Manage Content
            </Link>
          </div>
        </div>
      )}

      {/* Tier comparison */}
      <div className="tier-comparison">
        <h4>Storage by Plan</h4>
        <div className="tier-grid">
          <div className={`tier-card ${storage.tier === 'free' ? 'current' : ''}`}>
            <span className="tier-name">🆓 Free</span>
            <span className="tier-storage">5 GB</span>
            <span className="tier-upload">500 MB/file</span>
          </div>
          <div className={`tier-card ${storage.tier === 'pro' ? 'current' : ''}`}>
            <span className="tier-name">⭐ Pro</span>
            <span className="tier-storage">50 GB</span>
            <span className="tier-upload">2 GB/file</span>
          </div>
          <div className={`tier-card ${storage.tier === 'premium' ? 'current' : ''}`}>
            <span className="tier-name">💎 Premium</span>
            <span className="tier-storage">250 GB</span>
            <span className="tier-upload">5 GB/file</span>
          </div>
          <div className={`tier-card ${storage.tier === 'professional' ? 'current' : ''}`}>
            <span className="tier-name">👑 Professional</span>
            <span className="tier-storage">1 TB</span>
            <span className="tier-upload">20 GB/file</span>
          </div>
        </div>
      </div>

      {/* Refresh button */}
      <button onClick={fetchStorageStatus} className="btn-refresh">
        🔄 Refresh Storage Info
      </button>
    </div>
  );
};

export default StorageStatus;