// src/front/js/pages/SettingsPage.js
// Updated March 2026 — Added Film & Series, Creator Academy, Podcast settings
import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ErrorHandler, AuthErrorHandler } from "../utils/errorUtils";
import PayoutRequest from "../component/PayoutRequest";
import StorageStatus from "../component/StorageStatus";
import BandwidthStatus from "../component/BandwidthStatus";
import TipJarSettings from "../component/TipJarSettings";
import "../../styles/StorageStatus.css";
import "../../styles/BandwidthStatus.css";
import "../../styles/TipJarSettings.css";
import "../../styles/SettingsPage.css";

const SettingsPage = () => {
  const navigate = useNavigate();

  const [settings, setSettings] = useState({
    // General
    enableChat: true,
    useAvatar: false,
    darkMode: false,
    profileVisibility: "public",
    subscription: "Free Plan",
    twoFactorEnabled: false,
    payoutMethod: "",
    defaultStreamQuality: "high",
    defaultVRRoom: "Main Hall",

    // Notifications — General
    enableNotifications: true,
    emailNotifications: true,

    // Notifications — Music
    notifyNewFollower: true,
    notifyBeatSale: true,
    notifyDistributionUpdate: true,
    notifyCollabRequest: true,

    // Notifications — Film & Series
    notifyScreeningReminder: true,
    notifyNewFilmComment: true,
    notifyFilmSale: true,
    notifyFestivalResult: true,
    notifyTheatreFollower: true,

    // Notifications — Podcast
    notifyNewPodcastSubscriber: true,
    notifyPodcastComment: true,
    notifyPodcastDistribution: true,

    // Notifications — Academy
    notifyNewEnrollment: true,
    notifyCourseReview: true,
    notifyCourseSale: true,

    // Notifications — Gaming
    notifySquadRequest: true,
    notifyTeamRoomInvite: true,

    // Film & Series Settings
    filmDefaultVisibility: "public",
    filmAllowComments: true,
    filmAllowRatings: true,
    theatreAutoNotifyFollowers: true,
    screeningDefaultTicketPrice: "0",
    screeningDefaultCapacity: "100",

    // Podcast Settings
    podcastDefaultVisibility: "public",
    podcastAllowComments: true,
    podcastAutoDistribute: true,
    podcastDefaultCategory: "Arts",

    // Creator Academy Settings
    academyDefaultCourseVisibility: "public",
    academyAllowReviews: true,
    academyDefaultPrice: "0",
    academyCertificateEnabled: true,

    // Creator Monetization
    revenueShareAccepted: true,
    autoPayoutThreshold: "50",
    payoutCurrency: "USD",
  });

  const [availableBalance, setAvailableBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saveStatus, setSaveStatus] = useState(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [backendUrl, setBackendUrl] = useState(null);
  const [activeTab, setActiveTab] = useState("general");

  useEffect(() => {
    try {
      const config = ErrorHandler.validateEnvironment();
      setBackendUrl(config.backendUrl);
    } catch (error) {
      setError(`Configuration Error: ${error.message}`);
      setLoading(false);
    }
  }, []);

  const loadUserData = useCallback(async () => {
    if (!backendUrl) return;
    try {
      setLoading(true);
      setError(null);
      const settingsData = await ErrorHandler.withRetry(async () => {
        return await ErrorHandler.fetchWithErrorHandling(`${backendUrl}/api/user/settings`, {
          headers: { ...AuthErrorHandler.getAuthHeaders() }
        });
      }, 3, 1000);
      const earningsData = await ErrorHandler.withRetry(async () => {
        return await ErrorHandler.fetchWithErrorHandling(`${backendUrl}/api/user/earnings`, {
          headers: { ...AuthErrorHandler.getAuthHeaders() }
        });
      }, 3, 1000);
      setSettings(prev => ({ ...prev, ...settingsData }));
      setAvailableBalance(earningsData.available_balance || 0);
    } catch (error) {
      if (AuthErrorHandler.handleAuthError(error, navigate)) return;
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [backendUrl, navigate]);

  useEffect(() => {
    if (backendUrl) loadUserData();
  }, [backendUrl, loadUserData]);

  const saveSettings = useCallback(async (updatedSettings) => {
    if (!backendUrl) return;
    try {
      setSaveStatus('saving');
      await ErrorHandler.fetchWithErrorHandling(`${backendUrl}/api/user/settings`, {
        method: "PUT",
        headers: { ...AuthErrorHandler.getAuthHeaders() },
        body: JSON.stringify(updatedSettings)
      });
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus(null), 2000);
    } catch (error) {
      if (AuthErrorHandler.handleAuthError(error, navigate)) return;
      setSaveStatus('error');
      setError(`Failed to save settings: ${error.message}`);
      setTimeout(() => setSaveStatus(null), 3000);
    }
  }, [backendUrl, navigate]);

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

  const handleUpgrade = useCallback(() => navigate("/pricing"), [navigate]);

  const handleDeleteAccount = useCallback(async () => {
    if (!backendUrl) return;
    if (deleteConfirmation !== 'DELETE') {
      setError('Please type "DELETE" to confirm account deletion');
      return;
    }
    if (!window.confirm("Are you absolutely sure? This action cannot be undone.")) return;
    try {
      setIsDeleting(true);
      setError(null);
      await ErrorHandler.fetchWithErrorHandling(`${backendUrl}/api/user/delete-account`, {
        method: "DELETE",
        headers: { ...AuthErrorHandler.getAuthHeaders() },
        body: JSON.stringify({ confirmation: deleteConfirmation, final_confirmation: true })
      });
      localStorage.clear();
      sessionStorage.clear();
      alert("Your account has been successfully deleted.");
      window.location.href = "/";
    } catch (error) {
      setError(`Account deletion failed: ${error.message}`);
      setIsDeleting(false);
    }
  }, [backendUrl, deleteConfirmation]);

  const handleExportData = useCallback(async () => {
    if (!backendUrl) return;
    try {
      const response = await fetch(`${backendUrl}/api/user/export-data`, {
        headers: { ...AuthErrorHandler.getAuthHeaders() }
      });
      if (!response.ok) throw new Error(`Export failed: ${response.status}`);
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
      if (AuthErrorHandler.handleAuthError(error, navigate)) return;
      setError(`Data export failed: ${error.message}`);
    }
  }, [backendUrl, navigate]);

  const testConnection = useCallback(async () => {
    if (!backendUrl) return;
    try {
      setError(null);
      const response = await fetch(`${backendUrl}/api/health`);
      const data = await response.json();
      if (response.ok) {
        alert(`✅ Connection successful!\nStatus: ${data.status}`);
      } else {
        setError(`Connection test failed: ${data.message || 'Unknown error'}`);
      }
    } catch (error) {
      setError(`Connection test failed: ${error.message}`);
    }
  }, [backendUrl]);

  // ── HELPERS ─────────────────────────────────────────────────────────────────
  const Toggle = ({ settingKey, label, description }) => (
    <div className="setting-item">
      <div className="setting-info">
        <label>{label}</label>
        {description && <span>{description}</span>}
      </div>
      <button
        className={`toggle-btn ${settings[settingKey] ? 'active' : ''}`}
        onClick={() => handleToggle(settingKey)}
      >
        {settings[settingKey] ? 'ON' : 'OFF'}
      </button>
    </div>
  );

  const Select = ({ settingKey, label, description, options }) => (
    <div className="setting-item">
      <div className="setting-info">
        <label>{label}</label>
        {description && <span>{description}</span>}
      </div>
      <select
        value={settings[settingKey]}
        onChange={(e) => handleChange(settingKey, e.target.value)}
        className="setting-select"
      >
        {options.map(({ value, label }) => (
          <option key={value} value={value}>{label}</option>
        ))}
      </select>
    </div>
  );

  const tabs = [
    { id: "general",      label: "⚙️ General" },
    { id: "notifications",label: "🔔 Notifications" },
    { id: "film",         label: "🎬 Film & Series" },
    { id: "podcast",      label: "🎙️ Podcast" },
    { id: "academy",      label: "🎓 Academy" },
    { id: "monetization", label: "💰 Monetization" },
    { id: "security",     label: "🛡️ Security" },
    { id: "data",         label: "📋 Data" },
    { id: "danger",       label: "⚠️ Danger Zone" },
  ];

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
        <p>Manage your account preferences across all creator tools</p>
        {saveStatus && (
          <div className={`save-status ${saveStatus}`}>
            {saveStatus === 'saving' && '💾 Saving...'}
            {saveStatus === 'saved' && '✅ Settings saved successfully'}
            {saveStatus === 'error' && '❌ Failed to save settings'}
          </div>
        )}
      </div>

      {error && (
        <div className="error-banner">
          <span>⚠️ {error}</span>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {/* ── TAB NAV ── */}
      <div className="settings-tabs" style={{
        display: "flex", gap: "8px", flexWrap: "wrap",
        marginBottom: "24px", borderBottom: "1px solid #30363d", paddingBottom: "12px"
      }}>
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            background: activeTab === tab.id ? "rgba(0,255,200,0.15)" : "rgba(255,255,255,0.05)",
            color: activeTab === tab.id ? "#00ffc8" : "#8b949e",
            border: activeTab === tab.id ? "1px solid rgba(0,255,200,0.4)" : "1px solid #30363d",
            borderRadius: "8px", padding: "8px 14px", cursor: "pointer",
            fontSize: "0.82rem", fontWeight: activeTab === tab.id ? 700 : 400,
            transition: "all 0.2s ease"
          }}>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="settings-content">

        {/* ================================================================ */}
        {/* GENERAL TAB                                                       */}
        {/* ================================================================ */}
        {activeTab === "general" && (
          <>
            <div className="settings-section">
              <h2>📊 Usage & Limits</h2>
              <p className="section-description">Monitor your storage and bandwidth usage</p>
              <div className="usage-grid">
                <StorageStatus />
                <BandwidthStatus />
              </div>
            </div>

            <div className="settings-section">
              <h2>🔧 General Settings</h2>
              <Toggle settingKey="enableChat" label="Enable Chat" description="Allow other users to send you messages" />
              <Toggle settingKey="useAvatar" label="Use Avatar" description="Display your avatar in VR rooms" />
              <Toggle settingKey="darkMode" label="Dark Mode" description="Use dark theme throughout the app" />
              <Select settingKey="defaultStreamQuality" label="Default Stream Quality"
                description="Choose your preferred streaming quality"
                options={[
                  { value: "low", label: "Low (480p)" },
                  { value: "medium", label: "Medium (720p)" },
                  { value: "high", label: "High (1080p)" },
                  { value: "ultra", label: "Ultra (4K)" },
                ]}
              />
              <Select settingKey="profileVisibility" label="Profile Visibility"
                description="Control who can see your profile"
                options={[
                  { value: "public", label: "Public" },
                  { value: "friends", label: "Friends Only" },
                  { value: "private", label: "Private" },
                ]}
              />
            </div>

            <div className="settings-section">
              <h2>💳 Subscription & Billing</h2>
              <div className="subscription-info">
                <div className="current-plan">
                  <span className="plan-label">Current Plan:</span>
                  <span className="plan-name">{settings.subscription}</span>
                </div>
                <button className="upgrade-btn" onClick={handleUpgrade}>
                  {settings.subscription === "Free Plan" ? '🚀 Upgrade to Pro' : '⚙️ Manage Subscription'}
                </button>
              </div>
              <div style={{ marginTop: 16, color: "#8b949e", fontSize: "0.82rem" }}>
                <p>✅ Free — Upload films, short films, browse, festival entry, Creator Academy (free courses)</p>
                <p>🚀 Pro ($19.99/mo) — Sell tickets, rent/buy films, sell courses, fan memberships, monetize everything</p>
                <p>🎬 Studio ($49.99/mo) — Unlimited everything, 32-track DAW, AI voice clone, 8K export</p>
              </div>
            </div>
          </>
        )}

        {/* ================================================================ */}
        {/* NOTIFICATIONS TAB                                                 */}
        {/* ================================================================ */}
        {activeTab === "notifications" && (
          <>
            <div className="settings-section">
              <h2>🔔 General Notifications</h2>
              <Toggle settingKey="enableNotifications" label="In-App Notifications" description="Receive notifications inside the app" />
              <Toggle settingKey="emailNotifications" label="Email Notifications" description="Receive notifications via email" />
            </div>

            <div className="settings-section">
              <h2>🎵 Music Notifications</h2>
              <Toggle settingKey="notifyNewFollower" label="New Follower" description="When someone follows your artist profile" />
              <Toggle settingKey="notifyBeatSale" label="Beat Sale" description="When someone purchases one of your beats" />
              <Toggle settingKey="notifyDistributionUpdate" label="Distribution Update" description="Updates on your music distribution status" />
              <Toggle settingKey="notifyCollabRequest" label="Collab Request" description="When someone applies to collaborate with you" />
            </div>

            <div className="settings-section">
              <h2>🎬 Film & Series Notifications</h2>
              <Toggle settingKey="notifyTheatreFollower" label="New Theatre Follower" description="When someone follows your virtual theatre" />
              <Toggle settingKey="notifyScreeningReminder" label="Screening Reminders" description="Reminders before your scheduled screenings" />
              <Toggle settingKey="notifyNewFilmComment" label="Film Comments" description="When someone comments on your film" />
              <Toggle settingKey="notifyFilmSale" label="Film Sale / Ticket" description="When someone rents, buys, or gets a ticket to your film" />
              <Toggle settingKey="notifyFestivalResult" label="Festival Results" description="When monthly film festival winners are announced" />
            </div>

            <div className="settings-section">
              <h2>🎙️ Podcast Notifications</h2>
              <Toggle settingKey="notifyNewPodcastSubscriber" label="New Subscriber" description="When someone subscribes to your podcast" />
              <Toggle settingKey="notifyPodcastComment" label="Episode Comments" description="When someone comments on your episodes" />
              <Toggle settingKey="notifyPodcastDistribution" label="Distribution Updates" description="When your podcast is approved on new directories" />
            </div>

            <div className="settings-section">
              <h2>🎓 Creator Academy Notifications</h2>
              <Toggle settingKey="notifyNewEnrollment" label="New Enrollment" description="When someone enrolls in your course" />
              <Toggle settingKey="notifyCourseReview" label="Course Reviews" description="When someone leaves a review on your course" />
              <Toggle settingKey="notifyCourseSale" label="Course Sale" description="When someone purchases your paid course" />
            </div>

            <div className="settings-section">
              <h2>🎮 Gaming Notifications</h2>
              <Toggle settingKey="notifySquadRequest" label="Squad Request" description="When someone wants to join your squad" />
              <Toggle settingKey="notifyTeamRoomInvite" label="Team Room Invite" description="When you're invited to a team room" />
            </div>
          </>
        )}

        {/* ================================================================ */}
        {/* FILM & SERIES TAB                                                 */}
        {/* ================================================================ */}
        {activeTab === "film" && (
          <>
            <div className="settings-section">
              <h2>🎬 Film & Series Settings</h2>
              <p className="section-description">Manage your virtual theatre and film upload defaults</p>

              <Select settingKey="filmDefaultVisibility" label="Default Film Visibility"
                description="Who can see your films by default when you upload"
                options={[
                  { value: "public", label: "Public — Anyone can watch" },
                  { value: "followers", label: "Followers Only" },
                  { value: "ticket", label: "Ticket / Purchase Required" },
                  { value: "private", label: "Private — Only you" },
                ]}
              />
              <Toggle settingKey="filmAllowComments" label="Allow Comments on Films" description="Let viewers leave comments on your films" />
              <Toggle settingKey="filmAllowRatings" label="Allow Star Ratings" description="Let viewers rate your films 1-5 stars" />
              <Toggle settingKey="theatreAutoNotifyFollowers" label="Auto-Notify Theatre Followers" description="Automatically notify followers when you schedule a new screening" />
            </div>

            <div className="settings-section">
              <h2>🎟️ Screening Defaults</h2>
              <div className="setting-item">
                <div className="setting-info">
                  <label>Default Ticket Price</label>
                  <span>Default price for new screening events (0 = free)</span>
                </div>
                <input
                  type="number" min="0" step="0.99"
                  value={settings.screeningDefaultTicketPrice}
                  onChange={(e) => handleChange('screeningDefaultTicketPrice', e.target.value)}
                  className="setting-input"
                  style={{ width: 100, background: "#21262d", border: "1px solid #30363d", color: "#c9d1d9", borderRadius: 6, padding: "6px 10px" }}
                />
              </div>
              <div className="setting-item">
                <div className="setting-info">
                  <label>Default Screening Capacity</label>
                  <span>Default max viewers for new screenings</span>
                </div>
                <select
                  value={settings.screeningDefaultCapacity}
                  onChange={(e) => handleChange('screeningDefaultCapacity', e.target.value)}
                  className="setting-select"
                >
                  <option value="50">50 viewers</option>
                  <option value="100">100 viewers</option>
                  <option value="250">250 viewers</option>
                  <option value="500">500 viewers</option>
                  <option value="0">Unlimited</option>
                </select>
              </div>
            </div>

            <div className="settings-section">
              <h2>🔗 Quick Links</h2>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                {[
                  { to: "/my-theatre", label: "🎭 My Theatre" },
                  { to: "/film-upload", label: "📽️ Upload Film" },
                  { to: "/screening-scheduler", label: "🎟️ Schedule Screening" },
                  { to: "/film-festival", label: "🏆 Film Festival" },
                  { to: "/browse-films", label: "🎞️ Browse Films" },
                ].map(({ to, label }) => (
                  <button key={to} onClick={() => navigate(to)} style={{
                    background: "rgba(255,107,107,0.1)", color: "#ff6b6b",
                    border: "1px solid rgba(255,107,107,0.3)", borderRadius: 8,
                    padding: "8px 16px", cursor: "pointer", fontSize: "0.82rem"
                  }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ================================================================ */}
        {/* PODCAST TAB                                                        */}
        {/* ================================================================ */}
        {activeTab === "podcast" && (
          <>
            <div className="settings-section">
              <h2>🎙️ Podcast Settings</h2>
              <p className="section-description">Manage your podcast defaults and distribution</p>

              <Select settingKey="podcastDefaultVisibility" label="Default Episode Visibility"
                description="Who can listen to your episodes by default"
                options={[
                  { value: "public", label: "Public — Anyone can listen" },
                  { value: "subscribers", label: "Subscribers Only" },
                  { value: "paid", label: "Paid Subscribers Only" },
                  { value: "private", label: "Private — Only you" },
                ]}
              />
              <Toggle settingKey="podcastAllowComments" label="Allow Episode Comments" description="Let listeners comment on your episodes" />
              <Toggle settingKey="podcastAutoDistribute" label="Auto-Distribute New Episodes" description="Automatically push new episodes to all directories (Spotify, Apple, etc.)" />
              <Select settingKey="podcastDefaultCategory" label="Default Podcast Category"
                description="Your podcast's primary category for directories"
                options={[
                  { value: "Arts", label: "Arts" },
                  { value: "Business", label: "Business" },
                  { value: "Comedy", label: "Comedy" },
                  { value: "Education", label: "Education" },
                  { value: "Fiction", label: "Fiction" },
                  { value: "Music", label: "Music" },
                  { value: "News", label: "News" },
                  { value: "Society & Culture", label: "Society & Culture" },
                  { value: "Sports", label: "Sports" },
                  { value: "Technology", label: "Technology" },
                  { value: "True Crime", label: "True Crime" },
                ]}
              />
            </div>

            <div className="settings-section">
              <h2>🔗 Quick Links</h2>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                {[
                  { to: "/podcast-studio", label: "🎙️ Podcast Studio" },
                  { to: "/browse-podcast-categories", label: "🎧 Browse Podcasts" },
                ].map(({ to, label }) => (
                  <button key={to} onClick={() => navigate(to)} style={{
                    background: "rgba(38,198,218,0.1)", color: "#26c6da",
                    border: "1px solid rgba(38,198,218,0.3)", borderRadius: 8,
                    padding: "8px 16px", cursor: "pointer", fontSize: "0.82rem"
                  }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ================================================================ */}
        {/* CREATOR ACADEMY TAB                                               */}
        {/* ================================================================ */}
        {activeTab === "academy" && (
          <>
            <div className="settings-section">
              <h2>🎓 Creator Academy Settings</h2>
              <p className="section-description">Manage your course defaults and teaching preferences</p>

              <Select settingKey="academyDefaultCourseVisibility" label="Default Course Visibility"
                description="Who can see your courses by default"
                options={[
                  { value: "public", label: "Public — Anyone can enroll" },
                  { value: "unlisted", label: "Unlisted — Only with link" },
                  { value: "private", label: "Private — Only you" },
                ]}
              />
              <Toggle settingKey="academyAllowReviews" label="Allow Student Reviews" description="Let enrolled students leave ratings and reviews on your courses" />
              <Toggle settingKey="academyCertificateEnabled" label="Issue Completion Certificates" description="Automatically issue a certificate when a student completes your course" />
              <div className="setting-item">
                <div className="setting-info">
                  <label>Default Course Price</label>
                  <span>Default price for new courses (0 = free)</span>
                </div>
                <input
                  type="number" min="0" step="1"
                  value={settings.academyDefaultPrice}
                  onChange={(e) => handleChange('academyDefaultPrice', e.target.value)}
                  className="setting-input"
                  style={{ width: 100, background: "#21262d", border: "1px solid #30363d", color: "#c9d1d9", borderRadius: 6, padding: "6px 10px" }}
                />
              </div>
            </div>

            <div className="settings-section">
              <h2>🔗 Quick Links</h2>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                {[
                  { to: "/creator-academy", label: "🎓 Browse Courses" },
                  { to: "/my-learning", label: "📚 My Learning" },
                  { to: "/create-course", label: "➕ Create Course" },
                ].map(({ to, label }) => (
                  <button key={to} onClick={() => navigate(to)} style={{
                    background: "rgba(167,139,250,0.1)", color: "#a78bfa",
                    border: "1px solid rgba(167,139,250,0.3)", borderRadius: 8,
                    padding: "8px 16px", cursor: "pointer", fontSize: "0.82rem"
                  }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ================================================================ */}
        {/* MONETIZATION TAB                                                  */}
        {/* ================================================================ */}
        {activeTab === "monetization" && (
          <>
            <div className="settings-section">
              <h2>💰 Payout Settings</h2>
              <div className="balance-info">
                <span className="balance-label">Available Balance:</span>
                <span className="balance-amount">${availableBalance.toFixed(2)}</span>
              </div>
              <PayoutRequest
                availableBalance={availableBalance}
                onRequestComplete={() => loadUserData()}
              />
            </div>

            <div className="settings-section">
              <h2>💳 Revenue Settings</h2>
              <div className="setting-item">
                <div className="setting-info">
                  <label>Auto-Payout Threshold</label>
                  <span>Automatically request payout when balance reaches this amount</span>
                </div>
                <select
                  value={settings.autoPayoutThreshold}
                  onChange={(e) => handleChange('autoPayoutThreshold', e.target.value)}
                  className="setting-select"
                >
                  <option value="0">Manual only</option>
                  <option value="25">$25</option>
                  <option value="50">$50</option>
                  <option value="100">$100</option>
                  <option value="250">$250</option>
                </select>
              </div>
              <Select settingKey="payoutCurrency" label="Payout Currency"
                options={[
                  { value: "USD", label: "USD — US Dollar" },
                  { value: "EUR", label: "EUR — Euro" },
                  { value: "GBP", label: "GBP — British Pound" },
                  { value: "CAD", label: "CAD — Canadian Dollar" },
                ]}
              />
              <div style={{ marginTop: 16, padding: 14, background: "rgba(0,255,200,0.05)", borderRadius: 8, border: "1px solid rgba(0,255,200,0.15)", fontSize: "0.82rem", color: "#8b949e" }}>
                <strong style={{ color: "#00ffc8" }}>StreamPireX Revenue Share</strong><br />
                You keep <strong style={{ color: "#00ffc8" }}>90%</strong> of all earnings — beat sales, film tickets, course sales, fan memberships, tips, and merch. StreamPireX takes 10%.
              </div>
            </div>

            <div className="settings-section">
              <TipJarSettings />
            </div>
          </>
        )}

        {/* ================================================================ */}
        {/* SECURITY TAB                                                       */}
        {/* ================================================================ */}
        {activeTab === "security" && (
          <div className="settings-section">
            <h2>🛡️ Security Settings</h2>
            <Toggle settingKey="twoFactorEnabled" label="Two-Factor Authentication" description="Add an extra layer of security to your account" />
            <div className="setting-item">
              <div className="setting-info">
                <label>Change Password</label>
                <span>Update your account password</span>
              </div>
              <button className="upgrade-btn" onClick={() => navigate("/change-password")}>
                🔑 Change Password
              </button>
            </div>
            <div className="setting-item">
              <div className="setting-info">
                <label>Active Sessions</label>
                <span>Manage devices logged into your account</span>
              </div>
              <button className="upgrade-btn" onClick={() => navigate("/sessions")}>
                📱 View Sessions
              </button>
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* DATA TAB                                                           */}
        {/* ================================================================ */}
        {activeTab === "data" && (
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
        )}

        {/* ================================================================ */}
        {/* DANGER ZONE TAB                                                    */}
        {/* ================================================================ */}
        {activeTab === "danger" && (
          <div className="settings-section danger-zone">
            <h2>⚠️ Danger Zone</h2>
            <div className="danger-actions">
              <div className="delete-account-section">
                <h3>Delete Account</h3>
                <p>Permanently delete your account and all associated data including films, courses, podcasts, beats, and earnings history. This action cannot be undone.</p>
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
        )}

      </div>
    </div>
  );
};

export default SettingsPage;