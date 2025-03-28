// src/pages/CreateAvatar.js

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const CreateAvatar = () => {
  const navigate = useNavigate();
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Assuming the avatar URL is passed through the state or context
  useEffect(() => {
    const url = localStorage.getItem("avatar_url");
    if (url) {
      setAvatarUrl(url);
    }
  }, []);

  // Handle saving avatar to the user's profile
  const handleSaveAvatar = async () => {
    if (!avatarUrl) return alert("No avatar to save!");

    setIsSaving(true);
    try {
      const token = localStorage.getItem("access_token");
      await axios.post(
        `${process.env.REACT_APP_API_URL}/save-avatar`,
        { avatar_url: avatarUrl },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      navigate("/profile"); // Navigate to profile page after saving avatar
    } catch (error) {
      alert("Error saving avatar:", error);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle deleting the avatar
  const handleDeleteAvatar = async () => {
    try {
      const token = localStorage.getItem("access_token");
      await axios.delete(`${process.env.REACT_APP_API_URL}/delete-avatar`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAvatarUrl(null); // Clear the avatar URL from the state
      alert("Avatar deleted successfully.");
      navigate("/profile"); // Redirect to profile page or another page
    } catch (error) {
      alert("Error deleting avatar:", error);
    }
  };

  return (
    <div className="create-avatar-container">
      <h2>Your 3D Avatar</h2>
      <div className="avatar-display">
        {avatarUrl ? (
          <img src={avatarUrl} alt="3D Avatar" />
        ) : (
          <p>No avatar created yet!</p>
        )}
      </div>
      <button onClick={handleSaveAvatar} disabled={isSaving}>
        {isSaving ? "Saving Avatar..." : "Save Avatar"}
      </button>

      {/* Add the Delete Avatar button */}
      {avatarUrl && (
        <button onClick={handleDeleteAvatar} className="btn-danger">
          Delete Avatar
        </button>
      )}
    </div>
  );
};

export default CreateAvatar;
