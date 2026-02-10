import React, { useState } from 'react';
import { startVideoCall } from './FloatingVideoCall';
import '../../styles/VideoCallButton.css';

const VideoCallButton = ({ 
  targetUser, 
  variant = 'default', // 'default', 'icon', 'full'
  size = 'medium', // 'small', 'medium', 'large'
  className = ''
}) => {
  const [isRequesting, setIsRequesting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  
  const handleStartCall = async () => {
    if (!targetUser?.id) {
      alert('Unable to start call: User not found');
      return;
    }
    
    setShowConfirm(true);
  };
  
  const confirmCall = async () => {
    setIsRequesting(true);
    setShowConfirm(false);
    
    try {
      // Generate a unique room ID
      const roomId = `call-${targetUser.id}-${Date.now()}`;
      
      // TODO: Send call request to backend via WebSocket/API
      // For now, start the call immediately (in real app, wait for acceptance)
      
      // Simulate brief delay for call setup
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Start the floating video call
      startVideoCall({
        id: targetUser.id,
        username: targetUser.username,
        displayName: targetUser.display_name || targetUser.displayName || targetUser.username,
        avatar: targetUser.profile_picture || targetUser.avatar || '/default-avatar.png',
      }, roomId);
      
    } catch (error) {
      console.error('Error starting call:', error);
      alert('Failed to start video call. Please try again.');
    } finally {
      setIsRequesting(false);
    }
  };
  
  const cancelCall = () => {
    setShowConfirm(false);
  };
  
  // Render based on variant
  const renderButton = () => {
    switch (variant) {
      case 'icon':
        return (
          <button 
            className={`video-call-btn icon-only ${size} ${className}`}
            onClick={handleStartCall}
            disabled={isRequesting}
            title={`Video call ${targetUser?.username || 'user'}`}
          >
            {isRequesting ? (
              <span className="btn-spinner"></span>
            ) : (
              <span className="btn-icon">📹</span>
            )}
          </button>
        );
      
      case 'full':
        return (
          <button 
            className={`video-call-btn full ${size} ${className}`}
            onClick={handleStartCall}
            disabled={isRequesting}
          >
            {isRequesting ? (
              <>
                <span className="btn-spinner"></span>
                <span>Connecting...</span>
              </>
            ) : (
              <>
                <span className="btn-icon">📹</span>
                <span>Start Video Call</span>
              </>
            )}
          </button>
        );
      
      default:
        return (
          <button 
            className={`video-call-btn ${size} ${className}`}
            onClick={handleStartCall}
            disabled={isRequesting}
          >
            {isRequesting ? (
              <>
                <span className="btn-spinner"></span>
                <span>Calling...</span>
              </>
            ) : (
              <>
                <span className="btn-icon">📹</span>
                <span>Video Call</span>
              </>
            )}
          </button>
        );
    }
  };
  
  return (
    <>
      {renderButton()}
      
      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="call-confirm-overlay" onClick={cancelCall}>
          <div className="call-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="call-confirm-header">
              <span className="call-icon">📹</span>
              <h3>Start Video Call</h3>
            </div>
            
            <div className="call-confirm-body">
              <img 
                src={targetUser?.profile_picture || targetUser?.avatar || '/default-avatar.png'} 
                alt={targetUser?.username}
                className="call-user-avatar"
              />
              <p>
                Start a video call with <strong>@{targetUser?.username}</strong>?
              </p>
              <span className="call-note">
                Make sure your camera and microphone are ready
              </span>
            </div>
            
            <div className="call-confirm-actions">
              <button className="call-cancel-btn" onClick={cancelCall}>
                Cancel
              </button>
              <button className="call-start-btn" onClick={confirmCall}>
                <span>📹</span> Start Call
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default VideoCallButton;