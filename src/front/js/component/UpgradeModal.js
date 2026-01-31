// =============================================================================
// UpgradeModal.js - Upgrade Prompt Component
// =============================================================================
// Shows when users try to access features above their tier
// Usage: <UpgradeModal feature="streaming" onClose={() => setShowModal(false)} />
// =============================================================================

import React from 'react';
import { useNavigate } from 'react-router-dom';
import useTierAccess from './hooks/useTierAccess';
import '../styles/UpgradeModal.css';

// Feature details for rich upgrade prompts
const FEATURE_DETAILS = {
  // Video Editor
  export_4k: {
    icon: '🎬',
    title: '4K Video Export',
    description: 'Export your videos in stunning 4K quality for maximum impact.',
    benefits: ['Crystal clear 4K resolution', 'No quality loss', 'Professional output'],
  },
  no_watermark: {
    icon: '✨',
    title: 'Remove Watermark',
    description: 'Export clean videos without the StreamPireX watermark.',
    benefits: ['Professional branding', 'Clean exports', 'Your logo only'],
  },
  priority_export: {
    icon: '⚡',
    title: 'Priority Export',
    description: 'Skip the queue and get your exports processed first.',
    benefits: ['Faster processing', 'No waiting', 'Priority queue'],
  },
  collaboration: {
    icon: '👥',
    title: 'Real-time Collaboration',
    description: 'Work on projects together with your team in real-time.',
    benefits: ['Live editing', 'Team comments', 'Shared projects'],
  },
  
  // Streaming
  streaming: {
    icon: '📡',
    title: 'Live Streaming',
    description: 'Go live and connect with your audience in real-time.',
    benefits: ['1080p streaming', 'Up to 4 hours', 'Chat integration'],
  },
  simulcast: {
    icon: '📺',
    title: 'Multi-Platform Streaming',
    description: 'Stream to YouTube, Twitch, and more simultaneously.',
    benefits: ['Stream everywhere', 'One setup', 'Maximum reach'],
  },
  stream_4k: {
    icon: '🎥',
    title: '4K Live Streaming',
    description: 'Stream in ultra HD 4K quality to your audience.',
    benefits: ['4K resolution', 'Pro quality', 'Stand out'],
  },
  
  // Music
  music_distribution: {
    icon: '🎵',
    title: 'Music Distribution',
    description: 'Distribute your music to Spotify, Apple Music, and 150+ platforms.',
    benefits: ['150+ platforms', '90% royalties', 'Keep your rights'],
  },
  premium_music: {
    icon: '🎧',
    title: 'Premium Music Library',
    description: 'Access thousands of royalty-free tracks for your content.',
    benefits: ['10,000+ tracks', 'All genres', 'Commercial use'],
  },
  
  // Clips
  unlimited_clips: {
    icon: '📱',
    title: 'Unlimited Clips',
    description: 'Create as many short clips as you want, no daily limits.',
    benefits: ['No daily cap', 'Longer clips', 'More creativity'],
  },
  schedule_clips: {
    icon: '📅',
    title: 'Scheduled Clips',
    description: 'Schedule your clips to post automatically at the best times.',
    benefits: ['Auto-posting', 'Best times', 'Set and forget'],
  },
  
  // Cross-posting
  cross_posting: {
    icon: '🔗',
    title: 'Cross-Platform Posting',
    description: 'Post to multiple social platforms with one click.',
    benefits: ['Save time', 'More platforms', 'Unified posting'],
  },
  scheduled_posts: {
    icon: '⏰',
    title: 'Scheduled Posts',
    description: 'Schedule your posts to go out when your audience is most active.',
    benefits: ['Auto-schedule', 'Analytics-based', 'Optimal timing'],
  },
  
  // Gaming
  team_rooms: {
    icon: '🎮',
    title: 'Team Rooms',
    description: 'Create private rooms for your gaming squad.',
    benefits: ['Voice chat', 'Screen share', 'Squad coordination'],
  },
  
  // Storage
  more_storage: {
    icon: '💾',
    title: 'More Storage',
    description: 'Get more space to store your videos, music, and content.',
    benefits: ['Up to 250GB', 'All file types', 'Cloud backup'],
  },
  
  // Generic fallback
  default: {
    icon: '🚀',
    title: 'Premium Feature',
    description: 'Unlock this feature to take your content to the next level.',
    benefits: ['More features', 'Better quality', 'Pro tools'],
  },
};

