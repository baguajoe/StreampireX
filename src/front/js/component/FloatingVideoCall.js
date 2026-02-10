import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../styles/FloatingVideoCall.css';

// Global state for video call (can be moved to Context if needed)
let globalCallState = {
  isActive: false,
  remoteUser: null,
  roomId: null,
};

let globalSetCallState = null;

// Export function to start a call from anywhere
export const startVideoCall = (remoteUser, roomId) => {
  if (globalSetCallState) {
    globalSetCallState({
      isActive: true,
      remoteUser,
      roomId,
    });
  }
};

// Export function to end call from anywhere
export const endVideoCall = () => {
  if (globalSetCallState) {
    globalSetCallState({
      isActive: false,
      remoteUser: null,
      roomId: null,
    });
  }
};

const FloatingVideoCall = ({ currentUser }) => {
  const navigate = useNavigate();
  
  // Call state
  const [callState, setCallState] = useState({
    isActive: false,
    remoteUser: null,
    roomId: null,
  });
  
  // UI state
  const [isMinimized, setIsMinimized] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isPiP, setIsPiP] = useState(false);
  const [position, setPosition] = useState({ x: window.innerWidth - 340, y: window.innerHeight - 280 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  
  // Media state
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [callDuration, setCallDuration] = useState(0);
  
  // Refs
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const floatingRef = useRef(null);
  const callTimerRef = useRef(null);
  
  // Register global setter
  useEffect(() => {
    globalSetCallState = setCallState;
    return () => {
      globalSetCallState = null;
    };
  }, []);
  
  // Initialize WebRTC when call becomes active
  useEffect(() => {
    if (callState.isActive) {
      initializeCall();
      startCallTimer();
    } else {
      cleanupCall();
      stopCallTimer();
    }
    
    return () => {
      cleanupCall();
      stopCallTimer();
    };
  }, [callState.isActive, callState.roomId]);
  
  // Call timer
  const startCallTimer = () => {
    setCallDuration(0);
    callTimerRef.current = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
  };
  
  const stopCallTimer = () => {
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }
    setCallDuration(0);
  };
  
  // Format duration as MM:SS
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Initialize WebRTC call
  const initializeCall = async () => {
    try {
      setConnectionStatus('connecting');
      
      // Get local media stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      
      localStreamRef.current = stream;
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      
      // Create peer connection
      const configuration = {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ],
      };
      
      peerConnectionRef.current = new RTCPeerConnection(configuration);
      
      // Add local tracks to connection
      stream.getTracks().forEach(track => {
        peerConnectionRef.current.addTrack(track, stream);
      });
      
      // Handle incoming tracks
      peerConnectionRef.current.ontrack = (event) => {
        if (remoteVideoRef.current && event.streams[0]) {
          remoteVideoRef.current.srcObject = event.streams[0];
          setConnectionStatus('connected');
        }
      };
      
      // Handle connection state changes
      peerConnectionRef.current.onconnectionstatechange = () => {
        const state = peerConnectionRef.current?.connectionState;
        if (state === 'connected') {
          setConnectionStatus('connected');
        } else if (state === 'disconnected' || state === 'failed') {
          setConnectionStatus('disconnected');
        }
      };
      
      // TODO: Implement signaling with your backend
      // For now, simulate connection
      setTimeout(() => {
        setConnectionStatus('connected');
      }, 2000);
      
    } catch (error) {
      console.error('Error initializing call:', error);
      setConnectionStatus('error');
      
      if (error.name === 'NotAllowedError') {
        alert('Camera/microphone access denied. Please allow access to make video calls.');
      }
    }
  };
  
  // Cleanup call resources
  const cleanupCall = () => {
    // Stop local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    
    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    
    // Exit PiP if active
    if (document.pictureInPictureElement) {
      document.exitPictureInPicture().catch(() => {});
    }
    
    setConnectionStatus('connecting');
    setIsMuted(false);
    setIsVideoOff(false);
    setIsScreenSharing(false);
    setIsExpanded(false);
    setIsPiP(false);
  };
  
  // Toggle mute
  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };
  
  // Toggle video
  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };
  
  // Toggle screen share
  const toggleScreenShare = async () => {
    try {
      if (isScreenSharing) {
        // Stop screen share, revert to camera
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        const videoTrack = stream.getVideoTracks()[0];
        
        const sender = peerConnectionRef.current?.getSenders().find(s => s.track?.kind === 'video');
        if (sender) {
          sender.replaceTrack(videoTrack);
        }
        
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = new MediaStream([
            videoTrack,
            ...localStreamRef.current.getAudioTracks()
          ]);
        }
        
        setIsScreenSharing(false);
      } else {
        // Start screen share
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenTrack = screenStream.getVideoTracks()[0];
        
        const sender = peerConnectionRef.current?.getSenders().find(s => s.track?.kind === 'video');
        if (sender) {
          sender.replaceTrack(screenTrack);
        }
        
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = new MediaStream([
            screenTrack,
            ...localStreamRef.current.getAudioTracks()
          ]);
        }
        
        // Handle screen share stop
        screenTrack.onended = () => {
          toggleScreenShare();
        };
        
        setIsScreenSharing(true);
      }
    } catch (error) {
      console.error('Screen share error:', error);
    }
  };
  
  // Toggle Picture-in-Picture
  const togglePiP = async () => {
    try {
      if (isPiP) {
        await document.exitPictureInPicture();
        setIsPiP(false);
      } else {
        const videoElement = remoteVideoRef.current || localVideoRef.current;
        if (videoElement && document.pictureInPictureEnabled) {
          await videoElement.requestPictureInPicture();
          setIsPiP(true);
          
          videoElement.addEventListener('leavepictureinpicture', () => {
            setIsPiP(false);
          }, { once: true });
        }
      }
    } catch (error) {
      console.error('PiP error:', error);
    }
  };
  
  // Toggle expanded view
  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
    setIsMinimized(false);
  };
  
  // End call
  const handleEndCall = () => {
    endVideoCall();
  };
  
  // Dragging handlers
  const handleMouseDown = (e) => {
    if (isExpanded) return;
    if (e.target.closest('.floating-call-controls') || e.target.closest('button')) return;
    
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };
  
  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return;
    
    const newX = Math.max(0, Math.min(window.innerWidth - 320, e.clientX - dragOffset.x));
    const newY = Math.max(0, Math.min(window.innerHeight - 240, e.clientY - dragOffset.y));
    
    setPosition({ x: newX, y: newY });
  }, [isDragging, dragOffset]);
  
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);
  
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);
  
  // Don't render if no active call
  if (!callState.isActive) {
    return null;
  }
  
  const { remoteUser } = callState;
  
  return (
    <>
      {/* Expanded Overlay */}
      {isExpanded && (
        <div className="video-call-overlay" onClick={toggleExpanded}>
          <div className="video-call-expanded" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="expanded-header">
              <div className="expanded-user-info">
                <img 
                  src={remoteUser?.avatar || '/default-avatar.png'} 
                  alt={remoteUser?.username}
                  className="expanded-avatar"
                />
                <div>
                  <h3>{remoteUser?.displayName || remoteUser?.username || 'User'}</h3>
                  <span className={`connection-status ${connectionStatus}`}>
                    {connectionStatus === 'connected' ? '● Connected' : 
                     connectionStatus === 'connecting' ? '○ Connecting...' : '● Disconnected'}
                  </span>
                </div>
              </div>
              <div className="expanded-duration">{formatDuration(callDuration)}</div>
              <button className="minimize-btn" onClick={toggleExpanded} title="Minimize">
                ⬇️
              </button>
            </div>
            
            {/* Video Grid */}
            <div className="expanded-videos">
              <div className="remote-video-container">
                <video 
                  ref={remoteVideoRef} 
                  autoPlay 
                  playsInline
                  className="remote-video"
                />
                {connectionStatus !== 'connected' && (
                  <div className="video-placeholder">
                    <img 
                      src={remoteUser?.avatar || '/default-avatar.png'} 
                      alt={remoteUser?.username}
                    />
                    <p>{connectionStatus === 'connecting' ? 'Connecting...' : 'Waiting for connection...'}</p>
                  </div>
                )}
              </div>
              
              <div className="local-video-pip">
                <video 
                  ref={localVideoRef} 
                  autoPlay 
                  playsInline 
                  muted
                  className={isVideoOff ? 'video-off' : ''}
                />
                {isVideoOff && (
                  <div className="video-off-indicator">
                    <span>📷</span>
                    <p>Camera Off</p>
                  </div>
                )}
                <span className="local-label">You</span>
              </div>
            </div>
            
            {/* Controls */}
            <div className="expanded-controls">
              <button 
                className={`control-btn ${isMuted ? 'active' : ''}`}
                onClick={toggleMute}
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? '🔇' : '🎤'}
                <span>{isMuted ? 'Unmute' : 'Mute'}</span>
              </button>
              
              <button 
                className={`control-btn ${isVideoOff ? 'active' : ''}`}
                onClick={toggleVideo}
                title={isVideoOff ? 'Turn on camera' : 'Turn off camera'}
              >
                {isVideoOff ? '📷' : '🎥'}
                <span>{isVideoOff ? 'Start Video' : 'Stop Video'}</span>
              </button>
              
              <button 
                className={`control-btn ${isScreenSharing ? 'active' : ''}`}
                onClick={toggleScreenShare}
                title={isScreenSharing ? 'Stop sharing' : 'Share screen'}
              >
                {isScreenSharing ? '🖥️' : '💻'}
                <span>{isScreenSharing ? 'Stop Share' : 'Share Screen'}</span>
              </button>
              
              <button 
                className="control-btn"
                onClick={togglePiP}
                title="Picture-in-Picture"
              >
                🎬
                <span>PiP</span>
              </button>
              
              <button 
                className="control-btn end-call"
                onClick={handleEndCall}
                title="End call"
              >
                📞
                <span>End Call</span>
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Floating Window (when not expanded) */}
      {!isExpanded && (
        <div 
          ref={floatingRef}
          className={`floating-video-call ${isMinimized ? 'minimized' : ''} ${isDragging ? 'dragging' : ''}`}
          style={{ 
            left: position.x, 
            top: position.y,
          }}
          onMouseDown={handleMouseDown}
        >
          {/* Header */}
          <div className="floating-call-header">
            <div className="floating-user-info">
              <img 
                src={remoteUser?.avatar || '/default-avatar.png'} 
                alt={remoteUser?.username}
                className="floating-avatar"
              />
              <div>
                <span className="floating-username">
                  {remoteUser?.displayName || remoteUser?.username || 'Video Call'}
                </span>
                <span className={`floating-status ${connectionStatus}`}>
                  {formatDuration(callDuration)}
                </span>
              </div>
            </div>
            <div className="floating-header-actions">
              <button 
                className="floating-btn minimize"
                onClick={() => setIsMinimized(!isMinimized)}
                title={isMinimized ? 'Expand' : 'Minimize'}
              >
                {isMinimized ? '▲' : '▼'}
              </button>
            </div>
          </div>
          
          {/* Video Area */}
          {!isMinimized && (
            <div className="floating-video-area">
              <video 
                ref={!isExpanded ? remoteVideoRef : null}
                autoPlay 
                playsInline
                className="floating-remote-video"
              />
              
              {connectionStatus !== 'connected' && (
                <div className="floating-placeholder">
                  <div className="connecting-spinner"></div>
                  <p>Connecting...</p>
                </div>
              )}
              
              <video 
                ref={!isExpanded ? localVideoRef : null}
                autoPlay 
                playsInline 
                muted
                className="floating-local-video"
              />
              
              {/* Connection indicator */}
              <div className={`floating-connection-dot ${connectionStatus}`}></div>
            </div>
          )}
          
          {/* Controls */}
          <div className="floating-call-controls">
            <button 
              className={`floating-control-btn ${isMuted ? 'active' : ''}`}
              onClick={toggleMute}
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? '🔇' : '🎤'}
            </button>
            
            <button 
              className={`floating-control-btn ${isVideoOff ? 'active' : ''}`}
              onClick={toggleVideo}
              title={isVideoOff ? 'Camera on' : 'Camera off'}
            >
              {isVideoOff ? '📷' : '🎥'}
            </button>
            
            <button 
              className="floating-control-btn expand"
              onClick={toggleExpanded}
              title="Expand"
            >
              ⛶
            </button>
            
            <button 
              className="floating-control-btn pip"
              onClick={togglePiP}
              title="Picture-in-Picture"
            >
              🎬
            </button>
            
            <button 
              className="floating-control-btn end"
              onClick={handleEndCall}
              title="End call"
            >
              📞
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default FloatingVideoCall;