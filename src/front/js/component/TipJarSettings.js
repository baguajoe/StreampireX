// src/front/js/component/TipJarSettings.js
// =====================================================
// TIP JAR SETTINGS - Creator payment method configuration
// Used in: Creator Dashboard / Settings page
// Backend: GET/PUT /api/creator/payment-settings
// =====================================================

import React, { useState, useEffect } from 'react';
import '../../styles/TipJarSettings.css';

const backendURL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';

const getAuthHeaders = () => {
  const token = localStorage.getItem('jwt-token') || localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
};

const TipJarSettings = () => {
  // Settings state
  const [settings, setSettings] = useState({
    cashapp_username: '',
    cashapp_enabled: false,
    venmo_username: '',
    venmo_enabled: false,
    paypal_username: '',
    paypal_enabled: false,
    zelle_identifier: '',
    zelle_enabled: false,
    accepts_platform_tips: true,
    tip_minimum: 1.00,
    tip_message: ''
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [copied, setCopied] = useState(false);
  const [username, setUsername] = useState('');

  // Fetch settings on mount
  useEffect(() => {
    fetchSettings();
    fetchUsername();
  }, []);

  // Clear messages after 4 seconds
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(''), 4000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const fetchUsername = async () => {
    try {
      const res = await fetch(`${backendURL}/api/user/profile`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setUsername(data.username || '');
      }
    } catch (err) {
      console.error('Error fetching username:', err);
    }
  };

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${backendURL}/api/creator/payment-settings`, {
        headers: getAuthHeaders()
      });

      if (res.ok) {
        const data = await res.json();
        setSettings({
          cashapp_username: data.cashapp_username || '',
          cashapp_enabled: data.cashapp_enabled || false,
          venmo_username: data.venmo_username || '',
          venmo_enabled: data.venmo_enabled || false,
          paypal_username: data.paypal_username || '',
          paypal_enabled: data.paypal_enabled || false,
          zelle_identifier: data.zelle_identifier || '',
          zelle_enabled: data.zelle_enabled || false,
          accepts_platform_tips: data.accepts_platform_tips !== false,
          tip_minimum: data.tip_minimum || 1.00,
          tip_message: data.tip_message || ''
        });
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
      setError('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    // Client-side validation
    if (settings.cashapp_enabled && !settings.cashapp_username.trim()) {
      setError('Please enter your Cash App username or disable Cash App');
      setSaving(false);
      return;
    }
    if (settings.venmo_enabled && !settings.venmo_username.trim()) {
      setError('Please enter your Venmo username or disable Venmo');
      setSaving(false);
      return;
    }
    if (settings.paypal_enabled && !settings.paypal_username.trim()) {
      setError('Please enter your PayPal.me username or disable PayPal');
      setSaving(false);
      return;
    }
    if (settings.zelle_enabled && !settings.zelle_identifier.trim()) {
      setError('Please enter your Zelle email/phone or disable Zelle');
      setSaving(false);
      return;
    }

    try {
      const res = await fetch(`${backendURL}/api/creator/payment-settings`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(settings)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to save settings');
      }

      setSuccess('Payment settings saved successfully!');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = (method) => {
    setSettings(prev => ({
      ...prev,
      [`${method}_enabled`]: !prev[`${method}_enabled`]
    }));
  };

  const handleInputChange = (field, value) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleCopyLink = () => {
    const link = `${window.location.origin}/support/${username}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Count enabled external methods
  const enabledCount = [
    settings.cashapp_enabled,
    settings.venmo_enabled,
    settings.paypal_enabled,
    settings.zelle_enabled
  ].filter(Boolean).length;

  if (loading) {
    return (
      <div className="tipjar-settings">
        <div className="tipjar-settings-loading">
          <div className="tipjar-settings-spinner"></div>
          <p>Loading tip settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="tipjar-settings">
      <div className="tipjar-settings-container">

        {/* Header */}
        <div className="tipjar-settings-header">
          <div className="tipjar-settings-header-left">
            <h2>💰 Tip Jar Settings</h2>
            <p className="tipjar-settings-subtitle">
              Configure how fans can send you tips. External methods have 0% platform fees.
            </p>
          </div>
          <div className="tipjar-settings-header-right">
            <span className="tipjar-settings-methods-count">
              {enabledCount + 1} method{enabledCount + 1 !== 1 ? 's' : ''} active
            </span>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="tipjar-settings-msg error">
            <span>⚠️</span> {error}
            <button onClick={() => setError('')}>✕</button>
          </div>
        )}
        {success && (
          <div className="tipjar-settings-msg success">
            <span>✓</span> {success}
            <button onClick={() => setSuccess('')}>✕</button>
          </div>
        )}

        {/* Share Link */}
        {username && (
          <div className="tipjar-settings-share">
            <div className="tipjar-settings-share-label">Your Tip Page Link</div>
            <div className="tipjar-settings-share-row">
              <code className="tipjar-settings-share-url">
                {window.location.origin}/support/{username}
              </code>
              <button
                className="tipjar-settings-copy-btn"
                onClick={handleCopyLink}
              >
                {copied ? '✓ Copied!' : '📋 Copy'}
              </button>
            </div>
            <p className="tipjar-settings-share-hint">
              Share this link on social media, your bio, YouTube descriptions — anywhere!
            </p>
          </div>
        )}

        {/* ===== STRIPE (ALWAYS ON) ===== */}
        <div className="tipjar-settings-method always-on">
          <div className="tipjar-settings-method-header">
            <div className="tipjar-settings-method-icon">💳</div>
            <div className="tipjar-settings-method-info">
              <h3>Card Payments (Stripe)</h3>
              <p>Always enabled · 10% platform fee</p>
            </div>
            <div className="tipjar-settings-method-badge active">Active</div>
          </div>
        </div>

        {/* ===== CASH APP ===== */}
        <div className={`tipjar-settings-method ${settings.cashapp_enabled ? 'enabled' : ''}`}>
          <div className="tipjar-settings-method-header">
            <div className="tipjar-settings-method-icon">💵</div>
            <div className="tipjar-settings-method-info">
              <h3>Cash App</h3>
              <p>0% platform fee · Fans send directly to your $cashtag</p>
            </div>
            <label className="tipjar-settings-toggle">
              <input
                type="checkbox"
                checked={settings.cashapp_enabled}
                onChange={() => handleToggle('cashapp')}
              />
              <span className="tipjar-settings-toggle-slider"></span>
            </label>
          </div>
          {settings.cashapp_enabled && (
            <div className="tipjar-settings-method-body">
              <label className="tipjar-settings-input-label">Cash App Username</label>
              <div className="tipjar-settings-input-row">
                <span className="tipjar-settings-input-prefix">$</span>
                <input
                  type="text"
                  placeholder="yourcashtag"
                  value={settings.cashapp_username}
                  onChange={(e) => handleInputChange('cashapp_username', e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''))}
                  maxLength={20}
                  className="tipjar-settings-input"
                />
              </div>
            </div>
          )}
        </div>

        {/* ===== VENMO ===== */}
        <div className={`tipjar-settings-method ${settings.venmo_enabled ? 'enabled' : ''}`}>
          <div className="tipjar-settings-method-header">
            <div className="tipjar-settings-method-icon">💸</div>
            <div className="tipjar-settings-method-info">
              <h3>Venmo</h3>
              <p>0% platform fee · Fans send directly to your Venmo</p>
            </div>
            <label className="tipjar-settings-toggle">
              <input
                type="checkbox"
                checked={settings.venmo_enabled}
                onChange={() => handleToggle('venmo')}
              />
              <span className="tipjar-settings-toggle-slider"></span>
            </label>
          </div>
          {settings.venmo_enabled && (
            <div className="tipjar-settings-method-body">
              <label className="tipjar-settings-input-label">Venmo Username</label>
              <div className="tipjar-settings-input-row">
                <span className="tipjar-settings-input-prefix">@</span>
                <input
                  type="text"
                  placeholder="yourvenmo"
                  value={settings.venmo_username}
                  onChange={(e) => handleInputChange('venmo_username', e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''))}
                  maxLength={30}
                  className="tipjar-settings-input"
                />
              </div>
            </div>
          )}
        </div>

        {/* ===== PAYPAL ===== */}
        <div className={`tipjar-settings-method ${settings.paypal_enabled ? 'enabled' : ''}`}>
          <div className="tipjar-settings-method-header">
            <div className="tipjar-settings-method-icon">🅿️</div>
            <div className="tipjar-settings-method-info">
              <h3>PayPal</h3>
              <p>0% platform fee · Fans pay via PayPal.me link</p>
            </div>
            <label className="tipjar-settings-toggle">
              <input
                type="checkbox"
                checked={settings.paypal_enabled}
                onChange={() => handleToggle('paypal')}
              />
              <span className="tipjar-settings-toggle-slider"></span>
            </label>
          </div>
          {settings.paypal_enabled && (
            <div className="tipjar-settings-method-body">
              <label className="tipjar-settings-input-label">PayPal.me Username</label>
              <div className="tipjar-settings-input-row">
                <span className="tipjar-settings-input-prefix">paypal.me/</span>
                <input
                  type="text"
                  placeholder="yourpaypal"
                  value={settings.paypal_username}
                  onChange={(e) => handleInputChange('paypal_username', e.target.value.replace(/[^a-zA-Z0-9]/g, ''))}
                  maxLength={20}
                  className="tipjar-settings-input"
                />
              </div>
            </div>
          )}
        </div>

        {/* ===== ZELLE ===== */}
        <div className={`tipjar-settings-method ${settings.zelle_enabled ? 'enabled' : ''}`}>
          <div className="tipjar-settings-method-header">
            <div className="tipjar-settings-method-icon">🏦</div>
            <div className="tipjar-settings-method-info">
              <h3>Zelle</h3>
              <p>0% platform fee · Fans send via Zelle to your email or phone</p>
            </div>
            <label className="tipjar-settings-toggle">
              <input
                type="checkbox"
                checked={settings.zelle_enabled}
                onChange={() => handleToggle('zelle')}
              />
              <span className="tipjar-settings-toggle-slider"></span>
            </label>
          </div>
          {settings.zelle_enabled && (
            <div className="tipjar-settings-method-body">
              <label className="tipjar-settings-input-label">Zelle Email or Phone</label>
              <input
                type="text"
                placeholder="you@email.com or (555) 123-4567"
                value={settings.zelle_identifier}
                onChange={(e) => handleInputChange('zelle_identifier', e.target.value)}
                maxLength={50}
                className="tipjar-settings-input full"
              />
            </div>
          )}
        </div>

        {/* ===== GENERAL SETTINGS ===== */}
        <div className="tipjar-settings-general">
          <h3>General Settings</h3>

          {/* Minimum Tip */}
          <div className="tipjar-settings-field">
            <label className="tipjar-settings-input-label">Minimum Tip Amount</label>
            <div className="tipjar-settings-input-row">
              <span className="tipjar-settings-input-prefix">$</span>
              <input
                type="number"
                min="1"
                max="100"
                step="0.50"
                value={settings.tip_minimum}
                onChange={(e) => handleInputChange('tip_minimum', parseFloat(e.target.value) || 1)}
                className="tipjar-settings-input short"
              />
            </div>
            <p className="tipjar-settings-field-hint">Between $1.00 and $100.00</p>
          </div>

          {/* Custom Thank You Message */}
          <div className="tipjar-settings-field">
            <label className="tipjar-settings-input-label">
              Custom Thank You Message
              <span className="tipjar-settings-char-count">{(settings.tip_message || '').length}/200</span>
            </label>
            <textarea
              placeholder="Thanks for supporting my content! Your generosity keeps me creating..."
              value={settings.tip_message}
              onChange={(e) => handleInputChange('tip_message', e.target.value.slice(0, 200))}
              maxLength={200}
              rows={3}
              className="tipjar-settings-textarea"
            />
          </div>

          {/* Accept Platform Tips Toggle */}
          <div className="tipjar-settings-platform-toggle">
            <div className="tipjar-settings-platform-info">
              <h4>Accept Tips on Platform</h4>
              <p>Show tip buttons on your content (streams, podcasts, music, videos)</p>
            </div>
            <label className="tipjar-settings-toggle">
              <input
                type="checkbox"
                checked={settings.accepts_platform_tips}
                onChange={() => handleInputChange('accepts_platform_tips', !settings.accepts_platform_tips)}
              />
              <span className="tipjar-settings-toggle-slider"></span>
            </label>
          </div>
        </div>

        {/* Save Button */}
        <div className="tipjar-settings-actions">
          <button
            className="tipjar-settings-save-btn"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? (
              <>
                <span className="tipjar-settings-btn-spinner"></span>
                Saving...
              </>
            ) : (
              '💾 Save Settings'
            )}
          </button>
        </div>

        {/* Info Footer */}
        <div className="tipjar-settings-footer">
          <p>
            💡 <strong>How it works:</strong> Card payments (Stripe) have a 10% platform fee.
            External methods (Cash App, Venmo, PayPal, Zelle) have <strong>0% platform fee</strong> —
            you keep 100% of those tips. We simply display your payment info so fans can send directly.
          </p>
        </div>

      </div>
    </div>
  );
};

export default TipJarSettings;