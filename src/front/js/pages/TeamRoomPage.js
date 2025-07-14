import React, { useEffect, useState, useContext, useRef } from "react";
import { getLiveSquadStreams } from "../utils/gamerAPI";
import { Context } from "../store/appContext";
import MultiStreamSection from "../component/MultiStreamSection";
import WebRTCChat from "../component/WebRTCChat";
import "../../styles/TeamRoom.css";

const TeamRoomPage = () => {
  const { store } = useContext(Context);
  const token = store.token;
  const userId = store.user?.id;
  const userName = store.user?.username || store.user?.display_name;

  const [streams, setStreams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeMode, setActiveMode] = useState("video-chat");
  
  // Video Chat States
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [connectedPeers, setConnectedPeers] = useState([]);
  const [roomId, setRoomId] = useState("");
  const [isInRoom, setIsInRoom] = useState(false);
  
  // 🆕 NEW: Role & Permission States
  const [userRole, setUserRole] = useState("participant"); // "host", "participant", "viewer"
  const [roomSettings, setRoomSettings] = useState({
    allowViewers: true,
    requirePermission: false,
    maxParticipants: 8
  });
  const [isHost, setIsHost] = useState(false);
  
  // Screen sharing
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [screenStream, setScreenStream] = useState(null);
  
  // 🆕 NEW: Connection & User Management
  const [connectionStatus, setConnectionStatus] = useState("disconnected");
  const [roomParticipants, setRoomParticipants] = useState([]);
  const [pendingPermissions, setPendingPermissions] = useState([]);
  
  // Local video ref
  const localVideoRef = useRef(null);
  const localStreamRef = useRef(null);

  useEffect(() => {
    // Load squad streams
    if (token) {
      getLiveSquadStreams(token)
        .then(data => {
          setStreams(data);
          setLoading(false);
        })
        .catch(err => {
          console.error("Error fetching squad streams:", err);
          setLoading(false);
        });
    }

    // Auto-join team room based on user's squad
    if (store.user?.squad_id) {
      setRoomId(`squad-${store.user.squad_id}`);
    } else {
      setRoomId(`user-${userId}-room`);
    }
  }, [token, store.user]);

  // 🆕 NEW: Initialize local media with error handling
  const initializeLocalMedia = async () => {
    try {
      setConnectionStatus("connecting");
      
      const constraints = {
        video: isVideoEnabled ? {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        } : false,
        audio: isAudioEnabled ? {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } : false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      
      localStreamRef.current = stream;
      setConnectionStatus("connected");
      return stream;
      
    } catch (error) {
      console.error("Error accessing media devices:", error);
      setConnectionStatus("error");
      
      // More specific error messages
      if (error.name === 'NotAllowedError') {
        alert("Camera/microphone access denied. Please allow permissions and try again.");
      } else if (error.name === 'NotFoundError') {
        alert("No camera/microphone found. Please connect a device and try again.");
      } else {
        alert("Could not access camera/microphone. Please check your device settings.");
      }
    }
  };

  // 🆕 NEW: Enhanced toggle functions with role checking
  const toggleVideo = () => {
    if (userRole === "viewer") {
      alert("Viewers cannot enable video. Ask the host for participant access.");
      return;
    }
    
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
        
        // Notify other participants
        broadcastStatusUpdate({
          userId,
          userName,
          videoEnabled: videoTrack.enabled,
          audioEnabled: isAudioEnabled
        });
      }
    }
  };

  const toggleAudio = () => {
    if (userRole === "viewer") {
      alert("Viewers cannot enable audio. Ask the host for participant access.");
      return;
    }
    
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
        
        // Notify other participants
        broadcastStatusUpdate({
          userId,
          userName,
          videoEnabled: isVideoEnabled,
          audioEnabled: audioTrack.enabled
        });
      }
    }
  };

  // 🆕 NEW: Screen sharing with role check
  const startScreenShare = async () => {
    if (userRole === "viewer") {
      alert("Viewers cannot share screen. Ask the host for participant access.");
      return;
    }
    
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 15 }
        },
        audio: true
      });
      
      setScreenStream(screenStream);
      setIsScreenSharing(true);
      
      // Notify participants about screen share
      broadcastStatusUpdate({
        userId,
        userName,
        isScreenSharing: true,
        screenShareId: `screen-${userId}`
      });
      
      // Screen share ended event
      screenStream.getVideoTracks()[0].addEventListener('ended', () => {
        stopScreenShare();
      });
      
    } catch (error) {
      console.error("Error starting screen share:", error);
      if (error.name === 'NotAllowedError') {
        alert("Screen sharing permission denied.");
      }
    }
  };

  const stopScreenShare = () => {
    if (screenStream) {
      screenStream.getTracks().forEach(track => track.stop());
      setScreenStream(null);
      setIsScreenSharing(false);
      
      // Notify participants
      broadcastStatusUpdate({
        userId,
        userName,
        isScreenSharing: false
      });
    }
  };

  // 🆕 NEW: Broadcast status updates to other participants
  const broadcastStatusUpdate = (status) => {
    // This would integrate with your WebSocket/signaling server
    console.log("Broadcasting status update:", status);
    // Example: socket.emit('user-status-update', status);
  };

  // 🆕 NEW: Role management functions
  const promoteToParticipant = (participantId) => {
    if (!isHost) return;
    
    setRoomParticipants(prev => 
      prev.map(p => 
        p.id === participantId 
          ? { ...p, role: "participant" }
          : p
      )
    );
    
    // Notify the promoted user
    // socket.emit('role-update', { userId: participantId, newRole: 'participant' });
  };

  const demoteToViewer = (participantId) => {
    if (!isHost) return;
    
    setRoomParticipants(prev => 
      prev.map(p => 
        p.id === participantId 
          ? { ...p, role: "viewer" }
          : p
      )
    );
  };

  const kickUser = (participantId) => {
    if (!isHost) return;
    
    if (confirm("Are you sure you want to remove this user from the room?")) {
      setRoomParticipants(prev => prev.filter(p => p.id !== participantId));
      // socket.emit('kick-user', { userId: participantId });
    }
  };

  // 🆕 NEW: Enhanced join room with role detection
  const joinRoom = async () => {
    if (!roomId.trim()) {
      alert("Please enter a room ID");
      return;
    }
    
    // Check if this is a new room (user becomes host)
    const isNewRoom = !roomParticipants.length;
    if (isNewRoom) {
      setUserRole("host");
      setIsHost(true);
    } else if (roomSettings.requirePermission) {
      setUserRole("viewer");
      // Request permission from host
      requestPermissionToJoin();
      return;
    } else {
      setUserRole("participant");
    }
    
    await initializeLocalMedia();
    setIsInRoom(true);
    
    // Add self to participants
    const newParticipant = {
      id: userId,
      name: userName,
      role: userRole,
      videoEnabled: isVideoEnabled,
      audioEnabled: isAudioEnabled,
      joinedAt: new Date().toISOString()
    };
    
    setRoomParticipants(prev => [...prev, newParticipant]);
  };

  // 🆕 NEW: Request permission to join
  const requestPermissionToJoin = () => {
    alert("This room requires permission. Waiting for host approval...");
    // socket.emit('request-permission', { userId, userName, roomId });
  };

  // Leave room with cleanup
  const leaveRoom = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
    
    stopScreenShare();
    setIsInRoom(false);
    setConnectedPeers([]);
    setConnectionStatus("disconnected");
    
    // Remove self from participants
    setRoomParticipants(prev => prev.filter(p => p.id !== userId));
    
    // If host is leaving, transfer host to oldest participant
    if (isHost && roomParticipants.length > 1) {
      const nextHost = roomParticipants.find(p => p.id !== userId);
      if (nextHost) {
        // socket.emit('transfer-host', { newHostId: nextHost.id });
      }
    }
  };

  // Create or join custom room
  const handleCustomRoom = () => {
    const customRoomId = prompt("Enter room ID to join:");
    if (customRoomId) {
      setRoomId(customRoomId);
    }
  };

  // 🆕 NEW: Get user display info with role badge
  const getUserDisplayInfo = (participant) => {
    const isCurrentUser = participant.id === userId;
    const roleEmoji = {
      host: "👑",
      participant: "🎤",
      viewer: "👁️"
    };
    
    return {
      displayName: isCurrentUser ? `You (${participant.name})` : participant.name,
      roleBadge: roleEmoji[participant.role] || "👤",
      statusIndicators: [
        !participant.videoEnabled && "📹❌",
        !participant.audioEnabled && "🎤❌"
      ].filter(Boolean)
    };
  };

  return (
    <div className="team-room-container">
      <div className="team-room-header">
        <h1>🧑‍🤝‍🧑 Team Room</h1>
        
        {/* 🆕 NEW: Connection Status Indicator */}
        <div className={`connection-status ${connectionStatus}`}>
          <span className="status-indicator"></span>
          {connectionStatus === "connected" && "Connected"}
          {connectionStatus === "connecting" && "Connecting..."}
          {connectionStatus === "disconnected" && "Disconnected"}
          {connectionStatus === "error" && "Connection Error"}
        </div>
        
        {/* Mode Toggle */}
        <div className="mode-toggle">
          <button 
            className={`mode-btn ${activeMode === 'video-chat' ? 'active' : ''}`}
            onClick={() => setActiveMode('video-chat')}
          >
            📹 Video Chat
          </button>
          <button 
            className={`mode-btn ${activeMode === 'streams' ? 'active' : ''}`}
            onClick={() => setActiveMode('streams')}
          >
            📺 Squad Streams
          </button>
        </div>
      </div>

      {activeMode === 'video-chat' ? (
        <div className="video-chat-section">
          {/* Room Controls */}
          <div className="room-controls">
            <div className="room-id-section">
              <label>Room ID:</label>
              <input 
                type="text" 
                value={roomId} 
                onChange={(e) => setRoomId(e.target.value)}
                placeholder="Enter room ID"
                disabled={isInRoom}
              />
              <button onClick={handleCustomRoom} disabled={isInRoom}>
                🔗 Custom Room
              </button>
            </div>
            
            {/* 🆕 NEW: Role indicator */}
            {isInRoom && (
              <div className="role-indicator">
                <span className={`role-badge ${userRole}`}>
                  {userRole === "host" && "👑 Host"}
                  {userRole === "participant" && "🎤 Participant"}
                  {userRole === "viewer" && "👁️ Viewer"}
                </span>
              </div>
            )}
            
            {!isInRoom ? (
              <button className="join-btn" onClick={joinRoom}>
                🚪 Join Room
              </button>
            ) : (
              <button className="leave-btn" onClick={leaveRoom}>
                🚪 Leave Room
              </button>
            )}
          </div>

          {isInRoom && (
            <>
              {/* 🆕 NEW: Room Participants Panel */}
              <div className="participants-panel">
                <h3>👥 Participants ({roomParticipants.length})</h3>
                <div className="participants-list">
                  {roomParticipants.map(participant => {
                    const displayInfo = getUserDisplayInfo(participant);
                    return (
                      <div key={participant.id} className="participant-item">
                        <div className="participant-info">
                          <span className="participant-role">{displayInfo.roleBadge}</span>
                          <span className="participant-name">{displayInfo.displayName}</span>
                          <div className="participant-status">
                            {displayInfo.statusIndicators.map((indicator, i) => (
                              <span key={i} className="status-icon">{indicator}</span>
                            ))}
                          </div>
                        </div>
                        
                        {/* 🆕 NEW: Host controls */}
                        {isHost && participant.id !== userId && (
                          <div className="participant-controls">
                            {participant.role === "viewer" && (
                              <button 
                                className="promote-btn"
                                onClick={() => promoteToParticipant(participant.id)}
                                title="Promote to Participant"
                              >
                                ⬆️
                              </button>
                            )}
                            {participant.role === "participant" && (
                              <button 
                                className="demote-btn"
                                onClick={() => demoteToViewer(participant.id)}
                                title="Demote to Viewer"
                              >
                                ⬇️
                              </button>
                            )}
                            <button 
                              className="kick-btn"
                              onClick={() => kickUser(participant.id)}
                              title="Remove from Room"
                            >
                              🚪
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Video Controls */}
              <div className="video-controls">
                <button 
                  className={`control-btn ${isVideoEnabled ? 'enabled' : 'disabled'}`}
                  onClick={toggleVideo}
                  disabled={userRole === "viewer"}
                >
                  {isVideoEnabled ? '📹' : '📹❌'} Video
                  {userRole === "viewer" && <span className="disabled-text">(Viewer)</span>}
                </button>
                
                <button 
                  className={`control-btn ${isAudioEnabled ? 'enabled' : 'disabled'}`}
                  onClick={toggleAudio}
                  disabled={userRole === "viewer"}
                >
                  {isAudioEnabled ? '🎤' : '🎤❌'} Audio
                  {userRole === "viewer" && <span className="disabled-text">(Viewer)</span>}
                </button>
                
                <button 
                  className={`control-btn ${isScreenSharing ? 'enabled' : ''}`}
                  onClick={isScreenSharing ? stopScreenShare : startScreenShare}
                  disabled={userRole === "viewer"}
                >
                  {isScreenSharing ? '🖥️ Stop Share' : '🖥️ Share Screen'}
                  {userRole === "viewer" && <span className="disabled-text">(Viewer)</span>}
                </button>
              </div>

              {/* Video Grid */}
              <div className="video-grid">
                {/* Local Video */}
                <div className="video-container local-video">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    muted
                    playsInline
                    className="video-element"
                  />
                  <div className="video-label">
                    <span className="user-role">{userRole === "host" ? "👑" : userRole === "participant" ? "🎤" : "👁️"}</span>
                    You ({userName})
                    {!isVideoEnabled && <span className="video-disabled">📹❌</span>}
                    {!isAudioEnabled && <span className="audio-disabled">🎤❌</span>}
                  </div>
                </div>

                {/* Screen Share Video */}
                {isScreenSharing && screenStream && (
                  <div className="video-container screen-share">
                    <video
                      autoPlay
                      playsInline
                      className="video-element"
                      ref={(video) => {
                        if (video) video.srcObject = screenStream;
                      }}
                    />
                    <div className="video-label">
                      🖥️ Your Screen Share
                    </div>
                  </div>
                )}

                {/* Remote Videos */}
                {connectedPeers.map((peer, index) => {
                  const peerInfo = roomParticipants.find(p => p.id === peer.id) || {};
                  const displayInfo = getUserDisplayInfo({ ...peer, ...peerInfo });
                  
                  return (
                    <div key={peer.id} className={`video-container remote-video ${peerInfo.role}`}>
                      <video
                        autoPlay
                        playsInline
                        className="video-element"
                        id={`remote-video-${peer.id}`}
                      />
                      <div className="video-label">
                        <span className="user-role">{displayInfo.roleBadge}</span>
                        {displayInfo.displayName}
                        {displayInfo.statusIndicators.map((indicator, i) => (
                          <span key={i} className="status-icon">{indicator}</span>
                        ))}
                      </div>
                    </div>
                  );
                })}

                {/* Placeholder for more users */}
                {connectedPeers.length === 0 && (
                  <div className="video-container placeholder">
                    <div className="placeholder-content">
                      <p>👥</p>
                      <p>Waiting for others to join...</p>
                      <p>Share room ID: <strong>{roomId}</strong></p>
                      {isHost && (
                        <div className="host-tips">
                          <p>💡 <strong>Host Tips:</strong></p>
                          <p>• Manage participants in the panel above</p>
                          <p>• Promote viewers to participants for video/audio</p>
                          <p>• Share your screen to present to the team</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Chat Integration */}
              <div className="team-chat">
                <h3>💬 Team Chat</h3>
                <WebRTCChat
                  roomId={roomId}
                  userId={userId}
                  userName={userName}
                  userRole={userRole}
                  enableVideoCall={false}
                />
              </div>
            </>
          )}
        </div>
      ) : (
        /* Squad Streams Section */
        <div className="streams-section">
          {loading ? (
            <div className="loading">
              <p>Loading squad streams...</p>
            </div>
          ) : streams.length > 0 ? (
            <>
              <h2>📺 Live Squad Streams</h2>
              <MultiStreamSection streams={streams} />
            </>
          ) : (
            <div className="no-streams">
              <p>No live streams from your squad members right now.</p>
              <button onClick={() => setActiveMode('video-chat')}>
                📹 Start a video chat instead
              </button>
            </div>
          )}
        </div>
      )}

      {/* 🆕 NEW: Enhanced Room Info Panel */}
      {isInRoom && (
        <div className="room-info">
          <h3>🏠 Room Info</h3>
          <p><strong>Room ID:</strong> {roomId}</p>
          <p><strong>Connected:</strong> {roomParticipants.length} people</p>
          <p><strong>Your Role:</strong> {userRole}</p>
          <p><strong>Your Status:</strong> 
            {isVideoEnabled ? ' 📹' : ' 📹❌'}
            {isAudioEnabled ? ' 🎤' : ' 🎤❌'}
            {isScreenSharing ? ' 🖥️' : ''}
          </p>
          {isHost && (
            <div className="host-controls">
              <p><strong>Host Controls:</strong></p>
              <label>
                <input 
                  type="checkbox" 
                  checked={roomSettings.allowViewers}
                  onChange={(e) => setRoomSettings(prev => ({
                    ...prev,
                    allowViewers: e.target.checked
                  }))}
                />
                Allow viewers
              </label>
              <label>
                <input 
                  type="checkbox" 
                  checked={roomSettings.requirePermission}
                  onChange={(e) => setRoomSettings(prev => ({
                    ...prev,
                    requirePermission: e.target.checked
                  }))}
                />
                Require permission to join
              </label>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TeamRoomPage;