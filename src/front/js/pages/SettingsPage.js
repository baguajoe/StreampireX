import React, { useEffect, useState } from "react";
import "../../styles/SettingsPage.css";
import PayoutRequest from "../component/PayoutRequest"; // ✅ Import payout request

const SettingsPage = () => {
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

  const [availableBalance, setAvailableBalance] = useState(0); // ✅ Balance state

  useEffect(() => {
    // Fetch user settings
    fetch(`${process.env.REACT_APP_BACKEND_URL}/api/user/settings`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    })
      .then((res) => res.json())
      .then((data) => setSettings((prev) => ({ ...prev, ...data })))
      .catch((err) => console.error("Error loading settings:", err));

    // Fetch earnings for payout balance
    fetch(`${process.env.REACT_APP_BACKEND_URL}/api/user/earnings`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    })
      .then((res) => res.json())
      .then((data) => setAvailableBalance(data.available_balance || 0))
      .catch((err) => console.error("Error loading earnings:", err));
  }, []);

  const handleToggle = (key) => {
    const updated = { ...settings, [key]: !settings[key] };
    setSettings(updated);
    saveSettings(updated);
  };

  const handleChange = (key, value) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    saveSettings(updated);
  };

  const saveSettings = (updatedSettings) => {
    fetch(`${process.env.REACT_APP_BACKEND_URL}/api/user/settings`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify(updatedSettings),
    }).catch((err) => console.error("Failed to save settings:", err));
  };

  const handleUpgrade = () => {
    window.location.href = "/billing";
  };

  const handleDeleteAccount = () => {
    if (window.confirm("Are you sure you want to permanently delete your account?")) {
      fetch(`${process.env.REACT_APP_BACKEND_URL}/api/user/delete-account`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })
        .then(() => {
          localStorage.removeItem("token");
          window.location.href = "/";
        })
        .catch((err) => console.error("Account deletion failed:", err));
    }
  };

  return (
    <div className="settings-page">
      <h1>⚙️ Account Settings</h1>

      {/* ACCOUNT SECTION */}
      <h2>👤 Account Info</h2>
      <div className="setting-item">
        <label>Subscription Plan</label>
        <span>{settings.subscription}</span>
        <button onClick={handleUpgrade}>Manage</button>
      </div>

      <div className="setting-item">
        <label>Two-Factor Authentication</label>
        <input
          type="checkbox"
          checked={settings.twoFactorEnabled}
          onChange={() => handleToggle("twoFactorEnabled")}
        />
      </div>

      <div className="setting-item">
        <label>Delete Account</label>
        <button className="delete-button" onClick={handleDeleteAccount}>Delete</button>
      </div>

      {/* PRIVACY SECTION */}
      <h2>🔒 Privacy & Security</h2>
      <div className="setting-item">
        <label>Profile Visibility</label>
        <select
          value={settings.profileVisibility}
          onChange={(e) => handleChange("profileVisibility", e.target.value)}
        >
          <option value="public">Public</option>
          <option value="followers">Followers Only</option>
          <option value="private">Private</option>
        </select>
      </div>

      {/* NOTIFICATIONS */}
      <h2>🔔 Notifications</h2>
      <div className="setting-item">
        <label>Enable Chat</label>
        <input
          type="checkbox"
          checked={settings.enableChat}
          onChange={() => handleToggle("enableChat")}
        />
      </div>

      <div className="setting-item">
        <label>Site Notifications</label>
        <input
          type="checkbox"
          checked={settings.enableNotifications}
          onChange={() => handleToggle("enableNotifications")}
        />
      </div>

      <div className="setting-item">
        <label>Email Notifications</label>
        <input
          type="checkbox"
          checked={settings.emailNotifications}
          onChange={() => handleToggle("emailNotifications")}
        />
      </div>

      {/* STREAMING PREFERENCES */}
      <h2>🎙️ Streaming Preferences</h2>
      <div className="setting-item">
        <label>Default Stream Quality</label>
        <select
          value={settings.defaultStreamQuality}
          onChange={(e) => handleChange("defaultStreamQuality", e.target.value)}
        >
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      <div className="setting-item">
        <label>Default VR Room</label>
        <select
          value={settings.defaultVRRoom}
          onChange={(e) => handleChange("defaultVRRoom", e.target.value)}
        >
          <option value="Main Hall">Main Hall</option>
          <option value="Studio A">Studio A</option>
          <option value="Indie Lounge">Indie Lounge</option>
        </select>
      </div>

      {/* CREATOR SETTINGS */}
      <h2>💰 Creator / Payout Settings</h2>
      <div className="setting-item">
        <label>Payout Method</label>
        <select
          value={settings.payoutMethod}
          onChange={(e) => handleChange("payoutMethod", e.target.value)}
        >
          <option value="">Select</option>
          <option value="stripe">Stripe</option>
          <option value="paypal">PayPal</option>
        </select>
      </div>

      <div className="setting-item">
        <label>Available for Payout</label>
        <span>${availableBalance.toFixed(2)}</span>
      </div>

      <div className="setting-item">
        <PayoutRequest balance={availableBalance} method={settings.payoutMethod} />

      </div>

      {/* APPEARANCE */}
      <h2>🎨 Appearance</h2>
      <div className="setting-item">
        <label>Dark Mode</label>
        <input
          type="checkbox"
          checked={settings.darkMode}
          onChange={() => handleToggle("darkMode")}
        />
      </div>
    </div>
  );
};

export default SettingsPage;
