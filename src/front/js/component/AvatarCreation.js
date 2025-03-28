// src/components/AvatarCreation.js

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const AvatarCreation = () => {
  const navigate = useNavigate();
  const [photo, setPhoto] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Handle photo upload
  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhoto(URL.createObjectURL(file)); // Display the photo preview
    }
  };

  // Handle avatar creation by sending the photo to the backend
  const handleAvatarCreation = async () => {
    if (!photo) return alert("Please upload a photo!");

    setIsLoading(true);

    const formData = new FormData();
    formData.append("image", photo);

    try {
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/create-avatar`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setAvatarUrl(response.data.avatar_url);  // Assuming the backend returns the avatar URL
      navigate("/create-avatar");
    } catch (error) {
      alert("Error creating avatar:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="avatar-creation-container">
      <h2>Create Your Avatar</h2>
      <input type="file" accept="image/*" onChange={handlePhotoUpload} />
      {photo && <img src={photo} alt="Uploaded Preview" />}
      <button onClick={handleAvatarCreation} disabled={isLoading}>
        {isLoading ? "Creating Avatar..." : "Create Avatar"}
      </button>
      {avatarUrl && <img src={avatarUrl} alt="Generated Avatar" />}
    </div>
  );
};

export default AvatarCreation;
