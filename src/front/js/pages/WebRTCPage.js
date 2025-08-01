import React, { useState, useRef, useEffect } from "react";
import { io } from "socket.io-client";

// Define BACKEND_URL properly
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || process.env.REACT_APP_SOCKET_URL || "http://localhost:3001";

const WebRTCChat = ({ roomId, userId, userName }) => {
  // State management
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [peerConnection, setPeerConnection] = useState(null);
  const [isVideoStarted, setIsVideoStarted] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState("disconnected");
  const [connectedUsers, setConnectedUsers] = useState([]);

  // Refs for video elements
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const socketRef = useRef(null);

  // WebRTC configuration
  const servers = {
    iceServers: [
      { urls: ["stun:stun1.l.google.com:19302", "stun:stun2.l.google.com:19302"] }
    ]
  };

  // Initialize socket connection
  useEffect(() => {
    if (!socketRef.current) {
      socketRef.current = io(BACKEND_URL, {
        transports: ["websocket"],
        withCredentials: true
      });

      const socket = socketRef.current;

      // Socket event handlers
      socket.emit("join_room", { roomId, userId, userName });

      socket.on("user-joined", ({ userId: joinedUserId, userName: joinedUserName }) => {
        console.log("User joined:", joinedUserName);
        setConnectedUsers(prev => [...prev.filter(u => u.id !== joinedUserId), 
          { id: joinedUserId, name: joinedUserName }]);
      });

      socket.on("user-left", ({ userId: leftUserId }) => {
        console.log("User left:", leftUserId);
        setConnectedUsers(prev => prev.filter(u => u.id !== leftUserId));
      });

      socket.on("offer", async ({ offer, from }) => {
        console.log("Received offer from:", from);
        await handleOffer(offer, from);
      });

      socket.on("answer", async ({ answer }) => {
        console.log("Received answer");
        await handleAnswer(answer);
      });

      socket.on("ice-candidate", async ({ candidate }) => {
        console.log("Received ICE candidate");
        await handleIceCandidate(candidate);
      });

      // Connection established
      socket.on("connect", () => {
        console.log("Socket connected");
        setConnectionStatus("connected");
      });

      // Connection error
      socket.on("connect_error", (error) => {
        console.log("Socket connection error:", error);
        setConnectionStatus("error");
      });

      // Disconnection
      socket.on("disconnect", () => {
        console.log("Socket disconnected");
        setConnectionStatus("disconnected");
      });
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.emit("leave_room", roomId);
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      cleanup();
    };
  }, [roomId, userId, userName]);

  // Create peer connection
  const createPeerConnection = () => {
    const pc = new RTCPeerConnection(servers);

    pc.ontrack = (event) => {
      console.log("Remote track received");
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
        setRemoteStream(event.streams[0]);
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.emit("ice-candidate", { 
          candidate: event.candidate, 
          roomId 
        });
      }
    };

    pc.onconnectionstatechange = () => {
      console.log("Connection state:", pc.connectionState);
      setConnectionStatus(pc.connectionState);
    };

    return pc;
  };

  // Handle WebRTC offers
  const handleOffer = async (offer, from) => {
    try {
      const pc = createPeerConnection();
      setPeerConnection(pc);

      await pc.setRemoteDescription(offer);
      
      if (localStream) {
        localStream.getTracks().forEach(track => {
          pc.addTrack(track, localStream);
        });
      }

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      
      socketRef.current.emit("answer", { answer, roomId, to: from });
    } catch (error) {
      console.error("Error handling offer:", error);
    }
  };

  // Handle WebRTC answers
  const handleAnswer = async (answer) => {
    try {
      if (peerConnection) {
        await peerConnection.setRemoteDescription(answer);
      }
    } catch (error) {
      console.error("Error handling answer:", error);
    }
  };

  // Handle ICE candidates
  const handleIceCandidate = async (candidate) => {
    try {
      if (peerConnection) {
        await peerConnection.addIceCandidate(candidate);
      }
    } catch (error) {
      console.error("Error handling ICE candidate:", error);
    }
  };

  // Start video chat
  const startVideo = async () => {
    try {
      setIsConnecting(true);
      console.log("Starting video chat...");

      const stream = await navigator.mediaDevices.getUserMedia({
        video: isVideoEnabled,
        audio: isAudioEnabled
      });

      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      const pc = createPeerConnection();
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });
      setPeerConnection(pc);

      // Create and send offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      if (socketRef.current) {
        socketRef.current.emit("offer", { offer, roomId, from: userId });
      }

      setIsVideoStarted(true);
      setIsConnecting(false);
      console.log("Video started successfully");
    } catch (error) {
      console.error("Error starting video:", error);
      setIsConnecting(false);
      alert("Could not access camera/microphone: " + error.message);
    }
  };

  // Stop video chat
  const stopVideo = () => {
    console.log("Stopping video...");
    cleanup();
    setIsVideoStarted(false);
  };

  // Toggle audio
  const toggleAudio = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsAudioEnabled(!isAudioEnabled);
    }
  };

  // Toggle video
  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsVideoEnabled(!isVideoEnabled);
    }
  };

  // Cleanup function
  const cleanup = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    
    if (peerConnection) {
      peerConnection.close();
      setPeerConnection(null);
    }
    
    setRemoteStream(null);
  };

  return (
    <div className="webrtc-chat-container">
      {/* Header with user info */}
      <div className="webrtc-header">
        <div className="webrtc-user-info">
          <h3>🎥 Video Chat</h3>
          <span className="webrtc-username">User: {userName || 'Anonymous'}</span>
          <span className="webrtc-room">Room: {roomId}</span>
        </div>
        <div className="webrtc-status">
          <span className={`status-indicator ${connectionStatus}`}>
            {connectionStatus === 'connected' ? '🟢' : '🔴'} {connectionStatus}
          </span>
        </div>
      </div>

      {/* Video Grid */}
      <div className="webrtc-video-grid">
        <div className="webrtc-video-container">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="webrtc-video local"
          />
          <div className="webrtc-video-label">You ({userName})</div>
        </div>

        <div className="webrtc-video-container">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="webrtc-video remote"
          />
          <div className="webrtc-video-label">
            {connectedUsers.length > 0 ? connectedUsers[0].name : 'Waiting for others...'}
          </div>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="webrtc-controls">
        <button
          onClick={startVideo}
          disabled={isVideoStarted || isConnecting}
          className={`webrtc-btn start ${isConnecting ? 'connecting' : ''}`}
        >
          {isConnecting ? '⏳ Connecting...' : '🎥 Start Video'}
        </button>

        <button
          onClick={stopVideo}
          disabled={!isVideoStarted}
          className="webrtc-btn stop"
        >
          ⛔ Stop Video
        </button>

        <button
          onClick={toggleAudio}
          disabled={!isVideoStarted}
          className={`webrtc-btn audio ${isAudioEnabled ? 'enabled' : 'disabled'}`}
        >
          {isAudioEnabled ? '🔊 Mute' : '🔇 Unmute'}
        </button>

        <button
          onClick={toggleVideo}
          disabled={!isVideoStarted}
          className={`webrtc-btn video ${isVideoEnabled ? 'enabled' : 'disabled'}`}
        >
          {isVideoEnabled ? '📹 Hide Video' : '📹 Show Video'}
        </button>
      </div>

      {/* Connection Info */}
      <div className="webrtc-info">
        <div className="webrtc-participants">
          <strong>Connected Users ({connectedUsers.length + 1}):</strong>
          <div className="participants-list">
            <span className="participant you">👑 {userName} (You)</span>
            {connectedUsers.map(user => (
              <span key={user.id} className="participant">
                👤 {user.name}
              </span>
            ))}
          </div>
        </div>
        
        <div className="webrtc-stats">
          <span>Video: {isVideoStarted ? '✅ Active' : '❌ Inactive'}</span>
          <span>Audio: {isAudioEnabled ? '🔊 On' : '🔇 Off'}</span>
          <span>Video: {isVideoEnabled ? '📹 On' : '📹 Off'}</span>
        </div>
      </div>

      {/* Debug Info (collapsible) */}
      <details className="webrtc-debug">
        <summary>🔧 Debug Info</summary>
        <div className="webrtc-debug-content">
          <div>Room ID: {roomId}</div>
          <div>User ID: {userId}</div>
          <div>Username: {userName}</div>
          <div>Backend URL: {BACKEND_URL}</div>
          <div>Local Stream: {localStream ? '✅ Active' : '❌ None'}</div>
          <div>Remote Stream: {remoteStream ? '✅ Active' : '❌ None'}</div>
          <div>Peer Connection: {peerConnection ? '✅ Connected' : '❌ None'}</div>
          <div>Connection State: {connectionStatus}</div>
        </div>
      </details>
    </div>
  );
};

export default WebRTCChat;