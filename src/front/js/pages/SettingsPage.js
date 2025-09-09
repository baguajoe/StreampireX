// src/front/js/pages/SettingsPage.js - Enhanced with comprehensive error handling
import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ErrorHandler, AuthErrorHandler } from "../utils/errorUtils";
import PayoutRequest from "../component/PayoutRequest";
import "../../styles/SettingsPage.css";

const SettingsPage = () => {
  const navigate = useNavigate();
  
  // Settings state
  const [settings, setSettings] = useState({
    enableChat: true,
    useAvatar: false,
    enableNotifications: true,
    emailNotifications: true,
    darkMode: false,
    profileVisibility: "public",
    subscription: "Free Plan",
    twoFactorEnabled: false,
    payoutMethod: "",
    defaultStreamQuality: "high",
    defaultVRRoom: "Main Hall",
  });

  // UI state
  const [availableBalance, setAvailableBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saveStatus, setSaveStatus] = useState(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Environment validation
  const [backendUrl, setBackendUrl] = useState(null);

  useEffect(() => {
    try {
      const config = ErrorHandler.validateEnvironment();
      setBackendUrl(config.backendUrl);
    } catch (error) {
      setError(`Configuration Error: ${error.message}`);
      setLoading(false);
    }
  }, []);

  // Load user settings and earnings
  const loadUserData = useCallback(async () => {
    if (!backendUrl) return;

    try {
      setLoading(true);
      setError(null);

      // Load settings with retry logic
      const settingsData = await ErrorHandler.withRetry(
        async () => {
          return await ErrorHandler.fetchWithErrorHandling(
            `${backendUrl}/api/user/settings`,
            {
              headers: {
                ...AuthErrorHandler.getAuthHeaders()
              }
            }
          );
        },
        3,
        1000
      );

      // Load earnings data
      const earningsData = await ErrorHandler.withRetry(
        async () => {
          return await ErrorHandler.fetchWithErrorHandling(
            `${backendUrl}/api/user/earnings`,
            {
              headers: {
                ...AuthErrorHandler.getAuthHeaders()
              }
            }
          );
        },
        3,
        1000
      );

      // Update state
      setSettings(prev => ({ ...prev, ...settingsData }));
      setAvailableBalance(earningsData.available_balance || 0);

    } catch (error) {
      console.error('❌ Error loading user data:', error);
      
      // Handle auth errors
      if (AuthErrorHandler.handleAuthError(error, navigate)) {
        return;
      }
      
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [backendUrl, navigate]);

  useEffect(() => {
    if (backendUrl) {
      loadUserData();
    }
  }, [backendUrl, loadUserData]);

  // Save settings with error handling
  const saveSettings = useCallback(async (updatedSettings) => {
    if (!backendUrl) return;

    try {
      setSaveStatus('saving');
      
      await ErrorHandler.fetchWithErrorHandling(
        `${backendUrl}/api/user/settings`,
        {
          method: "PUT",
          headers: {
            ...AuthErrorHandler.getAuthHeaders()
          },
          body: JSON.stringify(updatedSettings)
        }
      );

      setSaveStatus('saved');
      setTimeout(() => setSaveStatus(null), 2000);

    } catch (error) {
      console.error('❌ Failed to save settings:', error);
      
      if (AuthErrorHandler.handleAuthError(error, navigate)) {
        return;
      }
      
      setSaveStatus('error');
      setError(`Failed to save settings: ${error.message}`);
      setTimeout(() => setSaveStatus(null), 3000);
    }
  }, [backendUrl, navigate]);

  // Setting change handlers
  const handleToggle = useCallback((key) => {
    const updated = { ...settings, [key]: !settings[key] };
    setSettings(updated);
    saveSettings(updated);
  }, [settings, saveSettings]);

  const handleChange = useCallback((key, value) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    saveSettings(updated);
  }, [settings, saveSettings]);

  // Navigation handlers
  const handleUpgrade = useCallback(() => {
    try {
      navigate("/billing");
    } catch (error) {
      setError("Navigation error: Unable to access billing page");
    }
  }, [navigate]);

  // Account deletion with comprehensive safety checks
  const handleDeleteAccount = useCallback(async () => {
    if (!backendUrl) return;

    if (deleteConfirmation !== 'DELETE') {
      setError('Please type "DELETE" to confirm account deletion');
      return;
    }

    if (!window.confirm("Are you absolutely sure? This action cannot be undone and will permanently delete all your data.")) {
      return;
    }

    try {
      setIsDeleting(true);
      setError(null);

      await ErrorHandler.fetchWithErrorHandling(
        `${backendUrl}/api/user/delete-account`,
        {
          method: "DELETE",
          headers: {
            ...AuthErrorHandler.getAuthHeaders()
          },
          body: JSON.stringify({
            confirmation: deleteConfirmation,
            final_confirmation: true
          })
        }
      );

      // Clear local storage and redirect
      localStorage.clear();
      sessionStorage.clear();
      
      // Show success message before redirect
      alert("Your account has been successfully deleted. You will now be redirected to the home page.");
      
      window.location.href = "/";

    } catch (error) {
      console.error('❌ Account deletion failed:', error);
      setError(`Account deletion failed: ${error.message}`);
      setIsDeleting(false);
    }
  }, [backendUrl, deleteConfirmation]);

  // Export user data
  const handleExportData = useCallback(async () => {
    if (!backendUrl) return;

    try {
      const response = await fetch(`${backendUrl}/api/user/export-data`, {
        headers: {
          ...AuthErrorHandler.getAuthHeaders()
        }
      });

      if (!response.ok) {
        throw new Error(`Export failed: ${response.status} ${response.statusText}`);
      }

      // Download the exported data
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `user-data-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

    } catch (error) {
      console.error('❌ Data export failed:', error);
      
      if (AuthErrorHandler.handleAuthError(error, navigate)) {
        return;
      }
      
      setError(`Data export failed: ${error.message}`);
    }
  }, [backendUrl, navigate]);

  // Test connection
  const testConnection = useCallback(async () => {
    if (!backendUrl) return;

    try {
      setError(null);
      
      const response = await fetch(`${backendUrl}/api/health`);
      const data = await response.json();
      
      if (response.ok) {
        alert(`✅ Connection successful!\nStatus: ${data.status}\nServer time: ${new Date(data.timestamp).toLocaleString()}`);
      } else {
        setError(`Connection test failed: ${data.message || 'Unknown error'}`);
      }
    } catch (error) {
      setError(`Connection test failed: ${error.message}`);
    }
  }, [backendUrl]);

  // Loading state
  if (loading) {
    return (
      <div className="settings-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <h2>Loading Settings...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="settings-container">
      <div className="settings-header">
        <h1>⚙️ Account Settings</h1>
        <p>Manage your account preferences and privacy settings</p>
        
        {/* Save Status Indicator */}
        {saveStatus && (
          <div className={`save-status ${saveStatus}`}>
            {saveStatus === 'saving' && '💾 Saving...'}
            {saveStatus === 'saved' && '✅ Settings saved successfully'}
            {saveStatus === 'error' && '❌ Failed to save settings'}
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="error-banner">
          <span>⚠️ {error}</span>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      <div className="settings-content">
        {/* General Settings */}
        <div className="settings-section">
          <h2>🔧 General Settings</h2>
          
          <div className="setting-item">
            <div className="setting-info">
              <label>Enable Chat</label>
              <span>Allow other users to send you messages</span>
            </div>
            <button
              className={`toggle-btn ${settings.enableChat ? 'active' : ''}`}
              onClick={() => handleToggle('enableChat')}
            >
              {settings.enableChat ? 'ON' : 'OFF'}
            </button>
          </div>

          <div className="setting-item">
            <div className="setting-info">
              <label>Use Avatar</label>
              <span>Display your avatar in VR rooms</span>
            </div>
            <button
              className={`toggle-btn ${settings.useAvatar ? 'active' : ''}`}
              onClick={() => handleToggle('useAvatar')}
            >
              {settings.useAvatar ? 'ON' : 'OFF'}
            </button>
          </div>

          <div className="setting-item">
            <div className="setting-info">
              <label>Default Stream Quality</label>
              <span>Choose your preferred streaming quality</span>
            </div>
            <select
              value={settings.defaultStreamQuality}
              onChange={(e) => handleChange('defaultStreamQuality', e.target.value)}
              className="setting-select"
            >
              <option value="low">Low (480p)</option>
              <option value="medium">Medium (720p)</option>
              <option value="high">High (1080p)</option>
              <option value="ultra">Ultra (4K)</option>
            </select>
          </div>

          <div className="setting-item">
            <div className="setting-info">
              <label>Default VR Room</label>
              <span>Your preferred VR environment</span>
            </div>
            <select
              value={settings.defaultVRRoom}
              onChange={(e) => handleChange('defaultVRRoom', e.target.value)}
              className="setting-select"
            >
              <option value="Main Hall">Main Hall</option>
              <option value="Music Studio">Music Studio</option>
              <option value="Outdoor Stage">Outdoor Stage</option>
              <option value="Intimate Lounge">Intimate Lounge</option>
            </select>
          </div>
        </div>

        {/* Privacy Settings */}
        <div className="settings-section">
          <h2>🔒 Privacy Settings</h2>
          
          <div className="setting-item">
            <div className="setting-info">
              <label>Profile Visibility</label>
              <span>Control who can see your profile</span>
            </div>
            <select
              value={settings.profileVisibility}
              onChange={(e) => handleChange('profileVisibility', e.target.value)}
              className="setting-select"
            >
              <option value="public">Public</option>
              <option value="friends">Friends Only</option>
              <option value="private">Private</option>
            </select>
          </div>

          <div className="setting-item">
            <div className="setting-info">
              <label>Enable Notifications</label>
              <span>Receive in-app notifications</span>
            </div>
            <button
              className={`toggle-btn ${settings.enableNotifications ? 'active' : ''}`}
              onClick={() => handleToggle('enableNotifications')}
            >
              {settings.enableNotifications ? 'ON' : 'OFF'}
            </button>
          </div>

          <div className="setting-item">
            <div className="setting-info">
              <label>Email Notifications</label>
              <span>Receive notifications via email</span>
            </div>
            <button
              className={`toggle-btn ${settings.emailNotifications ? 'active' : ''}`}
              onClick={() => handleToggle('emailNotifications')}
            >
              {settings.emailNotifications ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>

        {/* Security Settings */}
        <div className="settings-section">
          <h2>🛡️ Security Settings</h2>
          
          <div className="setting-item">
            <div className="setting-info">
              <label>Two-Factor Authentication</label>
              <span>Add an extra layer of security to your account</span>
            </div>
            <button
              className={`toggle-btn ${settings.twoFactorEnabled ? 'active' : ''}`}
              onClick={() => handleToggle('twoFactorEnabled')}
            >
              {settings.twoFactorEnabled ? 'ENABLED' : 'DISABLED'}
            </button>
          </div>

          <div className="setting-item">
            <div className="setting-info">
              <label>Dark Mode</label>
              <span>Use dark theme throughout the app</span>
            </div>
            <button
              className={`toggle-btn ${settings.darkMode ? 'active' : ''}`}
              onClick={() => handleToggle('darkMode')}
            >
              {settings.darkMode ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>

        {/* Subscription Settings */}
        <div className="settings-section">
          <h2>💳 Subscription & Billing</h2>
          
          <div className="subscription-info">
            <div className="current-plan">
              <span className="plan-label">Current Plan:</span>
              <span className="plan-name">{settings.subscription}</span>
            </div>
            
            {settings.subscription === "Free Plan" && (
              <button className="upgrade-btn" onClick={handleUpgrade}>
                🚀 Upgrade to Premium
              </button>
            )}
          </div>
        </div>

        {/* Payout Settings */}
        <div className="settings-section">
          <h2>💰 Payout Settings</h2>
          
          <div className="balance-info">
            <span className="balance-label">Available Balance:</span>
            <span className="balance-amount">${availableBalance.toFixed(2)}</span>
          </div>

          <PayoutRequest 
            availableBalance={availableBalance}
            onRequestComplete={() => {
              // Refresh balance after payout request
              loadUserData();
            }}
          />
        </div>

        {/* Data & Privacy */}
        <div className="settings-section">
          <h2>📋 Data & Privacy</h2>
          
          <div className="data-actions">
            <button className="export-btn" onClick={handleExportData}>
              📥 Export My Data
            </button>
            
            <button className="test-btn" onClick={testConnection}>
              🧪 Test Connection
            </button>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="settings-section danger-zone">
          <h2>⚠️ Danger Zone</h2>
          
          <div className="danger-actions">
            <div className="delete-account-section">
              <h3>Delete Account</h3>
              <p>Permanently delete your account and all associated data. This action cannot be undone.</p>
              
              <div className="delete-confirmation">
                <label>Type "DELETE" to confirm:</label>
                <input
                  type="text"
                  value={deleteConfirmation}
                  onChange={(e) => setDeleteConfirmation(e.target.value)}
                  placeholder="DELETE"
                  className="delete-input"
                />
              </div>
              
              <button
                className="delete-btn"
                onClick={handleDeleteAccount}
                disabled={deleteConfirmation !== 'DELETE' || isDeleting}
              >
                {isDeleting ? '🔄 Deleting...' : '🗑️ Delete Account'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;