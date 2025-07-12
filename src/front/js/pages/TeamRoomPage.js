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
  const [activeMode, setActiveMode] = useState("video-chat"); // "video-chat" or "streams"
  
  // Video Chat States
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [connectedPeers, setConnectedPeers] = useState([]);
  const [roomId, setRoomId] = useState("");
  const [isInRoom, setIsInRoom] = useState(false);
  
  // Screen sharing
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [screenStream, setScreenStream] = useState(null);
  
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

  // Initialize local media stream
  const initializeLocalMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: isVideoEnabled,
        audio: isAudioEnabled
      });
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      
      localStreamRef.current = stream;
      return stream;
    } catch (error) {
      console.error("Error accessing media devices:", error);
      alert("Could not access camera/microphone. Please check permissions.");
    }
  };

  // Toggle video
  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  };

  // Toggle audio
  const toggleAudio = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
      }
    }
  };

  // Start screen sharing
  const startScreenShare = async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true
      });
      
      setScreenStream(screenStream);
      setIsScreenSharing(true);
      
      // Screen share ended event
      screenStream.getVideoTracks()[0].addEventListener('ended', () => {
        stopScreenShare();
      });
      
    } catch (error) {
      console.error("Error starting screen share:", error);
    }
  };

  // Stop screen sharing
  const stopScreenShare = () => {
    if (screenStream) {
      screenStream.getTracks().forEach(track => track.stop());
      setScreenStream(null);
      setIsScreenSharing(false);
    }
  };

  // Join room
  const joinRoom = async () => {
    if (!roomId.trim()) {
      alert("Please enter a room ID");
      return;
    }
    
    await initializeLocalMedia();
    setIsInRoom(true);
  };

  // Leave room
  const leaveRoom = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
    
    stopScreenShare();
    setIsInRoom(false);
    setConnectedPeers([]);
  };

  // Create or join custom room
  const handleCustomRoom = () => {
    const customRoomId = prompt("Enter room ID to join:");
    if (customRoomId) {
      setRoomId(customRoomId);
    }
  };

  return (
    <div className="team-room-container">
      <div className="team-room-header">
        <h1>🧑‍🤝‍🧑 Team Room</h1>
        
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
              {/* Video Controls */}
              <div className="video-controls">
                <button 
                  className={`control-btn ${isVideoEnabled ? 'enabled' : 'disabled'}`}
                  onClick={toggleVideo}
                >
                  {isVideoEnabled ? '📹' : '📹❌'} Video
                </button>
                
                <button 
                  className={`control-btn ${isAudioEnabled ? 'enabled' : 'disabled'}`}
                  onClick={toggleAudio}
                >
                  {isAudioEnabled ? '🎤' : '🎤❌'} Audio
                </button>
                
                <button 
                  className={`control-btn ${isScreenSharing ? 'enabled' : ''}`}
                  onClick={isScreenSharing ? stopScreenShare : startScreenShare}
                >
                  {isScreenSharing ? '🖥️ Stop Share' : '🖥️ Share Screen'}
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
                    <div className="video-label">Your Screen Share</div>
                  </div>
                )}

                {/* Remote Videos - Placeholder for WebRTC integration */}
                {connectedPeers.map((peer, index) => (
                  <div key={peer.id} className="video-container remote-video">
                    <video
                      autoPlay
                      playsInline
                      className="video-element"
                      id={`remote-video-${peer.id}`}
                    />
                    <div className="video-label">
                      {peer.name || `User ${index + 1}`}
                    </div>
                  </div>
                ))}

                {/* Placeholder for more users */}
                {connectedPeers.length === 0 && (
                  <div className="video-container placeholder">
                    <div className="placeholder-content">
                      <p>👥</p>
                      <p>Waiting for others to join...</p>
                      <p>Share room ID: <strong>{roomId}</strong></p>
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
                  enableVideoCall={false} // Already handling video above
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

      {/* Room Info Panel */}
      {isInRoom && (
        <div className="room-info">
          <h3>🏠 Room Info</h3>
          <p><strong>Room ID:</strong> {roomId}</p>
          <p><strong>Connected:</strong> {connectedPeers.length + 1} people</p>
          <p><strong>Your Status:</strong> 
            {isVideoEnabled ? ' 📹' : ' 📹❌'}
            {isAudioEnabled ? ' 🎤' : ' 🎤❌'}
            {isScreenSharing ? ' 🖥️' : ''}
          </p>
        </div>
      )}
    </div>
  );
};

export default TeamRoomPage;