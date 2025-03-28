// src/pages/CreateAvatar.js

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const CreateAvatar = () => {
  const navigate = useNavigate();
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [imageFile, setImageFile] = useState(null);

  // Assuming the image path is saved in localStorage or can be retrieved from the file input
  useEffect(() => {
    const url = localStorage.getItem("avatar_url");
    if (url) {
      setAvatarUrl(url);
    }
  }, []);

  // Handle file change (image file)
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setImageFile(file);
  };

  // Handle saving avatar to the user's profile
  const handleSaveAvatar = async () => {
    if (!avatarUrl) return alert("No avatar to save!");

    setIsSaving(true);
    try {
      const token = localStorage.getItem("access_token");
      await axios.post(
        `${process.env.REACT_APP_API_URL}/save-avatar`, // Your backend API URL
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

  // Handle avatar creation using Deep3D API
  const handleGenerateAvatar = async () => {
    if (!imageFile) {
      return alert("Please upload an image first!");
    }

    const formData = new FormData();
    formData.append("image", imageFile);

    try {
      const response = await axios.post(
        "https://deep3d-api-url/generate-avatar", // Replace with the Deep3D API endpoint
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      // Assuming Deep3D returns the URL of the generated avatar
      setAvatarUrl(response.data.avatar_url);
      localStorage.setItem("avatar_url", response.data.avatar_url);
    } catch (error) {
      alert("Error generating avatar:", error);
    }
  };

  return (
    <div className="create-avatar-container">
      <h2>Your 3D Avatar</h2>
      
      {/* Avatar Image Display */}
      <div className="avatar-display">
        {avatarUrl ? (
          <img src={avatarUrl} alt="3D Avatar" />
        ) : (
          <p>No avatar created yet!</p>
        )}
      </div>

      {/* Avatar Generation */}
      <input type="file" onChange={handleFileChange} />
      <button onClick={handleGenerateAvatar}>Generate Avatar</button>

      {/* Save Avatar */}
      <button onClick={handleSaveAvatar} disabled={isSaving}>
        {isSaving ? "Saving Avatar..." : "Save Avatar"}
      </button>

      {/* Delete Avatar Button */}
      {avatarUrl && (
        <button onClick={handleDeleteAvatar} className="btn-danger">
          Delete Avatar
        </button>
      )}
    </div>
  );
};

export default CreateAvatar;