// Tier pricing for display
const TIER_PRICING = {
  basic: { monthly: 12.99, yearly: 129.99 },
  premium: { monthly: 29.99, yearly: 299.99 },
};

const UpgradeModal = ({ 
  feature, 
  onClose, 
  isOpen = true,
  customTitle = null,
  customDescription = null 
}) => {
  const navigate = useNavigate();
  const { userTier, getUpgradeMessage, getRequiredTier } = useTierAccess();
  
  if (!isOpen) return null;
  
  const requiredTier = getRequiredTier(feature);
  const featureDetails = FEATURE_DETAILS[feature] || FEATURE_DETAILS.default;
  const pricing = TIER_PRICING[requiredTier] || TIER_PRICING.basic;
  
  const handleUpgrade = () => {
    onClose();
    navigate('/pricing');
  };
  
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="upgrade-modal-overlay" onClick={handleBackdropClick}>
      <div className="upgrade-modal">
        {/* Close Button */}
        <button className="upgrade-modal-close" onClick={onClose}>
          ✕
        </button>
        
        {/* Icon */}
        <div className="upgrade-modal-icon">
          {featureDetails.icon}
        </div>
        
        {/* Title */}
        <h2 className="upgrade-modal-title">
          {customTitle || featureDetails.title}
        </h2>
        
        {/* Current Tier Badge */}
        <div className="upgrade-modal-current-tier">
          You're on <span className="tier-badge">{userTier}</span>
        </div>
        
        {/* Description */}
        <p className="upgrade-modal-description">
          {customDescription || featureDetails.description}
        </p>
        
        {/* Benefits */}
        <div className="upgrade-modal-benefits">
          {featureDetails.benefits.map((benefit, index) => (
            <div key={index} className="benefit-item">
              <span className="benefit-check">✓</span>
              <span>{benefit}</span>
            </div>
          ))}
        </div>
        
        {/* Upgrade CTA */}
        <div className="upgrade-modal-cta">
          <div className="upgrade-tier-info">
            <span className="upgrade-to">Upgrade to</span>
            <span className={`tier-name ${requiredTier}`}>
              {requiredTier.charAt(0).toUpperCase() + requiredTier.slice(1)}
            </span>
          </div>
          
          <div className="upgrade-pricing">
            <span className="price">${pricing.monthly}</span>
            <span className="period">/month</span>
          </div>
          
          <button className="upgrade-btn" onClick={handleUpgrade}>
            Upgrade Now
          </button>
          
          <p className="upgrade-note">
            Cancel anytime • Billed ${pricing.yearly}/year saves 17%
          </p>
        </div>
        
        {/* Maybe Later */}
        <button className="maybe-later-btn" onClick={onClose}>
          Maybe Later
        </button>
      </div>
    </div>
  );
};

// =============================================================================
// QUICK UPGRADE PROMPT (Inline, non-modal)
// =============================================================================

export const UpgradePrompt = ({ feature, compact = false }) => {
  const navigate = useNavigate();
  const { getUpgradeMessage, getRequiredTier } = useTierAccess();
  
  const requiredTier = getRequiredTier(feature);
  const message = getUpgradeMessage(feature);
  const featureDetails = FEATURE_DETAILS[feature] || FEATURE_DETAILS.default;
  
  if (compact) {
    return (
      <div className="upgrade-prompt-compact">
        <span className="prompt-icon">🔒</span>
        <span className="prompt-text">{message}</span>
        <button 
          className="prompt-btn"
          onClick={() => navigate('/pricing')}
        >
          Upgrade
        </button>
      </div>
    );
  }
  
  return (
    <div className="upgrade-prompt">
      <div className="prompt-icon">{featureDetails.icon}</div>
      <div className="prompt-content">
        <h4>{featureDetails.title}</h4>
        <p>{message}</p>
      </div>
      <button 
        className="prompt-upgrade-btn"
        onClick={() => navigate('/pricing')}
      >
        Upgrade to {requiredTier}
      </button>
    </div>
  );
};

// =============================================================================
// FEATURE GATE WRAPPER
// =============================================================================

export const FeatureGate = ({ 
  feature, 
  children, 
  fallback = null,
  showPrompt = true 
}) => {
  const { checkFeature } = useTierAccess();
  
  const hasAccess = checkFeature(feature);
  
  if (hasAccess) {
    return children;
  }
  
  if (fallback) {
    return fallback;
  }
  
  if (showPrompt) {
    return <UpgradePrompt feature={feature} />;
  }
  
  return null;
};

export default UpgradeModal;