// src/components/AvatarCreator.js
import React from 'react';
import { AvatarCreator } from '@readyplayerme/react-avatar-creator';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const AvatarCreation = () => {
  const navigate = useNavigate();

  const handleAvatarExported = async (url) => {
    try {
      const token = localStorage.getItem('access_token');
      await axios.post(
        `${process.env.REACT_APP_API_URL}/save-avatar`,
        { avatar_url: url },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      navigate('/profile');
    } catch (error) {
      console.error('Error saving avatar:', error);
    }
  };

  return (
    <div style={{ width: '100%', height: '80vh' }}>
      <AvatarCreator
        subdomain="your-subdomain" // Replace with your Ready Player Me subdomain
        onAvatarExported={(url) => handleAvatarExported(url)}
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
};

export default AvatarCreation;
