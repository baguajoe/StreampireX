import React, { useEffect, useState } from "react";
// import "../../styles/SettingsPage.css";

const SettingsPage = () => {
  const [settings, setSettings] = useState({
    enableChat: true,
    useAvatar: false,
    enableNotifications: true,
    emailNotifications: true,
    darkMode: false,
    profileVisibility: "public"
  });

  useEffect(() => {
    fetch(`${process.env.REACT_APP_BACKEND_URL}/api/user/settings`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    })
      .then((res) => res.json())
      .then((data) => setSettings((prev) => ({ ...prev, ...data })))
      .catch((err) => console.error("Error loading settings:", err));
  }, []);

  const handleToggle = (key) => {
    const updated = { ...settings, [key]: !settings[key] };
    setSettings(updated);
    saveSettings(updated);
  };

  const handleVisibilityChange = (e) => {
    const updated = { ...settings, profileVisibility: e.target.value };
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

  return (
    <div className="settings-page">
      <h1>⚙️ Account Settings</h1>

      <div className="setting-item">
        <label>💬 Enable Chat</label>
        <input
          type="checkbox"
          checked={settings.enableChat}
          onChange={() => handleToggle("enableChat")}
        />
      </div>

      <div className="setting-item">
        <label>🔔 Enable Site Notifications</label>
        <input
          type="checkbox"
          checked={settings.enableNotifications}
          onChange={() => handleToggle("enableNotifications")}
        />
      </div>

      <div className="setting-item">
        <label>🔔 Email Notifications</label>
        <input
          type="checkbox"
          checked={settings.emailNotifications}
          onChange={() => handleToggle("emailNotifications")}
        />
      </div>

      <div className="setting-item">
        <label>🧍 Use Avatar</label>
        <input
          type="checkbox"
          checked={settings.useAvatar}
          onChange={() => handleToggle("useAvatar")}
        />
      </div>

      <div className="setting-item">
        <label>🎨 Dark Mode</label>
        <input
          type="checkbox"
          checked={settings.darkMode}
          onChange={() => handleToggle("darkMode")}
        />
      </div>

      <div className="setting-item">
        <label>🔒 Profile Visibility</label>
        <select
          value={settings.profileVisibility}
          onChange={handleVisibilityChange}
        >
          <option value="public">Public</option>
          <option value="followers">Followers Only</option>
          <option value="private">Private</option>
        </select>
      </div>
    </div>
  );
};

export default SettingsPage;
