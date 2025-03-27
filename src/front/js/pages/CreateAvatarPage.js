import React from 'react';
import { AvatarCreator } from '@readyplayerme/react-avatar-creator';
import { useNavigate } from 'react-router-dom';
import "../../styles/createAvatarPage.css"; // Optional CSS for styling

const CreateAvatarPage = () => {
  const navigate = useNavigate();

  const handleAvatarExported = async (url) => {
    try {
      const token = localStorage.getItem("token");

      const response = await fetch(`${process.env.BACKEND_URL}/api/save-avatar`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ avatar_url: url })
      });

      if (!response.ok) {
        throw new Error("Failed to save avatar");
      }

      navigate("/profile");
    } catch (error) {
      console.error("Error saving avatar:", error);
    }
  };

  return (
    <div className="create-avatar-container">
      <h2>🧍 Customize Your Avatar</h2>
      <p>Create an avatar using your selfie or start from scratch.</p>
      <div className="avatar-creator-wrapper">
        <AvatarCreator
          subdomain="your-subdomain" // Replace with your Ready Player Me subdomain
          onAvatarExported={handleAvatarExported}
          style={{ width: '100%', height: '100%' }}
        />
      </div>
    </div>
  );
};

export default CreateAvatarPage;
